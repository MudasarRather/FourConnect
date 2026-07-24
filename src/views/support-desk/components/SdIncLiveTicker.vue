<template>
  <div class="tlk" :class="{ armed: live }" role="status" aria-live="polite">
    <button class="tlk-live" type="button" :title="live ? 'Live mode armed — click to disarm' : 'Arm live mode'"
            @click="$emit('toggle')">
      <span class="tlk-dot" aria-hidden="true" />
      <span class="tlk-live-lbl">{{ live ? 'LIVE' : 'PAUSED' }}</span>
    </button>

    <Transition name="tlk-pop">
      <button v-if="bufferCount" class="tlk-flush" type="button" @click="$emit('flush')">
        ▲ {{ bufferCount }} NEW {{ bufferCount === 1 ? 'EVENT' : 'EVENTS' }} — JUMP TO NOW
      </button>
    </Transition>

    <Transition name="tlk-swap" mode="out-in">
      <span v-if="latest" :key="String(latest.id)" class="tlk-line">
        <span class="tlk-at">{{ hhmm(latest.at) }}</span>
        <span class="tlk-verb">{{ verbOf(latest) }}</span>
        <span class="tlk-num">{{ latest.ticket_number }}</span>
        <span class="tlk-sub">{{ latest.subject }}</span>
      </span>
      <span v-else class="tlk-line tlk-idle">{{ live ? 'Watching the desk — arrivals surface here.' : 'Live mode off — the desk refreshes each minute.' }}</span>
    </Transition>
  </div>
</template>

<script setup>
/*
  SdIncLiveTicker — the timeline desks' buffered-arrival strip. The spine's
  live mode parks since-cursor arrivals in a buffer; this strip announces the
  count (aria-live) and hands the flush back to the host. Palette rides the
  host-set --tl-* tokens so one ticker serves both desk identities.
*/
const props = defineProps({
  bufferCount: { type: Number, default: 0 },
  latest: { type: Object, default: null },       // newest buffered/flushed event
  live: { type: Boolean, default: false },
  metaFor: { type: Function, default: null },
})
defineEmits(['flush', 'toggle'])

const hhmm = (at) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const verbOf = (e) => {
  const m = props.metaFor?.(e.action)
  return m?.verb || m?.label || String(e.action || '').replace(/_/g, ' ')
}
</script>

<style scoped>
.tlk {
  display: flex; align-items: center; gap: 12px; min-height: 34px;
  padding: 5px 12px; border: 1px solid var(--tl-brd, var(--sd-border));
  border-radius: 10px; background: color-mix(in srgb, var(--sd-surface) 72%, transparent);
  backdrop-filter: blur(8px); overflow: hidden;
}
.tlk-live {
  display: inline-flex; align-items: center; gap: 7px; border: 0; cursor: pointer;
  background: transparent; padding: 3px 6px; border-radius: 7px;
  font: 600 10px/1 var(--sd-mono, monospace); letter-spacing: 1.6px;
  color: var(--sd-text-muted);
}
.tlk.armed .tlk-live { color: var(--tl-core, var(--sd-inc-core)); }
.tlk-live:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.tlk-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-text-dim); transition: background .3s;
}
.tlk.armed .tlk-dot {
  background: var(--tl-core, var(--sd-inc-core));
  animation: tlk-pulse 1.8s ease-in-out infinite;
}
@keyframes tlk-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent); }
  50% { box-shadow: 0 0 0 5px transparent; }
}
.tlk-flush {
  border: 1px solid color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent);
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 12%, transparent);
  color: var(--tl-core, var(--sd-inc-core)); cursor: pointer; white-space: nowrap;
  padding: 4px 11px; border-radius: 999px;
  font: 700 10px/1 var(--sd-mono, monospace); letter-spacing: 1.2px;
  transition: transform .18s var(--sd-spring), background .18s;
}
.tlk-flush:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 20%, transparent); }
.tlk-flush:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.tlk-line {
  display: inline-flex; align-items: baseline; gap: 9px; min-width: 0;
  font-size: 12px; color: var(--sd-text-secondary);
}
.tlk-at { font: 600 10.5px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); }
.tlk-verb { font-weight: 600; color: var(--tl-core, var(--sd-inc-core)); white-space: nowrap; }
.tlk-num { font: 600 10.5px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); white-space: nowrap; }
.tlk-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tlk-idle { color: var(--sd-text-dim); font-size: 11.5px; }
.tlk-pop-enter-active, .tlk-pop-leave-active { transition: opacity .25s, transform .25s var(--sd-spring); }
.tlk-pop-enter-from, .tlk-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(.96); }
.tlk-swap-enter-active, .tlk-swap-leave-active { transition: opacity .3s, transform .3s var(--sd-spring); }
.tlk-swap-enter-from { opacity: 0; transform: translateY(8px); }
.tlk-swap-leave-to { opacity: 0; transform: translateY(-8px); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tlk-dot { animation: none; }
  html:not([data-cinematic="on"]) .tlk-swap-enter-active,
  html:not([data-cinematic="on"]) .tlk-swap-leave-active,
  html:not([data-cinematic="on"]) .tlk-pop-enter-active,
  html:not([data-cinematic="on"]) .tlk-pop-leave-active { transition: none; }
}
</style>
