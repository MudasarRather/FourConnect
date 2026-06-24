<template>
  <button type="button" class="ccc" :class="{ on: active, blocked: c.blocked > 0, ready: c.allMandatory }"
    :style="{ '--i': index }" @click="$emit('select', c.id)">
    <span class="ccc-medal" :style="{ '--ex-p': (c.progress || 0) * 3.6 + 'deg' }">
      <span class="ccc-ring" aria-hidden="true" />
      <span class="ccc-init">{{ initials(c.employee_name || c.employee_code) }}</span>
      <span v-if="c.allMandatory" class="ccc-seal" aria-hidden="true"><Check :size="10" /></span>
      <span v-else-if="c.blocked > 0" class="ccc-blk" aria-hidden="true">{{ c.blocked }}</span>
    </span>
    <span class="ccc-body">
      <span class="ccc-name">{{ c.employee_name || c.employee_code || '—' }}</span>
      <span class="ccc-meta ex-mono">{{ c.case_number }} · {{ c.department_name || '—' }}</span>
      <span class="ccc-foot">
        <span class="ccc-pct" :class="{ done: c.allMandatory }">{{ c.progress || 0 }}% cleared</span>
        <span v-if="c.recoveries > 0" class="ccc-rec"><HandCoins :size="10" /> {{ fmtCompactINR(c.recoveries) }}</span>
        <span v-if="c.daysLeft != null" class="ccc-days" :class="{ over: c.daysLeft < 0 }">
          {{ c.daysLeft < 0 ? `+${-c.daysLeft}d over` : `${c.daysLeft}d left` }}
        </span>
      </span>
    </span>
  </button>
</template>

<script setup>
import { Check, HandCoins } from 'lucide-vue-next'
import { initials, fmtCompactINR } from '@/composables/useExit'

defineProps({
  c: { type: Object, required: true },
  active: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['select'])
</script>

<style scoped>
.ccc { display: flex; align-items: center; gap: 11px; flex-shrink: 0; width: 246px; padding: 11px 13px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); font-family: inherit; position: relative; overflow: hidden;
  transition: transform 0.22s var(--ex-spring), border-color 0.22s, box-shadow 0.22s;
  animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.ccc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ex-violet); opacity: 0; transition: opacity 0.22s; }
.ccc:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow); }
.ccc.on { border-color: var(--ex-violet); background: var(--ex-violet-soft); }
.ccc.on::before { opacity: 1; }
.ccc.blocked::before { background: var(--ex-blocked); opacity: 1; }
.ccc.ready::before { background: var(--ex-cleared); opacity: 1; }

.ccc-medal { position: relative; flex-shrink: 0; width: 42px; height: 42px; display: grid; place-items: center; }
.ccc-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-ember) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 26%, transparent) 0);
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 65%); mask: radial-gradient(circle, transparent 62%, #000 65%); transition: --ex-p 0.8s var(--ex-spring); }
.ccc.ready .ccc-ring { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.ccc.blocked .ccc-ring { background: conic-gradient(from -90deg, var(--ex-blocked) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 26%, transparent) 0); }
.ccc-init { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-family: var(--ex-mono); font-size: 11.5px; font-weight: 850; color: var(--ex-text);
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); }
.ccc-seal { position: absolute; right: -2px; bottom: -2px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #06281b; background: var(--ex-cleared); border: 2px solid var(--ex-surface); }
.ccc-blk { position: absolute; right: -3px; bottom: -3px; display: grid; place-items: center; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 8px; font-size: 9px; font-weight: 850; color: #fff; background: var(--ex-blocked); border: 2px solid var(--ex-surface); }

.ccc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ccc-name { font-size: 13px; font-weight: 750; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ccc-meta { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ccc-foot { display: flex; align-items: center; gap: 7px; margin-top: 3px; flex-wrap: wrap; }
.ccc-pct { font-size: 10.5px; font-weight: 800; color: var(--ex-ember); }
.ccc-pct.done { color: var(--ex-cleared); }
.ccc-rec { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 750; color: var(--ex-cleared); }
.ccc-days { font-size: 9.5px; font-weight: 750; color: var(--ex-text-muted); }
.ccc-days.over { color: var(--ex-blocked); }

[data-theme="light"] .ccc-init { background: var(--ex-surface-elevated); }
@media (prefers-reduced-motion: reduce) { .ccc { animation: none; } .ccc-ring { transition: none; } }
</style>
