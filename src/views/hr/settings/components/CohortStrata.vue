<template>
  <div ref="root" class="cs">
    <span class="cs-grain" aria-hidden="true" />
    <span class="cs-aura" aria-hidden="true" />

    <header class="cs-head">
      <div class="cs-title">
        <span class="cs-title-ic"><Layers3 :size="14" /></span>
        <div class="cs-title-tx">
          <b>Cohort Strata</b>
          <span>The workforce, deposited by classification</span>
        </div>
      </div>
      <div class="cs-readout">
        <div class="cs-stat">
          <b><SetCountUp :value="total" /></b><span>in workforce</span>
        </div>
        <div class="cs-stat ghost"><b>{{ strata.length }}</b><span>strat{{ strata.length === 1 ? 'um' : 'a' }}</span></div>
      </div>
    </header>

    <div class="cs-core">
      <!-- depth rail -->
      <div class="cs-rail" aria-hidden="true">
        <span v-for="d in depthTicks" :key="d" class="cs-rail-tick" :style="{ top: d + '%' }"><em>{{ d }}%</em></span>
      </div>

      <div class="cs-stack">
        <!-- unclassified surface layer (loophole surfacing) -->
        <div v-if="unclassified > 0" class="cs-layer ghost" :style="{ flexGrow: Math.max(unclassified, floor) }">
          <div class="cs-layer-l">
            <span class="cs-layer-ic null"><CircleHelp :size="14" /></span>
            <div class="cs-layer-id"><b>Unclassified</b><span class="set-mono">no category</span></div>
          </div>
          <div class="cs-layer-r"><b class="set-mono">{{ unclassified }}</b><span>{{ pct(unclassified) }}%</span></div>
        </div>

        <button v-for="s in strata" :key="s.id" class="cs-layer" :class="{ off: !s.active, hot: hovered === s.id }"
          :style="{ flexGrow: Math.max(s.count, floor), '--hue': s.hue }"
          @mouseenter="hovered = s.id" @mouseleave="hovered = null" @click="$emit('select', s.cat)"
          :title="`${s.cat.label} · ${s.count} (${s.share}%)`">
          <span class="cs-layer-grain" aria-hidden="true" />
          <span class="cs-layer-sheen" aria-hidden="true" />
          <span class="cs-layer-edge" aria-hidden="true" />
          <div class="cs-layer-l">
            <span class="cs-layer-ic"><component :is="s.icon" :size="14" /></span>
            <div class="cs-layer-id">
              <b>{{ s.cat.label }}</b>
              <span class="cs-layer-meta">
                <em class="set-mono">{{ s.cat.code }}</em>
                <i v-if="s.system" class="cs-tag lock"><Lock :size="8" /> built-in</i>
                <i v-else-if="!s.active" class="cs-tag off">inactive</i>
              </span>
            </div>
          </div>
          <div class="cs-layer-r">
            <b class="set-mono"><SetCountUp :value="s.count" /></b>
            <span>{{ s.share }}%</span>
            <span class="cs-layer-micro"><i :style="{ width: Math.max(3, s.share) + '%' }" /></span>
          </div>
        </button>
      </div>

      <span class="cs-scan" aria-hidden="true" />
    </div>

    <footer class="cs-foot">
      <span class="cs-legend"><i class="dot live" /> active deposits</span>
      <span class="cs-legend"><i class="dot off" /> inactive (kept on record)</span>
      <span v-if="!total" class="cs-empty-note">No one classified yet — assign a category when hiring.</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Layers3, Lock, CircleHelp, ShieldCheck, GraduationCap, ScrollText, UserCheck, UserCog, Tag } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  usageByCode: { type: Object, default: () => ({}) },
  unclassified: { type: Number, default: 0 },
})
defineEmits(['select'])

const root = ref(null)
usePointerSpotlight(root)
const hovered = ref(null)
const floor = 0.6   // min flex-grow so tiny/empty strata stay visible & clickable

