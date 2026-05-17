<template>
  <div class="detail-row" :class="{ 'is-editing': editing }">
    <span class="row-label">{{ label }}</span>
    <span class="row-leader" aria-hidden="true" />
    <slot name="value">
      <span class="row-value" :class="{ muted: !value }">
        {{ value || placeholder }}
      </span>
    </slot>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number, null], default: '' },
  placeholder: { type: String, default: '—' },
  editing: { type: Boolean, default: false },
})
</script>

<style scoped>
.detail-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 0;
  font-size: 13px;
  min-height: 34px;
}
.row-label {
  color: var(--hr-text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  min-width: 100px;
}
.row-leader {
  flex: 1;
  height: 1px;
  background-image: linear-gradient(to right, var(--hr-border) 50%, transparent 0%);
  background-size: 6px 1px;
  background-repeat: repeat-x;
  align-self: center;
  opacity: 0.7;
}
.row-value {
  color: var(--hr-text);
  font-size: 13px;
  font-weight: 500;
  text-align: right;
}
.row-value.muted { color: var(--hr-text-dim); font-weight: 400; }

.detail-row.is-editing { padding: 4px 0; }
.detail-row.is-editing .row-leader { display: none; }
.detail-row.is-editing .row-label { min-width: 100px; }
</style>
