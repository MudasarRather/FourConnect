<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="hvm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="hvm ex-grain" :style="{ '--c': accent }"
          :initial="reduced ? false : { opacity: 0, y: 30, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }"
          :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">

          <!-- ───────── HERO band ───────── -->
          <header class="hvm-hero">
            <span class="hvm-aura" aria-hidden="true" />
            <span class="hvm-grid" aria-hidden="true" />
            <button class="hvm-x" type="button" @click="$emit('close')"><X :size="17" /></button>

            <div class="hvm-instr"><ClearanceMotif kind="handover" :hex="accent" :tone="tone" :size="96" /></div>

            <div class="hvm-htxt">
              <span class="hvm-eye"><component :is="deptIcon" :size="12" /> {{ sub }}</span>
              <h3 class="hvm-title">{{ title }}</h3>
              <p class="hvm-brief">{{ pb.brief }}</p>
            </div>

            <!-- readiness ring -->
            <div class="hvm-ring-wrap">
              <span class="hvm-ring" :style="{ '--ex-p': pct * 3.6 + 'deg' }" :class="tone.toLowerCase()">
                <span class="hvm-ring-core">
                  <b class="ex-mono">{{ doneCount }}<i>/{{ total }}</i></b>
                  <em>confirmed</em>
                </span>
              </span>
            </div>
          </header>

          <!-- sent-back banner -->
          <Presence>
            <Motion v-if="sentBackNote" as="div" class="hvm-back"
              :initial="reduced ? false : { opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
              <RotateCcw :size="14" /><span><b>Your manager sent this back:</b> {{ sentBackNote }}</span>
            </Motion>
          </Presence>

          <!-- ───────── BODY ───────── -->
          <div class="hvm-body">
            <!-- checklist -->
            <section class="hvm-sec">
              <label class="hvm-lab"><ListChecks :size="13" /> Confirm what's done</label>
              <div class="hvm-steps">
                <Motion v-for="(step, i) in pb.steps" :key="i" as="button" type="button"
                  class="hvm-step" :class="{ on: checklist[String(i)] }" @click="toggle(i)"
                  :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.34, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="reduced ? {} : { x: 2 }" :whileTap="{ scale: 0.985 }">
                  <span class="hvm-spine" />
                  <span class="hvm-tick"><Motion v-if="checklist[String(i)]" as="span" class="hvm-tick-in"
                    :initial="reduced ? false : { scale: 0 }" :animate="{ scale: 1 }" :transition="{ type: 'spring', stiffness: 500, damping: 18 }"><Check :size="13" /></Motion></span>
                  <span class="hvm-step-tx">{{ step }}</span>
                </Motion>
              </div>
            </section>

            <!-- successor -->
            <section class="hvm-sec">
              <label class="hvm-lab" for="hvm-succ"><UserRoundCheck :size="13" /> Who is taking over? <i>optional</i></label>
              <div class="hvm-input-wrap">
                <UserRoundCheck :size="14" class="hvm-in-ic" />
                <input id="hvm-succ" v-model.trim="successor" type="text" class="hvm-input has-ic"
                  placeholder="Name of the successor / point of contact" maxlength="200" />
              </div>
            </section>

            <!-- reference links (KT docs / repos) -->
            <section class="hvm-sec">
              <label class="hvm-lab"><LinkIcon :size="13" /> Reference links <i>docs, repos, KT recordings</i></label>
              <Presence>
                <Motion v-for="(lnk, i) in links" :key="lnk._k" as="div" class="hvm-link"
                  :initial="reduced ? false : { opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, x: -12 }"
                  :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">
                  <input v-model.trim="lnk.name" type="text" class="hvm-input sm" placeholder="Label (e.g. Handover doc)" maxlength="120" />
                  <input v-model.trim="lnk.url" type="url" class="hvm-input sm grow" placeholder="https://…" maxlength="600" />
                  <button class="hvm-link-x" type="button" @click="removeLink(i)" title="Remove"><X :size="14" /></button>
                </Motion>
              </Presence>
              <button class="hvm-add" type="button" @click="addLink"><Plus :size="13" /> Add a link</button>
            </section>

            <!-- notes -->
            <section class="hvm-sec">
              <label class="hvm-lab" for="hvm-notes"><FileText :size="13" /> Handover notes</label>
              <div v-if="pb.presets?.length" class="hvm-presets">
                <Motion v-for="(p, i) in pb.presets" :key="p" as="button" type="button" class="hvm-chip" @click="addPreset(p)"
                  :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.95 }">+ {{ p }}</Motion>
              </div>
              <textarea id="hvm-notes" v-model="notes" rows="4" class="hvm-input"
                placeholder="Summarise what you've handed over, links to docs/repos, and anything still pending…" maxlength="4000" />
            </section>
          </div>

          <!-- ───────── FOOTER ───────── -->
          <footer class="hvm-foot">
            <span class="hvm-status" :class="{ ready: canSubmit }">
              <component :is="canSubmit ? ShieldCheck : CircleDashed" :size="13" />
              {{ canSubmit ? (allDone ? 'All confirmed — ready' : `${doneCount}/${total} confirmed`) : 'Add a confirmation or a note' }}
            </span>
            <span class="hvm-foot-actions">
              <button class="hvm-btn ghost" type="button" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" type="button" class="hvm-btn primary" :class="{ glow: canSubmit && !busy }"
                :disabled="busy || !canSubmit" @click="submit"
                :whileHover="reduced || !canSubmit ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
                <Loader2 v-if="busy" :size="14" class="spin" /><Send v-else :size="14" />
                {{ alreadySubmitted ? 'Update handover' : 'Submit handover' }}
              </Motion>
            </span>
          </footer>
          <p class="hvm-route"><Info :size="12" /> This goes to <b>{{ managerName || 'your reporting manager' }}</b> for sign-off. You can update it until it's cleared.</p>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Check, ListChecks, FileText, UserRoundCheck, Send, Loader2, Info, RotateCcw,
  X, Plus, Link as LinkIcon, ShieldCheck, CircleDashed, Briefcase, ClipboardCheck,
} from 'lucide-vue-next'
import ClearanceMotif from '../components/ClearanceMotif.vue'
import { clearanceItemPlaybook } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },   // clearance item (id, item_key, department, title, status, submission)
  managerName: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const reduced = prefersReduced()

