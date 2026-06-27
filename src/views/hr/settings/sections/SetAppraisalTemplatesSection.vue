<template>
  <div class="ap-set">
    <!-- ───────────────── CONSOLE HERO ───────────────── -->
    <SetSectionHead
      eyebrow="Modules · Performance" title="Appraisal" accent="Rubrics"
      accent-color="var(--set-deep)" :icon="Target"
      sub="Design the weighted rubrics performance reviews are scored against — sections that balance to 100%, named rating scales, and the grade & department scope each template governs.">
      <template #actions>
        <button class="set-btn set-btn-steel" type="button" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="newTemplate">
          <Plus :size="15" /> New template
        </Motion>
      </template>

      <template #lenses>
        <div class="ap-lenses">
          <button v-for="l in lenses" :key="l.key" class="ap-lens" type="button"
            :class="{ on: l.filter && lensFilter === l.filter, stat: !l.filter }"
            :style="{ '--acc': l.color }" @click="l.filter && (lensFilter = lensFilter === l.filter ? 'all' : l.filter)">
            <span class="ap-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="ap-lens-val"><SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" /></span>
            <span class="ap-lens-lab">{{ l.label }}</span>
            <span class="ap-lens-bar" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- ───────────────── ROSTER STRIP ───────────────── -->
    <section class="ap-roster">
      <header class="ap-roster-head">
        <span><LayoutGrid :size="13" /> Templates <b>{{ filtered.length }}</b><em v-if="lensFilter !== 'all'"> · {{ lensFilter }}</em></span>
        <button v-if="lensFilter !== 'all'" class="ap-clear" type="button" @click="lensFilter = 'all'"><FilterX :size="12" /> Clear</button>
      </header>

      <div v-if="loading" class="ap-skel"><span class="ap-skel-beam" /></div>
      <div v-else-if="!templates.length" class="ap-empty">
        <span class="ap-empty-ic"><Target :size="26" /></span>
        <b>No appraisal templates yet</b>
        <p>Author a weighted rubric — KRAs, competencies, goals — ready for performance reviews to score against.</p>
        <button class="set-btn set-btn-primary" type="button" @click="newTemplate"><Plus :size="14" /> Create the first template</button>
      </div>
      <div v-else class="ap-strip">
        <button class="ap-new-card" type="button" @click="newTemplate">
          <span class="ap-new-ic"><Plus :size="18" /></span>
          <span>New template</span>
        </button>
        <AppraisalTemplateCard v-for="(t, i) in filtered" :key="t.id" :template="t" :index="i"
          :selected="editId === t.id" @select="select" />
        <p v-if="!filtered.length" class="ap-strip-empty">No {{ lensFilter }} templates.</p>
      </div>
    </section>

    <!-- ───────────────── EDITOR ───────────────── -->
    <section v-if="editing" class="ap-editor">
      <!-- live wheel preview -->
      <aside class="ap-wheel">
        <span class="ap-wheel-eyebrow"><Gauge :size="11" /> Live calibration</span>
        <AppraisalWeightWheel :sections="form.sections" :cycle="form.cycle" :rating-max="form.rating_max"
          :active-index="hoverIdx" @hover="hoverIdx = $event" />
        <button class="ap-balance" type="button" :disabled="!form.sections.length || totalWeight === 100" @click="autoBalance">
          <Scale :size="13" /> Auto-balance to 100%
        </button>
      </aside>

      <!-- form -->
      <div class="ap-form">
        <!-- identity -->
        <div class="ap-grid2">
          <div class="ap-field"><label class="ap-lab">Name <i>*</i></label><HrInput v-model="form.name" placeholder="e.g. Annual Appraisal" /></div>
          <div class="ap-field"><label class="ap-lab">Code <i>*</i></label><HrInput v-model="form.code" mono placeholder="e.g. ANN-2026" /></div>
        </div>
        <div class="ap-field"><label class="ap-lab">Description</label><HrTextarea v-model="form.description" :rows="2" placeholder="When is this rubric used and for whom?" /></div>

        <!-- cycle + status -->
        <div class="ap-grid2">
          <div class="ap-field">
            <label class="ap-lab">Review cycle</label>
            <div class="ap-cycles">
              <button v-for="c in CYCLES" :key="c" class="ap-cyc" :class="{ on: form.cycle === c }" type="button" @click="form.cycle = c">
                <component :is="cycleMeta(c).icon" :size="13" />{{ cycleMeta(c).label }}
              </button>
            </div>
          </div>
          <div class="ap-field">
            <label class="ap-lab">Status</label>
            <div class="ap-seg">
              <button type="button" :class="{ on: form.is_active }" @click="form.is_active = true"><CircleDot :size="13" /> Active</button>
              <button type="button" :class="{ on: !form.is_active }" @click="form.is_active = false"><Pause :size="13" /> Inactive</button>
            </div>
          </div>
        </div>

        <!-- rating scale + labels -->
        <div class="ap-field">
          <div class="ap-lab-row">
            <label class="ap-lab">Rating scale</label>
            <div class="ap-stepper">
              <button type="button" :disabled="form.rating_max <= 2" @click="bumpMax(-1)"><Minus :size="13" /></button>
              <b>1–{{ form.rating_max }}</b>
              <button type="button" :disabled="form.rating_max >= 10" @click="bumpMax(1)"><Plus :size="13" /></button>
            </div>
          </div>
          <div class="ap-rungs">
            <div v-for="n in form.rating_max" :key="n" class="ap-rung">
              <span class="ap-rung-n">{{ n }}</span>
              <input class="ap-rung-in" :value="form.rating_labels[n - 1] || ''" :placeholder="`Level ${n}`"
                @input="setLabel(n - 1, $event.target.value)" />
            </div>
          </div>
        </div>

        <!-- scope (applies_to_json — previously hidden) -->
        <div class="ap-field">
          <div class="ap-lab-row">
            <label class="ap-lab">Applies to <em>— leave empty for all roles</em></label>
            <span class="ap-scope-sum">{{ scopeSummary }}</span>
          </div>
          <div class="ap-scope">
            <div class="ap-scope-col">
              <span class="ap-scope-h"><Layers :size="11" /> Grades</span>
              <div class="ap-scope-chips">
                <button v-for="g in grades" :key="g.id" class="ap-tog" :class="{ on: form.grade_ids.includes(g.id) }" type="button" @click="toggleScope('grade_ids', g.id)">{{ g.code || g.name }}</button>
                <span v-if="!grades.length" class="ap-scope-empty">No grades configured</span>
              </div>
            </div>
            <div class="ap-scope-col">
              <span class="ap-scope-h"><Building2 :size="11" /> Departments</span>
              <div class="ap-scope-chips">
                <button v-for="d in departments" :key="d.id" class="ap-tog" :class="{ on: form.department_ids.includes(d.id) }" type="button" @click="toggleScope('department_ids', d.id)">{{ d.name }}</button>
                <span v-if="!departments.length" class="ap-scope-empty">No departments configured</span>
              </div>
            </div>
          </div>
        </div>

        <!-- sections -->
        <div class="ap-field">
          <div class="ap-lab-row">
            <label class="ap-lab">Weighted sections</label>
            <span class="ap-weight-tag" :class="weightState">{{ totalWeight }}% · {{ form.sections.length }} sections</span>
          </div>
          <div class="ap-sections">
            <AppraisalSectionRow v-for="(s, i) in form.sections" :key="s._k" :section="s" :index="i" :count="form.sections.length"
              :active="hoverIdx === i" @patch="p => patchSection(i, p)" @move="d => moveSection(i, d)" @remove="removeSection(i)" @hover="hoverIdx = $event" />
            <button class="ap-add" type="button" @click="addSection"><Plus :size="14" /> Add section</button>
          </div>
        </div>

        <footer class="ap-actions">
          <button v-if="editId" class="set-btn ap-del" type="button" @click="askDelete"><Trash2 :size="13" /> Delete</button>
          <span class="ap-spacer" />
          <button class="set-btn set-btn-ghost" type="button" @click="cancelEdit">Cancel</button>
          <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !canSave || saving }"
            :whileHover="(!canSave || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="!canSave || saving" @click="save">
            <Loader2 v-if="saving" :size="14" class="set-spin" /><Save v-else :size="14" /> {{ editId ? 'Save template' : 'Create template' }}
          </Motion>
        </footer>
      </div>
    </section>
    <section v-else-if="!loading && templates.length" class="ap-pick">
      <span class="ap-pick-ic"><Target :size="24" /></span>
      <p>Select a template to calibrate, or create a new one.</p>
    </section>

    <!-- ───────────────── CONNECTIVITY / WORKFLOW ───────────────── -->
    <section class="ap-block">
      <header class="ap-blockhead">
        <div class="ap-blockhead-l">
          <span class="ap-blockhead-ic"><Network :size="16" /></span>
          <div>
            <b>Workflow & connectivity</b>
            <span>Where these rubrics come from — and the honest state of what consumes them</span>
          </div>
        </div>
      </header>

      <div class="ap-note">
        <Info :size="14" />
        <span>Appraisal templates are <b>rubric blueprints</b>. The <b>Performance module</b> now scores employees against them (self → manager → sign-off), and the latest score surfaces as <b>evidence on the promote screen</b> — promotions remain an HR decision.</span>
      </div>

      <div class="ap-bus-label"><Settings2 :size="12" /> Scoped with sibling settings</div>
      <div class="ap-bus">
        <button v-for="w in wiredSettings" :key="w.slug" class="ap-wire" type="button" @click="$emit('go', w.slug)">
          <span class="ap-wire-ic"><component :is="w.icon" :size="15" /></span>
          <div class="ap-wire-txt"><b>{{ w.label }}</b><span>{{ w.desc }}</span></div>
          <ChevronRight :size="15" class="ap-wire-go" />
        </button>
      </div>

      <div class="ap-bus-label up"><Workflow :size="12" /> Consumed downstream</div>
      <div class="ap-bus">
        <component v-for="d in downstream" :key="d.key" :is="d.to ? 'button' : 'div'" class="ap-wire down" :class="{ static: !d.to }"
          @click="d.to && openModule(d.to)">
          <span class="ap-wire-ic"><component :is="d.icon" :size="15" /></span>
          <div class="ap-wire-txt"><b>{{ d.label }}</b><span>{{ d.desc }}</span></div>
          <span class="ap-wire-flag" :class="d.tone"><CircleAlert :size="11" /> {{ d.flag }}</span>
          <ArrowUpRight v-if="d.to" :size="15" class="ap-wire-go" />
        </component>
      </div>
    </section>

    <AppraisalDeleteModal :open="delOpen" :template="delTarget" :busy="busy"
      @close="delOpen = false" @confirm="confirmDelete" @deactivate="deactivate" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Target, RefreshCw, Plus, Minus, Save, Loader2, Scale, Trash2, Gauge, Layers, Building2,
  CircleDot, Pause, Network, Settings2, Workflow, ChevronRight, ArrowUpRight, CircleAlert, Info,
  LayoutGrid, FilterX, BadgeCheck, Award, History, ScrollText,
} from 'lucide-vue-next'

