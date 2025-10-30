# Task: Diagnose Missing `[DECISION]` Prompt & Status Line Rendering

## Snapshot Summary
- **Scenario:** Player reaches Space Exploration turn 3 (room `M70T54`).
- **Expected UI:** Narrative paragraph (bolded anchors intact), explicit `[DECISION]: …` prompt, status capsule (`**Status**: Age ?, Turn 3/10, Explorer, Sanity wavering`), and the player input editor.
- **Actual UI:** Narrative paragraph rendered, but both the status capsule and decision call-to-action are missing. Input field remains, leaving users without guidance.

---

## Capture Timeline & Data Flow

### 1. Model Response
- **Source:** Gemini streaming via `backend/session_management/session_manager.py`.
- **Logged chunks:**  
  ```
  [06eca30e] ... partial=True: ' …the **travel**...'
  [06eca30e] ... partial=None: 'The instinct to **run away**...'
  ```
- **Full stitched response** (final chunk):
  ```
  The instinct to **run away** is a primal surge...

  [DECISION]: What do you do now?

  **Status**: Age ?, Turn 3/10, Explorer, Sanity wavering
  ```
- **Observation:** LLM omits `[DECISION]` in some runs (model drift), but in this reproduction it is present.

### 2. Persistence
- **Function:** `RoomManager.add_story_segment` (`backend/game_management/room_manager.py:268`).
- **Action:** Appends a `StorySegment` with `content` equal to the raw string above; the data is stored in-memory and exposed via `/api/rooms/{room_id}/state`.

### 3. API Response
- **Endpoint:** `GET /api/rooms/M70T54/state`.
- **Relevant payload:**
  ```json
  {
    "story_history": [
      { "turn": 3, "content": "The instinct to **run away**...\n\n[DECISION]: …\n\n**Status**: Age ?, Turn 3/10, Explorer, Sanity wavering" }
    ],
    "phase": "player_input",
    ...
  }
  ```
- **Takeaway:** Both `[DECISION]` and `**Status**` arrive intact at the client.

### 4. Frontend State Derivation
- **Location:** `web_frontend/src/pages/Game.tsx` (`currentDecisionData` memo).
  ```ts
  const last = roomState.story_history[roomState.story_history.length - 1];
  const currentDecisionData = useMemo(() => ({
    decision: extractDecisionPrompt(last.content),
    status: extractStatus(last.content),
  }), [roomState?.story_history]);
  ```
- **Rendering:**  
  - `Decision` → shown inside the “What Next?” block (`Game.tsx:592-600`).
  - `Status` → passed to `StatusDisplay` (`Game.tsx:588`).
- **Reality:** Both helpers return `null`, so the UI hides the elements.

---

## Parsing Logic – Detailed Reference

| Layer | File / Function | Inputs | Output | Key Implementation Notes |
|-------|-----------------|--------|--------|--------------------------|
| Story sanitiser | `storyHelpers.cleanStoryText` (`storyHelpers.ts:34`) | Raw story string | Narrative-only string | Removes everything from `[DECISION]` onwards (including `Status`) so the timeline doesn’t repeat prompts. |
| Decision extractor | `storyHelpers.extractDecisionPrompt` (`storyHelpers.ts:10`) | Raw story string | `string \| null` | Regex for `[DECISION]` marker; fallback to last `?` sentence. Doesn’t mutate input. |
| Status extractor | `storyHelpers.extractStatus` (`storyHelpers.ts:66`) | Raw story string | `string \| null` | Matches `**Status**:`/`Status:` lines. Recent hardening (`isLikelyNarrative`) rejects values considered “narrative” (length >120, multiple sentences, known phrases). |
| Status formatter | `storyHelpers.formatStatus` (`storyHelpers.ts:99`) | Status string | Bullet-separated string | Also calls `isLikelyNarrative` and returns empty string if rejected. |
| Status display | `StatusDisplay` (`components/game/StatusDisplay.tsx:11`) | Prop `status` | Capsule view | Renders nothing when prop falsy. |

---

## Root-Cause Breakdown

### Decision Prompt
1. **Model variability:** The agent occasionally skips the `[DECISION]` marker despite instructions (`backend/agent/prompts.py`). When that happens, `extractDecisionPrompt` falls back to the last question mark; if the narrative ends with a period, `null` is returned.
2. **Frontend behaviour:** `null` leads to the fallback copy “What will the character do next?” (already in place), but users lose the specific prompt the AI intended. No logging alerts the dev team when this happens.

### Status Line
1. **Model output:** Status arrives correctly (`**Status**: Age ?, Turn 3/10, Explorer, Sanity wavering`).
2. **Extractor rejection:** The newly added narrative guard `isLikelyNarrative` in `storyHelpers.ts:113` drops any status string it thinks is story content. Cases observed:
   - Strings beginning with `Status:` (uppercase) trip the `STATUS\s*:` split; trailing text sometimes empty, producing `null`.
   - Minimal tag sets (`Age ?, ...`) slightly exceed heuristic thresholds (e.g., length >120 after formatting) and are discarded.
