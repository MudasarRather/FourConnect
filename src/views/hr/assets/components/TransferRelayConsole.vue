<template>
  <section class="rc" ref="root">
    <span class="as-grain" aria-hidden="true" />
    <span class="rc-aura" aria-hidden="true" />

    <div class="rc-top">
      <div class="rc-lead">
        <span class="rc-eyebrow"><ArrowLeftRight :size="13" /> Transit Relay · Custody control</span>
        <h2 class="rc-throughput">
          <AssetCountUp :value="counts.completed || 0" :start="visible" :duration="1.1" />
          <span class="rc-throughput-lab">handoffs completed</span>
        </h2>
        <p class="rc-sub">
          <b>{{ counts.requested || 0 }}</b> awaiting approval ·
          <b>{{ counts.approved || 0 }}</b> in transit ·
          <b>{{ counts.total || 0 }}</b> total routed
        </p>
      </div>
      <Motion as="button" type="button" class="as-btn as-btn-primary rc-new"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
        <Plus :size="15" /> New transfer
      </Motion>
    </div>

    <!-- relay pipeline: Requested → Approved → Completed, packets riding the conveyor -->
    <div class="rc-relay">
      <span class="rc-lane" aria-hidden="true" />
      <template v-for="(st, i) in STATIONS" :key="st.key">
        <button class="rc-station" :class="{ on: activeStatus === st.key }" :data-key="st.key"
          @click="$emit('pick-status', st.key)">
          <span class="rc-beacon">
            <span class="rc-beacon-ring" aria-hidden="true" />
            <component :is="st.icon" :size="17" />
          </span>
          <span class="rc-st-num as-mono"><AssetCountUp :value="counts[st.count] || 0" :start="visible" :duration="0.9" /></span>
          <span class="rc-st-lab">{{ st.label }}</span>
        </button>
        <span v-if="i < STATIONS.length - 1" class="rc-seg" aria-hidden="true">
          <span class="rc-seg-line" /><span class="rc-seg-packet" :style="{ animationDelay: `${i * 0.5}s` }" />
        </span>
      </template>
    </div>

    <!-- filters: reset + diverted (closed) + type lanes -->
    <div class="rc-filters">
      <button class="rc-chip" :class="{ on: !activeStatus && !activeType }" @click="$emit('reset')"><Layers :size="12" /> All <span class="rc-chip-n as-mono">{{ counts.total || 0 }}</span></button>
      <button v-if="counts.rejected" class="rc-chip closed" :class="{ on: activeStatus === 'REJECTED' }" @click="$emit('pick-status', 'REJECTED')"><XCircle :size="12" /> Rejected <span class="rc-chip-n as-mono">{{ counts.rejected }}</span></button>
      <button v-if="counts.cancelled" class="rc-chip closed" :class="{ on: activeStatus === 'CANCELLED' }" @click="$emit('pick-status', 'CANCELLED')"><Ban :size="12" /> Cancelled <span class="rc-chip-n as-mono">{{ counts.cancelled }}</span></button>

      <span class="rc-sep" />

      <button v-for="t in types" :key="t.value" class="rc-chip type" :class="{ on: activeType === t.value }" @click="$emit('pick-type', t.value)">
        <component :is="t.icon" :size="12" /> {{ t.label }}<span v-if="t.count" class="rc-chip-n as-mono">{{ t.count }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { ArrowLeftRight, Plus, Inbox, BadgeCheck, PackageCheck, XCircle, Ban, Layers } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'

defineProps({
  counts: { type: Object, default: () => ({}) },
  activeStatus: { type: String, default: '' },
  activeType: { type: String, default: '' },
  types: { type: Array, default: () => [] },   // [{value,label,icon,count}]
})
defineEmits(['pick-status', 'pick-type', 'reset', 'new'])

const root = ref(null)
const { visible } = useInView(root, { threshold: 0.2 })

const STATIONS = [
  { key: 'REQUESTED', label: 'Requested', count: 'requested', icon: Inbox },
  { key: 'APPROVED', label: 'In transit', count: 'approved', icon: BadgeCheck },
  { key: 'COMPLETED', label: 'Completed', count: 'completed', icon: PackageCheck },
]
</script>

<style scoped>
.rc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 18px; padding: 20px 22px;
  border-radius: 22px; background: var(--as-dome); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  animation: as-deal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.rc-aura { position: absolute; inset: -40% -10% auto -10%; height: 70%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }

.rc-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.rc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-amber);
  padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.rc-throughput { margin: 12px 0 0; display: flex; align-items: baseline; gap: 10px; font-size: 34px; font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1; }
