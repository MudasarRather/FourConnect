<template>
  <TrnModal :open="open" wide
    :title="isEdit ? 'Update competency' : 'Assess a competency'"
    subtitle="Map an employee's proficiency against the role requirement." :icon="Grid3x3" @close="$emit('close')">

    <div v-if="loadingRefs" class="se-loading">
      <div v-for="n in 5" :key="n" class="trn-skel" style="height: 58px" />
    </div>

    <div v-else class="se-layout">
      <!-- ── form ── -->
      <div class="se-form">
        <!-- who & what -->
        <Motion as="section" class="se-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.04, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="se-gtitle"><UserSquare :size="13" /> Who &amp; what</h4>
          <div class="se-fields">
            <template v-if="locked">
              <div class="se-chip-row">
                <span class="se-chip">
                  <span class="se-chip-av">{{ empInitials }}</span>
                  <span class="se-chip-body">
                    <span class="se-chip-name">{{ displayEmp }}</span>
                    <span class="se-chip-meta">{{ entryMeta || 'Employee' }}</span>
                  </span>
                </span>
                <span class="se-chip-arrow"><ArrowRight :size="15" /></span>
                <span class="se-chip">
                  <span class="se-chip-dot" :style="{ background: skillCatColor }" />
                  <span class="se-chip-body">
                    <span class="se-chip-name">{{ displaySkill }}</span>
                    <span class="se-chip-meta">{{ skillCatLabel }}</span>
                  </span>
                </span>
              </div>
            </template>
            <template v-else>
              <TrnSelect v-model="form.employee_id" label="Employee" required searchable
                search-placeholder="Search employees…" :options="employeeOptions"
                :placeholder="loadingEmps ? 'Loading employees…' : (employeeOptions.length ? 'Select an employee…' : 'No employees found')" />
              <TrnSelect v-if="skillOptions.length" v-model="form.skill_id" label="Skill" required searchable
                search-placeholder="Search skills…" :options="skillOptions" placeholder="Select a skill…" />
              <div v-else class="se-noskills">
                <span class="se-noskills-ic"><Grid3x3 :size="17" /></span>
                <div class="se-noskills-body">
                  <span class="se-noskills-lab">Skill <i class="req">*</i></span>
                  <p>Your skill catalog is empty. Add at least one skill before you can assess a competency.</p>
                </div>
                <button type="button" class="trn-btn trn-btn-ghost se-noskills-cta" @click="$emit('manage')">
                  <Plus :size="14" /> Add skills
                </button>
              </div>
            </template>
          </div>
        </Motion>

        <!-- proficiency ladder -->
        <Motion as="section" class="se-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.11, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="se-gtitle"><Gauge :size="13" /> Current proficiency</h4>
          <div class="se-ladder" role="radiogroup" aria-label="Current proficiency level">
            <button v-for="lv in LEVELS" :key="lv.v" type="button" class="se-pad"
              :class="{ filled: lv.v <= form.current_level, active: lv.v === form.current_level, target: lv.v === reqNum }"
              :style="{ '--pc': padColor(lv.v) }"
              role="radio" :aria-checked="lv.v === form.current_level"
              @click="setLevel(lv.v)" @mouseenter="hoverLevel = lv.v" @mouseleave="hoverLevel = 0">
              <span class="se-pad-fill" />
              <span class="se-pad-num trn-mono">{{ lv.v }}</span>
              <span v-if="lv.v === reqNum" class="se-pad-target" aria-hidden="true"><Target :size="11" /></span>
            </button>
          </div>
          <div class="se-ladder-foot">
            <span class="se-level-name">{{ (LEVELS.find(l => l.v === (hoverLevel || form.current_level)) || {}).name }}</span>
            <span class="se-level-hint trn-mono">level {{ hoverLevel || form.current_level }} / 5</span>
          </div>

          <div class="se-req">
            <TrnSelect v-model="reqModel" label="Required level" :options="reqOptions"
              placeholder="Inherit role requirement" />
            <p class="se-req-hint">Leave on <b>inherit</b> to use the designation / grade baseline.</p>
          </div>
        </Motion>

        <!-- notes -->
        <Motion as="section" class="se-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="se-gtitle"><NotebookPen :size="13" /> Evidence &amp; notes</h4>
          <TrnField v-model="form.notes" type="textarea" :rows="3"
            placeholder="Evidence, last assessed by, development plan…" />
        </Motion>
      </div>

      <!-- ── live preview ── -->
      <aside class="se-aside">
        <span class="se-aside-eyebrow"><Sparkles :size="12" /> Star preview</span>
        <Motion as="div" class="se-star" :class="bandKey" :style="{ '--bc': bandColor }"
          :animate="{ scale: ready ? 1 : 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="se-star-aura" aria-hidden="true" />
          <div class="se-star-head">
            <span class="se-star-av">{{ empInitials }}</span>
            <div class="se-star-id">
              <span class="se-star-emp">{{ displayEmp || 'Select an employee' }}</span>
              <span class="se-star-skill"><i class="se-star-cdot" :style="{ background: skillCatColor }" />{{ displaySkill || 'Select a skill' }}</span>
            </div>
          </div>

          <!-- radial gauge -->
          <div class="se-dial">
            <svg :viewBox="`0 0 ${GZ} ${GZ}`" class="se-dial-svg" aria-hidden="true">
              <circle class="se-dial-track" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GS" />
              <circle class="se-dial-arc" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GS"
                stroke-linecap="round" :stroke-dasharray="GCIRC"
                :stroke-dashoffset="ready ? gaugeOffset : GCIRC"
                :transform="`rotate(-90 ${GC} ${GC})`" />
            </svg>
            <div class="se-dial-center">
              <span class="se-dial-cur trn-mono">{{ form.current_level }}</span>
              <span class="se-dial-req">{{ reqNum ? `of ${reqNum} req` : 'baseline' }}</span>
            </div>
          </div>

          <span class="se-band">{{ bandLabel }}</span>

          <!-- gap verdict -->
          <div class="se-verdict" :class="{ met: gapPreview === 0 || reqNum === 0 }">
            <component :is="gapPreview > 0 && reqNum ? TrendingDown : CheckCircle2" :size="15" />
            <span v-if="!reqNum">Compared to the inherited role baseline on save.</span>
            <span v-else-if="gapPreview > 0"><b>{{ gapPreview }}</b>-level gap to requirement</span>
            <span v-else>Meets the role requirement</span>
          </div>
        </Motion>
        <p class="se-foot-hint"><Clock :size="11" /> Recorded as assessed today — appears in the matrix &amp; gap landscape instantly.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="15" />
        {{ isEdit ? 'Save assessment' : 'Record assessment' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Grid3x3, Loader, Check, CheckCircle2, TrendingDown, UserSquare, Gauge,
  NotebookPen, Sparkles, ArrowRight, Target, Clock, Plus,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { upsertEmployeeSkill, patchEmployeeSkill, fetchSkills } from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  entry: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved', 'manage'])
const toast = useToast()
const reduced = prefersReduced()

const isEdit = computed(() => !!(props.entry && props.entry.id))
// a pre-chosen cell (clicked from the matrix) OR an edit — both lock the who/what
const prefilled = computed(() => !!(props.entry && props.entry.employee_id && props.entry.skill_id))
const locked = computed(() => isEdit.value || prefilled.value)

const skills = ref([])
const employees = ref([])
const loadingRefs = ref(false)
const loadingEmps = ref(false)
const saving = ref(false)
const ready = ref(false)
const hoverLevel = ref(0)

const LEVELS = [
  { v: 1, name: 'Novice' },
  { v: 2, name: 'Advanced beginner' },
  { v: 3, name: 'Competent' },
  { v: 4, name: 'Proficient' },
  { v: 5, name: 'Expert' },
]

const blank = () => ({ employee_id: '', skill_id: '', current_level: 1, required_level: null, notes: '' })
const form = ref(blank())

// ── options ───────────────────────────────────────────────────────────────
const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const catColor = (c) => `var(${CAT_VARS[c] || '--trn-star-dim'})`

const employeeOptions = computed(() => (employees.value || []).map(e => ({
  value: e.id, label: e.full_name || e.name || e.employee_id || 'Unnamed',
  hint: e.employee_id || e.employee_code || '',
})))
const skillOptions = computed(() => (skills.value || []).map(s => ({
  value: s.id, label: s.name, dot: catColor(s.category),
  hint: s.category ? String(s.category).replace(/_/g, ' ') : '',
})))
const reqOptions = computed(() => [
  { value: '', label: 'Inherit role requirement' },
  ...LEVELS.map(l => ({ value: l.v, label: `${l.v} · ${l.name}` })),
])
const reqModel = computed({
  get: () => (form.value.required_level == null ? '' : form.value.required_level),
  set: (v) => { form.value.required_level = (v === '' || v == null) ? null : Number(v) },
})

// ── resolved display (works for locked chips + picker selections) ───────────
const selectedSkillObj = computed(() => (skills.value || []).find(s => s.id === form.value.skill_id) || null)
const selectedEmpObj = computed(() => (employees.value || []).find(e => e.id === form.value.employee_id) || null)

const displayEmp = computed(() => {
  if (locked.value) return props.entry?.employee_name || '—'
  return selectedEmpObj.value?.full_name || selectedEmpObj.value?.name || ''
})
const displaySkill = computed(() => {
  if (locked.value) return props.entry?.skill_name || '—'
  return selectedSkillObj.value?.name || ''
})
const skillCat = computed(() => {
  if (locked.value) return props.entry?.skill_category || 'OTHER'
  return selectedSkillObj.value?.category || 'OTHER'
})
const skillCatColor = computed(() => catColor(skillCat.value))
const skillCatLabel = computed(() => String(skillCat.value || 'OTHER').replace(/_/g, ' '))
const entryMeta = computed(() => {
  const e = props.entry
  if (!e) return ''
  return [e.employee_code, e.designation_name, e.department_name].filter(Boolean).join(' · ')
})
const empInitials = computed(() => {
  const n = displayEmp.value
  if (!n) return '?'
  return n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

// ── proficiency math ─────────────────────────────────────────────────────────
const reqNum = computed(() => Number(form.value.required_level) || 0)
const gapPreview = computed(() => Math.max(reqNum.value - (Number(form.value.current_level) || 0), 0))
const ratio = computed(() => {
  const cur = Number(form.value.current_level) || 0
  return reqNum.value ? Math.min(cur / reqNum.value, 1) : cur / 5
})
const bandKey = computed(() => {
  const r = ratio.value
  if (r <= 0) return 'b0'
  if (r >= 1) return 'b4'
  if (r >= 0.75) return 'b3'
  if (r >= 0.5) return 'b2'
  return 'b1'
})
const bandLabel = computed(() => ({ b0: 'Unassessed', b1: 'Emerging', b2: 'Developing', b3: 'Proficient', b4: reqNum.value ? 'Meets requirement' : 'Top of scale' })[bandKey.value])
const bandColor = computed(() => ({ b0: 'var(--trn-star-dim)', b1: 'var(--trn-heat-1)', b2: 'var(--trn-heat-2)', b3: 'var(--trn-heat-3)', b4: 'var(--trn-st-completed)' })[bandKey.value])

const padColor = (lv) => `var(--trn-heat-${Math.min(lv, 4)})`
const setLevel = (lv) => { form.value.current_level = lv }

// ── gauge geometry ─────────────────────────────────────────────────────────
const GZ = 132, GC = GZ / 2, GS = 11, GR = GC - GS / 2 - 3
const GCIRC = 2 * Math.PI * GR
const gaugeOffset = computed(() => GCIRC * (1 - Math.max(0, Math.min(1, ratio.value))))

const canSave = computed(() =>
  locked.value ? true : (!!form.value.employee_id && !!form.value.skill_id))

// ── loaders ──────────────────────────────────────────────────────────────────
// Page through employees at limit=100 — the API caps `limit` at 100 (le=100),
// so the old limit=200 request 422'd and left the picker empty.
const loadEmployees = async () => {
  if (employees.value.length) return
  loadingEmps.value = true
  try {
    const all = []
    let page = 1, total = Infinity
    while (all.length < total && page <= 60) {
      const { data } = await axios.get(`${API}/hr/employees/`, {
        headers: authHeader(), params: { page, limit: 100, sort_by: 'created_at', sort_dir: 'desc' },
      })
      const items = data.items || []
      all.push(...items)
      total = data.total ?? all.length
      if (!items.length) break
      page++
    }
    employees.value = all
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load employees')
  } finally {
    loadingEmps.value = false
  }
}

const loadRefs = async () => {
  loadingRefs.value = true
  try {
    const tasks = [fetchSkills()]
    if (!locked.value) tasks.push(loadEmployees())
    const [sk] = await Promise.all(tasks)
    skills.value = Array.isArray(sk) ? sk : (sk?.items || [])
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load picker data')
  } finally {
    loadingRefs.value = false
  }
}

watch(() => props.open, (o) => {
  if (!o) return
  ready.value = false
  hoverLevel.value = 0
  const e = props.entry
  if (locked.value && e) {
    form.value = {
      employee_id: e.employee_id || '',
      skill_id: e.skill_id || '',
      current_level: e.current_level ?? 1,
      required_level: e.required_level ?? null,
      notes: e.notes || '',
    }
  } else {
    form.value = blank()
  }
  loadRefs()
  requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
})

const save = async () => {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const cur = form.value.current_level === '' || form.value.current_level == null
      ? null : Number(form.value.current_level)
    const req = form.value.required_level === '' || form.value.required_level == null
      ? null : Number(form.value.required_level)
    if (isEdit.value) {
      await patchEmployeeSkill(props.entry.id, {
        current_level: cur, required_level: req, notes: form.value.notes || null,
      })
    } else {
      await upsertEmployeeSkill({
        employee_id: form.value.employee_id,
        skill_id: form.value.skill_id,
        current_level: cur, required_level: req, notes: form.value.notes || null,
      })
    }
    toast.success(isEdit.value ? 'Assessment updated' : 'Competency assessed')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save assessment')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.se-loading { display: flex; flex-direction: column; gap: 12px; }
.se-layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 24px; }
.se-form { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.se-group { display: flex; flex-direction: column; gap: 12px; }
.se-gtitle { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.se-fields { display: flex; flex-direction: column; gap: 13px; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }
/* keep the Record/Save CTA static on hover (no magnetic drift / lift) — overrides the global .trn-btn-primary:hover lift */
.trn-btn-primary:hover { transform: none; }

/* empty skill-catalog notice (no skills to pick yet) */
.se-noskills { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--trn-surface); border: 1px dashed color-mix(in srgb, var(--trn-amber) 40%, var(--trn-border-strong)); }
.se-noskills-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.se-noskills-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.se-noskills-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.se-noskills-lab .req { color: var(--trn-st-failed); margin-left: 2px; font-style: normal; }
.se-noskills-body p { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--trn-text-muted); }
.se-noskills-cta { flex-shrink: 0; }

/* locked who/what chips */
.se-chip-row { display: flex; align-items: center; gap: 10px; }
.se-chip { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 13px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.se-chip-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 12px; font-weight: 700; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 3px 10px -4px rgba(251,146,60,0.5); }
.se-chip-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
.se-chip-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.se-chip-name { font-size: 13px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.se-chip-meta { font-size: 10.5px; color: var(--trn-text-muted); text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.se-chip-arrow { color: var(--trn-text-dim); flex-shrink: 0; }

/* proficiency ladder */
.se-ladder { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.se-pad { position: relative; height: 56px; border-radius: 13px; cursor: pointer; overflow: hidden;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); padding: 0;
  transition: border-color 0.2s, transform 0.2s var(--trn-spring), box-shadow 0.2s; }
.se-pad:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--trn-amber) 45%, transparent); }
.se-pad-fill { position: absolute; inset: 0; transform: scaleY(0); transform-origin: bottom; opacity: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--pc) 80%, transparent), var(--pc));
  transition: transform 0.4s var(--trn-spring), opacity 0.3s; }
