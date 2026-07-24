<template>
  <Teleport to="body">
    <div v-if="open" class="pds" @click.self="tryClose">
      <div class="pds-card" :class="{ sealing, fly, retreat }">
        <div class="pds-sealfx"><svg viewBox="0 0 190 190">
          <circle class="sr1" cx="95" cy="95" r="84" />
          <circle class="sr2" cx="95" cy="95" r="70" />
          <text class="st" x="95" y="90" text-anchor="middle">Approved</text>
          <text class="st st2" x="95" y="108" text-anchor="middle">{{ sealerLine }}</text>
        </svg></div>

        <div class="pds-head">
          <div class="de sd-mono"><span>DOSSIER · {{ (pir?.status || '').replace('_', ' ').toUpperCase() }}<template v-if="pir?.root_cause_category"> · CATEGORY: {{ pir.root_cause_category.toUpperCase() }}</template></span>
            <button class="pds-close" aria-label="Close" @click="tryClose">✕</button></div>
          <h3>{{ pir?.title }}</h3>
          <div class="dmeta sd-mono">
            <span>{{ pir?.report_number }}</span>
            <button class="inc-link" @click="$emit('open-incident', pir?.ticket_id)">{{ pir?.ticket_number }}</button>
            <span class="sev" :class="'s' + (pir?.sev || 4)">SEV{{ pir?.sev || 4 }}</span>
            <span><span class="ava">{{ initials(pir?.created_by_name) }}</span> {{ pir?.created_by_name || '—' }}<template v-if="mine"> (you)</template></span>
            <span v-if="pir?.submitted_at">SUBMITTED {{ shortAt(pir.submitted_at) }}</span>
            <button class="pdfl" @click="$emit('export-pdf', pir)">PDF ↓</button>
          </div>
        </div>

        <div class="pds-body" v-if="pir">
          <div class="dsec"><div class="dlab sd-mono">EXECUTIVE SUMMARY</div><p>{{ pir.executive_summary || '—' }}</p></div>
          <div class="dsec"><div class="dlab sd-mono">IMPACT</div>
            <div class="d2"><div><h5 class="sd-mono">BUSINESS</h5><p>{{ pir.business_impact || '—' }}</p></div>
              <div><h5 class="sd-mono">TECHNICAL</h5><p>{{ pir.technical_impact || '—' }}</p></div></div></div>
          <div class="dsec"><div class="dlab sd-mono">FROZEN METRICS SNAPSHOT</div>
            <div v-if="m" class="mband">
              <div class="mb"><div class="mv">{{ mins(m.mttd_minutes) }}</div><div class="ml sd-mono">MTTD</div></div>
              <div class="mb"><div class="mv">{{ mins(m.mtta_minutes) }}</div><div class="ml sd-mono">MTTA</div></div>
              <div class="mb"><div class="mv">{{ mins(m.mttr_minutes) }}</div><div class="ml sd-mono">MTTR</div></div>
              <div class="mb"><div class="mv">{{ mins(m.duration_minutes) }}</div><div class="ml sd-mono">DURATION</div></div>
              <div class="mb"><div class="mv">{{ numFmt(m.affected_users) }}</div><div class="ml sd-mono">USERS</div></div>
              <div class="mb"><div class="mv">{{ m.decision_count ?? '—' }}</div><div class="ml sd-mono">DECISIONS</div></div>
              <div class="mb"><div class="mv">{{ m.update_count ?? '—' }}</div><div class="ml sd-mono">UPDATES</div></div>
              <div class="mb"><div class="mv">{{ m.watcher_count ?? '—' }}</div><div class="ml sd-mono">WATCHERS</div></div>
            </div>
            <p v-else class="dimline">Not frozen yet — the snapshot lands at submit.</p>
            <div class="mfroz sd-mono" v-if="m"><Lock :size="11" /> FROZEN {{ shortAt(m.frozen_at) }} · IMMUTABLE UNDER REVISION</div></div>
          <div class="dsec"><div class="dlab sd-mono">ROOT CAUSE</div>
            <span v-if="pir.root_cause_category" class="catchip sd-mono">CATEGORY · {{ pir.root_cause_category.toUpperCase() }}</span>
            <p>{{ pir.root_cause || '—' }}</p></div>
          <div class="dsec" v-if="(pir.five_whys || []).length"><div class="dlab sd-mono">FIVE WHYS</div>
            <div class="whys"><div v-for="(w, i) in pir.five_whys" :key="i" class="why" :data-n="i + 1">{{ w }}</div></div></div>
          <div class="dsec" v-if="(pir.contributing_factors || []).length"><div class="dlab sd-mono">CONTRIBUTING FACTORS</div>
            <div class="tags"><span v-for="f in pir.contributing_factors" :key="f" class="tag">{{ f }}</span></div></div>
          <div class="dsec" v-if="(pir.went_well || []).length || (pir.went_wrong || []).length">
            <div class="dlab sd-mono">BLAMELESS REGISTERS</div>
            <div class="d2">
              <div><h5 class="sd-mono em">WENT WELL</h5><ul class="reg well"><li v-for="(w, i) in pir.went_well" :key="'w' + i">{{ w }}</li></ul></div>
              <div><h5 class="sd-mono rd">WENT WRONG</h5><ul class="reg wrong"><li v-for="(w, i) in pir.went_wrong" :key="'x' + i">{{ w }}</li></ul></div>
            </div></div>
          <div class="dsec"><div class="dlab sd-mono">ACTION REGISTERS</div>
            <h5 class="sd-mono sub-h">CORRECTIVE</h5>
            <div v-for="(a, i) in pir.corrective_actions" :key="a.aid || 'c' + i" class="dact">
              <span class="dai sd-mono">{{ a.aid || '—' }}</span><span class="dat">{{ a.action }}</span>
              <span class="ownc"><span class="ava">{{ initials(a.owner_name) }}</span></span>
              <span class="dad sd-mono">{{ dueLabel(a) }}</span>
              <span class="astat sd-mono" :class="statClass(a)">{{ statLabel(a) }}</span></div>
            <p v-if="!(pir.corrective_actions || []).length" class="dimline">None on register.</p>
            <h5 class="sd-mono sub-h" style="margin-top:15px">PREVENTIVE</h5>
            <div v-for="(a, i) in pir.preventive_actions" :key="a.aid || 'p' + i" class="dact">
              <span class="dai sd-mono">{{ a.aid || '—' }}</span><span class="dat">{{ a.action }}</span>
              <span class="ownc"><span class="ava">{{ initials(a.owner_name) }}</span></span>
              <span class="dad sd-mono">{{ dueLabel(a) }}</span>
              <span class="astat sd-mono" :class="statClass(a)">{{ statLabel(a) }}</span></div>
            <p v-if="!(pir.preventive_actions || []).length" class="dimline">None on register.</p></div>
          <div class="dsec" v-if="(pir.participants || []).length"><div class="dlab sd-mono">PARTICIPANTS</div>
            <div class="roster"><span v-for="(p, i) in pir.participants" :key="'r' + i" class="rchip">
              <span class="ava">{{ initials(p.name) }}</span>{{ p.name }}<small class="sd-mono">{{ (p.role || 'attendee').toUpperCase() }}</small></span></div></div>
          <div class="dsec" v-if="pir.review_meeting_at || pir.review_meeting_notes"><div class="dlab sd-mono">REVIEW MEETING</div>
            <p v-if="pir.review_meeting_at"><b>{{ longAt(pir.review_meeting_at) }}</b></p>
            <p v-if="pir.review_meeting_notes" style="margin-top:7px">{{ pir.review_meeting_notes }}</p></div>
          <div class="dsec" v-if="pir.lessons_learned"><div class="dlab sd-mono">LESSONS LEARNED</div><p>{{ pir.lessons_learned }}</p></div>
          <div class="dsec" v-if="tl.length"><div class="dlab sd-mono">FROZEN INCIDENT TIMELINE</div>
            <div class="tline"><div v-for="(e, i) in tl" :key="'t' + i" class="tev">
              <span class="tt sd-mono">{{ tlAt(e) }}</span>{{ tlLabel(e) }}</div></div></div>
          <div class="dsec"><div class="dlab sd-mono">APPROVALS TRAIL</div>
            <div v-for="(a, i) in approvals" :key="'a' + i" class="apr">
              <span class="aw">{{ a.decision === 'rejected' ? 'Rejected to draft' : 'Approved & sealed' }}<template v-if="a.note"> — “{{ a.note }}”</template></span>
              <span>{{ a.name }} ({{ a.role }})</span><span class="ad sd-mono">{{ shortAt(a.at) }}</span></div>
            <p v-if="!approvals.length" class="dimline">The trail begins at review.</p></div>
          <div class="dsec" v-if="revisions.length"><div class="dlab sd-mono">REVISION HISTORY</div>
            <div v-for="(r, i) in revisions" :key="'v' + i" class="apr">
              <span class="ad sd-mono">REV {{ revisions.length - i }}</span>
              <span class="aw" style="flex:1;margin:0 14px">{{ r.by_name }} · {{ (r.fields || []).join(', ') }}</span>
              <span class="ad sd-mono">{{ shortAt(r.at) }}</span></div></div>
        </div>

        <!-- verbs / plates -->
        <template v-if="pir">
          <div v-if="pir.status === 'in_review' && fourEyes" class="pds-plate">
            <Lock :size="26" />
            <div><div class="pt sd-mono">FOUR-EYES LOCK</div>
              <p>You submitted this dossier. Governance requires a <b>second reviewer</b> to sign — a different team lead
                or a co-administrator. Your approve &amp; reject verbs are withheld on your own work.</p></div>
          </div>
          <template v-else-if="pir.status === 'in_review'">
            <div v-if="noteOpen" class="pds-notebox">
              <textarea v-model="note" rows="3" placeholder="Rejection note (required) — what must change before resubmission…" />
              <div class="nrow"><span class="nh sd-mono">RETURNS TO DRAFT · AUTHOR IS NOTIFIED · THE TRAIL KEEPS THE NOTE</span>
                <button class="nsend sd-mono" :disabled="note.trim().length < 8 || busy" @click="$emit('reject', { pir, note: note.trim() })">RETURN TO DRAFT</button></div>
            </div>
            <div class="pds-verbs">
              <button class="vbtn approve sd-mono" :disabled="busy" @click="doApprove">APPROVE &amp; SEAL — {{ pir.report_number }}</button>
              <button class="vbtn reject sd-mono" :disabled="busy" @click="noteOpen = !noteOpen">REJECT TO DRAFT</button>
            </div>
          </template>
          <div v-else-if="pir.status === 'approved'" class="pds-plate sealed">
            <CircleCheck :size="26" />
            <div><div class="pt sd-mono">SEALED — AWAITING PUBLICATION</div>
              <p>Approved<template v-if="lastApprover"> by <b>{{ lastApprover }}</b></template>. Publication is an administrator verb —
                run the ceremony from the Publish Desk.</p></div>
          </div>
          <div v-else-if="pir.status === 'published'" class="pds-plate sealed">
            <CircleCheck :size="26" />
            <div><div class="pt sd-mono">PUBLISHED · ON THE RECORD</div>
              <p>Distributed to {{ pir.distribution?.recipients ?? '—' }} recipients and part of the organisation's canon.</p></div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/* SdPirDossierSheet — THE PARALLAX ATRIUM's dossier reader (artifact C7, 1:1).
   Full-document sheet over the live PirResponse with the governance verbs:
   APPROVE plays the seal-draw + fly-away ceremony before the parent commits the
   API call; REJECT requires a note and retreats. Section-launched overlay (z 2000). */
