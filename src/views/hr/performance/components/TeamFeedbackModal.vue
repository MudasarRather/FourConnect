<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="tf-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="tf" :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="tf-edge" aria-hidden="true" />
          <header class="tf-head">
            <span class="tf-av">{{ initials(empName) }}</span>
            <div class="tf-titles">
              <b>360° feedback · {{ empName }}</b>
              <span>{{ empRole || 'Multi-rater perception collected about your report' }}</span>
            </div>
            <button class="tf-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="tf-body">
            <div v-if="loading" class="tf-load"><Loader2 :size="18" class="perf-spin" /> Loading feedback…</div>

            <div v-else-if="!items.length" class="tf-empty">
              <span class="tf-empty-ic"><Orbit :size="24" /></span>
              <b>No 360° feedback yet</b>
              <p>No multi-rater feedback has been collected about {{ firstName }} yet. When HR opens a 360° request and raters submit, it appears here.</p>
            </div>

            <template v-else>
              <!-- cycle selector when more than one request exists -->
              <div v-if="items.length > 1" class="tf-cycles">
                <button v-for="(it, i) in items" :key="it.id" class="tf-cycle" :class="{ on: i === active }" @click="active = i">
                  {{ it.period_label || it.cycle || ('Cycle ' + (i + 1)) }}
                </button>
              </div>

              <template v-if="cur">
                <!-- summary strip -->
                <div class="tf-summary">
                  <div class="tf-sum-card">
                    <span class="tf-sum-lab">Overall</span>
                    <b class="tf-sum-val" :style="{ color: tone(cur.rollup.overall_avg) }">{{ fmt(cur.rollup.overall_avg) }}<i>/{{ cur.rating_max }}</i></b>
                  </div>
                  <div class="tf-sum-card">
                    <span class="tf-sum-lab">Response rate</span>
                    <b class="tf-sum-val">{{ Math.round(cur.rollup.response_rate || 0) }}<i>%</i></b>
                    <span class="tf-sum-sub">{{ cur.rollup.submitted }}/{{ cur.rollup.invited }} submitted</span>
                  </div>
                  <div class="tf-sum-card">
                    <span class="tf-sum-lab">Raters</span>
                    <b class="tf-sum-val">{{ cur.responses.length }}</b>
                    <span class="tf-sum-sub">{{ cur.anonymous ? 'peers anonymized' : 'named' }}</span>
                  </div>
                </div>

                <!-- per-competency averages -->
                <div v-if="(cur.rollup.by_competency || []).length" class="tf-zone"><BarChart3 :size="12" /> By competency</div>
                <div v-if="(cur.rollup.by_competency || []).length" class="tf-comps">
                  <div v-for="c in cur.rollup.by_competency" :key="c.key" class="tf-comp">
                    <span class="tf-comp-lab">{{ c.label }}</span>
                    <span class="tf-comp-track"><i :style="{ width: ((c.avg || 0) / cur.rating_max * 100) + '%', background: tone(c.avg) }" /></span>
                    <span class="tf-comp-val" :style="{ color: tone(c.avg) }">{{ fmt(c.avg) }}</span>
                  </div>
                </div>

                <!-- SELF response — the employee's own self-assessment (always shown to the manager) -->
                <div class="tf-zone gold"><UserCheck :size="12" /> What {{ firstName }} said about themselves</div>
                <div v-if="cur.self_response" class="tf-self">
                  <div v-if="selfRatings.length" class="tf-self-ratings">
                    <span v-for="r in selfRatings" :key="r.key" class="tf-self-pip" :style="{ '--c': tone(r.rating) }">
                      {{ r.label }} <b>{{ r.rating ?? '—' }}</b>
                    </span>
                  </div>
                  <div class="tf-texts">
                    <div v-if="cur.self_response.strengths" class="tf-text"><em>Strengths</em><p>{{ cur.self_response.strengths }}</p></div>
                    <div v-if="cur.self_response.improvements" class="tf-text"><em>Areas to improve</em><p>{{ cur.self_response.improvements }}</p></div>
                    <div v-if="cur.self_response.comments" class="tf-text"><em>Comments</em><p>{{ cur.self_response.comments }}</p></div>
                    <p v-if="!cur.self_response.strengths && !cur.self_response.improvements && !cur.self_response.comments" class="tf-muted">Rated only — no written notes.</p>
                  </div>
                </div>
                <p v-else class="tf-muted box">{{ firstName }} hasn't submitted a self-assessment for this cycle yet.</p>

                <!-- other raters -->
                <div v-if="otherResponses.length" class="tf-zone"><Users :size="12" /> From raters</div>
                <div v-for="(r, i) in otherResponses" :key="i" class="tf-rater">
                  <div class="tf-rater-head">
                    <span class="tf-rater-rel" :style="{ '--rc': relColor(r.relationship_type) }">{{ relLabel(r.relationship_type) }}</span>
                    <b>{{ r.reviewer_name }}</b>
                    <span v-if="r.overall_rating != null" class="tf-rater-score" :style="{ color: tone(r.overall_rating) }">{{ fmt(r.overall_rating) }}/{{ cur.rating_max }}</span>
                  </div>
                  <div class="tf-texts">
                    <div v-if="r.strengths" class="tf-text"><em>Strengths</em><p>{{ r.strengths }}</p></div>
                    <div v-if="r.improvements" class="tf-text"><em>Areas to improve</em><p>{{ r.improvements }}</p></div>
                    <div v-if="r.comments" class="tf-text"><em>Comments</em><p>{{ r.comments }}</p></div>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <footer class="tf-foot">
            <span class="tf-foot-note"><Eye :size="12" /> Read-only · peer responses respect the request's anonymity</span>
            <button class="perf-btn perf-btn-primary" type="button" @click="$emit('close')"><Check :size="13" /> Done</button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Loader2, Orbit, UserCheck, Users, BarChart3, Eye, Check } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchTeamFeedback, feedbackRelMeta, scoreTone } from '@/composables/usePerformance'

