<template>
  <div class="ex-letter">
    <LetterAtelierConsole :letter-type="letterType" :counts="counts" :active-lens="activeLens"
      :loading="loadingCases || enriching" @pick="pickLens" @refresh="loadAll" />

    <!-- loading -->
    <div v-if="loadingCases && !roster.length" class="lt-skel">
      <div v-for="n in 3" :key="n" class="skel"><span class="skel-shimmer" /></div>
    </div>

    <ExEmptyState v-else-if="!roster.length" :icon="ScrollText" title="No cases ready for credentials"
      :subtitle="isRelieving
        ? 'Relieving letters are struck once a case clears and the full & final settlement is closed.'
        : 'Experience certificates unlock the moment an employee formally exits — accepted separations walk into this atelier as they progress.'" />

    <template v-else>
      <!-- roster strip -->
      <div class="roster">
        <div class="roster-cap">
          <span class="rc-title"><Users :size="13" /> Credential queue</span>
          <span class="rc-count ex-mono">{{ filteredRoster.length }}<i v-if="activeLens"> · {{ lensLabel }}</i></span>
          <button v-if="activeLens" class="rc-clear" type="button" @click="pickLens(activeLens)"><X :size="12" /> Clear</button>
        </div>
        <div class="roster-strip" :class="{ empty: !filteredRoster.length }">
          <LetterCaseChip v-for="(c, i) in pagedRoster" :key="c.id" :c="c" :index="i" :active="c.id === activeId" @select="selectCase" />
          <div v-if="!filteredRoster.length" class="roster-empty">
            <Filter :size="15" /> No cases match this lens · <button type="button" @click="pickLens(activeLens)">show all</button>
          </div>
        </div>
        <ExPager :page="rosterPage" :total-pages="rosterPages" :total="rosterTotal" :limit="10" @update:page="rosterPage = $event" />
      </div>

      <!-- stage -->
      <div v-if="activeDetail" class="stage">
        <!-- context header -->
        <Motion as="div" class="ctx ex-card ex-grain" :key="'ctx-' + activeId"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16,1,0.3,1] }">
          <span class="ctx-medal" :class="`st-${(activeDetail.status || 'draft').toLowerCase()}`">{{ initials(activeDetail.employee_name || activeDetail.employee_code) }}</span>
          <div class="ctx-id">
            <div class="ctx-top">
              <h3 class="ctx-name">{{ activeDetail.employee_name || activeDetail.employee_code || '—' }}</h3>
              <ExStatusPill :status="activeDetail.status" />
              <span class="ctx-lc" v-if="activeDetail.lifecycle_state"><DoorOpen :size="11" /> {{ lcLabel }}</span>
            </div>
            <span class="ctx-meta ex-mono">{{ activeDetail.case_number }} · {{ [activeDetail.designation_name, activeDetail.department_name].filter(Boolean).join(' · ') || '—' }}</span>
          </div>
          <div class="ctx-stats">
            <button class="ctx-stat" :class="{ done: (activeDetail.clearance_progress_pct || 0) >= 100 }" @click="$emit('go', { tab: 'clearance' })" type="button">
              <ClipboardCheck :size="13" /><span><b class="ex-mono">{{ activeDetail.clearance_progress_pct || 0 }}%</b> cleared</span>
            </button>
            <button class="ctx-stat" :class="{ done: ['PAID','CLOSED'].includes(activeDetail.settlement?.status) }" @click="$emit('go', { tab: 'settlement' })" type="button">
              <Scale :size="13" /><span>F&amp;F {{ settlementStatusMeta(activeDetail.settlement?.status || 'DRAFT').label }}</span>
            </button>
          </div>
        </Motion>

        <div class="mint-grid">
          <!-- mint console -->
          <Motion as="div" class="mint ex-card ex-grain" :key="'mint-' + activeId + activeStatus"
            :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
            <CredentialSeal :status="activeStatus" :letter-type="letterType"
              :caption="activeDoc?.verification_code ? ('Code ' + activeDoc.verification_code) : (blocked ? 'Awaiting upstream' : 'Awaiting mintage')" />

            <!-- lifecycle stepper -->
            <div class="step" :class="{ revoked: activeStatus === 'REVOKED' }">
              <div class="step-rail"><span class="step-fill" :style="{ width: stepFill + '%' }" /></div>
              <div v-for="(s, i) in steps" :key="s.key" class="step-node" :class="{ on: stepIdx >= i, cur: stepIdx === i }">
                <span class="sn-dot"><component :is="s.icon" :size="12" /></span>
                <span class="sn-l">{{ s.label }}</span>
              </div>
            </div>

            <!-- blocked gate -->
            <div v-if="blocked" class="mint-block">
              <Lock :size="14" />
              <span>{{ blockMsg }}</span>
              <button class="mb-goto" @click="$emit('go', { tab: blockTab })" type="button">Open {{ blockTab.replace('-', ' ') }} <ArrowRight :size="13" /></button>
            </div>

            <!-- action rail -->
            <div class="mint-actions">
              <Motion v-if="!activeDoc || activeStatus === 'NOT_GENERATED' || activeStatus === 'REVOKED'" as="button" class="m-btn primary"
                :disabled="busy || blocked" :whileHover="(busy||blocked)?{}:{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="doGenerate" type="button">
                <Loader2 v-if="busy" :size="14" class="spin" /><Sparkles v-else :size="14" /> {{ activeStatus === 'REVOKED' ? 'Re-mint' : 'Generate' }}
              </Motion>
              <Motion v-if="activeDoc && activeStatus === 'GENERATED'" as="button" class="m-btn primary"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="doIssue" type="button">
                <Stamp :size="14" /> Issue &amp; seal
              </Motion>
              <Motion v-if="activeDoc && ['GENERATED','ISSUED'].includes(activeStatus)" as="button" class="m-btn ghost"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="downloadLetter" type="button">
                <Download :size="14" /> Download
              </Motion>
              <Motion v-if="activeDoc && ['GENERATED','ISSUED'].includes(activeStatus)" as="button" class="m-btn danger-ghost"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="revokeOpen = true" type="button">
                <Undo2 :size="14" /> Revoke
              </Motion>
            </div>
            <p v-if="activeStatus === 'ISSUED'" class="m-issued"><CircleCheckBig :size="13" /> Issued {{ fmtDate(activeDoc?.issued_at) }} · scannable QR verifies authenticity</p>

            <!-- former-employee portal — delivery that survives ERP de-activation -->
            <div v-if="activeStatus === 'ISSUED' && activeDetail?.public_token" class="portal-box">
              <div class="pb-head"><LinkIcon :size="13" /> Former-employee download link <i>opens without login</i></div>
              <div class="pb-row">
                <input class="pb-input" :value="portalUrl" readonly @focus="$event.target.select()" />
                <button class="pb-btn" type="button" @click="copyPortal"><component :is="portalCopied ? Check : Copy" :size="13" /> {{ portalCopied ? 'Copied' : 'Copy' }}</button>
              </div>
              <div class="pb-acts">
                <a v-if="activeDetail?.personal_email" class="pb-act mail" :href="mailtoHref"><Mail :size="13" /> Email to {{ activeDetail.personal_email }}</a>
                <span v-else class="pb-noemail"><Info :size="12" /> No personal email on file — copy &amp; share the link</span>
                <button class="pb-act ghost" type="button" :disabled="busy" @click="rotatePortal"><RefreshCw :size="13" :class="{ spin: busy }" /> Regenerate</button>
              </div>
              <p class="pb-exp"><Clock :size="11" />
                <template v-if="activeDetail?.public_token_expires_at">Link active until <b>{{ fmtDate(activeDetail.public_token_expires_at) }}</b> · expires 5 days after issue — Regenerate resets the window.</template>
                <template v-else>Link goes live for 5 days when the letter is issued — Regenerate any time to re-send.</template>
              </p>
            </div>

            <!-- delivery trace — the corporate workflow, made visible -->
            <div class="trace">
              <span class="trace-cap"><Share2 :size="12" /> Where this credential travels</span>
              <div v-for="ch in channels" :key="ch.key" class="trace-row" :class="`s-${ch.state}`">
                <span class="tr-dot"><component :is="ch.icon" :size="13" /></span>
                <div class="tr-txt"><span class="tr-l">{{ ch.label }}</span><span class="tr-s">{{ ch.sub }}</span></div>
                <span class="tr-state">{{ ch.stateLabel }}</span>
              </div>
            </div>
          </Motion>

          <!-- certificate -->
          <div class="cert-col">
            <CinematicCertificate :c="activeDetail" :letter-type="letterType" :status="activeStatus" :code="activeDoc?.verification_code || ''" />
          </div>
        </div>
      </div>
    </template>

    <!-- revoke modal -->
    <ExModalShell :open="revokeOpen" title="Revoke credential" sub="Invalidates the QR & withdraws it from the employee's vault"
      :icon="Undo2" tone="danger" @close="revokeOpen = false">
      <div class="fld"><label>Reason <i>*</i></label><textarea v-model="revokeReason" rows="3" placeholder="Why is this credential being revoked?" /></div>
      <template #foot>
        <button class="exm-btn ghost" @click="revokeOpen = false" type="button">Cancel</button>
        <button class="exm-btn danger" :disabled="busy || !revokeReason.trim()" @click="doRevoke" type="button">
          <Loader2 v-if="busy" :size="14" class="spin" /><Undo2 v-else :size="14" /> Revoke
        </button>
      </template>
    </ExModalShell>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ScrollText, Users, X, Filter, Lock, ArrowRight, Sparkles, Download, Undo2, Stamp,
  Loader2, CircleCheckBig, ClipboardCheck, Scale, DoorOpen, Share2, Gem, PenLine, BadgeCheck,
  Archive, Vault, Globe, Link as LinkIcon, Copy, Check, Mail, RefreshCw, Info, Send, Clock,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { authHeader } from '@/utils/api'
