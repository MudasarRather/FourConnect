<template>
  <Motion ref="rootRef" as="section" class="bay ex-grain" :class="{ sealed, atrisk: m.atRisk }"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="bay-spot" aria-hidden="true" />
    <span class="bay-aura" aria-hidden="true" />

    <!-- HUD -->
    <header class="bay-hud">
      <div class="bay-lead">
        <span class="bay-eyebrow"><Magnet :size="12" /> RECOVERY BAY · ASSET RECALL</span>
        <h3 class="bay-title">{{ sealed ? 'All company assets recovered' : 'Recalling company property' }}</h3>
      </div>
      <div class="bay-readout">
        <span class="ro-chip" :class="{ alert: m.held }"><b><ExCountUp :value="m.held" /></b><i>held</i></span>
        <span class="ro-chip"><b><ExCountUp :value="m.requested" /></b><i>requested</i></span>
        <span class="ro-chip"><b><ExCountUp :value="m.transit" /></b><i>in transit</i></span>
        <span class="ro-chip rec"><b><ExCountUp :value="m.recovered" /></b><i>recovered</i></span>
        <span v-if="m.shortfall > 0" class="ro-chip short"><b><ExCountUp :value="m.shortfall" /></b><i>lost / dmg</i></span>
      </div>
    </header>

    <!-- the magnetic reclamation field -->
    <div class="bay-stage">
      <span class="bay-hexgrid" aria-hidden="true" />
      <span class="bay-coil c1" aria-hidden="true" />
      <span class="bay-coil c2" aria-hidden="true" />

      <!-- ambient drifting motes -->
      <span v-for="(d, i) in motes" :key="'mt' + i" class="bay-mote"
        :style="{ left: d.x + '%', top: d.y + '%', '--s': d.s + 'px', animationDelay: d.delay + 's', animationDuration: d.dur + 's' }" aria-hidden="true" />

      <!-- curved magnetic flux lines pulling everything into the vault -->
      <svg class="bay-flux" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="bayFlux" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fb923c" stop-opacity="0" />
            <stop offset="64%" stop-color="#fb923c" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#fcd34d" stop-opacity="0.95" />
          </linearGradient>
          <linearGradient id="bayFluxOk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#34d399" stop-opacity="0" />
            <stop offset="64%" stop-color="#34d399" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0.95" />
          </linearGradient>
          <!-- deeper gradients so the flux reads on the cream light theme -->
          <linearGradient id="bayFluxLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0" />
            <stop offset="60%" stop-color="#ea580c" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#b45309" stop-opacity="0.9" />
          </linearGradient>
          <linearGradient id="bayFluxOkLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#059669" stop-opacity="0" />
            <stop offset="60%" stop-color="#059669" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#047857" stop-opacity="0.95" />
          </linearGradient>
          <filter id="bayFluxBlur" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="2.6" /></filter>
        </defs>
        <path v-for="(f, i) in flux" :key="'fx' + i" class="flux-line" :d="f.d" fill="none"
          :style="{ animationDuration: f.dur + 's', '--d': (i * 0.4) + 's' }" />
      </svg>

      <!-- custody field units (held / requested / in-transit) -->
      <button v-for="u in fieldUnits" :key="u.key" type="button" class="unit" :class="[`p${u.phase}`, { intransit: u.phase === 2 }]"
        :style="{ left: u.x + '%', top: u.y + '%', '--d': u.delay + 's', '--c': u.hex }"
        :title="`${u.name || u.tag} · ${u.statusLabel}`" @click="$emit('go-fleet')">
        <span class="unit-glow" aria-hidden="true" />
        <span v-if="u.phase === 0" class="unit-recall" aria-hidden="true" />
        <component :is="u.icon" :size="15" class="unit-ico" />
        <span v-if="u.phase === 2 && !reduced" class="unit-trail" aria-hidden="true" />
      </button>

      <!-- the securement vault door -->
      <div class="vault" :class="{ on: sealed }">
        <span class="vault-recall" aria-hidden="true" />
        <span class="vault-recall d2" aria-hidden="true" />
        <span class="vault-lockring" aria-hidden="true" />
        <span class="vault-gauge" :style="{ '--ex-p': m.recoveryPct * 3.6 + 'deg' }" aria-hidden="true" />
        <!-- docking ports (emerald = recovered, red = lost/damaged) -->
        <span v-for="(p, i) in ports" :key="'port' + i" class="port" :class="portClass(i)"
          :style="{ transform: `rotate(${p}deg) translateY(-52px)` }" aria-hidden="true" />
        <div class="vault-center">
          <component :is="sealed ? PackageCheck : Vault" :size="17" class="vault-ico" />
          <span class="vault-pct ex-mono"><ExCountUp :value="m.recoveryPct" :suffix="'%'" /></span>
          <span class="vault-sub">{{ m.recovered }}/{{ m.total }} secured</span>
        </div>
        <span v-if="sealed && !reduced" class="vault-seal" aria-hidden="true" />
      </div>
    </div>

    <!-- at-risk / shortfall → F&F bridge -->
    <div v-if="showRisk" class="bay-risk" :class="{ over: m.overdue || m.shortfall > 0 }">
      <AlertTriangle :size="15" />
      <span class="risk-txt">
        <template v-if="m.shortfall > 0"><b>{{ m.shortfall }}</b> unit{{ m.shortfall > 1 ? 's' : '' }} lost / damaged<span v-if="m.unreturned > 0">, <b>{{ m.unreturned }}</b> still out</span>.</template>
        <template v-else><b>{{ m.unreturned }}</b> unit{{ m.unreturned > 1 ? 's' : '' }} still out{{ m.overdue ? ' — past last working day' : daysPhrase }}.</template>
        Unrecovered assets are charged as <b>recoveries</b> in the final settlement.
      </span>
      <button class="risk-link" type="button" @click="$emit('go', { tab: 'clearance' })">Clearance <ArrowUpRight :size="12" /></button>
      <button class="risk-link" type="button" @click="$emit('go', { tab: 'settlement' })">F&amp;F <ArrowUpRight :size="12" /></button>
    </div>

    <!-- footer -->
    <footer class="bay-foot">
      <div class="bay-state" :class="{ on: sealed }">
        <component :is="sealed ? ShieldCheck : RadioTower" :size="15" />
        <span>{{ stateLabel }}</span>
      </div>
      <div class="bay-acts">
        <Motion v-if="m.held > 0" as="button" type="button" class="bay-btn primary"
          :whileHover="busy ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="busy" @click="$emit('reflag')">
          <Loader2 v-if="busy" :size="15" class="spin" /><RefreshCw v-else :size="15" />
          Flag {{ m.held }} return{{ m.held > 1 ? 's' : '' }}
        </Motion>
        <button class="bay-btn ghost" type="button" @click="$emit('go-fleet')">Open Fleet Returns <ArrowUpRight :size="13" /></button>
      </div>
    </footer>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Magnet, Vault, PackageCheck, ShieldCheck, RadioTower, RefreshCw, Loader2, AlertTriangle, ArrowUpRight,
} from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  assets: { type: Array, default: () => [] },
  metrics: { type: Object, default: () => ({}) },
  caseInfo: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['reflag', 'go', 'go-fleet'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const m = computed(() => ({
  total: 0, recovered: 0, shortfall: 0, transit: 0, requested: 0, held: 0, unreturned: 0,
  recoveryPct: 0, atRisk: false, overdue: false, daysLeft: null, ...props.metrics,
}))
const sealed = computed(() => m.value.total > 0 && m.value.unreturned === 0 && m.value.shortfall === 0)
const showRisk = computed(() => m.value.shortfall > 0 || (m.value.unreturned > 0 && (m.value.atRisk || m.value.overdue)))
const portClass = (i) => {
  if (i < m.value.recovered) return 'lit'
  if (i < m.value.recovered + m.value.shortfall) return 'short'
  return ''
}

// units still in the field (phase 0 held, 1 requested, 2 transit) — recovered (3) live in the vault
const PHASE_HEX = ['#9ca3af', '#fbbf24', '#fb923c']
const fieldUnits = computed(() => {
  const inField = props.assets.filter(a => a.phase < 3)
  const bands = { 0: [6, 22], 1: [28, 44], 2: [50, 62] }
  const perPhase = { 0: 0, 1: 0, 2: 0 }
  return inField.map((a) => {
    const idx = perPhase[a.phase]++
    const [lo, hi] = bands[a.phase]
    const lanes = 4
    const lane = idx % lanes
    const col = Math.floor(idx / lanes)
    const x = lo + Math.min(1, col / 2) * (hi - lo) + ((idx * 7) % 5) - 2
    const y = 16 + lane * 19 + (((idx * 13) % 7) - 3)
    return { ...a, x: Math.max(3, Math.min(62, x)), y: Math.max(8, Math.min(84, y)),
      hex: PHASE_HEX[a.phase] || '#9ca3af', delay: Math.min(idx * 0.06, 0.7) }
  })
})

// docking ports around the vault (cap at 18 for legibility)
const ports = computed(() => {
  const n = Math.min(18, Math.max(0, m.value.total))
  return Array.from({ length: n }, (_, i) => Math.round((360 / n) * i))
})

// curved magnetic flux lines that converge into the vault (~78% x, mid)
const flux = [
  { d: 'M -30 64 C 240 24 470 92 840 150', dur: 6.5 },
  { d: 'M -30 150 C 250 150 540 150 840 150', dur: 8 },
  { d: 'M -30 238 C 240 280 480 208 840 150', dur: 7 },
  { d: 'M 150 -26 C 380 60 620 96 840 150', dur: 9 },
  { d: 'M 150 326 C 380 240 620 204 840 150', dur: 8.5 },
  { d: 'M -30 108 C 300 78 580 124 840 150', dur: 7.5 },
  { d: 'M -30 196 C 300 224 580 176 840 150', dur: 9.5 },
]

// ambient drifting motes (data-independent so the bay never reads empty)
const motes = (() => {
  let s = 73219
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  return Array.from({ length: 16 }, () => ({
    x: +(4 + r() * 62).toFixed(1), y: +(8 + r() * 82).toFixed(1),
    s: +(2 + r() * 2.6).toFixed(1), delay: +(r() * 6).toFixed(2), dur: +(5 + r() * 5).toFixed(2),
  }))
})()

const daysPhrase = computed(() => {
  const d = m.value.daysLeft
  if (d == null) return ''
  return d <= 7 ? ` — ${d} day${d === 1 ? '' : 's'} to last working day` : ''
})
const stateLabel = computed(() => {
  if (sealed.value) return 'Recovery complete — every unit returned'
  if (m.value.total === 0) return 'No company assets allocated to recover'
  if (m.value.unreturned === 0 && m.value.shortfall > 0)
    return `Pipeline clear — ${m.value.shortfall} unit${m.value.shortfall > 1 ? 's' : ''} written off to F&F`
  if (m.value.held > 0) return `${m.value.held} unit${m.value.held > 1 ? 's' : ''} not yet flagged for return`
  return `${m.value.unreturned} unit${m.value.unreturned > 1 ? 's' : ''} in the recovery pipeline`
})
</script>

<style scoped>
.bay { position: relative; overflow: hidden; border-radius: 22px; padding: 16px 18px 14px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); transition: border-color 0.5s var(--ex-spring); }
.bay.sealed { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); }
.bay.atrisk { border-color: color-mix(in srgb, var(--ex-blocked) 26%, transparent); }
.bay-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 6;
  background: radial-gradient(560px 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.14), transparent 62%); }
