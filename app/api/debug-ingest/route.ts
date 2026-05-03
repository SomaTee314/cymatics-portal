import { NextResponse } from 'next/server';
import { appendFile } from 'fs/promises';
import path from 'path';

/** NDJSON receiver: landing perf probes (session `7e891a`). Writable on loopback or dev / ALLOW_DEBUG_INGEST. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RING = 384;

function getRing(): string[] {
  const glob = globalThis as typeof globalThis & { __cpDebug7e891aRing?: string[] };
  glob.__cpDebug7e891aRing ??= [];
  return glob.__cpDebug7e891aRing;
}

function ringPush(line: string) {
  const r = getRing();
  r.push(line);
  while (r.length > MAX_RING) r.shift();
}

function logRoots(): string[] {
  const cwd = process.cwd();
  const init = (process.env.INIT_CWD || '').trim();
  return [...new Set([cwd, init].filter(Boolean))];
}

function parseHost(req: Request): string {
  return (req.headers.get('host') || '').toLowerCase();
}

function isLoopbackHost(host: string): boolean {
  return (
    /^localhost(:\d+)?$/i.test(host) ||
    /^127\.0\.0\.1(:\d+)?$/i.test(host) ||
    host.startsWith('[::1]')
  );
}

function allowDebugIngest(host: string): boolean {
  if (process.env.VERCEL === '1') {
    return false;
  }
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.ALLOW_DEBUG_INGEST === '1' ||
    isLoopbackHost(host)
  );
}

function appendTargets(): string[] {
  const roots = logRoots();
  const cwd = process.cwd();
  const set = new Set<string>();
  for (const root of roots) {
    set.add(path.join(root, 'debug-7e891a.log'));
  }
  set.add(path.join(cwd, 'public', 'debug-7e891a.ndjson'));
  return [...set];
}

/** `GET`: JSON meta (default) or `?tail=1` NDJSON captured since dev server boot. */
export async function GET(req: Request) {
  const host = parseHost(req);
  const allowed = allowDebugIngest(host);
  if (!allowed) {
    return new NextResponse('Not found', { status: 404 });
  }
  const u = new URL(req.url);
  if (u.searchParams.get('tail') === '1') {
    const body = getRing().join('\n');
    return new NextResponse(body ? `${body}\n` : '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL === '1',
    cwd: process.cwd(),
    initCwd: process.env.INIT_CWD || null,
    appendTargetsSample: appendTargets().slice(0, 4),
    logRoots: logRoots(),
    ringLines: getRing().length,
  });
}

export async function POST(req: Request) {
  const host = parseHost(req);
  if (!allowDebugIngest(host)) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (req.headers.get('x-debug-session-id') !== '7e891a') {
    return new Response('Forbidden', { status: 403 });
  }
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  const line = JSON.stringify(payload);

  ringPush(line);

  const targets = appendTargets();
  await Promise.all(
    targets.map(async (dest) => {
      try {
        await appendFile(dest, `${line}\n`, 'utf8');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console -- intentional ingest diagnostics for local/debug
          console.warn('[debug-ingest] append failed', dest, msg);
        }
      }
    }),
  );

  return new NextResponse('ok', { status: 200 });
}
