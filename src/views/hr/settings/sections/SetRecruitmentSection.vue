<template>
  <div class="rec-set">
    <!-- ───────────────── CONSOLE HERO ───────────────── -->
    <SetSectionHead
      eyebrow="Modules · Hiring" title="Recruitment" accent="Governance"
      accent-color="var(--set-orange)" :icon="UserPlus"
      sub="The control fabric behind hiring — the funnel that governs every requisition, candidate, interview and offer, the interview panels you can shape, and the sibling settings each surface is wired to.">
      <template #actions>
        <button class="set-btn set-btn-steel" type="button" @click="openModule('dashboard')">
          <Compass :size="15" /> Open Recruitment
        </button>
        <button class="set-btn set-btn-primary" type="button" @click="newPanel">
          <Plus :size="15" /> New panel
        </button>
      </template>

      <template #lenses>
        <div class="rec-lenses">
          <button v-for="l in lenses" :key="l.key" class="rec-lens" type="button"
            :style="{ '--acc': l.color }" @click="openModule(l.to)">
            <span class="rec-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="rec-lens-val">
              <SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" />
            </span>
            <span class="rec-lens-lab">{{ l.label }}</span>
            <span class="rec-lens-bar" />
            <ArrowUpRight :size="13" class="rec-lens-go" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- ───────────────── COMMAND: funnel + telemetry ───────────────── -->
    <div class="rec-command">
      <HiringFunnel :stages="funnelStages" />

      <div class="rec-side">
        <div class="rec-panel">
          <div class="rec-panel-head"><Compass :size="14" /> Source of hire</div>
          <div v-if="sourceBars.length" class="rec-bars">
            <div v-for="s in sourceBars" :key="s.value" class="rec-bar">
              <span class="rec-bar-lab">
                <component :is="s.icon" :size="12" :style="{ color: s.color }" />{{ s.label }}
              </span>
              <span class="rec-bar-track"><i :style="{ width: ready ? s.pct + '%' : '0%', background: s.color }" /></span>
              <span class="rec-bar-val">{{ s.count }}</span>
            </div>
          </div>
          <p v-else class="rec-empty-mini">No candidate sources recorded yet.</p>
        </div>

        <div class="rec-panel">
          <div class="rec-panel-head"><Building2 :size="14" /> Top hiring departments</div>
          <div v-if="deptRows.length" class="rec-depts">
            <div v-for="d in deptRows" :key="d.department" class="rec-dept">
              <span class="rec-dept-name">{{ d.department }}</span>
              <span class="rec-dept-stats">
                <em :title="`${d.open_positions} open`"><Send :size="11" />{{ d.open_positions }}</em>
                <em :title="`${d.applications} applicants`"><Users :size="11" />{{ d.applications }}</em>
                <em class="ok" :title="`${d.hires} hired`"><Award :size="11" />{{ d.hires }}</em>
              </span>
            </div>
          </div>
          <p v-else class="rec-empty-mini">No departments are hiring right now.</p>
        </div>
      </div>
    </div>

    <!-- ───────────────── TAXONOMY BLUEPRINT ───────────────── -->
    <section class="rec-block">
      <header class="rec-blockhead">
        <div class="rec-blockhead-l">
          <span class="rec-blockhead-ic"><Layers :size="16" /></span>
          <div>
            <b>Pipeline taxonomy</b>
            <span>{{ VOCAB_VALUE_COUNT }} governing values across {{ VOCAB_GROUPS.length }} dimensions</span>
          </div>
        </div>
        <span class="rec-blockhead-note">
          <Lock :size="12" /> System defaults — fixed in the engine
        </span>
      </header>
      <div class="rec-tax-grid">
        <RecTaxonomyCard v-for="(g, i) in VOCAB_GROUPS" :key="g.key" :group="g" :index="i" />
      </div>
    </section>

    <!-- ───────────────── INTERVIEW PANELS (editable) ───────────────── -->
    <section class="rec-block">
      <header class="rec-blockhead">
        <div class="rec-blockhead-l">
          <span class="rec-blockhead-ic ember"><UsersRound :size="16" /></span>
          <div>
            <b>Interview panels</b>
            <span>Reusable interviewer groups — the one recruitment setting stored per-org</span>
          </div>
        </div>
        <div class="rec-blockhead-r">
          <span class="rec-blockhead-pill">{{ panels.items.value.length }} panels</span>
          <button class="set-btn set-btn-primary rec-mini-btn" type="button" @click="newPanel">
            <Plus :size="14" /> New panel
          </button>
        </div>
      </header>

      <div v-if="panels.loading.value && !panels.items.value.length" class="rec-loading">
        <Loader2 :size="20" class="set-spin" /> Loading panels…
      </div>
      <div v-else-if="!panels.items.value.length" class="rec-empty">
        <span class="rec-empty-ic"><UsersRound :size="26" /></span>
        <b>No interview panels yet</b>
        <p>Bundle interviewers and expertise into a reusable panel so scheduling carries them over automatically.</p>
        <button class="set-btn set-btn-primary" type="button" @click="newPanel"><Plus :size="14" /> Create the first panel</button>
      </div>
      <div v-else class="rec-panels-grid">
        <PanelForgeCard v-for="(p, i) in panels.items.value" :key="p.id" :panel="p" :index="i"
          :dept-name="deptNameFor(p.department_id)" @edit="editPanel" @delete="askDelete" />
      </div>
    </section>

    <!-- ───────────────── CONNECTIVITY BUS ───────────────── -->
    <section class="rec-block">
      <header class="rec-blockhead">
        <div class="rec-blockhead-l">
          <span class="rec-blockhead-ic"><Network :size="16" /></span>
          <div>
            <b>Wired into governance</b>
            <span>Where the rest of recruitment's behaviour is configured — and the surfaces it powers</span>
          </div>
        </div>
      </header>

      <div class="rec-bus-group-label"><Settings2 :size="12" /> Configured in sibling settings</div>
      <div class="rec-bus">
        <button v-for="w in wiredSettings" :key="w.slug" class="rec-wire" type="button"
          :class="{ flagged: w.flagged }" @click="$emit('go', w.slug)">
          <span class="rec-wire-ic"><component :is="w.icon" :size="15" /></span>
          <div class="rec-wire-txt"><b>{{ w.label }}</b><span>{{ w.desc }}</span></div>
          <span v-if="w.flagged" class="rec-wire-flag"><CircleAlert :size="11" /> Manual</span>
          <ChevronRight :size="15" class="rec-wire-go" />
        </button>
      </div>

      <div class="rec-bus-group-label up"><Compass :size="12" /> Manage in the Recruitment workspace</div>
      <div class="rec-bus">
        <button v-for="s in moduleSurfaces" :key="s.to" class="rec-wire surface" type="button" @click="openModule(s.to)">
          <span class="rec-wire-ic"><component :is="s.icon" :size="15" /></span>
          <div class="rec-wire-txt"><b>{{ s.label }}</b><span>{{ s.desc }}</span></div>
          <ArrowUpRight :size="15" class="rec-wire-go" />
        </button>
      </div>
    </section>

    <!-- ───────────────── MODALS ───────────────── -->
    <PanelModal :open="modalOpen" :initial="editing" :departments="departments" :saving="saving"
      @close="modalOpen = false" @save="savePanel" />
    <PanelDeleteModal :open="delOpen" :panel="delTarget" :busy="busy"
      @close="delOpen = false" @confirm="confirmDelete" @deactivate="deactivatePanel" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  UserPlus, Plus, Compass, ArrowUpRight, Layers, Lock, UsersRound, Network, Settings2,
  ChevronRight, CircleAlert, Loader2, Building2, Send, Users, Award,
  Hash, BadgeCheck, BriefcaseBusiness, Workflow, BellRing, GitPullRequestArrow, ClipboardList, FileText,
  Briefcase, Target, Inbox, ScanLine,
} from 'lucide-vue-next'

