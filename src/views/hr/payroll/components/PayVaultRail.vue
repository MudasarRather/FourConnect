<template>
  <aside class="vault-rail" role="tablist" aria-label="Payroll sections">
    <!-- ════════════════════════════════════════════════════════════
         Atmosphere — a vault interior: warm bullion aurora, a ledger
         grid, a vertical "gold-pour" stream down the right seam, and
         slow-drifting bullion dust. Deliberately NOT the attendance
         clock-tick rain — this is the Mint.
         ════════════════════════════════════════════════════════════ -->
    <div class="vr-atmos" aria-hidden="true">
      <span class="vr-grid" />
      <span class="vr-aurora" />
      <span class="vr-pour" />
      <span v-for="d in DUST" :key="d.i" class="vr-dust" :style="d.style" />
    </div>

    <!-- ════════════════════════════════════════════════════════════
         Brand — a rotating vault combination dial (concentric minted
         rings + a ₹ boss). Counter-rotating rings + a glint sweep.
         ════════════════════════════════════════════════════════════ -->
    <header class="vr-brand">
      <div class="vr-dial">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <radialGradient id="vrBoss" cx="38%" cy="32%">
              <stop offset="0%" stop-color="#fff4d6" />
              <stop offset="48%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#9a6a08" />
            </radialGradient>
            <linearGradient id="vrRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fde68a" />
              <stop offset="100%" stop-color="#b8860b" />
            </linearGradient>
          </defs>
          <!-- outer notch ring (spins) -->
          <g class="vr-ring-out">
            <circle cx="24" cy="24" r="21" fill="none" stroke="url(#vrRing)" stroke-width="2" opacity="0.85" />
            <line v-for="n in 24" :key="'o'+n"
              :x1="24 + 21 * Math.cos((n-1)*(Math.PI/12))" :y1="24 + 21 * Math.sin((n-1)*(Math.PI/12))"
              :x2="24 + (n%6===0?16:18.5) * Math.cos((n-1)*(Math.PI/12))" :y2="24 + (n%6===0?16:18.5) * Math.sin((n-1)*(Math.PI/12))"
              :stroke="n%6===0 ? '#fde68a' : 'rgba(251,191,36,0.55)'" :stroke-width="n%6===0?1.6:1" stroke-linecap="round" />
          </g>
          <!-- inner ring (counter-spins) -->
          <g class="vr-ring-in">
            <circle cx="24" cy="24" r="13" fill="none" stroke="rgba(253,230,138,0.6)" stroke-width="1.2" stroke-dasharray="3 3" />
          </g>
          <!-- center boss -->
          <circle cx="24" cy="24" r="9" fill="url(#vrBoss)" stroke="rgba(255,255,255,0.55)" stroke-width="1" />
          <text x="24" y="29" text-anchor="middle" font-size="12" font-weight="800" fill="#5a3c05">₹</text>
        </svg>
        <span class="vr-dial-glint" />
      </div>
      <div class="vr-brand-meta">
        <span class="vr-eyebrow">THE · MINT</span>
        <span class="vr-name">Treasury</span>
        <span class="vr-fy" v-if="fyLabel">FY {{ fyLabel }}</span>
      </div>
    </header>

    <!-- ════════════════════════════════════════════════════════════
         Rail — grouped vault tabs with a morphing minted-ingot
         active indicator that slides on a spring.
         ════════════════════════════════════════════════════════════ -->
    <nav class="vr-body" ref="trackRef">
      <span class="ingot" :style="ingotStyle" aria-hidden="true">
        <span class="ingot-face" />
        <span class="ingot-sheen" />
        <span class="ingot-stamp">₹</span>
      </span>

      <template v-for="(grp, gi) in groupedTabs" :key="grp.key">
        <div class="vr-group-head">
          <span class="vg-num">{{ romanize(gi + 1) }}</span>
          <span class="vg-label">{{ grp.label }}</span>
          <span class="vg-rule" />
        </div>
        <ul class="vr-group">
          <li v-for="t in grp.items" :key="t.key">
            <Motion as="button" type="button" role="tab"
              :data-key="t.key"
              :aria-selected="modelValue === t.key"
              :class="['vault-tab', modelValue === t.key && 'is-active', t.phaseA === false && 'is-soon']"
              :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.34, delay: Math.min(t._idx * 0.018, 0.4), ease: EASE }"
              :whileHover="modelValue === t.key ? {} : { x: 3 }"
              :whileTap="{ scale: 0.975 }"
              @click="select(t.key)">
              <span class="vt-coin" aria-hidden="true">
                <span class="vt-coin-face"><component :is="t.icon" :size="13" /></span>
              </span>
              <span class="vt-label">{{ t.label }}</span>
              <span v-if="t.phaseA === false" class="vt-soon">soon</span>
            </Motion>
          </li>
        </ul>
      </template>
    </nav>

    <!-- ════════════════════════════════════════════════════════════
         Footer — live "net this run" bullion ticker.
         ════════════════════════════════════════════════════════════ -->
    <footer class="vr-foot">
      <span class="vf-dot" />
      <div class="vf-meta">
        <span class="vf-lbl">Net · this run</span>
        <PayMoneyValue class="vf-val" :value="stats?.current_net || 0" short tone="net" />
      </div>
      <span class="vf-head" v-if="(stats?.employees_on_payroll ?? null) !== null">{{ stats.employees_on_payroll }}<small>on roll</small></span>
    </footer>
  </aside>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import PayMoneyValue from './PayMoneyValue.vue'

