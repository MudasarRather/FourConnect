<template>
  <div class="appr">
    <!-- ════════ CONTROL TOWER HERO ════════ -->
    <Motion as="section" class="tower trv-grain"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="tw-aura" aria-hidden="true" />
      <span class="tw-floor" aria-hidden="true" />
      <RadioTower class="tw-ghost" :size="220" aria-hidden="true" />

      <div class="tw-main">
        <div class="tw-lead">
          <span class="tw-eyebrow"><RadioTower :size="12" /> Travel · Control Tower</span>
          <h1 class="tw-title">Approach <span class="grad">Control</span></h1>
          <p class="tw-sub">Sequence every inbound request from holding pattern to cleared for takeoff — and clear any stuck on a manager's desk before they ever slip the net.</p>
          <div class="tw-cta">
            <span class="tw-clock trv-mono"><Signal :size="13" /> TWR&nbsp;·&nbsp;{{ clock }}</span>
            <button class="tw-btn ghost" @click="load" :disabled="loading">
              <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
            </button>
            <Motion as="button" class="tw-btn steel" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'requests')">
              <Plane :size="14" /> All requests
            </Motion>
          </div>
        </div>

        <div class="tw-scope">
          <TowerScope :items="allPending" :mine-ids="mineIdsSet" @focus="focusBlip" />
        </div>
      </div>

      <!-- telemetry lenses -->
      <div class="tw-lenses">
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
    <div v-if="loading && !allPending.length" class="grid">
      <div v-for="n in 4" :key="n" class="skel" />
    </div>

    <!-- ════════ RUNWAY CLEAR ════════ -->
    <TrvEmptyState v-else-if="!allPending.length" :icon="ShieldCheck" title="Runway clear"
      subtitle="No travel requests are awaiting a decision anywhere in the chain right now." />

    <!-- ════════ SQUADRONS ════════ -->
    <template v-else>
      <!-- cleared for you -->
      <section v-if="visMine.length || lens === 'mine' || lens === 'all'" class="squad">
        <header class="sq-head">
          <span class="sq-title"><Gavel :size="15" /> Cleared for your decision <b>{{ visMine.length }}</b></span>
          <span class="sq-hint">Act now — these gates are yours.</span>
        </header>
        <div v-if="visMine.length" class="grid">
          <InboundStrip v-for="(r, i) in visMine" :key="r.id" :id="`strip-${r.id}`" :req="r" mine :index="i"
            :class="{ flash: flashId === r.id }"
            @detail="openDetail" @decide="review" @escalate="askEscalate" />
        </div>
        <p v-else class="sq-empty"><Hourglass :size="13" /> Nothing waiting on you in this view.</p>
      </section>

      <!-- in the chain -->
      <section v-if="visOthers.length || lens === 'others'" class="squad">
        <header class="sq-head">
          <span class="sq-title steel"><Users :size="15" /> In the approval chain <b>{{ visOthers.length }}</b></span>
          <span class="sq-hint">Held by a line manager — override to advance the gate.</span>
        </header>
        <div v-if="visOthers.length" class="grid">
          <InboundStrip v-for="(r, i) in visOthers" :key="r.id" :id="`strip-${r.id}`" :req="r" :index="i"
            :class="{ flash: flashId === r.id }"
            @detail="openDetail" @escalate="askEscalate" />
        </div>
        <p v-else class="sq-empty"><Users :size="13" /> No requests held elsewhere in this view.</p>
      </section>

      <!-- filter matched nothing -->
      <p v-if="!visMine.length && !visOthers.length && (lens === 'high' || lens === 'urgent')" class="sq-empty centered">
        <Filter :size="13" /> No {{ lens === 'high' ? 'high-value' : 'urgent' }} requests are pending right now.
        <button class="link-btn" @click="lens = 'all'">Clear filter</button>
      </p>
    </template>

    <!-- modals / drawer -->
    <TravelDecisionModal :open="showDecide" :request="active" :busy="busy" @close="showDecide = false" @decided="onDecided" />
    <EscalateModal :open="showEsc" :request="active" :busy="busy" @close="showEsc = false" @confirm="onEscalate" />
    <TravelDetailDrawer :open="showDetail" :request-id="detailId" @close="showDetail = false" @changed="load" @go="$emit('go', $event)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  RadioTower, Signal, RefreshCw, Plane, ShieldCheck, Gavel, Users, Hourglass,
  Flame, Banknote, Layers, Filter,
} from 'lucide-vue-next'
import TowerScope from '../components/TowerScope.vue'
import InboundStrip from '../components/InboundStrip.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import TravelDecisionModal from '../modals/TravelDecisionModal.vue'
import EscalateModal from '../modals/EscalateModal.vue'
import TravelDetailDrawer from '../components/TravelDetailDrawer.vue'
import { useToast } from 'vue-toastification'
import {
  fmtCompactINR, errText, fetchQueue, decideRequest, escalateRequest, useTravelRequests,
} from '@/composables/useTravel'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const HIGH_VALUE = 50000

