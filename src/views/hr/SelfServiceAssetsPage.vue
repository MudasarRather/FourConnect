<template>
  <div class="ssa">
    <span class="ssa-bg" aria-hidden="true"><span class="ssa-orb o1" /><span class="ssa-orb o2" /><span class="as-grain" /></span>

    <!-- ════ Hero ════ -->
    <Motion as="section" class="ssa-hero as-card beam" ref="heroEl"
      :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="ssa-mesh" aria-hidden="true"><i class="b b1" /><i class="b b2" /><i class="b b3" /></span>
      <span class="ssa-spot" aria-hidden="true"><i class="sweep s1" /><i class="sweep s2" /><i class="glint" /></span>
      <span v-if="!reduced" class="ssa-motes" aria-hidden="true"><i v-for="n in 10" :key="n" :style="moteStyle(n)" /></span>
      <span class="ssa-hero-aura" aria-hidden="true" />
      <div class="ssa-hero-lead">
        <span class="ssa-eyebrow"><Boxes :size="13" /> My Gear Locker</span>
        <h1 class="ssa-title">{{ greeting }}, <span class="ssa-name">{{ firstName }}</span></h1>
        <p class="ssa-sub">Everything issued to you — sign for receipt, flag damage, or request a return.</p>
        <div class="ssa-kpis">
          <button class="ssa-kpi" :class="{ on: quickFilter === '' }" @click="setQuick('')">
            <span class="ssa-kpi-val as-mono"><AssetCountUp :value="summary.held" /></span><span class="ssa-kpi-lab">In hand</span>
          </button>
          <button class="ssa-kpi" :class="{ on: quickFilter === 'pending' }" :data-warn="summary.pending_ack > 0" @click="setQuick('pending')">
            <span class="ssa-kpi-val as-mono"><AssetCountUp :value="summary.pending_ack" /></span><span class="ssa-kpi-lab">To sign</span>
          </button>
          <button class="ssa-kpi" :class="{ on: quickFilter === 'due' }" :data-danger="summary.needs_return > 0" @click="setQuick('due')">
            <span class="ssa-kpi-val as-mono"><AssetCountUp :value="summary.needs_return" /></span><span class="ssa-kpi-lab">Return due</span>
          </button>
        </div>
      </div>
      <div class="ssa-hero-ring">
        <SsCustodyRing :held="summary.held" :acked="ackedActive" :pending-ack="summary.pending_ack" />
      </div>
    </Motion>

    <!-- ════ Action banner ════ -->
    <Presence>
      <Motion v-if="!loading && !unlinked && needsAction" key="act" as="div" class="ssa-act"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }" :transition="{ duration: 0.4 }">
        <span class="ssa-act-ic"><AlertTriangle :size="17" /></span>
        <div class="ssa-act-text">
          <b>Action needed</b>
          <span>{{ actionLine }}</span>
        </div>
        <div class="ssa-act-cta">
          <button v-if="summary.pending_ack > 0" class="as-btn as-btn-primary mini" @click="setQuick('pending')"><CheckCheck :size="13" /> Review {{ summary.pending_ack }}</button>
          <button v-if="summary.needs_return > 0" class="as-btn as-btn-steel mini" @click="setQuick('due')"><Undo2 :size="13" /> {{ summary.needs_return }} overdue</button>
        </div>
      </Motion>
      <Motion v-else-if="!loading && !unlinked && summary.held > 0" key="clear" as="div" class="ssa-clear"
        :initial="reduced ? false : { opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.4 }">
        <ShieldCheck :size="14" /> You're all caught up — every asset is signed and on schedule.
      </Motion>
    </Presence>

    <!-- ════ Filter strip ════ -->
    <div v-if="!loading && !unlinked && (items.length || view !== 'active')" class="ssa-bar">
      <div class="ssa-seg">
        <button v-for="v in VIEWS" :key="v.k" class="ssa-seg-btn" :class="{ on: view === v.k }" @click="setView(v.k)">
          <component :is="v.icon" :size="13" /> {{ v.label }}
        </button>
      </div>
      <span v-if="quickFilter" class="ssa-active-filter">
        Showing {{ quickFilter === 'pending' ? 'unsigned' : 'return-due' }}
        <button @click="setQuick('')"><X :size="12" /></button>
      </span>
    </div>

    <!-- ════ States ════ -->
    <div v-if="loading" class="ssa-grid"><div v-for="n in 4" :key="n" class="as-skel" style="height:170px;border-radius:18px" /></div>

    <div v-else-if="unlinked" class="ssa-unlinked as-card">
      <Unlink :size="30" /><h3>No employee profile linked</h3>
      <p>Your account isn't linked to an employee record yet. Contact HR to see your assigned assets.</p>
    </div>

    <AssetEmptyState v-else-if="!visible.length" :icon="Boxes"
      :title="emptyTitle" :sub="emptySub">
      <button v-if="quickFilter || view !== 'active'" class="as-btn as-btn-ghost" @click="resetFilters"><Layers :size="14" /> Show all in hand</button>
    </AssetEmptyState>

    <div v-else class="ssa-grid" :key="gridKey">
      <SsHoldingCard v-for="(al, i) in visible" :key="al.id" :al="al" :index="i" :busy="busyId === al.id" :events="eventsFor(al.asset_id)"
        @ack="ack" @damage="openDamage" @return="openReturn" @cancel-return="cancelReturn" />
    </div>

    <!-- ════ Activity timeline ════ -->
    <SsActivityTimeline v-if="!unlinked" :events="events" :loading="loadingEvents" />

    <DamageReportModal :open="dmgOpen" :alloc="dmgTarget" @close="dmgOpen = false" @reported="onReported" />
    <SsReturnModal :open="retOpen" :alloc="retTarget" @close="retOpen = false" @requested="onReturnRequested" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Boxes, CheckCheck, Undo2, Unlink, AlertTriangle, ShieldCheck, Layers, X, PackageCheck } from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

