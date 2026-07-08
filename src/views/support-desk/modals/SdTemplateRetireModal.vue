<template>
  <SdModalShell :open="open" :eyebrow="mode === 'delete' ? 'DELETE PLATE · PERMANENT' : 'RETIRE PLATE'"
    :title="t ? `Retire “${t.name}”` : 'Retire template'" width="560px" @close="$emit('close')">
    <div v-if="t" class="trm" :class="mode">
      <!-- usage friction strip -->
      <div class="trm-usage sd-mono">
        <span class="trm-strikes" :class="{ hot: uses > 0 }"><Zap :size="12" /> struck {{ uses }} time{{ uses === 1 ? '' : 's' }}</span>
        <span class="trm-dot" />
        <span class="trm-vis"><component :is="visIcon" :size="11" /> {{ visLabel }}</span>
        <span class="trm-dot" />
        <span class="trm-ver">v{{ t.version || 1 }}</span>
      </div>

      <!-- decision — two morphing paths -->
      <div class="trm-paths">
        <button type="button" class="trm-opt" :class="{ on: mode === 'archive' }" @click="setMode('archive')">
          <span class="trm-opt-ic archive"><Archive :size="16" /></span>
          <span class="trm-opt-body">
            <b>Archive it</b>
            <i>Moves to the archive drawer — can't be struck, keeps its history, reactivate any time.</i>
          </span>
          <span class="trm-radio" aria-hidden="true" />
        </button>
        <button type="button" class="trm-opt danger" :class="{ on: mode === 'delete' }" @click="setMode('delete')">
          <span class="trm-opt-ic delete"><Trash2 :size="16" /></span>
          <span class="trm-opt-body">
            <b>Delete it</b>
            <i>Removes the plate from the studio entirely. The audit trail keeps the record.</i>
          </span>
          <span class="trm-radio" aria-hidden="true" />
        </button>
      </div>

      <!-- reason reel — required, re-keyed per mode -->
      <div class="trm-field">
        <span class="trm-lb sd-mono">WHY <b class="req">*</b> <i class="trm-hint">stamped onto the audit trail</i></span>
        <Presence mode="wait">
          <Motion :key="mode" class="trm-reasons"
            :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -4 }"
            :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }">
            <Motion v-for="(r, i) in reasons" :key="r" as="button" type="button"
              class="trm-reason" :class="{ on: reason === r }"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.3, delay: 0.03 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
              :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
              @click="reason = r">{{ r }}</Motion>
          </Motion>
        </Presence>
      </div>

      <!-- optional note -->
      <label class="trm-field">
        <span class="trm-lb sd-mono">NOTE <i class="trm-hint">optional — extra context for the record</i></span>
        <textarea v-model.trim="note" rows="2" maxlength="280" class="trm-note"
          placeholder="Anything the audit log should remember about this retirement…" />
      </label>

      <!-- consequence panel -->
      <Motion class="trm-consequence" :class="mode"
        :animate="{ opacity: 1 }" :initial="{ opacity: 0 }" :transition="{ duration: 0.2 }">
        <component :is="mode === 'delete' ? ShieldAlert : History" :size="15" class="trm-cq-ic" />
        <p v-if="mode === 'archive'">
          <b>Reversible.</b> “{{ t.name }}” moves to the <b>archive drawer</b> — it stops appearing in
          the working library but every ticket it struck keeps its provenance. Reactivate any time.
        </p>
        <p v-else>
          <b>Permanent.</b> “{{ t.name }}” leaves the studio and can’t be recovered.
          <template v-if="uses > 0"> The <b>{{ uses }}</b> ticket{{ uses === 1 ? '' : 's' }}
            it produced keep their provenance — only the plate is gone.</template>
        </p>
      </Motion>

      <!-- type-to-confirm — delete only -->
      <Presence>
        <Motion v-if="mode === 'delete'" class="trm-field trm-confirm"
          :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
          :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">
          <span class="trm-lb sd-mono">TYPE THE PLATE NAME TO CONFIRM <b class="req">*</b></span>
          <input v-model="typed" class="trm-in" :class="{ ok: nameMatches }" :placeholder="t.name"
            autocomplete="off" spellcheck="false" @keydown.enter.prevent="canSubmit && submit()" />
          <span v-if="typed && !nameMatches" class="trm-mismatch sd-mono">Doesn’t match — type “{{ t.name }}” exactly.</span>
        </Motion>
      </Presence>
    </div>

    <template #footer>
      <button type="button" class="trm-btn ghost" @click="$emit('close')">Cancel</button>
      <span class="trm-gap" />
      <Motion v-if="mode === 'archive'" as="button" type="button" class="trm-btn primary"
        :while-hover="canSubmit ? { y: -2, scale: 1.02 } : {}" :while-tap="canSubmit ? { scale: 0.97 } : {}"
        :disabled="!canSubmit || busy" @click="submit">
        <LoaderCircle v-if="busy" :size="14" class="trm-spin" /><Archive v-else :size="14" /> Archive plate
      </Motion>
      <Motion v-else as="button" type="button" class="trm-btn danger"
        :while-hover="canSubmit ? { y: -2, scale: 1.02 } : {}" :while-tap="canSubmit ? { scale: 0.97 } : {}"
        :disabled="!canSubmit || busy" @click="submit">
        <LoaderCircle v-if="busy" :size="14" class="trm-spin" /><Trash2 v-else :size="14" /> Delete plate
      </Motion>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdTemplateRetireModal — reasoned retirement for the Copperplate Studio.
   ARCHIVE (reversible) vs DELETE (soft-delete, permanent), each with a required
   WHY reason reel + optional audit note; delete adds a type-the-name gate. Emits
   archive/delete with { reason, note } for the backend audit trail. Never
   confirm(). Copper --sd-tpl-* palette (distinct from the agent filament desk). */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Archive, Trash2, Zap, Globe, Users, Lock, History, ShieldAlert, LoaderCircle } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  t: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'archive', 'delete'])