import LetterAtelierConsole from '../components/LetterAtelierConsole.vue'
import LetterCaseChip from '../components/LetterCaseChip.vue'
import CredentialSeal from '../components/CredentialSeal.vue'
import CinematicCertificate from '../components/CinematicCertificate.vue'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExModalShell from '../components/ExModalShell.vue'
import ExPager from '../components/ExPager.vue'
import {
  fetchCases, fetchCase, generateLetter, issueLetter, revokeLetter, letterDownloadUrl,
  portalLink, rotatePortalToken,
  fmtDate, initials, errText, settlementStatusMeta, daysRemaining, useClientPage,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ letterType: { type: String, default: 'experience-letter' } })
const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()

const isRelieving = computed(() => props.letterType === 'relieving-letter')
const docTypeKey = computed(() => isRelieving.value ? 'RELIEVING_LETTER' : 'EXPERIENCE_LETTER')

const QUEUE_STATUSES = ['NOTICE_PERIOD', 'CLEARANCE', 'SETTLEMENT', 'COMPLETED']
const loadingCases = ref(false)
const enriching = ref(false)
const details = ref({})       // id -> full case detail
const order = ref([])         // id order
const activeId = ref(null)
const activeLens = ref('')
const busy = ref(false)
const revokeOpen = ref(false)
const revokeReason = ref('')

