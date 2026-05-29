<template>
  <Motion as="div" class="aes-empty" :class="[`tone-${tone}`]"
    :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
  >
    <span class="aes-aurora" aria-hidden="true" />

    <div class="aes-illustration" aria-hidden="true">
      <!-- Floating punch-card ticket — signature of the attendance module -->
      <svg viewBox="0 0 80 80" class="aes-ticket">
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stop-color="#fde68a" />
            <stop offset="50%"  stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#fb923c" />
          </linearGradient>
        </defs>
        <rect x="14" y="20" width="52" height="40" rx="4" :fill="`url(#${gradId})`"
          stroke="rgba(180, 83, 9, 0.55)" stroke-width="1.2" />
        <!-- perforation dots -->
        <g fill="rgba(180, 83, 9, 0.55)">
          <circle cx="20" cy="26" r="1" /><circle cx="20" cy="32" r="1" />
          <circle cx="20" cy="38" r="1" /><circle cx="20" cy="44" r="1" />
          <circle cx="20" cy="50" r="1" /><circle cx="20" cy="56" r="1" />
        </g>
        <!-- ticket text lines -->
        <line x1="28" y1="30" x2="58" y2="30" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
        <line x1="28" y1="36" x2="50" y2="36" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
        <line x1="28" y1="42" x2="54" y2="42" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
        <!-- mini clock face -->
        <circle cx="60" cy="52" r="6" fill="rgba(255, 255, 255, 0.55)" stroke="#1f1408" stroke-width="0.8" />
        <line class="aes-clock-min" x1="60" y1="52" x2="60" y2="48" stroke="#1f1408" stroke-width="1.2" stroke-linecap="round" />
        <line class="aes-clock-hr"  x1="60" y1="52" x2="63" y2="52" stroke="#1f1408" stroke-width="0.9" stroke-linecap="round" />
        <circle cx="60" cy="52" r="0.7" fill="#1f1408" />
      </svg>

      <!-- Optional module icon overlay — sits at top-left of the ticket so the
           empty state still feels specific to its section. -->
      <span v-if="icon" class="aes-icon-pill">
        <component :is="icon" :size="14" />
      </span>

      <span class="aes-ring r1" />
      <span class="aes-ring r2" />
      <span class="aes-ring r3" />
    </div>

    <h3 class="aes-title">{{ title }}</h3>
    <p v-if="sub" class="aes-sub">{{ sub }}</p>
    <div v-if="meta" class="aes-meta">
      <span class="aes-meta-dot" />
      {{ meta }}
    </div>

    <div v-if="$slots.actions" class="aes-actions">
      <slot name="actions" />
    </div>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'

const props = defineProps({
  title: { type: String, required: true },
  sub:   { type: String, default: '' },
  meta:  { type: String, default: '' },
  icon:  { type: [Object, Function], default: null },
  tone:  { type: String, default: 'gold' },
})

const gradId = `aes-grad-${Math.random().toString(36).slice(2, 9)}`
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.aes-empty {
  position: relative;
  padding: 50px 30px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  color: var(--hr-text-secondary);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  border-radius: 18px;
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(251, 191, 36, 0.08), transparent 60%),
    rgba(20, 16, 14, 0.35);
  overflow: hidden;
  backdrop-filter: blur(12px);
  isolation: isolate;
}
.aes-empty.tone-teal {
  border-color: rgba(20, 184, 166, 0.30);
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(20, 184, 166, 0.10), transparent 60%),
    rgba(20, 16, 14, 0.35);
}
.aes-empty.tone-warm {
  border-color: rgba(234, 88, 12, 0.34);
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(234, 88, 12, 0.10), transparent 60%),
    rgba(20, 16, 14, 0.35);
}

.aes-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(251, 146, 60, 0.16), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(20, 184, 166, 0.12), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
.aes-empty > *:not(.aes-aurora) { position: relative; z-index: 1; }

.aes-illustration {
  position: relative;
  width: 120px; height: 120px;
  display: flex; align-items: center; justify-content: center;
}
.aes-ticket {
  width: 100%; height: 100%;
  animation: aes-ticket-float 6s ease-in-out infinite;
  filter: drop-shadow(0 8px 16px rgba(234, 88, 12, 0.35));
}
@keyframes aes-ticket-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-6px) rotate(3deg); }
}
.aes-clock-min {
  transform-origin: 60px 52px;
  animation: att-hand-sweep-slow 30s linear infinite;
}
.aes-clock-hr {
  transform-origin: 60px 52px;
  animation: att-hand-sweep-slow 360s linear infinite;
}
.aes-icon-pill {
  position: absolute; top: 8px; left: 8px;
  width: 28px; height: 28px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(28, 22, 18, 0.92), rgba(20, 16, 14, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.55);
  color: var(--att-yellow-200);
  box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  z-index: 2;
}
.aes-ring {
  position: absolute; top: 50%; left: 50%;
  width: 100px; height: 100px; border-radius: 50%;
  border: 1.4px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.aes-ring.r1 { animation-delay: 0s; }
.aes-ring.r2 { animation-delay: 1.3s; }
.aes-ring.r3 { animation-delay: 2.6s; }

.aes-title {
  margin: 6px 0 0;
  font-size: 15px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--hr-text);
  text-align: center;
}
.aes-sub {
  margin: 0; font-size: 12px; color: var(--hr-text-muted);
  max-width: 460px; line-height: 1.55; text-align: center;
}
.aes-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 4px;
  padding: 4px 12px; border-radius: 999px;
  background: var(--att-success-soft);
  border: 1px solid var(--att-success-border-soft);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: var(--att-success-100); text-transform: uppercase;
}
.aes-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-success-100);
  box-shadow: 0 0 6px var(--att-success-100);
  animation: att-live-pulse 2s ease-in-out infinite;
}
.aes-actions {
  margin-top: 10px;
  display: inline-flex; flex-wrap: wrap; gap: 8px; justify-content: center;
}

/* ════════════ LIGHT THEME ════════════ */
[data-theme="light"] .aes-empty {
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(217, 119, 6, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.30);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .aes-empty.tone-teal {
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(13, 148, 136, 0.12), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.32);
}
[data-theme="light"] .aes-empty.tone-warm {
  background:
    radial-gradient(80% 80% at 50% 20%, rgba(194, 65, 12, 0.12), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(194, 65, 12, 0.34);
}
[data-theme="light"] .aes-aurora {
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(217, 119, 6, 0.18), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(234, 88, 12, 0.14), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(13, 148, 136, 0.10), transparent 60%);
}
[data-theme="light"] .aes-icon-pill {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.92), rgba(255, 246, 226, 0.96));
  border-color: rgba(180, 83, 9, 0.45);
  color: var(--att-orange-500);
}
[data-theme="light"] .aes-ring { border-color: rgba(180, 83, 9, 0.45); }
[data-theme="light"] .aes-title { color: var(--hr-text); }
[data-theme="light"] .aes-sub { color: var(--hr-text-muted); }
[data-theme="light"] .aes-meta {
  background: rgba(13, 148, 136, 0.14);
  border-color: rgba(13, 148, 136, 0.36);
  color: var(--att-success-500);
}
[data-theme="light"] .aes-meta-dot {
  background: var(--att-success-500);
  box-shadow: 0 0 6px var(--att-success-500);
}

@media (prefers-reduced-motion: reduce) {
  .aes-ticket, .aes-clock-min, .aes-clock-hr, .aes-ring, .aes-aurora, .aes-meta-dot {
    animation: none !important;
  }
}
</style>
