<template>
  <section class="ulb">
    <!-- ── toolbar ── -->
    <div class="ulb-bar">
      <div class="ulb-search">
        <Search :size="14" />
        <input :value="q" type="text" placeholder="Search tapes — name, subject, #tag…  ( / )"
          @input="$emit('update:q', $event.target.value)" />
        <button v-if="q" class="ulb-x" title="Clear" @click="$emit('update:q', '')"><X :size="12" /></button>
      </div>
      <SdSelect :model-value="sort" :options="SORTS" placeholder="Sort"
        @update:model-value="$emit('update:sort', $event)" />
      <span class="ulb-count sd-mono">{{ templates.length }} TAPE{{ templates.length === 1 ? '' : 'S' }}</span>
    </div>

    <!-- ── loading shimmer ── -->
    <div v-if="loading" class="ulb-grid">
      <div v-for="n in 6" :key="'sk' + n" class="ulb-sk" :style="{ '--i': n }">
        <span class="ulb-sk-seal" /><span class="ulb-sk-l w60" /><span class="ulb-sk-l w90" /><span class="ulb-sk-l w40" />
      </div>
    </div>

    <!-- ── first-run: the rack is empty ── -->
    <div v-else-if="isVirgin" class="ulb-virgin">
      <div class="ulb-vg-lamp"><Film :size="30" /></div>
      <h3>The rack is empty</h3>
      <p>No tapes in the exchange yet. Record your first personal template —
        a subject, a body with live variables, a checklist — and it prefills a whole
        ticket in one click. Tapes the desk admins publish appear here too.</p>
      <Motion as="button" class="ulb-vg-btn" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
        @click="$emit('new')"><Plus :size="14" /> Record my first template</Motion>
    </div>

    <!-- ── per-lens empty ── -->
    <div v-else-if="!templates.length" class="ulb-empty">
      <Aperture :size="22" />
      <p>{{ emptyLine }}</p>
    </div>

    <!-- ── the slide grid ── -->
    <div v-else class="ulb-grid">
      <SdUtplCard v-for="(t, i) in templates" :key="t.id" :t="t" :index="i"
        :mine="isMine(t)" :cat-name="catNames.get(String(t.category_id)) || ''"
        :busy="busyIds.has(t.id)"
        @use="$emit('use', $event)" @run="$emit('run', $event)" @preview="$emit('preview', $event)"
        @clone="$emit('clone', $event)" @fav="$emit('fav', $event)" @edit="$emit('edit', $event)"
        @retire="$emit('retire', $event)" @activate="$emit('activate', $event)" />
    </div>
  </section>
</template>

