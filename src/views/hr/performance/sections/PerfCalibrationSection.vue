<template>
  <div class="pc-sec perf-scope">
    <PerfHero eyebrow="People · Calibration" title="Talent" accent="Field" :icon="Grid3x3"
      sub="Normalise ratings across managers and chart your people on the performance × potential talent field. Drag a star to recalibrate, override with the committee score, then seal each placement — calibration is the bridge from a review to a merit decision.">
      <template #actions>
        <div class="pc-cyc-wrap">
          <Telescope :size="13" class="pc-cyc-ic" />
          <select v-model="periodKey" class="pc-cyc" @change="onCycleChange">
            <option v-if="!cycles.length" :value="null">No completed cycles</option>
            <option v-for="(c, i) in cycles" :key="i" :value="i">{{ cycleMeta(c.cycle).label }}{{ c.period_label ? ' · ' + c.period_label : '' }}</option>
          </select>
        </div>
        <button class="perf-btn perf-btn-steel" type="button" :disabled="seeding || !current" @click="seed">
          <Loader2 v-if="seeding" :size="14" class="perf-spin" /><Sparkles v-else :size="14" /> Seed from reviews
        </button>
      </template>
      <template #lenses>
        <div class="pc-lenses">
          <component :is="l.box ? 'button' : 'div'" v-for="l in lenses" :key="l.key" class="pc-lens"
            :class="{ act: l.box, on: l.box && focusBox === l.box }" :style="{ '--acc': l.color }"
            :type="l.box ? 'button' : undefined" @click="l.box && focusQuadrant(l.box)">
            <span class="pc-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pc-lens-val"><SetCountUp :value="l.value" :decimals="0" /></span>
            <span class="pc-lens-lab">{{ l.label }}</span>
            <span class="pc-lens-bar" />
          </component>
        </div>
      </template>
    </PerfHero>

    <div v-if="loading" class="pc-loading"><Loader2 :size="20" class="perf-spin" /> Charting the talent field…</div>

    <div v-else-if="!grid.total" class="pc-empty">
      <span class="pc-empty-ic"><Grid3x3 :size="26" /></span>
      <b>{{ current ? 'Nothing on the field yet' : 'No completed reviews to calibrate' }}</b>
      <p v-if="current">Seed this cycle from its completed reviews to populate the talent field, then drag stars to recalibrate.</p>
      <p v-else>Complete some reviews first — calibration draws from finalised review scores.</p>
      <div class="pc-empty-acts">
        <button v-if="current" class="perf-btn perf-btn-primary" type="button" :disabled="seeding" @click="seed">
          <Loader2 v-if="seeding" :size="14" class="perf-spin" /><Sparkles v-else :size="14" /> Seed {{ cycleMeta(current.cycle).label }}
        </button>
        <button v-else class="perf-btn perf-btn-steel" type="button" @click="$emit('go', 'reviews')">
          <ClipboardCheck :size="14" /> Go to Reviews
        </button>
      </div>
    </div>

    <div v-else class="pc-command">
      <!-- ─── signature talent field ─── -->
      <div class="pc-grid-panel">
        <div class="pc-panel-head">
          <span class="pc-ph-l"><Grid3x3 :size="14" /> Talent field · {{ cycleMeta(current.cycle).label }}{{ current.period_label ? ' · ' + current.period_label : '' }}</span>
          <span class="pc-seal-tally" :class="{ done: grid.calibrated >= grid.total }">
            <BadgeCheck :size="12" /> {{ grid.calibrated }}/{{ grid.total }} sealed
            <span class="pc-seal-rail"><span class="pc-seal-fill" :style="{ width: (grid.total ? grid.calibrated / grid.total * 100 : 0) + '%' }" /></span>
          </span>
        </div>
        <CalibrationMatrix :cells="grid.cells" :selected-id="selected?.id" :focus-box="focusBox" :merit-for="meritForMember"
          @select="onSelect" @move="onMove" />
        <p class="pc-hint"><Move :size="11" /> Drag a star between cells to recalibrate · hover a star for its scouting readout · click to open the console.</p>
      </div>

      <!-- ─── side rail ─── -->
      <div class="pc-side">
        <!-- calibrate console -->
        <div class="pc-panel pc-member" :class="{ empty: !selected }">
          <div class="pc-panel-head"><UserCog :size="14" /> {{ selected ? 'Calibration console' : 'Select a star' }}</div>

          <transition name="pc-fade" mode="out-in">
            <div v-if="selected" :key="selected.id" class="pc-console">
              <!-- identity + live gauge -->
              <div class="pc-mem-id">
                <div class="pc-gauge" :style="{ '--perf-p': sideFrac * 360 + 'deg', '--g': scoreTone(sideScore, ratingMax) }">
                  <span class="pc-gauge-v">{{ fmtScore(sideScore) }}<i>/{{ ratingMax }}</i></span>
                </div>
                <div class="pc-mem-txt">
                  <b>{{ selected.employee_name }}</b>
                  <span>{{ selected.designation_name || selected.department_name || selected.employee_code || '—' }}</span>
                  <span class="pc-mem-box" :style="{ color: boxMeta(selected.box).color }">
                    <component :is="boxMeta(selected.box).icon" :size="12" /> {{ boxMeta(selected.box).label }}
                  </span>
                </div>
              </div>

              <!-- committee score override (closes the calibrated_score loophole) -->
              <div class="pc-committee">
                <div class="pc-committee-lab"><Scale :size="12" /> Committee score <small>override</small></div>
                <div class="pc-stepper">
                  <button type="button" :disabled="busy" @click="bumpCommittee(-0.5)"><Minus :size="13" /></button>
                  <span class="pc-stepper-v">{{ committeeDraft != null ? committeeDraft.toFixed(1) : fmtScore(selected.performance_score) }}</span>
                  <button type="button" :disabled="busy" @click="bumpCommittee(0.5)"><Plus :size="13" /></button>
                </div>
                <transition name="pc-fade">
                  <button v-if="hasOverride" class="pc-reset" type="button" @click="resetCommittee">
                    <RotateCcw :size="10" /> reset to review {{ fmtScore(selected.performance_score) }}
                  </button>
                </transition>
              </div>

              <!-- band selectors -->
              <div class="pc-axes">
                <div class="pc-mem-axis">
                  <label>Potential</label>
                  <div class="pc-band-btns">
                    <button v-for="q in [3, 2, 1]" :key="q" class="pc-band-btn" :class="{ on: selected.potential_band === q }" :disabled="busy" @click="setBand('potential', q)">{{ BAND_LABELS[q] }}</button>
                  </div>
                </div>
                <div class="pc-mem-axis">
                  <label>Performance</label>
                  <div class="pc-band-btns">
                    <button v-for="p in [1, 2, 3]" :key="p" class="pc-band-btn" :class="{ on: selected.performance_band === p }" :disabled="busy" @click="setBand('performance', p)">{{ BAND_LABELS[p] }}</button>
                  </div>
                </div>
              </div>

              <!-- the review → reward link, surfaced inline -->
              <button v-if="sideMerit" class="pc-merit" type="button" :style="{ '--c': sideMerit.color }" @click="$emit('go', 'merit')">
                <span class="pc-merit-ic"><Coins :size="13" /></span>
                <div class="pc-merit-tx">
                  <span class="pc-merit-lab">Implied merit band {{ usingDefaultBands ? '· default policy' : '' }}</span>
                  <b>{{ sideMerit.label }} · {{ sideMerit.hike }} hike</b>
                </div>
                <ArrowUpRight :size="13" class="pc-merit-go" />
              </button>

              <textarea v-model="noteDraft" class="pc-note" rows="2" placeholder="Committee rationale / calibration note…" @change="saveNote" />

              <div class="pc-mem-acts">
                <div class="pc-remove">
                  <transition name="pc-fade" mode="out-in">
                    <button v-if="!confirmRemove" key="rm" class="perf-btn pc-icon-btn" type="button" :disabled="busy" title="Remove from field" @click="confirmRemove = true"><Trash2 :size="13" /></button>
                    <div v-else key="cf" class="pc-confirm">
                      <span>Remove?</span>
                      <button class="pc-cf-yes" type="button" :disabled="busy" @click="doRemove"><Check :size="12" /></button>
                      <button class="pc-cf-no" type="button" @click="confirmRemove = false"><X :size="12" /></button>
                    </div>
                  </transition>
                </div>
                <span class="pc-grow" />
                <button class="perf-btn perf-btn-primary pc-seal" type="button" :disabled="busy || selected.status === 'CALIBRATED'" @click="onCalibrate">
                  <Loader2 v-if="busy === 'cal'" :size="13" class="perf-spin" /><BadgeCheck v-else :size="13" />
                  {{ selected.status === 'CALIBRATED' ? 'Sealed' : 'Seal calibration' }}
                </button>
              </div>
            </div>

            <div v-else key="hint" class="pc-mem-hint">
              <span class="pc-hint-ic"><Crosshair :size="22" /></span>
              <p>Click any star on the field to read its score, set potential, override with a committee score and seal the placement.</p>
            </div>
          </transition>
        </div>

        <!-- distribution ridge -->
        <div class="pc-panel">
          <div class="pc-panel-head"><BarChart3 :size="14" /> Score distribution</div>
          <div class="pc-ridge">
            <svg class="pc-ridge-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="pcRidgeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="color-mix(in srgb, var(--perf-gold) 30%, transparent)" />
                  <stop offset="100%" stop-color="transparent" />
                </linearGradient>
              </defs>
              <polygon :points="ridgeArea" fill="url(#pcRidgeFill)" class="pc-ridge-area" :class="{ on: ready }" />
              <polyline :points="ridgePts" fill="none" stroke="var(--perf-gold)" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round" class="pc-ridge-poly" :class="{ on: ready }" />
              <circle v-for="(t, i) in ridgeTops" :key="i" :cx="t.x" :cy="ready ? t.y : 96" :r="1.3" fill="var(--perf-gold-bright)" class="pc-ridge-dot" />
            </svg>
            <div class="pc-bell">
              <div v-for="(b, i) in grid.distribution" :key="b.band" class="pc-bell-col">
                <div class="pc-bell-bar" :style="{ height: ready ? Math.max(6, b.count / maxBand * 100) + '%' : '6%', background: bandColor(b.band), '--bd': (i * 0.08) + 's' }">
                  <span class="pc-bell-n">{{ b.count }}</span>
                </div>
                <span class="pc-bell-lab">{{ b.band }}</span>
              </div>
            </div>
          </div>
          <p class="pc-ridge-cap">Scores floored to 1–5 over committee / review values.</p>
        </div>
      </div>
    </div>

    <!-- ─── connectivity: from rubric to reward ─── -->
    <div v-if="grid.total || !loading" class="pc-flow">
      <div class="pc-flow-head"><GitBranch :size="13" /> From rubric to reward <small>calibration is the bridge — nothing here is a dead end</small></div>
      <div class="pc-flow-rail">
        <span class="pc-flow-track"><span class="pc-flow-pulse" /></span>
        <button v-for="(st, i) in flow" :key="st.key" class="pc-flow-stn" :class="{ here: st.here }" :style="{ '--si': i }" type="button" @click="st.go && st.go()">
          <span class="pc-flow-ic"><component :is="st.icon" :size="14" /></span>
          <b>{{ st.label }}</b>
          <span class="pc-flow-sub">{{ st.sub }}</span>
          <ChevronRight v-if="!st.here && i < flow.length - 1" :size="12" class="pc-flow-chev" />
          <span v-if="st.here" class="pc-flow-now">You are here</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Grid3x3, Loader2, Sparkles, BarChart3, UserCog, BadgeCheck, Trash2, Move, Crown, CircleDot, ShieldAlert,
  Scale, Coins, ArrowUpRight, GitBranch, ChevronRight, Crosshair, Telescope, ClipboardCheck,
  Minus, Plus, RotateCcw, Check, X, Layers, TrendingUp, Wallet,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import CalibrationMatrix from '../components/CalibrationMatrix.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import {
  fetchCalibrationCycles, fetchCalibrationGrid, seedCalibration, moveCalibration, markCalibrated, deleteCalibration,
  upsertCalibration, fetchMeritPolicies, boxMeta, BAND_LABELS, scoreTone, bandTone, DEFAULT_MERIT_BANDS,
} from '@/composables/usePerformance'
import { bandAtFrac, hikeRangeLabel } from '@/views/hr/settings/composables/meritBands'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const emit = defineEmits(['go'])
const router = useRouter()
const toast = useToast()

