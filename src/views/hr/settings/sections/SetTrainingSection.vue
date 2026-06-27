<template>
  <div class="trn-set">
    <!-- ───────────────── CONSOLE HERO ───────────────── -->
    <SetSectionHead
      eyebrow="Modules · Learning" title="Training" accent="Foundation"
      accent-color="var(--set-amber)" :icon="GraduationCap"
      sub="The capability foundation behind every course, credential and competency — the skill catalog you curate here, the fixed learning vocabulary the engine runs on, and the sibling settings each training surface is wired to.">
      <template #actions>
        <button class="set-btn set-btn-steel" type="button" @click="openModule('dashboard')">
          <Compass :size="15" /> Open Training
        </button>
        <button class="set-btn set-btn-primary" type="button" @click="newSkill">
          <Plus :size="15" /> New skill
        </button>
      </template>

      <template #lenses>
        <div class="trn-lenses">
          <button v-for="l in lenses" :key="l.key" class="trn-lens" type="button"
            :style="{ '--acc': l.color }" @click="openModule(l.to)">
            <span class="trn-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="trn-lens-val">
              <SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" />
            </span>
            <span class="trn-lens-lab">{{ l.label }}</span>
            <span class="trn-lens-bar" />
            <ArrowUpRight :size="13" class="trn-lens-go" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- ───────────────── COMMAND: canopy + telemetry ───────────────── -->
    <div class="trn-command">
      <CapabilityCanopy :by-type="byType" :completion="stats.completion_rate || 0"
        :programs="stats.total_programs || 0" :employees="stats.employees_trained || 0" />

      <div class="trn-side">
        <!-- delivery momentum -->
        <div class="trn-panel">
          <div class="trn-panel-head"><TrendingUp :size="14" /> Delivery momentum
            <span class="trn-panel-sub">completions · last 6 months</span></div>
          <div v-if="momentum.length" class="trn-spark">
            <div v-for="(m, i) in momentum" :key="i" class="trn-spark-col">
              <span class="trn-spark-val">{{ m.completions }}</span>
              <span class="trn-spark-bar"><i :style="{ height: ready ? m.pct + '%' : '0%' }" /></span>
              <span class="trn-spark-lab">{{ m.label }}</span>
            </div>
          </div>
          <p v-else class="trn-empty-mini">No completions recorded in the last six months.</p>
        </div>

        <!-- certification horizon -->
        <div class="trn-panel">
          <div class="trn-panel-head"><Award :size="14" /> Certification horizon</div>
          <div v-if="certTotal" class="trn-horizon">
            <span class="trn-horizon-bar">
              <i v-for="s in certSegments" :key="s.key" :class="{ z: !ready }"
                :style="{ width: (ready ? s.pct : 0) + '%', background: s.color }" :title="`${s.label}: ${s.count}`" />
            </span>
            <div class="trn-horizon-legend">
              <span v-for="s in certSegments" :key="s.key" class="trn-hl">
                <i :style="{ background: s.color }" />{{ s.label }} <b>{{ s.count }}</b>
              </span>
            </div>
          </div>
          <p v-else class="trn-empty-mini">No employee certifications on record yet.</p>

          <div class="trn-windows">
            <div class="trn-win" v-for="w in expiryWindows" :key="w.label">
              <span class="trn-win-val">{{ w.value }}</span>
              <span class="trn-win-lab">{{ w.label }}</span>
            </div>
            <div class="trn-win gap" @click="openModule('skill-matrix')" title="Open the skill matrix">
              <span class="trn-win-val">{{ stats.skill_gap_count || 0 }}</span>
              <span class="trn-win-lab">Skill gaps</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────────────── SKILL CATALOG (editable) ───────────────── -->
    <section class="trn-block">
      <header class="trn-blockhead">
        <div class="trn-blockhead-l">
          <span class="trn-blockhead-ic ember"><Layers :size="16" /></span>
          <div>
            <b>Skill catalog</b>
            <span>The competency library — the one Training setting curated here, wired into requirements, the matrix & gap analysis</span>
          </div>
        </div>
        <div class="trn-blockhead-r">
          <span class="trn-blockhead-pill">{{ activeSkillCount }} active · {{ requirements.length }} req</span>
          <button class="set-btn set-btn-primary trn-mini-btn" type="button" @click="newSkill">
            <Plus :size="14" /> New skill
          </button>
        </div>
      </header>

      <!-- category filter rail -->
      <div v-if="skills.length" class="trn-filters">
        <button class="trn-fchip" :class="{ on: catFilter === null }" @click="catFilter = null">
          All <b>{{ skills.length }}</b>
        </button>
        <button v-for="c in categoryChips" :key="c.key" class="trn-fchip" :class="{ on: catFilter === c.key }"
          :style="{ '--acc': c.color }" @click="catFilter = catFilter === c.key ? null : c.key">
          <component :is="c.icon" :size="12" />{{ c.label }} <b>{{ c.count }}</b>
        </button>
      </div>

      <div v-if="loadingSkills && !skills.length" class="trn-loading">
        <Loader2 :size="20" class="set-spin" /> Loading the skill catalog…
      </div>
      <div v-else-if="!skills.length" class="trn-empty">
        <span class="trn-empty-ic"><Layers :size="26" /></span>
        <b>No skills in the catalog yet</b>
        <p>Curate the competencies your org develops and assesses. Each becomes available across the matrix, gap analysis and the requirements you pin to designations & grades.</p>
        <button class="set-btn set-btn-primary" type="button" @click="newSkill"><Plus :size="14" /> Add the first skill</button>
      </div>
      <div v-else-if="!filteredSkills.length" class="trn-empty soft">
        <span class="trn-empty-ic"><FilterX :size="24" /></span>
        <b>No {{ catFilterLabel }} skills</b>
        <button class="set-btn set-btn-steel" type="button" @click="catFilter = null">Clear filter</button>
      </div>
      <template v-else>
        <div class="trn-skills-grid">
          <SetSkillCard v-for="(s, i) in shownSkills" :key="s.id" :skill="s" :index="i"
            :dept-name="deptNameFor(s.department_id)" :requirement-count="reqCountFor(s.id)"
            @edit="editSkill" @delete="askDelete" />
        </div>
        <p v-if="filteredSkills.length > shownSkills.length" class="trn-more">
          Showing {{ shownSkills.length }} of {{ filteredSkills.length }} — refine with a category filter, or manage the rest in the
          <button type="button" @click="openModule('skill-matrix')">skill matrix</button>.
        </p>
      </template>
    </section>

    <!-- ───────────────── TAXONOMY BLUEPRINT ───────────────── -->
    <section class="trn-block">
      <header class="trn-blockhead">
        <div class="trn-blockhead-l">
          <span class="trn-blockhead-ic"><GraduationCap :size="16" /></span>
          <div>
            <b>Learning vocabulary</b>
            <span>{{ VOCAB_VALUE_COUNT }} governing values across {{ VOCAB_GROUPS.length }} dimensions</span>
          </div>
        </div>
        <span class="trn-blockhead-note">
          <Lock :size="12" /> System defaults — fixed in the engine
        </span>
      </header>
      <div class="trn-tax-grid">
        <RecTaxonomyCard v-for="(g, i) in VOCAB_GROUPS" :key="g.key" :group="g" :index="i" />
      </div>
    </section>

    <!-- ───────────────── CONNECTIVITY BUS ───────────────── -->
    <section class="trn-block">
      <header class="trn-blockhead">
        <div class="trn-blockhead-l">
          <span class="trn-blockhead-ic"><Network :size="16" /></span>
          <div>
            <b>Wired into governance</b>
            <span>Where training's behaviour is configured — and the module surfaces it powers</span>
          </div>
        </div>
      </header>

      <div class="trn-bus-group-label"><Settings2 :size="12" /> Configured in sibling settings</div>
      <div class="trn-bus">
        <button v-for="w in wiredSettings" :key="w.slug" class="trn-wire" type="button"
          :class="{ flagged: w.flagged }" @click="$emit('go', w.slug)">
          <span class="trn-wire-ic"><component :is="w.icon" :size="15" /></span>
          <div class="trn-wire-txt"><b>{{ w.label }}</b><span>{{ w.desc }}</span></div>
          <span v-if="w.flag" class="trn-wire-flag"><CircleAlert :size="11" /> {{ w.flag }}</span>
          <ChevronRight :size="15" class="trn-wire-go" />
        </button>
      </div>

      <div class="trn-bus-group-label up"><Compass :size="12" /> Manage in the Training workspace</div>
      <div class="trn-bus">
        <button v-for="s in moduleSurfaces" :key="s.to" class="trn-wire surface" type="button" @click="openModule(s.to)">
          <span class="trn-wire-ic"><component :is="s.icon" :size="15" /></span>
          <div class="trn-wire-txt"><b>{{ s.label }}</b><span>{{ s.desc }}</span></div>
          <ArrowUpRight :size="15" class="trn-wire-go" />
        </button>
      </div>
    </section>

    <!-- ───────────────── MODALS ───────────────── -->
    <SetSkillModal :open="modalOpen" :initial="editing" :departments="departments" :saving="saving"
      @close="modalOpen = false" @save="saveSkill" />
    <SetSkillDeleteModal :open="delOpen" :skill="delTarget" :busy="busy" :requirement-count="delTarget ? reqCountFor(delTarget.id) : 0"
      @close="delOpen = false" @confirm="confirmDelete" @deactivate="deactivateSkill" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  GraduationCap, Plus, Compass, ArrowUpRight, Layers, Lock, Network, Settings2,
  ChevronRight, CircleAlert, Loader2, Building2, Award, Target, ShieldCheck, Hash,
  BadgeCheck, Workflow, BellRing, BookOpen, Grid3x3, Presentation, Wallet, TrendingUp,
  Users, Gauge, FilterX,
} from 'lucide-vue-next'

