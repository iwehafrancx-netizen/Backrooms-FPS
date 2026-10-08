# Backrooms - FPS: CrazyGames QA report

This is the result of the automated QA pass on the **exact upload file** `dist/backrooms-crazygames.zip`. Each check runs in a real Chromium browser, inside an `<iframe>` like the one on the CrazyGames page, using a stand-in for the CrazyGames SDK. You can re-run it with `cd tools && npm run qa-crazygames`.

CrazyGames' own QA team still plays the game themselves, so their review decides. This pass covers everything in their published requirements that can be checked automatically.

## Result

| | |
|---|---|
| Full runs on the final zip | 7 full runs plus 5 extra runs of the ads section. The ads check that failed in runs 3 and 5 was the test's own timing, now fixed; every other check passed on every run, including the final one below |
| Older suites | CrazyGames edition 47/47 · screen sizes: nothing cut off at 800×450 and 907×510 · frame rate: same at 60/144/165 Hz · all 12 missions play, no errors · YouTube Playables version: 34/34, files unchanged |
| Left for you | the Sketchfab details for the map, the M4 and the sniper (see "What only you can do") |

## Problems the QA pass found, now fixed (CrazyGames copy only)

1. **Graphics memory leak.** Each mission's soldiers left their animation textures in graphics memory after quitting, and so did the mission props (keycards, beams, panels). After 36 missions that was about 800 textures. They're now freed when a mission ends; memory stays flat over 24 start/quit cycles.
2. **Fire rate depended on frame rate.** At 30 FPS the AK-47 fired 15 shots in 2 s instead of 20, and soldiers had the same problem. Leftover time between shots is now carried over, so you get 20 shots at 30, 60, 144, 165 and 240 FPS.
3. **A broken save could stop the game from loading.** A save with wrong data types (for example `missions: null`) hung the loading screen. Bad values are now repaired on load.
4. **Muted at load.** When CrazyGames' mute was on as the game loaded, the game was silent but its audio engine kept running. It now stays paused until unmuted.
5. **Small labels on gun cards.** The CP price, OR and THIS MISSION text went from 8.5 px to 9–9.5 px. The tiny GET AMMO (mobile) and "Watch an ad" labels you asked for are unchanged.
6. **Name and credits.** The browser tab now says **Backrooms - FPS**. The three CC BY 4.0 guns from Sketchfab are credited in **Settings → Credits** and in `LICENSES.txt`.

## What only you can do before submitting

- **Model credits:** send the Sketchfab links for the **Backrooms map**, the **M4** and the **sniper**. Their author and license details were lost when they were re-saved in Blender. If any of them is **CC BY-NC** (non-commercial), it can't be used on CrazyGames and must be replaced.
- **Covers:** landscape 1920×1080, portrait 800×1200, square 800×800.
- **Real preview:** open the game once in the developer portal's **Preview / QA tool**, which uses the real CrazyGames SDK and real ads.
- **Name:** "Backrooms - FPS" is set. Many games on CrazyGames start with "Backrooms", so QA may ask for something more distinctive.

## Every check (final run)


### Package and rules

| | Check |
|---|---|
| ✅ | upload zip exists |
| ✅ | index.html is at the root of the zip |
| ✅ | file count is under 1500 |
| ✅ | initial download under 20 MB (mobile homepage) and 50 MB (hard limit) |
| ✅ | nothing dev-only shipped (tests, mock SDK, source maps, sources) |
| ✅ | only external URL is the CrazyGames SDK |
| ✅ | all file paths are relative |
| ✅ | CrazyGames SDK v3 script tag is in <head>, before the game |
| ✅ | no fullscreen button |
| ✅ | no window.open / external link |
| ✅ | no alert/confirm/prompt |
| ✅ | no service worker |
| ✅ | no other ad networks |
| ✅ | no real-money purchases |
| ✅ | no cross-promotion |
| ✅ | page title is "Backrooms - FPS", html lang="en" |
| ✅ | debug hook only exists with ?debug |
| ✅ | every text exists in English, Spanish, Portuguese and French |
| ✅ | no blood or gore in the game code |
| ✅ | LICENSES.txt ships with library credits |
| ✅ | every CC BY model author is credited in the game (Settings > Credits) |

