<template>
  <div class="codex">
    <!-- ═══════════════════════════════════════════════════════════════════
         00 · HERO — "Governance Control Deck"
         A blueprint/schematic console: dot-grid paper, a sweeping scan beam,
         count-up stat pods on the left, and an animated QUOTA SPECTRUM
         (vertical equalizer, one bar per leave type) on the right.
         Deliberately unlike Applications' flow-lanes and Approvals' orbital
         dial — this page reads "spec sheet / control board".
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="cx-deck" as="section"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- blueprint paper + scanning beam + corner schematics -->
      <span class="cx-paper" aria-hidden="true" />
      <span class="cx-beam" aria-hidden="true" />
      <span class="cx-edge tl" aria-hidden="true" /><span class="cx-edge tr" aria-hidden="true" />
      <span class="cx-edge bl" aria-hidden="true" /><span class="cx-edge br" aria-hidden="true" />

      <!-- LEFT — copy + stat pods -->
      <div class="cx-copy">
        <Motion as="div" class="cx-eye"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.08 }"
        >
          <span class="cx-eye-led" />
          <span class="leave-mono">GOVERNANCE</span><span class="cx-eye-sep">/</span>
          <span class="leave-mono">GLOBAL RULESET</span><span class="cx-eye-sep">/</span>
          <span class="leave-mono cx-eye-live">v{{ rulesetVersion }}</span>
        </Motion>

        <h1 class="cx-title">
          The rules every <em>day off</em>
          <span class="cx-title-l2">must obey.</span>
        </h1>
        <p class="cx-sub">
          One source of truth per leave type — quota, accrual cadence, carry-forward,
          notice windows, documents and encashment. Tap a module to rewrite its constants.
        </p>

        <div class="cx-pods">
          <Motion v-for="(pod, i) in pods" :key="pod.key" as="div"
            class="cx-pod" :data-tone="pod.tone"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.24 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="cx-pod-head">
              <component :is="pod.icon" :size="12" />
              <span class="leave-mono">{{ pod.label }}</span>
            </header>
            <div class="cx-pod-val leave-mono">
              {{ pod.display }}<span v-if="pod.suffix" class="cx-pod-suf">{{ pod.suffix }}</span>
            </div>
            <div class="cx-pod-bar"><span :style="{ width: (loaded ? pod.pct : 0) + '%' }" /></div>
          </Motion>
        </div>
      </div>

      <!-- RIGHT — quota spectrum -->
      <div class="cx-spectrum-wrap">
        <div class="cx-spectrum-head">
          <span class="leave-mono">QUOTA SPECTRUM</span>
          <span class="cx-spectrum-unit leave-mono">days / yr</span>
        </div>
        <div v-if="loading && !policies.length" class="cx-spectrum-skel">
          <span v-for="i in 8" :key="i" class="leave-skel" :style="{ height: (30 + (i * 53) % 70) + '%' }" />
        </div>
        <div v-else class="cx-spectrum">
          <Motion v-for="(b, i) in spectrum" :key="b.key" as="button"
            class="cx-bar" :class="{ inf: b.infinite, dimmed: focus && focus !== b.key }"
            :style="{ '--bc': b.hex }"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.34 + i * 0.05 }"
            :whileHover="{ y: -4 }"
            @click="toggleFocus(b.key)"
            :title="`${b.label}: ${b.infinite ? 'unlimited' : b.value + ' days/yr'}`"
          >
            <span class="cx-bar-val leave-mono">{{ b.infinite ? '∞' : b.value }}</span>
            <span class="cx-bar-col">
              <span class="cx-bar-fill" :style="{ height: (loaded ? b.h : 0) + '%' }">
                <span class="cx-bar-shine" />
              </span>
            </span>
            <span class="cx-bar-ic"><LeaveTypeIcon :type="b.key" :size="12" /></span>
          </Motion>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · CONSOLE BAR — title + focus chips + refresh
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="cx-bar-rail" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.2 }"
    >
      <div class="cx-rail-l">
        <SlidersHorizontal :size="14" />
        <span class="cx-rail-title">Policy modules</span>
        <span class="cx-rail-count leave-mono">{{ policies.length }}</span>
      </div>

      <div class="cx-chips">
        <button class="cx-chip" :class="{ active: !focus }" @click="focus = null">All</button>
        <Motion v-for="b in spectrum" :key="b.key" as="button"
          class="cx-chip" :class="{ active: focus === b.key }"
          :style="{ '--bc': b.hex }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
          @click="toggleFocus(b.key)"
        >
          <span class="cx-chip-dot" />{{ b.label }}
        </Motion>
      </div>

      <div class="cx-rail-actions">
        <button class="leave-btn leave-btn-sm leave-btn-primary cx-new"
          @click="openCreate" :title="createTitle">
          <Plus :size="13" /> New policy
          <span v-if="creatableTypes.length" class="cx-new-badge">{{ creatableTypes.length }}</span>
        </button>
        <button class="leave-btn leave-btn-sm cx-refresh" :disabled="loading" @click="reload">
          <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
        </button>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         02 · MODULE GRID — blueprint spec cards
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading && !policies.length" class="cx-grid">
      <div v-for="i in 6" :key="i" class="leave-skel cx-card-skel" />
    </div>

    <div v-else class="cx-grid">
      <Motion v-for="(p, i) in visiblePolicies" :key="p.id" as="article"
        class="cx-card" :class="{ focused: focus === p.leave_type }"
        :style="{ '--pc': typeHex(p.leave_type) }"
        :initial="{ opacity: 0, y: 22, rotateX: -10 }"
        :animate="{ opacity: 1, y: 0, rotateX: 0 }"
        :transition="{ duration: 0.5, delay: Math.min(i * 0.05, 0.45), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -6, rotateX: 4, scale: 1.012 }"
        @click="openEdit(p)"
      >
        <!-- ambient layers -->
        <span class="cc-grid" aria-hidden="true" />
        <span class="cc-glow" aria-hidden="true" />
        <span class="cc-scan" aria-hidden="true" />
        <span class="cc-tick tl" aria-hidden="true" /><span class="cc-tick br" aria-hidden="true" />

        <!-- head -->
        <header class="cc-head">
          <div class="cc-icon"><LeaveTypeIcon :type="p.leave_type" :size="17" ambient /></div>
          <div class="cc-titles">
            <span class="cc-eye leave-mono">POLICY · {{ p.leave_type }}</span>
            <h3 class="cc-name">{{ p.label || typeMeta(p.leave_type).label }}</h3>
          </div>
          <div class="cc-head-actions">
            <button class="cc-edit" @click.stop="openEdit(p)" aria-label="Edit policy">
              <PencilLine :size="13" />
            </button>
            <button class="cc-del" @click.stop="openDelete(p)" aria-label="Delete policy">
              <Trash2 :size="13" />
            </button>
          </div>
        </header>

        <!-- core — accrual ring + big quota + mini specs -->
        <div class="cc-core">
          <div class="cc-dial">
            <svg viewBox="0 0 72 72" class="cc-ring">
              <circle cx="36" cy="36" r="30" class="cc-ring-track" />
              <circle cx="36" cy="36" r="30" class="cc-ring-prog"
                :stroke-dasharray="RING_C"
                :stroke-dashoffset="loaded ? ringOffset(p) : RING_C"
                :style="{ transitionDelay: (0.2 + (i % 8) * 0.05) + 's' }"
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div class="cc-dial-center">
              <span class="cc-quota leave-mono">{{ quotaDisplay(p) }}</span>
              <span class="cc-quota-lbl">{{ Number(p.annual_quota) > 0 ? 'days/yr' : 'no cap' }}</span>
            </div>
          </div>

          <ul class="cc-specs">
            <li>
              <span class="cc-spec-ic"><TrendingUp :size="11" /></span>
              <span v-if="Number(p.monthly_accrual) > 0">Accrues <b class="leave-mono">{{ Number(p.monthly_accrual) }}</b>/mo</span>
              <span v-else>Granted upfront</span>
            </li>
            <li>
              <span class="cc-spec-ic"><Recycle :size="11" /></span>
              <span v-if="Number(p.max_carry_forward) > 0">Carry ≤ <b class="leave-mono">{{ Number(p.max_carry_forward) }}</b>d</span>
              <span v-else>No carry-forward</span>
            </li>
            <li>
              <span class="cc-spec-ic"><CalendarClock :size="11" /></span>
              Notice <b class="leave-mono">{{ p.requires_notice_days || 0 }}</b>d
              <template v-if="p.advance_book_days"> · ≤<b class="leave-mono">{{ p.advance_book_days }}</b>d</template>
            </li>
            <li v-if="p.max_consecutive_days">
              <span class="cc-spec-ic"><Layers :size="11" /></span>
              Max streak <b class="leave-mono">{{ p.max_consecutive_days }}</b>d
            </li>
          </ul>
        </div>

        <!-- rule toggles -->
        <div class="cc-rules">
          <span class="cc-rule" :class="{ on: p.requires_attachment }">
            <Paperclip :size="11" />{{ p.requires_attachment ? 'Doc required' : 'No doc' }}
          </span>
          <span class="cc-rule" :class="{ on: p.encashment_allowed }">
            <IndianRupee :size="11" />{{ p.encashment_allowed ? 'Encashable' : 'No cash-out' }}
          </span>
          <span class="cc-rule" :class="{ on: p.count_holidays_weekoffs }">
            <Calendar :size="11" />{{ p.count_holidays_weekoffs ? 'Counts off-days' : 'Skips off-days' }}
          </span>
        </div>

        <span class="cc-cta leave-mono">EDIT MODULE <ArrowUpRight :size="12" /></span>
      </Motion>
    </div>

    <LeavePolicyEditModal :open="editor.open" :policy="editor.policy" @cancel="editor.open=false" @saved="onSaved" />
    <LeavePolicyCreateModal :open="creator.open" :creatable-types="creatableTypes" @cancel="creator.open=false" @created="onCreated" />
    <LeavePolicyDeleteModal :open="remover.open" :policy="remover.policy" @cancel="remover.open=false" @deleted="onDeleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, PencilLine, Paperclip, CalendarClock, Layers, IndianRupee, Calendar,
  SlidersHorizontal, TrendingUp, Recycle, ArrowUpRight, Boxes, Sigma, Coins,
  Plus, Trash2,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeavePolicyEditModal from '../modals/LeavePolicyEditModal.vue'
