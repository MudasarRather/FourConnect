<template>
  <div ref="rootEl" class="cx" :class="{ still: reduced || parked }" aria-hidden="true">
    <!-- ── ambient studio air ── -->
    <div class="cx-air" />

    <!-- ── the rack: cassette spines + the picker rail ── -->
    <div class="cx-rack">
      <div class="cx-rail">
        <span class="cx-carriage" :style="{ top: `calc(${idx} * (var(--spine-h) + 7px))` }" />
      </div>
      <div class="cx-spines">
        <button v-for="(tp, i) in tapes" :key="tp.id" class="cx-spine" :class="{ on: i === idx, draft: tp.draft }"
          :style="{ '--acc': tp.accent }" :title="`Load — ${tp.name}`" tabindex="-1" @click.stop="seat(i)">
          <span class="cx-spine-band" />
          <span class="cx-spine-name">{{ tp.draft ? '· · ·' : tp.name }}</span>
          <span v-if="tp.fav" class="cx-spine-star">★</span>
        </button>
      </div>
      <div class="cx-rack-foot sd-mono">RACK {{ tapes.length ? idx + 1 : 0 }} / {{ tapes.length }}</div>
    </div>

    <!-- ── the deck ── -->
    <div class="cx-deck">
      <div class="cx-deck-top sd-mono">
        <span class="cx-deck-led" /> RESPONSE DECK
        <span class="cx-count">{{ counter }}</span>
      </div>

      <!-- seated cassette -->
      <Transition name="cx-seat" mode="out-in">
        <div v-if="cur" :key="cur.id" class="cx-cassette" :style="{ '--acc': cur.accent }">
          <div class="cx-label">
            <span class="cx-label-name">{{ cur.name }}</span>
            <span class="cx-label-badge sd-mono">{{ cur.badge }}</span>
          </div>
          <div class="cx-window">
            <span class="cx-reel r1" /><span class="cx-reel r2" />
            <span class="cx-tapeband" />
          </div>
          <span class="cx-screw tl" /><span class="cx-screw tr" /><span class="cx-screw bl" /><span class="cx-screw br" />
        </div>
        <div v-else key="empty" class="cx-cassette empty">
          <div class="cx-label"><span class="cx-label-name dim">No tapes in the rack</span></div>
        </div>
      </Transition>

      <!-- playback display: click to open the tape -->
      <div class="cx-display" @click.stop="cur && $emit('pick', cur.tpl)">
        <div class="cx-scan" />
        <Transition name="cx-dev" mode="out-in">
          <div v-if="cur" :key="cur.id" class="cx-disp-frame" :style="{ '--acc': cur.accent }">
            <div class="cx-disp-sub">{{ cur.subject }}</div>
            <div class="cx-disp-meta sd-mono">
              <span v-if="cur.priority" class="cx-chip">{{ cur.priority.toUpperCase() }}</span>
              <span v-if="cur.uses" class="cx-chip use">{{ cur.uses }} PLAY{{ cur.uses === 1 ? '' : 'S' }}</span>
              <span v-if="cur.fav" class="cx-chip fav">★ MIXTAPE</span>
            </div>
            <div class="cx-disp-cta sd-mono">OPEN TAPE →</div>
          </div>
          <div v-else key="none" class="cx-disp-frame">
            <div class="cx-disp-sub dim">Record a personal template to load the deck.</div>
          </div>
        </Transition>
      </div>

      <!-- text-waveform -->
      <div class="cx-wave" :style="{ '--acc': cur?.accent || 'var(--sd-utpl-core)' }">
        <i v-for="n in 16" :key="n" :style="{ '--wd': `${(n % 5) * 0.11}s`, '--wh': `${34 + ((n * 37) % 58)}%` }" />
      </div>
    </div>

    <!-- ── etched counter plaques ── -->
    <div class="cx-plaques sd-mono">
      <span class="cx-plq"><i>MY PLAYS · 30D</i><b>{{ stats.my_use_30d ?? 0 }}</b></span>
      <span class="cx-plq"><i>DESK PROOFS · 30D</i><b>{{ stats.tickets_from_templates_30d ?? 0 }}</b></span>
      <span class="cx-plq dim"><i>UNLABELED · DRAFTS</i><b>{{ draftCount }}</b></span>
    </div>
  </div>
</template>

