# Session module

Session orchestrates a therapeutic exercise run for the patient. Visual minigames and difficulty configuration are kept separate so teams can evolve each part independently.

## Folder layout

- `core/` — session lifecycle types and future engine (no device transport, no UI widgets).
- `games/` — identifiers and contracts for **visual** minigame implementations.
- `levels/` — **difficulty** and metadata for a level; references a `gameVisualId` but does not define gameplay rules.
- `registry/` — central list of levels; add new levels here first.
- `screens/` — patient-facing session entry UI (thin; delegates to core/games later).

## Rules of thumb

1. **Difficulty is not a game type.** A level has `difficulty` plus a `gameVisualId`; changing visuals should not force changing difficulty rules elsewhere.
2. **WebSocket transport and device parsing** stay under `src/modules/device`; session consumes normalized inputs only when wired.
3. **Clinician analytics** should read normalized session outcomes (summary/history), not mount game components.

## Current status

Placeholder types, registry with three levels, and minimal helpers. Gameplay and device streams are not implemented yet.
