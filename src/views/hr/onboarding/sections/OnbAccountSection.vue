<template>
  <section class="onb-acc">
    <Motion as="header" class="onb-section-banner ac-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> ERP · email · VPN · biometric · git · slack</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Account</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Provisioning</span>
        </h2>
        <p class="onb-banner-sub">IT setup tracker — one card per system. Hover any card to reveal the delete control in the top-right; use <strong>Revoke</strong> to disable temporarily, <strong>Delete</strong> to remove the row entirely.</p>
      </div>
      <div class="onb-banner-aside" v-if="processId && accounts.length">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ accounts.filter(a => a.status === 'ACTIVE').length }}</span>
          <span class="onb-banner-stat-label">Active</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ accounts.length }}</span>
          <span class="onb-banner-stat-label">Total</span>
        </div>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="reload" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><KeyRound :size="22" /></div>
      <p>Pick a joiner to see their account provisioning state.</p>
    </div>

    <div v-else class="ac-grid">
      <Motion v-for="(ap, i) in accounts" :key="ap.id"
        as="article" class="ac-card onb-card" :data-status="ap.status"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="ac-card-head">
          <div class="ac-card-id">
            <span class="ac-card-icon" :data-type="ap.account_type"><component :is="iconFor(ap.account_type)" :size="14" /></span>
            <div>
              <div class="ac-card-title">{{ labelFor(ap.account_type) }}</div>
              <div class="ac-card-sub onb-mono">{{ ap.account_type }}</div>
            </div>
          </div>
          <div class="ac-card-tools">
            <span class="ac-pill" :data-status="ap.status">{{ ap.status }}</span>
            <button class="ac-card-del" :title="`Delete ${labelFor(ap.account_type)}`" :aria-label="`Delete ${labelFor(ap.account_type)}`" @click="confirmDelete(ap)">
              <Trash2 :size="13" />
            </button>
          </div>
        </header>
        <!-- ERP = the real login: grant credentials on the linked User -->
        <template v-if="ap.account_type === 'ERP'">
          <div class="ac-card-body erp-body">
            <template v-if="ap.has_login">
              <div class="erp-field">
                <label class="erp-lab">Login username</label>
                <div class="erp-username onb-mono"><AtSign :size="13" />{{ ap.login_email }}</div>
                <span class="erp-sub">= work email · used to sign in at /authentication/user/login</span>
              </div>

              <div class="erp-state">
                <span class="erp-chip" :class="ap.login_is_active ? 'ok' : 'off'">
                  <component :is="ap.login_is_active ? CheckCircle2 : XCircle" :size="12" />{{ ap.login_is_active ? 'Login enabled' : 'Login disabled' }}
                </span>
                <span class="erp-chip" :class="ap.login_is_activated ? 'ok' : 'warn'">
                  <component :is="ap.login_is_activated ? CheckCircle2 : Clock" :size="12" />{{ ap.login_is_activated ? 'Activated' : 'Not activated' }}
                </span>
              </div>

              <div class="erp-field">
                <label class="erp-lab">{{ ap.login_is_activated ? 'Reset password' : 'Set password' }}</label>
                <div class="erp-pw">
                  <Lock :size="13" class="erp-pw-ico" />
                  <input :type="pwShow[ap.id] ? 'text' : 'password'" v-model="pwInput[ap.id]"
                    placeholder="Min 8 characters" autocomplete="new-password" spellcheck="false" />
                  <button class="erp-eye" type="button" :title="pwShow[ap.id] ? 'Hide' : 'Show'" @click="pwShow[ap.id] = !pwShow[ap.id]">
                    <component :is="pwShow[ap.id] ? EyeOff : Eye" :size="14" />
                  </button>
                  <button class="erp-gen" type="button" @click="autogen(ap)"><Sparkles :size="12" />Auto</button>
                </div>
              </div>

              <div v-if="handover[ap.id]" class="erp-handover">
                <ShieldCheck :size="14" />
                <div class="erp-ho-body">
                  <span class="erp-ho-lab">Login granted — hand this to the joiner (shown once)</span>
                  <code class="onb-mono">{{ handover[ap.id] }}</code>
                </div>
                <button class="erp-copy" type="button" title="Copy" @click="copyHandover(ap)"><Copy :size="13" /></button>
              </div>

              <p class="erp-note"><Info :size="12" />Granting login activates the account directly — no whitelist or 8-digit activation code needed for this joiner.</p>
              <OnbField :model-value="ap.notes || ''" @update:model-value="v => ap.notes = v" type="textarea" label="Notes" placeholder="Any custom config..." :rows="2" />
            </template>
            <div v-else class="erp-nolink">
              <AlertTriangle :size="16" />
              <span>No linked user account for this employee. Re-create the employee with a work email so a login can be provisioned.</span>
            </div>
          </div>
          <footer class="ac-card-foot">
            <button class="onb-btn-ghost" @click="save(ap)">Save notes</button>
            <button v-if="ap.has_login" class="onb-btn-primary" :disabled="busyId === ap.id" @click="grantLogin(ap)">
              <KeyRound :size="13" />{{ ap.login_is_active && ap.login_is_activated ? 'Reset / re-grant' : 'Grant login' }}
            </button>
            <button v-if="ap.has_login && ap.login_is_active" class="onb-btn-danger" :disabled="busyId === ap.id" @click="revoke(ap)"><XCircle :size="13" />Revoke</button>
          </footer>
        </template>

        <!-- All other systems: IT tracking record only -->
        <template v-else>
          <div class="ac-card-body">
            <OnbField :model-value="ap.system_username || ''" @update:model-value="v => ap.system_username = v" label="System username" placeholder="alex.doe" />
            <OnbField :model-value="ap.notes || ''" @update:model-value="v => ap.notes = v" type="textarea" label="Notes" placeholder="Any custom config..." :rows="2" />
          </div>
          <footer class="ac-card-foot">
            <button class="onb-btn-ghost" @click="save(ap)">Save</button>
            <button v-if="ap.status !== 'ACTIVE'"   class="onb-btn-primary" @click="activate(ap)"><CheckCircle2 :size="13" />Activate</button>
            <button v-if="ap.status === 'ACTIVE'"   class="onb-btn-danger"  @click="revoke(ap)"><XCircle :size="13" />Revoke</button>
          </footer>
        </template>
      </Motion>

      <Motion as="button" class="ac-card ac-add" @click="showAdd = true"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * accounts.length, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3, transition: { duration: 0.18 } }"
      >
        <Plus :size="22" />
        <span>Add account</span>
      </Motion>
    </div>

    <OnbModal :open="showAdd" title="Add account" subtitle="Add a system account to this joiner" :icon="KeyRound" :width="460" @close="showAdd = false">
      <div class="form-stack">
        <OnbField
          v-model="newAccount.account_type"
          label="Account type"
          type="select"
          full
          :options="TYPES.map(t => ({ value: t, label: labelFor(t) }))"
        />
        <OnbField v-model="newAccount.system_username" label="System username" placeholder="alex.doe" full />
        <OnbField v-model="newAccount.notes" type="textarea" label="Notes (optional)" full />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showAdd = false">Cancel</button>
        <button class="onb-btn-primary" @click="doAdd"><Plus :size="13" />Add account</button>
      </template>
    </OnbModal>

    <OnbModal
      :open="!!pendingDelete"
      title="Delete account?"
      :subtitle="pendingDelete ? `Permanently remove the ${labelFor(pendingDelete.account_type)} provisioning record.` : ''"
      :icon="AlertTriangle"
      :width="420"
      @close="pendingDelete = null"
    >
      <p class="ac-confirm-text">
        This will permanently delete the
        <strong v-if="pendingDelete">{{ labelFor(pendingDelete.account_type) }}</strong>
        provisioning entry for this joiner. To temporarily disable instead, use <strong>Revoke</strong>.
      </p>
      <template #footer>
        <button class="onb-btn-ghost" @click="pendingDelete = null">Cancel</button>
        <button class="onb-btn-danger" @click="doDelete"><Trash2 :size="13" />Delete</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  KeyRound, Plus, CheckCircle2, XCircle, Trash2, AlertTriangle,
  Mail, Server, Wifi, Fingerprint, Clock, IdCard, GitBranch, MessagesSquare, HardDrive, MoreHorizontal,
  AtSign, Lock, Eye, EyeOff, Sparkles, ShieldCheck, Copy, Info,
} from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchProcessDetail } from '../composables/useOnboarding'
import {
  fetchAccountsByEmployee, createAccount, patchAccount, activateAccount, revokeAccount, deleteAccount,
  setAccountCredentials,
} from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])

