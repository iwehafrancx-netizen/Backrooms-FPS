# Ads plan: Backrooms

Status: **plan only**. No ad code is in the game yet. Approve this plan and I'll add a small `Ads` module (turned off by default) at the call sites below, so switching ads on later is a one-line change.

## 1. YouTube Playables build (`Backrooms FPS/`, submitted through Mediacube)

**What's allowed**
- YouTube controls monetisation on Playables. A game may only show ads through YouTube's own SDK (`ytgame.ads.requestInterstitialAd()`), and only if YouTube/Mediacube has enabled ads for the game.
- **Third-party ad networks (AdMob, AdSense, Unity Ads, portal SDKs…) are not allowed.** They would also break the "no external requests" rule the game currently passes.
- **Action:** ask Mediacube whether interstitials are enabled for Backrooms, and what frequency cap they want.

**Where to show an interstitial**

| Slot | When | Why it's a good slot |
|---|---|---|
| Post-mission | After the end screen, when the player taps **Next mission**, **Retry** or **Menu** | The player has just finished and seen their score and XP; it's a natural pause |

**Rules**
- At most **one ad every 2 missions**, and at least **3 minutes** between ads.
- **Never** on the player's first mission of a session.
- **Never** mid-mission, on the pause menu, during the countdown, on the boot or loading screen, or during the rank-up celebration.
- While an ad plays, the game is already paused and muted by the SDK's `onPause`/audio callbacks, which are implemented.
- If the ad call fails or isn't available, just continue. The player must never be blocked.

## 2. Standalone / web build (`Backrooms FPS Standalone/`, for your own site or a web game portal)

A web game ad SDK can be used here (for example a portal's own SDK, or Google's AdSense for games through H5 Games Ads).

| Type | Slot | Rule |
|---|---|---|
| Interstitial | Same post-mission slot as above | Same frequency cap (1 per 2 missions, 3 min apart) |
| **Rewarded** (opt-in) | Death card in one-life modes (Survival, Ghost Protocol, Lights Out, Zero Hour) | "Watch an ad to **revive** once per mission" |
| **Rewarded** (opt-in) | End screen | "Watch an ad for **2× XP** on this mission" (applies to XP only, never to the leaderboard score) |
| **Rewarded** (opt-in) | Daily challenges panel | "Watch an ad to **reroll** one daily challenge" (once per day) |
| Banner | Main menu only (bottom corner) | Never in gameplay, briefing or HUD |

Rewarded ads are always the player's choice and give something extra, never something taken away. That keeps reviews positive and stops ads from feeling forced.

## 3. Implementation sketch (after approval)
- An `Ads` module with `Ads.interstitial(slot)` and `Ads.rewarded(kind)`, both returning promises that resolve `true`/`false`.
  - The Playables build calls `ytgame.ads.requestInterstitialAd()` when available, with no rewarded ads.
  - The standalone build calls the chosen web SDK, or no-ops when none is configured.
- Call sites:
  - `Ui.render_end` button handlers (interstitial, 2× XP);
  - `Hud.death` (revive);
  - `Ui.dailyPanel` (reroll).
- The frequency cap and session state live in memory, not in the save.
- Tests: a mock SDK checks the cap, the "never mid-mission" rule, and that a failed ad never blocks the flow.
