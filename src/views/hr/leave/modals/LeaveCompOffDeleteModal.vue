<template>
  <Teleport to="body">
    <transition name="cd">
      <div v-if="open && entry" class="cd-scrim" @click.self="close">
        <Motion class="cd-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 20, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ── Animated ember-extinguish crest ── -->
          <div class="cd-crest" :class="{ snuff: hovering }">
            <span class="cd-crest-halo" aria-hidden="true" />
            <span class="cd-smoke" aria-hidden="true"><i /><i /><i /></span>
            <svg class="cd-flame" viewBox="0 0 64 80" aria-hidden="true">
              <defs>
                <linearGradient id="cdFlame" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#b91c1c" />
                  <stop offset="40%" stop-color="#ea580c" />
                  <stop offset="78%" stop-color="#f97316" />
                  <stop offset="100%" stop-color="#fde047" />
                </linearGradient>
              </defs>
              <path class="cd-flame-outer" fill="url(#cdFlame)"
                d="M32 6 C 20 26 12 34 12 50 a20 20 0 0 0 40 0 C 52 36 42 30 32 6 Z" />
              <path class="cd-flame-inner" fill="#ffedb0"
                d="M32 30 C 26 40 23 45 23 53 a9 9 0 0 0 18 0 C 41 46 37 42 32 30 Z" />
            </svg>
            <span class="cd-coals" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </div>

          <button class="cd-close" @click="close"><X :size="14" /></button>

          <div class="cd-head">
            <span class="leave-mono cd-eye">RESERVE / REVOKE CREDIT</span>
            <h3 class="cd-title">Revoke this comp-off credit?</h3>
            <p class="cd-sub">
              Extinguishing this credit <b>reverses {{ display(entry.days) }} day{{ Number(entry.days) === 1 ? '' : 's' }}</b>
              from <b>{{ entry.employee_name || 'the employee' }}</b>’s reserve. The grant is removed and the
              action is written to the audit trail.
            </p>
          </div>

          <div class="cd-body">
            <!-- ── Impact ── -->
            <section class="cd-impact" :class="{ danger: impact && impact.would_go_negative, warn: impact && impact.is_auto_generated }">
              <header class="cd-impact-head">
                <span class="leave-mono">BALANCE IMPACT</span>
                <span v-if="impactLoading" class="cd-flag load"><Loader2 :size="12" class="spin" /> Checking…</span>
                <span v-else-if="impact && impact.would_go_negative" class="cd-flag bad"><AlertTriangle :size="12" /> Overdraw</span>
                <span v-else-if="impact" class="cd-flag ok"><Check :size="12" /> Safe</span>
              </header>

              <div v-if="impactLoading" class="cd-metrics">
                <div v-for="i in 3" :key="i" class="leave-skel cd-metric-skel" />
              </div>

              <template v-else-if="impact">
                <div class="cd-flow">
                  <div class="cd-flow-node">
                    <span class="cd-flow-eye leave-mono">RESERVE NOW</span>
                    <span class="cd-flow-val leave-mono">{{ display(impact.balance_active) }}<i>d</i></span>
                  </div>
                  <div class="cd-flow-arrow">
                    <span class="cd-flow-delta leave-mono">−{{ display(impact.days) }}</span>
                    <svg viewBox="0 0 48 12" class="cd-flow-svg"><path d="M2 6 H40 M34 2 L40 6 L34 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </div>
                  <div class="cd-flow-node end" :data-neg="impact.would_go_negative">
                    <span class="cd-flow-eye leave-mono">AFTER</span>
                    <span class="cd-flow-val leave-mono">{{ display(impact.balance_after) }}<i>d</i></span>
                  </div>
                </div>

                <div class="cd-tags">
                  <span class="cd-tag" :data-on="impact.is_auto_generated">
                    <component :is="impact.is_auto_generated ? Zap : UserCheck" :size="11" />
                    {{ impact.is_auto_generated ? 'Auto-detected' : 'Manual grant' }}
                  </span>
                  <span class="cd-tag" :data-on="impact.is_expired">
                    <Hourglass :size="11" />{{ impact.is_expired ? 'Already expired' : 'Active credit' }}
                  </span>
                  <span class="cd-tag muted">FY {{ impact.fiscal_year }}</span>
                </div>

                <p v-if="impact.would_go_negative" class="cd-verdict bad">
                  <strong>This credit appears to have been spent already.</strong>
                  Reversing it pushes the reserve negative ({{ display(impact.balance_active) }} → {{ display(impact.balance_after) }}).
                  Proceed only to correct a genuine error — confirm below.
                </p>
                <p v-else-if="impact.is_auto_generated" class="cd-verdict warn">
                  <strong>Auto-detected from a worked day.</strong>
                  Deleting it diverges from attendance truth. Prefer this only when the detection was wrong.
                </p>
                <p v-else class="cd-verdict ok">
                  Safe to revoke — the reserve simply drops by {{ display(impact.days) }} day{{ Number(impact.days) === 1 ? '' : 's' }}.
                </p>
              </template>

              <p v-else-if="impactError" class="cd-verdict bad">{{ impactError }}</p>
            </section>

            <!-- ── Reason ── -->
            <div class="cd-field">
              <span class="cd-flabel">Reason category</span>
              <div class="cd-cats">
                <button v-for="c in REASONS" :key="c" type="button"
                  class="cd-cat" :class="{ on: reasonCategory === c }" @click="reasonCategory = c">{{ c }}</button>
              </div>
            </div>

            <label class="cd-field">
              <span class="cd-flabel">Reason <span class="req">*</span> <em class="cd-hint">(recorded in the audit log)</em></span>
              <textarea v-model="reason" rows="2" maxlength="2000" placeholder="Why is this credit being revoked?" />
              <span class="cd-counter" :class="{ short: reason.trim().length < 6 }">{{ reason.trim().length }} / min 6</span>
            </label>

            <label v-if="impact && impact.would_go_negative" class="cd-field">
              <span class="cd-flabel">Type <code>REVOKE</code> to confirm overdraw <span class="req">*</span></span>
              <input v-model="confirmText" type="text" placeholder="REVOKE" class="cd-confirm" autocomplete="off" />
            </label>
          </div>

          <footer class="cd-foot">
            <button class="leave-btn leave-btn-sm" @click="close" :disabled="deleting">Cancel</button>
            <button class="cd-revoke" :disabled="!canDelete || deleting"
              @click="confirmDelete" @mouseenter="hovering = true" @mouseleave="hovering = false">
              <Flame :size="13" /> {{ deleting ? 'Revoking…' : 'Revoke credit' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { X, Flame, AlertTriangle, Check, Loader2, Zap, UserCheck, Hourglass } from 'lucide-vue-next'
import { fetchCompOffImpact, deleteCompOff } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  entry: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'deleted'])
const toast = useToast()

