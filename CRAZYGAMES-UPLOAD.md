# Uploading Backrooms to CrazyGames

## 1. The file to upload
`dist/backrooms-crazygames.zip`, built from `Backrooms FPS CrazyGames/` with `cd tools && npm run zip-crazygames`.
- `index.html` sits at the root of the zip.
- 19 files, 6.0 MB unpacked, 2.8 MB zipped. CrazyGames' limits are a 50 MB initial download (20 MB for the mobile homepage), 250 MB total and 1500 files.
- All paths are relative.
- The CrazyGames SDK v3 loads from `https://sdk.crazygames.com/crazygames-sdk-v3.js`, the official URL.

## 2. Developer portal (developer.crazygames.com)
1. **Upload a new game:** choose **HTML5**, then upload the zip.
2. **Game details:**

| Field | What to enter |
|---|---|
| Title | Backrooms - FPS (the browser tab uses the same name). CrazyGames asks for names that stand out from existing games, and many titles there start with "Backrooms", so QA may ask for something more distinctive |
| Category | Shooting · FPS |
| Tags | 3D, first person shooter, backrooms, tactical, stealth, campaign, mobile |
| Controls | Desktop: WASD move, mouse aim, left click fire, right click aim, R reload, Space jump, C crouch, Shift sprint, Q swap, E interact, Esc pause and release the mouse. Mobile: left stick move, drag to look, on-screen buttons |
| Mobile | Supported (touch controls, landscape or portrait) |
| Orientation | Landscape (portrait also works) |
| Languages | English, Spanish, Portuguese, French (follows the CrazyGames locale) |
| Age / content | PEGI 12 style: shooting at human-like soldiers, no blood or gore |

3. **Credits:** fill in the 3D model lines at the top of `Backrooms FPS CrazyGames/LICENSES.txt` (model name, author, link, license) before uploading. If a license is CC-BY, the author must be credited where players can see it.
4. **Covers** (your own artwork, not a plain screenshot with the name on it):
   - Landscape 16:9: **1920 × 1080**
   - Portrait 2:3: **800 × 1200**
   - Square 1:1: **800 × 800**
   - Optional: a short preview video.
5. **Before submitting,** open the portal's **Preview / QA tool**. It runs the game inside a real CrazyGames page. Check that:
   - the game loads, and a new player clicks **PLAY** once and is in Operation 1;
   - ads show when leaving a results screen, on RESTART, on REVIVE, on GET AMMO and on gun rentals;
   - the game keeps working when an ad fails or the ad blocker is on.

**Automated QA:** `cd tools && npm run qa-crazygames` rebuilds the zip and runs every check in `CRAZYGAMES-QA-REPORT.md` on it, inside an iframe like the CrazyGames page.

## 3. Launch stages
- **Basic Launch (first 7–21 days):** CrazyGames turns all ads off. The game handles this:
  - every ad button hides;
  - guns can still be bought with CP;
  - RESTART is always available.
  - Nothing requires an ad.
- **Full Launch:** ads switch on and the revenue share starts.

## 4. What the game does for CrazyGames (checklist)

**Loading and gameplay events**
- [x] SDK v3 `init()` on the loading screen (5 s timeout).
- [x] `loadingStart()` and `loadingStop()` around loading.
- [x] `gameplayStart()` only when a mission is playable.
- [x] `gameplayStop()` on pause, the death card, results, menus and while ads play.
- [x] `happytime()` when a mission is won.

**Ads**
- [x] Midgame ads only at breaks: leaving a results screen, or RESTART. Never during play. The SDK applies its own frequency cap.
- [x] Rewarded ads only when the player taps REVIVE or WATCH AD. No reward on `adError`; the button disappears for 2 minutes and the player sees a message.
- [x] During an ad the game pauses, mutes and blocks input; it resumes on finish or error.

**Saving, sound and language**
- [x] Progress is saved with the CrazyGames **Data module**. It falls back to localStorage when the SDK isn't there.
- [x] The SDK `muteAudio` setting overrides the game's volume.
- [x] Language comes from `SDK.user.systemInfo.locale`, with English as the fallback.

**First click, controls and screen**
- [x] New players: one click (PLAY) → straight into Operation 1. Returning players: the menu.
- [x] Mouse locked during play; Esc releases it and pauses.
- [x] Arrow keys, Space and the mouse wheel never scroll the page.
- [x] No fullscreen button, external links, other ad networks or real-money purchases.
- [x] Readable at 800 × 450 and 907 × 510.
- [x] Movement and fire rates don't depend on the frame rate.

## 5. Monetization design in this edition

**Death limit, then REVIVE (rewarded ad, unlimited) or RESTART (midgame ad break)**

| Mission | Deaths |
|---|---|
| Keycard | 5 |
| Survival | 1 |
| Siege | 5 |
| Holdout | 3 |
| Ghost Protocol | 3 |
| Lights Out | 3 |
| Zero Hour | 3 |

The score-race missions have no limit.

**Guns:** the pistol is free. The others have two options: **buy with Combat Points (CP)** to own them forever, or **WATCH AD** to use them for one mission.

| Gun | Price |
|---|---|
| Tri-Barrel | 6,000 CP |
| AK-47 | 10,000 CP |
| M4 Carbine | 15,000 CP |
| Bolt Sniper | 22,000 CP |

**CP earned per mission:** 20% of the score on a win (7% on a loss), +15 per headshot, +30 per multi-kill.

**Gun offer:** in every other mission, after the 3-2-1 countdown, the first time the player moves, the game pauses. A small box pops up with a gun they don't own (turning in 3D) and two buttons, WATCH AD (use it this mission) and NO THANKS. The gun goes straight into their hands. Locked guns can also be bought with CP on the loadout screen.

**GET AMMO:** a button at the top of the gameplay screen (AD badge; G key on desktop, tap on mobile). It plays a rewarded ad, then refills every gun the player carries. It glows when they're low on ammo and only shows when an ad can play.

**Midgame ad** when leaving the results screen.
