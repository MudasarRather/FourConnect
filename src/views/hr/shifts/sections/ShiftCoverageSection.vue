<template>
  <section class="cov">
    <Motion as="header" class="cov-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><Radar :size="12" /> Prevent understaffing</span>
        <h2>Coverage Management</h2>
        <p>Set the minimum head-count each shift needs. The console compares it against today's active assignments and raises shortfall alerts — critical positions escalate.</p>
      </div>
      <div class="cov-summary">
        <div class="cs-stat"><b>{{ alerts?.total_shortfall || 0 }}</b><span>Total short</span></div>
        <div class="cs-stat alert"><b>{{ alerts?.critical_count || 0 }}</b><span>Critical</span></div>
      </div>
    </Motion>

    <!-- live alerts -->
    <div class="card">
      <header class="card-head"><span class="hnum">01</span><h3>Live coverage</h3>
        <span class="hmeta">{{ alerts?.on_date || '' }}</span>
        <button class="btn-ghost mini" @click="loadAlerts" :class="{ spin: loadingAlerts }"><RefreshCw :size="13" /></button>
      </header>
      <div v-if="(alerts?.alerts || []).length" class="cov-meters">
        <ShiftCoverageMeter v-for="a in alerts.alerts" :key="a.rule_id"
          :label="a.shift_name + (a.department_name ? ' · ' + a.department_name : '')"
          :required="a.min_staff" :assigned="a.assigned" :critical="a.critical" />
      </div>
      <ShiftEmptyState v-else :icon="Radar" title="No coverage rules yet" sub="Add a rule below to start monitoring staffing levels." />
    </div>

    <!-- rule editor -->
    <div class="card">
      <header class="card-head"><span class="hnum">02</span><h3>Minimum-staffing rules</h3></header>
      <div class="rule-form">
        <select v-model="form.shift_id" class="rf-input"><option value="">Shift…</option><option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.name }} ({{ s.code }})</option></select>
        <select v-model="form.department_id" class="rf-input"><option value="">All departments</option><option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option></select>
        <input v-model.number="form.min_staff" type="number" min="1" class="rf-input rf-num" placeholder="Min" />
        <input v-model="form.label" class="rf-input" placeholder="Label (optional)" />
        <label class="rf-crit"><input type="checkbox" v-model="form.critical" /> Critical</label>
        <button class="btn-primary" :disabled="!form.shift_id || saving" @click="addRule"><Plus :size="13" />Add</button>
      </div>

      <div class="rules-list" v-if="rules.length">
        <div v-for="r in rules" :key="r.id" class="rule-row">
          <span class="rr-shift"><span class="st-code">{{ r.shift_code }}</span> {{ r.shift_name }}</span>
          <span class="rr-dept">{{ r.department_name || 'All depts' }}</span>
          <span class="rr-min"><Users :size="11" /> min {{ r.min_staff }}</span>
          <ShiftStatusPill v-if="r.critical" tone="alert">Critical</ShiftStatusPill>
          <span class="flex-spacer" />
          <button class="rr-del" @click="removeRule(r)"><Trash2 :size="13" /></button>
        </div>
      </div>
      <p v-else class="empty-note">No rules configured yet.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Radar, RefreshCw, Plus, Users, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftCoverageMeter from '../components/ShiftCoverageMeter.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import {
  fetchCoverageRules, createCoverageRule, deleteCoverageRule, fetchCoverageAlerts,
  fetchShifts, fetchDepartments,
} from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const shifts = ref([])
const departments = ref([])
const rules = ref([])
const alerts = ref(null)
const loadingAlerts = ref(false)
const saving = ref(false)
const form = reactive({ shift_id: '', department_id: '', min_staff: 1, label: '', critical: false })

const loadAlerts = async () => {
  loadingAlerts.value = true
  try { alerts.value = await fetchCoverageAlerts() }
  catch { /* best-effort */ }
  finally { loadingAlerts.value = false }
}
const loadRules = async () => {
  try { const d = await fetchCoverageRules({ limit: 200 }); rules.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rules') }
}

onMounted(async () => {
  try { [shifts.value, departments.value] = await Promise.all([fetchShifts({ limit: 100 }).then(d => d.items || []), fetchDepartments()]) } catch { /* */ }
  await Promise.all([loadRules(), loadAlerts()])
})

const addRule = async () => {
  if (!form.shift_id) return
  saving.value = true
  try {
    await createCoverageRule({
      shift_id: form.shift_id, department_id: form.department_id || null,
      min_staff: Math.max(1, Number(form.min_staff) || 1), label: form.label || null, critical: form.critical,
    })
    toast.success('Coverage rule added')
    Object.assign(form, { shift_id: '', department_id: '', min_staff: 1, label: '', critical: false })
    await Promise.all([loadRules(), loadAlerts()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not add rule') }
  finally { saving.value = false }
}

const removeRule = async (r) => {
  if (!window.confirm(`Delete coverage rule for ${r.shift_name}?`)) return
  try {
    await deleteCoverageRule(r.id)
    toast.success('Rule deleted')
    await Promise.all([loadRules(), loadAlerts()]); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}
</script>

<style scoped>
.cov { display: flex; flex-direction: column; gap: 16px; }
.cov-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 620px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.cov-summary { position: relative; z-index: 1; display: flex; gap: 12px; flex-shrink: 0; }
.cs-stat { text-align: center; padding: 12px 18px; border-radius: 14px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.cs-stat b { display: block; font-family: var(--shift-mono); font-size: 24px; font-weight: 800; color: var(--shift-text); }
.cs-stat span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }
.cs-stat.alert b { color: var(--shift-alert); }

.card { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); flex: 1; }
.hmeta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }
.btn-ghost.mini { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; }
.btn-ghost.mini.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.cov-meters { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.rule-form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }
.rf-input { padding: 8px 11px; border-radius: 9px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; }
.rf-num { width: 80px; }
.rf-crit { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--shift-text-2); cursor: pointer; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 12.5px; }
.btn-primary:disabled { opacity: 0.55; }
.rules-list { display: flex; flex-direction: column; gap: 8px; }
.rule-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); font-size: 12.5px; }
.rr-shift { color: var(--shift-text); font-weight: 600; display: inline-flex; align-items: center; gap: 7px; }
.st-code { font-family: var(--shift-mono); font-size: 10px; padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.rr-dept { color: var(--shift-text-muted); }
.rr-min { display: inline-flex; align-items: center; gap: 4px; color: var(--shift-text-2); font-family: var(--shift-mono); font-size: 11.5px; }
.flex-spacer { flex: 1; }
.rr-del { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: grid; place-items: center; }
.empty-note { color: var(--shift-text-muted); font-size: 13px; padding: 12px; text-align: center; }
</style>