import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import HiringFunnel from '../components/HiringFunnel.vue'
import RecTaxonomyCard from '../components/RecTaxonomyCard.vue'
import PanelForgeCard from '../components/PanelForgeCard.vue'
import PanelModal from '../components/PanelModal.vue'
import PanelDeleteModal from '../components/PanelDeleteModal.vue'

import { VOCAB_GROUPS, VOCAB_VALUE_COUNT, FUNNEL_STAGES, toneColor } from '../composables/recruitmentVocab'
import { usePanels, fetchRecruitmentDashboard } from '@/composables/useRecruitment'
import { useHrReference } from '@/composables/useEmployees'

defineEmits(['go'])

const router = useRouter()
const toast = useToast()
const ready = ref(false)

const panels = usePanels()
const { reference, loadReferenceData } = useHrReference()
const departments = computed(() => reference.departments || [])
const deptNameFor = (id) => departments.value.find(d => String(d.id) === String(id))?.name || ''

const dash = ref(null)
const stats = computed(() => dash.value?.stats || {})

// ── telemetry lenses (live, clickable → deep-link into the module) ──
const lenses = computed(() => [
  { key: 'pos',  label: 'Open positions', value: stats.value.open_positions || 0,        color: 'var(--set-ok)',     icon: Send,        to: 'positions' },
  { key: 'pipe', label: 'In pipeline',    value: stats.value.candidates_in_pipeline || 0, color: 'var(--set-orange)', icon: Users,       to: 'candidates' },
  { key: 'int',  label: 'Interviews',     value: stats.value.pending_interviews || 0,      color: 'var(--set-amber)',  icon: ScanLine,    to: 'interviews' },
  { key: 'ofr',  label: 'Offers out',     value: stats.value.offers_pending || 0,          color: 'var(--set-gold)',   icon: Inbox,       to: 'offers' },
  { key: 'hire', label: 'Hires (MTD)',    value: stats.value.hires_this_month || 0,        color: 'var(--set-ok)',     icon: Award,       to: 'pipeline' },
  { key: 'acc',  label: 'Acceptance',     value: stats.value.offer_acceptance_rate || 0,   color: 'var(--set-ember)',  icon: Target, to: 'analytics', decimals: 1, suffix: '%' },
])

