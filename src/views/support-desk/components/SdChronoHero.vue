<template>
  <Motion
    as="section" class="ch sd-grain"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
  >
    <div class="ch-aura" aria-hidden="true"></div>
    <CalendarDays class="ch-ambient" :size="360" aria-hidden="true" />

    <div class="ch-grid">
      <!-- lead -->
      <div class="ch-lead">
        <p class="ch-eyebrow sd-mono"><Clock3 :size="12" /> SUPPORT · TICKETS · TIME CONTROL</p>
        <h1 class="ch-title">The <span class="ch-grad">Chrono</span> Desk</h1>
        <p class="ch-sub">
          Every clock the desk is racing — SLA deadlines, escalation ACKs, update cadences,
          holds coming back, vendor promises and your own pins — plotted on
          <b class="sd-mono">{{ rangeLabel }}</b>.
        </p>

        <div class="ch-ctas">
          <Motion as="button" class="ch-btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('today')">
            <LocateFixed :size="15" /> Today
          </Motion>
          <Motion as="button" class="ch-btn steel" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('remind')">
            <BellPlus :size="15" /> Remind me
          </Motion>
          <Motion as="button" class="ch-btn ghost" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="exporting" @click="$emit('export')">
            <CalendarArrowDown :size="15" /> {{ exporting ? 'Exporting…' : 'Export .ics' }}
          </Motion>
        </div>

        <!-- telemetry lenses — clicking toggles that event layer -->
        <div class="ch-lenses">
          <button
            v-for="(l, i) in lenses" :key="l.key"
            class="ch-lens" :class="[{ on: l.kind && activeKinds.includes(l.kind), stat: !l.kind }, `tk-${l.token}`]"
            :style="{ '--i': i }"
            :disabled="!l.kind"
            :title="l.kind ? `Toggle the ${l.label} layer` : l.label"
            @click="l.kind && $emit('lens', l.kind)"
          >
            <span class="ch-lens-ico"><component :is="l.icon" :size="15" /></span>
            <span class="ch-lens-val"><SdCountUp :value="l.value" /></span>
            <span class="ch-lens-lbl">{{ l.label }}</span>
            <i class="ch-lens-bar"></i>
          </button>
        </div>
      </div>

      <!-- signature instrument -->
      <div class="ch-stage">
        <slot name="instrument" />
        <div v-if="loading" class="ch-stage-loading sd-mono">SOUNDING THE TIDE…</div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarDays, Clock3, LocateFixed, BellPlus, CalendarArrowDown,
  AlarmClock, MessageSquareWarning, Flame, Play, Pin, CloudLightning,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  meta: { type: Object, default: () => ({}) },
  /** {kind: count} across the loaded range */
  kindCounts: { type: Object, default: () => ({}) },
  /** currently-active layer kinds */
  activeKinds: { type: Array, default: () => [] },
  rangeLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
})
defineEmits(['lens', 'today', 'remind', 'export'])

const lenses = computed(() => ([
  { key: 'due', label: 'Resolution due', kind: 'resolution_due', token: 'core', icon: AlarmClock, value: props.kindCounts.resolution_due || 0 },
  { key: 'respond', label: 'First response', kind: 'response_due', token: 'ember', icon: MessageSquareWarning, value: props.kindCounts.response_due || 0 },
  { key: 'esc', label: 'Escalation ACK', kind: 'escalation_ack', token: 'rose', icon: Flame, value: props.kindCounts.escalation_ack || 0 },
  { key: 'resume', label: 'Holds resuming', kind: 'hold_resume', token: 'resume', icon: Play, value: props.kindCounts.hold_resume || 0 },
  { key: 'pins', label: 'My pins', kind: 'reminder', token: 'pin', icon: Pin, value: props.kindCounts.reminder || 0 },
  { key: 'risk', label: 'Breach risk · 7d', kind: null, token: 'storm', icon: CloudLightning, value: props.meta.breach_risk_7d || 0 },
]))
</script>

<style scoped>
.ch {
  position: relative; overflow: hidden;
  border: 1px solid var(--sd-cal-brd); border-radius: 24px;
  background:
    radial-gradient(130% 120% at 85% -10%, var(--sd-cal-soft), transparent 55%),
    var(--sd-cal-stage);
  box-shadow: var(--sd-shadow);
}
.ch-aura {
  position: absolute; inset: -30% -10% auto; height: 130%;
  background: radial-gradient(60% 60% at 70% 20%, var(--sd-cal-deep-soft), transparent 70%);
  pointer-events: none;
}
.ch-ambient {
  position: absolute; right: -70px; bottom: -110px; color: var(--sd-cal-core); opacity: 0.05;
  animation: sd-spin-slow 90s linear infinite; pointer-events: none;
}

