<template>
  <div class="rmb-settle" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="st-atmos" aria-hidden="true">
      <span class="st-orb o1" /><span class="st-orb o2" />
      <span class="st-grid" /><span class="st-scan" />
      <span class="rmb-spotlight" />
      <span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="st-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="st-head-l">
        <span class="st-eyebrow"><Wallet :size="12" /> Disbursement · settle queue</span>
        <h2>Settlement <span class="ink">Desk</span></h2>
        <span class="st-meta rmb-mono">
          <span class="st-live" />
          <RmbCountUp :value="queueCount" /> approved claim{{ queueCount === 1 ? '' : 's' }}
          <span class="st-sep">·</span> ₹<RmbCountUp :value="queueValue" /> queued
        </span>
      </div>
      <div class="st-head-r">
        <div class="st-view" role="tablist" aria-label="View mode">
          <span class="st-view-pill" :style="{ transform: `translateX(${view === 'list' ? '100%' : '0'})` }" aria-hidden="true" />
          <button :class="{ on: view === 'grid' }" @click="view = 'grid'" aria-label="Grid view"><LayoutGrid :size="15" /></button>
          <button :class="{ on: view === 'list' }" @click="view = 'list'" aria-label="List view"><Rows3 :size="15" /></button>
        </div>
        <span class="st-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="st-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh queue"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ── disbursement console ── -->
    <Motion as="section" class="st-console"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <span class="stc-sheen" aria-hidden="true" />
      <div class="stc-grid">
        <!-- left: headline disbursement -->
        <div class="stc-lead">
          <span class="stc-lbl">Total to disburse</span>
          <div class="stc-big"><RmbMoneyValue :value="queueValue" :decimals="0" tone="positive" /></div>
          <span class="stc-sub rmb-mono">across {{ queueCount }} approved claim{{ queueCount === 1 ? '' : 's' }}</span>
        </div>
        <!-- right: mini KPIs -->
        <div class="stc-kpis">
          <div class="stc-kpi"><span class="kpi-lbl">Largest</span><b class="money"><RmbMoneyValue :value="largest" :decimals="0" /></b></div>
          <div class="stc-kpi"><span class="kpi-lbl">Average</span><b class="money"><RmbMoneyValue :value="avgValue" :decimals="0" /></b></div>
          <div class="stc-kpi"><span class="kpi-lbl">Categories</span><b><RmbCountUp :value="byCategory.length" /></b></div>
        </div>
      </div>

      <!-- flowing disbursement meter with coin sparks -->
      <div class="stc-meter">
        <span class="coins" aria-hidden="true"><i v-for="n in 8" :key="n" :style="coinStyle(n)" /></span>
        <div class="meter-bar">
          <span v-for="seg in byCategory" :key="seg.key" class="meter-seg"
                :style="{ width: seg.pct + '%', background: seg.hex }" :title="`${seg.name}: ₹${seg.value.toLocaleString('en-IN')}`">
            <i class="seg-flow" />
          </span>
        </div>
        <div class="meter-legend">
          <span v-for="seg in byCategory.slice(0, 5)" :key="seg.key" class="legend">
            <i :style="{ background: seg.hex }" />{{ seg.name }} <b class="rmb-mono">₹{{ short(seg.value) }}</b>
          </span>
        </div>
      </div>
    </Motion>

    <!-- ── queue ── -->
    <div v-if="loading" class="st-queue" :class="view">
      <div v-for="i in 4" :key="i" class="rmb-skel set-skel"></div>
    </div>
    <div v-else-if="items.length" :key="feedSeq + '-' + view" class="st-queue" :class="view" @pointermove="onQueueMove">
      <Motion v-for="(c, i) in items" :key="c.id" as="article" class="st-card"
        :style="{ '--cat': catHex(c) }"
        :initial="{ opacity: 0, y: 20, filter: 'blur(6px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :whileHover="{ y: -4 }"
        :transition="{ duration: 0.5, delay: Math.min(i, 9) * 0.05, ease: [0.16, 1, 0.3, 1] }">
        <span class="card-glow" aria-hidden="true" />
        <span class="card-sheen" aria-hidden="true" />
        <span class="card-spine" aria-hidden="true" />

        <header class="card-top" @click="openClaim(c)">
          <span class="cat-dot" :style="{ background: catHex(c) }"></span>
          <span class="rmb-mono num">{{ c.claim_number }}</span>
          <RmbStatusStamp :status="c.status" />
        </header>

        <div class="card-meta" @click="openClaim(c)">
          <span class="card-emp">{{ c.employee_name || '—' }}</span>
          <span class="card-cat"><component :is="catMeta(c).icon" :size="12" /> {{ c.category_name || catMeta(c).label }}</span>
        </div>

        <div class="card-amt" @click="openClaim(c)">
          <span class="amt-lbl">To disburse</span>
          <RmbMoneyValue :value="c.approved_amount ?? c.amount" :decimals="0" tone="positive" />
        </div>

        <!-- payout flow rail: Approved → Disburse → Paid -->
        <div class="payout-rail" aria-hidden="true">
          <span class="pr-step done"><span class="pr-node"><Check :size="11" :stroke-width="3" /></span><small>Approved</small></span>
          <span class="pr-wire on"></span>
          <span class="pr-step mid"><span class="pr-node"><Wallet :size="11" /><span class="pr-ping" /></span><small>Disburse</small></span>
          <span class="pr-wire"></span>
          <span class="pr-step end"><span class="pr-node"><BadgeCheck :size="11" /></span><small>Paid</small></span>
        </div>

        <Motion as="button" class="st-settle" :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="settleFor(c)">
          <BadgeCheck :size="15" /> Settle now
        </Motion>
      </Motion>
    </div>
    <RmbEmptyState v-else :icon="Wallet" title="Nothing to settle"
                   subtitle="Approved claims will queue here for disbursement — payroll, bank or cash." />

    <ClaimDetailDrawer :claim="active" surface="admin" :can-act="false" @close="active = null" @action="onDrawerAction" />
    <SettleModal v-if="settleClaim" :claim="settleClaim" @close="settleClaim = null" @done="refreshAll" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { BadgeCheck, Wallet, RefreshCw, Check, LayoutGrid, Rows3 } from 'lucide-vue-next'
