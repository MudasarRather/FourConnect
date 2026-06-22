<template>
  <!-- Cinematic "gate placard" — one per travel category.
       Outer shell runs the entrance; inner node carries the pointer-tilt so the
       two transforms never fight. Conic share-ring needs @property --p to tween. -->
  <div class="gate-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="gate" :class="{ off: !cat.is_active }" :style="{ '--c': accent }">
      <span class="gate-glare" aria-hidden="true" />
      <span class="gate-spine" aria-hidden="true" />

      <header class="gate-head">
        <span class="gate-ico"><component :is="iconComp" :size="19" /></span>
        <div class="gate-id">
          <h4 class="gate-name">{{ cat.name }}</h4>
          <span class="gate-code trv-mono">{{ cat.code }}</span>
        </div>
        <!-- share ring -->
        <button type="button" class="gate-ring" :style="{ '--p': ringDeg }" :title="`${share}% of classified tours`"
          @click="$emit('view', cat)">
          <span class="gate-ring-hole">
            <b>{{ share }}<i>%</i></b>
            <small>share</small>
          </span>
        </button>
      </header>

      <p v-if="cat.description" class="gate-desc">{{ cat.description }}</p>
      <p v-else class="gate-desc muted">No description — purely a classifier.</p>

      <!-- config telemetry -->
      <div class="gate-chips">
        <span class="chip" :class="{ live: fieldCount > 0 }" :title="fieldCount ? `${fieldCount} custom request field${fieldCount === 1 ? '' : 's'}` : 'No custom fields'">
          <SlidersHorizontal :size="12" /> {{ fieldCount }} field{{ fieldCount === 1 ? '' : 's' }}
        </span>
        <span v-if="cat.default_travel_type" class="chip" :title="`Defaults travel type to ${cat.default_travel_type}`">
          <Plane :size="12" /> {{ cat.default_travel_type }}
        </span>
        <span v-if="cat.requires_attachment" class="chip warn" title="A document is required on every request">
          <Paperclip :size="12" /> Proof required
        </span>
      </div>

      <footer class="gate-foot">
        <button type="button" class="gate-count" :title="`View ${cat.request_count || 0} tour${(cat.request_count || 0) === 1 ? '' : 's'}`" @click="$emit('view', cat)">
          <Ticket :size="13" /> <b>{{ cat.request_count || 0 }}</b> tour{{ (cat.request_count || 0) === 1 ? '' : 's' }}
          <ArrowRight :size="12" class="ga" />
        </button>
        <div class="gate-acts">
          <TrvSwitch :model-value="cat.is_active" :disabled="toggling" @update:model-value="$emit('toggle', cat)" />
          <Motion as="button" class="ic" title="Edit" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="$emit('edit', cat)"><Pencil :size="13" /></Motion>
          <Motion as="button" class="ic danger" title="Delete" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="$emit('remove', cat)"><Trash2 :size="13" /></Motion>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { SlidersHorizontal, Plane, Paperclip, Ticket, ArrowRight, Pencil, Trash2 } from 'lucide-vue-next'
import TrvSwitch from './TrvSwitch.vue'
import { categoryIcon } from '@/composables/useTravel'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  cat: { type: Object, required: true },
  index: { type: Number, default: 0 },
  total: { type: Number, default: 0 },     // total classified tours (for share)
  toggling: { type: Boolean, default: false },
})
defineEmits(['edit', 'remove', 'toggle', 'view'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const accent = computed(() => props.cat.color_hex || '#fbbf24')
const iconComp = computed(() => categoryIcon(props.cat.icon))
const fieldCount = computed(() => (props.cat.field_schema || []).length)
const share = computed(() => {
  const c = Number(props.cat.request_count) || 0
  return props.total ? Math.round((c / props.total) * 100) : 0
})
const ringDeg = computed(() => (share.value / 100) * 360 + 'deg')
</script>

<style scoped>
@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.gate-shell { animation: trv-deal 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: calc(var(--i) * 0.05s); }
.gate {
  --mx: 0.5; --my: 0.5; --spot: 0; position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 11px; height: 100%;
  padding: 16px 16px 14px; border-radius: 18px;
  background: var(--trv-surface); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-card-shadow);
  transition: transform 0.3s var(--trv-spring), box-shadow 0.3s, border-color 0.3s;
}
.gate:hover { transform: perspective(1100px)
  rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: var(--trv-shadow-hover); border-color: color-mix(in srgb, var(--c) 38%, var(--trv-border)); }
.gate.off { opacity: 0.74; }
.gate-glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(220px 220px at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }
.gate-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 14px -2px var(--c); }
.gate.off .gate-spine { background: var(--trv-steel-dim); box-shadow: none; }

.gate-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 11px; }
.gate-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.gate.off .gate-ico { color: var(--trv-text-muted); background: var(--trv-steel-soft); border-color: var(--trv-border); }
.gate-id { min-width: 0; }
.gate-name { font-size: 15px; font-weight: 760; color: var(--trv-text); margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gate-code { font-size: 10px; color: var(--trv-text-dim); }
.gate-ring { position: relative; width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0; cursor: pointer; padding: 0; border: none;
  background: conic-gradient(var(--c) var(--p), color-mix(in srgb, var(--trv-text-dim) 22%, transparent) 0);
  transition: --p 1.1s cubic-bezier(0.16,1,0.3,1); }
.gate-ring-hole { position: absolute; inset: 4px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--trv-surface-elevated); }
.gate-ring-hole b { font-size: 13px; font-weight: 800; color: var(--trv-text); line-height: 1; font-variant-numeric: tabular-nums; }
.gate-ring-hole b i { font-size: 8px; font-style: normal; color: var(--trv-text-muted); }
.gate-ring-hole small { font-size: 7px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); margin-top: 1px; }

.gate-desc { font-size: 12px; line-height: 1.45; color: var(--trv-text-secondary); margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gate-desc.muted { color: var(--trv-text-dim); font-style: italic; }

.gate-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; color: var(--trv-text-muted);
  padding: 4px 9px; border-radius: 8px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.chip.live { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.chip.warn { color: var(--trv-st-returned); border-color: var(--trv-st-returned-soft); background: var(--trv-st-returned-soft); }
.chip :deep(svg) { flex-shrink: 0; }

.gate-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 11px; border-top: 1px solid var(--trv-border); }
.gate-count { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--trv-text-muted);
  background: none; border: none; padding: 3px 4px; border-radius: 8px; cursor: pointer; transition: color 0.2s, background 0.2s; }
.gate-count b { color: var(--trv-text); font-weight: 750; }
.gate-count .ga { opacity: 0; transform: translateX(-3px); transition: opacity 0.2s, transform 0.2s; }
.gate-count:hover { color: var(--trv-amber); background: var(--trv-amber-soft); }
.gate-count:hover .ga { opacity: 1; transform: none; }
.gate-acts { display: flex; align-items: center; gap: 6px; }
.ic { display: grid; place-items: center; width: 28px; height: 28px; background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 8px; color: var(--trv-text-muted); cursor: pointer; }
.ic:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.ic.danger:hover { color: #f87171; border-color: rgba(239,68,68,0.4); }

[data-theme="light"] .gate-ring-hole { background: #fffdf8; }
@media (prefers-reduced-motion: reduce) {
  .gate-shell { animation: none; }
  .gate, .gate-ring { transition: none; }
}
</style>
