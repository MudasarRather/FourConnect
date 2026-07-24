<template>
  <div class="tls" role="feed" aria-label="Incident event departures board" @keydown="onKey">
    <template v-for="d in days" :key="String(d.day)">
      <!-- bucket header -->
      <div class="tls-bh">
        <span class="tls-bh-name">{{ dayLabel(d.day) }}</span>
        <span class="tls-bh-date">{{ dayDate(d.day) }}</span>
        <span class="tls-bh-rule" aria-hidden="true" />
        <span class="tls-bh-count">{{ d.events.length }} EVENT{{ d.events.length === 1 ? '' : 'S' }}</span>
      </div>
      <div class="tls-cols" aria-hidden="true">
        <span /><span>TIME</span><span>SEV</span><span>EVENT</span><span>RECORD</span>
        <span>INCIDENT</span><span>BY</span><span>◎</span>
      </div>

      <!-- rows -->
      <article v-for="(e, i) in d.events" :key="String(e.id)"
               :ref="(el) => setRowRef(e, el)"
               class="tls-row" :class="{ 'is-new': isNew(e), focus: isFocus(e) }"
               :style="{ '--i': Math.min(i, 12) }"
               tabindex="0" :aria-label="`${verbOf(e)} — ${e.ticket_number} ${e.subject}`"
               @focus="cursor = e" @dblclick="$emit('open', e.ticket_id)">
        <span class="tls-gut" :style="{ background: lineColor(e) }" aria-hidden="true" />
        <span class="tls-rt">{{ hhmm(e.at) }}</span>
        <span class="tls-led" :class="`s${e.sev || 4}`" aria-hidden="true" />
        <span class="tls-verb" :style="{ color: `var(${catToken(e)})` }">{{ verbOf(e) }}</span>
        <span class="tls-lbl" :title="e.subject">{{ e.subject }}</span>
        <button type="button" class="tls-ichip" :style="{ borderColor: lineColor(e), color: lineColor(e) }"
                :title="`Open ${e.ticket_number}`" @click="$emit('open', e.ticket_id)">
          {{ e.ticket_number }}
        </button>
        <span class="tls-actor">
          <template v-if="e.actor_user_id">{{ e.actor }}</template>
          <span v-else class="tls-systag">SYSTEM</span>
        </span>
        <span class="tls-pincell" aria-hidden="true">
          <span v-if="e.is_milestone" class="tls-pin-ring" title="Pinned milestone" />
          <span v-else class="tls-pin-empty" />
        </span>

        <!-- reserved-space verb cluster (never overlaps data — BEAM lesson) -->
        <span class="tls-rverbs" @mousedown.stop @click.stop>
          <button type="button" @click="$emit('open', e.ticket_id)">OPEN</button>
          <button type="button" @click="peekAt(e, $event)">PEEK</button>
          <button v-if="canPin(e)" type="button" class="pinv" :class="{ on: e.is_milestone }"
                  @click="$emit(e.is_milestone ? 'unpin' : 'pin', e)">
            {{ e.is_milestone ? 'UNPIN' : 'PIN' }}
          </button>
        </span>
      </article>
    </template>

    <!-- zero-state: the board is part of the instrument, never blank -->
    <div v-if="!days.length && !loading" class="tls-empty">
      <div class="tls-empty-t">NO DEPARTURES IN THIS WINDOW</div>
      <p>The board lists every move on every incident your seal can see — raises,
        acknowledgements, escalations, decisions, restorations, PIR verdicts.
        Clear a filter or widen the window to see the service resume.</p>
    </div>
    <div v-if="loading && !days.length" class="tls-empty tls-wait">READING THE BOARD…</div>
  </div>
</template>

<script setup>
/*
  SdIncTlStream — the Service Diagram's "departures board": day-bucketed event
  rows tied to their incident's line color by a gutter swatch. Verb cluster
  lives in reserved right-rail space. Keyboard: ↑↓ roving row focus, ↵ open,
  Space peek, p pin/unpin (BEAM precedent).
*/
import { ref, onMounted } from 'vue'
import { fetchMe, fetchCapabilities, useCapabilities, canActOnIncident } from '@/composables/useSupportDesk'

