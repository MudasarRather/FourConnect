<template>
  <div class="acc-panel">
    <!-- ═══════════ Loading ═══════════ -->
    <div v-if="loading && !loaded" class="acc-loading">
      <Loader2 class="spin" :size="20" />
      <span>Loading access…</span>
    </div>

    <template v-else>
      <!-- ═══════════ Console hero ═══════════ -->
      <Motion as="section" class="acc-hero" :class="`login-${loginState}`"
        :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <span class="acc-grain" aria-hidden="true" />
        <span class="acc-aura" aria-hidden="true" />

        <div class="acc-hero-lead">
          <span class="acc-eyebrow"><span class="eb-dot" /><KeyRound :size="12" /> Access · Provisioning</span>
          <h2 class="acc-title">System Access &amp;<span class="acc-title-accent"> Credentials</span></h2>
          <p class="acc-sub">
            The ERP sign-in and every IT system this employee is provisioned for — one keyring.
            Grant or reset the login, track each system, and revoke access when they move on.
          </p>

          <!-- Telemetry lenses -->
          <div class="acc-lenses">
            <div class="acc-lens" :class="`tone-${loginLens.tone}`">
              <span class="lens-ico"><KeyRound :size="14" /></span>
              <span class="lens-val">{{ loginLens.label }}</span>
              <span class="lens-lab">ERP Login</span>
              <span class="lens-bar" />
            </div>
            <div class="acc-lens tone-ok">
              <span class="lens-ico"><CheckCircle2 :size="14" /></span>
              <span class="lens-val">{{ activeCount }}</span>
              <span class="lens-lab">Active</span>
              <span class="lens-bar" />
            </div>
            <div class="acc-lens">
              <span class="lens-ico"><ShieldCheck :size="14" /></span>
              <span class="lens-val">{{ totalCount }}</span>
              <span class="lens-lab">Provisioned</span>
              <span class="lens-bar" />
            </div>
            <div class="acc-lens" :class="revokedCount ? 'tone-danger' : ''">
              <span class="lens-ico"><XCircle :size="14" /></span>
              <span class="lens-val">{{ revokedCount }}</span>
              <span class="lens-lab">Revoked</span>
              <span class="lens-bar" />
            </div>
          </div>
        </div>

        <!-- ═══ Signature instrument — The Keyring ═══ -->
        <div class="acc-instrument">
          <div class="kr" :class="[`tone-${erpTone}`, { reduced }]" aria-hidden="true">
            <span class="kr-glow" />
            <span class="kr-post" />
            <span class="kr-loop" />
            <div class="kr-swing">
              <!-- master ERP key -->
              <div class="kr-fob master" :class="`st-${erpTone}`">
                <span class="kr-string" />
                <span class="kr-key"><KeyRound :size="18" /></span>
                <span class="kr-tag">ERP</span>
              </div>
              <!-- system fobs -->
              <div v-for="f in fobs" :key="f.id" class="kr-fob" :class="`st-${toneOf(f.status)}`" :style="{ '--d': f._i }">
                <span class="kr-string" />
                <span class="kr-chip"><component :is="iconFor(f.account_type)" :size="13" /></span>
                <span class="kr-tag">{{ shortFor(f.account_type) }}</span>
              </div>
              <div v-if="overflow" class="kr-fob more">
                <span class="kr-string" />
                <span class="kr-chip">+{{ overflow }}</span>
              </div>
            </div>
          </div>
          <div class="kr-meter">
            <div class="kr-meter-track"><span class="kr-meter-fill" :style="{ width: accessPct + '%' }" /></div>
            <span class="kr-meter-cap">{{ activeCount }}/{{ totalCount }} systems live · {{ accessPct }}%</span>
          </div>
        </div>
      </Motion>

      <!-- ═══════════ Lifecycle lock banner ═══════════ -->
      <Motion v-if="!isEmployable && totalCount" as="div" class="acc-lock"
        :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.08 }">
        <ShieldAlert :size="15" />
        <span><strong>{{ displayName }}</strong> {{ lockReason }} — provisioning <em>new</em> access is locked.
          You can still <strong>revoke</strong> or <strong>remove</strong> existing access.</span>
      </Motion>

      <!-- ═══════════ ERP login card ═══════════ -->
      <Motion v-if="erp" as="article" class="erp-card" :data-state="loginState"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <span class="erp-spine" />
        <header class="erp-head">
          <span class="erp-head-ico"><KeyRound :size="16" /></span>
          <div class="erp-head-text">
            <h3>ERP Login</h3>
            <p>Primary sign-in · username is the work email</p>
          </div>
          <span class="erp-stamp" :class="`st-${erpTone}`">
            <component :is="stampIcon" :size="12" />{{ loginLens.label }}
          </span>
        </header>

        <div v-if="erp.has_login" class="erp-body">
          <div class="erp-field">
            <label class="erp-lab">Login username</label>
            <div class="erp-username mono"><AtSign :size="13" />{{ erp.login_email }}</div>
          </div>

          <div class="erp-state">
            <span class="erp-chip" :class="erp.login_is_active ? 'ok' : 'off'">
              <component :is="erp.login_is_active ? CheckCircle2 : XCircle" :size="12" />
              {{ erp.login_is_active ? 'Login enabled' : 'Login disabled' }}
            </span>
            <span class="erp-chip" :class="erp.login_is_activated ? 'ok' : 'warn'">
              <component :is="erp.login_is_activated ? CheckCircle2 : Clock" :size="12" />
              {{ erp.login_is_activated ? 'Activated' : 'Not activated' }}
            </span>
            <span v-if="erp.activated_at" class="erp-chip neutral"><Clock :size="12" />Since {{ fmtDate(erp.activated_at) }}</span>
          </div>

          <div v-if="isEmployable" class="erp-field">
            <label class="erp-lab">{{ erp.login_is_activated ? 'Reset password' : 'Set password' }}</label>
            <div class="erp-pw">
              <Lock :size="13" class="erp-pw-ico" />
              <input :type="pwShow[erp.id] ? 'text' : 'password'" v-model="pwInput[erp.id]"
                placeholder="Min 8 characters" autocomplete="new-password" spellcheck="false"
                @keyup.enter="grantLogin(erp)" />
              <button class="erp-eye" type="button" :title="pwShow[erp.id] ? 'Hide' : 'Show'" @click="pwShow[erp.id] = !pwShow[erp.id]">
                <component :is="pwShow[erp.id] ? EyeOff : Eye" :size="14" />
              </button>
              <button class="erp-gen" type="button" @click="autogen(erp)"><Sparkles :size="12" />Auto</button>
            </div>
          </div>

          <Transition name="erp-ho">
            <div v-if="handover[erp.id]" class="erp-handover">
              <ShieldCheck :size="15" />
              <div class="erp-ho-body">
                <span class="erp-ho-lab">Login granted — hand this to the employee (shown once)</span>
                <code class="mono">{{ handover[erp.id] }}</code>
              </div>
              <button class="erp-copy" type="button" title="Copy password" @click="copyHandover(erp)"><Copy :size="13" /></button>
            </div>
          </Transition>

          <p v-if="isEmployable" class="erp-note"><Info :size="12" />Granting the login activates the account directly — no whitelist or 8-digit activation code needed for this employee.</p>
        </div>

        <div v-else class="erp-nolink">
          <AlertTriangle :size="16" />
          <span>No linked user account for this employee. Add a work email on the Basic Info tab so a login can be provisioned.</span>
        </div>

        <footer class="erp-foot">
          <button
            v-if="erp.has_login && isEmployable"
            class="acc-btn primary" :disabled="busyId === erp.id" @click="grantLogin(erp)">
            <Loader2 v-if="busyId === erp.id" class="spin" :size="13" />
            <KeyRound v-else :size="13" />
            {{ erp.login_is_active && erp.login_is_activated ? 'Reset / re-grant login' : 'Grant login' }}
          </button>
          <button
            v-if="erp.has_login && erp.login_is_active"
            class="acc-btn danger" :disabled="busyId === erp.id" @click="revokeRow(erp)">
            <XCircle :size="13" />Revoke login
          </button>
        </footer>
      </Motion>

      <!-- ═══════════ Empty state (no accounts at all) ═══════════ -->
      <div v-if="totalCount === 0" class="acc-empty">
        <div class="acc-empty-mark"><KeyRound :size="26" /></div>
        <h3>No access provisioned yet</h3>
        <p>This employee has no ERP login or system accounts on record. Provision their first access to get started.</p>
        <button class="acc-btn primary" :disabled="!isEmployable" @click="openAdd">
          <Plus :size="14" />Provision access
        </button>
        <span v-if="!isEmployable" class="acc-empty-lock"><Lock :size="11" /> Locked — employee {{ lockReason }}</span>
      </div>

      <!-- ═══════════ System accounts grid ═══════════ -->
      <div v-else class="acc-grid">
        <Motion v-for="(ap, i) in systems" :key="ap.id" as="div" class="sys-shell"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.04 * i + 0.1, ease: [0.16, 1, 0.3, 1] }">
          <article class="sys-card" :data-status="ap.status">
            <span class="sys-glare" aria-hidden="true" />
            <span class="sys-spine" />
            <header class="sys-head">
              <span class="sys-ico" :data-type="ap.account_type"><component :is="iconFor(ap.account_type)" :size="15" /></span>
              <div class="sys-head-text">
                <div class="sys-title">{{ labelFor(ap.account_type) }}</div>
                <div class="sys-type mono">{{ ap.account_type }}</div>
              </div>
              <span class="sys-pill" :data-status="ap.status">{{ ap.status }}</span>
              <button class="sys-del" :title="`Delete ${labelFor(ap.account_type)}`" @click="askDelete(ap)"><Trash2 :size="13" /></button>
            </header>
            <div class="sys-body">
              <div class="sys-field">
                <label class="sys-lab">System username</label>
                <input class="sys-input mono" v-model="ap.system_username" placeholder="e.g. alex.doe" spellcheck="false" />
              </div>
              <div class="sys-field">
                <label class="sys-lab">Notes</label>
                <textarea class="sys-input" v-model="ap.notes" rows="2" placeholder="Any custom config…" />
              </div>
            </div>
            <footer class="sys-foot">
              <button class="acc-btn ghost" :disabled="busyId === ap.id" @click="saveRow(ap)">Save</button>
              <button v-if="ap.status !== 'ACTIVE'" class="acc-btn primary" :disabled="busyId === ap.id" @click="activateRow(ap)">
                <CheckCircle2 :size="13" />Activate
              </button>
              <button v-else class="acc-btn danger" :disabled="busyId === ap.id" @click="revokeRow(ap)">
                <XCircle :size="13" />Revoke
              </button>
            </footer>
          </article>
        </Motion>

        <!-- add card -->
        <Motion as="button" class="sys-add" :class="{ disabled: !isEmployable }"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.04 * systems.length + 0.12, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="isEmployable && !reduced ? { y: -3 } : {}"
          :title="isEmployable ? 'Provision a system account' : `Locked — employee ${lockReason}`"
          @click="openAdd">
          <component :is="isEmployable ? Plus : Lock" :size="22" />
          <span>{{ isEmployable ? 'Provision access' : 'Provisioning locked' }}</span>
        </Motion>
      </div>
    </template>

    <!-- ═══════════ Add modal ═══════════ -->
    <Teleport to="body">
      <Transition name="acc-modal">
        <div v-if="showAdd" class="acc-backdrop" @click.self="showAdd = false">
          <div class="acc-modal">
            <header class="acc-modal-head">
              <span class="acc-modal-ico"><KeyRound :size="16" /></span>
              <div>
                <h4>Provision access</h4>
                <p>Add a system account for <strong>{{ displayName }}</strong></p>
              </div>
              <button class="acc-modal-x" @click="showAdd = false"><X :size="16" /></button>
            </header>
            <div class="acc-modal-body">
              <div v-if="!availableTypes.length" class="acc-modal-note">
                <Info :size="14" />Every account type is already provisioned for this employee.
              </div>
              <template v-else>
                <div class="acc-modal-field">
                  <label>Account type</label>
                  <div class="acc-type-grid">
                    <button v-for="t in availableTypes" :key="t" type="button"
                      class="acc-type-btn" :class="{ on: newAccount.account_type === t }"
                      @click="newAccount.account_type = t">
                      <component :is="iconFor(t)" :size="15" />
                      <span>{{ labelFor(t) }}</span>
                    </button>
                  </div>
                </div>
                <div class="acc-modal-field">
                  <label>System username <span class="opt">(optional)</span></label>
                  <input class="acc-modal-input mono" v-model="newAccount.system_username" placeholder="e.g. alex.doe" spellcheck="false" />
                </div>
                <div class="acc-modal-field">
                  <label>Notes <span class="opt">(optional)</span></label>
                  <textarea class="acc-modal-input" v-model="newAccount.notes" rows="2" />
                </div>
                <p v-if="newAccount.account_type === 'ERP'" class="acc-modal-hint">
                  <Info :size="12" />ERP creates the sign-in record. Grant a password on its card to enable the actual login.
                </p>
              </template>
            </div>
            <footer class="acc-modal-foot">
              <button class="acc-btn ghost" @click="showAdd = false">Cancel</button>
              <button class="acc-btn primary" :disabled="!availableTypes.length || adding" @click="doAdd">
                <Loader2 v-if="adding" class="spin" :size="13" /><Plus v-else :size="13" />Add account
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════ Delete modal ═══════════ -->
    <Teleport to="body">
      <Transition name="acc-modal">
        <div v-if="pendingDelete" class="acc-backdrop" @click.self="pendingDelete = null">
          <div class="acc-modal danger">
            <header class="acc-modal-head">
              <span class="acc-modal-ico danger"><AlertTriangle :size="16" /></span>
              <div>
                <h4>Delete account?</h4>
                <p>Permanently remove this provisioning record</p>
              </div>
              <button class="acc-modal-x" @click="pendingDelete = null"><X :size="16" /></button>
            </header>
            <div class="acc-modal-body">
              <p class="acc-confirm">
                This permanently deletes the
                <strong>{{ pendingDelete ? labelFor(pendingDelete.account_type) : '' }}</strong>
                record for <strong>{{ displayName }}</strong>. To temporarily disable instead, use <strong>Revoke</strong>.
              </p>
            </div>
            <footer class="acc-modal-foot">
              <button class="acc-btn ghost" @click="pendingDelete = null">Cancel</button>
              <button class="acc-btn danger" :disabled="deleting" @click="doDelete">
                <Loader2 v-if="deleting" class="spin" :size="13" /><Trash2 v-else :size="13" />Delete
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  KeyRound, Server, Mail, Wifi, Fingerprint, Clock, IdCard, GitBranch, MessagesSquare,
  HardDrive, MoreHorizontal, AtSign, Lock, Eye, EyeOff, Sparkles, ShieldCheck, ShieldAlert,
  Copy, Info, CheckCircle2, XCircle, Trash2, AlertTriangle, Plus, Loader2, X,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAccountProvisioning, ACCOUNT_TYPES } from '@/composables/useAccountProvisioning'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  employee: { type: Object, default: null },
})
const emit = defineEmits(['changed'])

