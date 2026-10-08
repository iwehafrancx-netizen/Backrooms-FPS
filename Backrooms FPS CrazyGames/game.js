(() => {
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 5l-7 7 7 7"/></svg>',
  play: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>',
  gear: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  pad: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r="1" fill="currentColor"/><circle cx="18.5" cy="14" r="1" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
  target: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 15l7-7 7 7"/></svg>',
  crouch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 9l7 7 7-7"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  scope: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 13V5a1.5 1.5 0 013 0v6M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-3.5L3 14c-.8-1.2.6-2.6 1.8-1.7L8 15"/></svg>',
  medal: '<svg viewBox="0 0 100 100"><path d="M30 2h12l8 30-14 4zM70 2H58l-8 30 14 4z" fill="#3d8bff"/><circle cx="50" cy="62" r="30" fill="#f2c230"/><circle cx="50" cy="62" r="23" fill="none" stroke="#0b0a07" stroke-width="3"/><path d="M50 46l5 10 11 1.5-8 7.5 2 11-10-5.5-10 5.5 2-11-8-7.5 11-1.5z" fill="#0b0a07"/></svg>',
};

const WEAPONS = {
  ak47:    { id: 'ak47', name: 'AK-47', cls: 'ASSAULT RIFLE', slot: 'primary', model: 'ak47', axis: '+x', len: 0.86, auto: true,  dmg: 31, head: 2.2, rpm: 600, mag: 30, reserve: 150, reload: 2.4, spread: 0.024, adsSpread: 0.005, recoil: 0.030, range: 90, zoom: 1.45, snd: 'ak',      stats: [0.78, 0.62, 0.55, 0.7] },
  m4:      { id: 'm4',   name: 'M4 CARBINE', cls: 'ASSAULT RIFLE', slot: 'primary', model: 'm4', axis: '+x', len: 0.84, auto: true, dmg: 25, head: 2.2, rpm: 780, mag: 30, reserve: 180, reload: 2.0, spread: 0.017, adsSpread: 0.0035, recoil: 0.021, range: 95, zoom: 1.55, snd: 'm4', stats: [0.64, 0.82, 0.75, 0.74] },
  sniper:  { id: 'sniper', name: 'BOLT SNIPER', cls: 'MARKSMAN', slot: 'primary', model: 'sniper', axis: '+z', len: 1.1, auto: false, dmg: 105, head: 3, rpm: 46, mag: 5, reserve: 25, reload: 3.0, spread: 0.07, adsSpread: 0.0, recoil: 0.09, range: 160, zoom: 4.5, scope: true, snd: 'sniper', stats: [1.0, 0.15, 0.95, 0.45] },
  pistol:  { id: 'pistol', name: 'M9 SIDEARM', cls: 'PISTOL', slot: 'secondary', model: 'pistol', axis: '-x', len: 0.24, auto: false, dmg: 28, head: 2.0, rpm: 380, mag: 12, reserve: 72, reload: 1.35, spread: 0.011, adsSpread: 0.0035, recoil: 0.018, range: 70, zoom: 1.25, snd: 'pistol', stats: [0.45, 0.6, 0.6, 0.95] },
  shotgun: { id: 'shotgun', name: 'TRI-BARREL', cls: 'SHOTGUN', slot: 'secondary', model: 'shotgun', axis: '+x', len: 0.46, auto: false, pellets: 9, dmg: 19, botDmg: 14, head: 1.5, rpm: 110, mag: 3, reserve: 30, reload: 2.1, spread: 0.055, adsSpread: 0.04, recoil: 0.065, range: 32, zoom: 1.15, snd: 'shotgun', stats: [0.95, 0.3, 0.2, 0.85] },
};
const PRIMARIES = ['ak47', 'm4', 'sniper'];
const SECONDARIES = ['pistol', 'shotgun'];
const SHOP = { shotgun: 6000, ak47: 10000, m4: 15000, sniper: 22000 };

const MAP = {
  zones: {
    west:    { x: [-30.5, -1.5], z: [6.5, 20.5] },
    central: { x: [0.5, 14.5], z: [-9.5, 20.5] },
    east:    { x: [16.0, 30.5], z: [-24.5, 20.5] },
  },
  lifts: [{ x: -8.5, z: 21.4 }, { x: 29.4, z: 5.95 }],
  siege: { blue: [{ x: -30.0, z: 13.5 }, { x: -3.0, z: 20.0 }], enemy: [{ x: 27.5, z: -24.0 }, { x: 27.5, z: 20.0 }] },
  lobby: { x: 7.5, z: 12.5 },
};

const KEY_COLORS = ['#ff4a3d', '#3df27a', '#3d8bff'];

const MISSIONS = [
  { id: 'm1', mode: 'extermination', time: 180, target: 15, stars: [15, 25, 35], primary: 'ak47', secondary: 'pistol', skill: 0.35 },
  { id: 'm2', mode: 'tdm', teamSize: 3, target: 20, time: 600, primary: 'ak47', secondary: 'pistol', skill: 0.5 },
  { id: 'm3', mode: 'keycard', deaths: 5, hostiles: 6, primary: 'ak47', secondary: 'pistol', skill: 0.45, stars: [420, 270] },
  { id: 'm4', mode: 'duel', target: 15, time: 900, primary: 'm4', secondary: 'pistol', skill: 0.95 },
  { id: 'm5', mode: 'survival', deaths: 1, primary: 'm4', secondary: 'shotgun', skill: 0.6 },
  { id: 'm6', mode: 'briefcase', time: 240, ffa: 5, primary: 'm4', secondary: 'shotgun', skill: 0.6 },
  { id: 'm7', mode: 'siege', deaths: 5, teamSize: 6, time: 300, holdTime: 3, primary: 'm4', secondary: 'pistol', skill: 0.6 },
  { id: 'holdout', mode: 'waves', lives: 3, deaths: 3, waves: [3, 4, 5, 6, 8], primary: 'm4', secondary: 'shotgun', skill: 0.55 },
  { id: 'ghost', mode: 'assassination', lives: 3, deaths: 3, patrols: 6, primary: 'sniper', secondary: 'pistol', skill: 0.6 },
  { id: 'hardpoint', mode: 'hardpoint', teamSize: 4, target: 150, time: 600, primary: 'm4', secondary: 'pistol', skill: 0.6 },
  { id: 'm8', mode: 'keycard', finale: true, hostiles: 5, lives: 3, deaths: 3, primary: 'm4', secondary: 'shotgun', skill: 0.75, stars: [480, 330] },
  { id: 'zerohour', mode: 'zerohour', lives: 3, deaths: 3, guards: 4, primary: 'm4', secondary: 'shotgun', skill: 0.85 },
];

const RANKS = [
  [0, 'RECRUIT'], [1500, 'PRIVATE'], [4000, 'CORPORAL'], [8000, 'SERGEANT'], [14000, 'STAFF SGT'],
  [22000, 'LIEUTENANT'], [32000, 'CAPTAIN'], [45000, 'MAJOR'], [60000, 'COLONEL'], [80000, 'COMMANDER'],
];
const CALLSIGNS = ['VIPER', 'GHOST', 'RAVEN', 'HAVOC', 'NOMAD', 'REAPER', 'SABLE', 'WRAITH', 'JACKAL', 'CIPHER', 'ONYX', 'ROOK', 'MAKO', 'TALON', 'VANDAL', 'KESTREL', 'BISHOP', 'DRIFT', 'HUSK', 'STATIC', 'LUMEN', 'MOTH'];

const STR = {
  en: {
    libs: 'LOADING ENGINE', nav: 'MAPPING WALKABLE SPACE', assets: 'LOADING ASSETS', building: 'BUILDING LEVEL 0', ready: 'READY', enter: 'ENTER',
    tagline: 'LEVEL 0 // TACTICAL OPERATIONS',
    play: 'Campaign', settings: 'Settings', controls: 'Controls', resume: 'Resume', restart: 'Restart', abort: 'Abort mission', back: 'Back',
    rank: 'RANK', totalScore: 'CAMPAIGN SCORE', ofMissions: '{a}/{b} MISSIONS',
    selectMission: 'Select operation', operations: 'OPERATIONS', locked: 'LOCKED', lockedHint: 'CLEAR OP {n} TO UNLOCK', best: 'BEST', newOp: 'NEW',
    briefing: 'MISSION BRIEFING', objectives: 'OBJECTIVES', loadout: 'LOADOUT', primary: 'PRIMARY', secondary: 'SECONDARY', deploy: 'Deploy', cp: 'CP', cpBalance: 'COMBAT POINTS', cpEarned: '+{n} CP', buyFor: 'BUY · {n} CP', watchAd: 'WATCH AD', thisMission: 'THIS MISSION', noThanks: 'NO THANKS', none: 'NONE', sidearmOnly: 'SIDEARM ONLY', notEnough: 'NOT ENOUGH CP', confirmBuy: 'Unlock {w} for good for {n} CP?', bought: '{w} UNLOCKED', adUnavailable: 'No ad available right now. Try again later.', adLoading: 'LOADING AD…', offerTitle: 'WEAPON OFFER', offerText: 'Take it into this mission now, or unlock it for good with Combat Points.', outTitle: 'OUT OF LIVES', outText: 'Revive right where you fell, or restart the mission from the beginning.', revive: 'REVIVE', restartMission: 'RESTART', playNow: 'PLAY', price: 'PRICE', range: 'RANGE', rpm: 'RPM', magazine: 'MAG', earnHint: 'Earn CP from missions, headshots and multi-kills.', getAmmo: 'GET AMMO', ammoRefilled: 'AMMO REFILLED', outOfAmmoHint: 'OUT OF AMMO — GET AMMO ▶', tryWeapon: 'TRY THIS WEAPON',
    dmg: 'DMG', rof: 'RATE', acc: 'ACC', mob: 'MOB',
    intelMode: 'MODE', intelTeams: 'SQUADS', intelTime: 'TIME',
    victory: 'VICTORY', defeat: 'DEFEAT', missionComplete: 'MISSION COMPLETE', missionFailed: 'MISSION FAILED', newBest: 'NEW PERSONAL BEST', next: 'Next mission', retry: 'Retry', menu: 'Menu',
    kills: 'KILLS', deaths: 'DEATHS', accuracy: 'ACCURACY', headshots: 'HEADSHOTS', time: 'TIME',
    unlocked: 'NEW OPERATION UNLOCKED',
    campaignComplete: 'CAMPAIGN COMPLETE', campaignText: 'You walked out of Level 0. Every operation is cleared and every mission stays open to replay. Want the full climb again?', startOver: 'Start over', keepPlaying: 'Keep playing',
    confirmReset: 'Reset the campaign? Mission progress and best scores are wiped. Settings are kept.', yes: 'Yes, reset', cancel: 'Cancel',
    paused: 'PAUSED',
    sens: 'Look sensitivity', invert: 'Invert look (Y)', fov: 'Field of view', quality: 'Graphics quality', volume: 'Master volume', music: 'Ambience volume', language: 'Language', showFps: 'Show FPS', touchSize: 'Touch button size', aimAssist: 'Aim assist (touch/gamepad)', autoFire: 'Auto-fire (touch)', resetCampaign: 'Reset campaign', auto: 'AUTO', low: 'LOW', med: 'MED', high: 'HIGH',
    ctlDesktop: 'KEYBOARD & MOUSE', ctlTouch: 'TOUCH', ctlPad: 'GAMEPAD',
    move: 'Move', look: 'Look', fire: 'Fire', aim: 'Aim down sights', reload: 'Reload', jump: 'Jump', crouch: 'Crouch', sprint: 'Sprint', swap: 'Swap weapon', interact: 'Interact / hold', pauseK: 'Pause',
    leftStick: 'Left stick', rightStick: 'Right stick', dragRight: 'Drag right side', joystick: 'Left joystick (push to edge = sprint)',
    eliminated: 'ELIMINATED', headshot: 'HEADSHOT', youDied: 'K.I.A.', killedBy: 'KILLED BY {n}', respawnIn: 'REDEPLOY IN {s}', outOfLives: 'NO LIVES LEFT', spectating: 'SPECTATING {n}', youAreOut: 'YOU ARE OUT — YOUR SQUAD FIGHTS ON',
    reloading: 'RELOADING', noAmmo: 'NO AMMO', lives: 'LIVES {n}', you: 'YOU',
    pressHold: 'HOLD', pickUp: 'PICK UP', useExit: 'EXTRACT', pressButton: 'OVERRIDE',
    insertion: 'INSERTION', go: 'GO',
    fpsWord: 'FPS',
    o_ext: 'ELIMINATE HOSTILES — <b>{k}</b> / {t}', o_tdm: 'FIRST TEAM TO <b>{t}</b> ELIMINATIONS', o_key: 'RECOVER KEYCARDS — <b>{k}</b> / 3', o_exit: 'KEYCARDS SECURED — <b>REACH THE LIFT</b>', o_duel: 'FIRST TO <b>{t}</b> — TAKE DOWN THE MIMIC',
    o_surv: 'SQUADS REMAINING — <b>{n}</b>', o_brief: '<b>{h}</b> HAS THE BRIEFCASE — TAKE IT BACK', o_briefNone: 'GRAB THE BRIEFCASE', o_briefYou: '<b>YOU HAVE THE BRIEFCASE</b> — HOLD IT UNTIL TIME RUNS OUT',
    o_siege: 'OVERRIDE BOTH ENEMY SWITCHES — <b>{a}</b> / 2',
    b_key: 'KEYCARD RECOVERED', b_exit: 'EXIT UNLOCKED', b_button: 'SWITCH OVERRIDDEN', b_lost: 'SWITCH LOST', b_case: 'BRIEFCASE SECURED', b_caseLost: 'BRIEFCASE DROPPED', b_lights: 'POWER FAILURE', b_squadOut: 'SQUAD ELIMINATED', b_lead: 'TAKING THE LEAD', b_hunt: 'THEY CAN HEAR YOU',
    r_time: 'TIME EXPIRED', r_dead: 'YOUR SQUAD WAS WIPED OUT', r_win: 'OPERATION SUCCESSFUL', r_score: 'TARGET NOT REACHED', r_enemyWin: 'THE ENEMY WON THE ROUND', r_case: 'LAST ONE STANDING WITH THE CASE', r_extract: 'EXTRACTED FROM LEVEL 0', r_siegeLost: 'THEY OVERRODE YOUR SWITCHES', o_wave: 'WAVE <b>{w}</b> / {t} — {n} HOSTILES LEFT', o_waveBreak: 'NEXT WAVE IN <b>{s}</b>', b_wave: 'WAVE {w}', b_waveClear: 'WAVE CLEARED', o_ghost: 'ELIMINATE THE OFFICERS — <b>{k}</b> / 3', b_alarm: 'ALARM RAISED', b_alarmSub: 'REINFORCEMENTS INBOUND', b_officer: 'OFFICER DOWN', o_hp: 'HOLD THE HARDPOINT — FIRST TO <b>{t}</b>', o_hpContest: '<b>HARDPOINT CONTESTED</b>', b_hpMove: 'HARDPOINT MOVED', o_boss: 'HUNT DOWN THE MIMIC', o_bossExit: 'THE MIMIC IS DOWN — <b>REACH THE LIFT</b>', b_boss: 'THE MIMIC IS DOWN', r_waves: 'ALL WAVES SURVIVED', r_ghost: 'ALL OFFICERS ELIMINATED', r_boss: 'THE MIMIC IS DEAD — EXTRACTED',
    tips: ['TIP: Headshots deal heavy bonus damage.', 'TIP: Crouching tightens your spread.', 'TIP: Hostiles hear gunfire. Pick your fights.', 'TIP: Blue chevrons mark your squad. Every other colour is hostile.', 'TIP: Keycards beep louder as you get closer.', 'TIP: Health regenerates after a few seconds out of combat.'],
  },
  es: {
    libs: 'CARGANDO MOTOR', nav: 'MAPEANDO ZONA TRANSITABLE', assets: 'CARGANDO RECURSOS', building: 'CONSTRUYENDO NIVEL 0', ready: 'LISTO', enter: 'ENTRAR',
    tagline: 'NIVEL 0 // OPERACIONES TÁCTICAS', play: 'Campaña', settings: 'Ajustes', controls: 'Controles', resume: 'Continuar', restart: 'Reiniciar', abort: 'Abandonar misión', back: 'Volver',
    rank: 'RANGO', totalScore: 'PUNTUACIÓN DE CAMPAÑA', ofMissions: '{a}/{b} MISIONES',
    selectMission: 'Elige operación', operations: 'OPERACIONES', locked: 'BLOQUEADA', lockedHint: 'SUPERA LA OP {n} PARA DESBLOQUEAR', best: 'RÉCORD', newOp: 'NUEVA',
    briefing: 'INFORME DE MISIÓN', objectives: 'OBJETIVOS', loadout: 'EQUIPO', primary: 'PRINCIPAL', secondary: 'SECUNDARIA', deploy: 'Desplegar', cp: 'CP', cpBalance: 'PUNTOS DE COMBATE', cpEarned: '+{n} CP', buyFor: 'COMPRAR · {n} CP', watchAd: 'VER ANUNCIO', thisMission: 'ESTA MISIÓN', noThanks: 'NO, GRACIAS', none: 'NINGUNA', sidearmOnly: 'SOLO PISTOLA', notEnough: 'CP INSUFICIENTES', confirmBuy: '¿Desbloquear {w} para siempre por {n} CP?', bought: '{w} DESBLOQUEADA', adUnavailable: 'No hay anuncios disponibles ahora. Inténtalo más tarde.', adLoading: 'CARGANDO ANUNCIO…', offerTitle: 'OFERTA DE ARMA', offerText: 'Llévala a esta misión ahora o desbloquéala para siempre con Puntos de Combate.', outTitle: 'SIN VIDAS', outText: 'Revive donde caíste o reinicia la misión desde el principio.', revive: 'REVIVIR', restartMission: 'REINICIAR', playNow: 'JUGAR', price: 'PRECIO', range: 'ALCANCE', rpm: 'DPM', magazine: 'CARGADOR', earnHint: 'Gana CP con misiones, disparos a la cabeza y bajas múltiples.', getAmmo: 'MUNICIÓN', ammoRefilled: 'MUNICIÓN RECARGADA', outOfAmmoHint: 'SIN MUNICIÓN — CONSEGUIR ▶', tryWeapon: 'PRUEBA ESTA ARMA',
    dmg: 'DAÑO', rof: 'CAD.', acc: 'PREC.', mob: 'MOV.', intelMode: 'MODO', intelTeams: 'EQUIPOS', intelTime: 'TIEMPO',
    victory: 'VICTORIA', defeat: 'DERROTA', missionComplete: 'MISIÓN CUMPLIDA', missionFailed: 'MISIÓN FALLIDA', newBest: 'NUEVO RÉCORD PERSONAL', next: 'Siguiente misión', retry: 'Reintentar', menu: 'Menú',
    kills: 'BAJAS', deaths: 'MUERTES', accuracy: 'PRECISIÓN', headshots: 'TIROS A LA CABEZA', time: 'TIEMPO',
    unlocked: 'NUEVA OPERACIÓN DESBLOQUEADA', campaignComplete: 'CAMPAÑA COMPLETADA', campaignText: 'Escapaste del Nivel 0. Todas las operaciones superadas, y puedes repetir cualquier misión. ¿Empezar la escalada otra vez?', startOver: 'Empezar de nuevo', keepPlaying: 'Seguir jugando',
    confirmReset: '¿Reiniciar la campaña? Se borran el progreso y los récords. Los ajustes se conservan.', yes: 'Sí, reiniciar', cancel: 'Cancelar', paused: 'PAUSA',
    sens: 'Sensibilidad', invert: 'Invertir eje Y', fov: 'Campo de visión', quality: 'Calidad gráfica', volume: 'Volumen general', music: 'Volumen ambiente', language: 'Idioma', showFps: 'Mostrar FPS', touchSize: 'Tamaño de botones', aimAssist: 'Asistencia de apuntado', autoFire: 'Disparo automático (táctil)', resetCampaign: 'Reiniciar campaña', auto: 'AUTO', low: 'BAJA', med: 'MEDIA', high: 'ALTA',
    ctlDesktop: 'TECLADO Y RATÓN', ctlTouch: 'TÁCTIL', ctlPad: 'MANDO', move: 'Mover', look: 'Mirar', fire: 'Disparar', aim: 'Apuntar', reload: 'Recargar', jump: 'Saltar', crouch: 'Agacharse', sprint: 'Correr', swap: 'Cambiar arma', interact: 'Interactuar / mantener', pauseK: 'Pausa',
    leftStick: 'Stick izquierdo', rightStick: 'Stick derecho', dragRight: 'Arrastra a la derecha', joystick: 'Joystick izquierdo (al borde = correr)',
    eliminated: 'ELIMINADO', headshot: 'A LA CABEZA', youDied: 'CAÍDO', killedBy: 'ELIMINADO POR {n}', respawnIn: 'REAPARECES EN {s}', outOfLives: 'SIN VIDAS', spectating: 'OBSERVANDO A {n}', youAreOut: 'ESTÁS FUERA — TU EQUIPO SIGUE LUCHANDO',
    reloading: 'RECARGANDO', noAmmo: 'SIN MUNICIÓN', lives: 'VIDAS {n}', you: 'TÚ', pressHold: 'MANTÉN', pickUp: 'RECOGER', useExit: 'EXTRAER', pressButton: 'ANULAR', insertion: 'INSERCIÓN', go: 'YA', fpsWord: 'FPS',
    o_ext: 'ELIMINA HOSTILES — <b>{k}</b> / {t}', o_tdm: 'PRIMER EQUIPO EN <b>{t}</b> BAJAS', o_key: 'RECUPERA TARJETAS — <b>{k}</b> / 3', o_exit: 'TARJETAS LISTAS — <b>LLEGA AL ASCENSOR</b>', o_duel: 'PRIMERO A <b>{t}</b> — DERRIBA AL MIMIC',
    o_surv: 'EQUIPOS RESTANTES — <b>{n}</b>', o_brief: '<b>{h}</b> TIENE EL MALETÍN — RECUPÉRALO', o_briefNone: 'COGE EL MALETÍN', o_briefYou: '<b>TIENES EL MALETÍN</b> — AGUANTA HASTA QUE ACABE EL TIEMPO', o_siege: 'ANULA LOS DOS INTERRUPTORES ENEMIGOS — <b>{a}</b> / 2',
    b_key: 'TARJETA RECUPERADA', b_exit: 'SALIDA DESBLOQUEADA', b_button: 'INTERRUPTOR ANULADO', b_lost: 'INTERRUPTOR PERDIDO', b_case: 'MALETÍN ASEGURADO', b_caseLost: 'MALETÍN PERDIDO', b_lights: 'APAGÓN', b_squadOut: 'EQUIPO ELIMINADO', b_lead: 'TOMAS LA DELANTERA', b_hunt: 'TE PUEDEN OÍR',
    r_time: 'TIEMPO AGOTADO', r_dead: 'TU EQUIPO FUE ELIMINADO', r_win: 'OPERACIÓN EXITOSA', r_score: 'OBJETIVO NO ALCANZADO', r_enemyWin: 'EL ENEMIGO GANÓ LA RONDA', r_case: 'ÚLTIMO EN PIE CON EL MALETÍN', r_extract: 'EXTRAÍDO DEL NIVEL 0', r_siegeLost: 'ANULARON TUS INTERRUPTORES', o_wave: 'OLEADA <b>{w}</b> / {t} — QUEDAN {n} HOSTILES', o_waveBreak: 'SIGUIENTE OLEADA EN <b>{s}</b>', b_wave: 'OLEADA {w}', b_waveClear: 'OLEADA SUPERADA', o_ghost: 'ELIMINA A LOS OFICIALES — <b>{k}</b> / 3', b_alarm: 'ALARMA ACTIVADA', b_alarmSub: 'LLEGAN REFUERZOS', b_officer: 'OFICIAL ABATIDO', o_hp: 'MANTÉN LA ZONA — PRIMERO A <b>{t}</b>', o_hpContest: '<b>ZONA DISPUTADA</b>', b_hpMove: 'LA ZONA SE MOVIÓ', o_boss: 'CAZA AL MIMIC', o_bossExit: 'EL MIMIC HA CAÍDO — <b>LLEGA AL ASCENSOR</b>', b_boss: 'EL MIMIC HA CAÍDO', r_waves: 'SOBREVIVISTE A TODAS LAS OLEADAS', r_ghost: 'OFICIALES ELIMINADOS', r_boss: 'EL MIMIC HA MUERTO — EXTRAÍDO',
    tips: ['CONSEJO: Los tiros a la cabeza hacen mucho más daño.', 'CONSEJO: Agacharte reduce la dispersión.', 'CONSEJO: Los hostiles oyen los disparos.', 'CONSEJO: Los chevrones azules marcan a tu equipo.', 'CONSEJO: Las tarjetas pitan más fuerte al acercarte.', 'CONSEJO: La salud se regenera fuera de combate.'],
  },
  pt: {
    libs: 'CARREGANDO MOTOR', nav: 'MAPEANDO ÁREA CAMINHÁVEL', assets: 'CARREGANDO RECURSOS', building: 'CONSTRUINDO NÍVEL 0', ready: 'PRONTO', enter: 'ENTRAR',
    tagline: 'NÍVEL 0 // OPERAÇÕES TÁTICAS', play: 'Campanha', settings: 'Configurações', controls: 'Controles', resume: 'Continuar', restart: 'Reiniciar', abort: 'Abandonar missão', back: 'Voltar',
    rank: 'PATENTE', totalScore: 'PONTUAÇÃO DA CAMPANHA', ofMissions: '{a}/{b} MISSÕES',
    selectMission: 'Escolha a operação', operations: 'OPERAÇÕES', locked: 'BLOQUEADA', lockedHint: 'CONCLUA A OP {n} PARA LIBERAR', best: 'RECORDE', newOp: 'NOVA',
    briefing: 'BRIEFING DA MISSÃO', objectives: 'OBJETIVOS', loadout: 'EQUIPAMENTO', primary: 'PRIMÁRIA', secondary: 'SECUNDÁRIA', deploy: 'Implantar', cp: 'CP', cpBalance: 'PONTOS DE COMBATE', cpEarned: '+{n} CP', buyFor: 'COMPRAR · {n} CP', watchAd: 'VER ANÚNCIO', thisMission: 'ESTA MISSÃO', noThanks: 'NÃO, OBRIGADO', none: 'NENHUMA', sidearmOnly: 'SÓ PISTOLA', notEnough: 'CP INSUFICIENTE', confirmBuy: 'Desbloquear {w} para sempre por {n} CP?', bought: '{w} DESBLOQUEADA', adUnavailable: 'Nenhum anúncio disponível agora. Tente mais tarde.', adLoading: 'CARREGANDO ANÚNCIO…', offerTitle: 'OFERTA DE ARMA', offerText: 'Leve-a para esta missão agora ou desbloqueie-a para sempre com Pontos de Combate.', outTitle: 'SEM VIDAS', outText: 'Reviva onde caiu ou reinicie a missão do começo.', revive: 'REVIVER', restartMission: 'REINICIAR', playNow: 'JOGAR', price: 'PREÇO', range: 'ALCANCE', rpm: 'DPM', magazine: 'PENTE', earnHint: 'Ganhe CP com missões, tiros na cabeça e abates múltiplos.', getAmmo: 'MUNIÇÃO', ammoRefilled: 'MUNIÇÃO RECARREGADA', outOfAmmoHint: 'SEM MUNIÇÃO — PEGAR ▶', tryWeapon: 'EXPERIMENTE ESTA ARMA',
    dmg: 'DANO', rof: 'CAD.', acc: 'PREC.', mob: 'MOB.', intelMode: 'MODO', intelTeams: 'ESQUADRÕES', intelTime: 'TEMPO',
    victory: 'VITÓRIA', defeat: 'DERROTA', missionComplete: 'MISSÃO CUMPRIDA', missionFailed: 'MISSÃO FALHOU', newBest: 'NOVO RECORDE PESSOAL', next: 'Próxima missão', retry: 'Tentar de novo', menu: 'Menu',
    kills: 'ABATES', deaths: 'MORTES', accuracy: 'PRECISÃO', headshots: 'NA CABEÇA', time: 'TEMPO',
    unlocked: 'NOVA OPERAÇÃO LIBERADA', campaignComplete: 'CAMPANHA CONCLUÍDA', campaignText: 'Você saiu do Nível 0. Todas as operações foram concluídas e qualquer missão pode ser jogada de novo. Encarar a subida outra vez?', startOver: 'Recomeçar', keepPlaying: 'Continuar jogando',
    confirmReset: 'Reiniciar a campanha? O progresso e os recordes serão apagados. As configurações são mantidas.', yes: 'Sim, reiniciar', cancel: 'Cancelar', paused: 'PAUSADO',
    sens: 'Sensibilidade', invert: 'Inverter eixo Y', fov: 'Campo de visão', quality: 'Qualidade gráfica', volume: 'Volume geral', music: 'Volume ambiente', language: 'Idioma', showFps: 'Mostrar FPS', touchSize: 'Tamanho dos botões', aimAssist: 'Assistência de mira', autoFire: 'Disparo automático (toque)', resetCampaign: 'Reiniciar campanha', auto: 'AUTO', low: 'BAIXA', med: 'MÉDIA', high: 'ALTA',
    ctlDesktop: 'TECLADO E MOUSE', ctlTouch: 'TOQUE', ctlPad: 'CONTROLE', move: 'Mover', look: 'Olhar', fire: 'Atirar', aim: 'Mirar', reload: 'Recarregar', jump: 'Pular', crouch: 'Agachar', sprint: 'Correr', swap: 'Trocar arma', interact: 'Interagir / segurar', pauseK: 'Pausar',
    leftStick: 'Analógico esquerdo', rightStick: 'Analógico direito', dragRight: 'Arraste à direita', joystick: 'Joystick esquerdo (na borda = correr)',
    eliminated: 'ELIMINADO', headshot: 'NA CABEÇA', youDied: 'ABATIDO', killedBy: 'ABATIDO POR {n}', respawnIn: 'RETORNO EM {s}', outOfLives: 'SEM VIDAS', spectating: 'ASSISTINDO {n}', youAreOut: 'VOCÊ ESTÁ FORA — SEU ESQUADRÃO CONTINUA',
    reloading: 'RECARREGANDO', noAmmo: 'SEM MUNIÇÃO', lives: 'VIDAS {n}', you: 'VOCÊ', pressHold: 'SEGURE', pickUp: 'PEGAR', useExit: 'EXTRAIR', pressButton: 'SOBRESCREVER', insertion: 'INSERÇÃO', go: 'VAI', fpsWord: 'FPS',
    o_ext: 'ELIMINE HOSTIS — <b>{k}</b> / {t}', o_tdm: 'PRIMEIRA EQUIPE A <b>{t}</b> ABATES', o_key: 'RECUPERE CARTÕES — <b>{k}</b> / 3', o_exit: 'CARTÕES OK — <b>VÁ ATÉ O ELEVADOR</b>', o_duel: 'PRIMEIRO A <b>{t}</b> — DERRUBE O MIMIC',
    o_surv: 'ESQUADRÕES RESTANTES — <b>{n}</b>', o_brief: '<b>{h}</b> ESTÁ COM A MALETA — RECUPERE', o_briefNone: 'PEGUE A MALETA', o_briefYou: '<b>VOCÊ ESTÁ COM A MALETA</b> — SEGURE ATÉ O TEMPO ACABAR', o_siege: 'SOBRESCREVA OS DOIS INTERRUPTORES INIMIGOS — <b>{a}</b> / 2',
    b_key: 'CARTÃO RECUPERADO', b_exit: 'SAÍDA LIBERADA', b_button: 'INTERRUPTOR SOBRESCRITO', b_lost: 'INTERRUPTOR PERDIDO', b_case: 'MALETA GARANTIDA', b_caseLost: 'MALETA PERDIDA', b_lights: 'QUEDA DE ENERGIA', b_squadOut: 'ESQUADRÃO ELIMINADO', b_lead: 'NA LIDERANÇA', b_hunt: 'ELES PODEM TE OUVIR',
    r_time: 'TEMPO ESGOTADO', r_dead: 'SEU ESQUADRÃO FOI ELIMINADO', r_win: 'OPERAÇÃO BEM-SUCEDIDA', r_score: 'META NÃO ATINGIDA', r_enemyWin: 'O INIMIGO VENCEU A RODADA', r_case: 'ÚLTIMO DE PÉ COM A MALETA', r_extract: 'EXTRAÍDO DO NÍVEL 0', r_siegeLost: 'SOBRESCREVERAM SEUS INTERRUPTORES', o_wave: 'ONDA <b>{w}</b> / {t} — RESTAM {n} HOSTIS', o_waveBreak: 'PRÓXIMA ONDA EM <b>{s}</b>', b_wave: 'ONDA {w}', b_waveClear: 'ONDA SUPERADA', o_ghost: 'ELIMINE OS OFICIAIS — <b>{k}</b> / 3', b_alarm: 'ALARME DISPARADO', b_alarmSub: 'REFORÇOS A CAMINHO', b_officer: 'OFICIAL ABATIDO', o_hp: 'SEGURE A ZONA — PRIMEIRO A <b>{t}</b>', o_hpContest: '<b>ZONA DISPUTADA</b>', b_hpMove: 'A ZONA MUDOU', o_boss: 'CACE O MIMIC', o_bossExit: 'O MIMIC CAIU — <b>VÁ ATÉ O ELEVADOR</b>', b_boss: 'O MIMIC CAIU', r_waves: 'TODAS AS ONDAS SUPERADAS', r_ghost: 'OFICIAIS ELIMINADOS', r_boss: 'O MIMIC MORREU — EXTRAÍDO',
    tips: ['DICA: Tiros na cabeça causam muito mais dano.', 'DICA: Agachar reduz a dispersão.', 'DICA: Os hostis ouvem tiros.', 'DICA: Divisas azuis marcam seu esquadrão.', 'DICA: Os cartões apitam mais alto quando você se aproxima.', 'DICA: A vida regenera fora de combate.'],
  },
  fr: {
    libs: 'CHARGEMENT DU MOTEUR', nav: 'CARTOGRAPHIE DES ZONES PRATICABLES', assets: 'CHARGEMENT DES RESSOURCES', building: 'CONSTRUCTION DU NIVEAU 0', ready: 'PRÊT', enter: 'ENTRER',
    tagline: 'NIVEAU 0 // OPÉRATIONS TACTIQUES', play: 'Campagne', settings: 'Options', controls: 'Commandes', resume: 'Reprendre', restart: 'Recommencer', abort: 'Abandonner', back: 'Retour',
    rank: 'GRADE', totalScore: 'SCORE DE CAMPAGNE', ofMissions: '{a}/{b} MISSIONS',
    selectMission: 'Choisir une opération', operations: 'OPÉRATIONS', locked: 'VERROUILLÉE', lockedHint: 'TERMINEZ L’OP {n} POUR DÉBLOQUER', best: 'RECORD', newOp: 'NOUVEAU',
    briefing: 'BRIEFING DE MISSION', objectives: 'OBJECTIFS', loadout: 'ÉQUIPEMENT', primary: 'PRINCIPALE', secondary: 'SECONDAIRE', deploy: 'Déployer', cp: 'PC', cpBalance: 'POINTS DE COMBAT', cpEarned: '+{n} PC', buyFor: 'ACHETER · {n} PC', watchAd: 'VOIR UNE PUB', thisMission: 'CETTE MISSION', noThanks: 'NON MERCI', none: 'AUCUNE', sidearmOnly: 'PISTOLET SEUL', notEnough: 'PC INSUFFISANTS', confirmBuy: 'Débloquer {w} définitivement pour {n} PC ?', bought: '{w} DÉBLOQUÉE', adUnavailable: 'Aucune pub disponible pour le moment. Réessayez plus tard.', adLoading: 'CHARGEMENT DE LA PUB…', offerTitle: 'OFFRE D’ARME', offerText: 'Emportez-la dans cette mission maintenant, ou débloquez-la pour de bon avec des Points de Combat.', outTitle: 'PLUS DE VIES', outText: 'Ressuscitez là où vous êtes tombé, ou recommencez la mission depuis le début.', revive: 'RESSUSCITER', restartMission: 'RECOMMENCER', playNow: 'JOUER', price: 'PRIX', range: 'PORTÉE', rpm: 'CPM', magazine: 'CHARGEUR', earnHint: 'Gagnez des PC avec les missions, les tirs à la tête et les éliminations multiples.', getAmmo: 'MUNITIONS', ammoRefilled: 'MUNITIONS RECHARGÉES', outOfAmmoHint: 'PLUS DE MUNITIONS — RECHARGER ▶', tryWeapon: 'ESSAYEZ CETTE ARME',
    dmg: 'DÉG.', rof: 'CAD.', acc: 'PRÉC.', mob: 'MOB.', intelMode: 'MODE', intelTeams: 'ESCOUADES', intelTime: 'TEMPS',
    victory: 'VICTOIRE', defeat: 'DÉFAITE', missionComplete: 'MISSION ACCOMPLIE', missionFailed: 'MISSION ÉCHOUÉE', newBest: 'NOUVEAU RECORD PERSONNEL', next: 'Mission suivante', retry: 'Réessayer', menu: 'Menu',
    kills: 'ÉLIMINATIONS', deaths: 'MORTS', accuracy: 'PRÉCISION', headshots: 'TIRS À LA TÊTE', time: 'TEMPS',
    unlocked: 'NOUVELLE OPÉRATION DÉBLOQUÉE', campaignComplete: 'CAMPAGNE TERMINÉE', campaignText: 'Vous êtes sorti du Niveau 0. Toutes les opérations sont terminées et chaque mission peut être rejouée. Repartir de zéro ?', startOver: 'Recommencer', keepPlaying: 'Continuer',
    confirmReset: 'Réinitialiser la campagne ? La progression et les records seront effacés. Les options sont conservées.', yes: 'Oui, réinitialiser', cancel: 'Annuler', paused: 'PAUSE',
    sens: 'Sensibilité', invert: 'Inverser l’axe Y', fov: 'Champ de vision', quality: 'Qualité graphique', volume: 'Volume général', music: 'Volume ambiance', language: 'Langue', showFps: 'Afficher les FPS', touchSize: 'Taille des boutons', aimAssist: 'Aide à la visée', autoFire: 'Tir automatique (tactile)', resetCampaign: 'Réinitialiser la campagne', auto: 'AUTO', low: 'BAS', med: 'MOY', high: 'HAUT',
    ctlDesktop: 'CLAVIER ET SOURIS', ctlTouch: 'TACTILE', ctlPad: 'MANETTE', move: 'Se déplacer', look: 'Regarder', fire: 'Tirer', aim: 'Viser', reload: 'Recharger', jump: 'Sauter', crouch: 'S’accroupir', sprint: 'Sprinter', swap: 'Changer d’arme', interact: 'Interagir / maintenir', pauseK: 'Pause',
    leftStick: 'Stick gauche', rightStick: 'Stick droit', dragRight: 'Glisser à droite', joystick: 'Joystick gauche (au bord = sprint)',
    eliminated: 'ÉLIMINÉ', headshot: 'TIR À LA TÊTE', youDied: 'TOMBÉ', killedBy: 'ÉLIMINÉ PAR {n}', respawnIn: 'RETOUR DANS {s}', outOfLives: 'PLUS DE VIES', spectating: 'SPECTATEUR : {n}', youAreOut: 'VOUS ÊTES HORS JEU — VOTRE ESCOUADE CONTINUE',
    reloading: 'RECHARGEMENT', noAmmo: 'PLUS DE MUNITIONS', lives: 'VIES {n}', you: 'VOUS', pressHold: 'MAINTENIR', pickUp: 'RAMASSER', useExit: 'EXTRAIRE', pressButton: 'FORCER', insertion: 'INSERTION', go: 'GO', fpsWord: 'FPS',
    o_ext: 'ÉLIMINEZ LES HOSTILES — <b>{k}</b> / {t}', o_tdm: 'PREMIÈRE ÉQUIPE À <b>{t}</b> ÉLIMINATIONS', o_key: 'RÉCUPÉREZ LES CARTES — <b>{k}</b> / 3', o_exit: 'CARTES OK — <b>REJOIGNEZ L’ASCENSEUR</b>', o_duel: 'PREMIER À <b>{t}</b> — ABATTEZ LE MIMIC',
    o_surv: 'ESCOUADES RESTANTES — <b>{n}</b>', o_brief: '<b>{h}</b> A LA MALLETTE — REPRENEZ-LA', o_briefNone: 'PRENEZ LA MALLETTE', o_briefYou: '<b>VOUS AVEZ LA MALLETTE</b> — GARDEZ-LA JUSQU’À LA FIN DU TEMPS', o_siege: 'FORCEZ LES DEUX INTERRUPTEURS ENNEMIS — <b>{a}</b> / 2',
    b_key: 'CARTE RÉCUPÉRÉE', b_exit: 'SORTIE DÉVERROUILLÉE', b_button: 'INTERRUPTEUR FORCÉ', b_lost: 'INTERRUPTEUR PERDU', b_case: 'MALLETTE SÉCURISÉE', b_caseLost: 'MALLETTE PERDUE', b_lights: 'PANNE DE COURANT', b_squadOut: 'ESCOUADE ÉLIMINÉE', b_lead: 'VOUS MENEZ', b_hunt: 'ILS VOUS ENTENDENT',
    r_time: 'TEMPS ÉCOULÉ', r_dead: 'VOTRE ESCOUADE A ÉTÉ ANÉANTIE', r_win: 'OPÉRATION RÉUSSIE', r_score: 'OBJECTIF NON ATTEINT', r_enemyWin: 'L’ENNEMI A GAGNÉ LA MANCHE', r_case: 'DERNIER DEBOUT AVEC LA MALLETTE', r_extract: 'EXTRAIT DU NIVEAU 0', r_siegeLost: 'ILS ONT FORCÉ VOS INTERRUPTEURS', o_wave: 'VAGUE <b>{w}</b> / {t} — {n} HOSTILES RESTANTS', o_waveBreak: 'PROCHAINE VAGUE DANS <b>{s}</b>', b_wave: 'VAGUE {w}', b_waveClear: 'VAGUE REPOUSSÉE', o_ghost: 'ÉLIMINEZ LES OFFICIERS — <b>{k}</b> / 3', b_alarm: 'ALERTE DÉCLENCHÉE', b_alarmSub: 'RENFORTS EN APPROCHE', b_officer: 'OFFICIER ÉLIMINÉ', o_hp: 'TENEZ LA ZONE — PREMIER À <b>{t}</b>', o_hpContest: '<b>ZONE CONTESTÉE</b>', b_hpMove: 'LA ZONE S’EST DÉPLACÉE', o_boss: 'TRAQUEZ LE MIMIC', o_bossExit: 'LE MIMIC EST TOMBÉ — <b>REJOIGNEZ L’ASCENSEUR</b>', b_boss: 'LE MIMIC EST TOMBÉ', r_waves: 'TOUTES LES VAGUES REPOUSSÉES', r_ghost: 'OFFICIERS ÉLIMINÉS', r_boss: 'LE MIMIC EST MORT — EXTRAIT',
    tips: ['ASTUCE : Les tirs à la tête infligent beaucoup plus de dégâts.', 'ASTUCE : S’accroupir réduit la dispersion.', 'ASTUCE : Les hostiles entendent les tirs.', 'ASTUCE : Les chevrons bleus marquent votre escouade.', 'ASTUCE : Les cartes bipent plus fort quand vous approchez.', 'ASTUCE : La santé se régénère hors combat.'],
  },
};
const MTEXT = {
  en: {
    m1: ['OPERATION: LAST LIGHT', 'EXTERMINATION · TIME TRIAL', 'Hostile operators have flooded the yellow halls. Clear them out before the lights die.', ['Eliminate as many hostiles as possible in 3:00', 'Reach 15 eliminations to clear the operation', '★ 15 · ★★ 25 · ★★★ 35 eliminations']],
    m2: ['OPERATION: YELLOW HALLS', 'TEAM DEATHMATCH · 3V3', 'Two fireteams, one endless office. Your squad wears blue. Everything else is hostile.', ['Fight alongside 2 blue squadmates', 'First team to 20 eliminations wins', 'Fallen operators redeploy after a short delay']],
    m3: ['OPERATION: KEYMASTER', 'KEYCARD EXTRACTION', 'Three access keycards are hidden somewhere in Level 0. Find them and get to the lift before the patrols find you.', ['Search the halls for 3 hidden keycards', 'Keycards beep louder as you get closer', 'With all 3 secured, reach the marked lift to extract']],
    m4: ['DUEL: THE MIMIC', 'DUEL · 1V1', 'Something in black has been copying our operators. It is fast, armoured and it learns. Put it down 15 times.', ['First to 15 eliminations wins', 'The Mimic is armoured, regenerates and fights from cover', 'Headshots are your best weapon']],
    m5: ['OPERATION: NO SECOND CHANCES', 'SQUADS SURVIVAL · TEAMS OF 2', 'Three duos enter. One leaves. Everyone gets exactly one life.', ['You and 1 squadmate face 2 rival duos', 'Every operator has one life. Fall and you are out', 'Be the last squad standing']],
    m6: ['OPERATION: BLACK CASE', 'CAPTURE THE BRIEFCASE · TIME TRIAL', 'A briefcase full of something nobody should have. Six operators, no friends, and everyone keeps coming back.', ['Free-for-all: every other operator is hostile. Fallen operators redeploy', 'Grab the briefcase. The holder is visible to everyone and gets hunted', 'Whoever holds the case when 4:00 runs out wins']],
    m7: ['OPERATION: OVERRIDE', 'SIEGE · 6V6 · TIME TRIAL', 'Two switches guard each end of the enemy zone. Override both before they override yours.', ['Lead a squad of 6 against 6 hostiles', 'Hold Interact on both enemy switches (east wing, both ends)', 'Defend your own switches in the west wing. 5:00 on the clock']],
    holdout: ['OPERATION: HOLDOUT', 'WAVES · SURVIVAL', 'The halls are filling up. Squad after squad is coming for the central hall. Hold the line until the last wave breaks.', ['Survive 5 waves of growing hostile squads', 'Each wave must be fully eliminated before the next one arrives', 'You have 3 lives']],
    ghost: ['OPERATION: GHOST PROTOCOL', 'STEALTH · ASSASSINATION', 'Three officers run the patrols in the east wing. Get in, take them out and stay unseen. Crouch to move silently.', ['Eliminate the 3 marked officers', 'Patrols see what is in front of them and hear footsteps and gunfire nearby. Crouching is silent', 'If they spot you, an alarm calls in reinforcements. You have 3 lives']],
    hardpoint: ['OPERATION: HARDPOINT', 'HARDPOINT · 4V4', 'One zone matters, and it keeps moving. Take it, hold it, and move with it.', ['Stand inside the hardpoint to score while no enemy is in it', 'The hardpoint moves every 60 seconds', 'First team to 150 points wins']],
    zerohour: ['FINALE: ZERO HOUR', 'BOSS ASSAULT · FINALE', 'The Mimic is back, stronger, with hunters at its side. End it, then walk out of Level 0 for good.', ['Hunt down and kill the Mimic. It is heavily armoured', 'Hunters guard it and hear everything you do', 'With the Mimic down, reach the lift. You have 3 lives']],
    m8: ['OPERATION: LIGHTS OUT', 'KEYCARD EXTRACTION II', 'The power is failing. Hunters stalk the dark, and the keycards are buried deeper than ever. Get out of Level 0.', ['Find 3 keycards hidden in the darkest corners', 'Hunters track noise. Gunfire draws them in', 'You have 3 lives. Reach the lift to escape']],
  },
  es: {
    m1: ['OPERACIÓN: ÚLTIMA LUZ', 'EXTERMINIO · CONTRARRELOJ', 'Operadores hostiles invadieron los pasillos amarillos. Límpialos antes de que mueran las luces.', ['Elimina a todos los hostiles que puedas en 3:00', 'Llega a 15 bajas para superar la operación', '★ 15 · ★★ 25 · ★★★ 35 bajas']],
    m2: ['OPERACIÓN: PASILLOS AMARILLOS', 'DUELO POR EQUIPOS · 3V3', 'Dos escuadras, una oficina infinita. Tu equipo viste de azul. Todos los demás son hostiles.', ['Lucha junto a 2 compañeros azules', 'Gana el primer equipo en llegar a 20 bajas', 'Los caídos reaparecen tras unos segundos']],
    m3: ['OPERACIÓN: LLAVERO', 'EXTRACCIÓN CON TARJETAS', 'Hay tres tarjetas de acceso escondidas en el Nivel 0. Encuéntralas y llega al ascensor antes de que te encuentren las patrullas.', ['Busca 3 tarjetas escondidas', 'Las tarjetas pitan más fuerte al acercarte', 'Con las 3, llega al ascensor marcado']],
    m4: ['DUELO: EL MIMIC', 'DUELO · 1V1', 'Algo vestido de negro ha estado copiando a nuestros operadores. Es rápido, blindado y aprende. Derríbalo 15 veces.', ['Gana el primero en llegar a 15 bajas', 'El Mimic va blindado, se regenera y se cubre', 'Apunta a la cabeza']],
    m5: ['OPERACIÓN: SIN SEGUNDAS OPORTUNIDADES', 'SUPERVIVENCIA · EQUIPOS DE 2', 'Entran tres dúos. Sale uno. Cada uno tiene una sola vida.', ['Tú y 1 compañero contra 2 dúos rivales', 'Una sola vida. Si caes, quedas fuera', 'Sé el último equipo en pie']],
    m6: ['OPERACIÓN: MALETÍN NEGRO', 'CAPTURA EL MALETÍN · CONTRARRELOJ', 'Un maletín que nadie debería tener. Seis operadores, ningún amigo, y todos vuelven a la carga.', ['Todos contra todos. Los caídos reaparecen', 'Coge el maletín. Todos ven y persiguen a quien lo lleva', 'Gana quien tenga el maletín cuando acaben los 4:00']],
    m7: ['OPERACIÓN: ANULACIÓN', 'ASEDIO · 6V6 · CONTRARRELOJ', 'Dos interruptores protegen cada extremo de la zona enemiga. Anúlalos antes que ellos los tuyos.', ['Lidera un equipo de 6 contra 6', 'Mantén Interactuar en ambos interruptores enemigos (ala este)', 'Defiende los tuyos en el ala oeste. 5:00 de reloj']],
    holdout: ['OPERACIÓN: RESISTENCIA', 'OLEADAS · SUPERVIVENCIA', 'Los pasillos se llenan. Escuadra tras escuadra viene a por la sala central. Resiste hasta que caiga la última oleada.', ['Sobrevive a 5 oleadas cada vez más grandes', 'Cada oleada debe ser eliminada antes de que llegue la siguiente', 'Tienes 3 vidas']],
    ghost: ['OPERACIÓN: PROTOCOLO FANTASMA', 'SIGILO · ASESINATO', 'Tres oficiales dirigen las patrullas del ala este. Entra, elimínalos y que no te vean. Agáchate para moverte en silencio.', ['Elimina a los 3 oficiales marcados', 'Las patrullas ven lo que tienen delante y oyen pasos y disparos cercanos. Agachado no haces ruido', 'Si te ven, una alarma trae refuerzos. Tienes 3 vidas']],
    hardpoint: ['OPERACIÓN: PUNTO CALIENTE', 'PUNTO CALIENTE · 4V4', 'Solo importa una zona, y no deja de moverse. Tómala, mantenla y síguela.', ['Quédate en la zona para puntuar mientras no haya enemigos dentro', 'La zona se mueve cada 60 segundos', 'Gana el primer equipo en llegar a 150 puntos']],
    zerohour: ['FINAL: HORA CERO', 'ASALTO AL JEFE · FINAL', 'El Mimic ha vuelto, más fuerte y con cazadores a su lado. Acaba con él y sal del Nivel 0 para siempre.', ['Caza y abate al Mimic. Va muy blindado', 'Los cazadores lo protegen y oyen todo lo que haces', 'Con el Mimic abatido, llega al ascensor. Tienes 3 vidas']],
    m8: ['OPERACIÓN: APAGÓN', 'EXTRACCIÓN II', 'La energía falla. Los cazadores acechan en la oscuridad y las tarjetas están mejor escondidas que nunca. Sal del Nivel 0.', ['Encuentra 3 tarjetas en los rincones más oscuros', 'Los cazadores siguen el ruido de los disparos', 'Tienes 3 vidas. Llega al ascensor para escapar']],
  },
  pt: {
    m1: ['OPERAÇÃO: ÚLTIMA LUZ', 'EXTERMÍNIO · CONTRA O TEMPO', 'Operadores hostis invadiram os corredores amarelos. Elimine todos antes que as luzes morram.', ['Elimine o máximo de hostis em 3:00', 'Chegue a 15 abates para concluir', '★ 15 · ★★ 25 · ★★★ 35 abates']],
    m2: ['OPERAÇÃO: CORREDORES AMARELOS', 'MATA-MATA EM EQUIPE · 3V3', 'Duas equipes, um escritório sem fim. Seu esquadrão veste azul. O resto é hostil.', ['Lute ao lado de 2 aliados azuis', 'A primeira equipe a 20 abates vence', 'Abatidos retornam após alguns segundos']],
    m3: ['OPERAÇÃO: CHAVEIRO', 'EXTRAÇÃO COM CARTÕES', 'Três cartões de acesso estão escondidos no Nível 0. Encontre-os e chegue ao elevador antes que as patrulhas encontrem você.', ['Procure 3 cartões escondidos', 'Os cartões apitam mais alto quando você se aproxima', 'Com os 3, vá até o elevador marcado']],
    m4: ['DUELO: O MIMIC', 'DUELO · 1V1', 'Algo de preto anda copiando nossos operadores. É rápido, blindado e aprende. Derrube-o 15 vezes.', ['O primeiro a 15 abates vence', 'O Mimic é blindado, se regenera e usa cobertura', 'Mire na cabeça']],
    m5: ['OPERAÇÃO: SEM SEGUNDA CHANCE', 'SOBREVIVÊNCIA · DUPLAS', 'Três duplas entram. Uma sai. Cada um tem uma única vida.', ['Você e 1 aliado contra 2 duplas rivais', 'Uma vida só. Caiu, está fora', 'Seja o último esquadrão de pé']],
    m6: ['OPERAÇÃO: MALETA NEGRA', 'CAPTURE A MALETA · CONTRA O TEMPO', 'Uma maleta que ninguém deveria ter. Seis operadores, nenhum amigo, e todos sempre voltam.', ['Todos contra todos. Abatidos retornam', 'Pegue a maleta. Todos veem e caçam quem está com ela', 'Vence quem estiver com a maleta quando os 4:00 acabarem']],
    m7: ['OPERAÇÃO: SOBRESCRITA', 'CERCO · 6V6 · CONTRA O TEMPO', 'Dois interruptores guardam cada ponta da zona inimiga. Sobrescreva os dois antes que façam o mesmo com os seus.', ['Lidere 6 contra 6', 'Segure Interagir nos dois interruptores inimigos (ala leste)', 'Defenda os seus na ala oeste. 5:00 no relógio']],
    holdout: ['OPERAÇÃO: RESISTÊNCIA', 'ONDAS · SOBREVIVÊNCIA', 'Os corredores estão enchendo. Esquadrão após esquadrão vem para o salão central. Segure até a última onda cair.', ['Sobreviva a 5 ondas cada vez maiores', 'Cada onda precisa ser eliminada antes da próxima chegar', 'Você tem 3 vidas']],
    ghost: ['OPERAÇÃO: PROTOCOLO FANTASMA', 'FURTIVIDADE · ASSASSINATO', 'Três oficiais comandam as patrulhas da ala leste. Entre, elimine-os e não seja visto. Agache para se mover em silêncio.', ['Elimine os 3 oficiais marcados', 'As patrulhas veem o que está à frente e ouvem passos e tiros por perto. Agachado você não faz barulho', 'Se te virem, um alarme chama reforços. Você tem 3 vidas']],
    hardpoint: ['OPERAÇÃO: PONTO QUENTE', 'PONTO QUENTE · 4V4', 'Só uma zona importa, e ela não para de mudar. Tome, segure e acompanhe.', ['Fique dentro da zona para pontuar enquanto não houver inimigos nela', 'A zona muda a cada 60 segundos', 'A primeira equipe a 150 pontos vence']],
    zerohour: ['FINAL: HORA ZERO', 'ATAQUE AO CHEFE · FINAL', 'O Mimic voltou, mais forte e com caçadores ao lado. Acabe com ele e saia do Nível 0 de vez.', ['Cace e derrube o Mimic. Ele é muito blindado', 'Caçadores o protegem e ouvem tudo o que você faz', 'Com o Mimic abatido, vá até o elevador. Você tem 3 vidas']],
    m8: ['OPERAÇÃO: APAGÃO', 'EXTRAÇÃO II', 'A energia está falhando. Caçadores rondam no escuro, e os cartões estão mais escondidos do que nunca. Saia do Nível 0.', ['Encontre 3 cartões nos cantos mais escuros', 'Caçadores seguem o barulho dos tiros', 'Você tem 3 vidas. Chegue ao elevador']],
  },
  fr: {
    m1: ['OPÉRATION : DERNIÈRE LUEUR', 'EXTERMINATION · CONTRE-LA-MONTRE', 'Des opérateurs hostiles ont envahi les couloirs jaunes. Nettoyez-les avant que les néons ne meurent.', ['Éliminez un maximum d’hostiles en 3:00', 'Atteignez 15 éliminations pour réussir', '★ 15 · ★★ 25 · ★★★ 35 éliminations']],
    m2: ['OPÉRATION : COULOIRS JAUNES', 'MATCH À MORT PAR ÉQUIPE · 3C3', 'Deux escouades, un bureau sans fin. Votre équipe est en bleu. Tout le reste est hostile.', ['Combattez avec 2 coéquipiers bleus', 'Première équipe à 20 éliminations', 'Les opérateurs tombés reviennent rapidement']],
    m3: ['OPÉRATION : PASSE-PARTOUT', 'EXTRACTION PAR CARTES', 'Trois cartes d’accès sont cachées dans le Niveau 0. Trouvez-les et rejoignez l’ascenseur avant que les patrouilles ne vous trouvent.', ['Trouvez 3 cartes cachées', 'Les cartes bipent plus fort quand vous approchez', 'Avec les 3, rejoignez l’ascenseur indiqué']],
    m4: ['DUEL : LE MIMIC', 'DUEL · 1C1', 'Une silhouette noire copie nos opérateurs. Elle est rapide, blindée et elle apprend. Abattez-la 15 fois.', ['Premier à 15 éliminations', 'Le Mimic est blindé, se régénère et se met à couvert', 'Visez la tête']],
    m5: ['OPÉRATION : SANS SECONDE CHANCE', 'SURVIE · ÉQUIPES DE 2', 'Trois duos entrent. Un seul ressort. Chacun n’a qu’une vie.', ['Vous et 1 coéquipier contre 2 duos rivaux', 'Une seule vie : si vous tombez, vous êtes éliminé', 'Soyez la dernière escouade debout']],
    m6: ['OPÉRATION : MALLETTE NOIRE', 'CAPTURE DE MALLETTE · CONTRE-LA-MONTRE', 'Une mallette que personne ne devrait avoir. Six opérateurs, aucun ami, et tout le monde revient.', ['Chacun pour soi. Les opérateurs tombés reviennent', 'Prenez la mallette : son porteur est visible et traqué par tous', 'Celui qui tient la mallette à la fin des 4:00 gagne']],
    m7: ['OPÉRATION : PRIORITÉ', 'SIÈGE · 6C6 · CONTRE-LA-MONTRE', 'Deux interrupteurs gardent chaque extrémité de la zone ennemie. Forcez-les avant qu’ils ne forcent les vôtres.', ['Menez 6 opérateurs contre 6', 'Maintenez Interagir sur les deux interrupteurs ennemis (aile est)', 'Défendez les vôtres dans l’aile ouest. 5:00 au chrono']],
    holdout: ['OPÉRATION : TENIR BON', 'VAGUES · SURVIE', 'Les couloirs se remplissent. Escouade après escouade fonce vers le hall central. Tenez jusqu’à la dernière vague.', ['Survivez à 5 vagues de plus en plus nombreuses', 'Chaque vague doit être éliminée avant que la suivante n’arrive', 'Vous avez 3 vies']],
    ghost: ['OPÉRATION : PROTOCOLE FANTÔME', 'INFILTRATION · ASSASSINAT', 'Trois officiers dirigent les patrouilles de l’aile est. Entrez, éliminez-les et restez invisible. Accroupissez-vous pour avancer sans bruit.', ['Éliminez les 3 officiers marqués', 'Les patrouilles voient devant elles et entendent les pas et les tirs proches. Accroupi, vous êtes silencieux', 'Si elles vous repèrent, une alerte appelle des renforts. Vous avez 3 vies']],
    hardpoint: ['OPÉRATION : POINT CHAUD', 'POINT CHAUD · 4C4', 'Une seule zone compte, et elle bouge sans arrêt. Prenez-la, tenez-la, suivez-la.', ['Restez dans la zone pour marquer tant qu’aucun ennemi n’y est', 'La zone change toutes les 60 secondes', 'Première équipe à 150 points']],
    zerohour: ['FINALE : HEURE ZÉRO', 'ASSAUT DU BOSS · FINALE', 'Le Mimic est de retour, plus fort, avec des traqueurs à ses côtés. Achevez-le, puis quittez le Niveau 0 pour de bon.', ['Traquez et abattez le Mimic. Il est lourdement blindé', 'Des traqueurs le protègent et entendent tout ce que vous faites', 'Le Mimic abattu, rejoignez l’ascenseur. Vous avez 3 vies']],
    m8: ['OPÉRATION : EXTINCTION', 'EXTRACTION II', 'Le courant lâche. Des traqueurs rôdent dans le noir, et les cartes sont mieux cachées que jamais. Sortez du Niveau 0.', ['Trouvez 3 cartes dans les coins les plus sombres', 'Les traqueurs suivent le bruit des tirs', 'Vous avez 3 vies. Rejoignez l’ascenseur']],
  },
};
let LANG = 'en';
function t(key, vars) {
  let s = (STR[LANG] && STR[LANG][key]) ?? STR.en[key] ?? key;
  if (vars && typeof s === 'string') for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return s;
}
const mt = (m) => (MTEXT[LANG] && MTEXT[LANG][m.id]) || MTEXT.en[m.id];

const Platform = (() => {
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const KEY = 'backrooms.save';
  let SDK = null, ready = false, playing = false, adBusy = false, adCooldownUntil = 0;
  const call = (fn) => { if (ready) safe(fn); };
  const api = {
    id: 'crazygames',
    async init() {
      SDK = window.CrazyGames && window.CrazyGames.SDK;
      if (!SDK) return;
      try {
        await Promise.race([SDK.init(), wait(5000).then(() => { throw new Error('sdk timeout'); })]);
        ready = SDK.environment === 'crazygames' || SDK.environment === 'local';
      } catch (e) { ready = false; }
    },
    get sdkReady() { return ready; },
    firstFrameReady() {},
    loadingStart() { call(() => SDK.game.loadingStart()); },
    gameReady() { call(() => SDK.game.loadingStop()); },
    gameplayStart() { if (playing) return; playing = true; call(() => SDK.game.gameplayStart()); },
    gameplayStop() { if (!playing) return; playing = false; call(() => SDK.game.gameplayStop()); },
    happytime() { call(() => SDK.game.happytime()); },
    async getLanguage() {
      const loc = (ready && safe(() => SDK.user.systemInfo.locale, '')) || navigator.language || 'en';
      return String(loc).toLowerCase().slice(0, 2);
    },
    isAudioEnabled() { return !(ready && safe(() => SDK.game.settings.muteAudio, false)); },
    onAudioEnabledChange(cb) { call(() => SDK.game.addSettingsChangeListener((st) => cb(!(st && st.muteAudio)))); },
    onPause(cb) { document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); }); },
    onResume(cb) { document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); }); },
    async loadData() {
      if (ready) { const v = safe(() => SDK.data.getItem(KEY), null); if (v != null) return String(v); }
      return safe(() => localStorage.getItem(KEY) || '', '');
    },
    async saveData(str) {
      if (ready) safe(() => SDK.data.setItem(KEY, str));
      else safe(() => localStorage.setItem(KEY, str));
    },
    sendScore() {},
    logError() {},
    logWarning() {},
    ads: {
      canReward() { return ready && !adBusy && performance.now() > adCooldownUntil; },
      request(type) {
        if (!ready || adBusy) return Promise.resolve(false);
        adBusy = true;
        return new Promise((resolve) => {
          let started = false, done = false;
          const finish = (ok) => {
            if (done) return; done = true; adBusy = false;
            Ads.end();
            if (!ok && type === 'rewarded') adCooldownUntil = performance.now() + 120000;
            resolve(ok);
          };
          Ads.begin();
          const ok = safe(() => {
            SDK.ad.requestAd(type, {
              adStarted: () => { started = true; Ads.playing(); },
              adFinished: () => finish(true),
              adError: () => finish(false),
            });
            return true;
          }, false);
          if (!ok) finish(false);
          setTimeout(() => { if (!started) finish(false); }, 30000);
        });
      },
      midgame() { return this.request('midgame').then(() => undefined); },
      rewarded() { return this.request('rewarded'); },
    },
  };
  window.addEventListener('error', (e) => console.error('[backrooms]', e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('[backrooms]', e.reason));
  return api;
})();