const RAMP = ['#fbbf24', '#f59e0b', '#fb923c', '#d97706', '#ea580c', '#b45309']
const glyphFor = (code) => {
  const c = String(code || '').toUpperCase()
  if (c.includes('PERMANENT') || c.includes('CONFIRM')) return ShieldCheck
  if (c.includes('PROBATION')) return UserCog
  if (c.includes('TRAINEE') || c.includes('INTERN')) return GraduationCap
  if (c.includes('CONTRACT')) return ScrollText
  if (c.includes('CONSULT')) return UserCheck
  return Tag
}

const usageOf = (code) => Number(props.usageByCode[code] || 0)
const total = computed(() => props.categories.reduce((a, c) => a + usageOf(c.code), 0) + Math.max(0, props.unclassified))
const pct = (n) => (total.value ? Math.round((n / total.value) * 100) : 0)

const strata = computed(() => {
  const list = props.categories.map((cat) => ({
    id: cat.id, cat, count: usageOf(cat.code), active: !!cat.is_active, system: !!cat.is_system, icon: glyphFor(cat.code),
  }))
  // active deposits sink to the bottom (biggest first), inactive float on top
  list.sort((a, b) => (a.active === b.active ? b.count - a.count : (a.active ? 1 : -1)))
  return list.map((s, i) => ({ ...s, hue: RAMP[i % RAMP.length], share: pct(s.count) }))
})

const depthTicks = [0, 25, 50, 75, 100]
</script>

<style scoped>
.cs { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 16px 18px;
  border-radius: 18px; border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  background: radial-gradient(130% 80% at 12% -10%, color-mix(in srgb, var(--set-ember) 10%, transparent), transparent 60%), var(--set-panel); }
.cs-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ember) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-ember) 6%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; transform: translate(calc((var(--mx, .5) - .5) * -8px), calc((var(--my, .5) - .5) * -8px));
  mask-image: radial-gradient(120% 120% at 0% 0%, #000 10%, transparent 72%); -webkit-mask-image: radial-gradient(120% 120% at 0% 0%, #000 10%, transparent 72%); }
.cs-aura { position: absolute; inset: -40% -20% auto -10%; height: 70%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 14%, transparent), transparent 70%); filter: blur(40px); }

.cs-head { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.cs-title { display: flex; align-items: center; gap: 10px; }
.cs-title-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 30%, transparent); }
.cs-title-tx { display: flex; flex-direction: column; line-height: 1.3; }
.cs-title-tx b { font-size: 14px; font-weight: 850; color: var(--set-text); }
.cs-title-tx span { font-size: 10.5px; color: var(--set-text-muted); }
.cs-readout { display: flex; align-items: center; gap: 8px; }
.cs-stat { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding: 5px 12px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.cs-stat b { font-size: 16px; font-weight: 850; color: var(--set-ember); }
.cs-stat span { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.cs-stat.ghost b { color: var(--set-text); }

/* core */
.cs-core { position: relative; z-index: 1; display: flex; gap: 10px; min-height: 320px; }
.cs-rail { position: relative; width: 34px; flex-shrink: 0; }
.cs-rail-tick { position: absolute; right: 0; transform: translateY(-50%); display: flex; align-items: center; gap: 4px; }
.cs-rail-tick::after { content: ''; width: 5px; height: 1px; background: var(--set-border-strong); }
.cs-rail-tick em { font-style: normal; font-size: 8px; font-family: var(--set-mono); color: var(--set-text-dim); }

.cs-stack { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--set-border-strong); background: var(--set-surface-glass); }
.cs-layer { position: relative; overflow: hidden; flex-basis: 0; min-height: 46px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 14px; cursor: pointer; font: inherit; text-align: left; border: 0; background: transparent;
  transition: filter 0.25s, transform 0.3s var(--set-spring), box-shadow 0.3s; }
.cs-layer::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--hue) 30%, transparent), color-mix(in srgb, var(--hue) 10%, transparent) 55%, transparent 85%); }
.cs-layer-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 20% 40%, rgba(255,255,255,0.16) 0.5px, transparent 1.4px),
    radial-gradient(circle at 60% 70%, rgba(255,255,255,0.12) 0.5px, transparent 1.4px),
    radial-gradient(circle at 85% 25%, rgba(0,0,0,0.18) 0.5px, transparent 1.4px);
  background-size: 30px 30px, 44px 44px, 38px 38px; animation: cs-drift 9s linear infinite; }
