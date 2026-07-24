<template>
  <div class="chs" role="feed" aria-label="The record of the desk" @keydown="onKey">
    <section v-for="(d, di) in days" :key="String(d.day)" class="chs-chapter"
             :id="`chapter-${d.day}`">
      <!-- chapter head — the oversized day numeral -->
      <div class="chs-head">
        <span class="chs-num">{{ dayNum(d.day) }}</span>
        <div class="chs-info">
          <div class="chs-name">{{ dayName(d.day).toUpperCase() }}</div>
          <div class="chs-sub">{{ daySub(d.day).toUpperCase() }}</div>
        </div>
        <span class="chs-folio">FOLIO {{ String(di + 1).padStart(2, '0') }} — {{ d.events.length }} ENTRIES</span>
      </div>

      <!-- the two-column ruled folio -->
      <div class="chs-folio-list">
        <article v-for="e in d.events" :key="String(e.id)"
                 :ref="(el) => setRowRef(e, el)"
                 class="chs-entry" :class="[toneClass(e), { pinned: e.is_milestone, 'is-new': isNew(e), focus: isFocus(e) }]"
                 tabindex="0" :aria-label="`${verbOf(e)} — ${e.ticket_number} ${e.subject}`"
                 @focus="cursor = e" @dblclick="$emit('open', e.ticket_id)">
          <span class="chs-einit" aria-hidden="true">{{ initialOf(e) }}</span>
          <div class="chs-ebody">
            <div class="chs-emeta">
              <span class="chs-etime">{{ hhmm(e.at) }}</span>
              <span class="chs-everb" :style="{ color: `var(${catToken(e)})` }">{{ verbOf(e) }}</span>
              <span class="chs-esev" :class="`s${e.sev || 4}`">SEV{{ e.sev || 4 }}</span>
            </div>
            <div class="chs-elabel">
              <button type="button" class="chs-enum" :title="`Open ${e.ticket_number}`"
                      @click="$emit('open', e.ticket_id)">{{ e.ticket_number }}</button>
              {{ e.subject }}
            </div>
            <div class="chs-efoot">
              <span class="chs-eactor">{{ (e.actor || '').toUpperCase() || '' }}
                <span v-if="!e.actor_user_id" class="chs-esys">SYSTEM</span>
              </span>
              <span v-if="e.is_milestone" class="chs-epin">◎ PINNED TO THE RECORD</span>
            </div>
          </div>
          <!-- hover verb cluster -->
          <span class="chs-everbs" @mousedown.stop @click.stop>
            <button type="button" @click="$emit('open', e.ticket_id)">OPEN</button>
            <span class="vsep" aria-hidden="true">·</span>
            <button type="button" @click="peekAt(e, $event)">GOVERN</button>
            <template v-if="canPin(e)">
              <span class="vsep" aria-hidden="true">·</span>
              <button type="button" @click="$emit(e.is_milestone ? 'unpin' : 'pin', e)">
                {{ e.is_milestone ? 'UNPIN' : 'PIN' }}
              </button>
            </template>
          </span>
        </article>
      </div>
    </section>

    <!-- zero-state: the record plate -->
    <div v-if="!days.length && !loading" class="chs-empty">
      <div class="chs-empty-t">THE RECORD IS QUIET IN THIS WINDOW</div>
      <p>Every move on the desk lands here — raises, acknowledgements, escalations,
        command decisions, restorations, review verdicts. Widen the window or clear
        the index to read the full year of the desk.</p>
    </div>
    <div v-if="loading && !days.length" class="chs-empty chs-wait">SETTING THE RECORD…</div>
  </div>
</template>

