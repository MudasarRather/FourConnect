<template>
  <Motion ref="rootRef" as="section" class="gh ex-grain" :class="{ sealed, passed }"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="gh-spot" aria-hidden="true" />
    <span class="gh-aura" aria-hidden="true" />

    <!-- HUD strip -->
    <header class="gh-hud">
      <div class="gh-lead">
        <span class="gh-eyebrow"><KeyRound :size="12" /> THE GATEHOUSE · NO-DUES</span>
        <h3 class="gh-title">{{ sealed ? 'All gates cleared — threshold open' : 'Department authorization lattice' }}</h3>
      </div>
      <div class="gh-readout">
        <span class="ro-chip"><b><ExCountUp :value="progress" :suffix="'%'" /></b><i>cleared</i></span>
        <span class="ro-chip"><b><ExCountUp :value="gatesOpen" />/{{ gates.length }}</b><i>gates open</i></span>
        <span class="ro-chip" :class="{ alert: blockedCount }"><b :style="blockedCount ? 'color:var(--ex-blocked)' : ''"><ExCountUp :value="blockedCount" /></b><i>blocked</i></span>
        <span v-if="recoveries > 0" class="ro-chip rec"><b>{{ fmtCompactINR(recoveries) }}</b><i>→ F&amp;F</i></span>
      </div>
    </header>

    <!-- the authorization lattice -->
    <div class="gh-lattice">
      <span class="lat-bg" aria-hidden="true" />

      <!-- department authorization nodes -->
      <div class="lat-nodes">
        <div v-for="(g, i) in gates" :key="g.key" class="lat-node" :class="g.state"
          :style="{ '--c': g.color, '--d': (0.1 + i * 0.07) + 's' }"
          :title="`${g.label} · ${g.cleared}/${g.total} cleared${g.blocked ? ' · blocked' : ''}`">
          <div class="nd-disc" :style="{ '--ex-p': g.ringDeg + 'deg' }">
            <span class="nd-hole">
              <component :is="g.icon" :size="15" class="nd-ico" />
              <span class="nd-seal" aria-hidden="true"><Check :size="13" /></span>
              <span class="nd-lock" aria-hidden="true"><LockKeyhole :size="12" /></span>
            </span>
          </div>
          <span class="nd-name">{{ g.label }}</span>
          <span class="nd-frac ex-mono">{{ g.cleared }}/{{ g.total }}</span>
          <span class="nd-conduit" aria-hidden="true"><span class="cd-flow" /></span>
        </div>
      </div>

      <!-- the charging energy spine -->
      <div class="lat-spine">
        <span class="spine-fill" :style="{ width: progress + '%' }"><span class="sf-flow" /></span>
        <!-- advancing record token -->
        <div class="gh-token" :class="{ done: sealed }" :style="{ left: progress + '%' }">
          <span class="tok-ring" :style="{ '--ex-p': progress * 3.6 + 'deg' }" aria-hidden="true" />
          <span class="tok-core">{{ initials(caseInfo?.employee_name || caseInfo?.employee_code) }}</span>
          <span v-if="sealed && !reduced" class="tok-burst" aria-hidden="true" />
        </div>
      </div>

      <!-- threshold reactor core -->
      <div class="lat-core" :class="{ on: sealed }">
        <div class="core-orb" :style="{ '--ex-p': progress * 3.6 + 'deg' }">
          <span class="co-ring" aria-hidden="true" />
          <span class="co-emit" aria-hidden="true" />
          <span class="co-emit" aria-hidden="true" style="animation-delay:-1.5s" />
          <span class="co-face">
            <component :is="sealed ? ShieldCheck : KeyRound" :size="18" />
          </span>
        </div>
        <span class="core-lab ex-mono">{{ sealed ? 'OPEN' : 'THRESHOLD' }}</span>
      </div>
    </div>

    <!-- recoveries reservoir → settlement bridge -->
    <div v-if="recoveries > 0" class="gh-reservoir">
      <span class="res-ico"><HandCoins :size="15" /></span>
      <div class="res-body">
        <span class="res-lab">Dues recovered through clearance</span>
        <div class="res-pipe"><span class="res-flow" /></div>
      </div>
      <span class="res-amt ex-mono">{{ fmtINR(recoveries) }}</span>
      <button class="res-link" type="button" @click="$emit('go', { tab: 'settlement' })">
        Final Settlement <ArrowUpRight :size="13" />
      </button>
    </div>

    <!-- footer: gate seal + complete -->
    <footer class="gh-foot">
      <div class="gh-state" :class="{ on: sealed, passed }">
        <component :is="passed ? BadgeCheck : sealed ? ShieldCheck : Hourglass" :size="15" />
        <span>{{ stateLabel }}</span>
      </div>
      <Motion v-if="canComplete" as="button" type="button" class="gh-complete"
        :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="busy" @click="$emit('complete')">
        <Loader2 v-if="busy" :size="15" class="spin" /><ArrowRight v-else :size="15" />
        Pass the threshold → Settlement
      </Motion>
      <button v-else-if="passed" class="gh-passed-link" type="button" @click="$emit('go', { tab: 'settlement' })">
        Open settlement <ArrowUpRight :size="13" />
      </button>
    </footer>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  KeyRound, Check, LockKeyhole, ShieldCheck, BadgeCheck, Hourglass,
  ArrowRight, ArrowUpRight, HandCoins, Loader2,
} from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { clearanceDeptMeta, fmtINR, fmtCompactINR, initials } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  clearance: { type: Object, default: null },
  caseInfo: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['complete', 'go'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const groups = computed(() => props.clearance?.groups || [])
const progress = computed(() => Math.round(props.clearance?.progress_pct || 0))
const sealed = computed(() => !!props.clearance?.all_mandatory_cleared && groups.value.length > 0)
const passed = computed(() => ['SETTLEMENT', 'COMPLETED'].includes(props.caseInfo?.status))

const gates = computed(() => groups.value.map(g => {
  const m = clearanceDeptMeta(g.department)
  const blocked = (g.items || []).some(it => it.status === 'BLOCKED')
  const frac = Math.max(0, Math.min(1, (g.progress || 0) / 100))
  const full = (g.progress || 0) >= 100
  const state = blocked ? 'blocked' : full ? 'cleared' : (g.progress || 0) > 0 ? 'partial' : 'idle'
  const color = blocked ? 'var(--ex-blocked)' : full ? 'var(--ex-cleared)' : (g.progress || 0) > 0 ? m.hex : 'var(--ex-steel)'
  return {
    key: g.department, label: m.label, icon: m.icon, hex: m.hex,
    cleared: g.cleared, total: g.total, frac, full, blocked, state, color,
    ringDeg: +(frac * 360).toFixed(1),
  }
}))

const gatesOpen = computed(() => gates.value.filter(g => g.full).length)
const blockedCount = computed(() =>
  groups.value.reduce((n, g) => n + (g.items || []).filter(it => it.status === 'BLOCKED').length, 0))
const recoveries = computed(() =>
  groups.value.reduce((s, g) => s + (g.items || []).reduce((a, it) => a + Number(it.recovery_amount || 0), 0), 0))

const canComplete = computed(() =>
  sealed.value && ['NOTICE_PERIOD', 'CLEARANCE', 'ACCEPTED'].includes(props.caseInfo?.status))

const stateLabel = computed(() => {
  if (passed.value) return 'Cleared — record has passed to settlement'
  if (sealed.value) return 'All mandatory gates cleared'
  if (blockedCount.value) return `${blockedCount.value} item${blockedCount.value > 1 ? 's' : ''} blocked — resolve to proceed`
  return 'Awaiting department sign-offs'
})
</script>

<style scoped>
.gh {
  position: relative; overflow: hidden; border-radius: 22px; padding: 16px 18px 14px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: border-color 0.5s var(--ex-spring);
}
.gh.sealed { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); }
.gh-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 5;
  background: radial-gradient(560px 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.14), transparent 62%); }
