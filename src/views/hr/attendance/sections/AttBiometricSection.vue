<template>
  <section class="att-bio" data-anim="att-bio">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="bio-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="bio-banner-grid" aria-hidden="true" />
      <span class="bio-banner-glow" />

      <!-- Fingerprint + orbiting device nodes -->
      <div class="bio-print-cluster" aria-hidden="true">
        <span class="bio-print-emanate r1" />
        <span class="bio-print-emanate r2" />
        <span class="bio-print-emanate r3" />
        <svg viewBox="0 0 80 80" class="bio-print-svg">
          <defs>
            <linearGradient id="bioPrintGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fde68a" />
              <stop offset="50%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#fb923c" />
            </linearGradient>
            <clipPath id="bioPrintClip">
              <path d="M40 12 C26 12 16 24 16 38 V52 C16 60 22 66 28 68 M40 12 C54 12 64 24 64 38 V50 C64 56 60 62 56 64
                       M40 22 C30 22 24 30 24 38 V50 C24 56 26 60 30 62 M40 22 C50 22 56 30 56 38 V46
                       M40 32 C34 32 32 36 32 40 V48 C32 52 34 56 38 58 M40 32 C46 32 48 36 48 40 V44
                       M40 42 C38 42 38 44 38 46 V50" />
            </clipPath>
          </defs>
          <!-- Ridges drawn as a fingerprint silhouette -->
          <g fill="none" stroke="url(#bioPrintGrad)" stroke-width="1.4" stroke-linecap="round">
            <path d="M40 12 C26 12 16 24 16 38 V52 C16 60 22 66 28 68" />
            <path d="M40 12 C54 12 64 24 64 38 V50 C64 56 60 62 56 64" />
            <path d="M40 18 C28 18 20 28 20 38 V52 C20 58 24 62 28 64" />
            <path d="M40 18 C52 18 60 28 60 38 V48 C60 54 56 60 52 62" />
            <path d="M40 24 C32 24 26 30 26 38 V50 C26 54 28 58 32 60" />
            <path d="M40 24 C48 24 54 30 54 38 V46 C54 52 50 56 46 58" />
            <path d="M40 30 C36 30 32 34 32 38 V48 C32 52 34 54 36 56" />
            <path d="M40 30 C44 30 48 34 48 38 V44 C48 48 46 52 44 54" />
            <path d="M40 36 C38 36 38 38 38 40 V48 C38 50 40 52 42 52" />
            <path d="M40 36 C42 36 44 38 44 40 V42" />
          </g>
          <!-- Scanning beam clipped to the fingerprint shape -->
          <g clip-path="url(#bioPrintClip)">
            <rect class="bio-print-scan" x="14" y="10" width="52" height="6" fill="rgba(94, 234, 212, 0.65)" />
          </g>
        </svg>
        <!-- Orbiting device-node dots -->
        <span class="bio-node bio-node-a" />
        <span class="bio-node bio-node-b" />
        <span class="bio-node bio-node-c" />
        <span class="bio-node bio-node-d" />
      </div>

      <div class="bio-banner-text">
        <span class="bio-eyebrow">
          <span class="bio-eyebrow-dot" />
          Hardware bridge · 5 vendors · Real-time punch ingestion
        </span>
        <h2 class="bio-banner-title">
          <span>Biometric</span>
          <span class="bio-banner-divider">·</span>
          <span>Sync</span>
        </h2>
        <p class="bio-banner-sub">
          <strong>ZKTeco · eSSL · Matrix · Suprema · Hikvision</strong> punches flow into the
          audit log. The sync engine reconciles them with shifts <em>without manual touch</em>.
        </p>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP — hardware status ═══════════════════ -->
    <div class="bio-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['bio-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="t.filter !== null ? setFilter(t.filter) : null"
      >
        <!-- LED indicator on the top-right -->
        <span class="kpi-led" aria-hidden="true">
          <span class="kpi-led-core" />
          <span class="kpi-led-halo" />
        </span>
        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>
        <!-- Mini signal-strength bars at the bottom -->
        <div class="kpi-signal">
          <span v-for="(b, idx) in 5" :key="idx" :class="['kpi-signal-bar', { lit: idx < t.bars }]" />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ TOOLBAR — pills + register/sync ═══════════════════ -->
    <Motion as="div" class="bio-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <div class="bio-pills">
        <button v-for="f in FILTERS" :key="f.key"
          :class="['bio-pill', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="bio-pill-dot" :style="{ background: f.dot }" />{{ f.label }}<span class="bio-pill-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <div class="bio-toolbar-right">
        <Motion as="button" class="bio-btn bio-btn-ghost"
          :disabled="syncing"
          :whileHover="!syncing ? { y: -1, scale: 1.02 } : {}"
          :whileTap="!syncing ? { scale: 0.96 } : {}"
          @click="syncAll"
        >
          <RefreshCw :size="13" :class="{ spinning: syncing }" />
          {{ syncing ? 'Syncing…' : 'Sync all' }}
        </Motion>
        <Motion as="button" class="bio-btn bio-btn-primary"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="showCreate = true"
        >
          <Plus :size="13" />Register device
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ DEVICE GRID ═══════════════════ -->
    <div class="bio-grid" v-if="filteredDevices.length">
      <Motion v-for="(d, i) in filteredDevices" :key="d.id" as="article"
        :class="['bio-card', `is-${(d.last_sync_status || 'unknown').toLowerCase()}`]"
        :initial="{ opacity: 0, y: 20, scale: 0.94 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <!-- Status LED stack (top-right) -->
        <div class="bio-card-led">
          <span class="bio-card-led-core" />
          <span class="bio-card-led-halo" />
        </div>

        <!-- Delete button (hover-reveal) -->
        <button class="bio-card-delete" title="Remove device" @click.stop="openDelete(d)">
          <Trash2 :size="12" />
        </button>

        <!-- HEADER: vendor + status badge -->
        <header class="bio-card-head">
          <div class="bio-card-vendor">
            <Cpu :size="11" />
            <span>{{ d.device_type }}</span>
          </div>
          <span :class="['bio-card-status', `is-${(d.last_sync_status || 'unknown').toLowerCase()}`]">
            <span class="bio-card-status-dot" />{{ d.last_sync_status || 'UNKNOWN' }}
          </span>
        </header>

        <!-- SCANNER WINDOW: fingerprint icon w/ scan beam -->
        <div class="bio-scanner">
          <span class="bio-scanner-corner tl" />
          <span class="bio-scanner-corner tr" />
          <span class="bio-scanner-corner bl" />
          <span class="bio-scanner-corner br" />
          <Fingerprint :size="38" class="bio-scanner-print" />
          <span class="bio-scanner-beam" />
          <span class="bio-scanner-grid" aria-hidden="true" />
        </div>

        <!-- DEVICE NAME -->
        <h3 class="bio-card-name">{{ d.name }}</h3>

        <!-- METADATA STRIP -->
        <div class="bio-card-meta">
          <div class="bio-card-meta-row">
            <span class="bio-card-meta-key"><ScanFace :size="10" />ID</span>
            <span class="bio-card-meta-val onb-mono">{{ d.device_id }}</span>
          </div>
          <div class="bio-card-meta-row" v-if="d.ip_address">
            <span class="bio-card-meta-key"><Globe :size="10" />IP</span>
            <span class="bio-card-meta-val onb-mono">{{ d.ip_address }}</span>
          </div>
          <div class="bio-card-meta-row">
            <span class="bio-card-meta-key"><Activity :size="10" />SYNC</span>
            <span class="bio-card-meta-val onb-mono">{{ d.last_sync_at ? formatTime(d.last_sync_at) : 'never' }}</span>
          </div>
        </div>

        <!-- FOOTER: signal bars + activity sparkline -->
        <footer class="bio-card-foot">
          <div class="bio-card-signal" :title="`Signal: ${signalLevel(d)}/5`">
            <span v-for="(b, idx) in 5" :key="idx"
              :class="['bio-card-signal-bar', { lit: idx < signalLevel(d) }]" />
          </div>
          <div class="bio-card-spark">
            <span v-for="(dot, idx) in 12" :key="idx"
              :class="['bio-card-spark-dot', { active: idx < sparkActive(d) }]"
              :style="{ animationDelay: `${idx * 0.08}s` }"
            />
          </div>
        </footer>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="bio-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="bio-empty-aurora" />
      <div class="bio-empty-illustration">
        <span class="bio-empty-grid-bg" aria-hidden="true" />
        <Fingerprint :size="48" class="bio-empty-icon" />
        <span class="bio-empty-ring r1" />
        <span class="bio-empty-ring r2" />
        <span class="bio-empty-ring r3" />
        <span class="bio-empty-scan" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <Motion as="button" class="bio-btn bio-btn-primary"
        :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
        @click="showCreate = true"
      >
        <Plus :size="13" />Register first device
      </Motion>
      <div class="bio-empty-meta">
        <span class="bio-empty-meta-dot" />Live · auto-refresh every minute
      </div>
    </Motion>

    <!-- ═══════════════════ MODALS ═══════════════════ -->
    <AttDeleteModal
      :open="!!deleteTarget"
      title="Remove biometric device?"
      subtitle="Future punches from this device will be dropped at sync time."
      :target-label="deleteTarget?.name || ''"
      :target-meta="deleteTarget ? `${deleteTarget.device_type} · ${deleteTarget.device_id}` : ''"
      :target-tag="deleteTarget?.ip_address || ''"
      :target-icon="ScanFace"
      :submitting="deleting"
      confirm-label="Remove device"
      warning="Device punches from before today remain in the audit log. New punches will be rejected."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />

    <OnbModal
      :open="showCreate"
      title="Register biometric device"
      subtitle="Punches from this reader will sync into the attendance audit log"
      :icon="ScanFace"
      :width="560"
      @close="showCreate = false"
    >
      <div class="form-stack">
        <div class="form-grid-2">
          <OnbField v-model="form.device_id" label="Device ID" placeholder="e.g. ZKT-MUM-01" required />
          <OnbField v-model="form.name" label="Display name" placeholder="e.g. Mumbai HQ entrance" required />
          <OnbField v-model="form.device_type" type="select" label="Vendor" required
            :options="TYPES.map(t => ({ value: t, label: t }))" />
          <OnbField v-model="form.ip_address" label="IP address" placeholder="192.168.1.50" hint="Optional — used for direct sync polls." />
        </div>
      </div>
      <template #footer>
        <button class="bio-btn bio-btn-ghost" @click="showCreate = false">Cancel</button>
        <button class="bio-btn bio-btn-primary" :disabled="!valid" @click="doCreate"><Plus :size="13" />Register device</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, ScanFace, Globe, Trash2, Fingerprint, Cpu, Activity,
  CheckCircle2, XCircle, PowerOff, Radio,
} from 'lucide-vue-next'
import { fetchBiometricDevices, createBiometricDevice, syncBiometricDevices, deleteBiometricDevice } from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])
const toast = useToast()

