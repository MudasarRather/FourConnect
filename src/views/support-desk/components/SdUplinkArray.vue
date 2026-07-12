<template>
  <div class="ua">
    <!-- ═══ instrument bar ═══ -->
    <header class="ua-bar">
      <span class="ua-bar-sig sd-mono"
        title="Outbound signals — the desk core emits every ticket lifecycle event; these three transmission lines decide what leaves the building, and where it lands.">
        <RadioTower :size="12" /> UPLINK ARRAY
      </span>
      <span class="ua-bar-note sd-mono">OUTBOUND SIGNALS · WHAT NEWS LEAVES THE DESK — AND WHERE IT LANDS</span>
      <span class="ua-sp" />
      <span class="ua-bar-tele sd-mono" aria-label="Uplink telemetry">
        <em class="go"><b>{{ liveCount }}/3</b> LINES LIVE</em>
        <em><b>5</b> EVENTS WIRED</em>
        <em v-if="testResult" :class="testResult.ok ? 'go' : 'halt'">
          <b>{{ testResult.ok ? 'PASS' : 'FAIL' }}</b> LAST TEST</em>
      </span>
    </header>

    <!-- ═══ the array ═══ -->
    <div class="ua-stage">
      <span class="ua-floor" aria-hidden="true" />

      <!-- the desk core (emitter) -->
      <div class="ua-core">
        <span class="ua-core-orb" aria-hidden="true">
          <i class="r r1" /><i class="r r2" /><i class="r r3" />
          <Zap :size="15" class="ua-core-bolt" />
        </span>
        <b class="sd-mono">DESK CORE</b>
        <span class="ua-core-sub">every ticket lifecycle event starts here</span>
      </div>

      <!-- transmission lines -->
      <div class="ua-lines">
        <div v-for="(l, i) in lines" :key="l.key" class="ua-line" :style="{ '--i': i, '--pd': (3.4 + i * 0.5) + 's' }">
          <!-- the wire -->
          <div class="ua-wire" :class="{ live: l.on, testing: l.key === 'webhook' && testing }">
            <span class="ua-seg a" aria-hidden="true" />
            <span class="ua-seg b" aria-hidden="true" />
            <template v-if="!reduced">
              <span v-if="l.on" class="ua-pulse" aria-hidden="true" />
              <span v-if="l.on" class="ua-pulse p2" aria-hidden="true" />
              <span v-else class="ua-pulse dies" aria-hidden="true" />
              <span v-if="l.key === 'webhook' && testing" class="ua-comet" aria-hidden="true" />
            </template>

            <!-- the breaker, seated on the wire -->
            <button v-if="l.kind === 'switch'" class="ua-breaker" :class="{ on: l.on }" role="switch"
              :aria-checked="l.on" :disabled="busy"
              :title="l.on ? 'Line is live — cut it' : 'Line is cut — restore it'"
              @click="$emit('toggle', l.key)">
              <i class="kn" aria-hidden="true" />
              <span class="sd-mono">{{ l.on ? 'LIVE' : 'CUT' }}</span>
            </button>
            <button v-else class="ua-breaker url" :class="{ on: l.on }"
              :title="l.on ? 'Uplink wired — edit the endpoint below' : 'No endpoint wired — enter a URL below'"
              @click="focusUrl">
              <i class="kn" aria-hidden="true" />
              <span class="sd-mono">{{ l.on ? 'WIRED' : 'NO URL' }}</span>
            </button>
          </div>

          <!-- the receiver -->
          <article class="ua-recv" :class="{ on: l.on }" @pointermove="glare" @pointerleave="unglare">
            <span class="ua-recv-glare" aria-hidden="true" />
            <span class="ua-recv-ic" :class="{ ring: l.on && !reduced }">
              <component :is="l.icon" :size="16" />
            </span>
            <div class="ua-recv-b">
              <header>
                <b>{{ l.title }}</b>
                <span class="ua-lamp sd-mono" :class="l.on ? 'go' : 'halt'">{{ l.on ? 'RECEIVING' : 'SILENT' }}</span>
              </header>
              <p>{{ l.desc }}</p>
              <div class="ua-evs">
                <span v-for="ev in l.events" :key="ev" class="ua-ev sd-mono">{{ ev }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- ═══ the uplink console (webhook endpoint) ═══ -->
    <div class="ua-console">
      <div class="ua-con-l">
        <span class="ua-con-lb sd-mono"><SatelliteDish :size="11" /> UPLINK ENDPOINT</span>
        <div class="ua-con-row">
          <input ref="urlEl" v-model.trim="draft" class="ua-inp sd-mono" :class="{ bad: !urlOk }"
            placeholder="https://hooks.slack.com/services/…" spellcheck="false"
            @keydown.enter="canSave && $emit('save-url', draft)" />
          <Motion as="button" class="ua-btn primary" :disabled="!canSave || busy"
            :while-hover="canSave ? { y: -2 } : {}" :while-tap="canSave ? { scale: 0.96 } : {}"
            @click="$emit('save-url', draft)">
            <Loader v-if="busy" :size="12" class="ua-spin" /><Save v-else :size="12" /> Wire it
          </Motion>
          <Motion as="button" class="ua-btn" :disabled="!canTest || testing"
            :while-hover="canTest ? { y: -2 } : {}" :while-tap="canTest ? { scale: 0.96 } : {}"
            :title="canTest ? 'Fire the test payload at the endpoint' : 'Enter a valid URL first'"
            @click="$emit('test', draft || wires.webhook_url)">
            <Loader v-if="testing" :size="12" class="ua-spin" /><Send v-else :size="12" />
            {{ testing ? 'Transmitting…' : 'Test transmission' }}
          </Motion>
        </div>
        <p v-if="!urlOk" class="ua-err sd-mono"><TriangleAlert :size="10" /> MUST START http:// OR https://</p>
        <Motion v-else-if="testResult" as="p" class="ua-verdict sd-mono" :class="testResult.ok ? 'go' : 'halt'"
          :initial="{ opacity: 0, y: 6, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }" :key="testResult.at">
          <component :is="testResult.ok ? CircleCheck : TriangleAlert" :size="10" />
          {{ testResult.ok ? `DELIVERED · ${testResult.detail}` : `NO CONTACT · ${testResult.detail}` }}
        </Motion>
        <p v-else class="ua-hint">Blank = uplink off. Fire-and-forget with a 4s timeout — a dead endpoint can never
          slow the desk — and bursts dedupe to one post per event per ticket.</p>
      </div>
      <div class="ua-con-r">
        <span class="ua-con-lb sd-mono"><CircuitBoard :size="11" /> PAYLOAD ON THE WIRE</span>
        <pre class="ua-payload sd-mono"><i>POST</i> {{ draft || wires.webhook_url || 'https://…' }}
{ "text": "[TICKET ASSIGNED] Assigned to you — TCK-0042: VPN down at Pune" }</pre>
        <span class="ua-hint">Slack-compatible — points at Slack, Teams (via connector), Discord (/slack) or your own service.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdUplinkArray — "THE UPLINK ARRAY", the Queue-Config Wires panel's signature
  instrument. A ground-station transmission console: the DESK CORE emits every
  ticket lifecycle event; three transmission lines carry them out — AGENT PING
  (assignment), OWNER ALARM (SLA breach) and the EXTERNAL UPLINK (webhook).
  Each line has a physical breaker seated on the wire: signal pulses ride live
  lines to their receiver (which rings on arrival); on a cut line the pulses
  die at the open breaker. The uplink console wires/validates the endpoint and
  fires a real TEST TRANSMISSION (golden comet + verdict chip) through the new
  /settings/test-webhook route. Theme-aware surfaces — the hero owns the page's
  only dark stage. Distinct from every sibling: the only emitter→breaker→receiver
  signal-flow motif in the module.
*/
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RadioTower, SatelliteDish, BellRing, Siren, Zap, Send, Save, Loader,
  TriangleAlert, CircleCheck, CircuitBoard,
} from 'lucide-vue-next'

