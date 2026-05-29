<template>
  <section class="att-hol">
    <!-- ═══════════════ HEADER ═══════════════ -->
    <Motion as="header" class="hol-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="hol-banner-atmos" aria-hidden="true">
        <span class="hba hba-a" />
        <span class="hba hba-b" />
      </div>
      <div class="hol-banner-text">
        <span class="hol-eyebrow"><span class="hol-eyebrow-dot" />Holiday calendar</span>
        <h2 class="hol-title">
          <span>{{ year }}</span>
          <span class="hol-title-sep">·</span>
          <span class="hol-title-country">{{ countryLabel }}</span>
        </h2>
        <p class="hol-sub">National / company / regional / restricted. The daily rollup uses this list — punches on a holiday still log, the status flips.</p>
      </div>
      <div class="hol-banner-controls">
        <div class="hol-select-pair">
          <select v-model="year" @change="reload" class="hol-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model="importCountry" class="hol-select" title="Country for the public-holiday import">
            <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.label }}</option>
          </select>
        </div>
        <div class="hol-action-pair">
          <Motion as="button" type="button" class="hol-btn-ghost" :disabled="importing"
            :whileHover="reduced ? {} : { y: -1, scale: 1.02 }"
            :whileTap="reduced ? {} : { scale: 0.96 }"
            @click="importHolidays"
          >
            <Loader2 v-if="importing" :size="13" class="spin" />
            <Download v-else :size="13" />
            {{ importing ? 'Importing…' : `Import ${year}` }}
          </Motion>
          <Motion as="button" type="button" class="hol-btn-primary"
            :whileHover="reduced ? {} : { y: -1, scale: 1.02 }"
            :whileTap="reduced ? {} : { scale: 0.96 }"
            @click="openCreate()"
          >
            <Plus :size="13" /> New holiday
          </Motion>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════ KPI STRIP ═══════════════ -->
    <div class="hol-kpis">
      <Motion v-for="(k, i) in kpis" :key="k.key" as="article"
        :class="['hol-kpi', `tone-${k.tone}`, { active: filterType === k.key }]"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="reduced ? {} : { y: -2 }"
        @click="filterType = (filterType === k.key ? '' : k.key)"
      >
        <span class="hk-icon"><component :is="k.icon" :size="14" /></span>
        <div class="hk-body">
          <span class="hk-value onb-mono">{{ k.value }}</span>
          <span class="hk-label">{{ k.label }}</span>
        </div>
        <span v-if="k.foot" class="hk-foot">{{ k.foot }}</span>
      </Motion>
    </div>

    <!-- ═══════════════ TWO-COLUMN MAIN: CALENDAR + LIST ═══════════════ -->
    <div class="hol-deck">
      <!-- LEFT: 12-month mini calendars -->
      <Motion as="div" class="hol-calendar"
        :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="hc-head">
          <span class="hc-eyebrow"><CalendarDays :size="11" />{{ totalCount }} holidays · click a day to inspect</span>
        </header>
        <div class="hc-grid">
          <div v-for="m in 12" :key="m" class="hc-month">
            <div class="hc-month-label">{{ monthLabel(m - 1) }}</div>
            <div class="hc-month-grid">
              <span v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="hc-dow">{{ d }}</span>
              <span v-for="b in monthBlanks(m - 1)" :key="`bl-${m}-${b}`" class="hc-cell is-blank" />
              <button v-for="d in monthDays(m - 1)" :key="`${m}-${d}`" type="button"
                :class="[
                  'hc-cell',
                  {
                    'is-today': isToday(m - 1, d),
                    'is-holiday': !!holidaysByDate[isoOf(m - 1, d)],
                    'is-selected': selectedDate === isoOf(m - 1, d),
                    'is-draft': holidaysByDate[isoOf(m - 1, d)] && !holidaysByDate[isoOf(m - 1, d)].is_active,
                  }
                ]"
                :data-type="holidaysByDate[isoOf(m - 1, d)]?.holiday_type"
                :title="holidayCellTitle(isoOf(m - 1, d))"
                @click="onCellClick(m - 1, d)"
              >
                <span>{{ d }}</span>
                <span v-if="holidaysByDate[isoOf(m - 1, d)]" class="hc-dot" />
              </button>
            </div>
          </div>
        </div>
        <div class="hc-legend">
          <span class="hc-leg"><span class="hc-leg-dot dot-NATIONAL" />National</span>
          <span class="hc-leg"><span class="hc-leg-dot dot-COMPANY" />Company</span>
          <span class="hc-leg"><span class="hc-leg-dot dot-REGIONAL" />Regional</span>
          <span class="hc-leg"><span class="hc-leg-dot dot-RESTRICTED" />Restricted</span>
        </div>
      </Motion>

      <!-- RIGHT: filtered holiday rail -->
      <Motion as="div" class="hol-rail"
        :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="hr-head">
          <span class="hr-title">
            <ListOrdered :size="13" />
            {{ filterType ? `${filterType.toLowerCase()} holidays` : 'Upcoming + past' }}
          </span>
          <span class="hr-meta">{{ filteredRows.length }} of {{ totalCount }}</span>
        </header>

        <div v-if="!filteredRows.length" class="hr-empty">
          <PartyPopper :size="18" />
          <p>{{ filterType ? `No ${filterType.toLowerCase()} holidays in ${year}` : `No holidays defined for ${year}` }}</p>
          <button class="hol-btn-primary sm" @click="openCreate()"><Plus :size="12" /> Add one</button>
        </div>

        <div v-else class="hr-list">
          <Motion v-for="(h, i) in filteredRows" :key="h.id"
            :id="`holiday-${h.id}`"
            as="article"
            :class="['hr-item', {
              'is-selected': selectedHolidayId === h.id,
              'is-past': isPast(h.date),
              'is-draft': !h.is_active,
            }]"
            :data-type="h.holiday_type"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.28, delay: 0.02 * i, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="reduced ? {} : { x: 3 }"
            @click="onRailItemClick(h)"
          >
            <div class="hri-date">
              <span class="hri-day">{{ formatDay(h.date) }}</span>
              <span class="hri-month">{{ formatMonth(h.date) }}</span>
            </div>
            <div class="hri-body">
              <div class="hri-row">
                <span class="hri-type" :data-type="h.holiday_type">
                  <span class="hri-type-dot" />{{ h.holiday_type }}
                </span>
                <span v-if="!h.is_active" class="hri-draft-pill" title="Awaiting admin activation — does not affect payroll yet">
                  <Hourglass :size="9" /> DRAFT
                </span>
                <span class="hri-weekday">{{ formatWeekday(h.date) }}</span>
              </div>
              <h3 class="hri-name">{{ h.name }}</h3>
              <p v-if="h.description && h.description !== h.name" class="hri-desc">{{ h.description }}</p>
              <span v-if="h.location_id" class="hri-loc">
                <MapPin :size="9" />{{ locationMap[h.location_id] || 'Scoped location' }}
              </span>
            </div>
            <button v-if="!h.is_active" type="button" class="hri-activate" title="Activate (apply to attendance, leave & payroll)" @click.stop="quickActivate(h)">
              <ShieldCheck :size="12" />
            </button>
            <button type="button" class="hri-del" title="Delete" @click.stop="openDelete(h)">
              <Trash2 :size="12" />
            </button>
          </Motion>
        </div>

        <footer v-if="rows.length" class="hr-foot">
          <Motion v-if="draftCount > 0" as="button" type="button" class="hr-apply"
            :whileHover="reduced ? {} : { y: -1 }"
            :whileTap="reduced ? {} : { scale: 0.96 }"
            :disabled="bulkActivating"
            @click="confirmBulkActivate"
          >
            <Loader2 v-if="bulkActivating" :size="12" class="spin" />
            <ShieldCheck v-else :size="12" />
            {{ bulkActivating ? 'Activating…' : `Apply all ${draftCount} draft${draftCount === 1 ? '' : 's'}` }}
          </Motion>
          <Motion as="button" type="button" class="hr-bulk"
            :whileHover="reduced ? {} : { y: -1 }"
            :whileTap="reduced ? {} : { scale: 0.96 }"
            @click="bulkOpen = true"
          >
            <Trash2 :size="12" /> Delete {{ filterType ? `all ${filterType.toLowerCase()}` : 'all' }} ({{ filteredRows.length }})
          </Motion>
        </footer>
      </Motion>
    </div>

    <!-- ═══════════════ MODALS ═══════════════ -->
    <AttDeleteModal
      :open="!!deleteTarget"
      title="Delete holiday?"
      subtitle="The rollup will replay punches for this date as a normal working day."
      :target-label="deleteTarget?.name || ''"
      :target-meta="deleteTarget ? `${formatDay(deleteTarget.date)} ${formatMonth(deleteTarget.date)} · ${formatWeekday(deleteTarget.date)}` : ''"
      :target-tag="deleteTarget?.holiday_type || ''"
      :target-icon="PartyPopper"
      :submitting="deleting"
      confirm-label="Delete holiday"
      warning="Past attendance on this date is preserved but historical status pills will recompute on next rollup."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />

    <AttDeleteModal
      :open="bulkOpen"
      :title="filterType ? `Delete all ${filterType.toLowerCase()} holidays in ${year}?` : `Delete all holidays in ${year}?`"
      :subtitle="`This soft-deletes ${filteredRows.length} row${filteredRows.length === 1 ? '' : 's'}. The rollup will replay those dates as normal working days.`"
      :target-label="`${filteredRows.length} holiday${filteredRows.length === 1 ? '' : 's'}`"
      :target-meta="filterType ? `${year} · ${filterType}` : `${year} · all types`"
      :target-tag="'BULK'"
      :target-icon="Trash2"
      :submitting="bulkDeleting"
      confirm-label="Delete all"
      warning="Past attendance is preserved but status pills recompute on next rollup. Re-import or add new rows anytime."
      @close="bulkOpen = false"
      @confirm="confirmBulkDelete"
    />

    <!-- ═══════════════ Unified Holiday modal — Create / Edit / Activate ═══════════════ -->
    <OnbModal
      :open="modalOpen"
      :title="modalTitle"
      :subtitle="modalSubtitle"
      :icon="PartyPopper"
      :width="600"
      @close="closeModal"
    >
      <div class="form-stack">
        <!-- Draft banner — only shown when reviewing a draft -->
        <Motion v-if="editing && !form.is_active" class="hol-draft-banner"
          :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="hdb-icon"><Hourglass :size="13" /></span>
          <div class="hdb-text">
            <strong>Pending review</strong>
            <span>This holiday is a draft — it won't affect attendance, leave or payroll until you activate it.</span>
          </div>
        </Motion>

        <OnbField v-model="form.name" label="Name" placeholder="e.g. Independence Day" required />

        <!-- Date stays as its own field, full width so it doesn't get cramped. -->
        <OnbField v-model="form.date" type="date" label="Date" required />

        <!-- Type — segmented picker with 4 cards. Replaces the easy-to-miss
             dropdown so admins immediately see they can choose Company /
             Regional / Restricted. Each card explains what it means. -->
        <div class="hol-type-picker">
          <span class="hol-field-label">Type <em>*</em></span>
          <div class="htp-grid">
            <Motion v-for="t in TYPE_META" :key="t.value" as="button" type="button"
              :class="['htp-card', `tone-${t.tone}`, { active: form.holiday_type === t.value }]"
              :whileHover="reduced ? {} : { y: -2 }"
              :whileTap="reduced ? {} : { scale: 0.96 }"
              :transition="{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }"
              @click="form.holiday_type = t.value"
            >
              <span class="htp-icon"><component :is="t.icon" :size="14" /></span>
              <div class="htp-text">
                <span class="htp-title">{{ t.label }}</span>
                <span class="htp-desc">{{ t.desc }}</span>
              </div>
              <span v-if="form.holiday_type === t.value" class="htp-check"><Check :size="11" /></span>
            </Motion>
          </div>
        </div>

        <!-- Location — required when REGIONAL is chosen, optional otherwise.
             Lets admin scope a holiday to one work location (e.g. Onam only
             for Kerala branch). Leave blank for a global holiday. -->
        <OnbField
          v-model="form.location_id"
          type="select"
          :label="form.holiday_type === 'REGIONAL' ? 'Apply to location' : 'Apply to location (optional)'"
          :options="locationOptions"
          :required="form.holiday_type === 'REGIONAL'"
          :hint="form.holiday_type === 'REGIONAL'
            ? 'Required for regional holidays — only employees at this location get the day off.'
            : 'Leave as “All locations” to make this holiday apply company-wide.'"
        />

        <OnbField v-model="form.description" type="textarea" label="Description"
          placeholder="Optional — any extra context for this holiday." />
      </div>
      <template #footer>
        <button v-if="editing" class="hol-btn-danger sm" @click="openDeleteFromModal" type="button">
          <Trash2 :size="12" /> Delete
        </button>
        <span class="modal-foot-spacer" />
        <button class="onb-btn-ghost" @click="closeModal" type="button">Cancel</button>
        <!-- Three submit modes:
             - Draft → "Activate holiday" (saves edits + flips is_active=true)
             - Active edit → "Save changes" (patch)
             - New → "Add holiday" (create) -->
        <button v-if="editing && !form.is_active" class="onb-btn-primary"
          :disabled="!valid || submitting" @click="doActivate"
        >
          <ShieldCheck :size="13" /> {{ submitting ? 'Activating…' : 'Activate holiday' }}
        </button>
        <button v-else-if="editing" class="onb-btn-primary"
          :disabled="!valid || submitting" @click="doUpdate"
        >
          <Check :size="13" /> {{ submitting ? 'Saving…' : 'Save changes' }}
        </button>
        <button v-else class="onb-btn-primary"
          :disabled="!valid || submitting" @click="doCreate"
        >
          <Plus :size="13" /> {{ submitting ? 'Adding…' : 'Add holiday' }}
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { usePreferredReducedMotion } from '@vueuse/core'
import {
  Plus, PartyPopper, Trash2, Download, Loader2, CalendarDays,
  ListOrdered, Sparkles, Building2, MapPin, Flag, ShieldCheck, Check, Hourglass,
} from 'lucide-vue-next'
import axios from 'axios'
import { API } from '@/utils/api'
import {
  fetchHolidays, createHoliday, deleteHoliday, bulkDeleteHolidays,
  updateHoliday, activateHoliday, bulkActivateHolidays,
} from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])
const toast = useToast()
const prefersReduced = usePreferredReducedMotion()
const reduced = computed(() => prefersReduced.value === 'reduce')

