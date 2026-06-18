<template>
  <Motion as="section" class="cvh" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="cvh-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />

    <div class="cvh-top">
      <!-- lead -->
      <div class="cvh-lead">
        <span class="cvh-eyebrow"><ShieldCheck :size="13" /> Credential Vault</span>
        <h1 class="cvh-title">Certifications</h1>
        <p class="cvh-sub">Every credential held across the workforce — from award to renewal, watched through its lifecycle.</p>

        <div class="cvh-tools">
          <div class="cvh-search">
            <Search :size="15" />
            <input :value="search" @input="$emit('update:search', $event.target.value)" placeholder="Search employee or credential…" />
            <button v-if="search" class="cvh-search-x" @click="$emit('update:search', '')" aria-label="Clear"><X :size="14" /></button>
          </div>
          <div class="cvh-filter">
            <TrnSelect :model-value="statusFilter" @update:modelValue="$emit('update:statusFilter', $event)"
              :options="statusOptions" placeholder="All statuses" />
          </div>
          <Motion as="button" class="trn-btn trn-btn-ghost" type="button"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('manage')">
            <Library :size="15" /> Manage catalog
          </Motion>
          <Motion as="button" class="trn-btn trn-btn-primary" type="button"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('award')">
            <Plus :size="15" /> Award certification
          </Motion>
        </div>
      </div>

      <!-- credential seal -->
      <div class="cvh-seal">
        <span class="cvh-seal-aura" aria-hidden="true" />
        <span class="cvh-seal-sheen" aria-hidden="true" />
        <svg class="cvh-seal-svg" :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
          <circle class="cvh-track" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="STROKE" />
          <circle v-for="(s, i) in segments" :key="s.key" class="cvh-seg"
            :cx="C" :cy="C" :r="R" fill="none" :stroke-width="STROKE" stroke-linecap="round"
            :stroke="s.color" :transform="`rotate(${s.startDeg} ${C} ${C})`"
            :stroke-dasharray="visible ? `${s.dash} ${CIRC}` : `0 ${CIRC}`"
            :style="{ transitionDelay: (0.2 + i * 0.12) + 's', filter: `drop-shadow(0 0 5px color-mix(in srgb, ${s.color} 55%, transparent))` }" />
        </svg>
        <div class="cvh-seal-center">
          <ShieldCheck :size="18" class="cvh-seal-ic" />
          <span class="cvh-seal-val"><TrnCountUp :value="total" :duration="1.6" /></span>
          <span class="cvh-seal-lab">credentials</span>
        </div>
      </div>
    </div>

    <!-- status meters -->
    <div class="cvh-meters" ref="metersRef" :class="{ 'is-in': metersIn }">
      <div v-for="(m, i) in meters" :key="m.key" class="cvh-meter" :style="{ '--c': m.color }">
        <div class="cvh-meter-top">
          <span class="cvh-meter-ic"><component :is="m.icon" :size="14" /></span>
          <span class="cvh-meter-lab">{{ m.label }}</span>
          <strong class="cvh-meter-val"><TrnCountUp :value="m.value" /></strong>
        </div>
        <div class="cvh-meter-track">
          <span class="cvh-meter-fill" :style="{ width: metersIn ? m.pct + '%' : '0%', transitionDelay: (0.1 + i * 0.08) + 's' }">
            <span class="cvh-meter-comet" />
          </span>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ShieldCheck, Search, X, Library, Plus, BadgeCheck, CalendarClock, AlertTriangle, RefreshCw } from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { certStatusMeta } from '@/composables/useTraining'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({}) }, // { ACTIVE, EXPIRING_SOON, EXPIRED, PENDING_RENEWAL, REVOKED }
  search: { type: String, default: '' },
  statusFilter: { type: String, default: '' },
})
defineEmits(['update:search', 'update:statusFilter', 'manage', 'award'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.2 })
const metersRef = ref(null)
const { visible: metersIn } = useInView(metersRef, { threshold: 0.3 })

const STATUS_DEFS = [
  { key: 'ACTIVE', color: 'var(--trn-cert-active)' },
  { key: 'EXPIRING_SOON', color: 'var(--trn-cert-expiring)' },
  { key: 'PENDING_RENEWAL', color: 'var(--trn-cert-pending)' },
  { key: 'EXPIRED', color: 'var(--trn-cert-expired)' },
  { key: 'REVOKED', color: 'var(--trn-cert-revoked)' },
]
const total = computed(() => STATUS_DEFS.reduce((a, s) => a + (Number(props.counts[s.key]) || 0), 0))

// ── seal donut geometry ──────────────────────────────────────────────────────
const SZ = 190, C = SZ / 2, STROKE = 14, R = C - STROKE / 2 - 4
const CIRC = 2 * Math.PI * R
const GAP = 5
const segments = computed(() => {
  const t = total.value || 1
  let acc = 0
  return STATUS_DEFS.map(s => {
    const count = Number(props.counts[s.key]) || 0
    const len = (count / t) * CIRC
    const startDeg = (acc / CIRC) * 360 - 90
    acc += len
    return { ...s, count, dash: Math.max(len - GAP, count > 0 ? 1 : 0), startDeg }
  }).filter(s => s.count > 0)
})