.bay-aura { position: absolute; inset: -40% -10% 45% 40%; pointer-events: none;
  background: radial-gradient(60% 80% at 80% 0%, rgba(251,146,60,0.16), transparent 70%); animation: ex-aura-drift 12s ease-in-out infinite; }
.bay.sealed .bay-aura { background: radial-gradient(60% 80% at 80% 0%, rgba(52,211,153,0.18), transparent 70%); }

/* HUD */
.bay-hud { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.bay-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--ex-violet);
  padding: 4px 9px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.bay-title { font-size: 15.5px; font-weight: 820; color: var(--ex-text); margin: 8px 0 0; }
.bay-readout { display: flex; gap: 8px; flex-wrap: wrap; }
.ro-chip { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; padding: 6px 12px; border-radius: 12px; background: var(--ex-surface); border: 1px solid var(--ex-border); min-width: 56px; }
.ro-chip.alert { border-color: color-mix(in srgb, var(--ex-amber) 36%, transparent); }
.ro-chip.rec { border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ro-chip.short { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); background: var(--ex-blocked-soft); }
.ro-chip b { font-family: var(--ex-mono); font-size: 17px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.ro-chip.rec b { color: var(--ex-cleared); }
.ro-chip.short b { color: var(--ex-blocked); }
.ro-chip i { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); font-style: normal; }

