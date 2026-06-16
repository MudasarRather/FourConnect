<template>
  <div class="ssr-root" ref="rootRef">
    <!-- ── cinematic ambient backdrop (pointer-reactive) ── -->
    <div class="ssr-atmos" aria-hidden="true">
      <span class="ssr-orb o1" /><span class="ssr-orb o2" /><span class="ssr-orb o3" />
      <span class="ssr-grid" /><span class="ssr-scan" />
      <span class="rmb-grain" />
    </div>

    <!-- unlinked banner -->
    <Transition name="ssr-fade">
      <Motion v-if="unlinked" as="div" class="ssr-unlinked"
              :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <span class="ul-ic"><AlertCircle :size="16" /></span>
        <span>Your account isn't linked to an employee profile yet — ask HR to link it before you can raise claims.</span>
      </Motion>
    </Transition>

    <!-- ── hero ── -->
    <RmbSelfHero :summary="summary" :buckets="buckets" :fy-label="fyLabel" :unlinked="unlinked"
                 @raise="openWizard" @scroll-ledger="scrollToLedger" />

    <!-- ── ledger console ── -->
    <section class="ssr-block" ref="ledgerRef">
      <Motion as="div" class="block-head" v-bind="reveal(0)">
        <div class="bh-left">
          <span class="bh-eyebrow rmb-mono"><ScrollText :size="12" /> LEDGER</span>
          <h3>My claim ledger</h3>
        </div>
        <div class="seg" :style="{ '--n': segments.length, '--i': activeIndex }">
          <span class="seg-pill" aria-hidden="true" />
          <button v-for="(s, i) in segments" :key="s.key" class="seg-btn" :class="{ on: activeSeg === s.key }"
                  @click="activeSeg = s.key">
            {{ s.label }}<span v-if="segCount(s) " class="seg-n rmb-mono">{{ segCount(s) }}</span>
          </button>
        </div>
      </Motion>

      <div class="ledger rmb-ribbon">
        <span class="ledger-edge" aria-hidden="true" />
        <div v-if="loading" class="slips"><div v-for="i in 4" :key="i" class="rmb-skel slip-skel" /></div>

        <TransitionGroup v-else-if="filteredClaims.length" name="slip-list" tag="div" class="slips">
          <RmbReceiptSlip v-for="(c, i) in filteredClaims" :key="c.id" :claim="c" :index="i" @open="openClaim" />
        </TransitionGroup>

        <RmbEmptyState v-else :icon="filterEmpty ? Filter : Receipt"
                       :title="filterEmpty ? 'No claims in this view' : 'No claims yet'"
                       :subtitle="filterEmpty ? 'Try another filter, or raise a fresh business expense.' : 'Tap “Raise a claim” to file your first business expense — it lands here on the tape.'">
          <button class="rmb-btn rmb-btn-primary" :disabled="unlinked" @click="openWizard"><Plus :size="15" /> Raise a claim</button>
        </RmbEmptyState>
      </div>
    </section>

    <!-- ── insights duo ── -->
    <section class="ssr-block" v-if="claims.length">
      <div class="ins-grid">
        <Motion as="div" class="card" ref="catCardRef" v-bind="reveal(1)">
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum rmb-mono">01</span><h4>Spend by category</h4></header>
          <RmbCategoryRing :items="categoryItems" />
        </Motion>
        <Motion as="div" class="card" ref="statCardRef" v-bind="reveal(2)">
          <span class="rmb-spotlight" aria-hidden="true" />
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum rmb-mono">02</span><h4>Pipeline by status</h4></header>
          <RmbStatusBars :items="statusItems" />
        </Motion>
      </div>
    </section>

    <!-- ── spend against limits ── -->
    <section class="ssr-block" v-if="balances.length">
      <Motion as="div" class="block-head" v-bind="reveal(0)">
        <div class="bh-left">
          <span class="bh-eyebrow rmb-mono"><Gauge :size="12" /> POLICY</span>
          <h3>Spend against limits</h3>
        </div>
        <span class="bh-meta rmb-mono">this month · {{ balances.length }} buckets</span>
      </Motion>
      <div class="bal-grid">
        <RmbSpendMeter v-for="(b, i) in balances" :key="b.category_id" :item="b" :index="i" />
      </div>
    </section>

    <NewClaimWizard v-if="wizard" mode="self" @close="wizard = false" @created="onCreated" />
    <ClaimDetailDrawer :claim="active" surface="self" :can-act="false" @close="active = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Receipt, AlertCircle, ScrollText, Filter, Gauge } from 'lucide-vue-next'
