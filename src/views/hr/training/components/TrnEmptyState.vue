<template>
  <Motion ref="rootRef" class="trn-empty" as="div"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <div class="te-grain trn-grain" aria-hidden="true" />
    <div class="te-spot trn-spotlight" aria-hidden="true" />
    <div class="te-floor" aria-hidden="true" />
    <div class="te-stars" aria-hidden="true">
      <span v-for="s in 9" :key="s" class="te-dust" :style="dustStyle(s)" />
    </div>
    <span class="te-shoot s1" aria-hidden="true" />
    <span class="te-shoot s2" aria-hidden="true" />

    <!-- parallax wrapper (CSS transform from pointer) holds the Motion orbit -->
    <div class="te-orb-par">
      <Motion class="te-orb" as="div" aria-hidden="true"
        :initial="reduced ? false : { opacity: 0, scale: 0.7, filter: 'blur(8px)' }"
        :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
        :transition="{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <span class="te-glow" />
        <span class="te-ring r1"><i /></span>
        <span class="te-ring r2"><i /></span>
        <span class="te-ring r3"><i /></span>
        <span class="te-core"><component :is="icon" :size="26" /></span>
      </Motion>
    </div>

    <Motion as="h3" class="te-title"
      :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }">{{ title }}</Motion>
    <Motion v-if="sub" as="p"
      :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }">{{ sub }}</Motion>
    <Motion as="div" class="te-slot"
      :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <slot />
    </Motion>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { Telescope } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  icon: { type: [Object, Function], default: () => Telescope },
  title: { type: String, default: 'Nothing here yet' },
  sub: { type: String, default: '' },
})
const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

// deterministic scatter — stable starfield without Math.random
const dustStyle = (s) => {
  const x = (s * 47) % 92 + 4
  const y = (s * 71) % 70 + 6
  const d = ((s * 0.37) % 2.6).toFixed(2)
  const sz = (s % 3) + 2
  return { left: x + '%', top: y + '%', width: sz + 'px', height: sz + 'px', animationDelay: d + 's' }
}
</script>

<style scoped>
.trn-empty {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; place-items: center; gap: 7px; text-align: center;
  padding: 60px 28px; border-radius: 22px; border: 1.5px dashed var(--trn-border-strong);
  background: var(--trn-dome); color: var(--trn-text-muted);
}
.trn-empty::before { content: ''; position: absolute; inset: 0; z-index: 0; background: var(--trn-grad-hero); opacity: 0.7; }
.te-grain { z-index: 0; }
.te-spot { z-index: 1; }
.trn-empty > *:not(.te-grain):not(.te-spot):not(.te-floor):not(.te-stars):not(.te-shoot) { position: relative; z-index: 3; }

/* perspective horizon floor */
.te-floor { position: absolute; left: -20%; right: -20%; bottom: -10%; height: 55%; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trn-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--trn-grid-line) 1px, transparent 1px);
  background-size: 34px 34px; transform: perspective(420px) rotateX(64deg);
  mask-image: linear-gradient(180deg, transparent, #000 60%); -webkit-mask-image: linear-gradient(180deg, transparent, #000 60%); }

/* starfield */
.te-stars { position: absolute; inset: 0; z-index: 1; }
.te-dust { position: absolute; border-radius: 50%; background: var(--trn-starfield);
  box-shadow: 0 0 6px var(--trn-star); animation: trn-twinkle 3.4s ease-in-out infinite; }
.te-shoot { position: absolute; width: 2px; height: 2px; border-radius: 50%; z-index: 1;
  background: var(--trn-star); box-shadow: 0 0 8px 1px var(--trn-star), -22px 0 14px -6px var(--trn-star); }
.te-shoot.s1 { top: 22%; left: 16%; --trn-shoot-x: 120px; --trn-shoot-y: 70px; animation: trn-shoot 6s ease-in infinite; }
.te-shoot.s2 { top: 64%; left: 70%; --trn-shoot-x: -150px; --trn-shoot-y: -54px; animation: trn-shoot 8.5s ease-in 2.5s infinite; }

/* parallax wrapper — leans with the pointer */
.te-orb-par { position: relative; z-index: 3; margin-bottom: 8px;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 26px), calc((var(--my, 0.5) - 0.5) * 18px), 0);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

/* orbital system */
.te-orb { position: relative; width: 116px; height: 116px; display: grid; place-items: center; }
.te-glow { position: absolute; inset: 20px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, var(--trn-dome-glow), transparent 70%); filter: blur(8px);
  animation: trn-core-breathe 4s ease-in-out infinite; }
.te-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--trn-amber) 26%, transparent); }
.te-ring i { position: absolute; top: -2.5px; left: 50%; width: 5px; height: 5px; border-radius: 50%; transform: translateX(-50%);
  background: var(--trn-amber-bright); box-shadow: 0 0 8px var(--trn-amber); }
.te-ring.r1 { inset: 0; animation: trn-orbit-spin 11s linear infinite; }
.te-ring.r2 { inset: 16px; opacity: 0.8; animation: trn-orbit-spin-rev 8s linear infinite; }
.te-ring.r2 i { background: var(--trn-ember); box-shadow: 0 0 8px var(--trn-ember); }
.te-ring.r3 { inset: 32px; opacity: 0.55; animation: trn-orbit-spin 14s linear infinite; }
.te-ring.r3 i { width: 4px; height: 4px; background: var(--trn-star); }
.te-core { position: relative; z-index: 2; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-amber) 30%, transparent);
  box-shadow: 0 0 24px -8px var(--trn-amber); animation: te-float 5s ease-in-out infinite; }
.te-core :deep(svg) { filter: drop-shadow(0 0 8px var(--trn-dome-glow)); }

.te-title { margin: 0; font-size: 18px; font-weight: 780; letter-spacing: -0.01em;
  background: linear-gradient(110deg, var(--trn-text) 30%, var(--trn-amber-strong) 50%, var(--trn-text) 70%);
  background-size: 220% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: te-title-sheen 6s linear infinite; }
.trn-empty p { margin: 0; font-size: 13px; max-width: 400px; line-height: 1.55; }
.te-slot { display: flex; justify-content: center; }

@keyframes te-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes te-title-sheen { 0% { background-position: 140% 0; } 100% { background-position: -40% 0; } }

@media (prefers-reduced-motion: reduce) {
  .te-dust, .te-shoot, .te-glow, .te-ring, .te-core, .te-title { animation: none !important; }
  .te-title { -webkit-text-fill-color: var(--trn-text); }
  .te-orb-par { transform: none; }
}
</style>
