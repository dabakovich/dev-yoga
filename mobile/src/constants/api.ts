// Base URL for the NestJS backend (see ../../backend).
//
// - iOS Simulator reaches the host Mac through `localhost`.
// - On a REAL iPhone via Expo Go, `localhost` points at the phone itself —
//   replace this with your Mac's LAN IP, e.g. 'http://192.168.1.42:3000'.
//   Find it with: ipconfig getifaddr en0
export const API_BASE = 'http://localhost:3000';
