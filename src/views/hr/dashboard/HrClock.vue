<template>
  <div class="clk" :data-mode="mode">
    <span class="clk-aura" aria-hidden="true" />

    <!-- ░░ ANALOG ░░ -->
    <div v-show="mode === 'analog'" class="clk-stage">
      <svg viewBox="0 0 120 120" class="clk-face">
        <defs>
          <linearGradient id="clkHour" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--hr-text)" /><stop offset="100%" stop-color="var(--hr-accent-gold-strong)" />
          </linearGradient>
          <linearGradient id="clkMin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--hr-accent-gold)" /><stop offset="100%" stop-color="var(--hr-orange)" />
          </linearGradient>
          <radialGradient id="clkPlinth" cx="38%" cy="30%">
            <stop offset="0%" stop-color="color-mix(in srgb, var(--hr-accent-gold) 14%, var(--hr-surface-deep))" />
            <stop offset="100%" stop-color="var(--hr-surface-deep)" />
          </radialGradient>
          <radialGradient id="clkHub"><stop offset="0%" stop-color="#fff" /><stop offset="100%" stop-color="var(--hr-accent-gold)" /></radialGradient>
          <filter id="clkGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <!-- frosted plinth -->
        <circle cx="60" cy="60" r="52" fill="url(#clkPlinth)" class="clk-plinth" />
        <!-- seconds progress ring -->
        <circle cx="60" cy="60" r="55.5" class="clk-ring-track" />
        <circle cx="60" cy="60" r="55.5" class="clk-ring-arc"
          :style="{ strokeDasharray: RING, strokeDashoffset: RING * (1 - secFrac) }" />

        <!-- ticks -->
        <g class="clk-ticks">
          <line v-for="t in 60" :key="t" x1="60" :y1="t % 5 === 0 ? 11 : 13.5" x2="60" y2="16"
            :class="{ major: t % 5 === 0 }" :style="{ transform: `rotate(${t * 6}deg)` }" />
        </g>
        <!-- 12 o'clock accent -->
        <circle cx="60" cy="9" r="1.7" class="clk-twelve" />

        <!-- numerals -->
        <g class="clk-nums">
          <text x="60" y="27" text-anchor="middle">12</text>
          <text x="102.5" y="63.5" text-anchor="middle">3</text>
          <text x="60" y="99" text-anchor="middle">6</text>
          <text x="17.5" y="63.5" text-anchor="middle">9</text>
        </g>

        <!-- hands -->
        <g class="clk-hand-wrap" :style="{ transform: `rotate(${hourDeg}deg)` }">
          <rect class="clk-hand hour" x="58.2" y="32" width="3.6" height="32" rx="1.8" fill="url(#clkHour)" filter="url(#clkGlow)" />
        </g>
        <g class="clk-hand-wrap" :style="{ transform: `rotate(${minDeg}deg)` }">
          <rect class="clk-hand min" x="58.7" y="19" width="2.6" height="45" rx="1.3" fill="url(#clkMin)" filter="url(#clkGlow)" />
        </g>
        <g class="clk-hand-wrap" :style="{ transform: `rotate(${secDeg}deg)` }">
          <line class="clk-hand sec" x1="60" y1="70" x2="60" y2="15" />
          <circle class="clk-counter" cx="60" cy="70" r="2.8" />
        </g>
        <circle cx="60" cy="60" r="4" fill="url(#clkHub)" class="clk-hub" />
      </svg>
    </div>

    <!-- ░░ DIGITAL ░░ -->
    <div v-show="mode === 'digital'" class="clk-stage clk-digital">
      <div class="clk-readout">
        <template v-for="(ch, i) in timeChars" :key="i">
          <span v-if="ch === ':'" class="clk-colon">:</span>
          <span v-else class="clk-slot">
            <Transition :name="reduced ? '' : 'roll'">
              <span :key="ch" class="clk-num hr-mono">{{ ch }}</span>
            </Transition>
          </span>
        </template>
        <span class="clk-ampm">{{ ampm }}</span>
      </div>
      <div class="clk-pulse" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    </div>

    <!-- caption + toggle -->
    <div class="clk-foot">
      <span class="clk-caption hr-mono">{{ weekday }} · {{ dateStr }}</span>
      <div class="clk-switch" role="group" aria-label="Clock style">
        <button type="button" :data-on="mode === 'analog'" @click="setMode('analog')" aria-label="Analog clock"><Clock3 :size="13" /></button>
        <button type="button" :data-on="mode === 'digital'" @click="setMode('digital')" aria-label="Digital clock"><Binary :size="13" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Clock3, Binary } from 'lucide-vue-next'
import { prefersReduced } from '@/composables/useShiftMotion'

const reduced = prefersReduced()
const mode = ref(localStorage.getItem('hr_clock_mode') || 'analog')
const setMode = (m) => { mode.value = m; try { localStorage.setItem('hr_clock_mode', m) } catch { /* ignore */ } }

const now = ref(new Date())
const ms = ref(0)
let raf = null, timer = null

function tickRaf() {
  const d = new Date()
  now.value = d
  ms.value = d.getMilliseconds()
  raf = requestAnimationFrame(tickRaf)
}

onMounted(() => {
  if (reduced) { timer = setInterval(() => { now.value = new Date() }, 1000) }
  else raf = requestAnimationFrame(tickRaf)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); if (timer) clearInterval(timer) })

