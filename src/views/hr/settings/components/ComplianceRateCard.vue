<template>
  <div class="crc-shell" :style="{ '--i': index, '--c': hex }">
    <div ref="cardEl" class="crc" :class="{ off: !active, unmapped: !mapped }">
      <span class="crc-glare" aria-hidden="true" />
      <span class="crc-spine" aria-hidden="true" />

      <header class="crc-head">
        <span class="crc-seal"><component :is="icon" :size="16" /></span>
        <div class="crc-id">
          <b>{{ label }}</b>
          <span class="crc-key set-mono">{{ row.key }}</span>
        </div>
        <span class="crc-stamp" :data-on="active">{{ active ? 'Active' : 'Off' }}</span>
      </header>

      <div class="crc-val">
        <template v-if="kind === 'slabs'">
          <span class="crc-val-slab"><Table2 :size="18" /> {{ slabCount }} slab{{ slabCount === 1 ? '' : 's' }}</span>
        </template>
        <template v-else>{{ valueText }}</template>
      </div>

      <div class="crc-meta">
        <span class="crc-chip" :data-scope="scopeKind"><component :is="scopeKind === 'state' ? MapPin : Globe2" :size="10" /> {{ scopeLabel }}</span>
        <span class="crc-chip"><CalendarRange :size="10" /> from {{ fmtDate(row.effective_from) }}</span>
        <span v-if="row.effective_to" class="crc-chip warn"><CalendarOff :size="10" /> to {{ fmtDate(row.effective_to) }}</span>
      </div>

      <p v-if="row.description" class="crc-desc">{{ row.description }}</p>

      <div class="crc-foot">
        <span v-if="mapped" class="crc-engine ok"><Plug :size="11" /> Engine-read</span>
        <span v-else class="crc-engine bad"><Unplug :size="11" /> Ignored by engine</span>
        <span class="crc-sp" />
        <button class="crc-toggle" :class="{ on: active }" type="button" @click.stop="$emit('toggle', row)" :title="active ? 'Active' : 'Inactive'">
          <span class="crc-toggle-knob" />
        </button>
        <Motion as="button" type="button" class="crc-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click.stop="$emit('edit', row)" title="Edit"><Pencil :size="13" /></Motion>
        <Motion as="button" type="button" class="crc-act danger" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click.stop="$emit('delete', row)" title="Remove"><Trash2 :size="13" /></Motion>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { PiggyBank, HeartPulse, Landmark, Receipt, Table2, MapPin, Globe2, CalendarRange, CalendarOff, Plug, Unplug, Pencil, Trash2, ShieldQuestion } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { catalogFor, FAMILY_HEX, displayValue } from './complianceCatalog'
import { titleCase } from '../composables/useHrSettings'

const props = defineProps({
  row: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'toggle'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const ICONS = { pf: PiggyBank, esi: HeartPulse, pt: Landmark, tax: Receipt }
const cat = computed(() => catalogFor(props.row.key))
const mapped = computed(() => !!cat.value)
const family = computed(() => cat.value?.family || null)
const hex = computed(() => FAMILY_HEX[family.value] || '#9ca3af')
const icon = computed(() => ICONS[family.value] || ShieldQuestion)
const label = computed(() => cat.value?.label || titleCase(props.row.key))
const kind = computed(() => cat.value?.kind || (props.row.value_json != null ? 'slabs' : 'money'))
const active = computed(() => props.row.is_active !== false)
const valueText = computed(() => displayValue(props.row))
const slabCount = computed(() => (Array.isArray(props.row.value_json) ? props.row.value_json.length : 0))
const scopeKind = computed(() => (props.row.state_code ? 'state' : 'national'))
const scopeLabel = computed(() => (props.row.state_code ? props.row.state_code : 'National'))
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) } catch { return String(d).slice(0, 10) } }
</script>

<style scoped>
.crc-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.crc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 14px 15px 12px 17px; border-radius: 15px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), box-shadow 0.3s, border-color 0.3s; transform: perspective(1000px) rotateX(0) rotateY(0); }
.crc:hover { box-shadow: var(--set-card-shadow-hover); border-color: color-mix(in srgb, var(--c) 38%, transparent);
  transform: perspective(1000px) rotateX(calc((var(--my,0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 6deg)) translateY(-3px); }
.crc.off { opacity: 0.66; }
.crc.unmapped { border-style: dashed; border-color: color-mix(in srgb, var(--set-conflict) 34%, transparent); }
.crc-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), color-mix(in srgb, var(--c) 18%, transparent), transparent 60%); }
.crc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 14px -2px var(--c); }

.crc-head { display: flex; align-items: center; gap: 10px; }
.crc-seal { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.crc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.crc-id b { font-size: 13.5px; font-weight: 800; color: var(--set-text); line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crc-key { font-size: 9.5px; color: var(--set-text-dim); }
.crc-stamp { flex-shrink: 0; font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; color: var(--set-unset); background: var(--set-unset-soft); }
.crc-stamp[data-on="true"] { color: var(--set-ok); background: var(--set-ok-soft); }

.crc-val { font-size: 26px; font-weight: 850; color: var(--set-text); line-height: 1; letter-spacing: -0.01em; }
.crc-val-slab { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; color: var(--c); }
.crc-val-slab :deep(svg) { color: var(--c); }

.crc-meta { display: flex; flex-wrap: wrap; gap: 5px; }
.crc-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: var(--set-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--set-surface); border: 1px solid var(--set-border); }
.crc-chip :deep(svg) { color: var(--set-text-dim); }
.crc-chip[data-scope="state"] { color: var(--set-orange); } .crc-chip[data-scope="state"] :deep(svg) { color: var(--set-orange); }
.crc-chip.warn { color: var(--set-partial); } .crc-chip.warn :deep(svg) { color: var(--set-partial); }
.crc-desc { margin: 0; font-size: 11px; line-height: 1.4; color: var(--set-text-muted); display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

.crc-foot { display: flex; align-items: center; gap: 7px; margin-top: 2px; padding-top: 10px; border-top: 1px solid var(--set-border); }
.crc-engine { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 750; padding: 3px 8px; border-radius: 999px; }
.crc-engine.ok { color: var(--set-ok); background: var(--set-ok-soft); } .crc-engine.ok :deep(svg) { color: var(--set-ok); }
.crc-engine.bad { color: var(--set-conflict); background: var(--set-conflict-soft); } .crc-engine.bad :deep(svg) { color: var(--set-conflict); }
.crc-sp { flex: 1; }
.crc-toggle { position: relative; width: 34px; height: 19px; border-radius: 999px; cursor: pointer; flex-shrink: 0; background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: background 0.25s; }
.crc-toggle-knob { position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: var(--set-unset); transition: transform 0.25s var(--set-spring), background 0.25s; }
.crc-toggle.on { background: var(--set-ok-soft); } .crc-toggle.on .crc-toggle-knob { transform: translateX(15px); background: var(--set-ok); }
.crc-act { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.crc-act:hover { color: var(--c); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.crc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); background: var(--set-conflict-soft); }

@media (prefers-reduced-motion: reduce) { .crc-shell { animation: none; } .crc:hover { transform: translateY(-2px); } }
</style>
