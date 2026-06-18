<template>
  <Motion as="article" class="aec" ref="rootRef" :class="[fam, { open }]"
    :initial="reduced ? false : { opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.4, delay: Math.min(index * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <span class="aec-rail" aria-hidden="true" />
    <span class="aec-spot trn-spotlight" aria-hidden="true" />

    <button type="button" class="aec-main" @click="hasDetail && (open = !open)" :class="{ clickable: hasDetail }">
      <!-- action icon node -->
      <span class="aec-ic"><component :is="actionIcon" :size="16" /></span>

      <div class="aec-body">
        <div class="aec-line">
          <span class="aec-chip">{{ prettyLabel(ev.action) }}</span>
          <button type="button" class="aec-entity" @click.stop="$emit('go', tab)" :disabled="!tab"
            :title="tab ? `Open ${prettyLabel(ev.entity_type)} tab` : ''">
            <component :is="entityIcon(ev.entity_type)" :size="13" />
            {{ prettyLabel(ev.entity_type) }}
            <ArrowUpRight v-if="tab" :size="11" class="aec-entity-go" />
          </button>
          <span v-if="ev.actor_name" class="aec-actor">
            <span class="aec-avatar">{{ initials(ev.actor_name) }}</span>{{ ev.actor_name }}
          </span>
          <span v-else class="aec-actor system"><Cpu :size="12" /> System</span>
        </div>

        <div v-if="ev.from_status || ev.to_status" class="aec-flow">
          <span v-if="ev.from_status" class="aec-status">{{ prettyLabel(ev.from_status) }}</span>
          <span v-if="ev.from_status && ev.to_status" class="aec-flow-track" aria-hidden="true">
            <ArrowRight :size="12" />
          </span>
          <span v-if="ev.to_status" class="aec-status to">{{ prettyLabel(ev.to_status) }}</span>
        </div>

        <p v-if="ev.note" class="aec-note">{{ ev.note }}</p>
      </div>

      <div class="aec-right">
        <span class="aec-time" :title="absTime">{{ relTime(ev.created_at) }}</span>
        <span v-if="hasDetail" class="aec-toggle" :class="{ open }" aria-hidden="true"><ChevronDown :size="15" /></span>
      </div>
    </button>

    <!-- expandable payload detail (grid-rows 0fr→1fr reveal) -->
    <div class="aec-detail-wrap" :class="{ open }">
      <div class="aec-detail-inner">
        <div class="aec-detail">
          <div class="aec-meta">
            <span class="aec-meta-i"><Clock3 :size="11" /> {{ absTime }}</span>
            <span v-if="ev.entity_id" class="aec-meta-i mono"><Hash :size="11" /> {{ shortId }}</span>
          </div>

          <!-- before → after diff -->
          <div v-if="diffRows.length" class="aec-diff">
            <div v-for="(r, i) in diffRows" :key="i" class="aec-diff-row" :style="{ animationDelay: open ? (i * 0.04) + 's' : '0s' }">
              <span class="aec-diff-key">{{ prettyLabel(r.key) }}</span>
              <span class="aec-diff-from">{{ fmtVal(r.from) }}</span>
              <ArrowRight :size="11" class="aec-diff-arrow" />
              <span class="aec-diff-to">{{ fmtVal(r.to) }}</span>
            </div>
          </div>
          <!-- flat key/value rows -->
          <div v-else-if="kvRows.length" class="aec-kv">
            <div v-for="(r, i) in kvRows" :key="i" class="aec-kv-row" :style="{ animationDelay: open ? (i * 0.04) + 's' : '0s' }">
              <span class="aec-kv-key">{{ prettyLabel(r.key) }}</span>
              <span class="aec-kv-val mono">{{ fmtVal(r.value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ArrowRight, ArrowUpRight, ChevronDown, Clock3, Hash, Cpu,
  Plus, PencilLine, Trash2, UserPlus, Send, Check, X, CornerUpLeft,
  Ban, GraduationCap, ShieldOff, XOctagon, RefreshCw, Repeat, CalendarX, Star,
} from 'lucide-vue-next'
import { entityIcon, goTab, familyOf, prettyLabel, relTime } from './auditMeta.js'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  ev: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['go'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const open = ref(false)

const fam = computed(() => familyOf(props.ev.action))
const tab = computed(() => goTab(props.ev.entity_type))

const ACTION_ICONS = {
  CREATE: Plus, UPDATE: PencilLine, DELETE: Trash2, ASSIGN: UserPlus, SUBMIT: Send,
  APPROVE: Check, REJECT: X, RETURN: CornerUpLeft, CANCEL: Ban, FULFILL: GraduationCap,
  COMPLETE: Check, WAIVE: ShieldOff, FAIL: XOctagon, RENEW: RefreshCw, REASSIGN: Repeat,
  EXPIRE: CalendarX, FEEDBACK: Star,
}
const actionIcon = computed(() => ACTION_ICONS[props.ev.action] || PencilLine)

const absTime = computed(() => {
  const d = new Date(props.ev.created_at)
  if (isNaN(d)) return ''
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
})
const shortId = computed(() => String(props.ev.entity_id || '').slice(0, 8))

const initials = (n) => n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const diffRows = computed(() => {
  const p = props.ev.payload
  if (!isObj(p) || !isObj(p.before) || !isObj(p.after)) return []
  const keys = new Set([...Object.keys(p.before), ...Object.keys(p.after)])
  const rows = []
  for (const k of keys) {
    const from = p.before[k], to = p.after[k]
    if (JSON.stringify(from) !== JSON.stringify(to)) rows.push({ key: k, from, to })
  }
  return rows.slice(0, 12)
})
const kvRows = computed(() => {
  const p = props.ev.payload
  if (!isObj(p) || diffRows.value.length) return []
  return Object.entries(p).filter(([, v]) => !isObj(v) || Object.keys(v).length <= 6)
    .map(([key, value]) => ({ key, value })).slice(0, 12)
})
const hasDetail = computed(() => diffRows.value.length > 0 || kvRows.value.length > 0)

const fmtVal = (v) => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return s.length > 64 ? s.slice(0, 61) + '…' : s
}
</script>

<style scoped>
.aec { --c: var(--trn-amber); position: relative; overflow: hidden; border-radius: 15px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s; }
.aec.created { --c: var(--trn-amber); }
.aec.updated { --c: var(--trn-amber-strong); }
.aec.progressed { --c: var(--trn-st-completed); }
.aec.removed { --c: var(--trn-st-failed); }
.aec:hover { border-color: color-mix(in srgb, var(--c) 38%, transparent); box-shadow: var(--trn-card-shadow-hover); transform: translateY(-2px); }
.aec-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 25%, transparent));
  box-shadow: 0 0 12px -2px var(--c); }