import { ref, computed, watch } from 'vue'
import { Lock, CircleCheck } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  pir: { type: Object, default: null },       // full PirResponse
  me: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'approve', 'reject', 'export-pdf', 'open-incident'])

const sealing = ref(false)
const fly = ref(false)
const retreat = ref(false)
const noteOpen = ref(false)
const note = ref('')

const RM = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

const mine = computed(() => props.me && String(props.pir?.created_by_id || '') === String(props.me.id))
const fourEyes = computed(() => !props.isAdmin && props.me
  && String(props.pir?.submitted_by_id || '') === String(props.me.id))
const m = computed(() => props.pir?.metrics_snapshot || null)
const tl = computed(() => (props.pir?.timeline_snapshot || []).slice(-9))
const approvals = computed(() => [...(props.pir?.approvals || [])].reverse())
const revisions = computed(() => [...(props.pir?.revisions || [])].reverse())
const lastApprover = computed(() => approvals.value.find(a => a.decision === 'approved')?.name)
const sealerLine = computed(() => `Sealed · ${(props.me?.full_name || 'Reviewer').split(' ').map(w => w[0] ? w[0] + '.' : '').join(' ')} ${(props.me?.full_name || '').split(' ').slice(-1)[0] || ''}`.trim())

watch(() => props.open, (v) => {
  if (v) { sealing.value = false; fly.value = false; retreat.value = false; noteOpen.value = false; note.value = '' }
  document.body.style.overflow = v ? 'hidden' : ''
})

