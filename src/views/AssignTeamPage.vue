<template>
  <div ref="pageRoot" class="assign-team-page atlas-skin">
    <!-- Ambient backdrop unique to the project section -->
    <div class="atlas-backdrop" aria-hidden="true" data-anim="backdrop">
      <div class="atlas-base"></div>
      <svg class="atlas-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="forge-bp" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(245,158,11,0.05)" stroke-width="0.2"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#forge-bp)"/>
      </svg>
      <div class="atlas-orb a-orb-1" data-orb="1"></div>
      <div class="atlas-orb a-orb-2" data-orb="2"></div>
    </div>

    <!-- Header: Forge Assignment -->
    <header class="page-header forge-assignment-hero">
      <div class="header-left">
        <div class="header-icon" data-anim="header-icon">
          <UsersRound :size="22" />
        </div>
        <div class="header-text">
          <div class="hero-eyebrow" data-anim="hero-eyebrow"><Compass :size="11"/> FORGE ASSIGNMENT</div>
          <h1 data-anim="hero-title">Team Assignment</h1>
          <p data-anim="hero-subtitle">Stage teams against approved government projects.</p>
        </div>
      </div>
      <div class="header-right" data-anim="hero-cta">
        <div class="search-bar">
          <Search :size="14" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Search projects, codes, departments…" />
        </div>
      </div>
    </header>

    <!-- Stats Dashboard -->
    <div class="stats-dashboard">
      <div data-anim="stat-tile">
        <StatsCard label="Active Projects" :value="totalRecords">
          <template #icon>
            <FolderKanban :size="24" />
          </template>
        </StatsCard>
      </div>

      <div data-anim="stat-tile">
        <StatsCard label="Unassigned Projects" :value="unassignedProjectsCount">
          <template #icon>
            <AlertCircle :size="24" />
          </template>
        </StatsCard>
      </div>

      <div data-anim="stat-tile">
        <StatsCard label="Pending Invites" :value="pendingInvitesCount">
          <template #icon>
            <Clock :size="24" />
          </template>
        </StatsCard>
      </div>

      <div data-anim="stat-tile">
        <StatsCard label="Total Budget" :value="formatCompactNumber(totalBudget)">
          <template #icon>
            <span class="currency-symbol">$</span>
          </template>
        </StatsCard>
      </div>
    </div>

    <!-- Invitation Status Filter (User Panel Only) -->
    <div v-if="!isAdmin" class="filter-tabs" data-anim="filter-bar">
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'all' }"
        @click="setInviteFilter('all')"
      >
        All
      </button>
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'pending' }"
        @click="setInviteFilter('pending')"
      >
        <Clock :size="14" />
        Pending
      </button>
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'accepted' }"
        @click="setInviteFilter('accepted')"
      >
        <Check :size="14" />
        Accepted
      </button>
      <button 
        class="filter-tab declined" 
        :class="{ active: inviteFilter === 'declined' }"
        @click="setInviteFilter('declined')"
      >
        <X :size="14" />
        Rejected
      </button>
      <button 
        class="filter-tab received" 
        :class="{ active: inviteFilter === 'received' }"
        @click="setInviteFilter('received')"
      >
        <Briefcase :size="14" />
        Received
      </button>
    </div>

    <!-- Admin Filters -->
    <div v-if="isAdmin" class="admin-filters" data-anim="filter-bar">
      <DatePicker 
        v-model="startDate" 
        placeholder="Start Date" 
        class="filter-date"
      />
      
      <DatePicker 
        v-model="endDate" 
        placeholder="End Date" 
        class="filter-date"
        :min-date="startDate"
        :disabled="!startDate"
      />
      
      <ProjectOwnerSelect 
        v-model="projectOwnerId" 
        @change="handleFilterChange" 
      />
      
      <CustomSelect
        v-model="invitationStatus"
        :options="invitationStatusOptions"
        label-key="label"
        value-key="value"
        placeholder="Invitation Status"
        class="filter-status"
        @change="handleFilterChange"
      />

      <button v-if="hasActiveFilters" class="clear-filters-btn" @click="clearFilters">
        <X :size="14" />
        Clear
      </button>
    </div>

    <!-- Reinvented Assignment Table -->
    <section class="atp-table" data-anim="table">
      <header class="atp-table__chrome">
        <div class="atp-chrome__left">
          <span class="atp-chrome__indicator" aria-hidden="true"></span>
          <h2 class="atp-chrome__title">{{ tableTitle }}</h2>
          <span class="atp-chrome__count">{{ filteredProjects.length }}</span>
        </div>
      </header>

      <div class="atp-legend" aria-hidden="true">
        <span class="atp-legend__cell legend-project">Project</span>
        <span class="atp-legend__cell legend-meta">Focus · Organisation</span>
        <span class="atp-legend__cell legend-timeline">Timeline</span>
        <span class="atp-legend__cell legend-budget">Budget</span>
        <span class="atp-legend__cell legend-team">Team</span>
        <span class="atp-legend__cell legend-owner">Owner</span>
        <span class="atp-legend__cell legend-action"></span>
      </div>

      <TransitionGroup name="atp-row" tag="ol" class="atp-rows">
        <li
          v-for="p in filteredProjects"
          :key="p.id"
          class="atp-row"
          :class="{ 'atp-row--expanded': expandedId === p.id, 'atp-row--invite': inviteFilter === 'received' }"
          data-anim="row"
          @click="toggleExpand(p)"
        >
          <span
            class="atp-row__ribbon"
            :class="`atp-ribbon--${(p.priority || 'low').toLowerCase()}`"
            :title="`Priority: ${p.priority || '—'}`"
            aria-hidden="true"
          ></span>

          <div class="atp-row__grid" :data-org="p.organization || '—'" :data-type="p.project_type || 'General'">
            <!-- 1 Project -->
            <div class="atp-cell atp-cell--project">
              <div class="atp-project__head">
                <h3 class="atp-project__name">{{ p.name }}</h3>
                <span class="atp-project__code">{{ p.code }}</span>
              </div>
              <div class="atp-tagrail" v-if="p.category || p.lifecycle_status || p.priority">
                <span class="atp-tag atp-tag--cat"  v-if="p.category">{{ p.category }}</span>
                <span class="atp-tag atp-tag--life" v-if="p.lifecycle_status">{{ p.lifecycle_status }}</span>
                <span class="atp-tag atp-tag--prio" v-if="p.priority">{{ p.priority }}</span>
              </div>
            </div>

            <!-- 2 Meta -->
            <div class="atp-cell atp-cell--meta">
              <span class="atp-meta__org" :title="p.organization">{{ p.organization || '—' }}</span>
              <span class="atp-meta__sep">·</span>
              <span class="atp-meta__type">{{ p.project_type || 'General' }}</span>
            </div>

            <!-- 3 Timeline -->
            <div class="atp-cell atp-cell--timeline">
              <div class="atp-track">
                <span class="atp-track__bar" aria-hidden="true"></span>
                <span class="atp-track__fill" :style="trackFillStyle(p)" aria-hidden="true"></span>
                <span class="atp-track__now" :style="trackNowStyle(p)" aria-hidden="true"></span>
              </div>
              <div class="atp-track__labels">
                <span class="atp-track__start">{{ formatDateCompact(p.start_date) }}</span>
                <span class="atp-track__dur">{{ getDuration(p.start_date, p.end_date) }}</span>
                <span class="atp-track__end">{{ formatDateCompact(p.end_date) }}</span>
              </div>
            </div>

            <!-- 4 Budget -->
            <div class="atp-cell atp-cell--budget">
              <span class="atp-budget__sym">{{ currencySymbol(p.currency) }}</span>
              <span class="atp-budget__amt">{{ formatBudget(p.budget_amount) }}</span>
              <span class="atp-budget__ccy">{{ p.currency || 'USD' }}</span>
            </div>

            <!-- 5 Team -->
            <div class="atp-cell atp-cell--team">
              <ul class="atp-avatars" v-if="p.team_members && p.team_members.length">
                <li
                  v-for="(m, i) in p.team_members.slice(0, 4)"
                  :key="i"
                  class="atp-avatar"
                  :class="{ 'atp-avatar--declined': m.status === 'declined' }"
                  :style="{ background: getAvatarColor(m), zIndex: 4 - i }"
                  :title="`${m.user_name || 'User'} · ${m.status}`"
                >
                  {{ getInitials(m.user_name || 'User') }}
                </li>
                <li
                  v-if="p.team_members.length > 4"
                  class="atp-avatar atp-avatar--more"
                  :title="`+${p.team_members.length - 4} more`"
                >
                  +{{ p.team_members.length - 4 }}
                </li>
              </ul>
              <span v-else class="atp-avatars__empty">No team</span>
            </div>

            <!-- 6 Owner -->
            <div class="atp-cell atp-cell--owner">
              <span class="atp-owner__dot" :style="{ background: getGradient(p.created_by_name) }">
                {{ getInitials(p.created_by_name) }}
              </span>
              <span class="atp-owner__name" :title="p.created_by_name">{{ p.created_by_name }}</span>
            </div>

            <!-- 7 Action -->
            <div class="atp-cell atp-cell--action" @click.stop>
              <div v-if="inviteFilter === 'received'" class="atp-action__pair">
                <button
                  class="atp-iconbtn atp-iconbtn--accept"
                  title="Accept invitation"
                  @click="respondToInvite(p, true)"
                >
                  <Check :size="15" />
                </button>
                <button
                  class="atp-iconbtn atp-iconbtn--decline"
                  title="Decline invitation"
                  @click="respondToInvite(p, false)"
                >
                  <X :size="15" />
                </button>
              </div>
              <button
                v-else
                class="atp-manage"
                @click="openTeamPanel(p)"
              >
                <span>Manage</span>
                <ArrowRight :size="13" />
              </button>
            </div>
          </div>

          <Transition
            :css="false"
            @before-enter="onDetailBeforeEnter"
            @enter="onDetailEnter"
            @leave="onDetailLeave"
          >
            <div
              v-if="expandedId === p.id"
              class="atp-row__detail"
              @click.stop
            >
              <div class="atp-detail__col">
                <span class="atp-detail__label">Milestones</span>
                <span class="atp-detail__value">{{ p.milestone_count != null ? p.milestone_count : '—' }}</span>
              </div>
              <div class="atp-detail__col">
                <span class="atp-detail__label">Lifecycle</span>
                <span class="atp-detail__value">{{ p.lifecycle_status || '—' }}</span>
              </div>
              <div class="atp-detail__col">
                <span class="atp-detail__label">Last activity</span>
                <span class="atp-detail__value">{{ formatDate(p.updated_at || p.last_activity_at) }}</span>
              </div>
              <div class="atp-detail__col">
                <span class="atp-detail__label">Created</span>
                <span class="atp-detail__value">{{ formatDate(p.created_at) }}</span>
              </div>
              <div class="atp-detail__actions">
                <button class="atp-link" @click="openProjectDetails(p)">
                  Full details
                  <ArrowRight :size="12" />
                </button>
              </div>
            </div>
          </Transition>
        </li>
      </TransitionGroup>

      <!-- Skeleton rows -->
      <ol v-if="isLoading" class="atp-rows atp-rows--skeleton" aria-hidden="true">
        <li v-for="n in 5" :key="`sk-${n}`" class="atp-row atp-row--skeleton">
          <span class="atp-row__ribbon atp-ribbon--skeleton"></span>
          <div class="atp-row__grid">
            <div class="atp-cell atp-cell--project">
              <div class="sk-bar w-60"></div>
              <div class="sk-bar w-40 sk-thin"></div>
            </div>
            <div class="atp-cell atp-cell--meta"><div class="sk-bar w-80 sk-thin"></div></div>
            <div class="atp-cell atp-cell--timeline"><div class="sk-bar w-100 sk-thin"></div></div>
            <div class="atp-cell atp-cell--budget"><div class="sk-bar w-50"></div></div>
            <div class="atp-cell atp-cell--team">
              <div class="sk-dot"></div><div class="sk-dot"></div><div class="sk-dot"></div>
            </div>
            <div class="atp-cell atp-cell--owner">
              <div class="sk-dot"></div><div class="sk-bar w-50 sk-thin"></div>
            </div>
            <div class="atp-cell atp-cell--action"><div class="sk-btn"></div></div>
          </div>
        </li>
      </ol>

      <!-- Empty state -->
      <div v-if="!isLoading && filteredProjects.length === 0" class="atp-empty">
        <div class="atp-empty__art" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="100" height="100">
            <defs>
              <linearGradient id="atp-empty-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#f97316" stop-opacity="0.20"/>
              </linearGradient>
            </defs>
            <polygon points="60,12 102,36 102,84 60,108 18,84 18,36"
                     fill="none" stroke="url(#atp-empty-grad)" stroke-width="1.5"/>
            <circle cx="60" cy="60" r="34" fill="none" stroke="rgba(251,191,36,0.35)" stroke-dasharray="3 5" stroke-width="1"/>
            <circle cx="60" cy="60" r="6" fill="#f97316"/>
          </svg>
        </div>
        <h3 class="atp-empty__title">No projects in this view</h3>
        <p class="atp-empty__sub">Switch the filter above, or invite teammates to a project.</p>
        <button class="atp-empty__cta" @click="setInviteFilter('all')">View all projects</button>
      </div>
    </section>

    <!-- Pagination -->
    <PaginationControls 
       v-if="!isLoading && projects.length > 0"
       v-model:page="page"
       v-model:limit="limit"
       :total="totalRecords"
       :totalPages="totalPages"
       @update:page="fetchProjects"
       @update:limit="fetchProjects"
    />

    <!-- Project Details — transparent side drawer (matches Document Drive pattern) -->
    <SidePanelDrawer
      :is-open="showDetailsModal"
      :title="selectedProject?.name || 'Project Details'"
      :subtitle="selectedProject?.code"
      :icon="Briefcase"
      :width="560"
      @close="showDetailsModal = false"
    >
      <ProjectDetailsPanel v-if="selectedProject" :project="selectedProject" @refresh="fetchProjects" />

      <template #footer>
        <button class="spd-btn-text" @click="showDetailsModal = false">Close</button>
        <button class="spd-btn-primary" @click="openTeamPanelFromDetails">
          Manage Team
        </button>
      </template>
    </SidePanelDrawer>

    <!-- Team Management — transparent side drawer (matches Project Details drawer) -->
    <SidePanelDrawer
      :is-open="showTeamModal"
      :title="'Assign Team'"
      :subtitle="teamProject?.name"
      :icon="UsersRound"
      :width="640"
      @close="showTeamModal = false"
    >
      <!-- Redesigned Team Management — structured, scroll-free, motion-v driven -->
      <div class="tmp">
        <!-- Insights strip -->
        <Motion
          class="tmp-insights"
          :initial="{ opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <Motion
            class="tmp-insight"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }"
          >
            <div class="tmp-insight__num">{{ filteredUsers.length }}</div>
            <div class="tmp-insight__label"><Users :size="11" /> Available</div>
          </Motion>
          <Motion
            class="tmp-insight tmp-insight--selected"
            :class="{ 'is-active': selectedUsers.length }"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }"
          >
            <div class="tmp-insight__num">{{ selectedUsers.length }}</div>
            <div class="tmp-insight__label"><Sparkles :size="11" /> Selected</div>
          </Motion>
          <Motion
            class="tmp-insight"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }"
          >
            <div class="tmp-insight__num">{{ assignedMembers.length }}</div>
            <div class="tmp-insight__label"><ShieldCheck :size="11" /> On team</div>
          </Motion>
        </Motion>

        <!-- Search -->
        <Motion
          class="tmp-search"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }"
        >
          <Search :size="15" class="tmp-search__icon" />
          <input
            v-model="memberSearch"
            type="text"
            class="tmp-search__input"
            placeholder="Search teammates by name…"
          />
          <button
            v-if="memberSearch"
            class="tmp-search__clear"
            type="button"
            @click="memberSearch = ''"
            aria-label="Clear search"
          >
            <X :size="13" />
          </button>
        </Motion>

        <!-- Available people -->
        <section class="tmp-section">
          <Motion
            class="tmp-section__head"
            :initial="{ opacity: 0, x: -8 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.36, delay: 0.28, ease: [0.16, 1, 0.3, 1] }"
          >
            <span class="tmp-section__bar"></span>
            <h3 class="tmp-section__title">Available people</h3>
            <span class="tmp-section__pill">{{ filteredUsers.length }}</span>
          </Motion>

          <div v-if="filteredUsers.length" class="tmp-roster">
            <Motion
              v-for="(user, i) in filteredUsers"
              :key="user.id"
              as="button"
              type="button"
              class="tmp-card"
              :class="{ 'tmp-card--on': isSelected(user.id) }"
              :initial="{ opacity: 0, y: 14, scale: 0.96 }"
              :animate="{ opacity: 1, y: 0, scale: 1 }"
              :transition="{ duration: 0.32, delay: 0.30 + Math.min(i, 14) * 0.025, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ y: -3, scale: 1.015 }"
              :whileTap="{ scale: 0.96 }"
              @click="toggleUser(user)"
            >
              <div class="tmp-card__glow" aria-hidden="true"></div>
              <div class="tmp-card__avatar" :style="{ background: getGradient(user.full_name) }">
                {{ getInitials(user.full_name) }}
              </div>
              <div class="tmp-card__body">
                <span class="tmp-card__name">{{ user.full_name }}</span>
                <span class="tmp-card__email">{{ user.email }}</span>
              </div>
              <span class="tmp-card__mark">
                <Check v-if="isSelected(user.id)" :size="14" />
                <Plus v-else :size="14" />
              </span>
            </Motion>
          </div>

          <Motion
            v-else
            class="tmp-empty"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="tmp-empty__icon"><Users :size="20" /></div>
            <p class="tmp-empty__text">{{ memberSearch ? 'No teammates match your search.' : 'Every available teammate is already on this project.' }}</p>
          </Motion>
        </section>

        <!-- Assigned team (admin only) -->
        <section class="tmp-section" v-if="isAdmin && assignedMembers.length">
          <Motion
            class="tmp-section__head"
            :initial="{ opacity: 0, x: -8 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.36, delay: 0.34, ease: [0.16, 1, 0.3, 1] }"
          >
            <span class="tmp-section__bar tmp-section__bar--gold"></span>
            <h3 class="tmp-section__title">On the team</h3>
            <span class="tmp-section__pill">{{ assignedMembers.length }}</span>
          </Motion>

          <div class="tmp-team">
            <Motion
              v-for="(member, i) in assignedMembers"
              :key="member.id"
              class="tmp-member"
              :class="{ 'is-owner': member.role === 'Owner', 'is-declined': member.status === 'declined' }"
              :initial="{ opacity: 0, x: -14 }"
              :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.34, delay: 0.36 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ x: 2 }"
            >
              <div class="tmp-member__avatar" :style="{ background: getGradient(member.user_name) }">
                {{ getInitials(member.user_name) }}
              </div>
              <div class="tmp-member__body">
                <div class="tmp-member__row">
                  <span class="tmp-member__name">{{ member.user_name }}</span>
                  <span v-if="member.role === 'Owner'" class="tmp-member__crown">
                    <Crown :size="10" />
                    Owner
                  </span>
                </div>
                <span class="tmp-member__status" :class="member.status">
                  <span class="tmp-status-dot" :class="member.status"></span>
                  {{ member.status }}
                </span>
              </div>
              <div class="tmp-member__actions" v-if="member.role !== 'Owner'">
                <Motion
                  v-if="member.status === 'declined'"
                  as="button"
                  type="button"
                  class="tmp-iconbtn tmp-iconbtn--override"
                  title="Override and add to team"
                  :whileHover="{ y: -1, scale: 1.05 }"
                  :whileTap="{ scale: 0.94 }"
                  @click="openOverrideDialog(member)"
                >
                  <UserCheck :size="13" />
                </Motion>
                <Motion
                  as="button"
                  type="button"
                  class="tmp-iconbtn tmp-iconbtn--remove"
                  title="Remove from team"
                  :whileHover="{ y: -1, scale: 1.05 }"
                  :whileTap="{ scale: 0.94 }"
                  :disabled="removingMember === member.id"
                  @click="openRemoveDialog(member)"
                >
                  <Loader2 v-if="removingMember === member.id" :size="13" class="spin" />
                  <Trash2 v-else :size="13" />
                </Motion>
              </div>
            </Motion>
          </div>
        </section>
      </div>

      <template #footer>
        <button class="spd-btn-text" @click="clearSelected">Clear</button>
        <button
          class="spd-btn-primary"
          @click="submitTeam"
          :disabled="!selectedUsers.length || isSubmitting"
        >
          <Loader2 v-if="isSubmitting" :size="16" class="spin" />
          <Send v-else :size="16" />
          <span>Assign {{ selectedUsers.length ? `(${selectedUsers.length})` : '' }}</span>
        </button>
      </template>
    </SidePanelDrawer>

    <!-- Remove Reason Dialog using ConfirmationModal -->
    <ConfirmationModal
      :isOpen="showRemoveDialog"
      title="Remove Team Member"
      :message="`You are about to remove ${memberToRemove?.user_name} from this project. This action cannot be undone.`"
      confirmText="Remove Member"
      cancelText="Cancel"
      :icon="Trash2"
      :loading="!!removingMember"
      @close="cancelRemove"
      @confirm="confirmRemove"
    >
      <!-- Custom slot for reason input -->
      <div class="reason-input-group">
        <label class="reason-label">Reason for removal <span class="required">*</span></label>
        <textarea 
          v-model="removeReason" 
          class="reason-textarea"
          :class="{ 'has-error': reasonError }"
          placeholder="Please provide a reason for removing this team member..."
          rows="3"
        ></textarea>
        <span v-if="reasonError" class="reason-error">Reason is required</span>
      </div>
    </ConfirmationModal>

    <!-- Decline Invitation Dialog -->
    <ConfirmationModal
      :isOpen="showDeclineModal"
      title="Decline Team Invitation"
      :message="`Are you sure you want to decline the invitation for '${declineItem?.name || 'this project'}'?`"
      confirmText="Decline Invitation"
      cancelText="Cancel"
      :icon="X"
      :loading="declining"
      @close="cancelDecline"
      @confirm="confirmDecline"
    >
      <div class="reason-input-group">
        <label class="reason-label">Reason for declining <span class="required">*</span></label>
        <textarea 
          v-model="declineReason" 
          class="reason-textarea"
          :class="{ 'has-error': declineError }"
          placeholder="Please provide a reason..."
          rows="3"
        ></textarea>
        <span v-if="declineError" class="reason-error">Reason is required</span>
      </div>
    </ConfirmationModal>


    <!-- Override Confirmation Dialog -->
    <ConfirmationModal
      :isOpen="showOverrideDialog"
      title="Override Declined Invitation"
      :message="`Are you sure you want to force-add ${memberToOverride?.user_name} to the team? They previously declined the invitation.`"
      confirmText="Override & Add"
      cancelText="Cancel"
      :icon="UserCheck"
      :loading="!!overridingMember"
      @close="cancelOverride"
      @confirm="confirmOverride"
    >
      <!-- Override Reason Input -->
      <div class="reason-input-group">
        <label class="reason-label">Override Reason</label>
        <textarea 
          v-model="overrideReason" 
          class="reason-textarea"
          placeholder="Provide a reason for overriding this decline (optional)..."
          rows="3"
        ></textarea>
      </div>
    </ConfirmationModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import SidePanelDrawer from '../components/ui/SidePanelDrawer.vue'