const TYPES = ['ZKTECO', 'ESSL', 'MATRIX', 'SUPREMA', 'HIKVISION', 'OTHER']

const FILTERS = [
  { key: '',        label: 'All',     dot: '#fbbf24' },
  { key: 'ONLINE',  label: 'Online',  dot: '#10b981' },
  { key: 'OFFLINE', label: 'Offline', dot: '#94a3b8' },
  { key: 'ERROR',   label: 'Errors',  dot: '#b91c1c' },
]

const devices = ref([])
const filter = ref('')
const syncing = ref(false)
const showCreate = ref(false)
const form = reactive({ device_id: '', name: '', device_type: 'ZKTECO', ip_address: '' })
const valid = computed(() => !!(form.device_id && form.name))

const counts = computed(() => ({
  '':        devices.value.length,
  ONLINE:    devices.value.filter(d => d.last_sync_status === 'ONLINE').length,
  OFFLINE:   devices.value.filter(d => d.last_sync_status === 'OFFLINE').length,
  ERROR:     devices.value.filter(d => d.last_sync_status === 'ERROR').length,
}))

const filteredDevices = computed(() => {
  if (!filter.value) return devices.value
  return devices.value.filter(d => d.last_sync_status === filter.value)
})

const syncedTodayCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return devices.value.filter(d => d.last_sync_at && d.last_sync_at.slice(0, 10) === today).length
})

