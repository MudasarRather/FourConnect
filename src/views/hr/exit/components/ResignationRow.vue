<template>
  <div class="rr-shell" :style="{ '--i': index }">
    <article ref="rowEl" class="rr" :class="{ closed }" @click="$emit('open', c)" role="button" tabindex="0"
      @keydown.enter="$emit('open', c)">
      <span class="rr-spine" :style="{ '--c': statusHex }" />
      <span class="rr-sheen" aria-hidden="true" />

      <div class="rr-emp">
        <span class="rr-avatar" :style="{ '--c': typeMeta.hex || 'var(--ex-violet)' }">{{ init }}</span>
        <span class="rr-id">
          <span class="rr-name">{{ c.employee_name || c.employee_code || '—' }}</span>
          <span class="rr-num ex-mono">{{ c.case_number }}</span>
        </span>
      </div>

      <span class="rr-cell type"><component :is="typeMeta.icon" :size="12" /> {{ typeMeta.label }}</span>

      <span class="rr-cell dept">{{ c.department_name || c.designation_name || '—' }}</span>

      <div class="rr-prog">
        <span class="rr-track"><span class="rr-fill" :style="{ width: fillPct, background: closed ? 'var(--ex-steel)' : 'var(--rr-grad)' }" /></span>
        <span class="rr-stage">{{ closed ? statusMeta.label : stageLabel }}</span>
      </div>

      <ExStatusPill :status="c.status" />

      <span class="rr-dates">
        <span class="rr-when"><template v-if="c.last_working_date">LWD {{ fmtDate(c.last_working_date) }}</template><template v-else>Filed {{ fmtDate(c.resignation_date) }}</template></span>
        <span v-if="daysLeft != null && c.status === 'NOTICE_PERIOD'" class="rr-days" :class="urgency">{{ daysLeft < 0 ? `${-daysLeft}d over` : `${daysLeft}d` }}</span>
      </span>

      <button v-if="deletable" class="rr-del" @click.stop="$emit('delete', c)" type="button"
        :title="preAccept ? 'Delete this not-yet-accepted request' : 'Delete this closed case'" aria-label="Delete case">
        <Trash2 :size="14" />
      </button>
      <button class="rr-go" @click.stop="$emit('open', c)" type="button" aria-label="Open"><ArrowRight :size="15" /></button>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Trash2 } from 'lucide-vue-next'
import ExStatusPill from './ExStatusPill.vue'
import { caseStatusMeta, resignationTypeMeta, fmtDate, daysRemaining, initials, isDeletable, isPreAccept } from '@/composables/useExit'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  c: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['open', 'delete'])

const rowEl = ref(null)
usePointerSpotlight(rowEl)

