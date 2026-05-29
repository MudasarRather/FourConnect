<template>
  <Motion as="section" class="att-ph"
    :initial="{ opacity: 0, scale: 0.94 }"
    :animate="{ opacity: 1, scale: 1 }"
    :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
  >
    <div class="att-ph-aurora" aria-hidden="true" />
    <div class="att-ph-grid" aria-hidden="true" />
    <Motion as="div" class="att-ph-mark"
      :initial="{ y: 8, opacity: 0 }"
      :animate="{ y: 0, opacity: 1 }"
      :transition="{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
    >
      <component :is="icon" :size="26" />
      <span class="att-ph-mark-ring" />
      <span class="att-ph-mark-ring att-ph-mark-ring-2" />
    </Motion>

    <Motion as="span" class="att-eyebrow"
      :initial="{ opacity: 0, y: -4 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.18 }"
    >
      <span class="att-eyebrow-dot" /> {{ eyebrow }}
    </Motion>

    <Motion as="h2" class="att-ph-title"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }"
    >
      {{ title }}
    </Motion>

    <Motion as="p" class="att-ph-sub"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :transition="{ duration: 0.55, delay: 0.32 }"
    >
      {{ phase }} — visual layer landing in a follow-up wave. The shell, theme tokens, and audit log are already wired so this surface gets full fidelity when its data model lands.
    </Motion>

    <Motion as="div" class="att-ph-progress"
      :initial="{ opacity: 0, y: 6 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.42 }"
    >
      <span class="att-ph-progress-track">
        <span class="att-ph-progress-fill" />
      </span>
      <span class="att-ph-progress-label">In design · animated wireframe shipping next</span>
    </Motion>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Sparkles } from 'lucide-vue-next'

defineProps({
  title: { type: String, default: 'Coming soon' },
  eyebrow: { type: String, default: 'Attendance · Phase 2' },
  phase: { type: String, default: 'Phase 2.X' },
  icon: { type: [Object, Function], default: () => Sparkles },
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-ph {
  position: relative; overflow: hidden;
  margin: 24px auto; max-width: 720px;
  padding: 56px 36px 52px;
  display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(20, 184, 166, 0.12), transparent 62%),
    var(--att-glass);
  border: 1px dashed var(--att-teal-border-soft);
  border-radius: 28px;
  backdrop-filter: var(--att-glass-blur);
  -webkit-backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
}
.att-ph-aurora {
  position: absolute; inset: -40% -10% auto -10%;
  height: 380px; pointer-events: none; opacity: 0.55;
  background:
    radial-gradient(40% 40% at 20% 50%, var(--att-teal-200), transparent 70%),
    radial-gradient(45% 45% at 70% 30%, var(--att-yellow-300), transparent 70%),
    radial-gradient(45% 45% at 80% 80%, var(--att-orange-200), transparent 70%);
  filter: blur(60px);
  animation: att-aurora 14s ease-in-out infinite;
}
.att-ph-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background-image:
    linear-gradient(rgba(20, 184, 166, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 184, 166, 0.06) 1px, transparent 1px);
  background-size: 36px 36px;
  -webkit-mask: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 90%);
          mask: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 90%);
}

.att-ph-mark {
  position: relative; z-index: 1;
  width: 72px; height: 72px; border-radius: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--att-teal-soft);
  color: var(--att-teal-100);
  border: 1px solid var(--att-teal-border-soft);
  box-shadow: 0 22px 50px -22px rgba(20, 184, 166, 0.55);
}
.att-ph-mark-ring {
  position: absolute; inset: -6px; border-radius: 26px;
  border: 1.5px solid rgba(20, 184, 166, 0.45);
  animation: att-pulse-rings 3.2s ease-out infinite;
  pointer-events: none;
}
.att-ph-mark-ring-2 { animation-delay: 1.6s; }

.att-eyebrow {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--att-teal-100);
}
.att-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--att-orange-200);
  box-shadow: 0 0 0 0 currentColor;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}

.att-ph-title {
  position: relative; z-index: 1;
  margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.025em;
  background: var(--att-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 8s ease-in-out infinite;
}

.att-ph-sub {
  position: relative; z-index: 1;
  margin: 0; max-width: 480px;
  font-size: 13px; line-height: 1.65;
  color: var(--hr-text-secondary);
}

.att-ph-progress {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  margin-top: 6px;
}
.att-ph-progress-track {
  width: 220px; height: 4px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  overflow: hidden; position: relative;
}
.att-ph-progress-fill {
  position: absolute; inset: 0;
  background: var(--att-gradient-flow);
  background-size: 200% 100%;
  animation: att-gradient-flow 3s linear infinite;
}
.att-ph-progress-label {
  font-size: 10.5px; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
}

/* ════════════ LIGHT THEME OVERRIDES ════════════ */
[data-theme="light"] .att-ph {
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(13, 148, 136, 0.12), transparent 62%),
    var(--att-glass);
  border-color: rgba(13, 148, 136, 0.36);
}
[data-theme="light"] .att-ph-mark {
  background: var(--att-teal-soft);
  color: var(--att-teal-400);
  border-color: var(--att-teal-border-soft);
}
[data-theme="light"] .att-eyebrow { color: var(--att-teal-400); }
[data-theme="light"] .att-ph-grid {
  background-image:
    linear-gradient(rgba(13, 148, 136, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 148, 136, 0.08) 1px, transparent 1px);
}
</style>
