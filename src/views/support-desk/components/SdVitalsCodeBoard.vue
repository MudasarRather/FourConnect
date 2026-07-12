<template>
  <section class="qcb sd-card">
    <header class="qcb-head">
      <span class="qcb-title sd-mono"><Siren :size="12" /> BREACH HORIZON · <b>NEXT SLA DEADLINES</b></span>
      <span class="qcb-sub sd-mono" :class="{ hot: !items.length && breachedNow }">
        {{ items.length ? `${items.length} ON WATCH` : (breachedNow ? `${breachedNow} ALREADY BREACHED` : 'ALL QUIET') }}</span>
    </header>

    <TransitionGroup name="qcb-row" tag="div" class="qcb-list">
      <button v-for="(it, i) in items" :key="it.id" class="qcb-row" :style="{ '--i': i }"
        :title="`Open the ${it.queue_name || 'lane'} desk — ${it.subject}`" @click="$emit('open', it)">
        <span class="qcb-heart" :class="urgency(it)" aria-hidden="true" />
        <span class="qcb-body">
          <span class="qcb-subj">{{ it.ticket_number }} · {{ it.subject }}</span>
          <span class="qcb-meta sd-mono">{{ (it.queue_name || '—').toUpperCase() }} · {{ it.priority.toUpperCase() }} ·
            {{ it.kind === 'response' ? 'FIRST RESPONSE DUE' : 'RESOLUTION DUE' }}</span>
        </span>
        <span class="qcb-cd sd-mono" :class="urgency(it)">{{ fmt(remaining(it)) }}</span>
      </button>
    </TransitionGroup>

    <div v-if="!items.length" class="qcb-empty">
      <HeartPulse :size="22" />
      <p v-if="breachedNow">Nothing is <em>about to</em> breach — but {{ breachedNow }} ticket{{ breachedNow === 1 ? ' has' : 's have' }}
        <b>already breached</b> and still need working. Use the <b>Breached</b> lens above.</p>
      <p v-else>No SLA clocks are running inside the horizon. New tickets with SLA targets will
        surface here with a live countdown before they breach.</p>
      <button v-if="breachedNow" class="qcb-cta sd-mono" @click="$emit('lens', 'breached')">SHOW BREACHED</button>
    </div>
  </section>
</template>

<script setup>
/* SdVitalsCodeBoard — the breach horizon as an ER code board: the fleet's next SLA
   deadlines with LIVE second-by-second countdowns, a beating heart whose tempo is the
   urgency, and click-through to the owning lane's tier desk. Fed by the overview's
   `breach_horizon` block (unbreached, unpaused, team-sealed). */
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Siren, HeartPulse } from 'lucide-vue-next'

const props = defineProps({
  items: { type: Array, default: () => [] },   // overview.breach_horizon
  breachedNow: { type: Number, default: 0 },   // totals.breached — explains an empty horizon
  generatedAt: { type: String, default: null },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'lens'])

/* live clock — countdowns anchor on due_at so they stay truthful between polls */
const nowMs = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { nowMs.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))

const remaining = (it) => {
  const due = Date.parse(it.due_at)
  return Number.isFinite(due) ? Math.max(0, Math.floor((due - nowMs.value) / 1000)) : (it.due_in_seconds || 0)
}
const urgency = (it) => {
  const s = remaining(it)
  return s <= 15 * 60 ? 'red' : s <= 60 * 60 ? 'warn' : 'ok'
}
const fmt = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`
}
</script>

<style scoped>
.qcb { border-radius: 16px; overflow: hidden; }
.qcb-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 13px 16px; border-bottom: 1px solid var(--sd-border); }
.qcb-title { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; letter-spacing: 0.18em;
  font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; }
.qcb-title b { color: var(--sd-qv-core); }
.qcb-sub { font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.qcb-list { display: flex; flex-direction: column; }
.qcb-row { display: flex; align-items: center; gap: 12px; padding: 11px 16px; text-align: left; width: 100%;
  cursor: pointer; font-family: inherit; border: none; background: transparent;
  border-bottom: 1px solid var(--sd-border); transition: background 0.15s;
  animation: qcb-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.06s); }
.qcb-row:last-child { border-bottom: none; }
.qcb-row:hover { background: color-mix(in srgb, var(--sd-qv-core) 6%, transparent); }
.qcb-heart { width: 13px; height: 13px; flex: none;
  clip-path: path('M6.5 11.7 1.6 6.8a3.2 3.2 0 0 1 4.5-4.5l.4.4.4-.4a3.2 3.2 0 1 1 4.5 4.5Z'); }
.qcb-heart.red { background: var(--sd-qv-halt); animation: qcb-beat 1.1s ease-in-out infinite; }
.qcb-heart.warn { background: var(--sd-qv-warn); animation: qcb-beat 1.9s ease-in-out infinite; }
.qcb-heart.ok { background: var(--sd-qv-go); animation: qcb-beat 2.7s ease-in-out infinite; }
.qcb-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.qcb-subj { font-size: 12px; font-weight: 700; color: var(--sd-text); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.qcb-meta { font-size: 9px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.qcb-cd { flex: none; font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.qcb-cd.red { color: var(--sd-qv-halt); animation: qcb-blink 1.2s steps(2, end) infinite; }
.qcb-cd.warn { color: var(--sd-qv-warn); }
.qcb-cd.ok { color: var(--sd-qv-go); }
.qcb-empty { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 26px 18px;
  color: var(--sd-text-dim); text-align: center; }
.qcb-empty p { margin: 0; font-size: 11.5px; max-width: 42ch; }
.qcb-empty p b { color: var(--sd-qv-halt); }
.qcb-empty p em { font-style: italic; }
.qcb-sub.hot { color: var(--sd-qv-halt); font-weight: 800; }
.qcb-cta { padding: 6px 13px; border-radius: 9px; font-size: 9px; letter-spacing: 0.14em; font-weight: 800;
  cursor: pointer; font-family: inherit; color: var(--sd-qv-halt);
  border: 1px solid color-mix(in srgb, var(--sd-qv-halt) 55%, transparent); background: transparent;
  transition: background 0.2s, transform 0.2s; }
.qcb-cta:hover { background: var(--sd-qv-halt-soft); transform: translateY(-1px); }

.qcb-row-enter-active, .qcb-row-leave-active { transition: opacity 0.3s, transform 0.3s; }
.qcb-row-enter-from, .qcb-row-leave-to { opacity: 0; transform: translateY(8px); }

@keyframes qcb-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qcb-beat { 0%, 100% { transform: scale(1); } 14% { transform: scale(1.28); } 28% { transform: scale(1); } }
@keyframes qcb-blink { 50% { opacity: 0.3; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qcb-row,
  html:not([data-cinematic="on"]) .qcb-heart,
  html:not([data-cinematic="on"]) .qcb-cd.red { animation: none; }
}
</style>
