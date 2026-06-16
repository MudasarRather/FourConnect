<template>
  <Motion
    as="article"
    ref="cardRef"
    class="rmb-cat-card rmb-receipt"
    :class="{ off: !category.is_active }"
    :style="{ '--cat': accent }"
    :initial="{ opacity: 0, y: 22, filter: 'blur(8px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :whileHover="{ y: -6 }"
    :whileTap="{ scale: 0.99 }"
    :transition="{ duration: 0.55, delay: Math.min(index, 11) * 0.055, ease: [0.16, 1, 0.3, 1] }"
    role="button"
    tabindex="0"
    @click="$emit('edit', category)"
    @keydown.enter="$emit('edit', category)"
  >
    <!-- cinematic surface fx -->
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="cc-sheen" aria-hidden="true" />
    <span class="cc-spine" aria-hidden="true" />
    <span class="cc-aura" aria-hidden="true" />

    <!-- header: living icon + identity + state -->
    <header class="cc-head">
      <span class="cc-ic">
        <component :is="meta.icon" :size="19" />
        <i class="cc-ic-ring" aria-hidden="true" />
      </span>
      <div class="cc-id">
        <span class="cc-name">{{ category.name }}</span>
        <span class="cc-code rmb-mono">{{ category.code }}</span>
      </div>
      <span class="cc-state" :class="category.is_active ? 'live' : 'idle'">
        <i class="cc-state-dot" />{{ category.is_active ? 'Live' : 'Off' }}
      </span>
    </header>

    <p class="cc-desc">{{ category.description || 'No description provided yet.' }}</p>

    <!-- policy flag chips -->
    <div class="cc-flags">
      <span v-if="category.requires_attachment" class="cc-flag receipt"><Paperclip :size="11" /> Receipt</span>
      <span v-else class="cc-flag muted"><Ban :size="11" /> No receipt</span>
      <span v-if="category.is_taxable" class="cc-flag tax"><Percent :size="11" /> Taxable</span>
      <span v-else class="cc-flag muted"><ShieldCheck :size="11" /> Tax-free</span>
    </div>

    <!-- dynamic field schema preview -->
    <div class="cc-schema">
      <span class="cc-schema-lbl rmb-mono">SCHEMA</span>
      <div v-if="fields.length" class="cc-pills">
        <Motion v-for="(f, i) in shownFields" :key="f.key || i" as="span" class="cc-pill"
          :initial="{ opacity: 0, scale: 0.7 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ delay: 0.25 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }">
          {{ f.label || f.key }}<i v-if="f.required" class="cc-pill-req">*</i>
        </Motion>
        <span v-if="fields.length > shownFields.length" class="cc-pill more">+{{ fields.length - shownFields.length }}</span>
      </div>
      <span v-else class="cc-noschema">Core fields only</span>
    </div>

    <hr class="rmb-perf-line" />

    <!-- footer: live counters + actions -->
    <footer class="cc-foot">
      <div class="cc-metric">
        <b class="rmb-mono"><RmbCountUp :value="fields.length" /></b>
        <small>field{{ fields.length === 1 ? '' : 's' }}</small>
      </div>
      <span class="cc-metric-sep" aria-hidden="true" />
      <div class="cc-metric">
        <b class="rmb-mono"><RmbCountUp :value="claimCount" /></b>
        <small>claim{{ claimCount === 1 ? '' : 's' }}</small>
      </div>
      <div class="cc-acts" @click.stop>
        <button class="cc-act" aria-label="Edit category" @click="$emit('edit', category)"><Pencil :size="14" /></button>
        <button class="cc-act danger" aria-label="Delete category" @click="$emit('remove', category)"><Trash2 :size="14" /></button>
      </div>
    </footer>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Pencil, Trash2, Paperclip, Ban, Percent, ShieldCheck } from 'lucide-vue-next'
import { categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbCountUp from './RmbCountUp.vue'

const props = defineProps({
  category: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'remove'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)

const meta = computed(() => categoryMeta(props.category.code))
const accent = computed(() => props.category.color_hex || meta.value.hex)
const fields = computed(() => props.category.field_schema || [])
const shownFields = computed(() => fields.value.slice(0, 4))
const claimCount = computed(() => Number(props.category.claim_count) || 0)
</script>

<style scoped>
.rmb-cat-card {
  position: relative; padding: 16px 18px 15px 22px; cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column; gap: 11px;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.62);
  transition: box-shadow 0.4s var(--rmb-spring), border-color 0.3s, opacity 0.3s;
  will-change: transform;
}
.rmb-cat-card:hover {
  box-shadow: 0 26px 52px -24px color-mix(in srgb, var(--cat, var(--rmb-amber)) 48%, rgba(0,0,0,0.5));
  border-color: color-mix(in srgb, var(--cat, var(--rmb-amber)) 42%, var(--rmb-border-soft));
}
.rmb-cat-card:focus-visible { outline: 2px solid var(--cat, var(--rmb-amber)); outline-offset: 2px; }
.rmb-cat-card.off { opacity: 0.74; }

/* category-tinted spine */
.cc-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--cat, var(--rmb-amber)), color-mix(in srgb, var(--cat, var(--rmb-amber)) 28%, transparent));
  box-shadow: 0 0 13px -1px var(--cat, var(--rmb-amber)); }
