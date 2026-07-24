<template>
  <!-- SdRcaQueueBoard — "UNSYMBOLICATED TRACES", the STACK DESCENT (A1) queue in
       debugger skin on the --sd-rca-bench panel (dark BOTH themes): mono gutter
       line-numbers, SEV LED, subject as the symbol name, SdRcaStatusStamp, T+ age,
       red-ink » gutter marker on returned rows, edge-lit breakpoint selection and
       a reserved-space OPEN · FILE verb cluster. Keyboard: ↑↓ select · ↵ open · F file. -->
  <div ref="rootRef" class="rqb" tabindex="0" role="listbox" aria-label="RCA trace buffer"
    @keydown="onKey">
    <header class="rqb-head">
      <span class="dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="rqb-file sd-mono">trace / <b>rca_debt</b> — unsymbolicated traces</span>
      <span class="rqb-mode sd-mono">◉ STEPPING</span>
    </header>

    <!-- loading — shimmer skeleton with fake gutter numbers -->
    <div v-if="loading && !rows.length" class="rqb-body">
      <div v-for="i in 6" :key="`sk-${i}`" class="q-row is-skel" :style="{ '--i': i - 1 }">
        <span class="q-gut sd-mono">{{ ln(i - 1) }}</span>
        <span class="skel-bar w1" /><span class="skel-bar w2" /><span class="skel-bar w3" />
      </div>
    </div>

    <!-- empty — trace buffer clean -->
    <div v-else-if="!rows.length" class="rqb-empty">
      <span class="emp-glyph sd-mono">0x0000</span>
      <b class="sd-mono">TRACE BUFFER CLEAN</b>
      <p>No rows under this lens — the debt is paid and the stack is quiet.</p>
    </div>

    <!-- the traces -->
    <TransitionGroup v-else tag="div" name="rqb-deal" class="rqb-body">
      <div v-for="(r, i) in rows" :key="String(r.ticket_id)" class="q-row"
        :class="{ sel: isSel(r), 'is-focus': isFocus(r), returned: statusOf(r) === 'returned' }"
        :style="{ '--i': Math.min(i, 9) }" role="option" :aria-selected="isSel(r)"
        @click="emit('select', r.ticket_id)" @dblclick="emit('open', r.ticket_id)">
        <span class="q-gut sd-mono">
          <i v-if="isSel(r)" class="bp-arrow" aria-hidden="true">▶</i>
          <i v-else-if="statusOf(r) === 'returned'" class="ret-mark" :title="r.rca_review_note || 'returned with note'">»</i>
          <i v-else class="q-led" :class="`s${r.sev}`" aria-hidden="true" />
          {{ ln(i) }}
        </span>
        <span class="q-sev"><SdIncSevBadge :sev="r.sev" /></span>
        <span class="q-id sd-mono">{{ r.ticket_number }}</span>
        <span class="q-sym">
          <span class="q-sub">{{ r.subject }}</span>
          <span class="q-meta sd-mono">
            <span v-if="r.rca_category" class="m-cat">{{ r.rca_category }}</span>
            <span v-if="r.team_name" class="m-team">{{ r.team_name }}</span>
            <span v-if="r.is_major_incident" class="m-mi">MI</span>
            <span v-if="r.breached" class="m-breach">BREACHED</span>
            <SdRcaStatusStamp :row="r" sm :inherited="!!r.inherited" />
            <span v-if="statusOf(r) === 'returned'" class="m-ret" :title="r.rca_review_note || ''">⟵ RETURNED W/ NOTE</span>
          </span>
        </span>
        <span class="q-stamp sd-mono">RESOLVED<br />{{ fmtStamp(r) }}</span>
        <span class="q-age sd-mono" :class="heat(r)">{{ ageOf(r) }}</span>
        <span class="q-verbs" aria-hidden="false">
          <button class="qv" @click.stop="emit('open', r.ticket_id)"><ArrowUpRight :size="10" /> OPEN</button>
          <button v-if="r.can_file !== false" class="qv hot" @click.stop="emit('file', r)"><Hammer :size="10" /> FILE</button>
        </span>
      </div>
    </TransitionGroup>

    <footer class="rqb-foot sd-mono">
      <span>BREAK ON <b>ROOT_CAUSE</b></span>
      <span class="hint">↑↓ SELECT · ↵ OPEN · F FILE</span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowUpRight, Hammer } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'
import SdRcaStatusStamp from './SdRcaStatusStamp.vue'
import { rcaStatusOf } from '@/composables/useSupportDesk'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  selectedId: { type: [String, Number], default: null },
  loading: { type: Boolean, default: false },
  focusId: { type: [String, Number], default: null },
})
const emit = defineEmits(['select', 'open', 'file'])

const rootRef = ref(null)
const statusOf = (r) => rcaStatusOf(r)
const isSel = (r) => props.selectedId != null && String(r.ticket_id) === String(props.selectedId)
const isFocus = (r) => props.focusId != null && String(r.ticket_id) === String(props.focusId)
const ln = (i) => String(41 + i * 7).padStart(3, '0')

