"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ───────── sprite geometry ───────── */
const IDLE_FW = 512;
const IDLE_FH = 512;

const RUN_FRAMES = 6;
const RUN_SHEET_W = 1536;
const RUN_SHEET_H = 256;
const RUN_FW = RUN_SHEET_W / RUN_FRAMES; // 256
const RUN_FH = RUN_SHEET_H;              // 256

const DUCK_FW = 512;
const DUCK_FH = 512;

const JUMP_FW = 512;
const JUMP_FH = 512;

const PUNCH_FRAMES = 4;
const PUNCH_SHEET_W = 1024;
const PUNCH_SHEET_H = 256;
const PUNCH_FW = PUNCH_SHEET_W / PUNCH_FRAMES; // 256
const PUNCH_FH = PUNCH_SHEET_H;                // 256

const AERO_FRAMES = 2;
const AERO_SHEET_W = 486;
const AERO_SHEET_H = 256;
const AERO_FW = AERO_SHEET_W / AERO_FRAMES; // 243
const AERO_FH = AERO_SHEET_H;              // 256
const AERO_DRAW_W = 75;
const AERO_DRAW_H = 75;

const HOLLOW_FRAMES = 2;
const HOLLOW_SHEET_W = 522;
const HOLLOW_SHEET_H = 256;
const HOLLOW_FW = HOLLOW_SHEET_W / HOLLOW_FRAMES; // 261
const HOLLOW_FH = HOLLOW_SHEET_H;                // 256
const HOLLOW_DRAW_W = 100;
const HOLLOW_DRAW_H = 100;

const MITE_FRAMES = 2;
const MITE_SHEET_W = 512;
const MITE_SHEET_H = 256;
const MITE_FW = MITE_SHEET_W / MITE_FRAMES; // 256
const MITE_FH = MITE_SHEET_H;              // 256
const MITE_DRAW_W = 55;
const MITE_DRAW_H = 55;

/* ───────── game constants ───────── */
const CANVAS_W = 900;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 60;            // ground line
const CHAR_DRAW_H = 100;                   // normal rendered height
const CHAR_DRAW_W = 100;                   // normal rendered width
const PUNCH_DRAW_H = 100;                  // punch height
const PUNCH_DRAW_W = 115;                  // punch rendered width
const CHAR_X = 80;                         // character x position

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

const BULLET_W = 40;
const BULLET_H = 14;
const BULLET_SPEED = 7;
const BULLET_SHOT_MIN = 80;                // min frames between shots
const BULLET_SHOT_MAX = 200;               // max frames between shots
const NANO_JAB_DAMAGE = 25;