const props = defineProps({
  days: { type: Array, default: () => [] },
  metaFor: { type: Function, required: true },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  focusId: { type: String, default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'peek', 'pin', 'unpin'])

/* PIN curates the incident's milestone spine — an owner-tier write. Gate the
   affordance honestly (assignee/commander/lead/admin) so a bystander never sees a
   button that 403s; the event row carries the incident's owner ids for this. */
const caps = useCapabilities()
const me = ref(null)
onMounted(() => { fetchCapabilities(); fetchMe().then((u) => { me.value = u }).catch(() => {}) })
const canPin = (e) => pinEligible(e) && canActOnIncident(e, me.value, caps)

const cursor = ref(null)
const rowEls = new Map()
const setRowRef = (e, el) => { if (el) rowEls.set(String(e.id), el); else rowEls.delete(String(e.id)) }

const flat = () => props.days.flatMap((d) => d.events || [])
const isNew = (e) => (props.arrivals?.ids || []).includes(String(e.id))
const isFocus = (e) => props.focusId && String(e.ticket_id) === String(props.focusId)
const verbOf = (e) => {
  const m = props.metaFor(e.action)
  return (m.verb || m.label || e.action).toUpperCase()
}
const catToken = (e) => `--tl-cat-${props.metaFor(e.action).category || 'system'}`
const pinEligible = (e) => e.is_milestone || !!props.metaFor(e.action).milestone
const SEV_LINE = { 1: 'var(--tl-arc, var(--sd-inc-arc))', 2: 'var(--tl-core, var(--sd-inc-core))',
                   3: 'var(--tl-warn, var(--sd-amber))', 4: 'var(--sd-text-dim)' }
const lineColor = (e) => SEV_LINE[e.sev || 4]

const hhmm = (at) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const dayLabel = (d) => {
  const date = new Date(`${d}T00:00:00`)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'long' })
}
const dayDate = (d) => new Date(`${d}T00:00:00`)
  .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()

const peekAt = (e, evt) => {
  const host = evt?.target?.closest('.tls-row')
  emit('peek', e, host ? host.getBoundingClientRect() : null)
}

/* keyboard roving (the feed root receives keydown from focused rows) */
const onKey = (e) => {
  const rows = flat()
  if (!rows.length) return
  const idx = cursor.value ? rows.findIndex((r) => String(r.id) === String(cursor.value.id)) : -1
  const go = (n) => {
    const next = rows[Math.max(0, Math.min(rows.length - 1, n))]
    if (!next) return
    cursor.value = next
    rowEls.get(String(next.id))?.focus()
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); go(idx + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); go(idx - 1) }
  else if (e.key === 'Home') { e.preventDefault(); go(0) }
  else if (e.key === 'End') { e.preventDefault(); go(rows.length - 1) }
  else if (e.key === 'Enter' && cursor.value) { e.preventDefault(); emit('open', cursor.value.ticket_id) }
  else if (e.key === ' ' && cursor.value) {
    e.preventDefault()
    const el = rowEls.get(String(cursor.value.id))
    emit('peek', cursor.value, el ? el.getBoundingClientRect() : null)
  } else if ((e.key === 'p' || e.key === 'P') && cursor.value && canPin(cursor.value)) {
    e.preventDefault()
    emit(cursor.value.is_milestone ? 'unpin' : 'pin', cursor.value)
  }
}
</script>