import '@/styles/asset-theme.css'
import AssetEmptyState from './assets/components/AssetEmptyState.vue'
import AssetCountUp from './assets/components/AssetCountUp.vue'
import SsCustodyRing from './assets/components/SsCustodyRing.vue'
import SsHoldingCard from './assets/components/SsHoldingCard.vue'
import SsActivityTimeline from './assets/components/SsActivityTimeline.vue'
import DamageReportModal from './assets/modals/DamageReportModal.vue'
import SsReturnModal from './assets/modals/SsReturnModal.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import {
  fetchMyAssets, fetchMyAssetHistory, acknowledgeMyAllocation, cancelMyReturnRequest, errText,
} from '@/composables/useAssets'

const toast = useToast()
const reduced = prefersReduced()

const heroEl = ref(null)
usePointerSpotlight(heroEl)
const moteStyle = (n) => ({ left: `${(n * 16 + 7) % 90}%`, '--mdur': `${7 + (n % 4) * 1.8}s`, '--mdelay': `${n * 0.85}s`, '--msz': `${3 + (n % 3)}px` })

const loading = ref(true)
const loadingEvents = ref(true)
const unlinked = ref(false)
const items = ref([])
const events = ref([])
const summary = ref({ held: 0, pending_ack: 0, needs_return: 0 })
const busyId = ref('')
const view = ref('active')      // active | all | returned
const quickFilter = ref('')     // '' | pending | due
const gridKey = ref(0)
const today = new Date().toISOString().slice(0, 10)

const VIEWS = [
  { k: 'active', label: 'In hand', icon: Boxes },
  { k: 'all', label: 'All', icon: Layers },
  { k: 'returned', label: 'Returned', icon: PackageCheck },
]

