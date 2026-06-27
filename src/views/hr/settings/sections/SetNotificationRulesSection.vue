<template>
  <div class="nr">
    <SetSectionHead eyebrow="Automation · Alerts" title="Notification" accent="Rules"
      accent-color="var(--set-gold)" :icon="BellRing"
      sub="Decide which lifecycle events fire which channels, and to whom. In-app delivery is live today; email / SMS / push / WhatsApp activate as those transports come online.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh"><RefreshCw :size="14" :class="{ 'set-spin': loading }" /></button>
      </template>
      <template #lenses>
        <div class="nr-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-gold)" @click="lens = 'all'"><Layers :size="12" /> All <b>{{ catalog.events?.length || 0 }}</b></button>
          <button class="set-chip" :class="{ on: lens === 'configured' }" style="--acc: var(--set-ok)" @click="setLens('configured')"><BellRing :size="12" /> Configured <b>{{ counts.configured }}</b></button>
          <button class="set-chip" :class="{ on: lens === 'multi' }" style="--acc: var(--set-orange)" @click="setLens('multi')"><Send :size="12" /> Multi-channel <b>{{ counts.multi }}</b></button>
          <button class="set-chip" :class="{ on: lens === 'inapp' }" style="--acc: var(--set-gold)" @click="setLens('inapp')"><Bell :size="12" /> In-app only <b>{{ counts.inapp }}</b></button>
          <button class="set-chip" :class="{ on: lens === 'unset' }" style="--acc: var(--set-unset)" @click="setLens('unset')"><BellOff :size="12" /> Unset <b>{{ counts.unset }}</b></button>
        </div>
      </template>

      <div class="nr-powers">
        <Share2 :size="12" /><span class="nr-powers-lab">Powers alerts for</span>
        <button v-for="m in poweredModules" :key="m.key" class="nr-mod" @click="goTo(m.to)"><component :is="m.icon" :size="12" /> {{ m.label }}</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument -->
    <DispatchCore :rules="rulesList" :events="catalog.events || []" :loading="loading" />

    <!-- channel reach equalizer -->
    <div v-if="!loading" class="nr-reach">
      <span class="nr-reach-lab"><AudioLines :size="13" /> Channel reach</span>
      <div class="nr-reach-bars">
        <div v-for="c in CHANNELS" :key="c.key" class="nr-reach-bar" :style="{ '--cc': c.color }">
          <span class="nr-reach-head"><component :is="c.icon" :size="12" /> {{ c.label }} <i v-if="!c.live">soon</i></span>
          <div class="nr-reach-track"><span class="nr-reach-fill" :style="{ width: reachPct(c.key) + '%' }" /></div>
          <b class="nr-reach-n"><SetCountUp :value="reach[c.key] || 0" /></b>
        </div>
      </div>
    </div>

    <!-- matrix -->
    <div v-if="loading" class="nr-skel"><span class="nr-skel-beam" /></div>
    <SetEmptyState v-else-if="!visibleGroups.length" :icon="BellOff" accent-color="var(--set-gold)"
      title="No events match this lens" sub="Switch the filter — every event either routes to a channel or falls back to default in-app.">
      <button class="set-btn set-btn-ghost" @click="lens = 'all'"><FilterX :size="14" /> Clear filter</button>
    </SetEmptyState>

    <div v-else class="nr-matrix-wrap">
      <div class="nr-matrix" role="table">
        <!-- header -->
        <div class="nr-head" role="row">
          <span class="nr-h nr-h-event">Event</span>
          <span class="nr-h nr-h-aud">Audience</span>
          <span v-for="c in CHANNELS" :key="c.key" class="nr-h nr-h-ch" :style="{ '--cc': c.color }">
            <span class="nr-h-ch-ic"><component :is="c.icon" :size="14" /></span>
            <span class="nr-h-ch-lab">{{ c.short }}</span>
            <i v-if="!c.live" class="nr-soon">soon</i>
          </span>
          <span class="nr-h nr-h-act" />
        </div>

        <!-- groups -->
        <template v-for="(g, gi) in visibleGroups" :key="g.module">
          <div class="nr-group" :style="{ '--gi': gi }" role="row">
            <component :is="moduleIcon(g.module)" :size="12" /> {{ moduleLabel(g.module) }}
            <span class="nr-group-n">{{ g.events.length }}</span>
          </div>
          <div v-for="(ev, ri) in g.events" :key="ev.event" class="nr-row" :style="{ '--ri': ri }" role="row">
            <span class="nr-c nr-c-event">{{ ev.label }}</span>
            <span class="nr-c nr-c-aud">
              <SetSelect :model-value="audienceByEvent[ev.event] || 'EMPLOYEE'" :options="AUDIENCES" accent-color="var(--set-gold)" @update:model-value="setAud(ev.event, $event)" />
            </span>
            <span v-for="c in CHANNELS" :key="c.key" class="nr-c nr-c-cell">
              <button v-if="c.live" class="nr-toggle" :class="{ on: hasChannel(ev.event, c.key), busy: busyKey === cellKey(ev.event) }"
                :style="{ '--cc': c.color }" @click="toggle(ev.event, c.key)" :title="`${c.label} · ${audienceByEvent[ev.event] || 'EMPLOYEE'}`">
                <span class="nr-toggle-ring" />
                <Check class="nr-toggle-tick" :size="14" />
              </button>
              <button v-else class="nr-toggle locked" :class="{ armed: hasChannel(ev.event, c.key) }"
                :style="{ '--cc': c.color }" @click="openLock(c, $event)" :title="`${c.label} — transport not wired yet`">
                <Lock :size="12" />
              </button>
            </span>
            <span class="nr-c nr-c-act">
              <button class="nr-act" title="Compose / templates" @click="openCompose(ev)"><Pencil :size="13" /></button>
              <button v-if="ruleAt(ev.event)" class="nr-act" title="Reset to default" @click="openReset(ev)"><RotateCcw :size="13" /></button>
            </span>
          </div>
        </template>
      </div>
    </div>

    <NotificationRuleModal :open="composeOpen" :event="composeEvent" :rules-by-key="ruleMap"
      :initial-audience="composeAud" :saving="saving" @close="composeOpen = false" @save="save" @reset="onModalReset" />
    <NotificationResetModal :open="resetOpen" :loading="resetting" :target="resetTarget" :event="resetEvent"
      @close="resetOpen = false" @confirm="doReset" />

    <!-- locked-channel "coming soon" popover (ultra-modern) -->
    <teleport to="body">
      <transition name="nr-lockpop">
        <div v-if="lock.open" class="nr-lockpop-anchor" :style="lock.style" @mousedown.stop>
          <div class="nr-lockpop" :style="{ '--cc': lock.ch?.color }">
            <span class="nr-lockpop-arrow" aria-hidden="true" />
            <span class="nr-lockpop-sheen" aria-hidden="true" />
            <div class="nr-lockpop-head">
              <span class="nr-lockpop-ic">
                <component :is="lock.ch?.icon" :size="15" />
                <span class="nr-lockpop-lock"><Lock :size="9" /></span>
              </span>
              <div class="nr-lockpop-id"><b>{{ lock.ch?.label }}</b><span>Transport not wired yet</span></div>
              <i class="nr-lockpop-soon">soon</i>
            </div>
            <p class="nr-lockpop-body">This channel isn’t connected yet, so it can’t be switched on. The moment {{ lock.ch?.label }} delivery is wired, this toggle goes live — and any saved routing activates automatically.</p>
            <div class="nr-lockpop-bar"><span class="nr-lockpop-fill" /></div>
            <span class="nr-lockpop-foot"><Bell :size="10" /> In-app is delivering today</span>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { BellRing, BellOff, Bell, RefreshCw, Check, Layers, Send, Share2, AudioLines, Pencil, RotateCcw, FilterX, Lock } from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import SetSelect from '../components/SetSelect.vue'
