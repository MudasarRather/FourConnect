<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open && t" class="wrc-root" @mousedown.stop @click.stop>
        <Motion class="wrc-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
          :transition="{ duration: 0.25 }" @click="$emit('close')" />
        <Motion class="wrc" :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 60, opacity: 0 }"
          :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">

          <!-- ── header ── -->
          <header class="wrc-head">
            <div class="wrc-h-lead">
              <span class="wrc-h-siren" :class="{ live: t.is_major_incident }"><Siren :size="16" /></span>
              <div class="wrc-h-body">
                <span class="wrc-h-eyebrow sd-mono">{{ t.is_major_incident ? 'MAJOR INCIDENT · WAR ROOM' : 'CRITICAL · WAR ROOM' }}</span>
                <h3 class="wrc-h-title">{{ t.ticket_number }} — {{ t.subject }}</h3>
                <div class="wrc-h-meta">
                  <SdPill kind="priority" :value="t.priority" />
                  <SdPill kind="status" :value="t.status" />
                  <span v-if="t.acknowledged_at" class="wrc-ackd"><ShieldCheck :size="11" /> ACK · {{ t.acknowledged_by_name || 'responder' }}</span>
                  <button v-else-if="canAct && !isTerminal" class="wrc-ack-btn" :disabled="busy.ack" @click="doAck">
                    <ShieldCheck :size="11" /> Acknowledge
                  </button>
                </div>
              </div>
            </div>
            <div class="wrc-h-tools">
              <!-- live presence (agent collision) -->
              <div v-if="others.length" class="wrc-presence" :title="`Also here: ${others.map(v => v.name).join(', ')}`">
                <span v-for="v in others.slice(0, 3)" :key="v.user_id" class="wrc-viewer">{{ initials(v.name) }}</span>
                <span class="wrc-p-lb sd-mono">{{ others.length }} ALSO HERE</span>
              </div>
              <button class="wrc-tool" title="Open full ticket" @click="$emit('open-ticket', t.id)"><PanelRightOpen :size="15" /></button>
              <button class="wrc-tool" title="Close" @click="$emit('close')"><X :size="16" /></button>
            </div>
          </header>

          <div v-if="others.length" class="wrc-collision">
            <TriangleAlert :size="12" /> {{ others.map(v => v.name || 'An agent').join(', ') }} {{ others.length === 1 ? 'is' : 'are' }} viewing this incident right now — coordinate before you edit.
          </div>

          <div class="wrc-scroll">
            <!-- ══ impact triage ══ -->
            <Motion as="section" class="wrc-panel" v-bind="pT(0)">
              <h4 class="wrc-p-title"><Activity :size="13" /> Impact assessment</h4>
              <div class="wrc-imp-grid">
                <div class="wrc-field">
                  <label>Business impact</label>
                  <div class="wrc-seg">
                    <button v-for="b in BUSINESS_IMPACTS" :key="b.value" class="wrc-seg-btn" :class="{ on: draft.business_impact === b.value }"
                      :disabled="!canAct" @click="draft.business_impact = draft.business_impact === b.value ? '' : b.value">{{ b.label }}</button>
                  </div>
                </div>
                <div class="wrc-row">
                  <div class="wrc-field">
                    <label>Affected users</label>
                    <input v-model.number="draft.affected_users" type="number" min="0" class="wrc-input" :disabled="!canAct" placeholder="—" />
                  </div>
                  <div class="wrc-field grow">
                    <label>Revenue exposure</label>
                    <input v-model="draft.revenue_impact" type="text" class="wrc-input" maxlength="160" :disabled="!canAct" placeholder="—" />
                  </div>
                </div>
                <div class="wrc-field">
                  <label>War-room link</label>
                  <div class="wrc-url">
                    <Link2 :size="13" />
                    <input v-model="draft.war_room_url" type="url" class="wrc-input bare" maxlength="400" :disabled="!canAct" placeholder="https://meet…  ·  #incident-channel" />
                    <a v-if="t.war_room_url" class="wrc-join" :href="t.war_room_url" target="_blank" rel="noopener">Join <ExternalLink :size="11" /></a>
                  </div>
                </div>
                <div v-if="canAct && impactDirty" class="wrc-save-row">
                  <button class="wrc-btn primary sm" :disabled="busy.impact" @click="saveImpact">
                    <Loader v-if="busy.impact" :size="12" class="wrc-spin" /><Check v-else :size="12" /> Save assessment
                  </button>
                </div>
              </div>
            </Motion>

            <!-- ══ stakeholder update cadence + composer ══ -->
            <Motion as="section" class="wrc-panel" v-bind="pT(1)">
              <h4 class="wrc-p-title">
                <BellRing :size="13" /> Stakeholder updates
                <span v-if="cadenceArmed" class="wrc-cadence" :class="{ over: updateOverdue }">
                  <Timer :size="11" /> {{ updateOverdue ? `${cadenceLabel} OVERDUE` : `next in ${cadenceLabel}` }}
                </span>
              </h4>

              <template v-if="canAct && !isTerminal">
                <div class="wrc-templates">
                  <button v-for="tpl in CRITICAL_UPDATE_TEMPLATES" :key="tpl.key" class="wrc-tpl" :class="[tpl.phase, { on: pickedTpl === tpl.key }]"
                    @click="applyTemplate(tpl)">{{ tpl.label }}</button>
                </div>
                <textarea v-model="updateBody" class="wrc-composer" rows="3"
                  placeholder="Post a status update — stakeholders read this verbatim…" />
                <div class="wrc-compose-bar">
                  <button class="wrc-vis" :class="{ pub: !updateInternal }" @click="updateInternal = !updateInternal"
                    :title="updateInternal ? 'Internal work note — the requester will not see it' : 'Public reply — notifies the requester'">
                    <component :is="updateInternal ? Lock : Megaphone" :size="12" />
                    {{ updateInternal ? 'Internal' : 'Public' }}
                  </button>
                  <SdSelect v-model="cadencePick" :options="cadenceOptions" class="wrc-cad-select" />
                  <span class="wrc-spacer" />
                  <button v-if="cadenceArmed" class="wrc-btn ghost sm" :disabled="busy.update" @click="stopCadence">
                    <BellOff :size="12" /> Stop cadence
                  </button>
                  <Motion as="button" class="wrc-btn primary sm" :disabled="!updateBody.trim() || busy.update"
                    :while-hover="{ y: -1 }" :while-tap="{ scale: 0.97 }" @click="postUpdate">
                    <Loader v-if="busy.update" :size="12" class="wrc-spin" /><Send v-else :size="12" /> Post update
                  </Motion>
                </div>
              </template>
              <p v-else-if="isTerminal" class="wrc-quiet">Incident closed — the update cadence is retired. Capture the story below.</p>
              <p v-else class="wrc-quiet">Only support agents post stakeholder updates.</p>

              <div v-if="t.last_status_update_at" class="wrc-last sd-mono">
                LAST UPDATE {{ ago(t.last_status_update_at) }} AGO
                <template v-if="t.update_interval_minutes"> · CADENCE EVERY {{ t.update_interval_minutes }}M</template>
              </div>
            </Motion>

            <!-- ══ responders ══ -->
            <Motion as="section" class="wrc-panel" v-bind="pT(2)">
              <h4 class="wrc-p-title"><Users :size="13" /> Responders</h4>
              <div class="wrc-responders">
                <span class="wrc-resp" :class="{ none: !t.assigned_agent_name }">
                  <i class="wrc-resp-dot lead">{{ initials(t.assigned_agent_name) }}</i>
                  <span class="wrc-resp-body"><b>{{ t.assigned_agent_name || 'No owner' }}</b><small>Incident owner</small></span>
                </span>
                <span v-for="p in t.collaborator_people || []" :key="p.id" class="wrc-resp">
                  <i class="wrc-resp-dot">{{ initials(p.name) }}</i>
                  <span class="wrc-resp-body"><b>{{ p.name }}</b><small>Responder</small></span>
                </span>
                <button v-if="agent" class="wrc-resp add" title="Manage responders on the full ticket" @click="$emit('open-ticket', t.id)">
                  <UserPlus :size="13" /> Manage
                </button>
              </div>
            </Motion>

            <!-- ══ mission clock ══ -->
            <Motion as="section" class="wrc-panel" v-bind="pT(3)">
              <h4 class="wrc-p-title"><Timer :size="13" /> Mission clock</h4>
              <div class="wrc-clock">
                <span class="wrc-ck"><i>AGE</i><b>{{ ago(t.created_at) }}</b></span>
                <span class="wrc-ck" :class="{ warn: !t.acknowledged_at && !isTerminal }"><i>TO ACK</i><b>{{ ackClock }}</b></span>
                <span class="wrc-ck" :class="slaTone"><i>RESOLUTION SLA</i><b>{{ slaClock }}</b></span>
                <span v-if="t.sla_paused_since" class="wrc-ck"><i>CLOCK</i><b>PAUSED</b></span>
              </div>
            </Motion>

            <!-- ══ post-incident review (terminal) ══ -->
            <Motion v-if="isTerminal" as="section" class="wrc-panel pir" v-bind="pT(4)">
              <h4 class="wrc-p-title"><FileWarning :size="13" /> Post-incident review
                <span v-if="!hasRca" class="wrc-rca-gap sd-mono">RCA MISSING</span>
              </h4>
              <template v-if="canAct">
                <div class="wrc-field"><label>What happened (root cause)</label>
                  <textarea v-model="rca.rca_summary" class="wrc-composer" rows="2" placeholder="Root cause of the incident…" /></div>
                <div class="wrc-field"><label>Corrective action</label>
                  <textarea v-model="rca.rca_corrective" class="wrc-composer" rows="2" placeholder="What fixed it…" /></div>
                <div class="wrc-field"><label>Preventive action</label>
                  <textarea v-model="rca.rca_preventive" class="wrc-composer" rows="2" placeholder="What stops it recurring…" /></div>
                <div class="wrc-save-row">
                  <button class="wrc-btn primary sm" :disabled="busy.rca || !rcaDirty" @click="saveRca">
                    <Loader v-if="busy.rca" :size="12" class="wrc-spin" /><Check v-else :size="12" /> Save review
                  </button>
                </div>
              </template>
              <p v-else-if="hasRca" class="wrc-quiet">{{ t.rca_summary }}</p>
              <p v-else class="wrc-quiet">No root-cause record yet.</p>
            </Motion>

            <!-- ══ command actions ── -->
            <div class="wrc-cmds">
              <button v-if="canAct" class="wrc-btn danger" @click="$emit('declare', t)">
                <Siren :size="13" /> {{ t.is_major_incident ? 'Incident settings' : 'Declare major incident' }}
              </button>
              <button class="wrc-btn ghost" @click="$emit('open-ticket', t.id)"><PanelRightOpen :size="13" /> Full ticket &amp; conversation</button>
            </div>
          </div>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdWarRoomConsole — the major-incident command console (teleported side drawer).
   Impact assessment · stakeholder update composer (comm templates + cadence timer) ·
   responders · mission clock · post-incident review. Complements SdTicketDrawer
   (conversation lives there); presence viewers ride in from the section heartbeat. */
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Siren, ShieldCheck, X, PanelRightOpen, TriangleAlert, Activity, Link2, ExternalLink,
  BellRing, BellOff, Timer, Users, UserPlus, FileWarning, Check, Loader, Send, Lock, Megaphone,
} from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  updateTicket, ackTicket, postStatusUpdate, setTicketRca,
  useCapabilities, fetchCapabilities,
  BUSINESS_IMPACTS, CRITICAL_UPDATE_TEMPLATES, UPDATE_CADENCE_OPTIONS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: false },
  me: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  viewers: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'changed', 'open-ticket', 'declare'])
