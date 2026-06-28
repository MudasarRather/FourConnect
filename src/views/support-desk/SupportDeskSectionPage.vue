<template>
  <div class="sd-page">
    <SdModuleHeader :module-key="sectionKey" :key="sectionKey + '-h'" />
    <main class="sd-page-body">
      <transition name="sd-page-fade" mode="out-in">
        <component
          :is="sectionComp"
          :key="sectionKey"
          @go="goModule"
          @changed="onChanged"
        />
      </transition>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '../../styles/support-desk-theme.css'
import SdModuleHeader from './components/SdModuleHeader.vue'
import { SD_SECTIONS } from './modules.js'

const route = useRoute()
const router = useRouter()

const sectionKey = computed(() => route.params.section || 'organizations')
const sectionComp = computed(() => SD_SECTIONS[sectionKey.value] || null)
const base = computed(() => (route.path.startsWith('/user') ? '/user/support-desk' : '/admin/support-desk'))

const goModule = (key) => { if (key) router.push(`${base.value}/${key}`) }
const onChanged = () => { /* sections refresh their own data; nothing global to do on a standalone page */ }
</script>

<style scoped>
.sd-page { position: relative; display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 100px); color: var(--sd-text); }
.sd-page-body { flex: 1; }

.sd-page-fade-enter-active, .sd-page-fade-leave-active { transition: opacity 0.26s var(--sd-spring), transform 0.26s var(--sd-spring); }
.sd-page-fade-enter-from { opacity: 0; transform: translateY(12px); }
.sd-page-fade-leave-to { opacity: 0; transform: translateY(-8px); }

@media (prefers-reduced-motion: reduce) {
  .sd-page-fade-enter-active, .sd-page-fade-leave-active { transition: opacity 0.18s linear; }
  .sd-page-fade-enter-from, .sd-page-fade-leave-to { transform: none; }
}
</style>
