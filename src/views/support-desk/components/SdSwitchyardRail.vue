<template>
  <aside class="syr" :class="{ collapsed }" :style="{ '--ac': mod.accent }" aria-label="Module navigation">
    <span class="syr-brush" aria-hidden="true" />
    <span class="syr-lantern" aria-hidden="true" />

    <!-- ═══ Tower cab (brand header) ═══ -->
    <header class="syr-head">
      <div class="syr-brand">
        <span class="cab-tile" aria-hidden="true">
          <span class="cab-beacon" />
          <TowerControl :size="17" />
        </span>
        <span v-if="!collapsed" class="cab-text">
          <span class="cab-name">{{ mod.label }}</span>
          <span class="cab-sub">
            <span class="blk-sig"><i class="sig-r" /><i class="sig-g" /></span>
            The Switchyard
          </span>
        </span>
      </div>
      <button type="button" class="syr-collapse" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
        @click="$emit('toggle-collapsed')">
        <ChevronLeft :size="15" :class="{ flip: collapsed }" />
      </button>
    </header>

    <!-- ═══ Yard clock ═══ -->
    <div v-if="!collapsed" class="syr-clock" aria-hidden="true">
      <span class="clock-eyebrow">Yard time</span>
      <span class="clock-face">{{ clock }}</span>
      <span class="clock-block"><i class="block-lamp" /> BLOCK CLEAR</span>
    </div>

    <!-- ═══ Interlocking routes (track diagram nav) ═══ -->
    <nav class="syr-nav">
      <ul class="syr-items">
        <span class="syr-track" aria-hidden="true" />
        <li v-for="(t, i) in tabs" :key="t.key" :style="{ '--i': i, '--tc': chipFor(t).color }"
          :class="{ on: t.key === modelValue }">
          <span class="rail-node" aria-hidden="true" />
          <span class="rail-spur" aria-hidden="true" />
          <button type="button" class="lever" :class="{ on: t.key === modelValue, soon: t.kind === 'placeholder' }"
            :title="collapsed ? t.label : ''" :aria-current="t.key === modelValue ? 'page' : null"
            @click="select(t.key)">
            <span class="lever-plate" aria-hidden="true">
              <component :is="iconFor(t)" :size="15" />
            </span>
            <span v-if="!collapsed" class="lever-body">
              <span class="lever-lbl">{{ labelFor(t) }}</span>
              <span class="lever-sub">{{ chipFor(t).sub }}</span>
            </span>
            <span v-if="!collapsed" class="lever-chip" :class="{ soon: t.kind === 'placeholder' }">
              {{ t.kind === 'placeholder' ? 'SOON' : chipFor(t).chip }}
            </span>
            <span class="lamp" :class="{ lit: t.key === modelValue }" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>

    <!-- ═══ Signal-box footer ═══ -->
    <footer class="syr-foot">
      <Motion as="button" type="button" class="foot-dispatch" :title="collapsed ? 'Dispatch Ticket' : ''"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="$emit('new')">
        <Send :size="14" /><span v-if="!collapsed">Dispatch Ticket</span>
      </Motion>
      <button type="button" class="sema-toggle" :class="{ on: cinematic }" :title="cineTitle" @click="toggle">
        <span class="sema" aria-hidden="true"><i class="sema-mast" /><i class="sema-arm" /><i class="sema-lens" /></span>
        <span v-if="!collapsed" class="sema-text">Cinematic</span>
        <span v-if="!collapsed" class="sema-state">{{ cinematic ? 'CLEAR' : 'HELD' }}</span>
      </button>
    </footer>
  </aside>
</template>

<script setup>
/* SdSwitchyardRail — "THE LEVER FRAME". Vertical in-page menu for the Queues module
   (The Switchyard). Deliberately a DIFFERENT instrument from the Tickets rail
   (SdWorkspaceRail: aura + blueprint grid + edge spine): this one is a signal-box
   interlocking frame — a literal double-rail track schematic with sleepers and a
   flowing block-current, a switch node per route that THROWS a branch spur to the
   active tab, signal lamps (green = route set), tier chips (L1/L2/L3), a ticking
   yard clock and a semaphore motion lever. Same contract as SdWorkspaceRail. */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, Send, TowerControl, Dot } from 'lucide-vue-next'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },         // registry tabs: {key,label,kind,...}
  mod: { type: Object, required: true },          // module meta: {label, icon, accent, group}
  icons: { type: Object, default: () => ({}) },   // per-tab icon map (key → component)
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'toggle-collapsed', 'new'])

