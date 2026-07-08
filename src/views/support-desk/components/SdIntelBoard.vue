<template>
  <!-- The Solari departures board — the Concourse's signature instrument.
       A black machine bolted to the hall wall: every queue is a departure row,
       loads live on split-flap cells, statuses read BOARDING / DELAYED / FINAL CALL. -->
  <div class="sd-board" role="table" aria-label="Support queues departures board">
    <div class="sd-board-glow" aria-hidden="true" />
    <div class="sd-board-head" role="row">
      <span class="bh queue" role="columnheader">Queue</span>
      <span class="bh" role="columnheader">Load</span>
      <span class="bh gate" role="columnheader">Gate</span>
      <span class="bh sla" role="columnheader">SLA</span>
      <span class="bh status" role="columnheader">Status</span>
    </div>

    <button
      v-for="(r, i) in rows"
      :key="r.key"
      type="button"
      class="sd-board-row"
      role="row"
      :style="{ '--i': i }"
      @click="$emit('go', r.tab)"
    >
      <span class="bc dest" role="cell">{{ r.dest }}</span>
      <span class="bc" role="cell">
        <SdIntelFlap :value="r.load" :min-cells="3" size="md" :tone="r.loadTone || ''" :boot-delay="200 + i * 110" />
      </span>
      <span class="bc gate sd-mono" role="cell">{{ r.gate }}</span>
      <span class="bc sla sd-mono" role="cell" :class="slaTone(r.sla)">{{ r.sla == null ? '—' : r.sla + '%' }}</span>
      <span class="bc status" role="cell">
        <span class="st" :class="[r.status.tone, { blink: r.status.blink }]">{{ r.status.label }}</span>
      </span>
    </button>

    <div v-if="!rows.length" class="sd-board-empty sd-mono">{{ loading ? 'BOARD WARMING UP…' : 'NO SCHEDULED SERVICES' }}</div>
  </div>
</template>

<script setup>
import SdIntelFlap from './SdIntelFlap.vue'

defineProps({
  /* [{ key, dest, load, loadTone, gate, sla, status: { label, tone: 'up'|'dn'|'amber'|'dim', blink }, tab }] */
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
defineEmits(['go'])

const slaTone = (v) => (v == null ? 'mute' : v >= 90 ? 'ok' : v >= 70 ? 'warn' : 'bad')
</script>

<style scoped>
.sd-board {
  position: relative; border-radius: 16px; overflow: hidden;
  background: linear-gradient(180deg, var(--intel-board-2), var(--intel-board));
  border: 1px solid rgba(244, 239, 227, 0.09);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 22px 48px rgba(0, 0, 0, 0.4);
  padding: 6px 6px 8px;
}
.sd-board-glow { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(90% 60% at 50% -10%, color-mix(in srgb, var(--intel-sig) 9%, transparent), transparent 62%); }

/* Everything painted ON the board uses the signage constants — the board stays a
   black machine in light mode, so the darkened light-theme hall tokens would go
   illegible here (the bug the first light pass shipped with). */
.sd-board { --intel: var(--intel-sig); --intel-up: var(--intel-sig-up); --intel-dn: var(--intel-sig-dn); }

.sd-board-head, .sd-board-row {
  display: grid; grid-template-columns: minmax(150px, 1.6fr) auto 64px 64px minmax(112px, 0.9fr);
  align-items: center; gap: 12px; width: 100%;
}
.sd-board-head { padding: 10px 14px 8px; }
.bh { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.26em;
  text-transform: uppercase; color: var(--intel); opacity: 0.85; text-align: left; }
.bh.gate, .bh.sla { text-align: center; }
.bh.status { text-align: right; }

.sd-board-row {
  position: relative; padding: 9px 14px; border: 0; border-top: 1px solid var(--intel-board-line);
  background: transparent; cursor: pointer; text-align: left; border-radius: 9px;
  transition: background 0.18s;
  animation: sd-board-row-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.07s);
}
.sd-board-row:hover { background: rgba(244, 239, 227, 0.045); }
.sd-board-row:focus-visible { outline: 2px solid var(--intel); outline-offset: -2px; }
@keyframes sd-board-row-in { from { opacity: 0; transform: translateY(10px); } }

.bc.dest { font-family: var(--sd-mono); font-size: 12.5px; font-weight: 600; letter-spacing: 0.08em;
  color: var(--intel-board-txt); text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc.gate { text-align: center; font-size: 12px; font-weight: 700; color: var(--intel); }
.bc.sla { text-align: center; font-size: 12px; font-weight: 700; }
.bc.sla.ok { color: var(--intel-up); } .bc.sla.warn { color: var(--intel); }
.bc.sla.bad { color: var(--intel-dn); } .bc.sla.mute { color: var(--intel-board-dim); }
.bc.status { display: flex; justify-content: flex-end; }

.st { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  padding: 4px 10px; border-radius: 5px; white-space: nowrap; }
.st.up { color: var(--intel-up); background: color-mix(in srgb, var(--intel-up) 13%, transparent); }
.st.dn { color: var(--intel-dn); background: color-mix(in srgb, var(--intel-dn) 13%, transparent); }
.st.amber { color: var(--intel); background: color-mix(in srgb, var(--intel) 13%, transparent); }
.st.dim { color: var(--intel-board-dim); background: rgba(244, 239, 227, 0.06); }
.st.blink { animation: sd-board-blink 1.25s steps(2, jump-none) infinite; }
@keyframes sd-board-blink { 50% { opacity: 0.35; } }

.sd-board-empty { padding: 26px 14px; text-align: center; color: var(--intel-board-dim);
  font-size: 11px; letter-spacing: 0.2em; }

@media (max-width: 760px) {
  .sd-board-head, .sd-board-row { grid-template-columns: minmax(110px, 1.4fr) auto 54px minmax(92px, 0.9fr); }
  .bh.gate, .bc.gate { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-board-row { animation: none; }
  html:not([data-cinematic="on"]) .st.blink { animation: none; }
}
</style>
