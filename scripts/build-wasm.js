const { spawn } = require('child_process');
const { copyFile } = require('fs/promises');

new Promise((resolve, reject) =>
  spawn('npm run build-wasm', { shell: true, cwd: '3rd/tree-sitter-proto', env: process.env, stdio: 'inherit' }).once(
    'exit',
    (code, signal) => {
      if (code !== 0) {
        reject(`npm run build-wasm has unexpected exit code ${code}`);
      } else {
        resolve();
      }
    }
  )
)
  .then(() => copyFile('3rd/tree-sitter-proto/tree-sitter-proto.wasm', 'assets/tree-sitter-proto.wasm'))
  .catch(console.error);