const COIN_W = 28;
const COIN_H = 28;
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
    aero: { width: AERO_DRAW_W, height: AERO_DRAW_H },
    hollow: { width: HOLLOW_DRAW_W, height: HOLLOW_DRAW_H },
    mite: { width: MITE_DRAW_W, height: MITE_DRAW_H },
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
  const colors = ["#00ff87", "#2ed573", "#00e5ff", "#38ef7d", "#ffffff", "#00F59B"];
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * ob.width,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 6 - 2,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function getRunnerRank(score: number): { rank: string; color: string } {
  if (score >= 200) return { rank: "BLOCK FUEL OVERLORD", color: "#00ff87" };
  if (score >= 100) return { rank: "NEON VANGUARD", color: "#00e5ff" };
  if (score >= 50) return { rank: "CYBER STRIKER", color: "#38ef7d" };
  if (score >= 20) return { rank: "GRID RUNNER", color: "#ffd700" };
  return { rank: "RECRUIT OPERATOR", color: "#709ca6" };
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function BlockFuelPunchAndRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgParticles, setBgParticles] = useState<React.ReactNode[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        try { await (screen.orientation as any)?.lock?.("landscape"); } catch { }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  }, []);

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setBgParticles(
      Array.from({ length: 35 }).map((_, i) => {
        const isCyan = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: `${2 + Math.random() * 3.5}px`,
              height: `${2 + Math.random() * 3.5}px`,
              background: isCyan
                ? `rgba(0, 229, 255, ${0.15 + Math.random() * 0.3})`
                : `rgba(0, 255, 135, ${0.15 + Math.random() * 0.35})`,
              boxShadow: isCyan
                ? `0 0 6px rgba(0, 229, 255, 0.4)`
                : `0 0 6px rgba(0, 255, 135, 0.5)`,
              borderRadius: "50%",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `fuelFloat ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        );
      })
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

  // Mutable game state
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
    animFrame: 0,
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
    scorePopups: [] as { x: number; y: number; text: string; life: number; color: string }[],
  });

  // Key state
  const keys = useRef<Record<string, boolean>>({});

  /* ── load images once ── */
  const idleImg = useRef<HTMLImageElement | null>(null);
  const readyImg = useRef<HTMLImageElement | null>(null);
  const runImg = useRef<HTMLImageElement | null>(null);
  const bgImg = useRef<HTMLImageElement | null>(null);
  const duckImg = useRef<HTMLImageElement | null>(null);
  const punchImg = useRef<HTMLImageElement | null>(null);
  const jumpImg = useRef<HTMLImageElement | null>(null);
  const aeroJellyImg = useRef<HTMLImageElement | null>(null);
  const hollowImg = useRef<HTMLImageElement | null>(null);
  const miteImg = useRef<HTMLImageElement | null>(null);
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
    const loadImage = (src: string, ref: React.MutableRefObject<HTMLImageElement | null>) => {
      const img = new Image();
      img.src = src;
      ref.current = img;
    };

    loadImage("/New%20folder/idle.png", idleImg);
    loadImage("/New%20folder/ready.png", readyImg);
    loadImage("/New%20folder/run.png", runImg);
    loadImage("/New%20folder/duck.png", duckImg);
    loadImage("/New%20folder/punch.png", punchImg);
    loadImage("/New%20folder/jump.png", jumpImg);

    loadImage("/aero-jelly.png", aeroJellyImg);
    loadImage("/hollow.png", hollowImg);
    loadImage("/mite.png", miteImg);

    bgImg.current = new Image();
    bgImg.current.src = "/bg.png";

    bulletImg.current = new Image();
    bulletImg.current.src = "/crystal%20bullet.png";

    nanoImg.current = new Image();
    nanoImg.current.src = "/bullet.png";

    coinImg.current = new Image();
    coinImg.current.src = "/coin.png";

    // Load high-score from localStorage
    const saved = localStorage.getItem("block-fuel-hi") || localStorage.getItem("manny-hi");
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
        cx.clearRect(0, 0, c.width, c.height);
        if (j.fw > 0) {
          cx.drawImage(j.img, 0, 0, j.fw, j.fh, 0, 0, c.width, c.height);
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
      const k = e.key.toLowerCase();
      if (k === "f") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      keys.current[k] = true;
      if (["arrowup", "arrowdown", " "].includes(k)) {
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
  }, [toggleFullscreen]);

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

      // Delta-time normalization
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
        ctx.fillStyle = "#0a1418";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      /* ── draw custom cyber walkway ── */
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      groundGrad.addColorStop(0, "rgba(10, 24, 28, 0.95)");
      groundGrad.addColorStop(0.3, "rgba(7, 16, 19, 0.98)");
      groundGrad.addColorStop(1, "rgba(4, 9, 11, 1)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      // Glowing cybernetic neon green/teal curb line
      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 135, 0.85)";
      ctx.shadowColor = "rgba(0, 255, 135, 0.7)";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      // Secondary faint cyan reflection line
      ctx.strokeStyle = "rgba(0, 229, 255, 0.35)";
      ctx.shadowColor = "rgba(0, 229, 255, 0.4)";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 5);
      ctx.lineTo(CANVAS_W, GROUND_Y + 5);
      ctx.stroke();
      ctx.restore();

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

        // Duck
        g.isDucking =
          (keys.current["arrowdown"] || keys.current["s"]) && !g.isJumping && !g.isPunching;

        // Punch (D key or Right arrow — costs 1 coin)
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

        // Gravity
        g.velY += GRAVITY * dt;
        g.charY += g.velY * dt;

        const standY = GROUND_Y - CHAR_DRAW_H;

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
            ob.destroyAnim += dt;
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

        // Bullets from obstacles
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

        // Move bullets
        for (let i = g.bullets.length - 1; i >= 0; i--) {
          g.bullets[i].x -= BULLET_SPEED * dt;
          if (g.bullets[i].x + g.bullets[i].w < -10) {
            g.bullets.splice(i, 1);
          }
        }

        // Bullet collision
        {
          const bw = g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
          const bh = CHAR_DRAW_H;
          const bcx = CHAR_X;
          const bcy = g.charY;
          const bpLeft = bcx + 35;
          const bpRight = bcx + bw - 35;
          const bpTop = g.isDucking ? bcy + 45 : bcy + 10;
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
                x: CHAR_X + 40,
                y: g.charY - 10,
                text: `-${b.damage} HP`,
                life: 40,
                color: "#ff3838",
              });
              if (g.health <= 0) {
                g.dead = true;
                g.playing = false;
                setGameState("dead");
                if (g.score > highScore) {
                  setHighScore(g.score);
                  localStorage.setItem("block-fuel-hi", String(g.score));
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

        // Punch hitbox
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

            if (
              punchReach > oLeft &&
              CHAR_X < oRight &&
              punchBottom > oTop &&
              punchTop < oBottom
            ) {
              ob.destroyed = true;
              ob.destroyAnim = 0;
              ob.passed = true;
              const punchPoints = ob.kind === "mite" ? 2 : ob.kind === "aero" ? 3 : 4;
              g.score += punchPoints;
              setScore(g.score);
              spawnDestroyParticles(ob, g.particles);
              g.scorePopups.push({
                x: ob.x + 30,
                y: ob.kind === "aero" ? GROUND_Y - 100 - 10 : GROUND_Y - ob.height - 10,
                text: `+${punchPoints} SMASH!`,
                life: 60,
                color: "#00ff87",
              });
            }
          }
        }

        // Coin spawning
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

        // Move coins
        for (let i = g.coins.length - 1; i >= 0; i--) {
          const c = g.coins[i];
          if (c.collected) { g.coins.splice(i, 1); continue; }
          c.x -= g.speed * dt;
          if (c.x + COIN_W < -10) { g.coins.splice(i, 1); continue; }
          const cw = g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
          const cH = CHAR_DRAW_H;
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
            g.scorePopups.push({
              x: c.x,
              y: c.y - 15,
              text: `+1 FUEL`,
              life: 35,
              color: "#ffd700",
            });
          }
        }

        // Score for dodging
        for (const ob of g.obstacles) {
          if (!ob.passed && !ob.destroyed && ob.x + ob.width < CHAR_X) {
            ob.passed = true;
            g.score += DODGE_SCORE;
            setScore(g.score);
            g.scorePopups.push({
              x: CHAR_X + 20,
              y: g.charY - 10,
              text: `+${DODGE_SCORE}`,
              life: 40,
              color: "#00e5ff",
            });
          }
        }

        // Obstacle collision detection
        const charW = g.isPunching ? PUNCH_DRAW_W : CHAR_DRAW_W;
        const charH = CHAR_DRAW_H;
        const cx = CHAR_X;
        const cy = g.charY;
        const hbShrink = 35;
        const pLeft = cx + hbShrink;
        const pRight = cx + charW - hbShrink;
        const pTop = g.isDucking ? cy + 45 : cy + hbShrink;
        const pBottom = cy + charH - hbShrink / 2;

        for (const ob of g.obstacles) {
          if (ob.destroyed) continue;
          if (g.isDucking && ob.kind === "aero") continue;

          let oLeft: number, oRight: number, oTop: number, oBottom: number;
          if (ob.kind === "aero") {
            oLeft = ob.x;
            oRight = ob.x + ob.width;
            oTop = GROUND_Y - 100;
            oBottom = GROUND_Y - 100 + ob.height;
          } else if (ob.kind === "hollow") {
            oLeft = ob.x + 20;
            oRight = ob.x + ob.width - 20;
            oTop = GROUND_Y - ob.height + 20;
            oBottom = GROUND_Y;
          } else {
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
            if (g.score > highScore) {
              setHighScore(g.score);
              localStorage.setItem("block-fuel-hi", String(g.score));
              localStorage.setItem("manny-hi", String(g.score));
            }
            break;
          }
        }
      }

      if (g.damageFlash > 0) g.damageFlash -= dt;

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.3 * dt;
        p.life -= dt;
        if (p.life <= 0) {
          g.particles.splice(i, 1);
        }
      }

      // Update score popups
      for (let i = g.scorePopups.length - 1; i >= 0; i--) {
        g.scorePopups[i].y -= 1 * dt;
        g.scorePopups[i].life -= dt;
        if (g.scorePopups[i].life <= 0) {
          g.scorePopups.splice(i, 1);
        }
      }

      /* ── draw obstacles ── */
      for (const ob of g.obstacles) {
        if (ob.destroyed) continue;

        const obstacleAnimFrame = Math.floor(g.frame / 10) % 2;
        if (ob.kind === "aero") {
          if (aeroJellyImg.current) {
            const sx = obstacleAnimFrame * AERO_FW;
            const oY = GROUND_Y - 100;
            ctx.drawImage(
              aeroJellyImg.current,
              sx, 0, AERO_FW, AERO_FH,
              ob.x, oY, ob.width, ob.height
            );
          }
        } else if (ob.kind === "hollow") {
          if (hollowImg.current) {
            const sx = obstacleAnimFrame * HOLLOW_FW;
            const oY = GROUND_Y - ob.height;
            ctx.drawImage(
              hollowImg.current,
              sx, 0, HOLLOW_FW, HOLLOW_FH,
              ob.x, oY, ob.width, ob.height
            );
          }
        } else {
          if (miteImg.current) {
            const sx = obstacleAnimFrame * MITE_FW;
            const oY = GROUND_Y - ob.height;
            ctx.drawImage(
              miteImg.current,
              sx, 0, MITE_FW, MITE_FH,
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
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      /* ── draw score popups ── */
      for (const popup of g.scorePopups) {
        const alpha = popup.life / 60;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = popup.color;
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      /* ── draw character ── */
      if (g.playing && !g.dead) {
        if (g.isPunching) {
          if (punchImg.current && punchImg.current.complete) {
            const sx = g.punchAnimFrame * PUNCH_FW;
            ctx.drawImage(
              punchImg.current,
              sx, 0, PUNCH_FW, PUNCH_FH,
              CHAR_X, g.charY, PUNCH_DRAW_W, PUNCH_DRAW_H
            );
          }
          // Punch impact spark
          if (g.punchTimer < PUNCH_DURATION - 3 && g.punchTimer > 3) {
            const impactX = CHAR_X + PUNCH_DRAW_W - 5;
            const impactY = g.charY + PUNCH_DRAW_H / 2;
            ctx.strokeStyle = "rgba(0, 255, 135, 0.85)";
            ctx.shadowColor = "rgba(0, 255, 135, 0.9)";
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 5; i++) {
              const angle = (Math.PI / 4) * i - Math.PI / 4;
              const len = 10 + Math.random() * 10;
              ctx.beginPath();
              ctx.moveTo(impactX, impactY);
              ctx.lineTo(
                impactX + Math.cos(angle) * len,
                impactY + Math.sin(angle) * len
              );
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
          }
        } else if (g.isDucking) {
          if (duckImg.current && duckImg.current.complete) {
            ctx.drawImage(
              duckImg.current,
              0, 0, DUCK_FW, DUCK_FH,
              CHAR_X, g.charY, CHAR_DRAW_W, CHAR_DRAW_H
            );
          }
        } else if (g.isJumping) {
          if (jumpImg.current && jumpImg.current.complete) {
            ctx.drawImage(
              jumpImg.current,
              0, 0, JUMP_FW, JUMP_FH,
              CHAR_X, g.charY, CHAR_DRAW_W, CHAR_DRAW_H
            );
          }
        } else {
          if (runImg.current && runImg.current.complete) {
            const sx = g.animFrame * RUN_FW;
            ctx.drawImage(
              runImg.current,
              sx, 0, RUN_FW, RUN_FH,
              CHAR_X, g.charY, CHAR_DRAW_W, CHAR_DRAW_H
            );
          }
        }
      } else {
        // Idle animation
        const idleAnimFrame = Math.floor(Date.now() / 400) % 2;
        const currentIdleImg = idleAnimFrame === 0 ? idleImg.current : readyImg.current;
        if (currentIdleImg && currentIdleImg.complete) {
          ctx.drawImage(
            currentIdleImg,
            0, 0, IDLE_FW, IDLE_FH,
            CHAR_X, GROUND_Y - CHAR_DRAW_H, CHAR_DRAW_W, CHAR_DRAW_H
          );
        }
      }

      /* ── HUD OVERLAY ON CANVAS (BLOCK FUEL CYBERPUNK HUD) ── */
      // Score badge - Top Right
      ctx.save();
      const scoreBoxW = 210;
      const scoreBoxH = 38;
      const scoreBoxX = CANVAS_W - scoreBoxW - 12;
      const scoreBoxY = 10;
      ctx.fillStyle = "rgba(6, 15, 19, 0.85)";
      ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);
      ctx.strokeStyle = "rgba(0, 255, 135, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

      // Score corner accents
      ctx.fillStyle = "#00ff87";
      ctx.fillRect(scoreBoxX, scoreBoxY, 4, 4);
      ctx.fillRect(scoreBoxX + scoreBoxW - 4, scoreBoxY, 4, 4);
      ctx.fillRect(scoreBoxX, scoreBoxY + scoreBoxH - 4, 4, 4);
      ctx.fillRect(scoreBoxX + scoreBoxW - 4, scoreBoxY + scoreBoxH - 4, 4, 4);

      ctx.fillStyle = "#00ff87";
      ctx.shadowColor = "rgba(0, 255, 135, 0.7)";
      ctx.shadowBlur = 6;
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`SCORE: ${String(g.score).padStart(5, "0")}`, scoreBoxX + scoreBoxW - 12, scoreBoxY + 24);
      ctx.restore();

      // Top Left HUD Panel
      ctx.save();
      // Fuel Cells / Coins counter
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
      ctx.shadowBlur = 6;
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`⚡ FUEL: ${g.coinCount}`, 14, 52);
      ctx.shadowBlur = 0;

      // Health Reactor Bar
      const hpPct = Math.max(0, g.health / MAX_HEALTH);
      const hpBarW = 90;
      const hpBarH = 9;
      const hpX = 14;
      const hpY = 62;
      ctx.fillStyle = "rgba(6, 15, 19, 0.85)";
      ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
      
      const hpGrad = ctx.createLinearGradient(hpX, 0, hpX + hpBarW, 0);
      if (hpPct > 0.5) {
        hpGrad.addColorStop(0, "#00ff87");
        hpGrad.addColorStop(1, "#2ed573");
      } else if (hpPct > 0.25) {
        hpGrad.addColorStop(0, "#ffb142");
        hpGrad.addColorStop(1, "#e67e22");
      } else {
        hpGrad.addColorStop(0, "#ff3838");
        hpGrad.addColorStop(1, "#ff5252");
      }
      ctx.fillStyle = hpGrad;
      ctx.fillRect(hpX, hpY, hpBarW * hpPct, hpBarH);
      ctx.strokeStyle = "rgba(0, 255, 135, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);

      // HP text
      ctx.fillStyle = hpPct > 0.25 ? "rgba(224, 242, 241, 0.85)" : "#ff3838";
      ctx.font = "bold 8px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`HP ${Math.ceil(g.health)}%`, hpX + hpBarW + 8, hpY + 8);

      // Punch status indicator
      if (g.playing && !g.dead) {
        let punchText = "🥊 READY [1 FUEL]";
        let pColor = "#00ff87";
        if (g.isPunching) {
          punchText = "⚡ PUNCH STRIKE!";
          pColor = "#ffd700";
        } else if (g.coinCount === 0) {
          punchText = "✕ NO FUEL CELL";
          pColor = "#ff7979";
        }
        ctx.fillStyle = pColor;
        ctx.shadowColor = pColor;
        ctx.shadowBlur = 6;
        ctx.font = "bold 9px 'Press Start 2P', monospace";
        ctx.textAlign = "left";
        ctx.fillText(punchText, 14, 20);
        ctx.shadowBlur = 0;
      }

      // Speed indicator
      ctx.fillStyle = "rgba(0, 229, 255, 0.75)";
      ctx.font = "9px 'Press Start 2P', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SPD ${(g.speed / OBSTACLE_SPEED_INITIAL).toFixed(1)}x`, 14, 35);
      ctx.restore();

      // Damage Flash
      if (g.damageFlash > 0) {
        const flashAlpha = (g.damageFlash / 10) * 0.35;
        ctx.fillStyle = `rgba(255, 30, 30, ${flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [highScore]);

  /* ── start / restart on key press ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        return;
      }
      if (gameState === "idle" || gameState === "dead") {
        e.preventDefault();
        resetGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, resetGame]);

  const runnerRank = getRunnerRank(score);

  return (
    <div
      className="cyber-grid-bg"
      style={{
        minHeight: "100vh",
        height: isFullscreen ? "100vh" : "auto",
        background: "linear-gradient(145deg, #050b0e 0%, #0a1418 50%, #071013 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isFullscreen ? "flex-start" : "center",
        fontFamily: "'Press Start 2P', monospace",
        overflow: "hidden",
        position: "relative",
        margin: 0,
        padding: isFullscreen ? 0 : "24px 12px",
      }}
    >
      {/* Portrait lock overlay */}
      {isPortrait && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(5, 11, 14, 0.98)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#e0f2f1",
            fontFamily: "'Press Start 2P', monospace",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <div style={{ fontSize: "52px", marginBottom: "24px", animation: "neonPulse 1.5s ease-in-out infinite" }}>
            🔄
          </div>
          <div style={{ fontSize: "15px", color: "#00ff87", marginBottom: "12px", letterSpacing: "1px" }}>
            ROTATE YOUR DEVICE
          </div>
          <div style={{ fontSize: "9px", color: "#709ca6", lineHeight: "2" }}>
            Rotate to landscape mode<br />for optimal cyber runner visual
          </div>
          <button
            onClick={toggleFullscreen}
            style={{
              marginTop: "28px",
              padding: "12px 28px",
              fontSize: "10px",
              fontFamily: "'Press Start 2P', monospace",
              background: "linear-gradient(90deg, #00ff87, #00e5ff)",
              color: "#050b0e",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(0, 255, 135, 0.4)",
            }}
          >
            ENTER FULLSCREEN (F)
          </button>
        </div>
      )}

      {/* Floating neon energy particles */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {bgParticles}
      </div>

      {/* Header / Brand Title */}
      {!isFullscreen && (
        <div style={{ textAlign: "center", marginBottom: "12px", zIndex: 5 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 14px",
              borderRadius: "20px",
              background: "rgba(0, 255, 135, 0.08)",
              border: "1px solid rgba(0, 255, 135, 0.3)",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#00ff87", fontSize: "10px", animation: "neonPulse 2s infinite" }}>⚡</span>
            <span style={{ fontSize: "8px", color: "#00ff87", letterSpacing: "2px", textTransform: "uppercase" }}>
              CYBER ACTION RUNNER
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 34px)",
              fontWeight: 900,
              color: "transparent",
              background: "linear-gradient(90deg, #00ff87 0%, #00e5ff 50%, #38ef7d 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              letterSpacing: "3px",
              margin: 0,
              filter: "drop-shadow(0 0 16px rgba(0, 255, 135, 0.5))",
            }}
          >
            BLOCK FUEL
          </h1>

          <div
            style={{
              fontSize: "12px",
              color: "#ffd700",
              letterSpacing: "4px",
              marginTop: "4px",
              filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))",
            }}
          >
            PUNCH &amp; RUN
          </div>

          <p
            style={{
              color: "#709ca6",
              fontSize: "8px",
              letterSpacing: "2px",
              marginTop: "8px",
              textTransform: "uppercase",
            }}
          >
            Dodge Hazards • Power Punch • Harvest Fuel • Survive The Grid
          </p>
        </div>
      )}

      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          padding: "8px 14px",
          fontSize: "8px",
          fontFamily: "'Press Start 2P', monospace",
          background: "rgba(10, 20, 24, 0.85)",
          color: "#00ff87",
          border: "1px solid rgba(0, 255, 135, 0.4)",
          borderRadius: "6px",
          cursor: "pointer",
          zIndex: 20,
          boxShadow: "0 0 12px rgba(0, 255, 135, 0.2)",
          transition: "all 0.2s ease",
        }}
      >
        {isFullscreen ? "✕ EXIT (F)" : "⛶ FULLSCREEN (F)"}
      </button>

      {/* Canvas Wrapper with Holographic Cyber Border */}
      <div
        style={{
          position: "relative",
          borderRadius: isFullscreen ? "0px" : "14px",
          padding: isFullscreen ? "0px" : "3px",
          background: isFullscreen
            ? "#000"
            : "linear-gradient(135deg, rgba(0, 255, 135, 0.7), rgba(0, 229, 255, 0.6), rgba(46, 213, 115, 0.4))",
          boxShadow: isFullscreen
            ? "none"
            : "0 0 35px rgba(0, 255, 135, 0.25), 0 20px 60px rgba(0, 0, 0, 0.8)",
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
            borderRadius: isFullscreen ? "0px" : "12px",
            background: "#071013",
            imageRendering: "pixelated",
            cursor: "crosshair",
          }}
        />

        {/* ──────── START / IDLE SCREEN ──────── */}
        {gameState === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5, 12, 15, 0.85)",
              borderRadius: isFullscreen ? "0px" : "12px",
              backdropFilter: "blur(6px)",
              padding: "20px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 16px",
                borderRadius: "30px",
                background: "rgba(0, 255, 135, 0.12)",
                border: "1px solid rgba(0, 255, 135, 0.4)",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "14px" }}>⚡</span>
              <span style={{ fontSize: "9px", color: "#00ff87", letterSpacing: "2px" }}>
                CYBER GRID INITIALIZED
              </span>
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#00ff87",
                marginBottom: "20px",
                animation: "neonPulse 1.8s ease-in-out infinite",
                textAlign: "center",
                letterSpacing: "1px",
              }}
            >
              ▶ PRESS ANY KEY OR TAP TO RUN ◀
            </div>

            {/* Tactical Control Badges */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                maxWidth: "520px",
                width: "100%",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  background: "rgba(10, 20, 24, 0.8)",
                  border: "1px solid rgba(0, 255, 135, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#00ff87", fontSize: "10px", marginBottom: "4px" }}>▲ JUMP</div>
                <div style={{ color: "#709ca6", fontSize: "7px" }}>W / ⬆ / SPACE</div>
              </div>

              <div
                style={{
                  background: "rgba(10, 20, 24, 0.8)",
                  border: "1px solid rgba(0, 229, 255, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#00e5ff", fontSize: "10px", marginBottom: "4px" }}>▼ DUCK</div>
                <div style={{ color: "#709ca6", fontSize: "7px" }}>S / ⬇ (Slide Under)</div>
              </div>

              <div
                style={{
                  background: "rgba(10, 20, 24, 0.8)",
                  border: "1px solid rgba(255, 215, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#ffd700", fontSize: "10px", marginBottom: "4px" }}>🥊 PUNCH</div>
                <div style={{ color: "#709ca6", fontSize: "7px" }}>D / ➡ / Click (1 Coin)</div>
              </div>
            </div>

            <div
              style={{
                fontSize: "7.5px",
                color: "#8aa5ad",
                textAlign: "center",
                lineHeight: "1.8",
                maxWidth: "520px",
              }}
            >
              • Dodge Drones: <span style={{ color: "#00e5ff" }}>+1 Pt</span> &bull; Smash with Punch: <span style={{ color: "#00ff87" }}>+2 to +4 Pts</span><br />
              • Collect <span style={{ color: "#ffd700" }}>⚡ Fuel Coins</span> to power up your punches!<br />
              • Crystal Beam: <span style={{ color: "#ff3838" }}>-50 HP</span> &bull; Nano Dart: <span style={{ color: "#ff7979" }}>-25 HP</span> &bull; Auto HP Regen
            </div>
          </div>
        )}

        {/* ──────── GAME OVER / DEAD SCREEN ──────── */}
        {gameState === "dead" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(18, 5, 8, 0.88)",
              borderRadius: isFullscreen ? "0px" : "12px",
              backdropFilter: "blur(8px)",
              padding: "24px",
              zIndex: 10,
            }}
          >
            {/* Terminal Critical Tag */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 14px",
                borderRadius: "20px",
                background: "rgba(255, 56, 56, 0.15)",
                border: "1px solid rgba(255, 56, 56, 0.5)",
                marginBottom: "12px",
                animation: "dangerPulse 1.4s infinite",
              }}
            >
              <span style={{ fontSize: "10px" }}>⚠️</span>
              <span style={{ fontSize: "8px", color: "#ff3838", letterSpacing: "2px" }}>
                CORE OVERLOAD // RUN TERMINATED
              </span>
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#ff3838",
                marginBottom: "12px",
                letterSpacing: "2px",
                filter: "drop-shadow(0 0 12px rgba(255, 56, 56, 0.8))",
              }}
            >
              RUN FAILED
            </div>

            {/* Performance Card */}
            <div
              style={{
                background: "rgba(10, 20, 24, 0.9)",
                border: "1px solid rgba(255, 56, 56, 0.4)",
                borderRadius: "10px",
                padding: "16px 28px",
                marginBottom: "16px",
                textAlign: "center",
                minWidth: "280px",
                boxShadow: "0 0 25px rgba(255, 56, 56, 0.15)",
              }}
            >
              <div style={{ fontSize: "8px", color: "#709ca6", letterSpacing: "2px", marginBottom: "4px" }}>
                FINAL SCORE
              </div>
              <div
                style={{
                  fontSize: "26px",
                  color: "#00ff87",
                  fontWeight: 900,
                  filter: "drop-shadow(0 0 10px rgba(0, 255, 135, 0.6))",
                  marginBottom: "8px",
                }}
              >
                {score}
              </div>

              {score >= highScore && score > 0 && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "#ffd700",
                    marginBottom: "8px",
                    animation: "neonPulse 1s ease-in-out infinite",
                    letterSpacing: "1px",
                  }}
                >
                  🏆 NEW HIGH RECORD! 🏆
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-around", gap: "16px", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <div style={{ fontSize: "6.5px", color: "#709ca6", marginBottom: "2px" }}>BEST</div>
                  <div style={{ fontSize: "11px", color: "#00e5ff" }}>{highScore}</div>
                </div>
                <div>
                  <div style={{ fontSize: "6.5px", color: "#709ca6", marginBottom: "2px" }}>FUEL COINS</div>
                  <div style={{ fontSize: "11px", color: "#ffd700" }}>⚡ {coinCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: "6.5px", color: "#709ca6", marginBottom: "2px" }}>RANK</div>
                  <div style={{ fontSize: "8.5px", color: runnerRank.color }}>{runnerRank.rank}</div>
                </div>
              </div>
            </div>

            {/* Restart Prompt Button */}
            <button
              onClick={resetGame}
              style={{
                padding: "12px 28px",
                fontSize: "10px",
                fontFamily: "'Press Start 2P', monospace",
                background: "linear-gradient(90deg, #00ff87, #00e5ff)",
                color: "#050b0e",
                fontWeight: "bold",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 0 25px rgba(0, 255, 135, 0.5)",
                animation: "neonPulse 1.5s ease-in-out infinite",
              }}
            >
              ↻ REBOOT &amp; RETRY
            </button>
            <div style={{ fontSize: "7px", color: "rgba(224, 242, 241, 0.4)", marginTop: "10px" }}>
              (Or press any key on keyboard)
            </div>
          </div>
        )}

        {/* ──────── MOBILE TOUCH CONTROLS ──────── */}
        {isTouchDevice && (
          <>
            {/* Punch Button - Left */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["d"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["d"] = false; }}
              style={{
                position: "absolute",
                left: "12px",
                bottom: "16px",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                border: "2px solid rgba(0, 255, 135, 0.8)",
                background: "radial-gradient(circle, rgba(0, 255, 135, 0.35) 0%, rgba(10, 24, 28, 0.85) 100%)",
                color: "#00ff87",
                fontSize: "20px",
                fontWeight: 900,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(6px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
                boxShadow: "0 0 20px rgba(0, 255, 135, 0.4)",
              }}
            >
              <span>🥊</span>
              <span style={{ fontSize: "7px", marginTop: "2px" }}>PUNCH</span>
            </button>

            {/* Jump Button - Right Top */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["arrowup"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["arrowup"] = false; }}
              style={{
                position: "absolute",
                right: "14px",
                bottom: "94px",
                width: "66px",
                height: "66px",
                borderRadius: "50%",
                border: "2px solid rgba(0, 255, 135, 0.8)",
                background: "radial-gradient(circle, rgba(0, 255, 135, 0.3) 0%, rgba(10, 24, 28, 0.85) 100%)",
                color: "#00ff87",
                fontSize: "20px",
                fontWeight: 900,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(6px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
                boxShadow: "0 0 18px rgba(0, 255, 135, 0.35)",
              }}
            >
              <span>▲</span>
              <span style={{ fontSize: "7px" }}>JUMP</span>
            </button>

            {/* Duck Button - Right Bottom */}
            <button
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); keys.current["arrowdown"] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keys.current["arrowdown"] = false; }}
              style={{
                position: "absolute",
                right: "14px",
                bottom: "16px",
                width: "66px",
                height: "66px",
                borderRadius: "50%",
                border: "2px solid rgba(0, 229, 255, 0.8)",
                background: "radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, rgba(10, 24, 28, 0.85) 100%)",
                color: "#00e5ff",
                fontSize: "20px",
                fontWeight: 900,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                backdropFilter: "blur(6px)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
                userSelect: "none",
                zIndex: 20,
                boxShadow: "0 0 18px rgba(0, 229, 255, 0.35)",
              }}
            >
              <span>▼</span>
              <span style={{ fontSize: "7px" }}>DUCK</span>
            </button>
          </>
        )}
      </div>

      {/* ──────── CONSOLE SCORE DASHBOARD ──────── */}
      {!isFullscreen && (
        <div
          style={{
            display: "flex",
            gap: "28px",
            marginTop: "20px",
            padding: "12px 32px",
            background: "rgba(10, 20, 24, 0.85)",
            borderRadius: "10px",
            border: "1px solid rgba(0, 255, 135, 0.3)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 255, 135, 0.05)",
          }}
        >
          <div style={{ textAlign: "center", minWidth: "90px" }}>
            <div style={{ fontSize: "7.5px", color: "#709ca6", marginBottom: "4px", letterSpacing: "2px" }}>
              CURRENT SCORE
            </div>
            <div style={{ fontSize: "20px", color: "#00ff87", fontWeight: 900 }}>{score}</div>
          </div>

          <div style={{ width: "1px", background: "rgba(0, 255, 135, 0.2)" }} />

          <div style={{ textAlign: "center", minWidth: "90px" }}>
            <div style={{ fontSize: "7.5px", color: "#709ca6", marginBottom: "4px", letterSpacing: "2px" }}>
              HIGH RECORD
            </div>
            <div style={{ fontSize: "20px", color: "#00e5ff", fontWeight: 900 }}>{highScore}</div>
          </div>

          <div style={{ width: "1px", background: "rgba(0, 255, 135, 0.2)" }} />

          <div style={{ textAlign: "center", minWidth: "90px" }}>
            <div style={{ fontSize: "7.5px", color: "#709ca6", marginBottom: "4px", letterSpacing: "2px" }}>
              FUEL CELLS
            </div>
            <div style={{ fontSize: "20px", color: "#ffd700", fontWeight: 900 }}>⚡ {coinCount}</div>
          </div>
        </div>
      )}

      {/* ──────── THREAT INTEL & SCORING DOSSIER ──────── */}
      {!isFullscreen && (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            maxWidth: "880px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "9px", color: "#00ff87", letterSpacing: "2px", textAlign: "center" }}>
            ── GRID INTEL &amp; SCORING ──
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              fontSize: "8px",
              color: "#e0f2f1",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(0, 255, 135, 0.25)", borderRadius: "8px" }}>
              <canvas ref={aeroPreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Aero-Jelly</div>
                <div style={{ color: "#00ff87", fontSize: "7px", marginTop: "2px" }}>Punch: +3 Pts</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(0, 255, 135, 0.25)", borderRadius: "8px" }}>
              <canvas ref={hollowPreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Hollow Stalker</div>
                <div style={{ color: "#00ff87", fontSize: "7px", marginTop: "2px" }}>Punch: +4 Pts</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(0, 255, 135, 0.25)", borderRadius: "8px" }}>
              <canvas ref={mitePreviewRef} width={36} height={36} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Scrap-Mite</div>
                <div style={{ color: "#00ff87", fontSize: "7px", marginTop: "2px" }}>Punch: +2 Pts</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(255, 56, 56, 0.3)", borderRadius: "8px" }}>
              <canvas ref={bulletPreviewRef} width={42} height={14} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Crystal Beam</div>
                <div style={{ color: "#ff3838", fontSize: "7px", marginTop: "2px" }}>-50 HP (Heavy)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(255, 177, 66, 0.3)", borderRadius: "8px" }}>
              <canvas ref={nanoPreviewRef} width={42} height={14} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Nano Dart</div>
                <div style={{ color: "#ffb142", fontSize: "7px", marginTop: "2px" }}>-25 HP (Light)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(10, 20, 24, 0.8)", border: "1px solid rgba(255, 215, 0, 0.3)", borderRadius: "8px" }}>
              <canvas ref={coinPreviewRef} width={24} height={24} style={{ imageRendering: "pixelated", borderRadius: "4px", background: "#071013" }} />
              <div>
                <div>Fuel Coin</div>
                <div style={{ color: "#ffd700", fontSize: "7px", marginTop: "2px" }}>1 Coin = 1 Strike</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