const { cinematic, toggle } = useCinematic()
const cineTitle = computed(() => cinematic.value
  ? 'Cinematic mode ON — full motion even if your OS has Reduce Motion'
  : 'Cinematic mode OFF — respects your OS Reduce Motion setting')

const select = (key) => { if (key !== props.modelValue) emit('update:modelValue', key) }
const iconFor = (t) => props.icons[t.key] || t.icon || props.mod.icon || Dot

// Route plates: chip + sub-line per known queue tab; anything new degrades gracefully.
const ROUTE_META = {
  overview: { chip: 'HUB', sub: 'Supervisor board', color: 'var(--sd-gold)' },
  l1: { chip: 'L1', sub: 'First response', color: 'var(--sd-qs-t1)' },
  l2: { chip: 'L2', sub: 'Deep troubleshooting', color: 'var(--sd-qs-t2)' },
  l3: { chip: 'L3', sub: 'Root cause', color: 'var(--sd-qs-t3)' },
  config: { chip: 'CFG', sub: 'Interlocking tower', color: 'var(--sd-steel)' },
}
const chipFor = (t) => ROUTE_META[t.key] || { chip: '—', sub: t.kind === 'placeholder' ? 'Coming soon' : 'Route', color: 'var(--sd-steel)' }
// The chip carries the context (L1/L2/L3/HUB/CFG), so trim redundant prefixes so
// long labels ("Queue Overview") don't truncate in the narrow rail.
const labelFor = (t) => String(t.label || '')
  .replace(/^L\d\s*·\s*/, '')   // "L1 · Frontline" → "Frontline"
  .replace(/^Queue\s+/i, '')    // "Queue Overview" → "Overview", "Queue Config" → "Config"

/* Yard clock — HH:MM:SS, ticks every second while mounted. */
const clock = ref('')
let clockTimer = null
const tickClock = () => {
  const d = new Date()
  clock.value = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}
onMounted(() => { tickClock(); clockTimer = setInterval(tickClock, 1000) })
onUnmounted(() => clearInterval(clockTimer))
</script>

<style scoped>
/* ═══ Shell — riveted signal-box panel ═══ */
.syr {
  position: sticky; top: 64px; align-self: flex-start; flex-shrink: 0;
  width: 264px; max-height: calc(100vh - 84px);
  display: flex; flex-direction: column; margin: 4px 18px 4px 0;
  border-radius: 20px; overflow: hidden;
  background: linear-gradient(180deg, var(--sd-surface-elevated) 0%, var(--sd-basin, var(--sd-surface-glass)) 100%);
  border: 1px solid var(--sd-border-strong);
  box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%);
  transition: width 360ms var(--sd-spring); z-index: 8; isolation: isolate;
}
.syr.collapsed { width: 74px; }

/* Brushed-metal vertical grain (NOT the blueprint grid the Tickets rail uses). */
.syr-brush { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.55;
  background: repeating-linear-gradient(90deg, transparent 0 5px, color-mix(in srgb, var(--sd-border) 55%, transparent) 5px 6px);
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.4));
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.4)); }
/* Signal lantern glow breathing in the top-right corner. */
.syr-lantern { position: absolute; top: -70px; right: -70px; width: 200px; height: 200px; pointer-events: none; z-index: 0;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--ac, var(--sd-gold)) 26%, transparent), transparent 72%);
  filter: blur(6px); mix-blend-mode: screen; animation: syr-lantern 7s ease-in-out infinite; }

/* ═══ Tower cab ═══ */
.syr-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 15px 14px 12px; border-bottom: 1px solid var(--sd-border); }
.syr-brand { display: inline-flex; align-items: center; gap: 11px; min-width: 0; }
.cab-tile { position: relative; flex-shrink: 0; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
  color: var(--ac, var(--sd-gold)); background: var(--sd-panel, var(--sd-surface)); border: 1px solid var(--sd-border-strong);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 16px rgba(0,0,0,0.28); overflow: hidden; }
.cab-tile svg { position: relative; z-index: 1; }
/* Rotating tower beacon sweep behind the icon. */
.cab-beacon { position: absolute; inset: -60%;
  background: conic-gradient(from 0deg, transparent 0 62%, color-mix(in srgb, var(--ac, var(--sd-gold)) 55%, transparent) 80%, transparent 100%);
  animation: syr-beacon 6s linear infinite; opacity: 0.65; }
