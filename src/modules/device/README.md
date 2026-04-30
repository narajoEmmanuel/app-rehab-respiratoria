# Device module

Lightweight device scaffold prepared for future ESP32 integration over **local WiFi** via **WebSocket**.

## Current scope

- Folder split ready for `websocket`, `ingestion`, `adapters`, and `mocks`.
- Minimal types and placeholder functions only.
- No real WebSocket client or wire protocol yet; sensor UI still uses mocks / demo mode.

## Design intent

- Keep patient UI independent from hardware transport details.
- Allow swapping adapters/protocols without touching session screens.

