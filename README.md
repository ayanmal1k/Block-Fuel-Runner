# Manny Obstacle Run

<p align="center">
  <img src="./public/manny.png" alt="Manny" width="150" />
</p>

A fast-paced 2D obstacle runner built with **Next.js**, **React**, and **HTML Canvas**. Dodge, jump, punch, and collect coins as you run endlessly through a procedurally generated landscape.

---

## Gameplay

You control **Manny**, who automatically runs from left to right. Your goal is to survive as long as possible by avoiding obstacles, destroying them with punches, and collecting coins.

### Controls

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Jump | `W` / `Arrow Up` / `Space` | -- |
| Duck | `S` / `Arrow Down` | -- |
| Punch | `D` / `Arrow Right` | Click (costs 1 coin) |
| Start / Retry | Any key | -- |

### Scoring

| Action | Points |
|--------|--------|
| Dodge an obstacle (duck or jump) | +1 |
| Punch a **Scrap-Mite** (costs 1 coin) | +2 |
| Punch an **Aero-Jelly** (costs 1 coin) | +3 |
| Punch a **Hollow Stalker** (costs 1 coin) | +4 |

### Obstacles

| Sprite | Name | Description |
|--------|------|-------------|
| <img src="./public/aero-jelly.jpg" width="48" /> | **Aero-Jelly** | A floating jellyfish-like enemy. Duck under it to avoid. |
| <img src="./public/hollow.jpg" width="48" /> | **Hollow Stalker** | A tall ground enemy. Can be punched for the highest score. |
| <img src="./public/mite.png" width="48" /> | **Scrap-Mite** | A small ground enemy. Low profile makes it tricky. |

### Bullets

Each enemy fires bullets at random intervals. **Two types** of bullets exist, chosen randomly:

| Bullet | Image | Damage | Notes |
|--------|-------|--------|-------|
| **Crystal KO-Spark** | <img src="./public/crystal bullet.png" width="48" /> | -50 HP | The standard bullet, hits hard |
| **Nano Jab** | <img src="./public/bullet.png" width="48" /> | -25 HP | A lighter bullet, but still dangerous |

Bullets **cannot be punched** -- you must dodge them.

- **Aero-Jelly & Hollow Stalker bullets**: Mid-height -- dodge by **ducking** or **jumping**.
- **Scrap-Mite bullets**: Low to the ground -- must be **jumped** over (ducking won't help).
- Each hit briefly flashes the screen red and shows a damage popup.

### Health System

You have **100 HP**. A health bar is displayed in the top-left corner of the game area.
- Crystal KO-Spark removes 50 HP. Nano Jab removes 25 HP.
- Health regenerates slowly over time (~5.5 seconds to full recovery from 50 HP).
- If HP reaches 0, the game ends.
- Colors indicate danger level: green (>50%), yellow (25-50%), red (<25%).

### Coins

Gold coins appear at random heights and intervals. Collect them to fuel your punches.

- Each coin allows **one punch** (1 coin = 1 punch), consumed even if the punch misses.
- Punches are blocked when you have 0 coins, shown as `✕ No Coin!` on the HUD.
- Coins are placed with a safe gap from obstacles so they're always reachable.
- Coin count is displayed on the canvas HUD and score bar.

---

## Project Structure

```
public/
  manny.png          -- Game mascot / favicon
  idle.jpg           -- Idle sprite sheet (4 frames)
  runn.jpg           -- Run sprite sheet (6 frames)
  duck.jpg           -- Duck sprite sheet (4 frames)
  jump.jpg           -- Jump sprite sheet (4 frames)
  punch.jpg          -- Punch sprite sheet (4 frames)
  aero-jelly.jpg     -- Aero-Jelly obstacle sprite (2 frames)
  hollow.jpg         -- Hollow Stalker obstacle sprite (2 frames)
  mite.png           -- Scrap-Mite obstacle sprite (2 frames)
  bullet.png           -- Nano Jab bullet sprite
  crystal\ bullet.png  -- Crystal KO-Spark bullet sprite
  coin.png           -- Collectible coin sprite
  bg.png             -- Parallax background

app/
  page.tsx           -- Main game component (canvas, logic, UI)
  layout.tsx         -- Root layout with metadata and favicon
  globals.css        -- Global styles
```

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas (2D context)
- **State**: React `useRef` for per-frame game state, `useState` for UI-bound values
- **Animation**: `requestAnimationFrame` game loop (60fps)
- **Deployment**: Vercel-ready

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build

```bash
npm run build
npm start
```

---

## Features

- Procedurally generated obstacles with increasing difficulty
- Three enemy types with unique behaviors and scoring
- Bullet system with two types: Crystal KO-Spark (50 HP) and Nano Jab (25 HP)
- Health bar with auto-regen and damage flash feedback
- Coin collection fuels punches (1 coin = 1 punch), with safe placement from obstacles
- Punch mechanic to destroy obstacles (costs 1 coin per use)
- Score popups and particle effects
- High score saved to localStorage
- Mobile-friendly with landscape orientation lock
- Fullscreen support with letterboxing
- Responsive scoring guide and controls display
