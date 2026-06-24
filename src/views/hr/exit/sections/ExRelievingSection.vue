<template>
  <div class="ex-relieve">
    <RelievingConsole :counts="counts" :active-lens="activeLens" :loading="loadingCases || enriching"
      @pick="pickLens" @refresh="loadAll" />

    <!-- loading -->
    <div v-if="loadingCases && !roster.length" class="rl-skel">
      <div v-for="n in 3" :key="n" class="skel"><span class="skel-shimmer" /></div>
    </div>

    <ExEmptyState v-else-if="!roster.length" :icon="DoorOpen" title="No cases ready for release"
      subtitle="The relieving letter is the final act — it opens once a case has cleared every gate and the full & final settlement is closed. Accepted separations file into this queue as they progress." />

    <template v-else>
      <!-- roster strip -->
      <div class="roster">
        <div class="roster-cap">
          <span class="rc-cap-t"><Users :size="13" /> Release queue</span>
          <span class="rc-cap-n ex-mono">{{ filteredRoster.length }}<i v-if="activeLens"> · {{ lensLabel }}</i></span>
          <button v-if="activeLens" class="rc-cap-clear" type="button" @click="pickLens(activeLens)"><X :size="12" /> Clear</button>
        </div>
        <div class="roster-strip" :class="{ empty: !filteredRoster.length }">
          <RelievingTokenChip v-for="(c, i) in pagedRoster" :key="c.id" :c="c" :index="i" :active="c.id === activeId" @select="selectCase" />
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
          <span class="ctx-medal" :class="`st-${activeStatus.toLowerCase()}`">{{ initials(activeDetail.employee_name || activeDetail.employee_code) }}</span>
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
            <button class="ctx-stat" :class="{ done: settlementDone }" @click="$emit('go', { tab: 'settlement' })" type="button">
              <Scale :size="13" /><span>F&amp;F {{ settlementStatusMeta(activeDetail.settlement?.status || 'DRAFT').label }}</span>
            </button>
          </div>
        </Motion>

        <!-- release pipeline ribbon (full width) -->
        <Motion as="div" class="pipe ex-card ex-grain" :key="'pipe-' + activeId + activeStatus"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.05, ease: [0.16,1,0.3,1] }">
          <span class="pipe-cap"><Route :size="12" /> Release passage</span>
          <div class="pipe-rail">
            <span class="pipe-track"><span class="pipe-fill" :style="{ width: pipeFill + '%' }" /></span>
            <div v-for="(s, i) in pipeline" :key="s.key" class="pipe-node" :class="{ done: s.done, cur: s.cur }">
              <span class="pn-dot"><component :is="s.done ? Check : s.icon" :size="13" /></span>
              <span class="pn-l">{{ s.label }}</span>
              <span v-if="s.note" class="pn-n">{{ s.note }}</span>
            </div>
          </div>
        </Motion>

        <!-- passage grid: gate (wide, left) | certificate (right) -->
        <div class="pg-grid">
          <Motion as="div" class="gate-panel ex-card ex-grain" :key="'gate-' + activeId + activeStatus"
            :initial="reduced ? false : { opacity: 0, scale: 0.97 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.55, ease: [0.16,1,0.3,1] }">
            <RelievingGate :status="activeStatus" :blocked="blocked"
              :caption="activeDoc?.verification_code ? ('Code ' + activeDoc.verification_code) : (blocked ? 'Awaiting upstream' : 'Ready to open')" />

            <!-- release readiness — the two gates that open the aperture -->
            <div class="ready">
              <button class="ready-row" :class="{ ok: (activeDetail.clearance_progress_pct || 0) >= 100 }" type="button" @click="$emit('go', { tab: 'clearance' })">
                <ClipboardCheck :size="13" />
                <span class="rr-l">No-dues clearance</span>
                <span class="rr-bar"><i :style="{ width: (activeDetail.clearance_progress_pct || 0) + '%' }" /></span>
                <span class="rr-v ex-mono">{{ activeDetail.clearance_progress_pct || 0 }}%</span>
              </button>
              <button class="ready-row" :class="{ ok: settlementDone }" type="button" @click="$emit('go', { tab: 'settlement' })">
                <Scale :size="13" />
                <span class="rr-l">Full &amp; Final settlement</span>
                <span class="rr-state">{{ settlementStatusMeta(activeDetail.settlement?.status || 'DRAFT').label }}</span>
                <component :is="settlementDone ? CircleCheckBig : Hourglass" :size="13" class="rr-ic" />
              </button>
            </div>

            <!-- blocked gate -->
            <div v-if="blocked" class="block">
              <Lock :size="14" />
              <span>{{ blockMsg }}</span>
              <button class="block-go" @click="$emit('go', { tab: blockTab })" type="button">Open {{ blockTab.replace('-', ' ') }} <ArrowRight :size="13" /></button>
            </div>

            <!-- action rail -->
            <div class="acts">
              <Motion v-if="!activeDoc || activeStatus === 'NOT_GENERATED' || activeStatus === 'REVOKED'" as="button" class="act primary"
                :disabled="busy || blocked" :whileHover="(busy||blocked)?{}:{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="doGenerate" type="button">
                <Loader2 v-if="busy" :size="14" class="spin" /><Sparkles v-else :size="14" /> {{ activeStatus === 'REVOKED' ? 'Re-mint' : 'Draft letter' }}
              </Motion>
              <Motion v-if="activeDoc && activeStatus === 'GENERATED'" as="button" class="act primary"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="doIssue" type="button">
                <DoorOpen :size="14" /> Open the gate · Issue
              </Motion>
              <Motion v-if="activeDoc && ['GENERATED','ISSUED'].includes(activeStatus)" as="button" class="act ghost"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="downloadLetter" type="button">
                <Download :size="14" /> Download
              </Motion>
              <Motion v-if="activeDoc && ['GENERATED','ISSUED'].includes(activeStatus)" as="button" class="act danger-ghost"
                :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="revokeOpen = true" type="button">
                <Undo2 :size="14" /> Revoke
              </Motion>
            </div>
            <p v-if="activeStatus === 'ISSUED'" class="issued"><CircleCheckBig :size="13" /> Released {{ fmtDate(activeDoc?.issued_at) }} · scannable QR verifies authenticity</p>
          </Motion>

          <!-- certificate -->
          <div class="cert-col">
            <RelievingCertificate :c="activeDetail" :status="activeStatus" :code="activeDoc?.verification_code || ''" />
          </div>
        </div>

        <!-- delivery trace — full-width footer band -->
        <Motion as="div" class="trace ex-card ex-grain"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.1, ease: [0.16,1,0.3,1] }">
          <span class="trace-cap"><Share2 :size="12" /> Where this credential travels once released</span>
          <div class="trace-row">
            <div v-for="ch in channels" :key="ch.key" class="trace-card" :class="`s-${ch.state}`">
              <span class="tc-dot"><component :is="ch.icon" :size="14" /></span>
              <div class="tc-txt"><span class="tc-l">{{ ch.label }}</span><span class="tc-s">{{ ch.sub }}</span></div>
              <span class="tc-state">{{ ch.stateLabel }}</span>
            </div>
          </div>
        </Motion>
      </div>
    </template>

    <!-- revoke modal -->
    <ExModalShell :open="revokeOpen" title="Revoke release" sub="Closes the gate — invalidates the QR & withdraws it from the employee's vault"
      :icon="Undo2" tone="danger" @close="revokeOpen = false">
      <div class="fld"><label>Reason <i>*</i></label><textarea v-model="revokeReason" rows="3" placeholder="Why is this relieving letter being revoked?" /></div>
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
  DoorOpen, Users, X, Filter, Lock, ArrowRight, Sparkles, Download, Undo2,
  Loader2, CircleCheckBig, ClipboardCheck, Scale, Share2, Route, Check, Hourglass,
  PenLine, Footprints, Archive, Vault, Globe, ScrollText,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { authHeader } from '@/utils/api'
