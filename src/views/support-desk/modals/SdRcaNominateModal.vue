<template>
  <!-- ═══ NOMINATE — promote a correlated cluster to a PROBLEM record. Prefilled from
       the signature; roster sealed to the cluster's members (min 2). ═══ -->
  <SdModalShell :open="open" :z="2000" width="620px" eyebrow="THE CLEARINGHOUSE · CORRELATED EXPOSURE"
    title="Promote cluster to problem" @close="$emit('close')">
    <div v-if="cluster" class="nom">
      <label class="fld">
        <span class="fld-k sd-mono">PROBLEM TITLE</span>
        <input v-model="title" class="fld-in" type="text" maxlength="200"
          placeholder="Name the problem record…" />
        <span v-if="titleBad" class="fld-err sd-mono">TITLE NEEDS AT LEAST 3 CHARACTERS.</span>
      </label>

      <label class="fld">
        <span class="fld-k sd-mono">PROBLEM STATEMENT</span>
        <textarea v-model="statement" class="fld-in area" rows="3"
          placeholder="What keeps striking, where, and at what cost…" />
      </label>

      <label class="fld">
        <span class="fld-k sd-mono">ROOT-CAUSE HINT <em>(optional)</em></span>
        <input v-model="hint" class="fld-in" type="text" maxlength="300"
          placeholder="Working theory from the filed RCAs…" />
      </label>

      <div class="roster">
        <p class="fld-k sd-mono">MEMBER ROSTER — {{ selectedIds.length }} OF {{ allIds.length }} SEALED IN</p>
        <label v-for="t in previews" :key="String(t.id)" class="ros-row">
          <input type="checkbox" :checked="!excluded.has(String(t.id))" @change="toggleMember(t.id)" />
          <b class="sd-mono">{{ t.ticket_number }}</b>
          <span class="ros-sub">{{ t.subject }}</span>
          <SdRcaStatusStamp :status="t.rca_status" sm />
        </label>
        <p v-if="hiddenCount > 0" class="ros-more sd-mono">+{{ hiddenCount }} MORE MEMBERS INCLUDED (NOT PREVIEWED).</p>
        <p v-if="rosterBad" class="fld-err sd-mono">A PROBLEM NEEDS AT LEAST 2 LINKED POSITIONS.</p>
      </div>

      <p v-if="apiError" class="api-err sd-mono">{{ apiError }}</p>

      <!-- accession-mint flourish -->
      <Presence>
        <Motion v-if="minting" class="mint-stamp sd-mono" :initial="{ opacity: 0, scale: 1.6, rotate: -8 }"
          :animate="{ opacity: 1, scale: 1, rotate: -4 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          BOOKING POSITION…
        </Motion>
      </Presence>
    </div>

    <template #footer>
      <button class="nm-ghost sd-mono" type="button" :disabled="busy" @click="$emit('close')">STAND DOWN</button>
      <Motion as="button" class="nm-mint sd-mono" type="button" :disabled="busy || titleBad || rosterBad"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="submit">
        <ArrowUpRight :size="13" /> {{ busy ? 'MINTING…' : 'MINT PROBLEM RECORD' }}
      </Motion>
    </template>
  </SdModalShell>
</template>

<script setup>
/*
  SdRcaNominateModal — books a recurrence cluster into the Problem workbench via
  promoteRcaCluster({ ticket_ids, title, statement, root_cause_hint }). Unchecked
  preview members are excluded; non-previewed members always ride along (the
  backend seals the subset). 422 detail renders inline; skips surface in the toast.
*/
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ArrowUpRight } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdRcaStatusStamp from '../components/SdRcaStatusStamp.vue'
import { promoteRcaCluster } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  cluster: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const title = ref('')
const statement = ref('')
const hint = ref('')
const excluded = ref(new Set())
const busy = ref(false)
const minting = ref(false)
const apiError = ref('')