import DispatchCore from '../components/DispatchCore.vue'
import NotificationRuleModal from '../components/NotificationRuleModal.vue'
import NotificationResetModal from '../components/NotificationResetModal.vue'
import { notificationCatalog, listNotificationRules, upsertNotificationRule, deleteNotificationRule, errText } from '../composables/useHrSettings'
import { CHANNELS, AUDIENCES, MODULE_META, MODULE_ORDER, moduleIcon, moduleLabel } from '../composables/notifyMeta'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const catalog = ref({ events: [], channels: [], audiences: [] })
const rulesList = ref([])                 // raw rows (for DispatchCore + reach)
const ruleMap = reactive({})              // "EVENT|AUD" -> { id, channels[], is_active, template_title, template_body }
const audienceByEvent = reactive({})      // event -> selected audience
const busyKey = ref(null)
const lens = ref('all')

const eventMeta = computed(() => Object.fromEntries((catalog.value.events || []).map(e => [e.event, e])))
const poweredModules = computed(() => {
  const mods = new Set((catalog.value.events || []).map(e => e.module))
  return MODULE_ORDER.filter(m => mods.has(m)).map(m => ({ key: m, ...MODULE_META[m] }))
})

async function reload() {
  loading.value = true
  try {
    const [cat, rules] = await Promise.all([notificationCatalog(), listNotificationRules()])
    catalog.value = cat
    rulesList.value = rules || []
    Object.keys(ruleMap).forEach(k => delete ruleMap[k])
    for (const r of rules) ruleMap[`${r.event}|${r.audience}`] = { id: r.id, event: r.event, audience: r.audience, channels: r.channels || [], is_active: r.is_active, template_title: r.template_title, template_body: r.template_body }
    for (const e of cat.events || []) if (!audienceByEvent[e.event]) audienceByEvent[e.event] = 'EMPLOYEE'
  } catch (e) { toast.error(errText(e, 'Failed to load notification rules')) }
  finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const cellKey = (event) => `${event}|${audienceByEvent[event] || 'EMPLOYEE'}`
const ruleAt = (event) => ruleMap[cellKey(event)] || null
const hasChannel = (event, ch) => (ruleAt(event)?.channels || []).includes(ch)
const setAud = (event, aud) => { audienceByEvent[event] = aud }

const reach = computed(() => {
  const r = {}; for (const c of CHANNELS) r[c.key] = 0
  for (const rule of rulesList.value) { if (!rule.is_active) continue; for (const ch of (rule.channels || [])) if (r[ch] != null) r[ch]++ }
  return r
})
const reachMax = computed(() => Math.max(1, ...CHANNELS.map(c => reach.value[c.key] || 0)))
const reachPct = (k) => Math.round(((reach.value[k] || 0) / reachMax.value) * 100)

const counts = computed(() => {
  let configured = 0, multi = 0, inapp = 0, unset = 0
  for (const e of catalog.value.events || []) {
    const r = ruleMap[`${e.event}|${audienceByEvent[e.event] || 'EMPLOYEE'}`]
    const chs = r?.channels || []
    if (r && r.is_active && chs.length) { configured++; if (chs.length > 1) multi++; if (chs.length === 1 && chs[0] === 'IN_APP') inapp++ }
    else unset++
  }
  return { configured, multi, inapp, unset }
})
const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
function passesLens(e) {
  const r = ruleMap[`${e.event}|${audienceByEvent[e.event] || 'EMPLOYEE'}`]
  const chs = r?.channels || []
  const active = !!r && r.is_active && chs.length > 0
  switch (lens.value) {
    case 'configured': return active
    case 'multi': return active && chs.length > 1
    case 'inapp': return active && chs.length === 1 && chs[0] === 'IN_APP'
    case 'unset': return !active
    default: return true
  }
}
const visibleGroups = computed(() => {
  const byMod = {}
  for (const e of catalog.value.events || []) { if (!passesLens(e)) continue; (byMod[e.module] = byMod[e.module] || []).push(e) }
  const order = [...MODULE_ORDER.filter(m => byMod[m]), ...Object.keys(byMod).filter(m => !MODULE_ORDER.includes(m))]
  return order.map(m => ({ module: m, events: byMod[m] }))
})

const goTo = (to) => { if (to) router.push(to) }

// ── inline toggle (optimistic upsert; templates preserved server-side) ──
async function toggle(event, ch) {
  const aud = audienceByEvent[event] || 'EMPLOYEE'
  const key = `${event}|${aud}`
  const cur = new Set(ruleMap[key]?.channels || [])
  cur.has(ch) ? cur.delete(ch) : cur.add(ch)
  const channels = [...cur]
  busyKey.value = key
  const prev = ruleMap[key] ? { ...ruleMap[key] } : null
  ruleMap[key] = { ...(ruleMap[key] || { is_active: true }), channels, is_active: true }
  try {
    const row = await upsertNotificationRule({ event, audience: aud, channels })
    applyRow(row)
  } catch (e) {
    if (prev) ruleMap[key] = prev; else delete ruleMap[key]
    toast.error(errText(e, 'Failed to update rule'))
  } finally { busyKey.value = null }
}

function applyRow(row) {
  const key = `${row.event}|${row.audience}`
  ruleMap[key] = { id: row.id, event: row.event, audience: row.audience, channels: row.channels || [], is_active: row.is_active, template_title: row.template_title, template_body: row.template_body }
  const i = rulesList.value.findIndex(r => r.id === row.id)
  if (i >= 0) rulesList.value.splice(i, 1, row); else rulesList.value.push(row)
}

// ── compose modal ──
const composeOpen = ref(false)
const composeEvent = ref(null)
const composeAud = ref('EMPLOYEE')
const saving = ref(false)
function openCompose(ev) { composeEvent.value = ev; composeAud.value = audienceByEvent[ev.event] || 'EMPLOYEE'; composeOpen.value = true }
async function save(payload) {
  saving.value = true
  try {
    const row = await upsertNotificationRule(payload)
    applyRow(row)
    audienceByEvent[payload.event] = payload.audience
    toast.success('Notification rule saved')
    composeOpen.value = false
  } catch (e) { toast.error(errText(e, 'Failed to save rule')) }
  finally { saving.value = false }
}

// ── reset modal ──
const resetOpen = ref(false)
const resetTarget = ref(null)
const resetEvent = ref(null)
const resetting = ref(false)
function openReset(ev) { resetTarget.value = ruleAt(ev.event); resetEvent.value = ev; resetOpen.value = true }
function onModalReset(rule) { composeOpen.value = false; resetTarget.value = rule; resetEvent.value = eventMeta.value[rule?.event] || null; resetOpen.value = true }
async function doReset(reason) {
  if (!resetTarget.value?.id) return
  resetting.value = true
  try {
    await deleteNotificationRule(resetTarget.value.id, reason)
    toast.success('Rule reset to default in-app')
    resetOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to reset rule')) }
  finally { resetting.value = false }
}

// ── locked-channel popover (transport not wired yet) ──
const lock = reactive({ open: false, ch: null, style: {} })
let lockTimer = null
function openLock(ch, e) {
  const r = e.currentTarget.getBoundingClientRect()
  lock.ch = ch
  lock.style = { left: `${Math.round(r.left + r.width / 2)}px`, top: `${Math.round(r.top - 8)}px` }
  lock.open = true
  bindLock()
  clearTimeout(lockTimer)
  lockTimer = setTimeout(closeLock, 4600)
}
function closeLock() { lock.open = false; unbindLock() }
const onLockScroll = () => closeLock()
const onLockDown = () => closeLock()
function bindLock() {
  window.addEventListener('scroll', onLockScroll, true)
  window.addEventListener('resize', onLockScroll)
  document.addEventListener('mousedown', onLockDown)
}
function unbindLock() {
  window.removeEventListener('scroll', onLockScroll, true)
  window.removeEventListener('resize', onLockScroll)
  document.removeEventListener('mousedown', onLockDown)
}
onBeforeUnmount(() => { unbindLock(); clearTimeout(lockTimer) })
</script>

<style scoped>
.nr { display: flex; flex-direction: column; gap: 16px; }
.nr-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.nr-lenses .set-chip b { color: var(--set-text); }

.nr-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); position: relative; z-index: 1; }
.nr-powers > svg { color: var(--set-text-dim); }
.nr-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nr-mod { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.nr-mod:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 40%, transparent); transform: translateY(-1px); }
.nr-mod :deep(svg) { color: var(--set-gold); }