const pb = computed(() => clearanceItemPlaybook(props.item?.item_key, props.item?.department))
const isProject = computed(() => props.item?.department === 'PROJECT')
const title = computed(() => props.item?.title || 'Complete handover')
const sub = computed(() => (isProject.value ? 'Project / client handover' : 'Manager handover'))
const deptIcon = computed(() => (isProject.value ? ClipboardCheck : Briefcase))

const checklist = ref({})
const successor = ref('')
const notes = ref('')
const links = ref([])
let _lk = 0

const total = computed(() => pb.value.steps?.length || 0)
const doneCount = computed(() => Object.values(checklist.value).filter(Boolean).length)
const allDone = computed(() => total.value > 0 && doneCount.value === total.value)
const pct = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0))
const canSubmit = computed(() => doneCount.value > 0 || !!notes.value.trim())

const alreadySubmitted = computed(() => !!props.item?.submission?.submitted_at)
const sentBackNote = computed(() => {
  if (props.item?.status !== 'BLOCKED') return ''
  const hist = props.item?.submission?.history || []
  const back = [...hist].reverse().find(h => h.event === 'sent_back')
  return back?.note || ''
})

// tone drives the signature instrument + ring color (red sent-back / emerald complete / amber in-progress)
const tone = computed(() => {
  if (sentBackNote.value) return 'BLOCKED'
  if (allDone.value) return 'CLEARED'
  return 'IN_PROGRESS'
})
const accent = computed(() => (tone.value === 'BLOCKED' ? '#ef4444' : tone.value === 'CLEARED' ? '#34d399' : '#fb923c'))

watch(() => props.open, (o) => {
  if (!o) return
  const s = props.item?.submission || {}
  checklist.value = { ...(s.checklist || {}) }
  successor.value = s.successor_name || ''
  notes.value = s.notes || ''
  links.value = (s.attachments || []).map(a => ({ _k: ++_lk, name: a.name || '', url: a.url || '' }))
}, { immediate: true })