const cycles = ref([])
const periodKey = ref(null)
const grid = ref({ cells: [], total: 0, calibrated: 0, distribution: [] })
const loading = ref(false)
const seeding = ref(false)
const ready = ref(false)
const selected = ref(null)
const noteDraft = ref('')
const committeeDraft = ref(null)
const confirmRemove = ref(false)
const busy = ref(false)
const focusBox = ref(null)
const meritBands = ref(DEFAULT_MERIT_BANDS)
const usingDefaultBands = ref(true)
let focusT = null
let saveT = null

const current = computed(() => (periodKey.value != null ? cycles.value[periodKey.value] : null))
const allMembers = computed(() => grid.value.cells.flatMap(c => c.members))
const boxCount = (b) => (grid.value.cells.find(c => c.box === b)?.members.length) || 0
const lenses = computed(() => [
  { key: 'tot', label: 'On field', value: grid.value.total || 0, color: 'var(--perf-gold)', icon: Grid3x3 },
  { key: 'cal', label: 'Sealed', value: grid.value.calibrated || 0, color: 'var(--perf-ok)', icon: BadgeCheck },
  { key: 'star', label: 'Stars', value: boxCount(9), color: '#059669', icon: Crown, box: 9 },
  { key: 'core', label: 'Core', value: boxCount(5), color: '#f59e0b', icon: CircleDot, box: 5 },
  { key: 'risk', label: 'Risk', value: boxCount(1), color: 'var(--perf-conflict)', icon: ShieldAlert, box: 1 },
])
const maxBand = computed(() => Math.max(1, ...(grid.value.distribution || []).map(b => b.count)))
const bandColor = (b) => ['#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#059669'][b - 1] || 'var(--perf-gold)'