import LeavePolicyCreateModal from '../modals/LeavePolicyCreateModal.vue'
import LeavePolicyDeleteModal from '../modals/LeavePolicyDeleteModal.vue'
import { fetchLeavePolicies, typeMeta, LEAVE_TYPES } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const policies = ref([])
const loading = ref(false)
const loaded = ref(false)           // flips true post-paint → drives the fill/draw animations
const editor = ref({ open: false, policy: null })
const creator = ref({ open: false })
const remover = ref({ open: false, policy: null })
const creatableTypes = ref([])
const focus = ref(null)

// Warm-only accent per type (typeMeta.hex is the legacy blue/pink ramp; the
// leave module is warm-only — mirror the Balances spectrum palette).
const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const typeHex = (k) => TYPE_HEX[k] || '#fbbf24'
const TYPE_ORDER = LEAVE_TYPES.map(t => t.key)
const RING_C = 2 * Math.PI * 30   // circumference of r=30

const num = (v) => Number(v) || 0

// ─── Fetch ─────────────────────────────────────────────────────────────
const reload = async () => {
  loading.value = true
  try {
    const data = await fetchLeavePolicies()
    policies.value = data.items || []
    creatableTypes.value = data.creatable_types || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load policies')
  } finally {
    loading.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { loaded.value = true }))
  }
}

