<template>
  <div class="onb-set">
    <!-- ───────────────── CONSOLE HERO ───────────────── -->
    <SetSectionHead
      eyebrow="Modules · Joining" title="Onboarding" accent="Launch Control"
      accent-color="var(--set-amber)" :icon="Rocket"
      sub="The blueprint behind every joining — the launch sequence each new hire ascends, the checklist & welcome-kit templates stamped onto them, and the sibling settings that hand off into onboarding.">
      <template #actions>
        <button class="set-btn set-btn-steel" type="button" @click="openModule('dashboard')">
          <Compass :size="15" /> Open Onboarding
        </button>
        <button class="set-btn set-btn-primary" type="button" @click="newTemplate">
          <Plus :size="15" /> New template
        </button>
      </template>

      <template #lenses>
        <div class="onb-lenses">
          <button v-for="l in lenses" :key="l.key" class="onb-lens" type="button"
            :style="{ '--acc': l.color }" @click="openModule(l.to)">
            <span class="onb-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="onb-lens-val"><SetCountUp :value="l.value" /></span>
            <span class="onb-lens-lab">{{ l.label }}</span>
            <span class="onb-lens-bar" />
            <ArrowUpRight :size="13" class="onb-lens-go" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- ───────────────── SIGNATURE: LAUNCH SEQUENCE ───────────────── -->
    <LaunchSequence :stages="journeyStages" />

    <!-- ───────────────── CHECKLIST TEMPLATES (editable) ───────────────── -->
    <section class="onb-block">
      <header class="onb-blockhead">
        <div class="onb-blockhead-l">
          <span class="onb-blockhead-ic"><ListChecks :size="16" /></span>
          <div>
            <b>Checklist templates</b>
            <span>Stamped onto every new hire's joining checklist — {{ activeTemplateCount }} active of {{ templates.length }}</span>
          </div>
        </div>
        <div class="onb-blockhead-r">
          <button class="set-btn set-btn-primary onb-mini-btn" type="button" @click="newTemplate"><Plus :size="14" /> New template</button>
        </div>
      </header>

      <div v-if="templates.length" class="onb-filterbar">
        <button class="onb-filter" :class="{ on: lane === 'all' }" @click="lane = 'all'">All <em>{{ templates.length }}</em></button>
        <button v-for="c in CHECKLIST_CATEGORIES" :key="c.value" class="onb-filter" :class="{ on: lane === c.value }"
          :style="{ '--c': toneColor(c.tone) }" @click="lane = c.value">
          <component :is="c.icon" :size="12" />{{ c.label }} <em>{{ countByCat(c.value) }}</em>
        </button>
      </div>

      <div v-if="loadingTpl && !templates.length" class="onb-loading"><Loader2 :size="20" class="set-spin" /> Loading templates…</div>
      <div v-else-if="!templates.length" class="onb-empty">
        <span class="onb-empty-ic"><ListChecks :size="26" /></span>
        <b>No checklist templates yet</b>
        <p>Templates are the master tasks copied onto every new joiner. Create the first to shape the joining checklist.</p>
        <button class="set-btn set-btn-primary" type="button" @click="newTemplate"><Plus :size="14" /> Create the first template</button>
      </div>
      <div v-else-if="!shownTemplates.length" class="onb-empty mini">
        <p>No templates in this lane.</p>
      </div>
      <div v-else class="onb-tpl-grid">
        <OnbBlueprintCard v-for="(t, i) in shownTemplates" :key="t.id" :template="t" :index="i"
          @edit="editTemplate" @toggle="toggleTemplate" />
      </div>
    </section>

    <!-- ───────────────── WELCOME KIT TEMPLATES (editable) ───────────────── -->
    <section class="onb-block">
      <header class="onb-blockhead">
        <div class="onb-blockhead-l">
          <span class="onb-blockhead-ic ok"><Gift :size="16" /></span>
          <div>
            <b>Welcome kits</b>
            <span>The bundle composed for new joiners — copied during onboarding, then packed &amp; shipped</span>
          </div>
        </div>
        <div class="onb-blockhead-r">
          <button class="set-btn set-btn-primary onb-mini-btn ok" type="button" @click="newKit"><Plus :size="14" /> New kit</button>
        </div>
      </header>

      <div v-if="loadingKit && !kits.length" class="onb-loading"><Loader2 :size="20" class="set-spin" /> Loading kits…</div>
      <div v-else-if="!kits.length" class="onb-empty">
        <span class="onb-empty-ic ok"><Gift :size="26" /></span>
        <b>No welcome kits yet</b>
        <p>Define the items a new joiner receives — laptop, ID card, swag — and onboarding handles packing &amp; delivery.</p>
        <button class="set-btn set-btn-primary" type="button" @click="newKit"><Plus :size="14" /> Compose the first kit</button>
      </div>
      <div v-else class="onb-kit-grid">
        <WelcomeKitCard v-for="(k, i) in kits" :key="k.id" :kit="k" :index="i" @edit="editKit" />
      </div>
    </section>

    <!-- ───────────────── TAXONOMY BLUEPRINT ───────────────── -->
    <section class="onb-block">
      <header class="onb-blockhead">
        <div class="onb-blockhead-l">
          <span class="onb-blockhead-ic"><Layers :size="16" /></span>
          <div>
            <b>Onboarding taxonomy</b>
            <span>{{ VOCAB_VALUE_COUNT }} governing values across {{ VOCAB_GROUPS.length }} dimensions</span>
          </div>
        </div>
        <span class="onb-blockhead-note"><Lock :size="12" /> System defaults — fixed in the engine</span>
      </header>
      <div class="onb-tax-grid">
        <RecTaxonomyCard v-for="(g, i) in VOCAB_GROUPS" :key="g.key" :group="g" :index="i" />
      </div>
    </section>

    <!-- ───────────────── CONNECTIVITY BUS ───────────────── -->
    <section class="onb-block">
      <header class="onb-blockhead">
        <div class="onb-blockhead-l">
          <span class="onb-blockhead-ic"><Network :size="16" /></span>
          <div>
            <b>Wired into governance</b>
            <span>Where the rest of joining is configured — and the surfaces onboarding powers</span>
          </div>
        </div>
      </header>

      <div class="onb-bus-label"><Settings2 :size="12" /> Configured in sibling settings</div>
      <div class="onb-bus">
        <button v-for="w in wiredSettings" :key="w.slug" class="onb-wire" :class="{ flagged: w.flagged }" type="button" @click="$emit('go', w.slug)">
          <span class="onb-wire-ic"><component :is="w.icon" :size="15" /></span>
          <div class="onb-wire-txt"><b>{{ w.label }}</b><span>{{ w.desc }}</span></div>
          <span v-if="w.flagged" class="onb-wire-flag"><CircleAlert :size="11" /> Manual</span>
          <ChevronRight :size="15" class="onb-wire-go" />
        </button>
      </div>

      <div class="onb-bus-label up"><Compass :size="12" /> Manage in the Onboarding workspace</div>
      <div class="onb-bus">
        <button v-for="s in moduleSurfaces" :key="s.to" class="onb-wire surface" type="button" @click="openModule(s.to)">
          <span class="onb-wire-ic"><component :is="s.icon" :size="15" /></span>
          <div class="onb-wire-txt"><b>{{ s.label }}</b><span>{{ s.desc }}</span></div>
          <ArrowUpRight :size="15" class="onb-wire-go" />
        </button>
      </div>
    </section>

    <!-- ───────────────── MODALS ───────────────── -->
    <ChecklistTemplateModal :open="tplModal" :initial="editingTpl" :saving="savingTpl"
      @close="tplModal = false" @save="saveTemplate" />
    <WelcomeKitModal :open="kitModal" :initial="editingKit" :saving="savingKit"
      @close="kitModal = false" @save="saveKit" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import {
  Rocket, Plus, Compass, ArrowUpRight, ListChecks, Gift, Layers, Lock, Network, Settings2,
  ChevronRight, CircleAlert, Loader2,
  Hash, BadgeCheck, BriefcaseBusiness, Workflow, BellRing, UserPlus, GraduationCap,
  FileText, Boxes, CalendarClock, ShieldCheck, Server, Users, Clock, ScanFace,
} from 'lucide-vue-next'

