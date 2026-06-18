<template>
  <TrnModal :open="open" title="Skills catalog"
    subtitle="The master list of competencies and per-role requirements." :icon="Library" @close="$emit('close')">

    <!-- ── segmented tab control with sliding thumb ── -->
    <div class="sc-seg" :class="{ 'on-reqs': tab === 'reqs' }" role="tablist">
      <span class="sc-seg-thumb" aria-hidden="true" />
      <button class="sc-seg-btn" :class="{ on: tab === 'skills' }" role="tab" :aria-selected="tab === 'skills'" @click="tab = 'skills'">
        <Library :size="14" /> Skills <span class="sc-seg-n trn-mono">{{ skills.length }}</span>
      </button>
      <button class="sc-seg-btn" :class="{ on: tab === 'reqs' }" role="tab" :aria-selected="tab === 'reqs'" @click="tab = 'reqs'">
        <Target :size="14" /> Role requirements <span class="sc-seg-n trn-mono">{{ requirements.length }}</span>
      </button>
    </div>

    <Motion :key="tab" as="div" class="sc-pane"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">

      <!-- ── SKILLS TAB ─────────────────────────────────────────────── -->
      <template v-if="tab === 'skills'">
        <!-- composer -->
        <section class="sc-form">
          <header class="sc-form-head">
            <span class="sc-form-ic"><component :is="editingSkillId ? Pencil : Plus" :size="14" /></span>
            <span class="sc-form-title">{{ editingSkillId ? 'Edit skill' : 'New skill' }}</span>
            <span v-if="editingSkillId" class="sc-form-tag">editing</span>
          </header>
          <div class="sc-form-grid">
            <TrnField v-model="skForm.name" label="Skill name" required placeholder="e.g. Python" class="sc-span2" />
            <TrnField v-model="skForm.code" label="Code" placeholder="optional" />
            <TrnSelect v-model="skForm.category" label="Category" :options="categoryOptions" />
            <TrnField v-model.number="skForm.max_level" label="Max level" type="number" step="1" placeholder="5" />
            <TrnField v-model="skForm.description" label="Description" placeholder="optional" class="sc-span2" />
          </div>
          <div class="sc-form-actions">
            <button v-if="editingSkillId" class="trn-btn trn-btn-ghost" @click="resetSkForm">Cancel edit</button>
            <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!skForm.name || savingSkill"
              :whileTap="{ scale: 0.97 }" @click="saveSkill">
              <Loader v-if="savingSkill" :size="14" class="spin" />
              <component v-else :is="editingSkillId ? Check : Plus" :size="14" />
              {{ editingSkillId ? 'Save skill' : 'Add skill' }}
            </Motion>
          </div>
        </section>

        <div v-if="loading" class="sc-list">
          <div v-for="n in 4" :key="n" class="trn-skel" style="height: 52px; border-radius: 13px" />
        </div>
        <ul v-else-if="skills.length" class="sc-list">
          <Motion v-for="(s, i) in skills" :key="s.id" as="li" class="sc-row" :class="{ active: editingSkillId === s.id }"
            :style="{ '--c': catColor(s.category) }"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.25), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }">
            <span class="sc-row-rail" aria-hidden="true" />
            <span class="sc-cat-badge"><span class="dot" />{{ prettyCat(s.category) }}</span>
            <div class="sc-row-main">
              <span class="sc-row-name">{{ s.name }}<i v-if="s.code" class="sc-row-code trn-mono">{{ s.code }}</i></span>
              <span class="sc-row-meta">
                <span class="sc-pips" :title="`scale to ${s.max_level || 5}`"><i v-for="n in 5" :key="n" :class="{ on: n <= (s.max_level || 5) }" /></span>
                <span v-if="s.employee_count != null" class="sc-mapped"><Users :size="11" /> {{ s.employee_count }} mapped</span>
              </span>
            </div>
            <div class="sc-row-acts">
              <Motion as="button" class="sc-icon" title="Edit" :whileTap="{ scale: 0.88 }" @click="startEditSkill(s)"><Pencil :size="14" /></Motion>
              <Motion as="button" class="sc-icon danger" title="Delete" :whileTap="{ scale: 0.88 }" @click="askDeleteSkill(s)"><Trash2 :size="14" /></Motion>
            </div>
          </Motion>
        </ul>
        <div v-else class="sc-blank">
          <span class="sc-blank-ic"><Library :size="20" /></span>
          <p>No skills yet</p>
          <span>Add your first competency above to start building the catalog.</span>
        </div>
      </template>

      <!-- ── REQUIREMENTS TAB ───────────────────────────────────────── -->
      <template v-else>
        <section class="sc-form">
          <header class="sc-form-head">
            <span class="sc-form-ic"><Target :size="14" /></span>
            <span class="sc-form-title">New role requirement</span>
          </header>
          <div class="sc-form-grid">
            <TrnSelect v-model="reqForm.skill_id" label="Skill" required searchable
              search-placeholder="Search skills…" :options="reqSkillOptions" placeholder="Select a skill…" class="sc-span2" />
            <TrnSelect v-model="reqForm.designation_id" label="Designation" searchable
              search-placeholder="Search designations…" :options="designationOptions" placeholder="— any —" />
            <TrnSelect v-model="reqForm.grade_id" label="Grade" searchable
              search-placeholder="Search grades…" :options="gradeOptions" placeholder="— any —" />
            <TrnSelect v-model="reqForm.required_level" label="Required level" :options="levelOptions" placeholder="—" />
          </div>
          <p class="sc-hint">Scope a target proficiency to a designation <b>or</b> a grade. Leave both blank for an org-wide baseline.</p>
          <div class="sc-form-actions">
            <Motion as="button" class="trn-btn trn-btn-primary"
              :disabled="!reqForm.skill_id || !reqForm.required_level || savingReq" :whileTap="{ scale: 0.97 }" @click="saveReq">
              <Loader v-if="savingReq" :size="14" class="spin" /><Plus v-else :size="14" />Add requirement
            </Motion>
          </div>
        </section>

        <div v-if="loadingReqs" class="sc-list">
          <div v-for="n in 3" :key="n" class="trn-skel" style="height: 52px; border-radius: 13px" />
        </div>
        <ul v-else-if="requirements.length" class="sc-list">
          <Motion v-for="(r, i) in requirements" :key="r.id" as="li" class="sc-row" :style="{ '--c': lvlColor(r.required_level) }"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.25), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }">
            <span class="sc-row-rail" aria-hidden="true" />
            <span class="sc-lvl trn-mono">L{{ r.required_level }}</span>
            <div class="sc-row-main">
              <span class="sc-row-name">{{ r.skill_name || skillName(r.skill_id) }}</span>
              <span class="sc-row-meta"><component :is="scopeIcon(r)" :size="11" /> {{ reqScope(r) }}</span>
            </div>
            <div class="sc-row-acts">
              <Motion as="button" class="sc-icon danger" title="Delete" :whileTap="{ scale: 0.88 }" @click="askDeleteReq(r)"><Trash2 :size="14" /></Motion>
            </div>
          </Motion>
        </ul>
        <div v-else class="sc-blank">
          <span class="sc-blank-ic"><Target :size="20" /></span>
          <p>No role requirements yet</p>
          <span>Define a target level per designation or grade to light up the gap landscape.</span>
        </div>
      </template>
    </Motion>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Done</button>
    </template>

    <!-- shared delete confirm -->
    <TrnDeleteModal
      :open="delOpen"
      :title="delTarget?.kind === 'req' ? 'Delete requirement' : 'Delete skill'"
      :item-name="delTarget?.name || ''"
      :item-meta="delTarget?.meta || ''"
      :icon="delIcon"
      :consequences="delTarget?.consequences || []"
      :confirm-label="delTarget?.kind === 'req' ? 'Delete requirement' : 'Delete skill'"
      :loading="deleting"
      @close="delOpen = false"
      @confirm="confirmDelete" />
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Library, Target, Pencil, Trash2, Loader, Plus, Check, Users, Building2, Layers } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import {
  SKILL_CATEGORIES, fetchSkills, createSkill, patchSkill, deleteSkill,
  fetchSkillRequirements, createSkillRequirement, deleteSkillRequirement,
} from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialTab: { type: String, default: 'skills' },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const { reference, loadReferenceData } = useHrReference()