const toggle = (i) => { const k = String(i); checklist.value = { ...checklist.value, [k]: !checklist.value[k] } }
const addPreset = (p) => { notes.value = notes.value.trim() ? `${notes.value.trim()}\n${p}` : p }
const addLink = () => links.value.push({ _k: ++_lk, name: '', url: '' })
const removeLink = (i) => links.value.splice(i, 1)

const submit = () => {
  emit('submit', {
    notes: notes.value.trim() || null,
    successor_name: successor.value.trim() || null,
    checklist: checklist.value,
    attachments: links.value.filter(l => l.name.trim() && l.url.trim()).map(l => ({ name: l.name.trim(), url: l.url.trim() })),
  })
}
</script>

<style scoped>
.hvm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .hvm-overlay { background: rgba(60, 45, 20, 0.34); }

.hvm { position: relative; overflow: hidden; width: min(580px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 24px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }

/* hero band */
.hvm-hero { position: relative; overflow: hidden; flex-shrink: 0; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px;
  padding: 20px 22px 18px; border-bottom: 1px solid var(--ex-border); }
.hvm-aura { position: absolute; inset: -60% 30% 30% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 26% 10%, color-mix(in srgb, var(--c) 26%, transparent), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }
.hvm-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask: radial-gradient(120% 120% at 80% 0%, #000, transparent 72%); mask: radial-gradient(120% 120% at 80% 0%, #000, transparent 72%); }
[data-theme="light"] .hvm-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }
.hvm-x { position: absolute; top: 12px; right: 12px; z-index: 4; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.hvm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }
.hvm-instr { position: relative; z-index: 2; }
.hvm-htxt { position: relative; z-index: 2; min-width: 0; }
.hvm-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c);
  padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.hvm-title { font-size: 17px; font-weight: 850; margin: 7px 0 3px; color: var(--ex-text); line-height: 1.15; }
.hvm-brief { font-size: 12px; line-height: 1.45; color: var(--ex-text-muted); margin: 0; max-width: 340px; }
/* bottom-align the ring in the hero row so it never collides with the top-right
   close button (the X is absolute at top:12; the ring is 64px tall). */
.hvm-ring-wrap { position: relative; z-index: 2; align-self: end; }
.hvm-ring { position: relative; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--c) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 22%, transparent) 0); transition: --ex-p 0.7s var(--ex-spring); }
.hvm-ring::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--ex-surface-elevated); }
.hvm-ring.cleared { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--c) 55%, transparent)); }
.hvm-ring-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.hvm-ring-core b { font-size: 18px; font-weight: 900; color: var(--ex-text); }
.hvm-ring-core b i { font-style: normal; font-size: 12px; color: var(--ex-text-muted); }
.hvm-ring-core em { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); margin-top: 2px; }

/* sent-back banner */
.hvm-back { display: flex; align-items: flex-start; gap: 8px; overflow: hidden; margin: 0 22px; font-size: 12px; line-height: 1.45;
  color: var(--ex-blocked); }
.hvm-back > span { padding: 9px 0; }
.hvm-back svg { flex-shrink: 0; margin-top: 10px; }

/* body */
.hvm-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 22px 6px; display: flex; flex-direction: column; gap: 16px; }
.hvm-body > * { flex-shrink: 0; }
.hvm-sec { display: flex; flex-direction: column; gap: 8px; }
.hvm-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.hvm-lab i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-dim); }
.hvm-lab svg { color: var(--c); }

/* checklist */
.hvm-steps { display: flex; flex-direction: column; gap: 7px; }
.hvm-step { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 11px 13px 11px 15px; border-radius: 13px; cursor: pointer; font-family: inherit;
  background: var(--ex-panel); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: border-color 0.25s, background 0.25s, color 0.25s; }
.hvm-step:hover { border-color: var(--ex-border-strong); }
.hvm-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ex-steel); opacity: 0.4; transition: background 0.25s, opacity 0.25s; }
.hvm-step.on { border-color: color-mix(in srgb, var(--ex-cleared) 45%, transparent); background: var(--ex-cleared-soft); color: var(--ex-text); }
.hvm-step.on .hvm-spine { background: var(--ex-cleared); opacity: 1; box-shadow: 0 0 10px var(--ex-cleared); }
.hvm-tick { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: #08120b;
  background: transparent; border: 1.5px solid var(--ex-border-strong); transition: background 0.2s, border-color 0.2s; }