<script setup>
/* SdUtplInstrument — "THE CASSETTE EXCHANGE" (gallery pick 06 — supersedes the
   Holo-Lantern pick 05), the signature instrument of the agent Template Desk.

   The working set is a wall of accent-tinted CASSETTES; a robotic picker carriage
   rides the rail to the selected spine, the tape SEATS into the response deck
   (drop-in transition), the reels spin at mismatched speeds while a text-waveform
   "plays" the subject across a scanline display, and the mechanical counter holds
   your 30-day plays. Drafts are unlabeled tapes; favorites carry the mixtape star.
   Clicking a spine seats it; clicking the display opens it (emit 'pick').

   Pure CSS + a light JS metronome — no canvas/three. Self-pausing (Intersection
   Observer + visibilitychange) and `reduced` parks a designed still frame. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  templates: { type: Array, default: () => [] },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const rootEl = ref(null)
const idx = ref(0)
const offscreen = ref(false)
const hidden = ref(false)
const parked = computed(() => offscreen.value || hidden.value)
let timer = null
let io = null

/* The rack carries the working set — actives first (by use), then drafts. */
const tapes = computed(() => {
  const live = (props.templates || []).filter((t) => (t.status || 'active') !== 'archived')
  live.sort((a, b) => ((b.status || 'active') === 'active') - ((a.status || 'active') === 'active')
    || (b.usage_count || 0) - (a.usage_count || 0))
  return live.slice(0, 9).map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject || t.description || '—',
    accent: t.accent || 'var(--sd-utpl-core)',
    priority: t.priority || '',
    uses: t.usage_count || 0,
    fav: !!t.is_favorite,
    draft: (t.status || 'active') === 'draft',
    badge: (t.status || 'active') === 'draft'
      ? 'UNLABELED · DRAFT'
      : (t.visibility === 'personal' ? 'PERSONAL TAPE' : (t.visibility === 'team' ? 'TEAM TAPE' : 'LIBRARY TAPE')),
    tpl: t,
  }))
})
const draftCount = computed(() => tapes.value.filter((tp) => tp.draft).length)
const cur = computed(() => tapes.value[idx.value] || null)
const counter = computed(() => String(stats30()).padStart(4, '0').split('').join(' '))
const stats30 = () => Math.min(9999, props.stats?.my_use_30d ?? 0)

const seat = (i) => {
  idx.value = i
  restart()   // a manual load resets the metronome
}
const tick = () => {
  if (!tapes.value.length) return
  idx.value = (idx.value + 1) % tapes.value.length
}
const restart = () => {
  if (timer) clearInterval(timer)
  if (props.reduced || parked.value || tapes.value.length < 2) return
  timer = setInterval(tick, 4600)
}
watch(tapes, () => { if (idx.value >= tapes.value.length) idx.value = 0; restart() })
watch(parked, restart)

const onVis = () => { hidden.value = document.hidden }
onMounted(() => {
  io = new IntersectionObserver((es) => {
    offscreen.value = !(es[0]?.isIntersecting)
  }, { threshold: 0.05 })
  if (rootEl.value) io.observe(rootEl.value)
  document.addEventListener('visibilitychange', onVis)
  restart()
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.cx { position: absolute; inset: 0; overflow: hidden; --spine-h: 26px; }

/* ambient studio air */
.cx-air {
  position: absolute; inset: 0;
  background:
    radial-gradient(60% 90% at 72% 30%, color-mix(in srgb, var(--sd-utpl-core) 7%, transparent), transparent 70%),
    repeating-linear-gradient(101deg, transparent 0 110px, color-mix(in srgb, var(--sd-utpl-hi) 2%, transparent) 110px 116px, transparent 116px 240px);
  animation: cx-drift 28s ease-in-out infinite alternate;
}
@keyframes cx-drift { from { transform: translateX(0); } to { transform: translateX(-22px); } }

/* ── rack ── */
.cx-rack {
  position: absolute; left: 49%; top: 50%; transform: translateY(-56%);
  display: flex; gap: 9px; align-items: stretch;
}
.cx-rail {
  position: relative; width: 8px; border-radius: 4px;
  background: linear-gradient(var(--sd-utpl-plate), color-mix(in srgb, var(--sd-utpl-plate) 55%, #000));
  border: 1px solid var(--sd-utpl-brd);
}
.cx-carriage {
  position: absolute; left: -4px; width: 14px; height: var(--spine-h); border-radius: 5px;
  background: linear-gradient(180deg, var(--sd-utpl-hi), var(--sd-utpl-core));
  box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-core) 60%, transparent);
  transition: top 0.55s var(--sd-spring);
}
.cx-spines { display: flex; flex-direction: column; gap: 7px; }
.cx-spine {
  position: relative; display: flex; align-items: center; gap: 7px;
  width: 148px; height: var(--spine-h); padding: 0 9px; cursor: pointer; pointer-events: auto;
  border-radius: 5px; text-align: left;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-utpl-plate) 88%, var(--acc) 12%), var(--sd-utpl-plate));
  border: 1px solid color-mix(in srgb, var(--acc) 34%, var(--sd-utpl-brd));
  transition: transform 0.35s var(--sd-spring), box-shadow 0.3s;
}
.cx-spine:hover { transform: translateX(5px); }
.cx-spine.on {
  transform: translateX(12px);
  box-shadow: 0 0 16px color-mix(in srgb, var(--acc) 40%, transparent);
  border-color: color-mix(in srgb, var(--acc) 70%, transparent);
}
.cx-spine.draft { border-style: dashed; opacity: 0.6; }
.cx-spine-band { width: 5px; height: 60%; border-radius: 3px; background: var(--acc); box-shadow: 0 0 8px color-mix(in srgb, var(--acc) 45%, transparent); }
.cx-spine-name {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--sd-text-secondary);
}
.cx-spine.on .cx-spine-name { color: var(--sd-text); }
.cx-spine-star { font-size: 9px; color: var(--sd-utpl-fav); }
.cx-rack-foot { position: absolute; left: 17px; bottom: -24px; font-size: 8.5px; letter-spacing: 0.24em; color: var(--sd-text-muted); white-space: nowrap; }

