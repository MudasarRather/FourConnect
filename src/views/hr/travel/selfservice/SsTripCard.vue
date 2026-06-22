<template>
  <div class="tc-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="tc" :class="[`st-${stMeta.tone}`, { urgent: req.priority === 'URGENT', inflight }]"
      @click="$emit('open', req)">
      <span class="tc-glare" aria-hidden="true" />
      <span class="tc-sheen" aria-hidden="true" />

      <!-- ░ main coupon ░ -->
      <div class="tc-main">
        <span class="tc-spine" :style="{ background: stMeta.hex }" aria-hidden="true" />

        <div class="tc-top">
          <span class="tc-ref trv-mono"><component :is="stMeta.icon" :size="12" /> {{ req.travel_reference_number }}</span>
          <TrvStatusPill :status="req.status" />
        </div>

        <!-- route with a live flight arc -->
        <div class="tc-route">
          <div class="tc-end">
            <span class="tc-code trv-mono">{{ code(req.from_location) }}</span>
            <span class="tc-place">{{ req.from_location }}</span>
          </div>
          <div class="tc-arc" :class="{ fly: inflight }">
            <svg viewBox="0 0 120 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path :id="arcId" class="arc-path" d="M6,33 Q60,1 114,33" fill="none" :stroke="stMeta.hex" stroke-width="1.3" stroke-dasharray="2.4 3" stroke-linecap="round" />
              <circle cx="6" cy="33" r="2.6" fill="var(--trv-amber)" />
              <circle cx="114" cy="33" r="2.6" :fill="stMeta.hex" />
              <g v-if="inflight && !reduced" class="arc-plane">
                <path d="M0,0 L-4.4,1.9 L-1.5,0 L-4.4,-1.9 Z" fill="var(--trv-amber-bright)" />
                <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath :href="`#${arcId}`" /></animateMotion>
              </g>
              <path v-else class="arc-plane-static" d="M0,0 L-4.4,1.9 L-1.5,0 L-4.4,-1.9 Z" fill="var(--trv-amber-bright)" transform="translate(62,16) rotate(6)" />
            </svg>
          </div>
          <div class="tc-end right">
            <span class="tc-code trv-mono">{{ code(req.to_location) }}</span>
            <span class="tc-place">{{ req.to_location }}</span>
          </div>
        </div>

        <div class="tc-meta">
          <div class="tc-m"><span class="lab">Type</span><span class="val">{{ req.travel_type || '—' }}</span></div>
          <div class="tc-m"><span class="lab">Depart</span><span class="val trv-mono">{{ fmtDate(req.departure_date) }}</span></div>
          <div class="tc-m"><span class="lab">Days</span><span class="val trv-mono">{{ req.num_days }}</span></div>
        </div>

        <!-- itinerary linkage chips -->
        <div v-if="links.length" class="tc-links">
          <span v-for="l in links" :key="l.key" class="tc-chip" :style="{ '--lc': l.hex }">
            <component :is="l.icon" :size="11" /> {{ l.label }}
          </span>
        </div>

        <div class="tc-foot">
          <div v-if="gates.length" class="tc-chain" :title="`Approval · step ${Math.min(Number(req.current_step||0)+1, gates.length)} of ${gates.length}`">
            <span v-for="(g, gi) in gates" :key="gi" class="chain-dot" :class="g.state" />
            <component :is="PlaneTakeoff" :size="10" class="chain-tip" :class="terminalState" />
          </div>
          <span v-else class="tc-hint">{{ hint }}</span>

          <div class="tc-rail" @click.stop>
            <Motion as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Details" @click="$emit('open', req)"><Eye :size="14" /></Motion>
            <Motion v-if="req.can_edit" as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Edit" @click="act('edit')"><FilePen :size="14" /></Motion>
            <Motion v-if="canBook" as="button" class="rail-btn book" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Book travel" @click="act('book')"><Ticket :size="14" /></Motion>
            <Motion v-if="canAdvance" as="button" class="rail-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Request advance" @click="act('advance')"><Coins :size="14" /></Motion>
            <Motion v-if="req.can_withdraw && !isDraft" as="button" class="rail-btn warn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Withdraw" @click="act('withdraw')"><Ban :size="14" /></Motion>
            <Motion v-if="canDelete" as="button" class="rail-btn danger" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" :title="isDraft ? 'Delete draft' : 'Delete trip'" @click="act('delete')"><Trash2 :size="14" /></Motion>
          </div>
        </div>

        <!-- contextual primary CTA -->
        <Motion v-if="primary" as="button" class="tc-cta" :class="primary.tone" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.98 }"
          @click.stop="act(primary.type)">
          <component :is="primary.icon" :size="14" /> {{ primary.label }}
        </Motion>
      </div>

      <!-- ░ tear-off stub ░ -->
      <div class="tc-stub" :style="{ '--sc': stMeta.hex }">
        <span class="stub-perf" aria-hidden="true" />
        <span class="stub-glyph"><component :is="stMeta.icon" :size="17" /></span>
        <span class="stub-phase">{{ stMeta.label }}</span>
        <div class="stub-cost"><span>Est.</span><b class="trv-mono">{{ fmtCompactINR(req.est_total_cost) }}</b></div>
        <span class="stub-barcode" aria-hidden="true"><i v-for="n in 17" :key="n" :style="{ height: (40 + ((n * 47) % 54)) + '%' }" /></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Plane, PlaneTakeoff, Eye, Ticket, FilePen, Coins, Ban, Trash2, Send, Scale, Calculator, Hourglass, Route } from 'lucide-vue-next'
