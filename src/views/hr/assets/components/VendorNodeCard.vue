<template>
  <Motion as="article" class="vn" :data-tone="tone" :data-vid="vendor.id" :class="{ off: !active, flash }" :style="{ '--i': index }"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :whileHover="{ y: -4 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <div class="vn-inner" ref="inner">
      <span class="as-spotlight" aria-hidden="true" />
      <span class="vn-edge" aria-hidden="true" />

      <header class="vn-head">
        <span class="vn-mono">
          <span class="vn-mono-ring" aria-hidden="true" />
          {{ initials }}
        </span>
        <div class="vn-id">
          <span class="vn-name" :title="vendor.name">{{ vendor.name }}</span>
          <span class="vn-sub">
            <span v-if="vendor.code" class="as-mono">{{ vendor.code }}</span>
            <span class="vn-state" :class="{ on: active }"><i />{{ active ? 'Active' : 'Inactive' }}</span>
          </span>
        </div>
      </header>

      <div class="vn-grade">
        <VendorStars :model-value="vendor.rating" readonly :size="14" show-value />
        <span class="vn-supply" :title="`${assets} assets sourced`">
          <span class="vn-supply-fig"><Boxes :size="13" /> <b>{{ assets }}</b> sourced</span>
          <span class="vn-supply-bar"><span class="vn-supply-fill" :style="{ width: drawn ? supplyPct + '%' : '0%' }" /></span>
        </span>
      </div>

      <div v-if="hasContact" class="vn-meta">
        <span v-if="vendor.contact_person" class="vn-line"><UserRound :size="12" /> {{ vendor.contact_person }}</span>
        <span v-if="vendor.email" class="vn-line"><Mail :size="12" /> {{ vendor.email }}</span>
        <span v-if="vendor.phone" class="vn-line"><Phone :size="12" /> {{ vendor.phone }}</span>
        <span v-if="vendor.website" class="vn-line"><Globe :size="12" /> {{ cleanUrl(vendor.website) }}</span>
        <span v-if="vendor.gstin" class="vn-line"><Hash :size="12" /> {{ vendor.gstin }}</span>
      </div>
      <div v-else class="vn-nocontact"><UserRound :size="13" /> No contact details on file</div>

      <footer class="vn-foot">
        <button type="button" class="vn-toggle" :class="{ on: active }" @click="$emit('toggle-active', vendor)" :title="active ? 'Deactivate supplier' : 'Activate supplier'">
          <span class="vn-toggle-knob" /><span class="vn-toggle-lab">{{ active ? 'Active' : 'Inactive' }}</span>
        </button>
        <div class="vn-actions">
          <button v-if="assets > 0" class="vn-act ghost" @click="$emit('view-assets', vendor)" title="View sourced assets"><Boxes :size="13" /> {{ assets }}</button>
          <button class="vn-act ghost" @click="$emit('edit', vendor)"><Pencil :size="13" /> Edit</button>
          <button class="vn-act danger" @click="$emit('delete', vendor)" title="Delete vendor"><Trash2 :size="13" /></button>
        </div>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { Boxes, UserRound, Mail, Phone, Globe, Hash, Pencil, Trash2 } from 'lucide-vue-next'
import VendorStars from './VendorStars.vue'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  vendor: { type: Object, required: true },
  index: { type: Number, default: 0 },
  maxAssets: { type: Number, default: 1 },
  flash: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete', 'toggle-active', 'view-assets'])

const inner = ref(null)
usePointerSpotlight(inner)

const active = computed(() => props.vendor.is_active !== false)
const assets = computed(() => props.vendor.asset_count || 0)
const supplyPct = computed(() => Math.max(4, Math.min(100, (assets.value / Math.max(1, props.maxAssets)) * 100)))
const tone = computed(() => {
  const r = props.vendor.rating || 0
  if (r >= 5) return 'gold'
  if (r >= 4) return 'amber'
  if (r >= 3) return 'ember'
  if (r >= 1) return 'steel'
  return 'none'
})
const initials = computed(() => (props.vendor.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())
const hasContact = computed(() => !!(props.vendor.contact_person || props.vendor.email || props.vendor.phone || props.vendor.website || props.vendor.gstin))
const cleanUrl = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

const drawn = ref(false)
onMounted(() => { if (prefersReduced()) { drawn.value = true; return } nextTick(() => setTimeout(() => { drawn.value = true }, 140 + Math.min(props.index * 45, 420))) })
</script>

<style scoped>
.vn { position: relative; border-radius: 18px; perspective: 1100px; will-change: transform; }
.vn-inner { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 16px 17px 14px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg));
  transition: transform 0.18s ease-out, box-shadow 0.3s, border-color 0.3s; transform-style: preserve-3d; }
