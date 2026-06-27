<template>
  <div ref="root" class="sq" :class="{ reduced, in: visible }" @pointermove="onMove" @pointerleave="resetParallax">
    <!-- ═══ stage atmosphere ═══ -->
    <div class="sq-atmos" aria-hidden="true" :style="parallax">
      <span class="sq-aura a1" /><span class="sq-aura a2" /><span class="sq-aura a3" />
      <span class="sq-floor" />
      <span class="sq-horizon" />
      <span class="sq-haze" />
      <span v-for="n in 20" :key="n" class="sq-dust" :style="dustStyle(n)" />
    </div>

    <!-- rafter rail of spotlight emitters -->
    <div class="sq-rafter" aria-hidden="true">
      <i v-for="n in Math.max(shown.length, 1)" :key="n" />
    </div>

    <!-- ═══ the crew lineup ═══ -->
    <div class="sq-line">
      <button v-for="(m, i) in shown" :key="m.employee_id" type="button"
        class="sq-pod"
        :class="{ lit: litId === m.employee_id, dim: litId && litId !== m.employee_id, awaiting: !m.hasReview, pending: m.pending }"
        :style="{ '--c': m.color, '--beam': m.beam + '%', '--d': (0.1 * i).toFixed(2) + 's' }"
        @mouseenter="$emit('hover', m.employee_id)" @mouseleave="$emit('hover', null)"
        @click="$emit('focus', m.raw)">

        <!-- volumetric spotlight cone from the rafters -->
        <span class="sq-cone"><span class="sq-cone-flick" /></span>

        <!-- floating score readout -->
        <span class="sq-read" :class="{ await: !m.hasReview }">
          <template v-if="m.hasReview">{{ m.scoreLabel }}</template>
          <Plus v-else :size="13" />
          <em v-if="m.hasReview">/{{ m.max }}</em>
        </span>

        <!-- the performer pod -->
        <span class="sq-cap">
          <span class="sq-cap-halo" />
          <span class="sq-cap-ring" />
          <i>{{ m.initials }}</i>
          <span v-if="m.pending" class="sq-cap-ping" />
          <span v-if="m.pending" class="sq-cap-flag"><Plus :size="9" /></span>
        </span>

        <!-- readiness beam (height = score) lifting the pod -->
        <span class="sq-beam"><span class="sq-beam-core" /><span class="sq-beam-shine" /><span class="sq-beam-foot" /></span>

        <!-- spotlight pool + floor reflection -->
        <span class="sq-pool" />
        <span class="sq-reflect" aria-hidden="true">{{ m.initials }}</span>

        <span class="sq-name">{{ m.first }}</span>
      </button>

      <div v-if="overflow" class="sq-pod more">
        <span class="sq-cap ghost"><b>+{{ overflow }}</b></span>
        <span class="sq-beam ghost" />
        <span class="sq-name">more</span>
      </div>
    </div>

    <div v-if="!members.length" class="sq-empty"><Users :size="18" /> No reports on your roster yet.</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Plus, Users } from 'lucide-vue-next'
import { scoreTone } from '@/composables/usePerformance'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  members: { type: Array, default: () => [] },
  litId: { type: String, default: null },
  max: { type: Number, default: 10 },
})
defineEmits(['hover', 'focus'])
const reduced = prefersReduced()
const root = ref(null)
const { visible } = useInView(root, { threshold: 0.12 })

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

