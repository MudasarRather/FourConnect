<template>
  <header class="ehero">
    <div class="ehero-mesh" aria-hidden="true" />
    <div class="ehero-sheen" aria-hidden="true" />
    <div class="ehero-grid" aria-hidden="true" />

    <!-- Document motion graphics: stacked floating papers (Blender-level intent) -->
    <div class="ehero-papers" aria-hidden="true">
      <svg viewBox="0 0 200 200" class="paper-sheet ps1">
        <rect x="20" y="20" width="160" height="160" rx="6" />
        <line x1="40" y1="50" x2="160" y2="50" />
        <line x1="40" y1="68" x2="140" y2="68" />
        <line x1="40" y1="86" x2="150" y2="86" />
        <line x1="40" y1="104" x2="120" y2="104" />
        <circle cx="160" cy="160" r="14" class="paper-stamp" />
      </svg>
      <svg viewBox="0 0 200 200" class="paper-sheet ps2">
        <rect x="20" y="20" width="160" height="160" rx="6" />
        <line x1="40" y1="50" x2="160" y2="50" />
        <line x1="40" y1="68" x2="140" y2="68" />
        <line x1="40" y1="86" x2="150" y2="86" />
      </svg>
      <svg viewBox="0 0 200 200" class="paper-sheet ps3">
        <rect x="20" y="20" width="160" height="160" rx="6" />
        <line x1="40" y1="50" x2="160" y2="50" />
        <line x1="40" y1="68" x2="140" y2="68" />
      </svg>
    </div>

    <div class="ehero-lead">
      <Motion as="span" class="ehero-eyebrow"
        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: EASE }">
        <span class="eb-dot" /> Records Vault · HRMS
      </Motion>
      <Motion as="h1" class="ehero-title"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.06, ease: EASE }">
        Employee Documents
      </Motion>
      <Motion as="p" class="ehero-sub"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.6, delay: 0.14, ease: EASE }">
        One audit-safe home for every record — verify, track expiry, renew &amp; archive.
      </Motion>
    </div>

    <div class="ehero-kpis">
      <Motion v-for="(m, i) in metrics" :key="m.key"
        as="button" type="button" class="kpi"
        :initial="{ opacity: 0, y: 16, filter: 'blur(6px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ duration: 0.5, delay: 0.18 + i * 0.06, ease: EASE }"
        :whileHover="{ y: -4 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('go', m.go)">
        <span class="kpi-orb" :style="{ '--c': m.color }"><component :is="m.icon" :size="15" /></span>
        <span class="kpi-val edoc-mono"><EdocCountUp :value="m.value || 0" /></span>
        <span class="kpi-label">{{ m.label }}</span>
        <span class="kpi-shine" aria-hidden="true" />
      </Motion>
    </div>

    <div class="ehero-orb" aria-hidden="true">
      <!-- Folder/page stack 3D mini-scene -->
      <span class="orb-ring r1" /><span class="orb-ring r2" /><span class="orb-ring r3" />
      <span class="orb-stack">
        <span class="os os3" /><span class="os os2" /><span class="os os1" />
      </span>
      <span class="orb-core"><ShieldCheck :size="26" /></span>
      <!-- Scanner beam crossing the orb -->
      <span class="orb-scan" />
      <span v-for="n in 5" :key="n" class="orb-particle" :style="particle(n)" />
    </div>
  </header>
</template>

<script setup>
import { Motion } from 'motion-v'
import { ShieldCheck } from 'lucide-vue-next'
import EdocCountUp from './EdocCountUp.vue'

const EASE = [0.16, 1, 0.3, 1]
defineProps({ metrics: { type: Array, default: () => [] }, loading: { type: Boolean, default: false } })
defineEmits(['go'])
const particle = (n) => ({ left: `${(n * 19 + 8) % 88}%`, top: `${(n * 31 + 14) % 78}%`, animationDelay: `${n * 0.6}s`, animationDuration: `${5 + (n % 3)}s` })
</script>

