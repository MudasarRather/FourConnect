<template>
  <div ref="rootEl" class="sdt" :class="{ open, disabled }">
    <!-- trigger -->
    <button
      ref="triggerEl" type="button" class="sdt-trigger" :disabled="disabled"
      :aria-expanded="open" @click="toggle" @keydown="onTrigKey"
    >
      <span class="sdt-trig-ic"><CalendarClock :size="14" /></span>
      <span class="sdt-trig-val" :class="{ placeholder: !modelValue }">
        {{ modelValue ? displayLabel : placeholder }}
      </span>
      <button
        v-if="modelValue && clearable && !disabled" type="button" class="sdt-trig-clear"
        @click.stop="clearAll" aria-label="Clear"
      ><X :size="11" /></button>
      <span class="sdt-trig-chevron" :class="{ up: open }"><ChevronDown :size="14" /></span>
    </button>

    <teleport to="body">
      <transition name="sdt-pop">
        <div v-if="open" class="sdt-layer" @mousedown.self="close">
        <div
          ref="popoverEl" class="sdt-pop"
          tabindex="-1" @keydown="onPopKey" @mousedown.stop @click.stop
        >
          <span class="sdt-pop-grain" aria-hidden="true" />
          <span class="sdt-pop-aura" aria-hidden="true" />

          <!-- ░ CALENDAR ░ -->
          <header class="sdt-head">
            <button type="button" class="sdt-nav" @click="shiftMonth(-1)" aria-label="Previous month"><ChevronLeft :size="15" /></button>
            <div class="sdt-head-title">
              <span class="sdt-month">{{ monthName }}</span>
              <span class="sdt-year sd-mono">{{ viewYear }}</span>
            </div>
            <button type="button" class="sdt-nav" @click="shiftMonth(1)" aria-label="Next month"><ChevronRight :size="15" /></button>
          </header>

          <transition :name="`sdt-slide-${slideDir}`" mode="out-in">
            <div :key="`${viewYear}-${viewMonth}`" class="sdt-grid">
              <div class="sdt-weekdays">
                <span v-for="(d, i) in ['S','M','T','W','T','F','S']" :key="i">{{ d }}</span>
              </div>
              <div class="sdt-days">
                <button
                  v-for="cell in days" :key="cell.iso" type="button" class="sdt-day"
                  :class="{ other: !cell.inMonth, today: cell.isToday, selected: cell.isSelected, disabled: cell.disabled }"
                  :disabled="cell.disabled" @click="pickDay(cell)"
                >
                  <span class="sdt-day-n">{{ cell.d }}</span>
                  <span v-if="cell.isToday && !cell.isSelected" class="sdt-day-ring" />
                </button>
              </div>
            </div>
          </transition>

          <!-- ░ ULTRA-MODERN TIME ROLLER ░ -->
          <div class="sdt-time">
            <div class="sdt-time-lead">
              <span class="sdt-time-ic"><Clock3 :size="13" /></span>
              <span class="sdt-time-lbl">Time</span>
              <span class="sdt-time-readout sd-mono">{{ pad(hour) }}<i class="sep">:</i>{{ pad(minute) }}</span>
            </div>

            <div class="sdt-rolls">
              <!-- hours -->
              <div class="sdt-roll">
                <span class="sdt-roll-cap">HRS</span>
                <div class="sdt-wheel" ref="hourWheel" @scroll.passive="onWheelScroll('hour', $event)">
                  <span class="sdt-spacer" />
                  <button
                    v-for="h in 24" :key="'h' + (h - 1)" type="button" class="sdt-tick"
                    :class="{ on: hour === h - 1 }" @click="selectUnit('hour', h - 1)"
                  >{{ pad(h - 1) }}</button>
                  <span class="sdt-spacer" />
                </div>
              </div>

              <span class="sdt-roll-colon sd-mono">:</span>

              <!-- minutes -->
              <div class="sdt-roll">
                <span class="sdt-roll-cap">MIN</span>
                <div class="sdt-wheel" ref="minuteWheel" @scroll.passive="onWheelScroll('minute', $event)">
                  <span class="sdt-spacer" />
                  <button
                    v-for="m in 60" :key="'m' + (m - 1)" type="button" class="sdt-tick"
                    :class="{ on: minute === m - 1 }" @click="selectUnit('minute', m - 1)"
                  >{{ pad(m - 1) }}</button>
                  <span class="sdt-spacer" />
                </div>
              </div>

              <!-- selection band -->
              <span class="sdt-band" aria-hidden="true" />
            </div>

            <!-- quick presets -->
            <div class="sdt-presets">
              <button v-for="p in presets" :key="p.label" type="button" class="sdt-preset" @click="applyPreset(p)">{{ p.label }}</button>
            </div>
          </div>

          <!-- footer -->
          <footer class="sdt-foot">
            <button type="button" class="sdt-fbtn" @click="setNow"><Sparkles :size="12" /> Now</button>
            <button v-if="clearable" type="button" class="sdt-fbtn" @click="clearAll">Clear</button>
            <button type="button" class="sdt-fbtn primary" @click="confirmDone"><Check :size="13" /> Done</button>
          </footer>
        </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import {
  CalendarClock, ChevronLeft, ChevronRight, ChevronDown, X, Clock3, Check, Sparkles,
} from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' }, // "YYYY-MM-DDTHH:mm"
  placeholder: { type: String, default: 'Pick date & time' },
  disabled: { type: Boolean, default: false },
  min: { type: String, default: '' },        // ISO yyyy-mm-dd lower bound (optional)
  clearable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'change'])

