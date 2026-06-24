<template>
  <div class="rcon" :class="[`kind-${kind}`, { committing }]">
    <!-- ── FINANCE: live outstanding-dues readout (real-time check) ── -->
    <div v-if="kind === 'fin'" class="rcon-dues" :class="advAmount > 0 ? 'attn' : 'ok'">
      <span class="rd-ic"><component :is="advAmount > 0 ? AlertTriangle : Check" :size="15" /></span>
      <div class="rd-tx">
        <b>Live outstanding dues <span class="rd-live"><span class="rd-dot" /> live</span></b>
        <span>{{ advReadout }} <i v-if="advAmount > 0">· auto-recovered from the F&amp;F</i></span>
      </div>
      <component :is="Plane" :size="26" class="rd-bg" aria-hidden="true" />
    </div>

    <!-- ── target ledger: the real records this gate writes to ── -->
    <div class="rcon-ledger">
      <div class="rl-cap">
        <span class="rl-eyebrow"><Database :size="11" /> Live records console</span>
        <span class="rl-sub">writes to <b class="ex-mono">{{ tiles.length }}</b> {{ tiles.length === 1 ? 'record' : 'records' }} on seal</span>
      </div>
      <div class="rl-bus" aria-hidden="true"><span class="rl-bus-flow" /></div>
      <div class="rl-tiles">
        <div v-for="(tg, ti) in tiles" :key="tg.target" class="rtile" :class="{ on: tg.done }" :style="{ '--d': ti }">
          <span class="rtile-ic"><component :is="tg.icon" :size="14" /></span>
          <span class="rtile-name">{{ tg.target }}</span>
          <span class="rtile-state">
            <Check v-if="tg.done" :size="10" /><Dot v-else :size="14" />
            {{ tg.done ? 'ready' : 'pending' }}
          </span>
          <span class="rtile-pulse" aria-hidden="true" />
        </div>
      </div>
    </div>

    <!-- ── task cards: each maps a marked task → a real write ── -->
    <ul class="rcon-tasks">
      <Motion v-for="(t, i) in tasks" :key="t.key" as="li" class="rtask"
        :class="{ on: checks[i], danger: t.danger, committed: committing && checks[i] }" :style="{ '--d': i }"
        :initial="reduced ? false : { opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.32, delay: 0.04 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
        @click="$emit('toggle', i)">
        <span class="rt-conduit" aria-hidden="true"><span class="rt-spark" /></span>
        <button type="button" class="rt-node" :class="{ on: checks[i] }" @click.stop="$emit('toggle', i)" :aria-pressed="checks[i]">
          <svg viewBox="0 0 18 18" width="13" height="13"><polyline class="rt-tick" points="3.6,9.4 7.4,13.2 14.4,4.8" /></svg>
          <span class="rt-ring" aria-hidden="true" />
        </button>
        <div class="rt-main">
          <div class="rt-top">
            <span class="rt-ic" :class="{ danger: t.danger }"><component :is="t.icon" :size="13" /></span>
            <span class="rt-label">{{ t.label }}</span>
            <span class="rt-flow" aria-hidden="true"><ArrowRight :size="11" /></span>
            <span class="rt-target">{{ t.target }}</span>
          </div>
          <span class="rt-note">{{ t.note }}</span>
          <span v-if="t.live" class="rt-live"><component :is="t.liveIcon || Activity" :size="10" /> {{ t.live }}</span>
          <Motion v-if="t.danger && checks[i]" as="div" class="rt-warn"
            :initial="reduced ? false : { opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }"
            :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
            <AlertTriangle :size="12" />
            <span>This is irreversible-grade. {{ t.note }}</span>
          </Motion>
        </div>
      </Motion>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Database, Check, Dot, ArrowRight, AlertTriangle, Activity, LogOut, Wallet, ScrollText, Coins, Plane, Scale, BadgeCheck } from 'lucide-vue-next'
import { fmtINR } from '@/composables/useExit'

