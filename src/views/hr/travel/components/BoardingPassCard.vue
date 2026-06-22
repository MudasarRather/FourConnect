<template>
  <div class="bp-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="bp" :class="[`st-${stMeta.tone}`, { priority: req.priority === 'URGENT', inflight: req.status === 'IN_PROGRESS' }]"
      @click="$emit('open', req)">
      <span class="bp-glare" aria-hidden="true" />
      <span class="bp-spine" :style="{ background: stMeta.hex }" aria-hidden="true" />

      <!-- main stub -->
      <div class="bp-main">
        <div class="bp-top">
          <span class="bp-ref trv-mono"><component :is="stMeta.icon" :size="12" /> {{ req.travel_reference_number }}</span>
          <TrvStatusPill :status="req.status" />
        </div>

        <div class="bp-route">
          <div class="bp-end">
            <span class="bp-code trv-mono">{{ code(req.from_location) }}</span>
            <span class="bp-place">{{ req.from_location }}</span>
          </div>
          <div class="bp-path">
            <span class="bp-line" />
            <span class="bp-planewrap"><Plane :size="15" class="bp-plane" /></span>
            <span class="bp-line" />
          </div>
          <div class="bp-end right">
            <span class="bp-code trv-mono">{{ code(req.to_location) }}</span>
            <span class="bp-place">{{ req.to_location }}</span>
          </div>
        </div>

        <div class="bp-meta">
          <div class="bp-m"><span class="lab">Traveller</span><span class="val">{{ req.employee_name || '—' }}</span></div>
          <div class="bp-m"><span class="lab">Type</span><span class="val">{{ req.travel_type || '—' }}</span></div>
          <div class="bp-m"><span class="lab">Depart</span><span class="val trv-mono">{{ fmtDate(req.departure_date) }}</span></div>
          <div class="bp-m"><span class="lab">Days</span><span class="val trv-mono">{{ req.num_days }}</span></div>
        </div>

        <!-- linkage chips -->
        <div v-if="links.length" class="bp-links">
          <span v-for="l in links" :key="l.key" class="link-chip" :style="{ '--lc': l.hex }">
            <component :is="l.icon" :size="11" /> {{ l.label }}
          </span>
        </div>

        <!-- footer: approval chain (left) + quick-action rail (right) -->
        <div class="bp-foot">
          <div v-if="gates.length" class="bp-chain" :title="chainTitle">
            <span v-for="(g, gi) in gates" :key="gi" class="chain-dot" :class="g.state" />
            <span class="chain-tip" :class="terminalState"><PlaneTakeoff :size="10" /></span>
          </div>
          <span v-else class="bp-foot-hint">Tap for details</span>
          <div class="bp-rail" @click.stop>
            <Motion as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }"
              title="Open details" @click="$emit('open', req)"><Eye :size="14" /></Motion>
            <Motion v-if="req.can_execute" as="button" class="rail-btn go" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }"
              title="Start travel" @click="act('execute')"><PlaneTakeoff :size="14" /></Motion>
            <Motion v-if="req.can_complete" as="button" class="rail-btn ok" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }"
              title="Mark complete" @click="act('complete')"><CircleCheckBig :size="14" /></Motion>
            <Motion v-if="canBook" as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }"
              title="Manage booking" @click="act('booking')"><Ticket :size="14" /></Motion>
            <Motion v-if="req.can_edit" as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.92 }"
              title="Edit request" @click="act('edit')"><FilePen :size="14" /></Motion>
          </div>
        </div>
      </div>

      <!-- perforation -->
      <div class="bp-perf" aria-hidden="true"><span class="notch top" /><span class="notch bot" /></div>

      <!-- tear stub -->
      <div class="bp-stub">
        <span class="bp-stub-lab">Est. cost</span>
        <span class="bp-stub-val trv-mono">{{ fmtCompactINR(req.est_total_cost) }}</span>
        <span class="bp-barcode" aria-hidden="true">
          <i v-for="n in 22" :key="n" :style="{ height: (40 + ((n * 37) % 50)) + '%' }" />
        </span>
        <span class="bp-pri" :style="{ color: priMeta.hex }">{{ priMeta.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Plane, PlaneTakeoff, Eye, Ticket, FilePen, CircleCheckBig, Coins, Calculator, Scale, Route } from 'lucide-vue-next'
import TrvStatusPill from './TrvStatusPill.vue'
import { fmtCompactINR, fmtDate, airportCode, statusMeta, priorityMeta, runwayStateFor, isMultiCity, legCount } from '@/composables/useTravel'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ req: { type: Object, required: true }, index: { type: Number, default: 0 } })
const emit = defineEmits(['open', 'action'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const code = (l) => airportCode(l)
const stMeta = computed(() => statusMeta(props.req.status))
const priMeta = computed(() => priorityMeta(props.req.priority))

const gates = computed(() => runwayStateFor(props.req).slice(0, 5))
const terminalState = computed(() => {
  const s = props.req.status
  if (['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(s)) return 'done'
  if (s === 'REJECTED') return 'rejected'
  return 'pending'
})
const chainTitle = computed(() => `Approval chain · step ${Math.min(Number(props.req.current_step || 0) + 1, gates.value.length || 1)} of ${gates.value.length || 1}`)

const canBook = computed(() => ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(props.req.status))

const links = computed(() => {
  const r = props.req, out = []
  if (isMultiCity(r)) out.push({ key: 'mc', icon: Route, label: `Multi-city · ${legCount(r)} legs`, hex: '#fb923c' })
  if (r.bookings && r.bookings.length) out.push({ key: 'bk', icon: Ticket, label: `${r.bookings.length} booking${r.bookings.length > 1 ? 's' : ''}`, hex: '#fbbf24' })
  if (r.advance) out.push({ key: 'adv', icon: Coins, label: 'Advance', hex: '#fb923c' })
  if (r.da) out.push({ key: 'da', icon: Calculator, label: 'DA', hex: '#fcd34d' })
  if (r.settlement) out.push({ key: 'stl', icon: Scale, label: 'Settlement', hex: '#34d399' })
  return out
})

const act = (type) => emit('action', { type, req: props.req })
</script>

<style scoped>
.bp-shell { animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.bp {
  position: relative; display: grid; grid-template-columns: 1fr 14px 104px; cursor: pointer; overflow: hidden;
  border-radius: 16px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge);
  box-shadow: var(--trv-card-shadow); transition: transform 0.25s var(--trv-spring), box-shadow 0.25s, border-color 0.25s;
}
.bp:hover { transform: perspective(1100px) rotateX(calc((var(--my,.5) - .5) * -4deg)) rotateY(calc((var(--mx,.5) - .5) * 6deg)) translateY(-3px); box-shadow: var(--trv-shadow-hover); border-color: var(--trv-amber-border); }
.bp-glare { position: absolute; inset: 0; opacity: var(--spot, 0); pointer-events: none; z-index: 4; background: radial-gradient(360px circle at calc(var(--mx,.5) * 100%) calc(var(--my,.5) * 100%), rgba(251,191,36,0.14), transparent 60%); transition: opacity 0.3s; }
.bp-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 3; }
.bp.priority .bp-spine { box-shadow: 0 0 14px var(--trv-pri-urgent); animation: trv-spine-pulse 1.8s ease-in-out infinite; }

.bp-main { padding: 15px 17px 16px; min-width: 0; }
.bp-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
.bp-ref { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); letter-spacing: 0.04em; }

.bp-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-bottom: 14px; }
.bp-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bp-end.right { align-items: flex-end; text-align: right; }
.bp-code { font-size: 23px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.bp-place { font-size: 10.5px; color: var(--trv-text-muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bp-path { display: flex; align-items: center; gap: 4px; color: var(--trv-amber); }
.bp-line { width: 18px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.55; background-size: 16px 100%; }
.bp-planewrap { display: grid; place-items: center; }
.bp-plane { display: block; }
.bp.inflight .bp-line { animation: trv-runway-flow 0.9s linear infinite; }
.bp.inflight .bp-plane { animation: trv-plane-drift 2.4s ease-in-out infinite; }
.bp.st-pending .bp-planewrap { animation: trv-beacon 1.8s ease-in-out infinite; }

.bp-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 16px; margin-bottom: 10px; }
.bp-m { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.bp-m .lab { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.bp-m .val { font-size: 12px; font-weight: 600; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bp-chain { display: flex; align-items: center; gap: 5px; }
.chain-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--trv-steel-soft); border: 1px solid var(--trv-border-strong); transition: all 0.3s; }
.chain-dot.done { background: var(--trv-st-approved); border-color: var(--trv-st-approved); }
.chain-dot.current { background: var(--trv-amber); border-color: var(--trv-amber); box-shadow: 0 0 8px var(--trv-amber); animation: trv-beacon 1.6s ease-in-out infinite; }
.chain-dot.rejected { background: var(--trv-st-rejected); border-color: var(--trv-st-rejected); }
.chain-dot.returned { background: var(--trv-st-returned); border-color: var(--trv-st-returned); }
.chain-dot.skipped { opacity: 0.4; }
.chain-tip { display: grid; place-items: center; margin-left: 2px; color: var(--trv-text-dim); }
.chain-tip.done { color: var(--trv-st-approved); }

.bp-links { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.link-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 650;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 28%, transparent);
}

/* footer row — chain (left) + actions (right), no overlap, fixed height = no reflow */
.bp-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 30px; padding-top: 11px; border-top: 1px dashed var(--trv-pass-edge); }
.bp-foot-hint { font-size: 10px; letter-spacing: 0.04em; color: var(--trv-text-dim); }
.bp-rail { display: flex; gap: 6px; opacity: 0; transform: translateY(4px); transition: opacity 0.26s var(--trv-spring), transform 0.26s var(--trv-spring); }
.bp:hover .bp-rail, .bp:focus-within .bp-rail { opacity: 1; transform: translateY(0); }
.rail-btn {
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary);
}
.rail-btn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.rail-btn.go { color: var(--trv-st-progress); border-color: color-mix(in srgb, var(--trv-st-progress) 40%, transparent); }
.rail-btn.ok { color: var(--trv-st-completed); border-color: color-mix(in srgb, var(--trv-st-completed) 40%, transparent); }

.bp-perf { position: relative; z-index: 2; }
.bp-perf::before { content: ""; position: absolute; left: 50%; top: 10px; bottom: 10px; border-left: 1.5px dashed var(--trv-pass-edge); transform: translateX(-50%); }
.notch { position: absolute; left: 50%; width: 14px; height: 14px; border-radius: 50%; background: var(--trv-canvas); transform: translateX(-50%); }
.notch.top { top: -7px; } .notch.bot { bottom: -7px; }

.bp-stub { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 14px 8px; background: rgba(0,0,0,0.16); }
.bp-stub-lab { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.bp-stub-val { font-size: 15px; font-weight: 800; color: var(--trv-amber-bright); }
.bp-barcode { display: flex; align-items: flex-end; gap: 1.5px; height: 28px; margin: 4px 0; }
.bp-barcode i { width: 2px; background: var(--trv-barcode); border-radius: 1px; }
.bp-pri { font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
[data-theme="light"] .bp-stub { background: rgba(120,90,30,0.06); }
[data-theme="light"] .notch { background: var(--trv-canvas); }

@media (prefers-reduced-motion: reduce) {
  .bp-shell { animation: none; }
  .bp:hover { transform: translateY(-2px); }
  .bp.inflight .bp-line, .bp.inflight .bp-plane, .bp.st-pending .bp-planewrap, .chain-dot.current, .bp.priority .bp-spine { animation: none; }
  .bp-rail { transition: opacity 0.2s; }
}
</style>
