<template>
  <div ref="rootEl" class="lp" :class="{ paused, still: reduced }" aria-hidden="false">
    <!-- ── press-room floor glow ── -->
    <div class="lp-air" aria-hidden="true" />

    <!-- ── the press: bed + chase of live sorts + roller ── -->
    <div class="lp-pressline">
      <div class="lp-press">
        <div class="lp-bedframe">
          <div class="lp-bed">
            <div class="lp-chase">
              <button v-for="(s, i) in sorts" :key="s.id" class="lp-sort" :style="{
                  '--d': (i * 0.035) + 's',
                  '--ink': s.ink,
                }" :title="`${s.name} · ${s.uses} use${s.uses === 1 ? '' : 's'}`" @click="$emit('pick', s.tpl)">
                {{ s.ch }}
              </button>
              <span v-for="n in padCells" :key="'pad' + n" class="lp-sort ghost">·</span>
            </div>
            <div class="lp-roller" aria-hidden="true"><span class="lp-roller-sheen" /></div>
          </div>
          <p class="lp-bed-label sd-mono">CHASE · {{ activeCount }} PLATE{{ activeCount === 1 ? '' : 'S' }} LOCKED</p>
        </div>

        <!-- proof ejects toward the stack on every press cycle -->
        <div class="lp-proof" aria-hidden="true"><i /><i /><i /><i /></div>
      </div>

      <!-- ── delivery: the proof stack ── -->
      <div class="lp-delivery">
        <div class="lp-stack" aria-hidden="true"><i /><i /><i class="fresh" /></div>
        <p class="lp-stack-label sd-mono">
          <b><SdCountUp :value="proofs30d" /></b> PROOFS · 30D
        </p>
      </div>
    </div>

    <!-- ── the galley: draft sorts not yet locked into the chase ── -->
    <div class="lp-galley">
      <p class="lp-galley-label sd-mono">GALLEY · DRAFTS</p>
      <div class="lp-galley-tray">
        <button v-for="d in draftSorts" :key="d.id" class="lp-sort draft" :title="`${d.name} · draft`"
          @click="$emit('pick', d.tpl)">{{ d.ch }}</button>
        <span v-if="draftOverflow > 0" class="lp-sort draft more">+{{ draftOverflow }}</span>
        <span v-if="!draftSorts.length" class="lp-galley-empty sd-mono">EMPTY</span>
      </div>
    </div>

    <!-- ── etched shop readouts ── -->
    <div class="lp-plaques sd-mono" aria-hidden="false">
      <span class="lp-plaque"><i>STRIKES</i><b><SdCountUp :value="usageTotal" /></b></span>
      <span class="lp-plaque dim"><i>ARCHIVE DRAWER</i><b>{{ archivedCount }}</b></span>
    </div>
  </div>
</template>

<script setup>
/* SdTemplateInstrument — "The Letterpress" (gallery pick 01), the Copperplate
   Studio's signature. Pure CSS-3D + DOM choreography, no canvas:
     · sorts in the chase = ACTIVE templates (letter = plate initial, ink depth =
       relative usage; click = open that plate)
     · the roller pass + bed strike run on a 5s press cycle; each cycle ejects a
       ticket proof onto the delivery stack (PROOFS · 30D = tickets born from
       templates in the last 30 days)
     · the galley tray = DRAFT plates (graphite, uninked) · the drawer = archived
   Self-pausing (IntersectionObserver + visibilitychange add .paused) and
   reduced-motion aware (.still = one composed static frame). Swappable mount:
   only this file's internals change if the signature is ever re-struck. */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  templates: { type: Array, default: () => [] },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const rootEl = ref(null)
const paused = ref(false)
let io = null
let inView = true

const onVis = () => { paused.value = document.hidden || !inView }
onMounted(() => {
  io = new IntersectionObserver((es) => { inView = es[0]?.isIntersecting !== false; onVis() }, { threshold: 0.05 })
  if (rootEl.value) io.observe(rootEl.value)
  document.addEventListener('visibilitychange', onVis)
})
onBeforeUnmount(() => { io?.disconnect(); document.removeEventListener('visibilitychange', onVis) })