const props = defineProps({
  wires: { type: Object, default: () => ({ assign_email: true, breach_warning: true, webhook_url: '' }) },
  busy: { type: Boolean, default: false },
  testing: { type: Boolean, default: false },
  testResult: { type: Object, default: null },   // { ok, detail, at }
})
defineEmits(['toggle', 'save-url', 'test'])

const urlEl = ref(null)
const draft = ref(props.wires.webhook_url || '')
watch(() => props.wires.webhook_url, (v) => { draft.value = v || '' })

const urlOk = computed(() => !draft.value || /^https?:\/\/\S+/.test(draft.value))
const webhookOn = computed(() => !!(props.wires.webhook_url || '').trim())
const canSave = computed(() => urlOk.value && draft.value !== (props.wires.webhook_url || ''))
const canTest = computed(() => urlOk.value && !!(draft.value || props.wires.webhook_url))
const focusUrl = () => { try { urlEl.value?.focus() } catch { /* noop */ } }

const lines = computed(() => [
  {
    key: 'assign_email', icon: BellRing, kind: 'switch', on: !!props.wires.assign_email,
    title: 'AGENT PING',
    desc: 'Rings the agent the instant assignment couples work onto them — claim, serve-next, auto-assign, reassign.',
    events: ['ASSIGNED'],
  },
  {
    key: 'breach_warning', icon: Siren, kind: 'switch', on: !!props.wires.breach_warning,
    title: 'OWNER ALARM',
    desc: 'Sounds when the breach sweep flips an SLA flag on a ticket they own — response or resolution past target.',
    events: ['SLA BREACHED'],
  },
  {
    key: 'webhook', icon: SatelliteDish, kind: 'url', on: webhookOn.value,
    title: 'EXTERNAL UPLINK',
    desc: 'Mirrors the desk to the outside world — one Slack-compatible POST per lifecycle event, deduped per ticket.',
    events: ['CREATED', 'ASSIGNED', 'ESCALATED', 'BREACHED', 'RESOLVED'],
  },
])
const liveCount = computed(() => lines.value.filter(l => l.on).length)

