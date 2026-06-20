<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="cd-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="$emit('close')">
        <Motion class="cd-panel" as="aside" role="dialog" aria-modal="true" :style="{ '--cc': color }"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>
          <span class="cd-aura" aria-hidden="true" />
          <span class="cd-edge" aria-hidden="true" />

          <header class="cd-head">
            <span class="cd-ring">
              <span class="cd-ring-track" :style="{ '--p': shareDeg }" />
              <FolderTree :size="18" class="cd-ring-ic" />
            </span>
            <div class="cd-titles">
              <h3>{{ category?.name || 'Category' }}</h3>
              <p><span class="as-mono">{{ category?.code }}</span><span v-if="parentName"> · under {{ parentName }}</span></p>
            </div>
            <button class="cd-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="cd-meta">
            <span class="cd-mchip"><Boxes :size="12" /> {{ category?.asset_count ?? 0 }} assets</span>
            <span class="cd-mchip" :class="{ off: !category?.is_active }">{{ category?.is_active ? 'Active' : 'Inactive' }}</span>
            <span v-if="category?.useful_life_months" class="cd-mchip"><Clock :size="11" /> {{ category.useful_life_months }}mo</span>
            <span v-if="depLabel" class="cd-mchip"><TrendingDown :size="11" /> {{ depLabel }}</span>
          </div>

          <div class="cd-body">
            <div class="cd-section-head">
              <span><Boxes :size="13" /> Assets in this category</span>
              <span v-if="!loading && assets.length" class="cd-count">{{ assets.length }}{{ assets.length >= 50 ? '+' : '' }}</span>
            </div>

            <div v-if="loading" class="cd-list">
              <div v-for="n in 5" :key="n" class="as-skel" style="height:52px;border-radius:12px" />
            </div>
            <div v-else-if="!assets.length" class="cd-empty">
              <PackageOpen :size="22" />
              <span>No assets are classified here yet.</span>
            </div>
            <ul v-else class="cd-list">
              <Motion v-for="(a, i) in assets" :key="a.id" as="li" class="cd-asset" :title="`Open history · ${a.asset_code}`"
                :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.4) }" @click="$emit('detail', a.id)">
                <AssetTypeBadge :type="a.asset_type" />
                <div class="cd-asset-main">
                  <span class="cd-asset-code as-mono">{{ a.asset_code }}</span>
                  <span class="cd-asset-sub">{{ a.brand }} {{ a.model || '' }}</span>
                </div>
                <AssetStatusStamp :value="a.status" />
                <ArrowUpRight :size="14" class="cd-asset-go" />
              </Motion>
            </ul>
          </div>

          <footer class="cd-foot">
            <button class="as-btn as-btn-ghost" @click="$emit('close')">Close</button>
            <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !category?.asset_count }"
              :whileHover="category?.asset_count ? { y: -2, scale: 1.02 } : {}" :whileTap="{ scale: 0.97 }"
              :disabled="!category?.asset_count" @click="$emit('go-inventory')">
              <Boxes :size="14" /> Open in Fleet bay
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { FolderTree, X, Boxes, Clock, TrendingDown, PackageOpen, ArrowUpRight } from 'lucide-vue-next'
import AssetTypeBadge from './AssetTypeBadge.vue'
import AssetStatusStamp from './AssetStatusStamp.vue'
import { fetchAssets, titleCase } from '@/composables/useAssets'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  category: { type: Object, default: null },
  color: { type: String, default: 'var(--as-amber)' },
  share: { type: Number, default: 0 },
  parentName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'detail', 'go-inventory'])

const reduced = prefersReduced()
const assets = ref([])
const loading = ref(false)
const shareDeg = computed(() => `${Math.max(0, Math.min(100, props.share)) * 3.6}deg`)
const depLabel = computed(() => {
  const m = props.category?.depreciation_method
  if (!m || String(m).toUpperCase() === 'NONE') return ''
  return titleCase(m)
})

watch(() => props.open, async (o) => {
  document.body.style.overflow = o ? 'hidden' : ''
  if (o && props.category) {
    loading.value = true
    assets.value = []
    try {
      const res = await fetchAssets({ category_id: props.category.id, limit: 50, sort_by: 'asset_code', sort_dir: 'asc' })
      assets.value = res.items || []
    } catch { /* leave empty */ }
    finally { loading.value = false }
  }
}, { immediate: true })

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' })
</script>

<style scoped>
.cd-overlay { position: fixed; inset: 0; z-index: 1460; display: flex; justify-content: flex-end;
  background: rgba(6, 5, 4, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .cd-overlay { background: rgba(60, 40, 15, 0.3); }
.cd-panel { position: relative; width: 460px; max-width: 94vw; height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--as-glass-deep); backdrop-filter: var(--as-glass-blur); -webkit-backdrop-filter: var(--as-glass-blur);
  border-left: 1px solid var(--as-border-strong); box-shadow: var(--as-glass-shadow); }
.cd-aura { position: absolute; inset: -20% -30% auto -10%; height: 40%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(12px); opacity: 0.8; }
.cd-edge { position: absolute; top: 0; left: 0; bottom: 0; width: 3px; z-index: 2; pointer-events: none;
  background: linear-gradient(180deg, transparent, var(--cc, var(--as-amber)), transparent); background-size: 100% 220%; animation: as-sheen 4.5s ease-in-out infinite; }

.cd-head, .cd-meta, .cd-body, .cd-foot { position: relative; z-index: 1; }
.cd-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--as-border-soft); }
.cd-ring { position: relative; flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; }
.cd-ring-track { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--cc) var(--p, 0deg), color-mix(in srgb, var(--as-steel-dim) 20%, transparent) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px)); }
.cd-ring-ic { position: relative; z-index: 1; color: var(--cc); }
.cd-titles { flex: 1; min-width: 0; }
.cd-titles h3 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-titles p { margin: 2px 0 0; font-size: 12px; color: var(--as-text-muted); }
.cd-x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); cursor: pointer; transition: all 0.2s; }
.cd-x:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(90deg); }

.cd-meta { display: flex; flex-wrap: wrap; gap: 7px; padding: 13px 20px; border-bottom: 1px solid var(--as-border-soft); }
.cd-mchip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-secondary); padding: 4px 9px; border-radius: 8px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.cd-mchip :deep(svg) { color: var(--as-steel-dim); }
.cd-mchip.off { color: var(--as-st-retired); }

.cd-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.cd-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cd-section-head > span:first-child { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-secondary); }
.cd-section-head :deep(svg) { color: var(--cc); }
.cd-count { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--cc) 14%, transparent); color: var(--cc); }
.cd-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.cd-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; color: var(--as-text-muted); font-size: 13px; }
.cd-empty :deep(svg) { color: var(--as-text-dim); }
.cd-asset { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; cursor: pointer;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, background 0.2s, transform 0.2s; }
.cd-asset:hover { border-color: color-mix(in srgb, var(--cc) 38%, transparent); background: var(--as-surface-elevated); transform: translateX(-2px); }
.cd-asset-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cd-asset-code { font-size: 13px; font-weight: 800; color: var(--as-text); }
.cd-asset-sub { font-size: 11px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-asset-go { color: var(--as-text-dim); flex-shrink: 0; transition: color 0.2s, transform 0.2s; }
.cd-asset:hover .cd-asset-go { color: var(--cc); transform: translate(2px, -2px); }

.cd-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--as-border-soft); }
.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) { .cd-edge { animation: none; } }
</style>
