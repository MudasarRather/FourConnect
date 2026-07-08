<template>
  <Motion as="section" class="arr sd-card" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
    <div class="arr-head">
      <span class="arr-ic"><ShieldAlert :size="15" /></span>
      <div class="arr-t">
        <b>Prevent the next breach</b>
        <i class="sd-mono">RESOLUTION DUE ≤ 2H · CLOCK RUNNING</i>
      </div>
      <span class="arr-right">
        <span v-if="imminentCount" class="arr-imm sd-mono"><i aria-hidden="true" />{{ imminentCount }} IMMINENT ≤30m</span>
        <span class="arr-n sd-mono">{{ tickets.length }} in the window</span>
      </span>
    </div>

    <div v-if="tickets.length" class="arr-lane">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="button" class="arr-chip"
        :class="{ imm: isImminent(t) }" :title="t.subject"
        :initial="{ opacity: 0, x: 24 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }"
        @click="$emit('open', t.id)">
        <span class="ac-clock sd-mono">{{ countdown(t) }}</span>
        <span class="ac-body">
          <span class="ac-no sd-mono">{{ t.ticket_number }}</span>
          <span class="ac-subj">{{ t.subject }}</span>
        </span>
        <span class="ac-who" :class="{ none: !t.assigned_agent_name }">{{ initials(t.assigned_agent_name) }}</span>
        <span class="ac-fuse" :style="{ '--w': fusePct(t) + '%' }" aria-hidden="true" />
      </Motion>
    </div>
    <p v-else class="arr-empty sd-mono">FRONTIER CLEAR — NOTHING IS WITHIN 2 HOURS OF ITS TARGET</p>
  </Motion>
</template>

<script setup>
/* SdAtRiskRail — the "prevent the NEXT breach" strip (Breached desk). Live tickets whose
   resolution target is inside the 2h window (backend scope=due_soon, clock running).
   Each chip carries a live countdown + a burning fuse bar; imminent (≤30m) pulses crimson.
   Click → drawer, so the save happens before the meter ever rolls. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ShieldAlert } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // scope=due_soon rows, due asc
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open'])

const ep = (v) => (v ? new Date(v).getTime() : 0)
const remainMs = (t) => Math.max(0, ep(t.resolution_due_at) - props.now)
const isImminent = (t) => remainMs(t) <= 30 * 60000
const imminentCount = computed(() => props.tickets.filter(isImminent).length)
const countdown = (t) => {
  const s = Math.floor(remainMs(t) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}
/* fuse = how much of the 2h window is already burnt */
const fusePct = (t) => Math.min(100, Math.max(2, Math.round(100 * (1 - remainMs(t) / (2 * 3600000)))))
const initials = (n) => n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
</script>

<style scoped>
.arr { padding: 13px 15px 14px; border-color: color-mix(in srgb, var(--sd-brc-risk) 32%, var(--sd-border)); }
.arr-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.arr-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px;
  color: var(--sd-brc-risk); background: var(--sd-brc-risk-soft); }
.arr-t { display: flex; flex-direction: column; gap: 1px; }
.arr-t b { font-size: 13px; font-weight: 800; color: var(--sd-text); }
.arr-t i { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.arr-right { display: inline-flex; align-items: center; gap: 10px; margin-left: auto; }
.arr-imm { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-brc-core);
  border: 1px solid color-mix(in srgb, var(--sd-brc-core) 50%, transparent); background: var(--sd-brc-soft); }
.arr-imm i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-brc-core); animation: arr-blip 1.2s ease-out infinite; }
.arr-n { font-size: 10.5px; font-weight: 700; color: var(--sd-text-dim); }

.arr-lane { display: flex; gap: 10px; overflow-x: auto; padding: 12px 2px 4px; scrollbar-width: thin; }
.arr-chip { position: relative; overflow: hidden; flex: 0 0 auto; display: flex; align-items: center; gap: 10px;
  min-width: 240px; max-width: 300px; padding: 10px 12px 13px; border-radius: 13px; cursor: pointer; text-align: left;
  border: 1px solid color-mix(in srgb, var(--sd-brc-risk) 40%, var(--sd-border-strong));
  background: var(--sd-surface-glass); color: var(--sd-text); font-family: inherit; }
.arr-chip.imm { border-color: color-mix(in srgb, var(--sd-brc-core) 60%, transparent);
  background: color-mix(in srgb, var(--sd-brc-core) 7%, var(--sd-surface-glass));
  animation: arr-imm-throb 2s ease-in-out infinite; }
.ac-clock { flex-shrink: 0; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--sd-brc-risk); }
.arr-chip.imm .ac-clock { color: var(--sd-brc-core); }
.ac-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ac-no { font-size: 9.5px; font-weight: 800; color: var(--sd-text-dim); }
.ac-subj { font-size: 12px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ac-who { flex-shrink: 0; margin-left: auto; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  font-size: 9px; font-weight: 800; color: #fff; background: var(--sd-grad-rail); }
.ac-who.none { background: var(--sd-surface-glass); color: var(--sd-text-dim); border: 1px dashed var(--sd-border-strong); }
/* the burning fuse — width = share of the 2h window already gone */
.ac-fuse { position: absolute; left: 0; bottom: 0; height: 3px; width: var(--w); border-radius: 0 99px 99px 0;
  background: linear-gradient(90deg, var(--sd-brc-risk), var(--sd-brc-core)); transition: width 1s linear; }
.ac-fuse::after { content: ""; position: absolute; right: -2px; top: 50%; transform: translateY(-50%);
  width: 6px; height: 6px; border-radius: 50%; background: var(--sd-brc-core);
  box-shadow: 0 0 8px 1px var(--sd-brc-core); animation: arr-spark 0.8s ease-in-out infinite alternate; }

.arr-empty { margin: 12px 2px 2px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-brc-repair); }

@keyframes arr-blip { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-brc-core) 55%, transparent); } 100% { box-shadow: 0 0 0 8px transparent; } }
@keyframes arr-imm-throb { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 18px -6px var(--sd-brc-core); } }
@keyframes arr-spark { from { opacity: 0.55; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .arr-imm i, html:not([data-cinematic="on"]) .arr-chip.imm,
  html:not([data-cinematic="on"]) .ac-fuse::after { animation: none; }
}
</style>