import RelievingConsole from '../components/RelievingConsole.vue'
import RelievingTokenChip from '../components/RelievingTokenChip.vue'
import RelievingGate from '../components/RelievingGate.vue'
import RelievingCertificate from '../components/RelievingCertificate.vue'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExModalShell from '../components/ExModalShell.vue'
import ExPager from '../components/ExPager.vue'
import {
  fetchCases, fetchCase, generateLetter, issueLetter, revokeLetter, letterDownloadUrl,
  fmtDate, initials, errText, settlementStatusMeta, daysRemaining, useClientPage,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()

const SLUG = 'relieving-letter'
const DOC_KEY = 'RELIEVING_LETTER'
const QUEUE_STATUSES = ['NOTICE_PERIOD', 'CLEARANCE', 'SETTLEMENT', 'COMPLETED']

const loadingCases = ref(false)
const enriching = ref(false)
const details = ref({})
const order = ref([])
const activeId = ref(null)
const activeLens = ref('')
const busy = ref(false)
const revokeOpen = ref(false)
const revokeReason = ref('')

// ── per-case enrichment ──
const docOf = (d) => (d?.documents || []).find(x => x.doc_type === DOC_KEY) || null
const settledOf = (d) => ['PAID', 'CLOSED'].includes(d?.settlement?.status)
const isBlocked = (d) => {
  if (!d) return true
  if ((d.clearance_progress_pct || 0) < 100) return true
  if (!settledOf(d)) return true
  return false
}
const enrich = (d) => {
  const doc = docOf(d)
  const letterStatus = doc?.status || 'NOT_GENERATED'
  const blocked = isBlocked(d)
  return {
    id: d.id, employee_name: d.employee_name, employee_code: d.employee_code,
    case_number: d.case_number, department_name: d.department_name,
    letterStatus, blocked, eligible: !blocked, daysLeft: daysRemaining(d.last_working_date),
    clearancePct: d.clearance_progress_pct || 0, settlementDone: settledOf(d),
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
const settlementDone = computed(() => settledOf(activeDetail.value))
const lcLabel = computed(() => (activeDetail.value?.lifecycle_state || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))

const blockTab = computed(() => (activeDetail.value?.clearance_progress_pct || 0) < 100 ? 'clearance' : 'settlement')
const blockMsg = 'A relieving letter opens only after clearance is 100% complete and the F&F is settled (PAID / CLOSED).'

// ── release pipeline (4 stations) ──
const pipeline = computed(() => {
  const d = activeDetail.value || {}
  const clr = (d.clearance_progress_pct || 0) >= 100
  const ff = settlementDone.value
  const drafted = ['GENERATED', 'ISSUED'].includes(activeStatus.value)
  const released = activeStatus.value === 'ISSUED'
  const steps = [
    { key: 'clr', label: 'Clearance', icon: ClipboardCheck, done: clr, note: (d.clearance_progress_pct || 0) + '%' },
    { key: 'ff', label: 'Settlement', icon: Scale, done: ff, note: settlementStatusMeta(d.settlement?.status || 'DRAFT').label },
    { key: 'draft', label: 'Drafted', icon: PenLine, done: drafted, note: '' },
    { key: 'rel', label: 'Released', icon: Footprints, done: released, note: '' },
  ]
  const curIdx = steps.findIndex(s => !s.done)
  return steps.map((s, i) => ({ ...s, cur: i === curIdx }))
})
const pipeFill = computed(() => {
  const done = pipeline.value.filter(s => s.done).length
  return done / (pipeline.value.length - 1) * 100
})

// ── delivery trace channels ──
const channels = computed(() => {
  const s = activeStatus.value
  const minted = s === 'GENERATED' || s === 'ISSUED'
  const issued = s === 'ISSUED'
  const revoked = s === 'REVOKED'
  const state = (active, voidable = true) => revoked && voidable ? 'void' : active ? 'active' : 'pending'
  const lbl = (st) => st === 'active' ? 'Live' : st === 'void' ? 'Withdrawn' : 'Pending'
  const rows = [
    { key: 'hr', icon: Archive, label: 'HR archive', sub: 'Admin download · document drive', st: minted ? 'active' : 'pending' },
    { key: 'self', icon: ScrollText, label: 'Self-service · My letters', sub: 'Employee downloads from Exit', st: state(issued) },
    { key: 'vault', icon: Vault, label: 'Document vault', sub: 'Filed in the personal archive', st: state(issued) },
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
const LENS_LABELS = { eligible: 'Cleared to release', drafted: 'Drafted', issued: 'Released', revoked: 'Revoked', blocked: 'Held at gate' }
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
  try { await generateLetter(activeId.value, SLUG); toast.success('Relieving letter drafted'); await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Draft failed')) }
  finally { busy.value = false }
}
const doIssue = async () => {
  busy.value = true
  try { await issueLetter(activeId.value, SLUG); toast.success('Released — the gate is open'); await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Issue failed')) }
  finally { busy.value = false }
}
const doRevoke = async () => {
  busy.value = true
  try { await revokeLetter(activeId.value, SLUG, revokeReason.value); toast.success('Release revoked'); revokeOpen.value = false; revokeReason.value = ''; await refreshActive(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Revoke failed')) }
  finally { busy.value = false }
}
const downloadLetter = async () => {
  try {
    const res = await fetch(letterDownloadUrl(activeId.value, SLUG), { headers: authHeader() })
    if (!res.ok) throw new Error('download failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch (e) { toast.error('Could not download letter') }
}

onMounted(loadAll)
</script>

<style scoped>
.ex-relieve { color: var(--ex-text); }

/* skeletons */
.rl-skel { display: flex; flex-direction: column; gap: 12px; }
.skel { position: relative; overflow: hidden; height: 130px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel:first-child { height: 80px; }
.skel-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(52,211,153,0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

/* roster */
.roster { margin-bottom: 14px; }
.roster-cap { display: flex; align-items: center; gap: 10px; margin: 0 2px 9px; }
.rc-cap-t { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.rc-cap-n { font-size: 12px; font-weight: 800; color: var(--ex-text-muted); }
.rc-cap-n i { font-style: normal; color: var(--ex-cleared); }
.rc-cap-clear { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); color: var(--ex-cleared); }
.roster-strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity; }
.roster-strip > :deep(.rtc) { scroll-snap-align: start; }
.roster-strip::-webkit-scrollbar { height: 7px; }
.roster-strip::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }
.roster-strip.empty { overflow: visible; }
.roster-empty { display: inline-flex; align-items: center; gap: 7px; padding: 14px 16px; border-radius: 13px; font-size: 12.5px; font-weight: 600; color: var(--ex-text-muted);
  background: var(--ex-surface); border: 1px dashed var(--ex-border-strong); }
.roster-empty svg { color: var(--ex-text-dim); }
.roster-empty button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 750; color: var(--ex-cleared); text-decoration: underline; }

/* stage */
.stage { display: flex; flex-direction: column; gap: 14px; }
.ctx { display: flex; align-items: center; gap: 14px; padding: 14px 16px; position: relative; overflow: hidden; }
.ctx-medal { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; font-family: var(--ex-mono); font-size: 14px; font-weight: 850;
  color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ctx-medal.st-not_generated { color: var(--ex-ember); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.ctx-medal.st-revoked { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.ctx-id { flex: 1; min-width: 0; }
.ctx-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ctx-name { font-size: 16px; font-weight: 820; margin: 0; color: var(--ex-text); }
.ctx-lc { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--ex-cleared); padding: 2px 8px; border-radius: 999px; background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.ctx-meta { font-size: 11.5px; color: var(--ex-text-muted); margin-top: 2px; display: block; }
.ctx-stats { display: flex; gap: 7px; flex-wrap: wrap; }
.ctx-stat { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 11px; cursor: pointer; font-size: 11.5px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: transform 0.2s, border-color 0.2s; }
.ctx-stat:hover { transform: translateY(-1px); border-color: var(--ex-border-strong); color: var(--ex-text); }
.ctx-stat.done { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); color: var(--ex-cleared); }
.ctx-stat b { font-size: 13px; font-weight: 850; }

/* release pipeline ribbon */
.pipe { padding: 16px 20px 18px; position: relative; overflow: hidden; }
.pipe-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 14px; }
.pipe-rail { position: relative; display: flex; justify-content: space-between; padding: 0 4px; }
.pipe-track { position: absolute; left: 24px; right: 24px; top: 14px; height: 3px; border-radius: 3px; background: color-mix(in srgb, var(--ex-steel) 24%, transparent); overflow: hidden; }
.pipe-fill { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--ex-cleared), var(--ex-ember)); transition: width 0.8s var(--ex-spring); }
.pipe-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.pn-dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--ex-text-dim);
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); transition: all 0.4s var(--ex-spring); }
.pipe-node.done .pn-dot { color: #06281b; background: linear-gradient(135deg, #6ee7b7, #34d399); border-color: transparent; box-shadow: 0 0 18px color-mix(in srgb, var(--ex-cleared) 40%, transparent); }
.pipe-node.cur .pn-dot { color: var(--ex-ember); border-color: var(--ex-violet-border); animation: ex-node-ping 1.8s ease-out infinite; }
.pn-l { font-size: 11px; font-weight: 700; color: var(--ex-text-muted); }
.pipe-node.done .pn-l, .pipe-node.cur .pn-l { color: var(--ex-text); }
.pn-n { font-size: 9.5px; font-weight: 700; color: var(--ex-text-dim); font-family: var(--ex-mono); }
.pipe-node.done .pn-n { color: var(--ex-cleared); }

/* passage grid */
.pg-grid { display: grid; grid-template-columns: 1fr minmax(0, 460px); gap: 14px; align-items: start; }
.gate-panel { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 26px 22px; position: relative; overflow: hidden; }

/* readiness rows */
.ready { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 420px; }
.ready-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font-family: inherit;
  background: var(--ex-panel); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: transform 0.2s, border-color 0.2s; text-align: left; }
.ready-row:hover { transform: translateY(-1px); border-color: var(--ex-border-strong); }
.ready-row.ok { border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); color: var(--ex-cleared); }
.ready-row > svg:first-child { flex-shrink: 0; }
.rr-l { font-size: 12px; font-weight: 700; color: var(--ex-text); flex-shrink: 0; }
.rr-bar { flex: 1; height: 5px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--ex-steel) 22%, transparent); }
.rr-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--ex-ember), var(--ex-cleared)); transition: width 0.7s var(--ex-spring); }
.rr-v { font-size: 11.5px; font-weight: 800; color: var(--ex-text); flex-shrink: 0; }
.rr-state { margin-left: auto; font-size: 11px; font-weight: 750; color: inherit; }
.rr-ic { flex-shrink: 0; }

