<template>
  <div class="cockpit" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="ck-atmos" aria-hidden="true">
      <span class="ck-orb o1" /><span class="ck-orb o2" /><span class="ck-orb o3" />
      <span class="ck-mesh" /><span class="rmb-grain" />
    </div>

    <!-- header -->
    <header class="ck-head reveal">
      <div class="ck-lead">
        <span class="ck-eyebrow"><Inbox :size="12" /> Decision desk · triage</span>
        <h3>Approval cockpit</h3>
        <span class="ck-sub rmb-mono"><span class="ck-live" />{{ queue.length }} awaiting · decide one, the next slides in</span>
      </div>
      <div class="ck-tools">
        <span class="kbd-hint"><kbd>A</kbd>pprove <kbd>T</kbd> return <kbd>R</kbd>eject <kbd>S</kbd>kip</span>
        <button class="ico-btn" :class="{ spin: refreshing }" @click="reload" title="Refresh queue"><RefreshCw :size="15" /></button>
      </div>
    </header>

    <!-- loading -->
    <div v-if="loading && !queue.length" class="ck-grid-skel">
      <div class="rmb-skel" style="height:420px;border-radius:22px" />
      <div class="rmb-skel" style="height:420px;border-radius:16px" />
    </div>

    <!-- cleared! -->
    <div v-else-if="!queue.length" class="ck-clear">
      <div class="clear-ring"><CheckCheck :size="40" /></div>
      <h4>Queue is clear</h4>
      <p>{{ reviewedCount > 0 ? `You cleared ${reviewedCount} claim${reviewedCount === 1 ? '' : 's'} this session.` : 'No claims are waiting on your decision right now.' }}</p>
    </div>

    <!-- the cockpit -->
    <div v-else class="ck-grid">
      <div class="ck-stage-wrap">
        <RmbApprovalStage v-if="current" :key="current.id" :claim="current" :phase="phase" :verdict="verdict" :busy="busy" :can-skip="canSkip"
          @decide="act" @details="openDrawer" @skip="skip" />
      </div>
      <RmbQueueRail :items="queue" :active-id="current && current.id" :selected="selected" :locked="locked"
        :reviewed="reviewedCount" :total="sessionTotal" @focus="focusById" @toggle="toggleSelect" />
    </div>

    <!-- bulk action bar -->
    <transition name="bulk-pop">
      <div v-if="selected.size" class="bulkbar">
        <span class="bb-count rmb-mono">{{ selected.size }} selected</span>
        <button class="rmb-btn rmb-btn-primary sm" :disabled="busy" @click="bulk('APPROVED')"><CheckCircle2 :size="14" /> Approve all</button>
        <button class="rmb-btn rmb-btn-danger sm" :disabled="busy" @click="bulk('REJECTED')"><XCircle :size="14" /> Reject all</button>
        <button class="bb-clear" @click="clearSel"><X :size="15" /></button>
      </div>
    </transition>

    <ClaimDetailDrawer :claim="active" surface="admin" :can-act="true" @close="active = null" @action="onDrawerAction" />
    <ClaimActionModal v-if="actionModal" :claim="actionClaim" :action="actionModal" surface="admin"
      @close="actionModal = null" @done="onModalDone" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Inbox, RefreshCw, CheckCheck, CheckCircle2, XCircle, X } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useReimbursements, fetchClaim, decideClaim, bulkDecide, errText } from '@/composables/useReimbursements'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbApprovalStage from '../components/RmbApprovalStage.vue'
import RmbQueueRail from '../components/RmbQueueRail.vue'
import ClaimDetailDrawer from '../drawers/ClaimDetailDrawer.vue'
import ClaimActionModal from '../modals/ClaimActionModal.vue'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()
const { items, loading, fetchApprovalQueue } = useReimbursements()

const rootRef = ref(null)
usePointerSpotlight(rootRef)

const queue = ref([])
const focusIndex = ref(0)
const phase = ref('idle')        // idle | stamping | ejecting
const verdict = ref('')          // APPROVED | REJECTED | RETURNED
const busy = ref(false)
const selected = ref(new Set())
const reviewedCount = ref(0)
const refreshing = ref(false)

const active = ref(null)         // drawer claim (full)
const actionClaim = ref(null)    // modal claim
const actionModal = ref(null)    // 'reject' | 'return'

const current = computed(() => queue.value[focusIndex.value] || null)
// While deciding, or a modal/drawer is open, freeze focus so a decision can't retarget.
const locked = computed(() => busy.value || phase.value !== 'idle' || !!actionModal.value || !!active.value)
const sessionTotal = computed(() => reviewedCount.value + queue.value.length)

