<template>
  <!-- ═══ PIN RACK — the Chrono Desk's reminder console ═══
       Signature: the FUSE RACK. Every live pin is a burning fuse — a spark travels
       the track from created_at → remind_at; overdue pins smolder ember-red; struck
       pins are extinguished. Header carries the live NEXT STRIKE chronometer; the
       rack is bucketed TIME DEBT → TODAY → TOMORROW → THIS WEEK → LATER → STRUCK.
       Deleting routes through the burn ceremony modal (SdPinBurnModal). -->
  <Teleport to="body">
    <AnimatePresence>
      <Motion
        v-if="open" class="pr-veil"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.28 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="pr" role="dialog" aria-label="Reminders — pin rack"
          :initial="{ x: 72, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: 52, opacity: 0 }"
          :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @click.stop
        >
          <!-- ambient stage -->
          <div class="pr-stage" aria-hidden="true">
            <span class="pr-aura a"></span>
            <span class="pr-aura b"></span>
            <Bell class="pr-watermark" :size="250" :stroke-width="0.5" />
            <span v-for="n in 6" :key="n" class="pr-ember" :style="{ '--n': n }"></span>
          </div>

          <!-- ── head ── -->
          <header class="pr-head">
            <div>
              <p class="pr-eyebrow sd-mono"><BellRing :size="10" /> CHRONO · PIN RACK</p>
              <h3 class="pr-title">The <em>Fuse</em> Rack</h3>
              <p class="pr-subtitle">Strike, re-time or burn your follow-up pins.</p>
            </div>
            <button class="pr-x" aria-label="Close" @click="$emit('close')"><X :size="15" /></button>
          </header>

          <!-- ── NEXT STRIKE chronometer ── -->
          <Motion
            class="pr-strike" :class="strikeMode"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="pr-ring" :style="{ '--pct': ringPct }">
              <span class="pr-ring-comet"></span>
              <div class="pr-ring-core">
                <BellRing v-if="strikeMode === 'storm'" :size="17" />
                <Bell v-else-if="strikeMode === 'live'" :size="17" />
                <BellOff v-else :size="17" />
              </div>
            </div>
            <div class="pr-strike-txt">
              <p class="pr-strike-lbl sd-mono">{{ strikeLabel }}</p>
              <p class="pr-strike-val sd-mono">{{ strikeValue }}</p>
              <p v-if="strikeSub" class="pr-strike-sub sd-mono">{{ strikeSub }}</p>
            </div>
            <div class="pr-strike-scale" aria-hidden="true">
              <i v-for="n in 12" :key="n" class="pr-tick" :style="{ '--t': n }"></i>
            </div>
            <div class="pr-strike-sheen" aria-hidden="true"></div>
          </Motion>

          <!-- ── telemetry lenses = filters ── -->
          <nav class="pr-lenses" aria-label="Filter reminders">
            <Motion
              v-for="(f, fi) in FILTERS" :key="f.key" as="button"
              class="pr-lens" :class="[f.key, { on: filter === f.key }]"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.35, delay: 0.16 + fi * 0.05, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
              @click="filter = f.key"
            >
              <span class="pr-lens-top">
                <component :is="f.icon" :size="13" />
                <b class="sd-mono">{{ counts[f.key] }}</b>
              </span>
              <span class="pr-lens-lbl sd-mono">{{ f.label }}</span>
              <i class="pr-lens-bar"></i>
            </Motion>
          </nav>

          <!-- ── the rack ── -->
          <div class="pr-body sd-scroll">
            <div v-if="busy" class="pr-empty sd-mono">SOUNDING THE RACK…</div>
            <div v-else-if="loadError" class="pr-empty sd-mono storm">{{ loadError }}</div>

            <div v-else-if="!totalVisible" class="pr-empty">
              <span class="pr-empty-bell">
                <Bell :size="26" />
                <i class="pr-empty-orbit"></i>
              </span>
              <p class="sd-mono">{{ EMPTY_TEXT[filter] }}</p>
              <Motion
                as="button" class="pr-btn primary" :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
                @click="$emit('new')"
              >
                <BellPlus :size="13" /> Pin a follow-up
              </Motion>
            </div>

            <template v-else>
              <section v-for="g in sections" :key="g.key" class="pr-sect">
                <p class="pr-sect-lbl sd-mono" :class="g.tone">
                  <i class="pr-sect-dot"></i>{{ g.label }}
                  <b class="pr-sect-n sd-mono">{{ g.rows.length }}</b>
                  <span class="pr-sect-rail"></span>
                </p>

                <TransitionGroup name="prr" tag="div" class="pr-list">
                  <article
                    v-for="(r, j) in g.rows" :key="r.id"
                    class="pr-row" :class="[stateOf(r), { struck: struckId === r.id }]"
                    :style="{ '--i': g.offset + j, '--fuse': fusePct(r) }"
                  >
                    <span class="pr-lamp" aria-hidden="true"><i class="pr-lamp-dot"></i></span>

                    <div class="pr-row-main">
                      <div class="pr-row-top">
                        <button class="pr-num sd-mono" :title="`Open ${r.ticket_number}`" @click="$emit('open-ticket', String(r.ticket_id))">
                          {{ r.ticket_number || 'PIN' }}
                        </button>
                        <span class="pr-sub" :title="r.subject">{{ r.subject || '—' }}</span>

                        <span class="pr-acts">
                          <button
                            class="pr-act done" :class="{ undo: r.done }" :disabled="busyId === r.id"
                            :title="r.done ? 'Re-arm this pin' : 'Strike — mark done'"
                            @click="toggleDone(r)"
                          >
                            <Undo2 v-if="r.done" :size="13" />
                            <Check v-else :size="13" />
                          </button>
                          <button
                            class="pr-act edit" :class="{ on: editId === r.id }" :disabled="r.done"
                            title="Edit — re-time or rewrite" @click="startEdit(r)"
                          >
                            <Pencil :size="13" />
                          </button>
                          <button
                            class="pr-act del" :disabled="busyId === r.id"
                            title="Burn — delete this pin" @click="askBurn(r)"
                          >
                            <Trash2 :size="13" />
                          </button>
                        </span>
                      </div>

                      <p v-if="r.note && editId !== r.id" class="pr-note">{{ r.note }}</p>

                      <!-- fuse -->
                      <div class="pr-fuse" aria-hidden="true">
                        <div class="pr-fuse-burn"></div>
                        <i class="pr-fuse-spark"></i>
                      </div>
                      <div class="pr-when">
                        <span class="pr-rel sd-mono">{{ relDue(r) }}</span>
                        <span class="pr-abs sd-mono">{{ absDue(r) }}</span>
                      </div>

                      <!-- inline editor -->
                      <Motion
                        v-if="editId === r.id" class="pr-edit"
                        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
                        :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
                      >
                        <SdDateTimePicker v-model="editWhen" :min="todayIso" placeholder="New strike time" />
                        <div class="pr-snooze">
                          <button v-for="s in SNOOZES" :key="s.label" class="pr-snz sd-mono" @click="applySnooze(s)">{{ s.label }}</button>
                        </div>
                        <textarea
                          v-model="editNote" class="pr-edit-note" rows="2" maxlength="300"
                          placeholder="What should future-you check?"
                        ></textarea>
                        <p v-if="editError" class="pr-edit-err">{{ editError }}</p>
                        <div class="pr-edit-btns">
                          <button class="pr-btn ghost" @click="editId = null">Cancel</button>
                          <Motion
                            as="button" class="pr-btn primary" :disabled="!editWhen || busyId === r.id"
                            :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
                            @click="saveEdit(r)"
                          >
                            <Loader v-if="busyId === r.id" :size="13" class="pr-spin" />
                            <CalendarClock v-else :size="13" />
                            Re-pin
                          </Motion>
                        </div>
                      </Motion>
                    </div>
                  </article>
                </TransitionGroup>
              </section>
            </template>
          </div>

          <!-- ── foot ── -->
          <footer class="pr-foot">
            <Motion
              as="button" class="pr-btn primary" :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
              @click="$emit('new')"
            >
              <BellPlus :size="13" /> New pin
            </Motion>
            <span class="pr-foot-fact sd-mono">
              {{ counts.live }} LIVE · {{ counts.overdue }} OVERDUE · {{ counts.done }} STRUCK
            </span>
          </footer>
        </Motion>
      </Motion>
    </AnimatePresence>
  </Teleport>

  <!-- burn ceremony (z-2150 — stacks above the drawer) -->
  <SdPinBurnModal :open="burn.open" :pin="burn.pin" @close="burn.open = false" @burned="onBurned" />
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import {
  X, Bell, BellRing, BellOff, BellPlus, Check, Undo2, Pencil, Trash2,
  Loader, CalendarClock, Flame, CircleCheck, Layers,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdDateTimePicker from './SdDateTimePicker.vue'
import SdPinBurnModal from './SdPinBurnModal.vue'
import { listMyReminders, updateMyReminder } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** bump to refetch while open (e.g. after the create modal pins a new reminder) */
  refresh: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'open-ticket', 'new', 'changed'])