/* reach equalizer */
.nr-reach { display: flex; flex-direction: column; gap: 11px; padding: 15px 17px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.nr-reach-lab { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-gold); }
.nr-reach-lab :deep(svg) { color: var(--set-gold); }
.nr-reach-bars { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.nr-reach-bar { display: flex; flex-direction: column; gap: 6px; }
.nr-reach-head { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; color: var(--set-text-secondary); }
.nr-reach-head :deep(svg) { color: var(--cc); }
.nr-reach-head i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); padding: 1px 5px; border-radius: 999px; background: var(--set-surface-elevated); }
.nr-reach-track { height: 7px; border-radius: 999px; overflow: hidden; background: var(--set-trace-idle); }
.nr-reach-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--cc) 55%, transparent), var(--cc));
  box-shadow: 0 0 10px -2px var(--cc); transition: width 0.7s var(--set-spring); }
.nr-reach-n { font-family: var(--set-mono); font-size: 13px; font-weight: 800; color: var(--set-text); }

/* matrix */
.nr-matrix-wrap { overflow-x: auto; border-radius: 18px; border: 1px solid var(--set-border); background: var(--set-surface); box-shadow: var(--set-card-shadow); }
.nr-matrix { min-width: 800px; display: flex; flex-direction: column; }
.nr-head { display: grid; grid-template-columns: minmax(170px, 1.4fr) 162px repeat(5, 56px) 70px; align-items: center; gap: 4px;
  padding: 12px 16px; position: sticky; top: 0; z-index: 2; background: var(--set-panel); border-bottom: 1px solid var(--set-border-strong); }
