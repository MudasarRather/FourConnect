<template>
  <!-- ═══════════════ RETIRE OBJECTIVE · "Striking the climb" ceremony ═══════════════
       Replaces the native window.confirm AND the old one-band warning. Surfaces the FULL
       consequence of a delete — it soft-deletes the objective + cascades to its N key
       results + drops all logged check-ins from the roll-up — as an ordered descent ledger.
       A two-stage ARM guards the destructive button (so a stray click can't delete), and a
       reversible "Mark cancelled instead" path keeps the record for those who just want it
       off the Ascent. The signature is a north-star beacon over a summit that DIMS as the
       delete arms — the visual inverse of the GoalAscent instrument. -->
  <teleport to="body">
    <Presence>
      <Motion v-if="open && goal" key="ov" as="div" class="gd-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="close">
        <Motion as="div" class="gd" :class="{ armed }" :initial="{ opacity: 0, y: 20, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="gd-aura" aria-hidden="true" />
          <span class="gd-grain" aria-hidden="true" />
          <button class="gd-x" type="button" @click="close"><X :size="16" /></button>

          <!-- ── signature sigil · summit + dimming beacon ── -->
          <div class="gd-sigil">
            <span class="gd-sigil-ring" />
            <span class="gd-sigil-ring two" />
            <svg class="gd-scene" viewBox="0 0 96 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs>
                <linearGradient id="gdRidge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0.04" />
                </linearGradient>
              </defs>
              <path class="gd-ridge-back" d="M0 64 L22 42 L40 54 L58 30 L96 58 L96 72 L0 72 Z" />
              <path class="gd-ridge" d="M0 66 L30 46 L48 58 L66 22 L96 52 L96 72 L0 72 Z" fill="url(#gdRidge)" />
              <g class="gd-beacon" :class="{ dim: armed }">
                <circle class="gd-beacon-glow" cx="66" cy="20" r="11" />
                <path class="gd-beacon-star" :d="starPath(66, 20, 6.4, 4)" />
              </g>
              <circle class="gd-climber" :class="{ falling: armed }" cx="48" cy="56" r="2.6" />
            </svg>
            <component :is="isObjective ? Target : Flag" :size="18" class="gd-sigil-badge" />
          </div>

          <h3 class="gd-title">{{ armed ? `Confirm — strike this ${noun}` : `Retire this ${noun}?` }}</h3>
          <p class="gd-name">“{{ goal.title }}”</p>

          <!-- ── ordered consequence ledger (the descent) ── -->
          <div class="gd-ledger" :class="{ hot: armed }">
            <div class="gd-step">
              <span class="gd-step-node"><component :is="isObjective ? Target : Flag" :size="12" /></span>
              <p>
                The {{ noun }} is <b>soft-deleted</b><template v-if="isObjective && krCount">, taking its
                <b>{{ krCount }} key result{{ krCount === 1 ? '' : 's' }}</b> down with it</template>.
                <span class="gd-step-sub">Kept in the database for audit — not recoverable from this screen.</span>
              </p>
            </div>
            <div class="gd-step">
              <span class="gd-step-node"><History :size="12" /></span>
              <p>
                Every <b>logged check-in</b> is removed from progress roll-ups.
                <span class="gd-step-sub">The journalled history of how it moved is gone from the Ascent.</span>
              </p>
            </div>
            <div class="gd-step">
              <span class="gd-step-node"><Activity :size="12" /></span>
              <p>
                It disappears from the <b>Ascent</b>, <b>goal-health</b>, and any review’s <b>Goals section</b> it fed.
                <span class="gd-step-sub">Avg-progress and at-risk counts recompute without it.</span>
              </p>
            </div>
          </div>

          <!-- ── reversible alternative ── -->
          <div v-if="!isCancelled" class="gd-alt">
            <span class="gd-alt-ic"><RotateCcw :size="15" /></span>
            <div class="gd-alt-txt">
              <b>Just want it off the climb?</b>
              <span>Mark it <i>Cancelled</i> — the record &amp; its check-ins stay, and you can reopen it anytime.</span>
            </div>
            <button class="perf-btn gd-cancel" type="button" :disabled="busy || cancelBusy" @click="$emit('cancel-instead')">
              <Loader2 v-if="cancelBusy" :size="14" class="perf-spin" /><CircleSlash v-else :size="14" /> Mark cancelled
            </button>
          </div>

          <!-- ── actions ── -->
          <div class="gd-acts">
            <button class="perf-btn perf-btn-steel" type="button" :disabled="busy || cancelBusy" @click="close">Keep it</button>
            <button class="perf-btn gd-go" :class="{ armed }" type="button" :disabled="busy || cancelBusy" @click="onDeleteClick">
              <Loader2 v-if="busy" :size="14" class="perf-spin" />
              <TriangleAlert v-else-if="armed" :size="14" />
              <Trash2 v-else :size="14" />
              {{ busy ? 'Deleting…' : armed ? 'Tap again to delete' : `Delete ${noun}` }}
              <span v-if="armed && !busy" class="gd-go-deplete" />
            </button>
          </div>
          <p class="gd-armhint" :class="{ show: armed && !busy }"><TriangleAlert :size="11" /> This permanently removes it from the workspace — there’s no undo here.</p>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Target, Flag, TriangleAlert, Trash2, Loader2, RotateCcw, CircleSlash, History, Activity, X } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  goal: { type: Object, default: null },
  busy: Boolean,
  cancelBusy: Boolean,
})
const emit = defineEmits(['close', 'confirm', 'cancel-instead'])