const TYPES = ['NATIONAL', 'COMPANY', 'REGIONAL', 'RESTRICTED']
// Metadata for the segmented type picker — each card explains what the type
// actually does so admins know which one to pick.
const TYPE_META = [
  {
    value: 'NATIONAL',
    label: 'National',
    desc: 'Public / gazette holiday — applies to everyone, no work.',
    icon: Flag,
    tone: 'gold',
  },
  {
    value: 'COMPANY',
    label: 'Company',
    desc: 'Company-declared off-day (e.g. Founder\'s Day) — applies to everyone.',
    icon: Building2,
    tone: 'teal',
  },
  {
    value: 'REGIONAL',
    label: 'Regional',
    desc: 'Only one work location gets the day off — pick the location below.',
    icon: MapPin,
    tone: 'orange',
  },
  {
    value: 'RESTRICTED',
    label: 'Restricted',
    desc: 'Optional / floating holiday — does NOT auto-apply; employees claim from a pool.',
    icon: Sparkles,
    tone: 'purple',
  },
]
const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'UAE' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'SG', label: 'Singapore' },
]
const importCountry = ref('IN')
const importing = ref(false)
const year = ref(new Date().getFullYear())
const years = computed(() => {
  const y = new Date().getFullYear()
  return [y - 2, y - 1, y, y + 1, y + 2]
})
const countryLabel = computed(() => COUNTRIES.find(c => c.code === importCountry.value)?.label || importCountry.value)