const kpiTiles = computed(() => [
  {
    key: 'online', filter: 'ONLINE', label: 'ONLINE',
    icon: CheckCircle2, tone: 'teal',
    value: counts.value.ONLINE,
    foot: counts.value.ONLINE === 1 ? '1 reader streaming' : `${counts.value.ONLINE} readers streaming`,
    bars: signalBars(counts.value.ONLINE, devices.value.length || 1),
  },
  {
    key: 'offline', filter: 'OFFLINE', label: 'OFFLINE',
    icon: PowerOff, tone: 'slate',
    value: counts.value.OFFLINE,
    foot: 'no recent ping',
    bars: signalBars(counts.value.OFFLINE, devices.value.length || 1),
  },
  {
    key: 'errors', filter: 'ERROR', label: 'ERRORS',
    icon: XCircle, tone: 'red',
    value: counts.value.ERROR,
    foot: counts.value.ERROR > 0 ? 'investigate ASAP' : 'clean',
    bars: signalBars(counts.value.ERROR, devices.value.length || 1),
  },
  {
    key: 'today', filter: null, label: 'SYNCED TODAY',
    icon: Radio, tone: 'gold',
    value: syncedTodayCount.value,
    foot: 'last 24 hours',
    bars: signalBars(syncedTodayCount.value, devices.value.length || 1),
  },
])

const emptyTitle = computed(() => {
  if (filter.value === 'ONLINE')  return 'No online readers right now'
  if (filter.value === 'OFFLINE') return 'No offline readers · all good'
  if (filter.value === 'ERROR')   return 'No devices in error state'
  return 'No biometric devices registered'
})
const emptySub = computed(() => {
  if (filter.value === 'ONLINE')  return 'Online readers stream punches into the audit log. None are reporting right now — check the network or sync manually.'
  if (filter.value === 'OFFLINE') return 'When a reader skips a heartbeat it appears here. An empty list means every device is reachable.'
  if (filter.value === 'ERROR')   return 'Devices that fail authentication or return malformed punches land here. An empty list means every reader is healthy.'
  return 'ZKTeco · eSSL · Matrix · Suprema · Hikvision punches stream into the audit log once a device is online. Register the first reader to start syncing.'
})

const signalBars = (count, total) => {
  if (!total || !count) return 0
  return Math.min(5, Math.max(1, Math.ceil((count / total) * 5)))
}

const signalLevel = (d) => {
  if (d.last_sync_status === 'ONLINE') return 5
  if (d.last_sync_status === 'ERROR')  return 2
  if (d.last_sync_status === 'OFFLINE') return 1
  return 3
}

const sparkActive = (d) => {
  if (d.last_sync_status === 'ONLINE') return 10
  if (d.last_sync_status === 'ERROR')  return 4
  if (d.last_sync_status === 'OFFLINE') return 1
  return 6
}

const setFilter = (k) => {
  if (k === null || k === undefined) return
  filter.value = k
}

