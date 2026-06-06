<template>
  <div class="sec">
    <!-- ── cinematic header / summary strip ── -->
    <Motion as="header" class="str-hero" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <div class="sh-bg" aria-hidden="true"><span class="sh-grid" /><span class="sh-aurora" /></div>
      <div class="sh-lead">
        <span class="sh-eyebrow"><Layers :size="13" /> Mint · Die Library</span>
        <h2 class="sh-title">Salary structures</h2>
        <p class="sh-sub">Reusable component templates assigned to employees at hire.</p>
      </div>
      <div class="sh-stats">
        <div class="shs"><b><PayCountUp :value="items.length" /></b><span>Structures</span></div>
        <div class="shs"><b><PayCountUp :value="totalLinks" /></b><span>Components</span></div>
        <div class="shs"><b><PayCountUp :value="avgLinks" :decimals="1" /></b><span>Avg / structure</span></div>
        <div class="shs default" v-if="defaultName"><b class="dn">{{ defaultName }}</b><span>Default</span></div>
      </div>
    </Motion>

    <!-- ── toolbar ── -->
    <div class="str-toolbar">
      <div class="legend">
        <span class="lg"><i class="d earning" />Earnings</span>
        <span class="lg"><i class="d deduction" />Deductions</span>
        <span class="lg"><i class="d statutory" />Statutory</span>
        <span class="lg"><i class="d employer" />Employer</span>
      </div>
      <div class="tb-right">
        <label class="search">
          <Search :size="14" />
          <input v-model="q" type="text" placeholder="Search structures…" />
        </label>
        <Motion as="button" class="add-btn" @click="openCreate" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
          <Plus :size="15" /> New structure
        </Motion>
      </div>
    </div>

    <!-- ── states ── -->
    <div v-if="loading" class="grid"><div v-for="i in 4" :key="i" class="pay-skel" style="height:230px" /></div>
    <PayEmptyState v-else-if="!items.length" :icon="Layers" title="No salary structures"
      sub="Group components into reusable templates assigned to employees.">
      <button class="add-btn" @click="openCreate"><Plus :size="15" /> Create a structure</button>
    </PayEmptyState>
    <PayEmptyState v-else-if="!filtered.length" :icon="Search" title="No matches"
      :sub="`Nothing matches “${q}”.`" />

    <!-- ── card grid ── -->
    <div v-else class="grid">
      <Motion v-for="(s, i) in filtered" :key="s.id" as="div" class="str-wrap"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: Math.min(i*0.06, 0.5), ease: [0.16,1,0.3,1] }">
        <article class="str-die" :class="{ isdefault: s.is_default }" v-tilt="{ max: 6, scale: 1.015, perspective: 900 }">
          <!-- blueprint background -->
          <div class="die-bg" aria-hidden="true"><span class="die-grid" /><span class="die-sheen" /></div>
          <span class="die-corner tl" aria-hidden="true" /><span class="die-corner br" aria-hidden="true" />

          <!-- header -->
          <div class="die-head" data-tilt-depth="22">
            <div class="dh-id">
              <h4>{{ s.name }}</h4>
              <code>{{ s.code }}</code>
            </div>
            <span v-if="s.is_default" class="seal" title="Default structure">
              <Star :size="11" /> Default<span class="seal-sheen" />
            </span>
          </div>

          <!-- composition bar -->
          <div class="comp" data-tilt-depth="14">
            <div class="comp-bar">
              <span v-for="(seg, si) in split(s)" :key="seg.cat" v-show="seg.count" class="cseg" :class="seg.cat"
                :style="{ flexGrow: seg.count, animationDelay: (0.3 + si*0.1)+'s' }" :title="`${seg.label}: ${seg.count}`" />
            </div>
            <div class="comp-mini">
              <span v-for="seg in split(s)" :key="seg.cat" v-show="seg.count" class="cm" :class="seg.cat">
                <i /> {{ seg.count }}
              </span>
            </div>
          </div>

          <!-- component chips -->
          <div class="chips" data-tilt-depth="10">
            <span v-for="(c, ci) in (s.components || []).slice(0, 8)" :key="c.id || ci"
              class="chip pay-cat" :class="catOf(c)" :style="{ animationDelay: (0.34 + ci*0.05)+'s' }">{{ c.component_code }}</span>
            <span v-if="(s.components||[]).length > 8" class="chip more">+{{ s.components.length - 8 }}</span>
          </div>

          <!-- footer -->
          <div class="die-foot">
            <span class="cc"><Boxes :size="13" /> {{ s.component_count }} components</span>
            <div class="acts">
              <Motion as="button" class="ic" @click="openEdit(s)" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Edit"><Pencil :size="14" /></Motion>
              <Motion as="button" class="ic danger" @click="askRemove(s)" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Delete"><Trash2 :size="14" /></Motion>
            </div>
          </div>
          <span class="die-base" aria-hidden="true" />
        </article>
      </Motion>
    </div>

    <PayStructureDrawer :open="drawer.open" :structure="drawer.structure"
      @close="drawer.open = false" @saved="onSaved" />

    <PayDeleteStructureModal :open="delModal.open" :structure="delModal.structure" :deleting="delModal.deleting"
      @close="delModal.open = false" @confirm="confirmRemove" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Star, Pencil, Trash2, Layers, Search, Boxes } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayStructureDrawer from '../drawers/PayStructureDrawer.vue'
