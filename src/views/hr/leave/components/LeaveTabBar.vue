<template>
  <aside class="lv-dock" role="tablist" aria-label="Leave & absence sections" :data-tab="modelValue">
    <!-- ═══ Ambient layers ═══ -->
    <div class="dock-atm" aria-hidden="true">
      <div class="atm-aurora" />
      <div class="atm-aurora a2" />
      <div class="atm-grain" />
      <div class="atm-grid" />
      <!-- Drifting embers -->
      <svg class="atm-embers" viewBox="0 0 80 1200" preserveAspectRatio="xMidYMid slice">
        <g v-for="n in 12" :key="n" :style="emberStyle(n)">
          <circle :cx="14 + (n * 5) % 50" :cy="(n * 110) + 30" r="1.5" class="ember-dot" />
        </g>
      </svg>
    </div>

    <!-- ═══ Brand block ═══ -->
    <header class="dock-brand" aria-hidden="true">
      <div class="brand-sun">
        <span class="bs-rays" />
        <span class="bs-disc" />
        <span class="bs-core">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 9h16" />
            <path d="M8 3v4M16 3v4" />
            <path d="M8 13l2.5 2.5L15.5 11" stroke-width="2" />
          </svg>
        </span>
      </div>
      <div class="brand-meta">
        <span class="brand-eyebrow leave-mono">FY {{ fyLabel }}</span>
        <span class="brand-name">
          Leave<span class="bn-amp">&amp;</span>Absence
        </span>
        <span class="brand-tag leave-mono">CONTROL DECK</span>
      </div>
    </header>

    <!-- ═══ Vertical rail ═══ -->
    <nav class="dock-rail" ref="trackRef">
      <!-- Animated active-item "sheet" — slides between buttons -->
      <span class="sheet" :style="sheetStyle" aria-hidden="true">
        <span class="sheet-grad" />
        <span class="sheet-scan" />
        <span class="sheet-edge" />
      </span>

      <template v-for="(grp, gi) in groupedTabs" :key="grp.key">
        <header class="group-head">
          <span class="group-num leave-mono">{{ String(gi + 1).padStart(2, '0') }}</span>
          <span class="group-label">{{ grp.label }}</span>
          <span class="group-rule" />
        </header>
        <ul class="group-items">
          <li v-for="t in grp.items" :key="t.key">
            <button
              type="button"
              :class="['dock-item', { active: modelValue === t.key, soon: t.soon }]"
              :data-tab="t.key"
              @click="select(t.key)"
              :ref="el => (refs[t.key] = el)"
            >
              <span class="di-icon-wrap">
                <span class="di-icon"><component :is="t.icon" :size="14" /></span>
                <span class="di-icon-glow" aria-hidden="true" />
              </span>
              <span class="di-label">{{ t.label }}</span>
              <span v-if="t.count" class="di-badge leave-mono">{{ t.count }}</span>
              <span v-if="t.soon" class="di-soon leave-mono">SOON</span>
              <span class="di-trail" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </template>
    </nav>

    <!-- ═══ Footer — FY usage meter + system status ═══ -->
    <footer class="dock-foot">
      <div class="foot-status">
        <span class="fs-dot" />
        <span class="fs-lbl leave-mono">ONLINE</span>
        <span class="fs-meta leave-mono">{{ activeTabs }}/{{ totalTabs }}</span>
      </div>
      <div class="foot-meter">
        <div class="fm-bar">
          <span class="fm-fill" :style="{ width: meterPct + '%' }" />
        </div>
        <div class="fm-meta leave-mono">
          <span>FY THROUGHPUT</span>
          <span class="fm-num">{{ meterPct }}%</span>
        </div>
      </div>
    </footer>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
  fyLabel: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const GROUPS = [
  { key: 'overview',      label: 'Overview' },
  { key: 'ops',           label: 'Operations' },
  { key: 'configuration', label: 'Configuration' },
  { key: 'system',        label: 'System' },
]

