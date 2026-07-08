<template>
  <Motion as="section" class="tpp sd-card" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
    <div class="tpp-head">
      <span class="tpp-ic"><Orbit :size="15" /></span>
      <div class="tpp-t">
        <b>The tipping point</b>
        <i class="sd-mono">STILL ON TIME · DUE ≤ 2H · CATCH THEM BEFORE THEY FALL IN</i>
      </div>
      <span class="tpp-right">
        <span v-if="imminentCount" class="tpp-imm sd-mono"><i aria-hidden="true" />{{ imminentCount }} IMMINENT ≤30m</span>
        <span class="tpp-n sd-mono">{{ tickets.length }} on the edge</span>
      </span>
    </div>

    <div v-if="tickets.length" class="tpp-lane">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="button" class="tpp-cap"
        :class="{ imm: remainMs(t) <= IMM_MS }" :title="t.subject"
        :initial="{ opacity: 0, scale: 0.92, y: 10 }" :animate="{ opacity: 1, scale: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.16 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -4, scale: 1.02 }" :while-tap="{ scale: 0.96 }"
        @click="$emit('open', t.id)">
        <!-- draining orbit ring — the ticket's remaining margin, live -->
        <span class="tc-ring" aria-hidden="true">
          <svg viewBox="0 0 44 44">
            <circle class="tc-track" cx="22" cy="22" r="18" />
            <circle class="tc-fill" cx="22" cy="22" r="18"
              :stroke-dasharray="CIRC" :stroke-dashoffset="CIRC * (1 - remainFrac(t))" />
          </svg>
          <span class="tc-clock sd-mono">{{ countdown(t) }}</span>
        </span>
        <span class="tc-body">
          <span class="tc-no sd-mono">{{ t.ticket_number }}</span>
          <span class="tc-subj">{{ t.subject }}</span>
          <span class="tc-meta sd-mono">
            <em :style="{ color: priColor(t) }">{{ (t.priority || '').toUpperCase() }}</em>
            <span>{{ t.assigned_agent_name || 'UNOWNED' }}</span>
          </span>
        </span>
      </Motion>
    </div>
    <p v-else class="tpp-empty sd-mono">EDGE CLEAR — NOTHING IS WITHIN 2 HOURS OF FALLING IN</p>
  </Motion>
</template>

<script setup>
/* SdTippingPoint — the Overdue desk's incoming-pressure strip (backend scope=due_soon).
   These tickets are NOT overdue yet: each capsule carries a live draining orbit-ring
   (remaining margin over the 2h window) + a live countdown; ≤30m pulses rose. Click →
   drawer, so the save lands before the ticket ever enters the well. Deliberately a
   different organism from the Breached desk's fuse-bar rail. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Orbit } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open'])

const WINDOW_MS = 2 * 60 * 60 * 1000
const IMM_MS = 30 * 60 * 1000
const CIRC = 2 * Math.PI * 18

const ep = (v) => (v ? new Date(v).getTime() : 0)
const remainMs = (t) => Math.max(0, ep(t.resolution_due_at) - props.now)
const remainFrac = (t) => Math.min(1, remainMs(t) / WINDOW_MS)
const countdown = (t) => {
  const s = Math.floor(remainMs(t) / 1000)
  if (s >= 3600) return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const imminentCount = computed(() => props.tickets.filter(t => remainMs(t) <= IMM_MS).length)
const PRI = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priColor = (t) => PRI[t.priority] || 'var(--sd-text-dim)'
</script>

<style scoped>
.tpp { padding: 14px 16px 15px; border-color: color-mix(in srgb, var(--sd-ovd-risk) 30%, var(--sd-border)); }
.tpp-head { display: flex; align-items: center; gap: 10px; }
.tpp-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  color: var(--sd-ovd-risk); background: var(--sd-ovd-risk-soft); }
.tpp-t { display: flex; flex-direction: column; gap: 2px; }
.tpp-t b { font-size: 13.5px; font-weight: 750; color: var(--sd-text); }
.tpp-t i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tpp-right { margin-left: auto; display: inline-flex; align-items: center; gap: 12px; }
.tpp-imm { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-ovd-core); }
.tpp-imm i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-ovd-core); animation: tpp-blip 1.3s ease-out infinite; }
.tpp-n { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-text-dim); }

.tpp-lane { display: flex; gap: 10px; overflow-x: auto; padding: 12px 2px 4px; scrollbar-width: thin; }
.tpp-cap { flex: 0 0 auto; display: flex; align-items: center; gap: 11px; width: 264px; text-align: left;
  padding: 9px 12px 9px 9px; border-radius: 999px; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text);
  transition: border-color 0.2s, box-shadow 0.2s; }
.tpp-cap:hover { border-color: var(--sd-ovd-risk); box-shadow: 0 10px 26px -14px var(--sd-ovd-risk); }
.tpp-cap.imm { border-color: color-mix(in srgb, var(--sd-ovd-core) 55%, transparent); }
.tpp-cap.imm:hover { border-color: var(--sd-ovd-core); box-shadow: 0 10px 26px -14px var(--sd-ovd-core); }

.tc-ring { position: relative; flex-shrink: 0; width: 44px; height: 44px; }
.tc-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.tc-track { fill: none; stroke: color-mix(in srgb, var(--sd-text-dim) 30%, transparent); stroke-width: 3; }
.tc-fill { fill: none; stroke: var(--sd-ovd-risk); stroke-width: 3; stroke-linecap: round;
  transition: stroke-dashoffset 1s linear; }
.tpp-cap.imm .tc-fill { stroke: var(--sd-ovd-core); }
.tc-clock { position: absolute; inset: 0; display: grid; place-items: center; font-size: 8.5px; font-weight: 800;
  color: var(--sd-text); font-variant-numeric: tabular-nums; }
.tpp-cap.imm .tc-clock { color: var(--sd-ovd-core); animation: tpp-throb 1.3s ease-in-out infinite; }

.tc-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tc-no { font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-ovd-risk); }
.tpp-cap.imm .tc-no { color: var(--sd-ovd-core); }
.tc-subj { font-size: 12px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-meta { display: flex; gap: 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.tc-meta em { font-style: normal; }

.tpp-empty { margin: 12px 2px 2px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-ovd-escape); }

@keyframes tpp-blip { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-ovd-core) 55%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }
@keyframes tpp-throb { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tpp-imm i, html:not([data-cinematic="on"]) .tpp-cap.imm .tc-clock { animation: none; }
  html:not([data-cinematic="on"]) .tc-fill { transition: none; }
}
</style>
