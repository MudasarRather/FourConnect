<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="cm-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="div" class="cm" :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="cm-aura" aria-hidden="true" />

          <header class="cm-head">
            <span class="cm-head-ic"><Tags :size="17" /></span>
            <div>
              <h3>{{ editing ? 'Edit gate' : 'New travel category' }}</h3>
              <p>Define how a class of tour is classified, themed and what extra it asks travellers.</p>
            </div>
            <button class="cm-x" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div class="cm-body">
            <!-- ═══ live preview placard ═══ -->
            <aside class="cm-prev">
              <span class="cm-prev-eyebrow"><Sparkles :size="11" /> Live preview</span>
              <article class="pv" :style="{ '--c': form.color_hex || '#fbbf24' }">
                <span class="pv-glow" aria-hidden="true" />
                <span class="pv-spine" aria-hidden="true" />
                <span class="pv-stamp" :class="stampTone">{{ stampText }}</span>
                <div class="pv-head">
                  <span class="pv-ico"><component :is="iconComp" :size="20" /></span>
                  <div class="pv-id">
                    <h4>{{ form.name || 'Category name' }}</h4>
                    <span class="pv-code trv-mono">{{ previewCode }}</span>
                  </div>
                </div>
                <p class="pv-desc" :class="{ ph: !form.description }">{{ form.description || 'Short description shows here…' }}</p>
                <div class="pv-chips">
                  <span class="pv-chip" :class="{ live: fields.length }"><SlidersHorizontal :size="11" /> {{ fields.length }} field{{ fields.length === 1 ? '' : 's' }}</span>
                  <span v-if="form.default_travel_type" class="pv-chip"><Plane :size="11" /> {{ form.default_travel_type }}</span>
                  <span v-if="form.requires_attachment" class="pv-chip warn"><Paperclip :size="11" /> Proof</span>
                  <span v-if="!form.is_active" class="pv-chip off"><CircleDot :size="11" /> Inactive</span>
                </div>
              </article>
              <p class="cm-prev-hint"><Compass :size="12" /> This placard is exactly how the gate appears on the concourse.</p>
            </aside>

            <!-- ═══ form ═══ -->
            <div class="cm-form">
              <!-- identity -->
              <section class="grp" :style="fT(0)">
                <span class="grp-h"><Hash :size="12" /> Identity</span>
                <div class="row two">
                  <div v-if="!editing" class="fld">
                    <label>Code <i>*</i></label>
                    <input v-model="form.code" class="inp trv-mono" placeholder="CLIENT_VISIT" maxlength="40" @input="onCodeInput" />
                    <small class="hint">Locked once saved · UPPER_SNAKE</small>
                  </div>
                  <div class="fld" :class="{ wide: editing }">
                    <label>Name <i>*</i></label>
                    <input v-model="form.name" class="inp" placeholder="Client Visit" maxlength="80" />
                  </div>
                  <div class="fld sort">
                    <label>Order</label>
                    <input v-model="form.sort_order" class="inp trv-mono" placeholder="10" maxlength="8" />
                  </div>
                </div>
                <div class="fld">
                  <label>Description</label>
                  <textarea v-model="form.description" class="inp" rows="2" maxlength="400" placeholder="When should travellers pick this category?" />
                </div>
              </section>

              <!-- appearance -->
              <section class="grp" :style="fT(1)">
                <span class="grp-h"><Palette :size="12" /> Appearance</span>
                <label class="sub-l">Icon</label>
                <div class="icon-grid">
                  <button v-for="ic in CATEGORY_ICONS" :key="ic.name" type="button" class="ic-btn"
                    :class="{ on: form.icon === ic.name }" :style="{ '--c': form.color_hex || '#fbbf24' }"
                    :title="ic.name" @click="form.icon = ic.name">
                    <component :is="ic.icon" :size="16" />
                  </button>
                </div>
                <label class="sub-l">Accent</label>
                <div class="swatches">
                  <button v-for="sw in SWATCHES" :key="sw" type="button" class="sw" :class="{ on: form.color_hex === sw }"
                    :style="{ '--s': sw }" @click="form.color_hex = sw" />
                  <label class="sw custom" :style="{ '--s': form.color_hex }" title="Custom colour">
                    <input type="color" v-model="form.color_hex" />
                    <Palette :size="12" />
                  </label>
                </div>
              </section>

              <!-- behaviour -->
              <section class="grp" :style="fT(2)">
                <span class="grp-h"><SlidersHorizontal :size="12" /> Behaviour</span>
                <div class="fld">
                  <label>Default travel type</label>
                  <TrvSelect v-model="form.default_travel_type" :options="typeOpts" placeholder="No default — traveller picks" />
                  <small class="hint">Pre-selects this travel type when a request chooses the category.</small>
                </div>
                <div class="toggles">
                  <div class="tg"><div><b>Require attachment</b><span>Force a supporting document on every request</span></div><TrvSwitch v-model="form.requires_attachment" /></div>
                  <div class="tg"><div><b>Active</b><span>Show on the concourse & in the request form</span></div><TrvSwitch v-model="form.is_active" /></div>
                </div>
              </section>

              <!-- field builder -->
              <section class="grp" :style="fT(3)">
                <div class="grp-h between">
                  <span><Sparkles :size="12" /> Request form fields <span class="cnt">{{ fields.length }}</span></span>
                  <Motion as="button" type="button" class="add-f" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="addField">
                    <Plus :size="13" /> Add field
                  </Motion>
                </div>
                <p class="fb-note">These appear on the travel request after a traveller picks this category.</p>
                <Presence>
                  <Motion v-for="(f, i) in fields" :key="f.uid" as="div" class="fb-card" :class="{ err: fieldErr(f, i) }"
                    :initial="{ opacity: 0, y: -8, height: 0 }" :animate="{ opacity: 1, y: 0, height: 'auto' }"
                    :exit="{ opacity: 0, y: -8, height: 0 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                    <div class="fb-row1">
                      <GripVertical :size="14" class="grip" />
                      <input v-model="f.label" class="inp sm flex" placeholder="Field label (e.g. Client name)" @input="onLabel(f)" />
                      <TrvSelect v-model="f.type" :options="FIELD_TYPES" size="sm" class="fb-type" />
                      <TrvSwitch v-model="f.required" off-label="Optional" on-label="Required" />
                      <button type="button" class="ic danger" title="Remove" @click="removeField(f.uid)"><Trash2 :size="13" /></button>
                    </div>
                    <div class="fb-row2">
                      <span class="fb-key trv-mono"><Hash :size="10" /> {{ f.key || 'key' }}</span>
                      <input v-model="f.placeholder" class="inp sm flex" placeholder="Placeholder / hint (optional)" />
                    </div>
                    <div v-if="f.type === 'select'" class="fb-row3">
                      <label><List :size="11" /> Options — one per line</label>
                      <textarea v-model="f.optionsText" class="inp sm" rows="2" placeholder="Option A&#10;Option B&#10;Option C" />
                    </div>
                  </Motion>
                </Presence>
                <div v-if="!fields.length" class="fb-empty">
                  <Sparkles :size="15" /> No extra fields — travellers fill only the standard form.
                </div>
              </section>
            </div>
          </div>

          <footer class="cm-foot">
            <span v-if="dupKey" class="foot-warn"><CircleDot :size="12" /> Field keys must be unique</span>
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || !valid" :whileHover="valid && !busy ? { y: -2, scale: 1.02 } : {}" :whileTap="valid && !busy ? { scale: 0.97 } : {}" @click="save">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> {{ editing ? 'Save changes' : 'Create category' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Tags, X, Sparkles, SlidersHorizontal, Plane, Paperclip, CircleDot, Compass,
  Hash, Palette, Plus, Trash2, GripVertical, List, Check, Loader2,
  Type, Pilcrow, CalendarDays, IndianRupee,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import TrvSelect from '../components/TrvSelect.vue'
