<template>
  <div class="mta">
    <!-- ════════ AUTHORIZATION BRIDGE HERO ════════ -->
    <Motion as="section" class="bridge trv-grain"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="br-aura" aria-hidden="true" />
      <span class="br-floor" aria-hidden="true" />
      <ShieldCheck class="br-ghost" :size="230" aria-hidden="true" />

      <div class="br-main">
        <div class="br-lead">
          <span class="br-eyebrow"><Gavel :size="12" /> Travel · Authorization Bridge</span>
          <h1 class="br-title">Clear your <span class="grad">squadron</span></h1>
          <p class="br-sub">Every trip your direct reports raise lands here on final approach. Authorize it and the chain advances to the next gate — hold or deny it and the traveller hears back with your reason.</p>
          <div class="br-cta">
            <span class="br-clock trv-mono"><Radio :size="13" /> BRIDGE · {{ clock }}</span>
            <button class="br-btn ghost" :disabled="loading" @click="load">
              <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
            </button>
            <Motion as="button" class="br-btn steel" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('go')">
              <Plane :size="14" /> My travel
            </Motion>
          </div>
        </div>

        <div class="br-scope">
          <GlideScope :items="queue" @focus="focusCard" />
        </div>
      </div>

      <!-- telemetry lenses -->
      <div class="br-lenses">
        <button v-for="l in lenses" :key="l.key" class="lens" :class="[{ on: lens === l.key }, l.tone]"
          :disabled="l.stat" @click="!l.stat && toggleLens(l.key)">
          <span class="lens-ico"><component :is="l.icon" :size="15" /></span>
          <span class="lens-body">
            <TrvCountUp class="lens-val" :value="l.value" :format="l.fmt" />
            <span class="lens-lbl">{{ l.label }}</span>
          </span>
          <span class="lens-bar" />
        </button>
      </div>
    </Motion>

    <!-- ════════ LOADING ════════ -->
    <div v-if="loading && !queue.length" class="mta-grid">
      <div v-for="n in 3" :key="n" class="mta-skel" />
    </div>

    <!-- ════════ CLEAR ════════ -->
    <TrvEmptyState v-else-if="!queue.length" :icon="ShieldCheck"
      title="Squadron cleared — runway's quiet"
      subtitle="No team travel is awaiting your authorization right now. New requests from your direct reports land here the moment they're submitted." />

    <!-- ════════ QUEUE ════════ -->
    <template v-else>
      <header class="mta-head">
        <span class="mta-h-title"><Gavel :size="15" /> On final approach <b>{{ visible.length }}</b></span>
        <span v-if="lens !== 'all'" class="mta-h-hint">
          {{ lensLabel }} · <button class="mta-clear" @click="lens = 'all'">show all</button>
        </span>
        <span v-else class="mta-h-hint">Authorize, hold or deny — your decision is the manager gate.</span>
      </header>

      <TransitionGroup v-if="visible.length" name="mta-card" tag="div" class="mta-grid">
        <TeamTravelStrip
          v-for="(r, i) in visible" :key="r.id" :id="`mta-${r.id}`"
          :req="r" :index="i" :busy="busyId === r.id || !!decidedById[r.id]"
          :decided="decidedById[r.id] || null"
          :class="{ flash: flashId === r.id }"
          @review="review" @approve="quickApprove" />
      </TransitionGroup>

      <p v-else class="mta-empty-filter">
        <Filter :size="13" /> No {{ lensLabel.toLowerCase() }} requests right now.
        <button class="mta-clear" @click="lens = 'all'">Clear filter</button>
      </p>
    </template>

    <!-- ════════ CLEARANCE CONTROL ════════ -->
    <TravelDecisionModal :open="showDecide" :request="active" :busy="busy"
      @close="showDecide = false" @decided="onDecided" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  ShieldCheck, Gavel, Radio, RefreshCw, Plane, Hourglass, Banknote, Flame, Layers, Filter,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import GlideScope from './GlideScope.vue'
import TeamTravelStrip from './TeamTravelStrip.vue'
import TravelDecisionModal from '../modals/TravelDecisionModal.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import {
  fmtCompactINR, errText,
  fetchMyApprovalQueue as fetchTravelApprovalQueue,
  managerDecide as travelManagerDecide,
} from '@/composables/useTravel'

const emit = defineEmits(['count', 'go'])
const toast = useToast()

const HIGH_VALUE = 50000

const queue = ref([])
const loading = ref(false)
const busy = ref(false)         // modal in-flight
const busyId = ref(null)        // quick-approve in-flight
const lens = ref('all')

const showDecide = ref(false)
const active = ref(null)
const flashId = ref(null)
const decidedById = reactive({})