import PayDeleteStructureModal from '../modals/PayDeleteStructureModal.vue'
import { categoryMeta, fetchStructures, fetchStructure, deleteStructure } from '@/composables/usePayroll'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const items = ref([])
const loading = ref(false)
const drawer = ref({ open: false, structure: null })
const delModal = ref({ open: false, structure: null, deleting: false })
const q = ref('')

const catOf = (c) => categoryMeta(c.component_type).cat
const CATS = [
  { cat: 'earning', label: 'Earnings' },
  { cat: 'deduction', label: 'Deductions' },
  { cat: 'statutory', label: 'Statutory' },
  { cat: 'employer', label: 'Employer' },
]
const split = (s) => {
  const counts = { earning: 0, deduction: 0, statutory: 0, employer: 0 }
  for (const c of (s.components || [])) {
    const cat = categoryMeta(c.component_type).cat
    counts[cat] = (counts[cat] || 0) + 1
  }
  return CATS.map(c => ({ ...c, count: counts[c.cat] || 0 }))
}

const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return items.value
  return items.value.filter(s => (s.name || '').toLowerCase().includes(t) || (s.code || '').toLowerCase().includes(t))
})
const totalLinks = computed(() => items.value.reduce((a, s) => a + (s.component_count || (s.components || []).length || 0), 0))
const avgLinks = computed(() => items.value.length ? totalLinks.value / items.value.length : 0)
const defaultName = computed(() => (items.value.find(s => s.is_default) || {}).name || '')

const reload = async () => {
  loading.value = true
  try { items.value = (await fetchStructures({ limit: 100 })).items || [] }
  catch { toast.error('Failed to load structures') }
  finally { loading.value = false }
}
const openCreate = () => { drawer.value = { open: true, structure: null } }
const openEdit = async (s) => {
  try { const full = await fetchStructure(s.id); drawer.value = { open: true, structure: full } }
  catch { drawer.value = { open: true, structure: s } }
}
const onSaved = () => { reload(); emit('refresh-stats') }
const askRemove = (s) => { delModal.value = { open: true, structure: s, deleting: false } }
const confirmRemove = async () => {
  const s = delModal.value.structure
  if (!s) return
  delModal.value.deleting = true
  try {
    await deleteStructure(s.id)
    toast.success('Structure archived')
    delModal.value = { open: false, structure: null, deleting: false }
    reload(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Delete failed')
    delModal.value.deleting = false
  }
}
onMounted(reload)
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }

/* ════════ hero / summary strip ════════ */
.str-hero { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  background: var(--pay-surface); border: 1px solid var(--pay-border); }
.sh-bg { position: absolute; inset: 0; pointer-events: none; }
.sh-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.06) 1px, transparent 1px);
  background-size: 26px 26px; -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%); mask-image: radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%); }
.sh-aurora { position: absolute; inset: -30%; background:
  radial-gradient(40% 60% at 90% 10%, rgba(251,191,36,0.18), transparent 60%),
  radial-gradient(40% 60% at 70% 100%, rgba(234,88,12,0.12), transparent 60%);
  filter: blur(10px); animation: pay-aurora-drift 20s ease-in-out infinite; }
.sh-lead { position: relative; z-index: 1; min-width: 0; }
.sh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10.5px;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.sh-title { margin: 5px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--pay-text); }
.sh-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--pay-text-muted); }
.sh-stats { position: relative; z-index: 1; display: flex; gap: 22px; flex-wrap: wrap; }
.shs { display: flex; flex-direction: column; gap: 2px; }
.shs b { font-family: var(--pay-mono); font-size: 24px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.shs b.dn { font-size: 14px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pay-net); }
.shs span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-text-muted); }

/* ════════ toolbar ════════ */
.str-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.legend .lg { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--pay-text-2); }
.legend .d, .cm i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
.d.earning, .cseg.earning, .cm.earning i { background: var(--pay-mint); }
.d.deduction, .cseg.deduction, .cm.deduction i { background: var(--pay-deduction); }
.d.statutory, .cseg.statutory, .cm.statutory i { background: var(--pay-statutory); }
.d.employer, .cseg.employer, .cm.employer i { background: var(--pay-net); }
.tb-right { display: flex; align-items: center; gap: 10px; }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 11px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted); transition: border-color 0.2s; }
.search:focus-within { border-color: var(--pay-border); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 160px; }
.add-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px;
  border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px;
  box-shadow: 0 10px 26px -12px rgba(245,158,11,0.7); }

