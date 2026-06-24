<template>
  <div class="rc-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="rc ex-grain" :class="[`st-${tone}`, { closed }]" @click="$emit('open', c)">
      <span class="rc-glare" aria-hidden="true" />
      <span class="rc-spine" :style="{ '--c': statusHex }" />

      <header class="rc-head">
        <span class="rc-avatar" :style="{ '--c': typeMeta.hex || 'var(--ex-violet)' }">
          {{ init }}
          <component :is="typeMeta.icon" :size="11" class="rc-av-badge" />
        </span>
        <div class="rc-id">
          <span class="rc-name">{{ c.employee_name || c.employee_code || '—' }}</span>
          <span class="rc-meta ex-mono">{{ c.case_number }} · {{ c.designation_name || c.department_name || '—' }}</span>
        </div>
        <span v-if="lifecycleWarn" class="rc-warn" title="Workflow & lifecycle out of sync"><AlertTriangle :size="13" /></span>
        <ExStatusPill :status="c.status" />
      </header>

      <div class="rc-row">
        <span class="rc-chip type"><component :is="typeMeta.icon" :size="12" /> {{ typeMeta.label }}</span>
        <span v-if="c.reason_category" class="rc-chip reason"><component :is="reason.icon" :size="11" /> {{ reason.label }}</span>
      </div>

      <!-- bespoke journey meter -->
      <div class="jm" :class="{ halted: closed }">
        <div class="jm-track">
          <span class="jm-fill" :style="{ width: fillPct, background: closed ? 'var(--ex-steel)' : 'var(--jm-grad)' }">
            <span v-if="!closed" class="jm-head" />
          </span>
          <span v-for="(n, i) in nodes" :key="i" class="jm-node" :class="{ lit: !closed && frac >= n.at - 0.001, cur: !closed && curIdx === i }"
            :style="{ left: (n.at * 100) + '%' }" />
        </div>
        <div class="jm-cap">
          <span class="jm-stage"><span class="jm-dot" :style="{ background: closed ? 'var(--ex-steel)' : statusHex }" /> {{ closed ? statusMeta.label : nodes[curIdx]?.label }}</span>
          <span class="jm-step ex-mono">{{ closed ? '—' : `${curIdx + 1}/${nodes.length}` }}</span>
        </div>
      </div>

      <footer class="rc-foot">
        <span class="rc-when">
          <CalendarClock :size="12" />
          <template v-if="c.last_working_date">LWD {{ fmtDate(c.last_working_date) }}</template>
          <template v-else>Filed {{ fmtDate(c.resignation_date) }}</template>
        </span>
        <span v-if="daysLeft != null && c.status === 'NOTICE_PERIOD'" class="rc-days" :class="urgency">
          <Timer :size="11" /> {{ daysLeft < 0 ? `${-daysLeft}d over` : daysLeft === 0 ? 'last day' : `${daysLeft}d left` }}
        </span>
        <div class="rc-acts">
          <button v-if="deletable" class="rc-del" @click.stop="$emit('delete', c)" type="button"
            :title="preAccept ? 'Delete this not-yet-accepted request' : 'Delete this closed case'" aria-label="Delete case">
            <Trash2 :size="13" />
          </button>
          <button class="rc-open" @click.stop="$emit('open', c)" type="button">Open <ArrowRight :size="13" /></button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { CalendarClock, ArrowRight, AlertTriangle, Timer, Trash2 } from 'lucide-vue-next'
