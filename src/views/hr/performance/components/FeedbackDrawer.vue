<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="fd-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="aside" class="fd" :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: 40, opacity: 0 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="fd-edge" aria-hidden="true" />

          <header class="fd-head">
            <div class="fd-head-id">
              <b>{{ r.employee_name || '—' }}</b>
              <span>{{ r.designation_name || '' }}{{ r.department_name ? ' · ' + r.department_name : '' }}</span>
            </div>
            <span class="fd-stamp" :style="{ '--c': reqMeta.color }"><component :is="reqMeta.icon" :size="11" />{{ reqMeta.label }}</span>
            <button class="fd-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div v-if="loading" class="fd-loading"><Loader2 :size="20" class="perf-spin" /> Loading…</div>
          <div v-else class="fd-body">
            <!-- rollup header -->
            <div class="fd-rollup">
              <div class="fd-rate-ring" :style="{ '--perf-p': rateDeg + 'deg' }">
                <span><b>{{ Math.round(rollup.response_rate || 0) }}</b><i>%</i></span>
              </div>
              <div class="fd-rate-facts">
                <div class="fd-rate-row"><b>{{ rollup.submitted || 0 }}</b><span>of {{ rollup.invited || 0 }} responded</span></div>
                <div v-if="rollup.overall_avg != null" class="fd-rate-row"><b :style="{ color: 'var(--perf-gold)' }">{{ rollup.overall_avg.toFixed(1) }}</b><span>/ {{ Math.round(r.rating_max) }} avg overall</span></div>
                <div class="fd-rate-meta">
                  <span><CalendarRange :size="11" /> {{ r.period_label || r.cycle }}</span>
                  <span v-if="r.due_date"><Clock :size="11" /> due {{ fmtDate(r.due_date) }}</span>
                </div>
              </div>
            </div>

            <!-- perception radar -->
            <div class="fd-panel">
              <div class="fd-panel-head"><Orbit :size="13" /> Perception by competency</div>
              <FeedbackRadar v-if="rollup.by_competency && rollup.by_competency.length" :competencies="rollup.by_competency" :max="Number(r.rating_max) || 5" />
              <p v-else class="fd-empty">No scored responses yet.</p>
            </div>

            <!-- raters -->
            <div class="fd-panel">
              <div class="fd-panel-head">
                <Users :size="13" /> Raters ({{ (r.responses || []).length }})
                <span class="fd-grow" />
                <button v-if="r.anonymous" class="fd-reveal" type="button" @click="toggleReveal">
                  <component :is="revealed ? EyeOff : Eye" :size="12" />{{ revealed ? 'Hide' : 'Reveal' }}
                </button>
              </div>
              <div class="fd-raters">
                <div v-for="resp in (r.responses || [])" :key="resp.id" class="fd-rater" :class="{ open: expanded === resp.id }">
                  <button class="fd-rater-row" type="button" @click="toggleExpand(resp)">
                    <span class="fd-rater-av" :style="{ '--c': relMeta(resp.relationship_type).color }"><component :is="relMeta(resp.relationship_type).icon" :size="12" /></span>
                    <div class="fd-rater-id">
                      <b>{{ resp.reviewer_name }}</b>
                      <span>{{ relMeta(resp.relationship_type).label }}</span>
                    </div>
                    <span v-if="resp.overall_rating != null" class="fd-rater-score">{{ resp.overall_rating.toFixed(1) }}</span>
                    <span class="fd-rater-st" :class="resp.status.toLowerCase()">{{ respLabel(resp.status) }}</span>
                    <button v-if="resp.status === 'PENDING'" class="fd-rater-rm" type="button" title="Remove rater" @click.stop="onRemove(resp)"><X :size="13" /></button>
                  </button>
                  <div v-if="expanded === resp.id && resp.status === 'SUBMITTED'" class="fd-rater-detail">
                    <div v-if="resp.ratings && resp.ratings.length" class="fd-rt-grid">
                      <div v-for="rt in resp.ratings" :key="rt.key" class="fd-rt">
                        <span class="fd-rt-lab">{{ rt.label || rt.key }}</span>
                        <span class="fd-rt-track"><i :style="{ width: ((rt.rating || 0) / (Number(r.rating_max) || 5) * 100) + '%' }" /></span>
                        <b>{{ rt.rating ?? '—' }}</b>
                      </div>
                    </div>
                    <p v-if="resp.strengths" class="fd-rt-note"><b>Strengths:</b> {{ resp.strengths }}</p>
                    <p v-if="resp.improvements" class="fd-rt-note"><b>To improve:</b> {{ resp.improvements }}</p>
                    <p v-if="resp.comments" class="fd-rt-note"><b>Comments:</b> {{ resp.comments }}</p>
                  </div>
                </div>
              </div>
              <!-- nominate -->
              <div v-if="r.status === 'OPEN'" class="fd-nominate">
                <div class="fd-search">
                  <Search :size="13" />
                  <input v-model="nomSearch" class="fd-search-in" placeholder="Nominate another rater…" />
                </div>
                <div v-if="nomSearch && nomResults.length" class="fd-nom-results">
                  <button v-for="e in nomResults" :key="e.id" type="button" class="fd-nom-opt" @click="addNominee(e)">
                    <span class="fd-nom-av">{{ initials(empName(e)) }}</span>{{ empName(e) }}<UserPlus :size="13" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <footer class="fd-foot">
            <button class="perf-btn fd-del" type="button" :disabled="busy" @click="onDelete"><Trash2 :size="14" /></button>
            <span class="fd-grow" />
            <button v-if="r.status === 'OPEN'" class="perf-btn perf-btn-primary" type="button" :disabled="busy" @click="onClose"><CheckCircle2 :size="14" /> Close request</button>
            <button v-else-if="r.status === 'CLOSED'" class="perf-btn" type="button" :disabled="busy" @click="onReopen"><RotateCcw :size="14" /> Reopen</button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Loader2, Orbit, Users, Eye, EyeOff, Search, UserPlus, Trash2, CheckCircle2, RotateCcw, CalendarRange, Clock } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import FeedbackRadar from './FeedbackRadar.vue'
