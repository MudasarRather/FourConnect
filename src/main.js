import { createApp } from 'vue'
import axios from 'axios'
import './style.css'
import './styles/theme.css'
import './styles/theme-light-rescue.css'
import './styles/attendance-modal-rescue.css'
import App from './App.vue'
import router from './router'

import Toast from "vue-toastification"
import "vue-toastification/dist/index.css"

import { MotionPlugin } from '@vueuse/motion'

import { attachRouterCleanup } from './composables/useGsapAnim'
import { initTheme } from './composables/useTheme'
import vReveal from './directives/vReveal'
import vTilt from './directives/vTilt'
import vMagnetic from './directives/vMagnetic'

// Apply persisted theme before app mount so the first paint matches preference.
initTheme()

// ─── Global auth-expiry guard ────────────────────────────────────────────────
// A JWT is stateless, so when HR deactivates an employee mid-session (e.g.
// "Revoke ERP login" during exit clearance) the backend starts rejecting that
// user's existing token with 401. This interceptor turns ANY 401 inside an
// authenticated panel into an immediate, clean logout: clear that panel's token
// and bounce to its login. Public pages (no token) and the auth pages handle
// their own 401s, so we no-op there to avoid redirect loops / breaking the
// "wrong password" login error.
let _handlingAuthExpiry = false
function handleAuthExpiry() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname || ''
  const isAdmin = path.startsWith('/admin')
  const isUser = path.startsWith('/user')
  if (!isAdmin && !isUser) return                    // public / auth route — not our concern
  const tokenKey = isAdmin ? 'admin_token' : 'user_token'
  if (!localStorage.getItem(tokenKey)) return        // no active session (e.g. failed login)
  if (_handlingAuthExpiry) return                     // already redirecting
  _handlingAuthExpiry = true
  localStorage.removeItem(tokenKey)
  if (isUser) localStorage.removeItem('user_is_activated')
  localStorage.removeItem('session_start')
  const loginPath = isAdmin ? '/authentication/admin/login' : '/authentication/user/login'
  router.replace({ path: loginPath, query: { expired: '1' } })
    .catch(() => {})
    .finally(() => { _handlingAuthExpiry = false })
}
axios.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) handleAuthExpiry()
    return Promise.reject(error)
  },
)

const app = createApp(App)
app.use(router)
app.use(MotionPlugin)
app.use(Toast, {
    position: "top-right",
    timeout: 3000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
})

app.directive('reveal', vReveal)
app.directive('tilt', vTilt)
app.directive('magnetic', vMagnetic)

attachRouterCleanup()

app.mount('#app')
