/**
 * prototype-data.js
 * 模拟数据管理与租户配置：getMockData / setMockData / loadMockData、normalizeTenantConfig、renderBootstrapError。
 * 加载顺序：第 3 个，依赖 prototype-core.js（registry / deepClone）。
 */
(function (window) {
  const P = window._ChintProto;
  const { registry, deepClone } = P;

  // ─── 租户配置 ─────────────────────────────────────────────────────────────────

  function normalizeTenantConfig(source) {
    const config = source || {};
    const options = Array.isArray(config.options)
      ? config.options.filter((item) => item && item.value && item.label)
      : [];
    const selectedValue = config.value || (options[0] && options[0].value) || '';
    const selectedOption = options.find((item) => item.value === selectedValue) || options[0] || null;

    return {
      enabled: options.length > 0,
      title: config.title || '切换租户',
      dataTour: config.dataTour || 'tenant-switcher',
      options,
      value: selectedOption ? selectedOption.value : '',
      switchMessage: config.switchMessage || '已切换到 {tenant}'
    };
  }

  // ─── 模拟数据访问 ─────────────────────────────────────────────────────────────

  function resolveMockData(path) {
    if (!path) return registry.mockData;
    const segments = Array.isArray(path) ? path : String(path).split('.');
    return segments.reduce((result, segment) => (result == null ? undefined : result[segment]), registry.mockData);
  }

  function getMockData(path, fallbackValue) {
    const resolved = resolveMockData(path);
    if (resolved === undefined) return deepClone(fallbackValue);
    return deepClone(resolved);
  }

  function setMockData(data) {
    registry.mockData = deepClone(data || {});
    if (window.ChintPrototypeShell) {
      window.ChintPrototypeShell.mockData = registry.mockData;
    }
    return registry.mockData;
  }

  async function loadMockData(url) {
    const response = await window.fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('模拟数据加载失败：' + response.status + ' ' + response.statusText);
    }
    return setMockData(await response.json());
  }

  // ─── 启动失败渲染 ─────────────────────────────────────────────────────────────

  function renderBootstrapError(selector, error, dataUrl) {
    const mountNode = document.querySelector(selector);
    if (!mountNode) return;

    const tips = [
      '<p style="margin:0 0 8px;font-weight:600">原型启动失败</p>',
      '<p style="margin:0 0 8px">无法读取模拟数据文件：' + dataUrl + '</p>',
      '<p style="margin:0;color:#666">' + error.message + '</p>'
    ];

    if (window.location.protocol === 'file:') {
      tips.push('<p style="margin:8px 0 0;color:#666">当前页面通过 file:// 打开。读取 data.json 需要使用本地静态服务预览。</p>');
    }

    mountNode.innerHTML = '<div style="margin:40px auto;max-width:560px;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#fff7ed;color:#7c2d12">' + tips.join('') + '</div>';
  }

  // ─── 导出到内部命名空间 ────────────────────────────────────────────────────────

  Object.assign(P, {
    normalizeTenantConfig,
    resolveMockData,
    getMockData,
    setMockData,
    loadMockData,
    renderBootstrapError
  });
})(window);