const toast = useToast()
const api = useAccountProvisioning()
const reduced = prefersReduced()

const accounts = ref([])
const loading = ref(false)
const loaded = ref(false)
const busyId = ref(null)

// ── Type metadata ──
const TYPE_LABEL = {
  ERP: 'ERP Login', EMAIL: 'Official Email', VPN: 'VPN', BIOMETRIC: 'Biometric',
  ATTENDANCE: 'Attendance', RFID_SYSTEM: 'RFID System', GIT: 'Git', SLACK: 'Slack',
  DRIVE: 'Drive', OTHER: 'Other',
}
const TYPE_ICON = {
  ERP: Server, EMAIL: Mail, VPN: Wifi, BIOMETRIC: Fingerprint, ATTENDANCE: Clock,
  RFID_SYSTEM: IdCard, GIT: GitBranch, SLACK: MessagesSquare, DRIVE: HardDrive, OTHER: MoreHorizontal,
}
const TYPE_SHORT = {
  ERP: 'ERP', EMAIL: '@', VPN: 'VPN', BIOMETRIC: 'BIO', ATTENDANCE: 'ATT',
  RFID_SYSTEM: 'RFID', GIT: 'GIT', SLACK: 'SLK', DRIVE: 'DRV', OTHER: '•',
}
const labelFor = (t) => TYPE_LABEL[t] || t
const iconFor = (t) => TYPE_ICON[t] || MoreHorizontal
const shortFor = (t) => TYPE_SHORT[t] || String(t).slice(0, 3)