const ARCHIVE_REASONS = ['Seasonal — bring it back later', 'Superseded by a newer plate', 'Needs a revision', 'Rarely used', 'Paused for review']
const DELETE_REASONS = ['Created by mistake', 'Duplicate plate', 'Obsolete — no longer relevant', 'Contains an error', 'Consolidated into another plate']

const mode = ref('archive')
const reason = ref('')
const note = ref('')
const typed = ref('')
const uses = ref(0)

const reasons = computed(() => (mode.value === 'delete' ? DELETE_REASONS : ARCHIVE_REASONS))
const nameMatches = computed(() => typed.value.trim().toLowerCase() === (props.t?.name || '').trim().toLowerCase())
const canSubmit = computed(() => !!reason.value && (mode.value === 'archive' || nameMatches.value))

const visLabel = computed(() => ({ personal: 'Personal', team: 'Team', global: 'Library' }[props.t?.visibility || 'global']))
const visIcon = computed(() => ({ personal: Lock, team: Users, global: Globe }[props.t?.visibility || 'global']))

const setMode = (m) => { if (m === mode.value) return; mode.value = m; reason.value = ''; typed.value = '' }

watch(() => props.open, (o) => {
  if (o) { mode.value = 'archive'; reason.value = ''; note.value = ''; typed.value = ''; uses.value = props.t?.usage_count || 0 }
})

const submit = () => {
  if (!canSubmit.value || props.busy) return
  emit(mode.value === 'delete' ? 'delete' : 'archive', { reason: reason.value, note: note.value || null })
}
</script>

<style scoped>
.trm { display: flex; flex-direction: column; gap: 14px; }

.trm-usage {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  font-size: 10px; letter-spacing: 0.06em; color: var(--sd-text-muted);
  padding: 9px 13px; border-radius: 11px;
  background: var(--sd-tpl-soft); border: 1px solid var(--sd-tpl-brd);
}
.trm-usage span { display: inline-flex; align-items: center; gap: 5px; }
.trm-strikes.hot { color: var(--sd-tpl-hi); font-weight: 700; }
[data-theme="light"] .trm-strikes.hot { color: var(--sd-tpl-core); }
.trm-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--sd-text-muted); opacity: 0.6; }
.trm-ver { font-variant-numeric: tabular-nums; }