/* ── magnetic reclamation field ──────────────────────────────────────────── */
.bay-stage { position: relative; height: 238px; margin-top: 14px; border-radius: 16px; overflow: hidden;
  background: radial-gradient(80% 130% at 80% 50%, rgba(251,146,60,0.1), transparent 56%), var(--ex-panel); border: 1px solid var(--ex-border); }
.bay.sealed .bay-stage { background: radial-gradient(80% 130% at 80% 50%, rgba(52,211,153,0.13), transparent 56%), var(--ex-panel); }
.bay-hexgrid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image:
    repeating-linear-gradient(60deg, var(--ex-border) 0 1px, transparent 1px 17px),
    repeating-linear-gradient(-60deg, var(--ex-border) 0 1px, transparent 1px 17px),
    repeating-linear-gradient(0deg, var(--ex-border) 0 1px, transparent 1px 30px);
  -webkit-mask: radial-gradient(130% 110% at 78% 50%, #000 45%, transparent 82%); mask: radial-gradient(130% 110% at 78% 50%, #000 45%, transparent 82%); }
/* faint containment coils around the vault */
.bay-coil { position: absolute; top: 50%; right: 92px; border-radius: 50%; pointer-events: none; transform: translate(50%, -50%);
  border: 1px solid color-mix(in srgb, var(--ex-ember) 22%, transparent); opacity: 0.5; }
.bay.sealed .bay-coil { border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.bay-coil.c1 { width: 200px; height: 200px; animation: bay-coil-breathe 7s ease-in-out infinite; }
.bay-coil.c2 { width: 280px; height: 280px; animation: bay-coil-breathe 7s ease-in-out infinite 1.2s; opacity: 0.3; }
@keyframes bay-coil-breathe { 0%, 100% { transform: translate(50%, -50%) scale(1); opacity: 0.42; } 50% { transform: translate(50%, -50%) scale(1.05); opacity: 0.2; } }

.bay-mote { position: absolute; width: var(--s); height: var(--s); border-radius: 50%; pointer-events: none; z-index: 1;
  background: var(--ex-amber); opacity: 0.3; filter: drop-shadow(0 0 4px var(--ex-amber)); animation: bay-mote-drift ease-in-out infinite; }
@keyframes bay-mote-drift { 0%, 100% { transform: translate(0, 0); opacity: 0.18; } 50% { transform: translate(10px, -8px); opacity: 0.5; } }

.bay-flux { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * -12px), calc((var(--my, 0.5) - 0.5) * -8px)); transition: transform 0.4s var(--ex-ease); }
.flux-line { stroke: url(#bayFlux); stroke-width: 2.4; stroke-linecap: round; filter: url(#bayFluxBlur); mix-blend-mode: screen; opacity: 0.55;
  stroke-dasharray: 11 17; animation-name: bay-flux; animation-timing-function: linear; animation-iteration-count: infinite; animation-delay: var(--d); }
.bay.sealed .flux-line { stroke: url(#bayFluxOk); }
@keyframes bay-flux { to { stroke-dashoffset: -28; } }

/* field units */
.unit { position: absolute; transform: translate(-50%, -50%); display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; cursor: pointer; z-index: 3;
  background: var(--ex-surface-elevated); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); color: var(--c);
  animation: unit-in 0.6s var(--ex-spring) backwards, unit-float 5s ease-in-out infinite; animation-delay: var(--d), var(--d); transition: transform 0.2s; }
@keyframes unit-in { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes unit-float { 0%, 100% { margin-top: 0; } 50% { margin-top: -5px; } }
.unit:hover { z-index: 9; }
.unit-glow { position: absolute; inset: 0; border-radius: 11px; background: color-mix(in srgb, var(--c) 16%, transparent); opacity: 0; transition: opacity 0.25s; }
.unit:hover .unit-glow { opacity: 1; }
.unit-recall { position: absolute; inset: -4px; border-radius: 13px; border: 1.5px solid var(--c); opacity: 0; animation: unit-recall 2.2s ease-out infinite; }
@keyframes unit-recall { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
.unit.intransit { animation: unit-in 0.6s var(--ex-spring) backwards, unit-pull 2.6s ease-in-out infinite; box-shadow: 0 0 14px -2px color-mix(in srgb, var(--c) 60%, transparent); }
@keyframes unit-pull { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(calc(-50% + 7px), -50%); } }
.unit-trail { position: absolute; left: 100%; top: 50%; height: 2px; width: 24px; transform: translateY(-50%); background: linear-gradient(90deg, var(--c), transparent); }
.unit-ico { position: relative; z-index: 1; }

/* the securement vault door */
.vault { position: absolute; top: 50%; right: 26px; transform: translateY(-50%); width: 134px; height: 134px; display: grid; place-items: center; z-index: 4; }
.vault-recall { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--ex-ember) 42%, transparent); animation: vault-recall 3.6s ease-out infinite; }
.vault-recall.d2 { animation-delay: 1.8s; }
@keyframes vault-recall { 0% { transform: scale(0.62); opacity: 0.7; } 100% { transform: scale(1.55); opacity: 0; } }
.bay.sealed .vault-recall { border-color: color-mix(in srgb, var(--ex-cleared) 48%, transparent); }
/* notched lock-ring (mechanical vault collar) — slows + locks when sealed */
.vault-lockring { position: absolute; inset: 2px; border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--ex-steel) 40%, transparent) 0deg 4deg, transparent 4deg 26deg);
  -webkit-mask: radial-gradient(circle, transparent 56%, #000 58%, #000 64%, transparent 66%); mask: radial-gradient(circle, transparent 56%, #000 58%, #000 64%, transparent 66%);
  animation: vault-spin 44s linear infinite; }
