<template>
  <div class="mp set-scope">
    <!-- ═══════════════ CONSOLE HERO ═══════════════ -->
    <SetSectionHead eyebrow="Modules · Performance" title="Merit &" accent="Increment" :icon="Coins"
      sub="The company rule that turns a performance rating into a salary hike — the score→hike% bands, the clamp window each band earns, and the org merit budget that bounds every appraisal increment.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="load"><RefreshCw :size="14" :class="{ 'set-spin': loading }" /> Refresh</button>
        <button class="set-btn set-btn-primary" @click="openNew"><Plus :size="15" /> New policy</button>
      </template>

      <template #lenses>
        <div class="mp-lenses">
          <button v-for="(l, i) in lenses" :key="l.key" class="mp-lens" type="button" :style="{ '--acc': l.color, '--i': i }"
            :class="{ alert: l.alert }" @click="l.action && l.action()">
            <span class="mp-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span v-if="l.text" class="mp-lens-val text">{{ l.text }}</span>
            <span v-else class="mp-lens-val"><SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" /></span>
            <span class="mp-lens-lab">{{ l.label }}</span>
            <span class="mp-lens-bar" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- ═══════════════ COMMAND GRID — the active policy's transfer curve ═══════════════ -->
    <div class="mp-command">
      <div class="mp-panel mp-curve-panel">
        <div class="mp-panel-head">
          <span class="mp-panel-title"><Activity :size="14" /> {{ heroPolicy ? heroPolicy.name : 'Built-in default policy' }}</span>
          <span v-if="heroPolicy?.is_default" class="mp-pill"><Star :size="10" /> Default</span>
          <span v-else-if="!heroPolicy" class="mp-pill ghost">fallback</span>
          <button v-if="heroPolicy" class="mp-edit-link" type="button" @click="openEdit(heroPolicy)">Edit <ChevronRight :size="13" /></button>
        </div>
        <MeritCurve :bands="heroBands" />
        <div class="mp-legend">
          <span v-for="(b, i) in heroSorted" :key="i" class="mp-leg" :style="{ '--c': legColor(b, i) }">
            <i /><b>{{ b.label }}</b><em>{{ rangeLabel(b) }}</em><LifeBuoy v-if="b.auto_pip" :size="10" class="mp-leg-pip" />
          </span>
        </div>
      </div>

      <div class="mp-side">
        <!-- budget gauge -->
        <div class="mp-panel mp-budget-panel">
          <div class="mp-panel-head"><span class="mp-panel-title"><Wallet :size="14" /> Merit budget</span></div>
          <div class="mp-gauge-wrap">
            <div class="mp-gauge" :style="{ '--mp-deg': budgetDeg + 'deg' }">
              <span class="mp-gauge-core">
                <b v-if="budgetPct != null"><SetCountUp :value="budgetPct" :decimals="budgetPct % 1 ? 1 : 0" suffix="%" /></b>
                <b v-else class="dim">∞</b>
                <span>{{ budgetPct != null ? 'of payroll' : 'uncapped' }}</span>
              </span>
            </div>
            <p class="mp-gauge-note">A guardrail, not a hard cap — HR sees the cycle's recommended hikes against this pool at approval time.</p>
          </div>
        </div>

        <!-- governance integrity -->
        <div class="mp-panel mp-integrity">
          <div class="mp-panel-head"><span class="mp-panel-title"><ShieldCheck :size="14" /> Policy integrity</span></div>
          <ul class="mp-checks">
            <li v-for="c in heroChecks" :key="c.key" :class="c.tone">
              <component :is="c.icon" :size="14" /><span>{{ c.text }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ═══════════════ WORKFLOW PIPELINE — rating → raise ═══════════════ -->
    <div class="mp-pipe">
      <div class="mp-pipe-head"><Workflow :size="14" /> From rating to raise <span class="mp-pipe-sub">the governed appraisal → pay pipeline this policy drives</span></div>
      <div class="mp-flow">
        <span class="mp-flow-track"><i class="mp-flow-pulse" /></span>
        <button v-for="(s, i) in pipeline" :key="s.k" class="mp-stn" :class="{ here: s.here, link: s.go || s.to }" type="button"
          :style="{ '--i': i }" @click="goStation(s)">
          <span class="mp-stn-node"><component :is="s.icon" :size="15" /></span>
          <b class="mp-stn-lab">{{ s.label }}</b>
          <span class="mp-stn-sub">{{ s.sub }}</span>
          <span v-if="s.here" class="mp-stn-here">you are here</span>
          <ArrowUpRight v-else-if="s.to" :size="12" class="mp-stn-go" />
          <ChevronRight v-else-if="s.go" :size="12" class="mp-stn-go" />
        </button>
      </div>
    </div>

    <!-- ═══════════════ ROSTER ═══════════════ -->
    <div v-if="loading" class="mp-load"><Loader2 :size="20" class="set-spin" /> Loading policies…</div>
    <div v-else-if="!policies.length" class="mp-empty">
      <span class="mp-empty-ic"><Coins :size="26" /></span>
      <b>No merit policy yet</b>
      <p>Create one to define how appraisal ratings convert into increments. Until then, a built-in default 5-band matrix is used.</p>
      <button class="set-btn set-btn-primary" @click="openNew"><Plus :size="15" /> Create the first policy</button>
    </div>
    <div v-else class="mp-roster">
      <div class="mp-roster-head"><Layers :size="14" /> Policies <span class="mp-roster-n">{{ policies.length }}</span></div>
      <div class="mp-grid">
        <div v-for="(p, i) in policies" :key="p.id" class="mp-card-shell" :style="{ '--i': i }">
          <article class="mp-card" :class="{ inactive: !p.is_active }" v-tilt="{ max: 5, scale: 1.02 }"
            :style="{ '--acc': cardAccent(p) }" @click="openEdit(p)">
            <span class="mp-card-glare" aria-hidden="true" />
            <span class="mp-card-spine" />
            <div class="mp-card-head">
              <div class="mp-card-id">
                <b>{{ p.name }}</b>
                <span class="mp-card-sub">{{ (p.bands || []).length }} bands · {{ p.merit_budget_pct != null ? p.merit_budget_pct + '% budget' : 'no budget cap' }}</span>
              </div>
              <div class="mp-card-flags">
                <span v-if="p.is_default" class="mp-pill"><Star :size="10" /> Default</span>
                <span class="mp-led" :class="p.is_active ? 'on' : 'off'" :title="p.is_active ? 'Active' : 'Inactive'" />
              </div>
            </div>
            <MeritCurve :bands="p.bands && p.bands.length ? p.bands : DEFAULT_MERIT_BANDS" compact />
            <div class="mp-card-foot">
              <span class="mp-card-chip"><TrendingUp :size="11" /> top {{ topHikeOf(p) }}%</span>
              <span v-if="!analyzeOf(p).full" class="mp-card-chip warn"><AlertTriangle :size="11" /> coverage gap</span>
              <span v-else class="mp-card-chip ok"><ShieldCheck :size="11" /> sound</span>
              <span class="mp-card-edit">Edit <ChevronRight :size="12" /></span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- ═══════════════ CONNECTIVITY BUS ═══════════════ -->
    <section class="mp-bus-block">
      <header class="mp-bus-head">
        <span class="mp-bus-ic"><Network :size="16" /></span>
        <div><b>Wired into governance</b><span>Where the rest of the appraisal → pay rule is shaped — and the surfaces it powers</span></div>
      </header>
      <div class="mp-bus-label"><Settings2 :size="12" /> Shaped with sibling settings</div>
      <div class="mp-bus">
        <button v-for="w in wiredSettings" :key="w.slug" class="mp-wire" :class="{ flagged: w.flagged }" type="button" @click="$emit('go', w.slug)">
          <span class="mp-wire-ic"><component :is="w.icon" :size="15" /></span>
          <div class="mp-wire-txt"><b>{{ w.label }}</b><span>{{ w.desc }}</span></div>
          <span v-if="w.flagged" class="mp-wire-flag"><CircleAlert :size="11" /> Direct</span>
          <ChevronRight :size="15" class="mp-wire-go" />
        </button>
      </div>
      <div class="mp-bus-label up"><Compass :size="12" /> Applied in these modules</div>
      <div class="mp-bus">
        <button v-for="s in moduleSurfaces" :key="s.to" class="mp-wire surface" type="button" @click="openModule(s.to)">
          <span class="mp-wire-ic"><component :is="s.icon" :size="15" /></span>
          <div class="mp-wire-txt"><b>{{ s.label }}</b><span>{{ s.desc }}</span></div>
          <ArrowUpRight :size="15" class="mp-wire-go" />
        </button>
      </div>
    </section>

    <!-- ═══════════════ EDITOR MODAL ═══════════════ -->
    <SetModal :open="editorOpen" :title="form.name || 'Merit policy'" :subtitle="form.id ? 'Editing policy' : 'New merit & increment policy'"
      :icon="Coins" :mode="form.id ? 'edit' : 'create'" :width="940" aside-placement="side" @close="closeEditor">
      <!-- MAIN -->
      <div class="mpm">
        <div class="mpm-preview">
          <span class="mpm-pv-lab"><Activity :size="11" /> Live transfer curve</span>
          <MeritCurve :bands="previewBands" />
        </div>

        <div class="mpm-grid">
          <label class="mpm-field span">
            <span>Policy name <i>*</i></span>
            <input v-model="form.name" type="text" maxlength="120" placeholder="FY 2026–27 Merit Plan" class="mpm-input" />
          </label>
          <label class="mpm-field span">
            <span>Description</span>
            <textarea v-model="form.description" rows="2" placeholder="When and to whom this policy applies." class="mpm-input" />
          </label>
          <div class="mpm-field">
            <span>Merit budget (% of payroll)</span>
            <div class="mpm-budget-row">
              <MpStepper v-model="budgetModel" :min="0" :max="100" :step="0.5" suffix="%" />
              <button class="set-chip" :class="{ on: budgetModel == null }" type="button" @click="toggleBudgetCap">
                <Infinity :size="12" /> {{ budgetModel == null ? 'Uncapped' : 'Set uncapped' }}
              </button>
            </div>
          </div>
          <div class="mpm-field">
            <span>Status</span>
            <div class="mpm-toggles">
              <button class="set-chip" :class="{ on: form.is_active }" type="button" :style="{ '--acc': 'var(--set-ok)' }" @click="form.is_active = !form.is_active"><Power :size="12" /> {{ form.is_active ? 'Active' : 'Inactive' }}</button>
              <button class="set-chip" :class="{ on: form.is_default }" type="button" @click="form.is_default = !form.is_default"><Star :size="12" /> Default for new cycles</button>
            </div>
          </div>
        </div>

        <!-- bands editor -->
        <div class="mpm-bands">
          <div class="mpm-bands-head">
            <span class="mpm-bands-title">Rating bands <i>score % of max → hike window</i></span>
            <div class="mpm-bands-tools">
              <button class="set-chip" type="button" @click="resetDefaults"><RotateCcw :size="12" /> Defaults</button>
              <button class="set-chip" type="button" @click="addBand"><Plus :size="12" /> Band</button>
            </div>
          </div>

          <Presence>
            <div class="mpm-band-list">
              <Motion v-for="(b, i) in form.bands" :key="b._k" as="div" class="mpm-band" :style="{ '--bc': rowColor(b, i) }"
                :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, x: -16 }"
                :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
                <span class="mpm-band-spine" />
                <div class="mpm-band-top">
                  <div class="mpm-band-tier">
                    <SetSelect :model-value="b._tier" :options="TIER_OPTIONS" :accent-color="rowColor(b, i)" placeholder="Tier" @update:model-value="(v) => setTier(b, v)" />
                  </div>
                  <input class="mpm-input mpm-band-label" v-model="b.label" type="text" maxlength="60" placeholder="Band name" />
                  <button class="mpm-band-pip" :class="{ on: b.auto_pip }" type="button" :title="b.auto_pip ? 'Auto-creates a PIP for this band' : 'Auto-create a PIP for this band'" @click="b.auto_pip = !b.auto_pip"><LifeBuoy :size="13" /></button>
                  <button class="mpm-band-rm" type="button" :disabled="form.bands.length <= 1" title="Remove band" @click="removeBand(i)"><Trash2 :size="13" /></button>
                </div>
                <div class="mpm-band-ranges">
                  <div class="mpm-rng-field">
                    <span class="mpm-rng-lab">Score %</span>
                    <div class="mpm-rng"><MpStepper v-model="b._fmin" :min="0" :max="100" :step="5" tiny @update:model-value="onScore(b)" /><i>–</i><MpStepper v-model="b._fmax" :min="0" :max="100" :step="5" tiny @update:model-value="onScore(b)" /></div>
                  </div>
                  <div class="mpm-rng-field">
                    <span class="mpm-rng-lab">Hike %</span>
                    <div class="mpm-rng"><MpStepper v-model="b.hike_min_pct" :min="0" :max="100" :step="1" tiny :accent="rowColor(b, i)" /><i>–</i><MpStepper v-model="b.hike_max_pct" :min="0" :max="100" :step="1" tiny :accent="rowColor(b, i)" /></div>
                  </div>
                </div>
              </Motion>
            </div>
          </Presence>

          <!-- validation hints -->
          <transition-group name="mpm-warn" tag="div" class="mpm-warns">
            <div v-for="w in editorWarnings" :key="w.key" class="mpm-warn" :class="w.tone">
              <component :is="w.icon" :size="13" /><span v-html="w.html" />
            </div>
          </transition-group>
        </div>
      </div>

      <!-- ASIDE — Policy Pass -->
      <template #aside>
        <div class="mpm-pass" :class="{ ready: canSave }">
          <div class="mpm-pass-top">
            <span class="mpm-pass-kind"><Coins :size="11" /> Merit policy</span>
            <span class="mpm-pass-stamp" :class="{ ready: canSave }">{{ canSave ? 'READY' : 'DRAFT' }}</span>
          </div>
          <div class="mpm-pass-name">{{ form.name || 'Untitled policy' }}</div>
          <div class="mpm-pass-state">
            <span class="mpm-pass-pill" :class="form.is_active ? 'ok' : 'off'"><Power :size="10" /> {{ form.is_active ? 'Active' : 'Inactive' }}</span>
            <span v-if="form.is_default" class="mpm-pass-pill gold"><Star :size="10" /> Default</span>
          </div>

          <div class="mpm-pass-gauge">
            <div class="mp-gauge sm" :style="{ '--mp-deg': editorBudgetDeg + 'deg' }">
              <span class="mp-gauge-core"><b v-if="budgetModel != null">{{ budgetModel }}%</b><b v-else class="dim">∞</b><span>budget</span></span>
            </div>
            <div class="mpm-pass-stat"><b>{{ form.bands.length }}</b><span>bands</span></div>
            <div class="mpm-pass-stat"><b>{{ editorTopHike }}%</b><span>top hike</span></div>
          </div>

          <div class="mpm-pass-checks">
            <span class="mpm-pass-checks-lab">Integrity</span>
            <ul class="mp-checks compact">
              <li v-for="c in editorChecks" :key="c.key" :class="c.tone"><component :is="c.icon" :size="13" /><span>{{ c.text }}</span></li>
            </ul>
          </div>

          <div class="mpm-pass-bands">
            <span class="mpm-pass-checks-lab">Band ladder · score → hike</span>
            <ul class="mpm-bl">
              <li v-for="b in passBands" :key="b.k" :style="{ '--bc': b.color }">
                <span class="mpm-bl-dot" aria-hidden="true" />
                <span class="mpm-bl-name">{{ b.label }}</span>
                <span class="mpm-bl-score set-mono">{{ b.score }}</span>
                <span class="mpm-bl-hike">{{ b.hike }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <button v-if="form.id" class="set-btn set-btn-ghost mp-del" type="button" @click="askDelete"><Trash2 :size="14" /> Delete</button>
        <div class="mp-foot-r">
          <button class="set-btn set-btn-ghost" type="button" @click="closeEditor">Cancel</button>
          <button class="set-btn set-btn-primary" :disabled="saving || !canSave" @click="save">
            <Loader2 v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" /> {{ form.id ? 'Save policy' : 'Create policy' }}
          </button>
        </div>
      </template>
    </SetModal>

    <!-- ═══════════════ DELETE MODAL ═══════════════ -->
    <SetModal :open="delOpen" :title="`Delete “${form.name}”?`" subtitle="Retire this merit policy" :icon="ShieldAlert"
      mode="delete" accent-color="var(--set-conflict)" :width="460" @close="delOpen = false">
      <div class="mp-del-body">
        <p>Reviews already launched keep their <b>snapshotted bands</b> — in-flight increments are unaffected. New cycles fall back to the default (or the built-in) policy.</p>
        <div v-if="form.is_default" class="mp-del-note"><AlertTriangle :size="13" /> This is the <b>default</b> policy — set another as default first, or new cycles use the built-in matrix.</div>
      </div>
      <template #footer>
        <button class="set-btn set-btn-ghost" type="button" @click="delOpen = false">Keep policy</button>
        <button class="set-btn mp-del-go" :disabled="saving" type="button" @click="doDelete"><Loader2 v-if="saving" :size="14" class="set-spin" /><Trash2 v-else :size="14" /> Delete policy</button>
      </template>
    </SetModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Coins, Plus, RefreshCw, Loader2, Star, Wallet, Check, Trash2, RotateCcw, Power, LifeBuoy,
  AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp, Layers, Target, BadgeCheck, ReceiptText,
  Percent, SlidersHorizontal, Network, Settings2, ChevronRight, ArrowUpRight, Compass, CircleAlert,
  Activity, Workflow, Infinity, CheckCircle2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import SetModal from '../components/SetModal.vue'
import SetSelect from '../components/SetSelect.vue'
import MeritCurve from '../components/MeritCurve.vue'
import MpStepper from '../components/MpStepper.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import {
  fetchMeritPolicies, createMeritPolicy, updateMeritPolicy, deleteMeritPolicy, DEFAULT_MERIT_BANDS,
} from '@/composables/usePerformance'
import {
  bandColor, analyzeBands, sortedBands, hikeRangeLabel,
  TIER_OPTIONS, TIER_DEFAULT_LABEL,
} from '../composables/meritBands'

