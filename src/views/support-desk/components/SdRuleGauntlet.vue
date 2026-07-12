<template>
  <div ref="rootEl" class="rg" :class="{ playing }">
    <!-- ambient stage layer — horizontal corridor scanlines -->
    <span class="rg-scanfloor" aria-hidden="true" />

    <!-- ═══ instrument bar (deliberately slim — the hero above owns the headline) ═══ -->
    <header class="rg-bar">
      <span class="rg-bar-sig sd-mono" title="Every new ticket falls through this corridor, top to bottom — the first live gate whose conditions match captures it.">
        <GitBranch :size="12" /> INTERCEPT GAUNTLET
      </span>
      <span class="rg-bar-note sd-mono">FIRST MATCH WINS · TOP → BOTTOM</span>
      <span class="rg-sp" />
      <span class="rg-bar-tele sd-mono" aria-label="Chain telemetry">
        <em><b><SdCountUp :value="liveCount" /></b> LIVE</em>
        <em class="dim"><b><SdCountUp :value="offCount" /></b> STANDBY</em>
        <em class="fire"><b><SdCountUp :value="totalFires" /></b> CAPTURES</em>
        <em class="halt"><b><SdCountUp :value="stopCount" /></b> SEALS</em>
      </span>
      <Motion as="button" class="rg-new" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Forge a gate
      </Motion>
    </header>

    <!-- ═══ the corridor ═══ -->
    <div ref="laneEl" class="rg-lane">
      <span class="rg-spine" aria-hidden="true" />
      <!-- ambient falling ticket packets -->
      <span v-for="p in PACKETS" :key="'pk' + p.i" class="rg-packet" aria-hidden="true"
        :style="{ animationDelay: p.delay + 's', animationDuration: p.dur + 's', '--jx': p.jx + 'px', '--ps': p.s }" />

      <!-- probe orb (dry-run traveller) -->
      <span class="rg-orb" :class="{ show: orb.show }" :style="{ top: orb.top + 'px' }" aria-hidden="true" />

      <!-- intake head -->
      <div ref="intakeEl" class="rg-intake">
        <span class="rg-intake-core" :class="{ hot: playing }" aria-hidden="true">
          <span class="rg-intake-halo" /><span class="rg-intake-ring r1" /><span class="rg-intake-ring r2" />
        </span>
        <div class="rg-intake-lb">
          <b class="sd-mono">INTAKE</b>
          <span class="sd-mono">new tickets enter the corridor here</span>
        </div>
      </div>

      <!-- interceptor gates -->
      <TransitionGroup name="rg-row" tag="div" class="rg-flow">
        <div v-for="(r, i) in rules" :key="r.id" :ref="el => setGateEl(r.id, el)" class="rg-row"
          :style="{ '--i': i }" :class="{ off: !r.isActive }">
          <!-- spine coupler -->
          <span class="rg-coupler" :class="{ on: r.isActive, hit: verdicts[r.id] === 'hit' }" aria-hidden="true" />

          <!-- the gate card -->
          <article class="rg-gate" :class="{
              off: !r.isActive, scanning: scanningId === r.id, captured: capturedId === r.id,
              hit: verdicts[r.id] === 'hit', miss: verdicts[r.id] === 'miss',
            }"
            @pointermove="glare" @pointerleave="unglare" @click="$emit('edit', r.id)">
            <span class="rg-gate-glare" aria-hidden="true" />
            <span class="rg-scanline" aria-hidden="true" />

            <header class="rg-gate-h">
              <div class="rg-order" @click.stop>
                <button class="rg-nudge" :disabled="i === 0" title="Intercept earlier" @click="$emit('nudge', r.id, -1)"><ChevronUp :size="11" /></button>
                <b class="sd-mono">{{ String(i + 1).padStart(2, '0') }}</b>
                <button class="rg-nudge" :disabled="i === rules.length - 1" title="Intercept later" @click="$emit('nudge', r.id, 1)"><ChevronDown :size="11" /></button>
              </div>
              <span class="rg-lamp" :class="{ on: r.isActive }" :title="r.isActive ? 'Live on the line' : 'Standby — bypassed'" />
              <b class="rg-name">{{ r.name }}</b>
              <span class="rg-join sd-mono" :title="r.matchType === 'any' ? 'ANY condition opens the gate' : 'ALL conditions must hold'">
                {{ r.matchType === 'any' ? 'ANY' : 'ALL' }}</span>
              <span v-if="r.stop" class="rg-seal sd-mono" title="First-match seal — a capture stops the chain"><OctagonX :size="10" /> SEALS CHAIN</span>
              <span class="rg-sp" />
              <span class="rg-runs sd-mono" title="Tickets captured by this gate">×<SdCountUp :value="r.runs" /></span>
              <div class="rg-acts" @click.stop>
                <button class="rg-ic" title="Version history" @click="$emit('history', r.id)"><History :size="12" /></button>
                <button class="rg-ic" title="Edit" @click="$emit('edit', r.id)"><Pencil :size="12" /></button>
                <button class="rg-ic danger" title="Delete" @click="$emit('delete', r.id)"><Trash2 :size="12" /></button>
              </div>
            </header>

            <div class="rg-logic">
              <span class="rg-kw sd-mono">WHEN</span>
              <template v-for="(c, ci) in r.conds" :key="'c' + ci">
                <span v-if="ci" class="rg-op sd-mono">{{ r.matchType === 'any' ? 'OR' : 'AND' }}</span>
                <span class="rg-chip cond"><b>{{ c.f }}</b><i>{{ c.o }}</i><em v-if="c.v">{{ c.v }}</em></span>
              </template>
              <span class="rg-kw then sd-mono"><Zap :size="9" /> THEN</span>
              <span v-for="(a, ai) in r.acts" :key="'a' + ai" class="rg-chip act">
                <b>{{ a.label }}</b><em v-if="a.value">→ {{ a.value }}</em>
              </span>
            </div>

            <span v-if="!r.isActive" class="rg-bypass sd-mono" aria-hidden="true">BYPASSED — TRAFFIC PASSES THROUGH</span>
            <span class="rg-verdict sd-mono" :class="verdicts[r.id]" aria-hidden="true">
              {{ verdicts[r.id] === 'hit' ? (capturedId === r.id ? 'CAPTURED' : 'MATCH') : 'NO MATCH' }}</span>
          </article>

          <!-- deflection arm + destination port -->
          <span class="rg-arm" :class="{ live: r.isActive && r.runs > 0, surge: capturedId === r.id }"
            :style="{ '--ad': (i % 5) * 0.9 + 's' }" aria-hidden="true" />
          <component :is="r.port && r.port.kind === 'lane' ? 'button' : 'span'"
            class="rg-port" :class="[r.port ? r.port.kind : 'none', { surge: capturedId === r.id }]"
            :style="r.port && r.port.color ? { '--pc': r.port.color } : {}"
            :title="r.port && r.port.kind === 'lane' ? 'Open this lane' : undefined"
            @click.stop="r.port && r.port.kind === 'lane' && $emit('lane', r.port.queueId)">
            <template v-if="r.port">
              <span class="rg-port-dot" aria-hidden="true" />
              <span class="rg-port-lb sd-mono">{{ r.port.label }}</span>
              <ChevronRight v-if="r.port.kind === 'lane'" :size="11" class="rg-port-go" />
            </template>
            <span v-else class="rg-port-lb sd-mono dim">IN-PLACE</span>
          </component>
        </div>
      </TransitionGroup>

      <!-- empty corridor -->
      <div v-if="!rules.length" class="rg-empty">
        <p class="sd-mono">NO INTERCEPTORS ON THE LINE</p>
        <span>Every ticket falls straight through to the category router. Forge the first gate to start
          capturing traffic.</span>
        <Motion as="button" class="rg-new ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
          <Plus :size="13" /> Forge the first gate
        </Motion>
      </div>

      <!-- fallthrough sink -->
      <div ref="sinkEl" class="rg-sink" :class="{ flash: sinkFlash }">
        <span class="rg-sink-maw" aria-hidden="true"><span class="m1" /><span class="m2" /><span class="m3" /></span>
        <div class="rg-sink-lb">
          <b class="sd-mono">CATEGORY ROUTER</b>
          <span class="sd-mono">unmatched traffic · category map → team lane → default lane</span>
        </div>
        <span v-if="sinkFlash" class="rg-sink-stamp sd-mono">FALLTHROUGH</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdRuleGauntlet — "THE INTERCEPT GAUNTLET", the routing-rules chain rendered as a
  vertical particle-interceptor corridor. The stage is THEME-AWARE (elevated surface,
  gold machine accents) so it reads as an instrument bay, not a second dark hero:
  ambient ticket packets fall down a live energy spine, each rule is an interceptor
  gate coupled to the spine, matched traffic deflects along the gate's arm into its
  destination port. The Probe Console's dry-run plays back here as a staged descent:
  a golden probe orb drops gate to gate, each live gate scans it and stamps
  MATCH / NO MATCH; the capturing gate flashes, surges its arm and (if it seals the
  chain) ends the run — otherwise the orb falls to the sink.
  Presentational only: rules arrive display-ready; all writes stay in the section.
