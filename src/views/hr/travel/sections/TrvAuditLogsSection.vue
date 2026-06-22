<template>
  <div class="aud">
    <!-- ══ Console hero — "Flight Recorder" ══ -->
    <Motion as="section" class="aud-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <CassetteTape class="hero-motif" :size="220" aria-hidden="true" />

      <div class="hero-top">
        <div class="hero-lead">
          <span class="hero-eyebrow"><HardDrive :size="13" /> Travel · Forensics</span>
          <h1 class="hero-title">Flight <span class="grad">Recorder</span></h1>
          <p class="hero-sub">Every travel action committed to an immutable black-box tape — who did what, when, and what changed.</p>
        </div>
        <div class="hero-cta">
          <TrvSelect v-model="action" :options="actionOpts" placeholder="All actions" class="act-sel" @change="reload" />
          <Motion as="button" class="iconbtn" :class="{ spin: loading }" title="Refresh" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="reload"><RefreshCw :size="15" /></Motion>
        </div>
      </div>

      <!-- recorder deck (signature instrument) -->
      <div class="deck">
        <div class="reel left"><span class="reel-hub" /></div>
        <div class="tape">
          <span class="rec"><span class="rec-dot" /> REC</span>
          <div class="tape-run" :style="{ animationDuration: reelDur }">
            <span v-for="(b, i) in tapeBlips" :key="'a' + i" class="blip" :style="{ '--c': b.hex, height: b.h + '%' }" />
            <span v-for="(b, i) in tapeBlips" :key="'b' + i" class="blip" :style="{ '--c': b.hex, height: b.h + '%' }" />
            <span v-if="!tapeBlips.length" class="tape-idle">— standing by —</span>
          </div>
          <span class="readhead" aria-hidden="true" />
        </div>
        <div class="reel right"><span class="reel-hub" /></div>

        <div class="deck-readout">
          <div class="ro-total"><b><TrvCountUp :value="total" /></b><span>recorded events</span></div>
          <div class="ro-spectrum">
            <span v-for="f in familySpectrum" :key="f.f" class="ro-seg" :style="{ width: f.pct + '%', '--c': f.hex }" :title="`${f.label}: ${f.n}`" />
            <span v-if="!familySpectrum.length" class="ro-seg empty" />
          </div>
          <div class="ro-legend">
            <span v-for="f in familyLegend" :key="f.f" class="ro-leg"><i :style="{ background: f.hex }" />{{ f.label }} <b>{{ f.n }}</b></span>
          </div>
        </div>
      </div>

      <!-- entity lenses -->
      <div class="hero-lenses">
        <button class="lens" :class="{ on: !entity }" @click="setEntity('')"><Layers :size="13" /> <span>All streams</span></button>
        <button v-for="e in ENTITIES" :key="e.key" class="lens" :class="{ on: entity === e.key }" :style="{ '--c': e.hex }" @click="setEntity(e.key)">
          <component :is="e.icon" :size="13" /> <span>{{ e.label }}</span>
        </button>
      </div>
    </Motion>

    <!-- ══ Frames ══ -->
    <div v-if="loading" class="list"><div v-for="n in 6" :key="n" class="skel" /></div>

    <div v-else-if="rows.length" class="list">
      <div v-for="(r, i) in rows" :key="r.id" class="frame" :style="{ '--i': i }">
        <article class="frame-inner" :class="{ open: expandedId === r.id, link: isLinked(r) }" :style="{ '--c': fam(r).hex }">
          <span class="frame-spine" aria-hidden="true" />
          <span class="frame-sweep" aria-hidden="true" />
          <button class="frame-medallion" :title="meta(r).label" @click="openRow(r)"><component :is="meta(r).icon" :size="16" /></button>

          <div class="frame-main" @click="openRow(r)">
            <div class="frame-top">
              <span class="frame-action">{{ meta(r).label }}</span>
              <span class="frame-entity trv-mono"><component :is="entityIcon(r.entity_type)" :size="10" /> {{ r.entity_type }}</span>
              <span v-if="r.travel_reference_number" class="frame-ref trv-mono">{{ r.travel_reference_number }}</span>
              <span class="frame-spacer" />
              <span class="frame-actor">{{ r.actor_name || 'System' }}</span>
              <span class="frame-time trv-mono">{{ when(r.created_at) }}</span>
            </div>
            <div v-if="r.from_status || r.to_status || r.note" class="frame-mid">
              <span v-if="r.from_status || r.to_status" class="frame-morph">
                <em class="trv-mono">{{ r.from_status || '—' }}</em><ArrowRight :size="11" class="morph-arrow" /><b class="trv-mono">{{ r.to_status || '—' }}</b>
              </span>
              <span v-if="r.note" class="frame-note">{{ r.note }}</span>
            </div>
          </div>

          <button class="frame-tail" :class="{ on: expandedId === r.id }" title="Details" @click="toggle(r.id)"><ChevronDown :size="15" /></button>
        </article>

        <Presence>
          <Motion v-if="expandedId === r.id" as="div" class="frame-detail"
            :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
            :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
            <div class="fd-grid">
              <div class="fd-cell"><span><Clock :size="11" /> Logged</span><b class="trv-mono">{{ full(r.created_at) }}</b></div>
              <div class="fd-cell"><span><HardDrive :size="11" /> Record ID</span><b class="trv-mono">{{ shortId(r.id) }}</b></div>
              <div class="fd-cell"><span><component :is="entityIcon(r.entity_type)" :size="11" /> Entity</span><b class="trv-mono">{{ r.entity_type }} · {{ shortId(r.entity_id) }}</b></div>
              <div class="fd-cell"><span><Layers :size="11" /> Family</span><b :style="{ color: fam(r).hex }">{{ fam(r).label }}</b></div>
            </div>
            <Motion v-if="isLinked(r)" as="button" class="fd-open" :whileHover="{ x: 3 }" :whileTap="{ scale: 0.97 }" @click="openRow(r)">
              {{ r.travel_request_id ? 'Open tour' : 'Open ' + targetLabel(r) }} <ArrowUpRight :size="13" />
            </Motion>
          </Motion>
        </Presence>
      </div>
    </div>

    <TrvEmptyState v-else :icon="HardDrive" title="No activity recorded"
      :subtitle="entity || action ? 'No events match this filter — clear it to see the full tape.' : 'Travel actions will appear here as the module is used.'"
      :cta="entity || action ? 'Clear filters' : ''" :cta-icon="Layers" @cta="clearFilters" />

    <TrvPager :page="page" :page-count="pageCount" :total="total" :limit="limit" @update:page="go" />

    <!-- full detail drawer -->
    <TravelDetailDrawer :open="showDetail" :request-id="detailId" @close="showDetail = false" @go="$emit('go', $event)" @changed="reload" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  History, HardDrive, CassetteTape, RefreshCw, ChevronDown, ArrowRight, ArrowUpRight, Clock, Layers,
  Plane, Ticket, Wallet, Calculator, Scale, FileBadge, Tags, Coins,
  Plus, Pencil, CircleCheck, CircleX, Undo2, Ban, PlaneTakeoff, BadgeCheck, RotateCcw, Trash2, Banknote, Send,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import TrvSelect from '../components/TrvSelect.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvPager from '../components/TrvPager.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import TravelDetailDrawer from '../components/TravelDetailDrawer.vue'
