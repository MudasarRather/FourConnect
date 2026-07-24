<template>
  <SdModalShell :open="open" :eyebrow="isPropose ? 'MI CANDIDATE' : 'WAR ROOM'"
    :title="isManage ? 'Major incident command' : (isPropose ? 'Propose a major incident' : 'Declare a major incident')"
    width="620px" :z="z" @close="$emit('close')">
    <div class="mim">
      <!-- ── live declaration banner ── -->
      <Motion class="mim-banner" :class="{ armed: (canSubmit || isManage) && !isPropose, cand: isPropose }"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="mim-siren"><Flag v-if="isPropose" :size="18" /><Siren v-else :size="18" /></span>
        <div class="mim-b-body">
          <b>{{ isManage ? 'MAJOR INCIDENT · ACTIVE' : (isPropose ? 'MI CANDIDATE — LEAD SIGN-OFF REQUIRED' : 'MAJOR INCIDENT DECLARATION') }}</b>
          <span class="mim-b-sub">
            {{ target ? `${target.ticket_number} — ${target.subject}` : 'Pick the ticket that carries the disruption' }}
          </span>
        </div>
        <span v-if="form.business_impact" class="mim-b-imp sd-mono">{{ form.business_impact.toUpperCase() }} IMPACT</span>
      </Motion>

      <!-- authority gate: hold the composer until we know if the caller can declare or must
           propose (caps.checked). Prevents a lead flashing the propose flow, or vice-versa. -->
      <div v-if="!capsReady" class="mim-checking sd-mono">
        <Loader :size="14" class="mim-spin" /> Checking your authority on this desk…
      </div>

      <template v-else>
      <!-- ── pending candidate on this ticket ── -->
      <Motion v-if="hasPending" class="mim-pending" v-bind="fT(0)">
        <Hourglass :size="14" />
        <div class="mim-p-body">
          <b>PROPOSAL PENDING — {{ target?.mi_proposed_by_name || 'a teammate' }}</b>
          <span>“{{ target?.mi_proposal_note }}”</span>
        </div>
        <button v-if="canWithdraw" class="mim-btn ghost stand" :disabled="busy" @click="withdraw">
          <Undo2 :size="13" /> Withdraw
        </button>
      </Motion>

      <!-- ── lead ruling — confirm (arming cadence / war room) or decline with a reason.
           Renders for the ticket's team lead or an admin, on EITHER panel — closes the
           "employee-panel lead cannot rule" hole. ── -->
      <template v-if="hasPending && canDeclare">
        <Motion class="mim-field" v-bind="fT(1)">
          <label>Confirm — stakeholder update cadence <i>optional · armed on declare</i></label>
          <div class="mim-seg">
            <button class="mim-seg-btn" :class="{ on: !ruling.update_interval_minutes }"
              @click="ruling.update_interval_minutes = null">Off</button>
            <button v-for="o in UPDATE_CADENCE_OPTIONS" :key="o.value" class="mim-seg-btn"
              :class="{ on: ruling.update_interval_minutes === o.value }"
              @click="ruling.update_interval_minutes = o.value">{{ o.label.replace('Every ', '') }}</button>
          </div>
          <button class="mim-war-toggle" :class="{ on: ruling.open_war_room }"
            @click="ruling.open_war_room = !ruling.open_war_room">
            <Radio :size="13" />
            {{ ruling.open_war_room ? 'Swarm war room will open on confirm' : 'Open a swarm war room on confirm' }}
            <i class="mim-led" :class="{ lit: ruling.open_war_room }" />
          </button>
        </Motion>
        <Motion class="mim-field" v-bind="fT(2)">
          <label>…or decline the candidate <i>reason required · goes back to the proposer</i></label>
          <textarea v-model="ruling.decline_note" class="mim-input area" rows="2" maxlength="500"
            placeholder="Why this stays below the major desk — impact contained, workaround live…"></textarea>
        </Motion>
        <div class="mim-ruling-actions">
          <button class="mim-btn ghost stand" :disabled="busy || !ruling.decline_note.trim()" @click="declineProposal">
            <FlagOff :size="13" /> Decline candidate
          </button>
          <span class="mim-spacer" />
          <Motion as="button" class="mim-btn primary" :disabled="busy"
            :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="confirmProposal">
            <Loader v-if="busy" :size="14" class="mim-spin" /><Siren v-else :size="14" />
            Confirm — declare major
          </Motion>
        </div>
      </template>

      <!-- ── ticket picker (when not fixed) ── -->
      <Motion v-if="!ticket" class="mim-field" v-bind="fT(0)">
        <label>Incident ticket</label>
        <SdSelect v-model="pickedId" :options="ticketOptions" placeholder="Choose a critical…" />
      </Motion>

      <!-- ── the case for major (propose mode) ── -->
      <Motion v-if="isPropose && !hasPending" class="mim-field" v-bind="fT(1)">
        <label>The case for major <i>required · goes to your team lead</i></label>
        <textarea v-model="form.note" class="mim-input area" rows="3" maxlength="500"
          placeholder="What's the blast radius, how fast is it growing, why does this need the major desk…"></textarea>
        <p class="mim-hint" :class="{ bad: form.note && form.note.trim().length < 10 }">
          <Flag :size="11" />
          {{ form.note.trim().length < 10
            ? 'At least 10 characters — make the case a lead can rule on.'
            : 'A lead or admin confirms (arming cadence + war room) or declines with a reason.' }}
        </p>
      </Motion>

      <!-- ── business impact ── -->
      <Motion v-if="!hasPending" class="mim-field" v-bind="fT(2)">
        <label>Business impact</label>
        <div class="mim-seg">
          <button v-for="b in BUSINESS_IMPACTS" :key="b.value" class="mim-seg-btn" :class="[{ on: form.business_impact === b.value }, 'imp-' + b.value]"
            @click="form.business_impact = form.business_impact === b.value ? '' : b.value">{{ b.label }}</button>
        </div>
      </Motion>

      <div v-if="!hasPending" class="mim-row">
        <Motion class="mim-field" v-bind="fT(3)">
          <label>Affected users</label>
          <input v-model.number="form.affected_users" type="number" min="0" class="mim-input" placeholder="e.g. 250" />
        </Motion>
        <Motion v-if="!isPropose" class="mim-field grow" v-bind="fT(4)">
          <label>Revenue / business exposure <i>optional</i></label>
          <input v-model="form.revenue_impact" type="text" class="mim-input" maxlength="160" placeholder="e.g. order intake blocked, ~₹2L/hr" />
        </Motion>
      </div>

      <Motion v-if="!isPropose && !hasPending" class="mim-field" v-bind="fT(5)">
        <label>War room</label>
        <div class="mim-war">
          <button class="mim-war-toggle" :class="{ on: form.open_war_room }" @click="form.open_war_room = !form.open_war_room">
            <Radio :size="13" />
            {{ form.open_war_room ? 'Swarm war room will open on declare' : 'Open a swarm war room on declare' }}
            <i class="mim-led" :class="{ lit: form.open_war_room }" />
          </button>
          <div class="mim-url">
            <Link2 :size="13" />
            <input v-model="form.war_room_url" type="url" class="mim-input bare" maxlength="400" placeholder="…or paste a bridge / meet / channel link (wins over auto)" />
          </div>
        </div>
      </Motion>

      <!-- ── stakeholder update cadence ── -->
      <Motion v-if="!isPropose && !hasPending" class="mim-field" v-bind="fT(6)">
        <label>Stakeholder update cadence</label>
        <div class="mim-seg">
          <button class="mim-seg-btn" :class="{ on: !form.update_interval_minutes }" @click="form.update_interval_minutes = null">Off</button>
          <button v-for="o in UPDATE_CADENCE_OPTIONS" :key="o.value" class="mim-seg-btn" :class="{ on: form.update_interval_minutes === o.value }"
            @click="form.update_interval_minutes = o.value">{{ o.label.replace('Every ', '') }}</button>
        </div>
        <p class="mim-hint">
          <BellRing :size="11" />
          {{ form.update_interval_minutes
            ? `The desk will expect a posted status update every ${form.update_interval_minutes} minutes — lapses are flagged and nudged.`
            : 'No promised update rhythm — you can arm one later from the war-room console.' }}
        </p>
      </Motion>

      <!-- ── actions ── -->
      <div class="mim-actions">
        <button v-if="isManage" class="mim-btn ghost stand" :disabled="busy" @click="standDown">
          <ShieldCheck :size="14" /> Stand down
        </button>
        <span class="mim-spacer" />
        <button class="mim-btn ghost" @click="$emit('close')">{{ hasPending ? 'Close' : 'Cancel' }}</button>
        <Motion v-if="!hasPending" as="button" class="mim-btn primary" :class="{ cand: isPropose }" :disabled="!canSubmit || busy"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="submit">
          <Loader v-if="busy" :size="14" class="mim-spin" />
          <Flag v-else-if="isPropose" :size="14" />
          <Siren v-else :size="14" />
          {{ isManage ? 'Update incident' : (isPropose ? 'Propose major incident' : 'Declare major incident') }}
        </Motion>
      </div>
      </template>
    </div>
  </SdModalShell>