*/
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  GitBranch, Plus, ChevronUp, ChevronDown, ChevronRight, History, Pencil, Trash2,
  Zap, OctagonX,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  /* [{ id, name, isActive, stop, runs, matchType, conds:[{f,o,v}], acts:[{label,value}],
       port: { kind:'lane'|'team'|'effect', label, color?, queueId? } | null }] */
  rules: { type: Array, default: () => [] },
  /* { seq, steps:[{ id, verdict:'hit'|'miss'|'skip', stopped }], fallthrough } */
  trace: { type: Object, default: null },
})
const emit = defineEmits(['new', 'edit', 'delete', 'history', 'nudge', 'lane'])

const liveCount = computed(() => props.rules.filter(r => r.isActive).length)
const offCount = computed(() => props.rules.filter(r => !r.isActive).length)
const stopCount = computed(() => props.rules.filter(r => r.stop && r.isActive).length)
const totalFires = computed(() => props.rules.reduce((s, r) => s + (r.runs || 0), 0))

/* seeded ambient packets — deterministic so SSR/replays don't jitter */
const PACKETS = Array.from({ length: 9 }, (_, i) => ({
  i,
  delay: ((i * 137) % 100) / 14,           // 0‥7.1s
  dur: 6 + ((i * 61) % 50) / 10,           // 6‥11s
  jx: (((i * 89) % 11) - 5),               // −5‥5px lateral drift
  s: 0.6 + ((i * 47) % 40) / 100,          // 0.6‥1 scale
}))

