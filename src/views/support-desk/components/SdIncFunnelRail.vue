<template>
  <!-- THE MANIFOLD — the Command Funnel's vertical rail. A braided signal stream
       runs the rail's height; every tab is a FLOW GATE tapping the stream. The
       active gate opens its iris and the braid visibly diverts through it. Same
       contract as SdWorkspaceRail — deliberately nothing like the Fault Grid's
       breaker panel or the Tickets console rail. -->
  <aside class="ifr" :class="{ collapsed }" aria-label="Incident oversight navigation">
    <span class="ifr-wallglow" aria-hidden="true" />
    <!-- the braided stream -->
    <svg class="ifr-braid" viewBox="0 0 26 600" preserveAspectRatio="none" aria-hidden="true">
      <path class="braid b1" d="M8,-10 C20,60 2,120 14,190 C24,250 4,310 13,380 C22,450 6,510 12,610" />
      <path class="braid b2" d="M16,-10 C4,70 22,140 10,210 C2,270 20,330 11,400 C4,470 18,540 14,610" />
      <path class="braid b3" d="M12,-10 C14,80 8,160 16,230 C22,300 8,370 15,440 C20,500 10,560 13,610" />
    </svg>

    <!-- command seal -->
    <header class="ifr-head">
      <div class="ifr-brand">
        <span class="seal" aria-hidden="true">
          <span class="seal-ring" />
          <component :is="mod.icon" :size="15" />
        </span>
        <span v-if="!collapsed" class="seal-text">
          <span class="seal-name">{{ mod.label }}</span>
          <span class="seal-sub">COMMAND FUNNEL · OVERSIGHT</span>
        </span>
      </div>
      <button type="button" class="ifr-collapse" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
        @click="$emit('toggle-collapsed')">
        <ChevronLeft :size="15" :class="{ flip: collapsed }" />
      </button>
    </header>

    <!-- jump-to filter -->
    <div v-if="!collapsed" class="ifr-filter">
      <Search :size="13" />
      <input v-model="filter" type="text" placeholder="Route to…" aria-label="Filter menu" />
      <button v-if="filter" class="filt-x" aria-label="Clear" @click="filter = ''"><X :size="12" /></button>
    </div>

    <!-- flow gates -->
    <nav class="ifr-nav">
      <ul class="ifr-items">
        <li v-for="(t, i) in visibleTabs" :key="t.key" :style="{ '--i': i }">
          <button type="button" class="gate" :class="{ on: t.key === modelValue, soon: t.kind === 'placeholder' }"
            :title="collapsed ? t.label : ''" :aria-current="t.key === modelValue ? 'page' : null"
            @click="select(t.key)">
            <span class="gate-branch" aria-hidden="true" />
            <span class="gate-port" aria-hidden="true">
              <span class="iris" />
              <component :is="iconFor(t)" :size="13" class="gate-ic" />
            </span>
            <span v-if="!collapsed" class="gate-lbl">{{ t.label }}</span>
            <span v-if="!collapsed" class="gate-flow" aria-hidden="true"><i /><i /><i /></span>
            <span v-if="!collapsed && t.kind === 'placeholder'" class="gate-soon">soon</span>
          </button>
        </li>
      </ul>
      <p v-if="!visibleTabs.length" class="ifr-noresult">No gate matches “{{ filter }}”.</p>
    </nav>

    <!-- footer -->
    <footer class="ifr-foot">
      <Motion as="button" type="button" class="foot-cta" :title="collapsed ? 'Open Intake' : ''"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="15" /><span v-if="!collapsed">Open Intake</span>
      </Motion>
      <button type="button" class="cine-toggle" :class="{ on: cinematic }" :title="cineTitle" @click="toggle">
        <span class="cine-wave" aria-hidden="true"><i /><i /><i /><i /></span>
        <span v-if="!collapsed" class="cine-text">Cinematic</span>
        <span v-if="!collapsed" class="cine-state">{{ cinematic ? 'ON' : 'OFF' }}</span>
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, Search, X, Plus, Dot } from 'lucide-vue-next'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  mod: { type: Object, required: true },
  icons: { type: Object, default: () => ({}) },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'toggle-collapsed', 'new'])

const { cinematic, toggle } = useCinematic()
const cineTitle = computed(() => cinematic.value
  ? 'Cinematic mode ON — full motion even if your OS has Reduce Motion'
  : 'Cinematic mode OFF — respects your OS Reduce Motion setting')

const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }
const iconFor = (t) => props.icons[t.key] || t.icon || props.mod.icon || Dot