const mineItems = ref([])
const { items: allPending, fetchList: fetchPending } = useTravelRequests({ status: 'PENDING_APPROVAL', limit: 100 })
const loading = ref(false)
const busy = ref(false)
const lens = ref('all')

const showDecide = ref(false)
const showEsc = ref(false)
const showDetail = ref(false)
const active = ref(null)
const detailId = ref(null)
const flashId = ref(null)

// ── live tower clock ──────────────────────────────────────────────────────
const clock = ref('')
let clockTimer = null
const tickClock = () => { clock.value = new Date().toLocaleTimeString('en-GB', { hour12: false }) }

// ── derived sets ──────────────────────────────────────────────────────────
const mineIdsSet = computed(() => new Set(mineItems.value.map(r => r.id)))
const mine = computed(() => allPending.value.filter(r => mineIdsSet.value.has(r.id)))
const others = computed(() => allPending.value.filter(r => !mineIdsSet.value.has(r.id)))

const isHigh = (r) => Number(r.est_total_cost || 0) >= HIGH_VALUE
const isUrgent = (r) => ['HIGH', 'URGENT'].includes(r.priority)

const passesLens = (r) => {
  if (lens.value === 'high') return isHigh(r)
  if (lens.value === 'urgent') return isUrgent(r)
  return true
}
const visMine = computed(() => {
  if (lens.value === 'others') return []
  return mine.value.filter(passesLens)
})
const visOthers = computed(() => {
  if (lens.value === 'mine') return []
  return others.value.filter(passesLens)
})

const pipelineValue = computed(() => allPending.value.reduce((s, r) => s + Number(r.est_total_cost || 0), 0))

const lenses = computed(() => [
  { key: 'mine', label: 'Awaiting you', icon: Gavel, tone: 'amber', value: mine.value.length },
  { key: 'others', label: 'In the chain', icon: Users, tone: 'steel', value: others.value.length },
  { key: 'high', label: 'High value', icon: Banknote, tone: 'ember', value: allPending.value.filter(isHigh).length },
  { key: 'urgent', label: 'Urgent', icon: Flame, tone: 'danger', value: allPending.value.filter(isUrgent).length },
  { key: 'pipeline', label: 'Pipeline value', icon: Layers, tone: 'info', value: pipelineValue.value, fmt: fmtCompactINR, stat: true },
])

const toggleLens = (k) => { lens.value = lens.value === k ? 'all' : k }

// ── data ──────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  try {
    const [q] = await Promise.all([fetchQueue({ limit: 100 }), fetchPending()])
    mineItems.value = q.items || []
  } catch (e) { toast.error(errText(e, 'Failed to load approval queue')) }
  finally { loading.value = false }
}

// ── interactions ──────────────────────────────────────────────────────────
const review = (r) => { active.value = r; showDecide.value = true }
const askEscalate = (r) => { active.value = r; showEsc.value = true }
const openDetail = (r) => { detailId.value = r.id; showDetail.value = true }

