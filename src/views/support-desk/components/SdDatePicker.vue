<template>
  <div ref="rootEl" class="sdd" :class="{ open, disabled }">
    <!-- trigger -->
    <button
      ref="triggerEl" type="button" class="sdd-trigger" :class="{ filled: !!modelValue }" :disabled="disabled"
      :aria-expanded="open" @click="toggle" @keydown="onTrigKey"
    >
      <span class="sdd-trig-ic"><CalendarDays :size="14" /></span>
      <span class="sdd-trig-val" :class="{ placeholder: !modelValue }">{{ modelValue ? displayLabel : placeholder }}</span>
      <button
        v-if="modelValue && clearable && !disabled" type="button" class="sdd-trig-clear"
        @click.stop="clearVal" aria-label="Clear date"
      ><X :size="11" /></button>
      <span v-else class="sdd-trig-chevron" :class="{ up: open }"><ChevronDown :size="14" /></span>
    </button>

    <!-- centered floating layer — bulletproof inside drawers/modals (no anchor math) -->
    <teleport to="body">
      <transition name="sdd-pop">
        <div v-if="open" class="sdd-layer" @mousedown.self="close">
          <div
            ref="popoverEl" class="sdd-pop" tabindex="-1"
            @keydown="onPopKey" @mousedown.stop @click.stop
          >
            <span class="sdd-pop-grain" aria-hidden="true" />
            <span class="sdd-pop-aura" aria-hidden="true" />

            <header class="sdd-head">
              <button type="button" class="sdd-nav" @click="shiftMonth(-1)" aria-label="Previous month"><ChevronLeft :size="15" /></button>
              <div class="sdd-head-title">
                <span class="sdd-month">{{ monthName }}</span>
                <span class="sdd-year sd-mono">{{ viewYear }}</span>
              </div>
              <button type="button" class="sdd-nav" @click="shiftMonth(1)" aria-label="Next month"><ChevronRight :size="15" /></button>
            </header>

            <transition :name="`sdd-slide-${slideDir}`" mode="out-in">
              <div :key="`${viewYear}-${viewMonth}`" class="sdd-grid">
                <div class="sdd-weekdays">
                  <span v-for="(d, i) in ['S','M','T','W','T','F','S']" :key="i">{{ d }}</span>
                </div>
                <div class="sdd-days">
                  <button
                    v-for="cell in days" :key="cell.iso" type="button" class="sdd-day"
                    :class="{ other: !cell.inMonth, today: cell.isToday, selected: cell.isSelected, disabled: cell.disabled }"
                    :disabled="cell.disabled" @click="pickDay(cell)"
                  >
                    <span class="sdd-day-n">{{ cell.d }}</span>
                    <span v-if="cell.isToday && !cell.isSelected" class="sdd-day-ring" />
                  </button>
                </div>
              </div>
            </transition>

            <footer class="sdd-foot">
              <button type="button" class="sdd-fbtn" @click="pickToday"><Dot :size="13" /> Today</button>
              <button v-if="clearable" type="button" class="sdd-fbtn" @click="clearVal">Clear</button>
              <button type="button" class="sdd-fbtn primary" @click="close"><Check :size="13" /> Done</button>
            </footer>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X, Check, Dot } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },  // ISO yyyy-mm-dd
  placeholder: { type: String, default: 'dd / mm / yyyy' },
  disabled: { type: Boolean, default: false },
  min: { type: String, default: '' },          // ISO yyyy-mm-dd lower bound
  max: { type: String, default: '' },          // ISO yyyy-mm-dd upper bound
  clearable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const triggerEl = ref(null)
const popoverEl = ref(null)
const open = ref(false)
const slideDir = ref('right')

const today = new Date()
const seed = () => (props.modelValue ? parseIso(props.modelValue) : new Date(today.getFullYear(), today.getMonth(), 1))
const viewYear = ref(seed().getFullYear())
const viewMonth = ref(seed().getMonth())

watch(() => props.modelValue, (v) => { if (v) { const d = parseIso(v); viewYear.value = d.getFullYear(); viewMonth.value = d.getMonth() } })