import { errText, fetchAudit } from '@/composables/useTravel'

const emit = defineEmits(['go'])
const toast = useToast()

// ── action / family metadata ──
const FAM = {
  genesis: { label: 'Created', hex: '#fbbf24' },
  success: { label: 'Cleared', hex: '#34d399' },
  motion: { label: 'Changed', hex: '#fb923c' },
  halt: { label: 'Halted', hex: '#ef4444' },
}
const ACTION_META = {
  CREATE: ['Created', Plus, 'genesis'], SUBMIT: ['Submitted', Send, 'genesis'], UPDATE: ['Updated', Pencil, 'motion'],
  APPROVE: ['Approved', CircleCheck, 'success'], REJECT: ['Rejected', CircleX, 'halt'], RETURN: ['Returned', Undo2, 'halt'],
  ESCALATE: ['Escalated', ArrowUpRight, 'motion'], CANCEL: ['Cancelled', Ban, 'halt'], EXECUTE: ['Took off', PlaneTakeoff, 'motion'],
  COMPLETE: ['Completed', BadgeCheck, 'success'], BOOK: ['Booked', Ticket, 'genesis'], BOOKING_UPDATE: ['Booking changed', Ticket, 'motion'],
  BOOKING_CANCEL: ['Booking cancelled', Ticket, 'halt'], ADVANCE_REQUEST: ['Advance requested', Wallet, 'genesis'],
  ADVANCE_APPROVE: ['Advance approved', Wallet, 'success'], ADVANCE_RELEASE: ['Advance released', Wallet, 'motion'],
  ADVANCE_REJECT: ['Advance rejected', Wallet, 'halt'], DA_COMPUTE: ['DA computed', Calculator, 'genesis'],
  DA_APPROVE: ['DA approved', Calculator, 'success'], EXPENSE_SUBMIT: ['Expense filed', Banknote, 'genesis'],
  SETTLE: ['Settled', Scale, 'success'], MARK_PAID: ['Marked paid', Banknote, 'success'], REVERSE: ['Reversed', RotateCcw, 'halt'],
  DELETE: ['Deleted', Trash2, 'halt'], CATEGORY_CREATE: ['Category created', Tags, 'genesis'], CATEGORY_UPDATE: ['Category updated', Tags, 'motion'],
  CATEGORY_DELETE: ['Category removed', Tags, 'halt'], POLICY_CREATE: ['Policy created', FileBadge, 'genesis'],
  POLICY_UPDATE: ['Policy updated', FileBadge, 'motion'], POLICY_DELETE: ['Policy removed', FileBadge, 'halt'],
  DA_RATE_CREATE: ['DA rate set', Coins, 'genesis'], DA_RATE_UPDATE: ['DA rate changed', Coins, 'motion'], DA_RATE_DELETE: ['DA rate removed', Coins, 'halt'],
}
const pretty = (a) => (a || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const meta = (r) => { const m = ACTION_META[r.action]; return m ? { label: m[0], icon: m[1], family: m[2] } : { label: pretty(r.action), icon: History, family: 'genesis' } }
const fam = (r) => FAM[meta(r).family]

const ENTITIES = [
  { key: 'REQUEST', label: 'Requests', icon: Plane, hex: '#fbbf24' },
  { key: 'BOOKING', label: 'Bookings', icon: Ticket, hex: '#fb923c' },
  { key: 'ADVANCE', label: 'Advances', icon: Wallet, hex: '#34d399' },
  { key: 'DA', label: 'DA', icon: Calculator, hex: '#fbbf24' },
  { key: 'SETTLEMENT', label: 'Settlement', icon: Scale, hex: '#fb923c' },
  { key: 'POLICY', label: 'Policies', icon: FileBadge, hex: '#34d399' },
  { key: 'CATEGORY', label: 'Categories', icon: Tags, hex: '#fbbf24' },
  { key: 'DA_RATE', label: 'DA rates', icon: Coins, hex: '#fb923c' },
]
const entityIcon = (e) => (ENTITIES.find(x => x.key === e) || {}).icon || History
const ENTITY_TARGET = { REQUEST: 'requests', BOOKING: 'booking', ADVANCE: 'advances', DA: 'da', SETTLEMENT: 'settlement', POLICY: 'policies', CATEGORY: 'categories', DA_RATE: 'policies' }

const actionOpts = computed(() => [{ value: '', label: 'All actions' }, ...Object.keys(ACTION_META).map(a => ({ value: a, label: ACTION_META[a][0], icon: ACTION_META[a][1] }))])

// ── state ──
const rows = ref([])
const pulse = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const loading = ref(false)
const entity = ref('')
const action = ref('')
const expandedId = ref(null)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)))

