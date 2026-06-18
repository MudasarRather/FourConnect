<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="wd-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="!loading && $emit('close')">

        <Motion class="wd-panel" as="div" role="alertdialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.95, filter: 'blur(12px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 16, scale: 0.97, filter: 'blur(8px)' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>

          <!-- ── header ── -->
          <header class="wd-head">
            <span class="wd-aura" aria-hidden="true" />
            <Motion as="span" class="wd-badge"
              :initial="{ scale: 0.4, rotate: 40, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ type: 'spring', stiffness: 320, damping: 15, delay: 0.06 }">
              <span class="wd-badge-ring" aria-hidden="true" />
              <Undo2 :size="21" />
            </Motion>
            <div class="wd-titles">
              <h3>Withdraw this request?</h3>
              <p>{{ req.request_number ? req.request_number + ' · ' : '' }}You can re-submit anytime.</p>
            </div>
            <button class="wd-x" :disabled="loading" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="wd-body">
            <!-- ── request capsule ── -->
            <Motion as="div" class="wd-capsule"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
              <span class="wd-cap-ic"><BookOpen :size="17" /></span>
              <div class="wd-cap-main">
                <span class="wd-cap-title">{{ req.title || 'Training request' }}</span>
                <span class="wd-cap-sub">
                  {{ req.program_name || req.external_provider || 'External / self-sourced' }}
                  <template v-if="req.estimated_cost != null"><i class="wd-dot" />{{ fmtMoney(req.estimated_cost) }}</template>
                </span>
              </div>
              <span class="wd-cap-stamp" :data-state="statusKey">{{ statusLabel }}</span>
            </Motion>

            <!-- ── approval workflow timeline ── -->
            <div v-if="nodes.length" class="wd-flow">
              <div class="wd-flow-head">
                <span class="wd-flow-eyebrow trn-mono"><GitBranch :size="12" /> APPROVAL WORKFLOW</span>
                <span class="wd-flow-meta">{{ decidedCount }}/{{ nodes.length }} stages acted</span>
              </div>

              <ul class="wd-rail">
                <Motion v-for="(n, i) in nodes" :key="i" as="li" class="wd-node" :class="n.state"
                  :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.4, delay: 0.2 + i * 0.09, ease: [0.16, 1, 0.3, 1] }">

                  <!-- connector to next stage -->
                  <Motion v-if="i < nodes.length - 1" as="span" class="wd-conn" :class="{ done: n.advanced }"
                    :initial="{ scaleY: 0 }" :animate="{ scaleY: 1 }"
                    :transition="{ duration: 0.35, delay: 0.3 + i * 0.09, ease: [0.16, 1, 0.3, 1] }" aria-hidden="true" />

                  <span class="wd-node-dot">
                    <component :is="n.icon" :size="13" />
                    <span v-if="n.state === 'active'" class="wd-node-pulse" aria-hidden="true" />
                  </span>

                  <div class="wd-node-body">
                    <div class="wd-node-top">
                      <span class="wd-node-label">{{ n.label }}</span>
                      <span class="wd-node-chip" :data-state="n.state">{{ n.chip }}</span>
                    </div>
                    <span class="wd-node-who">{{ n.who }}</span>
                    <span v-if="n.when" class="wd-node-when trn-mono">{{ n.when }}</span>
                    <p v-if="n.notes" class="wd-node-note">“{{ n.notes }}”</p>

                    <!-- "withdrawing stops here" marker on the active stage -->
                    <Presence>
                      <Motion v-if="n.state === 'active'" as="span" class="wd-stop"
                        :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }"
                        :transition="{ duration: 0.4, delay: 0.5 + i * 0.09 }">
                        <Hand :size="11" /> Withdrawing stops the request here
                      </Motion>
                    </Presence>
                  </div>
                </Motion>
              </ul>
            </div>

            <!-- draft (not yet routed) fallback -->
            <Motion v-else as="div" class="wd-draft-note"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
              <Clock :size="14" /> This request hasn’t entered the approval chain yet — withdrawing simply discards it.
            </Motion>

            <!-- ── what happens next ── -->
            <Motion as="div" class="wd-consq"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
              <span class="wd-consq-eyebrow trn-mono"><Info :size="12" /> WHAT HAPPENS</span>
              <ul>
                <Motion v-for="(c, i) in consequences" :key="i" as="li"
                  :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.34, delay: 0.42 + i * 0.07, ease: [0.16, 1, 0.3, 1] }">
                  <ArrowRight :size="13" /><span v-html="c" />
                </Motion>
              </ul>
            </Motion>
          </div>

          <!-- ── footer ── -->
          <footer class="wd-foot">
            <button class="trn-btn trn-btn-ghost" :disabled="loading" @click="$emit('close')">Keep request</button>
            <button class="wd-confirm" :disabled="loading" @click="!loading && $emit('confirm')">
              <Loader v-if="loading" :size="15" class="wd-spin" />
              <Undo2 v-else :size="15" />
              {{ loading ? 'Withdrawing…' : 'Withdraw request' }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Undo2, X, BookOpen, GitBranch, Check, Clock, CornerUpLeft, SkipForward,
  Hand, Info, ArrowRight, Loader, ClipboardCheck, UserCheck,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const req = computed(() => props.request || {})
const statusKey = computed(() => (req.value.status || 'PENDING_APPROVAL').toUpperCase())
const STATUS_LABELS = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', RETURNED: 'Returned',
  APPROVED: 'Approved', FULFILLED: 'Fulfilled', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
}
const statusLabel = computed(() => STATUS_LABELS[statusKey.value] || statusKey.value)