import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import LaunchSequence from '../components/LaunchSequence.vue'
import RecTaxonomyCard from '../components/RecTaxonomyCard.vue'
import OnbBlueprintCard from '../components/OnbBlueprintCard.vue'
import WelcomeKitCard from '../components/WelcomeKitCard.vue'
import ChecklistTemplateModal from '../components/ChecklistTemplateModal.vue'
import WelcomeKitModal from '../components/WelcomeKitModal.vue'

import { STAGES, CHECKLIST_CATEGORIES, VOCAB_GROUPS, VOCAB_VALUE_COUNT, toneColor } from '../composables/onboardingVocab'
import { fetchDashboardStats, fetchJourneyState } from '../../onboarding/composables/useOnboarding'

defineEmits(['go'])

const router = useRouter()
const toast = useToast()

const CT_BASE = `${API}/hr/onboarding/checklist-templates`
const WK_BASE = `${API}/hr/welcome-kit/templates`

// ── live data ──
const stats = ref({})
const journey = ref(null)
const journeyStages = computed(() => {
  const byKey = {}
  for (const s of (journey.value?.stages || [])) byKey[s.key] = s
  return STAGES.map(s => ({ ...s, count: byKey[s.key]?.count || 0 }))
})

const lenses = computed(() => [
  { key: 'prog', label: 'In progress',   value: stats.value.incomplete_onboarding || 0,     color: 'var(--set-orange)', icon: Rocket,        to: 'dashboard' },
  { key: 'today', label: 'Joining today', value: stats.value.today_joining || 0,             color: 'var(--set-gold)',   icon: CalendarClock, to: 'pending-joining' },
  { key: 'docs', label: 'Docs pending',   value: stats.value.pending_documents || 0,         color: 'var(--set-amber)',  icon: FileText,      to: 'documents' },
  { key: 'asset', label: 'Assets pending', value: stats.value.pending_asset_allocation || 0, color: 'var(--set-ember)',  icon: Boxes,         to: 'assets' },
  { key: 'train', label: 'Training due',  value: stats.value.training_pending || 0,          color: 'var(--set-rust)',   icon: GraduationCap, to: '/admin/hr/training/dashboard' },
  { key: 'prob', label: 'On probation',   value: stats.value.probation_employees || 0,       color: 'var(--set-ok)',     icon: ShieldCheck,   to: 'probation' },
])

