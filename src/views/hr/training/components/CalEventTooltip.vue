<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="show && events.length" class="cet" as="div" :style="style"
        :initial="{ opacity: 0, y: 8, scale: 0.94, filter: 'blur(6px)' }"
        :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
        :exit="{ opacity: 0, y: 6, scale: 0.96, filter: 'blur(4px)' }"
        :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="cet-grain trn-grain" aria-hidden="true" />
        <span class="cet-arrow" :class="placement" aria-hidden="true" />

        <header class="cet-head">
          <div class="cet-date">
            <span class="cet-dow">{{ dow }}</span>
            <span class="cet-dnum trn-mono">{{ dnum }}</span>
            <span class="cet-mon">{{ mon }}</span>
          </div>
          <span class="cet-rel" :class="relTone">{{ relLabel }}</span>
        </header>

        <div class="cet-list">
          <div v-for="(e, i) in events.slice(0, 6)" :key="i" class="cet-row" :style="{ '--c': e.color, animationDelay: (0.04 + i * 0.05) + 's' }">
            <span class="cet-rail" aria-hidden="true" />
            <span class="cet-ic"><component :is="iconFor(e)" :size="13" /></span>
            <div class="cet-body">
              <span class="cet-title">{{ e.title }}</span>
              <span class="cet-meta">
                <Users :size="10" /> {{ e.employee_name || 'Unassigned' }}
              </span>
            </div>
            <span class="cet-pill" :style="{ '--c': e.color }">{{ e.statusLabel }}</span>
          </div>
        </div>

        <footer v-if="events.length > 6" class="cet-foot">+{{ events.length - 6 }} more on this day</footer>
        <footer v-else class="cet-foot hint"><MousePointerClick :size="11" /> Click the day to open in the side panel</footer>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Users, GraduationCap, Award, AlertTriangle, BadgeCheck, MousePointerClick } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, default: false },
  dayKey: { type: String, default: '' },     // YYYY-MM-DD
  events: { type: Array, default: () => [] }, // decorated events
  style: { type: Object, default: () => ({}) },
  placement: { type: String, default: 'right' },
})

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const date = computed(() => props.dayKey ? new Date(props.dayKey + 'T00:00:00') : new Date())
const dow = computed(() => WD[date.value.getDay()])
const dnum = computed(() => date.value.getDate())
const mon = computed(() => MO[date.value.getMonth()])

const diffDays = computed(() => {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((date.value - t) / 86400000)
})
const relLabel = computed(() => {
  const d = diffDays.value
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  return d > 0 ? `In ${d} days` : `${-d} days ago`
})
const relTone = computed(() => diffDays.value < 0 ? 'past' : diffDays.value === 0 ? 'now' : 'future')

const iconFor = (e) => {
  if (e.status === 'overdue') return AlertTriangle
  if (e.status === 'done') return BadgeCheck
  return e.type === 'cert_expiry' ? Award : GraduationCap
}
</script>

<style scoped>
.cet { position: fixed; z-index: 3000; width: 290px; max-width: calc(100vw - 24px); pointer-events: none;
  border-radius: 16px; overflow: hidden; isolation: isolate;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); box-shadow: var(--trn-glass-shadow); transform-origin: left center; }
.cet-grain { z-index: 0; opacity: 0.04; }
.cet > *:not(.cet-grain):not(.cet-arrow) { position: relative; z-index: 1; }
.cet-arrow { position: absolute; top: 50%; width: 9px; height: 9px; transform: translateY(-50%) rotate(45deg);
  background: var(--trn-glass-deep); border: 1px solid var(--trn-border-strong); }
.cet-arrow.right { left: -5px; border-right: 0; border-top: 0; }
.cet-arrow.left { right: -5px; border-left: 0; border-bottom: 0; }

.cet-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px 10px;
  border-bottom: 1px solid var(--trn-border-soft); background: linear-gradient(180deg, color-mix(in srgb, var(--trn-amber) 8%, transparent), transparent); }
.cet-date { display: flex; align-items: baseline; gap: 6px; }
.cet-dow { font-size: 12.5px; font-weight: 750; color: var(--trn-text); }
.cet-dnum { font-size: 15px; font-weight: 800; color: var(--trn-amber-strong); }
.cet-mon { font-size: 11px; color: var(--trn-text-muted); }
.cet-rel { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 999px; }
.cet-rel.now { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.cet-rel.future { color: var(--trn-text-muted); background: var(--trn-surface); }
.cet-rel.past { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }

.cet-list { display: flex; flex-direction: column; padding: 8px; gap: 4px; }
.cet-row { position: relative; display: flex; align-items: center; gap: 9px; padding: 8px 10px 8px 13px; border-radius: 11px;
  background: var(--trn-surface); overflow: hidden; animation: cet-row-in 0.4s var(--trn-spring) backwards; }
.cet-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); }
.cet-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, transparent); }
.cet-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cet-title { font-size: 12.5px; font-weight: 650; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cet-meta { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trn-text-muted); }
.cet-meta :deep(svg) { color: var(--trn-text-dim); }
.cet-pill { font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; flex-shrink: 0; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
.cet-foot { padding: 9px 14px 11px; font-size: 10.5px; color: var(--trn-text-dim); border-top: 1px solid var(--trn-border-soft); }
.cet-foot.hint { display: flex; align-items: center; gap: 6px; }
.cet-foot.hint :deep(svg) { color: var(--trn-amber-strong); }

@keyframes cet-row-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .cet-row { animation: none; } }
</style>
