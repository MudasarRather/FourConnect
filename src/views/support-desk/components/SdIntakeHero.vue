<template>
  <!-- Tall cinematic intake hero. Three stacked zones so NOTHING overlaps:
       (1) .sh-top — eyebrow/title/sub + draft + actions, on a clean backdrop.
       (2) .sh-lane — the signature INTAKE STREAM band: charged conduits flow left→right
           and converge into a forming reactor core that LOCKS (emerald + ring-burst +
           sheen) when the ticket is submit-ready. Lives in its own lane → never collides
           with the controls (the old bug).
       (3) <SdIntakeStepper> — the step conduit spine. -->
  <header class="sd-hero" :class="{ ready }">
    <span class="sh-bg-grid" aria-hidden="true" />
    <span class="sh-bg-aura" aria-hidden="true" />

    <!-- (1) title + actions -->
    <div class="sh-top">
      <Motion class="sh-lead" :initial="{ opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <span class="sh-eyebrow"><Workflow :size="12" /> {{ eyebrow }}</span>
        <h1 class="sh-title">{{ title }} <span class="grad">{{ accent }}</span></h1>
        <p class="sh-sub">{{ sub }}</p>
      </Motion>
      <Motion class="sh-right" :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <span class="sh-draft" :title="'A permanent number is minted on submit'">
          <Hash :size="12" /> <b class="sd-mono">{{ draftLabel }}</b><i>draft</i>
        </span>
        <div class="sh-actions">
          <Motion as="button" type="button" class="sh-btn ghost" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="emit('save')">
            <Save :size="14" /> <span class="sh-btxt">Save draft</span>
          </Motion>
          <Motion as="button" type="button" class="sh-btn ghost danger" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="emit('discard')">
            <Trash2 :size="14" />
          </Motion>
          <Motion as="button" type="button" class="sh-btn primary" :class="{ off: !canSubmit }" :whileHover="canSubmit ? { y: -2, scale: 1.02 } : {}" :whileTap="canSubmit ? { scale: 0.97 } : {}" :disabled="!canSubmit || saving" @click="emit('submit')">
            <component :is="saving ? LoaderCircle : Rocket" :size="15" :class="{ spin: saving }" />
            {{ saving ? 'Creating…' : 'Create ticket' }}
          </Motion>
        </div>
      </Motion>
    </div>

    <!-- (2) BODY — animation (+ stepper) on the left, the Incident credential on the right -->
    <div class="sh-body">
     <div class="sh-anim">
      <!-- signature INTAKE STREAM lane -->
      <div class="sh-lane" aria-hidden="true">
        <svg class="sh-stream" viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="shFlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fb923c" stop-opacity="0" />
            <stop offset="40%" stop-color="#fb923c" stop-opacity="0.5" />
            <stop offset="80%" stop-color="#f59e0b" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#ffb900" stop-opacity="1" />
          </linearGradient>
          <radialGradient id="shCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffb900" stop-opacity="0.95" />
            <stop offset="60%" stop-color="#f97316" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
          </radialGradient>
        </defs>
        <!-- conduits converge from the left edge into the core at (912,60) -->
        <g class="sh-flows" stroke="url(#shFlow)" fill="none" stroke-linecap="round">
          <path d="M-30,18  C 320,8   640,52  900,60" stroke-width="2" />
          <path d="M-30,42  C 360,34  660,56  900,60" stroke-width="2.6" />
          <path d="M-30,60  C 380,60  680,60  900,60" stroke-width="3" />
          <path d="M-30,78  C 360,86  660,64  900,60" stroke-width="2.6" />
          <path d="M-30,102 C 320,112 640,68  900,60" stroke-width="2" />
          <path d="M-30,30  C 420,20  720,54  900,60" stroke-width="1.4" opacity="0.55" />
          <path d="M-30,90  C 420,100 720,66  900,60" stroke-width="1.4" opacity="0.55" />
        </g>
        <!-- forming reactor core -->
        <g class="sh-core" transform="translate(912 60)">
          <circle class="sh-core-aura" r="46" fill="url(#shCore)" />
          <circle class="sh-ring sh-ring-1" r="30" fill="none" />
          <circle class="sh-ring sh-ring-2" r="22" fill="none" />
          <path class="sh-hex" d="M0,-17 L15,-8.5 L15,8.5 L0,17 L-15,8.5 L-15,-8.5 Z" />
          <path class="sh-tick" d="M-6.5,0.5 L-1.5,5.5 L7,-5" />
          <circle class="sh-burst" r="30" fill="none" />
        </g>
        <!-- travelling packets -->
        <circle class="sh-packet p1" r="2.4" fill="#ffb900" />
        <circle class="sh-packet p2" r="2" fill="#fb923c" />
          <circle class="sh-packet p3" r="2.6" fill="#ffd166" />
        </svg>
        <span class="sh-sheen" />
      </div>

      <!-- step conduit -->
      <SdIntakeStepper :steps="steps" :current="current" :reached="reached" @jump="(i) => emit('jump', i)" />
     </div>

     <!-- the Incident credential lives in the hero now -->
     <div class="sh-cred"><slot name="credential" /></div>
    </div>
  </header>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Workflow, Hash, Save, Trash2, Rocket, LoaderCircle } from 'lucide-vue-next'
