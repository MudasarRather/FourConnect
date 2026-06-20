<template>
  <Motion as="li" class="led-shell"
    :initial="reduced ? false : { opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.4, delay: Math.min(index * 0.035, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <div class="led" :class="{ open }" :style="{ '--c': m.color }" ref="rowEl" @click="open = !open">
      <span class="led-rail" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />
      <span class="led-write" aria-hidden="true" />

      <span class="led-ref as-mono">{{ ledgerRef(ev.id) }}</span>

      <span class="led-glyph"><component :is="m.icon" :size="15" /></span>

      <div class="led-main">
        <div class="led-l1">
          <span class="led-event">{{ m.label }}</span>
          <button v-if="ev.asset_code" type="button" class="led-asset as-mono" @click.stop="$emit('detail', ev.asset_id)" title="Open asset timeline">
            {{ ev.asset_code }}<History :size="11" />
          </button>
          <span class="led-fam">{{ familyLabel }}</span>
        </div>
        <div class="led-l2">
          <span v-if="hasTransition" class="led-morph">
            <span v-if="ev.from_status" class="led-st" :data-status="up(ev.from_status)">{{ titleize(ev.from_status) }}</span>
            <span v-else class="led-st ghost">—</span>
            <ArrowRight :size="11" class="led-morph-arr" />
            <span class="led-st" :data-status="up(ev.to_status)">{{ titleize(ev.to_status) || '—' }}</span>
          </span>
          <span v-if="actor" class="led-actor"><User :size="11" />{{ actor }}</span>
          <span v-if="ev.note && !hasTransition" class="led-note">{{ ev.note }}</span>
        </div>
      </div>

      <div class="led-right">
        <span class="led-time as-mono" :title="fmtStamp(ev.created_at)">{{ relTime(ev.created_at) }}</span>
        <span class="led-chev" :class="{ open }"><ChevronDown :size="15" /></span>
      </div>
    </div>

    <Presence>
      <Motion v-if="open" as="div" class="led-exp"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <div class="led-exp-grid">
          <div class="led-meta"><span class="led-meta-k"><Clock3 :size="11" /> Recorded</span><span class="led-meta-v as-mono">{{ fmtStamp(ev.created_at) }}</span></div>
          <div class="led-meta"><span class="led-meta-k"><Hash :size="11" /> Ledger ref</span><span class="led-meta-v as-mono">{{ ledgerRef(ev.id) }}</span></div>
          <div v-if="actor" class="led-meta"><span class="led-meta-k"><User :size="11" /> Actor</span><span class="led-meta-v">{{ actor }}</span></div>
          <div v-if="ev.related_entity_type" class="led-meta"><span class="led-meta-k"><Boxes :size="11" /> Source</span><span class="led-meta-v">{{ titleize(ev.related_entity_type) }}</span></div>
        </div>

        <div v-if="ev.note" class="led-noteblock"><FileText :size="12" /> {{ ev.note }}</div>

        <div v-if="payloadChips.length" class="led-payload">
          <span class="led-payload-k">{{ payloadLabel }}</span>
          <span v-for="(c, ci) in payloadChips" :key="ci" class="led-payload-chip as-mono">{{ c }}</span>
        </div>

        <div class="led-links">
          <Motion v-if="ev.asset_code" as="button" type="button" class="led-link"
            :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.97 }" @click.stop="$emit('detail', ev.asset_id)">
            <History :size="13" /> Open asset timeline
          </Motion>
          <Motion v-if="tab" as="button" type="button" class="led-link"
            :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.97 }" @click.stop="$emit('go', tab)">
            <component :is="m.icon" :size="13" /> Go to {{ tabLabel }} <ArrowUpRight :size="13" />
          </Motion>
        </div>
      </Motion>
    </Presence>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronDown, ArrowRight, ArrowUpRight, History, User, Clock3, Hash, Boxes, FileText } from 'lucide-vue-next'
import { eventMeta, relatedTab, relTime, fmtStamp, titleize, EVENT_CATEGORIES } from './histEventMeta.js'
import { ledgerRef } from './ledgerMeta.js'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  ev: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['detail', 'go'])

const rowEl = ref(null)
const open = ref(false)
const reduced = prefersReduced()
usePointerSpotlight(rowEl)

const m = computed(() => eventMeta(props.ev.event_type))
const familyLabel = computed(() => (EVENT_CATEGORIES.find(c => c.key === m.value.category) || {}).label || titleize(m.value.category))
const hasTransition = computed(() => !!(props.ev.from_status || props.ev.to_status))
const actor = computed(() => props.ev.actor_name || props.ev.actor_employee_name || '')
const tab = computed(() => relatedTab(props.ev.related_entity_type))
const tabLabel = computed(() => titleize(props.ev.related_entity_type || ''))
const up = (s) => String(s || '').toUpperCase()

