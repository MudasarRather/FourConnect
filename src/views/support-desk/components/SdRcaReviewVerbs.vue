<template>
  <div class="rcv">
    <!-- review verbs render ONLY once capabilities have settled AND the filing is
         reviewable — fail-closed, absent from the DOM until then (SdIncVerbRail precedent) -->
    <template v-if="reviewable">
      <Motion as="button" type="button" class="rcv-btn validate" :disabled="busy || blockValidate"
        :title="blockValidate ? 'Your own filing needs a second pair of eyes' : 'Validate this filing'"
        :while-hover="busy || blockValidate ? undefined : { y: -1 }" :while-tap="busy || blockValidate ? undefined : { scale: 0.94 }"
        @click="act('validate')">
        <Loader v-if="busy && acting === 'validate'" :size="12" class="rcv-spin" /><Check v-else :size="12" />
        VALIDATE
      </Motion>
      <Motion as="button" type="button" class="rcv-btn return" :disabled="busy"
        title="Return to its author with a note"
        :while-hover="busy ? undefined : { y: -1 }" :while-tap="busy ? undefined : { scale: 0.94 }"
        @click="act('return')">
        <Loader v-if="busy && acting === 'return'" :size="12" class="rcv-spin" /><CornerUpLeft v-else :size="12" />
        RETURN
      </Motion>
    </template>

    <!-- OPEN is always on offer -->
    <Motion as="button" type="button" class="rcv-btn open" title="Open the record"
      :while-hover="{ y: -1 }" :while-tap="{ scale: 0.94 }" @click="$emit('open')">
      <ArrowUpRight :size="12" /> OPEN
    </Motion>
  </div>
</template>

<script setup>
/*
  SdRcaReviewVerbs — the admin docket row's verb cluster, fail-closed. VALIDATE
  and RETURN are absent from the DOM until capabilities settle (capsReady) AND
  the caller holds review rights AND the row is actually 'filed' — never render
  a verb the backend will 403/409. Four-eyes: a reviewer can't validate their
  own filing (the button stays visible but dead, so the rule is legible) — EXCEPT
  a superuser (canSelfValidate), whom the backend lets break ties on one-person
  teams; a return of one's own work is always allowed. OPEN always renders.
*/
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Check, CornerUpLeft, ArrowUpRight, Loader } from 'lucide-vue-next'

const props = defineProps({
  row: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  capsReady: { type: Boolean, default: false },
  canReview: { type: Boolean, default: false },
  meId: { type: String, default: '' },
  // Superusers are exempt from the four-eyes rule (backend `validate_rca` allows
  // self-validation for is_superuser — the one-person-team tie-breaker). Default
  // false = fail-closed: a plain lead reviewing their own filing stays blocked.
  canSelfValidate: { type: Boolean, default: false },
})
const emit = defineEmits(['validate', 'return', 'open'])

const reviewable = computed(() =>
  props.capsReady && props.canReview && props.row?.rca_status === 'filed')

/* four-eyes: own filing → validate is disabled UNLESS the caller may self-validate
   (superuser). Return stays live for everyone (no four-eyes on return server-side). */
const ownFiling = computed(() =>
  !!props.meId && String(props.row?.rca_filed_by_id) === String(props.meId))
const blockValidate = computed(() => ownFiling.value && !props.canSelfValidate)

/* remember which verb is in flight so the spinner lands on the acting button */
const acting = ref('')
const act = (verb) => {
  if (props.busy) return
  acting.value = verb
  emit(verb)
}
watch(() => props.busy, (v) => { if (!v) acting.value = '' })
</script>

<style scoped>
.rcv { display: inline-flex; align-items: center; gap: 6px; }

.rcv-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer;
  font-family: var(--sd-mono, monospace); white-space: nowrap;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary);
  transition: border-color 0.16s, color 0.16s, background 0.16s; }
.rcv-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* VALIDATE — settle emerald */
.rcv-btn.validate { color: var(--sd-rcg-settle);
  border-color: color-mix(in srgb, var(--sd-rcg-settle) 40%, transparent); background: var(--sd-rcg-settle-soft); }
.rcv-btn.validate:hover:not(:disabled) { border-color: var(--sd-rcg-settle);
  background: color-mix(in srgb, var(--sd-rcg-settle) 20%, transparent); }

/* RETURN — bounce red */
.rcv-btn.return { color: var(--sd-rcg-bounce);
  border-color: color-mix(in srgb, var(--sd-rcg-bounce) 40%, transparent); background: var(--sd-rcg-bounce-soft); }
.rcv-btn.return:hover:not(:disabled) { border-color: var(--sd-rcg-bounce);
  background: color-mix(in srgb, var(--sd-rcg-bounce) 18%, transparent); }

/* OPEN — ghost */
.rcv-btn.open:hover { color: var(--sd-rcg-core); border-color: var(--sd-rcg-core); background: var(--sd-rcg-soft); }

.rcv-spin { animation: rcv-rot 0.9s linear infinite; }
@keyframes rcv-rot { to { transform: rotate(360deg); } }

[data-theme="light"] .rcv-btn { background: var(--sd-surface, transparent); }
[data-theme="light"] .rcv-btn.validate { background: var(--sd-rcg-settle-soft); }
[data-theme="light"] .rcv-btn.return { background: var(--sd-rcg-bounce-soft); }
</style>