const openModule = (key) => router.push(key.startsWith('/') ? key : `/admin/hr/onboarding/${key}`)

// ── checklist templates ──
const templates = ref([])
const loadingTpl = ref(false)
const lane = ref('all')
const fetchTemplates = async () => {
  loadingTpl.value = true
  try {
    const { data } = await axios.get(CT_BASE, { headers: authHeader() })
    templates.value = Array.isArray(data) ? data : (data?.items || [])
  } catch { templates.value = [] } finally { loadingTpl.value = false }
}
const sortedTemplates = computed(() => {
  const order = CHECKLIST_CATEGORIES.map(c => c.value)
  return [...templates.value].sort((a, b) =>
    (order.indexOf(a.category) - order.indexOf(b.category)) ||
    ((a.sort_order || 0) - (b.sort_order || 0)) ||
    (a.task_name || '').localeCompare(b.task_name || ''))
})
const shownTemplates = computed(() => lane.value === 'all' ? sortedTemplates.value : sortedTemplates.value.filter(t => t.category === lane.value))
const activeTemplateCount = computed(() => templates.value.filter(t => t.is_active !== false).length)
const countByCat = (c) => templates.value.filter(t => t.category === c).length

const tplModal = ref(false)
const editingTpl = ref(null)
const savingTpl = ref(false)
const newTemplate = () => { editingTpl.value = null; tplModal.value = true }
const editTemplate = (t) => { editingTpl.value = t; tplModal.value = true }
const saveTemplate = async (payload) => {
  savingTpl.value = true
  try {
    if (editingTpl.value) { await axios.patch(`${CT_BASE}/${editingTpl.value.id}`, payload, { headers: authHeader() }); toast.success('Template updated') }
    else { await axios.post(CT_BASE, payload, { headers: authHeader() }); toast.success('Template created') }
    await fetchTemplates()
    tplModal.value = false
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save template') } finally { savingTpl.value = false }
}
const toggleTemplate = async (t) => {
  try {
    await axios.patch(`${CT_BASE}/${t.id}`, { is_active: !(t.is_active !== false) }, { headers: authHeader() })
    toast.success(t.is_active !== false ? 'Template deactivated' : 'Template activated')
    await fetchTemplates()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to update template') }
}

// ── welcome kit templates ──
const kits = ref([])
const loadingKit = ref(false)
const fetchKits = async () => {
  loadingKit.value = true
  try {
    const { data } = await axios.get(WK_BASE, { headers: authHeader() })
    kits.value = Array.isArray(data) ? data : (data?.items || [])
  } catch { kits.value = [] } finally { loadingKit.value = false }
}
const kitModal = ref(false)
const editingKit = ref(null)
const savingKit = ref(false)
const newKit = () => { editingKit.value = null; kitModal.value = true }
const editKit = (k) => { editingKit.value = k; kitModal.value = true }
const saveKit = async (payload) => {
  savingKit.value = true
  try {
    if (editingKit.value) { await axios.patch(`${WK_BASE}/${editingKit.value.id}`, payload, { headers: authHeader() }); toast.success('Kit updated') }
    else { await axios.post(WK_BASE, payload, { headers: authHeader() }); toast.success('Kit created') }
    await fetchKits()
    kitModal.value = false
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save kit') } finally { savingKit.value = false }
}

// ── connectivity ──
const wiredSettings = [
  { slug: 'recruitment',        label: 'Recruitment',       icon: UserPlus,          desc: 'Accepted offers hand off into the joining tray' },
  { slug: 'numbering-series',   label: 'Numbering Series',  icon: Hash,              desc: 'Employee codes minted on joining' },
  { slug: 'employment-types',   label: 'Employment Types',  icon: BriefcaseBusiness, desc: 'The engagement model carried onto the new hire' },
  { slug: 'training',           label: 'Training Settings', icon: GraduationCap,     desc: 'Programs flagged new-joiner auto-assign at join + 14d' },
  { slug: 'approval-workflows', label: 'Approval Workflows', icon: Workflow,         desc: 'Joining sign-off is added per hire today', flagged: true },
  { slug: 'notification-rules', label: 'Notification Rules', icon: BellRing,         desc: 'Joining & document alert channels' },
]
const moduleSurfaces = [
  { to: 'checklist',            label: 'Checklist',          icon: ListChecks,    desc: 'Per-hire task tracking' },
  { to: 'documents',            label: 'Documents',          icon: FileText,      desc: 'Upload & verification' },
  { to: 'identity',             label: 'Identity',           icon: ScanFace,      desc: 'KYC & access issue' },
  { to: 'account-provisioning', label: 'Account provisioning', icon: Server,      desc: 'ERP / email / attendance' },
  { to: 'induction',            label: 'Induction',          icon: Users,         desc: 'Sessions & attendance' },
  { to: 'probation',            label: 'Probation',          icon: ShieldCheck,   desc: 'Confirmation tracking' },
]

onMounted(async () => {
  fetchTemplates()
  fetchKits()
  try { const [s, j] = await Promise.all([fetchDashboardStats(), fetchJourneyState()]); stats.value = s || {}; journey.value = j } catch { /* instrument falls back to zeros */ }
})
</script>

<style scoped>
.onb-set { display: flex; flex-direction: column; gap: 18px; }

/* lenses */
.onb-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.onb-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left;
  padding: 12px 13px 14px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border);
  transition: transform 0.25s var(--set-spring), border-color 0.25s; --acc: var(--set-gold); }
.onb-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.onb-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.onb-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.onb-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--set-text-muted); }
.onb-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--set-spring); }
.onb-lens:hover .onb-lens-bar { transform: scaleX(1); }
.onb-lens-go { position: absolute; top: 12px; right: 11px; color: var(--set-text-dim); opacity: 0; transform: translate(-3px, 3px); transition: all 0.25s var(--set-spring); }
.onb-lens:hover .onb-lens-go { opacity: 1; transform: none; color: var(--acc); }