const params = () => {
  const p = {}
  if (entity.value) p.entity_type = entity.value
  if (action.value) p.action = action.value
  return p
}
const loadPage = async () => {
  loading.value = true
  try { const d = await fetchAudit({ page: page.value, limit, ...params() }); rows.value = d.items || []; total.value = d.total || 0 }
  catch (e) { toast.error(errText(e)) } finally { loading.value = false }
}
const loadPulse = async () => {
  try { pulse.value = (await fetchAudit({ page: 1, limit: 60, ...params() })).items || [] } catch { pulse.value = [] }
}
const reload = () => { loadPage(); loadPulse() }
const setEntity = (e) => { entity.value = e; page.value = 1; expandedId.value = null; reload() }
const clearFilters = () => { entity.value = ''; action.value = ''; page.value = 1; reload() }
const go = (p) => { page.value = p; expandedId.value = null; loadPage(); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ── deck visualisation (from pulse sample) ──
const familyCounts = computed(() => { const c = {}; for (const r of pulse.value) { const f = meta(r).family; c[f] = (c[f] || 0) + 1 } return c })
const familySpectrum = computed(() => Object.keys(FAM).map(f => ({ f, ...FAM[f], n: familyCounts.value[f] || 0, pct: pulse.value.length ? (familyCounts.value[f] || 0) / pulse.value.length * 100 : 0 })).filter(x => x.n > 0))
const familyLegend = computed(() => Object.keys(FAM).map(f => ({ f, ...FAM[f], n: familyCounts.value[f] || 0 })).filter(x => x.n > 0))
const tapeBlips = computed(() => pulse.value.slice(0, 44).map((r, i) => ({ hex: fam(r).hex, h: 32 + ((i * 37) % 60) })))
const reelDur = computed(() => (8 - Math.min(pulse.value.length, 60) / 10).toFixed(1) + 's')

// ── row helpers + connectivity ──
const when = (d) => { try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
const full = (d) => { try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' } }
const shortId = (id) => id ? String(id).slice(0, 8) : '—'
const toggle = (id) => { expandedId.value = expandedId.value === id ? null : id }
const isLinked = (r) => !!r.travel_request_id || !!ENTITY_TARGET[r.entity_type]
const targetLabel = (r) => ({ POLICY: 'policy', CATEGORY: 'category', DA_RATE: 'rate matrix' }[r.entity_type] || 'record')

const showDetail = ref(false)
const detailId = ref(null)
const openRow = (r) => {
  if (r.travel_request_id) { detailId.value = r.travel_request_id; showDetail.value = true }
  else { const t = ENTITY_TARGET[r.entity_type]; if (t) emit('go', t) }
}

onMounted(reload)
</script>

<style scoped>
.aud { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.aud-hero { position: relative; overflow: hidden; isolation: isolate; padding: 22px 24px; border-radius: 22px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.hero-aura { position: absolute; inset: -50% 40% 30% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251,146,60,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.hero-motif { position: absolute; top: -44px; right: -30px; color: var(--trv-amber); opacity: 0.05; z-index: 0; animation: aud-spin 70s linear infinite; }
@keyframes aud-spin { to { transform: rotate(360deg); } }
.hero-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 4px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(22px, 3vw, 30px); font-weight: 830; margin: 11px 0 5px; color: var(--trv-text); line-height: 1.08; }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13px; color: var(--trv-text-secondary); margin: 0; max-width: 540px; line-height: 1.5; }
.hero-cta { display: flex; align-items: center; gap: 9px; }
.act-sel { width: 210px; }
.iconbtn { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); }
.iconbtn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.iconbtn.spin :deep(svg) { animation: aud-spin-fast 0.9s linear infinite; }
@keyframes aud-spin-fast { to { transform: rotate(360deg); } }

/* ── recorder deck ── */
.deck { position: relative; z-index: 1; display: grid; grid-template-columns: 60px 1fr 60px; gap: 14px; align-items: center;
  margin-top: 18px; padding: 16px; border-radius: 16px; background: linear-gradient(160deg, rgba(18,16,20,0.6), rgba(10,9,11,0.72)); border: 1px solid var(--trv-border); }
.reel { width: 60px; height: 60px; border-radius: 50%; position: relative; justify-self: center;
  background: repeating-conic-gradient(from 0deg, var(--trv-flap) 0deg 24deg, rgba(255,255,255,0.05) 24deg 26deg);
  border: 2px solid var(--trv-border-strong); box-shadow: inset 0 0 12px rgba(0,0,0,0.6); animation: aud-reel linear infinite; animation-duration: 6s; }
.reel.right { animation-direction: reverse; }
.reel-hub { position: absolute; inset: 38%; border-radius: 50%; background: var(--trv-amber); box-shadow: 0 0 10px var(--trv-amber-bright); }
@keyframes aud-reel { to { transform: rotate(360deg); } }
.tape { position: relative; height: 60px; border-radius: 12px; overflow: hidden; background: var(--trv-flap); border: 1px solid var(--trv-border-strong); }
.rec { position: absolute; top: 7px; left: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--trv-text-muted); }
.rec-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: aud-rec 1.4s ease-in-out infinite; }
@keyframes aud-rec { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.tape-run { position: absolute; inset: 0; display: flex; align-items: center; gap: 9px; padding: 0 16px; width: max-content;
  animation-name: aud-tape; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes aud-tape { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.blip { width: 3px; border-radius: 2px; flex-shrink: 0; background: var(--c); box-shadow: 0 0 7px -1px var(--c); opacity: 0.85; }
.tape-idle { color: var(--trv-text-dim); font-size: 11px; font-style: italic; }
.readhead { position: absolute; top: -4px; bottom: -4px; left: 50%; width: 2px; background: var(--trv-amber-bright); box-shadow: 0 0 14px 2px rgba(251,191,36,0.7); z-index: 2; }
.deck-readout { grid-column: 1 / -1; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 14px; margin-top: 4px; border-top: 1px solid var(--trv-border); }
.ro-total { display: flex; align-items: baseline; gap: 7px; }
.ro-total b { font-size: 22px; font-weight: 850; color: var(--trv-text); font-variant-numeric: tabular-nums; }
.ro-total span { font-size: 11px; color: var(--trv-text-muted); }
.ro-spectrum { flex: 1; min-width: 120px; display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: var(--trv-steel-soft); }
.ro-seg { height: 100%; background: var(--c); transition: width 0.7s cubic-bezier(0.16,1,0.3,1); }
.ro-seg.empty { width: 100%; background: var(--trv-steel-soft); }
.ro-legend { display: flex; flex-wrap: wrap; gap: 10px; }
.ro-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.ro-leg i { width: 8px; height: 8px; border-radius: 2px; }
.ro-leg b { color: var(--trv-text); font-weight: 750; }

/* ── lenses ── */
.hero-lenses { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.lens { --c: var(--trv-amber); display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 11px; cursor: pointer;
  font-size: 11.5px; font-weight: 600; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border);
  position: relative; overflow: hidden; transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.lens::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); }
.lens:hover { transform: translateY(-2px); color: var(--trv-text); }
.lens.on { color: var(--trv-text); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.lens.on::after { transform: scaleX(1); }
.lens :deep(svg) { color: var(--c); }

/* ── frames ── */
.list { display: flex; flex-direction: column; gap: 9px; }
.frame { animation: aud-deal 0.45s cubic-bezier(0.16,1,0.3,1) both; animation-delay: calc(var(--i) * 0.04s); }
@keyframes aud-deal { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
.frame-inner { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 13px 15px 13px 18px; border-radius: 14px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); transition: transform 0.25s var(--trv-spring), box-shadow 0.25s, border-color 0.25s; }
.frame-inner.link { cursor: pointer; }
.frame-inner:hover { transform: translateY(-2px); box-shadow: var(--trv-card-shadow); border-color: color-mix(in srgb, var(--c) 32%, var(--trv-border)); }
.frame-inner.open { border-color: color-mix(in srgb, var(--c) 40%, var(--trv-border)); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
.frame-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: var(--c); box-shadow: 0 0 12px -1px var(--c); }
.frame-sweep { position: absolute; top: 0; bottom: 0; width: 50px; left: -60px; pointer-events: none; z-index: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c) 16%, transparent), transparent); }
.frame-inner:hover .frame-sweep { animation: aud-sweep 0.9s ease; }
@keyframes aud-sweep { from { left: -60px; } to { left: 110%; } }
.frame-medallion { position: relative; z-index: 1; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; cursor: pointer;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); transition: transform 0.2s; }
.frame-medallion:hover { transform: scale(1.08); }
.frame-main { position: relative; z-index: 1; flex: 1; min-width: 0; }
.frame-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.frame-action { font-size: 13px; font-weight: 750; color: var(--trv-text); }
.frame-entity { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 6px; color: var(--trv-text-muted); background: var(--trv-steel-soft); }
.frame-ref { font-size: 10.5px; font-weight: 650; color: var(--trv-amber-bright); }
.frame-spacer { flex: 1; min-width: 8px; }
.frame-actor { font-size: 11px; color: var(--trv-text-secondary); }
.frame-time { font-size: 9.5px; color: var(--trv-text-dim); }
.frame-mid { display: flex; align-items: center; gap: 11px; margin-top: 5px; flex-wrap: wrap; }
.frame-morph { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; }
.frame-morph em { font-style: normal; color: var(--trv-text-dim); }
.frame-morph b { color: var(--c); font-weight: 700; }
.morph-arrow { color: var(--trv-text-dim); animation: aud-nudge 1.8s ease-in-out infinite; }
@keyframes aud-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(2px); } }
.frame-note { font-size: 11px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; }
.frame-tail { position: relative; z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; cursor: pointer;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: transform 0.3s var(--trv-spring), color 0.2s; }
.frame-tail:hover { color: var(--trv-amber); }
.frame-tail.on { transform: rotate(180deg); color: var(--trv-amber); }

