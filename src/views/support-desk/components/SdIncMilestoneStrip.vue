<template>
  <div class="mls" role="list" aria-label="Pinned milestones">
    <div class="mls-head">
      <span class="mls-eyebrow">MILESTONES</span>
      <span class="mls-count">{{ stones.length }}</span>
    </div>
    <div class="mls-rail">
      <TransitionGroup name="mls-pop">
        <button v-for="s in stones" :key="String(s.id)" type="button" class="mls-pin" role="listitem"
                :class="`sev${s.sev || 4}`" :title="`${s.ticket_number} — ${s.subject}`"
                @click="$emit('focus', s)">
          <span class="mls-star" aria-hidden="true">★</span>
          <span class="mls-at">{{ stamp(s.at) }}</span>
          <span class="mls-verb">{{ verbOf(s) }}</span>
          <span class="mls-num">{{ s.ticket_number }}</span>
          <span class="mls-unpin" title="Unpin this milestone"
                @click.stop="$emit('unpin', s)">UNPIN</span>
        </button>
      </TransitionGroup>
      <span v-if="!stones.length" class="mls-empty">
        No pinned milestones yet — pin the beats that tell the story from the stream.
      </span>
    </div>
  </div>
</template>

<script setup>
/*
  SdIncMilestoneStrip — the filter-proof spine of pinned key events. Data comes
  from the spine's independent milestones=1 fetch so pins survive every filter;
  unpin is delegated (the spine owns the optimistic verb + rollback).
*/
const props = defineProps({
  stones: { type: Array, default: () => [] },
  metaFor: { type: Function, default: null },
})
defineEmits(['focus', 'unpin'])

const stamp = (at) => {
  const d = new Date(at)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const hm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (d >= today) return hm
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${hm}`
}
const verbOf = (e) => {
  const m = props.metaFor?.(e.action)
  return m?.verb || m?.label || String(e.action || '').replace(/_/g, ' ')
}
</script>

<style scoped>
.mls { display: flex; align-items: center; gap: 14px; min-height: 40px; min-width: 0; }
.mls-head { display: flex; align-items: center; gap: 7px; flex: none; }
.mls-eyebrow {
  font: 700 9.5px/1 var(--sd-mono, monospace); letter-spacing: 2.2px;
  color: var(--sd-text-muted);
}
.mls-count {
  font: 700 10px/1 var(--sd-mono, monospace);
  color: var(--tl-hi, var(--sd-inc-hi));
  border: 1px solid color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 40%, transparent);
  border-radius: 999px; padding: 2.5px 7px;
}
.mls-rail {
  display: flex; align-items: center; gap: 8px; overflow-x: auto; min-width: 0;
  padding: 2px; scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent) transparent;
}
.mls-rail::-webkit-scrollbar { height: 5px; }
.mls-rail::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent);
  border-radius: 4px;
}
.mls-pin {
  position: relative; display: inline-flex; align-items: baseline; gap: 8px; flex: none;
  padding: 6px 12px; border-radius: 999px; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 32%, transparent);
  background: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 8%, transparent);
  color: var(--sd-text-secondary); font-size: 11.5px;
  transition: transform .2s var(--sd-spring), border-color .2s, background .2s;
}
.mls-pin:hover {
  transform: translateY(-1.5px);
  border-color: color-mix(in srgb, var(--tl-hi, var(--sd-inc-hi)) 60%, transparent);
}
.mls-pin:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.mls-pin.sev1 { border-color: color-mix(in srgb, var(--sd-pri-critical) 55%, transparent); }
.mls-star { color: var(--tl-hi, var(--sd-inc-hi)); font-size: 10px; }
.mls-at { font: 600 10px/1 var(--sd-mono, monospace); color: var(--sd-text-muted); white-space: nowrap; }
.mls-verb { font-weight: 600; color: var(--sd-text); white-space: nowrap; }
.mls-num { font: 500 10px/1 var(--sd-mono, monospace); color: var(--sd-text-dim); white-space: nowrap; }
.mls-unpin {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  border-radius: 999px; background: color-mix(in srgb, var(--sd-canvas) 78%, transparent);
  backdrop-filter: blur(3px); color: var(--sd-pri-critical);
  font: 700 9.5px/1 var(--sd-mono, monospace); letter-spacing: 2px;
}
.mls-pin:hover .mls-unpin, .mls-pin:focus-visible .mls-unpin { display: inline-flex; }
.mls-empty { font-size: 11.5px; color: var(--sd-text-dim); white-space: nowrap; }
.mls-pop-enter-active, .mls-pop-leave-active { transition: opacity .3s, transform .3s var(--sd-spring); }
.mls-pop-enter-from { opacity: 0; transform: scale(.85); }
.mls-pop-leave-to { opacity: 0; transform: scale(.85); }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .mls-pop-enter-active,
  html:not([data-cinematic="on"]) .mls-pop-leave-active { transition: none; }
}
</style>
