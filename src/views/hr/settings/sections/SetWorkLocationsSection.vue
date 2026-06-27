<template>
  <div class="wl">
    <SetSectionHead eyebrow="Organization · Geography" title="Location" accent="Atlas"
      accent-color="var(--set-ok)" :icon="MapPin"
      sub="Every office, branch and remote site — anchored to a timezone and a weekly-off rhythm. This is the geography the attendance geo-fence, shift calendar and travel engine all read. Plot it on the world band; tune the clocks here.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New location
        </Motion>
      </template>

      <template #lenses>
        <div class="wl-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-ok)" @click="lens = 'all'">
            <Globe2 :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button v-for="t in TYPES" :key="t.value" class="set-chip" :class="{ on: lens === t.value }" :style="{ '--acc': t.color }"
            @click="lens = lens === t.value ? 'all' : t.value">
            <component :is="t.icon" :size="12" /> {{ t.label }} <b>{{ typeCount(t.value) }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'no-tz' }" style="--acc: var(--set-partial)"
            @click="lens = lens === 'no-tz' ? 'all' : 'no-tz'">
            <AlertTriangle :size="12" /> No timezone <b>{{ noTzCount }}</b>
          </button>
          <span class="set-chip wl-lens-stat"><Sunrise :size="12" /> {{ openNow }} open now</span>
        </div>
      </template>

      <div class="wl-powers">
        <Share2 :size="12" /><span class="wl-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="wl-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="wl-mod alt" @click="$router.push('/admin/hr/employees/all')">
          <ExternalLink :size="12" /> Employees by location
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + geography intelligence -->
    <div class="wl-hero">
      <Motion as="div" class="wl-atlas-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="wl-atlas-skel"><span class="wl-skel-beam" /></div>
        <LocationAtlas v-else :locations="rows" @select="openEdit" />
      </Motion>

      <Motion as="aside" class="wl-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="wl-insight-head"><Activity :size="14" /> Geography intelligence</header>
        <div class="wl-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="wl-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="wl-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="wl-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="wl-bar">
      <div class="wl-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search offices, cities, countries, timezones…" />
      </div>
      <span class="wl-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="wl-grid">
      <div v-for="n in 6" :key="n" class="wl-card-skel" :style="{ '--i': n }"><span class="wl-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="MapPin" accent-color="var(--set-ok)"
      :title="hasFilter ? 'No locations match' : 'No work locations yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Locations anchor attendance geo-fences, shift calendars, timezones and travel destinations.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New location</button>
    </SetEmptyState>
    <div v-else class="wl-grid">
      <LocationCard v-for="(l, i) in visible" :key="l.id" :location="l" :index="i" :headcount="hcOf(l.id)"
        @edit="openEdit" @delete="openDelete" @view="viewPeople" />
    </div>

    <LocationModal :open="formOpen" :edit-target="editTarget" :saving="saving" @close="formOpen = false" @save="save" />
    <LocationDeleteModal :open="delOpen" :loading="deleting" :target="delTarget" :headcount="delTarget ? hcOf(delTarget.id) : 0"
      @close="delOpen = false" @confirm="doDelete" @view-people="viewPeople" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  MapPin, RefreshCw, Plus, Globe2, Sunrise, AlertTriangle, Share2, ExternalLink, Search, FilterX,
  Activity, ArrowRight, Clock3, CalendarOff, Building2, GitBranch, Wifi, Briefcase, Crown,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import LocationAtlas from '../components/LocationAtlas.vue'
import LocationCard from '../components/LocationCard.vue'
import LocationModal from '../components/LocationModal.vue'
import LocationDeleteModal from '../components/LocationDeleteModal.vue'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { tzOffsetMinutes, tzLocal, isBusinessHours, normalizeWeeklyOff } from '../composables/useLocationClock'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()

const TYPES = [
  { value: 'HQ', label: 'HQ', color: 'var(--set-gold)', icon: Building2 },
  { value: 'BRANCH', label: 'Branch', color: 'var(--set-orange)', icon: GitBranch },
  { value: 'REMOTE', label: 'Remote', color: 'var(--set-ok)', icon: Wifi },
  { value: 'CLIENT_SITE', label: 'Client', color: 'var(--set-deep)', icon: Briefcase },
]

const rows = ref([])
const headcountById = ref({})
const loading = ref(false)
const q = ref('')
const lens = ref('all')

const h = () => ({ headers: authHeader() })

async function locCount(id) {
  try {
    const res = await axios.get(`${API}/hr/employees/`, { ...h(), params: { work_location_id: id, page: 1, limit: 1 } })
    return Number(res.data?.total || 0)
  } catch { return 0 }
}

