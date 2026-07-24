<template>
  <div class="rcap" :class="{ compact, strip }">
    <!-- loading: skeleton shimmer -->
    <div v-if="loading" class="rcap-load" :class="{ 'rcap-grid': strip }" aria-hidden="true">
      <span v-for="i in 3" :key="i" class="rcap-ld" :style="{ '--i': i }" />
    </div>

    <!-- strip: A1 "SIMILAR TRACES · PRECEDENT" card grid on the dark bench -->
    <div v-else-if="strip && rows.length" class="rcap-grid">
      <button v-for="(r, i) in rows.slice(0, 3)" :key="r.id || r.ticket_id || i" type="button"
        class="prec" :style="{ '--i': i }" :title="r.reason || r.match_reason || ''"
        @click="$emit('open', r.ticket_id || r.id)">
        <span class="prec-top">
          <b class="prec-id sd-mono">{{ r.ticket_number }}</b>
          <span class="prec-match sd-mono">{{ matchPct(r) }}% MATCH</span>
        </span>
        <span class="prec-sub">{{ r.subject }}</span>
        <span class="prec-meta sd-mono">
          <span v-if="r.root_cause_hint">{{ r.root_cause_hint }}</span>
          <span class="val">RESOLVED{{ r.resolved_at ? ' ' + fmtDate(r.resolved_at) : '' }}</span>
          <span v-if="r.reason || r.match_reason" class="why">{{ r.reason || r.match_reason }}</span>
        </span>
      </button>
    </div>

    <!-- precedent rows -->
    <ul v-else-if="rows.length" class="rcap-list">
      <li v-for="(r, i) in rows" :key="r.id || r.ticket_id || i" :style="{ '--i': i }">
        <button type="button" class="rcap-row" @click="$emit('open', r.ticket_id || r.id)">
          <div class="rcap-top">
            <SdIncSevBadge :sev="r.sev ?? sevOf(r)" />
            <b class="rcap-no sd-mono">{{ r.ticket_number }}</b>
            <span v-if="r.resolved_at" class="rcap-when sd-mono">{{ fmtDate(r.resolved_at) }}</span>
          </div>
          <p class="rcap-subj">{{ r.subject }}</p>
          <p v-if="r.rca_summary || r.resolution_summary" class="rcap-fix">
            <CircleCheck :size="10" /> <span>{{ r.rca_summary || r.resolution_summary }}</span>
          </p>
          <p v-if="r.reason || r.match_reason" class="rcap-why sd-mono">{{ r.reason || r.match_reason }}</p>
        </button>
      </li>
    </ul>

    <!-- empty -->
    <p v-else class="rcap-none">No precedent on file — this one's yours to write.</p>
  </div>
</template>

<script setup>
/*
  SdRcaPrecedentList — self-fetching precedent strip. Give it a ticket id (or a
  row object) and it pulls GET /incidents/{id}/similar — terminal cousins sharing
  a category / service / keywords, each with its recorded fix — through a small
  60s module cache so a desk flicking between records doesn't hammer the API.
  Neutral furniture: the host desk tints it by setting --rcap-core (falls back
  to the RCA desk's gold).
*/
import { ref, computed, watch } from 'vue'
import { CircleCheck } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'
import { similarIncidents, sevOf } from '@/composables/useSupportDesk'

const props = defineProps({
  ticketId: { type: [String, Object], default: null },  // id string OR a row ({ ticket_id } / { id })
  compact: { type: Boolean, default: false },
  strip: { type: Boolean, default: false },             // A1 card-grid on the dark bench
})
defineEmits(['open'])

/* module-level cache: id → { at, data } (60s TTL, shared by every instance) */
const TTL_MS = 60_000
const cache = new Map()

const loading = ref(false)
const items = ref([])
const rows = computed(() => items.value.slice(0, 5))

const idOf = (v) => (v && typeof v === 'object' ? (v.ticket_id || v.id) : v)
const listOf = (res) => (Array.isArray(res) ? res : (res?.items || res?.similar || []))

let seq = 0
const load = async (id) => {
  const my = ++seq
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < TTL_MS) { items.value = hit.data; loading.value = false; return }
  loading.value = true
  try {
    const data = listOf(await similarIncidents(id))
    cache.set(id, { at: Date.now(), data })
    if (my === seq) items.value = data
  } catch {
    if (my === seq) items.value = []
  } finally {
    if (my === seq) loading.value = false
  }
}

watch(() => idOf(props.ticketId), (id) => {
  items.value = []
  if (id) load(id)
  else loading.value = false
}, { immediate: true })

const fmtDate = (v) => {
  try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  catch { return '' }
}

/* /similar scores are additive feature weights (category 2 + service 2 + keywords
   1×hit, realistic ceiling ≈6) — fold to a bounded % for the match badge */
const matchPct = (r) => Math.min(99, Math.max(10, Math.round(((r.score ?? 0) / 6) * 100)))
</script>

<style scoped>
/* host tints via --rcap-core; the RCA desk's gold is the fallback */
.rcap { --_core: var(--rcap-core, var(--sd-rca-core)); display: flex; flex-direction: column; }

