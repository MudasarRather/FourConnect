<template>
  <Teleport to="body">
    <Transition name="rmb-drawer">
      <div v-if="claim" class="rmb-drawer-overlay" @mousedown.self="$emit('close')">
        <aside class="rmb-drawer" :style="{ '--cat': catMeta.hex }" @mousedown.stop>
          <!-- ── hero header ── -->
          <header class="d-hero" ref="heroRef">
            <span class="dh-orb" aria-hidden="true" />
            <span class="dh-grid" aria-hidden="true" />
            <span class="rmb-spotlight" aria-hidden="true" />
            <span class="rmb-grain" aria-hidden="true" />
            <span class="dh-shimmer" aria-hidden="true" />

            <div class="dh-top">
              <span class="dh-cat"><component :is="catMeta.icon" :size="13" /> {{ claim.category_name || catMeta.label }}</span>
              <button class="x" @click="$emit('close')" aria-label="Close"><X :size="17" /></button>
            </div>

            <div class="dh-id">
              <span class="cat-dot" :style="{ background: catMeta.hex }"></span>
              <span class="rmb-mono num">{{ claim.claim_number }}</span>
              <RmbStatusStamp :status="claim.status" fresh />
            </div>

            <div class="dh-emp" v-if="claim.employee_name || claim.department">
              <Motion as="span" class="dh-avatar"
                :initial="{ scale: 0, rotate: -20 }" :animate="{ scale: 1, rotate: 0 }"
                :transition="{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
                {{ initials }}
              </Motion>
              <span class="dh-emp-meta">
                <b>{{ claim.employee_name || 'You' }}</b>
                <small v-if="claim.department">{{ claim.department }}</small>
              </span>
            </div>

            <!-- headline amount -->
            <div class="dh-amount">
              <div class="dh-amt-main">
                <span class="dh-amt-lbl">{{ approvedDiffers ? 'Approved' : 'Amount claimed' }}</span>
                <RmbMoneyValue :value="headlineAmount" :decimals="0" :tone="approvedDiffers ? 'positive' : 'pending'" />
              </div>
              <div v-if="approvedDiffers" class="dh-amt-sub">
                <span class="dh-amt-lbl">Claimed</span>
                <span class="rmb-mono strike">₹ {{ fmt(claim.amount) }}</span>
              </div>
            </div>
          </header>

          <!-- ── scrollable body (re-staggers per claim) ── -->
          <div class="d-body" :key="claim.id">
            <!-- alerts -->
            <Motion v-if="claim.return_reason" as="div" class="d-alert returned"
              v-bind="reveal(0)"><Undo2 :size="15" /><span><b>Returned</b> · {{ claim.return_reason }}</span></Motion>
            <Motion v-if="claim.reject_reason" as="div" class="d-alert rejected"
              v-bind="reveal(0)"><XCircle :size="15" /><span><b>Rejected</b> · {{ claim.reject_reason }}</span></Motion>

            <!-- spec sheet -->
            <Motion as="section" class="d-card" v-bind="reveal(1)">
              <div class="dc-head"><span class="dc-num">01</span><h5>Expense details</h5></div>
              <div class="spec-grid">
                <div v-for="(sp, i) in specs" :key="i" class="spec">
                  <span class="spec-lbl">{{ sp.label }}</span>
                  <b :class="{ 'rmb-mono': sp.mono }">{{ sp.value }}</b>
                </div>
              </div>
              <template v-if="claim.description">
                <hr class="rmb-perf-line" />
                <p class="d-desc">{{ claim.description }}</p>
              </template>
            </Motion>

            <!-- pipeline rail -->
            <Motion as="section" class="d-card" v-bind="reveal(2)">
              <div class="dc-head"><span class="dc-num">02</span><h5>Pipeline</h5></div>
              <RmbStageTracker :claim="claim" vertical />
            </Motion>

            <!-- approval trail -->
            <Motion v-if="(claim.approval_steps || []).length" as="section" class="d-card" v-bind="reveal(3)">
              <div class="dc-head"><span class="dc-num">03</span><h5>Approval trail</h5></div>
              <ol class="timeline">
                <li v-for="(s, i) in claim.approval_steps" :key="i" :data-decision="s.decision || 'pending'">
                  <span class="tl-dot"></span>
                  <div class="tl-body">
                    <div class="tl-top"><b>{{ s.label }}</b><span class="tl-dec">{{ s.decision || (i === claim.current_step ? 'awaiting' : 'queued') }}</span></div>
                    <div class="tl-meta" v-if="s.decided_by_name || s.approver_name">
                      {{ s.decided_by_name || s.approver_name }}
                      <span v-if="s.decided_at">· {{ fmtDate(s.decided_at) }}</span>
                    </div>
                    <div class="tl-note" v-if="s.notes">"{{ s.notes }}"</div>
                  </div>
                </li>
              </ol>
            </Motion>

            <!-- settlement -->
            <Motion v-if="claim.settlement_method" as="section" class="d-card settle-card" v-bind="reveal(4)">
              <div class="dc-head"><span class="dc-num">04</span><h5>Settlement</h5><BadgeCheck :size="15" class="settle-ic" /></div>
              <div class="spec-grid">
                <div class="spec"><span class="spec-lbl">Method</span><b>{{ claim.settlement_method }}</b></div>
                <div class="spec" v-if="claim.settlement_number"><span class="spec-lbl">Settlement #</span><b class="rmb-mono">{{ claim.settlement_number }}</b></div>
                <div class="spec" v-if="claim.payroll_ref"><span class="spec-lbl">Payroll ref</span><b class="rmb-mono">{{ claim.payroll_ref }}</b></div>
              </div>
            </Motion>

            <!-- attachments -->
            <Motion v-if="(claim.attachments || []).length" as="section" class="d-card" v-bind="reveal(5)">
              <div class="dc-head"><span class="dc-num">05</span><h5>Receipts</h5><span class="dc-count">{{ claim.attachments.length }}</span></div>
              <div class="att-grid">
                <Motion v-for="(a, i) in claim.attachments" :key="i" as="a" class="att"
                  :href="fullUrl(a.file_url)" target="_blank" rel="noopener"
                  :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <span class="att-ic"><FileText :size="16" /></span>
                  <span class="att-name">{{ a.original_filename || 'receipt ' + (i + 1) }}</span>
                  <ExternalLink :size="13" class="att-go" />
                </Motion>
              </div>
            </Motion>
          </div>

          <!-- ── sticky action footer ── -->
          <Transition name="d-foot-fade">
            <footer class="d-foot" v-if="actions.length">
              <Motion v-for="(a, i) in actions" :key="a.key" as="button" class="rmb-btn" :class="a.cls"
                :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: 0.08 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
                @click="$emit('action', { action: a.key, claim })">
                <component :is="a.icon" :size="15" /> {{ a.label }}
              </Motion>
            </footer>
          </Transition>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, FileText, ExternalLink, CheckCircle2, XCircle, Undo2, BadgeCheck, RotateCcw } from 'lucide-vue-next'