3. **Result:** `extractStatus` returns `null`, `StatusDisplay` renders nothing, and the sanitised story timeline still hides the status block.

### Cross-layer Interaction
- Even when the extractor succeeds, `cleanStoryText` ensures the narrative box omits the status. Therefore the status can only appear via the capsule; if the extractor deems it invalid, the UI looks “empty” despite the data being present twice (line in response + hidden in timeline).

---

## Additional Context for Implementers

- **State caching:** The React store (`useGameStore`) retains the last `RoomStateResponse`. When parsing fails once, subsequent polls continue to re-evaluate the same string until a new turn arrives.
- **Streaming cache warning:** Logs like “Stream already active… replaying cached response” indicate SSE replay; the issue reproduces both live and replayed because the same content flows through the helpers.
- **Frontend fallback text:** `Game.tsx:600` already injects default `What will the character do next?`, but without the status capsule users still lack metadata.
- **Tests currently absent:** No unit tests cover `extractStatus` / `extractDecisionPrompt`; the recent guard rails were introduced without regression coverage.

---

## Reproduction Checklist
1. Start backend (`python -m backend.api_server`) with DEBUG logging for `session_manager`.
2. Run frontend (`npm run dev`).
3. Create/join Space Exploration game; advance to turn 3.
4. Inspect browser network tab → `/api/rooms/{room_id}/state` (confirm `[DECISION]` + `Status` present).
5. Observe UI: decision prompt missing, status capsule absent.
6. Console `console.log(currentDecisionData)` to verify both fields `null`.
7. Optional: Temporarily comment out `isLikelyNarrative` call to confirm status returns.

---

## Fix Plan (Expanded)

### A. Parsing Adjustments
1. **Decision fallback:**
   - When `extractDecisionPrompt` returns `null`, log a warning with turn, room ID, and raw content.
   - Provide a smart fallback (e.g., “How do you proceed?”) so UI isn’t blank.
   - Consider stricter regex capturing `[DECISION]` even if punctuation missing (e.g., `\[DECISION\]\s*:?\s*(.+)$`, multi-line).
2. **Status extraction:**
   - Revisit `isLikelyNarrative` thresholds; for metadata strings (<5 tags) it should never flag.
   - Ensure splitting by `STATUS:` is case-sensitive or handles uppercase, returning the first non-empty segment.
   - Move narrative detection to `formatStatus` only (so the raw value remains accessible elsewhere).
   - Optionally, extract status before running `cleanStoryText` to avoid future interference.

### B. Validation & Alerts
1. **Frontend:** Add dev-mode console warnings when either field is missing:
   ```ts
   if (!decision) console.warn('[DecisionMissing]', roomId, turn, last.content);
   ```
2. **Backend:** Post-process Gemini output before streaming:
   - If `[DECISION]` missing, append a default question.
   - If `Status` missing, inject a placeholder (“Age ?, Turn ?, State unknown”).

### C. Testing
1. **Unit tests** (`vitest`) for `extractDecisionPrompt` / `extractStatus` covering:
   - Standard output
   - No `[DECISION]` but trailing question
   - Status with uppercase `STATUS:`
   - Status spanning two sentences (should still display the first tag set).
2. **Integration** (optional): Add Cypress/Vitest UI test to assert the status capsule renders in `PLAYER_INPUT`.

### D. Documentation & Prompting
1. **Agent prompt** (`backend/agent/prompts.py`):
   - Emphasise `[DECISION]` must always be included; if none, fallback to “What do you do now?”.
   - Clarify status format (3–5 tags, commas only).
2. **Developer notes:** Update README/guide with parsing expectations.

---

## Current Status
- **Owner:** _Unassigned_
- **Priority:** High – blocks core gameplay loop (players lack direction).
- **Pending actions:** Assign fix owner, implement parser adjustments, add tests, and evaluate backend safeties to guard against future model drift.

---

## Appendix: Function & Component Map
- `backend/session_management/session_manager.py` → streams Gemini output chunk-by-chunk.
- `backend/game_management/room_manager.py:add_story_segment` → stores raw narrative + metadata.
- `web_frontend/src/pages/Game.tsx` → orchestrates phase-specific layouts, calls parsing helpers.
- `web_frontend/src/utils/storyHelpers.ts` → centralises string manipulation for decision/status/timeline.
- `web_frontend/src/components/game/StatusDisplay.tsx` → renders status capsule only when supplied non-empty string.

Maintaining a single source of truth for the raw story text and being deliberate about when helper functions strip metadata will be key to fixing this issue and preventing similar regressions.***