const mapped = computed(() => (props.members || []).map(m => {
  const rev = m.review
  const max = rev?.rating_max || 5
  const score = rev?.overall_score
  const hasReview = !!rev
  const hike = rev?.hike_status || 'NONE'
  const pending = hasReview && (['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(rev.status)
    || (['COMPLETED', 'ACKNOWLEDGED'].includes(rev.status) && hike === 'NONE'))
  return {
    employee_id: m.employee_id, raw: m, max,
    first: (m.employee_name || '—').split(/\s+/)[0],
    initials: initials(m.employee_name),
    hasReview, pending,
    color: hasReview && score != null ? scoreTone(score, max) : 'var(--perf-unset)',
    beam: hasReview && score != null ? Math.max(14, Math.round((score / max) * 100)) : 16,
    scoreLabel: score != null ? Number(score).toFixed(1) : '—',
  }
}))
const shown = computed(() => mapped.value.slice(0, props.max))
const overflow = computed(() => Math.max(0, mapped.value.length - props.max))

// deterministic dust placement (no Math.random in render)
const dustStyle = (n) => {
  const x = (n * 53) % 100, y = (n * 37) % 80, dur = 8 + (n % 6), del = (n % 9) * 0.5
  return { left: x + '%', top: y + '%', '--md': dur + 's', '--mdelay': del + 's' }
}

// subtle pointer-parallax on the ambient layer
const parallax = ref({})
function onMove(e) {
  if (reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = ((e.clientX - r.left) / r.width - 0.5)
  const dy = ((e.clientY - r.top) / r.height - 0.5)
  parallax.value = { transform: `translate3d(${(-dx * 18).toFixed(1)}px, ${(-dy * 12).toFixed(1)}px, 0)` }
}
const resetParallax = () => { parallax.value = {} }
</script>

<style scoped>
.sq {
  position: relative; overflow: hidden; border-radius: 22px; min-height: 290px;
  perspective: 1100px;
  background:
    radial-gradient(120% 80% at 50% 122%, color-mix(in srgb, var(--perf-orange) 20%, transparent), transparent 56%),
    radial-gradient(80% 60% at 50% -8%, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent 60%),
    linear-gradient(180deg, #0a0a0d 0%, color-mix(in srgb, var(--perf-canvas) 80%, #000) 60%, #050506 100%);
  border: 1px solid var(--perf-border);
}
[data-theme="light"] .sq {
  background:
    radial-gradient(120% 80% at 50% 122%, color-mix(in srgb, var(--perf-orange) 16%, transparent), transparent 56%),
    radial-gradient(80% 60% at 50% -8%, color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 60%),
    linear-gradient(180deg, #fff7ea 0%, var(--perf-panel) 70%);
}

/* ── ambient atmosphere ── */
.sq-atmos { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.sq-aura { position: absolute; border-radius: 50%; filter: blur(64px); }
.sq-aura.a1 { width: 320px; height: 320px; left: 8%; bottom: -160px; background: radial-gradient(circle, var(--perf-gold), transparent 70%); opacity: 0.4; animation: sq-float 15s var(--perf-ease) infinite alternate; }
.sq-aura.a2 { width: 280px; height: 280px; right: 10%; bottom: -150px; background: radial-gradient(circle, var(--perf-orange), transparent 70%); opacity: 0.42; animation: sq-float 19s var(--perf-ease) infinite alternate-reverse; }
.sq-aura.a3 { width: 200px; height: 200px; left: 46%; top: -90px; background: radial-gradient(circle, var(--perf-ember), transparent 70%); opacity: 0.25; animation: sq-float 22s var(--perf-ease) infinite alternate; }

/* receding perspective floor */
.sq-floor { position: absolute; left: -20%; right: -20%; bottom: 0; height: 56%;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 22%, transparent) 1px, transparent 1px),
                    linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 16%, transparent) 1px, transparent 1px);
  background-size: 46px 40px;
  transform: rotateX(74deg); transform-origin: bottom center;
  mask-image: linear-gradient(transparent, #000 38%, #000 76%, transparent);
  opacity: 0.5; animation: sq-grid 9s linear infinite; }
.sq-horizon { position: absolute; left: 8%; right: 8%; bottom: 44%; height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 70%, transparent), color-mix(in srgb, var(--perf-orange) 70%, transparent), transparent);
  box-shadow: 0 0 26px color-mix(in srgb, var(--perf-gold) 55%, transparent); filter: blur(0.4px); }
.sq-haze { position: absolute; left: 0; right: 0; bottom: 0; height: 50%;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--perf-orange) 10%, transparent)); }
.sq-dust { position: absolute; width: 3px; height: 3px; border-radius: 50%;
  background: color-mix(in srgb, var(--perf-gold-bright) 80%, transparent);
  box-shadow: 0 0 7px color-mix(in srgb, var(--perf-gold) 85%, transparent);
  opacity: 0; animation: sq-dust var(--md, 9s) ease-in-out infinite; animation-delay: var(--mdelay, 0s); }

/* rafter spotlight emitters */
.sq-rafter { position: absolute; top: 0; left: 0; right: 0; height: 8px; z-index: 2;
  display: flex; justify-content: center; gap: clamp(20px, 7vw, 90px); padding: 0 8%; }
.sq-rafter i { width: 26px; height: 6px; border-radius: 0 0 8px 8px; background: color-mix(in srgb, var(--perf-gold) 60%, transparent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--perf-gold) 70%, transparent); }

