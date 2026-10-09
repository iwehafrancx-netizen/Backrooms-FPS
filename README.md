# BACKROOMS: Level 0 Tactical Operations

A lightweight 3D first-person shooter built with three.js for **YouTube Playables**, to be published through **Mediacube**.
Everything runs offline from the game folder. The only external URL is the YouTube Playables SDK tag, which YouTube requires.

- **Engine:** three.js r180 · **AI:** Yuka · **Navigation:** recast-navigation-js (Recast/Detour, WASM)
- **Size:** 6.0 MiB unpacked (19 files), 2.8 MiB zipped
- **Platforms:** desktop (keyboard and mouse), mobile (touch, portrait or landscape) and gamepad
- **Languages:** English, Spanish, Portuguese and French, chosen automatically with `ytgame.system.getLanguage()`

---

## Folder layout

```
Backrooms FPS/            ← the YouTube Playables game. Zip the CONTENTS of this folder for submission.
  index.html              YouTube SDK <script> first, then the static boot screen, then game.js
  game.js                 the whole game (single file)
  css/style.css           all UI: menus, HUD, touch controls, transitions
  lib/three/              three.min.js, GLTFLoader.js, PointerLockControls.js,
                          SkeletonUtils.js, postprocessing.js
  lib/ai/yuka.min.js      Yuka game AI (your original file, moved here)
  lib/navigation/recast-navigation.js   Recast/Detour navigation (official npm build, WASM inlined)
  assets/Maps/            backroom.glb (optimized) + backroom.navmesh (pre-baked walkable area)
  assets/NPCs/            operator.glb (optimized, animations retargeted and named)
  assets/Guns/            pistol, shotgun, ak47, m4, sniper (.glb, optimized)
  LICENSES.txt            licenses of the bundled libraries
Backrooms FPS CrazyGames/ ← the CrazyGames edition and the SOURCE of the game (all game changes are made here)
source-assets/            your original, untouched .glb files (NOT shipped)
tools/                    developer tools (NOT shipped): builds, asset optimizer, navmesh baker, tests
dist/backrooms-fps.zip    the upload package, created by `npm run zip` (git-ignored)
```

### Libraries and what each one does
| File | Purpose |
|---|---|
| `three.min.js` | 3D rendering (three.js core, exposed as `window.THREE`) |
| `GLTFLoader.js` | loads the `.glb` map, soldier and guns |
| `PointerLockControls.js` | desktop mouse capture. If the YouTube iframe blocks pointer lock, the game falls back to free mouse-look automatically |
| **`SkeletonUtils.js`** *(extra)* | clones the animated soldier correctly, so one model file can spawn up to 12 soldiers, each with its own skeleton and animation |
| **`postprocessing.js`** *(extra)* | EffectComposer + RenderPass + UnrealBloomPass + OutputPass: glow on the fluorescent lights. It is only on at **High** graphics quality, so phones stay fast |
| `yuka.min.js` | bot brains: state machine (patrol → hunt → engage → retreat), vision cone with wall occlusion, short-term memory |
| `recast-navigation.js` | navmesh, pathfinding and the Detour **crowd**, which steers every soldier around walls, columns and each other. It also gives the player wall collision |

`recast-navigation.js` was downloaded from the official npm packages (`@recast-navigation/core`, `generators` and `wasm` 0.43.1, by Isaac Mason) and bundled into one classic script with the WebAssembly embedded. Nothing is fetched at runtime.

### How the NPCs know where to walk
1. `tools/build-navmesh.mjs` reads every floor and wall triangle of `backroom.glb` in world space. It skips the ceiling and light panels and feeds the triangles to Recast, using a 0.30 m agent radius, 0.9 m agent height and 0.3 m step height.
2. The map's carpet and ceiling planes extend past the building into an unlit void. A **flood fill** from inside the main hall keeps only the reachable interior, so nobody can spawn or walk out there.
3. The result is saved as `assets/Maps/backroom.navmesh` (45 KiB) and loads instantly at boot.
4. Every soldier is a Detour crowd agent. Yuka decides *where* to go (a patrol point, the last place an enemy was seen, a switch, the briefcase), and Recast finds the path and steers around walls and other soldiers.

---

## Two versions