// ── funnel instrument data ──
const funnelStages = computed(() => {
  const counts = {}
  for (const f of (dash.value?.funnel || [])) counts[f.stage] = f.count
  return FUNNEL_STAGES.map(s => ({ ...s, count: counts[s.key] || 0 }))
})

// ── source-of-hire bars (real data, mapped through the vocab) ──
const SOURCE_VOCAB = computed(() => {
  const g = VOCAB_GROUPS.find(x => x.key === 'sources')
  const map = {}
  for (const it of (g?.items || [])) map[it.value] = it
  return map
})
const sourceBars = computed(() => {
  const rows = (dash.value?.sources_distribution || []).filter(r => r.count > 0)
  const max = Math.max(1, ...rows.map(r => r.count))
  return rows
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)
    .map(r => {
      const meta = SOURCE_VOCAB.value[r.stage] || { label: r.stage, tone: 'steel', icon: Compass }
      return { value: r.stage, label: meta.label, icon: meta.icon, color: toneColor(meta.tone), count: r.count, pct: Math.round((r.count / max) * 100) }
    })
})

const deptRows = computed(() =>
  (dash.value?.department_hiring || [])
    .filter(d => d.open_positions || d.applications || d.hires)
    .sort((a, b) => (b.open_positions - a.open_positions) || (b.applications - a.applications))
    .slice(0, 5))

