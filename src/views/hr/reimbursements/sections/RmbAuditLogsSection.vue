<template>
  <div class="rmb-audit" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="au-atmos" aria-hidden="true">
      <span class="au-orb o1" /><span class="au-orb o2" />
      <span class="au-grid" /><span class="au-scan" />
      <span class="rmb-spotlight" />
      <span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="au-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="au-head-l">
        <span class="au-eyebrow"><Radio :size="12" /> Immutable · event recorder</span>
        <h2>Audit <span class="ink">Trail</span></h2>
        <span class="au-meta rmb-mono">
          <span class="au-live" />
          <RmbCountUp :value="allRows.length" /> event{{ allRows.length === 1 ? '' : 's' }} recorded
          <span v-if="lastTime" class="au-sep">·</span><span v-if="lastTime"> last {{ lastTime }}</span>
        </span>
      </div>
      <div class="au-head-r">
        <span class="au-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="au-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh recorder"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ── recorder console ── -->
    <Motion as="section" class="au-console"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <span class="auc-sheen" aria-hidden="true" />
      <div class="auc-grid">
        <div class="auc-lead">
          <span class="auc-lbl">Events recorded</span>
          <div class="auc-big rmb-mono"><RmbCountUp :value="filtered.length" /></div>
          <span class="auc-sub rmb-mono">across {{ claimsTouched }} claim{{ claimsTouched === 1 ? '' : 's' }} · {{ actorCount }} actor{{ actorCount === 1 ? '' : 's' }}</span>
        </div>
        <div class="auc-kpis">
          <div class="auc-kpi"><span class="kpi-lbl">Top action</span><b :style="{ color: topActionColor }">{{ topActionLabel }}</b></div>
          <div class="auc-kpi"><span class="kpi-lbl">Approvals</span><b><RmbCountUp :value="approveCount" /></b></div>
          <div class="auc-kpi"><span class="kpi-lbl">Reversals</span><b><RmbCountUp :value="reverseCount" /></b></div>
        </div>
      </div>

      <!-- seismograph activity strip -->
      <div class="seismo" aria-hidden="true">
        <span class="seismo-beam" />
        <div class="seismo-bars">
          <Motion v-for="(b, i) in seismoBars" :key="i" as="span" class="seismo-bar"
            :style="{ background: b.color, height: (b.h * 100) + '%' }"
            :initial="{ scaleY: 0, opacity: 0 }" :animate="{ scaleY: 1, opacity: 1 }"
            :transition="{ delay: 0.2 + i * 0.012, duration: 0.4, ease: [0.16, 1, 0.3, 1] }" />
        </div>
        <span class="seismo-base" />
      </div>
    </Motion>

    <!-- ── controls: search + action chips ── -->
    <div class="au-controls">
      <div class="au-search" :class="{ focused: searchFocus, filled: q }">
        <Search :size="15" class="au-search-ic" />
        <input v-model="q" placeholder="Filter by claim #, actor or note…"
               @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="au-clear" @click="q = ''" aria-label="Clear"><X :size="13" /></button>
      </div>
      <div class="au-chips">
        <button class="au-chip" :class="{ on: action === null }" @click="setAction(null)">
          <span class="au-chip-dot all" /> All <span class="au-chip-n rmb-mono">{{ allRows.length }}</span>
        </button>
        <button v-for="a in actionFacets" :key="a.key" class="au-chip" :class="{ on: action === a.key }"
                :style="{ '--chip': a.color }" @click="setAction(a.key)">
          <span class="au-chip-dot" /> {{ a.label }} <span class="au-chip-n rmb-mono">{{ a.count }}</span>
        </button>
      </div>
    </div>

    <!-- ── timeline log ── -->
    <div v-if="loading" class="au-log">
      <div v-for="i in 6" :key="i" class="rmb-skel line-skel"></div>
    </div>
    <div v-else-if="pageRows.length" :key="feedSeq" class="au-log rmb-ribbon">
      <Motion v-for="(r, i) in pageRows" :key="r.id ?? i" as="article" class="au-entry"
        :style="{ '--ev': actionMeta(r.action).color }"
        :initial="{ opacity: 0, x: -14, filter: 'blur(5px)' }"
        :animate="{ opacity: 1, x: 0, filter: 'blur(0px)' }"
        :transition="{ delay: Math.min(i, 10) * 0.045, duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="ev-rail" aria-hidden="true" />
        <span class="ev-node"><component :is="actionMeta(r.action).icon" :size="13" :stroke-width="2.4" /></span>
        <div class="ev-body">
          <div class="ev-top">
            <b class="ev-action">{{ actionMeta(r.action).label }}</b>
            <span v-if="r.claim_number" class="ev-ref rmb-mono">{{ r.claim_number }}</span>
            <span v-if="r.from_status || r.to_status" class="ev-trans">
              <span class="trans-pill from">{{ stLabel(r.from_status) }}</span>
              <ArrowRight :size="11" class="trans-arr" />
              <span class="trans-pill to">{{ stLabel(r.to_status) }}</span>
            </span>
            <span class="ev-when rmb-mono">{{ fmt(r.created_at) }}</span>
          </div>
          <div v-if="r.actor_name || r.note" class="ev-meta">
            <span v-if="r.actor_name" class="ev-actor"><span class="ev-avatar">{{ initials(r.actor_name) }}</span>{{ r.actor_name }}</span>
            <span v-if="r.note" class="ev-note">"{{ r.note }}"</span>
          </div>
        </div>
      </Motion>
    </div>
    <RmbEmptyState v-else :icon="Radio" title="No matching events"
                   subtitle="Adjust the filters, or wait for new claim, category &amp; policy mutations to record." />

    <!-- ── ultra-modern animated pager (10 / page) ── -->
    <div v-if="totalPages > 1" class="au-pager">
      <div class="pager-track"><span class="pager-fill" :style="{ width: ((page / totalPages) * 100) + '%' }"><i /></span></div>
      <div class="pager-row">
        <span class="pager-count rmb-mono">Showing <b>{{ rangeStart }}–{{ rangeEnd }}</b> of <RmbCountUp :value="filtered.length" /></span>
        <div class="pager-nav">
          <Motion as="button" class="pager-btn" :disabled="page <= 1" :whileHover="{ x: -2 }" :whileTap="{ scale: 0.9 }" @click="go(page - 1)" aria-label="Previous">
            <ChevronLeft :size="16" />
          </Motion>
          <div class="pager-pages">
            <template v-for="(p, i) in pageList" :key="i">
              <span v-if="p === '…'" class="pager-gap">…</span>
              <Motion v-else as="button" class="pager-pill" :class="{ on: p === page }"
                :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="go(p)">
                {{ p }}
                <span v-if="p === page" class="pager-pill-ring" aria-hidden="true" />
              </Motion>
            </template>
          </div>
          <Motion as="button" class="pager-btn" :disabled="page >= totalPages" :whileHover="{ x: 2 }" :whileTap="{ scale: 0.9 }" @click="go(page + 1)" aria-label="Next">
            <ChevronRight :size="16" />
          </Motion>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Radio, RefreshCw, Search, X, ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight,
  FilePlus2, Send, CheckCircle2, XCircle, Undo2, HelpCircle, BadgeCheck, Wallet,
  RotateCcw, Pencil, Trash2, Ban, Activity,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchAuditLogs, statusMeta, errText } from '@/composables/useReimbursements'
import { usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'

const PER_PAGE = 10
const toast = useToast()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const allRows = ref([])
const loading = ref(false)
const refreshing = ref(false)
const q = ref('')
const action = ref(null)
const searchFocus = ref(false)
const page = ref(1)
const feedSeq = ref(0)

const pretty = (a) => (a || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmt = (s) => { try { return new Date(s).toLocaleString() } catch { return s } }
const stLabel = (s) => s ? statusMeta(s).label : '—'
const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ── action taxonomy (warm/green/teal/red — no blue) ──
const ACTION_META = {
  CREATE:    { label: 'Created', color: '#fbbf24', icon: FilePlus2 },
  SUBMIT:    { label: 'Submitted', color: '#fb923c', icon: Send },
  APPROVE:   { label: 'Approved', color: 'var(--rmb-st-approved)', icon: CheckCircle2 },
  REJECT:    { label: 'Rejected', color: 'var(--rmb-st-rejected)', icon: XCircle },
  RETURN:    { label: 'Returned', color: 'var(--rmb-st-returned)', icon: Undo2 },
  REQUEST_CLARIFICATION: { label: 'Clarification', color: 'var(--rmb-st-returned)', icon: HelpCircle },
  SETTLE:    { label: 'Settled', color: 'var(--rmb-st-settled)', icon: BadgeCheck },
  MARK_PAID: { label: 'Paid', color: 'var(--rmb-st-paid)', icon: Wallet },
  REVERSE:   { label: 'Reversed', color: '#ea580c', icon: RotateCcw },
  UPDATE:    { label: 'Updated', color: '#d97706', icon: Pencil },
  EDIT:      { label: 'Edited', color: '#d97706', icon: Pencil },
  DELETE:    { label: 'Deleted', color: 'var(--rmb-st-rejected)', icon: Trash2 },
  CANCEL:    { label: 'Cancelled', color: 'var(--rmb-st-cancelled)', icon: Ban },
  ESCALATE:  { label: 'Escalated', color: '#fb923c', icon: ArrowUpRight },
}
const actionMeta = (a) => ACTION_META[a] || { label: pretty(a), color: 'var(--rmb-text-muted)', icon: Activity }

// ── derived ──
const lastTime = computed(() => allRows.value.length ? fmt(allRows.value[0].created_at) : '')
const filtered = computed(() => {
  let r = allRows.value
  if (action.value) r = r.filter(x => x.action === action.value)
  if (q.value.trim()) {
    const s = q.value.trim().toLowerCase()
    r = r.filter(x => [x.claim_number, x.actor_name, x.note, x.action].some(v => (v || '').toLowerCase().includes(s)))
  }
  return r
})
const claimsTouched = computed(() => new Set(filtered.value.map(r => r.claim_number).filter(Boolean)).size)
const actorCount = computed(() => new Set(filtered.value.map(r => r.actor_name).filter(Boolean)).size)
const approveCount = computed(() => filtered.value.filter(r => r.action === 'APPROVE').length)
const reverseCount = computed(() => filtered.value.filter(r => r.action === 'REVERSE').length)

const actionFacets = computed(() => {
  const map = new Map()
  for (const r of allRows.value) {
    const cur = map.get(r.action) || { key: r.action, label: actionMeta(r.action).label, color: actionMeta(r.action).color, count: 0 }
    cur.count++; map.set(r.action, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})
const topAction = computed(() => actionFacets.value[0] || null)
const topActionLabel = computed(() => topAction.value ? topAction.value.label : '—')
const topActionColor = computed(() => topAction.value ? topAction.value.color : 'var(--rmb-text)')

// seismograph — recent events as a colored recorder readout
const seismoBars = computed(() => {
  const recent = filtered.value.slice(0, 44)
  const wave = seededWave(7, recent.length || 1)
  return recent.map((r, i) => ({ color: actionMeta(r.action).color, h: 0.22 + wave[i] * 0.78 })).reverse()
})

// ── pagination ──
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
const rangeStart = computed(() => filtered.value.length ? (page.value - 1) * PER_PAGE + 1 : 0)
const rangeEnd = computed(() => Math.min(page.value * PER_PAGE, filtered.value.length))
const pageList = computed(() => {
  const t = totalPages.value, c = page.value, out = []
  if (t <= 7) { for (let i = 1; i <= t; i++) out.push(i); return out }
  out.push(1)
  if (c > 3) out.push('…')
  for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) out.push(i)
  if (c < t - 2) out.push('…')
  out.push(t)
  return out
})
const go = (p) => { if (p < 1 || p > totalPages.value || p === page.value) return; page.value = p; feedSeq.value++ }
const setAction = (k) => { action.value = k; page.value = 1; feedSeq.value++ }

// searching jumps back to the first page; a shrinking set also clamps the page
watch(q, () => { page.value = 1; feedSeq.value++ })
watch(() => filtered.value.length, () => { if (page.value > totalPages.value) page.value = 1 })

async function load() {
  loading.value = true
  // NOTE: the /audit endpoint caps limit at 200 (Query(..., le=200)); never exceed it or it 422s.
  try { allRows.value = (await fetchAuditLogs({ limit: 200 })).items || [] }
  catch (e) { allRows.value = []; toast.error(errText(e, 'Failed to load audit trail')) }
  finally { loading.value = false }
}
const refresh = () => { refreshing.value = true; load().finally(() => setTimeout(() => { refreshing.value = false }, 700)) }
onMounted(load)
</script>

<style scoped>
.rmb-audit { position: relative; display: flex; flex-direction: column; gap: 16px;
  --aud: var(--rmb-ember); --aud-soft: color-mix(in srgb, var(--rmb-ember) 16%, transparent); }
.rmb-audit > :not(.au-atmos) { position: relative; z-index: 1; }

/* ── backdrop (ember recorder skin) ── */
.au-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.au-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.au-orb.o1 { width: 400px; height: 400px; top: -130px; left: -50px; opacity: 0.17;
  background: radial-gradient(circle, rgba(251,146,60,0.9), transparent 68%); animation: au-drift 25s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -30px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.au-orb.o2 { width: 340px; height: 340px; bottom: -120px; right: -30px; opacity: 0.12;
  background: radial-gradient(circle, rgba(45,212,191,0.65), transparent 70%); animation: au-drift 30s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.au-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.au-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(251,146,60,0.045), transparent); }
.rmb-audit .rmb-spotlight { background: radial-gradient(420px 320px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--aud) 16%, transparent), transparent 60%); }

/* ── header ── */
.au-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.au-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--aud); }
.au-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.au-head h2 .ink { background: linear-gradient(120deg, var(--rmb-ember), var(--rmb-amber)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.au-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.au-live { width: 6px; height: 6px; border-radius: 50%; background: var(--aud); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.au-sep { opacity: 0.5; }
.au-head-r { display: flex; align-items: center; gap: 12px; }
.au-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.au-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom; background: linear-gradient(180deg, var(--rmb-ember), var(--rmb-amber)); animation: au-eq 1.1s ease-in-out infinite; }
.au-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.au-refresh:hover { color: var(--aud); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.au-refresh.spin :deep(svg) { animation: au-spin 0.8s var(--rmb-ease); }

/* ── recorder console ── */
.au-console { position: relative; overflow: hidden; padding: 18px 20px 18px; border-radius: 18px; background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.auc-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; border-radius: inherit; background: radial-gradient(120% 120% at 8% -20%, color-mix(in srgb, var(--aud) 14%, transparent), transparent 60%); }
.auc-grid { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.auc-lead { display: flex; flex-direction: column; gap: 3px; }
.auc-lbl { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); }
.auc-big { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: var(--aud); }
.auc-sub { font-size: 11px; color: var(--rmb-text-muted); }
.auc-kpis { display: flex; gap: 22px; }
.auc-kpi { display: flex; flex-direction: column; gap: 2px; }
.kpi-lbl { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.auc-kpi b { font-size: 16px; font-weight: 800; color: var(--rmb-text); }

/* seismograph */
.seismo { position: relative; margin-top: 18px; height: 56px; }
.seismo-bars { position: absolute; inset: 0 0 6px 0; display: flex; align-items: flex-end; gap: 3px; }
.seismo-bar { flex: 1; min-width: 2px; border-radius: 2px 2px 0 0; transform-origin: bottom; box-shadow: 0 0 8px -3px currentColor; }
.seismo-base { position: absolute; left: 0; right: 0; bottom: 6px; height: 1px; background: var(--rmb-border-soft); }
.seismo-beam { position: absolute; top: 0; bottom: 6px; width: 70px; pointer-events: none; z-index: 1;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--aud) 30%, transparent), transparent);
  animation: seismo-sweep 4.5s ease-in-out infinite; }

/* ── controls ── */
.au-controls { display: flex; flex-direction: column; gap: 12px; }
.au-search { display: flex; align-items: center; gap: 8px; position: relative; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); border-radius: 12px; padding: 0 12px; color: var(--rmb-text-muted); transition: border-color 0.25s, box-shadow 0.25s, background 0.25s; }
.au-search.focused { border-color: color-mix(in srgb, var(--aud) 55%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--aud) 12%, transparent); background: var(--rmb-surface-elevated); }
.au-search-ic { flex: 0 0 auto; transition: color 0.25s, transform 0.25s; }
.au-search.focused .au-search-ic { color: var(--aud); transform: scale(1.08); }
.au-search input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; color: var(--rmb-text); font-size: 13px; }
.au-clear { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer; background: var(--rmb-surface-elevated); border: none; color: var(--rmb-text-muted); transition: 0.2s; }
.au-clear:hover { color: var(--rmb-st-rejected); }
.au-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.au-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 11.5px; font-weight: 600; color: var(--rmb-text-secondary); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.25s var(--rmb-spring); }
.au-chip:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.au-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--chip, var(--aud)); box-shadow: 0 0 7px -1px var(--chip, var(--aud)); }
.au-chip-dot.all { background: linear-gradient(135deg, var(--rmb-ember), var(--rmb-st-settled)); box-shadow: none; }
.au-chip-n { font-size: 10px; padding: 1px 7px; border-radius: 999px; background: var(--rmb-surface-elevated); color: var(--rmb-text-muted); }
.au-chip.on { color: var(--chip, var(--aud)); background: color-mix(in srgb, var(--chip, var(--aud)) 14%, transparent); border-color: color-mix(in srgb, var(--chip, var(--aud)) 50%, transparent); }
.au-chip.on .au-chip-n { background: color-mix(in srgb, var(--chip, var(--aud)) 18%, transparent); color: var(--chip, var(--aud)); }