// ── status meters ──────────────────────────────────────────────────────────
const meters = computed(() => {
  const t = total.value || 1
  return [
    { key: 'ACTIVE', label: 'Active', icon: BadgeCheck, color: 'var(--trn-cert-active)', value: Number(props.counts.ACTIVE) || 0 },
    { key: 'EXPIRING_SOON', label: 'Expiring soon', icon: CalendarClock, color: 'var(--trn-cert-expiring)', value: Number(props.counts.EXPIRING_SOON) || 0 },
    { key: 'PENDING_RENEWAL', label: 'Pending renewal', icon: RefreshCw, color: 'var(--trn-cert-pending)', value: Number(props.counts.PENDING_RENEWAL) || 0 },
    { key: 'EXPIRED', label: 'Expired', icon: AlertTriangle, color: 'var(--trn-cert-expired)', value: Number(props.counts.EXPIRED) || 0 },
  ].map(m => ({ ...m, pct: Math.round((m.value / t) * 100) }))
})

// ── status filter dropdown ────────────────────────────────────────────────────
const statusOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...STATUS_DEFS.map(s => ({ value: s.key, label: certStatusMeta(s.key).label, dot: s.color })),
])
</script>

<style scoped>
.cvh { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 22px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.cvh-aurora { position: absolute; inset: -40% -20% auto -20%; height: 90%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(58% 70% at 80% 8%, color-mix(in srgb, var(--trn-cert-active) 16%, transparent), transparent 60%),
    radial-gradient(52% 62% at 22% 0%, color-mix(in srgb, var(--trn-amber) 18%, transparent), transparent 60%);
  filter: blur(12px); opacity: 0.85; animation: cvh-drift 17s ease-in-out infinite alternate; }

.cvh-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }

.cvh-lead { min-width: 0; flex: 1; }
.cvh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.cvh-eyebrow :deep(svg) { color: var(--trn-cert-active); }
.cvh-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 32%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cvh-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 46ch; }

.cvh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.cvh-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px; flex: 1; min-width: 220px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.cvh-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.cvh-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.cvh-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit; font-size: 13px; color: var(--trn-text); }
.cvh-search input:focus { outline: none; }
.cvh-search input::placeholder { color: var(--trn-text-dim); }
.cvh-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; }
.cvh-search-x:hover { color: var(--trn-text); }
.cvh-filter { width: 180px; }

/* seal */
.cvh-seal { position: relative; flex-shrink: 0; width: 190px; height: 190px; display: grid; place-items: center; }
.cvh-seal-aura { position: absolute; inset: 16px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-cert-active) 22%, transparent), transparent 68%);
  animation: cvh-breathe 5.5s ease-in-out infinite; }
.cvh-seal-sheen { position: absolute; inset: 6px; border-radius: 50%; pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--trn-amber) 60%, transparent) 36deg, transparent 80deg);
  -webkit-mask: radial-gradient(circle, transparent 54%, #000 56%, #000 73%, transparent 75%);
  mask: radial-gradient(circle, transparent 54%, #000 56%, #000 73%, transparent 75%);
  animation: trn-radar-sweep 8s linear infinite; mix-blend-mode: screen; }
[data-theme="light"] .cvh-seal-sheen { mix-blend-mode: multiply; opacity: 0.4; }
.cvh-seal-svg { position: relative; width: 100%; height: 100%; }
.cvh-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.cvh-seg { transition: stroke-dasharray 1.1s var(--trn-spring); }
.cvh-seal-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.cvh-seal-ic { color: var(--trn-cert-active); margin-bottom: 3px; }
.cvh-seal-val { font-family: var(--trn-mono); font-size: 38px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.cvh-seal-lab { font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-text-dim); }

/* meters */
.cvh-meters { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px;
  padding-top: 18px; border-top: 1px solid var(--trn-border-soft); }
.cvh-meter { display: flex; flex-direction: column; gap: 9px; }
.cvh-meter-top { display: flex; align-items: center; gap: 8px; }
.cvh-meter-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); }
.cvh-meter-lab { flex: 1; min-width: 0; font-size: 11.5px; font-weight: 600; color: var(--trn-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cvh-meter-val { font-family: var(--trn-mono); font-size: 17px; font-weight: 800; color: var(--trn-text); }
.cvh-meter-track { height: 7px; border-radius: 999px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); overflow: hidden; }
.cvh-meter-fill { position: relative; display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 45%, transparent), var(--c));
  box-shadow: 0 0 10px -2px var(--c); transition: width 1.1s var(--trn-spring); }
.cvh-meter-comet { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 5px; height: 5px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 7px 1px var(--c); }
[data-theme="light"] .cvh-meter-comet { background: var(--c); }

@keyframes cvh-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.08); } }
@keyframes cvh-breathe { 0%, 100% { opacity: 0.5; transform: scale(0.94); } 50% { opacity: 0.9; transform: scale(1.06); } }

@media (max-width: 880px) {
  .cvh-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .cvh-seal { justify-self: center; margin: 0 auto; }
  .cvh-meters { grid-template-columns: repeat(2, 1fr); }
  .cvh-search, .cvh-filter { width: 100%; flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .cvh-aurora, .cvh-seal-aura, .cvh-seal-sheen { animation: none !important; }
  .cvh-seg, .cvh-meter-fill { transition: none !important; }
}
</style>
