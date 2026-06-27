<template>
  <div class="ac-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="ac" :class="{ on: selected, off: !active }" @click="$emit('select', template)">
      <span class="ac-glare" aria-hidden="true" />
      <span class="ac-spine" :style="{ background: balanced ? 'var(--set-ok)' : 'var(--set-deep)' }" aria-hidden="true" />

      <div class="ac-top">
        <div class="ac-ring" :class="{ ok: balanced }" :style="{ '--f': Math.min(100, total), '--ring-c': balanced ? 'var(--set-ok)' : 'var(--set-deep)' }">
          <CircleCheck v-if="balanced" :size="14" />
          <span v-else>{{ total }}<i>%</i></span>
        </div>
        <div class="ac-titles">
          <b :title="template.name">{{ template.name }}</b>
          <span class="ac-code">{{ template.code }}</span>
        </div>
        <span class="ac-led" :class="active ? 'on' : 'idle'" :title="active ? 'Active' : 'Inactive'" />
      </div>

      <div class="ac-dots">
        <span v-for="(s, i) in dotSections" :key="i" class="ac-dot" :style="{ background: typeColor(s.section_type) }" :title="s.title" />
        <span v-if="extraDots > 0" class="ac-dot-more">+{{ extraDots }}</span>
      </div>

      <div class="ac-meta">
        <span class="ac-chip"><component :is="cyc.icon" :size="11" />{{ cyc.label }}</span>
        <span class="ac-chip"><Layers :size="11" />{{ sectionCount }} sec</span>
        <span class="ac-chip" :class="{ scoped }"><component :is="scoped ? Crosshair : Globe" :size="11" />{{ scopeLabel }}</span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CircleCheck, Layers, Globe, Crosshair } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { cycleMeta, typeColor } from '../composables/appraisalVocab'

const props = defineProps({
  template: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
})
defineEmits(['select'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const sections = computed(() => props.template.sections || [])
const sectionCount = computed(() => sections.value.length)
const dotSections = computed(() => sections.value.slice(0, 7))
const extraDots = computed(() => Math.max(0, sectionCount.value - 7))
const total = computed(() => sections.value.reduce((s, x) => s + (Number(x.weight) || 0), 0))
const balanced = computed(() => total.value === 100)
const active = computed(() => props.template.is_active !== false)
const cyc = computed(() => cycleMeta(props.template.cycle))

const scope = computed(() => props.template.applies_to_json || {})
const gradeN = computed(() => (scope.value.grade_ids || []).length)
const deptN = computed(() => (scope.value.department_ids || []).length)
const scoped = computed(() => gradeN.value > 0 || deptN.value > 0)
const scopeLabel = computed(() => {
  if (!scoped.value) return 'All roles'
  const parts = []
  if (gradeN.value) parts.push(`${gradeN.value}g`)
  if (deptN.value) parts.push(`${deptN.value}d`)
  return parts.join(' · ')
})
</script>

<style scoped>
.ac-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.ac { position: relative; overflow: hidden; cursor: pointer; padding: 13px 14px; border-radius: 15px; display: flex; flex-direction: column; gap: 10px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.28s var(--set-spring), border-color 0.28s, box-shadow 0.28s; --mx: 0.5; --my: 0.5; --spot: 0; }
.ac:hover { transform: perspective(1000px) rotateX(calc((var(--my) - 0.5) * -4deg)) rotateY(calc((var(--mx) - 0.5) * 6deg)) translateY(-2px);
  border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); box-shadow: var(--set-card-shadow-hover); }
.ac.on { border-color: color-mix(in srgb, var(--set-deep) 52%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--set-deep) 30%, transparent), var(--set-card-shadow-hover); }
.ac.off { opacity: 0.6; }
.ac-glare { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--set-deep) 15%, transparent), transparent 45%); }
.ac-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; box-shadow: 0 0 12px color-mix(in srgb, var(--set-deep) 45%, transparent); }

.ac-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.ac-ring { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
/* the conic ring lives on ::before so it can be masked without clipping the centre content */
.ac-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(var(--ring-c) calc(var(--f) * 1%), var(--set-trace-idle) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent 61%, #000 62%); mask: radial-gradient(farthest-side, transparent 61%, #000 62%); }
.ac-ring > span { position: relative; z-index: 1; font-size: 11px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.ac-ring > span i { font-size: 7px; font-style: normal; color: var(--set-text-muted); }
.ac-ring :deep(svg) { position: relative; z-index: 1; color: var(--set-ok); }
.ac-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ac-titles b { font-size: 13px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ac-code { font-size: 9.5px; font-weight: 600; color: var(--set-text-dim); font-family: var(--set-mono); letter-spacing: 0.3px; }
.ac-led { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.ac-led.on { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.ac-dots { position: relative; z-index: 1; display: flex; align-items: center; gap: 4px; min-height: 8px; }
.ac-dot { width: 8px; height: 8px; border-radius: 2px; box-shadow: 0 0 5px color-mix(in srgb, currentColor 0%, transparent); }
.ac-dot-more { font-size: 9px; font-weight: 700; color: var(--set-text-dim); }

.ac-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; }
.ac-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 650;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ac-chip :deep(svg) { color: var(--set-text-dim); }
.ac-chip.scoped { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 10%, transparent); border-color: color-mix(in srgb, var(--set-deep) 24%, transparent); }
.ac-chip.scoped :deep(svg) { color: var(--set-deep); }

@media (prefers-reduced-motion: reduce) { .ac-shell { animation: none; } .ac:hover { transform: translateY(-2px); } }
</style>