import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import CapabilityCanopy from '../components/CapabilityCanopy.vue'
import RecTaxonomyCard from '../components/RecTaxonomyCard.vue'
import SetSkillCard from '../components/SetSkillCard.vue'
import SetSkillModal from '../components/SetSkillModal.vue'
import SetSkillDeleteModal from '../components/SetSkillDeleteModal.vue'

import {
  VOCAB_GROUPS, VOCAB_VALUE_COUNT, SKILL_CATEGORY_ORDER, SKILL_CATEGORY_META,
  skillCategoryMeta, toneColor, CERT_HORIZON,
} from '../composables/trainingVocab'
import { fetchTrainingStats, fetchSkills, createSkill, patchSkill, deleteSkill, fetchSkillRequirements } from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'

defineEmits(['go'])

const router = useRouter()
const toast = useToast()
const ready = ref(false)

const { reference, loadReferenceData } = useHrReference()
const departments = computed(() => reference.departments || [])
const deptNameFor = (id) => departments.value.find(d => String(d.id) === String(id))?.name || ''

// ── data ──
const stats = ref({})
const byType = computed(() => stats.value.by_type || [])
const skills = ref([])
const requirements = ref([])
const loadingSkills = ref(false)

// ── telemetry lenses ──
const lenses = computed(() => [
  { key: 'prog', label: 'Programs',     value: stats.value.total_programs || 0,    color: 'var(--set-gold)',   icon: BookOpen,     to: 'programs' },
  { key: 'emp',  label: 'Trained',      value: stats.value.employees_trained || 0, color: 'var(--set-orange)', icon: Users,        to: 'enrollment' },
  { key: 'comp', label: 'Completion',   value: stats.value.completion_rate || 0,   color: 'var(--set-ok)',     icon: Gauge,        to: 'dashboard', decimals: 0, suffix: '%' },
  { key: 'cmpl', label: 'Compliance',   value: stats.value.compliance_rate || 0,   color: 'var(--set-ember)',  icon: ShieldCheck,  to: 'compliance', decimals: 0, suffix: '%' },
  { key: 'cert', label: 'Certs active', value: stats.value.certs_active || 0,       color: 'var(--set-amber)',  icon: Award,        to: 'certifications' },
  { key: 'gap',  label: 'Skill gaps',   value: stats.value.skill_gap_count || 0,    color: 'var(--set-rust)',   icon: Target,       to: 'skill-matrix' },
])

