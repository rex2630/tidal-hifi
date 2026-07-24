import { getUniversalLink } from "../features/tidal/url";
import { getEmptyMediaInfo, type MediaInfo } from "../models/mediaInfo";

const defaultInfo: MediaInfo = getEmptyMediaInfo();

export const mediaInfo: MediaInfo = { ...defaultInfo };
export const updateMediaInfo = (arg: MediaInfo) => {
  // Mutate the exported object in place (rather than reassigning) so it can stay
  // a `const` while every importer keeps seeing the latest values. `defaultInfo`
  // is applied first to reset any fields the new payload omits.
  Object.assign(mediaInfo, defaultInfo, arg);
  if (mediaInfo.url) {
    mediaInfo.url = getUniversalLink(mediaInfo.url);
  }
};
