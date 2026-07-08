<template>
  <SdModalShell :open="open" eyebrow="TEAM COMMAND · REBALANCE" :title="`Rebalance ${team?.name || 'the queue'}`"
    width="520px" @close="$emit('close')">
    <div class="rb">
      <!-- confirm state -->
      <template v-if="!result">
        <div class="rb-brief">
          <span class="rb-big sd-mono"><SdCountUp :value="team?.unassigned ?? 0" /></span>
          <div>
            <p class="rb-line">unowned ticket{{ (team?.unassigned ?? 0) === 1 ? '' : 's' }} sitting in this team's queue.</p>
            <p class="rb-sub">Most urgent first (breached → soonest due → priority → age), spread
              {{ team?.assignment_method === 'load_balanced' ? 'to whoever carries the least' : 'round-robin across the crew' }}.
              Every move is audited and the agent is notified.</p>
          </div>
        </div>
        <div class="rb-meta sd-mono">
          <span><i>METHOD</i><b>{{ team?.assignment_method === 'load_balanced' ? 'LOAD-BALANCED' : 'ROUND-ROBIN' }}</b></span>
          <span><i>CREW</i><b>{{ team?.agent_count ?? 0 }}</b></span>
          <span><i>CAP / RUN</i><b>50</b></span>
        </div>
        <SdGuardNotice :error="guardErr" />
      </template>

      <!-- result state: the moves, dealt in -->
      <template v-else>
        <p class="rb-done"><CircleCheck :size="15" /> {{ result.assigned }} ticket{{ result.assigned === 1 ? '' : 's' }} rebalanced
          ({{ result.method === 'load_balanced' ? 'load-balanced' : 'round-robin' }}){{ result.skipped ? ` · ${result.skipped} left for the next pass` : '' }}.</p>
        <ul class="rb-moves">
          <Motion v-for="(a, i) in result.assignments" :key="a.ticket_id" as="li"
            :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }">
            <span class="rb-no sd-mono">{{ a.ticket_number }}</span>
            <ArrowRight :size="12" class="rb-arrow" />
            <span class="rb-agent">{{ a.agent_name }}</span>
          </Motion>
        </ul>
      </template>
    </div>
    <template #footer>
      <template v-if="!result">
        <button class="rb-btn" @click="$emit('close')">Cancel</button>
        <button class="rb-btn primary" :disabled="busy || !(team?.unassigned > 0)" @click="run">
          <component :is="busy ? LoaderCircle : Shuffle" :size="14" :class="{ 'rb-spin': busy }" />
          {{ busy ? 'Rebalancing…' : `Rebalance ${team?.unassigned ?? 0}` }}
        </button>
      </template>
      <button v-else class="rb-btn primary" @click="$emit('done', result)">Done</button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdTeamRebalanceModal — admin rebalance ceremony over POST /teams/{id}/rebalance
   (the audited distribute single-writer). Confirm → run → the move list deals in. */
import { ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { Shuffle, LoaderCircle, CircleCheck, ArrowRight } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdCountUp from '../components/SdCountUp.vue'
import SdGuardNotice from '../components/SdGuardNotice.vue'
import { rebalanceTeam } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  team: { type: Object, default: null },              // overview card
})
const emit = defineEmits(['close', 'done'])

const busy = ref(false)
const result = ref(null)
const guardErr = ref(null)

watch(() => props.open, (v) => { if (v) { result.value = null; guardErr.value = null } })

const run = async () => {
  if (!props.team) return
  busy.value = true; guardErr.value = null
  try {
    result.value = await rebalanceTeam(props.team.id, { max_tickets: 50 })
  } catch (e) {
    guardErr.value = e?.response?.data?.detail || 'Rebalance failed.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.rb { display: flex; flex-direction: column; gap: 13px; }
.rb-brief { display: flex; align-items: flex-start; gap: 14px; }
.rb-big { font-size: 40px; font-weight: 800; line-height: 1; color: var(--sd-team-core); }
.rb-line { margin: 2px 0 5px; font-size: 14px; font-weight: 700; color: var(--sd-text); }
.rb-sub { margin: 0; font-size: 12px; line-height: 1.55; color: var(--sd-text-muted); }
.rb-meta { display: flex; gap: 18px; padding: 10px 13px; border-radius: 12px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.rb-meta span { display: flex; flex-direction: column; gap: 2px; }
.rb-meta i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.rb-meta b { font-size: 12px; font-weight: 800; color: var(--sd-text); }
.rb-done { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 13.5px; font-weight: 700; color: var(--sd-team-sync); }
.rb-moves { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow: auto;
  display: flex; flex-direction: column; gap: 6px; }
.rb-moves li { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.rb-no { font-size: 11px; font-weight: 700; color: var(--sd-team-core); }
.rb-arrow { color: var(--sd-text-dim); }
.rb-agent { font-size: 12.5px; font-weight: 650; color: var(--sd-text); }
.rb-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px;
  font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.rb-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; }
.rb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rb-spin { animation: rb-rot 1s linear infinite; }
@keyframes rb-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .rb-spin { animation: none; } }
</style>
