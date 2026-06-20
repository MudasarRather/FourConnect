<template>
  <Motion as="li" class="hev" :class="{ active, first, last }" :style="{ '--c': meta.color, '--i': index }" :id="domId"
    :initial="reduced ? false : { opacity: 0, x: -16, filter: 'blur(5px)' }"
    :animate="{ opacity: 1, x: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.46, delay: Math.min(index * 0.05, 0.6), ease: [0.16, 1, 0.3, 1] }">
    <!-- node + connector spine column -->
    <span class="hev-rail" aria-hidden="true">
      <span class="hev-node">
        <component :is="meta.icon" :size="13" />
        <span v-if="active" class="hev-node-pulse" />
      </span>
      <span v-if="!last" class="hev-line"><span class="hev-line-fill" /></span>
    </span>

    <!-- capsule card -->
    <Motion class="hev-card" as="div"
      :whileHover="{ y: -2 }" :transition="{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }">
      <span class="hev-sheen" aria-hidden="true" />
      <div class="hev-head">
        <span class="hev-title">{{ meta.label }}</span>
        <span class="hev-time as-mono">{{ fmtStamp(event.created_at) }}</span>
      </div>

      <!-- status flow -->
      <div v-if="event.from_status || event.to_status" class="hev-flow">
        <span v-if="event.from_status" class="hev-flow-pill as-mono">{{ event.from_status }}</span>
        <span v-if="event.from_status && event.to_status" class="hev-flow-arrow"><ArrowRight :size="12" /></span>
        <span v-if="event.to_status" class="hev-flow-pill to as-mono">{{ event.to_status }}</span>
      </div>

      <p v-if="event.note" class="hev-note">{{ event.note }}</p>

      <!-- payload chips -->
      <div v-if="chips.length" class="hev-chips">
        <span v-for="c in chips" :key="c.k" class="hev-chip"><b>{{ c.k }}</b> {{ c.v }}</span>
      </div>

      <footer class="hev-foot">
        <span class="hev-actor">
          <template v-if="custodian">
            <span class="hev-av">{{ initials(custodian) }}</span>{{ custodian }}
            <span v-if="showOperator" class="hev-by">· logged by {{ operator }}</span>
          </template>
          <template v-else-if="operator">
            <span class="hev-av">{{ initials(operator) }}</span>{{ operator }}
          </template>
          <span v-else class="hev-actor-sys"><Cpu :size="11" /> system</span>
        </span>
        <Motion v-if="jumpTab" as="button" type="button" class="hev-jump"
          :whileHover="{ x: 3 }" :whileTap="{ scale: 0.95 }" @click="$emit('go', jumpTab)">
          Open {{ jumpLabel }} <ArrowUpRight :size="13" />
        </Motion>
      </footer>
    </Motion>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ArrowRight, ArrowUpRight, Cpu } from 'lucide-vue-next'
import { eventMeta, relatedTab, fmtStamp, titleize } from './histEventMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  event: { type: Object, required: true },
  index: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
})
defineEmits(['go'])

const reduced = prefersReduced()

const meta = computed(() => eventMeta(props.event.event_type))
const domId = computed(() => `hev-${props.event.id}`)

// custodian = the employee the event concerns (holder); operator = the user who recorded it.
// Surfacing the custodian first stops "acknowledged by <admin>" reading as if the admin holds the asset.
const custodian = computed(() => props.event.actor_employee_name || '')
const operator = computed(() => props.event.actor_name || '')
const norm = (s) => (s || '').trim().toLowerCase()
const showOperator = computed(() => operator.value && norm(operator.value) !== norm(custodian.value))
const jumpTab = computed(() => relatedTab(props.event.related_entity_type))
const TAB_LABELS = { allocations: 'allocation', transfers: 'transfer', maintenance: 'service', damage: 'damage report', disposal: 'disposal', audits: 'audit' }
const jumpLabel = computed(() => TAB_LABELS[jumpTab.value] || jumpTab.value)

