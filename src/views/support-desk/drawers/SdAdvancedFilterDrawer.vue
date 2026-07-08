<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="afd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="afd" role="dialog" aria-modal="true"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="afd-grain" aria-hidden="true" />
          <span class="afd-spine" aria-hidden="true" />
          <span class="afd-aura" aria-hidden="true" />

          <!-- ░ HEADER + live match meter ░ -->
          <header class="afd-head">
            <button class="afd-x" aria-label="Close" @click="$emit('close')"><X :size="18" /></button>
            <div class="afd-head-main">
              <div class="afd-htext">
                <p class="afd-eyebrow sd-mono"><span class="eb-glyph"><SlidersHorizontal :size="11" /></span> ADVANCED FILTERS</p>
                <h3>Refine your queue</h3>
                <p v-if="matchCount !== null" class="afd-subline">
                  <b>{{ matchCount }}</b> of {{ total }} ticket{{ total === 1 ? '' : 's' }} match
                </p>
              </div>

              <div v-if="matchCount !== null" class="afd-meter" :class="{ zero: matchCount === 0 }">
                <svg viewBox="0 0 48 48" class="meter-svg">
                  <circle class="meter-bg" cx="24" cy="24" r="20" />
                  <circle class="meter-fg" cx="24" cy="24" r="20" :stroke-dasharray="RING_CIRC" :stroke-dashoffset="ringOffset" />
                </svg>
                <span class="meter-core">
                  <span class="meter-n"><SdCountUp :value="matchCount" /></span>
                </span>
              </div>
            </div>
          </header>

          <!-- ░ ACTIVE-FILTER TOKENS (removable) ░ -->
          <Presence>
            <Motion v-if="activeTokens.length" class="afd-tokens"
              :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
              :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
              <div class="afd-tokens-row">
                <Presence>
                  <Motion as="button" v-for="tk in activeTokens" :key="tk.id" type="button" class="afd-token"
                    :style="tk.color ? { '--tc': tk.color } : null"
                    :initial="{ opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.8 }"
                    :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
                    :whileTap="{ scale: 0.92 }" @click="tk.clear()">
                    <i v-if="tk.color" class="tok-dot" /><span>{{ tk.label }}</span><X :size="11" />
                  </Motion>
                </Presence>
              </div>
            </Motion>
          </Presence>

          <!-- ░ BODY ░ -->
          <div class="afd-body">
            <Motion as="section" class="afd-sec" v-bind="secT(0)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><Activity :size="13" /></span><span class="afd-sec-t">Status</span><span v-if="d.statuses.length" class="afd-sec-n">{{ d.statuses.length }}</span></div>
              <div class="chips">
                <button v-for="s in STATUSES" :key="s.value" class="chip" :class="{ on: d.statuses.includes(s.value) }"
                  :style="{ '--cc': statusColor(s.value) }" @click="toggle('statuses', s.value)"><i class="chip-dot" />{{ s.label }}</button>
              </div>
            </Motion>

            <Motion as="section" class="afd-sec" v-bind="secT(1)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><Flag :size="13" /></span><span class="afd-sec-t">Priority</span><span v-if="d.priorities.length" class="afd-sec-n">{{ d.priorities.length }}</span></div>
              <div class="chips">
                <button v-for="p in PRIORITIES" :key="p.value" class="chip" :class="{ on: d.priorities.includes(p.value) }"
                  :style="{ '--cc': priorityColor(p.value) }" @click="toggle('priorities', p.value)"><i class="chip-dot" />{{ p.label }}</button>
              </div>
            </Motion>

            <Motion as="section" class="afd-sec" v-bind="secT(2)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><Gauge :size="13" /></span><span class="afd-sec-t">Impact &amp; urgency</span></div>
              <div class="afd-grid2">
                <SdSelect v-model="d.impact" :options="impactOpts" placeholder="Any impact" />
                <SdSelect v-model="d.urgency" :options="impactOpts" placeholder="Any urgency" />
              </div>
            </Motion>

            <Motion as="section" class="afd-sec" v-bind="secT(3)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><Timer :size="13" /></span><span class="afd-sec-t">SLA health</span></div>
              <div class="chips">
                <button v-for="h in SLA_HEALTH" :key="h.value" class="chip" :class="{ on: d.sla === h.value }"
                  :style="{ '--cc': h.color }" @click="d.sla = d.sla === h.value ? '' : h.value"><i class="chip-dot" />{{ h.label }}</button>
              </div>
            </Motion>

            <Motion as="section" class="afd-sec" v-bind="secT(4)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><Layers :size="13" /></span><span class="afd-sec-t">Category &amp; organization</span></div>
              <div class="afd-grid2">
                <SdSelect v-model="d.category_id" :options="catOpts" placeholder="Any category" />
                <SdSelect v-model="d.org_id" :options="orgOptsX" placeholder="Any organization" />
              </div>
            </Motion>

            <Motion v-if="assigneeOpts.length" as="section" class="afd-sec" v-bind="secT(5)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><UserCheck :size="13" /></span><span class="afd-sec-t">Assignee</span></div>
              <SdSelect v-model="d.assignee" :options="assigneeOptsX" placeholder="Anyone on the team" />
            </Motion>

            <Motion as="section" class="afd-sec" v-bind="secT(6)">
              <div class="afd-sec-h"><span class="afd-sec-ic"><CalendarDays :size="13" /></span><span class="afd-sec-t">Created between</span></div>
              <div class="afd-presets">
                <button v-for="p in datePresets" :key="p.id" type="button" class="afd-preset" :class="{ on: activeDatePreset === p.id }" @click="applyDatePreset(p.id)">{{ p.label }}</button>
              </div>
              <div class="afd-grid2">
                <div class="date-f"><span>From</span><SdDatePicker v-model="d.created_from" :max="d.created_to || ''" /></div>
                <div class="date-f"><span>To</span><SdDatePicker v-model="d.created_to" :min="d.created_from || ''" /></div>
              </div>
            </Motion>

            <Motion as="section" class="afd-sec switches" v-bind="secT(7)">
              <button type="button" class="afd-switch" :class="{ on: d.unassigned }" @click="d.unassigned = !d.unassigned">
                <span class="sw-ic"><UserX :size="15" /></span>
                <span class="sw-tx"><b>Only unassigned</b><i>Tickets with no agent yet</i></span>
                <span class="sw-track"><span class="sw-knob" /></span>
              </button>
              <button type="button" class="afd-switch" :class="{ on: d.escalated }" @click="d.escalated = !d.escalated">
                <span class="sw-ic"><Flame :size="15" /></span>
                <span class="sw-tx"><b>Only escalated</b><i>Raised to a higher tier</i></span>
                <span class="sw-track"><span class="sw-knob" /></span>
              </button>
            </Motion>
          </div>

          <!-- ░ FOOTER ░ -->
          <footer class="afd-foot">
            <button class="afd-btn ghost" :disabled="!activeCount" @click="clearAll"><RotateCcw :size="14" /> Clear all</button>
            <span class="afd-count">
              <b>{{ activeCount }}</b> filter{{ activeCount === 1 ? '' : 's' }}
            </span>
            <Motion as="button" class="afd-btn primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="apply">
              <Check :size="14" /> Apply
              <span v-if="matchCount !== null" class="afd-apply-n">{{ matchCount }}</span>
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  SlidersHorizontal, X, Activity, Flag, Gauge, Timer, Layers, UserCheck,
  CalendarDays, UserX, Flame, RotateCcw, Check,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdCountUp from '../components/SdCountUp.vue'
