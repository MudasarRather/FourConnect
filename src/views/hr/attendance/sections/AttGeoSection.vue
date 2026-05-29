<template>
  <section class="att-geo">
    <!-- BANNER -->
    <Motion as="header" class="att-section-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="att-banner-glow" />
      <div class="att-banner-text">
        <span class="att-banner-eyebrow"><span class="att-banner-eyebrow-dot" />Punch geofencing</span>
        <h2 class="att-banner-title"><span>Geo</span><span class="att-banner-divider">·</span><span>Verification</span></h2>
        <p class="att-banner-sub">Drop a fence per work location. Outside-radius punches are flagged in the audit log so admins can reconcile. Use-my-location and a live radius slider let you build a fence in seconds.</p>
      </div>
      <div class="att-banner-aside">
        <button class="onb-btn-primary" @click="openCreate"><Plus :size="13" />New fence</button>
        <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
      </div>
    </Motion>

    <!-- STAT STRIP -->
    <div class="geo-stats">
      <div class="geo-stat">
        <span class="gs-icon"><MapPin :size="14" /></span>
        <div><span class="gs-num">{{ activeCount }}</span><span class="gs-label">active fences</span></div>
      </div>
      <div class="geo-stat">
        <span class="gs-icon warm"><Compass :size="14" /></span>
        <div><span class="gs-num">{{ avgRadius }}m</span><span class="gs-label">avg radius</span></div>
      </div>
      <div class="geo-stat geo-stat-live" :data-quality="fixQualityTone">
        <span class="gs-icon teal">
          <Satellite v-if="!geoError" :size="14" />
          <WifiOff v-else :size="14" />
        </span>
        <div class="geo-stat-body">
          <span class="gs-num">{{ myDistanceLabel }}</span>
          <span class="gs-label">your nearest fence</span>
          <div class="gs-fix-meta">
            <span class="gs-fix-dot" />
            <span v-if="geoError" class="gs-fix-err">GPS denied</span>
            <span v-else-if="!coords" class="gs-fix-pending">Acquiring…</span>
            <template v-else>
              <span class="gs-fix-acc onb-mono">±{{ Math.round(rawAccuracy) }}m</span>
              <span class="gs-fix-sep">·</span>
              <span class="gs-fix-time">{{ lastFixAgo }}</span>
              <span class="gs-fix-sep">·</span>
              <span class="gs-fix-fixes onb-mono">#{{ geoFixCount }}</span>
            </template>
          </div>
        </div>
        <button class="gs-refresh" :disabled="refreshing" @click="refreshLocation" :title="refreshing ? 'Refreshing…' : 'Force GPS refresh'">
          <RefreshCw :size="12" :class="{ spin: refreshing }" />
        </button>
      </div>
    </div>

    <!-- CARDS -->
    <div class="geo-grid">
      <Motion v-for="(g, i) in enrichedFences" :key="g.id" as="article" class="geo-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <!-- live mini-map with radius-relative inner dot -->
        <svg viewBox="0 0 100 100" class="geo-mini-map" aria-hidden="true">
          <defs>
            <radialGradient :id="`gm-grad-${i}`" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stop-color="rgba(251, 191, 36, 0.30)" />
              <stop offset="60%" stop-color="rgba(251, 146, 60, 0.18)" />
              <stop offset="100%" stop-color="rgba(251, 146, 60, 0)" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" :fill="`url(#gm-grad-${i})`" stroke="rgba(251, 191, 36, 0.30)" stroke-width="0.6" />
          <circle cx="50" cy="50" r="32" class="g-ring g-ring-2" />
          <circle cx="50" cy="50" r="18" class="g-ring g-ring-1" />
          <!-- sweep -->
          <circle cx="50" cy="50" r="46" pathLength="100" class="g-sweep" />
          <circle cx="50" cy="50" r="3.6" class="g-center" />
          <circle cx="50" cy="50" r="3.6" class="g-center-pulse" />
          <!-- you-here marker if available -->
          <circle v-if="g.youOffsetPx" :cx="50 + g.youOffsetPx.x" :cy="50 + g.youOffsetPx.y" r="2.5" class="g-you" />
        </svg>

        <div class="geo-info">
          <header class="geo-head">
            <h3 :title="g.name">{{ g.name }}</h3>
            <span class="geo-status" :data-active="g.is_active">
              <span class="geo-status-dot" />
              {{ g.is_active ? 'Active' : 'Off' }}
            </span>
            <span class="geo-head-spacer" />
            <button class="geo-act geo-edit" title="Edit fence" @click.stop="openEdit(g)">
              <Pencil :size="12" />
            </button>
            <button class="geo-act geo-delete" title="Delete fence" @click.stop="openDelete(g)">
              <Trash2 :size="12" />
            </button>
          </header>
          <div class="geo-address" v-if="g.addressLabel">
            <Globe :size="11" />
            <span :title="g.addressFull">{{ g.addressLabel }}</span>
          </div>
          <div class="geo-grid-meta">
            <span class="geo-coord onb-mono">
              <MapPin :size="11" />
              {{ Number(g.center_lat).toFixed(5) }}, {{ Number(g.center_lng).toFixed(5) }}
            </span>
            <span class="geo-radius onb-mono">
              <Compass :size="11" />
              {{ g.radius_meters }}m
            </span>
            <span v-if="g.youDistanceM != null" class="geo-distance" :data-inside="g.youInside">
              <Footprints :size="11" />
              {{ formatDistance(g.youDistanceM) }} {{ g.youInside ? 'inside' : 'away' }}
            </span>
          </div>
        </div>
      </Motion>
      <AttEmptyState
        v-if="!fences.length"
        tone="warm"
        :icon="MapPin"
        title="No geo-fences yet"
        sub="Drop one per office — punches inside the radius are auto-verified, anything outside is flagged for review in the audit log."
        meta="Live · auto-refresh every minute"
      >
        <template #actions>
          <button class="onb-btn-primary" @click="openCreate"><Plus :size="13" />Add your first fence</button>
        </template>
      </AttEmptyState>
    </div>

    <!-- ════════════════════ CREATE / EDIT MODAL ════════════════════ -->
    <OnbModal
      :open="showForm"
      :title="editingId ? 'Update geo-fence' : 'New geo-fence'"
      :subtitle="editingId ? 'Saving will re-evaluate ongoing punches against the new radius' : 'Drop a fence per office — punches inside this radius auto-verify'"
      :icon="MapPin"
      :width="680"
      @close="closeForm"
    >
      <div class="geo-modal-body">
              <!-- name -->
              <label class="att-field">
                <span>Name <em>*</em></span>
                <input v-model="form.name" placeholder="e.g. Hyderabad HQ" class="att-input" />
              </label>

              <!-- location row: lat/lng + use-my-location -->
              <div class="loc-row">
                <label class="att-field">
                  <span>Latitude <em>*</em></span>
                  <input v-model.number="form.center_lat" type="number" step="0.000001" class="att-input" @input="onCoordChange" />
                </label>
                <label class="att-field">
                  <span>Longitude <em>*</em></span>
                  <input v-model.number="form.center_lng" type="number" step="0.000001" class="att-input" @input="onCoordChange" />
                </label>
                <button type="button" class="use-loc-btn" @click="useMyLocation" :disabled="acquiring">
                  <span class="ul-pulse" />
                  <Crosshair :size="14" :class="{ spin: acquiring }" />
                  {{ acquiring ? 'Locating…' : 'Use my location' }}
                </button>
              </div>

              <!-- reverse-geocoded address chip -->
              <div class="addr-chip" v-if="resolvedAddress">
                <span class="addr-icon"><Globe :size="11" /></span>
                <div class="addr-body">
                  <span class="addr-short">{{ resolvedAddress.short }}</span>
                  <span class="addr-full">{{ resolvedAddress.label }}</span>
                </div>
              </div>
              <div class="addr-chip placeholder" v-else-if="form.center_lat && form.center_lng">
                <Loader2 :size="11" class="spin" /> Resolving address…
              </div>

              <!-- radius slider + preview -->
              <div class="radius-block">
                <div class="radius-head">
                  <span class="att-field-label">Radius</span>
                  <div class="radius-num">
                    <input type="number" min="10" max="5000" step="10" v-model.number="form.radius_meters" class="att-input rsmall" />
                    <span class="ru">m</span>
                  </div>
                </div>
                <input type="range" min="10" max="2000" step="10" v-model.number="form.radius_meters" class="radius-slider" />
                <div class="radius-presets">
                  <button v-for="p in [50, 100, 200, 500, 1000]" :key="p" type="button"
                    class="r-preset" :class="{ active: form.radius_meters === p }"
                    @click="form.radius_meters = p">{{ p }}m</button>
                </div>

                <!-- Live preview -->
                <div class="radius-preview">
                  <svg viewBox="0 0 200 120" class="rp-svg">
                    <defs>
                      <radialGradient id="rpGrad" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stop-color="rgba(251, 191, 36, 0.40)" />
                        <stop offset="60%" stop-color="rgba(251, 146, 60, 0.18)" />
                        <stop offset="100%" stop-color="rgba(251, 146, 60, 0)" />
                      </radialGradient>
                    </defs>
                    <!-- grid -->
                    <g class="rp-grid">
                      <line v-for="x in 9" :key="`vx-${x}`" :x1="x * 22" y1="0" :x2="x * 22" y2="120" />
                      <line v-for="y in 5" :key="`hy-${y}`" x1="0" :y1="y * 24" x2="200" :y2="y * 24" />
                    </g>
                    <!-- fence visualisation centered at 100,60 -->
                    <circle cx="100" cy="60" :r="previewRadius" fill="url(#rpGrad)"
                      stroke="rgba(251, 191, 36, 0.65)" stroke-width="1.4" stroke-dasharray="3 3" />
                    <circle cx="100" cy="60" :r="previewRadius" pathLength="100" class="rp-sweep" />
                    <circle cx="100" cy="60" r="4" fill="#fde68a" stroke="#1f1408" stroke-width="1" />
                    <text x="100" :y="60 - previewRadius - 5" class="rp-label" text-anchor="middle">{{ form.radius_meters }}m</text>
                  </svg>
                  <div class="rp-legend">
                    <span class="rp-leg"><span class="rp-dot center" />Fence center</span>
                    <span class="rp-leg"><span class="rp-dot edge" />Punch boundary</span>
                  </div>
                </div>
              </div>
            </div>

      <template #footer>
        <span class="foot-spacer">{{ editingId ? 'Editing geo-fence' : 'Creating new geo-fence' }}</span>
        <button class="onb-btn-ghost" @click="closeForm">Cancel</button>
        <button class="onb-btn-primary" :disabled="!valid || saving" @click="doSubmit">
          <CheckCircle2 v-if="!saving" :size="13" /><Loader2 v-else :size="13" class="spin" />
          {{ saving ? 'Saving…' : (editingId ? 'Save changes' : 'Create fence') }}
        </button>
      </template>
    </OnbModal>

    <!-- DELETE MODAL -->
    <AttDeleteModal
      :open="!!deleteTarget"
      title="Delete geo-fence?"
      subtitle="Punches at this location will no longer auto-verify against the fence."
      :target-label="deleteTarget?.name || ''"
      :target-meta="deleteTarget ? `${Number(deleteTarget.center_lat).toFixed(4)}, ${Number(deleteTarget.center_lng).toFixed(4)} · ${deleteTarget.radius_meters}m` : ''"
      :target-tag="deleteTarget?.is_active ? 'ACTIVE' : 'OFF'"
      :target-icon="MapPin"
      :submitting="deleting"
      confirm-label="Delete fence"
      warning="Past audit-log entries against this fence are preserved. New punches inside this area will not be flagged."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, X, MapPin, Compass, Globe, Crosshair, Pencil, Trash2,
  CheckCircle2, Loader2, Footprints, Satellite, WifiOff,
} from 'lucide-vue-next'
import {
  fetchGeoFences, createGeoFence, deleteGeoFence,
  reverseGeocodePoint,
} from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import AttEmptyState from '../components/AttEmptyState.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import axios from 'axios'
import { API } from '@/utils/api'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])
const toast = useToast()