/* pointer glare (same contract as the section's lane cards) */
const glare = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const unglare = (e) => e.currentTarget.style.setProperty('--spot', '0')

/* ══ probe playback ══ */
const rootEl = ref(null)
const laneEl = ref(null)
const intakeEl = ref(null)
const sinkEl = ref(null)
const gateEls = {}
const setGateEl = (id, el) => { if (el) gateEls[String(id)] = el; else delete gateEls[String(id)] }

const playing = ref(false)
const scanningId = ref(null)
const capturedId = ref(null)
const sinkFlash = ref(false)
const verdicts = reactive({})
const orb = reactive({ top: 0, show: false })

let playToken = 0
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
const reducedMotion = () => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    return !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { return false }
}
const centerOf = (el) => {
  if (!el || !laneEl.value) return 0
  const lane = laneEl.value.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return r.top - lane.top + r.height / 2
}

const resetPlayback = () => {
  Object.keys(verdicts).forEach(k => delete verdicts[k])
  scanningId.value = null
  capturedId.value = null
  sinkFlash.value = false
  orb.show = false
}

const play = async () => {
  const token = ++playToken
  const t = props.trace
  resetPlayback()
  if (!t || !t.steps) return

  /* reduced motion → reveal the report instantly, no descent */
  if (reducedMotion()) {
    for (const s of t.steps) { if (s.verdict !== 'skip') verdicts[s.id] = s.verdict; if (s.stopped) capturedId.value = s.id }
    sinkFlash.value = !!t.fallthrough
    return
  }

  playing.value = true
  await nextTick()
  orb.top = centerOf(intakeEl.value)
  orb.show = true
  await sleep(420); if (token !== playToken) return

  let sealed = false
  for (const s of t.steps) {
    const el = gateEls[String(s.id)]
    if (!el) continue
    orb.top = centerOf(el)
    await sleep(540); if (token !== playToken) return
    if (s.verdict === 'skip') continue                 // standby gate — pass straight through
    scanningId.value = s.id
    await sleep(620); if (token !== playToken) return
    scanningId.value = null
    verdicts[s.id] = s.verdict
    if (s.verdict === 'hit') {
      await sleep(240); if (token !== playToken) return
      if (s.stopped) {
        capturedId.value = s.id
        orb.show = false
        sealed = true
        await sleep(750); if (token !== playToken) return
        break
      }
      capturedId.value = s.id                          // match, chain continues — surge but keep falling
      await sleep(420); if (token !== playToken) return
    }
  }

  if (!sealed) {
    orb.top = centerOf(sinkEl.value)
    await sleep(620); if (token !== playToken) return
    orb.show = false
    sinkFlash.value = !!t.fallthrough        // only stamp when the fallback router decided
  }
  playing.value = false
}

