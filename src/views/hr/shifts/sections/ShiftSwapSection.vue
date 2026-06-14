<template>
  <section class="swp">
    <!-- ═══════════ COMMAND BAR ═══════════ -->
    <Motion as="header" class="cmd" :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="cmd-glow" aria-hidden="true" />
      <span class="cmd-scan shift-scanline" aria-hidden="true" />

      <div class="cmd-relay"><ShiftSwapRelay :in-flight="inFlight" /></div>

      <div class="cmd-readout">
        <span class="eyebrow"><ArrowLeftRight :size="12" /> Peer exchange protocol</span>
        <h2>Shift Swap Requests</h2>
        <p>Request → peer accepts → manager approves → the two shifts are exchanged for that day. Approval writes the one-day assignments automatically.</p>

        <div class="readout-stats">
          <button class="rs" data-tone="gold" @click="setFilter('PENDING_PEER')">
            <span class="rs-ic"><Hourglass :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="counts.PENDING_PEER || 0" /></b><small>Awaiting peer</small></span>
          </button>
          <button class="rs" data-tone="warn" @click="setFilter('PENDING_MANAGER')">
            <span class="rs-ic"><ShieldQuestion :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="counts.PENDING_MANAGER || 0" /></b><small>Awaiting manager</small></span>
          </button>
          <button class="rs" data-tone="ok" @click="setFilter('APPROVED')">
            <span class="rs-ic"><CheckCheck :size="14" /></span>
            <span class="rs-meta"><b><ShiftCountUp :value="counts.APPROVED || 0" /></b><small>Exchanged</small></span>
          </button>
        </div>
      </div>

      <div class="cmd-actions">
        <button class="btn-primary" @click="showModal = true"><Plus :size="14" />New swap</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }" title="Refresh"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <!-- ═══════════ FILTER RAIL ═══════════ -->
    <div class="filters">
      <button v-for="f in FILTERS" :key="f.key" class="fpill" :class="{ on: filter === f.key }" @click="setFilter(f.key)">
        <span class="fpill-dot" :data-tone="f.tone" />
        {{ f.label }}<span v-if="counts[f.key || 'all'] != null" class="fcount">{{ counts[f.key || 'all'] }}</span>
      </button>
    </div>

    <!-- ═══════════ TICKETS ═══════════ -->
    <div class="list" v-if="visible.length">
      <Motion v-for="(s, i) in visible" :key="s.id" as="article" class="ticket" :data-state="stateClass(s.status)"
        :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.5, delay: Math.min(i * 0.05, 0.5), ease: [0.16, 1, 0.3, 1] }">
        <span v-if="s.status === 'PENDING_MANAGER'" class="ticket-aura" aria-hidden="true" />

        <!-- header: parties + status -->
        <div class="tk-top">
          <div class="party">
            <span class="party-av">{{ initials(s.requester_name) }}</span>
            <div class="party-id">
              <b>{{ s.requester_name || '—' }}</b>
              <span class="chip-shift">{{ s.requester_shift_code || 'no shift' }}</span>
            </div>
          </div>

          <div class="xfer" :class="{ done: s.status === 'APPROVED' }">
            <span class="xfer-date"><CalendarDays :size="11" /> {{ formatDate(s.swap_date) }}</span>
            <span class="xfer-ic"><ArrowLeftRight :size="16" /></span>
            <span class="xfer-cap">{{ s.status === 'APPROVED' ? 'exchanged' : 'will exchange' }}</span>
          </div>

          <div class="party right">
            <div class="party-id ar">
              <b>{{ s.counterparty_name || '—' }}</b>
              <span class="chip-shift alt">{{ s.counterparty_shift_code || 'no shift' }}</span>
            </div>
            <span class="party-av alt">{{ initials(s.counterparty_name) }}</span>
          </div>
        </div>

        <!-- relay pipeline -->
        <div class="pipe" :data-halt="isHalted(s.status)">
          <div class="pipe-track"><span class="pipe-fill" :style="{ width: pipePct(s) + '%' }" /></div>
          <div class="pipe-stages">
            <div v-for="(st, idx) in STAGES" :key="st.key" class="stage"
              :class="{ done: stageDone(s, idx), active: stageActive(s, idx), halt: isHalted(s.status) && stageActive(s, idx) }">
              <span class="stage-dot"><component :is="stageDone(s, idx) ? Check : (isHalted(s.status) && stageActive(s, idx) ? X : st.icon)" :size="11" /></span>
              <span class="stage-label">{{ isHalted(s.status) && stageActive(s, idx) ? haltLabel(s.status) : st.label }}</span>
            </div>
          </div>
        </div>

        <!-- footer: status + reason + actions -->
        <div class="tk-foot">
          <ShiftStatusPill :tone="swapStatusMeta(s.status).tone">{{ swapStatusMeta(s.status).label }}</ShiftStatusPill>
          <p v-if="s.reason" class="tk-reason" :title="s.reason">“{{ s.reason }}”</p>
          <span class="tk-ago">{{ relTime(s.created_at) }}</span>
          <span class="flex-spacer" />

          <div class="tk-actions">
            <button v-if="s.status === 'PENDING_PEER'" class="act ok" @click="act('accept', s)"><Check :size="13" /> Peer accept</button>
            <button v-if="s.status === 'PENDING_MANAGER' || s.status === 'PENDING_PEER'" class="act primary" @click="act('approve', s)"><ShieldCheck :size="13" /> Approve</button>
            <button v-if="['PENDING_PEER','PENDING_MANAGER'].includes(s.status)" class="act danger" @click="openDecision('reject', s)"><Ban :size="13" /> Reject</button>
            <button v-if="['PENDING_PEER','PENDING_MANAGER'].includes(s.status)" class="act ghost" @click="openDecision('withdraw', s)" title="Withdraw request"><Undo2 :size="13" /> Withdraw</button>
            <button v-if="s.status === 'APPROVED'" class="act ghost" @click="$emit('go', 'calendar')" title="View on shift calendar"><CalendarDays :size="13" /> View</button>
            <button class="act ghost icon" @click="openDecision('delete', s)" title="Delete request"><Trash2 :size="13" /></button>
          </div>
        </div>
      </Motion>
    </div>

    <ShiftEmptyState v-else-if="!loading" :icon="ArrowLeftRight"
      :title="filter ? 'Nothing in this lane' : 'No swap requests'"
      sub="Create a swap to exchange two employees' shifts for a day — peer accepts, manager approves, done.">
      <template #actions><button class="btn-primary" @click="showModal = true"><Plus :size="14" />New swap</button></template>
    </ShiftEmptyState>

    <ShiftSwapRequestModal :open="showModal" @close="showModal = false" @saved="reload" />
    <ShiftSwapDecisionModal :open="decision.open" :mode="decision.mode" :swap="decision.swap" :busy="decision.busy"
      @close="decision.open = false" @confirm="onDecisionConfirm" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ArrowLeftRight, Plus, RefreshCw, Check, ShieldCheck, X, Trash2, Undo2, Ban,
  CalendarDays, Hourglass, ShieldQuestion, CheckCheck, UserCheck, Send, Repeat,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftSwapRequestModal from '../modals/ShiftSwapRequestModal.vue'