const rows = ref([])
const filterType = ref('')
const selectedDate = ref('')
const selectedHolidayId = ref('')

// Unified holiday modal state — used for create, edit, and activate flows.
// `editing.id` set → edit/activate; null → create.
const modalOpen = ref(false)
const editing = ref(null)        // null | { id, ...holiday }
const submitting = ref(false)
const form = reactive({
  name: '', date: '', holiday_type: 'COMPANY', description: '', is_active: true, location_id: '',
})
const valid = computed(() => !!(form.name && form.date))

// ── Work locations (for REGIONAL holiday scoping) ──────────────────────
const locations = ref([])
const locationOptions = computed(() => {
  const opts = [{ value: '', label: '— All locations (global) —' }]
  for (const loc of locations.value) {
    opts.push({ value: loc.id, label: loc.name + (loc.code ? ` · ${loc.code}` : '') })
  }
  return opts
})
const locationMap = computed(() => {
  const m = {}
  for (const loc of locations.value) m[loc.id] = loc.name
  return m
})
const loadLocations = async () => {
  try {
    const { data } = await axios.get(`${API}/hr/locations/`, { headers: authHeader() })
    locations.value = Array.isArray(data) ? data : (data?.items || [])
  } catch (e) {
    // Non-fatal — the modal still works without locations, the dropdown just
    // shows only "All locations".
    console.warn('Could not load work locations', e)
  }
}
onMounted(loadLocations)
const modalTitle = computed(() => {
  if (!editing.value) return 'New holiday'
  return form.is_active ? 'Edit holiday' : 'Review draft holiday'
})
const modalSubtitle = computed(() => {
  if (!editing.value) return 'National, regional, company or restricted — the daily rollup uses this list to flag the day.'
  if (!form.is_active) return 'Imported from public calendar — review and activate to apply it to attendance, leave and payroll.'
  return 'Editing an active holiday. Changes apply immediately to attendance, leave and payroll.'
})

const openCreate = (presetDate = '') => {
  editing.value = null
  Object.assign(form, {
    name: '', date: presetDate || '', holiday_type: 'COMPANY', description: '', is_active: true,
  })
  modalOpen.value = true
}
const openEdit = (h) => {
  editing.value = { ...h }
  Object.assign(form, {
    name: h.name || '',
    date: String(h.date || '').slice(0, 10),
    holiday_type: h.holiday_type || 'COMPANY',
    description: h.description || '',
    is_active: !!h.is_active,
    location_id: h.location_id || '',
  })
  modalOpen.value = true
}
const closeModal = () => {
  if (submitting.value) return
  modalOpen.value = false
  editing.value = null
}

// ── Data loaders ────────────────────────────────────────────────────────
const reload = async () => {
  try {
    const data = await fetchHolidays({ year: year.value, limit: 200 })
    rows.value = data.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load holidays') }
}
onMounted(reload)

// ── KPIs ───────────────────────────────────────────────────────────────
const totalCount = computed(() => rows.value.length)
const draftCount = computed(() => rows.value.filter(r => !r.is_active).length)
const activeCount = computed(() => rows.value.filter(r => r.is_active).length)

const kpis = computed(() => {
  const by = (t) => rows.value.filter(r => r.holiday_type === t).length
  const tiles = [
    { key: '',           label: 'Total',      value: totalCount.value, icon: CalendarDays, tone: 'teal',   foot: `${activeCount.value} active · ${draftCount.value} draft` },
  ]
  if (draftCount.value > 0) {
    tiles.push({ key: '__draft__', label: 'Drafts', value: draftCount.value, icon: Hourglass, tone: 'amber', foot: 'pending review' })
  }
  tiles.push(
    { key: 'NATIONAL',   label: 'National',   value: by('NATIONAL'),   icon: Flag,         tone: 'gold' },
    { key: 'COMPANY',    label: 'Company',    value: by('COMPANY'),    icon: Building2,    tone: 'teal' },
    { key: 'REGIONAL',   label: 'Regional',   value: by('REGIONAL'),   icon: MapPin,       tone: 'orange' },
    { key: 'RESTRICTED', label: 'Restricted', value: by('RESTRICTED'), icon: Sparkles,     tone: 'purple' },
  )
  return tiles
})

// ── Filter + selection ─────────────────────────────────────────────────
const filteredRows = computed(() => {
  const sorted = [...rows.value].sort((a, b) => a.date.localeCompare(b.date))
  if (!filterType.value) return sorted
  if (filterType.value === '__draft__') return sorted.filter(r => !r.is_active)
  return sorted.filter(r => r.holiday_type === filterType.value)
})

// Map iso-date → holiday row for fast calendar lookups.
const holidaysByDate = computed(() => {
  const out = {}
  for (const r of rows.value) {
    const k = String(r.date).slice(0, 10)
    // Multiple holidays on the same day — keep the higher-priority type.
    const cur = out[k]
    if (!cur) out[k] = r
    else if (typeRank(r.holiday_type) > typeRank(cur.holiday_type)) out[k] = r
  }
  return out
})
const typeRank = (t) => ({ NATIONAL: 4, COMPANY: 3, REGIONAL: 2, RESTRICTED: 1 }[t] || 0)

// ── Calendar helpers ───────────────────────────────────────────────────
const monthLabel = (m) => new Date(year.value, m, 1).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
const monthDays = (m) => {
  const n = new Date(year.value, m + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => i + 1)
}
const monthBlanks = (m) => {
  const first = new Date(year.value, m, 1).getDay()
  return Array.from({ length: first }, (_, i) => i)
}
const isoOf = (m, d) => {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${year.value}-${mm}-${dd}`
}
const isToday = (m, d) => {
  const t = new Date()
  return t.getFullYear() === year.value && t.getMonth() === m && t.getDate() === d
}
const isPast = (iso) => {
  const t = new Date()
  const d = new Date(iso)
  return d < new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

const onCellClick = (m, d) => {
  const iso = isoOf(m, d)
  const h = holidaysByDate.value[iso]
  if (h) {
    selectedDate.value = iso
    selectHoliday(h)
    // Open the unified modal pre-filled with this holiday's data. Click
    // again on the same day still re-opens it — useful for quick activate.
    openEdit(h)
  } else {
    // Empty day clicked — open the create modal pre-filled with that date.
    openCreate(iso)
  }
}
const selectHoliday = (h) => {
  selectedHolidayId.value = h.id
  selectedDate.value = String(h.date).slice(0, 10)
  // Scroll the matching list row into view smoothly.
  nextTick(() => {
    const el = document.getElementById(`holiday-${h.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
const onRailItemClick = (h) => {
  selectHoliday(h)
  openEdit(h)
}

// ── Date formatting ────────────────────────────────────────────────────
const formatDay = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : ''
const formatMonth = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : ''
const formatWeekday = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'long' }) : ''

// ── CRUD ───────────────────────────────────────────────────────────────
const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const importHolidays = async () => {
  if (importing.value) return
  importing.value = true
  try {
    const { data } = await axios.post(`${API}/hr/holidays/import`, null, {
      headers: authHeader(),
      params: { year: year.value, country: importCountry.value },
    })
    const imported = data?.imported ?? 0
    const skipped = data?.skipped ?? 0
    if (imported === 0 && skipped > 0) {
      toast.info(`All ${skipped} ${importCountry.value} holidays for ${year.value} already imported`)
    } else {
      toast.success(
        `Imported ${imported} draft holiday${imported === 1 ? '' : 's'} for ${importCountry.value} ${year.value}` +
        (skipped ? ` · ${skipped} skipped` : '') +
        ` · click each to review & activate, or "Apply all" to bulk approve`
      )
    }
    reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Holiday import failed')
  } finally { importing.value = false }
}

const _formPayload = () => ({
  name: form.name,
  date: form.date,
  holiday_type: form.holiday_type,
  description: form.description || null,
  is_active: !!form.is_active,
  // location_id="" sends an empty string which the backend would reject — so
  // coerce to null. A REGIONAL holiday without a location is also blocked
  // below in _guardValid().
  location_id: form.location_id || null,
})

// Hard validation that fires before any submit. Open to extension — for now
// just enforces REGIONAL→location pairing because that's the most common
// foot-gun.
const _guardValid = () => {
  if (form.holiday_type === 'REGIONAL' && !form.location_id) {
    toast.warning('Pick a work location for this regional holiday — it only applies to one location.')
    return false
  }
  return true
}

const doCreate = async () => {
  if (!valid.value || submitting.value) return
  if (!_guardValid()) return
  submitting.value = true
  try {
    await createHoliday(_formPayload())
    toast.success(`Holiday "${form.name}" added`)
    modalOpen.value = false
    editing.value = null
    Object.assign(form, { name: '', date: '', holiday_type: 'COMPANY', description: '', is_active: true })
    reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not create holiday')
  } finally { submitting.value = false }
}

const doUpdate = async () => {
  if (!editing.value || !valid.value || submitting.value) return
  if (!_guardValid()) return
  submitting.value = true
  try {
    await updateHoliday(editing.value.id, _formPayload())
    toast.success(`Holiday "${form.name}" updated`)
    modalOpen.value = false
    editing.value = null
    reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update holiday')
  } finally { submitting.value = false }
}

// Activate = save any edits + flip is_active to true. The backend's
// activate endpoint only flips the flag, so if the admin tweaked any
// field we send a PATCH with is_active=true in the same shot.
const doActivate = async () => {
  if (!editing.value || !valid.value || submitting.value) return
  if (!_guardValid()) return
  submitting.value = true
  try {
    const editId = editing.value.id
    await updateHoliday(editId, { ..._formPayload(), is_active: true })
    // Optimistic local flip — keyed v-for + motion-v can reuse a row's DOM
    // and skip updating its is-draft styling when the reloaded array swaps
    // in a freshly-deserialized object. Mutating the existing reactive row
    // forces the row's pill, draft chip, and quick-activate button to vanish
    // immediately regardless of how the reload returns.
    const row = rows.value.find(r => r.id === editId)
    if (row) row.is_active = true
    toast.success(`"${form.name}" activated — now affects attendance, leave & payroll`)
    modalOpen.value = false
    editing.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not activate holiday')
  } finally { submitting.value = false }
}

const openDeleteFromModal = () => {
  if (!editing.value) return
  const target = { ...editing.value }
  modalOpen.value = false
  // small timeout so the OnbModal closes before the delete modal opens
  // (avoids two stacked Teleports fighting for focus).
  setTimeout(() => { deleteTarget.value = target; editing.value = null }, 100)
}

const deleteTarget = ref(null)
const deleting = ref(false)
const openDelete = (h) => { deleteTarget.value = h }
const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteHoliday(deleteTarget.value.id, '')
    toast.success(`Holiday "${deleteTarget.value.name}" removed`)
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove holiday')
  } finally { deleting.value = false }
}