import ExStatusPill from './ExStatusPill.vue'
import {
  caseStatusMeta, resignationTypeMeta, reasonMeta,
  fmtDate, daysRemaining, initials, isDeletable, isPreAccept,
} from '@/composables/useExit'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['open', 'delete'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const statusMeta = computed(() => caseStatusMeta(props.c.status))
const tone = computed(() => statusMeta.value.tone)
const statusHex = computed(() => statusMeta.value.hex)
const typeMeta = computed(() => resignationTypeMeta(props.c.resignation_type))
const reason = computed(() => reasonMeta(props.c.reason_category))
const init = computed(() => initials(props.c.employee_name))
const daysLeft = computed(() => daysRemaining(props.c.last_working_date))
const lifecycleWarn = computed(() => props.c.lifecycle_consistent === false)

const closed = computed(() => ['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(props.c.status))
const deletable = computed(() => isDeletable(props.c.status))
const preAccept = computed(() => isPreAccept(props.c.status))

const STATUS_FRAC = {
  DRAFT: 0.04, SUBMITTED: 0.13, MANAGER_REVIEW: 0.22, ACCEPTED: 0.36,
  NOTICE_PERIOD: 0.56, CLEARANCE: 0.74, SETTLEMENT: 0.87, COMPLETED: 1,
}
const nodes = [
  { at: 0, label: 'Filed' },
  { at: 0.25, label: 'Approved' },
  { at: 0.5, label: 'Notice' },
  { at: 0.75, label: 'Clearance' },
  { at: 1, label: 'Relieved' },
]
const frac = computed(() => STATUS_FRAC[props.c.status] ?? 0.1)
const fillPct = computed(() => Math.round(frac.value * 100) + '%')
const curIdx = computed(() => {
  let idx = 0
  nodes.forEach((n, i) => { if (frac.value >= n.at - 0.001) idx = i })
  return idx
})

const urgency = computed(() => {
  const d = daysLeft.value
  if (d == null) return ''
  if (d < 0) return 'over'
  if (d <= 7) return 'soon'
  return 'ok'
})
</script>

<style scoped>
.rc-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.rc { position: relative; overflow: hidden; cursor: pointer; padding: 15px 16px 13px 19px; border-radius: 18px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.3s var(--ex-spring), border-color 0.3s, box-shadow 0.3s;
  --jm-grad: linear-gradient(90deg, var(--ex-amber), var(--ex-ember) 60%, var(--ex-cleared)); }
.rc:hover { transform: perspective(1100px) rotateX(calc((var(--my, .5) - .5) * -5deg)) rotateY(calc((var(--mx, .5) - .5) * 7deg)) translateY(-3px);
  border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow-hover); }
.rc.closed { opacity: 0.82; }
.rc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(340px 240px at calc(var(--mx, .5) * 100%) calc(var(--my, .5) * 100%), rgba(251, 146, 60, 0.14), transparent 60%); }
.rc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); box-shadow: 0 0 14px -1px var(--c); }

.rc-head { display: flex; align-items: center; gap: 11px; margin-bottom: 11px; }
.rc-avatar { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  font-size: 13px; font-weight: 850; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.rc-av-badge { position: absolute; right: -5px; bottom: -5px; padding: 2px; border-radius: 6px; color: var(--ex-text);
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); }
.rc-id { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.rc-name { font-size: 14px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-meta { font-size: 10.5px; color: var(--ex-text-muted); }
.rc-warn { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--ex-amber);
  background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }

.rc-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 13px; }
.rc-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
.rc-chip.type { color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.rc-chip.reason { color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }

/* journey meter */
.jm { margin-bottom: 4px; }
.jm-track { position: relative; height: 6px; border-radius: 999px; background: var(--ex-steel-soft); }
.jm-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; transition: width 0.8s var(--ex-spring);
  box-shadow: 0 0 10px -2px var(--ex-ember); }
.jm-head { position: absolute; right: -1px; top: 50%; width: 9px; height: 9px; border-radius: 50%; transform: translateY(-50%);
  background: var(--ex-amber-bright); box-shadow: 0 0 9px 1px var(--ex-amber-bright); }
.jm-node { position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; transform: translate(-50%, -50%);
  background: var(--ex-canvas); border: 1.6px solid var(--ex-steel-dim); transition: border-color 0.4s, background 0.4s; }
.jm-node.lit { border-color: var(--ex-ember); background: var(--ex-ember); }
.jm-node.cur { border-color: var(--ex-amber-bright); background: var(--ex-amber-bright); animation: ex-node-ping 2s ease-out infinite; }
.jm-cap { display: flex; align-items: center; justify-content: space-between; margin-top: 9px; }
.jm-stage { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; color: var(--ex-text-secondary); }
.jm-dot { width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
.jm-step { font-size: 10.5px; font-weight: 800; color: var(--ex-text-muted); }
.jm.halted .jm-track { opacity: 0.6; }

.rc-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--ex-border); }
.rc-when { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--ex-text-muted); }
.rc-days { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
.rc-days.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.rc-days.soon { color: var(--ex-amber-strong); background: var(--ex-amber-soft); }
.rc-days.over { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.rc-acts { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.rc-del { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; cursor: pointer;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); color: var(--ex-text-muted);
  opacity: 0; transform: translateX(4px); transition: opacity 0.25s, transform 0.25s var(--ex-spring), color 0.2s, border-color 0.2s, background 0.2s; }
.rc:hover .rc-del { opacity: 1; transform: translateX(0); }
.rc-del:hover { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 38%, transparent); background: var(--ex-blocked-soft); }
.rc-open { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 750; color: var(--ex-violet); background: none; border: none; cursor: pointer;
  transition: gap 0.25s var(--ex-spring); }
.rc-open:hover { gap: 8px; }
/* keep delete reachable on touch / no-hover devices */
@media (hover: none) { .rc-del { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .rc-shell { animation: none; }
  .rc:hover { transform: translateY(-2px); }
  .jm-node.cur { animation: none; }
  .jm-fill { transition: none; }
}
</style>
