<template>
  <Teleport to="body">
    <transition name="cd-fade">
      <div v-if="open" class="cd-overlay" @mousedown.self="$emit('close')">
        <Motion class="cd-panel" as="aside"
          :initial="{ x: 80, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: 80, opacity: 0 }"
          :transition="{ duration: 0.46, ease: [0.16,1,0.3,1] }">

          <!-- ─── HEADER ─────────────────────────────────────────── -->
          <header class="cd-head">
            <div class="head-glow" aria-hidden="true" />
            <div class="head-foil" aria-hidden="true" />
            <div class="head-row">
              <Motion class="avatar" as="div"
                :initial="{ scale: 0.6, opacity: 0, rotate: -12 }"
                :animate="{ scale: 1, opacity: 1, rotate: 0 }"
                :transition="{ duration: 0.5, delay: 0.08, ease: [0.34,1.56,0.64,1] }">
                <span class="avatar-ring" aria-hidden="true" />
                {{ initials }}
              </Motion>
              <div class="head-id">
                <span class="eyebrow">Compensation file</span>
                <h2>{{ empName }}</h2>
                <p class="sub">{{ employee?.employee_id || '—' }} · {{ deptName }}</p>
              </div>
              <button class="x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
            </div>
            <Motion v-if="activeRow" class="ctc-badge" as="div"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.18, ease: [0.16,1,0.3,1] }">
              <span class="cb-spark" aria-hidden="true" />
              <span class="cb-label">Current CTC</span>
              <PayMoneyValue class="cb-value" :value="activeRow.annual_ctc" tone="net" />
              <span class="cb-mo">≈ {{ inr(activeRow.annual_ctc / 12) }}/mo</span>
            </Motion>
          </header>

          <div class="cd-body">

            <!-- ─── REVISION WORKFLOW ──────────────────────────── -->
            <Motion class="rev-card" as="section"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.12, ease: [0.16,1,0.3,1] }">

              <div class="rev-head">
                <h4>New revision</h4>
                <div class="stepper">
                  <button v-for="(s, i) in STEPS" :key="s.key" class="step-dot"
                    :class="{ on: step === i, done: i < step }" @click="step = i">
                    <span class="sd-num">{{ i + 1 }}</span>
                    <span class="sd-lbl">{{ s.label }}</span>
                  </button>
                </div>
                <div class="step-track"><span class="step-fill" :style="{ width: `${(step / (STEPS.length - 1)) * 100}%` }" /></div>
              </div>

              <transition :name="stepDir" mode="out-in">
                <!-- STEP 0 — DETAILS -->
                <div v-if="step === 0" key="details" class="step-pane">
                  <label class="fld">
                    <span>Effective from</span>
                    <HrDatePicker v-model="form.effective_from" placeholder="Select date" />
                  </label>
                  <label class="fld">
                    <span>Annual CTC (₹)</span>
                    <input v-model.number="form.annual_ctc" type="number" min="0" inputmode="numeric" placeholder="0" />
                    <transition name="hlp">
                      <em v-if="form.annual_ctc" class="hlp">≈ <b>{{ inr(form.annual_ctc / 12) }}</b>/mo</em>
                    </transition>
                  </label>
                </div>

                <!-- STEP 1 — MAPPING -->
                <div v-else-if="step === 1" key="mapping" class="step-pane">
                  <label class="fld">
                    <span>Salary structure</span>
                    <select v-model="form.structure_id">
                      <option :value="null">Employee default{{ defaultStructure ? ` · ${defaultStructure.name}` : '' }}</option>
                      <option v-for="s in structures" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                  </label>
                  <label class="fld">
                    <span>Tax regime</span>
                    <div class="seg">
                      <button type="button" :class="{ on: form.tax_regime === 'NEW' }" @click="form.tax_regime = 'NEW'">New</button>
                      <button type="button" :class="{ on: form.tax_regime === 'OLD' }" @click="form.tax_regime = 'OLD'">Old</button>
                    </div>
                  </label>
                </div>

                <!-- STEP 2 — REASON -->
                <div v-else key="reason" class="step-pane">
                  <span class="fld-lbl">Revision type</span>
                  <div class="rt-grid">
                    <button v-for="rt in REVISION_TYPES" :key="rt" type="button"
                      class="rt-chip" :class="{ on: form.revision_type === rt }"
                      @click="form.revision_type = rt">{{ rt }}</button>
                  </div>
                  <label class="fld">
                    <span>Note <em class="opt">optional</em></span>
                    <textarea v-model="form.revision_note" rows="2" placeholder="Context for this revision…" />
                  </label>
                </div>
              </transition>

              <div class="step-nav">
                <button v-if="step > 0" class="btn ghost" @click="step--">Back</button>
                <span class="spacer" />
                <button v-if="step < STEPS.length - 1" class="btn ghost next"
                  :disabled="step === 0 && (!form.effective_from || !form.annual_ctc)" @click="step++">Continue</button>
              </div>

              <!-- DELTA card -->
              <transition name="delta">
                <div v-if="delta" class="delta-card" :class="delta.dir">
                  <div class="dc-side">
                    <span class="dc-lbl">Current</span>
                    <PayMoneyValue class="dc-old" :value="delta.old" :animate="false" />
                  </div>
                  <div class="dc-arrow">
                    <span class="dc-amt">
                      <PayMoneyValue :value="delta.diff" :sign="true" :tone="delta.dir === 'up' ? 'net' : 'deduction'" />
                    </span>
                    <svg viewBox="0 0 40 14" class="dc-flow" aria-hidden="true">
                      <path d="M1 7 H32 M27 2 L34 7 L27 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="dc-pct"><PayCountUp :value="Math.abs(delta.pct)" :decimals="1" />% {{ delta.dir === 'up' ? 'increase' : 'cut' }}</span>
                  </div>
                  <div class="dc-side new">
                    <span class="dc-lbl">New</span>
                    <PayMoneyValue class="dc-new" :value="delta.next" tone="net" />
                  </div>
                </div>
              </transition>

              <!-- LIVE IMPACT PREVIEW -->
              <div class="impact">
                <div class="impact-head">
                  <span class="ih-title"><Sparkles :size="13" /> Live take-home impact</span>
                  <button class="btn micro" :disabled="previewing || !form.annual_ctc" @click="runPreview">
                    {{ previewing ? 'Computing…' : 'Preview impact' }}
                  </button>
                </div>
                <transition name="impact-fade" mode="out-in">
                  <div v-if="previewing" key="sk" class="pay-skel" style="height:92px;border-radius:14px" />
                  <div v-else-if="preview" key="pv" class="impact-body">
                    <div class="imp-bars">
                      <div v-for="b in impactBars" :key="b.key" class="imp-row">
                        <span class="imp-lbl">{{ b.label }}</span>
                        <div class="imp-bar"><span class="imp-fill" :class="b.key" :style="{ width: b.pct + '%' }" /></div>
                        <PayMoneyValue class="imp-val" :value="b.value" :tone="b.tone" :animate="false" />
                      </div>
                    </div>
                    <div class="imp-net">
                      <span>Monthly net</span>
                      <PayMoneyValue class="imp-net-v" :value="preview.net_pay" tone="net" />
                    </div>
                  </div>
                  <p v-else-if="previewNote" key="nt" class="imp-note">{{ previewNote }}</p>
                  <p v-else key="hint" class="imp-hint">Run a preview to see Gross · Deductions · Net before committing.</p>
                </transition>
              </div>

              <!-- ACTIONS -->
              <div class="rev-actions">
                <Motion as="button" class="btn ghost-strong"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                  :disabled="saving || !canSave" @click="save(false)">
                  {{ saving === 'draft' ? 'Saving…' : 'Save as draft' }}
                </Motion>
                <Motion as="button" class="btn primary"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
                  :disabled="saving || !canSave" @click="save(true)">
                  <span class="btn-sheen" aria-hidden="true" />
                  {{ saving === 'activate' ? 'Activating…' : 'Activate now' }}
                </Motion>
              </div>
            </Motion>

            <!-- ─── HISTORY TIMELINE ───────────────────────────── -->
            <h4 class="hist-h">Revision history</h4>
            <div v-if="loading" class="pay-skel" style="height:160px;border-radius:16px" />
            <PayEmptyState v-else-if="!history.length" :icon="Wallet"
              title="No compensation on record"
              sub="Add the first revision above to start this employee's pay history." />

            <ol v-else class="tl">
              <span class="tl-spine" aria-hidden="true" />
              <Motion v-for="(c, i) in history" :key="c.id" as="li" class="node"
                :class="[statusClass(c.status), { active: c.status === 'ACTIVE' }]"
                :initial="{ opacity: 0, x: 22 }" :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.16,1,0.3,1] }">

                <span class="node-dot" :class="statusClass(c.status)">
                  <span v-if="c.status === 'ACTIVE'" class="dot-pulse" aria-hidden="true" />
                </span>

                <div class="node-body">
                  <transition name="morph" mode="out-in">
                    <!-- normal -->
                    <div v-if="confirmId !== c.id" key="row" class="node-row">
                      <div class="node-top">
                        <PayMoneyValue class="node-ctc" :value="c.annual_ctc" :animate="false" />
                        <span class="chip" :class="statusClass(c.status)">{{ c.status }}</span>
                      </div>
                      <div class="node-meta">
                        <span class="nm-range">{{ fmtDate(c.effective_from) }} <span class="nm-arrow">→</span> {{ c.effective_to ? fmtDate(c.effective_to) : 'present' }}</span>
                        <span v-if="c.structure_name" class="nm-pill">{{ c.structure_name }}</span>
                        <span v-if="c.monthly_gross" class="nm-pill">gross {{ inr(c.monthly_gross) }}/mo</span>
                      </div>
                      <div v-if="c.revision_reason" class="node-reason">{{ c.revision_reason }}</div>
                      <div v-if="pctVsPrev(i) !== null" class="node-pct" :class="pctVsPrev(i) >= 0 ? 'up' : 'down'">
                        {{ pctVsPrev(i) >= 0 ? '▲' : '▼' }} {{ Math.abs(pctVsPrev(i)).toFixed(1) }}% vs previous
                      </div>
                      <div class="node-actions">
                        <button v-if="c.status === 'DRAFT'" class="btn micro accent"
                          :disabled="activatingId === c.id" @click="activate(c)">
                          {{ activatingId === c.id ? 'Activating…' : 'Activate' }}
                        </button>
                        <button v-if="c.status !== 'ACTIVE'" class="rm" @click="confirmId = c.id" aria-label="Delete revision">
                          <Trash2 :size="13" />
                        </button>
                      </div>
                    </div>
                    <!-- inline confirm -->
                    <div v-else key="confirm" class="node-confirm">
                      <p>Delete this revision?</p>
                      <div class="nc-btns">
                        <button class="btn ghost mini" @click="confirmId = null">Cancel</button>
                        <button class="btn danger mini" :disabled="deletingId === c.id" @click="del(c)">
                          {{ deletingId === c.id ? 'Deleting…' : 'Delete' }}
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>
              </Motion>
            </ol>
          </div>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Motion } from 'motion-v'
