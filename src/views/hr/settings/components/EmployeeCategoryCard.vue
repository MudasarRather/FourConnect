<template>
  <div class="ecc-shell" :style="{ '--i': index, '--hue': hue }">
    <div ref="inner" class="ecc" :class="{ off: !category.is_active, system: category.is_system }">
      <span class="ecc-glare" aria-hidden="true" />
      <span class="ecc-grain" aria-hidden="true" />
      <span class="ecc-spine" aria-hidden="true" />

      <header class="ecc-head">
        <span class="ecc-ic"><component :is="glyph" :size="17" /></span>
        <div class="ecc-id">
          <b class="ecc-name" :title="category.label">{{ category.label }}</b>
          <span class="ecc-code set-mono"><Hash :size="9" />{{ category.code }}</span>
        </div>
        <span v-if="category.is_system" class="ecc-sys"><Lock :size="10" /> Built-in</span>
        <span v-else class="ecc-dot" :data-on="category.is_active" :title="category.is_active ? 'Active' : 'Inactive'" />
      </header>

      <p class="ecc-desc">{{ category.description || 'A staff classification that scopes policy across HR.' }}</p>

      <!-- scope chips: what this classification governs -->
      <div class="ecc-scopes">
        <span v-for="s in SCOPES" :key="s.label" class="ecc-scope" :title="`Scopes ${s.label}`">
          <component :is="s.icon" :size="10" /> {{ s.label }}
        </span>
        <span v-if="lifecycle" class="ecc-scope life" :title="`Built-in: ${category.code} maps to the ${lifecycle} lifecycle state`">
          <Workflow :size="10" /> → {{ lifecycle }}
        </span>
      </div>

      <!-- population deposit -->
      <button type="button" class="ecc-pop" :class="{ filled: headcount > 0 }" @click.stop="$emit('view', category)"
        :title="headcount + ' employee(s) classified ' + category.label">
        <div class="ecc-pop-top">
          <span class="ecc-pop-lab"><Users :size="11" /> Population</span>
          <span class="ecc-pop-num"><b><SetCountUp :value="headcount" /></b><i v-if="hasWorkforce">{{ share }}%</i><i v-else class="none">—</i></span>
        </div>
        <span class="ecc-pop-bar"><i :style="{ width: hasWorkforce ? Math.max(2, share) + '%' : '0%' }" /></span>
      </button>

      <footer class="ecc-foot">
        <button v-if="!category.is_system" type="button" class="ecc-toggle" :class="{ on: category.is_active }" @click.stop="$emit('toggle', category)"
          :title="category.is_active ? 'Active — selectable for new hires' : 'Inactive — hidden from picker'">
          <span class="ecc-toggle-track"><span class="ecc-toggle-knob" /></span>
          {{ category.is_active ? 'Active' : 'Inactive' }}
        </button>
        <span v-else class="ecc-toggle locked" :class="{ on: category.is_active }" title="Built-in classifications stay active">
          <span class="ecc-toggle-track"><span class="ecc-toggle-knob" /></span>
          {{ category.is_active ? 'Active' : 'Inactive' }}
        </span>
        <button type="button" class="ecc-act" title="Edit" @click.stop="$emit('edit', category)"><FilePen :size="14" /></button>
        <button v-if="!category.is_system" type="button" class="ecc-act danger" title="Delete" @click.stop="$emit('delete', category)"><Trash2 :size="14" /></button>
        <span v-else class="ecc-act locked" title="Built-in — deactivate instead of deleting"><Lock :size="13" /></span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Hash, Lock, FilePen, Trash2, Users, Workflow,
  Wallet, CalendarDays, Plane, DoorOpen,
  ShieldCheck, UserCog, GraduationCap, ScrollText, UserCheck, Tag } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  category: { type: Object, required: true },   // { id, code, label, description, is_active, is_system }
  index: { type: Number, default: 0 },
  headcount: { type: Number, default: 0 },
  share: { type: Number, default: 0 },
  hasWorkforce: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete', 'toggle', 'view'])

const inner = ref(null)
usePointerSpotlight(inner)

const RAMP = ['#fbbf24', '#f59e0b', '#fb923c', '#d97706', '#ea580c', '#b45309']
const hue = computed(() => RAMP[props.index % RAMP.length])

const SCOPES = [
  { label: 'Payroll', icon: Wallet },
  { label: 'Leave', icon: CalendarDays },
  { label: 'Travel', icon: Plane },
  { label: 'Exit', icon: DoorOpen },
]

const LIFECYCLE = { PERMANENT: 'Active', PROBATIONARY: 'On Probation' }
const lifecycle = computed(() => LIFECYCLE[String(props.category.code || '').toUpperCase()] || null)