/* ── deck ── */
.cx-deck {
  position: absolute; right: clamp(14px, 3vw, 42px); top: 50%; transform: translateY(-56%);
  width: clamp(240px, 26vw, 320px);
  border-radius: 14px; padding: 12px 14px 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-utpl-plate) 92%, #fff 3%), var(--sd-utpl-plate));
  border: 1px solid var(--sd-utpl-brd);
  box-shadow: 0 0 38px color-mix(in srgb, var(--sd-utpl-core) 10%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.cx-deck-top {
  display: flex; align-items: center; gap: 7px; margin-bottom: 10px;
  font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-text-muted);
}
.cx-deck-led { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-utpl-use); box-shadow: 0 0 8px var(--sd-utpl-use); animation: cx-led 2.4s infinite; }
@keyframes cx-led { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.cx-count {
  margin-left: auto; font-size: 10px; letter-spacing: 0.18em; font-variant-numeric: tabular-nums;
  color: var(--sd-utpl-hi); text-shadow: 0 0 10px color-mix(in srgb, var(--sd-utpl-core) 55%, transparent);
  padding: 2px 7px; border-radius: 5px; background: color-mix(in srgb, #000 40%, transparent);
  border: 1px solid var(--sd-utpl-brd);
}
[data-theme="light"] .cx-count { color: var(--sd-utpl-deep); background: color-mix(in srgb, #fff 45%, transparent); }

/* the seated cassette */
.cx-cassette {
  position: relative; border-radius: 10px; padding: 9px 12px 11px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 14%, var(--sd-utpl-stage)), var(--sd-utpl-stage));
  border: 1px solid color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 45%, var(--sd-utpl-brd));
  box-shadow: inset 0 0 26px color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 8%, transparent);
}
.cx-label { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.cx-label-name {
  font-size: 13.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-shadow: 0 0 16px color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 30%, transparent);
}
.cx-label-name.dim { color: var(--sd-text-secondary); }
.cx-label-badge { font-size: 7.5px; letter-spacing: 0.22em; color: color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 85%, var(--sd-text)); }
.cx-window {
  position: relative; height: 46px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, #000 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 35%, var(--sd-utpl-brd));
  display: flex; align-items: center; justify-content: space-between; padding: 0 26px;
}
[data-theme="light"] .cx-window { background: color-mix(in srgb, #fff 40%, transparent); }
.cx-reel {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2.5px dashed color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 80%, var(--sd-text));
  box-shadow: 0 0 12px color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 25%, transparent);
}
.cx-reel.r1 { animation: cx-spin 2s linear infinite; }
.cx-reel.r2 { animation: cx-spin 3.1s linear infinite; }
@keyframes cx-spin { to { transform: rotate(360deg); } }
.cx-tapeband {
  position: absolute; left: 58px; right: 58px; top: 50%; height: 3px; margin-top: -1.5px; overflow: hidden;
  background: color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 22%, transparent); border-radius: 2px;
}
.cx-tapeband::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--sd-utpl-hi), transparent);
  transform: translateX(-100%); animation: cx-feed 1.7s linear infinite;
}
@keyframes cx-feed { to { transform: translateX(100%); } }
.cx-screw { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: color-mix(in srgb, var(--sd-text-muted) 55%, transparent); }
.cx-screw.tl { top: 6px; left: 7px; } .cx-screw.tr { top: 6px; right: 7px; }
.cx-screw.bl { bottom: 6px; left: 7px; } .cx-screw.br { bottom: 6px; right: 7px; }

