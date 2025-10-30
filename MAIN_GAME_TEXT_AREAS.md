# Main Game Text Areas Analysis

## Overview
The main column of the game screen (`web_frontend/src/pages/Game.tsx:491`) swaps different text-heavy panels as the phase advances. Each panel composes dedicated components to keep typography, markdown support, and state transitions consistent.

## Story Timeline
- **Component:** `StoryDisplay` (`web_frontend/src/components/game/StoryDisplay.tsx:12`).  
- **Purpose:** Streams the canonical narrative with markdown styling (`prose` classes) and per-turn headers. Winning players are tagged beside each turn, and the component appends a live typing cursor while `isStreaming` is true.  
- **Formatting:** Tailwind utilities (`bg-accent-white bg-opacity-10`, `border-l-4`) build a parchment-like column, while markdown overrides ensure headings/emphasis stay on-brand.

## Status Capsule
- **Component:** `StatusDisplay` (`web_frontend/src/components/game/StatusDisplay.tsx:11`).  
- **Purpose:** Shows the AI-generated status string (e.g., “Age 15, Score 100”) just beneath the latest story excerpt during both input and voting (`web_frontend/src/pages/Game.tsx:588`, `web_frontend/src/pages/Game.tsx:643`).  
- **Formatting:** Muted capsule with uppercase label; markdown is flattened to a single line for glanceable stats.

## Decision Prompt Block
- **Location:** Input phase prompt (`web_frontend/src/pages/Game.tsx:590-600`) and highlighted quote during voting (`web_frontend/src/pages/Game.tsx:641-654`).  
- **Purpose:** Calls players to action with large uppercase typography, pulling from `currentDecisionData.decision`. When absent, defaults to “What will the character do next?”  
- **Formatting:** Center-aligned markdown with bold accents, wrapped in gradient or primary-tinted panels depending on the phase.

## Player Input Panel
- **Component:** `PlayerInput` (`web_frontend/src/components/game/PlayerInput.tsx:17`).  
- **Purpose:** Provides the editable text area plus post-submit confirmation. Includes clock-driven warnings (via `InputTimer`) and dynamic character counts to guide entry length.  
- **Formatting:** High-contrast textarea (`border-4 border-accent-white`), uppercase badges, and error banners that appear when validation fails (`web_frontend/src/components/game/PlayerInput.tsx:63-115`).

## Voting Options & Results
- **Component:** `VotingPanel` (`web_frontend/src/components/game/VotingPanel.tsx:11`).  
- **Purpose:** Lists anonymized submissions (excluding the current player) with selectable cards; after voting, swaps to a confirmation banner.  
- **Formatting:** Each option is a bordered tile with optional checkmark highlight; when results arrive, the main card pivots to trophies, quote blocks, and a vote breakdown table (`web_frontend/src/pages/Game.tsx:659-706`).

## Feedback Banners
- **Timeout Alerts:** Red strips call out players who missed the timer in input or voting (`web_frontend/src/pages/Game.tsx:602-633`).  
- **Error Messages:** Any fetch or submission error appears as a centered red banner above the grid (`web_frontend/src/pages/Game.tsx:485-488`), keeping text disruptions visually distinct from story content.

## AI Parsing & Flag Markup
- **Marker Vocabulary:** The AI backend decorates responses with bracketed flags: `[DECISION]` introduces the next prompt, `[END]` denotes story completion, and status lines follow `Status:` (optionally wrapped in markdown bold). The parsing helpers in `web_frontend/src/utils/storyHelpers.ts:10-144` normalise these variants, including the legacy typo `[DESCISON]`.  
- **Display Sanitisation:** `cleanStoryText` strips decision/status/end blocks before the story timeline renders, ensuring only narrative paragraphs reach `StoryDisplay`. Complementary functions `extractDecisionPrompt` and `extractStatus` hand the prompt text to the decision block and the compact status capsule. When the AI appends `[END]: …`, `extractEndSummary` feeds the finale cards that appear during the generating phase wrap-up.  
- **Fallback Logic:** If flags are missing, helpers degrade gracefully—e.g., `extractDecisionPrompt` scans for the last question mark, and `cleanStoryText` trims trailing question sentences. This keeps the main text areas stable even when the AI omits markers or alters formatting.