const tab = ref('skills')
const skills = ref([])
const requirements = ref([])
const loading = ref(false)
const loadingReqs = ref(false)
const dirty = ref(false)

// computed (not a plain const) so it evaluates after lvlColor/LVL_VARS are initialised
const levelOptions = computed(() => [1, 2, 3, 4, 5].map(n => ({ value: n, label: `Level ${n}`, dot: lvlColor(n) })))

// ── skill form ──────────────────────────────────────────────────────────────
const blankSkill = () => ({ name: '', code: '', category: 'TECHNICAL', max_level: 5, description: '' })
const skForm = ref(blankSkill())
const editingSkillId = ref(null)
const savingSkill = ref(false)

const startEditSkill = (s) => {
  editingSkillId.value = s.id
  skForm.value = {
    name: s.name || '', code: s.code || '', category: s.category || 'TECHNICAL',
    max_level: s.max_level ?? 5, description: s.description || '',
  }
}
const resetSkForm = () => { editingSkillId.value = null; skForm.value = blankSkill() }

const saveSkill = async () => {
  if (!skForm.value.name) return
  savingSkill.value = true
  try {
    const payload = { ...skForm.value }
    if (!payload.code) delete payload.code
    if (!payload.description) delete payload.description
    if (editingSkillId.value) await patchSkill(editingSkillId.value, payload)
    else await createSkill(payload)
    toast.success(editingSkillId.value ? 'Skill updated' : 'Skill added')
    resetSkForm()
    dirty.value = true
    await loadSkills()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save skill')
  } finally {
    savingSkill.value = false
  }
}

