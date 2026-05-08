<template>
  <span>{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 1500
  }
})

const displayValue = ref(0)
let animationFrameId = null

const animateValue = (start, end, duration) => {
  let startTimestamp = null
  
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp
    const progress = Math.min((timestamp - startTimestamp) / duration, 1)
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.floor(easeProgress * (end - start) + start)
    
    if (progress < 1) {
      animationFrameId = window.requestAnimationFrame(step)
    } else {
      displayValue.value = end
    }
  }
  
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = window.requestAnimationFrame(step)
}

watch(() => props.value, (newVal, oldVal) => {
  animateValue(oldVal || 0, newVal, props.duration)
})

onMounted(() => {
  if (props.value > 0) {
    animateValue(0, props.value, props.duration)
  }
})
</script>
