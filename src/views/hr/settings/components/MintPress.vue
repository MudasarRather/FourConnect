<template>
  <div class="mp" ref="sceneEl" :class="{ live: !reduced && jobs.length }">
    <!-- ambient backdrop -->
    <span class="mp-grain" aria-hidden="true" />
    <span class="mp-aura" aria-hidden="true" />
    <span class="mp-floor" aria-hidden="true" />
    <div class="mp-embers" aria-hidden="true">
      <i v-for="n in 14" :key="n" class="mp-ember" :style="emberStyle(n)" />
    </div>

    <!-- corner readout -->
    <div class="mp-hud">
      <span class="mp-hud-dot" /><span class="mp-hud-lab">Foundry</span>
      <span class="mp-hud-sep">·</span>
      <span class="mp-hud-val">{{ configuredCount }} live</span>
      <span class="mp-hud-sep">·</span>
      <span class="mp-hud-val dim">{{ builtinCount }} built-in</span>
    </div>

    <div v-if="loading" class="mp-skel"><span class="mp-skel-beam" /></div>

    <div v-else class="mp-stage">
      <!-- the press head / stamping ram -->
      <div class="mp-press" :data-parallax="1">
        <div class="mp-frame mp-frame-l" aria-hidden="true" />
        <div class="mp-frame mp-frame-r" aria-hidden="true" />
        <div class="mp-ram" :key="'ram' + cycle" :class="{ strike: !reduced }">
          <span class="mp-ram-grip" aria-hidden="true" />
          <span class="mp-ram-die"><Stamp :size="22" /></span>
        </div>
        <span class="mp-flash" :key="'fl' + cycle" :class="{ go: !reduced }" aria-hidden="true" />
        <span class="mp-shock" :key="'sh' + cycle" :class="{ go: !reduced }" aria-hidden="true" />
      </div>

      <!-- composing bed: token slugs + counter drum -->
      <div class="mp-bed">
        <span class="mp-bed-anvil" aria-hidden="true" />
        <div class="mp-slugs" :key="'bed' + cycle">
          <template v-for="(t, i) in activeTokens" :key="t.key">
            <div v-if="t.key !== 'counter'" class="mp-slug" :class="{ off: !t.on }" :style="{ '--ti': i }">
              <span class="mp-slug-tag">{{ t.label }}</span>
              <span class="mp-slug-val">{{ t.value || '—' }}</span>
            </div>
            <!-- the rotating counter drum -->
            <div v-else class="mp-drum" :style="{ '--ti': i }">
              <span class="mp-slug-tag">{{ t.label }}</span>
              <div class="mp-drum-window">
                <div class="mp-drum-reel">
                  <b v-for="d in DRUM" :key="d">{{ d }}</b>
                </div>
                <span class="mp-drum-read">{{ t.value }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ejected minted plate -->
      <div class="mp-tray">
        <div class="mp-plate" :key="'plate' + cycle" :class="{ eject: !reduced }">
          <span class="mp-plate-rivet tl" /><span class="mp-plate-rivet tr" />
          <span class="mp-plate-rivet bl" /><span class="mp-plate-rivet br" />
          <span class="mp-plate-tag">{{ active?.label || 'Identifier' }}</span>
          <b class="mp-plate-id set-mono">{{ active?.nextId || '—' }}</b>
          <span class="mp-plate-foot">
            <component :is="active?.icon || Hash" :size="11" />
            {{ active?.downstream || 'auto-ID' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Stamp, Hash } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import { nextId, builtinSample, tokenAnatomy, downstreamOf } from '../composables/numberingFormat'

const props = defineProps({
  series: { type: Array, default: () => [] },     // configured NumberingSeries rows
  catalog: { type: Array, default: () => [] },    // NUMBERING_MODULES
  loading: { type: Boolean, default: false },
})

const sceneEl = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(sceneEl)

const DRUM = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2']

const byModule = computed(() => Object.fromEntries(props.series.map(s => [s.module, s])))
const configuredCount = computed(() => props.series.filter(s => !s.is_deleted).length)
const builtinCount = computed(() => Math.max(0, props.catalog.length - configuredCount.value))

// Build the mint queue — real configured (active) series first, then a couple
// of representative built-in samples so the press never looks idle.
const jobs = computed(() => {
  const out = []
  for (const s of props.series) {
    if (s.is_deleted) continue
    const d = downstreamOf(s.module)
    const cat = props.catalog.find(c => c.module === s.module)
    out.push({
      module: s.module,
      label: cat?.label || s.module,
      nextId: nextId(s),
      tokens: tokenAnatomy(s).filter(t => t.on),
      downstream: d.label,
      icon: d.icon,
    })
  }
  if (out.length < 3) {
    for (const c of props.catalog) {
      if (byModule.value[c.module]) continue
      const d = downstreamOf(c.module)
      out.push({
        module: c.module,
        label: c.label,
        nextId: builtinSample(c),
        tokens: [
          { key: 'prefix', label: 'PRE', on: true, value: c.sample_prefix },
          { key: 'counter', label: '####', on: true, value: '0001' },
        ],
        downstream: d.label,
        icon: d.icon,
      })
      if (out.length >= 4) break
    }
  }
  return out
})

const cycle = ref(0)
const active = computed(() => (jobs.value.length ? jobs.value[cycle.value % jobs.value.length] : null))
const activeTokens = computed(() => active.value?.tokens || [])

let timer = null
onMounted(() => {
  if (reduced) return
  timer = setInterval(() => {
    if (jobs.value.length > 1) cycle.value = (cycle.value + 1) % jobs.value.length
    else cycle.value++   // still replay the strike on a single job
  }, 3600)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

// deterministic ember scatter (no Math.random per-frame churn)
function emberStyle(n) {
  const x = (n * 67) % 100
  const delay = (n % 7) * 0.9
  const dur = 6 + (n % 5)
  const size = 2 + (n % 3)
  return { left: x + '%', '--d': delay + 's', '--dur': dur + 's', width: size + 'px', height: size + 'px' }
}
</script>

<style scoped>
.mp { position: relative; overflow: hidden; min-height: 320px; border-radius: 20px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  display: flex; flex-direction: column; }
.mp-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ember) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-ember) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(130% 120% at 50% 0%, #000 14%, transparent 76%);
  -webkit-mask-image: radial-gradient(130% 120% at 50% 0%, #000 14%, transparent 76%); }
.mp-aura { position: absolute; inset: -40% 20% auto 20%; height: 80%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-ember) 24%, transparent), transparent 70%);
  filter: blur(40px); transform: translateX(calc((var(--mx, 0.5) - 0.5) * -26px)); }
.mp-floor { position: absolute; inset: auto 0 0 0; height: 46%; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ember) 10%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-ember) 8%, transparent) 1px, transparent 1px);
  background-size: 38px 22px; transform: perspective(420px) rotateX(58deg); transform-origin: bottom;
  mask-image: linear-gradient(to top, #000, transparent); -webkit-mask-image: linear-gradient(to top, #000, transparent); }

.mp-embers { position: absolute; inset: 0; pointer-events: none; z-index: 1;
  transform: translateX(calc((var(--mx, 0.5) - 0.5) * 16px)); }
.mp-ember { position: absolute; bottom: 12%; border-radius: 50%; background: var(--set-gold-bright);
  box-shadow: 0 0 8px var(--set-gold); opacity: 0; animation: mp-ember-rise var(--dur, 8s) linear infinite; animation-delay: var(--d, 0s); }
@keyframes mp-ember-rise {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  18% { opacity: 0.85; }
  80% { opacity: 0.5; }
  100% { transform: translateY(-200px) scale(1.1); opacity: 0; }
}

.mp-hud { position: absolute; top: 13px; left: 16px; z-index: 4; display: inline-flex; align-items: center; gap: 7px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.mp-hud-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); animation: set-led-pulse 1.8s ease-in-out infinite; }
.mp-hud-lab { color: var(--set-ember); }
.mp-hud-val { color: var(--set-text-secondary); }
.mp-hud-val.dim { color: var(--set-text-dim); }
.mp-hud-sep { color: var(--set-text-dim); }

