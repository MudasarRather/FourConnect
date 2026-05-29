<template>
  <div class="ssd-scene" :class="{ 'is-reduced': reduced }"
    @mousemove="onMove" @mouseleave="onLeave"
    :style="{ '--px': px + 'px', '--py': py + 'px' }">

    <!-- ═════ Layer 1: Ambient light field ═════ -->
    <div class="scene-glow" aria-hidden="true">
      <span class="glow glow-a" />
      <span class="glow glow-b" />
      <span class="glow glow-c" />
    </div>

    <!-- ═════ Layer 2: Light beams radiating outward ═════ -->
    <div class="scene-beams" aria-hidden="true">
      <span v-for="n in 12" :key="'beam-' + n"
        class="beam"
        :style="{
          transform: `translate(-50%, -100%) rotate(${(n / 12) * 360}deg)`,
          animationDelay: `${n * -0.4}s`,
        }"
      />
    </div>

    <!-- ═════ Layer 3: SVG orbital rings ═════ -->
    <svg class="scene-rings" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="ssd-ring-grad-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stop-color="#fde68a" stop-opacity="0.7" />
          <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#fb923c" stop-opacity="0.3" />
        </linearGradient>
        <linearGradient id="ssd-ring-grad-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stop-color="#fb923c" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#fde68a" stop-opacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="0" cy="0" r="85" class="ring ring-a"
        stroke="url(#ssd-ring-grad-a)" fill="none" stroke-width="0.4"
        stroke-dasharray="6 4" />
      <circle cx="0" cy="0" r="65" class="ring ring-b"
        stroke="url(#ssd-ring-grad-b)" fill="none" stroke-width="0.5"
        stroke-dasharray="2 3" />
      <circle cx="0" cy="0" r="45" class="ring ring-c"
        stroke="#fbbf24" stroke-opacity="0.35" fill="none" stroke-width="0.3" />
      <!-- Orbital satellites -->
      <circle cx="0" cy="-85" r="2.5" class="sat sat-a" fill="#fde68a" />
      <circle cx="65" cy="0"  r="1.8" class="sat sat-b" fill="#fb923c" />
      <circle cx="0" cy="45"  r="1.5" class="sat sat-c" fill="#f59e0b" />
    </svg>

    <!-- ═════ Layer 4: 3D document stack ═════ -->
    <div class="scene-stage" aria-hidden="true">
      <div class="doc-stack">
        <!-- Back paper -->
        <div class="doc doc-back">
          <div class="doc-paper">
            <span class="doc-line" style="--w: 70%; --t: 18%" />
            <span class="doc-line" style="--w: 55%; --t: 30%" />
            <span class="doc-line" style="--w: 80%; --t: 42%" />
            <span class="doc-line" style="--w: 60%; --t: 54%" />
            <span class="doc-line" style="--w: 45%; --t: 66%" />
          </div>
        </div>

        <!-- Middle paper -->
        <div class="doc doc-mid">
          <div class="doc-paper accent">
            <span class="doc-header" />
            <span class="doc-line" style="--w: 68%; --t: 28%" />
            <span class="doc-line" style="--w: 50%; --t: 40%" />
            <span class="doc-line" style="--w: 75%; --t: 52%" />
            <span class="doc-stamp" />
          </div>
        </div>

        <!-- Front paper with wax seal -->
        <div class="doc doc-front">
          <div class="doc-paper gold">
            <span class="doc-corner" />
            <span class="doc-header big" />
            <span class="doc-line" style="--w: 80%; --t: 32%" />
            <span class="doc-line" style="--w: 60%; --t: 44%" />
            <span class="doc-line" style="--w: 72%; --t: 56%" />
            <span class="doc-line" style="--w: 48%; --t: 68%" />
            <!-- Wax seal -->
            <div class="wax-seal">
              <div class="seal-core">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#fef3c7" stroke-width="0.8" stroke-dasharray="2 1.2" />
                  <path d="M14 20 L18.5 24 L26.5 16"
                    stroke="#fef3c7" stroke-width="2.5" stroke-linecap="round"
                    stroke-linejoin="round" fill="none" />
                </svg>
              </div>
              <span class="seal-glow" />
            </div>
          </div>
          <!-- Sheen sweep on front document -->
          <span class="doc-sheen" />
        </div>

        <!-- Bottom shadow plate -->
        <div class="doc-shadow" />
      </div>
    </div>

    <!-- ═════ Layer 5: Floating mini-documents around the stack ═════ -->
    <div class="scene-mini" aria-hidden="true">
      <span v-for="m in mini" :key="'mini-' + m.id"
        class="mini-doc"
        :style="{
          '--x': m.x + '%',
          '--y': m.y + '%',
          '--rot': m.rot + 'deg',
          '--scale': m.scale,
          '--delay': m.delay + 's',
          '--dur': m.dur + 's',
        }"
      />
    </div>

    <!-- ═════ Layer 6: Particle field ═════ -->
    <div class="scene-particles" aria-hidden="true">
      <span v-for="p in particles" :key="'p-' + p.id"
        class="particle"
        :class="`p-${p.tone}`"
        :style="{
          '--x': p.x + '%',
          '--y': p.y + '%',
          '--size': p.size + 'px',
          '--delay': p.delay + 's',
          '--dur': p.dur + 's',
        }"
      />
    </div>

    <!-- ═════ Layer 7: Foreground scan line ═════ -->
    <div class="scene-scan" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  reduced: { type: Boolean, default: false },
})

