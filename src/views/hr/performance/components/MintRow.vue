<template>
  <!-- ═══════════ MINT ROW · a single increment on the strike line ═══════════
       State-aware card: a COMPLETED review with no hike is a raw ingot (Recommend);
       a RECOMMENDED review is a struck blank awaiting approval (Approve / Decline);
       an APPLIED review is a minted coin (prev→new CTC). 3D pointer-tilt + glare,
       score gauge medallion (score→band→coin), status spine. -->
  <div class="mr-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="mr" :class="['s-' + state, { busy }]">
      <span class="mr-glare" aria-hidden="true" />
      <span class="mr-spine" aria-hidden="true" />

      <!-- score gauge medallion -->
      <div class="mr-medal" :style="{ '--sc': scoreColor }">
        <span class="mr-medal-ring" :style="{ '--perf-p': scoreDeg + 'deg' }" />
        <span class="mr-medal-core">
          <component v-if="state === 'applied'" :is="BadgeIndianRupee" :size="16" />
          <template v-else>{{ scoreText }}</template>
        </span>
        <span class="mr-medal-state" :title="stateMeta.label"><component :is="stateMeta.icon" :size="10" /></span>
      </div>

      <!-- identity -->
      <div class="mr-id">
        <b class="mr-name">{{ r.employee_name || '—' }}</b>
        <span class="mr-meta">{{ r.designation_name || '—' }}</span>
        <span v-if="band" class="mr-band" :style="{ '--bc': band.color }">{{ band.label }}<i v-if="bandWindow"> · {{ bandWindow }}</i></span>
      </div>

      <!-- center figure -->
      <div class="mr-fig">
        <template v-if="state === 'applied'">
          <span class="mr-ctc">{{ inrShort(r.prev_annual_ctc) }} <ArrowRight :size="11" /> <b>{{ inrShort(r.new_annual_ctc) }}</b></span>
          <span class="mr-fig-sub">effective {{ fmtDate(r.hike_effective_from) || '—' }}</span>
        </template>
        <template v-else-if="state === 'recommended'">
          <span class="mr-pct">{{ fmtPct(r.recommended_hike_pct) }}</span>
          <span class="mr-fig-sub">recommended{{ r.recommended_at ? ' · ' + fmtDate(r.recommended_at) : '' }}</span>
        </template>
        <template v-else>
          <span class="mr-pct ghost">{{ bandWindow || '—' }}</span>
          <span class="mr-fig-sub">{{ isAck ? 'ready to approve' : 'awaiting recommendation' }}</span>
        </template>
      </div>

      <!-- actions -->
      <div class="mr-acts">
        <template v-if="state === 'applied'">
          <span class="mr-minted"><CheckCircle2 :size="13" /> {{ fmtPct(r.approved_hike_pct) }} minted</span>
        </template>
        <template v-else-if="state === 'recommended'">
          <button class="perf-btn perf-btn-primary mr-sm" :disabled="busy" @click="$emit('approve', r)">
            <Loader2 v-if="busy === 'approve'" :size="13" class="perf-spin" /><BadgeCheck v-else :size="13" /> Approve
          </button>
          <button class="perf-btn mr-sm mr-ghost" :disabled="busy" @click="$emit('decline', r)" title="Decline increment"><CircleSlash :size="13" /></button>
        </template>
        <template v-else>
          <button class="perf-btn perf-btn-primary mr-sm" :disabled="busy" @click="$emit(isAck ? 'approve' : 'recommend', r)">
            <Loader2 v-if="busy" :size="13" class="perf-spin" />
            <component v-else :is="isAck ? BadgeCheck : TrendingUp" :size="13" /> {{ isAck ? 'Approve' : 'Recommend' }}
          </button>
        </template>
        <button class="perf-btn mr-sm mr-icon" :disabled="busy" @click="$emit('open', r)" title="Open profile console"><ExternalLink :size="13" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BadgeIndianRupee, ArrowRight, CheckCircle2, BadgeCheck, CircleSlash, TrendingUp, ExternalLink, Loader2, MinusCircle } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { scoreTone, hikeStatusMeta } from '@/composables/usePerformance'

