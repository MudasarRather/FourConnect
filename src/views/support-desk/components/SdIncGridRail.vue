<template>
  <!-- THE BUS-BAR — the Fault Grid's vertical rail. A substation breaker panel:
       every tab is a BREAKER on a live copper bus; the active breaker is CLOSED
       (rocker down, LED lit, current tapped off the bus into the row). Same
       contract as SdWorkspaceRail: {modelValue,tabs,mod,icons,collapsed} /
       update:modelValue · toggle-collapsed · new. -->
  <aside class="igr" :class="{ collapsed }" aria-label="Incident navigation">
    <span class="igr-graticule" aria-hidden="true" />
    <!-- the live bus: copper rail + traveling current bead -->
    <span class="igr-bus" aria-hidden="true"><i class="bus-hot" /></span>

    <!-- nameplate -->
    <header class="igr-head">
      <div class="igr-brand">
        <span class="plate" aria-hidden="true">
          <span class="plate-hazard" />
          <Zap :size="16" />
        </span>
        <span v-if="!collapsed" class="plate-text">
          <span class="plate-name">{{ mod.label }}</span>
          <span class="plate-sub"><i class="hz" /> FAULT GRID · LIVE</span>
        </span>
      </div>
      <button type="button" class="igr-collapse" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
        @click="$emit('toggle-collapsed')">
        <ChevronLeft :size="15" :class="{ flip: collapsed }" />
      </button>
    </header>

    <!-- jump-to filter -->
    <div v-if="!collapsed" class="igr-filter">
      <Search :size="13" />
      <input v-model="filter" type="text" placeholder="Patch to…" aria-label="Filter menu" />
      <button v-if="filter" class="filt-x" aria-label="Clear" @click="filter = ''"><X :size="12" /></button>
    </div>

    <!-- breakers -->
    <nav class="igr-nav">
      <ul class="igr-items">
        <li v-for="(t, i) in visibleTabs" :key="t.key" :style="{ '--i': i }">
          <button type="button" class="brk" :class="{ on: t.key === modelValue, soon: t.kind === 'placeholder' }"
            :title="collapsed ? t.label : ''" :aria-current="t.key === modelValue ? 'page' : null"
            @click="select(t.key)">
            <span class="brk-tap" aria-hidden="true" />
            <span class="brk-switch" aria-hidden="true">
              <span class="rocker"><component :is="iconFor(t)" :size="13" /></span>
              <span class="led" />
            </span>
            <span v-if="!collapsed" class="brk-lbl">{{ t.label }}</span>
            <span v-if="!collapsed" class="brk-load" aria-hidden="true"><i /></span>
            <span v-if="!collapsed && t.kind === 'placeholder'" class="brk-soon">soon</span>
          </button>
        </li>
      </ul>
      <p v-if="!visibleTabs.length" class="igr-noresult">No breaker matches “{{ filter }}”.</p>
    </nav>

    <!-- footer: declare + cinematic -->
    <footer class="igr-foot">
      <Motion as="button" type="button" class="foot-cta" :title="collapsed ? 'Declare Incident' : ''"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="$emit('new')">
        <Siren :size="15" /><span v-if="!collapsed">Declare Incident</span>
      </Motion>
      <button type="button" class="cine-toggle" :class="{ on: cinematic }" :title="cineTitle" @click="toggle">
        <span class="cine-arc" aria-hidden="true"><i /><i /><i /></span>
        <span v-if="!collapsed" class="cine-text">Cinematic</span>
        <span v-if="!collapsed" class="cine-state">{{ cinematic ? 'ON' : 'OFF' }}</span>
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, Search, X, Siren, Zap, Dot } from 'lucide-vue-next'
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
.igr {
  position: sticky; top: 64px; align-self: flex-start; flex-shrink: 0;
  width: 252px; max-height: calc(100vh - 84px);
  display: flex; flex-direction: column; margin: 4px 18px 4px 0;
  border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(120% 70% at 50% -10%, var(--sd-inc-soft), transparent 60%),
    linear-gradient(180deg, var(--sd-inc-bus) 0%, var(--sd-surface-glass) 130%);
  border: 1px solid var(--sd-inc-brd);
  box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%);
  transition: width 360ms var(--sd-spring); z-index: 8; isolation: isolate;
}
.igr.collapsed { width: 72px; }