// ─── Sorted + focus-filtered ────────────────────────────────────────────
const sortedPolicies = computed(() =>
  [...policies.value].sort((a, b) =>
    TYPE_ORDER.indexOf(a.leave_type) - TYPE_ORDER.indexOf(b.leave_type)),
)
const visiblePolicies = computed(() =>
  focus.value ? sortedPolicies.value.filter(p => p.leave_type === focus.value) : sortedPolicies.value,
)

// ─── Quota spectrum (perceptual scale so 180 doesn't crush 5–18) ────────
const spectrum = computed(() => {
  const finite = sortedPolicies.value.map(p => num(p.annual_quota)).filter(v => v > 0)
  const max = finite.length ? Math.max(...finite) : 1
  return sortedPolicies.value.map(p => {
    const v = num(p.annual_quota)
    const infinite = v <= 0
    // sqrt curve keeps small quotas readable; ∞ types get a fixed mid bar.
    const h = infinite ? 46 : Math.round(16 + 80 * Math.sqrt(v / max))
    return { key: p.leave_type, label: p.label || typeMeta(p.leave_type).label, hex: typeHex(p.leave_type), value: v, infinite, h }
  })
})

// ─── Aggregate stat pods (tweened count-ups) ────────────────────────────
const aggregates = computed(() => {
  const list = policies.value
  const totalAnnual = list.reduce((s, p) => s + num(p.annual_quota), 0)
  const accruing = list.filter(p => num(p.monthly_accrual) > 0).length
  const encashable = list.filter(p => p.encashment_allowed).length
  const docGated = list.filter(p => p.requires_attachment).length
  return { types: list.length, totalAnnual, accruing, encashable, docGated }
})