const reload = async () => {
  try {
    const data = await fetchBiometricDevices()
    devices.value = data.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load devices') }
}
onMounted(reload)

const syncAll = async () => {
  if (syncing.value) return
  syncing.value = true
  try {
    const r = await syncBiometricDevices()
    toast.info(r?.message || 'Sync started')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Sync failed') }
  finally { syncing.value = false }
}

const doCreate = async () => {
  try {
    await createBiometricDevice({ ...form, ip_address: form.ip_address || null })
    toast.success('Device registered')
    showCreate.value = false
    Object.assign(form, { device_id: '', name: '', device_type: 'ZKTECO', ip_address: '' })
    reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not register') }
}

const formatTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const deleteTarget = ref(null)
const deleting = ref(false)
const openDelete = (d) => { deleteTarget.value = d }
const confirmDelete = async (reason) => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteBiometricDevice(deleteTarget.value.id, reason)
    toast.success(`Device "${deleteTarget.value.name}" removed`)
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove device')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-bio { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO BANNER — fingerprint + orbiting device nodes
   ═══════════════════════════════════════════════════════════════════════ */
.bio-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(20, 184, 166, 0.10), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .bio-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(13, 148, 136, 0.10), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Dot-grid background — signals "hardware terminal" */
.bio-banner-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.16) 0.8px, transparent 1px);
  background-size: 16px 16px;
  background-position: 0 0;
  z-index: 0; pointer-events: none;
  opacity: 0.45;
  mask-image: radial-gradient(80% 110% at 20% 50%, #000 30%, transparent 80%);
}
[data-theme="light"] .bio-banner-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.18) 0.8px, transparent 1px);
}

.bio-banner-glow {
  position: absolute; inset: -50% -10% auto auto;
  width: 60%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.24), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Fingerprint cluster on the right */
.bio-print-cluster {
  position: absolute;
  top: 50%; right: 32px;
  transform: translateY(-50%);
  width: 180px; height: 180px;
  z-index: 1; pointer-events: none;
}
.bio-print-svg {
  position: absolute; top: 50%; left: 50%;
  width: 100px; height: 100px;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.45));
}
.bio-print-scan {
  animation: bio-print-scan 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 6px rgba(94, 234, 212, 0.65));
}
@keyframes bio-print-scan {
  0%, 100% { transform: translateY(0); opacity: 0.35; }
  50%      { transform: translateY(54px); opacity: 0.85; }
}
[data-theme="light"] .bio-print-scan { fill: rgba(13, 148, 136, 0.55); filter: drop-shadow(0 0 6px rgba(13, 148, 136, 0.45)); }

.bio-print-emanate {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.5px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  pointer-events: none;
  animation: att-pulse-emanate 4s ease-out infinite;
}
[data-theme="light"] .bio-print-emanate { border-color: rgba(180, 83, 9, 0.45); }
.bio-print-emanate.r1 { width: 110px; height: 110px; animation-delay: 0s; }
.bio-print-emanate.r2 { width: 110px; height: 110px; animation-delay: 1.3s; }
.bio-print-emanate.r3 { width: 110px; height: 110px; animation-delay: 2.6s; }

/* Orbiting device-node dots */
.bio-node {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fbbf24 50%, #fb923c);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.85);
  top: 50%; left: 50%;
  margin-top: -4px; margin-left: -4px;
}
[data-theme="light"] .bio-node {
  background: linear-gradient(135deg, #fbbf24, #d97706 60%, #c2410c);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.70);
}
.bio-node-a { animation: bio-node-orbit-a 9s linear infinite; }
.bio-node-b { animation: bio-node-orbit-b 11s linear infinite reverse; }
.bio-node-c { animation: bio-node-orbit-c 13s linear infinite; }
.bio-node-d { animation: bio-node-orbit-d 15s linear infinite reverse; }
@keyframes bio-node-orbit-a {
  from { transform: rotate(0deg)   translateX(75px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(75px) rotate(-360deg); }
}
@keyframes bio-node-orbit-b {
  from { transform: rotate(90deg)  translateX(80px) rotate(-90deg); }
  to   { transform: rotate(450deg) translateX(80px) rotate(-450deg); }
}
@keyframes bio-node-orbit-c {
  from { transform: rotate(180deg) translateX(65px) rotate(-180deg); }
  to   { transform: rotate(540deg) translateX(65px) rotate(-540deg); }
}
@keyframes bio-node-orbit-d {
  from { transform: rotate(270deg) translateX(85px) rotate(-270deg); }
  to   { transform: rotate(630deg) translateX(85px) rotate(-630deg); }
}

.bio-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 220px; }
.bio-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fcd34d;
}
[data-theme="light"] .bio-eyebrow { color: #b45309; }
.bio-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .bio-eyebrow-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.55); }