const ITEM_H = 34 // keep in sync with .sdt-tick height + .sdt-spacer math

const rootEl = ref(null)
const triggerEl = ref(null)
const popoverEl = ref(null)
const hourWheel = ref(null)
const minuteWheel = ref(null)
const open = ref(false)
const slideDir = ref('right')

const today = new Date()
const dateIso = ref('')      // yyyy-mm-dd
const hour = ref(9)
const minute = ref(0)

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

/* ── parse incoming value ── */
const hydrate = (v) => {
  if (v && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    const [d, t] = v.split('T')
    dateIso.value = d
    const [h, m] = t.split(':').map(Number)
    hour.value = Number.isFinite(h) ? h : 9
    minute.value = Number.isFinite(m) ? m : 0
    const dt = parseIso(d)
    viewYear.value = dt.getFullYear(); viewMonth.value = dt.getMonth()
  } else {
    dateIso.value = ''
    hour.value = 9; minute.value = 0
  }
}
watch(() => props.modelValue, (v) => { if (!open.value) hydrate(v) }, { immediate: true })

/* ── helpers ── */
const pad = (n) => String(n).padStart(2, '0')
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
function toIso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const monthName = computed(() => new Date(viewYear.value, viewMonth.value, 1).toLocaleString(undefined, { month: 'long' }))
const displayLabel = computed(() => {
  if (!props.modelValue) return ''
  try {
    const dt = parseIso(dateIso.value)
    return `${dt.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })} · ${pad(hour.value)}:${pad(minute.value)}`
  } catch { return props.modelValue }
})

const days = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = first.getDay()
  const start = new Date(viewYear.value, viewMonth.value, 1 - startWeekday)
  const todayIso = toIso(today)
  const minIso = props.min || ''
  const out = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const iso = toIso(d)
    out.push({
      d: d.getDate(), iso,
      inMonth: d.getMonth() === viewMonth.value,
      isToday: iso === todayIso,
      isSelected: iso === dateIso.value,
      disabled: !!minIso && iso < minIso,
    })
  }
  return out
})

const presets = [
  { label: 'In 1h', addMin: 60 },
  { label: 'In 4h', addMin: 240 },
  { label: 'Tomorrow 9:00', tomorrow: true, h: 9, m: 0 },
  { label: 'Next week', addDay: 7, h: 9, m: 0 },
]