// ── delivery momentum (real monthly[]) ──
const momentum = computed(() => {
  const rows = stats.value.monthly || []
  const max = Math.max(1, ...rows.map(m => m.completions || 0))
  return rows.map(m => ({ label: m.month, completions: m.completions || 0, pct: Math.round(((m.completions || 0) / max) * 100) }))
})

// ── certification horizon (real cert_status[]) ──
const certCounts = computed(() => {
  const map = {}
  for (const r of (stats.value.cert_status || [])) map[r.status] = r.count
  return map
})
const certTotal = computed(() => Object.values(certCounts.value).reduce((n, c) => n + (c || 0), 0))
const certSegments = computed(() => {
  const total = certTotal.value || 1
  return CERT_HORIZON
    .map(s => ({ ...s, count: certCounts.value[s.key] || 0, color: toneColor(s.tone) }))
    .filter(s => s.count > 0)
    .map(s => ({ ...s, pct: Math.round((s.count / total) * 100) }))
})
const expiryWindows = computed(() => [
  { label: '≤30 days', value: stats.value.certs_expiring_30 || 0 },
  { label: '≤60 days', value: stats.value.certs_expiring_60 || 0 },
  { label: '≤90 days', value: stats.value.certs_expiring_90 || 0 },
])

// ── skill catalog ──
const catFilter = ref(null)
const reqBySkill = computed(() => {
  const m = {}
  for (const r of requirements.value) {
    const k = String(r.skill_id)
    m[k] = (m[k] || 0) + 1
  }
  return m
})
const reqCountFor = (id) => reqBySkill.value[String(id)] || 0
const activeSkillCount = computed(() => skills.value.filter(s => s.is_active !== false).length)

