<template>
  <div class="chz" ref="rootEl" :class="{ lit }">
    <div class="chz-grain trn-grain" aria-hidden="true" />
    <div class="chz-aurora" aria-hidden="true" />

    <header class="chz-head">
      <div class="chz-titles">
        <span class="chz-eyebrow trn-mono"><Telescope :size="12" /> Compliance Horizon</span>
        <h3>Everything approaching its <span class="chz-grad">expiry line</span></h3>
      </div>
      <div class="chz-legend">
        <span><i style="background: var(--trn-cert-expired)" /> Lapsed</span>
        <span><i style="background: var(--trn-cert-pending)" /> ≤30d</span>
        <span><i style="background: var(--trn-cert-expiring)" /> ≤60d</span>
        <span><i style="background: var(--trn-core)" /> ≤90d</span>
        <span><i style="background: var(--trn-cert-active)" /> In motion</span>
      </div>
    </header>

    <div class="chz-band">
      <div class="chz-zonegrad" aria-hidden="true" />

      <!-- ticks -->
      <span v-for="t in ticks" :key="t.label" class="chz-tick" :class="t.cls" :style="{ left: t.x + '%' }">
        <i /><b>{{ t.label }}</b>
      </span>

      <!-- now marker -->
      <span class="chz-now" :style="{ left: NOW_X + '%' }"><i /><b>NOW</b></span>

      <!-- baseline -->
      <span class="chz-baseline" aria-hidden="true" />

      <!-- scanning light -->
      <span class="chz-scan" aria-hidden="true" />

      <!-- pips -->
      <span v-for="(p, i) in pips" :key="p.id" class="chz-pip" :class="[`t-${p.key}`, { rise: lit }]"
        :style="{ left: p.x + '%', '--pc': p.color, '--h': p.h + 'px', '--d': (0.25 + i * 0.05) + 's' }"
        @pointerenter="hover(p, $event)" @pointermove="move" @pointerleave="active = null">
        <span class="chz-stem" />
        <span class="chz-dot" />
      </span>

      <div v-if="!pips.length" class="chz-clear-note">Horizon clear — nothing within 90 days</div>
    </div>

    <Teleport to="body">
      <div v-if="active" class="chz-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
        <strong>{{ active.name }}</strong>
        <span>{{ active.employee }}</span>
        <span class="chz-tip-days" :style="{ color: active.color }">{{ active.label }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Telescope } from 'lucide-vue-next'

const props = defineProps({
  certs: { type: Array, default: () => [] },
})

const NOW_X = 15
const RIGHT_X = 96
const tickX = (d) => NOW_X + (Math.min(Math.max(d, 0), 90) / 90) * (RIGHT_X - NOW_X)
const ticks = [
  { label: 'Lapsed', x: 5, cls: 'past' },
  { label: '30d', x: tickX(30), cls: '' },
  { label: '60d', x: tickX(60), cls: '' },
  { label: '90d', x: tickX(90), cls: '' },
]

const daysOf = (c) => (c.days_to_expiry === undefined ? null : c.days_to_expiry)
const isPending = (c) => c.status === 'PENDING_RENEWAL'

const colorKey = (c) => {
  if (isPending(c)) return { key: 'pending', color: 'var(--trn-cert-active)', urgency: 0.5 }
  const d = daysOf(c)
  if (d === null) return { key: 'd90', color: 'var(--trn-core)', urgency: 0.15 }
  if (d < 0) return { key: 'expired', color: 'var(--trn-cert-expired)', urgency: 1 }
  if (d <= 30) return { key: 'd30', color: 'var(--trn-cert-pending)', urgency: 1 - d / 120 }
  if (d <= 60) return { key: 'd60', color: 'var(--trn-cert-expiring)', urgency: 1 - d / 120 }
  return { key: 'd90', color: 'var(--trn-core)', urgency: 1 - d / 120 }
}
const daysLabel = (c) => {
  const d = daysOf(c)
  if (isPending(c)) return 'Renewal in motion'
  if (d === null) return 'No expiry set'
  if (d < 0) return `Lapsed ${Math.abs(d)}d ago`
  if (d === 0) return 'Expires today'
  return `Expires in ${d}d`
}