// Bulk delete — filter-aware (deletes all when no type filter is set).
const bulkOpen = ref(false)
const bulkDeleting = ref(false)
const confirmBulkDelete = async () => {
  bulkDeleting.value = true
  try {
    // The pseudo-filter "__draft__" isn't a real holiday_type — send no
    // type filter and let the per-row mass delete handle the subset.
    const realType = filterType.value && filterType.value !== '__draft__' ? filterType.value : undefined
    const data = await bulkDeleteHolidays({
      year: year.value,
      holiday_type: realType,
    })
    toast.success(`${data.deleted} holiday${data.deleted === 1 ? '' : 's'} removed`)
    bulkOpen.value = false
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Bulk delete failed')
  } finally { bulkDeleting.value = false }
}

// Bulk-activate all drafts for the current year (filter-aware on type).
const bulkActivating = ref(false)
const confirmBulkActivate = async () => {
  if (bulkActivating.value) return
  bulkActivating.value = true
  try {
    const realType = filterType.value && filterType.value !== '__draft__' ? filterType.value : undefined
    const data = await bulkActivateHolidays({
      year: year.value,
      holiday_type: realType,
    })
    if (data.activated === 0) {
      toast.info('No draft holidays to activate.')
    } else {
      // Optimistic local flip — see doActivate for why. Apply to every row
      // matching the same filter we just sent to the backend so the rail
      // and KPI tiles update before the reload returns.
      for (const r of rows.value) {
        if (!r.is_active && (!realType || r.holiday_type === realType)) {
          r.is_active = true
        }
      }
      toast.success(`${data.activated} holiday${data.activated === 1 ? '' : 's'} activated — now affect attendance, leave & payroll`)
    }
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Bulk activate failed')
  } finally { bulkActivating.value = false }
}

// Quick-activate single row (without opening the review modal).
const quickActivate = async (h) => {
  try {
    await activateHoliday(h.id)
    // Optimistic local flip — see doActivate for why this is needed.
    const row = rows.value.find(r => r.id === h.id)
    if (row) row.is_active = true
    toast.success(`"${h.name}" activated`)
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not activate')
  }
}

// Calendar cell tooltip — shows holiday name + draft state.
const holidayCellTitle = (iso) => {
  const h = holidaysByDate.value[iso]
  if (!h) return ''
  return h.is_active ? h.name : `${h.name} · DRAFT (not yet active)`
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-hol {
  display: flex; flex-direction: column;
  gap: 16px;
  padding-top: 18px;
}

/* ═══════════════ BANNER ═══════════════ */
.hol-banner {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 1fr auto; gap: 22px;
  padding: 22px 26px;
  border-radius: 22px;
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(167, 139, 250, 0.14), transparent 60%),
    radial-gradient(120% 90% at 100% 100%, rgba(94, 234, 212, 0.10), transparent 60%),
    linear-gradient(160deg, rgba(28, 22, 38, 0.65), rgba(20, 16, 14, 0.82));
  border: 1px solid rgba(167, 139, 250, 0.26);
  backdrop-filter: var(--att-glass-blur);
  box-shadow: 0 28px 60px -30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.hol-banner-atmos { position: absolute; inset: 0; pointer-events: none; }
.hba {
  position: absolute; border-radius: 50%;
  filter: blur(60px); opacity: 0.55;
  animation: att-warm-aurora 22s ease-in-out infinite;
}
.hba-a { top: -40%; left: -10%; width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.40), transparent 65%); }
.hba-b { bottom: -50%; right: -10%; width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), transparent 65%);
  animation-delay: 6s; }