const categoryChips = computed(() => {
  const counts = {}
  for (const s of skills.value) counts[s.category] = (counts[s.category] || 0) + 1
  return SKILL_CATEGORY_ORDER
    .filter(k => counts[k])
    .map(k => ({ key: k, label: SKILL_CATEGORY_META[k].label, icon: SKILL_CATEGORY_META[k].icon, color: toneColor(SKILL_CATEGORY_META[k].tone), count: counts[k] }))
})
const filteredSkills = computed(() => catFilter.value ? skills.value.filter(s => s.category === catFilter.value) : skills.value)
const shownSkills = computed(() => filteredSkills.value.slice(0, 36))
const catFilterLabel = computed(() => catFilter.value ? skillCategoryMeta(catFilter.value).label.toLowerCase() : '')

// ── connectivity ──
const wiredSettings = [
  { slug: 'notification-rules', label: 'Notification Rules', icon: BellRing,   desc: 'Training-assigned & certification-expiry alerts' },
  { slug: 'designations',       label: 'Designations',       icon: BadgeCheck, desc: 'Skill requirements pin a required level per designation' },
  { slug: 'grades',             label: 'Grades',             icon: Layers,     desc: 'Requirements can also be pinned per pay grade' },
  { slug: 'departments',        label: 'Departments',        icon: Building2,  desc: 'Scope skills, budgets & compliance by department' },
  { slug: 'approval-workflows', label: 'Approval Workflows', icon: Workflow,   desc: 'Training-request sign-off is a fixed Manager → HR chain', flagged: true, flag: 'Fixed' },
  { slug: 'numbering-series',   label: 'Numbering Series',   icon: Hash,       desc: 'Requests use a built-in TR-YY counter, not a series', flagged: true, flag: 'Built-in' },
]
const moduleSurfaces = [
  { to: 'programs',       label: 'Programs',      icon: BookOpen,      desc: 'Course catalog & delivery modes' },
  { to: 'skill-matrix',  label: 'Skill matrix',  icon: Grid3x3,       desc: 'Competency levels & gap analysis' },
  { to: 'certifications', label: 'Certifications', icon: Award,        desc: 'Credential catalog & expiry' },
  { to: 'trainers',      label: 'Trainers',      icon: Presentation,  desc: 'Internal, external & vendor trainers' },
  { to: 'compliance',    label: 'Compliance',    icon: ShieldCheck,   desc: 'Mandatory recurring training' },
  { to: 'budget',        label: 'Budget',        icon: Wallet,        desc: 'Allocation & spend tracking' },
]
const openModule = (key) => router.push(`/admin/hr/training/${key}`)

// ── skill CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const delOpen = ref(false)
const delTarget = ref(null)
const busy = ref(false)

const newSkill = () => { editing.value = null; modalOpen.value = true }
const editSkill = (s) => { editing.value = s; modalOpen.value = true }
const askDelete = (s) => { delTarget.value = s; delOpen.value = true }

const loadSkills = async () => {
  loadingSkills.value = true
  try {
    const [sk, rq] = await Promise.all([
      fetchSkills().catch(() => []),
      fetchSkillRequirements().catch(() => []),
    ])
    skills.value = Array.isArray(sk) ? sk : (sk?.items || [])
    requirements.value = Array.isArray(rq) ? rq : (rq?.items || [])
  } finally {
    loadingSkills.value = false
  }
}