const groupedTabs = computed(() =>
  GROUPS
    .map(g => ({ ...g, items: props.tabs.filter(t => (t.group || 'ops') === g.key) }))
    .filter(g => g.items.length)
)
const totalTabs = computed(() => props.tabs.filter(t => !t.soon).length)
const activeTabs = computed(() => props.tabs.filter(t => !t.soon).length) // could derive from API later

// Heuristic meter — counts tabs with badge counts vs total
const meterPct = computed(() => {
  const withCounts = props.tabs.filter(t => t.count && Number(t.count) > 0).length
  return Math.min(100, Math.round((withCounts / Math.max(1, props.tabs.length)) * 100) || 64)
})

const refs = ref({})
const sheetStyle = ref({ opacity: 0 })

const measureSheet = async () => {
  await nextTick()
  const el = refs.value[props.modelValue]
  if (!el) { sheetStyle.value = { opacity: 0 }; return }
  sheetStyle.value = {
    transform: `translateY(${el.offsetTop}px)`,
    height: `${el.offsetHeight}px`,
    opacity: 1,
  }
}

onMounted(() => measureSheet())
watch(() => props.modelValue, () => measureSheet())
watch(() => props.tabs, () => measureSheet(), { deep: true })

const select = (key) => emit('update:modelValue', key)

const emberStyle = (n) => ({
  animation: `ember-drift ${18 + (n % 5) * 4}s linear infinite`,
  animationDelay: `${-(n * 1.6)}s`,
})
</script>

<style scoped>
.lv-dock {
  position: sticky; top: 18px;
  align-self: start;
  flex-shrink: 0;
  width: 252px;
  display: flex; flex-direction: column;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.06), rgba(234, 88, 12, 0.04)),
    var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  padding: 16px 10px 14px;
  overflow: hidden;
  isolation: isolate;
  box-shadow: 0 24px 60px -32px rgba(0, 0, 0, 0.6);
}
[data-theme="light"] .lv-dock {
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.10), rgba(234, 88, 12, 0.04)),
    rgba(255, 250, 235, 0.92);
  box-shadow: 0 16px 40px -28px rgba(124, 45, 18, 0.24);
}

/* ── Ambient ─────────────────────────────────────────────────────────── */
.dock-atm {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  overflow: hidden; border-radius: inherit;
}
.atm-aurora {
  position: absolute; inset: -20% -10% auto auto;
  width: 70%; height: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.30), transparent 65%);
  filter: blur(40px);
  animation: leave-glow-breathe 8s ease-in-out infinite;
}
.atm-aurora.a2 {
  inset: auto auto -10% -10%;
  width: 60%; height: 40%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(234, 88, 12, 0.24), transparent 65%);
  animation: leave-glow-breathe 11s ease-in-out infinite reverse;
}
.atm-grain {
  position: absolute; inset: 0; opacity: 0.04;
  mix-blend-mode: overlay;
  background-image:
    radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px);
  background-size: 5px 5px;
}
.atm-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(var(--leave-grid-line) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.45), transparent 75%);
  opacity: 0.55;
}
.atm-embers { position: absolute; inset: 0; width: 100%; height: 100%; }
.ember-dot {
  fill: var(--w-gold-200);
  filter: drop-shadow(0 0 4px var(--w-gold-300));
}
@keyframes ember-drift {
  0%   { transform: translateY(20%); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(-40%); opacity: 0; }
}

/* ── Brand block ─────────────────────────────────────────────────────── */
.dock-brand {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 12px;
  padding: 6px 10px 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--leave-border);
}