.ch-grid {
  position: relative; display: grid; grid-template-columns: minmax(380px, 1.05fr) 1fr;
  gap: 18px; padding: 30px 30px 24px; align-items: stretch;
}
@media (max-width: 1100px) { .ch-grid { grid-template-columns: 1fr; } }

.ch-eyebrow {
  display: inline-flex; align-items: center; gap: 8px; margin: 0 0 12px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.24em;
  color: var(--sd-cal-core);
  border: 1px solid var(--sd-cal-brd); background: var(--sd-cal-soft);
  padding: 6px 12px; border-radius: 999px;
}
.ch-title {
  margin: 0 0 10px; font-size: clamp(30px, 3.6vw, 46px); font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.02; color: var(--sd-text);
}
.ch-grad {
  background: var(--sd-cal-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.ch-sub { margin: 0 0 18px; max-width: 56ch; font-size: 13.5px; line-height: 1.65; color: var(--sd-text-secondary); }
.ch-sub b { color: var(--sd-cal-core); font-weight: 700; }

.ch-ctas { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.ch-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 12px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; border: 1px solid transparent; letter-spacing: 0.01em;
}
.ch-btn.primary { background: var(--sd-cal-grad); color: #1a1206; box-shadow: var(--sd-cal-glow); }
.ch-btn.steel { background: var(--sd-surface); border-color: var(--sd-border-strong); color: var(--sd-text); }
.ch-btn.ghost { background: transparent; border-color: var(--sd-cal-brd); color: var(--sd-cal-core); }
.ch-btn:disabled { opacity: 0.6; cursor: default; }
[data-theme="light"] .ch-btn.primary { color: #fffaf0; }

/* auto-fit so long labels never cram into fixed columns (was clipping "RESOLUTION DUE") */
.ch-lenses { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 9px; }
.ch-lens {
  --lens: var(--sd-cal-core); --lens-soft: var(--sd-cal-soft);
  position: relative; overflow: hidden; text-align: left; cursor: pointer;
  display: flex; flex-direction: column; gap: 3px;
  padding: 11px 12px 13px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: sd-cal-rise 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.055s);
  transition: transform 0.25s var(--sd-spring), border-color 0.25s, box-shadow 0.25s;
}
.ch-lens:not(.stat):hover { transform: translateY(-2px); border-color: var(--lens); box-shadow: 0 8px 26px rgba(0, 0, 0, 0.25); }
.ch-lens.stat { cursor: default; }
.ch-lens.on { border-color: var(--lens); background: var(--lens-soft); }
.ch-lens-ico { color: var(--lens); }
.ch-lens-val { font-size: 21px; font-weight: 800; color: var(--sd-text); line-height: 1; }
.ch-lens-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--sd-text-muted); line-height: 1.35; overflow-wrap: break-word; min-width: 0;
}
.ch-lens-bar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
  background: var(--lens); opacity: 0.25; transition: opacity 0.25s;
}
.ch-lens.on .ch-lens-bar { opacity: 1; }

.tk-core { --lens: var(--sd-cal-core); --lens-soft: var(--sd-cal-soft); }
.tk-ember { --lens: var(--sd-cal-ember); --lens-soft: var(--sd-cal-ember-soft); }
.tk-rose { --lens: var(--sd-cal-rose); --lens-soft: var(--sd-cal-rose-soft); }
.tk-resume { --lens: var(--sd-cal-resume); --lens-soft: var(--sd-cal-resume-soft); }
.tk-pin { --lens: var(--sd-cal-pin); --lens-soft: var(--sd-cal-pin-soft); }
.tk-storm { --lens: var(--sd-cal-storm); --lens-soft: var(--sd-cal-storm-soft); }

.ch-stage {
  position: relative; min-height: 220px; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--sd-cal-brd);
  background:
    linear-gradient(180deg, transparent 40%, var(--sd-cal-deep-soft)),
    var(--sd-cal-stage);
}
.ch-stage-loading {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 10px; letter-spacing: 0.3em; color: var(--sd-cal-core);
  background: color-mix(in srgb, var(--sd-cal-stage) 65%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ch-ambient,
  html:not([data-cinematic="on"]) .ch-lens { animation: none; }
}
</style>