const toast = useToast()

/* ── data ── */
const rows = ref([])
const busy = ref(false)
const loadError = ref('')
const filter = ref('live')
const editId = ref(null)
const editWhen = ref('')
const editNote = ref('')
const editError = ref('')
const busyId = ref(null)
const struckId = ref(null)
const burn = reactive({ open: false, pin: null })
let struckTimer = null

const load = async () => {
  busy.value = true
  loadError.value = ''
  try {
    rows.value = await listMyReminders({ include_done: true })
  } catch {
    rows.value = []
    loadError.value = 'THE RACK WOULD NOT ANSWER — RETRY FROM THE DECK.'
  }
  busy.value = false
}
watch(() => [props.open, props.refresh], ([o]) => {
  if (o) { load(); startTick() } else { stopTick(); editId.value = null; burn.open = false }
})

/* ── the second-hand: one ticking ref drives the chronometer + every fuse ── */
const now = ref(Date.now())
let tick = null
const startTick = () => { stopTick(); tick = setInterval(() => { now.value = Date.now() }, 1000) }
const stopTick = () => { if (tick) { clearInterval(tick); tick = null } }
const onEsc = (e) => { if (e.key === 'Escape' && props.open && !burn.open) emit('close') }
window.addEventListener('keydown', onEsc)
onBeforeUnmount(() => { stopTick(); window.removeEventListener('keydown', onEsc); clearTimeout(struckTimer) })

