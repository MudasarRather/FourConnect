<template>
  <RecModal
    :open="open"
    title="Close Position"
    :subtitle="position ? `${position.job_code} · ${position.job_title}` : ''"
    :icon="Lock"
    :width="560"
    @close="$emit('close')"
  >
    <div v-if="position" class="cp-body">
      <!-- ── Fill-state summary ─────────────────────────────────────── -->
      <Motion
        as="div"
        class="cp-summary"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.02, ease: EASE }"
      >
        <div class="cp-summary-head">
          <div class="cp-meta">
            <span v-if="position.department_name" class="cp-meta-item">
              <Building2 :size="13" /> {{ position.department_name }}
            </span>
            <span class="cp-meta-item">
              <Users :size="13" /> {{ position.applications_count || 0 }} applied
            </span>
          </div>
          <span :class="['cp-status', `cp-status-${(position.status || '').toLowerCase()}`]">
            <span class="dot" /> {{ humanStatus(position.status) }}
          </span>
        </div>

        <div class="cp-fill">
          <div class="cp-fill-top">
            <span class="cp-fill-label">Openings filled</span>
            <span class="cp-fill-count rec-mono">{{ filled }} / {{ openings }}</span>
          </div>
          <div class="cp-bar">
            <Motion
              as="div"
              class="cp-bar-fill"
              :class="{ 'is-full': fillPct >= 100 }"
              :initial="{ width: '0%' }"
              :animate="{ width: `${fillPct}%` }"
              :transition="{ duration: 0.7, delay: 0.12, ease: EASE }"
            />
          </div>
        </div>
      </Motion>

      <!-- ── Reason selection ───────────────────────────────────────── -->
      <Motion
        as="div"
        class="cp-block"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.08, ease: EASE }"
      >
        <HrFieldLabel label="Reason for closing" required />
        <div class="cp-reason-grid">
          <Motion
            v-for="r in reasons"
            :key="r.key"
            as="button"
            type="button"
            :class="['cp-reason', form.reason === r.key && 'is-selected']"
            :whileHover="{ y: -2 }"
            :whileTap="{ scale: 0.97 }"
            :transition="{ duration: 0.18, ease: EASE }"
            @click="form.reason = r.key"
          >
            <span class="cp-reason-ic"><component :is="r.icon" :size="16" /></span>
            <span class="cp-reason-text">
              <span class="cp-reason-label">{{ r.label }}</span>
              <span class="cp-reason-sub">{{ r.sub }}</span>
            </span>
            <Motion
              v-if="form.reason === r.key"
              as="span"
              class="cp-reason-check"
              :initial="{ scale: 0, opacity: 0 }"
              :animate="{ scale: 1, opacity: 1 }"
              :transition="{ duration: 0.22, ease: EASE }"
            >
              <Check :size="12" />
            </Motion>
          </Motion>
        </div>
      </Motion>

      <!-- ── Note ───────────────────────────────────────────────────── -->
      <Motion
        as="div"
        class="cp-block"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.13, ease: EASE }"
      >
        <HrFieldLabel
          :label="noteRequired ? 'Note' : 'Note (optional)'"
          :required="noteRequired"
        />
        <HrTextarea
          v-model="form.note"
          :rows="2"
          :placeholder="noteRequired ? 'Briefly explain why this position is closing…' : 'Any context worth keeping on record…'"
        />
      </Motion>

      <!-- ── Pipeline-impact awareness ──────────────────────────────── -->
      <Motion
        as="div"
        class="cp-block"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.18, ease: EASE }"
      >
        <div v-if="impactLoading" class="cp-impact is-loading">
          <Loader2 :size="15" class="spin" />
          <span>Checking who's still in the pipeline…</span>
        </div>
        <div v-else-if="activeCount > 0" class="cp-impact is-warn">
          <AlertTriangle :size="16" class="cp-impact-ic" />
          <div class="cp-impact-text">
            <strong>{{ activeCount }} candidate{{ activeCount === 1 ? '' : 's' }} still in the pipeline.</strong>
            Closing leaves {{ activeCount === 1 ? 'them' : 'them' }} unresolved — consider moving
            {{ activeCount === 1 ? 'this application' : 'these applications' }} to
            <em>Rejected</em> or <em>Withdrawn</em> first. Records stay visible either way.
          </div>
        </div>
        <div v-else class="cp-impact is-calm">
          <CheckCircle2 :size="16" class="cp-impact-ic" />
          <div class="cp-impact-text">
            No candidates are mid-pipeline. Closing stops new applications; existing records remain visible.
          </div>
        </div>
      </Motion>
    </div>

    <template #footer>
      <Motion
        as="button"
        type="button"
        class="cp-btn ghost"
        :whileHover="{ x: -2 }"
        :whileTap="{ scale: 0.96 }"
        @click="$emit('close')"
      >
        Cancel
      </Motion>
      <div class="grow" />
      <Motion
        as="button"
        type="button"
        class="cp-btn danger"
        :disabled="!canSubmit"
        :whileHover="canSubmit ? { y: -2, scale: 1.02 } : {}"
        :whileTap="canSubmit ? { scale: 0.97 } : {}"
        :transition="{ duration: 0.2, ease: EASE }"
        @click="onSubmit"
      >
        <Loader2 v-if="submitting" :size="15" class="spin" />
        <Lock v-else :size="15" />
        {{ submitting ? 'Closing…' : 'Close Position' }}
      </Motion>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Lock, Check, Loader2, AlertTriangle, CheckCircle2, Building2, Users,
  UserCheck, Ban, Wallet, Shuffle, MoreHorizontal,
} from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '@/components/hr/forms/HrFieldLabel.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import { useApplications } from '@/composables/useRecruitment'