// ─── Parallax — minimal mouse tracking, smoothed via CSS transitions ───────
const px = ref(0)
const py = ref(0)
function onMove(e) {
  if (props.reduced) return
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left - r.width / 2) / r.width
  const y = (e.clientY - r.top - r.height / 2) / r.height
  // Subtle — max ±10px translation on the stack
  px.value = x * 14
  py.value = y * 10
}
function onLeave() { px.value = 0; py.value = 0 }

// ─── Procedurally generated particles ──────────────────────────────────────
const particles = computed(() => {
  const out = []
  const tones = ['gold', 'amber', 'cream', 'orange']
  for (let i = 0; i < 28; i++) {
    out.push({
      id: i,
      x: (i * 137) % 100,
      y: (i * 71) % 100,
      size: 2 + (i % 4),
      tone: tones[i % 4],
      delay: (i * 0.3) % 12,
      dur: 10 + (i % 7),
    })
  }
  return out
})

// ─── Floating mini documents — orbiting positions ──────────────────────────
const mini = computed(() => {
  const out = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    out.push({
      id: i,
      x: 50 + Math.cos(a) * 32,
      y: 50 + Math.sin(a) * 28,
      rot: -18 + (i * 9),
      scale: 0.55 + (i % 3) * 0.12,
      delay: i * -2.2,
      dur: 14 + (i % 4) * 3,
    })
  }
  return out
})
</script>

<style scoped>
.ssd-scene {
  position: absolute; inset: 0;
  display: block;
  perspective: 1400px;
  perspective-origin: 50% 50%;
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
}

/* ═════ LAYER 1: AMBIENT GLOWS ═════ */
.scene-glow {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.5;
}
.glow-a {
  width: 70%; height: 70%; left: 15%; top: 15%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 70%);
  animation: ssd-glow-pulse 8s ease-in-out infinite;
}
.glow-b {
  width: 50%; height: 50%; left: 5%; top: 45%;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.45), transparent 70%);
  animation: ssd-glow-pulse 11s ease-in-out infinite reverse;
}
.glow-c {
  width: 45%; height: 45%; right: -5%; top: 5%;
  background: radial-gradient(circle, rgba(253, 230, 138, 0.45), transparent 70%);
  animation: ssd-glow-pulse 13s ease-in-out infinite;
}
@keyframes ssd-glow-pulse {
  0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.45; }
  50%      { transform: scale(1.18) translate(4%, -3%); opacity: 0.72; }
}