function useTween(getter, { duration = 1000 } = {}) {
  const out = ref(0)
  let raf = null
  const run = (to) => {
    if (raf) cancelAnimationFrame(raf)
    const from = out.value
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      out.value = from + (to - from) * e
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  watch(getter, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
  return out
}
const tTypes = useTween(() => aggregates.value.types, { duration: 800 })
const tAnnual = useTween(() => aggregates.value.totalAnnual)
const tAccru = useTween(() => aggregates.value.accruing, { duration: 800 })
const tCash = useTween(() => aggregates.value.encashable, { duration: 800 })

const pods = computed(() => {
  const a = aggregates.value
  const denom = Math.max(1, a.types)
  return [
    { key: 'types', label: 'TYPES CONFIGURED', icon: Boxes, tone: 'gold',
      display: String(Math.round(tTypes.value)), suffix: '', pct: 100 },
    { key: 'annual', label: 'ANNUAL DAY POOL', icon: Sigma, tone: 'ember',
      display: String(Math.round(tAnnual.value)), suffix: 'd', pct: Math.min(100, a.totalAnnual ? 100 : 0) },
    { key: 'accru', label: 'ACCRUING', icon: TrendingUp, tone: 'amber',
      display: String(Math.round(tAccru.value)), suffix: `/${a.types}`, pct: (a.accruing / denom) * 100 },
    { key: 'cash', label: 'ENCASHABLE', icon: Coins, tone: 'gold',
      display: String(Math.round(tCash.value)), suffix: `/${a.types}`, pct: (a.encashable / denom) * 100 },
  ]
})

const rulesetVersion = computed(() => `1.${aggregates.value.types || 0}`)

// ─── Accrual ring fraction → dash offset ────────────────────────────────
const ringFrac = (p) => {
  const annual = num(p.annual_quota)
  if (annual <= 0) return 1                      // unlimited → full ring
  const accrued = num(p.monthly_accrual) * 12
  return Math.max(0, Math.min(1, accrued / annual))
}
const ringOffset = (p) => RING_C * (1 - ringFrac(p))
const quotaDisplay = (p) => num(p.annual_quota) > 0 ? num(p.annual_quota) : '∞'

// ─── Interactions ───────────────────────────────────────────────────────
const toggleFocus = (k) => { focus.value = focus.value === k ? null : k }
const openEdit = (p) => { editor.value = { open: true, policy: p } }
const onSaved = () => { editor.value.open = false; reload() }

const createTitle = computed(() => creatableTypes.value.length
  ? `${creatableTypes.value.length} leave type(s) available to configure`
  : 'All leave types are configured — delete one to free a slot')
const openCreate = () => { creator.value.open = true }
const onCreated = () => { creator.value.open = false; reload() }
const openDelete = (p) => { remover.value = { open: true, policy: p } }
const onDeleted = () => { remover.value.open = false; reload() }

onMounted(reload)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.codex { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════════════════════════════════════════════════════════════
   HERO — Governance Control Deck
   ════════════════════════════════════════════════════════════════════════ */
.cx-deck {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 28px; align-items: stretch;
  padding: 28px 30px;
  border-radius: 24px;
  background:
    radial-gradient(60% 90% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(60% 80% at 100% 100%, rgba(234, 88, 12, 0.14), transparent 58%),
    linear-gradient(180deg, #0a0604, #130a05);
  border: 1px solid var(--leave-border);
  isolation: isolate; min-height: 300px;
}
[data-theme="light"] .cx-deck {
  background:
    radial-gradient(60% 90% at 0% 0%, rgba(251, 191, 36, 0.2), transparent 55%),
    radial-gradient(60% 80% at 100% 100%, rgba(234, 88, 12, 0.1), transparent 58%),
    linear-gradient(180deg, #fffdf5, #fff5e3);
  border-color: rgba(180, 83, 9, 0.2);
}
@media (max-width: 1040px) { .cx-deck { grid-template-columns: 1fr; } }

/* blueprint paper grid */
.cx-paper {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(to right, var(--leave-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--leave-grid-line) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(120% 120% at 50% 0%, #000 40%, transparent 92%);
  -webkit-mask-image: radial-gradient(120% 120% at 50% 0%, #000 40%, transparent 92%);
  opacity: 0.7;
}
/* sweeping scan beam */
.cx-beam {
  position: absolute; top: 0; bottom: 0; left: 0; width: 180px; z-index: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.12) 45%, rgba(251, 191, 36, 0.22) 50%, transparent);
  filter: blur(2px);
  animation: cx-scan 7s ease-in-out infinite;
}
@keyframes cx-scan {
  0% { transform: translateX(-200px); opacity: 0; }
  18% { opacity: 1; }
  82% { opacity: 1; }
  100% { transform: translateX(120vw); opacity: 0; }
}
/* schematic corner ticks */
.cx-edge { position: absolute; width: 22px; height: 22px; z-index: 1; pointer-events: none; opacity: 0.6; }
.cx-edge::before, .cx-edge::after { content: ''; position: absolute; background: var(--leave-brand); }
.cx-edge::before { width: 100%; height: 1.5px; }
.cx-edge::after { width: 1.5px; height: 100%; }
.cx-edge.tl { top: 12px; left: 12px; } .cx-edge.tl::before { top: 0; left: 0; } .cx-edge.tl::after { top: 0; left: 0; }
.cx-edge.tr { top: 12px; right: 12px; } .cx-edge.tr::before { top: 0; right: 0; } .cx-edge.tr::after { top: 0; right: 0; }
.cx-edge.bl { bottom: 12px; left: 12px; } .cx-edge.bl::before { bottom: 0; left: 0; } .cx-edge.bl::after { bottom: 0; left: 0; }
.cx-edge.br { bottom: 12px; right: 12px; } .cx-edge.br::before { bottom: 0; right: 0; } .cx-edge.br::after { bottom: 0; right: 0; }

/* LEFT copy */
.cx-copy { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.cx-eye {
  display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.28);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-secondary);
}
[data-theme="light"] .cx-eye { background: rgba(251, 191, 36, 0.16); border-color: rgba(180, 83, 9, 0.26); }
.cx-eye-led { width: 7px; height: 7px; border-radius: 50%; background: var(--leave-approved); box-shadow: 0 0 10px var(--leave-approved); animation: leave-eyebrow-pulse 1.6s ease-in-out infinite; }
.cx-eye-sep { color: var(--leave-text-muted); opacity: 0.5; }
.cx-eye-live { color: var(--leave-brand); }
[data-theme="light"] .cx-eye-live { color: var(--w-gold-700); }

.cx-title {
  margin: 0; font-size: clamp(28px, 3.3vw, 40px); font-weight: 800;
  letter-spacing: -0.028em; line-height: 1.05; color: #fff8dc; text-wrap: balance;
}
[data-theme="light"] .cx-title { color: #2a1100; }
.cx-title em { font-style: italic; background: linear-gradient(135deg, #fde047, #f59e0b 50%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.cx-title-l2 { display: block; }
.cx-sub { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.6; color: var(--w-gold-100); opacity: 0.85; }
[data-theme="light"] .cx-sub { color: #6b3d12; opacity: 1; }

/* stat pods */
.cx-pods { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 6px; }
@media (max-width: 560px) { .cx-pods { grid-template-columns: repeat(2, 1fr); } }
.cx-pod {
  display: flex; flex-direction: column; gap: 6px; padding: 11px 13px; border-radius: 13px;
  background: rgba(20, 13, 7, 0.6); border: 1px solid var(--leave-border);
  transition: border-color .24s, box-shadow .24s;
}
[data-theme="light"] .cx-pod { background: rgba(255, 248, 230, 0.82); }
.cx-pod:hover { border-color: var(--leave-brand); box-shadow: 0 8px 22px -12px rgba(251, 191, 36, 0.4); }
.cx-pod-head { display: flex; align-items: center; gap: 6px; color: var(--w-gold-200); }
[data-theme="light"] .cx-pod-head { color: var(--w-gold-700); }
.cx-pod[data-tone="ember"] .cx-pod-head { color: var(--w-ember-300); }
[data-theme="light"] .cx-pod[data-tone="ember"] .cx-pod-head { color: var(--w-ember-600); }
.cx-pod-head span { font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; white-space: nowrap; }
.cx-pod-val { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; background: linear-gradient(135deg, #fde047, #fbbf24 55%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.cx-pod[data-tone="ember"] .cx-pod-val { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.cx-pod-suf { font-size: 11px; margin-left: 2px; -webkit-text-fill-color: var(--leave-text-muted); }
.cx-pod-bar { height: 4px; border-radius: 4px; overflow: hidden; background: rgba(251, 191, 36, 0.12); }
.cx-pod-bar span { display: block; height: 100%; border-radius: 4px; background: var(--leave-grad-cta); transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1); }
.cx-pod[data-tone="ember"] .cx-pod-bar span { background: var(--leave-grad-ember); }

/* RIGHT — quota spectrum */
.cx-spectrum-wrap {
  position: relative; z-index: 2; display: flex; flex-direction: column; gap: 12px;
  padding: 14px 16px; border-radius: 18px;
  background: rgba(16, 11, 6, 0.55); border: 1px solid var(--leave-border);
}
[data-theme="light"] .cx-spectrum-wrap { background: rgba(255, 250, 235, 0.6); }
.cx-spectrum-head { display: flex; align-items: baseline; justify-content: space-between; }
.cx-spectrum-head span:first-child { font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-text-secondary); }
.cx-spectrum-unit { font-size: 9px; color: var(--leave-text-muted); }
.cx-spectrum, .cx-spectrum-skel {
  flex: 1; min-height: 168px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 6px;
}
.cx-spectrum-skel span { flex: 1; border-radius: 8px 8px 4px 4px; }

.cx-bar {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: transparent; border: 0; cursor: pointer; padding: 0;
  transition: opacity .3s;
}
.cx-bar.dimmed { opacity: 0.26; }
.cx-bar-val { font-size: 10px; font-weight: 800; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.cx-bar-col {
  position: relative; width: 100%; height: 120px; border-radius: 8px;
  display: flex; align-items: flex-end;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--leave-border-soft);
  overflow: hidden;
}
.cx-bar-fill {
  position: relative; width: 100%; border-radius: 7px 7px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bc) 92%, #fff7ed), var(--bc) 55%, color-mix(in srgb, var(--bc) 70%, #7c2d12));
  box-shadow: 0 0 16px color-mix(in srgb, var(--bc) 55%, transparent);
  transition: height 1s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.cx-bar.inf .cx-bar-fill {
  background:
    repeating-linear-gradient(45deg, color-mix(in srgb, var(--bc) 80%, transparent) 0 5px, transparent 5px 10px),
    linear-gradient(180deg, var(--bc), color-mix(in srgb, var(--bc) 60%, #7c2d12));
}
.cx-bar-shine {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent 45%);
}
.cx-bar-ic { transform: scale(0.9); }

/* ════════════════════════════════════════════════════════════════════════
   CONSOLE BAR
   ════════════════════════════════════════════════════════════════════════ */
.cx-bar-rail {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  padding: 11px 14px; border-radius: 14px;
  background: var(--leave-surface); border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px);
}
.cx-rail-l { display: inline-flex; align-items: center; gap: 8px; color: var(--leave-text-secondary); }
.cx-rail-l svg { color: var(--leave-brand); }
.cx-rail-title { font-size: 12.5px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.01em; }
.cx-rail-count {
  display: inline-grid; place-items: center; min-width: 20px; height: 18px; padding: 0 6px;
  border-radius: 999px; font-size: 10px; font-weight: 800;
  background: rgba(251, 191, 36, 0.16); color: var(--leave-brand);
}
[data-theme="light"] .cx-rail-count { color: var(--w-gold-700); }
.cx-chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
.cx-chip {
  --bc: var(--leave-brand);
  display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 11px; border-radius: 999px;
  font-size: 11px; font-weight: 700; cursor: pointer;
  background: transparent; border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary);
  transition: border-color .2s, background .2s, color .2s, box-shadow .2s;
}
.cx-chip:hover { color: var(--leave-text); border-color: color-mix(in srgb, var(--bc) 55%, transparent); }
.cx-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--bc); box-shadow: 0 0 7px color-mix(in srgb, var(--bc) 70%, transparent); }
.cx-chip.active {
  border-color: color-mix(in srgb, var(--bc) 60%, transparent);
  background: color-mix(in srgb, var(--bc) 14%, transparent);
  color: var(--leave-text);
  box-shadow: 0 6px 18px -10px color-mix(in srgb, var(--bc) 70%, transparent);
}
.cx-rail-actions { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.cx-new { position: relative; }
.cx-new-badge {
  display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; margin-left: 2px;
  border-radius: 999px; font-size: 9.5px; font-weight: 800; font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.25); color: #1a1205;
}

/* ════════════════════════════════════════════════════════════════════════
   MODULE GRID — blueprint spec cards
   ════════════════════════════════════════════════════════════════════════ */
.cx-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px;
  perspective: 1200px;
}
.cx-card-skel { height: 268px; border-radius: 20px; }

.cx-card {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; gap: 14px;
  padding: 16px 18px 18px; border-radius: 20px;
  background:
    radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--pc) 10%, transparent), transparent 55%),
    var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px) saturate(140%);
  cursor: pointer; transform-style: preserve-3d;
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease);
}
[data-theme="light"] .cx-card {
  background:
    radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--pc) 16%, transparent), transparent 55%),
    rgba(255, 250, 240, 0.9);
  border-color: rgba(180, 83, 9, 0.18);
}
.cx-card:hover, .cx-card.focused {
  border-color: color-mix(in srgb, var(--pc) 60%, transparent);
  box-shadow: 0 26px 60px -28px rgba(0,0,0,0.8), 0 0 30px -10px color-mix(in srgb, var(--pc) 55%, transparent);
}