/* blocks */
.onb-block { display: flex; flex-direction: column; gap: 14px; }
.onb-blockhead { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.onb-blockhead-l { display: flex; align-items: center; gap: 12px; }
.onb-blockhead-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--set-amber);
  background: color-mix(in srgb, var(--set-amber) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); }
.onb-blockhead-ic.ok { color: var(--set-ok); background: color-mix(in srgb, var(--set-ok) 13%, transparent); border-color: color-mix(in srgb, var(--set-ok) 26%, transparent); }
.onb-blockhead-l b { display: block; font-size: 15.5px; font-weight: 850; color: var(--set-text); }
.onb-blockhead-l span { font-size: 12px; color: var(--set-text-muted); }
.onb-blockhead-note { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--set-text-muted); padding: 5px 11px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.onb-blockhead-note :deep(svg) { color: var(--set-text-dim); }
.onb-mini-btn { padding: 8px 13px; font-size: 12.5px; }
.onb-mini-btn.ok { background: linear-gradient(135deg, var(--set-ok), #0d9488); box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--set-ok) 60%, transparent); }

.onb-filterbar { display: flex; flex-wrap: wrap; gap: 7px; }
.onb-filter { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); --c: var(--set-gold); }
.onb-filter:hover { color: var(--set-text-secondary); border-color: var(--set-border-strong); }
.onb-filter.on { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 34%, transparent); }
.onb-filter em { font-style: normal; font-weight: 800; opacity: 0.8; }

