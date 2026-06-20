<template>
  <Motion as="article" class="dk" :data-status="d.status" :data-tone="m.tone" :style="{ '--i': index }"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :whileHover="{ y: -4 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <div class="dk-inner" ref="inner">
      <span class="as-spotlight" aria-hidden="true" />
      <span class="dk-edge" aria-hidden="true" />
      <span v-if="isCompleted" class="dk-retired" aria-hidden="true">RETIRED</span>

      <!-- head: method + docket id + status -->
      <header class="dk-head">
        <span class="dk-method"><component :is="m.icon" :size="14" /> {{ m.label }}</span>
        <AsStamp :value="d.status" />
      </header>

      <div class="dk-id">
        <span class="dk-code as-mono">{{ d.asset_code || '—' }}</span>
        <span class="dk-blurb">{{ m.blurb }}</span>
      </div>

      <!-- value-recovery ledger -->
      <div v-if="hasVal" class="dk-ledger">
        <div class="dk-figs">
          <span class="dk-fig">
            <small>book value</small>
            <b class="as-mono">{{ money(book) }}</b>
          </span>
          <span class="dk-arrow" :data-rec="recovers"><ArrowRight :size="14" /></span>
          <span class="dk-fig gain">
            <small>recovered</small>
            <b class="as-mono">{{ money(sale) }}</b>
          </span>
        </div>
        <div class="dk-bar" :title="`${Math.round(recPct)}% recovered`">
          <span class="dk-bar-fill" :style="{ width: drawn ? recPct + '%' : '0%' }" />
        </div>
        <span class="dk-delta" :class="delta >= 0 ? 'up' : 'down'">
          <component :is="delta >= 0 ? TrendingUp : TrendingDown" :size="11" />
          {{ delta >= 0 ? 'net gain ' : 'written down ' }}{{ money(Math.abs(delta)) }}
        </span>
      </div>
      <div v-else class="dk-noval">
        <Coins :size="13" /> No residual value · full write-down
      </div>

      <!-- workflow stepper / closed pill -->
      <div class="dk-flow" :class="{ closed: isClosed }">
        <template v-if="!isClosed">
          <span v-for="(s, si) in STAGES" :key="s" class="dk-step" :class="{ on: si <= stageIdx, now: si === stageIdx }">
            <span class="dk-step-dot" /><span class="dk-step-lab">{{ s }}</span>
          </span>
        </template>
        <span v-else class="dk-closed"><component :is="closedIcon" :size="13" /> {{ titleCase(d.status) }}</span>
      </div>

      <!-- footer: date + actions -->
      <footer class="dk-foot">
        <span class="dk-when"><CalendarClock :size="11" /> {{ dateLabel }}</span>
        <div class="dk-actions">
          <button v-if="d.status === 'REQUESTED'" class="dk-act ok" @click="$emit('action', 'approve')"><Check :size="13" /> Approve</button>
          <button v-if="d.status === 'APPROVED'" class="dk-act ok" @click="$emit('action', 'complete')"><Flame :size="13" /> Complete</button>
          <button v-if="d.status === 'REQUESTED'" class="dk-act danger" @click="$emit('action', 'reject')">Reject</button>
          <button v-if="['REQUESTED','APPROVED'].includes(d.status)" class="dk-act ghost" @click="$emit('action', 'cancel')">Cancel</button>
          <button class="dk-act ghost icon" title="Movement log" @click="$emit('detail')"><History :size="13" /></button>
        </div>
      </footer>

      <p v-if="d.reason" class="dk-reason">“{{ d.reason }}”<span v-if="d.buyer" class="dk-buyer"> · {{ d.buyer }}</span></p>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, Flame, History, ArrowRight, CalendarClock, Coins,
  TrendingUp, TrendingDown, XCircle, Ban,
} from 'lucide-vue-next'
import AsStamp from './AsStamp.vue'
import { disposalMethodMeta, titleCase } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  d: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['action', 'detail'])

