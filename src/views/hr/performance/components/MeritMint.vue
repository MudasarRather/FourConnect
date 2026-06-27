<template>
  <!-- ═══════════════════════ THE INCREMENT MINT · Merit Treasury ═══════════════════════
       Performance, struck into money. A molten BUDGET TREASURY reactor (conic budget
       ring + liquid fill) sits beneath a MINTING PRESS that strikes coins into a VAULT.
       The liquid OVERFLOWS RED when the committed spend breaches the cycle's merit-budget
       pool — the governance limit made visceral. Raw INGOTS (reviews needing a
       recommendation) feed BLANKS (recommended, awaiting the strike) that mint into COINS
       (applied increments) stacked in the vault. Continuous ambient motion (the press
       always strikes, motes always drift) so an empty cycle still reads alive.
       Unique within Performance — vs the dashboard ORRERY, insights BELL-CURVE, reviews
       FLUX-PIPELINE, cycles MATURATION-LANES, calibration 9-BOX, merit-policy OSCILLOSCOPE.
       3-tier pointer parallax · dark+light · reduced-motion guarded. -->
  <div ref="rootEl" class="mm" :class="{ lit, over }">
    <!-- ambient backdrop -->
    <span class="mm-floor" aria-hidden="true" />
    <span class="mm-aura" aria-hidden="true" />
    <span class="mm-vault-wall" aria-hidden="true" />
    <div class="mm-motes" aria-hidden="true">
      <span v-for="m in motes" :key="m.i" class="mm-mote" :style="{ left: m.x + '%', top: m.y + '%', '--d': m.d + 's', '--dl': m.dl + 's', '--sz': m.sz + 'px' }" />
    </div>

    <!-- ───────────── the treasury reactor (centerpiece) ───────────── -->
    <div class="mm-stage">
      <div class="mm-reactor-wrap">
        <!-- the minting press, over the reactor crown -->
        <div class="mm-press" :class="{ armed: pending > 0 }" aria-hidden="true">
          <span class="mm-press-post" />
          <span class="mm-die"><Stamp :size="20" /></span>
          <span class="mm-flash" />
          <span v-for="s in 6" :key="'spk' + s" class="mm-spark" :style="{ '--a': (s * 60) + 'deg' }" />
        </div>

        <div class="mm-reactor" :style="{ '--fill': fillVisPct + '%' }">
          <span class="mm-ring" :style="{ '--perf-p': ringDeg + 'deg' }" />
          <span class="mm-emit one" />
          <span class="mm-emit two" />
          <div class="mm-vessel">
            <div class="mm-liquid">
              <span class="mm-surface" />
              <span class="mm-surface two" />
              <span v-for="b in 5" :key="'bub' + b" class="mm-bubble" :style="{ left: (12 + b * 16) + '%', '--bd': (2.6 + b * 0.5) + 's', '--bl': (b * 0.6) + 's' }" />
            </div>
            <span v-if="hasCap" class="mm-capline" />
            <span v-if="over" class="mm-overflow" />
          </div>
          <div class="mm-readout">
            <b class="mm-readout-pct" :class="{ over }">{{ budgetUsedLabel }}</b>
            <span class="mm-readout-sub">{{ over ? 'over budget' : 'of pool used' }}</span>
          </div>
        </div>

        <div class="mm-reactor-cap"><Landmark :size="13" /> {{ policyName }}</div>
      </div>

      <!-- ───────────── the strike line: ingots → blanks → vault ───────────── -->
      <div class="mm-line">
        <!-- raw ingots (need a recommendation) -->
        <button class="mm-group ingots" :class="{ on: activeFilter === 'queue', empty: !needsRec }" type="button"
          @click="$emit('pick', 'queue')" :title="`${needsRec} review${needsRec === 1 ? '' : 's'} awaiting a recommendation`">
          <span class="mm-group-stack">
            <span v-for="n in stackCount(needsRec)" :key="'ig' + n" class="mm-ingot" :style="{ '--gi': n }" />
            <span v-if="!needsRec" class="mm-empty-dot" />
          </span>
          <span class="mm-group-meta"><b>{{ needsRec }}</b><i>raw · to recommend</i></span>
        </button>

        <span class="mm-feed" :class="{ flow: needsRec > 0 }" aria-hidden="true" />

        <!-- blanks awaiting the strike (recommended) -->
        <button class="mm-group blanks" :class="{ on: activeFilter === 'recommended', empty: !pending }" type="button"
          @click="$emit('pick', 'recommended')" :title="`${pending} recommended hike${pending === 1 ? '' : 's'} awaiting approval`">
          <span class="mm-group-stack">
            <span v-for="n in stackCount(pending)" :key="'bl' + n" class="mm-blank" :style="{ '--gi': n, '--bd': (2.4 + n * 0.3) + 's' }" />
            <span v-if="!pending" class="mm-empty-dot" />
          </span>
          <span class="mm-group-meta"><b>{{ pending }}</b><i>blanks · awaiting strike</i></span>
        </button>

        <span class="mm-feed" :class="{ flow: pending > 0 }" aria-hidden="true" />

        <!-- the vault of minted coins (applied) -->
        <button class="mm-group vault" :class="{ on: activeFilter === 'applied', empty: !applied }" type="button"
          @click="$emit('pick', 'applied')" :title="`${applied} increment${applied === 1 ? '' : 's'} minted to payroll`">
          <span class="mm-vault-mouth">
            <span class="mm-coinfly" />
            <span class="mm-coin-stack">
              <span v-for="n in stackCount(applied)" :key="'co' + n" class="mm-coin" :style="{ '--gi': n }"><BadgeIndianRupee :size="11" /></span>
              <span v-if="overflowCoins" class="mm-coin-more">+{{ overflowCoins }}</span>
              <span v-if="!applied" class="mm-empty-dot" />
            </span>
          </span>
          <span class="mm-group-meta"><b>{{ applied }}</b><i>minted · in payroll</i></span>
        </button>
      </div>
    </div>

    <!-- floating HUD -->
    <div class="mm-hud mm-hud-tl">
      <span class="mm-hud-k"><Wallet :size="12" /> Committed</span>
      <b>{{ inrShort(committed) }}</b>
    </div>
    <div class="mm-hud mm-hud-tr">
      <span class="mm-hud-k"><Landmark :size="12" /> Budget pool</span>
      <b v-if="hasCap">{{ inrShort(budgetAmt) }}</b>
      <b v-else class="dim">no cap</b>
    </div>
    <div class="mm-hud mm-hud-bl">
      <span class="mm-hud-k"><TrendingUp :size="12" /> Recommended</span>
      <b>{{ inrShort(recommendedAmt) }}</b>
    </div>
    <div class="mm-hud mm-hud-br" :class="{ ember: over }">
      <span class="mm-hud-k"><component :is="over ? Flame : PiggyBank" :size="12" /> {{ over ? 'Over by' : 'Remaining' }}</span>
      <b v-if="hasCap">{{ inrShort(Math.abs(remaining)) }}</b>
      <b v-else class="dim">—</b>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Stamp, Landmark, Wallet, TrendingUp, PiggyBank, Flame, BadgeIndianRupee } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  budget: { type: Object, default: null },
  pending: { type: Number, default: 0 },   // RECOMMENDED count (this cycle)
  needsRec: { type: Number, default: 0 },   // COMPLETED/ACK, no hike yet
  applied: { type: Number, default: 0 },    // APPLIED count
  activeFilter: { type: String, default: null },
})
defineEmits(['pick'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const lit = ref(false)
onMounted(() => { requestAnimationFrame(() => { lit.value = true }) })

const b = computed(() => props.budget || {})
const hasCap = computed(() => b.value.budget_amount != null)
const committed = computed(() => Number(b.value.committed_amount || 0))
const recommendedAmt = computed(() => Number(b.value.recommended_amount || 0))
const budgetAmt = computed(() => Number(b.value.budget_amount || 0))
const remaining = computed(() => Number(b.value.remaining || 0))
const over = computed(() => !!b.value.over_budget)
const policyName = computed(() => b.value.policy_name || 'Merit policy')

// fill ratio: against the cap when capped, else a soft read against payroll base
const fillRatio = computed(() => {
  if (hasCap.value && budgetAmt.value > 0) return committed.value / budgetAmt.value
  const base = Number(b.value.total_annual_ctc || 0)
  return base > 0 ? Math.min(0.6, (committed.value / base) * 6) : 0   // scaled so uncapped still glows
})
const fillVisPct = computed(() => Math.max(committed.value > 0 ? 8 : 0, Math.min(over.value ? 100 : 96, fillRatio.value * 100)))
const ringDeg = computed(() => Math.min(1, fillRatio.value) * 360)
const budgetUsedLabel = computed(() => {
  if (!hasCap.value) return committed.value > 0 ? '∞' : '—'
  const pct = budgetAmt.value > 0 ? Math.round((committed.value / budgetAmt.value) * 100) : 0
  return pct + '%'
})

const overflowCoins = computed(() => Math.max(0, props.applied - 7))
const stackCount = (n) => Math.min(7, Math.max(0, Number(n) || 0))

const inrShort = (v) => {
  const n = Number(v || 0)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + 'Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + 'L'
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(0) + 'k'
  return '₹' + Math.round(n)
}
</script>

<style scoped>
.mm { position: relative; overflow: hidden; height: clamp(310px, 38vw, 400px); border-radius: 22px;
  background:
    radial-gradient(120% 130% at 50% 118%, color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 56%),
    radial-gradient(120% 120% at 88% -12%, color-mix(in srgb, var(--perf-orange) 12%, transparent), transparent 58%),
    var(--perf-panel);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }

/* ── backdrop ── */
.mm-floor { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(130% 120% at 38% 70%, #000 26%, transparent 84%);
  -webkit-mask-image: radial-gradient(130% 120% at 38% 70%, #000 26%, transparent 84%);
  transform: translate(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -12px)); }
.mm-aura { position: absolute; inset: auto -20% -45% 10%; height: 95%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 20%, transparent), transparent 70%); filter: blur(50px);
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 24px), calc((var(--my, 0.5) - 0.5) * 18px)); }
.mm.over .mm-aura { background: radial-gradient(circle, color-mix(in srgb, var(--perf-conflict) 24%, transparent), transparent 70%); }
.mm-vault-wall { position: absolute; inset: 0 0 0 auto; width: 38%; z-index: 0; pointer-events: none; opacity: 0.4;
  background: repeating-linear-gradient(90deg, transparent 0 26px, color-mix(in srgb, var(--perf-gold) 5%, transparent) 26px 27px);
  mask-image: linear-gradient(90deg, transparent, #000 60%); -webkit-mask-image: linear-gradient(90deg, transparent, #000 60%); }

.mm-motes { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 26px), calc((var(--my, 0.5) - 0.5) * 20px)); }
.mm-mote { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: var(--perf-gold);
  box-shadow: 0 0 6px var(--perf-gold); opacity: 0; animation: mm-mote var(--d) ease-in-out var(--dl) infinite; }