<script setup>
/*
  SdIncChronStream — the Annual Report's CHAPTERS: one editorial chapter per day
  (oversized numeral + folio count), entries set in a ruled two-column folio with
  large verb initials. GOVERN opens the peek (whose oversight verb rail is the
  single, honestly-gated permission surface — no rail is faked inline here).
  Keyboard: ↑↓ roving, ↵ open, Space/g govern-peek, p pin.
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

/* PIN/UNPIN curate the record's milestone spine — an owner-tier write. Gate the
   affordance honestly (assignee/commander/lead/admin) off the event's incident
   owner ids so a bystander never presses a button that 403s. */
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
const initialOf = (e) => (verbOf(e)[0] || '·')
const catToken = (e) => `--tl-cat-${props.metaFor(e.action).category || 'system'}`
const toneClass = (e) => {
  const t = props.metaFor(e.action).tone
  return t === 'live' ? 't-ok' : (t === 'arc' ? 't-bad' : '')
}
const pinEligible = (e) => e.is_milestone || !!props.metaFor(e.action).milestone

const hhmm = (at) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const dayNum = (d) => String(new Date(`${d}T00:00:00`).getDate()).padStart(2, '0')
const dayName = (d) => {
  const date = new Date(`${d}T00:00:00`)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'long' })
}
const daySub = (d) => new Date(`${d}T00:00:00`)
  .toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