const EASE = [0.16, 1, 0.3, 1]

const props = defineProps({
  open: { type: Boolean, default: false },
  position: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const reasons = [
  { key: 'FILLED',    label: 'Position Filled', sub: 'All openings hired', icon: UserCheck },
  { key: 'CANCELLED', label: 'Cancelled',       sub: 'No longer hiring',   icon: Ban },
  { key: 'BUDGET',    label: 'Budget Freeze',   sub: 'Headcount on hold',  icon: Wallet },
  { key: 'RESCOPED',  label: 'Re-scoped',       sub: 'Role redefined',     icon: Shuffle },
  { key: 'OTHER',     label: 'Other',           sub: 'Specify below',      icon: MoreHorizontal },
]

const form = ref({ reason: null, note: '' })

const openings = computed(() => Number(props.position?.openings_count || 0))
const filled = computed(() => Number(props.position?.filled_count || 0))
const fillPct = computed(() => {
  if (openings.value <= 0) return 0
  return Math.min(100, Math.round((filled.value / openings.value) * 100))
})
const noteRequired = computed(() => form.value.reason === 'OTHER')
const canSubmit = computed(() => {
  if (props.submitting || !form.value.reason) return false
  if (noteRequired.value && !form.value.note.trim()) return false
  return true
})

// ── Pipeline-impact: how many candidates are still mid-flight ──────────
const apps = useApplications()
const impactLoading = ref(false)
const ACTIVE_STAGES = new Set(['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'OFFER'])
const activeCount = computed(() =>
  (apps.items.value || []).filter((a) => ACTIVE_STAGES.has(a.current_stage)).length
)

const loadImpact = async () => {
  if (!props.position?.id) return
  impactLoading.value = true
  try {
    apps.setFilters({ position_id: props.position.id, stage: null, limit: 200 })
    await apps.fetchList()
  } finally {
    impactLoading.value = false
  }
}

watch(() => props.open, (v) => {
  if (!v) return
  // Preselect FILLED when the position is already fully staffed.
  form.value = {
    reason: openings.value > 0 && filled.value >= openings.value ? 'FILLED' : null,
    note: '',
  }
  loadImpact()
})

const onSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', { reason: form.value.reason, note: form.value.note.trim() || null })
}

const humanStatus = (s) => ({
  DRAFT: 'Draft', OPEN: 'Open', ON_HOLD: 'On Hold', CLOSED: 'Closed', ARCHIVED: 'Archived',
}[s] || s)
</script>

<style scoped>
.cp-body { display: flex; flex-direction: column; gap: 18px; }

/* ── Summary card ───────────────────────────────────────────────────── */
.cp-summary {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border);
  border-radius: 14px;
}
.cp-summary-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 14px;
}
.cp-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.cp-meta-item {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--hr-text-muted);
}
.cp-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid currentColor; flex-shrink: 0;
}
.cp-status .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; box-shadow: 0 0 6px currentColor;
}
.cp-status-open { color: #34d399; }
.cp-status-on_hold { color: #fbbf24; }
.cp-status-closed, .cp-status-draft, .cp-status-archived { color: #9ca3af; }

.cp-fill-top {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 7px;
}
.cp-fill-label {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.cp-fill-count { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.cp-bar {
  position: relative; height: 8px; border-radius: 999px; overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.cp-bar-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
}
.cp-bar-fill.is-full {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.55);
}

/* ── Blocks ─────────────────────────────────────────────────────────── */
.cp-block { display: flex; flex-direction: column; gap: 7px; }

/* ── Reason tiles ───────────────────────────────────────────────────── */
.cp-reason-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}
.cp-reason {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 13px; text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border);
  border-radius: 12px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: border-color 200ms var(--hr-spring), background 200ms var(--hr-spring),
              box-shadow 200ms var(--hr-spring);
}
.cp-reason:last-child:nth-child(odd) { grid-column: 1 / -1; }
.cp-reason:hover {
  border-color: var(--hr-accent-gold-border);
  background: rgba(251, 191, 36, 0.06);
  color: var(--hr-text);
}
.cp-reason.is-selected {
  border-color: var(--hr-accent-gold);
  background: var(--hr-accent-gold-soft);
  color: var(--hr-text);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}
.cp-reason-ic {
  display: grid; place-items: center;
  width: 32px; height: 32px; flex-shrink: 0;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 9px; color: var(--hr-accent-gold);
}
.cp-reason-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cp-reason-label { font-size: 13px; font-weight: 700; line-height: 1.2; }
.cp-reason-sub { font-size: 10.5px; color: var(--hr-text-muted); }
.cp-reason-check {
  position: absolute; top: 8px; right: 8px;
  display: grid; place-items: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--hr-accent-gold); color: #1a1a1c;
}

/* ── Impact banner ──────────────────────────────────────────────────── */
.cp-impact {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 12px;
  font-size: 12.5px; line-height: 1.45;
}
.cp-impact-ic { flex-shrink: 0; margin-top: 1px; }
.cp-impact-text { color: var(--hr-text-secondary); }
.cp-impact-text strong { color: var(--hr-text); font-weight: 700; }
.cp-impact-text em { font-style: normal; font-weight: 600; color: var(--hr-text); }
.cp-impact.is-loading {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border);
  color: var(--hr-text-muted);
  align-items: center;
}
.cp-impact.is-warn {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.32);
}
.cp-impact.is-warn .cp-impact-ic { color: #f87171; }
.cp-impact.is-calm {
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.28);
}
.cp-impact.is-calm .cp-impact-ic { color: #34d399; }

/* ── Footer buttons ─────────────────────────────────────────────────── */
.cp-btn {
  display: inline-flex; align-items: center; gap: 7px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--hr-border-strong);
}
.cp-btn.ghost { background: transparent; color: var(--hr-text-secondary); }
.cp-btn.ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.cp-btn.danger {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  border-color: #ef4444; color: #fff;
  box-shadow: 0 6px 18px -6px rgba(239, 68, 68, 0.55);
}
.cp-btn.danger:hover:not(:disabled) {
  box-shadow: 0 10px 26px -6px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.3);
}
.cp-btn.danger:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.grow { flex: 1; }
.spin { animation: cp-spin 1s linear infinite; }
@keyframes cp-spin { 100% { transform: rotate(360deg); } }

