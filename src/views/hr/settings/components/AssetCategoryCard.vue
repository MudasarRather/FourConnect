<template>
  <div class="ac-shell" :style="{ '--acc': hue, '--i': index }">
    <div ref="inner" class="ac" :class="{ off: !active, perm: permanent }">
      <span class="ac-glare" aria-hidden="true" />
      <span class="ac-spine" aria-hidden="true" />

      <div class="ac-main">
        <header class="ac-head">
          <span class="ac-ic"><component :is="permanent ? ShieldCheck : Boxes" :size="16" /></span>
          <div class="ac-id">
            <b class="ac-name">{{ category.name || '—' }}</b>
            <span class="ac-code set-mono"><Hash :size="9" />{{ category.code }}</span>
          </div>
          <span class="ac-dot" :data-on="active" :title="active ? 'Active' : 'Inactive'" />
        </header>

        <!-- lineage -->
        <div class="ac-lineage" :class="{ orphan: orphaned }">
          <GitBranch :size="11" />
          <template v-if="parent">
            <span>under <b>{{ parent.name }}</b></span>
            <i v-if="orphaned" class="ac-orphan"><TriangleAlert :size="9" /> parent inactive</i>
          </template>
          <span v-else class="ac-toplevel">top-level class</span>
        </div>

        <!-- chips -->
        <div class="ac-chips">
          <span class="ac-chip" :class="{ perm: permanent }">
            <component :is="permanent ? Infinity : CalendarClock" :size="10" />
            {{ permanent ? 'Permanent' : lifeLabel }}
          </span>
          <span class="ac-chip">
            <TrendingDown :size="10" />{{ methodLabel }}
          </span>
          <span v-if="typeLabel" class="ac-chip muted"><Tag :size="10" />{{ typeLabel }}</span>
        </div>

        <footer class="ac-foot">
          <button type="button" class="ac-toggle" :class="{ on: active }" @click="$emit('toggle', category)">
            <span class="ac-toggle-knob" />{{ active ? 'Active' : 'Inactive' }}
          </button>
          <button type="button" class="ac-act" title="Edit class" @click="$emit('edit', category)"><FilePen :size="14" /></button>
          <button type="button" class="ac-act danger" :class="{ guarded: locked }"
            :title="locked ? `${count} assets filed here — guarded delete` : 'Delete class'" @click="$emit('delete', category)">
            <component :is="locked ? ShieldAlert : Trash2" :size="14" />
          </button>
        </footer>
      </div>

      <!-- lifespan mini-meter (echoes The Lifespan Cellar) -->
      <button type="button" class="ac-meter" :class="{ perm: permanent, off: !active }"
        :style="{ '--fill': fill, '--cad': cad + 's' }" :title="`${count} assets in this class`"
        @click="count ? $emit('view', category) : $emit('edit', category)">
        <span class="ac-meter-cap">
          <span v-if="permanent" class="ac-meter-inf"><Infinity :size="9" /></span>
        </span>
        <span class="ac-meter-cyl" aria-hidden="true">
          <span v-if="!permanent && active" class="ac-meter-stream" />
          <span class="ac-meter-fluid"><span class="ac-meter-men" /></span>
        </span>
        <span class="ac-meter-val">
          <b class="set-mono"><SetCountUp :value="count" /></b>
          <em>{{ count === 1 ? 'asset' : 'assets' }}</em>
        </span>
        <span v-if="count" class="ac-meter-go"><ArrowUpRight :size="11" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Boxes, ShieldCheck, Hash, GitBranch, TriangleAlert, CalendarClock, Infinity,
  TrendingDown, Tag, FilePen, Trash2, ShieldAlert, ArrowUpRight,
} from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  category: { type: Object, required: true },
  index: { type: Number, default: 0 },
  parent: { type: Object, default: null },     // { name, is_active } | null
  maxCount: { type: Number, default: 1 },
})
defineEmits(['edit', 'delete', 'toggle', 'view'])

const inner = ref(null)
usePointerSpotlight(inner)

