<template>
  <Teleport to="body">
    <Transition name="dsr-slide">
      <div v-if="open" class="dsr-wrap" @mousedown.self="$emit('close')">
        <aside class="dsr" role="dialog" aria-label="Incident dossier replay" @mousedown.stop @click.stop>
          <!-- masthead -->
          <header class="dsr-head">
            <div class="dsr-id">
              <SdIncSevBadge v-if="ticket" :sev="ticket.sev || 4" />
              <div class="dsr-title">
                <div class="dsr-num">{{ ticket?.ticket_number || '—' }}
                  <span v-if="ticket?.is_major_incident" class="dsr-mi">MI</span>
                </div>
                <div class="dsr-sub">{{ ticket?.subject || 'Sealing the record…' }}</div>
              </div>
            </div>
            <div class="dsr-actions">
              <button class="dsr-btn" type="button" :disabled="pdfBusy" title="Sitrep PDF"
                      @click="sitrepPdf">{{ pdfBusy ? '…' : 'SITREP PDF' }}</button>
              <button class="dsr-btn primary" type="button" @click="$emit('open', ticketId)">OPEN INCIDENT</button>
              <button class="dsr-x" type="button" aria-label="Close dossier" @click="$emit('close')">✕</button>
            </div>
          </header>

          <!-- type facets -->
          <nav class="dsr-facets" aria-label="Stream facets">
            <button v-for="f in FACETS" :key="f.key" type="button" class="dsr-facet"
                    :class="{ on: facet === f.key }" @click="setFacet(f.key)">
              {{ f.label }}<span v-if="counts[f.key] != null" class="dsr-fc">{{ counts[f.key] }}</span>
            </button>
          </nav>

          <!-- REPLAY scrub head -->
          <div v-if="items.length > 1" class="dsr-replay">
            <span class="dsr-replay-lbl">REPLAY</span>
            <input class="dsr-scrub" type="range" :min="0" :max="items.length - 1" :value="head"
                   aria-label="Replay playhead"
                   @input="head = Number($event.target.value)" />
            <span class="dsr-replay-at">{{ headStamp }}</span>
            <button class="dsr-replay-reset" type="button" :disabled="head === items.length - 1"
                    title="Back to now" @click="head = items.length - 1">NOW</button>
          </div>

          <!-- the merged record -->
          <div class="dsr-stream" role="feed" aria-label="Merged incident record">
            <div v-if="loading && !items.length" class="dsr-wait">Assembling the record…</div>
            <article v-for="(it, i) in items" :key="`${it.kind}-${it.id}`" class="dsr-item"
                     :class="[`k-${it.kind}`, { ghost: i > head, stone: it.is_milestone }]">
              <span class="dsr-i-rail" :data-cat="it.category || 'system'" aria-hidden="true" />
              <div class="dsr-i-body">
                <div class="dsr-i-top">
                  <span class="dsr-i-at">{{ stamp(it.at) }}</span>
                  <span class="dsr-i-kind">{{ it.kind }}</span>
                  <span class="dsr-i-title">{{ it.title }}<span v-if="it.is_milestone" class="dsr-i-star">★</span></span>
                  <span v-if="it.is_internal" class="dsr-i-int">INTERNAL</span>
                </div>
                <p v-if="it.body" class="dsr-i-text">{{ clip(it.body) }}</p>
                <div class="dsr-i-by">{{ it.actor || 'System' }}</div>
              </div>
            </article>
            <button v-if="items.length < total" class="dsr-more" type="button" :disabled="loading"
                    @click="more">{{ loading ? 'Loading…' : `LOAD EARLIER — ${total - items.length} MORE` }}</button>
            <div v-if="!loading && !items.length" class="dsr-wait">No entries in this facet.</div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/*
  SdIncDossierPanel — the per-incident REPLAY: the merged dossier stream
  (GET /incidents/{id}/stream — activities + comments + worklogs + tasks) in a
  slide-over, with type facets and a client-side scrub playhead (entries after
  the head fall to ghost opacity — pure CSS lighting, no unmounts). Works on
  archived incidents (the endpoint keeps them readable by design). The host
  sets spine.uiHold while this is open.
*/
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import SdIncSevBadge from './SdIncSevBadge.vue'
import { fetchIncidentStream, exportSitrepPdf, normalizeIncidentRow } from '@/composables/useSupportDesk'

const props = defineProps({
  ticketId: { type: [String, Object], default: null },
  open: { type: Boolean, default: false },
})
defineEmits(['close', 'open'])

const toast = useToast()
const FACETS = [
  { key: '', label: 'ALL' },
  { key: 'activity', label: 'RECORD' },
  { key: 'comment', label: 'COMMS' },
  { key: 'worklog', label: 'EFFORT' },
  { key: 'task', label: 'TASKS' },
]

const ticket = ref(null)
const items = ref([])
const counts = ref({})
const total = ref(0)
const page = ref(1)
const facet = ref('')
const loading = ref(false)
const pdfBusy = ref(false)
const head = ref(0)