/* engineering graticule */
.igr-graticule { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.55;
  background-image:
    linear-gradient(var(--sd-inc-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--sd-inc-grid-line) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 65%);
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 65%); }

/* the live copper bus + traveling hot segment */
.igr-bus { position: absolute; left: 10px; top: 84px; bottom: 96px; width: 3px; border-radius: 3px;
  pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--sd-inc-core) 55%, transparent) 10%,
    color-mix(in srgb, var(--sd-inc-core) 55%, transparent) 90%, transparent); }
.bus-hot { position: absolute; left: -1.5px; width: 6px; height: 44px; border-radius: 6px;
  background: linear-gradient(180deg, transparent, var(--sd-inc-hi), transparent);
  filter: blur(0.5px) drop-shadow(0 0 8px var(--sd-inc-core));
  animation: igr-bus-travel 5.2s var(--sd-ease) infinite; }
@keyframes igr-bus-travel { 0% { top: -8%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 100%; opacity: 0; } }

/* nameplate */
.igr-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 15px 14px 12px; border-bottom: 1px solid var(--sd-inc-brd); }
.igr-brand { display: inline-flex; align-items: center; gap: 11px; min-width: 0; }
.plate { position: relative; flex-shrink: 0; width: 36px; height: 36px; border-radius: 9px;
  display: grid; place-items: center; color: #1a1206; background: var(--sd-inc-grad);
  box-shadow: 0 6px 18px var(--sd-inc-soft), inset 0 0 0 1px rgba(255, 255, 255, 0.25); overflow: hidden; }
[data-theme="light"] .plate { color: #fff8ec; }
.plate-hazard { position: absolute; inset: auto 0 0 0; height: 7px; opacity: 0.85;
  background: repeating-linear-gradient(-45deg, rgba(20, 12, 4, 0.85) 0 5px, transparent 5px 10px); }
.plate-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.plate-name { font-size: 14px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plate-sub { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.14em; color: var(--sd-inc-core); font-family: var(--sd-mono); margin-top: 3px; }
.hz { width: 7px; height: 7px; border-radius: 2px; background: var(--sd-inc-live);
  animation: sd-inc-led 2.2s ease-in-out infinite; }

.igr-collapse { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.igr-collapse:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); }
.igr-collapse svg { transition: transform 0.34s var(--sd-spring); }
.igr-collapse svg.flip { transform: rotate(180deg); }

/* filter */
.igr-filter { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px;
  margin: 10px 12px 2px; padding: 7px 10px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.igr-filter input { flex: 1; min-width: 0; background: none; border: 0; outline: 0;
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; }
.igr-filter input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-muted)); }
.filt-x { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px;
  border: 0; cursor: pointer; background: var(--sd-surface-elevated); color: var(--sd-text-muted); }

/* breakers */
.igr-nav { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 10px 10px 6px; scrollbar-width: thin; }
.igr-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.igr-items li { animation: igr-item-in 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.05s); }
@keyframes igr-item-in { 0% { opacity: 0; transform: translateX(-14px); } 100% { opacity: 1; transform: none; } }

.brk { position: relative; width: 100%; display: flex; align-items: center; gap: 11px;
  padding: 8px 10px 8px 14px; border-radius: 12px; border: 1px solid transparent;
  background: transparent; cursor: pointer; text-align: left; color: var(--sd-text-secondary);
  transition: background 0.22s var(--sd-spring), border-color 0.22s var(--sd-spring),
    color 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.brk:hover { background: var(--sd-inc-soft); color: var(--sd-text); transform: translateX(2px); }
.brk.on { background: linear-gradient(90deg, var(--sd-inc-soft), transparent 78%);
  border-color: var(--sd-inc-brd); color: var(--sd-text); }
.brk.soon { opacity: 0.55; }

/* current tap: bus → breaker (draws in when active) */
.brk-tap { position: absolute; left: -6px; top: 50%; width: 14px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, var(--sd-inc-core), var(--sd-inc-hi));
  transform: translateY(-50%) scaleX(0); transform-origin: left center;
  transition: transform 0.3s var(--sd-spring);
  box-shadow: 0 0 8px var(--sd-inc-core); }
