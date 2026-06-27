<template>
  <div class="sd-anns">
    <div v-if="items.length" class="sd-ann-list">
      <Motion
        v-for="(a, i) in items" :key="a.id"
        as="article" class="sd-ann sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="sd-ann-head">
          <span class="sd-ann-ico"><Megaphone :size="16" /></span>
          <div>
            <p class="sd-ann-title">{{ a.title }}</p>
            <p class="sd-ann-meta">
              <span v-if="a.category">{{ a.category }}</span>
              <span v-if="a.publish_date">· {{ fmt(a.publish_date) }}</span>
            </p>
          </div>
        </div>
        <p v-if="a.description" class="sd-ann-body">{{ a.description }}</p>
      </Motion>
    </div>
    <div v-else class="sd-empty-state"><Megaphone :size="34" /><p>{{ loadingList ? 'Loading…' : 'No announcements right now.' }}</p></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Megaphone } from 'lucide-vue-next'
import { listMyAnnouncements } from '@/composables/useSupportDesk'

defineProps({ dashboard: { type: Object, default: null }, loading: { type: Boolean, default: false }, createSignal: { type: Number, default: 0 } })
defineEmits(['go', 'changed'])

const items = ref([]); const loadingList = ref(true)
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')
onMounted(async () => {
  try { items.value = await listMyAnnouncements() } catch { items.value = [] } finally { loadingList.value = false }
})
</script>

<style scoped>
.sd-anns { display: flex; flex-direction: column; gap: 12px; }
.sd-ann-list { display: flex; flex-direction: column; gap: 12px; }
.sd-ann { padding: 18px 20px; }
.sd-ann-head { display: flex; gap: 12px; align-items: flex-start; }
.sd-ann-ico { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-ann-title { font-size: 15px; font-weight: 700; color: var(--sd-text); margin: 0 0 3px; }
.sd-ann-meta { font-size: 12px; color: var(--sd-text-muted); margin: 0; display: flex; gap: 6px; }
.sd-ann-body { font-size: 13.5px; color: var(--sd-text-secondary); line-height: 1.6; margin: 12px 0 0; white-space: pre-wrap; }
.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; color: var(--sd-text-dim); }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
</style>
