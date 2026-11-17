// `npm start`: the catalog in development, with its server. Two processes, stopped together:
// - server/server.mjs on 127.0.0.1:4301: the admin (KIT_ADMIN_USER and KIT_ADMIN_PASSWORD, read from
//   .env) saves the variables and the kit's files from the catalog; every save is kept in
//   .kit/history.jsonl (the History page), the scenes the admin keeps in .kit/scenes.json;
// - `ng serve catalog` on 4300, which sends /api to it (projects/catalog/proxy.conf.json).
// Arguments go to ng serve: `npm start -- --host 0.0.0.0` inside the development container.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

// The admin's user and password, never in the repo (.env.example says what goes in it).
if (existsSync('.env')) process.loadEnvFile('.env');
else console.warn('No .env: nobody can sign in, so the catalog saves nothing. Copy .env.example to .env and set the admin.');

const children = [
  spawn(process.execPath, ['server/server.mjs'], {
    stdio: 'inherit',
    env: { HISTORY_FILE: '.kit/history.jsonl', PAGES_FILE: '.kit/pages.json', SCENES_FILE: '.kit/scenes.json', BACKGROUNDS_FILE: '.kit/backgrounds.json', ...process.env, KIT_ALLOW_FILES: 'true', HOST: '127.0.0.1', PORT: '4301' },
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