.cab-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.cab-name { font-size: 14px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cab-sub { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--sd-text-muted); font-family: var(--sd-mono); margin-top: 2px; }
/* Two-aspect block signal — red and green alternate. */
.blk-sig { display: inline-flex; gap: 3px; }
.blk-sig i { width: 5px; height: 5px; border-radius: 50%; }
.sig-r { background: var(--sd-danger); animation: syr-aspect 2.6s steps(1) infinite; }
.sig-g { background: var(--sd-success); animation: syr-aspect 2.6s steps(1) infinite reverse; }

.syr-collapse { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.syr-collapse:hover { color: var(--sd-text); border-color: var(--sd-border-strong); background: var(--sd-surface-elevated); }
.syr-collapse svg { transition: transform 0.34s var(--sd-spring); }
.syr-collapse svg.flip { transform: rotate(180deg); }

/* ═══ Yard clock ═══ */
.syr-clock { position: relative; z-index: 2; display: flex; align-items: baseline; gap: 8px; margin: 10px 12px 2px;
  padding: 7px 11px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  font-family: var(--sd-mono); }
.clock-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-dim); }
.clock-face { flex: 1; font-size: 13px; font-weight: 700; color: var(--sd-text); letter-spacing: 0.08em; font-variant-numeric: tabular-nums; }
.clock-block { display: inline-flex; align-items: center; gap: 4px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-success); }
.block-lamp { width: 5px; height: 5px; border-radius: 50%; background: var(--sd-success); animation: syr-lamp-pulse 2.2s ease-out infinite; }

/* ═══ Track diagram nav ═══ */
.syr-nav { position: relative; z-index: 2; flex: 1; overflow-y: auto; padding: 10px 10px 12px; scrollbar-width: none; }
.syr-nav::-webkit-scrollbar { width: 0; display: none; }
.syr-items { list-style: none; margin: 0; padding: 0 0 0 34px; position: relative; display: flex; flex-direction: column; gap: 5px; }

/* The main line — double rail + sleepers + a flowing block-current up the middle. */
.syr-track { position: absolute; left: 12px; top: 6px; bottom: 6px; width: 10px; pointer-events: none;
  border-left: 1.5px solid var(--sd-border-strong); border-right: 1.5px solid var(--sd-border-strong);
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sd-border-strong) 80%, transparent) 0 2px, transparent 2px 8px); }
.syr-track::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; margin-left: -1px;
  background: linear-gradient(180deg, transparent, var(--ac, var(--sd-gold)) 30%, var(--sd-ember) 55%, var(--ac, var(--sd-gold)) 75%, transparent);
  background-size: 100% 240%; opacity: 0.55; animation: syr-current 5s linear infinite; }

.syr-items li { position: relative; }
/* Switch node — a point on the main line; fills + glows when its route is set. */
.rail-node { position: absolute; left: -23px; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%;
  border: 2px solid var(--sd-border-strong); background: var(--sd-surface); z-index: 1;
  transition: border-color 0.28s var(--sd-spring), background 0.28s var(--sd-spring), box-shadow 0.3s; }
.syr-items li:hover .rail-node { border-color: color-mix(in srgb, var(--tc, var(--sd-amber)) 70%, transparent); }
.syr-items li.on .rail-node { border-color: var(--tc, var(--sd-gold)); background: var(--tc, var(--sd-gold));
  box-shadow: 0 0 10px color-mix(in srgb, var(--tc, var(--sd-gold)) 75%, transparent); }
/* Branch spur — throws from the node to the plate when the route is set. */
.rail-spur { position: absolute; left: -11px; top: 50%; height: 2px; width: 11px; margin-top: -1px;
  background: linear-gradient(90deg, var(--tc, var(--sd-gold)), color-mix(in srgb, var(--tc, var(--sd-gold)) 30%, transparent));
  transform: scaleX(0); transform-origin: left center; transition: transform 0.34s var(--sd-spring); overflow: visible; }
.syr-items li.on .rail-spur { transform: scaleX(1); }
/* Headlamp riding the spur out to the plate. */
.rail-spur::after { content: ''; position: absolute; top: 50%; left: 0; width: 4px; height: 4px; margin-top: -2px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 6px var(--tc, var(--sd-gold)); opacity: 0; }
.syr-items li.on .rail-spur::after { animation: syr-headlamp 1.7s ease-in-out infinite; }

