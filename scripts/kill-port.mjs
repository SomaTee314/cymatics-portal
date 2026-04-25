/**
 * Free a TCP listen port before restarting `next dev` (avoids EADDRINUSE and shared .next races).
 * Usage: node scripts/kill-port.mjs [port]   (default 3005)
 */
import { execSync } from 'child_process';
import process from 'process';

const port = process.argv[2] ?? '3005';

if (process.platform === 'win32') {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    const want = String(port);
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;
      const local = parts[1];
      const m = local.match(/:(\d+)$/);
      if (!m || m[1] !== want) continue;
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      console.log(`kill-port: stopping PID ${pid} (port ${port})`);
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    }
    if (pids.size === 0) {
      console.log(`kill-port: nothing listening on ${port}`);
    }
  } catch (e) {
    console.error('kill-port:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
} else {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (!out) {
      console.log(`kill-port: nothing listening on ${port}`);
    } else {
      for (const pid of out.split(/\s+/).filter(Boolean)) {
        console.log(`kill-port: stopping PID ${pid} (port ${port})`);
        execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
      }
    }
  } catch {
    console.log(`kill-port: nothing listening on ${port}`);
  }
}
