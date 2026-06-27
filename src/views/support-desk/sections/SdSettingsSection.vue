<template>
  <div class="sd-settings">
    <div class="sd-toolbar">
      <div class="sd-toolbar-lead">
        <h2 class="sd-toolbar-title">Support Desk Settings</h2>
        <p class="sd-toolbar-sub">CSAT, portal branding, SLA defaults and other operational toggles.</p>
      </div>
    </div>

    <div v-if="loadingSettings" class="sd-empty-state">
      <Settings :size="34" />
      <p>Loading settings…</p>
    </div>

    <div v-else class="sd-cards">
      <Motion
        v-for="(card, i) in cards"
        :key="card.key"
        as="div"
        class="sd-set-card sd-card"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="sd-set-head">
          <span class="sd-set-badge"><component :is="card.icon" :size="18" /></span>
          <div class="sd-set-titles">
            <h3 class="sd-set-title">{{ card.title }}</h3>
            <p class="sd-set-sub">{{ card.subtitle }}</p>
          </div>
          <span v-if="!card.existing" class="sd-set-new">not set</span>
        </div>

        <!-- CSAT -->
        <div v-if="card.key === 'csat'" class="sd-set-body">
          <label class="sd-toggle-row">
            <span class="sd-label">Collect CSAT ratings</span>
            <span class="sd-switch" :class="{ on: card.value.enabled }" role="switch" :aria-checked="card.value.enabled" @click="card.value.enabled = !card.value.enabled"><span class="sd-knob" /></span>
          </label>
          <div class="sd-grid2">
            <label class="sd-field"><span class="sd-label">Scale (1–10)</span>
              <input type="number" min="1" max="10" step="1" class="sd-input sd-input-num" v-model.number="card.value.scale" /></label>
            <div class="sd-field"><span class="sd-label">Ask on</span>
              <SdSelect v-model="card.value.ask_on" :options="askOnOpts" placeholder="When to ask" /></div>
          </div>
        </div>

        <!-- Portal -->
        <div v-else-if="card.key === 'portal'" class="sd-set-body">
          <div class="sd-grid2">
            <label class="sd-field"><span class="sd-label">Brand name</span>
              <input type="text" class="sd-input" v-model="card.value.brand_name" placeholder="Acme Support" /></label>
            <label class="sd-field"><span class="sd-label">Accent color</span>
              <span class="sd-color-row">
                <input type="color" class="sd-color" v-model="card.value.accent" />
                <input type="text" class="sd-input" v-model="card.value.accent" placeholder="#fb923c" />
              </span>
            </label>
          </div>
        </div>

        <!-- SLA defaults -->
        <div v-else-if="card.key === 'sla'" class="sd-set-body">
          <label class="sd-toggle-row">
            <span class="sd-label">Count business hours only</span>
            <span class="sd-switch" :class="{ on: card.value.business_hours_only }" role="switch" :aria-checked="card.value.business_hours_only" @click="card.value.business_hours_only = !card.value.business_hours_only"><span class="sd-knob" /></span>
          </label>
          <label class="sd-field"><span class="sd-label">Default SLA package</span>
            <input type="text" class="sd-input" v-model="card.value.default_package" placeholder="Premium 24x7" /></label>
        </div>

        <!-- Unknown key → JSON editor -->
        <div v-else class="sd-set-body">
          <label class="sd-field"><span class="sd-label">Value (JSON)</span>
            <textarea class="sd-input sd-input-json" rows="6" v-model="card.raw" spellcheck="false" /></label>
          <p v-if="card.jsonError" class="sd-form-error">{{ card.jsonError }}</p>
        </div>

        <div class="sd-set-foot">
          <span v-if="card.error" class="sd-form-error">{{ card.error }}</span>
          <span v-else-if="card.savedAt" class="sd-saved"><Check :size="13" /> Saved</span>
          <span class="sd-foot-spacer" />
          <button class="sd-btn sd-btn-primary" type="button" :disabled="card.saving" @click="save(card)">
            {{ card.saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Settings, SmilePlus, Palette, Gauge, FileJson, Check } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import { listSettings, upsertSetting } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const askOnOpts = [
  { value: 'resolved', label: 'On resolve' },
  { value: 'closed', label: 'On close' },
]

// Known settings + their default value shapes (so a missing key still renders a card).
const KNOWN = [
  { key: 'csat', title: 'CSAT Survey', subtitle: 'Customer satisfaction collection', icon: SmilePlus,
    defaults: () => ({ enabled: true, scale: 5, ask_on: 'resolved' }) },
  { key: 'portal', title: 'Portal Branding', subtitle: 'Client-facing portal identity', icon: Palette,
    defaults: () => ({ brand_name: '', accent: '#fb923c' }) },
  { key: 'sla', title: 'SLA Defaults', subtitle: 'How SLA clocks are computed', icon: Gauge,
    defaults: () => ({ business_hours_only: false, default_package: '' }) },
]

const loadingSettings = ref(true)
const cards = ref([])

const buildCard = (key, title, subtitle, icon, value, existing, isJson) => ({
  key, title, subtitle, icon,
  value: isJson ? null : value,
  raw: isJson ? JSON.stringify(value ?? {}, null, 2) : '',
  isJson,
  existing,
  saving: false,
  error: '',
  jsonError: '',
  savedAt: 0,
})

const reload = async () => {
  loadingSettings.value = true
  let rows = []
  try { rows = await listSettings() } catch { rows = [] }
  if (!Array.isArray(rows)) rows = []
  const byKey = {}
  for (const r of rows) byKey[r.key] = r

  const built = []
  // Known cards first (rendered even if missing, seeded with defaults).
  for (const def of KNOWN) {
    const row = byKey[def.key]
    const value = { ...def.defaults(), ...(row && typeof row.value === 'object' && row.value ? row.value : {}) }
    built.push(buildCard(def.key, def.title, def.subtitle, def.icon, value, !!row, false))
  }
  // Any other/unknown keys → JSON editor cards.
  for (const r of rows) {
    if (KNOWN.some(k => k.key === r.key)) continue
    built.push(buildCard(r.key, r.key, 'Custom setting', FileJson, r.value, true, true))
  }
  cards.value = built
  loadingSettings.value = false
}

const save = async (card) => {
  card.error = ''
  card.jsonError = ''
  let value
  if (card.isJson) {
    try { value = JSON.parse(card.raw) }
    catch { card.jsonError = 'Invalid JSON — fix the syntax before saving.'; return }
  } else {
    value = { ...card.value }
  }
  card.saving = true
  try {
    await upsertSetting({ key: card.key, value })
    await reload()
    emit('changed')
    const fresh = cards.value.find(c => c.key === card.key)
    if (fresh) fresh.savedAt = Date.now()
  } catch (e) {
    const fresh = cards.value.find(c => c.key === card.key) || card
    fresh.error = e?.response?.data?.detail || 'Save failed.'
  } finally {
    const fresh = cards.value.find(c => c.key === card.key) || card
    fresh.saving = false
  }
}

onMounted(reload)
</script>

<style scoped>
.sd-settings { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
.sd-toolbar-lead { min-width: 0; }
.sd-toolbar-title { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0 0 3px; }
.sd-toolbar-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }

.sd-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; align-items: start; }

