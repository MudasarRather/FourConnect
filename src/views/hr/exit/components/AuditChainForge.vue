<template>
  <Motion ref="rootRef" as="section" class="acf ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="acf-aura" aria-hidden="true" />
    <span class="acf-grid" aria-hidden="true" />
    <span class="acf-spot" aria-hidden="true" />
    <span v-for="e in embers" :key="'em' + e.i" class="acf-ember" aria-hidden="true"
      :style="{ left: e.x + '%', width: e.s + 'px', height: e.s + 'px', animationDuration: e.dur + 's', animationDelay: e.delay + 's' }" />

    <div class="acf-scene">
      <!-- ── integrity console ───────────────────────────────────────────── -->
      <div class="acf-side">
        <span class="acf-badge"><Lock :size="12" /> Chain intact</span>
        <div class="acf-tally">
          <b class="acf-big ex-mono"><ExCountUp :value="total" /></b>
          <i>sealed events · all time</i>
        </div>

        <div class="acf-ring-wrap">
          <span class="acf-ring" :style="{ background: conic }" aria-hidden="true" />
          <span class="acf-ring-spin" aria-hidden="true" />
          <span class="acf-ring-hole">
            <b class="ex-mono"><ExCountUp :value="recentTotal" /></b>
            <i>recent</i>
          </span>
        </div>

        <ul class="acf-legend">
          <li v-for="f in legend" :key="f.key" :style="{ '--c': f.color }">
            <span class="lg-dot" />
            <span class="lg-lab">{{ f.label }}</span>
            <span class="lg-val ex-mono">{{ f.count }}</span>
          </li>
        </ul>

        <div class="acf-foot">
          <span class="acf-foot-it"><Activity :size="11" /> {{ todayCount }} today</span>
          <span class="acf-foot-it"><Clock3 :size="11" /> {{ latestRel }}</span>
        </div>
      </div>

      <!-- ── the forge + chain of custody ─────────────────────────────────── -->
      <div class="acf-forge">
        <header class="acf-fhead">
          <span class="acf-eyebrow"><Waypoints :size="12" /> Chain of custody</span>
          <span class="acf-live" :class="{ off: reduced }"><i />Recorder live</span>
        </header>

        <div class="acf-track">
          <span class="acf-beam" :class="{ off: reduced }" aria-hidden="true" />
          <span class="acf-rail" aria-hidden="true" />

          <div v-if="!blocks.length" class="acf-vacant">
            <Hash :size="15" /> Awaiting the first sealed event…
          </div>

          <div v-else class="acf-chain">
            <template v-for="(b, i) in blocks" :key="b.id">
              <span v-if="i > 0" class="acf-knit" :style="{ '--d': (i * 0.09) + 's' }" aria-hidden="true">
                <span class="knit-flux" />
              </span>
              <div class="acf-block" :class="{ forge: i === blocks.length - 1 }"
                :style="{ '--c': b.color, '--d': (i * 0.09) + 's' }"
                :title="`${b.label} · ${b.rel}`">
                <span class="blk-aura" aria-hidden="true" />
                <span v-if="i === blocks.length - 1" class="blk-strike" aria-hidden="true" />
                <span class="blk-seal">
                  <component :is="b.icon" :size="16" />
                </span>
                <span class="blk-hash ex-mono">{{ b.hash }}</span>
                <span class="blk-pulse" :style="{ '--d': (i * 0.5) + 's' }" aria-hidden="true" />
              </div>
            </template>

            <!-- the anvil where the newest event is struck -->
            <div class="acf-anvil" aria-hidden="true">
              <svg viewBox="0 0 40 40" class="anvil-rays"><line v-for="(r, i) in rays" :key="i" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" /></svg>
              <span class="anvil-core"><Flame :size="15" /></span>
            </div>
          </div>
        </div>

        <footer class="acf-ffoot">
          <span class="acf-end">Genesis</span>
          <span class="acf-trace"><span class="trace-run" :class="{ off: reduced }" /></span>
          <span class="acf-end now">Now · sealing</span>
        </footer>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Lock, Activity, Clock3, Waypoints, Hash, Flame } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView, seededWave } from '@/composables/useShiftMotion'