let seq = 0
const fetchPage = async (reset) => {
  if (!props.ticketId) return
  const my = ++seq
  loading.value = true
  try {
    const res = await fetchIncidentStream(props.ticketId, {
      page: page.value, limit: 50, types: facet.value || undefined,
    })
    if (my !== seq) return
    ticket.value = res.ticket ? normalizeIncidentRow(res.ticket) : null
    counts.value = { '': res.total, activity: res.counts?.activity, comment: res.counts?.comment,
                     worklog: res.counts?.worklog, task: res.counts?.task }
    total.value = res.total || 0
    // stream is newest-first; the replay reads oldest → newest
    const batch = [...(res.items || [])].reverse()
    items.value = reset ? batch : [...batch, ...items.value]
    if (reset) head.value = Math.max(0, items.value.length - 1)
  } catch { toast.error('The record would not open') }
  finally { if (my === seq) loading.value = false }
}
const setFacet = (k) => { facet.value = k; page.value = 1; fetchPage(true) }
const more = () => { page.value += 1; fetchPage(false) }

watch(() => [props.open, props.ticketId], ([o]) => {
  if (o && props.ticketId) { facet.value = ''; page.value = 1; items.value = []; fetchPage(true) }
}, { immediate: true })
watch(() => items.value.length, (n, old) => {
  // keep the head pinned to "now" when new pages prepend older entries
  if (n > (old || 0) && head.value === (old || 1) - 1) head.value = n - 1
})