.hol-banner-text { position: relative; z-index: 1; }
.hol-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: rgba(196, 181, 253, 0.95);
}
.hol-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #a78bfa;
  box-shadow: 0 0 6px #a78bfa;
  animation: att-live-pulse 2.4s ease-in-out infinite;
}
.hol-title {
  margin: 4px 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(110deg, #fef3c7 0%, #fbbf24 35%, #a78bfa 75%, #5eead4 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 9s ease-in-out infinite;
  display: inline-flex; gap: 10px; align-items: baseline;
}
.hol-title-sep { color: var(--hr-text-dim); -webkit-text-fill-color: var(--hr-text-dim); font-weight: 400; }
.hol-title-country { -webkit-text-fill-color: var(--hr-text); color: var(--hr-text); font-size: 22px; opacity: 0.9; }
.hol-sub { margin: 0; font-size: 12.5px; color: var(--hr-text-muted); max-width: 640px; line-height: 1.55; }

.hol-banner-controls {
  display: flex; flex-direction: column; gap: 8px; align-items: stretch; min-width: 280px;
  position: relative; z-index: 1;
}
.hol-select-pair { display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px; }
.hol-action-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.hol-select {
  padding: 9px 12px;
  border-radius: 11px;
  background: rgba(8, 14, 18, 0.55);
  border: 1px solid rgba(167, 139, 250, 0.28);
  color: var(--hr-text);
  font: inherit; font-size: 12px; font-weight: 600;
  color-scheme: dark;
  cursor: pointer;
  transition: border-color .18s, background .18s;
}
.hol-select:hover { border-color: rgba(167, 139, 250, 0.55); }
.hol-select:focus { outline: none; border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.18); }

.hol-btn-ghost, .hol-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 14px;
  border-radius: 11px;
  font: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
  cursor: pointer;
  transition: filter .18s, box-shadow .18s, border-color .18s;
}
.hol-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(167, 139, 250, 0.28);
  color: var(--hr-text);
}
.hol-btn-ghost:hover:not(:disabled) {
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.08);
}
.hol-btn-ghost:disabled { opacity: 0.55; cursor: progress; }
.hol-btn-primary {
  background: linear-gradient(135deg, #fcd34d, #fb923c 55%, #c2410c);
  color: #1f1408;
  border: 1px solid rgba(251, 146, 60, 0.55);
  box-shadow: 0 10px 22px -10px rgba(234, 88, 12, 0.55);
}
.hol-btn-primary:hover { filter: brightness(1.06); box-shadow: 0 14px 28px -12px rgba(234, 88, 12, 0.7); }
.hol-btn-primary.sm { padding: 6px 12px; font-size: 11.5px; }

.spin { animation: spinone .9s linear infinite; }
@keyframes spinone { to { transform: rotate(360deg); } }

/* ═══════════════ KPI STRIP ═══════════════ */
.hol-kpis {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
}
@media (max-width: 920px) { .hol-kpis { grid-template-columns: repeat(2, 1fr); } }
.hol-kpi {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: border-color .22s, background .22s, transform .22s, box-shadow .22s;
}
.hol-kpi:hover { border-color: rgba(251, 191, 36, 0.45); }
.hol-kpi.active { box-shadow: 0 10px 24px -10px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.10); }
.hol-kpi.tone-teal.active   { border-color: rgba(94, 234, 212, 0.65); background: rgba(94, 234, 212, 0.08); }
.hol-kpi.tone-gold.active   { border-color: rgba(251, 191, 36, 0.65); background: rgba(251, 191, 36, 0.08); }
.hol-kpi.tone-orange.active { border-color: rgba(251, 146, 60, 0.65); background: rgba(251, 146, 60, 0.08); }
.hol-kpi.tone-purple.active { border-color: rgba(167, 139, 250, 0.65); background: rgba(167, 139, 250, 0.08); }

.hk-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06); color: var(--hr-text);
}
.hol-kpi.tone-teal   .hk-icon { background: rgba(94, 234, 212, 0.16);  color: #5eead4; }
.hol-kpi.tone-gold   .hk-icon { background: rgba(251, 191, 36, 0.18);  color: #fbbf24; }
.hol-kpi.tone-orange .hk-icon { background: rgba(251, 146, 60, 0.18);  color: #fb923c; }
.hol-kpi.tone-purple .hk-icon { background: rgba(167, 139, 250, 0.18); color: #c4b5fd; }
.hk-body { display: flex; flex-direction: column; line-height: 1.05; flex: 1; min-width: 0; }
.hk-value { font-size: 20px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.02em; }
.hk-label { font-size: 9.5px; font-weight: 800; letter-spacing: 1.1px; text-transform: uppercase; color: var(--hr-text-muted); margin-top: 4px; }
.hk-foot { font-size: 9.5px; color: var(--hr-text-dim); font-style: italic; align-self: end; }

/* ═══════════════ DECK: CALENDAR + RAIL ═══════════════ */
.hol-deck {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
  gap: 14px;
  align-items: start;
}
@media (max-width: 1080px) {
  .hol-deck { grid-template-columns: 1fr; }
}

/* ── Calendar ── */
.hol-calendar {
  padding: 18px 20px 16px;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(251, 191, 36, 0.06), transparent 60%),
    linear-gradient(180deg, rgba(28, 22, 18, 0.55), rgba(20, 16, 14, 0.72));
  border: 1px solid rgba(251, 191, 36, 0.20);
}
.hc-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.hc-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--hr-text-secondary);
}
.hc-eyebrow svg { color: var(--att-yellow-200); }

.hc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 720px) { .hc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 460px) { .hc-grid { grid-template-columns: 1fr; } }