import ProjectDetailsPanel from '../components/projects/ProjectDetailsPanel.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import ProjectOwnerSelect from '../components/ui/ProjectOwnerSelect.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import StatsCard from '../components/ui/StatsCard.vue'
import ConfirmationModal from '../components/ui/ConfirmationModal.vue'
import {
  UsersRound, Search, FolderKanban, Briefcase, UserPlus, Users, Calendar,
  Check, Plus, Send, Loader2, AlertCircle, Clock, X, UserMinus, Crown, Trash2, UserCheck,
  Compass, ArrowRight, Sparkles, ShieldCheck
} from 'lucide-vue-next'
import { Motion } from 'motion-v'
import PaginationControls from '../components/ui/PaginationControls.vue'
import gsap from 'gsap'
import { useGsapAnim } from '../composables/useGsapAnim'
import { useParallaxOrbs } from '../composables/useParallaxOrbs'
import { assignTeamEntry } from '../animations/pageChoreography'
import { API } from '@/utils/api'

const route = useRoute()
const { success, error } = useToast()

// State
const projects = ref([])
const users = ref([])
const isLoading = ref(true)
const memberSearch = ref('')
const currentUserId = ref(null) // To track current user for "Received" filter

// Pagination
const page = ref(1)
const limit = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)

// Modals
const showDetailsModal = ref(false)
const showTeamModal = ref(false)
const teamProject = ref(null)
const selectedUsers = ref([])
const isSubmitting = ref(false)