const emit = defineEmits(['go'])
const router = useRouter()
const toast = useToast()
const reduced = prefersReduced()

const loading = ref(true)
const saving = ref(false)
const policies = ref([])

// ── derived: hero (default/active) policy ──
const heroPolicy = computed(() => policies.value.find(p => p.is_default && p.is_active) || policies.value.find(p => p.is_active) || policies.value[0] || null)
const heroBands = computed(() => heroPolicy.value?.bands?.length ? heroPolicy.value.bands : DEFAULT_MERIT_BANDS)
const heroSorted = computed(() => sortedBands(heroBands.value))
const heroAnalyze = computed(() => analyzeBands(heroBands.value))
const budgetPct = computed(() => heroPolicy.value?.merit_budget_pct != null ? Number(heroPolicy.value.merit_budget_pct) : null)
const budgetScale = computed(() => Math.max(20, budgetPct.value || 0))
const budgetDeg = computed(() => budgetPct.value != null ? Math.round(budgetPct.value / budgetScale.value * 360) : 0)

const legColor = (b, i) => bandColor(b, i)
const rangeLabel = (b) => hikeRangeLabel(b)
const topHikeOf = (p) => analyzeBands(p.bands?.length ? p.bands : DEFAULT_MERIT_BANDS).topHike
const analyzeOf = (p) => analyzeBands(p.bands?.length ? p.bands : DEFAULT_MERIT_BANDS)
const cardAccent = (p) => bandColor(sortedBands(p.bands?.length ? p.bands : DEFAULT_MERIT_BANDS)[0] || {}, 0)

