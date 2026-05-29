<template>
  <aside class="edoc-dock" role="tablist" aria-label="Employee documents sections">
    <!-- Ambient atmospheric layers -->
    <div class="dock-atmosphere" aria-hidden="true">
      <div class="atm-grid" />
      <div class="atm-aurora" />
      <div class="atm-vault" />
      <!-- Vertically drifting paper particles -->
      <svg class="atm-papers" viewBox="0 0 80 1200" preserveAspectRatio="xMidYMid slice">
        <g v-for="n in 7" :key="n" :style="paperFloatStyle(n)">
          <rect class="atm-paper" :x="10+(n%3)*10" :y="(n*160)+20" width="14" height="18" rx="2" />
          <line :x1="13+(n%3)*10" :y1="(n*160)+26" :x2="21+(n%3)*10" :y2="(n*160)+26" class="atm-paper-line" />
          <line :x1="13+(n%3)*10" :y1="(n*160)+30" :x2="21+(n%3)*10" :y2="(n*160)+30" class="atm-paper-line" />
        </g>
      </svg>
    </div>

    <!-- Module brand: 3D folding folder + meta -->
    <header class="dock-brand" aria-hidden="true">
      <div class="brand-stack">
        <span class="bp bp3" />
        <span class="bp bp2" />
        <span class="bp bp1">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 4h6l2 2h6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M7 12h10M7 15h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="brand-seal" />
      </div>
      <div class="brand-meta">
        <span class="brand-eyebrow">VAULT</span>
        <span class="brand-name">Records</span>
      </div>
    </header>

    <!-- Rail body — grouped vertical items -->
    <nav class="dock-rail" ref="trackRef">
      <!-- Active "sheet" morphs vertically -->
      <span class="sheet" :style="sheetStyle" aria-hidden="true">
        <span class="sheet-paper" />
        <span class="sheet-fold" />
        <span class="sheet-scan" />
        <span class="sheet-sheen" />
        <span class="sheet-stamp">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </span>

      <template v-for="(grp, gi) in groupedTabs" :key="grp.key">
        <!-- Group header -->
        <header class="group-head">
          <span class="group-num">{{ String(gi + 1).padStart(2, '0') }}</span>
          <span class="group-label">{{ grp.label }}</span>
          <span class="group-rule" />
        </header>
        <ul class="group-items">
          <li v-for="t in grp.items" :key="t.key">
            <Motion
              as="button"
              :data-key="t.key"
              role="tab"
              type="button"
              :aria-selected="modelValue === t.key"
              :class="['paper-tab', modelValue === t.key && 'is-active', t.soon && 'is-soon']"
              :whileHover="modelValue === t.key ? {} : { x: 3 }"
              :whileTap="{ scale: 0.97 }"
              :transition="{ duration: 0.28, ease: EASE }"
              @click="select(t.key)"
            >
              <span class="pt-corner" aria-hidden="true">
                <svg viewBox="0 0 12 12">
                  <path d="M0 0 L12 0 L12 12 Z" />
                  <path d="M0 0 L12 12" />
                </svg>
              </span>
              <span class="pt-icon"><component :is="t.icon" :size="15" /></span>
              <span class="pt-label">{{ t.label }}</span>
              <span v-if="t.count" class="pt-count">{{ t.count > 99 ? '99+' : t.count }}</span>
              <span v-else-if="t.soon" class="pt-soon" />
            </Motion>
          </li>
        </ul>
      </template>
    </nav>

    <!-- Bottom scan ray -->
    <span class="dock-scan-line" aria-hidden="true" />
  </aside>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'

const EASE = [0.16, 1, 0.3, 1]
const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const sheetStyle = ref({ opacity: 0 })

const GROUP_LABEL = {
  overview: 'Navigation',
  docs: 'Documents',
  ops: 'Operations',
  system: 'System',
}