const Ads = {
  begin() {
    Platform.gameplayStop();
    this.wasLoop = Loop.running; Loop.stop();
    const b = $('#adblock'); if (b) { b.textContent = t('adLoading'); b.classList.add('on'); }
  },
  playing() { Audio.setAdMuted(true); },
  end() {
    Audio.setAdMuted(false);
    const b = $('#adblock'); if (b) b.classList.remove('on');
    if (this.wasLoop || Game.state !== 'play') Loop.start();
  },
  toast(msg) {
    const tEl = $('#toast'); if (!tEl) return;
    tEl.textContent = msg; tEl.classList.remove('on'); void tEl.offsetWidth; tEl.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => tEl.classList.remove('on'), 2600);
  },
  async reward() {
    const ok = await Platform.ads.rewarded();
    if (!ok) this.toast(t('adUnavailable'));
    return ok;
  },
};

const DEFAULT_SETTINGS = { sens: 1, invert: false, fov: 80, quality: 'auto', volume: 0.8, music: 0.5, lang: 'auto', fps: false, touchScale: 1, aimAssist: true, autoFire: false };
const Save = {
  data: { v: 1, unlocked: 1, missions: {}, settings: { ...DEFAULT_SETTINGS }, loadout: { primary: 'none', secondary: 'pistol' }, xp: 0, completedOnce: false, sentScore: 0, cp: 0, owned: [], played: 0 },
  async load() {
    try {
      const raw = await Platform.loadData();
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 1) {
          this.data = { ...this.data, ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) }, loadout: { ...this.data.loadout, ...(d.loadout || {}) } };
        }
      }
    } catch (e) { Platform.logWarning(); }
    this.data.unlocked = clamp(this.data.unlocked | 0, 1, MISSIONS.length);
    if (!Array.isArray(this.data.owned)) this.data.owned = [];
    this.data.cp = Math.max(0, this.data.cp | 0);
  },
  _timer: 0,
  persist(now = false) {
    clearTimeout(this._timer);
    const go = () => Platform.saveData(JSON.stringify(this.data));
    if (now) return go();
    this._timer = setTimeout(go, 400);
  },
  get settings() { return this.data.settings; },
  totalScore() { return Object.values(this.data.missions).reduce((a, m) => a + (m.best || 0), 0); },
  clearedCount() { return Object.values(this.data.missions).filter((m) => m.cleared).length; },
  record(index, result) {
    const m = MISSIONS[index];
    const rec = this.data.missions[m.id] || { best: 0, stars: 0, cleared: false, plays: 0 };
    rec.plays++;
    const newBest = result.won && result.score > rec.best;
    if (result.won) { rec.cleared = true; rec.best = Math.max(rec.best, result.score); rec.stars = Math.max(rec.stars, result.stars); }
    this.data.missions[m.id] = rec;
    this.data.xp += Math.round(result.score * (result.won ? 1 : 0.35));
    let unlockedNext = false;
    if (result.won && index + 1 >= this.data.unlocked && index + 1 < MISSIONS.length) { this.data.unlocked = index + 2; unlockedNext = true; }
    const total = this.totalScore();
    if (total > (this.data.sentScore || 0)) { this.data.sentScore = total; Platform.sendScore(total); }
    this.persist(true);
    return { newBest, unlockedNext };
  },
  resetCampaign() {
    this.data.unlocked = 1; this.data.missions = {}; this.data.completedOnce = false; this.data.sentScore = 0;
    this.data.loadout = { primary: 'none', secondary: 'pistol' };
    this.persist(true);
  },
};

const Arsenal = {
  rented: new Set(), mission: -1,
  owns(id) { return id === 'pistol' || Save.data.owned.includes(id); },
  usable(id) { return id === 'none' || this.owns(id) || this.rented.has(id); },
  price(id) { return SHOP[id] || 0; },
  canBuy(id) { return !this.owns(id) && Save.data.cp >= this.price(id); },
  buy(id) {
    if (!this.canBuy(id)) return false;
    Save.data.cp -= this.price(id); Save.data.owned.push(id); Save.persist(true);
    return true;
  },
  rent(id, mission) { if (this.mission !== mission) this.rented.clear(); this.mission = mission; this.rented.add(id); },
  enter(mission) { if (this.mission !== mission) { this.rented.clear(); this.mission = mission; } },
  leave() { this.rented.clear(); this.mission = -1; },
  missing() { return Object.keys(SHOP).filter((id) => !this.owns(id)); },
};