.nr-h { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-muted); }
.nr-h-ch { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.nr-h-ch-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--cc); background: color-mix(in srgb, var(--cc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 26%, transparent); }
.nr-h-ch-lab { font-size: 9px; }
.nr-soon { font-style: normal; font-size: 7px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }

.nr-group { display: flex; align-items: center; gap: 7px; padding: 8px 16px; background: color-mix(in srgb, var(--set-gold) 5%, transparent);
  border-top: 1px solid var(--set-border); border-bottom: 1px solid var(--set-border);
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-secondary);
  animation: set-deal 0.45s var(--set-spring) both; animation-delay: calc(var(--gi) * 0.05s); }
.nr-group > svg { color: var(--set-gold); }
.nr-group-n { display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 9px; font-weight: 800;
  color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }

.nr-row { display: grid; grid-template-columns: minmax(170px, 1.4fr) 162px repeat(5, 56px) 70px; align-items: center; gap: 4px;
  padding: 7px 16px; border-bottom: 1px solid var(--set-border); transition: background 0.18s;
  animation: nr-row-in 0.4s var(--set-spring) both; animation-delay: calc(var(--ri) * 0.03s); }
@keyframes nr-row-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
.nr-row:hover { background: color-mix(in srgb, var(--set-gold) 4%, transparent); }
.nr-c-event { font-size: 13px; font-weight: 600; color: var(--set-text); }
.nr-c-aud { padding-right: 6px; }
.nr-c-cell { display: grid; place-items: center; }
.nr-c-act { display: inline-flex; gap: 5px; justify-content: flex-end; }