const props = defineProps({
  tasks: { type: Array, default: () => [] },   // [{ key, label, target, icon, danger, note }]
  checks: { type: Array, default: () => [] },  // booleans aligned by index
  kind: { type: String, default: 'records' },  // 'records' | 'ff' | 'fin'
  caseInfo: { type: Object, default: null },
  signal: { type: Object, default: null },     // live system_signal (fin: {amount,count})
  committing: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['toggle'])

const LC_LABEL = {
  ON_NOTICE: 'On notice', ACTIVE: 'Active', SUSPENDED: 'Suspended', ON_PROBATION: 'On probation',
  EXITED: 'Exited', ARCHIVED: 'Archived', INACTIVE: 'Inactive',
}
const lifecycleLabel = computed(() => {
  const s = props.caseInfo?.lifecycle_state
  return s ? (LC_LABEL[s] || s.replace(/_/g, ' ')) : '—'
})
const net = computed(() => Number(props.caseInfo?.settlement_net_amount || 0))
const netReadout = computed(() => {
  const n = net.value
  if (!n) return 'Net F&F · balanced'
  return n > 0 ? `${fmtINR(n)} payable to employee` : `${fmtINR(-n)} recoverable from employee`
})

// live outstanding travel advances (the "real-time" finance check)
const advAmount = computed(() => Number(props.signal?.amount || 0))
const advCount = computed(() => Number(props.signal?.count || 0))
const advReadout = computed(() => advAmount.value > 0
  ? `${fmtINR(advAmount.value)} · ${advCount.value} advance${advCount.value > 1 ? 's' : ''} (live)`
  : 'No travel advance outstanding')

// per-task live readout — what the record looks like after this write
const LIVE = computed(() => {
  const base = {
    hris_status: { live: 'Exit HRIS status → finalised', liveIcon: ScrollText },
    documents_archived: { live: 'Personnel file → archived', liveIcon: ScrollText },
    statutory_updated: { live: 'PF / ESI → updated', liveIcon: ScrollText },
    lifecycle_exited: { live: `${lifecycleLabel.value} → Exited`, liveIcon: LogOut },
    statement_shared: { live: 'F&F statement → shared', liveIcon: ScrollText },
    employee_acknowledged: { live: netReadout.value, liveIcon: Wallet },
    payout_confirmed: { live: 'Payout schedule → confirmed', liveIcon: Wallet },
  }
  if (props.kind === 'fin') {
    base.loan_balance_computed = { live: 'Loan / salary advance → loan recovery', liveIcon: Coins }
    base.advance_balance_computed = { live: advReadout.value, liveIcon: Plane }
    base.recovery_scheduled = { live: 'Scheduled into the Full & Final', liveIcon: Scale }
    base.employee_acknowledged = { live: 'Dues acknowledged', liveIcon: BadgeCheck }
  }
  return base
})
const tasks = computed(() => props.tasks.map(t => ({ ...t, ...(LIVE.value[t.key] || {}) })))

// distinct target tiles; a tile is "ready" when every task feeding it is checked
const tiles = computed(() => {
  const order = []
  const map = new Map()
  props.tasks.forEach((t, i) => {
    if (!map.has(t.target)) { map.set(t.target, { target: t.target, icon: t.icon, idx: [] }); order.push(t.target) }
    map.get(t.target).idx.push(i)
  })
  return order.map(k => {
    const tg = map.get(k)
    return { target: tg.target, icon: tg.icon, done: tg.idx.every(i => !!props.checks[i]) }
  })
})
</script>

<style scoped>
.rcon { display: flex; flex-direction: column; gap: 11px; }

/* finance live-dues banner */
.rcon-dues { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--ex-border-strong); }
.rcon-dues.ok { background: color-mix(in srgb, var(--ex-cleared) 8%, var(--ex-surface)); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.rcon-dues.attn { background: color-mix(in srgb, var(--ex-amber) 9%, var(--ex-surface)); border-color: var(--ex-amber-border); }
.rd-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; }
.rcon-dues.ok .rd-ic { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.rcon-dues.attn .rd-ic { color: var(--ex-amber); background: var(--ex-amber-soft); }
.rd-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; z-index: 1; }
.rd-tx b { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ex-text-muted); }
.rd-tx > span { font-size: 13px; font-weight: 800; color: var(--ex-text); }
.rd-tx i { font-style: normal; font-weight: 600; color: var(--ex-text-muted); }
.rd-live { display: inline-flex; align-items: center; gap: 4px; text-transform: none; letter-spacing: 0; font-size: 8.5px; font-weight: 850; padding: 1px 6px; border-radius: 999px; color: var(--ex-amber); background: var(--ex-amber-soft); }
.rcon-dues.ok .rd-live { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.rd-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; animation: rd-blink 1.4s ease-in-out infinite; }
.rd-bg { position: absolute; right: 10px; bottom: -6px; opacity: 0.12; color: var(--ex-text); transform: rotate(-12deg); }
@keyframes rd-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ── target ledger ── */
.rcon-ledger { position: relative; padding: 12px 13px 13px; border-radius: 15px; overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-violet) 7%, var(--ex-surface)), var(--ex-surface));
  border: 1px solid var(--ex-border-strong); }
