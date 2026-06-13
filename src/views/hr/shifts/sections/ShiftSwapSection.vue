<template>
  <section class="swp">
    <Motion as="header" class="swp-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><ArrowLeftRight :size="12" /> Peer exchange</span>
        <h2>Shift Swap Requests</h2>
        <p>Request → peer accepts → manager approves → the two shifts are exchanged for that day. Drive any step from here.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="showModal = true"><Plus :size="14" />New swap</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <div class="filters">
      <button v-for="f in FILTERS" :key="f.key" class="fpill" :class="{ on: filter === f.key }" @click="filter = f.key; reload()">
        {{ f.label }}<span v-if="counts[f.key] != null" class="fcount">{{ counts[f.key] }}</span>
      </button>
    </div>

    <div class="list" v-if="swaps.length">
      <Motion v-for="(s, i) in swaps" :key="s.id" as="article" class="swap-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: Math.min(i*0.03,0.3) }">
        <div class="sc-flow">
          <div class="sc-party">
            <span class="sc-av">{{ initials(s.requester_name) }}</span>
            <div><b>{{ s.requester_name || '—' }}</b><small>{{ s.requester_shift_code || 'no shift' }}</small></div>
          </div>
          <div class="sc-arrow"><ArrowLeftRight :size="15" /><span>{{ s.swap_date }}</span></div>
          <div class="sc-party">
            <span class="sc-av alt">{{ initials(s.counterparty_name) }}</span>
            <div><b>{{ s.counterparty_name || '—' }}</b><small>{{ s.counterparty_shift_code || 'no shift' }}</small></div>
          </div>
        </div>
        <div class="sc-side">
          <ShiftStatusPill :tone="swapStatusMeta(s.status).tone">{{ swapStatusMeta(s.status).label }}</ShiftStatusPill>
          <p v-if="s.reason" class="sc-reason">“{{ s.reason }}”</p>
          <div class="sc-actions">
            <button v-if="s.status === 'PENDING_PEER'" class="act ok" @click="act('accept', s)"><Check :size="13" /> Peer accept</button>
            <button v-if="s.status === 'PENDING_MANAGER' || s.status === 'PENDING_PEER'" class="act primary" @click="act('approve', s)"><ShieldCheck :size="13" /> Approve</button>
            <button v-if="!['APPROVED','REJECTED','CANCELLED'].includes(s.status)" class="act danger" @click="act('reject', s)"><X :size="13" /> Reject</button>
            <button class="act ghost" @click="act('delete', s)" title="Delete"><Trash2 :size="13" /></button>
          </div>
        </div>
      </Motion>
    </div>
    <ShiftEmptyState v-else-if="!loading" :icon="ArrowLeftRight" title="No swap requests"
      sub="Create a swap to exchange two employees' shifts for a day — with manager approval.">
      <template #actions><button class="btn-primary" @click="showModal = true"><Plus :size="14" />New swap</button></template>
    </ShiftEmptyState>

    <ShiftSwapRequestModal :open="showModal" @close="showModal = false" @saved="reload" />
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ArrowLeftRight, Plus, RefreshCw, Check, ShieldCheck, X, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftSwapRequestModal from '../modals/ShiftSwapRequestModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchSwaps, acceptSwap, approveSwap, rejectSwap, deleteSwap, swapStatusMeta } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const swaps = ref([])
const loading = ref(false)
const showModal = ref(false)
const filter = ref('')
const counts = reactive({})

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING_PEER', label: 'Awaiting peer' },
  { key: 'PENDING_MANAGER', label: 'Awaiting manager' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
]
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

const reload = async () => {
  loading.value = true
  try {
    const params = { limit: 100 }
    if (filter.value) params.status = filter.value
    const d = await fetchSwaps(params)
    swaps.value = d.items || []
    // refresh the "all" count cheaply from the unfiltered call when on All
    if (!filter.value) counts[''] = d.total
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load swaps') }
  finally { loading.value = false }
}
onMounted(reload)

const act = async (kind, s) => {
  try {
    if (kind === 'accept') { await acceptSwap(s.id); toast.success('Peer accepted') }
    else if (kind === 'approve') { await approveSwap(s.id); toast.success('Swap approved — shifts exchanged'); emit('refresh-stats') }
    else if (kind === 'reject') { await rejectSwap(s.id); toast.success('Swap rejected') }
    else if (kind === 'delete') { if (!window.confirm('Delete this swap request?')) return; await deleteSwap(s.id); toast.success('Deleted') }
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
}
</script>

<style scoped>
.swp { display: flex; flex-direction: column; gap: 16px; }
.swp-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.filters { display: flex; flex-wrap: wrap; gap: 8px; }
.fpill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-size: 12px; font-weight: 600; }
.fpill.on { background: rgba(251,191,36,0.12); border-color: var(--shift-amber); color: var(--shift-text); }
.fcount { font-family: var(--shift-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(251,191,36,0.16); color: var(--shift-amber); }

.list { display: flex; flex-direction: column; gap: 10px; }
.swap-card { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 18px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); flex-wrap: wrap; }
.sc-flow { display: flex; align-items: center; gap: 16px; }
.sc-party { display: flex; align-items: center; gap: 9px; }
.sc-av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.sc-av.alt { background: rgba(251,146,60,0.14); color: var(--shift-ember); }
.sc-party b { display: block; font-size: 13px; color: var(--shift-text); }
.sc-party small { font-size: 10.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.sc-arrow { display: flex; flex-direction: column; align-items: center; color: var(--shift-text-muted); }
.sc-arrow span { font-size: 9px; font-family: var(--shift-mono); }
.sc-side { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
.sc-reason { margin: 0; font-size: 11px; color: var(--shift-text-muted); font-style: italic; max-width: 240px; text-align: right; }
.sc-actions { display: flex; gap: 6px; }
.act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font-size: 11.5px; font-weight: 600; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); }
.act.primary { background: var(--shift-grad-cta); color: #1f1408; border: none; }
.act.ok { color: var(--shift-ok); border-color: var(--shift-ok-soft); }
.act.danger { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
.act.ghost { padding: 6px 8px; }
@media (max-width: 720px) { .swap-card { flex-direction: column; align-items: stretch; } .sc-side { align-items: stretch; } .sc-reason { text-align: left; max-width: none; } }
</style>
