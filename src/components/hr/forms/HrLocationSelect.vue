<template>
  <div class="hr-loc-select">
    <!-- ── Managed mode: pick from the configured Work Locations directory ── -->
    <template v-if="!showCustom">
      <HrSelect
        :model-value="modelValue"
        :options="locOptions"
        :placeholder="locations.length ? 'Select a work location…' : 'No locations configured'"
        :disabled="disabled || !locations.length"
        @update:model-value="onPick"
      />

      <!-- Live timezone briefing for the chosen site -->
      <transition name="hrloc-reveal">
        <div v-if="tzInfo" class="hrloc-brief">
          <div class="brief-head">
            <span class="brief-pin"><MapPin :size="13" /></span>
            <span class="brief-place">{{ placeLine }}</span>
            <span class="brief-daynight" :class="{ day: tzInfo.daylight }">
              <component :is="tzInfo.daylight ? Sun : Moon" :size="12" />
            </span>
          </div>
          <p class="brief-body">
            Employees here follow
            <strong class="brief-tz">{{ tzInfo.tz }} ({{ tzInfo.offset }})</strong>
            — local time
            <strong class="brief-clock">{{ tzInfo.clock }}</strong><template v-if="tzInfo.weeklyOff">,
            weekly off <strong>{{ tzInfo.weeklyOff }}</strong></template>.
          </p>
        </div>
      </transition>

      <!-- Selected, but the site has no timezone set in Settings.
           Standalone v-if (not v-else-if): the tzInfo block above is wrapped in a
           <transition>, so it isn't an adjacent sibling to chain off. The two are
           mutually exclusive anyway — tzInfo requires a timezone, this requires none. -->
      <div v-if="selected && !selected.timezone" class="hrloc-nudge">
        <Clock :size="12" />
        <span>No timezone set for this location.
          <router-link class="hrloc-link" to="/admin/hr/settings/work-locations">Add one in Settings → Work Locations</router-link>
          so attendance &amp; shift views read correctly.</span>
      </div>

      <button type="button" class="hrloc-toggle" :disabled="disabled" @click="toCustom">
        <PencilLine :size="12" /> Can't find it? Enter a custom location
      </button>
    </template>

    <!-- ── Custom escape hatch: free text (unlisted / legacy / no master data) ── -->
    <template v-else>
      <HrInput :model-value="customText" placeholder="Type a location… (e.g. HQ — Mumbai)" :disabled="disabled" @update:model-value="onText" />
      <div v-if="!locations.length" class="hrloc-nudge">
        <Clock :size="12" />
        <span>No work locations configured yet.
          <router-link class="hrloc-link" to="/admin/hr/settings/work-locations">Create them in Settings → Work Locations</router-link>
          to enable timezone-aware selection.</span>
      </div>
      <button v-if="locations.length" type="button" class="hrloc-toggle" :disabled="disabled" @click="toManaged">
        <ListChecks :size="12" /> Pick from configured locations instead
      </button>
    </template>
  </div>
</template>

<script setup>
// Work-Location picker that connects the employee record to the managed
// HR Settings → Work Locations directory. Selecting a site stores its FK
// (work_location_id) and surfaces a LIVE timezone briefing so whoever adds /
// edits the employee knows which timezone that office runs in. A "custom
// location" escape hatch keeps free-text (work_location_text) available for
// unlisted or legacy values.
//
// The two underlying fields are mutually exclusive by design:
//   • managed pick → set work_location_id, clear work_location_text
//   • custom text  → set work_location_text, clear work_location_id
// Display elsewhere prefers text-then-FK-name, so clearing the text on a
// managed pick lets the live location name (renamable in Settings) win.
import { computed, ref, watch, onMounted } from 'vue'
import { MapPin, Clock, Sun, Moon, PencilLine, ListChecks } from 'lucide-vue-next'
import HrSelect from './HrSelect.vue'
import HrInput from './HrInput.vue'
import {
  useNow, tzLocal, tzOffsetMinutes, offsetLabel, isDaylight, isValidTz, weeklyOffSummary,
} from '@/views/hr/settings/composables/useLocationClock'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },   // work_location_id (FK)
  customText: { type: String, default: '' },                     // work_location_text
  locations: { type: Array, default: () => [] },                 // reference.locations (full WorkLocationResponse rows)
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'update:customText'])

const key = (v) => (v == null ? '' : String(v))