// ── per-case enrichment ──
const docOf = (d) => (d?.documents || []).find(x => x.doc_type === docTypeKey.value) || null
const isBlocked = (d) => {
  if (!d) return true
  if (isRelieving.value) {
    if ((d.clearance_progress_pct || 0) < 100) return true
    if (!['PAID', 'CLOSED'].includes(d.settlement?.status)) return true
    return false
  }
  return !['EXITED', 'ARCHIVED'].includes(d.lifecycle_state)
}
const enrich = (d) => {
  const doc = docOf(d)
  const letterStatus = doc?.status || 'NOT_GENERATED'
  const blocked = isBlocked(d)
  return {
    id: d.id, employee_name: d.employee_name, employee_code: d.employee_code,
    case_number: d.case_number, department_name: d.department_name,
    letterStatus, blocked, eligible: !blocked, daysLeft: daysRemaining(d.last_working_date),
  }
}

const roster = computed(() => order.value.map(id => enrich(details.value[id])).filter(r => r.id))

const loadAll = async () => {
  loadingCases.value = true
  try {
    const seen = new Set(); const ids = []
    for (const st of QUEUE_STATUSES) {
      const d = await fetchCases({ status: st, limit: 100 }).catch(() => ({ items: [] }))
      for (const c of (d.items || [])) { if (!seen.has(c.id)) { seen.add(c.id); ids.push(c.id) } }
    }
    enriching.value = true
    const results = await Promise.allSettled(ids.map(id => fetchCase(id)))
    const map = {}; const ord = []
    results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) { map[ids[i]] = r.value; ord.push(ids[i]) } })
    // sort: eligible-not-issued first, then drafted, issued, blocked
    const rank = (id) => {
      const d = map[id]; const ls = docOf(d)?.status || 'NOT_GENERATED'; const blk = isBlocked(d)
      if (!blk && (ls === 'NOT_GENERATED' || ls === 'REVOKED')) return 0
      if (ls === 'GENERATED') return 1
      if (ls === 'ISSUED') return 3
      return blk ? 4 : 2
    }
    ord.sort((a, b) => rank(a) - rank(b))
    details.value = map; order.value = ord
    if (!activeId.value || !map[activeId.value]) activeId.value = ord[0] || null
  } catch (e) { toast.error(errText(e, 'Failed to load cases')) }
  finally { loadingCases.value = false; enriching.value = false }
}