const pips = computed(() => {
  const list = props.certs || []
  // rank expired so they spread across the "lapsed" zone instead of stacking
  const expired = list.filter(c => !isPending(c) && daysOf(c) !== null && daysOf(c) < 0)
    .sort((a, b) => (daysOf(a) ?? 0) - (daysOf(b) ?? 0))
  const expIndex = new Map(expired.map((c, i) => [c, i]))
  const expN = Math.max(expired.length - 1, 1)

  return list.map((c, i) => {
    const meta = colorKey(c)
    const d = daysOf(c)
    let x
    if (!isPending(c) && d !== null && d < 0) {
      const rank = expIndex.get(c) ?? 0
      x = 11 - (rank / expN) * 8 // 3 … 11 across the lapsed zone
    } else {
      const dd = d === null ? 90 : Math.min(Math.max(d, 0), 90)
      x = NOW_X + (dd / 90) * (RIGHT_X - NOW_X)
    }
    const h = 22 + Math.max(0, Math.min(1, meta.urgency)) * 88
    return {
      id: c.id ?? `${c.employee_name}-${c.name}-${i}`,
      x, h, key: meta.key, color: meta.color,
      name: c.name || 'Certification',
      employee: c.employee_name || '—',
      label: daysLabel(c),
    }
  })
})

const rootEl = ref(null)
const lit = ref(false)
const active = ref(null)
const tip = ref({ x: 0, y: 0 })
const hover = (p, e) => { active.value = p; move(e) }
const move = (e) => { tip.value = { x: e.clientX + 14, y: e.clientY + 14 } }

onMounted(async () => { await nextTick(); requestAnimationFrame(() => requestAnimationFrame(() => { lit.value = true })) })
</script>

<style scoped>
.chz { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 20px 22px 16px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.chz-grain { z-index: 0; opacity: 0.05; }
.chz-aurora { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.9;
  background:
    radial-gradient(60% 90% at 8% 100%, color-mix(in srgb, var(--trn-cert-expired) 13%, transparent), transparent 60%),
    radial-gradient(55% 90% at 96% 100%, color-mix(in srgb, var(--trn-cert-active) 11%, transparent), transparent 60%),
    radial-gradient(50% 80% at 50% 100%, color-mix(in srgb, var(--trn-amber) 9%, transparent), transparent 62%); }
.chz > *:not(.chz-grain):not(.chz-aurora) { position: relative; z-index: 1; }

.chz-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.chz-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.chz-titles h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--trn-text); }
.chz-grad { background: linear-gradient(110deg, #fbbf24, #fde68a 45%, #fb923c); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
[data-theme="light"] .chz-grad { background: linear-gradient(110deg, #b45309, #d97706 45%, #c2410c); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.chz-legend { display: flex; flex-wrap: wrap; gap: 5px 12px; font-size: 10.5px; color: var(--trn-text-muted); }
.chz-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chz-legend i { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }

/* band */
.chz-band { position: relative; height: 188px; margin-top: 6px; }
.chz-zonegrad { position: absolute; left: 0; right: 0; bottom: 38px; height: 4px; border-radius: 999px; opacity: 0; transition: opacity 0.8s 0.1s;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--trn-cert-expired) 55%, transparent) 0%,
    color-mix(in srgb, var(--trn-cert-pending) 55%, transparent) 22%,
    color-mix(in srgb, var(--trn-cert-expiring) 50%, transparent) 48%,
    color-mix(in srgb, var(--trn-core) 50%, transparent) 72%,
    color-mix(in srgb, var(--trn-cert-active) 50%, transparent) 100%); }
.chz.lit .chz-zonegrad { opacity: 0.7; }

.chz-baseline { position: absolute; left: 0; right: 0; bottom: 38px; height: 1px; background: var(--trn-border-strong);
  transform: scaleX(0); transform-origin: left center; transition: transform 0.9s var(--trn-spring); }
.chz.lit .chz-baseline { transform: scaleX(1); }

.chz-tick { position: absolute; bottom: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 3px;
  opacity: 0; transition: opacity 0.5s; }
.chz.lit .chz-tick { opacity: 1; transition-delay: 0.5s; }
.chz-tick i { width: 1px; height: 28px; background: var(--trn-grid-line); }
.chz-tick b { font-family: var(--trn-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.06em; color: var(--trn-text-dim); }
.chz-tick.past b { color: var(--trn-cert-expired); }

.chz-now { position: absolute; bottom: 0; top: 6px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;
  opacity: 0; transition: opacity 0.6s 0.4s; }
.chz.lit .chz-now { opacity: 1; }
.chz-now i { flex: 1; width: 1.5px; background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--trn-amber) 60%, transparent)); }
.chz-now b { font-family: var(--trn-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--trn-amber-strong); margin-top: 4px; }