.brk.on .brk-tap { transform: translateY(-50%) scaleX(1); }

/* the rocker switch + LED */
.brk-switch { position: relative; flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px;
  display: grid; place-items: center;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); perspective: 120px; }
.rocker { display: grid; place-items: center; width: 100%; height: 100%; color: var(--sd-inc-dim);
  transition: transform 0.32s var(--sd-spring), color 0.25s var(--sd-spring); }
.brk:hover .rocker { color: var(--sd-inc-core); }
.brk.on .brk-switch { background: var(--sd-inc-soft); border-color: var(--sd-inc-brd);
  box-shadow: inset 0 0 12px var(--sd-inc-soft), 0 0 14px var(--sd-inc-soft); }
.brk.on .rocker { color: var(--sd-inc-hi); transform: rotateX(18deg) translateY(-1px); }
.led { position: absolute; right: -2px; top: -2px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-inc-dim-soft); border: 1px solid var(--sd-border);
  transition: all 0.25s var(--sd-spring); }
.brk.on .led { background: var(--sd-inc-live); border-color: transparent;
  box-shadow: 0 0 8px var(--sd-inc-live); animation: sd-inc-led 1.8s ease-in-out infinite; }

.brk-lbl { flex: 1; min-width: 0; font-size: 12.8px; font-weight: 700; letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brk-load { position: absolute; left: 55px; right: 14px; bottom: 4px; height: 2px; border-radius: 2px;
  overflow: hidden; background: transparent; }
.brk-load i { display: block; height: 100%; width: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--sd-inc-core), transparent);
  transform: scaleX(0); transform-origin: left center; transition: transform 0.4s var(--sd-spring); }
.brk:hover .brk-load i, .brk.on .brk-load i { transform: scaleX(1); }
.brk-soon { flex-shrink: 0; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--sd-inc-dim); background: var(--sd-inc-dim-soft); padding: 2px 7px; border-radius: 20px; }

.collapsed .brk { justify-content: center; padding: 8px 6px; }
.collapsed .brk-tap { display: none; }

.igr-noresult { position: relative; z-index: 2; margin: 14px 6px; font-size: 12px; color: var(--sd-text-muted); }

/* footer */
.igr-foot { position: relative; z-index: 2; padding: 10px 12px 13px; border-top: 1px solid var(--sd-inc-brd);
  display: flex; flex-direction: column; gap: 8px; }
.foot-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 12px; border-radius: 12px; border: 0; cursor: pointer;
  font-size: 12.8px; font-weight: 800; letter-spacing: 0.02em; color: #1a1206;
  background: var(--sd-inc-grad); box-shadow: 0 8px 22px var(--sd-inc-soft); }
[data-theme="light"] .foot-cta { color: #fff8ec; }
.cine-toggle { display: inline-flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 11px;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); font-size: 11.5px; font-weight: 700; transition: all 0.2s var(--sd-spring); }
.cine-toggle.on { color: var(--sd-inc-core); border-color: var(--sd-inc-brd); background: var(--sd-inc-soft); }
.cine-arc { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.cine-arc i { width: 3px; border-radius: 2px; background: currentColor; opacity: 0.75; height: 5px; }
.cine-toggle.on .cine-arc i { animation: igr-eq 0.9s ease-in-out infinite alternate; }
.cine-toggle.on .cine-arc i:nth-child(2) { animation-delay: 0.15s; }
.cine-toggle.on .cine-arc i:nth-child(3) { animation-delay: 0.3s; }
@keyframes igr-eq { from { height: 4px; } to { height: 12px; } }
.cine-text { flex: 1; text-align: left; }
.cine-state { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.1em; }
.collapsed .cine-toggle { justify-content: center; }
.collapsed .foot-cta { padding: 10px 8px; }

@media (max-width: 900px) { .igr { position: relative; top: 0; width: 100%; max-height: none; margin: 0 0 14px; }
  .igr.collapsed { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bus-hot,
  html:not([data-cinematic="on"]) .hz,
  html:not([data-cinematic="on"]) .led,
  html:not([data-cinematic="on"]) .igr-items li,
  html:not([data-cinematic="on"]) .cine-arc i { animation: none !important; }
}
</style>
