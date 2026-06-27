<template>
  <!-- "Your Passage" empty-state — a serene, cinematic THRESHOLD OF LIGHT for the
       self-service exit page when no resignation is active. On-theme with the exit
       module's ceremonial-gateway metaphor: a luminous doorway pours warm light onto
       a calm pool, embers drift upward, volumetric rays fan out, all parallax-reactive.
       Emits @begin when the employee chooses to start a resignation. -->
  <div ref="root" class="sp ex-grain" :class="{ reduced, closed }" @pointermove="onMove" @pointerleave="reset">
    <!-- far atmosphere -->
    <div class="sp-atmos" aria-hidden="true" :style="pAtmos">
      <span class="sp-sky" />
      <span class="sp-aurora a" /><span class="sp-aurora b" />
      <span class="sp-grid" />
    </div>

    <!-- the luminous threshold -->
    <div class="sp-stage">
      <div class="sp-scene" :style="pStage">
        <span class="sp-rays" aria-hidden="true" />
        <span class="sp-sun" aria-hidden="true" />
        <span class="sp-halo" aria-hidden="true" /><span class="sp-halo h2" aria-hidden="true" /><span class="sp-halo h3" aria-hidden="true" />

        <div class="sp-arch" aria-hidden="true">
          <span class="sp-arch-light"><span class="sp-arch-slats" /><span class="sp-arch-shimmer" /></span>
          <span class="sp-arch-thresh" />
        </div>

        <span class="sp-beam" aria-hidden="true" />
        <span class="sp-pool" aria-hidden="true" />

        <!-- drifting embers rising toward the light -->
        <span v-for="n in 16" :key="n" class="sp-ember" :style="emberStyle(n)" aria-hidden="true" />
      </div>
    </div>

    <!-- copy + call to action -->
    <div class="sp-copy">
      <span class="sp-eyebrow"><Sparkles :size="12" /> {{ closed ? 'A fresh chapter' : 'When the time comes' }}</span>
      <h3 class="sp-h">{{ closed ? 'Considering another move?' : 'Thinking of moving on?' }}</h3>
      <p class="sp-sub">Submitting a resignation respectfully notifies your manager &amp; HR. You can revise or withdraw it any time before it's accepted.</p>

      <button v-if="eligible" class="sp-cta" type="button" @click="$emit('begin')">
        <span class="sp-cta-glow" aria-hidden="true" />
        <DoorOpen :size="16" /> <span>Begin a resignation</span> <ArrowRight :size="15" class="sp-cta-arr" />
      </button>
      <p v-else class="sp-gate"><Info :size="13" /> {{ gateNote }}</p>

      <ul class="sp-reassure">
        <li :style="{ '--d': '0.30s' }"><ShieldCheck :size="13" /> Revise or withdraw anytime before it's accepted</li>
        <li :style="{ '--d': '0.40s' }"><Clock :size="13" /> Your notice period &amp; last day are calculated for you</li>
        <li :style="{ '--d': '0.50s' }"><HeartHandshake :size="13" /> A guided, respectful send-off — step by step</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DoorOpen, ArrowRight, Info, Sparkles, ShieldCheck, Clock, HeartHandshake } from 'lucide-vue-next'