import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import AppraisalWeightWheel from '../components/AppraisalWeightWheel.vue'
import AppraisalTemplateCard from '../components/AppraisalTemplateCard.vue'
import AppraisalSectionRow from '../components/AppraisalSectionRow.vue'
import AppraisalDeleteModal from '../components/AppraisalDeleteModal.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'

import {
  listAppraisalTemplates, createAppraisalTemplate, updateAppraisalTemplate, deleteAppraisalTemplate, errText,
} from '../composables/useHrSettings'
import { useHrReference } from '@/composables/useEmployees'
import { CYCLES, cycleMeta, blankSection, defaultLabelsFor } from '../composables/appraisalVocab'

defineEmits(['go'])

const router = useRouter()
const toast = useToast()

const { reference, loadReferenceData } = useHrReference()
const grades = computed(() => reference.grades || [])
const departments = computed(() => reference.departments || [])

const loading = ref(false)
const saving = ref(false)
const busy = ref(false)
const templates = ref([])
const editing = ref(false)
const editId = ref(null)
const hoverIdx = ref(null)
const lensFilter = ref('all')

let _k = 0
const keyed = (s) => ({ ...s, _k: ++_k })

const blank = () => ({
  name: '', code: '', description: '', cycle: 'ANNUAL', is_active: true,
  rating_max: 5, rating_labels: defaultLabelsFor(5),
  grade_ids: [], department_ids: [],
  sections: [keyed({ ...blankSection('KRA'), title: 'Goals & KRAs', weight: 50 }), keyed({ ...blankSection('COMPETENCY'), title: 'Competencies', weight: 50 })],
})
const form = reactive(blank())