/* blueprint grid texture inside card */
.cc-grid {
  position: absolute; inset: 0; z-index: -2; pointer-events: none; opacity: 0.5;
  background-image:
    linear-gradient(to right, var(--leave-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--leave-grid-line) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(120% 100% at 100% 0%, #000 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 30%, transparent 80%);
}
.cc-glow {
  position: absolute; inset: -40% -10% auto auto; width: 60%; height: 150%; z-index: -2;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--pc) 30%, transparent), transparent 70%);
  filter: blur(36px); opacity: 0; transition: opacity .3s; pointer-events: none;
}
.cx-card:hover .cc-glow { opacity: 0.85; }
/* scan sweep on hover */
.cc-scan {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, color-mix(in srgb, var(--pc) 22%, transparent) 50%, transparent 65%);
  background-size: 250% 100%; background-position: 200% 0; opacity: 0;
}
.cx-card:hover .cc-scan { opacity: 1; animation: cc-sweep 0.9s ease forwards; }
@keyframes cc-sweep { to { background-position: -60% 0; } }
/* schematic corner ticks */
.cc-tick { position: absolute; width: 14px; height: 14px; z-index: 1; pointer-events: none; opacity: 0; transition: opacity .3s; }
.cx-card:hover .cc-tick { opacity: 0.8; }
.cc-tick::before, .cc-tick::after { content: ''; position: absolute; background: var(--pc); }
.cc-tick::before { width: 100%; height: 1.5px; } .cc-tick::after { width: 1.5px; height: 100%; }
.cc-tick.tl { top: 9px; left: 9px; } .cc-tick.tl::before, .cc-tick.tl::after { top: 0; left: 0; }
.cc-tick.br { bottom: 9px; right: 9px; } .cc-tick.br::before { bottom: 0; right: 0; } .cc-tick.br::after { bottom: 0; right: 0; }