const toast = useToast()
const TYPES = ['ERP','EMAIL','VPN','BIOMETRIC','ATTENDANCE','RFID_SYSTEM','GIT','SLACK','DRIVE','OTHER']
const labels = {
  ERP: 'ERP Login', EMAIL: 'Official Email', VPN: 'VPN', BIOMETRIC: 'Biometric',
  ATTENDANCE: 'Attendance', RFID_SYSTEM: 'RFID System', GIT: 'Git', SLACK: 'Slack',
  DRIVE: 'Drive', OTHER: 'Other',
}
const labelFor = (t) => labels[t] || t
const iconFor = (t) => ({
  ERP: Server, EMAIL: Mail, VPN: Wifi, BIOMETRIC: Fingerprint, ATTENDANCE: Clock,
  RFID_SYSTEM: IdCard, GIT: GitBranch, SLACK: MessagesSquare, DRIVE: HardDrive, OTHER: MoreHorizontal,
})[t] || MoreHorizontal

const processId = ref('')
const employeeId = ref(null)
const accounts = ref([])

// ERP login credential state (keyed by provisioning row id)
const pwInput = reactive({})   // typed/generated password
const pwShow = reactive({})    // reveal toggle
const handover = reactive({})  // password shown once after a grant
const busyId = ref(null)