.bio-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fbbf24 30%, #fb923c 60%, #fde68a 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: bio-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .bio-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #d97706 30%, #c2410c 60%, #b45309 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes bio-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.bio-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.bio-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 560px;
}
.bio-banner-sub strong { color: #fcd34d; font-weight: 700; }
.bio-banner-sub em { color: #5eead4; font-style: normal; font-weight: 600; }
[data-theme="light"] .bio-banner-sub strong { color: #b45309; }
[data-theme="light"] .bio-banner-sub em { color: #115e59; }

/* ═══════════════════════════════════════════════════════════════════════
   KPI STRIP — hardware status w/ LED + signal bars
   ═══════════════════════════════════════════════════════════════════════ */
.bio-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.bio-kpi {
  position: relative;
  padding: 14px 18px 12px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .bio-kpi {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.bio-kpi.active {
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .bio-kpi.active {
  border-color: var(--accent-light, #d97706);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(217, 119, 6, 0.40));
}

/* LED indicator top-right */
.kpi-led {
  position: absolute; top: 14px; right: 14px;
  width: 12px; height: 12px;
}
.kpi-led-core {
  position: absolute; inset: 3px;
  border-radius: 50%;
  background: var(--accent, #fbbf24);
  box-shadow: 0 0 6px var(--accent-glow, rgba(251, 191, 36, 0.65));
  animation: att-live-pulse 2s ease-in-out infinite;
}
.kpi-led-halo {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px solid var(--accent, #fbbf24);
  opacity: 0.45;
}
[data-theme="light"] .kpi-led-core { background: var(--accent-light, #d97706); box-shadow: 0 0 6px var(--accent-shadow-light, rgba(217, 119, 6, 0.55)); }
[data-theme="light"] .kpi-led-halo { border-color: var(--accent-light, #d97706); }

.kpi-head { display: flex; align-items: center; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-num {
  display: block;
  margin: 8px 0 3px;
  font-size: 28px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 191, 36, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

/* Mini signal bars */
.kpi-signal {
  margin-top: 10px;
  display: inline-flex; gap: 2px; align-items: flex-end;
  height: 12px;
}
.kpi-signal-bar {
  width: 5px;
  background: rgba(148, 163, 184, 0.22);
  border-radius: 1px;
  border: 1px solid rgba(148, 163, 184, 0.32);
}
.kpi-signal-bar:nth-child(1) { height: 30%; }
.kpi-signal-bar:nth-child(2) { height: 45%; }
.kpi-signal-bar:nth-child(3) { height: 65%; }
.kpi-signal-bar:nth-child(4) { height: 85%; }
.kpi-signal-bar:nth-child(5) { height: 100%; }
.kpi-signal-bar.lit {
  background: linear-gradient(180deg, var(--accent, #fbbf24), var(--accent-light, #d97706));
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 0 4px var(--accent-glow, rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .kpi-signal-bar { background: rgba(120, 53, 15, 0.10); border-color: rgba(120, 53, 15, 0.18); }
[data-theme="light"] .kpi-signal-bar.lit {
  background: linear-gradient(180deg, var(--accent-light, #d97706), var(--accent-light, #b45309));
  border-color: var(--accent-light, #d97706);
}

.tone-teal  { --accent: #10b981; --accent-light: #047857; --accent-glow: rgba(16, 185, 129, 0.30); --accent-shadow: rgba(5, 150, 105, 0.45); --accent-shadow-light: rgba(4, 120, 87, 0.45); }
.tone-slate { --accent: #94a3b8; --accent-light: #475569; --accent-glow: rgba(148, 163, 184, 0.26); --accent-shadow: rgba(71, 85, 105, 0.40); --accent-shadow-light: rgba(71, 85, 105, 0.35); }
.tone-red   { --accent: #ef4444; --accent-light: #991b1b; --accent-glow: rgba(239, 68, 68, 0.28); --accent-shadow: rgba(185, 28, 28, 0.45); --accent-shadow-light: rgba(153, 27, 27, 0.45); }
.tone-gold  { --accent: #fbbf24; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.32); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }

/* ═══════════════════════════════════════════════════════════════════════
   TOOLBAR — filter pills + register/sync
   ═══════════════════════════════════════════════════════════════════════ */
.bio-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .bio-toolbar {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.bio-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.bio-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, transform .18s;
}
.bio-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.55); }
.bio-pill.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24 50%, #f59e0b);
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 6px 18px -8px rgba(217, 119, 6, 0.55);
}
.bio-pill-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 4px currentColor; }
.bio-pill-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.24);
  font-size: 10px; font-weight: 800;
  color: inherit;
}
[data-theme="light"] .bio-pill {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}
[data-theme="light"] .bio-pill.active {
  background: linear-gradient(135deg, #fbbf24, #d97706 55%, #c2410c);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
}
[data-theme="light"] .bio-pill-count { background: rgba(255, 255, 255, 0.55); color: inherit; }

.bio-toolbar-right { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.bio-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s, transform .2s;
}
.bio-btn-primary {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 200%;
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 8px 20px -10px rgba(217, 119, 6, 0.60);
}
.bio-btn-primary:hover:not(:disabled) {
  background-position: 100% 50%;
  box-shadow: 0 14px 30px -10px rgba(217, 119, 6, 0.75);
}
[data-theme="light"] .bio-btn-primary {
  background: linear-gradient(135deg, #fbbf24, #d97706 50%, #c2410c);
  background-size: 200% 200%;
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
}
.bio-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-secondary);
  border-color: rgba(251, 191, 36, 0.32);
}
.bio-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.55);
  color: var(--hr-text);
}
.bio-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .bio-btn-ghost {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .bio-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.55);
  color: var(--hr-text);
}
.spinning { animation: bio-spin 0.9s linear infinite; }
@keyframes bio-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════════════════
   DEVICE GRID — hardware terminal cards
   ═══════════════════════════════════════════════════════════════════════ */
.bio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}
.bio-card {
  position: relative;
  padding: 16px 18px 14px;
  border-radius: 18px;
  background:
    linear-gradient(165deg, rgba(28, 22, 18, 0.78), rgba(20, 16, 14, 0.92));
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 12px 32px -18px rgba(0, 0, 0, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .bio-card {
  background:
    linear-gradient(165deg, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.65));
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 12px 32px -18px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.bio-card:hover {
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow:
    0 22px 44px -22px rgba(234, 88, 12, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
[data-theme="light"] .bio-card:hover {
  border-color: rgba(180, 83, 9, 0.65);
  box-shadow:
    0 22px 44px -22px rgba(180, 83, 9, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
/* Status-tinted glow on hover */
.bio-card.is-online:hover {
  border-color: rgba(16, 185, 129, 0.75);
  box-shadow: 0 22px 44px -22px rgba(16, 185, 129, 0.50);
}
.bio-card.is-error:hover {
  border-color: rgba(239, 68, 68, 0.75);
  box-shadow: 0 22px 44px -22px rgba(239, 68, 68, 0.50);
}
.bio-card.is-offline:hover {
  border-color: rgba(148, 163, 184, 0.65);
  box-shadow: 0 22px 44px -22px rgba(100, 116, 139, 0.30);
}
/* Status accent strip on the left edge */
.bio-card.is-online  { border-left: 4px solid #10b981; }
.bio-card.is-error   { border-left: 4px solid #ef4444; }
.bio-card.is-offline { border-left: 4px solid #64748b; }

/* Card LED (status indicator) */
.bio-card-led {
  position: absolute; top: 14px; right: 50px;
  width: 14px; height: 14px;
  z-index: 2;
}
.bio-card-led-core {
  position: absolute; inset: 3px;
  border-radius: 50%;
  background: #94a3b8;
  box-shadow: 0 0 6px rgba(148, 163, 184, 0.55);
}
.bio-card-led-halo {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px solid #94a3b8;
  opacity: 0.45;
}
.bio-card.is-online .bio-card-led-core { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.85); animation: bio-led-blink 1.8s ease-in-out infinite; }
.bio-card.is-online .bio-card-led-halo { border-color: #10b981; animation: bio-led-halo 2s ease-in-out infinite; }
.bio-card.is-error  .bio-card-led-core { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.85); animation: bio-led-blink-error 0.9s ease-in-out infinite; }
.bio-card.is-error  .bio-card-led-halo { border-color: #ef4444; animation: bio-led-halo 1s ease-in-out infinite; }
@keyframes bio-led-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
@keyframes bio-led-blink-error {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.40; }
}
@keyframes bio-led-halo {
  0%, 100% { transform: scale(1); opacity: 0.45; }
  50%      { transform: scale(1.6); opacity: 0; }
}

/* Delete button (hover-reveal) */
.bio-card-delete {
  position: absolute; top: 12px; right: 12px;
  width: 26px; height: 26px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(220, 38, 38, 0.22);
  color: var(--hr-text-muted);
  cursor: pointer;
  opacity: 0; transform: scale(0.85);
  z-index: 3;
  transition: opacity .25s, transform .25s, background .2s, color .2s, border-color .2s;
}
.bio-card:hover .bio-card-delete { opacity: 1; transform: scale(1); }
.bio-card-delete:hover {
  background: rgba(220, 38, 38, 0.18);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .bio-card-delete {
  background: rgba(180, 83, 9, 0.06);
  border-color: rgba(220, 38, 38, 0.22);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .bio-card-delete:hover {
  background: rgba(220, 38, 38, 0.16);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.55);
}

/* Header */
.bio-card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding-right: 64px;
}
.bio-card-vendor {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--hr-mono); font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #fcd34d;
  padding: 3px 9px;
  border-radius: 7px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.40);
}
[data-theme="light"] .bio-card-vendor {
  color: #b45309;
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.45);
}
.bio-card-vendor svg { color: currentColor; }
.bio-card-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.bio-card-status-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.bio-card-status.is-online  { background: rgba(16, 185, 129, 0.16); color: #34d399; border-color: rgba(16, 185, 129, 0.50); }
.bio-card-status.is-error   { background: rgba(239, 68, 68, 0.16);  color: #fca5a5; border-color: rgba(239, 68, 68, 0.50); }
.bio-card-status.is-offline { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; border-color: rgba(100, 116, 139, 0.50); }
.bio-card-status.is-unknown { background: rgba(148, 163, 184, 0.12); color: #94a3b8; border-color: rgba(100, 116, 139, 0.40); }
[data-theme="light"] .bio-card-status.is-online  { background: rgba(16, 185, 129, 0.18); color: #065f46; border-color: rgba(5, 150, 105, 0.55); }
[data-theme="light"] .bio-card-status.is-error   { background: rgba(239, 68, 68, 0.16);  color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }
[data-theme="light"] .bio-card-status.is-offline { background: rgba(148, 163, 184, 0.20); color: #334155; border-color: rgba(71, 85, 105, 0.55); }
[data-theme="light"] .bio-card-status.is-unknown { background: rgba(148, 163, 184, 0.16); color: #475569; border-color: rgba(100, 116, 139, 0.45); }

/* Scanner window */
.bio-scanner {
  position: relative;
  margin: 14px 0 12px;
  height: 96px;
  border-radius: 12px;
  background:
    radial-gradient(closest-side, rgba(20, 16, 14, 0.85), rgba(14, 10, 8, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.32);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .bio-scanner {
  background:
    radial-gradient(closest-side, rgba(254, 243, 199, 0.85), rgba(255, 250, 240, 0.55));
  border-color: rgba(180, 83, 9, 0.32);
}
.bio-scanner-corner {
  position: absolute;
  width: 14px; height: 14px;
  border: 2px solid rgba(251, 191, 36, 0.75);
  pointer-events: none;
}
[data-theme="light"] .bio-scanner-corner { border-color: rgba(180, 83, 9, 0.55); }
.bio-scanner-corner.tl { top: 6px;  left: 6px;  border-right: 0; border-bottom: 0; border-radius: 6px 0 0 0; }
.bio-scanner-corner.tr { top: 6px;  right: 6px; border-left: 0;  border-bottom: 0; border-radius: 0 6px 0 0; }
.bio-scanner-corner.bl { bottom: 6px; left: 6px;  border-right: 0; border-top: 0;    border-radius: 0 0 0 6px; }
.bio-scanner-corner.br { bottom: 6px; right: 6px; border-left: 0;  border-top: 0;    border-radius: 0 0 6px 0; }

.bio-scanner-print {
  color: #fbbf24;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.55));
  z-index: 1;
  animation: bio-scanner-pulse 3.5s ease-in-out infinite;
}
[data-theme="light"] .bio-scanner-print { color: #b45309; filter: drop-shadow(0 0 10px rgba(217, 119, 6, 0.45)); }
@keyframes bio-scanner-pulse {
  0%, 100% { transform: scale(1); opacity: 0.95; }
  50%      { transform: scale(1.08); opacity: 1; }
}
.bio-scanner-beam {
  position: absolute; left: 8px; right: 8px;
  top: 8px;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(94, 234, 212, 0.65) 50%,
    transparent 100%);
  box-shadow: 0 0 12px rgba(94, 234, 212, 0.70);
  animation: bio-scanner-beam 2.5s ease-in-out infinite;
  z-index: 2;
}
[data-theme="light"] .bio-scanner-beam {
  background: linear-gradient(90deg, transparent 0%, rgba(13, 148, 136, 0.65) 50%, transparent 100%);
  box-shadow: 0 0 12px rgba(13, 148, 136, 0.45);
}
@keyframes bio-scanner-beam {
  0%, 100% { top: 8px; opacity: 0.45; }
  50%      { top: calc(100% - 10px); opacity: 0.95; }
}
.bio-card.is-online .bio-scanner-beam { animation-duration: 1.6s; }
.bio-card.is-error .bio-scanner-beam {
  background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.65) 50%, transparent);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
}
.bio-card.is-offline .bio-scanner-beam { opacity: 0.20; animation-duration: 6s; }
.bio-scanner-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.08) 1px, transparent 1px);
  background-size: 12px 12px;
  z-index: 0; pointer-events: none;
}
[data-theme="light"] .bio-scanner-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.08) 1px, transparent 1px);
}

/* Device name */
.bio-card-name {
  margin: 0 0 8px;
  font-size: 14.5px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Metadata rows */
.bio-card-meta {
  display: flex; flex-direction: column; gap: 5px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed rgba(251, 191, 36, 0.28);
}
[data-theme="light"] .bio-card-meta {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.30);
}
.bio-card-meta-row {
  display: grid; grid-template-columns: 60px 1fr;
  align-items: center; gap: 8px;
  font-size: 11px;
}
.bio-card-meta-key {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.bio-card-meta-key svg { color: #fcd34d; }
[data-theme="light"] .bio-card-meta-key { color: #6b5840; }
[data-theme="light"] .bio-card-meta-key svg { color: #b45309; }
.bio-card-meta-val {
  font-weight: 700; color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.onb-mono { font-family: var(--hr-mono); }

/* Footer */
.bio-card-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .bio-card-foot { border-top-color: rgba(180, 83, 9, 0.24); }

.bio-card-signal {
  display: inline-flex; gap: 2px; align-items: flex-end; height: 14px;
}
.bio-card-signal-bar {
  width: 3.5px;
  border-radius: 1px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid rgba(148, 163, 184, 0.32);
}
.bio-card-signal-bar:nth-child(1) { height: 30%; }
.bio-card-signal-bar:nth-child(2) { height: 50%; }
.bio-card-signal-bar:nth-child(3) { height: 70%; }
.bio-card-signal-bar:nth-child(4) { height: 88%; }
.bio-card-signal-bar:nth-child(5) { height: 100%; }
.bio-card.is-online .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #34d399, #10b981);
  border-color: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.55);
}
.bio-card.is-error .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #fca5a5, #ef4444);
  border-color: #ef4444;
}
.bio-card.is-offline .bio-card-signal-bar.lit,
.bio-card.is-unknown .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #cbd5e1, #94a3b8);
  border-color: #94a3b8;
}
[data-theme="light"] .bio-card-signal-bar { background: rgba(120, 53, 15, 0.10); border-color: rgba(120, 53, 15, 0.20); }
[data-theme="light"] .bio-card.is-online .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #10b981, #047857);
  border-color: #047857;
}
[data-theme="light"] .bio-card.is-error .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #ef4444, #991b1b);
  border-color: #991b1b;
}
[data-theme="light"] .bio-card.is-offline .bio-card-signal-bar.lit,
[data-theme="light"] .bio-card.is-unknown .bio-card-signal-bar.lit {
  background: linear-gradient(180deg, #94a3b8, #475569);
  border-color: #475569;
}

/* Activity sparkline */
.bio-card-spark {
  display: inline-flex; gap: 3px; align-items: center;
}
.bio-card-spark-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.22);
}
.bio-card.is-online .bio-card-spark-dot.active {
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.65);
  animation: bio-spark-blink 1.6s ease-in-out infinite;
}
.bio-card.is-error .bio-card-spark-dot.active {
  background: #fca5a5;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.55);
}
.bio-card.is-offline .bio-card-spark-dot.active {
  background: #cbd5e1;
  opacity: 0.55;
}
[data-theme="light"] .bio-card-spark-dot { background: rgba(120, 53, 15, 0.12); }
[data-theme="light"] .bio-card.is-online .bio-card-spark-dot.active { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.55); }
[data-theme="light"] .bio-card.is-error .bio-card-spark-dot.active  { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.45); }
[data-theme="light"] .bio-card.is-offline .bio-card-spark-dot.active{ background: #94a3b8; }
@keyframes bio-spark-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.40; }
}

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
.bio-empty {
  position: relative;
  padding: 56px 28px 44px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
[data-theme="light"] .bio-empty {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.bio-empty-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(20, 184, 166, 0.14), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(251, 146, 60, 0.14), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
.bio-empty > *:not(.bio-empty-aurora) { position: relative; z-index: 1; }

.bio-empty-illustration {
  position: relative;
  width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}
.bio-empty-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
}
[data-theme="light"] .bio-empty-grid-bg {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.18) 1px, transparent 1px);
}
.bio-empty-icon {
  color: #fbbf24;
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.55));
  animation: bio-scanner-pulse 3.5s ease-in-out infinite;
  z-index: 2;
}
[data-theme="light"] .bio-empty-icon { color: #b45309; filter: drop-shadow(0 0 14px rgba(217, 119, 6, 0.45)); }
.bio-empty-ring {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.4px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.bio-empty-ring.r1 { width: 120px; height: 120px; animation-delay: 0s; }
.bio-empty-ring.r2 { width: 120px; height: 120px; animation-delay: 1.3s; }
.bio-empty-ring.r3 { width: 120px; height: 120px; animation-delay: 2.6s; }
[data-theme="light"] .bio-empty-ring { border-color: rgba(180, 83, 9, 0.45); }
.bio-empty-scan {
  position: absolute; left: 14px; right: 14px;
  top: 14px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.75) 50%, transparent);
  box-shadow: 0 0 10px rgba(94, 234, 212, 0.6);
  animation: bio-empty-scan-beam 3s ease-in-out infinite;
  z-index: 1;
}
[data-theme="light"] .bio-empty-scan {
  background: linear-gradient(90deg, transparent, rgba(13, 148, 136, 0.7) 50%, transparent);
  box-shadow: 0 0 10px rgba(13, 148, 136, 0.45);
}
@keyframes bio-empty-scan-beam {
  0%, 100% { top: 14px; opacity: 0.4; }
  50%      { top: calc(100% - 16px); opacity: 0.95; }
}

.bio-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.bio-empty p  { margin: 0 0 4px; font-size: 12px; color: var(--hr-text-muted); max-width: 480px; line-height: 1.55; }
.bio-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(13, 148, 136, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: #5eead4; text-transform: uppercase;
}
[data-theme="light"] .bio-empty-meta {
  background: rgba(13, 148, 136, 0.16);
  border-color: rgba(15, 118, 110, 0.55);
  color: #115e59;
}
.bio-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .bio-empty-meta-dot { background: #0f766e; box-shadow: 0 0 6px #0f766e; }

/* ═══════════════════════════════════════════════════════════════════════
   FORM (used inside OnbModal — keep prior shape)
   ═══════════════════════════════════════════════════════════════════════ */
.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* ═══════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════════ */
@media (max-width: 1100px) {
  .bio-banner-text { padding-right: 0; }
  .bio-print-cluster { position: relative; top: auto; right: auto; transform: none; margin: 16px auto 0; }
}
@media (max-width: 760px) {
  .bio-print-cluster { display: none; }
  .bio-grid { grid-template-columns: 1fr; }
  .form-grid-2 { grid-template-columns: 1fr; }
}
</style>