/* reduced motion (OS setting, unless Cinematic mode forces on) */
const reduced = ref(false)
onMounted(() => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    reduced.value = !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { reduced.value = false }
})

/* pointer glare on receiver plates */
const glare = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const unglare = (e) => e.currentTarget.style.setProperty('--spot', '0')
</script>

<style scoped>
/* ═══ theme-aware — the hero owns the page's only dark stage ═══ */
.ua {
  --ua-core: var(--sd-qc-core);
  --ua-hi: var(--sd-qc-hi);
  --ua-ink: var(--sd-text);
  --ua-dim: var(--sd-text-muted);
  --ua-line: var(--sd-border);
  --ua-brd: var(--sd-qc-brd);
  --ua-soft: var(--sd-qc-soft);
  --ua-go: var(--sd-qc-go);
  --ua-halt: var(--sd-qc-halt);
  display: flex; flex-direction: column; gap: 12px;
}
.ua-sp { flex: 1; }

/* ═══ instrument bar ═══ */
.ua-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 11px 16px; border-radius: 14px;
  background: var(--sd-surface-glass); border: 1px solid var(--ua-line);
  backdrop-filter: blur(10px);
}
.ua-bar-sig { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--ua-core); cursor: help; }
.ua-bar-note { font-size: 9px; letter-spacing: 0.1em; color: var(--ua-dim); }
.ua-bar-tele { display: inline-flex; gap: 14px; font-size: 9px; letter-spacing: 0.08em; color: var(--ua-dim); }
.ua-bar-tele em { font-style: normal; display: inline-flex; align-items: baseline; gap: 5px; }
.ua-bar-tele b { font-size: 13px; color: var(--ua-ink); }
.ua-bar-tele .go b { color: var(--ua-go); }
.ua-bar-tele .halt b { color: var(--ua-halt); }

/* ═══ the array stage ═══ */
.ua-stage {
  position: relative; display: grid; grid-template-columns: 200px minmax(0, 1fr);
  gap: 0 18px; align-items: center; overflow: hidden;
  padding: 26px 22px; border-radius: 16px;
  background: var(--sd-surface); border: 1px solid var(--ua-line);
}
.ua-floor {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background:
    radial-gradient(45% 70% at 6% 50%, color-mix(in srgb, var(--ua-core) 9%, transparent), transparent 70%),
    repeating-linear-gradient(0deg, transparent 0 34px, color-mix(in srgb, var(--ua-core) 4%, transparent) 34px 35px),
    repeating-linear-gradient(90deg, transparent 0 34px, color-mix(in srgb, var(--ua-core) 4%, transparent) 34px 35px);
}

