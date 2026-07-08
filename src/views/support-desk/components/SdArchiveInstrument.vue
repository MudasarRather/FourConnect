<template>
  <!-- ⚑ SIGNATURE — "THE REDACTION WALL" (gallery v2, study 07 — user pick).
       The archive as a censor's docket: every tombstone is a line of monospaced record
       text being struck out by redaction bars — the older the record, the more of it is
       already gone. A bronze quill-rule sweeps line to line extending the strike; the
       desk periodically RE-READS one line (bars peel, the text breathes emerald, the
       bars settle back); a real restore removes the line — it re-reads itself and lifts
       off the docket. ⚖ holds carry a gold SEALED stamp; destroy-eligible lines are
       near-total ember. Full-bleed hero backdrop (height=0 contract), DOM/typographic —
       crisp at any size, theme-native on --sd-arc-* (sepia-night ↔ parchment), no canvas,
       no palette observers. Hover a line to hold it up to the light. -->
  <div ref="rootEl" class="ari" aria-hidden="false">
    <div class="ari-dock">
      <div class="ari-head sd-mono">
        <span>DOCKET OF RECORDS REMOVED FROM CIRCULATION</span>
        <span class="ari-head-n">{{ headline }}</span>
      </div>

      <TransitionGroup name="ariln" tag="div" class="ari-lines">
        <button v-for="(row, i) in rows" :key="row.key" class="ari-row sd-mono"
          :class="[row.state, { ghost: row.ghost, reading: readingKey === row.key }]"
          :style="{ '--i': i, '--rc': row.tint }" :disabled="row.ghost" :title="row.title"
          @click="!row.ghost && $emit('open', row.t)">
          <span class="ari-stamp">{{ row.short }}</span>
          <span class="ari-txt">
            <span class="ari-txt-in">{{ row.text }}</span>
            <span v-for="(b, bi) in row.bars" :key="bi" class="ari-bar"
              :style="{ left: b.left + '%', width: b.width + '%', transitionDelay: (bi * 70) + 'ms' }" />
          </span>
          <span v-if="row.tag" class="ari-tag">{{ row.tag }}</span>
        </button>
      </TransitionGroup>

      <!-- the censor's quill-rule, sweeping the register -->
      <div class="ari-quill" :style="{ transform: `translateY(${quillY}px)`, opacity: quillOn ? 1 : 0 }" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { archiveReasonOf, archiveReasonShort, archiveReasonLabel, archiveReasonTone, PURGE_RETENTION_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },   // 0 = absolute-fill hero-backdrop contract
})
defineEmits(['open'])

const MAX_ROWS = 9
const ROW_H = 38          // px — keeps the quill math DOM-measurement-free
const HEAD_H = 34

/* deterministic per-record layout: same ticket → same bars on every render */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const srand = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000 } }

const TONE_VAR = { core: 'var(--sd-arc-core)', bronze: 'var(--sd-arc-bronze)', deep: 'var(--sd-arc-deep)',
  hold: 'var(--sd-arc-hold)', purge: 'var(--sd-arc-purge)', restore: 'var(--sd-arc-restore)' }
const ep = (v) => (v ? new Date(v).getTime() : 0)
const retentionDays = computed(() => props.stats.retention_days || PURGE_RETENTION_DAYS)
const purgeEpoch = (t) => ep(t.purge_eligible_at) || (ep(t.archived_at) ? ep(t.archived_at) + retentionDays.value * 86400000 : 0)
const isEligible = (t) => !t.legal_hold && purgeEpoch(t) > 0 && props.now >= purgeEpoch(t)

const mkBars = (t) => {
  // age → how much of the line is already struck: fresh ≈ 18%, retention-end ≈ 88%
  const days = Math.max(0, (props.now - ep(t.archived_at)) / 86400000)
  const pct = Math.min(88, 16 + (days / retentionDays.value) * 72)
  const rnd = srand(hash(String(t.id || t.ticket_number || Math.random())))
  const bars = []
  const n = pct > 55 ? 3 : 2
  let budget = pct
  let cursor = 4 + rnd() * 10
  for (let i = 0; i < n; i++) {
    const w = i === n - 1 ? budget : Math.max(8, budget * (0.35 + rnd() * 0.3))
    bars.push({ left: Math.min(86, cursor), width: Math.min(92 - cursor, w) })
    cursor += w + 4 + rnd() * 14
    budget -= w
    if (budget <= 6 || cursor > 84) break
  }
  return bars
}