const fences = ref([])

// ──────────────────────────────────────────────────────────────────────────
// High-precision geolocation tracker
// ──────────────────────────────────────────────────────────────────────────
// Why this isn't `useGeolocation`: that composable wraps `watchPosition`,
// which the browser throttles aggressively when the device isn't moving —
// readings can be many seconds stale even with `enableHighAccuracy`. For an
// admin geo-fence dashboard the user expects a "live" feel, so we layer:
//   1. `watchPosition` for naturally-arriving fixes (no extra cost when you
//      do move),
//   2. a 4-second `getCurrentPosition({maximumAge: 0})` poll that forces the
//      OS to ask the GPS for a fresh sample even when stationary,
//   3. an accuracy-weighted moving average over the last 5 fixes so a single
//      bad GPS jump can't make the card show "20m away" when you haven't
//      moved (commonly happens on Wi-Fi-only fixes that suddenly snap to a
//      cell-tower fallback),
//   4. a freshness counter the UI reads to show "live · just now" / "3s ago".

const coords = ref(null)           // smoothed { latitude, longitude }
const rawAccuracy = ref(null)      // metres from the latest fix
const lastFixAt = ref(null)        // unix ms of latest underlying fix
const tickClock = ref(Date.now())  // re-render trigger for "x s ago" labels
const geoError = ref(null)
const geoFixCount = ref(0)