/* the desk core */
.ua-core {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
  text-align: center; animation: ua-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes ua-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: none; } }
.ua-core b { font-size: 10px; letter-spacing: 0.16em; color: var(--ua-ink); }
.ua-core-sub { font-size: 10px; color: var(--ua-dim); max-width: 160px; line-height: 1.4; }
.ua-core-orb {
  position: relative; width: 84px; height: 84px; display: grid; place-items: center;
  margin-bottom: 4px;
}
.ua-core-bolt { position: relative; z-index: 1; color: var(--ua-core);
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ua-core) 70%, transparent)); }
.ua-core-orb::before { content: ''; position: absolute; inset: 24px; border-radius: 50%;
  background: var(--ua-soft); border: 1.5px solid var(--ua-brd);
  box-shadow: 0 0 24px color-mix(in srgb, var(--ua-core) 30%, transparent);
  animation: ua-breathe 3.4s ease-in-out infinite; }
.ua-core-orb .r { position: absolute; inset: 0; border-radius: 50%;
  border: 1px solid var(--ua-brd); opacity: 0;
  animation: ua-ring 3.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite; }
.ua-core-orb .r2 { animation-delay: 1.13s; }
.ua-core-orb .r3 { animation-delay: 2.26s; }
@keyframes ua-ring { 0% { transform: scale(0.35); opacity: 0.9; } 100% { transform: scale(1.15); opacity: 0; } }
@keyframes ua-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }

/* lines */
.ua-lines { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ua-line { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(300px, 380px); gap: 14px;
  align-items: center; }

/* the wire */
.ua-wire { position: relative; height: 40px; display: flex; align-items: center;
  animation: ua-draw 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: left center;
  animation-delay: calc(0.15s + var(--i) * 0.12s); }
@keyframes ua-draw { from { opacity: 0; transform: scaleX(0.2); } to { opacity: 1; transform: none; } }
.ua-seg { position: absolute; top: 50%; height: 2px; transform: translateY(-50%); border-radius: 2px; }
.ua-seg.a { left: 0; right: 58%; background: repeating-linear-gradient(90deg,
    color-mix(in srgb, var(--ua-core) 55%, transparent) 0 8px, transparent 8px 16px);
  background-size: 16px 2px; animation: ua-flow 0.9s linear infinite; }
.ua-seg.b { left: 42%; right: 0; background: repeating-linear-gradient(90deg,
    color-mix(in srgb, var(--ua-core) 55%, transparent) 0 8px, transparent 8px 16px);
  background-size: 16px 2px; animation: ua-flow 0.9s linear infinite; }
@keyframes ua-flow { to { background-position: 16px 0; } }
.ua-wire:not(.live) .ua-seg.b { background: repeating-linear-gradient(90deg,
    color-mix(in srgb, var(--ua-ink) 18%, transparent) 0 4px, transparent 4px 12px);
  animation: none; opacity: 0.5; }
.ua-wire:not(.live) .ua-seg.a { opacity: 0.55; }

/* signal pulses riding the wire */
.ua-pulse { position: absolute; top: 50%; width: 7px; height: 7px; border-radius: 50%;
  transform: translateY(-50%); background: var(--ua-hi);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ua-core) 80%, transparent);
  animation: ua-ride var(--pd) linear infinite; }
.ua-pulse.p2 { animation-delay: calc(var(--pd) / -2); }
@keyframes ua-ride { 0% { left: -2%; opacity: 0; } 6% { opacity: 1; } 94% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
/* on a cut line the pulse dies at the open breaker */
.ua-pulse.dies { animation: ua-die var(--pd) linear infinite; }
@keyframes ua-die {
  0% { left: -2%; opacity: 0; } 8% { opacity: 0.85; }
  36% { left: 38%; opacity: 0.85; transform: translateY(-50%) scale(1); }
  42% { left: 41%; opacity: 0; transform: translateY(-50%) scale(2.1); }
  100% { left: 41%; opacity: 0; }
}
/* the golden test comet */
.ua-comet { position: absolute; top: 50%; width: 30px; height: 3px; border-radius: 3px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, var(--ua-hi));
  box-shadow: 0 0 12px var(--ua-core); animation: ua-comet 1.1s ease-in infinite; }
