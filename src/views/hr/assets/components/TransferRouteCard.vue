<template>
  <article class="tr" ref="root" :data-status="transfer.status" :data-state="state" :style="{ '--i': index }"
    @click="$emit('detail')">
    <span class="as-spotlight" aria-hidden="true" />
    <span class="tr-edge" aria-hidden="true" />

    <header class="tr-head">
      <span class="tr-type"><component :is="typeIcon" :size="13" /> {{ typeLabel }}</span>
      <AsStamp :value="transfer.status" />
    </header>

    <!-- the custody route: FROM ⟶ (cargo) ⟶ TO -->
    <div class="tr-route">
      <div class="tr-node">
        <span class="tr-node-ic" :data-kind="fromNode.kind">
          <span v-if="fromNode.kind === 'employee'" class="tr-av">{{ initials(fromNode.label) }}</span>
          <component v-else :is="nodeIcon(fromNode.kind)" :size="16" />
        </span>
        <span class="tr-node-lab" :title="fromNode.label">{{ fromNode.label }}</span>
        <span class="tr-node-tag">from</span>
      </div>

      <div class="tr-beam">
        <span class="tr-beam-line" aria-hidden="true" />
        <span class="tr-chev" aria-hidden="true"><i /><i /><i /></span>
        <span v-if="active" class="tr-packet" aria-hidden="true" />
        <span class="tr-cargo">
          <Package :size="11" /><span class="as-mono">{{ transfer.asset_code }}</span>
        </span>
      </div>

      <div class="tr-node to">
        <span class="tr-node-ic" :data-kind="toNode.kind">
          <span v-if="completed" class="tr-ping" aria-hidden="true" />
          <span v-if="toNode.kind === 'employee'" class="tr-av">{{ initials(toNode.label) }}</span>
          <component v-else :is="nodeIcon(toNode.kind)" :size="16" />
        </span>
        <span class="tr-node-lab" :title="toNode.label">{{ toNode.label }}</span>
        <span class="tr-node-tag">to</span>
      </div>
    </div>

    <footer class="tr-foot">
      <div class="tr-stage" :class="{ closed }">
        <template v-if="!closed">
          <span v-for="(s, si) in STAGES" :key="s" class="tr-step" :class="{ on: si <= stageIdx, now: si === stageIdx }">
            <span class="tr-step-dot" /><span class="tr-step-lab">{{ s }}</span>
          </span>
        </template>
        <span v-else class="tr-closed"><component :is="closedIcon" :size="12" /> {{ titleCase(transfer.status) }}</span>
      </div>

      <div class="tr-actions" @click.stop>
        <span v-if="transfer.effective_date" class="tr-when"><CalendarClock :size="11" /> {{ fmtDate(transfer.effective_date) }}</span>
        <button v-if="transfer.status === 'REQUESTED'" class="tr-act ok" @click="$emit('action', 'approve')"><Check :size="13" /> Approve</button>
        <button v-if="transfer.status === 'APPROVED'" class="tr-act ok" @click="$emit('action', 'complete')"><PackageCheck :size="13" /> Complete</button>
        <button v-if="['REQUESTED','APPROVED'].includes(transfer.status)" class="tr-act ghost" @click="$emit('action', 'cancel')">Cancel</button>
        <button v-if="transfer.status === 'REQUESTED'" class="tr-act danger" @click="$emit('action', 'reject')">Reject</button>
        <button class="tr-act ghost icon" title="History" @click="$emit('detail')"><History :size="13" /></button>
      </div>
    </footer>
    <p v-if="transfer.reason" class="tr-reason">“{{ transfer.reason }}”</p>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Package, PackageCheck, Check, History, CalendarClock,
  UserRound, Warehouse, MapPin, Building2, ArrowLeftRight, XCircle, Ban,
} from 'lucide-vue-next'
import AsStamp from './AsStamp.vue'
import { titleCase } from '@/composables/useAssets'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  transfer: { type: Object, required: true },
  fromNode: { type: Object, default: () => ({ label: 'Store', kind: 'store' }) },
  toNode: { type: Object, default: () => ({ label: 'Store', kind: 'store' }) },
  index: { type: Number, default: 0 },
})
defineEmits(['action', 'detail'])