import {
  TICKET_STATUSES as STATUSES, PRIORITIES, IMPACT_URGENCY,
  priorityColor, statusColor, statusLabel, priorityLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  filters: { type: Object, default: () => ({}) },
  categoryOpts: { type: Array, default: () => [] },
  orgOpts: { type: Array, default: () => [] },
  assigneeOpts: { type: Array, default: () => [] },
  previewCount: { type: Function, default: null },
})
const emit = defineEmits(['close', 'apply'])

const blank = () => ({ statuses: [], priorities: [], impact: '', urgency: '', sla: '', category_id: '', org_id: '', assignee: '', created_from: '', created_to: '', unassigned: false, escalated: false })
const d = ref(blank())

watch(() => props.open, (v) => { if (v) d.value = { ...blank(), ...JSON.parse(JSON.stringify(props.filters || {})) } })

const SLA_HEALTH = [
  { value: 'ok', label: 'Healthy', color: 'var(--sd-success)' },
  { value: 'due-soon', label: 'At risk', color: 'var(--sd-warning)' },
  { value: 'breached', label: 'Breached', color: 'var(--sd-danger)' },
]
const impactOpts = computed(() => [{ value: '', label: 'Any' }, ...IMPACT_URGENCY])
const catOpts = computed(() => [{ value: '', label: 'Any category' }, ...props.categoryOpts])
const orgOptsX = computed(() => [{ value: '', label: 'Any organization' }, ...props.orgOpts])
const assigneeOptsX = computed(() => [{ value: '', label: 'Anyone' }, ...props.assigneeOpts])