const Audio = (() => {
  let ctx = null, master = null, sfx = null, amb = null, noiseBuf = null, humNodes = null;
  let platformOn = true, suspended = false, adMuted = false;
  const listener = { x: 0, z: 0, yaw: 0 };
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(master);
    sfx = ctx.createGain(); sfx.connect(comp);
    amb = ctx.createGain(); amb.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    return ctx;
  }
  function applyVolume() {
    if (!ctx) return;
    const on = platformOn && !suspended && !adMuted;
    master.gain.setTargetAtTime(on ? Save.settings.volume : 0, ctx.currentTime, 0.02);
    amb.gain.setTargetAtTime(Save.settings.music * 0.9, ctx.currentTime, 0.1);
  }
  function unlock() { const c = ensure(); if (c && c.state === 'suspended' && platformOn && !suspended) c.resume().catch(() => {}); startHum(); }
  function setPlatformEnabled(on) { platformOn = on; applyVolume(); if (!ctx) return; if (!on) ctx.suspend().catch(() => {}); else if (!suspended) ctx.resume().catch(() => {}); }
  function setAdMuted(m) { adMuted = m; applyVolume(); }
  function setSuspended(s) { suspended = s; applyVolume(); if (!ctx) return; if (s) ctx.suspend().catch(() => {}); else if (platformOn) ctx.resume().catch(() => {}); }
  const ok = () => ctx && platformOn && !suspended && ctx.state === 'running';

  function spatial(pos, maxDist = 60) {
    if (!pos) return [1, 0];
    const dx = pos.x - listener.x, dz = pos.z - listener.z;
    const d = Math.hypot(dx, dz);
    const g = clamp(1 / (1 + d * 0.14), 0, 1) * (d > maxDist ? 0 : 1);
    const ang = Math.atan2(dx, dz) - listener.yaw;
    const pan = clamp(-Math.sin(ang + Math.PI), -0.85, 0.85);
    return [g, pan];
  }
  function out(gainVal, pan) {
    const g = ctx.createGain(); g.gain.value = gainVal;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sfx); }
    else g.connect(sfx);
    return g;
  }
  function noise(dest, t0, dur, { type = 'lowpass', freq = 2000, q = 0.7, gain = 1, attack = 0.002, decay = dur, freqEnd } = {}) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = rand(0.9, 1.1);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0, rand(0, 1)); src.stop(t0 + dur + 0.05);
  }
  function tone(dest, t0, dur, { type = 'sine', freq = 440, freqEnd, gain = 0.5, attack = 0.004 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const SHOTS = {
    pistol:  { n: [3800, 0.13, 0.9], b: [140, 55, 0.12, 0.8], tail: [900, 0.25, 0.25] },
    ak:      { n: [2600, 0.16, 1.0], b: [110, 45, 0.16, 1.0], tail: [700, 0.35, 0.3] },
    m4:      { n: [3400, 0.12, 0.85], b: [130, 50, 0.12, 0.8], tail: [900, 0.28, 0.25] },
    shotgun: { n: [1800, 0.28, 1.2], b: [80, 35, 0.3, 1.2], tail: [500, 0.6, 0.45] },
    sniper:  { n: [2200, 0.25, 1.2], b: [70, 30, 0.35, 1.3], tail: [450, 1.1, 0.5] },
  };
  return {
    unlock, setPlatformEnabled, setSuspended, setAdMuted, applyVolume, listener,
    get ready() { return ok(); },
    shot(kind, pos, self = false) {
      if (!ok()) return;
      const [g, pan] = self ? [1, 0] : spatial(pos, 70);
      if (g < 0.02) return;
      const s = SHOTS[kind] || SHOTS.ak; const t0 = ctx.currentTime; const o = out(g * (self ? 0.9 : 0.75), pan);
      noise(o, t0, s.n[1], { type: 'bandpass', freq: s.n[0] * rand(0.92, 1.08), q: 0.6, gain: s.n[2], freqEnd: s.n[0] * 0.3 });
      tone(o, t0, s.b[2], { type: 'triangle', freq: s.b[0], freqEnd: s.b[1], gain: s.b[3] * 0.8 });
      noise(o, t0 + 0.01, s.tail[1], { type: 'lowpass', freq: s.tail[0], gain: s.tail[2] * (self ? 1 : 1.3), attack: 0.02 });
    },
    click() { if (!ok()) return; const o = out(0.5, 0); tone(o, ctx.currentTime, 0.05, { type: 'square', freq: 1800, freqEnd: 900, gain: 0.25 }); },
    reload(wid) {
      if (!ok()) return; const o = out(0.6, 0.15); const t0 = ctx.currentTime; const dur = WEAPONS[wid].reload;
      [0.08, dur * 0.45, dur * 0.82].forEach((tt, i) => { noise(o, t0 + tt, 0.06, { type: 'highpass', freq: 2500 + i * 400, gain: 0.5 }); tone(o, t0 + tt, 0.04, { type: 'square', freq: 600 + i * 220, gain: 0.08 }); });
    },
    hit(head) { if (!ok()) return; const o = out(0.55, 0); tone(o, ctx.currentTime, 0.06, { type: 'square', freq: head ? 2400 : 1500, gain: 0.18 }); },
    kill() { if (!ok()) return; const o = out(0.6, 0); const t0 = ctx.currentTime; tone(o, t0, 0.09, { type: 'triangle', freq: 880, gain: 0.35 }); tone(o, t0 + 0.08, 0.16, { type: 'triangle', freq: 1320, gain: 0.35 }); },
    hurt() { if (!ok()) return; const o = out(0.8, 0); const t0 = ctx.currentTime; tone(o, t0, 0.18, { type: 'sine', freq: 90, freqEnd: 50, gain: 0.8 }); noise(o, t0, 0.12, { type: 'lowpass', freq: 900, gain: 0.5 }); },
    step(pos, self, soft) {
      if (!ok()) return; const [g, pan] = self ? [0.55, 0] : spatial(pos, 22); if (g < 0.03) return;
      const o = out(g * (soft ? 0.5 : 1), pan); noise(o, ctx.currentTime, 0.09, { type: 'lowpass', freq: rand(320, 480), gain: 0.55, attack: 0.005 });
    },
    land() { if (!ok()) return; const o = out(0.7, 0); noise(o, ctx.currentTime, 0.14, { type: 'lowpass', freq: 300, gain: 0.8 }); },
    ui(kind = 'click') {
      if (!ok()) return; const o = out(0.4, 0); const t0 = ctx.currentTime;
      if (kind === 'hover') tone(o, t0, 0.03, { type: 'sine', freq: 2200, gain: 0.06 });
      else if (kind === 'deny') { tone(o, t0, 0.12, { type: 'square', freq: 160, gain: 0.18 }); tone(o, t0 + 0.12, 0.14, { type: 'square', freq: 120, gain: 0.18 }); }
      else tone(o, t0, 0.06, { type: 'triangle', freq: 1250, freqEnd: 800, gain: 0.28 });
    },
    pickup() { if (!ok()) return; const o = out(0.6, 0); const t0 = ctx.currentTime; [660, 880, 1320, 1760].forEach((f, i) => tone(o, t0 + i * 0.07, 0.14, { type: 'triangle', freq: f, gain: 0.3 })); },
    beep(intensity, pos) { if (!ok()) return; const [g, pan] = spatial(pos, 40); const o = out(clamp(0.15 + intensity, 0, 1) * Math.max(g, 0.25), pan); tone(o, ctx.currentTime, 0.07, { type: 'sine', freq: 1600 + intensity * 900, gain: 0.35 }); },
    alarm() { if (!ok()) return; const o = out(0.4, 0); const t0 = ctx.currentTime; for (let i = 0; i < 3; i++) { tone(o, t0 + i * 0.35, 0.3, { type: 'sawtooth', freq: 520, freqEnd: 760, gain: 0.12 }); } },
    countdown(go) { if (!ok()) return; const o = out(0.5, 0); tone(o, ctx.currentTime, go ? 0.4 : 0.12, { type: 'square', freq: go ? 1320 : 660, gain: 0.18 }); },
    sting(win) {
      if (!ok()) return; const o = out(0.6, 0); const t0 = ctx.currentTime;
      const notes = win ? [392, 523, 659, 784] : [392, 349, 311, 233];
      notes.forEach((f, i) => { tone(o, t0 + i * 0.16, 0.5, { type: 'triangle', freq: f, gain: 0.25 }); tone(o, t0 + i * 0.16, 0.5, { type: 'sine', freq: f / 2, gain: 0.2 }); });
    },
    whoosh() { if (!ok()) return; const o = out(0.4, 0); noise(o, ctx.currentTime, 0.45, { type: 'bandpass', freq: 400, freqEnd: 3200, q: 1.2, gain: 0.4, attack: 0.15 }); },
    flicker() { if (!ok()) return; const o = out(0.25, rand(-0.5, 0.5)); noise(o, ctx.currentTime, 0.12, { type: 'bandpass', freq: 3000, q: 4, gain: 0.25 }); },
  };
  function startHum() {
    if (!ctx || humNodes) return;
    const g = ctx.createGain(); g.gain.value = 0.05; g.connect(amb);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(g);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60; const g1 = ctx.createGain(); g1.gain.value = 0.35; o1.connect(g1); g1.connect(f);
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 120.4; const g2 = ctx.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(f);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 7000; nf.Q.value = 0.8; const ng = ctx.createGain(); ng.gain.value = 0.05; n.connect(nf); nf.connect(ng); ng.connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 0.15; lfo.connect(lg); lg.connect(g1.gain);
    [o1, o2, n, lfo].forEach((s) => s.start());
    humNodes = { g };
  }
})();

const Input = (() => {
  const keys = new Set();
  const st = {
    moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    fire: false, ads: false, sprint: false, crouch: false,
    pressed: new Set(),
    interactHeld: false, touch: false, gamepad: false, locked: false, enabled: false,
  };
  const press = (a) => st.pressed.add(a);
  let mouseDown = false, rmb = false, canvas = null, lockFailed = false;

  function onKey(e, down) {
    if (!st.enabled) return;
    const c = e.code;
    if (down && !e.repeat) {
      if (c === 'Space') press('jump');
      if (c === 'KeyR') press('reload');
      if (c === 'KeyQ') press('swap');
      if (c === 'KeyG') press('ammo');
      if (c === 'Digit1') press('slot1');
      if (c === 'Digit2') press('slot2');
      if (c === 'KeyE' || c === 'KeyF') press('interact');
      if (c === 'KeyP' || c === 'Escape') press('pause');
      if (c === 'KeyC' || c === 'ControlLeft') st.crouchToggle = !st.crouchToggle;
    }
    if (c === 'KeyE' || c === 'KeyF') st.interactHeld = down;
    if (c === 'ShiftLeft' || c === 'ShiftRight') st.sprintKey = down;
    if (down) keys.add(c); else keys.delete(c);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
  }
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; rmb = false; st.interactHeld = false; st.sprintKey = false; });

  let plc = null;
  function requestLock() {
    if (!canvas || st.touch || lockFailed) return;
    if (!plc && THREE.PointerLockControls) {
      plc = new THREE.PointerLockControls(World.camera, canvas); plc.pointerSpeed = 0;
      plc.addEventListener('unlock', () => { st.locked = false; });
    }
    try {
      const p = canvas.requestPointerLock && canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { lockFailed = true; });
    } catch (e) { lockFailed = true; }
  }
  document.addEventListener('pointerlockchange', () => {
    const was = st.locked;
    st.locked = document.pointerLockElement === canvas;
    if (was && !st.locked && st.enabled) press('pause');
  });
  document.addEventListener('pointerlockerror', () => { lockFailed = true; });

  function attach(c) {
    canvas = c;
    c.addEventListener('mousedown', (e) => {
      if (!st.enabled || st.touch) return;
      if (!st.locked && !lockFailed) requestLock();
      if (e.button === 0) mouseDown = true;
      if (e.button === 2) rmb = true;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; if (e.button === 2) rmb = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!st.enabled || st.touch) return;
      if (!st.locked && !lockFailed) return;
      const mx = e.movementX || 0, my = e.movementY || 0;
      if (Math.abs(mx) > 280 || Math.abs(my) > 280) return;
      st.lookX += mx; st.lookY += my;
    });
    c.addEventListener('wheel', () => { if (st.enabled) press('swap'); }, { passive: true });
  }

  const touchUI = { joyId: null, lookId: null, joyCx: 0, joyCy: 0, lookLx: 0, lookLy: 0, fireId: null, knob: null, joy: null, joyR: 60 };
  function buildTouch(root) {
    root.innerHTML = `
      <div class="joy-zone"></div><div class="look-zone"></div>
      <div class="joy"><div class="knob"></div></div>
      <div class="tbtn fire" data-a="fire">${ICONS.target.replace('class="ico"', '')}</div>
      <div class="tbtn fire fire2" data-a="fire">${ICONS.target.replace('class="ico"', '')}</div>
      <div class="tbtn ads" data-a="ads">${ICONS.scope}</div>
      <div class="tbtn jump" data-a="jump">${ICONS.jump}</div>
      <div class="tbtn crouch" data-a="crouch">${ICONS.crouch}</div>
      <div class="tbtn reload" data-a="reload">${ICONS.reload}</div>
      <div class="tbtn swap" data-a="swap">${ICONS.swap}</div>
      <div class="tbtn use" data-a="interact">${ICONS.hand}</div>`;
    touchUI.joy = $('.joy', root); touchUI.knob = $('.knob', root);
    const joyZone = $('.joy-zone', root), lookZone = $('.look-zone', root);
    const joyStart = (tch) => {
      touchUI.joyId = tch.identifier;
      const r = touchUI.joy.getBoundingClientRect();
      touchUI.joyR = r.width / 2;
      const inside = Math.hypot(tch.clientX - (r.left + r.width / 2), tch.clientY - (r.top + r.height / 2)) < r.width * 0.75;
      if (!inside) { touchUI.joy.style.left = (tch.clientX - r.width / 2) + 'px'; touchUI.joy.style.top = (tch.clientY - r.height / 2) + 'px'; touchUI.joy.style.bottom = 'auto'; }
      const r2 = touchUI.joy.getBoundingClientRect();
      touchUI.joyCx = r2.left + r2.width / 2; touchUI.joyCy = r2.top + r2.height / 2;
      joyMove(tch);
    };
    const joyMove = (tch) => {
      let dx = tch.clientX - touchUI.joyCx, dy = tch.clientY - touchUI.joyCy;
      const d = Math.hypot(dx, dy), R = touchUI.joyR;
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      touchUI.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      st.moveX = dx / R; st.moveY = -dy / R;
      st.touchSprint = d > R * 1.05 && -dy / R > 0.6;
      touchUI.joy.classList.toggle('sprint', !!st.touchSprint);
    };
    const joyEnd = () => { touchUI.joyId = null; st.moveX = 0; st.moveY = 0; st.touchSprint = false; touchUI.knob.style.transform = ''; touchUI.joy.classList.remove('sprint'); touchUI.joy.style.left = ''; touchUI.joy.style.top = ''; touchUI.joy.style.bottom = ''; };
    joyZone.addEventListener('touchstart', (e) => { e.preventDefault(); if (touchUI.joyId == null) joyStart(e.changedTouches[0]); }, { passive: false });
    touchUI.joy.addEventListener('touchstart', (e) => { e.preventDefault(); if (touchUI.joyId == null) joyStart(e.changedTouches[0]); }, { passive: false });
    lookZone.addEventListener('touchstart', (e) => { e.preventDefault(); if (touchUI.lookId == null) { const tc = e.changedTouches[0]; touchUI.lookId = tc.identifier; touchUI.lookLx = tc.clientX; touchUI.lookLy = tc.clientY; } }, { passive: false });
    root.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const tc of e.changedTouches) {
        if (tc.identifier === touchUI.joyId) joyMove(tc);
        else if (tc.identifier === touchUI.lookId || tc.identifier === touchUI.fireId) {
          if (tc.identifier === touchUI.fireId && touchUI.lookId != null) continue;
          st.lookX += (tc.clientX - touchUI.lookLx) * 2.1; st.lookY += (tc.clientY - touchUI.lookLy) * 2.1;
          touchUI.lookLx = tc.clientX; touchUI.lookLy = tc.clientY;
        }
      }
    }, { passive: false });
    const endT = (e) => {
      for (const tc of e.changedTouches) {
        if (tc.identifier === touchUI.joyId) joyEnd();
        if (tc.identifier === touchUI.lookId) touchUI.lookId = null;
        if (tc.identifier === touchUI.fireId) { touchUI.fireId = null; st.touchFire = false; $$('.tbtn.fire', root).forEach((b) => b.classList.remove('on')); }
      }
    };
    root.addEventListener('touchend', endT); root.addEventListener('touchcancel', endT);
    $$('.tbtn', root).forEach((b) => {
      const a = b.dataset.a;
      b.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        const tc = e.changedTouches[0];
        b.classList.add('on');
        if (a === 'fire') { st.touchFire = true; touchUI.fireId = tc.identifier; touchUI.lookLx = tc.clientX; touchUI.lookLy = tc.clientY; return; }
        if (a === 'ads') { st.touchAds = !st.touchAds; b.classList.toggle('on', st.touchAds); return; }
        if (a === 'crouch') { st.crouchToggle = !st.crouchToggle; b.classList.toggle('on', st.crouchToggle); return; }
        if (a === 'interact') st.interactHeld = true;
        press(a);
      }, { passive: false });
      b.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (a === 'interact') st.interactHeld = false;
        if (a !== 'ads' && a !== 'crouch' && a !== 'fire') b.classList.remove('on');
      }, { passive: false });
    });
  }
  function setTouch(on) {
    st.touch = on;
    document.body.classList.toggle('touch', on);
  }
  window.addEventListener('touchstart', () => { if (!st.touch) setTouch(true); }, { passive: true, capture: true });
  window.addEventListener('mousemove', (e) => { if (st.touch && e.movementX && Math.abs(e.movementX) + Math.abs(e.movementY) > 6 && !('ontouchstart' in window)) setTouch(false); });

  const padPrev = [];
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find((g) => g && g.connected);
    if (!p) { st.gamepad = false; return null; }
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const edge = (i) => { const v = b(i); const was = padPrev[i]; padPrev[i] = v; return v && !was; };
    const lx = dz(p.axes[0] || 0), ly = dz(p.axes[1] || 0), rx = dz(p.axes[2] || 0), ry = dz(p.axes[3] || 0);
    const active = lx || ly || rx || ry || p.buttons.some((x) => x.pressed);
    if (active) st.gamepad = true;
    if (!st.gamepad) return null;
    if (edge(0)) press('jump'); if (edge(2)) press('reload'); if (edge(3)) press('swap'); if (edge(9)) press('pause');
    if (edge(1)) st.crouchToggle = !st.crouchToggle;
    if (edge(4) || edge(5)) press('interact');
    if (edge(12)) press('slot1'); if (edge(13)) press('slot2');
    const r = { lx, ly, rx, ry, fire: b(7) || (p.buttons[7] && p.buttons[7].value > 0.3), ads: b(6) || (p.buttons[6] && p.buttons[6].value > 0.3), sprint: b(10), interact: b(4) || b(5) };
    return r;
  }

  return {
    st, attach, buildTouch, setTouch, requestLock,
    get lockFailed() { return lockFailed; },
    enable(on) {
      st.enabled = on; st.pressed.clear(); st.lookX = st.lookY = 0; mouseDown = false; rmb = false;
      if (!on) { st.touchFire = false; st.touchAds = false; st.interactHeld = false; $$('#touch .tbtn').forEach((b) => b.classList.remove('on')); if (document.pointerLockElement) document.exitPointerLock(); }
    },
    resetToggles() { st.crouchToggle = false; st.touchAds = false; $$('#touch .tbtn').forEach((b) => b.classList.remove('on')); },
    sample(dt) {
      const pad = pollPad();
      let mx = 0, my = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      let lookX = st.lookX, lookY = st.lookY; st.lookX = 0; st.lookY = 0;
      let fire = mouseDown || !!st.touchFire, ads = rmb || !!st.touchAds, sprint = !!st.sprintKey || !!st.touchSprint;
      let interact = st.interactHeld;
      if (st.touch && (st.moveX || st.moveY)) { mx = st.moveX; my = st.moveY; }
      if (pad) {
        if (pad.lx || pad.ly) { mx = pad.lx; my = -pad.ly; }
        const curve = (v) => Math.sign(v) * v * v;
        lookX += curve(pad.rx) * 900 * dt; lookY += curve(pad.ry) * 620 * dt;
        fire = fire || pad.fire; ads = ads || pad.ads; sprint = sprint || pad.sprint || (my > 0.92 && pad.sprint); interact = interact || pad.interact;
      }
      const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
      const out = { mx, my, lookX, lookY, fire, ads, sprint, crouch: !!st.crouchToggle, interact, pressed: new Set(st.pressed) };
      st.pressed.clear();
      return out;
    },
  };
})();

const LIBS = [
  ['lib/three/three.min.js', 700], ['lib/three/GLTFLoader.js', 46], ['lib/three/PointerLockControls.js', 3],
  ['lib/three/SkeletonUtils.js', 5], ['lib/three/postprocessing.js', 19],
  ['lib/ai/yuka.min.js', 123], ['lib/navigation/recast-navigation.js', 790],
];
const ASSET_FILES = {
  map: ['assets/Maps/backroom.glb', 340], npc: ['assets/NPCs/operator.glb', 1150], nav: ['assets/Maps/backroom.navmesh', 46],
  pistol: ['assets/Guns/pistol.glb', 240], shotgun: ['assets/Guns/shotgun.glb', 126], ak47: ['assets/Guns/ak47.glb', 625],
  m4: ['assets/Guns/m4.glb', 780], sniper: ['assets/Guns/sniper.glb', 860],
};
const Loader = {
  total: 0, done: 0, onProgress: null,
  bump(kb) { this.done += kb; if (this.onProgress) this.onProgress(clamp(this.done / this.total, 0, 1)); },
  script(src, kb) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = () => { this.bump(kb); res(); }; s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  },
  async binary(url, kb) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to load ' + url);
    if (!r.body || !r.body.getReader) { const b = await r.arrayBuffer(); this.bump(kb); return b; }
    const reader = r.body.getReader(); const parts = []; let got = 0; const est = kb * 1024;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); const before = got; got += value.length;
      this.bump(Math.min(kb, (got / est) * kb) - Math.min(kb, (before / est) * kb));
    }
    const sent = Math.min(kb, (got / est) * kb); if (sent < kb) this.bump(kb - sent);
    const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out.buffer;
  },
};

const World = {
  renderer: null, scene: null, camera: null, vmScene: null, vmCam: null, composer: null, bloom: null,
  map: null, mapMeshes: [], wallMeshes: [], basicMats: [], litMats: null, hemi: null, flashlight: null,
  raycaster: null, pixelScale: 1, qualityLevel: 'med', brightness: 2.3, lightsOut: false,
  init() {
    const T = THREE;
    const touchLike = matchMedia('(pointer: coarse)').matches;
    const r = new T.WebGLRenderer({ antialias: !touchLike, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.NoToneMapping;
    r.setClearColor(0x0b0a07, 1);
    $('#view').appendChild(r.domElement);
    this.renderer = r;
    this.scene = new T.Scene();
    this.scene.fog = new T.Fog(0x2e2812, 10, 52);
    this.scene.background = new T.Color(0x0b0a07);
    this.camera = new T.PerspectiveCamera(80, 1, 0.05, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.hemi = new T.HemisphereLight(0xfff1c2, 0x5a4a24, 2.3);
    this.scene.add(this.hemi);
    const dir = new T.DirectionalLight(0xfff0c8, 0.9); dir.position.set(0.3, 1, 0.2); this.scene.add(dir);
    this.vmScene = new T.Scene();
    this.vmCam = new T.PerspectiveCamera(58, 1, 0.01, 10);
    this.vmScene.add(new T.HemisphereLight(0xfff1c2, 0x3a3018, 2.4));
    const vd = new T.DirectionalLight(0xfff4d0, 1.6); vd.position.set(-0.4, 1, 0.6); this.vmScene.add(vd);
    this.raycaster = new T.Raycaster();
    this.flashlight = new T.SpotLight(0xfff2d0, 0, 26, 0.48, 0.55, 1.4);
    this.camera.add(this.flashlight); this.camera.add(this.flashlight.target);
    this.flashlight.position.set(0.15, -0.1, 0); this.flashlight.target.position.set(0, -0.05, -1);
    addEventListener('resize', () => this.resize());
    this.applyQuality();
  },
  applyQuality() {
    const T = THREE; const s = Save.settings;
    let q = s.quality;
    if (q === 'auto') q = matchMedia('(pointer: coarse)').matches ? 'low' : 'med';
    this.qualityLevel = q;
    const dpr = window.devicePixelRatio || 1;
    this.basePixel = q === 'low' ? Math.min(dpr, 1) * 0.8 : q === 'med' ? Math.min(dpr, 1.25) : Math.min(dpr, 1.75);
    this.pixelScale = 1;
    if (q === 'high' && T.EffectComposer && !this.composer) {
      this.composer = new T.EffectComposer(this.renderer);
      this.composer.addPass(new T.RenderPass(this.scene, this.camera));
      this.bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.5, 0.86);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new T.OutputPass());
    }
    this.resize();
  },
  resize() {
    if (!this.renderer) return;
    const w = innerWidth, h = innerHeight;
    const pr = this.basePixel * this.pixelScale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCam.aspect = w / h; this.vmCam.fov = w / h < 1 ? 70 : 58; this.vmCam.updateProjectionMatrix();
    if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); }
  },
  perf: { acc: 0, n: 0, t: 0 },
  adapt(dt) {
    const p = this.perf; p.acc += dt; p.n++; p.t += dt;
    if (p.t < 2) return;
    const avg = p.acc / p.n; p.acc = 0; p.n = 0; p.t = 0;
    const old = this.pixelScale;
    if (avg > 1 / 40) this.pixelScale = Math.max(0.55, this.pixelScale - 0.12);
    else if (avg < 1 / 58 && this.pixelScale < 1) this.pixelScale = Math.min(1, this.pixelScale + 0.06);
    if (old !== this.pixelScale) this.resize();
  },
  setupMap(gltf) {
    const T = THREE;
    this.map = gltf.scene;
    this.map.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.material; const name = src.name || '';
      let mat;
      if (src.emissiveMap) {
        src.emissiveMap.anisotropy = 4;
        mat = new T.MeshBasicMaterial({ map: src.emissiveMap, side: T.FrontSide });
        mat.color.setScalar(this.brightness);
        const img = src.emissiveMap.image;
        if (!img || !(img.width || img.videoWidth)) { mat.map = null; mat.color.set(name === 'CarpetBake4' ? 0x5a4a2c : name === 'RoofBaked' ? 0x8f8458 : 0xb3a462); }
      } else if (name === 'light') {
        mat = new T.MeshBasicMaterial({ color: new T.Color(1.6, 1.55, 1.35) });
        this.lightPanelMat = mat;
      } else {
        mat = new T.MeshBasicMaterial({ color: new T.Color(0.32, 0.3, 0.22) });
      }
      mat.side = T.DoubleSide;
      mat.name = name; mat.userData.base = mat.color.clone();
      o.material = mat; this.basicMats.push(mat);
      o.matrixAutoUpdate = false; o.updateMatrix();
      this.mapMeshes.push(o);
      if (!/^(RoofBaked|CarpetBake4|light|Lightsurround|PlugsBaked)$/.test(name)) this.wallMeshes.push(o);
    });
    this.scene.add(this.map);
    this.map.updateMatrixWorld(true);
    try {
      const pm = new T.PMREMGenerator(this.renderer);
      const env = pm.fromScene(this.scene, 0.04, 0.1, 60, { position: new T.Vector3(7, 1.5, 12) });
      this.scene.environment = env.texture; this.vmScene.environment = env.texture;
      this.scene.environmentIntensity = 0.6; this.vmScene.environmentIntensity = 0.9;
      pm.dispose();
    } catch (e) { }
  },
  setLightsOut(on) {
    const T = THREE;
    this.lightsOut = on;
    if (on && !this.litMats) {
      this.litMats = new Map();
      for (const m of this.basicMats) {
        const lm = new T.MeshLambertMaterial({ map: m.map, color: m.map ? 0xffffff : m.color, emissive: m.map ? 0xffffff : 0x000000, emissiveMap: m.map, emissiveIntensity: 0.12, side: T.DoubleSide });
        lm.userData.isLight = m === this.lightPanelMat;
        if (lm.userData.isLight) { lm.emissive.set(0xfff2d0); lm.emissiveIntensity = 0.4; }
        this.litMats.set(m, lm);
      }
    }
    for (const o of this.mapMeshes) {
      if (on) { if (!o.userData.basic) o.userData.basic = o.material; o.material = this.litMats.get(o.userData.basic); }
      else if (o.userData.basic) o.material = o.userData.basic;
    }
    this.flashlight.intensity = on ? 22 : 0;
    this.hemi.intensity = on ? 0.35 : 2.3;
    this.scene.fog.color.set(on ? 0x050402 : 0x2e2812); this.scene.fog.near = on ? 3 : 10; this.scene.fog.far = on ? 24 : 52;
    $('#darkness').classList.toggle('on', on);
  },
  flicker: { t: 0, level: 1 },
  updateFlicker(dt) {
    if (!this.lightsOut) return;
    const f = this.flicker; f.t -= dt;
    if (f.t <= 0) { f.t = rand(0.05, Math.random() < 0.15 ? 0.2 : 2.2); f.level = Math.random() < 0.3 ? rand(0.0, 0.08) : rand(0.08, 0.2); if (f.level < 0.05) Audio.flicker(); }
    for (const lm of this.litMats.values()) lm.emissiveIntensity = lm.userData.isLight ? f.level * 4 : f.level;
  },
  _v: null, _dir: null,
  rayWalls(origin, dir, far, meshes = this.wallMeshes) {
    const rc = this.raycaster; rc.ray.origin.copy(origin); rc.ray.direction.copy(dir); rc.near = 0; rc.far = far;
    const hits = rc.intersectObjects(meshes, false);
    return hits.length ? hits[0] : null;
  },
  los(a, b) {
    const v = this._v || (this._v = new THREE.Vector3()); const d = this._dir || (this._dir = new THREE.Vector3());
    d.subVectors(b, a); const len = d.length(); if (len < 0.01) return true; d.divideScalar(len);
    v.copy(a);
    return !this.rayWalls(v, d, len - 0.05);
  },
  render() {
    const r = this.renderer;
    if (this.composer && this.qualityLevel === 'high') this.composer.render(); else r.render(this.scene, this.camera);
    if (this.vmVisible) { r.autoClear = false; r.clearDepth(); r.render(this.vmScene, this.vmCam); r.autoClear = true; }
  },
};

const Nav = {
  navMesh: null, query: null, crowd: null, he: { x: 2, y: 3, z: 2 },
  async init(navData) {
    const R = window.Recast;
    await R.init();
    const { navMesh } = R.importNavMesh(new Uint8Array(navData));
    this.navMesh = navMesh;
    this.query = new R.NavMeshQuery(navMesh);
    this.crowd = new R.Crowd(navMesh, { maxAgents: 24, maxAgentRadius: 0.6 });
    this.buildPatrolCells();
  },
  CELL: 5,
  buildPatrolCells() {
    const G = this.CELL, acc = new Map();
    for (let i = 0; i < 1200; i++) {
      const p = this.random(), k = Math.floor(p.x / G) + ',' + Math.floor(p.z / G);
      let c = acc.get(k); if (!c) acc.set(k, c = { x: 0, y: 0, z: 0, n: 0 });
      c.x += p.x; c.y += p.y; c.z += p.z; c.n++;
    }
    this.cells = []; this.cellKey = new Map();
    for (const [k, c] of acc) {
      if (c.n < 3) continue;
      const p = this.closest({ x: c.x / c.n, y: c.y / c.n, z: c.z / c.n }); if (!p) continue;
      this.cellKey.set(k, this.cells.length); this.cells.push({ x: p.x, y: p.y, z: p.z });
    }
  },
  cellAt(x, z) { const i = this.cellKey && this.cellKey.get(Math.floor(x / this.CELL) + ',' + Math.floor(z / this.CELL)); return i ?? -1; },
  visits(team) {
    const m = Game.mode; if (!m._visits) m._visits = {};
    return m._visits[team] || (m._visits[team] = new Float32Array(this.cells.length).fill(-1e4));
  },
  patrolPoint(b, zone) {
    if (!this.cells || !this.cells.length) return this.randomInZone(zone);
    const vis = this.visits(b.a.team), p = b.a.pos, now = Game.time;
    const claimed = new Set();
    for (const o of Game.actors) if (o.bot && o.bot !== b && o.alive && o.team === b.a.team && o.bot.patrolCell >= 0) claimed.add(o.bot.patrolCell);
    let best = -1, bs = -Infinity;
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (zone && (c.x < zone.x[0] || c.x > zone.x[1] || c.z < zone.z[0] || c.z > zone.z[1])) continue;
      if (b.skipCells && b.skipCells.has(i)) continue;
      const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < 3) continue;
      const s = Math.min(now - vis[i], 240) - d * 1.5 + Math.random() * 25 - (claimed.has(i) ? 150 : 0);
      if (s > bs) { bs = s; best = i; }
    }
    if (best < 0) { b.patrolCell = -1; return this.randomInZone(zone); }
    b.patrolCell = best;
    return this.cells[best];
  },
  closest(p) {
    const r = this.query.findClosestPoint(p, { halfExtents: this.he });
    return r.success ? { x: r.point.x, y: r.point.y, z: r.point.z, ref: r.polyRef } : null;
  },
  random() { const r = this.query.findRandomPoint(); return r.success ? r.randomPoint : { x: 5, y: 0, z: 12 }; },
  randomInZone(zone, tries = 40) {
    for (let i = 0; i < tries; i++) {
      const p = this.random();
      if (!zone || (p.x >= zone.x[0] && p.x <= zone.x[1] && p.z >= zone.z[0] && p.z <= zone.z[1])) return p;
    }
    return this.random();
  },
  randomAround(p, r) {
    const near = this.closest(p); if (!near) return this.random();
    const res = this.query.findRandomPointAroundCircle(near, r, { startRef: near.ref });
    return res.success ? res.randomPoint : near;
  },
  move(ref, from, to) {
    if (!ref) { const c = this.closest(from); if (!c) return { pos: from, ref: 0 }; ref = c.ref; from = c; }
    const r = this.query.moveAlongSurface(ref, from, to);
    if (!r.success) return { pos: from, ref };
    const nref = r.visited.length ? r.visited[r.visited.length - 1] : ref;
    return { pos: r.resultPosition, ref: nref };
  },
};

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c);
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
const Tex = {};
function buildTextures() {
  Tex.flashCore = [0, 1, 2].map(() => canvasTex(128, 128, (g) => {
    g.translate(64, 64);
    g.globalCompositeOperation = 'lighter';
    const n = randi(4, 6), off = rand(0, 6.28);
    for (let i = 0; i < n; i++) {
      const ang = off + (i / n) * Math.PI * 2 + rand(-0.25, 0.25), len = rand(30, 60), wid = rand(5, 11);
      g.save(); g.rotate(ang);
      const gr = g.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,240,200,0.95)'); gr.addColorStop(0.35, 'rgba(255,170,60,0.7)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -wid); g.quadraticCurveTo(len * 0.45, -wid * 0.6, len, 0); g.quadraticCurveTo(len * 0.45, wid * 0.6, 0, wid); g.closePath(); g.fill();
      g.restore();
    }
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 26);
    core.addColorStop(0, 'rgba(255,255,245,1)'); core.addColorStop(0.35, 'rgba(255,225,140,0.9)'); core.addColorStop(0.7, 'rgba(255,140,40,0.35)'); core.addColorStop(1, 'rgba(255,100,20,0)');
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
  }));
  Tex.flashSide = canvasTex(128, 32, (g, w, h) => {
    g.globalCompositeOperation = 'lighter';
    for (let x = 0; x < w; x++) {
      const t = x / w, half = (h / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.08)), 0.8) * (1 - t * 0.55) * rand(0.75, 1.1);
      const a = (1 - t) * 0.85;
      const gr = g.createLinearGradient(0, h / 2 - half, 0, h / 2 + half);
      gr.addColorStop(0, 'rgba(255,120,20,0)'); gr.addColorStop(0.5, `rgba(255,${Math.round(230 - t * 110)},${Math.round(170 - t * 150)},${a})`); gr.addColorStop(1, 'rgba(255,120,20,0)');
      g.fillStyle = gr; g.fillRect(x, h / 2 - half, 1, half * 2);
    }
  });
  Tex.smoke = canvasTex(64, 64, (g) => {
    for (let i = 0; i < 6; i++) {
      const x = 32 + rand(-9, 9), y = 32 + rand(-9, 9), r = rand(12, 22);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(200,196,186,0.35)'); gr.addColorStop(1, 'rgba(200,196,186,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }
  });
  Tex.hole = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.25, 'rgba(10,8,4,0.95)'); gr.addColorStop(0.45, 'rgba(40,32,15,0.6)'); gr.addColorStop(1, 'rgba(40,32,15,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  Tex.blob = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  Tex.glow = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  Tex.chevron = canvasTex(64, 64, (g) => {
    g.fillStyle = '#3d8bff'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(8, 18); g.lineTo(32, 42); g.lineTo(56, 18); g.lineTo(56, 30); g.lineTo(32, 54); g.lineTo(8, 30); g.closePath(); g.stroke(); g.fill();
  });
  Tex.camo = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h);
    const tones = ['#b4b4b4', '#8a8a8a', '#cfcfcf'];
    for (let i = 0; i < 70; i++) {
      g.fillStyle = tones[i % 3]; g.beginPath();
      const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 22;
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; const rr = r * (0.6 + Math.random() * 0.6); g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  });
  Tex.camo.wrapS = Tex.camo.wrapT = THREE.RepeatWrapping;
}

