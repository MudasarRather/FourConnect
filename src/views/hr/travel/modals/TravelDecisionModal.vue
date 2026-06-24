<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="tdm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="tdm trv-grain" :class="`tone-${decision.toLowerCase()}`"
          :initial="{ opacity: 0, y: 28, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }">
          <span class="tdm-topbar" aria-hidden="true" />
          <span class="tdm-aura" aria-hidden="true" />

          <header class="tdm-head">
            <span class="tdm-ico"><Stamp :size="19" /></span>
            <div class="tdm-htext">
              <h3>Clearance control</h3>
              <p class="tdm-ref trv-mono">{{ request?.travel_reference_number }} · {{ request?.employee_name }}</p>
            </div>
            <button class="tdm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="tdm-scroll">
            <!-- ░░ live clearance ticket ░░ -->
            <div class="ticket">
              <span class="tk-perf left" aria-hidden="true" />
              <span class="tk-perf right" aria-hidden="true" />
              <!-- "cleared" wash that sweeps once on approve -->
              <Presence>
                <Motion v-if="decision === 'APPROVED'" :key="'wash'" class="tk-wash" aria-hidden="true"
                  :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.4 }" />
              </Presence>

              <div class="tk-route">
                <div class="tk-end">
                  <span class="tk-code trv-mono">{{ code(request?.from_location) }}</span>
                  <span class="tk-place">{{ request?.from_location || '—' }}</span>
                </div>
                <div class="tk-mid">
                  <span class="tk-dash" /><Plane :size="14" class="tk-mid-plane" /><span class="tk-dash" />
                </div>
                <div class="tk-end right">
                  <span class="tk-code trv-mono">{{ code(request?.to_location) }}</span>
                  <span class="tk-place">{{ request?.to_location || '—' }}</span>
                </div>
              </div>

              <div class="tk-facts">
                <div class="tk-fact"><span>Traveller</span><b>{{ request?.employee_name || '—' }}</b></div>
                <div class="tk-fact"><span>Days</span><b class="trv-mono">{{ request?.num_days ?? '—' }}</b></div>
                <div class="tk-fact"><span>Depart</span><b class="trv-mono">{{ fmtDate(request?.departure_date) }}</b></div>
                <div class="tk-fact"><span>Est. cost</span><b class="trv-mono tk-cost">{{ fmtINR(request?.est_total_cost) }}</b></div>
              </div>

              <!-- cost spread micro-bar -->
              <div v-if="costSegs.length" class="tk-costbar">
                <span v-for="s in costSegs" :key="s.key" class="tk-cb-seg" :style="{ width: s.pct + '%', background: s.hex }" :title="`${s.label}: ${fmtINR(s.val)}`" />
              </div>

              <!-- taxiing plane on approve -->
              <Presence>
                <span v-if="decision === 'APPROVED'" :key="'taxi'" class="tk-taxi" aria-hidden="true"><PlaneTakeoff :size="15" /></span>
              </Presence>

              <!-- ink-press stamp -->
              <Presence>
                <Motion :key="decision" as="span" class="tk-stamp" :style="{ '--c': curMeta.hex }"
                  :initial="{ opacity: 0, scale: 1.6, rotate: -26 }"
                  :animate="{ opacity: 1, scale: 1, rotate: -14 }"
                  :transition="{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }">
                  {{ curMeta.stamp }}
                </Motion>
              </Presence>
            </div>

            <!-- ░░ where the decision lands in the chain ░░ -->
            <div v-if="hasChain" class="tdm-chain">
              <span class="tdm-chain-lbl trv-mono"><Route :size="12" /> Approval chain</span>
              <ApprovalRunway :req="request" compact />
            </div>

            <!-- ░░ lifecycle block — approval is not possible ░░ -->
            <div v-if="blocked" class="tdm-block">
              <AlertTriangle :size="17" />
              <div class="tdm-block-txt">
                <b>This request can’t be approved</b>
                <span>{{ blockReason }} You can still <em>return</em> or <em>reject</em> it to clear it from the queue.</span>
              </div>
            </div>

            <!-- decision segmented -->
            <div class="tdm-seg">
              <Motion v-for="d in options" :key="d.key" as="button" class="seg-btn"
                :class="{ on: decision === d.key, disabled: d.key === 'APPROVED' && blocked }"
                :disabled="d.key === 'APPROVED' && blocked"
                :style="{ '--c': d.hex }" :whileHover="{ y: (d.key === 'APPROVED' && blocked) ? 0 : -1 }"
                :whileTap="{ scale: (d.key === 'APPROVED' && blocked) ? 1 : 0.96 }"
                @click="(d.key === 'APPROVED' && blocked) ? null : (decision = d.key)">
                <component :is="d.icon" :size="14" /> {{ d.label }}
              </Motion>
            </div>

            <!-- what happens next -->
            <div class="tdm-next" :style="{ '--c': curMeta.hex }">
              <component :is="nextPreview.ico" :size="15" />
              <span>{{ nextPreview.text }}</span>
            </div>

            <label class="tdm-label">
              {{ decision === 'APPROVED' ? 'Note (optional)' : 'Reason' }}
              <span v-if="decision !== 'APPROVED'" class="tdm-req">required</span>
            </label>
            <textarea v-model="notes" class="tdm-textarea" rows="3"
              :placeholder="decision === 'APPROVED' ? 'Add an approval note for the audit trail…' : 'Explain your decision — the traveller will see this…'" />
          </div>

          <footer class="tdm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn act" :style="{ '--c': curMeta.hex }"
              :disabled="busy || (decision === 'APPROVED' && blocked) || (decision !== 'APPROVED' && !notes.trim())"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="confirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><component :is="curMeta.icon" v-else :size="15" />
              {{ curMeta.cta }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Plane, Stamp, CheckCircle2, Undo2, XCircle, Loader2,
  PlaneTakeoff, ArrowRight, Route, AlertTriangle,
} from 'lucide-vue-next'
import ApprovalRunway from '../components/ApprovalRunway.vue'
import { fmtINR, fmtDate, airportCode, runwayStateFor } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, request: { type: Object, default: null }, busy: Boolean })
const emit = defineEmits(['close', 'decided'])