import { useReimbursements, fetchClaim, categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from '../components/RmbStatusStamp.vue'
import RmbMoneyValue from '../components/RmbMoneyValue.vue'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'
import ClaimDetailDrawer from '../drawers/ClaimDetailDrawer.vue'
import SettleModal from '../modals/SettleModal.vue'

const emit = defineEmits(['refresh-stats'])
const { items, loading, fetchSettlementQueue } = useReimbursements()

const rootRef = ref(null)
usePointerSpotlight(rootRef)

// per-card pointer glow — delegated on the queue container (no fragile refs)
const onQueueMove = (e) => {
  const card = e.target.closest?.('.st-card')
  if (!card) return
  const r = card.getBoundingClientRect()
  if (!r.width || !r.height) return
  card.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  card.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
}

const active = ref(null)
const settleClaim = ref(null)
const view = ref('grid')
const refreshing = ref(false)
const feedSeq = ref(0)

watch(items, () => { feedSeq.value++ })

const catHex = (c) => categoryMeta(c.category_code).hex
const catMeta = (c) => categoryMeta(c.category_code)
const displayAmt = (c) => Number(c.approved_amount ?? c.amount) || 0

const queueCount = computed(() => items.value.length)
const queueValue = computed(() => items.value.reduce((a, c) => a + displayAmt(c), 0))
const largest = computed(() => items.value.reduce((a, c) => Math.max(a, displayAmt(c)), 0))
const avgValue = computed(() => queueCount.value ? Math.round(queueValue.value / queueCount.value) : 0)

const byCategory = computed(() => {
  const map = new Map()
  for (const c of items.value) {
    const meta = categoryMeta(c.category_code)
    const cur = map.get(c.category_code) || { key: c.category_code, name: c.category_name || meta.label, hex: meta.hex, value: 0 }
    cur.value += displayAmt(c); map.set(c.category_code, cur)
  }
  const arr = [...map.values()].sort((a, b) => b.value - a.value)
  const tot = arr.reduce((a, s) => a + s.value, 0) || 1
  return arr.map(s => ({ ...s, pct: (s.value / tot) * 100 }))
})

const short = (n) => {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(Math.round(v))
}

// deterministic coin choreography (no Math.random)
const coinStyle = (n) => {
  const left = (n * 11.3) % 88 + 5
  const delay = ((n * 0.47) % 3.4).toFixed(2)
  const dur = (4 + (n % 3)).toFixed(1)
  return { left: left + '%', animationDelay: delay + 's', animationDuration: dur + 's' }
}

async function openClaim(c) { try { active.value = await fetchClaim(c.id) } catch { active.value = c } }
function settleFor(c) { settleClaim.value = c }
function onDrawerAction({ action, claim }) { if (action === 'settle') settleClaim.value = claim }
const refresh = () => {
  refreshing.value = true
  fetchSettlementQueue().finally(() => setTimeout(() => { refreshing.value = false }, 700))
}
async function refreshAll() { settleClaim.value = null; active.value = null; await fetchSettlementQueue(); emit('refresh-stats') }

onMounted(() => fetchSettlementQueue())
</script>

<style scoped>
.rmb-settle { position: relative; display: flex; flex-direction: column; gap: 16px;
  --set: var(--rmb-st-settled); --set-soft: var(--rmb-st-settled-soft); }
.rmb-settle > :not(.st-atmos) { position: relative; z-index: 1; }

/* ── backdrop (teal/money-out skin) ── */
.st-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.st-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.st-orb.o1 { width: 400px; height: 400px; top: -130px; left: -50px; opacity: 0.17;
  background: radial-gradient(circle, rgba(45,212,191,0.9), transparent 68%); animation: st-drift 25s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -30px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.st-orb.o2 { width: 340px; height: 340px; bottom: -120px; right: -30px; opacity: 0.12;
  background: radial-gradient(circle, rgba(52,211,153,0.85), transparent 70%); animation: st-drift 30s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.st-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.st-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(45,212,191,0.04), transparent); }
/* tint the inherited pointer-spotlight teal to match the settlement skin */
.rmb-settle .rmb-spotlight { background: radial-gradient(420px 320px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--set) 16%, transparent), transparent 60%); }