const props = defineProps({
  review: { type: Object, required: true },
  band: { type: Object, default: null },      // { label, color, hmin, hmax }
  index: { type: Number, default: 0 },
  busy: { type: [Boolean, String], default: false },   // false | 'approve' | true
})
defineEmits(['recommend', 'approve', 'decline', 'open'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const r = computed(() => props.review || {})
const hike = computed(() => r.value.hike_status || 'NONE')
const isAck = computed(() => r.value.status === 'ACKNOWLEDGED')
const state = computed(() => {
  if (hike.value === 'APPLIED') return 'applied'
  if (hike.value === 'RECOMMENDED') return 'recommended'
  return 'queue'   // NONE / REJECTED on a completed/ack review
})
const stateMeta = computed(() => {
  if (state.value === 'applied') return hikeStatusMeta('APPLIED')
  if (state.value === 'recommended') return hikeStatusMeta('RECOMMENDED')
  return hike.value === 'REJECTED' ? hikeStatusMeta('REJECTED') : { label: 'Awaiting recommendation', icon: MinusCircle }
})

const max = computed(() => r.value.rating_max || 5)
const scoreFrac = computed(() => r.value.overall_score != null ? Math.min(1, r.value.overall_score / max.value) : 0)
const scoreDeg = computed(() => Math.round(scoreFrac.value * 360))
const scoreColor = computed(() => scoreTone(r.value.overall_score, max.value))
const scoreText = computed(() => r.value.overall_score != null ? (Math.round(r.value.overall_score * 10) / 10).toFixed(1) : '—')

const bandWindow = computed(() => {
  if (!props.band || props.band.hmin == null) return ''
  return props.band.hmin === props.band.hmax ? `${props.band.hmin}%` : `${props.band.hmin}–${props.band.hmax}%`
})

const fmtPct = (v) => v == null ? '—' : (Number.isInteger(Number(v)) ? `${v}%` : `${Number(v).toFixed(1)}%`)
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) } catch { return '' } }
const inrShort = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + 'Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + 'L'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}
</script>

<style scoped>
.mr-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.045s); }
.mr { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 13px 15px; border-radius: 16px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.3s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; }
.mr:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.mr.busy { opacity: 0.7; }
.mr-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 42%); }
.mr-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--perf-unset); transition: background 0.3s; }
.mr.s-queue .mr-spine { background: var(--perf-text-dim); }
.mr.s-recommended .mr-spine { background: var(--perf-amber); box-shadow: 0 0 10px var(--perf-amber); }
.mr.s-applied .mr-spine { background: var(--perf-ok); box-shadow: 0 0 10px var(--perf-ok); }

/* medallion */
.mr-medal { position: relative; flex-shrink: 0; width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; }
.mr-medal-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(var(--sc) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); }
.mr-medal-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface-elevated); }
.mr-medal-core { position: relative; z-index: 1; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
  font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--sc); background: color-mix(in srgb, var(--sc) 12%, transparent); }
.mr.s-applied .mr-medal-core { color: #4a2c08; background: radial-gradient(circle at 38% 32%, var(--perf-gold-bright), var(--perf-ember) 80%); }
.mr-medal-state { position: absolute; bottom: -2px; right: -2px; z-index: 2; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
  color: var(--perf-text); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); }
.mr.s-recommended .mr-medal-state { color: var(--perf-amber); }
.mr.s-applied .mr-medal-state { color: var(--perf-ok); }

/* identity */
.mr-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1.2; }
.mr-name { font-size: 13.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mr-meta { font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mr-band { display: inline-flex; align-items: center; width: fit-content; margin-top: 2px; padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 800;
  color: var(--bc); background: color-mix(in srgb, var(--bc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--bc) 28%, transparent); }
.mr-band i { font-style: normal; font-weight: 650; opacity: 0.8; }

/* center figure */
.mr-fig { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex: 1; min-width: 0; text-align: right; }
.mr-pct { font-size: 17px; font-weight: 900; color: var(--perf-amber); font-variant-numeric: tabular-nums; }
.mr-pct.ghost { font-size: 13px; color: var(--perf-text-dim); }
.mr-ctc { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--perf-text-muted); font-variant-numeric: tabular-nums; }
.mr-ctc b { font-size: 13px; font-weight: 850; color: var(--perf-ok); }
.mr-ctc :deep(svg) { color: var(--perf-ok); }
.mr-fig-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--perf-text-dim); white-space: nowrap; }

/* actions */
.mr-acts { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.mr-sm { padding: 7px 11px; font-size: 11.5px; }
.mr-icon, .mr-ghost { padding: 7px 9px; }
.mr-ghost:hover:not(:disabled) { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.mr-minted { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; font-size: 11px; font-weight: 800;
  color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 28%, transparent); }

@media (max-width: 760px) {
  .mr { flex-wrap: wrap; gap: 10px; }
  .mr-fig { flex-basis: 100%; align-items: flex-start; text-align: left; flex-direction: row; gap: 8px; align-items: baseline; }
}
@media (prefers-reduced-motion: reduce) { .mr:hover { transform: translateY(-2px); } .mr-shell { animation: none; } }
</style>
