<template>
  <TrnDrawer :open="open" wide eyebrow="Faculty member" :title="trainer?.name || ''" :icon="Presentation" @close="$emit('close')">
    <template v-if="trainer">
     <div class="td-stack" :style="{ '--c': accent }">
      <!-- profile -->
      <Motion as="section" class="td-card td-profile"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="td-aura" aria-hidden="true" />
        <div class="tp-avwrap">
          <svg class="tp-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r="40" fill="none" stroke="var(--trn-border-strong)" stroke-width="4" />
            <circle class="tp-ring-fg" cx="44" cy="44" r="40" fill="none" :stroke="accent" stroke-width="4"
              stroke-linecap="round" :stroke-dasharray="circ" :stroke-dashoffset="dashOffset" transform="rotate(-90 44 44)" />
          </svg>
          <span class="tp-av">{{ initials }}</span>
        </div>
        <div class="tp-meta">
          <div class="tp-tags">
            <span class="tp-type"><span class="tt-dot" />{{ typeLabel }}</span>
            <span class="tp-status" :class="trainer.is_active === false ? 'off' : 'on'"><span class="ts-dot" />{{ trainer.is_active === false ? 'Off-roster' : 'Active' }}</span>
          </div>
          <p v-if="trainer.specialization" class="tp-spec">{{ trainer.specialization }}</p>
          <div class="tp-rating">
            <span class="tp-stars" aria-hidden="true">
              <Star v-for="s in 5" :key="s" :size="14" class="tp-star" :class="{ filled: s <= Math.round(Number(trainer.rating_avg) || 0) }" />
            </span>
            <b class="trn-mono">{{ Number(trainer.rating_avg || 0).toFixed(1) }}</b>
            <span class="tp-rc">· {{ trainer.rating_count || 0 }} review{{ (trainer.rating_count || 0) === 1 ? '' : 's' }}</span>
          </div>
        </div>
      </Motion>

      <!-- vitals -->
      <Motion as="section" class="td-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="td-card-h"><Info :size="12" /> Profile</h4>
        <dl class="td-meta">
          <div class="tdm-cell"><dt><BookOpen :size="11" /> Programs led</dt><dd>{{ trainer.program_count || 0 }}</dd></div>
          <div class="tdm-cell"><dt><Wallet :size="11" /> Hourly rate</dt><dd>{{ trainer.hourly_rate != null ? rateText : '—' }}</dd></div>
          <div class="tdm-cell"><dt><Building2 :size="11" /> Organization</dt><dd>{{ trainer.organization || '—' }}</dd></div>
          <div class="tdm-cell"><dt><CalendarDays :size="11" /> On roster since</dt><dd>{{ createdDate }}</dd></div>
        </dl>
      </Motion>

      <!-- contact -->
      <Motion as="section" class="td-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="td-card-h"><Contact :size="12" /> Contact</h4>
        <div class="td-contact">
          <a v-if="trainer.email" class="tdc-row" :href="`mailto:${trainer.email}`"><span class="tdc-ic"><Mail :size="14" /></span> {{ trainer.email }}</a>
          <a v-if="trainer.phone" class="tdc-row" :href="`tel:${trainer.phone}`"><span class="tdc-ic"><Phone :size="14" /></span> {{ trainer.phone }}</a>
          <div v-if="!trainer.email && !trainer.phone" class="tdc-empty">No contact details on file.</div>
        </div>
      </Motion>

      <!-- programs led -->
      <Motion as="section" class="td-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="td-card-h"><Layers :size="12" /> Programs led</h4>
        <div v-if="loadingProgs" class="td-progs">
          <div class="trn-skel" style="height:40px" /><div class="trn-skel" style="height:40px" />
        </div>
        <ul v-else-if="programs.length" class="td-progs">
          <Motion v-for="(p, i) in programs" :key="p.id" as="li"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.34, delay: 0.18 + i * 0.05 }">
            <span class="tdp-dot" :style="{ background: typeDot(p.training_type) }" />
            <span class="tdp-name">{{ p.name }}</span>
            <span v-if="p.code" class="tdp-code trn-mono">{{ p.code }}</span>
          </Motion>
        </ul>
        <p v-else-if="!trainer.user_id" class="td-progs-note">
          <LinkIcon :size="13" /> This trainer isn't linked to a login account, so program assignments aren't tracked here.
        </p>
        <p v-else class="td-progs-note"><BookOpen :size="13" /> Not leading any programs yet.</p>
      </Motion>
     </div>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-danger td-del" @click="$emit('delete', trainer)"><Trash2 :size="14" /></button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('edit', trainer)"><Pencil :size="14" /> Edit</button>
      <button class="trn-btn trn-btn-primary" @click="$emit('close')">Done</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Presentation, Star, Info, BookOpen, Wallet, Building2, CalendarDays, Contact,
  Mail, Phone, Layers, Link as LinkIcon, Pencil, Trash2,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import { typeMeta, fetchTrainingPrograms } from '@/composables/useTraining'

