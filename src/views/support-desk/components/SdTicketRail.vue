<template>
  <aside class="tkr" :class="{ collapsed }" aria-label="Tickets navigation">
    <!-- ambient cinematic layers -->
    <span class="tkr-aura" aria-hidden="true" />
    <span class="tkr-grid" aria-hidden="true" />
    <span class="tkr-spine" aria-hidden="true" />

    <!-- brand / console header -->
    <header class="tkr-head">
      <div class="tkr-brand">
        <span class="brand-tile" aria-hidden="true">
          <span class="tile-orbit" />
          <Ticket :size="17" />
        </span>
        <span v-if="!collapsed" class="brand-text">
          <span class="brand-name">Tickets</span>
          <span class="brand-sub"><span class="live-dot" /> Command Deck</span>
        </span>
      </div>
      <button type="button" class="tkr-collapse" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
        @click="$emit('toggle-collapsed')">
        <ChevronLeft :size="15" :class="{ flip: collapsed }" />
      </button>
    </header>

    <!-- jump-to filter -->
    <div v-if="!collapsed" class="tkr-filter">
      <Search :size="14" />
      <input v-model="filter" type="text" placeholder="Jump to…" aria-label="Filter menu" />
      <button v-if="filter" class="filt-x" aria-label="Clear" @click="filter = ''"><X :size="12" /></button>
    </div>

    <!-- grouped nav -->
    <nav class="tkr-nav">
      <template v-for="(group, gi) in visibleGroups" :key="group.title">
        <Motion class="tkr-group" :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ delay: 0.04 + gi * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <header v-if="!collapsed" class="grp-head">
            <span class="grp-num">{{ String(gi + 1).padStart(2, '0') }}</span>
            <span class="grp-label">{{ group.title }}</span>
            <span class="grp-rule" />
          </header>
          <ul class="grp-items">
            <li v-for="(item, ii) in group.items" :key="item.slug" :style="{ '--i': ii }">
              <button type="button" class="tkr-item" :class="{ on: item.slug === modelValue, soon: item.phase > 2 }"
                :style="{ '--ac': item.accent }" :title="collapsed ? item.label : ''"
                :aria-current="item.slug === modelValue ? 'page' : null" @click="select(item.slug)">
                <span class="item-bar" aria-hidden="true" />
                <span class="item-ic"><component :is="item.icon" :size="16" /></span>
                <span v-if="!collapsed" class="item-lbl">{{ item.label }}</span>
                <span v-if="!collapsed && item.phase > 2" class="item-soon" :title="`Ships in Phase ${item.phase}`">P{{ item.phase }}</span>
                <span v-if="!collapsed && badge(item) != null" class="item-badge" :class="{ alert: ALERT.has(item.slug) }">{{ badge(item) }}</span>
              </button>
            </li>
          </ul>
        </Motion>
      </template>
      <p v-if="!visibleGroups.length" class="tkr-noresult">No match for “{{ filter }}”.</p>
    </nav>

    <!-- footer: new ticket + cinematic toggle -->
    <footer class="tkr-foot">
      <button type="button" class="foot-cta" :title="collapsed ? 'New ticket' : ''" @click="$emit('new')">
        <Plus :size="15" /><span v-if="!collapsed">New Ticket</span>
      </button>
      <button type="button" class="cine-toggle" :class="{ on: cinematic }" :title="cineTitle" @click="toggle">
        <span class="cine-eq" aria-hidden="true"><i /><i /><i /><i /></span>
        <span v-if="!collapsed" class="cine-text">Cinematic</span>
        <span v-if="!collapsed" class="cine-state">{{ cinematic ? 'ON' : 'OFF' }}</span>
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Ticket, ChevronLeft, Search, X, Plus } from 'lucide-vue-next'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  modelValue: { type: String, required: true },
  groups: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'toggle-collapsed', 'new'])

const { cinematic, toggle } = useCinematic()
const cineTitle = computed(() => cinematic.value
  ? 'Cinematic mode ON — full motion even if your OS has Reduce Motion'
  : 'Cinematic mode OFF — respects your OS Reduce Motion setting')

const select = (slug) => { if (slug !== props.modelValue) emit('update:modelValue', slug) }

/* filter */
const filter = ref('')
const hit = (label) => String(label || '').toLowerCase().includes(filter.value.toLowerCase())
const visibleGroups = computed(() => {
  if (!filter.value) return props.groups
  return props.groups
    .map(g => ({ title: g.title, items: g.items.filter(it => hit(it.label)) }))
    .filter(g => g.items.length)
})

/* badges */
const ALERT = new Set(['critical', 'escalated', 'sla-breached', 'unassigned'])
const badge = (item) => {
  if (!item.countKey) return null
  const v = props.counts?.[item.countKey]
  if (v == null) return null
  if (ALERT.has(item.slug) && !(v > 0)) return null
  return v
}
</script>