import { API_BASE } from '@/utils/api'
import { categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from '../components/RmbStatusStamp.vue'
import RmbStageTracker from '../components/RmbStageTracker.vue'
import RmbMoneyValue from '../components/RmbMoneyValue.vue'

const props = defineProps({
  claim: { type: Object, default: null },
  surface: { type: String, default: 'admin' },   // admin | manager | self
  canAct: { type: Boolean, default: false },       // current stage actionable by this user
})
const emit = defineEmits(['close', 'action'])

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const catMeta = computed(() => categoryMeta(props.claim?.category_code))
const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
const fullUrl = (u) => (u && u.startsWith('http')) ? u : `${API_BASE}${u || ''}`
const pretty = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmtDate = (s) => { try { return new Date(s).toLocaleDateString() } catch { return s } }

// staggered section reveal helper
const reveal = (i) => ({
  initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: 0.12 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
})

const initials = computed(() => {
  const n = props.claim?.employee_name || 'You'
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U'
})

const approvedDiffers = computed(() =>
  props.claim?.approved_amount != null && Number(props.claim.approved_amount) !== Number(props.claim.amount))
const headlineAmount = computed(() =>
  approvedDiffers.value ? props.claim.approved_amount : (props.claim?.amount || 0))

const specs = computed(() => {
  const c = props.claim
  if (!c) return []
  const out = [{ label: 'Expense date', value: c.expense_date, mono: true }]
  if (c.vendor) out.push({ label: 'Vendor', value: c.vendor })
  if (c.cost_center) out.push({ label: 'Cost center', value: c.cost_center })
  for (const [k, v] of Object.entries(c.details || {})) { if (v) out.push({ label: pretty(k), value: v }) }
  return out
})

const actions = computed(() => {
  const c = props.claim
  if (!c) return []
  const out = []
  if (c.status === 'PENDING_APPROVAL' && props.canAct) {
    out.push({ key: 'approve', label: 'Approve', icon: CheckCircle2, cls: 'rmb-btn-primary' })
    out.push({ key: 'reject', label: 'Reject', icon: XCircle, cls: 'rmb-btn-danger' })
    out.push({ key: 'return', label: 'Return', icon: Undo2, cls: 'rmb-btn-ghost' })
  }
  if (props.surface === 'admin') {
    if (c.status === 'APPROVED') out.push({ key: 'settle', label: 'Settle', icon: BadgeCheck, cls: 'rmb-btn-primary' })
    if (['APPROVED', 'SETTLED', 'PAID'].includes(c.status)) out.push({ key: 'reverse', label: 'Reverse', icon: RotateCcw, cls: 'rmb-btn-ghost' })
  }
  return out
})

// Escape-to-close
const onKey = (e) => { if (e.key === 'Escape' && props.claim) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.rmb-drawer-overlay { position: fixed; inset: 0; z-index: 3900; display: flex; justify-content: flex-end;
  background: radial-gradient(120% 120% at 100% 50%, rgba(0,0,0,0.35), rgba(0,0,0,0.62)); backdrop-filter: blur(7px); }
[data-theme="light"] .rmb-drawer-overlay { background: radial-gradient(120% 120% at 100% 50%, rgba(40,25,10,0.18), rgba(40,25,10,0.42)); }

.rmb-drawer { position: relative; width: min(500px, 96vw); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border-left: 1px solid var(--rmb-border-strong); box-shadow: var(--rmb-glass-shadow); }

/* ── hero header ── */
.d-hero { position: relative; flex: 0 0 auto; padding: 18px 22px 20px; overflow: hidden;
  border-bottom: 1px solid var(--rmb-border-soft);
  background:
    radial-gradient(130% 120% at 100% 0%, color-mix(in srgb, var(--cat) 20%, transparent), transparent 60%),
    linear-gradient(160deg, var(--rmb-paper-elevated), var(--rmb-paper)); }
.d-hero > :not(.dh-orb):not(.dh-grid):not(.rmb-grain):not(.rmb-spotlight):not(.dh-shimmer) { position: relative; z-index: 2; }
/* sweeping highlight line across the header */
.dh-shimmer { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.55;
  background: linear-gradient(115deg, transparent 42%, color-mix(in srgb, var(--cat) 24%, transparent) 50%, transparent 58%);
  background-size: 260% 100%; background-position: 130% 0; animation: rmb-amount-shimmer 7s ease-in-out 0.8s infinite; }
.dh-orb { position: absolute; top: -90px; right: -60px; width: 240px; height: 240px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--cat) 55%, transparent), transparent 68%); filter: blur(34px);
  animation: rmb-aura-breathe 6s ease-in-out infinite; }
