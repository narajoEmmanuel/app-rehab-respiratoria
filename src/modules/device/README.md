# Device module

Lightweight device scaffold prepared for future ESP32 and Bluetooth integration.

## Current scope

- Folder split ready for `bluetooth`, `ingestion`, `adapters`, and `mocks`.
- Minimal types and placeholder functions only.
- No real BLE connection or protocol implementation yet.

## Design intent

- Keep patient UI independent from hardware transport details.
- Allow swapping adapters/protocols without touching session screens.