import { X, Trash2, Sparkles, Wallet } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayEmptyState from '../components/PayEmptyState.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  inr, fetchCompHistory, createCompensation, deleteCompensation,
  activateCompensation, fetchStructures, previewStructure,
} from '@/composables/usePayroll'

const props = defineProps({ open: Boolean, employee: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const STEPS = [
  { key: 'details', label: 'Details' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'reason',  label: 'Reason' },
]
const REVISION_TYPES = ['Annual increment', 'Promotion', 'Market adjustment', 'Correction', 'Joining offer']

const history = ref([])
const structures = ref([])
const loading = ref(false)
const saving = ref('')            // '' | 'draft' | 'activate'
const activatingId = ref(null)
const deletingId = ref(null)
const confirmId = ref(null)
const step = ref(0)
const stepDir = ref('step-fwd')
const preview = ref(null)
const previewing = ref(false)
const previewNote = ref('')

const blankForm = () => ({
  effective_from: '', annual_ctc: null, structure_id: null,
  tax_regime: props.employee?.tax_regime || 'NEW',
  revision_type: 'Annual increment', revision_note: '',
})
const form = ref(blankForm())

// ─── derived identity ───────────────────────────────────────────────
const empName = computed(() => props.employee?.user?.full_name || props.employee?.full_name || props.employee?.employee_id || 'Employee')
const deptName = computed(() => props.employee?.department?.name || props.employee?.department_name || '—')
const initials = computed(() => {
  const n = empName.value.trim()
  const parts = n.split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
})
const activeRow = computed(() => history.value.find(c => c.status === 'ACTIVE') || null)
const defaultStructure = computed(() => structures.value.find(s => s.is_default) || null)
const statusClass = (s) => ({ ACTIVE: 'ok', DRAFT: 'draft', SUPERSEDED: 'mut', CANCELLED: 'mut' }[s] || 'mut')

const canSave = computed(() => !!form.value.effective_from && !!form.value.annual_ctc)
const revisionReason = computed(() => {
  const t = form.value.revision_type || ''
  const note = form.value.revision_note?.trim()
  return note ? `${t} — ${note}` : t
})

// DELTA vs current active CTC
const delta = computed(() => {
  if (!activeRow.value || !form.value.annual_ctc) return null
  const old = Number(activeRow.value.annual_ctc) || 0
  const next = Number(form.value.annual_ctc) || 0
  if (!old || next === old) return null
  const diff = next - old
  return { old, next, diff, pct: (diff / old) * 100, dir: diff >= 0 ? 'up' : 'down' }
})

// ─── live impact preview ────────────────────────────────────────────
const impactBars = computed(() => {
  if (!preview.value) return []
  const g = Number(preview.value.gross_earnings) || 0
  const d = Number(preview.value.total_deductions) || 0
  const n = Number(preview.value.net_pay) || 0
  const max = Math.max(g, 1)
  return [
    { key: 'gross', label: 'Gross', value: g, tone: '', pct: 100 },
    { key: 'ded',   label: 'Deductions', value: d, tone: 'deduction', pct: Math.min(100, (d / max) * 100) },
    { key: 'net',   label: 'Net', value: n, tone: 'net', pct: Math.min(100, (n / max) * 100) },
  ]
})

const runPreview = async () => {
  if (!form.value.annual_ctc) return
  const sid = form.value.structure_id || defaultStructure.value?.id || null
  previewNote.value = ''
  if (!sid) {
    preview.value = null
    previewNote.value = 'No salary structure resolvable for this employee — assign a default structure to preview take-home.'
    return
  }
  previewing.value = true
  try {
    preview.value = await previewStructure({
      structure_id: sid,
      monthly_ctc: form.value.annual_ctc / 12,
      regime: form.value.tax_regime,
    })
  } catch (e) {
    preview.value = null
    previewNote.value = e?.response?.data?.detail || 'Could not compute take-home for this structure.'
  } finally { previewing.value = false }
}

// ─── data ───────────────────────────────────────────────────────────
const load = async () => {
  if (!props.employee) return
  loading.value = true
  try {
    history.value = (await fetchCompHistory(props.employee.id)).items || []
    if (!structures.value.length) structures.value = (await fetchStructures({ limit: 100 })).items || []
  } catch { toast.error('Failed to load compensation') }
  finally { loading.value = false }
}

watch(() => props.open, (o) => {
  if (o) {
    form.value = blankForm()
    step.value = 0
    preview.value = null
    previewNote.value = ''
    confirmId.value = null
    load()
  }
})
watch(step, (n, o) => { stepDir.value = n >= o ? 'step-fwd' : 'step-back' })

// ─── mutations ──────────────────────────────────────────────────────
const save = async (activate) => {
  if (!canSave.value || saving.value) return
  saving.value = activate ? 'activate' : 'draft'
  try {
    await createCompensation(props.employee.id, {
      effective_from: form.value.effective_from,
      annual_ctc: form.value.annual_ctc,
      structure_id: form.value.structure_id,
      tax_regime: form.value.tax_regime,
      revision_reason: revisionReason.value,
      activate,
    })
    toast.success(activate ? 'Revision activated' : 'Draft saved')
    form.value = blankForm()
    step.value = 0
    preview.value = null
    await load()
    emit('saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { saving.value = '' }
}

const activate = async (c) => {
  if (activatingId.value) return
  activatingId.value = c.id
  try { await activateCompensation(c.id); toast.success('Revision activated'); await load(); emit('saved') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Activate failed') }
  finally { activatingId.value = null }
}

const del = async (c) => {
  if (deletingId.value) return
  deletingId.value = c.id
  try { await deleteCompensation(c.id); toast.success('Revision deleted'); confirmId.value = null; await load(); emit('saved') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { deletingId.value = null }
}

// ─── helpers ────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
// % change of node i vs the next-older node (history sorted newest→oldest)
const pctVsPrev = (i) => {
  const cur = Number(history.value[i]?.annual_ctc) || 0
  const prev = Number(history.value[i + 1]?.annual_ctc) || 0
  if (!prev || !cur) return null
  return ((cur - prev) / prev) * 100
}
</script>

<style scoped>
/* ─── shell ─────────────────────────────────────────────────────── */
.cd-overlay { position: fixed; inset: 0; z-index: 4000; background: rgba(6,5,4,0.5); backdrop-filter: blur(7px); display: flex; justify-content: flex-end; }
.cd-panel { width: min(540px, 96vw); height: 100%; overflow-y: auto; background: var(--pay-surface-2); border-left: 1px solid var(--pay-border); }
.cd-panel::-webkit-scrollbar { width: 8px; }
.cd-panel::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 8px; }

/* ─── header ─────────────────────────────────────────────────────── */
.cd-head { position: sticky; top: 0; z-index: 3; padding: 22px 22px 18px; background: var(--pay-surface-2); border-bottom: 1px solid var(--pay-border-soft); overflow: hidden; }
.head-glow { position: absolute; top: -60px; right: -40px; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.22), transparent 68%); filter: blur(8px); pointer-events: none; }
.head-foil { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: linear-gradient(115deg, transparent 30%, rgba(253,230,138,0.16) 46%, rgba(255,255,255,0.28) 50%, rgba(253,230,138,0.16) 54%, transparent 70%);
  background-size: 280% 100%; animation: foil-sweep 6.5s var(--pay-ease) infinite; }
@keyframes foil-sweep { 0%,72% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
.head-row { position: relative; display: flex; align-items: center; gap: 14px; }
.avatar { position: relative; width: 50px; height: 50px; flex-shrink: 0; border-radius: 15px; display: grid; place-items: center; font-family: var(--pay-mono); font-weight: 800; font-size: 17px; color: #1a1206; background: var(--pay-grad-cta); box-shadow: 0 6px 20px -8px rgba(245,158,11,0.6); }
.avatar-ring { position: absolute; inset: -3px; border-radius: 18px; background: var(--pay-grad-coin); opacity: 0.55; z-index: -1; filter: blur(2px); }
.head-id { flex: 1; min-width: 0; }
.eyebrow { font-family: var(--pay-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--pay-treasury); }
.cd-head h2 { margin: 3px 0 2px; font-size: 19px; color: var(--pay-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { margin: 0; font-size: 12px; color: var(--pay-text-muted); }
.x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; transition: transform 160ms var(--pay-spring), color 160ms; }
.x:hover { color: var(--pay-ember); transform: rotate(90deg); }

.ctc-badge { position: relative; margin-top: 14px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 13px; background: var(--pay-net-soft); border: 1px solid rgba(52,211,153,0.28); overflow: hidden; }
.cb-spark { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pay-net); }
.cb-label { font-family: var(--pay-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-net-strong); }
.cb-value { font-size: 18px; }
.cb-mo { margin-left: auto; font-size: 11px; color: var(--pay-text-muted); font-family: var(--pay-mono); }

.cd-body { padding: 18px 22px 44px; }

/* ─── revision card ─────────────────────────────────────────────── */
.rev-card { background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 18px; padding: 18px; margin-bottom: 24px; position: relative; }
.rev-head { margin-bottom: 14px; }
.rev-head h4 { margin: 0 0 12px; font-size: 13.5px; color: var(--pay-text); }
.stepper { display: flex; gap: 6px; }
.step-dot { flex: 1; display: flex; align-items: center; gap: 7px; background: none; border: none; cursor: pointer; padding: 0; }
.sd-num { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-family: var(--pay-mono); font-size: 11px; font-weight: 700; flex-shrink: 0; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted); transition: all 220ms var(--pay-spring); }
.step-dot.on .sd-num { background: var(--pay-grad-cta); color: #1a1206; border-color: transparent; transform: scale(1.08); }
.step-dot.done .sd-num { background: var(--pay-net-soft); color: var(--pay-net-strong); border-color: rgba(52,211,153,0.4); }
.sd-lbl { font-size: 11px; color: var(--pay-text-muted); white-space: nowrap; transition: color 180ms; }
.step-dot.on .sd-lbl { color: var(--pay-text); font-weight: 600; }
.step-track { height: 3px; border-radius: 3px; background: var(--pay-border-soft); margin-top: 10px; overflow: hidden; }
.step-fill { display: block; height: 100%; background: var(--pay-grad-cta); border-radius: 3px; transition: width 420ms var(--pay-ease); }

.step-pane { display: flex; flex-direction: column; gap: 12px; min-height: 104px; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld span, .fld-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--pay-text-muted); }
.fld .opt { text-transform: none; letter-spacing: 0; color: var(--pay-text-muted); opacity: 0.7; margin-left: 4px; font-style: italic; }
.fld input, .fld select, .fld textarea { background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); border-radius: 11px; padding: 10px 12px; color: var(--pay-text); font-size: 13.5px; outline: none; transition: border-color 160ms, box-shadow 160ms; font-family: inherit; }
.fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--pay-amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.14); }
.fld textarea { resize: vertical; }
.hlp { font-size: 12px; color: var(--pay-text-2); font-style: normal; }
.hlp b { color: var(--pay-treasury); font-family: var(--pay-mono); }
.hlp-enter-active { transition: opacity 220ms, transform 220ms var(--pay-ease); }
.hlp-enter-from { opacity: 0; transform: translateY(-3px); }

.seg { display: flex; gap: 6px; }
.seg button { flex: 1; padding: 9px 0; border-radius: 10px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); font-size: 13px; cursor: pointer; transition: all 180ms var(--pay-ease); }
.seg button.on { background: var(--pay-grad-cta); color: #1a1206; border-color: transparent; font-weight: 700; }

.rt-grid { display: flex; flex-wrap: wrap; gap: 7px; }
.rt-chip { padding: 7px 13px; border-radius: 999px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); font-size: 12px; cursor: pointer; transition: all 180ms var(--pay-spring); }
.rt-chip:hover { border-color: var(--pay-amber); }
.rt-chip.on { background: linear-gradient(135deg, rgba(245,158,11,0.18), rgba(234,88,12,0.14)); border-color: var(--pay-amber); color: var(--pay-treasury); font-weight: 600; }

