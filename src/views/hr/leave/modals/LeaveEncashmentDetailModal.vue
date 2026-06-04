<template>
  <Teleport to="body">
    <transition name="ed">
      <div v-if="open && r" class="ed-scrim" @click.self="$emit('cancel')">
        <Motion class="ed-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 22, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="ed-guilloche" aria-hidden="true" />
          <span class="ed-coins" aria-hidden="true"><i v-for="n in 8" :key="n" :style="coinStyle(n)" /></span>

          <!-- ── Header ── -->
          <header class="ed-head">
            <div class="ed-brand">
              <span class="ed-brand-mark"><Banknote :size="17" /></span>
              <div>
                <span class="ed-eye leave-mono">ENCASHMENT · {{ r.fiscal_year }}</span>
                <span class="ed-ref leave-mono">{{ r.reference_no }}</span>
              </div>
            </div>
            <span class="ed-stamp" :data-s="r.status">{{ stampText(r.status) }}</span>
            <button class="ed-close" @click="$emit('cancel')"><X :size="14" /></button>
          </header>

          <div class="ed-body">
            <!-- employee + amount -->
            <div class="ed-top">
              <div class="ed-emp">
                <span class="ed-ava">{{ initials(r.employee_name) }}</span>
                <div class="ed-emp-info">
                  <span class="ed-emp-name">{{ r.employee_name }}</span>
                  <span class="ed-emp-meta leave-mono">{{ r.employee_code || '—' }}<template v-if="r.department_name"> · {{ r.department_name }}</template></span>
                </div>
              </div>
              <div class="ed-amount">
                <span class="ed-amt-eye leave-mono">PAYOUT</span>
                <span class="ed-amt"><i>₹</i>{{ inr(animatedAmount) }}</span>
              </div>
            </div>

            <!-- conversion breakdown -->
            <div class="ed-calc">
              <div class="ed-calc-cell">
                <span class="ed-calc-eye leave-mono">TYPE</span>
                <span class="ed-calc-val">{{ typeLabel }}</span>
              </div>
              <span class="ed-calc-op">·</span>
              <div class="ed-calc-cell">
                <span class="ed-calc-eye leave-mono">DAYS</span>
                <span class="ed-calc-val leave-mono">{{ r.days_requested }}</span>
              </div>
              <span class="ed-calc-op">×</span>
              <div class="ed-calc-cell">
                <span class="ed-calc-eye leave-mono">BASIC / MO</span>
                <span class="ed-calc-val leave-mono">₹{{ inr(r.basic_salary_snapshot) }}</span>
              </div>
              <span class="ed-calc-op">→</span>
              <div class="ed-calc-cell pay">
                <span class="ed-calc-eye leave-mono">AMOUNT</span>
                <span class="ed-calc-val leave-mono">₹{{ inr(r.amount) }}</span>
              </div>
            </div>
            <code class="ed-formula leave-mono">ƒ = {{ r.formula_used }}</code>

            <!-- ── Settlement timeline (the workflow) ── -->
            <section class="ed-flow">
              <span class="ed-flow-eye leave-mono">SETTLEMENT TRAIL</span>
              <ol class="ed-track">
                <li v-for="(st, i) in trail" :key="st.key" class="ed-node" :data-state="st.state">
                  <span class="ed-node-rail" v-if="i < trail.length - 1" :data-done="st.state === 'done'" />
                  <span class="ed-node-dot">
                    <component :is="st.icon" :size="13" />
                    <span v-if="st.state === 'current'" class="ed-node-pulse" />
                  </span>
                  <div class="ed-node-body">
                    <div class="ed-node-head">
                      <span class="ed-node-title">{{ st.title }}</span>
                      <span class="ed-node-when leave-mono">{{ st.when }}</span>
                    </div>
                    <span class="ed-node-sub">{{ st.sub }}</span>
                    <p v-if="st.note" class="ed-node-note">“{{ st.note }}”</p>
                  </div>
                </li>
              </ol>
            </section>

            <div v-if="r.request_notes" class="ed-block">
              <span class="ed-block-eye leave-mono"><Quote :size="10" /> EMPLOYEE NOTE</span>
              <p>{{ r.request_notes }}</p>
            </div>
            <div v-if="r.payroll_ref" class="ed-payref leave-mono"><Hash :size="11" /> Payroll reference · {{ r.payroll_ref }}</div>
          </div>

          <!-- ── Footer — act from the detail view ── -->
          <footer class="ed-foot">
            <button class="leave-btn leave-btn-sm" @click="$emit('cancel')">Close</button>
            <template v-if="r.status === 'PENDING'">
              <button class="leave-btn leave-btn-sm leave-btn-danger" @click="$emit('reject', r)"><X :size="12" /> Reject</button>
              <button class="leave-btn leave-btn-sm leave-btn-primary" @click="$emit('sanction', r)"><Check :size="12" /> Sanction</button>
            </template>
            <button v-else-if="r.status === 'APPROVED'" class="leave-btn leave-btn-sm leave-btn-primary" @click="$emit('disburse', r)">
              <Banknote :size="12" /> Disburse
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Banknote, Check, Quote, Hash, Send, Gavel, Wallet, XCircle, UserCheck,
} from 'lucide-vue-next'
import { LEAVE_TYPE_BY_KEY } from '@/composables/useLeaves'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
})
defineEmits(['cancel', 'sanction', 'reject', 'disburse'])