/* ── crew lineup ── */
.sq-line { position: relative; z-index: 3; height: 100%; min-height: 290px;
  display: flex; align-items: flex-end; justify-content: center; gap: clamp(14px, 4vw, 56px);
  padding: 30px clamp(18px, 4vw, 40px) 38px; }

.sq-pod { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  height: 100%; min-width: 56px; background: none; border: none; cursor: pointer; font: inherit; padding: 0;
  opacity: 0; transform: translateY(26px);
  transition: transform 0.3s var(--perf-spring), filter 0.3s; }
.sq.in .sq-pod { animation: sq-rise 0.75s var(--perf-spring) forwards; animation-delay: var(--d, 0s); }
.sq-pod:hover, .sq-pod.lit { transform: translateY(-6px); }
.sq-pod.dim { filter: saturate(0.5) brightness(0.7); opacity: 0.45; }
.sq-pod.more { cursor: default; }

/* volumetric spotlight cone */
.sq-cone { position: absolute; top: 2px; left: 50%; width: 120px; height: 78%; transform: translateX(-50%);
  clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 42%, transparent), color-mix(in srgb, var(--c) 6%, transparent) 70%, transparent);
  filter: blur(3px); opacity: 0.42; pointer-events: none; transition: opacity 0.3s; mix-blend-mode: screen; }
.sq-cone-flick { position: absolute; inset: 0; clip-path: inherit;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, transparent), transparent 60%);
  animation: sq-flicker 3.2s ease-in-out infinite; }
.sq-pod:hover .sq-cone, .sq-pod.lit .sq-cone { opacity: 0.78; }
.sq-pod.awaiting .sq-cone { background: linear-gradient(180deg, rgba(255,255,255,0.14), transparent 72%); opacity: 0.3; }

/* floating score read-out */
.sq-read { position: relative; z-index: 4; display: inline-flex; align-items: baseline; gap: 1px;
  font-size: 14px; font-weight: 850; color: var(--c); font-variant-numeric: tabular-nums; margin-bottom: 8px;
  text-shadow: 0 0 14px color-mix(in srgb, var(--c) 60%, transparent); }
.sq-read em { font-size: 9px; font-style: normal; font-weight: 700; color: var(--perf-text-dim); }
.sq-read.await { font-size: 0; display: grid; place-items: center; width: 22px; height: 22px; color: var(--perf-text-dim);
  border: 1px dashed var(--perf-border-strong); border-radius: 7px; text-shadow: none; }

/* performer pod / avatar */
.sq-cap { position: relative; z-index: 4; display: grid; place-items: center;
  width: clamp(40px, 4.4vw, 52px); height: clamp(40px, 4.4vw, 52px); border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 38% 30%, var(--perf-surface-elevated), color-mix(in srgb, var(--c) 16%, var(--perf-surface-elevated)));
  border: 2px solid var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 12%, transparent), 0 12px 24px -10px #000; }
.sq-cap i { font-size: 14px; font-weight: 850; font-style: normal; color: var(--perf-text); }
.sq-cap-halo { position: absolute; inset: -10px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 55%, transparent), transparent 70%); filter: blur(10px); z-index: -1;
  opacity: 0.7; transition: opacity 0.3s; }
.sq-pod:hover .sq-cap-halo, .sq-pod.lit .sq-cap-halo { opacity: 1; }
.sq-cap-ring { position: absolute; inset: -5px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  animation: sq-spin 12s linear infinite; }
.sq-cap-ring::before { content: ''; position: absolute; top: -3px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%;
  background: var(--c); box-shadow: 0 0 8px var(--c); }
