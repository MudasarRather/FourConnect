<template>
  <section class="tfb" :class="{ reduced }">
    <span class="tfb-aura" aria-hidden="true" />

    <header class="tfb-head">
      <div class="tfb-head-l">
        <span class="tfb-eye"><Orbit :size="12" /> 360° Perception</span>
        <h2 class="tfb-title">Team feedback</h2>
        <span class="tfb-sub">Give your reports' multi-rater feedback and read what every voice — including their own — has said.</span>
      </div>
      <button class="perf-btn perf-btn-ghost" :disabled="loading" @click="$emit('refresh')"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /> Refresh</button>
    </header>

    <!-- feedback you owe about your reports -->
    <div v-if="giveDuties.length" class="tfb-owe">
      <div class="tfb-owe-h"><Send :size="13" /> <b>{{ pendingOwed }}</b> response{{ pendingOwed === 1 ? '' : 's' }} you owe about your team</div>
      <div class="tfb-owe-strip">
        <Motion v-for="(d, i) in giveDuties" :key="d.response_id" as="button" class="tfb-owe-card" :class="dutyState(d)"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="reduced ? {} : { y: -3 }" :whileTap="reduced ? {} : { scale: 0.98 }" @click="$emit('give', d)">
          <span class="tfb-owe-av" :style="{ '--rc': relColor(d.relationship_type) }">{{ initials(d.subject_name) }}</span>
          <div class="tfb-owe-txt">
            <b>{{ d.subject_name }}</b>
            <span>{{ relLabel(d.relationship_type) }} · {{ (d.competencies || []).length }} competenc{{ (d.competencies || []).length === 1 ? 'y' : 'ies' }}</span>
          </div>
          <span class="tfb-owe-cta" :class="dutyState(d)"><component :is="dutyIcon(d)" :size="12" /> {{ dutyVerb(d) }}</span>
        </Motion>
      </div>
    </div>

    <!-- perception grid -->
    <div v-if="loading" class="tfb-load"><Loader2 :size="18" class="perf-spin" /> Loading team perception…</div>
    <div v-else-if="!reports.length" class="tfb-empty">
      <span class="tfb-empty-ic"><Users :size="24" /></span>
      <b>No team feedback yet</b>
      <p>When HR opens a 360° cycle for your reports, each person's collected feedback — and their self-assessment — appears here for you to read.</p>
    </div>
    <div v-else class="tfb-grid">
      <article v-for="(r, i) in reports" :key="r.employee_id" class="tfb-card" :class="cardState(r)" :style="{ '--i': i, '--c': tone(r) }"
        @pointermove="onTilt" @pointerleave="resetTilt" @click="$emit('view', r)">
        <span class="tfb-glare" aria-hidden="true" />
        <span class="tfb-spine" aria-hidden="true" />

        <div class="tfb-card-top">
          <span class="tfb-av">{{ initials(r.employee_name) }}</span>
          <div class="tfb-id">
            <b>{{ r.employee_name }}</b>
            <span>{{ r.designation_name || '—' }}</span>
          </div>
          <span v-if="r.self_submitted" class="tfb-self ok" title="Self-assessment submitted"><UserCheck :size="11" /> Self in</span>
          <span v-else class="tfb-self wait" title="Self-assessment pending"><UserCheck :size="11" /> No self</span>
        </div>

        <div class="tfb-card-body">
          <!-- perception ring -->
          <div class="tfb-ring" :style="{ '--perf-p': ringDeg(r) + 'deg' }">
            <div class="tfb-ring-in">
              <b v-if="overall(r) != null"><SetCountUp :value="overall(r)" :decimals="1" /></b>
              <b v-else class="muted">—</b>
              <span>/{{ r.rating_max || 5 }}</span>
            </div>
          </div>

          <div class="tfb-stats">
            <div class="tfb-stat">
              <span class="tfb-stat-lab">Responses</span>
              <span class="tfb-stat-val">{{ submitted(r) }}<i>/{{ invited(r) }}</i></span>
              <span class="tfb-meter"><b :style="{ width: respPct(r) + '%' }" /></span>
            </div>
            <div class="tfb-rels" v-if="relDots(r).length">
              <span v-for="rel in relDots(r)" :key="rel.key" class="tfb-rel-dot" :style="{ '--rc': rel.color }" :title="`${rel.label}: ${rel.count}`" />
            </div>
            <span v-else class="tfb-rels-empty">Awaiting responses</span>
          </div>
        </div>

        <div class="tfb-card-foot">
          <span class="tfb-period">{{ r.period_label || (r.has_feedback ? 'Current cycle' : 'No cycle open') }}</span>
          <span class="tfb-view"><Eye :size="13" /> View feedback</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Orbit, RefreshCw, Send, Users, Loader2, Eye, UserCheck, CheckCircle2, CircleSlash } from 'lucide-vue-next'