.se-pad.filled .se-pad-fill { transform: scaleY(1); opacity: 1; }
.se-pad-num { position: absolute; inset: 0; display: grid; place-items: center; font-size: 14px; font-weight: 800;
  color: var(--trn-text-dim); transition: color 0.2s, text-shadow 0.2s; z-index: 1; }
.se-pad.filled .se-pad-num { color: var(--trn-text); text-shadow: 0 1px 3px rgba(0,0,0,0.35); }
[data-theme="light"] .se-pad.filled .se-pad-num { text-shadow: none; }
.se-pad.active { box-shadow: 0 0 0 2px var(--trn-amber), 0 8px 20px -8px color-mix(in srgb, var(--trn-amber) 60%, transparent); }
.se-pad-target { position: absolute; top: 4px; right: 4px; z-index: 2; display: grid; place-items: center;
  width: 18px; height: 18px; border-radius: 50%; color: var(--trn-canvas); background: var(--trn-st-failed);
  box-shadow: 0 0 8px color-mix(in srgb, var(--trn-st-failed) 70%, transparent); animation: trn-pulse-dot 2s ease-out infinite; }
.se-ladder-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.se-level-name { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.se-level-hint { font-size: 10.5px; color: var(--trn-text-dim); }

.se-req { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.se-req-hint { margin: 0; font-size: 11px; color: var(--trn-text-dim); line-height: 1.5; }
.se-req-hint b { color: var(--trn-text-secondary); }

/* live preview star */
.se-aside { display: flex; flex-direction: column; gap: 11px; align-self: start; position: sticky; top: 0; }
.se-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.se-star { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 13px;
  padding: 20px 18px; border-radius: 20px; text-align: center;
  background: var(--trn-surf-card); border: 1px solid color-mix(in srgb, var(--bc) 26%, var(--trn-border-soft));
  box-shadow: var(--trn-card-shadow); }
.se-star-aura { position: absolute; top: -30%; left: 50%; transform: translateX(-50%); width: 80%; height: 70%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--bc) 26%, transparent), transparent 68%); filter: blur(6px);
  animation: se-aura 5s ease-in-out infinite; }
