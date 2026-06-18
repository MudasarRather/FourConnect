<template>
  <Motion as="article" class="acx" :class="[`t-${typeKey}`, { inactive: !active }]" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.045, 0.34), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="reduced ? {} : { y: -4 }">
    <span class="acx-glow" aria-hidden="true" />
    <span class="acx-scan" aria-hidden="true" />

    <!-- head -->
    <div class="acx-head">
      <span class="acx-type"><component :is="typeDef.icon" :size="12" /> {{ typeDef.label }}</span>
      <button type="button" class="acx-active" :class="{ on: active }" :title="active ? 'Active — click to archive' : 'Inactive — click to activate'"
        @click="$emit('toggle-active', assessment)">
        <span class="acx-active-dot" /> {{ active ? 'Active' : 'Inactive' }}
      </button>
    </div>

    <h3 class="acx-title">{{ assessment.title }}</h3>
    <button type="button" class="acx-prog" @click="$emit('program', assessment)">
      <BookOpen :size="12" /> <span>{{ assessment.program_name || 'Untitled program' }}</span>
    </button>

    <!-- body: ring + scale -->
    <div class="acx-body">
      <div class="acx-ring">
        <svg :viewBox="`0 0 ${SZ} ${SZ}`" class="acx-ring-svg" aria-hidden="true">
          <circle class="acx-ring-track" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" />
          <circle class="acx-ring-fill" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" stroke-linecap="round"
            :stroke-dasharray="CIRC" :stroke-dashoffset="visible ? CIRC * (1 - passRate / 100) : CIRC"
            :transform="`rotate(-90 ${C} ${C})`" />
        </svg>
        <div class="acx-ring-c">
          <span class="acx-ring-val"><TrnCountUp :value="passRate" suffix="%" /></span>
          <span class="acx-ring-lab">pass</span>
        </div>
      </div>

      <div class="acx-side">
        <!-- exam scale -->
        <div class="acx-scale">
          <div class="acx-scale-head">
            <span>Score scale</span>
            <span class="trn-mono">pass {{ num(assessment.pass_score) }}/{{ num(assessment.max_score) }}</span>
          </div>
          <div class="acx-scale-track">
            <span class="acx-scale-fail" :style="{ width: passPct + '%' }" />
            <span class="acx-scale-pass" :style="{ left: passPct + '%' }" />
            <span class="acx-scale-mark" :style="{ left: visible ? passPct + '%' : '0%' }">
              <span class="acx-scale-flag">{{ num(assessment.pass_score) }}</span>
            </span>
          </div>
        </div>
        <!-- meta chips -->
        <div class="acx-meta">
          <span class="acx-chip"><Repeat2 :size="12" /> {{ assessment.result_count || 0 }} attempt{{ (assessment.result_count||0)===1?'':'s' }}</span>
          <span class="acx-chip ok"><BadgeCheck :size="12" /> {{ assessment.pass_count || 0 }} passed</span>
          <span class="acx-chip"><Hash :size="12" /> {{ assessment.max_attempts ?? '∞' }} max</span>
          <span v-if="assessment.duration_minutes" class="acx-chip"><Timer :size="12" /> {{ assessment.duration_minutes }}m</span>
        </div>
      </div>
    </div>

    <!-- footer -->
    <div class="acx-foot">
      <Motion as="button" type="button" class="acx-btn primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('record', assessment)">
        <ClipboardPen :size="14" /> Record
      </Motion>
      <Motion as="button" type="button" class="acx-btn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('results', assessment)">
        <BarChart3 :size="14" /> Results
      </Motion>
      <button type="button" class="acx-btn icon" title="Edit" @click="$emit('edit', assessment)"><Pencil :size="14" /></button>
      <button type="button" class="acx-btn icon danger" title="Delete" @click="$emit('delete', assessment)"><Trash2 :size="14" /></button>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  BookOpen, Repeat2, BadgeCheck, Hash, Timer, ClipboardPen, BarChart3, Pencil, Trash2,
  ListChecks, ScrollText, Wrench, MessagesSquare,
} from 'lucide-vue-next'
import TrnCountUp from './TrnCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  assessment: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['record', 'results', 'edit', 'delete', 'toggle-active', 'program'])
const reduced = prefersReduced()
const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.25 })

const TYPE = {
  QUIZ: { label: 'Quiz', icon: ListChecks, key: 'quiz' },
  EXAM: { label: 'Exam', icon: ScrollText, key: 'exam' },
  PRACTICAL: { label: 'Practical', icon: Wrench, key: 'practical' },
  SURVEY: { label: 'Survey', icon: MessagesSquare, key: 'survey' },
}
const typeDef = computed(() => TYPE[props.assessment.assessment_type] || TYPE.QUIZ)
const typeKey = computed(() => typeDef.value.key)
const active = computed(() => props.assessment.is_active !== false)

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? (Math.round(n * 100) / 100) : v }
const passRate = computed(() => props.assessment.result_count
  ? Math.round((props.assessment.pass_count || 0) / props.assessment.result_count * 100) : 0)
const passPct = computed(() => {
  const max = Number(props.assessment.max_score) || 0
  const pass = Number(props.assessment.pass_score) || 0
  if (!max) return 0
  return Math.max(2, Math.min(98, (pass / max) * 100))
})

