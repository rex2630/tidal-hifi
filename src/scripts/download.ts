import { createWriteStream, unlinkSync } from "node:fs";
import http from "node:http";
import https from "node:https";

import { Logger } from "../features/logger";

const MAX_REDIRECTS = 5;

interface DownloadContext {
  fileUrl: string;
  targetPath: string;
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Download and save a file
 * @param fileUrl url to download
 * @param targetPath path to save it at
 * @returns the targetPath on success
 */
export const downloadFile = (fileUrl: string, targetPath: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    requestFile(fileUrl, 0, { fileUrl, targetPath, resolve, reject });
  });

function requestFile(url: string, redirectCount: number, ctx: DownloadContext): void {
  const client = url.startsWith("https") ? https : http;
  client
    .get(url, (response) => handleResponse(response, url, redirectCount, ctx))
    .on("error", ctx.reject);
}

function handleResponse(
  response: http.IncomingMessage,
  url: string,
  redirectCount: number,
  ctx: DownloadContext,
): void {
  const status = response.statusCode ?? 0;
  if (status >= 300 && status < 400 && response.headers.location) {
    response.resume();
    followRedirect(response.headers.location, url, redirectCount, ctx);
    return;
  }

  if (response.statusCode !== 200) {
    response.resume();
    ctx.reject(new Error(`HTTP ${response.statusCode} for ${ctx.fileUrl}`));
    return;
  }

  saveResponse(response, ctx);
}

function followRedirect(
  location: string,
  currentUrl: string,
  redirectCount: number,
  ctx: DownloadContext,
): void {
  if (redirectCount >= MAX_REDIRECTS) {
    ctx.reject(new Error(`Too many redirects for ${ctx.fileUrl}`));
    return;
  }

  // Resolve (possibly relative) redirects against the current URL and only
  // follow http(s) targets, so a redirect can't downgrade to another scheme.
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(location, currentUrl);
  } catch {
    ctx.reject(new Error(`Invalid redirect location for ${ctx.fileUrl}`));
    return;
  }

  if (redirectUrl.protocol !== "http:" && redirectUrl.protocol !== "https:") {
    ctx.reject(new Error(`Blocked redirect to unsupported protocol for ${ctx.fileUrl}`));
    return;
  }

  requestFile(redirectUrl.toString(), redirectCount + 1, ctx);
}

function saveResponse(response: http.IncomingMessage, ctx: DownloadContext): void {
  const out = createWriteStream(ctx.targetPath);
  response.pipe(out);
  out.on("finish", () => {
    out.close(() => ctx.resolve(ctx.targetPath));
  });
  out.on("error", (err) => {
    out.close();
    try {
      unlinkSync(ctx.targetPath);
    } catch (_) {
      Logger.log("Cleaning up partially downloaded file failed.");
    }
    ctx.reject(err);
  });
}
