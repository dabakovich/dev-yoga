# Chat Screen Decomposition — Design

**Date:** 2026-06-17
**Status:** Approved (design)
**Scope:** Behavior-preserving refactor of `mobile/src/app/(tabs)/chat/index.tsx`.

## Problem

`index.tsx` is 371 lines and bundles several unrelated concerns: two bubble
components, a quick-chips constant, the keyboard-visibility listener, the
`handleSend` logic with its reply side-effect string-building, the empty state,
the input bar, and one large `StyleSheet`. The file does too much, which makes it
hard to read and to test the one piece of real logic it contains (reply
formatting).

## Goal

Turn the screen into thin orchestration by extracting focused, independently
readable units. **No behavior change** — the refactor must be a pure
restructuring; the rendered UI and interactions stay identical.

## Conventions followed

- Components live flat in `mobile/src/components/`, kebab-case filenames
  (matches `task-card.tsx`, `sort-menu.tsx`).
- Reusable logic hooks live in `mobile/src/hooks/` (matches
  `use-delete-confirm.ts`).
- Pure helpers live in `mobile/src/utils/` (alongside `api.ts`).
- Each component calls `useTheme()` itself and owns its own `StyleSheet`.

## New components (`mobile/src/components/`)

| File | Responsibility | Props |
|------|----------------|-------|
| `chat-message-bubble.tsx` | One message bubble + copy-on-long-press (haptics on iOS, toast on Android) | `message: StoredMessage` |
| `chat-typing-bubble.tsx` | The `…` assistant typing placeholder bubble | — |
| `chat-empty-state.tsx` | Centered intro copy + quick-reply chips; owns the `QUICK_CHIPS` constant | `onChipPress: (text: string) => void` |
| `chat-input-bar.tsx` | `TextInput` + send button | `value: string; onChangeText: (t: string) => void; onSend: () => void; canSend: boolean; bottomInset: number` |

Notes:
- The bubbles currently receive `theme` as a prop threaded from the screen.
  After the move they call `useTheme()` directly, removing that prop-drilling.
- `chat-input-bar.tsx` receives `bottomInset` already resolved by the screen
  (the screen owns `useSafeAreaInsets()` + keyboard-visibility, and passes the
  computed padding-bottom value). This keeps the input bar presentational.

## New helper (`mobile/src/utils/`)

- **`format-chat-reply.ts`** — pure function
  `formatChatReply(reply: string, result: ChatResult): string` that appends
  the side-effect summaries (✅ created tasks, ✏️ updated tasks, 🗑️ deleted
  tasks, 🧠 saved memories, 🧠 forgot memories) to the assistant reply. Pure
  string logic, no React → directly unit-testable. Lifts the ~25-line block out
  of `handleSend`. Reuse the existing `ChatResult` type from `@/utils/api`
  (the return type of `useSendChatMutation`) rather than redefining it.

## New hook (`mobile/src/hooks/`)

- **`use-keyboard-visible.ts`** — wraps the `keyboardWillShow` / `keyboardWillHide`
  listeners and returns a `boolean`. Mirrors the existing `use-delete-confirm`
  hook style.

## What stays in `index.tsx`

- Redux / RTK Query wiring (`useAppDispatch`, `useAppSelector`, `selectMessages`,
  `useSendChatMutation`).
- `handleSend` — now: dispatch user message → `sendChat(...)` → `formatChatReply`
  → dispatch assistant message; unchanged error handling.
- `handleClear` — the destructive confirm `Alert`.
- The `Stack.Screen` header trash button (hidden when empty).
- The `inverted` `FlatList` and its `listData` derivation.
- Composition of the four components inside `KeyboardAvoidingView`.

Target: ~110 lines.

### Why `handleSend`/`handleClear` stay in the screen

They are tightly coupled to Redux dispatch and the `sendChat` mutation. A
`useChat` hook would relocate that coupling without simplifying it, so it is out
of scope (YAGNI).

## Testing

- `format-chat-reply.ts` gets a unit test covering: no side effects (reply
  unchanged), single vs plural task counts, and combined side effects.
- Visual components are verified manually in the running app — the refactor is
  behavior-preserving, so the existing chat flow (empty state → chip → send →
  reply with side-effect summary → clear) is the acceptance check.

## Out of scope

- `useChat` hook (logic relocation only).
- Any change to backend, `chat-api.ts`, or `chat-slice.ts`.
- Web/Android-specific polish beyond what already exists.