// ── lenses ──
const totalOf = (t) => (t.sections || []).reduce((s, x) => s + (Number(x.weight) || 0), 0)
const isScoped = (t) => ((t.applies_to_json?.grade_ids || []).length + (t.applies_to_json?.department_ids || []).length) > 0
const lenses = computed(() => {
  const active = templates.value.filter(t => t.is_active !== false).length
  const balanced = templates.value.filter(t => totalOf(t) === 100).length
  const scoped = templates.value.filter(isScoped).length
  const cycles = new Set(templates.value.map(t => t.cycle)).size
  const avg = templates.value.length ? Math.round(templates.value.reduce((s, t) => s + (t.sections || []).length, 0) / templates.value.length) : 0
  return [
    { key: 'all', label: 'Templates', value: templates.value.length, color: 'var(--set-deep)', icon: Target, filter: 'all' },
    { key: 'act', label: 'Active', value: active, color: 'var(--set-ok)', icon: CircleDot, filter: 'active' },
    { key: 'bal', label: 'Balanced', value: balanced, color: 'var(--set-gold)', icon: Scale, filter: 'balanced' },
    { key: 'sco', label: 'Scoped', value: scoped, color: 'var(--set-orange)', icon: Layers, filter: 'scoped' },
    { key: 'avg', label: 'Avg sections', value: avg, color: 'var(--set-amber)', icon: LayoutGrid },
    { key: 'cyc', label: 'Cycles used', value: cycles, color: 'var(--set-ember)', icon: Gauge },
  ]
})
const filtered = computed(() => {
  const f = lensFilter.value
  if (f === 'active') return templates.value.filter(t => t.is_active !== false)
  if (f === 'balanced') return templates.value.filter(t => totalOf(t) === 100)
  if (f === 'scoped') return templates.value.filter(isScoped)
  return templates.value
})

