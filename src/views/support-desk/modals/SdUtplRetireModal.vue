<template>
  <SdModalShell :open="open" :eyebrow="mode === 'erase' ? 'ERASE TAPE · PERMANENT' : 'RETIRE TAPE'"
    :title="t ? `Retire “${t.name}”` : 'Retire tape'" width="560px" @close="$emit('close')">
    <div v-if="t" class="rt" :class="mode">
      <!-- usage friction strip -->
      <div class="rt-usage sd-mono">
        <span class="rt-plays" :class="{ hot: plays > 0 }"><Zap :size="12" /> {{ plays }} recorded play{{ plays === 1 ? '' : 's' }}</span>
        <span class="rt-dot" />
        <span class="rt-scope"><Lock :size="11" /> personal tape</span>
        <span class="rt-dot" />
        <span class="rt-ver">v{{ t.version || 1 }}</span>
      </div>

      <!-- decision — two morphing paths -->
      <div class="rt-paths">
        <button type="button" class="rt-path" :class="{ on: mode === 'shelve' }" @click="setMode('shelve')">
          <span class="rt-path-ic shelve"><Archive :size="17" /></span>
          <span class="rt-path-b">
            <b>Shelve it</b>
            <i>Pulled from your rack — history kept, restore any time.</i>
          </span>
          <span class="rt-radio" aria-hidden="true" />
        </button>
        <button type="button" class="rt-path erase" :class="{ on: mode === 'erase' }" @click="setMode('erase')">
          <span class="rt-path-ic erase"><Trash2 :size="17" /></span>
          <span class="rt-path-b">
            <b>Erase it</b>
            <i>Removed from the exchange for good. The audit trail keeps the record.</i>
          </span>
          <span class="rt-radio" aria-hidden="true" />
        </button>
      </div>

      <!-- reason reel — required, re-keyed per mode so it re-animates -->
      <div class="rt-field">
        <span class="rt-lb sd-mono">WHY <b class="req">*</b> <i class="rt-hint">stamped onto the audit trail</i></span>
        <Presence mode="wait">
          <Motion :key="mode" class="rt-reasons"
            :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -4 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }">
            <Motion v-for="(r, i) in reasons" :key="r" as="button" type="button"
              class="rt-reason" :class="{ on: reason === r }"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.3, delay: 0.03 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
              :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
              @click="reason = r">{{ r }}</Motion>
          </Motion>
        </Presence>
      </div>

      <!-- optional note -->
      <label class="rt-field">
        <span class="rt-lb sd-mono">NOTE <i class="rt-hint">optional — extra context for the record</i></span>
        <textarea v-model.trim="note" rows="2" maxlength="280" class="rt-note"
          placeholder="Anything the audit log should remember about this retirement…" />
      </label>

      <!-- consequence panel — morphs with the chosen path -->
      <Motion class="rt-consequence" :class="mode"
        :animate="{ opacity: 1 }" :initial="{ opacity: 0 }" :transition="{ duration: 0.2 }">
        <component :is="mode === 'erase' ? ShieldAlert : History" :size="15" class="rt-cq-ic" />
        <p v-if="mode === 'shelve'">
          <b>Reversible.</b> “{{ t.name }}” moves to <b>Boxed</b> — it stops appearing in your working
          set but every play it produced keeps its provenance. Restore it from the <b>Archived</b> lens whenever.
        </p>
        <p v-else>
          <b>Permanent.</b> “{{ t.name }}” leaves the exchange and can’t be recovered.
          <template v-if="plays > 0"> Its <b>{{ plays }}</b> recorded play{{ plays === 1 ? '' : 's' }}
            and the tickets it produced stay intact — only the tape is gone.</template>
        </p>
      </Motion>

      <!-- type-to-confirm — erase only -->
      <Presence>
        <Motion v-if="mode === 'erase'" class="rt-field rt-confirm"
          :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
          :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">
          <span class="rt-lb sd-mono">TYPE THE TAPE NAME TO CONFIRM <b class="req">*</b></span>
          <input v-model="typed" class="rt-in" :class="{ ok: nameMatches }" :placeholder="t.name"
            autocomplete="off" spellcheck="false" @keydown.enter.prevent="canSubmit && submit()" />
          <span v-if="typed && !nameMatches" class="rt-mismatch sd-mono">Doesn’t match — type “{{ t.name }}” exactly.</span>
        </Motion>
      </Presence>
    </div>

    <template #footer>
      <button type="button" class="rt-btn ghost" @click="$emit('close')">Cancel</button>
      <span class="rt-gap" />
      <Motion v-if="mode === 'shelve'" as="button" type="button" class="rt-btn box"
        :while-hover="canSubmit ? { y: -2, scale: 1.02 } : {}" :while-tap="canSubmit ? { scale: 0.97 } : {}"
        :disabled="!canSubmit || busy" @click="submit">
        <LoaderCircle v-if="busy" :size="14" class="rt-spin" /><Archive v-else :size="14" /> Shelve the tape
      </Motion>
      <Motion v-else as="button" type="button" class="rt-btn danger"
        :while-hover="canSubmit ? { y: -2, scale: 1.02 } : {}" :while-tap="canSubmit ? { scale: 0.97 } : {}"
        :disabled="!canSubmit || busy" @click="submit">
        <LoaderCircle v-if="busy" :size="14" class="rt-spin" /><Trash2 v-else :size="14" /> Erase permanently
      </Motion>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdUtplRetireModal — the Cassette Exchange's reasoned retirement bench. Two
   morphing paths: SHELVE (archive, reversible) vs ERASE (soft-delete, permanent).
   A required WHY reason reel (re-keyed per path so it re-animates), an optional
   audit note, a live consequence panel, and — for erase — a type-the-name gate.
   Emits archive/delete with { reason, note } so the section can forward them to
   the backend audit trail. Never uses confirm(). */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Archive, Trash2, Zap, Lock, History, ShieldAlert, LoaderCircle } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  t: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'archive', 'delete'])

