<template>
  <Motion as="section" class="hch" :class="{ collapsed }" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="hch-aura" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />

    <!-- rotating black-box data core, top-right -->
    <div v-if="!collapsed" class="hch-core" aria-hidden="true">
      <span class="hch-core-ring r1" /><span class="hch-core-ring r2" /><span class="hch-core-ring r3" />
      <span class="hch-core-disc"><History :size="22" /></span>
      <span class="hch-core-sweep" />
    </div>

    <div v-if="!collapsed" class="hch-lead">
      <span class="hch-eyebrow"><Radio :size="13" /> Flight Recorder · Chain of Custody</span>
      <h1 class="hch-title">Asset <span class="hch-title-accent">Provenance</span></h1>
      <p class="hch-sub">Pull any asset's black box — every hand it passed through, every repair, transfer and audit, replayed on one luminous time-spine.</p>
    </div>

    <!-- recorder waveform / scanner -->
    <div class="hch-scan" :class="{ active: query || searching }">
      <span class="hch-scan-wave" aria-hidden="true">
        <svg viewBox="0 0 600 44" preserveAspectRatio="none">
          <polyline :points="wavePoints" />
        </svg>
      </span>
      <span class="hch-scan-ic"><Radar :size="17" :class="{ spin: searching }" /></span>
      <input ref="inputEl" :value="query" type="text"
        placeholder="Scan by asset code, serial or model…"
        @input="$emit('update:query', $event.target.value)" @keydown.esc="$emit('update:query', '')" />
      <button v-if="query" class="hch-scan-clear" @click="$emit('update:query', '')" aria-label="Clear"><X :size="14" /></button>
      <span v-if="!reduced" class="hch-scan-beam" aria-hidden="true" />
    </div>

    <!-- results OR recent-activity rail -->
    <Presence mode="wait">
      <!-- search results -->
      <Motion v-if="query.trim()" key="results" as="div" class="hch-results"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.3 }">
        <div v-if="searching" class="hch-res-skel">
          <div v-for="n in 3" :key="n" class="as-skel" style="height:52px;border-radius:13px" />
        </div>
        <template v-else-if="results.length">
          <Motion v-for="(a, i) in results" :key="a.id" as="button" type="button" class="hch-res"
            :initial="reduced ? false : { opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.34, delay: Math.min(i * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ x: 4 }" :whileTap="{ scale: 0.99 }" @click="$emit('select', a)">
            <AssetTypeBadge :type="a.asset_type" medallion />
            <span class="hch-res-id">
              <span class="hch-res-code as-mono">{{ a.asset_code }}</span>
              <span class="hch-res-meta">{{ [a.brand, a.model].filter(Boolean).join(' ') || typeLabel(a.asset_type) }}</span>
            </span>
            <AssetStatusStamp :value="a.status" />
            <span class="hch-res-go"><ArrowRight :size="15" /></span>
          </Motion>
        </template>
        <div v-else class="hch-res-none"><SearchX :size="16" /> No asset matches “{{ query }}”.</div>
      </Motion>

      <!-- recent activity across the fleet (idle surface only) -->
      <Motion v-else-if="!collapsed" key="recent" as="div" class="hch-recent"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.3 }">
        <header class="hch-recent-h">
          <span class="hch-recent-t"><Activity :size="13" /> Recently touched</span>
          <span v-if="recentAssets.length" class="hch-recent-n as-mono">{{ recentAssets.length }} assets · last 24h feed</span>
        </header>
        <div v-if="loadingRecent" class="hch-recent-rail">
          <div v-for="n in 4" :key="n" class="as-skel" style="height:84px;border-radius:15px" />
        </div>
        <div v-else-if="recentAssets.length" class="hch-recent-rail">
          <Motion v-for="(r, i) in recentAssets" :key="r.asset_id" as="button" type="button" class="hch-chip"
            :style="{ '--c': eventMeta(r.event_type).color }"
            :initial="reduced ? false : { opacity: 0, y: 14, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.46, delay: 0.04 + Math.min(i * 0.05, 0.5), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -4 }" :whileTap="{ scale: 0.97 }" @click="$emit('select-id', r.asset_id)">
            <span class="hch-chip-top">
              <AssetTypeBadge :type="r.asset_type" />
              <span class="hch-chip-code as-mono">{{ r.asset_code }}</span>
            </span>
            <span class="hch-chip-ev">
              <span class="hch-chip-dot"><component :is="eventMeta(r.event_type).icon" :size="11" /></span>
              {{ eventMeta(r.event_type).label }}
            </span>
            <span class="hch-chip-time as-mono">{{ relTime(r.created_at) }}</span>
            <span class="hch-chip-edge" aria-hidden="true" />
          </Motion>
        </div>
        <div v-else class="hch-recent-empty">
          <Inbox :size="15" /> No recent movement on record — search for an asset above to open its dossier.
        </div>
      </Motion>
    </Presence>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { History, Radio, Radar, X, ArrowRight, SearchX, Activity, Inbox } from 'lucide-vue-next'