.kind-ff .rcon-ledger { background: linear-gradient(180deg, color-mix(in srgb, var(--ex-cleared) 8%, var(--ex-surface)), var(--ex-surface)); }
.rl-cap { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.rl-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 850; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ex-violet); }
.kind-ff .rl-eyebrow { color: var(--ex-cleared); }
.rl-sub { font-size: 10.5px; font-weight: 650; color: var(--ex-text-muted); }
.rl-sub b { color: var(--ex-text); }
.rl-bus { position: relative; height: 2px; margin: 9px 0 10px; border-radius: 2px; overflow: hidden; background: var(--ex-border-strong); }
.rl-bus-flow { position: absolute; inset: 0; width: 38%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--ex-violet), transparent); animation: rl-bus 2.4s linear infinite; }
.kind-ff .rl-bus-flow { background: linear-gradient(90deg, transparent, var(--ex-cleared), transparent); }
@keyframes rl-bus { 0% { transform: translateX(-110%); } 100% { transform: translateX(360%); } }
.rl-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 7px; }
.rtile { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 8px 9px; border-radius: 11px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); transition: border-color 0.4s, background 0.4s, transform 0.3s var(--ex-spring); }
.rtile-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--ex-text-muted);
  background: var(--ex-steel-soft); border: 1px solid var(--ex-border); transition: all 0.4s; }
.rtile-name { font-size: 10.5px; font-weight: 780; color: var(--ex-text-secondary); line-height: 1.2; }
.rtile-state { display: inline-flex; align-items: center; gap: 2px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ex-text-dim); }
.rtile.on { border-color: color-mix(in srgb, var(--ex-cleared) 42%, transparent); background: color-mix(in srgb, var(--ex-cleared) 9%, var(--ex-surface-elevated)); }
.rtile.on .rtile-ic { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 35%, transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-cleared) 45%, transparent); }
.rtile.on .rtile-state { color: var(--ex-cleared); }
.rtile-pulse { position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit;
  background: radial-gradient(circle at 18px 18px, color-mix(in srgb, var(--ex-cleared) 40%, transparent), transparent 60%); }
