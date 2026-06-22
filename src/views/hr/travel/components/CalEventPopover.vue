<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="event" as="div" class="cep" :style="posStyle" :key="event.id"
        :initial="{ opacity: 0, y: place === 'above' ? 8 : -8, scale: 0.94 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, scale: 0.96 }"
        :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }" aria-hidden="true">
        <span class="cep-spine" :style="{ '--c': sm.hex }" aria-hidden="true" />
        <header class="cep-head">
          <span class="cep-ref trv-mono">{{ event.travel_reference_number }}</span>
          <span class="cep-status" :style="{ '--c': sm.hex }"><component :is="sm.icon" :size="11" /> {{ sm.label }}</span>
        </header>

        <div class="cep-trav">
          <span class="cep-ico" :style="{ '--c': sm.hex }"><component :is="typeIcon" :size="15" /></span>
          <div class="cep-tx">
            <b>{{ event.employee_name || 'Traveller' }}</b>
            <small>{{ event.department || '—' }} · {{ event.travel_type }}</small>
          </div>
        </div>

        <!-- flight arc -->
        <div class="cep-arc">
          <span class="cep-port"><b class="trv-mono">{{ fromCode }}</b><small>{{ event.from_location }}</small></span>
          <svg class="cep-arc-svg" viewBox="0 0 120 38" preserveAspectRatio="none" aria-hidden="true">
            <path class="cep-arc-line" d="M6,32 Q60,-6 114,32" :style="{ stroke: sm.hex }" />
            <circle class="cep-arc-d0" cx="6" cy="32" r="3" :style="{ fill: sm.hex }" />
            <circle class="cep-arc-d1" cx="114" cy="32" r="3" :style="{ fill: sm.hex }" />
            <g class="cep-arc-plane" :style="{ color: sm.hex }">
              <path d="M0,-3 L7,0 L0,3 L2,0 Z" transform="translate(60,5)" fill="currentColor" />
            </g>
          </svg>
          <span class="cep-port end"><b class="trv-mono">{{ toCode }}</b><small>{{ event.to_location }}</small></span>
        </div>

        <div class="cep-meta">
          <div class="cep-m"><PlaneTakeoff :size="12" /><div><span>Departs</span><b>{{ fmtDate(event.departure_date) }}</b></div></div>
          <div class="cep-m"><PlaneLanding :size="12" /><div><span>Returns</span><b>{{ fmtDate(event.return_date) }}</b></div></div>
          <div class="cep-m"><Clock :size="12" /><div><span>Duration</span><b>{{ days }} day{{ days === 1 ? '' : 's' }}</b></div></div>
          <div class="cep-m"><Flag :size="12" /><div><span>Priority</span><b :style="{ color: pm.hex }">{{ pm.label }}</b></div></div>
        </div>

        <footer class="cep-foot"><MousePointerClick :size="11" /> Click to open the full tour</footer>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { PlaneTakeoff, PlaneLanding, Clock, Flag, MousePointerClick, Plane } from 'lucide-vue-next'
import { statusMeta, priorityMeta, airportCode, fmtDate, TRAVEL_TYPES } from '@/composables/useTravel'

const props = defineProps({
  event: { type: Object, default: null },
  anchor: { type: Object, default: null },   // DOMRect of the trigger
})

const sm = computed(() => statusMeta(props.event?.status))
const pm = computed(() => priorityMeta(props.event?.priority))
const typeIcon = computed(() => TRAVEL_TYPES.find(t => t.key === props.event?.travel_type)?.icon || Plane)
const fromCode = computed(() => airportCode(props.event?.from_location))
const toCode = computed(() => airportCode(props.event?.to_location))
const days = computed(() => {
  const e = props.event
  if (!e?.departure_date || !e?.return_date) return 1
  const d = Math.round((new Date(e.return_date) - new Date(e.departure_date)) / 86400000) + 1
  return d > 0 ? d : 1
})

