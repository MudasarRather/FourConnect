<template>
  <div class="cot" ref="rootEl">
    <div class="cot-grain trn-grain" aria-hidden="true" />

    <svg class="cot-svg" :viewBox="`0 0 ${VB} ${VB}`" role="img" aria-label="Certification expiry radar">
      <defs>
        <radialGradient id="cotCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--trn-cert-expired)" stop-opacity="0.42" />
          <stop offset="70%" stop-color="var(--trn-cert-expired)" stop-opacity="0.06" />
          <stop offset="100%" stop-color="var(--trn-cert-expired)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- faint expired core -->
      <circle :cx="C" :cy="C" :r="rings[0] * 0.6" fill="url(#cotCore)" />

      <!-- orbit rings -->
      <circle v-for="(r, i) in rings" :key="'ring' + i" :cx="C" :cy="C" :r="r"
        fill="none" stroke="var(--trn-grid-line)" stroke-width="1"
        :stroke-dasharray="i === 2 ? '0' : '3 5'" />
      <!-- spokes -->
      <line v-for="a in spokeAngles" :key="'sp' + a" :x1="C" :y1="C"
        :x2="C + Math.cos(a) * rings[2]" :y2="C + Math.sin(a) * rings[2]"
        stroke="var(--trn-grid-line)" stroke-width="1" />

      <!-- cert dots -->
      <g v-for="d in dots" :key="d.id">
        <circle :cx="d.x" :cy="d.y" :r="d.r + 4" :fill="d.color" opacity="0.16" />
        <circle class="cot-dot" :cx="d.x" :cy="d.y" :r="d.r" :fill="d.color"
          @pointerenter="hover(d, $event)" @pointermove="moveTip"
          @pointerleave="active = null" />
      </g>
    </svg>

    <!-- radar sweep (decorative, reduced-motion safe) -->
    <div class="cot-sweep" aria-hidden="true" />

    <!-- center label -->
    <div class="cot-center">
      <span class="cot-center-val trn-mono">{{ certs.length }}</span>
      <span class="cot-center-lbl">on watch</span>
    </div>

    <!-- legend -->
    <div class="cot-legend">
      <span><i class="ld" style="background: var(--trn-cert-expired)" /> Expired</span>
      <span><i class="ld" style="background: var(--trn-cert-expiring)" /> ≤30d</span>
      <span><i class="ld" style="background: var(--trn-core)" /> ≤90d</span>
      <span><i class="ld" style="background: var(--trn-cert-active)" /> 90d+</span>
    </div>

    <!-- floating tooltip -->
    <Teleport to="body">
      <div v-if="active" class="cot-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
        <strong>{{ active.name }}</strong>
        <span>{{ active.employee }}</span>
        <span class="cot-tip-days" :class="active.tone">{{ active.daysLabel }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  certs: { type: Array, default: () => [] },
})

const VB = 320
const C = VB / 2
// ring radii: outer (90+), middle (≤90), inner (≤30); expired collapses to core.
const rings = [54, 96, 138]
const spokeAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3]

const colorFor = (days) => {
  if (days === null || days === undefined) return 'var(--trn-cert-active)'
  if (days < 0) return 'var(--trn-cert-expired)'
  if (days <= 30) return 'var(--trn-cert-expiring)'
  if (days <= 90) return 'var(--trn-core)'
  return 'var(--trn-cert-active)'
}
const ringFor = (days) => {
  if (days === null || days === undefined) return rings[2]
  if (days < 0) return 28               // pulled into the expired core
  if (days <= 30) return rings[0]
  if (days <= 90) return rings[1]
  return rings[2]
}
const toneFor = (days) => {
  if (days === null || days === undefined) return 'ok'
  if (days < 0) return 'danger'
  if (days <= 30) return 'warn'
  if (days <= 90) return 'soon'
  return 'ok'
}
const daysLabel = (days) => {
  if (days === null || days === undefined) return 'No expiry set'
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  return `Expires in ${days}d`
}

const dots = computed(() => {
  const arr = props.certs || []
  const n = Math.max(arr.length, 1)
  // golden-angle spread so dots don't stack on a single spoke.
  const GA = 2.399963
  return arr.map((c, i) => {
    const days = c.days_to_expiry === undefined ? null : c.days_to_expiry
    const ringR = ringFor(days)
    const angle = i * GA + (days < 0 ? 0.6 : 0)
    // small deterministic jitter on radius so co-ring dots separate visually.
    const jitter = ((i * 37) % 11) - 5
    const r = Math.max(8, ringR + jitter)
    return {
      id: c.id ?? i,
      x: C + Math.cos(angle) * r,
      y: C + Math.sin(angle) * r,
      r: days !== null && days < 0 ? 5 : 4.5,
      color: colorFor(days),
      name: c.name || 'Certification',
      employee: c.employee_name || '—',
      daysLabel: daysLabel(days),
      tone: toneFor(days),
    }
  })
})

const rootEl = ref(null)
const active = ref(null)
const tip = ref({ x: 0, y: 0 })

const hover = (d, e) => { active.value = d; moveTip(e) }
const moveTip = (e) => { tip.value = { x: e.clientX + 14, y: e.clientY + 14 } }
</script>

<style scoped>
.cot { position: relative; aspect-ratio: 1; width: 100%; max-width: 380px; margin: 0 auto; }
.cot-grain { z-index: 0; border-radius: 50%; }
.cot-svg { position: relative; z-index: 1; width: 100%; height: 100%; overflow: visible; }
.cot-dot { cursor: pointer; transition: r 0.2s var(--trn-spring); filter: drop-shadow(0 0 5px currentColor); }
.cot-dot:hover { r: 7; }

.cot-sweep { position: absolute; inset: 0; z-index: 1; border-radius: 50%; pointer-events: none;
  background: var(--trn-grad-sweep); animation: trn-radar-sweep 7s linear infinite; opacity: 0.5; mix-blend-mode: screen; }
[data-theme="light"] .cot-sweep { mix-blend-mode: multiply; opacity: 0.32; }

.cot-center { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; align-content: center; gap: 0; pointer-events: none; }
.cot-center-val { font-size: 28px; font-weight: 800; color: var(--trn-text); line-height: 1; }
.cot-center-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--trn-text-dim); margin-top: 4px; }

.cot-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; margin-top: 10px;
  font-size: 11px; color: var(--trn-text-muted); }
.cot-legend span { display: inline-flex; align-items: center; gap: 5px; }
.cot-legend .ld { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 5px currentColor; }

.cot-tip { position: fixed; z-index: 1600; pointer-events: none; display: flex; flex-direction: column; gap: 2px;
  padding: 8px 11px; border-radius: 10px; max-width: 240px;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow); }
.cot-tip strong { font-size: 12.5px; font-weight: 700; color: var(--trn-text); }
.cot-tip span { font-size: 11px; color: var(--trn-text-muted); }
.cot-tip-days { font-weight: 600; }
.cot-tip-days.ok { color: var(--trn-cert-active); }
.cot-tip-days.soon { color: var(--trn-amber-strong); }
.cot-tip-days.warn { color: var(--trn-cert-pending); }
.cot-tip-days.danger { color: var(--trn-cert-expired); }

@media (prefers-reduced-motion: reduce) {
  .cot-sweep { animation: none; }
  .cot-dot { transition: none; }
}
</style>