</template>

<script setup>
/* SdMajorIncidentModal — the declare / propose / manage ceremony for a major incident.
   Declaring FRESH major status is a team-lead/admin call (POST /major-incident, optionally
   arming the cadence + auto-opening a swarm war room); regular agents PROPOSE instead
   (POST /mi-proposal — the lead confirms/declines from the War Table). Manage mode edits
   impact fields or stands the incident down (owner-tier). Shared by the Major desks,
   the Active desk and the ticket drawer, so the gate is consistent everywhere. */
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Siren, ShieldCheck, Link2, BellRing, Loader, Flag, FlagOff, Radio, Hourglass, Undo2 } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  setMajorIncident, proposeMi, withdrawMiProposal, confirmMiProposal, declineMiProposal,
  fetchCapabilities, useCapabilities, fetchMe,
  BUSINESS_IMPACTS, UPDATE_CADENCE_OPTIONS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },       // fixed target (row/console context)
  tickets: { type: Array, default: () => [] },   // pickable pool when no fixed target
  agent: { type: Boolean, default: false },
  // forwarded to SdModalShell — pass 5300 when co-rendered with SdWarRoomConsole (z5200),
  // 2700 from drawer-launched contexts (drawer = 2100)
  z: { type: Number, default: 2000 },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()
const caps = useCapabilities()
const me = ref(null)
// caps.checked flips true once the cached capability probe resolves. Until then we don't
// know if the caller is a team lead — so the body waits rather than mis-showing a lead the
// "propose" flow (or a non-lead the "declare" flow). Cached after first use → usually instant.
const capsReady = computed(() => caps.checked)
onMounted(async () => { fetchCapabilities(); me.value = await fetchMe() })