const FX = {
  tracers: [], flashes: [], decals: [], smokes: [], sparks: null, sparkData: null, vmFlash: null, vmLight: null, di: 0, fi: 0, ti: 0, si: 0,
  init() {
    const T = THREE, S = World.scene;
    const tg = new T.BoxGeometry(1, 1, 1); tg.translate(0, 0, 0.5);
    for (let i = 0; i < 28; i++) {
      const m = new T.Mesh(tg, new T.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false; m.frustumCulled = false; S.add(m); this.tracers.push({ m, life: 0 });
    }
    for (let i = 0; i < 14; i++) { const u = this.flashUnit(true); S.add(u.g); this.flashes.push(u); }
    for (let i = 0; i < 24; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: Tex.smoke, transparent: true, depthWrite: false, opacity: 0 }));
      sp.visible = false; S.add(sp); this.smokes.push({ s: sp, life: 0, max: 0.5, vy: 0, grow: 0 });
    }
    const dg = new T.PlaneGeometry(0.11, 0.11);
    const dm = new T.MeshBasicMaterial({ map: Tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (let i = 0; i < 48; i++) { const d = new T.Mesh(dg, dm); d.visible = false; S.add(d); this.decals.push(d); }
    const N = 180; const pos = new Float32Array(N * 3).fill(-999);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    this.sparks = new T.Points(geo, new T.PointsMaterial({ color: 0xffd27a, size: 0.045, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    this.sparks.frustumCulled = false; S.add(this.sparks);
    this.sparkData = Array.from({ length: N }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    this.vmFlash = this.flashUnit(false); World.vmScene.add(this.vmFlash.g);
    this.vmLight = new T.PointLight(0xffc870, 0, 3, 2); World.vmScene.add(this.vmLight);
    this.worldLight = new T.PointLight(0xffc870, 0, 7, 2); S.add(this.worldLight);
  },
  tracer(from, to, w = 0.012) {
    const t = this.tracers[this.ti++ % this.tracers.length];
    const len = from.distanceTo(to); if (len < 0.5) return;
    t.m.position.copy(from); t.m.lookAt(to); t.m.scale.set(w, w, len); t.m.visible = true; t.life = 0.07; t.m.material.opacity = 0.85;
  },
  flashUnit(depthTest) {
    const T = THREE, g = new T.Group();
    const add = { blending: T.AdditiveBlending, depthWrite: false, depthTest, transparent: true, fog: false };
    const front = new T.Sprite(new T.SpriteMaterial({ map: Tex.flashCore[0], ...add }));
    const sideMat = new T.MeshBasicMaterial({ map: Tex.flashSide, side: T.DoubleSide, ...add });
    const geo = this._sideGeo || (this._sideGeo = new T.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0, 0, -0.5));
    const s1 = new T.Mesh(geo, sideMat), s2 = new T.Mesh(geo, sideMat); s2.rotation.z = Math.PI / 2;
    const sides = new T.Group(); sides.add(s1, s2);
    g.add(front, sides); g.visible = false;
    return { g, front, sides, life: 0, fresh: false };
  },
  fire(u, pos, quat, size) {
    u.g.position.copy(pos); if (quat) u.g.quaternion.copy(quat);
    u.front.material.map = pick(Tex.flashCore); u.front.material.rotation = rand(0, 6.28);
    u.front.scale.setScalar(size * rand(0.7, 1.1));
    const len = size * rand(1.3, 2.2), wid = size * rand(0.45, 0.7);
    u.sides.scale.set(wid, wid, len); u.sides.rotation.z = rand(0, Math.PI);
    u.g.visible = true; u.life = rand(0.03, 0.045); u.fresh = true;
  },
  flash(pos, size = 0.45, quat = null) {
    this.fire(this.flashes[this.fi++ % this.flashes.length], pos, quat, size * 0.6);
    this.worldLight.position.copy(pos); this.worldLight.intensity = 6; this.worldLightLife = 0.05;
    this.smoke(pos, size * 0.5);
  },
  smoke(pos, size = 0.2) {
    const p = this.smokes[this.si++ % this.smokes.length];
    p.s.position.copy(pos); p.s.scale.setScalar(size); p.s.material.rotation = rand(0, 6.28);
    p.life = p.max = rand(0.45, 0.65); p.vy = rand(0.25, 0.45); p.grow = size * 2.2; p.s.visible = true;
  },
  decal(point, normal) {
    const d = this.decals[this.di++ % this.decals.length];
    d.position.copy(point).addScaledVector(normal, 0.004); d.lookAt(d.position.x + normal.x, d.position.y + normal.y, d.position.z + normal.z);
    d.rotateZ(rand(0, 6.28)); d.scale.setScalar(rand(0.7, 1.2)); d.visible = true;
  },
  spark(point, normal, n = 6) {
    const pos = this.sparks.geometry.attributes.position;
    for (let k = 0; k < n; k++) {
      const i = Math.floor(Math.random() * this.sparkData.length); const s = this.sparkData[i];
      s.life = rand(0.15, 0.35);
      const sp = rand(1.5, 4.5);
      s.vx = (normal.x + rand(-0.7, 0.7)) * sp; s.vy = (normal.y + rand(-0.2, 0.9)) * sp; s.vz = (normal.z + rand(-0.7, 0.7)) * sp;
      pos.setXYZ(i, point.x, point.y, point.z);
    }
    pos.needsUpdate = true;
  },
  muzzleVM(pos, quat, size = 0.09) { this.fire(this.vmFlash, pos, quat, size); this.vmLight.position.copy(pos); this.vmLight.intensity = 4; },
  update(dt) {
    for (const t of this.tracers) if (t.m.visible) { t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.07) * 0.85; if (t.life <= 0) t.m.visible = false; }
    for (const f of [...this.flashes, this.vmFlash]) {
      if (!f.g.visible) continue;
      if (f.fresh) { f.fresh = false; continue; }
      f.life -= dt; if (f.life <= 0) { f.g.visible = false; if (f === this.vmFlash) this.vmLight.intensity = 0; }
    }
    for (const p of this.smokes) {
      if (!p.s.visible) continue;
      p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      const k = p.life / p.max;
      p.s.position.y += p.vy * dt; p.s.scale.addScalar(p.grow * dt); p.s.material.opacity = 0.35 * k * k;
    }
    if (this.worldLight.intensity > 0) { this.worldLightLife -= dt; if (this.worldLightLife <= 0) this.worldLight.intensity = 0; }
    const pos = this.sparks.geometry.attributes.position; let any = false;
    for (let i = 0; i < this.sparkData.length; i++) {
      const s = this.sparkData[i]; if (s.life <= 0) continue; any = true;
      s.life -= dt; s.vy -= 9 * dt;
      pos.setXYZ(i, pos.getX(i) + s.vx * dt, pos.getY(i) + s.vy * dt, pos.getZ(i) + s.vz * dt);
      if (s.life <= 0) pos.setXYZ(i, -999, -999, -999);
    }
    if (any) pos.needsUpdate = true;
  },
  clear() {
    for (const d of this.decals) d.visible = false;
    for (const t of this.tracers) t.m.visible = false;
  },
};

const Assets = { map: null, npc: null, guns: {}, nav: null };
const Models = {
  gunCache: {},
  gun(id) {
    const T = THREE, def = WEAPONS[id];
    if (!this.gunCache[id]) {
      const src = Assets.guns[def.model].scene;
      const inner = src.clone(true);
      inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (o.material) { o.material = o.material.clone(); o.material.envMapIntensity = 1; if (o.material.metalness != null) o.material.roughness = Math.max(0.35, o.material.roughness); } } });
      const holder = new T.Group(); holder.add(inner);
      inner.rotation.y = def.axis === '+x' ? Math.PI / 2 : def.axis === '-x' ? -Math.PI / 2 : def.axis === '+z' ? Math.PI : 0;
      holder.updateMatrixWorld(true);
      let box = new T.Box3().setFromObject(holder);
      const size = box.getSize(new T.Vector3());
      const k = def.len / size.z; inner.scale.multiplyScalar(k);
      holder.updateMatrixWorld(true);
      box = new T.Box3().setFromObject(holder);
      const c = box.getCenter(new T.Vector3());
      inner.position.sub(c);
      holder.updateMatrixWorld(true);
      box = new T.Box3().setFromObject(holder);
      holder.userData.box = box.clone();
      this.gunCache[id] = holder;
    }
    const g = this.gunCache[id].clone(true);
    const b = this.gunCache[id].userData.box;
    g.userData.box = b;
    g.userData.muzzle = new T.Vector3(0, b.max.y * 0.35, b.min.z - 0.02);
    return g;
  },
  soldier() {
    const T = THREE;
    const model = T.SkeletonUtils.clone(Assets.npc.scene);
    let hand = null; const upperArms = [];
    model.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
      }
      if (o.isBone) {
        if (!hand && /RightHand$/.test(o.name)) hand = o;
        if (/(Left|Right)Arm$/.test(o.name)) upperArms.push(o);
      }
    });
    const L = this.armLightMats();
    const armLights = upperArms.map((bone) => {
      const band = new T.Mesh(this._bandGeo || (this._bandGeo = new T.CylinderGeometry(6.6, 6.6, 6, 16, 1, true)), L.ally.band);
      band.position.y = 11;
      const halo = new T.Sprite(L.ally.halo); halo.scale.setScalar(44); halo.position.y = 11;
      bone.add(band, halo);
      return { band, halo };
    });
    return { model, hand, armLights };
  },
  armLightMats() {
    if (this._armMats) return this._armMats;
    const T = THREE;
    const mk = (hex) => ({
      band: new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(2.2), side: T.DoubleSide, toneMapped: false, fog: false }),
      halo: new T.SpriteMaterial({ map: Tex.glow, color: hex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 1, fog: false }),
    });
    return (this._armMats = { ally: mk(0x2f8bff), enemy: mk(0xff2a2a) });
  },
  setArmLight(soldier, ally) {
    const m = this.armLightMats()[ally ? 'ally' : 'enemy'];
    for (const l of soldier.armLights || []) { l.band.material = m.band; l.halo.material = m.halo; }
  },
  briefcase() {
    const T = THREE, g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(0.46, 0.34, 0.12), new T.MeshStandardMaterial({ color: 0x15130f, roughness: 0.45, metalness: 0.2 }));
    const trim = new T.Mesh(new T.BoxGeometry(0.47, 0.03, 0.125), new T.MeshStandardMaterial({ color: 0xb08d3c, roughness: 0.3, metalness: 0.9 }));
    trim.position.y = 0.05;
    const handle = new T.Mesh(new T.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5 }));
    handle.position.y = 0.17;
    g.add(body, trim, handle);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: Tex.glow, color: 0xffd34a, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
    glow.scale.setScalar(1.1); g.add(glow);
    return g;
  },
  keycard(color) {
    const T = THREE, g = new T.Group();
    const card = new T.Mesh(new T.BoxGeometry(0.26, 0.012, 0.17), new T.MeshStandardMaterial({ color: 0xf2f2f2, emissive: new T.Color(color), emissiveIntensity: 0.6, roughness: 0.4 }));
    const strip = new T.Mesh(new T.BoxGeometry(0.26, 0.014, 0.04), new T.MeshBasicMaterial({ color: new T.Color(color) }));
    strip.position.z = -0.05;
    g.add(card, strip);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: Tex.glow, color: new T.Color(color), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
    glow.scale.setScalar(0.9); g.add(glow);
    return g;
  },
  switchPanel(color) {
    const T = THREE, g = new T.Group();
    const base = new T.Mesh(new T.BoxGeometry(0.5, 0.7, 0.12), new T.MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.6, metalness: 0.4 }));
    const btn = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.08, 20), new T.MeshBasicMaterial({ color }));
    btn.rotation.x = Math.PI / 2; btn.position.z = 0.08;
    const stripes = new T.Mesh(new T.PlaneGeometry(0.5, 0.12), new T.MeshBasicMaterial({ map: canvasTex(64, 16, (gg) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? '#111' : '#f2c230'; gg.beginPath(); gg.moveTo(i * 10, 16); gg.lineTo(i * 10 + 8, 0); gg.lineTo(i * 10 + 18, 0); gg.lineTo(i * 10 + 10, 16); gg.fill(); } }) }));
    stripes.position.set(0, -0.28, 0.061);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: Tex.glow, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
    glow.position.z = 0.15; glow.scale.setScalar(0.8);
    g.add(base, btn, stripes, glow);
    g.userData.btn = btn; g.userData.glow = glow;
    return g;
  },
  beam(color) {
    const T = THREE;
    const m = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 2.8, 16, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    m.position.y = 1.4;
    return m;
  },
};

let ACTOR_ID = 0;
class Actor {
  constructor({ name, team, hp = 100 }) {
    this.id = ++ACTOR_ID; this.name = name; this.team = team;
    this.maxHp = hp; this.hp = hp; this.alive = false; this.out = false;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0;
    this.kills = 0; this.deaths = 0; this.headshots = 0; this.lastHurt = -99; this.spawnTime = 0;
    this.lives = Infinity; this.respawnAt = 0; this.carrying = null; this.isPlayer = false;
  }
  chest(v) { return v.set(this.pos.x, this.pos.y + (this.crouching ? 1.0 : 1.3), this.pos.z); }
  eye(v) { return v.set(this.pos.x, this.pos.y + (this.crouching ? 1.15 : 1.6), this.pos.z); }
  get protectedNow() { return Game.time - this.spawnTime < 1.6; }
}

const _v1 = () => new THREE.Vector3();
const TMP = { a: null, b: null, c: null, d: null, e: null };

function rayVsSoldier(o, d, a, maxT) {
  const cx = a.pos.x, cz = a.pos.z, crouch = a.crouching;
  const headY = a.pos.y + (crouch ? 1.2 : 1.62), bodyTop = a.pos.y + (crouch ? 1.05 : 1.45);
  let best = null;
  {
    const ox = o.x - cx, oy = o.y - headY, oz = o.z - cz, r = 0.16;
    const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
    if (disc >= 0) { const tt = -b - Math.sqrt(disc); if (tt > 0 && tt < maxT) best = { t: tt, head: true }; }
  }
  {
    const r = 0.3, ox = o.x - cx, oz = o.z - cz;
    const A = d.x * d.x + d.z * d.z, B = 2 * (ox * d.x + oz * d.z), C = ox * ox + oz * oz - r * r;
    const disc = B * B - 4 * A * C;
    if (A > 1e-6 && disc >= 0) {
      const tt = (-B - Math.sqrt(disc)) / (2 * A);
      if (tt > 0 && tt < maxT && (!best || tt < best.t)) {
        const y = o.y + d.y * tt;
        if (y >= a.pos.y && y <= bodyTop) best = { t: tt, head: false };
      }
    }
  }
  return best;
}

const Player = {
  a: null, vel: null, ref: 0, vy: 0, jumpY: 0, onGround: true, crouchT: 0, bob: 0, bobAmt: 0, stepAcc: 0,
  slots: [], cur: 0, fireCd: 0, reloadT: 0, switchT: 0, switchTo: -1, adsT: 0, bloom: 0, recoilP: 0, recoilY: 0,
  vmRoot: null, vmGun: null, swayX: 0, swayY: 0, kickZ: 0, kickR: 0, landDip: 0, shotsFired: 0, shotsHit: 0, triggerHeld: false,
  interactT: 0, deathT: 0, assistT: 0, assistTarget: null, agent: null, sprinting: false, lastFireTime: -9,
  init() {
    this.vel = new THREE.Vector3();
    this.vmRoot = new THREE.Group(); World.vmScene.add(this.vmRoot);
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x2f6fe0, roughness: 0.85, map: Tex.camo });
    const glove = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 });
    const arm = (side) => {
      const g = new THREE.Group();
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 4, 8), sleeve); fore.rotation.x = Math.PI / 2; fore.position.z = 0.16;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), glove); hand.scale.set(1, 0.8, 1.3);
      g.add(fore, hand); g.userData.side = side; return g;
    };
    this.armR = arm(1); this.armL = arm(-1);
    this.vmRoot.add(this.armR, this.armL);
  },
  spawn(actor, pos, yaw) {
    this.a = actor; actor.isPlayer = true; actor.alive = true; actor.hp = actor.maxHp; actor.spawnTime = Game.time;
    actor.pos.set(pos.x, pos.y, pos.z); actor.yaw = yaw; actor.pitch = 0;
    const c = Nav.closest(pos); this.ref = c ? c.ref : 0;
    this.vel.set(0, 0, 0); this.vy = 0; this.jumpY = 0; this.onGround = true; this.reloadT = 0; this.switchT = 0; this.bloom = 0; this.recoilP = this.recoilY = 0;
    this.deathT = 0; this.interactT = 0;
    for (const s of this.slots) { const d = WEAPONS[s.id]; s.mag = d.mag; s.reserve = d.reserve; }
    if (!this.agent) this.agent = Nav.crowd.addAgent(pos, { radius: 0.4, height: 1.8, maxSpeed: 0, maxAcceleration: 0, separationWeight: 0, updateFlags: 0 });
    else this.agent.teleport(pos);
    this.equip(this.cur, true);
    World.vmVisible = true;
  },
  setLoadout(primary, secondary) {
    this.slots = [primary, secondary].filter((id) => id && id !== 'none').map((id) => ({ id, mag: 0, reserve: 0 }));
    this.cur = 0;
  },
  giveWeapon(id) {
    const d = WEAPONS[id], s = { id, mag: d.mag, reserve: d.reserve };
    const i = this.slots.findIndex((x) => WEAPONS[x.id].slot === d.slot);
    if (i >= 0) this.slots[i] = s; else if (d.slot === 'primary') this.slots.unshift(s); else this.slots.push(s);
    this.reloadT = 0; this.switchT = 0; this.switchTo = -1;
    this.equip(this.slots.indexOf(s), true); Hud.weapon();
  },
  refillAmmo() {
    for (const s of this.slots) { const d = WEAPONS[s.id]; s.mag = d.mag; s.reserve = d.reserve; }
    this.reloadT = 0; Hud.weapon();
  },
  get weapon() { return WEAPONS[this.slots[this.cur].id]; },
  get slot() { return this.slots[this.cur]; },
  equip(i, instant) {
    this.cur = i;
    if (this.vmGun) this.vmRoot.remove(this.vmGun);
    this.vmGun = Models.gun(this.slots[i].id);
    this.vmRoot.add(this.vmGun);
    const def = this.weapon, b = this.vmGun.userData.box;
    const isPistol = def.slot === 'secondary';
    def.hip = def.hip || [isPistol ? 0.15 : 0.15, isPistol ? -0.15 : -0.16, isPistol ? -0.34 : -(b.max.z - b.min.z) * 0.5 - 0.06];
    def.adsPos = def.adsPos || [0, -b.max.y - (def.scope ? 0.04 : 0.012), isPistol ? -0.3 : -(b.max.z - b.min.z) * 0.5 + 0.04];
    this.armR.position.set(0.03, -0.06, b.max.z * 0.4); this.armR.rotation.set(0.25, -0.12, 0);
    this.armL.position.set(-0.04, -0.05, isPistol ? b.max.z * 0.2 : b.min.z * 0.35); this.armL.rotation.set(0.35, isPistol ? 0.25 : 0.45, 0);
    this.armL.visible = true;
    this.switchT = instant ? 0 : 0.42; this.switchTo = -1; this.reloadT = 0;
    Hud.weapon();
  },
  startReload() {
    const s = this.slot, d = this.weapon;
    if (this.reloadT > 0 || s.mag >= d.mag || s.reserve <= 0 || this.switchT > 0) return;
    this.reloadT = d.reload; Audio.reload(d.id); Hud.weapon();
  },
  update(dt, inp) {
    const a = this.a;
    if (!a) return;
    const s = Save.settings;
    if (!a.alive) { this.updateDead(dt); return; }
    const def = this.weapon, slot = this.slot;
    const adsAmt = this.adsT;
    let sens = 0.0022 * s.sens * (1 - adsAmt * (def.scope ? 0.72 : 0.38));
    if ((Input.st.touch || Input.st.gamepad) && s.aimAssist) sens *= this.aimAssist(dt);
    a.yaw -= inp.lookX * sens;
    a.pitch -= inp.lookY * sens * (s.invert ? -1 : 1);
    const rec = Math.min(1, dt * 6);
    this.recoilP *= 1 - rec;
    a.pitch = clamp(a.pitch, -1.45, 1.45);
    const crouch = inp.crouch && this.onGround;
    this.crouchT = damp(this.crouchT, crouch ? 1 : 0, 12, dt); a.crouching = this.crouchT > 0.5;
    const wantSprint = inp.sprint && inp.my > 0.3 && !crouch && this.reloadT <= 0 && !inp.ads;
    this.sprinting = !!(wantSprint && (inp.mx || inp.my));
    let speed = this.sprinting ? 5.4 : crouch ? 2.2 : 4.2;
    if (inp.ads || this.adsT > 0.5) speed = Math.min(speed, def.scope ? 2.0 : 2.8);
    if (a.carrying) speed *= 0.9;
    const sy = Math.sin(a.yaw), cy = Math.cos(a.yaw);
    const wx = (-sy * inp.my + cy * inp.mx) * speed, wz = (-cy * inp.my - sy * inp.mx) * speed;
    const accel = this.onGround ? 14 : 3;
    this.vel.x = damp(this.vel.x, wx, accel, dt); this.vel.z = damp(this.vel.z, wz, accel, dt);
    const tgt = { x: a.pos.x + this.vel.x * dt, y: a.pos.y, z: a.pos.z + this.vel.z * dt };
    const mv = Nav.move(this.ref, { x: a.pos.x, y: a.pos.y, z: a.pos.z }, tgt);
    const moved = Math.hypot(mv.pos.x - a.pos.x, mv.pos.z - a.pos.z);
    a.pos.x = mv.pos.x; a.pos.z = mv.pos.z; a.pos.y = mv.pos.y; this.ref = mv.ref;
    if (this.agent) this.agent.teleport(a.pos);
    if (inp.pressed.has('jump') && this.onGround && !crouch) { this.vy = 4.6; this.onGround = false; }
    if (!this.onGround) {
      this.vy -= 13 * dt; this.jumpY += this.vy * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.vy = 0; this.onGround = true; this.landDip = 0.06; Audio.land(); Game.noise(a, 6); }
    }
    const hSpeed = moved / Math.max(dt, 1e-4);
    this.bobAmt = damp(this.bobAmt, this.onGround ? clamp(hSpeed / 5, 0, 1.3) : 0, 10, dt);
    this.bob += dt * (this.sprinting ? 13 : 9.5);
    this.stepAcc += moved;
    if (this.onGround && this.stepAcc > (this.sprinting ? 2.2 : 1.7)) { this.stepAcc = 0; Audio.step(null, true, crouch); if (!crouch) Game.noise(a, this.sprinting ? 10 : 5); }
    this.landDip = damp(this.landDip, 0, 8, dt);
    const eye = lerp(1.62, 1.12, this.crouchT) + this.jumpY - this.landDip + Math.sin(this.bob * 2) * 0.035 * this.bobAmt * (1 - adsAmt * 0.8);
    const cam = World.camera;
    cam.position.set(a.pos.x, a.pos.y + eye, a.pos.z);
    cam.rotation.set(a.pitch + this.recoilP, a.yaw + this.recoilY, Math.sin(this.bob) * 0.006 * this.bobAmt);
    this.recoilY *= 1 - rec;
    const baseFov = s.fov;
    const fov = lerp(baseFov, baseFov / def.zoom, adsAmt) + (this.sprinting ? 6 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 16, dt); cam.updateProjectionMatrix(); }
    Audio.listener.x = a.pos.x; Audio.listener.z = a.pos.z; Audio.listener.yaw = a.yaw;
    if (inp.pressed.has('swap')) this.requestSwitch(1 - this.cur);
    if (inp.pressed.has('slot1')) this.requestSwitch(0);
    if (inp.pressed.has('slot2')) this.requestSwitch(1);
    if (inp.pressed.has('reload')) this.startReload();
    if (this.switchT > 0) {
      const half = 0.21; const before = this.switchT; this.switchT -= dt;
      if (this.switchTo >= 0 && before > half && this.switchT <= half) { const to = this.switchTo; this.equip(to, true); this.switchT = half; }
    }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { const need = def.mag - slot.mag, take = Math.min(need, slot.reserve); slot.mag += take; slot.reserve -= take; Hud.weapon(); }
    }
    const canAds = !this.sprinting && this.reloadT <= 0 && this.switchT <= 0;
    this.adsT = damp(this.adsT, inp.ads && canAds ? 1 : 0, def.scope ? 14 : 18, dt);
    $('#scope').classList.toggle('on', !!def.scope && this.adsT > 0.85);
    World.vmVisible = !(def.scope && this.adsT > 0.85);
    this.fireCd -= dt;
    let wantFire = inp.fire;
    if (Input.st.touch && s.autoFire && !wantFire && this.assistTarget && this.assistOnTarget) wantFire = true;
    if (wantFire && !this.sprinting && this.switchT <= 0) {
      if (this.reloadT <= 0 && slot.mag > 0) {
        if (this.fireCd <= 0 && (def.auto || !this.triggerHeld)) this.fire();
      } else if (slot.mag <= 0 && !this.triggerHeld) { if (slot.reserve > 0) this.startReload(); else Audio.click(); }
      this.triggerHeld = true;
    } else this.triggerHeld = false;
    const moving = clamp(hSpeed / 4.2, 0, 1.5);
    this.bloom = Math.max(0, this.bloom - dt * 0.12);
    this.spreadNow = (lerp(def.spread, def.adsSpread, this.adsT) * (1 + moving * 1.2) * (a.crouching ? 0.7 : 1) * (this.onGround ? 1 : 2.4)) + this.bloom;
    if (Game.mode.regen && a.hp < a.maxHp && Game.time - a.lastHurt > 4.5) a.hp = Math.min(a.maxHp, a.hp + Game.mode.regen * dt);
    this.updateViewmodel(dt, inp);
    this.updateInteract(dt, inp);
  },
  requestSwitch(i) {
    if (i === this.cur || this.switchT > 0 || !this.slots[i]) return;
    this.switchT = 0.42; this.switchTo = i; this.reloadT = 0;
  },
  aimAssist(dt) {
    this.assistT -= dt;
    const cam = World.camera;
    if (this.assistT <= 0) {
      this.assistT = 0.1; this.assistTarget = null; let best = 0.12;
      const fwd = cam.getWorldDirection(TMP.a || (TMP.a = _v1()));
      for (const b of Game.actors) {
        if (b === this.a || !b.alive || b.team === this.a.team) continue;
        const c = b.chest(TMP.b || (TMP.b = _v1()));
        const to = c.sub(cam.position); const dist = to.length(); if (dist > 45) continue; to.divideScalar(dist);
        const ang = Math.acos(clamp(fwd.dot(to), -1, 1));
        if (ang < best && World.los(cam.position, b.chest(TMP.c || (TMP.c = _v1())))) { best = ang; this.assistTarget = b; }
      }
    }
    this.assistOnTarget = false;
    if (!this.assistTarget || !this.assistTarget.alive) return 1;
    const c = this.assistTarget.chest(TMP.d || (TMP.d = _v1())).sub(cam.position);
    const wantYaw = Math.atan2(-c.x, -c.z), wantPitch = Math.atan2(c.y, Math.hypot(c.x, c.z));
    const dy = wrapAngle(wantYaw - this.a.yaw), dp = wantPitch - this.a.pitch;
    const pull = dt * (1.2 + this.adsT * 2.2);
    this.a.yaw += clamp(dy, -pull * 0.06, pull * 0.06) * 6;
    this.a.pitch += clamp(dp, -pull * 0.04, pull * 0.04) * 6;
    this.assistOnTarget = Math.abs(dy) < 0.03 && Math.abs(dp) < 0.05;
    return 0.55;
  },
  fire() {
    const a = this.a, def = this.weapon, slot = this.slot, cam = World.camera, T = THREE;
    slot.mag--; this.fireCd = 60 / def.rpm; this.shotsFired++; this.lastFireTime = Game.time;
    Audio.shot(def.snd, null, true);
    Game.noise(a, def.id === 'sniper' ? 18 : 14);
    const origin = cam.position.clone();
    const fwd = cam.getWorldDirection(new T.Vector3());
    const right = new T.Vector3().crossVectors(fwd, cam.up).normalize();
    const up = new T.Vector3().crossVectors(right, fwd).normalize();
    const pellets = def.pellets || 1; let anyHit = false, anyKill = false, anyHead = false;
    this.vmGun.updateMatrixWorld(true); const mz = this.vmGun.userData.muzzle.clone(); this.vmGun.localToWorld(mz);
    const muzzleWorld = origin.clone().addScaledVector(right, mz.x * 1.0).addScaledVector(up, mz.y * 1.0).addScaledVector(fwd, -mz.z * 1.0);
    FX.muzzleVM(mz, this.vmGun.getWorldQuaternion(new T.Quaternion()), def.pellets ? 0.13 : def.scope ? 0.12 : def.slot === 'secondary' ? 0.075 : 0.095);
    FX.smoke(muzzleWorld, def.pellets ? 0.16 : 0.1);
    const hitAcc = new Map();
    for (let p = 0; p < pellets; p++) {
      const sp = this.spreadNow; const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sp;
      const dir = fwd.clone().addScaledVector(right, Math.cos(ang) * r).addScaledVector(up, Math.sin(ang) * r).normalize();
      const wall = World.rayWalls(origin, dir, def.range, World.mapMeshes);
      const wallT = wall ? wall.distance : def.range;
      let best = null, bestA = null;
      for (const b of Game.actors) {
        if (b === a || !b.alive || b.team === a.team) continue;
        const h = rayVsSoldier(origin, dir, b, wallT);
        if (h && (!best || h.t < best.t)) { best = h; bestA = b; }
      }
      const end = origin.clone().addScaledVector(dir, best ? best.t : wallT);
      if (p === 0 || pellets < 4 || p % 3 === 0) FX.tracer(muzzleWorld, end, pellets > 1 ? 0.008 : 0.011);
      if (best) {
        const falloff = def.pellets ? clamp(1.2 - best.t / def.range, 0.5, 1) : best.t > def.range * 0.6 ? 0.8 : 1;
        const dmg = def.dmg * falloff * (best.head ? def.head : 1);
        hitAcc.set(bestA, (hitAcc.get(bestA) || 0) + dmg); if (best.head) anyHead = true;
        FX.spark(end, dir.clone().negate(), 4);
      } else if (wall) {
        const n = wall.face ? wall.face.normal.clone().transformDirection(wall.object.matrixWorld) : dir.clone().negate();
        if (n.dot(dir) > 0) n.negate();
        FX.decal(wall.point, n); FX.spark(wall.point, n, 5);
      }
    }
    for (const [b, dmg] of hitAcc) {
      anyHit = true;
      const killed = Combat.damage(b, dmg, a, anyHead, def.id);
      if (killed) anyKill = true;
    }
    Combat.shotFired(a, origin, fwd);
    if (anyHit) { this.shotsHit++; Hud.hitmarker(anyKill ? 'kill' : anyHead ? 'head' : ''); Audio.hit(anyHead); }
    const k = def.recoil * (a.crouching ? 0.75 : 1) * (1 - this.adsT * 0.35);
    const climb = k * rand(0.55, 0.85);
    this.a.pitch += climb * 0.3; this.recoilP = Math.min(0.12, this.recoilP + climb * 0.7); this.a.yaw += k * rand(-0.3, 0.3);
    this.bloom = Math.min(0.06, this.bloom + k * 0.35);
    this.kickZ += 0.045 + k; this.kickR += 0.06 + k * 2;
    Hud.weapon(); Hud.crosshairKick();
    if (slot.mag === 0 && slot.reserve > 0) setTimeout(() => { if (this.a && this.a.alive && this.slot === slot && slot.mag === 0) this.startReload(); }, 260);
  },
  updateViewmodel(dt, inp) {
    const def = this.weapon, g = this.vmGun; if (!g) return;
    const hip = def.hip, ads = def.adsPos, t = this.adsT;
    this.swayX = damp(this.swayX, clamp(-inp.lookX * 0.0009, -0.05, 0.05), 8, dt);
    this.swayY = damp(this.swayY, clamp(inp.lookY * 0.0009, -0.05, 0.05), 8, dt);
    this.kickZ = damp(this.kickZ, 0, 14, dt); this.kickR = damp(this.kickR, 0, 12, dt);
    const bobX = Math.cos(this.bob) * 0.012 * this.bobAmt * (1 - t * 0.85), bobY = Math.abs(Math.sin(this.bob)) * 0.014 * this.bobAmt * (1 - t * 0.85);
    let x = lerp(hip[0], ads[0], t) + this.swayX * (1 - t * 0.7) + bobX;
    let y = lerp(hip[1], ads[1], t) + this.swayY * (1 - t * 0.7) - bobY - this.landDip * 0.4;
    let z = lerp(hip[2], ads[2], t) + this.kickZ;
    let rx = this.kickR * (1 - t * 0.5), ry = 0, rz = 0;
    if (this.sprinting) { x -= 0.06; y -= 0.05; ry = 0.5; rz = 0.25; rx -= 0.15; }
    if (this.reloadT > 0) { const p = 1 - this.reloadT / def.reload; const k = Math.sin(clamp(p, 0, 1) * Math.PI); y -= 0.12 * k; rx -= 0.5 * k; rz += 0.35 * k; }
    if (this.switchT > 0) { const k = Math.sin(clamp(this.switchT / 0.42, 0, 1) * Math.PI); y -= 0.28 * k; rx -= 0.6 * k; }
    this.vmPose = this.vmPose || { x, y, z, rx, ry, rz };
    const P = this.vmPose, L = 18;
    P.x = damp(P.x, x, L, dt); P.y = damp(P.y, y, L, dt); P.z = damp(P.z, z, 30, dt);
    P.rx = damp(P.rx, rx, 22, dt); P.ry = damp(P.ry, ry, 10, dt); P.rz = damp(P.rz, rz, 10, dt);
    this.vmRoot.position.set(0, 0, 0);
    g.position.set(P.x, P.y, P.z); g.rotation.set(P.rx, P.ry, P.rz);
    this.armR.position.copy(g.position).add(new THREE.Vector3(0.025, -0.07, g.userData.box.max.z * 0.45));
    this.armR.rotation.set(P.rx + 0.2, P.ry - 0.15, P.rz);
    const isPistol = def.slot === 'secondary';
    this.armL.position.copy(g.position).add(new THREE.Vector3(isPistol ? -0.02 : -0.035, -0.06, isPistol ? g.userData.box.max.z * 0.35 : g.userData.box.min.z * 0.3));
    this.armL.rotation.set(P.rx + 0.3, P.ry + (isPistol ? 0.3 : 0.5), P.rz);
    if (this.reloadT > 0) this.armL.position.y -= 0.05 * Math.sin((1 - this.reloadT / def.reload) * Math.PI);
  },
  updateInteract(dt, inp) {
    const it = Game.mode.interactable ? Game.mode.interactable(this.a) : null;
    Hud.interact(it, this.interactT);
    if (!it) { this.interactT = 0; return; }
    if (it.instant) { if (inp.pressed.has('interact') || it.auto) it.done(); return; }
    if (inp.interact) {
      this.interactT += dt;
      if (Game.time - this.a.lastHurt < 0.3) this.interactT = Math.max(0, this.interactT - dt * 3);
      if (this.interactT >= it.hold) { this.interactT = 0; it.done(); }
    } else this.interactT = Math.max(0, this.interactT - dt * 2);
  },
  die(killer) {
    this.deathT = 0; this.killer = killer;
    World.vmVisible = false; $('#scope').classList.remove('on'); this.adsT = 0;
    if (this.agent) this.agent.teleport({ x: 0, y: -50, z: 0 });
  },
  updateDead(dt) {
    this.deathT += dt;
    const cam = World.camera, a = this.a;
    const k = clamp(this.deathT / 0.8, 0, 1);
    const spec = Game.mode.spectateTarget ? Game.mode.spectateTarget() : null;
    if (spec && this.deathT > 2.2) {
      const p = spec.pos; const back = 3.2;
      const tx = p.x + Math.sin(spec.yaw) * -back, tz = p.z + Math.cos(spec.yaw) * -back;
      cam.position.x = damp(cam.position.x, tx, 4, dt); cam.position.z = damp(cam.position.z, tz, 4, dt); cam.position.y = damp(cam.position.y, 2.4, 4, dt);
      cam.lookAt(p.x, 1.4, p.z);
      return;
    }
    cam.position.set(a.pos.x, a.pos.y + lerp(1.6, 0.35, k * k), a.pos.z);
    let yaw = a.yaw, pitch = lerp(a.pitch, -0.4, k);
    if (this.killer && this.killer.alive && this.deathT > 0.6) {
      const kp = this.killer.pos; const want = Math.atan2(-(kp.x - a.pos.x), -(kp.z - a.pos.z));
      a.yaw += wrapAngle(want - a.yaw) * Math.min(1, dt * 3); yaw = a.yaw; pitch = lerp(pitch, 0.15, clamp((this.deathT - 0.6) * 2, 0, 1));
    }
    cam.rotation.set(pitch, yaw, lerp(0, 0.5, k));
  },
};