const secT = (i) => ({
  initial: { opacity: 0, x: 22 }, animate: { opacity: 1, x: 0 },
  transition: { duration: 0.42, delay: 0.06 + i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const toggle = (key, val) => {
  const arr = d.value[key]
  const i = arr.indexOf(val)
  if (i >= 0) arr.splice(i, 1); else arr.push(val)
}

/* ── live match meter (drives the header ring) ── */
const RING_CIRC = 2 * Math.PI * 20
const matchCount = computed(() => {
  if (!props.previewCount) return null
  try { return props.previewCount(d.value) } catch { return null }
})
const total = computed(() => {
  if (!props.previewCount) return null
  try { return props.previewCount(blank()) } catch { return null }
})
const matchPct = computed(() => {
  const t = total.value
  return t && t > 0 ? Math.max(0, Math.min(1, (matchCount.value || 0) / t)) : (matchCount.value ? 1 : 0)
})
const ringOffset = computed(() => RING_CIRC - matchPct.value * RING_CIRC)

/* ── quick date presets ── */
const pad = (n) => String(n).padStart(2, '0')
const isoOf = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
const datePresets = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
]
const presetRange = (id) => {
  const now = new Date()
  const end = isoOf(now)
  if (id === 'today') return [end, end]
  if (id === '7d') { const s = new Date(now); s.setDate(s.getDate() - 6); return [isoOf(s), end] }
  if (id === '30d') { const s = new Date(now); s.setDate(s.getDate() - 29); return [isoOf(s), end] }
  if (id === 'month') return [isoOf(new Date(now.getFullYear(), now.getMonth(), 1)), end]
  return ['', '']
}
const applyDatePreset = (id) => {
  if (activeDatePreset.value === id) { d.value.created_from = ''; d.value.created_to = ''; return }
  const [from, to] = presetRange(id)
  d.value.created_from = from; d.value.created_to = to
}
const activeDatePreset = computed(() => {
  const f = d.value.created_from, t = d.value.created_to
  if (!f || !t) return ''
  for (const p of datePresets) { const [pf, pt] = presetRange(p.id); if (pf === f && pt === t) return p.id }
  return ''
})

/* ── active-filter tokens (each removable) ── */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const labelFromOpts = (opts, v) => (opts.find(o => String(o.value) === String(v))?.label) || '—'
const fmtShort = (iso) => { try { const [y, m, dd] = iso.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) } catch { return iso } }
const activeTokens = computed(() => {
  const v = d.value, out = []
  v.statuses.forEach(s => out.push({ id: 'st:' + s, label: statusLabel(s), color: statusColor(s), clear: () => toggle('statuses', s) }))
  v.priorities.forEach(p => out.push({ id: 'pr:' + p, label: priorityLabel(p), color: priorityColor(p), clear: () => toggle('priorities', p) }))
  if (v.impact) out.push({ id: 'im', label: 'Impact · ' + cap(v.impact), clear: () => { d.value.impact = '' } })
  if (v.urgency) out.push({ id: 'ur', label: 'Urgency · ' + cap(v.urgency), clear: () => { d.value.urgency = '' } })
  if (v.sla) out.push({ id: 'sla', label: SLA_HEALTH.find(h => h.value === v.sla)?.label || v.sla, color: SLA_HEALTH.find(h => h.value === v.sla)?.color, clear: () => { d.value.sla = '' } })
  if (v.category_id) out.push({ id: 'cat', label: labelFromOpts(props.categoryOpts, v.category_id), clear: () => { d.value.category_id = '' } })
  if (v.org_id) out.push({ id: 'org', label: labelFromOpts(props.orgOpts, v.org_id), clear: () => { d.value.org_id = '' } })
  if (v.assignee) out.push({ id: 'asg', label: labelFromOpts(props.assigneeOpts, v.assignee), clear: () => { d.value.assignee = '' } })
  if (v.created_from) out.push({ id: 'cf', label: 'From ' + fmtShort(v.created_from), clear: () => { d.value.created_from = '' } })
  if (v.created_to) out.push({ id: 'ct', label: 'To ' + fmtShort(v.created_to), clear: () => { d.value.created_to = '' } })
  if (v.unassigned) out.push({ id: 'un', label: 'Unassigned', clear: () => { d.value.unassigned = false } })
  if (v.escalated) out.push({ id: 'esc', label: 'Escalated', clear: () => { d.value.escalated = false } })
  return out
})
const activeCount = computed(() => activeTokens.value.length)

const apply = () => emit('apply', JSON.parse(JSON.stringify(d.value)))
// Local reset only — the live preview updates instantly; commit happens on Apply (drawer stays open).
const clearAll = () => { d.value = blank() }
</script>

<style scoped>
.afd-overlay { position: fixed; inset: 0; z-index: 2300; display: flex; justify-content: flex-end; background: rgba(4,5,6,0.58); backdrop-filter: blur(8px); }
[data-theme="light"] .afd-overlay { background: rgba(40,25,10,0.3); }
.afd { position: relative; width: min(500px, 100vw); height: 100%; display: flex; flex-direction: column; background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong); box-shadow: -28px 0 80px rgba(0,0,0,0.55); overflow: hidden; }
.afd-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: radial-gradient(rgba(251,191,36,0.05) 1px, transparent 1px); background-size: 22px 22px; -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 55%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 55%); }
.afd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sd-grad-rail); opacity: 0.85; }
.afd-aura { position: absolute; top: -90px; right: -70px; width: 320px; height: 320px; pointer-events: none; border-radius: 50%; background: radial-gradient(circle, rgba(251,146,60,0.22), transparent 66%); filter: blur(34px); animation: afd-drift 18s ease-in-out infinite; }

