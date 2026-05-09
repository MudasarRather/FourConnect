import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import SignupPage from '../components/SignupPage.vue'
import AdminLoginPage from '../components/AdminLoginPage.vue'
import DashboardLayout from '../components/dashboard/DashboardLayout.vue'
import PlaceholderPage from '../components/dashboard/PlaceholderPage.vue'
import DashboardHome from '../views/DashboardHome.vue'
import SettingsPage from '../views/SettingsPage.vue'
import ActivationCodePage from '../views/ActivationCodePage.vue'
import AdminUsersPage from '../views/AdminUsersPage.vue'
import AdminEmployeesPage from '../views/AdminEmployeesPage.vue'
import CreateProjectPage from '../views/CreateProjectPage.vue'
import ProjectsPage from '../views/ProjectsPage.vue'
import AssignTeamPage from '../views/AssignTeamPage.vue'
import ProjectDetailsPage from '../views/ProjectDetailsPage.vue'
import ProjectDetailsLandingPage from '../views/ProjectDetailsLandingPage.vue'
import ProjectFinancialsPage from '../views/ProjectFinancialsPage.vue'
import ProjectNotesPage from '../views/ProjectNotesPage.vue'

const routes = [
    // Default redirect
    { path: '/', redirect: '/authentication/user/login' },

    // ============================================
    // USER AUTHENTICATION ROUTES
    // ============================================
    {
        path: '/authentication/user/login',
        name: 'UserLogin',
        component: LoginPage
    },
    {
        path: '/authentication/user/signup',
        name: 'UserSignup',
        component: SignupPage
    },
    {
        path: '/authentication/user/activation',
        name: 'UserActivation',
        component: ActivationCodePage,
        meta: { requiresAuth: true }
    },

    // Legacy routes - redirect to new paths
    { path: '/login', redirect: '/authentication/user/login' },
    { path: '/signup', redirect: '/authentication/user/signup' },
    { path: '/activate', redirect: '/authentication/user/activation' },

    // ============================================
    // ADMIN AUTHENTICATION ROUTES
    // ============================================
    {
        path: '/authentication/admin/login',
        name: 'AdminLogin',
        component: AdminLoginPage
    },

    // ============================================
    // USER DASHBOARD ROUTES
    // ============================================
    {
        path: '/user',
        component: DashboardLayout,
        meta: { requiresAuth: true, requiresActivation: true, panelType: 'user' },
        children: [
            { path: '', redirect: '/user/dashboard' },
            { path: 'dashboard', name: 'UserDashboard', component: DashboardHome },
            { path: 'summary', name: 'DashboardSummary', component: DashboardHome },
            { path: 'tasks', name: 'UserTasks', component: () => import('../views/TasksPage.vue') },
            { path: 'tasks/new', name: 'UserCreateTask', component: () => import('../views/CreateTaskPage.vue') },
            { path: 'tasks/assign', name: 'UserAssignTask', component: () => import('../views/TaskAssignmentPage.vue') },
            { path: 'tasks/archive', name: 'UserTaskArchive', component: () => import('../views/TaskArchivePage.vue') },
            { path: 'tasks/view', redirect: to => ({ path: '/user/tasks', query: to.query }) },
            { path: 'tasks/:pathMatch(.*)*', name: 'Tasks', component: PlaceholderPage, props: route => ({ type: 'tasks' }) },
            { path: 'notes/:pathMatch(.*)*', name: 'Notes', component: PlaceholderPage, props: route => ({ type: 'notes' }) },
            { path: 'expenses/new', name: 'NewExpense', component: () => import('../views/NewExpensePage.vue') },
            { path: 'expenses/all', name: 'AllExpenses', component: () => import('../views/AllExpensesPage.vue') },
            { path: 'expenses/draftexpenses', name: 'DraftExpenses', component: () => import('../views/DraftExpensesPage.vue') },
            { path: 'expenses/archive', name: 'ArchiveExpenses', component: () => import('../views/ArchiveExpensesPage.vue') },
            { path: 'expenses/rejectedexpenses', name: 'RejectedExpenses', component: () => import('../views/RejectedExpensesPage.vue') },
            { path: 'expenses/void', name: 'VoidExpenses', component: () => import('../views/VoidExpensesPage.vue') },
            { path: 'expenses/:pathMatch(.*)*', name: 'Expenses', component: PlaceholderPage, props: route => ({ type: 'expenses' }) },
            { path: 'documents/sla', name: 'UserSlaDashboard', component: () => import('../views/documents/SlaDashboardPage.vue') },
            { path: 'documents/sla/new', name: 'UserSlaGenerator', component: () => import('../views/documents/SlaGeneratorPage.vue') },
            { path: 'documents/handover', name: 'UserHandoverDashboard', component: () => import('../views/documents/HandoverDashboardPage.vue') },
            { path: 'documents/handover/new', name: 'UserHandoverWizard', component: () => import('../views/documents/HandoverWizardPage.vue') },
            { path: 'documents/dpr', name: 'UserDprDashboard', component: () => import('../views/documents/DprDashboardPage.vue') },
            { path: 'documents/dpr/new', name: 'UserDprWizard', component: () => import('../views/documents/DprWizardPage.vue') },
            { path: 'documents/document-drive', name: 'UserDocumentDrive', component: () => import('../views/documents/DocumentDrivePage.vue') },
            { path: 'documents/archive', name: 'UserDocumentsArchive', component: () => import('../views/documents/ArchiveDocumentsPage.vue') },
            { path: 'documents/:pathMatch(.*)*', name: 'Documents', component: PlaceholderPage, props: route => ({ type: 'documents' }) },
            { path: 'projects/createproject', name: 'CreateProject', component: CreateProjectPage },
            { path: 'projects', redirect: '/user/projects/allprojects' },
            { path: 'projects/allprojects', name: 'UserProjects', component: ProjectsPage, props: { ownerType: 'self' } },
            { path: 'projects/assignteam', name: 'UserAssignTeam', component: AssignTeamPage },
            { path: 'projects/details', name: 'UserProjectDetailsLanding', component: ProjectDetailsLandingPage },
            { path: 'projects/projectdetails/:id', name: 'UserProjectDetails', component: ProjectDetailsPage },
            { path: 'projects/financials', name: 'UserProjectFinancials', component: ProjectFinancialsPage },
            { path: 'projects/notes', name: 'UserProjectNotes', component: ProjectNotesPage },
            { path: 'projects/userprojects', redirect: '/user/projects/allprojects' }, // Redirect from menu URL
            { path: 'projects/new', redirect: '/user/projects/createproject' }, // Legacy
            { path: 'projects/all', redirect: '/user/projects/allprojects' }, // Legacy
            { path: 'projects/completed', name: 'UserCompletedProjects', component: () => import('../views/CompletedProjectsPage.vue') },
            { path: 'projects/archive', name: 'UserArchivedProjects', component: () => import('../views/ArchivedProjectsPage.vue') },
            { path: 'finance/:pathMatch(.*)*', name: 'Finance', component: PlaceholderPage, props: route => ({ type: 'finance' }) },
            { path: 'reports/:pathMatch(.*)*', name: 'Reports', component: PlaceholderPage, props: route => ({ type: 'reports' }) },
            { path: 'settings/:pathMatch(.*)*', name: 'UserSettings', component: SettingsPage },
            { path: ':pathMatch(.*)*', name: 'DynamicPlaceholder', component: PlaceholderPage, props: route => ({ type: route.params.pathMatch[0] || 'dashboard' }) }
        ]
    },

    // Legacy redirect for /dashboard
    { path: '/dashboard', redirect: '/user/dashboard' },
    { path: '/dashboard/:pathMatch(.*)*', redirect: to => `/user/${to.params.pathMatch.join('/')}` },

    // ============================================
    // ADMIN DASHBOARD ROUTES
    // ============================================
    {
        path: '/admin',
        component: DashboardLayout,
        meta: { requiresAuth: true, requiresSuperadmin: true, panelType: 'admin' },
        children: [
            { path: '', redirect: '/admin/dashboard' },
            { path: 'dashboard', name: 'AdminDashboard', component: DashboardHome },
            { path: 'users', name: 'AdminUsers', component: AdminUsersPage },
            { path: 'employees', name: 'AdminEmployees', component: AdminEmployeesPage },
            { path: 'projects/new', name: 'AdminCreateProject', component: CreateProjectPage },
            { path: 'projects/createproject', name: 'AdminCreateProjectAlt', component: CreateProjectPage }, // Menu URL
            { path: 'projects', redirect: '/admin/projects/userprojects' },
            { path: 'projects/userprojects', name: 'AdminUserProjects', component: ProjectsPage, props: { ownerType: 'user' } },
            { path: 'projects/adminprojects', name: 'AdminAdminProjects', component: ProjectsPage, props: { ownerType: 'admin' } },
            { path: 'projects/assignteam', name: 'AdminAssignTeam', component: AssignTeamPage },
            { path: 'projects/details', name: 'AdminProjectDetailsLanding', component: ProjectDetailsLandingPage },
            { path: 'projects/projectdetails/:id', name: 'AdminProjectDetails', component: ProjectDetailsPage },
            { path: 'projects/financials', name: 'AdminProjectFinancials', component: ProjectFinancialsPage },
            { path: 'projects/notes', name: 'AdminProjectNotes', component: ProjectNotesPage },
            { path: 'projects/completed', name: 'AdminCompletedProjects', component: () => import('../views/CompletedProjectsPage.vue') },
            { path: 'projects/archive', name: 'AdminArchivedProjects', component: () => import('../views/ArchivedProjectsPage.vue') },
            { path: 'projects/all', redirect: '/admin/projects/userprojects' }, // Legacy redirect
            { path: 'expenses/new', name: 'AdminNewExpense', component: () => import('../views/NewExpensePage.vue') },
            { path: 'expenses/all', name: 'AdminAllExpenses', component: () => import('../views/AllExpensesPage.vue') },
            { path: 'expenses/draftexpenses', name: 'AdminDraftExpenses', component: () => import('../views/DraftExpensesPage.vue') },
            { path: 'expenses/archive', name: 'AdminArchiveExpenses', component: () => import('../views/ArchiveExpensesPage.vue') },
            { path: 'expenses/rejectedexpenses', name: 'AdminRejectedExpenses', component: () => import('../views/RejectedExpensesPage.vue') },
            { path: 'expenses/void', name: 'AdminVoidExpenses', component: () => import('../views/VoidExpensesPage.vue') },
            { path: 'approvals', name: 'AdminApprovals', component: PlaceholderPage, props: () => ({ type: 'approvals' }) },
            { path: 'tasks', name: 'AdminTasks', component: () => import('../views/TasksPage.vue') },
            { path: 'tasks/new', name: 'AdminCreateTask', component: () => import('../views/CreateTaskPage.vue') },
            { path: 'tasks/assign', name: 'AdminAssignTask', component: () => import('../views/TaskAssignmentPage.vue') },
            { path: 'tasks/archive', name: 'AdminTaskArchive', component: () => import('../views/TaskArchivePage.vue') },
            { path: 'tasks/:pathMatch(.*)*', name: 'AdminTasksCatchall', component: PlaceholderPage, props: route => ({ type: 'tasks' }) },
            { path: 'documents/sla', name: 'AdminSlaDashboard', component: () => import('../views/documents/SlaDashboardPage.vue') },
            { path: 'documents/sla/new', name: 'AdminSlaGenerator', component: () => import('../views/documents/SlaGeneratorPage.vue') },
            { path: 'documents/handover', name: 'AdminHandoverDashboard', component: () => import('../views/documents/HandoverDashboardPage.vue') },
            { path: 'documents/handover/new', name: 'AdminHandoverWizard', component: () => import('../views/documents/HandoverWizardPage.vue') },
            { path: 'documents/dpr', name: 'AdminDprDashboard', component: () => import('../views/documents/DprDashboardPage.vue') },
            { path: 'documents/dpr/new', name: 'AdminDprWizard', component: () => import('../views/documents/DprWizardPage.vue') },
            { path: 'documents/document-drive', name: 'AdminDocumentDrive', component: () => import('../views/documents/DocumentDrivePage.vue') },
            { path: 'documents/archive', name: 'AdminDocumentsArchive', component: () => import('../views/documents/ArchiveDocumentsPage.vue') },
            { path: 'documents/:pathMatch(.*)*', name: 'AdminDocuments', component: PlaceholderPage, props: route => ({ type: 'documents' }) },
            { path: 'settings/:pathMatch(.*)*', name: 'AdminSettings', component: SettingsPage },
            { path: ':pathMatch(.*)*', name: 'AdminPlaceholder', component: PlaceholderPage, props: route => ({ type: 'admin' }) }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation Guard
// Navigation Guard
router.beforeEach((to, from, next) => {
    // Get tokens for both contexts
    const userToken = localStorage.getItem('user_token')
    const adminToken = localStorage.getItem('admin_token')

    const userActivated = localStorage.getItem('user_is_activated') === 'true'
    // Admin is implicitly activated/superuser if they have a valid admin_token (backend validates)

    // Public pages that don't require auth
    const publicPages = [
        '/authentication/user/login',
        '/authentication/user/signup',
        '/authentication/admin/login',
        '/login',
        '/signup'
    ]
    const isPublicPage = publicPages.some(page => to.path.startsWith(page))

    // 1. ADMIN ROUTES PROTECTION
    if (to.path.startsWith('/admin')) {
        if (!adminToken) {
            return next('/authentication/admin/login')
        }
        return next()
    }

    // 2. USER DASHBOARD PROTECTION
    if (to.path.startsWith('/user') || to.path === '/authentication/user/activation') {
        if (!userToken) {
            return next('/authentication/user/login')
        }

        // Activation Check
        if (to.meta.requiresActivation && !userActivated) {
            return next('/authentication/user/activation')
        }
        return next()
    }

    // 3. PUBLIC PAGES REDIRECTION (Already Logged In)
    if (isPublicPage) {
        // If trying to access Admin Login but already logged in as Admin
        if (to.path === '/authentication/admin/login' && adminToken) {
            return next('/admin/dashboard')
        }

        // If trying to access User Login/Signup but already logged in as User
        if ((to.path.includes('/user/') || to.path === '/login' || to.path === '/signup') && userToken) {
            if (!userActivated) return next('/authentication/user/activation')
            return next('/user/dashboard')
        }
    }

    // 4. Fallback for unhandled routes
    next()
})

export default router