| Folder | Use it for | YouTube integration |
|---|---|---|
| `Backrooms FPS/` | **Mediacube / YouTube Playables submission** (`npm run zip` syncs and packages this one) | YouTube Playables SDK (incl. `ytgame.ads` interstitial + rewarded), certification-tested |
| `Backrooms FPS CrazyGames/` | **CrazyGames upload** (`npm run zip-crazygames` → `dist/backrooms-crazygames.zip`) | CrazyGames SDK v3. Details below |

**One game, two platforms.** All three folders are the same game. Make game changes in `Backrooms FPS CrazyGames/`, then:
- `cd tools && npm run sync-youtube` regenerates `Backrooms FPS/`. It copies the game, CSS and assets and swaps only the platform layer for `tools/platform/youtube.js` (YouTube SDK: loading, saves, language, audio, pause, `requestInterstitialAd`, `requestRewardedAd`).
- `npm run web-demo` builds the browser test link from a temporary SDK-free copy (`Backrooms FPS Standalone/`, generated and not kept in the repository).

Don't edit the generated copies by hand.

**Browser test link:** `cd tools && npm run web-demo` builds `dist/web-demo/` from that SDK-free copy. That's the version published as the private claude.ai test link. It only adds what that host needs: the page skeleton is removed and the CSS inlined, and the `.glb`/`.navmesh` files ship as base64 text because the host won't serve `.glb`.

### What both editions have
- **Menu:** one soldier in a close, lit, CoD-style lobby shot, with the player's own menu music (`assets/Audio/music.mp3`). The music plays in menus only.
- **Shop:** guns are bought with **Combat Points (CP)**: Tri-Barrel 2,999 · AK-47 1,900 · M4 4,999 · Sniper 7,999. Affordable guns show a green **BUY NOW**.
- **Hostile armour:** from Operation 3, hostiles shrug off more AK-47 damage each operation (down to 64%). From Operation 5 the same applies to the M4, but less (down to 80%; the M4 always out-damages the AK). The Sniper, Tri-Barrel and pistol are unaffected. Briefings warn "Hostiles are getting stronger every operation".
- **Graphics Auto:** starts on High (Medium on 2G or data-saver connections). It drops to Medium, then Low, if the frame rate stays low, and remembers the level. Manual High, Medium or Low is never changed.

### CrazyGames edition
- **Platform layer:** the CrazyGames SDK v3 (init, loading and gameplay events, happytime, Data module saves, muteAudio, locale).
- **Ads:** midgame ads at breaks; rewarded ads for **REVIVE**, **GET AMMO** (HUD button or G key), and for trying a locked gun for one mission. The in-match gun offer is a small pop-up after the countdown, every other mission.
- **First play:** new players go straight into Operation 1 with one click.
- Upload steps, portal fields and the full rules checklist are in [CRAZYGAMES-UPLOAD.md](CRAZYGAMES-UPLOAD.md).
- **Test link:** `npm run web-demo-crazygames` builds `dist/web-demo-crazygames/`. It uses `tools/crazygames-test-sdk.js`, a local stand-in for the SDK that shows a labelled **TEST AD** screen instead of real ads. The real game loads the official SDK from CrazyGames.
- **Tests:** `GAME=crazygames node test/crazygames.mjs`. Any other test also runs against this copy with `GAME=crazygames`.

---

## Missions (unlock in order: clear one to open the next)

| # | Operation | Mode | Win condition |
|---|---|---|---|
| 1 | **Operation: Last Light** | Extermination · time trial | 3:00 on the clock. Reach 15 eliminations (★ 15 / ★★ 25 / ★★★ 35) |
| 2 | **Operation: Yellow Halls** | Team Deathmatch · 3v3 | First team to 20 eliminations |
| 3 | **Operation: Keymaster** | Keycard Extraction | Find 3 hidden keycards, then extract at the lift. Hostiles are shown on the radar |
| 4 | **Duel: The Mimic** | 1v1 Deathmatch | First to 15. The Mimic is armoured, regenerates, strafes and uses cover |
| 5 | **Operation: No Second Chances** | Squads Survival · teams of 2 | One life each. Be the last duo standing (you can spectate your teammate if you fall) |
| 6 | **Operation: Black Case** | Capture the Briefcase · time trial | Free-for-all with respawns. Whoever holds the case when 4:00 runs out wins; NPCs chase the holder, and an NPC holder flees and hides |
| 7 | **Operation: Override** | Siege · 6v6 · time trial | Hold Interact on both switches at the far ends of the enemy wing before they override yours (5:00) |
| 8 | **Operation: Holdout** | Waves | Survive 5 waves of growing squads in the central hall, 3 lives |
| 9 | **Operation: Ghost Protocol** | Stealth assassination | Eliminate 3 marked officers. Being spotted raises an alarm and brings reinforcements, 3 lives |
| 10 | **Operation: Hardpoint** | Hardpoint · 4v4 | Hold the zone (it moves every 60 s); first team to 150 points |
| 11 | **Operation: Lights Out** | Keycard Extraction II | The power fails: flashlight only, hunters track your noise, keycards hidden deeper, 3 lives. Hostiles are shown on the radar |
| 12 | **Finale: Zero Hour** | Boss assault | Kill the armoured Mimic and its hunters, then extract at the lift, 3 lives |