/* ═════ LAYER 2: LIGHT BEAMS ═════ */
.scene-beams {
  position: absolute; left: 50%; top: 50%;
  width: 1px; height: 1px;
  pointer-events: none;
  z-index: 1;
  transform: translate(var(--px, 0), var(--py, 0));
  transition: transform .8s cubic-bezier(0.16, 1, 0.3, 1);
}
.beam {
  position: absolute;
  left: 50%; top: 50%;
  width: 1.5px; height: 65%;
  transform-origin: 50% 100%;
  background: linear-gradient(180deg,
    rgba(251, 191, 36, 0) 0%,
    rgba(251, 191, 36, 0.30) 30%,
    rgba(251, 146, 60, 0.50) 70%,
    rgba(251, 191, 36, 0) 100%);
  opacity: 0.6;
  animation: ssd-beam-pulse 4s ease-in-out infinite;
  filter: blur(0.4px);
}
@keyframes ssd-beam-pulse {
  0%, 100% { opacity: 0.15; transform: translate(-50%, -100%) rotate(var(--rot, 0)) scaleY(0.85); }
  50%      { opacity: 0.85; transform: translate(-50%, -100%) rotate(var(--rot, 0)) scaleY(1.10); }
}

/* ═════ LAYER 3: ORBITAL RINGS ═════ */
.scene-rings {
  position: absolute;
  left: 50%; top: 50%;
  width: 90%; height: 90%;
  max-width: 460px; max-height: 460px;
  transform: translate(-50%, -50%) translate(calc(var(--px, 0) * 0.5), calc(var(--py, 0) * 0.5));
  pointer-events: none;
  z-index: 2;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.ring { transform-origin: 0 0; }
.ring-a { animation: ssd-ring-spin 28s linear infinite; }
.ring-b { animation: ssd-ring-spin 36s linear infinite reverse; }
.ring-c { animation: ssd-ring-spin 22s linear infinite; }
@keyframes ssd-ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.sat {
  transform-origin: 0 0;
  filter: drop-shadow(0 0 4px currentColor);
}
.sat-a { animation: ssd-sat-orbit-a 14s linear infinite; }
.sat-b { animation: ssd-sat-orbit-b 18s linear infinite reverse; }
.sat-c { animation: ssd-sat-orbit-c 11s linear infinite; }
@keyframes ssd-sat-orbit-a { from { transform: rotate(0deg) translateY(0); } to { transform: rotate(360deg) translateY(0); } }
@keyframes ssd-sat-orbit-b { from { transform: rotate(0deg);              } to { transform: rotate(360deg); } }
@keyframes ssd-sat-orbit-c { from { transform: rotate(0deg);              } to { transform: rotate(360deg); } }

/* ═════ LAYER 4: 3D DOCUMENT STACK ═════ */
.scene-stage {
  position: absolute; left: 50%; top: 50%;
  width: 200px; height: 260px;
  transform: translate(-50%, -50%) translate(var(--px, 0), var(--py, 0));
  transform-style: preserve-3d;
  z-index: 3;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.doc-stack {
  position: relative;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  animation: ssd-stack-orbit 18s linear infinite;
}
@keyframes ssd-stack-orbit {
  from { transform: rotateY(0deg) rotateX(8deg); }
  to   { transform: rotateY(360deg) rotateX(8deg); }
}

.doc {
  position: absolute;
  width: 160px; height: 210px;
  left: 50%; top: 50%;
  transform-style: preserve-3d;
}
.doc-back  { transform: translate(-50%, -50%) translateZ(-30px) rotateZ(-9deg) translate(-18px, 10px); }
.doc-mid   { transform: translate(-50%, -50%) translateZ(0)     rotateZ(-3deg) translate(-6px, 4px); }
.doc-front { transform: translate(-50%, -50%) translateZ(30px)  rotateZ(2deg)  translate(10px, -6px); }

.doc-paper {
  position: relative;
  width: 100%; height: 100%;
  border-radius: 10px 14px 10px 10px;
  background:
    linear-gradient(180deg, #fffdf5 0%, #fff8e6 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 18px 40px -16px rgba(120, 53, 15, 0.50),
    0 4px 10px -2px rgba(120, 53, 15, 0.18);
  border: 1px solid rgba(180, 83, 9, 0.18);
  overflow: hidden;
  isolation: isolate;
  animation: ssd-doc-float 6s ease-in-out infinite;
}
.doc-back .doc-paper {
  animation-delay: -1.5s;
  background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
}
.doc-mid .doc-paper.accent {
  background: linear-gradient(180deg, #fef8e6 0%, #fde68a 100%);
  animation-delay: -3s;
}
.doc-front .doc-paper.gold {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.45), transparent 60%),
    linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%);
  border-color: rgba(180, 83, 9, 0.35);
}
@keyframes ssd-doc-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

.doc-line {
  position: absolute;
  left: 14%; top: var(--t);
  width: var(--w);
  height: 4%;
  background: linear-gradient(90deg, rgba(180, 83, 9, 0.55), rgba(180, 83, 9, 0.25));
  border-radius: 2px;
}
.doc-header {
  position: absolute; left: 12%; top: 10%;
  width: 50%; height: 6%;
  background: linear-gradient(90deg, #b45309, #f59e0b);
  border-radius: 2px;
}
.doc-header.big { height: 8%; width: 58%; background: linear-gradient(90deg, #92400e, #d97706, #f59e0b); }
.doc-stamp {
  position: absolute; right: 12%; bottom: 12%;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(180, 83, 9, 0.55);
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.35), transparent 70%);
}
.doc-corner {
  position: absolute; right: 0; top: 0;
  width: 26px; height: 26px;
  background: linear-gradient(225deg, rgba(180, 83, 9, 0.25) 50%, transparent 50%);
  border-radius: 0 14px 0 14px;
}

.wax-seal {
  position: absolute;
  left: 50%; bottom: 12%;
  transform: translateX(-50%);
  width: 56px; height: 56px;
  display: flex; align-items: center; justify-content: center;
}
.seal-core {
  position: relative;
  width: 48px; height: 48px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #fbbf24, #d97706 60%, #92400e 100%);
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.40),
    inset 0 -3px 6px rgba(0, 0, 0, 0.30),
    0 4px 12px rgba(146, 64, 14, 0.55);
  z-index: 2;
}
.seal-core svg { position: absolute; inset: 6px; }
.seal-glow {
  position: absolute; inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 70%);
  animation: ssd-seal-breathe 2.8s ease-in-out infinite;
  z-index: 1;
}
@keyframes ssd-seal-breathe {
  0%, 100% { transform: scale(0.92); opacity: 0.5; }
  50%      { transform: scale(1.15); opacity: 0.95; }
}