// ── lenses ──
const lenses = computed(() => [
  { key: 'pol', label: 'Policies', value: policies.value.length, color: 'var(--set-gold)', icon: Coins },
  { key: 'act', label: 'Active', value: policies.value.filter(p => p.is_active).length, color: 'var(--set-ok)', icon: Power },
  { key: 'bands', label: 'Bands (default)', value: heroSorted.value.length, color: 'var(--set-amber)', icon: Layers },
  { key: 'top', label: 'Top hike', value: heroAnalyze.value.topHike, suffix: '%', color: 'var(--set-orange)', icon: TrendingUp },
  { key: 'bud', label: 'Merit budget', text: budgetPct.value != null ? budgetPct.value + '%' : '∞', color: 'var(--set-ember)', icon: Wallet },
  { key: 'int', label: 'Integrity', text: heroAnalyze.value.full ? 'Sound' : `${heroAnalyze.value.gaps.length + heroAnalyze.value.overlaps.length} issue${(heroAnalyze.value.gaps.length + heroAnalyze.value.overlaps.length) === 1 ? '' : 's'}`,
    color: heroAnalyze.value.full ? 'var(--set-ok)' : 'var(--set-conflict)', icon: heroAnalyze.value.full ? ShieldCheck : AlertTriangle, alert: !heroAnalyze.value.full, action: () => heroPolicy.value && openEdit(heroPolicy.value) },
])