.dh-grid { position: absolute; inset: 0; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 28px 28px; -webkit-mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(110% 90% at 80% 0%, #000, transparent 72%); }

.dh-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.dh-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
  color: var(--cat); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--cat) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--cat) 30%, transparent); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.x:hover { color: var(--rmb-st-rejected); border-color: var(--rmb-border-strong); transform: rotate(90deg); }

.dh-id { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cat-dot { width: 11px; height: 11px; border-radius: 50%; box-shadow: 0 0 10px -1px var(--cat); }
.dh-id .num { font-size: 17px; font-weight: 800; color: var(--rmb-text); letter-spacing: 0.5px; }

.dh-emp { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
.dh-avatar { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto;
  font-size: 12px; font-weight: 800; color: #2a1a06; background: var(--hr-gradient-hero);
  box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--cat) 60%, rgba(0,0,0,0.4)); }
.dh-emp-meta { display: flex; flex-direction: column; line-height: 1.25; }
.dh-emp-meta b { font-size: 13.5px; color: var(--rmb-text); }
.dh-emp-meta small { font-size: 11px; color: var(--rmb-text-muted); }

.dh-amount { display: flex; align-items: flex-end; gap: 18px; margin-top: 18px; }
.dh-amt-main { display: flex; flex-direction: column; gap: 3px; }
.dh-amt-lbl { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); }
.dh-amt-main :deep(.rmb-money-value) { font-size: 32px; animation: dh-amt-glow 4.5s ease-in-out infinite; }
@keyframes dh-amt-glow { 0%, 100% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 22px color-mix(in srgb, var(--cat) 38%, transparent); } }
.dh-amt-sub { display: flex; flex-direction: column; gap: 3px; padding-bottom: 4px; }
.dh-amt-sub .strike { font-size: 13px; color: var(--rmb-text-muted); text-decoration: line-through; }