watch(() => props.trace && props.trace.seq, (seq) => { if (seq != null) play() })
onBeforeUnmount(() => { playToken++ })
</script>

<style scoped>
/* ═══ the stage — THEME-AWARE instrument bay (the hero above owns the dark void) ═══ */
.rg {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-border); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated);
  padding: 0 18px 20px;
}
/* corridor depth ruler — fine horizontal scan hairlines */
.rg-scanfloor {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.6;
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sd-qc-core) 7%, transparent) 0 1px, transparent 1px 26px);
  mask-image: linear-gradient(90deg, #000 0%, transparent 22%, transparent 78%, #000 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 22%, transparent 78%, #000 100%);
}

/* ═══ instrument bar — slim console strip, NOT a hero header ═══ */
.rg-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 -18px 16px; padding: 11px 18px;
  border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 60%);
}
.rg-bar-sig {
  display: inline-flex; align-items: center; gap: 7px; cursor: help;
  font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core);
}
.rg-bar-note { font-size: 8.5px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.rg-bar-tele { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.rg-bar-tele em { font-style: normal; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.rg-bar-tele em b { font-size: 13px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.rg-bar-tele em.dim b { color: var(--sd-qc-spill); }
.rg-bar-tele em.fire b { color: var(--sd-qc-core); }
.rg-bar-tele em.halt b { color: var(--sd-qc-halt); }
.rg-new {
  display: inline-flex; align-items: center; gap: 6px; align-self: center;
  padding: 7px 13px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer;
  border: 1px solid transparent; color: #241703;
  background: var(--sd-qc-grad);
  box-shadow: var(--sd-qc-glow);
}
.rg-new.ghost { background: transparent; color: var(--sd-qc-core); border-color: var(--sd-qc-brd); box-shadow: none; }

/* ═══ the corridor ═══ */
.rg-lane { position: relative; z-index: 1; padding: 6px 0 4px; }
.rg-spine {
  position: absolute; left: 26px; top: 10px; bottom: 10px; width: 3px; border-radius: 2px;
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sd-qc-core) 85%, transparent) 0 7px, transparent 7px 16px);
  opacity: 0.5;
  mask-image: linear-gradient(180deg, transparent, #000 4%, #000 96%, transparent);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 4%, #000 96%, transparent);
  animation: rg-spine-flow 1.3s linear infinite;
  box-shadow: 0 0 14px color-mix(in srgb, var(--sd-qc-core) 22%, transparent);
}
@keyframes rg-spine-flow { to { background-position: 0 16px; } }

.rg-packet {
  position: absolute; left: 24.5px; top: 0; width: 6px; height: 6px; border-radius: 50%;
  background: var(--sd-qc-core); pointer-events: none; opacity: 0;
  box-shadow: 0 0 9px color-mix(in srgb, var(--sd-qc-core) 75%, transparent);
  transform: scale(var(--ps, 1));
  animation: rg-fall linear infinite;
}
@keyframes rg-fall {
  0% { top: 2%; opacity: 0; margin-left: 0; }
  8% { opacity: 0.85; }
  55% { margin-left: var(--jx, 0px); }
  90% { opacity: 0.85; }
  100% { top: 97%; opacity: 0; margin-left: 0; }
}

.rg-orb {
  position: absolute; left: 18.5px; width: 18px; height: 18px; border-radius: 50%;
  z-index: 6; pointer-events: none; opacity: 0; margin-top: -9px;
  background: radial-gradient(circle at 38% 34%, #fff7e3, #ffd98a 45%, #d98f1f 100%);
  box-shadow: 0 0 16px rgba(242, 182, 77, 0.85), 0 0 44px rgba(242, 182, 77, 0.45);
  transition: top 0.52s cubic-bezier(0.45, 0, 0.25, 1), opacity 0.3s;
}
.rg-orb.show { opacity: 1; animation: rg-orb-breathe 1.1s ease-in-out infinite; }
@keyframes rg-orb-breathe { 50% { box-shadow: 0 0 10px rgba(242, 182, 77, 0.65), 0 0 26px rgba(242, 182, 77, 0.32); } }

/* ═══ intake head ═══ */
.rg-intake { position: relative; display: flex; align-items: center; gap: 14px; padding: 4px 0 18px 6px; }
.rg-intake-core {
  position: relative; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 36% 32%, #ffe9bb, #f2b64d 52%, #9a660f 100%);
  box-shadow: 0 0 22px color-mix(in srgb, var(--sd-qc-core) 45%, transparent);
  animation: rg-core-breathe 3.4s ease-in-out infinite;
}
.rg-intake-core.hot { animation-duration: 1.2s; }
@keyframes rg-core-breathe { 50% { box-shadow: 0 0 34px color-mix(in srgb, var(--sd-qc-core) 65%, transparent); transform: scale(1.04); } }
.rg-intake-halo {
  position: absolute; inset: -9px; border-radius: 50%;
  border: 1.5px dashed color-mix(in srgb, var(--sd-qc-core) 50%, transparent);
  animation: rg-halo-spin 14s linear infinite;
}
@keyframes rg-halo-spin { to { transform: rotate(360deg); } }
.rg-intake-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 55%, transparent); animation: rg-emit 3s ease-out infinite; }
.rg-intake-ring.r2 { animation-delay: 1.5s; }
@keyframes rg-emit { from { transform: scale(1); opacity: 0.8; } to { transform: scale(2.5); opacity: 0; } }
.rg-intake-lb { display: flex; flex-direction: column; gap: 2px; }
.rg-intake-lb b { font-size: 11px; letter-spacing: 0.26em; color: var(--sd-qc-core); }
.rg-intake-lb span { font-size: 9.5px; letter-spacing: 0.08em; color: var(--sd-text-muted); }

/* ═══ gate rows ═══ */
.rg-flow { display: flex; flex-direction: column; gap: 14px; position: relative; }
.rg-row {
  position: relative; display: grid; align-items: center; gap: 0;
  grid-template-columns: 44px minmax(0, 1fr) 54px 178px;
  animation: rg-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 0.07s);
}
@keyframes rg-rise {
  from { opacity: 0; transform: translateY(18px) scale(0.985); clip-path: inset(0 0 40% 0); }
  to { opacity: 1; transform: none; clip-path: inset(0 0 0 0); }
}
.rg-row-move, .rg-row-enter-active, .rg-row-leave-active { transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.rg-row-enter-from, .rg-row-leave-to { opacity: 0; transform: translateY(10px); }
.rg-row-leave-active { position: absolute; width: 100%; }

.rg-coupler {
  justify-self: center; position: relative; width: 11px; height: 11px; border-radius: 50%;
  background: var(--sd-surface-elevated); border: 2px solid color-mix(in srgb, var(--sd-qc-core) 42%, transparent);
  transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.rg-coupler::after {
  content: ""; position: absolute; top: 50%; left: 100%; width: 10px; height: 2px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 50%, transparent), color-mix(in srgb, var(--sd-qc-core) 14%, transparent));
}
.rg-coupler.on { background: var(--sd-qc-core); box-shadow: 0 0 10px color-mix(in srgb, var(--sd-qc-core) 55%, transparent); }
.rg-coupler.hit { background: var(--sd-qc-hi); box-shadow: 0 0 16px color-mix(in srgb, var(--sd-qc-hi) 85%, transparent); }