// ── editor derived ──
const totalWeight = computed(() => form.sections.reduce((s, x) => s + (Number(x.weight) || 0), 0))
const weightState = computed(() => totalWeight.value === 100 ? 'ok' : (totalWeight.value > 100 ? 'over' : 'under'))
const canSave = computed(() => form.name.trim() && form.code.trim() && form.sections.length > 0)
const scopeSummary = computed(() => {
  const g = form.grade_ids.length, d = form.department_ids.length
  if (!g && !d) return 'All roles'
  return [g ? `${g} grade${g > 1 ? 's' : ''}` : null, d ? `${d} dept${d > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
})

// ── connectivity ──
const wiredSettings = [
  { slug: 'grades', label: 'Grades', icon: Layers, desc: 'Templates can target specific grade bands' },
  { slug: 'designations', label: 'Designations', icon: BadgeCheck, desc: 'The job titles a promotion moves people into' },
  { slug: 'departments', label: 'Departments', icon: Building2, desc: 'Scope a rubric to specific departments' },
  { slug: 'audit-logs', label: 'Audit Logs', icon: ScrollText, desc: 'Every template change is sealed in the settings ledger' },
]
const downstream = [
  { key: 'perf', label: 'Performance reviews', icon: Award, desc: 'Scores employees against these rubrics — self → manager → sign-off', flag: 'Live', tone: 'live', to: 'performance' },
  { key: 'promo', label: 'Promotion', icon: History, desc: 'The latest review score now shows as evidence on the promote screen', flag: 'Evidence', tone: 'live', to: 'employees' },
  { key: 'trn', label: 'Training', icon: BadgeCheck, desc: 'Competency gaps will seed development plans', flag: 'Planned', tone: 'warn', to: 'training' },
]
const MODULE_PATH = { employees: '/admin/hr/employees/all', training: '/admin/hr/training/skill-matrix', performance: '/admin/hr/performance/dashboard' }
const openModule = (k) => MODULE_PATH[k] && router.push(MODULE_PATH[k])

// ── load / select ──
async function reload() {
  loading.value = true
  try { templates.value = await listAppraisalTemplates() }
  catch (e) { toast.error(errText(e, 'Failed to load templates')) }
  finally { loading.value = false }
}
function newTemplate() { editId.value = null; Object.assign(form, blank()); editing.value = true; hoverIdx.value = null }
function select(t) {
  editId.value = t.id; editing.value = true; hoverIdx.value = null
  const max = (t.rating_scale && t.rating_scale.max) || 5
  Object.assign(form, {
    name: t.name, code: t.code, description: t.description || '', cycle: t.cycle || 'ANNUAL', is_active: t.is_active !== false,
    rating_max: max,
    rating_labels: (t.rating_scale && Array.isArray(t.rating_scale.labels) && t.rating_scale.labels.length) ? [...t.rating_scale.labels] : defaultLabelsFor(max),
    grade_ids: [...(t.applies_to_json?.grade_ids || [])],
    department_ids: [...(t.applies_to_json?.department_ids || [])],
    sections: (t.sections || []).map(s => keyed({
      title: s.title, section_type: s.section_type, weight: Number(s.weight) || 0,
      criteria: Array.isArray(s.criteria_json) ? [...s.criteria_json] : [],
    })),
  })
  syncLabels()
}
function cancelEdit() { editing.value = false; editId.value = null }

// ── editor mutations ──
function bumpMax(d) { form.rating_max = Math.max(2, Math.min(10, form.rating_max + d)); syncLabels() }
function syncLabels() {
  const def = defaultLabelsFor(form.rating_max)
  const out = []
  for (let i = 0; i < form.rating_max; i++) out.push(form.rating_labels[i] || def[i] || `Level ${i + 1}`)
  form.rating_labels = out
}
function setLabel(i, v) { const a = [...form.rating_labels]; a[i] = v; form.rating_labels = a }
function toggleScope(key, id) {
  const a = form[key]
  const i = a.indexOf(id)
  if (i >= 0) a.splice(i, 1); else a.push(id)
}
function patchSection(i, patch) { Object.assign(form.sections[i], patch) }
function moveSection(i, d) { const j = i + d; if (j < 0 || j >= form.sections.length) return; const a = form.sections;[a[i], a[j]] = [a[j], a[i]] }
function removeSection(i) { form.sections.splice(i, 1) }
function addSection() { form.sections.push(keyed(blankSection('COMPETENCY'))) }
function autoBalance() {
  const n = form.sections.length; if (!n) return
  const base = Math.floor(100 / n)
  form.sections.forEach((s, i) => { s.weight = base + (i === 0 ? 100 - base * n : 0) })
}

// ── save / delete ──
async function save() {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(), code: form.code.trim(), description: form.description?.trim() || null,
      cycle: form.cycle, is_active: form.is_active,
      rating_scale: { max: form.rating_max, labels: form.rating_labels.slice(0, form.rating_max) },
      applies_to_json: (form.grade_ids.length || form.department_ids.length)
        ? { grade_ids: [...form.grade_ids], department_ids: [...form.department_ids] } : null,
      sections: form.sections.map((s, i) => ({
        title: s.title, section_type: s.section_type, weight: Number(s.weight) || 0,
        criteria_json: (s.criteria && s.criteria.length) ? s.criteria : null, sort_order: i,
      })),
    }
    if (editId.value) await updateAppraisalTemplate(editId.value, payload)
    else await createAppraisalTemplate(payload)
    toast.success(editId.value ? 'Template saved' : 'Template created')
    const wasNew = !editId.value
    await reload()
    if (wasNew) { const made = templates.value.find(t => t.code === payload.code); if (made) select(made) }
    else { const cur = templates.value.find(t => t.id === editId.value); if (cur) select(cur) }
  } catch (e) { toast.error(errText(e, 'Failed to save template')) }
  finally { saving.value = false }
}

const delOpen = ref(false)
const delTarget = ref(null)
function askDelete() { delTarget.value = templates.value.find(t => t.id === editId.value) || null; delOpen.value = true }
async function confirmDelete() {
  if (!delTarget.value) return
  busy.value = true
  try {
    await deleteAppraisalTemplate(delTarget.value.id)
    toast.success('Template deleted')
    delOpen.value = false; editing.value = false; editId.value = null
    await reload()
  } catch (e) { toast.error(errText(e, 'Delete failed')) }
  finally { busy.value = false }
}
async function deactivate() {
  if (!delTarget.value) return
  busy.value = true
  try {
    await updateAppraisalTemplate(delTarget.value.id, { is_active: false })
    toast.success('Template deactivated')
    delOpen.value = false
    await reload()
    if (editId.value === delTarget.value.id) { const cur = templates.value.find(t => t.id === editId.value); if (cur) select(cur) }
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { busy.value = false }
}

onMounted(() => { loadReferenceData(); reload() })
</script>

<style scoped>
.ap-set { display: flex; flex-direction: column; gap: 18px; }

/* lenses */
.ap-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.ap-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; text-align: left;
  padding: 12px 13px 14px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border);
  transition: transform 0.25s var(--set-spring), border-color 0.25s; --acc: var(--set-deep); cursor: pointer; }
.ap-lens.stat { cursor: default; }
.ap-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.ap-lens.stat:hover { transform: none; }
.ap-lens.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 8%, var(--set-surface)); }
.ap-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.ap-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.ap-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--set-text-muted); }
.ap-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--set-spring); }
.ap-lens.on .ap-lens-bar, .ap-lens:not(.stat):hover .ap-lens-bar { transform: scaleX(1); }

/* roster */
.ap-roster { display: flex; flex-direction: column; gap: 11px; }
.ap-roster-head { display: flex; align-items: center; justify-content: space-between; }
.ap-roster-head span { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-muted); }
.ap-roster-head span :deep(svg) { color: var(--set-deep); }
.ap-roster-head b { color: var(--set-text); }
.ap-roster-head em { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; }
.ap-clear { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted);
  background: transparent; border: none; cursor: pointer; }
.ap-clear:hover { color: var(--set-deep); }

.ap-strip { display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 8px; scroll-snap-type: x proximity; }
.ap-strip > * { flex: 0 0 244px; scroll-snap-align: start; }
.ap-new-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; cursor: pointer; min-height: 124px;
  border-radius: 15px; background: transparent; border: 1px dashed var(--set-border-strong); color: var(--set-text-muted); font: inherit; font-size: 12px; font-weight: 650; transition: all 0.22s var(--set-spring); }
.ap-new-card:hover { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 45%, transparent); transform: translateY(-2px); }
.ap-new-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 26%, transparent); }
.ap-strip-empty { align-self: center; font-size: 12px; color: var(--set-text-dim); font-style: italic; }

.ap-skel { position: relative; overflow: hidden; height: 124px; border-radius: 15px; background: var(--set-surface); border: 1px solid var(--set-border); }
.ap-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(234,88,12,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }
.ap-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 40px 24px; border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.ap-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 26%, transparent); }
.ap-empty b { font-size: 15px; font-weight: 800; color: var(--set-text); margin-top: 4px; }
.ap-empty p { margin: 0 0 6px; font-size: 12.5px; color: var(--set-text-muted); max-width: 44ch; line-height: 1.5; }

/* editor */
.ap-editor { display: grid; grid-template-columns: 300px 1fr; gap: 18px; align-items: start; padding: 18px; border-radius: 20px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.ap-wheel { position: sticky; top: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 14px; border-radius: 16px; background: var(--set-panel); border: 1px solid var(--set-border); }
.ap-wheel-eyebrow { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.ap-wheel-eyebrow :deep(svg) { color: var(--set-deep); }
.ap-balance { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); transition: all 0.2s var(--set-spring); }
.ap-balance:hover:not(:disabled) { transform: translateY(-1px); }
.ap-balance:disabled { opacity: 0.4; cursor: not-allowed; }

.ap-form { display: flex; flex-direction: column; gap: 15px; min-width: 0; }
.ap-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.ap-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.ap-lab { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.ap-lab i { color: var(--set-conflict); font-style: normal; }
.ap-lab em { font-style: normal; font-weight: 500; color: var(--set-text-dim); }
.ap-lab-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

.ap-cycles { display: flex; flex-wrap: wrap; gap: 6px; }
.ap-cyc { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.18s var(--set-spring); }
.ap-cyc :deep(svg) { color: var(--set-text-dim); }
.ap-cyc.on { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 13%, transparent); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); }
.ap-cyc.on :deep(svg) { color: var(--set-deep); }

.ap-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ap-seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.ap-seg button.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 38%, transparent); }

.ap-stepper { display: inline-flex; align-items: center; gap: 8px; padding: 3px 5px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ap-stepper button { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; cursor: pointer; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.16s; }
.ap-stepper button:hover:not(:disabled) { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 40%, transparent); }
.ap-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
.ap-stepper b { min-width: 38px; text-align: center; font-size: 13px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums; }

.ap-rungs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 7px; }
.ap-rung { display: flex; align-items: center; gap: 7px; padding: 4px 6px 4px 4px; border-radius: 9px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ap-rung-n { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; font-size: 11px; font-weight: 800; color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); }
.ap-rung-in { flex: 1; min-width: 0; padding: 5px 4px; border: none; background: transparent; color: var(--set-text); font: inherit; font-size: 11.5px; }
.ap-rung-in:focus { outline: none; }

.ap-scope-sum { font-size: 11px; font-weight: 700; color: var(--set-deep); }
.ap-scope { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ap-scope-col { display: flex; flex-direction: column; gap: 7px; padding: 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border); }
.ap-scope-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-muted); }
.ap-scope-h :deep(svg) { color: var(--set-deep); }
.ap-scope-chips { display: flex; flex-wrap: wrap; gap: 5px; max-height: 116px; overflow-y: auto; }
.ap-tog { padding: 4px 9px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 650; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.16s; }
.ap-tog:hover { color: var(--set-text); }
.ap-tog.on { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 13%, transparent); border-color: color-mix(in srgb, var(--set-deep) 38%, transparent); }
.ap-scope-empty { font-size: 11px; color: var(--set-text-dim); font-style: italic; }

.ap-weight-tag { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; }
.ap-weight-tag.ok { color: var(--set-ok); background: var(--set-ok-soft); }
.ap-weight-tag.under { color: var(--set-partial); background: var(--set-partial-soft); }
.ap-weight-tag.over { color: var(--set-conflict); background: var(--set-conflict-soft); }
.ap-sections { display: flex; flex-direction: column; gap: 8px; }
.ap-add { display: inline-flex; align-items: center; gap: 6px; width: max-content; padding: 9px 14px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 10%, transparent); border: 1px dashed color-mix(in srgb, var(--set-deep) 34%, transparent); transition: all 0.2s var(--set-spring); }
.ap-add:hover { background: color-mix(in srgb, var(--set-deep) 16%, transparent); }

.ap-actions { display: flex; align-items: center; gap: 10px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.ap-spacer { flex: 1; }
.ap-del { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 26%, transparent); }
.ap-del:hover { background: var(--set-conflict-soft); }

.ap-pick { display: flex; flex-direction: column; align-items: center; gap: 11px; padding: 54px 20px; border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); }
.ap-pick-ic { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 15px; color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 26%, transparent); }

/* connectivity */
.ap-block { display: flex; flex-direction: column; gap: 13px; }
.ap-blockhead-l { display: flex; align-items: center; gap: 12px; }
.ap-blockhead-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.ap-blockhead-l b { display: block; font-size: 15.5px; font-weight: 850; color: var(--set-text); }
.ap-blockhead-l span { font-size: 12px; color: var(--set-text-muted); }
.ap-note { display: flex; gap: 9px; padding: 12px 15px; border-radius: 13px; font-size: 12.5px; line-height: 1.55; color: var(--set-text-secondary); background: var(--set-surface); border: 1px solid var(--set-border); }
.ap-note :deep(svg) { color: var(--set-deep); flex-shrink: 0; margin-top: 1px; }
.ap-note b { color: var(--set-text); font-weight: 750; }

.ap-bus-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-muted); }
.ap-bus-label :deep(svg) { color: var(--set-gold); }
.ap-bus-label.up { margin-top: 4px; }
.ap-bus { display: grid; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); gap: 11px; }
.ap-wire { display: flex; align-items: center; gap: 11px; text-align: left; padding: 13px 14px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border); transition: transform 0.25s var(--set-spring), border-color 0.25s; cursor: pointer; font: inherit; width: 100%; }
.ap-wire:hover { transform: translateY(-2px); border-color: var(--set-border-warm); }
.ap-wire.down { border-style: dashed; }
.ap-wire.static { cursor: default; }
.ap-wire.static:hover { transform: none; border-color: var(--set-border); }
.ap-wire-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.ap-wire.down .ap-wire-ic { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border-color: color-mix(in srgb, var(--set-deep) 24%, transparent); }
.ap-wire-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ap-wire-txt b { font-size: 13px; font-weight: 750; color: var(--set-text); }
.ap-wire-txt span { font-size: 11px; color: var(--set-text-muted); line-height: 1.35; }
.ap-wire-flag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 7px; border-radius: 999px; color: var(--set-partial); background: var(--set-partial-soft); }
.ap-wire-flag.warn { color: var(--set-partial); background: var(--set-partial-soft); }
.ap-wire-flag.live { color: var(--set-ok); background: var(--set-ok-soft); }
.ap-wire-go { color: var(--set-text-dim); flex-shrink: 0; transition: transform 0.25s var(--set-spring), color 0.25s; }
.ap-wire:hover .ap-wire-go { color: var(--set-gold); transform: translateX(3px); }

@media (max-width: 1100px) { .ap-editor { grid-template-columns: 1fr; } .ap-wheel { position: static; } .ap-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .ap-grid2, .ap-scope { grid-template-columns: 1fr; } .ap-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .ap-lens:hover, .ap-wire:hover { transform: none; } .ap-skel-beam { animation: none; } }
</style>