.trm-paths { display: flex; flex-direction: column; gap: 9px; }
.trm-opt {
  display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
  padding: 13px 14px; border-radius: 14px; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s var(--sd-spring);
}
.trm-opt:hover { transform: translateY(-1px); }
.trm-opt.on { border-color: var(--sd-tpl-core); box-shadow: 0 0 0 3px var(--sd-tpl-soft); background: var(--sd-tpl-soft); }
.trm-opt.danger.on { border-color: var(--sd-tpl-risk); box-shadow: 0 0 0 3px var(--sd-tpl-risk-soft); background: var(--sd-tpl-risk-soft); }
.trm-opt-ic { flex: 0 0 auto; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; }
.trm-opt-ic.archive { background: color-mix(in srgb, var(--sd-tpl-arch) 18%, transparent); color: var(--sd-tpl-arch); }
.trm-opt-ic.delete { background: var(--sd-tpl-risk-soft); color: var(--sd-tpl-risk); }
.trm-opt-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.trm-opt-body b { font-size: 13.5px; font-weight: 800; }
.trm-opt-body i { font-style: normal; font-size: 11.5px; line-height: 1.45; color: var(--sd-text-muted); }
.trm-radio {
  flex: 0 0 auto; width: 17px; height: 17px; border-radius: 50%; border: 2px solid var(--sd-border-strong);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.trm-opt.on .trm-radio { border-color: var(--sd-tpl-core); box-shadow: inset 0 0 0 3.5px var(--sd-tpl-core); }
.trm-opt.danger.on .trm-radio { border-color: var(--sd-tpl-risk); box-shadow: inset 0 0 0 3.5px var(--sd-tpl-risk); }

.trm-field { display: flex; flex-direction: column; gap: 8px; }
.trm-lb { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); display: flex; align-items: center; gap: 7px; }
.trm-lb .req { color: var(--sd-tpl-risk); }
.trm-hint { font-style: normal; text-transform: none; letter-spacing: 0.02em; opacity: 0.85; }

.trm-reasons { display: flex; flex-wrap: wrap; gap: 7px; }
.trm-reason {
  cursor: pointer; font-size: 11.5px; font-weight: 650; font-family: inherit;
  padding: 7px 12px; border-radius: 9px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.18s, color 0.18s, background 0.18s;
}
.trm-reason:hover { border-color: var(--sd-tpl-brd); color: var(--sd-text); }
.trm-reason.on { border-color: var(--sd-tpl-core); background: var(--sd-tpl-soft); color: var(--sd-tpl-hi); }
[data-theme="light"] .trm-reason.on { color: var(--sd-tpl-deep); }
.trm.delete .trm-reason.on { border-color: var(--sd-tpl-risk); background: var(--sd-tpl-risk-soft); color: var(--sd-tpl-risk); }

.trm-note, .trm-in {
  width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: vertical;
}
.trm-note:focus, .trm-in:focus { border-color: var(--sd-tpl-brd); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-tpl-core) 12%, transparent); }
.trm-in.ok { border-color: var(--sd-tpl-use); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-tpl-use) 16%, transparent); }
.trm-mismatch { font-size: 10px; color: var(--sd-tpl-risk); letter-spacing: 0.02em; }

.trm-consequence {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: 13px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass);
}
.trm-consequence.archive { border-color: color-mix(in srgb, var(--sd-tpl-arch) 40%, transparent); }
.trm-consequence.delete { border-color: color-mix(in srgb, var(--sd-tpl-risk) 40%, transparent); background: var(--sd-tpl-risk-soft); }
.trm-cq-ic { flex: 0 0 auto; margin-top: 2px; color: var(--sd-tpl-arch); }
.trm-consequence.delete .trm-cq-ic { color: var(--sd-tpl-risk); }
.trm-consequence p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--sd-text-secondary); }
.trm-consequence b { color: var(--sd-text); }
.trm-consequence.delete b { color: var(--sd-tpl-risk); }

.trm-confirm { overflow: hidden; }

.trm-gap { flex: 1; }
.trm-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 10px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 800; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary);
}
.trm-btn.ghost { background: transparent; }
.trm-btn.primary { border: none; background: var(--sd-tpl-grad); color: #180d05; }
[data-theme="light"] .trm-btn.primary { color: #fff6ea; }
.trm-btn.danger { border: none; background: var(--sd-tpl-risk); color: #fff6ea; }
.trm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.trm-spin { animation: trm-spin 1s linear infinite; }
@keyframes trm-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .trm-spin { animation: none; }
}
</style>