const peekAt = (e, evt) => {
  const host = evt?.target?.closest('.chs-entry')
  emit('peek', e, host ? host.getBoundingClientRect() : null)
}

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
  else if ((e.key === ' ' || e.key === 'g' || e.key === 'G') && cursor.value) {
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
.chs { margin-top: 34px; }
.chs-chapter { padding: 26px 0 8px; border-top: 1px solid var(--sd-border-strong); }
.chs-head { display: flex; align-items: flex-end; gap: 22px; margin-bottom: 20px; }
.chs-num {
  font-size: 78px; font-weight: 800; line-height: .8; letter-spacing: -.05em;
  font-variant-numeric: tabular-nums; color: var(--sd-text);
}
.chs-info { flex: 1; padding-bottom: 6px; }
.chs-name { font-size: 11px; letter-spacing: .34em; font-weight: 800; color: var(--sd-text); }
.chs-sub { font-size: 10px; letter-spacing: .18em; color: var(--sd-text-dim); font-weight: 200; margin-top: 5px; }
.chs-folio { font-size: 10px; letter-spacing: .24em; color: var(--tl-core, var(--sd-fun-core)); font-weight: 800; padding-bottom: 8px; }

.chs-folio-list {
  columns: 2; column-gap: 48px;
  column-rule: 1px solid color-mix(in srgb, var(--sd-text-dim) 30%, transparent);
}
@media (max-width: 900px) { .chs-folio-list { columns: 1; } }
.chs-entry {
  position: relative; break-inside: avoid; display: flex; gap: 14px; padding: 13px 0 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--sd-text-dim) 18%, transparent);
  transition: transform .3s cubic-bezier(.16, 1, .3, 1); cursor: default;
}
.chs-entry:hover, .chs-entry:focus-visible { transform: translateX(4px); outline: none; }
.chs-entry:focus-visible { box-shadow: inset 2px 0 0 var(--tl-core, var(--sd-fun-core)); }
.chs-entry.focus { background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 5%, transparent); }
.chs-entry.is-new { animation: chs-new 1.6s ease-out both; }
@keyframes chs-new {
  0% { background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 13%, transparent); }
  100% { background: transparent; }
}
.chs-einit {
  font-size: 30px; font-weight: 800; line-height: 1.05; letter-spacing: -.02em;
  min-width: 30px; color: var(--sd-text-dim); transition: color .3s;
}
.chs-entry:hover .chs-einit, .chs-entry.pinned .chs-einit { color: var(--tl-core, var(--sd-fun-core)); }
.chs-entry.t-ok .chs-einit { color: var(--tl-live, var(--sd-success)); }
.chs-entry.t-bad .chs-einit { color: var(--tl-arc, var(--sd-pri-critical)); }
.chs-ebody { flex: 1; min-width: 0; }
.chs-emeta { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.chs-etime { font-size: 11px; letter-spacing: .1em; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.chs-everb { font-size: 9.5px; letter-spacing: .22em; font-weight: 800; }
.chs-entry.t-ok .chs-everb { color: var(--tl-live, var(--sd-success)) !important; }
.chs-entry.t-bad .chs-everb { color: var(--tl-arc, var(--sd-pri-critical)) !important; }
.chs-esev {
  font-size: 8px; letter-spacing: .2em; font-weight: 800; padding: 2px 6px; border-radius: 3px;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim);
}
.chs-esev.s1 { color: var(--tl-arc, var(--sd-pri-critical)); border-color: color-mix(in srgb, var(--tl-arc, var(--sd-pri-critical)) 55%, transparent); }
.chs-esev.s2 { color: var(--tl-core, var(--sd-fun-core)); border-color: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 55%, transparent); }
.chs-elabel { font-size: 14.5px; font-weight: 300; color: var(--sd-text-secondary); margin-top: 5px; letter-spacing: .005em; line-height: 1.4; }
.chs-enum {
  font: 700 10.5px/1 var(--sd-mono, monospace); letter-spacing: .06em;
  color: var(--tl-core, var(--sd-fun-core)); background: transparent; border: 0;
  cursor: pointer; padding: 0 2px 0 0;
}
.chs-enum:hover { text-decoration: underline; }
.chs-enum:focus-visible { outline: 2px solid var(--tl-core, var(--sd-fun-core)); outline-offset: 2px; }
.chs-efoot { display: flex; align-items: center; gap: 12px; margin-top: 7px; }
.chs-eactor { font-size: 9px; letter-spacing: .26em; color: var(--sd-text-dim); font-weight: 700; }
.chs-esys {
  font-size: 8.5px; letter-spacing: .2em; font-weight: 800;
  color: var(--tl-cat-comms, var(--sd-text-muted));
  border: 1px solid var(--sd-border-strong); border-radius: 3px; padding: 1px 6px; margin-left: 6px;
}
.chs-epin { font-size: 9px; letter-spacing: .22em; color: var(--tl-core, var(--sd-fun-core)); font-weight: 800; }
.chs-everbs {
  position: absolute; right: 0; bottom: 8px; display: flex; gap: 2px; align-items: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong);
  border-radius: 8px; padding: 4px 6px; opacity: 0; transform: translateY(5px); pointer-events: none;
  transition: opacity .28s, transform .28s cubic-bezier(.16, 1, .3, 1);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .35); z-index: 3;
}
.chs-entry:hover .chs-everbs, .chs-entry:focus-within .chs-everbs {
  opacity: 1; transform: none; pointer-events: auto;
}
.chs-everbs button {
  font-size: 8.5px; letter-spacing: .14em; font-weight: 800; color: var(--sd-text-muted);
  padding: 4px 7px; border-radius: 5px; border: 0; background: transparent; cursor: pointer;
  transition: color .18s, background .18s;
}
.chs-everbs button:hover {
  color: var(--tl-core, var(--sd-fun-core));
  background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 10%, transparent);
}
.chs-everbs .vsep { color: var(--sd-text-dim); font-size: 8px; }
.chs-empty {
  border: 1px dashed var(--sd-border-strong); border-radius: 12px;
  padding: 32px 26px; margin-top: 10px; text-align: center;
}
.chs-empty-t { font-size: 11px; letter-spacing: .3em; font-weight: 800; color: var(--tl-core, var(--sd-fun-core)); }
.chs-empty p { margin: 10px auto 0; max-width: 540px; font-size: 12.5px; line-height: 1.6; color: var(--sd-text-muted); }
.chs-wait { color: var(--sd-text-dim); font-size: 10px; letter-spacing: .24em; font-weight: 800; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .chs-entry { transition: none; }
  html:not([data-cinematic="on"]) .chs-entry.is-new { animation: none; }
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .chs-everbs { box-shadow: 0 10px 28px rgba(60, 45, 20, .16); }
</style>