const focusBlip = async (id) => {
  flashId.value = id
  await nextTick()
  const el = document.getElementById(`strip-${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1600)
}

const onDecided = async ({ decision, notes }) => {
  busy.value = true
  try {
    await decideRequest(active.value.id, decision, notes)
    toast.success(decision === 'APPROVED' ? 'Cleared for takeoff' : decision === 'REJECTED' ? 'Request denied' : 'Returned to traveller')
    showDecide.value = false
    await load(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e)) }
  finally { busy.value = false }
}

const onEscalate = async (note) => {
  busy.value = true
  try {
    await escalateRequest(active.value.id, note || 'Stage overridden by admin')
    toast.success('Stage overridden — advanced to the next gate')
    showEsc.value = false
    await load(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e)) }
  finally { busy.value = false }
}

onMounted(() => { tickClock(); clockTimer = setInterval(tickClock, 1000); load() })
onBeforeUnmount(() => clearInterval(clockTimer))
</script>

<style scoped>
.appr { display: flex; flex-direction: column; gap: 18px; }

/* ════════ HERO ════════ */
.tower {
  position: relative; overflow: hidden; border-radius: 24px; padding: 26px 26px 20px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-shadow);
}
.tw-aura { position: absolute; inset: -50% 30% 20% -15%; pointer-events: none;
  background: radial-gradient(60% 70% at 18% 0%, rgba(251, 191, 36, 0.16), transparent 70%);
  animation: trv-aura-drift 11s ease-in-out infinite; }
.tw-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 46px 46px; mask-image: linear-gradient(to bottom, black, transparent 75%); }
.tw-ghost { position: absolute; right: -40px; top: -30px; color: var(--trv-amber); opacity: 0.04; pointer-events: none;
  animation: trv-radar-sweep 90s linear infinite; transform-origin: 50% 50%; }

.tw-main { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center; }
.tw-lead { min-width: 0; }
.tw-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.tw-title { font-size: clamp(26px, 4vw, 40px); font-weight: 850; margin: 12px 0 6px; color: var(--trv-text); line-height: 1.04; }
.tw-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tw-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0; max-width: 560px; line-height: 1.55; }
.tw-cta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 18px; }
.tw-clock { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); padding: 8px 13px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border-warm); }
.tw-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.tw-btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.tw-btn.ghost:hover { color: var(--trv-text); }
.tw-btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.tw-btn:disabled { opacity: 0.6; cursor: default; }
.tw-scope { width: clamp(220px, 26vw, 320px); flex-shrink: 0; padding-bottom: 14px; }

/* lenses */
.tw-lenses { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 22px; }
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
.lens.steel .lens-ico { color: var(--trv-steel); }
.lens.ember .lens-ico { color: var(--trv-ember); }
.lens.danger .lens-ico { color: var(--trv-st-rejected); }
.lens.info .lens-ico { color: var(--trv-amber-bright); }
.lens.on.steel .lens-bar { background: var(--trv-steel); }
.lens.on.ember .lens-bar { background: linear-gradient(90deg, var(--trv-ember), var(--trv-ember-deep)); }
.lens.on.danger .lens-bar { background: var(--trv-st-rejected); }

/* ════════ SQUADRONS ════════ */
.squad { display: flex; flex-direction: column; gap: 12px; }
.sq-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 0 2px; }
.sq-title { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--trv-text); }
.sq-title svg { color: var(--trv-amber); }
.sq-title.steel svg { color: var(--trv-steel); }
.sq-title b { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; font-size: 12px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.sq-title.steel b { color: var(--trv-text-secondary); background: var(--trv-steel-soft); border-color: var(--trv-border); }
.sq-hint { font-size: 12px; color: var(--trv-text-muted); }
.sq-empty { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--trv-text-dim); padding: 14px 16px; border-radius: 14px; background: var(--trv-surface); border: 1px dashed var(--trv-border); }
.sq-empty.centered { justify-content: center; }
.link-btn { background: none; border: none; color: var(--trv-amber); font-weight: 700; cursor: pointer; font-size: 12.5px; padding: 0 2px; text-decoration: underline; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.skel { height: 230px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

/* focus flash from radar click */
.flash { animation: appr-flash 1.6s var(--trv-ease); }
@keyframes appr-flash {
  0%, 100% { box-shadow: var(--trv-card-shadow); }
  20%, 60% { box-shadow: 0 0 0 2px var(--trv-amber), var(--trv-amber-glow); }
}
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 860px) {
  .tw-main { grid-template-columns: 1fr; }
  .tw-scope { width: 100%; max-width: 300px; margin-inline: auto; }
  .tw-lenses { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) { .tw-lenses { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .tw-aura, .tw-ghost, .flash { animation: none; } }
</style>
