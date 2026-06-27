<template>
  <div class="bp-shell" :style="{ '--i': index, '--c': cat.color }">
    <article ref="cardEl" class="bp" :class="{ off: !template.is_active }">
      <span class="bp-glare" aria-hidden="true" />
      <span class="bp-spine" aria-hidden="true" />

      <header class="bp-head">
        <span class="bp-cat"><component :is="cat.icon" :size="13" />{{ cat.label }}</span>
        <span class="bp-led" :class="template.is_active ? 'on' : 'idle'" :title="template.is_active ? 'Active — seeds new hires' : 'Inactive'" />
      </header>

      <h4 class="bp-title">{{ template.task_name }}</h4>
      <p v-if="template.description" class="bp-desc">{{ template.description }}</p>
      <p v-else class="bp-desc muted">No description</p>

      <div class="bp-meta">
        <span class="bp-chip" :class="{ must: template.is_mandatory }">
          <component :is="template.is_mandatory ? CircleDot : Circle" :size="12" />
          {{ template.is_mandatory ? 'Mandatory' : 'Optional' }}
        </span>
        <span class="bp-chip"><CalendarClock :size="12" />{{ offsetLabel }}</span>
        <span v-if="template.default_assignee_role" class="bp-chip"><UserCog :size="12" />{{ template.default_assignee_role }}</span>
      </div>

      <footer class="bp-foot">
        <button class="bp-act" type="button" @click="$emit('edit', template)"><Pencil :size="13" /> Edit</button>
        <button class="bp-act toggle" type="button" :class="{ on: template.is_active }" @click="$emit('toggle', template)">
          <component :is="template.is_active ? Pause : Play" :size="13" />
          {{ template.is_active ? 'Deactivate' : 'Activate' }}
        </button>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Pencil, Pause, Play, CircleDot, Circle, CalendarClock, UserCog } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { categoryMeta } from '../composables/onboardingVocab'

const props = defineProps({
  template: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'toggle'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const cat = computed(() => categoryMeta(props.template.category))
const offsetLabel = computed(() => {
  const d = props.template.default_due_offset_days || 0
  if (d === 0) return 'Due on join day'
  if (d > 0) return `Join + ${d}d`
  return `Join − ${Math.abs(d)}d`
})
</script>

<style scoped>
.bp-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); height: 100%; }
.bp { position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column;
  padding: 15px 16px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s; --mx: 0.5; --my: 0.5; --spot: 0; }
.bp.off { opacity: 0.72; }
.bp:hover { transform: perspective(1000px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 38%, transparent); box-shadow: var(--set-card-shadow-hover); }
.bp-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--c) 16%, transparent), transparent 45%); }
.bp-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 20%, transparent)); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent); }

.bp-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bp-cat { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px; font-size: 10.5px; font-weight: 750;
  color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.bp-led { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.bp-led.on { background: var(--set-ok); box-shadow: 0 0 10px var(--set-ok); animation: set-led-pulse 2.6s ease-in-out infinite; }

.bp-title { position: relative; z-index: 1; margin: 12px 0 0; font-size: 14px; font-weight: 800; color: var(--set-text); line-height: 1.3; }
.bp-desc { position: relative; z-index: 1; margin: 6px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--set-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bp-desc.muted { font-style: italic; color: var(--set-text-dim); }

.bp-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; margin-top: auto; padding-top: 12px; }
.bp-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 650;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.bp-chip :deep(svg) { color: var(--set-text-muted); flex-shrink: 0; }
.bp-chip.must { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 11%, transparent); border-color: color-mix(in srgb, var(--set-gold) 24%, transparent); }
.bp-chip.must :deep(svg) { color: var(--set-gold); }

.bp-foot { position: relative; z-index: 1; display: flex; gap: 7px; padding-top: 11px; border-top: 1px solid var(--set-border); }
.bp-act { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 1; padding: 7px 10px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.bp-act:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.bp-act.toggle.on:hover { color: var(--set-text-muted); border-color: color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.bp-act.toggle:not(.on) { color: var(--set-ok); }
.bp-act.toggle:not(.on):hover { border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); background: var(--set-ok-soft); }

@media (prefers-reduced-motion: reduce) {
  .bp-shell { animation: none; }
  .bp:hover { transform: translateY(-2px); }
  .bp-led.on { animation: none; }
}
</style>