/* cassette drop-in */
.cx-seat-enter-active { transition: transform 0.45s var(--sd-spring), opacity 0.3s; }
.cx-seat-leave-active { transition: transform 0.22s ease-in, opacity 0.2s; }
.cx-seat-enter-from { transform: translateY(-26px) rotate(-2deg); opacity: 0; }
.cx-seat-leave-to { transform: translateY(14px); opacity: 0; }

/* playback display */
.cx-display {
  position: relative; margin-top: 10px; min-height: 74px; border-radius: 10px; overflow: hidden;
  cursor: pointer; pointer-events: auto;
  background: color-mix(in srgb, var(--sd-utpl-stage) 60%, transparent);
  border: 1px solid var(--sd-utpl-brd);
}
.cx-scan {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.7;
  background: repeating-linear-gradient(0deg, var(--sd-utpl-scan) 0 1px, transparent 1px 4px);
  animation: cx-scanmv 3.6s linear infinite;
}
@keyframes cx-scanmv { to { transform: translateY(4px); } }
.cx-disp-frame { position: relative; padding: 10px 12px; }
.cx-disp-sub {
  font-size: 11px; line-height: 1.45; color: var(--sd-text-secondary); margin-bottom: 7px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.cx-disp-sub.dim { color: var(--sd-text-muted); }
.cx-disp-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.cx-chip {
  font-size: 8px; letter-spacing: 0.16em; padding: 2px 7px; border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 40%, transparent);
  color: color-mix(in srgb, var(--acc, var(--sd-utpl-core)) 90%, var(--sd-text));
}
.cx-chip.use { border-color: color-mix(in srgb, var(--sd-utpl-use) 45%, transparent); color: var(--sd-utpl-use); }
.cx-chip.fav { border-color: color-mix(in srgb, var(--sd-utpl-fav) 45%, transparent); color: var(--sd-utpl-fav); }
.cx-disp-cta { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-utpl-hi); opacity: 0; transform: translateY(4px); transition: opacity 0.25s, transform 0.3s var(--sd-spring); }
[data-theme="light"] .cx-disp-cta { color: var(--sd-utpl-core); }
.cx-display:hover .cx-disp-cta { opacity: 1; transform: translateY(0); }
.cx-dev-enter-active { transition: opacity 0.45s, filter 0.55s, clip-path 0.5s var(--sd-spring); }
.cx-dev-leave-active { transition: opacity 0.2s; }
.cx-dev-enter-from { opacity: 0; filter: brightness(1.9) saturate(0.5); clip-path: inset(0 0 80% 0); }
.cx-dev-leave-to { opacity: 0; }

/* text-waveform */
.cx-wave { display: flex; align-items: flex-end; gap: 3px; height: 24px; margin-top: 10px; padding: 0 4px; }
.cx-wave i {
  flex: 1; height: var(--wh, 50%); border-radius: 2px;
  background: linear-gradient(var(--sd-utpl-hi), color-mix(in srgb, var(--acc) 80%, var(--sd-utpl-core)));
  transform-origin: bottom; animation: cx-wave 1.05s ease-in-out infinite; animation-delay: var(--wd, 0s);
  opacity: 0.9;
}
@keyframes cx-wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }

/* ── plaques ── */
.cx-plaques {
  position: absolute; right: clamp(14px, 3vw, 42px); bottom: 64px;
  display: flex; gap: 16px;
}
.cx-plq { display: flex; flex-direction: column; gap: 1px; }
.cx-plq i { font-style: normal; font-size: 7.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.cx-plq b { font-size: 15px; font-weight: 800; color: var(--sd-utpl-hi); font-variant-numeric: tabular-nums; }
[data-theme="light"] .cx-plq b { color: var(--sd-utpl-core); }
.cx-plq.dim b { color: var(--sd-utpl-ink); }

/* small viewports: the console owns the air — park the deck right */
@media (max-width: 900px) {
  .cx-rack, .cx-plaques { display: none; }
  .cx-deck { right: 10px; transform: translateY(-62%) scale(0.82); opacity: 0.55; pointer-events: none; }
}

/* still frame: park every loop, keep the lit composition */
.cx.still .cx-air, .cx.still .cx-deck-led, .cx.still .cx-reel,
.cx.still .cx-tapeband::after, .cx.still .cx-scan, .cx.still .cx-wave i { animation: none; }
.cx.still .cx-wave i { transform: scaleY(0.55); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cx-air,
  html:not([data-cinematic="on"]) .cx-deck-led,
  html:not([data-cinematic="on"]) .cx-reel,
  html:not([data-cinematic="on"]) .cx-tapeband::after,
  html:not([data-cinematic="on"]) .cx-scan,
  html:not([data-cinematic="on"]) .cx-wave i { animation: none; }
}
</style>