<script setup>
/* SdUtplLibrary — the Projection Room slide case: toolbar (search / sort / count),
   the card grid, a shimmer boot state, a cinematic first-run state and per-lens
   empty copy. Pure presentation — the section owns all data + lensing. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Search, X, Plus, Film, Aperture } from 'lucide-vue-next'
import SdSelect from './SdSelect.vue'
import SdUtplCard from './SdUtplCard.vue'

const props = defineProps({
  templates: { type: Array, default: () => [] },
  lens: { type: String, default: 'all' },
  q: { type: String, default: '' },
  sort: { type: String, default: 'pinned' },
  loading: { type: Boolean, default: false },
  isVirgin: { type: Boolean, default: false },
  myId: { type: String, default: '' },
  busyIds: { type: Object, default: () => new Set() },
  catNames: { type: Map, default: () => new Map() },
})
defineEmits(['update:q', 'update:sort', 'use', 'run', 'preview', 'clone', 'fav', 'edit', 'retire', 'activate', 'new'])

const SORTS = [
  { value: 'pinned', label: 'Curated order' },
  { value: 'most-used', label: 'Most used' },
  { value: 'recent', label: 'Recently used' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A→Z' },
]

const isMine = (t) => (t.visibility || 'global') === 'personal'
  && String(t.created_by_id || '') === String(props.myId || '·')

const emptyLine = computed(() => {
  if (props.q) return `Nothing in the rack matches “${props.q}”.`
  return {
    favorites: 'No mixtape yet — hover any card and hit the star.',
    mine: 'You carry no personal tapes yet — Record one, or Clone a library tape into your kit.',
    drafts: 'No unlabeled drafts of yours — drafts you save land here until you activate them.',
    recent: 'Nothing played recently — Use a tape and it shows up here.',
    pinned: 'The desk admins haven’t curated any picks yet.',
  }[props.lens] || 'No tapes on this lens.'
})
</script>

<style scoped>
.ulb { display: flex; flex-direction: column; gap: 14px; }

.ulb-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ulb-search {
  flex: 1 1 260px; display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 12px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ulb-search:focus-within { border-color: var(--sd-utpl-brd); box-shadow: 0 0 16px color-mix(in srgb, var(--sd-utpl-core) 12%, transparent); }
.ulb-search input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 13px; color: var(--sd-text);
}
.ulb-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-muted)); }
.ulb-x { display: grid; place-items: center; background: transparent; border: none; color: var(--sd-text-muted); cursor: pointer; }
.ulb-count { font-size: 10px; letter-spacing: 0.16em; color: var(--sd-text-muted); }

.ulb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr)); gap: 14px; }

/* shimmer boot */
.ulb-sk {
  position: relative; overflow: hidden; border-radius: 16px; min-height: 168px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.ulb-sk::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--sd-utpl-core) 7%, transparent) 50%, transparent 70%);
  transform: translateX(-100%); animation: ulb-shimmer 1.4s infinite; animation-delay: calc(var(--i) * 0.08s);
}
@keyframes ulb-shimmer { to { transform: translateX(100%); } }
.ulb-sk-seal { width: 36px; height: 36px; border-radius: 11px; background: var(--sd-surface-glass); }
.ulb-sk-l { height: 10px; border-radius: 5px; background: var(--sd-surface-glass); }
.ulb-sk-l.w60 { width: 60%; } .ulb-sk-l.w90 { width: 90%; } .ulb-sk-l.w40 { width: 40%; }

/* first-run */
.ulb-virgin {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
  padding: 52px 24px; border-radius: 18px;
  border: 1px dashed var(--sd-utpl-brd);
  background: radial-gradient(70% 120% at 50% 0%, var(--sd-utpl-soft), transparent 70%);
}
.ulb-vg-lamp {
  width: 62px; height: 62px; display: grid; place-items: center; border-radius: 50%;
  color: var(--sd-utpl-hi); background: var(--sd-utpl-soft);
  border: 1px solid var(--sd-utpl-brd);
  box-shadow: 0 0 34px color-mix(in srgb, var(--sd-utpl-core) 24%, transparent);
  animation: ulb-breathe 3.6s ease-in-out infinite;
}
[data-theme="light"] .ulb-vg-lamp { color: var(--sd-utpl-core); }
@keyframes ulb-breathe { 0%, 100% { box-shadow: 0 0 22px color-mix(in srgb, var(--sd-utpl-core) 16%, transparent); } 50% { box-shadow: 0 0 44px color-mix(in srgb, var(--sd-utpl-core) 34%, transparent); } }
.ulb-virgin h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--sd-text); }
.ulb-virgin p { margin: 0; max-width: 54ch; font-size: 13px; line-height: 1.6; color: var(--sd-text-secondary); }
.ulb-vg-btn {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 8px;
  padding: 11px 18px; border-radius: 12px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 800;
  background: var(--sd-utpl-grad); color: #1b0f04; box-shadow: var(--sd-utpl-glow);
}
[data-theme="light"] .ulb-vg-btn { color: #fff7e9; }

/* per-lens empty */
.ulb-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; border-radius: 16px; text-align: center;
  border: 1px dashed var(--sd-border); color: var(--sd-text-muted);
}
.ulb-empty p { margin: 0; font-size: 13px; max-width: 52ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ulb-sk::after,
  html:not([data-cinematic="on"]) .ulb-vg-lamp { animation: none; }
}
</style>