/* ── grouping ── */
const at = (r) => new Date(r.remind_at).getTime()
const stateOf = (r) => (r.done ? 'done' : at(r) <= now.value ? 'overdue' : 'live')

const counts = computed(() => {
  const c = { live: 0, overdue: 0, done: 0 }
  for (const r of rows.value) c[stateOf(r)]++
  return { ...c, all: rows.value.length }
})

const FILTERS = [
  { key: 'live', label: 'LIVE', icon: Bell },
  { key: 'overdue', label: 'OVERDUE', icon: Flame },
  { key: 'done', label: 'STRUCK', icon: CircleCheck },
  { key: 'all', label: 'ALL', icon: Layers },
]
const EMPTY_TEXT = {
  live: 'NO LIVE PINS — THE RACK IS QUIET.',
  overdue: 'NOTHING OVERDUE. CLEAN DESK.',
  done: 'NO STRUCK PINS YET.',
  all: 'THE RACK IS EMPTY — PIN A FOLLOW-UP.',
}

/* Day-bucketed sections: TIME DEBT → TODAY → TOMORROW → THIS WEEK → LATER → STRUCK. */
const DAY = 86400000
const sections = computed(() => {
  const overdue = [], today = [], tomorrow = [], week = [], later = [], done = []
  const d0 = new Date(now.value); d0.setHours(0, 0, 0, 0)
  const t1 = d0.getTime() + DAY, t2 = t1 + DAY, t7 = d0.getTime() + 7 * DAY
  for (const r of rows.value) {
    const s = stateOf(r)
    if (s === 'done') done.push(r)
    else if (s === 'overdue') overdue.push(r)
    else {
      const t = at(r)
      if (t < t1) today.push(r)
      else if (t < t2) tomorrow.push(r)
      else if (t < t7) week.push(r)
      else later.push(r)
    }
  }
  const asc = (a, b) => at(a) - at(b)
  overdue.sort(asc); today.sort(asc); tomorrow.sort(asc); week.sort(asc); later.sort(asc)
  done.sort((a, b) => at(b) - at(a))
  const defs = [
    { key: 'overdue', label: 'TIME DEBT', tone: 'storm', rows: overdue, show: ['overdue', 'all'] },
    { key: 'today', label: 'TODAY', tone: 'core', rows: today, show: ['live', 'all'] },
    { key: 'tomorrow', label: 'TOMORROW', tone: 'core', rows: tomorrow, show: ['live', 'all'] },
    { key: 'week', label: 'THIS WEEK', tone: 'core', rows: week, show: ['live', 'all'] },
    { key: 'later', label: 'LATER', tone: 'moon', rows: later, show: ['live', 'all'] },
    { key: 'done', label: 'STRUCK', tone: 'pin', rows: done, show: ['done', 'all'] },
  ]
  let offset = 0
  return defs
    .filter((d) => d.show.includes(filter.value) && d.rows.length)
    .map((d) => { const g = { ...d, offset }; offset += d.rows.length; return g })
})
const totalVisible = computed(() => sections.value.reduce((n, g) => n + g.rows.length, 0))