.rg-gate {
  position: relative; overflow: hidden; cursor: pointer; min-width: 0;
  border: 1px solid var(--sd-border-strong); border-radius: 15px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 46%), var(--sd-surface-elevated);
  padding: 11px 13px 12px;
  /* lift only — a perspective tilt here shears the 1px border against the row grid */
  transition: border-color 0.28s, box-shadow 0.28s, transform 0.28s, opacity 0.3s;
}
.rg-gate:hover {
  border-color: var(--sd-qc-brd);
  box-shadow: var(--sd-qc-glow), 0 10px 26px rgba(0, 0, 0, 0.18);
  transform: translateY(-3px);
}
.rg-gate.off { opacity: 0.55; border-style: dashed; }
.rg-gate-glare {
  position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0);
  background: radial-gradient(300px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), var(--sd-qc-soft), transparent 62%);
  transition: opacity 0.3s;
}

/* probe scan + verdicts */
.rg-scanline {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(90deg, transparent 8%, color-mix(in srgb, var(--sd-qc-hi) 18%, transparent) 46%, color-mix(in srgb, var(--sd-qc-hi) 30%, transparent) 50%, color-mix(in srgb, var(--sd-qc-hi) 18%, transparent) 54%, transparent 92%);
  background-size: 220% 100%;
}
.rg-gate.scanning { border-color: var(--sd-qc-hi); }
.rg-gate.scanning .rg-scanline { opacity: 1; animation: rg-scan 0.62s cubic-bezier(0.45, 0, 0.55, 1); }
@keyframes rg-scan { from { background-position: 120% 0; } to { background-position: -120% 0; } }
.rg-gate.hit { border-color: color-mix(in srgb, var(--sd-qc-hi) 70%, transparent); box-shadow: var(--sd-qc-glow); }
.rg-gate.miss { border-color: color-mix(in srgb, var(--sd-qc-spill) 45%, transparent); }
.rg-gate.captured { animation: rg-capture 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes rg-capture {
  0% { box-shadow: 0 0 0 color-mix(in srgb, var(--sd-qc-hi) 0%, transparent); }
  30% { box-shadow: 0 0 46px color-mix(in srgb, var(--sd-qc-hi) 55%, transparent), inset 0 0 30px color-mix(in srgb, var(--sd-qc-core) 18%, transparent); }
  100% { box-shadow: var(--sd-qc-glow); }
}
.rg-verdict {
  position: absolute; right: 12px; bottom: 9px; z-index: 3; pointer-events: none;
  font-size: 9px; font-weight: 900; letter-spacing: 0.2em; padding: 3px 9px; border-radius: 6px;
  border: 1.5px solid transparent; opacity: 0; transform: scale(1.6) rotate(-6deg);
  backdrop-filter: blur(3px);
}
.rg-verdict.hit, .rg-verdict.miss { animation: rg-stamp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.rg-verdict.hit { color: var(--sd-qc-hi); border-color: color-mix(in srgb, var(--sd-qc-hi) 65%, transparent); background: var(--sd-qc-soft); }
.rg-verdict.miss { color: var(--sd-qc-spill); border-color: color-mix(in srgb, var(--sd-qc-spill) 45%, transparent); background: var(--sd-qc-spill-soft); }
@keyframes rg-stamp { to { opacity: 1; transform: scale(1) rotate(-3deg); } }

/* gate header */
.rg-gate-h { position: relative; z-index: 2; display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.rg-order { display: flex; flex-direction: column; align-items: center; gap: 0; flex-shrink: 0; }
.rg-order b {
  font-size: 12px; color: var(--sd-qc-core); line-height: 1;
  padding: 2px 6px; border: 1px solid color-mix(in srgb, var(--sd-qc-core) 32%, transparent); border-radius: 6px;
  background: var(--sd-qc-soft);
}
.rg-nudge {
  display: grid; place-items: center; width: 20px; height: 14px;
  background: transparent; border: none; color: var(--sd-text-muted); cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}
.rg-nudge:hover:not(:disabled) { color: var(--sd-qc-hi); transform: scale(1.25); }
.rg-nudge:disabled { opacity: 0.25; cursor: not-allowed; }
.rg-lamp {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: color-mix(in srgb, var(--sd-qc-spill) 45%, transparent); transition: background 0.3s, box-shadow 0.3s;
}
.rg-lamp.on { background: var(--sd-qc-go); box-shadow: 0 0 10px var(--sd-qc-go); animation: rg-lamp-breathe 2.6s ease-in-out infinite; }
@keyframes rg-lamp-breathe { 50% { box-shadow: 0 0 3px var(--sd-qc-go); } }
.rg-name { font-size: 13.5px; font-weight: 800; color: var(--sd-text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-join {
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; color: var(--sd-qc-core);
  border: 1px solid color-mix(in srgb, var(--sd-qc-core) 32%, transparent); border-radius: 5px; padding: 2px 6px;
}
.rg-seal {
  display: inline-flex; align-items: center; gap: 4px; position: relative; overflow: hidden;
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.14em; color: var(--sd-qc-halt);
  border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 42%, transparent); border-radius: 6px; padding: 2.5px 8px;
  background: var(--sd-qc-halt-soft);
}
.rg-seal::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--sd-qc-halt) 22%, transparent) 50%, transparent 70%);
  background-size: 260% 100%;
  animation: rg-seal-sheen 4.5s ease-in-out infinite;
}
@keyframes rg-seal-sheen { 0%, 55% { background-position: 130% 0; } 90%, 100% { background-position: -130% 0; } }
.rg-sp { flex: 1; }
.rg-runs { font-size: 11px; color: var(--sd-text-muted); letter-spacing: 0.04em; }
.rg-acts { display: flex; gap: 5px; }
.rg-ic {
  width: 25px; height: 25px; display: inline-grid; place-items: center; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
  transition: color 0.2s, border-color 0.2s, transform 0.2s, background 0.2s;
}
.rg-ic:hover { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); transform: translateY(-1px); background: var(--sd-qc-soft); }
.rg-ic.danger:hover { color: var(--sd-qc-halt); border-color: color-mix(in srgb, var(--sd-qc-halt) 50%, transparent); background: var(--sd-qc-halt-soft); }

