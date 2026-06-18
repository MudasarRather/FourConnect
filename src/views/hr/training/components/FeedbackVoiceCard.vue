<template>
  <Motion as="article" class="fvc" :class="`tone-${tone}`"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: Math.min(index * 0.035, 0.3), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="reduced ? {} : { y: -3 }">
    <span class="fvc-rail" aria-hidden="true" />
    <span class="fvc-glow" aria-hidden="true" />

    <header class="fvc-top">
      <div class="fvc-meta">
        <button type="button" class="fvc-prog" @click="$emit('pick-program', entry.program_id)">
          <BookOpen :size="13" /> {{ entry.program_name || 'Unattributed program' }}
        </button>
        <div class="fvc-who">
          <span class="fvc-avatar" :class="{ anon: entry.is_anonymous }" aria-hidden="true">
            <VenetianMask v-if="entry.is_anonymous" :size="13" />
            <template v-else>{{ initials(entry.employee_name) }}</template>
          </span>
          <span class="fvc-who-name">{{ entry.is_anonymous ? 'Anonymous learner' : (entry.employee_name || 'Employee') }}</span>
          <template v-if="entry.trainer_name">
            <i class="fvc-dot" />
            <button type="button" class="fvc-trainer" @click="$emit('pick-trainer', entry.trainer_id)">
              <Presentation :size="11" /> {{ entry.trainer_name }}
            </button>
          </template>
          <template v-if="dateStr"><i class="fvc-dot" /><span class="fvc-date">{{ dateStr }}</span></template>
        </div>
      </div>
      <div class="fvc-rate">
        <FbStarMeter :rating="Number(entry.rating) || 0" :size="15" :gap="2.5" />
        <span class="fvc-score trn-mono">{{ (Number(entry.rating) || 0).toFixed(0) }}<i>/5</i></span>
      </div>
    </header>

    <div v-if="subs.length" class="fvc-subs">
      <div v-for="s in subs" :key="s.key" class="fvc-sub" :title="`${s.label}: ${s.value}/5`">
        <span class="fvc-sub-lab">{{ s.label }}</span>
        <span class="fvc-sub-track"><span class="fvc-sub-fill" :style="{ width: (s.value / 5 * 100) + '%' }" /></span>
        <span class="fvc-sub-val trn-mono">{{ s.value.toFixed(1) }}</span>
      </div>
    </div>

    <p v-if="entry.comments" class="fvc-comment">
      <Quote :size="13" class="fvc-quote" /> {{ entry.comments }}
    </p>

    <footer v-if="entry.would_recommend != null" class="fvc-foot">
      <span class="fvc-rec" :class="{ on: entry.would_recommend }">
        <component :is="entry.would_recommend ? ThumbsUp : ThumbsDown" :size="12" />
        {{ entry.would_recommend ? 'Would recommend' : 'Would not recommend' }}
      </span>
    </footer>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { BookOpen, Presentation, Quote, ThumbsUp, ThumbsDown, VenetianMask } from 'lucide-vue-next'
import FbStarMeter from './FbStarMeter.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['pick-program', 'pick-trainer'])
const reduced = prefersReduced()

const tone = computed(() => {
  const r = Number(props.entry.rating) || 0
  if (r >= 4) return 'good'
  if (r >= 3) return 'mid'
  if (r > 0) return 'low'
  return 'mute'
})

const subs = computed(() => [
  { key: 'content', label: 'Content', value: props.entry.content_rating },
  { key: 'trainer', label: 'Trainer', value: props.entry.trainer_rating },
  { key: 'relevance', label: 'Relevance', value: props.entry.relevance_rating },
].filter(s => s.value != null).map(s => ({ ...s, value: Number(s.value) })))

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const dateStr = computed(() => {
  const d = props.entry.created_at
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
})
</script>

<style scoped>
.fvc { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 15px 16px 15px 19px; overflow: hidden; isolation: isolate;
  border-radius: 18px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s; }
.fvc { --tone-c: var(--trn-st-not-started); }
.fvc.tone-good { --tone-c: var(--trn-st-completed); }
.fvc.tone-mid { --tone-c: var(--trn-amber); }
.fvc.tone-low { --tone-c: var(--trn-st-failed); }
.fvc:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--tone-c) 30%, transparent); }
.fvc-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--tone-c), color-mix(in srgb, var(--tone-c) 28%, transparent)); }
.fvc-glow { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity 0.35s;
  background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--tone-c) 10%, transparent), transparent 55%); }
.fvc:hover .fvc-glow { opacity: 1; }

.fvc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.fvc-meta { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.fvc-prog { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 14px; font-weight: 750; color: var(--trn-text);
  background: none; border: 0; padding: 0; cursor: pointer; text-align: left; line-height: 1.25; transition: color 0.2s; }
.fvc-prog :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.fvc-prog:hover { color: var(--trn-amber-strong); }
.fvc-who { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11.5px; color: var(--trn-text-muted); }
.fvc-avatar { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 7px;
  font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.fvc-avatar.anon { color: var(--trn-text-muted); background: var(--trn-surface-elevated); }
.fvc-who-name { font-weight: 600; color: var(--trn-text-secondary); }
.fvc-trainer { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 11.5px; color: var(--trn-text-muted);
  background: none; border: 0; padding: 0; cursor: pointer; transition: color 0.2s; }
.fvc-trainer :deep(svg) { color: var(--trn-ember); }
.fvc-trainer:hover { color: var(--trn-text-secondary); }
.fvc-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--trn-text-dim); flex-shrink: 0; }
.fvc-date { white-space: nowrap; }
.fvc-rate { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.fvc-score { font-size: 13px; font-weight: 800; color: var(--tone-c); }
.fvc-score i { font-size: 10px; font-style: normal; font-weight: 600; color: var(--trn-text-dim); margin-left: 1px; }

.fvc-subs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; }
.fvc-sub { display: flex; align-items: center; gap: 7px; min-width: 0; }
.fvc-sub-lab { font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--trn-text-dim); flex-shrink: 0; width: 52px; }
.fvc-sub-track { flex: 1; min-width: 24px; height: 5px; border-radius: 999px; background: var(--trn-border-soft); overflow: hidden; }
.fvc-sub-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--trn-amber-strong), var(--trn-amber)); }
.fvc-sub-val { font-size: 10.5px; font-weight: 700; color: var(--trn-text-secondary); flex-shrink: 0; }

.fvc-comment { position: relative; margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.55;
  color: var(--trn-text-secondary); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.fvc-quote { display: inline; color: var(--trn-amber-strong); vertical-align: -2px; margin-right: 3px; opacity: 0.7; }

.fvc-foot { display: flex; }
.fvc-rec { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
  color: var(--trn-st-not-started); background: var(--trn-st-not-started-soft); }
.fvc-rec.on { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }

@media (max-width: 480px) {
  .fvc-subs { grid-template-columns: 1fr; }
}
</style>