const CHASE_MAX = 24
const GALLEY_MAX = 8

const actives = computed(() => (props.templates || []).filter((t) => (t.status || 'active') === 'active'))
const drafts = computed(() => (props.templates || []).filter((t) => t.status === 'draft'))

const maxUses = computed(() => Math.max(1, ...actives.value.map((t) => t.usage_count || 0)))
const sorts = computed(() =>
  actives.value.slice(0, CHASE_MAX).map((t) => ({
    id: t.id,
    tpl: t,
    ch: (t.icon && !/^[A-Za-z]/.test(t.icon) ? t.icon : (t.name || '?').trim().charAt(0).toUpperCase()) || '?',
    name: t.name,
    uses: t.usage_count || 0,
    ink: (0.35 + 0.65 * ((t.usage_count || 0) / maxUses.value)).toFixed(2),
  })),
)
const padCells = computed(() => Math.max(0, Math.min(CHASE_MAX, 8) - sorts.value.length))

const draftSorts = computed(() =>
  drafts.value.slice(0, GALLEY_MAX).map((t) => ({
    id: t.id, tpl: t, name: t.name,
    ch: (t.name || '?').trim().charAt(0).toUpperCase() || '?',
  })),
)
const draftOverflow = computed(() => Math.max(0, drafts.value.length - GALLEY_MAX))

const activeCount = computed(() => props.stats.active ?? actives.value.length)
const archivedCount = computed(() => props.stats.archived ?? 0)
const usageTotal = computed(() => props.stats.usage_total ?? 0)
const proofs30d = computed(() => props.stats.tickets_from_templates_30d ?? 0)
</script>

<style scoped>
.lp { position: absolute; inset: 0; overflow: hidden; }
.lp-air {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 60% at 30% 8%, var(--sd-tpl-soft), transparent 60%),
    radial-gradient(50% 40% at 78% 80%, var(--sd-tpl-deep-soft), transparent 65%);
}

