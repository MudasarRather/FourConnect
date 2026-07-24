<template>
  <section class="chr">
    <!-- ═══════════════ masthead ═══════════════ -->
    <Motion as="div" class="chr-mast" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="chr-eyebrow">— COMMAND FUNNEL · ANNUAL REPORT —</div>
      <h1 class="chr-hl">The record of the desk, <em>set in print.</em></h1>
      <p class="chr-sub">Every move on every incident, composed as the desk's annual report —
        chapters by day, milestones as pull-quotes, the KPIs in the margins.</p>
      <div class="chr-mastline">
        <span class="chr-utc"><span class="dot" aria-hidden="true" />{{ utc }} UTC</span>
        <span class="chr-cmp">{{ compareLine }}</span>
      </div>
    </Motion>

    <!-- ═══════════════ THE SPREAD ═══════════════ -->
    <div class="chr-ent" style="--i: 1">
      <SdIncChronSpread ref="spreadRef"
        :days="desk.days.value" :pulse="desk.pulse.value" :stones="desk.stones.value"
        :now="desk.now.value" :arrivals="desk.arrivals.value" :meta-for="desk.metaFor"
        :loading="desk.loading.value" @day="scrollToChapter" />
    </div>

    <!-- index of subjects -->
    <div class="chr-ent" style="--i: 2">
      <SdIncChronFilterDeck :desk="desk" />
    </div>

    <!-- milestone plates + exports -->
    <div class="chr-msrow chr-ent" style="--i: 3">
      <SdIncMilestoneStrip :stones="desk.stones.value" :meta-for="desk.metaFor"
        @focus="onStoneFocus" @unpin="onUnpin" />
      <SdIncTimelineExports :params="desk.params" :show-pdf="true" />
    </div>

    <!-- live ticker -->
    <div class="chr-ent" style="--i: 4">
      <SdIncLiveTicker
        :buffer-count="desk.buffer.value.length"
        :latest="desk.buffer.value[0] || desk.events.value[0] || null"
        :live="desk.live.value" :meta-for="desk.metaFor"
        @flush="desk.flushBuffer" @toggle="desk.live.value = !desk.live.value" />
    </div>

    <!-- chapters -->
    <div class="chr-ent" style="--i: 5">
      <SdIncChronStream :days="desk.days.value" :meta-for="desk.metaFor"
        :arrivals="desk.arrivals.value" :focus-id="desk.focusId.value"
        :loading="desk.loading.value"
        @open="(id) => emit('open', id)" @peek="onPeek" @pin="onPin" @unpin="onUnpin" />
    </div>

    <SdIncPager :page="desk.page.value" :total="desk.total.value" :limit="desk.limit"
      @update:page="(p) => { desk.page.value = p }" />

    <footer class="chr-colophon">
      <div class="chr-scope"><Landmark :size="12" class="seal" /> {{ scopeLabel }}</div>
      <div class="chr-fstats">
        <span>RAISED <b>{{ desk.pulse.value?.flow?.created ?? '—' }}</b></span>
        <span>RESTORED <b>{{ desk.pulse.value?.flow?.resolved ?? '—' }}</b></span>
        <span>WINDOW MTTR <b>{{ mttrLabel }}</b></span>
        <span>MILESTONES <b>{{ desk.stones.value.length }}</b></span>
      </div>
    </footer>

    <!-- ═══════════════ overlays ═══════════════ -->
    <SdIncEventPeek :event="peekEvent" :anchor="peekAnchor" panel="admin" :meta-for="desk.metaFor"
      @close="peekEvent = null" @open="(id) => { peekEvent = null; emit('open', id) }"
      @dossier="openDossier" @pin="onPin" @unpin="onUnpin" @verb="onVerb" />

    <SdIncDossierPanel :ticket-id="dossierId" :open="dossierOpen"
      @close="dossierOpen = false" @open="(id) => { dossierOpen = false; emit('open', id) }" />

    <!-- oversight verb fleet (no ack anywhere — admin acking poisons MTTA) -->
    <SdIncRolesModal :open="modal === 'roster'" :ticket="target" @close="modal = null" @done="() => onVerbDone()" />
    <SdIncReclassifyModal :open="modal === 'reclassify'" :ticket="target" :direction="reclassifyDir"
      @close="modal = null" @done="() => onVerbDone()" />
    <SdMajorIncidentModal :open="modal === 'mi'" :ticket="target" :agent="false"
      @close="modal = null" @done="() => onVerbDone()" />
  </section>
