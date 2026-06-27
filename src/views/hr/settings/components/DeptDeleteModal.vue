<template>
  <SetModal :open="open" :title="`Delete ${target?.name || 'department'}`" subtitle="Organization · Structure"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="720" aside-placement="bottom" mode="delete" @close="$emit('close')">
    <div class="dd">
      <!-- identity -->
      <Motion as="div" class="dd-target"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="dd-ic"><Building2 :size="18" /></span>
        <div class="dd-target-id">
          <b>{{ target?.name || '—' }}</b>
          <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
        </div>
        <span class="dd-stamp" :data-blocked="blocked">{{ blocked ? 'Blocked' : 'Clear' }}</span>
      </Motion>

      <!-- pre-flight clearance -->
      <div class="dd-checks">
        <span class="dd-checks-lab">Pre-flight clearance</span>

        <Motion as="div" class="dd-check" :data-state="headcount > 0 ? 'fail' : 'pass'"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
          <span class="dd-check-ic">
            <component :is="headcount > 0 ? XCircle : CheckCircle2" :size="15" />
          </span>
          <div class="dd-check-body">
            <b>{{ headcount > 0 ? `${headcount} active employee${headcount === 1 ? '' : 's'} still here` : 'No active employees' }}</b>
            <span>{{ headcount > 0 ? 'The server blocks deletion until every member is transferred or offboarded.' : 'Nothing is mapped to this department — safe to retire.' }}</span>
          </div>
          <button v-if="headcount > 0" class="dd-check-go" @click="$emit('view-people', target)">
            Reassign <ArrowRight :size="12" />
          </button>
        </Motion>

        <Motion as="div" class="dd-check" :data-state="childrenCount > 0 ? 'warn' : 'pass'"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
          <span class="dd-check-ic">
            <component :is="childrenCount > 0 ? AlertTriangle : CheckCircle2" :size="15" />
          </span>
          <div class="dd-check-body">
            <b>{{ childrenCount > 0 ? `${childrenCount} sub-department${childrenCount === 1 ? '' : 's'} will be orphaned` : 'No sub-departments' }}</b>
            <span>{{ childrenCount > 0 ? 'Their parent link will point at a removed unit. Re-parent them first to keep the tree intact.' : 'This is a leaf node — nothing branches from it.' }}</span>
          </div>
        </Motion>

        <Motion as="div" class="dd-check" data-state="info"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <span class="dd-check-ic"><Landmark :size="15" /></span>
          <div class="dd-check-body">
            <b>{{ target?.cost_center ? `Cost centre ${target.cost_center} unlinks` : 'No cost centre attached' }}</b>
            <span>Payroll cost mapping for this unit stops resolving once it is removed.</span>
          </div>
        </Motion>
      </div>

      <!-- reason -->
      <label class="dd-reason">
        <span class="dd-reason-lab">Reason for removal <i>(optional — for your own records)</i></span>
        <textarea v-model="reason" rows="2" class="dd-textarea" placeholder="e.g. Merged into Operations / restructured in Q3…" />
      </label>

      <Motion v-if="blocked" as="div" class="dd-blocked"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.3 }">
        <ShieldAlert :size="14" /> Deletion is locked while {{ headcount }} {{ headcount === 1 ? 'person belongs' : 'people belong' }} to this department.
      </Motion>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2" title="What removal does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete"
        orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn dd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ blocked ? 'Reassign people first' : 'Delete department' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Building2, Landmark, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Archive, ShieldCheck, History, GitBranch } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  headcount: { type: Number, default: 0 },
  childrenCount: { type: Number, default: 0 },
})
defineEmits(['close', 'confirm', 'view-people'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const blocked = computed(() => props.headcount > 0)
const affects = ['employees', 'attendance', 'payroll'].map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Removing ${props.target?.name || 'this department'} retires it from the org tree. It is a soft-delete — the row is kept for audit. Here is the exact sequence.`)
const steps = computed(() => [
  { icon: ShieldCheck, title: 'Pre-flight', text: 'The API refuses (409) while any active employee is still mapped here — reassign them first.' },
  { icon: Archive, title: 'Soft-delete', text: 'The department is tombstoned (is_deleted) — gone from pickers and the lattice, retained in the database.' },
  { icon: GitBranch, title: 'Re-parent', text: props.childrenCount > 0 ? `${props.childrenCount} sub-department(s) keep their stored parent — move them under another unit to avoid orphans.` : 'No children depend on this node, so the tree stays intact.' },
  { icon: History, title: 'Audit · reversible', text: 'The removal and your reason are sealed into the settings ledger; a super admin can restore it.' },
])
const note = computed(() => blocked.value
  ? `${props.headcount} employee record(s) reference this department. Transfer them in Employees before it can be removed.`
  : (props.childrenCount > 0 ? 'Sub-departments are not deleted with the parent — re-parent them or they become orphaned in the tree.' : 'This action is logged against your account and can be reversed by a super administrator.'))
</script>

<style scoped>
.dd { display: flex; flex-direction: column; gap: 14px; }
.dd-target { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.dd-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.dd-target-id { flex: 1; min-width: 0; }
.dd-target-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); }
.dd-target-id span { font-size: 11px; color: var(--set-text-muted); }
.dd-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); }
.dd-stamp[data-blocked="true"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 28%, transparent); }

.dd-checks { display: flex; flex-direction: column; gap: 8px; }
.dd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.dd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.dd-check[data-state="pass"] { border-left-color: var(--set-ok); }
.dd-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.dd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.dd-check[data-state="info"] { border-left-color: var(--set-gold); }
.dd-check-ic { flex-shrink: 0; margin-top: 1px; }
.dd-check[data-state="pass"] .dd-check-ic :deep(svg) { color: var(--set-ok); }
.dd-check[data-state="fail"] .dd-check-ic :deep(svg) { color: var(--set-conflict); }
.dd-check[data-state="warn"] .dd-check-ic :deep(svg) { color: var(--set-partial); }
.dd-check[data-state="info"] .dd-check-ic :deep(svg) { color: var(--set-gold); }
.dd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.dd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.dd-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-conflict); background: var(--set-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 32%, transparent); transition: all 0.2s; }
.dd-check-go:hover { background: color-mix(in srgb, var(--set-conflict) 18%, transparent); }

.dd-reason { display: flex; flex-direction: column; gap: 6px; }
.dd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.dd-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.dd-textarea { width: 100%; resize: vertical; min-height: 60px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.dd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.dd-textarea::placeholder { color: var(--hr-input-placeholder); }

.dd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.dd-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

.dd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.dd-confirm:hover { color: #fff; }
.dd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }
</style>
