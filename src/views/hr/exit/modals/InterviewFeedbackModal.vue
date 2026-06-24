<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="ifm-overlay" @mousedown.self="close">
        <Motion as="div" class="ifm ex-grain" :class="`sent-${sentiment.key}`"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="ifm-aura" aria-hidden="true" />
          <span class="ifm-edge" aria-hidden="true" />

          <!-- ── header ── -->
          <header class="ifm-head">
            <span class="ifm-ico"><AudioLines :size="18" /></span>
            <div class="ifm-htxt">
              <h3 class="ifm-title">Exit interview feedback</h3>
              <p class="ifm-sub">{{ caseInfo?.employee_name || '—' }} · <span class="ex-mono">{{ caseInfo?.case_number || '' }}</span></p>
            </div>
            <span v-if="iv.is_confidential !== false" class="ifm-conf" title="Confidential — visible to HR only"><Lock :size="11" /> Confidential</span>
            <button class="ifm-x" @click="close" type="button"><X :size="17" /></button>
          </header>

          <!-- ── provenance strip (the "previous details" — how/when it was captured) ── -->
          <div class="ifm-meta">
            <span class="mt-chip"><component :is="modeMeta.icon" :size="12" /> {{ modeMeta.label }}</span>
            <span class="mt-chip"><CalendarCheck :size="12" /> Conducted {{ conductedWhen }}</span>
            <span v-if="iv.conducted_by_name" class="mt-chip"><UserRound :size="12" /> {{ iv.conducted_by_name }}</span>
          </div>

          <div class="ifm-body">
            <!-- ── 1 · sentiment hero ── -->
            <section class="ifm-sec hero">
              <div class="hero-dial">
                <div class="dial" :style="{ '--p': ringDeg, '--c': sentiment.hex }">
                  <span class="dial-v">{{ overall || '—' }}</span>
                  <span class="dial-k">/5</span>
                </div>
                <span class="dial-tag" :style="{ '--c': sentiment.hex }">{{ sentiment.label }}</span>
              </div>

              <div class="hero-right">
                <!-- animated voiceprint band -->
                <div class="vbar" aria-hidden="true">
                  <span v-for="(b, i) in waveBars" :key="i" class="vb" :style="{ height: b.h + '%', background: b.color, '--d': (i * 0.012) + 's' }" />
                  <span v-if="!reduced" class="vbar-scan" />
                </div>
                <!-- recommend verdict -->
                <div class="rec" :class="recTone">
                  <component :is="recIcon" :size="17" />
                  <div class="rec-t">
                    <b>{{ recLabel }}</b>
                    <i>{{ recSub }}</i>
                  </div>
                </div>
              </div>
            </section>

            <!-- ── 2 · dimension breakdown ── -->
            <section class="ifm-sec">
              <span class="sec-h"><BarChart3 :size="13" /> Dimension breakdown</span>
              <div class="dims">
                <div v-for="d in dims" :key="d.key" class="dim">
                  <span class="dim-l">{{ d.label }}</span>
                  <span class="dim-track"><span class="dim-fill" :style="{ width: (d.v / 5 * 100) + '%', background: barColor(d.v) }" /></span>
                  <span class="dim-stars">
                    <Star v-for="n in 5" :key="n" :size="12" :class="{ on: d.v >= n }" :fill="d.v >= n ? 'currentColor' : 'none'" :style="d.v >= n ? { color: barColor(d.v) } : {}" />
                  </span>
                  <span class="dim-v ex-mono" :style="{ color: barColor(d.v) }">{{ d.v || '—' }}</span>
                </div>
              </div>
            </section>

            <!-- ── 3 · primary reason ── -->
            <section v-if="iv.primary_reason_category" class="ifm-sec">
              <span class="sec-h"><Sparkles :size="13" /> Primary reason for leaving</span>
              <span class="reason-chip"><component :is="reason.icon" :size="13" /> {{ reason.label }}</span>
            </section>

            <!-- ── 4 · the voice (free text) ── -->
            <section v-if="iv.feedback_summary || textResponses.length" class="ifm-sec">
              <span class="sec-h"><MessageSquareQuote :size="13" /> In their words</span>
              <blockquote v-if="iv.feedback_summary" class="voice-q">
                <Quote :size="15" class="vq-ic" />
                <p>{{ iv.feedback_summary }}</p>
              </blockquote>
              <div v-for="(r, i) in textResponses" :key="i" class="voice-r">
                <span class="vr-q">{{ r.question }}</span>
                <p class="vr-a">{{ r.answer }}</p>
              </div>
            </section>

            <ExEmptyState v-if="empty" :icon="AudioLines" title="No structured feedback captured"
              subtitle="This interview was marked complete without ratings or comments." />
          </div>

          <!-- ── footer ── -->
          <footer class="ifm-foot">
            <button class="ifm-btn ghost" @click="close" type="button">Close</button>
            <Motion as="button" class="ifm-btn primary" type="button" @click="$emit('edit')"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"><Pencil :size="14" /> Edit feedback</Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  AudioLines, X, Lock, CalendarCheck, UserRound, BarChart3, Star, Sparkles,
  MessageSquareQuote, Quote, ThumbsUp, ThumbsDown, CircleMinus, Pencil, Video, Users, Captions,
} from 'lucide-vue-next'
import ExEmptyState from '../components/ExEmptyState.vue'
import { reasonMeta, fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseInfo: { type: Object, default: null },
  iv: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'edit'])