.step-nav { display: flex; align-items: center; margin-top: 14px; }
.step-nav .spacer { flex: 1; }

/* step transitions */
.step-fwd-enter-active, .step-fwd-leave-active, .step-back-enter-active, .step-back-leave-active { transition: opacity 240ms var(--pay-ease), transform 240ms var(--pay-ease); }
.step-fwd-enter-from { opacity: 0; transform: translateX(18px); }
.step-fwd-leave-to { opacity: 0; transform: translateX(-18px); }
.step-back-enter-from { opacity: 0; transform: translateX(-18px); }
.step-back-leave-to { opacity: 0; transform: translateX(18px); }

/* ─── delta card ────────────────────────────────────────────────── */
.delta-card { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-top: 16px; padding: 14px; border-radius: 14px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); }
.delta-card.up { border-color: rgba(52,211,153,0.32); background: var(--pay-net-soft); }
.delta-card.down { border-color: rgba(194,65,12,0.3); background: var(--pay-deduction-soft); }
.dc-side { display: flex; flex-direction: column; gap: 3px; }
.dc-side.new { text-align: right; align-items: flex-end; }
.dc-lbl { font-family: var(--pay-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-text-muted); }
.dc-old { font-size: 14px; color: var(--pay-text-2); opacity: 0.8; }
.dc-new { font-size: 16px; }
.dc-arrow { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0 4px; }
.dc-amt { font-size: 13px; }
.dc-flow { width: 40px; height: 14px; }
.delta-card.up .dc-flow { color: var(--pay-net); }
.delta-card.down .dc-flow { color: var(--pay-deduction); transform: scaleX(-1); }
.dc-pct { font-size: 9.5px; font-family: var(--pay-mono); text-transform: uppercase; letter-spacing: 0.06em; }
.delta-card.up .dc-pct { color: var(--pay-net-strong); }
.delta-card.down .dc-pct { color: var(--pay-deduction); }
.delta-enter-active { transition: opacity 320ms var(--pay-ease), transform 320ms var(--pay-spring); }
.delta-enter-from { opacity: 0; transform: translateY(8px) scale(0.98); }
.delta-leave-active { transition: opacity 180ms; }
.delta-leave-to { opacity: 0; }