/* T+ age readout: live from the terminal stamp, falling back to owed_age_hours;
   filed and ruled rows read their filing date instead. */
const ageOf = (r) => {
  const st = statusOf(r)
  if (st === 'filed' || st === 'validated') {
    const at = r.rca_filed_at || r.rca_reviewed_at
    return at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'
  }
  const stamp = r.resolved_at || r.closed_at
  const h = stamp ? Math.max(0, (props.now - Date.parse(stamp)) / 36e5) : (r.owed_age_hours ?? 0)
  if (h < 48) return `T+${Math.round(h)}h`
  return `T+${Math.floor(h / 24)}d ${String(Math.round(h % 24)).padStart(2, '0')}h`
}
const heat = (r) => {
  const h = r.owed_age_hours ?? 0
  return h >= 168 ? 'hot' : h >= 72 ? 'warm' : 'cool'
}

/* A1 terminal stamp: "RESOLVED / 07-16 14:02" */
const fmtStamp = (r) => {
  const at = r.resolved_at || r.closed_at
  if (!at) return '—'
  const d = new Date(at)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* keyboard: ↑↓ moves the breakpoint, ↵ opens, F files */
const onKey = (e) => {
  if (!props.rows.length) return
  const idx = props.rows.findIndex((r) => isSel(r))
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const next = props.rows[Math.min(props.rows.length - 1, idx < 0 ? 0 : idx + 1)]
    if (next) emit('select', next.ticket_id)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = props.rows[Math.max(0, idx < 0 ? 0 : idx - 1)]
    if (prev) emit('select', prev.ticket_id)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (idx >= 0) emit('open', props.rows[idx].ticket_id)
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault()
    if (idx >= 0) emit('file', props.rows[idx])
  }
}
</script>

<style scoped>
/* the bench is dark in BOTH themes — every color here is stage-ink family */
.rqb { border-radius: 16px; overflow: hidden; outline: none;
  background: var(--sd-rca-bench); border: 1px solid color-mix(in srgb, var(--sd-rca-core) 18%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--sd-rca-stage) 45%, transparent); }
.rqb:focus-visible { border-color: var(--sd-rca-brd);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-rca-core) 14%, transparent); }

.rqb-head { display: flex; align-items: center; gap: 12px; padding: 11px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-rca-core) 5%, transparent), transparent); }
.dots { display: flex; gap: 6px; }
.dots i { width: 9px; height: 9px; border-radius: 50%;
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 12%, transparent); }
.dots i:first-child { background: color-mix(in srgb, var(--sd-rca-defect) 55%, transparent); }
.dots i:nth-child(2) { background: color-mix(in srgb, var(--sd-rca-core) 50%, transparent); }
.rqb-file { font-size: 10.5px; font-weight: 600; letter-spacing: 0.12em; color: var(--sd-rca-stage-dim); }
.rqb-file b { color: var(--sd-rca-core); }
.rqb-mode { margin-left: auto; font-size: 8.5px; font-weight: 800; letter-spacing: 0.3em;
  color: var(--sd-rca-warn); border: 1px solid color-mix(in srgb, var(--sd-rca-warn) 30%, transparent);
  border-radius: 4px; padding: 4px 8px; animation: rqb-throb 3s ease-in-out infinite; }
@keyframes rqb-throb { 0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 14px color-mix(in srgb, var(--sd-rca-warn) 18%, transparent); } }

.rqb-body { display: flex; flex-direction: column; }

.q-row { position: relative; display: grid; align-items: center; gap: 10px;
  grid-template-columns: 62px auto 76px minmax(0, 1fr) auto 66px 116px;
  padding: 11px 12px 11px 8px; cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 6%, transparent);
  transition: background-color 0.2s, transform 0.2s; }
.q-row:last-child { border-bottom: 0; }
.q-row:hover { background: color-mix(in srgb, var(--sd-rca-core) 4%, transparent); }
.q-row.sel { background: color-mix(in srgb, var(--sd-rca-core) 8%, transparent); }
.q-row.sel::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: var(--sd-rca-core); box-shadow: 0 0 10px color-mix(in srgb, var(--sd-rca-core) 60%, transparent); }
.q-row.is-focus::after { content: ""; position: absolute; inset: 2px; border-radius: 10px;
  border: 1px dashed var(--sd-rca-brd); pointer-events: none; animation: rqb-focus 1.6s ease-in-out 3; }