// ── integrity checks (hero) ──
const buildChecks = (a, budget) => {
  const out = []
  if (a.full) out.push({ key: 'cov', tone: 'ok', icon: CheckCircle2, text: 'Full 0–100% score coverage, no overlaps' })
  else {
    if (a.gaps.length) out.push({ key: 'gap', tone: 'bad', icon: AlertTriangle, text: `${a.gaps.length} coverage gap${a.gaps.length === 1 ? '' : 's'} — ${a.gaps.map(g => `${Math.round(g.lo * 100)}–${Math.round(g.hi * 100)}%`).join(', ')} earns nothing` })
    if (a.overlaps.length) out.push({ key: 'ov', tone: 'warn', icon: AlertTriangle, text: `${a.overlaps.length} band overlap${a.overlaps.length === 1 ? '' : 's'} — a score could match two bands` })
  }
  if (a.invalidRange) out.push({ key: 'inv', tone: 'bad', icon: AlertTriangle, text: 'A band has hike min > max — fix before saving' })
  if (a.monotonicWarn) out.push({ key: 'mono', tone: 'warn', icon: AlertTriangle, text: 'A higher score earns a lower hike — non-monotonic ladder' })
  else if (!a.invalidRange) out.push({ key: 'mono-ok', tone: 'ok', icon: CheckCircle2, text: 'Hikes rise monotonically with score' })
  if (budget != null && a.topHike > budget) out.push({ key: 'bud', tone: 'warn', icon: Wallet, text: `Top hike ${a.topHike}% exceeds the ${budget}% budget — approvals will flag it` })
  else if (budget != null) out.push({ key: 'bud-ok', tone: 'ok', icon: CheckCircle2, text: `Top hike ${a.topHike}% fits the ${budget}% budget` })
  return out
}
const heroChecks = computed(() => buildChecks(heroAnalyze.value, budgetPct.value))

// ── workflow pipeline ──
const pipeline = [
  { k: 'score', label: 'Appraisal score', sub: 'Rubric & rating', icon: Target, go: 'appraisal-templates' },
  { k: 'band', label: 'Band match', sub: 'Score → tier', icon: SlidersHorizontal, here: true },
  { k: 'hike', label: 'Hike % clamped', sub: 'Bounded by band', icon: Percent, here: true },
  { k: 'budget', label: 'Budget check', sub: 'Org guardrail', icon: Wallet, here: true },
  { k: 'approve', label: 'HR approval', sub: 'Recommend → approve', icon: BadgeCheck, to: '/admin/hr/performance/merit' },
  { k: 'comp', label: 'Comp revision', sub: 'Idempotent raise', icon: Coins, to: '/admin/hr/payroll/dashboard' },
  { k: 'pay', label: 'Payroll run', sub: 'Next cycle pays it', icon: ReceiptText, to: '/admin/hr/payroll/payslips' },
]
const goStation = (s) => { if (s.go) emit('go', s.go); else if (s.to) router.push(s.to) }

