<template>
  <Teleport to="body">
    <Transition name="pk-pop">
      <div v-if="event" ref="rootEl" class="pk" :style="pos" role="dialog"
           :aria-label="`Incident ${event.ticket_number}`"
           @mousedown.stop @click.stop>
        <!-- header: the event + its incident -->
        <div class="pk-head">
          <SdIncSevBadge :sev="event.sev || 4" />
          <div class="pk-title">
            <div class="pk-num">{{ event.ticket_number }}
              <span v-if="ticket?.is_major_incident" class="pk-mi">MI</span>
              <span class="pk-status">{{ (ticket?.status || event.status || '').replace(/_/g, ' ') }}</span>
            </div>
            <div class="pk-sub">{{ event.subject }}</div>
          </div>
          <button class="pk-x" type="button" aria-label="Close" @click="$emit('close')">✕</button>
        </div>

        <!-- the event line itself -->
        <div class="pk-event">
          <span class="pk-at">{{ stamp(event.at) }}</span>
          <span class="pk-verb">{{ verbOf(event) }}</span>
          <span class="pk-actor">{{ event.actor || 'System' }}</span>
          <button v-if="pinnable" class="pk-pin" type="button"
                  :class="{ on: event.is_milestone }"
                  :title="event.is_milestone ? 'Unpin milestone' : 'Pin as milestone'"
                  @click="$emit(event.is_milestone ? 'unpin' : 'pin', event)">
            ★ {{ event.is_milestone ? 'PINNED' : 'PIN' }}
          </button>
        </div>

        <!-- phase spine (loads with the header) -->
        <div v-if="phases.length" class="pk-phases">
          <span v-for="p in phases" :key="p.key" class="pk-ph" :class="{ hit: p.at }"
                :title="p.at ? `${p.label} · ${stamp(p.at)}` : `${p.label} — not yet`">
            {{ p.label }}
          </span>
        </div>

        <!-- recent record -->
        <div v-if="recent.length" class="pk-recent">
          <div v-for="r in recent" :key="String(r.id)" class="pk-r">
            <span class="pk-r-at">{{ hhmm(r.at) }}</span>
            <span class="pk-r-t">{{ r.title }}</span>
            <span class="pk-r-by">{{ r.actor || 'System' }}</span>
          </div>
        </div>

        <!-- the verb rail (THE permission surface — fail-closed until the header lands) -->
        <div class="pk-rail">
          <SdIncVerbRail v-if="railRow" :row="railRow" :variant="variant" :can-act="canAct"
            @ack="fw('ack', $event)" @update="fw('update', $event)" @playbook="fw('playbook', $event)"
            @roster="fw('roster', $event)" @impact="fw('impact', $event)" @decision="fw('decision', $event)"
            @link="fw('link', $event)" @incident="fw('incident', $event)" @bridge="fw('bridge', $event)"
            @reclassify="fw('reclassify', $event)" @confirm-mi="fw('confirm-mi', $event)"
            @decline-mi="fw('decline-mi', $event)" @assign="fw('assign', $event)"
            @nudge="fw('nudge', $event)" @escalate="fw('escalate', $event)"
            @watchers="fw('watchers', $event)" @sitrep="fw('sitrep', $event)"
            @open="$emit('open', event.ticket_id)" />
          <div v-else class="pk-rail-wait">{{ loading ? 'Sealing the record…' : 'Record unavailable' }}</div>
          <button class="pk-dossier" type="button" @click="$emit('dossier', event.ticket_id)">
            REPLAY THIS INCIDENT →
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/*
  SdIncEventPeek — the anchored intel card a timeline event opens. Fetches the
  merged dossier's ROW-SHAPED ticket header (the honest gate for SdIncVerbRail —
  acknowledged_at / is_major_incident / priority / war_room_url / mi_proposed_at)
  plus phases + the incident's newest record lines. All rail verbs forward as
  ONE `verb` event { kind, payload } so each section wires its own modals.
  Teleported + fixed-positioned from the trigger rect (stacking-context escape),
  with @mousedown.stop so ancestor click-outside directives don't eat it.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import SdIncSevBadge from './SdIncSevBadge.vue'
import SdIncVerbRail from './SdIncVerbRail.vue'
import {
  fetchIncidentStream, fetchIncidentPhases, normalizeIncidentRow,
  fetchMe, fetchCapabilities, useCapabilities, canActOnIncident,
} from '@/composables/useSupportDesk'

const props = defineProps({
  event: { type: Object, default: null },        // timeline event (needs .ticket_id)
  anchor: { type: Object, default: null },       // trigger getBoundingClientRect()
  panel: { type: String, default: 'admin' },
  metaFor: { type: Function, default: null },
})
const emit = defineEmits(['close', 'open', 'dossier', 'pin', 'unpin', 'verb'])

const rootEl = ref(null)
const ticket = ref(null)
const recent = ref([])
const phases = ref([])
const loading = ref(false)

const caps = useCapabilities()
const me = ref(null)

const variant = computed(() => (props.panel === 'admin' ? 'oversight' : 'agent'))
const railRow = computed(() => (ticket.value ? normalizeIncidentRow(ticket.value) : null))
// Honest actor-tier gate off the stream header: owner-tier verbs (agent rail) and
// the pin affordance are withheld unless the viewer can actually act — no more
// showing a button that 403s. Fail-closed until the header + caps/me settle.
const canAct = computed(() => (railRow.value ? canActOnIncident(railRow.value, me.value, caps) : false))
const pinnable = computed(() => {
  const m = props.metaFor?.(props.event?.action)
  return !!m?.milestone && canAct.value
})

const fw = (kind, payload) => emit('verb', { kind, payload })

const PANEL_W = 400
const pos = computed(() => {
  const a = props.anchor
  if (!a) return { left: '50%', top: '20%', transform: 'translateX(-50%)' }
  const left = Math.max(12, Math.min(a.left, window.innerWidth - PANEL_W - 16))
  const below = a.bottom + 10
  const spaceBelow = window.innerHeight - a.bottom
  const top = spaceBelow > 380 ? below : Math.max(12, a.top - 380)
  return { left: `${left}px`, top: `${top}px` }
})

const hhmm = (at) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const stamp = (at) => new Date(at).toLocaleString(undefined,
  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const verbOf = (e) => {
  const m = props.metaFor?.(e.action)
  return m?.verb || m?.label || String(e.action || '').replace(/_/g, ' ')
}

let seq = 0
const hydrate = async () => {
  const id = props.event?.ticket_id
  ticket.value = null; recent.value = []; phases.value = []
  if (!id) return
  const my = ++seq
  loading.value = true
  try {
    const [stream, ph] = await Promise.all([
      fetchIncidentStream(id, { limit: 5 }),
      fetchIncidentPhases(id).catch(() => null),
    ])
    if (my !== seq) return
    ticket.value = stream.ticket || null
    recent.value = (stream.items || []).slice(0, 4)
    phases.value = (ph?.phases || []).filter((p) => ['declared', 'acknowledged', 'first_mitigation', 'resolved'].includes(p.key) || p.at)
  } catch { /* rail stays fail-closed */ }
  finally { if (my === seq) loading.value = false }
}
watch(() => props.event?.id, hydrate, { immediate: true })

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
const onOutside = (e) => { if (rootEl.value && !rootEl.value.contains(e.target)) emit('close') }
onMounted(() => {
  fetchCapabilities()
  fetchMe().then((u) => { me.value = u }).catch(() => {})
  window.addEventListener('keydown', onKey)
  window.addEventListener('mousedown', onOutside, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('mousedown', onOutside, true)
})
</script>

<style scoped>
.pk {
  position: fixed; z-index: 2450; width: 400px; max-width: calc(100vw - 24px);
  border: 1px solid var(--tl-brd, var(--sd-border-strong));
  border-radius: 16px; padding: 14px;
  background: color-mix(in srgb, var(--sd-surface-elevated) 92%, transparent);
  backdrop-filter: blur(22px) saturate(1.15);
  box-shadow: 0 24px 60px rgba(0, 0, 0, .45),
              0 0 0 1px color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 10%, transparent);
  display: flex; flex-direction: column; gap: 10px;
}
.pk-head { display: flex; align-items: flex-start; gap: 10px; }
.pk-title { min-width: 0; flex: 1; }
.pk-num {
  display: flex; align-items: center; gap: 8px;
  font: 700 12px/1 var(--sd-mono, monospace); color: var(--tl-core, var(--sd-inc-core));
}
.pk-mi {
  font-size: 8.5px; letter-spacing: 1.5px; padding: 2px 6px; border-radius: 5px;
  background: color-mix(in srgb, var(--sd-pri-critical) 18%, transparent);
  color: var(--sd-pri-critical); border: 1px solid color-mix(in srgb, var(--sd-pri-critical) 45%, transparent);
}
.pk-status { font: 500 9.5px/1 var(--sd-mono, monospace); letter-spacing: 1.4px; color: var(--sd-text-muted); text-transform: uppercase; }
.pk-sub { margin-top: 5px; font-size: 13px; font-weight: 560; color: var(--sd-text); }
.pk-x {
  flex: none; border: 0; background: transparent; cursor: pointer;
  color: var(--sd-text-dim); font-size: 13px; padding: 2px 6px; border-radius: 6px;
}
.pk-x:hover { color: var(--sd-text); }
.pk-x:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); }
.pk-event {
  display: flex; align-items: center; gap: 9px; padding: 8px 10px;
  border: 1px solid var(--tl-brd, var(--sd-border)); border-radius: 10px;
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 5%, transparent);
  font-size: 12px;
}
.pk-at { font: 600 10px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); white-space: nowrap; }
.pk-verb { font-weight: 650; color: var(--tl-core, var(--sd-inc-core)); }
.pk-actor { color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.pk-pin {
  flex: none; border: 1px solid color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 40%, transparent);
  background: transparent; color: var(--tl-hi, var(--sd-inc-hi)); cursor: pointer;
  border-radius: 999px; padding: 3.5px 10px;
  font: 700 9px/1 var(--sd-mono, monospace); letter-spacing: 1.4px;
  transition: transform .15s var(--sd-spring), background .15s;
}
.pk-pin:hover { transform: scale(1.04); background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 12%, transparent); }
.pk-pin.on { background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 18%, transparent); }
.pk-pin:focus-visible { outline: 2px solid var(--tl-hi, var(--sd-inc-hi)); outline-offset: 2px; }
.pk-phases { display: flex; flex-wrap: wrap; gap: 5px; }
.pk-ph {
  font: 600 8.5px/1 var(--sd-mono, monospace); letter-spacing: 1.2px; text-transform: uppercase;
  padding: 3.5px 8px; border-radius: 999px; color: var(--sd-text-dim);
  border: 1px dashed color-mix(in srgb, var(--sd-text-dim) 40%, transparent);
}
.pk-ph.hit {
  color: var(--tl-live, var(--sd-success)); border-style: solid;
  border-color: color-mix(in srgb, var(--tl-live, var(--sd-success)) 45%, transparent);
  background: color-mix(in srgb, var(--tl-live, var(--sd-success)) 8%, transparent);
}
.pk-recent { display: flex; flex-direction: column; gap: 2px; }
.pk-r {
  display: flex; gap: 8px; align-items: baseline; font-size: 11px; padding: 3px 2px;
  border-bottom: 1px dotted color-mix(in srgb, var(--sd-text-dim) 25%, transparent);
}
.pk-r:last-child { border-bottom: 0; }
.pk-r-at { font: 500 9.5px/1 var(--sd-mono, monospace); color: var(--sd-text-dim); white-space: nowrap; }
.pk-r-t { color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.pk-r-by { color: var(--sd-text-dim); white-space: nowrap; font-size: 10px; }
.pk-rail { display: flex; flex-direction: column; gap: 9px; }
.pk-rail-wait {
  font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: 1.4px;
  color: var(--sd-text-dim); padding: 8px 2px;
}
.pk-dossier {
  align-self: flex-start; border: 0; background: transparent; cursor: pointer;
  color: var(--tl-hi, var(--sd-inc-hi));
  font: 700 10px/1 var(--sd-mono, monospace); letter-spacing: 1.6px;
  padding: 4px 2px; border-radius: 6px;
  transition: transform .15s var(--sd-spring);
}
.pk-dossier:hover { transform: translateX(3px); }
.pk-dossier:focus-visible { outline: 2px solid var(--tl-hi, var(--sd-inc-hi)); outline-offset: 2px; }
.pk-pop-enter-active, .pk-pop-leave-active { transition: opacity .22s, transform .22s var(--sd-spring); }
.pk-pop-enter-from, .pk-pop-leave-to { opacity: 0; transform: translateY(10px) scale(.97); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pk-pop-enter-active,
  html:not([data-cinematic="on"]) .pk-pop-leave-active { transition: none; }
}
[data-theme="light"] .pk { box-shadow: 0 24px 60px rgba(60, 45, 20, .22); }
</style>