/* gate logic strip */
.rg-logic { position: relative; z-index: 2; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.rg-kw {
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-text-muted);
  display: inline-flex; align-items: center; gap: 3px;
}
.rg-kw.then { color: var(--sd-qc-core); }
.rg-op { font-size: 8px; font-weight: 900; letter-spacing: 0.14em; color: var(--sd-qc-warn); }
.rg-chip {
  display: inline-flex; align-items: baseline; gap: 5px; max-width: 100%;
  font-size: 10.5px; padding: 3px 9px; border-radius: 7px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
}
.rg-chip b { font-weight: 700; color: var(--sd-text); }
.rg-chip i { font-style: normal; opacity: 0.8; }
.rg-chip em { font-style: normal; color: var(--sd-qc-hi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.rg-chip.act { border-color: color-mix(in srgb, var(--sd-qc-core) 32%, transparent); background: var(--sd-qc-soft); }
.rg-chip.act b { color: var(--sd-qc-core); }

.rg-bypass {
  position: absolute; right: 12px; bottom: 9px; z-index: 2;
  font-size: 8px; letter-spacing: 0.18em; color: var(--sd-text-muted); opacity: 0.7;
}

/* ═══ deflection arm + port ═══ */
.rg-arm {
  position: relative; height: 2px; margin: 0 2px; border-radius: 1px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 42%, transparent) 0 6px, transparent 6px 13px);
  opacity: 0.5;
}
.rg-arm.live { opacity: 0.9; animation: rg-arm-flow 0.9s linear infinite; }
@keyframes rg-arm-flow { to { background-position: 13px 0; } }
.rg-arm.live::after {
  content: ""; position: absolute; top: 50%; left: 0; width: 6px; height: 6px; margin-top: -3px;
  border-radius: 50%; background: var(--sd-qc-core); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-qc-core) 75%, transparent);
  animation: rg-arm-spark 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite; animation-delay: var(--ad, 0s);
}
@keyframes rg-arm-spark {
  0%, 62% { left: -6px; opacity: 0; }
  66% { opacity: 1; }
  94% { opacity: 1; }
  100% { left: calc(100% + 2px); opacity: 0; }
}
.rg-arm.surge { animation: rg-arm-surge 0.7s ease-out; opacity: 1; }
@keyframes rg-arm-surge {
  0% { box-shadow: 0 0 0 color-mix(in srgb, var(--sd-qc-hi) 0%, transparent); filter: brightness(1); }
  35% { box-shadow: 0 0 18px color-mix(in srgb, var(--sd-qc-hi) 85%, transparent); filter: brightness(1.8); }
  100% { box-shadow: 0 0 0 color-mix(in srgb, var(--sd-qc-hi) 0%, transparent); filter: brightness(1); }
}
.rg-port {
  display: inline-flex; align-items: center; gap: 7px; min-width: 0;
  border: 1px solid color-mix(in srgb, var(--pc, var(--sd-qc-spill)) 45%, transparent); border-radius: 11px;
  background: color-mix(in srgb, var(--pc, var(--sd-qc-spill)) 9%, var(--sd-surface-elevated));
  padding: 8px 11px; text-align: left;
  transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
  --pc: var(--sd-qc-core);
}
.rg-port.team { --pc: var(--sd-qc-spill); }
.rg-port.effect { --pc: var(--sd-qc-warn); }
.rg-port.none { --pc: var(--sd-qc-spill); border-style: dashed; background: transparent; }
button.rg-port { cursor: pointer; }
button.rg-port:hover { transform: translateX(3px); box-shadow: 0 0 18px color-mix(in srgb, var(--pc) 35%, transparent); border-color: color-mix(in srgb, var(--pc) 70%, transparent); }
.rg-port.surge { animation: rg-port-pop 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes rg-port-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.08); box-shadow: 0 0 26px color-mix(in srgb, var(--pc) 60%, transparent); }
  100% { transform: scale(1); }
}
.rg-port-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--pc); box-shadow: 0 0 8px color-mix(in srgb, var(--pc) 70%, transparent); }
.rg-port-lb { font-size: 10px; font-weight: 800; letter-spacing: 0.07em; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-port-lb.dim { color: var(--sd-text-muted); letter-spacing: 0.16em; font-size: 8.5px; }
.rg-port-go { color: var(--pc); flex-shrink: 0; margin-left: auto; }

/* ═══ empty corridor ═══ */
.rg-empty {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin: 6px 0 6px 54px; padding: 18px 20px;
  border: 1px dashed var(--sd-qc-brd); border-radius: 15px;
  background: var(--sd-qc-soft);
}
.rg-empty p { margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core); }
.rg-empty > span { font-size: 12px; line-height: 1.6; color: var(--sd-text-muted); max-width: 480px; }

