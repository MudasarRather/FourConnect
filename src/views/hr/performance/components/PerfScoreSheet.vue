<template>
  <div class="psh">
    <!-- live overall -->
    <div v-if="showOverall" class="psh-overall">
      <div class="psh-ov" :class="{ on: role !== 'view' || selfOverall != null }">
        <span class="psh-ov-lab"><PencilRuler :size="11" /> Self</span>
        <span class="psh-ov-val" :style="{ color: tone(selfOverall) }">{{ fmt(selfOverall) }}<i>/{{ ratingMax }}</i></span>
      </div>
      <div class="psh-ov" :class="{ on: managerOverall != null }">
        <span class="psh-ov-lab"><UserCheck :size="11" /> Manager</span>
        <span class="psh-ov-val" :style="{ color: tone(managerOverall) }">{{ fmt(managerOverall) }}<i>/{{ ratingMax }}</i></span>
      </div>
    </div>

    <!-- sections -->
    <div class="psh-secs">
      <div v-for="(s, i) in draft.sections" :key="s.key || i" class="psh-sec" :style="{ '--c': typeColor(s.section_type) }">
        <div class="psh-sec-head">
          <span class="psh-sec-idx">{{ i + 1 }}</span>
          <div class="psh-sec-titles">
            <b>{{ s.title }}</b>
            <span class="psh-sec-sub">{{ s.section_type }} · weight {{ s.weight }}%</span>
          </div>
        </div>
        <ul v-if="s.criteria && s.criteria.length" class="psh-crit">
          <li v-for="(c, ci) in s.criteria" :key="ci">{{ c }}</li>
        </ul>

        <!-- rating selector (editable) -->
        <div v-if="role !== 'view'" class="psh-rate">
          <span class="psh-rate-lab">{{ editLabel }}</span>
          <div class="psh-pips">
            <button v-for="n in ratingMax" :key="n" type="button" class="psh-pip"
              :class="{ on: curRating(s) >= n, exact: curRating(s) === n }"
              :title="ratingLabel(ratingLabels, n)" @click="setRating(s, n)">{{ n }}</button>
          </div>
          <span class="psh-rate-cur">{{ curRating(s) != null ? ratingLabel(ratingLabels, curRating(s)) : '—' }}</span>
        </div>

        <!-- read-only ratings (completed / locked) -->
        <div v-else class="psh-rv">
          <span class="psh-rv-chip">
            <span class="psh-rv-k"><UserCheck :size="11" /> Manager</span>
            <b :style="{ color: tone(s.manager_rating) }">{{ s.manager_rating ?? '—' }}<i>/{{ ratingMax }}</i></b>
            <em v-if="s.manager_rating != null">{{ ratingLabel(ratingLabels, s.manager_rating) }}</em>
          </span>
          <span v-if="s.self_rating != null" class="psh-rv-chip ghost">
            <span class="psh-rv-k"><PencilRuler :size="11" /> Self</span>
            <b>{{ s.self_rating }}<i>/{{ ratingMax }}</i></b>
          </span>
          <!-- animated score meter: manager fill + self marker -->
          <div v-if="s.manager_rating != null || s.self_rating != null" class="psh-meter" :title="`Manager ${s.manager_rating ?? '—'} · Self ${s.self_rating ?? '—'} of ${ratingMax}`">
            <span class="psh-meter-fill" :style="{ width: pct(s.manager_rating) }" />
            <span v-if="s.self_rating != null" class="psh-meter-mark" :style="{ left: pct(s.self_rating) }" />
          </div>
        </div>

        <!-- counterpart rating (manager editing: their report's self context) -->
        <div v-if="showOther(s)" class="psh-other">
          <PencilRuler :size="11" />
          Self: <b>{{ otherRating(s) }}/{{ ratingMax }}</b>
          <em v-if="otherComment(s)">“{{ otherComment(s) }}”</em>
        </div>

        <!-- suggestion baseline + justification requirement (manager) -->
        <div v-if="role === 'manager' && baselineFor(s) != null" class="psh-sugg" :class="{ up: isBumped(s) }">
          <component :is="isBumped(s) ? TrendingUp : Sparkles" :size="11" />
          <span>Suggested <b>{{ baselineFor(s) }}/{{ ratingMax }}</b><template v-if="isBumped(s)"> · you raised it to {{ s.manager_rating }} — <em>reason required</em></template></span>
        </div>

        <!-- comment / justification -->
        <textarea v-if="role !== 'view'" class="psh-cmt" :class="{ required: needsReason(s) }" rows="1"
          :placeholder="isBumped(s) ? `Why did you raise this above the suggested ${baselineFor(s)}? (required)` : `${editLabel} note (optional)`"
          :value="curComment(s)" @input="setComment(s, $event.target.value)" />
        <div v-else class="psh-view-cmts">
          <p v-if="s.self_comment"><b>Self:</b> {{ s.self_comment }}</p>
          <p v-if="s.manager_comment"><b>Manager:</b> {{ s.manager_comment }}</p>
        </div>
      </div>
    </div>

    <!-- overall narrative -->
    <div class="psh-narr">
      <label class="psh-narr-lab"><MessageSquare :size="12" /> {{ role === 'manager' ? 'Manager summary' : role === 'self' ? 'Your summary' : 'Summary' }}</label>
      <textarea v-if="role === 'self'" rows="2" placeholder="Overall reflection on the period…" :value="draft.self_comments || ''" @input="draft.self_comments = $event.target.value" />
      <textarea v-else-if="role === 'manager'" rows="2" placeholder="Overall manager assessment…" :value="draft.manager_comments || ''" @input="draft.manager_comments = $event.target.value" />
      <template v-else>
        <p v-if="draft.self_comments" class="psh-view-cmts"><b>Self:</b> {{ draft.self_comments }}</p>
        <p v-if="draft.manager_comments" class="psh-view-cmts"><b>Manager:</b> {{ draft.manager_comments }}</p>
        <p v-if="!draft.self_comments && !draft.manager_comments" class="psh-empty">No narrative recorded.</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PencilRuler, UserCheck, MessageSquare, Sparkles, TrendingUp } from 'lucide-vue-next'