// ── requirement form ──────────────────────────────────────────────────────────
const blankReq = () => ({ skill_id: '', designation_id: '', grade_id: '', required_level: 3 })
const reqForm = ref(blankReq())
const savingReq = ref(false)

const saveReq = async () => {
  if (!reqForm.value.skill_id || !reqForm.value.required_level) return
  savingReq.value = true
  try {
    const payload = {
      skill_id: reqForm.value.skill_id,
      required_level: Number(reqForm.value.required_level),
    }
    if (reqForm.value.designation_id) payload.designation_id = reqForm.value.designation_id
    if (reqForm.value.grade_id) payload.grade_id = reqForm.value.grade_id
    await createSkillRequirement(payload)
    toast.success('Requirement added')
    reqForm.value = blankReq()
    dirty.value = true
    await loadReqs()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save requirement')
  } finally {
    savingReq.value = false
  }
}

// ── delete (shared TrnDeleteModal — no native confirm) ──────────────────────────
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const delIcon = computed(() => (delTarget.value?.kind === 'req' ? Target : Library))

const askDeleteSkill = (s) => {
  delTarget.value = {
    kind: 'skill', id: s.id, name: s.name,
    meta: `${prettyCat(s.category)} · scale to ${s.max_level || 5}`,
    consequences: [
      'Removes this skill from the catalog',
      'Existing assessments for it are discarded',
      'Role requirements referencing it are removed',
    ],
  }
  delOpen.value = true
}
const askDeleteReq = (r) => {
  delTarget.value = {
    kind: 'req', id: r.id, name: r.skill_name || skillName(r.skill_id),
    meta: reqScope(r),
    consequences: ['Removes this role requirement', 'The role reverts to the org-wide baseline / none'],
  }
  delOpen.value = true
}
const confirmDelete = async () => {
  const t = delTarget.value
  if (!t) return
  deleting.value = true
  try {
    if (t.kind === 'skill') {
      await deleteSkill(t.id)
      if (editingSkillId.value === t.id) resetSkForm()
      toast.success('Skill deleted')
      dirty.value = true
      await loadSkills()
    } else {
      await deleteSkillRequirement(t.id)
      toast.success('Requirement deleted')
      dirty.value = true
      await loadReqs()
    }
    delOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete')
  } finally {
    deleting.value = false
  }
}