/* ── timeline log ── */
.au-log { display: flex; flex-direction: column; border-radius: 16px; padding: 6px 16px; border: 1px solid var(--rmb-border-soft); min-height: 120px; }
.line-skel { height: 52px; margin: 6px 0; }
.au-entry { position: relative; display: flex; gap: 13px; padding: 13px 0 13px 4px; }
.au-entry:not(:last-child)::after { content: ""; position: absolute; left: 4px; right: 0; bottom: 0; height: 1px;
  background: repeating-linear-gradient(90deg, var(--rmb-perf-color) 0 5px, transparent 5px 10px); }
/* flowing rail segment behind each node */
.ev-rail { position: absolute; left: 17px; top: 28px; bottom: -13px; width: 2px; border-radius: 2px; overflow: hidden;
  background: var(--rmb-perf-color); }
.au-entry:last-child .ev-rail { display: none; }
.ev-rail::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ev) 80%, transparent), transparent); background-size: 100% 220%; animation: rmb-flow-down 2.2s linear infinite; }
.ev-node { position: relative; z-index: 1; flex: 0 0 auto; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  color: var(--ev); background: color-mix(in srgb, var(--ev) 15%, transparent); border: 1px solid color-mix(in srgb, var(--ev) 35%, transparent); }
.ev-body { flex: 1; min-width: 0; padding-top: 2px; }
.ev-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ev-action { font-size: 13px; font-weight: 700; color: var(--rmb-text); }
.ev-ref { font-size: 11px; padding: 1px 7px; border-radius: 6px; color: var(--aud); background: var(--aud-soft); }
.ev-trans { display: inline-flex; align-items: center; gap: 5px; }
.trans-pill { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 6px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); }
.trans-pill.to { color: var(--ev); border-color: color-mix(in srgb, var(--ev) 35%, transparent); }
.trans-arr { color: var(--rmb-text-muted); flex: 0 0 auto; }
.ev-when { font-size: 10.5px; color: var(--rmb-text-muted); margin-left: auto; }
.ev-meta { display: flex; align-items: center; gap: 12px; margin-top: 5px; flex-wrap: wrap; }
.ev-actor { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--rmb-text-secondary); font-weight: 600; }
.ev-avatar { width: 18px; height: 18px; border-radius: 6px; display: grid; place-items: center; font-size: 8.5px; font-weight: 800; color: #2a1a06; background: var(--hr-gradient-hero); }
.ev-note { font-size: 11.5px; color: var(--rmb-text-muted); font-style: italic; }

/* ── animated pager ── */
.au-pager { display: flex; flex-direction: column; gap: 12px; margin-top: 6px; }
.pager-track { height: 3px; border-radius: 999px; background: var(--rmb-surface); overflow: hidden; }
.pager-fill { display: block; height: 100%; border-radius: inherit; position: relative; min-width: 6px;
  background: linear-gradient(90deg, var(--rmb-ember), var(--rmb-amber)); box-shadow: 0 0 10px -2px var(--aud); transition: width 0.6s var(--rmb-spring); }
.pager-fill i { position: absolute; inset: 0; opacity: 0.5; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); background-size: 220% 100%; animation: rmb-amount-shimmer 2.2s linear infinite; }
.pager-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.pager-count { font-size: 11.5px; color: var(--rmb-text-muted); }
.pager-count b { color: var(--rmb-text); }
.pager-nav { display: flex; align-items: center; gap: 6px; }
.pager-btn { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: color 0.2s, border-color 0.2s; }
.pager-btn:hover:not(:disabled) { color: var(--aud); border-color: color-mix(in srgb, var(--aud) 45%, transparent); }
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-pages { display: flex; align-items: center; gap: 5px; }
.pager-pill { position: relative; min-width: 34px; height: 34px; padding: 0 9px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 700; font-family: var(--rmb-mono);
  display: grid; place-items: center; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: color 0.25s, border-color 0.25s; }
