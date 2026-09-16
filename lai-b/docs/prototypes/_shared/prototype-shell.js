/**
 * prototype-shell.js
 * 应用根组件创建、Vue 应用安装与 bootstrap 启动入口，以及 ChintPrototypeShell 公共 API 导出。
 * 加载顺序：第 6 个（最后），依赖前五个模块文件均已执行完毕。
 *
 * 模块文件加载顺序（Layout.html 中按此顺序引入）：
 *   1. prototype-core.js       — 注册表 + deepClone / normalizeHash / routeHref / registerXxx
 *   2. prototype-menu.js       — 菜单系统（defaultMenus / menuSwitcher / setMenus）
 *   3. prototype-data.js       — 模拟数据 + 租户配置（getMockData / loadMockData）
 *   4. prototype-route.js      — 路由查找与页签元数据（findRoute / createOpenedRouteTab）
 *   5. prototype-components.js — Vue 框架组件（PrototypeSidebar / PrototypeLayout）
 *   6. prototype-shell.js      — 应用启动 + 公共 API（本文件）
 */
(function (window) {
  const P = window._ChintProto;
  const {
    registry,
    HOME_ROUTE_PATH,
    normalizeHash,
    routeHref,
    deepClone,
    cloneMenus,
    hasMenuItems,
    defaultMenus,
    normalizeMenuSwitcherConfig,
    normalizeTenantConfig,
    setMockData,
    loadMockData,
    renderBootstrapError,
    setMenus,
    findRoute,
    createOpenedRouteTab,
    registerPageComponent,
    registerComponent,
    registerRoute,
    getMockData,
    flattenMenuItems,
    PrototypeSidebar,
    PrototypeLayout,
    PrototypeMissingRoute
  } = P;

  const NOTE_DIAGRAM_TONES = ['primary', 'info', 'success', 'warning', 'danger', 'neutral'];
  let noteDiagramSequence = 0;

  function createNoteDiagramId(prefix) {
    noteDiagramSequence += 1;
    return (prefix || 'proto-note-diagram') + '-' + noteDiagramSequence;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeNoteItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(Boolean).map((item) => String(item));
  }

  function wrapSvgText(value, maxChars, maxLines) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!text) return [];

    const chars = Array.from(text);
    const lines = [];
    let buffer = '';

    chars.forEach((char) => {
      if (buffer.length >= maxChars) {
        lines.push(buffer);
        buffer = '';
      }
      buffer += char;
    });

    if (buffer) {
      lines.push(buffer);
    }

    if (!lines.length) {
      return [];
    }

    if (lines.length <= maxLines) {
      return lines;
    }

    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = visible[maxLines - 1].replace(/.$/, '');
    visible[maxLines - 1] += '...';
    return visible;
  }

  function renderSvgTextBlock(lines, x, y, className, lineHeight) {
    if (!lines.length) return '';
    const dy = lineHeight || 14;
    return `<text class="${className}" x="${x}" y="${y}" text-anchor="middle">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : dy}">${escapeHtml(line)}</tspan>`).join('')}</text>`;
  }

  function estimateSvgTextWidth(value, fontSize) {
    const text = String(value == null ? '' : value);
    const size = fontSize || 12;
    const units = Array.from(text).reduce((total, char) => {
      return total + (/^[\u0000-\u00ff]$/.test(char) ? 0.62 : 1);
    }, 0);
    return Math.ceil(units * size);
  }

  function resolveNoteDiagramTone(tone, fallbackTone) {
    return NOTE_DIAGRAM_TONES.includes(tone) ? tone : (fallbackTone || 'primary');
  }

  function normalizeNoteSection(section, index) {
    const normalizedSection = section && typeof section === 'object'
      ? section
      : {
          title: '说明 ' + (index + 1),
          content: section == null ? '' : String(section)
        };

    return {
      title: normalizedSection.title || ('说明 ' + (index + 1)),
      content: normalizedSection.content || '',
      items: normalizeNoteItems(normalizedSection.items),
      diagramMarkup: renderNoteDiagramMarkup(normalizedSection.diagram || normalizedSection.visual || null)
    };
  }

  function renderNoteDiagramMarkup(diagram) {
    if (!diagram || typeof diagram !== 'object') {
      return '';
    }

    const type = String(diagram.type || 'flow').toLowerCase();
    if (['flow', 'process', 'sequence', 'state', 'state-flow'].includes(type)) {
      return renderFlowDiagramMarkup(diagram);
    }
    if (['relation', 'upstream-downstream', 'io', 'handoff'].includes(type)) {
      return renderRelationDiagramMarkup(diagram);
    }
    return '';
  }

  function renderFlowDiagramMarkup(diagram) {
    const nodes = Array.isArray(diagram.nodes)
      ? diagram.nodes.filter(Boolean).map((node, index) => ({
          id: node.id || node.key || ('node-' + index),
          title: node.title || node.label || node.name || ('节点' + (index + 1)),
          meta: node.meta || node.caption || node.description || '',
          tone: resolveNoteDiagramTone(node.tone, index === 0 ? 'primary' : 'info')
        }))
      : [];

    if (!nodes.length) {
      return '';
    }

    const indexMap = {};

    nodes.forEach((node, index) => {
      indexMap[node.id] = index;
    });

    const rawEdges = Array.isArray(diagram.edges) && diagram.edges.length
      ? diagram.edges
      : nodes.slice(0, -1).map((node, index) => ({
          from: node.id,
          to: nodes[index + 1].id,
          label: ''
        }));

    const edges = rawEdges
      .filter((edge) => Object.prototype.hasOwnProperty.call(indexMap, edge.from) && Object.prototype.hasOwnProperty.call(indexMap, edge.to))
      .map((edge, index) => ({
        id: edge.id || ('edge-' + index),
        from: edge.from,
        to: edge.to,
        label: edge.label || '',
        style: edge.style || ''
      }));

    const outgoingMap = {};
    const incomingMap = {};

    edges.forEach((edge) => {
      if (!outgoingMap[edge.from]) outgoingMap[edge.from] = [];
      if (!incomingMap[edge.to]) incomingMap[edge.to] = [];
      outgoingMap[edge.from].push(edge);
      incomingMap[edge.to].push(edge);
    });

    function choosePrimaryEdge(sourceId, outgoingEdges) {
      if (!outgoingEdges || !outgoingEdges.length) {
        return null;
      }

      const sourceIndex = indexMap[sourceId];
      const immediate = outgoingEdges.find((edge) => indexMap[edge.to] === sourceIndex + 1);
      if (immediate) {
        return immediate;
      }

      const forwardEdges = outgoingEdges
        .filter((edge) => indexMap[edge.to] > sourceIndex)
        .sort((left, right) => indexMap[left.to] - indexMap[right.to]);

      return forwardEdges[0] || outgoingEdges[0] || null;
    }

    function renderEdgeLabelChip(label, centerX, centerY) {
      const chipHeight = 24;
      const chipWidth = Math.max(56, estimateSvgTextWidth(label, 11) + 22);
      const x = centerX - chipWidth / 2;
      const y = centerY - chipHeight / 2;

      return `<g class="proto-note-edge-chip"><rect class="proto-note-edge-chip-box" x="${x}" y="${y}" width="${chipWidth}" height="${chipHeight}" rx="12" ry="12"></rect><text class="proto-note-edge-chip-text" x="${centerX}" y="${centerY + 4}" text-anchor="middle">${escapeHtml(label)}</text></g>`;
    }

    const primaryEdgeIds = {};
    const primaryNodeIds = [];
    const visitedPrimaryNodes = {};
    const startNode = nodes.find((node) => !incomingMap[node.id] || !incomingMap[node.id].length) || nodes[0];
    let cursorId = startNode ? startNode.id : '';

    while (cursorId && !visitedPrimaryNodes[cursorId]) {
      visitedPrimaryNodes[cursorId] = true;
      primaryNodeIds.push(cursorId);
      const nextEdge = choosePrimaryEdge(cursorId, outgoingMap[cursorId] || []);
      if (!nextEdge || visitedPrimaryNodes[nextEdge.to]) {
        break;
      }
      primaryEdgeIds[nextEdge.id] = true;
      cursorId = nextEdge.to;
    }

    const rowMap = {};
    primaryNodeIds.forEach((nodeId) => {
      rowMap[nodeId] = 0;
    });

    let nextBranchRow = 1;
    nodes.forEach((node) => {
      if (rowMap[node.id] !== undefined) {
        return;
      }

      const branchRow = nextBranchRow;
      let branchCursor = node.id;
      let assignedAny = false;

      while (branchCursor && rowMap[branchCursor] === undefined) {
        rowMap[branchCursor] = branchRow;
        assignedAny = true;

        const candidateEdges = (outgoingMap[branchCursor] || []).filter((edge) => !primaryEdgeIds[edge.id]);
        const nextBranchEdge = choosePrimaryEdge(branchCursor, candidateEdges.length ? candidateEdges : outgoingMap[branchCursor] || []);

        if (!nextBranchEdge || rowMap[nextBranchEdge.to] !== undefined) {
          break;
        }

        branchCursor = nextBranchEdge.to;
      }

      if (assignedAny) {
        nextBranchRow += 1;
      }
    });

    nodes.forEach((node) => {
      if (rowMap[node.id] === undefined) {
        rowMap[node.id] = 0;
      }
    });

    const nodeWidth = 152;
    const nodeHeight = 86;
    const columnGap = 42;
    const rowGap = 112;
    const marginX = 36;
    const top = 56;
    const maxRow = nodes.reduce((maxValue, node) => Math.max(maxValue, rowMap[node.id] || 0), 0);
    const width = marginX * 2 + nodeWidth * nodes.length + columnGap * Math.max(nodes.length - 1, 0);
    const height = top + nodeHeight * (maxRow + 1) + rowGap * maxRow + 44;
    const markerId = createNoteDiagramId('proto-note-arrow');
    const sourceEdgeCounts = {};
    const nodeBoxes = {};

    const nodeMarkup = nodes.map((node, index) => {
      const x = marginX + index * (nodeWidth + columnGap);
      const y = top + (rowMap[node.id] || 0) * (nodeHeight + rowGap);
      nodeBoxes[node.id] = {
        id: node.id,
        x,
        y,
        row: rowMap[node.id] || 0,
        column: index
      };

      const titleLines = wrapSvgText(node.title, 7, 2);
      const metaLines = wrapSvgText(node.meta, 11, 2);
      const titleY = metaLines.length ? y + 31 : y + 43;
      const metaY = y + 57;

      return `<g class="proto-note-node tone-${node.tone}${(rowMap[node.id] || 0) > 0 ? ' is-branch' : ''}"><rect class="proto-note-node-box" x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="20" ry="20"></rect>${renderSvgTextBlock(titleLines, x + nodeWidth / 2, titleY, 'proto-note-node-title', 15)}${renderSvgTextBlock(metaLines, x + nodeWidth / 2, metaY, 'proto-note-node-meta', 14)}</g>`;
    }).join('');

    const edgeMarkup = edges.map((edge) => {
      const source = nodeBoxes[edge.from];
      const target = nodeBoxes[edge.to];

      if (!source || !target) {
        return '';
      }

      const edgeOrder = sourceEdgeCounts[edge.from] || 0;
      sourceEdgeCounts[edge.from] = edgeOrder + 1;

      const forward = target.column >= source.column;
      const sourceCenterY = source.y + nodeHeight / 2;
      const targetCenterY = target.y + nodeHeight / 2;
      const startX = forward ? source.x + nodeWidth : source.x;
      const endX = forward ? target.x : target.x + nodeWidth;
      let path = '';
      let labelX = (startX + endX) / 2;
      let labelY = Math.min(sourceCenterY, targetCenterY) - 18;

      if (source.row === target.row) {
        if (Math.abs(target.column - source.column) <= 1) {
          path = `M ${startX} ${sourceCenterY} L ${endX} ${targetCenterY}`;
        } else {
          const arcY = sourceCenterY - 28 - edgeOrder * 18;
          const leadX = forward ? startX + 24 : startX - 24;
          const tailX = forward ? endX - 24 : endX + 24;
          const middleX = (startX + endX) / 2;
          path = `M ${startX} ${sourceCenterY} L ${leadX} ${sourceCenterY} Q ${middleX} ${arcY} ${tailX} ${targetCenterY} L ${endX} ${targetCenterY}`;
          labelY = arcY - 14;
        }
      } else {
        const elbowX = forward
          ? Math.max(startX + 30 + edgeOrder * 12, (startX + endX) / 2)
          : Math.min(startX - 30 - edgeOrder * 12, (startX + endX) / 2);
        path = `M ${startX} ${sourceCenterY} H ${elbowX} V ${targetCenterY} H ${endX}`;
        labelX = elbowX;
        labelY = (sourceCenterY + targetCenterY) / 2 - 16;
      }

      const edgeClass = edge.style === 'dashed' ? 'proto-note-edge is-dashed' : 'proto-note-edge';
      const label = edge.label ? renderEdgeLabelChip(edge.label, labelX, labelY) : '';

      return `<g class="proto-note-edge-group"><path class="${edgeClass}" d="${path}" marker-end="url(#${markerId})"></path>${label}</g>`;

    }).join('');

    const caption = diagram.caption ? `<figcaption class="proto-note-caption">${escapeHtml(diagram.caption)}</figcaption>` : '';
    const ariaLabel = escapeHtml(diagram.caption || '业务流程图');

    return `<figure class="proto-note-figure proto-note-flow-figure"><svg class="proto-note-svg proto-note-flow-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="${ariaLabel}"><defs><marker id="${markerId}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8ea0b7"></path></marker></defs>${edgeMarkup}${nodeMarkup}</svg>${caption}</figure>`;
  }

  function renderRelationDiagramMarkup(diagram) {
    const upstream = Array.isArray(diagram.upstream)
      ? diagram.upstream.filter(Boolean).map((item, index) => ({
          title: item.title || item.label || ('上游节点' + (index + 1)),
          meta: item.meta || item.caption || item.description || '',
          tone: resolveNoteDiagramTone(item.tone, 'info')
        }))
      : [];
    const downstream = Array.isArray(diagram.downstream)
      ? diagram.downstream.filter(Boolean).map((item, index) => ({
          title: item.title || item.label || ('下游节点' + (index + 1)),
          meta: item.meta || item.caption || item.description || '',
          tone: resolveNoteDiagramTone(item.tone, 'success')
        }))
      : [];
    const center = diagram.center || {};

    if (!upstream.length && !downstream.length && !center.title && !center.label) {
      return '';
    }

    const markerId = createNoteDiagramId('proto-note-arrow');
    const cardWidth = 166;
    const centerWidth = 190;
    const cardHeight = 72;
    const centerHeight = 82;
    const gap = 56;
    const marginX = 24;
    const titleY = 20;
    const top = 42;
    const rows = Math.max(upstream.length, downstream.length, 1);
    const rowGap = 16;
    const columnHeight = rows * cardHeight + Math.max(rows - 1, 0) * rowGap;
    const width = marginX * 2 + cardWidth * 2 + centerWidth + gap * 2;
    const height = top + columnHeight + 24;
    const centerX = marginX + cardWidth + gap;
    const centerY = top + Math.max((columnHeight - centerHeight) / 2, 0);

    function buildColumnPositions(count) {
      if (!count) return [];
      const totalHeight = count * cardHeight + Math.max(count - 1, 0) * rowGap;
      const startY = top + Math.max((columnHeight - totalHeight) / 2, 0);
      return Array.from({ length: count }, (_, index) => startY + index * (cardHeight + rowGap));
    }

    function renderCard(x, y, widthValue, heightValue, tone, title, meta) {
      const titleLines = wrapSvgText(title, widthValue >= centerWidth ? 9 : 8, 2);
      const metaLines = wrapSvgText(meta, widthValue >= centerWidth ? 13 : 11, 2);
      const titleStartY = metaLines.length ? y + 28 : y + 37;
      const metaStartY = y + 53;
      return `<g class="proto-note-node tone-${tone}"><rect class="proto-note-node-box" x="${x}" y="${y}" width="${widthValue}" height="${heightValue}" rx="18" ry="18"></rect>${renderSvgTextBlock(titleLines, x + widthValue / 2, titleStartY, 'proto-note-node-title', 14)}${renderSvgTextBlock(metaLines, x + widthValue / 2, metaStartY, 'proto-note-node-meta', 13)}</g>`;
    }

    const upstreamX = marginX;
    const downstreamX = centerX + centerWidth + gap;
    const upstreamYPositions = buildColumnPositions(upstream.length);
    const downstreamYPositions = buildColumnPositions(downstream.length);
    const centerAnchorY = centerY + centerHeight / 2;

    const upstreamEdges = upstream.map((item, index) => {
      const fromX = upstreamX + cardWidth;
      const fromY = upstreamYPositions[index] + cardHeight / 2;
      return `<path class="proto-note-edge" d="M ${fromX} ${fromY} L ${centerX} ${centerAnchorY}" marker-end="url(#${markerId})"></path>`;
    }).join('');

    const downstreamEdges = downstream.map((item, index) => {
      const toX = downstreamX;
      const toY = downstreamYPositions[index] + cardHeight / 2;
      return `<path class="proto-note-edge" d="M ${centerX + centerWidth} ${centerAnchorY} L ${toX} ${toY}" marker-end="url(#${markerId})"></path>`;
    }).join('');

    const upstreamCards = upstream.map((item, index) => renderCard(upstreamX, upstreamYPositions[index], cardWidth, cardHeight, item.tone, item.title, item.meta)).join('');
    const downstreamCards = downstream.map((item, index) => renderCard(downstreamX, downstreamYPositions[index], cardWidth, cardHeight, item.tone, item.title, item.meta)).join('');
    const centerCard = renderCard(centerX, centerY, centerWidth, centerHeight, resolveNoteDiagramTone(center.tone, 'primary'), center.title || center.label || '当前页面', center.meta || center.caption || '承接当前业务判断与动作');
    const caption = diagram.caption ? `<figcaption class="proto-note-caption">${escapeHtml(diagram.caption)}</figcaption>` : '';
    const ariaLabel = escapeHtml(diagram.caption || '上下游关系图');

    return `<figure class="proto-note-figure"><svg class="proto-note-svg proto-note-relation-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="${ariaLabel}"><defs><marker id="${markerId}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#95a3b8"></path></marker></defs><text class="proto-note-axis-label" x="${upstreamX + cardWidth / 2}" y="${titleY}" text-anchor="middle">${escapeHtml(diagram.upstreamTitle || '上游输入')}</text><text class="proto-note-axis-label" x="${centerX + centerWidth / 2}" y="${titleY}" text-anchor="middle">${escapeHtml(diagram.centerTitle || '当前页')}</text><text class="proto-note-axis-label" x="${downstreamX + cardWidth / 2}" y="${titleY}" text-anchor="middle">${escapeHtml(diagram.downstreamTitle || '下游输出')}</text>${upstreamEdges}${downstreamEdges}${upstreamCards}${centerCard}${downstreamCards}</svg>${caption}</figure>`;
  }

  function createAppRoot(options) {
    const config = options || {};
    const fallbackRoute = normalizeHash(config.fallbackRoute || HOME_ROUTE_PATH);
    const user = config.user || {};
    const tenantConfig = normalizeTenantConfig(config.tenant || config.multiTenant);
    const menuSwitcherConfig = normalizeMenuSwitcherConfig(config.menuSwitcher);
    const messages = config.messages || [
      { id: 1, time: '09:30', content: 'SPA 原型已加载，模块切换将通过 hash route 完成。', type: 'primary' }
    ];

    return {
      name: 'PrototypeAppRoot',
      data() {
        const initialRoute = findRoute(window.location.hash || fallbackRoute, fallbackRoute);
        return {
          routeHash: initialRoute.path,
          openTabs: [],
          globalKeyword: '',
          lastSearch: '',
          currentTenant: tenantConfig.value,
          messageOpen: false,
          noteOpen: false,
          guideOpen: false,
          messages
        };
      },
      computed: {
        brandName() {
          return config.brandName || '通用管理平台';
        },
        brandIcon() {
          return config.brandIcon || 'ri-cube-2-line';
        },
        userName() {
          return user.name || config.userName || '管理员';
        },
        userRole() {
          return user.role || config.userRole || '原型评审人';
        },
        tenantTitle() {
          return tenantConfig.title;
        },
        tenantOptions() {
          return tenantConfig.options;
        },
        tenantDataTour() {
          return tenantConfig.dataTour;
        },
        menuSwitcher() {
          return menuSwitcherConfig;
        },
        menus() {
          return registry.menus || cloneMenus(hasMenuItems(config.menus) ? config.menus : defaultMenus, menuSwitcherConfig);
        },
        currentRoute() {
          return findRoute(this.routeHash, fallbackRoute);
        },
        currentGuideSteps() {
          return this.currentRoute.guideSteps || [];
        },
        currentNoteSections() {
          const sections = this.currentRoute.noteSections || [];
          const fallbackSections = [
            { title: '业务目标', content: '当前 route 尚未配置原型说明，请在 registerRoute 的 noteSections 中补充本页帮助谁完成什么业务，以及状态流转、上下游关系和必要的流程/关系图示。' }
          ];
          return (sections.length > 0 ? sections : fallbackSections).map((section, index) => normalizeNoteSection(section, index));
        },
        hasTenantSwitcher() {
          return tenantConfig.enabled;
        },
        currentTenantLabel() {
          const option = tenantConfig.options.find((item) => item.value === this.currentTenant) || tenantConfig.options[0] || null;
          return option ? option.label : '';
        }
      },
      mounted() {
        window.addEventListener('hashchange', this.syncRoute);
        if (!window.location.hash) {
          this.navigate(fallbackRoute, true);
          return;
        }
        const target = normalizeHash(window.location.hash || fallbackRoute);
        const route = this.ensureRouteOpen(target);
        this.routeHash = route.path;
        if (route.path !== target) {
          history.replaceState(null, '', route.path);
        }
      },
      beforeUnmount() {
        window.removeEventListener('hashchange', this.syncRoute);
      },
      methods: {
        normalizeHash,
        ensureRouteOpen(hash) {
          const route = findRoute(hash, fallbackRoute);
          const nextTab = createOpenedRouteTab(route, this.menus);
          const existingIndex = this.openTabs.findIndex((item) => item.path === nextTab.path);
          if (existingIndex >= 0) {
            this.openTabs.splice(existingIndex, 1, {
              ...this.openTabs[existingIndex],
              ...nextTab
            });
          } else {
            this.openTabs.push(nextTab);
          }
          return route;
        },
        syncRoute() {
          const target = normalizeHash(window.location.hash || fallbackRoute);
          const route = this.ensureRouteOpen(target);
          this.routeHash = route.path;
          if (route.path !== target) {
            history.replaceState(null, '', route.path);
          }
        },
        navigate(route, replace) {
          const target = normalizeHash(route || fallbackRoute);
          const resolvedRoute = findRoute(target, fallbackRoute);
          const nextTarget = resolvedRoute.path || target;
          if (replace) {
            history.replaceState(null, '', nextTarget);
            this.routeHash = nextTarget;
            this.ensureRouteOpen(nextTarget);
            return;
          }
          if (window.location.hash !== nextTarget) {
            window.location.hash = nextTarget;
          } else {
            this.routeHash = nextTarget;
            this.ensureRouteOpen(nextTarget);
          }
        },
        handleTabActivate(path) {
          this.navigate(path);
        },
        handleTabClose(path) {
          const closeIndex = this.openTabs.findIndex((item) => item.path === path);
          if (closeIndex < 0) {
            return;
          }

          const wasActive = this.routeHash === path;
          this.openTabs = this.openTabs.filter((item) => item.path !== path);

          if (this.openTabs.length === 0) {
            this.navigate(fallbackRoute, true);
            return;
          }

          if (wasActive) {
            const nextTab = this.openTabs[closeIndex - 1] || this.openTabs[closeIndex] || this.openTabs[0];
            this.navigate(nextTab.path, true);
          }
        },
        runGlobalSearch() {
          this.lastSearch = this.globalKeyword || '空关键词';
          ElementPlus.ElMessage.success('已记录搜索条件：' + this.lastSearch);
        },
        handleTenantChange(option) {
          if (!option) {
            return;
          }
          this.currentTenant = option.value;
          ElementPlus.ElMessage.success(tenantConfig.switchMessage.replace('{tenant}', option.label));
        },
        handleUserCommand(command) {
          ElementPlus.ElMessage.info('用户菜单操作：' + command);
        }
      },
      template: `
        <prototype-layout :brand-name="brandName" :brand-icon="brandIcon" brand-href="${HOME_ROUTE_PATH}" :active-menu="currentRoute.menuKey" :active-route="currentRoute.path" :breadcrumbs="currentRoute.breadcrumbs" :open-tabs="openTabs" :active-tab="routeHash" :menus="menus" :menu-switcher="menuSwitcher" v-model:keyword="globalKeyword" :tenant-title="tenantTitle" :tenant-options="tenantOptions" :tenant-data-tour="tenantDataTour" v-model:tenant-value="currentTenant" search-placeholder="搜索功能、菜单、记录" :user-name="userName" :user-role="userRole" @search="runGlobalSearch" @tenant-change="handleTenantChange" @notify="messageOpen = true" @help="noteOpen = true" @guide="guideOpen = true" @user-command="handleUserCommand" @tab-activate="handleTabActivate" @tab-close="handleTabClose">
          <template v-slot:topbar-extra>
            <el-tag v-if="lastSearch" size="small" type="info">最近搜索：{{ lastSearch }}</el-tag>
          </template>
          <div class="opened-page-panels">
            <section v-for="tab in openTabs" :key="tab.path" class="opened-page-panel" v-show="routeHash === tab.path">
              <component :is="tab.component" :key="tab.path" @navigate="navigate"></component>
            </section>
          </div>
        </prototype-layout>

        <el-drawer v-model="messageOpen" title="消息通知" size="360px" direction="rtl">
          <el-empty v-if="messages.length === 0" description="暂无消息"></el-empty>
          <el-timeline v-else>
            <el-timeline-item v-for="msg in messages" :key="msg.id" :timestamp="msg.time" :type="msg.type">
              {{ msg.content }}
            </el-timeline-item>
          </el-timeline>
        </el-drawer>
        <aside v-show="noteOpen" class="proto-note-panel" aria-label="原型说明（开发参考，不实现此 UI）">
          <div class="proto-note-head">
            <div class="ttl"><i class="ri-sticky-note-line"></i>原型说明 <span class="tag">仅供开发参考 · 不实现此 UI</span></div>
            <div class="spacer"></div>
            <el-button text size="small" @click="noteOpen = false"><i class="ri-close-line"></i></el-button>
          </div>
          <div class="proto-note-body">
            <section v-for="(section, sectionIndex) in currentNoteSections" :key="(section.title || 'section') + '-' + sectionIndex" class="proto-note-section">
              <h4>{{ section.title }}</h4>
              <p v-if="section.content">{{ section.content }}</p>
              <div v-if="section.diagramMarkup" class="proto-note-diagram" v-html="section.diagramMarkup"></div>
              <ul v-if="section.items && section.items.length">
                <li v-for="(item, itemIndex) in section.items" :key="section.title + '-' + itemIndex">{{ item }}</li>
              </ul>
            </section>
            <div class="hint">本说明为设计交付补充文档，开发时不实现此浮层 UI；但其中描述的规则、口径与状态必须在开发中如实落地。</div>
          </div>
        </aside>
        <el-tour v-model="guideOpen">
          <el-tour-step v-for="step in currentGuideSteps" :key="step.title" :target="step.target" :title="step.title" :description="step.description" :placement="step.placement || 'bottom'"></el-tour-step>
        </el-tour>
      `
    };
  }

  function install(app) {
    app.component('prototype-sidebar', PrototypeSidebar);
    app.component('prototype-layout', PrototypeLayout);
    app.component('PrototypeMissingRoute', PrototypeMissingRoute);
    Object.keys(registry.components).forEach((name) => app.component(name, registry.components[name]));
    Object.keys(registry.pages).forEach((name) => app.component(name, registry.pages[name]));
  }

  async function bootstrap(options) {
    const config = options || {};
    const mountSelector = config.mountSelector || '#app';
    const dataUrl = config.dataUrl || './data.json';

    try {
      const mockData = await loadMockData(dataUrl);
      if (typeof config.onDataLoaded === 'function') {
        config.onDataLoaded(mockData);
      }
      const appOptions = typeof config.appOptions === 'function'
        ? config.appOptions(mockData)
        : (config.appOptions || {});
      const app = Vue.createApp(createAppRoot(appOptions));
      install(app);
      app.use(ElementPlus);
      app.mount(mountSelector);
      return { app, mockData };
    } catch (error) {
      renderBootstrapError(mountSelector, error, dataUrl);
      throw error;
    }
  }

  // ─── 公共 API 导出 ────────────────────────────────────────────────────────────
  // defaultMenus 已在 prototype-menu.js 中完成初始化（setMenus(defaultMenus)）。

  window.ChintPrototypeShell = {
    menus: registry.menus,
    mockData: registry.mockData,
    registry,
    normalizeHash,
    routeHref,
    cloneMenus,
    deepClone,
    getMockData,
    setMockData,
    loadMockData,
    setMenus,
    registerPageComponent,
    registerComponent,
    registerRoute,
    findRoute,
    createAppRoot,
    install,
    bootstrap
  };
})(window);
