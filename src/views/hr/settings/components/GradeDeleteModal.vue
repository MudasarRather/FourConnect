<template>
  <SetModal :open="open" :title="`Delete ${target?.name || 'grade'}`" subtitle="Organization · Bands"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="720" aside-placement="bottom" mode="delete" @close="$emit('close')">
    <div class="gd">
      <Motion as="div" class="gd-target"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="gd-ic"><Layers :size="18" /></span>
        <div class="gd-target-id">
          <b>{{ target?.name || '—' }}</b>
          <span v-if="target?.code" class="set-mono">{{ target.code }}<template v-if="target?.level != null"> · L{{ target.level }}</template></span>
        </div>
        <span class="gd-stamp" :data-risk="hasRefs">{{ hasRefs ? 'Has references' : 'Safe' }}</span>
      </Motion>

      <div class="gd-checks">
        <span class="gd-checks-lab">Impact check</span>

        <Motion as="div" class="gd-check" :data-state="headcount > 0 ? 'warn' : 'pass'"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
          <span class="gd-check-ic"><component :is="headcount > 0 ? AlertTriangle : CheckCircle2" :size="15" /></span>
          <div class="gd-check-body">
            <b>{{ headcount > 0 ? `${headcount} employee${headcount === 1 ? '' : 's'} on this grade` : 'No employees on this grade' }}</b>
            <span>{{ headcount > 0 ? 'They keep the grade id — pay-level auto-fill and CTC-band checks stop resolving once it is gone.' : 'No salary records depend on this band.' }}</span>
          </div>
          <button v-if="headcount > 0" class="gd-check-go" @click="$emit('view-people', target)">Reassign <ArrowRight :size="12" /></button>
        </Motion>

        <Motion as="div" class="gd-check" :data-state="designationCount > 0 ? 'warn' : 'pass'"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
          <span class="gd-check-ic"><component :is="designationCount > 0 ? AlertTriangle : CheckCircle2" :size="15" /></span>
          <div class="gd-check-body">
            <b>{{ designationCount > 0 ? `${designationCount} designation${designationCount === 1 ? '' : 's'} mapped here` : 'No designations mapped' }}</b>
            <span>{{ designationCount > 0 ? 'Those job titles will lose their grade link — re-map them so new hires inherit the right band.' : 'No job titles point at this grade.' }}</span>
          </div>
          <button v-if="designationCount > 0" class="gd-check-go" @click="$emit('view-designations', target)">Re-map <ArrowRight :size="12" /></button>
        </Motion>

        <Motion as="div" class="gd-check" data-state="info"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <span class="gd-check-ic"><IndianRupee :size="15" /></span>
          <div class="gd-check-body">
            <b>{{ hasBand ? 'CTC band leaves the ladder' : 'No CTC band attached' }}</b>
            <span>The grade vanishes from the compensation spectrum and travel / DA eligibility derived from it.</span>
          </div>
        </Motion>
      </div>

      <label class="gd-reason">
        <span class="gd-reason-lab">Reason for removal <i>(optional — for your own records)</i></span>
        <textarea v-model="reason" rows="2" class="gd-textarea" placeholder="e.g. Merged G3 and G4 into a single band…" />
      </label>

      <Motion v-if="hasRefs" as="label" class="gd-ack"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.3 }">
        <input type="checkbox" v-model="acked" />
        <span><ShieldAlert :size="13" /> I understand {{ refTotal }} record{{ refTotal === 1 ? '' : 's' }} will be left pointing at a removed grade.</span>
      </Motion>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2" title="What removal does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete"
        orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn gd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ blocked ? 'Acknowledge to delete' : 'Delete grade' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Layers, IndianRupee, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  Archive, ShieldOff, History, GitBranch } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  headcount: { type: Number, default: 0 },
  designationCount: { type: Number, default: 0 },
})
defineEmits(['close', 'confirm', 'view-people', 'view-designations'])

const actor = useActor()
const reason = ref('')
const acked = ref(false)
watch(() => props.open, (v) => { if (v) { reason.value = ''; acked.value = false } })

const hasBand = computed(() => props.target && (props.target.min_ctc != null || props.target.max_ctc != null))
const refTotal = computed(() => props.headcount + props.designationCount)
const hasRefs = computed(() => refTotal.value > 0)
const blocked = computed(() => hasRefs.value && !acked.value)

const affects = ['payroll', 'travel'].map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Removing ${props.target?.name || 'this grade'} retires the pay band. Unlike departments, there is no server-side guard — so here is exactly what it touches.`)
const steps = computed(() => [
  { icon: ShieldOff, title: 'No hard guard', text: 'The API soft-deletes a grade even while records reference it — that is why this acknowledgement exists.' },
  { icon: GitBranch, title: 'Re-map first', text: refTotal.value > 0 ? `${props.headcount} employee(s) and ${props.designationCount} designation(s) point here — re-map them so band & pay-level logic keeps working.` : 'Nothing references this grade, so nothing is left dangling.' },
  { icon: Archive, title: 'Soft-delete', text: 'The grade is tombstoned (is_deleted) — gone from the spectrum and pickers, retained in the database.' },
  { icon: History, title: 'Audit · reversible', text: 'The removal is sealed into the settings ledger; a super admin can restore the grade later.' },
])
const note = computed(() => hasRefs.value
  ? `${refTotal.value} record(s) reference this grade. They will not be deleted — re-map them in Employees and Designations to avoid orphaned salary data.`
  : 'This action is logged against your account and can be reversed by a super administrator.')
</script>

<style scoped>
.gd { display: flex; flex-direction: column; gap: 14px; }
.gd-target { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.gd-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.gd-target-id { flex: 1; min-width: 0; }
.gd-target-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); }
.gd-target-id span { font-size: 11px; color: var(--set-text-muted); }
.gd-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); }
.gd-stamp[data-risk="true"] { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 28%, transparent); }

.gd-checks { display: flex; flex-direction: column; gap: 8px; }
.gd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.gd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.gd-check[data-state="pass"] { border-left-color: var(--set-ok); }
.gd-check[data-state="warn"] { border-left-color: var(--set-partial); background: color-mix(in srgb, var(--set-partial) 6%, var(--set-surface)); }
.gd-check[data-state="info"] { border-left-color: var(--set-gold); }
.gd-check-ic { flex-shrink: 0; margin-top: 1px; }
.gd-check[data-state="pass"] .gd-check-ic :deep(svg) { color: var(--set-ok); }
.gd-check[data-state="warn"] .gd-check-ic :deep(svg) { color: var(--set-partial); }
.gd-check[data-state="info"] .gd-check-ic :deep(svg) { color: var(--set-gold); }
.gd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.gd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.gd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.gd-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-partial); background: var(--set-partial-soft);
  border: 1px solid color-mix(in srgb, var(--set-partial) 32%, transparent); transition: all 0.2s; }
.gd-check-go:hover { background: color-mix(in srgb, var(--set-partial) 18%, transparent); }

.gd-reason { display: flex; flex-direction: column; gap: 6px; }
.gd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.gd-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.gd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.gd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.gd-textarea::placeholder { color: var(--hr-input-placeholder); }

.gd-ack { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.gd-ack input { width: 16px; height: 16px; accent-color: var(--set-conflict); cursor: pointer; flex-shrink: 0; }
.gd-ack span { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; line-height: 1.45; color: var(--set-text-secondary); }
.gd-ack span :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

.gd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.gd-confirm:hover { color: #fff; }
.gd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }
</style>