.pager-pill:hover { color: var(--rmb-text); border-color: var(--rmb-border-strong); }
.pager-pill.on { color: #2a1a06; border-color: transparent; background: linear-gradient(135deg, var(--rmb-ember), var(--rmb-amber)); box-shadow: 0 10px 22px -10px color-mix(in srgb, var(--aud) 70%, transparent); }
.pager-pill-ring { position: absolute; inset: -3px; border-radius: 12px; border: 1.5px solid var(--aud); opacity: 0.6; animation: rmb-pulse-dot 1.8s ease-out infinite; }
.pager-gap { width: 20px; text-align: center; color: var(--rmb-text-muted); font-size: 13px; }

/* ── keyframes ── */
@keyframes au-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes au-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes au-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes seismo-sweep { 0% { left: -70px; } 50% { left: calc(100% + 10px); } 100% { left: -70px; } }

/* ── light theme ── */
:root[data-theme="light"] .au-orb.o1 { opacity: 0.12; }
:root[data-theme="light"] .au-orb.o2 { opacity: 0.08; }
[data-theme="light"] .pager-pill.on { color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .au-orb, .au-eq i, .au-live, .seismo-beam, .ev-rail::after, .pager-fill i, .pager-pill-ring { animation: none !important; }
  .au-orb { transform: none !important; }
}
@media (max-width: 620px) {
  .au-head h2 { font-size: 22px; }
  .auc-grid { align-items: flex-start; }
  .auc-kpis { gap: 16px; }
  .ev-when { margin-left: 0; width: 100%; }
}
</style>
