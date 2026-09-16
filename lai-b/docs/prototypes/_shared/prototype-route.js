/**
 * prototype-route.js
 * 路由查找与页签元数据：findRoute / findMenuItemForRoute / resolveRouteTitle /
 * resolveRouteTabInfo / createOpenedRouteTab。
 * 加载顺序：第 4 个，依赖 prototype-core.js（registry / normalizeHash / routeHref）
 *           与 prototype-menu.js（flattenMenuItems）。
 */
(function (window) {
  const P = window._ChintProto;
  const { registry, HOME_ROUTE_PATH, normalizeHash, routeHref, flattenMenuItems } = P;

  // ─── 路由查找 ─────────────────────────────────────────────────────────────────

  function matchesRoutePath(route, target) {
    return !!route && (route.path === target || (Array.isArray(route.aliasPaths) && route.aliasPaths.includes(target)));
  }

  function findRoute(hash, fallbackRoute) {
    const target = normalizeHash(hash || fallbackRoute || HOME_ROUTE_PATH);
    const fallbackTarget = normalizeHash(fallbackRoute || HOME_ROUTE_PATH);
    return registry.routes.find((route) => matchesRoutePath(route, target))
      || registry.routes.find((route) => matchesRoutePath(route, fallbackTarget))
      || registry.routes[0]
      || {
        path: target,
        name: '未注册路由',
        menuKey: '',
        component: 'PrototypeMissingRoute',
        actions: [],
        guideSteps: [],
        noteSections: [
          { title: '路由缺失', content: '当前 hash route 尚未注册，请检查模块 JS 是否已在 Layout.html 的 module route scripts 区域引入。' }
        ]
      };
  }

  function findMenuItemForRoute(route, menus) {
    if (!route) return null;
    const menuItems = flattenMenuItems(menus || registry.menus || []);
    return menuItems.find((item) => item.key === route.menuKey || routeHref(item) === route.path) || null;
  }

  // ─── 路由标题与页签元数据 ──────────────────────────────────────────────────────

  function normalizeBriefText(value, maxLength) {
    const text = value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const limit = maxLength || 56;
    if (text.length <= limit) {
      return text;
    }
    return text.slice(0, limit - 1).trimEnd() + '…';
  }

  function resolveRouteTitle(route, menus) {
    const matchedMenu = findMenuItemForRoute(route, menus);
    if (matchedMenu && matchedMenu.label) {
      return matchedMenu.label;
    }
    if (route && route.tabTitle) {
      return route.tabTitle;
    }
    if (route && route.name) {
      return route.name;
    }
    const breadcrumbs = route && Array.isArray(route.breadcrumbs) ? route.breadcrumbs.filter(Boolean) : [];
    return breadcrumbs[breadcrumbs.length - 1] || (route && route.path) || '未命名页面';
  }

  function resolveRouteTabInfo(route) {
    const source = route && (route.tabInfo || route.tabTooltip || null);
    const fallbackTitle = route && (route.tabTitle || route.name) ? (route.tabTitle || route.name) : '页面信息';
    if (typeof source === 'string') {
      return { title: fallbackTitle, caption: normalizeBriefText(source) };
    }
    if (Array.isArray(source)) {
      return { title: fallbackTitle, caption: normalizeBriefText(source.find(Boolean) || '') };
    }
    if (source && typeof source === 'object') {
      const summary = source.caption || source.summary || source.content || (Array.isArray(source.lines) ? source.lines.find(Boolean) : '') || '';
      return {
        title: source.title || fallbackTitle,
        caption: normalizeBriefText(summary)
      };
    }

    const noteSections = route && Array.isArray(route.noteSections) ? route.noteSections : [];
    if (!noteSections.length) {
      return { title: fallbackTitle, caption: '' };
    }

    const primarySection = noteSections[0] || {};
    const briefSummary = primarySection.content || (Array.isArray(primarySection.items) ? primarySection.items.find(Boolean) : '') || '';

    return {
      title: primarySection.title || fallbackTitle,
      caption: normalizeBriefText(briefSummary)
    };
  }

  function createOpenedRouteTab(route, menus) {
    return {
      path: route.path,
      component: registry.pages[route.component] ? route.component : 'PrototypeMissingRoute',
      menuKey: route.menuKey || '',
      title: resolveRouteTitle(route, menus),
      tabInfo: resolveRouteTabInfo(route)
    };
  }

  // ─── 导出到内部命名空间 ────────────────────────────────────────────────────────

  Object.assign(P, {
    findRoute,
    findMenuItemForRoute,
    normalizeBriefText,
    resolveRouteTitle,
    resolveRouteTabInfo,
    createOpenedRouteTab
  });
})(window);
