# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Orientation

- **Dev build, not Expo Go** — native modules (`@expo/ui/swift-ui`,
  `expo-glass-effect`) require the local `expo-dev-client` build
  (`npm run ios` once, then `npm run dev`). See [README.md](README.md).
- **iOS-first** — Web and Android are out of scope for this MVP; don't spend
  effort keeping them working.
- **Routing** — Expo Router file-based routes in `src/app` (native tabs:
  `index` = Tasks, `chat` = AI chat).
- **State** — Redux Toolkit + RTK Query in `src/store`; server cache via tag
  invalidation (chat mutations invalidate `Task.LIST`), persistence via
  redux-persist on MMKV. Don't add imperative fetches — extend the RTK Query
  slices.
- **Native UI** — header buttons/menus are `@expo/ui/swift-ui` components
  inside `Host`; icon-only buttons need `labelStyle('iconOnly')` plus a real
  `label` for accessibility.
- **Backend URL** — `EXPO_PUBLIC_API_BASE` (inlined at bundle time; restart
  Metro with `-c` after changing). Types mirroring backend DTOs live in
  `src/utils/api.ts`.