/* skeleton shimmer */
.rcap-load { display: flex; flex-direction: column; gap: 8px; }
.rcap-ld { height: 52px; border-radius: 11px; border: 1px solid var(--sd-border);
  background: linear-gradient(100deg, var(--sd-surface-glass) 35%, color-mix(in srgb, var(--_core) 9%, var(--sd-surface-glass)) 50%, var(--sd-surface-glass) 65%);
  background-size: 220% 100%; animation: rcap-shimmer 1.4s ease-in-out infinite; animation-delay: calc(var(--i) * 0.12s); }
@keyframes rcap-shimmer { from { background-position: 120% 0; } to { background-position: -120% 0; } }
html:not([data-cinematic="on"]) .rcap-ld { animation: none; }
.rcap.compact .rcap-ld { height: 40px; }

/* rows */
.rcap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rcap-row { display: flex; flex-direction: column; gap: 4px; width: 100%; text-align: left; cursor: pointer;
  padding: 10px 12px; border-radius: 11px; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass);
  transition: border-color 0.18s, background 0.18s, transform 0.14s; }
.rcap-row:hover { border-color: color-mix(in srgb, var(--_core) 45%, transparent);
  background: color-mix(in srgb, var(--_core) 6%, var(--sd-surface-glass)); transform: translateY(-1px); }
.rcap-row:active { transform: scale(0.99); }
.rcap.compact .rcap-row { padding: 7px 10px; gap: 3px; }

.rcap-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.rcap-no { font-size: 11px; font-weight: 800; color: var(--_core); }
.rcap-when { margin-left: auto; font-size: 9px; letter-spacing: 0.08em; color: var(--sd-text-dim); white-space: nowrap; }

.rcap-subj { margin: 0; font-size: 12px; font-weight: 600; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rcap-fix { display: flex; align-items: flex-start; gap: 5px; margin: 0; font-size: 11px; line-height: 1.45;
  color: var(--sd-text-muted); }
.rcap-fix svg { flex: 0 0 auto; margin-top: 3px; color: var(--_core); }
.rcap-fix span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rcap.compact .rcap-fix span { -webkit-line-clamp: 1; }
.rcap-why { margin: 0; font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-dim); }

/* ── strip: A1 precedent card grid — lives on the dark stage family (both themes) ── */
.rcap-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.rcap.strip .rcap-ld { height: 96px; border-color: color-mix(in srgb, var(--sd-rca-stage-ink, #f2e7d0) 8%, transparent);
  background: linear-gradient(100deg,
    color-mix(in srgb, var(--sd-rca-stage-ink, #f2e7d0) 4%, transparent) 35%,
    color-mix(in srgb, var(--_core) 9%, transparent) 50%,
    color-mix(in srgb, var(--sd-rca-stage-ink, #f2e7d0) 4%, transparent) 65%);
  background-size: 220% 100%; }
.prec { position: relative; display: flex; flex-direction: column; gap: 7px; overflow: hidden;
  text-align: left; cursor: pointer; padding: 14px 16px; border-radius: 12px; font-family: inherit;
  background: var(--sd-rca-bench);
  border: 1px solid color-mix(in srgb, var(--_core) 16%, transparent);
  transition: transform 0.24s var(--sd-spring), border-color 0.24s, box-shadow 0.24s; }
.prec::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(120deg, transparent 30%, color-mix(in srgb, var(--_core) 6%, transparent) 50%, transparent 70%);
  transform: translateX(-110%); transition: transform 0.7s; }
.prec:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--_core) 40%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--sd-rca-stage, #070708) 45%, transparent); }
.prec:hover::after { transform: translateX(110%); }
.prec-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.prec-id { font-size: 11px; font-weight: 800; color: var(--_core); }
.prec-match { font-size: 11px; font-weight: 800; color: var(--sd-rca-hi, var(--_core));
  font-variant-numeric: tabular-nums; }
.prec-sub { font-size: 12px; font-weight: 600; line-height: 1.45; color: var(--sd-rca-stage-ink, #f2e7d0);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.prec-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 8.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: color-mix(in srgb, var(--sd-rca-stage-dim, #9a8f7a) 90%, transparent); }
.prec-meta .val { color: var(--sd-rca-live, #34d399); }
.prec-meta .why { flex-basis: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 900px) { .rcap-grid { grid-template-columns: 1fr; } }

/* empty */
.rcap-none { margin: 0; padding: 12px 4px; font-size: 11.5px; font-style: italic; color: var(--sd-text-dim); }
.rcap.strip .rcap-none { padding: 14px 16px; border-radius: 12px; border: 1px dashed
  color-mix(in srgb, var(--sd-rca-stage-ink, #f2e7d0) 12%, transparent);
  background: var(--sd-rca-bench); color: var(--sd-rca-stage-dim, #9a8f7a); }

[data-theme="light"] .rcap:not(.strip) .rcap-row { background: var(--sd-surface); }
[data-theme="light"] .rcap:not(.strip) .rcap-row:hover { background: color-mix(in srgb, var(--_core) 7%, var(--sd-surface)); }
</style>
