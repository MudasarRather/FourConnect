<template>
  <!-- SLA Flag Board — race-control read of the team's queue health. Green=on-track,
       Amber=at-risk, Red=breached, Safety-car=on-hold, Fastest-lap=top resolver today.
       Click a flag to focus that slice (emits `pick`). -->
  <div class="flagboard">
    <Motion v-for="(fl, i) in flags" :key="fl.key" as="button" type="button"
      class="flag" :class="[fl.key, { clickable: fl.lens }]"
      :initial="reduced ? false : { opacity: 0, y: 14, scale: 0.96 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.5, delay: reduced ? 0 : 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
      :while-hover="fl.lens ? { y: -3 } : {}" :while-tap="fl.lens ? { scale: 0.97 } : {}"
      @click="fl.lens && emit('pick', fl.lens)">
      <span class="flag-bar" />
      <span class="flag-wave" aria-hidden="true"><component :is="fl.icon" :size="15" /></span>
      <span class="flag-body">
        <span class="flag-head">{{ fl.head }}</span>
        <span class="flag-label">{{ fl.label }}</span>
      </span>
      <span class="flag-val sd-mono">{{ fl.display }}</span>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Flag, TriangleAlert, ShieldX, CircleSlash, Trophy } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const flags = computed(() => {
  const s = props.stats || {}
  const fastest = s.fastest_lap
  return [
    { key: 'green', head: 'GREEN FLAG', label: 'On track', icon: Flag, display: s.flag_green ?? 0, lens: '' },
    { key: 'amber', head: 'YELLOW', label: 'At risk · due soon', icon: TriangleAlert, display: s.flag_amber ?? 0, lens: 'breached' },
    { key: 'red', head: 'RED FLAG', label: 'SLA breached', icon: ShieldX, display: s.flag_red ?? 0, lens: 'breached' },
    { key: 'safety', head: 'SAFETY CAR', label: 'On hold', icon: CircleSlash, display: s.flag_safety_car ?? 0, lens: 'on-hold' },
    {
      key: 'fastest', head: 'FASTEST LAP', label: fastest?.name ? fastest.name : 'Top resolver today',
      icon: Trophy, display: fastest?.count ? `${fastest.count}` : '—', lens: '',
    },
  ]
})
</script>

<style scoped>
.flagboard { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.flag { position: relative; display: flex; align-items: center; gap: 11px; overflow: hidden; padding: 13px 14px 13px 16px; border-radius: 14px; text-align: left; cursor: default; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface-glass); transition: border-color 0.2s; }
.flag.clickable { cursor: pointer; }
.flag.clickable:hover { border-color: var(--fc); }
.flag-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--fc); }
.flag-wave { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--fc); background: color-mix(in srgb, var(--fc) 16%, transparent); border: 1px solid color-mix(in srgb, var(--fc) 30%, transparent); }
.flag-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.flag-head { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--fc); }
.flag-label { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.flag-val { font-size: 21px; font-weight: 800; color: var(--sd-text); line-height: 1; }

.flag.green { --fc: var(--sd-success); }
.flag.amber { --fc: var(--sd-warning); }
.flag.red { --fc: var(--sd-danger); }
.flag.red .flag-wave { animation: fb-flash 2.2s ease-in-out infinite; }
.flag.safety { --fc: var(--sd-st-hold); }
.flag.fastest { --fc: var(--sd-amber); }
.flag.fastest .flag-wave { color: #1a1206; background: var(--sd-grad-hero); border: none; }
[data-theme="light"] .flag.fastest .flag-wave { color: #fff8ec; }

@keyframes fb-flash { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-danger) 40%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }

@media (max-width: 1080px) { .flagboard { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .flagboard { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .flag.red .flag-wave { animation: none; } }
</style>