import ShiftSwapDecisionModal from '../modals/ShiftSwapDecisionModal.vue'
import ShiftSwapRelay from '../components/ShiftSwapRelay.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { fetchSwaps, acceptSwap, approveSwap, rejectSwap, cancelSwap, deleteSwap, swapStatusMeta } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()
const allSwaps = ref([])
const loading = ref(false)
const showModal = ref(false)
const filter = ref('')
const decision = reactive({ open: false, mode: 'reject', swap: null, busy: false })

const FILTERS = [
  { key: '', label: 'All', tone: 'neutral' },
  { key: 'PENDING_PEER', label: 'Awaiting peer', tone: 'gold' },
  { key: 'PENDING_MANAGER', label: 'Awaiting manager', tone: 'warn' },
  { key: 'APPROVED', label: 'Exchanged', tone: 'ok' },
  { key: 'REJECTED', label: 'Rejected', tone: 'alert' },
]
const STAGES = [
  { key: 'req', label: 'Requested', icon: Send },
  { key: 'peer', label: 'Peer accept', icon: UserCheck },
  { key: 'mgr', label: 'Manager approve', icon: ShieldCheck },
  { key: 'done', label: 'Exchanged', icon: Repeat },
]

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const formatDate = (iso) => { if (!iso) return '—'; try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return iso } }
const relTime = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// `reached` = number of fully-completed stages. For live requests the next
// stage (index === reached) is the active one; for halted requests it's where
// the request stopped (the halt marker lands there).
const reached = (s) => {
  switch (s.status) {
    case 'PENDING_PEER': return 1                        // Requested done, awaiting Peer
    case 'PENDING_MANAGER': return 2                     // Requested+Peer done, awaiting Manager
    case 'APPROVED': return 4                            // all stages done
    case 'REJECTED': case 'CANCELLED': return s.peer_accepted ? 2 : 1
    default: return 0
  }
}
const isHalted = (st) => st === 'REJECTED' || st === 'CANCELLED'
const haltLabel = (st) => st === 'REJECTED' ? 'Rejected' : 'Withdrawn'
const stageDone = (s, idx) => idx < reached(s)
const stageActive = (s, idx) => idx === reached(s) && s.status !== 'APPROVED'
const pipePct = (s) => {
  if (s.status === 'APPROVED') return 100
  return Math.max(0, Math.min(100, ((reached(s) - 1) / (STAGES.length - 1)) * 100))
}
const stateClass = (st) => isHalted(st) ? 'halt' : (st === 'APPROVED' ? 'done' : 'live')

