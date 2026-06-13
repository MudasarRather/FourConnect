<template>
  <section class="otr">
    <Motion as="header" class="otr-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><Timer :size="12" /> Compensation engine</span>
        <h2>Overtime Rules</h2>
        <p>Configure OT thresholds, multipliers and caps per type. The resolver scores any (type, hours) against the highest-priority active rule — drives OT pay computation.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="openCreate"><Plus :size="14" />New rule</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <!-- live calculator -->
    <div class="calc">
      <div class="calc-head"><Calculator :size="14" /> OT calculator</div>
      <div class="calc-body">
        <label class="calc-field"><span>Type</span>
          <select v-model="calc.ot_type" class="calc-input" @change="runCalc">
            <option v-for="t in OT_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
        </label>
        <label class="calc-field"><span>Hours worked as OT</span>
          <input v-model.number="calc.hours" type="number" min="0" step="0.5" class="calc-input" @input="runCalc" />
        </label>
        <div class="calc-out" :class="{ matched: result?.matched }">
          <template v-if="result">
            <div class="co-row"><span>Rule</span><b>{{ result.matched ? result.rule_name : 'No matching rule' }}</b></div>
            <div class="co-row"><span>Multiplier</span><b>{{ result.multiplier }}×</b></div>
            <div class="co-row"><span>Payable</span><b>{{ result.payable_hours }}h <em v-if="result.capped">(capped)</em></b></div>
          </template>
          <span v-else class="co-hint">Enter hours to preview payout.</span>
        </div>
      </div>
    </div>

    <div class="grid">
      <Motion v-for="(r, i) in rules" :key="r.id" as="article" class="rule-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 * i }">
        <header class="rc-head">
          <h3>{{ r.name }}</h3>
          <span class="rc-type" :style="{ color: otTypeMeta(r.ot_type).color, borderColor: otTypeMeta(r.ot_type).color }">{{ otTypeMeta(r.ot_type).label }}</span>
        </header>
        <div class="rc-mult"><span class="mult-big">{{ r.multiplier }}×</span><span class="mult-cap">after {{ r.threshold_hours }}h<template v-if="r.max_ot_hours"> · cap {{ r.max_ot_hours }}h</template></span></div>
        <div class="rc-meta">
          <ShiftStatusPill v-if="r.approval_required" tone="gold"><ShieldCheck :size="10" /> Approval</ShiftStatusPill>
          <ShiftStatusPill tone="neutral">priority {{ r.priority }}</ShiftStatusPill>
        </div>
        <p v-if="r.description" class="rc-desc">{{ r.description }}</p>
        <div class="rc-actions">
          <button @click="openEdit(r)"><Pencil :size="13" /></button>
          <button class="danger" @click="del(r)"><Trash2 :size="13" /></button>
        </div>
      </Motion>
      <ShiftEmptyState v-if="!loading && !rules.length" :icon="Timer" title="No overtime rules yet"
        sub="Define how OT hours are multiplied and capped per type. Holiday OT at 2×, weekday at 1.5×, and so on.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />Create first rule</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftOvertimeRuleModal :open="showModal" :rule="editTarget" @close="showModal = false" @saved="reload" />
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Timer, Plus, RefreshCw, Calculator, ShieldCheck, Pencil, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftOvertimeRuleModal from '../modals/ShiftOvertimeRuleModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { OT_TYPES, otTypeMeta, fetchOvertimeRules, deleteOvertimeRule, resolveOvertimeRule } from '@/composables/useShifts'

const toast = useToast()
const rules = ref([])
const loading = ref(false)
const showModal = ref(false)
const editTarget = ref(null)
const calc = reactive({ ot_type: 'WEEKDAY', hours: 2 })
const result = ref(null)

const reload = async () => {
  loading.value = true
  try { const d = await fetchOvertimeRules({ limit: 100 }); rules.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rules') }
  finally { loading.value = false }
}
let timer = null
const runCalc = () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (calc.hours == null || calc.hours < 0) { result.value = null; return }
    try { result.value = await resolveOvertimeRule({ ot_type: calc.ot_type, hours: calc.hours }) } catch { result.value = null }
  }, 200)
}
onMounted(async () => { await reload(); runCalc() })

const openCreate = () => { editTarget.value = null; showModal.value = true }
const openEdit = (r) => { editTarget.value = r; showModal.value = true }
const del = async (r) => {
  if (!window.confirm(`Delete OT rule "${r.name}"?`)) return
  try { await deleteOvertimeRule(r.id); toast.success('Rule deleted'); await reload(); runCalc() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}
</script>

<style scoped>
.otr { display: flex; flex-direction: column; gap: 16px; }
.otr-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 660px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.calc { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 16px; padding: 16px 18px; }
.calc-head { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--shift-amber); margin-bottom: 12px; }
.calc-body { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 14px; align-items: end; }
.calc-field { display: flex; flex-direction: column; gap: 5px; }
.calc-field > span { font-size: 11px; color: var(--shift-text-muted); }
.calc-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.calc-out { background: var(--shift-surface-2); border: 1px dashed var(--shift-border-soft); border-radius: 11px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
.calc-out.matched { border-color: var(--shift-amber); border-style: solid; }
.co-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--shift-text-muted); }
.co-row b { color: var(--shift-text); font-family: var(--shift-mono); }
.co-row em { color: var(--shift-ember-strong); font-style: normal; font-size: 10px; }
.co-hint { font-size: 12px; color: var(--shift-text-dim); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 13px; }
.rule-card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.rc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.rc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); }
.rc-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 6px; border: 1px solid; opacity: 0.9; white-space: nowrap; }
.rc-mult { display: flex; align-items: baseline; gap: 8px; }
.mult-big { font-family: var(--shift-mono); font-size: 28px; font-weight: 800; color: var(--shift-amber); }
.mult-cap { font-size: 11px; color: var(--shift-text-muted); }
.rc-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.rc-desc { margin: 0; font-size: 11.5px; color: var(--shift-text-muted); line-height: 1.5; }
.rc-actions { display: flex; gap: 6px; margin-top: auto; justify-content: flex-end; }
.rc-actions button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; }
.rc-actions button:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.rc-actions button.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
@media (max-width: 700px) { .calc-body { grid-template-columns: 1fr; } }
</style>