const pickedId = ref('')
const form = reactive({
  business_impact: '', affected_users: null, revenue_impact: '', war_room_url: '',
  update_interval_minutes: 30, open_war_room: false, note: '',
})
// lead ruling on a pending candidate (confirm arms / decline requires the why)
const ruling = reactive({ update_interval_minutes: 30, open_war_room: false, decline_note: '' })
const busy = ref(false)

const target = computed(() => props.ticket || props.tickets.find(t => String(t.id) === String(pickedId.value)) || null)
const isManage = computed(() => !!target.value?.is_major_incident)
// Fresh declare = lead of the ticket's team OR admin; everyone else proposes.
const canDeclare = computed(() => {
  if (caps.isAdmin) return true
  const tm = target.value?.team_id ? String(target.value.team_id) : null
  return !!(tm && caps.leadTeamIds.includes(tm))
})
const isPropose = computed(() => capsReady.value && !isManage.value && !canDeclare.value)
const hasPending = computed(() => !isManage.value && !!target.value?.mi_proposed_at)
const canWithdraw = computed(() => caps.isAdmin
  || (me.value && target.value?.mi_proposed_by_id && String(target.value.mi_proposed_by_id) === String(me.value.id)))
const canSubmit = computed(() => !!target.value && (!isPropose.value || form.note.trim().length >= 10))
const ticketOptions = computed(() => props.tickets.map(t => ({
  value: String(t.id), label: `${t.ticket_number} · ${t.subject}`, dot: t.is_major_incident ? 'var(--sd-crit-mi)' : 'var(--sd-crit-flare)',
})))