import SetCountUp from '../../settings/components/SetCountUp.vue'
import { scoreTone, feedbackRelMeta } from '@/composables/usePerformance'

const props = defineProps({
  reports: { type: Array, default: () => [] },
  giveDuties: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['give', 'view', 'refresh'])

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const relLabel = (k) => feedbackRelMeta(k).label
const relColor = (k) => feedbackRelMeta(k).color

const pendingOwed = computed(() => props.giveDuties.filter(d => d.status === 'PENDING').length || props.giveDuties.length)
const dutyState = (d) => d.status === 'SUBMITTED' ? 'done' : d.status === 'DECLINED' ? 'declined' : ''
const dutyIcon = (d) => d.status === 'SUBMITTED' ? CheckCircle2 : d.status === 'DECLINED' ? CircleSlash : Send
const dutyVerb = (d) => d.status === 'SUBMITTED' ? 'View' : d.status === 'DECLINED' ? 'Declined' : 'Give'

const overall = (r) => r.rollup?.overall_avg ?? null
const tone = (r) => scoreTone(overall(r), r.rating_max || 5)
const ringDeg = (r) => overall(r) != null ? Math.round((overall(r) / (r.rating_max || 5)) * 360) : 0
const submitted = (r) => r.rollup?.submitted ?? 0
const invited = (r) => r.rollup?.invited ?? 0
const respPct = (r) => invited(r) > 0 ? Math.round((submitted(r) / invited(r)) * 100) : 0
const relDots = (r) => {
  const by = r.rollup?.by_relationship || {}
  return Object.entries(by).filter(([, n]) => n > 0).map(([k, n]) => ({ key: k, count: n, label: relLabel(k), color: relColor(k) }))
}
const cardState = (r) => !r.has_feedback ? 'awaiting' : (submitted(r) > 0 ? 'live' : 'collecting')

// per-card pointer tilt + glare (no composable needed in a v-for)
function onTilt(e) {
  if (props.reduced) return
  const el = e.currentTarget, b = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - b.left) / b.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - b.top) / b.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
function resetTilt(e) {
  const el = e.currentTarget
  el.style.setProperty('--spot', '0'); el.style.setProperty('--mx', '0.5'); el.style.setProperty('--my', '0.5')
}
</script>

<style scoped>
.tfb { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 16px; padding: 20px 22px 22px; border-radius: 22px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--perf-surface) 92%, transparent), var(--perf-panel)); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.tfb::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-orange) 50%, transparent), transparent); }
.tfb-aura { position: absolute; top: -120px; right: -60px; width: 300px; height: 300px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 18%, transparent), transparent 70%); filter: blur(50px); animation: tfb-breathe 9s var(--perf-ease) infinite; }

.tfb-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; position: relative; z-index: 1; }
.tfb-head-l { min-width: 0; }
.tfb-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--perf-orange); }
.tfb-title { margin: 6px 0 3px; font-size: clamp(18px, 2.4vw, 23px); font-weight: 850; letter-spacing: -0.02em; color: var(--perf-text); }
.tfb-sub { font-size: 12px; color: var(--perf-text-muted); max-width: 60ch; }

/* owed strip */
.tfb-owe { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 9px; padding: 13px 14px; border-radius: 15px;
  background: color-mix(in srgb, var(--perf-orange) 7%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--perf-orange) 24%, transparent); }
