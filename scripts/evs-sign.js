const { execFileSync } = require("node:child_process");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;

  if (!["darwin", "win32"].includes(electronPlatformName)) {
    console.log(`Skipping EVS signing for ${electronPlatformName}`);
    return;
  }

  const EVS_ACCOUNT_NAME = requireEnv("EVS_ACCOUNT_NAME");
  const EVS_PASSWD = requireEnv("EVS_PASSWD");
  const EVS_NO_ASK = process.env.EVS_NO_ASK ?? "1";

  console.log("EVS signing appOutDir =", appOutDir);

  const python = electronPlatformName === "win32" ? "py" : "python3";
  const args =
    electronPlatformName === "win32"
      ? ["-3", "-m", "castlabs_evs.vmp", "-n", "sign-pkg", appOutDir]
      : ["-m", "castlabs_evs.vmp", "-n", "sign-pkg", appOutDir];

  execFileSync(python, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      EVS_ACCOUNT_NAME,
      EVS_PASSWD,
      EVS_NO_ASK,
    },
  });
};
