"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ───────── sprite-sheet geometry ───────── */
const IDLE_FRAMES = 4;
const IDLE_SHEET_W = 1800;
const IDLE_SHEET_H = 474;
const IDLE_FW = IDLE_SHEET_W / IDLE_FRAMES; // 450
const IDLE_FH = IDLE_SHEET_H;               // 474

const RUN_FRAMES = 6;
const RUN_SHEET_W = 2688;
const RUN_SHEET_H = 453;
const RUN_FW = RUN_SHEET_W / RUN_FRAMES;    // 448
const RUN_FH = RUN_SHEET_H;                 // 453

const DUCK_FRAMES = 4;
const DUCK_SHEET_W = 1024;
const DUCK_SHEET_H = 229;
const DUCK_FW = DUCK_SHEET_W / DUCK_FRAMES; // 256
const DUCK_FH = DUCK_SHEET_H;               // 229

const JUMP_FRAMES = 4;
const JUMP_SHEET_W = 1024;
const JUMP_SHEET_H = 229;
const JUMP_FW = JUMP_SHEET_W / JUMP_FRAMES; // 256
const JUMP_FH = JUMP_SHEET_H;               // 229

const PUNCH_FRAMES = 4;
const PUNCH_SHEET_W = 1024;
const PUNCH_SHEET_H = 228;
const PUNCH_FW = PUNCH_SHEET_W / PUNCH_FRAMES; // 256
const PUNCH_FH = PUNCH_SHEET_H;                // 228

const AERO_FRAMES = 2;
const AERO_SHEET_W = 687;
const AERO_SHEET_H = 269;
const AERO_FW = AERO_SHEET_W / AERO_FRAMES;
const AERO_FH = AERO_SHEET_H;
const AERO_DRAW_W = 75;
const AERO_DRAW_H = 59;

const HOLLOW_FRAMES = 2;
const HOLLOW_SHEET_W = 687;
const HOLLOW_SHEET_H = 269;
const HOLLOW_FW = HOLLOW_SHEET_W / HOLLOW_FRAMES;
const HOLLOW_FH = HOLLOW_SHEET_H;
const HOLLOW_DRAW_W = 100;
const HOLLOW_DRAW_H = 100;

const MITE_FRAMES = 2;
const MITE_SHEET_W = 2691;
const MITE_SHEET_H = 1056;
const MITE_FW = MITE_SHEET_W / MITE_FRAMES;
const MITE_FH = MITE_SHEET_H;
const MITE_DRAW_W = 50;
const MITE_DRAW_H = 50;

/* ───────── game constants ───────── */
const CANVAS_W = 900;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 60;            // ground line
const CHAR_DRAW_H = 100;                   // normal rendered height
const CHAR_DRAW_W = 100;                   // normal rendered width
const DUCK_DRAW_H = 90;                    // cropped duck height (fits under high obstacles)
const DUCK_DRAW_W = 112;                   // natural proportional width when ducking
const JUMP_DRAW_H = 118;                   // height when jumping (keeps character scale consistent)
const JUMP_DRAW_W = 118;                   // width when jumping (keeps character scale consistent)
const PUNCH_DRAW_H = 100;                  // punch height
const PUNCH_DRAW_W = 130;                  // punch is wider (arm extends)
const CHAR_X = 80;
const SPRITE_CROP = 10;                         // character x position

const GRAVITY = 0.65;
const JUMP_VELOCITY = -14;
const BG_SPEED = 1.5;                      // parallax bg scroll speed

const OBSTACLE_MIN_GAP = 90;               // min frames between obstacles
const OBSTACLE_MAX_GAP = 160;
const OBSTACLE_SPEED_INITIAL = 5;
const OBSTACLE_SPEED_INCREMENT = 0.0004;   // speed-up per frame

const PUNCH_DURATION = 18;                 // frames the punch lasts
const DODGE_SCORE = 1;                     // points for dodging
const PUNCH_SCORE = 2;                     // points for punching an obstacle

const BULLET_W = 30;
const BULLET_H = 10;
const BULLET_SPEED = 7;
const BULLET_SHOT_MIN = 80;                // min frames between shots
const BULLET_SHOT_MAX = 200;               // max frames between shots
const NANO_JAB_DAMAGE = 25;

const COIN_W = 20;
const COIN_H = 20;
const COIN_SPAWN_MIN = 160;                 // min frames between coin spawns
const COIN_SPAWN_MAX = 300;

const MAX_HEALTH = 100;
const BULLET_DAMAGE = 50;
const HEALTH_REGEN = 0.15;                 // health recovered per frame-equivalent

/* ───────── obstacle types ───────── */
type ObstacleKind = "aero" | "hollow" | "mite";
interface Obstacle {
  x: number;
  kind: ObstacleKind;
  width: number;
  height: number;
  passed: boolean;
  destroyed: boolean;         // punched away
  destroyAnim: number;       // destruction animation timer
  shotTimer: number;         // frames until next bullet shot
}

interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  damage: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

/* ───────── particle effect for punch destroy ───────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/* ───────── helpers ───────── */
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createObstacle(x: number, speed: number): Obstacle {
  const aeroChance = Math.min(0.4, speed / 30);
  const kind: ObstacleKind = Math.random() < aeroChance
    ? "aero"
    : Math.random() < 0.5 ? "hollow" : "mite";
  const sizes: Record<ObstacleKind, { width: number; height: number }> = {
    aero:  { width: AERO_DRAW_W,  height: AERO_DRAW_H },
    hollow:{ width: HOLLOW_DRAW_W, height: HOLLOW_DRAW_H },
    mite:  { width: MITE_DRAW_W,  height: MITE_DRAW_H },
  };
  const { width, height } = sizes[kind];
  return {
    x, kind, width, height,
    passed: false, destroyed: false, destroyAnim: 0,
    shotTimer: randomInt(BULLET_SHOT_MIN, BULLET_SHOT_MAX),
  };
}

