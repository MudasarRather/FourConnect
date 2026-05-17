<template>
  <div ref="rootEl" class="hr-dp" :class="{ open, error, disabled, focused }">
    <button
      ref="triggerEl"
      type="button"
      class="hr-dp-trigger"
      :disabled="disabled"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onTrigKey"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="trig-cal">
        <rect x="2" y="3" width="12" height="11" rx="1.5" />
        <line x1="2" y1="6.5" x2="14" y2="6.5" />
        <line x1="5.5" y1="2" x2="5.5" y2="4.5" />
        <line x1="10.5" y1="2" x2="10.5" y2="4.5" />
      </svg>
      <span class="trig-value" :class="{ placeholder: !modelValue }">
        {{ modelValue ? formatDate(modelValue) : placeholder }}
      </span>
      <button
        v-if="modelValue && clearable && !disabled"
        type="button"
        class="trig-clear"
        @click.stop="clear"
        aria-label="Clear date"
      >
        <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </button>

    <teleport to="body">
      <transition name="hr-pop">
        <div
          v-if="open"
          class="hr-dp-popover"
          :style="popoverStyle"
          ref="popoverEl"
          tabindex="-1"
          @keydown="onPopKey"
        >
          <header class="dp-head">
            <button type="button" class="nav-btn" @click="shiftMonth(-1)" aria-label="Previous month">
              <svg viewBox="0 0 10 10" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,1 2,5 6,9" /></svg>
            </button>
            <div class="head-title">
              <button type="button" class="title-btn" @click="cycleView">
                <span>{{ monthName }}</span>
                <span class="title-year">{{ viewYear }}</span>
              </button>
            </div>
            <button type="button" class="nav-btn" @click="shiftMonth(1)" aria-label="Next month">
              <svg viewBox="0 0 10 10" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,1 8,5 4,9" /></svg>
            </button>
          </header>

          <!-- Day grid -->
          <transition :name="`dp-slide-${slideDir}`" mode="out-in">
            <div :key="`${viewYear}-${viewMonth}`" class="dp-grid">
              <div class="dp-weekdays">
                <span v-for="d in ['S','M','T','W','T','F','S']" :key="d + Math.random()">{{ d }}</span>
              </div>
              <div class="dp-days">
                <button
                  v-for="cell in days"
                  :key="cell.iso"
                  type="button"
                  class="dp-day"
                  :class="{ other: !cell.inMonth, today: cell.isToday, selected: cell.isSelected, disabled: cell.disabled }"
                  :disabled="cell.disabled"
                  @click="pick(cell)"
                >
                  <span class="dp-day-num">{{ cell.d }}</span>
                  <span v-if="cell.isToday && !cell.isSelected" class="dp-day-ring" />
                </button>
              </div>
            </div>
          </transition>

          <footer class="dp-foot">
            <button type="button" class="foot-btn" @click="pickToday">Today</button>
            <button v-if="clearable" type="button" class="foot-btn" @click="clear">Clear</button>
            <button type="button" class="foot-btn primary" @click="close">Done</button>
          </footer>
        </div>
      </transition>
    </teleport>
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // ISO yyyy-mm-dd
  placeholder: { type: String, default: 'dd / mm / yyyy' },
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  clearable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const triggerEl = ref(null)
const popoverEl = ref(null)
const open = ref(false)
const focused = ref(false)
const popoverStyle = ref({})
const slideDir = ref('right')

const today = new Date()
const startDate = computed(() => {
  if (props.modelValue) return parseIso(props.modelValue)
  return new Date(today.getFullYear(), today.getMonth(), 1)
})

const viewYear = ref(startDate.value.getFullYear())
const viewMonth = ref(startDate.value.getMonth())

watch(() => props.modelValue, (v) => {
  if (v) {
    const d = parseIso(v)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
})

const monthName = computed(() => new Date(viewYear.value, viewMonth.value, 1).toLocaleString(undefined, { month: 'long' }))

function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function toIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function formatDate(iso) {
  if (!iso) return ''
  try {
    return parseIso(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
  } catch { return iso }
}

const days = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = first.getDay() // 0=Sun
  const out = []
  // 42 cells, starting from preceding Sunday
  const start = new Date(viewYear.value, viewMonth.value, 1 - startWeekday)
  const todayIso = toIso(today)
  const minIso = props.min || ''
  const maxIso = props.max || ''
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toIso(d)
    out.push({
      d: d.getDate(),
      iso,
      inMonth: d.getMonth() === viewMonth.value,
      isToday: iso === todayIso,
      isSelected: iso === props.modelValue,
      disabled: (!!minIso && iso < minIso) || (!!maxIso && iso > maxIso),
    })
  }
  return out
})

const toggle = () => {
  if (props.disabled) return
  open.value ? close() : openIt()
}

const openIt = async () => {
  if (open.value) return
  open.value = true
  focused.value = true
  positionPopover()
  await nextTick()
  popoverEl.value?.focus()
  window.addEventListener('mousedown', onDocClick, true)
  window.addEventListener('scroll', positionPopover, true)
  window.addEventListener('resize', positionPopover)
}

const close = () => {
  if (!open.value) return
  open.value = false
  focused.value = false
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
}

const onDocClick = (e) => {
  if (rootEl.value?.contains(e.target)) return
  if (popoverEl.value?.contains(e.target)) return
  close()
}