// Decline Modal State (for Received tab)
const showDeclineModal = ref(false)
const declineReason = ref('')
const declineError = ref(false)
const declineItem = ref(null)
const declining = ref(false)

// Remove Dialog State
const showRemoveDialog = ref(false)
const memberToRemove = ref(null)
const removeReason = ref('')
const removingMember = ref(null)
const reasonError = ref(false)

// Invitation Filter (User Panel Only)
const inviteFilter = ref('all') // 'all', 'pending', 'accepted', 'declined', 'received'
const searchQuery = ref('')
const selectedProject = ref(null) // For details panel

// Admin Filters State
const startDate = ref('')
const endDate = ref('')
const projectOwnerId = ref(null)
const invitationStatus = ref(null)

const invitationStatusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Removed', value: 'removed' }
]

const hasActiveFilters = computed(() => {
  return startDate.value || endDate.value || projectOwnerId.value || invitationStatus.value
})

const clearFilters = () => {
  startDate.value = ''
  endDate.value = ''
  projectOwnerId.value = null
  invitationStatus.value = null
  fetchProjects()
}

// Debounced filter handler to prevent multiple rapid API calls
let filterDebounceTimeout = null
const debouncedFetchProjects = () => {
  if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout)
  filterDebounceTimeout = setTimeout(() => {
    page.value = 1
    fetchProjects()
  }, 300) // 300ms debounce
}

// Watch general filters (Owner, Status) to refresh with debounce
watch([projectOwnerId, invitationStatus], debouncedFetchProjects)

// Watch Date Filters specifically to enforce "Combined" logic
watch([startDate, endDate], ([newStart, newEnd]) => {
  // If Start Date changes and matches or exceeds End Date, clear End Date (Validation)
  if (newStart && newEnd && new Date(newStart) > new Date(newEnd)) {
    endDate.value = ''
    return // Exit, don't fetch yet (wait for valid end date)
  }

  // Only fetch if BOTH are set, or BOTH are empty (cleared)
  const bothSet = newStart && newEnd
  const bothEmpty = !newStart && !newEnd

  if (bothSet || bothEmpty) {
    debouncedFetchProjects()
  }
})

const isAdmin = computed(() => route.path.startsWith('/admin'))

const tableTitle = computed(() => {
  if (isAdmin.value) {
    if (!invitationStatus.value) return 'All Projects'
    const statusLabels = {
      pending: 'Pending Projects',
      accepted: 'Accepted Projects',
      declined: 'Declined Projects',
      removed: 'Removed Projects'
    }
    return statusLabels[invitationStatus.value] || 'Projects'
  }
  
  const titles = {
    all: 'Approved Projects',
    pending: 'Pending Invitations',
    accepted: 'Accepted Projects',
    declined: 'Declined Invitations',
    received: 'Received Invitations'
  }
  return titles[inviteFilter.value] || 'Projects'
})

const handleFilterChange = () => {
  // Triggered by selects explicitly if needed, but watch handles it
}


const setInviteFilter = (filter) => {
  inviteFilter.value = filter
}



// Assigned team members for current project
const assignedMembers = computed(() => {
  if (!teamProject.value?.team_members) return []
  // Show accepted members, plus declined members (so admins can override)
  return teamProject.value.team_members.filter(m => m.status === 'accepted' || m.status === 'declined')
})

// Expand state for inline detail panel
const expandedId = ref(null)
const toggleExpand = (p) => {
  expandedId.value = expandedId.value === p.id ? null : p.id
}

// GSAP-driven height + column stagger for the row detail panel.
// Replaces the old CSS max-height transition which jittered on close
// because of the grid-row constraint and the hardcoded 140px ceiling.
const onDetailBeforeEnter = (el) => {
  el.style.height = '0px'
  el.style.opacity = '0'
  const cols = el.querySelectorAll('.atp-detail__col, .atp-detail__actions')
  gsap.set(cols, { y: 14, opacity: 0 })
}
const onDetailEnter = (el, done) => {
  // Measure natural height
  const prevHeight = el.style.height
  el.style.height = 'auto'
  const target = el.offsetHeight
  el.style.height = prevHeight
  // Height + opacity in
  gsap.to(el, {
    height: target,
    opacity: 1,
    duration: 0.42,
    ease: 'power3.out',
    onComplete: () => {
      el.style.height = 'auto'
      done()
    }
  })
  // Inner cols cascade up
  gsap.to(el.querySelectorAll('.atp-detail__col, .atp-detail__actions'), {
    y: 0,
    opacity: 1,
    duration: 0.45,
    stagger: 0.05,
    delay: 0.08,
    ease: 'expo.out'
  })
}
const onDetailLeave = (el, done) => {
  // Lock current height (in px) so collapse is consistent
  const current = el.offsetHeight
  el.style.height = current + 'px'
  // Cols fade-down first
  gsap.to(el.querySelectorAll('.atp-detail__col, .atp-detail__actions'), {
    y: 8,
    opacity: 0,
    duration: 0.20,
    stagger: 0.03,
    ease: 'power2.in'
  })
  gsap.to(el, {
    height: 0,
    opacity: 0,
    duration: 0.40,
    delay: 0.10,
    ease: 'power3.inOut',
    onComplete: done
  })
}

// Page root for animations
const pageRoot = ref(null)
const { run } = useGsapAnim(pageRoot)
useParallaxOrbs(pageRoot, { strength: 24 })

run(() => {
  assignTeamEntry(pageRoot.value)
})

// Computed
const totalMembers = computed(() => 
  projects.value.reduce((sum, p) => sum + (p.team_members?.length || p.team_count || 0), 0)
)

const serverUnassignedCount = ref(0)
const serverPendingCount = ref(0)
const unassignedProjectsCount = computed(() => serverUnassignedCount.value)
const pendingInvitesCount = computed(() => serverPendingCount.value)

const serverTotalBudget = ref(0) // New state for server-side total

const totalBudget = computed(() => serverTotalBudget.value) // Use server total

const filteredProjects = computed(() => {
  let result = projects.value
  
  // Apply search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q)
    )
  }
  
  // Apply invitation status filter (User Panel Only)
  if (!isAdmin.value && inviteFilter.value !== 'all') {
    result = result.filter(p => {
      const members = p.team_members || []
      const isOwner = p.created_by_id === currentUserId.value

      if (inviteFilter.value === 'received') {
        // "Received" tab: Only show projects where CURRENT USER is invited and Pending
        // Never show owned projects here (since you don't receive invites for your own projects)
        if (isOwner) return false
        return members.some(m => m.user_id === currentUserId.value && m.status === 'pending')
      }

      if (isOwner) {
        // OWNER VIEW: Check status of people I invited (excluding myself)
        const invitedMembers = members.filter(m => m.user_id !== p.created_by_id)
        
        if (inviteFilter.value === 'pending') {
          return invitedMembers.some(m => m.status === 'pending')
        } else if (inviteFilter.value === 'accepted') {
          return invitedMembers.some(m => m.status === 'accepted')
        } else if (inviteFilter.value === 'declined') {
          return invitedMembers.some(m => m.status === 'declined')
        }
      } else {
        // MEMBER VIEW: Check MY status in this project
        const myMembership = members.find(m => m.user_id === currentUserId.value)
        if (!myMembership) return false // Should not notify/list if not a member

        if (inviteFilter.value === 'pending') {
          // "Invitation Sent" tab - usually for owners showing sent invites. 
          // If I am just a member, I shouldn't see projects in "Invitation Sent" 
          // unless I have a role that allows inviting? Assuming purely "My Status" for now:
          return false 
        } else if (inviteFilter.value === 'accepted') {
           // Show if I accepted
          return myMembership.status === 'accepted'
        } else if (inviteFilter.value === 'declined') {
           // Show if I declined
          return myMembership.status === 'declined'
        }
      }
      
      return true
    })
  }
  
  return result
})

const filteredUsers = computed(() => {
  // Only exclude members who are currently on the team (not removed)
  const existingIds = teamProject.value?.team_members
    ?.filter(m => m.status !== 'removed')
    .map(m => m.user_id) || []
    
  let result = users.value.filter(u => !existingIds.includes(u.id))
  
  if (memberSearch.value) {
    const q = memberSearch.value.toLowerCase()
    result = result.filter(u => u.full_name.toLowerCase().includes(q))
  }
  return result
})

// Helpers
const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

const getGradient = (name) => {
  return '#f97316' // Solid orange as requested
}

// Get avatar color based on member status — orange/amber family across the board
const getAvatarColor = (member) => {
  if (member.status === 'declined') return '#d97706'  // Burnt amber
  if (member.status === 'pending')  return '#fbbf24'  // Amber-400
  if (member.status === 'removed')  return '#92400e'  // Deep amber
  return '#f97316' // Orange-500 for accepted/others
}

const currencySymbol = (ccy) => {
  const map = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'AED', JPY: '¥' }
  return map[ccy] || '$'
}