const toast = useToast()

const t = computed(() => props.ticket)
const isTerminal = computed(() => ['resolved', 'closed'].includes(t.value?.status))
/* Owner-tier — the backend actor-gates ack / status-update / RCA / incident settings
   (assignee ∪ collaborator ∪ team lead ∪ admin; unassigned = claim-eligible). On the
   mine-scoped Critical desk this is true by construction; it matters if the console
   is ever opened from a team-visible surface. */
const caps = useCapabilities()
watch(() => props.open, (v) => { if (v) fetchCapabilities().catch(() => {}) })
const canAct = computed(() => {
  const tk = t.value
  if (!props.agent || !tk) return false
  if (caps.isAdmin) return true
  const my = String(props.me?.id || '')
  if (!tk.assigned_agent_id || String(tk.assigned_agent_id) === my) return true
  if ((tk.collaborators || []).map(String).includes(my)) return true
  return (caps.leadTeamIds || []).map(String).includes(String(tk.team_id))
})
const others = computed(() => (props.viewers || []).filter(v => !v.is_me))
const initials = (n) => (n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—')
const busy = reactive({ ack: false, impact: false, update: false, rca: false })

/* impact draft */
const draft = reactive({ business_impact: '', affected_users: null, revenue_impact: '', war_room_url: '' })
const syncDraft = () => {
  draft.business_impact = t.value?.business_impact || ''
  draft.affected_users = t.value?.affected_users ?? null
  draft.revenue_impact = t.value?.revenue_impact || ''
  draft.war_room_url = t.value?.war_room_url || ''
}
watch(() => [props.open, t.value?.id], () => { if (props.open) { syncDraft(); syncRca() } }, { immediate: true })
const impactDirty = computed(() => t.value && (
  draft.business_impact !== (t.value.business_impact || '') ||
  (draft.affected_users ?? null) !== (t.value.affected_users ?? null) ||
  draft.revenue_impact !== (t.value.revenue_impact || '') ||
  draft.war_room_url !== (t.value.war_room_url || '')))
const saveImpact = async () => {
  if (busy.impact || !t.value) return
  busy.impact = true
  try {
    const u = await updateTicket(t.value.id, {
      business_impact: draft.business_impact || null,
      affected_users: Number.isFinite(draft.affected_users) ? draft.affected_users : null,
      revenue_impact: draft.revenue_impact || null,
      war_room_url: draft.war_room_url || null,
    })
    toast.success('Impact assessment saved')
    emit('changed', u)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save') } finally { busy.impact = false }
}

/* ack */
const doAck = async () => {
  if (busy.ack || !t.value) return
  busy.ack = true
  try { const u = await ackTicket(t.value.id); toast.success('Acknowledged — you own eyes on this'); emit('changed', u) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') } finally { busy.ack = false }
}

/* cadence + composer */
const updateBody = ref('')
const updateInternal = ref(false)
const pickedTpl = ref('')
const cadencePick = ref('keep')
const cadenceOptions = computed(() => [
  { value: 'keep', label: t.value?.update_interval_minutes ? `Keep · every ${t.value.update_interval_minutes}m` : 'No cadence' },
  ...UPDATE_CADENCE_OPTIONS.map(o => ({ value: String(o.value), label: o.label })),
])
const applyTemplate = (tpl) => { pickedTpl.value = tpl.key; updateBody.value = tpl.text; updateInternal.value = tpl.phase === 'start' ? false : updateInternal.value }
const cadenceArmed = computed(() => !!t.value?.next_update_due_at && !isTerminal.value)
const updateDueMs = computed(() => (t.value?.next_update_due_at ? new Date(t.value.next_update_due_at).getTime() - props.now : null))
const updateOverdue = computed(() => cadenceArmed.value && updateDueMs.value != null && updateDueMs.value < 0)
const cadenceLabel = computed(() => {
  if (updateDueMs.value == null) return ''
  const m = Math.floor(Math.abs(updateDueMs.value) / 60000)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
})
const postUpdate = async () => {
  if (!updateBody.value.trim() || busy.update || !t.value) return
  busy.update = true
  try {
    const payload = { body: updateBody.value.trim(), is_internal: updateInternal.value }
    if (cadencePick.value !== 'keep') payload.interval_minutes = Number(cadencePick.value)
    const u = await postStatusUpdate(t.value.id, payload)
    toast.success(updateInternal.value ? 'Internal update posted' : 'Stakeholder update posted')
    updateBody.value = ''; pickedTpl.value = ''; cadencePick.value = 'keep'
    emit('changed', u)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not post the update') } finally { busy.update = false }
}
const stopCadence = async () => {
  if (busy.update || !t.value) return
  busy.update = true
  try {
    const u = await postStatusUpdate(t.value.id, { body: 'Update cadence stood down.', is_internal: true, stop_cadence: true })
    toast.info('Cadence stopped')
    emit('changed', u)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not stop the cadence') } finally { busy.update = false }
}

/* clocks */
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86400)}d`
}
const ackClock = computed(() => {
  if (!t.value) return '—'
  if (t.value.acknowledged_at) {
    const m = Math.max(0, Math.floor((new Date(t.value.acknowledged_at) - new Date(t.value.created_at)) / 60000))
    return m < 60 ? `${m}m ✓` : `${Math.floor(m / 60)}h ${m % 60}m ✓`
  }
  return isTerminal.value ? '—' : `${ago(t.value.created_at)} waiting`
})
const slaClock = computed(() => {
  const d = t.value?.resolution_due_at ? new Date(t.value.resolution_due_at).getTime() : null
  if (!d) return '—'
  const rem = d - props.now, m = Math.floor(Math.abs(rem) / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`
  return rem < 0 ? `${lbl} OVER` : `T−${lbl}`
})
const slaTone = computed(() => {
  const d = t.value?.resolution_due_at ? new Date(t.value.resolution_due_at).getTime() : null
  if (!d || isTerminal.value) return ''
  const rem = d - props.now
  return rem < 0 ? 'over' : rem < 7200000 ? 'warn' : ''
})

/* RCA */
const rca = reactive({ rca_summary: '', rca_corrective: '', rca_preventive: '' })
const syncRca = () => {
  rca.rca_summary = t.value?.rca_summary || ''
  rca.rca_corrective = t.value?.rca_corrective || ''
  rca.rca_preventive = t.value?.rca_preventive || ''
}
const hasRca = computed(() => !!(t.value?.rca_summary || '').trim())
const rcaDirty = computed(() => t.value && (
  rca.rca_summary !== (t.value.rca_summary || '') ||
  rca.rca_corrective !== (t.value.rca_corrective || '') ||
  rca.rca_preventive !== (t.value.rca_preventive || '')))
const saveRca = async () => {
  if (busy.rca || !t.value) return
  busy.rca = true
  try {
    const u = await setTicketRca(t.value.id, { ...rca })
    toast.success('Post-incident review saved')
    emit('changed', u)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save the review') } finally { busy.rca = false }
}

const pT = (i) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
})
</script>