/* ═══ fallthrough sink ═══ */
.rg-sink { position: relative; display: flex; align-items: center; gap: 14px; padding: 20px 0 2px 6px; }
.rg-sink-maw { position: relative; width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; }
.rg-sink-maw span {
  position: absolute; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-qc-spill) 55%, transparent);
  animation: rg-maw 3.2s ease-in infinite;
}
.rg-sink-maw .m1 { inset: 0; animation-delay: 0s; }
.rg-sink-maw .m2 { inset: 0; animation-delay: 1.05s; }
.rg-sink-maw .m3 { inset: 0; animation-delay: 2.1s; }
@keyframes rg-maw { from { transform: scale(1.55); opacity: 0; } 30% { opacity: 0.8; } to { transform: scale(0.24); opacity: 0; } }
.rg-sink-lb { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rg-sink-lb b { font-size: 11px; letter-spacing: 0.24em; color: var(--sd-qc-spill); }
.rg-sink-lb span { font-size: 9.5px; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.rg-sink.flash .rg-sink-maw span { border-color: color-mix(in srgb, var(--sd-qc-warn) 80%, transparent); }
.rg-sink.flash .rg-sink-lb b { color: var(--sd-qc-warn); }
.rg-sink-stamp {
  font-size: 9px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-warn);
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-warn) 55%, transparent); border-radius: 6px; padding: 3px 9px;
  background: var(--sd-qc-warn-soft); transform: rotate(-3deg);
  animation: rg-stamp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ═══ responsive ═══ */
