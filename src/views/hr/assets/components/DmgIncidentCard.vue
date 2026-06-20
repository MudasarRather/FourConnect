<template>
  <Motion as="article" class="dic" ref="root" :class="{ terminal, open: isOpen }" :style="{ '--sev': sev.color, '--st': st.color }"
    :initial="reduced ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.5, delay: Math.min(index * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }">
    <span class="dic-rail" :class="{ pulse: isOpen && sev.amp >= 0.8 }" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />

    <div class="dic-body">
      <header class="dic-head">
        <span class="dic-medal"><component :is="sev.icon" :size="16" /><span v-if="isOpen" class="dic-medal-ring" /></span>
        <div class="dic-id">
          <span class="dic-code as-mono">{{ ticket.asset_code || 'Asset' }}</span>
          <span class="dic-title">{{ ticket.title || ticket.description }}</span>
        </div>
        <div class="dic-stamps">
          <AsStamp :value="ticket.severity" />
          <AsStamp :value="ticket.status" />
        </div>
      </header>

      <!-- vital-sign monitor -->
      <div class="dic-mon" :class="{ flat: terminal }">
        <svg viewBox="0 0 360 40" preserveAspectRatio="none">
          <polyline class="dic-mon-ghost" :points="ecg" />
          <polyline class="dic-mon-line" :points="ecg" />
        </svg>
        <span v-if="isOpen && !reduced" class="dic-mon-sweep" aria-hidden="true" />
        <span class="dic-mon-tag">impact {{ Math.round(sev.amp * 100) }}%</span>
      </div>

      <!-- meta chips -->
      <div class="dic-meta">
        <span v-if="ticket.reported_by_name" class="dic-chip"><UserRound :size="11" /> {{ ticket.reported_by_name }}</span>
        <span class="dic-chip"><CalendarDays :size="11" /> {{ fmtDate(ticket.reported_date) }}</span>
        <span v-if="ticket.attachments && ticket.attachments.length" class="dic-chip"><Paperclip :size="11" /> {{ ticket.attachments.length }}</span>
        <span v-if="ticket.recovery_amount" class="dic-chip rec"><CircleDollarSign :size="11" /> ₹{{ fmtAmt(ticket.recovery_amount) }}</span>
        <span v-if="ticket.liable_employee" class="dic-chip warn"><UserRound :size="11" /> Employee liable</span>
      </div>

      <!-- evidence thumbs -->
      <div v-if="thumbs.length" class="dic-thumbs">
        <a v-for="(p, i) in thumbs" :key="i" class="dic-thumb" :href="urlFor(p)" target="_blank" rel="noopener">
          <img :src="urlFor(p)" alt="evidence" loading="lazy" />
        </a>
      </div>

      <p v-if="terminal && ticket.resolution_notes" class="dic-resolution"><MessageSquareText :size="12" /> {{ ticket.resolution_notes }}</p>

      <!-- triage pipeline -->
      <div class="dic-pipe">
        <div v-for="(n, i) in nodes" :key="n.key" class="dic-stage" :class="n.state" :style="{ '--nc': n.color }">
          <span class="dic-node"><component :is="n.icon" :size="13" /><span v-if="n.state === 'active'" class="dic-node-pulse" /></span>
          <span class="dic-stage-lab">{{ n.label }}</span>
          <span v-if="i < nodes.length - 1" class="dic-link-line" :class="{ filled: n.state === 'passed' }" aria-hidden="true" />
        </div>
      </div>

      <footer class="dic-foot">
        <div class="dic-actions">
          <Motion v-for="a in actions" :key="a.to" as="button" type="button" class="dic-act" :data-kind="a.kind"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="onAction(a)">
            <component :is="a.icon" :size="13" /> {{ a.label }}
          </Motion>
        </div>
        <div class="dic-links">
          <button v-if="ticket.status === 'IN_REPAIR'" type="button" class="dic-ilink" title="Maintenance bay" @click="$emit('go', 'maintenance')"><Wrench :size="14" /></button>
          <button type="button" class="dic-ilink" title="Asset history" @click="$emit('detail')"><History :size="14" /></button>
        </div>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  UserRound, CalendarDays, Paperclip, CircleDollarSign, Wrench, History,
  MessageSquareText, ArrowRight, ShieldCheck, Archive, Ban,
} from 'lucide-vue-next'
import AsStamp from './AsStamp.vue'
import { API_BASE } from '@/utils/api'
import { sevMeta, statusMeta, TRIAGE_PIPELINE, NEXT_ACTIONS, isOpen as openCheck, isTerminal, fmtDate, ecgPoints } from './dmgMeta.js'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  ticket: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
const emit = defineEmits(['advance', 'resolve', 'writeoff', 'reject', 'detail', 'go'])