const reduced = prefersReduced()
const close = () => emit('close')

const MODE = {
  IN_PERSON: { label: 'In-person session', icon: Users },
  VIDEO: { label: 'Video call', icon: Video },
  FORM: { label: 'Self-service survey', icon: Captions },
}
const modeMeta = computed(() => MODE[props.iv?.mode] || MODE.FORM)
const conductedWhen = computed(() => {
  const at = props.iv?.conducted_at || props.iv?.scheduled_at
  return at ? fmtDate(at) : '—'
})

const overall = computed(() => Number(props.iv?.ratings?.overall || 0) || null)
const ringDeg = computed(() => ((overall.value || 0) / 5 * 360).toFixed(0) + 'deg')

const sentiment = computed(() => {
  const s = overall.value || 0
  if (s >= 4) return { key: 'good', label: 'Positive', hex: '#34d399' }
  if (s === 3) return { key: 'mid', label: 'Mixed', hex: '#fbbf24' }
  if (s > 0) return { key: 'bad', label: 'Critical', hex: '#ef4444' }
  return { key: 'none', label: 'No score', hex: '#a8a29e' }
})
const barColor = (v) => v >= 4 ? '#34d399' : v >= 3 ? '#fbbf24' : v > 0 ? '#ef4444' : 'var(--ex-steel-dim)'

// recommend verdict
const recVal = computed(() => props.iv?.would_recommend)
const recTone = computed(() => recVal.value === true ? 'yes' : recVal.value === false ? 'no' : 'na')
const recIcon = computed(() => recVal.value === true ? ThumbsUp : recVal.value === false ? ThumbsDown : CircleMinus)
const recLabel = computed(() => recVal.value === true ? 'Would recommend' : recVal.value === false ? 'Would not recommend' : 'Not answered')
const recSub = computed(() => recVal.value === true ? 'A promoter on the way out' : recVal.value === false ? 'A detractor — worth a closer look' : 'No eNPS signal given')

// dimension breakdown (standard 5 minus overall — overall is the dial)
const DIM_DEFS = [
  { key: 'management', label: 'Management' }, { key: 'culture', label: 'Culture' },
  { key: 'growth', label: 'Growth' }, { key: 'compensation', label: 'Compensation' },
]
const dims = computed(() => DIM_DEFS.map(d => ({ ...d, v: Number(props.iv?.ratings?.[d.key] || 0) })))

const reason = computed(() => reasonMeta(props.iv?.primary_reason_category))

// free-text responses (exclude the rating keys + the primary-reason echo, which have their own UI)
const RATING_KEYS = ['overall', 'management', 'culture', 'growth', 'compensation', 'primary_reason']
const textResponses = computed(() => (props.iv?.responses || [])
  .filter(r => r && r.answer != null && String(r.answer).trim() && !RATING_KEYS.includes(r.key)))

const empty = computed(() => !overall.value && !dims.value.some(d => d.v) &&
  !props.iv?.feedback_summary && !textResponses.value.length && recVal.value == null)

// ── animated voiceprint band: interpolate the rating points into a smooth wave ──
const NBARS = 44
const waveBars = computed(() => {
  const pts = [
    Number(props.iv?.ratings?.overall || 0), Number(props.iv?.ratings?.management || 0),
    Number(props.iv?.ratings?.culture || 0), Number(props.iv?.ratings?.growth || 0),
    Number(props.iv?.ratings?.compensation || 0),
  ]
  const any = pts.some(Boolean)
  const out = []
  for (let i = 0; i < NBARS; i++) {
    if (!any) { out.push({ h: 8, color: 'var(--ex-steel-dim)' }); continue }
    const t = (i / (NBARS - 1)) * (pts.length - 1)
    const a = Math.floor(t), b = Math.min(a + 1, pts.length - 1)
    const v = pts[a] + (pts[b] - pts[a]) * (t - a)         // linear interpolation
    const jitter = ((i % 5) - 2) * 1.5                      // subtle texture
    out.push({ h: Math.max(8, 14 + (v / 5) * 80 + jitter), color: barColor(Math.round(v)) })
  }
  return out
})
</script>

<style scoped>
@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.ifm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.68); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .ifm-overlay { background: rgba(40, 30, 15, 0.42); }
.ifm { position: relative; overflow: hidden; width: min(680px, 96vw); max-height: 92vh; overflow-y: auto;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow);
  --acc: #34d399; }
.ifm.sent-mid { --acc: #fbbf24; } .ifm.sent-bad { --acc: #ef4444; } .ifm.sent-none { --acc: #a8a29e; }
.ifm-aura { position: absolute; inset: -42% 30% 55% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 20% 0%, color-mix(in srgb, var(--acc) 20%, transparent), transparent 72%); transition: background 0.6s; }
.ifm-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--acc), transparent); opacity: 0.85; transition: background 0.6s; }

