<template>
  <section class="tlb">
    <!-- ── case toolbar ── -->
    <Motion as="div" class="tlb-bar" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
      <div class="tlb-search">
        <Search :size="14" />
        <input :value="q" class="tlb-inp" type="search" placeholder="Search plates — name, subject, tag…"
          @input="$emit('update:q', $event.target.value)" />
        <button v-if="q" class="tlb-clear" title="Clear" @click="$emit('update:q', '')"><X :size="12" /></button>
      </div>
      <div class="tlb-sort">
        <SdSelect :model-value="sort" :options="SORTS" @update:model-value="$emit('update:sort', $event)" />
      </div>
      <span class="tlb-count sd-mono">{{ templates.length }} PLATE{{ templates.length === 1 ? '' : 'S' }}</span>
    </Motion>

    <!-- ── the plate case ── -->
    <div v-if="templates.length" class="tlb-grid">
      <SdTemplateCard v-for="(t, i) in templates" :key="t.id" :t="t" :index="i"
        :cat-name="catNames.get(String(t.category_id)) || ''"
        :team-name="teamNames.get(String(t.team_id)) || ''"
        :busy="busyIds.has(t.id)"
        @apply="$emit('apply', $event)" @edit="$emit('edit', $event)" @clone="$emit('clone', $event)"
        @pin="$emit('pin', $event)" @activate="$emit('activate', $event)" @retire="$emit('retire', $event)" />
    </div>

    <!-- ── empty states ── -->
    <Motion v-else-if="!loading && isVirgin" as="div" class="tlb-first"
      :initial="{ opacity: 0, scale: 0.97 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="tlb-first-plate">
        <span class="tlb-first-ring" aria-hidden="true" />
        <Stamp :size="34" />
      </div>
      <h3 class="tlb-first-title">No master plates yet</h3>
      <p class="tlb-first-sub">
        Cut the first plate — lock in a subject, defaults, variables and a checklist,
        and every common request becomes a one-strike ticket.
      </p>
      <Motion as="button" class="tlb-first-btn" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
        @click="$emit('new')"><Plus :size="15" /> Cut the first plate</Motion>
    </Motion>

    <div v-else-if="!loading" class="tlb-empty">
      <CircleDashed :size="26" />
      <p>{{ emptyLine }}</p>
    </div>

    <div v-else class="tlb-empty"><LoaderCircle :size="22" class="tlb-spin" /><p>Pulling the plate case…</p></div>
  </section>
</template>

<script setup>
/* SdTemplateLibrary — the plate case: search + sort toolbar and the card grid
   (pinned plates already float to the top upstream). Per-lens empty copy + the
   cinematic "first plate" launch state when the studio is virgin. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Search, X, Plus, Stamp, CircleDashed, LoaderCircle } from 'lucide-vue-next'
import SdSelect from './SdSelect.vue'
import SdTemplateCard from './SdTemplateCard.vue'

const SORTS = [
  { value: 'pinned', label: 'Pinned · A→Z' },
  { value: 'most-used', label: 'Most struck' },
  { value: 'recent', label: 'Recently struck' },
  { value: 'newest', label: 'Newest plates' },
]

const props = defineProps({
  templates: { type: Array, default: () => [] },
  lens: { type: String, default: 'all' },
  q: { type: String, default: '' },
  sort: { type: String, default: 'pinned' },
  loading: { type: Boolean, default: false },
  isVirgin: { type: Boolean, default: false },   /* zero templates exist at all */
  busyIds: { type: Set, default: () => new Set() },
  catNames: { type: Map, default: () => new Map() },
  teamNames: { type: Map, default: () => new Map() },
})
defineEmits(['apply', 'edit', 'clone', 'pin', 'activate', 'retire', 'new', 'update:q', 'update:sort'])

const emptyLine = computed(() => {
  if (props.q) return `No plates match “${props.q}”.`
  return {
    drafts: 'No drafts on the galley — every plate is either struck or shelved.',
    archived: 'The archive drawer is empty.',
    pinned: 'Nothing pinned yet — pin the plates your desk reaches for daily.',
    unused: 'Every active plate has been struck at least once. Clean shop.',
    top: 'No strikes recorded yet — use a plate from the intake to start the count.',
    active: 'No active plates. Activate a draft or cut a new one.',
  }[props.lens] || 'No plates in this lens.'
})
</script>

<style scoped>
.tlb { display: flex; flex-direction: column; gap: 14px; }

.tlb-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tlb-search {
  flex: 1 1 260px; display: flex; align-items: center; gap: 9px;
  padding: 0 12px; height: 42px; border-radius: 12px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tlb-search:focus-within { border-color: var(--sd-tpl-brd); box-shadow: 0 0 0 3px var(--sd-tpl-soft); }
.tlb-inp {
  flex: 1; height: 100%; border: none; outline: none; background: transparent;
  font-size: 13px; font-family: inherit; color: var(--sd-text);
}
.tlb-inp::placeholder { color: var(--sd-text-placeholder, var(--sd-text-muted)); }
.tlb-clear { display: grid; place-items: center; width: 22px; height: 22px; border: none; border-radius: 7px; cursor: pointer; background: var(--sd-surface-glass); color: var(--sd-text-muted); }
.tlb-sort { width: 190px; }
.tlb-count { font-size: 10px; letter-spacing: 0.16em; color: var(--sd-text-muted); }

.tlb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr)); gap: 13px; }

.tlb-first {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 52px 24px 56px; border-radius: 18px;
  border: 1.5px dashed var(--sd-tpl-brd);
  background:
    radial-gradient(60% 70% at 50% 0%, var(--sd-tpl-soft), transparent 65%),
    var(--sd-surface);
}
.tlb-first-plate {
  position: relative; width: 84px; height: 84px; display: grid; place-items: center;
  border-radius: 22px; margin-bottom: 18px;
  background: var(--sd-tpl-grad); color: #180d05;
  box-shadow: var(--sd-tpl-glow);
}
[data-theme="light"] .tlb-first-plate { color: #fff6ea; }
.tlb-first-ring {
  position: absolute; inset: -10px; border-radius: 28px;
  border: 1.5px solid var(--sd-tpl-brd);
  animation: tlb-ring 2.8s var(--sd-ease, ease) infinite;
}
@keyframes tlb-ring { 0% { transform: scale(0.94); opacity: 0.9; } 70%, 100% { transform: scale(1.12); opacity: 0; } }
.tlb-first-title { margin: 0 0 6px; font-size: 19px; font-weight: 800; color: var(--sd-text); }
.tlb-first-sub { margin: 0 0 18px; max-width: 46ch; font-size: 13px; color: var(--sd-text-secondary); }
.tlb-first-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 12px;
  border: none; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--sd-tpl-grad); color: #180d05; box-shadow: var(--sd-tpl-glow);
}
[data-theme="light"] .tlb-first-btn { color: #fff6ea; }

.tlb-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 44px 20px; color: var(--sd-text-muted); font-size: 13px;
  border-radius: 16px; border: 1px dashed var(--sd-border); background: var(--sd-surface);
}
.tlb-empty p { margin: 0; }
.tlb-spin { animation: sd-spin-slow 1.1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tlb-first-ring { animation: none; opacity: 0.4; }
}
</style>