.committing .rtile.on .rtile-pulse { animation: rtile-seal 0.7s ease-out calc(var(--d) * 0.1s) both; }
@keyframes rtile-seal { 0% { opacity: 0; transform: scale(0.7); } 40% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
.committing .rtile.on { transform: translateY(-2px); }

/* ── task cards ── */
.rcon-tasks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rtask { position: relative; display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px 11px 13px; border-radius: 14px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s, transform 0.25s var(--ex-spring); }
.rtask:hover { border-color: var(--ex-border-strong); transform: translateX(2px); }
.rtask.on { border-color: color-mix(in srgb, var(--ex-cleared) 38%, transparent); background: color-mix(in srgb, var(--ex-cleared) 7%, transparent); }
.rtask.danger.on { border-color: color-mix(in srgb, var(--ex-blocked) 42%, transparent); background: color-mix(in srgb, var(--ex-blocked) 8%, transparent); }
.rt-conduit { position: absolute; left: 23px; top: -8px; width: 2px; height: 8px; background: var(--ex-border-strong); overflow: hidden; }
.rtask:first-child .rt-conduit { display: none; }
.rt-spark { position: absolute; inset: 0; opacity: 0; background: var(--ex-cleared); }
.committing .rtask.on .rt-spark { animation: rt-spark 0.5s ease-out calc(var(--d) * 0.1s) both; }
@keyframes rt-spark { 0% { opacity: 0; transform: translateY(-100%); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(100%); } }

.rt-node { position: relative; display: grid; place-items: center; width: 24px; height: 24px; flex-shrink: 0; margin-top: 1px; border-radius: 8px; cursor: pointer;
  background: rgba(0, 0, 0, 0.26); border: 1.5px solid var(--ex-border-strong); transition: all 0.28s var(--ex-spring); }
[data-theme="light"] .rt-node { background: rgba(255, 250, 242, 0.82); }
.rt-node.on { background: var(--ex-cleared); border-color: var(--ex-cleared); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-cleared) 55%, transparent); }
.rtask.danger .rt-node.on { background: var(--ex-blocked); border-color: var(--ex-blocked); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-blocked) 55%, transparent); }
.rt-tick { fill: none; stroke: #07160f; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 22; stroke-dashoffset: 22; transition: stroke-dashoffset 0.32s ease 0.04s; }
.rtask.danger .rt-tick { stroke: #fff; }
.rt-node.on .rt-tick { stroke-dashoffset: 0; }
.rt-ring { position: absolute; inset: -3px; border-radius: 11px; border: 1.5px solid var(--ex-cleared); opacity: 0; }
.rtask.danger .rt-ring { border-color: var(--ex-blocked); }
.committing .rtask.on .rt-ring { animation: rt-ring 0.66s ease-out calc(var(--d) * 0.1s) both; }
@keyframes rt-ring { 0% { opacity: 0.9; transform: scale(0.85); } 100% { opacity: 0; transform: scale(1.7); } }

.rt-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rt-top { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.rt-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: var(--ex-violet);
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.rt-ic.danger { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.kind-ff .rt-ic { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.rt-label { font-size: 12.5px; font-weight: 720; color: var(--ex-text); }
.rt-flow { display: inline-flex; color: var(--ex-text-dim); }
.rtask.on .rt-flow { color: var(--ex-cleared); animation: rt-flow 1.4s ease-in-out infinite; }
@keyframes rt-flow { 0%, 100% { transform: translateX(0); opacity: 0.6; } 50% { transform: translateX(3px); opacity: 1; } }
.rt-target { font-size: 10px; font-weight: 800; letter-spacing: 0.03em; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  color: var(--ex-text-secondary); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.rtask.on .rt-target { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.rt-note { font-size: 11px; line-height: 1.4; color: var(--ex-text-muted); }
.rt-live { display: inline-flex; align-items: center; gap: 4px; width: fit-content; font-size: 10px; font-weight: 750; font-family: var(--ex-mono); padding: 2px 7px; border-radius: 7px;
  color: var(--ex-text-secondary); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.rtask.on .rt-live { color: var(--ex-cleared); }
.rtask.danger.on .rt-live { color: var(--ex-blocked); }
.rt-warn { display: flex; align-items: flex-start; gap: 7px; overflow: hidden; margin-top: 2px; padding: 8px 10px; border-radius: 10px; font-size: 11px; font-weight: 650; line-height: 1.4;
  color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.rt-warn svg { flex-shrink: 0; margin-top: 1px; }

@media (prefers-reduced-motion: reduce) {
  .rl-bus-flow, .rt-flow, .rtile-pulse, .rt-spark, .rt-ring, .rd-dot { animation: none !important; }
  .rt-tick { transition: none; } .rtask:hover { transform: none; }
}
</style>