@keyframes ua-comet { 0% { left: -6%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 98%; opacity: 0; } }

/* the breaker seated on the wire */
.ua-breaker {
  position: absolute; left: 42%; transform: translateX(-50%); z-index: 1;
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px 5px 6px;
  border-radius: 999px; cursor: pointer; font-family: inherit;
  background: var(--sd-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--ua-ink) 16%, transparent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
.ua-breaker:hover:not(:disabled) { transform: translateX(-50%) translateY(-2px); border-color: var(--ua-brd); }
.ua-breaker:disabled { cursor: wait; opacity: 0.7; }
.ua-breaker .kn { width: 13px; height: 13px; border-radius: 50%; background: var(--ua-dim);
  transition: background 0.25s, box-shadow 0.25s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.ua-breaker span { font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--ua-dim); }
.ua-breaker.on { border-color: color-mix(in srgb, var(--ua-go) 45%, transparent); }
.ua-breaker.on .kn { background: var(--ua-go); transform: scale(1.05);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ua-go) 70%, transparent); }
.ua-breaker.on span { color: var(--ua-go); }
.ua-breaker.url.on { border-color: var(--ua-brd); }
.ua-breaker.url.on .kn { background: var(--ua-core);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ua-core) 70%, transparent); }
.ua-breaker.url.on span { color: var(--ua-core); }

/* the receiver plate */
.ua-recv {
  position: relative; display: flex; gap: 12px; align-items: flex-start; overflow: hidden;
  padding: 12px 14px; border-radius: 14px;
  background: var(--sd-surface-elevated); border: 1px solid var(--ua-line);
  animation: ua-arrive 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.28s + var(--i) * 0.12s);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s, opacity 0.25s;
}
@keyframes ua-arrive { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
.ua-recv:hover { border-color: var(--ua-brd); box-shadow: var(--sd-qc-glow); transform: translateY(-2px); }
.ua-recv:not(.on) { opacity: 0.62; }
.ua-recv-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(260px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--ua-core) 9%, transparent), transparent 65%); }
.ua-recv-ic {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  color: var(--ua-core); background: var(--ua-soft); border: 1px solid var(--ua-brd);
}
.ua-recv:not(.on) .ua-recv-ic { color: var(--ua-dim); background: transparent;
  border-color: color-mix(in srgb, var(--ua-ink) 14%, transparent); border-style: dashed; }
