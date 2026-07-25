const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

exports.default = async function (context) {
  if (context.packager.platform.name !== 'windows') return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const sigPath = path.join(context.appOutDir, 'electron.exe.sig');

  if (context.packager.appInfo.productFilename !== 'electron' && fs.existsSync(sigPath)) {
    fs.unlinkSync(sigPath);
  }

  const result = spawnSync(
    'python',
    [
      'node_modules/electron/vmp-resign.py',
      '-vv',
      '-W',
      exeName,
      '-C',
      process.env.VMP_CERT,
      '-K',
      process.env.VMP_KEY,
      '-P',
      process.env.VMP_KEY_PASSWORD,
      context.appOutDir
    ],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    throw new Error(`VMP resign failed: ${result.status}`);
  }
};