const pad = (n) => String(n).padStart(2, '0')
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
function toIso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const monthName = computed(() => new Date(viewYear.value, viewMonth.value, 1).toLocaleString(undefined, { month: 'long' }))
const displayLabel = computed(() => {
  if (!props.modelValue) return ''
  try { return parseIso(props.modelValue).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return props.modelValue }
})

const days = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = first.getDay()
  const start = new Date(viewYear.value, viewMonth.value, 1 - startWeekday)
  const todayIso = toIso(today)
  const minIso = props.min || ''
  const maxIso = props.max || ''
  const out = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const iso = toIso(d)
    out.push({
      d: d.getDate(), iso,
      inMonth: d.getMonth() === viewMonth.value,
      isToday: iso === todayIso,
      isSelected: iso === props.modelValue,
      disabled: (!!minIso && iso < minIso) || (!!maxIso && iso > maxIso),
    })
  }
  return out
})

const toggle = () => { if (props.disabled) return; open.value ? close() : openIt() }
const openIt = async () => {
  if (open.value) return
  if (props.modelValue) { const d = parseIso(props.modelValue); viewYear.value = d.getFullYear(); viewMonth.value = d.getMonth() }
  open.value = true
  await nextTick()
  popoverEl.value?.focus()
}
const close = () => { open.value = false }

const shiftMonth = (delta) => {
  slideDir.value = delta > 0 ? 'right' : 'left'
  const m = viewMonth.value + delta
  if (m < 0) { viewMonth.value = 11; viewYear.value-- }
  else if (m > 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value = m
}
const pickDay = (cell) => { if (cell.disabled) return; emit('update:modelValue', cell.iso); emit('change', cell.iso); close() }
const pickToday = () => {
  const iso = toIso(today)
  if ((props.min && iso < props.min) || (props.max && iso > props.max)) return
  emit('update:modelValue', iso); emit('change', iso); close()
}
const clearVal = () => { emit('update:modelValue', ''); emit('change', ''); close() }

const onTrigKey = (e) => { if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); openIt() } }
const onPopKey = (e) => {
  if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); shiftMonth(-1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); shiftMonth(1) }
}

onBeforeUnmount(() => { open.value = false })
</script>

<style scoped>
.sdd { display: block; position: relative; }

/* ── trigger ── */
.sdd-trigger {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 10px 12px;
  border-radius: 11px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.24s var(--sd-spring), background 0.2s;
}
.sdd-trigger:hover:not(:disabled) { border-color: var(--sd-amber-border); }
.sdd-trigger.filled { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.sdd.open .sdd-trigger { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); background: var(--sd-surface-glass); }
.sdd.disabled .sdd-trigger { opacity: 0.55; cursor: not-allowed; }
.sdd-trig-ic { display: grid; place-items: center; color: var(--sd-text-muted); transition: color 0.2s; }
.sdd-trigger.filled .sdd-trig-ic, .sdd.open .sdd-trig-ic { color: var(--sd-amber); }
.sdd-trig-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; font-weight: 600; font-family: var(--sd-mono); }
.sdd-trig-val.placeholder { color: var(--sd-text-dim); font-weight: 500; font-family: inherit; }
.sdd-trig-clear { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 6px; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface-glass); transition: all 0.15s; }
.sdd-trig-clear:hover { color: var(--sd-danger); background: var(--sd-danger-soft); }
.sdd-trig-chevron { display: grid; place-items: center; color: var(--sd-text-dim); transition: transform 0.3s var(--sd-spring); }
.sdd-trig-chevron.up { transform: rotate(180deg); color: var(--sd-amber); }

/* ── centered floating layer (always above the drawer — z above SdSelect's 5200) ── */
.sdd-layer { position: fixed; inset: 0; z-index: 6000; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(60% 60% at 50% 45%, rgba(251, 146, 60, 0.1), transparent 70%), rgba(4, 5, 6, 0.52);
  backdrop-filter: blur(6px) saturate(115%); }
[data-theme="light"] .sdd-layer { background: radial-gradient(60% 60% at 50% 45%, rgba(234, 88, 12, 0.1), transparent 70%), rgba(40, 25, 10, 0.34); }