// ── connectivity bus ──
const wiredSettings = [
  { slug: 'numbering-series',   label: 'Numbering Series',  icon: Hash,            desc: 'REQ · POS · CAN · APP · INT · OFR auto-codes' },
  { slug: 'designations',       label: 'Designations',      icon: BadgeCheck,      desc: 'Job titles offered on requisitions & offers' },
  { slug: 'employment-types',   label: 'Employment Types',  icon: BriefcaseBusiness, desc: 'Engagement models on requisitions & positions' },
  { slug: 'approval-workflows', label: 'Approval Workflows', icon: Workflow,       desc: 'Requisition & offer sign-off is a manual decision today', flagged: true },
  { slug: 'notification-rules', label: 'Notification Rules', icon: BellRing,       desc: 'Interview & offer alert channels' },
]
const moduleSurfaces = [
  { to: 'panels',       label: 'Interview panels',     icon: UsersRound,          desc: 'Reusable interviewer groups' },
  { to: 'pipeline',     label: 'Candidate pipeline',   icon: GitPullRequestArrow, desc: 'Kanban stage board' },
  { to: 'applications', label: 'Applications & sources', icon: ClipboardList,     desc: 'Inbound applications' },
  { to: 'offers',       label: 'Offers',               icon: FileText,            desc: 'Offer release & response' },
  { to: 'requisitions', label: 'Requisitions',         icon: Briefcase,           desc: 'Openings & approvals' },
]
const openModule = (key) => router.push(`/admin/hr/recruitment/${key}`)

// ── panel CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const delOpen = ref(false)
const delTarget = ref(null)
const busy = ref(false)

const newPanel = () => { editing.value = null; modalOpen.value = true }
const editPanel = (p) => { editing.value = p; modalOpen.value = true }
const askDelete = (p) => { delTarget.value = p; delOpen.value = true }

const savePanel = async (payload) => {
  saving.value = true
  try {
    if (editing.value) {
      await panels.update(editing.value.id, payload)
      toast.success('Panel updated')
    } else {
      await panels.create(payload)
      toast.success('Panel created')
    }
    await panels.fetchList()
    modalOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to save panel')
  } finally {
    saving.value = false
  }
}
const confirmDelete = async () => {
  if (!delTarget.value) return
  busy.value = true
  try {
    await panels.remove(delTarget.value.id)
    toast.success('Panel deleted')
    await panels.fetchList()
    delOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to delete panel')
  } finally {
    busy.value = false
  }
}
const deactivatePanel = async () => {
  if (!delTarget.value) return
  busy.value = true
  try {
    await panels.update(delTarget.value.id, { is_active: false })
    toast.success('Panel deactivated')
    await panels.fetchList()
    delOpen.value = false
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to deactivate panel')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  loadReferenceData()
  panels.fetchList()
  try { dash.value = await fetchRecruitmentDashboard() } catch { /* funnel falls back to zeros */ }
  requestAnimationFrame(() => { ready.value = true })
})
</script>

<style scoped>
.rec-set { display: flex; flex-direction: column; gap: 18px; }

/* lenses */
.rec-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.rec-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left;
  padding: 12px 13px 14px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border);
  transition: transform 0.25s var(--set-spring), border-color 0.25s; --acc: var(--set-gold); }
.rec-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.rec-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.rec-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.rec-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--set-text-muted); }
.rec-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left;
  background: var(--acc); transition: transform 0.3s var(--set-spring); }
.rec-lens:hover .rec-lens-bar { transform: scaleX(1); }
.rec-lens-go { position: absolute; top: 12px; right: 11px; color: var(--set-text-dim); opacity: 0; transform: translate(-3px, 3px); transition: all 0.25s var(--set-spring); }
.rec-lens:hover .rec-lens-go { opacity: 1; transform: none; color: var(--acc); }

/* command grid */
.rec-command { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 14px; align-items: stretch; }
.rec-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.rec-panel { flex: 1; padding: 15px 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.rec-panel-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-secondary); margin-bottom: 13px; }
.rec-panel-head :deep(svg) { color: var(--set-gold); }

.rec-bars { display: flex; flex-direction: column; gap: 9px; }
.rec-bar { display: grid; grid-template-columns: 104px 1fr 28px; gap: 9px; align-items: center; }
.rec-bar-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-bar-track { height: 7px; border-radius: 999px; background: var(--set-trace-idle); overflow: hidden; }
.rec-bar-track i { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--set-spring); box-shadow: 0 0 9px currentColor; }
.rec-bar-val { font-size: 12px; font-weight: 800; color: var(--set-text); text-align: right; font-variant-numeric: tabular-nums; }