.frame-detail { overflow: hidden; border: 1px solid var(--c); border-top: none; border-radius: 0 0 14px 14px; background: var(--trv-panel); }
.fd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; padding: 14px 16px; }
.fd-cell span { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.fd-cell span :deep(svg) { color: var(--trv-text-dim); }
.fd-cell b { display: block; margin-top: 3px; font-size: 11.5px; font-weight: 700; color: var(--trv-text); }
.fd-open { display: inline-flex; align-items: center; gap: 6px; margin: 0 16px 14px; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }

.skel { height: 64px; border-radius: 14px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

[data-theme="light"] .deck { background: linear-gradient(160deg, rgba(255,251,243,0.85), rgba(255,247,234,0.72)); }
[data-theme="light"] .reel { background: repeating-conic-gradient(from 0deg, #2a2620 0deg 24deg, rgba(255,255,255,0.18) 24deg 26deg); }
[data-theme="light"] .tape { background: #2a2620; }

@media (max-width: 700px) { .frame-note { max-width: 180px; } .deck { grid-template-columns: 44px 1fr 44px; } .reel { width: 44px; height: 44px; } }
@media (prefers-reduced-motion: reduce) {
  .hero-aura, .hero-motif, .reel, .tape-run, .rec-dot, .morph-arrow, .frame, .skel { animation: none !important; }
  .frame-inner:hover .frame-sweep { animation: none; }
  .ro-seg { transition: none; }
}
</style>