import { ratingLabel, scoreTone } from '@/composables/usePerformance'
import { typeColor } from '@/views/hr/settings/composables/appraisalVocab'

const props = defineProps({
  draft: { type: Object, required: true },     // { sections, self_comments, manager_comments }
  role: { type: String, default: 'view' },     // self | manager | view
  ratingMax: { type: Number, default: 5 },
  ratingLabels: { type: Array, default: () => [] },
  showOverall: { type: Boolean, default: true },
  suggestions: { type: Array, default: () => [] }, // [{ key, suggested_rating, basis }]
})

const rfield = computed(() => props.role === 'manager' ? 'manager_rating' : 'self_rating')
const cfield = computed(() => props.role === 'manager' ? 'manager_comment' : 'self_comment')
const editLabel = computed(() => props.role === 'manager' ? 'Manager rating' : props.role === 'self' ? 'Self rating' : 'Rating')

const curRating = (s) => s[rfield.value] ?? null
const setRating = (s, n) => { if (props.role === 'view') return; s[rfield.value] = (s[rfield.value] === n ? null : n) }
const curComment = (s) => s[cfield.value] || ''
const setComment = (s, v) => { s[cfield.value] = v }

const showOther = (s) => props.role === 'manager' && s.self_rating != null
const otherField = computed(() => props.role === 'manager' ? 'self_rating' : 'manager_rating')
const otherRating = (s) => s[otherField.value] ?? '—'
const otherComment = (s) => props.role === 'manager' ? s.self_comment : s.manager_comment

const weighted = (field) => {
  let num = 0, den = 0, flat = []
  for (const s of props.draft.sections || []) {
    const r = s[field]
    if (r == null) continue
    const w = Number(s.weight) || 0
    flat.push(Number(r)); num += w * Number(r); den += w
  }
  if (den > 0) return Math.round((num / den) * 100) / 100
  if (flat.length) return Math.round((flat.reduce((a, b) => a + b, 0) / flat.length) * 100) / 100
  return null
}
const selfOverall = computed(() => weighted('self_rating'))
const managerOverall = computed(() => weighted('manager_rating'))
const fmt = (v) => v == null ? '—' : v
const tone = (v) => scoreTone(v, props.ratingMax)
const pct = (v) => v == null ? '0%' : Math.max(0, Math.min(100, (Number(v) / props.ratingMax) * 100)) + '%'

// suggestion baseline = the pre-filled (rounded) suggested rating. A manager who rates
// ABOVE that baseline must justify it in the section note (governance control).
const suggBase = computed(() => {
  const m = {}
  for (const s of props.suggestions || []) {
    if (s && s.key != null && s.suggested_rating != null) m[s.key] = Math.round(Number(s.suggested_rating))
  }
  return m
})
const baselineFor = (s) => (s.key in suggBase.value ? suggBase.value[s.key] : null)
const isBumped = (s) => props.role === 'manager' && baselineFor(s) != null && s.manager_rating != null && s.manager_rating > baselineFor(s)
const needsReason = (s) => isBumped(s) && !((s.manager_comment || '').trim())
</script>

<style scoped>
.psh { display: flex; flex-direction: column; gap: 13px; }
.psh-overall { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.psh-ov { display: flex; flex-direction: column; gap: 3px; padding: 10px 13px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); opacity: 0.55; transition: opacity 0.3s; }
.psh-ov.on { opacity: 1; }
.psh-ov-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.psh-ov-lab :deep(svg) { color: var(--perf-text-dim); }
.psh-ov-val { font-size: 22px; font-weight: 850; font-variant-numeric: tabular-nums; line-height: 1; }
.psh-ov-val i { font-size: 12px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }

.psh-secs { display: flex; flex-direction: column; gap: 9px; }
.psh-sec { position: relative; padding: 12px 13px 12px 15px; border-radius: 13px; background: var(--perf-surface); border: 1px solid var(--perf-border);
  border-left: 3px solid var(--c); display: flex; flex-direction: column; gap: 9px;
  animation: psh-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards; transition: border-color 0.22s, box-shadow 0.22s; }
