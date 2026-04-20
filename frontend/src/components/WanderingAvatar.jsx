"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const AvatarChat = dynamic(() => import('./AvatarChat'), { ssr: false });

const SRC_FRAME_W  = 666;
const SRC_FRAME_H  = 500;
const SRC_COLS     = 2;
const SRC_ROWS     = 4;
const SCALE        = 0.35;
const AVATAR_W     = Math.round(SRC_FRAME_W * SCALE);
const AVATAR_H     = Math.round(SRC_FRAME_H * SCALE);
const RUN_FRAMES   = [0, 1, 2, 3, 4, 5];
const IDLE_FRAME   = 6;
const RUN_FRAME_MS = 110;
const SPEED        = 130;

const SPAWN_ZONES = [
  { xMin: 0.1, xMax: 0.4, yMin: 0.7,  yMax: 0.88 },
  { xMin: 0.6, xMax: 0.9, yMin: 0.7,  yMax: 0.88 },
  { xMin: 0.1, xMax: 0.4, yMin: 0.4,  yMax: 0.60 },
  { xMin: 0.6, xMax: 0.9, yMin: 0.4,  yMax: 0.60 },
];

const TARGET_ZONES = [
  { xMin: 0.05, xMax: 0.95, yMin: 0.75, yMax: 0.90, weight: 4 },
  { xMin: 0.05, xMax: 0.45, yMin: 0.40, yMax: 0.65, weight: 2 },
  { xMin: 0.55, xMax: 0.95, yMin: 0.40, yMax: 0.65, weight: 2 },
  { xMin: 0.20, xMax: 0.80, yMin: 0.15, yMax: 0.35, weight: 1 },
];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function weightedZonePick(zones) {
  const total = zones.reduce((s, z) => s + (z.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const z of zones) { r -= z.weight ?? 1; if (r <= 0) return z; }
  return zones[zones.length - 1];
}

function posFromZone(zone, vw, vh) {
  return {
    x: clamp(zone.xMin * vw + Math.random() * (zone.xMax - zone.xMin) * vw, 0, vw - AVATAR_W),
    y: clamp(zone.yMin * vh + Math.random() * (zone.yMax - zone.yMin) * vh, 0, vh - AVATAR_H),
  };
}

function frameToPos(frameIdx) {
  const col = frameIdx % SRC_COLS;
  const row = Math.floor(frameIdx / SRC_COLS);
  return { bx: -(col * AVATAR_W), by: -(row * AVATAR_H) };
}

const WanderingAvatar = () => {
  const divRef    = useRef(null);
  const posRef    = useRef({ x: 0, y: 0 });
  const pausedRef = useRef(false);

  // Separate RAF ref for movement and internal refs for intervals
  const rafRef         = useRef(null);
  const runIntervalRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  const [chatOpen, setChatOpen]   = useState(false);
  const [avatarPos, setAvatarPos] = useState({ x: 0, y: 0 });

  function stopAll() {
    if (rafRef.current)         { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (runIntervalRef.current) { clearInterval(runIntervalRef.current); runIntervalRef.current = null; }
    if (idleTimeoutRef.current) { clearTimeout(idleTimeoutRef.current); idleTimeoutRef.current = null; }
  }

  function openChat() {
    pausedRef.current = true;
    stopAll(); // fully cancel RAF — no battery drain
    setAvatarPos({ ...posRef.current });
    setChatOpen(true);
    if (divRef.current) {
      const { bx, by } = frameToPos(IDLE_FRAME);
      divRef.current.style.backgroundPosition = `${bx}px ${by}px`;
      divRef.current.style.transform = 'scaleX(1)';
    }
  }

  function closeChat() {
    setChatOpen(false);
    pausedRef.current = false;
    // Resume wandering after short delay
    idleTimeoutRef.current = setTimeout(() => {
      goToNewTarget();
    }, 600);
  }

  // Keep goToNewTarget accessible to closeChat via ref
  const goToNewTargetRef = useRef(null);

  function goToNewTarget() {
    if (pausedRef.current) return;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const zone = weightedZonePick(TARGET_ZONES);
    const p    = posFromZone(zone, vw, vh);
    const pos  = posRef.current;

    const targetPos = { x: p.x, y: p.y };
    const scaleX    = targetPos.x < pos.x ? -1 : 1;

    if (divRef.current) divRef.current.style.transform = `scaleX(${scaleX})`;

    // Start run frame interval
    if (runIntervalRef.current) clearInterval(runIntervalRef.current);
    let fi = 0;
    runIntervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const f = RUN_FRAMES[fi % RUN_FRAMES.length];
      fi++;
      if (divRef.current) {
        const { bx, by } = frameToPos(f);
        divRef.current.style.backgroundPosition = `${bx}px ${by}px`;
      }
    }, RUN_FRAME_MS);

    // Move loop
    let lastTime = null;
    function moveLoop(ts) {
      if (pausedRef.current) return; // do NOT re-queue if paused
      if (!lastTime) lastTime = ts;
      const dt   = Math.min(ts - lastTime, 50);
      lastTime   = ts;
      const pos  = posRef.current;
      const dx   = targetPos.x - pos.x;
      const dy   = targetPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Arrived — idle
        clearInterval(runIntervalRef.current); runIntervalRef.current = null;
        if (divRef.current) {
          const { bx, by } = frameToPos(IDLE_FRAME);
          divRef.current.style.backgroundPosition = `${bx}px ${by}px`;
          divRef.current.style.transform = 'scaleX(1)';
        }
        idleTimeoutRef.current = setTimeout(goToNewTarget, 2000 + Math.random() * 2500);
        return;
      }

      const step  = (SPEED * dt) / 1000;
      const angle = Math.atan2(dy, dx);
      pos.x += Math.cos(angle) * step;
      pos.y += Math.sin(angle) * step;

      if (divRef.current) {
        divRef.current.style.left = `${pos.x}px`;
        divRef.current.style.top  = `${pos.y}px`;
      }
      rafRef.current = requestAnimationFrame(moveLoop);
    }

    rafRef.current = requestAnimationFrame(moveLoop);
  }

  // Expose to closeChat
  goToNewTargetRef.current = goToNewTarget;

  useEffect(() => {
    let bootTimer = setTimeout(() => {
      const vw        = window.innerWidth;
      const vh        = window.innerHeight;
      const spawnZone = SPAWN_ZONES[Math.floor(Math.random() * SPAWN_ZONES.length)];
      const spawn     = posFromZone(spawnZone, vw, vh);
      posRef.current.x = spawn.x;
      posRef.current.y = spawn.y;

      const el = divRef.current;
      if (el) {
        el.style.opacity    = '0';
        el.style.display    = 'block';
        el.style.left       = `${spawn.x}px`;
        el.style.top        = `${spawn.y}px`;
        const { bx, by }    = frameToPos(IDLE_FRAME);
        el.style.backgroundPosition = `${bx}px ${by}px`;
        requestAnimationFrame(() => {
          if (el) { el.style.transition = 'opacity 0.6s ease'; el.style.opacity = '1'; }
        });
      }
      idleTimeoutRef.current = setTimeout(goToNewTarget, 1000 + Math.random() * 1000);
    }, 1200);

    return () => {
      clearTimeout(bootTimer);
      stopAll();
    };
  }, []);

  const initPos = frameToPos(IDLE_FRAME);

  return (
    <>
      <div
        ref={divRef}
        onClick={openChat}
        title="Click to chat"
        style={{
          display:            'none',
          position:           'fixed',
          zIndex:             9999,
          pointerEvents:      'auto',
          cursor:             'pointer',
          width:              AVATAR_W,
          height:             AVATAR_H,
          backgroundImage:    'url(/avatar/avatar-portfolio-siva.png)',
          backgroundRepeat:   'no-repeat',
          backgroundSize:     `${AVATAR_W * SRC_COLS}px ${AVATAR_H * SRC_ROWS}px`,
          backgroundPosition: `${initPos.bx}px ${initPos.by}px`,
          imageRendering:     'pixelated',
          transformOrigin:    'center center',
          willChange:         'transform, left, top',
        }}
      />
      {chatOpen && (
        <AvatarChat avatarPos={avatarPos} onClose={closeChat} />
      )}
    </>
  );
};

export default WanderingAvatar;