const firstName = ref('there')
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})
const ackedActive = computed(() => Math.max(0, summary.value.held - summary.value.pending_ack))
const needsAction = computed(() => summary.value.pending_ack > 0 || summary.value.needs_return > 0)
const actionLine = computed(() => {
  const p = summary.value.pending_ack, r = summary.value.needs_return
  const parts = []
  if (p > 0) parts.push(`${p} asset${p > 1 ? 's' : ''} awaiting your sign-off`)
  if (r > 0) parts.push(`${r} return${r > 1 ? 's' : ''} overdue`)
  return parts.join(' · ')
})

const isOverdue = (al) => al.expected_return_date && al.expected_return_date < today && al.status === 'ALLOCATED'

const visible = computed(() => {
  let list = items.value
  if (view.value === 'returned') list = list.filter(a => a.status !== 'ALLOCATED')
  if (quickFilter.value === 'pending') list = list.filter(a => a.status === 'ALLOCATED' && !a.acknowledged_by_employee)
  else if (quickFilter.value === 'due') list = list.filter(isOverdue)
  return list
})
const emptyTitle = computed(() => {
  if (quickFilter.value === 'pending') return 'Nothing to sign'
  if (quickFilter.value === 'due') return 'No returns due'
  if (view.value === 'returned') return 'No returned assets'
  return 'No assets issued to you'
})
const emptySub = computed(() => {
  if (quickFilter.value || view.value === 'returned') return 'Nothing matches this filter right now.'
  return 'When HR allocates a laptop, phone or other equipment to you, it will appear here.'
})

const eventsFor = (assetId) => events.value.filter(e => e.asset_id === assetId)

function setQuick(q) { quickFilter.value = quickFilter.value === q ? '' : q; if (quickFilter.value && view.value === 'returned') view.value = 'active'; gridKey.value++ }
function setView(v) { if (view.value === v) return; view.value = v; quickFilter.value = ''; gridKey.value++ }
function resetFilters() { view.value = 'active'; quickFilter.value = ''; gridKey.value++ }

async function hydrateName() {
  try {
    const raw = localStorage.getItem('user')
    if (raw) { const u = JSON.parse(raw); if (u?.full_name) { firstName.value = u.full_name.split(' ')[0]; return } }
  } catch { /* ignore */ }
  try {
    const { data } = await axios.get(`${API}/auth/me`, { headers: authHeader() })
    if (data?.full_name) firstName.value = data.full_name.split(' ')[0]
  } catch { /* ignore */ }
}

async function reload() {
  loading.value = true
  try {
    const res = await fetchMyAssets({ include_returned: view.value !== 'active' })
    unlinked.value = !!res.unlinked
    items.value = res.items || []
    if (res.summary) summary.value = res.summary
    else summary.value = {
      held: items.value.filter(a => a.status === 'ALLOCATED').length,
      pending_ack: items.value.filter(a => a.status === 'ALLOCATED' && !a.acknowledged_by_employee).length,
      needs_return: items.value.filter(isOverdue).length,
    }
  } catch (e) { toast.error(errText(e, 'Failed to load your assets')) }
  finally { loading.value = false }
}
async function loadEvents() {
  loadingEvents.value = true
  try { events.value = await fetchMyAssetHistory({ limit: 80 }) || [] }
  catch { events.value = [] }
  finally { loadingEvents.value = false }
}

watch(view, reload)
onMounted(() => { hydrateName(); reload(); loadEvents() })

async function ack(al) {
  busyId.value = al.id
  try { await acknowledgeMyAllocation(al.id); toast.success('Receipt acknowledged'); await Promise.all([reload(), loadEvents()]) }
  catch (e) { toast.error(errText(e, 'Failed to acknowledge')) }
  finally { busyId.value = '' }
}
// ── return request (modal-driven) ──
const retOpen = ref(false)
const retTarget = ref(null)
const openReturn = (al) => { retTarget.value = al; retOpen.value = true }
const onReturnRequested = () => { reload(); loadEvents() }
async function cancelReturn(al) {
  busyId.value = al.id
  try {
    await cancelMyReturnRequest(al.id)
    toast.success('Return request withdrawn')
    await Promise.all([reload(), loadEvents()])
  } catch (e) { toast.error(errText(e, 'Failed to cancel request')) }
  finally { busyId.value = '' }
}