const Combat = {
  shotFired(shooter, origin, dir) {
    for (const o of Game.actors) {
      if (!o.bot || !o.alive || o.team === shooter.team) continue;
      const dx = o.pos.x - origin.x, dy = o.pos.y + 1.2 - origin.y, dz = o.pos.z - origin.z, L = Math.hypot(dx, dy, dz);
      if (L > 60 || (dx * dir.x + dy * dir.y + dz * dir.z) / L < 0.985) continue;
      o.bot.underFire(shooter);
    }
  },
  damage(victim, amount, attacker, head, weaponId) {
    if (!victim.alive || Game.over) return false;
    if (victim.protectedNow) return false;
    if (attacker && attacker !== victim && attacker.team === victim.team) return false;
    if (victim.armor) amount *= victim.armor;
    victim.hp -= amount; victim.lastHurt = Game.time;
    if (victim.isPlayer) { Hud.hurt(attacker, amount); Audio.hurt(); }
    if (victim.bot) victim.bot.onHurt(attacker);
    if (victim.hp > 0) return false;
    victim.hp = 0; victim.alive = false; victim.deaths++;
    if (attacker && attacker !== victim) { attacker.kills++; if (head) attacker.headshots++; }
    if (victim.carrying) Game.mode.dropCarry && Game.mode.dropCarry(victim);
    if (victim.bot) victim.bot.die();
    if (victim.isPlayer) Player.die(attacker);
    Hud.killfeed(attacker, victim, weaponId, head);
    if (attacker && attacker.isPlayer) {
      Hud.pop(head ? t('headshot') : t('eliminated'), head ? 150 : 100, head); Audio.kill();
      if (Game.time - Game.lastKillT < 4) Game.multiKills++;
      Game.lastKillT = Game.time;
    }
    Game.mode.onKill(attacker, victim, head);
    if (victim.isPlayer && victim.out && Game.mode && Game.mode.m.deaths && !Game.over) Game.playerOut();
    return true;
  },
};

let AI = null;
const WallObstacle = {
  _o: null, _d: null,
  lineOfSightTest(ray, out) {
    const o = this._o || (this._o = new THREE.Vector3()), d = this._d || (this._d = new THREE.Vector3());
    o.set(ray.origin.x, ray.origin.y, ray.origin.z); d.set(ray.direction.x, ray.direction.y, ray.direction.z);
    const hit = World.rayWalls(o, d, 90);
    if (!hit) return null;
    out.set(hit.point.x, hit.point.y, hit.point.z);
    return out;
  },
};
function defineAI() {
  const Y = window.YUKA;
  class Patrol extends Y.State {
    enter(b) { b.goalT = 0; b.stuckT = 0; b.pauseT = 0; b.setSpeed(b.walkSpeed); }
    execute(b) {
      if (b.target) { b.brain.changeTo('engage'); return; }
      const heard = b.bestMemory();
      if (heard) { b.brain.changeTo('hunt'); return; }
      b.topUp();
      if (b.pauseT > 0) { b.pauseT -= b.dt; b.scan(); if (b.pauseT > 0) return; b.goalT = 0; }
      b.goalT -= b.dt;
      const v = b.agent ? b.agent.velocity() : { x: 0, z: 0 };
      b.stuckT = Math.hypot(v.x, v.z) < 0.15 ? b.stuckT + b.dt : 0;
      if (b.goalT <= 0 || b.arrived(1.2) || b.stuckT > 2.5) {
        if (b.goalIsPatrol && b.arrived(1.2) && b.goalT > 0) {
          b.goalIsPatrol = false; b.pauseT = rand(1, 2.5); b.startScan();
          if (b.agent) b.agent.resetMoveTarget();
          return;
        }
        b.stuckT = 0;
        const g = Game.mode.botGoal ? Game.mode.botGoal(b) : null;
        if (g) { b.moveTo(g.pos || g); b.setSpeed(g.run ? b.runSpeed : b.walkSpeed); b.goalT = g.hold ? 0.6 : 18; b.goalIsPatrol = !!g.patrol; if (!g.patrol) b.patrolCell = -1; }
        else { b.moveTo(Nav.patrolPoint(b, b.patrolZone)); b.setSpeed(b.walkSpeed); b.goalT = 22; b.goalIsPatrol = true; }
      }
    }
    exit(b) { b.pauseT = 0; b.patrolCell = -1; b.goalIsPatrol = false; }
  }
  class Hunt extends Y.State {
    enter(b) {
      b.searchT = 0; b.searchPts = 0; b.huntT = 0; b.huntPos = null;
      b.cautious = Game.time - b.a.lastHurt < 8;
      b.setSpeed(b.cautious ? b.walkSpeed * 1.4 : b.runSpeed);
    }
    execute(b) {
      if (b.target) { b.brain.changeTo('engage'); return; }
      const m = b.bestMemory();
      if (!m) { b.brain.changeTo('patrol'); return; }
      b.huntT += b.dt;
      const clue = m.lastSensedPosition;
      if (!b.huntPos || dist2D(clue, b.huntPos) > 2) {
        b.huntPos = { x: clue.x, y: clue.y, z: clue.z }; b.moveTo(b.huntPos); b.searchT = 0; b.searchPts = 0;
      }
      if (b.arrived(1.6)) {
        if (b.searchT === 0) b.startScan();
        b.searchT += b.dt; b.scan(); b.crouchWanted = b.cautious;
        if (b.searchT > 1.5) {
          if (b.searchPts < 2) { b.searchPts++; b.searchT = 0; b.crouchWanted = false; b.moveTo(Nav.randomAround(b.huntPos, 5)); b.setSpeed(b.walkSpeed * 1.3); }
          else { b.forget(m); b.brain.changeTo('patrol'); }
        }
      }
      if (b.huntT > 30) { b.forget(m); b.brain.changeTo('patrol'); }
      if (b.searchT > 0) b.topUp();
    }
    exit(b) { b.crouchWanted = false; }
  }
  class Engage extends Y.State {
    enter(b) { b.reactT = lerp(0.85, 0.18, b.skill) * rand(0.8, 1.3); b.strafeT = 0; b.assessT = 0; b.push = false; b.setSpeed(b.strafeSpeed); }
    execute(b) {
      const tg = b.target;
      if (!tg || !tg.alive) { b.target = null; b.brain.changeTo(b.bestMemory() ? 'hunt' : 'patrol'); return; }
      const d = dist2D(b.a.pos, tg.pos), def = WEAPONS[b.weaponId];
      b.faceTarget = tg;
      b.reactT -= b.dt;
      b.assessT -= b.dt;
      if (b.assessT <= 0) { b.assessT = 0.4; if (b.assess(tg, d)) return; }
      const lowMag = b.mag <= 0 || (def.mag > 5 && b.mag <= def.mag * 0.2 && b.fireCd <= 0 && b.burst <= 0);
      if (lowMag && b.reloadT <= 0 && d > 6 && Game.time - b.lastRetreat > 4 && b.tryRetreat('reload', tg)) return;
      const pref = def.pellets ? 5 : def.scope ? 22 : b.elite ? 9 : 12;
      b.strafeT -= b.dt;
      if (b.strafeT <= 0) {
        b.strafeT = b.elite ? rand(0.5, 1.2) : rand(1.0, 2.4);
        const toX = (tg.pos.x - b.a.pos.x) / (d || 1), toZ = (tg.pos.z - b.a.pos.z) / (d || 1);
        const side = Math.random() < 0.5 ? -1 : 1;
        let px = b.a.pos.x + -toZ * side * rand(1.5, 3.5), pz = b.a.pos.z + toX * side * rand(1.5, 3.5);
        if (b.a.carrying) { px -= toX * rand(3, 5); pz -= toZ * rand(3, 5); }
        else if (b.push && d > 3.5) { const k = Math.min(d - 3, rand(2.5, 4.5)); px += toX * k; pz += toZ * k; }
        else if (d > pref * 1.4) { px += toX * 3; pz += toZ * 3; } else if (d < pref * 0.55) { px -= toX * 2.5; pz -= toZ * 2.5; }
        const p = Nav.closest({ x: px, y: 0, z: pz }); if (p) b.moveTo(p);
        b.crouchWanted = b.push ? false : b.elite ? Math.random() < 0.35 : Math.random() < 0.12;
        if (!b.crouchWanted && Math.random() < (b.elite ? 0.18 : 0.08)) b.jump();
      }
      b.setSpeed(b.dodgeT > 0 ? b.runSpeed : b.push ? b.runSpeed * 0.8 : b.strafeSpeed);
      if (b.reactT <= 0) b.shootAt(tg);
    }
    exit(b) { b.faceTarget = null; b.crouchWanted = false; b.push = false; }
  }
  class Retreat extends Y.State {
    enter(b) {
      b.lastRetreat = Game.time; b.retreatT = 0; b.hiding = false; b.faceTarget = null; b.crouchWanted = false;
      b.setSpeed(b.runSpeed); b.target = null;
      b.moveTo(b.coverPos);
    }
    execute(b) {
      b.retreatT += b.dt;
      if (!b.hiding) {
        if (b.arrived(1.2) || b.retreatT > 6) {
          b.hiding = true;
          const r = b.retreatReason;
          b.hideT = r === 'reload' ? 0.6 : r === 'ambushed' ? rand(1.5, 3) : r === 'outnumbered' ? rand(3, 6) : b.elite ? rand(1.5, 2.5) : rand(3, 5);
          if (r === 'reload' && b.mag < WEAPONS[b.weaponId].mag) { b.reloadT = WEAPONS[b.weaponId].reload * 1.15; b.mag = WEAPONS[b.weaponId].mag; }
          if (b.agent) b.agent.resetMoveTarget();
          b.crouchWanted = true;
        }
        return;
      }
      if (b.reloadT <= 0) b.hideT -= b.dt;
      if (Game.time - b.a.lastHurt > 1.5) b.a.hp = Math.min(b.a.maxHp, b.a.hp + 5 * b.dt);
      const tg = b.target;
      if (tg && tg.alive) {
        b.faceTarget = tg; b.shootAt(tg);
        if (dist2D(tg.pos, b.a.pos) < 4) { b.brain.changeTo('engage'); return; }
      } else {
        b.faceTarget = null;
        if (b.threatPos) { b.lookYaw = Math.atan2(b.threatPos.x - b.a.pos.x, b.threatPos.z - b.a.pos.z); b.lookUntil = Game.time + 0.2; }
      }
      const healed = b.retreatReason !== 'hurt' || b.a.hp >= b.a.maxHp * 0.7 || b.hideT < -4;
      if (b.hideT <= 0 && healed) {
        const la = b.lastAttacker, r = la && la.alive && la.ent && b.memory.getRecord(la.ent);
        if (!(tg && tg.alive) && r) r.timeLastSensed = Game.time;
        b.brain.changeTo(tg && tg.alive ? 'engage' : b.bestMemory() ? 'hunt' : 'patrol');
      }
    }
    exit(b) { b.hiding = false; b.faceTarget = null; b.crouchWanted = false; b.setSpeed(b.strafeSpeed); }
  }
  class Dead extends Y.State { execute() {} }
  return { Patrol, Hunt, Engage, Retreat, Dead };
}

class Bot {
  constructor(actor, opts) {
    const T = THREE, Y = window.YUKA;
    this.a = actor; actor.bot = this;
    this.skill = opts.skill ?? 0.5; this.elite = !!opts.elite; this.weaponId = opts.weapon || 'ak47'; this.role = opts.role || 'free';
    this.patrolZone = opts.zone || null;
    this.walkSpeed = 1.6; this.runSpeed = this.elite ? 4.6 : 3.9; this.strafeSpeed = this.elite ? 3.4 : 2.5;
    this.dmgMul = opts.dmgMul ?? 1; this.visionRange = opts.visionRange || 42; this.hearMul = opts.hearMul || 1;
    this.bodies = [this.makeBody(), this.makeBody()];
    this.body = this.bodies[0]; this.corpse = null;
    this.bodies[1].root.visible = false; this.bodies[1].gun.visible = false;
    this.marker = new T.Sprite(new T.SpriteMaterial({ map: Tex.chevron, depthTest: false, transparent: true }));
    this.marker.scale.setScalar(0.24); this.marker.position.y = 2.05; this.marker.renderOrder = 10; this.marker.visible = false; this.root.add(this.marker);
    this.mixAcc = 0;
    this.ent = actor.ent = new Y.GameEntity();
    this.vision = new Y.Vision(this.ent); this.vision.range = this.visionRange; this.vision.fieldOfView = Math.PI * (this.elite ? 0.8 : 0.66); this.vision.addObstacle(WallObstacle);
    this.memory = new Y.MemorySystem(this.ent); this.memory.memorySpan = this.elite ? 9 : 6;
    this.brain = new Y.StateMachine(this);
    this.brain.add('patrol', new AI.Patrol()); this.brain.add('hunt', new AI.Hunt()); this.brain.add('engage', new AI.Engage());
    this.brain.add('retreat', new AI.Retreat()); this.brain.add('dead', new AI.Dead());
    this.perceiveT = Math.random() * 0.2; this.records = [];
    this.agent = null; this.target = null; this.faceTarget = null; this.dt = 0; this.yaw = 0; this.aimPitch = 0;
    this.fireCd = 0; this.burst = 0; this.mag = WEAPONS[this.weaponId].mag; this.reloadT = 0; this.repathT = 0; this.lastRetreat = -99;
    this.stepAcc = 0; this.lastPos = new T.Vector3(); this.corpseT = 0;
    this.lookYaw = 0; this.lookUntil = 0; this.scanBase = 0; this.scanT0 = 0; this.pauseT = 0; this.patrolCell = -1; this.goalIsPatrol = false; this.skipCells = new Set(); this.cellT = 0; this.push = false;
    this.jumpT = 0; this.jumpY = 0; this.jumpV = 0; this.dodgeT = 0; this.dodgeCd = 0; this.lastUnderFire = -99;
    this._yv = new Y.Vector3();
  }
  get pos() { return this.a.pos; }
  makeBody() {
    const T = THREE, s = Models.soldier();
    const root = new T.Group(); root.add(s.model); World.scene.add(root);
    const blob = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), new T.MeshBasicMaterial({ map: Tex.blob, transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; root.add(blob);
    const gun = Models.gun(this.weaponId); World.scene.add(gun);
    const mixer = new T.AnimationMixer(s.model), actions = {};
    for (const clip of Assets.npc.animations) actions[clip.name] = mixer.clipAction(clip);
    actions.death.setLoop(T.LoopOnce, 1); actions.death.clampWhenFinished = true;
    return { root, model: s.model, hand: s.hand, soldier: s, gun, mixer, actions, anim: null, corpseT: 0 };
  }
  get root() { return this.body.root; } get model() { return this.body.model; } get hand() { return this.body.hand; }
  get soldier() { return this.body.soldier; } get gun() { return this.body.gun; }
  get mixer() { return this.body.mixer; } get actions() { return this.body.actions; }
  get anim() { return this.body.anim; } set anim(v) { this.body.anim = v; }
  updateCorpse(dt) {
    const c = this.corpse; c.corpseT += dt;
    c.mixer.update(dt); this.placeGunOn(c, false);
    if (c.corpseT > 4) c.root.position.y -= dt * 0.75;
    if (c.corpseT > 4.8) { c.root.visible = false; c.gun.visible = false; c.root.position.y = 0; this.corpse = null; }
  }
  spawn(pos, yaw = rand(0, 6.28)) {
    if (this.corpse === this.body) { this.body = this.bodies[this.bodies.indexOf(this.body) ^ 1]; this.root.add(this.marker); }
    if (this.corpse === this.body) { this.corpse.root.visible = false; this.corpse.gun.visible = false; this.corpse = null; }
    this.root.position.set(pos.x, pos.y || 0, pos.z); this.root.rotation.y = yaw;
    const a = this.a;
    a.alive = true; a.hp = a.maxHp; a.spawnTime = Game.time; a.pos.set(pos.x, pos.y || 0, pos.z); this.yaw = yaw; a.yaw = yaw;
    if (!this.agent) this.agent = Nav.crowd.addAgent(a.pos, { radius: 0.38, height: 1.8, maxAcceleration: 16, maxSpeed: this.walkSpeed, collisionQueryRange: 2.5, pathOptimizationRange: 12, separationWeight: 1.5 });
    else this.agent.teleport(a.pos);
    this.target = null; this.lastRetreat = -99; this.mag = WEAPONS[this.weaponId].mag; this.reloadT = 0; this.corpseT = 0;
    this.memory.clear ? this.memory.clear() : (this.memory.records.length = 0, this.memory.recordsMap.clear());
    this.root.visible = true; this.gun.visible = true;
    this.mixer.stopAllAction(); this.anim = null; this.play('aim_idle');
    this.lookUntil = 0; this.pauseT = 0; this.patrolCell = -1; this.goalIsPatrol = false; this.push = false; this.lastAttacker = null;
    this.jumpT = 0; this.jumpY = 0; this.dodgeT = 0; this.dodgeCd = 0; this.lastUnderFire = -99;
    this.skipCells.clear(); if (Nav.cells) for (let i = 0; i < Nav.cells.length; i++) if (Math.random() < 0.12) this.skipCells.add(i);
    this.brain.currentState = null; this.brain.changeTo('patrol');
    this.marker.visible = Game.player && a.team === Game.player.team;
    Models.setArmLight(this.soldier, !!(Game.player && a.team === Game.player.team));
    for (const l of this.soldier.armLights) { l.band.visible = true; l.halo.visible = true; }
    this.lastPos.copy(a.pos);
  }
  die() {
    this.brain.changeTo('dead');
    if (this.agent) { Nav.crowd.removeAgent(this.agent); this.agent = null; }
    this.play('death', 0.12); this.target = null; this.marker.visible = false; this.corpseT = 0;
    if (this.corpse && this.corpse !== this.body) { this.corpse.root.visible = false; this.corpse.gun.visible = false; }
    this.corpse = this.body; this.body.corpseT = 0;
    for (const l of this.soldier.armLights) { l.band.visible = false; l.halo.visible = false; }
  }
  despawn() {
    if (this.agent) { Nav.crowd.removeAgent(this.agent); this.agent = null; }
    for (const b of this.bodies) { World.scene.remove(b.root); World.scene.remove(b.gun); }
  }
  setSpeed(v) { if (this.agent) this.agent.maxSpeed = v; }
  moveTo(p) { if (!this.agent || !p) return; this.agent.requestMoveTarget(p); this.dest = { x: p.x, z: p.z }; }
  arrived(r) { return !this.dest || Math.hypot(this.dest.x - this.a.pos.x, this.dest.z - this.a.pos.z) < r; }
  play(name, fade = 0.22) {
    const act = this.actions[name]; if (!act || this.anim === act) return;
    act.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (this.anim) this.anim.fadeOut(fade);
    this.anim = act;
  }
  onHurt(attacker) {
    this.lastAttacker = attacker;
    if (!this.a.alive || this.a.hp <= 0) return;
    const seen = !!attacker && this.target === attacker;
    let rec = null;
    if (attacker && attacker.ent && attacker.alive && !seen) {
      rec = this.sense(attacker, false);
      const q = rec.lastSensedPosition;
      this.lookYaw = Math.atan2(q.x - this.a.pos.x, q.z - this.a.pos.z); this.lookUntil = Game.time + 1.2;
    }
    if (this.shouldRetreat() && this.tryRetreat('hurt', seen ? attacker : null)) return;
    if (seen) this.underFire(attacker);
    const st = this.brain.currentState;
    if (!seen && rec && !(st instanceof AI.Retreat) && !(st instanceof AI.Engage) && Game.time - this.lastRetreat > 5 && Math.random() < (this.elite ? 0.45 : 0.7)) this.tryRetreat('ambushed', null);
  }
  shouldRetreat() {
    const st = this.brain.currentState;
    if (!this.a.alive || st instanceof AI.Retreat || st instanceof AI.Dead) return false;
    return this.a.hp < this.a.maxHp * (this.elite ? 0.35 : 0.45) && Game.time - this.lastRetreat > 6;
  }
  underFire(shooter) {
    this.lastUnderFire = Game.time;
    if (!this.a.alive || this.target !== shooter || Game.time < this.dodgeCd) return;
    this.dodgeCd = Game.time + (this.elite ? rand(0.5, 1.0) : rand(0.8, 1.6));
    if (Math.random() > 0.45 + this.skill * 0.4 + (this.elite ? 0.15 : 0)) return;
    if (this.brain.currentState instanceof AI.Retreat) { if (!this.hiding && Math.random() < 0.5) this.jump(); return; }
    this.dodge(shooter);
  }
  dodge(shooter) {
    const a = this.a.pos, dx = shooter.pos.x - a.x, dz = shooter.pos.z - a.z, d = Math.hypot(dx, dz) || 1;
    const side = Math.random() < 0.5 ? -1 : 1, r = rand(2, 3.5);
    const p = Nav.closest({ x: a.x - (dz / d) * side * r, y: 0, z: a.z + (dx / d) * side * r });
    if (p) { this.moveTo(p); this.dodgeT = 0.7; this.strafeT = Math.max(this.strafeT || 0, 0.7); this.crouchWanted = false; }
    if (Math.random() < (this.elite ? 0.45 : 0.3)) this.jump();
  }
  jump() {
    if (this.jumpT > 0) return;
    this.crouchWanted = false; this.a.crouching = false;
    this.jumpT = 1e-4; this.jumpV = rand(3.6, 4.3);
  }
  threatPosOf(actor) {
    if (!actor) { const m = this.bestMemory(); return m ? m.lastSensedPosition : null; }
    if (this.target === actor) return actor.pos;
    const r = actor.ent && this.memory.getRecord(actor.ent);
    return r && Game.time - r.timeLastSensed < this.memory.memorySpan ? r.lastSensedPosition : null;
  }
  tryRetreat(reason, threat) {
    const st = this.brain.currentState;
    if (st instanceof AI.Retreat || st instanceof AI.Dead) return false;
    const tp = this.threatPosOf(threat || this.lastAttacker);
    const c = this.findCover(tp);
    if (!c.hidden && !(reason === 'hurt' && c.away)) { this.lastRetreat = Game.time; return false; }
    this.retreatReason = reason; this.coverPos = c.pos; this.threatPos = tp ? { x: tp.x, y: tp.y, z: tp.z } : null;
    this.brain.changeTo('retreat');
    return true;
  }
  assess(tg, d) {
    const a = this.a; let foes = 0, allies = 0;
    for (const r of this.memory.records) if (r.visible && r.actor && r.actor.alive) foes++;
    for (const o of Game.actors) if (o !== a && o.alive && o.team === a.team && dist2D(o.pos, a.pos) < 12) allies++;
    const hp = a.hp / a.maxHp;
    if (foes >= 2 && allies === 0 && hp < 0.75 && Game.time - this.lastRetreat > 6 && this.tryRetreat('outnumbered', tg)) return true;
    const tgReloading = d < 18 && (tg.isPlayer ? Player.reloadT > 0 || Player.switchT > 0 : !!(tg.bot && tg.bot.reloadT > 0));
    this.push = !a.carrying && (tg.hp < tg.maxHp * 0.35 || tgReloading || (allies >= foes + 1 && hp > 0.6));
    return false;
  }
  topUp() {
    const def = WEAPONS[this.weaponId];
    if (this.reloadT <= 0 && this.mag < def.mag * 0.6) { this.reloadT = def.reload * 1.15; this.mag = def.mag; }
  }
  startScan() { this.scanBase = this.yaw; this.scanT0 = Game.time; }
  scan() { this.lookYaw = this.scanBase + Math.sin((Game.time - this.scanT0) * 1.7) * 1.2; this.lookUntil = Game.time + 0.15; }
  findCover(tp) {
    const a = this.a.pos, eye = tp ? new THREE.Vector3(tp.x, (tp.y || 0) + 1.5, tp.z) : null, probe = new THREE.Vector3();
    const away = tp ? Math.atan2(a.x - tp.x, a.z - tp.z) : rand(0, Math.PI * 2);
    let best = null, bestScore = Infinity;
    for (let i = 0; i < 14; i++) {
      const ang = away + rand(-1.3, 1.3), r = rand(5, 16);
      const c = Nav.closest({ x: a.x + Math.sin(ang) * r, y: 0, z: a.z + Math.cos(ang) * r });
      if (!c) continue;
      probe.set(c.x, 1.3, c.z);
      const hidden = !eye || !World.los(eye, probe);
      const closer = tp && dist2D(c, tp) < dist2D(a, tp);
      const score = dist2D(c, a) + (hidden ? 0 : 100) + (closer ? 50 : 0);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (!best) return { pos: Nav.randomAround(a, 10), hidden: false, away: false };
    return { pos: best, hidden: bestScore < 100, away: !tp || dist2D(best, tp) > dist2D(a, tp) + 4 };
  }
  sense(actor, visible, exact) {
    let r = this.memory.getRecord(actor.ent);
    if (!r) { this.memory.createRecord(actor.ent); r = this.memory.getRecord(actor.ent); r.actor = actor; }
    if (!visible && r.visible && Game.time - r.timeLastSensed < 0.4) return r;
    r.timeLastSensed = Game.time;
    if (visible || exact) r.lastSensedPosition.set(actor.pos.x, actor.pos.y, actor.pos.z);
    else {
      const err = (1 + dist2D(actor.pos, this.a.pos) * 0.18) * rand(0.6, 1), ang = rand(0, Math.PI * 2);
      const g = Nav.closest({ x: actor.pos.x + Math.sin(ang) * err, y: actor.pos.y, z: actor.pos.z + Math.cos(ang) * err }) || actor.pos;
      r.lastSensedPosition.set(g.x, g.y, g.z);
    }
    if (visible && !r.visible) r.timeBecameVisible = Game.time;
    r.visible = !!visible;
    return r;
  }
  forget(rec) { rec.timeLastSensed = -99; rec.visible = false; }
  bestMemory() {
    let best = null, bd = Infinity;
    for (const r of this.memory.records) {
      if (Game.time - r.timeLastSensed > this.memory.memorySpan || !r.actor || !r.actor.alive) continue;
      const d = dist2D(r.lastSensedPosition, this.a.pos); if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
  perceive() {
    const a = this.a, y = this._yv;
    this.ent.position.set(a.pos.x, a.pos.y + 1.5, a.pos.z);
    this.ent.rotation.fromEuler(0, this.yaw, 0);
    this.vision.fieldOfView = Math.PI * (this.elite ? 0.8 : 0.66);
    let best = null, bestScore = Infinity;
    for (const o of Game.actors) {
      if (!o.alive || o.team === a.team || !o.ent) continue;
      const d = dist2D(o.pos, a.pos);
      let range = this.visionRange;
      if (o.isPlayer && o.crouching && Game.time - Player.lastFireTime > 2) range *= 0.6;
      if (d > range) { const r = this.memory.getRecord(o.ent); if (r) r.visible = false; continue; }
      y.set(o.pos.x, o.pos.y + (o.crouching ? 1.0 : 1.35), o.pos.z);
      const vis = this.vision.visible(y);
      if (vis) {
        this.sense(o, true);
        let score = d;
        if (o.carrying) score *= 0.4;
        if (o === this.lastAttacker) score *= 0.7;
        if (score < bestScore) { bestScore = score; best = o; }
      } else { const r = this.memory.getRecord(o.ent); if (r) r.visible = false; }
    }
    this.target = best;
  }
  shootAt(tg) {
    const def = WEAPONS[this.weaponId];
    if (this.reloadT > 0) return;
    if (this.fireCd > 0) return;
    if (this.mag <= 0) { this.reloadT = def.reload * 1.15; this.mag = def.mag; return; }
    const want = Math.atan2(tg.pos.x - this.a.pos.x, tg.pos.z - this.a.pos.z);
    if (Math.abs(wrapAngle(want - this.yaw)) > 0.35) return;
    this.mag--; this.lastShot = Game.time;
    if (def.auto) { if (this.burst <= 0) this.burst = randi(3, this.elite ? 8 : 6); this.burst--; this.fireCd = 60 / def.rpm * 1.05; if (this.burst <= 0) this.fireCd += rand(0.25, 0.7) * (1.3 - this.skill); }
    else this.fireCd = 60 / def.rpm * rand(1.25, 1.8) + (1 - this.skill) * 0.25;
    this.placeGun(); this.gun.updateMatrixWorld(true); const muzzle = this.gun.userData.muzzle.clone(); this.gun.localToWorld(muzzle);
    FX.flash(muzzle, def.pellets ? 0.6 : 0.42, this.gun.quaternion);
    Audio.shot(def.snd, this.a.pos);
    Game.noise(this.a, 12);
    const d = dist2D(this.a.pos, tg.pos);
    let p = 0.16 + 0.6 * this.skill;
    p *= clamp(1.25 - d / (def.range * 0.55), 0.18, 1);
    if (tg.isPlayer) {
      const sp = Math.hypot(Player.vel.x, Player.vel.z);
      p *= sp > 3.5 ? 0.6 : sp > 1 ? 0.8 : 1;
      if (tg.crouching) p *= 0.85;
      if (!Player.onGround) p *= 0.7;
    }
    const bv = this.agent ? this.agent.velocity() : { x: 0, z: 0 };
    if (Math.hypot(bv.x, bv.z) > 1) p *= this.elite ? 0.92 : 0.78;
    if (this.jumpT > 0) p *= 0.55;
    const rec = tg.ent && this.memory.getRecord(tg.ent);
    if (rec && Game.time - rec.timeBecameVisible < 0.6) p *= 0.5;
    const chest = tg.chest(new THREE.Vector3());
    const pellets = def.pellets || 1; let total = 0, head = false;
    for (let i = 0; i < pellets; i++) {
      if (Math.random() < p * (def.pellets ? 0.8 : 1)) {
        const h = Math.random() < 0.06 + this.skill * 0.1;
        total += (def.botDmg || def.dmg) * (h ? (tg.isPlayer ? 1.5 : def.head) : 1); if (h) head = true;
      }
    }
    if (total > 0) {
      FX.tracer(muzzle, chest.clone().add(new THREE.Vector3(rand(-0.15, 0.15), rand(-0.2, 0.2), rand(-0.15, 0.15))));
      Combat.damage(tg, total * (tg.isPlayer ? this.dmgMul * Game.mode.botDamageMul : 1), this.a, head, this.weaponId);
    } else {
      if (tg.bot && tg.alive) tg.bot.underFire(this.a);
      const miss = chest.clone().add(new THREE.Vector3(rand(-1.2, 1.2), rand(-0.6, 1.0), rand(-1.2, 1.2)));
      const dir = miss.clone().sub(muzzle).normalize();
      const hit = World.rayWalls(muzzle, dir, 60, World.mapMeshes);
      const end = hit ? hit.point : muzzle.clone().addScaledVector(dir, 60);
      FX.tracer(muzzle, end);
      if (hit && dist2D(hit.point, World.camera.position) < 25) { const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate(); if (n.dot(dir) > 0) n.negate(); FX.decal(hit.point, n); FX.spark(hit.point, n, 3); }
    }
  }
  update(dt, camPos) {
    const a = this.a; this.dt = dt;
    if (this.corpse) this.updateCorpse(dt);
    if (!a.alive) return;
    if (this.agent) { const p = this.agent.position(); a.pos.set(p.x, p.y, p.z); }
    if (this.jumpT > 0) {
      this.jumpT += dt; this.jumpY = this.jumpV * this.jumpT - 7 * this.jumpT * this.jumpT;
      if (this.jumpY <= 0) { this.jumpT = 0; this.jumpY = 0; Audio.step(a.pos, false, false); } else a.pos.y += this.jumpY;
    }
    if (this.dodgeT > 0) this.dodgeT -= dt;
    this.repathT -= dt; this.fireCd -= dt; if (this.reloadT > 0) this.reloadT -= dt;
    this.perceiveT -= dt;
    if (this.perceiveT <= 0) { this.perceiveT = this.elite ? 0.12 : 0.2; this.perceive(); }
    this.brain.update();
    this.cellT -= dt;
    if (this.cellT <= 0 && Nav.cells) { this.cellT = 0.5; const ci = Nav.cellAt(a.pos.x, a.pos.z); if (ci >= 0) Nav.visits(a.team)[ci] = Game.time; }
    if (this.elite && a.hp < a.maxHp && Game.time - a.lastHurt > 3) a.hp = Math.min(a.maxHp, a.hp + 14 * dt);
    else if (Game.mode.regen && a.hp < a.maxHp && Game.time - a.lastHurt > 6) a.hp = Math.min(a.maxHp, a.hp + Game.mode.regen * 0.5 * dt);
    const v = this.agent ? this.agent.velocity() : { x: 0, z: 0 };
    const speed = Math.hypot(v.x, v.z);
    let wantYaw = this.yaw;
    if (this.faceTarget && this.faceTarget.alive) {
      wantYaw = Math.atan2(this.faceTarget.pos.x - a.pos.x, this.faceTarget.pos.z - a.pos.z);
      const dy = this.faceTarget.pos.y + (this.faceTarget.crouching ? 1.0 : 1.3) - (a.pos.y + 1.4);
      this.aimPitch = damp(this.aimPitch, Math.atan2(dy, dist2D(this.faceTarget.pos, a.pos)), 8, dt);
    } else {
      if (Game.time < this.lookUntil) wantYaw = this.lookYaw;
      else if (speed > 0.4) wantYaw = Math.atan2(v.x, v.z);
      this.aimPitch = damp(this.aimPitch, 0, 4, dt);
    }
    const turn = (this.elite ? 11 : 6.5) * dt;
    this.yaw += clamp(wrapAngle(wantYaw - this.yaw), -turn, turn);
    a.yaw = this.yaw;
    a.crouching = !!this.crouchWanted && speed < 1.2;
    this.root.position.copy(a.pos); this.root.rotation.y = this.yaw;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const fwd = v.x * sy + v.z * cy, side = v.x * -cy + v.z * sy;
    let anim = 'aim_idle', ts = 1;
    if (speed > 0.35) {
      if (Math.abs(fwd) >= Math.abs(side)) {
        if (fwd > 0) { if (speed > 2.4) { anim = 'run'; ts = speed / 2.6; } else { anim = a.crouching ? 'walk_crouch' : 'walk'; ts = speed / 0.8; } }
        else { if (speed > 2.2) { anim = 'run_back'; ts = speed / 1.5; } else { anim = 'walk_back'; ts = speed / 0.7; } }
      } else { anim = side > 0 ? 'strafe_right' : 'strafe_left'; ts = speed / 2.3; }
    } else if (a.crouching) { anim = 'walk_crouch'; ts = 0.0001; }
    if (this.jumpT > 0) { anim = 'run'; ts = 0.08; }
    this.play(anim);
    if (this.anim) this.anim.timeScale = clamp(ts, 0.0001, 1.8);
    const far = camPos && a.pos.distanceToSquared(camPos) > 30 * 30;
    this.mixAcc += dt;
    if (!far || this.mixAcc > 0.1) { this.mixer.update(this.mixAcc); this.mixAcc = 0; }
    this.placeGun();
    this.stepAcc += a.pos.distanceTo(this.lastPos); this.lastPos.copy(a.pos);
    if (this.stepAcc > (speed > 3 ? 2.0 : 1.5)) { this.stepAcc = 0; Audio.step(a.pos, false, a.crouching); }
  }
  placeGun() { this.placeGunOn(this.body, this.a.alive); }
  placeGunOn(body, alive) {
    if (!body.hand) return;
    const p = body.hand.getWorldPosition(TMP.e || (TMP.e = new THREE.Vector3()));
    const g = body.gun;
    g.position.copy(p);
    g.rotation.order = 'YXZ';
    if (alive) {
      g.rotation.set(this.aimPitch, this.yaw + Math.PI, 0);
      const len = g.userData.box.max.z - g.userData.box.min.z;
      g.translateZ(-len * 0.18); g.translateY(0.03);
    } else {
      const q = body.hand.getWorldQuaternion(new THREE.Quaternion()); g.quaternion.copy(q);
    }
  }
}

class Mode {
  constructor(m, index) {
    this.m = m; this.index = index; this.timeLimit = m.time || 0; this.respawn = true; this.respawnDelay = 3.5;
    this.regen = 22; this.botDamageMul = 0.55; this.events = 0; this.objectiveScore = 0; this.callIdx = 0;
    this.props = new THREE.Group(); World.scene.add(this.props);
  }
  get timeLeft() { return Math.max(0, this.timeLimit - Game.time); }
  callsign() { return CALLSIGNS[(this.callIdx++) % CALLSIGNS.length]; }
  makeBot(team, opts = {}) {
    const actor = new Actor({ name: opts.name || this.callsign(), team, hp: opts.hp || 160 });
    if (opts.armor) actor.armor = opts.armor;
    new Bot(actor, { skill: this.m.skill, ...opts });
    Game.actors.push(actor);
    return actor;
  }
  safeSpawn(actor, zone, minEnemyDist = 9) {
    let best = null, bestScore = -Infinity;
    const eye = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < 14; i++) {
      const p = Nav.randomInZone(zone);
      let nearest = Infinity, seen = false;
      for (const e of Game.actors) {
        if (!e.alive || e.team === actor.team) continue;
        const d = dist2D(e.pos, p); nearest = Math.min(nearest, d);
        if (d < 30 && !seen) { e.eye(eye); o.set(p.x, 1.5, p.z); if (World.los(eye, o)) seen = true; }
      }
      const score = Math.min(nearest, 30) - (seen ? 40 : 0) + rand(0, 3);
      if (score > bestScore) { bestScore = score; best = p; }
      if (!seen && nearest > minEnemyDist + 8) break;
    }
    return best || Nav.randomInZone(zone);
  }
  openYaw(p) {
    const o = new THREE.Vector3(p.x, 1.5, p.z), d = new THREE.Vector3();
    let best = 0, bestD = -1;
    for (let i = 0; i < 16; i++) {
      const yaw = (i / 16) * Math.PI * 2; d.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      const h = World.rayWalls(o, d, 40); const dist = (h ? h.distance : 40) + rand(0, 1.5);
      if (dist > bestD) { bestD = dist; best = yaw; }
    }
    return best;
  }
  faceCenter(p) { return this.openYaw(p); }
  spawnActor(actor, pos) {
    if (actor.isPlayer) Player.spawn(actor, pos, this.faceCenter(pos));
    else { const y = this.openYaw(pos); actor.bot.spawn(pos, Math.atan2(-Math.sin(y), -Math.cos(y))); }
  }
  zoneFor() { return null; }
  botGoal(b) {
    if (Math.random() >= (this.sweep ?? 0.5)) return null;
    const foe = Game.actors.find((a) => a.alive && a.team !== b.a.team);
    const zone = foe ? this.zoneFor(foe) : null;
    return { pos: Nav.patrolPoint(b, zone), run: b.elite || Math.random() < 0.3, patrol: true };
  }
  respawnActor(actor) { this.spawnActor(actor, this.safeSpawn(actor, this.zoneFor(actor))); }
  onKill(killer, victim) {
    if (this.respawn && victim.lives !== undefined) {
      if (victim.lives !== Infinity) victim.lives--;
      if (victim.lives > 0) victim.respawnAt = Game.time + (victim.isPlayer ? this.respawnDelay : this.respawnDelay + rand(0, 1.5));
      else victim.out = true;
    } else victim.out = true;
  }
  update() {
    for (const a of Game.actors) if (!a.alive && !a.out && a.respawnAt && Game.time >= a.respawnAt) { a.respawnAt = 0; this.respawnActor(a); }
    if (this.timeLimit && Game.time >= this.timeLimit) this.onTimeUp();
  }
  onTimeUp() { Game.finish(false, 'r_time'); }
  hud() { return {}; }
  stars(won) { return won ? 1 : 0; }
  finalScore(won) {
    const p = Game.player;
    return p.kills * 100 + p.headshots * 50 + this.objectiveScore + (won ? 1000 : 0);
  }
  dispose() { World.scene.remove(this.props); }
  intel() { return { teams: '—', time: this.timeLimit ? fmtTime(this.timeLimit) : '∞' }; }
}

class Extermination extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    for (let i = 0; i < 5; i++) { const b = this.makeBot('B', { weapon: pick(['ak47', 'ak47', 'pistol', 'm4']), dmgMul: 0.8 }); b.lives = Infinity; }
    this.spawnActor(p, Nav.randomInZone(MAP.zones.west));
    for (const a of Game.actors) if (!a.isPlayer) this.spawnActor(a, this.safeSpawn(a, null, 16));
    this.respawnDelay = 3; this.sweep = 0.75;
  }
  respawnActor(a) { this.spawnActor(a, a.isPlayer ? this.safeSpawn(a, null, 10) : this.safeSpawn(a, null, 16)); }
  onKill(k, v) { super.onKill(k, v); if (!v.isPlayer) v.respawnAt = Game.time + 1.5; }
  onTimeUp() { const k = Game.player.kills; Game.finish(k >= this.m.target, k >= this.m.target ? 'r_win' : 'r_score'); }
  hud() { return { clock: this.timeLeft, objective: t('o_ext', { k: Game.player.kills, t: this.m.target }) }; }
  stars() { const k = Game.player.kills, s = this.m.stars; return k >= s[2] ? 3 : k >= s[1] ? 2 : k >= s[0] ? 1 : 0; }
  intel() { return { teams: '1 vs ∞', time: fmtTime(this.timeLimit) }; }
}

class TeamDeathmatch extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    const n = this.m.teamSize || 3;
    for (let i = 0; i < n - 1; i++) this.makeBot('A', { weapon: pick(['ak47', 'm4']), zone: null });
    for (let i = 0; i < n; i++) this.makeBot('B', { weapon: pick(['ak47', 'm4', 'ak47', 'shotgun']), dmgMul: 0.8 });
    this.score = { A: 0, B: 0 };
    for (const a of Game.actors) { a.lives = Infinity; this.spawnActor(a, Nav.randomInZone(this.zoneFor(a))); }
    this.respawnDelay = 4; this.sweep = 0.55;
  }
  zoneFor(a) { return a.team === 'A' ? MAP.zones.west : MAP.zones.east; }
  onKill(k, v) {
    super.onKill(k, v);
    if (k && k.team !== v.team) this.score[k.team]++;
    const tgt = this.m.target;
    if (this.score.A >= tgt) Game.finish(true, 'r_win');
    else if (this.score.B >= tgt) Game.finish(false, 'r_enemyWin');
    else if (this.score.A === tgt - 5 && k && k.team === 'A') Hud.banner(t('b_lead'));
  }
  onTimeUp() { Game.finish(this.score.A > this.score.B, this.score.A > this.score.B ? 'r_win' : 'r_time'); }
  hud() { return { ally: this.score.A, enemy: this.score.B, clock: this.timeLeft, objective: t('o_tdm', { t: this.m.target }) }; }
  stars(won) { if (!won) return 0; const p = Game.player, kd = p.kills / Math.max(1, p.deaths); return kd >= 3 ? 3 : kd >= 1.5 ? 2 : 1; }
  intel() { return { teams: `${this.m.teamSize} vs ${this.m.teamSize}`, time: fmtTime(this.timeLimit) }; }
}