// connectivity bus
const wiredSettings = [
  { slug: 'appraisal-templates', label: 'Appraisal Templates', icon: Target, desc: 'The rubric & rating scale that produces the score' },
  { slug: 'grades', label: 'Grades', icon: Layers, desc: 'Pay bands the hike % lifts a salary within' },
  { slug: 'approval-workflows', label: 'Approval Workflows', icon: Workflow, desc: 'Hike sign-off is a direct HR decision, not a chain', flagged: true },
  { slug: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, desc: 'Every policy change is sealed into the ledger' },
]
const moduleSurfaces = [
  { to: '/admin/hr/performance/merit', label: 'Merit & Increments', icon: BadgeCheck, desc: 'Recommend & approve appraisal hikes' },
  { to: '/admin/hr/payroll/dashboard', label: 'Payroll', icon: Wallet, desc: 'Where the approved increment is paid' },
]
const openModule = (to) => router.push(to)

async function load() {
  loading.value = true
  try { policies.value = await fetchMeritPolicies() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load policies') }
  finally { loading.value = false }
}
onMounted(load)

// ══════════════ EDITOR ══════════════
let _kSeq = 0
const editorOpen = ref(false)
const delOpen = ref(false)
const form = ref(blank())

function blank() {
  return { id: null, name: '', description: '', merit_budget_pct: 8, is_active: true, is_default: false, bands: hydrate(DEFAULT_MERIT_BANDS) }
}
function hydrate(bands) {
  return (bands || []).map(b => ({
    _k: ++_kSeq,
    _tier: b.key && TIER_DEFAULT_LABEL[b.key] ? b.key : 'CUSTOM',
    key: b.key || null, label: b.label, auto_pip: !!b.auto_pip,
    hike_min_pct: Number(b.hike_min_pct) || 0, hike_max_pct: Number(b.hike_max_pct) || 0,
    _fmin: Math.round(Number(b.frac_min) * 100), _fmax: Math.round((Number(b.frac_max) > 1 ? 1 : Number(b.frac_max)) * 100),
  }))
}
const budgetModel = computed({
  get: () => form.value.merit_budget_pct,
  set: (v) => { form.value.merit_budget_pct = v },
})
const toggleBudgetCap = () => { form.value.merit_budget_pct = form.value.merit_budget_pct == null ? 8 : null }

const onScore = (b) => { if (Number(b._fmax) < Number(b._fmin)) b._fmax = b._fmin }
const setTier = (b, v) => {
  b._tier = v
  b.key = v === 'CUSTOM' ? null : v
  if (v !== 'CUSTOM' && (!b.label || Object.values(TIER_DEFAULT_LABEL).includes(b.label))) b.label = TIER_DEFAULT_LABEL[v]
}
const rowColor = (b, i) => (b.key && bandColor(b)) || bandColor({}, i)

// preview bands (live) from editor form
const previewBands = computed(() => form.value.bands.map(b => ({
  key: b.key, label: b.label, auto_pip: b.auto_pip,
  frac_min: (Number(b._fmin) || 0) / 100, frac_max: (Number(b._fmax) || 0) / 100,
  hike_min_pct: Number(b.hike_min_pct) || 0, hike_max_pct: Number(b.hike_max_pct) || 0,
})))
const editorAnalyze = computed(() => analyzeBands(previewBands.value))
const editorTopHike = computed(() => editorAnalyze.value.topHike)
const editorBudgetDeg = computed(() => budgetModel.value != null ? Math.round(budgetModel.value / Math.max(20, budgetModel.value) * 360) : 0)
const editorChecks = computed(() => buildChecks(editorAnalyze.value, budgetModel.value != null ? Number(budgetModel.value) : null))
const editorWarnings = computed(() => editorChecks.value.filter(c => c.tone !== 'ok').map(c => ({ key: c.key, tone: c.tone, icon: c.icon, html: c.text })))

// live band ladder for the aside pass — high score → low, with resolved colour
const passBands = computed(() => form.value.bands
  .map((b, i) => {
    const lo = Number(b._fmin) || 0, hi = Number(b._fmax) || 0
    const hMin = Number(b.hike_min_pct) || 0, hMax = Number(b.hike_max_pct) || 0
    return {
      k: b._k, label: b.label || 'Band', color: rowColor(b, i),
      score: `${lo}–${hi}`, hike: hMin === hMax ? `${hMin}%` : `${hMin}–${hMax}%`, _lo: lo,
    }
  })
  .sort((a, b) => b._lo - a._lo))

const canSave = computed(() => !!form.value.name.trim() && form.value.bands.length > 0 && !editorAnalyze.value.invalidRange)

const openNew = () => { form.value = blank(); editorOpen.value = true }
const openEdit = (p) => {
  form.value = {
    id: p.id, name: p.name, description: p.description || '',
    merit_budget_pct: p.merit_budget_pct != null ? Number(p.merit_budget_pct) : null,
    is_active: p.is_active, is_default: p.is_default,
    bands: hydrate(p.bands?.length ? p.bands : DEFAULT_MERIT_BANDS),
  }
  editorOpen.value = true
}
const closeEditor = () => { editorOpen.value = false }
const addBand = () => form.value.bands.unshift({ _k: ++_kSeq, _tier: 'CUSTOM', key: null, label: 'New band', hike_min_pct: 0, hike_max_pct: 0, auto_pip: false, _fmin: 0, _fmax: 10 })
const removeBand = (i) => { if (form.value.bands.length > 1) form.value.bands.splice(i, 1) }
const resetDefaults = () => { form.value.bands = hydrate(DEFAULT_MERIT_BANDS) }

function payload() {
  return {
    name: form.value.name.trim(),
    description: form.value.description || null,
    merit_budget_pct: form.value.merit_budget_pct == null || form.value.merit_budget_pct === '' ? null : Number(form.value.merit_budget_pct),
    is_active: form.value.is_active,
    is_default: form.value.is_default,
    bands: form.value.bands.map(b => ({
      key: b.key || undefined, label: b.label, auto_pip: !!b.auto_pip,
      frac_min: (Number(b._fmin) || 0) / 100,
      // a band reaching 100% saves as 1.01 (inclusive) so a PERFECT score still
      // resolves — the backend top-band trick (band_for_score: frac < hi OR hi > 1).
      frac_max: Number(b._fmax) >= 100 ? 1.01 : (Number(b._fmax) || 0) / 100,
      hike_min_pct: Number(b.hike_min_pct) || 0, hike_max_pct: Number(b.hike_max_pct) || 0,
    })),
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  try {
    if (form.value.id) { await updateMeritPolicy(form.value.id, payload()); toast.success('Policy updated') }
    else { await createMeritPolicy(payload()); toast.success('Policy created') }
    editorOpen.value = false
    await load()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { saving.value = false }
}
const askDelete = () => { delOpen.value = true }
async function doDelete() {
  saving.value = true
  try { await deleteMeritPolicy(form.value.id); toast.success('Policy deleted'); delOpen.value = false; editorOpen.value = false; await load() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { saving.value = false }
}
</script>

<style scoped>
@property --mp-deg { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.mp { display: flex; flex-direction: column; gap: 16px; color: var(--set-text); }

/* ── lenses ── */
.mp-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.mp-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: transform 0.25s var(--set-spring), border-color 0.25s, box-shadow 0.3s; --acc: var(--set-gold);
  animation: mp-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.mp-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); box-shadow: 0 14px 30px -20px color-mix(in srgb, var(--acc) 55%, transparent); }
.mp-lens.alert { border-color: color-mix(in srgb, var(--set-conflict) 32%, transparent); }
.mp-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.mp-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.mp-lens-val.text { font-size: 16px; }
.mp-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--set-text-muted); }
.mp-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--set-spring); }
.mp-lens:hover .mp-lens-bar { transform: scaleX(1); }
@keyframes mp-deal { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* ── command grid ── */
.mp-command { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 14px; align-items: stretch; }
.mp-side { display: flex; flex-direction: column; gap: 14px; }
.mp-panel { padding: 16px 17px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); display: flex; flex-direction: column; gap: 12px; }
.mp-panel-head { display: flex; align-items: center; gap: 9px; }
.mp-panel-title { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-secondary); }
.mp-panel-title :deep(svg) { color: var(--set-gold); }
.mp-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.mp-pill.ghost { color: var(--set-text-dim); background: var(--set-panel); }
.mp-edit-link { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: none; border: none; cursor: pointer; transition: color 0.2s; }
.mp-edit-link:hover { color: var(--set-gold); }

