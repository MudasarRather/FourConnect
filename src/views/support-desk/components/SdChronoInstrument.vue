<template>
  <div
    ref="rootEl" class="zoe" :class="{ grabbing: drag.on }" aria-hidden="true"
    @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @pointerleave="onUp"
  >
    <!-- the drum -->
    <div class="zoe-scene">
      <div class="zoe-drum" :style="drumStyle">
        <div
          v-for="(s, i) in slats" :key="s.key"
          class="zoe-slat"
          :class="{ today: s.isToday, focus: i === focusIndex, holiday: !!s.holiday, storm: s.breach > 0 }"
          :style="slatStyle(i)"
        >
          <span class="zoe-wk sd-mono">{{ s.dow }}</span>
          <b class="zoe-num">{{ s.dayNum }}</b>
          <span class="zoe-dots">
            <i v-for="n in Math.min(s.load, 4)" :key="'l' + n" class="zd core"></i>
            <i v-if="s.load > 4" class="zoe-x sd-mono">×{{ s.load }}</i>
            <i v-if="s.breach > 0" class="zd storm"></i>
            <i v-if="s.pins > 0" class="zd pin"></i>
            <i v-if="s.resume > 0" class="zd resume"></i>
            <i v-if="!s.load && !s.breach && !s.pins && !s.resume" class="zd empty"></i>
          </span>
          <span v-if="s.holiday" class="zoe-hol" :title="s.holiday">✦</span>
          <i class="zoe-loadbar" :style="{ '--heat': Math.min(s.load / 6, 1) }"></i>
        </div>
      </div>
    </div>

    <!-- zoetrope optics: slit mask + lens vignette + axle -->
    <div class="zoe-slits"></div>
    <div class="zoe-vignette"></div>
    <div class="zoe-lens"></div>
    <div class="zoe-axle top"></div>
    <div class="zoe-axle bot"></div>

    <!-- focused-day readout -->
    <div class="zoe-readout sd-mono">
      <span class="zoe-ro-day">{{ readout.label }}</span>
      <span v-if="readout.load" class="zoe-ro-k core">{{ readout.load }} DUE</span>
      <span v-if="readout.breach" class="zoe-ro-k storm">{{ readout.breach }} LATE</span>
      <span v-if="readout.holiday" class="zoe-ro-k resume">{{ readout.holiday }}</span>
      <span v-if="!readout.load && !readout.breach && !readout.holiday" class="zoe-ro-k moon">CLEAR</span>
      <span class="zoe-ro-hint">· DRAG TO SPIN</span>
    </div>
  </div>
</template>

<script setup>
/*
  SdChronoInstrument — "Zoetrope Drum" (gallery pick 04): the range loaded into a
  spinning slit-drum. One slat per day, built from the REAL feed buckets:
    · dot row  = due load (amber) + breach (storm) + pins (emerald) + resumes (bronze)
    · load bar = day heat  ·  ✦ = HR holiday  ·  glowing slat = today
  Motion: on mount the drum eases in and PARKS ON TODAY under the lens; idle it
  breathes a slow ±3° sway; drag to spin with inertia, releasing snaps to the
  nearest slat and the readout follows. Reduced-motion: parked, drag still works.
  This file's internals are the ONLY thing that changes on a different gallery
  pick — the hero slot, props contract and tokens stay put.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { todayKey, DOW } from '../chrono'

const props = defineProps({
  /** CalendarDay[] from the feed — [{date:'YYYY-MM-DD', counts:{}, load, breach}] */
  days: { type: Array, default: () => [] },
  /** CalendarHoliday[] — [{date, name}] */
  holidays: { type: Array, default: () => [] },
})

const rootEl = ref(null)
const tKey = todayKey()

/* ── slats from buckets ── */
const holidayMap = computed(() => new Map(props.holidays.map(h => [h.date, h.name])))
const slats = computed(() => props.days.map(d => {
  const dt = new Date(`${d.date}T00:00:00`)
  const c = d.counts || {}
  return {
    key: d.date,
    dayNum: dt.getDate(),
    dow: DOW[dt.getDay()].toUpperCase(),
    isToday: d.date === tKey,
    load: d.load || 0,
    breach: d.breach || 0,
    pins: c.reminder || 0,
    resume: c.hold_resume || 0,
    holiday: holidayMap.value.get(d.date) || '',
  }
}))

/* ── drum geometry ── */
const SLAT_W = 66
const N = computed(() => Math.max(slats.value.length, 7))
const step = computed(() => 360 / N.value)
const radius = computed(() => Math.max(120, Math.round((SLAT_W / 2 + 3) / Math.tan(Math.PI / N.value))))

/* ── rotation engine ── */
const rot = ref(0)            // current drum angle (deg); slat i faces camera at rot = -i*step
const drag = ref({ on: false, x: 0, rot0: 0, v: 0, t: 0 })
let raf = 0
let mode = 'settle'           // settle → idle | drag | inertia | snap
let snapFrom = 0, snapTo = 0, snapT0 = 0, snapDur = 900
let swayBase = 0, swayT0 = 0
let visible = true

