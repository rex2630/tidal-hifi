/**
 * Compatibility shim for `util.isError`, removed from Node.js in v23+.
 *
 * The `usocket` native module — an *optional* transitive dependency of
 * `dbus-next`, used by the MPRIS integration on Linux still calls
 * `util.isError()` in its stream write path (`USocket.prototype._write`).
 * On the newer Node runtime bundled with recent Electron this function no
 * longer exists, so the call throws `TypeError: util.isError is not a function`
 * and crashes the app on launch (see issue #977).
 *
 * `usocket@0.3.0` is the latest release and is unmaintained, and `dbus-next`
 * still depends on it, so we cannot fix this by bumping dependencies. Instead we
 * restore the removed function. This must run before dbus-next opens its socket;
 * importing it first from the main process guarantees that. It is a no-op on
 * runtimes that still provide `util.isError`.
 */
import util from "node:util";

type UtilWithIsError = typeof util & { isError?: (value: unknown) => boolean };

const compatUtil = util as UtilWithIsError;

if (typeof compatUtil.isError !== "function") {
  compatUtil.isError = (value: unknown): boolean =>
    util.types.isNativeError(value) || value instanceof Error;
}