const inner = ref(null)
usePointerSpotlight(inner)

const m = computed(() => disposalMethodMeta(props.d.disposal_method))
const recovers = computed(() => !!m.value.recovers)
const book = computed(() => Number(props.d.book_value) || 0)
const sale = computed(() => Number(props.d.sale_value) || 0)
const hasVal = computed(() => book.value > 0 || sale.value > 0)
const recPct = computed(() => book.value > 0 ? Math.min(100, (sale.value / book.value) * 100) : (sale.value > 0 ? 100 : 0))
const delta = computed(() => sale.value - book.value)

const STAGES = ['Requested', 'Approved', 'Retired']
const STAGE_IDX = { REQUESTED: 0, APPROVED: 1, COMPLETED: 2 }
const stageIdx = computed(() => STAGE_IDX[props.d.status] ?? 0)
const isCompleted = computed(() => props.d.status === 'COMPLETED')
const isClosed = computed(() => ['REJECTED', 'CANCELLED'].includes(props.d.status))
const closedIcon = computed(() => props.d.status === 'REJECTED' ? XCircle : Ban)

const fmt = (v) => { try { return new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) } catch { return v } }
const dateLabel = computed(() => {
  if (props.d.status === 'COMPLETED' && props.d.disposed_date) return 'Retired ' + fmt(props.d.disposed_date)
  if (props.d.status === 'APPROVED' && props.d.approved_date) return 'Cleared ' + fmt(props.d.approved_date)
  return 'Requested ' + fmt(props.d.request_date)
})
const money = (v) => '₹' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const drawn = ref(false)
onMounted(() => { if (prefersReduced()) { drawn.value = true; return } nextTick(() => setTimeout(() => { drawn.value = true }, 120 + Math.min(props.index * 45, 400))) })
</script>

<style scoped>
.dk { position: relative; border-radius: 18px; perspective: 1100px; will-change: transform; }
.dk-inner { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px 17px 14px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg));
  transition: transform 0.18s ease-out, box-shadow 0.3s, border-color 0.3s; transform-style: preserve-3d; }
.dk:hover .dk-inner { box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }

/* method tone */
.dk[data-tone="gain"]  { --mc: var(--as-st-available); }
.dk[data-tone="amber"] { --mc: var(--as-amber); }
.dk[data-tone="ember"] { --mc: var(--as-ember); }
.dk[data-tone="steel"] { --mc: var(--as-steel); }
.dk[data-tone="loss"]  { --mc: var(--as-cond-poor); }

/* status edge */
.dk-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent, var(--as-steel-dim)); opacity: 0.75; box-shadow: 0 0 12px var(--accent); z-index: 2; }
.dk[data-status="REQUESTED"] { --accent: var(--as-st-reserved); }
.dk[data-status="APPROVED"]  { --accent: var(--as-st-allocated); }
.dk[data-status="COMPLETED"] { --accent: var(--as-ember); }
.dk[data-status="REJECTED"]  { --accent: var(--as-cond-poor); }
.dk[data-status="CANCELLED"] { --accent: var(--as-st-retired); }

.dk-retired { position: absolute; top: 16px; right: -30px; transform: rotate(38deg); font-family: var(--as-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.22em;
  color: var(--as-ember); padding: 3px 34px; background: color-mix(in srgb, var(--as-ember) 14%, transparent); border-top: 1px solid color-mix(in srgb, var(--as-ember) 35%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--as-ember) 35%, transparent); pointer-events: none; z-index: 3; }

.dk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: relative; z-index: 1; }
.dk-method { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mc); }

.dk-id { display: flex; flex-direction: column; gap: 1px; position: relative; z-index: 1; }
.dk-code { font-size: 16px; font-weight: 800; color: var(--as-text); letter-spacing: -0.01em; }
.dk-blurb { font-size: 11px; color: var(--as-text-muted); }

