import { createWriteStream } from "node:fs";
import http from "node:http";
import https from "node:https";

import { Logger } from "../features/logger";

/**
 * Download and save a file
 * @param fileUrl url to download
 * @param targetPath path to save it at
 * @returns the targetPath on success
 */
const MAX_REDIRECTS = 5;

export const downloadFile = (fileUrl: string, targetPath: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const doRequest = (url: string, redirectCount: number) => {
      const client = url.startsWith("https") ? https : http;
      client
        .get(url, (response) => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400 && response.headers.location) {
            response.resume();
            if (redirectCount >= MAX_REDIRECTS) {
              reject(new Error(`Too many redirects for ${fileUrl}`));
              return;
            }
            doRequest(response.headers.location, redirectCount + 1);
            return;
          }

          if (response.statusCode !== 200) {
            response.resume();
            reject(new Error(`HTTP ${response.statusCode} for ${fileUrl}`));
            return;
          }

          const out = createWriteStream(targetPath);
          response.pipe(out);
          out.on("finish", () => {
            out.close(() => resolve(targetPath));
          });
          out.on("error", (err) => {
            out.close();
            try {
              require("node:fs").unlinkSync(targetPath);
            } catch (_) {
              Logger.log("Cleaning up partially downloaded file failed.");
            }
            reject(err);
          });
        })
        .on("error", reject);
    };
    doRequest(fileUrl, 0);
  });