import {
  fetchFeedbackRequest, nominateFeedback, closeFeedback, reopenFeedback, removeNominee, deleteFeedbackRequest,
  feedbackRelMeta, feedbackReqMeta, fetchEmployeesForReview,
} from '@/composables/usePerformance'

const props = defineProps({ open: Boolean, requestId: { type: String, default: null } })
const emit = defineEmits(['close', 'mutated', 'deleted'])
const toast = useToast()

const r = reactive({})
const loading = ref(false)
const busy = ref(false)
const expanded = ref(null)
const revealed = ref(false)
const nomSearch = ref('')
const nomResults = ref([])

const rollup = computed(() => r.rollup || {})
const reqMeta = computed(() => feedbackReqMeta(r.status))
const rateDeg = computed(() => Math.round((rollup.value.response_rate || 0) / 100 * 360))
const relMeta = (k) => feedbackRelMeta(k)
const respLabel = (s) => ({ PENDING: 'Pending', SUBMITTED: 'Submitted', DECLINED: 'Declined' }[s] || s)

async function load(reveal = false) {
  if (!props.requestId) return
  loading.value = true
  try { Object.assign(r, await fetchFeedbackRequest(props.requestId, reveal ? { reveal: true } : {})) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load') }
  finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) { revealed.value = false; expanded.value = null; nomSearch.value = ''; nomResults.value = []; Object.keys(r).forEach(k => delete r[k]); load() } })

const toggleExpand = (resp) => { expanded.value = expanded.value === resp.id ? null : resp.id }
async function toggleReveal() { revealed.value = !revealed.value; await load(revealed.value) }

const empName = (e) => e.full_name || e.name || e.employee_id || '—'
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
let nt = null
watch(nomSearch, () => {
  clearTimeout(nt)
  nt = setTimeout(async () => {
    if (!nomSearch.value.trim()) { nomResults.value = []; return }
    try { const d = await fetchEmployeesForReview({ search: nomSearch.value }); nomResults.value = (d.items || []).slice(0, 6) }
    catch { nomResults.value = [] }
  }, 300)
})

async function addNominee(e) {
  busy.value = true
  try {
    const updated = await nominateFeedback(r.id, { nominees: [{ reviewer_user_id: e.user_id || undefined, reviewer_employee_id: e.id, reviewer_name: empName(e), relationship_type: 'PEER' }] })
    Object.assign(r, updated); emit('mutated', updated); nomSearch.value = ''; nomResults.value = []; toast.success('Rater nominated')
  } catch (er) { toast.error(er?.response?.data?.detail || 'Failed to nominate') }
  finally { busy.value = false }
}
async function onRemove(resp) {
  try { await removeNominee(resp.id); await load(revealed.value); emit('mutated', r); toast.success('Rater removed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to remove') }
}
async function onClose() {
  busy.value = true
  try { const u = await closeFeedback(r.id); Object.assign(r, u); emit('mutated', u); toast.success('Request closed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed') } finally { busy.value = false }
}
async function onReopen() {
  busy.value = true
  try { const u = await reopenFeedback(r.id); Object.assign(r, u); emit('mutated', u); toast.success('Request reopened') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed') } finally { busy.value = false }
}
async function onDelete() {
  if (!window.confirm('Delete this 360° request and all its responses?')) return
  busy.value = true
  try { await deleteFeedbackRequest(r.id); emit('deleted', r.id); toast.success('Request deleted'); emit('close') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { busy.value = false }
}

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return d } }
</script>