const root = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)

const sev = computed(() => sevMeta(props.ticket.severity))
const st = computed(() => statusMeta(props.ticket.status))
const isOpen = computed(() => openCheck(props.ticket.status))
const terminal = computed(() => isTerminal(props.ticket.status))

const ecg = computed(() => ecgPoints(360, 40, 3, props.ticket.status && terminal.value ? 0.1 : sev.value.amp))

const thumbs = computed(() => (props.ticket.attachments || []).filter(Boolean).slice(0, 4))
const urlFor = (p) => (p?.startsWith?.('http') ? p : `${API_BASE}/${p}`)
const fmtAmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const ACTION_ICON = { advance: ArrowRight, resolve: ShieldCheck, writeoff: Archive, reject: Ban }
const actions = computed(() => (NEXT_ACTIONS[props.ticket.status] || []).map(a => ({ ...a, icon: ACTION_ICON[a.kind] || ArrowRight })))
function onAction(a) {
  if (a.kind === 'advance') emit('advance', a.to)
  else emit(a.kind)
}

// triage pipeline node states
const OUTCOME = {
  RESOLVED:  { label: 'Resolved',    icon: ShieldCheck, color: 'var(--as-st-available)' },
  WRITE_OFF: { label: 'Written off', icon: Archive,     color: 'var(--as-st-retired)' },
  REJECTED:  { label: 'Rejected',    icon: Ban,         color: 'var(--as-al-lost)' },
}
const reached = computed(() => {
  const s = props.ticket.status
  if (s === 'WRITE_OFF') return 2
  if (s === 'REJECTED') return 0
  return statusMeta(s).stage
})
const nodes = computed(() => TRIAGE_PIPELINE.map((stage, i) => {
  const last = i === TRIAGE_PIPELINE.length - 1
  // final node morphs into the actual outcome for terminal tickets
  if (last && terminal.value) {
    const o = OUTCOME[props.ticket.status] || OUTCOME.RESOLVED
    return { key: stage.key, label: o.label, icon: o.icon, color: o.color, state: 'outcome' }
  }
  let state = 'idle'
  if (i < reached.value) state = 'passed'
  else if (i === reached.value && isOpen.value) state = 'active'
  return { key: stage.key, label: stage.label, icon: stage.icon, color: 'var(--st)', state }
}))
</script>

<style scoped>
.dic { position: relative; overflow: hidden; display: flex; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.25s, box-shadow 0.25s; }
.dic:hover { border-color: color-mix(in srgb, var(--sev) 36%, transparent); box-shadow: var(--as-card-shadow-hover); }
.dic.terminal { opacity: 0.92; }
.dic-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--sev), color-mix(in srgb, var(--sev) 20%, transparent)); }
.dic-rail.pulse { animation: dic-rail 1.8s ease-in-out infinite; }
.dic-body { position: relative; z-index: 1; flex: 1; min-width: 0; padding: 15px 17px 14px 19px; display: flex; flex-direction: column; gap: 12px; }

.dic-head { display: flex; align-items: flex-start; gap: 12px; }
.dic-medal { position: relative; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: var(--sev);
  background: color-mix(in srgb, var(--sev) 15%, transparent); border: 1px solid color-mix(in srgb, var(--sev) 34%, transparent); }
.dic-medal-ring { position: absolute; inset: -4px; border-radius: 14px; border: 1.5px solid color-mix(in srgb, var(--sev) 45%, transparent); animation: dic-ring 2s ease-out infinite; }
.dic-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dic-code { font-size: 14px; font-weight: 850; color: var(--as-text); }
.dic-title { font-size: 12.5px; color: var(--as-text-secondary); line-height: 1.4; }
.dic-stamps { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }

/* vital monitor */
.dic-mon { position: relative; height: 42px; border-radius: 11px; overflow: hidden; background: color-mix(in srgb, var(--sev) 5%, var(--as-surface)); border: 1px solid var(--as-border-soft); }
.dic-mon svg { width: 100%; height: 100%; display: block; overflow: visible; }
.dic-mon-ghost { fill: none; stroke: var(--sev); stroke-width: 1.2; opacity: 0.18; }
.dic-mon-line { fill: none; stroke: var(--sev); stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--sev) 55%, transparent));
  stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: dic-draw 1.4s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: calc(var(--i, 0) * 1ms); }