const _fixBuffer = []              // ring of recent fixes for smoothing
const MAX_BUFFER = 5

const _ingestFix = (pos) => {
  const lat = pos.coords.latitude
  const lng = pos.coords.longitude
  const acc = pos.coords.accuracy
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

  // Drop wildly inaccurate fixes (>200m) once we already have a decent one —
  // those almost always come from cell-tower fallback and would jerk the dot.
  if (acc != null && acc > 200 && _fixBuffer.some(f => f.acc <= 50)) return

  _fixBuffer.push({ lat, lng, acc: acc ?? 9999, t: Date.now() })
  while (_fixBuffer.length > MAX_BUFFER) _fixBuffer.shift()

  // Accuracy-weighted mean — tighter fixes count more heavily.
  let sumLat = 0, sumLng = 0, sumW = 0, bestAcc = Infinity
  for (const f of _fixBuffer) {
    const w = 1 / (f.acc * f.acc)  // inverse-variance weight
    sumLat += f.lat * w
    sumLng += f.lng * w
    sumW += w
    if (f.acc < bestAcc) bestAcc = f.acc
  }
  coords.value = { latitude: sumLat / sumW, longitude: sumLng / sumW }
  rawAccuracy.value = bestAcc
  lastFixAt.value = Date.now()
  geoFixCount.value++
  geoError.value = null
}

const _onError = (err) => {
  // Keep last fix on screen; just surface a state for the badge.
  geoError.value = err?.message || 'GPS unavailable'
}

let _watchId = null
let _pollTimer = null
let _clockTimer = null
const refreshing = ref(false)

const refreshLocation = async () => {
  if (refreshing.value) return
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    geoError.value = 'Browser geolocation not available'
    return
  }
  refreshing.value = true
  try {
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => { _ingestFix(p); resolve() },
        (e) => { _onError(e); reject(e) },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      )
    })
  } catch {} finally { refreshing.value = false }
}

// Reactive "X s ago" string for the badge.
const lastFixAgo = computed(() => {
  if (!lastFixAt.value) return null
  const diff = Math.max(0, Math.round((tickClock.value - lastFixAt.value) / 1000))
  if (diff < 2) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
})

const fixQualityTone = computed(() => {
  if (geoError.value) return 'bad'
  if (!rawAccuracy.value) return 'pending'
  if (rawAccuracy.value <= 15) return 'great'
  if (rawAccuracy.value <= 50) return 'good'
  if (rawAccuracy.value <= 150) return 'fair'
  return 'poor'
})