/* Front document sheen sweep */
.doc-sheen {
  position: absolute; inset: 0;
  background: linear-gradient(115deg,
    transparent 35%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 65%);
  transform: translateX(-110%);
  animation: ssd-doc-sheen 5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  pointer-events: none;
  border-radius: 10px 14px 10px 10px;
}
@keyframes ssd-doc-sheen {
  0%, 60% { transform: translateX(-110%); }
  80%     { transform: translateX(210%); }
  100%    { transform: translateX(210%); }
}

/* Shadow plate beneath the stack */
.doc-shadow {
  position: absolute;
  left: 50%; bottom: -20px;
  transform: translateX(-50%) translateZ(-100px);
  width: 75%; height: 30px;
  background: radial-gradient(50% 50% at 50% 50%, rgba(146, 64, 14, 0.55), transparent 70%);
  filter: blur(8px);
  animation: ssd-shadow-breathe 6s ease-in-out infinite;
}
@keyframes ssd-shadow-breathe {
  0%, 100% { transform: translateX(-50%) translateZ(-100px) scale(1); opacity: 0.6; }
  50%      { transform: translateX(-50%) translateZ(-100px) scale(1.10); opacity: 0.4; }
}

/* ═════ LAYER 5: FLOATING MINI DOCUMENTS ═════ */
.scene-mini {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 4;
}
.mini-doc {
  position: absolute;
  left: var(--x); top: var(--y);
  width: 32px; height: 42px;
  transform: translate(-50%, -50%) rotate(var(--rot)) scale(var(--scale));
  background:
    linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 3px 6px 3px 3px;
  border: 1px solid rgba(180, 83, 9, 0.30);
  box-shadow:
    0 6px 16px -6px rgba(120, 53, 15, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
  animation: ssd-mini-drift var(--dur, 14s) ease-in-out infinite var(--delay, 0s);
}
.mini-doc::before {
  content: '';
  position: absolute; left: 18%; right: 18%; top: 22%;
  height: 1.5px;
  background: rgba(120, 53, 15, 0.45);
  box-shadow:
    0 4px 0 rgba(120, 53, 15, 0.30),
    0 8px 0 rgba(120, 53, 15, 0.30),
    0 12px 0 rgba(120, 53, 15, 0.20);
}
.mini-doc::after {
  content: '';
  position: absolute; right: 0; top: 0;
  width: 8px; height: 8px;
  background: linear-gradient(225deg, rgba(180, 83, 9, 0.35) 50%, transparent 50%);
  border-radius: 0 6px 0 4px;
}
@keyframes ssd-mini-drift {
  0%, 100% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(var(--scale)) translate3d(0, 0, 0); }
  25%      { transform: translate(-50%, -50%) rotate(calc(var(--rot) + 8deg)) scale(var(--scale)) translate3d(8px, -12px, 0); }
  50%      { transform: translate(-50%, -50%) rotate(calc(var(--rot) - 4deg)) scale(var(--scale)) translate3d(-6px, -8px, 0); }
  75%      { transform: translate(-50%, -50%) rotate(calc(var(--rot) + 5deg)) scale(var(--scale)) translate3d(4px, -14px, 0); }
}

