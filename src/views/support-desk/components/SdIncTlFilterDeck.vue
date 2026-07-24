<template>
  <div class="tfd">
    <!-- row 1 — kind categories · sev · window · search -->
    <div class="tfd-row">
      <span class="tfd-lbl">KIND</span>
      <button type="button" class="tfd-chip" :class="{ on: !desk.kinds.value.length }"
              @click="clearKinds">ALL</button>
      <button v-for="c in cats" :key="c.key" type="button" class="tfd-chip"
              :class="{ on: catOn(c.key) }" @click="toggleCat(c.key)">
        <span class="tfd-cdot" :style="{ background: `var(${c.token})` }" aria-hidden="true" />
        {{ c.label.toUpperCase() }}
      </button>
      <span class="tfd-spacer" />
      <span class="tfd-lbl">SEV</span>
      <SdSelect v-model="sevProxy" :options="SEV_OPTS" class="tfd-sel" />
      <span class="tfd-lbl">WINDOW</span>
      <SdDatePicker v-model="fromProxy" class="tfd-date" placeholder="FROM" />
      <SdDatePicker v-model="toProxy" class="tfd-date" placeholder="TO" />
      <label class="tfd-search">
        <Search :size="12" class="tfd-sic" aria-hidden="true" />
        <input ref="qEl" v-model="desk.q.value" type="text"
               placeholder="SEARCH SUBJECTS, TICKETS…" aria-label="Search the timeline" />
        <kbd class="tfd-kbd">/</kbd>
      </label>
    </div>

    <!-- row 2 — actor · exposure · lenses · live -->
    <div class="tfd-row">
      <span class="tfd-lbl">ACTOR</span>
      <span class="tfd-seg" role="group" aria-label="Actor kind">
        <button v-for="a in ACTORS" :key="a.v" type="button"
                :class="{ on: desk.actorKind.value === a.v }"
                @click="desk.actorKind.value = a.v">{{ a.label }}</button>
      </span>
      <span class="tfd-lbl">EXPOSURE</span>
      <button v-for="x in EXPOSURES" :key="x.v" type="button" class="tfd-flag"
              :class="{ on: desk.exposure.value === x.v }"
              @click="desk.exposure.value = desk.exposure.value === x.v ? '' : x.v">{{ x.label }}</button>
      <button type="button" class="tfd-chip" :class="{ on: desk.miOnly.value }"
              @click="desk.miOnly.value = !desk.miOnly.value">◆ MI ONLY</button>
      <button type="button" class="tfd-chip" :class="{ on: desk.stonesOnly.value }"
              @click="desk.stonesOnly.value = !desk.stonesOnly.value">◎ MILESTONES ONLY</button>
      <span class="tfd-spacer" />
      <button type="button" class="tfd-chip" :class="{ on: desk.mine.value }"
              @click="desk.mine.value = !desk.mine.value">☰ MY INCIDENTS</button>
      <button type="button" class="tfd-live" :class="{ on: desk.live.value }"
              :title="desk.live.value ? 'Live mode armed — 18s incremental polls' : 'Arm live mode'"
              @click="desk.live.value = !desk.live.value">
        <span class="tfd-ld" aria-hidden="true" />LIVE
      </button>
      <button v-if="desk.hasFilters.value" type="button" class="tfd-clear" @click="desk.clearFilters">
        ✕ CLEAR
      </button>
    </div>
  </div>
</template>

<script setup>
/*
  SdIncTlFilterDeck — the Service Diagram's filter surface. Category chips are
  GROUPED kind filters: toggling a category unions its catalog actions into the
  spine's `kinds` param (server-validated CSV), so the chips and the seal can
  never disagree. Mutates the spine's refs directly (house `desk` prop pattern).
*/
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Search } from 'lucide-vue-next'
import SdSelect from './SdSelect.vue'
import SdDatePicker from './SdDatePicker.vue'
import { CATEGORY_META, CATEGORY_ORDER } from '../composables/incidentTaxonomy'

const props = defineProps({
  desk: { type: Object, required: true },        // the useIncidentTimeline spine
})

const SEV_OPTS = [
  { value: '', label: 'ALL SEV' }, { value: '1', label: 'SEV1' }, { value: '2', label: 'SEV2' },
  { value: '3', label: 'SEV3' }, { value: '4', label: 'SEV4' },
]
const ACTORS = [{ v: '', label: 'ALL' }, { v: 'human', label: 'HUMAN' }, { v: 'system', label: 'SYSTEM' }]
const EXPOSURES = [
  { v: 'security', label: 'SEC' }, { v: 'compliance', label: 'COMP' },
  { v: 'public', label: 'PUB' }, { v: 'revenue', label: 'REV' },
]
const cats = CATEGORY_ORDER.filter((k) => k !== 'system')
  .map((k) => ({ key: k, ...CATEGORY_META[k] }))

const actionsOf = (cat) =>
  Object.entries(props.desk.catalog.value || {})
    .filter(([, m]) => m.category === cat).map(([a]) => a)
const catOn = (cat) => {
  const acts = actionsOf(cat)
  return acts.length > 0 && acts.every((a) => props.desk.kinds.value.includes(a))
}
const toggleCat = (cat) => {
  const acts = actionsOf(cat)
  if (!acts.length) return
  props.desk.kinds.value = catOn(cat)
    ? props.desk.kinds.value.filter((k) => !acts.includes(k))
    : [...new Set([...props.desk.kinds.value, ...acts])]
}
const clearKinds = () => { props.desk.kinds.value = [] }