/* ── header ── */
.st-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.st-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--set); }
.st-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.st-head h2 .ink { background: linear-gradient(120deg, var(--rmb-st-settled), var(--rmb-st-approved)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.st-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.st-live { width: 6px; height: 6px; border-radius: 50%; background: var(--set); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.st-sep { opacity: 0.5; }
.st-head-r { display: flex; align-items: center; gap: 12px; }
.st-view { position: relative; display: inline-flex; padding: 4px; gap: 2px; border-radius: 12px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.st-view-pill { position: absolute; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px); border-radius: 8px;
  background: linear-gradient(135deg, var(--rmb-st-settled), var(--rmb-st-approved)); box-shadow: 0 6px 16px -8px var(--rmb-st-settled); transition: transform 0.32s var(--rmb-spring); }
.st-view button { position: relative; z-index: 1; width: 38px; height: 30px; display: grid; place-items: center; background: none; border: none; cursor: pointer; color: var(--rmb-text-muted); border-radius: 8px; transition: color 0.25s; }
.st-view button.on { color: #04201c; }
.st-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.st-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-st-settled), var(--rmb-st-approved)); animation: st-eq 1.1s ease-in-out infinite; }
.st-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.st-refresh:hover { color: var(--set); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.st-refresh.spin :deep(svg) { animation: st-spin 0.8s var(--rmb-ease); }

/* ── disbursement console ── */
.st-console { position: relative; overflow: hidden; padding: 18px 20px 16px; border-radius: 18px;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.stc-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; border-radius: inherit;
  background: radial-gradient(120% 120% at 8% -20%, color-mix(in srgb, var(--set) 14%, transparent), transparent 60%); }
.stc-grid { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.stc-lead { display: flex; flex-direction: column; gap: 3px; }
.stc-lbl { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); }
.stc-big :deep(.rmb-money-value) { font-size: 38px; letter-spacing: -0.02em; }
.stc-sub { font-size: 11px; color: var(--rmb-text-muted); }
.stc-kpis { display: flex; gap: 22px; }
.stc-kpi { display: flex; flex-direction: column; gap: 2px; }
.kpi-lbl { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.stc-kpi b { font-size: 16px; font-weight: 800; color: var(--rmb-text); }
.stc-kpi b.money :deep(.rmb-money-value) { font-size: 16px; }

/* flowing meter + coins */
.stc-meter { position: relative; margin-top: 16px; }
.coins { position: absolute; left: 0; right: 0; bottom: 14px; height: 40px; pointer-events: none; }
.coins i { position: absolute; bottom: 0; width: 5px; height: 5px; border-radius: 50%;
  background: var(--rmb-money); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--rmb-money) 70%, transparent);
  animation: rmb-spark-rise linear infinite; opacity: 0; }
.meter-bar { position: relative; display: flex; height: 12px; border-radius: 999px; overflow: hidden;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.meter-seg { position: relative; height: 100%; min-width: 3px; transition: width 0.8s var(--rmb-spring); overflow: hidden; }
.seg-flow { position: absolute; inset: 0; opacity: 0.45; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  background-size: 220% 100%; animation: rmb-amount-shimmer 2.4s linear infinite; }
.meter-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
.legend { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--rmb-text-muted); }
.legend i { width: 8px; height: 8px; border-radius: 3px; }
.legend b { color: var(--rmb-text); }

/* ── queue ── */
.st-queue { display: grid; gap: 14px; }
.st-queue.grid { grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
.st-queue.list { grid-template-columns: 1fr; }
.set-skel { height: 196px; border-radius: 16px; }

/* settlement card */
.st-card { position: relative; padding: 16px 18px 18px 22px; border-radius: 16px; overflow: hidden;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-soft); box-shadow: 0 10px 28px -18px rgba(0,0,0,0.6);
  transition: border-color 0.3s, box-shadow 0.3s; will-change: transform; }
.st-card:hover { border-color: color-mix(in srgb, var(--set) 40%, var(--rmb-border-soft));
  box-shadow: 0 24px 48px -24px color-mix(in srgb, var(--set) 45%, rgba(0,0,0,0.5)); }
.card-glow { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; border-radius: inherit; transition: opacity 0.4s ease;
  background: radial-gradient(360px 280px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--set) 18%, transparent), transparent 60%); }