const selectCase = async (id) => {
  activeId.value = id
  try { const d = await fetchCase(id); details.value = { ...details.value, [id]: d } } catch {}
}
const refreshActive = async () => {
  if (!activeId.value) return
  try { const d = await fetchCase(activeId.value); details.value = { ...details.value, [activeId.value]: d } } catch {}
}

const activeDetail = computed(() => details.value[activeId.value] || null)
const activeDoc = computed(() => docOf(activeDetail.value))
const activeStatus = computed(() => activeDoc.value?.status || 'NOT_GENERATED')
const blocked = computed(() => isBlocked(activeDetail.value))
const lcLabel = computed(() => (activeDetail.value?.lifecycle_state || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))

const blockTab = computed(() => {
  const d = activeDetail.value
  if (isRelieving.value) return (d?.clearance_progress_pct || 0) < 100 ? 'clearance' : 'settlement'
  return 'settlement'
})
const blockMsg = computed(() => isRelieving.value
  ? 'Relieving needs clearance complete + F&F settled (PAID / CLOSED).'
  : 'Experience certificate unlocks after the employee has formally EXITED.')

// ── lifecycle stepper ──
const steps = [
  { key: 'eligible', label: 'Eligible', icon: Gem },
  { key: 'drafted', label: 'Drafted', icon: PenLine },
  { key: 'issued', label: 'Issued', icon: BadgeCheck },
]
const stepIdx = computed(() => ({ NOT_GENERATED: blocked.value ? -1 : 0, GENERATED: 1, ISSUED: 2, REVOKED: 0 }[activeStatus.value] ?? 0))
const stepFill = computed(() => Math.max(0, stepIdx.value) / (steps.length - 1) * 100)

// ── delivery trace channels (the corporate workflow, surfaced) ──
const channels = computed(() => {
  const s = activeStatus.value
  const minted = s === 'GENERATED' || s === 'ISSUED'
  const issued = s === 'ISSUED'
  const revoked = s === 'REVOKED'
  const state = (active, voidable = true) => revoked && voidable ? 'void' : active ? 'active' : 'pending'
  const lbl = (st) => st === 'active' ? 'Live' : st === 'void' ? 'Withdrawn' : 'Pending'
  const rows = [
    { key: 'hr', icon: Archive, label: 'HR archive', sub: 'Admin download · stored in the document drive', st: minted ? 'active' : 'pending' },
    { key: 'self', icon: ScrollText, label: 'Self-service · My letters', sub: 'Employee downloads from their Exit page', st: state(issued) },
    { key: 'vault', icon: Vault, label: 'Document vault', sub: 'Filed in the employee\'s personal archive', st: state(issued) },
    { key: 'portal', icon: LinkIcon, label: 'Former-employee portal', sub: 'Public secure link — downloads survive ERP de-activation', st: state(issued) },
    { key: 'verify', icon: Globe, label: 'Public QR verification', sub: 'Scannable authenticity check', st: state(issued) },
  ]
  return rows.map(r => ({ ...r, state: r.st, stateLabel: lbl(r.st) }))
})