const r = computed(() => props.request)

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const typeLabel = computed(() => r.value ? (LEAVE_TYPE_BY_KEY[r.value.leave_type]?.label || r.value.leave_type) : '')
const stampText = (s) => ({ PENDING: 'PENDING', APPROVED: 'SANCTIONED', PAID: 'PAID', REJECTED: 'REJECTED', CANCELLED: 'WITHDRAWN' }[s] || s)
const fmt = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// ── settlement trail (Requested → Manager → HR → Finance) ──
const trail = computed(() => {
  const x = r.value
  if (!x) return []
  const cancelled = x.status === 'CANCELLED'
  const rejected = x.status === 'REJECTED'
  const sanctioned = ['APPROVED', 'PAID'].includes(x.status)
  const paid = x.status === 'PAID'
  const mgr = x.manager_decision               // APPROVED | REJECTED | SKIPPED | null
  const mgrRejected = mgr === 'REJECTED'
  const hrRejected = rejected && !mgrRejected   // rejection happened at HR, not manager

  // Stage 1 — Requested
  const stReq = {
    key: 'req', icon: Send, title: cancelled ? 'Requested · withdrawn' : 'Requested',
    state: cancelled ? 'rejected' : 'done', when: fmt(x.created_at), sub: 'by employee', note: null,
  }

  // Stage 2 — Manager endorsement
  let stMgr
  if (mgr === 'SKIPPED') {
    stMgr = { key: 'mgr', icon: UserCheck, title: 'Manager endorsement', state: 'skipped',
      when: '—', sub: 'no reporting manager — routed to HR', note: null }
  } else if (mgrRejected) {
    stMgr = { key: 'mgr', icon: XCircle, title: 'Declined by manager', state: 'rejected',
      when: fmt(x.manager_decided_at), sub: x.manager_name ? `by ${x.manager_name}` : 'manager review', note: x.manager_notes }
  } else if (mgr === 'APPROVED') {
    stMgr = { key: 'mgr', icon: UserCheck, title: 'Manager endorsed', state: 'done',
      when: fmt(x.manager_decided_at), sub: x.manager_name ? `by ${x.manager_name}` : 'endorsed', note: x.manager_notes }
  } else if (x.status === 'PENDING_MANAGER') {
    stMgr = { key: 'mgr', icon: UserCheck, title: 'Manager endorsement', state: 'current',
      when: '—', sub: x.manager_name ? `awaiting ${x.manager_name}` : 'awaiting endorsement', note: null }
  } else {
    stMgr = { key: 'mgr', icon: UserCheck, title: 'Manager endorsement', state: 'skipped',
      when: '—', sub: 'not applicable', note: null }
  }

  // Stage 3 — HR sanction
  let stHr
  if (hrRejected) {
    stHr = { key: 'hr', icon: XCircle, title: 'Rejected by HR', state: 'rejected',
      when: fmt(x.decided_at), sub: x.decided_by_name ? `by ${x.decided_by_name}` : 'HR review', note: x.decision_notes }
  } else {
    const hrState = sanctioned ? 'done'
      : mgrRejected || cancelled ? 'skipped'
      : x.status === 'PENDING' ? 'current' : 'future'
    stHr = { key: 'hr', icon: Gavel, title: 'HR sanction', state: hrState,
      when: sanctioned ? fmt(x.decided_at) : '—',
      sub: sanctioned ? (x.decided_by_name ? `by ${x.decided_by_name} · balance locked` : 'balance locked')
        : hrState === 'current' ? 'awaiting sanction'
        : hrState === 'future' ? 'pending manager' : 'not reached',
      note: sanctioned ? x.decision_notes : null }
  }

  // Stage 4 — Finance disbursal
  const stPay = { key: 'pay', icon: Wallet, title: 'Finance disbursal',
    state: paid ? 'done' : (rejected || cancelled ? 'skipped' : (sanctioned ? 'current' : 'future')),
    when: paid ? fmt(x.paid_at) : '—',
    sub: paid ? (x.payroll_ref ? `payroll ref ${x.payroll_ref}` : 'disbursed')
      : (rejected || cancelled ? 'not reached' : (sanctioned ? 'ready to pay' : 'pending sanction')),
    note: null }

  return [stReq, stMgr, stHr, stPay]
})