const headStamp = computed(() => {
  const it = items.value[head.value]
  return it ? new Date(it.at).toLocaleString(undefined,
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
})
const stamp = (at) => new Date(at).toLocaleString(undefined,
  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const clip = (s) => (String(s).length > 280 ? `${String(s).slice(0, 280)}…` : s)

const sitrepPdf = async () => {
  pdfBusy.value = true
  try {
    const blob = await exportSitrepPdf(props.ticketId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sitrep-${ticket.value?.ticket_number || 'incident'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Sitrep exported')
  } catch (err) {
    toast.error(err?.response?.status === 503
      ? 'PDF engine offline on this machine (GTK) — the record is still readable here'
      : 'Sitrep export failed')
  } finally { pdfBusy.value = false }
}
</script>

<style scoped>
.dsr-wrap { position: fixed; inset: 0; z-index: 2350; background: rgba(0, 0, 0, .35); backdrop-filter: blur(2px); }
.dsr {
  position: absolute; top: 0; right: 0; bottom: 0; width: min(540px, 94vw);
  display: flex; flex-direction: column; gap: 12px; padding: 18px;
  background: color-mix(in srgb, var(--sd-surface-elevated) 96%, transparent);
  border-left: 1px solid var(--tl-brd, var(--sd-border-strong));
  backdrop-filter: blur(24px) saturate(1.1);
  box-shadow: -30px 0 70px rgba(0, 0, 0, .4);
}
.dsr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dsr-id { display: flex; gap: 10px; align-items: flex-start; min-width: 0; }
.dsr-num { font: 700 13px/1 var(--sd-mono, monospace); color: var(--tl-core, var(--sd-inc-core)); display: flex; gap: 8px; align-items: center; }
.dsr-mi {
  font-size: 8.5px; letter-spacing: 1.5px; padding: 2px 6px; border-radius: 5px;
  background: color-mix(in srgb, var(--sd-pri-critical) 18%, transparent);
  color: var(--sd-pri-critical); border: 1px solid color-mix(in srgb, var(--sd-pri-critical) 45%, transparent);
}
.dsr-sub { margin-top: 5px; font-size: 13.5px; font-weight: 580; color: var(--sd-text); }
.dsr-actions { display: flex; gap: 7px; align-items: center; flex: none; }
.dsr-btn {
  border: 1px solid var(--tl-brd, var(--sd-border-strong)); background: transparent; cursor: pointer;
  color: var(--sd-text-secondary); border-radius: 999px; padding: 6px 12px;
  font: 700 9.5px/1 var(--sd-mono, monospace); letter-spacing: 1.3px;
  transition: transform .15s var(--sd-spring), border-color .15s, color .15s;
}
.dsr-btn:hover { transform: translateY(-1px); color: var(--sd-text); border-color: var(--tl-core, var(--sd-inc-core)); }
.dsr-btn.primary { color: var(--tl-core, var(--sd-inc-core)); border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent); }
.dsr-btn:focus-visible, .dsr-x:focus-visible, .dsr-facet:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.dsr-x { border: 0; background: transparent; cursor: pointer; color: var(--sd-text-dim); font-size: 14px; padding: 4px 7px; border-radius: 7px; }
.dsr-x:hover { color: var(--sd-text); }
.dsr-facets { display: flex; gap: 6px; flex-wrap: wrap; }
.dsr-facet {
  border: 1px solid var(--tl-brd, var(--sd-border)); background: transparent; cursor: pointer;
  color: var(--sd-text-muted); border-radius: 999px; padding: 5px 11px;
  font: 650 9.5px/1 var(--sd-mono, monospace); letter-spacing: 1.4px;
  display: inline-flex; gap: 6px; align-items: center; transition: all .18s;
}
.dsr-facet.on {
  color: var(--tl-core, var(--sd-inc-core));
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent);
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 9%, transparent);
}
.dsr-fc { font-size: 8.5px; opacity: .75; }
.dsr-replay {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border: 1px solid var(--tl-brd, var(--sd-border)); border-radius: 10px;
  background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 5%, transparent);
}
.dsr-replay-lbl { font: 700 9px/1 var(--sd-mono, monospace); letter-spacing: 2px; color: var(--tl-hi, var(--sd-inc-hi)); }
.dsr-scrub { flex: 1; accent-color: var(--tl-core, var(--sd-inc-core)); }
.dsr-replay-at { font: 600 10px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); white-space: nowrap; }
.dsr-replay-reset {
  border: 0; background: transparent; cursor: pointer; color: var(--tl-core, var(--sd-inc-core));
  font: 700 9px/1 var(--sd-mono, monospace); letter-spacing: 1.5px; padding: 3px 6px; border-radius: 6px;
}
.dsr-replay-reset:disabled { color: var(--sd-text-dim); cursor: default; }
.dsr-stream {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column-reverse; gap: 4px;
  padding-right: 4px; scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 40%, transparent) transparent;
}
.dsr-stream::-webkit-scrollbar { width: 6px; }
.dsr-stream::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 40%, transparent); border-radius: 4px; }
.dsr-item {
  display: flex; gap: 10px; padding: 8px 8px 8px 0; border-radius: 9px;
  transition: opacity .25s;
}
.dsr-item.ghost { opacity: .22; }
.dsr-item.stone { background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 6%, transparent); }
.dsr-i-rail { width: 3px; border-radius: 3px; flex: none; background: var(--sd-text-dim); }
.dsr-i-rail[data-cat="lifecycle"] { background: var(--tl-cat-lifecycle, var(--tl-core, var(--sd-inc-core))); }
.dsr-i-rail[data-cat="command"] { background: var(--tl-cat-command, var(--tl-hi, var(--sd-inc-hi))); }
.dsr-i-rail[data-cat="comms"] { background: var(--tl-cat-comms, var(--sd-text-muted)); }
.dsr-i-rail[data-cat="sla"] { background: var(--tl-cat-sla, var(--sd-amber)); }
.dsr-i-rail[data-cat="governance"] { background: var(--tl-cat-governance, var(--sd-success)); }
.dsr-i-body { min-width: 0; flex: 1; }
.dsr-i-top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.dsr-i-at { font: 600 9.5px/1 var(--sd-mono, monospace); color: var(--sd-text-dim); white-space: nowrap; }
.dsr-i-kind { font: 650 8px/1 var(--sd-mono, monospace); letter-spacing: 1.6px; text-transform: uppercase; color: var(--sd-text-dim); }
.dsr-i-title { font-size: 12.5px; font-weight: 600; color: var(--sd-text); }
.dsr-i-star { color: var(--tl-hi, var(--sd-inc-hi)); margin-left: 5px; font-size: 10px; }
.dsr-i-int {
  font: 650 8px/1 var(--sd-mono, monospace); letter-spacing: 1.4px; padding: 2px 6px; border-radius: 5px;
  color: var(--sd-amber); border: 1px solid color-mix(in srgb, var(--sd-amber) 40%, transparent);
}
.dsr-i-text { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--sd-text-secondary); white-space: pre-wrap; }
.dsr-i-by { margin-top: 3px; font-size: 10px; color: var(--sd-text-dim); }
.dsr-more {
  border: 1px dashed var(--tl-brd, var(--sd-border-strong)); background: transparent; cursor: pointer;
  color: var(--sd-text-muted); border-radius: 9px; padding: 8px;
  font: 650 9.5px/1 var(--sd-mono, monospace); letter-spacing: 1.4px; margin-bottom: 6px;
}
.dsr-more:hover { color: var(--sd-text); border-color: var(--tl-core, var(--sd-inc-core)); }
.dsr-wait { padding: 20px 6px; font-size: 12px; color: var(--sd-text-dim); text-align: center; }
.dsr-slide-enter-active, .dsr-slide-leave-active { transition: opacity .28s; }
.dsr-slide-enter-active .dsr, .dsr-slide-leave-active .dsr { transition: transform .32s var(--sd-spring); }
.dsr-slide-enter-from, .dsr-slide-leave-to { opacity: 0; }
.dsr-slide-enter-from .dsr, .dsr-slide-leave-to .dsr { transform: translateX(60px); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .dsr-slide-enter-active,
  html:not([data-cinematic="on"]) .dsr-slide-leave-active,
  html:not([data-cinematic="on"]) .dsr-slide-enter-active .dsr,
  html:not([data-cinematic="on"]) .dsr-slide-leave-active .dsr { transition: none; }
  html:not([data-cinematic="on"]) .dsr-item { transition: none; }
}
[data-theme="light"] .dsr-wrap { background: rgba(60, 45, 20, .18); }
[data-theme="light"] .dsr { box-shadow: -30px 0 70px rgba(60, 45, 20, .2); }
</style>
