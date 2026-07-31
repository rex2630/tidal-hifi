/**
 * Convert seconds to clock format
 * @param seconds number of seconds
 * @returns string in (H)H:MM:SS or (M)M:SS format
 */
export const convertSecondsToClockFormat = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  // Return padded with zeros and only add zeros when necessary
  const hoursPart = hours > 0 ? `${hours}:` : "";
  const minutesPart = hours ? minutes.toString().padStart(2, "0") : minutes;
  const secondsPart = remainingSeconds.toString().padStart(2, "0");
  return `${hoursPart}${minutesPart}:${secondsPart}`;
};

export const convertSecondsToMicroseconds = (seconds: number) => {
  return seconds * 1_000_000;
};

export const convertMicrosecondsToSeconds = (microseconds: number) => {
  return microseconds / 1_000_000;
};