const RAMP = ['#fbbf24', '#f59e0b', '#fb923c', '#d97706', '#ea580c', '#b45309']
const count = computed(() => Number(props.category.asset_count || 0))
const active = computed(() => props.category.is_active !== false)
const permanent = computed(() =>
  props.category.depreciation_method === 'NONE' ||
  (!props.category.depreciation_method && !props.category.useful_life_months))
const hue = computed(() => permanent.value ? 'var(--set-ok)' : RAMP[props.index % RAMP.length])
const locked = computed(() => count.value > 0)
const orphaned = computed(() => !!props.parent && props.parent.is_active === false)

const lifeLabel = computed(() => {
  const m = Number(props.category.useful_life_months || 0)
  if (!m) return 'No life set'
  return m % 12 === 0 ? `${m / 12} yr life` : `${m} mo life`
})
const methodLabel = computed(() =>
  props.category.depreciation_method === 'STRAIGHT_LINE' ? 'Straight-line'
    : props.category.depreciation_method === 'NONE' ? 'No depreciation' : 'Method not set')
const TYPE_LABELS = {
  LAPTOP: 'Laptop', DESKTOP: 'Desktop', MONITOR: 'Monitor', MOBILE: 'Mobile', SIM: 'SIM',
  RFID_CARD: 'RFID Card', ID_CARD: 'ID Card', HEADSET: 'Headset', KEYBOARD: 'Keyboard',
  MOUSE: 'Mouse', VEHICLE: 'Vehicle', KEYS: 'Keys', OTHER: 'Other',
}
const typeLabel = computed(() => {
  const allowed = Array.isArray(props.category.allowed_asset_types) ? props.category.allowed_asset_types : []
  if (allowed.length > 1) return `${allowed.length} types`
  const t = allowed[0] || props.category.default_asset_type
  return t ? (TYPE_LABELS[t] || 'Type') : ''
})

const fill = computed(() => Math.round(Math.max(10, (count.value / Math.max(1, props.maxCount)) * 100)))
const cad = computed(() => {
  const life = Number(props.category.useful_life_months || 0)
  if (!life) return 4
  return Math.min(7, Math.max(1.3, life / 9))
})
</script>

<style scoped>
.ac-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.ac { position: relative; overflow: hidden; display: flex; gap: 12px; padding: 15px 15px 13px 17px;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s; }
.ac:hover { border-color: color-mix(in srgb, var(--acc) 38%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-2px); }
.ac.off { opacity: 0.7; }
.ac-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--acc) 18%, transparent), transparent 60%); }
.ac-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); box-shadow: 0 0 12px -2px var(--acc); }

.ac-main { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.ac-head { display: flex; align-items: center; gap: 10px; }
.ac-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.ac-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ac-name { font-size: 14px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ac-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.ac-code :deep(svg) { opacity: 0.6; }
.ac-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.ac-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.ac-lineage { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--set-text-muted); }
.ac-lineage :deep(svg) { color: var(--set-text-dim); flex-shrink: 0; }
.ac-lineage b { color: var(--set-text-secondary); font-weight: 700; }
.ac-toplevel { color: var(--set-text-dim); }
.ac-orphan { display: inline-flex; align-items: center; gap: 3px; font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.03em;
  text-transform: uppercase; color: var(--set-partial); padding: 1px 6px; border-radius: 999px; background: var(--set-partial-soft); }
.ac-orphan :deep(svg) { color: var(--set-partial); }
.ac-lineage.orphan { color: var(--set-partial); }

.ac-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.ac-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 650; color: var(--set-text-secondary);
  padding: 3px 8px; border-radius: 8px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ac-chip :deep(svg) { color: var(--acc); }
.ac-chip.perm { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 28%, transparent); }
.ac-chip.perm :deep(svg) { color: var(--set-ok); }
.ac-chip.muted { color: var(--set-text-muted); }
.ac-chip.muted :deep(svg) { color: var(--set-text-dim); }