const props = defineProps({ open: Boolean, employee: { type: Object, default: null } })
defineEmits(['close'])
const toast = useToast()

const loading = ref(false)
const items = ref([])
const active = ref(0)
const empName = ref('')
const empRole = ref('')

const cur = computed(() => items.value[active.value] || null)
const firstName = computed(() => (empName.value || 'They').split(/\s+/)[0])
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const relLabel = (k) => feedbackRelMeta(k).label
const relColor = (k) => feedbackRelMeta(k).color
const fmt = (v) => v == null ? '—' : Number(v).toFixed(1)
const tone = (v) => scoreTone(v, cur.value?.rating_max || 5)

// the employee's self ratings, aligned to the request's competency list
const selfRatings = computed(() => {
  if (!cur.value?.self_response) return []
  const by = {}
  for (const r of (cur.value.self_response.ratings || [])) by[r.key] = r.rating
  return (cur.value.competencies || []).map(c => ({ key: c.key, label: c.label, rating: by[c.key] ?? null }))
})
const otherResponses = computed(() => (cur.value?.responses || []).filter(r => (r.relationship_type || '').toUpperCase() !== 'SELF'))

async function load() {
  if (!props.employee?.employee_id) return
  loading.value = true; items.value = []; active.value = 0
  try {
    const d = await fetchTeamFeedback(props.employee.employee_id)
    items.value = d.items || []
    empName.value = d.employee_name || props.employee.employee_name || ''
    empRole.value = [d.designation_name, d.department_name].filter(Boolean).join(' · ')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load feedback') }
  finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) load() })
</script>

<style scoped>
.tf-ov { position: fixed; inset: 0; z-index: 1320; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5,5,6,0.64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.tf { position: relative; width: 100%; max-width: 660px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 44px 100px -42px rgba(0,0,0,0.88); }
.tf-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--perf-grad-hero); }
.tf-head { display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.tf-av { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; font-size: 14px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.tf-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tf-titles b { font-size: 15.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tf-titles span { font-size: 11.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tf-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.tf-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.tf-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 13px; }
.tf-load { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 50px; color: var(--perf-text-muted); font-size: 13px; }
.tf-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; }
.tf-empty-ic { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.tf-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); }
.tf-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 42ch; line-height: 1.5; }

