<template>
  <div class="dashboard-layout" :class="layoutClass">
    <TopNavBar />

    <main class="main-content">
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopNavBar from './TopNavBar.vue'
import { useSessionTimeout } from '../../composables/useSessionTimeout'

const route = useRoute()
// Initialize session timeout - auto-logout after 10 min inactivity
useSessionTimeout()

const layoutClass = computed(() => {
  return route.path.startsWith('/admin') ? 'admin-layout' : 'user-layout'
})
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  padding-top: 52px; /* Offset for fixed TopNav */
  background: transparent;
}

/* Layout wrappers no longer paint a background — html/body in style.css
   already owns var(--bg-color) for both dark and light, so the page bg is
   the single source of truth. Wrappers only contribute text color. */
.user-layout  { color: var(--text-primary, #f5f5f7); }
.admin-layout { color: var(--text-primary, #f8fafc); }

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 52px);
  background: transparent;
}

.content-area {
  flex: 1;
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