// ── Derived state ──
const empId = computed(() => props.employee?.id || null)
const displayName = computed(() => props.employee?.user?.full_name || props.employee?.full_name || 'this employee')

const erp = computed(() => accounts.value.find(a => a.account_type === 'ERP') || null)
const systems = computed(() => accounts.value.filter(a => a.account_type !== 'ERP'))
const activeCount = computed(() => accounts.value.filter(a => a.status === 'ACTIVE').length)
const totalCount = computed(() => accounts.value.length)
const revokedCount = computed(() => accounts.value.filter(a => a.status === 'REVOKED').length)
const accessPct = computed(() => totalCount.value ? Math.round((activeCount.value / totalCount.value) * 100) : 0)

// ERP login state machine → label/tone for lens, stamp, keyring master.
const loginState = computed(() => {
  const e = erp.value
  if (!e) return 'none'
  if (!e.has_login) return 'nolink'
  if (!e.login_is_active) return 'disabled'
  if (!e.login_is_activated) return 'pending'
  return 'enabled'
})
const LOGIN_LENS = {
  none: { label: 'Not set', tone: 'muted' },
  nolink: { label: 'No linked user', tone: 'danger' },
  disabled: { label: 'Disabled', tone: 'danger' },
  pending: { label: 'Pending', tone: 'warn' },
  enabled: { label: 'Enabled', tone: 'ok' },
}
const loginLens = computed(() => LOGIN_LENS[loginState.value])
const stampIcon = computed(() => (loginState.value === 'enabled' ? ShieldCheck
  : loginState.value === 'pending' ? Clock : XCircle))
// keyring master tone: ok / wait / off / none
const erpTone = computed(() => ({
  enabled: 'ok', pending: 'wait', disabled: 'off', nolink: 'off', none: 'none',
}[loginState.value]))
const toneOf = (s) => (s === 'ACTIVE' ? 'ok' : s === 'REVOKED' ? 'off' : 'wait')

// Keyring fobs — cap at MAX_FOBS, surface overflow as a "+N" fob.
const MAX_FOBS = 6
const fobs = computed(() => systems.value.slice(0, MAX_FOBS).map((a, i) => ({ ...a, _i: i })))
const overflow = computed(() => Math.max(0, systems.value.length - MAX_FOBS))