/* ── open / close (centered floating panel — robust inside tight modals) ── */
const toggle = () => { if (props.disabled) return; open.value ? close() : openIt() }
const openIt = async () => {
  if (open.value) return
  hydrate(props.modelValue)
  open.value = true
  await nextTick()
  popoverEl.value?.focus()
  scrollWheel('hour', hour.value, false)
  scrollWheel('minute', minute.value, false)
}
const close = () => { open.value = false }

/* ── calendar interactions ── */
const shiftMonth = (delta) => {
  slideDir.value = delta > 0 ? 'right' : 'left'
  const m = viewMonth.value + delta
  if (m < 0) { viewMonth.value = 11; viewYear.value-- }
  else if (m > 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value = m
}
const pickDay = (cell) => { if (cell.disabled) return; dateIso.value = cell.iso; commit() }

/* ── time wheel interactions ── */
const wheelFor = (unit) => (unit === 'hour' ? hourWheel.value : minuteWheel.value)
const scrollWheel = (unit, idx, smooth = true) => {
  const el = wheelFor(unit); if (!el) return
  el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' })
}
const selectUnit = (unit, val) => {
  if (unit === 'hour') hour.value = val; else minute.value = val
  scrollWheel(unit, val, true)
  commit()
}
let scrollTimers = { hour: null, minute: null }
const onWheelScroll = (unit, e) => {
  const el = e.target
  clearTimeout(scrollTimers[unit])
  scrollTimers[unit] = setTimeout(() => {
    const idx = Math.max(0, Math.min(unit === 'hour' ? 23 : 59, Math.round(el.scrollTop / ITEM_H)))
    if (unit === 'hour' && hour.value !== idx) { hour.value = idx; commit() }
    else if (unit === 'minute' && minute.value !== idx) { minute.value = idx; commit() }
  }, 110)
}

/* ── presets ── */
const applyPreset = (p) => {
  const base = new Date()
  if (p.addMin) base.setMinutes(base.getMinutes() + p.addMin)
  if (p.tomorrow) base.setDate(base.getDate() + 1)
  if (p.addDay) base.setDate(base.getDate() + p.addDay)
  if (p.h != null) base.setHours(p.h, p.m || 0, 0, 0)
  dateIso.value = toIso(base)
  hour.value = base.getHours(); minute.value = base.getMinutes()
  viewYear.value = base.getFullYear(); viewMonth.value = base.getMonth()
  nextTick(() => { scrollWheel('hour', hour.value); scrollWheel('minute', minute.value) })
  commit()
}
const setNow = () => applyPreset({ })

/* ── commit / clear ── */
const commit = () => {
  if (!dateIso.value) return
  const v = `${dateIso.value}T${pad(hour.value)}:${pad(minute.value)}`
  emit('update:modelValue', v); emit('change', v)
}
const clearAll = () => {
  dateIso.value = ''; hour.value = 9; minute.value = 0
  emit('update:modelValue', ''); emit('change', '')
}
const confirmDone = () => { commit(); close() }

/* ── keyboard ── */
const onTrigKey = (e) => { if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); openIt() } }
const onPopKey = (e) => {
  if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); shiftMonth(-1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); shiftMonth(1) }
}

onBeforeUnmount(() => {
  clearTimeout(scrollTimers.hour)
  clearTimeout(scrollTimers.minute)
})
</script>

<style scoped>
.sdt { display: block; position: relative; }

/* ── trigger ── */
.sdt-trigger {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 10px 12px;
  border-radius: 11px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.24s var(--sd-spring), background 0.2s;
}
.sdt-trigger:hover:not(:disabled) { border-color: var(--sd-amber-border); }
.sdt.open .sdt-trigger { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); background: var(--sd-surface-glass); }
.sdt.disabled .sdt-trigger { opacity: 0.55; cursor: not-allowed; }
.sdt-trig-ic { display: grid; place-items: center; color: var(--sd-text-muted); transition: color 0.2s; }
.sdt.open .sdt-trig-ic { color: var(--sd-amber); }
.sdt-trig-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.sdt-trig-val.placeholder { color: var(--sd-text-dim); font-weight: 500; }
.sdt-trig-clear { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 6px; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface-glass); transition: all 0.15s; }
.sdt-trig-clear:hover { color: var(--sd-danger); background: var(--sd-danger-soft); }
.sdt-trig-chevron { display: grid; place-items: center; color: var(--sd-text-dim); transition: transform 0.3s var(--sd-spring); }
.sdt-trig-chevron.up { transform: rotate(180deg); color: var(--sd-amber); }