import TrvSwitch from '../components/TrvSwitch.vue'
import {
  CATEGORY_ICONS, categoryIcon, TRAVEL_TYPES,
  createCategory, updateCategory, errText,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, category: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const SWATCHES = ['#fcd34d', '#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#34d399', '#f87171', '#9ca3af']
const FIELD_TYPES = [
  { value: 'text', label: 'Short text', icon: Type },
  { value: 'textarea', label: 'Paragraph', icon: Pilcrow },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'currency', label: 'Currency (₹)', icon: IndianRupee },
  { value: 'date', label: 'Date', icon: CalendarDays },
  { value: 'select', label: 'Dropdown', icon: List },
]
const typeOpts = computed(() => [{ value: '', label: 'No default' }, ...TRAVEL_TYPES.map(t => ({ value: t.key, label: t.key, icon: t.icon }))])

const editing = computed(() => !!props.category?.id)
const busy = ref(false)
const form = reactive({ code: '', name: '', description: '', icon: 'Tag', color_hex: '#fbbf24', default_travel_type: '', requires_attachment: false, sort_order: '', is_active: true })
const fields = ref([])
let uidSeq = 0

const slug = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)

const hydrate = () => {
  uidSeq = 0
  const c = props.category
  if (c?.id) {
    Object.assign(form, {
      code: c.code || '', name: c.name || '', description: c.description || '',
      icon: c.icon || 'Tag', color_hex: c.color_hex || '#fbbf24',
      default_travel_type: c.default_travel_type || '', requires_attachment: !!c.requires_attachment,
      sort_order: c.sort_order || '', is_active: c.is_active !== false,
    })
    fields.value = (c.field_schema || []).map(f => ({
      uid: ++uidSeq, label: f.label || '', key: f.key || '', type: f.type || 'text',
      required: !!f.required, placeholder: f.placeholder || '',
      optionsText: (f.options || []).join('\n'), keyTouched: true,
    }))
  } else {
    Object.assign(form, { code: '', name: '', description: '', icon: 'Tag', color_hex: '#fbbf24', default_travel_type: '', requires_attachment: false, sort_order: '', is_active: true })
    fields.value = []
  }
}
watch(() => props.open, (o) => { if (o) hydrate() })