const genPassword = (n = 12) => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%*?']
  const all = sets.join('')
  const out = sets.map(s => s[Math.floor(Math.random() * s.length)])
  while (out.length < n) out.push(all[Math.floor(Math.random() * all.length)])
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[out[i], out[j]] = [out[j], out[i]] }
  return out.join('')
}
const autogen = (ap) => { pwInput[ap.id] = genPassword(); pwShow[ap.id] = true }
const copyHandover = (ap) => {
  try { navigator.clipboard?.writeText(handover[ap.id]); toast.success('Password copied') } catch {}
}
const grantLogin = async (ap) => {
  const pw = (pwInput[ap.id] || '').trim()
  const alreadyLive = ap.login_is_active && ap.login_is_activated
  if (!pw && !alreadyLive) { toast.error('Enter or auto-generate a password to grant the login'); return }
  if (pw && pw.length < 8) { toast.error('Password must be at least 8 characters'); return }
  busyId.value = ap.id
  try {
    await setAccountCredentials(ap.id, { password: pw || null, auto_generate: false, activate: true })
    if (pw) handover[ap.id] = pw          // surface once for handover
    pwInput[ap.id] = ''
    await reload()
    toast.success('ERP login granted — the employee can sign in now')
    emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not grant login') }
  finally { busyId.value = null }
}

const showAdd = ref(false)
const newAccount = reactive({ account_type: 'VPN', system_username: '', notes: '' })

const pendingDelete = ref(null)
const confirmDelete = (ap) => { pendingDelete.value = ap }
const doDelete = async () => {
  if (!pendingDelete.value) return
  try {
    await deleteAccount(pendingDelete.value.id)
    pendingDelete.value = null
    await reload()
    toast.success('Account deleted')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
}

const reload = async () => {
  if (!processId.value) return
  try {
    const detail = await fetchProcessDetail(processId.value)
    employeeId.value = detail.process.employee_id
    accounts.value = await fetchAccountsByEmployee(employeeId.value)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load accounts') }
}

const save = async (ap) => {
  try {
    await patchAccount(ap.id, { system_username: ap.system_username, notes: ap.notes })
    toast.success('Saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
}
const activate = async (ap) => {
  try { await activateAccount(ap.id); await reload(); toast.success('Activated') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Activate failed') }
}
const revoke = async (ap) => {
  try { await revokeAccount(ap.id); await reload(); toast.success('Revoked') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Revoke failed') }
}
const doAdd = async () => {
  try {
    await createAccount({ employee_id: employeeId.value, process_id: processId.value, ...newAccount })
    showAdd.value = false
    Object.assign(newAccount, { account_type: 'VPN', system_username: '', notes: '' })
    await reload()
    toast.success('Account added')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Add failed') }
}

onMounted(() => {})
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-acc { display: flex; flex-direction: column; gap: 16px; }

.ac-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.ac-banner strong { color: var(--hr-accent-gold); font-weight: 700; }

.ac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.ac-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  overflow: hidden;
  display: flex; flex-direction: column;
  isolation: isolate;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .25s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring);
}
.ac-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    radial-gradient(70% 50% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 70%);
  pointer-events: none; z-index: -1;
}
.ac-card:hover {
  transform: translateY(-3px);
  border-color: rgba(251, 191, 36, 0.32);
  box-shadow: 0 30px 70px -32px rgba(251, 146, 60, 0.4);
}
.ac-card[data-status="ACTIVE"]   { border-color: rgba(52, 211, 153, 0.40); }
.ac-card[data-status="REVOKED"]  { border-color: rgba(248, 113, 113, 0.40); }
.ac-card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.ac-card-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ac-card-icon { width: 30px; height: 30px; border-radius: 9px; background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ac-card-icon[data-type="EMAIL"]   { background: rgba(251, 146, 60, 0.16); color: #fb923c; }
.ac-card-icon[data-type="GIT"]     { background: rgba(192, 132, 252, 0.16); color: #c084fc; }
.ac-card-icon[data-type="SLACK"]   { background: rgba(52, 211, 153, 0.16); color: #34d399; }
.ac-card-title { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.ac-card-sub { font-size: 10px; color: var(--hr-text-muted); margin-top: 1px; }
.onb-mono { font-family: var(--hr-mono); }

.ac-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px; padding: 3px 8px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.ac-pill[data-status="ACTIVE"]   { background: rgba(52, 211, 153, 0.16); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.ac-pill[data-status="REVOKED"]  { background: rgba(248, 113, 113, 0.16); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.ac-pill[data-status="REQUESTED"]{ background: rgba(251, 146, 60, 0.16); color: #fb923c; border-color: rgba(251, 146, 60, 0.32); }

.ac-card-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.ac-card-foot { padding: 14px 18px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); }

.ac-add {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; min-height: 260px; cursor: pointer;
  background: rgba(251, 191, 36, 0.04);
  border: 1.5px dashed rgba(251, 191, 36, 0.32); color: var(--hr-accent-gold);
  border-radius: 20px;
  backdrop-filter: blur(14px);
  transition: border-color .25s var(--hr-spring), color .25s var(--hr-spring), background .25s var(--hr-spring), transform .25s var(--hr-spring);
  font: inherit; font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px;
  overflow: hidden;
}
.ac-add::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 60% at 50% 50%, rgba(251, 146, 60, 0.16), transparent 70%);
  opacity: 0; transition: opacity .3s var(--hr-spring);
}
.ac-add:hover {
  border-color: var(--hr-accent-gold);
  color: var(--hr-accent-gold);
  background: rgba(251, 191, 36, 0.10);
  transform: translateY(-3px);
}
.ac-add:hover::before { opacity: 1; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }

/* Card tools (status pill + delete button) */
.ac-card-tools {
  display: inline-flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.ac-card-del {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 10px;
  color: #fca5a5;
  cursor: pointer;
  opacity: 0.85;
  position: relative;
  transition: opacity .18s var(--hr-spring),
              background .2s var(--hr-spring),
              border-color .2s var(--hr-spring),
              color .2s var(--hr-spring),
              transform .15s var(--hr-spring);
}
.ac-card-del::after {
  content: ''; position: absolute; inset: -3px; border-radius: 12px;
  background: radial-gradient(closest-side, rgba(248, 113, 113, 0.45), transparent 70%);
  opacity: 0; transition: opacity .25s var(--hr-spring);
  z-index: -1;
}
.ac-card:hover .ac-card-del { opacity: 1; }
.ac-card-del:hover {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.65);
  color: #f87171;
  transform: rotate(-8deg) scale(1.08);
}
.ac-card-del:hover::after { opacity: 1; }
.ac-card-del:active { transform: scale(0.94); }

.ac-confirm-text {
  font-size: 13px;
  line-height: 1.55;
  color: var(--hr-text-secondary);
  margin: 0;
}
.ac-confirm-text strong { color: var(--hr-text); font-weight: 700; }

/* ── ERP login (credential) card ───────────────────────────────────────── */
.erp-body { gap: 13px; }
.erp-field { display: flex; flex-direction: column; gap: 5px; }
.erp-lab { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--hr-text-muted); }
.erp-username {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 600;
  color: var(--hr-text); background: rgba(251, 191, 36, 0.07); border: 1px solid var(--hr-border-warm);
}
.erp-username svg { color: var(--hr-accent-gold); flex-shrink: 0; }
.erp-sub { font-size: 10.5px; color: var(--hr-text-dim); }

.erp-state { display: flex; flex-wrap: wrap; gap: 7px; }
.erp-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  border: 1px solid transparent; }
.erp-chip.ok { background: rgba(52, 211, 153, 0.14); color: #34d399; border-color: rgba(52, 211, 153, 0.30); }
.erp-chip.off { background: rgba(248, 113, 113, 0.14); color: #f87171; border-color: rgba(248, 113, 113, 0.30); }
.erp-chip.warn { background: rgba(251, 146, 60, 0.14); color: #fb923c; border-color: rgba(251, 146, 60, 0.30); }

.erp-pw { display: flex; align-items: center; gap: 6px; padding: 4px 6px 4px 11px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.22); border: 1px solid rgba(255, 255, 255, 0.10); }
.erp-pw-ico { color: var(--hr-text-muted); flex-shrink: 0; }
.erp-pw input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--hr-text); font-size: 13px; font-family: var(--hr-mono); letter-spacing: 0.04em; }
.erp-pw input::placeholder { color: var(--hr-text-dim); font-family: inherit; letter-spacing: 0; }
.erp-eye { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: none; color: var(--hr-text-muted); transition: color .2s, background .2s; }
.erp-eye:hover { color: var(--hr-text); background: rgba(255, 255, 255, 0.06); }
.erp-gen { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 6px 10px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700;
  background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-border-warm); color: var(--hr-accent-gold); transition: background .2s; }
.erp-gen:hover { background: rgba(251, 191, 36, 0.16); }
[data-theme="light"] .erp-pw { background: rgba(255, 250, 242, 0.7); border-color: rgba(60, 45, 20, 0.14); }

.erp-handover { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  background: rgba(52, 211, 153, 0.10); border: 1px solid rgba(52, 211, 153, 0.30); }
.erp-handover > svg { color: #34d399; flex-shrink: 0; }
.erp-ho-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.erp-ho-lab { font-size: 10.5px; font-weight: 600; color: var(--hr-text-secondary); }
.erp-ho-body code { font-size: 14px; font-weight: 800; color: #34d399; letter-spacing: 0.06em; }
.erp-copy { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.30); color: #34d399; }
.erp-copy:hover { background: rgba(52, 211, 153, 0.22); }

.erp-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 10.5px; line-height: 1.45; color: var(--hr-text-muted); }
.erp-note svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }

.erp-nolink { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 12px; font-size: 12px; line-height: 1.45;
  color: var(--hr-text-secondary); background: rgba(248, 113, 113, 0.10); border: 1px solid rgba(248, 113, 113, 0.28); }
.erp-nolink svg { color: #f87171; flex-shrink: 0; }
</style>