/* ── header ── */
.afd-head { position: relative; padding: 22px 22px 16px; border-bottom: 1px solid var(--sd-border); }
.afd-head-main { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.afd-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-amber); margin: 0 0 6px; }
.eb-glyph { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.afd-head h3 { font-size: 20px; font-weight: 800; color: var(--sd-text); margin: 0; letter-spacing: -0.02em; }
.afd-subline { margin: 6px 0 0; font-size: 12px; color: var(--sd-text-muted); font-family: var(--sd-mono); }
.afd-subline b { color: var(--sd-amber); font-weight: 800; }
.afd-x { position: absolute; top: 16px; right: 16px; z-index: 3; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.18s; }
.afd-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }

.afd-meter { position: relative; width: 60px; height: 60px; flex-shrink: 0; display: grid; place-items: center; }
.meter-svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.meter-bg { fill: none; stroke: var(--sd-border-strong); stroke-width: 4; }
.meter-fg { fill: none; stroke: var(--sd-amber); stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset 0.6s var(--sd-spring), stroke 0.3s; filter: drop-shadow(0 0 5px var(--sd-amber-soft)); }
.afd-meter.zero .meter-fg { stroke: var(--sd-text-dim); }
.meter-core { position: relative; display: grid; place-items: center; }
.meter-n { font-family: var(--sd-mono); font-size: 17px; font-weight: 800; color: var(--sd-text); line-height: 1; }