/* ═════ LAYER 6: PARTICLES ═════ */
.scene-particles {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 5;
}
.particle {
  position: absolute;
  left: var(--x); top: var(--y);
  width: var(--size); height: var(--size);
  border-radius: 50%;
  animation: ssd-particle-twinkle var(--dur, 12s) ease-in-out infinite var(--delay, 0s);
  filter: blur(0.4px);
}
.particle.p-gold   { background: radial-gradient(circle, #fbbf24, transparent 65%); box-shadow: 0 0 8px rgba(251, 191, 36, 0.65); }
.particle.p-amber  { background: radial-gradient(circle, #f59e0b, transparent 65%); box-shadow: 0 0 8px rgba(245, 158, 11, 0.65); }
.particle.p-cream  { background: radial-gradient(circle, #fde68a, transparent 65%); box-shadow: 0 0 8px rgba(253, 230, 138, 0.55); }
.particle.p-orange { background: radial-gradient(circle, #fb923c, transparent 65%); box-shadow: 0 0 8px rgba(251, 146, 60, 0.55); }
@keyframes ssd-particle-twinkle {
  0%, 100% { transform: translate3d(0, 0, 0) scale(0.4); opacity: 0; }
  20%      { transform: translate3d(0, -8px, 0) scale(1); opacity: 0.95; }
  60%      { transform: translate3d(4px, -22px, 0) scale(0.85); opacity: 0.65; }
  100%     { transform: translate3d(8px, -40px, 0) scale(0.2); opacity: 0; }
}

/* ═════ LAYER 7: SCAN LINE ═════ */
.scene-scan {
  position: absolute; left: 0; right: 0; top: 0;
  height: 100%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(251, 191, 36, 0.06) 49.5%,
    rgba(251, 191, 36, 0.20) 50%,
    rgba(251, 191, 36, 0.06) 50.5%,
    transparent 100%);
  pointer-events: none;
  z-index: 6;
  animation: ssd-scan-sweep 8s linear infinite;
}
@keyframes ssd-scan-sweep {
  0%   { transform: translateY(-100%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}

/* ═════ Light-theme polish ═════ */
[data-theme="light"] .glow-a {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.40), transparent 70%);
}
[data-theme="light"] .glow-b {
  background: radial-gradient(circle, rgba(234, 88, 12, 0.32), transparent 70%);
}
[data-theme="light"] .glow-c {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.50), transparent 70%);
}
[data-theme="light"] .beam {
  background: linear-gradient(180deg,
    rgba(217, 119, 6, 0) 0%,
    rgba(217, 119, 6, 0.30) 30%,
    rgba(194, 65, 12, 0.55) 70%,
    rgba(217, 119, 6, 0) 100%);
}
[data-theme="light"] .doc-paper {
  background: linear-gradient(180deg, #ffffff 0%, #fffaf0 100%);
  border-color: rgba(180, 83, 9, 0.28);
}

/* ═════ Reduced motion ═════ */
.is-reduced .doc-stack,
.is-reduced .ring-a,
.is-reduced .ring-b,
.is-reduced .ring-c,
.is-reduced .sat-a,
.is-reduced .sat-b,
.is-reduced .sat-c,
.is-reduced .glow,
.is-reduced .beam,
.is-reduced .mini-doc,
.is-reduced .particle,
.is-reduced .doc-sheen,
.is-reduced .doc-shadow,
.is-reduced .seal-glow,
.is-reduced .scene-scan {
  animation: none !important;
}
</style>
