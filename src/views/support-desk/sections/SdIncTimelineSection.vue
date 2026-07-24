<template>
  <section class="its">
    <!-- ═══════════════ hero — the service masthead ═══════════════ -->
    <Motion as="div" class="its-hero" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="its-eyebrow">— FAULT GRID · SERVICE DIAGRAM —</div>
      <h1 class="its-hl">Every fault runs a <em>line.</em></h1>
      <p class="its-sub">Your incidents drawn as live service routes — every event a station,
        every milestone an interchange. Ride the day the desk lived it.</p>

      <div class="its-stats">
        <div class="its-stat"><div class="k">Today's Events</div><div class="v">{{ todayCount }}</div></div>
        <div class="its-stat live"><div class="k">Lines In Service</div><div class="v">{{ liveLines }}</div></div>
        <div class="its-stat"><div class="k">MTTA</div><div class="v">{{ mttaLabel }}</div></div>
        <div class="its-stat"><div class="k">MTTR</div><div class="v">{{ mttrLabel }}</div></div>
        <div class="its-stat"><div class="k">Milestones</div><div class="v">{{ desk.stones.value.length }}</div></div>
        <div class="its-stat clock"><div class="k">UTC</div><div class="v">{{ utc }}</div></div>
      </div>
    </Motion>

    <!-- ═══════════════ THE SERVICE DIAGRAM ═══════════════ -->
    <div class="its-ent" style="--i: 1">
      <SdIncTlServiceMap ref="mapRef"
        :events="desk.events.value" :pulse="desk.pulse.value" :stones="desk.stones.value"
        :now="desk.now.value" :arrivals="desk.arrivals.value" :meta-for="desk.metaFor"
        :loading="desk.loading.value"
        @station="onPeek" @open="(id) => emit('open', id)" />
    </div>

    <!-- filter surface -->
    <div class="its-ent" style="--i: 2">
      <SdIncTlFilterDeck :desk="desk" />
    </div>

    <!-- milestone strip + exports -->
    <div class="its-msrow its-ent" style="--i: 3">
      <SdIncMilestoneStrip :stones="desk.stones.value" :meta-for="desk.metaFor"
        @focus="onStoneFocus" @unpin="onUnpin" />
      <SdIncTimelineExports :params="desk.params" :show-pdf="false" />
    </div>

    <!-- live ticker -->
    <div class="its-ent" style="--i: 4">
      <SdIncLiveTicker
        :buffer-count="desk.buffer.value.length"
        :latest="desk.buffer.value[0] || desk.events.value[0] || null"
        :live="desk.live.value" :meta-for="desk.metaFor"
        @flush="desk.flushBuffer" @toggle="desk.live.value = !desk.live.value" />
    </div>

    <!-- departures board -->
    <div class="its-ent" style="--i: 5">
      <SdIncTlStream :days="desk.days.value" :meta-for="desk.metaFor"
        :arrivals="desk.arrivals.value" :focus-id="desk.focusId.value"
        :loading="desk.loading.value"
        @open="(id) => emit('open', id)" @peek="onPeek" @pin="onPin" @unpin="onUnpin" />
    </div>

    <SdIncPager :page="desk.page.value" :total="desk.total.value" :limit="desk.limit"
      @update:page="(p) => { desk.page.value = p }" />

    <footer class="its-foot">
      <div class="its-scope"><ShieldCheck :size="12" class="lock" /> SEALED TO YOUR TEAMS</div>
      <div class="its-fstats">
        <span>NEW <b>{{ desk.pulse.value?.flow?.created ?? '—' }}</b></span>
        <span>RESOLVED <b>{{ desk.pulse.value?.flow?.resolved ?? '—' }}</b></span>
        <span>WINDOW MTTR <b>{{ mttrLabel }}</b></span>
      </div>
    </footer>

    <!-- ═══════════════ overlays ═══════════════ -->
    <SdIncEventPeek :event="peekEvent" :anchor="peekAnchor" :panel="props.panel" :meta-for="desk.metaFor"
      @close="peekEvent = null" @open="(id) => { peekEvent = null; emit('open', id) }"
      @dossier="openDossier" @pin="onPin" @unpin="onUnpin" @verb="onVerb" />

    <SdIncDossierPanel :ticket-id="dossierId" :open="dossierOpen"
      @close="dossierOpen = false" @open="(id) => { dossierOpen = false; emit('open', id) }" />

    <!-- incident-command verb fleet (same modals as the Critical desk) -->
    <SdIncUpdateModal :open="modal === 'update'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncRolesModal :open="modal === 'roster'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncDecisionModal :open="modal === 'decision'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncImpactModal :open="modal === 'impact'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncLinkModal :open="modal === 'link'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncReclassifyModal :open="modal === 'reclassify'" :ticket="target" :direction="reclassifyDir"
      @close="modal = null" @done="() => onVerbDone()" />
    <SdMajorIncidentModal :open="modal === 'declare'" :ticket="target" :agent="props.panel !== 'admin'"
      @close="modal = null" @done="() => onVerbDone()" />
  </section>
