<template>
  <Motion as="article" ref="rootRef" class="tcard" :class="{ interactive, preview, off: trainer.is_active === false }"
    :style="{ '--c': accent }"
    :initial="reduced ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.5, delay: Math.min(index * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="interactive ? { y: -4 } : {}">
    <span class="tcard-aura" aria-hidden="true" />
    <span class="tcard-glare" aria-hidden="true" />

    <header class="tcard-head" @click="interactive && $emit('view')">
      <div class="tcard-avwrap" :class="{ unrated }">
        <svg class="tcard-ring" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="32" fill="none" stroke="var(--trn-border-strong)" stroke-width="3" />
          <circle class="tcard-ring-fg" cx="36" cy="36" r="32" fill="none" :stroke="accent" stroke-width="3"
            stroke-linecap="round" :stroke-dasharray="circ" :stroke-dashoffset="dashOffset" transform="rotate(-90 36 36)" />
        </svg>
        <span class="tcard-av">{{ initials }}</span>
        <span class="tcard-rbadge trn-mono"><Star :size="9" />{{ ratingText }}</span>
      </div>

      <div class="tcard-id">
        <h3>{{ trainer.name || 'New trainer' }}</h3>
        <div class="tcard-tags">
          <span class="tcard-type"><span class="tt-dot" />{{ typeLabel }}</span>
          <span class="tcard-status" :class="trainer.is_active === false ? 'off' : 'on'">
            <span class="ts-dot" />{{ trainer.is_active === false ? 'Off-roster' : 'Active' }}
          </span>
        </div>
      </div>
    </header>

    <p v-if="trainer.specialization" class="tcard-spec"><Sparkles :size="12" /> {{ trainer.specialization }}</p>
    <p v-else class="tcard-spec muted"><Sparkles :size="12" /> No specialization set</p>

    <div class="tcard-stats">
      <span class="tcard-starrow" aria-hidden="true">
        <Star v-for="s in 5" :key="s" :size="13" class="tcard-star" :class="{ filled: s <= Math.round(Number(trainer.rating_avg) || 0) }" />
      </span>
      <span class="tcard-rcount">{{ trainer.rating_count || 0 }} review{{ (trainer.rating_count || 0) === 1 ? '' : 's' }}</span>
      <span class="tcard-load"><BookOpen :size="12" /> {{ trainer.program_count || 0 }} program{{ (trainer.program_count || 0) === 1 ? '' : 's' }}</span>
    </div>

    <div class="tcard-contact">
      <span v-if="trainer.organization" class="tcard-chip"><Building2 :size="11" /> {{ trainer.organization }}</span>
      <span v-if="trainer.email" class="tcard-chip"><Mail :size="11" /> {{ trainer.email }}</span>
      <span v-if="trainer.phone" class="tcard-chip"><Phone :size="11" /> {{ trainer.phone }}</span>
      <span v-if="trainer.hourly_rate != null" class="tcard-chip rate"><Wallet :size="11" /> {{ rateText }}</span>
      <span v-if="!hasContact" class="tcard-chip muted">No contact on file</span>
    </div>

    <footer v-if="interactive" class="tcard-foot">
      <Motion as="button" class="tcard-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('view')">
        <Eye :size="14" /> View
      </Motion>
      <Motion as="button" class="tcard-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('edit')">
        <Pencil :size="14" /> Edit
      </Motion>
      <Motion as="button" class="tcard-act danger" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="$emit('delete')">
        <Trash2 :size="14" />
      </Motion>
    </footer>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { Star, Sparkles, BookOpen, Building2, Mail, Phone, Wallet, Eye, Pencil, Trash2 } from 'lucide-vue-next'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  trainer: { type: Object, default: () => ({}) },
  index: { type: Number, default: 0 },
  interactive: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
})
defineEmits(['view', 'edit', 'delete'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const TYPE_COLORS = { INTERNAL: 'var(--trn-amber)', EXTERNAL: 'var(--trn-ember)', VENDOR: 'var(--trn-amber-strong)' }
const accent = computed(() => TYPE_COLORS[props.trainer.trainer_type] || 'var(--trn-amber)')
const typeLabel = computed(() => {
  const t = props.trainer.trainer_type || 'INTERNAL'
  return t.charAt(0) + t.slice(1).toLowerCase()
})
const initials = computed(() => (props.trainer.name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const unrated = computed(() => !(Number(props.trainer.rating_count) > 0))
const ratingText = computed(() => unrated.value ? '—' : Number(props.trainer.rating_avg || 0).toFixed(1))
const rateText = computed(() => {
  const cur = props.trainer.currency || 'INR'
  return `${cur} ${Number(props.trainer.hourly_rate || 0).toLocaleString('en-IN')}/hr`
})
const hasContact = computed(() => !!(props.trainer.organization || props.trainer.email || props.trainer.phone || props.trainer.hourly_rate != null))

// rating arc draw-on
const circ = 2 * Math.PI * 32
const drawn = ref(false)
const dashOffset = computed(() => {
  const pct = Math.max(0, Math.min(5, Number(props.trainer.rating_avg) || 0)) / 5
  return drawn.value ? circ * (1 - pct) : circ
})
onMounted(async () => { await nextTick(); requestAnimationFrame(() => { drawn.value = true }) })
</script>

<style scoped>
.tcard { position: relative; overflow: hidden; isolation: isolate; padding: 18px; border-radius: 18px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  display: flex; flex-direction: column; gap: 12px; transition: box-shadow 0.35s, border-color 0.35s; }
.tcard.interactive:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.tcard.preview { border-style: dashed; border-color: color-mix(in srgb, var(--c) 30%, var(--trn-border-strong)); }
.tcard.off { opacity: 0.82; }

.tcard-aura { position: absolute; inset: 0; z-index: 0; opacity: 0.5; pointer-events: none; transition: opacity 0.4s;
  background: radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 56%); }
.tcard.interactive:hover .tcard-aura { opacity: 1; }
.tcard-glare { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s;
  background: radial-gradient(340px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--c) 20%, transparent), transparent 60%); }
.tcard > *:not(.tcard-aura):not(.tcard-glare) { position: relative; z-index: 2; }

.tcard-head { display: flex; align-items: center; gap: 13px; cursor: default; }
.tcard.interactive .tcard-head { cursor: pointer; }
.tcard-avwrap { position: relative; width: 60px; height: 60px; flex-shrink: 0; display: grid; place-items: center; }
.tcard-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.tcard-ring-fg { transition: stroke-dashoffset 1.1s var(--trn-spring); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 60%, transparent)); }
.tcard-avwrap.unrated .tcard-ring-fg { opacity: 0; }
.tcard-av { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  font-family: var(--trn-mono); font-size: 15px; font-weight: 700; color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent); }
.tcard-rbadge { position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 2px; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 999px;
  color: var(--trn-text); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-strong); white-space: nowrap; }