/* ════════ grid ════════ */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.str-wrap { perspective: 1000px; }

/* ════════ the minted die card ════════ */
.str-die { position: relative; border-radius: 20px; padding: 18px 20px 16px; overflow: hidden;
  background: linear-gradient(160deg, var(--pay-surface-2), var(--pay-surface));
  border: 1px solid var(--pay-border); transition: border-color 0.3s, box-shadow 0.3s;
  display: flex; flex-direction: column; gap: 14px; min-height: 210px; }
.str-die:hover { border-color: rgba(251,191,36,0.4); box-shadow: 0 26px 60px -30px rgba(245,158,11,0.55); }
.str-die.isdefault { border-color: rgba(52,211,153,0.32); }
.die-bg { position: absolute; inset: 0; pointer-events: none; border-radius: 20px; overflow: hidden; }
.die-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: radial-gradient(rgba(251,191,36,0.08) 1px, transparent 1px); background-size: 16px 16px; }
.die-sheen { position: absolute; top: -30%; bottom: -30%; left: 0; width: 36%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent); }
.str-die:hover .die-sheen { animation: pay-foil-sweep 0.95s var(--pay-ease); }
.die-corner { position: absolute; width: 16px; height: 16px; border: 1.5px solid rgba(251,191,36,0.4); pointer-events: none; }
.die-corner.tl { top: 11px; left: 11px; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
.die-corner.br { bottom: 11px; right: 11px; border-left: none; border-top: none; border-radius: 0 0 4px 0; }

.die-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dh-id { min-width: 0; }
.dh-id h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--pay-text); letter-spacing: -0.01em; }
.dh-id code { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-treasury); }
.seal { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 999px;
  background: var(--pay-net-soft); color: var(--pay-net); border: 1px solid rgba(52,211,153,0.3); }
.seal-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: pay-foil-sweep 3.4s ease-in-out infinite 1s; }

.comp { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; }
.comp-bar { display: flex; gap: 3px; height: 8px; border-radius: 999px; overflow: hidden; background: var(--pay-surface-2); }
.cseg { border-radius: 3px; transform: scaleX(0); transform-origin: left; animation: pay-underline-grow 0.7s var(--pay-ease) both; }
.comp-mini { display: flex; gap: 12px; flex-wrap: wrap; }
.cm { display: inline-flex; align-items: center; gap: 5px; font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-2); }

.chips { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; min-height: 22px; }
.chip { animation: pay-rise 0.45s var(--pay-ease) both; }
.chip.more { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); align-self: center;
  padding: 2px 7px; border-radius: 6px; background: var(--pay-surface-2); }

.die-foot { position: relative; z-index: 1; margin-top: auto; display: flex; align-items: center; justify-content: space-between;
  border-top: 1px dashed var(--pay-border-soft); padding-top: 12px; }
.cc { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pay-text-muted); }
.acts { display: flex; gap: 6px; }
.ic { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; transition: color 0.2s, border-color 0.2s; }
.ic:hover { color: var(--pay-treasury); border-color: var(--pay-border); }
.ic.danger:hover { color: var(--pay-deduction); border-color: rgba(194,65,12,0.4); }
.die-base { position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
  background: var(--pay-grad-cta); opacity: 0.5; transition: opacity 0.3s; }
.str-die:hover .die-base { opacity: 1; }
.str-die.isdefault .die-base { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }

@media (max-width: 640px) { .sh-stats { gap: 16px; } .str-die { min-height: 0; } }

@media (prefers-reduced-motion: reduce) {
  .sh-aurora, .die-sheen, .seal-sheen, .cseg, .chip { animation: none !important; }
  .cseg { transform: scaleX(1); }
}

/* ════════════════════════════════ LIGHT THEME ════════════════════════════════ */
[data-theme="light"] .str-die { background: linear-gradient(160deg, rgba(255,252,245,0.95), rgba(255,248,238,0.85)); }
[data-theme="light"] .comp-bar { background: rgba(120,53,15,0.12); }
[data-theme="light"] .die-sheen { background: linear-gradient(90deg, transparent, rgba(217,119,6,0.16), transparent); }
[data-theme="light"] .seal-sheen { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); }
[data-theme="light"] .search,
[data-theme="light"] .chip.more { background: rgba(255,250,240,0.85); }
[data-theme="light"] .sh-aurora { background:
  radial-gradient(40% 60% at 90% 10%, rgba(217,119,6,0.22), transparent 60%),
  radial-gradient(40% 60% at 70% 100%, rgba(234,88,12,0.16), transparent 60%); }
[data-theme="light"] .die-corner { border-color: rgba(180,83,9,0.45); }
</style>
