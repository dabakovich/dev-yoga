---
name: ios-screenshot
description: Capture a screenshot of the running DevYoga app on the booted iOS Simulator and Read it back to visually verify the result. Use proactively after any UI-affecting change — when you want to "see how this renders", "check the result on screen", "screenshot the simulator", "verify the UI looks right", or close the implement→observe→fix loop on a screen — instead of claiming a screen looks correct without looking. Supports deep-link navigation to a specific screen before capturing.
---

# ios-screenshot

DevYoga is iOS-first and runs as an Expo dev build on the iOS Simulator. This skill
lets you **see your own work**: capture the simulator screen, Read the PNG back as
an image, judge it, and fix issues — without a human relaying screenshots.

## When to use it

Proactively, as the *visual half* of building any UI feature — not a one-off. After
you make a change that affects what's on screen and Metro has fast-refreshed, take a
screenshot and look before you say a screen "looks right". Use it repeatedly across
the loop, not just at the end.

## The loop

1. Make the edit.
2. Ensure fast-refresh applied (see **Reload** below if the screen looks stale).
3. Run the capture script — it prints the saved PNG path.
4. **Read that path** so the image enters context. This step is mandatory; the
   script only writes a file, it doesn't show you anything.
5. Judge the result against the intended design. Fix and repeat.

## Capture

```bash
.claude/skills/ios-screenshot/scripts/capture.sh
```

Prints an absolute path under `mobile/.screenshots/<timestamp>.png` (gitignored).
Then Read that exact path.

To target a specific device when more than one simulator is booted:

```bash
.claude/skills/ios-screenshot/scripts/capture.sh --udid <UDID>
```

## Navigating to a screen first (deep links)

Pass a `devyoga://` deep link as the first argument; the script opens it, waits for
the transition, then captures:

```bash
.claude/skills/ios-screenshot/scripts/capture.sh devyoga:///new
```

App URL scheme is **`devyoga`**. Route map (Expo Router groups `(tabs)`/`index` are
omitted from URLs):

| Screen        | Deep link                |
| ------------- | ------------------------ |
| Tasks list    | `devyoga://`             |
| Task detail   | `devyoga:///<taskId>`    |
| New task      | `devyoga:///new`         |
| Chat list     | `devyoga:///chat`        |
| Chat thread   | `devyoga:///chat/<id>`   |

## Reload

Metro fast-refresh usually applies edits automatically. If the screen looks stale:

- Re-open a deep link to force navigation: `xcrun simctl openurl booted devyoga://`.
- Or reload Metro manually (`r` in the Metro terminal, or shake-reload in the app).
- `EXPO_PUBLIC_*` env changes are inlined at bundle time — they need a Metro restart
  (`cd mobile && npx expo start -c`), not just a refresh.

## Preconditions & troubleshooting

A simulator must be **booted** with the DevYoga dev build running. The script fails
fast with hints:

- **No booted sim** → boot and install the dev build: `cd mobile && npm run ios`.
- **Multiple booted sims** → it lists them; re-run with `--udid <id>`.
- Inspect manually with `xcrun simctl list devices booted`.