/* ── body ── */
.d-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 14px;
  background-image: repeating-linear-gradient(180deg, transparent 0 33px, color-mix(in srgb, var(--rmb-text) 3%, transparent) 33px 34px); }
.d-body::-webkit-scrollbar { width: 8px; }
.d-body::-webkit-scrollbar-track { background: transparent; }
.d-body::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 8px; }
.d-body::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--cat) 50%, var(--rmb-border-strong)); }

/* keep cards from being squished by the flex column (was clipping text via overflow:hidden) */
.d-alert, .d-card { flex: 0 0 auto; }

.d-alert { display: flex; align-items: flex-start; gap: 9px; padding: 11px 14px; border-radius: 12px; font-size: 12.5px; line-height: 1.45; }
.d-alert b { font-weight: 700; }
.d-alert.returned { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); border: 1px solid color-mix(in srgb, var(--rmb-st-returned) 30%, transparent); }
.d-alert.rejected { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--rmb-st-rejected) 30%, transparent); }

/* ── cards ── */
.d-card { position: relative; padding: 15px 16px; border-radius: 14px; overflow: hidden;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow);
  transition: border-color 0.3s, box-shadow 0.3s; }
.d-card:hover { border-color: color-mix(in srgb, var(--cat) 38%, var(--rmb-border-soft));
  box-shadow: 0 18px 40px -26px color-mix(in srgb, var(--cat) 45%, rgba(0,0,0,0.5)); }
.d-card::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit; z-index: 3;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--cat) 14%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.d-card:hover::after { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }
.dc-head { position: relative; display: flex; align-items: center; gap: 9px; margin-bottom: 13px; padding-bottom: 11px; }
.dc-head::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--cat) 45%, transparent), transparent 65%); }
.dc-num { font-family: var(--rmb-mono); font-size: 10px; color: var(--cat); opacity: 0.85; }
.dc-head h5 { margin: 0; flex: 1; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rmb-text-muted); }
.dc-count { font-family: var(--rmb-mono); font-size: 11px; color: var(--rmb-text); background: var(--rmb-surface);
  border: 1px solid var(--rmb-border-soft); border-radius: 999px; padding: 1px 8px; }