const reduced = () => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    return !cine && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { return false }
}

const targetForIndex = (i) => -i * step.value
const todayIndex = computed(() => {
  const i = slats.value.findIndex(s => s.isToday)
  return i >= 0 ? i : Math.floor(slats.value.length / 2)
})

const norm = (a) => { let x = a % 360; if (x > 180) x -= 360; if (x < -180) x += 360; return x }
const focusIndex = computed(() => {
  if (!N.value) return 0
  let i = Math.round(-rot.value / step.value) % N.value
  if (i < 0) i += N.value
  return i
})

const easeOut = (p) => 1 - Math.pow(1 - p, 3)

const startSnap = (to, dur = 900) => {
  snapFrom = rot.value
  snapTo = to
  snapT0 = performance.now()
  snapDur = dur
  mode = 'snap'
}

const loop = (t) => {
  raf = requestAnimationFrame(loop)
  if (!visible) return
  if (mode === 'snap') {
    const p = Math.min(1, (t - snapT0) / snapDur)
    rot.value = snapFrom + (snapTo - snapFrom) * easeOut(p)
    if (p >= 1) { mode = 'idle'; swayBase = rot.value; swayT0 = t }
  } else if (mode === 'inertia') {
    drag.value.v *= 0.94
    rot.value += drag.value.v
    if (Math.abs(drag.value.v) < 0.06) {
      // snap to the nearest slat
      const nearest = Math.round(rot.value / step.value) * step.value
      startSnap(nearest, 500)
    }
  } else if (mode === 'idle' && !reduced()) {
    rot.value = swayBase + Math.sin((t - swayT0) / 2600) * 3
  }
}

onMounted(() => {
  const park = targetForIndex(todayIndex.value)
  if (reduced()) {
    rot.value = park
    mode = 'idle'; swayBase = park; swayT0 = performance.now()
  } else {
    rot.value = park - 80          // wind up, then ease onto today
    startSnap(park, 1700)
  }
  raf = requestAnimationFrame(loop)
  if (rootEl.value && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((e) => { visible = e[0].isIntersecting }, { threshold: 0.02 })
    io.observe(rootEl.value)
  }
})
let io = null
onBeforeUnmount(() => { cancelAnimationFrame(raf); if (io) io.disconnect() })

// range changed (month nav) → re-park on today / range start
watch(() => props.days.map(d => d.date).join(','), () => {
  if (!slats.value.length) return
  startSnap(targetForIndex(todayIndex.value), reduced() ? 1 : 1100)
})

/* ── drag ── */
const onDown = (e) => {
  drag.value = { on: true, x: e.clientX, rot0: rot.value, v: 0, t: performance.now() }
  mode = 'drag'
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* older browsers */ }
}
const onMove = (e) => {
  if (!drag.value.on) return
  const dx = e.clientX - drag.value.x
  const now = performance.now()
  const next = drag.value.rot0 + dx * 0.35
  drag.value.v = (next - rot.value) * Math.min(1, 16 / Math.max(1, now - drag.value.t))
  drag.value.t = now
  rot.value = next
}
const onUp = () => {
  if (!drag.value.on) return
  drag.value.on = false
  mode = Math.abs(drag.value.v) > 0.4 ? 'inertia' : 'snap'
  if (mode === 'snap') startSnap(Math.round(rot.value / step.value) * step.value, 450)
}

/* ── styles ── */
const drumStyle = computed(() => ({
  transform: `translateZ(${-radius.value}px) rotateY(${rot.value}deg)`,
}))
const slatStyle = (i) => ({
  transform: `rotateY(${i * step.value}deg) translateZ(${radius.value}px)`,
})

/* ── readout ── */
const readout = computed(() => {
  const s = slats.value[focusIndex.value]
  if (!s) return { label: '—', load: 0, breach: 0, holiday: '' }
  return {
    label: `${s.dow} ${String(s.dayNum).padStart(2, '0')}${s.isToday ? ' · TODAY' : ''}`,
    load: s.load, breach: s.breach, holiday: s.holiday,
  }
})
</script>

<style scoped>
.zoe {
  position: relative; width: 100%; height: 100%; min-height: 200px; overflow: hidden;
  cursor: grab; touch-action: pan-y; user-select: none;
}
.zoe.grabbing { cursor: grabbing; }

.zoe-scene {
  position: absolute; inset: 0 0 26px;
  display: grid; place-items: center;
  perspective: 1050px; perspective-origin: 50% 46%;
}
.zoe-drum {
  position: relative; width: 66px; height: 148px;
  transform-style: preserve-3d;
  will-change: transform;
}