watch(() => props.open, (v) => {
  if (!v) return
  if (!caps.checked) fetchCapabilities()   // ensure authority is known before the body shows
  pickedId.value = props.ticket ? String(props.ticket.id) : ''
  const t = props.ticket
  form.business_impact = t?.business_impact || ''
  form.affected_users = t?.affected_users ?? null
  form.revenue_impact = t?.revenue_impact || ''
  form.war_room_url = t?.war_room_url || ''
  form.update_interval_minutes = t?.update_interval_minutes ?? 30
  form.open_war_room = false
  form.note = ''
  ruling.update_interval_minutes = 30
  ruling.open_war_room = false
  ruling.decline_note = ''
})
watch(target, (t) => {
  if (!t || props.ticket) return
  form.business_impact = t.business_impact || form.business_impact
  form.affected_users = t.affected_users ?? form.affected_users
  form.revenue_impact = t.revenue_impact || form.revenue_impact
  form.war_room_url = t.war_room_url || form.war_room_url
})

const fT = (i) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.06 + i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const submit = async () => {
  if (!target.value || busy.value || !canSubmit.value) return
  busy.value = true
  try {
    if (isPropose.value) {
      await proposeMi(target.value.id, {
        note: form.note.trim(),
        business_impact: form.business_impact || null,
        affected_users: Number.isFinite(form.affected_users) ? form.affected_users : null,
      })
      toast.success(`${target.value.ticket_number} proposed as a major incident — your lead has been pinged`)
      emit('done', null)
    } else {
      const t = await setMajorIncident(target.value.id, {
        is_major_incident: true,
        business_impact: form.business_impact || null,
        affected_users: Number.isFinite(form.affected_users) ? form.affected_users : null,
        revenue_impact: form.revenue_impact || null,
        war_room_url: form.war_room_url || null,
        update_interval_minutes: form.update_interval_minutes || null,
        open_war_room: form.open_war_room,
      })
      if (form.open_war_room && t?.war_room_url) toast.success('War room opened — swarm session linked')
      emit('done', t)
    }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not submit the major-incident call') }
  finally { busy.value = false }
}
const withdraw = async () => {
  if (!target.value || busy.value) return
  busy.value = true
  try {
    await withdrawMiProposal(target.value.id)
    toast.success('Candidate withdrawn — back off the pad')
    emit('done', null)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not withdraw the proposal') }
  finally { busy.value = false }
}
/* ── lead ruling: confirm arms cadence/war room; decline carries the mandatory why ── */
const confirmProposal = async () => {
  if (!target.value || busy.value) return
  busy.value = true
  try {
    await confirmMiProposal(target.value.id, {
      update_interval_minutes: ruling.update_interval_minutes || undefined,
      open_war_room: ruling.open_war_room || undefined,
    })
    toast.success(`${target.value.ticket_number} confirmed — major incident declared`)
    emit('done', null)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not confirm the candidate') }
  finally { busy.value = false }
}
const declineProposal = async () => {
  if (!target.value || busy.value || !ruling.decline_note.trim()) return
  busy.value = true
  try {
    await declineMiProposal(target.value.id, { note: ruling.decline_note.trim() })
    toast.success('Candidate declined — the proposer has the why')
    emit('done', null)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not decline the candidate') }
  finally { busy.value = false }
}
const standDown = async () => {
  if (!target.value || busy.value) return
  busy.value = true
  try {
    const t = await setMajorIncident(target.value.id, { is_major_incident: false })
    toast.success(`${t.ticket_number} stood down — no longer a major incident`)
    emit('done', null)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not stand down') }
  finally { busy.value = false }
}
</script>

<style scoped>
.mim { display: flex; flex-direction: column; gap: 15px; }
.mim-checking { display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 28px 16px; font-size: 11px; letter-spacing: 0.12em; color: var(--sd-text-muted); }

.mim-banner { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 13px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); transition: border-color 0.3s, background 0.3s; }
.mim-banner.armed { border-style: solid; border-color: var(--sd-crit-brd); background: var(--sd-crit-soft); }
.mim-banner.cand { border-color: color-mix(in srgb, var(--sd-warning) 45%, transparent); background: color-mix(in srgb, var(--sd-warning) 7%, transparent); }
.mim-siren { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--sd-crit-core); background: var(--sd-crit-soft); border: 1px solid var(--sd-crit-brd); }
.mim-banner.cand .mim-siren { color: var(--sd-warning); background: color-mix(in srgb, var(--sd-warning) 10%, transparent); border-color: color-mix(in srgb, var(--sd-warning) 40%, transparent); }
.mim-banner.armed .mim-siren { animation: mim-throb 1.8s ease-in-out infinite; }
.mim-b-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mim-b-body b { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-crit-core); }
.mim-banner.cand .mim-b-body b { color: var(--sd-warning); }
.mim-b-sub { font-size: 12.5px; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mim-b-imp { margin-left: auto; flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-crit-flare); }

.mim-pending { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 13px;
  border: 1px dashed color-mix(in srgb, var(--sd-warning) 45%, transparent);
  background: color-mix(in srgb, var(--sd-warning) 6%, transparent); color: var(--sd-warning); }
.mim-p-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.mim-p-body b { font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; }
.mim-p-body span { font-size: 12px; color: var(--sd-text-secondary); font-style: italic;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mim-row { display: flex; gap: 12px; }
.mim-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mim-field.grow { flex: 1; }
.mim-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.mim-field label i { font-style: normal; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--sd-text-dim); opacity: 0.7; }

.mim-input { padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; color: var(--sd-text);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); outline: none; transition: border-color 0.2s; width: 100%; }
.mim-input:focus { border-color: var(--sd-crit-core); }
.mim-input.bare { background: none; border: none; padding: 0; }
.mim-input.area { resize: vertical; min-height: 74px; line-height: 1.5; }
.mim-url { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.mim-url:focus-within { border-color: var(--sd-crit-core); }

.mim-war { display: flex; flex-direction: column; gap: 8px; }
.mim-war-toggle { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 11px;
  font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; text-align: left;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-muted); transition: all 0.2s; }
.mim-war-toggle.on { border-style: solid; border-color: color-mix(in srgb, var(--sd-crit-core) 55%, transparent);
  color: var(--sd-text); background: var(--sd-crit-soft); }
.mim-led { margin-left: auto; width: 9px; height: 9px; border-radius: 50%; background: var(--sd-border-strong); transition: all 0.25s; }
.mim-led.lit { background: var(--sd-crit-core); box-shadow: 0 0 10px var(--sd-crit-core); animation: mim-throb 1.8s ease-in-out infinite; }

.mim-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.mim-seg-btn { padding: 8px 13px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-muted); transition: all 0.18s; }
.mim-seg-btn:hover { color: var(--sd-text); border-color: var(--sd-crit-brd); }
.mim-seg-btn.on { color: var(--sd-crit-core); border-color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.mim-seg-btn.on.imp-low { color: var(--sd-text-secondary); border-color: var(--sd-border-strong); background: var(--sd-surface-glass); }
.mim-seg-btn.on.imp-medium { color: var(--sd-warning); border-color: var(--sd-warning); background: var(--sd-warning-soft); }
.mim-hint { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 11.5px; color: var(--sd-text-muted); }
.mim-hint.bad { color: var(--sd-danger); }

.mim-actions { display: flex; align-items: center; gap: 9px; padding-top: 4px; }
/* lead-ruling verbs sit above the footer, separated by a hairline — decline left, confirm right */
.mim-ruling-actions { display: flex; align-items: center; gap: 9px; padding-top: 10px;
  border-top: 1px dashed var(--sd-border); }
.mim-spacer { flex: 1; }
.mim-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.mim-btn.ghost { background: transparent; }
.mim-btn.ghost.stand { color: var(--sd-crit-ack); border-color: color-mix(in srgb, var(--sd-crit-ack) 45%, transparent); }
.mim-btn.primary { border-color: transparent; color: #fff; background: linear-gradient(135deg, var(--sd-crit-core), var(--sd-crit-deep)); box-shadow: 0 10px 24px -12px var(--sd-crit-core); }
.mim-btn.primary.cand { background: linear-gradient(135deg, var(--sd-warning), color-mix(in srgb, var(--sd-warning) 60%, #7a4d00)); box-shadow: 0 10px 24px -12px var(--sd-warning); }
.mim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mim-spin { animation: mim-rot 0.9s linear infinite; }

@keyframes mim-throb { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-crit-core) 40%, transparent); } 50% { box-shadow: 0 0 0 8px transparent; } }
@keyframes mim-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .mim-banner.armed .mim-siren,
  html:not([data-cinematic="on"]) .mim-led.lit { animation: none; } }
</style>