@keyframes mm-mote { 0%, 100% { opacity: 0; transform: translateY(8px); } 50% { opacity: 0.62; transform: translateY(-10px); } }

/* ── stage layout ── */
.mm-stage { position: relative; z-index: 4; height: 100%; display: grid; grid-template-columns: minmax(220px, 0.95fr) 1.05fr;
  align-items: center; gap: 10px; padding: 16px 18px; }

/* ── reactor ── */
.mm-reactor-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 9px; justify-self: center;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 8px), calc((var(--my, 0.5) - 0.5) * 6px)); }

.mm-press { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); z-index: 6; display: grid; place-items: center; width: 56px; height: 70px; }
.mm-press-post { position: absolute; top: 0; width: 8px; height: 34px; border-radius: 3px;
  background: linear-gradient(var(--perf-text-dim), color-mix(in srgb, var(--perf-text-dim) 40%, transparent)); opacity: 0.5; }
.mm-die { position: absolute; top: 22px; display: grid; place-items: center; width: 40px; height: 30px; border-radius: 9px; color: #1a1206;
  background: linear-gradient(160deg, var(--perf-gold-bright), var(--perf-ember));
  box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--perf-orange) 70%, transparent); animation: mm-strike 3.4s var(--perf-spring) infinite; }
.mm-press.armed .mm-die { box-shadow: 0 0 0 2px color-mix(in srgb, var(--perf-gold) 50%, transparent), 0 8px 20px -6px color-mix(in srgb, var(--perf-orange) 80%, transparent); }
@keyframes mm-strike {
  0%, 56% { transform: translateY(0); } 66% { transform: translateY(16px) scaleY(0.92); }
  72% { transform: translateY(16px); } 84%, 100% { transform: translateY(0); }
}
.mm-flash { position: absolute; top: 50px; width: 30px; height: 30px; border-radius: 50%; opacity: 0;
  background: radial-gradient(circle, var(--perf-gold-bright), transparent 70%); animation: mm-flash 3.4s linear infinite; }
