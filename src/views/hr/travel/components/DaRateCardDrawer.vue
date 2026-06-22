<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="rc-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="aside" class="rc"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }">
          <header class="rc-head">
            <div>
              <span class="rc-eyebrow trv-mono">PER-DIEM · RATE CARD</span>
              <h3>DA rate matrix</h3>
            </div>
            <button class="rc-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="rc-scroll">
            <p class="rc-intro">Daily allowance is resolved from this effective-dated matrix — grade × destination tier, with an <b>all-grades</b> wildcard fallback.</p>

            <div v-if="loading" class="rc-load"><Loader2 :size="20" class="spin" /></div>

            <template v-else-if="rows.length">
              <div class="rc-table">
                <div class="rc-trow rc-thead">
                  <span class="rc-grade">Grade</span>
                  <span v-for="t in TIERS" :key="t.key" class="rc-cell" :style="{ '--c': t.hex }">{{ t.label }}</span>
                </div>
                <Motion v-for="(r, i) in rows" :key="r.key" as="div" class="rc-trow"
                  :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.36, delay: 0.04 * i }">
                  <span class="rc-grade" :class="{ wild: r.wild }">{{ r.gradeName }}</span>
                  <span v-for="t in TIERS" :key="t.key" class="rc-cell" :class="{ empty: !r.cells[t.key] }">
                    <template v-if="r.cells[t.key]"><i class="trv-mono">₹{{ r.cells[t.key].toLocaleString('en-IN') }}</i></template>
                    <template v-else>—</template>
                  </span>
                </Motion>
              </div>
            </template>

            <div v-else class="rc-empty">
              <Calculator :size="26" />
              <p>No DA rates configured yet. DA would compute to ₹0 until a rate card exists.</p>
            </div>

            <button class="rc-manage" @click="$emit('go', 'policies')">
              <Settings2 :size="15" /> Manage rates in Policies <ArrowRight :size="14" />
            </button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Loader2, Calculator, Settings2, ArrowRight } from 'lucide-vue-next'
import { fetchDaRates, errText, CITY_CATEGORIES } from '@/composables/useTravel'
import { useToast } from 'vue-toastification'

const props = defineProps({ open: Boolean })
defineEmits(['close', 'go'])
const toast = useToast()

const rates = ref([])
const loading = ref(false)
const TIERS = CITY_CATEGORIES
const today = new Date().toISOString().slice(0, 10)

const load = async () => {
  loading.value = true
  try { rates.value = (await fetchDaRates({})).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load rate card')) }
  finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) load() })

const rows = computed(() => {
  const active = rates.value.filter(r => r.is_active && (!r.effective_date || r.effective_date <= today))
  const byGrade = new Map()
  for (const r of active) {
    const key = r.grade_id || '__wild__'
    if (!byGrade.has(key)) byGrade.set(key, { key, wild: !r.grade_id, gradeName: r.grade_id ? (r.grade_name || 'Grade') : 'All grades', cells: {} })
    const g = byGrade.get(key)
    const prev = g.cells[`_${r.city_category}_eff`]
    if (!prev || String(r.effective_date || '') >= prev) {
      g.cells[r.city_category] = Math.round(Number(r.daily_rate))
      g.cells[`_${r.city_category}_eff`] = String(r.effective_date || '')
    }
  }
  const arr = [...byGrade.values()]
  arr.sort((a, b) => (a.wild ? -1 : b.wild ? 1 : a.gradeName.localeCompare(b.gradeName)))
  return arr
})
</script>

<style scoped>
.rc-overlay { position: fixed; inset: 0; z-index: 1438; background: rgba(6,5,4,0.56); backdrop-filter: blur(7px); }
.rc { position: absolute; right: 0; top: 0; bottom: 0; width: min(460px, 96vw); display: flex; flex-direction: column; overflow: hidden;
  background: var(--trv-surface-elevated); border-left: 1px solid var(--trv-border-strong); box-shadow: -28px 0 80px rgba(0,0,0,0.55); }
.rc-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--trv-border); }
.rc-eyebrow { font-size: 9px; letter-spacing: 0.16em; color: var(--trv-amber); }
.rc-head h3 { font-size: 17px; font-weight: 850; margin: 4px 0 0; color: var(--trv-text); }
.rc-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-muted); cursor: pointer; }
.rc-scroll { flex: 1; overflow-y: auto; padding: 16px; }
.rc-intro { font-size: 12.5px; color: var(--trv-text-secondary); line-height: 1.55; margin: 0 0 14px; }
.rc-intro b { color: var(--trv-amber); }
.rc-load { display: grid; place-items: center; padding: 40px; color: var(--trv-amber); }
.spin { animation: rc-spin 0.8s linear infinite; }
@keyframes rc-spin { to { transform: rotate(360deg); } }

.rc-table { display: flex; flex-direction: column; gap: 6px; }
.rc-trow { display: grid; grid-template-columns: 1.1fr repeat(4, 1fr); gap: 6px; align-items: center; }
.rc-thead { margin-bottom: 2px; }
.rc-thead .rc-cell { font-size: 9.5px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 26%, transparent); }
.rc-thead .rc-grade { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.rc-grade { font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); padding: 8px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-grade.wild { color: var(--trv-amber); font-weight: 750; }
.rc-cell { display: flex; align-items: center; justify-content: center; padding: 8px 4px; border-radius: 8px; background: var(--trv-panel); border: 1px solid var(--trv-border); font-size: 12px; color: var(--trv-text); text-align: center; }
.rc-cell i { font-style: normal; font-weight: 750; }
.rc-cell.empty { color: var(--trv-text-dim); background: transparent; }

.rc-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 40px 20px; color: var(--trv-text-dim); }
.rc-empty svg { color: var(--trv-amber); opacity: 0.7; }
.rc-empty p { font-size: 12.5px; margin: 0; }

.rc-manage { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 18px; padding: 11px; border-radius: 11px; cursor: pointer;
  background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); color: var(--trv-amber); font-size: 13px; font-weight: 700; }
.rc-manage:hover { background: color-mix(in srgb, var(--trv-amber) 18%, transparent); }

[data-theme="light"] .rc-overlay { background: rgba(60,40,15,0.3); }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
