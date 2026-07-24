<template>
  <div class="cfd">
    <div class="cfd-head">
      <h2>INDEX OF SUBJECTS</h2>
      <span class="cfd-rule" aria-hidden="true" />
      <span>STRIKE A SUBJECT TO NARROW THE RECORD</span>
    </div>

    <!-- per-category kind chips (server-validated CSV under the hood) -->
    <div class="cfd-grid">
      <div v-for="g in groups" :key="g.key" class="cfd-group">
        <div class="cfd-cap" :style="{ color: `var(${g.token})` }">
          <i :style="{ background: `var(${g.token})` }" aria-hidden="true" />{{ g.label.toUpperCase() }}
        </div>
        <div class="cfd-chips">
          <button v-for="k in g.kinds" :key="k.action" type="button" class="cfd-chip"
                  :class="{ off: isOff(k.action) }" @click="toggleKind(k.action)">
            {{ (k.verb || k.label).toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <!-- controls row -->
    <div class="cfd-controls">
      <span class="cfd-ctl">
        <label>SEV</label>
        <SdSelect v-model="sevProxy" :options="SEV_OPTS" class="cfd-sel" />
      </span>
      <span class="cfd-ctl">
        <label>TEAM</label>
        <SdSelect v-model="teamProxy" :options="teamOpts" class="cfd-sel wide" />
      </span>
      <span class="cfd-ctl">
        <label>WINDOW</label>
        <SdDatePicker v-model="fromProxy" class="cfd-date" placeholder="FROM" />
        <SdDatePicker v-model="toProxy" class="cfd-date" placeholder="TO" />
      </span>
      <span class="cfd-ctl grow">
        <label>SEARCH</label>
        <input v-model="desk.q.value" type="text" placeholder="subjects, ticket numbers…"
               aria-label="Search the record" />
      </span>
      <span class="cfd-seg" role="group" aria-label="Actor kind">
        <button v-for="a in ACTORS" :key="a.v" type="button"
                :class="{ on: desk.actorKind.value === a.v }"
                @click="desk.actorKind.value = a.v">{{ a.label }}</button>
      </span>
      <button v-for="x in EXPOSURES" :key="x.v" type="button" class="cfd-stamp"
              :class="{ on: desk.exposure.value === x.v }"
              @click="desk.exposure.value = desk.exposure.value === x.v ? '' : x.v">{{ x.label }}</button>
      <button type="button" class="cfd-toggle" :class="{ on: desk.miOnly.value }"
              @click="desk.miOnly.value = !desk.miOnly.value">
        <span class="tsw" aria-hidden="true" />MAJOR ONLY
      </button>
      <button type="button" class="cfd-toggle" :class="{ on: desk.stonesOnly.value }"
              @click="desk.stonesOnly.value = !desk.stonesOnly.value">
        <span class="tsw" aria-hidden="true" />MILESTONES
      </button>
      <button type="button" class="cfd-toggle live" :class="{ on: desk.live.value }"
              @click="desk.live.value = !desk.live.value">
        <span class="tsw" aria-hidden="true" />LIVE
      </button>
      <button v-if="desk.hasFilters.value" type="button" class="cfd-clear" @click="desk.clearFilters">
        ✕ CLEAR THE INDEX
      </button>
    </div>
  </div>
</template>

<script setup>
/*
  SdIncChronFilterDeck — the Annual Report's "Index of Subjects". Kind chips are
  INDIVIDUAL catalog actions grouped under their category cap; striking a chip
  narrows the record (empty selection = the whole index). Admin-only extras:
  the TEAM lens (whole-desk oversight) — no "my incidents" here.
*/
import { ref, computed, onMounted } from 'vue'
import SdSelect from './SdSelect.vue'
import SdDatePicker from './SdDatePicker.vue'
import { listTeams } from '@/composables/useSupportDesk'
import { CATEGORY_META, CATEGORY_ORDER } from '../composables/incidentTaxonomy'

const props = defineProps({
  desk: { type: Object, required: true },
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

/* the loudest kinds per category keep the index scannable (full catalog stays
   reachable through deep links — the chips are curation, not the seal) */
const PER_CAT = 6
const groups = computed(() => CATEGORY_ORDER.filter((c) => c !== 'system').map((c) => ({
  key: c,
  label: CATEGORY_META[c].label,
  token: CATEGORY_META[c].token,
  kinds: Object.entries(props.desk.catalog.value || {})
    .filter(([, m]) => m.category === c)
    .slice(0, PER_CAT)
    .map(([action, m]) => ({ action, verb: m.verb, label: m.label })),
})).filter((g) => g.kinds.length))

const isOff = (action) =>
  props.desk.kinds.value.length > 0 && !props.desk.kinds.value.includes(action)
const toggleKind = (action) => {
  const cur = props.desk.kinds.value
  props.desk.kinds.value = cur.includes(action)
    ? cur.filter((k) => k !== action) : [...cur, action]
}

/* admin team lens */
const teams = ref([])
onMounted(async () => {
  try {
    const res = await listTeams()
    teams.value = res?.items || res || []
  } catch { /* lens stays empty — superuser-only surface anyway */ }
})
const teamOpts = computed(() => [{ value: '', label: 'ALL TEAMS' },
  ...teams.value.map((t) => ({ value: String(t.id), label: (t.name || '').toUpperCase() }))])

const sevProxy = computed({
  get: () => (props.desk.sev.value ? String(props.desk.sev.value) : ''),
  set: (v) => { props.desk.sev.value = v ? Number(v) : null },
})
const teamProxy = computed({
  get: () => props.desk.teamId.value,
  set: (v) => { props.desk.teamId.value = v || '' },
})
const fromProxy = computed({
  get: () => props.desk.from.value,
  set: (v) => { props.desk.from.value = v || '' },
})
const toProxy = computed({
  get: () => props.desk.to.value,
  set: (v) => { props.desk.to.value = v || '' },
})
</script>

<style scoped>
.cfd { border-top: 1px solid var(--sd-border-strong); padding: 22px 0 24px; }
.cfd-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
.cfd-head h2 { margin: 0; font-size: 11px; letter-spacing: .32em; font-weight: 800; color: var(--sd-text); }
.cfd-rule { flex: 1; height: 1px; background: var(--tl-brd, var(--sd-border)); }
.cfd-head span { font-size: 9.5px; letter-spacing: .2em; color: var(--sd-text-dim); }
.cfd-grid { display: flex; flex-wrap: wrap; gap: 26px 36px; }
.cfd-group { min-width: 120px; }
.cfd-cap {
  display: flex; align-items: center; gap: 7px; margin-bottom: 9px;
  font-size: 9px; letter-spacing: .3em; font-weight: 800;
}
.cfd-cap i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.cfd-chips { display: flex; flex-wrap: wrap; gap: 6px; max-width: 290px; }
.cfd-chip {
  font-size: 9.5px; letter-spacing: .14em; font-weight: 600; padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--sd-border-strong);
  background: color-mix(in srgb, var(--sd-surface) 80%, transparent); color: var(--sd-text-secondary);
  cursor: pointer;
  transition: transform .22s cubic-bezier(.16, 1, .3, 1), border-color .22s, color .22s, opacity .22s;
}
.cfd-chip:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 55%, transparent);
  color: var(--tl-core, var(--sd-fun-core));
}
.cfd-chip.off { opacity: .32; text-decoration: line-through; }
.cfd-chip:focus-visible, .cfd-stamp:focus-visible, .cfd-toggle:focus-visible,
.cfd-seg button:focus-visible, .cfd-clear:focus-visible {
  outline: 2px solid var(--tl-core, var(--sd-fun-core)); outline-offset: 2px;
}
.cfd-controls { display: flex; flex-wrap: wrap; gap: 12px 14px; margin-top: 22px; align-items: center; }
.cfd-ctl {
  display: flex; align-items: center; gap: 8px; border: 1px solid var(--sd-border-strong);
  border-radius: 8px; padding: 6px 12px;
  background: color-mix(in srgb, var(--sd-surface) 80%, transparent);
}
.cfd-ctl.grow { flex: 1; min-width: 220px; }
.cfd-ctl label { font-size: 9px; letter-spacing: .24em; color: var(--sd-text-dim); font-weight: 800; }
.cfd-ctl input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 11px; letter-spacing: .06em; color: var(--sd-text); min-width: 150px;
}
.cfd-ctl input::placeholder { color: var(--sd-text-dim); font-style: italic; }
.cfd-sel { min-width: 104px; }
.cfd-sel.wide { min-width: 150px; }
.cfd-date { min-width: 116px; }
.cfd-seg { display: flex; border: 1px solid var(--sd-border-strong); border-radius: 8px; overflow: hidden; }
.cfd-seg button {
  font-size: 9.5px; letter-spacing: .18em; font-weight: 700; padding: 9px 13px;
  color: var(--sd-text-dim); background: transparent; border: 0; cursor: pointer;
  transition: color .2s, background .2s;
}
.cfd-seg button + button { border-left: 1px solid var(--tl-brd, var(--sd-border)); }
.cfd-seg button:hover { color: var(--sd-text); }
.cfd-seg button.on {
  background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 10%, transparent);
  color: var(--tl-core, var(--sd-fun-core));
}
.cfd-stamp {
  font-size: 9px; letter-spacing: .2em; font-weight: 800; padding: 8px 10px;
  border: 1px solid var(--sd-border-strong); border-radius: 4px; color: var(--sd-text-dim);
  background: transparent; cursor: pointer; transition: all .22s;
}
.cfd-stamp:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 55%, transparent);
  color: var(--tl-core, var(--sd-fun-core));
}
.cfd-stamp.on {
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 55%, transparent);
  color: var(--tl-core, var(--sd-fun-core));
  background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 9%, transparent);
}
.cfd-toggle {
  display: flex; align-items: center; gap: 9px;
  font-size: 9.5px; letter-spacing: .2em; font-weight: 800; color: var(--sd-text-muted);
  padding: 8px 4px; background: transparent; border: 0; cursor: pointer; transition: color .2s;
}
.cfd-toggle:hover { color: var(--sd-text); }
.cfd-toggle .tsw {
  width: 30px; height: 16px; border-radius: 999px; border: 1px solid var(--sd-border-strong);
  position: relative; transition: background .25s, border-color .25s;
}
.cfd-toggle .tsw::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%;
  background: var(--sd-text-dim); transition: transform .25s cubic-bezier(.16, 1, .3, 1), background .25s;
}
.cfd-toggle.on { color: var(--tl-core, var(--sd-fun-core)); }
.cfd-toggle.on .tsw {
  background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 10%, transparent);
  border-color: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 55%, transparent);
}
.cfd-toggle.on .tsw::after { transform: translateX(13px); background: var(--tl-core, var(--sd-fun-core)); }
.cfd-toggle.live.on { color: var(--tl-live, var(--sd-success)); }
.cfd-toggle.live.on .tsw { border-color: var(--tl-live, var(--sd-success)); background: color-mix(in srgb, var(--tl-live, var(--sd-success)) 10%, transparent); }
.cfd-toggle.live.on .tsw::after { background: var(--tl-live, var(--sd-success)); }
.cfd-clear {
  font-size: 9.5px; letter-spacing: .2em; font-weight: 800; color: var(--sd-pri-critical);
  border: 0; background: transparent; cursor: pointer; padding: 8px 4px;
}
/* ═════════ LIGHT THEME OVERRIDES ═════════ */
[data-theme="light"] .cfd-chip, [data-theme="light"] .cfd-ctl {
  background: color-mix(in srgb, var(--sd-surface) 94%, transparent);
}
</style>
