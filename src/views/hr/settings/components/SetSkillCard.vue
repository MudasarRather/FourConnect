<template>
  <div class="sk-shell" :style="{ '--i': index, '--acc': accent }">
    <article ref="cardEl" class="sk" :class="{ off: !active }">
      <span class="sk-glare" aria-hidden="true" />
      <span class="sk-spine" aria-hidden="true" />

      <header class="sk-head">
        <span class="sk-ic"><component :is="cat.icon" :size="17" /></span>
        <div class="sk-headtext">
          <b :title="skill.name">{{ skill.name }}</b>
          <span class="sk-code">{{ skill.code || cat.label }}</span>
        </div>
        <span class="sk-led" :class="active ? 'on' : 'idle'" :title="active ? 'Active' : 'Inactive'" />
      </header>

      <p v-if="skill.description" class="sk-desc">{{ skill.description }}</p>
      <p v-else class="sk-desc muted">No description — used as a bare competency tag.</p>

      <!-- proficiency ladder -->
      <div class="sk-ladder" :title="`Proficiency scale 1–${maxLevel}`">
        <span class="sk-ladder-lab">Proficiency scale</span>
        <div class="sk-rungs">
          <i v-for="n in maxLevel" :key="n" class="sk-rung" :style="{ '--h': (38 + (n / maxLevel) * 62) + '%', '--rn': n }" />
        </div>
        <span class="sk-ladder-max">1–{{ maxLevel }}</span>
      </div>

      <div class="sk-meta">
        <span class="sk-chip cat"><component :is="cat.icon" :size="11" />{{ cat.label }}</span>
        <span class="sk-chip"><component :is="deptName ? Building2 : Globe" :size="11" />{{ deptName || 'Org-wide' }}</span>
        <span class="sk-chip" :class="{ wired: requirementCount > 0 }" :title="requirementCount + ' role requirement(s)'">
          <Target :size="11" />{{ requirementCount }} req{{ requirementCount === 1 ? '' : 's' }}
        </span>
      </div>

      <footer class="sk-foot">
        <Motion as="button" class="sk-act" type="button" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('edit', skill)">
          <Pencil :size="13" /> Edit
        </Motion>
        <Motion as="button" class="sk-act danger" type="button" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('delete', skill)">
          <Trash2 :size="13" />
        </Motion>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Pencil, Trash2, Building2, Globe, Target } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { skillCategoryMeta, toneColor } from '../composables/trainingVocab'

const props = defineProps({
  skill: { type: Object, required: true },
  index: { type: Number, default: 0 },
  deptName: { type: String, default: '' },
  requirementCount: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const cat = computed(() => skillCategoryMeta(props.skill.category))
const accent = computed(() => toneColor(cat.value.tone))
const active = computed(() => props.skill.is_active !== false)
const maxLevel = computed(() => Math.max(2, Math.min(10, props.skill.max_level || 5)))
</script>

<style scoped>
.sk-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.sk { position: relative; overflow: hidden; height: 100%; padding: 15px 16px 13px; border-radius: 17px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  display: flex; flex-direction: column; gap: 11px;
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s;
  --mx: 0.5; --my: 0.5; --spot: 0; }
.sk:hover { transform: perspective(1100px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: var(--set-card-shadow-hover); }
.sk.off { opacity: 0.62; }
.sk-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--acc) 16%, transparent), transparent 45%); }
.sk-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 20%, transparent)); box-shadow: 0 0 14px color-mix(in srgb, var(--acc) 50%, transparent); }

.sk-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.sk-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.sk-headtext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sk-headtext b { font-size: 14px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sk-code { font-size: 10.5px; font-weight: 600; color: var(--set-text-dim); font-family: var(--set-mono); letter-spacing: 0.3px; }
.sk-led { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.sk-led.on { background: var(--set-ok); box-shadow: 0 0 9px var(--set-ok); }

.sk-desc { position: relative; z-index: 1; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--set-text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; }
.sk-desc.muted { color: var(--set-text-dim); font-style: italic; }

.sk-ladder { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 9px; padding: 9px 11px; border-radius: 11px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.sk-ladder-lab { font-size: 10px; font-weight: 650; color: var(--set-text-muted); align-self: center; flex: 1; }
.sk-rungs { display: flex; align-items: flex-end; gap: 3px; height: 24px; }
.sk-rung { width: 5px; height: var(--h); border-radius: 2px; background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 35%, transparent));
  box-shadow: 0 0 6px color-mix(in srgb, var(--acc) 35%, transparent); transform-origin: bottom; animation: sk-rung-grow 0.5s var(--set-spring) both;
  animation-delay: calc(0.1s + var(--rn) * 0.05s); }
.sk-ladder-max { font-size: 10.5px; font-weight: 850; color: var(--set-text); align-self: center; font-variant-numeric: tabular-nums; }

.sk-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.sk-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px; font-size: 10.5px; font-weight: 650;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.sk-chip :deep(svg) { color: var(--set-text-dim); }
.sk-chip.cat { color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); border-color: color-mix(in srgb, var(--acc) 24%, transparent); }
.sk-chip.cat :deep(svg) { color: var(--acc); }
.sk-chip.wired { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 28%, transparent); }
.sk-chip.wired :deep(svg) { color: var(--set-ok); }

.sk-foot { position: relative; z-index: 1; display: flex; gap: 7px; margin-top: auto; padding-top: 4px; }
.sk-act { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.sk-act:first-child { flex: 1; justify-content: center; }
.sk-act:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.sk-act.danger { color: var(--set-text-muted); }
.sk-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 32%, transparent); background: var(--set-conflict-soft); }

@keyframes sk-rung-grow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .sk-shell { animation: none; }
  .sk:hover { transform: translateY(-2px); }
  .sk-rung { animation: none; }
}
</style>