.tfb-owe-h { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--perf-text-secondary); }
.tfb-owe-h :deep(svg) { color: var(--perf-orange); }
.tfb-owe-h b { color: var(--perf-orange); font-weight: 850; }
.tfb-owe-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(244px, 1fr)); gap: 9px; }
.tfb-owe-card { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.2s, box-shadow 0.25s; }
.tfb-owe-card:hover { border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.tfb-owe-card.done { opacity: 0.78; } .tfb-owe-card.declined { opacity: 0.62; }
.tfb-owe-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206;
  background: linear-gradient(135deg, color-mix(in srgb, var(--rc) 86%, #fff), var(--rc)); }
.tfb-owe-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tfb-owe-txt b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tfb-owe-txt span { font-size: 10px; color: var(--perf-text-muted); }
.tfb-owe-cta { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 10.5px; font-weight: 800; padding: 5px 10px; border-radius: 999px; color: #1a1206; background: var(--perf-grad-hero); }
.tfb-owe-cta.done { color: var(--perf-ok); background: var(--perf-ok-soft); }
.tfb-owe-cta.declined { color: var(--perf-text-muted); background: var(--perf-unset-soft); }

/* states + grid */
.tfb-load, .tfb-empty { position: relative; z-index: 1; }
.tfb-load { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.tfb-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 24px; border-radius: 16px; background: var(--perf-panel); border: 1px dashed var(--perf-border-strong); }
.tfb-empty-ic { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 24%, transparent); }
.tfb-empty b { font-size: 14px; font-weight: 850; color: var(--perf-text); }
.tfb-empty p { margin: 0; font-size: 12px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.55; }
.tfb-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(264px, 1fr)); gap: 13px; }

/* perception card */
.tfb-card { position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 13px; padding: 15px 16px; border-radius: 17px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); --mx: 0.5; --my: 0.5; --spot: 0;
  opacity: 0; transform: translateY(16px); animation: tfb-deal 0.5s var(--perf-spring) forwards; animation-delay: calc(var(--i, 0) * 0.05s);
  transition: transform 0.28s var(--perf-spring), border-color 0.28s, box-shadow 0.28s; }
.tfb-card:hover { transform: perspective(1100px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 8deg)) translateY(-3px); border-color: color-mix(in srgb, var(--c) 40%, var(--perf-border)); box-shadow: var(--perf-card-shadow-hover); }
.tfb-glare { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(340px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--c) 18%, transparent), transparent 46%); }
.tfb-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); }
.tfb-card.awaiting { border-style: dashed; } .tfb-card.awaiting .tfb-spine { opacity: 0.4; }
.tfb-card.live .tfb-spine::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: inherit; filter: blur(3px); animation: tfb-pulse 2.4s ease-in-out infinite; }

.tfb-card-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.tfb-av { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; font-size: 12px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.tfb-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tfb-id b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tfb-id span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tfb-self { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; }
.tfb-self.ok { color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 26%, transparent); }
.tfb-self.wait { color: var(--perf-text-muted); background: var(--perf-unset-soft); border: 1px solid var(--perf-border); }

.tfb-card-body { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; }
.tfb-ring { position: relative; width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); filter: drop-shadow(0 0 9px color-mix(in srgb, var(--c) 30%, transparent)); }
.tfb-ring-in { position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tfb-ring-in b { font-size: 17px; font-weight: 850; color: var(--perf-text); line-height: 1; font-variant-numeric: tabular-nums; }
.tfb-ring-in b.muted { color: var(--perf-text-dim); }
.tfb-ring-in span { font-size: 8px; color: var(--perf-text-muted); }
.tfb-stats { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.tfb-stat { display: flex; flex-direction: column; gap: 4px; }
.tfb-stat-lab { font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }
.tfb-stat-val { font-size: 14px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.tfb-stat-val i { font-size: 9px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.tfb-meter { height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.tfb-meter b { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.9s var(--perf-spring); }
.tfb-rels { display: flex; flex-wrap: wrap; gap: 5px; }
.tfb-rel-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--rc); box-shadow: 0 0 6px color-mix(in srgb, var(--rc) 60%, transparent); }
.tfb-rels-empty { font-size: 10px; color: var(--perf-text-dim); font-style: italic; }

.tfb-card-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 11px; border-top: 1px solid var(--perf-border); }
.tfb-period { font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tfb-view { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: 11.5px; font-weight: 800; color: var(--perf-orange); transition: gap 0.2s; }
.tfb-card:hover .tfb-view { gap: 8px; }

@keyframes tfb-deal { to { opacity: 1; transform: none; } }
@keyframes tfb-breathe { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
@keyframes tfb-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.tfb.reduced .tfb-aura { animation: none; }
.tfb.reduced .tfb-card { animation: none; opacity: 1; transform: none; }
.tfb.reduced .tfb-card:hover { transform: translateY(-3px); }
.tfb.reduced .tfb-card.live .tfb-spine::after { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .tfb-aura { animation: none; }
  .tfb-card { animation: none; opacity: 1; transform: none; }
  .tfb-card:hover { transform: translateY(-3px); }
  .tfb-card.live .tfb-spine::after { animation: none; }
  .tfb-meter b, .tfb-ring { transition: none; }
}
</style>