@keyframes rqb-focus { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

.q-gut { display: flex; align-items: center; justify-content: flex-end; gap: 7px;
  font-size: 10px; color: color-mix(in srgb, var(--sd-rca-stage-dim) 65%, transparent);
  font-variant-numeric: tabular-nums; }
.bp-arrow { font-style: normal; font-size: 10px; color: var(--sd-rca-core);
  text-shadow: 0 0 8px color-mix(in srgb, var(--sd-rca-core) 80%, transparent); }
.ret-mark { font-style: normal; font-size: 13px; font-weight: 800; color: var(--sd-rca-defect); line-height: 1; }
.q-led { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.q-led.s1 { background: var(--sd-rca-defect); box-shadow: 0 0 8px var(--sd-rca-defect);
  animation: rqb-led 1.8s ease-in-out infinite; }
.q-led.s2 { background: var(--sd-rca-warn); }
.q-led.s3, .q-led.s4 { background: color-mix(in srgb, var(--sd-rca-stage-dim) 70%, transparent); }
@keyframes rqb-led { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.q-id { font-size: 11px; font-weight: 700; color: var(--sd-rca-core); letter-spacing: 0.04em; }
.q-sym { min-width: 0; display: grid; gap: 3px; }
.q-sub { font-size: 12.5px; font-weight: 600; color: var(--sd-rca-stage-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-meta { display: flex; gap: 9px; flex-wrap: wrap; font-size: 8.5px; letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 85%, transparent); }
.m-cat { color: var(--sd-rca-stage-dim); text-transform: uppercase; }
.m-mi { color: var(--sd-rca-defect); font-weight: 800; }
.m-breach { color: var(--sd-rca-warn); font-weight: 700; }
.m-ret { color: var(--sd-rca-defect); font-weight: 800; letter-spacing: 0.06em; }
.q-stamp { font-size: 8.5px; letter-spacing: 0.06em; text-align: right; line-height: 1.5;
  color: var(--sd-rca-stage-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
.q-age { font-size: 11px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.q-age.hot { color: var(--sd-rca-defect); }
.q-age.warm { color: var(--sd-rca-warn); }
.q-age.cool { color: var(--sd-rca-stage-dim); }

/* reserved-space verb cluster — the column exists whether or not you hover */
.q-verbs { display: flex; gap: 6px; justify-content: flex-end; opacity: 0;
  transition: opacity 0.2s; }
.q-row:hover .q-verbs, .q-row.sel .q-verbs { opacity: 1; }
.qv { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 7px;
  cursor: pointer; font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em;
  font-family: var(--sd-mono); color: var(--sd-rca-stage-dim); background: transparent;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 14%, transparent);
  transition: color 0.2s, border-color 0.2s, transform 0.2s, background-color 0.2s; }
.qv:hover { color: var(--sd-rca-stage-ink); border-color: var(--sd-rca-brd); transform: translateY(-1px); }
.qv.hot { color: var(--sd-rca-core); border-color: var(--sd-rca-brd); background: var(--sd-rca-soft); }
.qv.hot:hover { color: var(--sd-rca-hi); }

/* deal-in stagger */
.rqb-deal-enter-active { transition: opacity 0.45s var(--sd-spring), transform 0.45s var(--sd-spring);
  transition-delay: calc(var(--i) * 0.045s); }
.rqb-deal-enter-from { opacity: 0; transform: translateY(10px); }
.rqb-deal-leave-active { transition: opacity 0.18s ease; position: absolute; opacity: 0; }
.rqb-deal-move { transition: transform 0.4s var(--sd-spring); }

/* skeleton */
.q-row.is-skel { cursor: default; grid-template-columns: 62px 1fr 2fr 1fr; }
.skel-bar { height: 10px; border-radius: 5px;
  background: linear-gradient(100deg,
    color-mix(in srgb, var(--sd-rca-stage-ink) 5%, transparent) 30%,
    color-mix(in srgb, var(--sd-rca-stage-ink) 12%, transparent) 50%,
    color-mix(in srgb, var(--sd-rca-stage-ink) 5%, transparent) 70%);
  background-size: 220% 100%; animation: rqb-shimmer 1.4s linear infinite; }
.skel-bar.w1 { width: 72%; } .skel-bar.w2 { width: 88%; } .skel-bar.w3 { width: 54%; }
@keyframes rqb-shimmer { from { background-position: 130% 0; } to { background-position: -90% 0; } }

/* empty */
.rqb-empty { display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 44px 20px; text-align: center; }
.emp-glyph { font-size: 22px; font-weight: 200; letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 55%, transparent); }
.rqb-empty b { font-size: 10px; letter-spacing: 0.3em; color: var(--sd-rca-live); }
.rqb-empty p { margin: 0; font-size: 11.5px; color: var(--sd-rca-stage-dim); }

.rqb-foot { display: flex; gap: 20px; align-items: center; padding: 10px 16px;
  border-top: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  font-size: 8.5px; letter-spacing: 0.18em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 80%, transparent); }
.rqb-foot b { color: var(--sd-rca-core); font-weight: 700; }
.rqb-foot .hint { margin-left: auto; letter-spacing: 0.1em; }

@media (max-width: 760px) {
  .q-row { grid-template-columns: 44px auto minmax(0, 1fr) 60px; }
  .q-id, .q-stamp, .q-verbs { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rqb-mode,
  html:not([data-cinematic="on"]) .q-led.s1,
  html:not([data-cinematic="on"]) .q-row.is-focus::after,
  html:not([data-cinematic="on"]) .skel-bar { animation: none !important; }
  html:not([data-cinematic="on"]) .rqb-deal-enter-active,
  html:not([data-cinematic="on"]) .rqb-deal-move { transition: none !important; }
}
</style>