.mp-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.mp-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--set-text-muted); }
.mp-leg i { width: 9px; height: 9px; border-radius: 3px; background: var(--c); flex-shrink: 0; }
.mp-leg b { font-weight: 650; color: var(--set-text-secondary); }
.mp-leg em { font-style: normal; font-weight: 850; color: var(--c); font-variant-numeric: tabular-nums; }
.mp-leg-pip { color: var(--set-conflict); }

/* budget gauge */
.mp-budget-panel { flex: 1; }
.mp-gauge-wrap { display: flex; align-items: center; gap: 14px; }
.mp-gauge { position: relative; width: 88px; height: 88px; flex-shrink: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--set-gold) var(--mp-deg, 0deg), var(--set-track, var(--set-border)) 0); transition: --mp-deg 1s var(--set-spring); }
.mp-gauge::after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: var(--set-surface); }
.mp-gauge.sm { width: 64px; height: 64px; }
.mp-gauge.sm::after { inset: 5px; background: var(--set-panel); }
.mp-gauge-core { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; }
.mp-gauge-core b { font-size: 19px; font-weight: 900; color: var(--set-text); font-variant-numeric: tabular-nums; }
.mp-gauge.sm .mp-gauge-core b { font-size: 14px; }
.mp-gauge-core b.dim { color: var(--set-text-muted); }
.mp-gauge-core span { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); margin-top: 2px; }
.mp-gauge-note { margin: 0; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }

/* integrity checks */
.mp-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.mp-checks li { display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.mp-checks.compact li { font-size: 10.5px; }
.mp-checks li :deep(svg) { flex-shrink: 0; margin-top: 1px; }
.mp-checks li.ok :deep(svg) { color: var(--set-ok); }
.mp-checks li.warn :deep(svg) { color: var(--set-amber); }
.mp-checks li.bad :deep(svg) { color: var(--set-conflict); }
.mp-checks li.bad span { color: var(--set-text); }

/* ── pipeline ── */
.mp-pipe { padding: 16px 17px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.mp-pipe-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-secondary); margin-bottom: 16px; }
.mp-pipe-head :deep(svg) { color: var(--set-gold); }
.mp-pipe-sub { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--set-text-dim); }
.mp-flow { position: relative; display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.mp-flow-track { position: absolute; left: 7%; right: 7%; top: 20px; height: 2px; border-radius: 999px; background: var(--set-border); overflow: hidden; }
.mp-flow-pulse { position: absolute; top: 0; left: 0; width: 22%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, transparent, var(--set-gold), transparent); animation: mp-travel 3.6s ease-in-out infinite; }
@keyframes mp-travel { 0% { transform: translateX(-120%); } 100% { transform: translateX(560%); } }
.mp-stn { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 2px; cursor: default; background: none; border: none; font: inherit; text-align: center;
  animation: mp-deal 0.5s var(--set-spring) both; animation-delay: calc(0.08s + var(--i) * 0.07s); }