<style scoped>
.tls { margin-top: 22px; }
.tls-bh { display: flex; align-items: baseline; gap: 14px; margin: 26px 0 10px; }
.tls-bh:first-child { margin-top: 0; }
.tls-bh-name { font-size: 17px; font-weight: 550; letter-spacing: -.01em; color: var(--sd-text); }
.tls-bh-date { font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .2em; color: var(--sd-text-muted); }
.tls-bh-rule { flex: 1; height: 1px; background: var(--tl-brd, var(--sd-border)); }
.tls-bh-count { font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .14em; color: var(--sd-text-dim); }
.tls-cols, .tls-row {
  display: grid;
  grid-template-columns: 4px 56px 18px minmax(150px, 208px) 1fr minmax(140px, 176px) minmax(96px, 128px) 42px;
  gap: 0 12px; align-items: center;
}
.tls-cols {
  padding: 4px 14px 6px; border-bottom: 1px solid var(--sd-border-strong);
  font: 500 8.5px/1 var(--sd-mono, monospace); letter-spacing: .2em;
  color: var(--sd-text-dim); text-transform: uppercase;
}
.tls-row {
  position: relative; padding: 9px 14px; border-bottom: 1px solid var(--tl-brd, var(--sd-border));
  cursor: default; transition: background .15s;
  animation: tls-in .4s cubic-bezier(.16, 1, .3, 1) both;
  animation-delay: calc(var(--i, 0) * 28ms);
}
@keyframes tls-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
.tls-row:hover, .tls-row:focus-visible {
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 6%, transparent);
  outline: none;
}
.tls-row:focus-visible { box-shadow: inset 2px 0 0 var(--tl-core, var(--sd-inc-core)); }
.tls-row.focus { background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 7%, transparent); }
.tls-row.is-new { animation: tls-new 1.6s ease-out both; }
@keyframes tls-new {
  0% { box-shadow: inset 3px 0 0 var(--tl-core, var(--sd-inc-core)); background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 14%, transparent); }
  100% { box-shadow: none; background: transparent; }
}
.tls-gut { width: 4px; height: 26px; border-radius: 2px; justify-self: start; }
.tls-rt { font: 400 12px/1 var(--sd-mono, monospace); color: var(--sd-text-secondary); letter-spacing: .04em; }
.tls-led { width: 8px; height: 8px; border-radius: 2px; justify-self: center; }
.tls-led.s1 { background: var(--tl-arc, var(--sd-inc-arc)); animation: tls-breathe 1.8s ease-in-out infinite; }
.tls-led.s2 { background: var(--tl-core, var(--sd-inc-core)); }
.tls-led.s3 { background: var(--tl-warn, var(--sd-amber)); }
.tls-led.s4 { background: var(--sd-text-dim); }
@keyframes tls-breathe {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--tl-arc, var(--sd-inc-arc)) 50%, transparent); opacity: 1; }
  50% { box-shadow: 0 0 0 5px transparent; opacity: .65; }
}
.tls-verb {
  font: 600 11px/1.2 var(--sd-mono, monospace); letter-spacing: .1em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tls-lbl { font-size: 12.5px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tls-ichip {
  font: 400 10px/1 var(--sd-mono, monospace); letter-spacing: .06em; padding: 4px 9px;
  border: 1px solid; border-radius: 9px; justify-self: start; white-space: nowrap;
  background: transparent; cursor: pointer; transition: transform .15s;
}
.tls-row:hover .tls-ichip { transform: translateY(-1px); }
.tls-ichip:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.tls-actor {
  font: 400 10.5px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); letter-spacing: .04em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tls-systag {
  font-size: 8.5px; letter-spacing: .18em; border: 1px solid var(--sd-border-strong);
  padding: 2px 6px; color: var(--sd-text-dim); text-transform: uppercase;
}
.tls-pincell { justify-self: center; display: inline-flex; }
.tls-pin-ring {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2.5px solid var(--tl-hi, var(--sd-inc-hi)); background: var(--sd-canvas); display: block;
}
.tls-pin-empty {
  width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid var(--sd-text-dim);
  opacity: .45; display: block; transition: opacity .15s;
}
.tls-row:hover .tls-pin-empty { opacity: .9; }
.tls-rverbs {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%) translateX(8px);
  display: flex; gap: 7px; opacity: 0; pointer-events: none;
  transition: opacity .18s, transform .18s;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong);
  padding: 5px 8px; box-shadow: 0 8px 26px rgba(0, 0, 0, .4);
}
.tls-row:hover .tls-rverbs, .tls-row:focus-within .tls-rverbs {
  opacity: 1; pointer-events: auto; transform: translateY(-50%) translateX(0);
}
.tls-rverbs button {
  font: 500 9px/1 var(--sd-mono, monospace); letter-spacing: .16em; text-transform: uppercase;
  color: var(--sd-text-secondary); padding: 4px 9px; border: 1px solid transparent;
  background: transparent; cursor: pointer; transition: all .12s;
}
.tls-rverbs button:hover {
  color: var(--tl-core, var(--sd-inc-core));
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent);
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 9%, transparent);
}
.tls-rverbs .pinv.on { color: var(--tl-hi, var(--sd-inc-hi)); }
.tls-empty {
  border: 1px dashed var(--sd-border-strong); padding: 30px 26px; margin-top: 8px; text-align: center;
}
.tls-empty-t {
  font: 600 11px/1 var(--sd-mono, monospace); letter-spacing: .24em; color: var(--tl-core, var(--sd-inc-core));
}
.tls-empty p { margin: 10px auto 0; max-width: 520px; font-size: 12.5px; line-height: 1.6; color: var(--sd-text-muted); }
.tls-wait { color: var(--sd-text-dim); font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .2em; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tls-row { animation: none; }
  html:not([data-cinematic="on"]) .tls-led.s1 { animation: none; }
  html:not([data-cinematic="on"]) .tls-row.is-new { animation: none; }
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .tls-rverbs { box-shadow: 0 8px 26px rgba(60, 45, 20, .14); }
</style>
