<template>
  <Motion as="article" ref="rootRef" class="cap" :class="{ interactive, preview }"
    :style="{ '--c': accent }"
    :initial="reduced ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.5, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="interactive ? { y: -4 } : {}">
    <!-- type-coloured aura + pointer glare -->
    <span class="cap-aura" aria-hidden="true" />
    <span class="cap-glare" aria-hidden="true" />
    <span class="cap-spine" aria-hidden="true" />

    <!-- orbiting star marker -->
    <span class="cap-orbit" aria-hidden="true"><span class="cap-star" /></span>

    <header class="cap-head" @click="interactive && $emit('view')">
      <span v-if="preview" class="cap-eyebrow">Live preview</span>
      <h3 class="cap-name">{{ program.name || 'Untitled program' }}</h3>
      <div class="cap-sub">
        <TrnTypeBadge :type="program.training_type" />
        <span v-if="program.code" class="cap-code trn-mono">{{ program.code }}</span>
      </div>
    </header>

    <p v-if="program.description" class="cap-desc">{{ program.description }}</p>

    <div class="cap-chips">
      <span v-if="program.duration_hours" class="cap-chip"><Clock :size="11" /> {{ program.duration_hours }}h</span>
      <span v-if="program.delivery_mode" class="cap-chip"><MonitorPlay :size="11" /> {{ prettyMode(program.delivery_mode) }}</span>
      <span v-if="program.certification_required" class="cap-chip ok"><Award :size="11" /> Certified</span>
      <span v-if="program.is_mandatory_for_new_joiners" class="cap-chip"><UserPlus :size="11" /> Joiner</span>
      <span v-if="program.is_compliance" class="cap-chip warn"><ShieldCheck :size="11" /> Compliance</span>
      <span v-if="!hasAnyChip" class="cap-chip muted">No attributes set</span>
    </div>

    <!-- enrollment constellation -->
    <div v-if="showEnrollment" class="cap-enroll">
      <div class="ce-stars" v-if="count > 0" aria-hidden="true">
        <span v-for="n in starCount" :key="n" class="ce-star"
          :style="{ '--d': (n * 0.18).toFixed(2) + 's' }" />
        <span v-if="count > starCap" class="ce-more">+{{ count - starCap }}</span>
      </div>
      <span class="ce-label">
        <span class="ce-dot" :class="{ live: count > 0 }" />
        <template v-if="count > 0"><b>{{ count }}</b> enrolled</template>
        <template v-else>Awaiting first enrollment</template>
      </span>
    </div>

    <footer v-if="interactive" class="cap-foot">
      <Motion as="button" class="cap-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('view')">
        <Eye :size="14" /> View
      </Motion>
      <Motion as="button" class="cap-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('edit')">
        <Pencil :size="14" /> Edit
      </Motion>
      <Motion as="button" class="cap-act danger" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('delete')">
        <Trash2 :size="14" />
      </Motion>
    </footer>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Clock, MonitorPlay, Award, UserPlus, ShieldCheck, Eye, Pencil, Trash2 } from 'lucide-vue-next'
import TrnTypeBadge from './TrnTypeBadge.vue'
import { typeMeta } from '@/composables/useTraining'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  program: { type: Object, default: () => ({}) },
  index: { type: Number, default: 0 },
  interactive: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
  showEnrollment: { type: Boolean, default: true },
})
defineEmits(['view', 'edit', 'delete'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const accent = computed(() => `var(${typeMeta(props.program.training_type).cssVar})`)
const count = computed(() => Number(props.program.enrollment_count) || 0)
const starCap = 10
const starCount = computed(() => Math.min(count.value, starCap))
const prettyMode = (m) => String(m || '').replace(/_/g, ' ').toLowerCase()
const hasAnyChip = computed(() => {
  const p = props.program
  return !!(p.duration_hours || p.delivery_mode || p.certification_required || p.is_mandatory_for_new_joiners || p.is_compliance)
})
</script>

<style scoped>
.cap {
  position: relative; overflow: hidden; isolation: isolate;
  padding: 18px 18px 16px; padding-left: 22px; border-radius: 18px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card);
  box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 13px;
  transition: box-shadow 0.35s, border-color 0.35s;
}
.cap.interactive:hover { box-shadow: var(--trn-card-shadow-hover);
  border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.cap.preview { border-style: dashed; border-color: color-mix(in srgb, var(--c) 30%, var(--trn-border-strong)); }

/* type spine + aura */
.cap-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 2;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 90%, transparent), color-mix(in srgb, var(--c) 30%, transparent));
  box-shadow: 0 0 14px -2px var(--c); }