/* ── fuse math: spark position = elapsed share of created_at → remind_at ── */
const fusePct = (r) => {
  if (r.done) return 1
  const start = r.created_at ? new Date(r.created_at).getTime() : now.value
  const end = at(r)
  if (end <= now.value) return 1
  if (end <= start) return 1
  return Math.min(1, Math.max(0.03, (now.value - start) / (end - start))).toFixed(4)
}

/* ── NEXT STRIKE chronometer ── */
const nextLive = computed(() => {
  let best = null
  for (const r of rows.value) if (stateOf(r) === 'live' && (!best || at(r) < at(best))) best = r
  return best
})
const strikeMode = computed(() =>
  counts.value.overdue ? 'storm' : nextLive.value ? 'live' : 'clear')
const strikeLabel = computed(() =>
  strikeMode.value === 'storm' ? 'PINS OVERDUE' : strikeMode.value === 'live' ? 'NEXT STRIKE' : 'RACK CLEAR')
const strikeValue = computed(() => {
  if (strikeMode.value === 'storm') return String(counts.value.overdue)
  if (!nextLive.value) return '—'
  return fmtSpan(at(nextLive.value) - now.value)
})
const strikeSub = computed(() => {
  if (strikeMode.value === 'storm') {
    let oldest = null
    for (const r of rows.value) if (stateOf(r) === 'overdue' && (!oldest || at(r) < at(oldest))) oldest = r
    return oldest ? `OLDEST · ${oldest.ticket_number}` : ''
  }
  return nextLive.value?.ticket_number || ''
})
const ringPct = computed(() => {
  if (strikeMode.value === 'storm') return 1
  if (!nextLive.value) return 0
  return fusePct(nextLive.value)
})

/* ── formatting ── */
const pad = (n) => String(n).padStart(2, '0')
function fmtSpan(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  if (d >= 1) return `${d}d ${pad(Math.floor((s % 86400) / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m`
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
const relDue = (r) => {
  if (r.done) return 'STRUCK'
  const diff = at(r) - now.value
  return diff >= 0 ? `IN ${fmtSpan(diff)}` : `${fmtSpan(-diff)} OVERDUE`
}
const absDue = (r) => {
  const d = new Date(r.remind_at)
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
}
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const todayIso = computed(() => toLocalInput(new Date()).slice(0, 10))

/* ── actions ── */
const toggleDone = async (r) => {
  if (busyId.value) return
  busyId.value = r.id
  try {
    const target = !r.done
    await updateMyReminder(r.id, { done: target })
    if (target) {
      struckId.value = r.id
      clearTimeout(struckTimer)
      struckTimer = setTimeout(() => { struckId.value = null; r.done = true; emit('changed') }, 480)
    } else {
      r.done = false
      emit('changed')
    }
  } catch {
    toast.error('Could not update the pin — try again.')
  }
  busyId.value = null
}

const startEdit = (r) => {
  if (r.done) return
  editError.value = ''
  editId.value = editId.value === r.id ? null : r.id
  editWhen.value = toLocalInput(new Date(r.remind_at))
  editNote.value = r.note || ''
}
const SNOOZES = [
  { label: '+1H', h: 1 },
  { label: '+4H', h: 4 },
  { label: 'TOM 9:00', tomorrow: true },
  { label: '+1W', d: 7 },
]
const applySnooze = (s) => {
  const d = new Date()
  if (s.h) d.setHours(d.getHours() + s.h)
  if (s.d) { d.setDate(d.getDate() + s.d); d.setHours(9, 0, 0, 0) }
  if (s.tomorrow) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0) }
  editWhen.value = toLocalInput(d)
}
const saveEdit = async (r) => {
  if (!editWhen.value || busyId.value) return
  const when = new Date(editWhen.value)
  if (Number.isNaN(when.getTime()) || when <= new Date()) {
    editError.value = 'Pick a time in the future.'
    return
  }
  editError.value = ''
  busyId.value = r.id
  try {
    const upd = await updateMyReminder(r.id, {
      remind_at: when.toISOString(),
      note: editNote.value.trim() || null,
    })
    r.remind_at = upd.remind_at
    r.note = upd.note
    editId.value = null
    toast.success(`Re-pinned ${r.ticket_number || 'reminder'} for ${when.toLocaleString()}`)
    emit('changed')
  } catch (e) {
    editError.value = e?.response?.data?.detail || 'Could not re-pin — try again.'
  }
  busyId.value = null
}

