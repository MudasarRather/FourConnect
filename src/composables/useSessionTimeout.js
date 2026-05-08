import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart']

let timeoutId = null
let lastActivity = Date.now()
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

    const resetTimer = () => {
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
    }

    const destroySession = () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }

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
