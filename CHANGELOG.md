# Changelog

## 1.3.1 (2026-11-12)

First release on addons.mozilla.org.

The code is the same as 1.3.0. Mozilla needs a new version number for every upload, and 1.3.0 was already signed for the GitHub release.

## 1.3.0 (2026-11-12)

First public release, on GitHub, with the source under the MIT license.

**Added**

- Shorts support. Shorts have no control bar, so the speed button turns into a pill at the top of the video. It always shows the current speed. Click it for the speed panel, or scroll over it to change the speed without moving on to the next Short.
- On Shorts, the pill pulses when you press a speed key, instead of a badge covering Shorts' own buttons.

**Fixed**

- On Shorts, hotkeys changed the speed with no feedback. The badge was drawn into YouTube's hidden watch-page player instead of the Short you were watching.
- Clicks and double-clicks on the speed button and panel no longer reach the player underneath, so they can't pause the video or toggle fullscreen.

## 1.2.0 (not released)

Built and tested, never signed or published. Everything here shipped in 1.3.0.

**Added**

- Settings page. Choose the step size below and above a switch point, the switch point itself, the slowest and fastest speed (0.1× to 16×), and up to 8 preset buttons. The page previews every speed you'll step through and fixes values that don't fit, such as a slowest speed above the fastest.
- Three ways to open it: the toolbar button, `about:addons`, and a tune icon in the player panel.
- When the preset count is above 6, the presets wrap into two even rows.
- New name, "Granular Speed for YouTube", and a speedometer icon.

**Fixed**

- The hotkey handler threw an error when a key event's target wasn't a page element.

## 1.1.0 (2026-11-12, private build)

**Added**

- A speed button in the player's control bar, next to subtitles, showing the current speed.
- Scroll over the button to step the speed up or down.
- Click it for a panel with a slider, `−` and `+` buttons, and presets for 1×, 1.5×, 2×, 2.5×, 3× and 4×. Click outside or press Esc to close it.

**Changed**

- The corner badge now appears only for hotkeys, since the button already shows the speed.

## 1.0.0 (2026-11-11, private build)

First version, named "YT Speed".

- Speeds from 0.25× to 4×, in 0.25× steps up to 2× and 0.1× steps above.
- Hotkeys: `Shift` + `.` faster, `Shift` + `,` slower, `R` to switch between 1× and your last speed. They take over YouTube's own speed keys, without the 2× limit.
- Keys work on any keyboard layout and do nothing while you type in search or comments.
- The speed carries over to every video, tab and restart, and comes back after YouTube resets it for a new video or ad.
- A badge in the corner of the player flashes the new speed.