.gh-aura { position: absolute; inset: -40% 30% 45% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 28% 0%, rgba(251,146,60,0.16), transparent 70%); animation: ex-archway-glow 12s ease-in-out infinite; }
.gh.sealed .gh-aura { background: radial-gradient(60% 80% at 50% 0%, rgba(52,211,153,0.18), transparent 70%); }

/* HUD */
.gh-hud { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.gh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--ex-violet);
  padding: 4px 9px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.gh-title { font-size: 15.5px; font-weight: 820; color: var(--ex-text); margin: 8px 0 0; }
.gh-readout { display: flex; gap: 8px; flex-wrap: wrap; }
.ro-chip { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; padding: 6px 12px; border-radius: 12px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); min-width: 58px; }
.ro-chip.alert { border-color: color-mix(in srgb, var(--ex-blocked) 36%, transparent); background: var(--ex-blocked-soft); }
.ro-chip.rec { border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ro-chip b { font-family: var(--ex-mono); font-size: 17px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.ro-chip.rec b { color: var(--ex-cleared); font-size: 14px; }
.ro-chip i { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); font-style: normal; }

/* ── authorization lattice ────────────────────────────────────────────────── */
.gh-lattice { position: relative; height: 228px; margin-top: 14px; border-radius: 16px; overflow: hidden;
  background: radial-gradient(120% 120% at 96% 50%, rgba(251,146,60,0.08), transparent 56%), var(--ex-panel); border: 1px solid var(--ex-border); }
.gh.sealed .gh-lattice { background: radial-gradient(120% 120% at 96% 50%, rgba(52,211,153,0.12), transparent 56%), var(--ex-panel); }
.lat-bg { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px);
  background-size: 30px 30px; -webkit-mask: radial-gradient(120% 100% at 50% 50%, #000 50%, transparent); mask: radial-gradient(120% 100% at 50% 50%, #000 50%, transparent); }

/* nodes */
.lat-nodes { position: absolute; left: 16px; right: 112px; top: 16px; bottom: 36px; display: flex; justify-content: space-between; gap: 6px; z-index: 3; }
.lat-node { position: relative; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center;
  animation: gh-node-in 0.6s var(--ex-spring) backwards; animation-delay: var(--d); }
@keyframes gh-node-in { 0% { opacity: 0; transform: translateY(-12px); } 100% { opacity: 1; transform: translateY(0); } }
.nd-disc { position: relative; width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(from -90deg, var(--c) var(--ex-p, 0deg), var(--ex-steel-soft) var(--ex-p, 0deg));
  transition: --ex-p 0.9s var(--ex-spring); box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
.nd-hole { position: relative; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  background: color-mix(in srgb, var(--ex-canvas) 78%, var(--ex-surface)); box-shadow: inset 0 0 6px rgba(0,0,0,0.35); }
.nd-ico { color: var(--c); transition: opacity 0.3s; }
.nd-seal, .nd-lock { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%; opacity: 0; transition: opacity 0.35s; }
.nd-seal { color: #06281b; } .nd-lock { color: #fff; }
.lat-node.cleared .nd-disc { box-shadow: 0 0 16px color-mix(in srgb, var(--ex-cleared) 50%, transparent); }
.lat-node.cleared .nd-hole { background: color-mix(in srgb, var(--ex-cleared) 22%, var(--ex-canvas)); }
.lat-node.cleared .nd-seal { opacity: 1; }
.lat-node.cleared .nd-ico { opacity: 0; }
.lat-node.partial .nd-disc { animation: gh-node-pulse 2.4s ease-in-out infinite; }
@keyframes gh-node-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 40%, transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
.lat-node.blocked .nd-hole { background: color-mix(in srgb, var(--ex-blocked) 26%, var(--ex-canvas)); }
.lat-node.blocked .nd-lock { opacity: 1; }
.lat-node.blocked .nd-ico { opacity: 0; }
.lat-node.blocked .nd-disc { animation: gh-shudder 0.5s ease-in-out 1.4s infinite; }
@keyframes gh-shudder { 0%,93%,100% { transform: translateX(0); } 95% { transform: translateX(-2px); } 97% { transform: translateX(2px); } 99% { transform: translateX(-1px); } }
.lat-node.idle { opacity: 0.62; }
.nd-name { font-size: 9.5px; font-weight: 750; color: var(--ex-text-secondary); margin-top: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.nd-frac { font-size: 9.5px; font-weight: 800; color: var(--ex-text-muted); }
.lat-node.cleared .nd-frac { color: var(--ex-cleared); }
.lat-node.blocked .nd-frac { color: var(--ex-blocked); }

/* conduits drop from each node to the spine */
.nd-conduit { position: absolute; left: calc(50% - 1.5px); top: 78px; bottom: 0; width: 3px; border-radius: 3px;
  background: var(--ex-steel-soft); overflow: hidden; }
.cd-flow { position: absolute; inset: 0; opacity: 0; }
.lat-node.cleared .cd-flow, .lat-node.partial .cd-flow { opacity: 1;
  background: repeating-linear-gradient(180deg, transparent 0 4px, var(--c) 4px 7px, transparent 7px 13px); background-size: 100% 13px;
  animation: gh-conduit 0.9s linear infinite; filter: drop-shadow(0 0 3px var(--c)); }
@keyframes gh-conduit { to { background-position: 0 26px; } }
.lat-node.blocked .nd-conduit { background: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.lat-node.blocked .cd-flow { opacity: 1; background: repeating-linear-gradient(180deg, var(--ex-blocked) 0 3px, transparent 3px 9px); background-size: 100% 9px; }

/* energy spine */
.lat-spine { position: absolute; left: 16px; right: 112px; bottom: 30px; height: 6px; border-radius: 999px; background: var(--ex-steel-soft); z-index: 2; }
.spine-fill { position: relative; display: block; height: 100%; border-radius: 999px; overflow: hidden;
  background: var(--ex-grad-hero); box-shadow: 0 0 14px rgba(251,146,60,0.5); transition: width 1s var(--ex-spring); }
.gh.sealed .spine-fill { background: linear-gradient(90deg, #34d399, #6ee7b7); box-shadow: 0 0 14px rgba(52,211,153,0.6); }
.sf-flow { position: absolute; inset: 0;
  background: repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,0.55) 8px 11px, transparent 11px 18px); background-size: 18px 100%;
  animation: gh-spine-flow 1s linear infinite; }
@keyframes gh-spine-flow { to { background-position: 36px 0; } }

/* record token rides the spine */
.gh-token { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 34px; height: 34px; z-index: 4;
  transition: left 1s var(--ex-spring); display: grid; place-items: center; }
.tok-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--ex-ember) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 28%, transparent) var(--ex-p, 0deg));
  -webkit-mask: radial-gradient(circle, transparent 58%, #000 61%); mask: radial-gradient(circle, transparent 58%, #000 61%); transition: --ex-p 1s var(--ex-spring); }
.gh-token.done .tok-ring { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.tok-core { position: absolute; inset: 5px; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--ex-mono); font-size: 10px; font-weight: 850; color: #1a1206;
  background: var(--ex-grad-hero); box-shadow: 0 0 12px rgba(251,146,60,0.5), inset 0 0 4px rgba(255,255,255,0.4); }
.gh-token.done .tok-core { background: radial-gradient(circle at 35% 30%, #d1fae5, #34d399); box-shadow: 0 0 16px rgba(52,211,153,0.7); animation: gh-tok-pulse 2.4s ease-in-out infinite; }
@keyframes gh-tok-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.tok-burst { position: absolute; inset: -5px; border-radius: 50%; border: 2px solid var(--ex-cleared); animation: gh-burst 2.2s ease-out infinite; }
@keyframes gh-burst { 0% { transform: scale(0.7); opacity: 0.8; } 100% { transform: scale(2.3); opacity: 0; } }

/* threshold reactor core */
.lat-core { position: absolute; right: 16px; top: 16px; bottom: 30px; width: 86px; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.core-orb { position: relative; width: 70px; height: 70px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(from -90deg, var(--ex-ember) var(--ex-p, 0deg), var(--ex-steel-soft) var(--ex-p, 0deg));
  transition: --ex-p 1s var(--ex-spring); }
.lat-core.on .core-orb { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.co-ring { position: absolute; inset: 5px; border-radius: 50%; background: var(--ex-panel); box-shadow: inset 0 0 10px rgba(0,0,0,0.4); }
.co-emit { position: absolute; inset: 5px; border-radius: 50%; border: 1.5px solid var(--ex-ember); opacity: 0; animation: gh-burst 4s ease-out infinite; }
.lat-core.on .co-emit { border-color: var(--ex-cleared); }
.co-face { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ex-ember);
  animation: gh-core-breathe 4s ease-in-out infinite; }
.lat-core.on .co-face { color: var(--ex-cleared); }
@keyframes gh-core-breathe { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 4px currentColor); } 50% { transform: scale(1.12); filter: drop-shadow(0 0 10px currentColor); } }
.core-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--ex-text-dim); }
.lat-core.on .core-lab { color: var(--ex-cleared); }

/* reservoir */
.gh-reservoir { display: flex; align-items: center; gap: 11px; margin-top: 12px; padding: 10px 13px; border-radius: 14px;
  background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.res-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.res-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.res-lab { font-size: 11.5px; font-weight: 700; color: var(--ex-text-secondary); }
.res-pipe { height: 5px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.res-flow { display: block; height: 100%; width: 100%;
  background: linear-gradient(90deg, transparent, var(--ex-cleared) 40%, #6ee7b7 50%, var(--ex-cleared) 60%, transparent); background-size: 200% 100%;
  animation: ex-tide-flow 2.6s linear infinite; }
.res-amt { font-size: 15px; font-weight: 850; color: var(--ex-cleared); flex-shrink: 0; }
.res-link { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 6px 10px; border-radius: 9px; cursor: pointer; font-size: 11.5px; font-weight: 750; font-family: inherit;
  background: transparent; border: 1px solid color-mix(in srgb, var(--ex-cleared) 36%, transparent); color: var(--ex-cleared); transition: background 0.2s, transform 0.2s; }
.res-link:hover { background: color-mix(in srgb, var(--ex-cleared) 12%, transparent); transform: translateY(-1px); }

/* footer */
.gh-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.gh-state { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 11px; font-size: 12px; font-weight: 750;
  background: var(--ex-steel-soft); border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.gh-state.on { background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); color: var(--ex-cleared); }
.gh-state.passed { background: color-mix(in srgb, var(--ex-st-completed) 14%, transparent); border-color: color-mix(in srgb, var(--ex-st-completed) 32%, transparent); color: var(--ex-st-completed); }
.gh-complete { display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: 12px; cursor: pointer; border: none;
  background: linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #10b981 100%); color: #06281b; font-weight: 800; font-size: 13px; font-family: inherit;
  box-shadow: 0 8px 24px -8px rgba(52,211,153,0.6); }
.gh-complete:disabled { opacity: 0.6; cursor: not-allowed; }
.gh-passed-link { display: inline-flex; align-items: center; gap: 5px; padding: 9px 14px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 750; font-family: inherit;
  background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

/* light theme */
[data-theme="light"] .nd-hole { background: color-mix(in srgb, #fff 70%, var(--ex-surface)); }
[data-theme="light"] .co-ring { background: var(--ex-surface-elevated); }
[data-theme="light"] .lat-bg { opacity: 0.6; }

@media (max-width: 760px) {
  .gh-lattice { height: 210px; }
  .lat-nodes { right: 96px; }
  .lat-spine { right: 96px; }
  .lat-core { width: 74px; }
}
@media (prefers-reduced-motion: reduce) {
  .gh-aura, .sf-flow, .cd-flow, .res-flow, .lat-node.partial .nd-disc, .lat-node.blocked .nd-disc,
  .co-emit, .co-face, .tok-core, .tok-burst, .lat-node { animation: none !important; }
  .spine-fill, .gh-token, .nd-disc, .core-orb, .tok-ring { transition: none !important; }
}
</style>