const props = defineProps({
  eligible: { type: Boolean, default: true },
  gateNote: { type: String, default: '' },
  closed: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['begin'])

// deterministic ember placement (no Math.random → stable across renders)
const emberStyle = (n) => {
  const left = 6 + (n * 61) % 88
  const dur = 6 + (n % 5) * 1.4
  const delay = (n % 8) * 0.7
  const size = 2 + (n % 3)
  const drift = ((n % 5) - 2) * 16
  return { left: left + '%', '--dur': dur + 's', '--delay': delay + 's', '--sz': size + 'px', '--dx': drift + 'px' }
}

// pointer-parallax depth — far atmosphere drifts against the pointer, the near
// scene leans into it
const root = ref(null)
const pAtmos = ref({})
const pStage = ref({})
function onMove(e) {
  if (props.reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  pAtmos.value = { transform: `translate3d(${(dx * -10).toFixed(1)}px, ${(dy * -7).toFixed(1)}px, 0)` }
  pStage.value = { transform: `translate3d(${(dx * 17).toFixed(1)}px, ${(dy * 11).toFixed(1)}px, 0)` }
}
const reset = () => { pAtmos.value = {}; pStage.value = {} }
</script>

<style scoped>
.sp { position: relative; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; align-items: center;
  padding: 30px 28px 40px; border-radius: 22px; text-align: center;
  background:
    radial-gradient(120% 80% at 50% -8%, color-mix(in srgb, var(--ex-ember) 13%, transparent), transparent 60%),
    linear-gradient(180deg, var(--ex-surface-elevated), var(--ex-surface));
  border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }

/* ── far atmosphere ── */
.sp-atmos { position: absolute; inset: 0; z-index: 0; pointer-events: none; transition: transform 0.45s var(--ex-ease); will-change: transform; }
.sp-sky { position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 4%, color-mix(in srgb, var(--ex-amber) 10%, transparent), transparent 70%); }
.sp-aurora { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; }
.sp-aurora.a { width: 420px; height: 420px; top: -150px; left: 10%; background: radial-gradient(circle, color-mix(in srgb, var(--ex-ember) 46%, transparent), transparent 65%); animation: sp-aur-a 22s var(--ex-ease) infinite; }
.sp-aurora.b { width: 360px; height: 360px; bottom: -160px; right: 6%; background: radial-gradient(circle, color-mix(in srgb, var(--ex-amber) 40%, transparent), transparent 65%); animation: sp-aur-b 27s var(--ex-ease) infinite; }
.sp-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: radial-gradient(color-mix(in srgb, var(--ex-ember) 9%, transparent) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask: radial-gradient(90% 75% at 50% 22%, #000, transparent 78%); mask: radial-gradient(90% 75% at 50% 22%, #000, transparent 78%); }

/* ── stage / scene ── */
.sp-stage { position: relative; z-index: 1; width: 100%; height: clamp(216px, 30vw, 270px); display: grid; place-items: center; }
.sp-scene { position: relative; width: 280px; height: 100%; display: grid; place-items: center; transition: transform 0.4s var(--ex-ease); will-change: transform; }

/* volumetric light fan behind the door */
.sp-rays { position: absolute; left: 50%; top: 38%; width: 360px; height: 360px; transform: translate(-50%, -50%); border-radius: 50%; opacity: 0.5;
  background: conic-gradient(from 0deg,
    transparent 0deg, color-mix(in srgb, var(--ex-amber) 30%, transparent) 8deg, transparent 16deg,
    transparent 40deg, color-mix(in srgb, var(--ex-ember) 24%, transparent) 48deg, transparent 56deg,
    transparent 88deg, color-mix(in srgb, var(--ex-amber) 26%, transparent) 96deg, transparent 104deg,
    transparent 150deg, color-mix(in srgb, var(--ex-ember) 22%, transparent) 158deg, transparent 166deg,
    transparent 220deg, color-mix(in srgb, var(--ex-amber) 24%, transparent) 228deg, transparent 236deg,
    transparent 300deg, color-mix(in srgb, var(--ex-ember) 22%, transparent) 308deg, transparent 316deg, transparent 360deg);
  -webkit-mask: radial-gradient(circle, transparent 24%, #000 38%, transparent 72%); mask: radial-gradient(circle, transparent 24%, #000 38%, transparent 72%);
  filter: blur(2px); animation: sp-rays-spin 64s linear infinite; }

/* key-light sun glow behind the arch top */
.sp-sun { position: absolute; left: 50%; top: 22%; width: 150px; height: 150px; transform: translateX(-50%); border-radius: 50%;
  background: var(--ex-grad-sun); filter: blur(14px); opacity: 0.55; animation: sp-sun-pulse 6s var(--ex-ease) infinite; }

/* breathing halo rings */
.sp-halo { position: absolute; left: 50%; top: 38%; width: 150px; height: 150px; transform: translate(-50%, -50%); border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ex-amber) 36%, transparent); opacity: 0; animation: sp-halo 4.6s var(--ex-ease) infinite; }
.sp-halo.h2 { width: 210px; height: 210px; animation-delay: 1.5s; }
.sp-halo.h3 { width: 270px; height: 270px; animation-delay: 3s; }

/* the doorway */
.sp-arch { position: relative; z-index: 2; width: clamp(104px, 16vw, 126px); height: clamp(168px, 26vw, 202px); padding: 6px;
  border-radius: 999px 999px 16px 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-amber-bright) 60%, var(--ex-surface)) 0%, color-mix(in srgb, var(--ex-ember) 46%, var(--ex-surface)) 100%);
  box-shadow:
    0 0 56px -6px color-mix(in srgb, var(--ex-ember) 68%, transparent),
    0 18px 40px -16px color-mix(in srgb, var(--ex-ember-deep) 70%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
  animation: sp-arch-float 6.5s var(--ex-ease) infinite; }
