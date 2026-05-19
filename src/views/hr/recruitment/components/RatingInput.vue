<template>
  <div class="rating-input">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      :class="['star', n <= (modelValue || 0) && 'active']"
      @click="set(n)"
    >
      <Star :size="18" :fill="n <= (modelValue || 0) ? '#fbbf24' : 'transparent'" :stroke="n <= (modelValue || 0) ? '#fbbf24' : '#6b7280'" />
    </button>
  </div>
</template>

<script setup>
import { Star } from 'lucide-vue-next'
const props = defineProps({ modelValue: { type: Number, default: null } })
const emit = defineEmits(['update:modelValue'])
const set = (n) => emit('update:modelValue', n === props.modelValue ? null : n)
</script>

<style scoped>
.rating-input { display: inline-flex; gap: 4px; }
.star {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  transition: transform 180ms var(--rec-spring);
}
.star:hover { transform: scale(1.18); }
</style>
