<template>
  <SdModalShell :open="open" eyebrow="WAR ROOM" :title="isManage ? 'Major incident command' : 'Declare a major incident'" width="620px" @close="$emit('close')">
    <div class="mim">
      <!-- ── live declaration banner ── -->
      <Motion class="mim-banner" :class="{ armed: canSubmit || isManage }"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="mim-siren"><Siren :size="18" /></span>
        <div class="mim-b-body">
          <b>{{ isManage ? 'MAJOR INCIDENT · ACTIVE' : 'MAJOR INCIDENT DECLARATION' }}</b>
          <span class="mim-b-sub">
            {{ target ? `${target.ticket_number} — ${target.subject}` : 'Pick the ticket that carries the disruption' }}
          </span>
        </div>
        <span v-if="form.business_impact" class="mim-b-imp sd-mono">{{ form.business_impact.toUpperCase() }} IMPACT</span>
      </Motion>

      <!-- ── ticket picker (when not fixed) ── -->
      <Motion v-if="!ticket" class="mim-field" v-bind="fT(0)">
        <label>Incident ticket</label>
        <SdSelect v-model="pickedId" :options="ticketOptions" placeholder="Choose a critical…" />
      </Motion>

      <!-- ── business impact ── -->
      <Motion class="mim-field" v-bind="fT(1)">
        <label>Business impact</label>
        <div class="mim-seg">
          <button v-for="b in BUSINESS_IMPACTS" :key="b.value" class="mim-seg-btn" :class="[{ on: form.business_impact === b.value }, 'imp-' + b.value]"
            @click="form.business_impact = form.business_impact === b.value ? '' : b.value">{{ b.label }}</button>
        </div>
      </Motion>

      <div class="mim-row">
        <Motion class="mim-field" v-bind="fT(2)">
          <label>Affected users</label>
          <input v-model.number="form.affected_users" type="number" min="0" class="mim-input" placeholder="e.g. 250" />
        </Motion>
        <Motion class="mim-field grow" v-bind="fT(3)">
          <label>Revenue / business exposure <i>optional</i></label>
          <input v-model="form.revenue_impact" type="text" class="mim-input" maxlength="160" placeholder="e.g. order intake blocked, ~₹2L/hr" />
        </Motion>
      </div>

      <Motion class="mim-field" v-bind="fT(4)">
        <label>War-room link <i>bridge / meet / channel</i></label>
        <div class="mim-url">
          <Link2 :size="13" />
          <input v-model="form.war_room_url" type="url" class="mim-input bare" maxlength="400" placeholder="https://meet…  ·  #incident-channel" />
        </div>
      </Motion>

      <!-- ── stakeholder update cadence ── -->
      <Motion class="mim-field" v-bind="fT(5)">
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
        <button class="mim-btn ghost" @click="$emit('close')">Cancel</button>
        <Motion as="button" class="mim-btn primary" :disabled="!canSubmit || busy"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="submit">
          <Loader v-if="busy" :size="14" class="mim-spin" />
          <Siren v-else :size="14" />
          {{ isManage ? 'Update incident' : 'Declare major incident' }}
        </Motion>
      </div>
    </div>
  </SdModalShell>
</template>

<script setup>
/* SdMajorIncidentModal — the declare / manage ceremony for a major incident.
   Declares via POST /tickets/{id}/major-incident (optionally arming the stakeholder
   update cadence); manage mode edits impact fields or stands the incident down. */
import { reactive, ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Siren, ShieldCheck, Link2, BellRing, Loader } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import { setMajorIncident, BUSINESS_IMPACTS, UPDATE_CADENCE_OPTIONS } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },       // fixed target (row/console context)
  tickets: { type: Array, default: () => [] },   // pickable pool when no fixed target
  agent: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const pickedId = ref('')
const form = reactive({ business_impact: '', affected_users: null, revenue_impact: '', war_room_url: '', update_interval_minutes: 30 })
const busy = ref(false)