const SHELVE_REASONS = ['Seasonal — bring it back later', 'Superseded by a newer tape', 'Needs a re-record', 'Rarely used', 'Paused for review']
const ERASE_REASONS = ['Created by mistake', 'Duplicate of another tape', 'Obsolete — no longer relevant', 'Contains an error', 'Consolidated into another tape']

const mode = ref('shelve')
const reason = ref('')
const note = ref('')
const typed = ref('')

const plays = computed(() => props.t?.usage_count || 0)
const reasons = computed(() => (mode.value === 'erase' ? ERASE_REASONS : SHELVE_REASONS))
const nameMatches = computed(() => typed.value.trim().toLowerCase() === (props.t?.name || '').trim().toLowerCase())
const canSubmit = computed(() => !!reason.value && (mode.value === 'shelve' || nameMatches.value))

const setMode = (m) => { if (m === mode.value) return; mode.value = m; reason.value = ''; typed.value = '' }

watch(() => props.open, (o) => {
  if (o) { mode.value = 'shelve'; reason.value = ''; note.value = ''; typed.value = '' }
})

const submit = () => {
  if (!canSubmit.value || props.busy) return
  const payload = { reason: reason.value, note: note.value || null }
  emit(mode.value === 'erase' ? 'delete' : 'archive', payload)
}
</script>

<style scoped>
.rt { display: flex; flex-direction: column; gap: 14px; }

/* usage friction strip */
.rt-usage {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  font-size: 10px; letter-spacing: 0.06em; color: var(--sd-text-muted);
  padding: 9px 13px; border-radius: 11px;
  background: var(--sd-utpl-soft); border: 1px solid var(--sd-utpl-brd);
}
.rt-usage span { display: inline-flex; align-items: center; gap: 5px; }
.rt-plays.hot { color: var(--sd-utpl-hi); font-weight: 700; }
[data-theme="light"] .rt-plays.hot { color: var(--sd-utpl-core); }
.rt-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--sd-text-muted); opacity: 0.6; }
.rt-ver { font-variant-numeric: tabular-nums; }

