<template>
  <Motion as="div" class="trv-empty trv-grain"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="te-aura" aria-hidden="true" />
    <span class="te-floor" aria-hidden="true" />

    <!-- ░ signature scanner instrument ░ -->
    <div class="te-scanner" aria-hidden="true">
      <span class="te-ring r1" />
      <span class="te-ring r2" />
      <span class="te-ring r3" />
      <span class="te-sweep" />
      <span class="te-orbit o1"><i class="te-sat" /></span>
      <span class="te-orbit o2"><i class="te-sat alt" /></span>
      <span class="te-crosshair h" /><span class="te-crosshair v" />
      <div class="te-core">
        <component :is="icon" :size="28" />
        <span class="te-core-ping" />
      </div>
      <i v-for="p in 5" :key="p" class="te-particle" :style="particleStyle(p)" />
    </div>

    <Motion as="h3" class="trv-empty-title"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">{{ title }}</Motion>
    <Motion as="p" class="trv-empty-sub"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }">{{ subtitle }}</Motion>

    <Motion v-if="cta" as="button" type="button" class="trv-empty-cta"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.34, ease: [0.16, 1, 0.3, 1] }"
      :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.97 }" @click="$emit('cta')">
      <component :is="ctaIcon" v-if="ctaIcon" :size="15" /> {{ cta }}
    </Motion>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { PlaneTakeoff } from 'lucide-vue-next'

defineProps({
  icon: { type: [Object, Function], default: () => PlaneTakeoff },
  title: { type: String, default: 'Nothing on the board' },
  subtitle: { type: String, default: 'No records match the current view.' },
  cta: { type: String, default: '' },
  ctaIcon: { type: [Object, Function], default: null },
})
defineEmits(['cta'])

// deterministic ambient particle choreography (no per-frame randomness)
const particleStyle = (i) => {
  const left = 16 + ((i * 53) % 68)
  const delay = ((i * 0.7) % 3.5).toFixed(1)
  const dur = (4.2 + ((i * 1.3) % 2.4)).toFixed(1)
  const size = 2 + (i % 3)
  return { left: left + '%', width: size + 'px', height: size + 'px', animationDelay: delay + 's', animationDuration: dur + 's' }
}
</script>

<style scoped>
.trv-empty {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 52px 24px 48px; gap: 7px;
  border-radius: 22px; border: 1px solid var(--trv-border-strong);
  background:
    radial-gradient(120% 80% at 50% 8%, color-mix(in srgb, var(--trv-amber) 9%, transparent), transparent 60%),
    linear-gradient(170deg, var(--trv-surface), var(--trv-panel));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), var(--trv-card-shadow);
}
.te-aura {
  position: absolute; inset: -40% 20% 40% 20%; pointer-events: none; z-index: 0;
  background: radial-gradient(50% 60% at 50% 30%, color-mix(in srgb, var(--trv-amber) 18%, transparent), transparent 70%);
  animation: trv-aura-drift 9s ease-in-out infinite;
}
.te-floor {
  position: absolute; inset: auto -10% -2% -10%; height: 46%; z-index: 0; pointer-events: none; opacity: 0.5;
  background:
    repeating-linear-gradient(90deg, transparent 0 40px, color-mix(in srgb, var(--trv-amber) 6%, transparent) 40px 41px),
    repeating-linear-gradient(0deg, transparent 0 24px, color-mix(in srgb, var(--trv-text) 4%, transparent) 24px 25px);
  transform: perspective(420px) rotateX(66deg); transform-origin: bottom center;
  -webkit-mask-image: linear-gradient(to top, #000, transparent); mask-image: linear-gradient(to top, #000, transparent);
}

/* ░ scanner ░ */
.te-scanner { position: relative; z-index: 1; width: 152px; height: 152px; margin-bottom: 10px; display: grid; place-items: center; }
.te-ring { position: absolute; border-radius: 50%; border: 1px solid var(--trv-amber-border); }
.te-ring.r1 { inset: 0; animation: te-breathe 3.6s ease-in-out infinite; }
.te-ring.r2 { inset: 16%; border-style: dashed; opacity: 0.7; animation: te-breathe 3.6s ease-in-out infinite 0.4s, te-rot 26s linear infinite; }
.te-ring.r3 { inset: 32%; opacity: 0.5; animation: te-breathe 3.6s ease-in-out infinite 0.8s; }
.te-sweep {
  position: absolute; inset: 4%; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--trv-amber) 22%, transparent) 56deg, transparent 120deg);
  animation: te-rot 4.2s linear infinite;
}
.te-crosshair { position: absolute; background: var(--trv-border); z-index: 1; }
.te-crosshair.h { left: 6%; right: 6%; top: 50%; height: 1px; }
.te-crosshair.v { top: 6%; bottom: 6%; left: 50%; width: 1px; }