import AssetTypeBadge from './AssetTypeBadge.vue'
import AssetStatusStamp from './AssetStatusStamp.vue'
import { eventMeta, relTime } from './histEventMeta.js'
import { typeMeta } from '@/composables/useAssets'
import { prefersReduced, usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  query: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  searching: { type: Boolean, default: false },
  recent: { type: Array, default: () => [] },   // raw history rows w/ asset_code
  loadingRecent: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false }, // slim "switch asset" bar once a dossier is open
})
defineEmits(['update:query', 'select', 'select-id', 'go'])

const root = ref(null)
const inputEl = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)

const typeLabel = (t) => typeMeta(t).label

// dedupe recent feed → one card per asset (its most-recent event), cap 8
const recentAssets = computed(() => {
  const seen = new Map()
  for (const r of props.recent) {
    if (!r.asset_id || !r.asset_code) continue
    if (!seen.has(r.asset_id)) seen.set(r.asset_id, r)
  }
  return [...seen.values()].slice(0, 8)
})

// decorative seismograph waveform behind the scanner
const wavePoints = computed(() => {
  const w = seededWave(7, 40)
  return w.map((v, i) => `${(i / 39) * 600},${22 + (v - 0.5) * 34}`).join(' ')
})
</script>

<style scoped>
.hch { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.hch.collapsed { border-radius: 18px; padding: 14px 16px; }
.hch.collapsed .hch-scan { margin-top: 0; }
.hch-aura { position: absolute; inset: -45% -10% auto -10%; height: 80%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.hch > * { position: relative; z-index: 1; }

/* data core */
.hch-core { position: absolute; top: 18px; right: 22px; width: 96px; height: 96px; z-index: 1; display: grid; place-items: center; }
.hch-core-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.hch-core-ring.r1 { inset: 14px; animation: as-spin 11s linear infinite; }
.hch-core-ring.r2 { inset: 4px; border-style: dashed; border-color: color-mix(in srgb, var(--as-amber) 18%, transparent); animation: as-spin 18s linear infinite reverse; }
.hch-core-ring.r3 { inset: -6px; opacity: 0.5; animation: as-spin 26s linear infinite; }
.hch-core-disc { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; color: var(--as-amber);
  background: radial-gradient(circle at 38% 30%, color-mix(in srgb, var(--as-amber) 30%, transparent), color-mix(in srgb, var(--as-amber) 6%, transparent) 70%);
  border: 1px solid color-mix(in srgb, var(--as-amber) 34%, transparent); box-shadow: 0 0 26px -6px color-mix(in srgb, var(--as-amber) 70%, transparent); }
.hch-core-sweep { position: absolute; inset: 14px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in srgb, var(--as-amber) 45%, transparent) 90%, transparent 100%);
  -webkit-mask: radial-gradient(closest-side, transparent 64%, #000 66%); mask: radial-gradient(closest-side, transparent 64%, #000 66%);
  animation: as-spin 4s linear infinite; }
@media (max-width: 640px) { .hch-core { display: none; } }

.hch-lead { max-width: 560px; }
.hch-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.hch-title { margin: 13px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; color: var(--as-text); }
.hch-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hch-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 500px; }