.hc-month {
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.20);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.hc-month-label {
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--att-orange-200);
  margin-bottom: 6px;
  text-align: center;
}
.hc-month-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.hc-dow {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-dim); text-align: center;
  padding: 2px 0;
}
.hc-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: transparent; border: 0;
  font-family: var(--hr-mono); font-size: 10.5px; font-weight: 600;
  color: var(--hr-text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: background .15s, color .15s, transform .15s;
}
.hc-cell.is-blank { cursor: default; pointer-events: none; }
.hc-cell:hover:not(.is-blank) {
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-text);
  transform: scale(1.10);
}
.hc-cell.is-today {
  background: rgba(94, 234, 212, 0.18);
  color: #5eead4;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(94, 234, 212, 0.55);
}
.hc-cell.is-holiday {
  background: rgba(251, 146, 60, 0.18);
  color: var(--hr-text);
  font-weight: 800;
}
.hc-cell.is-holiday[data-type="NATIONAL"]   { background: rgba(251, 191, 36, 0.22); color: #fde68a; }
.hc-cell.is-holiday[data-type="COMPANY"]    { background: rgba(94, 234, 212, 0.22); color: #5eead4; }
.hc-cell.is-holiday[data-type="REGIONAL"]   { background: rgba(251, 146, 60, 0.22); color: #fdba74; }
.hc-cell.is-holiday[data-type="RESTRICTED"] { background: rgba(167, 139, 250, 0.22); color: #c4b5fd; }
.hc-cell.is-selected {
  box-shadow:
    inset 0 0 0 2px var(--att-yellow-200),
    0 6px 14px -6px rgba(251, 191, 36, 0.5);
  transform: scale(1.05);
}
.hc-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: currentColor;
  position: absolute; bottom: 2px;
  opacity: 0.85;
}

.hc-legend {
  display: flex; flex-wrap: wrap; gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  font-size: 10.5px; color: var(--hr-text-muted);
}
.hc-leg { display: inline-flex; align-items: center; gap: 5px; }
.hc-leg-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.hc-leg-dot.dot-NATIONAL   { background: #fbbf24; }
.hc-leg-dot.dot-COMPANY    { background: #5eead4; }
.hc-leg-dot.dot-REGIONAL   { background: #fb923c; }
.hc-leg-dot.dot-RESTRICTED { background: #a78bfa; }

/* ── Rail ── */
.hol-rail {
  display: flex; flex-direction: column;
  padding: 16px 16px 14px;
  border-radius: 22px;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(167, 139, 250, 0.06), transparent 60%),
    linear-gradient(180deg, rgba(28, 22, 38, 0.55), rgba(20, 16, 14, 0.72));
  border: 1px solid rgba(167, 139, 250, 0.20);
  max-height: 640px;
}
.hr-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(167, 139, 250, 0.18);
}
.hr-title {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase;
  color: var(--hr-text);
}
.hr-title svg { color: #c4b5fd; }
.hr-meta { font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600; }

.hr-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 32px 12px;
  color: var(--hr-text-muted);
}
.hr-empty svg { color: var(--att-yellow-200); }
.hr-empty p { margin: 0; font-size: 12px; font-weight: 600; text-align: center; }

.hr-list {
  display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto;
  flex: 1;
  padding-right: 2px;
}
.hr-list::-webkit-scrollbar { width: 6px; }
.hr-list::-webkit-scrollbar-thumb { background: rgba(167, 139, 250, 0.25); border-radius: 6px; }

.hr-item {
  position: relative;
  display: grid; grid-template-columns: 44px 1fr auto;
  gap: 10px; align-items: center;
  padding: 8px 10px;
  border-radius: 11px;
  background: rgba(0, 0, 0, 0.20);
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: border-color .2s, background .2s, transform .2s;
}
.hr-item:hover { border-color: rgba(251, 191, 36, 0.40); background: rgba(251, 191, 36, 0.04); }
.hr-item.is-selected {
  border-color: var(--att-yellow-200);
  background: rgba(251, 191, 36, 0.10);
  box-shadow: 0 6px 16px -8px rgba(251, 191, 36, 0.5);
}
.hr-item.is-past { opacity: 0.62; }
.hr-item.is-past:hover { opacity: 1; }
.hr-item[data-type="NATIONAL"]   { border-left: 3px solid #fbbf24; }
.hr-item[data-type="COMPANY"]    { border-left: 3px solid #5eead4; }
.hr-item[data-type="REGIONAL"]   { border-left: 3px solid #fb923c; }
.hr-item[data-type="RESTRICTED"] { border-left: 3px solid #a78bfa; }

.hri-date {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(251, 146, 60, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.32);
}
.hri-day {
  font-family: var(--hr-mono); font-size: 16px; font-weight: 800;
  color: #fde68a; line-height: 1; letter-spacing: -0.02em;
}
.hri-month {
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.1px;
  text-transform: uppercase; color: rgba(251, 191, 36, 0.85);
  margin-top: 2px;
}
.hri-body { min-width: 0; }
.hri-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 2px;
}
.hri-type {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; padding: 2px 7px; border-radius: 999px;
  background: rgba(94, 234, 212, 0.14); color: #5eead4;
  border: 1px solid rgba(94, 234, 212, 0.30);
}
.hri-type-dot {
  width: 4px; height: 4px; border-radius: 50%; background: currentColor;
}
.hri-type[data-type="NATIONAL"]   { background: rgba(251, 191, 36, 0.16);  color: #fbbf24; border-color: rgba(251, 191, 36, 0.38); }
.hri-type[data-type="COMPANY"]    { background: rgba(94, 234, 212, 0.14);  color: #5eead4; border-color: rgba(94, 234, 212, 0.30); }
.hri-type[data-type="REGIONAL"]   { background: rgba(251, 146, 60, 0.16);  color: #fb923c; border-color: rgba(251, 146, 60, 0.38); }
.hri-type[data-type="RESTRICTED"] { background: rgba(167, 139, 250, 0.16); color: #c4b5fd; border-color: rgba(167, 139, 250, 0.38); }
.hri-weekday { font-size: 9.5px; font-weight: 600; color: var(--hr-text-muted); }
.hri-name { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.01em; }
.hri-desc { margin: 2px 0 0; font-size: 10.5px; color: var(--hr-text-muted); line-height: 1.4; }

.hri-del {
  width: 24px; height: 24px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.hri-del:hover {
  background: rgba(248, 113, 113, 0.18);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
}

.hr-foot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(167, 139, 250, 0.18);
}
.hr-bulk {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(239, 68, 68, 0.06));
  border: 1px solid rgba(239, 68, 68, 0.40);
  color: #fca5a5;
  font: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
  cursor: pointer;
  transition: filter .18s, border-color .18s, color .18s, box-shadow .18s;
}
.hr-bulk:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.10));
  border-color: rgba(239, 68, 68, 0.70);
  color: #fecaca;
  box-shadow: 0 10px 22px -10px rgba(239, 68, 68, 0.5);
}

/* Form helpers used in OnbModal slot */
.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 520px) { .form-grid-2 { grid-template-columns: 1fr; } }

/* ── Segmented Type picker — 2x2 cards with icon + description ── */
.hol-type-picker { display: flex; flex-direction: column; gap: 8px; }
.hol-field-label {
  font-size: 10px; font-weight: 800; letter-spacing: 1.0px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.hol-field-label em { color: var(--att-orange-200); font-style: normal; }
.htp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
@media (max-width: 520px) { .htp-grid { grid-template-columns: 1fr; } }
.htp-card {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: start;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text);
  cursor: pointer;
  font: inherit;
  transition: border-color .22s var(--att-spring), background .22s var(--att-spring), box-shadow .22s var(--att-spring);
}
.htp-card:hover { border-color: rgba(251, 191, 36, 0.45); background: rgba(251, 191, 36, 0.04); }
.htp-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.htp-card.tone-gold   .htp-icon { background: rgba(251, 191, 36, 0.18);  color: #fbbf24; }
.htp-card.tone-teal   .htp-icon { background: rgba(94, 234, 212, 0.18);  color: #5eead4; }
.htp-card.tone-orange .htp-icon { background: rgba(251, 146, 60, 0.18);  color: #fb923c; }
.htp-card.tone-purple .htp-icon { background: rgba(167, 139, 250, 0.18); color: #c4b5fd; }
.htp-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.htp-title { font-size: 12.5px; font-weight: 800; letter-spacing: 0.2px; color: var(--hr-text); }
.htp-desc {
  font-size: 10.5px; line-height: 1.4;
  color: var(--hr-text-muted);
}
.htp-check {
  width: 20px; height: 20px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--att-success-300); color: #032724;
  flex-shrink: 0;
}
.htp-card.active {
  border-color: var(--att-yellow-200);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.14), rgba(251, 146, 60, 0.04));
  box-shadow: 0 8px 20px -10px rgba(251, 191, 36, 0.55);
}
.htp-card.tone-gold.active   { border-color: #fbbf24; box-shadow: 0 8px 20px -10px rgba(251, 191, 36, 0.55); }
.htp-card.tone-teal.active   { border-color: #5eead4; box-shadow: 0 8px 20px -10px rgba(94, 234, 212, 0.55); background: linear-gradient(135deg, rgba(94, 234, 212, 0.14), rgba(94, 234, 212, 0.04)); }
.htp-card.tone-orange.active { border-color: #fb923c; box-shadow: 0 8px 20px -10px rgba(251, 146, 60, 0.55); background: linear-gradient(135deg, rgba(251, 146, 60, 0.14), rgba(251, 146, 60, 0.04)); }
.htp-card.tone-purple.active { border-color: #a78bfa; box-shadow: 0 8px 20px -10px rgba(167, 139, 250, 0.55); background: linear-gradient(135deg, rgba(167, 139, 250, 0.14), rgba(167, 139, 250, 0.04)); }

/* Tiny location chip on the rail row */
.hri-loc {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 4px;
  padding: 2px 7px; border-radius: 6px;
  background: rgba(251, 146, 60, 0.10);
  border: 1px solid rgba(251, 146, 60, 0.32);
  color: #fdba74;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px;
}
.hri-loc svg { color: #fb923c; }

.modal-foot-spacer { flex: 1; }

/* "Pending review" banner shown atop the modal for DRAFT holidays */
.hol-draft-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(234, 179, 8, 0.06));
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: var(--hr-text);
}
.hdb-icon {
  width: 26px; height: 26px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.22); color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.55);
  flex-shrink: 0;
}
.hdb-text { display: flex; flex-direction: column; gap: 2px; }
.hdb-text strong { font-size: 11.5px; font-weight: 800; color: #fde68a; letter-spacing: 0.4px; }
.hdb-text span { font-size: 11px; color: var(--hr-text-muted); line-height: 1.45; }

/* Modal danger button (Delete from inside the unified modal) */
.hol-btn-danger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.36);
  color: #fca5a5;
  font: inherit; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;
  cursor: pointer;
  transition: background .18s, border-color .18s, color .18s;
}
.hol-btn-danger.sm { padding: 7px 11px; font-size: 11px; }
.hol-btn-danger:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.65);
  color: #fecaca;
}

/* DRAFT row in the rail — dashed border, lower opacity, "DRAFT" pill */
.hr-item.is-draft {
  border-style: dashed;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.04), rgba(0, 0, 0, 0.18));
}
.hr-item.is-draft .hri-date {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(251, 146, 60, 0.04));
  border-style: dashed;
  border-color: rgba(251, 191, 36, 0.45);
}
.hr-item.is-draft .hri-day { color: rgba(251, 191, 36, 0.75); }
.hr-item.is-draft .hri-month { color: rgba(251, 191, 36, 0.65); }
.hri-draft-pill {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 6px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.8px;
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.42);
  flex-shrink: 0;
  margin-left: auto;
}

/* Quick-activate button on draft rows */
.hri-activate {
  width: 24px; height: 24px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(94, 234, 212, 0.10);
  border: 1px solid rgba(94, 234, 212, 0.36);
  color: #5eead4; cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.hri-activate:hover {
  background: rgba(94, 234, 212, 0.22);
  border-color: rgba(94, 234, 212, 0.70);
  color: #99f6e4;
}

/* Apply-all-drafts CTA in rail footer */
.hr-foot {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(167, 139, 250, 0.18);
}
.hr-apply {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.18), rgba(94, 234, 212, 0.08));
  border: 1px solid rgba(94, 234, 212, 0.55);
  color: #5eead4;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.3px;
  cursor: pointer;
  transition: filter .18s, border-color .18s, color .18s, box-shadow .18s;
}
.hr-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.28), rgba(94, 234, 212, 0.14));
  border-color: rgba(94, 234, 212, 0.80);
  color: #99f6e4;
  box-shadow: 0 10px 22px -10px rgba(94, 234, 212, 0.45);
}
.hr-apply:disabled { opacity: 0.55; cursor: progress; }

