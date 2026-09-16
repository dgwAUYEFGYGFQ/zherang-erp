/**
 * prototype-components.js
 * Vue 框架组件：PrototypeSidebar / PrototypeLayout / PrototypeMissingRoute。
 * 加载顺序：第 5 个，依赖 prototype-core.js / prototype-menu.js / prototype-route.js。
 */
(function (window) {
  const P = window._ChintProto;
  const {
    registry,
    normalizeHash,
    normalizeMenuSwitcherConfig,
    resolveDefaultTemplateView,
    resolveTemplateViewByMenu,
    resolveTemplateViewEntry,
    filterMenusByTemplateView,
    flattenMenuItems,
    isItemVisibleForTemplateView,
    cloneMenus,
    defaultMenus
  } = P;

  // ─── PrototypeSidebar ─────────────────────────────────────────────────────────

  const PrototypeSidebar = {
    name: 'PrototypeSidebar',
    props: {
      activeMenu: { type: String, default: '' },
      activeRoute: { type: String, default: '' },
      menus: { type: Array, default: null },
      menuSwitcher: { type: Object, default: null }
    },
    data() {
      const menuSwitcherConfig = normalizeMenuSwitcherConfig(this.menuSwitcher);
      return {
        menuSwitcherConfig,
        templateViewOptions: menuSwitcherConfig.options,
        selectedTemplateView: resolveDefaultTemplateView(this.activeMenu, this.menus || registry.menus || defaultMenus, menuSwitcherConfig),
        collapsedGroups: {}
      };
    },
    watch: {
      menuSwitcher: {
        deep: true,
        handler(value) {
          const nextConfig = normalizeMenuSwitcherConfig(value);
          this.menuSwitcherConfig = nextConfig;
          this.templateViewOptions = nextConfig.options;
          this.selectedTemplateView = resolveDefaultTemplateView(this.activeMenu, this.menus || registry.menus || defaultMenus, nextConfig);
        }
      },
      activeMenu: {
        immediate: true,
        handler(value) {
          if (!this.menuSwitcherConfig.enabled) {
            return;
          }
          const menuItems = flattenMenuItems(this.menus || registry.menus || defaultMenus);
          const activeItem = menuItems.find((item) => item.key === value);
          if (activeItem && !isItemVisibleForTemplateView(activeItem, this.selectedTemplateView, this.menuSwitcherConfig)) {
            const nextTemplateView = resolveTemplateViewByMenu(value, this.menus || registry.menus || defaultMenus, this.menuSwitcherConfig);
            if (nextTemplateView && this.selectedTemplateView !== nextTemplateView) {
              this.selectedTemplateView = nextTemplateView;
            }
            try {
              window.localStorage?.setItem(this.menuSwitcherConfig.storageKey, this.selectedTemplateView);
            } catch (error) {
              /* ignore storage errors in prototype mode */
            }
          }
        }
      }
    },
    computed: {
      selectedTemplateViewMeta() {
        return this.templateViewOptions.find((item) => item.value === this.selectedTemplateView) || this.templateViewOptions[0] || { icon: 'ri-apps-2-line', label: '' };
      },
      normalizedMenus() {
        const sourceMenus = filterMenusByTemplateView(this.menus || registry.menus || defaultMenus, this.selectedTemplateView, this.menuSwitcherConfig);
        return cloneMenus(sourceMenus, this.menuSwitcherConfig);
      },
      showMenuSwitcher() {
        return this.menuSwitcherConfig.enabled && this.templateViewOptions.length > 0;
      }
    },
    methods: {
      isGroupCollapsed(group) {
        return group.title ? Boolean(this.collapsedGroups[group.title]) : false;
      },
      toggleGroup(group) {
        if (!group.title) return;
        this.collapsedGroups = {
          ...this.collapsedGroups,
          [group.title]: !this.isGroupCollapsed(group)
        };
      },
      handleTemplateViewChange(value) {
        if (!this.menuSwitcherConfig.enabled) {
          return;
        }
        try {
          window.localStorage?.setItem(this.menuSwitcherConfig.storageKey, value);
        } catch (error) {
          /* ignore storage errors in prototype mode */
        }
        const targetMenus = filterMenusByTemplateView(this.menus || registry.menus || defaultMenus, value, this.menuSwitcherConfig);
        const visibleItems = flattenMenuItems(targetMenus);
        const activeVisible = visibleItems.some((item) => item.key === this.activeMenu);
        if (!activeVisible) {
          window.location.href = resolveTemplateViewEntry(value, this.menus || registry.menus || defaultMenus, this.menuSwitcherConfig);
        }
      },
      isActive(item) {
        return this.activeMenu === item.key || (item.route && this.activeRoute === normalizeHash(item.route));
      }
    },
    template: `
      <nav class="sidebar" data-tour="side-menu">
        <div v-if="showMenuSwitcher" class="sidebar-subsystem-switch">
          <div class="sidebar-subsystem-select-wrap">
            <span class="sidebar-subsystem-current-icon"><i :class="selectedTemplateViewMeta.icon"></i></span>
            <el-select v-model="selectedTemplateView" class="sidebar-subsystem-select" :placeholder="menuSwitcherConfig.placeholder" size="small" :teleported="false" data-tour="subsystem-switch" @change="handleTemplateViewChange">
              <el-option v-for="item in templateViewOptions" :key="item.value" :label="item.label" :value="item.value">
                <span class="subsystem-option"><span class="subsystem-option-icon"><i :class="item.icon"></i></span><span>{{ item.label }}</span></span>
              </el-option>
            </el-select>
          </div>
        </div>
        <div class="sidebar-nav">
          <template v-for="group in normalizedMenus" :key="group.title || 'root'">
            <button
              v-if="group.title"
              type="button"
              class="nav-group-title nav-group-toggle"
              :class="{ 'is-collapsed': isGroupCollapsed(group) }"
              :aria-expanded="!isGroupCollapsed(group)"
              @click="toggleGroup(group)">
              <span>{{ group.title }}</span>
              <i class="ri-arrow-down-s-line"></i>
            </button>
            <div class="nav-group-items" v-show="!isGroupCollapsed(group)">
              <a v-for="item in group.items" :key="item.key" class="nav-item" :class="{ 'is-active': isActive(item) }" :href="item.href">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
                <el-tag v-if="item.badge" class="nav-badge" size="small" type="danger">{{ item.badge }}</el-tag>
              </a>
            </div>
          </template>
        </div>
      </nav>
    `
  };

  // ─── PrototypeLayout ──────────────────────────────────────────────────────────

  const PrototypeLayout = {
    name: 'PrototypeLayout',
    components: { PrototypeSidebar },
    props: {
      activeMenu: { type: String, default: '' },
      activeRoute: { type: String, default: '' },
      breadcrumbs: { type: Array, default: () => [] },
      openTabs: { type: Array, default: () => [] },
      activeTab: { type: String, default: '' },
      brandName: { type: String, default: '通用管理平台' },
      brandIcon: { type: String, default: 'ri-cube-2-line' },
      brandHref: { type: String, default: P.HOME_ROUTE_PATH || '#/templates/overview-dashboard-home-page' },
      keyword: { type: String, default: '' },
      searchPlaceholder: { type: String, default: '搜索功能、菜单、记录' },
      tenantTitle: { type: String, default: '切换租户' },
      tenantValue: { type: String, default: '' },
      tenantOptions: { type: Array, default: () => [] },
      tenantDataTour: { type: String, default: 'tenant-switcher' },
      menuSwitcher: { type: Object, default: null },
      userName: { type: String, default: '管理员' },
      userRole: { type: String, default: '原型评审人' },
      avatarText: { type: String, default: '' },
      menus: { type: Array, default: null }
    },
    emits: ['update:keyword', 'update:tenantValue', 'search', 'notify', 'help', 'guide', 'user-command', 'tenant-change', 'tab-activate', 'tab-close'],
    data() {
      return {
        fullscreen: false,
        currentTheme: P.getTheme ? P.getTheme() : 'blue'
      };
    },
    computed: {
      searchValue: {
        get() {
          return this.keyword;
        },
        set(value) {
          this.$emit('update:keyword', value);
        }
      },
      resolvedBrandHref() {
        return normalizeHash(this.brandHref);
      },
      normalizedBreadcrumbs() {
        return Array.isArray(this.breadcrumbs) && this.breadcrumbs.length ? this.breadcrumbs : ['未命名页面'];
      },
      hasTenantSwitcher() {
        return Array.isArray(this.tenantOptions) && this.tenantOptions.length > 0;
      },
      selectedTenantOption() {
        if (!this.hasTenantSwitcher) {
          return null;
        }
        return this.tenantOptions.find((item) => item.value === this.tenantValue) || this.tenantOptions[0] || null;
      },
      displayAvatarText() {
        return this.avatarText || this.userName.slice(0, 1);
      },
      themeOptions() {
        return P.THEME_OPTIONS || [
          { value: 'blue',  label: '蓝色主题', icon: 'ri-contrast-2-line' },
          { value: 'light', label: '浅色主题', icon: 'ri-sun-line' },
          { value: 'dark',  label: '深色主题', icon: 'ri-moon-line' }
        ];
      }
    },
    methods: {
      hasListener(name) {
        const props = this.$.vnode.props || {};
        return Boolean(props[name]);
      },
      handleSearch() {
        this.$emit('search', this.searchValue);
        if (!this.hasListener('onSearch')) {
          ElementPlus.ElMessage.success('搜索：' + (this.searchValue || '空关键词'));
        }
      },
      handleNotify() {
        this.$emit('notify');
        if (!this.hasListener('onNotify')) {
          ElementPlus.ElMessage.info('暂无新的消息面板');
        }
      },
      handleHelp() {
        this.$emit('help');
        if (!this.hasListener('onHelp')) {
          ElementPlus.ElMessage.info('当前路由未配置原型说明');
        }
      },
      handleGuide() {
        this.$emit('guide');
      },
      handleTenantChange(command) {
        const option = this.tenantOptions.find((item) => item.value === command) || null;
        this.$emit('update:tenantValue', command);
        this.$emit('tenant-change', option);
      },
      toggleFullscreen() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
          this.fullscreen = true;
        } else {
          document.exitFullscreen?.();
          this.fullscreen = false;
        }
      },
      handleUserCommand(command) {
        // 主题切换命令由 PrototypeLayout 自身处理，不向上冒泡
        if (command && typeof command === 'string' && command.startsWith('theme:')) {
          var theme = command.slice(6);
          if (P.applyTheme) P.applyTheme(theme);
          this.currentTheme = theme;
          return;
        }
        this.$emit('user-command', command);
        if (!this.hasListener('onUserCommand')) {
          ElementPlus.ElMessage.info('用户菜单操作：' + command);
        }
      },
      hasTabTooltip(tab) {
        return Boolean(tab && tab.tabInfo && tab.tabInfo.caption);
      },
      handleTabActivate(path) {
        this.$emit('tab-activate', path);
      },
      handleTabClose(path) {
        this.$emit('tab-close', path);
      },
      handleTabsMoreCommand(path) {
        this.$emit('tab-activate', path);
      }
    },
    template: `
      <header class="topbar">
        <a class="topbar-brand" :href="resolvedBrandHref" data-tour="brand">
          <span class="topbar-brand-mark">
            <i :class="brandIcon"></i>
          </span>
          <span class="topbar-brand-text">{{ brandName }}</span>
        </a>
        <div class="topbar-center">
          <div class="topbar-center-spacer"></div>
          <div class="topbar-search-wrap">
            <el-input v-model="searchValue" class="topbar-search-input" :placeholder="searchPlaceholder" clearable data-tour="global-search" @keyup.enter="handleSearch">
              <template v-slot:prefix><i class="ri-search-line"></i></template>
            </el-input>
          </div>
          <div class="topbar-center-extra">
            <slot name="topbar-extra"></slot>
          </div>
        </div>
        <div class="topbar-actions" data-tour="topbar-actions">
          <el-dropdown v-if="hasTenantSwitcher" trigger="click" @command="handleTenantChange">
            <button class="topbar-tenant-trigger" type="button" :title="tenantTitle" :data-tour="tenantDataTour">
              <i class="ri-building-4-line"></i>
              <span>{{ selectedTenantOption ? selectedTenantOption.label : tenantTitle }}</span>
              <i class="ri-arrow-down-s-line"></i>
            </button>
            <template v-slot:dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="item in tenantOptions"
                  :key="item.value"
                  :command="item.value"
                  :disabled="item.value === tenantValue">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <div v-if="hasTenantSwitcher" class="topbar-divider"></div>
          <button class="proto-note-topbar-btn" title="原型说明" @click="handleHelp">
              <i class="ri-sticky-note-line"></i>
          </button>
          <button class="topbar-icon-btn" title="操作引导" @click="handleGuide"><i class="ri-guide-line"></i></button>
            <div class="topbar-divider"></div>
            <button class="topbar-icon-btn notif-btn" title="消息通知" @click="handleNotify"><i class="ri-notification-3-line"></i></button>
          <button class="topbar-icon-btn" title="全屏" @click="toggleFullscreen"><i :class="fullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i></button>
          <div class="topbar-divider"></div>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-trigger">
              <el-avatar :size="28" type="primary">{{ displayAvatarText }}</el-avatar>
              <div>
                <div class="uname">{{ userName }}</div>
                <div class="urole">{{ userRole }}</div>
              </div>
              <i class="ri-arrow-down-s-line"></i>
            </div>
            <template v-slot:dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="switchRole">切换角色</el-dropdown-item>
                <el-dropdown-item disabled class="proto-theme-menu-label" divided>外观主题</el-dropdown-item>
                <el-dropdown-item v-for="t in themeOptions" :key="t.value" :command="'theme:' + t.value">
                  <span class="proto-theme-item" :class="{ 'is-active': currentTheme === t.value }">
                    <i :class="t.icon"></i>
                    <span>{{ t.label }}</span>
                    <i v-if="currentTheme === t.value" class="ri-check-line proto-theme-check"></i>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <div class="workspace">
        <prototype-sidebar :active-menu="activeMenu" :active-route="activeRoute" :menus="menus" :menu-switcher="menuSwitcher"></prototype-sidebar>
        <div class="content-wrap">
          <div v-if="openTabs.length" class="opened-page-tabs-bar" data-tour="opened-page-tabs">
            <div class="opened-page-tabs-scroll">
              <el-tooltip
                v-for="tab in openTabs"
                :key="tab.path"
                effect="light"
                placement="bottom-start"
                :disabled="!hasTabTooltip(tab)">
                <template v-slot:content>
                  <div class="opened-page-tooltip">
                    <div class="opened-page-tooltip-head">{{ tab.title }}</div>
                    <div v-if="tab.tabInfo && tab.tabInfo.caption" class="opened-page-tooltip-caption">{{ tab.tabInfo.caption }}</div>
                  </div>
                </template>
                <div class="opened-page-tab-shell" :class="{ 'is-active': activeTab === tab.path }">
                  <button type="button" class="opened-page-tab" @click="handleTabActivate(tab.path)">
                    <span class="opened-page-tab-text">{{ tab.title }}</span>
                  </button>
                  <button type="button" class="opened-page-tab-close" :title="'关闭 ' + tab.title" @click.stop="handleTabClose(tab.path)">
                    <i class="ri-close-line"></i>
                  </button>
                </div>
              </el-tooltip>
            </div>
            <el-dropdown v-if="openTabs.length > 1" class="opened-page-tabs-more-wrap" trigger="click" placement="bottom-end" :teleported="false" @command="handleTabsMoreCommand">
              <button class="opened-page-tabs-more" type="button" title="所有已打开页面">
                <i class="ri-more-2-fill"></i>
              </button>
              <template v-slot:dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="tab in openTabs" :key="tab.path" :command="tab.path">
                    <span class="opened-page-tabs-dropdown-item" :class="{ 'is-active': activeTab === tab.path }">
                      <i :class="activeTab === tab.path ? 'ri-checkbox-circle-fill' : 'ri-circle-line'" class="opened-page-tabs-dropdown-check"></i>
                      <span class="opened-page-tabs-dropdown-label">{{ tab.title }}</span>
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="content-breadcrumb-bar" data-tour="content-breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item v-for="(crumb, index) in normalizedBreadcrumbs" :key="crumb + '-' + index">
                <span class="content-breadcrumb-item" :class="{ 'is-current': index === normalizedBreadcrumbs.length - 1 }">{{ crumb }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <main class="content-main" data-tour="content-main">
            <slot></slot>
          </main>
        </div>
      </div>
    `
  };

  // ─── PrototypeMissingRoute ────────────────────────────────────────────────────

  const PrototypeMissingRoute = {
    name: 'PrototypeMissingRoute',
    template: `
      <section class="panel">
        <div class="panel-body">
          <el-empty description="当前路由未注册，请检查模块脚本是否已加载"></el-empty>
        </div>
      </section>
    `
  };

  // ─── 导出到内部命名空间 ────────────────────────────────────────────────────────

  Object.assign(P, { PrototypeSidebar, PrototypeLayout, PrototypeMissingRoute });
})(window);