.nr-toggle { position: relative; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; cursor: pointer;
  color: transparent; background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); }
.nr-toggle:hover { border-color: color-mix(in srgb, var(--cc) 45%, transparent); transform: translateY(-1px); }
.nr-toggle-tick { transform: scale(0.3); opacity: 0; transition: transform 0.3s var(--set-spring), opacity 0.2s; }
.nr-toggle.on { color: #1a1206; background: var(--cc); border-color: var(--cc); box-shadow: 0 0 16px -3px var(--cc); }
.nr-toggle.on .nr-toggle-tick { transform: scale(1); opacity: 1; }
.nr-toggle-ring { position: absolute; inset: -3px; border-radius: 13px; border: 2px solid var(--cc); opacity: 0; }
.nr-toggle.on .nr-toggle-ring { animation: nr-ignite 0.5s ease-out; }
@keyframes nr-ignite { 0% { opacity: 0.8; transform: scale(0.75); } 100% { opacity: 0; transform: scale(1.45); } }
.nr-toggle.busy { opacity: 0.55; pointer-events: none; }

/* locked (transport-pending) channel cell */
.nr-toggle.locked { cursor: help; color: var(--set-text-dim); border-style: dashed;
  background: repeating-linear-gradient(45deg, var(--set-surface-elevated) 0 6px, color-mix(in srgb, var(--set-unset) 8%, var(--set-surface-elevated)) 6px 12px); }
.nr-toggle.locked:hover { color: var(--cc); border-color: color-mix(in srgb, var(--cc) 45%, transparent); transform: translateY(-1px); box-shadow: 0 0 14px -4px var(--cc); }
.nr-toggle.locked.armed { color: var(--cc); border-style: solid; border-color: color-mix(in srgb, var(--cc) 40%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cc) 18%, transparent); }
.nr-toggle.locked.armed::after { content: ''; position: absolute; top: 3px; right: 3px; width: 5px; height: 5px; border-radius: 50%; background: var(--cc); box-shadow: 0 0 6px var(--cc); animation: nr-armed 1.8s ease-in-out infinite; }
@keyframes nr-armed { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

.nr-act { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; color: var(--set-text-muted);
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.nr-act:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 40%, transparent); transform: translateY(-1px); }