// Lifecycle gate — mirrors backend guard_employable (ACTIVE / ON_PROBATION only
// may receive NEW access; revoke/delete/patch stay open in every state).
const EMPLOYABLE = ['ACTIVE', 'ON_PROBATION']
const isEmployable = computed(() => EMPLOYABLE.includes(props.employee?.lifecycle_state))
const lockReason = computed(() => ({
  ON_NOTICE: 'is serving notice', SUSPENDED: 'is suspended',
  EXITED: 'has exited', ARCHIVED: 'is archived', INACTIVE: 'is inactive',
}[props.employee?.lifecycle_state] || 'is not active'))

const fmtDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '' }
}

// ── Credential helpers (ERP login) ──
const pwInput = reactive({})
const pwShow = reactive({})
const handover = reactive({})

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
  try { navigator.clipboard?.writeText(handover[ap.id]); toast.success('Password copied') } catch { /* clipboard blocked */ }
}

// ── Load ──
const load = async () => {
  if (!empId.value) return
  loading.value = true
  try {
    accounts.value = await api.fetchByEmployee(empId.value)
    loaded.value = true
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load accounts')
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(empId, load)

// ── Mutations ──
const grantLogin = async (ap) => {
  const pw = (pwInput[ap.id] || '').trim()
  const wasLive = ap.login_is_active && ap.login_is_activated
  // A blank password used to silently no-op (leaving the OLD password valid)
  // while still reporting success — always require one. Pure re-activation isn't
  // offered here; the grant flow always sets a password.
  if (!pw) { toast.error(wasLive ? 'Enter or auto-generate a new password to reset the login' : 'Enter or auto-generate a password to grant the login'); return }
  if (pw.length < 8) { toast.error('Password must be at least 8 characters'); return }
  busyId.value = ap.id
  try {
    await api.setCredentials(ap.id, { password: pw, auto_generate: false, activate: true })
    handover[ap.id] = pw
    pwInput[ap.id] = ''
    await load()
    toast.success(wasLive
      ? 'Password reset — the previous password no longer works and any active session is signed out'
      : 'ERP login granted — the employee can sign in now')
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not set the login password')
  } finally {
    busyId.value = null
  }
}
const activateRow = async (ap) => {
  busyId.value = ap.id
  try { await api.activate(ap.id); await load(); toast.success('Account activated'); emit('changed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Activate failed') }
  finally { busyId.value = null }
}
const revokeRow = async (ap) => {
  busyId.value = ap.id
  try { await api.revoke(ap.id); await load(); toast.success('Access revoked'); emit('changed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Revoke failed') }
  finally { busyId.value = null }
}
const saveRow = async (ap) => {
  busyId.value = ap.id
  try { await api.patch(ap.id, { system_username: ap.system_username, notes: ap.notes }); toast.success('Saved') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { busyId.value = null }
}

// ── Add ──
const showAdd = ref(false)
const adding = ref(false)
const newAccount = reactive({ account_type: '', system_username: '', notes: '' })
const availableTypes = computed(() => ACCOUNT_TYPES.filter(t => !accounts.value.some(a => a.account_type === t)))
const openAdd = () => {
  if (!isEmployable.value) { toast.error(`Provisioning is locked — ${displayName.value} ${lockReason.value}`); return }
  newAccount.account_type = availableTypes.value[0] || ''
  newAccount.system_username = ''
  newAccount.notes = ''
  showAdd.value = true
}
const doAdd = async () => {
  if (!newAccount.account_type) return
  adding.value = true
  try {
    await api.create({
      employee_id: empId.value,
      account_type: newAccount.account_type,
      system_username: newAccount.system_username || null,
      notes: newAccount.notes || null,
    })
    showAdd.value = false
    await load()
    toast.success('Account provisioned')
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not add account')
  } finally {
    adding.value = false
  }
}

// ── Delete ──
const pendingDelete = ref(null)
const deleting = ref(false)
const askDelete = (ap) => { pendingDelete.value = ap }
const doDelete = async () => {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await api.remove(pendingDelete.value.id)
    pendingDelete.value = null
    await load()
    toast.success('Account deleted')
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Delete failed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
@import '../../../styles/hr-theme.css';

.acc-panel { display: flex; flex-direction: column; gap: 16px; }
.mono { font-family: var(--hr-mono); }

.acc-loading {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 60px; color: var(--hr-text-muted); font-size: 13px;
}
.spin { animation: acc-spin 0.8s linear infinite; }
@keyframes acc-spin { to { transform: rotate(360deg); } }

/* ════════════════ Console hero ════════════════ */
.acc-hero {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 1fr minmax(240px, 320px); gap: 24px; align-items: center;
  padding: 24px 26px; border-radius: 22px;
  background: var(--hr-surface); border: 1px solid var(--hr-border);
  box-shadow: 0 24px 60px -40px rgba(0, 0, 0, 0.6);
}
.acc-grain {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.05) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(120% 130% at 0% 0%, #000 10%, transparent 70%);
  -webkit-mask-image: radial-gradient(120% 130% at 0% 0%, #000 10%, transparent 70%);
}
.acc-aura {
  position: absolute; inset: -40% -10% auto 30%; height: 120%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.16), transparent 70%);
  filter: blur(34px); transition: background 0.6s var(--hr-spring);
}
.acc-hero.login-enabled .acc-aura { background: radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 70%); }
.acc-hero.login-disabled .acc-aura,
.acc-hero.login-nolink .acc-aura { background: radial-gradient(circle, rgba(248, 113, 113, 0.16), transparent 70%); }

.acc-hero-lead { position: relative; z-index: 1; min-width: 0; }
.acc-eyebrow {
  display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-accent-gold);
}
.acc-eyebrow svg { color: var(--hr-accent-gold); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--hr-accent-gold);
  box-shadow: 0 0 10px var(--hr-accent-gold); animation: acc-pulse 2.6s ease-in-out infinite; }
@keyframes acc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.acc-title { margin: 9px 0 0; font-size: clamp(22px, 2.6vw, 30px); font-weight: 850; letter-spacing: -0.02em;
  line-height: 1.05; color: var(--hr-text); }
.acc-title-accent { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; }
.acc-sub { margin: 10px 0 0; font-size: 13px; line-height: 1.55; color: var(--hr-text-muted); max-width: 60ch; }