// ── lenses + filter ──
const counts = computed(() => {
  const r = roster.value
  return {
    total: r.length,
    eligible: r.filter(x => x.eligible && (x.letterStatus === 'NOT_GENERATED' || x.letterStatus === 'REVOKED')).length,
    drafted: r.filter(x => x.letterStatus === 'GENERATED').length,
    issued: r.filter(x => x.letterStatus === 'ISSUED').length,
    revoked: r.filter(x => x.letterStatus === 'REVOKED').length,
    blocked: r.filter(x => !x.eligible && x.letterStatus !== 'ISSUED').length,
  }
})
const LENS_LABELS = { eligible: 'Ready to mint', drafted: 'Drafted', issued: 'Issued', revoked: 'Revoked', blocked: 'Awaiting' }
const lensLabel = computed(() => LENS_LABELS[activeLens.value] || '')
const filteredRoster = computed(() => {
  const l = activeLens.value
  if (!l) return roster.value
  if (l === 'eligible') return roster.value.filter(x => x.eligible && (x.letterStatus === 'NOT_GENERATED' || x.letterStatus === 'REVOKED'))
  if (l === 'blocked') return roster.value.filter(x => !x.eligible && x.letterStatus !== 'ISSUED')
  return roster.value.filter(x => x.letterStatus === l.toUpperCase())
})
const { page: rosterPage, total: rosterTotal, totalPages: rosterPages, paged: pagedRoster } = useClientPage(filteredRoster, 10)
watch(activeLens, () => { rosterPage.value = 1 })
const pickLens = (key) => { activeLens.value = activeLens.value === key ? '' : key }