const options = [
  { key: 'APPROVED', label: 'Approve', cta: 'Clear for takeoff', stamp: 'CLEARED', icon: CheckCircle2, hex: '#34d399' },
  { key: 'RETURNED', label: 'Return', cta: 'Send back', stamp: 'HOLD', icon: Undo2, hex: '#f59e0b' },
  { key: 'REJECTED', label: 'Reject', cta: 'Deny request', stamp: 'DENIED', icon: XCircle, hex: '#ef4444' },
]
const decision = ref('APPROVED')
const notes = ref('')

// Server-derived: non-empty when the traveller's lifecycle (exited / suspended /
// trip past last working day) makes an approve impossible. flow.apply_decision is
// the real enforcement; here we just stop the approver heading down a dead end.
const blockReason = computed(() => props.request?.approval_block || '')
const blocked = computed(() => !!blockReason.value)

// Open on Reject when approval is blocked — the only useful way to clear it.
watch(() => props.open, (v) => { if (v) { decision.value = blocked.value ? 'REJECTED' : 'APPROVED'; notes.value = '' } })

const code = (l) => airportCode(l)
const curMeta = computed(() => options.find(o => o.key === decision.value) || options[0])
const hasChain = computed(() => (props.request?.approval_steps || []).length > 0)

const costSegs = computed(() => {
  const r = props.request; if (!r) return []
  const segs = [
    { key: 'travel', label: 'Travel', val: Number(r.est_travel_cost || 0), hex: '#fbbf24' },
    { key: 'hotel', label: 'Hotel', val: Number(r.est_accommodation_cost || 0), hex: '#fb923c' },
    { key: 'local', label: 'Local', val: Number(r.est_local_cost || 0), hex: '#f59e0b' },
    { key: 'food', label: 'Food', val: Number(r.est_food_cost || 0), hex: '#fcd34d' },
    { key: 'misc', label: 'Misc', val: Number(r.est_misc_cost || 0), hex: '#a3a3a3' },
  ].filter(s => s.val > 0)
  const total = segs.reduce((a, s) => a + s.val, 0) || 1
  return segs.map(s => ({ ...s, pct: (s.val / total) * 100 }))
})