const saveSkill = async (payload) => {
  saving.value = true
  try {
    if (editing.value) { await patchSkill(editing.value.id, payload); toast.success('Skill updated') }
    else { await createSkill(payload); toast.success('Skill created') }
    await loadSkills()
    modalOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to save skill')
  } finally {
    saving.value = false
  }
}
const confirmDelete = async () => {
  if (!delTarget.value) return
  busy.value = true
  try {
    await deleteSkill(delTarget.value.id)
    toast.success('Skill deleted')
    await loadSkills()
    delOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to delete skill')
  } finally {
    busy.value = false
  }
}
const deactivateSkill = async () => {
  if (!delTarget.value) return
  busy.value = true
  try {
    await patchSkill(delTarget.value.id, { is_active: false })
    toast.success('Skill deactivated')
    await loadSkills()
    delOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to deactivate skill')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  loadReferenceData()
  loadSkills()
  try { stats.value = await fetchTrainingStats() } catch { /* lenses + canopy fall back to zeros */ }
  requestAnimationFrame(() => { ready.value = true })
})
</script>

<style scoped>
.trn-set { display: flex; flex-direction: column; gap: 18px; }

/* lenses */
.trn-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.trn-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left;
  padding: 12px 13px 14px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border);
  transition: transform 0.25s var(--set-spring), border-color 0.25s; --acc: var(--set-gold); }
.trn-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.trn-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.trn-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.trn-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--set-text-muted); }
.trn-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left;
  background: var(--acc); transition: transform 0.3s var(--set-spring); }
.trn-lens:hover .trn-lens-bar { transform: scaleX(1); }
.trn-lens-go { position: absolute; top: 12px; right: 11px; color: var(--set-text-dim); opacity: 0; transform: translate(-3px, 3px); transition: all 0.25s var(--set-spring); }
.trn-lens:hover .trn-lens-go { opacity: 1; transform: none; color: var(--acc); }

/* command grid */
.trn-command { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 14px; align-items: stretch; }
.trn-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.trn-panel { flex: 1; padding: 15px 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.trn-panel-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-secondary); margin-bottom: 14px; }
.trn-panel-head :deep(svg) { color: var(--set-gold); }
.trn-panel-sub { margin-left: auto; font-size: 9.5px; font-weight: 600; letter-spacing: 0.02em; text-transform: none; color: var(--set-text-dim); }

/* momentum spark */
.trn-spark { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; align-items: end; height: 116px; }
.trn-spark-col { display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; justify-content: flex-end; }
.trn-spark-val { font-size: 11px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums; }
.trn-spark-bar { width: 100%; flex: 1; display: flex; align-items: flex-end; border-radius: 6px; background: var(--set-trace-idle); overflow: hidden; }
.trn-spark-bar i { display: block; width: 100%; min-height: 3px; border-radius: 6px; background: var(--set-grad-hero);
  box-shadow: 0 0 10px color-mix(in srgb, var(--set-gold) 30%, transparent); transition: height 0.9s var(--set-spring); }
.trn-spark-lab { font-size: 9.5px; font-weight: 600; color: var(--set-text-muted); }