/* locked-channel popover */
.nr-lockpop-anchor { position: fixed; z-index: 6000; transform: translate(-50%, -100%); }
.nr-lockpop { position: relative; width: 256px; padding: 13px 14px; border-radius: 14px; overflow: hidden;
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--cc) 36%, var(--set-border-strong));
  box-shadow: 0 26px 60px -26px rgba(0, 0, 0, 0.8), 0 0 0 1px color-mix(in srgb, var(--cc) 12%, transparent), 0 0 32px -10px color-mix(in srgb, var(--cc) 45%, transparent);
  backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); }
.nr-lockpop-arrow { position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; transform: translateX(-50%) rotate(45deg);
  background: var(--set-surface-elevated); border-right: 1px solid color-mix(in srgb, var(--cc) 36%, var(--set-border-strong)); border-bottom: 1px solid color-mix(in srgb, var(--cc) 36%, var(--set-border-strong)); }
.nr-lockpop-sheen { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(120deg, transparent 30%, color-mix(in srgb, var(--cc) 14%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: nr-sheen 2.6s ease infinite; }
@keyframes nr-sheen { 0% { background-position: 180% 0; } 100% { background-position: -80% 0; } }
.nr-lockpop-head { position: relative; display: flex; align-items: center; gap: 10px; }
.nr-lockpop-ic { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--cc); background: color-mix(in srgb, var(--cc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 30%, transparent); }
.nr-lockpop-lock { position: absolute; right: -4px; bottom: -4px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #1a1206; background: var(--set-gold); border: 2px solid var(--set-surface-elevated); animation: nr-lockpulse 1.8s ease-in-out infinite; }
@keyframes nr-lockpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
.nr-lockpop-id { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.nr-lockpop-id b { font-size: 13px; font-weight: 800; color: var(--set-text); }
.nr-lockpop-id span { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.nr-lockpop-soon { font-style: normal; font-size: 8px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cc); padding: 3px 7px; border-radius: 999px; background: color-mix(in srgb, var(--cc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 30%, transparent); }
.nr-lockpop-body { position: relative; margin: 9px 0 0; font-size: 11px; line-height: 1.5; color: var(--set-text-secondary); }
.nr-lockpop-bar { position: relative; height: 4px; margin-top: 10px; border-radius: 999px; overflow: hidden; background: var(--set-trace-idle); }
.nr-lockpop-fill { position: absolute; top: 0; bottom: 0; left: 0; width: 40%; border-radius: 999px; background: linear-gradient(90deg, transparent, var(--cc), transparent); animation: nr-charge 1.9s ease-in-out infinite; }
@keyframes nr-charge { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
.nr-lockpop-foot { position: relative; display: inline-flex; align-items: center; gap: 5px; margin-top: 9px; font-size: 9.5px; font-weight: 700; color: var(--set-ok); }
.nr-lockpop-foot :deep(svg) { color: var(--set-ok); }
.nr-lockpop-enter-active { transition: opacity 0.26s ease, transform 0.36s var(--set-spring); }
.nr-lockpop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.nr-lockpop-enter-from, .nr-lockpop-leave-to { opacity: 0; transform: translate(-50%, -100%) translateY(10px) scale(0.94); }

.nr-skel { position: relative; overflow: hidden; height: 280px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.nr-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-gold) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .nr-skel-beam, .nr-group, .nr-row, .nr-toggle, .nr-toggle-tick, .nr-toggle.on .nr-toggle-ring, .nr-reach-fill,
  .nr-toggle.locked.armed::after, .nr-lockpop-sheen, .nr-lockpop-lock, .nr-lockpop-fill { animation: none; transition: none; }
}
</style>