.se-star-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; }
.se-star-av { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 15px; font-weight: 700; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 4px 12px -4px rgba(251,146,60,0.5); }
.se-star-id { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.se-star-emp { font-size: 14px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.se-star-skill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--trn-text-muted); }
.se-star-cdot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }

.se-dial { position: relative; z-index: 1; width: 132px; height: 132px; }
.se-dial-svg { width: 100%; height: 100%; display: block; }
.se-dial-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.se-dial-arc { stroke: var(--bc); transition: stroke-dashoffset 1s var(--trn-spring);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--bc) 60%, transparent)); }
.se-dial-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.se-dial-cur { font-size: 36px; font-weight: 850; line-height: 1; color: var(--trn-text); letter-spacing: -0.03em; }
.se-dial-req { font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-text-dim); }

.se-band { position: relative; z-index: 1; font-family: var(--trn-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 4px 12px; border-radius: 999px; color: var(--bc);
  background: color-mix(in srgb, var(--bc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--bc) 30%, transparent); }
.se-verdict { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center;
  padding: 9px 12px; border-radius: 12px; font-size: 12px; color: var(--trn-text-secondary);
  background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 22%, transparent); }
.se-verdict.met { background: var(--trn-st-completed-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 24%, transparent); }
.se-verdict :deep(svg) { flex-shrink: 0; color: var(--trn-st-failed); }
.se-verdict.met :deep(svg) { color: var(--trn-st-completed); }
.se-verdict b { color: var(--trn-text); font-family: var(--trn-mono); }
.se-foot-hint { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; line-height: 1.4; color: var(--trn-text-dim); }
.se-foot-hint :deep(svg) { flex-shrink: 0; }

@keyframes se-aura { 0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.95); } 50% { opacity: 0.9; transform: translateX(-50%) scale(1.08); } }

@media (max-width: 720px) {
  .se-layout { grid-template-columns: 1fr; }
  .se-aside { position: static; order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  .se-pad-fill, .se-dial-arc, .se-pad { transition: none; }
  .se-star-aura, .se-pad-target { animation: none; }
}
</style>