.zoe-slat {
  position: absolute; inset: 0; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-cal-brd);
  backface-visibility: hidden;
  transition: box-shadow 0.3s;
}
.zoe-slat.today {
  border-color: var(--sd-cal-core);
  background: linear-gradient(180deg, var(--sd-cal-soft), var(--sd-surface));
}
.zoe-slat.focus { box-shadow: 0 0 26px var(--sd-cal-soft), inset 0 0 0 1px var(--sd-cal-brd); }
.zoe-slat.today.focus { box-shadow: var(--sd-cal-glow), inset 0 0 0 1px var(--sd-cal-core); }
.zoe-slat.storm.focus { box-shadow: 0 0 22px var(--sd-cal-storm-soft), inset 0 0 0 1px var(--sd-cal-brd); }

.zoe-wk { font-size: 7.5px; font-weight: 700; letter-spacing: 0.3em; color: var(--sd-text-dim); }
.zoe-slat.today .zoe-wk { color: var(--sd-cal-core); }
.zoe-num {
  font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  color: var(--sd-text); font-variant-numeric: tabular-nums;
}
.zoe-slat.today .zoe-num { color: var(--sd-cal-core); }

.zoe-dots { display: flex; align-items: center; gap: 4px; min-height: 8px; }
.zd { width: 6px; height: 6px; border-radius: 50%; }
.zd.core { background: var(--sd-cal-core); box-shadow: 0 0 6px var(--sd-cal-core); }
.zd.storm { background: var(--sd-cal-storm); box-shadow: 0 0 7px var(--sd-cal-storm); animation: sd-cal-pulse 2.2s ease-in-out infinite; }
.zd.pin { background: var(--sd-cal-pin); box-shadow: 0 0 6px var(--sd-cal-pin); }
.zd.resume { background: var(--sd-cal-resume); box-shadow: 0 0 6px var(--sd-cal-resume); }
.zd.empty { background: var(--sd-cal-moon-soft); }
.zoe-x { font-size: 8px; font-style: normal; font-weight: 700; color: var(--sd-cal-core); }

.zoe-hol { position: absolute; top: 6px; right: 7px; font-size: 9px; color: var(--sd-cal-resume); }

.zoe-loadbar {
  --heat: 0;
  position: absolute; left: 9px; right: 9px; bottom: 7px; height: 3px; border-radius: 2px;
  background: var(--sd-border); overflow: hidden;
}
.zoe-loadbar::after {
  content: ""; position: absolute; inset: 0; transform-origin: left;
  transform: scaleX(var(--heat));
  background: linear-gradient(90deg, var(--sd-cal-core), var(--sd-cal-ember));
}

/* ── zoetrope optics ── */
.zoe-slits {
  position: absolute; inset: 0 0 26px; pointer-events: none; z-index: 3;
  background: repeating-linear-gradient(90deg, transparent 0 74px, var(--sd-cal-stage) 74px 84px);
  opacity: 0.3;
}
.zoe-vignette {
  position: absolute; inset: 0 0 26px; pointer-events: none; z-index: 4;
  background: radial-gradient(62% 74% at 50% 46%, transparent 52%, var(--sd-cal-stage) 96%);
}
.zoe-lens {
  position: absolute; left: 50%; top: 44%; width: 240px; height: 240px; z-index: 5;
  transform: translate(-50%, -50%); border-radius: 50%;
  border: 1px dashed var(--sd-cal-brd); opacity: 0.55; pointer-events: none;
}
.zoe-lens::before {
  content: ""; position: absolute; left: 50%; top: -5px; width: 9px; height: 9px;
  transform: translateX(-50%); border-radius: 50%;
  background: var(--sd-cal-core); box-shadow: 0 0 12px var(--sd-cal-core);
}
.zoe-axle {
  position: absolute; left: 50%; width: 54px; height: 7px; z-index: 5;
  transform: translateX(-50%); border-radius: 4px; pointer-events: none;
  background: linear-gradient(90deg, var(--sd-cal-deep), var(--sd-cal-core), var(--sd-cal-deep));
  opacity: 0.75;
}
.zoe-axle.top { top: 8%; }
.zoe-axle.bot { bottom: calc(26px + 6%); }

/* ── readout ── */
.zoe-readout {
  position: absolute; left: 0; right: 0; bottom: 0; height: 26px; z-index: 6;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em;
  border-top: 1px solid var(--sd-cal-brd);
  background: color-mix(in srgb, var(--sd-cal-stage) 82%, transparent);
  color: var(--sd-text-secondary);
}
.zoe-ro-day { color: var(--sd-cal-core); }
.zoe-ro-k.core { color: var(--sd-cal-core); }
.zoe-ro-k.storm { color: var(--sd-cal-storm); }
.zoe-ro-k.resume { color: var(--sd-cal-resume); max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zoe-ro-k.moon { color: var(--sd-cal-moon); }
.zoe-ro-hint { color: var(--sd-text-dim); letter-spacing: 0.16em; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .zd.storm { animation: none; }
}
</style>