class Duel extends TeamDeathmatch {
  setup() {
    const p = Game.player; p.team = 'A'; p.lives = Infinity;
    const boss = this.makeBot('B', { name: 'THE MIMIC', weapon: 'm4', elite: true, hp: 300, armor: 0.8, skill: 1.0, dmgMul: 1.0, visionRange: 60, hearMul: 1.5 });
    boss.lives = Infinity;
    this.boss = boss;
    this.score = { A: 0, B: 0 };
    this.spawnActor(p, Nav.randomInZone(MAP.zones.west));
    this.spawnActor(boss, Nav.randomInZone(MAP.zones.east));
    this.respawnDelay = 3; this.botDamageMul = 0.72; this.sweep = 0.9;
  }
  respawnActor(a) { this.spawnActor(a, this.safeSpawn(a, null, 18)); }
  hud() { return { ally: this.score.A, enemy: this.score.B, clock: this.timeLeft, objective: t('o_duel', { t: this.m.target }) }; }
  stars(won) { if (!won) return 0; const m = this.score.A - this.score.B; return m >= 10 ? 3 : m >= 5 ? 2 : 1; }
  intel() { return { teams: '1 vs 1', time: fmtTime(this.timeLimit) }; }
}

class Keycard extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    const fin = !!this.m.finale;
    this.revealHostiles = !fin;
    p.lives = fin ? this.m.lives : Infinity;
    this.respawnDelay = 4; this.regen = fin ? 10 : 18; this.botDamageMul = fin ? 0.6 : 0.5; this.sweep = fin ? 0.3 : 0.12;
    const start = Nav.randomInZone(MAP.zones.west);
    this.spawnActor(p, start);
    const spots = this.findHidingSpots(start, fin);
    this.keys = spots.map((s, i) => {
      const g = Models.keycard(KEY_COLORS[i]); g.position.set(s.x, 0.06, s.z); g.rotation.y = rand(0, 6.28);
      this.props.add(g);
      return { pos: new THREE.Vector3(s.x, 0, s.z), obj: g, got: false, color: KEY_COLORS[i], beepT: 0 };
    });
    this.got = 0;
    const lift = pick(MAP.lifts); const c = Nav.closest({ x: lift.x, y: 0, z: lift.z });
    this.exit = new THREE.Vector3(c.x, 0, c.z);
    this.exitBeam = Models.beam(0x3df27a); this.exitBeam.position.set(c.x, 1.4, c.z); this.exitBeam.visible = false; this.props.add(this.exitBeam);
    const n = this.m.hostiles;
    for (let i = 0; i < n; i++) {
      const b = this.makeBot('B', { weapon: pick(fin ? ['m4', 'shotgun', 'ak47'] : ['ak47', 'pistol', 'ak47']), visionRange: fin ? 20 : 32, hearMul: fin ? 1.6 : 1, elite: false, dmgMul: fin ? 0.9 : 0.8 });
      b.lives = Infinity;
      this.spawnActor(b, this.safeSpawn(b, null, 18));
    }
    if (fin) { World.setLightsOut(true); setTimeout(() => Game.active && Hud.banner(t('b_lights'), t('b_hunt')), 600); }
    this.penalty = 0;
  }
  findHidingSpots(start, hard) {
    const dirs = []; for (let i = 0; i < 8; i++) dirs.push(new THREE.Vector3(Math.cos(i / 8 * Math.PI * 2), 0, Math.sin(i / 8 * Math.PI * 2)));
    const o = new THREE.Vector3(); const cands = [];
    for (let i = 0; i < 150; i++) {
      const p = Nav.random(); if (dist2D(p, start) < 14) continue;
      o.set(p.x, 0.5, p.z); let enc = 0, close = 0;
      for (const d of dirs) { const h = World.rayWalls(o, d, 6); if (h) { enc++; if (h.distance < 1.6) close++; } }
      cands.push({ x: p.x, z: p.z, score: enc + close * 1.5 + (hard ? dist2D(p, start) * 0.05 : rand(0, 2)) });
    }
    cands.sort((a, b) => b.score - a.score);
    const out = [];
    for (const c of cands) { if (out.every((q) => dist2D(q, c) > 14)) out.push(c); if (out.length === 3) break; }
    while (out.length < 3) out.push(Nav.random());
    return out;
  }
  zoneFor(a) { return a.isPlayer ? MAP.zones.west : null; }
  respawnActor(a) { if (a.isPlayer) { this.spawnActor(a, this.safeSpawn(a, MAP.zones.west, 12)); if (!this.m.finale) { this.penalty += 20; Hud.pop('+0:20', 0, false); } } else this.spawnActor(a, this.safeSpawn(a, null, 20)); }
  onKill(k, v) {
    super.onKill(k, v);
    if (!v.isPlayer) v.respawnAt = Game.time + (this.m.finale ? 14 : 22);
    if (v.isPlayer && v.out) Game.finish(false, 'r_dead');
  }
  update(dt) {
    super.update(dt);
    const p = Game.player;
    for (const k of this.keys) {
      if (k.got) continue;
      k.obj.rotation.y += dt * 1.6; k.obj.position.y = 0.06 + Math.sin(Game.time * 3) * 0.03 + 0.1;
      const d = dist2D(k.pos, p.pos);
      k.beepT -= dt;
      if (p.alive && d < 22 && k.beepT <= 0) { const inten = 1 - d / 22; k.beepT = lerp(1.6, 0.18, inten); Audio.beep(inten * 0.6, k.pos); }
    }
    if (this.got === 3) this.exitBeam.material.opacity = 0.16 + Math.sin(Game.time * 4) * 0.06;
  }
  interactable(a) {
    if (!a.alive) return null;
    for (const k of this.keys) {
      if (!k.got && dist2D(k.pos, a.pos) < 1.4) return { label: t('pickUp'), instant: true, auto: true, done: () => this.grab(k) };
    }
    if (this.got === 3 && dist2D(this.exit, a.pos) < 1.8) return { label: t('useExit'), hold: 1.2, done: () => { this.objectiveScore += 1500; Game.finish(true, 'r_extract'); } };
    return null;
  }
  grab(k) {
    k.got = true; this.got++; this.props.remove(k.obj); Audio.pickup(); this.objectiveScore += 400;
    Hud.banner(t('b_key'), `${this.got} / 3`); Hud.keys();
    if (this.got === 3) { this.exitBeam.visible = true; setTimeout(() => Game.active && Hud.banner(t('b_exit')), 1200); Audio.alarm(); }
  }
  get elapsed() { return Game.time + this.penalty; }
  hud() {
    return { clock: this.elapsed, countUp: true, objective: this.got < 3 ? t('o_key', { k: this.got }) : t('o_exit'), keys: true, lives: this.m.finale ? Game.player.lives : null };
  }
  markersNow() {
    const out = [];
    if (this.got === 3) out.push({ pos: this.exit, cls: 'exit', label: 'EXIT' });
    return out;
  }
  finalScore(won) {
    const base = super.finalScore(won);
    return base + (won ? Math.max(0, Math.round((this.m.finale ? 900 : 720) - this.elapsed) * 8) : 0);
  }
  stars(won) { if (!won) return 0; const e = this.elapsed, s = this.m.stars; return e <= s[1] ? 3 : e <= s[0] ? 2 : 1; }
  dispose() { super.dispose(); if (this.m.finale) World.setLightsOut(false); }
  intel() { return { teams: this.m.finale ? `1 vs ${this.m.hostiles} HUNTERS` : `1 vs ${this.m.hostiles}`, time: '∞' }; }
}

class Survival extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    this.respawn = false; this.regen = 9; this.botDamageMul = 0.6; this.sweep = 0.5;
    const zones = [MAP.zones.west, { x: [1, 14], z: [-9, 2] }, { x: [17, 30], z: [8, 20] }];
    this.zones = { A: zones[0], B: zones[1], C: zones[2] };
    this.ally = this.makeBot('A', { weapon: 'm4' });
    for (const team of ['B', 'C']) for (let i = 0; i < 2; i++) this.makeBot(team, { weapon: pick(['ak47', 'm4', 'shotgun']), dmgMul: 0.8 });
    for (const a of Game.actors) { a.lives = 1; this.spawnActor(a, Nav.randomInZone(this.zones[a.team])); }
  }
  aliveTeams() { const s = new Set(); for (const a of Game.actors) if (a.alive) s.add(a.team); return s; }
  onKill(k, v) {
    v.out = true;
    if (!Game.actors.some((a) => a.team === v.team && a.alive)) { if (v.team !== 'A') Hud.banner(t('b_squadOut')); this.objectiveScore += v.team !== 'A' ? 400 : 0; }
    if (v.isPlayer && this.ally.alive) setTimeout(() => Game.active && Hud.spectate(this.ally.name), 1800);
    const teams = this.aliveTeams();
    if (!teams.has('A')) Game.finish(false, 'r_dead');
    else if (teams.size === 1) Game.finish(true, 'r_win');
  }
  spectateTarget() { return this.ally.alive ? this.ally : null; }
  hud() { return { objective: t('o_surv', { n: this.aliveTeams().size }), clock: Game.time, countUp: true, lives: Game.player.alive ? 1 : 0 }; }
  stars(won) { if (!won) return 0; const p = Game.player; return p.alive && p.kills >= 3 ? 3 : p.alive ? 2 : 1; }
  intel() { return { teams: '2 vs 2 vs 2', time: '∞' }; }
}

class Briefcase extends Mode {
  setup() {
    const p = Game.player; p.team = 'P';
    this.respawn = true; this.respawnDelay = 4; this.regen = 9; this.botDamageMul = 0.6;
    for (let i = 0; i < this.m.ffa; i++) this.makeBot('F' + i, { weapon: pick(['ak47', 'm4', 'shotgun', 'ak47']), dmgMul: 0.75 });
    const spots = [];
    for (const a of Game.actors) {
      a.lives = Infinity;
      let pnt = Nav.random(), tries = 0;
      while (tries++ < 30 && spots.some((s) => dist2D(s, pnt) < 14)) pnt = Nav.random();
      spots.push(pnt); this.spawnActor(a, pnt);
    }
    this.case = Models.briefcase(); this.props.add(this.case);
    const c = Nav.closest({ x: 7.5, y: 0, z: 4 }); this.casePos = new THREE.Vector3(c.x, 0, c.z);
    this.holder = null; this.lastHolder = null; this.holdTime = 0; this.shareT = 0;
    this.case.position.copy(this.casePos);
  }
  respawnActor(a) { this.spawnActor(a, this.safeSpawn(a, null, 14)); }
  setHolder(a) {
    this.holder = a; this.lastHolder = a; a.carrying = this.case;
    if (a.isPlayer) { Hud.banner(t('b_case')); Audio.pickup(); this.objectiveScore += 300; }
  }
  dropCarry(a) {
    if (this.holder !== a) return; a.carrying = null; this.holder = null;
    this.casePos.set(a.pos.x, 0, a.pos.z); if (a.isPlayer) Hud.banner(t('b_caseLost'));
  }
  winner() { return this.holder || this.lastHolder; }
  onTimeUp() { const w = this.winner() === Game.player; Game.finish(w, w ? 'r_case' : 'r_time'); }
  update(dt) {
    super.update(dt);
    if (this.holder) {
      const h = this.holder;
      if (h.isPlayer) { this.case.visible = false; this.holdTime += dt; }
      else { this.case.visible = true; this.case.position.set(h.pos.x + Math.sin(h.yaw + 1.2) * 0.35, 0.75, h.pos.z + Math.cos(h.yaw + 1.2) * 0.35); this.case.rotation.y = h.yaw; }
      this.shareT -= dt;
      if (this.shareT <= 0) { this.shareT = 1; for (const a of Game.actors) if (a.bot && a.alive && a !== h) a.bot.sense(h, false, true); }
    } else {
      this.case.visible = true; this.case.position.set(this.casePos.x, 0.35 + Math.sin(Game.time * 2.5) * 0.06, this.casePos.z); this.case.rotation.y += dt;
      for (const a of Game.actors) if (a.alive && !a.isPlayer && dist2D(a.pos, this.casePos) < 1.3) { this.setHolder(a); break; }
    }
  }
  interactable(a) {
    if (!a.alive || this.holder) return null;
    if (dist2D(a.pos, this.casePos) < 1.4) return { label: t('pickUp'), instant: true, auto: true, done: () => this.setHolder(a) };
    return null;
  }
  nearestThreat(a) {
    let best = null, bd = Infinity;
    for (const o of Game.actors) { if (o === a || !o.alive) continue; const d = dist2D(o.pos, a.pos); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  botGoal(b) {
    const me = b.a;
    if (this.holder === me) {
      const th = this.nearestThreat(me);
      if (th && dist2D(th.pos, me.pos) > 16 && !World.los(th.eye(new THREE.Vector3()), me.chest(new THREE.Vector3()))) return { pos: me.pos, hold: true };
      return { pos: b.findCover(th ? th.pos : null).pos, run: true };
    }
    if (!this.holder) return { pos: this.casePos, run: true };
    if (this.holder.alive) return { pos: Nav.randomAround(this.holder.pos, 2), run: true };
    return null;
  }
  markersNow() {
    if (this.holder && this.holder.isPlayer) return [];
    return [{ pos: this.holder ? this.holder.pos : this.casePos, cls: 'case', label: this.holder ? this.holder.name : 'CASE', h: this.holder ? 2.2 : 0.8 }];
  }
  hud() {
    const obj = this.holder === Game.player ? t('o_briefYou') : this.holder ? t('o_brief', { h: esc(this.holder.name) }) : t('o_briefNone');
    return { clock: this.timeLeft, objective: obj };
  }
  finalScore(won) { return super.finalScore(won) + Math.round(this.holdTime * 10); }
  stars(won) { if (!won) return 0; return this.holdTime >= 120 ? 3 : this.holdTime >= 60 ? 2 : 1; }
  intel() { return { teams: `FFA · ${this.m.ffa + 1}`, time: fmtTime(this.timeLimit) }; }
}

class Siege extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    this.respawnDelay = 5; this.botDamageMul = 0.5;
    const n = this.m.teamSize;
    for (let i = 0; i < n - 1; i++) this.makeBot('A', { weapon: pick(['ak47', 'm4']), role: i < 3 ? 'attack' : 'defend' });
    for (let i = 0; i < n; i++) this.makeBot('B', { weapon: pick(['ak47', 'm4', 'shotgun']), role: i < 3 ? 'attack' : 'defend', dmgMul: 0.8 });
    this.switches = [];
    const mk = (pt, team) => {
      const c = Nav.closest({ x: pt.x, y: 0, z: pt.z });
      const col = team === 'A' ? 0x3d8bff : 0xff4a3d;
      const g = Models.switchPanel(col);
      g.position.set(c.x, 1.0, c.z); g.lookAt(MAP.lobby.x, 1.0, MAP.lobby.z); this.props.add(g);
      const beam = Models.beam(col); beam.position.set(c.x, 1.4, c.z); this.props.add(beam);
      const s = { team, pos: new THREE.Vector3(c.x, 0, c.z), obj: g, beam, pressed: false, progress: 0, end: pt.z < 0 ? 'N' : 'S' };
      this.switches.push(s); return s;
    };
    MAP.siege.blue.forEach((p2) => mk(p2, 'A')); MAP.siege.enemy.forEach((p2) => mk(p2, 'B'));
    for (const a of Game.actors) { a.lives = Infinity; this.spawnActor(a, Nav.randomInZone(this.zoneFor(a))); }
  }
  zoneFor(a) { return a.team === 'A' ? { x: [-24, -6], z: [8, 20] } : { x: [18, 30], z: [-8, 8] }; }
  pressedBy(team) { return this.switches.filter((s) => s.team !== team && s.pressed).length; }
  press(s, by) {
    s.pressed = true; s.progress = 0;
    s.obj.userData.btn.material.color.set(0x3df27a); s.obj.userData.glow.material.color.set(0x3df27a); s.beam.material.color.set(0x3df27a);
    Audio.alarm();
    if (by === 'A') { this.objectiveScore += 600; Hud.banner(t('b_button'), `${this.pressedBy('A')} / 2`); }
    else Hud.banner(t('b_lost'));
    if (this.pressedBy('A') >= 2) Game.finish(true, 'r_win');
    else if (this.pressedBy('B') >= 2) Game.finish(false, 'r_siegeLost');
  }
  update(dt) {
    super.update(dt);
    for (const s of this.switches) {
      if (s.pressed) continue;
      let channel = 0;
      for (const a of Game.actors) {
        if (!a.alive || a.isPlayer || a.team === s.team || dist2D(a.pos, s.pos) > 1.8) continue;
        channel = Math.max(channel, a.bot.target ? 0.5 : 1);
      }
      if (channel) { s.progress += channel * dt / (this.m.holdTime * 1.6); if (s.progress >= 1) this.press(s, s.team === 'A' ? 'B' : 'A'); }
      else if (!s.playerChannel) s.progress = Math.max(0, s.progress - dt * 0.2);
      s.playerChannel = false;
      s.beam.material.opacity = 0.14 + Math.sin(Game.time * 3 + s.pos.x) * 0.05;
    }
  }
  interactable(a) {
    if (!a.alive) return null;
    for (const s of this.switches) {
      if (s.pressed || s.team === a.team) continue;
      if (dist2D(a.pos, s.pos) < 1.7) return { label: t('pressButton'), hold: this.m.holdTime, done: () => this.press(s, 'A') };
    }
    return null;
  }
  botGoal(b) {
    const team = b.a.team;
    if (b.role === 'attack') {
      const targets = this.switches.filter((s) => s.team !== team && !s.pressed);
      if (targets.length) { const s = targets[b.a.id % targets.length]; return { pos: s.pos, run: dist2D(b.a.pos, s.pos) > 3, hold: dist2D(b.a.pos, s.pos) < 2 }; }
    }
    const own = this.switches.filter((s) => s.team === team && !s.pressed);
    if (own.length) { const s = own[b.a.id % own.length]; return { pos: Nav.randomAround(s.pos, 5) }; }
    return null;
  }
  markersNow() {
    return this.switches.filter((s) => !s.pressed).map((s) => ({ pos: s.pos, cls: s.team === 'A' ? 'own' : 'enemy', label: (s.team === 'A' ? 'DEF ' : 'ATK ') + s.end, h: 1.3, progress: s.progress }));
  }
  onTimeUp() { Game.finish(false, 'r_time'); }
  hud() { return { ally: this.pressedBy('A') + '/2', enemy: this.pressedBy('B') + '/2', clock: this.timeLeft, objective: t('o_siege', { a: this.pressedBy('A') }) }; }
  stars(won) { if (!won) return 0; const left = this.timeLeft; return left >= 150 ? 3 : left >= 90 ? 2 : 1; }
  finalScore(won) { return super.finalScore(won) + (won ? Math.round(this.timeLeft) * 10 : 0); }
  intel() { return { teams: '6 vs 6', time: fmtTime(this.timeLimit) }; }
}

function reserveBot(mode, team, opts) {
  const a = mode.makeBot(team, opts);
  a.out = true; a.lives = 1; a.bot.root.visible = false; a.bot.gun.visible = false;
  return a;
}

class Waves extends Mode {
  setup() {
    const p = Game.player; p.team = 'A'; p.lives = this.m.lives;
    this.respawnDelay = 4; this.regen = 16; this.botDamageMul = 0.55;
    this.spawnActor(p, Nav.randomInZone(MAP.zones.central));
    this.pool = [];
    for (let i = 0; i < Math.max(...this.m.waves); i++) this.pool.push(reserveBot(this, 'B', { weapon: pick(['ak47', 'm4', 'shotgun', 'ak47']), dmgMul: 0.8 }));
    this.wave = 0; this.left = 0; this.breakT = 4;
  }
  zoneFor(a) { return a.isPlayer ? MAP.zones.central : null; }
  respawnActor(a) { if (a.isPlayer) this.spawnActor(a, this.safeSpawn(a, MAP.zones.central, 10)); }
  startWave() {
    this.wave++;
    const n = this.m.waves[this.wave - 1];
    for (let i = 0; i < n; i++) { const a = this.pool[i]; a.out = false; this.spawnActor(a, this.safeSpawn(a, null, 20)); }
    this.left = n; Hud.banner(t('b_wave', { w: this.wave }), `× ${n}`); Audio.alarm();
  }
  onKill(k, v) {
    if (v.isPlayer) { super.onKill(k, v); if (v.out) Game.finish(false, 'r_dead'); return; }
    v.out = true; this.left = Math.max(0, this.left - 1);
    if (this.left === 0) {
      this.objectiveScore += 300 * this.wave;
      if (this.wave >= this.m.waves.length) Game.finish(true, 'r_waves');
      else { Hud.banner(t('b_waveClear')); this.breakT = 8; }
    }
  }
  update(dt) { super.update(dt); if (this.breakT > 0) { this.breakT -= dt; if (this.breakT <= 0) this.startWave(); } }
  botGoal(b) { return { pos: Nav.patrolPoint(b, MAP.zones.central), run: Math.random() < 0.5, patrol: true }; }
  hud() {
    const obj = this.breakT > 0 ? t('o_waveBreak', { s: Math.ceil(this.breakT) }) : t('o_wave', { w: this.wave, t: this.m.waves.length, n: this.left });
    return { clock: Game.time, countUp: true, objective: obj, lives: Game.player.lives };
  }
  stars(won) { if (!won) return 0; const d = Game.player.deaths; return d === 0 ? 3 : d <= 1 ? 2 : 1; }
  intel() { return { teams: `1 vs ${this.m.waves.reduce((a, b) => a + b, 0)}`, time: '∞' }; }
}

class Assassination extends Mode {
  setup() {
    const p = Game.player; p.team = 'A'; p.lives = this.m.lives;
    this.respawnDelay = 4; this.regen = 14; this.botDamageMul = 0.6; this.sweep = 0;
    this.spawnActor(p, Nav.randomInZone(MAP.zones.west));
    const east = MAP.zones.east, central = MAP.zones.central;
    this.officers = ['A', 'B', 'C'].map((l) => {
      const a = this.makeBot('B', { name: 'OFFICER ' + l, hp: 190, armor: 0.9, weapon: 'pistol', zone: east, visionRange: 26 });
      a.officer = true; a.lives = 1; return a;
    });
    for (let i = 0; i < this.m.patrols; i++) { const a = this.makeBot('B', { weapon: pick(['ak47', 'm4']), zone: i % 2 ? central : east, visionRange: 28 }); a.lives = 1; }
    for (const a of Game.actors) if (a.bot) this.spawnActor(a, this.safeSpawn(a, a.bot.patrolZone, 14));
    this.reserve = [];
    for (let i = 0; i < 4; i++) { const r = reserveBot(this, 'B', { weapon: pick(['ak47', 'm4', 'shotgun']), dmgMul: 0.85 }); r.reinforcement = true; this.reserve.push(r); }
    this.killed = 0; this.alarm = false; this.spotT = 0;
  }
  zoneFor(a) { return a.isPlayer ? MAP.zones.west : null; }
  respawnActor(a) { if (a.isPlayer) this.spawnActor(a, this.safeSpawn(a, MAP.zones.west, 12)); }
  onKill(k, v) {
    if (v.isPlayer) { super.onKill(k, v); if (v.out) Game.finish(false, 'r_dead'); return; }
    v.out = true;
    if (v.officer) {
      this.killed++; this.objectiveScore += 500; Hud.banner(t('b_officer'), `${this.killed} / 3`);
      if (this.killed >= 3) Game.finish(true, 'r_ghost');
    }
  }
  update(dt) {
    super.update(dt);
    if (this.alarm) return;
    const seen = Game.actors.some((a) => a.bot && a.alive && a.bot.target === Game.player);
    this.spotT = seen ? this.spotT + dt : Math.max(0, this.spotT - dt * 0.5);
    if (this.spotT > 1.5) this.raiseAlarm();
  }
  raiseAlarm() {
    this.alarm = true; this.alarmPos = Game.player.pos.clone();
    Hud.banner(t('b_alarm'), t('b_alarmSub')); Audio.alarm();
    for (const a of this.reserve) { a.out = false; this.spawnActor(a, this.safeSpawn(a, MAP.zones.east, 12)); }
  }
  botGoal(b) { if (this.alarm && b.a.reinforcement) return { pos: Nav.randomAround(this.alarmPos, 6), run: true }; return null; }
  markersNow() { return this.officers.filter((o) => o.alive).map((o) => ({ pos: o.pos, cls: 'enemy', label: 'TARGET', h: 2.2 })); }
  hud() { return { clock: Game.time, countUp: true, objective: t('o_ghost', { k: this.killed }), lives: Game.player.lives }; }
  finalScore(won) { return super.finalScore(won) + (won && !this.alarm ? 1500 : 0); }
  stars(won) { if (!won) return 0; return !this.alarm ? 3 : Game.player.deaths <= 1 ? 2 : 1; }
  intel() { return { teams: `1 vs ${3 + this.m.patrols}`, time: '∞' }; }
}

const HARDPOINTS = [{ x: 7, z: -3, name: 'ALPHA' }, { x: -15, z: 13, name: 'BRAVO' }, { x: 23, z: -16, name: 'CHARLIE' }, { x: 23, z: 14, name: 'DELTA' }, { x: 7, z: 15, name: 'ECHO' }];
class Hardpoint extends Mode {
  setup() {
    const p = Game.player; p.team = 'A';
    this.respawnDelay = 4;
    const n = this.m.teamSize;
    for (let i = 0; i < n - 1; i++) this.makeBot('A', { weapon: pick(['ak47', 'm4']) });
    for (let i = 0; i < n; i++) this.makeBot('B', { weapon: pick(['ak47', 'm4', 'shotgun']), dmgMul: 0.8 });
    for (const a of Game.actors) { a.lives = Infinity; this.spawnActor(a, Nav.randomInZone(this.zoneFor(a))); }
    this.points = HARDPOINTS.map((h) => { const c = Nav.closest({ x: h.x, y: 0, z: h.z }); return { pos: new THREE.Vector3(c.x, 0, c.z), name: h.name }; });
    this.idx = randi(0, this.points.length - 1); this.moveT = 60; this.score = { A: 0, B: 0 }; this.contested = false;
    const T = THREE;
    this.ring = new T.Group();
    const floor = new T.Mesh(new T.RingGeometry(3.25, 3.5, 48), new T.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03;
    const wall = new T.Mesh(new T.CylinderGeometry(3.5, 3.5, 0.7, 48, 1, true), new T.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false }));
    wall.position.y = 0.35;
    this.ring.add(floor, wall); this.props.add(this.ring); this.placeRing();
  }
  get point() { return this.points[this.idx]; }
  placeRing() { this.ring.position.copy(this.point.pos); }
  zoneFor(a) { return a.team === 'A' ? MAP.zones.west : MAP.zones.east; }
  update(dt) {
    super.update(dt);
    this.moveT -= dt;
    if (this.moveT <= 0) { this.idx = (this.idx + 1) % this.points.length; this.moveT = 60; this.placeRing(); Hud.banner(t('b_hpMove'), this.point.name); Audio.alarm(); }
    let A = false, B = false;
    for (const a of Game.actors) if (a.alive && dist2D(a.pos, this.point.pos) < 3.5) { if (a.team === 'A') A = true; else B = true; }
    this.contested = A && B;
    if (A && !B) { this.score.A += dt; if (dist2D(Game.player.pos, this.point.pos) < 3.5 && Game.player.alive) this.objectiveScore += dt * 5; }
    if (B && !A) this.score.B += dt;
    this.ring.children[0].material.color.set(this.contested ? 0xffffff : A ? 0x3d8bff : B ? 0xff4a3d : 0xf2c230);
    if (this.score.A >= this.m.target) Game.finish(true, 'r_win');
    else if (this.score.B >= this.m.target) Game.finish(false, 'r_enemyWin');
  }
  botGoal(b) {
    const d = dist2D(b.a.pos, this.point.pos);
    if (d < 3) return { pos: b.a.pos, hold: true };
    return { pos: Nav.randomAround(this.point.pos, 2.5), run: d > 6 };
  }
  markersNow() { return [{ pos: this.point.pos, cls: 'case', label: this.point.name, h: 1.2 }]; }
  onTimeUp() { const w = this.score.A > this.score.B; Game.finish(w, w ? 'r_win' : 'r_time'); }
  hud() { return { ally: Math.floor(this.score.A), enemy: Math.floor(this.score.B), clock: this.timeLeft, objective: this.contested ? t('o_hpContest') : t('o_hp', { t: this.m.target }) }; }
  stars(won) { if (!won) return 0; const m = this.score.A - this.score.B; return m >= 60 ? 3 : m >= 25 ? 2 : 1; }
  intel() { return { teams: `${this.m.teamSize} vs ${this.m.teamSize}`, time: fmtTime(this.timeLimit) }; }
}