.mp-stage { position: relative; z-index: 2; flex: 1; display: grid; grid-template-columns: 1fr minmax(180px, 240px);
  grid-template-rows: auto 1fr; align-items: center; gap: 0 18px; padding: 44px 24px 26px; }

/* ── press head ── */
.mp-press { position: relative; grid-column: 1; grid-row: 1; height: 86px;
  transform: translateX(calc((var(--mx, 0.5) - 0.5) * -10px)); }
.mp-frame { position: absolute; top: 0; bottom: -14px; width: 10px; border-radius: 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--set-steel, #6b7280) 50%, var(--set-surface)), transparent);
  opacity: 0.5; }
.mp-frame-l { left: 8%; } .mp-frame-r { right: 32%; }
.mp-ram { position: absolute; left: 50%; top: 4px; width: 132px; height: 50px; transform: translateX(-50%);
  border-radius: 10px 10px 7px 7px; background: linear-gradient(180deg, #3a3a42, #1d1d22);
  border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 12px 28px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12);
  display: flex; flex-direction: column; align-items: center; }
.mp-ram.strike { animation: mp-strike 3.6s cubic-bezier(0.5, 0, 0.4, 1) both; }
@keyframes mp-strike {
  0%, 14% { transform: translateX(-50%) translateY(0); }
  24% { transform: translateX(-50%) translateY(30px); }   /* slam down */
  30% { transform: translateX(-50%) translateY(26px); }
  44% { transform: translateX(-50%) translateY(0); }      /* lift */
  100% { transform: translateX(-50%) translateY(0); }
}
.mp-ram-grip { width: 26px; height: 8px; margin-top: -6px; border-radius: 3px; background: linear-gradient(180deg, #54545e, #2c2c33); }
.mp-ram-die { display: grid; place-items: center; flex: 1; color: var(--set-gold-bright); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--set-gold) 60%, transparent)); }