.sdd-pop {
  position: relative; width: min(312px, 94vw); max-height: 90vh; overflow: hidden auto;
  padding: 14px; display: flex; flex-direction: column; gap: 11px;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 18px;
  box-shadow: var(--sd-shadow-hover); backdrop-filter: blur(28px) saturate(150%);
}
.sdd-pop-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: inherit; background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px); background-size: 16px 16px; }
.sdd-pop-aura { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 240px; height: 150px; pointer-events: none; background: radial-gradient(circle at 50% 0%, rgba(251, 146, 60, 0.28), transparent 68%); filter: blur(20px); opacity: 0.5; }

.sdd-head { position: relative; display: flex; align-items: center; justify-content: space-between; }
.sdd-nav { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.sdd-nav:hover { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.sdd-head-title { display: inline-flex; align-items: baseline; gap: 7px; }
.sdd-month { font-size: 13.5px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.sdd-year { font-size: 12px; font-weight: 700; color: var(--sd-amber); }

.sdd-grid { position: relative; display: flex; flex-direction: column; gap: 5px; }
.sdd-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.sdd-weekdays span { text-align: center; font-size: 9.5px; font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
.sdd-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.sdd-day { position: relative; height: 32px; border: none; border-radius: 9px; cursor: pointer; background: transparent; color: var(--sd-text-secondary); font-size: 12px; font-family: var(--sd-mono); display: grid; place-items: center; transition: all 0.16s var(--sd-spring); }
.sdd-day:hover:not(:disabled):not(.selected) { background: var(--sd-amber-soft); color: var(--sd-text); transform: translateY(-1px); }
.sdd-day.other { color: var(--sd-text-dim); opacity: 0.5; }
.sdd-day.disabled { opacity: 0.26; cursor: not-allowed; }
.sdd-day.selected { background: var(--sd-grad-hero); color: #1a1206; font-weight: 800; box-shadow: 0 5px 14px -4px var(--sd-fluid-glow); }
[data-theme="light"] .sdd-day.selected { color: #fff8ec; }
.sdd-day-n { position: relative; }
.sdd-day-ring { position: absolute; inset: 3px; border-radius: 7px; border: 1px solid var(--sd-amber-border); pointer-events: none; animation: sdd-pulse 2.4s ease-in-out infinite; }
@keyframes sdd-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.sdd-foot { position: relative; display: flex; gap: 6px; padding-top: 9px; border-top: 1px solid var(--sd-border); }
.sdd-fbtn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 10px; border-radius: 9px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.16s var(--sd-spring); }
.sdd-fbtn:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.sdd-fbtn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 16px rgba(251, 146, 60, 0.26); }
[data-theme="light"] .sdd-fbtn.primary { color: #fff8ec; }
.sdd-fbtn.primary:hover { filter: brightness(1.06); }

/* ── transitions ── */
.sdd-pop-enter-active, .sdd-pop-leave-active { transition: opacity 0.22s var(--sd-spring); }
.sdd-pop-enter-active .sdd-pop, .sdd-pop-leave-active .sdd-pop { transition: transform 0.28s var(--sd-spring), opacity 0.22s var(--sd-spring); }
.sdd-pop-enter-from, .sdd-pop-leave-to { opacity: 0; }
.sdd-pop-enter-from .sdd-pop, .sdd-pop-leave-to .sdd-pop { opacity: 0; transform: scale(0.95) translateY(8px); }
.sdd-slide-right-enter-active, .sdd-slide-right-leave-active,
.sdd-slide-left-enter-active, .sdd-slide-left-leave-active { transition: opacity 0.2s var(--sd-spring), transform 0.2s var(--sd-spring); }
.sdd-slide-right-enter-from { opacity: 0; transform: translateX(13px); }
.sdd-slide-right-leave-to   { opacity: 0; transform: translateX(-9px); }
.sdd-slide-left-enter-from  { opacity: 0; transform: translateX(-13px); }
.sdd-slide-left-leave-to    { opacity: 0; transform: translateX(9px); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sdd-day-ring { animation: none; }
}
</style>
