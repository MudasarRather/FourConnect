<template>
  <SdModalShell :open="open" eyebrow="TEAM COMMAND · ROUTE" :title="`Route a ${team?.name || 'team'} ticket`"
    width="500px" @close="$emit('close')">
    <div class="rm">
      <p class="rm-note">Hand an unowned ticket in this team's queue to a specific person.
        Roster first — outside agents are listed after the crew.</p>

      <label class="rm-lbl">Ticket</label>
      <SdSelect v-model="ticketId" :options="ticketOpts"
        :placeholder="loadingTickets ? 'Loading unowned tickets…' : (ticketOpts.length ? 'Choose an unowned ticket…' : 'No unowned tickets in this queue')" />

      <div v-if="picked" class="rm-card">
        <span class="rm-no sd-mono">{{ picked.ticket_number }}</span>
        <p class="rm-subj">{{ picked.subject }}</p>
        <div class="rm-pills">
          <span class="rm-pill" :style="{ '--pc': priorityColor(picked.priority) }"><i />{{ priorityLabel(picked.priority) }}</span>
          <span class="rm-pill" :style="{ '--pc': statusColor(picked.status) }"><i />{{ statusLabel(picked.status) }}</span>
        </div>
      </div>

      <label class="rm-lbl">Assign to</label>
      <SdSelect v-model="assignTo" :options="peopleOpts" placeholder="Choose an agent…" />

      <p v-if="err" class="rm-err"><AlertTriangle :size="13" /> {{ err }}</p>
    </div>
    <template #footer>
      <button class="rm-btn" @click="$emit('close')">Cancel</button>
      <button class="rm-btn primary" :disabled="busy || !ticketId || !assignTo" @click="doAssign">
        <component :is="busy ? LoaderCircle : UserCheck" :size="14" :class="{ 'rm-spin': busy }" />
        {{ busy ? 'Assigning…' : 'Assign ticket' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdTeamRouteModal — the ADMIN route/assign flow. Always the admin single-writer
   (POST /support-desk/tickets/{id}/assign) — never the agent /me/* variant the old
   surface used (its authority model belongs to the agent portal). */
import { ref, computed, watch } from 'vue'
import { AlertTriangle, LoaderCircle, UserCheck, Crown, Shield, UserRound } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  assignTicket, listTeamTickets, listSupportAgents,
  priorityColor, statusColor, priorityLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  team: { type: Object, default: null },              // overview card
  roster: { type: Array, default: () => [] },          // stats.roster (TeamRosterEntry[])
})
const emit = defineEmits(['close', 'done'])

const tickets = ref([])
const loadingTickets = ref(false)
const agents = ref([])
const ticketId = ref('')
const assignTo = ref('')
const busy = ref(false)
const err = ref('')

watch(() => props.open, async (v) => {
  if (!v || !props.team) return
  ticketId.value = ''; assignTo.value = ''; err.value = ''
  loadingTickets.value = true
  try {
    const r = await listTeamTickets(props.team.id, { lens: 'unassigned', page: 1, limit: 50 })
    tickets.value = r.items || []
  } catch (e) { tickets.value = []; err.value = detail(e) } finally { loadingTickets.value = false }
  try { agents.value = await listSupportAgents() } catch { agents.value = [] }
})

const ticketOpts = computed(() => tickets.value.map(t => ({
  value: String(t.id), label: `${t.ticket_number} — ${t.subject}`, desc: priorityLabel(t.priority),
})))
const picked = computed(() => tickets.value.find(t => String(t.id) === String(ticketId.value)) || null)

const peopleOpts = computed(() => {
  const rosterIds = new Set()
  const out = []
  for (const r of props.roster) {
    if (r.role === 'collaborator') continue
    rosterIds.add(String(r.agent_id))
    out.push({
      value: String(r.agent_id), label: r.name || 'Member',
      icon: r.is_lead ? Crown : UserRound,
      desc: `${r.is_lead ? 'Team lead' : 'Crew'} · ${r.open ?? 0} open`,
    })
  }
  for (const a of agents.value) {
    if (rosterIds.has(String(a.id))) continue
    out.push({ value: String(a.id), label: a.name, icon: Shield, desc: 'Outside the team' })
  }
  return out
})

const detail = (e) => {
  const d = e?.response?.data?.detail
  return typeof d === 'string' ? d : (d?.message || 'Assign failed.')
}
const doAssign = async () => {
  if (!ticketId.value || !assignTo.value) return
  busy.value = true; err.value = ''
  try {
    await assignTicket(ticketId.value, { assigned_agent_id: assignTo.value })
    emit('done', { ticketId: ticketId.value, agentId: assignTo.value })
  } catch (e) { err.value = detail(e) } finally { busy.value = false }
}
</script>

<style scoped>
.rm { display: flex; flex-direction: column; gap: 11px; }
.rm-note { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--sd-text-muted); }
.rm-lbl { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.rm-card { padding: 12px 14px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.rm-no { font-size: 11px; font-weight: 700; color: var(--sd-team-core); }
.rm-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); margin: 4px 0 9px; line-height: 1.3; }
.rm-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.rm-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px;
  border-radius: 999px; color: var(--pc); background: color-mix(in srgb, var(--pc) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--pc) 30%, transparent); }
.rm-pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
.rm-err { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-danger); margin: 0; }
.rm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px;
  font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.rm-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; }
.rm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rm-spin { animation: rm-rot 1s linear infinite; }
@keyframes rm-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .rm-spin { animation: none; } }
</style>