<style scoped>
.fd-ov { position: fixed; inset: 0; z-index: 1300; display: flex; justify-content: flex-end; background: rgba(5,5,6,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.fd { position: relative; width: min(540px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--perf-surface-elevated); border-left: 1px solid var(--perf-border-strong); box-shadow: -30px 0 80px -40px rgba(0,0,0,0.9); }
.fd-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--perf-grad-hero); }
.fd-head { display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.fd-head-id { flex: 1; min-width: 0; }
.fd-head-id b { font-size: 16px; font-weight: 850; color: var(--perf-text); display: block; }
.fd-head-id span { font-size: 11.5px; color: var(--perf-text-muted); }
.fd-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.fd-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.fd-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.fd-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 50px; color: var(--perf-text-muted); }
.fd-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }

.fd-rollup { display: flex; align-items: center; gap: 15px; padding: 14px; border-radius: 14px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.fd-rate-ring { position: relative; width: 66px; height: 66px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); }
.fd-rate-ring span { position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-panel); display: flex; align-items: center; justify-content: center; }
.fd-rate-ring b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.fd-rate-ring i { font-size: 9px; font-style: normal; color: var(--perf-text-muted); margin-top: 3px; }
.fd-rate-facts { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.fd-rate-row { display: flex; align-items: baseline; gap: 6px; }
.fd-rate-row b { font-size: 17px; font-weight: 850; color: var(--perf-text); }
.fd-rate-row span { font-size: 11px; color: var(--perf-text-muted); }
.fd-rate-meta { display: flex; gap: 12px; margin-top: 3px; }
.fd-rate-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--perf-text-dim); }

.fd-panel { padding: 13px 14px; border-radius: 14px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.fd-panel-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 11px; }
.fd-panel-head :deep(svg) { color: var(--perf-gold); }
.fd-grow { flex: 1; }
.fd-reveal { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 10.5px; font-weight: 700; color: var(--perf-gold); background: none; border: none; cursor: pointer; text-transform: none; letter-spacing: 0; }
.fd-empty { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }

.fd-raters { display: flex; flex-direction: column; gap: 6px; }
.fd-rater { border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); overflow: hidden; }
.fd-rater-row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: none; }
.fd-rater-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.fd-rater-id { flex: 1; min-width: 0; }
.fd-rater-id b { font-size: 12px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.fd-rater-id span { font-size: 10px; color: var(--perf-text-dim); }
.fd-rater-score { font-size: 13px; font-weight: 850; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
.fd-rater-st { font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
.fd-rater-st.pending { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 14%, transparent); }
.fd-rater-st.submitted { color: var(--perf-ok); background: var(--perf-ok-soft); }
.fd-rater-st.declined { color: var(--perf-text-muted); background: var(--perf-unset-soft); }
.fd-rater-rm { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); }
.fd-rater-rm:hover { color: var(--perf-conflict); }
.fd-rater-detail { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.fd-rt-grid { display: flex; flex-direction: column; gap: 5px; }
.fd-rt { display: grid; grid-template-columns: 1fr 70px 22px; align-items: center; gap: 8px; }
.fd-rt-lab { font-size: 11px; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fd-rt-track { height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.fd-rt-track i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); }
.fd-rt b { font-size: 11px; font-weight: 800; color: var(--perf-text); text-align: right; }
.fd-rt-note { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-secondary); }
.fd-rt-note b { color: var(--perf-text); }

.fd-nominate { margin-top: 11px; padding-top: 11px; border-top: 1px solid var(--perf-border); }
.fd-search { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.fd-search :deep(svg) { color: var(--perf-text-muted); }
.fd-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 12.5px; color: var(--perf-text); }
.fd-search-in:focus { outline: none; }
.fd-nom-results { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.fd-nom-opt { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; color: var(--perf-text-secondary); background: var(--perf-panel); border: 1px solid var(--perf-border); transition: all 0.16s; }
.fd-nom-opt:hover { color: var(--perf-text); border-color: var(--perf-border-warm); }
.fd-nom-opt :deep(svg) { margin-left: auto; color: var(--perf-gold); }
.fd-nom-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }

.fd-foot { display: flex; align-items: center; gap: 9px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.fd-del { color: var(--perf-text-muted); padding: 9px 11px; }
.fd-del:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: var(--perf-conflict-soft); }
@media (prefers-reduced-motion: reduce) { .fd-x:hover { transform: none; } .fd-rate-ring { transition: none; } }
</style>
