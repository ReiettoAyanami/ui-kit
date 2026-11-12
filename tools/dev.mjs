// `npm start`: the catalog in development, with its server. Two processes, stopped together:
// - server/server.mjs on 127.0.0.1:4301, saving allowed (the Variables page writes tokens.json);
// - `ng serve catalog` on 4300, which sends /api to it (projects/catalog/proxy.conf.json).
// Arguments go to ng serve: `npm start -- --host 0.0.0.0` inside the development container.
import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/server.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, KIT_ALLOW_SAVE: 'true', HOST: '127.0.0.1', PORT: '4301' },
  }),
  spawn('npx', ['ng', 'serve', 'catalog', ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) child.on('exit', (code) => stop(code ?? 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