/* Telemetry lenses */
.acc-lenses { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
.acc-lens {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 1px;
  padding: 11px 12px 13px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid var(--hr-border);
  transition: border-color 0.25s var(--hr-spring), transform 0.25s var(--hr-spring);
}
.acc-lens:hover { transform: translateY(-2px); border-color: var(--hr-border-warm); }
.lens-ico { display: inline-flex; width: 26px; height: 26px; border-radius: 8px; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); margin-bottom: 6px; }
.lens-val { font-size: 16px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; line-height: 1.1; }
.lens-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-dim); }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--hr-accent-gold); opacity: 0.5; }
.acc-lens.tone-ok .lens-ico { background: rgba(52, 211, 153, 0.16); color: var(--hr-active); }
.acc-lens.tone-ok .lens-bar { background: var(--hr-active); }
.acc-lens.tone-danger .lens-ico { background: rgba(248, 113, 113, 0.16); color: var(--hr-suspended); }
.acc-lens.tone-danger .lens-bar { background: var(--hr-suspended); }
.acc-lens.tone-warn .lens-ico { background: rgba(251, 146, 60, 0.16); color: var(--hr-orange); }
.acc-lens.tone-warn .lens-bar { background: var(--hr-orange); }
.acc-lens.tone-muted .lens-ico { background: rgba(255, 255, 255, 0.06); color: var(--hr-text-muted); }
.acc-lens.tone-muted .lens-bar { background: var(--hr-text-dim); opacity: 0.4; }

/* ════════════════ Signature instrument — The Keyring ════════════════ */
.acc-instrument { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.kr { position: relative; width: 100%; height: 176px; }
.kr-glow {
  position: absolute; left: 50%; top: 46%; width: 200px; height: 200px; transform: translate(-50%, -50%);
  border-radius: 50%; filter: blur(30px); opacity: 0.6; pointer-events: none;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), transparent 68%);
  transition: background 0.6s var(--hr-spring);
}
.kr.tone-ok .kr-glow { background: radial-gradient(circle, rgba(52, 211, 153, 0.34), transparent 68%); }
.kr.tone-off .kr-glow { background: radial-gradient(circle, rgba(248, 113, 113, 0.30), transparent 68%); }
.kr.tone-none .kr-glow { opacity: 0.32; }

/* Mount post + the keyring loop */
.kr-post { position: absolute; left: 50%; top: 0; width: 2px; height: 26px; transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--hr-accent-gold)); opacity: 0.55; }
.kr-loop {
  position: absolute; left: 50%; top: 18px; width: 40px; height: 40px; transform: translateX(-50%);
  border-radius: 50%; border: 3.5px solid transparent;
  background:
    linear-gradient(var(--hr-canvas), var(--hr-canvas)) padding-box,
    var(--hr-gradient-rail-active) border-box;
  box-shadow: 0 0 18px rgba(251, 191, 36, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3);
  z-index: 3;
}
.kr-loop::after { content: ''; position: absolute; left: 50%; top: -3px; width: 12px; height: 7px; transform: translateX(-50%);
  border-radius: 0 0 8px 8px; background: var(--hr-canvas); }

/* Swing carries the fobs and gently sways from the loop */
.kr-swing {
  position: absolute; left: 50%; top: 50px; transform-origin: top center;
  display: flex; align-items: flex-start; justify-content: center; gap: 6px;
  translate: -50% 0;
  animation: kr-sway 5.5s ease-in-out infinite;
}
@keyframes kr-sway { 0%, 100% { rotate: -2.4deg; } 50% { rotate: 2.4deg; } }

.kr-fob { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.kr-string { width: 2px; height: 16px; border-radius: 2px; background: linear-gradient(180deg, var(--hr-accent-gold), rgba(251, 191, 36, 0.3)); }
.kr-chip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 9px; font-size: 9px; font-weight: 800;
  color: var(--hr-text-secondary); background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--hr-border-strong);
}
.kr-key {
  display: inline-flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 50%; position: relative;
  color: #1a1206; background: var(--hr-gradient-rail-active);
  box-shadow: 0 6px 18px -4px rgba(251, 191, 36, 0.6);
}
.kr-key::after {
  content: ''; position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: linear-gradient(120deg, transparent 35%, rgba(255, 255, 255, 0.75) 50%, transparent 65%);
  background-size: 250% 100%; background-position: 150% 0;
  animation: kr-glint 6s ease-in-out infinite;
}
@keyframes kr-glint { 0%, 70% { background-position: 150% 0; } 88%, 100% { background-position: -120% 0; } }
.kr-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; color: var(--hr-text-dim); text-transform: uppercase; }

/* fob tones */
.kr-fob.st-ok .kr-chip { background: rgba(52, 211, 153, 0.16); border-color: rgba(52, 211, 153, 0.4); color: var(--hr-active); }
.kr-fob.st-off .kr-chip { background: rgba(248, 113, 113, 0.14); border-color: rgba(248, 113, 113, 0.38); color: var(--hr-suspended); }
.kr-fob.st-wait .kr-chip { background: rgba(251, 146, 60, 0.14); border-color: rgba(251, 146, 60, 0.36); color: var(--hr-orange); }
.kr-fob.more .kr-chip { background: rgba(255, 255, 255, 0.04); color: var(--hr-text-muted); }