@keyframes mm-flash { 0%, 64% { opacity: 0; transform: scale(0.4); } 70% { opacity: 0.95; transform: scale(1.3); } 80%, 100% { opacity: 0; transform: scale(1.6); } }
.mm-spark { position: absolute; top: 52px; left: 50%; width: 3px; height: 3px; border-radius: 50%; background: var(--perf-gold-bright);
  box-shadow: 0 0 5px var(--perf-gold-bright); opacity: 0; animation: mm-spark 3.4s ease-out infinite; }
@keyframes mm-spark {
  0%, 66% { opacity: 0; transform: rotate(var(--a)) translateY(0) scale(1); }
  72% { opacity: 1; }
  86%, 100% { opacity: 0; transform: rotate(var(--a)) translateY(-22px) scale(0.3); }
}

.mm-reactor { position: relative; width: clamp(168px, 17vw, 210px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; }
.mm-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 1s var(--perf-spring), background 0.4s; }
.mm.over .mm-ring { background: conic-gradient(var(--perf-conflict) var(--perf-p, 0deg), var(--perf-track) 0); }
.mm-ring::after { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: var(--perf-panel); }
.mm-emit { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--perf-gold); opacity: 0; }
.mm-emit.one { animation: mm-emit 3s ease-out infinite; } .mm-emit.two { animation: mm-emit 3s ease-out 1.5s infinite; }
.mm.over .mm-emit { border-color: var(--perf-conflict); }
@keyframes mm-emit { 0% { opacity: 0.5; transform: scale(0.92); } 100% { opacity: 0; transform: scale(1.18); } }