const counts = computed(() => {
  const c = { all: allSwaps.value.length }
  for (const s of allSwaps.value) c[s.status] = (c[s.status] || 0) + 1
  return c
})
const inFlight = computed(() => (counts.value.PENDING_PEER || 0) + (counts.value.PENDING_MANAGER || 0))
const visible = computed(() => filter.value ? allSwaps.value.filter(s => s.status === filter.value) : allSwaps.value)

const setFilter = (k) => { filter.value = filter.value === k ? '' : k }

const reload = async () => {
  loading.value = true
  try { const d = await fetchSwaps({ limit: 200 }); allSwaps.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load swaps') }
  finally { loading.value = false }
}
onMounted(reload)

// direct actions (no reason needed)
const act = async (kind, s) => {
  try {
    if (kind === 'accept') { await acceptSwap(s.id); toast.success('Peer accepted — awaiting manager') }
    else if (kind === 'approve') { await approveSwap(s.id); toast.success('Swap approved — shifts exchanged'); emit('refresh-stats') }
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
}

// reject / withdraw / delete go through the reason-capture modal
const openDecision = (mode, s) => { decision.mode = mode; decision.swap = s; decision.open = true }
const onDecisionConfirm = async (notes) => {
  const { mode, swap } = decision
  if (!swap) return
  decision.busy = true
  try {
    if (mode === 'reject') { await rejectSwap(swap.id, notes); toast.success('Swap rejected') }
    else if (mode === 'withdraw') { await cancelSwap(swap.id, notes); toast.success('Request withdrawn') }
    else if (mode === 'delete') { await deleteSwap(swap.id); toast.success('Swap deleted') }
    decision.open = false
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { decision.busy = false }
}
</script>

<style scoped>
.swp { display: flex; flex-direction: column; gap: 16px; }

/* ═══════════ COMMAND BAR ═══════════ */
.cmd { position: relative; display: grid; grid-template-columns: 340px 1fr auto; align-items: center; gap: 24px;
  padding: 22px 26px; border-radius: 24px; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border); }
.cmd-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.cmd-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.07), transparent); pointer-events: none;
  animation: shift-scanline 7s ease-in-out infinite; }
.cmd-relay { position: relative; z-index: 1; }
.cmd-readout { position: relative; z-index: 1; min-width: 0; }
.cmd-actions { position: relative; z-index: 1; display: flex; gap: 8px; align-self: flex-start; }

