<template>
  <label class="hr-field-label" :for="forId">
    <span class="lbl-text">
      <slot>{{ label }}</slot>
      <span v-if="required" class="lbl-req" aria-hidden="true">●</span>
    </span>
    <!-- Helper slot is always rendered (with nbsp when empty) so adjacent
         fields stay vertically aligned across two-column rows. -->
    <span class="lbl-helper" :class="{ 'is-placeholder': !helper }">
      {{ helper || ' ' }}
    </span>
  </label>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  forId: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  helper: { type: String, default: '' },
})
</script>

<style scoped>
.hr-field-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
  user-select: none;
  cursor: default;
}
.lbl-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  line-height: 14px;
}
.lbl-req {
  color: var(--hr-accent-gold);
  font-size: 8px;
  line-height: 1;
}
.lbl-helper {
  font-size: 11px;
  color: var(--hr-text-dim);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  line-height: 14px;
  min-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Hide the placeholder visually but reserve its layout slot so two-column
   rows where only one field has a helper stay aligned. */
.lbl-helper.is-placeholder {
  visibility: hidden;
  pointer-events: none;
}
</style>
