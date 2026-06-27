<template>
  <header class="sd-hero" :class="`sd-hero--${variant}`">
    <!-- Liquid Triage Basin backdrop -->
    <div class="sd-hero-basin">
      <SdBasinCanvas
        :priority-counts="priorityCounts"
        :breach="breach"
        :height="basinHeight"
        :intensity="0.92"
      />
    </div>

    <!-- Console overlay -->
    <div class="sd-hero-inner">
      <div class="sd-hero-head">
        <Motion
          as="p"
          class="sd-eyebrow"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="sd-eyebrow-dot" />{{ eyebrow }}
        </Motion>
        <Motion
          as="h1"
          class="sd-title"
          :initial="{ opacity: 0, y: 16 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }"
        >{{ title }}</Motion>
        <Motion
          as="p"
          class="sd-subtitle"
          :initial="{ opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }"
        >{{ subtitle }}</Motion>

        <div v-if="actions.length" class="sd-hero-cta">
          <Motion
            v-for="(a, i) in actions"
            :key="a.key"
            as="button"
            type="button"
            class="sd-cta"
            :class="{ 'sd-cta--primary': i === 0 }"
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :while-hover="{ y: -2, scale: 1.02 }"
            :while-tap="{ scale: 0.97 }"
            :transition="{ duration: 0.4, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
            @click="$emit('action', a.key)"
          >
            <component :is="a.icon" v-if="a.icon" :size="15" />
            <span>{{ a.label }}</span>
          </Motion>
        </div>
      </div>

      <!-- Telemetry lenses -->
      <div class="sd-lenses" role="list">
        <Motion
          v-for="(m, i) in metrics"
          :key="m.key"
          as="button"
          type="button"
          role="listitem"
          class="sd-lens"
          :style="{ '--lens-accent': m.color }"
          :initial="{ opacity: 0, y: 14 }"
          :animate="{ opacity: 1, y: 0 }"
          :while-hover="{ y: -3 }"
          :while-tap="{ scale: 0.97 }"
          :transition="{ duration: 0.45, delay: 0.12 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
          @click="m.go && $emit('go', m.go)"
        >
          <span class="sd-lens-ico"><component :is="m.icon" v-if="m.icon" :size="16" /></span>
          <span class="sd-lens-body">
            <span class="sd-lens-val">{{ loading ? '—' : m.value }}</span>
            <span class="sd-lens-label">{{ m.label }}</span>
          </span>
        </Motion>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import SdBasinCanvas from './SdBasinCanvas.vue'

const props = defineProps({
  eyebrow: { type: String, default: 'SUPPORT DESK' },
  title: { type: String, default: 'Triage Basin' },
  subtitle: { type: String, default: 'Every ticket, in motion — from intake to resolution.' },
  metrics: { type: Array, default: () => [] },
  actions: { type: Array, default: () => [] },
  priorityCounts: { type: Object, default: () => ({}) },
  breach: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  variant: { type: String, default: 'admin' }, // 'admin' | 'user'
})

defineEmits(['go', 'action'])

const basinHeight = computed(() => (props.variant === 'user' ? 220 : 300))
</script>

<style scoped>
.sd-hero {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--sd-border);
  background: var(--sd-panel);
  box-shadow: var(--sd-shadow);
  margin: 4px 0 18px;
  isolation: isolate;
}
.sd-hero-basin { position: absolute; inset: 0; z-index: 0; }
.sd-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 30px 32px 26px;
  min-height: var(--hero-min, 300px);
  justify-content: space-between;
}
.sd-hero--user .sd-hero-inner { min-height: 220px; padding: 24px 26px 22px; }

.sd-hero-head { max-width: 640px; }
.sd-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--sd-mono);
  font-size: 11px; font-weight: 700; letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--sd-amber);
  margin: 0 0 10px;
}
.sd-eyebrow-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-ember);
  box-shadow: 0 0 10px var(--sd-fluid-glow);
  animation: sd-pulse-ring 2.4s ease-out infinite;
}
.sd-title {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.02;
  margin: 0 0 10px;
  background: var(--sd-grad-hero);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.sd-subtitle {
  font-size: 14.5px;
  color: var(--sd-text-secondary);
  margin: 0;
  max-width: 52ch;
}

.sd-hero-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.sd-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--sd-border-strong);
  background: rgba(255, 255, 255, 0.04);
  color: var(--sd-text);
  backdrop-filter: blur(8px);
  transition: border-color 0.25s var(--sd-spring), background 0.25s var(--sd-spring);
}
.sd-cta:hover { border-color: var(--sd-amber-border); }
.sd-cta--primary {
  border: none;
  background: var(--sd-grad-hero);
  color: #1a1206;
  box-shadow: 0 8px 24px rgba(251, 146, 60, 0.28);
}
[data-theme="light"] .sd-cta { background: rgba(40, 25, 10, 0.05); }
[data-theme="light"] .sd-cta--primary { color: #fff8ec; }

/* Telemetry lenses */
.sd-lenses {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
  gap: 10px;
}
.sd-lens {
  display: flex; align-items: center; gap: 11px;
  padding: 12px 14px;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--sd-border);
  background: var(--sd-surface-glass);
  backdrop-filter: blur(14px);
  transition: border-color 0.25s var(--sd-spring), box-shadow 0.25s var(--sd-spring);
}
.sd-lens:hover {
  border-color: color-mix(in srgb, var(--lens-accent) 45%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lens-accent) 30%, transparent),
              0 10px 26px rgba(0, 0, 0, 0.3);
}
.sd-lens-ico {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 9px;
  color: var(--lens-accent);
  background: color-mix(in srgb, var(--lens-accent) 14%, transparent);
  flex-shrink: 0;
}
.sd-lens-body { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
.sd-lens-val { font-size: 20px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sd-lens-label { font-size: 11px; color: var(--sd-text-muted); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 720px) {
  .sd-hero-inner { padding: 22px 18px; }
  .sd-lenses { grid-template-columns: repeat(2, 1fr); }
}
</style>
