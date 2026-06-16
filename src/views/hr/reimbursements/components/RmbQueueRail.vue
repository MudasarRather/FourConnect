<template>
  <aside class="rail">
    <header class="rail-head">
      <div class="rh-top">
        <span class="rh-title"><Layers :size="14" /> Queue</span>
        <span class="rh-count rmb-mono">{{ items.length }}</span>
      </div>
      <div class="rh-prog">
        <div class="rh-bar"><span class="rh-fill" :style="{ width: pct + '%' }"><i class="rh-flow" /></span></div>
        <span class="rh-label rmb-mono">{{ reviewed }}/{{ total }} cleared this session</span>
      </div>
    </header>

    <div class="rail-list">
      <button v-for="(c, i) in items" :key="c.id"
        class="qrow reveal" :class="{ active: c.id === activeId, picked: selected.has(c.id) }"
        :style="{ '--c': catColor(c), '--i': Math.min(i, 12) }"
        :disabled="locked"
        @click="$emit('focus', c.id)">
        <span class="q-marker" aria-hidden="true" />
        <span class="q-check" :class="{ on: selected.has(c.id) }" @click.stop="$emit('toggle', c.id)">
          <Check v-if="selected.has(c.id)" :size="11" />
        </span>
        <span class="q-dot" />
        <span class="q-main">
          <b class="rmb-mono">{{ c.claim_number }}</b>
          <small>{{ c.employee_name || '—' }}</small>
        </span>
        <span class="q-right">
          <span class="q-amt rmb-mono">{{ fmtCompactINR(c.amount) }}</span>
          <span class="q-wait" :data-tone="waitTone(c)">{{ waitLabel(c) }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Layers, Check } from 'lucide-vue-next'
import { categoryMeta, fmtCompactINR } from '@/composables/useReimbursements'

const props = defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: [String, Number], default: null },
  selected: { type: Object, default: () => new Set() },
  locked: { type: Boolean, default: false },
  reviewed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
})
defineEmits(['focus', 'toggle'])

const pct = computed(() => (props.total > 0 ? Math.min(100, (props.reviewed / props.total) * 100) : 0))
const catColor = (c) => c.category_color || categoryMeta(c.category_code).hex
const waitDays = (c) => {
  if (!c.submitted_at) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(c.submitted_at).getTime()) / 86400000))
}
const waitLabel = (c) => { const d = waitDays(c); return d <= 0 ? 'new' : `${d}d` }
const waitTone = (c) => { const d = waitDays(c); return d >= 7 ? 'hot' : d >= 3 ? 'warm' : 'cool' }
</script>

<style scoped>
.rail { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.rail-head { padding: 14px 16px; border-radius: 16px; background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.rh-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.rh-title { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: var(--rmb-text); }
.rh-count { font-size: 13px; font-weight: 800; color: var(--rmb-amber); padding: 2px 9px; border-radius: 999px; background: color-mix(in srgb, var(--rmb-amber) 14%, transparent); }
.rh-prog { display: flex; flex-direction: column; gap: 6px; }
.rh-bar { height: 7px; border-radius: 999px; background: var(--rmb-grid-line); overflow: hidden; }
.rh-fill { display: block; height: 100%; border-radius: 999px; position: relative; overflow: hidden;
  background: linear-gradient(90deg, var(--rmb-st-approved), var(--rmb-st-settled)); transition: width 0.9s var(--rmb-spring); min-width: 3px; }
.rh-flow { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.5) 50%, transparent 65%); background-size: 220% 100%; animation: rmb-amount-shimmer 2.4s linear infinite; }
.rh-label { font-size: 9.5px; color: var(--rmb-text-muted); }

.rail-list { display: flex; flex-direction: column; gap: 7px; overflow-y: auto; max-height: 560px; padding: 2px; }
.rail-list::-webkit-scrollbar { width: 6px; }
.rail-list::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 99px; }

.qrow { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px 10px 14px; border-radius: 13px; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); text-align: left; overflow: hidden;
  transition: border-color 0.22s, background 0.22s, box-shadow 0.25s, transform 0.22s var(--rmb-spring); }
.qrow.reveal { animation: qrow-reveal 0.45s var(--rmb-spring) backwards; animation-delay: calc(var(--i, 0) * 0.04s); }
@keyframes qrow-reveal { from { opacity: 0; transform: translateX(18px); } }
.qrow:not(:disabled):hover { border-color: var(--rmb-border-strong); background: var(--rmb-surface-elevated); transform: translateX(-2px); }
.qrow:disabled { cursor: default; }
.qrow.active { border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--rmb-surface)); box-shadow: 0 10px 26px -16px var(--c); }
.q-marker { position: absolute; left: 0; top: 12%; bottom: 12%; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); opacity: 0; transform: scaleY(0.3); transform-origin: center; transition: opacity 0.3s, transform 0.3s var(--rmb-spring); }
.qrow.active .q-marker { opacity: 1; transform: scaleY(1); }

.q-check { width: 17px; height: 17px; border-radius: 6px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  border: 1.6px solid var(--rmb-border-strong); color: #1a1206; transition: 0.2s; }
.q-check.on { background: var(--rmb-amber); border-color: var(--rmb-amber); }
.q-check:hover { border-color: var(--rmb-amber); }
.q-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex-shrink: 0; box-shadow: 0 0 8px -1px var(--c); }
.q-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.q-main b { font-size: 11.5px; color: var(--rmb-text); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-main small { font-size: 10.5px; color: var(--rmb-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.q-amt { font-size: 12px; font-weight: 700; color: var(--rmb-money); }
.q-wait { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 999px; font-family: var(--rmb-mono); }
.q-wait[data-tone="cool"] { color: var(--rmb-st-submitted); background: var(--rmb-st-submitted-soft); }
.q-wait[data-tone="warm"] { color: var(--rmb-st-pending); background: var(--rmb-st-pending-soft); }
.q-wait[data-tone="hot"] { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); }

@media (prefers-reduced-motion: reduce) { .rh-flow { display: none; } .qrow.reveal { animation: none; } }
</style>