</template>

<script setup>
/*
  SdIncTimelineSection — the AGENT "Incident Timeline", rebuilt as the
  SERVICE DIAGRAM (user-picked concept A3): a live transit map over the sealed
  cross-incident feed. Thin orchestrator over useIncidentTimeline — the spine
  owns filters/polling/live-buffer/milestones/deep-links; this file owns the
  composition, the verb fleet, and the A3 masthead.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { ShieldCheck } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdIncTlServiceMap from '../components/SdIncTlServiceMap.vue'
import SdIncTlFilterDeck from '../components/SdIncTlFilterDeck.vue'
import SdIncTlStream from '../components/SdIncTlStream.vue'
import SdIncMilestoneStrip from '../components/SdIncMilestoneStrip.vue'
import SdIncLiveTicker from '../components/SdIncLiveTicker.vue'
import SdIncEventPeek from '../components/SdIncEventPeek.vue'
import SdIncDossierPanel from '../components/SdIncDossierPanel.vue'
import SdIncTimelineExports from '../components/SdIncTimelineExports.vue'
import SdIncPager from '../components/SdIncPager.vue'
import SdIncUpdateModal from '../modals/SdIncUpdateModal.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncDecisionModal from '../modals/SdIncDecisionModal.vue'
import SdIncImpactModal from '../modals/SdIncImpactModal.vue'
import SdIncLinkModal from '../modals/SdIncLinkModal.vue'
import SdIncReclassifyModal from '../modals/SdIncReclassifyModal.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import { useIncidentTimeline } from '../composables/useIncidentTimeline'
import { ackTicket, exportSitrepPdf, warRoomHref } from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new', 'changed'])

const toast = useToast()
const desk = useIncidentTimeline({ panel: props.panel })
const mapRef = ref(null)

/* ── masthead readouts ── */
const TERMINAL_SET = new Set(['resolved', 'closed', 'archived', 'merged'])
const utc = computed(() => {
  void desk.now.value
  return new Date().toISOString().slice(11, 19)
})
const todayKey = () => {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const todayCount = computed(() => {
  const bucket = desk.days.value.find((d) => String(d.day) === todayKey())
  return bucket ? bucket.events.length : 0
})
const liveLines = computed(() => {
  const live = new Set()
  for (const e of desk.events.value) {
    if (!TERMINAL_SET.has(String(e.status || ''))) live.add(String(e.ticket_id))
  }
  return live.size
})
const minsLabel = (m) => {
  if (m == null) return '—'
  return m >= 90 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`
}
const mttaLabel = computed(() => minsLabel(desk.pulse.value?.mtta_minutes))
const mttrLabel = computed(() => minsLabel(desk.pulse.value?.mttr_minutes))

/* ── peek / dossier ── */
const peekEvent = ref(null)
const peekAnchor = ref(null)
const dossierId = ref(null)
const dossierOpen = ref(false)
const onPeek = (event, rect) => { peekEvent.value = event; peekAnchor.value = rect || null }
const openDossier = (ticketId) => { peekEvent.value = null; dossierId.value = ticketId; dossierOpen.value = true }
const onStoneFocus = (stone) => { desk.setFocus(stone.ticket_id); openDossier(stone.ticket_id) }

/* ── milestone pins (spine is optimistic; we surface the backend's verdict) ── */
const onPin = async (event) => {
  try {
    await desk.pin(event.id)
    toast.success('Milestone pinned to the route')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not pin this beat') }
}
const onUnpin = async (event) => {
  try {
    await desk.unpin(event.id)
    toast.success('Milestone unpinned')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not unpin') }
}

/* ── the verb fleet (peek rail → the Critical desk's modals) ── */
const modal = ref(null)
const target = ref(null)
const reclassifyDir = ref('promote')
const openModal = (kind, row) => { target.value = row; modal.value = kind }
const onVerbDone = () => {
  modal.value = null
  desk.refresh()
  desk.refreshStones()
  emit('changed')
}
const onAck = async (row) => {
  const before = row.acknowledged_at
  row.acknowledged_at = new Date().toISOString()
  try {
    await ackTicket(row.id)
    toast.success(`${row.ticket_number} acknowledged — MTTA clock stopped`)
    desk.refresh()
    emit('changed')
  } catch (e) {
    row.acknowledged_at = before
    toast.error(e?.response?.data?.detail || 'Could not acknowledge')
  }
}
const onVerb = ({ kind, payload }) => {
  const row = payload?.row || payload
  if (!row) return undefined
  if (kind === 'ack') return onAck(row)
  if (kind === 'reclassify') { reclassifyDir.value = payload.direction || 'promote'; return openModal('reclassify', row) }
  if (kind === 'incident') return openModal('declare', row)
  if (kind === 'bridge') {
    const href = warRoomHref(row.war_room_url, props.panel)
    if (href) window.open(href, '_blank', 'noopener')
    return undefined
  }
  if (kind === 'sitrep') {
    return exportSitrepPdf(row.id).then((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `sitrep-${row.ticket_number}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Sitrep exported')
    }).catch(() => toast.error('Sitrep export failed'))
  }
  if (['update', 'roster', 'decision', 'impact', 'link'].includes(kind)) return openModal(kind, row)
  // everything else (playbook, assign, watchers, escalate…) → the drawer, the deep surface
  peekEvent.value = null
  return emit('open', row.id)
}