/* ── active-filter tokens ── */
.afd-tokens { overflow: hidden; border-bottom: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.afd-tokens-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 22px; }
.afd-token { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--tc, var(--sd-text-secondary)); background: color-mix(in srgb, var(--tc, var(--sd-steel)) 12%, transparent); border: 1px solid color-mix(in srgb, var(--tc, var(--sd-border-strong)) 36%, transparent); transition: background 0.15s, border-color 0.15s; }
.afd-token:hover { background: color-mix(in srgb, var(--tc, var(--sd-steel)) 20%, transparent); }
.afd-token .tok-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tc); box-shadow: 0 0 6px var(--tc); }
.afd-token svg { opacity: 0.7; }
.afd-token:hover svg { opacity: 1; }

/* ── body ── */
.afd-body { position: relative; flex: 1; overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 20px; scrollbar-width: thin; scrollbar-color: var(--sd-border-strong) transparent; }
.afd-body::-webkit-scrollbar { width: 8px; }
.afd-body::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid transparent; background: var(--sd-border-strong); background-clip: padding-box; }
.afd-body::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--sd-amber) 50%, var(--sd-border-strong)); background-clip: padding-box; }
.afd-sec { display: flex; flex-direction: column; gap: 11px; }
.afd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.afd-sec-h { display: flex; align-items: center; gap: 9px; }
.afd-sec-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); flex-shrink: 0; }
.afd-sec-t { font-size: 12px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--sd-text-secondary); }
.afd-sec-n { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10px; font-weight: 800; font-family: var(--sd-mono); color: #1a1206; background: var(--sd-amber); }
[data-theme="light"] .afd-sec-n { color: #fff8ec; }

.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cc); opacity: 0.5; transition: opacity 0.18s; }
.chip:hover { border-color: color-mix(in srgb, var(--cc) 45%, transparent); transform: translateY(-1px); }
.chip.on { color: var(--cc); background: color-mix(in srgb, var(--cc) 13%, transparent); border-color: color-mix(in srgb, var(--cc) 45%, transparent); }
.chip.on .chip-dot { opacity: 1; box-shadow: 0 0 7px var(--cc); }

.afd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.afd-preset { padding: 6px 12px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.afd-preset:hover { color: var(--sd-amber); border-color: var(--sd-amber-border); }
.afd-preset.on { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; box-shadow: 0 5px 14px rgba(251,146,60,0.26); }
[data-theme="light"] .afd-preset.on { color: #fff8ec; }
.date-f { display: flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 600; color: var(--sd-text-muted); }

/* ── switch cards ── */
.afd-sec.switches { gap: 10px; }
.afd-switch { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); border-radius: 13px; padding: 11px 13px; transition: border-color 0.18s var(--sd-spring), background 0.18s; }
.afd-switch:hover { border-color: var(--sd-amber-border); }
.afd-switch.on { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.sw-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.afd-switch.on .sw-ic { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .afd-switch.on .sw-ic { color: #fff8ec; }
.sw-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sw-tx b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.sw-tx i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.sw-track { width: 40px; height: 22px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); position: relative; flex-shrink: 0; transition: all 0.24s var(--sd-spring); }
.afd-switch.on .sw-track { background: var(--sd-grad-hero); border-color: transparent; }
.sw-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--sd-text-muted); transition: all 0.24s var(--sd-spring); }
.afd-switch.on .sw-knob { left: 20px; background: #1a1206; }

/* ── footer ── */
.afd-foot { position: relative; display: flex; align-items: center; gap: 12px; padding: 15px 22px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.afd-count { flex: 1; text-align: center; font-size: 12px; color: var(--sd-text-muted); font-family: var(--sd-mono); }
.afd-count b { color: var(--sd-text); }
.afd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: opacity 0.18s; }
.afd-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.afd-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.afd-btn.ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.afd-btn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251,146,60,0.28); }
[data-theme="light"] .afd-btn.primary { color: #fff8ec; }
.afd-apply-n { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10px; font-weight: 800; font-family: var(--sd-mono); color: var(--sd-amber); background: rgba(26,18,6,0.22); }
[data-theme="light"] .afd-apply-n { color: #fff8ec; background: rgba(255,255,255,0.22); }

@keyframes afd-drift { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-20px, 24px); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .afd-aura { animation: none; }
}
</style>