class ZeroHour extends Mode {
  setup() {
    const p = Game.player; p.team = 'A'; p.lives = this.m.lives;
    this.respawnDelay = 4; this.regen = 16; this.botDamageMul = 0.6; this.sweep = 0.25;
    this.spawnActor(p, Nav.randomInZone(MAP.zones.west));
    const east = MAP.zones.east;
    this.boss = this.makeBot('B', { name: 'THE MIMIC', weapon: 'm4', elite: true, hp: 600, armor: 0.8, skill: 0.95, dmgMul: 0.85, visionRange: 50, hearMul: 1.5, zone: east });
    this.boss.lives = 1;
    for (let i = 0; i < this.m.guards; i++) { const g = this.makeBot('B', { weapon: pick(['m4', 'ak47', 'shotgun']), zone: east, visionRange: 30, hearMul: 1.4, dmgMul: 0.85 }); g.lives = Infinity; }
    for (const a of Game.actors) if (a.bot) this.spawnActor(a, this.safeSpawn(a, east, 18));
    const lift = pick(MAP.lifts), c = Nav.closest({ x: lift.x, y: 0, z: lift.z });
    this.exit = new THREE.Vector3(c.x, 0, c.z);
    this.exitBeam = Models.beam(0x3df27a); this.exitBeam.position.set(c.x, 1.4, c.z); this.exitBeam.visible = false; this.props.add(this.exitBeam);
    this.bossDown = false;
  }
  zoneFor(a) { return a.isPlayer ? MAP.zones.west : MAP.zones.east; }
  respawnActor(a) { this.spawnActor(a, a.isPlayer ? this.safeSpawn(a, MAP.zones.west, 12) : this.safeSpawn(a, MAP.zones.east, 18)); }
  onKill(k, v) {
    if (v === this.boss) {
      v.out = true; this.bossDown = true; this.objectiveScore += 2000;
      this.exitBeam.visible = true; Hud.banner(t('b_boss'), t('b_exit')); Audio.alarm();
      return;
    }
    super.onKill(k, v);
    if (v.isPlayer) { if (v.out) Game.finish(false, 'r_dead'); return; }
    v.respawnAt = Game.time + 25;
  }
  update(dt) { super.update(dt); if (this.bossDown) this.exitBeam.material.opacity = 0.16 + Math.sin(Game.time * 4) * 0.06; }
  botGoal(b) {
    if (b.a !== this.boss && this.boss.alive) return { pos: Nav.randomAround(this.boss.pos, 6) };
    return super.botGoal(b);
  }
  interactable(a) {
    if (!a.alive || !this.bossDown || dist2D(this.exit, a.pos) > 1.8) return null;
    return { label: t('useExit'), hold: 1.2, done: () => { this.objectiveScore += 1500; Game.finish(true, 'r_boss'); } };
  }
  markersNow() { return this.bossDown ? [{ pos: this.exit, cls: 'exit', label: 'EXIT' }] : this.boss.alive ? [{ pos: this.boss.pos, cls: 'enemy', label: 'MIMIC', h: 2.2 }] : []; }
  hud() { return { clock: Game.time, countUp: true, objective: this.bossDown ? t('o_bossExit') : t('o_boss'), lives: Game.player.lives }; }
  finalScore(won) { return super.finalScore(won) + (won ? Math.max(0, Math.round(600 - Game.time)) * 5 : 0); }
  stars(won) { if (!won) return 0; const d = Game.player.deaths; return d === 0 ? 3 : d <= 1 ? 2 : 1; }
  intel() { return { teams: `1 vs MIMIC + ${this.m.guards}`, time: '∞' }; }
}

const MODES = { extermination: Extermination, tdm: TeamDeathmatch, keycard: Keycard, duel: Duel, survival: Survival, briefcase: Briefcase, siege: Siege, waves: Waves, assassination: Assassination, hardpoint: Hardpoint, zerohour: ZeroHour };

const Hud = {
  root: null, els: {}, radarCtx: null, radarMap: null, markerEls: new Map(), lastHp: 100,
  init() {
    const h = el('div'); h.id = 'hud';
    h.innerHTML = `
      <div class="hud-pad">
        <div class="radar"><canvas width="264" height="264"></canvas></div>
        <div class="objective"><div class="scorebar"></div><div class="obj-text"></div><div class="keys"></div><button class="ammo-ad hidden" aria-label="AD"><span class="adb">AD</span><span class="ico">▶</span><span class="lbl"></span><kbd>G</kbd></button></div>
        <div class="killfeed"></div>
        <div class="vitals"><div class="lbl"><span>HP</span><span class="lives"></span></div><div class="hpnum">100</div><div class="bar hp"><em></em><i></i></div></div>
        <div class="ammo"><div class="wname"></div><div class="count">30<small>/ 90</small></div><div class="pips"></div><div class="reload"></div><div class="alt"></div></div>
        <div class="hud-pause">${ICONS.pause}</div>
        <div class="fps hidden"></div>
      </div>
      <div class="markers passthrough" style="position:absolute;inset:0"></div>
      <div class="crosshair"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="hitmarker"></div>
      <div class="dmg-dir"></div>
      <div class="popups"></div>
      <div class="banner"></div>
      <div class="countdown"></div>
      <div class="interact"></div>
      <svg class="progress-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="5"/><circle class="pr" cx="32" cy="32" r="27" fill="none" stroke="#f2c230" stroke-width="5" stroke-linecap="butt" stroke-dasharray="169.6" stroke-dashoffset="169.6" transform="rotate(-90 32 32)"/></svg>
      <div class="deathcard"><div class="k"></div><div class="by"></div><div class="t"></div></div>
      <div class="spectate"></div>`;
    $('#ui').insertBefore(h, $('#touch')); h.classList.add('passthrough'); this.root = h;
    const q = (s) => $(s, h);
    Object.assign(this.els, {
      radar: q('.radar canvas'), scorebar: q('.scorebar'), obj: q('.obj-text'), keys: q('.keys'), feed: q('.killfeed'),
      hpnum: q('.hpnum'), hpbar: q('.bar.hp'), hpI: q('.bar.hp i'), hpE: q('.bar.hp em'), lives: q('.vitals .lives'),
      wname: q('.wname'), count: q('.ammo .count'), pips: q('.ammo .pips'), reload: q('.ammo .reload'), alt: q('.ammo .alt'),
      cross: q('.crosshair'), hit: q('.hitmarker'), dmg: q('.dmg-dir'), pops: q('.popups'), banner: q('.banner'), cd: q('.countdown'),
      ammoAd: q('.ammo-ad'), interact: q('.interact'), ring: q('.progress-ring'), ringC: q('.progress-ring .pr'), death: q('.deathcard'), spec: q('.spectate'), markers: q('.markers'), fps: q('.fps'),
    });
    q('.hud-pause').addEventListener('click', () => Game.openPause());
    this.els.ammoAd.addEventListener('click', (e) => { e.stopPropagation(); Game.getAmmo(); });
    this.els.ammoAd.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); Game.getAmmo(); }, { passive: false });
    q('.hud-pause').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); Game.openPause(); }, { passive: false });
    this.radarCtx = this.els.radar.getContext('2d');
    for (let i = 0; i < 8; i++) { const d = el('i'); this.els.dmg.appendChild(d); }
    this.buildRadarMap();
  },
  buildRadarMap() {
    const [pos, idx] = window.Recast.getNavMeshPositionsAndIndices(Nav.navMesh);
    const S = 5, ox = 33, oz = 28, c = document.createElement('canvas'); c.width = 66 * S; c.height = 52 * S;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(233,220,164,0.20)';
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, d = idx[i + 2] * 3;
      const cx = (pos[a] + pos[b] + pos[d]) / 3, cz = (pos[a + 2] + pos[b + 2] + pos[d + 2]) / 3;
      const n = Nav.closest({ x: cx, y: 0, z: cz }); if (!n || Math.hypot(n.x - cx, n.z - cz) > 0.5) continue;
      if (!this._interior) this._interior = () => true;
      g.beginPath(); g.moveTo((pos[a] + ox) * S, (pos[a + 2] + oz) * S); g.lineTo((pos[b] + ox) * S, (pos[b + 2] + oz) * S); g.lineTo((pos[d] + ox) * S, (pos[d + 2] + oz) * S); g.closePath(); g.fill();
    }
    this.radarMap = { c, S, ox, oz };
  },
  show(on) { this.root.classList.toggle('on', on); },
  reset() {
    this.els.feed.innerHTML = ''; this.els.pops.innerHTML = ''; this.els.banner.innerHTML = ''; this.els.cd.innerHTML = '';
    this.els.death.classList.remove('on'); this.els.spec.classList.remove('on');
    this.els.markers.innerHTML = ''; this.markerEls.clear();
    $('#vignette').style.opacity = 0;
    this.keys(); this.weapon();
  },
  weapon() {
    if (!Player.slots.length) return;
    const d = Player.weapon, s = Player.slot, e = this.els;
    e.wname.textContent = d.name;
    e.count.innerHTML = `${s.mag}<small>/ ${s.reserve}</small>`;
    e.count.classList.toggle('low', s.mag <= Math.ceil(d.mag * 0.25));
    if (e.pips.childElementCount !== d.mag) { e.pips.innerHTML = ''; for (let i = 0; i < d.mag; i++) e.pips.appendChild(el('i')); }
    const pips = e.pips.children; for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('spent', i >= s.mag);
    e.reload.textContent = Player.reloadT > 0 ? t('reloading') : s.mag === 0 && s.reserve === 0 ? (Platform.ads.canReward() ? t('outOfAmmoHint') : t('noAmmo')) : '';
    const other = Player.slots[1 - Player.cur];
    e.alt.textContent = other ? `${Input.st.touch ? '⇄' : 'Q'} ${WEAPONS[other.id].name}` : '';
  },
  keys() {
    const m = Game.mode; const e = this.els.keys;
    if (!m || !m.keys) { e.innerHTML = ''; return; }
    e.innerHTML = m.keys.map((k) => `<i style="--k:${k.color}" class="${k.got ? 'got' : ''}"></i>`).join('');
  },
  hitmarker(kind) { const h = this.els.hit; h.className = 'hitmarker'; void h.offsetWidth; h.className = 'hitmarker show ' + kind; },
  crosshairKick() { this.kick = Math.min(1, (this.kick || 0) + 0.35); },
  hurt(attacker, amount) {
    const v = $('#vignette'); v.style.opacity = clamp(amount / 40, 0.25, 0.8); clearTimeout(this._vt); this._vt = setTimeout(() => { v.style.opacity = 0; }, 180);
    if (!attacker) return;
    const p = Game.player; const dx = attacker.pos.x - p.pos.x, dz = attacker.pos.z - p.pos.z;
    const ang = Math.atan2(-dx, -dz) - p.yaw;
    const arrows = this.els.dmg.children; const i = (this._di = ((this._di || 0) + 1) % arrows.length); const a = arrows[i];
    a.style.transform = `rotate(${-ang}rad)`; a.classList.add('on'); setTimeout(() => a.classList.remove('on'), 60);
  },
  killfeed(k, v, wid, head) {
    const p = Game.player;
    const cls = (a) => (a === p ? 'y' : a && a.team === p.team ? 'a' : 'e');
    const name = (a) => (a === p ? t('you') : esc(a.name));
    const row = el('div', 'kf' + (k === p || v === p ? ' me' : ''));
    row.innerHTML = k && k !== v ? `<span class="${cls(k)}">${name(k)}</span><span class="w">[${WEAPONS[wid] ? WEAPONS[wid].name : '—'}${head ? ' ✛' : ''}]</span><span class="${cls(v)}">${name(v)}</span>` : `<span class="${cls(v)}">${name(v)}</span>`;
    this.els.feed.prepend(row);
    while (this.els.feed.childElementCount > 5) this.els.feed.lastChild.remove();
    setTimeout(() => { row.classList.add('fade'); setTimeout(() => row.remove(), 650); }, 4500);
  },
  pop(text, pts, head) {
    const p = el('div', 'pop' + (head ? ' head' : ''), `${esc(text)}${pts ? `<small>+${pts}</small>` : ''}`);
    this.els.pops.appendChild(p); setTimeout(() => p.remove(), 1500);
    while (this.els.pops.childElementCount > 3) this.els.pops.firstChild.remove();
  },
  banner(text, sub) {
    this.els.banner.innerHTML = `<div class="big">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  },
  countdown(n) { this.els.cd.innerHTML = `<span>${esc(n)}</span>`; },
  interact(it, prog) {
    const e = this.els;
    if (!it || it.auto) { e.interact.classList.remove('on'); e.ring.classList.remove('on'); $('#touch .use') && $('#touch .use').classList.remove('on'); return; }
    const key = Input.st.touch ? '' : Input.st.gamepad ? '<kbd>LB</kbd>' : '<kbd>E</kbd>';
    const label = `${key}${it.hold ? t('pressHold') + ' · ' : ''}${esc(it.label)}`;
    if (e.interact.dataset.l !== label) { e.interact.innerHTML = label; e.interact.dataset.l = label; }
    e.interact.classList.add('on');
    $('#touch .use') && $('#touch .use').classList.add('on');
    if (it.hold) { e.ring.classList.toggle('on', prog > 0); e.ringC.style.strokeDashoffset = 169.6 * (1 - clamp(prog / it.hold, 0, 1)); }
  },
  death(killer, respawnIn, out) {
    const e = this.els;
    e.death.classList.add('on');
    $('.k', e.death).textContent = t('youDied');
    $('.by', e.death).innerHTML = killer && killer !== Game.player ? t('killedBy', { n: `<span style="color:${killer.team === Game.player.team ? '#3d8bff' : '#ff4a3d'}">${esc(killer.name)}</span>` }) + ` · ${WEAPONS[killer.bot ? killer.bot.weaponId : 'ak47'].name}` : '';
    $('.t', e.death).textContent = out ? (Game.mode.spectateTarget && Game.mode.spectateTarget() ? t('youAreOut') : t('outOfLives')) : respawnIn > 0 ? t('respawnIn', { s: Math.ceil(respawnIn) }) : '';
  },
  spectate(name) { this.els.spec.textContent = t('spectating', { n: name }); this.els.spec.classList.add('on'); },
  update(dt) {
    const p = Game.player, m = Game.mode, e = this.els;
    if (!p || !m) return;
    const hp = Math.max(0, p.hp), frac = hp / p.maxHp;
    if (Math.round(hp) !== this.lastHp) { this.lastHp = Math.round(hp); e.hpnum.textContent = this.lastHp; e.hpI.style.transform = `scaleX(${frac})`; e.hpE.style.transform = `scaleX(${frac})`; e.hpbar.classList.toggle('low', frac < 0.3); }
    const hd = m.hud();
    const lv = hd.lives != null ? hd.lives : m.m.deaths ? Math.max(0, p.lives) : null;
    const livesTxt = lv != null ? t('lives', { n: lv }) : '';
    if (e.lives.textContent !== livesTxt) e.lives.textContent = livesTxt;
    const clock = hd.clock != null ? fmtTime(hd.clock) : '';
    const sb = `${hd.ally != null ? `<div class="ally">${hd.ally}</div>` : ''}${clock ? `<div class="clock${!hd.countUp && hd.clock < 20 ? ' urgent' : ''}">${clock}</div>` : ''}${hd.enemy != null ? `<div class="enemy">${hd.enemy}</div>` : ''}`;
    if (this._sb !== sb) { this._sb = sb; e.scorebar.innerHTML = sb; }
    if (this._obj !== hd.objective) { this._obj = hd.objective; e.obj.innerHTML = hd.objective || ''; }
    const spread = Player.spreadNow || 0.01; this.kick = Math.max(0, (this.kick || 0) - dt * 5);
    const px = clamp(spread * innerHeight / (2 * Math.tan((World.camera.fov * Math.PI) / 360)), 3, 80) + this.kick * 6;
    e.cross.style.setProperty('--gap', px.toFixed(1) + 'px');
    e.cross.classList.toggle('ads', Player.adsT > 0.6 || !p.alive || Player.sprinting);
    e.cross.classList.toggle('enemy', !!(Player.assistTarget && Player.assistOnTarget));
    const rl = Player.reloadT > 0 ? t('reloading') : '';
    if (e.reload.textContent !== rl && Player.slot && Player.slot.mag > 0) e.reload.textContent = rl;
    const showAmmo = p.alive && !Game.over && Platform.ads.canReward();
    e.ammoAd.classList.toggle('hidden', !showAmmo);
    if (showAmmo) {
      if (e.ammoAd.dataset.l !== LANG) { e.ammoAd.dataset.l = LANG; $('.lbl', e.ammoAd).textContent = t('getAmmo'); }
      const sl = Player.slot, d = sl && WEAPONS[sl.id];
      e.ammoAd.classList.toggle('low', !!d && sl.mag + sl.reserve <= d.mag);
      e.ammoAd.classList.toggle('touch', !!Input.st.touch);
    }
    if (!p.alive) this.death(Player.killer, p.respawnAt ? p.respawnAt - Game.time : 0, p.out);
    else if (e.death.classList.contains('on')) { e.death.classList.remove('on'); e.spec.classList.remove('on'); }
    this.drawRadar();
    this.updateMarkers();
    if (Save.settings.fps) { this._fpsAcc = (this._fpsAcc || 0) + dt; this._fpsN = (this._fpsN || 0) + 1; if (this._fpsAcc > 0.5) { e.fps.textContent = Math.round(this._fpsN / this._fpsAcc) + ' ' + t('fpsWord'); this._fpsAcc = 0; this._fpsN = 0; } }
    e.fps.classList.toggle('hidden', !Save.settings.fps);
  },
  drawRadar() {
    const g = this.radarCtx, W = 264, p = Game.player, R = this.radarMap;
    const camYaw = p.alive ? p.yaw : World.camera.rotation.y;
    const scale = 1.6;
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(W / 2, W / 2); g.rotate(camYaw); g.scale(scale, scale);
    g.translate(-(p.pos.x + R.ox) * R.S, -(p.pos.z + R.oz) * R.S);
    g.drawImage(R.c, 0, 0);
    const dot = (x, z, col, r = 7) => { g.fillStyle = col; g.beginPath(); g.arc((x + R.ox) * R.S, (z + R.oz) * R.S, r / scale, 0, Math.PI * 2); g.fill(); };
    for (const a of Game.actors) {
      if (!a.alive || a === p) continue;
      if (a.team === p.team) dot(a.pos.x, a.pos.z, '#3d8bff');
      else if (Game.mode.revealHostiles) continue;
      else if (a.bot && (Game.time - (a.bot.lastShot || -9) < 1.2 || a.carrying)) dot(a.pos.x, a.pos.z, a.carrying ? '#f2c230' : '#ff4a3d');
    }
    const ms = Game.mode.markersNow ? Game.mode.markersNow() : [];
    for (const mk of ms) dot(mk.pos.x, mk.pos.z, mk.cls === 'exit' ? '#3df27a' : mk.cls === 'case' ? '#f2c230' : mk.cls === 'own' ? '#3d8bff' : '#ff4a3d', 9);
    g.restore();
    if (Game.mode.revealHostiles) {
      const k = R.S * scale, rim = W / 2 - 30, c = Math.cos(camYaw), sn = Math.sin(camYaw);
      for (const a of Game.actors) {
        if (!a.alive || a.team === p.team) continue;
        const dx = (a.pos.x - p.pos.x) * k, dz = (a.pos.z - p.pos.z) * k;
        let x = dx * c - dz * sn, y = dx * sn + dz * c; const L = Math.hypot(x, y), far = L > rim;
        if (far) { x *= rim / L; y *= rim / L; }
        g.fillStyle = '#ff4a3d'; g.globalAlpha = far ? 0.75 : 1;
        g.beginPath(); g.arc(W / 2 + x, W / 2 + y, far ? 5 : 7, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(W / 2, W / 2 - 13); g.lineTo(W / 2 + 9, W / 2 + 10); g.lineTo(W / 2, W / 2 + 5); g.lineTo(W / 2 - 9, W / 2 + 10); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(233,220,164,.15)'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 30, 0, Math.PI * 2); g.stroke();
  },
  updateMarkers() {
    const ms = Game.mode.markersNow ? Game.mode.markersNow() : [];
    const cam = World.camera, v = TMP.m || (TMP.m = new THREE.Vector3());
    const seen = new Set();
    ms.forEach((mk, i) => {
      const key = mk.cls + i; seen.add(key);
      let e = this.markerEls.get(key);
      if (!e) { e = el('div', 'wm ' + mk.cls); this.els.markers.appendChild(e); this.markerEls.set(key, e); }
      v.set(mk.pos.x, (mk.pos.y || 0) + (mk.h || 1.6), mk.pos.z);
      const d = cam.position.distanceTo(v);
      v.project(cam);
      let x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      const behind = v.z > 1;
      if (behind) { x = innerWidth - x; y = innerHeight - 40; }
      const m = 40; const clampd = behind || x < m || x > innerWidth - m || y < m || y > innerHeight - m;
      x = clamp(x, m, innerWidth - m); y = clamp(y, m + 60, innerHeight - m);
      e.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
      e.classList.toggle('edge', clampd);
      const txt = `${esc(mk.label)}<span>${Math.round(d)}m</span>${mk.progress ? `<u style="--p:${mk.progress}"></u>` : ''}`;
      if (e.dataset.t !== txt) { e.innerHTML = txt; e.dataset.t = txt; }
    });
    for (const [k, e] of this.markerEls) if (!seen.has(k)) { e.remove(); this.markerEls.delete(k); }
  },
};

const Lobby = {
  squad: [], t: 0, active: false,
  init() {
    const colors = ['olive', 'navy', 'blue', 'crimson', 'tan'];
    const clips = ['aim_idle', 'idle', 'aim_idle', 'idle', 'aim_idle'];
    colors.forEach((c, i) => {
      const s = Models.soldier(c); Models.setArmLight(s, i >= 1 && i <= 3);
      const root = new THREE.Group(); root.add(s.model);
      const x = 5.2 + i * 1.15, z = 12.6 - Math.abs(i - 2) * 0.55;
      root.position.set(x, 0, z); root.rotation.y = (2 - i) * 0.12;
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: Tex.blob, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; root.add(blob);
      const mixer = new THREE.AnimationMixer(s.model);
      const act = mixer.clipAction(Assets.npc.animations.find((a) => a.name === clips[i])); act.play(); act.time = rand(0, 2);
      const gun = Models.gun(i === 2 ? 'm4' : pick(['ak47', 'm4', 'ak47']));
      World.scene.add(root); World.scene.add(gun);
      this.squad.push({ root, mixer, hand: s.hand, gun, yaw: root.rotation.y });
    });
    this.show(false);
  },
  show(on) { this.active = on; for (const s of this.squad) { s.root.visible = on; s.gun.visible = on; } if (on) { World.vmVisible = false; World.camera.fov = 62; World.camera.updateProjectionMatrix(); } else this.showcase(null); },
  showcase(id, anchor = null) {
    if (this.display) { World.scene.remove(this.display); this.display = null; }
    this.anchor = anchor;
    if (!id) return;
    const g = Models.gun(id), box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    g.position.sub(c);
    const spin = new THREE.Group(); spin.add(g);
    const holder = new THREE.Group(); holder.add(spin); holder.userData.len = Math.max(size.x, size.y, size.z); holder.userData.spin = spin;
    const key = new THREE.PointLight(0xfff2c8, 3.5, 4, 1.2); key.position.set(0.4, 0.5, 0.9); holder.add(key);
    const rim = new THREE.PointLight(0xf2c230, 2.5, 4, 1.2); rim.position.set(-0.6, 0.2, -0.5); holder.add(rim);
    this.display = holder; this.displayT = 0; World.scene.add(holder);
  },
  update(dt) {
    this.t += dt;
    const cam = World.camera, k = this.t * 0.12;
    cam.position.set(7.5 + Math.sin(k) * 1.6, 1.45 + Math.sin(k * 1.7) * 0.06, 17.2 + Math.cos(k * 0.8) * 0.5);
    cam.lookAt(7.4 + Math.sin(k * 0.6) * 0.5, 1.15, 11.6);
    const tmp = TMP.l || (TMP.l = new THREE.Vector3());
    for (const s of this.squad) {
      s.mixer.update(dt);
      s.hand.getWorldPosition(tmp);
      s.gun.position.copy(tmp); s.gun.rotation.order = 'YXZ'; s.gun.rotation.set(0.0, s.yaw + Math.PI, 0);
      const len = s.gun.userData.box.max.z - s.gun.userData.box.min.z; s.gun.translateZ(-len * 0.18); s.gun.translateY(0.03);
    }
    this.updateDisplay(dt);
    Audio.listener.x = cam.position.x; Audio.listener.z = cam.position.z;
  },
  updateDisplay(dt) {
    if (!this.display) return;
    const cam = World.camera; this.displayT += dt;
    const aspect = innerWidth / innerHeight, d = 1.0;
    const halfH = d * Math.tan((cam.fov * Math.PI) / 360), halfW = halfH * aspect;
    let x, y, len;
    if (this.anchor) {
      const r = this.anchor.getBoundingClientRect();
      x = (((r.left + r.width / 2) / innerWidth) * 2 - 1) * halfW;
      y = (1 - ((r.top + r.height / 2) / innerHeight) * 2) * halfH;
      len = Math.min(r.width / innerWidth * 2 * halfW * 0.74, (r.height / innerHeight) * 2 * halfH * 2.6);
    } else {
      const wide = aspect > 1.15;
      len = wide ? 0.7 * halfW : 1.2 * halfW; x = wide ? -0.5 * halfW : 0; y = wide ? 0 : 0.62 * halfH;
      len = Math.min(len, 0.9);
    }
    cam.updateMatrixWorld();
    this.display.position.copy(cam.localToWorld(new THREE.Vector3(x, y, -d)));
    this.display.quaternion.copy(cam.quaternion);
    this.display.scale.setScalar(len / this.display.userData.len);
    const sp = this.display.userData.spin;
    sp.rotation.set(Math.sin(this.displayT * 0.6) * 0.1, Math.PI / 2 + Math.sin(this.displayT * 0.8) * 0.55, 0);
  },
};

const Ui = {
  cur: null, modal: null, selMission: 0, loadout: null,
  init() {
    const ui = $('#ui');
    ui.innerHTML = `
      <div id="atmo" class="passthrough"></div>
      <div id="darkness" class="passthrough"></div>
      <div id="scope" class="passthrough"></div>
      <div id="vignette" class="passthrough"></div>
      <div id="flash" class="passthrough"></div>
      <section id="menu" class="screen"></section>
      <section id="missions" class="screen"></section>
      <section id="briefing" class="screen"></section>
      <section id="deploy" class="screen"><div class="scan"></div><div class="radio"></div></section>
      <section id="end" class="screen"></section>
      <section id="complete" class="screen"></section>
      <div id="m-pause" class="modal"></div>
      <div id="m-settings" class="modal"></div>
      <div id="m-controls" class="modal"></div>
      <div id="m-confirm" class="modal"></div>
      <div id="m-out" class="modal"></div>
      <div id="m-offer" class="modal see-through"></div>
      <div id="m-mini" class="modal mini"></div>
      <div id="adblock"></div>
      <div id="toast" class="passthrough"></div>
      <div id="touch" class="passthrough"></div>
      <div id="wipe" class="passthrough"><div class="wipe-label"></div></div>`;
    Input.buildTouch($('#touch'));
    document.documentElement.style.setProperty('--touch-scale', Save.settings.touchScale);
    ui.addEventListener('pointerover', (e) => { const b = e.target.closest('.btn, .mcard:not(.locked), .wcard:not(.locked)'); if (b && b !== this._hov) { this._hov = b; Audio.ui('hover'); } });
    ui.addEventListener('click', (e) => { if (e.target.closest('.btn, .mcard, .wcard, .back, .seg button, .toggle')) Audio.ui(); });
    addEventListener('keydown', (e) => {
      if (Game.state === 'play') return;
      if (e.code === 'Escape') { if (this.modal) this.closeModal(); else if (this.cur === 'missions') this.show('menu'); else if (this.cur === 'briefing') this.show('missions'); }
    });
  },
  async show(id, { wipe = false, label = '' } = {}) {
    if (wipe) await this.wipe(label);
    const prev = this.cur && $('#' + this.cur);
    if (prev && this.cur !== id) { prev.classList.remove('active'); prev.classList.add('leaving'); setTimeout(() => prev.classList.remove('leaving'), 320); }
    this.cur = id;
    if (id) {
      const s = $('#' + id);
      if (this['render_' + id]) this['render_' + id]();
      s.classList.remove('active'); void s.offsetWidth; s.classList.add('active');
      const first = $('.btn.primary, .btn, .mcard:not(.locked)', s); if (first && !Input.st.touch) setTimeout(() => first.focus({ preventScroll: true }), 50);
    }
    if (wipe) this.unwipe();
  },
  wipe(label) {
    const w = $('#wipe'); $('.wipe-label', w).textContent = label || ''; $('.wipe-label', w).style.display = label ? '' : 'none';
    w.className = 'in passthrough'; Audio.whoosh();
    return wait(440);
  },
  unwipe() { const w = $('#wipe'); setTimeout(() => { w.className = 'out passthrough'; }, 120); },
  openModal(id) { if (this.modal) $('#' + this.modal).classList.remove('active'); this.modal = id; if (this['render_' + id.replace('m-', 'modal_')]) this['render_' + id.replace('m-', 'modal_')](); $('#' + id).classList.add('active'); },
  closeModal() { if (!this.modal) return; $('#' + this.modal).classList.remove('active'); const was = this.modal; this.modal = null; if (was === 'm-offer' && this._offerDone) { const d = this._offerDone; this._offerDone = null; d(null); } if (was === 'm-settings' && Game.state === 'play' && Game.paused) this.openModal('m-pause'); if (was === 'm-controls' && Game.state === 'play' && Game.paused) this.openModal('m-pause'); },

  rank() {
    const xp = Save.data.xp; let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
    const cur = RANKS[i], next = RANKS[i + 1];
    return { name: cur[1], level: i + 1, frac: next ? (xp - cur[0]) / (next[0] - cur[0]) : 1, xp, next: next ? next[0] : null };
  },
  badge(level) {
    const chev = Array.from({ length: Math.min(level, 5) }, (_, i) => `<path d="M10 ${30 - i * 5}l12-6 12 6" fill="none" stroke="#0b0a07" stroke-width="2.6"/>`).join('');
    return `<svg class="rank-badge" viewBox="0 0 44 44"><path d="M22 2l18 8v12c0 10-8 17-18 20C12 39 4 32 4 22V10z" fill="#f2c230"/>${chev}${level > 5 ? `<circle cx="22" cy="12" r="3" fill="#0b0a07"/>` : ''}</svg>`;
  },

  render_menu() {
    const r = this.rank(), cleared = Save.clearedCount();
    const s = $('#menu');
    s.innerHTML = `
      <div class="menu-left stagger">
        <div class="menu-logo">BACKROOMS<small>${t('tagline')}</small></div>
        <button class="btn primary" data-a="play">${ICONS.play}${t('play')}<span class="sub">${t('ofMissions', { a: cleared, b: MISSIONS.length })}</span></button>
        <button class="btn" data-a="settings">${ICONS.gear}${t('settings')}</button>
        <button class="btn" data-a="controls">${ICONS.pad}${t('controls')}</button>
      </div>
      <div class="menu-right stagger">
        <div class="ticker">${t('totalScore')} <b>${fmtNum(Save.totalScore())}</b></div>
        <div class="panel cpcard"><span class="h-kicker">${t('cpBalance')}</span><b>${fmtNum(Save.data.cp)} <small>${t('cp')}</small></b><span class="muted">${t('earnHint')}</span></div>
        <div class="panel rankcard">
          <div class="rk">${this.badge(r.level)}<div><div class="h-kicker">${t('rank')} ${r.level}</div><div class="name">${r.name}</div></div></div>
          <div class="xp"><i style="transform:scaleX(0)"></i></div>
          <div class="meta"><span>${fmtNum(r.xp)} XP</span><span>${r.next ? fmtNum(r.next) : 'MAX'}</span></div>
        </div>
      </div>`;
    setTimeout(() => { const i = $('.xp i', s); if (i) i.style.transform = `scaleX(${r.frac})`; }, 300);
    $('[data-a=play]', s).onclick = () => this.show('missions', { wipe: true });
    $('[data-a=settings]', s).onclick = () => this.openModal('m-settings');
    $('[data-a=controls]', s).onclick = () => this.openModal('m-controls');
  },
  render_missions() {
    const s = $('#missions'); const un = Save.data.unlocked;
    s.innerHTML = `
      <div class="topbar"><button class="back" aria-label="${t('back')}">${ICONS.back}</button><div><div class="h-kicker">${t('operations')}</div><h2 class="h-display" style="font-size:clamp(22px,4vw,36px)">${t('selectMission')}</h2></div></div>
      <div class="grid scroll stagger"></div>`;
    const grid = $('.grid', s);
    MISSIONS.forEach((m, i) => {
      const tx = mt(m), rec = Save.data.missions[m.id], locked = i >= un;
      const c = el('button', 'mcard' + (locked ? ' locked' : '') + (rec && rec.cleared ? ' done' : '') + (!locked && !(rec && rec.cleared) ? ' next' : ''));
      c.innerHTML = `
        <div class="num">${String(i + 1).padStart(2, '0')}</div>
        <div class="tag mode">${esc(tx[1])}</div>
        <div class="title">${esc(tx[0])}</div>
        <div class="desc">${esc(tx[2])}</div>
        <div class="foot"><span class="stars">${[0, 1, 2].map((k) => `<i class="${rec && rec.stars > k ? 'on' : ''}"></i>`).join('')}</span><span>${rec && rec.best ? `${t('best')} ${fmtNum(rec.best)}` : locked ? '' : `<span style="color:var(--yellow)">${t('newOp')}</span>`}</span></div>
        ${locked ? `<div class="lock"><div>${ICONS.lock}<br>${t('locked')}<br><span class="muted">${t('lockedHint', { n: i })}</span></div></div>` : ''}`;
      c.onclick = () => { if (locked) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); Audio.ui('deny'); return; } this.selMission = i; this.show('briefing', { wipe: true, label: `OP ${String(i + 1).padStart(2, '0')}` }); };
      grid.appendChild(c);
    });
    $('.back', s).onclick = () => this.show('menu');
  },
  render_briefing() {
    const i = this.selMission, m = MISSIONS[i], tx = mt(m), s = $('#briefing');
    const mode = new (MODES[m.mode])(m, i); const intel = mode.intel(); mode.dispose();
    const lo = Save.data.loadout;
    if (!this.loadout || this.loadout.m !== i) this.loadout = { m: i, primary: Arsenal.usable(lo.primary) ? lo.primary : 'none', secondary: Arsenal.usable(lo.secondary) ? lo.secondary : 'pistol' };
    if (!Arsenal.usable(this.loadout.primary)) this.loadout.primary = 'none';
    if (!Arsenal.usable(this.loadout.secondary)) this.loadout.secondary = 'pistol';
    const lbl = [t('dmg'), t('rof'), t('acc'), t('mob')];
    const wcard = (id) => {
      const w = WEAPONS[id], un = Arsenal.usable(id), sel = this.loadout[w.slot] === id;
      const foot = !un ? `<div class="wfoot"><span class="price">${fmtNum(Arsenal.price(id))} ${t('cp')}</span>${Platform.ads.canReward() ? `<span class="ad">▶ ${t('watchAd')}</span>` : ''}</div>` : Arsenal.owns(id) ? '' : `<div class="wfoot"><span class="rent">${t('thisMission')}</span></div>`;
      return `<div class="wcard${sel ? ' sel' : ''}${un ? '' : ' locked shop'}" data-w="${id}"><div class="wn">${w.name}</div><div class="wt">${w.cls}</div>${w.stats.map((v, k) => `<div class="statbar"><span>${lbl[k]}</span><i style="--v:${v * 100}%"></i></div>`).join('')}${foot}</div>`;
    };
    const none = `<div class="wcard none${this.loadout.primary === 'none' ? ' sel' : ''}" data-w="none"><div class="wn">${t('none')}</div><div class="wt">${t('sidearmOnly')}</div></div>`;
    s.innerHTML = `
      <div class="topbar"><button class="back" aria-label="${t('back')}">${ICONS.back}</button><div><div class="h-kicker">${t('briefing')} · OP ${String(i + 1).padStart(2, '0')}</div><h2 class="h-display" style="font-size:clamp(22px,4.4vw,44px)">${esc(tx[0])}</h2></div><div class="cp-chip">${fmtNum(Save.data.cp)} ${t('cp')}</div></div>
      <div class="wrap">
        <div class="brief-left stagger">
          <div class="tag" style="color:var(--yellow);align-self:flex-start">${esc(tx[1])}</div>
          <div class="panel brief-obj"><div class="h-kicker">${t('objectives')}</div><p class="typer" style="margin:8px 0 2px;font-size:14px;line-height:1.5;color:var(--paper-dim)"></p><ul>${tx[3].map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
          <div class="intel"><div class="panel"><span class="h-kicker">${t('intelMode')}</span><b>${esc(m.mode.toUpperCase())}</b></div><div class="panel"><span class="h-kicker">${t('intelTeams')}</span><b>${esc(intel.teams)}</b></div><div class="panel"><span class="h-kicker">${t('intelTime')}</span><b>${esc(intel.time)}</b></div>${m.deaths ? `<div class="panel"><span class="h-kicker">${t('lives', { n: '' }).trim()}</span><b>${m.deaths}</b></div>` : ''}</div>
        </div>
        <div class="loadout stagger">
          <div class="h-kicker">${t('loadout')}</div>
          <div class="slot-title">${t('primary')}</div><div class="weapons">${none}${PRIMARIES.map(wcard).join('')}</div>
          <div class="slot-title">${t('secondary')}</div><div class="weapons">${SECONDARIES.map(wcard).join('')}</div>
          <div class="deploy-row"><button class="btn primary" data-a="deploy">${ICONS.play}${t('deploy')}</button></div>
        </div>
      </div>`;
    const p = $('.typer', s), full = tx[2]; let k = 0; clearInterval(this._typer);
    this._typer = setInterval(() => { k += 2; p.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(this._typer); p.classList.remove('typer'); } }, 18);
    const pickW = (id) => {
      const slot = id === 'none' ? 'primary' : WEAPONS[id].slot; this.loadout[slot] = id;
      Save.data.loadout = { primary: this.loadout.primary, secondary: this.loadout.secondary }; Save.persist();
    };
    $$('.wcard', s).forEach((c) => c.onclick = async () => {
      const id = c.dataset.w;
      if (c.classList.contains('locked')) { const r = await this.gunOffer(id, i); if (r) pickW(id); this.render_briefing(); return; }
      pickW(id);
      $$('.wcard', s).forEach((x) => x.classList.toggle('sel', x.dataset.w === this.loadout.primary || x.dataset.w === this.loadout.secondary));
    });
    $('.back', s).onclick = () => this.show('missions');
    $('[data-a=deploy]', s).onclick = () => Game.start(i, this.loadout.primary, this.loadout.secondary);
  },
  offerPick(m, n) {
    if (!(Save.data.played > 0) || (this.lastOffer != null && this.lastOffer === n - 1) || !Platform.ads.canReward()) return null;
    const open = Arsenal.missing().filter((id) => !Arsenal.usable(id));
    if (!open.length) return null;
    const want = [m.primary, m.secondary].find((id) => open.includes(id));
    if (want) return want;
    Save.data.offerIdx = ((Save.data.offerIdx | 0) + 1) % open.length;
    return open[Save.data.offerIdx];
  },
  miniOffer(id, mission) {
    const w = WEAPONS[id], m = $('#m-mini');
    return new Promise((resolve) => {
      const close = (r) => { Lobby.showcase(null); this.closeModal(); resolve(r); };
      const render = () => {
        const ad = Platform.ads.canReward();
        m.innerHTML = `<div class="mini-box panel">
          <div class="h-kicker">${t('tryWeapon')}</div>
          <div class="mini-view"></div>
          <div class="mini-name"><b>${w.name}</b><span>${w.cls}</span></div>
          <div class="mini-stats"><span>${t('dmg')} <b>${w.dmg}${w.pellets ? '×' + w.pellets : ''}</b></span><span>${t('rpm')} <b>${w.rpm}</b></span><span>${t('magazine')} <b>${w.mag}</b></span></div>
          <div class="mini-actions">
            ${ad ? `<button class="btn primary" data-a="ad"><span class="adb">AD</span>${t('watchAd')}</button>` : ''}
            <button class="btn" data-a="no">${t('noThanks')}</button>
          </div></div>`;
        const adBtn = $('[data-a=ad]', m);
        if (adBtn) adBtn.onclick = async () => { Lobby.showcase(null); if (await Ads.reward()) { Arsenal.rent(id, mission); close(true); } else { render(); Lobby.showcase(id, $('.mini-view', m)); } };
        $('[data-a=no]', m).onclick = () => close(false);
      };
      render();
      this.openModal('m-mini');
      Lobby.showcase(id, $('.mini-view', m));
      setTimeout(() => !Input.st.touch && $('.btn', m) && $('.btn', m).focus(), 60);
    });
  },
  gunOffer(id, mission) {
    const w = WEAPONS[id], m = $('#m-offer');
    const lbl = [t('dmg'), t('rof'), t('acc'), t('mob')];
    return new Promise((resolve) => {
      const render = () => {
        const can = Arsenal.canBuy(id), ad = Platform.ads.canReward();
        m.innerHTML = `<div class="offer"><div class="offer-stage"></div><div class="box panel offer-card stagger">
          <div class="h-kicker">${t('offerTitle')}</div>
          <h2 class="h-display">${w.name}</h2><div class="wt">${w.cls}</div>
          <div class="offer-stats">${w.stats.map((v, k) => `<div class="statbar"><span>${lbl[k]}</span><i style="--v:${v * 100}%"></i></div>`).join('')}</div>
          <div class="offer-nums"><span>${t('dmg')}<b>${w.dmg}${w.pellets ? '×' + w.pellets : ''}</b></span><span>${t('rpm')}<b>${w.rpm}</b></span><span>${t('magazine')}<b>${w.mag}</b></span><span>${t('range')}<b>${w.range}m</b></span></div>
          <p class="muted offer-text">${t('offerText')}</p>
          <div class="offer-price">${t('price')} <b>${fmtNum(Arsenal.price(id))} ${t('cp')}</b> · ${t('cpBalance')} <b>${fmtNum(Save.data.cp)}</b></div>
          <div class="end-actions">
            ${ad ? `<button class="btn primary" data-a="ad">${ICONS.play}${t('watchAd')}<span class="sub">${t('thisMission')}</span></button>` : ''}
            <button class="btn${ad ? '' : ' primary'}${can ? '' : ' disabled'}" data-a="buy">${can ? t('buyFor', { n: fmtNum(Arsenal.price(id)) }) : t('notEnough')}</button>
            <button class="btn" data-a="no">${t('noThanks')}</button>
          </div></div></div>`;
        const close = (r) => { this._offerDone = null; Lobby.showcase(null); document.body.classList.remove('offer-open'); this.closeModal(); resolve(r); };
        const adBtn = $('[data-a=ad]', m);
        if (adBtn) adBtn.onclick = async () => { if (await Ads.reward()) { Arsenal.rent(id, mission); close('rented'); } else render(); };
        const buy = $('[data-a=buy]', m);
        buy.onclick = () => {
          if (!Arsenal.canBuy(id)) { Audio.ui('deny'); buy.classList.remove('shake'); void buy.offsetWidth; buy.classList.add('shake'); return; }
          if (!buy.dataset.confirm) { buy.dataset.confirm = '1'; buy.textContent = t('confirmBuy', { w: w.name, n: fmtNum(Arsenal.price(id)) }); return; }
          Arsenal.buy(id); Ads.toast(t('bought', { w: w.name })); close('bought');
        };
        $('[data-a=no]', m).onclick = () => close(null);
      };
      render();
      this._offerDone = (r) => { Lobby.showcase(null); document.body.classList.remove('offer-open'); resolve(r); };
      document.body.classList.add('offer-open');
      this.openModal('m-offer');
      Lobby.showcase(id);
    });
  },
  async deploySequence(i) {
    const m = MISSIONS[i], tx = mt(m);
    const s = $('#deploy'), r = $('.radio', s);
    await this.show('deploy', { wipe: true });
    const lines = [`<span class="dim">// ${t('insertion')} · LEVEL 0 · SECTOR ${randi(2, 9)}-${'ABCDEF'[randi(0, 5)]}</span>`, `> ${esc(tx[0])}`, `> ${esc(tx[1])}`, `<span class="dim">> ${esc(tx[3][0])}</span>`];
    r.innerHTML = '';
    for (const l of lines) { const d = el('div', '', l); d.style.animation = 'rise .35s both'; r.appendChild(d); Audio.ui('hover'); await wait(330); }
  },
  render_end() {
    const res = Game.result, s = $('#end');
    const isLast = Game.missionIndex === MISSIONS.length - 1;
    const hasNext = res.won && !isLast;
    const stat = (k, v) => `<div class="panel"><span class="h-kicker">${k}</span><b>${v}</b></div>`;
    s.innerHTML = `
      <div class="end-box">
        <div class="end-title ${res.won ? 'win' : 'lose'}">${res.won ? t('victory') : t('defeat')}</div>
        <div class="end-sub">${res.won ? t('missionComplete') : t('missionFailed')} · ${esc(t(res.reason))}</div>
        <div class="end-stars">${[0, 1, 2].map((k) => `<i class="${res.stars > k ? 'on' : ''}" style="animation-delay:${0.5 + k * 0.25}s"></i>`).join('')}</div>
        <div class="end-score">0</div>
        <div class="end-best">${res.newBest ? t('newBest') : ''}</div>
        <div class="end-stats stagger">${stat(t('kills'), res.kills)}${stat(t('deaths'), res.deaths)}${stat(t('accuracy'), res.acc + '%')}${stat(t('headshots'), res.head)}${stat(t('time'), fmtTime(res.time))}</div>
        <div class="end-actions">
          ${hasNext ? `<button class="btn primary" data-a="next">${ICONS.play}${t('next')}</button>` : ''}
          ${res.won && isLast ? `<button class="btn primary" data-a="complete">${t('campaignComplete')}</button>` : ''}
          <button class="btn${hasNext || (res.won && isLast) ? '' : ' primary'}" data-a="retry">${t('retry')}</button>
          <button class="btn" data-a="menu">${t('menu')}</button>
        </div>
        ${res.cp ? `<div class="unlock-note cp-earned">◆ ${t('cpEarned', { n: fmtNum(res.cp) })} · ${t('cpBalance')} ${fmtNum(Save.data.cp)}</div>` : ''}
        ${res.unlockedNext ? `<div class="unlock-note">▲ ${t('unlocked')}: ${esc(mt(MISSIONS[Game.missionIndex + 1])[0])}</div>` : ''}
      </div>`;
    const sc = $('.end-score', s); const t0 = performance.now(), target = res.score;
    const tick = (now) => { const k = clamp((now - t0) / 1400, 0, 1); sc.textContent = fmtNum(target * (1 - Math.pow(1 - k, 3))); if (k < 1 && this.cur === 'end') requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const go = async (a) => {
      $$('[data-a]', s).forEach((b) => { b.disabled = true; });
      await Platform.ads.midgame();
      if (a === 'next') { this.selMission = Game.missionIndex + 1; Game.toMenu('briefing'); }
      else if (a === 'retry') Game.start(Game.missionIndex, Game.loadout.primary, Game.loadout.secondary);
      else if (a === 'complete') Game.toMenu('complete');
      else Game.toMenu('missions');
    };
    $$('[data-a]', s).forEach((b) => b.onclick = () => go(b.dataset.a));
  },
  render_complete() {
    const s = $('#complete');
    s.innerHTML = `<div class="end-box stagger">
      <div class="medal">${ICONS.medal}</div>
      <div class="h-kicker">${t('totalScore')} · ${fmtNum(Save.totalScore())}</div>
      <div class="end-title win" style="font-size:clamp(36px,7vw,76px)">${t('campaignComplete')}</div>
      <p class="muted" style="max-width:520px;margin:12px auto 22px;line-height:1.6">${t('campaignText')}</p>
      <div class="end-actions"><button class="btn primary" data-a="over">${t('startOver')}</button><button class="btn" data-a="keep">${t('keepPlaying')}</button></div></div>`;
    Save.data.completedOnce = true; Save.persist();
    $('[data-a=over]', s).onclick = () => this.confirmReset(() => this.show('missions', { wipe: true }));
    $('[data-a=keep]', s).onclick = () => this.show('missions', { wipe: true });
  },
  confirmReset(after) {
    const m = $('#m-confirm');
    m.innerHTML = `<div class="box panel"><div class="h-kicker">${t('resetCampaign')}</div><p class="confirm-text">${t('confirmReset')}</p><div class="end-actions"><button class="btn danger primary" data-a="yes">${t('yes')}</button><button class="btn" data-a="no">${t('cancel')}</button></div></div>`;
    this.openModal('m-confirm');
    $('[data-a=yes]', m).onclick = () => { Save.resetCampaign(); this.closeModal(); this.loadout = null; after && after(); };
    $('[data-a=no]', m).onclick = () => this.closeModal();
  },
  render_modal_pause() {
    const m = $('#m-pause'), mi = MISSIONS[Game.missionIndex];
    m.innerHTML = `<div class="box panel stagger">
      <div class="h-kicker">${t('paused')} · OP ${String(Game.missionIndex + 1).padStart(2, '0')}</div>
      <h2 class="h-display" style="font-size:28px">${esc(mt(mi)[0])}</h2>
      <button class="btn primary" data-a="resume">${ICONS.play}${t('resume')}</button>
      <button class="btn" data-a="restart">${t('restart')}</button>
      <button class="btn" data-a="settings">${ICONS.gear}${t('settings')}</button>
      <button class="btn" data-a="controls">${ICONS.pad}${t('controls')}</button>
      <button class="btn danger" data-a="abort">${t('abort')}</button></div>`;
    $('[data-a=resume]', m).onclick = () => Game.resume();
    $('[data-a=restart]', m).onclick = () => { this.closeModal(); Game.restart(); };
    $('[data-a=settings]', m).onclick = () => this.openModal('m-settings');
    $('[data-a=controls]', m).onclick = () => this.openModal('m-controls');
    $('[data-a=abort]', m).onclick = () => { this.closeModal(); Game.abort(); };
    setTimeout(() => !Input.st.touch && $('[data-a=resume]', m).focus(), 60);
  },
  render_modal_out() {
    const m = $('#m-out'), ad = Platform.ads.canReward();
    m.innerHTML = `<div class="box panel out-box stagger">
      <div class="h-kicker" style="color:var(--red)">${t('youDied')}</div>
      <h2 class="h-display" style="font-size:clamp(26px,5vw,40px)">${t('outTitle')}</h2>
      <p class="muted" style="line-height:1.5;margin:4px 0 8px">${t('outText')}</p>
      ${ad ? `<button class="btn primary" data-a="revive">${ICONS.play}${t('revive')}<span class="sub">${t('watchAd')}</span></button>` : ''}
      <button class="btn${ad ? '' : ' primary'}" data-a="restart">${t('restartMission')}</button></div>`;
    const rv = $('[data-a=revive]', m);
    if (rv) rv.onclick = async () => { if (await Ads.reward()) Game.revive(); else this.render_modal_out(); };
    $('[data-a=restart]', m).onclick = () => { this.closeModal(); Game.restart(); };
    setTimeout(() => !Input.st.touch && $('.btn', m) && $('.btn', m).focus(), 60);
  },
  render_modal_settings() {
    const m = $('#m-settings'), st = Save.settings;
    const seg = (key, opts) => `<span class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(st[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
    const range = (key, min, max, step, fmt) => `<span class="row"><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${st[key]}"><span class="val">${fmt(st[key])}</span></span>`;
    const tog = (key) => `<button class="toggle${st[key] ? ' on' : ''}" data-k="${key}" aria-pressed="${!!st[key]}"></button>`;
    m.innerHTML = `<div class="box panel wide"><div class="row"><button class="back" data-a="close">${ICONS.back}</button><h2 class="h-display" style="font-size:28px">${t('settings')}</h2></div>
      <div class="scroll">
        <div class="setting"><span>${t('sens')}</span>${range('sens', 0.2, 3, 0.05, (v) => (+v).toFixed(2))}</div>
        <div class="setting"><span>${t('invert')}</span>${tog('invert')}</div>
        <div class="setting"><span>${t('fov')}</span>${range('fov', 65, 105, 1, (v) => v + '°')}</div>
        <div class="setting"><span>${t('quality')}</span>${seg('quality', [['auto', t('auto')], ['low', t('low')], ['med', t('med')], ['high', t('high')]])}</div>
        <div class="setting"><span>${t('volume')}</span>${range('volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}</div>
        <div class="setting"><span>${t('music')}</span>${range('music', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}</div>
        <div class="setting"><span>${t('aimAssist')}</span>${tog('aimAssist')}</div>
        <div class="setting"><span>${t('autoFire')}</span>${tog('autoFire')}</div>
        <div class="setting"><span>${t('touchSize')}</span>${range('touchScale', 0.8, 1.3, 0.05, (v) => Math.round(v * 100) + '%')}</div>
        <div class="setting"><span>${t('showFps')}</span>${tog('fps')}</div>
        <div class="setting"><span>${t('language')}</span>${seg('lang', [['auto', t('auto')], ['en', 'EN'], ['es', 'ES'], ['pt', 'PT'], ['fr', 'FR']])}</div>
        ${Game.state !== 'play' ? `<div class="setting"><span>${t('resetCampaign')}</span><button class="btn small danger" data-a="reset">${t('resetCampaign')}</button></div>` : ''}
      </div></div>`;
    $('[data-a=close]', m).onclick = () => this.closeModal();
    $$('input[type=range]', m).forEach((inp) => inp.oninput = () => {
      const k = inp.dataset.k; st[k] = +inp.value;       const fmts = { sens: (v) => (+v).toFixed(2), fov: (v) => v + '°', volume: (v) => Math.round(v * 100) + '%', music: (v) => Math.round(v * 100) + '%', touchScale: (v) => Math.round(v * 100) + '%' };
      inp.nextElementSibling.textContent = fmts[k](st[k]);
      if (k === 'volume' || k === 'music') Audio.applyVolume();
      if (k === 'touchScale') document.documentElement.style.setProperty('--touch-scale', st[k]);
      Save.persist();
    });
    $$('.toggle', m).forEach((b) => b.onclick = () => { const k = b.dataset.k; st[k] = !st[k]; b.classList.toggle('on', st[k]); Save.persist(); });
    $$('.seg', m).forEach((sg) => $$('button', sg).forEach((b) => b.onclick = async () => {
      const k = sg.dataset.k; st[k] = b.dataset.v; $$('button', sg).forEach((x) => x.classList.toggle('on', x === b)); Save.persist();
      if (k === 'quality') { World.composer = null; World.applyQuality(); }
      if (k === 'lang') { await applyLanguage(); this.render_modal_settings(); if (this.cur && Game.state !== 'play') this['render_' + this.cur] && this['render_' + this.cur](); }
    }));
    const rs = $('[data-a=reset]', m); if (rs) rs.onclick = () => this.confirmReset(() => { if (this.cur === 'missions' || this.cur === 'menu') this['render_' + this.cur](); });
  },
  render_modal_controls() {
    const m = $('#m-controls');
    const kv = (a, b) => `<div class="kv"><span>${a}</span><kbd>${b}</kbd></div>`;
    m.innerHTML = `<div class="box panel wide"><div class="row"><button class="back" data-a="close">${ICONS.back}</button><h2 class="h-display" style="font-size:28px">${t('controls')}</h2></div>
      <div class="scroll"><div class="controls-grid">
        <div><h4>${t('ctlDesktop')}</h4>${kv(t('move'), 'W A S D')}${kv(t('look'), 'MOUSE')}${kv(t('fire'), 'LMB')}${kv(t('aim'), 'RMB')}${kv(t('reload'), 'R')}${kv(t('jump'), 'SPACE')}${kv(t('crouch'), 'C / CTRL')}${kv(t('sprint'), 'SHIFT')}${kv(t('swap'), 'Q / 1 / 2 / WHEEL')}${kv(t('interact'), 'E')}${kv(t('getAmmo') + ' (AD)', 'G')}${kv(t('pauseK'), 'ESC / P')}</div>
        <div><h4>${t('ctlTouch')}</h4>${kv(t('move'), t('joystick'))}${kv(t('look'), t('dragRight'))}${kv(t('fire'), '◎')}${kv(t('aim'), '⌖')}${kv(t('reload'), '⟳')}${kv(t('jump'), '▲')}${kv(t('crouch'), '▼')}${kv(t('swap'), '⇄')}${kv(t('interact'), '✋')}</div>
        <div><h4>${t('ctlPad')}</h4>${kv(t('move'), t('leftStick'))}${kv(t('look'), t('rightStick'))}${kv(t('fire'), 'RT')}${kv(t('aim'), 'LT')}${kv(t('reload'), 'X')}${kv(t('jump'), 'A')}${kv(t('crouch'), 'B')}${kv(t('sprint'), 'L3')}${kv(t('swap'), 'Y')}${kv(t('interact'), 'LB / RB')}${kv(t('pauseK'), 'START')}</div>
      </div></div></div>`;
    $('[data-a=close]', m).onclick = () => this.closeModal();
  },
};

const Game = {
  state: 'boot', actors: [], player: null, mode: null, missionIndex: 0, time: 0, active: false, over: false, paused: false,
  countdownT: 0, slowmo: 1, result: null, starting: false, loadout: null, lastKillT: -99, multiKills: 0, outCard: false, starts: 0, offerGun: null,
  noise(src, radius) {
    if (radius <= 0) return;
    const from = src.chest(TMP.n1 || (TMP.n1 = new THREE.Vector3())), to = TMP.n2 || (TMP.n2 = new THREE.Vector3());
    for (const a of this.actors) {
      if (!a.bot || !a.alive || a.team === src.team) continue;
      const r = radius * (a.bot.hearMul || 1), d = dist2D(a.pos, src.pos);
      if (d >= r) continue;
      if (d >= r * 0.5 && !World.los(from, a.eye(to))) continue;
      a.bot.sense(src, false);
    }
  },
  async start(index, primary, secondary, quick = false) {
    if (this.starting) return; this.starting = true;
    try {
      Audio.unlock();
      Platform.gameplayStop();
      this.cleanup();
      this.missionIndex = index;
      Arsenal.enter(index);
      if (!Arsenal.usable(primary)) primary = 'none';
      if (!Arsenal.usable(secondary)) secondary = 'pistol';
      this.loadout = { primary, secondary };
      if (quick) await Ui.show(null); else await Ui.deploySequence(index);
      const m = MISSIONS[index];
      Lobby.show(false);
      this.time = 0; this.over = false; this.result = null; this.slowmo = 1;
      ACTOR_ID = 0;
      const player = new Actor({ name: t('you'), team: 'A' });
      player.ent = new window.YUKA.GameEntity(); player.isPlayer = true;
      this.player = player; this.actors = [player];
      Player.setLoadout(primary, secondary);
      Player.shotsFired = 0; Player.shotsHit = 0;
      this.mode = new (MODES[m.mode])(m, index);
      this.mode.setup();
      if (m.deaths) player.lives = m.deaths;
      this.lastKillT = -99; this.multiKills = 0; this.outCard = false;
      this.starts++; this.offerGun = quick ? null : Ui.offerPick(m, this.starts);
      for (const a of this.actors) if (a.bot) a.bot.marker.visible = a.team === player.team && a.alive;
      Hud.reset(); Hud.show(true);
      Input.resetToggles();
      this.countdownT = 3.2; this.lastCount = 4;
      this.state = 'play'; this.active = true; this.paused = false;
      document.body.classList.add('ingame');
      await Ui.show(null);
      Input.enable(true);
      if (!Input.st.touch) Input.requestLock();
      Loop.start();
      Platform.gameplayStart();
    } finally { this.starting = false; }
  },
  holdForAd() {
    this.paused = true; Input.enable(false); document.body.classList.remove('ingame');
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    Platform.gameplayStop();
  },
  releaseAfterAd() {
    if (this.state !== 'play' || this.over) return;
    this.paused = false; Input.enable(true); document.body.classList.add('ingame');
    if (!Input.st.touch) Input.requestLock();
    Loop.start();
    if (this.player.alive && !this.outCard) Platform.gameplayStart();
  },
  async getAmmo() {
    if (this.state !== 'play' || this.over || this.paused || this.outCard || !this.player.alive || !Platform.ads.canReward()) return;
    this.holdForAd();
    if (await Ads.reward()) { Player.refillAmmo(); Ads.toast(t('ammoRefilled')); }
    this.releaseAfterAd();
  },
  async inGameOffer() {
    const id = this.offerGun; this.offerGun = null;
    if (!id || Arsenal.usable(id) || !Platform.ads.canReward()) return;
    Ui.lastOffer = this.starts;
    this.holdForAd();
    const vm = World.vmVisible; World.vmVisible = false;
    const got = await Ui.miniOffer(id, this.missionIndex);
    World.vmVisible = vm;
    if (got && this.state === 'play' && !this.over) { Player.giveWeapon(id); this.loadout[WEAPONS[id].slot] = id; }
    this.releaseAfterAd();
  },
  restart() {
    const lo = this.loadout || { primary: 'none', secondary: 'pistol' };
    Platform.ads.midgame().then(() => this.start(this.missionIndex, lo.primary, lo.secondary));
  },
  playerOut() {
    if (this.outCard || this.over) return;
    this.outCard = true;
    Platform.gameplayStop();
    setTimeout(() => {
      if (!this.outCard || this.state !== 'play' || this.over) return;
      this.paused = true; Input.enable(false); document.body.classList.remove('ingame');
      Ui.openModal('m-out'); Loop.stop(); World.render();
    }, 1400);
  },
  revive() {
    const p = this.player, mode = this.mode; if (!p || !mode) return;
    Ui.closeModal();
    const at = p.pos, zone = { x: [at.x - 9, at.x + 9], z: [at.z - 9, at.z + 9] };
    p.out = false; p.lives = 1; p.respawnAt = 0;
    mode.spawnActor(p, mode.safeSpawn(p, zone, 10));
    p.spawnTime = this.time + 0.4;
    this.outCard = false; this.paused = false;
    Hud.els.spec && Hud.els.spec.classList.remove('on');
    Input.enable(true); document.body.classList.add('ingame');
    if (!Input.st.touch) Input.requestLock();
    Loop.start(); Platform.gameplayStart();
  },
  update(rawDt) {
    const dt = rawDt * this.slowmo;
    const inp = Input.sample(rawDt);
    if (inp.pressed.has('pause') && !this.over) { this.openPause(); return; }
    if (inp.pressed.has('ammo') && !this.over) { this.getAmmo(); return; }
    if (this.countdownT > 0) {
      this.countdownT -= rawDt;
      const n = Math.ceil(this.countdownT);
      if (n !== this.lastCount && n >= 0) {
        this.lastCount = n;
        if (n > 0) { Hud.countdown(n); Audio.countdown(false); } else { Hud.countdown(t('go')); Audio.countdown(true); setTimeout(() => Hud.countdown(''), 700); }
      }
      inp.mx = 0; inp.my = 0; inp.fire = false; inp.pressed.clear();
      Player.update(rawDt, inp);
      this.syncEnts();
      Hud.update(rawDt);
      return;
    }
    if (this.offerGun && (inp.mx || inp.my || inp.fire) && this.player.alive && !this.over) { this.inGameOffer(); return; }
    this.time += dt;
    Player.update(dt, inp);
    this.syncEnts();
    Nav.crowd.update(dt);
    const camPos = World.camera.position;
    for (const a of this.actors) if (a.bot) a.bot.update(dt, camPos);
    this.mode.update(dt);
    FX.update(dt);
    World.updateFlicker(dt);
    Hud.update(dt);
  },
  syncEnts() { for (const a of this.actors) if (a.ent && !a.bot) a.ent.position.set(a.pos.x, a.pos.y + 1.4, a.pos.z); },
  finish(won, reason) {
    if (this.over) return;
    if (!won && reason === 'r_dead' && this.mode.m.deaths && this.player.out) { this.playerOut(); return; }
    this.over = true; this.slowmo = 0.3; this.outCard = false;
    Platform.gameplayStop();
    if (won) Platform.happytime();
    const p = this.player, mode = this.mode;
    const stars = mode.stars(won);
    const score = Math.max(0, Math.round(mode.finalScore(won)));
    const cp = Math.round(score * (won ? 0.2 : 0.07)) + p.headshots * 15 + this.multiKills * 30;
    Save.data.cp += cp; Save.data.played = (Save.data.played | 0) + 1;
    const rec = Save.record(this.missionIndex, { won, score, stars });
    this.result = {
      won, reason, score, stars, newBest: rec.newBest, unlockedNext: rec.unlockedNext, cp,
      kills: p.kills, deaths: p.deaths, head: p.headshots, time: mode.elapsed != null ? mode.elapsed : this.time,
      acc: Player.shotsFired ? Math.round((Player.shotsHit / Player.shotsFired) * 100) : 0,
    };
    Hud.banner(won ? t('victory') : t('defeat'), t(reason));
    Audio.sting(won);
    setTimeout(() => {
      if (!this.over || this.state !== 'play') return;
      this.state = 'end'; this.active = false;
      Input.enable(false); document.body.classList.remove('ingame');
      Hud.show(false);
      Ui.show('end');
    }, 2200);
  },
  openPause() {
    if (this.state !== 'play' || this.paused || this.over) return;
    this.paused = true; Input.enable(false); document.body.classList.remove('ingame'); document.body.classList.add('paused');
    Platform.gameplayStop();
    Ui.openModal('m-pause'); Loop.stop(); World.render();
  },
  resume() {
    if (!this.paused) return;
    Ui.closeModal(); this.paused = false; Input.enable(true); document.body.classList.add('ingame'); document.body.classList.remove('paused');
    if (!Input.st.touch) Input.requestLock();
    Loop.start();
    if (this.player && this.player.alive && !this.outCard) Platform.gameplayStart();
  },
  abort() { this.toMenu('missions'); },
  async toMenu(screen = 'menu') {
    Platform.gameplayStop(); this.outCard = false;
    if (screen !== 'briefing') Arsenal.leave();
    await Ui.wipe('');
    this.cleanup();
    this.state = 'menu'; this.paused = false; document.body.classList.remove('paused');
    Hud.show(false); Input.enable(false); document.body.classList.remove('ingame');
    Lobby.show(true); Loop.start();
    await Ui.show(screen);
    Ui.unwipe();
  },
  cleanup() {
    for (const a of this.actors) if (a.bot) a.bot.despawn();
    if (this.mode) this.mode.dispose();
    if (Player.agent) Player.agent.teleport({ x: 0, y: -50, z: 0 });
    this.actors = []; this.mode = null; this.active = false;
    FX.clear(); World.vmVisible = false; $('#scope').classList.remove('on');
    World.setLightsOut && World.lightsOut && World.setLightsOut(false);
    World.camera.fov = Save.settings.fov; World.camera.updateProjectionMatrix();
  },
};

const Loop = {
  raf: 0, last: 0, running: false,
  start() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame((t2) => this.frame(t2)); },
  stop() { this.running = false; cancelAnimationFrame(this.raf); },
  frame(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame((t2) => this.frame(t2));
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    try {
      if (Game.state === 'play' && !Game.paused) Game.update(dt);
      else if (Lobby.active) Lobby.update(dt);
      if (Game.state === 'play' && Lobby.display) Lobby.updateDisplay(dt);
      if (Game.state !== 'play') menuPad();
      World.adapt(dt);
      World.render();
    } catch (e) { console.error(e); Platform.logError(); }
  },
};

