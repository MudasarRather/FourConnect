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
    // PUBLIC — Former-employee exit document portal + letter QR verification
    // (no auth: a leaver whose ERP login was revoked downloads their letters here)
    // ============================================
    {
        path: '/exit/documents/:token',
        name: 'ExitDocumentsPortal',
        component: () => import('../views/public/ExitDocumentsPortal.vue'),
    },
    {
        path: '/exit/verify/:code',
        name: 'ExitVerifyPage',
        component: () => import('../views/public/ExitVerifyPage.vue'),
    },

    // ============================================
    // PUBLIC — Support Desk client portal (no auth; tokenized capability)
    // External clients raise + track tickets here; fourreck.com links to this.
    // ============================================
    {
        path: '/support/portal',
        name: 'SupportPortalLanding',
        component: () => import('../views/public/SupportPortalLanding.vue'),
    },
    {
        path: '/support/portal/:token',
        name: 'SupportPortalTicket',
        component: () => import('../views/public/SupportPortalTicket.vue'),
    },

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
            // Legacy top-level "Notes" slot is now the Support Desk. Old links land on self-service support.
            // (Project-scoped notes remain at /user/projects/notes — see ProjectNotesPage.)
            { path: 'notes/:pathMatch(.*)*', redirect: '/user/support/tickets' },

            // ============================================
            // SUPPORT (USER SELF-SERVICE) — Phase 1 scaffolding
            // ============================================
            // Self-service pattern: TopNav-driven surfaces, no in-page tabs. "New"
            // is an action (Raise-a-ticket modal) on the My Support surface, not a route.
            // Employee (agent) panel = the FULL operational support workspace.
            // Each module is its own page (HR-style) with its own internal tabs.
            { path: 'support', redirect: '/user/support/tickets/my' },
            // 'Assigned' tab was removed — for agents scope=my duplicates My Tickets.
            { path: 'support/tickets/assigned', redirect: '/user/support/tickets/my' },
            // Tickets renders the vertical SdWorkspaceRail (driven by its registry tabs) via the generic workspace.
            {
                path: 'support/:module(dashboards|tickets|queues|incidents|problems|service-requests|changes|knowledge-base|sla|communication|assets|team|automation|ai|approvals|surveys|monitoring|reports|clients)/:tab?',
                name: 'SupportEmployee',
                component: () => import('../views/support-desk/SupportModuleWorkspace.vue'),
            },
            { path: 'support/:pathMatch(.*)*', redirect: '/user/support/tickets/my' },
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
            { path: 'documents', name: 'UserDocumentsHub', component: () => import('../views/documents/DocumentsHubPage.vue') },
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
            // Legacy: redirect old Finance menu links (now replaced by HR in admin only)
            { path: 'finance/:pathMatch(.*)*', redirect: '/user/dashboard' },
            { path: 'reports/:pathMatch(.*)*', name: 'Reports', component: PlaceholderPage, props: route => ({ type: 'reports' }) },
            { path: 'settings/:pathMatch(.*)*', name: 'UserSettings', component: SettingsPage },

            // ============================================
            // SELF SERVICE PORTAL (USER ONLY)
            // ============================================
            { path: 'self-service/attendance', name: 'SelfServiceAttendance', component: () => import('../views/hr/SelfServiceAttendancePage.vue') },
            { path: 'self-service/leave', name: 'SelfServiceLeave', component: () => import('../views/hr/SelfServiceLeavePage.vue') },
            { path: 'self-service/team-approvals', name: 'SelfServiceTeamApprovals', component: () => import('../views/hr/SelfServiceTeamApprovalsPage.vue') },
            { path: 'self-service/team-performance', name: 'SelfServiceTeamPerformance', component: () => import('../views/hr/SelfServiceTeamPerformancePage.vue') },
            { path: 'self-service/payslips', name: 'SelfServicePayslips', component: () => import('../views/hr/SelfServicePayslipsPage.vue') },
            { path: 'self-service/tax-documents', name: 'SelfServiceTaxDocuments', component: () => import('../views/hr/SelfServiceTaxDocumentsPage.vue') },
            { path: 'self-service/reimbursements', name: 'SelfServiceReimbursements', component: () => import('../views/hr/SelfServiceReimbursementsPage.vue') },
            { path: 'self-service/training', name: 'SelfServiceTraining', component: () => import('../views/hr/SelfServiceTrainingPage.vue') },
            { path: 'self-service/assets', name: 'SelfServiceAssets', component: () => import('../views/hr/SelfServiceAssetsPage.vue') },
            { path: 'self-service/travel', name: 'SelfServiceTravel', component: () => import('../views/hr/SelfServiceTravelPage.vue') },
            { path: 'self-service/exit', name: 'SelfServiceExit', component: () => import('../views/hr/SelfServiceExitPage.vue') },
            { path: 'self-service/documents', name: 'SelfServiceDocuments', component: () => import('../views/hr/SelfServiceDocumentsPage.vue') },
            { path: 'self-service/performance', name: 'SelfServicePerformance', component: () => import('../views/hr/SelfServicePerformancePage.vue') },
            { path: 'self-service/:pathMatch(.*)*', name: 'SelfServiceCatchall', component: PlaceholderPage, props: () => ({ type: 'self-service' }) },
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
            { path: 'documents', name: 'AdminDocumentsHub', component: () => import('../views/documents/DocumentsHubPage.vue') },
            { path: 'documents/:pathMatch(.*)*', name: 'AdminDocuments', component: PlaceholderPage, props: route => ({ type: 'documents' }) },
            { path: 'settings/:pathMatch(.*)*', name: 'AdminSettings', component: SettingsPage },

            // ============================================
            // HR MODULE (ADMIN ONLY) — Phase 0 scaffolding
            // ============================================
            { path: 'hr', redirect: '/admin/hr/dashboard' },
            { path: 'hr/dashboard', name: 'HrDashboard', component: () => import('../views/hr/HrDashboardPage.vue') },
            { path: 'hr/employees', redirect: '/admin/hr/employees/all' },
            {
                path: 'hr/employees/:tab(all|directory|profiles|history|lifecycle|transfers|promotions|confirmations|probation|suspended|inactive|archived|add)',
                name: 'HrEmployeesTab',
                component: () => import('../views/hr/employees/HrEmployeesWorkspacePage.vue'),
            },
            {
                path: 'hr/employees/profile/:id',
                name: 'HrEmployeeProfile',
                component: () => import('../views/hr/employees/EmployeeProfilePage.vue'),
                props: true,
            },
            { path: 'hr/employee-documents', redirect: '/admin/hr/employee-documents/dashboard' },
            {
                path: 'hr/employee-documents/:tab(dashboard|kyc|contracts|certificates|salary-slips|experience-letters|id-proofs|education|compliance|verification|requests|expiry|templates|reports|archive)',
                name: 'HrEmployeeDocumentsTab',
                component: () => import('../views/hr/employee-documents/HrEmployeeDocumentsWorkspacePage.vue'),
            },
            { path: 'hr/recruitment', redirect: '/admin/hr/recruitment/dashboard' },
            {
                path: 'hr/recruitment/:tab(dashboard|requisitions|positions|candidates|applications|screening|interviews|panels|offers|pipeline|rehire|analytics)',
                name: 'HrRecruitmentTab',
                component: () => import('../views/hr/recruitment/HrRecruitmentWorkspacePage.vue'),
            },
            { path: 'hr/onboarding', redirect: '/admin/hr/onboarding/dashboard' },
            // Training management consolidated into the dedicated Training module —
            // legacy onboarding/training links now land on Employee Trainings.
            { path: 'hr/onboarding/training', redirect: '/admin/hr/training/enrollment' },
            {
                path: 'hr/onboarding/:tab(dashboard|pending-joining|checklist|approvals|documents|identity|assets|account-provisioning|welcome-kit|induction|probation|tasks|reports)',
                name: 'HrOnboardingTab',
                component: () => import('../views/hr/onboarding/HrOnboardingWorkspacePage.vue'),
            },
            { path: 'hr/attendance', redirect: '/admin/hr/attendance/dashboard' },
            // Shift template CRUD + assignment moved to the Shifts & Rosters workspace.
            { path: 'hr/attendance/shifts', redirect: '/admin/hr/shifts/management' },
            {
              path: 'hr/attendance/:tab(dashboard|daily|corrections|wfh|half-day|excess-breaks|biometric|policies|late-rules|overtime|remote|geo|holidays|reports|logs|exceptions)',
              name: 'HrAttendanceTab',
              component: () => import('../views/hr/attendance/HrAttendanceWorkspacePage.vue'),
            },
            { path: 'hr/leave', redirect: '/admin/hr/leave/dashboard' },
            {
              path: 'hr/leave/:tab(dashboard|applications|my-approvals|hr-queue|manager-queue|calendar|balances|policies|holidays|comp-off|encashment|reports|audit-logs)',
              name: 'HrLeaveTab',
              component: () => import('../views/hr/leave/HrLeaveWorkspacePage.vue'),
            },
            { path: 'hr/shifts', redirect: '/admin/hr/shifts/dashboard' },
            {
              path: 'hr/shifts/:tab(dashboard|management|assignment|rotation|rosters|calendar|coverage|swap|workforce|night|holidays|overtime-rules|reports|audit-logs)',
              name: 'HrShiftsTab',
              component: () => import('../views/hr/shifts/HrShiftsWorkspacePage.vue'),
            },
            { path: 'hr/payroll', redirect: '/admin/hr/payroll/dashboard' },
            {
                path: 'hr/payroll/:tab(dashboard|structures|components|compensation|processing|monthly|approval|payslips|revisions|arrears|bonus|incentives|variable-pay|tax|tds|statutory|tax-documents|bank-files|reports|audit-logs)',
                name: 'HrPayrollTab',
                component: () => import('../views/hr/payroll/HrPayrollWorkspacePage.vue'),
            },
            { path: 'hr/reimbursements', redirect: '/admin/hr/reimbursements/dashboard' },
            {
                path: 'hr/reimbursements/:tab(dashboard|claims|approvals|settlement|policies|categories|audit-logs|reports)',
                name: 'HrReimbursementsTab',
                component: () => import('../views/hr/reimbursements/HrReimbursementsWorkspacePage.vue'),
            },
            { path: 'hr/training', redirect: '/admin/hr/training/dashboard' },
            {
                path: 'hr/training/:tab(dashboard|programs|trainers|materials|enrollment|skill-matrix|certifications|certification-expiry|compliance|requests|feedback|assessments|calendar|budget|reports|audit-logs)',
                name: 'HrTrainingTab',
                component: () => import('../views/hr/training/HrTrainingWorkspacePage.vue'),
            },
            { path: 'hr/performance', redirect: '/admin/hr/performance/dashboard' },
            {
                path: 'hr/performance/:tab(dashboard|insights|reviews|cycles|calibration|merit|goals|feedback|pips)',
                name: 'HrPerformanceTab',
                component: () => import('../views/hr/performance/HrPerformanceWorkspacePage.vue'),
            },
            { path: 'hr/assets', redirect: '/admin/hr/assets/dashboard' },
            {
                path: 'hr/assets/:tab(dashboard|inventory|allocations|returns|history|transfers|damage|maintenance|audits|disposal|categories|vendors|reports|audit-logs)',
                name: 'HrAssetsTab',
                component: () => import('../views/hr/assets/HrAssetsWorkspacePage.vue'),
            },
            { path: 'hr/travel', redirect: '/admin/hr/travel/dashboard' },
            {
                path: 'hr/travel/:tab(dashboard|requests|approvals|booking|da|settlement|advances|policies|categories|calendar|reports|audit-logs)',
                name: 'HrTravelTab',
                component: () => import('../views/hr/travel/HrTravelWorkspacePage.vue'),
            },
            { path: 'hr/exit', redirect: '/admin/hr/exit/dashboard' },
            {
                path: 'hr/exit/:tab(dashboard|resignation|notice|interviews|clearance|asset-return|settlement|experience-letter|relieving-letter|policies|reports|audit-logs)',
                name: 'HrExitTab',
                component: () => import('../views/hr/exit/HrExitWorkspacePage.vue'),
            },
            { path: 'hr/settings', redirect: '/admin/hr/settings/dashboard' },
            {
                path: 'hr/settings/:tab(dashboard|payroll-rules|appraisal-templates|merit-policy|designations|grades|departments|employment-types|employee-categories|work-locations|approval-workflows|notification-rules|compliance|numbering-series|separation-reasons|recruitment|onboarding|training|asset-categories|asset-types|audit-logs)',
                name: 'HrSettingsTab',
                component: () => import('../views/hr/settings/HrSettingsWorkspacePage.vue'),
            },
            { path: 'hr/audit-logs', name: 'HrAuditLogs', component: PlaceholderPage, props: () => ({ type: 'hr', moduleName: 'HR Audit Logs', phase: 'Phase 1 — Foundation' }) },
            { path: 'hr/:pathMatch(.*)*', name: 'AdminHrCatchall', component: PlaceholderPage, props: () => ({ type: 'hr' }) },

            // ============================================
            // SUPPORT DESK (ADMIN) — Phase 1 scaffolding
            // ============================================
            // Admin = slim config + oversight (agent operations live on /user/support).
            // Each module is its own page with internal tabs via SupportModuleWorkspace.
            { path: 'support-desk', redirect: '/admin/support-desk/dashboard' },
            // 'Assigned' tab was removed — for agents scope=my duplicates My Tickets.
            { path: 'support-desk/tickets/assigned', redirect: '/admin/support-desk/tickets/my' },
            // Tickets renders the vertical SdWorkspaceRail (driven by its registry tabs) via the generic workspace.
            {
                path: 'support-desk/:module(dashboard|dashboards|tickets|queues|incidents|problems|service-requests|changes|knowledge-base|sla|communication|assets|team|automation|ai|approvals|surveys|monitoring|reports|clients|service-catalog|announcements|channels|integrations|settings|audit)/:tab?',
                name: 'SupportDeskAdmin',
                component: () => import('../views/support-desk/SupportModuleWorkspace.vue'),
            },
            { path: 'support-desk/:pathMatch(.*)*', redirect: '/admin/support-desk/dashboard' },

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