.mp-stn.link { cursor: pointer; }
.mp-stn-node { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; color: var(--set-text-muted);
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: transform 0.22s var(--set-spring), border-color 0.22s, color 0.22s, box-shadow 0.25s; }
.mp-stn.here .mp-stn-node { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 50%, transparent); background: color-mix(in srgb, var(--set-gold) 12%, transparent); box-shadow: 0 0 18px -6px color-mix(in srgb, var(--set-gold) 70%, transparent); }
.mp-stn.link:hover .mp-stn-node { transform: translateY(-3px) scale(1.06); color: var(--set-text); border-color: var(--set-border-strong); }
.mp-stn-lab { font-size: 11px; font-weight: 750; color: var(--set-text-secondary); }
.mp-stn-sub { font-size: 9.5px; color: var(--set-text-dim); line-height: 1.3; }
.mp-stn-here { font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-gold); }
.mp-stn-go { color: var(--set-text-dim); transition: transform 0.2s, color 0.2s; }
.mp-stn.link:hover .mp-stn-go { color: var(--set-gold); transform: translate(2px, -2px); }

/* ── roster ── */
.mp-load { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 50px; color: var(--set-text-muted); font-size: 13px; }
.mp-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 50px 24px; border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.mp-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.mp-empty b { font-size: 16px; font-weight: 850; }
.mp-empty p { margin: 0; font-size: 12.5px; color: var(--set-text-muted); max-width: 44ch; line-height: 1.5; }
.mp-roster-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-secondary); margin-bottom: 12px; }
.mp-roster-head :deep(svg) { color: var(--set-gold); }
.mp-roster-n { font-size: 11px; font-weight: 850; color: var(--set-text); padding: 1px 8px; border-radius: 999px; background: var(--set-panel); }
.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.mp-card-shell { animation: mp-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.mp-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px 17px 14px; border-radius: 16px; cursor: pointer;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); transition: border-color 0.2s, box-shadow 0.25s; --acc: var(--set-gold); }
.mp-card:hover { border-color: color-mix(in srgb, var(--acc) 45%, transparent); box-shadow: 0 22px 44px -26px color-mix(in srgb, var(--acc) 60%, transparent); }
.mp-card.inactive { opacity: 0.6; }
.mp-card-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(130% 100% at 80% 0%, color-mix(in srgb, var(--acc) 16%, transparent), transparent 60%); transition: opacity 0.3s; }
.mp-card:hover .mp-card-glare { opacity: 1; }
.mp-card-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--acc); }
.mp-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding-left: 6px; }
.mp-card-id b { display: block; font-size: 14.5px; font-weight: 800; }
.mp-card-sub { font-size: 11px; color: var(--set-text-muted); }
.mp-card-flags { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.mp-led { width: 9px; height: 9px; border-radius: 50%; }
.mp-led.on { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }
.mp-led.off { background: var(--set-unset, var(--set-text-dim)); }
.mp-card-foot { display: flex; align-items: center; gap: 7px; padding-left: 6px; }
.mp-card-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 750; padding: 3px 8px; border-radius: 999px; color: var(--set-text-secondary); background: var(--set-panel); border: 1px solid var(--set-border); }
.mp-card-chip.ok { color: var(--set-ok); background: var(--set-ok-soft); border-color: transparent; }
.mp-card-chip.warn { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: transparent; }
.mp-card-edit { margin-left: auto; display: inline-flex; align-items: center; gap: 1px; font-size: 10.5px; font-weight: 700; color: var(--set-text-dim); transition: color 0.2s; }
.mp-card:hover .mp-card-edit { color: var(--acc); }