const trackFillStyle = (p) => {
  if (!p.start_date || !p.end_date) return { '--fill': '0%' }
  const start = new Date(p.start_date).getTime()
  const end   = new Date(p.end_date).getTime()
  const now   = Date.now()
  if (now <= start) return { '--fill': '0%' }
  if (now >= end)   return { '--fill': '100%' }
  const pct = ((now - start) / (end - start)) * 100
  return { '--fill': `${pct.toFixed(1)}%` }
}
const trackNowStyle = (p) => {
  if (!p.start_date || !p.end_date) return { display: 'none' }
  return { '--now': trackFillStyle(p)['--fill'] }
}

const formatCompactNumber = (num) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
}

const formatBudget = (amount) => {
  if (!amount) return '0'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateCompact = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const getDuration = (start, end) => {
  if (!start || !end) return '—'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate - startDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) return `${diffDays} days`
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30 * 10) / 10
    return `${months} months`
  }
  const years = Math.round(diffDays / 365 * 10) / 10
  return `${years} years`
}

const isSelected = (userId) => selectedUsers.value.some(u => u.id === userId)

const getToken = () => route.path.startsWith('/admin') 
  ? localStorage.getItem('admin_token') 
  : localStorage.getItem('user_token')

// Actions
const fetchProjects = async (background = false) => {
  if (!background) isLoading.value = true
  try {
    const params = {
      page: page.value,
      limit: limit.value,
      search: searchQuery.value || undefined
    }

    if (isAdmin.value) {
      if (startDate.value) params.start_date = startDate.value
      if (endDate.value) params.end_date = endDate.value
      if (projectOwnerId.value) params.owner_id = projectOwnerId.value
      if (invitationStatus.value) params.invite_status = invitationStatus.value
    } else {
      // User specific filters (handled by backend or existing logic)
      if (inviteFilter.value !== 'all' && inviteFilter.value !== 'received') {
        // Current backend doesn't support 'invite_status' for users in this way, 
        // but 'received' logic is client side or separate logic?
        // Wait, current fetchProjects didn't send inviteFilter before.
        // Looking at lines 650-660 of view_file earlier, it didn't send invites status.
        // It seems purely client side filtering? 
        // "filteredProjects" computed property handles it?
        // Let's check filteredProjects
      }
    }

    const res = await axios.get(`${API}/team/projects`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params
    })
    
    const projectItems = res.data.items || []
    totalRecords.value = res.data.total || 0
    totalPages.value = res.data.pages || 1
    serverTotalBudget.value = res.data.total_budget || 0
    serverUnassignedCount.value = res.data.unassigned_count || 0
    serverPendingCount.value = res.data.pending_count || 0

    // Team members are now included in project response (optimized)
    projects.value = projectItems.map(p => ({
      ...p,
      team_members: p.team_members || []
    }))
    console.log('[Projects] Total:', projectItems.length, 'with teams:', projectItems.filter(p => p.team_members?.length > 0).length)
  } catch (e) {
    if (!background) error('Failed to load projects') // Don't show toast on background fail to avoid spam
    console.error('[Projects] Failed to load:', e)
  } finally {
    if (!background) isLoading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const isUserPanel = !route.path.startsWith('/admin')
    const res = await axios.get(`${API}/team/users`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: { 
        exclude_admins: isUserPanel,
        exclude_self: isUserPanel  // Users can't invite themselves
      }
    })
    users.value = res.data
  } catch (e) {
    error('Failed to load users')
  }
}

const openProjectDetails = async (project) => {
  // Show modal immediately with basic project data
  selectedProject.value = { ...project, team_members: project.team_members || [] }
  showDetailsModal.value = true
  
  // Fetch fresh team members data
  try {
    const teamRes = await axios.get(`${API}/team/${project.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    // Update selectedProject with fresh team data
    selectedProject.value = { ...project, team_members: teamRes.data }
  } catch (e) {
    console.error('Failed to fetch team members:', e)
  }
}

const openTeamPanel = async (project) => {
  // Ensure details modal is fully closed before opening team modal
  showDetailsModal.value = false
  
  // Fetch fresh team members from database
  try {
    const teamRes = await axios.get(`${API}/team/${project.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    teamProject.value = { ...project, team_members: teamRes.data }
  } catch (e) {
    console.error('Failed to fetch team members:', e)
    teamProject.value = { ...project, team_members: project.team_members || [] }
  }
  
  selectedUsers.value = []
  memberSearch.value = ''
  showTeamModal.value = true
}

const openTeamPanelFromDetails = () => {
  showDetailsModal.value = false
  openTeamPanel(selectedProject.value)
}

const toggleUser = (user) => {
  const idx = selectedUsers.value.findIndex(u => u.id === user.id)
  if (idx >= 0) {
    selectedUsers.value.splice(idx, 1)
  } else {
    selectedUsers.value.push(user)
  }
}

const clearSelected = () => { selectedUsers.value = [] }

const submitTeam = async () => {
  if (!selectedUsers.value.length) return
  isSubmitting.value = true
  try {
    await axios.post(
      `${API}/team/${teamProject.value.id}/assign`,
      { user_ids: selectedUsers.value.map(u => u.id) },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Team assigned successfully')
    showTeamModal.value = false
    // Refresh
    fetchProjects()
  } catch (e) {
    console.error('Failed to assign team:', e)
    if (e.response && e.response.data && e.response.data.detail) {
      error(e.response.data.detail)
    } else {
      error('Failed to assign team')
    }
  } finally {
    isSubmitting.value = false
  }
}

// Actions for Invitation Received Tab
const respondToInvite = async (project, accept) => {
  // Find the team member record for the current user in this project
  const member = project.team_members.find(m => m.user_id === currentUserId.value)
  if (!member) return

  if (!accept) {
    declineItem.value = member
    declineReason.value = ''
    declineError.value = false
    showDeclineModal.value = true
    return
  }

  try {
    await axios.post(
      `${API}/team/${member.id}/respond`,
      { accept: true },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Invitation accepted successfully')
    fetchProjects() // Refresh list
  } catch (e) {
    console.error('Failed to accept:', e)
    error('Failed to accept invitation')
  }
}

const confirmDecline = async () => {
  if (!declineReason.value.trim()) {
    declineError.value = true
    return
  }
  
  declining.value = true
  try {
    await axios.post(
      `${API}/team/${declineItem.value.id}/respond`,
      { accept: false, reason: declineReason.value },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Invitation declined')
    showDeclineModal.value = false
    fetchProjects() // Refresh list
  } catch (e) {
    console.error('Failed to decline:', e)
    error('Failed to decline invitation')
  } finally {
    declining.value = false
    declineItem.value = null
  }
}

const cancelDecline = () => {
  showDeclineModal.value = false
  declineItem.value = null
}

// Remove Team Member Dialog Functions
const openRemoveDialog = (member) => {
  // Prevent removal of project owner
  if (member.role === 'Owner') {
    error('Cannot remove the project owner')
    return
  }
  memberToRemove.value = member
  removeReason.value = ''
  reasonError.value = false
  showRemoveDialog.value = true
}

const cancelRemove = () => {
  showRemoveDialog.value = false
  memberToRemove.value = null
  removeReason.value = ''
  reasonError.value = false
}



// Override Dialog State & Functions
const showOverrideDialog = ref(false)
const memberToOverride = ref(null)
const overridingMember = ref(null)
const overrideReason = ref('')

const openOverrideDialog = (member) => {
  memberToOverride.value = member
  overrideReason.value = ''
  showOverrideDialog.value = true
}

const cancelOverride = () => {
  showOverrideDialog.value = false
  memberToOverride.value = null
  overrideReason.value = ''
}

const confirmOverride = async () => {
  if (!memberToOverride.value) return
  overridingMember.value = memberToOverride.value.id
  
  try {
    await axios.post(
      `${API}/team/${memberToOverride.value.id}/override`,
      {},
      { 
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { reason: overrideReason.value.trim() }
      }
    )
    success('Member forced added to team')
    showOverrideDialog.value = false
    memberToOverride.value = null
    overrideReason.value = ''
    
    // Refresh team data
    if (teamProject.value) {
      const teamRes = await axios.get(`${API}/team/${teamProject.value.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      teamProject.value = { ...teamProject.value, team_members: teamRes.data }
    }
    await fetchProjects()
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to override')
  } finally {
    overridingMember.value = null
  }
}

const confirmRemove = async () => {
  // Validate reason is not empty
  if (!removeReason.value.trim()) {
    reasonError.value = true
    return
  }
  reasonError.value = false
  
  if (!memberToRemove.value) return
  removingMember.value = memberToRemove.value.id
  
  try {
    await axios.delete(
      `${API}/team/${memberToRemove.value.id}/remove`,
      { 
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { reason: removeReason.value.trim() }
      }
    )
    success('Team member removed successfully')
    showRemoveDialog.value = false
    memberToRemove.value = null
    removeReason.value = ''
    reasonError.value = false
    
    // Refresh team data for current project
    if (teamProject.value) {
      const teamRes = await axios.get(`${API}/team/${teamProject.value.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      teamProject.value = { ...teamProject.value, team_members: teamRes.data }
    }
    await fetchProjects()
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to remove team member')
  } finally {
    removingMember.value = null
  }
}

// Data Fetching
const fetchCurrentUser = async () => {
  if (isAdmin.value) return 
  try {
    const res = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    currentUserId.value = res.data.id
  } catch (e) {
    console.error('Failed to fetch current user:', e)
  }
}

// Polling for Real-time Updates
const pollingInterval = ref(null)

const startPolling = () => {
  stopPolling() // Ensure only one interval runs
  // Poll every 30 seconds for updates (reduced frequency to improve performance)
  pollingInterval.value = setInterval(() => {
    // Only fetch if tab is visible AND no admin filters are active
    // This prevents polling from overwriting filtered results
    if (!document.hidden && !(isAdmin.value && hasActiveFilters.value)) {
      fetchProjects(true) // Silent background refresh
    }
  }, 30000) // Increased to 30 seconds to reduce load
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

onMounted(() => {
  fetchCurrentUser()
  fetchProjects()
  fetchUsers()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.assign-team-page {
  padding: 32px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between; /* Search on right */
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px; /** Reduced size */
  height: 48px;
  background: rgba(255, 255, 255, 0.03); /** Neutral bg */
  border: 1px solid rgba(255, 255, 255, 0.06); /** Neutral border */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e5e5e5; /** Standard text color */
}

.header-text h1 {
  font-size: 28px;
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.header-text p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* Stats Dashboard */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 Columns */
  gap: 20px; /* Reduced gap */
  margin-bottom: 40px;
}

.currency-symbol {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
}

/* Search Bar */
.search-bar {
  position: relative;
  width: 200px; /* Very small width */
}

.search-bar input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  color: #fff;
  transition: all 0.2s ease;
}

.search-bar input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-bar svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
}

/* Filter Tabs (User Panel) */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 0 4px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.filter-tab.active {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.3);
  color: #f97316;
}

.filter-tab.active:hover {
  background: rgba(249, 115, 22, 0.15);
}

/* Received filter tab — orange theme (unified) */
.filter-tab.received.active {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.32);
}

.admin-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  /* Sit above .atp-table — that table uses backdrop-filter, which spawns a
     new stacking context and was making the dropdowns appear behind it. */
  position: relative;
  z-index: 30;
}

.filter-date {
  width: 140px;
}

.filter-status {
  width: 160px;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid #3a3a3c;
  background: transparent;
  color: #8e8e93;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  border-color: #52525b;
}
/* Declined filter tab — burnt-amber theme */
.filter-tab.declined.active {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
  color: #d97706;
}
.filter-tab.declined.active:hover { background: rgba(217, 119, 6, 0.16); }

/* Received filter tab — amber theme */
.filter-tab.received.active {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.32);
  color: #fbbf24;
}
.filter-tab.received.active:hover { background: rgba(245, 158, 11, 0.18); }

/* Legacy .action-buttons / .btn-icon-action removed — replaced by .atp-iconbtn */

/* Legacy table cell styles removed — replaced by .atp-* design system below */

.btn-manage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #f59e0b 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-manage:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

/* Details Modal Sections */
.details-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.detail-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.detail-value.mono {
  font-family: monospace;
  color: #fde68a;
}

.description-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.budget-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.budget-currency {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.budget-amount {
  font-size: 32px;
  font-weight: 700;
  color: #fbbf24;
}

.timeline-display {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fbbf24;
}

.timeline-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.timeline-date {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.timeline-arrow {
  color: rgba(255, 255, 255, 0.3);
}

.team-list-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-member-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
}

.member-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* Modal Actions Right Aligned */
.modal-actions-right {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.btn-primary, .btn-secondary, .btn-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: 40px;
}

.btn-primary {
  background: #f97316; /* Orange */
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #ea580c;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-text {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
}

.btn-text:hover {
  color: #fff;
}

/* Team Modal Structure */
.team-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-section,
.users-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
}

.section-label .count {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.25);
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
}

/* User List Styling Fixes */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 16px;
  padding-right: 4px; /* Space for scrollbar */
}

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.user-item.selected {
  background: rgba(249, 115, 22, 0.1); /* Orange Tint */
  border-color: rgba(249, 115, 22, 0.3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.user-check {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.user-item.selected .user-check {
  background: #f97316;
  color: white;
}

.team-search {
  position: relative;
  margin-bottom: 16px;
}

.team-search input {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 12px 12px 40px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
}

.team-search input:focus {
  outline: none;
  border-color: #f97316;
  background: rgba(0, 0, 0, 0.4);
}

.team-search svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
}

/* Remove Button */
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Override Button */
.override-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1); /* Amber */
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 8px; /* Spacing between buttons */
}

.override-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  transform: translateY(-1px);
}

/* User Role Badge */
.user-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
}