/* scanning light */
.chz-scan { position: absolute; top: 0; bottom: 38px; width: 130px; left: -14%; pointer-events: none; mix-blend-mode: screen;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent);
  animation: chz-scan 6.5s linear infinite 1s; }
[data-theme="light"] .chz-scan { mix-blend-mode: multiply; opacity: 0.5; }
@keyframes chz-scan { 0% { left: -14%; } 100% { left: 104%; } }

/* pips */
.chz-pip { position: absolute; bottom: 38px; width: 16px; height: var(--h); transform: translateX(-50%); cursor: pointer; }
.chz-stem { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) scaleY(0); transform-origin: bottom; width: 2px; height: 100%; border-radius: 2px;
  background: linear-gradient(to top, color-mix(in srgb, var(--pc) 8%, transparent), var(--pc)); transition: transform 0.7s var(--trn-spring); transition-delay: var(--d); }
.chz-pip.rise .chz-stem { transform: translateX(-50%) scaleY(1); }
.chz-dot { position: absolute; top: -5px; left: 50%; width: 11px; height: 11px; border-radius: 50%; background: var(--pc);
  box-shadow: 0 0 12px var(--pc); opacity: 0; transform: translateX(-50%) scale(0.3);
  transition: opacity 0.45s var(--trn-spring), transform 0.55s var(--trn-spring), box-shadow 0.25s; transition-delay: calc(var(--d) + 0.14s); }
.chz-pip.rise .chz-dot { opacity: 1; transform: translateX(-50%) scale(1); }
.chz-pip:hover .chz-dot { transform: translateX(-50%) scale(1.5); box-shadow: 0 0 18px 2px var(--pc); }
.chz-pip.t-expired .chz-dot { animation: chz-pulse 2.2s ease-in-out infinite 1.2s; }
@keyframes chz-pulse { 0%, 100% { box-shadow: 0 0 10px var(--pc); } 50% { box-shadow: 0 0 20px 3px var(--pc); } }

.chz-clear-note { position: absolute; left: 50%; bottom: 60px; transform: translateX(-50%); font-size: 12px; color: var(--trn-text-dim);
  padding: 6px 14px; border-radius: 999px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }

.chz-tip { position: fixed; z-index: 1600; pointer-events: none; display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 10px; max-width: 240px;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow); }
.chz-tip strong { font-size: 12.5px; font-weight: 700; color: var(--trn-text); }
.chz-tip span { font-size: 11px; color: var(--trn-text-muted); }
.chz-tip-days { font-weight: 700; }

@media (max-width: 600px) { .chz-band { height: 160px; } }
@media (prefers-reduced-motion: reduce) {
  .chz-zonegrad, .chz-baseline, .chz-tick, .chz-now, .chz-stem, .chz-dot { transition: none; }
  .chz-scan, .chz-pip.t-expired .chz-dot, .chz-grad { animation: none; }
  .chz-baseline { transform: scaleX(1); }
  .chz-stem { transform: translateX(-50%) scaleY(1); }
  .chz-dot { opacity: 1; transform: translateX(-50%) scale(1); }
}
</style>