.tcard-rbadge :deep(svg) { color: var(--trn-star); fill: var(--trn-star); }

.tcard-id { flex: 1; min-width: 0; }
.tcard-id h3 { margin: 0; font-size: 15.5px; font-weight: 750; color: var(--trn-text); line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.25s; }
.tcard.interactive .tcard-head:hover .tcard-id h3 { color: var(--c); }
.tcard-tags { display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
.tcard-type { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.tt-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.tcard-status { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--trn-text-dim); }
.tcard-status .ts-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.tcard-status.on { color: var(--trn-st-completed); }
.tcard-status.on .ts-dot { box-shadow: 0 0 0 0 var(--trn-st-completed); animation: trn-pulse-dot 2.6s ease-out infinite; }

.tcard-spec { margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--trn-text-secondary); line-height: 1.4; }
.tcard-spec :deep(svg) { color: var(--c); flex-shrink: 0; }
.tcard-spec.muted { color: var(--trn-text-dim); font-weight: 500; font-style: italic; }

.tcard-stats { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.tcard-starrow { display: inline-flex; gap: 1px; }
.tcard-star { color: var(--trn-star-dim); }
.tcard-star.filled { color: var(--trn-star); fill: var(--trn-star); filter: drop-shadow(0 0 3px var(--trn-dome-glow)); }
.tcard-rcount { font-size: 11px; color: var(--trn-text-dim); }
.tcard-load { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--trn-text-muted); }

.tcard-contact { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; align-content: flex-start; }
.tcard-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 500; padding: 3px 9px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tcard-chip :deep(svg) { flex-shrink: 0; color: var(--trn-text-dim); }
.tcard-chip.rate { color: var(--trn-amber-strong); }
.tcard-chip.rate :deep(svg) { color: var(--trn-amber-strong); }
.tcard-chip.muted { font-style: italic; color: var(--trn-text-dim); }

.tcard-foot { display: flex; gap: 6px; border-top: 1px solid var(--trn-border-soft); padding-top: 12px; margin-top: 2px; }
.tcard-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 7px 11px; border-radius: 10px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: color 0.2s, background 0.2s, border-color 0.2s; }
.tcard-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: var(--trn-border-strong); }
.tcard-act.danger { margin-left: auto; color: var(--trn-st-failed); }
.tcard-act.danger:hover { background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 32%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .tcard-ring-fg { transition: none; }
  .tcard-status.on .ts-dot { animation: none; }
}
</style>