const REASONS = ['Wrong detection', 'Duplicate', 'Granted in error', 'Policy change', 'Other']

const impact = ref(null)
const impactLoading = ref(false)
const impactError = ref('')
const reason = ref('')
const reasonCategory = ref('Granted in error')
const confirmText = ref('')
const deleting = ref(false)
const hovering = ref(false)

const display = (v) => {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

const confirmed = computed(() => {
  if (!impact.value || !impact.value.would_go_negative) return true
  return confirmText.value.trim().toUpperCase() === 'REVOKE'
})
const canDelete = computed(() => !impactLoading.value && reason.value.trim().length >= 6 && confirmed.value)

const loadImpact = async () => {
  if (!props.entry) return
  impactLoading.value = true; impactError.value = ''; impact.value = null
  try {
    impact.value = await fetchCompOffImpact(props.entry.id)
  } catch (e) {
    impactError.value = e?.response?.data?.detail || 'Could not load impact — proceed with caution.'
  } finally { impactLoading.value = false }
}

watch(() => props.open, (o) => {
  if (!o) return
  reason.value = ''
  reasonCategory.value = 'Granted in error'
  confirmText.value = ''
  hovering.value = false
  loadImpact()
})

const close = () => { if (!deleting.value) emit('cancel') }

const confirmDelete = async () => {
  if (!canDelete.value || !props.entry) return
  deleting.value = true
  try {
    const res = await deleteCompOff(props.entry.id, {
      reason: reason.value.trim(),
      reason_category: reasonCategory.value,
      acknowledge_impact: true,
    })
    toast.success('Comp-off credit revoked')
    emit('deleted', res)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to revoke credit')
  } finally { deleting.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.cd-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 38%, rgba(234, 88, 12, 0.28), rgba(10, 6, 4, 0.6));
  backdrop-filter: blur(10px); padding: 20px;
}
.cd-card {
  position: relative; overflow: visible;
  width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px; padding-top: 52px;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(234, 88, 12, 0.16), transparent 55%),
    linear-gradient(180deg, rgba(24, 14, 10, 0.97), rgba(15, 10, 8, 0.97));
  border: 1px solid rgba(234, 88, 12, 0.34);
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .cd-card {
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(234, 88, 12, 0.12), transparent 55%),
    rgba(255, 250, 240, 0.97);
  border-color: rgba(194, 65, 12, 0.28);
}