<style scoped>
.tkr {
  position: sticky; top: 64px; align-self: flex-start; flex-shrink: 0;
  width: 258px; max-height: calc(100vh - 84px);
  display: flex; flex-direction: column; margin: 4px 18px 4px 0;
  border-radius: 20px; overflow: hidden;
  background: linear-gradient(180deg, var(--sd-surface-elevated) 0%, var(--sd-surface-glass) 100%);
  border: 1px solid var(--sd-border-strong);
  box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%);
  transition: width 360ms var(--sd-spring); z-index: 8; isolation: isolate;
}
.tkr.collapsed { width: 74px; }

.tkr-aura { position: absolute; inset: -30% -20% auto -20%; height: 320px; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 60% at 30% 0%, color-mix(in srgb, var(--sd-ember) 22%, transparent), transparent 70%);
  opacity: 0.55; filter: blur(8px); mix-blend-mode: screen; animation: tkr-aura-drift 16s ease-in-out infinite; }
.tkr-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--sd-border) 1px, transparent 1px), linear-gradient(90deg, var(--sd-border) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 60%); -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 60%); }
.tkr-spine { position: absolute; left: 0; top: 96px; bottom: 96px; width: 2px; pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, transparent, var(--sd-amber) 12%, var(--sd-ember) 50%, var(--sd-amber) 88%, transparent);
  background-size: 100% 220%; opacity: 0.35; animation: tkr-spine-flow 4.5s linear infinite; }

/* header */
.tkr-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 15px 14px 12px; border-bottom: 1px solid var(--sd-border); }
.tkr-brand { display: inline-flex; align-items: center; gap: 11px; min-width: 0; }
.brand-tile { position: relative; flex-shrink: 0; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 18px rgba(251, 146, 60, 0.32); overflow: hidden; }
[data-theme="light"] .brand-tile { color: #fff8ec; }
.tile-orbit { position: absolute; inset: -50%; background: conic-gradient(from 0deg, transparent 0 70%, rgba(255,255,255,0.55) 85%, transparent 100%); animation: tkr-orbit 5s linear infinite; opacity: 0.6; }
.brand-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.brand-name { font-size: 14px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; white-space: nowrap; }
.brand-sub { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-muted); font-family: var(--sd-mono); margin-top: 2px; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); animation: tkr-pulse 2.4s ease-out infinite; }

.tkr-collapse { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.tkr-collapse:hover { color: var(--sd-text); border-color: var(--sd-border-strong); background: var(--sd-surface-elevated); }
.tkr-collapse svg { transition: transform 0.34s var(--sd-spring); }
.tkr-collapse svg.flip { transform: rotate(180deg); }

/* filter */
.tkr-filter { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; margin: 10px 12px 4px; padding: 8px 11px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-dim); }
.tkr-filter input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 12.5px; font-family: inherit; }
.tkr-filter input::placeholder { color: var(--sd-text-dim); }
.filt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }

/* nav */
.tkr-nav { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 6px 10px 10px; scrollbar-width: none; }
.tkr-nav::-webkit-scrollbar { width: 0; display: none; }
.grp-head { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 8px; padding: 11px 4px 5px; }
.grp-num { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-ember); letter-spacing: 0.5px; }
.grp-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.grp-rule { height: 1px; background: linear-gradient(90deg, var(--sd-border-strong), transparent); }
.grp-items { list-style: none; margin: 0 0 4px; padding: 0; display: flex; flex-direction: column; gap: 2px; }

/* item */
.tkr-item { position: relative; display: flex; align-items: center; gap: 11px; width: 100%; height: 36px; padding: 0 10px 0 13px;
  background: none; border: 0; border-radius: 11px; cursor: pointer; text-align: left;
  color: var(--sd-text-secondary); font-size: 12.5px; font-weight: 600; font-family: inherit; letter-spacing: 0.1px;
  transition: color 0.22s var(--sd-spring), background 0.22s var(--sd-spring);
  animation: tkr-item-in 0.5s var(--sd-spring) both; animation-delay: calc(0.06s + var(--i, 0) * 0.022s); }
.tkr-item:hover { color: var(--sd-text); background: color-mix(in srgb, var(--ac, var(--sd-amber)) 9%, transparent); }
.tkr-item.on { color: var(--sd-text); background: linear-gradient(90deg, color-mix(in srgb, var(--ac, var(--sd-amber)) 18%, transparent), color-mix(in srgb, var(--ac, var(--sd-amber)) 5%, transparent) 72%, transparent); }
.tkr-item.soon { color: var(--sd-text-muted); }
.tkr-item.soon.on, .tkr-item.soon:hover { color: var(--sd-text); }

.item-bar { position: absolute; left: -10px; top: 50%; width: 3px; height: 0; transform: translateY(-50%); border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--ac, var(--sd-amber)), var(--sd-ember)); box-shadow: 0 0 10px var(--ac, var(--sd-amber)); transition: height 0.34s var(--sd-spring); }
.tkr-item.on .item-bar { height: 22px; }
.tkr-item:hover:not(.on) .item-bar { height: 11px; opacity: 0.5; }