const filter = ref('')
const visibleTabs = computed(() => {
  if (!filter.value) return props.tabs
  const q = filter.value.toLowerCase()
  return props.tabs.filter(t => String(t.label || '').toLowerCase().includes(q))
})
</script>

<style scoped>
.ifr {
  position: sticky; top: 64px; align-self: flex-start; flex-shrink: 0;
  width: 252px; max-height: calc(100vh - 84px);
  display: flex; flex-direction: column; margin: 4px 18px 4px 0;
  border-radius: 22px; overflow: hidden;
  background:
    radial-gradient(140% 60% at 50% -8%, var(--sd-fun-soft), transparent 62%),
    linear-gradient(180deg, var(--sd-surface-elevated) 0%, var(--sd-surface-glass) 130%);
  border: 1px solid var(--sd-fun-brd);
  box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%);
  transition: width 360ms var(--sd-spring); z-index: 8; isolation: isolate;
}
.ifr.collapsed { width: 72px; }

.ifr-wallglow { position: absolute; inset: auto -30% -18% -30%; height: 240px; pointer-events: none;
  z-index: 0; opacity: 0.5; filter: blur(14px);
  background: radial-gradient(60% 80% at 50% 100%, var(--sd-fun-soft), transparent 70%); }

/* the braided stream */
.ifr-braid { position: absolute; left: 4px; top: 0; height: 100%; width: 26px; pointer-events: none; z-index: 1; }
.braid { fill: none; stroke-width: 1.6; stroke-linecap: round; opacity: 0.65;
  stroke-dasharray: 10 14; animation: sd-fun-stream-drift 26s linear infinite; }
.b1 { stroke: var(--sd-fun-stream); }
.b2 { stroke: color-mix(in srgb, var(--sd-fun-hi) 60%, transparent); animation-duration: 34s; }
.b3 { stroke: var(--sd-fun-stream-dim); animation-duration: 44s; animation-direction: reverse; }

/* command seal header */
.ifr-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 15px 14px 12px; border-bottom: 1px solid var(--sd-fun-brd); }
.ifr-brand { display: inline-flex; align-items: center; gap: 11px; min-width: 0; }
.seal { position: relative; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%;
  display: grid; place-items: center; color: var(--sd-fun-hi);
  background: radial-gradient(circle at 32% 28%, var(--sd-fun-soft), var(--sd-fun-wall));
  border: 1px solid var(--sd-fun-brd); box-shadow: 0 6px 18px var(--sd-fun-soft); }
[data-theme="light"] .seal { color: #fff3df; }
.seal-ring { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 62%, var(--sd-fun-core) 82%, transparent 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  animation: sd-spin-slow 7s linear infinite; opacity: 0.85; }
.seal-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.seal-name { font-size: 14px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seal-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-fun-core);
  font-family: var(--sd-mono); margin-top: 3px; white-space: nowrap; }

.ifr-collapse { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.ifr-collapse:hover { color: var(--sd-text); border-color: var(--sd-fun-brd); }
.ifr-collapse svg { transition: transform 0.34s var(--sd-spring); }
.ifr-collapse svg.flip { transform: rotate(180deg); }

/* filter */
.ifr-filter { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px;
  margin: 10px 12px 2px; padding: 7px 11px; border-radius: 20px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.ifr-filter input { flex: 1; min-width: 0; background: none; border: 0; outline: 0;
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; }
.filt-x { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
  border: 0; cursor: pointer; background: var(--sd-surface-elevated); color: var(--sd-text-muted); }

/* flow gates */
.ifr-nav { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 10px 10px 6px 16px; scrollbar-width: thin; }
.ifr-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ifr-items li { animation: ifr-item-in 0.55s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.06s); }
@keyframes ifr-item-in { 0% { opacity: 0; transform: translateY(10px) scale(0.97); } 100% { opacity: 1; transform: none; } }

.gate { position: relative; width: 100%; display: flex; align-items: center; gap: 11px;
  padding: 7px 10px; border-radius: 30px; border: 1px solid transparent;
  background: transparent; cursor: pointer; text-align: left; color: var(--sd-text-secondary);
  transition: background 0.24s var(--sd-spring), border-color 0.24s var(--sd-spring),
    color 0.24s var(--sd-spring); }
.gate:hover { background: var(--sd-fun-soft); color: var(--sd-text); }
.gate.on { background: linear-gradient(90deg, var(--sd-fun-soft), transparent 82%);
  border-color: var(--sd-fun-brd); color: var(--sd-text); }
.gate.soon { opacity: 0.55; }

/* branch filament: stream → gate */
.gate-branch { position: absolute; left: -12px; top: 50%; width: 18px; height: 1.6px;
  background: linear-gradient(90deg, var(--sd-fun-stream), var(--sd-fun-hi));
  transform: translateY(-50%) scaleX(0); transform-origin: left center;
  transition: transform 0.34s var(--sd-spring); box-shadow: 0 0 8px var(--sd-fun-soft); }
.gate.on .gate-branch, .gate:hover .gate-branch { transform: translateY(-50%) scaleX(1); }

/* the port + iris */
.gate-port { position: relative; flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center; background: var(--sd-surface);
  border: 1px solid var(--sd-border); transition: all 0.26s var(--sd-spring); }
.gate-ic { position: relative; z-index: 1; color: var(--sd-fun-auto); transition: color 0.24s var(--sd-spring); }
.gate:hover .gate-ic { color: var(--sd-fun-core); }
.iris { position: absolute; inset: 3px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: conic-gradient(from 90deg, transparent 0 55%, var(--sd-fun-core) 78%, transparent 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px));
  transition: opacity 0.3s var(--sd-spring); }