.vn:hover .vn-inner { box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }
.vn.off .vn-inner { opacity: 0.82; }
.vn.flash .vn-inner { animation: vn-flash 1.4s var(--as-ease); }

/* rating tone */
.vn[data-tone="gold"]  { --tc: var(--as-amber-bright); }
.vn[data-tone="amber"] { --tc: var(--as-amber); }
.vn[data-tone="ember"] { --tc: var(--as-ember); }
.vn[data-tone="steel"] { --tc: var(--as-steel); }
.vn[data-tone="none"]  { --tc: var(--as-steel-dim); }
.vn-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); opacity: 0.7; box-shadow: 0 0 12px var(--tc); z-index: 2; }

/* head */
.vn-head { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
.vn-mono { position: relative; display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 13px;
  font-size: 15px; font-weight: 850; letter-spacing: 0.01em; color: var(--tc);
  background: radial-gradient(circle at 36% 28%, color-mix(in srgb, var(--tc) 22%, transparent), color-mix(in srgb, var(--tc) 8%, transparent));
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent); }
.vn-mono-ring { position: absolute; inset: -4px; border-radius: 16px; border: 1px dashed color-mix(in srgb, var(--tc) 36%, transparent); animation: vn-spin 18s linear infinite; }
.vn-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.vn-name { font-size: 15px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vn-sub { display: flex; align-items: center; gap: 9px; min-width: 0; }
.vn-sub .as-mono { font-size: 11px; color: var(--as-text-muted); }
.vn-state { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-st-retired); }
.vn-state i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.vn-state.on { color: var(--as-st-available); }
.vn-state.on i { box-shadow: 0 0 6px currentColor; }

/* grade row */
.vn-grade { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; z-index: 1; padding: 10px 12px; border-radius: 13px;
  background: color-mix(in srgb, var(--as-surface-elevated) 55%, transparent); border: 1px solid var(--as-border-soft); }
.vn-supply { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; min-width: 96px; }
.vn-supply-fig { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--as-text-muted); }
.vn-supply-fig :deep(svg) { color: var(--as-amber); }
.vn-supply-fig b { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.vn-supply-bar { width: 96px; height: 5px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--as-steel) 20%, transparent); }
.vn-supply-fill { display: block; height: 100%; border-radius: 999px; transition: width 1s var(--as-ease) 0.1s;
  background: linear-gradient(90deg, var(--as-ember), var(--as-amber-bright)); box-shadow: 0 0 7px color-mix(in srgb, var(--as-amber) 50%, transparent); }

/* meta */
.vn-meta { display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1; }
.vn-line { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--as-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vn-line :deep(svg) { color: var(--as-text-dim); flex-shrink: 0; }
.vn-nocontact { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--as-text-dim); font-style: italic; position: relative; z-index: 1; }

/* foot */
.vn-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; position: relative; z-index: 1; padding-top: 12px; border-top: 1px solid var(--as-border-soft); }
.vn-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px 4px 5px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.25s var(--as-spring); }
.vn-toggle-knob { position: relative; width: 26px; height: 15px; border-radius: 999px; background: color-mix(in srgb, var(--as-steel) 30%, transparent); transition: background 0.25s; flex-shrink: 0; }
.vn-toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: var(--as-text-dim); transition: transform 0.25s var(--as-spring), background 0.25s; }
.vn-toggle.on { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 34%, transparent); }
.vn-toggle.on .vn-toggle-knob { background: color-mix(in srgb, var(--as-st-available) 30%, transparent); }
.vn-toggle.on .vn-toggle-knob::after { transform: translateX(11px); background: var(--as-st-available); }
.vn-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.vn-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-secondary); transition: all 0.2s var(--as-spring); }
.vn-act:hover { transform: translateY(-1px); }
.vn-act.ghost:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.vn-act.danger { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 28%, transparent); background: color-mix(in srgb, var(--as-cond-poor) 8%, transparent); }
.vn-act.danger:hover { background: color-mix(in srgb, var(--as-cond-poor) 16%, transparent); }

@keyframes vn-spin { to { transform: rotate(360deg); } }
@keyframes vn-flash { 0%, 100% { box-shadow: var(--as-card-shadow); } 30% { box-shadow: 0 0 0 2px var(--tc), 0 0 26px -2px color-mix(in srgb, var(--tc) 65%, transparent); } }

@media (prefers-reduced-motion: reduce) {
  .vn-inner { transform: none !important; transition: box-shadow 0.3s, border-color 0.3s; }
  .vn-mono-ring { animation: none; }
  .vn-supply-fill { transition: none; }
}
</style>