// ── live bridge clock ──────────────────────────────────────────────────────
const clock = ref('')
let clockTimer = null
const tickClock = () => { clock.value = new Date().toLocaleTimeString('en-GB', { hour12: false }) }

// ── derived ──────────────────────────────────────────────────────────────────
const hoursOld = (r) => {
  const t = r.submitted_at || r.created_at
  if (!t) return 0
  const h = (Date.now() - new Date(t).getTime()) / 3.6e6
  return h > 0 ? h : 0
}
const isHigh = (r) => Number(r.est_total_cost || 0) >= HIGH_VALUE
const isUrgent = (r) => ['HIGH', 'URGENT'].includes(r.priority)
const isAging = (r) => hoursOld(r) >= 48

const pipelineValue = computed(() => queue.value.reduce((s, r) => s + Number(r.est_total_cost || 0), 0))

const lenses = computed(() => [
  { key: 'all', label: 'Awaiting you', icon: Gavel, tone: 'amber', value: queue.value.length },
  { key: 'aging', label: 'Aging > 48h', icon: Hourglass, tone: 'ember', value: queue.value.filter(isAging).length },
  { key: 'high', label: 'High value', icon: Banknote, tone: 'amber', value: queue.value.filter(isHigh).length },
  { key: 'urgent', label: 'Urgent', icon: Flame, tone: 'danger', value: queue.value.filter(isUrgent).length },
  { key: 'pipeline', label: 'Pipeline value', icon: Layers, tone: 'info', value: pipelineValue.value, fmt: fmtCompactINR, stat: true },
])
const lensLabel = computed(() => ({ aging: 'Aging > 48h', high: 'High value', urgent: 'Urgent' }[lens.value] || 'All'))
const toggleLens = (k) => { lens.value = lens.value === k ? 'all' : k }

const visible = computed(() => {
  switch (lens.value) {
    case 'aging': return queue.value.filter(isAging)
    case 'high': return queue.value.filter(isHigh)
    case 'urgent': return queue.value.filter(isUrgent)
    default: return queue.value
  }
})

// ── data ──────────────────────────────────────────────────────────────────────
const emitCount = () => emit('count', queue.value.length)
const load = async () => {
  loading.value = true
  try {
    queue.value = (await fetchTravelApprovalQueue({ limit: 100 })).items || []
    emitCount()
  } catch (e) { toast.error(errText(e, 'Failed to load travel approvals')) }
  finally { loading.value = false }
}

// ── decisions ──────────────────────────────────────────────────────────────────
const review = (r) => { active.value = r; showDecide.value = true }

const stampAndDrop = (id, decision) => {
  decidedById[id] = decision
  setTimeout(() => {
    queue.value = queue.value.filter((x) => x.id !== id)
    delete decidedById[id]
    emitCount()
  }, 1050)
}

const onDecided = async ({ decision, notes }) => {
  if (!active.value) return
  busy.value = true
  const r = active.value
  try {
    await travelManagerDecide(r.id, decision, notes)
    toast.success(decision === 'APPROVED'
      ? `Cleared — ${r.employee_name}'s trip advances down the chain.`
      : decision === 'REJECTED'
        ? `Denied — ${r.employee_name} will be notified.`
        : `Held — returned to ${r.employee_name} for changes.`)
    showDecide.value = false
    stampAndDrop(r.id, decision)
  } catch (e) { toast.error(errText(e, 'Failed to record decision')) }
  finally { busy.value = false }
}

const quickApprove = async (r) => {
  if (busyId.value || decidedById[r.id]) return
  busyId.value = r.id
  try {
    await travelManagerDecide(r.id, 'APPROVED', null)
    toast.success(`Cleared — ${r.employee_name}'s trip advances down the chain.`)
    stampAndDrop(r.id, 'APPROVED')
  } catch (e) { toast.error(errText(e, 'Failed to approve')) }
  finally { busyId.value = null }
}

