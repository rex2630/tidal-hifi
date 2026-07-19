import path from "node:path";
import { app, clipboard, dialog, type IpcMainInvokeEvent, ipcMain, Notification } from "electron";

import { bridgeChannels } from "../../constants/bridge";
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
    try {
      currentNotification?.close();
      currentNotification = new Notification({
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
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