/* ── choreography: overlays hold the poll; arrivals flash the map ── */
watch([peekEvent, dossierOpen, modal], ([p, d, m]) => {
  desk.uiHold.value = !!(p || d || m)
})
let flashTimer = null
watch(() => desk.arrivals.value.count, (n, old) => {
  if (n > (old || 0)) {
    mapRef.value?.flashArrivals?.()
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { desk.arrivals.value = { count: 0, ids: [] } }, 3000)
  }
})

onMounted(desk.start)
onBeforeUnmount(() => { desk.stop(); clearTimeout(flashTimer) })
</script>

<style scoped>
.its {
  /* the Service Diagram's local identity — every child reads these */
  --tl-core: var(--sd-inc-core); --tl-hi: var(--sd-inc-hi); --tl-live: var(--sd-inc-live);
  --tl-arc: var(--sd-inc-arc); --tl-warn: var(--sd-inc-warn); --tl-brd: var(--sd-inc-brd);
  --tl-cat-lifecycle: var(--sd-inc-core); --tl-cat-command: var(--sd-inc-hi);
  --tl-cat-comms: #8b93a1; --tl-cat-sla: var(--sd-inc-warn);
  --tl-cat-governance: var(--sd-inc-live); --tl-cat-system: var(--sd-text-dim);
  display: flex; flex-direction: column; gap: 14px; padding-bottom: 26px;
}
.its-ent { animation: its-in .5s cubic-bezier(.16, 1, .3, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes its-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ── hero ── */
.its-hero { padding-top: 8px; }
.its-eyebrow {
  display: flex; align-items: center; gap: 16px;
  font: 500 10.5px/1 var(--sd-mono, monospace); letter-spacing: .34em;
  color: var(--tl-core); text-transform: uppercase; white-space: nowrap;
}
.its-eyebrow::before, .its-eyebrow::after { content: ''; height: 1px; background: var(--sd-border-strong); flex: 1; }
.its-hl {
  margin: 18px 0 0; text-align: center;
  font-size: clamp(34px, 4.6vw, 56px); font-weight: 250; letter-spacing: -.015em; line-height: 1.06;
  color: var(--sd-text);
}
.its-hl em {
  font-style: normal; font-weight: 420;
  background: linear-gradient(92deg, var(--tl-core), var(--tl-hi));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.its-sub { margin: 12px 0 0; text-align: center; color: var(--sd-text-muted); font-size: 13.5px; letter-spacing: .02em; }
.its-stats {
  margin-top: 22px; display: flex; align-items: stretch;
  border: 1px solid var(--tl-brd, var(--sd-border));
  background: color-mix(in srgb, var(--sd-surface) 88%, transparent); backdrop-filter: blur(10px);
}
.its-stat { flex: 1; padding: 13px 10px 12px; text-align: center; border-right: 1px solid var(--tl-brd, var(--sd-border)); transition: background .2s; }
.its-stat:last-child { border-right: none; }
.its-stat:hover { background: color-mix(in srgb, var(--tl-core) 7%, transparent); }
.its-stat .k { font: 500 9.5px/1 var(--sd-mono, monospace); letter-spacing: .22em; color: var(--sd-text-muted); text-transform: uppercase; }
.its-stat .v { margin-top: 6px; font: 600 21px/1 var(--sd-mono, monospace); font-variant-numeric: tabular-nums; color: var(--sd-text); }
.its-stat.live .v { color: var(--tl-core); }
.its-stat.clock .v { font-size: 17px; letter-spacing: .04em; padding-top: 3px; color: var(--sd-text-secondary); }

.its-msrow { display: flex; align-items: center; gap: 12px; }
.its-msrow > :first-child { flex: 1; min-width: 0; }

/* ── footer ── */
.its-foot {
  margin-top: 8px; border-top: 1px solid var(--tl-brd, var(--sd-border)); padding-top: 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
}
.its-scope {
  display: flex; align-items: center; gap: 10px;
  font: 500 9.5px/1 var(--sd-mono, monospace); letter-spacing: .22em;
  color: var(--sd-text-dim); text-transform: uppercase;
}
.its-scope .lock { color: var(--tl-core); }
.its-fstats { display: flex; gap: 22px; font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .12em; color: var(--sd-text-muted); text-transform: uppercase; }
.its-fstats b { color: var(--sd-text-secondary); font-weight: 600; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .its-ent { animation: none; }
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .its { --tl-cat-comms: #6b5840; }
</style>