/* delete = the burn ceremony (reason-gated modal) */
const askBurn = (r) => { burn.pin = r; burn.open = true }
const onBurned = (id) => {
  rows.value = rows.value.filter((x) => x.id !== id)
  emit('changed')
}
</script>

<style scoped>
/* ── veil + drawer shell ── */
.pr-veil {
  position: fixed; inset: 0; z-index: 1900;
  background: rgba(8, 6, 3, 0.55);
  backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
  display: flex; justify-content: flex-end;
}
[data-theme="light"] .pr-veil { background: rgba(62, 46, 18, 0.3); }

.pr {
  position: relative; width: 520px; max-width: 96vw; height: 100%;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--sd-surface-elevated);
  border-left: 1px solid var(--sd-cal-brd);
  box-shadow: -22px 0 60px rgba(0, 0, 0, 0.4), var(--sd-cal-glow);
}
.pr::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--sd-cal-grad); z-index: 3; }
[data-theme="light"] .pr { box-shadow: -18px 0 48px rgba(70, 50, 14, 0.18), var(--sd-cal-glow); }

/* ── ambient stage ── */
.pr-stage { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.pr-aura { position: absolute; border-radius: 50%; }
.pr-aura.a {
  top: -120px; right: -100px; width: 320px; height: 320px;
  background: radial-gradient(circle, color-mix(in srgb, var(--sd-cal-core) 11%, transparent), transparent 68%);
}
.pr-aura.b {
  bottom: -140px; left: -110px; width: 340px; height: 340px;
  background: radial-gradient(circle, color-mix(in srgb, var(--sd-cal-resume) 9%, transparent), transparent 70%);
}
.pr-watermark {
  position: absolute; right: -58px; bottom: 44px; color: var(--sd-cal-core); opacity: 0.045;
  transform: rotate(-14deg);
}
.pr-ember {
  position: absolute; bottom: -8px; left: calc(var(--n) * 15% + 4%);
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--sd-cal-core); opacity: 0;
  animation: pr-ember-rise calc(7s + var(--n) * 1.3s) linear infinite;
  animation-delay: calc(var(--n) * 1.9s);
}
@keyframes pr-ember-rise {
  0% { opacity: 0; transform: translateY(0) translateX(0); }
  12% { opacity: 0.45; }
  70% { opacity: 0.2; }
  100% { opacity: 0; transform: translateY(-92vh) translateX(14px); }
}

/* ── head ── */
.pr-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 12px; }
.pr-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.28em; color: var(--sd-cal-core); }
.pr-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); }
.pr-title em {
  font-style: normal;
  background: var(--sd-cal-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.pr-subtitle { margin: 4px 0 0; font-size: 12px; color: var(--sd-text-secondary); }
.pr-x {
  width: 30px; height: 30px; display: grid; place-items: center; cursor: pointer;
  border-radius: 10px; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: all 0.18s;
}
.pr-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); transform: rotate(90deg); }

