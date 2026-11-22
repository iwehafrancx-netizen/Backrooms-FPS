// Quick visual check: title screen, then level 1 gameplay. Screenshots go to tools/test/out.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = new URL('./out/', import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const url = process.argv[2] || 'http://127.0.0.1:8770/dev/index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(url);
await p.waitForFunction(() => window.__tt && window.__tt.screens && window.__tt.screens.cur === 'title-screen', null, { timeout: 120000 });
await p.waitForTimeout(1500); await p.screenshot({ path: out + 'title.png' });
await p.evaluate(() => { window.__tt.save.data.howSeen = true; window.__tt.startLevel(0); });
await p.waitForTimeout(2500); await p.screenshot({ path: out + 'level1.png' });
console.log('errors:', JSON.stringify(errors.slice(0, 8)));
await b.close();
