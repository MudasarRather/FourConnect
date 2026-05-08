<template>
  <div class="bento-grid">
    <!-- Row 1 -->
    <div class="grid-item span-1 animate-enter" style="animation-delay: 0s">
      <CardTeam :team="team" :ownerName="project?.created_by_name" />
    </div>

    <div class="grid-item span-1 animate-enter" style="animation-delay: 0.1s">
       <CardBudget 
          :amount="project?.budget_amount" 
          :currency="project?.currency" 
          :type="project?.budget_type"
          :milestones="milestones" 
          :usedAmountOverride="project?.budget_utilized"
       />
    </div>

    <div class="grid-item span-2 animate-enter" style="animation-delay: 0.2s">
       <CardActivity :projectId="project?.id" />
    </div>

    <!-- Row 2 -->
    <div class="grid-item span-2 animate-enter" style="animation-delay: 0.3s">
       <CardFiles :project="project" :milestones="milestones" />
    </div>

    <!-- NEW: Budget Velocity Chart -->
    <div class="grid-item span-2 animate-enter" style="animation-delay: 0.4s">
       <CardBurnChart 
          :project="project" 
          :milestones="milestones" 
          :utilizedAmount="project?.budget_utilized"
       />
    </div>
  </div>
</template>

<script setup>
import CardTeam from './CardTeam.vue'
import CardBudget from './CardBudget.vue'
import CardFiles from './CardFiles.vue'
import CardActivity from './CardActivity.vue'
import CardBurnChart from './CardBurnChart.vue'

defineProps({
  project: Object,
  team: Array,
  milestones: Array // Added prop
})
</script>

<style scoped>
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  grid-auto-rows: 260px;
}

.span-2 { grid-column: span 2; }

.grid-item { height: 100%; display: flex; flex-direction: column; }
.grid-item > * { flex: 1; }

.animate-enter {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1200px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .span-2 { grid-column: span 2; }
}

@media (max-width: 768px) {
  .bento-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: 1; }
}
</style>
