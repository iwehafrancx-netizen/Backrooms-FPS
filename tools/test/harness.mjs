// Shared Playwright harness: serves nothing itself (expects a static server on :8765),
// swaps the YouTube SDK for the local mock, and records every network request.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });
export const BASE = 'http://localhost:8765/Backrooms%20FPS/index.html';

export async function open({ width = 1280, height = 720, touch = false, query = '?debug', save = '', lang = 'en-US' } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const log = { requests: [], external: [], errors: [], console: [] };
  await page.addInitScript(([s, l]) => { window.__ytInitialSave = s; window.__ytLang = l; }, [save, lang]);
  await page.route('https://www.youtube.com/game_api/v1', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(here, 'mock-ytgame.js'), 'utf8') }));
  page.on('request', (r) => { const u = r.url(); log.requests.push(u); if (!u.startsWith('http://localhost:8765/') && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'https://www.youtube.com/game_api/v1') log.external.push(u); });
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.console.push(`[${m.type()}] ${m.text()}`); });
  await page.goto(BASE + query);
  return { browser, page, log };
}
export const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