/* Lever plate — the tab itself. Swings in like a thrown lever on entrance. */
.lever { position: relative; display: flex; align-items: center; gap: 9px; width: 100%; min-height: 46px; padding: 6px 9px 6px 7px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); border-radius: 12px; cursor: pointer; text-align: left;
  color: var(--sd-text-secondary); font-family: inherit;
  transition: color 0.22s var(--sd-spring), background 0.24s var(--sd-spring), border-color 0.24s var(--sd-spring),
    transform 0.28s var(--sd-spring), box-shadow 0.28s;
  transform-origin: left center; animation: syr-throw 0.55s var(--sd-spring) both; animation-delay: calc(0.06s + var(--i, 0) * 0.055s); }
.lever:hover { color: var(--sd-text); border-color: color-mix(in srgb, var(--tc, var(--sd-amber)) 40%, var(--sd-border));
  background: color-mix(in srgb, var(--tc, var(--sd-amber)) 7%, var(--sd-surface)); transform: translateX(2px); }
.lever.on { color: var(--sd-text); transform: translateX(5px);
  border-color: color-mix(in srgb, var(--tc, var(--sd-gold)) 55%, var(--sd-border-strong));
  background: linear-gradient(90deg, color-mix(in srgb, var(--tc, var(--sd-gold)) 16%, var(--sd-surface)), var(--sd-surface) 78%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22), inset 2px 0 0 var(--tc, var(--sd-gold)); }
.lever.soon { color: var(--sd-text-muted); }
.lever.soon:hover, .lever.soon.on { color: var(--sd-text); }

.lever-plate { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  color: var(--tc, var(--sd-amber)); background: color-mix(in srgb, var(--tc, var(--sd-amber)) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc, var(--sd-amber)) 24%, transparent);
  transition: transform 0.26s var(--sd-spring), background 0.24s; }
.lever:hover .lever-plate { transform: scale(1.08) rotate(-4deg); }
.lever.on .lever-plate { background: color-mix(in srgb, var(--tc, var(--sd-gold)) 20%, transparent); }

.lever-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.lever-lbl { font-size: 12.5px; font-weight: 700; letter-spacing: 0.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lever-sub { font-size: 9.5px; font-weight: 600; letter-spacing: 0.05em; color: var(--sd-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lever.on .lever-sub { color: var(--sd-text-muted); }

.lever-chip { flex-shrink: 0; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  padding: 2px 6px; border-radius: 6px; color: var(--tc, var(--sd-amber));
  background: color-mix(in srgb, var(--tc, var(--sd-amber)) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc, var(--sd-amber)) 28%, transparent); }
.lever-chip.soon { color: var(--sd-text-dim); background: var(--sd-surface); border-color: var(--sd-border); }

/* Signal lamp — dim until the route is set, then green with a pulsing halo. */
.lamp { flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%;
  background: color-mix(in srgb, var(--sd-steel) 45%, transparent);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5); transition: background 0.25s, box-shadow 0.25s; }
.lever:hover .lamp:not(.lit) { background: var(--sd-warning); box-shadow: 0 0 7px color-mix(in srgb, var(--sd-warning) 60%, transparent); }
.lamp.lit { background: var(--sd-success); animation: syr-lamp-pulse 2s ease-out infinite; }

/* ═══ Signal-box footer ═══ */
.syr-foot { position: relative; z-index: 2; padding: 10px 12px 13px; border-top: 1px solid var(--sd-border); display: flex; flex-direction: column; gap: 8px; }
.foot-dispatch { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; border-radius: 12px; cursor: pointer; border: 0;
  font-size: 12.5px; font-weight: 700; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 18px rgba(251, 146, 60, 0.26); font-family: inherit; }
[data-theme="light"] .foot-dispatch { color: #fff8ec; }

/* Semaphore motion lever — arm drops to CLEAR when cinematic is on. */
.sema-toggle { display: inline-flex; align-items: center; gap: 9px; height: 34px; padding: 0 11px; border-radius: 11px; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; transition: all 0.2s var(--sd-spring); font-family: inherit; }
.sema-toggle:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.sema-toggle.on { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.sema { position: relative; width: 15px; height: 15px; flex-shrink: 0; }
.sema-mast { position: absolute; left: 2px; top: 1px; bottom: 0; width: 2.5px; border-radius: 2px; background: currentColor; opacity: 0.55; }
.sema-arm { position: absolute; left: 2px; top: 2.5px; width: 11px; height: 3px; border-radius: 2px; background: currentColor;
  transform-origin: 1.5px 1.5px; transform: rotate(40deg); transition: transform 0.4s var(--sd-spring); }
.sema-toggle.on .sema-arm { transform: rotate(-8deg); }
.sema-lens { position: absolute; right: 0; top: 1px; width: 5px; height: 5px; border-radius: 50%; background: var(--sd-danger); transition: background 0.3s; }
.sema-toggle.on .sema-lens { background: var(--sd-success); animation: syr-lamp-pulse 2.2s ease-out infinite; }
.sema-text { flex: 1; text-align: left; }
.sema-state { font-family: var(--sd-mono); font-size: 10px; opacity: 0.8; }

/* ═══ Collapsed ═══ */
.syr.collapsed .syr-items { padding-left: 0; }
.syr.collapsed .syr-track, .syr.collapsed .rail-node, .syr.collapsed .rail-spur { display: none; }
.syr.collapsed .lever { justify-content: center; padding: 6px 0; min-height: 44px; }
.syr.collapsed .lever .lamp { position: absolute; top: 5px; right: 5px; width: 5px; height: 5px; }
.syr.collapsed .foot-dispatch, .syr.collapsed .sema-toggle { justify-content: center; padding: 0; }

/* ═══ Keyframes ═══ */
@keyframes syr-throw { from { opacity: 0; transform: translateX(-16px) rotate(-4deg); } to { opacity: 1; transform: translateX(0) rotate(0); } }
@keyframes syr-beacon { to { transform: rotate(360deg); } }
@keyframes syr-lantern { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.12); } }
@keyframes syr-current { 0% { background-position: 0 -140%; } 100% { background-position: 0 140%; } }
@keyframes syr-aspect { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.18; } }
@keyframes syr-headlamp { 0% { left: 0; opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { left: calc(100% - 4px); opacity: 0; } }
@keyframes syr-lamp-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-success) 55%, transparent); } 70%, 100% { box-shadow: 0 0 0 6px transparent; } }