const isObjective = computed(() => (props.goal?.goal_type || 'OBJECTIVE') === 'OBJECTIVE')
const krCount = computed(() => (props.goal?.key_results || []).length)
const noun = computed(() => (isObjective.value ? 'objective' : 'goal'))
const isCancelled = computed(() => props.goal?.status === 'CANCELLED')

// two-stage arm — a stray click never deletes
const armed = ref(false)
let disarmT = null
function onDeleteClick() {
  if (props.busy) return
  if (!armed.value) {
    armed.value = true
    clearTimeout(disarmT)
    disarmT = setTimeout(() => { armed.value = false }, 3800)
    return
  }
  clearTimeout(disarmT)
  emit('confirm')
}
function close() { armed.value = false; clearTimeout(disarmT); emit('close') }
watch(() => props.open, (v) => { if (!v) { armed.value = false; clearTimeout(disarmT) } })
onBeforeUnmount(() => clearTimeout(disarmT))

// 4-point beacon star
function starPath(cx, cy, r, spikes) {
  const inner = r * 0.4; let d = ''
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : inner; const a = (Math.PI / spikes) * i - Math.PI / 2
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1) + ' '
  }
  return d + 'Z'
}
</script>

<style scoped>
.gd-ov { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 24px;
  background: rgba(5, 5, 6, 0.64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.gd { position: relative; overflow: hidden; width: min(456px, 100%); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 30px 26px 22px; border-radius: 24px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 50px 110px -42px rgba(0,0,0,0.86);
  transition: border-color 0.4s ease, box-shadow 0.4s ease; }
.gd.armed { border-color: color-mix(in srgb, var(--perf-conflict) 50%, transparent); box-shadow: 0 50px 120px -40px rgba(0,0,0,0.9), 0 0 0 1px color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.gd-aura { position: absolute; inset: -46% 14% auto 14%; height: 78%; pointer-events: none; z-index: 0; transition: background 0.5s ease;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 70%); filter: blur(42px); }
.gd.armed .gd-aura { background: radial-gradient(circle, color-mix(in srgb, var(--perf-conflict) 24%, transparent), transparent 70%); }
.gd-grain { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 24px 24px; mask-image: radial-gradient(120% 70% at 50% 0%, #000, transparent 78%); -webkit-mask-image: radial-gradient(120% 70% at 50% 0%, #000, transparent 78%); }
.gd-x { position: absolute; top: 14px; right: 14px; z-index: 4; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.gd-x:hover { color: var(--perf-text); transform: rotate(90deg); }

/* sigil */
.gd-sigil { position: relative; z-index: 1; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 22px; overflow: visible;
  background: color-mix(in srgb, var(--perf-gold) 10%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); transition: background 0.4s, border-color 0.4s; }
.gd.armed .gd-sigil { background: color-mix(in srgb, var(--perf-conflict) 11%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.gd-sigil-ring, .gd-sigil-ring.two { position: absolute; inset: 0; border-radius: 22px; border: 1px solid color-mix(in srgb, var(--perf-gold) 40%, transparent); animation: gd-pulse 2.6s ease-out infinite; }
.gd-sigil-ring.two { animation-delay: 1.3s; }
.gd.armed .gd-sigil-ring { border-color: color-mix(in srgb, var(--perf-conflict) 46%, transparent); animation-duration: 1.4s; }
@keyframes gd-pulse { 0% { opacity: 0.55; transform: scale(0.92); } 100% { opacity: 0; transform: scale(1.4); } }
.gd-scene { position: absolute; inset: 0; width: 100%; height: 100%; }
.gd-ridge-back { fill: color-mix(in srgb, var(--perf-gold) 16%, transparent); }
.gd-beacon { transition: opacity 0.45s ease; transform-box: fill-box; transform-origin: center; }
.gd-beacon.dim { opacity: 0.18; }
.gd-beacon-glow { fill: color-mix(in srgb, var(--perf-gold-bright) 40%, transparent); animation: gd-glow 2.8s ease-in-out infinite; }
.gd-beacon-star { fill: var(--perf-gold-bright); filter: drop-shadow(0 0 4px var(--perf-gold)); }
@keyframes gd-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.gd-climber { fill: var(--perf-text); transition: transform 0.5s var(--perf-spring), fill 0.4s; }
.gd-climber.falling { transform: translate(-14px, 16px); fill: var(--perf-conflict); }
.gd-sigil-badge { position: relative; z-index: 1; color: var(--perf-gold); transition: color 0.4s; }
.gd.armed .gd-sigil-badge { color: var(--perf-conflict); }

.gd-title { position: relative; z-index: 1; margin: 6px 0 0; font-size: 18px; font-weight: 850; color: var(--perf-text); transition: color 0.3s; }
.gd.armed .gd-title { color: var(--perf-conflict); }
.gd-name { position: relative; z-index: 1; margin: 0; font-size: 13px; font-weight: 700; color: var(--perf-text-secondary); max-width: 34ch; }

/* consequence ledger */
.gd-ledger { position: relative; z-index: 1; width: 100%; margin-top: 6px; display: flex; flex-direction: column; gap: 0; text-align: left;
  padding: 4px 2px; border-radius: 14px; }
.gd-step { position: relative; display: flex; gap: 11px; padding: 9px 4px 9px 0; }
.gd-step::before { content: ''; position: absolute; left: 12px; top: 26px; bottom: -4px; width: 1.5px; background: var(--perf-border); }
.gd-step:last-child::before { display: none; }
.gd-step-node { position: relative; z-index: 1; flex-shrink: 0; display: grid; place-items: center; width: 25px; height: 25px; border-radius: 8px;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); transition: all 0.35s; }
.gd-ledger.hot .gd-step-node { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 11%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 28%, transparent); }
.gd-step p { margin: 0; font-size: 12px; line-height: 1.45; color: var(--perf-text-secondary); padding-top: 3px; }
.gd-step b { font-weight: 800; color: var(--perf-text); }
.gd-step-sub { display: block; margin-top: 2px; font-size: 10.5px; color: var(--perf-text-muted); }

/* reversible alternative */
.gd-alt { position: relative; z-index: 1; width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; padding: 11px 13px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-ok) 7%, var(--perf-panel)); border: 1px solid color-mix(in srgb, var(--perf-ok) 22%, var(--perf-border)); }
.gd-alt-ic { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 9px; color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.gd-alt-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.gd-alt-txt b { font-size: 12px; font-weight: 800; color: var(--perf-text); }
.gd-alt-txt span { font-size: 10.5px; line-height: 1.4; color: var(--perf-text-muted); }
.gd-alt-txt i { font-style: normal; font-weight: 750; color: var(--perf-ok); }
.gd-cancel { flex-shrink: 0; color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 34%, transparent); }
.gd-cancel:hover:not(:disabled) { background: var(--perf-ok-soft); }

.gd-acts { position: relative; z-index: 1; display: flex; gap: 10px; margin-top: 6px; width: 100%; }
.gd-acts .perf-btn { flex: 1; }
.gd-go { position: relative; overflow: hidden; color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 34%, transparent); }
.gd-go:hover:not(:disabled) { background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); }
.gd-go.armed { color: #fff; background: var(--perf-conflict); border-color: var(--perf-conflict); box-shadow: 0 10px 26px -10px color-mix(in srgb, var(--perf-conflict) 80%, transparent); }
.gd-go-deplete { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; background: rgba(255,255,255,0.7); transform-origin: left; animation: gd-deplete 3.8s linear forwards; }
@keyframes gd-deplete { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.gd-armhint { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; margin: 0; max-height: 0; opacity: 0; overflow: hidden; font-size: 10.5px; font-weight: 650; color: var(--perf-conflict); transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease; }
.gd-armhint.show { max-height: 24px; opacity: 1; margin-top: 2px; }

@media (prefers-reduced-motion: reduce) {
  .gd-sigil-ring, .gd-beacon-glow { animation: none; }
  .gd-go-deplete { animation: none; transform: scaleX(1); }
  .gd-climber { transition: none; }
}
</style>