async function reload() {
  loading.value = true
  try {
    const list = await listMaster('locations')
    rows.value = list
    syncReferenceSlice('locations', list)
    const counts = await Promise.all(list.map((l) => locCount(l.id)))
    const map = {}
    list.forEach((l, i) => { map[l.id] = counts[i] })
    headcountById.value = map
  } catch (e) {
    toast.error(errText(e, 'Failed to load work locations'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const hcOf = (id) => Number(headcountById.value[id] || 0)
const typeCount = (t) => rows.value.filter((l) => (l.type || 'HQ') === t).length
const noTzCount = computed(() => rows.value.filter((l) => tzOffsetMinutes(l.timezone) == null).length)
const openNow = computed(() => rows.value.filter((l) => { const loc = tzLocal(l.timezone); return loc && isBusinessHours(loc.minutes) }).length)
const noWoffCount = computed(() => rows.value.filter((l) => { const w = normalizeWeeklyOff(l.weekly_off_pattern); return !w.days.length && !w.alternate_saturdays }).length)
const hqCount = computed(() => typeCount('HQ'))

const tzSpread = computed(() => {
  const offs = rows.value.map((l) => tzOffsetMinutes(l.timezone)).filter((o) => o != null)
  if (offs.length < 2) return 0
  return Math.round((Math.max(...offs) - Math.min(...offs)) / 60)
})
const countryCount = computed(() => new Set(rows.value.map((l) => (l.country || '').trim().toLowerCase()).filter(Boolean)).size)

const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter((l) => {
    if (TYPES.some((t) => t.value === lens.value) && (l.type || 'HQ') !== lens.value) return false
    if (lens.value === 'no-tz' && tzOffsetMinutes(l.timezone) != null) return false
    if (term && ![l.name, l.code, l.city, l.state, l.country, l.timezone].some((v) => String(v || '').toLowerCase().includes(term))) return false
    return true
  }).sort((a, b) => {
    const order = { HQ: 0, BRANCH: 1, CLIENT_SITE: 2, REMOTE: 3 }
    return (order[a.type] ?? 9) - (order[b.type] ?? 9) || String(a.name).localeCompare(String(b.name))
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const powerLinks = ['attendance', 'shifts', 'travel'].map((s) => ({ ...MODULES[s] })).filter((m) => m.label)

const insights = computed(() => {
  const out = []
  out.push({ key: 'open', icon: Sunrise, tone: 'ok', value: `${openNow.value} / ${rows.value.length}`, label: openNow.value ? 'offices inside business hours now' : 'offices open right now' })
  out.push({ key: 'span', icon: Clock3, tone: 'gold', value: tzSpread.value ? `${tzSpread.value}h` : '—', label: tzSpread.value ? `timezone spread across ${countryCount.value || 1} countr${countryCount.value === 1 ? 'y' : 'ies'}` : 'single timezone footprint' })
  out.push({ key: 'notz', icon: AlertTriangle, tone: noTzCount.value ? 'warn' : 'ok', value: noTzCount.value, label: noTzCount.value ? 'locations have no timezone set' : 'every location has a timezone', action: noTzCount.value ? () => { lens.value = 'no-tz' } : null })
  out.push({ key: 'nowoff', icon: CalendarOff, tone: noWoffCount.value ? 'warn' : 'ok', value: noWoffCount.value, label: noWoffCount.value ? 'locations have no weekly-off pattern' : 'every location sets a weekly-off' })
  out.push({ key: 'hq', icon: Crown, tone: hqCount.value ? 'ok' : 'warn', value: hqCount.value, label: hqCount.value ? `headquarters location${hqCount.value === 1 ? '' : 's'}` : 'no HQ designated yet' })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (l) => { editTarget.value = l; formOpen.value = true }

async function save(payload) {
  saving.value = true
  try {
    if (editTarget.value) await updateMaster('locations', editTarget.value.id, payload)
    else await createMaster('locations', payload)
    toast.success(editTarget.value ? 'Location updated' : 'Location created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save location')) }
  finally { saving.value = false }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (l) => { delTarget.value = l; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster('locations', delTarget.value.id, reason)
    toast.success('Location deleted')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to delete location')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewPeople = (l) => router.push({ path: '/admin/hr/employees/all', query: { work_location_id: l.id } })
</script>

<style scoped>
.wl { display: flex; flex-direction: column; gap: 16px; }
.wl-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.wl-lenses .set-chip b { color: var(--set-text); }
.wl-lens-stat { cursor: default; }

.wl-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.wl-powers > svg { color: var(--set-text-dim); }
.wl-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.wl-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.wl-mod:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); transform: translateY(-1px); }
.wl-mod :deep(svg) { color: var(--set-ok); }
.wl-mod.alt { color: var(--set-text-muted); }
.wl-mod.alt :deep(svg) { color: var(--set-text-muted); }

.wl-hero { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 960px) { .wl-hero { grid-template-columns: 1fr; } }
.wl-atlas-wrap { min-width: 0; }
.wl-atlas-skel { position: relative; overflow: hidden; width: 100%; min-height: 360px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }

.wl-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.wl-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-ok); margin-bottom: 4px; }
.wl-insight-head :deep(svg) { color: var(--set-ok); }
.wl-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.wl-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.wl-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.wl-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.wl-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.wl-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.wl-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wl-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.wl-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.wl-insight-go:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); transform: translateX(2px); }

.wl-bar { display: flex; align-items: center; gap: 12px; }
.wl-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.wl-search:focus-within { border-color: var(--set-border-warm); }
.wl-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.wl-count { font-size: 11px; color: var(--set-text-dim); }

.wl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(296px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .wl-grid { grid-template-columns: 1fr; } }
.wl-card-skel { position: relative; overflow: hidden; height: 260px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.wl-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(52,211,153,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .wl-insight-row, .wl-card-skel, .wl-skel-beam { animation: none; }
}
</style>
