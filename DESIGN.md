---
name: Granular Speed for YouTube
description: Firefox extension that sets YouTube playback speed past 2x in step sizes the user chooses.
colors:
  amber: "#ffb020"
  amber-ink: "#1d1404"
  amber-text-light: "#8a5300"
  amber-text-dark: "#ffc24f"
  amber-focus-light: "#a86400"
  amber-fine-light: "#b06f00"
  cool-grey-bg: "#e7e8eb"
  white-surface: "#ffffff"
  cool-grey-line: "#dcdee2"
  ink: "#16171a"
  slate-muted: "#575c66"
  control-light: "#eff0f2"
  control-light-hover: "#e4e6e9"
  control-light-active: "#d9dbdf"
  tick-light: "#858a93"
  tick-major-light: "#33363c"
  graphite-bg: "#111214"
  graphite-surface: "#1b1c20"
  graphite-line: "#2c2e34"
  frost-text: "#eceef1"
  ash-muted: "#a1a5ae"
  control-dark: "#26282d"
  control-dark-hover: "#30333a"
  control-dark-active: "#3a3d45"
  tick-dark: "#6b7079"
  tick-major-dark: "#d3d6db"
  icon-graphite: "#16181d"
  player-panel: "rgba(0, 0, 0, .6)"
  player-header-wash: "rgba(0, 0, 0, .35)"
  player-rule: "rgba(255, 255, 255, .2)"
  player-control: "rgba(255, 255, 255, .1)"
  player-control-hover: "rgba(255, 255, 255, .2)"
  player-control-active: "rgba(255, 255, 255, .28)"
  player-text: "#eeeeee"
  player-white: "#ffffff"
  player-secondary: "rgba(255, 255, 255, .7)"
  player-on-ink: "#0f0f0f"
typography:
  ext-body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  ext-section:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  ext-title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  ext-meta:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  ext-scale-label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    fontFeature: "tnum"
  welcome-display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  welcome-lead:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  welcome-readout:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "40px"
    fontWeight: 750
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  player-body:
    fontFamily: "YouTube Noto, Roboto, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.25
  player-speed-button:
    fontFamily: "YouTube Noto, Roboto, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1
  player-title:
    fontFamily: "YouTube Noto, Roboto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  player-chip:
    fontFamily: "YouTube Noto, Roboto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  player-readout:
    fontFamily: "YouTube Noto, Roboto, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 900
  player-bezel:
    fontFamily: "YouTube Noto, Roboto, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  icon-tile: "6px"
  kbd: "6px"
  card: "14px"
  pill: "999px"
  round: "50%"
  player-kbd: "4px"
  player-panel: "12px"
  player-chip: "16px"
spacing:
  ext-stack: "12px"
  ext-gap: "16px"
  ext-stepper-gap: "4px"
  ext-step: "34px"
  ext-row: "48px"
  ext-max-width: "520px"
  welcome-max-width: "600px"
  player-width: "330px"
  player-header: "40px"
  player-row: "48px"
  player-control: "32px"
  player-inset: "16px"
components:
  ext-card:
    backgroundColor: "{colors.white-surface}"
    rounded: "{rounded.card}"
    padding: "12px 14px 6px"
  ext-button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "34px"
  ext-button-secondary:
    backgroundColor: "{colors.control-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  ext-stepper-button:
    backgroundColor: "{colors.control-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "34px"
  ext-stepper-button-hover:
    backgroundColor: "{colors.control-light-hover}"
  ext-value-cell:
    typography: "{typography.ext-section}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "34px"
    width: "76px"
  ext-chip:
    backgroundColor: "{colors.control-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 8px 0 12px"
    height: "32px"
  player-panel:
    backgroundColor: "{colors.player-panel}"
    textColor: "{colors.player-text}"
    typography: "{typography.player-body}"
    rounded: "{rounded.player-panel}"
    width: "330px"
  player-round-button:
    backgroundColor: "{colors.player-control}"
    textColor: "{colors.player-white}"
    rounded: "{rounded.round}"
    size: "32px"
  player-round-button-hover:
    backgroundColor: "{colors.player-control-hover}"
  player-chip:
    backgroundColor: "{colors.player-control}"
    textColor: "{colors.player-white}"
    typography: "{typography.player-chip}"
    rounded: "{rounded.player-chip}"
    padding: "0 10px"
    height: "32px"
  player-chip-on:
    backgroundColor: "{colors.player-white}"
    textColor: "{colors.player-on-ink}"
  player-speed-button:
    textColor: "{colors.player-white}"
    typography: "{typography.player-speed-button}"
    padding: "0 6px"
    width: "48px"