/* ═══════════ LIGHT THEME (modal is teleported to body) ═══════════ */
[data-theme="light"] .cp-summary {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .cp-meta-item { color: #6b5840; }
[data-theme="light"] .cp-status-open { color: #065f46; }
[data-theme="light"] .cp-status-on_hold { color: #b45309; }
[data-theme="light"] .cp-fill-label { color: #92400e; }
[data-theme="light"] .cp-fill-count { color: #1a1410; }
[data-theme="light"] .cp-bar { background: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .cp-reason {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(40, 25, 10, 0.12);
  color: #6b5840;
}
[data-theme="light"] .cp-reason:hover,
[data-theme="light"] .cp-reason.is-selected { color: #1a1410; }
[data-theme="light"] .cp-reason.is-selected {
  background: rgba(217, 119, 6, 0.12);
  border-color: #d97706;
}
[data-theme="light"] .cp-reason-ic {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .cp-reason-sub { color: #6b5840; }
[data-theme="light"] .cp-reason-check { background: #d97706; color: #fff; }
[data-theme="light"] .cp-impact-text { color: #4a3a28; }
[data-theme="light"] .cp-impact-text strong,
[data-theme="light"] .cp-impact-text em { color: #1a1410; }
[data-theme="light"] .cp-impact.is-loading {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(40, 25, 10, 0.12);
  color: #6b5840;
}
[data-theme="light"] .cp-impact.is-warn {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(185, 28, 28, 0.34);
}
[data-theme="light"] .cp-impact.is-warn .cp-impact-ic { color: #b91c1c; }
[data-theme="light"] .cp-impact.is-calm {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(5, 150, 105, 0.3);
}
[data-theme="light"] .cp-impact.is-calm .cp-impact-ic { color: #047857; }
[data-theme="light"] .cp-btn.ghost { color: #6b5840; }
[data-theme="light"] .cp-btn.ghost:hover { background: rgba(40, 25, 10, 0.05); color: #1a1410; }
</style>
