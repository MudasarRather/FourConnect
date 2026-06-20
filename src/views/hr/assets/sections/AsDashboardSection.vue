<template>
  <div class="dash">
    <HangarHero :stats="stats" :light="isLight" @new-asset="$emit('new-asset')" @go="$emit('go', $event)" />

    <!-- ════ command deck row ════ -->
    <div class="dash-deck">
      <DashReactor :stats="stats" @pick="(s) => go({ tab: 'inventory', filter: { status: s } })" />
      <DashHealthGauge :stats="stats" @pick="(c) => go({ tab: 'inventory', filter: { condition: c } })" />

      <!-- attention console -->
      <Motion as="section" class="atn as-card" ref="atnEl"
        :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <span class="as-grain" aria-hidden="true" />
        <span class="as-spotlight" aria-hidden="true" />
        <header class="atn-head">
          <span class="atn-eyebrow"><BellRing :size="13" /> Attention</span>
          <span class="atn-flag" :data-clear="needsAction === 0">
            <component :is="needsAction === 0 ? ShieldCheck : AlertTriangle" :size="12" />
            {{ needsAction === 0 ? 'All clear' : `${needsAction} need action` }}
          </span>
        </header>

        <div class="atn-list">
          <Motion v-for="(a, i) in alerts" :key="a.key" as="button" type="button" class="atn-row" :data-tone="a.tone" :data-active="a.value > 0"
            :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.38, delay: 0.16 + i * 0.06 }"
            :whileHover="reduced ? {} : { x: 3 }" :whileTap="{ scale: 0.98 }" @click="go(a.target)">
            <span class="atn-ic"><component :is="a.icon" :size="16" /><span v-if="a.value > 0 && !reduced" class="atn-ping" /></span>
            <span class="atn-num as-mono"><AssetCountUp :value="a.value" :start="atnIn" /></span>
            <span class="atn-lab">{{ a.label }}</span>
            <ChevronRight :size="15" class="atn-arrow" />
          </Motion>
        </div>

        <button class="atn-value" @click="go('inventory')">
          <span class="atn-value-aura" aria-hidden="true" />
          <span class="atn-value-lab"><Wallet :size="13" /> Total asset value</span>
          <span class="atn-value-num as-mono">{{ money(stats.total_value) }}</span>
          <span class="atn-value-foot as-mono">{{ stats.total || 0 }} assets on the books</span>
        </button>
      </Motion>
    </div>

    <!-- ════ composition ════ -->
    <DashTypeBars :stats="stats" @pick="(t) => go({ tab: 'inventory', filter: { type: t } })" />

    <!-- ════ launchpad ════ -->
    <DashModuleDeck :stats="stats" @go="(t) => $emit('go', t)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import { Undo2, Clock, ShieldAlert, CalendarClock, ChevronRight, BellRing, ShieldCheck, AlertTriangle, Wallet } from 'lucide-vue-next'
import HangarHero from '../components/HangarHero.vue'
import DashReactor from '../components/DashReactor.vue'
import DashHealthGauge from '../components/DashHealthGauge.vue'
import DashTypeBars from '../components/DashTypeBars.vue'
import DashModuleDeck from '../components/DashModuleDeck.vue'
import AssetCountUp from '../components/AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
const emit = defineEmits(['go', 'new-asset'])
const reduced = prefersReduced()

const go = (payload) => emit('go', payload)