.rc-throughput-lab { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }
.rc-sub { margin: 8px 0 0; font-size: 13px; color: var(--as-text-muted); }
.rc-sub b { color: var(--as-text-secondary); font-weight: 700; }
.rc-new { flex-shrink: 0; }

/* ── relay pipeline ── */
.rc-relay { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 4px; padding: 10px 6px 4px; }
.rc-lane { position: absolute; left: 8%; right: 8%; top: 30px; height: 16px; transform: translateY(-50%); border-radius: 10px; pointer-events: none;
  background: repeating-linear-gradient(90deg, var(--as-border-soft) 0 13px, transparent 13px 26px); background-size: 26px 100%; opacity: 0.6; animation: as-convey 1.4s linear infinite; }
.rc-station { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 4px; cursor: pointer; font: inherit; background: none; border: none; flex-shrink: 0; }
.rc-beacon { position: relative; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; color: var(--bc, var(--as-steel-dim));
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); transition: transform 0.28s var(--as-spring), border-color 0.28s, color 0.28s, box-shadow 0.28s; }
.rc-station[data-key="REQUESTED"] { --bc: var(--as-st-reserved); }
.rc-station[data-key="APPROVED"]  { --bc: var(--as-st-allocated); }
.rc-station[data-key="COMPLETED"] { --bc: var(--as-st-available); }
.rc-station:hover .rc-beacon { transform: translateY(-3px); border-color: color-mix(in srgb, var(--bc) 40%, transparent); }
.rc-station.on .rc-beacon { color: var(--bc); border-color: var(--bc); background: color-mix(in srgb, var(--bc) 14%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bc) 16%, transparent); }
.rc-beacon-ring { position: absolute; inset: -3px; border-radius: 18px; border: 1.5px solid var(--bc); opacity: 0; }
.rc-station.on .rc-beacon-ring { opacity: 0.5; animation: as-relay-pulse 1.8s ease-in-out infinite; }
.rc-st-num { font-size: 17px; font-weight: 800; color: var(--as-text); margin-top: 3px; }
.rc-st-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }

.rc-seg { position: relative; flex: 1; min-width: 30px; height: 48px; display: flex; align-items: center; }
.rc-seg-line { position: absolute; left: -2px; right: -2px; top: 24px; height: 2.5px; transform: translateY(-50%); border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--as-steel-dim) 0 6px, transparent 6px 12px); background-size: 200% 100%; opacity: 0.5; animation: as-beam-flow 1s linear infinite; }
.rc-seg-packet { position: absolute; top: 24px; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: var(--as-amber);
  box-shadow: 0 0 9px 2px var(--as-amber); animation: as-packet 2s ease-in-out infinite; }

/* ── filters ── */
.rc-filters { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.rc-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring); }
.rc-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); transform: translateY(-1px); }
.rc-chip.on { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 12%, transparent); border-color: color-mix(in srgb, var(--as-amber) 32%, transparent); }
.rc-chip.closed.on { color: var(--as-al-lost); background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 32%, transparent); }
.rc-chip.type :deep(svg) { color: var(--as-text-dim); }
.rc-chip.type.on :deep(svg) { color: var(--as-amber); }
.rc-chip-n { font-size: 10.5px; font-weight: 700; color: var(--as-text-dim); }
.rc-chip.on .rc-chip-n { color: inherit; }
.rc-sep { width: 1px; height: 18px; background: var(--as-border-soft); margin: 0 2px; }

@media (max-width: 620px) {
  .rc-throughput { font-size: 28px; }
  .rc-st-lab { font-size: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .rc, .rc-lane, .rc-seg-line, .rc-seg-packet, .rc-beacon-ring { animation: none !important; }
  .rc-seg-packet { display: none; }
}
</style>
