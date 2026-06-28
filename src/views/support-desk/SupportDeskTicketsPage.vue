<template>
  <div class="sd-page">
    <main class="sd-page-body">
      <!-- SdTicketsSection carries its own "Command Deck" header -->
      <SdTicketsSection
        :dashboard="dashboard"
        :create-signal="createSignal"
        @go="goModule"
        @changed="loadDashboard"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '../../styles/support-desk-theme.css'
import SdTicketsSection from './sections/SdTicketsSection.vue'
import { fetchSupportDashboard } from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()
const base = computed(() => (route.path.startsWith('/user') ? '/user/support-desk' : '/admin/support-desk'))

const dashboard = ref(null)
const createSignal = ref(0)

const loadDashboard = async () => {
  try { dashboard.value = await fetchSupportDashboard() } catch { dashboard.value = null }
}
// ?new=1 deep-link opens the create modal. The shell keeps this page mounted, so
// we also react to the query CHANGING (e.g. the rail's "New Ticket" while already
// here) and strip the flag afterwards so it can fire again on the next click.
const fireCreate = () => {
  createSignal.value++
  const q = { ...route.query }; delete q.new
  router.replace({ path: route.path, query: q })
}
onMounted(() => {
  loadDashboard()
  if (route.query.new) fireCreate()
})
watch(() => route.query.new, (v) => { if (v) fireCreate() })

const goModule = (key) => { if (key) router.push(`${base.value}/${key}`) }
</script>

<style scoped>
.sd-page { position: relative; display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 100px); color: var(--sd-text); }
.sd-page-body { flex: 1; }
</style>