const iconComp = computed(() => categoryIcon(form.icon))
const previewCode = computed(() => editing.value ? form.code : (slug(form.code).toUpperCase() || 'CODE'))

const onCodeInput = () => { form.code = form.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }
const onLabel = (f) => { if (!f.keyTouched) f.key = slug(f.label) }

const addField = () => fields.value.push({ uid: ++uidSeq, label: '', key: '', type: 'text', required: false, placeholder: '', optionsText: '', keyTouched: false })
const removeField = (uid) => { fields.value = fields.value.filter(f => f.uid !== uid) }

const keyList = computed(() => fields.value.map(f => f.key.trim()).filter(Boolean))
const dupKey = computed(() => new Set(keyList.value).size !== keyList.value.length)
const fieldErr = (f) => !f.label.trim() || !f.key.trim() || (f.type === 'select' && !f.optionsText.split('\n').map(s => s.trim()).filter(Boolean).length)

const valid = computed(() => {
  if (!form.name.trim()) return false
  if (!editing.value && form.code.trim().length < 2) return false
  if (dupKey.value) return false
  return fields.value.every(f => !fieldErr(f))
})

const fT = (i) => ({ animation: 'trv-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both', animationDelay: (0.06 + i * 0.07) + 's' })

const stampText = computed(() => editing.value ? 'EDIT' : (valid.value ? 'READY' : 'DRAFT'))
const stampTone = computed(() => editing.value ? 'edit' : (valid.value ? 'ok' : 'draft'))

