import { chromium } from 'playwright-core';
const [url, out, script = '', w = '1280', h = '720', wait = '2500'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto(url);
await page.waitForTimeout(+wait);
if (script) { const r = await page.evaluate(script); if (r !== undefined) console.log('result', JSON.stringify(r)); await page.waitForTimeout(400); }
await page.screenshot({ path: out });
console.log(errors.length ? errors.slice(0, 6).join('\n') : 'no errors');
await browser.close();