const dmgOpen = ref(false)
const dmgTarget = ref(null)
const openDamage = (al) => { dmgTarget.value = al; dmgOpen.value = true }
const onReported = () => { reload(); loadEvents() }
</script>

<style scoped>
.ssa { position: relative; min-height: 100%; padding: 18px 22px 60px; color: var(--as-text); background: var(--as-canvas); display: flex; flex-direction: column; gap: 16px; }
.ssa-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.ssa-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.4; }
.o1 { width: 380px; height: 380px; top: -120px; right: -60px; background: radial-gradient(circle, var(--as-bay-glow), transparent 70%); animation: ssa-drift 18s ease-in-out infinite alternate; }
.o2 { width: 300px; height: 300px; bottom: -100px; left: -40px; background: radial-gradient(circle, color-mix(in srgb, var(--as-amber) 18%, transparent), transparent 70%); animation: ssa-drift 22s ease-in-out infinite alternate-reverse; }
.ssa > * { position: relative; z-index: 1; }

/* hero */
@property --beam-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@property --aur-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.ssa-hero { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding: 28px 30px; border-radius: 24px;
  background:
    radial-gradient(120% 140% at 90% 8%, color-mix(in srgb, var(--as-ember) 14%, transparent), transparent 52%),
    radial-gradient(120% 130% at 4% 4%, color-mix(in srgb, var(--as-amber) 12%, transparent), transparent 50%),
    var(--as-surf-card);
  box-shadow: var(--as-card-shadow), 0 0 50px -32px color-mix(in srgb, var(--as-amber) 40%, transparent); }
.ssa-hero-aura { position: absolute; inset: -45% -10% auto -10%; height: 80%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.ssa-hero-lead, .ssa-hero-ring { position: relative; z-index: 2; }
.ssa-hero-lead { flex: 1; min-width: 260px; }

/* rotating border-beam tracing the card edge */
.beam::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 2px; pointer-events: none; z-index: 1;
  background: conic-gradient(from var(--beam-a),
    transparent 0deg, var(--as-amber) 30deg, var(--as-amber-bright) 50deg, var(--as-amber) 70deg, transparent 100deg,
    transparent 180deg, color-mix(in srgb, var(--as-ember) 90%, transparent) 215deg, transparent 250deg, transparent 360deg);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--as-amber) 70%, transparent));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
  animation: beam-spin 5s linear infinite; }
@keyframes beam-spin { to { --beam-a: 360deg; } }