.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px;
  letter-spacing: 0.13em; text-transform: uppercase; color: var(--shift-amber-strong); }
.cmd-readout h2 { margin: 7px 0 5px; font-size: 23px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.cmd-readout p { margin: 0 0 14px; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 540px; }

.readout-stats { display: flex; flex-wrap: wrap; gap: 9px; }
.rs { display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2);
  transition: transform 0.2s var(--shift-ease), border-color 0.2s; }
.rs:hover { transform: translateY(-2px); border-color: var(--shift-border); }
.rs-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.rs[data-tone="warn"] .rs-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.rs[data-tone="ok"] .rs-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.rs-meta { display: flex; flex-direction: column; }
.rs-meta b { font-family: var(--shift-mono); font-size: 17px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.rs-meta small { font-size: 10px; color: var(--shift-text-muted); }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; transition: transform 0.2s var(--shift-ease), box-shadow 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(234,88,12,0.28); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 12px; border-radius: 10px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px;
  transition: transform 0.2s var(--shift-ease), border-color 0.2s; }
.btn-ghost:hover { transform: translateY(-2px); border-color: var(--shift-border); color: var(--shift-amber); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

/* ═══════════ FILTER RAIL ═══════════ */
.filters { display: flex; flex-wrap: wrap; gap: 8px; }
.fpill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-size: 12px; font-weight: 600;
  transition: border-color 0.18s, color 0.18s, transform 0.18s; }
.fpill:hover { transform: translateY(-1px); border-color: var(--shift-border); }
.fpill.on { background: rgba(251,191,36,0.12); border-color: var(--shift-amber); color: var(--shift-text); }
.fpill-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-text-dim); }
.fpill-dot[data-tone="gold"] { background: var(--shift-amber); }
.fpill-dot[data-tone="warn"] { background: var(--shift-ember); }
.fpill-dot[data-tone="ok"] { background: var(--shift-ok); }
.fpill-dot[data-tone="alert"] { background: var(--shift-alert); }
.fcount { font-family: var(--shift-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(251,191,36,0.16); color: var(--shift-amber); }

/* ═══════════ TICKETS ═══════════ */
.list { display: flex; flex-direction: column; gap: 12px; }
.ticket { position: relative; display: flex; flex-direction: column; gap: 14px; padding: 16px 18px; border-radius: 18px; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft);
  transition: transform 0.25s var(--shift-ease), border-color 0.25s, box-shadow 0.25s; }
.ticket:hover { transform: translateY(-3px); border-color: var(--shift-border); box-shadow: 0 16px 38px rgba(0,0,0,0.3); }
.ticket[data-state="done"] { border-color: color-mix(in srgb, var(--shift-ok) 26%, transparent); }
.ticket[data-state="halt"] { opacity: 0.78; }
.ticket-aura { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 80% at 50% 0%, var(--shift-warn-soft), transparent 58%); animation: tk-aura 2.8s ease-in-out infinite; }