.psh-sec:nth-child(1) { animation-delay: 0.04s } .psh-sec:nth-child(2) { animation-delay: 0.1s } .psh-sec:nth-child(3) { animation-delay: 0.16s }
.psh-sec:nth-child(4) { animation-delay: 0.22s } .psh-sec:nth-child(n+5) { animation-delay: 0.28s }
.psh-sec:hover { border-color: color-mix(in srgb, var(--c) 38%, var(--perf-border)); box-shadow: 0 10px 26px -20px color-mix(in srgb, var(--c) 70%, transparent); }
@keyframes psh-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .psh-sec { animation: none; } }
.psh-sec-head { display: flex; align-items: center; gap: 10px; }
.psh-sec-idx { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; flex-shrink: 0; font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.psh-sec-titles { min-width: 0; display: flex; flex-direction: column; }
.psh-sec-titles b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.psh-sec-sub { font-size: 10px; color: var(--perf-text-dim); text-transform: uppercase; letter-spacing: 0.03em; }
.psh-crit { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 2px; }
.psh-crit li { font-size: 11px; color: var(--perf-text-muted); line-height: 1.4; }

.psh-rate { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.psh-rate-lab { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); min-width: 78px; }
.psh-pips { display: inline-flex; gap: 4px; }
.psh-pip { width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 800;
  color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.16s var(--perf-spring); font-variant-numeric: tabular-nums; }
.psh-pip:hover:not(:disabled) { color: var(--perf-text); transform: translateY(-1px); }
.psh-pip.on { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.psh-pip.exact { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 40%, transparent); }
.psh-pip:disabled { cursor: default; }
.psh-rate-cur { font-size: 11px; font-weight: 650; color: var(--perf-text-secondary); }

.psh-rv { display: flex; flex-wrap: wrap; gap: 8px; }
.psh-rv-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 10px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.psh-rv-chip.ghost { opacity: 0.85; }
.psh-rv-k { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--perf-text-muted); }
.psh-rv-k :deep(svg) { color: var(--perf-text-dim); }
.psh-rv-chip b { font-size: 15px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.psh-rv-chip b i { font-size: 9px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.psh-rv-chip em { font-size: 10.5px; font-style: normal; font-weight: 700; color: var(--perf-text-secondary); }
.psh-meter { position: relative; flex-basis: 100%; height: 7px; border-radius: 999px; background: var(--perf-track); margin-top: 2px; }
.psh-meter-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; background: var(--c); box-shadow: 0 0 10px -2px var(--c); animation: psh-meter-grow 0.8s var(--perf-spring) 0.15s both; }
@keyframes psh-meter-grow { from { width: 0; } }
.psh-meter-mark { position: absolute; top: 50%; width: 3px; height: 14px; margin-top: -7px; margin-left: -1.5px; border-radius: 2px; background: var(--perf-text-secondary); box-shadow: 0 0 5px color-mix(in srgb, var(--perf-text) 50%, transparent); }
@media (prefers-reduced-motion: reduce) { .psh-meter-fill { animation: none; } }

.psh-other { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--perf-text-muted); }
.psh-other :deep(svg) { color: var(--perf-text-dim); }
.psh-other b { color: var(--perf-text-secondary); }
.psh-other em { font-style: italic; color: var(--perf-text-dim); }

.psh-sugg { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); }
.psh-sugg :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; }
.psh-sugg b { color: var(--perf-text-secondary); font-weight: 800; }
.psh-sugg.up { color: var(--perf-orange); }
.psh-sugg.up :deep(svg) { color: var(--perf-orange); }
.psh-sugg.up b { color: var(--perf-orange); }
.psh-sugg.up em { font-style: normal; font-weight: 800; color: var(--perf-conflict); }

.psh-cmt { width: 100%; resize: vertical; min-height: 36px; padding: 8px 10px; border-radius: 9px; font: inherit; font-size: 12px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, box-shadow 0.2s; }
.psh-cmt:focus { outline: none; border-color: var(--perf-border-warm); }
.psh-cmt.required { border-color: var(--perf-conflict); box-shadow: 0 0 0 3px var(--perf-conflict-soft); }
.psh-cmt.required:focus { border-color: var(--perf-conflict); }
.psh-view-cmts { margin: 0; font-size: 12px; color: var(--perf-text-secondary); line-height: 1.5; }
.psh-view-cmts b { color: var(--perf-text); }

.psh-narr { display: flex; flex-direction: column; gap: 6px; }
.psh-narr-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--perf-text-secondary); }
.psh-narr-lab :deep(svg) { color: var(--perf-gold); }
.psh-narr textarea { width: 100%; resize: vertical; min-height: 52px; padding: 9px 11px; border-radius: 10px; font: inherit; font-size: 12.5px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.psh-narr textarea:focus { outline: none; border-color: var(--perf-border-warm); }
.psh-empty { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }
</style>