const props = defineProps({ open: { type: Boolean, default: false }, trainer: { type: Object, default: null } })
defineEmits(['close', 'edit', 'delete'])

const TYPE_COLORS = { INTERNAL: 'var(--trn-amber)', EXTERNAL: 'var(--trn-ember)', VENDOR: 'var(--trn-amber-strong)' }
const accent = computed(() => TYPE_COLORS[props.trainer?.trainer_type] || 'var(--trn-amber)')
const typeLabel = computed(() => {
  const t = props.trainer?.trainer_type || 'INTERNAL'
  return t.charAt(0) + t.slice(1).toLowerCase()
})
const initials = computed(() => (props.trainer?.name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const rateText = computed(() => `${props.trainer?.currency || 'INR'} ${Number(props.trainer?.hourly_rate || 0).toLocaleString('en-IN')}/hr`)
const createdDate = computed(() => {
  if (!props.trainer?.created_at) return '—'
  try { return new Date(props.trainer.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
})
const typeDot = (t) => `var(${typeMeta(t).cssVar})`

const circ = 2 * Math.PI * 40
const drawn = ref(false)
const dashOffset = computed(() => {
  const pct = Math.max(0, Math.min(5, Number(props.trainer?.rating_avg) || 0)) / 5
  return drawn.value ? circ * (1 - pct) : circ
})

const programs = ref([])
const loadingProgs = ref(false)
const loadProgs = async () => {
  programs.value = []
  if (!props.trainer?.user_id) return
  loadingProgs.value = true
  try {
    const all = await fetchTrainingPrograms()
    programs.value = all.filter(p => String(p.trainer_user_id) === String(props.trainer.user_id))
  } catch { /* best-effort */ }
  finally { loadingProgs.value = false }
}

const replay = async () => {
  drawn.value = false
  await loadProgs()
  await nextTick(); requestAnimationFrame(() => { drawn.value = true })
}
watch(() => props.open, (o) => { if (o) replay() })
watch(() => props.trainer?.id, () => { if (props.open) replay() })
onMounted(() => { if (props.open) replay() })
</script>

<style scoped>
.td-stack { display: flex; flex-direction: column; gap: 14px; }
.td-card { position: relative; border: 1px solid var(--trn-border-soft); border-radius: 18px; padding: 16px 18px; background: var(--trn-surface); }
.td-card-h { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-muted); }

/* profile */
.td-profile { display: flex; align-items: center; gap: 16px; overflow: hidden; isolation: isolate; background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.td-aura { position: absolute; inset: 0; z-index: 0; opacity: 0.7; pointer-events: none;
  background: radial-gradient(80% 100% at 0% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 60%); }
.td-profile > *:not(.td-aura) { position: relative; z-index: 1; }
.tp-avwrap { position: relative; width: 78px; height: 78px; flex-shrink: 0; display: grid; place-items: center; }
.tp-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.tp-ring-fg { transition: stroke-dashoffset 1.1s var(--trn-spring); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 60%, transparent)); }
.tp-av { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; font-family: var(--trn-mono);
  font-size: 20px; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.tp-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.tp-tags { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.tp-type { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.tt-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.tp-status { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--trn-text-dim); }
.tp-status .ts-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.tp-status.on { color: var(--trn-st-completed); }
.tp-spec { margin: 0; font-size: 13px; font-weight: 600; color: var(--trn-text-secondary); }
.tp-rating { display: flex; align-items: center; gap: 7px; }
.tp-stars { display: inline-flex; gap: 1px; }
.tp-star { color: var(--trn-star-dim); }
.tp-star.filled { color: var(--trn-star); fill: var(--trn-star); }
.tp-rating b { font-size: 13px; color: var(--trn-text); }
.tp-rc { font-size: 11.5px; color: var(--trn-text-dim); }

/* vitals */
.td-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.tdm-cell { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 11px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.td-meta dt { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-dim); }
.td-meta dd { margin: 0; font-size: 13.5px; color: var(--trn-text); font-weight: 600; }

/* contact */
.td-contact { display: flex; flex-direction: column; gap: 8px; }
.tdc-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--trn-text-secondary); text-decoration: none;
  padding: 8px 10px; border-radius: 11px; background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft);
  transition: border-color 0.2s, transform 0.2s; }
.tdc-row:hover { border-color: color-mix(in srgb, var(--c) 36%, transparent); transform: translateX(3px); }
.tdc-ic { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.tdc-empty { font-size: 12.5px; color: var(--trn-text-dim); font-style: italic; }

/* programs led */
.td-progs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.td-progs li { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 11px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.tdp-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.tdp-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tdp-code { font-size: 11px; color: var(--trn-text-dim); flex-shrink: 0; }
.td-progs-note { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-dim); }
.td-progs-note :deep(svg) { color: var(--c); flex-shrink: 0; }

.td-del { margin-right: auto; padding-left: 12px; padding-right: 12px; }
@media (prefers-reduced-motion: reduce) { .tp-ring-fg { transition: none; } }
</style>