.rmb-cat-card.off .cc-spine { background: var(--rmb-st-cancelled); box-shadow: none; }

/* corner aura that wakes on hover */
.cc-aura { position: absolute; top: -60px; right: -60px; width: 150px; height: 150px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--cat, var(--rmb-amber)) 30%, transparent), transparent 68%);
  opacity: 0; transform: scale(0.7); transition: opacity 0.45s var(--rmb-ease), transform 0.6s var(--rmb-spring); }
.rmb-cat-card:hover .cc-aura { opacity: 0.55; transform: scale(1); }

/* hover sheen sweep */
.cc-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 16%, transparent) 50%, transparent 56%);
  background-size: 240% 100%; }
.rmb-cat-card:hover .cc-sheen { opacity: 1; animation: rmb-amount-shimmer 1.15s var(--rmb-ease) 1; }

/* header */
.cc-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 11px; }
.cc-ic { position: relative; width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; flex: 0 0 auto;
  color: var(--cat, var(--rmb-amber)); background: color-mix(in srgb, var(--cat, var(--rmb-amber)) 15%, transparent);
  transition: transform 0.4s var(--rmb-spring); animation: rmb-icon-pop 0.6s var(--rmb-spring) both; }
.rmb-cat-card:hover .cc-ic { transform: scale(1.1) rotate(-6deg); }
.cc-ic-ring { position: absolute; inset: -3px; border-radius: 15px; pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--cat, var(--rmb-amber)) 40%, transparent); opacity: 0; transition: opacity 0.3s; }
.rmb-cat-card:hover .cc-ic-ring { opacity: 1; }
.cc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cc-name { font-weight: 700; font-size: 14.5px; color: var(--rmb-text); line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-code { font-size: 10px; color: var(--rmb-text-muted); letter-spacing: 0.5px; }
.cc-state { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px;
  border: 1px solid var(--rmb-border-soft); background: var(--rmb-surface); }
.cc-state.live { color: var(--rmb-st-approved); border-color: color-mix(in srgb, var(--rmb-st-approved) 35%, transparent);
  background: var(--rmb-st-approved-soft); }
.cc-state.idle { color: var(--rmb-st-cancelled); }
.cc-state-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.cc-state.live .cc-state-dot { box-shadow: 0 0 7px 0 var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-in-out infinite; }

.cc-desc { position: relative; z-index: 2; margin: 0; font-size: 12px; color: var(--rmb-text-muted); line-height: 1.45;
  min-height: 34px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* flag chips */
.cc-flags { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px; }
.cc-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 8px;
  border-radius: 7px; border: 1px solid var(--rmb-border-soft); background: var(--rmb-surface); color: var(--rmb-text-muted); }
.cc-flag.receipt { color: var(--rmb-st-submitted); background: var(--rmb-st-submitted-soft);
  border-color: color-mix(in srgb, var(--rmb-st-submitted) 26%, transparent); }
.cc-flag.tax { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft);
  border-color: color-mix(in srgb, var(--rmb-st-returned) 26%, transparent); }

/* schema preview */
.cc-schema { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 8px; min-height: 22px; }
.cc-schema-lbl { font-size: 8.5px; letter-spacing: 0.14em; color: var(--rmb-text-muted); padding-top: 4px; flex: 0 0 auto; opacity: 0.7; }
.cc-pills { display: flex; flex-wrap: wrap; gap: 5px; }
.cc-pill { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 500; padding: 3px 8px; border-radius: 999px;
  color: var(--rmb-text-secondary); background: color-mix(in srgb, var(--cat, var(--rmb-amber)) 9%, var(--rmb-surface));
  border: 1px solid var(--rmb-border-soft); }
.cc-pill-req { color: var(--rmb-st-rejected); margin-left: 1px; font-style: normal; }
.cc-pill.more { color: var(--rmb-text-muted); font-family: var(--rmb-mono); font-size: 10px; }
.cc-noschema { font-size: 11px; color: var(--rmb-text-muted); font-style: italic; padding-top: 3px; }

/* footer */
.cc-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 14px; }
.cc-metric { display: flex; flex-direction: column; line-height: 1.05; }
.cc-metric b { font-size: 16px; font-weight: 800; color: var(--rmb-text); }
.cc-metric small { font-size: 9.5px; color: var(--rmb-text-muted); letter-spacing: 0.03em; }
.cc-metric-sep { width: 1px; height: 22px; background: var(--rmb-border-soft); }
.cc-acts { margin-left: auto; display: flex; gap: 6px; opacity: 0.55;
  transform: translateX(4px); transition: opacity 0.3s, transform 0.3s var(--rmb-spring); }
.rmb-cat-card:hover .cc-acts { opacity: 1; transform: translateX(0); }
.cc-act { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  transition: all 0.22s var(--rmb-spring); }
.cc-act:hover { color: var(--cat, var(--rmb-amber)); border-color: color-mix(in srgb, var(--cat, var(--rmb-amber)) 45%, transparent);
  transform: translateY(-2px); }
.cc-act.danger:hover { color: var(--rmb-st-rejected); border-color: color-mix(in srgb, var(--rmb-st-rejected) 45%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .cc-ic { animation: none; }
  .rmb-cat-card:hover .cc-sheen { animation: none; }
}
</style>