// animated amount count-up on open
const animatedAmount = ref(0)
let raf = null
watch(() => props.open, (o) => {
  if (!o || !r.value) return
  if (raf) cancelAnimationFrame(raf)
  const to = Number(r.value.amount || 0)
  const start = performance.now(); const from = 0
  const step = (now) => {
    const t = Math.min(1, (now - start) / 650)
    animatedAmount.value = from + (to - from) * (1 - Math.pow(1 - t, 3))
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })

const coinStyle = (n) => ({
  left: `${(n * 47) % 92}%`, animationDuration: `${4 + (n % 4)}s`, animationDelay: `-${n * 0.6}s`,
  width: `${5 + (n % 3) * 2}px`, height: `${5 + (n % 3) * 2}px`,
})
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.ed-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.24), rgba(8, 8, 6, 0.6));
  backdrop-filter: blur(10px); padding: 20px;
}
.ed-card {
  position: relative; overflow: hidden auto; isolation: isolate;
  width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    linear-gradient(180deg, rgba(20, 15, 7, 0.97), rgba(13, 10, 6, 0.97));
  border: 1px solid rgba(251, 191, 36, 0.32);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .ed-card {
  background: radial-gradient(120% 60% at 100% 0%, rgba(251, 191, 36, 0.16), transparent 55%), rgba(255, 250, 240, 0.97);
  border-color: rgba(180, 83, 9, 0.24);
}
.ed-guilloche { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.45;
  background: radial-gradient(circle at 82% 14%, transparent 44px, rgba(251,191,36,0.06) 45px, transparent 46px),
    radial-gradient(circle at 18% 86%, transparent 54px, rgba(234,88,12,0.05) 55px, transparent 56px); }
.ed-coins { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.ed-coins i { position: absolute; top: -10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde047, #d97706 70%); box-shadow: 0 0 8px rgba(251,191,36,0.5); opacity: 0; animation: ed-coin-fall linear infinite; }
@keyframes ed-coin-fall { 0% { transform: translateY(0) rotate(0); opacity: 0; } 12% { opacity: 0.6; } 88% { opacity: 0.35; } 100% { transform: translateY(560px) rotate(360deg); opacity: 0; } }

.ed-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px; }
.ed-brand { display: flex; align-items: center; gap: 11px; flex: 1; min-width: 0; }
.ed-brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(217,119,6,0.2)); border: 1px solid rgba(251,191,36,0.45); color: #fef3c7; }
[data-theme="light"] .ed-brand-mark { color: #78350f; }
.ed-eye { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-muted); }
.ed-ref { display: block; font-size: 14px; font-weight: 800; color: var(--hr-text); margin-top: 2px; }
.ed-stamp { font-size: 9.5px; font-weight: 900; letter-spacing: 0.12em; padding: 5px 11px; border-radius: 7px; border: 1.5px solid currentColor; transform: rotate(-3deg); }
.ed-stamp[data-s="PENDING"] { color: var(--w-gold-400); }
.ed-stamp[data-s="APPROVED"] { color: var(--leave-brand); }
.ed-stamp[data-s="PAID"] { color: var(--w-gold-300); background: rgba(251,191,36,0.1); }
.ed-stamp[data-s="REJECTED"] { color: var(--leave-rejected); }
.ed-stamp[data-s="CANCELLED"] { color: var(--leave-cancelled); }
.ed-close { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--hr-border); background: transparent; color: var(--hr-text-muted); cursor: pointer; transition: transform .25s, color .2s; }
.ed-close:hover { transform: rotate(90deg); color: var(--leave-rejected); border-color: var(--leave-rejected); }