import { auditActionMeta, AUDIT_FAMILIES, FAMILY_ORDER, shortHash, relTime, isToday } from './auditMeta.js'

const props = defineProps({
  items: { type: Array, default: () => [] }, // recent window, newest-first
  total: { type: Number, default: 0 },       // all-time count (server)
})

const reduced = prefersReduced()
const rootRef = ref(null)
// spotlight on the root so both the glare (.acf-spot) and the scene's 3D
// parallax inherit --mx/--my/--spot from the same node.
usePointerSpotlight(rootRef)
useInView(rootRef, { threshold: 0.15 })

// newest near the forge (right). items come newest-first → reverse for display.
const blocks = computed(() =>
  [...props.items].slice(0, 9).reverse().map((it) => {
    const m = auditActionMeta(it.action)
    return { id: it.id, label: m.label, icon: m.icon, color: m.color, hash: shortHash(it.id), rel: relTime(it.created_at) }
  })
)

const recentTotal = computed(() => props.items.length)
const familyCounts = computed(() => {
  const c = { genesis: 0, transition: 0, completion: 0, reversal: 0, config: 0 }
  for (const it of props.items) { const f = auditActionMeta(it.action).family; if (c[f] != null) c[f]++ }
  return c
})
const legend = computed(() => FAMILY_ORDER.map(k => ({ key: k, label: AUDIT_FAMILIES[k].label, color: AUDIT_FAMILIES[k].color, count: familyCounts.value[k] })))

const conic = computed(() => {
  const total = recentTotal.value || 0
  if (!total) return 'conic-gradient(from -90deg, var(--ex-steel-soft) 0deg 360deg)'
  let acc = 0
  const stops = []
  for (const f of FAMILY_ORDER) {
    const n = familyCounts.value[f]
    if (!n) continue
    const a = acc / total * 360, b = (acc + n) / total * 360
    stops.push(`${AUDIT_FAMILIES[f].color} ${a.toFixed(1)}deg ${b.toFixed(1)}deg`)
    acc += n
  }
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
})

const todayCount = computed(() => props.items.filter(it => isToday(it.created_at)).length)
const latestRel = computed(() => (props.items.length ? relTime(props.items[0].created_at) : '—'))

const rays = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  return { x1: 20 + Math.cos(a) * 9, y1: 20 + Math.sin(a) * 9, x2: 20 + Math.cos(a) * (i % 2 ? 17 : 14), y2: 20 + Math.sin(a) * (i % 2 ? 17 : 14) }
})
const embers = seededWave(31, 9).map((w, i) => ({ i, x: 6 + w * 88, s: 2 + (i % 3), dur: 5 + w * 5, delay: (i % 5) * 0.8 }))
</script>

<style scoped>
.acf {
  position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; margin-bottom: 18px;
  background: var(--ex-panel); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.acf-aura { position: absolute; inset: -45% 20% 35% -12%; pointer-events: none;
  background: radial-gradient(55% 70% at 22% 8%, rgba(251, 146, 60, 0.2), transparent 70%); animation: ex-aura-drift 13s ease-in-out infinite; }
.acf-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 26px 26px, 26px 26px;
  -webkit-mask: radial-gradient(120% 100% at 80% 30%, #000, transparent 75%); mask: radial-gradient(120% 100% at 80% 30%, #000, transparent 75%); }
[data-theme="light"] .acf-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }
.acf-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s;
  background: radial-gradient(440px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 146, 60, 0.13), transparent 60%); }
.acf-ember { position: absolute; bottom: 8px; border-radius: 50%; background: var(--ex-amber-bright);
  box-shadow: 0 0 7px var(--ex-ember); opacity: 0; animation: acf-rise linear infinite; pointer-events: none; }

