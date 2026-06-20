<template>
  <div class="ahf" aria-hidden="true">
    <span class="ahf-floor" />
    <span class="ahf-orb o1" /><span class="ahf-orb o2" />
    <div class="ahf-ring">
      <span class="ahf-ring-steel" />
      <span class="ahf-ring-inlay" />
      <span class="ahf-ring-sheen" />
    </div>
    <div class="ahf-bays">
      <span v-for="n in 18" :key="n" class="ahf-bay" :style="bayStyle(n)" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  statusCounts: { type: Object, default: () => ({}) },
})
const PALETTE = ['var(--as-st-available)', 'var(--as-st-allocated)', 'var(--as-st-reserved)', 'var(--as-st-maintenance)']
function bayStyle(n) {
  const i = n - 1
  return {
    '--c': PALETTE[i % PALETTE.length],
    '--d': `${(i % 6) * 0.18}s`,
    left: `${8 + (i % 9) * 10}%`,
    bottom: `${14 + Math.floor(i / 9) * 18}%`,
  }
}
</script>

<style scoped>
.ahf { position: absolute; inset: 0; overflow: hidden; perspective: 800px; }
.ahf-floor { position: absolute; left: -20%; right: -20%; bottom: -10%; height: 70%; transform: rotateX(62deg); transform-origin: bottom center;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 44px 44px; mask-image: linear-gradient(to top, #000 10%, transparent 80%); -webkit-mask-image: linear-gradient(to top, #000 10%, transparent 80%); }
.ahf-orb { position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.5; }
.o1 { width: 260px; height: 260px; top: -40px; left: 8%; background: radial-gradient(circle, var(--as-bay-glow), transparent 70%); animation: ahf-drift 13s ease-in-out infinite alternate; }
.o2 { width: 200px; height: 200px; bottom: -30px; right: 10%; background: radial-gradient(circle, color-mix(in srgb, var(--as-amber) 22%, transparent), transparent 70%); animation: ahf-drift 17s ease-in-out infinite alternate-reverse; }

.ahf-ring { position: absolute; top: 28%; left: 50%; width: 180px; height: 180px; transform: translate(-50%, -50%); }
.ahf-ring-steel { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 220deg, #eef1f5, #767d88, #c2c8d1, #5b626d, #eef1f5);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px)); mask: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px)); animation: as-spin 26s linear infinite; }
.ahf-ring-inlay { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--as-amber) 70%, transparent); box-shadow: 0 0 20px color-mix(in srgb, var(--as-amber) 40%, transparent); }
.ahf-ring-sheen { position: absolute; inset: 0; border-radius: 50%; background: var(--as-chrome-sheen); background-size: 220% 100%; mix-blend-mode: overlay; opacity: 0.5; animation: as-chrome-sheen 5s ease infinite; }

.ahf-bays { position: absolute; inset: 0; }
.ahf-bay { position: absolute; width: 16px; height: 16px; border-radius: 4px; background: color-mix(in srgb, var(--c) 70%, transparent);
  box-shadow: 0 0 14px var(--c); transform: rotateX(60deg); animation: ahf-bay-pulse 3.4s ease-in-out infinite; animation-delay: var(--d); }

@keyframes ahf-drift { from { transform: translate(0,0); } to { transform: translate(30px, 18px); } }
@keyframes ahf-bay-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.95; } }
@media (prefers-reduced-motion: reduce) { .ahf-orb, .ahf-ring-steel, .ahf-ring-sheen, .ahf-bay { animation: none !important; } }
</style>