<style scoped>
.ehero {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 1.3fr 1.6fr 240px; align-items: center; gap: 22px;
  padding: 26px 28px; margin-bottom: 6px; border-radius: 24px;
  background: linear-gradient(135deg, rgba(26,22,30,0.7), rgba(14,13,18,0.78));
  border: 1px solid var(--hr-border-strong);
  backdrop-filter: blur(26px) saturate(150%); -webkit-backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 24px 56px -28px rgba(0,0,0,0.7);
}

/* Floating document sheets — Blender-style 3D paper motion */
.ehero-papers {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  perspective: 800px; z-index: 1;
}
.paper-sheet {
  position: absolute; width: 80px; height: 80px;
  opacity: 0.0; will-change: transform, opacity;
}
.paper-sheet rect {
  fill: rgba(255,250,240,0.95);
  stroke: rgba(251,191,36,0.6); stroke-width: 1.4;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,0.32));
}
.paper-sheet line { stroke: rgba(180,83,9,0.55); stroke-width: 2; stroke-linecap: round; }
.paper-sheet .paper-stamp {
  fill: rgba(239,68,68,0.18); stroke: rgba(220,38,38,0.7); stroke-width: 2; stroke-dasharray: 3 2;
}
.paper-sheet.ps1 { top: 8%;   right: 28%; animation: paper-orbit-a 16s ease-in-out infinite; transform-style: preserve-3d; }
.paper-sheet.ps2 { top: 55%;  right: 14%; animation: paper-orbit-b 19s ease-in-out infinite; transform-style: preserve-3d; }
.paper-sheet.ps3 { top: 28%;  right: 42%; animation: paper-orbit-c 22s ease-in-out infinite; transform-style: preserve-3d; }

@keyframes paper-orbit-a {
  0%   { transform: translate(0,0) rotate(-8deg) rotateY(0deg);   opacity: 0; }
  15%  { opacity: 0.55; }
  50%  { transform: translate(-20px,18px) rotate(6deg)  rotateY(180deg); opacity: 0.85; }
  85%  { opacity: 0.55; }
  100% { transform: translate(0,0) rotate(-8deg) rotateY(360deg);  opacity: 0; }
}
@keyframes paper-orbit-b {
  0%   { transform: translate(0,0) rotate(4deg)  rotateY(0deg);    opacity: 0; }
  20%  { opacity: 0.5; }
  50%  { transform: translate(14px,-24px) rotate(-12deg) rotateY(180deg); opacity: 0.8; }
  80%  { opacity: 0.5; }
  100% { transform: translate(0,0) rotate(4deg)  rotateY(360deg);   opacity: 0; }
}
@keyframes paper-orbit-c {
  0%   { transform: translate(0,0) rotate(-2deg) rotateY(0deg);    opacity: 0; }
  18%  { opacity: 0.45; }
  50%  { transform: translate(-10px,-12px) rotate(10deg) rotateY(180deg); opacity: 0.7; }
  82%  { opacity: 0.45; }
  100% { transform: translate(0,0) rotate(-2deg) rotateY(360deg);   opacity: 0; }
}

/* 3D folder stack mini-scene inside orb */
.orb-stack {
  position: absolute; inset: 0; display: grid; place-items: center;
  pointer-events: none;
}
.orb-stack .os {
  position: absolute; width: 78px; height: 78px; border-radius: 12px;
  border: 1.5px solid rgba(251,191,36,0.5);
  background: linear-gradient(135deg, rgba(255,250,240,0.94), rgba(251,191,36,0.18));
  box-shadow: 0 6px 16px -6px rgba(0,0,0,0.5);
}
.os.os1 { transform: translate(-12px,-10px) rotate(-7deg); animation: stack-shuffle-a 5.5s ease-in-out infinite; }
.os.os2 { transform: translate(0,0) rotate(0deg);  animation: stack-shuffle-b 5.5s ease-in-out infinite; }
.os.os3 { transform: translate(12px,10px) rotate(7deg); animation: stack-shuffle-c 5.5s ease-in-out infinite; }
@keyframes stack-shuffle-a {
  0%,100% { transform: translate(-12px,-10px) rotate(-7deg); }
  50%     { transform: translate(-16px,-14px) rotate(-12deg); }
}
@keyframes stack-shuffle-b {
  0%,100% { transform: translate(0,0) rotate(0deg); }
  50%     { transform: translate(0,-3px) rotate(2deg); }
}
@keyframes stack-shuffle-c {
  0%,100% { transform: translate(12px,10px) rotate(7deg); }
  50%     { transform: translate(16px,14px) rotate(12deg); }
}