const nextPreview = computed(() => {
  const r = props.request || {}
  if (decision.value === 'APPROVED') {
    const steps = r.approval_steps || []
    const cur = Number(r.current_step || 0)
    const nxt = steps.slice(cur + 1).find(s => s.decision == null && s.approver_type)
    if (nxt) {
      const label = nxt.label || (runwayStateFor(r)[steps.indexOf(nxt)]?.typeLabel) || nxt.approver_type
      return { ico: ArrowRight, text: `Advances to ${label}` }
    }
    return { ico: PlaneTakeoff, text: 'Final gate — request becomes fully approved' }
  }
  if (decision.value === 'RETURNED') return { ico: Undo2, text: `Returns to ${r.employee_name || 'the traveller'} for changes` }
  return { ico: XCircle, text: 'Request is terminated — traveller is notified' }
})

const confirm = () => {
  if (decision.value === 'APPROVED' && blocked.value) return
  emit('decided', { decision: decision.value, notes: notes.value.trim() })
}
</script>

<style scoped>
.tdm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(120% 100% at 50% 0%, rgba(20, 12, 4, 0.55), rgba(6, 5, 4, 0.74)); backdrop-filter: blur(11px); }
.tdm { width: min(520px, 96vw); max-height: 92vh; display: flex; flex-direction: column; border-radius: 22px; position: relative; overflow: hidden;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow);
  transition: border-color 0.4s; isolation: isolate; }