.sp-arch-light { position: absolute; inset: 6px; overflow: hidden; border-radius: 999px 999px 10px 10px;
  background: linear-gradient(180deg, color-mix(in srgb, #fff 86%, var(--ex-amber-bright)) 0%, var(--ex-amber) 38%, var(--ex-ember) 76%, var(--ex-ember-deep) 100%);
  box-shadow: inset 0 0 34px color-mix(in srgb, #fff 55%, transparent), inset 0 -14px 26px color-mix(in srgb, var(--ex-ember-deep) 40%, transparent); }
.sp-arch-slats { position: absolute; inset: 0; opacity: 0.35;
  background: repeating-linear-gradient(90deg, transparent 0 13px, color-mix(in srgb, var(--ex-ember-deep) 30%, transparent) 13px 14px);
  -webkit-mask: linear-gradient(180deg, transparent, #000 30%); mask: linear-gradient(180deg, transparent, #000 30%); }
.sp-arch-shimmer { position: absolute; inset: -20% -50%; background: linear-gradient(100deg, transparent 42%, color-mix(in srgb, #fff 65%, transparent) 50%, transparent 58%);
  transform: translateY(-120%); animation: sp-shimmer 4.2s var(--ex-ease) infinite; }
.sp-arch-thresh { position: absolute; left: 50%; bottom: -3px; width: clamp(96px, 15vw, 116px); height: 6px; transform: translateX(-50%); border-radius: 999px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber-bright) 90%, #fff), transparent);
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--ex-amber) 70%, transparent); animation: sp-thresh 3.2s ease-in-out infinite; }

/* light pouring down to the floor */
.sp-beam { position: absolute; z-index: 1; left: 50%; top: 56%; width: clamp(120px, 18vw, 150px); height: 150px; transform: translateX(-50%); transform-origin: top center;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-amber) 30%, transparent), transparent 78%);
  clip-path: polygon(34% 0, 66% 0, 100% 100%, 0 100%); filter: blur(3px); opacity: 0.6; animation: sp-beam 5.5s var(--ex-ease) infinite; }
.sp-pool { position: absolute; z-index: 1; left: 50%; bottom: 8%; width: clamp(150px, 22vw, 200px); height: 30px; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--ex-amber) 42%, transparent), transparent 70%); filter: blur(7px); opacity: 0.7; animation: sp-pool 5.5s var(--ex-ease) infinite; }

/* rising embers */
.sp-ember { position: absolute; bottom: 4%; width: var(--sz, 3px); height: var(--sz, 3px); border-radius: 50%;
  background: color-mix(in srgb, var(--ex-amber-bright) 85%, transparent); box-shadow: 0 0 7px color-mix(in srgb, var(--ex-amber) 85%, transparent);
  opacity: 0; animation: sp-ember var(--dur, 8s) ease-in infinite; animation-delay: var(--delay, 0s); }

/* ── copy ── */
.sp-copy { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; margin-top: 6px; }
.sp-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 850; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ex-violet); padding: 4px 12px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.sp-eyebrow :deep(svg) { animation: sp-spark 2.6s ease-in-out infinite; }
.sp-h { font-size: clamp(20px, 2.6vw, 25px); font-weight: 860; letter-spacing: -0.01em; margin: 12px 0 6px; color: var(--ex-text); }
.sp-sub { font-size: 13px; line-height: 1.55; color: var(--ex-text-muted); max-width: 430px; margin: 0 0 18px; }

.sp-cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 13px; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 800; color: #1a1206; border: none; background: var(--ex-grad-hero);
  box-shadow: 0 12px 30px -10px color-mix(in srgb, var(--ex-ember) 70%, transparent); transition: transform 0.2s var(--ex-spring), box-shadow 0.25s, filter 0.2s; }