.acf-scene { position: relative; z-index: 2; display: grid; grid-template-columns: 250px 1fr; gap: 18px; padding: 18px 20px;
  transform: perspective(1400px) rotateX(calc((var(--my, 0.5) - 0.5) * -3deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 4deg)); transform-style: preserve-3d; transition: transform 0.3s ease-out; }

/* ── integrity console ─────────────────────────────────────────────────────── */
.acf-side { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 16px;
  background: var(--ex-surface-glass); border: 1px solid var(--ex-border); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.acf-badge { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 4px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-cleared);
  background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.acf-tally { display: flex; flex-direction: column; gap: 1px; }
.acf-big { font-size: 30px; font-weight: 900; line-height: 1; color: var(--ex-text); }
.acf-tally i { font-size: 9.5px; font-style: normal; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); }

.acf-ring-wrap { position: relative; width: 116px; height: 116px; margin: 2px auto 0; display: grid; place-items: center; }
.acf-ring { position: absolute; inset: 0; border-radius: 50%; transition: background 0.7s var(--ex-spring);
  -webkit-mask: radial-gradient(circle, transparent 56%, #000 57.5%); mask: radial-gradient(circle, transparent 56%, #000 57.5%);
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.25)); }
.acf-ring-spin { position: absolute; inset: -3px; border-radius: 50%; border: 1px dashed var(--ex-border-strong); animation: ex-spin-slow 26s linear infinite; }
.acf-ring-hole { position: relative; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.acf-ring-hole b { font-size: 22px; font-weight: 900; color: var(--ex-text); }
.acf-ring-hole i { font-size: 8.5px; font-style: normal; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-text-muted); }

.acf-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.acf-legend li { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--ex-text-secondary); }
.lg-dot { width: 9px; height: 9px; border-radius: 3px; background: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 60%, transparent); flex-shrink: 0; }
.lg-lab { flex: 1; }
.lg-val { font-weight: 800; color: var(--ex-text); font-variant-numeric: tabular-nums; }

.acf-foot { display: flex; gap: 12px; padding-top: 10px; border-top: 1px dashed var(--ex-border); }
.acf-foot-it { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--ex-text-muted); }

/* ── forge + chain ─────────────────────────────────────────────────────────── */
.acf-forge { position: relative; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.acf-fhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.acf-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-violet); }
.acf-live { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-cleared); }
.acf-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--ex-cleared); box-shadow: 0 0 8px var(--ex-cleared); animation: acf-blink 2s ease-in-out infinite; }
.acf-live.off i { animation: none; }

.acf-track { position: relative; flex: 1; min-height: 156px; border-radius: 16px; overflow: hidden; padding: 8px 14px;
  background: radial-gradient(120% 140% at 100% 50%, rgba(234, 88, 12, 0.12), transparent 55%), var(--ex-surface);
  border: 1px solid var(--ex-border); display: flex; align-items: center; }
.acf-rail { position: absolute; left: 4%; right: 4%; top: 50%; height: 2px; transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, var(--ex-border-strong) 12%, var(--ex-border-strong) 88%, transparent); }
.acf-beam { position: absolute; top: 0; bottom: 0; width: 90px; left: -90px; pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.12) 55%, rgba(252, 211, 77, 0.42) 92%, transparent);
  border-right: 1.5px solid rgba(252, 211, 77, 0.6); box-shadow: 0 0 22px rgba(251, 146, 60, 0.35); animation: acf-scan 7s linear infinite; }
.acf-beam.off { display: none; }

.acf-vacant { display: inline-flex; align-items: center; gap: 9px; margin: auto; font-size: 12.5px; color: var(--ex-text-dim); }

.acf-chain { position: relative; z-index: 2; display: flex; align-items: center; gap: 0; width: 100%; }
.acf-knit { position: relative; flex: 1; height: 3px; min-width: 14px; border-radius: 3px; background: var(--ex-border-strong);
  transform-origin: left center; animation: acf-draw 0.5s var(--ex-spring) backwards; animation-delay: var(--d); overflow: hidden; }
.knit-flux { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--ex-amber-bright), transparent);
  transform: translateX(-100%); animation: acf-flux 2.6s linear infinite; }

