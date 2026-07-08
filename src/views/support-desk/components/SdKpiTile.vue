<template>
  <!-- Outer shell runs the entrance; inner runs the 3D tilt (they never fight). -->
  <div class="sd-kt-shell" :style="{ '--i': index }">
    <component
      :is="clickable ? 'button' : 'div'"
      ref="el"
      class="sd-kt"
      :class="{ live, clickable }"
      :style="{ '--ac': accent, '--sd-count-glow': accent }"
      :type="clickable ? 'button' : undefined"
      @pointermove="onMove"
      @pointerleave="onLeave"
      @click="clickable && $emit('activate')"
    >
      <span class="sd-kt-spine" aria-hidden="true" />
      <span class="sd-kt-glare" aria-hidden="true" />
      <span class="sd-kt-sheen" aria-hidden="true" />

      <span class="sd-kt-head">
        <span class="sd-kt-ico"><component :is="icon" :size="17" /></span>
        <span v-if="live" class="sd-kt-live" aria-hidden="true"><i /></span>
      </span>

      <span class="sd-kt-val">
        <SdCountUp :value="Number(value) || 0" :decimals="decimals" :suffix="suffix" />
      </span>
      <span class="sd-kt-label">{{ label }}</span>
      <span v-if="sub" class="sd-kt-sub">{{ sub }}</span>
    </component>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SdCountUp from './SdCountUp.vue'

defineProps({
  icon: { type: [Object, Function], default: null },
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  accent: { type: String, default: 'var(--sd-amber)' },
  sub: { type: String, default: '' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
  live: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
})
defineEmits(['activate'])

const el = ref(null)
const onMove = (e) => {
  const node = el.value?.$el || el.value; if (!node) return
  const r = node.getBoundingClientRect()
  node.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  node.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  node.style.setProperty('--spot', '1')
}
const onLeave = () => {
  const node = el.value?.$el || el.value; if (!node) return
  node.style.setProperty('--spot', '0'); node.style.setProperty('--mx', '0.5'); node.style.setProperty('--my', '0.5')
}
</script>

<style scoped>
.sd-kt-shell { animation: sd-deal 0.55s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }

.sd-kt {
  position: relative; width: 100%; display: flex; flex-direction: column; gap: 4px;
  padding: 16px 16px 15px; border-radius: 18px; overflow: hidden; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.28s var(--sd-spring), box-shadow 0.28s var(--sd-spring), transform 0.32s var(--sd-spring);
  transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg));
  transform-style: preserve-3d;
}
.sd-kt.clickable { cursor: pointer; }
.sd-kt::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--ac) 12%, transparent), transparent 58%); opacity: 0.85; }
.sd-kt:hover {
  border-color: color-mix(in srgb, var(--ac) 50%, var(--sd-border-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ac) 26%, transparent), 0 18px 40px rgba(0, 0, 0, 0.34);
  transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
}

.sd-kt-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--ac); box-shadow: 0 0 14px color-mix(in srgb, var(--ac) 60%, transparent); }
.sd-kt-glare { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: var(--spot, 0);
  background: radial-gradient(360px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--ac) 26%, transparent), transparent 46%);
  transition: opacity 0.3s; mix-blend-mode: screen; }
.sd-kt-sheen { position: absolute; top: 0; left: 0; width: 42%; height: 100%; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ac) 16%, transparent), transparent);
  transform: translateX(-130%) skewX(-18deg); opacity: 0; }
.sd-kt:hover .sd-kt-sheen { opacity: 1; animation: sd-tile-sheen 0.9s var(--sd-ease); }

.sd-kt-head { display: flex; align-items: center; justify-content: space-between; }
.sd-kt-ico { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px;
  color: var(--ac); background: color-mix(in srgb, var(--ac) 15%, transparent); }
.sd-kt-live { display: inline-grid; place-items: center; }
.sd-kt-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--ac);
  box-shadow: 0 0 9px var(--ac); animation: sd-pulse-ring 1.8s ease-in-out infinite; }

.sd-kt-val { font-size: 27px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; margin-top: 7px; line-height: 1; }
.sd-kt-label { font-size: 12px; color: var(--sd-text-secondary); font-weight: 600; margin-top: 3px; }
.sd-kt-sub { font-size: 10.5px; color: var(--sd-text-dim); font-family: var(--sd-mono); letter-spacing: 0.02em; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-kt-shell { animation: none; }
  html:not([data-cinematic="on"]) .sd-kt,
  html:not([data-cinematic="on"]) .sd-kt:hover { transform: none; }
  html:not([data-cinematic="on"]) .sd-kt:hover .sd-kt-sheen { animation: none; }
  html:not([data-cinematic="on"]) .sd-kt-live i { animation: none; }
}
</style>