/* the bell rings as each pulse lands (same period as the line's pulses) */
.ua-recv-ic.ring { animation: ua-ringing var(--pd) ease-in-out infinite; transform-origin: 50% 8%; }
@keyframes ua-ringing {
  0%, 88%, 100% { transform: rotate(0); }
  91% { transform: rotate(9deg); } 94% { transform: rotate(-7deg); } 97% { transform: rotate(4deg); }
}
.ua-recv-b { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ua-recv-b header { display: flex; align-items: center; gap: 8px; }
.ua-recv-b header b { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: var(--ua-ink); }
.ua-lamp { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; padding: 2px 7px; border-radius: 5px; }
.ua-lamp.go { color: var(--ua-go); border: 1px solid color-mix(in srgb, var(--ua-go) 45%, transparent);
  animation: ua-lamp 2.6s ease-in-out infinite; }
.ua-lamp.halt { color: var(--ua-dim); border: 1px dashed color-mix(in srgb, var(--ua-ink) 22%, transparent); }
@keyframes ua-lamp { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
.ua-recv-b p { margin: 0; font-size: 11px; line-height: 1.5; color: var(--sd-text-secondary); }
.ua-evs { display: flex; flex-wrap: wrap; gap: 5px; }
.ua-ev { font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; padding: 2px 7px; border-radius: 5px;
  color: var(--ua-core); background: var(--ua-soft);
  border: 1px solid color-mix(in srgb, var(--ua-core) 30%, transparent); }
.ua-recv:not(.on) .ua-ev { color: var(--ua-dim); background: transparent;
  border-color: color-mix(in srgb, var(--ua-ink) 14%, transparent); }

/* ═══ the uplink console ═══ */
.ua-console {
  display: grid; grid-template-columns: minmax(320px, 1.2fr) minmax(280px, 1fr); gap: 16px;
  padding: 14px 16px; border-radius: 14px;
  background: var(--sd-surface-glass); border: 1px solid var(--ua-line);
  animation: ua-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both;
}
@keyframes ua-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.ua-con-l, .ua-con-r { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ua-con-lb { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--ua-core); }
.ua-con-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ua-inp {
  flex: 1; min-width: 220px; padding: 9px 12px; border-radius: 10px; font-size: 11.5px;
  color: var(--ua-ink); background: var(--sd-surface);
  border: 1px solid color-mix(in srgb, var(--ua-ink) 16%, transparent);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.ua-inp:focus { outline: none; border-color: var(--ua-brd);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ua-core) 14%, transparent); }
.ua-inp.bad { border-color: color-mix(in srgb, var(--ua-halt) 55%, transparent); }
.ua-inp::placeholder { color: var(--ua-dim); opacity: 0.7; }
.ua-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px;
  font-size: 11.5px; font-weight: 800; font-family: inherit; cursor: pointer;
  color: var(--ua-ink); background: transparent;
  border: 1px solid color-mix(in srgb, var(--ua-ink) 18%, transparent);
  transition: border-color 0.2s, color 0.2s;
}
.ua-btn:hover:not(:disabled) { border-color: var(--ua-brd); color: var(--ua-core); }
.ua-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ua-btn.primary { color: #fff; background: var(--sd-qc-grad); border: none;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ua-core) 30%, transparent); }
.ua-spin { animation: ua-spin 0.8s linear infinite; }
@keyframes ua-spin { to { transform: rotate(360deg); } }
.ua-err { margin: 0; display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px;
  letter-spacing: 0.1em; color: var(--ua-halt); }
.ua-verdict { margin: 0; display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 7px; }
.ua-verdict.go { color: var(--ua-go); border: 1px solid color-mix(in srgb, var(--ua-go) 45%, transparent);
  background: color-mix(in srgb, var(--ua-go) 8%, transparent); }
.ua-verdict.halt { color: var(--ua-halt); border: 1px solid color-mix(in srgb, var(--ua-halt) 45%, transparent);
  background: color-mix(in srgb, var(--ua-halt) 8%, transparent); }
.ua-hint { margin: 0; font-size: 10.5px; line-height: 1.5; color: var(--ua-dim); }
.ua-payload {
  margin: 0; padding: 10px 12px; border-radius: 10px; font-size: 10px; line-height: 1.6;
  white-space: pre-wrap; word-break: break-all; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--ua-line);
}
.ua-payload i { font-style: normal; font-weight: 800; color: var(--ua-core); }

@media (max-width: 900px) {
  .ua-stage { grid-template-columns: 1fr; gap: 18px; }
  .ua-line { grid-template-columns: 1fr; gap: 6px; }
  .ua-console { grid-template-columns: 1fr; }
}

/* ═══ reduced motion — a still console ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ua-core-orb::before,
  html:not([data-cinematic="on"]) .ua-core-orb .r,
  html:not([data-cinematic="on"]) .ua-seg.a,
  html:not([data-cinematic="on"]) .ua-seg.b,
  html:not([data-cinematic="on"]) .ua-recv-ic.ring,
  html:not([data-cinematic="on"]) .ua-lamp.go,
  html:not([data-cinematic="on"]) .ua-spin { animation: none; }
  html:not([data-cinematic="on"]) .ua-core,
  html:not([data-cinematic="on"]) .ua-wire,
  html:not([data-cinematic="on"]) .ua-recv,
  html:not([data-cinematic="on"]) .ua-console { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .ua-recv:hover { transform: none; }
}
</style>