/* ── press line: right of the console's calm left air ── */
.lp-pressline { position: absolute; left: 44%; right: 3.5%; top: 9%; bottom: 42%; display: flex; align-items: stretch; }
.lp-press { position: relative; flex: 1; perspective: 1000px; }
.lp-bedframe { position: absolute; inset: 0 26% 0 0; }
.lp-bed {
  position: absolute; inset: 0 0 14% 0; transform: rotateX(13deg);
  background: linear-gradient(180deg, #241a10, #150e08);
  border: 1px solid var(--sd-tpl-brd); border-radius: 12px;
  box-shadow: inset 0 0 34px rgba(0, 0, 0, 0.62), 0 16px 34px rgba(0, 0, 0, 0.45);
  padding: 4.5% 4%;
}
.lp-chase { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; height: 100%; align-content: start; }
.lp-sort {
  aspect-ratio: 1; min-width: 0; border: none; cursor: pointer; border-radius: 4px;
  display: grid; place-items: center;
  font-family: var(--sd-mono); font-weight: 800; font-size: clamp(9px, 1vw, 13px);
  background: linear-gradient(180deg, #4d4740, #2b2620);
  border-top: 1px solid color-mix(in srgb, var(--sd-tpl-hi) calc(var(--ink, 0.5) * 100%), transparent);
  color: color-mix(in srgb, #ffe9d4 calc(var(--ink, 0.5) * 100%), #8b8478);
  animation: lp-press-strike 5s var(--d, 0s) infinite;
  transition: transform 0.18s var(--sd-spring), box-shadow 0.18s;
}
.lp-sort:hover { transform: translateY(-2px) scale(1.08); box-shadow: 0 0 14px var(--sd-tpl-soft); z-index: 2; }
.lp-sort.ghost { pointer-events: none; opacity: 0.22; animation: none; color: var(--sd-tpl-ink); background: transparent; border-top-color: transparent; }
@keyframes lp-press-strike {
  0%, 40%, 60%, 100% { filter: brightness(1); translate: 0 0; }
  47%, 53% { filter: brightness(1.65); translate: 0 1.5px; }
}
.lp-roller {
  position: absolute; left: 1.5%; width: 97%; height: 15%; top: 6%;
  border-radius: 999px;
  background: linear-gradient(180deg, #6b3e1e, #2e1b0d 55%, #7c4a24);
  border: 1px solid color-mix(in srgb, var(--sd-tpl-hi) 45%, transparent);
  box-shadow: 0 7px 18px rgba(0, 0, 0, 0.55), inset 0 2px 6px color-mix(in srgb, var(--sd-tpl-hi) 35%, transparent);
  animation: lp-roll 5s infinite;
}
.lp-roller-sheen {
  position: absolute; inset: 14% 4%; border-radius: 999px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-tpl-hi) 50%, transparent), transparent);
}
@keyframes lp-roll {
  0% { transform: translateY(-30%); opacity: 0; }
  8% { opacity: 1; }
  22% { transform: translateY(60%); }
  42% { transform: translateY(340%); }
  56% { transform: translateY(60%); }
  68% { transform: translateY(-30%); opacity: 1; }
  74%, 100% { opacity: 0; transform: translateY(-30%); }
}
.lp-bed-label {
  position: absolute; left: 1%; bottom: 0; font-size: 9.5px; letter-spacing: 0.18em;
  color: var(--sd-tpl-ink); text-transform: uppercase;
}

/* proof card — printed each cycle, ejects toward the stack */
.lp-proof {
  position: absolute; left: 12%; top: 30%; width: 26%; height: 38%;
  background: linear-gradient(180deg, #f4ecdf, #e9ddc8);
  border-radius: 6px; padding: 4.5% 3.5%;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5);
  opacity: 0; animation: lp-eject 5s infinite;
}
.lp-proof i { display: block; height: 8%; border-radius: 99px; background: #5f5a52; margin-bottom: 8%; }
.lp-proof i:nth-child(1) { width: 62%; background: var(--sd-tpl-deep); height: 12%; }
.lp-proof i:nth-child(2) { width: 92%; }
.lp-proof i:nth-child(3) { width: 76%; }
.lp-proof i:nth-child(4) { width: 46%; }
@keyframes lp-eject {
  0%, 56% { opacity: 0; transform: translate(0, 8%) scale(0.94); }
  62% { opacity: 1; transform: translate(0, 0) scale(1); }
  88%, 96% { opacity: 1; transform: translate(210%, 16%) rotate(4deg) scale(0.92); }
  100% { opacity: 0; transform: translate(210%, 16%) rotate(4deg) scale(0.92); }
}

/* delivery stack */
.lp-delivery { position: relative; width: 30%; display: flex; flex-direction: column; justify-content: flex-end; }
.lp-stack { position: relative; height: 42%; }
.lp-stack i {
  position: absolute; inset: 0; border-radius: 7px;
  background: linear-gradient(180deg, #efe5d4, #e0d2b8);
  border: 1px solid rgba(0, 0, 0, 0.22);
}
.lp-stack i:nth-child(1) { transform: translate(7px, 12px) rotate(3deg); filter: brightness(0.8); }
.lp-stack i:nth-child(2) { transform: translate(-5px, 6px) rotate(-2deg); filter: brightness(0.9); }
.lp-stack i.fresh { animation: lp-stack-land 5s infinite; }
@keyframes lp-stack-land {
  0%, 86% { box-shadow: none; }
  90% { box-shadow: 0 0 26px var(--sd-tpl-soft); }
  100% { box-shadow: none; }
}
.lp-stack-label { margin: 12px 0 0; font-size: 10px; letter-spacing: 0.16em; color: var(--sd-tpl-ink); }
.lp-stack-label b { color: var(--sd-tpl-hi); font-size: 15px; margin-right: 6px; }

/* ── galley of drafts ── */
.lp-galley { position: absolute; left: 44%; bottom: 24%; max-width: 34%; }
.lp-galley-label { font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-tpl-ink); margin: 0 0 7px; }
.lp-galley-tray {
  display: flex; gap: 5px; padding: 7px 9px; border-radius: 10px;
  background: linear-gradient(180deg, rgba(36, 26, 16, 0.8), rgba(21, 14, 8, 0.85));
  border: 1px solid color-mix(in srgb, var(--sd-tpl-ink) 30%, transparent);
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
}
.lp-sort.draft {
  width: clamp(20px, 2.2vw, 28px); aspect-ratio: 1; animation: none;
  background: linear-gradient(180deg, #3b3730, #262320);
  border-top: 1px solid color-mix(in srgb, var(--sd-tpl-ink) 55%, transparent);
  color: var(--sd-tpl-ink);
}
.lp-sort.draft.more { pointer-events: none; font-size: 9px; }
.lp-galley-empty { font-size: 9.5px; letter-spacing: 0.14em; color: var(--sd-tpl-ink); opacity: 0.6; padding: 4px 6px; }

/* ── etched plaques ── */
.lp-plaques { position: absolute; right: 3.5%; bottom: 24%; display: flex; gap: 10px; }
.lp-plaque {
  display: flex; flex-direction: column; gap: 2px; padding: 8px 13px; border-radius: 10px;
  background: linear-gradient(180deg, rgba(36, 26, 16, 0.72), rgba(21, 14, 8, 0.8));
  border: 1px solid var(--sd-tpl-brd);
}
.lp-plaque i { font-style: normal; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-tpl-ink); }
.lp-plaque b { font-size: 16px; color: var(--sd-tpl-hi); font-variant-numeric: tabular-nums; }
.lp-plaque.dim b { color: var(--sd-tpl-arch); font-size: 13px; }

/* ── pause / reduced-motion: park the press mid-frame ── */
.lp.paused .lp-roller, .lp.paused .lp-proof, .lp.paused .lp-sort, .lp.paused .lp-stack i.fresh { animation-play-state: paused; }
.lp.still .lp-roller { animation: none; opacity: 1; transform: translateY(60%); }
.lp.still .lp-proof { animation: none; opacity: 1; transform: translate(210%, 16%) rotate(4deg) scale(0.92); }
.lp.still .lp-sort, .lp.still .lp-stack i.fresh { animation: none; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .lp .lp-roller { animation: none; opacity: 1; transform: translateY(60%); }
  html:not([data-cinematic="on"]) .lp .lp-proof { animation: none; opacity: 1; transform: translate(210%, 16%) rotate(4deg) scale(0.92); }
  html:not([data-cinematic="on"]) .lp .lp-sort, html:not([data-cinematic="on"]) .lp .lp-stack i.fresh { animation: none; }
}

/* ── light theme: machinery keeps its dark metal, trays turn press-bed brass ── */
[data-theme="light"] .lp-bed { background: linear-gradient(180deg, #372718, #241812); border-color: var(--sd-tpl-brd); }
[data-theme="light"] .lp-galley-tray,
[data-theme="light"] .lp-plaque { background: linear-gradient(180deg, rgba(60, 42, 26, 0.88), rgba(40, 28, 18, 0.92)); }
[data-theme="light"] .lp-plaque i, [data-theme="light"] .lp-galley-label, [data-theme="light"] .lp-bed-label,
[data-theme="light"] .lp-stack-label { color: #6f6a62; }
[data-theme="light"] .lp-plaque b { color: #eaa36c; }
[data-theme="light"] .lp-stack-label b { color: var(--sd-tpl-core); }

@media (max-width: 980px) {
  .lp-pressline { left: 52%; bottom: 46%; }
  .lp-delivery { display: none; }
  .lp-galley { left: 52%; max-width: 44%; bottom: 26%; }
  .lp-plaques { display: none; }
}
</style>