const groupedTabs = computed(() => {
  const order = []
  const map = {}
  for (const t of props.tabs) {
    if (!map[t.group]) {
      map[t.group] = { key: t.group, label: GROUP_LABEL[t.group] || t.group, items: [] }
      order.push(map[t.group])
    }
    map[t.group].items.push(t)
  }
  return order
})

const paperFloatStyle = (n) => ({
  animationDelay: `${n * 1.4}s`,
  animationDuration: `${22 + (n % 4) * 4}s`,
})

const recalc = () => nextTick(() => {
  const track = trackRef.value
  if (!track) return
  const el = track.querySelector(`[data-key="${props.modelValue}"]`)
  if (!el) return
  sheetStyle.value = {
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
    transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
    opacity: 1,
  }
  el.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
})

const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }

watch(() => props.modelValue, recalc)
watch(() => props.tabs.map(t => `${t.label}${t.count}`).join('|'), recalc)

let ro
onMounted(() => {
  recalc()
  if (trackRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(recalc); ro.observe(trackRef.value)
  }
  window.addEventListener('resize', recalc)
})
onBeforeUnmount(() => { ro?.disconnect(); window.removeEventListener('resize', recalc) })
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════
   EDOC DOCK — Vertical "Records Command Rail"
   Frosted-glass sidebar with document motion graphics.
   Active "sheet" morphs vertically between items, page-corner folds peel
   on hover, an active scanner beam + sheen sweep across the gold sheet,
   ambient drifting paper particles travel down the rail.
   ════════════════════════════════════════════════════════════════════ */

.edoc-dock {
  position: sticky; top: 128px;
  align-self: flex-start;
  flex-shrink: 0;
  width: 248px;
  max-height: calc(100vh - 144px);
  margin: 6px 18px 6px 0;
  display: flex; flex-direction: column;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(251,191,36,0.08), transparent 50%),
    radial-gradient(110% 60% at 100% 100%, rgba(251,146,60,0.06), transparent 55%),
    linear-gradient(180deg, rgba(28,26,32,0.86), rgba(16,15,18,0.82));
  border: 1px solid var(--hr-border-strong);
  backdrop-filter: blur(34px) saturate(170%);
  -webkit-backdrop-filter: blur(34px) saturate(170%);
  box-shadow:
    0 26px 60px -28px rgba(0,0,0,0.7),
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 -1px 0 rgba(255,255,255,0.02) inset;
  overflow: hidden;
  z-index: 4;
}

/* ── Atmosphere layers ── */
.dock-atmosphere {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  border-radius: 22px;
}
.atm-grid {
  position: absolute; inset: -6px;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 95%);
  -webkit-mask-image: radial-gradient(120% 80% at 50% 50%, #000 30%, transparent 95%);
  opacity: 0.4;
}
.atm-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 0%, rgba(251,191,36,0.18), transparent 60%),
    radial-gradient(60% 35% at 50% 100%, rgba(251,146,60,0.14), transparent 60%),
    radial-gradient(40% 25% at 100% 50%, rgba(234,88,12,0.10), transparent 60%);
  filter: blur(8px);
  animation: edoc-aurora-drift 22s ease-in-out infinite;
  opacity: 0.85;
}
.atm-vault {
  position: absolute; left: -30%; right: -30%; top: -50%; height: 200%;
  background: conic-gradient(from 220deg at 50% 50%, transparent 0deg, rgba(251,191,36,0.08) 30deg, transparent 60deg, transparent 360deg);
  animation: edoc-vault-spin 38s linear infinite;
  opacity: 0.55;
  mix-blend-mode: screen;
}
.atm-papers {
  position: absolute; inset: 0; width: 100%; height: 100%;
}
.atm-papers g { animation: edoc-paper-drift linear infinite; transform-origin: center; }
.atm-papers .atm-paper {
  fill: rgba(255,255,255,0.06);
  stroke: rgba(251,191,36,0.22); stroke-width: 0.6;
}
.atm-papers .atm-paper-line { stroke: rgba(251,191,36,0.4); stroke-width: 0.6; }