// ring geometry
const SZ = 84, C = SZ / 2, SW = 7, R = C - SW / 2 - 2
const CIRC = 2 * Math.PI * R
</script>

<style scoped>
.acx { --c: var(--trn-amber); position: relative; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; gap: 11px;
  padding: 16px 17px; border-radius: 18px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s; }
.acx.t-quiz { --c: var(--trn-amber); }
.acx.t-exam { --c: var(--trn-ember); }
.acx.t-practical { --c: var(--trn-amber-strong); }
.acx.t-survey { --c: var(--trn-star-dim); }
.acx:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--c) 32%, transparent); }
.acx.inactive { opacity: 0.62; }
.acx.inactive:hover { opacity: 0.92; }

.acx-glow { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity 0.35s;
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--c) 12%, transparent), transparent 60%); }
.acx:hover .acx-glow { opacity: 1; }
.acx-scan { position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 1; pointer-events: none; transform: scaleX(0); transform-origin: left;
  background: linear-gradient(90deg, transparent, var(--c), transparent); transition: transform 0.6s var(--trn-spring) 0.2s; }
.acx:hover .acx-scan { transform: scaleX(1); }

.acx-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.acx-type { display: inline-flex; align-items: center; gap: 5px; font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.acx-active { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  cursor: pointer; color: var(--trn-text-dim); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.acx-active-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-text-dim); transition: background 0.2s, box-shadow 0.2s; }
.acx-active.on { color: var(--trn-st-completed); border-color: color-mix(in srgb, var(--trn-st-completed) 32%, transparent); }
.acx-active.on .acx-active-dot { background: var(--trn-st-completed); box-shadow: 0 0 7px var(--trn-st-completed); }
.acx-active:hover { color: var(--trn-text); }

.acx-title { margin: 0; font-size: 15.5px; font-weight: 750; color: var(--trn-text); line-height: 1.3; }
.acx-prog { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font: inherit; font-size: 12px; font-weight: 600; padding: 0;
  border: 0; background: none; cursor: pointer; color: var(--trn-text-muted); transition: color 0.2s; max-width: 100%; }
.acx-prog span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acx-prog :deep(svg) { color: var(--c); flex-shrink: 0; }
.acx-prog:hover { color: var(--trn-amber-strong); }

.acx-body { display: flex; align-items: center; gap: 16px; }
.acx-ring { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
.acx-ring-svg { width: 100%; height: 100%; }
.acx-ring-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.acx-ring-fill { stroke: var(--trn-st-completed); transition: stroke-dashoffset 1.2s var(--trn-spring) 0.15s;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--trn-st-completed) 45%, transparent)); }
.acx-ring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
.acx-ring-val { font-family: var(--trn-mono); font-size: 19px; font-weight: 850; line-height: 1; color: var(--trn-text); }
.acx-ring-lab { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); }

.acx-side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.acx-scale { display: flex; flex-direction: column; gap: 6px; }
.acx-scale-head { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--trn-text-muted); }
.acx-scale-head .trn-mono { font-weight: 700; color: var(--trn-text-secondary); }
.acx-scale-track { position: relative; height: 8px; border-radius: 999px; overflow: visible; background: var(--trn-st-completed-soft); border: 1px solid var(--trn-border-soft); }
.acx-scale-fail { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px 0 0 999px; background: var(--trn-st-failed-soft);
  border-right: 1px solid color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.acx-scale-mark { position: absolute; top: 50%; transform: translate(-50%, -50%); transition: left 1.1s var(--trn-spring) 0.2s; z-index: 2; }
.acx-scale-mark::before { content: ''; display: block; width: 3px; height: 16px; border-radius: 2px; background: var(--trn-amber-strong);
  box-shadow: 0 0 8px color-mix(in srgb, var(--trn-amber) 60%, transparent); }
.acx-scale-flag { position: absolute; bottom: calc(100% + 3px); left: 50%; transform: translateX(-50%); font-family: var(--trn-mono); font-size: 9px; font-weight: 700;
  color: var(--trn-amber-strong); white-space: nowrap; }

.acx-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.acx-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 7px;
  color: var(--trn-text-secondary); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.acx-chip :deep(svg) { color: var(--trn-text-dim); }
.acx-chip.ok { color: var(--trn-st-completed); } .acx-chip.ok :deep(svg) { color: var(--trn-st-completed); }

.acx-foot { display: flex; align-items: center; gap: 6px; padding-top: 11px; border-top: 1px solid var(--trn-border-soft); }
.acx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 7px 11px;
  border-radius: 9px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.acx-btn:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.acx-btn.primary { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.acx-btn.primary:hover { background: color-mix(in srgb, var(--trn-amber) 19%, transparent); }
.acx-btn.icon { padding: 7px; margin-left: 0; }
.acx-btn.icon.danger { margin-left: auto; color: var(--trn-st-failed); }
.acx-btn.icon.danger:hover { background: var(--trn-st-failed-soft); }

@media (prefers-reduced-motion: reduce) {
  .acx-ring-fill, .acx-scale-mark, .acx-scan { transition: none !important; }
}
</style>
