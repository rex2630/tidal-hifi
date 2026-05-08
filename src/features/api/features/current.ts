import fs from "node:fs";
import type { Request, Response, Router } from "express";

import { mediaInfo } from "../../../scripts/mediaInfo";

export const addCurrentInfo = (expressApp: Router) => {
  /**
   * @swagger
   * tags:
   *   name: current
   *   description: The current media info API
   * components:
   *   schemas:
   *     MediaInfo:
   *       type: object
   *       properties:
   *         title:
   *           type: string
   *         artists:
   *           type: string
   *         album:
   *           type: string
   *         icon:
   *           type: string
   *           format: uri
   *         playingFrom:
   *           type: string
   *         status:
   *           type: string
   *         url:
   *           type: string
   *           format: uri
   *         current:
   *           type: string
   *         currentInSeconds:
   *           type: integer
   *         duration:
   *           type: string
   *         durationInSeconds:
   *           type: integer
   *         image:
   *           type: string
   *           format: uri
   *         localAlbumArt:
   *           type: string
   *           description: Local path to downloaded album art file
   *         favorite:
   *           type: boolean
   *         player:
   *           type: object
   *           properties:
   *             status:
   *               type: string
   *             shuffle:
   *               type: boolean
   *             repeat:
   *               type: string
   *         audioQuality:
   *           type: object
   *           description: Audio quality info as exposed by Tidal (whatever the active controller can read)
   *           properties:
   *             quality:
   *               type: string
   *               description: Tidal quality tier (e.g. LOW, HIGH, LOSSLESS, HI_RES_LOSSLESS)
   *             badgeText:
   *               type: string
   *               description: Human-readable badge text from the Tidal UI (DOM controller only, e.g. "16-bit 44.1kHz")
   *             bitDepth:
   *               type: integer
   *               description: Bit depth in bits (Redux controller only, lossless content)
   *             sampleRate:
   *               type: integer
   *               description: Sample rate in Hz (Redux controller only, lossless content)
   *             codec:
   *               type: string
   *               description: Codec name as reported by Tidal (Redux controller only, e.g. FLAC, MP4A)
   *         artist:
   *           type: string
   *       example:
   *         title: "Sample Title"
   *         artists: "Sample Artist"
   *         album: "Sample Album"
   *         icon: "/path/to/sample/icon.jpg"
   *         playingFrom: "Sample Playlist"
   *         status: "playing"
   *         url: "https://tidal.com/browse/track/sample"
   *         current: "1:23"
   *         currentInSeconds: 83
   *         duration: "3:45"
   *         durationInSeconds: 225
   *         image: "https://example.com/sample-image.jpg"
   *         localAlbumArt: "/path/to/downloaded/current.jpg"
   *         favorite: true
   *         player:
   *           status: "playing"
   *           shuffle: true
   *           repeat: "one"
   *         audioQuality:
   *           quality: "HI_RES_LOSSLESS"
   *           badgeText: "24-bit 96kHz"
   *           bitDepth: 24
   *           sampleRate: 96000
   *           codec: "FLAC"
   *         artist: "Sample Artist"
   */

  /**
   * @swagger
   * /current:
   *   get:
   *     summary: Get current media info
   *     tags: [current]
   *     responses:
   *       200:
   *         description: Current media info
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaInfo'
   */
  expressApp.get("/current", (_req, res) => {
    res.json({ ...mediaInfo, artist: mediaInfo.artists });
  });
  /**
   * @swagger
   * /current/image:
   *   get:
   *     summary: Get current media image
   *     tags: [current]
   *     responses:
   *       200:
   *         description: Current media image
   *         content:
   *           image/png:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Not found
   */
  expressApp.get("/current/image", getCurrentImage);

  /**
   * @swagger
   * /current/audio-quality:
   *   get:
   *     summary: Get audio quality info for the current track
   *     description: |
   *       Returns whatever audio quality info the active controller can read from
   *       Tidal: at minimum the quality tier from the on-screen badge; additionally
   *       bit depth, sample rate and codec when the Redux controller is active.
   *       Returns 404 when no quality information is currently available.
   *     tags: [current]
   *     responses:
   *       200:
   *         description: Audio quality info for the current track
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 quality:
   *                   type: string
   *                 badgeText:
   *                   type: string
   *                 bitDepth:
   *                   type: integer
   *                 sampleRate:
   *                   type: integer
   *                 codec:
   *                   type: string
   *       404:
   *         description: No audio quality information available
   */
  expressApp.get("/current/audio-quality", (_req, res) => {
    if (!mediaInfo.audioQuality) {
      res.status(404).json({ error: "No audio quality information available" });
      return;
    }
    res.json(mediaInfo.audioQuality);
  });
};

export const getCurrentImage = (_req: Request, res: Response) => {
  const imagePath = mediaInfo.localAlbumArt;

  if (!imagePath) {
    const remoteUrl = mediaInfo.image || mediaInfo.icon;
    if (remoteUrl) {
      res.redirect(remoteUrl);
      return;
    }
    res.set("Content-Type", "text/plain");
    res.status(404).end("No image available");
    return;
  }
  const stream = fs.createReadStream(imagePath);
  stream.on("open", () => {
    res.set("Content-Type", "image/png");
    stream.pipe(res);
  });
  stream.on("error", () => {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
};