const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function reload() {
  refreshing.value = true
  try { await fetchApprovalQueue(1, 100); queue.value = [...items.value]; focusIndex.value = 0; selected.value = new Set() }
  catch (e) { toast.error(errText(e, 'Failed to load queue')) }
  finally { setTimeout(() => { refreshing.value = false }, 700) }
}

// ── focus navigation ──
const canSkip = computed(() => queue.value.length > 1)
// Click a queue row → focus it. Click the row that's already in focus → open its full dossier.
function focusById(id) {
  if (locked.value) return
  if (current.value && String(current.value.id) === String(id)) { openDrawer(); return }
  const i = queue.value.findIndex(c => c.id === id)
  if (i >= 0) focusIndex.value = i
}
function skip() {
  if (locked.value || !canSkip.value) return
  focusIndex.value = (focusIndex.value + 1) % queue.value.length
}
function step(dir) {
  if (locked.value || !queue.value.length) return
  focusIndex.value = (focusIndex.value + dir + queue.value.length) % queue.value.length
}

// ── decision flow ──
function act(kind) {
  if (locked.value || !current.value) return
  if (kind === 'approve') { runDecision('approve') }
  else { actionClaim.value = current.value; actionModal.value = kind }   // reject | return → modal collects note
}
function onModalDone() {
  const kind = actionModal.value
  actionModal.value = null
  runDecision(kind, true)          // API already executed by the modal
}
function onDrawerAction({ action }) {
  active.value = null
  if (['approve', 'reject', 'return'].includes(action)) setTimeout(() => act(action), 60)
}

async function runDecision(kind, viaModalDone = false) {
  const claim = current.value
  if (!claim) return
  const vmap = { approve: 'APPROVED', reject: 'REJECTED', return: 'RETURNED' }
  if (kind === 'approve' && !viaModalDone) {
    busy.value = true
    try { await decideClaim(claim.id, { decision: 'APPROVED' }) }
    catch (e) { toast.error(errText(e, 'Approve failed')); busy.value = false; return }
    busy.value = false
    toast.success('Claim approved')
  }
  if (reduced) { finishDecision(claim.id); return }
  verdict.value = vmap[kind]
  phase.value = 'stamping'
  await wait(600)
  phase.value = 'ejecting'
  await wait(480)
  finishDecision(claim.id)
}
function finishDecision(id) {
  // reset phase + splice + advance in a single synchronous tick (no flash on the next card)
  verdict.value = ''
  phase.value = 'idle'
  const idx = queue.value.findIndex(c => c.id === id)
  if (idx >= 0) {
    queue.value.splice(idx, 1)
    selected.value.delete(id); selected.value = new Set(selected.value)
  }
  if (focusIndex.value >= queue.value.length) focusIndex.value = Math.max(0, queue.value.length - 1)
  reviewedCount.value++
  emit('refresh-stats')
}

async function openDrawer() {
  if (!current.value) return
  try { active.value = await fetchClaim(current.value.id) } catch { active.value = current.value }
}

// ── bulk ──
function toggleSelect(id) {
  selected.value.has(id) ? selected.value.delete(id) : selected.value.add(id)
  selected.value = new Set(selected.value)
}
function clearSel() { selected.value = new Set() }
async function bulk(decision) {
  if (!selected.value.size) return
  busy.value = true
  const n = selected.value.size
  try {
    await bulkDecide({ ids: [...selected.value], decision })
    toast.success(`${decision === 'APPROVED' ? 'Approved' : 'Rejected'} ${n} claim${n === 1 ? '' : 's'}`)
    reviewedCount.value += n
    clearSel()
    await fetchApprovalQueue(1, 100); queue.value = [...items.value]
    if (focusIndex.value >= queue.value.length) focusIndex.value = Math.max(0, queue.value.length - 1)
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Bulk action failed')) }
  finally { busy.value = false }
}

// ── keyboard shortcuts ──
function onKey(e) {
  if (actionModal.value || active.value) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (!current.value) return
  const k = e.key.toLowerCase()
  if (t && t.tagName === 'BUTTON' && (k === 'enter' || k === ' ')) return  // let focused buttons act themselves
  if (k === 'a') { e.preventDefault(); act('approve') }
  else if (k === 'r') { e.preventDefault(); act('reject') }
  else if (k === 't') { e.preventDefault(); act('return') }
  else if (k === 's') { e.preventDefault(); skip() }
  else if (k === 'arrowdown' || k === 'j') { e.preventDefault(); step(1) }
  else if (k === 'arrowup' || k === 'k') { e.preventDefault(); step(-1) }
  else if (k === 'enter') { e.preventDefault(); openDrawer() }
}

onMounted(async () => {
  await reload()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.cockpit { position: relative; display: flex; flex-direction: column; gap: 16px; }

/* backdrop */
.ck-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.ck-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.ck-orb.o1 { width: 440px; height: 440px; top: -140px; left: -70px; opacity: 0.2;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: ck-drift1 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -30px), calc((var(--my,0.5) - 0.5) * -20px), 0); }
.ck-orb.o2 { width: 400px; height: 400px; top: 36%; right: -90px; opacity: 0.15;
  background: radial-gradient(circle, rgba(52,211,153,0.85), transparent 70%); animation: ck-drift2 29s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 20px), 0); }
