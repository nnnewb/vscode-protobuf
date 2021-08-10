const task = require('tasuku');
const sh = require('shelljs');

/**
 *
 * @param {string} command shell command
 * @param {sh.ExecOptions} options execute options
 * @returns final result
 */
function execAsync(command, options) {
  return new Promise((resolve, reject) => {
    sh.exec(
      command,
      {
        ...options,
        async: true,
      },
      function (code, stdout, stderr) {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      }
    );
  });
}

task('build-wasm', async ({ setTitle }) => {
  sh.cd('3rd/tree-sitter-proto');
  setTitle('compiling...');
  await execAsync('npm run build-wasm', { silent: true, async: true });
  sh.cp('tree-sitter-proto.wasm', '../../assets/');
  setTitle('build-wasm complete');
});
