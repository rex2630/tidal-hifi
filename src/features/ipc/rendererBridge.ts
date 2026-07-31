import path from "node:path";
import {
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  Notification,
  type IpcMainInvokeEvent,
} from "electron";

import { bridgeChannels } from "../../constants/bridge";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settingsStore";
import { downloadImage } from "../icon/downloadImage";
import { Logger } from "../logger";

/**
 * The most recently shown desktop notification. Kept in the main process so a
 * new notification can replace (close) the previous one — behaviour that used
 * to live in the renderer when it had direct access to `Notification`.
 */
let currentNotification: Notification | undefined;

interface NotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
}

/**
 * Resolve the icon that gets attached to a desktop notification.
 *
 * When "notification image downscaling" is enabled in the advanced settings the
 * album art is shrunk before it is handed to the notification. Some
 * notification daemons (KDE plasma-workspace, swaync, ...) buffer/duplicate the
 * raw image data they receive over DBus and can eventually overflow it,
 * freezing the app or the whole desktop. Sending a small image instead of the
 * full-resolution album art works around that. See issue #642.
 *
 * The setting defaults to off because plenty of environments handle the
 * full-resolution art just fine.
 */
function resolveNotificationIcon(icon?: string): string | Electron.NativeImage | undefined {
  if (!icon) {
    return undefined;
  }

  if (!settingsStore.get(settings.advanced.notificationImageDownscaling)) {
    return icon;
  }

  try {
    const image = nativeImage.createFromPath(icon);
    if (image.isEmpty()) {
      return icon;
    }
    return image.resize({ width: 128, height: 128, quality: "good" });
  } catch (error) {
    Logger.log("Failed to downscale notification image:", error);
    return icon;
  }
}

/**
 * Register the privileged operations that the sandboxed main-window renderer
 * delegates to the main process: modal dialogs, desktop notifications and
 * album-art downloads. Settings get/set are registered separately by the
 * settings store.
 */
export function registerRendererBridge(): void {
  ipcMain.handle(
    bridgeChannels.dialogShowMessageBox,
    async (_event: IpcMainInvokeEvent, options: Electron.MessageBoxOptions) => {
      // Only forward the fields we actually use rather than an arbitrary object.
      const safeOptions: Electron.MessageBoxOptions = {
        type: options?.type,
        title: options?.title,
        message: options?.message ?? "",
        buttons: options?.buttons,
        defaultId: options?.defaultId,
      };
      const result = await dialog.showMessageBox(safeOptions);
      return result.response;
    },
  );

  ipcMain.on(bridgeChannels.notificationShow, (_event, payload: NotificationPayload) => {
    // Guard against systems without a notification daemon (e.g. no running
    // org.freedesktop.Notifications service). Without this check the app can
    // freeze on startup while the DBus proxy times out. See issue #665.
    if (!Notification.isSupported()) {
      return;
    }
    try {
      currentNotification?.close();
      currentNotification = new Notification({
        title: payload.title,
        body: payload.body,
        icon: resolveNotificationIcon(payload.icon),
      });
      currentNotification.show();
    } catch (error) {
      Logger.log("Failed to send notification:", error);
    }
  });

  ipcMain.on(bridgeChannels.clipboardWriteText, (_event, text: string) => {
    if (typeof text === "string") {
      clipboard.writeText(text);
    }
  });

  ipcMain.handle(
    bridgeChannels.downloadAlbumArt,
    async (_event: IpcMainInvokeEvent, imageUrl: string): Promise<string> => {
      if (!imageUrl || typeof imageUrl !== "string" || imageUrl.length > 2048) {
        return "";
      }
      try {
        const { protocol } = new URL(imageUrl);
        if (protocol !== "https:" && protocol !== "http:") return "";
      } catch {
        return "";
      }
      const destination = path.join(app.getPath("userData"), "current.jpg");
      return downloadImage(imageUrl, destination);
    },
  );
}