const padNav = { prev: [], cool: 0 };
function menuPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && Array.from(pads).find((g) => g && g.connected); if (!p) return;
  const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
  const edge = (i) => { const v = b(i), was = padNav.prev[i]; padNav.prev[i] = v; return v && !was; };
  const root = Ui.modal ? $('#' + Ui.modal) : Ui.cur ? $('#' + Ui.cur) : null; if (!root) return;
  const items = $$('.btn, .mcard, .wcard, .back, .seg button, .toggle', root).filter((x) => x.offsetParent);
  if (!items.length) return;
  let i = items.indexOf(document.activeElement);
  padNav.cool -= 1 / 60;
  const ay = p.axes[1] || 0, ax = p.axes[0] || 0;
  const dirDown = b(13) || ay > 0.6 || b(15) || ax > 0.6, dirUp = b(12) || ay < -0.6 || b(14) || ax < -0.6;
  if ((dirDown || dirUp) && padNav.cool <= 0) { padNav.cool = 0.2; i = dirDown ? (i + 1) % items.length : (i - 1 + items.length) % items.length; items[i].focus(); Audio.ui('hover'); }
  if (!dirDown && !dirUp) padNav.cool = 0;
  if (edge(0) && document.activeElement && items.includes(document.activeElement)) document.activeElement.click();
  if (edge(1)) { const back = $('.back', root); if (Ui.modal) Ui.closeModal(); else if (back) back.click(); }
  if (edge(9) && document.activeElement) document.activeElement.click();
}

async function applyLanguage() {
  const pref = Save.settings.lang;
  const l = pref && pref !== 'auto' ? pref : await Platform.getLanguage();
  LANG = STR[l] ? l : 'en';
  document.documentElement.lang = LANG;
}

function blockPageScroll() {
  const keys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'];
  addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.code === 'Space' && tag === 'BUTTON')) return;
    if (keys.includes(e.code)) e.preventDefault();
  });
  const scrollable = (n) => {
    for (; n && n !== document.body; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  };
  addEventListener('wheel', (e) => { if (!scrollable(e.target)) e.preventDefault(); }, { passive: false });
}

function wirePlatform() {
  blockPageScroll();
  Audio.setPlatformEnabled(Platform.isAudioEnabled());
  Platform.onAudioEnabledChange((on) => Audio.setPlatformEnabled(on));
  Platform.onPause(() => {
    Save.persist(true);
    Audio.setSuspended(true);
    if (Game.state === 'play' && !Game.paused && !Game.over) Game.openPause();
    Loop.stop();
  });
  Platform.onResume(() => {
    Audio.setSuspended(false);
    if (Game.state === 'play' && Game.paused) { World.render(); return; }
    if (Game.state !== 'play' || !Game.paused) Loop.start();
  });
}

async function boot() {
  const status = $('#boot-status'), fill = $('#boot-fill'), tip = $('#boot-tip');
  const setStatus = (k) => { status.textContent = t(k); };
  await nextFrame(); await nextFrame();
  await Platform.init();
  Platform.loadingStart();
  const savePromise = Save.load().then(applyLanguage);
  Loader.total = LIBS.reduce((a, l) => a + l[1], 0) + Object.values(ASSET_FILES).reduce((a, f) => a + f[1], 0);
  Loader.onProgress = (k) => { fill.style.transform = `scaleX(${k})`; };
  try {
    setStatus('libs');
    for (const [src, kb] of LIBS) await Loader.script(src, kb);
    await savePromise;
    $('#boot-sub').textContent = t('tagline');
    const tips = STR[LANG].tips || STR.en.tips; let ti = randi(0, tips.length - 1);
    tip.textContent = tips[ti]; setInterval(() => { if (Game.state === 'boot') { ti = (ti + 1) % tips.length; tip.textContent = tips[ti]; } }, 3500);
    AI = defineAI();
    World.init(); buildTextures(); FX.init();
    Input.attach(World.renderer.domElement);
    setStatus('assets');
    const loader = new THREE.GLTFLoader();
    loader.register((parser) => {
      parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
      parser.textureLoader.setCrossOrigin(parser.options.crossOrigin);
      return { name: 'backrooms_img_textures' };
    });
    const parse = (buf) => new Promise((res, rej) => loader.parse(buf, '', res, rej));
    const entries = Object.entries(ASSET_FILES);
    const bufs = await Promise.all(entries.map(([k, [url, kb]]) => Loader.binary(url, kb).then((b) => [k, b])));
    setStatus('building');
    await nextFrame();
    for (const [k, b] of bufs) {
      if (k === 'nav') Assets.nav = b;
      else if (k === 'map') Assets.map = await parse(b);
      else if (k === 'npc') Assets.npc = await parse(b);
      else Assets.guns[k] = await parse(b);
    }
    World.setupMap(Assets.map);
    setStatus('nav');
    await Nav.init(Assets.nav);
    Player.init(); Ui.init(); Hud.init(); Lobby.init();
    wirePlatform();
    World.camera.fov = 62; World.camera.updateProjectionMatrix();
    Lobby.show(true);
    Lobby.update(0.016); World.renderer.compile(World.scene, World.camera); World.render();
    Loop.start();
    setStatus('ready'); fill.style.transform = 'scaleX(1)';
    const quick = !(Save.data.played > 0) && !Object.keys(Save.data.missions).length && !/[?&]menu=1\b/.test(location.search);
    const btn = $('#boot-enter'); btn.textContent = quick ? t('playNow') : t('enter'); btn.classList.remove('hidden');
    Platform.gameReady();
    const enter = () => {
      if (Game.state !== 'boot') return;
      Game.state = 'menu'; Audio.unlock(); Audio.ui();
      const b = $('#boot'); b.classList.add('leaving'); setTimeout(() => b.remove(), 400);
      if (quick) Game.start(0, 'none', 'pistol', true);
      else Ui.show('menu');
    };
    btn.addEventListener('click', enter);
    addEventListener('keydown', (e) => { if (Game.state === 'boot' && (e.code === 'Enter' || e.code === 'Space')) enter(); });
    if (!Input.st.touch) btn.focus();
  } catch (e) {
    console.error(e);
    Platform.logError();
    status.textContent = 'ERROR — ' + (e && e.message ? e.message : e);
  }
}

if (/[?&]debug\b/.test(location.search)) window.__BR = { Game, Player, Save, MISSIONS, Ui, World, Nav, Hud, Lobby, Audio, Input, Loop, Combat, rayVsSoldier, FX, Arsenal, Platform };

boot();
})();