Completed operations can be replayed at any time. Clearing the finale (Op 12) opens **Campaign Complete**, where **Start Over** resets the campaign (settings are kept). Weapons also unlock with progress: Tri-Barrel after Op 2, M4 after Op 3 and Sniper after Op 4.

**Soldier look:** the supplied NPC model had UVs but no texture images, so `tools/paint-npc.mjs` paints a soldier kit straight into its UV space: khaki uniform, ranger-green plate carrier with pouches, backpack, black gloves, brown combat boots, olive helmet, dark balaclava. When a soldier dies, the body stays down (death fall, then it sinks away) while he respawns elsewhere in a spare body.

**Telling sides apart:** a glowing band on the upper arm shows the side: **blue = your squad, red = hostile** (Call of Duty Mobile style). Teammates also have a blue chevron overhead.

**How NPCs notice you:** they see in a 120° cone in front of them (walls block sight) and hear noise only nearby: your gunshots carry 14 m (sniper 18 m), NPC gunfire 12 m, walking 5 m, sprinting 10 m, landing a jump 6 m. Walls halve those distances, and **crouch-walking is silent**, so you can sneak up behind them.

**What NPCs know:** only what they see or hear. A noise or a shot from someone they can't see gives them a rough spot (1 m + about 18% of the distance off), never your real position. They search that area, check a couple of nearby corners, then give up.

**Toughness:** soldiers have 125 HP (5 AK body shots, 2 headshots); officers have 150 with light armour. The triple-barrel still kills in two shots at close range.

**How NPCs fight:**
- **Hurt** (under 45% HP): run to a spot you can't see, heal, then go back to where they last saw you. If there's no cover nearby, they still fall back across open ground.
- **Outnumbered** (two or more enemies in view, no teammate nearby, already hurt): fall back and hold the angle crouched.
- **Low or empty magazine:** reload behind cover, then come back out. Between fights they top up their magazine.
- **Shot by someone they can't see:** turn toward the shot; most of the time they duck into cover first.
- **Pushing:** they close in when you're badly hurt, when they can hear you reloading, or when their side has more players.
- **Dodging:** when they can see you aiming and firing at them, they side-step out of your line of fire, sometimes with a jump. They also jump-strafe in gunfights, and are less accurate while in the air.
- **Fighting back:** they stand and fight when no cover is close by, or when found at close range while hiding.

**Patrols:** the map is split into 5 m cells. Each squad walks to the cells it hasn't checked for the longest time, and soldiers avoid cells a squadmate is already heading to. At each stop they look left and right. Each soldier skips a few random spots every life, so not every corner gets checked every time.

---

Ads: YouTube's own `ytgame.ads` only: an interstitial when leaving results or on RESTART, and rewarded ads for REVIVE, GET AMMO and gun rentals, only when the player taps. With no ads available, every ad button hides and the game stays fully playable.


## Controls
| | Keyboard & mouse | Touch | Gamepad |
|---|---|---|---|
| Move / look | WASD / mouse | left stick (push to the edge = sprint) / drag the right side | left / right stick |
| Fire / aim | LMB / RMB | ◎ button (drag it to aim while firing) / ⌖ | RT / LT |
| Reload · jump · crouch | R · Space · C | ⟳ · ▲ · ▼ | X · A · B |
| Sprint · swap · interact | Shift · Q/1/2/wheel · E | joystick edge · ⇄ · ✋ | L3 · Y · LB/RB |
| Pause | Esc / P | ❚❚ | Start |