const payloadLabel = computed(() => {
  const p = props.ev.payload || {}
  return Array.isArray(p.fields) ? 'Fields changed' : 'Payload'
})
const payloadChips = computed(() => {
  const p = props.ev.payload || {}
  if (!p || typeof p !== 'object') return []
  if (Array.isArray(p.fields)) return p.fields.map(f => titleize(f)).slice(0, 12)
  return Object.entries(p)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${titleize(k)}: ${v}`)
    .slice(0, 8)
})
</script>

<style scoped>
.led-shell { list-style: none; }
.led { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 34px 1fr auto; align-items: center; gap: 12px;
  padding: 11px 14px 11px 16px; border-radius: 14px; cursor: pointer;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transition: border-color 0.22s, box-shadow 0.22s, transform 0.22s var(--as-spring); }
.led:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: var(--as-card-shadow-hover); transform: translateX(3px); }
.led.open { border-color: color-mix(in srgb, var(--c) 50%, transparent); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }

.led-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, transparent, var(--c), transparent); box-shadow: 0 0 12px -1px var(--c); }
.led-write { position: absolute; left: 0; top: 0; bottom: 0; width: 40%; pointer-events: none; opacity: 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 16%, transparent), transparent); }
.led-shell:hover .led-write { opacity: 1; }

.led-ref { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--as-text-dim); padding: 3px 7px; border-radius: 7px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); white-space: nowrap; }
.led-glyph { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.led-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.led-l1 { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.led-event { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.led-asset { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--as-amber); cursor: pointer;
  padding: 2px 7px; border-radius: 7px; background: color-mix(in srgb, var(--as-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); transition: background 0.18s; }
.led-asset:hover { background: color-mix(in srgb, var(--as-amber) 20%, transparent); }
.led-asset :deep(svg) { opacity: 0.7; }
.led-fam { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--c);
  padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, var(--c) 9%, transparent); border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); }

.led-l2 { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.led-morph { display: inline-flex; align-items: center; gap: 6px; }
.led-morph-arr { color: var(--as-text-dim); }
.led-st { font-family: var(--as-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 7px; border-radius: 6px;
  color: var(--as-steel); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.led-st.ghost { color: var(--as-text-dim); }
.led-st[data-status="AVAILABLE"], .led-st[data-status="RETURNED"], .led-st[data-status="COMPLETED"], .led-st[data-status="RESOLVED"], .led-st[data-status="FOUND"]
  { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 34%, transparent); }
.led-st[data-status="ALLOCATED"], .led-st[data-status="APPROVED"], .led-st[data-status="IN_PROGRESS"], .led-st[data-status="UNDER_REVIEW"]
  { color: var(--as-st-allocated); background: var(--as-st-allocated-soft); border-color: color-mix(in srgb, var(--as-st-allocated) 34%, transparent); }
.led-st[data-status="RESERVED"], .led-st[data-status="REQUESTED"], .led-st[data-status="SCHEDULED"], .led-st[data-status="REPORTED"], .led-st[data-status="PENDING"]
  { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 34%, transparent); }
.led-st[data-status="MAINTENANCE"] { color: var(--as-st-maintenance); background: var(--as-st-maintenance-soft); border-color: color-mix(in srgb, var(--as-st-maintenance) 34%, transparent); }
.led-st[data-status="RETIRED"], .led-st[data-status="CANCELLED"] { color: var(--as-st-retired); background: var(--as-st-retired-soft); border-color: color-mix(in srgb, var(--as-st-retired) 34%, transparent); }
.led-st[data-status="LOST"], .led-st[data-status="REJECTED"], .led-st[data-status="WRITE_OFF"], .led-st[data-status="MISSING"], .led-st[data-status="DAMAGED"]
  { color: var(--as-al-lost); background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 34%, transparent); }
.led-actor { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--as-text-muted); }
.led-actor :deep(svg) { color: var(--as-text-dim); }
.led-note { font-size: 11.5px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }

.led-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.led-time { font-size: 10.5px; color: var(--as-text-dim); letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
.led-chev { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--as-text-dim);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: transform 0.3s var(--as-spring), color 0.2s, background 0.2s; }
.led-chev.open { transform: rotate(180deg); color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }

/* expanded */
.led-exp { border: 1px solid color-mix(in srgb, var(--c, var(--as-amber)) 40%, transparent); border-top: none; border-radius: 0 0 14px 14px; margin-top: -1px;
  padding: 13px 16px 15px; background: var(--as-panel); display: flex; flex-direction: column; gap: 12px; }
.led-exp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.led-meta { display: flex; flex-direction: column; gap: 3px; }
.led-meta-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--as-text-dim); }
.led-meta-k :deep(svg) { color: var(--as-steel-dim); }
.led-meta-v { font-size: 12.5px; color: var(--as-text); font-weight: 600; word-break: break-word; }

.led-noteblock { display: flex; align-items: flex-start; gap: 7px; padding: 9px 11px; border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--as-text-secondary);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.led-noteblock :deep(svg) { color: var(--as-amber); flex-shrink: 0; margin-top: 2px; }

.led-payload { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.led-payload-k { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--as-text-dim); }
.led-payload-chip { font-size: 11px; color: var(--as-text-secondary); padding: 3px 8px; border-radius: 7px;
  background: color-mix(in srgb, var(--as-amber) 8%, transparent); border: 1px solid var(--as-border-soft); }

.led-links { display: flex; gap: 9px; flex-wrap: wrap; }
.led-link { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  padding: 7px 12px; border-radius: 10px; color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, color 0.2s, background 0.2s; }
.led-link:hover { color: var(--as-text); border-color: color-mix(in srgb, var(--as-amber) 45%, transparent); background: var(--as-surface-elevated); }
.led-link :deep(svg) { color: var(--as-amber); }

@media (max-width: 560px) {
  .led { grid-template-columns: 30px 1fr auto; }
  .led-ref { display: none; }
}
</style>