.settle-ic { color: var(--rmb-st-settled); }
.settle-card { border-color: color-mix(in srgb, var(--rmb-st-settled) 28%, var(--rmb-border-soft)); }

.spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.spec { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.spec-lbl { font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--rmb-text-muted); }
.spec b { font-size: 13px; color: var(--rmb-text); font-weight: 600; word-break: break-word; }
.d-desc { margin: 0; font-size: 12.5px; color: var(--rmb-text); line-height: 1.55; }

/* ── timeline ── */
.timeline { list-style: none; margin: 0; padding: 0 0 0 6px; }
.timeline li { position: relative; padding: 0 0 16px 18px; border-left: 2px solid var(--rmb-border-soft); }
.timeline li:last-child { padding-bottom: 0; border-left-color: transparent; }
.tl-dot { position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--rmb-text-muted);
  box-shadow: 0 0 0 3px var(--rmb-glass-deep); }
li[data-decision="APPROVED"] .tl-dot { background: var(--rmb-st-approved); }
li[data-decision="REJECTED"] .tl-dot { background: var(--rmb-st-rejected); }
li[data-decision="RETURNED"] .tl-dot { background: var(--rmb-st-returned); }
li[data-decision="SKIPPED"] .tl-dot { background: var(--rmb-st-cancelled); }
li[data-decision="pending"] .tl-dot { animation: rmb-pulse-dot 2s ease-in-out infinite; }
.tl-top { display: flex; justify-content: space-between; gap: 10px; }
.tl-top b { font-size: 13px; color: var(--rmb-text); }
.tl-dec { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--rmb-text-muted); }
.tl-meta { font-size: 11px; color: var(--rmb-text-muted); margin-top: 2px; }
.tl-note { font-size: 12px; color: var(--rmb-text-secondary); font-style: italic; margin-top: 4px;
  padding: 6px 10px; border-radius: 8px; background: var(--rmb-surface); border-left: 2px solid var(--cat); }

/* ── attachments ── */
.att-grid { display: flex; flex-direction: column; gap: 8px; }
.att { display: flex; align-items: center; gap: 11px; padding: 10px 13px; border-radius: 11px; font-size: 12.5px; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); text-decoration: none; }
.att:hover { color: var(--rmb-text); border-color: color-mix(in srgb, var(--cat) 45%, transparent); }
.att-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto;
  background: color-mix(in srgb, var(--cat) 14%, transparent); color: var(--cat); }
.att-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-go { opacity: 0.5; flex: 0 0 auto; }
.att:hover .att-go { opacity: 1; color: var(--cat); }

/* ── footer ── */
.d-foot { flex: 0 0 auto; display: flex; gap: 8px; flex-wrap: wrap; padding: 14px 22px;
  border-top: 1px solid var(--rmb-border-soft); background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur); }
.d-foot .rmb-btn { flex: 1; min-width: 96px; }

/* ── transitions ── */
.rmb-drawer-enter-active, .rmb-drawer-leave-active { transition: opacity 0.34s ease; }
.rmb-drawer-enter-active .rmb-drawer, .rmb-drawer-leave-active .rmb-drawer { transition: transform 0.42s var(--rmb-spring); }
.rmb-drawer-enter-from, .rmb-drawer-leave-to { opacity: 0; }
.rmb-drawer-enter-from .rmb-drawer, .rmb-drawer-leave-to .rmb-drawer { transform: translateX(100%); }
.d-foot-fade-enter-active, .d-foot-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.d-foot-fade-enter-from, .d-foot-fade-leave-to { opacity: 0; transform: translateY(8px); }

@media (prefers-reduced-motion: reduce) {
  .dh-orb, .dh-shimmer, li[data-decision="pending"] .tl-dot, .rmb-grain { animation: none !important; }
  .dh-amt-main :deep(.rmb-money-value) { animation: none !important; }
  .d-card:hover::after { animation: none; }
}
</style>