.tk-top { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.party { display: flex; align-items: center; gap: 11px; min-width: 0; }
.party.right { justify-content: flex-end; }
.party-av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800;
  font-family: var(--shift-mono); flex-shrink: 0; background: radial-gradient(circle at 38% 32%, #fff4d6, #fbbf24 65%, #b45309); color: #2a1a05; }
.party-av.alt { background: radial-gradient(circle at 38% 32%, #ffe2c4, #fb923c 62%, #c2410c); color: #2a1205; }
.party-id { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.party-id.ar { align-items: flex-end; }
.party-id b { font-size: 13.5px; font-weight: 700; color: var(--shift-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chip-shift { align-self: flex-start; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px;
  background: rgba(251,191,36,0.13); color: var(--shift-amber); }
.party-id.ar .chip-shift { align-self: flex-end; }
.chip-shift.alt { background: rgba(251,146,60,0.14); color: var(--shift-ember); }

.xfer { display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; }
.xfer-date { display: inline-flex; align-items: center; gap: 4px; font-family: var(--shift-mono); font-size: 10px; color: var(--shift-text-muted); }
.xfer-ic { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--shift-amber);
  background: rgba(251,191,36,0.10); border: 1px solid var(--shift-border); animation: xfer-rock 3.4s ease-in-out infinite; }
.xfer.done .xfer-ic { color: var(--shift-ok); background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 30%, transparent); animation: none; }
.xfer-cap { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); font-family: var(--shift-mono); }

/* relay pipeline */
.pipe { position: relative; z-index: 1; padding: 2px 4px 0; }
.pipe-track { position: absolute; left: 6%; right: 6%; top: 13px; height: 2px; border-radius: 2px; background: rgba(148,163,184,0.18); }
.pipe-fill { display: block; height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--shift-amber), var(--shift-ember)); transition: width 0.9s var(--shift-ease); }
.pipe[data-halt="true"] .pipe-fill { background: linear-gradient(90deg, var(--shift-text-dim), var(--shift-alert)); }
.pipe-stages { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); }
.stage { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.stage-dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: var(--shift-text-dim);
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: all 0.3s var(--shift-ease); }
.stage.done .stage-dot { background: var(--shift-grad-cta); color: #1f1408; border-color: transparent; }
.stage.active .stage-dot { color: var(--shift-amber); border-color: var(--shift-amber); animation: shift-ring-pulse 2s ease-in-out infinite; }
.stage.halt .stage-dot { color: #fff; background: var(--shift-alert); border-color: var(--shift-alert); animation: none; }
.stage-label { font-size: 10px; font-family: var(--shift-mono); color: var(--shift-text-dim); text-align: center; }
.stage.done .stage-label, .stage.active .stage-label { color: var(--shift-text-2); }

/* footer */
.tk-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tk-reason { margin: 0; font-size: 11.5px; color: var(--shift-text-muted); font-style: italic; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-ago { font-family: var(--shift-mono); font-size: 10px; color: var(--shift-text-dim); }
.flex-spacer { flex: 1; }
.tk-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font-size: 11.5px; font-weight: 600;
  border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2);
  transition: transform 0.18s var(--shift-ease), border-color 0.18s, color 0.18s; }
.act:hover { transform: translateY(-1px); }
.act.icon { padding: 6px 8px; }
.act.primary { background: var(--shift-grad-cta); color: #1f1408; border: none; }
.act.ok { color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 28%, transparent); }
.act.ok:hover { background: var(--shift-ok-soft); }
.act.danger { color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 28%, transparent); }
.act.danger:hover { background: var(--shift-alert-soft); }
.act.danger.solid { background: var(--shift-alert); color: #fff; }
.act.ghost:hover { border-color: var(--shift-border); color: var(--shift-amber); }

@keyframes tk-aura { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
@keyframes xfer-rock { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }

@media (max-width: 980px) {
  .cmd { grid-template-columns: 1fr; }
  .cmd-relay { max-width: 420px; }
  .cmd-actions { align-self: stretch; }
}
@media (max-width: 640px) {
  .tk-top { grid-template-columns: 1fr; gap: 10px; }
  .party.right { justify-content: flex-start; }
  .party-id.ar { align-items: flex-start; }
  .party-id.ar .chip-shift { align-self: flex-start; }
  .xfer { flex-direction: row; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .pipe-fill { transition: none; } .ticket-aura, .xfer-ic, .stage.active .stage-dot { animation: none; }
}

/* ════════════════════════ LIGHT THEME OVERRIDES ════════════════════════ */
:root[data-theme="light"] .cmd-scan { background: linear-gradient(180deg, transparent, rgba(217,119,6,0.06), transparent); }
:root[data-theme="light"] .pipe-track { background: rgba(40,32,20,0.14); }
:root[data-theme="light"] .ticket:hover { box-shadow: 0 16px 34px rgba(40,32,20,0.13); }
:root[data-theme="light"] .rs-ic { background: rgba(217,119,6,0.14); color: var(--shift-amber-strong); }
:root[data-theme="light"] .stage.halt .stage-dot,
:root[data-theme="light"] .act.danger.solid { color: #fff; }
</style>