.rec-depts { display: flex; flex-direction: column; gap: 4px; }
.rec-dept { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 10px; transition: background 0.2s; }
.rec-dept:hover { background: var(--set-surface-elevated); }
.rec-dept-name { font-size: 12.5px; font-weight: 650; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-dept-stats { display: inline-flex; gap: 11px; flex-shrink: 0; }
.rec-dept-stats em { display: inline-flex; align-items: center; gap: 4px; font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--set-text-muted); }
.rec-dept-stats em :deep(svg) { color: var(--set-text-dim); }
.rec-dept-stats em.ok { color: var(--set-ok); }
.rec-dept-stats em.ok :deep(svg) { color: var(--set-ok); }
.rec-empty-mini { margin: 0; font-size: 12px; color: var(--set-text-dim); font-style: italic; }

/* blocks */
.rec-block { display: flex; flex-direction: column; gap: 14px; }
.rec-blockhead { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.rec-blockhead-l { display: flex; align-items: center; gap: 12px; }
.rec-blockhead-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.rec-blockhead-ic.ember { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 13%, transparent); border-color: color-mix(in srgb, var(--set-ember) 26%, transparent); }
.rec-blockhead-l b { display: block; font-size: 15.5px; font-weight: 850; color: var(--set-text); }
.rec-blockhead-l span { font-size: 12px; color: var(--set-text-muted); }
.rec-blockhead-note { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--set-text-muted); padding: 5px 11px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.rec-blockhead-note :deep(svg) { color: var(--set-text-dim); }
.rec-blockhead-r { display: flex; align-items: center; gap: 10px; }
.rec-blockhead-pill { font-size: 11px; font-weight: 800; color: var(--set-text-secondary); padding: 5px 11px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.rec-mini-btn { padding: 8px 13px; font-size: 12.5px; }

.rec-tax-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 13px; }
.rec-panels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 13px; }

.rec-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 36px; color: var(--set-text-muted); font-size: 13px; }
.rec-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 40px 24px; border-radius: 18px;
  background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.rec-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); }
.rec-empty b { font-size: 15px; font-weight: 800; color: var(--set-text); margin-top: 4px; }
.rec-empty p { margin: 0 0 6px; font-size: 12.5px; color: var(--set-text-muted); max-width: 42ch; line-height: 1.5; }

/* connectivity bus */
.rec-bus-group-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-muted); }
.rec-bus-group-label :deep(svg) { color: var(--set-gold); }
.rec-bus-group-label.up { margin-top: 4px; }
.rec-bus { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 11px; }
.rec-wire { display: flex; align-items: center; gap: 11px; cursor: pointer; text-align: left; padding: 13px 14px; border-radius: 14px;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: transform 0.25s var(--set-spring), border-color 0.25s; }
.rec-wire:hover { transform: translateY(-2px); border-color: var(--set-border-warm); }
.rec-wire.surface:hover { border-color: color-mix(in srgb, var(--set-orange) 40%, transparent); }
.rec-wire.flagged { border-style: dashed; }
.rec-wire-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.rec-wire.surface .rec-wire-ic { color: var(--set-orange); background: color-mix(in srgb, var(--set-orange) 12%, transparent); border-color: color-mix(in srgb, var(--set-orange) 24%, transparent); }
.rec-wire-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rec-wire-txt b { font-size: 13px; font-weight: 750; color: var(--set-text); }
.rec-wire-txt span { font-size: 11px; color: var(--set-text-muted); line-height: 1.35; }
.rec-wire-flag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--set-partial); padding: 3px 7px; border-radius: 999px; background: var(--set-partial-soft); }
.rec-wire-go { color: var(--set-text-dim); flex-shrink: 0; transition: transform 0.25s var(--set-spring), color 0.25s; }
.rec-wire:hover .rec-wire-go { color: var(--set-gold); transform: translateX(3px); }

@media (max-width: 1080px) { .rec-command { grid-template-columns: 1fr; } .rec-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .rec-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .rec-lens:hover, .rec-wire:hover { transform: none; }
  .rec-bar-track i { transition: none; }
}
</style>