/* SdSelect/SdDatePicker v-model proxies over the spine refs */
const sevProxy = computed({
  get: () => (props.desk.sev.value ? String(props.desk.sev.value) : ''),
  set: (v) => { props.desk.sev.value = v ? Number(v) : null },
})
const fromProxy = computed({
  get: () => props.desk.from.value,
  set: (v) => { props.desk.from.value = v || '' },
})
const toProxy = computed({
  get: () => props.desk.to.value,
  set: (v) => { props.desk.to.value = v || '' },
})

/* "/" focuses search (BEAM precedent) */
const qEl = ref(null)
const onSlash = (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  e.preventDefault()
  qEl.value?.focus()
}
onMounted(() => window.addEventListener('keydown', onSlash))
onBeforeUnmount(() => window.removeEventListener('keydown', onSlash))
</script>

<style scoped>
.tfd {
  border: 1px solid var(--tl-brd, var(--sd-border));
  background: color-mix(in srgb, var(--sd-surface) 88%, transparent);
  backdrop-filter: blur(10px);
  padding: 12px 16px 13px; display: flex; flex-direction: column; gap: 11px;
}
.tfd-row { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.tfd-lbl {
  font: 500 9px/1 var(--sd-mono, monospace); letter-spacing: .2em;
  color: var(--sd-text-dim); text-transform: uppercase; margin-right: 2px;
}
.tfd-spacer { flex: 1; }
.tfd-chip {
  font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .12em; text-transform: uppercase;
  color: var(--sd-text-secondary); border: 1px solid var(--sd-border-strong);
  background: transparent; padding: 6px 11px; display: inline-flex; align-items: center; gap: 7px;
  cursor: pointer; transition: all .15s;
}
.tfd-chip:hover {
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent);
  color: var(--tl-core, var(--sd-inc-core)); transform: translateY(-1px);
}
.tfd-chip.on {
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 10%, transparent);
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent);
  color: var(--tl-core, var(--sd-inc-core));
}
.tfd-chip:focus-visible, .tfd-flag:focus-visible, .tfd-live:focus-visible,
.tfd-seg button:focus-visible, .tfd-clear:focus-visible {
  outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px;
}
.tfd-cdot { width: 6px; height: 6px; border-radius: 50%; }
.tfd-sel { min-width: 108px; }
.tfd-date { min-width: 118px; }
.tfd-search {
  display: flex; align-items: center; gap: 8px; border: 1px solid var(--sd-border-strong);
  padding: 6px 11px; min-width: 210px; flex: 1; max-width: 330px; transition: border-color .15s;
}
.tfd-search:focus-within { border-color: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 55%, transparent); }
.tfd-search input {
  flex: 1; background: transparent; border: none; outline: none; color: var(--sd-text);
  font: 400 11px/1.2 var(--sd-mono, monospace); letter-spacing: .04em;
}
.tfd-search input::placeholder { color: var(--sd-text-dim); }
.tfd-sic { color: var(--sd-text-dim); flex: none; }
.tfd-kbd {
  font: 600 9px/1 var(--sd-mono, monospace); color: var(--sd-text-dim);
  border: 1px solid var(--sd-border-strong); border-radius: 4px; padding: 2px 5px;
}
.tfd-seg { display: inline-flex; border: 1px solid var(--sd-border-strong); }
.tfd-seg button {
  font: 500 9.5px/1 var(--sd-mono, monospace); letter-spacing: .14em; text-transform: uppercase;
  color: var(--sd-text-muted); padding: 6px 11px; border: 0; background: transparent;
  border-right: 1px solid var(--sd-border-strong); cursor: pointer; transition: all .15s;
}
.tfd-seg button:last-child { border-right: none; }
.tfd-seg button:hover { color: var(--tl-core, var(--sd-inc-core)); }
.tfd-seg button.on {
  background: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 10%, transparent);
  color: var(--tl-core, var(--sd-inc-core));
}
.tfd-flag {
  font: 500 9px/1 var(--sd-mono, monospace); letter-spacing: .14em; text-transform: uppercase;
  color: var(--sd-text-muted); border: 1px dashed var(--sd-border-strong); background: transparent;
  padding: 5px 8px; cursor: pointer; transition: all .15s;
}
.tfd-flag:hover { color: var(--tl-warn, var(--sd-amber)); border-color: var(--tl-warn, var(--sd-amber)); }
.tfd-flag.on {
  color: var(--tl-warn, var(--sd-amber)); border-color: var(--tl-warn, var(--sd-amber));
  border-style: solid; background: color-mix(in srgb, var(--tl-warn, var(--sd-amber)) 10%, transparent);
}
.tfd-live {
  display: inline-flex; align-items: center; gap: 8px;
  font: 500 10px/1 var(--sd-mono, monospace); letter-spacing: .16em; text-transform: uppercase;
  color: var(--sd-text-muted); border: 1px solid var(--sd-border-strong); background: transparent;
  padding: 6px 12px; cursor: pointer; transition: all .15s;
}
.tfd-ld { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-text-dim); }
.tfd-live:hover { color: var(--tl-live, var(--sd-success)); border-color: var(--tl-live, var(--sd-success)); }
.tfd-live.on {
  color: var(--tl-live, var(--sd-success)); border-color: var(--tl-live, var(--sd-success));
  background: color-mix(in srgb, var(--tl-live, var(--sd-success)) 9%, transparent);
}
.tfd-live.on .tfd-ld { background: var(--tl-live, var(--sd-success)); animation: tfd-blink 1.2s ease-in-out infinite; }
@keyframes tfd-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
.tfd-clear {
  font: 600 9.5px/1 var(--sd-mono, monospace); letter-spacing: .16em;
  color: var(--sd-pri-critical); border: 0; background: transparent; cursor: pointer; padding: 6px 4px;
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tfd-live.on .tfd-ld { animation: none; }
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .tfd { background: color-mix(in srgb, var(--sd-surface) 92%, transparent); }
</style>