.ck-orb.o3 { width: 360px; height: 360px; bottom: -120px; left: 38%; opacity: 0.12;
  background: radial-gradient(circle, rgba(248,113,113,0.7), transparent 70%); animation: ck-drift1 33s ease-in-out infinite reverse; }
.ck-mesh { position: absolute; inset: 0; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; -webkit-mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); }
.cockpit > :not(.ck-atmos) { position: relative; z-index: 1; }

/* header */
.ck-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.reveal { animation: ck-reveal 0.5s var(--rmb-spring) backwards; }
@keyframes ck-reveal { from { opacity: 0; transform: translateY(-10px); } }
.ck-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-st-returned); }
.ck-head h3 { margin: 3px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.ck-sub { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--rmb-text-muted); }
.ck-live { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-pending); animation: rmb-pulse-dot 2s ease-out infinite; }
.ck-tools { display: flex; align-items: center; gap: 12px; }
.kbd-hint { font-size: 10.5px; color: var(--rmb-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.kbd-hint kbd { font-family: var(--rmb-mono); font-size: 9.5px; padding: 1px 5px; border-radius: 5px; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.ico-btn { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.ico-btn:hover { color: var(--rmb-amber); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.ico-btn.spin :deep(svg) { animation: ck-spin 0.8s var(--rmb-ease); }

/* grid */
.ck-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
.ck-grid-skel { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; }
.ck-stage-wrap { min-height: 360px; }
@media (max-width: 940px) { .ck-grid, .ck-grid-skel { grid-template-columns: 1fr; } }

/* cleared state */
.ck-clear { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; text-align: center; }
.clear-ring { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; color: var(--rmb-st-approved);
  background: var(--rmb-st-approved-soft); border: 2px solid color-mix(in srgb, var(--rmb-st-approved) 40%, transparent);
  animation: clear-pop 0.7s var(--rmb-spring) both, clear-halo 3s ease-in-out 0.7s infinite; }
.ck-clear h4 { margin: 4px 0 0; font-size: 19px; color: var(--rmb-text); }
.ck-clear p { margin: 0; font-size: 13px; color: var(--rmb-text-muted); }

/* bulk bar */
.bulkbar { position: sticky; bottom: 16px; z-index: 6; align-self: center; display: inline-flex; align-items: center; gap: 10px;
  margin: 0 auto; padding: 10px 12px 10px 16px; border-radius: 16px;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur); border: 1px solid var(--rmb-border-strong); box-shadow: var(--rmb-glass-shadow); }
.bb-count { font-size: 12px; color: var(--rmb-text-secondary); }
.rmb-btn.sm { padding: 7px 12px; font-size: 12px; }
.bb-clear { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted); }
.bb-clear:hover { color: var(--rmb-text); }
.bulk-pop-enter-active { transition: transform 0.4s var(--rmb-spring), opacity 0.3s; }
.bulk-pop-leave-active { transition: transform 0.25s ease, opacity 0.2s; }
.bulk-pop-enter-from, .bulk-pop-leave-to { transform: translateY(16px) scale(0.96); opacity: 0; }

@keyframes ck-drift1 { 0%, 100% { translate: 0 0; } 50% { translate: 46px 36px; } }
@keyframes ck-drift2 { 0%, 100% { translate: 0 0; } 50% { translate: -40px -28px; } }
@keyframes ck-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes clear-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes clear-halo { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--rmb-st-approved) 30%, transparent); } 50% { box-shadow: 0 0 0 14px color-mix(in srgb, var(--rmb-st-approved) 0%, transparent); } }

:root[data-theme="light"] .ck-orb.o1 { opacity: 0.14; }
:root[data-theme="light"] .ck-orb.o2 { opacity: 0.11; }
:root[data-theme="light"] .ck-orb.o3 { opacity: 0.1; }

@media (prefers-reduced-motion: reduce) {
  .ck-orb, .ck-live, .clear-ring { animation: none !important; }
  .ck-orb { transform: none !important; }
}
</style>
