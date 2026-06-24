import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
// Auth heartbeat — pings /auth/me on an interval so a session that was revoked
// server-side (e.g. HR "Revoke ERP login" during exit clearance sets the user
// is_active=False) is detected and logged out within ~30s even while the tab
// is idle. The actual logout/redirect is performed by the global 401 handler
// in main.js; this just keeps a request flowing so it can fire.
const HEARTBEAT_MS = 30 * 1000
// `mousemove` + `click` were missing — a user reading the page and moving
// the cursor around (without typing or scrolling) was treated as idle and
// got logged out mid-task. `mousemove` is throttled below so it doesn't
// thrash the timer on every pixel.
// `fc:activity` is a synthetic keep-alive signal a long-running page (e.g. the
// 15-step handover wizard) can dispatch on `document` to keep an actively-open,
// visible tab from being logged out for "inactivity" while the user reads or
// gathers info between steps. See useSessionTimeout consumers / HandoverWizardPage.
const ACTIVITY_EVENTS = ['mousedown', 'click', 'keydown', 'scroll', 'wheel', 'touchstart', 'mousemove', 'fc:activity']

let timeoutId = null
let heartbeatId = null
let lastActivity = Date.now()
let lastMouseMoveReset = 0
const MOUSEMOVE_THROTTLE_MS = 5000   // only reset once every 5s for mousemove
let isLoggedOut = false

export function useSessionTimeout() {
    const router = useRouter()
    const isWarningShown = ref(false)

    const getContext = () => {
        const path = router.currentRoute.value.path
        if (path.startsWith('/admin')) return 'admin'
        return 'user'
    }

    const checkSession = () => {
        const context = getContext()
        const token = context === 'admin'
            ? localStorage.getItem('admin_token')
            : localStorage.getItem('user_token')

        if (!token) return

        const now = Date.now()
        const elapsed = now - lastActivity

        if (elapsed >= SESSION_TIMEOUT_MS && !isLoggedOut) {
            logout()
        }
    }

    const resetTimer = (event) => {
        // Throttle mousemove specifically — it fires per pixel and would
        // call clearTimeout/setTimeout thousands of times per minute.
        if (event && event.type === 'mousemove') {
            const now = Date.now()
            if (now - lastMouseMoveReset < MOUSEMOVE_THROTTLE_MS) return
            lastMouseMoveReset = now
        }

        lastActivity = Date.now()
        isWarningShown.value = false
        isLoggedOut = false

        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            const context = getContext()
            const token = context === 'admin'
                ? localStorage.getItem('admin_token')
                : localStorage.getItem('user_token')

            if (token) {
                logout()
            }
        }, SESSION_TIMEOUT_MS)
    }

    const logout = () => {
        if (isLoggedOut) return
        isLoggedOut = true

        const context = getContext()

        if (context === 'admin') {
            localStorage.removeItem('admin_token')
            router.push({ path: '/authentication/admin/login', query: { expired: '1' } })
        } else {
            localStorage.removeItem('user_token')
            localStorage.removeItem('user_is_activated')
            router.push({ path: '/authentication/user/login', query: { expired: '1' } })
        }

        localStorage.removeItem('session_start')
    }

    // Periodic server-side session check. On a 401 the global interceptor in
    // main.js clears the token + redirects, so here we only need to keep a
    // lightweight request flowing while the tab is open.
    const pingAuth = () => {
        const context = getContext()
        const token = context === 'admin'
            ? localStorage.getItem('admin_token')
            : localStorage.getItem('user_token')
        if (!token || isLoggedOut) return
        axios.get(`${API}/auth/me`, { headers: authHeader() }).catch(() => {})
    }

    // Background tabs throttle setInterval to ~1/min, so re-check the instant the
    // employee returns to the tab — a revoked session boots them right away.
    const onVisible = () => { if (!document.hidden) pingAuth() }

    const initSession = () => {
        // Set session start time
        if (!localStorage.getItem('session_start')) {
            localStorage.setItem('session_start', Date.now().toString())
        }

        // Add activity listeners
        ACTIVITY_EVENTS.forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true })
        })

        // Start timer
        resetTimer()

        // Start the server-side auth heartbeat (revoked-session detection)
        if (heartbeatId) clearInterval(heartbeatId)
        heartbeatId = setInterval(pingAuth, HEARTBEAT_MS)
        document.addEventListener('visibilitychange', onVisible)
    }

    const destroySession = () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        if (heartbeatId) {
            clearInterval(heartbeatId)
            heartbeatId = null
        }
        document.removeEventListener('visibilitychange', onVisible)

        ACTIVITY_EVENTS.forEach(event => {
            document.removeEventListener(event, resetTimer)
        })
    }

    onMounted(() => {
        const context = getContext()
        const token = context === 'admin'
            ? localStorage.getItem('admin_token')
            : localStorage.getItem('user_token')

        if (token) {
            initSession()
        }
    })

    onUnmounted(() => {
        destroySession()
    })

    return {
        resetTimer,
        logout,
        isWarningShown
    }
}