import SdIntakeStepper from './SdIntakeStepper.vue'

defineProps({
  eyebrow: { type: String, default: 'INTELLIGENT INTAKE' },
  title: { type: String, default: 'Create a' },
  accent: { type: String, default: 'support ticket' },
  sub: { type: String, default: '' },
  draftLabel: { type: String, default: 'TKT-••••' },
  steps: { type: Array, default: () => [] },
  current: { type: Number, default: 0 },
  reached: { type: Number, default: 0 },
  completion: { type: Number, default: 0 },
  canSubmit: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  ready: { type: Boolean, default: false },
})
const emit = defineEmits(['jump', 'save', 'discard', 'submit'])
</script>

<style scoped>
.sd-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 28px 20px; margin-bottom: 16px; border: 1px solid var(--sd-border); background: var(--sd-surface); box-shadow: var(--sd-card-shadow); }
.sd-hero::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: var(--sd-grad-card); opacity: 0.7; }
.sh-bg-grid { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.3; background-image: linear-gradient(var(--sd-border) 1px, transparent 1px), linear-gradient(90deg, var(--sd-border) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(75% 120% at 76% 58%, #000, transparent 72%); -webkit-mask-image: radial-gradient(75% 120% at 76% 58%, #000, transparent 72%); }
.sh-bg-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(46% 80% at 78% 56%, color-mix(in srgb, var(--sd-ember) 14%, transparent), transparent 70%); transition: background 0.6s; }
.sd-hero.ready .sh-bg-aura { background: radial-gradient(46% 80% at 78% 56%, color-mix(in srgb, var(--sd-success) 16%, transparent), transparent 70%); }

/* (1) top row — clean, above everything */
.sh-top { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.sh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sd-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-amber); padding: 4px 10px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.sh-title { font-size: clamp(26px, 3.4vw, 40px); font-weight: 850; line-height: 1.02; margin: 12px 0 6px; letter-spacing: -0.02em; color: var(--sd-text); }
.sh-title .grad { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sh-sub { font-size: 13.5px; color: var(--sd-text-secondary); margin: 0; max-width: 48ch; }
.sh-right { display: flex; flex-direction: column; align-items: flex-end; gap: 11px; }
.sh-draft { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sd-text-muted); padding: 5px 12px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.sh-draft b { color: var(--sd-text-secondary); letter-spacing: 0.06em; }
.sh-draft i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-dim); }
.sh-actions { display: flex; gap: 8px; }
.sh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 15px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: border-color 0.2s, color 0.2s, background 0.2s; }
.sh-btn.ghost:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.sh-btn.danger:hover { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); background: var(--sd-danger-soft); }
.sh-btn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251, 146, 60, 0.28); }
[data-theme="light"] .sh-btn.primary { color: #fff8ec; }
.sh-btn.primary.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.sh-btn:disabled { cursor: not-allowed; }
.sh-btn .spin { animation: sd-spin-slow 0.9s linear infinite; }

/* (2) hero body — animation+stepper (left) · Incident credential (right) */
.sh-body { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: stretch; margin-top: 14px; }
.sh-anim { display: flex; flex-direction: column; justify-content: center; gap: 14px; min-width: 0; }
.sh-cred { min-width: 0; display: flex; }
.sh-cred > * { width: 100%; }

/* signature lane — the conduit forge animation */
.sh-lane { position: relative; z-index: 1; height: 124px; }
.sh-stream { position: absolute; inset: 0; width: 100%; height: 100%; }
.sh-flows path { stroke-dasharray: 16 13; animation: sh-flow 2.6s linear infinite; }
.sh-flows path:nth-child(2) { animation-duration: 2.1s; } .sh-flows path:nth-child(3) { animation-duration: 1.8s; }
.sh-flows path:nth-child(4) { animation-duration: 2.3s; } .sh-flows path:nth-child(5) { animation-duration: 2.9s; }
.sh-flows path:nth-child(6) { animation-duration: 3.3s; } .sh-flows path:nth-child(7) { animation-duration: 3.6s; }
@keyframes sh-flow { to { stroke-dashoffset: -290; } }

.sh-core-aura { opacity: 0.5; transform-origin: center; animation: sh-breathe 3.6s ease-in-out infinite; }
.sh-ring { stroke: color-mix(in srgb, var(--sd-amber) 55%, transparent); stroke-width: 1.4; stroke-dasharray: 5 7; transform-origin: center; }
.sh-ring-1 { animation: sh-spin 9s linear infinite; }
.sh-ring-2 { animation: sh-spin 6s linear infinite reverse; stroke-dasharray: 3 6; }
.sh-hex { fill: color-mix(in srgb, var(--sd-amber) 16%, transparent); stroke: color-mix(in srgb, var(--sd-amber) 75%, transparent); stroke-width: 2; transform-origin: center; transition: fill 0.5s, stroke 0.5s, transform 0.5s var(--sd-spring); }
.sh-tick { fill: none; stroke: var(--sd-success); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0; stroke-dasharray: 22; stroke-dashoffset: 22; }
.sh-burst { stroke: var(--sd-success); stroke-width: 2; opacity: 0; transform-origin: center; }
.sh-packet { opacity: 0; offset-path: path("M-30,60 C 380,60 680,60 900,60"); animation: sh-packet 2.4s linear infinite; filter: drop-shadow(0 0 4px #ffb900); }
.sh-packet.p2 { offset-path: path("M-30,42 C 360,34 660,56 900,60"); animation-duration: 3s; animation-delay: 0.8s; }
.sh-packet.p3 { offset-path: path("M-30,78 C 360,86 660,64 900,60"); animation-duration: 2.7s; animation-delay: 1.5s; }
@keyframes sh-packet { 0% { offset-distance: 0%; opacity: 0; } 10% { opacity: 1; } 88% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
@keyframes sh-breathe { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.16); opacity: 0.72; } }
@keyframes sh-spin { to { transform: rotate(360deg); } }

/* READY — the core LOCKS: bigger, emerald, tick draws, ring-burst, sheen sweeps */
.sd-hero.ready .sh-core { animation: sh-core-pop 0.6s var(--sd-spring); }
.sd-hero.ready .sh-hex { fill: color-mix(in srgb, var(--sd-success) 26%, transparent); stroke: var(--sd-success); transform: scale(1.35); }
.sd-hero.ready .sh-ring { stroke: color-mix(in srgb, var(--sd-success) 55%, transparent); }
.sd-hero.ready .sh-core-aura { animation: none; opacity: 0.66; }
.sd-hero.ready .sh-tick { opacity: 1; animation: sh-draw 0.5s 0.15s var(--sd-spring) forwards; }
.sd-hero.ready .sh-burst { animation: sh-burst 0.9s 0.1s var(--sd-spring); }
.sd-hero.ready .sh-sheen { animation: sh-sheen 0.9s var(--sd-spring); }
@keyframes sh-core-pop { 0% { transform: translate(912px, 60px) scale(0.9); } 60% { transform: translate(912px, 60px) scale(1.08); } 100% { transform: translate(912px, 60px) scale(1); } }
@keyframes sh-draw { to { stroke-dashoffset: 0; } }
@keyframes sh-burst { 0% { opacity: 0.85; r: 18; stroke-width: 3; } 100% { opacity: 0; r: 50; stroke-width: 0.5; } }
.sh-sheen { position: absolute; inset: 0; opacity: 0; background: linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--sd-success) 22%, transparent) 50%, transparent 70%); pointer-events: none; }
@keyframes sh-sheen { 0% { opacity: 0; transform: translateX(-40%); } 35% { opacity: 1; } 100% { opacity: 0; transform: translateX(40%); } }

@media (max-width: 1040px) { .sh-body { grid-template-columns: 1fr; } .sh-cred { max-width: 420px; } }
@media (max-width: 720px) {
  .sh-right { align-items: flex-start; width: 100%; }
  .sh-btxt { display: none; }
  .sh-lane { height: 92px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sh-flows path,
  html:not([data-cinematic="on"]) .sh-core-aura,
  html:not([data-cinematic="on"]) .sh-ring,
  html:not([data-cinematic="on"]) .sh-packet { animation: none; }
  html:not([data-cinematic="on"]) .sh-packet { opacity: 0.8; }
  html:not([data-cinematic="on"]) .sh-btn .spin { animation: sd-spin-slow 1s linear infinite; }
}
</style>