// ── workflow actions ──
const doGenerate = async () => {
  busy.value = true
  try { await generateLetter(activeId.value, props.letterType); toast.success('Credential minted'); await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Generate failed')) }
  finally { busy.value = false }
}
const doIssue = async () => {
  busy.value = true
  try { await issueLetter(activeId.value, props.letterType); toast.success('Credential issued & sealed'); await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Issue failed')) }
  finally { busy.value = false }
}
const doRevoke = async () => {
  busy.value = true
  try { await revokeLetter(activeId.value, props.letterType, revokeReason.value); toast.success('Credential revoked'); revokeOpen.value = false; revokeReason.value = ''; await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Revoke failed')) }
  finally { busy.value = false }
}
// ── former-employee portal delivery ──
const portalUrl = computed(() => (activeDetail.value?.public_token ? portalLink(activeDetail.value.public_token) : ''))
const portalCopied = ref(false)
const copyPortal = async () => {
  try { await navigator.clipboard.writeText(portalUrl.value); portalCopied.value = true; setTimeout(() => { portalCopied.value = false }, 1800) }
  catch { toast.info('Copy failed — select the link and copy manually') }
}
const mailtoHref = computed(() => {
  const em = activeDetail.value?.personal_email || ''
  const name = (activeDetail.value?.employee_name || '').split(/\s+/)[0] || 'there'
  const subject = encodeURIComponent('Your Fourconnect exit documents')
  const body = encodeURIComponent(
    `Hi ${name},\n\nYour exit documents are ready. You can download them securely — no login needed — from your personal document portal:\n\n${portalUrl.value}\n\nPlease keep this link safe; it stays available even after your system access ends.\n\nWarm regards,\nHR`)
  return `mailto:${em}?subject=${subject}&body=${body}`
})
const rotatePortal = async () => {
  busy.value = true
  try { await rotatePortalToken(activeId.value); toast.success('New link generated — the previous one no longer works'); await refreshActive() }
  catch (e) { toast.error(errText(e, 'Could not regenerate the link')) }
  finally { busy.value = false }
}

const downloadLetter = async () => {
  try {
    const res = await fetch(letterDownloadUrl(activeId.value, props.letterType), { headers: authHeader() })
    if (!res.ok) throw new Error('download failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch (e) { toast.error('Could not download letter') }
}

watch(() => props.letterType, () => { activeLens.value = ''; loadAll() })
onMounted(loadAll)
</script>

<style scoped>
.ex-letter { color: var(--ex-text); }

/* skeletons */
.lt-skel { display: flex; flex-direction: column; gap: 12px; }
.skel { position: relative; overflow: hidden; height: 130px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel:first-child { height: 80px; }
.skel-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,146,60,0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

/* roster */
.roster { margin-bottom: 14px; }
.roster-cap { display: flex; align-items: center; gap: 10px; margin: 0 2px 9px; }
.rc-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.rc-count { font-size: 12px; font-weight: 800; color: var(--ex-text-muted); }
.rc-count i { font-style: normal; color: var(--ex-violet); }
.rc-clear { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.roster-strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity; }
.roster-strip > :deep(.lcc) { scroll-snap-align: start; }
.roster-strip::-webkit-scrollbar { height: 7px; }
.roster-strip::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }
.roster-strip.empty { overflow: visible; }
.roster-empty { display: inline-flex; align-items: center; gap: 7px; padding: 14px 16px; border-radius: 13px; font-size: 12.5px; font-weight: 600; color: var(--ex-text-muted);
  background: var(--ex-surface); border: 1px dashed var(--ex-border-strong); }
.roster-empty svg { color: var(--ex-text-dim); }
.roster-empty button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 750; color: var(--ex-violet); text-decoration: underline; }

/* stage */
.stage { display: flex; flex-direction: column; gap: 14px; }
.ctx { display: flex; align-items: center; gap: 14px; padding: 14px 16px; position: relative; overflow: hidden; }
.ctx-medal { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; font-family: var(--ex-mono); font-size: 14px; font-weight: 850;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ctx-id { flex: 1; min-width: 0; }
.ctx-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ctx-name { font-size: 16px; font-weight: 820; margin: 0; color: var(--ex-text); }
.ctx-lc { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--ex-violet); padding: 2px 8px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ctx-meta { font-size: 11.5px; color: var(--ex-text-muted); margin-top: 2px; display: block; }
.ctx-stats { display: flex; gap: 7px; flex-wrap: wrap; }
.ctx-stat { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 11px; cursor: pointer; font-size: 11.5px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: transform 0.2s, border-color 0.2s; }
.ctx-stat:hover { transform: translateY(-1px); border-color: var(--ex-violet-border); color: var(--ex-text); }
.ctx-stat.done { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); color: var(--ex-cleared); }
.ctx-stat b { font-size: 13px; font-weight: 850; }

/* mint grid */
.mint-grid { display: grid; grid-template-columns: minmax(0, 360px) 1fr; gap: 14px; align-items: start; }
.mint { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 22px 20px; position: relative; overflow: hidden; }

/* stepper */
.step { position: relative; display: flex; justify-content: space-between; width: 100%; padding: 0 6px; }
.step-rail { position: absolute; left: 26px; right: 26px; top: 13px; height: 3px; border-radius: 3px; background: color-mix(in srgb, var(--ex-steel) 24%, transparent); overflow: hidden; }
.step-fill { display: block; height: 100%; border-radius: 3px; background: var(--ex-grad-hero); transition: width 0.7s var(--ex-spring); }
.step.revoked .step-fill { background: linear-gradient(90deg, var(--ex-blocked), color-mix(in srgb, var(--ex-blocked) 60%, transparent)); }
.step-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.sn-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--ex-text-dim);
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); transition: all 0.4s var(--ex-spring); }
.step-node.on .sn-dot { color: #1a1206; background: var(--ex-grad-hero); border-color: transparent; box-shadow: var(--ex-violet-glow); }
.step.revoked .step-node.on .sn-dot { color: #fff; background: var(--ex-blocked); }
.step-node.cur .sn-dot { animation: ex-node-ping 1.8s ease-out infinite; }
.sn-l { font-size: 10px; font-weight: 700; color: var(--ex-text-muted); }
.step-node.on .sn-l { color: var(--ex-text); }

/* blocked gate */
.mint-block { display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center; font-size: 12px; color: var(--ex-amber);
  padding: 12px 14px; border-radius: 13px; background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); width: 100%; }
.mb-goto { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 750; color: var(--ex-violet); background: none; border: none; cursor: pointer; font-family: inherit; }

/* actions */
.mint-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.m-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 750; cursor: pointer; font-family: inherit;
  border: 1px solid var(--ex-border-strong); background: var(--ex-surface); color: var(--ex-text-secondary); }
.m-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 6px 18px -6px color-mix(in srgb, var(--ex-ember) 60%, transparent); }
.m-btn.ghost { background: transparent; }
.m-btn.danger-ghost { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.m-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.m-btn .spin { animation: ex-spin-slow 0.8s linear infinite; }
.m-issued { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ex-cleared); margin: 0; text-align: center; }