const statusMeta = computed(() => caseStatusMeta(props.c.status))
const statusHex = computed(() => statusMeta.value.hex)
const typeMeta = computed(() => resignationTypeMeta(props.c.resignation_type))
const init = computed(() => initials(props.c.employee_name))
const daysLeft = computed(() => daysRemaining(props.c.last_working_date))
const closed = computed(() => ['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(props.c.status))
const deletable = computed(() => isDeletable(props.c.status))
const preAccept = computed(() => isPreAccept(props.c.status))

const STATUS_FRAC = {
  DRAFT: 0.04, SUBMITTED: 0.13, MANAGER_REVIEW: 0.22, ACCEPTED: 0.36,
  NOTICE_PERIOD: 0.56, CLEARANCE: 0.74, SETTLEMENT: 0.87, COMPLETED: 1,
}
const STAGE_LABEL = {
  DRAFT: 'Filed', SUBMITTED: 'Filed', MANAGER_REVIEW: 'Review', ACCEPTED: 'Approved',
  NOTICE_PERIOD: 'Notice', CLEARANCE: 'Clearance', SETTLEMENT: 'F&F', COMPLETED: 'Relieved',
}
const fillPct = computed(() => Math.round((STATUS_FRAC[props.c.status] ?? 0.1) * 100) + '%')
const stageLabel = computed(() => STAGE_LABEL[props.c.status] || statusMeta.value.label)
const urgency = computed(() => {
  const d = daysLeft.value
  if (d == null) return ''
  if (d < 0) return 'over'
  if (d <= 7) return 'soon'
  return 'ok'
})
</script>

<style scoped>
.rr-shell { animation: ex-deal 0.45s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.03s); }
.rr { position: relative; overflow: hidden; cursor: pointer; display: grid; align-items: center; gap: 14px;
  grid-template-columns: minmax(180px, 1.5fr) minmax(120px, 0.9fr) minmax(110px, 0.9fr) minmax(150px, 1.2fr) auto minmax(130px, auto) 34px;
  padding: 11px 14px 11px 17px; border-radius: 14px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.25s var(--ex-spring), border-color 0.25s, box-shadow 0.25s; }
.rr:hover { transform: translateX(3px); border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow-hover); }
.rr.closed { opacity: 0.78; }
.rr-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); box-shadow: 0 0 12px -1px var(--c); }
.rr-sheen { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(300px 120px at calc(var(--mx, .5) * 100%) calc(var(--my, .5) * 100%), rgba(251, 146, 60, 0.1), transparent 60%); }

.rr-emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
.rr-avatar { display: grid; place-items: center; width: 33px; height: 33px; border-radius: 10px; flex-shrink: 0;
  font-size: 12px; font-weight: 850; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.rr-id { display: flex; flex-direction: column; min-width: 0; }
.rr-name { font-size: 13.5px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-num { font-size: 10px; color: var(--ex-text-muted); }

.rr-cell { font-size: 12px; color: var(--ex-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-cell.type { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--ex-violet); }
.rr-cell.dept { color: var(--ex-text-muted); }

.rr-prog { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.rr-track { height: 5px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.rr-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.7s var(--ex-spring); --rr-grad: linear-gradient(90deg, var(--ex-amber), var(--ex-ember) 60%, var(--ex-cleared)); }
.rr-stage { font-size: 10px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }

.rr-dates { display: flex; flex-direction: column; gap: 3px; text-align: right; }
.rr-when { font-size: 11px; color: var(--ex-text-muted); white-space: nowrap; }
.rr-days { font-size: 10.5px; font-weight: 800; }
.rr-days.ok { color: var(--ex-cleared); } .rr-days.soon { color: var(--ex-amber-strong); } .rr-days.over { color: var(--ex-blocked); }

.rr-go { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); color: var(--ex-violet); transition: transform 0.25s var(--ex-spring), background 0.25s; }
.rr-go:hover { transform: translateX(2px); background: var(--ex-violet-soft); }
/* hover-revealed delete, overlaid just left of the open arrow so the grid stays put */
.rr-del { position: absolute; right: 52px; top: 50%; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); color: var(--ex-text-muted);
  opacity: 0; transform: translateY(-50%) translateX(6px); pointer-events: none;
  transition: opacity 0.25s, transform 0.25s var(--ex-spring), color 0.2s, border-color 0.2s, background 0.2s; }
.rr:hover .rr-del, .rr:focus-within .rr-del { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }
.rr-del:hover { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 38%, transparent); background: var(--ex-blocked-soft); }

@media (max-width: 1080px) {
  .rr { grid-template-columns: minmax(160px, 1.4fr) minmax(110px, 0.9fr) minmax(140px, 1.1fr) auto 34px; }
  .rr-cell.dept, .rr-dates { display: none; }
}
@media (max-width: 680px) {
  .rr { grid-template-columns: 1fr auto 34px; gap: 10px; }
  .rr-cell.type, .rr-prog { display: none; }
}
@media (prefers-reduced-motion: reduce) { .rr-shell { animation: none; } .rr:hover { transform: none; } .rr-fill { transition: none; } }
</style>