function spawnDestroyParticles(ob: Obstacle, particles: Particle[]) {
  const cx = ob.x + ob.width / 2;
  const cy = ob.kind === "aero" ? GROUND_Y - 100 + ob.height / 2 : GROUND_Y - ob.height / 2;
  const colors = ob.kind === "aero"
    ? ["#8e44ad", "#9b59b6", "#f39c12", "#bb8fce", "#fff"]
    : ["#e74c3c", "#c0392b", "#f39c12", "#ff6b6b", "#fff"];
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * ob.width,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function removeSpriteBackground(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Find dominant color
  const colorCounts = new Map<string, number>();
  let maxCount = 0;
  let domR = 160, domG = 160, domB = 160;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 50) continue;

    const binR = Math.round(r / 8) * 8;
    const binG = Math.round(g / 8) * 8;
    const binB = Math.round(b / 8) * 8;
    const key = `${binR},${binG},${binB}`;

    const count = (colorCounts.get(key) || 0) + 1;
    colorCounts.set(key, count);

    if (count > maxCount) {
      maxCount = count;
      domR = binR;
      domG = binG;
      domB = binB;
    }
  }

  // Clear matching background pixels
  const tolerance = 45;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dr = r - domR;
    const dg = g - domG;
    const db = b - domB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < tolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function MannyObstacleRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgParticles, setBgParticles] = useState<React.ReactNode[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      try { await (screen.orientation as any)?.lock?.("landscape"); } catch {}
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setBgParticles(
      Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            background: `rgba(255, 180, 50, ${0.1 + Math.random() * 0.2})`,
            borderRadius: "50%",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))
    );
  }, []);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  // Mutable game state (not React state — updated every frame)
  const gs = useRef({
    charY: GROUND_Y - CHAR_DRAW_H,
    velY: 0,
    isJumping: false,
    isDucking: false,
    isPunching: false,
    punchTimer: 0,
    punchAnimFrame: 0,
    frame: 0,
    lastTime: 0,
    animAccumulator: 0,
    duckAnimAccumulator: 0,
    animFrame: 0,
    duckAnimFrame: 0,
    bgX: 0,
    obstacles: [] as Obstacle[],
    bullets: [] as Bullet[],
    coins: [] as Coin[],
    particles: [] as Particle[],
    nextObstacleIn: 80,
    nextCoinIn: randomInt(COIN_SPAWN_MIN, COIN_SPAWN_MAX),
    speed: OBSTACLE_SPEED_INITIAL,
    score: 0,
    coinCount: 0,
    health: MAX_HEALTH,
    damageFlash: 0,
    playing: false,
    dead: false,
    // Score popup effect
    scorePopups: [] as { x: number; y: number; text: string; life: number; color: string }[],
  });

  // Key state
  const keys = useRef<Record<string, boolean>>({});

  /* ── load images once ── */
  const idleImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const runImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const bgImg = useRef<HTMLImageElement | null>(null);
  const duckImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const punchImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const jumpImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const aeroJellyImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const hollowImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const miteImg = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const bulletImg = useRef<HTMLImageElement | null>(null);
  const nanoImg = useRef<HTMLImageElement | null>(null);
  const coinImg = useRef<HTMLImageElement | null>(null);
  const aeroPreviewRef = useRef<HTMLCanvasElement>(null);
  const hollowPreviewRef = useRef<HTMLCanvasElement>(null);
  const mitePreviewRef = useRef<HTMLCanvasElement>(null);
  const bulletPreviewRef = useRef<HTMLCanvasElement>(null);
  const nanoPreviewRef = useRef<HTMLCanvasElement>(null);
  const coinPreviewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cleanImageRef = (src: string, ref: React.MutableRefObject<HTMLCanvasElement | HTMLImageElement | null>) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        ref.current = removeSpriteBackground(img);
      };
    };

    cleanImageRef("/idle.jpg", idleImg);
    cleanImageRef("/runn.jpg", runImg);
    cleanImageRef("/duck.jpg", duckImg);
    cleanImageRef("/punch.jpg", punchImg);
    cleanImageRef("/jump.jpg", jumpImg);
    cleanImageRef("/aero-jelly.jpg", aeroJellyImg);
    cleanImageRef("/hollow.jpg", hollowImg);
    cleanImageRef("/mite.png", miteImg);

    bgImg.current = new Image();
    bgImg.current.src = "/bg.png";

    bulletImg.current = new Image();
    bulletImg.current.src = "/crystal%20bullet.png";

    nanoImg.current = new Image();
    nanoImg.current.src = "/bullet.png";

    coinImg.current = new Image();
    coinImg.current.src = "/coin.png";

    // Load high-score from localStorage
    const saved = localStorage.getItem("manny-hi");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  /* ── draw preview sprites for scoring guide ── */
  useEffect(() => {
    const draw = () => {
      const jobs = [
        { ref: aeroPreviewRef, img: aeroJellyImg.current, fw: AERO_FW, fh: AERO_FH },
        { ref: hollowPreviewRef, img: hollowImg.current, fw: HOLLOW_FW, fh: HOLLOW_FH },
        { ref: mitePreviewRef, img: miteImg.current, fw: MITE_FW, fh: MITE_FH },
        { ref: bulletPreviewRef, img: bulletImg.current, fw: 0, fh: 0 },
        { ref: nanoPreviewRef, img: nanoImg.current, fw: 0, fh: 0 },
        { ref: coinPreviewRef, img: coinImg.current, fw: 0, fh: 0 },
      ];
      for (const j of jobs) {
        const c = j.ref.current;
        if (!c || !j.img) continue;
        const cx = c.getContext("2d");
        if (!cx) continue;
        if (j.fw > 0) {
          cx.drawImage(j.img, 20, 20, j.fw - 40, j.fh - 20, 0, 0, c.width, c.height);
        } else {
          cx.drawImage(j.img, 0, 0, c.width, c.height);
        }
      }
    };
    const t = setTimeout(draw, 600);
    return () => clearTimeout(t);
  }, []);

  /* ── keyboard handlers ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      // Prevent scroll on arrow keys
      if (["arrowup", "arrowdown", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ── mouse click handler for punch ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = () => {
      const g = gs.current;
      if (g.playing && !g.dead && !g.isPunching) {
        if (g.coinCount > 0) {
          g.isPunching = true;
          g.punchTimer = PUNCH_DURATION;
          g.punchAnimFrame = 0;
          g.coinCount--;
          setCoinCount(g.coinCount);
        }
      }
    };
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, []);

  /* ── reset game ── */
  const resetGame = useCallback(() => {
    const g = gs.current;
    g.charY = GROUND_Y - CHAR_DRAW_H;
    g.velY = 0;
    g.isJumping = false;
    g.isDucking = false;
    g.isPunching = false;
    g.punchTimer = 0;
    g.punchAnimFrame = 0;
    g.frame = 0;
    g.animFrame = 0;
    g.duckAnimFrame = 0;
    g.bgX = 0;
    g.obstacles = [];
    g.bullets = [];
    g.coins = [];
    g.particles = [];
    g.scorePopups = [];
    g.nextObstacleIn = 80;
    g.nextCoinIn = randomInt(COIN_SPAWN_MIN, COIN_SPAWN_MAX);
    g.speed = OBSTACLE_SPEED_INITIAL;
    g.score = 0;
    g.coinCount = 0;
    g.health = MAX_HEALTH;
    g.damageFlash = 0;
    setCoinCount(0);
    g.playing = true;
    g.dead = false;
    setScore(0);
    setGameState("playing");
  }, []);

  /* ── main game loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    function loop(now: number) {
      const g = gs.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Delta-time normalization (target 60fps)
      if (!g.lastTime) g.lastTime = now;
      const dt = Math.min((now - g.lastTime) / 16.667, 3);
      g.lastTime = now;

      /* ── draw scrolling background ── */
      if (bgImg.current && bgImg.current.complete) {
        const bgDrawH = CANVAS_H;
        const bgDrawW = (bgImg.current.width / bgImg.current.height) * bgDrawH;

        if (g.playing && !g.dead) {
          g.bgX -= BG_SPEED * dt;
          if (g.bgX <= -bgDrawW) g.bgX += bgDrawW;
        }

        let x = g.bgX;
        while (x < CANVAS_W) {
          ctx.drawImage(bgImg.current, x, 0, bgDrawW, bgDrawH);
          x += bgDrawW;
        }
      } else {
        // Fallback grey bg
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      /* ── draw subtle grid overlay ── */
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < CANVAS_W; gx += 64) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, CANVAS_H);
        ctx.stroke();
      }
      for (let gy = 0; gy < CANVAS_H; gy += 64) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CANVAS_W, gy);
        ctx.stroke();
      }

      /* ── draw ground ── */
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      groundGrad.addColorStop(0, "rgba(60, 50, 45, 0.9)");
      groundGrad.addColorStop(1, "rgba(40, 35, 30, 0.95)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      // Ground line
      ctx.strokeStyle = "rgba(255, 180, 50, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      /* ── update logic (only when playing) ── */
      if (g.playing && !g.dead) {
        g.frame += dt;
        g.speed = OBSTACLE_SPEED_INITIAL + g.frame * OBSTACLE_SPEED_INCREMENT;

        // Jump
        if (
          (keys.current["arrowup"] || keys.current["w"] || keys.current[" "]) &&
          !g.isJumping
        ) {
          g.velY = JUMP_VELOCITY;
          g.isJumping = true;
        }

        // Duck (only on ground, not while punching)
        g.isDucking =
          (keys.current["arrowdown"] || keys.current["s"]) && !g.isJumping && !g.isPunching;

        // Punch (D key or Right arrow — triggers once per press, costs 1 coin)
        if (
          (keys.current["d"] || keys.current["arrowright"]) &&
          !g.isPunching
        ) {
          if (g.coinCount > 0) {
            g.isPunching = true;
            g.punchTimer = PUNCH_DURATION;
            g.punchAnimFrame = 0;
            g.coinCount--;
            setCoinCount(g.coinCount);
          }
        }

        // Update punch timer
        if (g.isPunching) {
          g.punchTimer -= dt;
          // Advance punch animation (cycle through 4 frames over PUNCH_DURATION)
          const frameStep = PUNCH_DURATION / PUNCH_FRAMES;
          g.punchAnimFrame = Math.min(
            PUNCH_FRAMES - 1,
            Math.floor((PUNCH_DURATION - g.punchTimer) / Math.max(1, frameStep))
          );
          if (g.punchTimer <= 0) {
            g.isPunching = false;
            g.punchAnimFrame = 0;
          }
        }

        // Apply gravity
        g.velY += GRAVITY * dt;
        g.charY += g.velY * dt;

        const standY = g.isDucking
          ? GROUND_Y - DUCK_DRAW_H
          : GROUND_Y - CHAR_DRAW_H;

        if (g.charY >= standY) {
          g.charY = standY;
          g.velY = 0;
          g.isJumping = false;
        }

        // Animation frame (run cycle)
        g.animAccumulator += dt;
        if (g.animAccumulator >= 6) {
          g.animFrame = (g.animFrame + 1) % RUN_FRAMES;
          g.animAccumulator -= 6;
        }
        // Duck animation frame
        if (g.isDucking) {
          g.duckAnimAccumulator += dt;
          if (g.duckAnimAccumulator >= 8) {
            g.duckAnimFrame = (g.duckAnimFrame + 1) % DUCK_FRAMES;
            g.duckAnimAccumulator -= 8;
          }
        }

        // Spawn obstacles
        g.nextObstacleIn -= dt;
        if (g.nextObstacleIn <= 0) {
          g.obstacles.push(createObstacle(CANVAS_W + 20, g.speed));
          g.nextObstacleIn = randomInt(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP);
        }

        // Move & cull obstacles
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const ob = g.obstacles[i];
          if (ob.destroyed) {
            ob.destroyAnim+=dt;
            if (ob.destroyAnim > 20) {
              g.obstacles.splice(i, 1);
              continue;
            }
          }
          ob.x -= g.speed * dt;
          if (ob.x + ob.width < -10) {
            g.obstacles.splice(i, 1);
          }
        }

        // Bullet spawning from obstacles
        for (const ob of g.obstacles) {
          if (ob.destroyed) continue;
          ob.shotTimer -= dt;
          if (ob.shotTimer <= 0 && ob.x > CHAR_X + 150 && ob.x < CANVAS_W - 50) {
            const by = ob.kind === "mite" ? GROUND_Y - 40 : GROUND_Y - 95;
            const isNano = Math.random() < 0.5;
            g.bullets.push({ x: ob.x, y: by, w: BULLET_W, h: BULLET_H, kind: ob.kind, damage: isNano ? NANO_JAB_DAMAGE : BULLET_DAMAGE });
            ob.shotTimer = randomInt(BULLET_SHOT_MIN, BULLET_SHOT_MAX);
          }
        }

        // Move bullets & cull off-screen
        for (let i = g.bullets.length - 1; i >= 0; i--) {
          g.bullets[i].x -= BULLET_SPEED * dt;
          if (g.bullets[i].x + g.bullets[i].w < -10) {
            g.bullets.splice(i, 1);
          }
        }

        // Bullet collision with player
        {
          const bw = g.isDucking ? DUCK_DRAW_W : g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
          const bh = g.isDucking ? DUCK_DRAW_H : g.isPunching ? PUNCH_DRAW_H : CHAR_DRAW_H;
          const bcx = CHAR_X;
          const bcy = g.charY;
          const bpLeft = bcx + 40;
          const bpRight = bcx + bw - 40;
          const bpTop = bcy + 10;
          const bpBottom = bcy + bh - 6;
          for (let i = g.bullets.length - 1; i >= 0; i--) {
            const b = g.bullets[i];
            if (
              bpRight > b.x &&
              bpLeft < b.x + b.w &&
              bpBottom > b.y &&
              bpTop < b.y + b.h
            ) {
              g.health -= b.damage;
              g.bullets.splice(i, 1);
              g.damageFlash = 10;
              g.scorePopups.push({
                x: CHAR_X,
                y: g.charY - 10,
                text: `-${b.damage} HP`,
                life: 40,
                color: "#e74c3c",
              });
              if (g.health <= 0) {
                g.dead = true;
                g.playing = false;
                setGameState("dead");
                if (g.score > highScore) {
                  setHighScore(g.score);
                  localStorage.setItem("manny-hi", String(g.score));
                }
              }
            }
          }
        }

        // Health regen
        if (g.health < MAX_HEALTH) {
          g.health = Math.min(MAX_HEALTH, g.health + HEALTH_REGEN * dt);
        }

        // Punch hitbox — check if punch destroys any obstacle
        if (g.isPunching) {
          const punchReach = CHAR_X + PUNCH_DRAW_W;
          const punchTop = g.charY;
          const punchBottom = g.charY + PUNCH_DRAW_H;

          for (const ob of g.obstacles) {
            if (ob.destroyed || ob.passed) continue;

            let oLeft: number, oRight: number, oTop: number, oBottom: number;
            if (ob.kind === "aero") {
              oLeft = ob.x;
              oRight = ob.x + ob.width;
              oTop = GROUND_Y - 100;
              oBottom = GROUND_Y - 100 + ob.height;
            } else {
              oLeft = ob.x;
              oRight = ob.x + ob.width;
              oTop = GROUND_Y - ob.height;
              oBottom = GROUND_Y;
            }

            // Check if punch reaches the obstacle
            if (
              punchReach > oLeft &&
              CHAR_X < oRight &&
              punchBottom > oTop &&
              punchTop < oBottom
            ) {
              ob.destroyed = true;
              ob.destroyAnim = 0;
              ob.passed = true; // don't score again as dodge
              const punchPoints = ob.kind === "mite" ? 2 : ob.kind === "aero" ? 3 : 4;
              g.score += punchPoints;
              setScore(g.score);
              // Spawn particles
              spawnDestroyParticles(ob, g.particles);
              // Score popup
              g.scorePopups.push({
                x: ob.x,
                y: ob.kind === "aero" ? GROUND_Y - 100 - 10 : GROUND_Y - ob.height - 10,
                text: `+${punchPoints} PUNCH!`,
                life: 60,
                color: "#f39c12",
              });
            }
          }
        }

        // Coin spawning — less frequent, no overlap with obstacles
        g.nextCoinIn -= dt;
        if (g.nextCoinIn <= 0 && Math.random() < 0.08) {
          const coinX = CANVAS_W + 20;
          const overlapsObstacle = g.obstacles.some(
            (ob) => !ob.destroyed && coinX < ob.x + ob.width + 60 && coinX + COIN_W + 60 > ob.x
          );
          if (!overlapsObstacle) {
            const coinY = randomInt(GROUND_Y - 130, GROUND_Y - 30);
            g.coins.push({ x: coinX, y: coinY, collected: false });
          }
          g.nextCoinIn = randomInt(COIN_SPAWN_MIN, COIN_SPAWN_MAX);
        }

        // Move coins & collect
        for (let i = g.coins.length - 1; i >= 0; i--) {
          const c = g.coins[i];
          if (c.collected) { g.coins.splice(i, 1); continue; }
          c.x -= g.speed * dt;
          if (c.x + COIN_W < -10) { g.coins.splice(i, 1); continue; }
          // Collision with player hitbox
          const cw = g.isDucking ? DUCK_DRAW_W : g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
          const cH = g.isDucking ? DUCK_DRAW_H : g.isPunching ? PUNCH_DRAW_H : CHAR_DRAW_H;
          const cx = CHAR_X;
          const cy = g.charY;
          if (
            cx + cw > c.x &&
            cx < c.x + COIN_W &&
            cy + cH > c.y &&
            cy < c.y + COIN_H
          ) {
            c.collected = true;
            g.coinCount++;
            setCoinCount(g.coinCount);
          }
        }

        // Score for dodging (obstacle passed without being destroyed)
        for (const ob of g.obstacles) {
          if (!ob.passed && !ob.destroyed && ob.x + ob.width < CHAR_X) {
            ob.passed = true;
            g.score += DODGE_SCORE;
            setScore(g.score);
            // Score popup
            g.scorePopups.push({
              x: CHAR_X,
              y: g.charY - 10,
              text: `+${DODGE_SCORE}`,
              life: 40,
              color: "#2ecc71",
            });
          }
        }

        // Collision detection (skip destroyed obstacles)
        const charW = g.isDucking ? DUCK_DRAW_W : g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
        const charH = g.isDucking ? DUCK_DRAW_H : g.isPunching ? PUNCH_DRAW_H : CHAR_DRAW_H;
        const cx = CHAR_X;
        const cy = g.charY;

        // Shrink hitbox a bit for forgiveness
        const hbShrink = 40;
        const pLeft = cx + hbShrink;
        const pRight = cx + charW - hbShrink;
        const pTop = cy + hbShrink;
        const pBottom = cy + charH - hbShrink / 2;

        for (const ob of g.obstacles) {
          if (ob.destroyed) continue; // skip destroyed obstacles
          if (g.isDucking && ob.kind === "aero") continue; // duck under aero jelly

          let oLeft: number, oRight: number, oTop: number, oBottom: number;
          if (ob.kind === "aero") {
            // aero jelly floats
            oLeft = ob.x;
            oRight = ob.x + ob.width;
            oTop = GROUND_Y - 100;
            oBottom = GROUND_Y - 100 + ob.height;
          } else if (ob.kind === "hollow") {
            // hollow — shrunk hitbox 20px top/left/right
            oLeft = ob.x + 20;
            oRight = ob.x + ob.width - 20;
            oTop = GROUND_Y - ob.height + 20;
            oBottom = GROUND_Y;
          } else {
            // mite
            oLeft = ob.x;
            oRight = ob.x + ob.width;
            oTop = GROUND_Y - ob.height;
            oBottom = GROUND_Y;
          }

          if (
            pRight > oLeft &&
            pLeft < oRight &&
            pBottom > oTop &&
            pTop < oBottom
          ) {
            g.dead = true;
            g.playing = false;
            setGameState("dead");
            // save high-score
            if (g.score > highScore) {
              setHighScore(g.score);
              localStorage.setItem("manny-hi", String(g.score));
            }
            break;
          }
        }
      }

      /* ── update damage flash ── */
      if (g.damageFlash > 0) g.damageFlash -= dt;

      /* ── update particles ── */
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.3 * dt; // gravity on particles
        p.life -= dt;
        if (p.life <= 0) {
          g.particles.splice(i, 1);
        }
      }

      /* ── update score popups ── */
      for (let i = g.scorePopups.length - 1; i >= 0; i--) {
        g.scorePopups[i].y -= 1 * dt;
        g.scorePopups[i].life -= dt;
        if (g.scorePopups[i].life <= 0) {
          g.scorePopups.splice(i, 1);
        }
      }

      /* ── draw obstacles ── */
      for (const ob of g.obstacles) {
        if (ob.destroyed) {
          // Draw destruction effect — fading shattered pieces
          const fade = 1 - ob.destroyAnim / 20;
          ctx.globalAlpha = fade;
          ctx.save();
          continue; // particles handle the visual
        }

        const obstacleAnimFrame = Math.floor(g.frame / 10) % 2;
        if (ob.kind === "aero") {
          // Aero jelly — floating sprite
          if (aeroJellyImg.current) {
            const sx = obstacleAnimFrame * AERO_FW;
            const oY = GROUND_Y - 100;
            ctx.drawImage(
              aeroJellyImg.current,
              sx + 20, 20, AERO_FW - 40, AERO_FH - 20,
              ob.x, oY, ob.width, ob.height
            );
          }
        } else if (ob.kind === "hollow") {
          // Hollow man — ground sprite
          if (hollowImg.current) {
            const sx = obstacleAnimFrame * HOLLOW_FW;
            const oY = GROUND_Y - ob.height;
            ctx.drawImage(
              hollowImg.current,
              sx + 20, 20, HOLLOW_FW - 40, HOLLOW_FH - 20,
              ob.x, oY, ob.width, ob.height
            );
          }
        } else {
          // Mite — smaller ground sprite
          if (miteImg.current) {
            const sx = obstacleAnimFrame * MITE_FW;
            const oY = GROUND_Y - ob.height;
            ctx.drawImage(
              miteImg.current,
              sx + 20, 20, MITE_FW - 40, MITE_FH - 20,
              ob.x, oY, ob.width, ob.height
            );
          }
        }
      }
      ctx.globalAlpha = 1;

      /* ── draw bullets ── */
      for (const b of g.bullets) {
        const img = b.damage === NANO_JAB_DAMAGE ? nanoImg.current : bulletImg.current;
        if (img) {
          ctx.drawImage(img, b.x, b.y, b.w, b.h);
        }
      }

      /* ── draw coins ── */
      if (coinImg.current) {
        for (const c of g.coins) {
          if (c.collected) continue;
          ctx.drawImage(coinImg.current, c.x, c.y, COIN_W, COIN_H);
        }
      }

      /* ── draw particles ── */
      for (const p of g.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* ── draw score popups ── */
      for (const popup of g.scorePopups) {
        const alpha = popup.life / 60;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = popup.color;
        ctx.font = "bold 14px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText(popup.text, popup.x, popup.y);
      }
      ctx.globalAlpha = 1;

      /* ── draw character ── */
      if (g.playing && !g.dead) {
        if (g.isPunching) {
          // Punching animation
          if (punchImg.current) {
            const sx = g.punchAnimFrame * PUNCH_FW;
            ctx.drawImage(
              punchImg.current,
              sx + SPRITE_CROP, SPRITE_CROP, PUNCH_FW - SPRITE_CROP * 2, PUNCH_FH - SPRITE_CROP * 2,
              CHAR_X, g.charY, PUNCH_DRAW_W, PUNCH_DRAW_H
            );
          }
          // Draw a punch impact effect when mid-punch
          if (g.punchTimer < PUNCH_DURATION - 4 && g.punchTimer > 4) {
            const impactX = CHAR_X + PUNCH_DRAW_W - 5;
            const impactY = g.charY + PUNCH_DRAW_H / 2;
            ctx.strokeStyle = "rgba(255, 200, 50, 0.6)";
            ctx.lineWidth = 2;
            // Impact lines
            for (let i = 0; i < 4; i++) {
              const angle = (Math.PI / 4) * i - Math.PI / 4;
              const len = 8 + Math.random() * 8;
              ctx.beginPath();
              ctx.moveTo(impactX, impactY);
              ctx.lineTo(
                impactX + Math.cos(angle) * len,
                impactY + Math.sin(angle) * len
              );
              ctx.stroke();
            }
          }
        } else if (g.isDucking) {
          // Ducking animation using duck sprite sheet (cropped, not squished)
          if (duckImg.current) {
            const sx = g.duckAnimFrame * DUCK_FW;
            const cropRatio = DUCK_DRAW_H / 100; // 0.6
            const sy = DUCK_FH * (1 - cropRatio);
            const sh = DUCK_FH * cropRatio;
            ctx.drawImage(
              duckImg.current,
              sx + SPRITE_CROP, sy + SPRITE_CROP, DUCK_FW - SPRITE_CROP * 2, sh - SPRITE_CROP * 2,
              CHAR_X, g.charY, DUCK_DRAW_W, DUCK_DRAW_H
            );
          }
          } else if (g.isJumping) {
          // Jumping animation - use running sprite
          if (runImg.current) {
            const sx = g.animFrame * RUN_FW;
            ctx.drawImage(
              runImg.current,
              sx + SPRITE_CROP, SPRITE_CROP, RUN_FW - SPRITE_CROP * 2, RUN_FH - SPRITE_CROP * 2,
              CHAR_X, g.charY, CHAR_DRAW_W, CHAR_DRAW_H
            );
          }
        } else {
          // Running animation
          if (runImg.current) {
            const sx = g.animFrame * RUN_FW;
            ctx.drawImage(
              runImg.current,
              sx + SPRITE_CROP, SPRITE_CROP, RUN_FW - SPRITE_CROP * 2, RUN_FH - SPRITE_CROP * 2,
              CHAR_X, g.charY, CHAR_DRAW_W, CHAR_DRAW_H
            );
          }
        }
      } else {
        // Idle animation
        if (idleImg.current) {
          const idleAnimFrame =
            Math.floor(Date.now() / 200) % IDLE_FRAMES;
          const sx = idleAnimFrame * IDLE_FW;
          ctx.drawImage(
            idleImg.current,
            sx + SPRITE_CROP, SPRITE_CROP, IDLE_FW - SPRITE_CROP * 2, IDLE_FH - SPRITE_CROP * 2,
            CHAR_X, GROUND_Y - CHAR_DRAW_H, CHAR_DRAW_W, CHAR_DRAW_H
          );
        }
      }

      /* ── HUD overlay on canvas ── */
      // Score
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(CANVAS_W - 220, 8, 210, 40);
      ctx.strokeStyle = "rgba(255,180,50,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(CANVAS_W - 220, 8, 210, 40);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`SCORE: ${String(g.score).padStart(5, "0")}`, CANVAS_W - 20, 34);

      // Coins
      ctx.fillStyle = "rgba(255,215,0,0.8)";
      ctx.font = "bold 10px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`◎ ${g.coinCount}`, 12, 56);

      // Health bar
      const hpPct = Math.max(0, g.health / MAX_HEALTH);
      const hpBarW = 80;
      const hpBarH = 8;
      const hpX = 12;
      const hpY = 66;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
      ctx.fillStyle = hpPct > 0.5 ? "#2ecc71" : hpPct > 0.25 ? "#f39c12" : "#e74c3c";
      ctx.fillRect(hpX, hpY, hpBarW * hpPct, hpBarH);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);

      // Health text
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 7px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`HP ${Math.ceil(g.health)}/${MAX_HEALTH}`, hpX + hpBarW + 8, hpY + 7);

      // Damage flash overlay
      if (g.damageFlash > 0) {
        const flashAlpha = (g.damageFlash / 10) * 0.25;
        ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Punch indicator
      if (g.playing && !g.dead) {
        ctx.fillStyle = g.isPunching
          ? "rgba(243,156,18,0.8)"
          : g.coinCount > 0
            ? "rgba(255,255,255,0.3)"
            : "rgba(255,50,50,0.3)";
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textAlign = "left";
        const punchText = g.isPunching
          ? "🥊 PUNCH!"
          : g.coinCount > 0
            ? "🥊 Ready"
            : "✕ No Coin!";
        ctx.fillText(punchText, 12, 20);
      }

      // Speed indicator (subtle)
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SPD ${g.speed.toFixed(1)}`, 12, 36);

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [highScore]);

  /* ── start / restart on key press ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (gameState === "idle" || gameState === "dead") {
        e.preventDefault();
        resetGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, resetGame]);

  return (
    <div
      style={{
        minHeight: isFullscreen ? "100vh" : "100vh",
        height: isFullscreen ? "100vh" : "auto",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isFullscreen ? "flex-start" : "center",
        fontFamily: "'Press Start 2P', monospace",
        overflow: isFullscreen ? "hidden" : "hidden",
        position: "relative",
        margin: 0,
        padding: isFullscreen ? 0 : undefined,
      }}
    >
      {/* Portrait lock overlay */}
      {isPortrait && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0f0f1a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "'Press Start 2P', monospace",
            textAlign: "center",
            padding: "20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "24px", animation: "pulse 1s ease-in-out infinite" }}>
            📱↻
          </div>
          <div style={{ fontSize: "14px", color: "#f39c12", marginBottom: "12px" }}>
            ROTATE YOUR DEVICE
          </div>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", lineHeight: "1.8" }}>
            Please rotate to landscape mode<br />to play the game
          </div>
          <button
            onClick={toggleFullscreen}
            style={{
              marginTop: "24px",
              padding: "10px 24px",
              fontSize: "10px",
              fontFamily: "'Press Start 2P', monospace",
              background: "#f39c12",
              color: "#0f0f1a",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            FULLSCREEN
          </button>
        </div>
      )}

      {/* Animated background particles */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {bgParticles}
      </div>

      {/* Title */}
      <h1
        style={{
          display: isFullscreen ? "none" : "block",
          fontSize: "28px",
          fontWeight: 900,
          color: "transparent",
          background: "linear-gradient(90deg, #f39c12, #e74c3c, #f39c12)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          letterSpacing: "3px",
          marginBottom: "8px",
          textShadow: "none",
          filter: "drop-shadow(0 0 20px rgba(243, 156, 18, 0.3))",
          textAlign: "center",
        }}
      >
        MANNY OBSTACLE RUN
      </h1>

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        style={{
          display: isFullscreen ? "none" : "block",
          position: "absolute",
          top: "12px",
          right: "12px",
          padding: "6px 12px",
          fontSize: "9px",
          fontFamily: "'Press Start 2P', monospace",
          background: isFullscreen ? "rgba(255,255,255,0.1)" : "rgba(243,156,18,0.2)",
          color: isFullscreen ? "rgba(255,255,255,0.4)" : "#f39c12",
          border: `1px solid ${isFullscreen ? "rgba(255,255,255,0.15)" : "rgba(243,156,18,0.3)"}`,
          borderRadius: "6px",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        {isFullscreen ? "✕ EXIT" : "⛶ FULL"}
      </button>

      {/* Subtitle */}
      <p
        style={{
          display: isFullscreen ? "none" : "block",
          color: "rgba(255,255,255,0.4)",
          fontSize: "10px",
          letterSpacing: "4px",
          marginBottom: "20px",
          textTransform: "uppercase",
        }}
      >
        Dodge • Jump • Punch • Survive
      </p>

      {/* Canvas wrapper with glow */}
      <div
        style={{
          position: "relative",
          borderRadius: isFullscreen ? "0px" : "12px",
          padding: isFullscreen ? "0px" : "3px",
          background: isFullscreen ? "#000" : "linear-gradient(135deg, rgba(243,156,18,0.4), rgba(231,76,60,0.4))",
          boxShadow: isFullscreen ? "none" : "0 0 40px rgba(243,156,18,0.15), 0 20px 60px rgba(0,0,0,0.5)",
          width: isFullscreen ? "100vw" : undefined,
          height: isFullscreen ? "100vh" : undefined,
          display: isFullscreen ? "flex" : undefined,
          alignItems: isFullscreen ? "center" : undefined,
          justifyContent: isFullscreen ? "center" : undefined,
        }}
        onTouchStart={() => {
          if (gameState === "idle" || gameState === "dead") {
            resetGame();
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: "block",
            width: isFullscreen ? "100%" : undefined,
            height: isFullscreen ? "100%" : undefined,
            objectFit: isFullscreen ? "contain" : undefined,
            borderRadius: isFullscreen ? "0px" : "10px",
            background: "#1a1a2e",
            imageRendering: "pixelated",
            cursor: "crosshair",
          }}
        />

        {/* Overlay states */}
        {gameState === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "10px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#f39c12",
                marginBottom: "16px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              ▲ PRESS ANY KEY TO START ▲
            </div>
            <div
              style={{
                display: "flex",
                gap: "16px",
                fontSize: "9px",
                color: "rgba(255,255,255,0.5)",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span>⬆ / W — Jump</span>
              <span>⬇ / S — Duck</span>
              <span>➡ / D / Click — Punch</span>
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "8px",
                color: "rgba(255,255,255,0.3)",
                textAlign: "center",
                lineHeight: "1.8",
              }}
            >
              Dodge obstacles for +{DODGE_SCORE} pt<br />
              Punch: Mite +2 &bull; Jelly +3 &bull; Hollow +4<br />
              Crystal bullet -50 HP &bull; Nano Jab -25 HP &bull; Health regens
            </div>
          </div>
        )}

        {gameState === "dead" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(180,20,20,0.35)",
              borderRadius: "10px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ fontSize: "22px", color: "#fff", marginBottom: "8px" }}>
              GAME OVER
            </div>
            <div style={{ fontSize: "12px", color: "#f39c12", marginBottom: "6px" }}>
              SCORE: {score}
            </div>
            {score >= highScore && score > 0 && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#2ecc71",
                  marginBottom: "8px",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              >
                ★ NEW HIGH SCORE! ★
              </div>
            )}
            <div
              style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.6)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              PRESS ANY KEY TO RETRY
            </div>
          </div>
        )}

        {/* Mobile touch controls */}
        {isTouchDevice && (
          <>
            {/* Punch button - left side */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["d"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["d"] = false; }}
              style={{
                position: "absolute",
                left: "8px",
                bottom: "12px",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "2px solid rgba(243,156,18,0.5)",
                background: "rgba(243,156,18,0.2)",
                color: "#f39c12",
                fontSize: "22px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(4px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
              }}
            >
              P
            </button>

            {/* Jump button - right side top */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["arrowup"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["arrowup"] = false; }}
              style={{
                position: "absolute",
                right: "12px",
                bottom: "84px",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "2px solid rgba(46,204,113,0.5)",
                background: "rgba(46,204,113,0.2)",
                color: "#2ecc71",
                fontSize: "22px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(4px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
              }}
            >
              ▲
            </button>

            {/* Duck button - right side bottom */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["arrowdown"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["arrowdown"] = false; }}
              style={{
                position: "absolute",
                right: "12px",
                bottom: "12px",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "2px solid rgba(52,152,219,0.5)",
                background: "rgba(52,152,219,0.2)",
                color: "#3498db",
                fontSize: "22px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(4px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
              }}
            >
              ▼
            </button>
          </>
        )}
      </div>

      {/* Score bar */}
      <div
        style={{
          display: isFullscreen ? "none" : "flex",
          gap: "40px",
          marginTop: "20px",
          padding: "12px 32px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginBottom: "4px", letterSpacing: "2px" }}>
            SCORE
          </div>
          <div style={{ fontSize: "18px", color: "#f39c12" }}>{score}</div>
        </div>
        <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginBottom: "4px", letterSpacing: "2px" }}>
            HIGH SCORE
          </div>
          <div style={{ fontSize: "18px", color: "#2ecc71" }}>{highScore}</div>
        </div>
        <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginBottom: "4px", letterSpacing: "2px" }}>
            COINS
          </div>
          <div style={{ fontSize: "18px", color: "#ffd700" }}>◎ {coinCount}</div>
        </div>
      </div>

      {/* Scoring Guide */}
      <div
        style={{
          display: isFullscreen ? "none" : "flex",
          marginTop: "16px",
          gap: "24px",
          fontSize: "9px",
          color: "rgba(255,255,255,0.5)",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "10px", color: "#f39c12", letterSpacing: "2px", width: "100%", textAlign: "center", marginBottom: "4px" }}>
          ── SCORING & BULLETS ──
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={aeroPreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Aero-Jelly <span style={{ color: "#f39c12" }}>+3</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={hollowPreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Hollow Stalker <span style={{ color: "#f39c12" }}>+4</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={mitePreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Scrap-Mite <span style={{ color: "#f39c12" }}>+2</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={bulletPreviewRef} width={36} height={12} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Crystal <span style={{ color: "#e74c3c" }}>-50 HP</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={nanoPreviewRef} width={36} height={12} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Nano Jab <span style={{ color: "#e67e22" }}>-25 HP</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
          <canvas ref={coinPreviewRef} width={20} height={20} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#1a1a2e" }} />
          <span>Coin = <span style={{ color: "#ffd700" }}>1 Punch</span></span>
        </div>
      </div>

      <div
        style={{
          display: isFullscreen ? "none" : "block",
          marginTop: "8px",
          fontSize: "8px",
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
          lineHeight: "1.8",
        }}
      >
        Duck / Jump to dodge (+1) &bull; Punch costs 1 coin (+2-4 pts) &bull; Crystal -50 HP &bull; Nano Jab -25 HP &bull; Health regens &bull; ◎ = 1 punch
      </div>

      {/* Global CSS for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.1; }
        }

        /* Hide scrollbar */
        body { overflow: hidden; margin: 0; }
      `}</style>
    </div>
  );
}