.mm-vessel { position: absolute; inset: 13px; border-radius: 50%; overflow: hidden; background: var(--perf-surface-elevated);
  box-shadow: inset 0 6px 18px -6px rgba(0,0,0,0.55); }
.mm-liquid { position: absolute; left: 0; right: 0; bottom: 0; height: var(--fill, 0%); transition: height 1s var(--perf-spring), background 0.5s;
  background: linear-gradient(180deg, var(--perf-gold-bright), var(--perf-ember) 70%, var(--perf-deep)); }
.mm.over .mm-liquid { background: linear-gradient(180deg, color-mix(in srgb, var(--perf-conflict) 80%, #fff), var(--perf-conflict) 60%, color-mix(in srgb, var(--perf-conflict) 70%, #000)); }
.mm-surface { position: absolute; top: -4px; left: -30%; width: 160%; height: 14px; border-radius: 50%;
  background: color-mix(in srgb, #fff 55%, transparent); filter: blur(1px); opacity: 0.5; animation: mm-wave 4s ease-in-out infinite; }
.mm-surface.two { animation-duration: 5.6s; animation-direction: reverse; opacity: 0.3; }
@keyframes mm-wave { 0%, 100% { transform: translateX(-6%) rotate(-1deg); } 50% { transform: translateX(6%) rotate(1deg); } }
.mm-bubble { position: absolute; bottom: 4px; width: 5px; height: 5px; border-radius: 50%; background: color-mix(in srgb, #fff 60%, transparent);
  opacity: 0; animation: mm-bubble var(--bd) ease-in var(--bl) infinite; }
@keyframes mm-bubble { 0% { opacity: 0; transform: translateY(0) scale(0.6); } 30% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }
.mm-capline { position: absolute; left: 0; right: 0; top: 2px; height: 0; border-top: 1.5px dashed color-mix(in srgb, var(--perf-text) 30%, transparent); opacity: 0.5; }
.mm-overflow { position: absolute; left: 50%; top: -2px; width: 60%; height: 16px; transform: translateX(-50%); border-radius: 0 0 50% 50%;
  background: linear-gradient(var(--perf-conflict), transparent); opacity: 0.8; animation: mm-drip 1.8s ease-in-out infinite; }
@keyframes mm-drip { 0%, 100% { opacity: 0.4; transform: translateX(-50%) scaleY(0.8); } 50% { opacity: 0.85; transform: translateX(-50%) scaleY(1.15); } }

.mm-readout { position: absolute; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 7px 14px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-glass) 88%, transparent); border: 1px solid var(--perf-border-strong);
  backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px); }
.mm-readout-pct { font-size: 27px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
.mm-readout-pct.over { color: var(--perf-conflict); }
.mm-readout-sub { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-muted); }
.mm-reactor-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 750; color: var(--perf-text-muted);
  padding: 4px 11px; border-radius: 999px; background: var(--perf-surface); border: 1px solid var(--perf-border); max-width: 210px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mm-reactor-cap :deep(svg) { color: var(--perf-gold); flex-shrink: 0; }

/* ── strike line ── */
.mm-line { display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 12px), calc((var(--my, 0.5) - 0.5) * 9px)); }
.mm-group { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 10px; border-radius: 16px; cursor: pointer; font: inherit;
  background: color-mix(in srgb, var(--perf-surface) 70%, transparent); border: 1px solid transparent; transition: all 0.22s var(--perf-spring); flex: 1; min-width: 0; }
.mm-group:hover { background: var(--perf-surface); border-color: var(--perf-border-strong); transform: translateY(-2px); }
.mm-group.on { background: color-mix(in srgb, var(--perf-gold) 9%, var(--perf-surface)); border-color: var(--perf-border-warm); }
.mm-group.vault.on { background: color-mix(in srgb, var(--perf-ok) 10%, var(--perf-surface)); border-color: color-mix(in srgb, var(--perf-ok) 38%, transparent); }
.mm-group-meta { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
.mm-group-meta b { font-size: 18px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.mm-group-meta i { font-size: 8.5px; font-weight: 700; font-style: normal; letter-spacing: 0.02em; text-transform: uppercase; color: var(--perf-text-muted); white-space: nowrap; }
.mm-group.on .mm-group-meta i { color: var(--perf-gold); }
.mm-group.vault.on .mm-group-meta i { color: var(--perf-ok); }
.mm-empty-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px dashed var(--perf-text-dim); opacity: 0.6; }

.mm-group-stack { position: relative; display: flex; flex-direction: column-reverse; align-items: center; justify-content: flex-end; gap: 2px; height: 64px; }
/* ingots */
.mm-ingot { width: 30px; height: 7px; border-radius: 2px; background: linear-gradient(var(--perf-rust), color-mix(in srgb, var(--perf-rust) 55%, #000));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--perf-gold) 30%, transparent); opacity: 0.85; animation: mm-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--gi) * 0.05s); }
/* blanks */
.mm-blank { width: 18px; height: 18px; border-radius: 50%; background: var(--perf-surface-elevated);
  border: 1.5px solid color-mix(in srgb, var(--perf-gold) 55%, transparent); box-shadow: 0 0 8px -2px color-mix(in srgb, var(--perf-gold) 50%, transparent);
  animation: mm-bob var(--bd, 2.6s) ease-in-out infinite; animation-delay: calc(var(--gi) * 0.18s); }
@keyframes mm-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
/* coins */
.mm-vault-mouth { position: relative; display: grid; place-items: end center; height: 64px; }
.mm-coin-stack { position: relative; display: flex; flex-direction: column-reverse; align-items: center; gap: 1px; }
.mm-coin { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #4a2c08;
  background: radial-gradient(circle at 38% 32%, var(--perf-gold-bright), var(--perf-ember) 78%);
  border: 1px solid color-mix(in srgb, var(--perf-deep) 60%, transparent); box-shadow: 0 2px 5px -2px rgba(0,0,0,0.5);
  animation: mm-coin-drop 0.5s var(--perf-spring) both; animation-delay: calc(var(--gi) * 0.06s); }
.mm-coin :deep(svg) { opacity: 0.85; }
@keyframes mm-coin-drop { from { opacity: 0; transform: translateY(-16px) scale(0.6); } to { opacity: 1; transform: none; } }
.mm-coin-more { font-size: 9px; font-weight: 850; color: var(--perf-ok); margin-top: 1px; }
.mm-coinfly { position: absolute; top: -8px; left: 50%; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, var(--perf-gold-bright), var(--perf-ember)); box-shadow: 0 0 10px var(--perf-gold);
  opacity: 0; animation: mm-coinfly 3.4s ease-in infinite; }
@keyframes mm-coinfly { 0%, 70% { opacity: 0; transform: translateY(-26px) scale(0.5); } 78% { opacity: 1; transform: translateY(-10px) scale(1); } 100% { opacity: 0; transform: translateY(2px) scale(0.9); } }

.mm-feed { width: 22px; height: 2px; flex-shrink: 0; border-radius: 2px; background: var(--perf-border-strong); position: relative; overflow: hidden; }
.mm-feed.flow::after { content: ''; position: absolute; inset: 0; width: 40%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--perf-gold), transparent); animation: mm-feed 1.6s linear infinite; }
@keyframes mm-feed { from { transform: translateX(-100%); } to { transform: translateX(280%); } }

@keyframes mm-deal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* ── HUD ── */
.mm-hud { position: absolute; z-index: 7; display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 12px;
  background: var(--perf-glass); border: 1px solid var(--perf-border); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 26px -18px rgba(0,0,0,0.6); }
.mm-hud-tl { top: 12px; left: 12px; } .mm-hud-tr { top: 12px; right: 12px; align-items: flex-end; }
.mm-hud-bl { bottom: 12px; left: 12px; } .mm-hud-br { bottom: 12px; right: 12px; align-items: flex-end; }
.mm-hud-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.mm-hud-k :deep(svg) { color: var(--perf-gold); }
.mm-hud b { font-size: 16px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.mm-hud b.dim { color: var(--perf-text-dim); font-size: 14px; }
.mm-hud-br.ember { border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); animation: mm-ember 2.4s ease-in-out infinite; }
.mm-hud-br.ember .mm-hud-k, .mm-hud-br.ember b { color: var(--perf-conflict); }
.mm-hud-br.ember .mm-hud-k :deep(svg) { color: var(--perf-conflict); }
@keyframes mm-ember { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 16px -3px color-mix(in srgb, var(--perf-conflict) 55%, transparent); } }

@media (max-width: 900px) {
  .mm-stage { grid-template-columns: 1fr; gap: 14px; padding: 14px; }
  .mm-hud-bl, .mm-hud-br { display: none; }
}
@media (max-width: 560px) { .mm-line { flex-wrap: wrap; } .mm-feed { display: none; } }

@media (prefers-reduced-motion: reduce) {
  .mm-mote, .mm-die, .mm-flash, .mm-spark, .mm-emit, .mm-surface, .mm-bubble, .mm-overflow, .mm-blank, .mm-coin, .mm-coinfly, .mm-feed.flow::after, .mm-hud-br.ember { animation: none !important; }
  .mm-liquid { transition: none; }
  .mm-coinfly { display: none; }
  .mm-group:hover { transform: none; }
}
</style>