### Loading, first click and screens (7 sizes, iframe, EN/FR/PT)

| | Check |
|---|---|
| ✅ | 800x450@1x: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 800x450@1x: no gameplayStart before the player clicks |
| ✅ | 800x450@1x: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 800x450@1x: gameplayStart once the mission is playable |
| ✅ | 800x450@1x: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 800x450@1x: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 800x450@1x: smallest text is at least 7 px |
| ✅ | 800x450@1x: no errors, no missing files, no external requests |
| ✅ | 800x450@2x: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 800x450@2x: no gameplayStart before the player clicks |
| ✅ | 800x450@2x: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 800x450@2x: gameplayStart once the mission is playable |
| ✅ | 800x450@2x: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 800x450@2x: no errors, no missing files, no external requests |
| ✅ | 907x510@1x: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 907x510@1x: no gameplayStart before the player clicks |
| ✅ | 907x510@1x: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 907x510@1x: gameplayStart once the mission is playable |
| ✅ | 907x510@1x: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 907x510@1x: no errors, no missing files, no external requests |
| ✅ | 907x510@2x: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 907x510@2x: no gameplayStart before the player clicks |
| ✅ | 907x510@2x: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 907x510@2x: gameplayStart once the mission is playable |
| ✅ | 907x510@2x: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 907x510@2x: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 907x510@2x: smallest text is at least 7 px |
| ✅ | 907x510@2x: no errors, no missing files, no external requests |
| ✅ | 1280x720@1x: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 1280x720@1x: no gameplayStart before the player clicks |
| ✅ | 1280x720@1x: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 1280x720@1x: gameplayStart once the mission is playable |
| ✅ | 1280x720@1x: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 1280x720@1x: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 1280x720@1x: smallest text is at least 7 px |
| ✅ | 1280x720@1x: no errors, no missing files, no external requests |
| ✅ | 844x390@3x-touch: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 844x390@3x-touch: no gameplayStart before the player clicks |
| ✅ | 844x390@3x-touch: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 844x390@3x-touch: gameplayStart once the mission is playable |
| ✅ | 844x390@3x-touch: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 844x390@3x-touch: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 844x390@3x-touch: smallest text is at least 7 px |
| ✅ | 844x390@3x-touch: no errors, no missing files, no external requests |
| ✅ | 390x844@3x-touch: loads inside an iframe, SDK init > loadingStart > loadingStop |
| ✅ | 390x844@3x-touch: no gameplayStart before the player clicks |
| ✅ | 390x844@3x-touch: new player, 1 click ("PLAY") > Operation 1 with AK-47 + pistol |
| ✅ | 390x844@3x-touch: gameplayStart once the mission is playable |
| ✅ | 390x844@3x-touch: 3D view fills the frame, correct aspect, sharp but capped resolution |
| ✅ | 390x844@3x-touch: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 390x844@3x-touch: smallest text is at least 7 px |
| ✅ | 390x844@3x-touch: no errors, no missing files, no external requests |
| ✅ | 800x450-french: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 800x450-french: smallest text is at least 7 px |
| ✅ | 390x844-portuguese: no button, card or text off-screen or cut off on 10 screens |
| ✅ | 390x844-portuguese: smallest text is at least 7 px |
| ✅ | returning player: ENTER opens the menu (progress kept) |

### Gameplay events and ads