.tf-cycles { display: flex; flex-wrap: wrap; gap: 7px; }
.tf-cycle { font: inherit; font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 9px; cursor: pointer; color: var(--perf-text-muted); background: var(--perf-panel); border: 1px solid var(--perf-border); transition: all 0.2s; }
.tf-cycle.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); }

.tf-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tf-sum-card { display: flex; flex-direction: column; gap: 2px; padding: 12px 13px; border-radius: 13px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.tf-sum-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }
.tf-sum-val { font-size: 22px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
.tf-sum-val i { font-size: 11px; font-style: normal; font-weight: 600; color: var(--perf-text-muted); }
.tf-sum-sub { font-size: 10px; color: var(--perf-text-dim); }

.tf-zone { display: flex; align-items: center; gap: 7px; margin-top: 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.tf-zone :deep(svg) { color: var(--perf-text-dim); }
.tf-zone.gold { color: var(--perf-gold); }
.tf-zone.gold :deep(svg) { color: var(--perf-gold); }

.tf-comps { display: flex; flex-direction: column; gap: 8px; }
.tf-comp { display: flex; align-items: center; gap: 11px; }
.tf-comp-lab { flex: 0 0 150px; min-width: 0; font-size: 12px; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tf-comp-track { flex: 1; height: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.tf-comp-track i { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--perf-spring); }
.tf-comp-val { flex-shrink: 0; min-width: 30px; text-align: right; font-size: 13px; font-weight: 850; font-variant-numeric: tabular-nums; }

.tf-self { padding: 14px 15px; border-radius: 14px; background: linear-gradient(135deg, color-mix(in srgb, var(--perf-gold) 9%, var(--perf-surface)), var(--perf-surface)); border: 1px solid var(--perf-border-warm); display: flex; flex-direction: column; gap: 11px; }
.tf-self-ratings { display: flex; flex-wrap: wrap; gap: 7px; }
.tf-self-pip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; padding: 4px 10px; border-radius: 999px; color: var(--perf-text-secondary); background: var(--perf-panel); border: 1px solid var(--perf-border); }
.tf-self-pip b { color: var(--c); font-weight: 850; font-variant-numeric: tabular-nums; }

.tf-rater { padding: 12px 14px; border-radius: 13px; background: var(--perf-surface); border: 1px solid var(--perf-border); display: flex; flex-direction: column; gap: 9px; }
.tf-rater-head { display: flex; align-items: center; gap: 9px; }
.tf-rater-rel { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; color: var(--rc); background: color-mix(in srgb, var(--rc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--rc) 28%, transparent); }
.tf-rater-head b { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 750; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tf-rater-score { flex-shrink: 0; font-size: 13px; font-weight: 850; font-variant-numeric: tabular-nums; }

.tf-texts { display: flex; flex-direction: column; gap: 8px; }
.tf-text em { display: block; font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-dim); margin-bottom: 2px; }
.tf-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-secondary); white-space: pre-wrap; }
.tf-muted { margin: 0; font-size: 12px; color: var(--perf-text-muted); font-style: italic; }
.tf-muted.box { padding: 13px 14px; border-radius: 13px; background: var(--perf-panel); border: 1px dashed var(--perf-border-strong); }

.tf-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 18px; border-top: 1px solid var(--perf-border); flex-wrap: wrap; }
.tf-foot-note { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--perf-text-muted); }
.tf-foot-note :deep(svg) { color: var(--perf-text-dim); }

@media (max-width: 560px) { .tf-summary { grid-template-columns: 1fr; } .tf-comp-lab { flex-basis: 100px; } }
@media (prefers-reduced-motion: reduce) { .tf-x:hover { transform: none; } .tf-comp-track i { transition: none; } }
</style>