const fmtDay = (iso) => {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
const prefill = (c) => {
  if (!c) return
  const sig = c.signature || {}
  const what = (sig.keywords || []).slice(0, 4).join(' / ') || sig.service || sig.category_name || 'unnamed signature'
  title.value = c.suggested_problem_title || `Recurring: ${what}`
  statement.value = `Recurring signature: ${what} — ${c.count || 0} incidents ${fmtDay(c.first_seen)} → ${fmtDay(c.last_seen)}.`
  hint.value = c.rca_hint || ''
  excluded.value = new Set()
  apiError.value = ''
  minting.value = false
}
watch(() => props.open, (v) => { if (v) prefill(props.cluster) })

const allIds = computed(() => (props.cluster?.ticket_ids || []).map(String))
const previews = computed(() => (props.cluster?.tickets || []).slice(0, 5))
const hiddenCount = computed(() => Math.max(0, allIds.value.length - previews.value.length))
const selectedIds = computed(() => allIds.value.filter((id) => !excluded.value.has(id)))
const toggleMember = (id) => {
  const key = String(id)
  const next = new Set(excluded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  excluded.value = next
}

const titleBad = computed(() => title.value.trim().length < 3)
const rosterBad = computed(() => selectedIds.value.length < 2)

const detailOf = (e) => {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' · ')
  return e?.message || 'The mint was refused — try again.'
}

const submit = async () => {
  if (busy.value || titleBad.value || rosterBad.value) return
  busy.value = true
  minting.value = true
  apiError.value = ''
  try {
    const res = await promoteRcaCluster({
      ticket_ids: selectedIds.value,
      title: title.value.trim(),
      statement: statement.value.trim() || undefined,
      root_cause_hint: hint.value.trim() || undefined,
    })
    const number = res?.problem_number || res?.problem?.problem_number || 'PROBLEM'
    const results = res?.results || []
    const skipped = results.filter((r) => r?.skipped || r?.status === 'skipped' || r?.linked === false)
    let msg = `▲ ${number} minted — ${selectedIds.value.length - skipped.length} positions sealed to the problem.`
    if (skipped.length) msg += ` ${skipped.length} skipped (already covered or ineligible).`
    toast.success(msg)
    emit('done')
    emit('close')
  } catch (e) {
    apiError.value = detailOf(e)
    minting.value = false
  } finally { busy.value = false }
}
</script>

<style scoped>
.nom { position: relative; display: flex; flex-direction: column; gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld-k { font-size: 8.5px; letter-spacing: 0.24em; font-weight: 800; color: var(--sd-rcg-core); }
.fld-k em { font-style: normal; color: var(--sd-text-muted); letter-spacing: 0.1em; }
.fld-in { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--sd-text);
  background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s; }
.fld-in:focus { border-color: var(--sd-rcg-core); box-shadow: 0 0 0 3px var(--sd-rcg-soft); }
.fld-in::placeholder { color: var(--sd-text-muted); }
.fld-in.area { resize: vertical; min-height: 68px; line-height: 1.55; font-family: inherit; }
.fld-err { font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-rcg-bounce); }

.roster { display: flex; flex-direction: column; gap: 7px; padding: 12px 13px; border-radius: 12px;
  border: 1px dashed var(--sd-rcg-brd); background: var(--sd-rcg-soft); }
.ros-row { display: grid; grid-template-columns: 16px 88px 1fr auto; gap: 9px; align-items: center;
  padding: 6px 4px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.ros-row:hover { background: color-mix(in srgb, var(--sd-rcg-core) 8%, transparent); }
.ros-row input { accent-color: var(--sd-rcg-core); cursor: pointer; }
.ros-row b { font-size: 10px; color: var(--sd-rcg-core); font-variant-numeric: tabular-nums; }
.ros-sub { min-width: 0; font-size: 11.5px; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ros-more { margin: 2px 0 0; font-size: 8px; letter-spacing: 0.14em; color: var(--sd-text-muted); }

.api-err { margin: 0; padding: 9px 12px; border-radius: 8px; font-size: 10px; letter-spacing: 0.04em;
  color: var(--sd-rcg-bounce); background: var(--sd-rcg-bounce-soft);
  border: 1px dashed color-mix(in srgb, var(--sd-rcg-bounce) 45%, transparent); }

.mint-stamp { position: absolute; top: 42%; left: 50%; margin-left: -110px; width: 220px;
  text-align: center; padding: 12px 0; font-size: 12px; font-weight: 800; letter-spacing: 0.3em;
  color: var(--sd-rcg-core); border: 2px solid var(--sd-rcg-core); border-radius: 8px;
  background: color-mix(in srgb, var(--sd-rcg-soft) 80%, var(--sd-surface-elevated));
  box-shadow: var(--sd-rcg-glow); pointer-events: none; z-index: 2; }

.nm-ghost { padding: 9px 16px; border-radius: 10px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.14em; cursor: pointer; color: var(--sd-text-secondary);
  background: transparent; border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.nm-ghost:hover { color: var(--sd-text); border-color: var(--sd-border-strong, var(--sd-border)); }
.nm-mint { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 10px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.14em; cursor: pointer; color: #1a1206;
  background: var(--sd-rcg-grad); border: none; box-shadow: 0 4px 18px var(--sd-rcg-soft);
  transition: box-shadow 0.2s; }
[data-theme="light"] .nm-mint { color: #fff8ec; }
.nm-mint:disabled, .nm-ghost:disabled { opacity: 0.45; cursor: not-allowed; }
.nm-mint:not(:disabled):hover { box-shadow: var(--sd-rcg-glow); }
</style>