/* ── ember-extinguish crest (floats above the card top) ── */
.cd-crest {
  position: absolute; top: -34px; left: 50%; transform: translateX(-50%);
  width: 76px; height: 76px; display: grid; place-items: center; border-radius: 50%;
  background: radial-gradient(circle at 50% 60%, #2a1206, #150a06);
  border: 1px solid rgba(234, 88, 12, 0.5);
  box-shadow: 0 0 34px -6px rgba(234, 88, 12, 0.7), inset 0 0 18px rgba(234, 88, 12, 0.3);
  isolation: isolate;
}
.cd-crest-halo { position: absolute; inset: -8px; border-radius: 50%; z-index: -1;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.5), transparent 70%);
  animation: cd-halo 2.4s ease-in-out infinite; }
@keyframes cd-halo { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.12); } }
.cd-flame { width: 40px; height: 50px; transform-origin: 50% 90%; filter: drop-shadow(0 0 10px #ea580c);
  animation: cd-flicker 0.42s ease-in-out infinite alternate; transition: opacity .5s, transform .5s; }
.cd-flame-inner { animation: cd-flicker 0.3s ease-in-out infinite alternate-reverse; transform-origin: 50% 90%; }
@keyframes cd-flicker {
  0%   { transform: scaleX(1) scaleY(1) translateX(0); }
  100% { transform: scaleX(0.92) scaleY(1.06) translateX(0.6px); }
}
/* coals at the base, glow when snuffed */
.cd-coals { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; }
.cd-coals i { width: 4px; height: 4px; border-radius: 50%; background: #ea580c; box-shadow: 0 0 5px #f97316; opacity: 0.5; }
/* smoke (only when snuffing) */
.cd-smoke { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 20px; height: 30px; opacity: 0; }
.cd-smoke i { position: absolute; bottom: 0; left: 50%; width: 6px; height: 6px; border-radius: 50%; background: rgba(200,200,200,0.4); }
/* snuff state — flame dies, smoke rises, coals cool */
.cd-crest.snuff .cd-flame { opacity: 0.12; transform: scaleY(0.4); animation: none; }
.cd-crest.snuff .cd-crest-halo { opacity: 0.15; animation: none; }
.cd-crest.snuff .cd-coals i { background: #6b7280; box-shadow: none; opacity: 0.8; }
.cd-crest.snuff .cd-smoke { opacity: 1; }
.cd-crest.snuff .cd-smoke i:nth-child(1) { animation: cd-smoke 1.2s ease-out infinite; }
.cd-crest.snuff .cd-smoke i:nth-child(2) { animation: cd-smoke 1.2s ease-out 0.3s infinite; }
.cd-crest.snuff .cd-smoke i:nth-child(3) { animation: cd-smoke 1.2s ease-out 0.6s infinite; }
@keyframes cd-smoke { 0% { transform: translate(-50%, 0) scale(0.5); opacity: 0.5; } 100% { transform: translate(-50%, -26px) scale(1.6); opacity: 0; } }

.cd-close {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  border: 1px solid var(--hr-border); background: transparent; color: var(--hr-text-muted); cursor: pointer;
  transition: transform .25s, color .2s, border-color .2s;
}
.cd-close:hover { transform: rotate(90deg); color: var(--leave-rejected); border-color: var(--leave-rejected); }

.cd-head { text-align: center; padding: 6px 26px 0; }
.cd-eye { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-rejected); }
.cd-title { margin: 6px 0 0; font-size: 18px; font-weight: 800; letter-spacing: -0.012em; color: var(--hr-text); }
.cd-sub { margin: 8px auto 0; max-width: 44ch; font-size: 12.5px; line-height: 1.55; color: var(--hr-text-muted); }
.cd-sub b { color: var(--hr-text); font-weight: 800; }

.cd-body { display: flex; flex-direction: column; gap: 13px; padding: 16px 22px 14px; }

/* impact */
.cd-impact { padding: 13px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
[data-theme="light"] .cd-impact { background: rgba(255,250,240,0.6); border-color: rgba(180,83,9,0.14); }
.cd-impact.warn { background: rgba(245, 158, 11, 0.07); border-color: rgba(245, 158, 11, 0.3); }
.cd-impact.danger { background: rgba(234, 88, 12, 0.08); border-color: rgba(234, 88, 12, 0.36); }
.cd-impact-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cd-impact-head .leave-mono { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--hr-text-muted); }
.cd-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; padding: 3px 9px; border-radius: 999px; }
.cd-flag.load { color: var(--hr-text-muted); }
.cd-flag.ok { color: var(--leave-approved); background: var(--leave-approved-soft); border: 1px solid color-mix(in srgb, var(--leave-approved) 36%, transparent); }
.cd-flag.bad { color: var(--leave-rejected); background: var(--leave-rejected-soft); border: 1px solid color-mix(in srgb, var(--leave-rejected) 40%, transparent); }

.cd-flow { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.cd-flow-node { display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; border-radius: 11px; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); text-align: center; }
[data-theme="light"] .cd-flow-node { background: rgba(255,255,255,0.55); }
.cd-flow-node.end[data-neg="true"] { border-color: rgba(234,88,12,0.5); background: rgba(234,88,12,0.08); }
.cd-flow-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--hr-text-muted); }
.cd-flow-val { font-size: 24px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.cd-flow-val i { font-style: normal; font-size: 11px; color: var(--hr-text-muted); margin-left: 1px; }
.cd-flow-node.end[data-neg="true"] .cd-flow-val { color: var(--leave-rejected); }
.cd-flow-arrow { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--leave-compoff); }
.cd-flow-delta { font-size: 11px; font-weight: 800; }
.cd-flow-svg { width: 40px; height: 10px; }

