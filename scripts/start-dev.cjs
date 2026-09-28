'use strict';

const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function preferredPort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : fallback;
}

function envPort(name) {
  const file = require('node:fs').readFileSync(path.join(root, 'backend', '.env'), 'utf8');
  const match = file.match(new RegExp(`^\\s*${name}\\s*=\\s*([^\\r\\n#]*)`, 'm'));
  return match ? match[1].trim() : undefined;
}

function canBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => {
      // Windows installations without IPv6 can still use the IPv4 listener.
      resolve(host === '::' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EPROTONOSUPPORT'].includes(error.code));
    });
    server.listen({ host, port }, () => server.close(() => resolve(true)));
  });
}

async function findAvailablePort(start, attempts = 200) {
  for (let offset = 0; offset < attempts && start + offset <= 65535; offset += 1) {
    const port = start + offset;
    if (await canBind(port, '0.0.0.0') && await canBind(port, '::')) return port;
  }
  throw new Error(`Tidak ditemukan port kosong mulai ${start}.`);
}

async function start() {
  const apiPort = await findAvailablePort(preferredPort(process.env.PORT || envPort('PORT'), 8787));
  const webPort = await findAvailablePort(preferredPort(process.env.RENJANA_FRONTEND_PORT, 5173));
  const env = {
    ...process.env,
    PORT: String(apiPort),
    RENJANA_API_PORT: String(apiPort),
    RENJANA_FRONTEND_PORT: String(webPort),
  };

  console.log('\nCEMILIN | Port otomatis');
  console.log(`  Website  : http://localhost:${webPort}/`);
  console.log(`  API      : http://localhost:${apiPort}/api/health`);
  console.log('  Website dan API terhubung otomatis. Tekan Ctrl+C untuk berhenti.\n');

  // Concurrently preserves API/WEB logs and stops both processes if one exits.
  const windows = process.platform === 'win32';
  const child = spawn(windows ? 'cmd.exe' : 'npm',
    windows ? ['/d', '/s', '/c', 'npm run dev:services'] : ['run', 'dev:services'],
    { cwd: root, env, stdio: 'inherit' });

  child.on('error', (error) => {
    console.error('[ERROR] Gagal menjalankan CemilIn:', error.message);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code === null ? (signal === 'SIGINT' ? 130 : 1) : code;
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[ERROR]', error.message);
    process.exitCode = 1;
  });
}

module.exports = { canBind, findAvailablePort, preferredPort };