const GHOST_TEXTS = [
  '████-████ — the docket is clear · nothing rests in deep storage',
  '████-████ — records removed from circulation will register here',
  '████-████ — restore, hold, or let retention run its course',
]
const rows = computed(() => {
  const live = (props.tickets || []).slice(0, MAX_ROWS).map(t => {
    const code = archiveReasonOf(t)
    const state = t.legal_hold ? 'hold' : (isEligible(t) ? 'purge' : 'kept')
    const days = Math.max(0, Math.floor((props.now - ep(t.archived_at)) / 86400000))
    const subj = String(t.subject || '').slice(0, 46) + (String(t.subject || '').length > 46 ? '…' : '')
    return {
      key: String(t.id), t, ghost: false, state,
      short: archiveReasonShort(code).slice(0, 4),
      tint: t.legal_hold ? TONE_VAR.hold : (state === 'purge' ? TONE_VAR.purge : (TONE_VAR[archiveReasonTone(code)] || TONE_VAR.core)),
      text: `${t.ticket_number} — ${subj} · shelved ${days ? days + 'd ago' : 'today'} · by ${(t.archived_by_name || 'System')}`,
      title: `${t.ticket_number} · ${archiveReasonLabel(code)} — open the record`,
      tag: t.legal_hold ? '⚖ SEALED' : (state === 'purge' ? 'DESTROY-ELIGIBLE' : ''),
      bars: mkBars(t),
    }
  })
  if (live.length) return live
  // NEVER-EMPTY rule: a clear desk shows dim, unlabeled ghost lines the first real
  // tombstone will displace — the instrument never renders a blank page.
  return GHOST_TEXTS.map((g, i) => ({
    key: 'ghost-' + i, t: null, ghost: true, state: 'kept', short: '——',
    tint: TONE_VAR.deep, text: g, title: '', tag: '',
    bars: [{ left: 6 + i * 4, width: 20 }, { left: 58 - i * 6, width: 14 }],
  }))
})
const headline = computed(() => {
  const n = props.stats.total_archived ?? (props.tickets || []).length
  const held = props.stats.legal_hold_count || 0
  return `${n} HELD${held ? ` · ${held} ⚖` : ''} · RETENTION ${retentionDays.value}D`
})

/* ── the censor's quill-rule + the RE-READ ceremony (paused off-screen / hidden) ── */
const rootEl = ref(null)
const quillIdx = ref(0)
const quillOn = ref(false)
const quillY = computed(() => HEAD_H + 10 + quillIdx.value * ROW_H + ROW_H - 4)
const readingKey = ref('')
let quillTimer = null, readTimer = null, readClear = null
const visible = ref(false)
let iob = null

const stepQuill = () => {
  const n = rows.value.length || 1
  quillIdx.value = (quillIdx.value + 1) % n
  quillOn.value = true
  quillTimer = setTimeout(stepQuill, 1700)
}
const reread = () => {
  const cands = rows.value.filter(r => !r.ghost && r.state !== 'hold')
  if (cands.length) {
    readingKey.value = cands[(Math.random() * cands.length) | 0].key
    readClear = setTimeout(() => { readingKey.value = '' }, 2600)
  }
  readTimer = setTimeout(reread, 6800 + Math.random() * 2600)
}
const start = () => {
  if (props.reduced || quillTimer) return
  quillTimer = setTimeout(stepQuill, 1200)
  readTimer = setTimeout(reread, 3200)
}
const stop = () => {
  clearTimeout(quillTimer); clearTimeout(readTimer); clearTimeout(readClear)
  quillTimer = readTimer = readClear = null
  quillOn.value = false; readingKey.value = ''
}
const onVis = () => { if (document.hidden) stop(); else if (visible.value) start() }
onMounted(() => {
  iob = new IntersectionObserver((es) => {
    visible.value = !!es[0]?.isIntersecting
    if (visible.value && !document.hidden) start(); else stop()
  }, { threshold: 0.15 })
  if (rootEl.value) iob.observe(rootEl.value)
  document.addEventListener('visibilitychange', onVis)
})
onBeforeUnmount(() => { stop(); iob?.disconnect(); document.removeEventListener('visibilitychange', onVis) })
watch(() => props.reduced, (r) => { if (r) stop(); else if (visible.value) start() })
</script>

<style scoped>
.ari { position: absolute; inset: 0; overflow: hidden; }

/* the docket page sits over the calm RIGHT air — the glass console owns the left */
.ari-dock { position: absolute; top: 20px; bottom: 92px; right: 26px;
  left: clamp(20px, 44%, 520px); }
