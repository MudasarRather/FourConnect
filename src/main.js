import { createApp } from 'vue'
import './style.css'
import './styles/theme.css'
import './styles/theme-light-rescue.css'
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