.user-role.accepted {
  background: rgba(245, 158, 11, 0.10);
  color: #fbbf24;
}

/* Remove Dialog */
.remove-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-dialog {
  width: 400px;
  max-width: 90vw;
  background: linear-gradient(180deg, #1a1a1d 0%, #141417 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.remove-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.remove-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.remove-dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
}

.remove-dialog-header p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 2px 0 0 0;
}

.remove-dialog-body {
  padding: 20px;
}

.remove-dialog-body label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.remove-dialog-body textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #fff;
  resize: none;
  font-family: inherit;
}

.remove-dialog-body textarea:focus {
  outline: none;
  border-color: rgba(239, 68, 68, 0.5);
}

.remove-dialog-body textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.remove-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Assigned Team Section */
.assigned-section {
  margin-top: 8px;
}

.assigned-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.member-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 12px;
}

.assigned-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assigned-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.assigned-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.assigned-item.is-owner {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(0, 0, 0, 0) 100%);
  border-color: rgba(249, 115, 22, 0.15);
}

.assigned-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.assigned-info {
  flex: 1;
  min-width: 0;
}

.assigned-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assigned-name {
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.owner-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.assigned-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: capitalize;
}

.assigned-status.accepted {
  color: #fbbf24;
}

/* Remove Button */
.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: rgba(239, 68, 68, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Confirm Dialog Overlay */
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-dialog {
  width: 420px;
  max-width: 100%;
  background: linear-gradient(180deg, #1f1f23 0%, #18181b 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.confirm-dialog-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.confirm-dialog-icon.danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.confirm-dialog-content {
  margin-bottom: 24px;
}

.confirm-dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0 0 8px 0;
}

.confirm-dialog-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

.confirm-dialog-desc strong {
  color: #f5f5f7;
}

.confirm-dialog-input {
  text-align: left;
  margin-bottom: 24px;
}

.confirm-dialog-input label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.confirm-dialog-input .required {
  color: #ef4444;
}

.confirm-dialog-input textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: #fff;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.confirm-dialog-input textarea:focus {
  outline: none;
  border-color: rgba(249, 115, 22, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.confirm-dialog-input textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.confirm-dialog-input textarea.has-error {
  border-color: #ef4444;
}

.input-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  display: block;
}

.confirm-dialog-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-confirm {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-confirm.danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Reason Input for ConfirmationModal Slot */
.reason-input-group {
  width: 100%;
}

.reason-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reason-label .required {
  color: #ef4444;
}

.reason-textarea {
  width: 100%;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  color: #fff;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.reason-textarea:focus {
  outline: none;
  border-color: #f97316;
}

.reason-textarea::placeholder {
  color: #71717a;
}

.reason-textarea.has-error {
  border-color: #ef4444;
}

.reason-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  display: block;
}
/* Legacy timeline column styles replaced by .atp-track in the .atp-* block below */

/* Atlas overlay + ATP table styles live in the consolidated block below */

/* ============================================================
   ATP — Assignment Table Reinvented
   Hybrid card-row, sticky action column, ribbon, timeline track,
   inline expand panel, skeleton + empty states, responsive.
   Easing: cubic-bezier(0.16, 1, 0.3, 1)
   ============================================================ */
.atp-table {
  background: linear-gradient(135deg, rgba(15,15,18,0.95) 0%, rgba(20,20,25,0.95) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  margin-bottom: 24px;
}

.atp-table__chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(245,158,11,0.04), transparent);
}
.atp-chrome__left { display: flex; align-items: center; gap: 14px; }
.atp-chrome__indicator {
  width: 4px; height: 22px;
  background: linear-gradient(180deg, #f59e0b 0%, #f97316 100%);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(245,158,11,0.55);
  animation: atp-pulse 2.4s ease-in-out infinite;
}
@keyframes atp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.atp-chrome__title {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 15px; font-weight: 600;
  color: #f5f5f7;
  letter-spacing: -0.01em;
}
.atp-chrome__count {
  font: 600 11px/1 ui-monospace, 'JetBrains Mono', monospace;
  color: #fbbf24;
  background: rgba(245,158,11,0.12);
  border: 1px solid rgba(245,158,11,0.22);
  padding: 4px 10px;
  border-radius: 999px;
}

.atp-legend {
  display: grid;
  grid-template-columns: 6px minmax(260px, 1.6fr) minmax(220px, 1.2fr) minmax(180px, 1.1fr) 140px 150px 160px 120px;
  column-gap: 20px;
  padding: 10px 24px 10px 24px;
  background: rgba(255,255,255,0.015);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font: 700 10px/1 'Inter', sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.32);
}
.atp-legend .legend-project { grid-column: 2; }
.atp-legend .legend-meta    { grid-column: 3; }
.atp-legend .legend-timeline{ grid-column: 4; }
.atp-legend .legend-budget  { grid-column: 5; text-align: right; }
.atp-legend .legend-team    { grid-column: 6; }
.atp-legend .legend-owner   { grid-column: 7; }
.atp-legend .legend-action  { grid-column: 8; }

.atp-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.atp-row {
  position: relative;
  display: block;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  cursor: pointer;
  transition: background 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  contain: layout style;
  padding-left: 6px;
}
.atp-row:last-child { border-bottom: none; }
.atp-row::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(249,115,22,0.10) 0%, rgba(245,158,11,0.04) 30%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.atp-row:hover::before { opacity: 1; }
.atp-row--expanded { background: rgba(255,255,255,0.018); }
.atp-row--expanded::before { opacity: 1; }