.ari-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline;
  height: 24px; font-size: 9px; font-weight: 800; letter-spacing: 0.28em;
  color: var(--sd-arc-core); opacity: 0.62; border-bottom: 1px solid var(--sd-arc-brd);
  padding-bottom: 8px; white-space: nowrap; overflow: hidden; }
.ari-head-n { letter-spacing: 0.14em; color: var(--sd-arc-bronze); opacity: 0.95; }

.ari-lines { position: absolute; top: 34px; left: 0; right: 0; display: flex; flex-direction: column; }
.ari-row { position: relative; display: flex; align-items: center; gap: 11px; height: 38px;
  padding: 0 4px; border: none; background: transparent; text-align: left; cursor: pointer;
  font-family: inherit; color: var(--sd-arc-core); border-radius: 8px;
  transition: background 0.25s; animation: ari-settle 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i) * 0.07s); }
.ari-row:hover:not(.ghost) { background: color-mix(in srgb, var(--sd-arc-core) 7%, transparent); }
.ari-row.ghost { cursor: default; opacity: 0.34; }
.ari-row:focus-visible { outline: 1px solid var(--sd-arc-bronze); outline-offset: 2px; }

.ari-stamp { flex: none; display: grid; place-items: center; min-width: 30px; height: 22px;
  padding: 0 4px; border-radius: 4px; border: 1.5px solid var(--rc); color: var(--rc);
  font-size: 8px; font-weight: 800; letter-spacing: 0.08em; transform: rotate(-6deg);
  transition: transform 0.4s, border-color 0.4s, color 0.4s; }
.ari-txt { position: relative; flex: 1; min-width: 0; font-size: 11.5px; letter-spacing: 0.05em;
  white-space: nowrap; overflow: hidden; }
.ari-txt-in { opacity: 0.82; transition: color 0.4s, opacity 0.4s, text-shadow 0.4s; }
.ari-bar { position: absolute; top: 1px; bottom: 1px; border-radius: 2px; background: var(--rc);
  opacity: 0.88; transform-origin: left; transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s; }
/* hold the page up to the light */
.ari-row:hover:not(.ghost) .ari-bar { opacity: 0.42; }

.ari-tag { flex: none; font-size: 7.5px; font-weight: 800; letter-spacing: 0.22em; color: var(--rc); }
.ari-row.hold .ari-tag { text-shadow: 0 0 10px color-mix(in srgb, var(--sd-arc-hold) 55%, transparent); }

/* the RE-READ ceremony — bars peel, the record breathes, the strike settles back */
.ari-row.reading .ari-bar { transform: scaleX(0); }
.ari-row.reading .ari-txt-in { color: var(--sd-arc-restore); opacity: 1;
  text-shadow: 0 0 14px color-mix(in srgb, var(--sd-arc-restore) 45%, transparent); }
.ari-row.reading .ari-stamp { transform: rotate(0deg); border-color: var(--sd-arc-restore); color: var(--sd-arc-restore); }

/* a REAL restore: the line re-reads itself and lifts off the docket */
.ariln-leave-active { transition: transform 1s cubic-bezier(0.3, 0, 0.2, 1), opacity 1s; }
.ariln-leave-active .ari-bar { transform: scaleX(0); }
.ariln-leave-active .ari-txt-in { color: var(--sd-arc-restore); opacity: 1; }
.ariln-leave-to { transform: translateY(-46px); opacity: 0; }
.ariln-enter-active { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s; }
.ariln-enter-from { transform: translateY(14px); opacity: 0; }
.ariln-move { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

/* the censor's quill-rule */
.ari-quill { position: absolute; left: 0; right: 0; top: 0; height: 1.5px;
  background: color-mix(in srgb, var(--sd-arc-bronze) 70%, transparent);
  box-shadow: 0 0 9px color-mix(in srgb, var(--sd-arc-bronze) 45%, transparent);
  transition: transform 1.1s cubic-bezier(0.5, 0, 0.2, 1), opacity 0.6s; pointer-events: none; }
.ari-quill::after { content: ""; position: absolute; right: -2px; top: -3px; width: 7px; height: 7px;
  border-radius: 50%; background: var(--sd-arc-bronze);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sd-arc-bronze) 60%, transparent); }

@keyframes ari-settle { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 940px) {
  .ari-dock { left: 18px; right: 18px; top: 14px; bottom: 14px; }
  .ari-row { height: 34px; }
  .ari-txt { font-size: 10.5px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ari-row { animation: none; }
  html:not([data-cinematic="on"]) .ari-quill { display: none; }
}
</style>