.item-ic { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; color: var(--ac, var(--sd-amber)); opacity: 0.82; transition: transform 0.24s var(--sd-spring), opacity 0.2s; }
.item-ic :deep(svg) { width: 16px; height: 16px; }
.tkr-item:hover .item-ic { opacity: 1; transform: scale(1.12) rotate(-4deg); }
.tkr-item.on .item-ic { opacity: 1; }
.item-lbl { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: transform 0.26s var(--sd-spring); }
.tkr-item.on .item-lbl { transform: translateX(2px); }
.item-soon { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; color: var(--sd-text-dim); padding: 1px 5px; border-radius: 5px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.item-badge { font-family: var(--sd-mono); font-size: 10px; font-weight: 800; color: var(--sd-text-muted); padding: 1px 6px; border-radius: 999px; background: var(--sd-surface); font-variant-numeric: tabular-nums; }
.tkr-item.on .item-badge { color: var(--sd-amber); }
.item-badge.alert { color: var(--sd-pri-critical); background: color-mix(in srgb, var(--sd-pri-critical) 14%, transparent); }

.tkr-noresult { padding: 18px 12px; text-align: center; font-size: 12px; color: var(--sd-text-dim); }

/* footer */
.tkr-foot { position: relative; z-index: 2; padding: 10px 12px 13px; border-top: 1px solid var(--sd-border); display: flex; flex-direction: column; gap: 8px; }
.foot-cta { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; border-radius: 12px; cursor: pointer; border: 0;
  font-size: 12.5px; font-weight: 700; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 18px rgba(251, 146, 60, 0.26);
  transition: transform 0.2s var(--sd-spring), box-shadow 0.2s; font-family: inherit; }
[data-theme="light"] .foot-cta { color: #fff8ec; }
.foot-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(251, 146, 60, 0.36); }
.cine-toggle { display: inline-flex; align-items: center; gap: 9px; height: 34px; padding: 0 11px; border-radius: 11px; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; transition: all 0.2s var(--sd-spring); font-family: inherit; }
.cine-toggle:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.cine-toggle.on { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.cine-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 13px; }
.cine-eq i { width: 2.5px; border-radius: 2px; background: currentColor; height: 4px; }
.cine-toggle.on .cine-eq i { animation: tkr-eq 0.9s ease-in-out infinite; }
.cine-toggle.on .cine-eq i:nth-child(2) { animation-delay: 0.15s; }
.cine-toggle.on .cine-eq i:nth-child(3) { animation-delay: 0.3s; }
.cine-toggle.on .cine-eq i:nth-child(4) { animation-delay: 0.45s; }
.cine-text { flex: 1; text-align: left; }
.cine-state { font-family: var(--sd-mono); font-size: 10px; opacity: 0.8; }

/* collapsed */
.tkr.collapsed .tkr-item { padding: 0; justify-content: center; height: 40px; }
.tkr.collapsed .grp-head { display: none; }
.tkr.collapsed .grp-items { align-items: center; }
.tkr.collapsed .foot-cta, .tkr.collapsed .cine-toggle { justify-content: center; padding: 0; }

/* keyframes */
@keyframes tkr-item-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes tkr-aura-drift { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 50% { transform: translate(8%, 6%) scale(1.08); opacity: 0.62; } }
@keyframes tkr-spine-flow { 0% { background-position: 0 -120%; } 100% { background-position: 0 120%; } }
@keyframes tkr-orbit { to { transform: rotate(360deg); } }
@keyframes tkr-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-success) 60%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
@keyframes tkr-eq { 0%, 100% { height: 4px; } 50% { height: 13px; } }

/* light polish */
[data-theme="light"] .tkr { box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.55); }
[data-theme="light"] .tkr-aura { mix-blend-mode: multiply; opacity: 0.4; }
[data-theme="light"] .tkr-spine { opacity: 0.5; }

/* responsive — auto-collapse on narrow viewports */
@media (max-width: 900px) {
  .tkr { width: 74px; }
  .tkr .brand-text, .tkr .item-lbl, .tkr .item-badge, .tkr .item-soon, .tkr .grp-head, .tkr .tkr-filter, .tkr .cine-text, .tkr .cine-state { display: none; }
  .tkr .tkr-item { padding: 0; justify-content: center; height: 40px; }
  .tkr .foot-cta, .tkr .cine-toggle { justify-content: center; padding: 0; }
}

/* motion policy: respect OS Reduce Motion unless Cinematic mode is on */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tkr-aura,
  html:not([data-cinematic="on"]) .tkr-spine,
  html:not([data-cinematic="on"]) .tile-orbit,
  html:not([data-cinematic="on"]) .live-dot,
  html:not([data-cinematic="on"]) .cine-toggle.on .cine-eq i,
  html:not([data-cinematic="on"]) .tkr-item { animation: none; }
  html:not([data-cinematic="on"]) .item-bar, html:not([data-cinematic="on"]) .item-ic, html:not([data-cinematic="on"]) .item-lbl,
  html:not([data-cinematic="on"]) .tkr-collapse svg, html:not([data-cinematic="on"]) .tkr { transition: none; }
}
</style>