/* ── NEXT STRIKE chronometer (theme-native stage) ── */
.pr-strike {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 15px; overflow: hidden;
  margin: 0 22px; padding: 14px 17px; border-radius: 17px;
  background: var(--sd-cal-stage); border: 1px solid var(--sd-cal-brd);
}
.pr-ring {
  --pct: 0;
  position: relative; flex: none; width: 56px; height: 56px; border-radius: 50%;
  display: grid; place-items: center;
  background: conic-gradient(var(--sd-cal-core) calc(var(--pct) * 360deg), color-mix(in srgb, var(--sd-cal-core) 15%, transparent) 0);
  transition: background 0.9s linear;
}
.pr-ring-core {
  width: 45px; height: 45px; border-radius: 50%; display: grid; place-items: center;
  background: var(--sd-cal-stage); color: var(--sd-cal-core);
}
.pr-ring-comet { position: absolute; inset: -3px; animation: sd-orbit-spin 7s linear infinite; }
.pr-ring-comet::before {
  content: ""; position: absolute; top: 0; left: 50%;
  width: 5px; height: 5px; border-radius: 50%; transform: translateX(-50%);
  background: var(--sd-cal-hi); box-shadow: 0 0 8px var(--sd-cal-core);
}
.pr-strike-txt { min-width: 0; position: relative; z-index: 1; }
.pr-strike-lbl { margin: 0 0 3px; font-size: 8px; font-weight: 700; letter-spacing: 0.3em; color: var(--sd-cal-moon); }
.pr-strike-val {
  --sd-count-glow: color-mix(in srgb, var(--sd-cal-core) 55%, transparent);
  margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; color: var(--sd-cal-core);
  font-variant-numeric: tabular-nums; animation: sd-count-glow 3.2s ease-in-out infinite;
}
.pr-strike-sub { margin: 3px 0 0; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-cal-resume); }
.pr-strike.storm { border-color: color-mix(in srgb, var(--sd-cal-storm) 45%, transparent); }
.pr-strike.storm .pr-ring { background: conic-gradient(var(--sd-cal-storm) 360deg, transparent 0); animation: sd-cal-storm-pulse 1.8s ease-in-out infinite; }
.pr-strike.storm .pr-ring-core { color: var(--sd-cal-storm); }
.pr-strike.storm .pr-ring-comet::before { background: var(--sd-cal-storm); box-shadow: 0 0 8px var(--sd-cal-storm); }
.pr-strike.storm .pr-strike-val { --sd-count-glow: color-mix(in srgb, var(--sd-cal-storm) 55%, transparent); color: var(--sd-cal-storm); }
.pr-strike.clear .pr-strike-val { color: var(--sd-cal-moon); animation: none; }
.pr-strike.clear .pr-ring-comet { display: none; }

/* watch-face tick scale along the right edge of the band */
.pr-strike-scale { position: absolute; inset: 0; pointer-events: none; }
.pr-tick {
  position: absolute; right: 14px; top: 50%;
  width: 8px; height: 1px; background: color-mix(in srgb, var(--sd-cal-moon) 35%, transparent);
  transform: rotate(calc(var(--t) * 30deg)) translateX(34px);
  transform-origin: -140px 0;
}
.pr-strike-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 42%, color-mix(in srgb, var(--sd-cal-hi) 8%, transparent) 50%, transparent 58%);
  background-size: 240% 100%; animation: sd-rail-flow 7s linear infinite;
}

/* ── telemetry lenses ── */
.pr-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 14px 22px 4px; }
.pr-lens {
  --tk: var(--sd-cal-core);
  position: relative; display: flex; flex-direction: column; gap: 3px; cursor: pointer; overflow: hidden;
  padding: 9px 11px 11px; border-radius: 13px; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: border-color 0.2s, background 0.2s;
}
.pr-lens.overdue { --tk: var(--sd-cal-storm); }
.pr-lens.done { --tk: var(--sd-cal-pin); }
.pr-lens.all { --tk: var(--sd-cal-moon); }
.pr-lens-top { display: flex; align-items: center; justify-content: space-between; color: var(--tk); }
.pr-lens-top b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.pr-lens-lbl { font-size: 7.5px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.pr-lens-bar {
  position: absolute; inset: auto 0 0 0; height: 2px;
  background: var(--tk); transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s var(--sd-spring);
}
.pr-lens.on { border-color: color-mix(in srgb, var(--tk) 48%, transparent); background: color-mix(in srgb, var(--tk) 8%, transparent); }
.pr-lens.on .pr-lens-bar { transform: scaleX(1); }
.pr-lens.on .pr-lens-lbl { color: var(--tk); }

/* ── rack body ── */
.pr-body { position: relative; z-index: 1; flex: 1; overflow-y: auto; padding: 10px 22px 16px; }
.pr-sect + .pr-sect { margin-top: 18px; }
.pr-sect-lbl {
  --tk: var(--sd-cal-core);
  display: flex; align-items: center; gap: 8px; margin: 0 0 8px;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.24em; color: var(--tk);
}
.pr-sect-lbl.storm { --tk: var(--sd-cal-storm); }
.pr-sect-lbl.moon { --tk: var(--sd-cal-moon); }
.pr-sect-lbl.pin { --tk: var(--sd-cal-pin); }
.pr-sect-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tk); box-shadow: 0 0 7px var(--tk); }
.pr-sect-n { font-size: 8.5px; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--tk) 14%, transparent); }
.pr-sect-rail { flex: 1; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--tk) 30%, transparent), transparent); }