import {
  fetchMyClaims, fetchMyClaimSummary, fetchMyBalances, fetchMyClaim,
  categoryMeta, statusMeta,
} from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

import '@/styles/reimbursements-theme.css'
import RmbSelfHero from './reimbursements/components/RmbSelfHero.vue'
import RmbReceiptSlip from './reimbursements/components/RmbReceiptSlip.vue'
import RmbSpendMeter from './reimbursements/components/RmbSpendMeter.vue'
import RmbCategoryRing from './reimbursements/components/RmbCategoryRing.vue'
import RmbStatusBars from './reimbursements/components/RmbStatusBars.vue'
import RmbEmptyState from './reimbursements/components/RmbEmptyState.vue'
import NewClaimWizard from './reimbursements/modals/NewClaimWizard.vue'
import ClaimDetailDrawer from './reimbursements/drawers/ClaimDetailDrawer.vue'

const rootRef = ref(null)
usePointerSpotlight(rootRef)
const ledgerRef = ref(null)
const catCardRef = ref(null)
const statCardRef = ref(null)
usePointerSpotlight(catCardRef)
usePointerSpotlight(statCardRef)

const claims = ref([])
const summary = ref({})
const balances = ref([])
const loading = ref(false)
const unlinked = ref(false)
const wizard = ref(false)
const active = ref(null)

// ── FY label (Apr–Mar) ──
const fyLabel = computed(() => {
  const d = new Date()
  const fyEndYear = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear()
  return `FY${String(fyEndYear).slice(2)}`
})

// ── pipeline buckets (drives the hero gauge) ──
const buckets = computed(() => {
  const b = { review: 0, approved: 0, settled: 0, closed: 0 }
  for (const c of claims.value) {
    if (['PENDING_APPROVAL', 'RETURNED'].includes(c.status)) b.review++
    else if (c.status === 'APPROVED') b.approved++
    else if (['SETTLED', 'PAID'].includes(c.status)) b.settled++
    else b.closed++
  }
  return b
})

// ── ledger segments ──
const segments = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'In review', statuses: ['PENDING_APPROVAL', 'RETURNED'] },
  { key: 'approved', label: 'Approved', statuses: ['APPROVED'] },
  { key: 'settled', label: 'Settled', statuses: ['SETTLED', 'PAID'] },
  { key: 'closed', label: 'Closed', statuses: ['REJECTED', 'CANCELLED', 'REVERSED', 'DRAFT'] },
]
const activeSeg = ref('all')
const activeIndex = computed(() => Math.max(0, segments.findIndex(s => s.key === activeSeg.value)))
const segCount = (s) => s.key === 'all' ? claims.value.length : claims.value.filter(c => s.statuses.includes(c.status)).length
const filteredClaims = computed(() => {
  const seg = segments.find(s => s.key === activeSeg.value)
  if (!seg || seg.key === 'all') return claims.value
  return claims.value.filter(c => seg.statuses.includes(c.status))
})
const filterEmpty = computed(() => claims.value.length > 0 && filteredClaims.value.length === 0)

// ── category colour resolver (prefers per-category custom hex from balances) ──
const colorByCode = computed(() => {
  const m = {}
  for (const b of balances.value) if (b.category_code) m[b.category_code] = b.color_hex || categoryMeta(b.category_code).hex
  return m
})
const displayAmt = (c) =>
  ['SETTLED', 'PAID'].includes(c.status) && c.approved_amount != null ? Number(c.approved_amount) : Number(c.amount || 0)

