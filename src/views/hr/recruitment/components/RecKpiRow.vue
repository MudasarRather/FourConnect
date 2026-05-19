<template>
  <div class="rec-kpi-row" :class="{ 'is-readonly': readonly }">
    <KpiChip
      v-for="chip in chips"
      :key="chip.key"
      :label="chip.label"
      :value="chip.value"
      :helper="chip.helper"
      :suffix="chip.suffix"
      :tone="chip.tone || 'neutral'"
      :active="!readonly && active === chip.key"
      :bar-total="chip.barTotal"
      :animate="true"
      @click="!readonly && $emit('select', chip.key)"
    >
      <template v-if="chip.icon" #icon>
        <component :is="chip.icon" :size="14" />
      </template>
    </KpiChip>
  </div>
</template>

<script setup>
import KpiChip from '../../../../components/hr/KpiChip.vue'

defineProps({
  chips: { type: Array, required: true },  // [{ key, label, value, icon, tone, helper, suffix, barTotal }]
  active: { type: [String, Number, null], default: null },
  readonly: { type: Boolean, default: false },
})
defineEmits(['select'])
</script>

<style scoped>
.rec-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.rec-kpi-row.is-readonly :deep(.kpi-chip) { cursor: default; }
</style>
