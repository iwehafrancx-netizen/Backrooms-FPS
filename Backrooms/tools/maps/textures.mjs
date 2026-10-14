import { svg, noise, grain } from './kit.mjs';

const ribs = (w, h, step, bar, groove, a = 0.12, g = 0.25) => {
  let s = '';
  for (let x = 0; x < w; x += step) s += `<rect x="${x}" y="0" width="${bar}" height="${h}" fill="#fff" opacity="${a}"/><rect x="${x + bar}" y="0" width="${groove}" height="${h}" fill="#000" opacity="${g}"/>`;
  return s;
};
const lines = (w, h, n, color, width, vertical = false) => Array.from({ length: n }, (_, i) => vertical
  ? `<rect x="${Math.round((i * w) / n)}" y="0" width="${width}" height="${h}" fill="${color}"/>`
  : `<rect x="0" y="${Math.round((i * h) / n)}" width="${w}" height="${width}" fill="${color}"/>`).join('');

export const T = {
  concrete: () => svg(256, 256, `<defs>${noise('n', 0.024, 4, 3)}${noise('m', 0.3, 2, 7)}</defs><rect width="256" height="256" fill="#8f9397"/>${grain(256, 256, 'n', 0.35)}${grain(256, 256, 'm', 0.1)}
    <g fill="#6d7175">${lines(256, 256, 2, '#6d7175', 2)}${lines(256, 256, 2, '#6d7175', 2, true)}</g>`),
  corrugated: () => svg(256, 512, `<defs>${noise('n', 0.04, 3, 5)}<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e4b58"/><stop offset="0.6" stop-color="#5d6e7e"/><stop offset="1" stop-color="#6f8090"/></linearGradient></defs>
    <rect width="256" height="512" fill="url(#g)"/>${ribs(256, 512, 16, 7, 2, 0.1, 0.22)}${grain(256, 512, 'n', 0.3)}
    <rect y="350" width="256" height="5" fill="#e9eef2" opacity="0.8"/><rect y="450" width="256" height="62" fill="#24282d"/>
    ${Array.from({ length: 12 }, (_, i) => `<polygon points="${i * 24},440 ${i * 24 + 12},440 ${i * 24 + 2},450 ${i * 24 - 10},450" fill="#f2c230"/>`).join('')}`),
  container: () => svg(256, 256, `<defs>${noise('n', 0.06, 3, 9)}${noise('r', 0.008, 2, 11)}</defs><rect width="256" height="256" fill="#d9d9d9"/>${ribs(256, 256, 21, 10, 3, 0.18, 0.28)}${grain(256, 256, 'n', 0.22)}${grain(256, 256, 'r', 0.25)}
    <rect width="256" height="13" fill="#000" opacity="0.35"/><rect y="243" width="256" height="13" fill="#000" opacity="0.4"/>`),
  steel: () => svg(128, 128, `<defs>${noise('n', 0.1, 3, 2)}</defs><rect width="128" height="128" fill="#525960"/>${grain(128, 128, 'n', 0.35)}<rect width="128" height="2" fill="#2c3035"/><rect width="2" height="128" fill="#2c3035"/>`),
  deck: () => {
    let dp = '';
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) { const o = (y / 16) % 2 ? 8 : 0; dp += `<rect x="${x + o + 3}" y="${y + 6}" width="9" height="3" rx="1" fill="#9aa0a6" transform="rotate(${(y / 16) % 2 ? 35 : -35} ${x + o + 7} ${y + 7})"/>`; }
    return svg(128, 128, `<defs>${noise('n', 0.12, 3, 4)}</defs><rect width="128" height="128" fill="#6a7076"/>${dp}${grain(128, 128, 'n', 0.3)}`);
  },
  crate: () => svg(128, 128, `<defs>${noise('n', 0.04, 4, 6)}</defs><rect width="128" height="128" fill="#a37a48"/>${lines(128, 128, 6, '#5a3d1e', 2)}${grain(128, 128, 'n', 0.35)}
    <rect width="128" height="128" fill="none" stroke="#6b4824" stroke-width="12"/><line x1="7" y1="7" x2="121" y2="121" stroke="#7d5730" stroke-width="10"/><line x1="121" y1="7" x2="7" y2="121" stroke="#7d5730" stroke-width="10"/>`),
  roof: () => svg(128, 128, `<defs>${noise('n', 0.06, 3, 8)}</defs><rect width="128" height="128" fill="#3a434c"/>${grain(128, 128, 'n', 0.35)}<rect width="128" height="3" fill="#1d2328"/><rect width="3" height="128" fill="#1d2328"/>`),
  paint: () => svg(64, 64, `<defs>${noise('n', 0.15, 2, 12)}</defs><rect width="64" height="64" fill="#f4f4f4"/>${grain(64, 64, 'n', 0.15)}`),
  mural: (bg, bg2, accent, team, letter, title = 'HANGAR', big = '9') => svg(512, 288, `<defs>${noise('n', 0.02, 4, 13)}<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="512" height="288" fill="url(#g)"/>
    <text x="128" y="236" font-family="DejaVu Sans" font-weight="bold" font-size="260" fill="#ffffff" opacity="0.92" text-anchor="middle">${big}</text>
    <text x="350" y="100" font-family="DejaVu Sans" font-weight="bold" font-size="46" fill="#ffffff" text-anchor="middle" letter-spacing="5">${title}</text>
    <rect x="235" y="120" width="230" height="7" fill="${accent}"/>
    <text x="350" y="180" font-family="DejaVu Sans" font-weight="bold" font-size="42" fill="${accent}" text-anchor="middle" letter-spacing="3">${team}</text>
    <text x="350" y="235" font-family="DejaVu Sans Mono" font-weight="bold" font-size="20" fill="#ffffff" opacity="0.8" text-anchor="middle" letter-spacing="4">SECTOR ${letter}</text>
    ${grain(512, 288, 'n', 0.25)}<rect x="4" y="4" width="504" height="280" fill="none" stroke="#000" stroke-width="8" opacity="0.4"/>`),
  parquet: () => {
    let p = '';
    for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 64) { const o = (y / 32) % 2 ? 32 : 0, s = 0.82 + ((x * 7 + y * 3) % 5) * 0.05; p += `<rect x="${x + o}" y="${y}" width="64" height="32" fill="rgb(${Math.round(120 * s)},${Math.round(78 * s)},${Math.round(44 * s)})" stroke="#3b2412" stroke-width="2"/><rect x="${x + o - 256}" y="${y}" width="64" height="32" fill="rgb(${Math.round(120 * s)},${Math.round(78 * s)},${Math.round(44 * s)})" stroke="#3b2412" stroke-width="2"/>`; }
    return svg(256, 256, `<defs>${noise('n', 0.05, 3, 21)}</defs>${p}${grain(256, 256, 'n', 0.25)}`);
  },
  wallpaper: () => {
    let d = '';
    for (let y = 0; y < 256; y += 32) for (let x = 0; x < 128; x += 32) d += `<path d="M${x + 16} ${y + 6} L${x + 26} ${y + 16} L${x + 16} ${y + 26} L${x + 6} ${y + 16} Z" fill="#c9b27a" opacity="0.35"/>`;
    return svg(128, 256, `<defs>${noise('n', 0.05, 3, 31)}</defs><rect width="128" height="256" fill="#5b2a2e"/>${d}${grain(128, 256, 'n', 0.25)}
      <rect y="176" width="128" height="80" fill="#3e2416"/><rect y="172" width="128" height="6" fill="#c9a24a"/>${lines(128, 80, 4, '#2a170d', 2, true).replace(/y="0"/g, 'y="176"')}`);
  },
  marble: () => svg(256, 256, `<defs>${noise('n', 0.01, 5, 41)}${noise('v', 0.04, 2, 43)}</defs><rect width="256" height="256" fill="#e8e4dc"/>${grain(256, 256, 'n', 0.35)}${grain(256, 256, 'v', 0.12)}
    <rect width="256" height="256" fill="none" stroke="#9e978a" stroke-width="3"/><rect x="128" width="1.5" height="256" fill="#b7b0a2"/><rect y="128" width="256" height="1.5" fill="#b7b0a2"/>`),
  plaster: () => svg(128, 128, `<defs>${noise('n', 0.06, 3, 51)}</defs><rect width="128" height="128" fill="#d8d2c4"/>${grain(128, 128, 'n', 0.25)}`),
  window: () => svg(128, 128, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2b5a"/><stop offset="1" stop-color="#5a7bc0"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/>
    <circle cx="92" cy="30" r="12" fill="#f4f1d8" opacity="0.9"/><rect width="128" height="128" fill="none" stroke="#2a1a10" stroke-width="10"/><rect x="61" width="6" height="128" fill="#2a1a10"/><rect y="61" width="128" height="6" fill="#2a1a10"/>`),
  books: () => {
    let b = '';
    const cols = ['#7a2a2a', '#2a4a7a', '#2a6a3a', '#8a6a2a', '#4a2a6a', '#6a6a6a'];
    for (let y = 0; y < 128; y += 32) { let x = 2; let i = (y / 32) * 3; while (x < 126) { const w = 5 + ((i * 7) % 6); b += `<rect x="${x}" y="${y + 4}" width="${w}" height="${26 - ((i * 5) % 7)}" fill="${cols[i % cols.length]}" transform="translate(0 ${(i * 5) % 7})"/>`; x += w + 1; i++; } }
    return svg(128, 128, `<rect width="128" height="128" fill="#2a1a10"/>${b}${lines(128, 128, 4, '#4a2e1a', 4)}`);
  },
  fabric: () => svg(64, 64, `<defs>${noise('n', 0.4, 2, 61)}</defs><rect width="64" height="64" fill="#cfcfcf"/>${grain(64, 64, 'n', 0.3)}`),
  tile: () => svg(256, 256, `<defs>${noise('n', 0.03, 3, 71)}</defs><rect width="256" height="256" fill="#d4d6d8"/>${grain(256, 256, 'n', 0.18)}
    <rect x="0" y="0" width="128" height="128" fill="#bfc3c7"/><rect x="128" y="128" width="128" height="128" fill="#bfc3c7"/>
    <g fill="#9a9ea2">${lines(256, 256, 2, '#9a9ea2', 2)}${lines(256, 256, 2, '#9a9ea2', 2, true)}</g>`),
  storefront: () => svg(256, 128, `<rect width="256" height="128" fill="#20262c"/><rect x="6" y="34" width="244" height="88" fill="#3a5a6a" opacity="0.6"/>
    ${lines(256, 128, 4, '#151a1f', 4, true)}<rect width="256" height="30" fill="#14181c"/>`),
  signs: () => svg(512, 64, `<rect width="512" height="64" fill="#0f1216"/>
    ${[['NEON', '#ff3d7f'], ['BURGER', '#ffb02e'], ['TECH', '#3df2ff'], ['STYLE', '#c084ff'], ['SPORT', '#3df27a'], ['CAFE', '#ff7b3d'], ['GAMES', '#ffe14a'], ['BOOKS', '#7fb2ff']].map(([w, c], i) => `<text x="${i * 64 + 32}" y="41" font-family="DejaVu Sans" font-weight="bold" font-size="15" fill="${c}" text-anchor="middle">${w}</text>`).join('')}`),
};

const art = (seed, c1, c2, c3) => svg(192, 128, `<defs>${noise('n', 0.03, 4, seed)}<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="192" height="128" fill="url(#g)"/><circle cx="${60 + seed % 50}" cy="60" r="34" fill="${c3}" opacity="0.8"/><path d="M0 100 Q60 ${60 + seed % 30} 120 96 T192 90 V128 H0Z" fill="#1a1a1a" opacity="0.55"/>${grain(192, 128, 'n', 0.3)}
  <rect width="192" height="128" fill="none" stroke="#b8923a" stroke-width="10"/><rect x="5" y="5" width="182" height="118" fill="none" stroke="#6b4a14" stroke-width="2"/>`);
Object.assign(T, {
  stone: () => svg(256, 256, `<defs>${noise('n', 0.02, 4, 81)}${noise('v', 0.05, 3, 83)}</defs><rect width="256" height="256" fill="#e9e5dc"/><rect width="128" height="128" fill="#2c2f36"/><rect x="128" y="128" width="128" height="128" fill="#2c2f36"/>${grain(256, 256, 'n', 0.35)}${grain(256, 256, 'v', 0.12)}<rect width="256" height="2" fill="#555"/><rect width="2" height="256" fill="#555"/><rect y="128" width="256" height="1.5" fill="#777"/><rect x="128" width="1.5" height="256" fill="#777"/>`),
  brick: () => { let b = ''; for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 32) { const o = (y / 16) % 2 ? 16 : 0, s = 0.85 + ((x * 3 + y * 5) % 7) * 0.03; b += `<rect x="${x + o}" y="${y}" width="31" height="15" fill="rgb(${Math.round(150 * s)},${Math.round(72 * s)},${Math.round(52 * s)})"/>`; } return svg(256, 256, `<defs>${noise('n', 0.06, 3, 91)}</defs><rect width="256" height="256" fill="#b8b0a4"/>${b}${grain(256, 256, 'n', 0.3)}`); },
  curtain: () => svg(128, 128, `<defs>${noise('n', 0.08, 2, 95)}</defs><rect width="128" height="128" fill="#7a1a24"/>${ribs(128, 128, 16, 8, 3, 0.18, 0.32)}${grain(128, 128, 'n', 0.25)}`),
  rug: () => svg(128, 128, `<rect width="128" height="128" fill="#7a1f26"/><rect x="8" y="8" width="112" height="112" fill="none" stroke="#d6b25a" stroke-width="4"/><rect x="20" y="20" width="88" height="88" fill="#233a66"/><path d="M64 26 L100 64 L64 102 L28 64Z" fill="#7a1f26" stroke="#d6b25a" stroke-width="3"/><circle cx="64" cy="64" r="12" fill="#d6b25a"/>`),
  paintA: () => art(5, '#2a3b66', '#c98c4a', '#f2d98a'),
  paintB: () => art(17, '#3f5a3a', '#d9c7a0', '#8a3a2a'),
  paintC: () => art(33, '#5a2a44', '#2a4a5e', '#e0c070'),
  train: () => svg(256, 128, `<defs>${noise('n', 0.04, 3, 101)}</defs><rect width="256" height="128" fill="#d8dce0"/><rect y="70" width="256" height="34" fill="#c0392b"/><rect y="104" width="256" height="24" fill="#2b2f36"/>${[0, 1, 2, 3].map((i) => `<rect x="${12 + i * 62}" y="22" width="46" height="40" rx="5" fill="#25364d"/><rect x="${12 + i * 62}" y="22" width="46" height="8" fill="#6c8fb5" opacity="0.5"/>`).join('')}<rect y="62" width="256" height="4" fill="#f2c230"/>${grain(256, 128, 'n', 0.22)}`),
  glassroof: () => svg(128, 128, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3f6"/><stop offset="1" stop-color="#8fb3d4"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/><rect width="128" height="4" fill="#3a434c"/><rect width="4" height="128" fill="#3a434c"/>`),
  rail: () => svg(64, 64, `<rect width="64" height="64" fill="#5b5148"/><rect width="64" height="14" y="25" fill="#8a8a8c"/>${lines(64, 64, 2, '#2b2420', 3, true)}`),
  platform: () => svg(256, 256, `<defs>${noise('n', 0.03, 4, 111)}</defs><rect width="256" height="256" fill="#9a9ea3"/>${grain(256, 256, 'n', 0.3)}<rect width="256" height="2" fill="#6c7075"/><rect width="2" height="256" fill="#6c7075"/><rect y="0" width="256" height="18" fill="#e8c52a" opacity="0.9"/>`),
});