// ── option lists ──────────────────────────────────────────────────────────────
const categoryOptions = computed(() => SKILL_CATEGORIES.map(c => ({ value: c, label: prettyCat(c), dot: catColor(c) })))
const reqSkillOptions = computed(() => (skills.value || []).map(s => ({
  value: s.id, label: s.name, dot: catColor(s.category),
  hint: s.category ? prettyCat(s.category) : '',
})))
const designationOptions = computed(() => [
  { value: '', label: '— any —' },
  ...(reference.designations || []).map(d => ({ value: d.id, label: d.name })),
])
const gradeOptions = computed(() => [
  { value: '', label: '— any —' },
  ...(reference.grades || []).map(g => ({ value: g.id, label: g.name })),
])

const skillName = (id) => (skills.value.find(s => s.id === id)?.name) || '—'
const reqScope = (r) => {
  const desig = r.designation_name || (reference.designations || []).find(d => d.id === r.designation_id)?.name
  const grade = r.grade_name || (reference.grades || []).find(g => g.id === r.grade_id)?.name
  if (desig) return `Designation · ${desig}`
  if (grade) return `Grade · ${grade}`
  return 'Org-wide baseline'
}
const scopeIcon = (r) => {
  if (r.designation_name || r.designation_id) return Building2
  if (r.grade_name || r.grade_id) return Layers
  return Target
}

const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const catColor = (cat) => `var(${CAT_VARS[cat] || '--trn-star-dim'})`
const prettyCat = (cat) => String(cat || 'OTHER').replace(/_/g, ' ').toLowerCase()

const LVL_VARS = { 1: '--trn-star-dim', 2: '--trn-amber-strong', 3: '--trn-amber', 4: '--trn-ember', 5: '--trn-st-completed' }
function lvlColor (n) { return `var(${LVL_VARS[Math.max(1, Math.min(5, Number(n) || 1))]})` }

// ── loaders ──────────────────────────────────────────────────────────────────
const loadSkills = async () => {
  loading.value = true
  try {
    const data = await fetchSkills()
    skills.value = Array.isArray(data) ? data : (data?.items || [])
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load skills')
  } finally {
    loading.value = false
  }
}
const loadReqs = async () => {
  loadingReqs.value = true
  try {
    const data = await fetchSkillRequirements()
    requirements.value = Array.isArray(data) ? data : (data?.items || [])
  } catch (e) {
    // requirements are optional; surface quietly
    requirements.value = []
  } finally {
    loadingReqs.value = false
  }
}

watch(() => props.open, (o) => {
  if (!o) {
    // emit saved once on close if anything changed, so the matrix refreshes
    if (dirty.value) { emit('saved'); dirty.value = false }
    return
  }
  tab.value = (props.initialTab === 'reqs' || props.initialTab === 'skills') ? props.initialTab : 'skills'
  resetSkForm()
  reqForm.value = blankReq()
  loadReferenceData()
  loadSkills()
  loadReqs()
})
</script>

<style scoped>
/* ── segmented tab control ── */
.sc-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 4px; margin-bottom: 16px;
  border-radius: 13px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.sc-seg-thumb { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); z-index: 0; border-radius: 10px;
  background: color-mix(in srgb, var(--trn-amber) 16%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 36%, transparent);
  box-shadow: 0 4px 14px -8px color-mix(in srgb, var(--trn-amber) 70%, transparent);
  transition: transform 0.42s var(--trn-spring); }
.sc-seg.on-reqs .sc-seg-thumb { transform: translateX(100%); }
.sc-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font: inherit; font-size: 12.5px; font-weight: 600; padding: 9px 10px; border: 0; border-radius: 10px; cursor: pointer;
  color: var(--trn-text-muted); background: transparent; transition: color 0.25s; }
.sc-seg-btn:hover { color: var(--trn-text-secondary); }
.sc-seg-btn.on { color: var(--trn-amber-strong); }
.sc-seg-n { font-size: 10.5px; padding: 1px 7px; border-radius: 999px; background: var(--trn-surface-elevated); color: var(--trn-text-muted); }
.sc-seg-btn.on .sc-seg-n { background: color-mix(in srgb, var(--trn-amber) 22%, transparent); color: var(--trn-amber-strong); }