.tdm-topbar { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--trv-grad-hero); transition: background 0.4s; z-index: 4; }
.tdm-aura { position: absolute; inset: -40% 30% 50% -20%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 70% at 22% 0%, color-mix(in srgb, var(--tone, #fbbf24) 22%, transparent), transparent 70%);
  animation: trv-aura-drift 10s ease-in-out infinite; transition: background 0.5s; }
.tdm.tone-approved { --tone: #34d399; border-color: color-mix(in srgb, #34d399 36%, var(--trv-border-strong)); }
.tdm.tone-approved .tdm-topbar { background: linear-gradient(90deg, #34d399, #60d394); }
.tdm.tone-returned { --tone: #f59e0b; }
.tdm.tone-returned .tdm-topbar { background: linear-gradient(90deg, #f59e0b, #fb923c); }
.tdm.tone-rejected { --tone: #ef4444; border-color: color-mix(in srgb, #ef4444 32%, var(--trv-border-strong)); }
.tdm.tone-rejected .tdm-topbar { background: linear-gradient(90deg, #ef4444, #f87171); }

.tdm-head { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 12px; padding: 22px 22px 14px; }
.tdm-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); flex-shrink: 0; }
.tdm-htext h3 { font-size: 16px; font-weight: 800; margin: 0; color: var(--trv-text); }
.tdm-ref { font-size: 11.5px; color: var(--trv-text-muted); margin: 2px 0 0; }
.tdm-x { margin-left: auto; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 4px; }
.tdm-x:hover { color: var(--trv-text); }

.tdm-scroll { position: relative; z-index: 1; flex: 1; min-height: 0; overflow-y: auto; padding: 0 22px 4px; }

/* ticket */
.ticket { position: relative; overflow: hidden; padding: 16px 18px; border-radius: 16px; margin-bottom: 14px;
  background: var(--trv-pass); border: 1px dashed var(--trv-pass-edge); }
.tk-perf { position: absolute; top: 50%; width: 16px; height: 16px; border-radius: 50%; background: var(--trv-surface-elevated); transform: translateY(-50%); z-index: 2; }
.tk-perf.left { left: -8px; } .tk-perf.right { right: -8px; }
.tk-wash { position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.16) 50%, transparent);
  animation: tk-sweep 0.9s var(--trv-ease); }
@keyframes tk-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.tk-route { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin-bottom: 14px; }
.tk-end { display: flex; flex-direction: column; gap: 2px; } .tk-end.right { align-items: flex-end; text-align: right; }
.tk-code { font-size: 28px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.tk-place { font-size: 10.5px; color: var(--trv-text-muted); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-mid { display: flex; align-items: center; gap: 5px; color: var(--trv-amber); }
.tk-mid-plane { animation: trv-plane-drift 3s ease-in-out infinite; }
.tk-dash { width: 18px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.5; }
.tk-facts { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding-top: 12px; border-top: 1px dashed var(--trv-pass-edge); }
.tk-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tk-fact span { font-size: 9px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.tk-fact b { font-size: 12px; color: var(--trv-text-secondary); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tk-cost { color: var(--trv-amber) !important; }
.tk-costbar { position: relative; z-index: 2; display: flex; height: 5px; border-radius: 999px; overflow: hidden; background: var(--trv-steel-soft); margin-top: 12px; }
.tk-cb-seg { height: 100%; }
.tk-taxi { position: absolute; left: 8%; bottom: 8px; z-index: 2; color: var(--trv-st-approved); filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.6));
  animation: tk-taxi 1s var(--trv-ease) forwards; }
@keyframes tk-taxi { 0% { left: 6%; opacity: 0; } 20% { opacity: 1; } 100% { left: 86%; opacity: 0; } }
.tk-stamp { position: absolute; right: 16px; top: 12px; z-index: 3; font-family: var(--trv-mono); font-size: 22px; font-weight: 850; letter-spacing: 0.08em;
  color: var(--c); padding: 4px 12px; border: 3px solid var(--c); border-radius: 8px; opacity: 0.92;
  text-transform: uppercase; pointer-events: none; box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent) inset; }

/* chain preview */
.tdm-chain { padding: 10px 12px 4px; border-radius: 13px; margin-bottom: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.tdm-chain-lbl { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-muted); }
.tdm-chain-lbl svg { color: var(--trv-amber); }

/* lifecycle block notice */
.tdm-block { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border-radius: 13px; margin-bottom: 14px;
  background: color-mix(in srgb, var(--trv-st-rejected) 12%, var(--trv-panel)); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 34%, transparent); }
.tdm-block svg { color: var(--trv-st-rejected); flex-shrink: 0; margin-top: 1px; }
.tdm-block-txt { display: flex; flex-direction: column; gap: 3px; }
.tdm-block-txt b { font-size: 12.5px; font-weight: 800; color: var(--trv-st-rejected); }
.tdm-block-txt span { font-size: 12px; line-height: 1.5; color: var(--trv-text-secondary); }
.tdm-block-txt em { font-style: normal; font-weight: 700; color: var(--trv-text); }

/* segmented */
.tdm-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.seg-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.seg-btn.disabled:hover { color: var(--trv-text-muted); }
.seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 11px; cursor: pointer;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); font-size: 12.5px; font-weight: 700; transition: color 0.2s, border-color 0.2s, background 0.2s; }
.seg-btn:hover { color: var(--trv-text-secondary); }
.seg-btn.on { color: var(--c); border-color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent); }

/* next preview */
.tdm-next { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--trv-text-secondary);
  padding: 10px 13px; border-radius: 11px; margin-bottom: 16px;
  background: color-mix(in srgb, var(--c) 8%, var(--trv-panel)); border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); transition: background 0.3s, border-color 0.3s; }
.tdm-next svg { color: var(--c); flex-shrink: 0; }

.tdm-label { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.tdm-req { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-st-rejected); padding: 1px 6px; border-radius: 5px; background: var(--trv-st-rejected-soft); }
.tdm-textarea { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit;
  background: var(--trv-input-bg, rgba(0, 0, 0, 0.3)); border: 1px solid var(--trv-border); color: var(--trv-text); }
.tdm-textarea:focus { outline: none; border-color: var(--trv-amber-border); }

.tdm-foot { position: relative; z-index: 2; display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px 20px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.act { background: var(--c); color: #11100c; box-shadow: 0 8px 22px -10px var(--c); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

[data-theme="light"] .tdm-overlay { background: radial-gradient(120% 100% at 50% 0%, rgba(120, 70, 15, 0.28), rgba(60, 40, 15, 0.32)); }
[data-theme="light"] .tdm-textarea { background: rgba(255, 250, 240, 0.7); }
[data-theme="light"] .tk-perf { background: var(--trv-surface-elevated); }
@media (prefers-reduced-motion: reduce) {
  .tk-stamp, .tdm-aura, .tk-mid-plane { animation: none; transition: none; }
  .tk-wash, .tk-taxi { animation: none; display: none; }
}
@media (max-width: 460px) { .tk-facts { grid-template-columns: repeat(2, 1fr); } .tk-code { font-size: 24px; } }
</style>