.cc-head { display: flex; align-items: center; gap: 10px; }
.cc-icon { flex-shrink: 0; }
.cc-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cc-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-muted); text-transform: uppercase; }
.cc-name { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; color: var(--leave-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-edit {
  flex-shrink: 0; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  background: transparent; border: 1px solid var(--leave-border-strong); color: var(--leave-text-muted);
  cursor: pointer; transition: background .22s, color .22s, border-color .22s, transform .22s;
}
.cc-edit:hover { background: color-mix(in srgb, var(--pc) 14%, transparent); border-color: var(--pc); color: var(--pc); transform: translateY(-2px) rotate(-8deg); }
.cc-head-actions { flex-shrink: 0; display: inline-flex; gap: 6px; }
.cc-del {
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  background: transparent; border: 1px solid var(--leave-border-strong); color: var(--leave-text-muted);
  cursor: pointer; transition: background .22s, color .22s, border-color .22s, transform .22s;
}
.cc-del:hover { background: rgba(239, 68, 68, 0.14); border-color: var(--leave-rejected); color: var(--leave-rejected); transform: translateY(-2px); }

/* core */
.cc-core { display: flex; align-items: center; gap: 16px; }
.cc-dial { position: relative; flex-shrink: 0; width: 88px; height: 88px; display: grid; place-items: center; }
.cc-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.cc-ring-track { fill: none; stroke: color-mix(in srgb, var(--pc) 16%, rgba(255,255,255,0.05)); stroke-width: 5; }
[data-theme="light"] .cc-ring-track { stroke: color-mix(in srgb, var(--pc) 20%, rgba(180,83,9,0.08)); }
.cc-ring-prog {
  fill: none; stroke: var(--pc); stroke-width: 5; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--pc) 70%, transparent));
  transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cc-dial-center { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.cc-quota {
  font-size: 26px; font-weight: 900; letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, var(--pc) 70%); background-clip: text; -webkit-background-clip: text; color: transparent;
}
.cc-quota-lbl { margin-top: 3px; font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--leave-text-muted); }