Settings: sensitivity, invert Y, FOV, graphics quality (Auto/Low/Med/High), volume, ambience, aim assist, auto-fire (touch), touch button size, FPS counter and language.

---

## Run it locally
```bash
# from the repository root
python3 -m http.server 8765
# open http://localhost:8765/Backrooms%20FPS/index.html
```
Outside YouTube the SDK reports `IN_PLAYABLES_ENV = false`. The game then saves to `localStorage` and skips the SDK calls, so it is fully playable in a normal browser.

## Rebuild / test (developers)
```bash
cd tools
npm install
npm run libs      # rebuild lib/ from npm (three.js, recast-navigation)
npm run assets    # re-optimize source-assets/ → Backrooms FPS CrazyGames/assets/
npm run navmesh   # re-bake the walkable area
npm run sync-youtube        # regenerate Backrooms FPS/ from the CrazyGames source
npm run zip                 # → dist/backrooms-fps.zip (YouTube Playables)
npm run zip-crazygames      # → dist/backrooms-crazygames.zip
# with the local server running:
node test/cert.mjs     # YouTube Playables pre-certification checks (mock SDK)
npm run qa-crazygames  # CrazyGames QA on the exact zip, inside an iframe (see CRAZYGAMES-QA-REPORT.md)
node test/smoke.mjs    # boot → menu → missions → briefing → gameplay screenshots
node test/modes.mjs    # plays all 12 missions headless and drives each to the end screen
node test/mobile.mjs   # touch layouts, landscape + portrait
```
Screenshots go to `tools/test/out/`.

---

## YouTube Playables / Mediacube certification checklist

| Requirement | How the game meets it | Verified by |
|---|---|---|
| SDK loaded first, before any game code | `<script src="https://www.youtube.com/game_api/v1">` is the first script in `<head>` | `cert.mjs` |
| `firstFrameReady()` once the first frame is shown | called after the static boot screen paints (≈80 ms) | `cert.mjs` |
| `gameReady()` once the game is interactive | called once, when the ENTER button appears after all assets load | `cert.mjs` |
| Pause halts rendering, audio and gameplay | `onPause` stops the render loop and simulation, suspends the AudioContext and saves. In a mission, resuming lands on the pause menu | `cert.mjs` (0 frames while paused) |
| Respect YouTube mute | `isAudioEnabled()` on boot and `onAudioEnabledChange` set a hard mute (all audio is generated in code, with no audio files) | `cert.mjs` |
| Cloud save | progress, best scores and settings go through `game.loadData/saveData` (≈0.3 KiB, far below 3 MiB) | `cert.mjs` (reload restores progress) |
| Score | `engagement.sendScore()` sends the campaign best total, which always matches the saved best | `cert.mjs` |
| Localization | `system.getLanguage()` picks EN/ES/PT/FR, with an English fallback | `cert.mjs` (Spanish UI) |
| Health reporting | `health.logError/logWarning` are wired to `window.onerror` and `unhandledrejection` | code |
| No external requests or links | every asset is local and relative. No CDNs, links, third-party ads (only YouTube's own `ytgame.ads`), real-money purchases, `alert` or `window.open` | `cert.mjs` (0 external requests) |
| Bundle limits | 6.0 MiB total (limits: 30 MiB initial, 250 MiB total, 30 MiB per file, 8000 files) | `cert.mjs`, `npm run zip` |
| Works on mobile and desktop | touch controls, adaptive resolution, safe-area insets, portrait and landscape | `mobile.mjs` |
| Content | stylised combat with sparks and hit markers. No blood or gore | — |

> **Note:** these checks are modelled on YouTube's published Playables requirements, run against a mock SDK. Mediacube and YouTube run their own automated and manual review, so their result is what counts. If they flag anything, send me the report and I'll fix it.

### Submitting through Mediacube
1. `cd tools && npm install && npm run zip`, or zip the **contents** of `Backrooms FPS/` yourself (`index.html` must be at the root of the zip).
2. Upload `dist/backrooms-fps.zip` in the Mediacube / Playables portal.
3. Suggested listing: genre *Shooter / Action*, orientation *both (landscape recommended)*, input *touch, mouse and keyboard, gamepad*.