.mp-flash { position: absolute; left: 50%; top: 64px; width: 150px; height: 60px; transform: translate(-50%, 0); pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse at center, rgba(255,247,230,0.9), color-mix(in srgb, var(--set-gold) 50%, transparent) 30%, transparent 70%); }
.mp-flash.go { animation: mp-flash 3.6s ease-out both; }
@keyframes mp-flash { 0%, 22% { opacity: 0; } 26% { opacity: 1; } 40% { opacity: 0; } 100% { opacity: 0; } }
.mp-shock { position: absolute; left: 50%; top: 72px; width: 30px; height: 30px; transform: translate(-50%, -50%) scale(0.3); pointer-events: none; opacity: 0;
  border-radius: 50%; border: 2px solid color-mix(in srgb, var(--set-gold) 70%, transparent); }
.mp-shock.go { animation: mp-shock 3.6s ease-out both; }
@keyframes mp-shock { 0%, 24% { opacity: 0; transform: translate(-50%,-50%) scale(0.3); } 27% { opacity: 0.9; } 46% { opacity: 0; transform: translate(-50%,-50%) scale(4); } 100% { opacity: 0; } }

/* ── composing bed ── */
.mp-bed { position: relative; grid-column: 1; grid-row: 2; align-self: start; padding: 16px 16px 18px; border-radius: 14px;
  background: color-mix(in srgb, var(--set-panel) 80%, transparent); border: 1px solid var(--set-border);
  border-top: 2px solid color-mix(in srgb, var(--set-ember) 45%, transparent); }