.hvm-step.on .hvm-tick { background: var(--ex-cleared); border-color: var(--ex-cleared); }
.hvm-tick-in { display: grid; place-items: center; }
.hvm-step-tx { font-size: 12.5px; font-weight: 650; }

/* inputs */
.hvm-input-wrap { position: relative; }
.hvm-in-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ex-text-dim); pointer-events: none; }
.hvm-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 13px; font-family: inherit; color: var(--ex-text);
  background: rgba(0, 0, 0, 0.28); border: 1px solid var(--ex-border); resize: vertical; transition: border-color 0.2s, box-shadow 0.2s; }
.hvm-input.has-ic { padding-left: 36px; }
.hvm-input:focus { outline: none; border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 14%, transparent); }
[data-theme="light"] .hvm-input { background: rgba(255, 250, 242, 0.74); }
.hvm-input.sm { padding: 8px 11px; font-size: 12px; }

/* reference links — the inputs are flex children, so the base `.hvm-input
   { width:100% }` would set their flex-basis to 100% and starve the URL field
   to ~0px (un-clickable). Reset to flexible bases instead. */
.hvm-link { display: flex; align-items: center; gap: 7px; }
.hvm-link .hvm-input { width: auto; min-width: 0; }
.hvm-link .hvm-input.sm { flex: 1 1 0; }          /* label */
.hvm-link .hvm-input.sm.grow { flex: 1.8 1 0; }   /* url — wider, beats .sm specificity */
.hvm-link-x { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 8px; cursor: pointer;
  background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 28%, transparent); color: var(--ex-blocked); transition: filter 0.2s; }
.hvm-link-x:hover { filter: brightness(1.1); }
.hvm-add { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 9px; cursor: pointer; font-family: inherit;
  background: transparent; border: 1px dashed var(--ex-border-strong); color: var(--ex-text-secondary); transition: border-color 0.2s, color 0.2s; }
.hvm-add:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); color: var(--c); }

/* notes presets */
.hvm-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.hvm-chip { font-size: 11px; font-weight: 650; padding: 4px 11px; border-radius: 999px; cursor: pointer; font-family: inherit;
  background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); color: var(--c); }

/* footer */
.hvm-foot { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 13px 22px 6px; border-top: 1px solid var(--ex-border); }
.hvm-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--ex-text-muted); }
.hvm-status.ready { color: var(--ex-cleared); }
.hvm-foot-actions { display: flex; gap: 8px; margin-left: auto; }
.hvm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 760; cursor: pointer; font-family: inherit; border: none; }
.hvm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.hvm-btn.primary { position: relative; overflow: hidden; background: var(--ex-grad-hero); color: #1a1206; box-shadow: var(--ex-violet-glow); }
.hvm-btn.primary.glow::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  transform: translateX(-130%); animation: hvm-shine 2.4s ease-in-out infinite; }
.hvm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hvm-route { flex-shrink: 0; display: flex; align-items: flex-start; gap: 6px; margin: 0; padding: 6px 22px 16px; font-size: 11px; line-height: 1.45; color: var(--ex-text-muted); }
.hvm-route svg { color: var(--ex-text-dim); flex-shrink: 0; margin-top: 1px; }
.hvm-route b { color: var(--ex-text-secondary); font-weight: 750; }

.spin { animation: ex-spin-slow 0.8s linear infinite; }
@keyframes hvm-shine { 0%, 100% { transform: translateX(-130%); } 55%, 75% { transform: translateX(130%); } }

@media (max-width: 600px) {
  .hvm-hero { grid-template-columns: auto 1fr; }
  .hvm-ring-wrap { grid-column: 1 / -1; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  .hvm-aura, .spin, .hvm-btn.primary.glow::after { animation: none; }
  .hvm-ring, .hvm-step, .hvm-spine, .hvm-tick { transition: none; }
}
</style>