<style scoped>
.wrc-root { position: fixed; inset: 0; z-index: 5200; }
.wrc-veil { position: absolute; inset: 0; background: rgba(6, 5, 8, 0.55); backdrop-filter: blur(3px); }
.wrc { position: absolute; top: 0; right: 0; bottom: 0; width: min(560px, 96vw); display: flex; flex-direction: column;
  background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-crit-brd); box-shadow: -30px 0 80px -30px rgba(0, 0, 0, 0.7); }

.wrc-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 18px 12px; border-bottom: 1px solid var(--sd-border); }
.wrc-h-lead { display: flex; gap: 12px; min-width: 0; flex: 1; }
.wrc-h-siren { flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
  color: var(--sd-crit-core); background: var(--sd-crit-soft); border: 1px solid var(--sd-crit-brd); }
.wrc-h-siren.live { animation: wrc-throb 1.8s ease-in-out infinite; }
.wrc-h-body { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.wrc-h-eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-crit-core); }
.wrc-h-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--sd-text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wrc-h-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.wrc-ackd { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--sd-crit-ack); }
.wrc-ack-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; font-size: 10.5px;
  font-weight: 800; letter-spacing: 0.06em; cursor: pointer; font-family: inherit;
  color: var(--sd-crit-core); background: var(--sd-crit-soft); border: 1px solid var(--sd-crit-brd); }
