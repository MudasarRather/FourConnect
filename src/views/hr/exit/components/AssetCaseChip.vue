<template>
  <button type="button" class="acc" :class="{ on: active, atrisk: c.atRisk || c.overdue, done: fullyRecovered }"
    :style="{ '--i': index }" @click="$emit('select', c.id)">
    <span class="acc-medal" :style="{ '--ex-p': (c.recoveryPct || 0) * 3.6 + 'deg' }">
      <span class="acc-ring" aria-hidden="true" />
      <span class="acc-init">{{ initials(c.employee_name || c.employee_code) }}</span>
      <span v-if="fullyRecovered" class="acc-seal" aria-hidden="true"><Check :size="10" /></span>
      <span v-else-if="c.overdue || c.shortfall > 0" class="acc-warn" aria-hidden="true"><AlertTriangle :size="9" /></span>
    </span>
    <span class="acc-body">
      <span class="acc-name">{{ c.employee_name || c.employee_code || '—' }}</span>
      <span class="acc-meta ex-mono">{{ c.case_number }} · {{ c.department_name || '—' }}</span>
      <span class="acc-foot">
        <span class="acc-pct" :class="{ done: fullyRecovered }">{{ c.recovered }}/{{ c.total }} back</span>
        <span v-if="c.transit > 0" class="acc-tag transit"><Truck :size="10" /> {{ c.transit }}</span>
        <span v-if="c.shortfall > 0" class="acc-tag short"><PackageX :size="10" /> {{ c.shortfall }}</span>
        <span v-if="c.daysLeft != null && c.unreturned > 0" class="acc-days" :class="{ over: c.daysLeft < 0 }">
          {{ c.daysLeft < 0 ? `+${-c.daysLeft}d` : `${c.daysLeft}d` }}
        </span>
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Check, Truck, AlertTriangle, PackageX } from 'lucide-vue-next'
import { initials } from '@/composables/useExit'

const props = defineProps({
  c: { type: Object, required: true },
  active: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['select'])

const fullyRecovered = computed(() => props.c.total > 0 && props.c.recovered === props.c.total)
</script>

<style scoped>
.acc { display: flex; align-items: center; gap: 11px; flex-shrink: 0; width: 244px; padding: 11px 13px; border-radius: 15px; cursor: pointer; text-align: left; position: relative; overflow: hidden;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); font-family: inherit;
  transition: transform 0.22s var(--ex-spring), border-color 0.22s, box-shadow 0.22s; animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.acc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ex-violet); opacity: 0; transition: opacity 0.22s; }
.acc:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow); }
.acc.on { border-color: var(--ex-violet); background: var(--ex-violet-soft); }
.acc.on::before { opacity: 1; }
.acc.atrisk::before { background: var(--ex-blocked); opacity: 1; }
.acc.done::before { background: var(--ex-cleared); opacity: 1; }

.acc-medal { position: relative; flex-shrink: 0; width: 42px; height: 42px; display: grid; place-items: center; }
.acc-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-ember) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 26%, transparent) 0);
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 65%); mask: radial-gradient(circle, transparent 62%, #000 65%); transition: --ex-p 0.8s var(--ex-spring); }
.acc.done .acc-ring { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.acc.atrisk .acc-ring { background: conic-gradient(from -90deg, var(--ex-blocked) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 26%, transparent) 0); }
.acc-init { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-family: var(--ex-mono); font-size: 11.5px; font-weight: 850; color: var(--ex-text);
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); }
.acc-seal { position: absolute; right: -2px; bottom: -2px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #06281b; background: var(--ex-cleared); border: 2px solid var(--ex-surface); }
.acc-warn { position: absolute; right: -3px; bottom: -3px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #fff; background: var(--ex-blocked); border: 2px solid var(--ex-surface); }

.acc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.acc-name { font-size: 13px; font-weight: 750; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-meta { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-foot { display: flex; align-items: center; gap: 7px; margin-top: 3px; flex-wrap: wrap; }
.acc-pct { font-size: 10.5px; font-weight: 800; color: var(--ex-ember); }
.acc-pct.done { color: var(--ex-cleared); }
.acc-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 750; color: var(--ex-amber-strong); }
.acc-tag.short { color: var(--ex-blocked); }
.acc-days { font-size: 9.5px; font-weight: 750; color: var(--ex-text-muted); }
.acc-days.over { color: var(--ex-blocked); }

[data-theme="light"] .acc-init { background: var(--ex-surface-elevated); }
@media (prefers-reduced-motion: reduce) { .acc { animation: none; } .acc-ring { transition: none; } }
</style>