const root = ref(null)
usePointerSpotlight(root)

const TYPE_LABELS = {
  EMPLOYEE_TO_EMPLOYEE: 'Employee → Employee',
  EMPLOYEE_TO_STORE: 'Employee → Store',
  STORE_TO_EMPLOYEE: 'Store → Employee',
  LOCATION: 'Location move',
  DEPARTMENT: 'Department move',
}
const TYPE_ICONS = { LOCATION: MapPin, DEPARTMENT: Building2 }
const typeLabel = computed(() => TYPE_LABELS[props.transfer.transfer_type] || titleCase(props.transfer.transfer_type))
const typeIcon = computed(() => TYPE_ICONS[props.transfer.transfer_type] || ArrowLeftRight)

const STAGES = ['Requested', 'Approved', 'Completed']
const STAGE_IDX = { REQUESTED: 0, APPROVED: 1, COMPLETED: 2 }
const stageIdx = computed(() => STAGE_IDX[props.transfer.status] ?? 0)
const state = computed(() => {
  if (props.transfer.status === 'COMPLETED') return 'done'
  if (['REJECTED', 'CANCELLED'].includes(props.transfer.status)) return 'closed'
  return 'active'
})
const active = computed(() => state.value === 'active')
const completed = computed(() => state.value === 'done')
const closed = computed(() => state.value === 'closed')
const closedIcon = computed(() => props.transfer.status === 'REJECTED' ? XCircle : Ban)

const NODE_ICONS = { store: Warehouse, location: MapPin, department: Building2, employee: UserRound }
const nodeIcon = (k) => NODE_ICONS[k] || Warehouse
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) } catch { return d } }
</script>

<style scoped>
.tr { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 15px 17px 14px; border-radius: 17px; cursor: pointer;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transition: transform 0.3s var(--as-spring), box-shadow 0.3s var(--as-spring), border-color 0.3s;
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.tr:hover { transform: translateY(-3px); box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }

.tr-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent, var(--as-steel-dim)); opacity: 0.7; box-shadow: 0 0 12px var(--accent); }
.tr[data-status="REQUESTED"] { --accent: var(--as-st-reserved); }
.tr[data-status="APPROVED"]  { --accent: var(--as-st-allocated); }
.tr[data-status="COMPLETED"] { --accent: var(--as-st-available); }
.tr[data-status="REJECTED"]  { --accent: var(--as-al-lost); }
.tr[data-status="CANCELLED"] { --accent: var(--as-st-retired); }

.tr-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: relative; z-index: 1; }
.tr-type { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-muted); }
.tr-type :deep(svg) { color: var(--accent); }