/* decision paths */
.rt-paths { display: flex; flex-direction: column; gap: 9px; }
.rt-path {
  display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
  padding: 13px 14px; border-radius: 14px; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.24s var(--sd-spring), box-shadow 0.24s, background 0.24s, transform 0.2s var(--sd-spring);
}
.rt-path:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--sd-utpl-core) 40%, var(--sd-border-strong)); }
.rt-path.on { border-color: var(--sd-utpl-core); background: var(--sd-utpl-soft); box-shadow: 0 0 0 3px var(--sd-utpl-soft); }
.rt-path.erase:hover { border-color: color-mix(in srgb, var(--sd-utpl-risk) 45%, var(--sd-border-strong)); }
.rt-path.erase.on { border-color: var(--sd-utpl-risk); background: var(--sd-utpl-risk-soft); box-shadow: 0 0 0 3px var(--sd-utpl-risk-soft); }
.rt-path-ic { flex: 0 0 auto; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; }
.rt-path-ic.shelve { background: color-mix(in srgb, var(--sd-utpl-arch) 20%, transparent); color: var(--sd-utpl-arch); }
.rt-path-ic.erase { background: var(--sd-utpl-risk-soft); color: var(--sd-utpl-risk); }
.rt-path-b { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rt-path-b b { font-size: 13.5px; font-weight: 800; }
.rt-path-b i { font-style: normal; font-size: 11.5px; line-height: 1.45; color: var(--sd-text-muted); }
.rt-radio {
  flex: 0 0 auto; width: 17px; height: 17px; border-radius: 50%; border: 2px solid var(--sd-border-strong);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rt-path.on .rt-radio { border-color: var(--sd-utpl-core); box-shadow: inset 0 0 0 3.5px var(--sd-utpl-core); }
.rt-path.erase.on .rt-radio { border-color: var(--sd-utpl-risk); box-shadow: inset 0 0 0 3.5px var(--sd-utpl-risk); }

/* fields */
.rt-field { display: flex; flex-direction: column; gap: 8px; }
.rt-lb { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); display: flex; align-items: center; gap: 7px; }
.rt-lb .req { color: var(--sd-utpl-risk); }
.rt-hint { font-style: normal; text-transform: none; letter-spacing: 0.02em; opacity: 0.85; }

.rt-reasons { display: flex; flex-wrap: wrap; gap: 7px; }
.rt-reason {
  cursor: pointer; font-size: 11.5px; font-weight: 650; font-family: inherit;
  padding: 7px 12px; border-radius: 9px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.18s, color 0.18s, background 0.18s;
}
.rt-reason:hover { border-color: var(--sd-utpl-brd); color: var(--sd-text); }
.rt-reason.on { border-color: var(--sd-utpl-core); background: var(--sd-utpl-soft); color: var(--sd-utpl-hi); }
[data-theme="light"] .rt-reason.on { color: var(--sd-utpl-deep); }
.rt.erase .rt-reason.on { border-color: var(--sd-utpl-risk); background: var(--sd-utpl-risk-soft); color: var(--sd-utpl-risk); }

.rt-note, .rt-in {
  width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: vertical;
}
.rt-note:focus, .rt-in:focus { border-color: var(--sd-utpl-brd); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-core) 12%, transparent); }
.rt-in.ok { border-color: var(--sd-utpl-use); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-use) 16%, transparent); }
.rt-mismatch { font-size: 10px; color: var(--sd-utpl-risk); letter-spacing: 0.02em; }

/* consequence panel */
.rt-consequence {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: 13px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass);
}
.rt-consequence.shelve { border-color: color-mix(in srgb, var(--sd-utpl-arch) 40%, transparent); }
.rt-consequence.erase { border-color: color-mix(in srgb, var(--sd-utpl-risk) 40%, transparent); background: var(--sd-utpl-risk-soft); }
.rt-cq-ic { flex: 0 0 auto; margin-top: 2px; color: var(--sd-utpl-arch); }
.rt-consequence.erase .rt-cq-ic { color: var(--sd-utpl-risk); }
.rt-consequence p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--sd-text-secondary); }
.rt-consequence b { color: var(--sd-text); }
.rt-consequence.erase b { color: var(--sd-utpl-risk); }

.rt-confirm { overflow: hidden; }

/* footer buttons */
.rt-gap { flex: 1; }
.rt-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 10px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 800; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary);
}
.rt-btn.ghost { background: transparent; }
.rt-btn.box { color: var(--sd-utpl-arch); border-color: color-mix(in srgb, var(--sd-utpl-arch) 45%, transparent); background: color-mix(in srgb, var(--sd-utpl-arch) 12%, transparent); }
.rt-btn.danger { border: none; background: var(--sd-utpl-risk); color: #fff6ea; }
.rt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rt-spin { animation: rt-spin 1s linear infinite; }
@keyframes rt-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rt-spin { animation: none; }
}
</style>