/* ── centered floating layer (works inside tight modals; never overlaps content) ── */
.sdt-layer { position: fixed; inset: 0; z-index: 6000; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(60% 60% at 50% 45%, rgba(251, 146, 60, 0.1), transparent 70%), rgba(4, 5, 6, 0.52);
  backdrop-filter: blur(6px) saturate(115%); }
[data-theme="light"] .sdt-layer { background: radial-gradient(60% 60% at 50% 45%, rgba(234, 88, 12, 0.1), transparent 70%), rgba(40, 25, 10, 0.34); }

.sdt-pop {
  position: relative; width: min(310px, 94vw); max-height: 90vh; overflow: hidden auto;
  padding: 14px; display: flex; flex-direction: column; gap: 10px;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 18px;
  box-shadow: var(--sd-shadow-hover); backdrop-filter: blur(28px) saturate(150%);
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--sd-amber) 50%, transparent) transparent;
}
.sdt-pop::-webkit-scrollbar { width: 8px; }
.sdt-pop::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid transparent; background: color-mix(in srgb, var(--sd-amber) 42%, var(--sd-border-strong)); background-clip: padding-box; }
.sdt-pop-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: inherit; background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px); background-size: 16px 16px; }
.sdt-pop-aura { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 240px; height: 150px; pointer-events: none; background: radial-gradient(circle at 50% 0%, rgba(251, 146, 60, 0.28), transparent 68%); filter: blur(20px); opacity: 0.5; }