.wrc-h-tools { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.wrc-tool { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-muted); }
.wrc-tool:hover { color: var(--sd-text); border-color: var(--sd-crit-brd); }

.wrc-presence { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px 4px 4px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--sd-warning) 45%, transparent); background: var(--sd-warning-soft); }
.wrc-viewer { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-size: 8px; font-weight: 800;
  color: #1a1206; background: linear-gradient(135deg, #fde68a, var(--sd-warning)); margin-right: -6px; border: 1.5px solid var(--sd-surface-elevated); }
.wrc-p-lb { margin-left: 9px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-warning); }
.wrc-collision { display: flex; align-items: center; gap: 7px; margin: 10px 18px 0; padding: 8px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 600; color: var(--sd-warning); background: var(--sd-warning-soft);
  border: 1px dashed color-mix(in srgb, var(--sd-warning) 45%, transparent); }

.wrc-scroll { flex: 1; overflow-y: auto; padding: 14px 18px 22px; display: flex; flex-direction: column; gap: 12px; }
.wrc-panel { border: 1px solid var(--sd-border); border-radius: 14px; background: var(--sd-surface); padding: 14px 15px; }
.wrc-panel.pir { border-color: color-mix(in srgb, var(--sd-st-escalated) 35%, transparent); }
.wrc-p-title { display: flex; align-items: center; gap: 7px; margin: 0 0 11px; font-size: 12px; font-weight: 800;
  letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-secondary); }
