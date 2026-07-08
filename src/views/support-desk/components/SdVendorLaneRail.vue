<template>
  <aside class="vlr sd-card">
    <header class="vlr-head">
      <span class="vlr-eyebrow sd-mono"><Building2 :size="13" /> VENDOR LANES</span>
      <span class="vlr-n">{{ vendors.length }}</span>
    </header>

    <button class="vlr-all" :class="{ on: !active }" @click="$emit('pick', '')">
      <Layers :size="13" /> All lanes
      <span class="vlr-all-n">{{ totalOpen }}</span>
    </button>

    <div v-if="vendors.length" class="vlr-list">
      <Motion v-for="(v, i) in ranked" :key="v.vendor_name" as="button" type="button"
        class="vlr-lane" :class="{ on: active === v.vendor_name, hot: v.overdue > 0 }"
        :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ x: 2 }" :whileTap="{ scale: 0.98 }"
        @click="$emit('pick', active === v.vendor_name ? '' : v.vendor_name)">
        <span class="vlr-spine" />
        <div class="vlr-top">
          <span class="vlr-name">{{ v.vendor_name }}</span>
          <span v-if="v.overdue > 0" class="vlr-badge"><AlarmClock :size="10" /> {{ v.overdue }}</span>
        </div>
        <div class="vlr-meta">
          <span class="vlr-open"><b>{{ v.open }}</b> open</span>
          <span class="vlr-dot">·</span>
          <span><b>{{ turnLabel(v.avg_turnaround_days) }}</b> avg</span>
        </div>
        <div class="vlr-bar"><span class="vlr-fill" :style="{ width: barPct(v) + '%' }" /></div>
      </Motion>
    </div>

    <div v-else class="vlr-empty">
      <span class="vlr-empty-ic"><SatelliteDish :size="22" /></span>
      <p class="vlr-empty-t">No hand-offs in flight</p>
      <p class="vlr-empty-b">Dispatch a ticket to a vendor and its lane opens here automatically.</p>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Building2, Layers, AlarmClock, SatelliteDish } from 'lucide-vue-next'

const props = defineProps({
  vendors: { type: Array, default: () => [] },   // [{vendor_name, open, overdue, avg_turnaround_days}]
  active: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const ranked = computed(() => [...props.vendors].slice(0, 12))
const totalOpen = computed(() => props.vendors.reduce((a, v) => a + (v.open || 0), 0))
const maxOpen = computed(() => Math.max(1, ...props.vendors.map(v => v.open || 0)))
const barPct = (v) => Math.round(((v.open || 0) / maxOpen.value) * 100)
const turnLabel = (d) => (d == null ? '—' : (d < 1 ? `${Math.round(d * 24)}h` : `${d}d`))
</script>

<style scoped>
.vlr { padding: 15px 15px 16px; display: flex; flex-direction: column; gap: 11px; height: 100%; }
.vlr-head { display: flex; align-items: center; justify-content: space-between; }
.vlr-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-vendor-steel); }
.vlr-n { font-family: var(--sd-mono); font-size: 12px; font-weight: 800; color: var(--sd-text-muted); }

.vlr-all { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; font-size: 12.5px; font-weight: 650; cursor: pointer; font-family: inherit;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: border-color 0.2s, color 0.2s; }
.vlr-all:hover { color: var(--sd-text); border-color: var(--sd-vendor-signal); }
.vlr-all.on { color: var(--sd-vendor-signal); border-color: var(--sd-vendor-signal); background: var(--sd-vendor-signal-soft); }
.vlr-all-n { margin-left: auto; font-family: var(--sd-mono); font-weight: 800; }

.vlr-list { flex: 1; display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 2px;
  scrollbar-width: thin; scrollbar-color: var(--sd-vendor-steel) transparent; }
.vlr-list::-webkit-scrollbar { width: 6px; }
.vlr-list::-webkit-scrollbar-thumb { border-radius: 999px; background: var(--sd-vendor-steel-soft); }
.vlr-lane { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 11px 12px 12px 14px; border-radius: 12px; cursor: pointer; text-align: left; font-family: inherit; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border); transition: border-color 0.2s, background 0.2s; }
.vlr-lane:hover { border-color: var(--sd-vendor-steel-brd); }
.vlr-lane.on { background: var(--sd-vendor-steel-soft); border-color: var(--sd-vendor-steel-brd); }
.vlr-lane.hot { border-color: var(--sd-vendor-overdue-soft); }
.vlr-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sd-vendor-steel); }
.vlr-lane.hot .vlr-spine { background: var(--sd-vendor-overdue); }
.vlr-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.vlr-name { font-size: 13px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vlr-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; color: var(--sd-vendor-overdue); background: var(--sd-vendor-overdue-soft); padding: 2px 6px; border-radius: 999px; flex-shrink: 0; }
.vlr-meta { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--sd-text-muted); }
.vlr-meta b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.vlr-dot { color: var(--sd-border-strong); }
.vlr-bar { height: 4px; border-radius: 3px; background: var(--sd-vendor-steel-soft); overflow: hidden; }
.vlr-fill { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--sd-vendor-steel), var(--sd-vendor-signal)); transition: width 0.5s var(--sd-spring); }
.vlr-lane.hot .vlr-fill { background: linear-gradient(90deg, var(--sd-vendor-signal), var(--sd-vendor-overdue)); }

.vlr-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 7px; padding: 26px 12px 18px; }
.vlr-empty-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: var(--sd-vendor-steel); background: var(--sd-vendor-steel-soft); }
.vlr-empty-t { margin: 4px 0 0; font-size: 13.5px; font-weight: 700; color: var(--sd-text); }
.vlr-empty-b { margin: 0; font-size: 12px; color: var(--sd-text-muted); line-height: 1.45; max-width: 30ch; }

@media (max-width: 980px) { .vlr { position: static; } .vlr-list { max-height: none; } }
</style>