@media (max-width: 900px) {
  .rg-row { grid-template-columns: 44px minmax(0, 1fr); }
  .rg-arm { display: none; }
  .rg-port { grid-column: 2; justify-self: end; margin-top: 6px; max-width: 70%; }
}

/* ═══ reduced motion — ambient loops off unless cinematic mode forces them on ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rg-spine,
  html:not([data-cinematic="on"]) .rg-orb.show,
  html:not([data-cinematic="on"]) .rg-intake-core,
  html:not([data-cinematic="on"]) .rg-intake-halo,
  html:not([data-cinematic="on"]) .rg-intake-ring,
  html:not([data-cinematic="on"]) .rg-row,
  html:not([data-cinematic="on"]) .rg-lamp.on,
  html:not([data-cinematic="on"]) .rg-seal::after,
  html:not([data-cinematic="on"]) .rg-arm.live,
  html:not([data-cinematic="on"]) .rg-sink-maw span { animation: none; }
  html:not([data-cinematic="on"]) .rg-packet,
  html:not([data-cinematic="on"]) .rg-arm.live::after { animation: none; opacity: 0; }
  html:not([data-cinematic="on"]) .rg-gate:hover { transform: none; }
}

/* ═══ light theme — deepen the hairlines/glows that read too pale on cream ═══ */
[data-theme="light"] .rg { background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated); }
[data-theme="light"] .rg-orb {
  box-shadow: 0 0 12px rgba(168, 121, 27, 0.6), 0 0 30px rgba(168, 121, 27, 0.3);
}
[data-theme="light"] .rg-gate { box-shadow: 0 2px 10px rgba(60, 42, 8, 0.05); }
</style>