.gate.on .gate-port { border-color: var(--sd-fun-brd); background: var(--sd-fun-soft);
  box-shadow: 0 0 16px var(--sd-fun-soft); }
.gate.on .gate-ic { color: var(--sd-fun-hi); }
.gate.on .iris { opacity: 1; animation: sd-spin-slow 5s linear infinite; }

.gate-lbl { flex: 1; min-width: 0; font-size: 12.8px; font-weight: 700; letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* flow ticks: three drifting beads on the active gate */
.gate-flow { display: inline-flex; align-items: center; gap: 3px; opacity: 0;
  transition: opacity 0.3s var(--sd-spring); }
.gate.on .gate-flow { opacity: 1; }
.gate-flow i { width: 4px; height: 4px; border-radius: 50%; background: var(--sd-fun-core);
  animation: ifr-tickflow 1.4s ease-in-out infinite; }
.gate-flow i:nth-child(2) { animation-delay: 0.22s; }
.gate-flow i:nth-child(3) { animation-delay: 0.44s; }
@keyframes ifr-tickflow { 0%, 100% { opacity: 0.25; transform: translateX(0); } 50% { opacity: 1; transform: translateX(2px); } }

.gate-soon { flex-shrink: 0; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--sd-fun-auto); background: var(--sd-fun-auto-soft); padding: 2px 7px; border-radius: 20px; }

.collapsed .gate { justify-content: center; padding: 7px 6px; }
.collapsed .gate-branch { display: none; }

.ifr-noresult { position: relative; z-index: 2; margin: 14px 6px; font-size: 12px; color: var(--sd-text-muted); }

/* footer */
.ifr-foot { position: relative; z-index: 2; padding: 10px 12px 13px; border-top: 1px solid var(--sd-fun-brd);
  display: flex; flex-direction: column; gap: 8px; }
.foot-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 12px; border-radius: 22px; border: 0; cursor: pointer;
  font-size: 12.8px; font-weight: 800; letter-spacing: 0.02em; color: #1a1206;
  background: var(--sd-fun-grad); box-shadow: 0 8px 22px var(--sd-fun-soft); }
[data-theme="light"] .foot-cta { color: #fff8ec; }
.cine-toggle { display: inline-flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 20px;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); font-size: 11.5px; font-weight: 700; transition: all 0.2s var(--sd-spring); }
.cine-toggle.on { color: var(--sd-fun-core); border-color: var(--sd-fun-brd); background: var(--sd-fun-soft); }
.cine-wave { display: inline-flex; align-items: center; gap: 2px; height: 12px; }
.cine-wave i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.7; }
.cine-toggle.on .cine-wave i { animation: ifr-wave 1.1s ease-in-out infinite; }
.cine-toggle.on .cine-wave i:nth-child(2) { animation-delay: 0.14s; }
.cine-toggle.on .cine-wave i:nth-child(3) { animation-delay: 0.28s; }
.cine-toggle.on .cine-wave i:nth-child(4) { animation-delay: 0.42s; }
@keyframes ifr-wave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.cine-text { flex: 1; text-align: left; }
.cine-state { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.1em; }
.collapsed .cine-toggle { justify-content: center; }
.collapsed .foot-cta { padding: 10px 8px; }

@media (max-width: 900px) { .ifr { position: relative; top: 0; width: 100%; max-height: none; margin: 0 0 14px; }
  .ifr.collapsed { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .braid,
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .iris,
  html:not([data-cinematic="on"]) .ifr-items li,
  html:not([data-cinematic="on"]) .gate-flow i,
  html:not([data-cinematic="on"]) .cine-wave i { animation: none !important; }
}
</style>