const positionPopover = () => {
  const t = triggerEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const vpH = window.innerHeight
  const popH = 322
  const placeBelow = vpH - r.bottom >= popH || vpH - r.bottom >= r.top
  const left = Math.max(8, Math.min(window.innerWidth - 280 - 8, r.left))
  popoverStyle.value = {
    position: 'fixed',
    left: left + 'px',
    top: placeBelow ? (r.bottom + 6) + 'px' : 'auto',
    bottom: placeBelow ? 'auto' : (vpH - r.top + 6) + 'px',
    width: '280px',
    '--hr-pop-origin': placeBelow ? 'top' : 'bottom',
  }
}

const shiftMonth = (delta) => {
  slideDir.value = delta > 0 ? 'right' : 'left'
  const m = viewMonth.value + delta
  if (m < 0) { viewMonth.value = 11; viewYear.value-- }
  else if (m > 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value = m
}

const pick = (cell) => {
  if (cell.disabled) return
  emit('update:modelValue', cell.iso)
  emit('change', cell.iso)
  close()
}

const pickToday = () => {
  const iso = toIso(today)
  emit('update:modelValue', iso)
  emit('change', iso)
  close()
}

const clear = () => {
  emit('update:modelValue', '')
  emit('change', '')
}

const onTrigKey = (e) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault(); openIt()
  }
}

const onPopKey = (e) => {
  if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); shiftMonth(-1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); shiftMonth(1) }
}

const cycleView = () => { /* future: month/year picker — stays minimal for 1.0.1 */ }

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
})
</script>

<style scoped>
.hr-dp { display: block; position: relative; }
.hr-dp-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  padding: 0 12px;
  color: var(--hr-input-text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 200ms var(--hr-spring),
              border-color 200ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
}
.hr-dp-trigger:hover:not(:disabled) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-dp.open .hr-dp-trigger,
.hr-dp.focused .hr-dp-trigger {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
.hr-dp.error .hr-dp-trigger { border-color: var(--hr-input-error); background: var(--hr-input-error-soft); }
.hr-dp.disabled .hr-dp-trigger { opacity: 0.6; cursor: not-allowed; }

.trig-cal { color: var(--hr-text-muted); flex-shrink: 0; }
.hr-dp.open .trig-cal { color: var(--hr-accent-gold); }
.trig-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--hr-mono); font-size: 12.5px; }
.trig-value.placeholder { color: var(--hr-input-placeholder); font-family: inherit; }

.trig-clear {
  width: 18px; height: 18px;
  border: 0;
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: all 150ms;
}
.trig-clear:hover { background: rgba(239, 68, 68, 0.18); color: #ef4444; }

/* Popover */
.hr-dp-popover {
  z-index: 1400;
  background: var(--hr-surface-deep);
  border: 1px solid var(--hr-border-strong);
  border-radius: 14px;
  box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform-origin: var(--hr-pop-origin, top) center;
}

.dp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
}
.nav-btn {
  width: 28px; height: 28px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--hr-border);
  border-radius: 8px;
  color: var(--hr-text-muted);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 180ms var(--hr-spring);
}
.nav-btn:hover {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.head-title { flex: 1; display: flex; justify-content: center; }
.title-btn {
  background: transparent;
  border: 0;
  color: var(--hr-text);
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  letter-spacing: -0.01em;
  cursor: pointer;
}
.title-year {
  color: var(--hr-accent-gold);
  font-family: var(--hr-mono);
  font-size: 12px;
}

.dp-grid { display: flex; flex-direction: column; gap: 4px; }
.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 0 2px;
}
.dp-weekdays span {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.dp-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dp-day {
  position: relative;
  height: 30px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--hr-text-secondary);
  font-size: 12px;
  font-family: var(--hr-mono);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 160ms var(--hr-spring);
}
.dp-day:hover:not(:disabled):not(.selected) {
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-text);
  transform: translateY(-1px);
}
.dp-day.other { color: var(--hr-text-dim); opacity: 0.55; }
.dp-day.disabled { opacity: 0.3; cursor: not-allowed; }
.dp-day.selected {
  background: var(--hr-gradient-rail-active);
  color: #1a1a1c;
  font-weight: 700;
  box-shadow: 0 4px 12px -3px rgba(251, 146, 60, 0.6);
}
.dp-day-ring {
  position: absolute;
  inset: 3px;
  border-radius: 7px;
  border: 1px solid var(--hr-accent-gold-border);
  pointer-events: none;
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}

.dp-foot {
  display: flex;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--hr-border);
  margin-top: 4px;
}
.foot-btn {
  flex: 1;
  background: transparent;
  border: 1px solid var(--hr-border-strong);
  border-radius: 8px;
  color: var(--hr-text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  padding: 7px 10px;
  cursor: pointer;
  transition: all 160ms var(--hr-spring);
}
.foot-btn:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.foot-btn.primary {
  background: var(--hr-accent-gold);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
}
.foot-btn.primary:hover { background: var(--hr-accent-gold-strong); }

/* Pop + month-slide transitions */
.hr-pop-enter-active, .hr-pop-leave-active {
  transition: opacity 180ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.hr-pop-enter-from, .hr-pop-leave-to { opacity: 0; transform: scale(0.96); }

.dp-slide-right-enter-active, .dp-slide-right-leave-active,
.dp-slide-left-enter-active, .dp-slide-left-leave-active {
  transition: opacity 200ms var(--hr-spring), transform 200ms var(--hr-spring);
}
.dp-slide-right-enter-from { opacity: 0; transform: translateX(12px); }
.dp-slide-right-leave-to   { opacity: 0; transform: translateX(-8px); }
.dp-slide-left-enter-from  { opacity: 0; transform: translateX(-12px); }
.dp-slide-left-leave-to    { opacity: 0; transform: translateX(8px); }

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}
</style>