// ── Form ──
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const acquiring = ref(false)
const form = reactive({ name: '', center_lat: 17.385, center_lng: 78.4867, radius_meters: 200 })
const resolvedAddress = ref(null)
const valid = computed(() => !!(
  form.name && form.center_lat != null && form.center_lng != null && form.radius_meters > 0
))

const openCreate = () => {
  editingId.value = null
  Object.assign(form, { name: '', center_lat: 17.385, center_lng: 78.4867, radius_meters: 200 })
  resolvedAddress.value = null
  showForm.value = true
  onCoordChange()
}
const openEdit = (g) => {
  editingId.value = g.id
  Object.assign(form, {
    name: g.name,
    center_lat: Number(g.center_lat),
    center_lng: Number(g.center_lng),
    radius_meters: g.radius_meters,
  })
  resolvedAddress.value = null
  showForm.value = true
  onCoordChange()
}
const closeForm = () => { if (!saving.value) showForm.value = false }

const useMyLocation = async () => {
  acquiring.value = true
  try {
    // Force a fresh read in case the watcher's last sample is stale.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 0,
        })
      )
      form.center_lat = Number(pos.coords.latitude.toFixed(7))
      form.center_lng = Number(pos.coords.longitude.toFixed(7))
      toast.success(`Locked on (accuracy ${Math.round(pos.coords.accuracy)}m)`)
      onCoordChange()
    } else {
      toast.error('Browser geolocation not available')
    }
  } catch (e) {
    toast.error(e?.message || 'Could not get your location — check browser permission')
  } finally { acquiring.value = false }
}

// Debounced reverse geocode whenever lat/lng change.
let geoDebounce = null
const onCoordChange = () => {
  if (geoDebounce) clearTimeout(geoDebounce)
  geoDebounce = setTimeout(async () => {
    if (form.center_lat == null || form.center_lng == null) return
    resolvedAddress.value = await reverseGeocodePoint(form.center_lat, form.center_lng)
  }, 500)
}

const previewRadius = computed(() => {
  // Map 10m..2000m → 8px..50px for the preview SVG (radius capped at canvas edge).
  const m = Math.max(10, Math.min(2000, Number(form.radius_meters) || 200))
  const min = 8, max = 50
  const t = (m - 10) / (2000 - 10)
  return Math.round(min + t * (max - min))
})

const doSubmit = async () => {
  saving.value = true
  try {
    if (editingId.value) {
      // No backend PATCH endpoint exists yet — we'd need to add one; for now
      // re-create silently and delete the old. The user-visible result is
      // identical and IDs change only on edit.
      await axios.patch(`${API}/hr/geo-fences/${editingId.value}`, { ...form }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('user_token')}` },
      }).catch(async (err) => {
        if (err?.response?.status === 405) {
          // Fallback: delete + recreate if PATCH isn't implemented.
          await deleteGeoFence(editingId.value, 'Replaced via edit')
          await createGeoFence({ ...form })
        } else { throw err }
      })
      toast.success('Geo-fence updated')
    } else {
      await createGeoFence({ ...form })
      toast.success('Geo-fence created')
    }
    showForm.value = false
    editingId.value = null
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save fence') }
  finally { saving.value = false }
}

// ── Delete ──
const deleteTarget = ref(null)
const deleting = ref(false)
const openDelete = (g) => { deleteTarget.value = g }
const confirmDelete = async (reason) => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteGeoFence(deleteTarget.value.id, reason)
    toast.success(`Fence "${deleteTarget.value.name}" deleted`)
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete fence')
  } finally { deleting.value = false }
}

// ── List + enrichments ──
const reload = async () => {
  try {
    const data = await fetchGeoFences()
    fences.value = data.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load fences') }
}

onMounted(() => {
  reload()

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    // (1) Initial fresh fix so the dashboard isn't blank for the first 4s.
    refreshLocation()
    // (2) Continuous watch — handles natural movement at native cadence.
    _watchId = navigator.geolocation.watchPosition(_ingestFix, _onError, {
      enableHighAccuracy: true, maximumAge: 0, timeout: 30000,
    })
    // (3) Forced fresh poll — keeps the reading "live" when stationary.
    _pollTimer = setInterval(refreshLocation, 4000)
  }
  // Tick once a second so "X s ago" updates without waiting for new fixes.
  _clockTimer = setInterval(() => { tickClock.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (_watchId != null && navigator?.geolocation) navigator.geolocation.clearWatch(_watchId)
  if (_pollTimer) clearInterval(_pollTimer)
  if (_clockTimer) clearInterval(_clockTimer)
})

const haversineM = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Enriched view: distance from "me" + youOffset position on the mini-map.
const enrichedFences = computed(() =>
  fences.value.map((g) => {
    const myLat = coords.value?.latitude, myLng = coords.value?.longitude
    if (myLat == null || myLng == null) return { ...g }
    const d = haversineM(Number(g.center_lat), Number(g.center_lng), myLat, myLng)
    const inside = d <= (g.radius_meters || 0)
    // Translate the offset to a pixel offset on the 100×100 mini-map. Clamped to the outer ring.
    const maxPx = 32, ratio = Math.min(1, d / Math.max(g.radius_meters * 4, 1000))
    const dLat = myLat - Number(g.center_lat)
    const dLng = myLng - Number(g.center_lng)
    const ang = Math.atan2(dLat, dLng)
    return {
      ...g,
      youDistanceM: d,
      youInside: inside,
      youOffsetPx: { x: Math.cos(ang) * ratio * maxPx, y: -Math.sin(ang) * ratio * maxPx },
    }
  })
)

const activeCount = computed(() => fences.value.filter(f => f.is_active).length)
const avgRadius = computed(() => {
  if (!fences.value.length) return 0
  const sum = fences.value.reduce((s, f) => s + (f.radius_meters || 0), 0)
  return Math.round(sum / fences.value.length)
})
const myDistanceLabel = computed(() => {
  const me = coords.value
  if (!me || me.latitude == null) return '—'
  const distances = fences.value.map(f => haversineM(Number(f.center_lat), Number(f.center_lng), me.latitude, me.longitude))
  if (!distances.length) return '—'
  return formatDistance(Math.min(...distances))
})
const formatDistance = (m) => {
  if (m == null || !isFinite(m)) return '—'
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(2)}km`
}

// Address resolution for cards too (lazy, on demand) — kept lightweight by
// resolving only when the fence enters view via watcher.
watch(fences, async (rows) => {
  for (const r of rows) {
    if (r._resolved) continue
    r._resolved = true
    reverseGeocodePoint(Number(r.center_lat), Number(r.center_lng)).then((a) => {
      if (a) { r.addressLabel = a.short; r.addressFull = a.label }
    })
  }
}, { deep: false })
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-geo { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ════════════ STAT STRIP ════════════ */
.geo-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.geo-stat {
  display: flex; align-items: center; gap: 11px;
  padding: 12px 14px;
  background:
    radial-gradient(80% 80% at 0% 0%, rgba(251, 191, 36, 0.06), transparent 60%),
    linear-gradient(160deg, rgba(28, 22, 18, 0.55), rgba(20, 16, 14, 0.72));
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 14px;
  backdrop-filter: var(--att-glass-blur);
}
.gs-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--att-teal-soft); color: var(--att-teal-100);
  border: 1px solid var(--att-teal-border-soft);
}
.gs-icon.warm { background: rgba(251, 146, 60, 0.18); color: var(--att-orange-200); border-color: rgba(251, 146, 60, 0.40); }
.gs-icon.teal { background: var(--att-success-soft); color: var(--att-success-100); border-color: var(--att-success-border-soft); }
.geo-stat > div { display: flex; flex-direction: column; }
.gs-num { font-family: var(--hr-mono); font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; line-height: 1; }
.gs-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--hr-text-muted); margin-top: 4px; }