const fmtMoney = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtWhen = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const isFinalApproved = computed(() => ['APPROVED', 'FULFILLED'].includes(statusKey.value))

// Build the timeline nodes from the snapshotted approval_steps.
const nodes = computed(() => {
  const steps = req.value.approval_steps || []
  const cur = Number(req.value.current_step) || 0
  return steps.map((step, si) => {
    const dec = (step.decision || '').toUpperCase()
    const typeLabel = step.approver_type === 'HR' ? 'HR review' : 'Reporting manager'
    const label = step.label ? `${step.label} approval` : typeLabel
    let state, chip, icon, advanced
    if (dec === 'APPROVED') { state = 'ok'; chip = 'Approved'; icon = Check; advanced = true }
    else if (dec === 'REJECTED') { state = 'fail'; chip = 'Rejected'; icon = X; advanced = false }
    else if (dec === 'RETURNED') { state = 'warn'; chip = 'Returned'; icon = CornerUpLeft; advanced = false }
    else if (dec === 'SKIPPED') { state = 'skip'; chip = 'Skipped'; icon = SkipForward; advanced = true }
    else if (isFinalApproved.value) { state = 'ok'; chip = 'Approved'; icon = Check; advanced = true }
    else if (si === cur && statusKey.value === 'PENDING_APPROVAL') { state = 'active'; chip = 'Awaiting'; icon = Clock; advanced = false }
    else { state = 'pending'; chip = 'Upcoming'; icon = step.approver_type === 'HR' ? ClipboardCheck : UserCheck; advanced = false }
    return {
      state, chip, icon, advanced, label,
      who: step.approver_name || (step.approver_type === 'HR' ? 'HR team' : 'Your reporting manager'),
      when: dec ? fmtWhen(step.decided_at) : '',
      notes: step.notes || '',
    }
  })
})

const decidedCount = computed(() => nodes.value.filter(n => ['ok', 'fail', 'warn', 'skip'].includes(n.state)).length)
const activeNode = computed(() => nodes.value.find(n => n.state === 'active'))

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const consequences = computed(() => {
  const out = ['Your request moves to <b>Cancelled</b> and leaves the approval queue immediately.']
  if (activeNode.value) out.push(`<b>${esc(activeNode.value.who)}</b> will no longer see it awaiting their decision.`)
  if (decidedCount.value > 0) out.push('Approvers who already responded keep their record in the audit trail.')
  out.push('Nothing is charged or scheduled — you can submit a fresh nomination whenever you’re ready.')
  return out
})