.atp-row__ribbon {
  position: absolute;
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #f59e0b, #f97316);
  box-shadow: 0 0 6px rgba(245,158,11,0.35);
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s ease,
              top 0.3s ease,
              bottom 0.3s ease;
  pointer-events: none;
}
.atp-row:hover .atp-row__ribbon {
  width: 6px;
  top: 8px;
  bottom: 8px;
  box-shadow: 0 0 14px rgba(249,115,22,0.55);
}
.atp-ribbon--high   { background: linear-gradient(180deg, #d97706, #f97316); box-shadow: 0 0 10px rgba(217,119,6,0.55); }
.atp-ribbon--medium { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
.atp-ribbon--low    { background: linear-gradient(180deg, #facc15, #f97316 70%); }
.atp-ribbon--skeleton { background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)); box-shadow: none; }

.atp-row__grid {
  display: grid;
  grid-template-columns:
    minmax(260px, 1.6fr)
    minmax(220px, 1.2fr)
    minmax(180px, 1.1fr)
    140px
    150px
    160px
    120px;
  column-gap: 20px;
  align-items: center;
  padding: 18px 18px 18px 18px;
  min-width: 0;
}

/* --- 1 Project cell --- */
.atp-cell { min-width: 0; }
.atp-cell--project {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.atp-project__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.atp-project__name {
  font: 600 15px/1.25 'Outfit', system-ui, sans-serif;
  color: #f5f5f7;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  flex: 1;
  min-width: 0;
}
.atp-project__code {
  font: 500 11px/1 ui-monospace, 'JetBrains Mono', monospace;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.04em;
  padding: 3px 7px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
  flex-shrink: 0;
}
.atp-tagrail {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}
.atp-tag {
  font: 700 9px/1 'Inter', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 3px;
  white-space: nowrap;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.atp-tag--cat  { background: rgba(245,158,11,0.10); color: #fde68a;  border: 1px solid rgba(245,158,11,0.22); }
.atp-tag--life { background: rgba(249,115,22,0.07); color: #fbbf24;  border: 1px solid rgba(249,115,22,0.18); }
.atp-tag--prio { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.08); }

/* --- 2 Meta cell --- */
.atp-cell--meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font: 500 12px/1.4 'Inter', sans-serif;
  color: rgba(229,229,231,0.85);
}
.atp-meta__org  { color: #e5e5e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.atp-meta__sep  { color: rgba(255,255,255,0.25); }
.atp-meta__type { color: rgba(255,255,255,0.5); white-space: nowrap; }

/* --- 3 Timeline cell --- */
.atp-cell--timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.atp-track {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.06);
  overflow: visible;
}
.atp-track__bar { position: absolute; inset: 0; border-radius: 2px; }
.atp-track__fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(90deg, #f59e0b, #f97316);
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(245,158,11,0.4);
  width: var(--fill, 0%);
  transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.atp-track__now {
  position: absolute;
  top: 50%;
  left: var(--now, 0%);
  transform: translate(-50%, -50%);
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 0 2px #141417, 0 0 10px rgba(251,191,36,0.6);
  transition: left 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.atp-track__labels {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font: 500 10px/1 'Inter', sans-serif;
  color: rgba(255,255,255,0.45);
}
.atp-track__dur {
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  color: rgba(251,191,36,0.7);
  padding: 0 6px;
}

/* --- 4 Budget cell --- */
.atp-cell--budget {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
  font-family: ui-monospace, 'JetBrains Mono', monospace;
}
.atp-budget__sym { font-size: 11px; color: rgba(255,255,255,0.4); }
.atp-budget__amt { font-size: 15px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.02em; }
.atp-budget__ccy { font-size: 9px; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-left: 2px; }

/* --- 5 Team cell --- */
.atp-cell--team { display: flex; align-items: center; }
.atp-avatars {
  display: flex;
  list-style: none;
  margin: 0; padding: 0;
}
.atp-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font: 600 10px/1 'Inter', sans-serif;
  color: #fff;
  border: 2px solid #141417;
  margin-left: -8px;
  transition: margin-left 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.atp-avatar:first-child { margin-left: 0; }
.atp-avatar--more {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  font-size: 9px;
}
.atp-avatar--declined { opacity: 0.55; filter: grayscale(0.35); }
.atp-row:hover .atp-avatar { margin-left: -2px; }
.atp-row:hover .atp-avatar:first-child { margin-left: 0; }
.atp-avatars__empty {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  font-style: italic;
}

/* --- 6 Owner cell --- */
.atp-cell--owner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.atp-owner__dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font: 600 10px/1 'Inter', sans-serif;
  color: #fff;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}
.atp-owner__name {
  font-size: 12px;
  color: rgba(229,229,231,0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 7 Action cell (sticky right, inset to clear rounded border) --- */
.atp-cell--action {
  position: sticky;
  right: 6px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 2;
  background: linear-gradient(90deg, transparent 0%, rgba(15,15,18,0.95) 24%);
  padding-left: 16px;
  padding-right: 6px;
}
.atp-row:hover .atp-cell--action {
  background: linear-gradient(90deg, transparent 0%, rgba(20,15,12,0.96) 24%);
}
.atp-manage {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 16px;
  border-radius: 10px;
  font: 600 12px/1 'Inter', sans-serif;
  color: #fff;
  background: linear-gradient(135deg, rgba(249,115,22,0.95), rgba(245,158,11,0.95));
  border: 1px solid rgba(251,191,36,0.4);
  box-shadow: 0 4px 14px rgba(249,115,22,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease;
  max-width: 100%;
  transform: none !important;
}
.atp-manage:hover {
  background: linear-gradient(135deg, rgba(249,115,22,1), rgba(245,158,11,1));
  border-color: rgba(251,191,36,0.65);
}
.atp-manage svg { transition: transform 0.25s ease; }
.atp-manage:hover svg { transform: translateX(3px); }

/*
 * Accept/Decline icon buttons keep semantic green/red — they're "yes/no"
 * action affordances on an invite, not status badges. This is the one
 * intentional exception to the orange-only palette in this view.
 */
.atp-action__pair { display: flex; gap: 6px; }
.atp-iconbtn {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}
.atp-iconbtn--accept:hover  { background: rgba(34,197,94,0.15);  border-color: rgba(34,197,94,0.35);  color: #4ade80; }
.atp-iconbtn--decline:hover { background: rgba(220,38,38,0.15);  border-color: rgba(220,38,38,0.35);  color: #f87171; }

/* --- Expand detail panel (GSAP-driven height, no max-height) --- */
.atp-row__detail {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 24px;
  padding: 4px 24px 20px 18px;
  border-top: 1px dashed rgba(245,158,11,0.18);
  margin-top: 4px;
  overflow: hidden;
  will-change: height, opacity;
}
.atp-detail__col { display: flex; flex-direction: column; gap: 4px; }
.atp-detail__label {
  font: 700 9px/1 'Inter', sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(251,191,36,0.65);
}
.atp-detail__value {
  font: 500 13px/1.2 'Inter', sans-serif;
  color: #e5e5e7;
}
.atp-detail__actions { display: flex; align-items: center; justify-content: flex-end; }
.atp-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #fbbf24;
  font: 600 12px/1 'Inter', sans-serif;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.2s ease, transform 0.2s ease;
}
.atp-link:hover {
  background: rgba(251,191,36,0.10);
  transform: translateX(2px);
}

/* --- TransitionGroup classes --- */
.atp-row-enter-active,
.atp-row-leave-active,
.atp-row-move {
  transition: opacity 0.35s ease,
              transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.atp-row-enter-from { opacity: 0; transform: translateY(10px); }
.atp-row-leave-active { position: absolute; left: 0; right: 0; pointer-events: none; }
.atp-row-leave-to { opacity: 0; transform: translateX(14px); }

/* GSAP owns the .atp-row__detail height + col stagger animation in the script */

/* --- Skeleton --- */
.atp-rows--skeleton { padding: 0; margin: 0; list-style: none; }
.atp-row--skeleton { pointer-events: none; }
.sk-bar, .sk-pill, .sk-dot, .sk-btn {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: atp-shimmer 1.6s ease-in-out infinite;
}
@keyframes atp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.sk-bar { height: 12px; margin-top: 4px; }
.sk-bar.sk-thin { height: 8px; opacity: 0.7; }
.sk-bar.w-30  { width: 30%; } .sk-bar.w-40  { width: 40%; }
.sk-bar.w-50  { width: 50%; } .sk-bar.w-60  { width: 60%; }
.sk-bar.w-80  { width: 80%; } .sk-bar.w-100 { width: 100%; }
.sk-dot { width: 26px; height: 26px; border-radius: 50%; margin-left: -6px; }
.sk-dot:first-child { margin-left: 0; }
.sk-btn { width: 96px; height: 34px; border-radius: 10px; }

/* --- Empty state --- */
.atp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 72px 24px;
  color: rgba(255,255,255,0.55);
}
.atp-empty__art {
  width: 120px; height: 120px;
  background: radial-gradient(circle at center, rgba(245,158,11,0.18), transparent 65%);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.atp-empty__title { font: 600 16px/1.2 'Outfit', system-ui; color: #f5f5f7; }
.atp-empty__sub   { font: 500 13px/1.4 'Inter', sans-serif; color: rgba(255,255,255,0.45); }
.atp-empty__cta {
  margin-top: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(249,115,22,0.92), rgba(245,158,11,0.92));
  color: #fff;
  font: 600 12px/1 'Inter', sans-serif;
  border: 1px solid rgba(251,191,36,0.36);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(249,115,22,0.25);
  transition: box-shadow 0.25s ease;
}
.atp-empty__cta:hover { box-shadow: 0 8px 22px rgba(249,115,22,0.4); }

/* --- Responsive --- */
@media (max-width: 1399px) {
  .atp-legend {
    grid-template-columns: 6px minmax(260px, 2fr) minmax(180px, 1.1fr) 140px 130px 120px;
  }
  .atp-legend .legend-meta,
  .atp-legend .legend-owner { display: none; }
  .atp-legend .legend-project { grid-column: 2; }
  .atp-legend .legend-timeline { grid-column: 3; }
  .atp-legend .legend-budget { grid-column: 4; }
  .atp-legend .legend-team { grid-column: 5; }
  .atp-legend .legend-action { grid-column: 6; }
  .atp-row__grid {
    grid-template-columns:
      minmax(260px, 2fr)
      minmax(180px, 1.1fr)
      140px
      130px
      120px;
  }
  .atp-cell--meta,
  .atp-cell--owner { display: none; }
  .atp-cell--project::after {
    content: attr(data-org) " · " attr(data-type);
    font: 500 11px/1.3 'Inter', sans-serif;
    color: rgba(255,255,255,0.5);
    display: block;
    margin-top: 2px;
  }
}

@media (max-width: 1099px) {
  .atp-legend { display: none; }
  .atp-row { grid-template-columns: 6px 1fr; }
  .atp-row__grid {
    grid-template-columns: 1fr !important;
    padding: 16px 18px;
    row-gap: 12px;
  }
  .atp-cell--action {
    position: static;
    background: none;
    justify-content: flex-start;
    padding-left: 0;
  }
  .atp-cell--owner { display: flex; }
  .atp-cell--meta { display: flex; }
  .atp-manage { width: 100%; justify-content: center; }
  .atp-row__detail {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* ============================================================
   CIVIC ATLAS OVERLAY — appended below the legacy styles so they
   take precedence. Adds the sapphire/cyan accent + backdrop + new
   govt chips to surface category/priority/lifecycle on the table row.
   ============================================================ */
.assign-team-page.atlas-skin { position: relative; }
.atlas-backdrop { position: fixed; inset: 52px 0 0 0; pointer-events: none; z-index: -1; overflow: hidden; }
.atlas-base { position: absolute; inset: 0; background: radial-gradient(ellipse at top left, #061018 0%, #04070b 60%, #02030a 100%); }
.atlas-grid { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; }
.atlas-orb { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; }
.a-orb-1 { width: 480px; height: 480px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.16), transparent 70%); }
.a-orb-2 { width: 360px; height: 360px; bottom: -90px; left: -60px; background: radial-gradient(circle, rgba(249, 115, 22, 0.12), transparent 70%); }
.atlas-orb { transform: translate(var(--orb-parallax-x, 0px), var(--orb-parallax-y, 0px)); }

.forge-assignment-hero { position: relative; }
.forge-assignment-hero .header-icon {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(249, 115, 22, 0.10));
  border: 1px solid rgba(245, 158, 11, 0.30);
  color: #fde68a;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.20);
}
.forge-assignment-hero .hero-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: #f97316;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.20);
  margin-bottom: 8px;
}
.forge-assignment-hero .header-text h1 {
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(120deg, #fff 30%, #fde68a 75%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* SidePanelDrawer footer buttons */
.spd-btn-text {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
  padding: 9px 18px;
  border-radius: 10px;
  font: 600 12px/1 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.spd-btn-text:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.18);
}
.spd-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(245, 158, 11, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: #fff;
  padding: 9px 18px;
  border-radius: 10px;
  font: 600 12px/1 'Inter', sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.25);
  transition: box-shadow 0.25s ease;
}
.spd-btn-primary:hover { box-shadow: 0 8px 22px rgba(249, 115, 22, 0.40); }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .assign-team-page { color: var(--text-primary); }
[data-theme="light"] .atlas-base {
  background: radial-gradient(ellipse at top left, #f5f0eb 0%, #faf7f0 60%, #faf7f0 100%);
}
[data-theme="light"] .atlas-grid { opacity: 0.25; }

[data-theme="light"] .header-icon {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .header-text h1 { color: var(--text-primary); }
[data-theme="light"] .forge-assignment-hero .header-text h1 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 50%, #b45309 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
[data-theme="light"] .header-text p { color: var(--text-tertiary); }

[data-theme="light"] .hero-eyebrow {
  color: #c2410c;
  background: rgba(249, 115, 22, 0.10);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .hero-eyebrow .compass-icon { color: #c2410c; }

[data-theme="light"] .search-bar input {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .search-bar input:focus {
  background: rgba(26, 20, 16, 0.08);
  border-color: rgba(26, 20, 16, 0.20);
}
[data-theme="light"] .search-bar input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .search-bar svg { color: var(--text-tertiary); }

[data-theme="light"] .filter-tab {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .filter-tab:hover {
  background: rgba(26, 20, 16, 0.08);
  border-color: rgba(26, 20, 16, 0.15);
  color: var(--text-primary);
}
[data-theme="light"] .filter-tab.active {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(153, 76, 0, 0.22);
  color: #92400e;
}
[data-theme="light"] .filter-tab.declined.active {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.20);
  color: #7f1d1d;
}
[data-theme="light"] .clear-filters-btn {
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .clear-filters-btn:hover {
  background: rgba(26, 20, 16, 0.06);
  color: var(--text-primary);
  border-color: rgba(26, 20, 16, 0.18);
}

[data-theme="light"] .section-title { color: var(--text-secondary); }
[data-theme="light"] .count-badge {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
}
[data-theme="light"] .detail-label { color: var(--text-tertiary); }
[data-theme="light"] .detail-value { color: var(--text-primary); }
[data-theme="light"] .detail-value.mono { color: #92400e; }
[data-theme="light"] .description-text { color: var(--text-secondary); }
[data-theme="light"] .budget-currency { color: var(--text-tertiary); }
[data-theme="light"] .budget-amount { color: #d97706; }
[data-theme="light"] .timeline-item { color: #92400e; }
[data-theme="light"] .timeline-label { color: var(--text-tertiary); }
[data-theme="light"] .timeline-date { color: var(--text-primary); }
[data-theme="light"] .timeline-arrow { color: var(--text-placeholder); }
[data-theme="light"] .member-name { color: var(--text-primary); }
[data-theme="light"] .member-role { color: var(--text-tertiary); }

[data-theme="light"] .reason-label { color: var(--text-secondary); }
[data-theme="light"] .reason-label .required { color: #dc2626; }
[data-theme="light"] .reason-textarea {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
[data-theme="light"] .reason-textarea:focus {
  border-color: #d97706;
  background: rgba(217, 119, 6, 0.04);
}
[data-theme="light"] .reason-textarea::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .reason-textarea.has-error { border-color: #dc2626; }
[data-theme="light"] .reason-error { color: #dc2626; }

[data-theme="light"] .section-label { color: var(--text-secondary); }
[data-theme="light"] .section-label .count { color: var(--text-tertiary); }
[data-theme="light"] .section-divider { background: rgba(26, 20, 16, 0.06); }
[data-theme="light"] .users-list { color: var(--text-primary); }
[data-theme="light"] .user-item {
  background: rgba(26, 20, 16, 0.02);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .user-item:hover {
  background: rgba(26, 20, 16, 0.06);
  border-color: rgba(26, 20, 16, 0.12);
}
[data-theme="light"] .user-item.selected {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(153, 76, 0, 0.22);
}
[data-theme="light"] .user-avatar { color: #fff; }
[data-theme="light"] .user-name { color: var(--text-primary); }
[data-theme="light"] .user-email { color: var(--text-tertiary); }
[data-theme="light"] .user-check {
  background: rgba(26, 20, 16, 0.06);
  color: var(--text-tertiary);
}
[data-theme="light"] .user-item.selected .user-check {
  background: #d97706;
  color: #fff;
}

[data-theme="light"] .team-search input {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
[data-theme="light"] .team-search input:focus {
  border-color: #d97706;
  background: rgba(217, 119, 6, 0.04);
}
[data-theme="light"] .team-search input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .team-search svg { color: var(--text-tertiary); }

[data-theme="light"] .remove-btn {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}
[data-theme="light"] .remove-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.25);
  color: #dc2626;
}
[data-theme="light"] .override-btn {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(153, 76, 0, 0.15);
  color: #b45309;
}
[data-theme="light"] .override-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: #d97706;
}
[data-theme="light"] .user-role {
  background: rgba(26, 20, 16, 0.06);
  color: var(--text-secondary);
}
[data-theme="light"] .user-role.accepted {
  background: rgba(217, 119, 6, 0.08);
  color: #92400e;
}

[data-theme="light"] .assigned-header { color: var(--text-secondary); }
[data-theme="light"] .member-count {
  color: var(--text-tertiary);
  background: rgba(26, 20, 16, 0.05);
}
[data-theme="light"] .assigned-item {
  background: rgba(26, 20, 16, 0.03);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .assigned-item:hover {
  background: rgba(26, 20, 16, 0.08);
  border-color: rgba(26, 20, 16, 0.12);
}
[data-theme="light"] .assigned-item.is-owner {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(250, 247, 240, 0) 100%);
  border-color: rgba(153, 76, 0, 0.12);
}
[data-theme="light"] .assigned-avatar { color: #fff; }
[data-theme="light"] .assigned-name { color: var(--text-primary); }
[data-theme="light"] .owner-badge {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(153, 76, 0, 0.18);
}
[data-theme="light"] .assigned-status { color: var(--text-tertiary); }
[data-theme="light"] .assigned-status.accepted { color: #92400e; }

[data-theme="light"] .btn-primary { background: #d97706; color: #fff; }
[data-theme="light"] .btn-primary:hover:not(:disabled) { background: #b45309; }
[data-theme="light"] .btn-primary:disabled {
  background: rgba(26, 20, 16, 0.10);
  color: rgba(26, 20, 16, 0.30);
}
[data-theme="light"] .btn-secondary {
  background: rgba(26, 20, 16, 0.06);
  color: var(--text-primary);
  border-color: rgba(26, 20, 16, 0.12);
}
[data-theme="light"] .btn-secondary:hover { background: rgba(26, 20, 16, 0.12); }
[data-theme="light"] .btn-text { color: var(--text-secondary); }
[data-theme="light"] .btn-text:hover { color: var(--text-primary); }
[data-theme="light"] .btn-danger { background: #dc2626; color: #fff; }
[data-theme="light"] .btn-danger:hover:not(:disabled) { background: #b91c1c; }

[data-theme="light"] .remove-dialog,
[data-theme="light"] .confirm-dialog {
  background: linear-gradient(180deg, #faf7f0 0%, #f5f0eb 100%);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .remove-dialog-header,
[data-theme="light"] .confirm-dialog-title { border-bottom-color: rgba(26, 20, 16, 0.06); }
[data-theme="light"] .remove-dialog-header h3,
[data-theme="light"] .confirm-dialog-title { color: var(--text-primary); }
[data-theme="light"] .remove-dialog-header p,
[data-theme="light"] .confirm-dialog-desc { color: var(--text-tertiary); }
[data-theme="light"] .confirm-dialog-desc strong { color: var(--text-primary); }
[data-theme="light"] .remove-dialog-body label,
[data-theme="light"] .confirm-dialog-input label { color: var(--text-secondary); }
[data-theme="light"] .confirm-dialog-input .required { color: #dc2626; }
[data-theme="light"] .remove-dialog-body textarea,
[data-theme="light"] .confirm-dialog-input textarea {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
[data-theme="light"] .remove-dialog-body textarea::placeholder,
[data-theme="light"] .confirm-dialog-input textarea::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .remove-dialog-footer { border-top-color: rgba(26, 20, 16, 0.06); background: rgba(26, 20, 16, 0.02); }
[data-theme="light"] .btn-cancel {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.12);
  color: var(--text-secondary);
}
[data-theme="light"] .btn-cancel:hover {
  background: rgba(26, 20, 16, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .input-error { color: #dc2626; }

/* The big assignment table */
[data-theme="light"] .atp-table {
  background: linear-gradient(135deg, rgba(250, 247, 240, 0.95), rgba(245, 240, 235, 0.95));
  border-color: var(--card-border);
}
[data-theme="light"] .atp-table__chrome {
  border-bottom-color: rgba(26, 20, 16, 0.06);
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.04), transparent);
}
[data-theme="light"] .atp-chrome__indicator {
  background: linear-gradient(180deg, #d97706, #c2410c);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .atp-chrome__title { color: var(--text-primary); }
[data-theme="light"] .atp-chrome__count {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(153, 76, 0, 0.18);
}
[data-theme="light"] .atp-legend {
  background: rgba(26, 20, 16, 0.02);
  border-bottom-color: rgba(26, 20, 16, 0.06);
  color: var(--text-tertiary);
}
[data-theme="light"] .atp-row { border-bottom-color: rgba(26, 20, 16, 0.04); }
[data-theme="light"] .atp-row::before {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.08) 0%, rgba(217, 119, 6, 0.03) 30%, transparent 70%);
}
[data-theme="light"] .atp-row--expanded { background: rgba(26, 20, 16, 0.03); }
[data-theme="light"] .atp-project__name { color: var(--text-primary); }
[data-theme="light"] .atp-project__code {
  color: var(--text-tertiary);
  background: rgba(26, 20, 16, 0.04);
}
[data-theme="light"] .atp-tag--cat {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border-color: rgba(153, 76, 0, 0.18);
}
[data-theme="light"] .atp-tag--life {
  background: rgba(249, 115, 22, 0.08);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.15);
}
[data-theme="light"] .atp-tag--prio {
  background: rgba(26, 20, 16, 0.05);
  color: var(--text-secondary);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .atp-meta__org { color: var(--text-primary); }
[data-theme="light"] .atp-meta__sep { color: var(--text-placeholder); }
[data-theme="light"] .atp-meta__type { color: var(--text-tertiary); }
[data-theme="light"] .atp-track { background: rgba(26, 20, 16, 0.08); }
[data-theme="light"] .atp-track__fill {
  background: linear-gradient(90deg, #d97706, #c2410c);
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .atp-track__now {
  background: #b45309;
  box-shadow: 0 0 0 2px #faf7f0, 0 0 10px rgba(180, 83, 9, 0.5);
}
[data-theme="light"] .atp-track__labels { color: var(--text-tertiary); }
[data-theme="light"] .atp-track__dur { color: #92400e; }
[data-theme="light"] .atp-budget__sym { color: var(--text-tertiary); }
[data-theme="light"] .atp-budget__amt { color: var(--text-primary); }
[data-theme="light"] .atp-budget__ccy { color: var(--text-placeholder); }
[data-theme="light"] .atp-avatar { border-color: #faf7f0; }
[data-theme="light"] .atp-avatar--more {
  background: rgba(26, 20, 16, 0.08);
  color: var(--text-secondary);
}
[data-theme="light"] .atp-avatars__empty { color: var(--text-placeholder); }
[data-theme="light"] .atp-owner__name { color: var(--text-secondary); }
[data-theme="light"] .atp-cell--action {
  background: linear-gradient(90deg, transparent 0%, rgba(250, 247, 240, 0.95) 24%);
}
[data-theme="light"] .atp-row:hover .atp-cell--action {
  background: linear-gradient(90deg, transparent 0%, rgba(245, 240, 235, 0.96) 24%);
}
[data-theme="light"] .atp-manage {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.90), rgba(180, 83, 9, 0.90));
  border-color: rgba(153, 76, 0, 0.30);
  color: #fff;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .atp-manage:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: rgba(153, 76, 0, 0.50);
}
[data-theme="light"] .atp-iconbtn {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .atp-iconbtn--accept:hover {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.25);
  color: #15803d;
}
[data-theme="light"] .atp-iconbtn--decline:hover {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.25);
  color: #b91c1c;
}
[data-theme="light"] .atp-row__detail { border-top-color: rgba(217, 119, 6, 0.12); }
[data-theme="light"] .atp-detail__label { color: #92400e; }
[data-theme="light"] .atp-detail__value { color: var(--text-primary); }
[data-theme="light"] .atp-link { color: #92400e; }
[data-theme="light"] .atp-link:hover { background: rgba(217, 119, 6, 0.08); }

[data-theme="light"] .sk-bar,
[data-theme="light"] .sk-pill,
[data-theme="light"] .sk-dot,
[data-theme="light"] .sk-btn {
  background: linear-gradient(90deg, rgba(26, 20, 16, 0.04) 0%, rgba(26, 20, 16, 0.08) 50%, rgba(26, 20, 16, 0.04) 100%);
}

[data-theme="light"] .atp-empty { color: var(--text-tertiary); }
[data-theme="light"] .atp-empty__art { background: radial-gradient(circle at center, rgba(217, 119, 6, 0.12), transparent 65%); }
[data-theme="light"] .atp-empty__title { color: var(--text-primary); }
[data-theme="light"] .atp-empty__sub { color: var(--text-tertiary); }

[data-theme="light"] .spd-btn-text {
  background: transparent;
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .spd-btn-text:hover {
  background: rgba(26, 20, 16, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .spd-btn-primary {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.90), rgba(180, 83, 9, 0.90));
  border-color: rgba(153, 76, 0, 0.30);
  color: #fff;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.18);
}

/* ════════════════════════════════════════════════════════════════════
   TMP — Team Management Panel (redesigned, scroll-free, motion-v)
   ════════════════════════════════════════════════════════════════════ */
.tmp {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Insights strip ─────────────────────────────────────────────── */
.tmp-insights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.tmp-insight {
  position: relative;
  padding: 14px 14px 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition: border-color 0.25s ease;
  cursor: default;
}
.tmp-insight::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 0% 0%, rgba(249, 115, 22, 0.10), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.tmp-insight:hover { border-color: rgba(249, 115, 22, 0.20); }
.tmp-insight:hover::after { opacity: 1; }

.tmp-insight__num {
  font-size: 22px;
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 6px;
  font-variant-numeric: tabular-nums;
}
.tmp-insight__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.45);
}
.tmp-insight__label svg { color: rgba(255, 255, 255, 0.4); }

/* Selected insight — orange when active */
.tmp-insight--selected.is-active {
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.14), rgba(249, 115, 22, 0.04));
  border-color: rgba(249, 115, 22, 0.35);
  box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.05), 0 8px 24px -10px rgba(249, 115, 22, 0.4);
}
.tmp-insight--selected.is-active .tmp-insight__num { color: #fbbf24; }
.tmp-insight--selected.is-active .tmp-insight__label,
.tmp-insight--selected.is-active .tmp-insight__label svg { color: #fbbf24; }

/* ── Search ─────────────────────────────────────────────────────── */
.tmp-search {
  position: relative;
  display: flex;
  align-items: center;
}
.tmp-search__icon {
  position: absolute;
  left: 14px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}
.tmp-search__input {
  width: 100%;
  height: 44px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0 40px 0 40px;
  color: #fff;
  font-size: 13.5px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.tmp-search__input::placeholder { color: rgba(255, 255, 255, 0.32); }
.tmp-search__input:focus {
  outline: none;
  border-color: rgba(249, 115, 22, 0.55);
  background: rgba(0, 0, 0, 0.35);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
}
.tmp-search__clear {
  position: absolute;
  right: 10px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.18s ease;
}
.tmp-search__clear:hover {
  background: rgba(249, 115, 22, 0.15);
  border-color: rgba(249, 115, 22, 0.30);
  color: #fbbf24;
}

/* ── Sections ───────────────────────────────────────────────────── */
.tmp-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tmp-section__head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tmp-section__bar {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #f97316, #c2410c);
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.45);
}
.tmp-section__bar--gold {
  background: linear-gradient(180deg, #fbbf24, #d97706);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}
.tmp-section__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}
.tmp-section__pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.22);
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
}

/* ── Roster grid (Available people) ────────────────────────────── */
.tmp-roster {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.tmp-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  text-align: left;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.25s ease;
  will-change: transform;
}
.tmp-card__glow {
  position: absolute;
  inset: -40%;
  background: radial-gradient(40% 40% at 30% 0%, rgba(249, 115, 22, 0.22), transparent 70%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}
.tmp-card:hover {
  border-color: rgba(249, 115, 22, 0.30);
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.05), rgba(255, 255, 255, 0.015));
}
.tmp-card:hover .tmp-card__glow { opacity: 1; }

.tmp-card--on {
  border-color: rgba(249, 115, 22, 0.55);
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.14), rgba(249, 115, 22, 0.04));
  box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.10), 0 14px 32px -14px rgba(249, 115, 22, 0.45);
}
.tmp-card--on .tmp-card__glow { opacity: 1; }

.tmp-card__avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.25);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.tmp-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}
.tmp-card__name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tmp-card__email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.48);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tmp-card__mark {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: all 0.22s ease;
}
.tmp-card--on .tmp-card__mark {
  background: linear-gradient(135deg, #f97316, #c2410c);
  border-color: rgba(249, 115, 22, 0.65);
  color: #fff;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
}

/* ── Empty state (Available) ───────────────────────────────────── */
.tmp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.10);
  text-align: center;
}
.tmp-empty__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.18);
  color: #fbbf24;
}
.tmp-empty__text {
  margin: 0;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.55);
  max-width: 280px;
  line-height: 1.45;
}

/* ── On the team list ──────────────────────────────────────────── */
.tmp-team {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tmp-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.22s ease, background 0.22s ease;
  will-change: transform;
}
.tmp-member:hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.10);
}
.tmp-member.is-owner {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(249, 115, 22, 0.02));
  border-color: rgba(251, 191, 36, 0.22);
  box-shadow: inset 2px 0 0 rgba(251, 191, 36, 0.6);
}
.tmp-member.is-declined {
  background: rgba(220, 38, 38, 0.04);
  border-color: rgba(220, 38, 38, 0.15);
}

.tmp-member__avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
}

.tmp-member__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tmp-member__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tmp-member__name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tmp-member__crown {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid rgba(251, 191, 36, 0.25);
}
.tmp-member__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: capitalize;
  color: rgba(255, 255, 255, 0.50);
  font-weight: 500;
}
.tmp-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 6px currentColor;
}
.tmp-status-dot.accepted { background: #34d399; }
.tmp-status-dot.pending  { background: #fbbf24; animation: tmp-pulse 1.8s ease-in-out infinite; }
.tmp-status-dot.declined { background: #ef4444; }

.tmp-member__status.accepted { color: #34d399; }
.tmp-member__status.pending  { color: #fbbf24; }
.tmp-member__status.declined { color: #ef4444; }

@keyframes tmp-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.4); opacity: 0.55; }
}

.tmp-member__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.tmp-iconbtn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
  will-change: transform;
}
.tmp-iconbtn:disabled { opacity: 0.6; cursor: not-allowed; }

.tmp-iconbtn--override {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.22);
  color: #fbbf24;
}
.tmp-iconbtn--override:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.20);
  border-color: rgba(245, 158, 11, 0.45);
  color: #fde68a;
}
.tmp-iconbtn--remove {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.22);
  color: #f87171;
}
.tmp-iconbtn--remove:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.20);
  border-color: rgba(239, 68, 68, 0.45);
  color: #fca5a5;
}

/* ──────────────────────────────────────────────────────────────────
   TMP — Light theme overrides
   ──────────────────────────────────────────────────────────────── */
[data-theme="light"] .tmp-insight {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.95), rgba(250, 245, 235, 0.85));
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .tmp-insight::after {
  background: radial-gradient(120% 80% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 60%);
}
[data-theme="light"] .tmp-insight:hover { border-color: rgba(217, 119, 6, 0.30); }
[data-theme="light"] .tmp-insight__num { color: var(--text-primary); }
[data-theme="light"] .tmp-insight__label { color: var(--text-tertiary); }
[data-theme="light"] .tmp-insight__label svg { color: var(--text-tertiary); }
[data-theme="light"] .tmp-insight--selected.is-active {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.04));
  border-color: rgba(153, 76, 0, 0.32);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.05), 0 8px 24px -10px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .tmp-insight--selected.is-active .tmp-insight__num,
[data-theme="light"] .tmp-insight--selected.is-active .tmp-insight__label,
[data-theme="light"] .tmp-insight--selected.is-active .tmp-insight__label svg { color: #92400e; }

[data-theme="light"] .tmp-search__input {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(26, 20, 16, 0.12);
  color: var(--text-primary);
}
[data-theme="light"] .tmp-search__input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .tmp-search__input:focus {
  border-color: rgba(217, 119, 6, 0.55);
  background: rgba(255, 246, 226, 0.95);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .tmp-search__icon { color: rgba(146, 64, 14, 0.65); }
[data-theme="light"] .tmp-search__clear {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .tmp-search__clear:hover {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #92400e;
}

[data-theme="light"] .tmp-section__title { color: var(--text-primary); }
[data-theme="light"] .tmp-section__pill {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(153, 76, 0, 0.20);
  color: #92400e;
}
[data-theme="light"] .tmp-section__bar {
  background: linear-gradient(180deg, #d97706, #c2410c);
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .tmp-section__bar--gold {
  background: linear-gradient(180deg, #f59e0b, #b45309);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.40);
}

[data-theme="light"] .tmp-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.90), rgba(250, 245, 235, 0.75));
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .tmp-card:hover {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.06), rgba(255, 250, 240, 0.80));
  border-color: rgba(153, 76, 0, 0.28);
}
[data-theme="light"] .tmp-card--on {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.04));
  border-color: rgba(153, 76, 0, 0.45);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.08), 0 14px 32px -14px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .tmp-card__glow {
  background: radial-gradient(40% 40% at 30% 0%, rgba(217, 119, 6, 0.22), transparent 70%);
}
[data-theme="light"] .tmp-card__avatar { color: #fff; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.30); }
[data-theme="light"] .tmp-card__name { color: var(--text-primary); }
[data-theme="light"] .tmp-card__email { color: var(--text-tertiary); }
[data-theme="light"] .tmp-card__mark {
  background: rgba(26, 20, 16, 0.06);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-tertiary);
}
[data-theme="light"] .tmp-card--on .tmp-card__mark {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: rgba(153, 76, 0, 0.55);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
}

[data-theme="light"] .tmp-empty {
  background: rgba(26, 20, 16, 0.02);
  border-color: rgba(26, 20, 16, 0.14);
}
[data-theme="light"] .tmp-empty__icon {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.22);
  color: #92400e;
}
[data-theme="light"] .tmp-empty__text { color: var(--text-tertiary); }

[data-theme="light"] .tmp-member {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .tmp-member:hover {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(26, 20, 16, 0.14);
}
[data-theme="light"] .tmp-member.is-owner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(217, 119, 6, 0.02));
  border-color: rgba(153, 76, 0, 0.25);
  box-shadow: inset 2px 0 0 rgba(180, 83, 9, 0.7);
}
[data-theme="light"] .tmp-member.is-declined {
  background: rgba(220, 38, 38, 0.04);
  border-color: rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .tmp-member__avatar { color: #fff; box-shadow: 0 4px 10px rgba(40, 25, 10, 0.18); }
[data-theme="light"] .tmp-member__name { color: var(--text-primary); }
[data-theme="light"] .tmp-member__crown {
  color: #92400e;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(153, 76, 0, 0.28);
}
[data-theme="light"] .tmp-member__status { color: var(--text-tertiary); }
[data-theme="light"] .tmp-member__status.accepted { color: #047857; }
[data-theme="light"] .tmp-member__status.pending  { color: #b45309; }
[data-theme="light"] .tmp-member__status.declined { color: #b91c1c; }

[data-theme="light"] .tmp-iconbtn {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .tmp-iconbtn--override {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.22);
  color: #b45309;
}
[data-theme="light"] .tmp-iconbtn--override:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.20);
  border-color: rgba(245, 158, 11, 0.45);
  color: #92400e;
}
[data-theme="light"] .tmp-iconbtn--remove {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.20);
  color: #b91c1c;
}
[data-theme="light"] .tmp-iconbtn--remove:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.18);
  border-color: rgba(220, 38, 38, 0.42);
  color: #7f1d1d;
}

/* ── Small-width drawers: keep cards single-column ───────────── */
@media (max-width: 520px) {
  .tmp-roster { grid-template-columns: 1fr; }
  .tmp-insights { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .tmp-insight__num { font-size: 18px; }
}
</style>