.ac-foot { display: flex; align-items: center; gap: 7px; margin-top: 2px; }
.ac-toggle { flex: 1; display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.2s; }
.ac-toggle.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); }
.ac-toggle-knob { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ac-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.ac-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.ac-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.ac-act.guarded { color: var(--set-partial); }
.ac-act.guarded:hover { color: var(--set-partial); border-color: color-mix(in srgb, var(--set-partial) 40%, transparent); }

/* ── mini lifespan meter ── */
.ac-meter { position: relative; flex-shrink: 0; width: 58px; display: flex; flex-direction: column; align-items: center; gap: 0;
  padding: 0; border: 0; background: transparent; cursor: pointer; font: inherit; align-self: stretch; }
.ac-meter-cap { position: relative; width: 50%; height: 5px; border-radius: 3px 3px 0 0; flex-shrink: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 55%, transparent), transparent); }
.ac-meter-inf { position: absolute; left: 50%; top: -13px; transform: translateX(-50%); display: grid; place-items: center;
  width: 15px; height: 15px; border-radius: 50%; color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); }
.ac-meter-cyl { position: relative; width: 26px; flex: 1; min-height: 44px; border-radius: 6px 6px 4px 4px; overflow: hidden;
  border: 1px solid var(--set-border-strong); border-top: 0; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12)); }
.ac-meter-fluid { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--fill, 30) * 1%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 78%, transparent), color-mix(in srgb, var(--acc) 40%, transparent));
  transition: height 0.9s var(--set-spring); }
.ac-meter-men { position: absolute; left: -10%; right: -10%; top: -2px; height: 4px; border-radius: 50%;
  background: color-mix(in srgb, var(--acc) 70%, white 18%); box-shadow: 0 0 7px -1px var(--acc); animation: ac-ripple 3.2s ease-in-out infinite; }
.ac-meter-stream { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 2px; height: calc((100 - var(--fill, 30)) * 1%); overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 30%); mask-image: linear-gradient(180deg, transparent, #000 30%); }
.ac-meter-stream::after { content: ''; position: absolute; left: -1px; right: -1px; top: -40%; height: 40%;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--acc) 90%, white 30%), transparent); animation: ac-meter var(--cad, 4s) linear infinite; }
.ac-meter.perm .ac-meter-cyl { border-color: color-mix(in srgb, var(--set-ok) 28%, var(--set-border-strong)); }
.ac-meter.perm .ac-meter-fluid { background: linear-gradient(180deg, color-mix(in srgb, var(--set-ok) 40%, transparent), color-mix(in srgb, var(--set-ok) 18%, transparent)); }
.ac-meter.perm .ac-meter-men { background: color-mix(in srgb, var(--set-ok) 70%, white 12%); box-shadow: 0 0 7px -1px var(--set-ok); }
.ac-meter.off { filter: grayscale(0.6) brightness(0.85); }
.ac-meter-val { display: flex; flex-direction: column; align-items: center; line-height: 1.05; padding-top: 5px; }
.ac-meter-val b { font-size: 13px; font-weight: 850; color: var(--set-text); }
.ac-meter-val em { font-style: normal; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.ac-meter-go { position: absolute; right: -2px; top: -2px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); opacity: 0; transform: scale(0.7); transition: all 0.22s var(--set-spring); }
.ac-meter:hover .ac-meter-go { opacity: 1; transform: scale(1); }
.ac-meter:hover .ac-meter-cyl { border-color: color-mix(in srgb, var(--acc) 50%, transparent); box-shadow: 0 0 16px -5px color-mix(in srgb, var(--acc) 60%, transparent); }

[data-theme="light"] .ac-meter-cyl { background: linear-gradient(90deg, rgba(40,25,10,0.04), rgba(40,25,10,0.08)); }

@keyframes ac-ripple { 0%, 100% { transform: scaleX(1); opacity: 0.85; } 50% { transform: scaleX(0.9); opacity: 1; } }
@keyframes ac-meter { 0% { top: -40%; } 100% { top: 100%; } }

@media (prefers-reduced-motion: reduce) {
  .ac-shell { animation: none; }
  .ac:hover { transform: translateY(-2px); }
  .ac-meter-men, .ac-meter-stream::after { animation: none; }
  .ac-meter-fluid { transition: none; }
}
</style>