/* Scanner beam sweeping the orb */
.orb-scan {
  position: absolute; left: 8%; right: 8%; top: 50%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(52,211,153,0.95), transparent);
  filter: blur(1px) drop-shadow(0 0 8px #34d399);
  animation: orb-scan-sweep 2.6s var(--edoc-ease) infinite;
}
@keyframes orb-scan-sweep {
  0%   { transform: translateY(-60px); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(60px); opacity: 0; }
}
.ehero-mesh { position: absolute; inset: -30%; pointer-events: none; opacity: 0.6;
  background: radial-gradient(38% 50% at 12% 10%, rgba(251,191,36,0.22), transparent 60%),
             radial-gradient(40% 55% at 95% 18%, rgba(251,146,60,0.2), transparent 60%),
             radial-gradient(45% 60% at 75% 100%, rgba(234,88,12,0.14), transparent 60%);
  animation: ehero-drift 18s ease-in-out infinite; }
.ehero-sheen { position: absolute; top: 0; bottom: 0; left: -30%; width: 30%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.08), transparent); transform: skewX(-16deg);
  animation: ehero-sheen 7s ease-in-out infinite; }
.ehero-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(120% 100% at 20% 0%, #000, transparent 72%); }

.ehero-lead { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 7px; }
.ehero-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #fde68a; }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; animation: edoc-glow-breathe 2.2s ease-in-out infinite; }
.ehero-title { margin: 2px 0 0; font-size: 34px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.02;
  background: linear-gradient(120deg, #fff 10%, #fcd34d 60%, #fb923c 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ehero-sub { margin: 0; font-size: 13px; color: #9ca3af; max-width: 360px; }

.ehero-kpis { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.kpi { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; cursor: pointer;
  padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  transition: border-color 0.25s var(--edoc-spring), background 0.25s var(--edoc-spring); }
.kpi:hover { border-color: var(--hr-accent-gold-border); background: rgba(251,191,36,0.07); }
.kpi-orb { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); box-shadow: 0 0 14px -4px var(--c); }
.kpi-val { font-size: 22px; font-weight: 800; color: #f5f5f7; line-height: 1; }
.kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #8b8b93; }
.kpi-shine { position: absolute; top: 0; bottom: 0; left: -60%; width: 50%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent); transform: skewX(-18deg); opacity: 0; }
.kpi:hover .kpi-shine { animation: kpi-shine 0.8s var(--edoc-ease); }

.ehero-orb { position: relative; z-index: 1; width: 100%; height: 168px; display: grid; place-items: center; }
.orb-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(251,191,36,0.22); }
.orb-ring.r1 { width: 80px; height: 80px; }
.orb-ring.r2 { width: 130px; height: 130px; border-style: dashed; border-color: rgba(251,191,36,0.18); animation: orb-spin 16s linear infinite; }
.orb-ring.r3 { width: 178px; height: 178px; border-color: rgba(251,146,60,0.12); animation: orb-spin 24s linear infinite reverse; }
.orb-core { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; color: #1a1410;
  background: var(--hr-gradient-rail-active); box-shadow: 0 0 30px -4px rgba(251,191,36,0.7); }
.orb-particle { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: ehero-particle linear infinite; }

@keyframes ehero-drift { 0%,100% { transform: translate(-3%,-2%) scale(1); } 50% { transform: translate(3%,2%) scale(1.07); } }
@keyframes ehero-sheen { 0%, 65% { transform: translateX(0) skewX(-16deg); } 100% { transform: translateX(520%) skewX(-16deg); } }
@keyframes kpi-shine { to { left: 130%; opacity: 1; } }
@keyframes orb-spin { to { transform: rotate(360deg); } }
@keyframes ehero-particle { 0% { transform: translateY(0); opacity: 0; } 25% { opacity: 0.9; } 75% { opacity: 0.9; } 100% { transform: translateY(-36px); opacity: 0; } }

@media (max-width: 1000px) { .ehero { grid-template-columns: 1fr; } .ehero-orb { display: none; } .ehero-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (prefers-reduced-motion: reduce) { .ehero-mesh, .ehero-sheen, .orb-ring, .orb-particle, .eb-dot { animation: none; } }

/* ────────────────────────────────────────────────────────────
   LIGHT THEME — warm cream parchment hero (not dark anymore).
   The hero becomes a luminous gold-cream stage so it harmonises
   with the rest of the workspace on light mode.
   ──────────────────────────────────────────────────────────── */
[data-theme="light"] .ehero {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251,191,36,0.18), transparent 60%),
    radial-gradient(50% 80% at 100% 100%, rgba(234,88,12,0.16), transparent 60%),
    linear-gradient(135deg, rgba(255,250,240,0.95), rgba(255,240,210,0.92));
  border-color: rgba(180,83,9,0.20);
  box-shadow:
    0 24px 56px -28px rgba(120,53,15,0.32),
    inset 0 1px 0 rgba(255,255,255,0.7);
}
[data-theme="light"] .ehero-mesh {
  background:
    radial-gradient(38% 50% at 12% 10%, rgba(251,191,36,0.32), transparent 60%),
    radial-gradient(40% 55% at 95% 18%, rgba(251,146,60,0.26), transparent 60%),
    radial-gradient(45% 60% at 75% 100%, rgba(234,88,12,0.20), transparent 60%);
}
[data-theme="light"] .ehero-sheen {
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent);
}
[data-theme="light"] .ehero-grid {
  background-image:
    linear-gradient(rgba(120,53,15,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,53,15,0.06) 1px, transparent 1px);
  opacity: 0.6;
}
[data-theme="light"] .ehero-eyebrow { color: #b45309; }
[data-theme="light"] .ehero-title {
  background: linear-gradient(120deg, #1a1410 5%, #b45309 55%, #ea580c 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .ehero-sub { color: #6b5840; }
[data-theme="light"] .kpi {
  background: rgba(255,250,240,0.7);
  border-color: rgba(180,83,9,0.16);
}
[data-theme="light"] .kpi:hover {
  border-color: rgba(217,119,6,0.42);
  background: rgba(255,243,220,0.85);
}
[data-theme="light"] .kpi-val { color: #1a1410; }
[data-theme="light"] .kpi-label { color: #8a6f4b; }
[data-theme="light"] .kpi-shine { background: linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent); }
[data-theme="light"] .orb-ring.r1 { border-color: rgba(180,83,9,0.32); }
[data-theme="light"] .orb-ring.r2 { border-color: rgba(180,83,9,0.28); }
[data-theme="light"] .orb-ring.r3 { border-color: rgba(234,88,12,0.22); }
[data-theme="light"] .orb-stack .os {
  border-color: rgba(180,83,9,0.55);
  background: linear-gradient(135deg, #ffffff, rgba(251,191,36,0.28));
  box-shadow: 0 6px 16px -6px rgba(120,53,15,0.35);
}
[data-theme="light"] .paper-sheet rect {
  fill: rgba(255,255,255,0.98);
  stroke: rgba(180,83,9,0.65);
  filter: drop-shadow(0 8px 18px rgba(120,53,15,0.25));
}
</style>