// Mode: managed (directory) vs custom (free text). Initialised from props,
// then kept honest as the parent prefills values programmatically.
const customMode = ref(false)
onMounted(() => { customMode.value = !props.modelValue && !!props.customText })
watch(() => props.modelValue, (v) => { if (v) customMode.value = false })
watch(() => props.customText, (v) => { if (v && !props.modelValue) customMode.value = true })

// Always fall through to the free-text box when there's no master data to pick
// from (so "no locations configured" still gives the user an input).
const showCustom = computed(() => customMode.value || !props.locations.length)

const locOptions = computed(() =>
  (props.locations || [])
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((l) => ({ value: l.id, label: l.code ? `${l.code} — ${l.name}` : l.name }))
)

const selected = computed(() =>
  (props.locations || []).find((l) => key(l.id) === key(props.modelValue)) || null
)

const now = useNow()
const tzInfo = computed(() => {
  const loc = selected.value
  if (!loc || !loc.timezone || !isValidTz(loc.timezone)) return null
  const local = tzLocal(loc.timezone, now.value)
  return {
    tz: loc.timezone,
    clock: local?.label || '—',
    offset: offsetLabel(tzOffsetMinutes(loc.timezone, now.value)),
    daylight: isDaylight(local?.hh),
    weeklyOff: weeklyOffSummary(loc.weekly_off_pattern),
  }
})

const placeLine = computed(() => {
  const l = selected.value
  if (!l) return ''
  const parts = [l.name, [l.city, l.country].filter(Boolean).join(', ')].filter(Boolean)
  return parts.join(' · ')
})

// Managed pick → FK wins, drop any stale custom text.
const onPick = (val) => {
  emit('update:modelValue', val ?? null)
  if (val) emit('update:customText', '')
}
const onText = (val) => emit('update:customText', val)

const toCustom = () => {
  customMode.value = true
  if (props.modelValue) emit('update:modelValue', null)
}
const toManaged = () => {
  customMode.value = false
  if (props.customText) emit('update:customText', '')
}
</script>

<style scoped>
.hr-loc-select { display: flex; flex-direction: column; gap: 10px; }

/* ── Timezone briefing card ── */
.hrloc-brief {
  border: 1px solid var(--hr-border);
  border-left: 2px solid var(--hr-accent-gold);
  border-radius: 10px;
  background: var(--hr-accent-gold-soft, rgba(251, 191, 36, 0.06));
  padding: 10px 12px;
}
.brief-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.brief-pin { color: var(--hr-accent-gold); display: inline-flex; }
.brief-place {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--hr-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brief-daynight {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px; height: 20px;
  border-radius: 50%;
  color: var(--hr-text-muted);
  background: rgba(120, 120, 140, 0.14);
}
.brief-daynight.day { color: var(--hr-accent-gold); background: rgba(251, 191, 36, 0.14); }
.brief-body {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--hr-text-secondary);
}
.brief-tz { color: var(--hr-text); }
.brief-clock { font-family: var(--hr-mono); color: var(--hr-accent-gold); }

/* ── Inline nudges ── */
.hrloc-nudge {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--hr-text-muted);
}
.hrloc-nudge svg { flex-shrink: 0; margin-top: 2px; }
.hrloc-link { color: var(--hr-accent-gold); text-decoration: none; font-weight: 600; }
.hrloc-link:hover { text-decoration: underline; }

/* ── Mode toggle ── */
.hrloc-toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: color 160ms var(--hr-spring);
}
.hrloc-toggle:hover:not(:disabled) { color: var(--hr-accent-gold); }
.hrloc-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

.hrloc-reveal-enter-active, .hrloc-reveal-leave-active {
  transition: opacity 220ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.hrloc-reveal-enter-from, .hrloc-reveal-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .hrloc-reveal-enter-active, .hrloc-reveal-leave-active { transition: none; }
}

/* ═════════════════════ LIGHT THEME OVERRIDES ═════════════════════ */
[data-theme="light"] .hrloc-brief {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(40, 25, 10, 0.10);
  border-left-color: #d97706;
}
[data-theme="light"] .brief-pin,
[data-theme="light"] .brief-daynight.day { color: #d97706; }
[data-theme="light"] .brief-place { color: #2a1c0c; }
[data-theme="light"] .brief-body { color: #6b5840; }
[data-theme="light"] .brief-tz { color: #2a1c0c; }
[data-theme="light"] .brief-clock { color: #b45309; }
[data-theme="light"] .hrloc-nudge { color: #6b5840; }
[data-theme="light"] .hrloc-link,
[data-theme="light"] .hrloc-toggle:hover:not(:disabled) { color: #b45309; }
[data-theme="light"] .hrloc-toggle { color: #6b5840; }
</style>
