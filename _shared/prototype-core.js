/**
 * prototype-core.js
 * 核心注册表、基础工具函数与注册 API。
 * 职责：初始化共享注册表 _ChintProto、提供 deepClone / normalizeHash / routeHref，
 *       以及 registerPageComponent / registerComponent / registerRoute。
 * 加载顺序：第 1 个，其他模块必须在本文件之后加载。
 */
(function (window) {
  const P = window._ChintProto || (window._ChintProto = {});

  const registry = window.ChintPrototype || { pages: {}, components: {}, routes: [], menus: null, mockData: {} };
  registry.pages = registry.pages || {};
  registry.components = registry.components || {};
  registry.routes = registry.routes || [];
  registry.mockData = registry.mockData || {};
  const HOME_ROUTE_PATH = '#/templates/overview-dashboard-home-page';
  window.ChintPrototype = registry;

  // ─── 基础工具 ─────────────────────────────────────────────────────────────────

  function deepClone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeHash(path) {
    if (!path) return HOME_ROUTE_PATH;
    if (/^(https?:|mailto:|tel:)/.test(path)) return path;
    if (path.charAt(0) === '#') return path;
    if (path.charAt(0) === '/') return '#' + path;
    return '#/' + path.replace(/^\/+/, '');
  }

  function routeHref(item) {
    if (item && item.route) return normalizeHash(item.route);
    return (item && item.href) || HOME_ROUTE_PATH;
  }

  // ─── 注册 API ─────────────────────────────────────────────────────────────────

  function registerPageComponent(name, component) {
    if (!name || !component) return;
    registry.pages[name] = { ...component, name: component.name || name };
  }

  function registerComponent(name, component) {
    if (!name || !component) return;
    registry.components[name] = { ...component, name: component.name || name };
  }

  function registerRoute(route) {
    if (!route || !route.path || !route.component) return;
    const normalizedPath = normalizeHash(route.path);
    const normalizedAliasPaths = Array.isArray(route.aliasPaths)
      ? route.aliasPaths
        .map((path) => normalizeHash(path))
        .filter((path, index, list) => path && path !== normalizedPath && list.indexOf(path) === index)
      : [];
    const normalizedRoute = {
      ...route,
      path: normalizedPath,
      aliasPaths: normalizedAliasPaths,
      menuKey: route.menuKey || route.key || route.path,
      breadcrumbs: route.breadcrumbs || [route.name || route.path],
      actions: route.actions || [],
      tabTitle: route.tabTitle || route.name || '',
      tabInfo: route.tabInfo || route.tabTooltip || null,
      guideSteps: route.guideSteps || [],
      noteSections: route.noteSections || []
    };
    const existingIndex = registry.routes.findIndex((item) => item.path === normalizedRoute.path);
    if (existingIndex >= 0) {
      registry.routes.splice(existingIndex, 1, normalizedRoute);
    } else {
      registry.routes.push(normalizedRoute);
    }
  }

  // ─── 主题管理 ─────────────────────────────────────────────────────────────────
  // 支持的主题列表；新增/删除主题时同步更新 templates/theme/ 目录下对应 CSS 文件。

  var THEME_OPTIONS = [
    { value: 'blue',  label: '蓝色主题', icon: 'ri-contrast-2-line' },
    { value: 'light', label: '浅色主题', icon: 'ri-sun-line' },
    { value: 'dark',  label: '深色主题', icon: 'ri-moon-line' }
  ];

  var THEME_STORAGE_KEY = 'chint-proto-theme';

  function getTheme() {
    try {
      return (window.localStorage && window.localStorage.getItem(THEME_STORAGE_KEY)) || 'blue';
    } catch (e) {
      return 'blue';
    }
  }

  function applyTheme(theme) {
    var validTheme = THEME_OPTIONS.some(function (t) { return t.value === theme; }) ? theme : 'blue';

    // Element Plus 内置深色模式：在 html 元素上添加/移除 dark class
    if (validTheme === 'dark') {
      document.documentElement.classList.add('dark');
      // 按需注入 Element Plus 深色 CSS 变量文件（在主 CSS 之后追加）
      if (!document.getElementById('proto-ep-dark-css')) {
        var epDark = document.createElement('link');
        epDark.id = 'proto-ep-dark-css';
        epDark.rel = 'stylesheet';
        epDark.href = 'https://cdn.jsdelivr.net/npm/element-plus@2.13.7/theme-chalk/dark/css-vars.css';
        document.head.appendChild(epDark);
      }
    } else {
      document.documentElement.classList.remove('dark');
      var existingEpDark = document.getElementById('proto-ep-dark-css');
      if (existingEpDark) existingEpDark.parentNode.removeChild(existingEpDark);
    }

    // 更新原型主题 CSS 链接（./theme/<theme>.css），覆盖 Shared.css :root 中的默认值
    var link = document.getElementById('proto-theme-css');
    if (!link) {
      link = document.createElement('link');
      link.id = 'proto-theme-css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = './theme/' + validTheme + '.css';

    // 持久化主题选择
    try {
      window.localStorage && window.localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch (e) { /* ignore storage errors */ }
  }

  // 页面加载时还原上次选择的主题
  applyTheme(getTheme());

  // ─── 导出到内部命名空间 ────────────────────────────────────────────────────────

  Object.assign(P, {
    registry,
    HOME_ROUTE_PATH,
    deepClone,
    normalizeHash,
    routeHref,
    registerPageComponent,
    registerComponent,
    registerRoute,
    THEME_OPTIONS,
    getTheme,
    applyTheme
  });
})(window);