.dic-mon.flat .dic-mon-line { filter: none; opacity: 0.45; }
.dic-mon-sweep { position: absolute; top: 0; bottom: 0; width: 48px; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sev) 24%, transparent), transparent); animation: dic-sweep 3s linear infinite; }
.dic-mon-tag { position: absolute; right: 8px; top: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sev); font-family: var(--as-mono); }

/* meta */
.dic-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.dic-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); padding: 3px 9px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.dic-chip :deep(svg) { color: var(--as-text-dim); }
.dic-chip.rec { color: var(--as-amber); } .dic-chip.rec :deep(svg) { color: var(--as-amber); }
.dic-chip.warn { color: var(--as-al-lost); border-color: color-mix(in srgb, var(--as-al-lost) 28%, transparent); } .dic-chip.warn :deep(svg) { color: var(--as-al-lost); }

.dic-thumbs { display: flex; gap: 7px; }
.dic-thumb { width: 48px; height: 48px; border-radius: 10px; overflow: hidden; border: 1px solid var(--as-border-soft); transition: transform 0.2s; }
.dic-thumb:hover { transform: scale(1.06); border-color: color-mix(in srgb, var(--sev) 40%, transparent); }
.dic-thumb img { width: 100%; height: 100%; object-fit: cover; }
.dic-resolution { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 12px; color: var(--as-text-secondary); line-height: 1.5; padding: 8px 10px; border-radius: 10px; background: var(--as-surface); }
.dic-resolution :deep(svg) { color: var(--as-st-available); flex-shrink: 0; margin-top: 2px; }

/* triage pipeline */
.dic-pipe { display: flex; align-items: flex-start; }
.dic-stage { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 0; }
.dic-node { position: relative; z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--as-text-dim);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.35s var(--as-spring); }
.dic-stage.passed .dic-node { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 38%, transparent); }
.dic-stage.active .dic-node { color: var(--nc); background: color-mix(in srgb, var(--nc) 14%, transparent); border-color: color-mix(in srgb, var(--nc) 50%, transparent); transform: scale(1.1); box-shadow: 0 0 0 4px color-mix(in srgb, var(--nc) 10%, transparent); }
.dic-stage.outcome .dic-node { color: var(--nc); background: color-mix(in srgb, var(--nc) 16%, transparent); border-color: color-mix(in srgb, var(--nc) 50%, transparent); }
.dic-node-pulse { position: absolute; inset: -4px; border-radius: 12px; border: 1.5px solid color-mix(in srgb, var(--nc) 50%, transparent); animation: dic-ring 1.9s ease-out infinite; }
.dic-stage-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--as-text-dim); text-align: center; }
.dic-stage.active .dic-stage-lab, .dic-stage.outcome .dic-stage-lab { color: var(--as-text-secondary); }
.dic-link-line { position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background: var(--as-border-soft); z-index: 0; overflow: hidden; }
.dic-link-line.filled { background: color-mix(in srgb, var(--as-st-available) 45%, transparent); }

/* footer */
.dic-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.dic-actions { display: flex; gap: 7px; flex-wrap: wrap; }
.dic-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; padding: 7px 12px; border-radius: 10px;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-secondary); transition: background 0.2s, border-color 0.2s, color 0.2s; }
.dic-act:hover { background: var(--as-surface-elevated); color: var(--as-text); }
.dic-act[data-kind="advance"] { color: var(--as-st-allocated); border-color: color-mix(in srgb, var(--as-st-allocated) 30%, transparent); background: color-mix(in srgb, var(--as-st-allocated) 9%, transparent); }
.dic-act[data-kind="resolve"] { color: #08130d; background: linear-gradient(135deg, #34d399, #059669); border: none; box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--as-st-available) 70%, transparent); }
[data-theme="light"] .dic-act[data-kind="resolve"] { color: #052e1c; }
.dic-act[data-kind="writeoff"] { color: var(--as-al-lost); border-color: color-mix(in srgb, var(--as-al-lost) 34%, transparent); background: color-mix(in srgb, var(--as-al-lost) 10%, transparent); }
.dic-act[data-kind="reject"] { color: var(--as-text-muted); }
.dic-links { display: flex; gap: 6px; }
.dic-ilink { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.dic-ilink:hover { color: var(--sev); border-color: color-mix(in srgb, var(--sev) 38%, transparent); transform: translateY(-1px); }

@keyframes dic-draw { to { stroke-dashoffset: 0; } }
@keyframes dic-sweep { 0% { left: -48px; } 100% { left: 100%; } }
@keyframes dic-ring { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes dic-rail { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) {
  .dic-mon-line { animation: none; stroke-dashoffset: 0; }
  .dic-mon-sweep, .dic-rail.pulse, .dic-medal-ring, .dic-node-pulse { animation: none; }
}
</style>