.pr-list { position: relative; display: flex; flex-direction: column; gap: 10px; }
.pr-empty {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 64px 0; font-size: 9.5px; letter-spacing: 0.26em; text-align: center; color: var(--sd-text-dim);
}
.pr-empty.storm { color: var(--sd-cal-storm); }
.pr-empty p { margin: 0; }
.pr-empty-bell {
  position: relative; width: 68px; height: 68px; display: grid; place-items: center;
  border-radius: 50%; color: var(--sd-cal-core);
  background: var(--sd-cal-soft); border: 1px solid var(--sd-cal-brd);
}
.pr-empty-orbit {
  position: absolute; inset: -9px; border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--sd-cal-core) 35%, transparent);
  animation: sd-orbit-spin 14s linear infinite;
}
.pr-empty-orbit::before {
  content: ""; position: absolute; top: -2.5px; left: 50%;
  width: 5px; height: 5px; border-radius: 50%; transform: translateX(-50%);
  background: var(--sd-cal-core); box-shadow: 0 0 8px var(--sd-cal-core);
}

/* row */
.pr-row {
  --st: var(--sd-cal-core);
  position: relative; display: flex; gap: 11px; overflow: hidden;
  padding: 12px 13px 11px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: pr-in 0.45s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)) both;
  animation-delay: calc(var(--i) * 45ms);
  transition: border-color 0.2s, transform 0.2s var(--sd-spring), box-shadow 0.2s;
}
.pr-row:hover {
  border-color: color-mix(in srgb, var(--st) 38%, transparent);
  transform: translateX(3px);
  box-shadow: -3px 0 0 color-mix(in srgb, var(--st) 55%, transparent);
}
.pr-row.overdue { --st: var(--sd-cal-storm); }
.pr-row.done { --st: var(--sd-cal-pin); opacity: 0.72; }
@keyframes pr-in { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: none; } }

/* strike flash when a pin is marked done */
.pr-row.struck::after {
  content: ""; position: absolute; inset: -1px; border-radius: 14px; pointer-events: none;
  border: 2px solid var(--sd-cal-pin);
  animation: sd-cal-ring 0.48s ease-out both;
}

/* TransitionGroup: FLIP re-sort + burn-out leave */
.prr-move { transition: transform 0.45s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)); }
.prr-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; position: absolute; width: 100%; }
.prr-leave-to { opacity: 0; transform: translateX(26px) skewX(-4deg) scale(0.96); filter: saturate(2) brightness(1.3); }
.prr-enter-active { transition: opacity 0.35s ease, transform 0.35s var(--sd-spring); }
.prr-enter-from { opacity: 0; transform: translateY(10px); }

/* pin lamp */
.pr-lamp { flex: none; width: 20px; display: flex; justify-content: center; padding-top: 4px; }
.pr-lamp-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--st); box-shadow: 0 0 9px var(--st);
}
.pr-row.live .pr-lamp-dot { animation: sd-cal-pulse 2.4s ease-in-out infinite; }
.pr-row.done .pr-lamp-dot { box-shadow: none; opacity: 0.6; }