/* blocked */
.block { display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center; font-size: 12px; color: var(--ex-amber);
  padding: 12px 14px; border-radius: 13px; background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); width: 100%; max-width: 420px; }
.block-go { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 750; color: var(--ex-cleared); background: none; border: none; cursor: pointer; font-family: inherit; }

/* actions */
.acts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.act { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 750; cursor: pointer; font-family: inherit;
  border: 1px solid var(--ex-border-strong); background: var(--ex-surface); color: var(--ex-text-secondary); }
.act.primary { border: none; background: linear-gradient(135deg, #34d399 0%, #fb923c 100%); color: #06281b; box-shadow: 0 6px 18px -6px color-mix(in srgb, var(--ex-cleared) 60%, transparent); }
.act.ghost { background: transparent; }
.act.danger-ghost { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.act:disabled { opacity: 0.5; cursor: not-allowed; }
.act .spin { animation: ex-spin-slow 0.8s linear infinite; }
.issued { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ex-cleared); margin: 0; text-align: center; }

.cert-col { position: sticky; top: 14px; }

/* delivery trace footer */
.trace { padding: 16px 20px 18px; position: relative; overflow: hidden; }
.trace-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 12px; }
.trace-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.trace-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.tc-dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--ex-text-dim); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); transition: all 0.3s; }
.tc-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tc-l { font-size: 11.5px; font-weight: 750; color: var(--ex-text); }
.tc-s { font-size: 10px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-state { font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-dim); padding: 2px 7px; border-radius: 999px; background: var(--ex-steel-soft); flex-shrink: 0; }
.trace-card.s-active .tc-dot { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.trace-card.s-active .tc-state { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.trace-card.s-active { border-color: color-mix(in srgb, var(--ex-cleared) 22%, transparent); }
.trace-card.s-void .tc-dot { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.trace-card.s-void .tc-state { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.trace-card.s-void .tc-l { text-decoration: line-through; opacity: 0.7; }

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

@media (max-width: 940px) {
  .pg-grid { grid-template-columns: 1fr; }
  .cert-col { position: static; max-width: 460px; margin: 0 auto; width: 100%; }
  .trace-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) { .trace-row { grid-template-columns: 1fr; } .pn-l { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .skel-shimmer { animation: none; } .pipe-fill, .rr-bar i { transition: none; } .pipe-node.cur .pn-dot { animation: none; } }
</style>
