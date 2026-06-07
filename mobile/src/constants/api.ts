// Base URL for the NestJS backend (see ../../backend).
//
// Override via the EXPO_PUBLIC_API_BASE env var in `mobile/.env` (see
// `.env.example`). EXPO_PUBLIC_* vars are inlined at bundle time, so restart the
// dev server after changing it (`npx expo start -c`).
//
// - iOS Simulator reaches the host Mac through `localhost` (the default below).
// - On a REAL iPhone, `localhost` points at the phone itself — set
//   EXPO_PUBLIC_API_BASE to your Mac's LAN IP, e.g. 'http://192.168.0.101:3000'.
//   Find it with: ipconfig getifaddr en0
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000';
