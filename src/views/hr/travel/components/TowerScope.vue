<template>
  <div ref="scopeEl" class="scope" :class="{ idle: !items.length }">
    <!-- square radar stage — keeps the dish circular and contains the blips/tooltip -->
    <div class="scope-stage">
      <!-- ambient -->
      <span class="scope-grad" aria-hidden="true" />

      <!-- the radar dish -->
      <div class="dish" aria-hidden="true">
        <!-- range rings -->
        <span v-for="r in 3" :key="'r' + r" class="ring" :style="{ inset: (r - 1) * 16.5 + '%' }" />
        <!-- bearing ticks -->
        <span v-for="t in 12" :key="'t' + t" class="tick" :style="{ transform: `rotate(${t * 30}deg)` }" />
        <!-- crosshair -->
        <span class="cross h" /><span class="cross v" />
        <!-- rotating sweep -->
        <span class="sweep" />
        <!-- center tower -->
        <span class="tower"><TowerControl :size="15" /></span>
        <span class="tower-ping" />
      </div>

      <!-- plotted inbound blips -->
      <button
        v-for="b in blips" :key="b.id" type="button"
        class="blip" :class="{ mine: b.mine, urgent: b.urgent, hot: hoverId === b.id }"
        :style="{ left: b.x + '%', top: b.y + '%', '--d': b.delay + 's' }"
        @mouseenter="hoverId = b.id" @mouseleave="hoverId = null"
        @click="$emit('focus', b.id)"
      >
        <span class="blip-core" />
        <span class="blip-halo" />
      </button>

      <!-- hover read-out -->
      <Transition name="scope-tip">
        <div v-if="hovered" class="scope-tip" :style="tipStyle">
          <span class="tip-ref trv-mono">{{ hovered.ref }}</span>
          <span class="tip-route trv-mono">{{ hovered.from }} → {{ hovered.to }}</span>
          <span class="tip-meta">
            <span :class="['tip-dot', hovered.mine ? 'amber' : 'steel']" />
            {{ hovered.mine ? 'Awaiting you' : hovered.stage }} · {{ hovered.cost }}
          </span>
        </div>
      </Transition>
    </div>

    <!-- caption — flows below the stage, never overlaps neighbours -->
    <div class="scope-cap">
      <span class="cap-line"><span class="cap-dot amber" /> Awaiting you <b>{{ mineCount }}</b></span>
      <span class="cap-line"><span class="cap-dot steel" /> In the chain <b>{{ items.length - mineCount }}</b></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { TowerControl } from 'lucide-vue-next'
import { airportCode, fmtCompactINR, runwayStateFor } from '@/composables/useTravel'

const props = defineProps({
  items: { type: Array, default: () => [] }, // request objects
  mineIds: { type: Object, default: () => new Set() },
})
defineEmits(['focus'])

const scopeEl = ref(null)
const hoverId = ref(null)

const URGENT = new Set(['HIGH', 'URGENT'])

const blips = computed(() => {
  const list = props.items
  const n = list.length || 1
  return list.map((r, i) => {
    // deterministic bearing — even spread + a stable per-id swirl so it never looks gridded
    const seed = (String(r.id).charCodeAt(0) || 1) + (String(r.id).charCodeAt(4) || 7)
    const angle = (i / n) * 360 + (seed % 24) - 12 - 90 // -90 → start at top
    // approach progress: deeper into the chain → closer to the tower (center)
    const steps = (r.approval_steps || []).length || 1
    const cur = Math.min(steps, Number(r.current_step || 0))
    const progress = Math.min(0.82, cur / steps) // 0 (new) .. 0.82 (nearly cleared)
    const radius = 42 - progress * 30 // % from center: outer 42 → inner 12
    const rad = (angle * Math.PI) / 180
    const mine = props.mineIds.has(r.id)
    return {
      id: r.id,
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad),
      mine,
      urgent: URGENT.has(r.priority),
      delay: ((i % 6) * 0.18).toFixed(2),
      ref: r.travel_reference_number,
      from: airportCode(r.from_location),
      to: airportCode(r.to_location),
      cost: fmtCompactINR(r.est_total_cost),
      stage: (runwayStateFor(r).find(s => s.state === 'current')?.typeLabel) || 'Holding',
    }
  })
})

const mineCount = computed(() => props.items.filter(r => props.mineIds.has(r.id)).length)
const hovered = computed(() => blips.value.find(b => b.id === hoverId.value) || null)
const tipStyle = computed(() => {
  if (!hovered.value) return {}
  const onRight = hovered.value.x > 55
  return {
    left: hovered.value.x + '%',
    top: hovered.value.y + '%',
    transform: `translate(${onRight ? '-104%' : '4%'}, -118%)`,
  }
})
</script>