// distribution ridge geometry (5 bands, viewBox 0 0 100 100)
const ridgeTops = computed(() => (grid.value.distribution || []).map((b, i) => {
  const n = grid.value.distribution.length || 1
  const x = ((i + 0.5) / n) * 100
  const h = Math.max(6, b.count / maxBand.value * 100)
  return { x: +x.toFixed(2), y: +(100 - h).toFixed(2) }
}))
const ridgePts = computed(() => ridgeTops.value.map(t => `${t.x},${ready.value ? t.y : 96}`).join(' '))
const ridgeArea = computed(() => {
  if (!ridgeTops.value.length) return ''
  const pts = ridgeTops.value.map(t => `${t.x},${ready.value ? t.y : 96}`).join(' ')
  const first = ridgeTops.value[0].x, last = ridgeTops.value[ridgeTops.value.length - 1].x
  return `${first},100 ${pts} ${last},100`
})

const ratingMax = computed(() => selected.value?.rating_max || 5)
const scoreOf = (m) => (m.calibrated_score != null ? Number(m.calibrated_score) : (m.performance_score != null ? Number(m.performance_score) : null))
const sideScore = computed(() => {
  if (!selected.value) return null
  if (committeeDraft.value != null) return committeeDraft.value
  return selected.value.performance_score != null ? Number(selected.value.performance_score) : null
})
const sideFrac = computed(() => { const s = sideScore.value; return s == null ? 0 : Math.max(0, Math.min(1, s / ratingMax.value)) })
const hasOverride = computed(() => selected.value && committeeDraft.value != null && Number(committeeDraft.value) !== Number(selected.value.performance_score))

