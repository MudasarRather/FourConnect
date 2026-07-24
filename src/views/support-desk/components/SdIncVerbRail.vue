<template>
  <!-- SdIncVerbRail — THE single permission surface for the Critical desks.
       Every incident verb both desks may offer renders from here, gated FAIL-CLOSED:
       privileged verbs are ABSENT (never disabled-then-enabled) until the
       capabilities probe has settled. Hosts restyle the neutral glass buttons via
       :deep(.ivr-btn); the rail itself carries no concept styling. -->
  <div class="ivr" role="group" aria-label="Incident actions">
    <!-- ═══ AGENT variant — the response tier ═══ -->
    <template v-if="variant === 'agent'">
      <Motion v-if="canAct && !row.acknowledged_at && sev <= 2" as="button" class="ivr-btn live"
        title="Acknowledge — stop the MTTA clock" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('ack', row)">
        <ShieldCheck :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Post stakeholder update" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('update', row)">
        <MessageSquare :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Response playbook" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('playbook', row)">
        <ListChecks :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Staff the command roster" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('roster', row)">
        <Crown :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Impact detail" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('impact', row)">
        <Target :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Log a command decision" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('decision', row)">
        <Gavel :size="13" /></Motion>
      <Motion v-if="canAct" as="button" class="ivr-btn" title="Link parent / child incident" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('link', row)">
        <Link2 :size="13" /></Motion>
      <!-- MI path: lead/admin declares directly, everyone else proposes — the label
           depends on canRule, so the verb waits for the caps probe (fail-closed). -->
      <Motion v-if="canAct && capsReady && !row.is_major_incident" as="button" class="ivr-btn warn"
        :title="canRule ? 'Declare major incident' : (row.mi_proposed_at ? 'MI candidate — open the proposal' : 'Propose major incident')"
        :disabled="busy" :while-hover="hov" :while-tap="tap"
        @click="$emit(canRule ? 'declare' : 'propose', row)">
        <component :is="canRule ? Siren : Flag" :size="13" /></Motion>
      <Motion v-if="row.war_room_url" as="button" class="ivr-btn" title="Join the war-room bridge"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('bridge', row)">
        <Radio :size="13" /></Motion>
      <!-- reclassify: promote (owner-tier) for SEV3+; de-escalate (lead/admin) for SEV2 -->
      <Motion v-if="canAct && sev >= 3 && !row.is_major_incident" as="button" class="ivr-btn"
        title="Promote to SEV2 — raise the alarm" :disabled="busy"
        :while-hover="hov" :while-tap="tap"
        @click="$emit('reclassify', { row, direction: 'promote' })">
        <ArrowUpDown :size="13" /></Motion>
      <Motion v-else-if="capsReady && canRule && sev === 2" as="button" class="ivr-btn"
        title="De-escalate to SEV3 — lead call" :disabled="busy"
        :while-hover="hov" :while-tap="tap"
        @click="$emit('reclassify', { row, direction: 'de_escalate' })">
        <ArrowUpDown :size="13" /></Motion>
    </template>

    <!-- ═══ OVERSIGHT variant — the governance tier (NO ack: acking from the
         oversight desk would poison the responders' MTTA record) ═══ -->
    <template v-else>
      <template v-if="capsReady && canRule && row.mi_proposed_at && !row.is_major_incident">
        <Motion as="button" class="ivr-btn hot" title="Confirm — declare major incident"
          :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('confirm-mi', row)">
          <BadgeCheck :size="13" /></Motion>
        <Motion as="button" class="ivr-btn warn" title="Decline the MI candidate"
          :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('decline-mi', row)">
          <FlagOff :size="13" /></Motion>
      </template>
      <Motion v-if="canGovern" as="button" class="ivr-btn" title="Assign / reassign responder"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('assign', row)">
        <UserPlus :size="13" /></Motion>
      <!-- Nudge chases the OWNER — an unowned row 409s ("assign it instead"), so the
           verb only renders once someone holds the fault (Assign is the move otherwise). -->
      <Motion v-if="canGovern && row.assigned_agent_id" as="button" class="ivr-btn" title="Nudge the owner"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('nudge', row)">
        <BellRing :size="13" /></Motion>
      <Motion v-if="canGovern" as="button" class="ivr-btn" title="Staff the command roster"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('roster', row)">
        <Crown :size="13" /></Motion>
      <Motion v-if="canGovern && sev >= 3 && !row.is_major_incident" as="button" class="ivr-btn"
        title="Promote to SEV2" :disabled="busy" :while-hover="hov" :while-tap="tap"
        @click="$emit('reclassify', { row, direction: 'promote' })">
        <ArrowUpDown :size="13" /></Motion>
      <Motion v-else-if="capsReady && canRule && sev === 2" as="button" class="ivr-btn"
        title="De-escalate to SEV3" :disabled="busy" :while-hover="hov" :while-tap="tap"
        @click="$emit('reclassify', { row, direction: 'de_escalate' })">
        <ArrowUpDown :size="13" /></Motion>
      <Motion v-if="canGovern" as="button" class="ivr-btn" title="Escalate a tier"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('escalate', row)">
        <ChevronsUp :size="13" /></Motion>
      <Motion v-if="canGovern" as="button" class="ivr-btn" title="Stakeholder watchers"
        :disabled="busy" :while-hover="hov" :while-tap="tap" @click="$emit('watchers', row)">
        <Eye :size="13" /></Motion>
      <Motion as="button" class="ivr-btn" title="Executive sitrep (PDF)" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('sitrep', row)">
        <FileText :size="13" /></Motion>
      <Motion as="button" class="ivr-btn" title="Open the incident" :disabled="busy"
        :while-hover="hov" :while-tap="tap" @click="$emit('open', row)">
        <ArrowRight :size="13" /></Motion>
    </template>
  </div>
</template>

<script setup>
/*
  SdIncVerbRail — the ONE place row-level incident permissions are decided.
  Gating contract (fail-closed):
    · capsReady = the /me/tickets/capabilities probe has settled — privileged
      verbs simply do not exist in the DOM before that.
    · canRule   = isAdmin OR the caller leads the row's team — the authority bar
      for declare / confirm-mi / decline-mi / de-escalate.
    · agent variant  → response verbs (ack/update/playbook/roster/impact/decision/
      link/bridge) render immediately (owner-tier, backend re-checks anyway);
      propose flips to a declare label for rulers; reclassify is direction-aware.
    · oversight variant → governance verbs only; NO ack. confirm/decline render
      ONLY on a pending, still-un-declared candidate the caller may rule on.
  Emits carry the row (reclassify carries { row, direction }) — hosts own the
  actual API calls + modals; busyId dims the rail while the host works this row.
*/
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ShieldCheck, MessageSquare, ListChecks, Crown, Target, Gavel, Link2, Flag, Siren,
  Radio, ArrowUpDown, ChevronsUp, FileText, ArrowRight, BadgeCheck, FlagOff,
  UserPlus, BellRing, Eye,
} from 'lucide-vue-next'
import { useCapabilities, fetchCapabilities, fetchMe, sevOf } from '@/composables/useSupportDesk'