/* former-employee portal box */
.portal-box { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px; border-radius: 14px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.pb-head { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-violet); }
.pb-head i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-muted); }
.pb-row { display: flex; gap: 7px; }
.pb-input { flex: 1; min-width: 0; padding: 8px 11px; border-radius: 10px; font-size: 11px; font-family: var(--ex-mono, monospace); color: var(--ex-text-secondary);
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.pb-input:focus { outline: none; border-color: var(--ex-violet-border); }
.pb-btn { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-family: inherit;
  font-size: 11.5px; font-weight: 750; background: var(--ex-surface); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.pb-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pb-act { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; text-decoration: none; border: none; }
.pb-act.mail { background: var(--ex-grad-hero); color: #1a1206; box-shadow: var(--ex-violet-glow); }
.pb-act.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.pb-act.ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.pb-noemail { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ex-text-muted); }
.pb-noemail svg { color: var(--ex-text-dim); }
.pb-exp { display: flex; align-items: flex-start; gap: 5px; margin: 2px 0 0; font-size: 10.5px; line-height: 1.4; color: var(--ex-text-muted); }
.pb-exp svg { color: var(--ex-amber-strong); flex-shrink: 0; margin-top: 1px; }
.pb-exp b { color: var(--ex-text-secondary); font-weight: 750; }

/* delivery trace */
.trace { width: 100%; border-top: 1px dashed var(--ex-border-strong); padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.trace-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 2px; }
.trace-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 11px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.tr-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0; color: var(--ex-text-dim); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); transition: all 0.3s; }
.tr-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tr-l { font-size: 12px; font-weight: 750; color: var(--ex-text); }
.tr-s { font-size: 10.5px; color: var(--ex-text-muted); }
.tr-state { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-dim); padding: 2px 7px; border-radius: 999px; background: var(--ex-steel-soft); }
.trace-row.s-active .tr-dot { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.trace-row.s-active .tr-state { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.trace-row.s-active { border-color: color-mix(in srgb, var(--ex-cleared) 22%, transparent); }
.trace-row.s-void .tr-dot { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.trace-row.s-void .tr-state { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.trace-row.s-void .tr-l { text-decoration: line-through; opacity: 0.7; }

/* cert column */
.cert-col { position: sticky; top: 14px; }

/* revoke modal field */
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-muted); }
.fld label i { color: var(--ex-blocked); font-style: normal; }
.fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
[data-theme="light"] .fld textarea { background: rgba(255,250,242,0.72); }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.danger { border: none; background: linear-gradient(135deg,#ef4444,#b91c1c); color: #fff; }
.exm-btn.danger .spin { animation: ex-spin-slow 0.8s linear infinite; }
.exm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 940px) { .mint-grid { grid-template-columns: 1fr; } .cert-col { position: static; max-width: 430px; margin: 0 auto; width: 100%; } }
@media (prefers-reduced-motion: reduce) { .skel-shimmer { animation: none; } .step-fill { transition: none; } .step-node.cur .sn-dot { animation: none; } }
</style>