</template>

<script setup>
/*
  SdIncChronicleSection — the ADMIN "Incident Timeline", rebuilt as the
  ANNUAL REPORT (user-picked concept B1): the whole desk's record set as a
  print-grade editorial chronology. Thin orchestrator over useIncidentTimeline;
  oversight verbs live in the peek's rail (variant=oversight, honestly gated) —
  command verbs open the shared modals, people-verbs land on the drawer.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Landmark } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdIncChronSpread from '../components/SdIncChronSpread.vue'
import SdIncChronFilterDeck from '../components/SdIncChronFilterDeck.vue'
import SdIncChronStream from '../components/SdIncChronStream.vue'
import SdIncMilestoneStrip from '../components/SdIncMilestoneStrip.vue'
import SdIncLiveTicker from '../components/SdIncLiveTicker.vue'
import SdIncEventPeek from '../components/SdIncEventPeek.vue'
import SdIncDossierPanel from '../components/SdIncDossierPanel.vue'
import SdIncTimelineExports from '../components/SdIncTimelineExports.vue'
import SdIncPager from '../components/SdIncPager.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncReclassifyModal from '../modals/SdIncReclassifyModal.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import { useIncidentTimeline } from '../composables/useIncidentTimeline'
import { exportSitrepPdf, warRoomHref, useCapabilities, fetchCapabilities } from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new', 'changed'])

const toast = useToast()
const desk = useIncidentTimeline({ panel: props.panel })
const spreadRef = ref(null)

/* Scope honesty: the record is desk-wide only for a superuser; a non-superuser
   admin/lead is still team-sealed by the backend, so don't claim "WHOLE DESK". */
const caps = useCapabilities()
const scopeLabel = computed(() => (!caps.checked
  ? 'THE RECORD OF REVIEW'
  : (caps.isAdmin ? 'WHOLE DESK · ALL TEAMS · THE RECORD OF REVIEW'
                  : 'YOUR TEAMS · THE RECORD OF REVIEW')))