const save = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    const field_schema = fields.value.map(f => {
      const spec = { key: f.key.trim(), label: f.label.trim(), type: f.type, required: !!f.required }
      if (f.type === 'select') spec.options = f.optionsText.split('\n').map(s => s.trim()).filter(Boolean)
      if (f.placeholder.trim()) spec.placeholder = f.placeholder.trim()
      return spec
    })
    const body = {
      name: form.name.trim(), description: form.description.trim() || null,
      icon: form.icon, color_hex: form.color_hex,
      default_travel_type: form.default_travel_type || null,
      requires_attachment: form.requires_attachment,
      sort_order: form.sort_order.trim() || null,
      is_active: form.is_active, field_schema,
    }
    if (editing.value) await updateCategory(props.category.id, body)
    else await createCategory({ code: form.code.trim(), ...body })
    toast.success(editing.value ? 'Gate updated' : 'Category created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e)) } finally { busy.value = false }
}
</script>

<style scoped>
.cm-ov { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6,5,4,0.66); backdrop-filter: blur(9px); }
.cm { position: relative; width: min(880px, 97vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.cm-aura { position: absolute; inset: -40% 30% 60% -10%; pointer-events: none;
  background: radial-gradient(60% 70% at 20% 0%, rgba(251,146,60,0.16), transparent 70%); }

.cm-head { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 13px;
  padding: 18px 20px; border-bottom: 1px solid var(--trv-border); }
.cm-head-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: #1a1205; background: var(--trv-grad-hero); box-shadow: var(--trv-amber-glow); }
.cm-head h3 { font-size: 16.5px; font-weight: 820; margin: 0; color: var(--trv-text); }
.cm-head p { font-size: 11.5px; color: var(--trv-text-muted); margin: 2px 0 0; }
.cm-x { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.cm-x:hover { color: var(--trv-text); border-color: var(--trv-border-strong); }

.cm-body { position: relative; display: grid; grid-template-columns: 260px 1fr; gap: 0; min-height: 0; flex: 1; overflow: hidden; }

/* preview */
.cm-prev { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-right: 1px solid var(--trv-border); background: var(--trv-panel); }
.cm-prev-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.pv { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 15px; border-radius: 16px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.pv-glow { position: absolute; inset: -50% 30% 50% -10%; pointer-events: none; background: radial-gradient(60% 80% at 20% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 70%); }
.pv-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 12px -2px var(--c); }
.pv-stamp { position: absolute; top: 12px; right: 12px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px; border: 1px solid; }
.pv-stamp.draft { color: var(--trv-st-draft); border-color: var(--trv-st-draft-soft); background: var(--trv-st-draft-soft); }
.pv-stamp.ok { color: var(--trv-st-approved); border-color: var(--trv-st-approved-soft); background: var(--trv-st-approved-soft); }
.pv-stamp.edit { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.pv-head { display: flex; align-items: center; gap: 10px; }
.pv-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.pv-id { min-width: 0; }
.pv-id h4 { font-size: 14px; font-weight: 760; margin: 0; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-code { font-size: 9.5px; color: var(--trv-text-dim); }
.pv-desc { font-size: 11.5px; line-height: 1.45; color: var(--trv-text-secondary); margin: 0; }
.pv-desc.ph { color: var(--trv-text-dim); font-style: italic; }
.pv-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.pv-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 650; color: var(--trv-text-muted); padding: 3px 7px; border-radius: 7px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.pv-chip.live { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.pv-chip.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); border-color: var(--trv-st-returned-soft); }
.pv-chip.off { color: var(--trv-st-cancelled); background: var(--trv-st-cancelled-soft); }
.cm-prev-hint { display: flex; align-items: flex-start; gap: 6px; font-size: 10.5px; line-height: 1.4; color: var(--trv-text-dim); margin: 0; }
.cm-prev-hint :deep(svg) { flex-shrink: 0; margin-top: 1px; color: var(--trv-amber); }

/* form */
.cm-form { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
.grp { display: flex; flex-direction: column; gap: 10px; }
.grp-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-secondary); }
.grp-h.between { justify-content: space-between; }
.grp-h .cnt { font-size: 9.5px; padding: 1px 7px; border-radius: 999px; background: var(--trv-amber-soft); color: var(--trv-amber); border: 1px solid var(--trv-amber-border); }
.row { display: flex; gap: 10px; }
.row.two { flex-wrap: wrap; }
.fld { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.fld.wide { flex: 2; }
.fld.sort { flex: 0 0 72px; }
.fld label { font-size: 11px; font-weight: 650; color: var(--trv-text-muted); }
.fld label i { color: var(--trv-amber); font-style: normal; }
.sub-l { font-size: 11px; font-weight: 650; color: var(--trv-text-muted); }
.hint { font-size: 9.5px; color: var(--trv-text-dim); }
.inp { width: 100%; padding: 9px 11px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.28); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s, box-shadow 0.2s; }
.inp.sm { padding: 7px 9px; font-size: 12px; border-radius: 9px; }
.inp.flex { flex: 1; min-width: 0; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }
textarea.inp { resize: vertical; }

.icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 7px; }
.ic-btn { display: grid; place-items: center; aspect-ratio: 1; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; transition: all 0.2s var(--trv-spring); }
.ic-btn:hover { color: var(--trv-text); transform: translateY(-2px); }
.ic-btn.on { color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 16px -5px var(--c); }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sw { width: 28px; height: 28px; border-radius: 9px; background: var(--s); border: 2px solid transparent; cursor: pointer; position: relative; transition: transform 0.2s; padding: 0; }
.sw:hover { transform: scale(1.12); }
.sw.on { border-color: var(--trv-text); box-shadow: 0 0 0 2px var(--s); }
.sw.custom { display: grid; place-items: center; color: #fff; background: var(--s); overflow: hidden; mix-blend-mode: normal; }
.sw.custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.toggles { display: flex; flex-direction: column; gap: 8px; }
.tg { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.tg b { display: block; font-size: 12.5px; font-weight: 700; color: var(--trv-text); }
.tg span { font-size: 10.5px; color: var(--trv-text-muted); }

.add-f { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 6px 11px; border-radius: 9px; cursor: pointer; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.fb-note { font-size: 10.5px; color: var(--trv-text-dim); margin: -4px 0 0; }
.fb-card { display: flex; flex-direction: column; gap: 8px; padding: 11px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); overflow: hidden; }
.fb-card.err { border-color: rgba(239,68,68,0.34); }
.fb-row1 { display: flex; align-items: center; gap: 8px; }
.grip { color: var(--trv-text-dim); flex-shrink: 0; cursor: grab; }
.fb-type { width: 138px; flex-shrink: 0; }
.fb-row2 { display: flex; align-items: center; gap: 8px; }
.fb-key { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; font-size: 10px; color: var(--trv-amber); padding: 4px 8px; border-radius: 7px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fb-row3 { display: flex; flex-direction: column; gap: 5px; }
.fb-row3 label { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.ic { display: grid; place-items: center; width: 28px; height: 28px; background: var(--trv-surface); border: 1px solid var(--trv-border); border-radius: 8px; color: var(--trv-text-muted); cursor: pointer; flex-shrink: 0; }
.ic.danger:hover { color: #f87171; border-color: rgba(239,68,68,0.4); }
.fb-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; border-radius: 12px; border: 1px dashed var(--trv-border-strong); color: var(--trv-text-dim); font-size: 12px; }
.fb-empty :deep(svg) { color: var(--trv-amber); opacity: 0.7; }

.cm-foot { position: relative; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--trv-border); }
.foot-warn { margin-right: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #f87171; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: cm-spin 0.8s linear infinite; }
@keyframes cm-spin { to { transform: rotate(360deg); } }

/* light theme */
[data-theme="light"] .cm-ov { background: rgba(60,40,15,0.34); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .sw.on { border-color: #4a3a1c; }

@media (max-width: 720px) {
  .cm-body { grid-template-columns: 1fr; }
  .cm-prev { border-right: none; border-bottom: 1px solid var(--trv-border); }
}
@media (prefers-reduced-motion: reduce) { .grp { animation: none !important; } .spin { animation: none; } }
</style>
