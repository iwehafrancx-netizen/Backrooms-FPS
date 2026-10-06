// usage: node test/shot.mjs <script.js>  — runs viewer, evaluates steps, saves screenshots
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const steps = (await import(process.argv[2])).default;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
p.on('console', m => console.log('[console]', m.type(), m.text()));
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:8765/tools/test/viewer.html');
await steps(p);
await b.close();