---

# Design System: Granular Speed for YouTube

## Overview

**Creative North Star: "The Instrument Cluster, with a native passenger"**

The product has two visual languages, and which one applies depends on where the surface lives. Extension pages (the settings page, shown in the toolbar popup and in about:addons, and the welcome page opened on install) belong to the icon's world. That world is an instrument cluster: graphite at night, cool grey and white by day, and one amber that lights only what is live. The settings page treats speed as a single instrument reading. A drawn speed scale shows every reachable speed as a tick, the fine-step zone is washed in amber, and an amber ▲ marker for where steps change can be dragged. Round steppers and fixed-width numeral cells sit under the scale.

Inside the YouTube player (the speed button, the speed panel and the speed bubble), the extension's brand is absent. Those surfaces copy YouTube's own settings menu and playback-speed submenu as measured: a 60% black panel, 12px corners, 330px width, 40px header, 48px rows, and 32px round controls and chips, all set in YouTube Noto. A user should take them for a player setting, not an overlay.

The one surface that crosses over is the full settings window opened from the player panel. It is the extension's settings page in an iframe, so it keeps the extension's look (see The Window Rule).

Density is compact on both sides: 48px rows and small controls, with no decorative surfaces. Copy is plain.

**Key Characteristics:**
- Two worlds, split by location: extension pages use the instrument cluster, in-player UI uses YouTube's player language.
- Amber (#ffb020) appears only on live values and actions, and only on extension pages.
- Light and dark extension themes come from `prefers-color-scheme` on the same tokens.
- Numerals: tabular on extension pages, proportional in the player.
- Speed is written "2×" on extension pages and "2x" inside the player.
- In-player sizes are multiplied by `--s` (1, or 1.35 in YouTube's big mode).

## Colors

Extension pages use neutral graphite and cool grey with one warm amber signal. The player uses YouTube's translucent black and white with no hue at all.

### Primary
- **Gauge Amber** (amber): the switch-point needle and its head (dark theme), the fine-step tick colour (dark theme), the fine-zone wash at 16% / 10% alpha, the primary button fill, the text-selection fill, and the flash ring on a value that was corrected. It is the same in both themes.
- **Amber Ink** (amber-ink): text on an amber fill.
- **Burnt Amber Text** (amber-text-light) / **Pale Amber Text** (amber-text-dark): the needle's value label, wherever amber has to be read as text. On the light theme, raw amber is too low-contrast for text on white.
- **Deep Amber** (amber-focus-light, amber-fine-light): light-theme focus ring (#a86400, 4.7:1 on white) and fine ticks (#b06f00), darkened so they stay visible on white. The needle stays #e89a00.

### Neutral
- **Cool Grey / White** (cool-grey-bg, white-surface, cool-grey-line): light-theme page, card and row-divider colours.
- **Graphite** (graphite-bg, graphite-surface, graphite-line): dark-theme page, card and row-divider colours.
- **Ink / Frost** (ink, frost-text): primary text, light and dark.
- **Slate / Ash** (slate-muted, ash-muted): secondary text, units, scale labels, preset rings and chip icons.
- **Control greys** (control-light*, control-dark*): stepper, chip, secondary button and field fills, each with rest, hover and active steps.
- **Tick greys** (tick-*, tick-major-*): minor and major ticks on the scale.
- **Icon Graphite** (icon-graphite): the icon tile behind the amber gauge.

### Player (YouTube's language)
- **Panel Black** (player-panel), with a darker header wash (player-header-wash) and a hairline rule (player-rule) under the header.
- **Translucent White controls** (player-control, -hover, -active): round buttons and chips.
- **Player whites** (player-text, player-white, player-secondary): body text, controls and labels, and the summary, text buttons and settings icon at reduced opacity.
- **Selected state**: a solid white chip (player-white) with near-black text (player-on-ink), matching YouTube's selected chips.

### Named Rules
**The Live Value Rule.** Amber marks only things that are live or actionable: the fine-step zone, the switch-point needle and its label, the primary action, focus, and the "corrected" flash. Static labels, headings, chrome and decoration never use it.

**The Native Passenger Rule.** No extension brand colour appears inside the YouTube player. In-player UI uses only translucent black, translucent white, solid white and #0f0f0f.

**The Window Rule.** Full settings are a separate window, not part of the player, so they keep the extension's look even over the video and in fullscreen. The window opens where the toolbar popup does: 8px from the top-right corner of the viewport, 400px wide, no dimming behind it. A click outside or Esc closes it, and keyboard focus stays inside while it is open.

## Typography

**Extension font:** system-ui (with -apple-system, Segoe UI, Roboto, sans-serif)
**Player font:** YouTube Noto (with Roboto, Arial, sans-serif)

**Character:** On extension pages, a plain system sans does the work through weight more than size. In the player, YouTube's own face is used at YouTube's own sizes.

### Hierarchy (extension pages)
- **Welcome display** (750, 28px, 1.15, -0.02em, balanced wrap): the welcome page headline only.
- **Welcome readout** (750, 40px, tabular): the speed number in the welcome demo.
- **Welcome lead** (400, 16px, 1.5, max 52ch): the intro paragraph on the welcome page.
- **Welcome section** (700, 17px, -0.01em): card titles on the welcome page ("Controls", "How it works", "Where it works").
- **Title** (650, 15px): the product name in the page header.
- **Section** (600, 14px): card headings, and the numbers in value cells and chips.
- **Body** (400, 14px, 1.4, tabular numerals on the whole page): row labels, how-to text (max 62ch).
- **Meta** (400, 13px): status, count, hints, notes, privacy line.
- **Scale label** (500, 12px, tabular): tick labels. The needle label uses 650 in amber text.

### Hierarchy (player)
- **Readout** (900, 18px): the current speed in the panel.
- **Speed button** (500, 14px, line-height 1, `text-shadow: 0 0 2px #000`): matches the player's time display exactly.
- **Body** (400, 14px, 1.25): row labels.
- **Header title / chips** (500, 12px).
- **Bezel** (500, 18px; 24px in big mode): hotkey feedback, shown where YouTube shows its own speed bubble.

### Named Rules
**The Weight-Not-Size Rule.** The settings page holds every element between 12px and 15px. Hierarchy comes from weight (400 / 500 / 600 / 650). Only the welcome page's display, lead and demo readout step outside that band.

**The Fixed Cell Rule.** On extension pages, every number uses tabular figures, and value inputs sit in fixed-width cells (76px minimum, input 4.2ch, right-aligned) so changing a value never shifts the layout. In the player, numbers stay proportional like the rest of YouTube's controls.

**The Two Multipliers Rule.** Write speed with "×" on extension pages and with a plain "x" inside the player ("1.5x"), as YouTube does.

## Layout

Extension pages use a single centred column: max 520px for settings and 600px for welcome, with a minimum body width of 360px so the toolbar popup works. Cards stack 12px apart (16px on welcome). Inside a card, settings are rows at least 48px tall, divided by 1px rules: label on the left, stepper on the right. The first view on the settings page is the header, then the speed-scale card with its one-line legend, then Steps.

The in-player panel is absolutely positioned at 330px wide. It has a sticky 40px header and a main page with 24/16/16px padding and a 16px vertical gap. It never gets wider than the player minus 24px. Presets sit in an equal-column grid (`--cols`, default 6) with an 8px gap; below 320px they wrap into 52px columns. Every in-player dimension is written as `calc(Npx * var(--s))`.

## Elevation & Depth

Extension pages are nearly flat. Cards lift slightly off the page with a soft ambient shadow, and nothing else carries a shadow. In dark mode, depth comes mostly from the step between page (#111214) and card (#1b1c20). Inside the player, depth comes from translucency over video. The only shadows there are YouTube-matching text shadows and the slider thumb. The settings window, which belongs to the extension's world, floats on its own shadow.

### Shadow Vocabulary
- **Card, light** (`0 1px 2px rgba(20,22,26,.06), 0 2px 8px rgba(20,22,26,.05)`).
- **Card, dark** (`0 1px 0 rgba(255,255,255,.03) inset, 0 2px 10px rgba(0,0,0,.35)`).
- **Player text** (`text-shadow: 0 0 2px rgba(0,0,0,.5)` on panel and bezel; `0 0 2px #000` on the speed button).
- **Settings window** (`0 12px 40px rgba(0,0,0,.45)` plus a 1px 8% white ring, so it separates from dark video).

## Shapes

The form language is round. Both worlds share it, so they feel related without sharing colour. Steppers and player controls are circles. Values, chips, fields and buttons are pills. Extension cards use 14px corners. Player surfaces use YouTube's 12px corners, and player chips use 16px. Key caps on the welcome page are 6px with a 2px bottom border so they read as physical keys. The icon is a rounded tile (28/128) holding a 270° gauge arc.

## Components

### Buttons
- **Primary** (extension): amber pill, amber-ink text, weight 650. Hover brightens to 1.06. Used for "Add" in settings and "Open YouTube" on welcome. One per view.
- **Secondary** (welcome): control-grey pill, 40px tall, weight 600; hover moves to the next control grey.
- **Text link**: muted text with a 45% underline offset 3px. Hover switches to full text colour and a full underline. Used in the footer.
- **Undo**: a 600-weight amber-text link next to the status in the header, shown for 5 seconds after Reset or removing a preset.
- **Focus**: `outline: 2px solid` focus amber, offset 2px, on buttons and links.

### Steppers and value cells (extension signature)
- 34px round minus/plus buttons (40px in the welcome demo), 4px apart, around a pill value cell with a transparent fill. Hover and active step through the control greys. Disabled buttons drop to 45% opacity.
- Focus inside the cell shows a 2px focus-amber ring. A value clamped by the app flashes a 2px amber ring for 1.4s, so corrections are visible where they happen.

### Speed scale (extension signature)
- An SVG drawn by options.js: one tick per reachable speed (major ticks darker and thicker), an amber fine-step zone wash (rx 3), preset speeds shown as 3px muted rings, and a 2px amber needle with a triangular head and a 650-weight value label. Only the marker can be dragged; a click elsewhere on the scale does nothing. Arrow keys move it. Its focus shows an amber wash and a 2px focus-amber ring on the hit area.
- A one-line legend sits under the scale: an amber swatch for the second step size ("0.1× steps"), a ring for "preset", and the ▲ for "drag to move". A hidden sentence describes the scale for screen readers.
- Rows: "Each press below 2×", "Steps change at", "Each press above 2×", then Slowest and Fastest. One name for the idea everywhere: where steps change. When the marker sits at an end, the row for the empty side dims to 50% with "not used".

### Chips (extension)
- 32px control-grey pills with a 600-weight number and a muted 15px close icon that darkens to text colour on hover. Wrapping row, 8px gap.
- A preset outside the current range stays saved and shows as an outlined muted chip (transparent fill, 1px line ring, weight 500). The player hides it until the range includes it again.
- Preset errors appear in 13px text right under the Add field, marked with an amber "!", and clear as you type.

### Player speed button
- Sits first in YouTube's right controls with no fill, white 500 YouTube Noto, at least 48px wide, styled like the time display. Its font size is copied from the time display at mount and on fullscreen changes, so it grows with big mode. On Shorts it is a 48px pill with a 10% white hover.
- Tooltip: "Playback speed (Shift+. / Shift+,), scroll to change". Screen readers hear "Playback speed 2.3x" and whether the panel is open.

### Player panel
- 60% black, 12px corners, 330px. Header 40px with a 35% black wash, a 1px 20% white rule, and a 12px/500 title, with the tune icon (all settings) as a transparent round button.
- **Round buttons:** 32px, 10% white, 20% on hover, 28% when pressed. Disabled at 35%: − at the slowest speed, + at the fastest.
- **Chips:** 32px, 16px corners, 10% white. Selected is solid white with #0f0f0f text.
- **Keyboard:** opening the panel from the keyboard moves focus to the slider; Esc closes it and returns focus to the button.
- **Slider:** 4px track at 30% white, white progress, 14px white thumb.
- **Focus:** 2px solid white outline.

### Speed bubble
- 60% black box (12px corners) with 500/18px white text, at 10% from the top and centred, where YouTube shows its own. It shows for 700ms after a hotkey, and when YouTube's own speed menu tries to change the speed. While you hold the video for double speed it stays up with the doubled speed, and YouTube's own "2x" overlay is hidden.
- Each change is also written to a hidden polite live region for screen readers.

There is no first-run hint inside the player. The welcome page explains the controls.

## Do's and Don'ts

### Do:
- **Do** pick the language by location: extension-page tokens for anything in the extension's own pages, player tokens for anything injected into YouTube.
- **Do** keep amber for live values and the single primary action, using amber-text tokens wherever amber must be read as text.
- **Do** set extension numerals in tabular figures inside fixed-width cells, and write speed as "2×" there.
- **Do** match measured YouTube values in the player (330px, 40px header, 48px rows, 32px controls, 12px corners, 60% black) and multiply them by `--s`.
- **Do** write speed as "2x" in the player and keep the speed button identical to the time display.
- **Do** make every extension setting show its result live on the speed scale.

### Don't:
- **Don't** use amber, the system font, tabular figures or "×" inside the YouTube player.
- **Don't** use YouTube Noto, translucent-black panels or "x" on extension pages.
- **Don't** use amber for headings, labels, borders or decoration.
- **Don't** add size steps to the settings page beyond 12–15px. Use weight for hierarchy.
- **Don't** add shadows on extension pages beyond the card shadow.
- **Don't** imitate YouTube's logo or put the extension icon inside the player.