.cd-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.cd-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); color: var(--hr-text-muted); }
.cd-tag[data-on="true"] { color: var(--leave-compoff); border-color: color-mix(in srgb, var(--leave-compoff) 40%, transparent); background: rgba(249,115,22,0.12); }
.cd-tag.muted { font-family: 'SF Mono', monospace; font-size: 9px; }

.cd-verdict { margin: 11px 0 0; font-size: 12px; line-height: 1.55; color: var(--hr-text-secondary); }
.cd-verdict strong { display: block; margin-bottom: 2px; }
.cd-verdict.bad strong { color: var(--leave-rejected); }
.cd-verdict.warn strong { color: #f59e0b; }
.cd-verdict.ok { color: var(--hr-text-secondary); }
.cd-metric-skel { height: 52px; border-radius: 11px; }
.cd-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

/* fields */
.cd-field { display: flex; flex-direction: column; gap: 5px; position: relative; }
.cd-flabel { font-size: 9.5px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: var(--hr-text-muted); }
.cd-hint { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; opacity: 0.8; }
.req { color: var(--leave-rejected); }
.cd-flabel code { font-family: monospace; background: rgba(234,88,12,0.16); color: #fb923c; padding: 1px 6px; border-radius: 5px; letter-spacing: 0; }
.cd-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.cd-cat { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; border: 1px solid var(--hr-border); color: var(--hr-text-secondary); transition: all .18s; }
.cd-cat:hover { border-color: var(--leave-compoff); color: var(--hr-text); }
.cd-cat.on { background: rgba(234,88,12,0.14); border-color: rgba(234,88,12,0.5); color: #fb923c; }
.cd-field textarea, .cd-confirm {
  padding: 9px 11px; border-radius: 9px; background: rgba(255,255,255,0.04);
  border: 1px solid var(--hr-border); color: var(--hr-text); font: inherit; font-size: 13px; outline: none; resize: vertical;
  transition: border-color .2s, box-shadow .2s;
}
[data-theme="light"] .cd-field textarea, [data-theme="light"] .cd-confirm { background: rgba(255,250,240,0.88); border-color: rgba(180,83,9,0.2); }
.cd-field textarea:focus, .cd-confirm:focus { border-color: var(--leave-compoff); box-shadow: 0 0 0 3px rgba(234,88,12,0.12); }
.cd-confirm { font-weight: 700; letter-spacing: 0.1em; }
.cd-counter { align-self: flex-end; font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); }
.cd-counter.short { color: var(--leave-rejected); }

.cd-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 22px 18px; border-top: 1px solid rgba(234,88,12,0.14); }
.cd-revoke {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 14px; border-radius: 8px;
  font-size: 11.5px; font-weight: 800; cursor: pointer; color: #fff;
  background: linear-gradient(135deg, #f97316, #b91c1c);
  border: 1px solid rgba(234,88,12,0.55);
  box-shadow: 0 10px 26px -12px rgba(234,88,12,0.7);
  transition: transform .2s, box-shadow .2s, filter .2s;
}
.cd-revoke:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 32px -12px rgba(234,88,12,0.85); filter: brightness(1.06); }
.cd-revoke:disabled { opacity: 0.45; cursor: not-allowed; }

.spin { animation: cd-spin 0.9s linear infinite; }
@keyframes cd-spin { to { transform: rotate(360deg); } }
.cd-enter-active, .cd-leave-active { transition: opacity .25s; }
.cd-enter-from, .cd-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .cd-flame, .cd-flame-inner, .cd-crest-halo, .cd-smoke i { animation: none !important; }
}
</style>
