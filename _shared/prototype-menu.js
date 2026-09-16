/**
 * prototype-menu.js
 * 菜单与导航系统：defaultMenus、菜单切换器（menuSwitcher）、菜单过滤、cloneMenus、setMenus。
 * 加载顺序：第 2 个，依赖 prototype-core.js（registry / deepClone / normalizeHash / routeHref）。
 */
(function (window) {
  const P = window._ChintProto;
  const { registry, deepClone, HOME_ROUTE_PATH, normalizeHash, routeHref } = P;

  // ─── 默认菜单数据 ─────────────────────────────────────────────────────────────

  const defaultMenus = [
    { title: '', items: [
      { key: 'overview', label: '概览仪表盘首页', icon: 'ri-home-4-line', route: HOME_ROUTE_PATH, subsystems: ['管理驾驶仓', '非生寻源管理', '生产寻源管理', '供应商管理', '目录商城', '成本管理', '订单管理'] }
    ] },
    { title: '流程与审批', items: [
      { key: 'mainline', label: '流程步骤导航页', icon: 'ri-route-line', route: '#/templates/process-step-navigation-page', subsystems: ['管理驾驶仓', '非生寻源管理', '生产寻源管理', '订单管理'] },
      { key: 'flowProgress', label: '进度时间线列表页', icon: 'ri-node-tree', route: '#/templates/progress-timeline-list-page', subsystems: ['管理驾驶仓', '非生寻源管理', '成本管理', '订单管理'] },
      { key: 'review', label: '审批处理列表页', icon: 'ri-shield-check-line', route: '#/templates/approval-processing-list-page', subsystems: ['非生寻源管理', '生产寻源管理', '供应商管理', '订单管理'] }
    ] },
    { title: '检索与管理', items: [
      { key: 'kpiList', label: 'KPI 筛选表格页', icon: 'ri-table-line', route: '#/templates/kpi-filter-table-page', subsystems: ['管理驾驶仓', '成本管理'] },
      { key: 'plainList', label: '查询表格列表页', icon: 'ri-list-check-2', route: '#/templates/query-table-list-page', subsystems: ['非生寻源管理', '生产寻源管理', '订单管理'] },
      { key: 'tabbedList', label: '状态分页签列表页', icon: 'ri-folder-2-line', route: '#/templates/status-tabbed-list-page', subsystems: ['供应商管理', '目录商城', '订单管理'] },
      { key: 'cardGrid', label: '卡片网格库页面', icon: 'ri-layout-grid-line', route: '#/templates/card-grid-library-page', subsystems: ['供应商管理', '目录商城'] }
    ] },
    { title: '监控与看板', items: [
      { key: 'monitoring', label: '监控分析仪表盘页', icon: 'ri-pie-chart-2-line', route: '#/templates/monitoring-analytics-dashboard-page', subsystems: ['管理驾驶仓', '成本管理'] }
    ] },
    { title: '编辑与配置', items: [
      { key: 'asideConfig', label: '侧栏配置中心页', icon: 'ri-settings-3-line', route: '#/templates/aside-config-center-page', subsystems: ['管理驾驶仓', '成本管理', '订单管理'] }
    ] },
    { title: '功能组件', items: [
      { key: 'drawerSizeGuide', label: '抽屉尺寸指引页', icon: 'ri-layout-right-line', route: '#/templates/drawer-size-guide-page', subsystems: ['非生寻源管理', '生产寻源管理', '供应商管理'] }
    ] }
  ];

  // ─── 菜单切换器默认配置 ────────────────────────────────────────────────────────

  const defaultMenuSwitcherStorageKey = 'chint-prototype-active-template-view';

  const defaultMenuSwitcherOptions = [
    { label: '全部模板', value: 'all', icon: 'ri-apps-2-line' },
    { label: '流程与审批', value: 'flows', icon: 'ri-route-line' },
    { label: '检索管理', value: 'lists', icon: 'ri-table-line' },
    { label: '分析配置', value: 'insights', icon: 'ri-settings-3-line' },
    { label: '功能组件', value: 'components', icon: 'ri-apps-line' }
  ];

  const defaultMenuSwitcherKeyMap = {
    overview: ['flows', 'lists', 'insights'],
    mainline: ['flows'],
    flowProgress: ['flows'],
    review: ['flows'],
    kpiList: ['lists'],
    plainList: ['lists'],
    tabbedList: ['lists'],
    cardGrid: ['lists'],
    monitoring: ['insights'],
    asideConfig: ['insights'],
    drawerSizeGuide: ['components']
  };

  const defaultMenuSwitcherRouteOrder = {
    all: ['overview', 'kpiList', 'monitoring'],
    flows: ['mainline', 'flowProgress', 'review', 'overview'],
    lists: ['kpiList', 'plainList', 'tabbedList', 'cardGrid', 'overview'],
    insights: ['monitoring', 'asideConfig', 'overview'],
    components: ['drawerSizeGuide', 'overview']
  };

  // ─── 菜单切换器工具函数 ────────────────────────────────────────────────────────

  function normalizeMenuSwitcherConfig(source) {
    const config = source || {};
    const options = Array.isArray(config.options) && config.options.length > 0
      ? config.options.filter((item) => item && item.value && item.label)
      : defaultMenuSwitcherOptions;
    const allValue = config.allValue || 'all';

    return {
      enabled: config.enabled === true,
      storageKey: config.storageKey || defaultMenuSwitcherStorageKey,
      placeholder: config.placeholder || '选择模板视图',
      allValue,
      options,
      keyMap: config.keyMap || defaultMenuSwitcherKeyMap,
      routeOrder: config.routeOrder || defaultMenuSwitcherRouteOrder
    };
  }

  function resolveTemplateViews(item, menuSwitcherConfig) {
    if (Array.isArray(item.templateViews) && item.templateViews.length > 0) {
      return item.templateViews;
    }
    return menuSwitcherConfig.keyMap[item.key] || [menuSwitcherConfig.allValue];
  }

  function isItemVisibleForTemplateView(item, templateView, menuSwitcherConfig) {
    if (!item) return false;
    if (!menuSwitcherConfig.enabled) return true;
    if (!templateView || templateView === menuSwitcherConfig.allValue) return true;
    return resolveTemplateViews(item, menuSwitcherConfig).includes(templateView);
  }

  function resolveDefaultTemplateView(activeMenu, menus, menuSwitcherConfig) {
    const fallbackTemplateView = menuSwitcherConfig.allValue;
    if (!menuSwitcherConfig.enabled) {
      return fallbackTemplateView;
    }
    try {
      const storedTemplateView = window.localStorage ? window.localStorage.getItem(menuSwitcherConfig.storageKey) : '';
      const resolvedTemplateView = menuSwitcherConfig.options.some((item) => item.value === storedTemplateView) ? storedTemplateView : fallbackTemplateView;
      if (!activeMenu) {
        return resolvedTemplateView;
      }
      const menuItems = flattenMenuItems(menus || defaultMenus);
      const activeItem = menuItems.find((item) => item.key === activeMenu);
      if (!activeItem || isItemVisibleForTemplateView(activeItem, resolvedTemplateView, menuSwitcherConfig)) {
        return resolvedTemplateView;
      }
      return resolveTemplateViewByMenu(activeMenu, menus, menuSwitcherConfig);
    } catch (error) {
      return activeMenu ? resolveTemplateViewByMenu(activeMenu, menus, menuSwitcherConfig) : fallbackTemplateView;
    }
  }

  function resolveTemplateViewByMenu(activeMenu, menus, menuSwitcherConfig) {
    if (!activeMenu) {
      return resolveDefaultTemplateView('', menus, menuSwitcherConfig);
    }
    const menuItems = flattenMenuItems(menus || defaultMenus);
    const activeItem = menuItems.find((item) => item.key === activeMenu);
    if (!activeItem) {
      return resolveDefaultTemplateView('', menus, menuSwitcherConfig);
    }
    const matchedTemplateView = menuSwitcherConfig.options.find((option) => option.value !== menuSwitcherConfig.allValue && isItemVisibleForTemplateView(activeItem, option.value, menuSwitcherConfig));
    return matchedTemplateView ? matchedTemplateView.value : menuSwitcherConfig.allValue;
  }

  function resolveTemplateViewEntry(templateView, menus, menuSwitcherConfig) {
    const menuItems = flattenMenuItems(menus || defaultMenus);
    const preferredKeys = menuSwitcherConfig.routeOrder[templateView] || menuSwitcherConfig.routeOrder[menuSwitcherConfig.allValue] || [];
    for (let index = 0; index < preferredKeys.length; index += 1) {
      const matchedItem = menuItems.find((item) => item.key === preferredKeys[index] && isItemVisibleForTemplateView(item, templateView, menuSwitcherConfig));
      if (matchedItem) {
        return routeHref(matchedItem);
      }
    }
    const fallbackItem = menuItems.find((item) => isItemVisibleForTemplateView(item, templateView, menuSwitcherConfig));
    return fallbackItem ? routeHref(fallbackItem) : HOME_ROUTE_PATH;
  }

  function filterMenusByTemplateView(menus, templateView, menuSwitcherConfig) {
    if (!menuSwitcherConfig.enabled) {
      return menus || [];
    }
    return (menus || []).map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => isItemVisibleForTemplateView(item, templateView, menuSwitcherConfig))
    })).filter((group) => (group.items || []).length > 0);
  }

  // ─── 菜单工具函数 ─────────────────────────────────────────────────────────────

  function flattenMenuItems(menus) {
    return (menus || []).reduce((items, group) => items.concat(group.items || []), []);
  }

  function hasMenuItems(menus) {
    return Array.isArray(menus) && menus.some((group) => Array.isArray(group.items) && group.items.length > 0);
  }

  function cloneMenus(menus, menuSwitcherConfig) {
    const resolvedMenuSwitcherConfig = menuSwitcherConfig || normalizeMenuSwitcherConfig();
    return (menus || defaultMenus).map((group) => ({
      title: group.title,
      items: (group.items || []).map((item) => ({ ...item, href: routeHref(item), templateViews: resolveTemplateViews(item, resolvedMenuSwitcherConfig) }))
    }));
  }

  function setMenus(menus) {
    registry.menus = cloneMenus(hasMenuItems(menus) ? menus : defaultMenus);
    if (window.ChintPrototypeShell) {
      window.ChintPrototypeShell.menus = registry.menus;
    }
  }

  // ─── 初始化默认菜单 ────────────────────────────────────────────────────────────

  setMenus(defaultMenus);

  // ─── 导出到内部命名空间 ────────────────────────────────────────────────────────

  Object.assign(P, {
    defaultMenus,
    normalizeMenuSwitcherConfig,
    resolveTemplateViews,
    isItemVisibleForTemplateView,
    resolveDefaultTemplateView,
    resolveTemplateViewByMenu,
    resolveTemplateViewEntry,
    filterMenusByTemplateView,
    flattenMenuItems,
    hasMenuItems,
    cloneMenus,
    setMenus
  });
})(window);