/* master key state ring */
.kr-fob.master .kr-key { box-shadow: 0 6px 18px -4px rgba(251, 191, 36, 0.6), 0 0 0 4px rgba(251, 191, 36, 0.18); }
.kr-fob.master.st-ok .kr-key { box-shadow: 0 6px 20px -4px rgba(52, 211, 153, 0.7), 0 0 0 4px rgba(52, 211, 153, 0.22); animation: kr-breathe 3s ease-in-out infinite; }
.kr-fob.master.st-off .kr-key { background: linear-gradient(180deg, #f87171, #b91c1c); color: #fff;
  box-shadow: 0 6px 18px -4px rgba(248, 113, 113, 0.6), 0 0 0 4px rgba(248, 113, 113, 0.2); }
.kr-fob.master.st-wait .kr-key { background: linear-gradient(180deg, #fbbf24, #ea580c);
  box-shadow: 0 6px 18px -4px rgba(251, 146, 60, 0.6), 0 0 0 4px rgba(251, 146, 60, 0.2); }
.kr-fob.master.st-none .kr-key { background: rgba(255, 255, 255, 0.08); color: var(--hr-text-muted);
  box-shadow: inset 0 0 0 1px var(--hr-border-strong); }
.kr-fob.master.st-none .kr-key::after { display: none; }
@keyframes kr-breathe { 0%, 100% { box-shadow: 0 6px 20px -4px rgba(52, 211, 153, 0.7), 0 0 0 4px rgba(52, 211, 153, 0.22); } 50% { box-shadow: 0 6px 26px -2px rgba(52, 211, 153, 0.9), 0 0 0 7px rgba(52, 211, 153, 0.1); } }

/* meter under the keyring */
.kr-meter { width: 100%; display: flex; flex-direction: column; gap: 5px; align-items: center; }
.kr-meter-track { width: 100%; height: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.kr-meter-fill { display: block; height: 100%; border-radius: 999px; background: var(--hr-gradient-rail-active);
  transition: width 0.8s var(--hr-spring); }
.kr-meter-cap { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--hr-text-muted); }

/* ════════════════ Lock banner ════════════════ */
.acc-lock {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px;
  background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.28);
  color: var(--hr-text-secondary); font-size: 12.5px; line-height: 1.5;
}
.acc-lock > svg { color: var(--hr-suspended); flex-shrink: 0; }
.acc-lock strong { color: var(--hr-text); font-weight: 700; }
.acc-lock em { font-style: normal; color: var(--hr-suspended); font-weight: 700; }

/* ════════════════ ERP login card ════════════════ */
.erp-card {
  position: relative; overflow: hidden;
  border-radius: 20px; background: var(--hr-surface-elevated); border: 1px solid var(--hr-border-strong);
  box-shadow: 0 24px 56px -36px rgba(0, 0, 0, 0.7);
}
.erp-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--hr-gradient-rail-active); }
.erp-card[data-state="enabled"] .erp-spine { background: linear-gradient(180deg, #34d399, #059669); }
.erp-card[data-state="disabled"] .erp-spine,
.erp-card[data-state="nolink"] .erp-spine { background: linear-gradient(180deg, #f87171, #b91c1c); }
.erp-card[data-state="pending"] .erp-spine { background: linear-gradient(180deg, #fbbf24, #ea580c); }

.erp-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px 16px 22px; border-bottom: 1px solid var(--hr-border); }
.erp-head-ico { display: inline-flex; width: 38px; height: 38px; border-radius: 11px; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); flex-shrink: 0; }
.erp-head-text { flex: 1; min-width: 0; }
.erp-head-text h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.erp-head-text p { margin: 2px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.erp-stamp { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; padding: 5px 11px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.erp-stamp.st-ok { background: rgba(52, 211, 153, 0.14); color: var(--hr-active); border-color: rgba(52, 211, 153, 0.32); }
.erp-stamp.st-off { background: rgba(248, 113, 113, 0.14); color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.32); }
.erp-stamp.st-wait { background: rgba(251, 146, 60, 0.14); color: var(--hr-orange); border-color: rgba(251, 146, 60, 0.32); }
.erp-stamp.st-none { background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted); border-color: var(--hr-border-strong); }

.erp-body { padding: 18px 20px 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.erp-field { display: flex; flex-direction: column; gap: 6px; }
.erp-lab { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hr-text-muted); }
.erp-username { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; padding: 9px 13px; border-radius: 10px;
  font-size: 13px; font-weight: 600; color: var(--hr-text); background: rgba(251, 191, 36, 0.07); border: 1px solid var(--hr-border-warm); }
.erp-username svg { color: var(--hr-accent-gold); flex-shrink: 0; }

.erp-state { display: flex; flex-wrap: wrap; gap: 8px; }
.erp-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 5px 11px; border-radius: 999px; border: 1px solid transparent; }
.erp-chip.ok { background: rgba(52, 211, 153, 0.14); color: var(--hr-active); border-color: rgba(52, 211, 153, 0.3); }
.erp-chip.off { background: rgba(248, 113, 113, 0.14); color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.3); }
.erp-chip.warn { background: rgba(251, 146, 60, 0.14); color: var(--hr-orange); border-color: rgba(251, 146, 60, 0.3); }
.erp-chip.neutral { background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted); border-color: var(--hr-border-strong); }

.erp-pw { display: flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px; border-radius: 11px;
  background: rgba(0, 0, 0, 0.24); border: 1px solid var(--hr-border-strong); max-width: 420px; }
.erp-pw-ico { color: var(--hr-text-muted); flex-shrink: 0; }
.erp-pw input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--hr-text);
  font-size: 13px; font-family: var(--hr-mono); letter-spacing: 0.04em; }
.erp-pw input::placeholder { color: var(--hr-text-dim); font-family: var(--hr-sans, inherit); letter-spacing: 0; }
.erp-eye { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: none; color: var(--hr-text-muted); transition: color 0.2s, background 0.2s; }
.erp-eye:hover { color: var(--hr-text); background: rgba(255, 255, 255, 0.07); }
.erp-gen { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 7px 11px; border-radius: 8px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 800; background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-border-warm);
  color: var(--hr-accent-gold); transition: background 0.2s; }
.erp-gen:hover { background: rgba(251, 191, 36, 0.18); }

.erp-handover { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 12px;
  background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); }
.erp-handover > svg { color: var(--hr-active); flex-shrink: 0; }
.erp-ho-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.erp-ho-lab { font-size: 10.5px; font-weight: 600; color: var(--hr-text-secondary); }
.erp-ho-body code { font-size: 14px; font-weight: 800; color: var(--hr-active); letter-spacing: 0.06em; }
.erp-copy { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.3); color: var(--hr-active); }
.erp-copy:hover { background: rgba(52, 211, 153, 0.22); }

.erp-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 10.5px; line-height: 1.45; color: var(--hr-text-muted); }
.erp-note svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }

.erp-nolink { display: flex; align-items: center; gap: 10px; margin: 18px 20px; padding: 13px 15px; border-radius: 12px;
  font-size: 12.5px; line-height: 1.45; color: var(--hr-text-secondary); background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.28); }
.erp-nolink svg { color: var(--hr-suspended); flex-shrink: 0; }

.erp-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 18px 22px; }
.erp-card .erp-foot:empty { display: none; }

