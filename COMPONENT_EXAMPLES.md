# Component Code Examples: Before & After

This document provides specific code examples for key components showing the transformation from current design to new design.

---

## 1. Button Component

### BEFORE (Current)
```tsx
<Button className="bg-accent-black border-4 border-accent-white text-accent-white font-black uppercase text-lg px-8 py-4">
  Submit Your Idea
</Button>
```

### AFTER (New Design)
```tsx
<Button className="bg-primary text-white font-bold text-base px-8 py-4 rounded-2xl shadow-soft-lg hover:bg-primary-600 transition-all">
  Submit Your Idea
</Button>
```

**Changes:**
- Removed `uppercase`
- Changed `font-black` to `font-bold`
- Removed thick border
- Changed bg to `bg-primary` (orange)
- Added `rounded-2xl` (16px)
- Added soft shadow
- Removed excessive text size

---

## 2. Card Component

### BEFORE (Current)
```tsx
<Card className="bg-accent-black border-4 border-accent-white rounded-lg p-6">
  <h2 className="text-2xl font-black text-primary uppercase mb-4">Game Lobby</h2>
  <p className="text-accent-white font-semibold">Content here</p>
</Card>
```

### AFTER (New Design)
```tsx
<Card className="bg-white border-[6px] border-yellow rounded-3xl p-10 shadow-soft-lg">
  <h2 className="text-2xl font-black text-primary uppercase mb-4">Game Lobby</h2>
  <p className="text-text-dark font-normal leading-relaxed">Content here</p>
</Card>
```

**Changes:**
- Background: `bg-accent-black` → `bg-white`
- Border: `border-4 border-accent-white` → `border-[6px] border-yellow`
- Corners: `rounded-lg` → `rounded-3xl` (24px)
- Padding: `p-6` → `p-10` (more breathing room)
- Text: `text-accent-white` → `text-text-dark`
- Font: `font-semibold` → `font-normal` (for body text)
- Added shadow for depth
- Added `leading-relaxed` for better readability

---

## 3. Input/Textarea

### BEFORE (Current)
```tsx
<textarea
  className="w-full h-40 p-4 bg-accent-white bg-opacity-10 border-4 border-accent-white rounded-lg text-accent-white font-semibold"
  placeholder="Describe what happens next..."
/>
```

### AFTER (New Design)
```tsx
<textarea
  className="w-full h-40 p-4 bg-gray-100 border-2 border-gray-300 rounded-xl text-text-dark font-normal placeholder:text-text-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
  placeholder="Describe what happens next..."
/>
```

**Changes:**
- Background: `bg-accent-white bg-opacity-10` → `bg-gray-100` (light solid)
- Border: `border-4 border-accent-white` → `border-2 border-gray-300`
- Text: `text-accent-white` → `text-text-dark`
- Font: `font-semibold` → `font-normal`
- Placeholder: Added specific light gray color
- Focus: Orange border and ring
- Added smooth transition

---

## 4. Room Code Display

### BEFORE (Current)
```tsx
<div className="bg-accent-black border-4 border-accent-white rounded-lg p-6">
  <p className="text-accent-white font-bold uppercase mb-2">Room Code</p>
  <div className="text-primary text-4xl font-black">
    O9AWNO
  </div>
</div>
```

### AFTER (New Design)
```tsx
<div className="bg-white border-[6px] border-yellow rounded-3xl p-8 shadow-soft-lg">
  <p className="text-primary font-semibold text-sm mb-3">Share this code with friends:</p>
  <div className="bg-primary/10 rounded-2xl px-8 py-5 inline-flex items-center space-x-4">
    <span className="text-primary text-4xl font-black tracking-wider">
      O9AWNO
    </span>
    <button className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-600 transition-colors">
      <CopyIcon />
    </button>
  </div>
</div>
```

**Changes:**
- Card: White bg with yellow border
- Label: Orange text, normal case
- Code: Orange text on light orange background
- Added inline background for code
- Copy button integrated inline
- More generous padding

---

## 5. Player Avatar (Active)

### BEFORE (Current)
```tsx
<div className="flex flex-col items-center">
  <div className="w-16 h-16 rounded-full bg-primary border-4 border-accent-white flex items-center justify-center">
    <span className="text-accent-white font-black text-xl">E</span>
  </div>
  <span className="text-accent-white font-bold mt-2">efef</span>
</div>
```

