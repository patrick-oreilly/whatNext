# What Next?

A turn-based narrative adventure game where an AI Game Master creates a story collaboratively shaped by players.

## Language

**Room**:
A gathering-place identified by a room code. Players join a Room, and a Room persists across the full lifecycle — from creation, through gameplay, to post-game. A Room can exist with no active Game (lobby phase).
_Avoid_: Lobby, session

**Game**:
The active play session within a Room. Starts when the host advances past the lobby, ends when the story concludes. Drives the turn loop. A Room has one Game at a time.
_Avoid_: Match, round, session

**Turn**:
One cycle of the gameplay loop: AI generates a story segment → players submit inputs → players vote → one input is selected as the winning continuation. A Game runs for a configurable maximum number of Turns.
_Avoid_: Round, iteration

**Phase**:
A discrete stage within a Turn (or pre/post Game). The canonical phases are: **Lobby** (waiting for players), **Generating Story** (AI produces the next segment), **Player Input** (players submit continuation ideas), **Voting** (players vote on submissions), and **Game Over** (final scoring and story recap).
_Avoid_: State, mode

**Player Input**:
A text contribution submitted by a player during the Player Input phase — their idea for how the story should continue. Multiple inputs are collected, then voted on.
_Avoid_: Submission, entry, suggestion

**Vote**:
A player's selection of one Player Input (not their own) to become the winning continuation. The input with the most votes advances the story.
_Avoid_: Pick, choice

**Story Segment**:
One block of AI-generated narrative, plus the associated decision prompt and player status. The full story is a sequence of Segments, one per Turn.
_Avoid_: Chapter, scene, passage

**Storyline**:
A preset world/theme that flavours the AI's storytelling (e.g. Hoop Dreams, Casino Heist). Chosen by the host when creating a Room.
_Avoid_: Theme, setting, world
