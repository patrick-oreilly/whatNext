# Quick Start Checklist: Design Migration

## Step 1: Update Configuration (15 minutes)

- [ ] **Replace `tailwind.config.js`** with content from `TAILWIND_CONFIG_NEW.js`
- [ ] **Update `src/index.css`** - add to body:
  ```css
  body {
    background: linear-gradient(180deg, #FF6B3D 0%, #FF8B6B 100%);
    min-height: 100vh;
  }
  ```

## Step 2: Test Color Changes (5 minutes)

- [ ] Run `npm run dev`
- [ ] Verify orange gradient background appears
- [ ] Check console for any color-related errors

## Step 3: Update Core Components (2-3 hours)

### Priority 1: Common Components

- [ ] **Button.tsx**
  - Change `bg-accent-black` → `bg-primary`
  - Remove `border-4 border-accent-white`
  - Add `rounded-2xl shadow-soft-lg`
  - Change `font-black` → `font-bold`
  - Remove `uppercase` (keep for specific buttons only)

- [ ] **Card.tsx**
  - Change `bg-accent-black` → `bg-white`
  - Change `border-4 border-accent-white` → `border-[6px] border-yellow`
  - Change `rounded-lg` → `rounded-3xl`
  - Add `shadow-soft-lg`
  - Increase padding `p-6` → `p-10`

- [ ] **Input.tsx**
  - Change `bg-accent-white bg-opacity-10` → `bg-gray-100`
  - Change `border-4 border-accent-white` → `border-2 border-gray-300`
  - Change `text-accent-white` → `text-text-dark`
  - Add focus: `focus:border-primary focus:ring-2 focus:ring-primary/20`

### Priority 2: Layout Components

- [ ] **Layout.tsx** - Verify gradient background shows

- [ ] **Header.tsx** - Add top badge:
  ```tsx
  <div className="bg-white/30 backdrop-blur-sm border-2 border-white rounded-full px-5 py-2">
    <span className="text-white font-semibold text-sm">AI-Powered Adventures</span>
  </div>
  ```

## Step 4: Update Pages (3-4 hours)

### Home Page
- [ ] White title with yellow "?" at end
- [ ] 3 feature cards: white bg, orange icons
- [ ] Yellow-bordered input card
- [ ] Orange primary button

### Lobby Page
- [ ] Room code: white card, yellow border, large orange code
- [ ] Players grid: mint green active, orange dashed waiting
- [ ] Yellow action card at bottom with orange button
- [ ] Host badge (orange pill)

### Game Page
- [ ] Story display: white cards
- [ ] Input area: light gray background
- [ ] Voting cards: white with orange hover
- [ ] Winner: yellow card with orange border

## Step 5: Update Text Throughout (1-2 hours)

### Global Find & Replace (use with caution)

Search for → Replace with:
- `text-accent-white` → `text-text-dark` (on light backgrounds)
- `bg-accent-black` → `bg-white` (for cards)
- `border-accent-white` → `border-yellow` (for cards)
- `border-primary` → Keep (still orange)
- `font-black` → `font-bold` (for most text, keep for some headings)

### Remove Uppercase
- Find all `uppercase` classes
- Remove from body text, keep only for:
  - Page titles
  - Button text (some)
  - Small labels/badges

## Step 6: Special Components (1-2 hours)

- [ ] **RoomCode.tsx**
  - White card, yellow border
  - Orange code on light orange background
  - Inline copy button

- [ ] **PlayerList.tsx**
  - Mint avatars (#7FDFCF)
  - Orange dashed circles for empty
  - Orange host badge

- [ ] **StoryDisplay.tsx**
  - White background
  - Dark text
  - Orange markdown accents

- [ ] **VotingPanel.tsx**
  - White vote cards
  - Orange hover states
  - Yellow winner card

## Step 7: Testing (30 minutes)

- [ ] Home page looks like screenshot
- [ ] Lobby page looks like screenshot
- [ ] All pages have orange gradient background
- [ ] All cards are white with yellow borders
- [ ] All buttons are orange
- [ ] Text is readable (good contrast)
- [ ] No uppercase in body text
- [ ] All game functionality still works
- [ ] No console errors

## Step 8: Polish (1 hour)

- [ ] Adjust spacing (more generous padding)
- [ ] Verify all hover states work
- [ ] Check mobile responsive
- [ ] Test all user flows
- [ ] Fine-tune any colors that look off

---

## Critical Don'ts ⚠️

- ❌ Don't change any `useState`, `useEffect`, or hooks
- ❌ Don't modify API calls
- ❌ Don't alter game logic or flow
- ❌ Don't change function parameters or return values
- ❌ Don't modify WebSocket/SSE code
- ❌ Don't change routing logic

## Color Palette Cheat Sheet

```tsx
// Use these throughout
bg-primary          // #FF6B3D - Orange buttons
bg-yellow           // #FFD500 - Yellow accents
bg-white            // #FFFFFF - Cards
bg-accent-cream     // #FFF5EB - Alternative cards
bg-accent-mint      // #7FDFCF - Avatars
bg-gray-100         // #F5F5F5 - Inputs

text-text-dark      // #2D2D2D - Main text
text-primary        // #FF6B3D - Orange text
text-white          // #FFFFFF - White text

border-yellow       // #FFD500 - Card borders
border-primary      // #FF6B3D - Active borders
```

---

## Estimated Total Time: 8-12 hours

**Day 1 (4-6 hours):**
- Steps 1-3: Config + Core Components

**Day 2 (4-6 hours):**
- Steps 4-5: Pages + Text Updates

**Day 3 (1-2 hours):**
- Steps 6-8: Special Components + Testing + Polish

---

## Need Help?

Refer to:
1. `DESIGN_MIGRATION_GUIDE.md` - Full comprehensive guide
2. `COMPONENT_EXAMPLES.md` - Before/after code examples
3. `TAILWIND_CONFIG_NEW.js` - New tailwind configuration
4. Screenshots in temp folder - Visual reference

---

**Good luck! Remember: Only touch styling, keep all logic intact! 🎨**