const W = 290, EST_H = 268
const place = computed(() => {
  const a = props.anchor
  if (!a) return 'below'
  return (a.bottom + EST_H + 14 > window.innerHeight && a.top > EST_H + 14) ? 'above' : 'below'
})
const posStyle = computed(() => {
  const a = props.anchor
  if (!a) return { display: 'none' }
  const vw = window.innerWidth
  let left = a.left + a.width / 2 - W / 2
  left = Math.max(12, Math.min(left, vw - W - 12))
  const top = place.value === 'above' ? a.top - EST_H - 10 : a.bottom + 10
  return { position: 'fixed', left: left + 'px', top: Math.max(12, top) + 'px', width: W + 'px' }
})
</script>

<style scoped>
.cep { z-index: 5300; pointer-events: none; overflow: hidden; padding: 14px 15px 11px; border-radius: 16px;
  background: var(--trv-surface-glass); border: 1px solid var(--trv-border-strong);
  box-shadow: 0 28px 70px -18px rgba(0,0,0,0.75), 0 0 0 1px rgba(251,191,36,0.05);
  backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%); }
[data-theme="light"] .cep { background: rgba(255,250,240,0.97); box-shadow: 0 28px 70px -18px rgba(60,40,15,0.3); }
.cep-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: var(--c); box-shadow: 0 0 12px -1px var(--c); }

.cep-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 11px; }
.cep-ref { font-size: 11px; font-weight: 700; color: var(--trv-text); letter-spacing: 0.03em; }
.cep-status { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: var(--c); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }

.cep-trav { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.cep-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.cep-tx { min-width: 0; }
.cep-tx b { display: block; font-size: 13px; font-weight: 750; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cep-tx small { font-size: 10.5px; color: var(--trv-text-muted); }

.cep-arc { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 7px; margin-bottom: 12px; }
.cep-port { display: flex; flex-direction: column; }
.cep-port.end { text-align: right; }
.cep-port b { font-size: 14px; font-weight: 800; color: var(--trv-text); line-height: 1; }
.cep-port small { font-size: 8.5px; color: var(--trv-text-dim); max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cep-port.end small { align-self: flex-end; }
.cep-arc-svg { width: 100%; height: 34px; overflow: visible; }
.cep-arc-line { fill: none; stroke-width: 1.6; stroke-dasharray: 140; stroke-dashoffset: 140; stroke-linecap: round; opacity: 0.85; animation: cep-draw 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) forwards; }
.cep-arc-d0, .cep-arc-d1 { opacity: 0; animation: cep-pop 0.3s forwards; }
.cep-arc-d0 { animation-delay: 0.1s; } .cep-arc-d1 { animation-delay: 0.7s; }
.cep-arc-plane { opacity: 0; offset-path: path('M6,32 Q60,-6 114,32'); animation: cep-fly 0.8s 0.15s cubic-bezier(0.4,0,0.3,1) forwards; }
@keyframes cep-draw { to { stroke-dashoffset: 0; } }
@keyframes cep-pop { to { opacity: 1; } }
@keyframes cep-fly { 0% { opacity: 0; offset-distance: 0%; } 20% { opacity: 1; } 100% { opacity: 0.9; offset-distance: 100%; } }

.cep-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; padding-top: 11px; border-top: 1px solid var(--trv-border); }
.cep-m { display: flex; align-items: center; gap: 7px; }
.cep-m :deep(svg) { color: var(--trv-text-dim); flex-shrink: 0; }
.cep-m span { display: block; font-size: 8.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-dim); }
.cep-m b { display: block; font-size: 11px; font-weight: 700; color: var(--trv-text); }
.cep-foot { display: flex; align-items: center; gap: 5px; margin-top: 11px; font-size: 9.5px; color: var(--trv-text-dim); }
.cep-foot :deep(svg) { color: var(--trv-amber); }

@media (prefers-reduced-motion: reduce) {
  .cep-arc-line { stroke-dashoffset: 0; animation: none; }
  .cep-arc-d0, .cep-arc-d1 { opacity: 1; animation: none; }
  .cep-arc-plane { opacity: 0.9; offset-distance: 100%; animation: none; }
}
</style>