// ── glidescope blip → scroll + flash the card ──────────────────────────────────
const focusCard = async (id) => {
  if (lens.value !== 'all' && !visible.value.some(r => r.id === id)) lens.value = 'all'
  flashId.value = id
  await nextTick()
  document.getElementById(`mta-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1600)
}

onMounted(() => { tickClock(); clockTimer = setInterval(tickClock, 1000); load() })
onBeforeUnmount(() => clearInterval(clockTimer))
</script>

<style scoped>
@import '@/styles/travel-theme.css';

.mta { display: flex; flex-direction: column; gap: 18px; }

/* ════════ HERO ════════ */
.bridge {
  position: relative; overflow: hidden; border-radius: 24px; padding: 26px 26px 20px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-shadow);
}
.br-aura {
  position: absolute; inset: -50% 30% 20% -15%; pointer-events: none;
  background: radial-gradient(60% 70% at 18% 0%, rgba(251, 191, 36, 0.18), transparent 70%);
  animation: trv-aura-drift 11s ease-in-out infinite;
}
.br-floor {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 46px 46px; -webkit-mask-image: linear-gradient(to bottom, black, transparent 75%); mask-image: linear-gradient(to bottom, black, transparent 75%);
}
.br-ghost { position: absolute; right: -46px; top: -36px; color: var(--trv-amber); opacity: 0.04; pointer-events: none; }

.br-main { position: relative; display: grid; grid-template-columns: 1fr clamp(280px, 32vw, 380px); gap: 26px; align-items: center; }
.br-lead { min-width: 0; }
.br-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.br-title { font-size: clamp(26px, 4vw, 40px); font-weight: 850; margin: 12px 0 6px; color: var(--trv-text); line-height: 1.04; }
.br-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.br-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0; max-width: 560px; line-height: 1.55; }
.br-cta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 18px; }
.br-clock { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); padding: 8px 13px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border-warm); }
.br-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.br-btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.br-btn.ghost:hover { color: var(--trv-text); }
.br-btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.br-btn:disabled { opacity: 0.6; cursor: default; }
.br-scope { min-width: 0; }

/* lenses */
.br-lenses { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 22px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--trv-panel); border: 1px solid var(--trv-border); transition: transform 0.25s var(--trv-spring), border-color 0.25s, background 0.25s; }
.lens:not(:disabled):hover { transform: translateY(-2px); border-color: var(--trv-border-strong); }
.lens:disabled { cursor: default; }
.lens-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--trv-text-muted); background: var(--trv-surface); border: 1px solid var(--trv-border); }
.lens-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.lens-val { font-size: 21px; font-weight: 850; color: var(--trv-text); line-height: 1; font-variant-numeric: tabular-nums; }
.lens-lbl { font-size: 10.5px; color: var(--trv-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); background: var(--trv-grad-hero); }
.lens.on { border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.lens.on .lens-bar { transform: scaleX(1); }
.lens.on .lens-ico { color: var(--trv-amber); background: var(--trv-amber-soft); border-color: var(--trv-amber-border); }
.lens.amber .lens-ico { color: var(--trv-amber); }
.lens.ember .lens-ico { color: var(--trv-ember); }
.lens.danger .lens-ico { color: var(--trv-st-rejected); }
.lens.info .lens-ico { color: var(--trv-amber-bright); }
.lens.on.ember .lens-bar { background: linear-gradient(90deg, var(--trv-ember), var(--trv-ember-deep)); }
.lens.on.danger .lens-bar { background: var(--trv-st-rejected); }

/* ════════ QUEUE ════════ */
.mta-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 0 2px; }
.mta-h-title { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--trv-text); }
.mta-h-title svg { color: var(--trv-amber); }
.mta-h-title b { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; font-size: 12px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.mta-h-hint { font-size: 12px; color: var(--trv-text-muted); }
.mta-clear { background: none; border: none; color: var(--trv-amber); font-weight: 700; cursor: pointer; font-size: 12px; padding: 0 2px; text-decoration: underline; }

.mta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px; }
.mta-skel { height: 250px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

.mta-empty-filter { display: inline-flex; align-items: center; gap: 7px; justify-content: center; font-size: 12.5px; color: var(--trv-text-dim); padding: 16px; border-radius: 14px; background: var(--trv-surface); border: 1px dashed var(--trv-border); }

/* card flash from glidescope click */
.flash :deep(.tts) { animation: mta-flash 1.6s var(--trv-ease); }
@keyframes mta-flash {
  0%, 100% { box-shadow: var(--trv-card-shadow); }
  20%, 60% { box-shadow: 0 0 0 2px var(--trv-amber), var(--trv-amber-glow); }
}

/* TransitionGroup leave/move (entrance owned by each card) */
.mta-card-leave-active { transition: opacity 0.5s var(--trv-ease), transform 0.5s var(--trv-ease); }
.mta-card-leave-to { opacity: 0; transform: scale(0.92) translateY(-12px); }
.mta-card-move { transition: transform 0.55s var(--trv-spring); }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .br-main { grid-template-columns: 1fr; }
  .br-scope { max-width: 420px; margin-inline: auto; width: 100%; }
  .br-lenses { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) { .br-lenses { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .br-aura, .flash :deep(.tts) { animation: none; }
  .mta-card-leave-active, .mta-card-move { transition: opacity 0.2s; }
}
</style>