.cs-layer-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(100deg, transparent 35%, color-mix(in srgb, var(--hue) 40%, white 10%) 50%, transparent 65%);
  background-size: 220% 100%; transition: opacity 0.3s; }
.cs-layer.hot .cs-layer-sheen { opacity: 0.45; animation: cs-sheen 1.4s ease; }
.cs-layer-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--hue); box-shadow: 0 0 12px -2px var(--hue); }
.cs-layer:hover { filter: brightness(1.08); transform: translateX(2px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hue) 40%, transparent); z-index: 3; }
.cs-layer.off { filter: grayscale(0.6) brightness(0.82); }
.cs-layer.off::after { background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--set-unset) 16%, transparent) 0 6px, transparent 6px 12px); }
.cs-layer.off .cs-layer-edge { background: var(--set-unset); box-shadow: none; }

.cs-layer-l { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; min-width: 0; }
.cs-layer-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: #1a1206;
  background: var(--hue); box-shadow: 0 4px 12px -4px var(--hue); }
.cs-layer-ic.null { color: var(--set-text-muted); background: var(--set-surface-elevated); box-shadow: none; border: 1px solid var(--set-border); }
.cs-layer-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cs-layer-id b { font-size: 13px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cs-layer-meta { display: inline-flex; align-items: center; gap: 6px; }
.cs-layer-meta em { font-style: normal; font-size: 9.5px; color: var(--set-text-muted); }
.cs-tag { display: inline-flex; align-items: center; gap: 3px; font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 1px 6px; border-radius: 999px; }
.cs-tag.lock { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.cs-tag.off { color: var(--set-text-dim); background: var(--set-unset-soft); }

.cs-layer-r { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; }
.cs-layer-r b { font-size: 16px; font-weight: 850; color: var(--set-text); line-height: 1; }
.cs-layer-r span { font-size: 9.5px; font-weight: 700; color: var(--set-text-muted); }
.cs-layer-micro { width: 54px; height: 3px; border-radius: 2px; background: var(--set-border); overflow: hidden; margin-top: 3px; }
.cs-layer-micro i { display: block; height: 100%; border-radius: 2px; background: var(--hue); transition: width 0.9s var(--set-spring); }

.cs-layer.ghost { cursor: default; }
.cs-layer.ghost::after { background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--set-unset) 14%, transparent) 0 6px, transparent 6px 12px); }
.cs-layer.ghost .cs-layer-r b { color: var(--set-text-muted); }

.cs-scan { position: absolute; left: 44px; right: 0; top: 0; height: 2px; pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold-bright) 80%, transparent), transparent);
  box-shadow: 0 0 12px var(--set-gold); animation: cs-scanmove 5.5s ease-in-out infinite; }

.cs-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cs-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.cs-legend .dot { width: 9px; height: 9px; border-radius: 3px; }
.cs-legend .dot.live { background: var(--set-gold); }
.cs-legend .dot.off { background: var(--set-unset); }
.cs-empty-note { margin-left: auto; font-size: 10px; color: var(--set-text-dim); }

@keyframes cs-drift { from { background-position: 0 0, 0 0, 0 0; } to { background-position: 30px 30px, -44px 44px, 38px -38px; } }
@keyframes cs-sheen { from { background-position: 220% 0; } to { background-position: -120% 0; } }
@keyframes cs-scanmove { 0%, 100% { top: 0; opacity: 0; } 8% { opacity: 1; } 50% { top: calc(100% - 2px); opacity: 0.7; } 92% { opacity: 0; } }

/* light theme: layers stay rich, grain flips to subtle dark specks */
[data-theme="light"] .cs-layer-grain { opacity: 0.35;
  background-image: radial-gradient(circle at 20% 40%, rgba(60,40,15,0.16) 0.5px, transparent 1.4px),
    radial-gradient(circle at 60% 70%, rgba(60,40,15,0.12) 0.5px, transparent 1.4px),
    radial-gradient(circle at 85% 25%, rgba(120,70,20,0.14) 0.5px, transparent 1.4px); }

@media (prefers-reduced-motion: reduce) {
  .cs-layer-grain, .cs-scan, .cs-layer.hot .cs-layer-sheen { animation: none; }
  .cs-layer-micro i { transition: none; }
}
</style>