| | Check |
|---|---|
| ✅ | gameplayStart when the mission starts |
| ✅ | gameplayStop on pause |
| ✅ | gameplayStart on resume |
| ✅ | tab hidden: game pauses, loop stops, sound suspended, gameplayStop |
| ✅ | tab visible again: waits on the pause menu (no surprise restart), sound back |
| ✅ | during an ad: loop stopped, screen covered, clicks blocked, sound muted, keys ignored |
| ✅ | during an ad: gameplayStop was sent |
| ✅ | after a rewarded ad: reward given (ammo), game resumes, sound back, gameplayStart |
| ✅ | ad error: no reward, a message, game resumes, ad button hides (no dead button) |
| ✅ | an ad that never starts gives up after 30 s and the game carries on (no reward) |
| ✅ | win: happytime + gameplayStop |
| ✅ | leaving results plays a midgame ad |
| ✅ | every ad (midgame and rewarded) was requested with gameplay stopped |
| ✅ | no midgame ad during active play (only at breaks) |
| ✅ | gameplayStart / gameplayStop never sent twice in a row |
| ✅ | no errors |

### Ad blocker and Basic Launch (ads off)

| | Check |
|---|---|
| ✅ | SDK blocked (ad blocker): game still loads and one click starts Operation 1 |
| ✅ | ad blocker: no GET AMMO button |
| ✅ | ad blocker: no WATCH AD buttons, BUY with CP still there, no gun offer |
| ✅ | ad blocker: out of lives shows RESTART only (no dead REVIVE) |
| ✅ | ad blocker: RESTART works |
| ✅ | ad blocker: progress saved to browser storage instead |
| ✅ | ad blocker: progress survives a reload |
| ✅ | ad blocker: no errors or missing files (only the blocked SDK fails) |
| ✅ | Basic Launch (every ad fails): all 12 missions can be started from DEPLOY without an ad |
| ✅ | Basic Launch: after the first failed ad, WATCH AD buttons hide |
| ✅ | Basic Launch: no WATCH AD on the loadout while ads are failing |
| ✅ | Basic Launch: guns can still be bought with CP |
| ✅ | Basic Launch: out card shows RESTART only |
| ✅ | Basic Launch: RESTART still restarts when the midgame ad fails |
| ✅ | Basic Launch: no errors |

### Sound and language

| | Check |
|---|---|
| ✅ | CrazyGames "mute" setting on at load: game stays silent |
| ✅ | mute setting changed live: sound follows it |
| ✅ | locale es-ES > es |
| ✅ | locale pt-BR > pt |
| ✅ | locale fr-FR > fr |
| ✅ | locale de-DE > English fallback |

### Controls and page

| | Check |
|---|---|
| ✅ | menus: wheel, arrows, Space, PageDown never scroll the host page |
| ✅ | click in game asks for mouse lock |
| ✅ | in game: wheel, arrows, Space, PageDown, Tab never scroll the host page |
| ✅ | right-click menu is blocked in game |
| ✅ | AZERTY keyboards: Z/Q move forward/left (physical keys), arrow keys also move |
| ✅ | switching window releases held keys (no stuck movement) |
| ✅ | Esc pauses the game and frees the mouse |
| ✅ | resizing the frame mid-game: picture refits, no stretching |
| ✅ | no errors |

### Saving

| | Check |
|---|---|
| ✅ | progress is written through the CrazyGames Data module |
| ✅ | reload: progress and CP come back from the Data module |
| ✅ | reload: returning player lands on the menu, not a forced mission |
| ✅ | corrupted save (broken JSON): game still starts, no errors |
| ✅ | corrupted save (wrong types): game still starts, no errors |
| ✅ | corrupted save (bad mission records): game still starts, no errors |
| ✅ | corrupted save (empty object): game still starts, no errors |

### Stability and performance

| | Check |
|---|---|
| ✅ | all 12 missions start, play, and finish (win and loss) without errors |
| ✅ | 20 x start + quit: GPU geometry and textures stay flat (no leak) |
| ✅ | same movement and fire rate at 30, 60, 144, 165 and 240 Hz |
| ✅ | no errors |

**Total: 135/135 passed** on 2026-10-08.

**For you:** 3D model credits for the map, M4 and sniper are still placeholders in LICENSES.txt: send their Sketchfab links.

Screenshots of every screen at every size are saved in `tools/test/out/qa/shots/` when the suite runs.