// ── category ring (grouped from my claims) ──
const categoryItems = computed(() => {
  const map = {}
  for (const c of claims.value) {
    if (['REJECTED', 'CANCELLED', 'REVERSED'].includes(c.status)) continue
    const code = c.category_code || c.category_id || c.category_name
    if (!map[code]) map[code] = { key: code, name: c.category_name || categoryMeta(c.category_code).label, color: colorByCode.value[c.category_code] || categoryMeta(c.category_code).hex, count: 0, amount: 0 }
    map[code].count++
    map[code].amount += displayAmt(c)
  }
  return Object.values(map)
})

// ── status bars (grouped from my claims) ──
const statusItems = computed(() => {
  const map = {}
  for (const c of claims.value) {
    if (!map[c.status]) map[c.status] = { key: c.status, label: statusMeta(c.status).label, value: 0, color: statusMeta(c.status).hex }
    map[c.status].value++
  }
  return Object.values(map)
})

// staggered section reveal helper
const reveal = (i) => ({
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.06 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
})

function openWizard() { if (!unlinked.value) wizard.value = true }
function scrollToLedger() {
  const el = ledgerRef.value?.$el || ledgerRef.value
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

async function load() {
  loading.value = true
  try {
    const [list, sum, bal] = await Promise.all([fetchMyClaims({ limit: 50 }), fetchMyClaimSummary(), fetchMyBalances()])
    claims.value = list.items || []
    unlinked.value = !!list.unlinked || !!sum.unlinked
    summary.value = sum || {}
    balances.value = bal.items || []
  } finally { loading.value = false }
}
async function openClaim(c) { try { active.value = await fetchMyClaim(c.id) } catch { active.value = c } }
function onCreated() { wizard.value = false; load() }

onMounted(load)
</script>

<style scoped>
@import '@/styles/reimbursements-theme.css';

.ssr-root { position: relative; min-height: calc(100vh - 80px); padding: 10px 4px 48px; color: var(--rmb-text); overflow-x: clip; }

/* ── cinematic ambient backdrop ── */
.ssr-atmos { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: 26px; pointer-events: none; }
.ssr-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.ssr-orb.o1 { width: 460px; height: 460px; top: -150px; left: -70px; opacity: 0.2;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: ssr-drift1 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -30px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.ssr-orb.o2 { width: 400px; height: 400px; top: 38%; right: -90px; opacity: 0.15;
  background: radial-gradient(circle, rgba(45,212,191,0.85), transparent 70%); animation: ssr-drift2 30s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 20px), 0); }
.ssr-orb.o3 { width: 360px; height: 360px; bottom: -120px; left: 38%; opacity: 0.12;
  background: radial-gradient(circle, rgba(251,146,60,0.8), transparent 70%); animation: ssr-drift1 33s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 15px), calc((var(--my,0.5) - 0.5) * -10px), 0); }
.ssr-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 42px 42px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.ssr-scan { position: absolute; left: 0; right: 0; top: 0; height: 28%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.035), transparent); }
.ssr-root > :not(.ssr-atmos) { position: relative; z-index: 1; }

/* ── unlinked banner ── */
.ssr-unlinked { display: flex; align-items: center; gap: 11px; padding: 13px 16px; margin-bottom: 16px; border-radius: 14px;
  font-size: 13px; color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft);
  border: 1px solid color-mix(in srgb, var(--rmb-st-returned) 30%, transparent); }
.ul-ic { display: grid; place-items: center; flex: 0 0 auto; }

/* ── blocks ── */
.ssr-block { margin-top: 30px; }
.block-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.bh-left { display: flex; flex-direction: column; gap: 3px; }
.bh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--rmb-st-returned); }
.block-head h3 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.bh-meta { font-size: 11px; color: var(--rmb-text-muted); }