.ed-body { position: relative; padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 13px; }
.ed-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ed-emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ed-ava { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; background: linear-gradient(135deg, var(--leave-brand), var(--w-gold-500)); color: #2a1100; font-weight: 800; font-size: 12px; }
.ed-emp-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ed-emp-name { font-size: 14px; font-weight: 800; color: var(--hr-text); }
.ed-emp-meta { font-size: 10px; color: var(--hr-text-muted); }
.ed-amount { display: flex; flex-direction: column; align-items: flex-end; }
.ed-amt-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-approved); }
.ed-amt { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #f59e0b 60%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ed-amt i { font-style: normal; font-size: 20px; margin-right: 2px; }

.ed-calc { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 11px 13px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
[data-theme="light"] .ed-calc { background: rgba(255,250,240,0.6); border-color: rgba(180,83,9,0.14); }
.ed-calc-cell { display: flex; flex-direction: column; gap: 2px; }
.ed-calc-cell.pay { margin-left: auto; }
.ed-calc-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; color: var(--hr-text-muted); }
.ed-calc-val { font-size: 14px; font-weight: 800; color: var(--hr-text); }
.ed-calc-cell.pay .ed-calc-val { color: var(--leave-approved); }
.ed-calc-op { color: var(--hr-text-muted); font-weight: 700; }
.ed-formula { font-size: 10px; color: var(--hr-text-muted); padding-left: 2px; }

/* settlement trail */
.ed-flow { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; background: rgba(251,191,36,0.05); border: 1px solid color-mix(in srgb, var(--leave-approved) 22%, transparent); }
.ed-flow-eye { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-approved); }
.ed-track { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ed-node { position: relative; display: grid; grid-template-columns: 30px 1fr; gap: 11px; padding-bottom: 14px; }
.ed-node:last-child { padding-bottom: 0; }
.ed-node-rail { position: absolute; left: 14px; top: 28px; bottom: -2px; width: 2px; background: var(--hr-border); }
.ed-node-rail[data-done="true"] { background: linear-gradient(180deg, var(--leave-approved), color-mix(in srgb, var(--leave-approved) 30%, transparent)); }
.ed-node-dot { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.05); border: 1.5px solid var(--hr-border); color: var(--hr-text-muted); }
[data-theme="light"] .ed-node-dot { background: rgba(120,53,15,0.08); }
.ed-node[data-state="done"] .ed-node-dot { background: color-mix(in srgb, var(--leave-approved) 22%, transparent); border-color: var(--leave-approved); color: var(--leave-approved); }
.ed-node[data-state="current"] .ed-node-dot { background: color-mix(in srgb, var(--w-gold-400) 18%, transparent); border-color: var(--w-gold-400); color: var(--w-gold-400); }
.ed-node[data-state="rejected"] .ed-node-dot { background: var(--leave-rejected-soft); border-color: var(--leave-rejected); color: var(--leave-rejected); }
.ed-node[data-state="skipped"] .ed-node-dot, .ed-node[data-state="future"] .ed-node-dot { opacity: 0.5; }
.ed-node-pulse { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--w-gold-400); animation: ed-pulse 1.8s ease-out infinite; }
@keyframes ed-pulse { 0% { transform: scale(0.85); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
.ed-node-body { min-width: 0; padding-top: 4px; }
.ed-node-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ed-node-title { font-size: 12.5px; font-weight: 800; color: var(--hr-text); }
.ed-node[data-state="future"] .ed-node-title, .ed-node[data-state="skipped"] .ed-node-title { color: var(--hr-text-muted); font-weight: 700; }
.ed-node-when { font-size: 9px; color: var(--hr-text-muted); white-space: nowrap; }
.ed-node-sub { display: block; margin-top: 1px; font-size: 10.5px; color: var(--hr-text-muted); }
.ed-node-note { margin: 5px 0 0; padding: 5px 9px; border-radius: 7px; background: rgba(255,255,255,0.04); border-left: 2px solid color-mix(in srgb, var(--leave-approved) 35%, transparent); font-size: 11px; font-style: italic; color: var(--hr-text-secondary); }

.ed-block { padding: 10px 12px; border-radius: 11px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
[data-theme="light"] .ed-block { background: rgba(255,250,240,0.55); }
.ed-block-eye { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--hr-text-muted); }
.ed-block p { margin: 5px 0 0; font-size: 12px; line-height: 1.5; color: var(--hr-text-secondary); }
.ed-payref { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--w-gold-300); padding: 5px 10px; border-radius: 8px; background: rgba(251,191,36,0.1); align-self: flex-start; }
[data-theme="light"] .ed-payref { color: var(--w-gold-600); }

.ed-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid rgba(251,191,36,0.14); }

.ed-enter-active, .ed-leave-active { transition: opacity .25s; }
.ed-enter-from, .ed-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .ed-coins i, .ed-node-pulse { animation: none !important; } }
</style>
