# Changelog

## 1.5.0 (2026-11-12)

**Added**

- Hold the mouse button down on the video to play at twice your speed, up to your fastest setting. At 1.5x you get 3x. Let go and you're back. When the hold hits your fastest speed, the bubble says so: "4x · fastest". This replaces YouTube's own hold, which always gives 2x, and hides YouTube's "2x" overlay while you hold.
- When YouTube's own speed menu tries to change the speed, the speed bubble shows the speed you're really at.
- At the live edge of a live stream the extension leaves the speed to YouTube. Go back a bit and your speed applies again.
- If another speed add-on keeps resetting the speed, this one pauses for 3 seconds instead of looping, then sets your speed again. Your own key presses never cause the pause.
- Undo for "Reset to defaults" and for removing presets, for 5 seconds. Remove several presets in a row and one Undo brings them all back.
- A legend under the speed scale, a description of the scale for screen readers, and a "Rate this add-on" link in the settings footer.
- A note in the settings explains outlined presets. They're outside your range, so the player hides them.
- The welcome page now explains hold for double, how the extension keeps your speed, and where it works.

**Changed**

- Full settings from the player panel open in the top-right corner, like the toolbar popup, without dimming the video. A click outside or Esc closes them.
- Settings rows are renamed so one idea has one name: "Each press below 2×", "Steps change at", "Each press above 2×". When steps change at the slowest or fastest speed, the step row that has nothing to do dims and says "not used".
- Only the marker on the speed scale can be dragged. A stray click on the scale no longer changes the setting.
- Speed keys only act when a video is on the page. On the home page and in search they no longer change your speed.
- Presets outside your range are kept and hidden in the player, instead of deleted. Widen the range and they come back.
- All 6 default presets fit on one row in the toolbar popup.
- Preset errors show under the Add field instead of flashing in the header.
- On a fresh install, R goes from 1x to your first preset above 1x instead of doing nothing.
- The speed button follows the time display's size in large fullscreen. Its tooltip shows the keys.
- The player panel never gets wider than the player, so it isn't cut off on small Shorts.
- The first-run hint in the player is gone. The welcome page covers the same ground.

**Accessibility**

- Visible focus in the light theme (darker amber) and on links and the scale marker. Easier-to-see ticks on the scale.
- The player panel takes focus when opened from the keyboard and gives it back on Esc. Screen readers hear the current speed, whether the panel is open, and speed changes from the keys and the scroll wheel.
- Screen readers and voice control use the same names as the visible settings labels.
- Keyboard focus stays inside the full settings window while it's open.

**Fixed**

- A click outside the full settings closed them and also reached the page, so it could pause the video or follow a link. Now it only closes them.
- The whole-number marks on the settings scale weren't drawn darker.
- A − or + button could move a typed value the wrong way when it was beyond the usual steps.
- Clearing a settings field reset it to the default instead of the value it had.
- "Adjusted to fit" now marks every value that had to move, not only the one you typed in.
- Corrupted settings in storage no longer stop the extension.
- Key presses faked by page scripts are ignored, and the settings window only sends messages to youtube.com.

## 1.4.0 (2026-11-12)

**Changed**

- Shorts: the always-visible speed pill is gone. The speed button now sits in Shorts' own top-right controls, next to CC, and hides with them.
- The player panel is rebuilt to YouTube's own menu measurements (330px wide, 48px rows, 32px round controls), so it reads as part of the player. It scales up in large fullscreen like YouTube's menus.
- The speed button uses the same font, weight and shadow as the player's time display, and the player writes speeds YouTube's way: "1.5x".
- Hotkey feedback is a short bubble at the top centre of the video, where YouTube shows its own. It appears on Shorts even while the controls are hidden.
- The settings page is redesigned: −/+ steppers with typeable values, one readable text size, a live scale of every speed you'll step through with a draggable switch point, and presets you can remove or add. It follows the light or dark theme, and the toolbar popup fits Firefox's 600px popup height without scrolling.

**Added**

- Full settings without leaving the video: the tune icon in the player panel opens the settings in a popup over the page, in fullscreen too. Esc or a click outside closes it.
- A welcome page on first install, with a live demo of the keys and a one-minute explainer. The settings page links to it as "Quick guide".
- A one-time hint pointing at the speed button the first time you see it.

**Fixed**

- Hover previews on the feed and in search results no longer play at your speed.
- Values that don't fit are marked where you typed them instead of changing silently.

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