.sd-set-card { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.sd-set-head { display: flex; align-items: flex-start; gap: 12px; }
.sd-set-badge { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); }
.sd-set-titles { flex: 1; min-width: 0; }
.sd-set-title { font-size: 15px; font-weight: 700; color: var(--sd-text); margin: 0 0 2px; }
.sd-set-sub { font-size: 12px; color: var(--sd-text-muted); margin: 0; }
.sd-set-new { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-steel); background: var(--sd-steel-soft); padding: 3px 8px; border-radius: 6px; flex-shrink: 0; }

.sd-set-body { display: flex; flex-direction: column; gap: 13px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 480px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-input-num { font-family: var(--sd-mono); }
.sd-input-json { font-family: var(--sd-mono); font-size: 12.5px; line-height: 1.5; resize: vertical; }

.sd-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sd-switch { width: 42px; height: 24px; border-radius: 999px; background: var(--sd-steel-soft); border: 1px solid var(--sd-border-strong); position: relative; cursor: pointer; transition: background 0.22s var(--sd-spring), border-color 0.22s var(--sd-spring); flex-shrink: 0; }
.sd-switch.on { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sd-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--sd-steel); transition: transform 0.22s var(--sd-spring), background 0.22s var(--sd-spring); }
.sd-switch.on .sd-knob { transform: translateX(18px); background: var(--sd-amber); }

.sd-color-row { display: flex; align-items: center; gap: 8px; }
.sd-color { width: 42px; height: 42px; padding: 2px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); cursor: pointer; flex-shrink: 0; }

.sd-set-foot { display: flex; align-items: center; gap: 10px; padding-top: 4px; border-top: 1px solid var(--sd-border); margin-top: auto; }
.sd-foot-spacer { flex: 1; }
.sd-saved { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--sd-success); }
.sd-form-error { color: var(--sd-danger); font-size: 12px; margin: 0; }

.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
</style>