.ifm-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 10px; }
.ifm-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ifm-htxt { flex: 1; min-width: 0; }
.ifm-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; }
.ifm-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.ifm-conf { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); padding: 4px 9px; border-radius: 999px; align-self: center; }
.ifm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.ifm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

.ifm-meta { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 20px 12px; }
.mt-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--ex-text-secondary);
  padding: 4px 10px; border-radius: 999px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.mt-chip svg { color: var(--ex-violet); }

.ifm-body { padding: 4px 20px 8px; display: flex; flex-direction: column; gap: 13px; }
.ifm-sec { animation: ex-fade-up 0.45s var(--ex-spring) backwards; }
.ifm-sec:nth-child(1) { animation-delay: 0.04s; } .ifm-sec:nth-child(2) { animation-delay: 0.1s; }
.ifm-sec:nth-child(3) { animation-delay: 0.16s; } .ifm-sec:nth-child(4) { animation-delay: 0.22s; }
.sec-h { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); margin-bottom: 10px; }
.sec-h svg { color: var(--acc); }

/* hero */
.hero { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; padding: 16px; border-radius: 16px;
  background: var(--ex-grad-card), var(--ex-panel); border: 1px solid var(--ex-border-strong); }
.hero-dial { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.dial { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; width: 92px; height: 92px; border-radius: 50%;
  background: conic-gradient(var(--c) var(--p, 0deg), var(--ex-steel-soft) 0); transition: --p 1.1s var(--ex-spring); }
.dial::after { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: var(--ex-surface); }
.dial-v { position: relative; z-index: 1; font-family: var(--ex-mono); font-size: 30px; font-weight: 900; color: var(--ex-text); line-height: 1; }
.dial-k { position: relative; z-index: 1; font-size: 11px; line-height: 1; color: var(--ex-text-muted); }
.dial-tag { font-size: 11px; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; color: var(--c);
  padding: 3px 11px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.hero-right { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.vbar { position: relative; overflow: hidden; display: flex; align-items: center; gap: 2px; height: 56px; padding: 0 2px; border-radius: 12px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.vb { flex: 1; border-radius: 999px; min-height: 5px; transform-origin: center; animation: ifm-grow 0.7s var(--ex-spring) backwards; animation-delay: var(--d); }
.vbar-scan { position: absolute; top: 0; bottom: 0; width: 46px; left: -46px;
  background: linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.22) 70%, transparent); animation: ifm-sweep 4.5s linear infinite; animation-delay: 0.6s; }

.rec { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 13px; border: 1px solid var(--ex-border); background: var(--ex-surface); }
.rec.yes { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); background: var(--ex-cleared-soft); }
.rec.no { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); background: var(--ex-blocked-soft); }
.rec.na { color: var(--ex-text-muted); }
.rec-t { display: flex; flex-direction: column; line-height: 1.2; }
.rec-t b { font-size: 13px; font-weight: 820; }
.rec-t i { font-size: 11px; font-style: normal; color: var(--ex-text-muted); }

/* dimensions */
.dims { display: flex; flex-direction: column; gap: 9px; }
.dim { display: grid; grid-template-columns: 92px 1fr auto auto; align-items: center; gap: 11px; }
.dim-l { font-size: 12px; font-weight: 700; color: var(--ex-text-secondary); }
.dim-track { height: 7px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.dim-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--ex-spring); }
.dim-stars { display: inline-flex; gap: 1px; color: var(--ex-steel); }
.dim-v { font-size: 13px; font-weight: 850; min-width: 16px; text-align: right; }

/* reason */
.reason-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 750; color: var(--ex-violet);
  padding: 6px 13px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }

/* voice */
.voice-q { position: relative; display: flex; gap: 9px; margin: 0 0 9px; padding: 12px 14px; border-radius: 0 12px 12px 0;
  border-left: 3px solid var(--acc); background: color-mix(in srgb, var(--acc) 8%, var(--ex-panel)); }
.voice-q p { margin: 0; font-size: 13px; font-style: italic; line-height: 1.55; color: var(--ex-text); }
.vq-ic { color: var(--acc); flex-shrink: 0; margin-top: 2px; }
.voice-r { padding: 9px 0; border-top: 1px dashed var(--ex-border); }
.vr-q { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ex-text-muted); }
.vr-a { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ex-text-secondary); }

.ifm-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.ifm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
.ifm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.ifm-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(234, 88, 12, 0.7); }

@keyframes ifm-grow { from { transform: scaleY(0.1); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@keyframes ifm-sweep { 0% { left: -46px; } 100% { left: 100%; } }

@media (max-width: 600px) {
  .hero { grid-template-columns: 1fr; justify-items: center; }
  .dim { grid-template-columns: 80px 1fr auto; } .dim-stars { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ifm-aura, .vb, .vbar-scan { animation: none; } .ifm-sec { animation: none; }
  .dial, .dim-fill { transition: none; }
}
</style>