/* ═══ Light theme ═══ */
[data-theme="light"] .syr { box-shadow: var(--sd-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.55); }
[data-theme="light"] .syr-lantern { mix-blend-mode: multiply; opacity: 0.35; }
[data-theme="light"] .syr-brush { opacity: 0.4; }
[data-theme="light"] .cab-tile { box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(120, 82, 20, 0.14); }
[data-theme="light"] .lamp { box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18); }
[data-theme="light"] .lever.on { box-shadow: 0 6px 16px rgba(120, 82, 20, 0.14), inset 2px 0 0 var(--tc, var(--sd-gold)); }

/* ═══ Responsive + reduced motion ═══ */
@media (max-width: 900px) {
  .syr { width: 74px; }
  .syr .cab-text, .syr .syr-clock, .syr .lever-body, .syr .lever-chip, .syr .sema-text, .syr .sema-state { display: none; }
  .syr .syr-items { padding-left: 0; }
  .syr .syr-track, .syr .rail-node, .syr .rail-spur { display: none; }
  .syr .lever { justify-content: center; padding: 6px 0; min-height: 44px; }
  .syr .lever .lamp { position: absolute; top: 5px; right: 5px; width: 5px; height: 5px; }
  .syr .foot-dispatch, .syr .sema-toggle { justify-content: center; padding: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .syr-lantern, html:not([data-cinematic="on"]) .cab-beacon,
  html:not([data-cinematic="on"]) .sig-r, html:not([data-cinematic="on"]) .sig-g,
  html:not([data-cinematic="on"]) .block-lamp, html:not([data-cinematic="on"]) .syr-track::after,
  html:not([data-cinematic="on"]) .rail-spur::after, html:not([data-cinematic="on"]) .lamp.lit,
  html:not([data-cinematic="on"]) .sema-lens, html:not([data-cinematic="on"]) .lever { animation: none; }
  html:not([data-cinematic="on"]) .rail-node, html:not([data-cinematic="on"]) .rail-spur,
  html:not([data-cinematic="on"]) .lever-plate, html:not([data-cinematic="on"]) .sema-arm,
  html:not([data-cinematic="on"]) .syr-collapse svg, html:not([data-cinematic="on"]) .syr { transition: none; }
}
</style>
