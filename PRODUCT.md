# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The author built it for his own use, because existing YouTube speed extensions didn't fit how he watches. Other users are people whose needs happen to match. The product does not design around why someone changes speed (learning, skimming, practicing); it designs around how precisely and how quickly they can set it.

## Product Purpose

A Firefox extension that sets YouTube playback speed past YouTube's 2× cap, in step sizes the user chooses. Success: the speed you want is one or two inputs away, it stays applied across videos, and the extension stays out of the way while you watch.

## Positioning

Granular control as the core idea: two step sizes with a user-set switch point (defaults 0.25× below 2×, 0.1× above), a user-set range, and user-set presets. The controls live inside YouTube's own player and should read as part of it, not as a third-party overlay.

## Operating Context

- Used while watching: on the regular watch page (control bar at the bottom), in fullscreen and theater mode, and on Shorts (controls float at the top of the video on hover).
- Inputs: keyboard (`Shift` + `.`, `Shift` + `,`, `R`), mouse wheel over the speed button, clicks in the speed panel.
- Settings are changed rarely, sometimes mid-video (in the player panel), sometimes away from a video (toolbar popup or `about:addons`).
- Runs in Firefox and Firefox-based browsers such as Zen. Firefox 142 or newer.

## Capabilities and Constraints

- Speed range 0.1× to 16× (Firefox's playbackRate limits); Firefox mutes audio above 8× by default.
- Settings: step below and above the switch point (0.01× to 4×), switch point, slowest and fastest speed, up to 8 presets. Stored in `browser.storage.local`, applied live in every tab.
- Plain JS/CSS, no build step, no dependencies. Content script must stay small and do no polling.
- YouTube enforces Trusted Types: UI is built with DOM calls, never `innerHTML`.
- YouTube changes its player markup over time; the extension relies on `#movie_player`, `#shorts-player`, `.ytp-right-controls` and similar hooks and must degrade quietly when they move.
- Content scripts can't open the extension's settings page; a background event page does that on request.
- No network requests, no data collection. Open source (MIT) at https://github.com/Volzhanka63/granular-speed-for-youtube, listed on addons.mozilla.org as "Granular Speed for YouTube".

## Brand Commitments

- Name: Granular Speed for YouTube. Icon: amber (#ffb020) speedometer on near-black (`icons/icon.svg`).
- Inside the YouTube player, YouTube's own visual language wins over the extension's brand: the speed controls should look like a native player setting.
- Copy is plain and specific. No marketing tone inside the UI.
- Not affiliated with YouTube or Google; must not imitate YouTube's logo.

## Evidence on Hand

- Listing copy: `listing/metadata.json`. Screenshots: `listing/*.png` (rendered on a mock player).
- Changelog: `CHANGELOG.md`.
- No user testimonials, usage numbers or reviews exist yet. Do not invent any.

## Product Principles

1. The speed you want, in as few inputs as possible.
2. Native first: inside YouTube, follow YouTube's player conventions so the controls feel built in.
3. Invisible while watching: nothing persistent on screen that the player itself wouldn't show.
4. Light: no background work, no polling, small code on every YouTube page.
5. Every setting is visible and adjustable; defaults match the author's own preferences.