const tryClose = () => { if (!sealing.value && !fly.value) emit('close') }
const doApprove = () => {
  if (RM) { emit('approve', { pir: props.pir }); return }
  sealing.value = true
  setTimeout(() => { fly.value = true }, 1350)
  setTimeout(() => emit('approve', { pir: props.pir }), 2050)
}
defineExpose({
  playRetreat: () => new Promise((res) => {
    if (RM) { res(); return }
    retreat.value = true
    setTimeout(res, 600)
  }),
})

const initials = (n) => (n || '—').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const mins = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  return n >= 60 ? `${Math.floor(n / 60)}h ${String(Math.round(n % 60)).padStart(2, '0')}m` : `${Math.round(n)}m`
}
const numFmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'))
const shortAt = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(iso).slice(0, 16).replace('T', ' ') }
}
const longAt = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(iso).slice(0, 16).replace('T', ' ') }
}
const todayIso = new Date().toISOString().slice(0, 10)
const dueLabel = (a) => (a.target_date ? String(a.target_date).slice(0, 10) : '—')
const statClass = (a) => {
  const st = (a.status || 'open').toLowerCase()
  if (st !== 'done' && a.target_date && String(a.target_date).slice(0, 10) < todayIso) return 'ovd'
  return st === 'done' ? 'done' : st === 'in_progress' ? 'prog' : 'open'
}
const statLabel = (a) => ({ ovd: 'OVERDUE', done: 'DONE', prog: 'IN PROGRESS', open: 'OPEN' }[statClass(a)])
const tlAt = (e) => String(e.at || '').slice(11, 16) || String(e.at || '').slice(0, 10)
const tlLabel = (e) => `${(e.event || '').replace(/_/g, ' ')}${e.actor ? ' — ' + e.actor : ''}`
</script>

