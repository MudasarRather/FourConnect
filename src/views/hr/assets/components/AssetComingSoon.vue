<template>
  <div class="acs" ref="root">
    <span class="as-grain" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />
    <span class="acs-scan" aria-hidden="true" />
    <Motion class="acs-inner" as="div"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="acs-badge"><Wrench :size="13" /> Wiring up</span>
      <div class="acs-orb">
        <span class="acs-ring" /><span class="acs-ring r2" />
        <component :is="meta.icon" :size="30" />
      </div>
      <h2 class="acs-title">{{ meta.label }}</h2>
      <p class="acs-sub">
        The backend lifecycle for <strong>{{ meta.label }}</strong> is live and audited.
        This cockpit panel lights up in the next pass — the data is already flowing through the hangar.
      </p>
      <div v-if="teaser != null" class="acs-teaser">
        <span class="acs-teaser-num as-mono">{{ teaser }}</span>
        <span class="acs-teaser-lab">records tracked</span>
      </div>
      <button class="as-btn as-btn-ghost" @click="$emit('go', 'dashboard')">
        <LayoutDashboard :size="14" /> Back to hangar
      </button>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Wrench, LayoutDashboard } from 'lucide-vue-next'
import { ASSET_TABS } from '@/composables/useAssets'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  sectionKey: { type: String, default: '' },
  teaser: { type: [Number, null], default: null },
})
defineEmits(['go'])
const root = ref(null)
usePointerSpotlight(root)
const meta = computed(() => ASSET_TABS.find(t => t.key === props.sectionKey) || { label: 'Section', icon: Wrench })
</script>

<style scoped>
.acs { position: relative; overflow: hidden; min-height: 440px; display: grid; place-items: center;
  border-radius: 22px; border: 1px solid var(--as-border-soft); background: var(--as-surf-card); box-shadow: var(--as-card-shadow); padding: 40px 24px; }
.acs-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, var(--as-bay-glow), transparent); animation: as-scan 6s ease-in-out infinite; }
.acs-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 460px; }
.acs-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 28%, transparent); margin-bottom: 18px; }
.acs-orb { position: relative; display: grid; place-items: center; width: 78px; height: 78px; border-radius: 22px; color: var(--as-amber); margin-bottom: 16px;
  background: var(--as-bezel); box-shadow: inset 0 0 0 2px rgba(0,0,0,0.2), 0 12px 30px -16px rgba(0,0,0,0.6); }
.acs-orb :deep(svg) { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); color: var(--as-steel-dark); }
.acs-ring { position: absolute; inset: -10px; border-radius: 28px; border: 1px solid color-mix(in srgb, var(--as-amber) 22%, transparent); animation: as-spin 12s linear infinite; }
.acs-ring.r2 { inset: -20px; border-style: dashed; opacity: 0.5; animation: as-spin 20s linear infinite reverse; }
.acs-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--as-text); letter-spacing: -0.01em; }
.acs-sub { margin: 8px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); }
.acs-teaser { display: flex; flex-direction: column; align-items: center; margin: 20px 0; }
.acs-teaser-num { font-size: 34px; font-weight: 800; color: var(--as-amber); }
.acs-teaser-lab { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.acs-inner .as-btn { margin-top: 6px; }
@media (prefers-reduced-motion: reduce) { .acs-scan, .acs-ring { animation: none !important; } }
</style>