/* handover reveal transition */
.erp-ho-enter-active { transition: opacity 0.4s var(--hr-spring), transform 0.4s var(--hr-spring); }
.erp-ho-enter-from { opacity: 0; transform: translateY(-6px); }

/* ════════════════ Empty state ════════════════ */
.acc-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
  padding: 44px 24px; border-radius: 20px; border: 1.5px dashed var(--hr-border-strong);
  background: rgba(255, 255, 255, 0.02);
}
.acc-empty-mark { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; margin-bottom: 4px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); }
.acc-empty h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--hr-text); }
.acc-empty p { margin: 0; font-size: 13px; color: var(--hr-text-muted); max-width: 44ch; line-height: 1.5; }
.acc-empty-lock { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--hr-text-dim); margin-top: 2px; }

/* ════════════════ System cards grid ════════════════ */
.acc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.sys-shell { min-width: 0; }
.sys-card {
  position: relative; overflow: hidden; height: 100%;
  display: flex; flex-direction: column;
  border-radius: 18px; background: var(--hr-surface); border: 1px solid var(--hr-border);
  box-shadow: 0 18px 40px -32px rgba(0, 0, 0, 0.6);
  transition: border-color 0.25s var(--hr-spring), box-shadow 0.3s var(--hr-spring), transform 0.3s var(--hr-spring);
}
.sys-card:hover { transform: translateY(-3px); border-color: var(--hr-border-warm); box-shadow: 0 28px 56px -34px rgba(251, 146, 60, 0.4); }
.sys-glare {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 0;
  background: radial-gradient(60% 50% at 80% 0%, rgba(251, 191, 36, 0.14), transparent 70%);
  transition: opacity 0.3s var(--hr-spring);
}
.sys-card:hover .sys-glare { opacity: 1; }
.sys-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--hr-accent-gold); opacity: 0.5; z-index: 1; }
.sys-card[data-status="ACTIVE"] .sys-spine { background: var(--hr-active); opacity: 1; }
.sys-card[data-status="ACTIVE"] { border-color: rgba(52, 211, 153, 0.32); }
.sys-card[data-status="REVOKED"] .sys-spine { background: var(--hr-suspended); opacity: 1; }
.sys-card[data-status="REVOKED"] { border-color: rgba(248, 113, 113, 0.3); }

.sys-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-bottom: 1px solid var(--hr-border); }
.sys-ico { display: inline-flex; width: 32px; height: 32px; border-radius: 10px; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); flex-shrink: 0; }
.sys-ico[data-type="EMAIL"] { background: rgba(251, 146, 60, 0.16); color: var(--hr-orange); }
.sys-ico[data-type="GIT"] { background: rgba(251, 191, 36, 0.16); color: #fbbf24; }
.sys-ico[data-type="SLACK"] { background: rgba(52, 211, 153, 0.16); color: var(--hr-active); }
.sys-head-text { flex: 1; min-width: 0; }
.sys-title { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.sys-type { font-size: 9.5px; color: var(--hr-text-dim); margin-top: 1px; letter-spacing: 0.04em; }
.sys-pill { font-size: 9px; font-weight: 800; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 999px; flex-shrink: 0;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.sys-pill[data-status="ACTIVE"] { background: rgba(52, 211, 153, 0.16); color: var(--hr-active); border-color: rgba(52, 211, 153, 0.32); }
.sys-pill[data-status="REVOKED"] { background: rgba(248, 113, 113, 0.16); color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.32); }
.sys-pill[data-status="REQUESTED"], .sys-pill[data-status="PENDING"] { background: rgba(251, 146, 60, 0.16); color: var(--hr-orange); border-color: rgba(251, 146, 60, 0.32); }
.sys-del { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  opacity: 0; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.28); color: #fca5a5;
  transition: opacity 0.18s var(--hr-spring), background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s; }
.sys-card:hover .sys-del { opacity: 0.9; }
.sys-del:hover { background: rgba(248, 113, 113, 0.22); border-color: rgba(248, 113, 113, 0.6); color: var(--hr-suspended); transform: rotate(-8deg) scale(1.08); }

.sys-body { position: relative; z-index: 1; padding: 13px 14px; display: flex; flex-direction: column; gap: 11px; flex: 1; }
.sys-field { display: flex; flex-direction: column; gap: 5px; }
.sys-lab { font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hr-text-dim); }
.sys-input { width: 100%; padding: 8px 11px; border-radius: 9px; font-size: 12.5px; color: var(--hr-text);
  background: rgba(0, 0, 0, 0.2); border: 1px solid var(--hr-border-strong); outline: none; resize: vertical;
  transition: border-color 0.2s var(--hr-spring); font-family: inherit; }
.sys-input.mono { font-family: var(--hr-mono); }
.sys-input:focus { border-color: var(--hr-accent-gold-border); }
.sys-input::placeholder { color: var(--hr-text-dim); }

.sys-foot { position: relative; z-index: 1; display: flex; justify-content: flex-end; gap: 9px; padding: 12px 14px; border-top: 1px solid var(--hr-border); }

.sys-add {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px;
  min-height: 220px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.2px;
  border-radius: 18px; border: 1.5px dashed var(--hr-border-warm); background: rgba(251, 191, 36, 0.04); color: var(--hr-accent-gold);
  transition: border-color 0.25s var(--hr-spring), background 0.25s var(--hr-spring), transform 0.25s var(--hr-spring);
}
.sys-add::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.3s var(--hr-spring);
  background: radial-gradient(60% 60% at 50% 50%, rgba(251, 146, 60, 0.16), transparent 70%); }
.sys-add:hover:not(.disabled) { border-color: var(--hr-accent-gold); background: rgba(251, 191, 36, 0.1); }
.sys-add:hover:not(.disabled)::before { opacity: 1; }
.sys-add.disabled { cursor: not-allowed; opacity: 0.5; color: var(--hr-text-muted); border-color: var(--hr-border-strong); }

/* ════════════════ Buttons ════════════════ */
.acc-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 15px; border-radius: 10px;
  font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; border: 1px solid transparent;
  transition: transform 0.15s var(--hr-spring), background 0.2s, border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.acc-btn:active { transform: scale(0.96); }