const props = defineProps({
  row: { type: Object, required: true },
  variant: { type: String, default: 'agent' },      // 'agent' | 'oversight'
  busyId: { type: [String, Number], default: null }, // host is working this row
  // When false, the agent-variant OWNER-TIER verbs (ack/update/playbook/roster/
  // impact/decision/link/declare/promote) are withheld — the caller has decided the
  // viewer isn't an actor on this incident, so the backend would 403. Defaults to
  // true to preserve every existing caller's fail-open behavior; the timeline peek
  // opts in with an honest actor-tier check. (Oversight verbs already gate on canGovern.)
  canAct: { type: Boolean, default: true },
})
defineEmits([
  'ack', 'update', 'playbook', 'roster', 'impact', 'decision', 'link', 'propose',
  'declare', 'bridge', 'reclassify', 'escalate', 'sitrep', 'open', 'confirm-mi',
  'decline-mi', 'assign', 'nudge', 'watchers',
])

const caps = useCapabilities()
const me = ref(null)
onMounted(async () => { fetchCapabilities(); me.value = await fetchMe() })

const capsReady = computed(() => caps.checked)
const canRule = computed(() => caps.isAdmin
  || (!!props.row?.team_id && caps.leadTeamIds.includes(String(props.row.team_id))))
// Oversight mutations degrade to read-only for anyone who can't rule anything here.
const canGovern = computed(() => capsReady.value && (caps.isAdmin || canRule.value))
const sev = computed(() => props.row?.sev ?? sevOf(props.row))
const busy = computed(() => props.busyId != null && String(props.busyId) === String(props.row?.id))

const hov = { y: -2 }
const tap = { scale: 0.94 }
</script>

<style scoped>
/* neutral minimal glass — hosts restyle via :deep(.ivr-btn) */
.ivr { display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.ivr-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px;
  cursor: pointer; font: inherit; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: color 0.2s, border-color 0.2s, background 0.2s; }
.ivr-btn:hover { color: var(--sd-amber); border-color: var(--sd-amber-border, var(--sd-border-strong)); }
.ivr-btn.live { color: var(--sd-success, #34d399); }
.ivr-btn.warn { color: var(--sd-warning, #f59e0b); }
.ivr-btn.hot { color: var(--sd-amber); border-color: var(--sd-amber-border, var(--sd-border-strong)); }
.ivr-btn:disabled { opacity: 0.45; cursor: default; }
.ivr-btn:focus-visible { outline: 2px solid var(--sd-amber); outline-offset: 1px; }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .ivr-btn { background: rgba(255, 250, 240, 0.65); }
</style>