/* ── connectivity bus ── */
.mp-bus-block { padding: 16px 17px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.mp-bus-head { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; }
.mp-bus-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); flex-shrink: 0; }
.mp-bus-head b { display: block; font-size: 14px; font-weight: 800; }
.mp-bus-head span { font-size: 11.5px; color: var(--set-text-muted); }
.mp-bus-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 9px; }
.mp-bus-label.up { margin-top: 14px; }
.mp-bus { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 9px; }
.mp-wire { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.2s, transform 0.2s var(--set-spring), background 0.2s; }
.mp-wire:hover { border-color: var(--set-border-warm, color-mix(in srgb, var(--set-gold) 35%, transparent)); transform: translateY(-2px); background: var(--set-surface-elevated); }
.mp-wire.flagged { border-style: dashed; }
.mp-wire-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 22%, transparent); }
.mp-wire.surface .mp-wire-ic { color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 11%, transparent); border-color: color-mix(in srgb, var(--set-amber) 22%, transparent); }
.mp-wire-txt { flex: 1; min-width: 0; }
.mp-wire-txt b { display: block; font-size: 12.5px; font-weight: 750; }
.mp-wire-txt span { font-size: 10.5px; color: var(--set-text-muted); }
.mp-wire-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 13%, transparent); flex-shrink: 0; }
.mp-wire-go { color: var(--set-text-dim); flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
.mp-wire:hover .mp-wire-go { color: var(--set-gold); transform: translateX(2px); }
.mp-wire.surface:hover .mp-wire-go { transform: translate(2px, -2px); }

/* ══════════ MODAL ══════════ */
.mpm { display: flex; flex-direction: column; gap: 16px; }
.mpm-preview { padding: 12px 14px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.mpm-pv-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 8px; }
.mpm-pv-lab :deep(svg) { color: var(--set-gold); }
.mpm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.mpm-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mpm-field.span { grid-column: 1 / -1; }
.mpm-field > span { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.mpm-field > span i { color: var(--set-conflict); font-style: normal; }
.mpm-input { font: inherit; color: var(--set-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 10px 12px; font-size: 13px; transition: border-color 0.2s, box-shadow 0.2s; }
.mpm-input:focus { outline: none; border-color: color-mix(in srgb, var(--set-gold) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--set-gold) 12%, transparent); }
textarea.mpm-input { resize: vertical; min-height: 44px; }
.mpm-budget-row { display: flex; align-items: center; gap: 9px; }
.mpm-toggles { display: flex; gap: 8px; flex-wrap: wrap; }

.mpm-bands { display: flex; flex-direction: column; gap: 11px; }
.mpm-bands-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mpm-bands-title { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.mpm-bands-title i { color: var(--set-text-dim); font-style: normal; font-weight: 500; }
.mpm-bands-tools { display: flex; gap: 6px; }
.mpm-band-list { display: flex; flex-direction: column; gap: 9px; }
.mpm-band { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 11px 12px 11px 15px; border-radius: 13px; background: var(--set-panel); border: 1px solid var(--set-border); }
.mpm-band-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--bc); }
.mpm-band-top { display: flex; align-items: center; gap: 8px; }
.mpm-band-tier { width: 168px; flex-shrink: 0; }
.mpm-band-label { flex: 1; min-width: 80px; }
.mpm-band-pip, .mpm-band-rm { width: 34px; height: 38px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-muted); transition: all 0.18s; }
.mpm-band-pip.on { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); background: var(--set-conflict-soft); }
.mpm-band-rm:hover:not(:disabled) { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.mpm-band-rm:disabled { opacity: 0.4; cursor: not-allowed; }
.mpm-band-ranges { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mpm-rng-field { display: flex; flex-direction: column; gap: 5px; }
.mpm-rng-lab { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.mpm-rng { display: flex; align-items: center; gap: 6px; }
.mpm-rng i { color: var(--set-text-dim); font-style: normal; font-size: 12px; }

.mpm-warns { display: flex; flex-direction: column; gap: 7px; }
.mpm-warn { display: flex; align-items: flex-start; gap: 8px; padding: 9px 11px; border-radius: 11px; font-size: 11px; line-height: 1.45; }
.mpm-warn :deep(svg) { flex-shrink: 0; margin-top: 1px; }
.mpm-warn.warn { color: var(--set-text-secondary); background: color-mix(in srgb, var(--set-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); }
.mpm-warn.warn :deep(svg) { color: var(--set-amber); }
.mpm-warn.bad { color: var(--set-text); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.mpm-warn.bad :deep(svg) { color: var(--set-conflict); }
.mpm-warn-enter-active, .mpm-warn-leave-active { transition: opacity 0.3s, transform 0.3s var(--set-spring); }
.mpm-warn-enter-from, .mpm-warn-leave-to { opacity: 0; transform: translateY(-6px); }

/* aside — policy pass (sticky so it stays in view while the band list scrolls) */
.mpm-pass { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 2px; }
.mpm-pass-top { display: flex; align-items: center; justify-content: space-between; }
.mpm-pass-kind { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-gold); }
.mpm-pass-stamp { font-size: 9.5px; font-weight: 900; letter-spacing: 0.12em; padding: 3px 9px; border-radius: 6px; color: var(--set-text-dim); background: var(--set-panel); transition: all 0.4s; }
.mpm-pass-stamp.ready { color: #06281c; background: var(--set-ok); box-shadow: 0 0 16px -4px var(--set-ok); }
.mpm-pass-name { font-size: 15px; font-weight: 850; line-height: 1.25; }
.mpm-pass-state { display: flex; gap: 6px; flex-wrap: wrap; }
.mpm-pass-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
.mpm-pass-pill.ok { color: var(--set-ok); background: var(--set-ok-soft); }
.mpm-pass-pill.off { color: var(--set-text-dim); background: var(--set-panel); }
.mpm-pass-pill.gold { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.mpm-pass-gauge { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--set-border); border-bottom: 1px solid var(--set-border); }
.mpm-pass-stat { display: flex; flex-direction: column; }
.mpm-pass-stat b { font-size: 17px; font-weight: 900; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.mpm-pass-stat span { font-size: 9.5px; color: var(--set-text-muted); }
.mpm-pass-checks-lab { font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); display: block; margin-bottom: 8px; }

/* live band ladder — fills the pass panel with a per-band breakdown */
.mpm-pass-bands { padding-top: 12px; border-top: 1px solid var(--set-border); }
.mpm-bl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.mpm-bl li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 9px;
  padding: 7px 10px; border-radius: 10px; background: var(--set-surface); border: 1px solid var(--set-border);
  border-left: 2px solid var(--bc); transition: background 0.2s, border-color 0.2s; }
.mpm-bl li:hover { background: var(--set-surface-elevated); }
.mpm-bl-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bc); box-shadow: 0 0 7px color-mix(in srgb, var(--bc) 60%, transparent); }
.mpm-bl-name { font-size: 11px; font-weight: 650; color: var(--set-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mpm-bl-score { font-size: 10px; color: var(--set-text-dim); }
.mpm-bl-hike { font-size: 11.5px; font-weight: 850; color: var(--bc); font-variant-numeric: tabular-nums; }

/* footer / delete */
.mp-foot-r { display: flex; gap: 9px; margin-left: auto; }
.mp-del:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.mp-del-go { background: var(--set-conflict); color: #fff; border: none; }
.mp-del-go:hover { background: color-mix(in srgb, var(--set-conflict) 88%, #000); }
.mp-del-body p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.55; color: var(--set-text-muted); }
.mp-del-body p b { color: var(--set-text); }
.mp-del-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.45; color: var(--set-text-secondary); background: color-mix(in srgb, var(--set-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); }
.mp-del-note :deep(svg) { color: var(--set-amber); flex-shrink: 0; margin-top: 1px; }

@media (max-width: 1080px) { .mp-command { grid-template-columns: 1fr; } .mp-lenses { grid-template-columns: repeat(3, 1fr); } .mp-flow { grid-template-columns: repeat(4, 1fr); row-gap: 16px; } .mp-flow-track { display: none; } }
@media (max-width: 720px) { .mpm-grid, .mpm-band-ranges { grid-template-columns: 1fr; } .mpm-band-tier { width: 140px; } }
@media (max-width: 620px) { .mp-lenses { grid-template-columns: repeat(2, 1fr); } .mp-flow { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .mp-lens, .mp-stn, .mp-card-shell { animation: none; }
  .mp-lens:hover, .mp-stn.link:hover .mp-stn-node, .mp-wire:hover { transform: none; }
  .mp-flow-pulse { animation: none; }
}
</style>