.te-orbit { position: absolute; border-radius: 50%; }
.te-orbit.o1 { inset: 8%; animation: te-rot 7s linear infinite; }
.te-orbit.o2 { inset: 24%; animation: te-rot 9.5s linear infinite reverse; }
.te-sat { position: absolute; top: -3.5px; left: 50%; transform: translateX(-50%); width: 7px; height: 7px; border-radius: 50%;
  background: var(--trv-amber-bright); box-shadow: 0 0 8px var(--trv-amber), 0 0 16px color-mix(in srgb, var(--trv-amber) 50%, transparent); }
.te-sat.alt { background: var(--trv-ember); box-shadow: 0 0 8px var(--trv-ember); }

.te-core {
  position: relative; z-index: 2; width: 58px; height: 58px; display: grid; place-items: center; border-radius: 50%;
  color: var(--trv-amber);
  background: radial-gradient(circle, color-mix(in srgb, var(--trv-amber) 22%, transparent), transparent 72%);
  border: 1px solid var(--trv-amber-border);
  box-shadow: 0 0 24px -6px var(--trv-amber), inset 0 0 14px -6px var(--trv-amber);
  animation: te-corepulse 3.2s ease-in-out infinite;
}
.te-core-ping { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--trv-amber-border); animation: te-ping 3.4s ease-out infinite; }

.te-particle { position: absolute; bottom: 14%; border-radius: 50%; background: var(--trv-amber-bright);
  box-shadow: 0 0 6px var(--trv-amber); opacity: 0; animation: te-rise linear infinite; z-index: 1; }

.trv-empty-title { position: relative; z-index: 1; font-size: 18px; font-weight: 850; color: var(--trv-text); margin: 0; letter-spacing: -0.01em; }
.trv-empty-sub { position: relative; z-index: 1; font-size: 13px; color: var(--trv-text-muted); margin: 0; max-width: 400px; line-height: 1.55; }
.trv-empty-cta {
  position: relative; z-index: 1; margin-top: 14px; display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 800; color: #1a1205;
  background: var(--trv-grad-hero); box-shadow: var(--trv-amber-glow);
}

@keyframes te-rot { to { transform: rotate(360deg); } }
@keyframes te-breathe { 0%, 100% { transform: scale(1); opacity: var(--o, 1); } 50% { transform: scale(1.05); opacity: 0.5; } }
@keyframes te-corepulse { 0%, 100% { box-shadow: 0 0 24px -6px var(--trv-amber), inset 0 0 14px -6px var(--trv-amber); } 50% { box-shadow: 0 0 34px -4px var(--trv-amber), inset 0 0 18px -4px var(--trv-amber); } }
@keyframes te-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.5); opacity: 0; } }
@keyframes te-rise { 0% { transform: translateY(0) scale(0.7); opacity: 0; } 16% { opacity: 0.9; } 100% { transform: translateY(-120px) scale(1); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .te-aura, .te-ring, .te-sweep, .te-orbit, .te-core, .te-core-ping, .te-particle { animation: none !important; }
  .te-particle { display: none; }
}
</style>