.brand-sun {
  position: relative;
  width: 46px; height: 46px;
  flex-shrink: 0;
}
.bs-rays {
  position: absolute; inset: -6px;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg,
      transparent 0deg, var(--w-gold-300) 8deg, transparent 12deg, transparent 38deg,
      var(--w-gold-200) 46deg, transparent 50deg, transparent 76deg,
      var(--w-orange-300) 84deg, transparent 88deg, transparent 114deg,
      var(--w-gold-300) 122deg, transparent 126deg, transparent 152deg,
      var(--w-gold-200) 160deg, transparent 164deg, transparent 190deg,
      var(--w-orange-300) 198deg, transparent 202deg, transparent 228deg,
      var(--w-gold-300) 236deg, transparent 240deg, transparent 266deg,
      var(--w-gold-200) 274deg, transparent 278deg, transparent 304deg,
      var(--w-orange-300) 312deg, transparent 316deg, transparent 342deg,
      var(--w-gold-300) 350deg, transparent 354deg);
  filter: blur(0.5px);
  opacity: 0.7;
  animation: leave-orb-spin 14s linear infinite;
}
.bs-disc {
  position: absolute; inset: 2px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fffbea, #fde047 30%, #fbbf24 55%, #ea580c 92%);
  box-shadow:
    0 0 22px 4px rgba(251, 191, 36, 0.40),
    inset 0 -2px 6px rgba(120, 53, 15, 0.30);
  animation: leave-glow-breathe 5s ease-in-out infinite;
}
.bs-core {
  position: absolute; inset: 4px;
  border-radius: 50%;
  display: grid; place-items: center;
  color: #2a1100;
  background: radial-gradient(circle at 35% 35%, rgba(255, 251, 234, 0.95), rgba(251, 191, 36, 0.6) 70%);
  z-index: 1;
}
[data-theme="light"] .bs-core { color: #2a1100; }

.brand-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.brand-eyebrow {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--w-gold-200);
}
[data-theme="light"] .brand-eyebrow { color: var(--w-gold-700); }
.brand-name {
  font-size: 15px; font-weight: 800;
  letter-spacing: -0.018em;
  color: var(--leave-text);
  line-height: 1.05;
}
.bn-amp {
  font-style: italic; opacity: 0.55;
  margin: 0 1px;
  background: linear-gradient(135deg, #fde047, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.brand-tag {
  margin-top: 2px;
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.22em;
  color: var(--leave-text-muted);
}

/* ── Rail body ───────────────────────────────────────────────────────── */
.dock-rail {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 2px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.30) transparent;
}
.dock-rail::-webkit-scrollbar { width: 4px; }
.dock-rail::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.30); border-radius: 999px; }

.sheet {
  position: absolute; left: 4px; right: 4px;
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(234, 88, 12, 0.10));
  border: 1px solid var(--leave-brand);
  box-shadow:
    0 10px 28px -10px rgba(251, 191, 36, 0.55),
    0 0 18px -2px color-mix(in srgb, var(--leave-brand) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  transition:
    transform .46s cubic-bezier(0.34, 1.4, 0.64, 1),
    height .46s cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity .25s;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
[data-theme="light"] .sheet {
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(234, 88, 12, 0.12));
  box-shadow:
    0 10px 28px -10px rgba(251, 191, 36, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.sheet-grad {
  position: absolute; inset: 0;
  background:
    radial-gradient(50% 100% at 0% 50%, rgba(251, 191, 36, 0.32), transparent 70%);
}
.sheet-scan {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(255, 255, 255, 0.18) 50%, transparent 65%);
  background-size: 250% 100%;
  animation: leave-shimmer 2.6s linear infinite;
  pointer-events: none;
}
.sheet-edge {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--w-gold-200) 50%, transparent);
  box-shadow: 0 0 8px var(--w-gold-200);
}

/* Group headers */
.group-head {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 8px;
  margin: 14px 10px 6px;
}
.group-num {
  font-size: 9px; font-weight: 800;
  color: var(--w-gold-200);
  letter-spacing: 0.18em;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
[data-theme="light"] .group-num { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.18); border-color: rgba(217, 119, 6, 0.30); }
.group-label {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.20em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.group-rule {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--leave-border-strong), transparent);
}

/* Items */
.group-items { list-style: none; margin: 0; padding: 0 4px; display: flex; flex-direction: column; gap: 1px; }

