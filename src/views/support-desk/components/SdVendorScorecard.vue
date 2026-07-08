<template>
  <!-- ░ VENDOR SCORECARD — per-vendor turnaround deck. Which third parties are slow: open
       hand-offs, overdue rate and average completed round-trip. Surfaces the laggards a flat
       status list can't. Click a vendor to filter the queue to it. -->
  <section v-if="vendors.length" class="vsc sd-card" :class="{ reduced }">
    <header class="vsc-head">
      <span class="vsc-eyebrow sd-mono"><Building2 :size="13" /> VENDOR SCORECARD</span>
      <span class="vsc-meta">{{ vendors.length }} vendor{{ vendors.length === 1 ? '' : 's' }} in play</span>
    </header>
    <div class="vsc-grid">
      <Motion
        v-for="(v, i) in ranked" :key="v.vendor_name" as="button" type="button"
        class="vsc-card" :class="{ on: active === v.vendor_name, hot: v.overdue > 0 }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.98 }"
        @click="$emit('pick', active === v.vendor_name ? '' : v.vendor_name)"
        :title="`${v.vendor_name} — ${v.open} open`"
      >
        <span class="vsc-spine" />
        <div class="vsc-top">
          <span class="vsc-name">{{ v.vendor_name }}</span>
          <span v-if="v.overdue > 0" class="vsc-badge"><AlarmClock :size="10" /> {{ v.overdue }}</span>
        </div>
        <div class="vsc-stats">
          <span class="vsc-stat"><b>{{ v.open }}</b> open</span>
          <span class="vsc-sep" />
          <span class="vsc-stat"><b>{{ turnLabel(v.avg_turnaround_days) }}</b> avg</span>
        </div>
        <div class="vsc-bar"><span class="vsc-fill" :style="{ width: barPct(v) + '%' }" /></div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Building2, AlarmClock } from 'lucide-vue-next'

const props = defineProps({
  vendors: { type: Array, default: () => [] },   // [{vendor_name, open, overdue, handoffs, avg_turnaround_days}]
  active: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const ranked = computed(() => [...props.vendors].slice(0, 8))
const maxOpen = computed(() => Math.max(1, ...props.vendors.map(v => v.open || 0)))
const barPct = (v) => Math.round(((v.open || 0) / maxOpen.value) * 100)
const turnLabel = (d) => (d == null ? '—' : (d < 1 ? `${Math.round(d * 24)}h` : `${d}d`))
</script>

<style scoped>
.vsc { padding: 15px 18px 16px; display: flex; flex-direction: column; gap: 12px; }
.vsc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.vsc-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-vendor-steel); }
.vsc-meta { font-size: 11.5px; color: var(--sd-text-muted); }

.vsc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 10px; }
.vsc-card { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 12px 13px 13px 15px; border-radius: 14px; cursor: pointer;
  text-align: left; font-family: inherit; overflow: hidden; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: border-color 0.2s, background 0.2s; }
.vsc-card:hover { border-color: var(--sd-vendor-steel-brd); }
.vsc-card.on { background: var(--sd-vendor-steel-soft); border-color: var(--sd-vendor-steel-brd); }
.vsc-card.hot { border-color: var(--sd-vendor-overdue-soft); }
.vsc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sd-vendor-steel); }
.vsc-card.hot .vsc-spine { background: var(--sd-vendor-overdue); }
.vsc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.vsc-name { font-size: 13px; font-weight: 750; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vsc-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; color: var(--sd-vendor-overdue);
  background: var(--sd-vendor-overdue-soft); padding: 2px 6px; border-radius: 999px; flex-shrink: 0; }
.vsc-stats { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--sd-text-muted); }
.vsc-stat b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.vsc-sep { width: 1px; height: 11px; background: var(--sd-border-strong); }
.vsc-bar { height: 4px; border-radius: 3px; background: var(--sd-vendor-steel-soft); overflow: hidden; }
.vsc-fill { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--sd-vendor-steel), var(--sd-vendor-signal)); transition: width 0.5s var(--sd-spring); }
.vsc-card.hot .vsc-fill { background: linear-gradient(90deg, var(--sd-vendor-signal), var(--sd-vendor-overdue)); }
</style>