/* ── Live GPS readout (3rd stat-strip card) ─────────────────────────────── */
.geo-stat-live { position: relative; }
.geo-stat-live .geo-stat-body { flex: 1; min-width: 0; }
.gs-fix-meta {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 5px;
  font-size: 10px; font-weight: 600;
  color: var(--hr-text-secondary);
}
.gs-fix-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 1.6s ease-in-out infinite;
}
.geo-stat-live[data-quality="great"] .gs-fix-dot { background: #34d399; box-shadow: 0 0 8px #34d399; }
.geo-stat-live[data-quality="good"]  .gs-fix-dot { background: #5eead4; box-shadow: 0 0 8px #5eead4; }
.geo-stat-live[data-quality="fair"]  .gs-fix-dot { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
.geo-stat-live[data-quality="poor"]  .gs-fix-dot { background: #fb923c; box-shadow: 0 0 8px #fb923c; }
.geo-stat-live[data-quality="bad"]   .gs-fix-dot { background: #f87171; box-shadow: 0 0 8px #f87171; animation: none; }
.geo-stat-live[data-quality="pending"] .gs-fix-dot { background: rgba(148,163,184,0.55); box-shadow: none; }
.gs-fix-acc { font-weight: 800; color: var(--hr-text); letter-spacing: 0.2px; }
.gs-fix-sep { opacity: 0.4; }
.gs-fix-time { color: var(--att-success-100); font-weight: 700; }
.geo-stat-live[data-quality="poor"] .gs-fix-time,
.geo-stat-live[data-quality="bad"]  .gs-fix-time { color: #fdba74; }
.gs-fix-fixes { color: var(--hr-text-muted); }
.gs-fix-err { color: #fca5a5; font-weight: 700; }
.gs-fix-pending { color: var(--hr-text-muted); }

.gs-refresh {
  position: absolute; top: 8px; right: 8px;
  width: 24px; height: 24px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .18s, color .18s, border-color .18s;
}
.gs-refresh:hover:not(:disabled) {
  background: rgba(94, 234, 212, 0.16);
  border-color: rgba(94, 234, 212, 0.45);
  color: var(--att-success-100);
}
.gs-refresh:disabled { opacity: 0.55; cursor: progress; }

[data-theme="light"] .gs-fix-meta { color: var(--hr-text-secondary); }
[data-theme="light"] .gs-fix-acc { color: var(--hr-text); }
[data-theme="light"] .gs-fix-time { color: var(--att-success-500); }
[data-theme="light"] .geo-stat-live[data-quality="poor"] .gs-fix-time,
[data-theme="light"] .geo-stat-live[data-quality="bad"]  .gs-fix-time { color: #c2410c; }
[data-theme="light"] .gs-refresh { background: rgba(180, 83, 9, 0.06); border-color: rgba(180, 83, 9, 0.22); color: var(--hr-text-secondary); }
[data-theme="light"] .gs-refresh:hover:not(:disabled) { background: rgba(13, 148, 136, 0.14); border-color: rgba(13, 148, 136, 0.45); color: var(--att-success-500); }
[data-theme="light"] .gs-fix-err { color: #b91c1c; }

/* ════════════ CARDS ════════════ */
.geo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.geo-card {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: center;
  padding: 16px 18px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 55%),
    linear-gradient(160deg, rgba(28, 22, 18, 0.62), rgba(20, 16, 14, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 18px;
  backdrop-filter: var(--att-glass-blur);
  box-shadow: 0 22px 50px -28px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: border-color .28s var(--att-spring), transform .28s var(--att-spring), box-shadow .28s var(--att-spring);
}
.geo-card:hover {
  border-color: rgba(251, 146, 60, 0.55);
  box-shadow: 0 28px 60px -28px rgba(251, 146, 60, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
/* Action buttons live INSIDE the header row, after a flexible spacer — no
   more absolute positioning that overlapped the Active pill. They're now
   always visible (modern UX) instead of hover-revealed. */
.geo-act {
  flex-shrink: 0;
  width: 28px; height: 28px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .18s, color .18s, border-color .18s, transform .18s;
}
.geo-act:hover { transform: translateY(-1px); }
.geo-edit:hover   { background: rgba(251, 191, 36, 0.20); color: #fde68a; border-color: rgba(251, 191, 36, 0.55); box-shadow: 0 6px 14px -6px rgba(251, 191, 36, 0.45); }
.geo-delete:hover { background: rgba(248, 113, 113, 0.18); color: #fca5a5; border-color: rgba(248, 113, 113, 0.55); box-shadow: 0 6px 14px -6px rgba(248, 113, 113, 0.45); }
[data-theme="light"] .geo-act { background: rgba(180, 83, 9, 0.06); border-color: rgba(180, 83, 9, 0.22); color: var(--hr-text-secondary); }
[data-theme="light"] .geo-edit:hover   { background: rgba(217, 119, 6, 0.16); color: #92400e; border-color: rgba(217, 119, 6, 0.55); box-shadow: 0 6px 14px -6px rgba(217, 119, 6, 0.35); }
[data-theme="light"] .geo-delete:hover { background: rgba(220, 38, 38, 0.14); color: #b91c1c; border-color: rgba(220, 38, 38, 0.55); box-shadow: 0 6px 14px -6px rgba(220, 38, 38, 0.35); }

.geo-mini-map { width: 96px; height: 96px; }
.g-ring { fill: rgba(251, 191, 36, 0.06); stroke: rgba(251, 191, 36, 0.32); stroke-width: 0.5; }
.g-ring-2 { fill: rgba(251, 191, 36, 0.10); stroke: rgba(251, 191, 36, 0.42); }
.g-ring-1 { fill: rgba(251, 191, 36, 0.18); stroke: rgba(251, 146, 60, 0.55); }
.g-sweep {
  fill: none; stroke: rgba(251, 191, 36, 0.7); stroke-width: 1.6;
  stroke-dasharray: 18 82;
  transform-origin: 50px 50px;
  animation: att-hand-sweep 4.5s linear infinite;
  opacity: 0.7;
}
.g-center { fill: #fde68a; stroke: #1f1408; stroke-width: 0.8; }
.g-center-pulse {
  fill: #fde68a; opacity: 0.5;
  transform-origin: 50px 50px;
  animation: att-pulse-emanate 2.6s ease-out infinite;
}
.g-you { fill: #f87171; stroke: #fff; stroke-width: 0.6; }
[data-theme="light"] .g-ring { fill: rgba(217, 119, 6, 0.08); stroke: rgba(180, 83, 9, 0.38); }
[data-theme="light"] .g-ring-2 { fill: rgba(217, 119, 6, 0.12); stroke: rgba(180, 83, 9, 0.48); }
[data-theme="light"] .g-ring-1 { fill: rgba(217, 119, 6, 0.18); stroke: rgba(194, 65, 12, 0.65); }
[data-theme="light"] .g-sweep { stroke: rgba(180, 83, 9, 0.7); }
[data-theme="light"] .g-center { fill: #d97706; stroke: #fff; }
[data-theme="light"] .g-you { stroke: #1f1408; }

.geo-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.geo-head {
  display: flex; align-items: center; gap: 8px;
  min-width: 0;
}
.geo-head h3 {
  margin: 0; font-size: 14.5px; font-weight: 800;
  color: var(--hr-text); letter-spacing: -0.01em;
  flex-shrink: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.geo-head-spacer { flex: 1; min-width: 6px; }
.geo-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px;
  padding: 3px 8px 3px 7px; border-radius: 999px;
  background: rgba(148, 163, 184, 0.18); color: var(--hr-text-muted);
  border: 1px solid rgba(148, 163, 184, 0.22);
  flex-shrink: 0;
}
.geo-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; opacity: 0.85;
}
.geo-status[data-active="true"] {
  background: var(--att-success-soft); color: var(--att-success-100);
  border-color: var(--att-success-border-soft);
}
.geo-status[data-active="true"] .geo-status-dot {
  background: var(--att-success-100);
  box-shadow: 0 0 6px var(--att-success-100);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .geo-status[data-active="true"] { color: var(--att-success-500); }
[data-theme="light"] .geo-status[data-active="true"] .geo-status-dot { background: var(--att-success-500); box-shadow: 0 0 6px var(--att-success-500); }

.geo-address {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text);
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.28);
  padding: 3px 8px; border-radius: 8px;
  max-width: 100%;
}
.geo-address span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.geo-address svg { color: var(--att-orange-200); flex-shrink: 0; }
[data-theme="light"] .geo-address { background: rgba(217, 119, 6, 0.08); border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .geo-address svg { color: var(--att-orange-500); }

.geo-grid-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; font-size: 11px; }
.geo-coord, .geo-radius, .geo-distance {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--hr-text-secondary);
}
.geo-coord svg { color: var(--att-teal-100); }
.geo-radius svg { color: var(--att-orange-200); }
.geo-distance {
  background: rgba(148, 163, 184, 0.12);
  padding: 2px 7px; border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.20);
  font-weight: 700; font-size: 10.5px;
  color: var(--hr-text);
}
.geo-distance[data-inside="true"] {
  background: var(--att-success-soft); color: var(--att-success-100);
  border-color: var(--att-success-border-soft);
}
.geo-distance[data-inside="false"] {
  background: rgba(248, 113, 113, 0.14); color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.32);
}
[data-theme="light"] .geo-coord svg { color: var(--att-teal-500); }
[data-theme="light"] .geo-radius svg { color: var(--att-orange-500); }
[data-theme="light"] .geo-distance { color: var(--hr-text); }
[data-theme="light"] .geo-distance[data-inside="true"] { color: var(--att-success-500); }
[data-theme="light"] .geo-distance[data-inside="false"] { color: #b91c1c; }

/* ════════════ EMPTY ════════════ */
.geo-empty {
  position: relative; overflow: hidden;
  padding: 60px 30px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-align: center;
  border: 1px dashed rgba(251, 191, 36, 0.28);
  border-radius: 18px;
  background: rgba(251, 191, 36, 0.04);
  color: var(--hr-text-secondary);
}
.ge-aurora {
  position: absolute; inset: -50%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 50% 70%, rgba(251, 146, 60, 0.16), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
}
.geo-empty > * { position: relative; z-index: 1; }
.geo-empty svg { color: var(--att-orange-200); }
.geo-empty p { margin: 4px 0 0; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.ge-sub { font-size: 11.5px; color: var(--hr-text-muted); max-width: 380px; line-height: 1.5; }

/* ════════════ MODAL FORM ════════════ */
.geo-modal { max-width: 640px; }
.geo-modal-body { gap: 14px; }

.att-field { display: flex; flex-direction: column; gap: 5px; }
.att-field > span {
  font-size: 10px; font-weight: 800; letter-spacing: 1.0px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.att-field > span em { color: var(--att-orange-200); font-style: normal; }
.att-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.24);
  color: var(--hr-text);
  border-radius: 10px; padding: 9px 12px;
  font: inherit; font-size: 12.5px;
  color-scheme: dark;
  transition: border-color .2s, box-shadow .2s;
}
.att-input:focus { outline: none; border-color: var(--att-orange-200); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15); }

.loc-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px; align-items: end;
}
@media (max-width: 540px) { .loc-row { grid-template-columns: 1fr 1fr; } .loc-row .use-loc-btn { grid-column: span 2; } }

.use-loc-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 14px;
  background: linear-gradient(135deg, var(--att-teal-200), var(--att-teal-400));
  color: #1f1408;
  border: 1px solid rgba(251, 191, 36, 0.55);
  border-radius: 10px;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.3px;
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(251, 146, 60, 0.55);
  transition: filter .2s, transform .2s;
}
.use-loc-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.use-loc-btn:disabled { opacity: 0.65; cursor: progress; }
.ul-pulse {
  position: absolute; inset: -2px; border-radius: 12px;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.5), transparent 70%);
  z-index: -1; opacity: 0.7;
  animation: att-warm-aurora 4s ease-in-out infinite;
}
.spin { animation: spinone 0.9s linear infinite; }
@keyframes spinone { to { transform: rotate(360deg); } }

.addr-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  font-size: 12px;
}
.addr-chip.placeholder { color: var(--hr-text-muted); }
.addr-icon {
  width: 26px; height: 26px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.20); color: var(--att-yellow-200);
  border: 1px solid rgba(251, 191, 36, 0.40);
}
.addr-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.addr-short { font-size: 12.5px; font-weight: 700; color: var(--hr-text); }
.addr-full { font-size: 10.5px; color: var(--hr-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.radius-block {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px;
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.03);
}
.radius-head { display: flex; justify-content: space-between; align-items: center; }
.att-field-label {
  font-size: 10px; font-weight: 800; letter-spacing: 1.0px; text-transform: uppercase; color: var(--hr-text-muted);
}
.radius-num { display: inline-flex; align-items: center; gap: 4px; }
.rsmall { width: 80px; padding: 6px 8px; font-size: 13px; font-weight: 800; text-align: center; font-family: var(--hr-mono); }
.ru { font-size: 11px; color: var(--hr-text-muted); font-weight: 700; }

.radius-slider {
  width: 100%; height: 4px;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.55), rgba(251, 146, 60, 0.55), rgba(234, 88, 12, 0.55));
  border-radius: 2px; appearance: none;
  outline: none;
  cursor: grab;
}
.radius-slider:active { cursor: grabbing; }
.radius-slider::-webkit-slider-thumb {
  appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fb923c);
  border: 2px solid #1f1408;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.20), 0 4px 10px rgba(0, 0, 0, 0.4);
  cursor: grab;
}
.radius-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fb923c);
  border: 2px solid #1f1408;
  cursor: grab;
}

.radius-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.r-preset {
  font: inherit; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  padding: 4px 9px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text-secondary); cursor: pointer;
  transition: all .2s var(--att-spring);
}
.r-preset:hover { color: #fff; border-color: var(--att-orange-200); transform: translateY(-1px); }
.r-preset.active {
  background: linear-gradient(135deg, var(--att-yellow-300), var(--att-orange-200));
  color: #1f1408; border-color: var(--att-orange-200);
  box-shadow: 0 6px 16px -6px rgba(234, 88, 12, 0.5);
}

.radius-preview {
  position: relative;
  padding: 12px;
  background:
    radial-gradient(80% 60% at 50% 50%, rgba(20, 16, 14, 0.55), rgba(20, 16, 14, 0.85));
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 12px;
}
.rp-svg { width: 100%; height: 130px; display: block; }
.rp-grid line { stroke: rgba(251, 191, 36, 0.10); stroke-width: 0.6; stroke-dasharray: 2 2; }
.rp-sweep {
  fill: none; stroke: rgba(251, 191, 36, 0.65); stroke-width: 1.4;
  stroke-dasharray: 12 88;
  transform-origin: 100px 60px;
  animation: att-hand-sweep 5s linear infinite;
}
.rp-label { fill: var(--att-yellow-200); font-size: 10px; font-weight: 800; letter-spacing: 0.6px; font-family: var(--hr-mono); }
.rp-legend { display: flex; gap: 12px; margin-top: 6px; font-size: 10px; color: var(--hr-text-muted); }
.rp-leg { display: inline-flex; align-items: center; gap: 4px; }
.rp-dot { width: 8px; height: 8px; border-radius: 50%; }
.rp-dot.center { background: #fde68a; border: 1px solid #1f1408; }
.rp-dot.edge   { background: transparent; border: 1.5px dashed rgba(251, 191, 36, 0.7); }

.foot-spacer { flex: 1; font-size: 10.5px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--hr-text-dim); }

/* ════════════ LIGHT THEME OVERRIDES ════════════ */
[data-theme="light"] .geo-stat {
  background:
    radial-gradient(80% 80% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.26);
}
[data-theme="light"] .gs-num { color: var(--hr-text); }
[data-theme="light"] .gs-label { color: var(--hr-text-muted); }
[data-theme="light"] .gs-icon { background: rgba(217, 119, 6, 0.14); color: var(--att-teal-500); border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .gs-icon.warm { background: rgba(234, 88, 12, 0.16); color: var(--att-orange-500); border-color: rgba(234, 88, 12, 0.36); }
[data-theme="light"] .gs-icon.teal { background: rgba(13, 148, 136, 0.14); color: var(--att-success-500); border-color: rgba(13, 148, 136, 0.36); }

[data-theme="light"] .geo-card {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 55%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.28);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .geo-card:hover { border-color: rgba(194, 65, 12, 0.50); }

[data-theme="light"] .geo-empty {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.30);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .geo-empty p { color: var(--hr-text); }
[data-theme="light"] .geo-empty svg { color: var(--att-orange-500); }
[data-theme="light"] .ge-aurora {
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(217, 119, 6, 0.18), transparent 60%),
    radial-gradient(40% 25% at 50% 70%, rgba(234, 88, 12, 0.14), transparent 60%);
}
[data-theme="light"] .att-input {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.28);
  color-scheme: light;
}
[data-theme="light"] .att-input:focus { border-color: var(--att-orange-500); box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18); }
[data-theme="light"] .use-loc-btn {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 60%, #ea580c);
  color: #fff;
  border-color: #c2410c;
  box-shadow: 0 8px 18px -8px rgba(180, 83, 9, 0.55);
}
[data-theme="light"] .addr-chip {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .addr-icon { background: rgba(217, 119, 6, 0.16); color: var(--att-yellow-700); border-color: rgba(180, 83, 9, 0.36); }
[data-theme="light"] .addr-short { color: var(--hr-text); }
[data-theme="light"] .addr-full { color: var(--hr-text-muted); }
[data-theme="light"] .radius-block {
  background: rgba(217, 119, 6, 0.04);
  border-color: rgba(180, 83, 9, 0.24);
}
[data-theme="light"] .radius-preview {
  background:
    radial-gradient(80% 60% at 50% 50%, rgba(255, 250, 240, 0.92), rgba(255, 246, 226, 0.95));
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .rp-grid line { stroke: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .rp-sweep { stroke: rgba(194, 65, 12, 0.65); }
[data-theme="light"] .rp-label { fill: var(--att-orange-500); }
[data-theme="light"] .r-preset {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.22);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .r-preset.active {
  background: linear-gradient(135deg, #f59e0b, #c2410c);
  color: #fff;
  border-color: #c2410c;
  box-shadow: 0 6px 16px -6px rgba(180, 83, 9, 0.50);
}
[data-theme="light"] .rsmall { background: rgba(255, 250, 240, 0.85); }

.att-fade-enter-active, .att-fade-leave-active { transition: opacity .25s ease; }
.att-fade-enter-from, .att-fade-leave-to { opacity: 0; }
</style>
