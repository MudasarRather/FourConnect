<template>
  <Motion as="section" class="at as-card" ref="rootEl"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="at-aura" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />
    <span class="at-top" aria-hidden="true" />
    <header class="at-head">
      <span class="at-eyebrow"><History :size="13" /> My activity</span>
      <span v-if="events.length" class="at-count as-mono">{{ events.length }} events</span>
    </header>

    <div v-if="loading" class="at-skel">
      <div v-for="n in 4" :key="n" class="as-skel" style="height:40px;border-radius:11px" />
    </div>
    <div v-else-if="!events.length" class="at-empty"><Inbox :size="15" /> No recorded activity yet — acknowledgements, returns and damage reports will show up here.</div>

    <div v-else class="at-stream">
      <div v-for="grp in grouped" :key="grp.key" class="at-day">
        <span class="at-day-h">{{ grp.label }}</span>
        <div class="at-rows">
          <span class="at-spine" aria-hidden="true" />
          <Motion v-for="(ev, i) in grp.items" :key="ev.id" as="div" class="at-row" :style="{ '--c': eventMeta(ev.event_type).color }"
            :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }">
            <span class="at-node"><component :is="eventMeta(ev.event_type).icon" :size="11" /></span>
            <div class="at-body">
              <span class="at-lab">{{ eventMeta(ev.event_type).label }}<span v-if="ev.asset_code" class="at-code as-mono">{{ ev.asset_code }}</span></span>
              <span v-if="ev.note" class="at-note">{{ ev.note }}</span>
            </div>
            <span class="at-time as-mono">{{ relTime(ev.created_at) }}</span>
          </Motion>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { History, Inbox } from 'lucide-vue-next'
import { eventMeta, relTime } from './histEventMeta.js'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const reduced = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)

function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}` }
function dayLabel(d) {
  const x = new Date(d); const now = new Date()
  const a = new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((b - a) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return x.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
}
const grouped = computed(() => {
  const out = []; const map = new Map()
  for (const ev of props.events) {
    const k = dayKey(ev.created_at)
    if (!map.has(k)) { const g = { key: k, label: dayLabel(ev.created_at), items: [] }; map.set(k, g); out.push(g) }
    map.get(k).items.push(ev)
  }
  return out
})
</script>

<style scoped>
.at { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.at-aura { position: absolute; inset: -45% -10% auto -10%; height: 60%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(12px); opacity: 0.7; }
.at-top { position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 1; background: var(--as-bezel-ring); opacity: 0.4; }
.at-head, .at-stream, .at-skel, .at-empty { position: relative; z-index: 1; }
.at-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.at-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.at-eyebrow :deep(svg) { color: var(--as-amber); }
.at-count { font-size: 11px; color: var(--as-text-dim); }
.at-skel { display: flex; flex-direction: column; gap: 8px; }
.at-empty { display: flex; align-items: center; gap: 8px; padding: 22px; justify-content: center; font-size: 12.5px; color: var(--as-text-muted); text-align: center;
  border: 1.5px dashed var(--as-border-strong); border-radius: 14px; background: var(--as-surface); }
.at-empty :deep(svg) { color: var(--as-amber); flex-shrink: 0; }

.at-stream { display: flex; flex-direction: column; gap: 16px; }
.at-day-h { display: inline-block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); margin-bottom: 9px; }
.at-rows { position: relative; display: flex; flex-direction: column; gap: 11px; padding-left: 4px; }
.at-spine { position: absolute; left: 14px; top: 6px; bottom: 6px; width: 1.5px; background: linear-gradient(180deg, transparent, var(--as-border-strong), transparent); }
.at-row { position: relative; display: flex; align-items: center; gap: 12px; }
.at-node { position: relative; z-index: 1; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, var(--as-canvas)); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); box-shadow: 0 0 8px -2px var(--c); }
.at-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.at-lab { font-size: 12.5px; font-weight: 600; color: var(--as-text); display: inline-flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.at-code { font-size: 10.5px; font-weight: 700; color: var(--as-amber); padding: 1px 6px; border-radius: 6px; background: color-mix(in srgb, var(--as-amber) 11%, transparent); }
.at-note { font-size: 11px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.at-time { font-size: 10px; color: var(--as-text-dim); flex-shrink: 0; }
</style>