// analog geometry
const RING = 2 * Math.PI * 55.5
const secFrac = computed(() => {
  const d = now.value
  return (d.getSeconds() + (reduced ? 0 : ms.value / 1000)) / 60
})
const secDeg = computed(() => secFrac.value * 360)
const minDeg = computed(() => { const d = now.value; return (d.getMinutes() + d.getSeconds() / 60) * 6 })
const hourDeg = computed(() => { const d = now.value; return ((d.getHours() % 12) + d.getMinutes() / 60) * 30 })

// digital
const pad = (n) => String(n).padStart(2, '0')
const h12 = computed(() => { const h = now.value.getHours() % 12; return h === 0 ? 12 : h })
const timeChars = computed(() => `${pad(h12.value)}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`.split(''))
const ampm = computed(() => now.value.getHours() < 12 ? 'AM' : 'PM')
const weekday = computed(() => now.value.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase())
const dateStr = computed(() => now.value.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }))
</script>

<style scoped>
.clk { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; width: 232px; }
.clk-aura { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 240px; height: 240px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--hr-accent-gold) 16%, transparent), transparent 65%); filter: blur(8px); z-index: 0; }
.clk-stage { position: relative; z-index: 1; width: 208px; height: 208px; }

/* analog */
.clk-face { width: 100%; height: 100%; overflow: visible; }
.clk-plinth { stroke: var(--hr-border); stroke-width: 0.6; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.35)); }
[data-theme="light"] .clk-plinth { filter: drop-shadow(0 8px 22px rgba(120, 70, 10, 0.16)); }
.clk-ring-track { fill: none; stroke: var(--hr-border); stroke-width: 1.6; }
.clk-ring-arc { fill: none; stroke: var(--hr-accent-gold); stroke-width: 2.2; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 60px 60px;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--hr-accent-gold) 70%, transparent)); }
.clk-ticks line { stroke: var(--hr-text-dim); stroke-width: 0.8; transform-origin: 60px 60px; opacity: 0.4; }
.clk-ticks line.major { stroke: var(--hr-accent-gold); stroke-width: 1.4; opacity: 0.7; }
.clk-twelve { fill: var(--hr-accent-gold); filter: drop-shadow(0 0 4px var(--hr-accent-gold)); }
.clk-nums text { fill: var(--hr-text-muted); font-size: 8px; font-weight: 800; font-family: var(--hr-mono); }
.clk-hand-wrap { transform-origin: 60px 60px; }
.clk-hand.hour, .clk-hand.min { transition: transform 0.18s var(--hr-spring); }
.clk-hand.sec { stroke: var(--hr-orange); stroke-width: 1.5; stroke-linecap: round; filter: drop-shadow(0 0 4px var(--hr-orange)); }
.clk-counter { fill: var(--hr-orange); }
.clk-hub { filter: drop-shadow(0 0 5px var(--hr-accent-gold)); }

/* digital */
.clk-digital { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.clk-readout { display: flex; align-items: center; gap: 1px; }
.clk-slot { position: relative; display: inline-block; width: 0.6em; height: 1.04em; overflow: hidden; font-size: 40px; font-weight: 850; }
.clk-num { position: absolute; inset: 0; display: grid; place-items: center; letter-spacing: -0.03em;
  background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.clk-colon { font-size: 36px; font-weight: 800; color: var(--hr-accent-gold); margin: 0 1px; animation: clk-blink 1s steps(1) infinite; }
@keyframes clk-blink { 50% { opacity: 0.25; } }
.clk-ampm { font-size: 13px; font-weight: 800; color: var(--hr-text-muted); margin-left: 5px; align-self: flex-start; margin-top: 6px; }
.clk-pulse { display: flex; align-items: flex-end; gap: 4px; height: 24px; }
.clk-pulse span { width: 4px; border-radius: 2px; background: var(--hr-gradient-rail-active); animation: clk-eq 1.1s ease-in-out infinite; }
.clk-pulse span:nth-child(1) { height: 40%; animation-delay: 0s; }
.clk-pulse span:nth-child(2) { height: 78%; animation-delay: 0.14s; }
.clk-pulse span:nth-child(3) { height: 100%; animation-delay: 0.28s; }
.clk-pulse span:nth-child(4) { height: 64%; animation-delay: 0.42s; }
.clk-pulse span:nth-child(5) { height: 34%; animation-delay: 0.56s; }
@keyframes clk-eq { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }

.roll-enter-active, .roll-leave-active { transition: transform 0.4s var(--hr-spring), opacity 0.4s; }
.roll-enter-from { transform: translateY(-105%); opacity: 0; }
.roll-leave-to { transform: translateY(105%); opacity: 0; }

/* caption + toggle */
.clk-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.clk-caption { font-size: 10px; letter-spacing: 0.16em; color: var(--hr-text-dim); }
.clk-switch { display: inline-flex; padding: 2px; gap: 2px; border-radius: 999px; background: var(--hr-input-bg); border: 1px solid var(--hr-border); }
.clk-switch button { display: grid; place-items: center; width: 26px; height: 22px; border-radius: 999px; border: none; cursor: pointer; color: var(--hr-text-dim); background: none; transition: color 0.2s, background 0.2s; }
.clk-switch button[data-on="true"] { color: #1a1208; background: var(--hr-accent-gold); }

@media (prefers-reduced-motion: reduce) {
  .clk-ring-arc, .clk-hand.hour, .clk-hand.min { transition: none !important; }
  .clk-colon, .clk-pulse span { animation: none; }
}
</style>