### AFTER (New Design)
```tsx
<div className="flex flex-col items-center space-y-2">
  <div className="w-20 h-20 rounded-full bg-accent-mint flex items-center justify-center shadow-soft">
    <span className="text-white font-bold text-2xl">E</span>
  </div>
  <span className="text-text-dark font-semibold text-sm">efef</span>
</div>
```

**Changes:**
- Size: `w-16 h-16` → `w-20 h-20` (slightly larger)
- Background: `bg-primary` → `bg-accent-mint` (mint green #7FDFCF)
- Removed thick border
- Added soft shadow
- Text color: Orange → dark
- Font weight: `font-black` → `font-bold`

---

## 6. Player Avatar (Empty Slot)

### BEFORE (Current)
```tsx
<div className="flex flex-col items-center">
  <div className="w-16 h-16 rounded-full bg-accent-white bg-opacity-10 border-4 border-accent-white border-dashed flex items-center justify-center">
    <UserIcon className="text-accent-white w-6 h-6" />
  </div>
  <span className="text-accent-white text-opacity-60 font-bold mt-2">Waiting...</span>
</div>
```

### AFTER (New Design)
```tsx
<div className="flex flex-col items-center space-y-2">
  <div className="w-20 h-20 rounded-full border-[3px] border-primary border-dashed flex items-center justify-center">
    <UserIcon className="text-primary w-6 h-6" />
  </div>
  <span className="text-primary/60 font-medium text-sm">Waiting...</span>
</div>
```

**Changes:**
- Background: Removed, just border now
- Border: `border-accent-white` → `border-primary` (orange dashed)
- Icon color: White → orange
- Text: White → light orange
- Removed bg-opacity styling

---

## 7. Top Status Badge

### NEW (Add to Header)
```tsx
<div className="absolute top-6 left-1/2 transform -translate-x-1/2">
  <div className="bg-white/30 backdrop-blur-sm border-2 border-white rounded-full px-5 py-2 flex items-center space-x-2">
    <SparkleIcon className="w-4 h-4 text-white" />
    <span className="text-white font-semibold text-sm">AI-Powered Adventures</span>
  </div>
</div>
```

**Details:**
- Pill shape: `rounded-full`
- Semi-transparent white: `bg-white/30`
- Backdrop blur for glass effect
- White border
- Icon + text layout
- Position: Top center of page

---

## 8. Story Display

### BEFORE (Current)
```tsx
<div className="bg-accent-white bg-opacity-10 rounded-lg p-6">
  <p className="text-accent-white font-semibold text-lg">
    The launch bay hums...
  </p>
</div>
```

### AFTER (New Design)
```tsx
<div className="bg-white rounded-2xl p-8 shadow-soft">
  <p className="text-text-dark font-normal text-lg leading-relaxed">
    The launch bay hums...
  </p>
</div>
```

**Changes:**
- Background: Dark opacity → solid white
- Text: White → dark
- Font: `font-semibold` → `font-normal`
- Added `leading-relaxed` for better reading
- Removed heavy styling
- Added soft shadow

---

## 9. Vote Option Card

### BEFORE (Current)
```tsx
<button className="w-full bg-accent-white bg-opacity-10 border-4 border-accent-white rounded-lg p-6 hover:border-primary">
  <p className="text-primary font-black text-lg uppercase">Player Name</p>
  <p className="text-accent-white font-semibold mt-2">Their input text here</p>
  <span className="text-primary font-black">3 votes</span>
</button>
```

### AFTER (New Design)
```tsx
<button className="w-full bg-white border-3 border-gray-300 rounded-2xl p-6 hover:border-primary hover:bg-accent-cream transition-all shadow-soft hover:shadow-orange">
  <p className="text-primary font-bold text-lg">Player Name</p>
  <p className="text-text-dark font-normal mt-3 leading-relaxed">Their input text here</p>
  <div className="mt-3 inline-flex items-center bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
    3 votes
  </div>
</button>
```

**Changes:**
- Background: Dark → white
- Border: Thick white → thin gray
- Hover: Orange border + cream background
- Player name: Not uppercase, normal case
- Input text: Dark, normal weight
- Vote badge: Orange pill with white text
- Added shadow effects

---

## 10. Winner Announcement

### BEFORE (Current)
```tsx
<div className="bg-gradient-intense p-8 rounded-lg border-4 border-accent-white">
  <div className="text-6xl mb-4">🏆</div>
  <h3 className="text-4xl font-black text-accent-white uppercase">
    Player Wins!
  </h3>
</div>
```

### AFTER (New Design)
```tsx
<div className="bg-yellow border-[6px] border-primary rounded-3xl p-10 text-center shadow-soft-xl">
  <div className="text-7xl mb-4">🏆</div>
  <h3 className="text-4xl font-black text-text-dark mb-3">
    Player Wins!
  </h3>
  <p className="text-primary font-bold text-lg">Their winning input text</p>
</div>
```

**Changes:**
- Background: Gradient → solid yellow (#FFD500)
- Border: White → orange
- Text: White → dark
- Removed uppercase from text (keep for heading optional)
- Added winning text display
- Very rounded corners (24px)

---

## 11. Status Message (Waiting)

### BEFORE (Current)
```tsx
<div className="bg-accent-white bg-opacity-10 p-4 rounded-lg">
  <p className="text-accent-white font-bold uppercase">
    Waiting for others...
  </p>
</div>
```

### AFTER (New Design)
```tsx
<div className="bg-yellow/20 p-4 rounded-xl">
  <p className="text-text-dark font-semibold text-center">
    Waiting for others...
  </p>
</div>
```

**Changes:**
- Background: Dark → light yellow
- Text: White uppercase → dark normal case
- Font: `font-bold` → `font-semibold`
- Center aligned

---

## 12. Page Background

### BEFORE (Current - in index.css or App.tsx)
```css
body {
  background-color: #1a1a1a;
}
```

### AFTER (New Design)
```css
body {
  background: linear-gradient(180deg, #FF6B3D 0%, #FF8B6B 100%);
  min-height: 100vh;
}
```

**Changes:**
- Solid dark → orange gradient
- Top to bottom gradient
- Ensure full viewport height

---

## 13. Feature Card (Home Page)

### NEW (Add to Home Page)
```tsx
<div className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-shadow">
  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
    <SparkleIcon className="w-6 h-6 text-white" />
  </div>
  <h3 className="text-primary font-black text-xl uppercase mb-3">
    AI-Powered
  </h3>
  <p className="text-text-gray font-normal text-sm leading-relaxed">
    Dynamic narratives that adapt to your group's choices in real-time
  </p>
</div>
```

**Details:**
- White card with soft shadow
- Orange rounded square icon
- Orange uppercase heading
- Gray body text, normal case
- Hover effect lifts shadow

---

## 14. Action Button Section (Bottom of Lobby)

### NEW (Add to Lobby Page)
```tsx
<div className="bg-yellow border-[6px] border-primary rounded-3xl p-8">
  <button className="w-full bg-primary text-white font-bold text-lg py-4 rounded-2xl hover:bg-primary-600 transition-colors shadow-soft-lg">
    ▶ Start Adventure
  </button>
  <p className="text-text-dark font-semibold text-center mt-4">
    Need at least 2 players to start
  </p>
</div>
```

**Details:**
- Yellow card with orange border
- Orange button inside
- Status message below in dark text
- Very rounded corners

---

## 15. Host Badge

### NEW (Add to Player Section)
```tsx
<span className="absolute top-4 right-4 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase">
  HOST
</span>
```

**Details:**
- Orange pill badge
- White text
- Small, uppercase
- Positioned top-right of section

---

## Color Class Quick Reference

```tsx
// Backgrounds
bg-white                    // White cards
bg-primary                  // Orange buttons/accents
bg-yellow                   // Yellow action cards
bg-accent-cream            // Cream cards (#FFF5EB)
bg-gray-100                // Light gray inputs
bg-accent-mint             // Mint green avatars

// Text
text-text-dark             // Main text (#2D2D2D)
text-text-gray             // Secondary text (#5D5D5D)
text-text-light            // Placeholder (#999999)
text-primary               // Orange text
text-white                 // White text

// Borders
border-yellow              // Yellow card borders
border-primary             // Orange borders
border-gray-300            // Light gray input borders

// Shadows
shadow-soft                // Subtle shadow
shadow-soft-lg             // Medium shadow
shadow-soft-xl             // Large shadow
shadow-orange              // Orange glow
```

---

**Remember:** Keep all logic, props, state, and functionality exactly the same. Only change visual styling!