.aec-spot { z-index: 0; }

.aec-main { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 12px; width: 100%; text-align: left;
  font: inherit; border: 0; background: transparent; padding: 13px 15px 13px 17px; cursor: default; }
.aec-main.clickable { cursor: pointer; }
.aec-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
  box-shadow: 0 0 16px -6px var(--c); }
.aec-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.aec-line { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.aec-chip { font-family: var(--trn-mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.aec-entity { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--trn-text);
  padding: 2px 4px; border: 0; background: transparent; border-radius: 7px; cursor: pointer; transition: color 0.2s, background 0.2s; }
.aec-entity:hover:not(:disabled) { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 10%, transparent); }
.aec-entity:disabled { cursor: default; }
.aec-entity-go { opacity: 0; transition: opacity 0.2s, transform 0.2s; }
.aec-entity:hover .aec-entity-go { opacity: 1; transform: translate(1px, -1px); }
.aec-actor { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trn-text-muted); }
.aec-actor.system :deep(svg) { color: var(--trn-text-dim); }
.aec-avatar { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 6px;
  font-family: var(--trn-mono); font-size: 8px; font-weight: 700; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }

.aec-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.aec-status { font-family: var(--trn-mono); font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 7px;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.aec-status.to { color: var(--c); border-color: color-mix(in srgb, var(--c) 36%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.aec-flow-track { display: inline-grid; place-items: center; color: var(--c); }
.aec-note { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }

.aec-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.aec-time { font-size: 11px; font-weight: 600; color: var(--trn-text-dim); white-space: nowrap; }
.aec-toggle { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--trn-text-muted);
  background: var(--trn-surface); transition: transform 0.35s var(--trn-spring), color 0.2s; }
.aec-toggle.open { transform: rotate(180deg); color: var(--c); }

/* grid-rows reveal — no JS height measuring */
.aec-detail-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.4s var(--trn-spring); }
.aec-detail-wrap.open { grid-template-rows: 1fr; }
.aec-detail-inner { overflow: hidden; min-height: 0; }
.aec-detail { padding: 0 16px 14px 17px; display: flex; flex-direction: column; gap: 9px; }
.aec-meta { display: flex; gap: 14px; flex-wrap: wrap; padding-top: 11px; border-top: 1px dashed var(--trn-border-soft); }
.aec-meta-i { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trn-text-muted); }
.aec-meta-i :deep(svg) { color: var(--trn-text-dim); }
.aec-meta-i.mono { font-family: var(--trn-mono); }

.aec-diff, .aec-kv { display: flex; flex-direction: column; gap: 5px; }
.aec-diff-row { display: grid; grid-template-columns: minmax(70px, 0.6fr) 1fr auto 1fr; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 9px; background: var(--trn-surface); }
.aec-kv-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 6px 10px; border-radius: 9px; background: var(--trn-surface); }
.aec.open .aec-diff-row, .aec.open .aec-kv-row { animation: aec-row-in 0.4s var(--trn-spring) backwards; }
.aec-diff-key, .aec-kv-key { font-size: 11px; font-weight: 600; color: var(--trn-text-muted); }
.aec-diff-from { font-family: var(--trn-mono); font-size: 11px; color: var(--trn-text-dim); text-decoration: line-through; opacity: 0.75; }
.aec-diff-arrow { color: var(--c); flex-shrink: 0; }
.aec-diff-to { font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-text); }
.aec-kv-val { font-size: 11.5px; color: var(--trn-text); text-align: right; word-break: break-word; }
.mono { font-family: var(--trn-mono); }

@keyframes aec-row-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .aec-detail-wrap { transition: none; }
  .aec.open .aec-diff-row, .aec.open .aec-kv-row { animation: none; }
}
</style>