/* ── masthead readouts ── */
const utc = computed(() => {
  void desk.now.value
  return new Date().toISOString().slice(11, 19)
})
const minsLabel = (m) => {
  if (m == null) return '—'
  return m >= 90 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`
}
const mttrLabel = computed(() => minsLabel(desk.pulse.value?.mttr_minutes))
const compareLine = computed(() => {
  const p = desk.pulse.value
  if (!p) return 'ASSEMBLING THE WINDOW…'
  const flow = p.flow || {}
  const net = (flow.created ?? 0) - (flow.resolved ?? 0)
  const posture = net > 0 ? `DESK RUNNING ${net} BEHIND` : (net < 0 ? `DESK ${-net} AHEAD` : 'DESK AT BALANCE')
  return `THIS WINDOW · ${p.total_events ?? 0} ENTRIES · ${posture} · MTTA ${minsLabel(p.mtta_minutes)}`
})

const scrollToChapter = (dayKey) => {
  document.getElementById(`chapter-${dayKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ── peek / dossier ── */
const peekEvent = ref(null)
const peekAnchor = ref(null)
const dossierId = ref(null)
const dossierOpen = ref(false)
const onPeek = (event, rect) => { peekEvent.value = event; peekAnchor.value = rect || null }
const openDossier = (ticketId) => { peekEvent.value = null; dossierId.value = ticketId; dossierOpen.value = true }
const onStoneFocus = (stone) => { desk.setFocus(stone.ticket_id); openDossier(stone.ticket_id) }

/* ── milestone pins ── */
const onPin = async (event) => {
  try {
    await desk.pin(event.id)
    toast.success('Pinned to the record')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not pin this entry') }
}
const onUnpin = async (event) => {
  try {
    await desk.unpin(event.id)
    toast.success('Unpinned from the record')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not unpin') }
}

/* ── oversight verbs (peek rail → shared modals; people-verbs → the drawer) ── */
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
const onVerb = ({ kind, payload }) => {
  const row = payload?.row || payload
  if (!row) return undefined
  if (kind === 'roster') return openModal('roster', row)
  if (kind === 'reclassify') { reclassifyDir.value = payload.direction || 'promote'; return openModal('reclassify', row) }
  if (kind === 'confirm-mi' || kind === 'decline-mi' || kind === 'incident') return openModal('mi', row)
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
  // assign / nudge / watchers / escalate / everything else → the drawer, the deep surface
  peekEvent.value = null
  return emit('open', row.id)
}

/* ── choreography ── */
watch([peekEvent, dossierOpen, modal], ([p, d, m]) => {
  desk.uiHold.value = !!(p || d || m)
})
let flashTimer = null
watch(() => desk.arrivals.value.count, (n, old) => {
  if (n > (old || 0)) {
    spreadRef.value?.flashArrivals?.()
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { desk.arrivals.value = { count: 0, ids: [] } }, 3000)
  }
})

onMounted(() => { desk.start(); fetchCapabilities() })
onBeforeUnmount(() => { desk.stop(); clearTimeout(flashTimer) })
</script>

<style scoped>
.chr {
  /* the Annual Report's local identity — every child reads these */
  --tl-core: var(--sd-fun-core); --tl-hi: var(--sd-fun-core); --tl-live: var(--sd-fun-resolved);
  --tl-arc: var(--sd-fun-esc); --tl-warn: var(--sd-amber); --tl-brd: var(--sd-fun-brd);
  --tl-cat-lifecycle: var(--sd-fun-core); --tl-cat-command: var(--sd-fun-stream);
  --tl-cat-comms: var(--sd-fun-auto); --tl-cat-sla: var(--sd-amber);
  --tl-cat-governance: var(--sd-fun-resolved); --tl-cat-system: var(--sd-text-dim);
  display: flex; flex-direction: column; gap: 16px; padding-bottom: 28px;
}
.chr-ent { animation: chr-in .5s cubic-bezier(.16, 1, .3, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes chr-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ── masthead ── */
.chr-mast { padding-top: 8px; }
.chr-eyebrow {
  display: flex; align-items: center; gap: 16px;
  font-size: 10px; letter-spacing: .34em; font-weight: 800;
  color: var(--tl-core); text-transform: uppercase; white-space: nowrap;
}
.chr-eyebrow::before, .chr-eyebrow::after { content: ''; height: 1px; background: var(--sd-border-strong); flex: 1; }
.chr-hl {
  margin: 20px 0 0; text-align: center;
  font-size: clamp(32px, 4.4vw, 54px); font-weight: 200; letter-spacing: -.015em; line-height: 1.08;
  color: var(--sd-text);
}
.chr-hl em { font-style: normal; font-weight: 800; color: var(--tl-core); }
.chr-sub { margin: 12px 0 0; text-align: center; color: var(--sd-text-muted); font-size: 13.5px; letter-spacing: .02em; font-weight: 300; }
.chr-mastline {
  margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 26px; flex-wrap: wrap;
}
.chr-utc {
  display: inline-flex; align-items: center; gap: 8px;
  font: 600 10.5px/1 var(--sd-mono, monospace); letter-spacing: .12em; color: var(--sd-text-secondary);
}
.chr-utc .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tl-live); }
.chr-cmp { font-size: 9.5px; letter-spacing: .22em; font-weight: 800; color: var(--sd-text-dim); }

.chr-msrow { display: flex; align-items: center; gap: 12px; }
.chr-msrow > :first-child { flex: 1; min-width: 0; }

/* ── colophon ── */
.chr-colophon {
  margin-top: 10px; border-top: 1px solid var(--sd-border-strong); padding-top: 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
}
.chr-scope {
  display: flex; align-items: center; gap: 10px;
  font-size: 9.5px; letter-spacing: .22em; font-weight: 800;
  color: var(--sd-text-dim); text-transform: uppercase;
}
.chr-scope .seal { color: var(--tl-core); }
.chr-fstats { display: flex; gap: 22px; font-size: 10px; letter-spacing: .12em; font-weight: 700; color: var(--sd-text-muted); text-transform: uppercase; }
.chr-fstats b { color: var(--sd-text-secondary); font-weight: 800; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .chr-ent { animation: none; }
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .chr-cmp { color: #6b5840; }
</style>