.sq-pod.awaiting .sq-cap { border-style: dashed; }
.sq-pod.awaiting .sq-cap-ring { display: none; }
.sq-cap-ping { position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--c); animation: sq-ping 2.2s ease-out infinite; }
.sq-cap-flag { position: absolute; top: -4px; right: -4px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  color: #1a1206; background: var(--perf-grad-hero); box-shadow: 0 2px 8px -2px var(--perf-orange); }

/* readiness beam lifting the pod */
.sq-beam { position: relative; width: clamp(11px, 1.7vw, 16px); height: var(--beam, 30%); margin-top: 6px; border-radius: 8px 8px 2px 2px; overflow: visible;
  transform-origin: bottom; transform: scaleY(0); }
.sq.in .sq-beam { animation: sq-grow 1s var(--perf-spring) forwards; animation-delay: calc(var(--d, 0s) + 0.2s); }
.sq-beam-core { position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(to top, var(--c), color-mix(in srgb, var(--c) 28%, transparent));
  box-shadow: 0 0 18px color-mix(in srgb, var(--c) 55%, transparent); }
.sq-beam-shine { position: absolute; left: 0; right: 0; top: -45%; height: 45%; border-radius: inherit;
  background: linear-gradient(transparent, rgba(255,255,255,0.55), transparent); animation: sq-shine 2.8s ease-in-out infinite; }
.sq-beam-foot { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 220%; height: 8px; border-radius: 50%;
  background: var(--c); filter: blur(5px); opacity: 0.6; }
.sq-pod.awaiting .sq-beam { background: repeating-linear-gradient(to top, var(--perf-border-strong) 0 4px, transparent 4px 10px); }
.sq-pod.awaiting .sq-beam-core, .sq-pod.awaiting .sq-beam-shine, .sq-pod.awaiting .sq-beam-foot { display: none; }

/* spotlight pool on the floor */
.sq-pool { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); width: 92px; height: 22px; border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--c) 40%, transparent), transparent 70%); filter: blur(5px);
  opacity: 0.5; transition: opacity 0.3s; pointer-events: none; }
.sq-pod:hover .sq-pool, .sq-pod.lit .sq-pool { opacity: 0.95; }

/* glossy floor reflection of the initials */
.sq-reflect { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%) scaleY(-1);
  font-size: 14px; font-weight: 850; color: var(--c); opacity: 0.16;
  mask-image: linear-gradient(transparent, #000); -webkit-mask-image: linear-gradient(transparent, #000); pointer-events: none; }

.sq-name { margin-top: 12px; font-size: 11px; font-weight: 700; color: var(--perf-text-secondary);
  white-space: nowrap; max-width: 76px; overflow: hidden; text-overflow: ellipsis; }
.sq-pod:hover .sq-name, .sq-pod.lit .sq-name { color: var(--perf-text); }

/* overflow + empty */
.sq-pod.more { justify-content: flex-end; padding-bottom: 30px; }
.sq-cap.ghost { background: var(--perf-glass); border: 1px dashed var(--perf-border-strong); box-shadow: none; }
.sq-cap.ghost b { font-size: 13px; font-weight: 850; color: var(--perf-text-muted); font-style: normal; }
.sq-beam.ghost { height: 20%; background: repeating-linear-gradient(to top, var(--perf-border) 0 4px, transparent 4px 10px); animation: none; transform: none; opacity: 0.6; }
.sq-empty { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center; gap: 9px; font-size: 13px; color: var(--perf-text-muted); }

/* ── keyframes ── */
@keyframes sq-float { from { transform: translate(0, 0); } to { transform: translate(28px, -20px); } }
@keyframes sq-grid { from { background-position: 0 0; } to { background-position: 0 40px; } }
@keyframes sq-dust { 0% { transform: translateY(14px); opacity: 0; } 25% { opacity: 0.85; } 70% { opacity: 0.7; } 100% { transform: translateY(-38px); opacity: 0; } }
@keyframes sq-rise { to { opacity: 1; transform: translateY(0); } }
@keyframes sq-grow { to { transform: scaleY(1); } }
@keyframes sq-shine { 0% { top: -45%; } 60%, 100% { top: 115%; } }
@keyframes sq-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.85); opacity: 0; } }
@keyframes sq-spin { to { transform: rotate(360deg); } }
@keyframes sq-flicker { 0%, 100% { opacity: 0.85; } 45% { opacity: 0.55; } 70% { opacity: 1; } }

/* ── reduced motion ── */
.sq.reduced .sq-aura, .sq.reduced .sq-dust, .sq.reduced .sq-floor, .sq.reduced .sq-cap-ring,
.sq.reduced .sq-cap-ping, .sq.reduced .sq-beam-shine, .sq.reduced .sq-cone-flick { animation: none; }
.sq.reduced .sq-pod, .sq.reduced .sq-beam { animation: none; opacity: 1; transform: none; }
.sq.reduced .sq-dust { display: none; }
.sq.reduced .sq-atmos { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .sq-aura, .sq-dust, .sq-floor, .sq-cap-ring, .sq-cap-ping, .sq-beam-shine, .sq-cone-flick { animation: none; }
  .sq-pod, .sq-beam { animation: none; opacity: 1; transform: none; }
  .sq-dust { display: none; }
}
</style>
