<template>
  <section class="onb-identity">
    <Motion as="header" class="onb-section-banner id-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Email · biometric · badge · QR</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Identity</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Provisioning</span>
        </h2>
        <p class="onb-banner-sub">Provision the joiner's official email, biometric ID, RFID, badge, and QR. Employee code (EMP####) is auto-issued at hire.</p>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="onProcessChange" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><IdCard :size="22" /></div>
      <p>Pick a joiner to provision their identity.</p>
    </div>

    <div v-else class="id-grid">
      <!-- LEFT: form -->
      <Motion as="article" class="id-card form-card"
        :initial="{ opacity: 0, x: -10 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <div>
            <h3 class="card-title">Identity record</h3>
            <p class="card-sub">Status: <span class="status-pill" :data-status="identity?.status || 'PENDING'">{{ identity?.status || 'PENDING' }}</span></p>
          </div>
        </header>
        <div class="form-grid">
          <OnbField v-model="form.official_email" label="Official email" type="email" placeholder="alex@company.com" required />
          <OnbField v-model="form.username" label="Username" placeholder="alex.doe" />
          <OnbField v-model="form.biometric_id" label="Biometric ID" placeholder="BIO-0042" />
          <OnbField v-model="form.rfid_card_number" label="RFID card number" placeholder="RFID-0042" />
          <OnbField v-model="form.access_card_number" label="Access card" placeholder="ACC-0042" />
          <OnbField v-model="form.photo_url" label="Photo URL" placeholder="https://…" full />
          <OnbField v-model="form.qr_payload" label="QR payload" placeholder="https://company.id/EMP0042" full hint="What the badge QR code resolves to." />
        </div>
        <footer class="form-foot">
          <button class="onb-btn-ghost"   @click="save">Save</button>
          <button class="onb-btn-primary" :disabled="!form.official_email" @click="issue"><Sparkles :size="13" />Issue identity</button>
          <button v-if="identity?.status === 'ISSUED'" class="onb-btn-danger" @click="revoke">Revoke</button>
        </footer>
      </Motion>

      <!-- RIGHT: badge preview -->
      <Motion as="article" class="id-card badge-card"
        :initial="{ opacity: 0, x: 10 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <h3 class="card-title">Badge preview</h3>
        </header>
        <div class="badge-stage">
          <div class="badge-card-inner" :class="{ 'is-issued': identity?.status === 'ISSUED' }">
            <div class="badge-strip">
              <span class="strip-brand">Fourconnect</span>
              <span class="strip-state" :data-status="identity?.status || 'PENDING'">{{ identity?.status || 'PENDING' }}</span>
            </div>
            <div class="badge-photo" :style="form.photo_url ? { backgroundImage: `url('${form.photo_url}')` } : null">
              <span v-if="!form.photo_url">{{ initials }}</span>
            </div>
            <div class="badge-name">{{ employeeMeta.name || 'New Joiner' }}</div>
            <div class="badge-meta">
              <span class="onb-mono">{{ employeeMeta.code || 'EMP—' }}</span>
              <span class="dot">·</span>
              <span>{{ employeeMeta.designation || 'Designation' }}</span>
            </div>
            <div class="badge-meta">{{ employeeMeta.department || 'Department' }}</div>

            <button
              type="button"
              class="badge-qr"
              :class="{ 'is-disabled': !identity || identity?.status !== 'ISSUED' || !form.qr_payload }"
              @click="openScan"
              :title="form.qr_payload ? 'Scan / verify this badge' : 'Issue the identity to enable scanning'"
            >
              <svg viewBox="0 0 64 64" width="92" height="92" aria-hidden="true">
                <rect width="64" height="64" fill="#fbbf24" rx="6"/>
                <g fill="#1f1408">
                  <rect x="6"  y="6"  width="14" height="14" rx="1.5"/>
                  <rect x="44" y="6"  width="14" height="14" rx="1.5"/>
                  <rect x="6"  y="44" width="14" height="14" rx="1.5"/>
                  <rect x="10" y="10" width="6"  height="6"  rx="1" fill="#fbbf24"/>
                  <rect x="48" y="10" width="6"  height="6"  rx="1" fill="#fbbf24"/>
                  <rect x="10" y="48" width="6"  height="6"  rx="1" fill="#fbbf24"/>
                  <rect x="26" y="6"  width="3"  height="3"/>
                  <rect x="32" y="6"  width="3"  height="3"/>
                  <rect x="26" y="12" width="3"  height="3"/>
                  <rect x="26" y="20" width="3"  height="3"/>
                  <rect x="32" y="20" width="3"  height="3"/>
                  <rect x="38" y="20" width="3"  height="3"/>
                  <rect x="6"  y="26" width="3"  height="3"/>
                  <rect x="14" y="26" width="3"  height="3"/>
                  <rect x="22" y="32" width="3"  height="3"/>
                  <rect x="30" y="38" width="3"  height="3"/>
                  <rect x="42" y="32" width="3"  height="3"/>
                  <rect x="48" y="38" width="3"  height="3"/>
                  <rect x="54" y="44" width="3"  height="3"/>
                  <rect x="38" y="44" width="3"  height="3"/>
                  <rect x="32" y="52" width="3"  height="3"/>
                  <rect x="44" y="56" width="3"  height="3"/>
                </g>
              </svg>
              <span class="qr-caption">SCAN TO VERIFY</span>
              <span v-if="identity?.status === 'ISSUED'" class="qr-scan-ring" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Motion>
    </div>

    <!-- Scan-to-verify modal -->
    <OnbModal :open="scanOpen" title="Verify identity badge"
      subtitle="Confirm this badge belongs to the joiner on screen"
      :icon="ScanLine" :width="480" @close="scanOpen = false">
      <div class="scan-body">
        <div class="scan-rail">
          <div class="scan-line" />
          <div class="scan-grid">
            <span v-for="i in 16" :key="i" />
          </div>
        </div>
        <ul class="scan-meta">
          <li>
            <span class="scan-meta-label">Badge holder</span>
            <span class="scan-meta-value">{{ employeeMeta.name }}</span>
          </li>
          <li>
            <span class="scan-meta-label">Employee code</span>
            <span class="scan-meta-value onb-mono">{{ employeeMeta.code || 'EMP—' }}</span>
          </li>
          <li>
            <span class="scan-meta-label">Email</span>
            <span class="scan-meta-value onb-mono">{{ form.official_email || '—' }}</span>
          </li>
          <li>
            <span class="scan-meta-label">RFID</span>
            <span class="scan-meta-value onb-mono">{{ form.rfid_card_number || '—' }}</span>
          </li>
          <li>
            <span class="scan-meta-label">Payload</span>
            <span class="scan-meta-value onb-mono scan-payload">{{ form.qr_payload || '—' }}</span>
          </li>
        </ul>
        <p class="scan-hint">
          <CheckCircle2 :size="13" />
          Acknowledge that you have physically verified this badge against the joiner's photo
          and government ID before continuing.
        </p>
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="scanOpen = false">Cancel</button>
        <a v-if="form.qr_payload" :href="form.qr_payload" target="_blank" rel="noopener" class="onb-btn-ghost">
          <ExternalLink :size="13" /> Open payload URL
        </a>
        <button class="onb-btn-primary" @click="acknowledgeScan">
          <ShieldCheck :size="13" /> Mark verified
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Motion } from 'motion-v'
import { IdCard, Sparkles, ScanLine, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbField from '../components/OnbField.vue'
import OnbModal from '../components/OnbModal.vue'
import { fetchProcessDetail } from '../composables/useOnboarding'
import { fetchIdentity, patchIdentity, issueIdentity, revokeIdentity } from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const processId = ref('')
const identity = ref(null)
const employeeMeta = reactive({ name: '', code: '', designation: '', department: '', employeeId: '' })
const form = reactive({
  official_email: '', username: '', biometric_id: '', rfid_card_number: '',
  access_card_number: '', photo_url: '', qr_payload: '',
})

const initials = computed(() =>
  (employeeMeta.name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
)

const onProcessChange = () => reload()

const reload = async () => {
  if (!processId.value) return
  try {
    const detail = await fetchProcessDetail(processId.value)
    employeeMeta.name = detail.process.employee_name
    employeeMeta.code = detail.process.employee_code
    employeeMeta.designation = detail.process.employee_designation
    employeeMeta.department = detail.process.employee_department
    employeeMeta.employeeId = detail.process.employee_id
    identity.value = detail.identity || await fetchIdentity(employeeMeta.employeeId)
    Object.assign(form, {
      official_email: identity.value?.official_email || '',
      username: identity.value?.username || '',
      biometric_id: identity.value?.biometric_id || '',
      rfid_card_number: identity.value?.rfid_card_number || '',
      access_card_number: identity.value?.access_card_number || '',
      photo_url: identity.value?.photo_url || '',
      qr_payload: identity.value?.qr_payload || '',
    })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load identity') }
}

const save = async () => {
  if (!employeeMeta.employeeId) return
  try { identity.value = await patchIdentity(employeeMeta.employeeId, form); toast.success('Identity saved') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
}
const issue = async () => {
  if (!employeeMeta.employeeId) return
  await save()
  try { identity.value = await issueIdentity(employeeMeta.employeeId); toast.success('Identity issued') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Issue failed') }
}
const revoke = async () => {
  if (!confirm('Revoke this identity?')) return
  try { identity.value = await revokeIdentity(employeeMeta.employeeId); toast.success('Revoked') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Revoke failed') }
}

// ─── Scan-to-verify ───
const scanOpen = ref(false)
const openScan = () => {
  if (!identity.value || identity.value.status !== 'ISSUED' || !form.qr_payload) {
    toast.info('Issue the identity first, then scan to verify.')
    return
  }
  scanOpen.value = true
}
const acknowledgeScan = () => {
  scanOpen.value = false
  toast.success('Badge verified')
}
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-identity { display: flex; flex-direction: column; gap: 16px; }

.id-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

.id-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
@media (max-width: 1050px) { .id-grid { grid-template-columns: 1fr; } }

.id-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .3s var(--hr-spring), box-shadow .3s var(--hr-spring);
}
.id-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.07), transparent 35%),
    radial-gradient(70% 60% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 70%);
  pointer-events: none; z-index: -1;
}
.id-card:hover { border-color: rgba(251, 191, 36, 0.28); box-shadow: var(--onb-glass-shadow-hi); }
.card-head { padding: 18px 22px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.card-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.card-sub { margin: 6px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.status-pill {
  font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); margin-left: 8px;
}
.status-pill[data-status="ISSUED"]  { background: rgba(52, 211, 153, 0.18); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.status-pill[data-status="REVOKED"] { background: rgba(248, 113, 113, 0.18); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }

.form-grid { padding: 18px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-foot { padding: 16px 22px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
.onb-mono { font-family: var(--hr-mono); }

/* Badge preview */
.badge-stage {
  position: relative;
  padding: 32px 20px;
  background:
    radial-gradient(60% 60% at 50% 0%,  rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(60% 60% at 50% 100%, rgba(249, 115, 22, 0.14), transparent 60%);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.badge-stage::before {
  content: ''; position: absolute;
  width: 240px; height: 240px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.18), transparent 70%);
  filter: blur(40px);
  animation: onb-aurora 10s ease-in-out infinite;
  pointer-events: none;
}
.badge-card-inner {
  position: relative;
  width: 280px;
  background: linear-gradient(180deg, rgba(28, 20, 16, 0.95), rgba(15, 10, 7, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 22px;
  padding: 20px;
  text-align: center;
  box-shadow:
    0 36px 70px -28px rgba(251, 146, 60, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 0 0 1px rgba(251, 191, 36, 0.08);
  backdrop-filter: blur(20px);
}
.badge-card-inner.is-issued::after {
  content: '';
  position: absolute; inset: -2px; border-radius: inherit;
  background: linear-gradient(120deg, transparent, rgba(52, 211, 153, 0.6), transparent);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  padding: 2px; -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
.badge-strip {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase;
  margin-bottom: 18px;
}
.strip-brand { color: var(--hr-accent-gold); font-weight: 800; }
.strip-state { font-weight: 700; padding: 2px 7px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.strip-state[data-status="ISSUED"]  { background: rgba(52, 211, 153, 0.18); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.strip-state[data-status="REVOKED"] { background: rgba(248, 113, 113, 0.18); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.badge-photo {
  width: 96px; height: 96px; margin: 0 auto 12px;
  border-radius: 24px;
  background-color: var(--hr-accent-gold);
  background-image: var(--hr-gradient-hero);
  background-size: cover; background-position: center;
  display: inline-flex; align-items: center; justify-content: center;
  color: #1f1408; font-weight: 800; font-size: 30px;
  border: 3px solid rgba(251, 191, 36, 0.45);
}
.badge-name { font-size: 17px; font-weight: 800; color: var(--hr-text); }
.badge-meta { display: inline-flex; gap: 6px; align-items: center; justify-content: center;
  font-size: 11px; color: var(--hr-text-muted); margin-top: 3px; }
.badge-meta .dot { opacity: 0.6; }
.badge-qr {
  position: relative;
  margin-top: 16px; padding-top: 14px;
  border: 0;
  background: transparent;
  border-top: 1px dashed rgba(251, 191, 36, 0.18);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; color: inherit;
  width: 100%;
  transition: transform 220ms var(--hr-spring), filter 220ms var(--hr-spring);
}
.badge-qr:hover { transform: translateY(-2px); filter: drop-shadow(0 12px 24px rgba(251, 146, 60, 0.45)); }
.badge-qr.is-disabled { opacity: 0.55; cursor: not-allowed; filter: grayscale(0.4); }
.badge-qr.is-disabled:hover { transform: none; }
.qr-caption { font-size: 9px; letter-spacing: 1.4px; color: var(--hr-accent-gold); font-weight: 700; }
.qr-scan-ring {
  position: absolute; left: 50%; top: 28px;
  width: 110px; height: 110px;
  transform: translateX(-50%);
  border: 2px solid rgba(251, 191, 36, 0.4);
  border-radius: 14px;
  pointer-events: none;
  animation: qr-scan-pulse 2.2s ease-out infinite;
}
@keyframes qr-scan-pulse {
  0%   { opacity: 0.85; transform: translateX(-50%) scale(1); }
  70%  { opacity: 0; transform: translateX(-50%) scale(1.18); }
  100% { opacity: 0; transform: translateX(-50%) scale(1.18); }
}

/* Scan modal */
.scan-body { display: flex; flex-direction: column; gap: 16px; }
.scan-rail {
  position: relative;
  height: 140px; border-radius: 14px;
  background:
    radial-gradient(80% 100% at 50% 0%, rgba(251, 146, 60, 0.18), transparent 70%),
    linear-gradient(180deg, rgba(28, 20, 14, 0.85), rgba(14, 10, 8, 0.85));
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
}
.scan-rail::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.18), transparent 70%);
  filter: blur(20px);
}
.scan-grid {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: repeat(8, 1fr); grid-auto-rows: 20px;
  gap: 6px; padding: 10px; opacity: 0.22;
}
.scan-grid span {
  background: rgba(251, 191, 36, 0.5);
  border-radius: 2px;
}
.scan-grid span:nth-child(odd)  { background: rgba(251, 191, 36, 0.32); }
.scan-grid span:nth-child(3n)   { background: rgba(251, 146, 60, 0.42); }
.scan-line {
  position: absolute; left: 0; right: 0; height: 3px; top: 10%;
  background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent);
  box-shadow: 0 0 18px var(--hr-accent-gold);
  animation: scan-sweep 2.4s ease-in-out infinite;
}
@keyframes scan-sweep {
  0%   { top: 5%;  opacity: 0.4; }
  50%  { top: 90%; opacity: 1; }
  100% { top: 5%;  opacity: 0.4; }
}
.scan-meta { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.scan-meta li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  gap: 14px;
}
.scan-meta-label { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--hr-text-muted); }
.scan-meta-value { font-size: 12.5px; color: var(--hr-text); text-align: right; word-break: break-all; }
.scan-payload { font-size: 11px; color: var(--hr-accent-gold); }
.scan-hint {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 0; padding: 10px 12px;
  background: rgba(52, 211, 153, 0.10);
  border: 1px solid rgba(52, 211, 153, 0.28);
  border-radius: 10px;
  color: #34d399; font-size: 11.5px; line-height: 1.55;
}
.scan-hint > svg { flex-shrink: 0; }
</style>