.mp-bed-anvil { position: absolute; left: 10%; right: 10%; bottom: -8px; height: 8px; border-radius: 0 0 10px 10px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--set-steel, #6b7280) 40%, var(--set-surface)), transparent); opacity: 0.6; }
.mp-slugs { display: flex; align-items: stretch; gap: 9px; flex-wrap: wrap; }
.mp-slug { display: flex; flex-direction: column; gap: 4px; padding: 8px 11px; min-width: 52px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-ember) 24%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); animation: mp-slug-in 0.5s var(--set-spring) both; animation-delay: calc(var(--ti) * 0.08s); }
.mp-slug.off { opacity: 0.4; border-style: dashed; }
@keyframes mp-slug-in { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
.mp-slug-tag { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.mp-slug-val { font-family: var(--set-mono); font-size: 16px; font-weight: 800; color: var(--set-gold); letter-spacing: 0.04em; }

.mp-drum { display: flex; flex-direction: column; gap: 4px; padding: 8px 11px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-ember) 36%, transparent);
  animation: mp-slug-in 0.5s var(--set-spring) both; animation-delay: calc(var(--ti) * 0.08s); }
.mp-drum-window { position: relative; height: 24px; overflow: hidden; }
.mp-drum-reel { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; opacity: 0.16;
  animation: mp-drum-spin 1.2s linear infinite; }
.mp-drum-reel b { font-family: var(--set-mono); font-size: 18px; font-weight: 800; line-height: 24px; color: var(--set-ember); }
@keyframes mp-drum-spin { from { transform: translateY(0); } to { transform: translateY(-240px); } }
.mp-drum-read { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--set-mono);
  font-size: 16px; font-weight: 850; color: var(--set-gold-bright); letter-spacing: 0.04em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--set-gold) 50%, transparent); }

/* ── ejected plate ── */
.mp-tray { grid-column: 2; grid-row: 1 / span 2; display: grid; place-items: center; }
.mp-plate { position: relative; width: 100%; max-width: 220px; padding: 16px 16px 13px; border-radius: 13px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--set-ember) 16%, var(--set-surface-elevated)), var(--set-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--set-ember) 40%, transparent);
  box-shadow: 0 20px 40px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 6px; }
.mp-plate.eject { animation: mp-eject 3.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes mp-eject {
  0%, 30% { opacity: 0; transform: translateX(-60px) scale(0.92); }
  44% { opacity: 1; transform: translateX(0) scale(1.04); }
  52% { transform: translateX(0) scale(1); }
  92% { opacity: 1; transform: translateX(0) scale(1); }
  100% { opacity: 0.85; transform: translateX(0) scale(1); }
}
.mp-plate-rivet { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: color-mix(in srgb, var(--set-ember) 60%, var(--set-text-dim)); opacity: 0.6; }
.mp-plate-rivet.tl { top: 7px; left: 7px; } .mp-plate-rivet.tr { top: 7px; right: 7px; }
.mp-plate-rivet.bl { bottom: 7px; left: 7px; } .mp-plate-rivet.br { bottom: 7px; right: 7px; }
.mp-plate-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.mp-plate-id { font-size: 23px; font-weight: 850; color: var(--set-gold-bright); letter-spacing: 0.06em; word-break: break-all;
  text-shadow: 0 0 16px color-mix(in srgb, var(--set-gold) 40%, transparent); }
.mp-plate-foot { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--set-text-muted); }
.mp-plate-foot :deep(svg) { color: var(--set-ember); }

/* loading skeleton */
.mp-skel { position: absolute; inset: 16px; border-radius: 14px; overflow: hidden; background: var(--set-panel); }
.mp-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-ember) 12%, transparent) 50%, transparent 70%);
  background-size: 220% 100%; animation: set-sheen 1.6s ease infinite; }

@media (max-width: 760px) {
  .mp-stage { grid-template-columns: 1fr; }
  .mp-tray { grid-column: 1; grid-row: 3; }
  .mp-press { grid-row: 1; } .mp-bed { grid-row: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .mp-ram.strike, .mp-flash.go, .mp-shock.go, .mp-plate.eject, .mp-slug, .mp-drum, .mp-ember, .mp-drum-reel, .mp-hud-dot { animation: none; }
  .mp-flash, .mp-shock { opacity: 0; }
  .mp-plate { opacity: 1; }
}
</style>