// resolve which merit band a score implies — the calibration → pay link
function meritForScore(score, max) {
  if (score == null || !max) return null
  const band = bandAtFrac(meritBands.value, score / max)
  if (!band) return null
  return { label: band.label, hike: hikeRangeLabel(band), color: bandTone(band.key) }
}
const meritForMember = (m) => meritForScore(scoreOf(m), m.rating_max || 5)
const sideMerit = computed(() => meritForScore(sideScore.value, ratingMax.value))

// connectivity stations
const flow = computed(() => [
  { key: 'rubric', label: 'Appraisal rubric', sub: 'Settings', icon: Layers, go: () => router.push('/admin/hr/settings/appraisal-templates') },
  { key: 'review', label: 'Review score', sub: 'Reviews tab', icon: ClipboardCheck, go: () => emit('go', 'reviews') },
  { key: 'calib', label: 'Calibration', sub: '9-box placement', icon: Grid3x3, here: true },
  { key: 'merit', label: 'Merit band', sub: 'Recommend hike', icon: TrendingUp, go: () => emit('go', 'merit') },
  { key: 'policy', label: 'Merit policy', sub: 'Settings', icon: Wallet, go: () => router.push('/admin/hr/settings/merit-policy') },
])

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const fmtScore = (s) => s != null ? Number(s).toFixed(1) : '—'

