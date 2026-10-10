/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Invader, Bullet, Bunker, Ufo, Particle, FloatingText } from '../types';
import { soundFx } from '../audio/soundFx';

interface SpaceInvadersGameProps {
  highScore: number;
  onGameOver: (finalScore: number, wave: number, stats: { shotsFired: number; shotsHit: number; accuracy: number }) => void;
  onScoreUpdate?: (score: number) => void;
  scanlinesEnabled?: boolean;
}

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 540;

// Pixel bitmaps for 80s arcade invaders (8x8 or 11x8)
const SQUID_SPRITE = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [1,1,0,1,1,0,1,1],
  [1,1,1,1,1,1,1,1],
  [0,0,1,0,0,1,0,0],
  [0,1,0,1,1,0,1,0],
  [1,0,1,0,0,1,0,1]
];

const CRAB_SPRITE = [
  [0,0,1,0,0,0,1,0,0],
  [0,0,0,1,0,1,0,0,0],
  [0,0,1,1,1,1,1,0,0],
  [0,1,1,0,1,0,1,1,0],
  [1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,1,0,1],
  [0,0,0,1,0,1,0,0,0]
];

const OCTOPUS_SPRITE = [
  [0,0,0,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,0,0,0,0,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [0,0,1,1,0,0,1,1,0,0],
  [0,1,1,0,1,1,0,1,1,0],
  [1,1,0,0,0,0,0,0,1,1]
];

export const SpaceInvadersGame: React.FC<SpaceInvadersGameProps> = ({
  highScore,
  onGameOver,
  onScoreUpdate,
  scanlinesEnabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Menus
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState<number>(0);
  const [currentHighScore, setCurrentHighScore] = useState<number>(highScore);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);

  // Sync high score prop
  useEffect(() => {
    setCurrentHighScore(prev => Math.max(prev, highScore));
  }, [highScore]);

  // Keys active state
  const keysRef = useRef<{ left: boolean; right: boolean; fire: boolean }>({
    left: false,
    right: false,
    fire: false,
  });

  // Game internal mutable state (for 60fps loop)
  const engineStateRef = useRef({
    gameState: 'MENU' as GameState,
    score: 0,
    lives: 3,
    wave: 1,
    shotsFired: 0,
    shotsHit: 0,

    player: {
      x: CANVAS_WIDTH / 2 - 18,
      y: CANVAS_HEIGHT - 48,
      width: 36,
      height: 22,
      speed: 360,
      invulnerableTimer: 0,
    },

    invaders: [] as Invader[],
    invaderDirection: 1, // 1 = right, -1 = left
    invaderSpeed: 30, // px per second
    invaderStepTimer: 0,
    invaderStepInterval: 0.8, // seconds between steps, decreases as aliens die
    invaderFrame: 0 as 0 | 1,
    invaderDropDistance: 18,

    bullets: [] as Bullet[],
    lastPlayerShotTime: 0,
    bunkers: [] as Bunker[],

    ufo: {
      active: false,
      x: -60,
      y: 45,
      vx: 120,
      width: 44,
      height: 18,
      points: 150,
      color: '#ffe600',
    } as Ufo,
    ufoSpawnTimer: 18,

    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    nextFloatingId: 1,

    alienShootTimer: 1.5,
    lastTime: performance.now(),
  });

  // Create bunkers / energy barricades
  const createBunkers = useCallback((): Bunker[] => {
    const bunkers: Bunker[] = [];
    const bunkerCount = 4;
    const bunkerWidth = 60;
    const bunkerHeight = 36;
    const gap = (CANVAS_WIDTH - bunkerCount * bunkerWidth) / (bunkerCount + 1);
    const startY = CANVAS_HEIGHT - 110;

    const blockSize = 6;
    const cols = Math.floor(bunkerWidth / blockSize);
    const rows = Math.floor(bunkerHeight / blockSize);

    for (let b = 0; b < bunkerCount; b++) {
      const bx = gap + b * (bunkerWidth + gap);
      const pixels: Bunker['pixels'] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Arch notch cutout at bottom center
          if (r >= rows - 2 && c >= 3 && c <= 6) {
            continue;
          }
          // Top corner cutouts
          if (r === 0 && (c === 0 || c === cols - 1)) {
            continue;
          }

          pixels.push({
            x: bx + c * blockSize,
            y: startY + r * blockSize,
            width: blockSize,
            height: blockSize,
            alive: true,
            color: '#00f0ff',
          });
        }
      }

      bunkers.push({ x: bx, y: startY, pixels });
    }

    return bunkers;
  }, []);

  // Spawn Invaders Grid
  const createInvaders = useCallback((waveNum: number): Invader[] => {
    const invaders: Invader[] = [];
    const rows = 5;
    const cols = 10;
    const invWidth = 32;
    const invHeight = 22;
    const gapX = 22;
    const gapY = 18;
    const startX = (CANVAS_WIDTH - (cols * (invWidth + gapX) - gapX)) / 2;
    const startY = 80 + Math.min(60, (waveNum - 1) * 12);

    for (let r = 0; r < rows; r++) {
      let type: 0 | 1 | 2 = 2; // Octopus (bottom)
      let pts = 10;
      let color = '#00f0ff'; // Cyan

      if (r === 0) {
        type = 0; // Squid (top)
        pts = 30;
        color = '#ff2a8d'; // Magenta
      } else if (r === 1 || r === 2) {
        type = 1; // Crab (middle)
        pts = 20;
        color = '#b026ff'; // Purple
      }

      for (let c = 0; c < cols; c++) {
        invaders.push({
          x: startX + c * (invWidth + gapX),
          y: startY + r * (invHeight + gapY),
          width: invWidth,
          height: invHeight,
          type,
          points: pts,
          color,
          alive: true,
          frame: 0,
        });
      }
    }

    return invaders;
  }, []);

  // Initialize Game
  const startNewGame = useCallback(() => {
    const s = engineStateRef.current;
    s.gameState = 'PLAYING';
    s.score = 0;
    s.lives = 3;
    s.wave = 1;
    s.shotsFired = 0;
    s.shotsHit = 0;
    s.invaders = createInvaders(1);
    s.bunkers = createBunkers();
    s.bullets = [];
    s.particles = [];
    s.floatingTexts = [];
    s.player.x = CANVAS_WIDTH / 2 - 18;
    s.player.invulnerableTimer = 0;
    s.invaderDirection = 1;
    s.invaderStepInterval = 0.8;
    s.invaderStepTimer = 0;
    s.ufo.active = false;
    s.ufoSpawnTimer = 15;
    s.lastTime = performance.now();

    setGameState('PLAYING');
    setScore(0);
    setLives(3);
    setWave(1);
    onScoreUpdate?.(0);
  }, [createInvaders, createBunkers, onScoreUpdate]);

  // Next Wave
  const proceedToNextWave = useCallback(() => {
    const s = engineStateRef.current;
    const nextWave = s.wave + 1;
    s.wave = nextWave;
    s.invaders = createInvaders(nextWave);
    s.bullets = [];
    s.invaderDirection = 1;
    s.invaderStepInterval = Math.max(0.35, 0.85 - (nextWave - 1) * 0.08);
    s.invaderStepTimer = 0;
    s.player.x = CANVAS_WIDTH / 2 - 18;
    s.player.invulnerableTimer = 1.0; // 1s spawn shield

    setWave(nextWave);
    soundFx.playWaveClear();

    // Floating wave bonus
    s.floatingTexts.push({
      id: s.nextFloatingId++,
      text: `WAVE ${nextWave} READY!`,
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2 - 20,
      color: '#ffe600',
      life: 2.0,
    });
  }, [createInvaders]);

  // Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        keysRef.current.fire = true;
        if (engineStateRef.current.gameState === 'MENU' || engineStateRef.current.gameState === 'GAME_OVER') {
          startNewGame();
        }
      } else if (e.code === 'KeyP') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = false;
      } else if (e.code === 'Space') {
        keysRef.current.fire = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startNewGame]);

  const togglePause = useCallback(() => {
    const s = engineStateRef.current;
    if (s.gameState === 'PLAYING') {
      s.gameState = 'PAUSED';
      setGameState('PAUSED');
    } else if (s.gameState === 'PAUSED') {
      s.gameState = 'PLAYING';
      s.lastTime = performance.now();
      setGameState('PLAYING');
    }
  }, []);

  // Player Fire
  const firePlayerLaser = useCallback(() => {
    const s = engineStateRef.current;
    if (s.gameState !== 'PLAYING') return;

    // Limit active player bullets to 2 simultaneously
    const playerBullets = s.bullets.filter(b => b.fromPlayer);
    if (playerBullets.length >= 2) return;

    const now = performance.now();
    if (now - s.lastPlayerShotTime < 240) return; // rate limit

    s.lastPlayerShotTime = now;
    s.shotsFired++;

    s.bullets.push({
      x: s.player.x + s.player.width / 2 - 2,
      y: s.player.y - 8,
      vx: 0,
      vy: -480,
      width: 4,
      height: 14,
      fromPlayer: true,
      color: '#00f0ff',
    });

    soundFx.playLaser();
  }, []);

  // Particles generator
  const spawnExplosion = (x: number, y: number, color: string, count = 16) => {
    const s = engineStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = (timestamp: number) => {
      animId = requestAnimationFrame(gameLoop);

      const s = engineStateRef.current;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.1);
      s.lastTime = timestamp;

      // Handle continuous spacebar fire
      if (keysRef.current.fire && s.gameState === 'PLAYING') {
        firePlayerLaser();
      }

      // UPDATE GAMEPLAY LOGIC
      if (s.gameState === 'PLAYING') {
        // 1. Move Player
        if (keysRef.current.left) {
          s.player.x = Math.max(16, s.player.x - s.player.speed * dt);
        }
        if (keysRef.current.right) {
          s.player.x = Math.min(CANVAS_WIDTH - s.player.width - 16, s.player.x + s.player.speed * dt);
        }

        if (s.player.invulnerableTimer > 0) {
          s.player.invulnerableTimer -= dt;
        }

        // 2. Invader Step Logic
        const aliveInvaders = s.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) {
          // Wave Cleared!
          proceedToNextWave();
        } else {
          // Stepping interval scales as aliens are eliminated
          const aliveFraction = aliveInvaders.length / s.invaders.length;
          const currentStepInterval = Math.max(0.06, s.invaderStepInterval * Math.pow(aliveFraction, 0.75));

          s.invaderStepTimer += dt;
          if (s.invaderStepTimer >= currentStepInterval) {
            s.invaderStepTimer = 0;
            s.invaderFrame = s.invaderFrame === 0 ? 1 : 0;
            soundFx.playInvaderStep();

            // Check if bounds reached
            let hitEdge = false;
            const minX = Math.min(...aliveInvaders.map(inv => inv.x));
            const maxX = Math.max(...aliveInvaders.map(inv => inv.x + inv.width));

            if ((s.invaderDirection === 1 && maxX >= CANVAS_WIDTH - 24) ||
                (s.invaderDirection === -1 && minX <= 24)) {
              hitEdge = true;
            }

            if (hitEdge) {
              s.invaderDirection *= -1;
              let reachedPlayerLine = false;
              s.invaders.forEach(inv => {
                inv.y += s.invaderDropDistance;
                inv.frame = s.invaderFrame;
                if (inv.alive && inv.y + inv.height >= s.player.y) {
                  reachedPlayerLine = true;
                }
              });

              if (reachedPlayerLine) {
                // Invaders invaded the base!
                triggerGameOver();
              }
            } else {
              const movePx = 14 * s.invaderDirection;
              s.invaders.forEach(inv => {
                inv.x += movePx;
                inv.frame = s.invaderFrame;
              });
            }
          }

          // 3. Invader Attacks (Plasma bolts)
          s.alienShootTimer -= dt;
          if (s.alienShootTimer <= 0) {
            s.alienShootTimer = Math.max(0.6, 1.6 - (s.wave - 1) * 0.15 + Math.random() * 0.8);

            // Find lowest alien in random column
            const colsMap = new Map<number, Invader>();
            aliveInvaders.forEach(inv => {
              const colKey = Math.round(inv.x / 40);
              const existing = colsMap.get(colKey);
              if (!existing || inv.y > existing.y) {
                colsMap.set(colKey, inv);
              }
            });

            const bottomInvaders = Array.from(colsMap.values());
            if (bottomInvaders.length > 0) {
              const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];
              s.bullets.push({
                x: shooter.x + shooter.width / 2 - 2,
                y: shooter.y + shooter.height + 2,
                vx: 0,
                vy: 240 + s.wave * 15,
                width: 4,
                height: 12,
                fromPlayer: false,
                color: '#ff2a8d',
              });
            }
          }
        }

        // 4. Mystery UFO update
        s.ufoSpawnTimer -= dt;
        if (s.ufoSpawnTimer <= 0 && !s.ufo.active) {
          s.ufo.active = true;
          s.ufo.x = -50;
          s.ufo.vx = 140;
          s.ufo.points = [100, 150, 200, 300][Math.floor(Math.random() * 4)];
          s.ufoSpawnTimer = 22 + Math.random() * 14;
        }

        if (s.ufo.active) {
          s.ufo.x += s.ufo.vx * dt;
          if (s.ufo.x > CANVAS_WIDTH + 60) {
            s.ufo.active = false;
          }
        }

        // 5. Update Bullets
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.y += b.vy * dt;

          // Out of screen
          if (b.y < -20 || b.y > CANVAS_HEIGHT + 20) {
            s.bullets.splice(i, 1);
            continue;
          }

          let bulletConsumed = false;

          // Check Bunker collisions
          for (const bunker of s.bunkers) {
            for (const p of bunker.pixels) {
              if (p.alive &&
                  b.x < p.x + p.width &&
                  b.x + b.width > p.x &&
                  b.y < p.y + p.height &&
                  b.y + b.height > p.y) {
                p.alive = false;
                bulletConsumed = true;
                soundFx.playShieldHit();
                spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color, 4);
                break;
              }
            }
            if (bulletConsumed) break;
          }

          if (bulletConsumed) {
            s.bullets.splice(i, 1);
            continue;
          }

          // Player Bullet hits Invaders or UFO
          if (b.fromPlayer) {
            // UFO hit
            if (s.ufo.active &&
                b.x < s.ufo.x + s.ufo.width &&
                b.x + b.width > s.ufo.x &&
                b.y < s.ufo.y + s.ufo.height &&
                b.y + b.height > s.ufo.y) {
              s.ufo.active = false;
              s.shotsHit++;
              addScore(s.ufo.points);
              soundFx.playUfoHit();
              spawnExplosion(s.ufo.x + s.ufo.width / 2, s.ufo.y + s.ufo.height / 2, '#ffe600', 24);
              s.floatingTexts.push({
                id: s.nextFloatingId++,
                text: `+${s.ufo.points}`,
                x: s.ufo.x,
                y: s.ufo.y,
                color: '#ffe600',
                life: 1.2,
              });
              s.bullets.splice(i, 1);
              continue;
            }

            // Invader hit
            for (const inv of s.invaders) {
              if (inv.alive &&
                  b.x < inv.x + inv.width &&
                  b.x + b.width > inv.x &&
                  b.y < inv.y + inv.height &&
                  b.y + b.height > inv.y) {
                inv.alive = false;
                s.shotsHit++;
                addScore(inv.points);
                soundFx.playInvaderExplosion();
                spawnExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color, 16);
                s.bullets.splice(i, 1);
                bulletConsumed = true;
                break;
              }
            }

            if (bulletConsumed) continue;
          } else {
            // Alien Bullet hits Player
            if (s.player.invulnerableTimer <= 0 &&
                b.x < s.player.x + s.player.width &&
                b.x + b.width > s.player.x &&
                b.y < s.player.y + s.player.height &&
                b.y + b.height > s.player.y) {
              s.bullets.splice(i, 1);
              soundFx.playPlayerHit();
              spawnExplosion(s.player.x + s.player.width / 2, s.player.y + s.player.height / 2, '#ff2a8d', 30);

              s.lives--;
              setLives(s.lives);

              if (s.lives <= 0) {
                triggerGameOver();
              } else {
                s.player.x = CANVAS_WIDTH / 2 - 18;
                s.player.invulnerableTimer = 2.0; // 2 seconds safety
              }
              continue;
            }
          }
        }
      }

      // 6. Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // 7. Update Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y -= 25 * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          s.floatingTexts.splice(i, 1);
        }
      }

      // ==========================================
      // RENDERING CANVAS
      // ==========================================
      renderCanvas(ctx, s);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [firePlayerLaser, proceedToNextWave]);

  const addScore = (pts: number) => {
    const s = engineStateRef.current;
    s.score += pts;
    setScore(s.score);
    if (s.score > currentHighScore) {
      setCurrentHighScore(s.score);
    }
    onScoreUpdate?.(s.score);
  };

  const triggerGameOver = () => {
    const s = engineStateRef.current;
    s.gameState = 'GAME_OVER';
    setGameState('GAME_OVER');

    const accuracy = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 0;
    onGameOver(s.score, s.wave, {
      shotsFired: s.shotsFired,
      shotsHit: s.shotsHit,
      accuracy,
    });
  };

  // Canvas Drawing
  const renderCanvas = (ctx: CanvasRenderingContext2D, s: typeof engineStateRef.current) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Deep retro dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0e041e');
    bgGrad.addColorStop(0.7, '#15062a');
    bgGrad.addColorStop(1, '#240a3d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw retro perspective grid floor at bottom
    ctx.strokeStyle = 'rgba(255, 42, 141, 0.18)';
    ctx.lineWidth = 1;
    const horizonY = CANVAS_HEIGHT - 65;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(CANVAS_WIDTH, horizonY);
    ctx.stroke();

    for (let x = -CANVAS_WIDTH; x <= CANVAS_WIDTH * 2; x += 60) {
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, horizonY);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = horizonY + 12; y < CANVAS_HEIGHT; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Stars in background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const seed = 42;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97 + seed) % CANVAS_WIDTH);
      const sy = ((i * 53 + seed) % (horizonY - 20));
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // DRAW UFO
    if (s.ufo.active) {
      drawUfo(ctx, s.ufo);
    }

    // DRAW BUNKERS
    s.bunkers.forEach(bunker => {
      bunker.pixels.forEach(p => {
        if (p.alive) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.width, p.height);
          // Neon sheen
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(p.x, p.y, p.width, 1);
        }
      });
    });

    // DRAW INVADERS
    s.invaders.forEach(inv => {
      if (!inv.alive) return;
      drawInvader(ctx, inv);
    });

    // DRAW PLAYER
    if (s.gameState === 'PLAYING' || s.gameState === 'PAUSED') {
      const isBlinking = s.player.invulnerableTimer > 0 && Math.floor(performance.now() / 100) % 2 === 0;
      if (!isBlinking) {
        drawPlayer(ctx, s.player.x, s.player.y, s.player.width, s.player.height);
      }
    }

    // DRAW BULLETS
    s.bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      // Bright core
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x + 1, b.y + 2, b.width - 2, b.height - 4);
      ctx.shadowBlur = 0;
    });

    // DRAW PARTICLES
    s.particles.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    });

    // DRAW FLOATING TEXTS
    s.floatingTexts.forEach(ft => {
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    });

    // OVERLAYS FOR MENU / PAUSE / GAME OVER
    if (s.gameState === 'MENU') {
      drawMenuOverlay(ctx);
    } else if (s.gameState === 'PAUSED') {
      drawPauseOverlay(ctx);
    } else if (s.gameState === 'GAME_OVER') {
      drawGameOverOverlay(ctx, s.score);
    }
  };

  // Draw Player Interceptor Ship
  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;

    // Body: Neon cyan & magenta vector interceptor
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); // Cannon tip
    ctx.lineTo(x + w / 2 + 3, y + 6);
    ctx.lineTo(x + w - 4, y + 14);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w / 2 + 6, y + h - 4);
    ctx.lineTo(x + w / 2 - 6, y + h - 4);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + 4, y + 14);
    ctx.lineTo(x + w / 2 - 3, y + 6);
    ctx.closePath();
    ctx.fill();

    // Magenta cockpit accent
    ctx.fillStyle = '#ff2a8d';
    ctx.fillRect(x + w / 2 - 3, y + 8, 6, 6);

    // Engine exhaust thrusters
    const thrustColor = Math.random() > 0.5 ? '#ffe600' : '#ff2a8d';
    ctx.fillStyle = thrustColor;
    ctx.fillRect(x + w / 2 - 4, y + h - 2, 8, 5 + Math.random() * 4);

    ctx.restore();
  };

  // Draw Individual Invader Sprite
  const drawInvader = (ctx: CanvasRenderingContext2D, inv: Invader) => {
    ctx.save();
    ctx.fillStyle = inv.color;
    ctx.shadowColor = inv.color;
    ctx.shadowBlur = 8;

    let sprite: number[][] = SQUID_SPRITE;
    if (inv.type === 1) sprite = CRAB_SPRITE;
    if (inv.type === 2) sprite = OCTOPUS_SPRITE;

    const rows = sprite.length;
    const cols = sprite[0].length;
    const pixelW = inv.width / cols;
    const pixelH = inv.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let shouldDraw = sprite[r][c] === 1;
        // Frame animation shifts leg pixels
        if (inv.frame === 1 && r >= rows - 2) {
          shouldDraw = !shouldDraw && (c === 0 || c === cols - 1 || c === 2 || c === cols - 3);
        }

        if (shouldDraw) {
          ctx.fillRect(inv.x + c * pixelW, inv.y + r * pixelH, pixelW + 0.5, pixelH + 0.5);
        }
      }
    }

    ctx.restore();
  };

  // Draw Mystery UFO
  const drawUfo = (ctx: CanvasRenderingContext2D, ufo: Ufo) => {
    ctx.save();
    ctx.fillStyle = ufo.color;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 14;

    const x = ufo.x;
    const y = ufo.y;
    const w = ufo.width;
    const h = ufo.height;

    // Saucer dome
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 4, 10, 6, 0, Math.PI, 0);
    ctx.fill();

    // Saucer body
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 10, w / 2, h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lights
    ctx.fillStyle = '#ff2a8d';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 6 + i * 9, y + 9, 3, 3);
    }

    ctx.restore();
  };

  // Menu Screen Overlay
  const drawMenuOverlay = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(10, 3, 22, 0.88)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Game Title
    ctx.font = 'bold 32px "Orbitron", sans-serif';
    ctx.fillStyle = '#ff2a8d';
    ctx.shadowColor = '#ff2a8d';
    ctx.shadowBlur = 20;
    ctx.fillText('NEON INVADERS', CANVAS_WIDTH / 2, 110);
    ctx.shadowBlur = 0;

    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('SYNTHWAVE ARCADE 1984', CANVAS_WIDTH / 2, 145);

    // Points Table
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    const tableX = CANVAS_WIDTH / 2 - 140;

    // UFO
    ctx.fillStyle = '#ffe600';
    ctx.fillText('🛸  MYSTERY UFO  = ? ? ? PTS', tableX, 210);

    // Squid
    ctx.fillStyle = '#ff2a8d';
    ctx.fillText('👾  COMMANDER    = 30 PTS', tableX, 248);

    // Crab
    ctx.fillStyle = '#b026ff';
    ctx.fillText('👾  OFFICER      = 20 PTS', tableX, 286);

    // Octopus
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('👾  INVADER      = 10 PTS', tableX, 324);

    // Start prompt
    ctx.textAlign = 'center';
    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    if (blink) {
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillText('PRESS SPACEBAR TO START', CANVAS_WIDTH / 2, 410);
      ctx.shadowBlur = 0;
    }

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('USE [← / →] OR [A / D] TO MOVE · [SPACE] FIRE', CANVAS_WIDTH / 2, 455);
  };

  // Pause Screen Overlay
  const drawPauseOverlay = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(10, 3, 22, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Press Start 2P", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.shadowBlur = 0;

    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff2a8d';
    ctx.fillText('PRESS [P] TO RESUME', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  };

  // Game Over Screen Overlay
  const drawGameOverOverlay = (ctx: CanvasRenderingContext2D, finalScore: number) => {
    ctx.fillStyle = 'rgba(12, 2, 26, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Orbitron", sans-serif';
    ctx.fillStyle = '#ff2a8d';
    ctx.shadowColor = '#ff2a8d';
    ctx.shadowBlur = 25;
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 170);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FINAL SCORE: ${finalScore.toString().padStart(5, '0')}`, CANVAS_WIDTH / 2, 230);

    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    if (blink) {
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillText('PRESS SPACEBAR TO PLAY AGAIN', CANVAS_WIDTH / 2, 330);
      ctx.shadowBlur = 0;
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Top Arcade HUD Header */}
      <div className="w-full bg-[#16062d] border-t border-x border-pink-500/40 rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        {/* Current Score */}
        <div className="flex flex-col">
          <span className="text-[10px] font-arcade text-pink-400">SCORE</span>
          <span className="text-base sm:text-lg font-arcade text-white tracking-widest tabular-nums neon-text-pink">
            {score.toString().padStart(5, '0')}
          </span>
        </div>

        {/* High Score */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-arcade text-yellow-300">HIGH-SCORE</span>
          <span className="text-base sm:text-lg font-arcade text-yellow-300 tracking-widest tabular-nums neon-text-yellow">
            {currentHighScore.toString().padStart(5, '0')}
          </span>
        </div>

        {/* Wave & Lives */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-arcade text-cyan-400">WAVE</span>
            <span className="text-sm sm:text-base font-arcade text-cyan-300 tabular-nums">
              {wave.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-arcade text-pink-400">LIVES</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-3 rounded-xs border transition-colors ${
                    i < lives
                      ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_#00f0ff]'
                      : 'bg-black/50 border-neutral-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Window */}
      <div className="relative w-full border-x-2 border-b-2 border-pink-500/40 bg-black shadow-2xl overflow-hidden aspect-[760/540] rounded-b-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block"
        />

        {/* Optional Authentic CRT Scanlines */}
        {scanlinesEnabled && (
          <div className="absolute inset-0 crt-overlay pointer-events-none" />
        )}

        {/* Glass Screen Reflection Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_60%,_rgba(0,0,0,0.5)_100%)] pointer-events-none" />

        {/* Active In-Game Touch/Click Overlay when not playing */}
        {gameState === 'MENU' && (
          <button
            onClick={startNewGame}
            className="absolute inset-0 w-full h-full cursor-pointer bg-transparent"
            aria-label="Start Game"
          />
        )}

        {gameState === 'GAME_OVER' && (
          <button
            onClick={startNewGame}
            className="absolute inset-0 w-full h-full cursor-pointer bg-transparent"
            aria-label="Play Again"
          />
        )}
      </div>

      {/* Bottom Arcade Control Console for Mobile / Touch / Quick Clicks */}
      <div className="w-full mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-[#140628]/80 border border-pink-500/30 backdrop-blur-sm">
        {/* Left Direction */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
            aria-label="Move Ship Left"
            className="px-4 py-3 rounded-lg bg-purple-950/70 border border-purple-500/50 text-white font-arcade text-xs hover:bg-purple-900 active:bg-pink-700 select-none touch-none shadow-md"
          >
            ◄ LEFT
          </button>
          <button
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
            aria-label="Move Ship Right"
            className="px-4 py-3 rounded-lg bg-purple-950/70 border border-purple-500/50 text-white font-arcade text-xs hover:bg-purple-900 active:bg-pink-700 select-none touch-none shadow-md"
          >
            RIGHT ►
          </button>
        </div>

        {/* Fire Laser */}
        <div className="flex items-center gap-2">
          {gameState === 'PLAYING' && (
            <button
              onClick={togglePause}
              aria-label="Pause Game"
              className="px-3 py-3 rounded-lg bg-neutral-900/80 border border-neutral-700 text-pink-300 font-arcade text-[10px] hover:text-white"
            >
              PAUSE
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              onClick={togglePause}
              aria-label="Resume Game"
              className="px-3 py-3 rounded-lg bg-pink-900/80 border border-pink-500 text-white font-arcade text-[10px]"
            >
              RESUME
            </button>
          )}

          <button
            onPointerDown={() => {
              keysRef.current.fire = true;
              if (gameState !== 'PLAYING') startNewGame();
              else firePlayerLaser();
            }}
            onPointerUp={() => { keysRef.current.fire = false; }}
            aria-label="Fire Laser"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-cyan-500 border border-pink-300 text-white font-arcade text-xs font-bold tracking-widest hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(255,42,141,0.5)] select-none touch-none cursor-pointer"
          >
            🔥 FIRE
          </button>
        </div>
      </div>
    </div>
  );
};
