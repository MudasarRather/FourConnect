<template>
  <div class="strip-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="strip" :class="{ mine, urgent }">
      <span class="glare" aria-hidden="true" />
      <span class="spine" aria-hidden="true" />

      <!-- header -->
      <header class="s-head">
        <div class="s-id">
          <span class="s-ref trv-mono">{{ req.travel_reference_number }}</span>
          <span class="s-squad" :class="mine ? 'amber' : 'steel'">
            <component :is="mine ? Gavel : Hourglass" :size="11" />
            {{ mine ? 'Cleared for you' : 'Holding · ' + stageLabel }}
          </span>
        </div>
        <div class="s-tags">
          <span v-if="isMultiCity(req)" class="s-mc"><Route :size="11" /> {{ legCount(req) }} legs</span>
          <span v-if="urgent" class="s-pri" :style="{ '--c': priColor }">
            <Flame :size="11" /> {{ req.priority }}
          </span>
          <span class="s-wait trv-mono"><Timer :size="11" /> {{ waitLabel }}</span>
        </div>
      </header>

      <!-- flight path -->
      <div class="s-route">
        <div class="r-end">
          <span class="r-code trv-mono">{{ code(req.from_location) }}</span>
          <span class="r-place">{{ req.from_location }}</span>
          <span class="r-date trv-mono">{{ fmtDate(req.departure_date) }}</span>
        </div>
        <div class="r-arc">
          <svg viewBox="0 0 240 54" preserveAspectRatio="none" class="arc-svg">
            <path class="arc-track" d="M14,44 Q120,2 226,44" />
            <path class="arc-flow" d="M14,44 Q120,2 226,44" />
          </svg>
          <span class="r-plane"><Plane :size="15" /></span>
          <span class="r-days trv-mono">{{ req.num_days }}d</span>
        </div>
        <div class="r-end right">
          <span class="r-code trv-mono">{{ code(req.to_location) }}</span>
          <span class="r-place">{{ req.to_location }}</span>
          <span class="r-date trv-mono">{{ fmtDate(req.return_date) }}</span>
        </div>
      </div>

      <!-- meta -->
      <div class="s-meta">
        <span class="m-emp"><span class="m-avatar">{{ initials }}</span>{{ req.employee_name || '—' }}</span>
        <span class="m-type">{{ req.travel_type || 'Official Tour' }}</span>
        <span class="m-cost trv-mono">{{ fmtINR(req.est_total_cost) }}</span>
      </div>

      <!-- approval chain -->
      <ApprovalRunway :req="req" compact />

      <!-- actions -->
      <div class="s-actions">
        <button class="mini ghost" @click="$emit('detail', req)"><Eye :size="13" /> Details</button>
        <button v-if="!mine" class="mini warn" @click="$emit('escalate', req)">
          <FastForward :size="13" /> Override stage
        </button>
        <Motion v-if="mine" as="button" class="mini primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('decide', req)">
          <Gavel :size="13" /> Decide
        </Motion>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Plane, Gavel, Hourglass, Flame, Timer, Eye, FastForward, Route } from 'lucide-vue-next'
import ApprovalRunway from './ApprovalRunway.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { fmtINR, fmtDate, airportCode, priorityMeta, runwayStateFor, isMultiCity, legCount } from '@/composables/useTravel'