/* ── segmented control (sliding pill) ── */
.seg { position: relative; display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 0; padding: 4px; border-radius: 12px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.seg-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--n)); border-radius: 9px;
  background: var(--hr-gradient-hero); box-shadow: 0 6px 16px -8px rgba(251,146,60,0.6);
  transform: translateX(calc(var(--i) * 100%)); transition: transform 0.42s var(--rmb-spring); }
.seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; padding: 7px 12px; white-space: nowrap;
  color: var(--rmb-text-secondary); transition: color 0.25s; }
.seg-btn.on { color: #1a1206; }
[data-theme="light"] .seg-btn.on { color: #2a1a06; }
.seg-n { font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--rmb-surface-elevated); color: var(--rmb-text-muted); }
.seg-btn.on .seg-n { background: rgba(26,18,6,0.18); color: #1a1206; }

/* ── ledger ── */
.ledger { position: relative; border-radius: 18px; padding: 16px; border: 1px solid var(--rmb-border-soft); overflow: hidden; }
.ledger-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--hr-gradient-ambient); background-size: 220% 100%;
  animation: rmb-perforation-shimmer 7s linear infinite; opacity: 0.5; }
.slips { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 13px; }
.slip-skel { height: 132px; border-radius: 12px; }

/* slip list transitions (filter swaps) */
.slip-list-enter-active { transition: all 0.5s var(--rmb-spring); }
.slip-list-leave-active { transition: all 0.32s var(--rmb-ease); position: absolute; width: 100%; }
.slip-list-enter-from { opacity: 0; transform: translateY(16px) scale(0.97); }
.slip-list-leave-to { opacity: 0; transform: scale(0.96); }
.slip-list-move { transition: transform 0.45s var(--rmb-spring); }

/* ── insights ── */
.ins-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; }
@media (max-width: 900px) { .ins-grid { grid-template-columns: 1fr; } }
.card { position: relative; background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); border-radius: 18px; padding: 16px 18px; overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s; box-shadow: var(--rmb-card-shadow); }
.card:hover { border-color: var(--rmb-border-strong); transform: translateY(-2px); box-shadow: var(--rmb-card-shadow-hover); }
.card > :not(.card-sheen):not(.rmb-spotlight) { position: relative; z-index: 1; }
.card-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit; transition: opacity 0.3s;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 12%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.card:hover .card-sheen { opacity: 1; animation: card-sheen 1.1s var(--rmb-ease) 1; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-size: 11px; color: var(--rmb-amber); }
.card-head h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--rmb-text); }

/* ── balances ── */
.bal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(218px, 1fr)); gap: 13px; }

/* ── keyframes ── */
@keyframes ssr-drift1 { 0%, 100% { translate: 0 0; } 50% { translate: 46px 36px; } }
@keyframes ssr-drift2 { 0%, 100% { translate: 0 0; } 50% { translate: -40px -28px; } }
@keyframes card-sheen { 0% { background-position: 130% 0; } 100% { background-position: -50% 0; } }

.ssr-fade-enter-active, .ssr-fade-leave-active { transition: opacity 0.4s, transform 0.4s; }
.ssr-fade-enter-from, .ssr-fade-leave-to { opacity: 0; transform: translateY(-8px); }

:root[data-theme="light"] .ssr-orb.o1 { opacity: 0.14; }
:root[data-theme="light"] .ssr-orb.o2 { opacity: 0.1; }
:root[data-theme="light"] .ssr-orb.o3 { opacity: 0.09; }
:root[data-theme="light"] .card-sheen { background: linear-gradient(115deg, transparent 44%, rgba(255,255,255,0.55) 50%, transparent 56%); }

@media (prefers-reduced-motion: reduce) {
  .ssr-orb, .ledger-edge { animation: none !important; }
  .ssr-orb { transform: none !important; }
  .card:hover .card-sheen { animation: none; }
  .seg-pill { transition: none; }
}

@media (max-width: 560px) {
  .seg { width: 100%; }
  .slips { grid-template-columns: 1fr; }
}
</style>