// lock body scroll + esc-to-close
watch(() => props.open, (o) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = o ? 'hidden' : ''
}, { immediate: true })
const onKey = (e) => { if (e.key === 'Escape' && props.open && !props.loading) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.wd-overlay { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.64); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .wd-overlay { background: rgba(60, 40, 15, 0.32); }

.wd-panel { width: 100%; max-width: 500px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid color-mix(in srgb, var(--trn-ember) 24%, var(--trn-border-strong)); border-radius: 22px; box-shadow: var(--trn-glass-shadow); }

/* ── header ── */
.wd-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 20px 20px 16px; border-bottom: 1px solid var(--trn-border-soft); }
.wd-aura { position: absolute; top: -76px; left: -24px; width: 250px; height: 180px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.22), transparent 70%); animation: wd-aura 5.5s ease-in-out infinite; }
.wd-badge { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-ember) 36%, transparent); }
.wd-badge-ring { position: absolute; inset: -3px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--trn-ember) 42%, transparent); animation: wd-ring 2.4s ease-out infinite; }
.wd-titles { flex: 1; min-width: 0; }
.wd-titles h3 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); }
.wd-titles p { margin: 2px 0 0; font-size: 12px; color: var(--trn-text-muted); }
.wd-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer; transition: all 0.2s; }
.wd-x:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); transform: rotate(90deg); }
.wd-x:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── body ── */
.wd-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

/* request capsule */
.wd-capsule { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.wd-cap-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 26%, transparent); }
.wd-cap-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.wd-cap-title { font-size: 14px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wd-cap-sub { font-size: 11.5px; color: var(--trn-text-muted); display: inline-flex; align-items: center; }
.wd-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--trn-text-dim); margin: 0 7px; flex-shrink: 0; }
.wd-cap-stamp { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; padding: 4px 9px; border-radius: 999px;
  text-transform: uppercase; color: var(--trn-text-muted); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.wd-cap-stamp[data-state="PENDING_APPROVAL"] { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); border-color: color-mix(in srgb, var(--trn-amber) 30%, transparent); }
.wd-cap-stamp[data-state="RETURNED"] { color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 14%, transparent); border-color: color-mix(in srgb, var(--trn-ember) 30%, transparent); }
.wd-cap-stamp[data-state="DRAFT"] { color: var(--trn-text-muted); }

/* ── flow timeline ── */
.wd-flow { display: flex; flex-direction: column; gap: 12px; }
.wd-flow-head { display: flex; align-items: center; justify-content: space-between; }
.wd-flow-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--trn-text-dim); }
.wd-flow-eyebrow :deep(svg) { color: var(--trn-amber); }
.wd-flow-meta { font-size: 11px; color: var(--trn-text-muted); font-weight: 600; }

.wd-rail { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.wd-node { position: relative; display: grid; grid-template-columns: 28px 1fr; gap: 11px; padding-bottom: 14px; }
.wd-node:last-child { padding-bottom: 0; }

.wd-conn { position: absolute; left: 13.5px; top: 26px; bottom: -4px; width: 2px; border-radius: 2px;
  background: var(--trn-border-strong); transform-origin: top center; }
.wd-conn.done { background: linear-gradient(var(--trn-st-completed-hex), color-mix(in srgb, var(--trn-st-completed-hex) 40%, transparent)); }

.wd-node-dot { position: relative; z-index: 1; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-strong); color: var(--trn-text-dim); transition: all 0.25s; }
.wd-node.ok .wd-node-dot { color: var(--trn-st-completed-hex); background: color-mix(in srgb, var(--trn-st-completed-hex) 16%, transparent); border-color: color-mix(in srgb, var(--trn-st-completed-hex) 42%, transparent); }
.wd-node.active .wd-node-dot { color: #1a1206; background: var(--hr-gradient-hero); border-color: transparent; box-shadow: 0 4px 14px -4px rgba(251, 146, 60, 0.7); }
.wd-node.warn .wd-node-dot { color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 16%, transparent); border-color: color-mix(in srgb, var(--trn-ember) 42%, transparent); }
.wd-node.fail .wd-node-dot { color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 16%, transparent); border-color: color-mix(in srgb, var(--trn-st-failed) 42%, transparent); }
.wd-node-pulse { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--trn-amber) 55%, transparent); animation: wd-ring 2s ease-out infinite; }