.onb-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 13px; }
.onb-kit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 13px; }
.onb-tax-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 13px; }

.onb-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 36px; color: var(--set-text-muted); font-size: 13px; }
.onb-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 40px 24px; border-radius: 18px;
  background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.onb-empty.mini { padding: 24px; }
.onb-empty.mini p { margin: 0; }
.onb-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--set-amber);
  background: color-mix(in srgb, var(--set-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); }
.onb-empty-ic.ok { color: var(--set-ok); background: color-mix(in srgb, var(--set-ok) 12%, transparent); border-color: color-mix(in srgb, var(--set-ok) 26%, transparent); }
.onb-empty b { font-size: 15px; font-weight: 800; color: var(--set-text); margin-top: 4px; }
.onb-empty p { margin: 0 0 6px; font-size: 12.5px; color: var(--set-text-muted); max-width: 44ch; line-height: 1.5; }

/* connectivity bus */
.onb-bus-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-muted); }
.onb-bus-label :deep(svg) { color: var(--set-amber); }
.onb-bus-label.up { margin-top: 4px; }
.onb-bus { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 11px; }
.onb-wire { display: flex; align-items: center; gap: 11px; cursor: pointer; text-align: left; padding: 13px 14px; border-radius: 14px;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: transform 0.25s var(--set-spring), border-color 0.25s; }
.onb-wire:hover { transform: translateY(-2px); border-color: var(--set-border-warm); }
.onb-wire.surface:hover { border-color: color-mix(in srgb, var(--set-amber) 40%, transparent); }
.onb-wire.flagged { border-style: dashed; }
.onb-wire-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.onb-wire.surface .onb-wire-ic { color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 12%, transparent); border-color: color-mix(in srgb, var(--set-amber) 24%, transparent); }
.onb-wire-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.onb-wire-txt b { font-size: 13px; font-weight: 750; color: var(--set-text); }
.onb-wire-txt span { font-size: 11px; color: var(--set-text-muted); line-height: 1.35; }
.onb-wire-flag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--set-partial); padding: 3px 7px; border-radius: 999px; background: var(--set-partial-soft); }
.onb-wire-go { color: var(--set-text-dim); flex-shrink: 0; transition: transform 0.25s var(--set-spring), color 0.25s; }
.onb-wire:hover .onb-wire-go { color: var(--set-amber); transform: translateX(3px); }

@media (max-width: 1080px) { .onb-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .onb-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .onb-lens:hover, .onb-wire:hover { transform: none; } }
</style>
