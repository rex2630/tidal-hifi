import { Client, type SetActivity } from "@xhayper/discord-rpc";
import { app, ipcMain } from "electron";

import { globalEvents } from "../constants/globalEvents";
import { settings } from "../constants/settings";
import { Logger } from "../features/logger";
import { MediaStatus } from "../models/mediaStatus";
import { mediaInfo } from "./mediaInfo";
import { settingsStore } from "./settingsStore";

const clientId = "833617820704440341";

export let rpc: Client | null;

const ACTIVITY_LISTENING = 2;
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;

const observer = () => {
  if (rpc) {
    updateActivity();
  }
};

const defaultPresence = {
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
  instance: false,
  type: ACTIVITY_LISTENING,
};

/**
 * Cache of the last payload pushed to Discord. Without this, the observer fires
 * for every IPC event (including the 500 ms `updateInfo` poll) and we'd emit
 * `setActivity` ~7,200 times/hour. Each call allocates a new payload and its
 * unawaited Promise — wasted work and extra GC pressure that also bumps into
 * Discord's rate limit (5 per 20 s). Dedupe by content excluding the jittery
 * `startTimestamp`/`endTimestamp` *values* (derived from `Date.now()`) so identical
 * activity within the same track only sends once — while still keying on whether the
 * timestamps are *present*, so the corrected payload is sent when they go from absent
 * to available at the start of a track (see `includeTimeStamps`).
 *
 * `lastStartTimestamp` is tracked separately so a seek/scrub still updates Discord: during
 * steady playback `startTimestamp` (now − elapsed) stays constant, but a scrub shifts it, so
 * we re-send when it moves beyond a small tolerance without spamming on normal ticks.
 */
let lastActivityKey = "";
let lastStartTimestamp: number | undefined;

// Seconds the derived start timestamp can drift (rounding jitter) before we treat it as a seek.
const SEEK_TOLERANCE_SECONDS = 2;

const updateActivity = () => {
  const showIdle = settingsStore.get<string, boolean>(settings.discord.showIdle) ?? true;
  const isPausedAndHidden = mediaInfo.status === MediaStatus.paused && !showIdle;

  let payloadKey: string;
  let startTimestamp: number | undefined;
  let send: () => Promise<unknown> | undefined;

  if (isPausedAndHidden) {
    payloadKey = "clear";
    send = () => rpc?.user?.clearActivity();
  } else {
    const activity = getActivity();
    // getActivity only ever assigns a numeric epoch; normalize the wider number | Date type.
    startTimestamp =
      typeof activity.startTimestamp === "number" ? activity.startTimestamp : undefined;
    payloadKey = JSON.stringify({
      ...activity,
      // Collapse the timestamps to a presence flag: exclude their shifting values but
      // still re-send when they appear/disappear (e.g. duration becomes known mid-track).
      startTimestamp: activity.startTimestamp !== undefined,
      endTimestamp: activity.endTimestamp !== undefined,
    });
    send = () => rpc?.user?.setActivity(activity);
  }

  // Re-send when the content/presence changes, or when the timeline jumps (a seek/scrub).
  const seeked =
    Math.abs((startTimestamp ?? 0) - (lastStartTimestamp ?? 0)) > SEEK_TOLERANCE_SECONDS;
  if (payloadKey === lastActivityKey && !seeked) return;
  lastActivityKey = payloadKey;
  lastStartTimestamp = startTimestamp;

  send()?.catch(() => {});
};

const getActivity = (): SetActivity => {
  const presence: SetActivity = { ...defaultPresence };

  if (mediaInfo.status === MediaStatus.paused) {
    presence.details =
      settingsStore.get<string, string>(settings.discord.idleText) ?? "Browsing Tidal";
  } else {
    const showSong = settingsStore.get<string, boolean>(settings.discord.showSong) ?? false;
    if (showSong) {
      const { includeTimestamps, detailsPrefix, buttonText } = getFromStore();
      includeTimeStamps(includeTimestamps);
      setPresenceFromMediaInfo(detailsPrefix, buttonText);
    } else {
      presence.details =
        settingsStore.get<string, string>(settings.discord.usingText) ?? "Playing media on TIDAL";
    }
  }

  return presence;

  function getFromStore() {
    const includeTimestamps =
      settingsStore.get<string, boolean>(settings.discord.includeTimestamps) ?? true;
    const detailsPrefix =
      settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
    const buttonText =
      settingsStore.get<string, string>(settings.discord.buttonText) ?? "Play on TIDAL";

    return { includeTimestamps, detailsPrefix, buttonText };
  }

  /**
   * Pad a string using spaces to at least 2 characters
   * @param input string to pad with 2 characters
   * @returns
   */
  function pad(input: string): string {
    return input.padEnd(2, " ");
  }

  function setPresenceFromMediaInfo(detailsPrefix: string, buttonText: string) {
    // discord requires a minimum of 2 characters
    const title = pad(mediaInfo.title);
    const album = pad(mediaInfo.album);
    const artists = pad(mediaInfo.artists);

    if (mediaInfo.url) {
      presence.statusDisplayType = 1;
      presence.details = `${detailsPrefix}${title}`;
      presence.state = artists ? artists : "unknown artist(s)";
      presence.largeImageKey = mediaInfo.image;
      if (album) {
        presence.largeImageText = album;
      }

      presence.buttons = [{ label: buttonText, url: mediaInfo.url }];
    } else {
      presence.details = `Watching ${title}`;
      presence.state = artists;
    }
  }

  function includeTimeStamps(includeTimestamps: boolean) {
    const durationSeconds = mediaInfo.durationInSeconds;
    // Skip timestamps until we have a real duration. During a track change TIDAL's media
    // element briefly reports duration = NaN (normalized to 0 by the controller), which
    // would otherwise emit a bogus 00:00 / 00:00 that then sticks for the whole track.
    if (includeTimestamps && durationSeconds > 0) {
      const currentSeconds = mediaInfo.currentInSeconds;
      const now = Math.trunc((Date.now() + 500) / 1000);
      presence.startTimestamp = now - currentSeconds;
      presence.endTimestamp = presence.startTimestamp + durationSeconds;
    }
  }
};

/**
 * Try to login to RPC and retry if it errors
 * @param retryCount Max retry count
 */
const connectWithRetry = async (retryCount = 0) => {
  if (!rpc) return;
  try {
    await rpc.login();
    Logger.log("Connected to Discord");
    rpc.on("ready", updateActivity);

    Object.values(globalEvents).forEach((event) => {
      ipcMain.removeListener(event, observer);
      ipcMain.on(event, observer);
    });
  } catch (_error) {
    if (retryCount < MAX_RETRIES) {
      Logger.log(
        `Failed to connect to Discord, retrying in ${RETRY_DELAY / 1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
      );
      setTimeout(() => connectWithRetry(retryCount + 1), RETRY_DELAY);
    } else {
      Logger.log("Failed to connect to Discord after maximum retry attempts");
    }
  }
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: { type: "ipc" }, clientId });
  connectWithRetry();
};

/**
 * Remove any RPC connection with discord and remove the event listener on globalEvents.updateInfo
 */
export const unRPC = () => {
  if (rpc) {
    // Remove observer first to prevent events during cleanup from triggering activity updates
    Object.values(globalEvents).forEach((event) => {
      ipcMain.removeListener(event, observer);
    });

    try {
      rpc.user?.clearActivity()?.catch(() => {});
    } catch (_error) {
      // Ignore errors when Discord connection is already closed
    }
    rpc.destroy();
    rpc = null;
    lastActivityKey = "";
  }
};