const EASE = [0.16, 1, 0.3, 1]

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  stats: { type: Object, default: null },
  fyLabel: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

// ── Group config (payroll's own taxonomy — distinct from attendance) ──
const GROUPS = {
  overview:  { order: 1, label: 'Overview' },
  design:    { order: 2, label: 'Pay Design' },
  run:       { order: 3, label: 'Pay Run' },
  payout:    { order: 4, label: 'Payout' },
  comp:      { order: 5, label: 'Adjustments' },
  statutory: { order: 6, label: 'Statutory' },
  system:    { order: 7, label: 'System' },
}
const groupedTabs = computed(() => {
  const map = {}
  let idx = 0
  for (const t of props.tabs) {
    const g = t.group || 'system'
    if (!map[g]) map[g] = { key: g, label: GROUPS[g]?.label || g, order: GROUPS[g]?.order || 99, items: [] }
    map[g].items.push({ ...t, _idx: idx++ })
  }
  return Object.values(map).sort((a, b) => a.order - b.order)
})

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const romanize = (n) => ROMAN[n] || String(n)

// ── Drifting bullion dust (deterministic, index-seeded) ──
const DUST = Array.from({ length: 9 }, (_, i) => {
  const left = (i * 41) % 92 + 4
  const delay = (i * 1.7) % 11
  const dur = 9 + (i % 4) * 2.4
  const size = 2 + (i % 3)
  return { i, style: {
    left: left + '%', width: size + 'px', height: size + 'px',
    animationDelay: '-' + delay.toFixed(2) + 's', animationDuration: dur.toFixed(1) + 's',
  } }
})

// ── Morphing ingot indicator ──
const trackRef = ref(null)
const ingotStyle = ref({ opacity: 0 })
const recalc = () => nextTick(() => {
  const track = trackRef.value
  if (!track) return
  const el = track.querySelector(`[data-key="${props.modelValue}"]`)
  if (!el) { ingotStyle.value = { opacity: 0 }; return }
  ingotStyle.value = {
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
    transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
    opacity: 1,
  }
  el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
})
const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }

let ro
watch(() => props.modelValue, recalc)
watch(() => props.tabs.length, recalc)
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
   PAY VAULT RAIL — "The Mint Spine"
   A vertical treasury console. Identity: minted ingots, vault dial,
   gold-pour seam, bullion dust. No clock-ticks, no punch tickets.
   ════════════════════════════════════════════════════════════════════ */