.sdt-head { position: relative; display: flex; align-items: center; justify-content: space-between; }
.sdt-nav { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.sdt-nav:hover { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.sdt-head-title { display: inline-flex; align-items: baseline; gap: 7px; }
.sdt-month { font-size: 13.5px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.sdt-year { font-size: 12px; font-weight: 700; color: var(--sd-amber); }

.sdt-grid { position: relative; display: flex; flex-direction: column; gap: 5px; }
.sdt-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.sdt-weekdays span { text-align: center; font-size: 9.5px; font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
.sdt-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.sdt-day { position: relative; height: 31px; border: none; border-radius: 9px; cursor: pointer; background: transparent; color: var(--sd-text-secondary); font-size: 12px; font-family: var(--sd-mono); display: grid; place-items: center; transition: all 0.16s var(--sd-spring); }
.sdt-day:hover:not(:disabled):not(.selected) { background: var(--sd-amber-soft); color: var(--sd-text); transform: translateY(-1px); }
.sdt-day.other { color: var(--sd-text-dim); opacity: 0.5; }
.sdt-day.disabled { opacity: 0.28; cursor: not-allowed; }
.sdt-day.selected { background: var(--sd-grad-hero); color: #1a1206; font-weight: 800; box-shadow: 0 5px 14px -4px var(--sd-fluid-glow); }
[data-theme="light"] .sdt-day.selected { color: #fff8ec; }
.sdt-day-n { position: relative; }
.sdt-day-ring { position: absolute; inset: 3px; border-radius: 7px; border: 1px solid var(--sd-amber-border); pointer-events: none; animation: sdt-pulse 2.4s ease-in-out infinite; }
@keyframes sdt-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

/* ── time roller ── */
.sdt-time { position: relative; padding: 11px; border-radius: 14px; background: var(--sd-surface); border: 1px solid var(--sd-border); display: flex; flex-direction: column; gap: 10px; }
.sdt-time-lead { display: flex; align-items: center; gap: 7px; }
.sdt-time-ic { display: grid; place-items: center; color: var(--sd-amber); }
.sdt-time-lbl { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }
.sdt-time-readout { margin-left: auto; font-size: 18px; font-weight: 800; color: var(--sd-text); letter-spacing: 0.04em; }
.sdt-time-readout .sep { font-style: normal; color: var(--sd-amber); animation: sdt-blink 1.6s steps(1) infinite; }
@keyframes sdt-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.3; } }

.sdt-rolls { position: relative; display: flex; align-items: flex-end; justify-content: center; gap: 6px; }
.sdt-roll { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.sdt-roll-cap { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.sdt-roll-colon { font-size: 22px; font-weight: 800; color: var(--sd-text-dim); padding-bottom: 56px; }
.sdt-wheel {
  position: relative; width: 64px; height: 170px; overflow-y: auto; border-radius: 12px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  scroll-snap-type: y mandatory; scrollbar-width: none;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 24%, #000 76%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 24%, #000 76%, transparent);
}
.sdt-wheel::-webkit-scrollbar { display: none; }
.sdt-spacer { display: block; height: 68px; flex-shrink: 0; } /* (170 - 34) / 2 */
.sdt-tick { display: flex; align-items: center; justify-content: center; height: 34px; width: 100%; scroll-snap-align: center; border: none; background: none; cursor: pointer; font-family: var(--sd-mono); font-size: 14px; font-weight: 700; color: var(--sd-text-dim); transition: color 0.16s, transform 0.16s; }
.sdt-tick:hover { color: var(--sd-text-secondary); }
.sdt-tick.on { color: var(--sd-amber); transform: scale(1.18); text-shadow: 0 0 14px var(--sd-fluid-glow); }
.sdt-band { position: absolute; left: 4px; right: 4px; top: 50%; height: 34px; transform: translateY(-50%); border-radius: 9px; pointer-events: none; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); box-shadow: inset 0 0 12px rgba(251, 146, 60, 0.12); }

.sdt-presets { display: flex; flex-wrap: wrap; gap: 5px; }
.sdt-preset { flex: 1 1 auto; padding: 6px 8px; border-radius: 8px; font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.sdt-preset:hover { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); transform: translateY(-1px); }

/* ── footer ── */
.sdt-foot { position: relative; display: flex; gap: 6px; }
.sdt-fbtn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 10px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.16s var(--sd-spring); }
.sdt-fbtn:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.sdt-fbtn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 16px rgba(251, 146, 60, 0.26); }
[data-theme="light"] .sdt-fbtn.primary { color: #fff8ec; }
.sdt-fbtn.primary:hover { filter: brightness(1.06); }

/* ── transitions (layer fades, panel scales) ── */
.sdt-pop-enter-active, .sdt-pop-leave-active { transition: opacity 0.22s var(--sd-spring); }
.sdt-pop-enter-active .sdt-pop, .sdt-pop-leave-active .sdt-pop { transition: transform 0.28s var(--sd-spring), opacity 0.22s var(--sd-spring); }
.sdt-pop-enter-from, .sdt-pop-leave-to { opacity: 0; }
.sdt-pop-enter-from .sdt-pop, .sdt-pop-leave-to .sdt-pop { opacity: 0; transform: scale(0.95) translateY(8px); }
.sdt-slide-right-enter-active, .sdt-slide-right-leave-active,
.sdt-slide-left-enter-active, .sdt-slide-left-leave-active { transition: opacity 0.2s var(--sd-spring), transform 0.2s var(--sd-spring); }
.sdt-slide-right-enter-from { opacity: 0; transform: translateX(13px); }
.sdt-slide-right-leave-to   { opacity: 0; transform: translateX(-9px); }
.sdt-slide-left-enter-from  { opacity: 0; transform: translateX(-13px); }
.sdt-slide-left-leave-to    { opacity: 0; transform: translateX(9px); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sdt-day-ring,
  html:not([data-cinematic="on"]) .sdt-time-readout .sep { animation: none; }
}
</style>
