// Every piece of player-facing text. English is the reference; add a language
// by copying the `en` block. `t('key', {n: 3})` fills in {n}.
const STR = {
  en: {
    play: 'PLAY', tapToStart: 'Tap to start', levels: 'Heists', shop: 'Gear', settings: 'Settings', back: 'Back',
    area_suburbs: 'Maple Suburbs', area_apartments: 'Riverside Apartments', area_mansion: 'Hilltop Mansion',
    locked: 'Locked - use the lock pick', fuseOff: 'Power cut: cameras and lasers are off',
    alarm: 'ALARM! The guards are coming', targetsLeft: 'Targets left: {n}', getOut: 'Get to the van!',
    act_hide: 'Hide', act_unhide: 'Come out', act_pick: 'Pick lock', act_safe: 'Crack safe', act_fuse: 'Cut power',
    keyHint: 'E / Space: {act}', deskHint: 'Click to walk · Shift run · Q throw coin · E use',
    pickHelp: 'Press when the needle is in the green notch ({n} left)', pickFail: 'Clink! That made some noise...',
    tipSneak: 'Sneak in, grab the jewellery box, then get back to the van. Stay out of the light cones!',
    tipHide: 'Wardrobes, bathtubs and big plants are hiding spots. Walk up to one and press Use.',
    tipCoin: 'Throw a coin (Q / ◎) to make a guard look the other way.',
    tipPick: 'Locked doors need the lock pick: walk up and press Use.',
    tipSleep: 'People asleep wake up if you run near them. Tiptoe!',
    tipCamera: 'Cameras sweep the room. Cut the power at the fuse box to switch them off.',
    tipLaser: 'Red lasers trip the alarm. Cut the power or find another way round.',
    tipSafe: 'The big prize is in the safe. Crack it with the lock pick.',
    tipFinal: 'The biggest score of all. Good luck, Tip!',
    escaped: 'ESCAPED!', caught: 'CAUGHT!', caughtSub: 'The guard got you. Try a quieter way in.',
    starEscape: 'Escaped', starAll: 'All the loot', starUnseen: 'Never seen',
    loot: 'Loot', coins: 'Coins', next: 'Next heist', retry: 'Try again', menu: 'Heists', doubleCoins: 'Double coins (ad)',
    paused: 'Paused', resume: 'Resume', quit: 'Leave heist', volume: 'Sound', music: 'Music', quality: 'Graphics',
    q_low: 'Low', q_med: 'Medium', q_high: 'High',
    gear_sneakers: 'Soft sneakers', gear_sneakers_d: 'Running makes much less noise.',
    gear_pouch: 'Coin pouch', gear_pouch_d: 'Start every heist with 3 extra coins.',
    gear_pick: 'Pro lock pick', gear_pick_d: 'Wider green notch when picking locks.',
    gear_outfit: 'Night outfit', gear_outfit_d: 'A darker hoodie. Looks great.',
    buy: 'Buy {n}', owned: 'Owned', notEnough: 'Not enough coins yet', lockedLevel: 'Escape the heist before to unlock',
    howTitle: 'How to play', how1: 'Click or tap the floor to tiptoe there. Double-tap or hold Shift to run (noisy!).',
    how2: 'Guards see inside their light cones. "?" means suspicious, "!" means they spotted you.',
    how3: 'Hide in wardrobes, bathtubs or behind big plants. Throw coins to distract.',
    how4: 'Take every target, then get back to the van.', ok: 'Got it',
  },
};

let LANG = 'en';
export function setLanguage(code) { LANG = STR[code] ? code : 'en'; }
export function t(key, vars) {
  let s = (STR[LANG] && STR[LANG][key]) ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
