<template>
  <div
    class="emp-avatar"
    :class="[`size-${size}`, { aurora: aurora, dim: !name && !avatarUrl }]"
    :style="seedStyle"
  >
    <img v-if="avatarUrl" :src="avatarUrl" :alt="name || 'Employee'" @error="onImageError" />
    <span v-else class="initials">{{ initials }}</span>
    <span v-if="aurora" class="aurora-ring" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  size: { type: String, default: 'md', validator: v => ['xs','sm','md','lg','xl'].includes(v) },
  aurora: { type: Boolean, default: false },
  seed: { type: [String, Number], default: '' },
})

const failed = ref(false)
const onImageError = () => { failed.value = true }
watch(() => props.avatarUrl, () => { failed.value = false })

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name
    .split(/\s+/)
    .filter(Boolean)
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

// Generate a stable hue from the seed (or name) so each employee gets a
// distinct background color when no avatar image is present.
const hue = computed(() => {
  const s = String(props.seed || props.name || 'emp')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfff
  return h % 360
})
const seedStyle = computed(() => {
  if (props.avatarUrl && !failed.value) return {}
  return {
    background: `linear-gradient(135deg, hsl(${hue.value}, 70%, 55%) 0%, hsl(${(hue.value + 40) % 360}, 65%, 45%) 100%)`,
  }
})
</script>

<style scoped>
.emp-avatar {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  user-select: none;
  transition: transform 280ms var(--hr-spring);
  perspective: 320px;
}
.emp-avatar:not(.aurora) { overflow: hidden; }
.emp-avatar.aurora:hover { transform: rotateZ(3deg) scale(1.03); }
.size-xs { width: 24px; height: 24px; font-size: 10px; }
.size-sm { width: 32px; height: 32px; font-size: 11px; }
.size-md { width: 40px; height: 40px; font-size: 13px; }
.size-lg { width: 56px; height: 56px; font-size: 17px; }
.size-xl { width: 88px; height: 88px; font-size: 26px; }

.emp-avatar img {
  width: 100%; height: 100%; object-fit: cover;
}

.emp-avatar.dim {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--hr-text-muted);
}

/* Subtle rotating conic-gradient ring for "aurora" treatment. */
.aurora-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background:
    conic-gradient(
      from 0deg,
      var(--hr-accent-gold) 0deg,
      var(--hr-orange) 90deg,
      transparent 180deg,
      var(--hr-amber) 270deg,
      var(--hr-accent-gold) 360deg
    );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
  animation: hr-rotate-conic 12s linear infinite;
  pointer-events: none;
  opacity: 0.95;
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.35));
}
</style>