function focusQuadrant(box) {
  focusBox.value = box
  if (focusT) clearTimeout(focusT)
  focusT = setTimeout(() => { focusBox.value = null }, 1500)
}

async function loadMeritPolicy() {
  try {
    const d = await fetchMeritPolicies()
    const arr = Array.isArray(d) ? d : (d.items || d.policies || [])
    const active = arr.find(p => p.is_active !== false) || arr[0]
    if (active && Array.isArray(active.bands) && active.bands.length) { meritBands.value = active.bands; usingDefaultBands.value = false }
  } catch { /* fall back to DEFAULT_MERIT_BANDS */ }
}
async function loadCycles() {
  try { const d = await fetchCalibrationCycles(); cycles.value = d.items || []; if (cycles.value.length && periodKey.value == null) periodKey.value = 0 }
  catch { cycles.value = [] }
}
async function loadGrid() {
  if (!current.value) { grid.value = { cells: [], total: 0, calibrated: 0, distribution: [] }; return }
  loading.value = true; ready.value = false
  try {
    const params = { cycle: current.value.cycle }
    if (current.value.period_label) params.period_label = current.value.period_label
    grid.value = await fetchCalibrationGrid(params)
    if (selected.value) selected.value = allMembers.value.find(m => m.id === selected.value.id) || null
  } catch { grid.value = { cells: [], total: 0, calibrated: 0, distribution: [] } }
  finally { loading.value = false; requestAnimationFrame(() => { ready.value = true }) }
}
const onCycleChange = () => { selected.value = null; loadGrid() }