// theme flag drives HangarHero's WebGL palette
const theme = ref(document.documentElement.getAttribute('data-theme') || 'dark')
let obs = null
onMounted(() => {
  obs = new MutationObserver(() => { theme.value = document.documentElement.getAttribute('data-theme') || 'dark' })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onUnmounted(() => obs?.disconnect())
const isLight = computed(() => theme.value === 'light')

// attention
const atnEl = ref(null)
const { visible: atnIn } = useInView(atnEl, { threshold: 0.25 })
const alerts = computed(() => [
  { key: 'overdue', icon: Undo2, tone: 'warn', label: 'Overdue returns', value: props.stats.overdue_returns || 0, target: 'returns' },
  { key: 'ack', icon: Clock, tone: 'info', label: 'Awaiting acknowledgement', value: props.stats.unacknowledged || 0, target: 'allocations' },
  { key: 'damage', icon: ShieldAlert, tone: 'danger', label: 'Open damage tickets', value: props.stats.open_damages || 0, target: 'damage' },
  { key: 'warranty', icon: CalendarClock, tone: 'steel', label: 'Warranty expiring (30d)', value: props.stats.warranty_expiring_30d || 0, target: { tab: 'inventory', filter: { warranty: true } } },
])
const needsAction = computed(() => alerts.value.reduce((s, a) => s + (a.value > 0 ? 1 : 0), 0))

const money = (v) => {
  const n = Number(v || 0)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${n.toLocaleString()}`
}
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 16px; }
.dash-deck { display: grid; grid-template-columns: 1.45fr 1fr 1.1fr; gap: 16px; align-items: stretch; }
@media (max-width: 1100px) { .dash-deck { grid-template-columns: 1fr 1fr; } .dash-deck > :last-child { grid-column: 1 / -1; } }
@media (max-width: 720px) { .dash-deck { grid-template-columns: 1fr; } .dash-deck > :last-child { grid-column: auto; } }

/* attention console */
.atn { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.atn-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.atn-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.atn-eyebrow :deep(svg) { color: var(--as-amber); }
.atn-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; padding: 3px 9px; border-radius: 999px;
  color: var(--as-st-reserved); background: var(--as-st-reserved-soft); border: 1px solid color-mix(in srgb, var(--as-st-reserved) 30%, transparent); }
.atn-flag[data-clear="true"] { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 30%, transparent); }

.atn-list { display: flex; flex-direction: column; gap: 8px; }
.atn-row { display: grid; grid-template-columns: 34px auto 1fr auto; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: transform 0.22s var(--as-spring), border-color 0.22s, background 0.22s; }
.atn-row:hover { border-color: var(--as-border-strong); background: var(--as-surface-elevated); }
.atn-ic { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.atn-row[data-tone="warn"] .atn-ic { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); }
.atn-row[data-tone="info"] .atn-ic { color: var(--as-st-allocated); background: var(--as-st-allocated-soft); }
.atn-row[data-tone="danger"] .atn-ic { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); }
.atn-row[data-tone="steel"] .atn-ic { color: var(--as-steel-dim); background: var(--as-st-maintenance-soft); }
.atn-ping { position: absolute; inset: -1px; border-radius: 10px; border: 1.5px solid currentColor; opacity: 0; animation: atn-ping 2.4s ease-out infinite; }
.atn-row[data-active="false"] .atn-ping { display: none; }
.atn-num { font-size: 19px; font-weight: 850; color: var(--as-text); min-width: 22px; }
.atn-row[data-active="false"] .atn-num { color: var(--as-text-dim); }
.atn-lab { font-size: 12.5px; color: var(--as-text-secondary); }
.atn-arrow { color: var(--as-text-dim); }

.atn-value { position: relative; overflow: hidden; margin-top: auto; display: flex; flex-direction: column; gap: 3px; padding: 14px 15px; border-radius: 14px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-grad-hero); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); transition: border-color 0.22s; }
.atn-value:hover { border-color: color-mix(in srgb, var(--as-amber) 45%, transparent); }
.atn-value-aura { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 14%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 4s ease infinite; }
.atn-value-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-muted); position: relative; }
.atn-value-lab :deep(svg) { color: var(--as-amber); }
.atn-value-num { font-size: 26px; font-weight: 850; color: var(--as-text); letter-spacing: -0.02em; position: relative; }
.atn-value-foot { font-size: 10px; color: var(--as-text-dim); position: relative; }

@keyframes atn-ping { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.35); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .atn-value-aura { animation: none; } }
</style>