/* ── value-recovery ledger ── */
.dk-ledger { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; padding: 11px 12px; border-radius: 13px;
  background: color-mix(in srgb, var(--as-surface-elevated) 60%, transparent); border: 1px solid var(--as-border-soft); }
.dk-figs { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dk-fig { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dk-fig small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.dk-fig b { font-size: 14.5px; font-weight: 800; color: var(--as-text); }
.dk-fig.gain { text-align: right; }
.dk-fig.gain b { color: var(--as-st-available); }
.dk-arrow { display: grid; place-items: center; color: var(--as-text-dim); flex-shrink: 0; }
.dk-arrow[data-rec="true"] { color: var(--as-amber); }
.dk-bar { position: relative; height: 6px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--as-steel) 20%, transparent); }
.dk-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; transition: width 1s var(--as-ease) 0.1s;
  background: linear-gradient(90deg, var(--as-ember), var(--as-amber-bright)); box-shadow: 0 0 8px color-mix(in srgb, var(--as-amber) 55%, transparent); }
.dk-delta { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; }
.dk-delta.up { color: var(--as-st-available); }
.dk-delta.down { color: var(--as-cond-poor); }

.dk-noval { display: inline-flex; align-items: center; gap: 7px; padding: 10px 12px; border-radius: 13px; font-size: 12px; font-weight: 600; color: var(--as-text-muted);
  background: color-mix(in srgb, var(--as-steel) 8%, transparent); border: 1px dashed var(--as-border-strong); position: relative; z-index: 1; }
.dk-noval :deep(svg) { color: var(--as-steel); }

/* ── stepper ── */
.dk-flow { display: flex; align-items: center; gap: 4px; position: relative; z-index: 1; }
.dk-step { display: inline-flex; align-items: center; gap: 5px; }
.dk-step:not(:last-child)::after { content: ''; width: 16px; height: 1.5px; background: var(--as-border-strong); border-radius: 2px; }
.dk-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--as-st-retired-soft); border: 1.5px solid var(--as-border-strong); transition: all 0.3s var(--as-spring); }
.dk-step-lab { font-size: 10px; font-weight: 600; color: var(--as-text-dim); }
.dk-step.on .dk-step-dot { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 7px color-mix(in srgb, var(--accent) 70%, transparent); }
.dk-step.on .dk-step-lab { color: var(--as-text-secondary); }
.dk-step.now .dk-step-dot { animation: as-relay-pulse 1.6s ease-in-out infinite; }
.dk-step.now .dk-step-lab { color: var(--as-text); font-weight: 700; }
.dk-closed { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--accent); }

/* ── foot ── */
.dk-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; position: relative; z-index: 1; padding-top: 11px; border-top: 1px solid var(--as-border-soft); }
.dk-when { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--as-text-dim); }
.dk-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.dk-act { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-secondary); transition: all 0.2s var(--as-spring); }
.dk-act:hover { transform: translateY(-1px); }
.dk-act.icon { padding: 6px; }
.dk-act.ok { color: #1a1206; background: var(--hr-gradient-hero, linear-gradient(135deg, #fbbf24, #f59e0b)); border: none; box-shadow: 0 6px 16px -8px rgba(251,146,60,0.6); }
[data-theme="light"] .dk-act.ok { color: #2a1a06; }
.dk-act.ghost:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.dk-act.danger { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 30%, transparent); background: color-mix(in srgb, var(--as-cond-poor) 8%, transparent); }
.dk-act.danger:hover { background: color-mix(in srgb, var(--as-cond-poor) 16%, transparent); }

.dk-reason { margin: 0; font-size: 11.5px; font-style: italic; color: var(--as-text-muted); position: relative; z-index: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dk-buyer { font-style: normal; font-weight: 600; color: var(--as-text-secondary); }

@media (prefers-reduced-motion: reduce) {
  .dk-inner { transform: none !important; transition: box-shadow 0.3s, border-color 0.3s; }
  .dk-bar-fill { transition: none; }
  .dk-step.now .dk-step-dot { animation: none; }
}
</style>