/* ── Brand header ── */
.dock-brand {
  position: relative; z-index: 4;
  display: flex; align-items: center; gap: 11px;
  padding: 16px 16px 14px;
  border-bottom: 1px dashed rgba(251,191,36,0.18);
}
.brand-stack {
  position: relative; width: 38px; height: 38px;
  display: grid; place-items: center;
  perspective: 600px;
}
.brand-stack .bp {
  position: absolute; inset: 0; border-radius: 9px;
  background: linear-gradient(135deg, rgba(251,191,36,0.16), rgba(251,146,60,0.12));
  border: 1px solid rgba(251,191,36,0.32);
  box-shadow: 0 4px 12px -4px rgba(251,146,60,0.45);
}
.brand-stack .bp1 {
  display: grid; place-items: center;
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #fb923c);
  color: #1a1410; border-color: rgba(255,255,255,0.4);
  animation: edoc-brand-flip 7s var(--edoc-spring) infinite;
  transform-style: preserve-3d;
}
.brand-stack .bp2 { transform: translate(3px, 3px) rotate(-3deg); opacity: 0.7; }
.brand-stack .bp3 { transform: translate(6px, 6px) rotate(-6deg); opacity: 0.4; }
.brand-stack .bp1 svg { width: 20px; height: 20px; }
.brand-seal {
  position: absolute; right: -3px; bottom: -3px;
  width: 12px; height: 12px; border-radius: 50%;
  background: radial-gradient(circle, #ef4444, #b91c1c);
  border: 1.5px solid #1a1410;
  box-shadow: 0 0 8px rgba(239,68,68,0.6);
  animation: edoc-seal-press 3.4s var(--edoc-spring) infinite;
}
.brand-meta { display: flex; flex-direction: column; line-height: 1; flex: 1; }
.brand-eyebrow {
  font-family: var(--hr-mono); font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase; color: #fbbf24;
}
.brand-name {
  margin-top: 4px; font-size: 14px; font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(120deg, #fff 10%, #fcd34d 60%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ── Rail body ── */
/* position: relative is required so the absolutely-positioned `sheet` indicator
   is anchored to (and scrolls with) the items list when the rail overflows. */
.dock-rail {
  position: relative; z-index: 2;
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 14px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.dock-rail::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* ── Group headers ── */
.group-head {
  display: grid; grid-template-columns: auto auto 1fr;
  align-items: center; gap: 8px;
  padding: 12px 4px 6px;
  position: relative; z-index: 3;
}
.group-num {
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 700; color: var(--hr-orange);
  letter-spacing: 0.5px;
}
.group-label {
  font-size: 9.5px; font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase; letter-spacing: 1.4px;
}
.group-rule {
  height: 1px;
  background: linear-gradient(90deg, rgba(251,191,36,0.3) 0%, rgba(255,255,255,0.04) 60%, transparent 100%);
}

.group-items {
  list-style: none; padding: 0; margin: 0 0 4px;
  display: flex; flex-direction: column; gap: 2px;
}

/* ── Tab = stylised page with peelable corner ── */
.paper-tab {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 11px;
  width: 100%; height: 36px;
  padding: 0 10px 0 13px;
  border: none; border-radius: 11px;
  background: transparent;
  color: var(--hr-text-muted);
  font-size: 12.5px; font-weight: 500;
  white-space: nowrap; cursor: pointer; text-align: left;
  font-family: inherit;
  transition: color 240ms var(--edoc-spring), padding-left 0.32s var(--edoc-spring);
  overflow: visible;
}
.paper-tab:hover { color: var(--hr-text-secondary); }
.paper-tab.is-active { color: #1a1410; font-weight: 700; padding-left: 16px; }

/* Page-corner fold */
.pt-corner {
  position: absolute; top: 0; left: 0;
  width: 9px; height: 9px;
  pointer-events: none;
  opacity: 0; transform: rotate(-90deg) scale(0.6); transform-origin: top left;
  transition: all 0.42s var(--edoc-spring);
}
.pt-corner svg { width: 100%; height: 100%; overflow: visible; }
.pt-corner svg path:first-child {
  fill: rgba(251,191,36,0.35);
  stroke: rgba(251,191,36,0.6); stroke-width: 0.7;
}
.pt-corner svg path:last-child { stroke: rgba(251,191,36,0.4); stroke-width: 0.6; }
.paper-tab:hover .pt-corner,
.paper-tab.is-active .pt-corner {
  opacity: 1; transform: rotate(0deg) scale(1);
}
.paper-tab.is-active .pt-corner svg path:first-child {
  fill: rgba(255,255,255,0.45);
  stroke: rgba(26,20,16,0.5);
}
.paper-tab.is-active .pt-corner svg path:last-child { stroke: rgba(26,20,16,0.6); }

.pt-icon {
  flex: 0 0 18px; width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.36s var(--edoc-spring), color 220ms var(--edoc-spring);
}
.pt-icon :deep(svg) { width: 15px; height: 15px; display: block; }
.paper-tab:hover .pt-icon { transform: rotate(-6deg) scale(1.08); }
.paper-tab.is-active .pt-icon { transform: rotate(-4deg) scale(1.14); color: #1a1410; }

.pt-label {
  flex: 1; overflow: hidden; text-overflow: ellipsis;
  transition: letter-spacing 0.32s var(--edoc-spring), transform 0.28s var(--edoc-spring);
}
.paper-tab.is-active .pt-label { letter-spacing: 0.02em; transform: translateX(1px); }

.pt-count {
  display: inline-grid; place-items: center;
  min-width: 18px; height: 16px; padding: 0 5px;
  font-family: var(--hr-mono);
  font-size: 9.5px; font-weight: 800; border-radius: 999px;
  background: var(--edoc-rejected); color: #fff;
  box-shadow: 0 0 0 2px rgba(16,15,18,0.6), 0 0 10px rgba(248,113,113,0.4);
  animation: edoc-count-pulse 2.4s ease-in-out infinite;
}
.paper-tab.is-active .pt-count {
  background: rgba(26,20,16,0.84); color: #fff;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
}
.pt-soon {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--hr-orange); box-shadow: 0 0 6px var(--hr-orange);
}

/* ── The morphing sheet (active background, now slides vertically) ── */
.sheet {
  position: absolute; top: 0; left: 0; z-index: 1;
  border-radius: 12px;
  background: transparent;
  transition:
    transform 520ms var(--edoc-ease),
    width 520ms var(--edoc-ease),
    height 520ms var(--edoc-ease),
    opacity 320ms ease;
  will-change: transform, width, height;
}
.sheet-paper {
  position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 38%, #f59e0b 70%, #fb923c 100%);
  background-size: 220% 220%;
  animation: edoc-sheet-flow 6s linear infinite;
  box-shadow:
    0 6px 18px -6px rgba(251,146,60,0.6),
    0 0 0 1px rgba(251,191,36,0.55),
    inset 0 1px 0 rgba(255,255,255,0.5),
    inset 0 -8px 12px -8px rgba(180,83,9,0.35);
}
.sheet-fold {
  position: absolute; top: 0; right: 0; width: 14px; height: 14px;
  background: linear-gradient(225deg, rgba(180,83,9,0.45) 0%, rgba(180,83,9,0.45) 50%, transparent 50%);
  border-top-right-radius: 12px;
  filter: drop-shadow(-1px 1px 1px rgba(0,0,0,0.18));
}
.sheet-fold::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(225deg, rgba(255,255,255,0.5) 50%, transparent 50%);
  border-top-right-radius: 12px;
}
.sheet-scan {
  position: absolute; top: 0; bottom: 0; left: 0; width: 18%;
  border-radius: 12px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  filter: blur(1px);
  animation: edoc-scan-sweep 2.4s var(--edoc-ease) infinite;
  mix-blend-mode: overlay;
}
.sheet-sheen {
  position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.32) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: edoc-sheen-sweep 4.2s var(--edoc-ease) infinite;
  mix-blend-mode: screen;
}
.sheet-stamp {
  position: absolute; right: 8px; bottom: 5px;
  width: 13px; height: 13px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: rgba(180,83,9,0.18); color: rgba(120,53,15,0.85);
  border: 1px dashed rgba(180,83,9,0.55);
  animation: edoc-stamp-press 4s ease-in-out infinite;
}
.sheet-stamp svg { width: 9px; height: 9px; }

/* ── Bottom scanner ray ── */
.dock-scan-line {
  position: absolute; left: 0; right: 0; bottom: 0; height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.7), rgba(251,146,60,0.9), rgba(251,191,36,0.7), transparent);
  background-size: 30% 100%;
  animation: edoc-scanbar 8s linear infinite;
  z-index: 5; pointer-events: none;
  filter: blur(0.3px) drop-shadow(0 0 6px rgba(251,146,60,0.4));
}

/* ── Keyframes ── */
@keyframes edoc-aurora-drift {
  0%, 100% { transform: translate(-4%, -2%) scale(1); }
  50%      { transform: translate(4%, 3%) scale(1.07); }
}
@keyframes edoc-vault-spin { to { transform: rotate(360deg); } }
@keyframes edoc-paper-drift {
  0%   { transform: translateY(-100px) translateX(0) rotate(-4deg); opacity: 0; }
  10%  { opacity: 0.7; }
  50%  { transform: translateY(50vh) translateX(6px) rotate(8deg); opacity: 0.8; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(110vh) translateX(-2px) rotate(-2deg); opacity: 0; }
}
@keyframes edoc-brand-flip {
  0%, 86%, 100% { transform: rotateY(0deg); }
  90%           { transform: rotateY(-180deg); }
  93%           { transform: rotateY(-180deg); }
}
@keyframes edoc-seal-press {
  0%, 100% { transform: scale(1);    box-shadow: 0 0 8px rgba(239,68,68,0.6); }
  50%      { transform: scale(1.18); box-shadow: 0 0 14px rgba(239,68,68,0.85); }
}
@keyframes edoc-sheet-flow { 0% { background-position: 0% 50%; } 100% { background-position: 220% 50%; } }
@keyframes edoc-scan-sweep {
  0%   { left: -20%;  opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { left: 110%;  opacity: 0; }
}
@keyframes edoc-sheen-sweep {
  0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
  40%  { opacity: 0.7; }
  100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
}
@keyframes edoc-stamp-press {
  0%, 88%, 100% { transform: scale(1) rotate(0deg); }
  92%           { transform: scale(1.32) rotate(-8deg); }
  96%           { transform: scale(1.1)  rotate(-3deg); }
}
@keyframes edoc-count-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
@keyframes edoc-scanbar {
  0%   { background-position: -30% 0; }
  100% { background-position: 130% 0; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .atm-aurora, .atm-vault, .atm-papers g,
  .sheet-paper, .sheet-scan, .sheet-sheen, .sheet-stamp,
  .brand-stack .bp1, .brand-seal, .pt-count, .dock-scan-line {
    animation: none !important;
  }
  .paper-tab, .pt-corner, .pt-icon, .pt-label { transition: none !important; }
}

/* ════════════════════════════════════════════════════════════════════
   LIGHT THEME — warm cream parchment with gold accents
   ════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .edoc-dock {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(217,119,6,0.10), transparent 50%),
    radial-gradient(110% 60% at 100% 100%, rgba(234,88,12,0.08), transparent 55%),
    linear-gradient(180deg, rgba(255,250,240,0.92), rgba(255,246,232,0.88));
  border-color: rgba(180,83,9,0.20);
  box-shadow:
    0 26px 60px -28px rgba(120,53,15,0.32),
    0 1px 0 rgba(255,255,255,0.70) inset,
    0 -1px 0 rgba(180,83,9,0.05) inset;
}
[data-theme="light"] .atm-grid {
  background-image:
    linear-gradient(rgba(120,53,15,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,53,15,0.07) 1px, transparent 1px);
}
[data-theme="light"] .atm-aurora {
  background:
    radial-gradient(50% 30% at 50% 0%, rgba(251,191,36,0.22), transparent 60%),
    radial-gradient(60% 35% at 50% 100%, rgba(251,146,60,0.18), transparent 60%),
    radial-gradient(40% 25% at 100% 50%, rgba(234,88,12,0.14), transparent 60%);
}
[data-theme="light"] .atm-vault { mix-blend-mode: multiply; opacity: 0.35; }
[data-theme="light"] .atm-papers .atm-paper {
  fill: rgba(255,250,240,0.92); stroke: rgba(180,83,9,0.4);
}
[data-theme="light"] .atm-papers .atm-paper-line { stroke: rgba(180,83,9,0.55); }

[data-theme="light"] .dock-brand { border-bottom-color: rgba(180,83,9,0.24); }
[data-theme="light"] .brand-eyebrow { color: #b45309; }
[data-theme="light"] .brand-name {
  background: linear-gradient(120deg, #1a1410 5%, #b45309 55%, #ea580c 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .brand-stack .bp {
  background: linear-gradient(135deg, rgba(255,250,240,0.9), rgba(255,235,200,0.8));
  border-color: rgba(180,83,9,0.32);
  box-shadow: 0 4px 12px -4px rgba(180,83,9,0.32);
}
[data-theme="light"] .brand-stack .bp1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #fb923c);
  border-color: rgba(255,255,255,0.7);
}
[data-theme="light"] .brand-seal { border-color: #faf7f0; }

[data-theme="light"] .group-num { color: #c2410c; }
[data-theme="light"] .group-label { color: #92400e; }
[data-theme="light"] .group-rule {
  background: linear-gradient(90deg, rgba(180,83,9,0.45) 0%, rgba(40,25,10,0.08) 60%, transparent 100%);
}

[data-theme="light"] .paper-tab { color: #6b5840; }
[data-theme="light"] .paper-tab:hover { color: #44362a; }
[data-theme="light"] .paper-tab.is-active { color: #3a2810; }

[data-theme="light"] .pt-corner svg path:first-child {
  fill: rgba(217,119,6,0.4); stroke: rgba(180,83,9,0.65);
}
[data-theme="light"] .pt-corner svg path:last-child { stroke: rgba(180,83,9,0.55); }

[data-theme="light"] .sheet-paper {
  box-shadow:
    0 6px 18px -6px rgba(180,83,9,0.5),
    0 0 0 1px rgba(180,83,9,0.42),
    inset 0 1px 0 rgba(255,255,255,0.6),
    inset 0 -8px 12px -8px rgba(120,53,15,0.32);
}
[data-theme="light"] .pt-count {
  box-shadow: 0 0 0 2px rgba(255,250,240,0.85), 0 0 10px rgba(220,38,38,0.35);
}
[data-theme="light"] .paper-tab.is-active .pt-count {
  background: rgba(120,53,15,0.86);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
}
[data-theme="light"] .dock-scan-line {
  background: linear-gradient(90deg, transparent, rgba(217,119,6,0.7), rgba(234,88,12,0.85), rgba(217,119,6,0.7), transparent);
  background-size: 30% 100%;
  filter: blur(0.3px) drop-shadow(0 0 6px rgba(217,119,6,0.4));
}
</style>