.vault-rail {
  position: sticky; top: 16px; align-self: flex-start; flex-shrink: 0;
  width: 256px; max-height: calc(100vh - 32px);
  display: flex; flex-direction: column;
  border-radius: 24px; overflow: hidden; z-index: 6;
  background:
    radial-gradient(130% 50% at 100% 0%, rgba(251,191,36,0.12), transparent 55%),
    radial-gradient(120% 50% at 0% 100%, rgba(234,88,12,0.10), transparent 55%),
    linear-gradient(180deg, rgba(26,20,12,0.92), rgba(16,12,8,0.90));
  border: 1px solid rgba(251,191,36,0.22);
  backdrop-filter: blur(30px) saturate(165%);
  -webkit-backdrop-filter: blur(30px) saturate(165%);
  box-shadow: 0 30px 70px -32px rgba(0,0,0,0.8),
    inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(251,191,36,0.04);
}

/* ── atmosphere ── */
.vr-atmos { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 24px; }
.vr-grid {
  position: absolute; inset: -4px;
  background-image:
    linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 100% 30px, 30px 100%;
  mask-image: radial-gradient(130% 75% at 50% 40%, #000 35%, transparent 92%);
  -webkit-mask-image: radial-gradient(130% 75% at 50% 40%, #000 35%, transparent 92%);
  opacity: 0.5;
}
.vr-aurora {
  position: absolute; inset: -35%;
  background:
    radial-gradient(45% 28% at 70% 4%, rgba(251,191,36,0.26), transparent 60%),
    radial-gradient(55% 32% at 30% 100%, rgba(234,88,12,0.18), transparent 60%),
    radial-gradient(38% 22% at 0% 45%, rgba(184,134,11,0.16), transparent 60%);
  filter: blur(10px);
  animation: pay-aurora-drift 22s ease-in-out infinite;
}
/* vertical molten "gold pour" down the right seam */
.vr-pour {
  position: absolute; top: 0; bottom: 0; right: 0; width: 2px;
  background: linear-gradient(180deg, transparent, rgba(253,230,138,0.85) 18%, rgba(245,158,11,0.95) 50%, rgba(253,230,138,0.85) 82%, transparent);
  background-size: 100% 200%;
  animation: pay-gold-pour 5.5s linear infinite;
  filter: drop-shadow(0 0 6px rgba(245,158,11,0.55));
}
.vr-dust {
  position: absolute; top: 0; border-radius: 50%;
  background: radial-gradient(circle, #fde68a, rgba(245,158,11,0.2));
  box-shadow: 0 0 5px rgba(251,191,36,0.8);
  animation: pay-dust-fall linear infinite;
}

/* ── brand ── */
.vr-brand {
  position: relative; z-index: 3; display: flex; align-items: center; gap: 12px;
  padding: 17px 16px 15px; border-bottom: 1px solid rgba(251,191,36,0.16);
}
.vr-dial { position: relative; width: 46px; height: 46px; flex-shrink: 0;
  filter: drop-shadow(0 6px 16px rgba(245,158,11,0.45)); }
.vr-dial svg { width: 46px; height: 46px; display: block; }
.vr-ring-out { transform-origin: 24px 24px; animation: pay-dial-spin 36s linear infinite; }
.vr-ring-in  { transform-origin: 24px 24px; animation: pay-dial-spin-rev 18s linear infinite; }
.vr-dial-glint {
  position: absolute; inset: 0; border-radius: 50%;
  background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
  mix-blend-mode: screen; opacity: 0; animation: pay-edge-scan 6s ease-in-out infinite;
}
.vr-brand-meta { display: flex; flex-direction: column; line-height: 1; min-width: 0; }
.vr-eyebrow { font-family: var(--pay-mono); font-size: 8px; font-weight: 700; letter-spacing: 0.28em; color: var(--pay-mint); }
.vr-name {
  margin-top: 5px; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(100deg, #fff6e0 10%, #fbbf24 45%, #fff6e0 60%, #f59e0b 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: pay-foil-text 7s linear infinite;
}
.vr-fy { margin-top: 4px; font-family: var(--pay-mono); font-size: 9px; color: var(--pay-text-muted); letter-spacing: 0.08em; }

/* ── rail body ── */
.vr-body {
  position: relative; z-index: 2; flex: 1; overflow-y: auto;
  padding: 8px 11px 14px; scrollbar-width: none;
}
.vr-body::-webkit-scrollbar { width: 0; display: none; }

.vr-group-head { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 8px; padding: 13px 4px 6px; }
.vg-num { font-family: var(--pay-mono); font-size: 9px; font-weight: 700; color: var(--pay-treasury); letter-spacing: 0.5px; }
.vg-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--pay-text-muted); }
.vg-rule { height: 1px; background: linear-gradient(90deg, rgba(251,191,36,0.32), rgba(255,255,255,0.04) 60%, transparent); }

.vr-group { list-style: none; margin: 0 0 4px; padding: 0; display: flex; flex-direction: column; gap: 2px; }

/* ── vault tab ── */
.vault-tab {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 11px;
  width: 100%; height: 38px; padding: 0 12px 0 8px;
  border: none; border-radius: 12px; background: transparent;
  color: var(--pay-text-2); font-size: 12.5px; font-weight: 500; font-family: inherit;
  text-align: left; white-space: nowrap; cursor: pointer;
  transition: color 0.26s var(--pay-ease);
}
.vault-tab:hover { color: var(--pay-text); }
.vault-tab.is-active { color: #2a1c06; font-weight: 700; }

/* leading mint coin */
.vt-coin { flex: 0 0 24px; width: 24px; height: 24px; display: grid; place-items: center; }
.vt-coin-face {
  width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  color: var(--pay-treasury);
  background: radial-gradient(circle at 35% 30%, rgba(251,191,36,0.18), rgba(184,134,11,0.05));
  border: 1px solid rgba(251,191,36,0.22);
  transition: transform 0.4s var(--pay-spring), color 0.26s, border-color 0.26s, background 0.26s;
}
.vault-tab:hover .vt-coin-face { transform: rotate(-8deg) scale(1.05); border-color: rgba(251,191,36,0.4); }
.vault-tab.is-active .vt-coin-face {
  color: #3a2706;
  background: radial-gradient(circle at 35% 30%, #fff4d6, #f59e0b 70%, #b8860b);
  border-color: rgba(255,255,255,0.55);
  box-shadow: 0 3px 10px -3px rgba(245,158,11,0.7), inset 0 1px 2px rgba(255,255,255,0.6);
  animation: pay-coin-mint 0.55s var(--pay-spring);
}
.vt-label { flex: 1; overflow: hidden; text-overflow: ellipsis; transition: letter-spacing 0.3s var(--pay-ease); }
.vault-tab.is-active .vt-label { letter-spacing: 0.01em; }
.vt-soon {
  font-family: var(--pay-mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 2px 5px; border-radius: 5px; background: rgba(251,191,36,0.14); color: var(--pay-treasury);
}
.vault-tab.is-active .vt-soon { background: rgba(42,28,6,0.2); color: #3a2706; }

/* ── morphing minted ingot ── */
.ingot {
  position: absolute; top: 0; left: 0; z-index: 1; border-radius: 12px;
  transition: transform 0.56s var(--pay-spring), width 0.5s var(--pay-spring), height 0.5s var(--pay-spring), opacity 0.3s ease;
  will-change: transform, width, height; overflow: hidden;
}
.ingot-face {
  position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 40%, #f59e0b 72%, #ea9b1a 100%);
  box-shadow:
    0 8px 22px -8px rgba(245,158,11,0.75),
    inset 0 1px 0 rgba(255,255,255,0.7),
    inset 0 -7px 12px -8px rgba(154,106,8,0.6),
    inset 2px 0 0 rgba(255,255,255,0.35), inset -2px 0 0 rgba(154,106,8,0.4);
}
.ingot-sheen {
  position: absolute; top: -20%; bottom: -20%; left: 0; width: 32%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
  animation: pay-ingot-sheen 4.4s ease-in-out infinite; mix-blend-mode: screen; pointer-events: none;
}
.ingot-stamp {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%) rotate(-11deg);
  font-family: var(--pay-mono); font-weight: 800; font-size: 12px; color: rgba(90,60,5,0.55);
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
}

/* ── footer ── */
.vr-foot {
  position: relative; z-index: 3; display: flex; align-items: center; gap: 9px;
  padding: 12px 14px 14px; border-top: 1px solid rgba(251,191,36,0.16);
}
.vf-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: var(--pay-net); box-shadow: 0 0 9px var(--pay-net); animation: pay-dot-pulse 2.2s ease-in-out infinite; }
.vf-meta { display: flex; flex-direction: column; line-height: 1.15; flex: 1; min-width: 0; }
.vf-lbl { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-text-muted); }
.vf-val { font-size: 15px; }
.vf-head { display: flex; flex-direction: column; align-items: flex-end; line-height: 1;
  font-family: var(--pay-mono); font-size: 15px; font-weight: 800; color: var(--pay-text); }
.vf-head small { font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pay-text-muted); margin-top: 2px; }

/* ── responsive: collapse to horizontal strip ── */
@media (max-width: 900px) {
  .vault-rail { position: relative; top: 0; width: 100%; max-height: none; margin-bottom: 14px; }
  .vr-pour, .vr-dust { display: none; }
  .vr-body { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; padding: 10px; }
  .vr-group-head { display: none; }
  .vr-group { flex-direction: row; flex-wrap: wrap; }
  .ingot { display: none; }
  .vault-tab { width: auto; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
  .vault-tab.is-active { background: var(--pay-grad-cta); }
  .vt-label { display: none; }
}

/* ── reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .vr-aurora, .vr-pour, .vr-dust, .vr-ring-out, .vr-ring-in, .vr-dial-glint,
  .vr-name, .ingot-sheen, .vf-dot, .vault-tab.is-active .vt-coin-face { animation: none !important; }
  .ingot, .vt-coin-face, .vault-tab { transition: opacity 0.2s !important; }
}

/* ════════════════════════════════ LIGHT THEME ════════════════════════════════ */
[data-theme="light"] .vault-rail {
  background:
    radial-gradient(130% 50% at 100% 0%, rgba(217,119,6,0.14), transparent 55%),
    radial-gradient(120% 50% at 0% 100%, rgba(234,88,12,0.10), transparent 55%),
    linear-gradient(180deg, rgba(255,250,240,0.95), rgba(255,246,232,0.92));
  border-color: rgba(184,83,9,0.26);
  box-shadow: 0 30px 70px -32px rgba(120,53,15,0.34),
    inset 0 1px 0 rgba(255,255,255,0.7);
}
[data-theme="light"] .vr-grid {
  background-image:
    linear-gradient(rgba(120,53,15,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,53,15,0.07) 1px, transparent 1px);
}
[data-theme="light"] .vr-brand,
[data-theme="light"] .vr-foot { border-color: rgba(184,83,9,0.22); }
[data-theme="light"] .vr-eyebrow { color: #b45309; }
[data-theme="light"] .vr-name {
  background: linear-gradient(100deg, #2a1c06 8%, #b45309 45%, #92400e 60%, #ea580c 90%);
  background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .vault-tab { color: #6b5840; }
[data-theme="light"] .vault-tab:hover { color: #3a2706; }
[data-theme="light"] .vault-tab.is-active { color: #3a2706; }
[data-theme="light"] .vt-coin-face { color: #b45309; border-color: rgba(184,83,9,0.28); }
[data-theme="light"] .vault-tab.is-active .vt-coin-face { color: #3a2706; }
[data-theme="light"] .vg-label { color: #92400e; }
[data-theme="light"] .vg-num { color: #c2410c; }
[data-theme="light"] .ingot-face {
  box-shadow: 0 8px 22px -8px rgba(184,83,9,0.6), inset 0 1px 0 rgba(255,255,255,0.8),
    inset 0 -7px 12px -8px rgba(120,53,15,0.5), inset 2px 0 0 rgba(255,255,255,0.5), inset -2px 0 0 rgba(120,53,15,0.4);
}
[data-theme="light"] .vf-head { color: #2a1c06; }
</style>