.acc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.acc-btn.primary { background: var(--hr-gradient-rail-active); color: #1a1206; box-shadow: 0 8px 20px -8px rgba(251, 191, 36, 0.6); }
.acc-btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 26px -8px rgba(251, 191, 36, 0.75); }
.acc-btn.ghost { background: rgba(255, 255, 255, 0.04); color: var(--hr-text-secondary); border-color: var(--hr-border-strong); }
.acc-btn.ghost:hover:not(:disabled) { color: var(--hr-text); border-color: var(--hr-border-warm); }
.acc-btn.danger { background: rgba(248, 113, 113, 0.12); color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.32); }
.acc-btn.danger:hover:not(:disabled) { background: rgba(248, 113, 113, 0.2); border-color: rgba(248, 113, 113, 0.55); }

/* ════════════════ Modals ════════════════ */
.acc-backdrop {
  position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 20px;
  background: rgba(5, 5, 6, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.acc-modal {
  width: min(460px, 100%); border-radius: 20px; overflow: hidden;
  background: var(--hr-surface-deep); border: 1px solid var(--hr-border-strong);
  box-shadow: 0 40px 100px -40px rgba(0, 0, 0, 0.85);
}
.acc-modal-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--hr-border); }
.acc-modal-ico { display: inline-flex; width: 38px; height: 38px; border-radius: 11px; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); flex-shrink: 0; }
.acc-modal-ico.danger { background: rgba(248, 113, 113, 0.14); color: var(--hr-suspended); }
.acc-modal-head > div { flex: 1; min-width: 0; }
.acc-modal-head h4 { margin: 0; font-size: 15px; font-weight: 800; color: var(--hr-text); }
.acc-modal-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.acc-modal-head strong { color: var(--hr-text); }
.acc-modal-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: transparent; border: none; color: var(--hr-text-muted); transition: color 0.2s, background 0.2s; }
.acc-modal-x:hover { color: var(--hr-text); background: rgba(255, 255, 255, 0.06); }

.acc-modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 15px; }
.acc-modal-field { display: flex; flex-direction: column; gap: 7px; }
.acc-modal-field > label { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--hr-text-muted); }
.acc-modal-field .opt { text-transform: none; letter-spacing: 0; color: var(--hr-text-dim); font-weight: 600; }
.acc-modal-input { width: 100%; padding: 9px 12px; border-radius: 10px; font-size: 13px; color: var(--hr-text);
  background: rgba(0, 0, 0, 0.24); border: 1px solid var(--hr-border-strong); outline: none; resize: vertical; font-family: inherit; }
.acc-modal-input.mono { font-family: var(--hr-mono); }
.acc-modal-input:focus { border-color: var(--hr-accent-gold-border); }

.acc-type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.acc-type-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 700; text-align: left;
  background: rgba(255, 255, 255, 0.03); border: 1px solid var(--hr-border-strong); color: var(--hr-text-secondary);
  transition: border-color 0.2s var(--hr-spring), background 0.2s, color 0.2s, transform 0.15s;
}
.acc-type-btn svg { color: var(--hr-text-muted); flex-shrink: 0; }
.acc-type-btn:hover { transform: translateY(-1px); border-color: var(--hr-border-warm); }
.acc-type-btn.on { background: var(--hr-accent-gold-soft); border-color: var(--hr-accent-gold-border); color: var(--hr-text); }
.acc-type-btn.on svg { color: var(--hr-accent-gold); }

.acc-modal-note { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--hr-text-muted);
  padding: 12px; border-radius: 11px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--hr-border); }
.acc-modal-note svg { color: var(--hr-accent-gold); flex-shrink: 0; }
.acc-modal-hint { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 11px; line-height: 1.45; color: var(--hr-text-muted); }
.acc-modal-hint svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }
.acc-confirm { margin: 0; font-size: 13px; line-height: 1.55; color: var(--hr-text-secondary); }
.acc-confirm strong { color: var(--hr-text); font-weight: 700; }

.acc-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--hr-border); }

.acc-modal-enter-active, .acc-modal-leave-active { transition: opacity 0.28s var(--hr-spring); }
.acc-modal-enter-active .acc-modal, .acc-modal-leave-active .acc-modal { transition: transform 0.32s var(--hr-spring), opacity 0.28s var(--hr-spring); }
.acc-modal-enter-from, .acc-modal-leave-to { opacity: 0; }
.acc-modal-enter-from .acc-modal, .acc-modal-leave-to .acc-modal { transform: translateY(16px) scale(0.97); opacity: 0; }

/* ════════════════ Reduced motion ════════════════ */
@media (prefers-reduced-motion: reduce) {
  .eb-dot, .kr-swing, .kr-key::after, .kr-fob.master.st-ok .kr-key, .spin { animation: none !important; }
}
.kr.reduced .kr-swing, .kr.reduced .kr-key::after { animation: none; }

/* ════════════════════════════════════════════════════
   ═════════════════ LIGHT THEME OVERRIDES ═════════════
   ════════════════════════════════════════════════════ */
[data-theme="light"] .acc-hero { background: rgba(255, 250, 240, 0.7); }
[data-theme="light"] .acc-lens { background: rgba(255, 250, 240, 0.6); }
[data-theme="light"] .acc-lens.tone-muted .lens-ico { background: rgba(40, 25, 10, 0.06); color: #6b5840; }
[data-theme="light"] .kr-loop::after { background: var(--hr-canvas); }
[data-theme="light"] .erp-card { background: rgba(255, 250, 240, 0.92); }
[data-theme="light"] .erp-pw { background: rgba(255, 250, 242, 0.7); border-color: rgba(60, 45, 20, 0.16); }
[data-theme="light"] .sys-card { background: rgba(255, 250, 240, 0.72); }
[data-theme="light"] .sys-input { background: rgba(255, 250, 242, 0.7); border-color: rgba(60, 45, 20, 0.16); }
[data-theme="light"] .sys-ico[data-type="GIT"] { color: #b45309; }
[data-theme="light"] .acc-empty { background: rgba(255, 250, 240, 0.4); }
[data-theme="light"] .acc-backdrop { background: rgba(60, 45, 20, 0.32); }
[data-theme="light"] .acc-modal { background: rgba(255, 250, 240, 0.98); }
[data-theme="light"] .acc-modal-input,
[data-theme="light"] .acc-type-btn { background: rgba(255, 250, 242, 0.7); border-color: rgba(60, 45, 20, 0.16); }
[data-theme="light"] .acc-btn.ghost { background: rgba(40, 25, 10, 0.04); }
[data-theme="light"] .acc-btn.primary { color: #3a2600; }
</style>
