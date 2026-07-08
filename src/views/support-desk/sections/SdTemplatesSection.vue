<!-- Ticket Templates — PANEL-SPLIT dispatcher (SdTeamTicketsSection precedent).
     supportModules.js keeps ONE 'templates' tool entry serving both panels:
       · admin    → SdTemplateStudioSection — the cinematic "Copperplate Studio"
       · employee → SdTemplatesEmployeeSection — the pre-studio page, byte-identical
                    (the user portal gets its own redesign later; do not touch it here)
-->
<template>
  <SdTemplateStudioSection v-if="isAdmin" :panel="panel" :agent-reveal="agentReveal" v-bind="$attrs" />
  <SdTemplatesEmployeeSection v-else :panel="panel" :agent-reveal="agentReveal" v-bind="$attrs" />
</template>

<script setup>
import { computed } from 'vue'
import SdTemplateStudioSection from './SdTemplateStudioSection.vue'
import SdTemplatesEmployeeSection from './SdTemplatesEmployeeSection.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({ panel: { type: String, default: 'admin' }, agentReveal: { type: Boolean, default: false } })
const isAdmin = computed(() => props.panel === 'admin')
</script>