.acf-block { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0;
  animation: acf-pop 0.5s var(--ex-spring) backwards; animation-delay: var(--d); }
.blk-aura { position: absolute; inset: -6px -6px 14px; border-radius: 14px; background: radial-gradient(circle, color-mix(in srgb, var(--c) 30%, transparent), transparent 70%); opacity: 0.6; }
.blk-seal { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, var(--ex-surface-glass)); border: 1px solid color-mix(in srgb, var(--c) 42%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 6px 16px -8px color-mix(in srgb, var(--c) 70%, transparent); }
.blk-hash { font-size: 8px; font-weight: 700; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.blk-pulse { position: absolute; top: 0; width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--c); opacity: 0;
  animation: acf-glow 4.5s ease-out infinite; animation-delay: var(--d); pointer-events: none; }

.acf-block.forge .blk-seal { width: 50px; height: 50px; border-radius: 15px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 26px -4px color-mix(in srgb, var(--c) 80%, transparent); }
.acf-block.forge .blk-aura { inset: -10px -10px 16px; opacity: 0.9; }
.blk-strike { position: absolute; top: -3px; left: 50%; width: 50px; height: 50px; transform: translateX(-50%); border-radius: 16px;
  border: 1.5px solid var(--c); animation: acf-strike 2.4s ease-out infinite; pointer-events: none; }

.acf-anvil { position: relative; flex-shrink: 0; width: 44px; height: 44px; margin-left: 6px; display: grid; place-items: center; }
.anvil-rays { position: absolute; inset: 0; width: 100%; height: 100%; transform-box: fill-box; transform-origin: center; animation: ex-spin-slow 22s linear infinite; }
.anvil-rays line { stroke: rgba(252, 211, 77, 0.45); stroke-width: 1.3; stroke-linecap: round; }
.anvil-core { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--ex-ember-deep);
  background: var(--ex-grad-sun); box-shadow: 0 0 20px rgba(251, 146, 60, 0.6); animation: acf-forge-beat 2.4s ease-in-out infinite; }

.acf-ffoot { display: flex; align-items: center; gap: 10px; }
.acf-end { font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-dim); }
.acf-end.now { color: var(--ex-ember); }
.acf-trace { flex: 1; height: 2px; border-radius: 2px; overflow: hidden; background: var(--ex-border); }
.trace-run { display: block; height: 100%; width: 40%; border-radius: 2px; background: var(--ex-grad-hero); animation: acf-trace 3.6s ease-in-out infinite; }
.trace-run.off { width: 100%; animation: none; }

/* ── motion ─────────────────────────────────────────────────────────────────── */
@keyframes acf-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 12% { opacity: 0.85; } 100% { transform: translateY(-120px) scale(0.4); opacity: 0; } }
@keyframes acf-scan { 0% { left: -90px; } 100% { left: 100%; } }
@keyframes acf-draw { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
@keyframes acf-flux { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
@keyframes acf-pop { from { transform: translateY(10px) scale(0.7); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes acf-glow { 0% { transform: scale(1); opacity: 0; } 18% { opacity: 0.6; } 60%, 100% { transform: scale(1.5); opacity: 0; } }
@keyframes acf-strike { 0% { transform: translateX(-50%) scale(0.7); opacity: 0.8; } 70%, 100% { transform: translateX(-50%) scale(1.55); opacity: 0; } }
@keyframes acf-forge-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes acf-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes acf-trace { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }

@media (max-width: 820px) { .acf-scene { grid-template-columns: 1fr; } .acf-ring-wrap { margin-top: 0; } }
@media (prefers-reduced-motion: reduce) {
  .acf-aura, .acf-ember, .acf-beam, .knit-flux, .blk-pulse, .blk-strike, .anvil-rays, .anvil-core, .acf-ring-spin, .acf-live i, .trace-run { animation: none !important; }
  .acf-ember { display: none; }
  .acf-knit, .acf-block { animation: none !important; }
  .acf-scene { transform: none; transition: none; }
}
</style>
