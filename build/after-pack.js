const { execFileSync } = require("node:child_process");

exports.default = async function (context) {
  if (context.electronPlatformName !== "darwin") return;

  execFileSync("python3", [
    "-m",
    "castlabs_evs.vmp",
    "sign-pkg",
    "--persistent",
    context.appOutDir,
  ], {
    stdio: "inherit",
    env: {
      ...process.env,
      EVS_NO_ASK: "1",
    },
  });
};