.st-card:hover .card-glow { opacity: 1; }
.card-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-st-settled) 16%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.st-card:hover .card-sheen { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }
.card-spine { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--cat), color-mix(in srgb, var(--cat) 30%, transparent)); box-shadow: 0 0 12px -1px var(--cat); }
.st-card > :not(.card-glow):not(.card-sheen):not(.card-spine) { position: relative; z-index: 2; }

.card-top { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.cat-dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px -1px var(--cat); flex: 0 0 auto; }
.card-top .num { font-size: 12px; font-weight: 700; color: var(--rmb-text); flex: 1; letter-spacing: 0.5px; }
.card-meta { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; cursor: pointer; }
.card-emp { font-size: 13px; font-weight: 700; color: var(--rmb-text); }
.card-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--rmb-text-muted); }
.card-amt { display: flex; flex-direction: column; gap: 1px; margin-top: 12px; cursor: pointer; }
.amt-lbl { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); }
.card-amt :deep(.rmb-money-value) { font-size: 24px; }

/* payout flow rail */
.payout-rail { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin: 14px 0; }
.pr-step { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 0 0 auto; }
.pr-step small { font-size: 8.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--rmb-text-muted); }
.pr-node { position: relative; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: var(--rmb-surface); border: 1.5px solid var(--rmb-border-soft); color: var(--rmb-text-muted); }
.pr-step.done .pr-node { background: var(--rmb-st-approved-soft); border-color: transparent; color: var(--rmb-st-approved); }
.pr-step.done small { color: var(--rmb-st-approved); }
.pr-step.mid .pr-node { background: var(--set-soft); border-color: var(--set); color: var(--set); }
.pr-step.mid small { color: var(--set); }
.pr-ping { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid var(--set); animation: rmb-pulse-dot 1.8s ease-out infinite; }
.pr-wire { flex: 1; height: 2px; margin-top: 12px; border-radius: 2px; background: var(--rmb-perf-color); overflow: hidden; }
.pr-wire.on { background-image: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rmb-st-approved) 0%, white) 50%, transparent), linear-gradient(var(--rmb-st-approved), var(--rmb-st-approved));
  background-size: 220% 100%, 100% 100%; animation: rmb-amount-shimmer 1.8s linear infinite; }

/* settle CTA */
.st-settle { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 11px 14px; border-radius: 11px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; color: #04201c;
  background: linear-gradient(135deg, var(--rmb-st-settled), var(--rmb-st-approved));
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--set) 70%, transparent); }

/* ── keyframes ── */
@keyframes st-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes st-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes st-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ── light theme ── */
:root[data-theme="light"] .st-orb.o1 { opacity: 0.12; }
:root[data-theme="light"] .st-orb.o2 { opacity: 0.09; }
[data-theme="light"] .st-view button.on { color: #fff; }
[data-theme="light"] .st-settle { color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .st-orb, .st-eq i, .st-live, .coins i, .seg-flow, .pr-wire.on, .pr-ping { animation: none !important; }
  .st-orb { transform: none !important; }
  .st-card:hover .card-sheen { animation: none; }
}
@media (max-width: 620px) {
  .st-head h2 { font-size: 22px; }
  .stc-grid { align-items: flex-start; }
  .stc-kpis { gap: 16px; }
}
</style>