const props = defineProps({
  req: { type: Object, required: true },
  mine: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['detail', 'decide', 'escalate'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const code = (l) => airportCode(l)
const urgent = computed(() => ['HIGH', 'URGENT'].includes(props.req.priority))
const priColor = computed(() => priorityMeta(props.req.priority).hex)
const stageLabel = computed(() => runwayStateFor(props.req).find(s => s.state === 'current')?.typeLabel || 'Approver')
const initials = computed(() => (props.req.employee_name || '·').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())

const waitLabel = computed(() => {
  const t = props.req.submitted_at
  if (!t) return 'new'
  const ms = Date.now() - new Date(t).getTime()
  if (ms < 0) return 'new'
  const h = Math.floor(ms / 3.6e6)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h in queue`
  return `${Math.floor(h / 24)}d in queue`
})
</script>

<style scoped>
.strip-shell {
  opacity: 0; animation: trv-deal 0.5s var(--trv-spring) forwards;
  animation-delay: calc(var(--i) * 0.05s);
}
.strip {
  position: relative; overflow: hidden; padding: 16px 18px 16px 22px; border-radius: 18px;
  background: var(--trv-surface); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-card-shadow);
  transition: transform 0.4s var(--trv-spring), box-shadow 0.4s var(--trv-spring), border-color 0.3s;
  transform: perspective(1200px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg));
}
.strip:hover { box-shadow: var(--trv-shadow-hover); border-color: var(--trv-border-strong); transform: perspective(1200px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px); }
.strip.mine { border-color: var(--trv-amber-border); }
.glare {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 5;
  opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(380px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 191, 36, 0.14), transparent 60%);
}
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--trv-steel); opacity: 0.5; }
.strip.mine .spine { background: var(--trv-grad-hero); opacity: 1; box-shadow: 0 0 14px rgba(251, 191, 36, 0.5); }
.strip.urgent .spine { background: linear-gradient(to bottom, var(--trv-st-rejected), var(--trv-ember)); }

.s-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.s-id { display: flex; flex-direction: column; gap: 5px; }
.s-ref { font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); }
.s-squad { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; width: fit-content; }
.s-squad.amber { color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.s-squad.steel { color: var(--trv-text-muted); background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.s-tags { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.s-pri { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 750; color: var(--c); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.s-wait { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trv-text-dim); }
.s-mc { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--trv-ember); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--trv-ember) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trv-ember) 30%, transparent); }

/* route */
.s-route { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; margin: 14px 0 12px; }
.r-end { display: flex; flex-direction: column; gap: 1px; } .r-end.right { align-items: flex-end; text-align: right; }
.r-code { font-size: 22px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.r-place { font-size: 10px; color: var(--trv-text-muted); max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-date { font-size: 9.5px; color: var(--trv-text-dim); }
.r-arc { position: relative; height: 46px; }
.arc-svg { width: 100%; height: 100%; overflow: visible; }
.arc-track { fill: none; stroke: var(--trv-border-strong); stroke-width: 1.5; stroke-dasharray: 3 5; }
.arc-flow { fill: none; stroke: var(--trv-amber); stroke-width: 1.6; stroke-dasharray: 5 9; stroke-linecap: round; opacity: 0.85; animation: is-flow 1.4s linear infinite; }
@keyframes is-flow { to { stroke-dashoffset: -28; } }
.r-plane { position: absolute; left: 50%; top: -2px; transform: translateX(-50%); color: var(--trv-amber-bright); filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.6)); }
.r-days { position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%); font-size: 9.5px; color: var(--trv-text-muted); background: var(--trv-surface); padding: 0 5px; border-radius: 4px; }

/* meta */
.s-meta { display: flex; align-items: center; gap: 10px; padding: 9px 0; margin-bottom: 4px; border-top: 1px solid var(--trv-border); border-bottom: 1px solid var(--trv-border); }
.m-emp { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); }
.m-avatar { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.m-type { font-size: 11px; color: var(--trv-text-muted); padding: 2px 8px; border-radius: 6px; background: var(--trv-panel); }
.m-cost { margin-left: auto; font-size: 14px; font-weight: 800; color: var(--trv-amber); }

/* actions */
.s-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; border: 1px solid transparent; }
.mini.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.mini.ghost:hover { color: var(--trv-text); border-color: var(--trv-text-dim); }
.mini.warn { background: var(--trv-st-returned-soft); color: var(--trv-st-returned); border-color: color-mix(in srgb, var(--trv-st-returned) 30%, transparent); }
.mini.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }

@media (prefers-reduced-motion: reduce) {
  .strip-shell { animation: none; opacity: 1; }
  .strip { transform: none; } .strip:hover { transform: translateY(-3px); }
  .arc-flow { animation: none; }
}
@media (max-width: 560px) { .r-place { max-width: 64px; } }
</style>