.sc-pane { display: flex; flex-direction: column; gap: 14px; }

/* ── composer card ── */
.sc-form { padding: 15px 16px; border-radius: 16px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 13px; }
.sc-form-head { display: flex; align-items: center; gap: 9px; }
.sc-form-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.sc-form-title { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.sc-form-tag { font-family: var(--trn-mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.sc-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sc-span2 { grid-column: span 2; }
.sc-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.sc-hint { margin: -2px 0 0; font-size: 11px; color: var(--trn-text-dim); line-height: 1.5; }
.sc-hint b { color: var(--trn-text-secondary); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

/* ── list rows ── */
.sc-list { list-style: none; margin: 0; padding: 2px; display: flex; flex-direction: column; gap: 9px; max-height: 300px; overflow-y: auto; }
.sc-row { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 10px 13px 10px 15px; border-radius: 13px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface);
  transition: border-color 0.25s var(--trn-spring), background 0.25s, box-shadow 0.25s; }
.sc-row:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: var(--trn-card-shadow); }
.sc-row.active { border-color: color-mix(in srgb, var(--trn-amber) 48%, transparent); background: color-mix(in srgb, var(--trn-amber) 9%, transparent); }
.sc-row-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: 0.55;
  transition: opacity 0.25s, width 0.25s var(--trn-spring), box-shadow 0.25s; }
.sc-row:hover .sc-row-rail { opacity: 1; width: 4px; box-shadow: 0 0 14px -1px var(--c); }

.sc-cat-badge { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 4px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600; text-transform: capitalize; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.sc-cat-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }

.sc-lvl { flex-shrink: 0; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px;
  font-size: 12.5px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); box-shadow: 0 0 12px -5px var(--c); }

.sc-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sc-row-name { font-size: 13px; font-weight: 700; color: var(--trn-text); display: flex; align-items: center; gap: 7px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-row-code { font-size: 10px; font-style: normal; color: var(--trn-text-dim); padding: 1px 6px; border-radius: 6px;
  background: var(--trn-surface-elevated); flex-shrink: 0; }
.sc-row-meta { display: inline-flex; align-items: center; gap: 9px; font-size: 11px; color: var(--trn-text-muted); text-transform: capitalize; }
.sc-row-meta :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.sc-pips { display: inline-flex; align-items: center; gap: 2.5px; }
.sc-pips i { width: 13px; height: 4px; border-radius: 2px; background: var(--trn-border-strong); transition: background 0.2s; }
.sc-pips i.on { background: linear-gradient(90deg, color-mix(in srgb, var(--c) 60%, transparent), var(--c)); }
.sc-mapped { display: inline-flex; align-items: center; gap: 4px; text-transform: none; }

.sc-row-acts { display: flex; gap: 5px; flex-shrink: 0; opacity: 0.55; transform: translateX(5px);
  transition: opacity 0.28s var(--trn-spring), transform 0.28s var(--trn-spring); }
.sc-row:hover .sc-row-acts { opacity: 1; transform: none; }
.sc-icon { display: inline-flex; align-items: center; justify-content: center; width: 31px; height: 31px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s; }
.sc-icon:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--trn-amber) 35%, transparent); }
.sc-icon.danger:hover { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 36%, transparent); }

/* ── empty ── */
.sc-blank { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 30px 18px;
  border: 1.5px dashed var(--trn-border-strong); border-radius: 16px; background: var(--trn-surface); }
.sc-blank-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; margin-bottom: 4px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.sc-blank p { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.sc-blank span { font-size: 11.5px; color: var(--trn-text-muted); max-width: 280px; line-height: 1.5; }

@media (max-width: 520px) {
  .sc-form-grid { grid-template-columns: 1fr; }
  .sc-span2 { grid-column: span 1; }
  .sc-row-acts { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sc-seg-thumb { transition: none; }
}
</style>