.bay.sealed .vault-lockring { background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--ex-cleared) 55%, transparent) 0deg 4deg, transparent 4deg 26deg); animation-play-state: paused; }
@keyframes vault-spin { to { transform: rotate(360deg); } }
.vault-gauge { position: absolute; inset: 16px; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-ember) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 22%, transparent) 0); transition: --ex-p 1s var(--ex-spring); }
.vault-gauge::after { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: var(--ex-surface-elevated); box-shadow: inset 0 0 12px rgba(0,0,0,0.35); }
.bay.sealed .vault-gauge { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.port { position: absolute; top: 50%; left: 50%; width: 7px; height: 7px; margin: -3.5px; border-radius: 50%; transform-origin: center;
  background: color-mix(in srgb, var(--ex-steel) 40%, transparent); transition: background 0.4s, box-shadow 0.4s; }
.port.lit { background: var(--ex-cleared); box-shadow: 0 0 8px var(--ex-cleared); }
.port.short { background: var(--ex-blocked); box-shadow: 0 0 8px var(--ex-blocked); }
.vault-center { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.vault-ico { color: var(--ex-ember); }
.bay.sealed .vault-ico { color: var(--ex-cleared); }
.vault-pct { font-size: 20px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.vault-sub { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.vault-seal { position: absolute; inset: 2px; border-radius: 50%; border: 2px solid var(--ex-cleared); animation: vault-seal 2.6s ease-out infinite; }
@keyframes vault-seal { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.4); opacity: 0; } }

/* at-risk */
.bay-risk { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-top: 12px; padding: 10px 13px; border-radius: 13px; font-size: 12px; line-height: 1.4;
  color: var(--ex-text-secondary); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.bay-risk.over { background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.bay-risk > svg { color: var(--ex-amber-strong); flex-shrink: 0; }
.bay-risk.over > svg { color: var(--ex-blocked); }
.risk-txt { flex: 1; min-width: 200px; }
.risk-txt b { color: var(--ex-text); }
.risk-link { display: inline-flex; align-items: center; gap: 3px; padding: 5px 10px; border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 750; font-family: inherit;
  background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); transition: transform 0.2s, border-color 0.2s; }
.risk-link:hover { transform: translateY(-1px); border-color: var(--ex-violet-border); color: var(--ex-violet); }

/* footer */
.bay-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.bay-state { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 11px; font-size: 12px; font-weight: 750;
  background: var(--ex-steel-soft); border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.bay-state.on { background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); color: var(--ex-cleared); }
.bay-acts { display: flex; gap: 8px; flex-wrap: wrap; }
.bay-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 15px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 750; font-family: inherit; }
.bay-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.bay-btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.bay-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.bay-btn.ghost:hover { border-color: var(--ex-violet-border); color: var(--ex-violet); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

[data-theme="light"] .vault-gauge::after { background: var(--ex-surface-elevated); }
[data-theme="light"] .unit { background: var(--ex-surface-elevated); }
[data-theme="light"] .bay-hexgrid { opacity: 0.7; }
[data-theme="light"] .bay-mote { background: var(--ex-ember); filter: drop-shadow(0 0 4px var(--ex-ember)); }
/* screen-blend + pale gradients vanish on cream → switch to normal blend + deeper flux */
[data-theme="light"] .flux-line { mix-blend-mode: normal; stroke: url(#bayFluxLight); opacity: 0.62; }
[data-theme="light"] .bay.sealed .flux-line { stroke: url(#bayFluxOkLight); }
[data-theme="light"] .bay-coil { border-color: color-mix(in srgb, var(--ex-ember) 38%, transparent); }

@media (max-width: 760px) { .bay-stage { height: 214px; } .vault { width: 112px; height: 112px; } .port { transform-origin: center; } }
@media (prefers-reduced-motion: reduce) {
  .bay-aura, .bay-coil, .bay-mote, .flux-line, .unit, .unit.intransit, .unit-recall, .vault-recall, .vault-lockring, .vault-gauge, .vault-seal { animation: none !important; }
  .bay-flux { transform: none; transition: none; }
  .vault-gauge, .port { transition: none !important; }
}
</style>
