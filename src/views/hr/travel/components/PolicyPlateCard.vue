<template>
  <div class="pp-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="pp" :class="{ inactive: !p.is_active }" :style="{ '--c': cabin.hex }">
      <span class="pp-glare" aria-hidden="true" />
      <span class="pp-spine" />

      <!-- header -->
      <header class="pp-head">
        <div class="pp-id">
          <button class="pp-name" @click="$emit('detail', p)" :title="p.policy_name">{{ p.policy_name }}</button>
          <span class="pp-scope trv-mono"><Layers :size="10" /> {{ p.grade_name || 'All grades' }} · {{ p.travel_scope }}</span>
        </div>
        <div class="pp-plate" :style="{ '--c': cabin.hex }">
          <Plane :size="11" />
          <span>{{ cabin.short }}</span>
        </div>
      </header>

      <p v-if="p.description" class="pp-desc">{{ p.description }}</p>

      <!-- entitlement strip -->
      <div class="pp-ents">
        <span class="ent" :class="{ off: cabin.rung === 0 }"><Plane :size="12" /> {{ cabin.label }}</span>
        <span class="ent" :class="{ off: trainShort === 'None' }"><TrainFront :size="12" /> {{ trainLabel }}</span>
        <span class="ent" :class="{ off: !p.hotel_category }"><Hotel :size="12" /> {{ p.hotel_category || 'No hotel' }}</span>
        <span class="ent" :class="{ off: !p.da_eligible }"><Calculator :size="12" /> {{ p.da_eligible ? 'DA eligible' : 'No DA' }}</span>
        <span class="ent accent"><Wallet :size="12" /> {{ p.advance_limit ? '≤ ' + fmtINR(p.advance_limit) : 'No cap' }}</span>
      </div>

      <!-- approval-chain runway -->
      <div class="pp-chain">
        <span class="pp-chain-lab"><ShieldCheck :size="11" /> Approval runway</span>
        <div class="runway">
          <template v-for="(s, k) in chain" :key="k">
            <div class="rw-node" :style="{ '--c': approverTypeMeta(s.approver_type).hex }" :title="s.label || approverTypeMeta(s.approver_type).label">
              <span class="rw-dot"><component :is="approverTypeMeta(s.approver_type).icon" :size="12" /></span>
              <span class="rw-lab">{{ stageLabel(s) }}</span>
            </div>
            <span v-if="k < chain.length - 1" class="rw-link" aria-hidden="true" />
          </template>
        </div>
        <span v-if="!p.approval_chain || !p.approval_chain.length" class="pp-default">default chain</span>
      </div>

      <!-- footer -->
      <footer class="pp-foot">
        <TrvSwitch :model-value="p.is_active" @update:model-value="$emit('toggle', p)" :on-label="'Active'" :off-label="'Inactive'" label="Active" />
        <div class="pp-acts">
          <button class="ic" @click="$emit('edit', p)" title="Edit policy"><Pencil :size="14" /></button>
          <button class="ic danger" @click="$emit('remove', p)" title="Delete policy"><Trash2 :size="14" /></button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plane, TrainFront, Hotel, Calculator, Wallet, ShieldCheck, Layers, Pencil, Trash2 } from 'lucide-vue-next'
import TrvSwitch from './TrvSwitch.vue'
import { fmtINR, flightClassMeta, approverTypeMeta, TRAIN_CLASSES, DEFAULT_TRAVEL_CHAIN } from '@/composables/useTravel'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ p: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['edit', 'remove', 'toggle', 'detail'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const cabin = computed(() => flightClassMeta(props.p.flight_eligibility))
const trainMeta = computed(() => TRAIN_CLASSES.find(t => t.key === String(props.p.train_class || '').toUpperCase()) || TRAIN_CLASSES[0])
const trainShort = computed(() => trainMeta.value.short)
const trainLabel = computed(() => trainMeta.value.label)
const chain = computed(() => (props.p.approval_chain && props.p.approval_chain.length) ? props.p.approval_chain : DEFAULT_TRAVEL_CHAIN)
const stageLabel = (s) => {
  const base = s.label || approverTypeMeta(s.approver_type).label
  return base.length > 12 ? base.slice(0, 11) + '…' : base
}
</script>

<style scoped>
.pp-shell { animation: trv-deal 0.5s var(--trv-spring) both; animation-delay: calc(var(--i, 0) * 0.05s); }
.pp { position: relative; overflow: hidden; padding: 16px 18px 14px; border-radius: 18px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: transform 0.3s var(--trv-spring), border-color 0.3s, box-shadow 0.3s; will-change: transform; }
.pp::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c), transparent 80%); opacity: 0.9; }
.pp:hover { transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 36%, var(--trv-border-strong)); box-shadow: var(--trv-shadow-hover); }
.pp.inactive { opacity: 0.74; }
.pp.inactive::before { background: var(--trv-steel-soft); }
.pp-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(440px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), color-mix(in srgb, var(--c) 16%, transparent), transparent 60%); }
.pp-spine { position: absolute; top: 14px; bottom: 14px; left: 0; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); opacity: 0.85; }

.pp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.pp-id { min-width: 0; }
.pp-name { display: block; font-size: 15.5px; font-weight: 800; color: var(--trv-text); background: none; border: none; padding: 0; cursor: pointer; text-align: left;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.pp-name:hover { color: var(--trv-amber); }
.pp-scope { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--trv-text-dim); margin-top: 2px; }
.pp-plate { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 6px 11px; border-radius: 9px;
  font-size: 11px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; color: #1a1205;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 90%, #fff 10%), var(--c)); box-shadow: 0 4px 16px -5px color-mix(in srgb, var(--c) 70%, transparent); }
.pp.inactive .pp-plate { background: var(--trv-steel-soft); color: var(--trv-text-muted); box-shadow: none; }

.pp-desc { margin: 0 0 11px; font-size: 11.5px; line-height: 1.5; color: var(--trv-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.pp-ents { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 13px; }
.ent { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11px; color: var(--trv-text-secondary);
  background: var(--trv-panel); border: 1px solid var(--trv-border); }
.ent.off { color: var(--trv-text-dim); opacity: 0.8; }
.ent.accent { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }

.pp-chain { padding: 12px 0 13px; border-top: 1px solid var(--trv-border); }
.pp-chain-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); margin-bottom: 11px; }
.runway { display: flex; align-items: flex-start; }
.rw-node { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; width: 58px; }
.rw-dot { display: inline-flex; padding: 6px; border-radius: 50%; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent); }
.rw-lab { font-size: 8.5px; font-weight: 600; color: var(--trv-text-muted); text-align: center; line-height: 1.2; }
.rw-link { flex: 1; height: 2px; margin-top: 13px; min-width: 12px; border-radius: 2px;
  background: repeating-linear-gradient(90deg, var(--trv-amber-border) 0 4px, transparent 4px 8px); }
.pp-default { display: inline-block; margin-top: 8px; font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-dim); }

.pp-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 12px; border-top: 1px solid var(--trv-border); }
.pp-acts { display: flex; gap: 6px; }
.ic { display: inline-flex; padding: 7px; border-radius: 8px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; transition: all 0.2s; }
.ic:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.ic.danger:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }

@media (prefers-reduced-motion: reduce) { .pp-shell { animation: none; } .pp:hover { transform: translateY(-3px); } }
</style>