/* DRAFT cells in the 12-month calendar — dashed outline */
.hc-cell.is-holiday.is-draft {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px rgba(251, 191, 36, 0.45);
  color: rgba(251, 191, 36, 0.85);
}
.hc-cell.is-holiday.is-draft .hc-dot { opacity: 0.55; }
.hc-cell.is-holiday.is-draft:hover { background: rgba(251, 191, 36, 0.10); }

/* ── LIGHT THEME for the new DRAFT chrome ── */
[data-theme="light"] .hol-draft-banner {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(234, 179, 8, 0.04));
  border-color: rgba(180, 83, 9, 0.40);
  color: #2c1810;
}
[data-theme="light"] .hdb-icon { background: rgba(217, 119, 6, 0.16); color: #92400e; border-color: rgba(180, 83, 9, 0.45); }
[data-theme="light"] .hdb-text strong { color: #92400e; }
[data-theme="light"] .hdb-text span { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hol-btn-danger { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.42); color: #b91c1c; }
[data-theme="light"] .hol-btn-danger:hover { background: rgba(220, 38, 38, 0.16); border-color: rgba(220, 38, 38, 0.70); color: #991b1b; }
[data-theme="light"] .hr-item.is-draft {
  background: linear-gradient(180deg, rgba(255, 246, 226, 0.85), rgba(255, 250, 240, 0.72));
}
[data-theme="light"] .hr-item.is-draft .hri-date {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(234, 88, 12, 0.06));
  border-color: rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .hr-item.is-draft .hri-day { color: #b45309; }
[data-theme="light"] .hr-item.is-draft .hri-month { color: #92400e; }
[data-theme="light"] .hri-draft-pill {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  border-color: rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .hri-activate {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.45);
  color: #0f766e;
}
[data-theme="light"] .hri-activate:hover {
  background: rgba(13, 148, 136, 0.20);
  border-color: rgba(13, 148, 136, 0.70);
  color: #0d9488;
}
[data-theme="light"] .hr-apply {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.14), rgba(13, 148, 136, 0.06));
  border-color: rgba(13, 148, 136, 0.55);
  color: #0f766e;
}
[data-theme="light"] .hr-apply:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.22), rgba(13, 148, 136, 0.12));
  border-color: rgba(13, 148, 136, 0.80);
  color: #0d9488;
  box-shadow: 0 10px 22px -10px rgba(13, 148, 136, 0.45);
}
[data-theme="light"] .hc-cell.is-holiday.is-draft {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px rgba(180, 83, 9, 0.55);
  color: #92400e;
}
[data-theme="light"] .hc-cell.is-holiday.is-draft:hover { background: rgba(217, 119, 6, 0.10); }

/* Light theme for the type picker + location chip */
[data-theme="light"] .hol-field-label { color: rgba(107, 88, 64, 0.95); }
[data-theme="light"] .hol-field-label em { color: #c2410c; }
[data-theme="light"] .htp-card {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #2c1810;
}
[data-theme="light"] .htp-card:hover {
  border-color: rgba(217, 119, 6, 0.55);
  background: rgba(217, 119, 6, 0.06);
}
[data-theme="light"] .htp-icon { background: rgba(180, 83, 9, 0.08); }
[data-theme="light"] .htp-card.tone-gold   .htp-icon { background: rgba(217, 119, 6, 0.16);  color: #b45309; }
[data-theme="light"] .htp-card.tone-teal   .htp-icon { background: rgba(13, 148, 136, 0.14); color: #0f766e; }
[data-theme="light"] .htp-card.tone-orange .htp-icon { background: rgba(234, 88, 12, 0.16);  color: #c2410c; }
[data-theme="light"] .htp-card.tone-purple .htp-icon { background: rgba(124, 58, 237, 0.14); color: #6d28d9; }
[data-theme="light"] .htp-title { color: #2c1810; }
[data-theme="light"] .htp-desc { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .htp-check { background: #047857; color: #fff; }
[data-theme="light"] .htp-card.tone-gold.active   { border-color: #b45309; background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.04)); }
[data-theme="light"] .htp-card.tone-teal.active   { border-color: #0f766e; background: linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(13, 148, 136, 0.04)); }
[data-theme="light"] .htp-card.tone-orange.active { border-color: #c2410c; background: linear-gradient(135deg, rgba(234, 88, 12, 0.14), rgba(234, 88, 12, 0.04)); }
[data-theme="light"] .htp-card.tone-purple.active { border-color: #6d28d9; background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(124, 58, 237, 0.04)); }
[data-theme="light"] .hri-loc {
  background: rgba(234, 88, 12, 0.08);
  border-color: rgba(234, 88, 12, 0.40);
  color: #9a3412;
}
[data-theme="light"] .hri-loc svg { color: #c2410c; }

/* ═══════════════════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES — cream-on-warm-accents palette
   ═══════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .hol-banner {
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(167, 139, 250, 0.10), transparent 60%),
    radial-gradient(120% 90% at 100% 100%, rgba(13, 148, 136, 0.08), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(167, 139, 250, 0.34);
  box-shadow: 0 28px 60px -30px rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .hba-a { background: radial-gradient(circle, rgba(124, 58, 237, 0.30), transparent 65%); }
[data-theme="light"] .hba-b { background: radial-gradient(circle, rgba(217, 119, 6, 0.30), transparent 65%); }
[data-theme="light"] .hol-eyebrow { color: #7c3aed; }
[data-theme="light"] .hol-eyebrow-dot { background: #7c3aed; box-shadow: 0 0 6px rgba(124, 58, 237, 0.7); }
[data-theme="light"] .hol-title {
  background: linear-gradient(110deg, #92400e 0%, #d97706 35%, #7c3aed 75%, #0f766e 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .hol-title-country { -webkit-text-fill-color: #2c1810; color: #2c1810; }
[data-theme="light"] .hol-sub { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hol-select {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(124, 58, 237, 0.32);
  color: #2c1810; color-scheme: light;
}
[data-theme="light"] .hol-select:hover { border-color: rgba(124, 58, 237, 0.55); }
[data-theme="light"] .hol-btn-ghost {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(124, 58, 237, 0.30);
  color: #2c1810;
}
[data-theme="light"] .hol-btn-ghost:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.10);
  border-color: rgba(124, 58, 237, 0.55);
}
[data-theme="light"] .hol-btn-primary {
  background: linear-gradient(135deg, #f59e0b, #ea580c 55%, #9a3412);
  color: #fff;
  border-color: #c2410c;
  box-shadow: 0 10px 22px -10px rgba(194, 65, 12, 0.45);
}

[data-theme="light"] .hol-kpi {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .hol-kpi:hover { border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .hol-kpi.tone-teal.active   { border-color: #0f766e; background: rgba(13, 148, 136, 0.10); }
[data-theme="light"] .hol-kpi.tone-gold.active   { border-color: #b45309; background: rgba(217, 119, 6, 0.10); }
[data-theme="light"] .hol-kpi.tone-orange.active { border-color: #c2410c; background: rgba(234, 88, 12, 0.10); }
[data-theme="light"] .hol-kpi.tone-purple.active { border-color: #7c3aed; background: rgba(124, 58, 237, 0.10); }
[data-theme="light"] .hk-icon { background: rgba(180, 83, 9, 0.08); }
[data-theme="light"] .hol-kpi.tone-teal   .hk-icon { background: rgba(13, 148, 136, 0.14); color: #0f766e; }
[data-theme="light"] .hol-kpi.tone-gold   .hk-icon { background: rgba(217, 119, 6, 0.14);  color: #b45309; }
[data-theme="light"] .hol-kpi.tone-orange .hk-icon { background: rgba(234, 88, 12, 0.14);  color: #c2410c; }
[data-theme="light"] .hol-kpi.tone-purple .hk-icon { background: rgba(124, 58, 237, 0.14); color: #6d28d9; }
[data-theme="light"] .hk-value { color: #2c1810; }
[data-theme="light"] .hk-label { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hk-foot { color: rgba(107, 88, 64, 0.55); }

[data-theme="light"] .hol-calendar {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(217, 119, 6, 0.06), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.26);
}
[data-theme="light"] .hc-eyebrow { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hc-eyebrow svg { color: #b45309; }
[data-theme="light"] .hc-month {
  background: rgba(255, 246, 226, 0.65);
  border-color: rgba(180, 83, 9, 0.18);
}
[data-theme="light"] .hc-month-label { color: #c2410c; }
[data-theme="light"] .hc-dow { color: rgba(107, 88, 64, 0.6); }
[data-theme="light"] .hc-cell { color: #6b5840; }
[data-theme="light"] .hc-cell:hover:not(.is-blank) {
  background: rgba(217, 119, 6, 0.14);
  color: #2c1810;
}
[data-theme="light"] .hc-cell.is-today {
  background: rgba(13, 148, 136, 0.18);
  color: #0f766e;
  box-shadow: inset 0 0 0 1px rgba(13, 148, 136, 0.55);
}
[data-theme="light"] .hc-cell.is-holiday[data-type="NATIONAL"]   { background: rgba(217, 119, 6, 0.20); color: #92400e; }
[data-theme="light"] .hc-cell.is-holiday[data-type="COMPANY"]    { background: rgba(13, 148, 136, 0.18); color: #0f766e; }
[data-theme="light"] .hc-cell.is-holiday[data-type="REGIONAL"]   { background: rgba(234, 88, 12, 0.18); color: #9a3412; }
[data-theme="light"] .hc-cell.is-holiday[data-type="RESTRICTED"] { background: rgba(124, 58, 237, 0.18); color: #6d28d9; }
[data-theme="light"] .hc-cell.is-selected {
  box-shadow:
    inset 0 0 0 2px #b45309,
    0 6px 14px -6px rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .hc-legend { border-top-color: rgba(180, 83, 9, 0.14); color: rgba(107, 88, 64, 0.85); }

[data-theme="light"] .hol-rail {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(124, 58, 237, 0.06), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(124, 58, 237, 0.30);
}
[data-theme="light"] .hr-head { border-bottom-color: rgba(124, 58, 237, 0.20); }
[data-theme="light"] .hr-title { color: #2c1810; }
[data-theme="light"] .hr-title svg { color: #6d28d9; }
[data-theme="light"] .hr-meta { color: rgba(107, 88, 64, 0.75); }
[data-theme="light"] .hr-empty { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hr-empty svg { color: #b45309; }
[data-theme="light"] .hr-list::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.30); }

[data-theme="light"] .hr-item {
  background: rgba(255, 246, 226, 0.72);
  border-color: rgba(180, 83, 9, 0.16);
}
[data-theme="light"] .hr-item:hover { border-color: rgba(217, 119, 6, 0.55); background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .hr-item.is-selected {
  border-color: #b45309;
  background: rgba(217, 119, 6, 0.16);
  box-shadow: 0 6px 16px -8px rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .hri-date {
  background: linear-gradient(135deg, #f59e0b, #ea580c 55%, #9a3412);
  border-color: #c2410c;
}
[data-theme="light"] .hri-day { color: #fff; }
[data-theme="light"] .hri-month { color: rgba(255, 255, 255, 0.85); }
[data-theme="light"] .hri-type[data-type="NATIONAL"]   { background: rgba(217, 119, 6, 0.16); color: #92400e; border-color: rgba(217, 119, 6, 0.40); }
[data-theme="light"] .hri-type[data-type="COMPANY"]    { background: rgba(13, 148, 136, 0.14); color: #0f766e; border-color: rgba(13, 148, 136, 0.40); }
[data-theme="light"] .hri-type[data-type="REGIONAL"]   { background: rgba(234, 88, 12, 0.16); color: #9a3412; border-color: rgba(234, 88, 12, 0.40); }
[data-theme="light"] .hri-type[data-type="RESTRICTED"] { background: rgba(124, 58, 237, 0.14); color: #6d28d9; border-color: rgba(124, 58, 237, 0.42); }
[data-theme="light"] .hri-weekday { color: rgba(107, 88, 64, 0.75); }
[data-theme="light"] .hri-name { color: #2c1810; }
[data-theme="light"] .hri-desc { color: rgba(107, 88, 64, 0.85); }
[data-theme="light"] .hri-del {
  background: rgba(180, 83, 9, 0.06);
  border-color: rgba(180, 83, 9, 0.22);
  color: rgba(107, 88, 64, 0.85);
}
[data-theme="light"] .hri-del:hover {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(220, 38, 38, 0.55);
  color: #b91c1c;
}
[data-theme="light"] .hr-foot { border-top-color: rgba(124, 58, 237, 0.20); }
[data-theme="light"] .hr-bulk {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.40);
  color: #b91c1c;
}
[data-theme="light"] .hr-bulk:hover {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(220, 38, 38, 0.65);
  color: #991b1b;
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.45);
}
</style>