/* ─── impact preview ────────────────────────────────────────────── */
.impact { margin-top: 16px; padding: 14px; border-radius: 14px; border: 1px dashed var(--pay-border); background: var(--pay-surface-2); }
.impact-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ih-title { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pay-text-2); font-weight: 600; }
.ih-title svg { color: var(--pay-amber); }
.impact-body { display: flex; flex-direction: column; gap: 12px; }
.imp-bars { display: flex; flex-direction: column; gap: 9px; }
.imp-row { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 10px; }
.imp-lbl { font-size: 11px; color: var(--pay-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.imp-bar { height: 7px; border-radius: 7px; background: var(--pay-border-soft); overflow: hidden; }
.imp-fill { display: block; height: 100%; border-radius: 7px; transform-origin: left; transition: width 600ms var(--pay-ease); }
.imp-fill.gross { background: linear-gradient(90deg, var(--pay-treasury), var(--pay-mint)); }
.imp-fill.ded { background: linear-gradient(90deg, #c2410c, #fb923c); }
.imp-fill.net { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.imp-val { font-size: 13px; }
.imp-net { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--pay-border-soft); }
.imp-net span { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-text-muted); }
.imp-net-v { font-size: 20px; }
.imp-note { font-size: 12px; color: var(--pay-ember); margin: 0; line-height: 1.5; }
.imp-hint { font-size: 12px; color: var(--pay-text-muted); margin: 0; }
.impact-fade-enter-active, .impact-fade-leave-active { transition: opacity 220ms; }
.impact-fade-enter-from, .impact-fade-leave-to { opacity: 0; }

/* ─── actions ───────────────────────────────────────────────────── */
.rev-actions { display: flex; gap: 10px; margin-top: 18px; }
.rev-actions .btn { flex: 1; }
.btn { border-radius: 12px; padding: 11px 18px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent; transition: opacity 160ms; font-family: inherit; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { position: relative; background: var(--pay-grad-cta); color: #1a1206; border: none; overflow: hidden; }
.btn-sheen { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%); background-size: 250% 100%; animation: sheen 3.4s var(--pay-ease) infinite; pointer-events: none; }
@keyframes sheen { 0%,60% { background-position: 150% 0; } 100% { background-position: -50% 0; } }
.btn.ghost-strong { background: var(--pay-surface-2); border-color: var(--pay-border); color: var(--pay-text); }
.btn.ghost { background: var(--pay-surface-2); border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.btn.ghost.next { color: var(--pay-treasury); border-color: var(--pay-amber); }
.btn.danger { background: var(--pay-deduction); color: #fff; border: none; }
.btn.micro { padding: 6px 12px; font-size: 11.5px; border-radius: 9px; background: var(--pay-surface); border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.btn.micro.accent { background: var(--pay-grad-cta); color: #1a1206; border: none; }
.btn.mini { padding: 6px 14px; font-size: 12px; border-radius: 9px; }

/* ─── history timeline ──────────────────────────────────────────── */
.hist-h { font-size: 13.5px; color: var(--pay-text); margin: 0 0 16px; }
.tl { list-style: none; margin: 0; padding: 0 0 0 6px; position: relative; }
.tl-spine { position: absolute; left: 11px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(180deg, var(--pay-treasury), var(--pay-amber) 40%, var(--pay-border-soft)); border-radius: 2px; opacity: 0.5; }
.node { position: relative; display: flex; gap: 16px; padding-bottom: 18px; }
.node:last-child { padding-bottom: 0; }
.node-dot { position: relative; width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; z-index: 1; background: var(--pay-text-muted); box-shadow: 0 0 0 4px var(--pay-surface-2); }
.node-dot.ok { background: var(--pay-net); }
.node-dot.draft { background: var(--pay-st-draft); }
.node-dot.mut { background: var(--pay-text-muted); }
.dot-pulse { position: absolute; inset: -4px; border-radius: 50%; background: var(--pay-net); opacity: 0.5; animation: dot-pulse 2s var(--pay-ease) infinite; }
@keyframes dot-pulse { 0% { transform: scale(0.7); opacity: 0.55; } 70%,100% { transform: scale(2.1); opacity: 0; } }

.node-body { flex: 1; min-width: 0; border-radius: 14px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface); padding: 13px 14px; transition: border-color 200ms, box-shadow 200ms; }
.node.active .node-body { border-color: rgba(52,211,153,0.32); background: var(--pay-net-soft); box-shadow: 0 6px 24px -14px rgba(52,211,153,0.5); }
.node-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.node-ctc { font-size: 17px; color: var(--pay-text); }
.chip { font-family: var(--pay-mono); font-size: 9.5px; padding: 3px 8px; border-radius: 7px; letter-spacing: 0.04em; }
.chip.ok { color: var(--pay-net-strong); background: var(--pay-net-soft); }
.chip.draft { color: var(--pay-st-draft); background: rgba(253,224,71,0.14); }
.chip.mut { color: var(--pay-text-muted); background: rgba(128,128,128,0.12); }
.node-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 7px; font-size: 11px; color: var(--pay-text-muted); }
.nm-range { font-family: var(--pay-mono); }
.nm-arrow { color: var(--pay-treasury); }
.nm-pill { padding: 2px 8px; border-radius: 6px; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.node-reason { margin-top: 8px; font-size: 12px; color: var(--pay-text-2); line-height: 1.45; }
.node-pct { margin-top: 7px; font-size: 11px; font-family: var(--pay-mono); }
.node-pct.up { color: var(--pay-net-strong); }
.node-pct.down { color: var(--pay-deduction); }
.node-actions { display: flex; align-items: center; gap: 8px; margin-top: 11px; }
.node-actions:empty { display: none; }
.rm { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-muted); cursor: pointer; display: grid; place-items: center; margin-left: auto; transition: all 160ms var(--pay-spring); }
.rm:hover { color: var(--pay-deduction); border-color: var(--pay-deduction); }

.node-confirm { display: flex; flex-direction: column; gap: 10px; }
.node-confirm p { margin: 0; font-size: 13px; color: var(--pay-text); font-weight: 600; }
.nc-btns { display: flex; gap: 8px; }
.morph-enter-active, .morph-leave-active { transition: opacity 200ms var(--pay-ease), transform 200ms var(--pay-ease); }
.morph-enter-from { opacity: 0; transform: scale(0.97); }
.morph-leave-to { opacity: 0; transform: scale(0.97); }

/* ─── overlay fade ──────────────────────────────────────────────── */
.cd-fade-enter-active, .cd-fade-leave-active { transition: opacity 0.3s; }
.cd-fade-enter-from, .cd-fade-leave-to { opacity: 0; }

/* ─── reduced motion ────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .head-foil, .btn-sheen, .dot-pulse { animation: none; }
  .head-foil { opacity: 0.2; }
  .imp-fill, .step-fill { transition: none; }
}
</style>