.wd-node-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 2px; }
.wd-node-top { display: flex; align-items: center; gap: 8px; }
.wd-node-label { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.wd-node.pending .wd-node-label, .wd-node.skip .wd-node-label { color: var(--trn-text-muted); }
.wd-node-chip { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px;
  color: var(--trn-text-dim); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.wd-node-chip[data-state="ok"] { color: var(--trn-st-completed-hex); background: color-mix(in srgb, var(--trn-st-completed-hex) 14%, transparent); border-color: color-mix(in srgb, var(--trn-st-completed-hex) 30%, transparent); }
.wd-node-chip[data-state="active"] { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); border-color: color-mix(in srgb, var(--trn-amber) 32%, transparent); }
.wd-node-chip[data-state="warn"] { color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 14%, transparent); border-color: color-mix(in srgb, var(--trn-ember) 30%, transparent); }
.wd-node-chip[data-state="fail"] { color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 14%, transparent); border-color: color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.wd-node-who { font-size: 11.5px; color: var(--trn-text-muted); }
.wd-node-when { font-size: 10.5px; color: var(--trn-text-dim); }
.wd-node-note { margin: 2px 0 0; font-size: 11.5px; font-style: italic; color: var(--trn-text-muted); line-height: 1.45; }
.wd-stop { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; margin-top: 5px; font-size: 11px; font-weight: 650;
  padding: 4px 9px; border-radius: 8px; color: var(--trn-ember); background: color-mix(in srgb, var(--trn-ember) 12%, transparent);
  border: 1px dashed color-mix(in srgb, var(--trn-ember) 36%, transparent); }

/* draft fallback */
.wd-draft-note { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 12px; font-size: 12.5px; line-height: 1.5;
  color: var(--trn-text-secondary); background: color-mix(in srgb, var(--trn-amber) 7%, transparent); border: 1px dashed color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.wd-draft-note :deep(svg) { color: var(--trn-amber); flex-shrink: 0; }

/* consequences */
.wd-consq { display: flex; flex-direction: column; gap: 9px; padding: 14px 15px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.wd-consq-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--trn-text-dim); }
.wd-consq-eyebrow :deep(svg) { color: var(--trn-amber); }
.wd-consq ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.wd-consq li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.wd-consq li :deep(svg) { color: var(--trn-amber); flex-shrink: 0; margin-top: 2px; }
.wd-consq li :deep(b) { color: var(--trn-text); font-weight: 700; }

/* ── footer ── */
.wd-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; border-top: 1px solid var(--trn-border-soft); }
.wd-confirm { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13.5px; font-weight: 650;
  padding: 10px 18px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; color: #fff;
  background: linear-gradient(135deg, #fb923c, #dc2626); box-shadow: 0 10px 26px -12px rgba(220, 38, 38, 0.66); transition: box-shadow 0.3s, transform 0.2s, opacity 0.2s; }
.wd-confirm:hover:not(:disabled) { box-shadow: 0 16px 34px -12px rgba(220, 38, 38, 0.82); transform: translateY(-1px); }
.wd-confirm::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%; transform: skewX(-18deg); opacity: 0;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.4), transparent); }
.wd-confirm:hover:not(:disabled)::after { animation: wd-sheen 0.9s ease; }
.wd-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.wd-spin { animation: trn-orbit-spin 0.9s linear infinite; }

@keyframes wd-aura { 0%, 100% { opacity: 0.5; transform: translate(0, 0) scale(1); } 50% { opacity: 1; transform: translate(14px, 6px) scale(1.16); } }
@keyframes wd-ring { 0% { transform: scale(0.9); opacity: 0.7; } 70%, 100% { transform: scale(1.3); opacity: 0; } }
@keyframes wd-sheen { 0% { left: -60%; opacity: 0; } 12% { opacity: 1; } 100% { left: 120%; opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .wd-aura, .wd-badge-ring, .wd-node-pulse { animation: none !important; }
  .wd-x:hover { transform: none; }
}
</style>
