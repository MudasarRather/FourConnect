<template>
  <Motion as="article" class="att-kpi" :style="{ '--accent': tone }"
    :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    :whileHover="{ y: -3 }"
    @click="$emit('click')"
  >
    <header class="kpi-head">
      <span class="kpi-icon"><component :is="icon" :size="14" /></span>
      <span class="kpi-label">{{ label }}</span>
    </header>
    <div class="kpi-value">
      <OnbAnimatedNumber :value="value || 0" />
    </div>
    <footer class="kpi-foot">
      <span v-if="sub" class="kpi-sub">{{ sub }}</span>
      <span v-if="delta != null" class="kpi-delta" :class="{ neg: delta < 0, pos: delta > 0 }">
        <component :is="delta < 0 ? ArrowDownRight : ArrowUpRight" :size="11" />
        {{ Math.abs(delta) }}%
      </span>
    </footer>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { ArrowUpRight, ArrowDownRight } from 'lucide-vue-next'
import OnbAnimatedNumber from '../../onboarding/components/OnbAnimatedNumber.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  sub:   { type: String, default: '' },
  delta: { type: Number, default: null },
  icon:  { type: [Object, Function], required: true },
  tone:  { type: String, default: '#14b8a6' },
})
defineEmits(['click'])
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-kpi {
  position: relative; overflow: hidden; isolation: isolate;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  backdrop-filter: var(--att-glass-blur);
  -webkit-backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
  cursor: pointer;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color .25s var(--att-spring), transform .25s var(--att-spring), box-shadow .25s var(--att-spring);
}
.att-kpi::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%);
}
.att-kpi:hover {
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  box-shadow: var(--att-glass-shadow-hi);
}

.kpi-head { display: inline-flex; align-items: center; gap: 8px; }
.kpi-icon {
  width: 26px; height: 26px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}
.kpi-label {
  font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.kpi-value {
  font-size: 38px; font-weight: 800; letter-spacing: -0.025em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 1;
}
.kpi-foot { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.kpi-sub { font-size: 11px; color: var(--hr-text-muted); }
.kpi-delta {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10.5px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.16); color: var(--att-teal-100);
}
.kpi-delta.pos { background: rgba(20, 184, 166, 0.18); color: #5eead4; }
.kpi-delta.neg { background: rgba(234, 88, 12, 0.18); color: #fb923c; }

[data-theme="light"] .att-kpi {
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 65%),
    rgba(255, 250, 240, 0.85);
  border-color: color-mix(in srgb, var(--accent) 38%, rgba(40, 25, 10, 0.10));
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .att-kpi:hover {
  border-color: color-mix(in srgb, var(--accent) 62%, rgba(40, 25, 10, 0.10));
  box-shadow:
    0 28px 60px -28px color-mix(in srgb, var(--accent) 40%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .kpi-icon {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}
[data-theme="light"] .kpi-delta.pos { background: rgba(13, 148, 136, 0.16); color: var(--att-teal-500); }
[data-theme="light"] .kpi-delta.neg { background: rgba(194, 65, 12, 0.16); color: var(--att-orange-500); }
[data-theme="light"] .kpi-value { color: var(--hr-text); }
</style>
