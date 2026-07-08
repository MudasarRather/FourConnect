<template>
  <!-- Ticket "Dashboard" tab — two completely different consoles by panel:
       admin/agent → The Concourse (signage amber, split-flap) · employee → The Terminal (amber phosphor). -->
  <SdIntelDashboard
    v-if="isAdmin"
    :dashboard="dashboard"
    :loading="loading"
    @open="$emit('open', $event)"
    @new="$emit('new')"
    @go="$emit('go', $event)"
    @changed="$emit('changed')"
  />
  <SdSelfDashboard
    v-else
    :self-dashboard="selfDashboard"
    :ops-dashboard="dashboard"
    :agent-reveal="agentReveal"
    :loading="loading"
    @go="$emit('go', $event)"
    @changed="$emit('changed')"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SdIntelDashboard from './SdIntelDashboard.vue'
import SdSelfDashboard from './SdSelfDashboard.vue'

const props = defineProps({
  panel: { type: String, default: '' },          // 'admin' | 'employee'
  dashboard: { type: Object, default: null },     // ops dashboard (admin, or agent cockpit data)
  selfDashboard: { type: Object, default: null }, // personal dashboard (employee)
  agentReveal: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
defineEmits(['open', 'new', 'go', 'changed'])

const route = useRoute()
const isAdmin = computed(() => (props.panel ? props.panel === 'admin' : !route.path.startsWith('/user')))
</script>