.cap-aura { position: absolute; inset: 0; z-index: 0; opacity: 0.5; pointer-events: none; transition: opacity 0.4s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 56%); }
.cap.interactive:hover .cap-aura { opacity: 1; }
.cap-glare { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s;
  background: radial-gradient(360px 260px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }
.cap > *:not(.cap-aura):not(.cap-glare):not(.cap-spine) { position: relative; z-index: 2; }

/* orbit star */
.cap-orbit { position: absolute; top: 13px; right: 15px; width: 22px; height: 22px; z-index: 2;
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); border-radius: 50%;
  animation: trn-orbit-spin 9s linear infinite; }
.cap-star { position: absolute; top: -2px; left: 50%; width: 5px; height: 5px; border-radius: 50%;
  background: var(--trn-star); box-shadow: 0 0 9px var(--c); transform: translateX(-50%); }

.cap-head { cursor: default; }
.cap.interactive .cap-head { cursor: pointer; }
.cap-eyebrow { display: inline-block; margin-bottom: 4px; font-family: var(--trn-mono); font-size: 9px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--c); }
.cap-name { margin: 0; font-size: 16px; font-weight: 750; letter-spacing: -0.01em; color: var(--trn-text);
  padding-right: 26px; line-height: 1.28; transition: color 0.25s; }
.cap.interactive .cap-head:hover .cap-name { color: var(--c); }
.cap-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.cap-code { font-size: 11px; color: var(--trn-text-dim); }

.cap-desc { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.cap-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cap-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 3px 9px;
  border-radius: 999px; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.cap-chip.ok { color: var(--trn-st-completed); background: var(--trn-cert-active-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 26%, transparent); }
.cap-chip.warn { color: var(--trn-ember); background: var(--trn-cert-pending-soft); border-color: color-mix(in srgb, var(--trn-ember) 26%, transparent); }
.cap-chip.muted { color: var(--trn-text-dim); font-weight: 500; font-style: italic; }

/* enrollment constellation */
.cap-enroll { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 18px; }
.ce-stars { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.ce-star { width: 5px; height: 5px; border-radius: 50%; background: var(--trn-star);
  box-shadow: 0 0 6px color-mix(in srgb, var(--c) 80%, var(--trn-star)); animation: trn-twinkle 3s ease-in-out infinite; animation-delay: var(--d); }
.ce-more { font-family: var(--trn-mono); font-size: 10px; font-weight: 700; color: var(--c); margin-left: 2px; }
.ce-label { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trn-text-muted); margin-left: auto; }
.ce-label b { color: var(--trn-text); font-family: var(--trn-mono); font-weight: 800; }
.ce-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-text-dim); }
.ce-dot.live { background: var(--trn-st-completed); box-shadow: 0 0 0 0 var(--trn-st-completed); animation: trn-pulse-dot 2.4s ease-out infinite; }

.cap-foot { display: flex; gap: 6px; border-top: 1px solid var(--trn-border-soft); padding-top: 12px; margin-top: 2px; }
.cap-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 7px 11px; border-radius: 10px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: color 0.2s, background 0.2s, border-color 0.2s; }
.cap-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: var(--trn-border-strong); }
.cap-act.danger { margin-left: auto; color: var(--trn-st-failed); }
.cap-act.danger:hover { background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 32%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .cap-orbit, .ce-star, .ce-dot.live { animation: none !important; }
}
</style>
