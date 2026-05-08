/**
 * Audio quality information for the currently playing track.
 *
 * This is whatever the active controller can read from Tidal:
 * - The Redux controller can read the full set (quality tier, bit depth,
 *   sample rate, codec) from the playback context.
 * - The DOM controller (and the MediaSession controller, which falls back
 *   to it) can only read the quality badge (the tier).
 *
 * All fields are optional — only what the source actually exposes is filled in.
 */
export interface AudioQuality {
  /** Tidal quality tier as exposed by Tidal, e.g. "LOW", "HIGH", "LOSSLESS", "HI_RES_LOSSLESS". */
  quality?: string;
  /** Human-readable badge text as shown in the Tidal UI, e.g. "16-bit 44.1kHz". DOM controller only. */
  badgeText?: string;
  /** Bit depth in bits, e.g. 16 or 24. Only available for lossless content via Redux. */
  bitDepth?: number;
  /** Sample rate in Hz, e.g. 44100, 96000, 192000. Only available for lossless content via Redux. */
  sampleRate?: number;
  /** Codec name as reported by Tidal, e.g. "FLAC", "MP4A". Only available via Redux. */
  codec?: string;
}