<style scoped>
.scope {
  position: relative; width: 100%; max-width: 320px; margin-inline: auto;
  display: flex; flex-direction: column; gap: 12px;
}
.scope-stage {
  position: relative; width: 100%; aspect-ratio: 1 / 1;
  border-radius: 50%; isolation: isolate;
}
.scope-grad {
  position: absolute; inset: -8%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 50% 42%, rgba(251, 191, 36, 0.14), transparent 64%);
  animation: trv-aura-drift 12s ease-in-out infinite;
}
.dish {
  position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.05), transparent 70%),
    var(--trv-panel);
  border: 1px solid var(--trv-border-strong);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5), var(--trv-card-shadow);
}
.ring { position: absolute; border-radius: 50%; border: 1px solid var(--trv-border); }
.tick {
  position: absolute; left: 50%; top: 4%; width: 1px; height: 6%;
  background: var(--trv-border-strong); transform-origin: 50% 770%;
}
.cross { position: absolute; background: var(--trv-border); }
.cross.h { left: 4%; right: 4%; top: 50%; height: 1px; }
.cross.v { top: 4%; bottom: 4%; left: 50%; width: 1px; }
.sweep {
  position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 0deg,
    rgba(251, 191, 36, 0) 0deg,
    rgba(251, 191, 36, 0.02) 250deg,
    rgba(251, 191, 36, 0.18) 320deg,
    rgba(252, 211, 77, 0.42) 356deg,
    rgba(251, 191, 36, 0) 360deg);
  animation: trv-radar-sweep 6s linear infinite;
}
.sweep::after {
  content: ""; position: absolute; left: 50%; top: 4%; width: 1.5px; height: 46%;
  transform-origin: 50% 100%;
  background: linear-gradient(to top, rgba(252, 211, 77, 0.85), transparent);
}
.tower {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
  color: var(--trv-amber); background: var(--trv-amber-soft);
  border: 1px solid var(--trv-amber-border); z-index: 3;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
}
.tower-ping {
  position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; border-radius: 50%;
  transform: translate(-50%, -50%); border: 1.5px solid var(--trv-amber-border); z-index: 2;
  animation: ts-ping 3.6s ease-out infinite;
}
@keyframes ts-ping {
  0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(5.4); }
}

/* blips */
.blip {
  position: absolute; width: 22px; height: 22px; transform: translate(-50%, -50%);
  border: none; background: none; cursor: pointer; padding: 0; z-index: 4;
}
.blip-core {
  position: absolute; inset: 7px; border-radius: 50%;
  background: var(--trv-steel); box-shadow: 0 0 6px rgba(156, 163, 175, 0.6);
  transition: transform 0.25s var(--trv-spring);
}
.blip-halo {
  position: absolute; inset: 3px; border-radius: 50%; border: 1px solid var(--trv-steel);
  opacity: 0.5;
}
.blip.mine .blip-core {
  background: var(--trv-amber-bright);
  box-shadow: 0 0 10px rgba(252, 211, 77, 0.9), 0 0 22px rgba(251, 191, 36, 0.5);
  animation: trv-blip 1.8s ease-in-out infinite; animation-delay: var(--d);
}
.blip.mine .blip-halo { border-color: var(--trv-amber); opacity: 0.8; }
.blip.urgent .blip-halo {
  inset: 0; border-color: var(--trv-st-rejected); opacity: 0.9;
  animation: ts-ping 2.4s ease-out infinite;
}
.blip:hover .blip-core, .blip.hot .blip-core { transform: scale(1.6); }
.blip:focus-visible { outline: 2px solid var(--trv-amber); outline-offset: 2px; border-radius: 50%; }

/* tooltip */
.scope-tip {
  position: absolute; z-index: 7; pointer-events: none; min-width: 130px;
  display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 10px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong);
  box-shadow: var(--trv-shadow);
}
.tip-ref { font-size: 11px; font-weight: 700; color: var(--trv-amber-bright); }
.tip-route { font-size: 12.5px; font-weight: 700; color: var(--trv-text); }
.tip-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--trv-text-muted); margin-top: 2px; }
.tip-dot { width: 7px; height: 7px; border-radius: 50%; }
.tip-dot.amber { background: var(--trv-amber); } .tip-dot.steel { background: var(--trv-steel); }
.scope-tip-enter-active, .scope-tip-leave-active { transition: opacity 0.16s ease; }
.scope-tip-enter-from, .scope-tip-leave-to { opacity: 0; }

/* caption */
.scope-cap {
  display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;
}
.cap-line { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.cap-line b { color: var(--trv-text); font-weight: 800; }
.cap-dot { width: 7px; height: 7px; border-radius: 50%; }
.cap-dot.amber { background: var(--trv-amber); box-shadow: 0 0 6px var(--trv-amber); }
.cap-dot.steel { background: var(--trv-steel); }

.scope.idle .sweep { opacity: 0.6; }

@media (prefers-reduced-motion: reduce) {
  .sweep, .tower-ping, .blip.mine .blip-core, .blip.urgent .blip-halo, .scope-grad { animation: none; }
}
</style>