/* scanner */
.hch-scan { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; margin-top: 20px; padding: 12px 14px;
  border-radius: 15px; background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px);
  transition: border-color 0.3s, box-shadow 0.3s; }
.hch-scan:focus-within, .hch-scan.active { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 10%, transparent); }
.hch-scan-wave { position: absolute; inset: 0; pointer-events: none; opacity: 0.18; z-index: 0;
  -webkit-mask: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent); mask: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent); }
.hch-scan-wave svg { width: 100%; height: 100%; }
.hch-scan-wave polyline { fill: none; stroke: var(--as-amber); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round;
  stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: hch-trace 3.4s ease-in-out infinite alternate; }
.hch-scan.active .hch-scan-wave { opacity: 0.34; }
.hch-scan-ic { position: relative; z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 13%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.hch-scan-ic .spin { animation: as-spin 1s linear infinite; }
.hch-scan input { position: relative; z-index: 1; flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 14px; color: var(--as-text); }
.hch-scan input::placeholder { color: var(--as-text-dim); }
.hch-scan-clear { position: relative; z-index: 1; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; cursor: pointer;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); transition: all 0.2s; }
.hch-scan-clear:hover { color: var(--as-text); transform: rotate(90deg); }
.hch-scan-beam { position: absolute; top: 0; bottom: 0; width: 90px; pointer-events: none; z-index: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 22%, transparent), transparent); animation: hch-beam 4.5s linear infinite; }

/* results */
.hch-results, .hch-recent { margin-top: 14px; }
.hch-res-skel { display: flex; flex-direction: column; gap: 7px; }
.hch-res { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 10px 13px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, background 0.2s; margin-bottom: 7px; }
.hch-res:hover { background: var(--as-surface-elevated); border-color: var(--as-border-strong); }
.hch-res-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hch-res-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.hch-res-meta { font-size: 11.5px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hch-res-go { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 10%, transparent); }
.hch-res-none { display: flex; align-items: center; gap: 8px; padding: 18px; justify-content: center; font-size: 13px; color: var(--as-text-muted); }

/* recent rail */
.hch-recent-h { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
.hch-recent-t { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.hch-recent-t :deep(svg) { color: var(--as-amber); }
.hch-recent-n { font-size: 10.5px; color: var(--as-text-dim); }
.hch-recent-rail { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 10px; }
.hch-chip { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 7px; padding: 13px 14px; border-radius: 15px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(6px); transition: border-color 0.22s, box-shadow 0.22s; }
.hch-chip:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: var(--as-card-shadow-hover); }
.hch-chip-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, transparent, var(--c), transparent); opacity: 0.85; }
.hch-chip-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hch-chip-code { font-size: 13px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hch-chip-ev { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 600; color: var(--as-text-secondary); }
.hch-chip-dot { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 7px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); }
.hch-chip-time { font-size: 10px; color: var(--as-text-dim); letter-spacing: 0.04em; text-transform: uppercase; }
.hch-recent-empty { display: flex; align-items: center; gap: 8px; padding: 22px; justify-content: center; font-size: 13px; color: var(--as-text-muted);
  border: 1.5px dashed var(--as-border-strong); border-radius: 14px; background: var(--as-surface); }

@keyframes hch-trace { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
@keyframes hch-beam { 0% { left: -90px; } 100% { left: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .hch-core-ring, .hch-core-sweep, .hch-scan-wave polyline, .hch-scan-beam { animation: none; }
  .hch-scan-wave polyline { stroke-dashoffset: 0; }
}
</style>