<style scoped>
.pds { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: flex-start; justify-content: center;
  overflow-y: auto; background: rgba(8, 6, 4, 0.6); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  padding: 52px 20px 80px; animation: pds-fade 0.4s ease; }
[data-theme="light"] .pds { background: rgba(60, 44, 20, 0.28); }
@keyframes pds-fade { from { opacity: 0; } }
.pds-card { width: 900px; max-width: 100%; background: var(--sd-surface); border: 1px solid var(--pat-line, var(--sd-pir-brd2));
  border-radius: 24px; position: relative; box-shadow: var(--sd-pir-shadow), 0 0 90px rgba(232, 176, 75, 0.09);
  animation: pds-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: center 30%; overflow: hidden; }
@keyframes pds-rise { from { opacity: 0; transform: translateY(44px) scale(0.96) rotateX(4deg); } }
.pds-card.sealing { animation: pds-float 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes pds-float { 40% { transform: scale(1.035) translateY(-8px);
    box-shadow: 0 50px 110px rgba(0, 0, 0, 0.6), 0 0 130px rgba(232, 176, 75, 0.35); }
  100% { transform: scale(1.02) translateY(-4px);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.55), 0 0 100px rgba(232, 176, 75, 0.28); } }
.pds-card.fly { animation: pds-fly 0.75s cubic-bezier(0.5, 0, 0.8, 0.4) forwards; }
@keyframes pds-fly { to { transform: translate(30vw, 34vh) scale(0.06) rotate(4deg); opacity: 0; } }
.pds-card.retreat { animation: pds-ret 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes pds-ret { to { transform: translateY(46px) scale(0.95); opacity: 0; } }

.pds-sealfx { position: absolute; inset: 0; display: none; place-items: center; z-index: 20; pointer-events: none; }
.pds-card.sealing .pds-sealfx { display: grid; }
.pds-sealfx svg { width: 190px; height: 190px; }
.pds-sealfx .sr1 { fill: none; stroke: var(--sd-pir-core); stroke-width: 2; stroke-dasharray: 540; stroke-dashoffset: 540;
  animation: pds-sdraw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes pds-sdraw { to { stroke-dashoffset: 0; } }
.pds-sealfx .sr2 { fill: none; stroke: #f5c56b; stroke-width: 1; stroke-dasharray: 4 7; opacity: 0; transform-origin: 95px 95px;
  animation: pds-sspin 2.4s linear infinite, pds-sfade 0.4s 0.5s forwards; }
@keyframes pds-sspin { to { transform: rotate(360deg); } }
@keyframes pds-sfade { to { opacity: 0.9; } }
.pds-sealfx .st { font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.3em; fill: #f5c56b; opacity: 0;
  text-transform: uppercase; animation: pds-sfade 0.4s 0.7s forwards; }
.pds-sealfx .st2 { font-size: 9px; }

.pds-head { padding: 30px 38px 24px; border-bottom: 1px solid var(--pat-hair, var(--sd-pir-brd));
  position: sticky; top: 0; background: var(--sd-surface); z-index: 5; }
.pds-head .de { font-size: 9.5px; letter-spacing: 0.3em; color: var(--pat-amber-ink, var(--sd-pir-core));
  margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.pds-close { background: none; border: 1px solid var(--pat-line-soft, var(--sd-pir-brd)); border-radius: 8px;
  width: 30px; height: 30px; color: var(--sd-text-secondary); font-size: 14px; line-height: 1; cursor: pointer; transition: all 0.3s; }
.pds-close:hover { border-color: var(--sd-pir-red); color: var(--sd-pir-red); transform: rotate(90deg); }
.pds-head h3 { font-size: 26px; font-weight: 250; letter-spacing: -0.02em; margin: 0 0 10px; color: var(--sd-text); }
.dmeta { display: flex; align-items: center; gap: 11px; font-size: 11px; color: var(--pat-ink3, var(--sd-pir-ink3)); flex-wrap: wrap; }
.inc-link { background: none; border: none; cursor: pointer; font: inherit; color: var(--pat-amber-ink, var(--sd-pir-core)); padding: 0; }
.inc-link:hover { text-decoration: underline; }
.pdfl { background: none; border: 1px solid var(--pat-line-soft, var(--sd-pir-brd)); border-radius: 8px; cursor: pointer;
  color: var(--pat-ink2, var(--sd-pir-ink2)); font: inherit; font-size: 9.5px; letter-spacing: 0.12em; padding: 4px 10px; transition: all 0.3s; }
.pdfl:hover { color: var(--pat-amber-ink, var(--sd-pir-core)); border-color: var(--sd-pir-core); }
.sev { font-size: 9px; letter-spacing: 0.1em; padding: 3px 7px; border-radius: 6px; }
.sev.s1 { color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); }
.sev.s2 { color: var(--pat-amber-ink, var(--sd-pir-core)); background: rgba(232, 176, 75, 0.1); border: 1px solid var(--pat-line, var(--sd-pir-brd2)); }
.ava { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; font-family: var(--sd-mono);
  font-size: 8.5px; color: #f5c56b; background: linear-gradient(140deg, rgba(232, 176, 75, 0.22), rgba(180, 83, 9, 0.16));
  border: 1px solid var(--pat-line, var(--sd-pir-brd2)); margin-right: 5px; vertical-align: middle; }
[data-theme="light"] .ava { color: var(--sd-pir-deep); }

.pds-body { padding: 10px 38px 30px; }
.dsec { padding: 24px 0; border-bottom: 1px solid var(--pat-hair, var(--sd-pir-brd)); }
.dsec:last-child { border-bottom: none; }
.dlab { font-size: 9.5px; letter-spacing: 0.28em; color: var(--pat-amber-ink, var(--sd-pir-core)); margin-bottom: 13px;
  display: flex; align-items: center; gap: 12px; }
.dlab::after { content: ''; flex: 1; height: 1px; background: var(--pat-hair, var(--sd-pir-brd)); }
.dsec p { font-size: 13.5px; font-weight: 300; line-height: 1.7; color: var(--sd-text-secondary); margin: 0; }
.dsec p b { color: var(--sd-text); font-weight: 500; }
.dimline { color: var(--pat-ink3, var(--sd-pir-ink3)) !important; font-size: 12px !important; }
.d2 { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
@media (max-width: 760px) { .d2 { grid-template-columns: 1fr; } }
.d2 h5 { font-size: 10px; letter-spacing: 0.18em; color: var(--pat-ink3, var(--sd-pir-ink3)); margin: 0 0 8px; }
.d2 h5.em { color: var(--sd-pir-em); } .d2 h5.rd { color: var(--sd-pir-red); }
.sub-h { font-size: 10px; letter-spacing: 0.18em; color: var(--pat-ink3, var(--sd-pir-ink3)); margin: 0 0 9px; }

.mband { display: grid; grid-template-columns: repeat(8, 1fr); border: 1px solid var(--pat-line, var(--sd-pir-brd2));
  border-radius: 14px; overflow: hidden; background: linear-gradient(180deg, var(--pat-panel2, var(--sd-pir-core-soft)), transparent); }
@media (max-width: 900px) { .mband { grid-template-columns: repeat(4, 1fr); } }
.mb { padding: 14px 8px; text-align: center; }
.mb + .mb { border-left: 1px solid var(--pat-hair, var(--sd-pir-brd)); }
.mb .mv { font-size: 19px; font-weight: 250; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.mb .ml { font-size: 7.5px; letter-spacing: 0.14em; color: var(--pat-ink3, var(--sd-pir-ink3)); margin-top: 5px; }
.mfroz { font-size: 9px; color: var(--pat-ink3, var(--sd-pir-ink3)); margin-top: 9px; display: flex; align-items: center; gap: 6px; }

.whys { position: relative; padding-left: 26px; }
.whys::before { content: ''; position: absolute; left: 8px; top: 8px; bottom: 8px; width: 1px;
  background: linear-gradient(180deg, var(--sd-pir-core), var(--pat-line-soft, var(--sd-pir-brd))); }
.why { position: relative; padding: 8px 0 8px 4px; font-size: 13px; font-weight: 300; color: var(--sd-text-secondary); line-height: 1.55; }
.why::before { content: attr(data-n); position: absolute; left: -26px; top: 10px; width: 17px; height: 17px; border-radius: 50%;
  background: var(--sd-surface); border: 1px solid var(--sd-pir-core); color: var(--pat-amber-ink, var(--sd-pir-core));
  font-family: var(--sd-mono); font-size: 8.5px; display: grid; place-items: center; }

.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { font-size: 10.5px; padding: 6px 13px; border-radius: 99px; border: 1px solid var(--pat-line-soft, var(--sd-pir-brd));
  color: var(--sd-text-secondary); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.tag:hover { border-color: var(--sd-pir-core); color: var(--pat-amber-ink, var(--sd-pir-core)); transform: translateY(-2px); }
.catchip { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; letter-spacing: 0.16em; padding: 5px 12px;
  border-radius: 99px; background: rgba(232, 176, 75, 0.12); border: 1px solid var(--pat-line, var(--sd-pir-brd2));
  color: var(--pat-amber-ink, var(--sd-pir-core)); margin-bottom: 12px; }

.reg { border-left: 2px solid; padding: 2px 0 2px 16px; margin: 0; }
.reg.well { border-color: var(--sd-pir-em); } .reg.wrong { border-color: var(--sd-pir-red); }
.reg li { list-style: none; font-size: 12.5px; font-weight: 300; color: var(--sd-text-secondary); padding: 5px 0; line-height: 1.5; }
.reg li::before { content: '—'; margin-right: 9px; color: var(--pat-ink3, var(--sd-pir-ink3)); }

.dact { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1px solid var(--pat-hair, var(--sd-pir-brd));
  border-radius: 12px; margin-bottom: 8px; transition: border-color 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dact:hover { border-color: var(--pat-line, var(--sd-pir-brd2)); transform: translateX(4px); }
.dact .dai { font-size: 9.5px; color: var(--pat-amber-ink, var(--sd-pir-core)); flex-shrink: 0; }
.dact .dat { flex: 1; font-size: 12.5px; font-weight: 300; color: var(--sd-text-secondary); }
.dact .dad { font-size: 10px; color: var(--pat-ink3, var(--sd-pir-ink3)); flex-shrink: 0; }
.astat { font-size: 9.5px; letter-spacing: 0.14em; padding: 4px 10px; border-radius: 99px; flex-shrink: 0; }
.astat.ovd { color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); }
.astat.prog { color: var(--pat-amber-ink, var(--sd-pir-core)); background: rgba(232, 176, 75, 0.08); border: 1px solid var(--pat-line, var(--sd-pir-brd2)); }
.astat.open { color: var(--sd-text-secondary); border: 1px solid var(--pat-hair, var(--sd-pir-brd)); }
.astat.done { color: var(--sd-pir-em); background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.3); }

.roster { display: flex; flex-wrap: wrap; gap: 10px; }
.rchip { display: flex; align-items: center; gap: 6px; padding: 7px 14px 7px 8px; border: 1px solid var(--pat-line-soft, var(--sd-pir-brd));
  border-radius: 99px; font-size: 11.5px; color: var(--sd-text-secondary); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.rchip:hover { border-color: var(--pat-line, var(--sd-pir-brd2)); transform: translateY(-2px); }
.rchip small { color: var(--pat-ink3, var(--sd-pir-ink3)); font-size: 9.5px; }

.tline { position: relative; padding-left: 22px; }
.tline::before { content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 1px; background: var(--pat-line-soft, var(--sd-pir-brd)); }
.tev { position: relative; padding: 6px 0; font-size: 12px; color: var(--sd-text-secondary); font-weight: 300; }
.tev::before { content: ''; position: absolute; left: -20px; top: 12px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-surface); border: 1.5px solid var(--sd-pir-core); }
.tev .tt { font-size: 10px; color: var(--pat-amber-ink, var(--sd-pir-core)); margin-right: 11px; }

.apr { display: flex; justify-content: space-between; gap: 12px; padding: 9px 2px; font-size: 12px;
  color: var(--sd-text-secondary); border-bottom: 1px dashed var(--pat-hair, var(--sd-pir-brd)); }
.apr:last-child { border: none; }
.apr .aw { color: var(--sd-text); }
.apr .ad { color: var(--pat-ink3, var(--sd-pir-ink3)); font-size: 10.5px; }

.pds-verbs { position: sticky; bottom: 0; padding: 20px 38px 26px;
  background: linear-gradient(180deg, transparent, var(--sd-surface) 30%); display: flex; gap: 12px; align-items: center; z-index: 6; }
.vbtn { border-radius: 13px; padding: 14px 26px; font-size: 11.5px; letter-spacing: 0.16em; font-weight: 600; border: none;
  cursor: pointer; transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s; position: relative; overflow: hidden; }
.vbtn.approve { flex: 1.3; background: linear-gradient(120deg, #f5c56b, var(--sd-pir-core) 55%, var(--sd-pir-deep)); color: #1a1206; }
.vbtn.approve:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(232, 176, 75, 0.4); }
.vbtn.reject { flex: 1; background: none; border: 1px solid rgba(239, 68, 68, 0.4); color: var(--sd-pir-red); }
.vbtn.reject:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); transform: translateY(-3px); }
.vbtn:active { transform: translateY(-1px) scale(0.98); }
.vbtn:disabled { opacity: 0.5; cursor: not-allowed; }
.pds-notebox { padding: 0 38px 22px; animation: pds-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.pds-notebox textarea { width: 100%; min-height: 88px; background: var(--pat-panel, var(--sd-pir-glass));
  border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 13px 15px; color: var(--sd-text);
  font-family: inherit; font-size: 13px; font-weight: 300; resize: vertical; outline: none; }
.pds-notebox textarea:focus { border-color: var(--sd-pir-red); }
.pds-notebox .nrow { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 12px; }
.pds-notebox .nh { font-size: 10px; color: var(--pat-ink3, var(--sd-pir-ink3)); }
.nsend { border: 1px solid rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.12); color: var(--sd-pir-red);
  border-radius: 10px; padding: 10px 20px; font-size: 10.5px; letter-spacing: 0.14em; cursor: pointer; transition: all 0.3s; }
.nsend:disabled { opacity: 0.35; pointer-events: none; }
.nsend:hover { background: rgba(239, 68, 68, 0.2); transform: translateY(-2px); }

.pds-plate { margin: 0 38px 30px; border: 1px dashed var(--pat-line, var(--sd-pir-brd2)); border-radius: 16px;
  padding: 22px 26px; display: flex; gap: 18px; align-items: center;
  background: repeating-linear-gradient(-45deg, rgba(232, 176, 75, 0.03) 0 12px, transparent 12px 24px); }
.pds-plate :deep(svg) { color: var(--sd-pir-core); flex-shrink: 0; }
.pds-plate .pt { font-size: 11px; letter-spacing: 0.26em; color: var(--pat-amber-ink, var(--sd-pir-core)); margin-bottom: 7px; }
.pds-plate p { font-size: 12.5px; color: var(--sd-text-secondary); font-weight: 300; line-height: 1.6; margin: 0; }
.pds-plate.sealed { border-style: solid; border-color: rgba(52, 211, 153, 0.35); background: rgba(52, 211, 153, 0.05); }
.pds-plate.sealed :deep(svg) { color: var(--sd-pir-em); }
.pds-plate.sealed .pt { color: var(--sd-pir-em); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pds,
  html:not([data-cinematic="on"]) .pds-card { animation: none; }
}
</style>