const glyph = computed(() => {
  const c = String(props.category.code || '').toUpperCase()
  if (c.includes('PERMANENT') || c.includes('CONFIRM')) return ShieldCheck
  if (c.includes('PROBATION')) return UserCog
  if (c.includes('TRAINEE') || c.includes('INTERN')) return GraduationCap
  if (c.includes('CONTRACT')) return ScrollText
  if (c.includes('CONSULT')) return UserCheck
  return Tag
})
</script>

<style scoped>
.ecc-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); border-radius: 18px; perspective: 1000px; }
.ecc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; height: 100%; padding: 15px 16px 13px;
  border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s; }
.ecc:hover { border-color: color-mix(in srgb, var(--hue) 40%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-2px); }
.ecc.off { opacity: 0.76; }
.ecc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 4;
  background: radial-gradient(320px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--hue) 18%, transparent), transparent 60%); }
.ecc-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background: radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--hue) 10%, transparent), transparent 55%); }
.ecc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; z-index: 1;
  background: linear-gradient(180deg, var(--hue), color-mix(in srgb, var(--hue) 28%, transparent)); box-shadow: 0 0 12px -3px var(--hue); }
.ecc.off .ecc-spine { background: var(--set-unset); box-shadow: none; }

.ecc-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; }
.ecc-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: #1a1206;
  background: var(--hue); box-shadow: 0 6px 16px -6px var(--hue); }
.ecc.off .ecc-ic { color: var(--set-text-muted); background: var(--set-surface-elevated); box-shadow: none; border: 1px solid var(--set-border); }
.ecc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ecc-name { font-size: 15px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ecc-code { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--set-text-muted); }
.ecc-code :deep(svg) { opacity: 0.6; }
.ecc-sys { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--set-gold); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 28%, transparent); }
.ecc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.ecc-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.ecc-desc { position: relative; z-index: 2; margin: 0; font-size: 12px; line-height: 1.45; color: var(--set-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em; }

.ecc-scopes { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 5px; }
.ecc-scope { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 650; color: var(--set-text-secondary);
  padding: 3px 8px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ecc-scope :deep(svg) { color: var(--set-text-muted); }
.ecc-scope.life { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 11%, transparent); border-color: color-mix(in srgb, var(--set-ember) 30%, transparent); }
.ecc-scope.life :deep(svg) { color: var(--set-ember); }

.ecc-pop { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; padding: 9px 11px; border-radius: 12px; cursor: pointer; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: all 0.2s; text-align: left; }
.ecc-pop:hover { border-color: color-mix(in srgb, var(--hue) 36%, transparent); transform: translateY(-1px); }
.ecc-pop-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ecc-pop-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--set-text-dim); }
.ecc-pop-lab :deep(svg) { color: var(--hue); }
.ecc-pop-num { display: inline-flex; align-items: baseline; gap: 6px; }
.ecc-pop-num b { font-size: 17px; font-weight: 850; color: var(--set-text); }
.ecc-pop.filled .ecc-pop-num b { color: var(--hue); }
.ecc-pop-num i { font-style: normal; font-size: 10px; font-weight: 700; color: var(--set-text-muted); }
.ecc-pop-num i.none { color: var(--set-text-dim); }
.ecc-pop-bar { height: 5px; border-radius: 3px; background: var(--set-surface-elevated); overflow: hidden; }
.ecc-pop-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--hue), color-mix(in srgb, var(--hue) 55%, #fff)); transition: width 0.9s var(--set-spring); }

.ecc-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 2px; }
.ecc-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; flex: 1;
  font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.2s; }
.ecc-toggle.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); }
.ecc-toggle.locked { cursor: default; opacity: 0.85; }
.ecc-toggle-track { position: relative; width: 22px; height: 12px; border-radius: 999px; background: var(--set-unset); transition: background 0.25s; flex-shrink: 0; }
.ecc-toggle.on .ecc-toggle-track { background: var(--set-ok); }
.ecc-toggle-knob { position: absolute; top: 1px; left: 1px; width: 10px; height: 10px; border-radius: 50%; background: #fff; transition: transform 0.25s var(--set-spring); }
.ecc-toggle.on .ecc-toggle-knob { transform: translateX(10px); }
.ecc-act { width: 32px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.ecc-act:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.ecc-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.ecc-act.locked { cursor: default; color: var(--set-text-dim); }
.ecc-act.locked:hover { transform: none; border-color: var(--set-border); }

@media (prefers-reduced-motion: reduce) {
  .ecc-shell { animation: none; }
  .ecc:hover { transform: translateY(-2px); }
  .ecc-pop-bar i, .ecc-toggle-knob { transition: none; }
}
</style>