const target = computed(() => props.ticket || props.tickets.find(t => String(t.id) === String(pickedId.value)) || null)
const isManage = computed(() => !!target.value?.is_major_incident)
const canSubmit = computed(() => !!target.value)
const ticketOptions = computed(() => props.tickets.map(t => ({
  value: String(t.id), label: `${t.ticket_number} · ${t.subject}`, dot: t.is_major_incident ? 'var(--sd-crit-mi)' : 'var(--sd-crit-flare)',
})))

watch(() => props.open, (v) => {
  if (!v) return
  pickedId.value = props.ticket ? String(props.ticket.id) : ''
  const t = props.ticket
  form.business_impact = t?.business_impact || ''
  form.affected_users = t?.affected_users ?? null
  form.revenue_impact = t?.revenue_impact || ''
  form.war_room_url = t?.war_room_url || ''
  form.update_interval_minutes = t?.update_interval_minutes ?? 30
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
  if (!target.value || busy.value) return
  busy.value = true
  try {
    const t = await setMajorIncident(target.value.id, {
      is_major_incident: true,
      business_impact: form.business_impact || null,
      affected_users: Number.isFinite(form.affected_users) ? form.affected_users : null,
      revenue_impact: form.revenue_impact || null,
      war_room_url: form.war_room_url || null,
      update_interval_minutes: form.update_interval_minutes || null,
    })
    emit('done', t)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not declare the major incident') }
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

.mim-banner { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 13px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); transition: border-color 0.3s, background 0.3s; }
.mim-banner.armed { border-style: solid; border-color: var(--sd-crit-brd); background: var(--sd-crit-soft); }
.mim-siren { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--sd-crit-core); background: var(--sd-crit-soft); border: 1px solid var(--sd-crit-brd); }
.mim-banner.armed .mim-siren { animation: mim-throb 1.8s ease-in-out infinite; }
.mim-b-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mim-b-body b { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-crit-core); }
.mim-b-sub { font-size: 12.5px; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mim-b-imp { margin-left: auto; flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-crit-flare); }

.mim-row { display: flex; gap: 12px; }
.mim-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mim-field.grow { flex: 1; }
.mim-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.mim-field label i { font-style: normal; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--sd-text-dim); opacity: 0.7; }

.mim-input { padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; color: var(--sd-text);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); outline: none; transition: border-color 0.2s; width: 100%; }
.mim-input:focus { border-color: var(--sd-crit-core); }
.mim-input.bare { background: none; border: none; padding: 0; }
.mim-url { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.mim-url:focus-within { border-color: var(--sd-crit-core); }

.mim-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.mim-seg-btn { padding: 8px 13px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-muted); transition: all 0.18s; }
.mim-seg-btn:hover { color: var(--sd-text); border-color: var(--sd-crit-brd); }
.mim-seg-btn.on { color: var(--sd-crit-core); border-color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.mim-seg-btn.on.imp-low { color: var(--sd-text-secondary); border-color: var(--sd-border-strong); background: var(--sd-surface-glass); }
.mim-seg-btn.on.imp-medium { color: var(--sd-warning); border-color: var(--sd-warning); background: var(--sd-warning-soft); }
.mim-hint { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 11.5px; color: var(--sd-text-muted); }

.mim-actions { display: flex; align-items: center; gap: 9px; padding-top: 4px; }
.mim-spacer { flex: 1; }
.mim-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.mim-btn.ghost { background: transparent; }
.mim-btn.ghost.stand { color: var(--sd-crit-ack); border-color: color-mix(in srgb, var(--sd-crit-ack) 45%, transparent); }
.mim-btn.primary { border-color: transparent; color: #fff; background: linear-gradient(135deg, var(--sd-crit-core), var(--sd-crit-deep)); box-shadow: 0 10px 24px -12px var(--sd-crit-core); }
.mim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mim-spin { animation: mim-rot 0.9s linear infinite; }

@keyframes mim-throb { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-crit-core) 40%, transparent); } 50% { box-shadow: 0 0 0 8px transparent; } }
@keyframes mim-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .mim-banner.armed .mim-siren { animation: none; } }
</style>