.sp-cta:hover { transform: translateY(-2px); filter: brightness(1.04); box-shadow: 0 18px 40px -12px color-mix(in srgb, var(--ex-ember) 80%, transparent); }
.sp-cta:active { transform: translateY(0) scale(0.98); }
.sp-cta-glow { position: absolute; inset: 0; pointer-events: none; transform: translateX(-130%) skewX(-18deg);
  background: linear-gradient(100deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%); animation: sp-cta-sweep 3.6s ease-in-out infinite 1s; }
.sp-cta-arr { transition: transform 0.2s var(--ex-spring); }
.sp-cta:hover .sp-cta-arr { transform: translateX(4px); }
.sp-gate { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ex-text-muted); margin: 0; }
.sp-gate :deep(svg) { color: var(--ex-amber); flex-shrink: 0; }

.sp-reassure { list-style: none; margin: 20px 0 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 10px; }
.sp-reassure li { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 650; color: var(--ex-text-secondary);
  padding: 7px 13px; border-radius: 999px; background: var(--ex-panel); border: 1px solid var(--ex-border);
  animation: sp-rise 0.5s var(--ex-spring) backwards; animation-delay: var(--d, 0.3s); }
.sp-reassure li :deep(svg) { color: var(--ex-cleared); flex-shrink: 0; }

/* ── keyframes ── */
@keyframes sp-aur-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(26px, 20px) scale(1.08); } }
@keyframes sp-aur-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-24px, -18px) scale(1.1); } }
@keyframes sp-rays-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes sp-sun-pulse { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.45; } 50% { transform: translateX(-50%) scale(1.1); opacity: 0.62; } }
@keyframes sp-halo { 0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; } 30% { opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(1.25); opacity: 0; } }
@keyframes sp-arch-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes sp-shimmer { 0% { transform: translateY(-120%); } 55%, 100% { transform: translateY(240%); } }
@keyframes sp-thresh { 0%, 100% { opacity: 0.7; transform: translateX(-50%) scaleX(0.92); } 50% { opacity: 1; transform: translateX(-50%) scaleX(1.04); } }
@keyframes sp-beam { 0%, 100% { opacity: 0.45; transform: translateX(-50%) scaleY(0.96); } 50% { opacity: 0.68; transform: translateX(-50%) scaleY(1.04); } }
@keyframes sp-pool { 0%, 100% { opacity: 0.55; transform: translateX(-50%) scaleX(0.94); } 50% { opacity: 0.78; transform: translateX(-50%) scaleX(1.05); } }
@keyframes sp-ember { 0% { transform: translate(0, 0) scale(0.6); opacity: 0; } 18% { opacity: 0.9; } 80% { opacity: 0.7; } 100% { transform: translate(var(--dx, 0), -170px) scale(1); opacity: 0; } }
@keyframes sp-spark { 0%, 100% { opacity: 0.7; transform: scale(1) rotate(0); } 50% { opacity: 1; transform: scale(1.15) rotate(8deg); } }
@keyframes sp-cta-sweep { 0% { transform: translateX(-130%) skewX(-18deg); } 55%, 100% { transform: translateX(230%) skewX(-18deg); } }
@keyframes sp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ── reduced motion ── */
.sp.reduced .sp-atmos, .sp.reduced .sp-scene { transition: none; }
.sp.reduced .sp-aurora, .sp.reduced .sp-rays, .sp.reduced .sp-sun, .sp.reduced .sp-halo, .sp.reduced .sp-arch,
.sp.reduced .sp-arch-shimmer, .sp.reduced .sp-arch-thresh, .sp.reduced .sp-beam, .sp.reduced .sp-pool, .sp.reduced .sp-ember,
.sp.reduced .sp-eyebrow :deep(svg), .sp.reduced .sp-cta-glow, .sp.reduced .sp-reassure li { animation: none; }
.sp.reduced .sp-ember { display: none; }
@media (prefers-reduced-motion: reduce) {
  .sp-atmos, .sp-scene { transition: none; }
  .sp-aurora, .sp-rays, .sp-sun, .sp-halo, .sp-arch, .sp-arch-shimmer, .sp-arch-thresh, .sp-beam, .sp-pool, .sp-ember,
  .sp-cta-glow, .sp-reassure li { animation: none !important; }
  .sp-ember { display: none; }
}
</style>