import TrvStatusPill from '../components/TrvStatusPill.vue'
import { fmtCompactINR, fmtDate, airportCode, statusMeta, runwayStateFor, isMultiCity, legCount } from '@/composables/useTravel'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ req: { type: Object, required: true }, index: { type: Number, default: 0 } })
const emit = defineEmits(['open', 'action'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const reduced = prefersReduced()

const code = (l) => airportCode(l)
const stMeta = computed(() => statusMeta(props.req.status))
const arcId = computed(() => `arc-${props.req.id}`)
const inflight = computed(() => props.req.status === 'IN_PROGRESS')
const isDraft = computed(() => props.req.status === 'DRAFT')
// Any non-active trip can be deleted (removed from the list). Approved / in-progress
// / completed trips are authorised or under way and stay put.
const canDelete = computed(() => !['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(props.req.status))
const gates = computed(() => runwayStateFor(props.req).slice(0, 5))
const terminalState = computed(() => {
  const s = props.req.status
  if (['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(s)) return 'done'
  if (s === 'REJECTED') return 'rejected'
  return 'pending'
})

const canBook = computed(() => ['APPROVED', 'IN_PROGRESS'].includes(props.req.status))
// An advance can be requested on any approved/in-progress trip with no live advance.
// A REJECTED/CANCELLED advance is terminal → the employee may request a fresh one.
const canAdvance = computed(() => ['APPROVED', 'IN_PROGRESS'].includes(props.req.status)
  && (!props.req.advance || ['REJECTED', 'CANCELLED'].includes(props.req.advance.status)))
const settledLocked = computed(() => props.req.settlement && !['DRAFT', 'SUBMITTED'].includes(props.req.settlement.status))

const links = computed(() => {
  const r = props.req, out = []
  if (isMultiCity(r)) out.push({ key: 'mc', icon: Route, label: `Multi-city · ${legCount(r)} legs`, hex: '#fb923c' })
  if (r.bookings?.length) out.push({ key: 'bk', icon: Ticket, label: `${r.bookings.length} booking${r.bookings.length > 1 ? 's' : ''}`, hex: '#fbbf24' })
  if (r.advance) out.push({ key: 'adv', icon: Coins, label: 'Advance', hex: '#fb923c' })
  if (r.da) out.push({ key: 'da', icon: Calculator, label: 'DA', hex: '#fcd34d' })
  if (r.settlement) out.push({ key: 'stl', icon: Scale, label: 'Settlement', hex: '#34d399' })
  return out
})

const primary = computed(() => {
  const s = props.req.status
  if (['DRAFT', 'RETURNED'].includes(s)) return { type: 'submit', label: s === 'RETURNED' ? 'Revise & resubmit' : 'Submit for approval', icon: Send, tone: 'primary' }
  if (s === 'APPROVED') return { type: 'book', label: 'Book your travel', icon: Ticket, tone: 'primary' }
  if (s === 'IN_PROGRESS') return { type: 'book', label: 'Manage itinerary', icon: Ticket, tone: 'steel' }
  if (s === 'COMPLETED') return settledLocked.value
    ? { type: 'open', label: 'View settlement', icon: Scale, tone: 'steel' }
    : { type: 'expense', label: 'File expenses', icon: Scale, tone: 'primary' }
  return null
})

const hint = computed(() => {
  const s = props.req.status
  if (s === 'PENDING_APPROVAL') return 'Awaiting approval'
  if (s === 'REJECTED') return 'Not approved'
  if (s === 'CANCELLED') return 'Withdrawn'
  return 'Tap for details'
})

const act = (type) => type === 'open' ? emit('open', props.req) : emit('action', { type, req: props.req })
</script>

<style scoped>
.tc-shell { height: 100%; animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.tc {
  position: relative; display: grid; grid-template-columns: 1fr 92px; grid-template-rows: 1fr; height: 100%; cursor: pointer; overflow: hidden;
  border-radius: 18px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge);
  box-shadow: var(--trv-card-shadow); transition: transform 0.28s var(--trv-spring), box-shadow 0.28s, border-color 0.28s;
}
.tc:hover { transform: perspective(1100px) rotateX(calc((var(--my,.5) - .5) * -4deg)) rotateY(calc((var(--mx,.5) - .5) * 6deg)) translateY(-3px); box-shadow: var(--trv-shadow-hover); border-color: var(--trv-amber-border); }
.tc-glare { position: absolute; inset: 0; opacity: var(--spot, 0); pointer-events: none; z-index: 5; background: radial-gradient(340px circle at calc(var(--mx,.5)*100%) calc(var(--my,.5)*100%), rgba(251,191,36,0.14), transparent 60%); transition: opacity 0.3s; }
.tc-sheen { position: absolute; top: 0; left: 0; width: 48%; height: 100%; z-index: 4; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.18) 50%, transparent); transform: translateX(-130%) skewX(-16deg); }
.tc:hover .tc-sheen { opacity: 1; animation: trv-sheen-pass 0.9s var(--trv-ease) forwards; }

/* main coupon */
.tc-main { position: relative; display: flex; flex-direction: column; padding: 15px 17px 16px; min-width: 0; }
.tc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 3; }
.tc.urgent .tc-spine { box-shadow: 0 0 14px var(--trv-pri-urgent); animation: trv-spine-pulse 1.8s ease-in-out infinite; }

.tc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
.tc-ref { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); letter-spacing: 0.03em; }

.tc-route { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; margin-bottom: 13px; }
.tc-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tc-end.right { align-items: flex-end; text-align: right; }
.tc-code { font-size: 23px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.tc-place { font-size: 10px; color: var(--trv-text-muted); max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-arc { height: 40px; }
.tc-arc svg { width: 100%; height: 100%; overflow: visible; }
.arc-path { opacity: 0.55; }
.arc-plane, .arc-plane-static { filter: drop-shadow(0 0 1.6px var(--trv-amber)); }
.tc.inflight .arc-path { animation: arc-dash 0.7s linear infinite; }
@keyframes arc-dash { to { stroke-dashoffset: -5.4; } }

.tc-meta { display: grid; grid-template-columns: 0.95fr 1.15fr 0.45fr; gap: 7px 9px; margin-bottom: 11px; }
.tc-m { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tc-m .lab { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.tc-m .val { font-size: 12px; font-weight: 600; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tc-links { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.tc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 650; color: var(--lc); background: color-mix(in srgb, var(--lc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 28%, transparent); }

.tc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 30px; margin-top: auto; padding-top: 11px; border-top: 1px dashed var(--trv-pass-edge); }
.tc-hint { font-size: 10px; letter-spacing: 0.04em; color: var(--trv-text-dim); }
.tc-chain { display: flex; align-items: center; gap: 5px; }
.chain-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--trv-steel-soft); border: 1px solid var(--trv-border-strong); }
.chain-dot.done { background: var(--trv-st-approved); border-color: var(--trv-st-approved); }
.chain-dot.current { background: var(--trv-amber); border-color: var(--trv-amber); box-shadow: 0 0 8px var(--trv-amber); animation: trv-beacon 1.6s ease-in-out infinite; }
.chain-dot.rejected { background: var(--trv-st-rejected); border-color: var(--trv-st-rejected); }
.chain-dot.returned { background: var(--trv-st-returned); border-color: var(--trv-st-returned); }
.chain-dot.skipped { opacity: 0.4; }
.chain-tip { color: var(--trv-text-dim); margin-left: 2px; }
.chain-tip.done { color: var(--trv-st-approved); }

.tc-rail { display: flex; gap: 6px; opacity: 0; transform: translateY(4px); transition: opacity 0.26s var(--trv-spring), transform 0.26s var(--trv-spring); }
.tc:hover .tc-rail, .tc:focus-within .tc-rail { opacity: 1; transform: translateY(0); }
.rail-btn { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.rail-btn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.rail-btn.book:hover { color: var(--trv-amber-bright); }
.rail-btn.warn:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }
.rail-btn.danger:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 45%, transparent); background: var(--trv-st-rejected-soft); }

.tc-cta { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; margin-top: 12px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 750; cursor: pointer; border: 1px solid transparent; }
.tc-cta.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.tc-cta.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }

/* tear-off stub */
.tc-stub { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 14px 6px 10px;
  background: color-mix(in srgb, var(--sc) 9%, var(--trv-panel)); border-left: 1.5px dashed var(--trv-pass-edge); }
.stub-perf { position: absolute; left: -1.5px; top: 9px; bottom: 9px; width: 3px;
  background-image: radial-gradient(circle at center, rgba(0,0,0,0.5) 1.5px, transparent 2px); background-size: 3px 13px; background-repeat: repeat-y; }
.stub-glyph { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: var(--sc);
  background: color-mix(in srgb, var(--sc) 16%, transparent); border: 1px solid color-mix(in srgb, var(--sc) 34%, transparent); }
.tc.inflight .stub-glyph { animation: trv-beacon 1.8s ease-in-out infinite; }
.stub-phase { font-size: 8.5px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sc); text-align: center; line-height: 1.2; }
.stub-cost { display: flex; flex-direction: column; align-items: center; gap: 1px; margin-top: auto; }
.stub-cost span { font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.stub-cost b { font-size: 13px; font-weight: 800; color: var(--trv-amber-bright); }
.stub-barcode { display: flex; align-items: flex-end; justify-content: center; gap: 1px; height: 22px; margin-top: 6px; width: 100%; }
.stub-barcode i { width: 1.5px; background: var(--trv-barcode); border-radius: 1px; opacity: 0.7; }

[data-theme="light"] .stub-perf { background-image: radial-gradient(circle at center, rgba(120,90,30,0.4) 1.5px, transparent 2px); }
[data-theme="light"] .tc-sheen { background: linear-gradient(105deg, transparent, rgba(255,255,255,0.55) 50%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .tc-shell { animation: none; }
  .tc:hover { transform: translateY(-2px); }
  .tc:hover .tc-sheen { animation: none; opacity: 0; }
  .tc.inflight .arc-path, .tc.inflight .stub-glyph, .chain-dot.current, .tc.urgent .tc-spine { animation: none; }
  .tc-rail { transition: opacity 0.2s; }
}
</style>