async function seed() {
  if (!current.value) return
  seeding.value = true
  try {
    const body = { cycle: current.value.cycle }
    if (current.value.period_label) body.period_label = current.value.period_label
    const res = await seedCalibration(body)
    toast.success(res.created ? `Seeded ${res.created} onto the field` : 'Field already up to date')
    await loadGrid()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Seed failed') }
  finally { seeding.value = false }
}

function onSelect(m) {
  selected.value = m
  noteDraft.value = m.note || ''
  committeeDraft.value = m.calibrated_score != null ? Number(m.calibrated_score) : null
  confirmRemove.value = false
}

async function onMove({ member, performance_band, potential_band }) {
  busy.value = true
  try {
    await moveCalibration(member.id, { performance_band, potential_band })
    await loadGrid()
    toast.success(`${member.employee_name} → ${boxMeta((potential_band - 1) * 3 + performance_band).label}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Move failed') }
  finally { busy.value = false }
}
async function setBand(axis, val) {
  if (!selected.value) return
  busy.value = true
  const perf = axis === 'performance' ? val : selected.value.performance_band
  const pot = axis === 'potential' ? val : selected.value.potential_band
  try {
    const u = await moveCalibration(selected.value.id, { performance_band: perf, potential_band: pot, note: noteDraft.value || undefined })
    selected.value = u; await loadGrid()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
  finally { busy.value = false }
}
async function saveNote() {
  if (!selected.value) return
  try {
    const u = await moveCalibration(selected.value.id, { performance_band: selected.value.performance_band, potential_band: selected.value.potential_band, note: noteDraft.value })
    selected.value = u
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save note') }
}

// committee score override → upsert (the only path that writes calibrated_score)
function bumpCommittee(d) {
  if (!selected.value) return
  const base = committeeDraft.value != null ? committeeDraft.value : (selected.value.performance_score != null ? Number(selected.value.performance_score) : 0)
  committeeDraft.value = Math.max(0, Math.min(ratingMax.value, +(base + d).toFixed(1)))
  scheduleCommitteeSave()
}
function resetCommittee() {
  if (!selected.value) return
  committeeDraft.value = selected.value.performance_score != null ? Number(selected.value.performance_score) : 0
  scheduleCommitteeSave()
}
function scheduleCommitteeSave() { if (saveT) clearTimeout(saveT); saveT = setTimeout(saveCommittee, 550) }
async function saveCommittee() {
  if (!selected.value || committeeDraft.value == null) return
  busy.value = true
  try {
    const u = await upsertCalibration({
      employee_id: selected.value.employee_id,
      review_id: selected.value.review_id || undefined,
      cycle: selected.value.cycle,
      period_label: selected.value.period_label || undefined,
      performance_band: selected.value.performance_band,
      potential_band: selected.value.potential_band,
      calibrated_score: committeeDraft.value,
      note: noteDraft.value || undefined,
    })
    selected.value = u
    committeeDraft.value = u.calibrated_score != null ? Number(u.calibrated_score) : committeeDraft.value
    await loadGrid()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not apply committee score') }
  finally { busy.value = false }
}

async function onCalibrate() {
  if (!selected.value) return
  busy.value = 'cal'
  try { const u = await markCalibrated(selected.value.id); selected.value = u; await loadGrid(); toast.success('Calibration sealed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { busy.value = false }
}
async function doRemove() {
  if (!selected.value) return
  busy.value = true
  try { await deleteCalibration(selected.value.id); confirmRemove.value = false; selected.value = null; await loadGrid(); toast.success('Removed from field') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Remove failed') }
  finally { busy.value = false }
}

watch(() => selected.value?.id, () => { confirmRemove.value = false })

onMounted(async () => { await Promise.all([loadCycles(), loadMeritPolicy()]); await loadGrid() })
</script>

<style scoped>
.pc-sec { display: flex; flex-direction: column; gap: 18px; }

/* hero actions */
.pc-cyc-wrap { position: relative; display: inline-flex; align-items: center; }
.pc-cyc-ic { position: absolute; left: 11px; color: var(--perf-gold); pointer-events: none; }
.pc-cyc { height: 38px; padding: 0 12px 0 32px; border-radius: 10px; font: inherit; font-size: 12.5px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); cursor: pointer; }

/* lenses */
.pc-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pc-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 12px 13px 14px; border-radius: 14px; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); --acc: var(--perf-gold); font: inherit; }
.pc-lens.act { cursor: pointer; transition: transform 0.18s var(--perf-spring), border-color 0.18s, box-shadow 0.25s; }
.pc-lens.act:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--acc) 45%, transparent); box-shadow: 0 14px 30px -22px color-mix(in srgb, var(--acc) 80%, transparent); }
.pc-lens.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acc) 30%, transparent); }
.pc-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pc-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pc-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pc-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--acc); opacity: 0.5; transition: opacity 0.2s; }
.pc-lens.on .pc-lens-bar { opacity: 1; box-shadow: 0 0 12px var(--acc); }

/* command grid */
.pc-command { display: grid; grid-template-columns: minmax(0, 1.62fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.pc-grid-panel, .pc-panel { padding: 16px 17px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pc-side { display: flex; flex-direction: column; gap: 14px; }
.pc-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 13px; }
.pc-ph-l { display: inline-flex; align-items: center; gap: 8px; }
.pc-panel-head :deep(svg) { color: var(--perf-gold); }
.pc-seal-tally { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 8px; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; text-transform: none; color: var(--perf-text-muted); background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pc-seal-tally.done { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); }
.pc-seal-tally :deep(svg) { color: inherit; }
.pc-seal-rail { width: 44px; height: 4px; border-radius: 3px; overflow: hidden; background: var(--perf-track); }
.pc-seal-fill { display: block; height: 100%; border-radius: 3px; background: var(--perf-grad-hero); transition: width 0.8s var(--perf-spring); }
.pc-seal-tally.done .pc-seal-fill { background: var(--perf-ok); }
.pc-hint { display: flex; align-items: center; gap: 5px; margin: 13px 0 0; font-size: 11px; color: var(--perf-text-dim); }
.pc-hint :deep(svg) { color: var(--perf-text-muted); }

/* calibrate console */
.pc-member.empty { opacity: 0.96; }
.pc-mem-id { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
.pc-gauge { position: relative; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0; transition: --perf-p 0.7s var(--perf-spring);
  background: conic-gradient(from -90deg, var(--g) var(--perf-p, 0deg), var(--perf-track) 0); }
.pc-gauge::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface); }
.pc-gauge-v { position: relative; font-size: 13px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pc-gauge-v i { font-size: 8px; font-style: normal; color: var(--perf-text-muted); }
.pc-mem-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pc-mem-txt b { font-size: 14px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-mem-txt > span { font-size: 11px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-mem-box { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; }

/* committee override */
.pc-committee { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 10px 11px; margin-bottom: 12px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pc-committee-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pc-committee-lab small { font-size: 9px; font-weight: 700; text-transform: none; letter-spacing: 0; color: var(--perf-text-dim); }
.pc-committee-lab :deep(svg) { color: var(--perf-amber); }
.pc-stepper { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; border-radius: 9px; background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }
.pc-stepper button { display: grid; place-items: center; width: 28px; height: 28px; border: none; background: none; color: var(--perf-text-secondary); cursor: pointer; border-radius: 8px; transition: background 0.16s, color 0.16s; }
.pc-stepper button:hover:not(:disabled) { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.pc-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
.pc-stepper-v { min-width: 36px; text-align: center; font-size: 14px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pc-reset { display: inline-flex; align-items: center; gap: 4px; width: 100%; justify-content: center; padding: 5px; border: none; background: none; font: inherit; font-size: 9.5px; font-weight: 650; color: var(--perf-amber); cursor: pointer; }

.pc-axes { display: flex; flex-direction: column; gap: 9px; margin-bottom: 12px; }
.pc-mem-axis { display: flex; align-items: center; gap: 10px; }
.pc-mem-axis label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); min-width: 78px; }
.pc-band-btns { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.pc-band-btn { padding: 7px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.16s var(--perf-spring); }
.pc-band-btn:hover:not(:disabled) { color: var(--perf-text); border-color: var(--perf-border-strong); transform: translateY(-1px); }
.pc-band-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-band-btn.on { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 6px 16px -8px rgba(251, 146, 60, 0.6); }

/* merit implication */
.pc-merit { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 12px; padding: 9px 11px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: color-mix(in srgb, var(--c) 9%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); transition: transform 0.18s var(--perf-spring), box-shadow 0.25s; }
.pc-merit:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -20px color-mix(in srgb, var(--c) 80%, transparent); }
.pc-merit-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
.pc-merit-tx { min-width: 0; flex: 1; }
.pc-merit-lab { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }
.pc-merit-tx b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.pc-merit-go { color: var(--c); flex-shrink: 0; }

.pc-note { width: 100%; resize: vertical; min-height: 48px; margin-bottom: 11px; padding: 9px 11px; border-radius: 10px; font: inherit; font-size: 12px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.pc-note:focus { outline: none; border-color: var(--perf-border-warm); }

.pc-mem-acts { display: flex; align-items: center; gap: 8px; }
.pc-grow { flex: 1; }
.pc-icon-btn { padding: 9px 11px; }
.pc-remove { display: flex; }
.pc-confirm { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 11px; font-size: 11px; font-weight: 700; color: var(--perf-conflict); background: var(--perf-conflict-soft); border: 1px solid color-mix(in srgb, var(--perf-conflict) 40%, transparent); }
.pc-cf-yes, .pc-cf-no { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: none; cursor: pointer; color: #fff; }
.pc-cf-yes { background: var(--perf-conflict); }
.pc-cf-no { background: var(--perf-unset); }
.pc-seal { box-shadow: 0 10px 26px -12px rgba(251, 146, 60, 0.55); }

.pc-mem-hint { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 18px 8px; }
.pc-hint-ic { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.pc-mem-hint p { margin: 0; font-size: 12px; color: var(--perf-text-muted); line-height: 1.55; max-width: 32ch; }

/* distribution ridge */
.pc-ridge { position: relative; height: 130px; }
.pc-ridge-line { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: visible; }
.pc-ridge-poly { stroke-dasharray: 220; stroke-dashoffset: 220; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--perf-gold) 50%, transparent)); transition: stroke-dashoffset 1.2s var(--perf-spring) 0.2s; }
.pc-ridge-poly.on { stroke-dashoffset: 0; }
.pc-ridge-area { opacity: 0; transition: opacity 0.9s ease 0.5s; }
.pc-ridge-area.on { opacity: 1; }
.pc-ridge-dot { transition: cy 0.9s var(--perf-spring); }
.pc-bell { position: relative; z-index: 0; display: flex; align-items: flex-end; gap: 8px; height: 130px; }
.pc-bell-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.pc-bell-bar { position: relative; width: 100%; border-radius: 6px 6px 0 0; transition: height 0.9s var(--perf-spring) var(--bd); min-height: 6px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2); }
.pc-bell-n { position: absolute; top: -17px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 850; color: var(--perf-text); }
.pc-bell-lab { font-size: 10px; font-weight: 700; color: var(--perf-text-muted); }
.pc-ridge-cap { margin: 9px 0 0; font-size: 10px; color: var(--perf-text-dim); }

/* connectivity ribbon */
.pc-flow { padding: 16px 18px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.pc-flow-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 16px; }
.pc-flow-head :deep(svg) { color: var(--perf-gold); }
.pc-flow-head small { font-size: 10.5px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--perf-text-dim); }
.pc-flow-rail { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pc-flow-track { position: absolute; top: 22px; left: 7%; right: 7%; height: 2px; border-radius: 2px; overflow: hidden; background: var(--perf-track); }
.pc-flow-pulse { position: absolute; top: 0; left: -40%; width: 40%; height: 100%; background: linear-gradient(90deg, transparent, var(--perf-gold), transparent); animation: pc-rail 3s linear infinite; }
@keyframes pc-rail { to { left: 110%; } }
.pc-flow-stn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border-radius: 13px; cursor: pointer; font: inherit; text-align: center;
  background: var(--perf-panel); border: 1px solid var(--perf-border); transition: transform 0.18s var(--perf-spring), border-color 0.18s, box-shadow 0.25s;
  opacity: 0; animation: pc-flow-in 0.5s var(--perf-spring) forwards; animation-delay: calc(var(--si) * 0.08s); }
@keyframes pc-flow-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.pc-flow-stn:hover { transform: translateY(-3px); border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.pc-flow-stn.here { border-color: color-mix(in srgb, var(--perf-gold) 50%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--perf-gold) 28%, transparent); cursor: default; }
.pc-flow-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pc-flow-stn.here .pc-flow-ic { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 18px -4px var(--perf-gold); }
.pc-flow-stn b { font-size: 11.5px; font-weight: 800; color: var(--perf-text); }
.pc-flow-sub { font-size: 9.5px; color: var(--perf-text-muted); }
.pc-flow-chev { position: absolute; top: 16px; right: -16px; color: var(--perf-text-dim); }
.pc-flow-now { font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-gold); }

/* states */
.pc-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 44px; color: var(--perf-text-muted); font-size: 13px; }
.pc-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pc-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pc-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pc-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.5; }
.pc-empty-acts { margin-top: 6px; }

/* transitions */
.pc-fade-enter-active, .pc-fade-leave-active { transition: opacity 0.22s, transform 0.22s var(--perf-spring); }
.pc-fade-enter-from { opacity: 0; transform: translateY(6px); }
.pc-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 1080px) { .pc-command { grid-template-columns: 1fr; } .pc-lenses { grid-template-columns: repeat(3, 1fr); } .pc-flow-rail { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 720px) { .pc-flow-rail { grid-template-columns: repeat(2, 1fr); } .pc-flow-track { display: none; } .pc-flow-chev { display: none; } }
@media (max-width: 620px) { .pc-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .pc-bell-bar, .pc-seal-fill, .pc-gauge, .pc-ridge-poly, .pc-ridge-area, .pc-ridge-dot { transition: none; }
  .pc-flow-pulse { animation: none; }
  .pc-flow-stn { animation: none; opacity: 1; }
  .pc-ridge-poly { stroke-dashoffset: 0; }
}
</style>