.cc-specs { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.cc-specs li { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--leave-text-secondary); }
.cc-specs b { color: var(--leave-text); font-weight: 800; }
.cc-spec-ic { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; background: color-mix(in srgb, var(--pc) 14%, transparent); color: var(--pc); }

/* rule toggles */
.cc-rules { display: flex; flex-wrap: wrap; gap: 6px; }
.cc-rule {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.01em;
  background: rgba(255,255,255,0.03); border: 1px solid var(--leave-border);
  color: var(--leave-text-muted);
  transition: background .2s, border-color .2s, color .2s;
}
[data-theme="light"] .cc-rule { background: rgba(180,83,9,0.04); }
.cc-rule svg { opacity: 0.8; }
.cc-rule.on {
  background: color-mix(in srgb, var(--pc) 14%, transparent);
  border-color: color-mix(in srgb, var(--pc) 45%, transparent);
  color: var(--leave-text);
}
.cc-rule.on svg { color: var(--pc); opacity: 1; }

.cc-cta {
  display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
  margin-top: 2px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--leave-text-muted);
  opacity: 0; transform: translateY(4px); transition: opacity .26s, transform .26s, color .26s;
}
.cx-card:hover .cc-cta { opacity: 1; transform: translateY(0); color: var(--pc); }

/* refresh spinner */
.spin { animation: cx-spin 0.9s linear infinite; }
@keyframes cx-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .cx-beam, .cx-eye-led, .cx-bar-shine, .cc-scan { animation: none !important; }
}
</style>