.pr-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.pr-row-top { display: flex; align-items: center; gap: 9px; min-width: 0; }
.pr-num {
  flex: none; padding: 0; cursor: pointer; background: none; border: none;
  font-size: 11.5px; font-weight: 700; color: var(--sd-cal-core); letter-spacing: 0.02em;
}
.pr-num:hover { text-decoration: underline; text-underline-offset: 3px; }
.pr-sub { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pr-note { margin: -2px 0 0; font-size: 11.5px; font-style: italic; color: var(--sd-text-secondary); }

/* actions */
.pr-acts { flex: none; display: inline-flex; gap: 5px; }
.pr-act {
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  width: 26px; height: 26px; border-radius: 8px;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: all 0.2s var(--sd-spring);
}
.pr-act:hover { transform: translateY(-1px); }
.pr-act:disabled { opacity: 0.4; cursor: default; transform: none; }
.pr-act.done:hover { color: var(--sd-cal-pin); border-color: color-mix(in srgb, var(--sd-cal-pin) 55%, transparent); background: var(--sd-cal-pin-soft); }
.pr-act.edit:hover, .pr-act.edit.on { color: var(--sd-cal-core); border-color: var(--sd-cal-brd); background: var(--sd-cal-soft); }
.pr-act.del:hover { color: var(--sd-cal-storm); border-color: color-mix(in srgb, var(--sd-cal-storm) 55%, transparent); background: var(--sd-cal-storm-soft); }

/* ── the fuse ── */
.pr-fuse {
  position: relative; height: 4px; border-radius: 999px;
  background: color-mix(in srgb, var(--sd-text-dim) 22%, transparent);
}
.pr-fuse-burn {
  position: absolute; inset: 0 auto 0 0; width: calc(var(--fuse, 0) * 100%);
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--st) 30%, transparent), var(--st));
  transition: width 0.9s linear;
}
.pr-fuse-spark {
  position: absolute; top: 50%; left: calc(var(--fuse, 0) * 100%);
  width: 9px; height: 9px; border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, #fff8e6 0%, var(--st) 55%, transparent 75%);
  box-shadow: 0 0 10px var(--st), 0 0 22px color-mix(in srgb, var(--st) 55%, transparent);
  transition: left 0.9s linear;
  animation: pr-flicker 0.9s ease-in-out infinite;
}
.pr-row.done .pr-fuse-spark { display: none; }
.pr-row.done .pr-fuse-burn { background: color-mix(in srgb, var(--sd-cal-stone) 45%, transparent); }
.pr-row.overdue .pr-fuse-burn { animation: pr-smolder 1.6s ease-in-out infinite; }
@keyframes pr-flicker {
  0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.72; transform: translate(-50%, -50%) scale(1.28); }
}
@keyframes pr-smolder {
  0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.45); }
}

.pr-when { display: flex; justify-content: space-between; gap: 10px; }
.pr-rel { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--st); font-variant-numeric: tabular-nums; }
.pr-abs { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: var(--sd-text-dim); }

/* ── inline editor ── */
.pr-edit {
  display: flex; flex-direction: column; gap: 9px;
  margin-top: 3px; padding: 11px; border-radius: 12px;
  background: var(--sd-cal-soft); border: 1px dashed var(--sd-cal-brd);
}
.pr-snooze { display: flex; flex-wrap: wrap; gap: 6px; }
.pr-snz {
  padding: 4px 10px; border-radius: 999px; cursor: pointer; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em;
  background: transparent; border: 1px solid var(--sd-cal-brd); color: var(--sd-cal-core);
  transition: all 0.16s;
}
.pr-snz:hover { background: var(--sd-cal-soft); transform: translateY(-1px); }
.pr-edit-note {
  width: 100%; resize: vertical; padding: 9px 11px; border-radius: 10px; font-size: 12.5px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  font-family: inherit;
}
.pr-edit-note:focus { outline: none; border-color: var(--sd-cal-core); }
.pr-edit-err { margin: 0; font-size: 11.5px; color: var(--sd-cal-storm); }
.pr-edit-btns { display: flex; justify-content: flex-end; gap: 8px; }

/* ── buttons / foot ── */
.pr-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 8px 15px; border-radius: 11px; font-size: 12px; font-weight: 700;
  border: 1px solid transparent;
}
.pr-btn.ghost { background: transparent; border-color: var(--sd-border-strong); color: var(--sd-text-secondary); }
.pr-btn.primary { background: var(--sd-cal-grad); color: #1a1206; box-shadow: var(--sd-cal-glow); }
.pr-btn.primary:disabled { opacity: 0.55; cursor: default; }
[data-theme="light"] .pr-btn.primary { color: #fffaf0; }
.pr-spin { animation: sd-spin-slow 0.9s linear infinite; }

.pr-foot {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 13px 22px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass);
}
.pr-foot-fact { font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-text-dim); }

@media (max-width: 560px) {
  .pr { width: 100vw; max-width: 100vw; }
  .pr-lenses { grid-template-columns: repeat(2, 1fr); }
}

/* ── reduced motion: park every decorative loop; keep state changes instant ── */
@media (prefers-reduced-motion: reduce) {
  .pr-strike-sheen, .pr-fuse-spark, .pr-row.live .pr-lamp-dot, .pr-ember,
  .pr-row.overdue .pr-fuse-burn, .pr-strike.storm .pr-ring,
  .pr-ring-comet, .pr-empty-orbit, .pr-strike-val { animation: none; }
  .pr-row { animation-duration: 0.01s; animation-delay: 0s; }
  .prr-move, .prr-leave-active, .prr-enter-active { transition-duration: 0.01s; }
  .pr-fuse-burn, .pr-fuse-spark, .pr-ring { transition: none; }
}
</style>