/* big rotating aurora glow — the obvious moving light */
.ssa-aurora { position: absolute; inset: -40%; z-index: 0; pointer-events: none; filter: blur(38px); opacity: 0.55; transform-origin: center;
  background: conic-gradient(from var(--aur-a) at 70% 35%,
    transparent 0deg, color-mix(in srgb, var(--as-amber) 75%, transparent) 40deg, color-mix(in srgb, var(--as-ember) 70%, transparent) 90deg,
    transparent 150deg, transparent 220deg, color-mix(in srgb, var(--as-amber-strong) 60%, transparent) 280deg, transparent 330deg, transparent 360deg);
  -webkit-mask: radial-gradient(60% 60% at 70% 35%, #000 10%, transparent 75%); mask: radial-gradient(60% 60% at 70% 35%, #000 10%, transparent 75%);
  animation: aur-spin 14s linear infinite; }
@keyframes aur-spin { to { --aur-a: 360deg; } }
[data-theme="light"] .ssa-aurora { opacity: 0.42; }

/* drifting aurora mesh */
.ssa-mesh { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.ssa-mesh .b { position: absolute; border-radius: 50%; filter: blur(46px); opacity: 0.4; }
.ssa-mesh .b1 { width: 340px; height: 340px; top: -130px; left: 4%; background: radial-gradient(circle, color-mix(in srgb, var(--as-amber) 62%, transparent), transparent 70%); animation: mesh-a 15s ease-in-out infinite alternate; }
.ssa-mesh .b2 { width: 300px; height: 300px; bottom: -140px; right: 14%; background: radial-gradient(circle, color-mix(in srgb, var(--as-amber-strong) 56%, transparent), transparent 70%); animation: mesh-b 19s ease-in-out infinite alternate; }
.ssa-mesh .b3 { width: 260px; height: 260px; top: 10%; right: 2%; background: radial-gradient(circle, color-mix(in srgb, var(--as-ember) 58%, transparent), transparent 70%); animation: mesh-c 17s ease-in-out infinite alternate; }
[data-theme="light"] .ssa-mesh .b { opacity: 0.3; }
@keyframes mesh-a { to { transform: translate(70px, 48px) scale(1.18); } }
@keyframes mesh-b { to { transform: translate(-58px, -36px) scale(1.14); } }
@keyframes mesh-c { to { transform: translate(-48px, 56px) scale(1.22); } }

/* floating motes */
.ssa-motes { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.ssa-motes i { position: absolute; bottom: -8px; width: var(--msz); height: var(--msz); border-radius: 50%; background: color-mix(in srgb, var(--as-amber-bright) 90%, transparent);
  box-shadow: 0 0 8px 1px var(--as-amber); opacity: 0; animation: mote-rise var(--mdur) ease-in infinite; animation-delay: var(--mdelay); }
@keyframes mote-rise { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 16% { opacity: 0.95; } 84% { opacity: 0.7; } 100% { transform: translateY(-260px) scale(1); opacity: 0; } }

/* sheen sweep */
.ssa-sheen { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(105deg, transparent 34%, color-mix(in srgb, #fff 20%, transparent) 48%, transparent 60%); background-size: 250% 100%; animation: ssa-sheen-move 6.5s ease-in-out infinite; }
@keyframes ssa-sheen-move { 0% { background-position: 160% 0; } 58%, 100% { background-position: -45% 0; } }
[data-theme="light"] .ssa-sheen { background: linear-gradient(105deg, transparent 34%, color-mix(in srgb, #fff 50%, transparent) 48%, transparent 60%); background-size: 250% 100%; }

/* ════ Spotlight — high-contrast light beams scanning across the panel + cursor glint ════ */
.ssa-spot { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.ssa-spot .sweep { position: absolute; top: -28%; bottom: -28%; width: 34%; will-change: left; transform: skewX(-15deg);
  background: linear-gradient(95deg, transparent, color-mix(in srgb, var(--as-amber-bright) 80%, transparent) 50%, transparent);
  filter: blur(26px); mix-blend-mode: screen; }
.ssa-spot .s1 { opacity: 0.85; animation: sweep-a 5.5s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
.ssa-spot .s2 { width: 22%; opacity: 0.5; animation: sweep-b 8s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
.ssa-spot .glint { position: absolute; width: 340px; height: 340px; border-radius: 50%; filter: blur(46px); pointer-events: none;
  left: calc(var(--mx, 0.5) * 100%); top: calc(var(--my, 0.5) * 100%); transform: translate(-50%, -50%);
  opacity: calc(var(--spot, 0) * 0.75); transition: opacity 0.4s ease; mix-blend-mode: screen;
  background: radial-gradient(circle, color-mix(in srgb, var(--as-amber-bright) 60%, transparent), transparent 68%); }
@keyframes sweep-a { 0% { left: -40%; } 55%, 100% { left: 112%; } }
@keyframes sweep-b { 0% { left: 118%; } 55%, 100% { left: -40%; } }
/* on cream, screen-blend washes out — use a saturated ember beam on normal blend instead */
[data-theme="light"] .ssa-spot .sweep { mix-blend-mode: normal; filter: blur(30px);
  background: linear-gradient(95deg, transparent, color-mix(in srgb, var(--as-ember) 55%, transparent) 50%, transparent); }
[data-theme="light"] .ssa-spot .glint { mix-blend-mode: normal; background: radial-gradient(circle, color-mix(in srgb, var(--as-ember) 42%, transparent), transparent 68%); }
.ssa-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.ssa-title { margin: 14px 0 0; font-size: clamp(26px, 4vw, 38px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; }
.ssa-name { background: linear-gradient(100deg, var(--as-amber-strong) 0%, var(--as-amber-bright) 38%, color-mix(in srgb, var(--as-amber-bright) 50%, #fff) 50%, var(--as-amber-bright) 62%, var(--as-amber-strong) 100%);
  background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  animation: ssa-name-shimmer 5.5s ease-in-out infinite; }
@keyframes ssa-name-shimmer { 0%, 100% { background-position: 170% 0; } 50% { background-position: -30% 0; } }
.ssa-sub { margin: 8px 0 0; font-size: 13.5px; color: var(--as-text-muted); max-width: 440px; }
.ssa-kpis { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
.ssa-kpi { display: flex; flex-direction: column; gap: 2px; padding: 11px 18px; border-radius: 14px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: transform 0.22s var(--as-spring), border-color 0.22s, background 0.22s; }
.ssa-kpi:hover { transform: translateY(-3px); border-color: var(--as-border-strong); }
.ssa-kpi.on { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); background: color-mix(in srgb, var(--as-amber) 9%, transparent); }
.ssa-kpi[data-warn="true"] { border-color: color-mix(in srgb, var(--as-st-reserved) 32%, transparent); }
.ssa-kpi[data-danger="true"] { border-color: color-mix(in srgb, var(--as-al-lost) 32%, transparent); }
.ssa-kpi-val { font-size: 24px; font-weight: 850; color: var(--as-text); }
.ssa-kpi-lab { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }
.ssa-hero-ring { display: grid; place-items: center; }

/* action banner */
.ssa-act { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 16px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--as-st-reserved) 13%, var(--as-surface)), var(--as-surface));
  border: 1px solid color-mix(in srgb, var(--as-st-reserved) 32%, transparent); box-shadow: var(--as-card-shadow); }
.ssa-act-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--as-st-reserved); background: var(--as-st-reserved-soft); }
.ssa-act-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ssa-act-text b { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.ssa-act-text span { font-size: 12px; color: var(--as-text-muted); }
.ssa-act-cta { display: flex; gap: 8px; flex-wrap: wrap; }
.ssa-clear { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 14px; font-size: 12.5px; font-weight: 600; color: var(--as-st-available);
  background: var(--as-st-available-soft); border: 1px solid color-mix(in srgb, var(--as-st-available) 26%, transparent); width: fit-content; }

/* filter bar */
.ssa-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ssa-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 13px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ssa-seg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-muted); background: transparent; border: none; transition: color 0.2s, background 0.2s; }
.ssa-seg-btn:hover { color: var(--as-text); }
.ssa-seg-btn.on { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 12%, transparent); }
.ssa-active-filter { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--as-text-muted); padding: 6px 8px 6px 12px; border-radius: 999px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ssa-active-filter button { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); transition: color 0.2s, transform 0.2s; }
.ssa-active-filter button:hover { color: var(--as-text); transform: rotate(90deg); }

/* grid + states */
.ssa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.ssa-unlinked { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 48px 24px; color: var(--as-text-muted); }
.ssa-unlinked :deep(svg) { color: var(--as-st-reserved); }
.ssa-unlinked h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--as-text); }
.ssa-unlinked p { margin: 0; font-size: 13px; max-width: 340px; }

.as-btn.mini { padding: 7px 11px; font-size: 12px; }

@keyframes ssa-drift { from { transform: translate(0, 0); } to { transform: translate(40px, 24px); } }
@media (prefers-reduced-motion: reduce) {
  .ssa-orb, .beam::before, .ssa-mesh .b, .ssa-motes i, .ssa-name, .ssa-spot .sweep { animation: none !important; }
  .ssa-name { background-position: 50% 0; }
}
@media (max-width: 620px) { .ssa-hero { justify-content: center; } }
</style>