/* cert horizon */
.trn-horizon { display: flex; flex-direction: column; gap: 10px; }
.trn-horizon-bar { display: flex; height: 13px; border-radius: 999px; overflow: hidden; background: var(--set-trace-idle); }
.trn-horizon-bar i { height: 100%; transition: width 0.9s var(--set-spring); }
.trn-horizon-bar i.z { width: 0 !important; }
.trn-horizon-legend { display: flex; flex-wrap: wrap; gap: 9px 14px; }
.trn-hl { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--set-text-secondary); }
.trn-hl i { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.trn-hl b { font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }

.trn-windows { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
.trn-win { display: flex; flex-direction: column; gap: 2px; padding: 9px 10px; border-radius: 11px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.trn-win-val { font-size: 16px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.trn-win-lab { font-size: 9px; font-weight: 600; color: var(--set-text-muted); }
.trn-win.gap { cursor: pointer; transition: all 0.2s var(--set-spring); }
.trn-win.gap:hover { border-color: color-mix(in srgb, var(--set-rust) 40%, transparent); transform: translateY(-2px); }
.trn-win.gap .trn-win-val { color: var(--set-rust); }

.trn-empty-mini { margin: 0; font-size: 12px; color: var(--set-text-dim); font-style: italic; }

/* blocks */
.trn-block { display: flex; flex-direction: column; gap: 14px; }
.trn-blockhead { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.trn-blockhead-l { display: flex; align-items: center; gap: 12px; }
.trn-blockhead-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.trn-blockhead-ic.ember { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 13%, transparent); border-color: color-mix(in srgb, var(--set-ember) 26%, transparent); }
.trn-blockhead-l b { display: block; font-size: 15.5px; font-weight: 850; color: var(--set-text); }
.trn-blockhead-l span { font-size: 12px; color: var(--set-text-muted); }
.trn-blockhead-note { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--set-text-muted); padding: 5px 11px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.trn-blockhead-note :deep(svg) { color: var(--set-text-dim); }
.trn-blockhead-r { display: flex; align-items: center; gap: 10px; }
.trn-blockhead-pill { font-size: 11px; font-weight: 800; color: var(--set-text-secondary); padding: 5px 11px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.trn-mini-btn { padding: 8px 13px; font-size: 12.5px; }

/* category filters */
.trn-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.trn-fchip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 650; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border);
  transition: all 0.2s var(--set-spring); --acc: var(--set-gold); }
.trn-fchip :deep(svg) { color: var(--acc); }
.trn-fchip b { font-weight: 850; color: var(--set-text-secondary); font-variant-numeric: tabular-nums; }
.trn-fchip:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.trn-fchip.on { color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border-color: color-mix(in srgb, var(--acc) 36%, transparent); }
.trn-fchip.on b { color: var(--acc); }

.trn-skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 13px; }
.trn-tax-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 13px; }

.trn-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 36px; color: var(--set-text-muted); font-size: 13px; }
.trn-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 40px 24px; border-radius: 18px;
  background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.trn-empty.soft { padding: 28px 24px; }
.trn-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); }
.trn-empty b { font-size: 15px; font-weight: 800; color: var(--set-text); margin-top: 4px; }
.trn-empty p { margin: 0 0 6px; font-size: 12.5px; color: var(--set-text-muted); max-width: 46ch; line-height: 1.5; }
.trn-more { margin: 2px 0 0; font-size: 12px; color: var(--set-text-muted); }
.trn-more button { background: none; border: none; padding: 0; cursor: pointer; font: inherit; font-weight: 750; color: var(--set-gold); }
.trn-more button:hover { text-decoration: underline; }

/* connectivity bus */
.trn-bus-group-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-muted); }
.trn-bus-group-label :deep(svg) { color: var(--set-gold); }
.trn-bus-group-label.up { margin-top: 4px; }
.trn-bus { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 11px; }
.trn-wire { display: flex; align-items: center; gap: 11px; cursor: pointer; text-align: left; padding: 13px 14px; border-radius: 14px;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: transform 0.25s var(--set-spring), border-color 0.25s; }
.trn-wire:hover { transform: translateY(-2px); border-color: var(--set-border-warm); }
.trn-wire.surface:hover { border-color: color-mix(in srgb, var(--set-orange) 40%, transparent); }
.trn-wire.flagged { border-style: dashed; }
.trn-wire-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.trn-wire.surface .trn-wire-ic { color: var(--set-orange); background: color-mix(in srgb, var(--set-orange) 12%, transparent); border-color: color-mix(in srgb, var(--set-orange) 24%, transparent); }
.trn-wire-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.trn-wire-txt b { font-size: 13px; font-weight: 750; color: var(--set-text); }
.trn-wire-txt span { font-size: 11px; color: var(--set-text-muted); line-height: 1.35; }
.trn-wire-flag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--set-partial); padding: 3px 7px; border-radius: 999px; background: var(--set-partial-soft); }
.trn-wire-go { color: var(--set-text-dim); flex-shrink: 0; transition: transform 0.25s var(--set-spring), color 0.25s; }
.trn-wire:hover .trn-wire-go { color: var(--set-gold); transform: translateX(3px); }

@media (max-width: 1080px) { .trn-command { grid-template-columns: 1fr; } .trn-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .trn-lenses { grid-template-columns: repeat(2, 1fr); } .trn-windows { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .trn-lens:hover, .trn-wire:hover, .trn-win.gap:hover { transform: none; }
  .trn-spark-bar i, .trn-horizon-bar i { transition: none; }
}
</style>