/* ── route ── */
.tr-route { display: grid; grid-template-columns: minmax(76px, 1fr) minmax(120px, 1.8fr) minmax(76px, 1fr); align-items: center; gap: 8px; position: relative; z-index: 1; }
.tr-node { display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 0; text-align: center; }
.tr-node-ic { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; color: var(--as-text-secondary);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.tr-node-ic[data-kind="store"]      { color: var(--as-steel); }
.tr-node-ic[data-kind="location"]   { color: var(--as-ember); }
.tr-node-ic[data-kind="department"] { color: var(--as-amber); }
.tr-node.to .tr-node-ic { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 34%, transparent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
.tr-av { font-size: 12px; font-weight: 800; letter-spacing: 0.02em; }
.tr-ping { position: absolute; inset: -2px; border-radius: inherit; border: 1.5px solid var(--accent); animation: as-ping 1.8s ease-out infinite; }
.tr-node-lab { font-size: 11.5px; font-weight: 600; color: var(--as-text); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tr-node-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--as-text-dim); }

/* ── beam ── */
.tr-beam { position: relative; height: 44px; display: flex; align-items: center; }
.tr-beam-line { position: absolute; left: 0; right: 0; top: 50%; height: 2.5px; transform: translateY(-50%); border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--accent) 0 7px, transparent 7px 14px); background-size: 200% 100%; opacity: 0.55; }
.tr[data-state="active"] .tr-beam-line { animation: as-beam-flow 0.9s linear infinite; opacity: 0.85; }
.tr[data-status="APPROVED"] .tr-beam-line { animation-duration: 0.55s; }
.tr[data-status="COMPLETED"] .tr-beam-line { background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.7; animation: none; }
.tr[data-state="closed"] .tr-beam-line { opacity: 0.3; -webkit-mask: linear-gradient(90deg, #000 38%, transparent 42%, transparent 58%, #000 62%); mask: linear-gradient(90deg, #000 38%, transparent 42%, transparent 58%, #000 62%); }
.tr-chev { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); display: flex; justify-content: center; gap: 4px; opacity: 0.5; }
.tr-chev i { width: 5px; height: 5px; border-top: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); transform: rotate(45deg); }
.tr[data-state="closed"] .tr-chev { display: none; }
.tr-packet { position: absolute; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 10px 2px var(--accent); animation: as-packet 1.5s ease-in-out infinite; }
.tr[data-status="APPROVED"] .tr-packet { animation-duration: 1s; }
.tr-cargo { position: absolute; left: 50%; top: -3px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 8px; font-size: 10.5px; font-weight: 700; color: var(--as-text);
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-strong); white-space: nowrap; box-shadow: 0 4px 10px -6px rgba(0,0,0,0.5); }
.tr-cargo :deep(svg) { color: var(--accent); }

/* ── foot ── */
.tr-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; position: relative; z-index: 1; padding-top: 11px; border-top: 1px solid var(--as-border-soft); }
.tr-stage { display: flex; align-items: center; gap: 4px; }
.tr-step { display: inline-flex; align-items: center; gap: 5px; }
.tr-step:not(:last-child)::after { content: ''; width: 14px; height: 1.5px; background: var(--as-border-strong); border-radius: 2px; }
.tr-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--as-st-retired-soft); border: 1.5px solid var(--as-border-strong); transition: all 0.3s var(--as-spring); }
.tr-step-lab { font-size: 10px; font-weight: 600; color: var(--as-text-dim); }
.tr-step.on .tr-step-dot { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 7px color-mix(in srgb, var(--accent) 70%, transparent); }
.tr-step.on .tr-step-lab { color: var(--as-text-secondary); }
.tr-step.now .tr-step-dot { animation: as-relay-pulse 1.6s ease-in-out infinite; }
.tr-step.now .tr-step-lab { color: var(--as-text); font-weight: 700; }
.tr-closed { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--accent); }

.tr-actions { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
.tr-when { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--as-text-dim); margin-right: 2px; }
.tr-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-secondary); transition: all 0.2s var(--as-spring); }
.tr-act:hover { transform: translateY(-1px); }
.tr-act.icon { padding: 6px; }
.tr-act.ok { color: #1a1206; background: var(--hr-gradient-hero, linear-gradient(135deg, #fbbf24, #f59e0b)); border: none; box-shadow: 0 6px 16px -8px rgba(251,146,60,0.6); }
[data-theme="light"] .tr-act.ok { color: #2a1a06; }
.tr-act.ghost:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.tr-act.danger { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 30%, transparent); background: color-mix(in srgb, var(--as-cond-poor) 8%, transparent); }
.tr-act.danger:hover { background: color-mix(in srgb, var(--as-cond-poor) 16%, transparent); }

.tr-reason { margin: 0; font-size: 11.5px; font-style: italic; color: var(--as-text-muted); position: relative; z-index: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (prefers-reduced-motion: reduce) {
  .tr, .tr-beam-line, .tr-packet, .tr-ping, .tr-step.now .tr-step-dot { animation: none !important; }
  .tr-packet { display: none; }
}
</style>