.dock-item {
  position: relative; z-index: 1; overflow: hidden;
  display: flex; align-items: center; gap: 11px;
  width: 100%; text-align: left;
  padding: 10px 12px; border-radius: 11px;
  background: transparent; border: 0;
  color: var(--leave-text-secondary);
  font: inherit; font-size: 12.5px; font-weight: 600;
  cursor: pointer;
  transition: color .22s, background .22s, transform .18s;
}
.dock-item:hover { color: var(--leave-text); background: rgba(251, 191, 36, 0.06); }
.dock-item.active {
  color: var(--leave-text);
  font-weight: 800;
}
.dock-item.active .di-label {
  background: linear-gradient(135deg, #fff8dc, #fde047 50%, #fbbf24);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
[data-theme="light"] .dock-item.active .di-label {
  background: linear-gradient(135deg, #2a1100, #78350f 50%, #b45309);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.dock-item.soon { color: var(--leave-text-muted); opacity: 0.72; }

.di-icon-wrap {
  position: relative;
  width: 18px; height: 18px;
  flex-shrink: 0;
}
.di-icon {
  position: absolute; inset: 0;
  display: inline-grid; place-items: center;
  color: var(--w-gold-200);
  z-index: 1;
  transition: color .22s, transform .22s;
}
[data-theme="light"] .di-icon { color: var(--w-gold-600); }
.dock-item.active .di-icon { color: var(--leave-brand); transform: scale(1.1); }
.dock-item.soon .di-icon { color: var(--leave-text-muted); }
.di-icon-glow {
  position: absolute; inset: -6px;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, var(--leave-brand), transparent 70%);
  filter: blur(6px); opacity: 0;
  transition: opacity .22s;
}
.dock-item.active .di-icon-glow { opacity: 0.65; }

.di-label {
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: -0.005em;
}

.di-badge {
  display: inline-grid; place-items: center;
  min-width: 20px; height: 18px; padding: 0 6px;
  border-radius: 999px;
  background: var(--leave-pending-mgr-soft);
  border: 1px solid color-mix(in srgb, var(--leave-pending-mgr) 50%, transparent);
  color: var(--leave-pending-mgr);
  font-size: 9.5px; font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.di-soon {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em;
  padding: 2px 6px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  color: var(--leave-text-muted);
  border: 1px solid var(--leave-border);
}

.di-trail {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--leave-brand);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform .35s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 6px var(--leave-brand);
}
.dock-item.active .di-trail { transform: scaleY(1); }

/* ── Footer ──────────────────────────────────────────────────────────── */
.dock-foot {
  position: relative; z-index: 1;
  margin-top: 10px;
  padding: 12px 10px 6px;
  border-top: 1px solid var(--leave-border);
  display: flex; flex-direction: column; gap: 9px;
}
.foot-status {
  display: flex; align-items: center; gap: 7px;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.14em;
}
.fs-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-approved);
  box-shadow: 0 0 8px var(--leave-approved);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}
.fs-lbl { color: var(--leave-approved); }
.fs-meta {
  margin-left: auto;
  color: var(--leave-text-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
}

.foot-meter { display: flex; flex-direction: column; gap: 5px; }
.fm-bar {
  height: 4px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  position: relative;
}
.fm-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #fde047, #fbbf24 50%, #ea580c);
  border-radius: 999px;
  transition: width .9s var(--leave-ease);
  position: relative;
}
.fm-fill::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  background-size: 200% 100%;
  animation: leave-gradient-pan 2.4s linear infinite;
}
.fm-meta {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--leave-text-muted);
}
.fm-num {
  color: var(--w-gold-200);
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  letter-spacing: 0.04em;
}
[data-theme="light"] .fm-num { color: var(--w-gold-600); }

/* Responsive: collapse to horizontal row */
@media (max-width: 1024px) {
  .lv-dock { position: relative; top: 0; width: 100%; padding: 14px 14px 12px; }
  .dock-rail { flex-direction: row; flex-wrap: wrap; gap: 4px; overflow: visible; }
  .group-items { flex-direction: row; flex-wrap: wrap; }
  .group-head { margin: 8px 0 4px; }
  .sheet { display: none; }
  .di-trail { display: none; }
  .dock-foot { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .bs-rays, .bs-disc, .atm-aurora, .ember-dot, .sheet-scan, .fm-fill::after,
  .fs-dot { animation: none !important; }
}
</style>