const SKIP = new Set(['id', 'asset_id', 'allocation_id', 'employee_id', 'actor_user_id', 'actor_employee_id', 'process_id'])
const chips = computed(() => {
  const p = props.event.payload || {}
  const out = []
  for (const [k, v] of Object.entries(p)) {
    if (SKIP.has(k) || v === null || v === undefined || v === '') continue
    if (typeof v === 'object') continue
    const str = String(v)
    if (str.length > 40) continue
    out.push({ k: titleize(k), v: titleize(str) })
    if (out.length >= 4) break
  }
  return out
})

const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
</script>

<style scoped>
.hev { position: relative; display: flex; gap: 15px; padding-bottom: 16px; list-style: none; }

/* rail column */
.hev-rail { position: relative; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 30px; }
.hev-node { position: relative; z-index: 2; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 15%, var(--as-surface)); border: 1px solid color-mix(in srgb, var(--c) 38%, transparent);
  transition: transform 0.3s var(--as-spring), box-shadow 0.3s; }
.hev.active .hev-node { transform: scale(1.18); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 16%, transparent), 0 0 18px color-mix(in srgb, var(--c) 60%, transparent); }
.hev-node-pulse { position: absolute; inset: -4px; border-radius: 13px; border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent); animation: hev-pulse 1.8s ease-out infinite; }
.hev-line { position: relative; flex: 1; width: 2px; margin-top: 2px; background: var(--as-border-soft); overflow: hidden; border-radius: 2px; min-height: 14px; }
.hev-line-fill { position: absolute; inset: 0; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 12%, transparent)); opacity: 0.55;
  transform-origin: top; transform: scaleY(0); animation: hev-draw 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.05s + 0.18s); }

/* capsule */
.hev-card { position: relative; overflow: hidden; flex: 1; min-width: 0; padding: 12px 14px; border-radius: 14px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transition: border-color 0.25s, box-shadow 0.25s; }
.hev.active .hev-card { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: var(--as-card-shadow-hover); }
.hev-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(115deg, transparent 30%, color-mix(in srgb, var(--c) 14%, transparent) 50%, transparent 70%);
  background-size: 220% 100%; }
.hev.active .hev-sheen { opacity: 1; animation: hev-sheen 1.1s ease-out 1; }

.hev-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.hev-title { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.hev-time { font-size: 10.5px; color: var(--as-text-dim); white-space: nowrap; flex-shrink: 0; }

.hev-flow { display: inline-flex; align-items: center; gap: 7px; margin-top: 8px; }
.hev-flow-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hev-flow-pill.to { color: var(--c); border-color: color-mix(in srgb, var(--c) 36%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.hev-flow-arrow { display: inline-flex; color: var(--as-text-dim); }

.hev-note { margin: 9px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--as-text-secondary); }
.hev-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.hev-chip { font-size: 10.5px; color: var(--as-text-secondary); padding: 3px 9px; border-radius: 7px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hev-chip b { color: var(--as-text-dim); font-weight: 700; margin-right: 3px; text-transform: uppercase; letter-spacing: 0.03em; font-size: 9.5px; }

.hev-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 11px; }
.hev-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 600; color: var(--as-text-muted); min-width: 0; }
.hev-av { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; font-size: 9px; font-weight: 800;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }
.hev-actor-sys { font-style: italic; }
.hev-actor-sys :deep(svg) { color: var(--as-text-dim); }
.hev-by { font-size: 10.5px; font-weight: 500; color: var(--as-text-dim); white-space: nowrap; }
.hev-jump { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; flex-shrink: 0;
  color: var(--c); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--c) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); transition: background 0.2s; }
.hev-jump:hover { background: color-mix(in srgb, var(--c) 18%, transparent); }

@keyframes hev-pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes hev-sheen { from { background-position: 180% 0; } to { background-position: -60% 0; } }
@keyframes hev-draw { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .hev-node-pulse, .hev.active .hev-sheen { animation: none; }
  .hev-line-fill { animation: none; transform: scaleY(1); }
}
</style>