.wrc-cadence { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800;
  padding: 3px 8px; border-radius: 7px; color: var(--sd-crit-flare); background: var(--sd-crit-flare-soft); letter-spacing: 0.05em; }
.wrc-cadence.over { color: #fff; background: var(--sd-crit-core); animation: wrc-throb 1.6s ease-in-out infinite; }
.wrc-rca-gap { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 7px;
  color: var(--sd-st-escalated); background: color-mix(in srgb, var(--sd-st-escalated) 14%, transparent); }

.wrc-imp-grid { display: flex; flex-direction: column; gap: 11px; }
.wrc-row { display: flex; gap: 10px; }
.wrc-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.wrc-field.grow { flex: 1; }
.wrc-field label { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.wrc-input { padding: 9px 11px; border-radius: 10px; font-size: 12.5px; font-family: inherit; color: var(--sd-text);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); outline: none; width: 100%; }
.wrc-input:focus { border-color: var(--sd-crit-core); }
.wrc-input.bare { background: none; border: none; padding: 0; }
.wrc-input:disabled { opacity: 0.6; }
.wrc-url { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.wrc-url:focus-within { border-color: var(--sd-crit-core); }
.wrc-join { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 11px; font-weight: 700;
  color: var(--sd-crit-ack); text-decoration: none; }
.wrc-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.wrc-seg-btn { padding: 7px 12px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-muted); }
.wrc-seg-btn.on { color: var(--sd-crit-core); border-color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.wrc-seg-btn:disabled { cursor: default; opacity: 0.7; }
.wrc-save-row { display: flex; justify-content: flex-end; }

.wrc-templates { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
.wrc-tpl { padding: 6px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: all 0.16s; }
.wrc-tpl:hover { border-color: var(--sd-crit-brd); color: var(--sd-text); }
.wrc-tpl.on { color: var(--sd-crit-core); border-color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.wrc-tpl.end.on { color: var(--sd-crit-ack); border-color: var(--sd-crit-ack); background: var(--sd-crit-ack-soft); }
.wrc-composer { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 12.5px; font-family: inherit; resize: vertical;
  color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); outline: none; }
.wrc-composer:focus { border-color: var(--sd-crit-core); }
.wrc-compose-bar { display: flex; align-items: center; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
.wrc-vis { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); }
.wrc-vis.pub { color: var(--sd-crit-flare); border-color: color-mix(in srgb, var(--sd-crit-flare) 50%, transparent); background: var(--sd-crit-flare-soft); }
.wrc-cad-select { min-width: 150px; }
.wrc-spacer { flex: 1; }
.wrc-quiet { margin: 0; font-size: 12px; color: var(--sd-text-muted); line-height: 1.55; }
.wrc-last { margin-top: 9px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--sd-text-dim); }

.wrc-responders { display: flex; flex-wrap: wrap; gap: 8px; }
.wrc-resp { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.wrc-resp.none { opacity: 0.65; }
.wrc-resp-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; font-style: normal;
  font-size: 9px; font-weight: 800; color: #fff; background: var(--sd-grad-rail); }
.wrc-resp-dot.lead { background: linear-gradient(135deg, var(--sd-crit-core), var(--sd-crit-deep)); }
.wrc-resp-body { display: flex; flex-direction: column; line-height: 1.2; }
.wrc-resp-body b { font-size: 12px; font-weight: 700; color: var(--sd-text); }
.wrc-resp-body small { font-size: 9.5px; color: var(--sd-text-dim); }
.wrc-resp.add { cursor: pointer; gap: 6px; padding: 6px 13px; color: var(--sd-text-muted); font-family: inherit; font-size: 11.5px; font-weight: 700; border-style: dashed; }
.wrc-resp.add:hover { color: var(--sd-crit-core); border-color: var(--sd-crit-brd); }

.wrc-clock { display: flex; flex-wrap: wrap; gap: 18px; }
.wrc-ck { display: flex; flex-direction: column; gap: 3px; }
.wrc-ck i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.wrc-ck b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.wrc-ck.warn b { color: var(--sd-warning); }
.wrc-ck.over b { color: var(--sd-crit-core); }

.wrc-cmds { display: flex; flex-wrap: wrap; gap: 9px; }
.wrc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px;
  font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.wrc-btn.sm { padding: 7px 12px; font-size: 11.5px; }
.wrc-btn.ghost { background: transparent; }
.wrc-btn.danger { color: var(--sd-crit-core); border-color: var(--sd-crit-brd); background: var(--sd-crit-soft); }
.wrc-btn.primary { border-color: transparent; color: #fff; background: linear-gradient(135deg, var(--sd-crit-core), var(--sd-crit-deep)); }
.wrc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wrc-spin { animation: wrc-rot 0.9s linear infinite; }

@keyframes wrc-throb { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-crit-core) 40%, transparent); } 50% { box-shadow: 0 0 0 7px transparent; } }
@keyframes wrc-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .wrc-h-siren.live, html:not([data-cinematic="on"]) .wrc-cadence.over { animation: none; }
}
</style>
