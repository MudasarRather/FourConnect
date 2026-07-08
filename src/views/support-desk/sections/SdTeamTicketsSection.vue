<template>
  <!-- Panel dispatcher — the ONLY job of this file. Both desks are self-contained:
       EMPLOYEE panel → the cinematic "Squad Command" Team Ops desk (team-sealed via
       /me/tickets/team-queue). ADMIN panel → the cinematic "Team Command" oversight
       desk (sealed /teams/overview + /teams/{id}/* — fleet board, drill, guarded CRUD). -->
  <SdTeamOpsSection v-if="!isAdmin" :agent-reveal="agentReveal"
    @open="emit('open', $event)" @go="emit('go', $event)" @changed="emit('changed')" @new="emit('new')" />
  <SdTeamCommandSection v-else
    @open="emit('open', $event)" @go="emit('go', $event)" @changed="emit('changed')" @new="emit('new')" />
</template>

<script setup>
import { computed } from 'vue'
import SdTeamOpsSection from './SdTeamOpsSection.vue'
import SdTeamCommandSection from './SdTeamCommandSection.vue'

const props = defineProps({ panel: { type: String, default: 'admin' }, agentReveal: { type: Boolean, default: false } })
const emit = defineEmits(['open', 'go', 'changed', 'new'])
const isAdmin = computed(() => props.panel === 'admin')
</script>
