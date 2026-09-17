(function (window) {
  const componentName = 'RebateAccrualVersionListPage';
  const STYLE_ID = 'rebate-accrual-version-list-style';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
  }

  function versionNumber(version) {
    const match = /V(\d+)/i.exec(version || '');
    return match ? Number(match[1]) : 0;
  }

  function nextVersion(version) {
    return 'V' + (versionNumber(version) + 1);
  }

  function createVersionHistory(row, sapVersion) {
    if (row.id === 'A260916001') {
      return [
        { version: 'V5', status: 'active', statusLabel: 'SAP生效', unitPrice: 27.3000, submitter: '陈静怡', submitTime: '2026-09-16 10:30', sapResult: '同步成功，当前生效' },
        { version: 'V4', status: 'replaced', statusLabel: '已被替代', unitPrice: 27.8000, submitter: '张伟', submitTime: '2026-09-12 16:20', sapResult: '同步成功' },
        { version: 'V3', status: 'failed', statusLabel: '同步失败', unitPrice: 28.0000, submitter: '张伟', submitTime: '2026-09-12 15:40', sapResult: 'SAP校验失败：成本中心已关闭' },
        { version: 'V2', status: 'replaced', statusLabel: '已被替代', unitPrice: 28.2000, submitter: '李明', submitTime: '2026-09-05 11:10', sapResult: '同步成功' },
        { version: 'V1', status: 'replaced', statusLabel: '已被替代', unitPrice: 28.6000, submitter: '李明', submitTime: '2026-09-01 09:25', sapResult: '首次同步成功' }
      ];
    }
    return [{
      version: sapVersion || 'V1',
      status: 'active',
      statusLabel: 'SAP生效',
      unitPrice: Number(row.sapDiscountUnitPrice || row.discountUnitPrice || 0),
      submitter: row.lastSyncUser || '陈静怡',
      submitTime: row.lastSyncTime || '2026-09-16 10:30',
      sapResult: '同步成功，当前生效'
    }];
  }

  function normalizeRow(source) {
    const row = deepClone(source);
    const syncStatusMap = {
      'pending-first': 'draft',
      synced: 'synced',
      'pending-resubmit': 'pending-resubmit',
      'resubmit-failed': 'sync-failed',
      'sap-locked': 'pending-resubmit'
    };
    row.syncStatus = syncStatusMap[row.status] || 'draft';
    row.syncStatusLabel = statusText(row.syncStatus);
    const areaTotal = Number(row.areaTotal || 0) || (row.receiptLines || []).reduce((sum, line) => sum + Number(line.area || 0), 0);
    row.discountAmount = roundMoney(areaTotal ? areaTotal * Number(row.discountUnitPrice || 0) : 0);
    row.afterAmount = roundMoney(Number(row.originalAmount || 0) - row.discountAmount);
    if (row.id === 'A260916001') {
      row.accrualMonth = '2026-09';
      row.sapVersion = 'V5';
      row.currentVersion = '';
      row.draftBaseVersion = 'V5';
      row.hasDraft = true;
      row.status = 'pending-resubmit';
      row.statusLabel = '待重新提交';
      row.sapDiscountUnitPrice = 27.3000;
      row.sapDiscountAmount = roundMoney(areaTotal * row.sapDiscountUnitPrice);
      row.sapAfterAmount = roundMoney(Number(row.originalAmount || 0) - row.sapDiscountAmount);
      row.versionHistory = createVersionHistory(row, 'V5');
      row.historyCount = 5;
      return row;
    }
    if (row.status === 'synced') {
      row.currentVersion = '';
      row.draftBaseVersion = row.sapVersion || 'V1';
      row.hasDraft = false;
    } else if (row.status === 'resubmit-failed') {
      row.sapVersion = row.sapVersion || 'V2';
      row.currentVersion = '';
      row.draftBaseVersion = row.sapVersion;
      row.hasDraft = true;
      row.latestFailedVersion = nextVersion(row.sapVersion);
      row.failedSnapshotUnitPrice = Number(row.discountUnitPrice || 0);
    } else {
      row.currentVersion = '';
      row.draftBaseVersion = row.sapVersion || '';
      row.hasDraft = true;
    }
    row.versionHistory = createVersionHistory(row, row.sapVersion);
    row.historyCount = row.versionHistory.length;
    return row;
  }

  function statusText(status) {
    return {
      draft: '草稿',
      'pending-first': '待首次提交',
      synced: '已同步',
      'pending-resubmit': '待重新提交',
      'sync-failed': '同步失败',
      'resubmit-failed': '同步失败',
    }[status] || '待处理';
  }

  function statusTagType(status) {
    return {
      draft: 'info',
      'pending-first': 'info',
      synced: 'success',
      'pending-resubmit': 'warning',
      'sync-failed': 'danger',
      'resubmit-failed': 'danger'
    }[status] || 'info';
  }

  function formatDateTime() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
      + ' ' + [pad(now.getHours()), pad(now.getMinutes())].join(':');
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .rebate-version-drawer .el-drawer__header { margin-bottom: 0; padding-bottom: 14px; border-bottom: 1px solid var(--el-border-color-lighter); }
      .rebate-version-drawer .el-drawer__body { padding: 14px 18px 18px; background: var(--el-fill-color-extra-light); }
      .rebate-version-drawer .el-drawer__footer { padding: 12px 18px; border-top: 1px solid var(--el-border-color-lighter); background: var(--el-bg-color); }
      .rebate-version-shell { display: flex; flex-direction: column; gap: 12px; min-height: 100%; }
      .rebate-version-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 14px 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
      .rebate-version-title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-version-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 7px; font-size: 12px; color: var(--el-text-color-secondary); }
      .rebate-version-switch { flex: 0 0 auto; }
      .rebate-version-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .rebate-version-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 11px 14px; border: 1px solid rgba(230, 162, 60, .34); border-radius: 9px; background: rgba(230, 162, 60, .09); color: var(--el-color-warning-dark-2); }
      .rebate-version-banner.is-synced { border-color: rgba(103, 194, 58, .34); background: rgba(103, 194, 58, .08); color: var(--el-color-success-dark-2); }
      .rebate-version-banner-main { display: flex; gap: 9px; min-width: 0; line-height: 1.55; }
      .rebate-version-banner-main i { margin-top: 2px; font-size: 17px; }
      .rebate-version-banner strong { display: block; font-size: 13px; }
      .rebate-version-banner span { display: block; margin-top: 1px; font-size: 12px; color: var(--el-text-color-regular); }
      .rebate-drawer-panel { padding: 14px 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: var(--el-bg-color); }
      .rebate-panel-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; font-size: 14px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-panel-subtitle { font-size: 12px; font-weight: 400; color: var(--el-text-color-secondary); }
      .rebate-summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      .rebate-summary-item { position: relative; padding: 11px 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; background: var(--el-fill-color-blank); }
      .rebate-summary-item.is-changed { border-color: rgba(230, 162, 60, .48); background: rgba(230, 162, 60, .07); }
      .rebate-summary-label { font-size: 12px; color: var(--el-text-color-secondary); }
      .rebate-summary-value { margin-top: 4px; font-size: 17px; font-weight: 650; color: var(--el-text-color-primary); font-variant-numeric: tabular-nums; }
      .rebate-change-mark { display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; padding: 1px 5px; border-radius: 4px; background: rgba(230, 162, 60, .15); color: var(--el-color-warning-dark-2); font-size: 11px; font-weight: 500; }
      .rebate-rate-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 18px; }
      .rebate-rate-form .el-form-item { margin-bottom: 4px; }
      .rebate-rate-form .is-field-changed .el-input-number { box-shadow: 0 0 0 1px rgba(230, 162, 60, .6) inset; border-radius: var(--el-border-radius-base); }
      .rebate-table-caption { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--el-text-color-secondary); }
      .rebate-drawer-table .cell { font-size: 12px; }
      .rebate-downstream-warning { display: flex; gap: 8px; padding: 10px 12px; border-left: 3px solid var(--el-color-warning); background: var(--el-color-warning-light-9); font-size: 12px; line-height: 1.55; color: var(--el-text-color-regular); }
      .rebate-version-column { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
      .rebate-version-arrow { color: var(--el-text-color-placeholder); }
      .rebate-pending-version { color: var(--el-color-warning-dark-2); font-weight: 650; }
      .rebate-status-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
      .rebate-status-cell small { color: var(--el-text-color-secondary); }
      .rebate-context-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--el-text-color-secondary); }
      .rebate-positive { color: var(--el-color-danger); }
      .rebate-negative { color: var(--el-color-success); }
      .rebate-history-summary { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; background: var(--el-fill-color-extra-light); }
      .rebate-history-summary-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 650; }
      .rebate-history-rule { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; padding: 10px 12px; border-left: 3px solid var(--el-color-primary); background: var(--el-color-primary-light-9); color: var(--el-text-color-regular); font-size: 12px; line-height: 1.55; }
      @media (max-width: 1180px) {
        .rebate-summary-grid, .rebate-rate-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .rebate-version-head { flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      const pageData = ChintPrototypeShell.getMockData('rebateAccruals', {});
      return {
        rows: (pageData.rows || []).map(normalizeRow),
        categoryOptions: deepClone(pageData.categoryOptions || []),
        statusOptions: [
          { label: '草稿', value: 'draft' },
          { label: '已同步', value: 'synced' },
          { label: '待重新提交', value: 'pending-resubmit' },
          { label: '同步失败', value: 'sync-failed' }
        ],
        receiptLines: deepClone(pageData.receiptLines || []),
        keyword: '',
        monthFilter: '',
        categoryFilter: '',
        statusFilter: '',
        selectedRows: [],
        actedRowId: '',
        page: 1,
        pageSize: 10,
        pageSizes: [10, 20, 50],
        drawerOpen: false,
        currentRow: null,
        formModel: null,
        drawerLines: [],
        activeVersionView: 'draft',
        historyDialogOpen: false,
        selectedHistory: null,
        submitting: false
      };
    },
    computed: {
      filteredRows() {
        const keyword = this.keyword.trim().toLowerCase();
        return this.rows.filter((row) => {
          if (this.monthFilter && row.accrualMonth !== this.monthFilter) return false;
          if (this.categoryFilter && row.category !== this.categoryFilter) return false;
          if (this.statusFilter && row.syncStatus !== this.statusFilter) return false;
          if (keyword && ![row.id, row.supplier, row.companyCode].join(' ').toLowerCase().includes(keyword)) return false;
          return true;
        });
      },
      pagedRows() {
        const start = (this.page - 1) * this.pageSize;
        return this.filteredRows.slice(start, start + this.pageSize);
      },
      drawerTitle() {
        return this.currentRow ? this.currentRow.id + ' · 版本详情' : '计提单版本详情';
      },
      isSapView() {
        return this.activeVersionView === 'sap';
      },
      draftLabel() {
        if (!this.formModel || !this.formModel.hasDraft) return '当前编辑稿（未创建）';
        return '当前编辑稿（基于' + this.formModel.draftBaseVersion + '）';
      },
      unitPriceChanged() {
        if (!this.formModel) return false;
        return Math.abs(Number(this.formModel.discountUnitPrice || 0) - Number(this.formModel.sapDiscountUnitPrice || 0)) > 0.0001;
      },
      hasUnsavedChanges() {
        if (!this.formModel || !this.currentRow) return false;
        return Math.abs(Number(this.formModel.discountUnitPrice || 0) - Number(this.currentRow.discountUnitPrice || 0)) > 0.0001;
      },
      hasPendingSync() {
        if (!this.formModel) return false;
        return Boolean(this.formModel.hasDraft) || ['pending-first', 'pending-resubmit', 'resubmit-failed'].includes(this.formModel.status);
      },
      nextSubmitVersion() {
        if (!this.formModel) return '';
        const canRetryFailed = this.formModel.status === 'resubmit-failed'
          && this.formModel.latestFailedVersion
          && Math.abs(Number(this.formModel.discountUnitPrice || 0) - Number(this.formModel.failedSnapshotUnitPrice || 0)) < 0.0001;
        if (canRetryFailed) return this.formModel.latestFailedVersion;
        const historyMax = (this.formModel.versionHistory || []).reduce((max, item) => Math.max(max, versionNumber(item.version)), 0);
        return 'V' + (Math.max(historyMax, versionNumber(this.formModel.sapVersion)) + 1);
      },
      currentDiscountAmount() {
        if (!this.formModel) return 0;
        return roundMoney(this.drawerLines.reduce((sum, line) => sum + roundMoney(Number(line.area || 0) * Number(this.formModel.discountUnitPrice || 0)), 0));
      },
      currentAfterAmount() {
        return this.formModel ? roundMoney(Number(this.formModel.originalAmount || 0) - this.currentDiscountAmount) : 0;
      },
      sapDiscountAmount() {
        return this.formModel ? Number(this.formModel.sapDiscountAmount || 0) : 0;
      },
      sapAfterAmount() {
        return this.formModel ? Number(this.formModel.sapAfterAmount || 0) : 0;
      },
      headDiffRows() {
        if (!this.formModel) return [];
        const rows = [];
        if (this.unitPriceChanged) {
          const delta = Number(this.formModel.discountUnitPrice || 0) - Number(this.formModel.sapDiscountUnitPrice || 0);
          rows.push({ field: '折让后M²不含税单价', sap: this.formatUnitPrice(this.formModel.sapDiscountUnitPrice), current: this.formatUnitPrice(this.formModel.discountUnitPrice), delta: this.signed(delta, '') });
        }
        if (Math.abs(this.currentDiscountAmount - this.sapDiscountAmount) > 0.009) {
          rows.push({ field: '折让计提金额', sap: this.formatMoney(this.sapDiscountAmount), current: this.formatMoney(this.currentDiscountAmount), delta: this.signed(this.currentDiscountAmount - this.sapDiscountAmount, '') });
        }
        if (Math.abs(this.currentAfterAmount - this.sapAfterAmount) > 0.009) {
          rows.push({ field: '折后金额', sap: this.formatMoney(this.sapAfterAmount), current: this.formatMoney(this.currentAfterAmount), delta: this.signed(this.currentAfterAmount - this.sapAfterAmount, '') });
        }
        if (this.formModel.lastModifiedTime !== this.formModel.lastSyncTime) {
          rows.push({ field: '更新时间', sap: this.formModel.lastSyncTime, current: this.formModel.lastModifiedTime, delta: '本地已更新' });
        }
        return rows;
      },
      changedLineRows() {
        return this.drawerLines.filter((line) => {
          return Math.abs(Number(line.discountAmount || 0) - Number(line.sapDiscountAmount || 0)) > 0.009
            || Math.abs(Number(line.afterAmount || 0) - Number(line.sapAfterAmount || 0)) > 0.009;
        });
      },
      drawerStatusText() {
        return this.formModel ? statusText(this.formModel.status) : '';
      },
      activeHistoryCount() {
        return this.formModel && this.formModel.versionHistory ? this.formModel.versionHistory.length : 0;
      }
    },
    watch: {
      keyword() { this.page = 1; },
      monthFilter() { this.page = 1; },
      categoryFilter() { this.page = 1; },
      statusFilter() { this.page = 1; }
    },
    mounted() {
      ensureStyles();
    },
    methods: {
      cloneLinesForRow(row) {
        return this.receiptLines.map((source) => {
          const line = deepClone(source);
          line.amount = roundMoney(line.amount);
          line.m2UntaxedPrice = Number(line.area || 0) === 0 ? 0 : roundMoney(Number(line.amount || 0) / Number(line.area || 0));
          line.discountUnitPrice = roundMoney(row.discountUnitPrice);
          line.discountAmount = roundMoney(Number(line.area || 0) * Number(row.discountUnitPrice || 0));
          line.afterAmount = roundMoney(Number(line.amount || 0) - line.discountAmount);
          line.sapDiscountUnitPrice = roundMoney(row.sapDiscountUnitPrice);
          line.sapDiscountAmount = roundMoney(Number(line.area || 0) * Number(row.sapDiscountUnitPrice || 0));
          line.sapAfterAmount = roundMoney(Number(line.amount || 0) - line.sapDiscountAmount);
          line.changeType = Math.abs(line.discountAmount - line.sapDiscountAmount) > 0.009 ? '修改' : '无变化';
          return line;
        });
      },
      openVersion(row) {
        if (!row) return;
        this.actedRowId = row.id;
        this.navigateToDetail(row);
      },
      openEdit(row) {
        this.navigateToDetail(row);
      },
      selectRow(row, column) {
        if (column && column.type === 'selection') return;
        this.navigateToDetail(row);
      },
      navigateToDetail(row) {
        if (!row || !row.id) return;
        try {
          window.sessionStorage.setItem('rebateSelectedAccrualId', row.id);
        } catch (error) {}
        this.$emit('navigate', '#/rebate/accrual-detail');
      },
      handleSelection(rows) {
        this.selectedRows = rows;
      },
      tableRowClassName({ row }) {
        if (row && row.id === this.actedRowId) return 'proto-table-row-acted';
        return this.selectedRows.some((item) => item.id === row.id) ? 'proto-table-row-selected' : '';
      },
      resetFilters() {
        this.keyword = '';
        this.monthFilter = '';
        this.categoryFilter = '';
        this.statusFilter = '';
        this.page = 1;
      },
      handlePageChange(value) {
        this.page = value;
      },
      handlePageSizeChange(value) {
        this.pageSize = value;
        this.page = 1;
      },
      handleRateInput(value) {
        if (!this.formModel) return;
        this.formModel.discountUnitPrice = Number(value || 0);
        this.formModel.discountAmount = this.currentDiscountAmount;
        this.formModel.afterAmount = this.currentAfterAmount;
        this.drawerLines.forEach((line) => {
          line.discountUnitPrice = roundMoney(this.formModel.discountUnitPrice);
          line.discountAmount = roundMoney(Number(line.area || 0) * this.formModel.discountUnitPrice);
          line.afterAmount = roundMoney(Number(line.amount || 0) - line.discountAmount);
          line.changeType = Math.abs(line.discountAmount - Number(line.sapDiscountAmount || 0)) > 0.009 ? '修改' : '无变化';
        });
      },
      saveCurrent() {
        if (!this.currentRow || !this.formModel) return;
        if (!this.hasUnsavedChanges) {
          ElementPlus.ElMessage.info('当前没有新的本地修改');
          return;
        }
        const isDifferent = this.unitPriceChanged;
        this.formModel.currentVersion = '';
        this.formModel.draftBaseVersion = this.formModel.sapVersion;
        this.formModel.hasDraft = isDifferent;
        this.formModel.discountAmount = this.currentDiscountAmount;
        this.formModel.afterAmount = this.currentAfterAmount;
        this.formModel.status = isDifferent ? 'pending-resubmit' : 'synced';
        this.formModel.statusLabel = statusText(this.formModel.status);
        this.formModel.changedFields = isDifferent ? 5 : 0;
        this.formModel.changedLines = isDifferent ? this.changedLineRows.length : 0;
        this.formModel.lastModifiedTime = formatDateTime();
        this.formModel.lastModifiedUser = '陈静怡';
        Object.assign(this.currentRow, deepClone(this.formModel));
        ElementPlus.ElMessage.success(isDifferent ? '编辑稿已保存，仍基于' + this.formModel.sapVersion + '；未生成新的正式版本号' : '编辑稿内容已与SAP生效版本一致');
      },
      revertUnsynced() {
        if (!this.formModel || !this.currentRow) return;
        if (!this.hasPendingSync && !this.hasUnsavedChanges) {
          ElementPlus.ElMessage.info('当前没有可放弃的编辑稿');
          return;
        }
        ElementPlus.ElMessageBox.confirm('放弃后，编辑稿将被清空并恢复为SAP生效版本 ' + this.formModel.sapVersion + '。确认继续？', '放弃编辑稿', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.formModel.discountUnitPrice = Number(this.formModel.sapDiscountUnitPrice || 0);
          this.formModel.discountAmount = Number(this.formModel.sapDiscountAmount || 0);
          this.formModel.afterAmount = Number(this.formModel.sapAfterAmount || 0);
          this.formModel.currentVersion = '';
          this.formModel.hasDraft = false;
          this.formModel.draftBaseVersion = this.formModel.sapVersion;
          this.formModel.status = 'synced';
          this.formModel.statusLabel = '已同步';
          this.formModel.changedFields = 0;
          this.formModel.changedLines = 0;
          this.formModel.lastModifiedTime = this.formModel.lastSyncTime;
          this.formModel.lastModifiedUser = this.formModel.lastSyncUser;
          this.drawerLines.forEach((line) => {
            line.discountAmount = Number(line.sapDiscountAmount || 0);
            line.afterAmount = Number(line.sapAfterAmount || 0);
            line.changeType = '无变化';
          });
          Object.assign(this.currentRow, deepClone(this.formModel));
          this.activeVersionView = 'sap';
          ElementPlus.ElMessage.success('已放弃编辑稿，当前仅保留SAP生效版本 ' + this.formModel.sapVersion);
        }).catch(() => {});
      },
      submitToSap() {
        if (!this.formModel || !this.currentRow) return;
        if (this.hasUnsavedChanges) {
          ElementPlus.ElMessage.warning('存在未保存修改，请先保存编辑稿再提交SAP');
          return;
        }
        if (!this.formModel.hasDraft || !this.unitPriceChanged) {
          ElementPlus.ElMessage.info('当前没有可提交的编辑稿');
          return;
        }
        const targetVersion = this.nextSubmitVersion;
        const isRetry = targetVersion === this.formModel.latestFailedVersion;
        const confirmText = isRetry
          ? '编辑稿内容与最近失败的' + targetVersion + '一致，本次将沿用' + targetVersion + '重试；SAP仍以' + this.formModel.sapVersion + '为准，直到同步成功。'
          : '本次提交将为编辑稿生成正式版本' + targetVersion + '；保存编辑稿本身不会生成版本号。确认提交SAP？';
        ElementPlus.ElMessageBox.confirm(confirmText, isRetry ? '重试' + targetVersion : '提交并生成' + targetVersion, {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.submitting = true;
          window.setTimeout(() => {
            (this.formModel.versionHistory || []).forEach((item) => {
              if (item.status === 'active') {
                item.status = 'replaced';
                item.statusLabel = '已被替代';
                item.sapResult = '同步成功';
              }
            });
            const existingVersion = (this.formModel.versionHistory || []).find((item) => item.version === targetVersion);
            if (existingVersion) {
              existingVersion.status = 'active';
              existingVersion.statusLabel = 'SAP生效';
              existingVersion.sapResult = '重试成功，当前生效';
              existingVersion.submitTime = formatDateTime();
            } else {
              this.formModel.versionHistory.unshift({ version: targetVersion, status: 'active', statusLabel: 'SAP生效', unitPrice: Number(this.formModel.discountUnitPrice || 0), submitter: '陈静怡', submitTime: formatDateTime(), sapResult: '同步成功，当前生效' });
            }
            this.formModel.sapVersion = targetVersion;
            this.formModel.sapDiscountUnitPrice = Number(this.formModel.discountUnitPrice || 0);
            this.formModel.sapDiscountAmount = Number(this.formModel.discountAmount || 0);
            this.formModel.sapAfterAmount = Number(this.formModel.afterAmount || 0);
            this.formModel.status = 'synced';
            this.formModel.statusLabel = '已同步';
            this.formModel.hasDraft = false;
            this.formModel.draftBaseVersion = targetVersion;
            this.formModel.currentVersion = '';
            this.formModel.latestFailedVersion = '';
            this.formModel.historyCount = this.formModel.versionHistory.length;
            this.formModel.changedFields = 0;
            this.formModel.changedLines = 0;
            this.formModel.lastSyncTime = formatDateTime();
            this.formModel.lastSyncUser = '陈静怡';
            this.formModel.lastModifiedTime = this.formModel.lastSyncTime;
            this.formModel.lastModifiedUser = this.formModel.lastSyncUser;
            this.drawerLines.forEach((line) => {
              line.sapDiscountAmount = Number(line.discountAmount || 0);
              line.sapAfterAmount = Number(line.afterAmount || 0);
              line.changeType = '无变化';
            });
            Object.assign(this.currentRow, deepClone(this.formModel));
            this.submitting = false;
            this.activeVersionView = 'sap';
            ElementPlus.ElMessage.success('SAP同步成功，' + targetVersion + '已成为生效版本，编辑稿已清空');
          }, 900);
        }).catch(() => {});
      },
      openHistory() {
        if (!this.formModel) return;
        this.selectedHistory = null;
        this.historyDialogOpen = true;
      },
      viewHistory(row) {
        this.selectedHistory = row;
      },
      historyTagType(status) {
        return { active: 'success', failed: 'danger', replaced: 'info' }[status] || 'info';
      },
      handleCreate() {
        this.$emit('navigate', '#/rebate/accrual-create');
      },
      tagType(status) {
        return statusTagType(status);
      },
      statusLabel(status) {
        return statusText(status);
      },
      formatMoney(value) {
        return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      },
      formatUnitPrice(value) {
        return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      },
      signed(value, suffix) {
        const number = Number(value || 0);
        const text = suffix === '%' ? Math.abs(number).toFixed(2).replace(/\.00$/, '') : this.formatMoney(Math.abs(number));
        return (number > 0 ? '+' : number < 0 ? '-' : '') + text + (suffix || '');
      },
      deltaClass(value) {
        const number = Number(value || 0);
        return number > 0 ? 'rebate-positive' : number < 0 ? 'rebate-negative' : '';
      }
    },
    template: `
      <div class="flow-progress-layout">
        <section class="panel control-panel flow-panel-shell">
          <div class="panel-body">
            <div class="filter-bar" data-tour="rebate-accrual-filter">
              <el-input v-model="keyword" size="small" style="width:260px" placeholder="搜索计提单号、供应商、公司代码" clearable>
                <template v-slot:prefix><i class="ri-search-line"></i></template>
              </el-input>
              <el-date-picker v-model="monthFilter" type="month" value-format="YYYY-MM" format="YYYY年MM月" size="small" style="width:150px" placeholder="计提年月" clearable :teleported="false"></el-date-picker>
              <el-select v-model="categoryFilter" size="small" style="width:130px" placeholder="品类" clearable :teleported="false">
                <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
              </el-select>
              <el-select v-model="statusFilter" size="small" style="width:150px" placeholder="同步状态" clearable :teleported="false">
                <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
              </el-select>
              <el-button size="small" @click="resetFilters"><i class="ri-refresh-line"></i><span>重置</span></el-button>
            </div>
            <div class="table-toolbar flow-action-bar" data-tour="rebate-accrual-actions">
              <div class="toolbar-left">
                <el-button type="primary" size="small" @click="handleCreate"><i class="ri-add-line"></i><span>新增计提单</span></el-button>
              </div>
              <div class="toolbar-right rebate-context-hint"><i class="ri-information-line"></i><span>保存只更新编辑稿；提交SAP时才生成正式版本号</span></div>
            </div>
          </div>
        </section>

        <section class="panel table-panel flow-panel-shell">
          <div class="panel-body">
            <div class="flow-grid-table-wrap">
              <el-table class="flow-grid-table" :data="pagedRows" row-key="id" height="100%" stripe border table-layout="auto" style="width:100%" :row-class-name="tableRowClassName" @selection-change="handleSelection" @row-click="selectRow" data-tour="rebate-accrual-table">
                <el-table-column type="selection" width="42" fixed="left"></el-table-column>
                <el-table-column prop="id" label="计提单号" width="126" fixed="left"><template v-slot:default="scope"><el-button link type="primary" size="small" @click.stop="navigateToDetail(scope.row)">{{ scope.row.id }}</el-button></template></el-table-column>
                <el-table-column prop="accrualMonth" label="计提年月" width="104"></el-table-column>
                <el-table-column prop="companyCode" label="公司代码" width="96"></el-table-column>
                <el-table-column prop="supplier" label="供应商" min-width="210" show-overflow-tooltip></el-table-column>
                <el-table-column prop="category" label="品类" width="82"></el-table-column>
                <el-table-column prop="originalAmount" label="原金额" width="132" align="right">
                  <template v-slot:default="scope">{{ formatMoney(scope.row.originalAmount) }}</template>
                </el-table-column>

                <el-table-column prop="discountAmount" label="折让计提金额" width="132" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.discountAmount) }}</template></el-table-column>
                <el-table-column prop="afterAmount" label="折后金额" width="132" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.afterAmount) }}</template></el-table-column>
                <el-table-column prop="syncStatusLabel" label="同步状态" width="126">
                  <template v-slot:default="scope">
                    <div class="rebate-status-cell">
                      <el-tag size="small" :type="tagType(scope.row.syncStatus)">{{ scope.row.syncStatusLabel }}</el-tag>
                      <small v-if="scope.row.syncStatus === 'pending-resubmit'">编辑稿待提交</small>
                      <small v-if="scope.row.syncStatus === 'sync-failed'">SAP生效版本未变化</small>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="sapVersion" label="SAP生效版本" width="116"><template v-slot:default="scope">SAP {{ scope.row.sapVersion }}</template></el-table-column>
                <el-table-column prop="lastModifiedTime" label="更新时间" width="150"></el-table-column>
                <el-table-column label="操作" width="150" fixed="right" align="center" header-align="center">
                  <template v-slot:default="scope"><div class="table-actions"><el-button link type="primary" size="small" @click.stop="openVersion(scope.row)">查看详情</el-button><el-button link type="primary" size="small" @click.stop="openEdit(scope.row)">编辑稿</el-button></div></template>
                </el-table-column>
              </el-table>
            </div>
            <div class="table-footer">
              <div style="font-size:12px;color:var(--el-text-color-secondary)">共 {{ filteredRows.length }} 张计提单，已选 {{ selectedRows.length }} 张</div>
              <el-pagination small background layout="sizes, prev, pager, next" :current-page="page" :page-size="pageSize" :page-sizes="pageSizes" :total="filteredRows.length" @update:current-page="handlePageChange" @update:page-size="handlePageSizeChange"></el-pagination>
            </div>
          </div>
        </section>

        <el-drawer v-if="false" v-model="drawerOpen" :title="drawerTitle" size="75%" direction="rtl" class="flow-progress-drawer rebate-version-drawer" data-tour="rebate-version-drawer">
          <div v-if="formModel" class="rebate-version-shell">
            <div class="rebate-version-head" data-tour="rebate-version-header">
              <div>
                <div class="rebate-version-title">
                  <span>{{ formModel.id }}</span>
                  <el-tag size="small" :type="tagType(formModel.status)">{{ drawerStatusText }}</el-tag>
                  <span v-if="hasUnsavedChanges" class="rebate-change-mark"><i class="ri-edit-circle-line"></i>有未保存修改</span>
                </div>
                <div class="rebate-version-meta">
                  <span>编辑稿：<strong>{{ formModel.hasDraft ? ('基于' + formModel.draftBaseVersion) : '无' }}</strong></span>
                  <span>SAP生效版本：<strong>{{ formModel.sapVersion }}</strong></span>
                  <span>最近同步：{{ formModel.lastSyncTime }} · {{ formModel.lastSyncUser }}</span>
                </div>
              </div>
              <div class="rebate-version-tools">
                <el-radio-group v-model="activeVersionView" size="small" class="rebate-version-switch" data-tour="rebate-version-switch">
                  <el-radio-button value="draft" :disabled="!formModel.hasDraft">当前编辑稿</el-radio-button>
                  <el-radio-button value="sap">SAP生效版本 {{ formModel.sapVersion }}</el-radio-button>
                </el-radio-group>
                <el-button size="small" plain type="primary" @click="openHistory"><i class="ri-history-line"></i><span>版本记录（{{ activeHistoryCount }}）</span></el-button>
              </div>
            </div>

            <div class="rebate-version-banner" :class="{ 'is-synced': !hasPendingSync && !hasUnsavedChanges }">
              <div class="rebate-version-banner-main">
                <i :class="(!hasPendingSync && !hasUnsavedChanges) ? 'ri-checkbox-circle-line' : 'ri-alert-line'"></i>
                <div>
                  <strong v-if="hasPendingSync || hasUnsavedChanges">当前存在编辑稿，SAP仍以 {{ formModel.sapVersion }} 为生效版本。</strong>
                  <strong v-else>当前没有编辑稿，SAP生效版本为 {{ formModel.sapVersion }}。</strong>
                  <span v-if="hasPendingSync || hasUnsavedChanges">保存编辑稿不会生成版本号；点击“提交SAP”时才生成下一正式版本 {{ nextSubmitVersion }}，同步成功后才替换SAP生效版本。</span>
                  <span v-else>只有继续修改后才会创建编辑稿；正式版本号只在提交SAP时产生。</span>
                </div>
              </div>
            </div>

            <div class="rebate-drawer-panel">
              <div class="rebate-panel-title"><span>计提单信息</span><span class="rebate-panel-subtitle">{{ isSapView ? ('SAP生效版本 ' + formModel.sapVersion + '，只读') : draftLabel }}</span></div>
              <el-descriptions :column="4" size="small" border>
                <el-descriptions-item label="公司代码">{{ formModel.companyCode }}</el-descriptions-item>
                <el-descriptions-item label="供应商">{{ formModel.supplier }}</el-descriptions-item>
                <el-descriptions-item label="计提年月">{{ formModel.accrualMonth }}</el-descriptions-item>
                <el-descriptions-item label="品类">{{ formModel.category }}</el-descriptions-item>
                <el-descriptions-item label="币种">{{ formModel.currency }}</el-descriptions-item>
                <el-descriptions-item label="最近修改">{{ formModel.lastModifiedTime }}</el-descriptions-item>
                <el-descriptions-item label="编辑稿">{{ formModel.hasDraft ? ('基于' + formModel.draftBaseVersion) : '无' }}</el-descriptions-item>
                <el-descriptions-item label="SAP生效版本">{{ formModel.sapVersion }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="rebate-drawer-panel">
              <div class="rebate-panel-title"><span>折让计算</span><span class="rebate-panel-subtitle">面积 × 折让后M²不含税单价 = 折后金额；原金额 − 折后金额 = 折让计提金额</span></div>
              <div class="rebate-rate-form"><el-form-item label="原金额"><el-input :model-value="formatMoney(formModel.originalAmount)" disabled><template v-slot:append>{{ formModel.currency }}</template></el-input></el-form-item><el-form-item label="计算口径"><el-input model-value="按收货明细行维护折让后M²不含税单价后逐行计算" disabled></el-input></el-form-item></div>
              <div class="rebate-summary-grid">
                <div class="rebate-summary-item"><div class="rebate-summary-label">原金额</div><div class="rebate-summary-value">{{ formatMoney(formModel.originalAmount) }}</div></div>
                <div class="rebate-summary-item" :class="{ 'is-changed': unitPriceChanged && !isSapView }"><div class="rebate-summary-label">折让计提金额 <span v-if="unitPriceChanged && !isSapView" class="rebate-change-mark">较SAP {{ signed(currentDiscountAmount - sapDiscountAmount, '') }}</span></div><div class="rebate-summary-value">{{ formatMoney(isSapView ? sapDiscountAmount : currentDiscountAmount) }}</div></div>
                <div class="rebate-summary-item" :class="{ 'is-changed': unitPriceChanged && !isSapView }"><div class="rebate-summary-label">折后金额 <span v-if="unitPriceChanged && !isSapView" class="rebate-change-mark">较SAP {{ signed(currentAfterAmount - sapAfterAmount, '') }}</span></div><div class="rebate-summary-value">{{ formatMoney(isSapView ? sapAfterAmount : currentAfterAmount) }}</div></div>
                <div class="rebate-summary-item"><div class="rebate-summary-label">修改字段</div><div class="rebate-summary-value">{{ isSapView ? 0 : headDiffRows.length }} 项</div></div>
                <div class="rebate-summary-item"><div class="rebate-summary-label">变更收货记录</div><div class="rebate-summary-value">{{ isSapView ? 0 : changedLineRows.length }} 行</div></div>
              </div>
            </div>

            <div class="rebate-drawer-panel" data-tour="rebate-receipt-lines">
              <div class="rebate-panel-title">
                <span>收货记录</span>
                <div class="rebate-table-caption"><el-tag size="small" effect="plain">{{ drawerLines.length }} 行</el-tag><span>{{ isSapView ? '展示SAP快照金额' : '折后单价变更后实时重算' }}</span></div>
              </div>
              <el-table class="rebate-drawer-table" :data="drawerLines" size="small" stripe border max-height="260" style="width:100%">
                <el-table-column prop="materialDoc" label="物料凭证" width="112"></el-table-column>
                <el-table-column prop="item" label="行项目" width="76"></el-table-column>
                <el-table-column prop="receiptDate" label="入库日期" width="108"></el-table-column>
                <el-table-column prop="purchaseOrder" label="采购订单" width="112"></el-table-column>
                <el-table-column prop="materialName" label="物料" min-width="170" show-overflow-tooltip></el-table-column>
                <el-table-column prop="quantity" label="数量" width="100" align="right"><template v-slot:default="scope">{{ Number(scope.row.quantity).toLocaleString('zh-CN') }}</template></el-table-column>
                <el-table-column prop="area" label="面积(m²)" width="108" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.area) }}</template></el-table-column>
                <el-table-column prop="m2UntaxedPrice" label="原M²不含税单价" width="130" align="right"><template v-slot:default="scope">{{ formatUnitPrice(scope.row.m2UntaxedPrice) }}</template></el-table-column>
                <el-table-column prop="discountUnitPrice" label="折让后M²不含税单价" width="150" align="right"><template v-slot:default="scope">{{ formatUnitPrice(isSapView ? (scope.row.sapDiscountUnitPrice ?? scope.row.discountUnitPrice) : scope.row.discountUnitPrice) }}</template></el-table-column>
                <el-table-column prop="amount" label="原金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.amount) }}</template></el-table-column>
                <el-table-column label="折让金额" width="124" align="right"><template v-slot:default="scope"><span :class="{ 'rebate-pending-version': !isSapView && scope.row.changeType === '修改' }">{{ formatMoney(isSapView ? scope.row.sapDiscountAmount : scope.row.discountAmount) }}</span></template></el-table-column>
                <el-table-column label="折后金额" width="124" align="right"><template v-slot:default="scope">{{ formatMoney(isSapView ? scope.row.sapAfterAmount : scope.row.afterAmount) }}</template></el-table-column>
                <el-table-column v-if="!isSapView" prop="changeType" label="变化" width="80"><template v-slot:default="scope"><el-tag size="small" :type="scope.row.changeType === '修改' ? 'warning' : 'info'" effect="plain">{{ scope.row.changeType }}</el-tag></template></el-table-column>
              </el-table>
            </div>

            <div class="rebate-downstream-warning"><i class="ri-forbid-2-line"></i><span>存在编辑稿或同步失败记录时不可创建结算单。编辑稿提交成功、SAP生效版本推进并清空编辑稿后，才能进入后续结算。</span></div>
          </div>
          <template v-slot:footer>
            <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;" data-tour="rebate-version-actions">
              <el-button v-if="!isSapView" size="small" type="primary" :loading="submitting" @click="submitToSap">提交并生成 {{ nextSubmitVersion }}</el-button>
              <el-button v-if="!isSapView" size="small" @click="saveCurrent">保存编辑稿</el-button>
              <el-button v-if="!isSapView" size="small" type="warning" plain @click="revertUnsynced">放弃编辑稿</el-button>
              <el-button size="small" @click="drawerOpen = false">关闭</el-button>
            </div>
          </template>
        </el-drawer>

        <el-dialog v-if="false" v-model="historyDialogOpen" :title="'版本记录 · ' + (formModel ? formModel.id : '')" width="82%" append-to-body data-tour="rebate-version-history">
          <div v-if="formModel">
            <div class="rebate-history-rule"><i class="ri-information-line"></i><span>正式版本只在提交SAP时产生。当前编辑稿基于 {{ formModel.draftBaseVersion }}，多次保存不会升版；下一次提交成功后才生成并生效 {{ nextSubmitVersion }}。</span></div>
            <el-table :data="formModel.versionHistory" size="small" stripe border max-height="340" style="width:100%">
              <el-table-column prop="version" label="版本" width="86"></el-table-column>
              <el-table-column prop="statusLabel" label="状态" width="112">
                <template v-slot:default="scope"><el-tag size="small" :type="historyTagType(scope.row.status)">{{ scope.row.statusLabel }}</el-tag></template>
              </el-table-column>

              <el-table-column prop="submitter" label="提交人" width="100"></el-table-column>
              <el-table-column prop="submitTime" label="提交时间" width="152"></el-table-column>
              <el-table-column prop="sapResult" label="SAP结果" min-width="230" show-overflow-tooltip></el-table-column>
              <el-table-column label="操作" width="190" fixed="right" align="center" header-align="center">
                <template v-slot:default="scope"><div class="table-actions"><el-button link type="primary" size="small" @click="viewHistory(scope.row)">查看</el-button></div></template>
              </el-table-column>
            </el-table>
            <div v-if="selectedHistory" class="rebate-history-summary">
              <div class="rebate-history-summary-title"><span>{{ selectedHistory.version }} 快照</span><el-tag size="small" :type="historyTagType(selectedHistory.status)">{{ selectedHistory.statusLabel }}</el-tag></div>
              <el-descriptions :column="4" size="small" border>

                <el-descriptions-item label="编辑稿单价">{{ formatUnitPrice(formModel.discountUnitPrice) }}</el-descriptions-item>
                <el-descriptions-item label="单价变化"><span :class="deltaClass(Number(formModel.discountUnitPrice || 0) - Number(selectedHistory.unitPrice || 0))">{{ signed(Number(formModel.discountUnitPrice || 0) - Number(selectedHistory.unitPrice || 0), '') }}</span></el-descriptions-item>
                <el-descriptions-item label="提交时间">{{ selectedHistory.submitTime }}</el-descriptions-item>
                <el-descriptions-item label="SAP结果" :span="4">{{ selectedHistory.sapResult }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
          <template v-slot:footer><el-button type="primary" @click="historyDialogOpen = false">关闭</el-button></template>
        </el-dialog>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/accruals',
    name: '计提单管理',
    menuKey: 'rebateAccruals',
    component: componentName,
    breadcrumbs: ['折让管理', '计提单管理'],
    templateId: 'query-table-list-page',
    archetype: '查询表格列表页',
    tabInfo: '帮助采购结算专员筛选计提单并进入独立详情页完成编辑稿、SAP生效版本与历史快照处理。',
    guideSteps: [
      { target: '[data-tour="rebate-accrual-filter"]', title: '定位目标计提单', description: '按单号、供应商、计提年月、品类和同步状态筛出需要核对的计提单。' },
      { target: '[data-tour="rebate-accrual-actions"]', title: '新建计提单', description: '进入独立新增页，按计提年月、公司代码、供应商与玻璃品类获取收货记录，再填写折让后M²不含税单价完成计提。' },
      { target: '[data-tour="rebate-accrual-table"]', title: '查看同步状态', description: '同步状态反映采购云提交SAP的结果；失败原因在详情页保留，正式版本不被覆盖。' },
      { target: '[data-tour="rebate-accrual-table"] .table-actions', title: '进入独立详情页', description: '点击整行、计提单号、查看详情或编辑稿，都会进入完整详情页，不再从右侧弹出详情栏。' }
    ],
    noteSections: [
      {
        title: '业务目标',
        content: '本页帮助采购结算专员筛选玻璃品类计提单，并从列表进入独立详情页查看无版本号的编辑稿、SAP生效版本与历史正式版本。',
        items: ['单号按“A＋6位日期＋3位流水号”自动生成，例如 A260916001。', '列表只承担检索和入口职责，完整表单、收货明细、版本记录与提交动作在独立详情页完成。']
      },
      {
        title: '版本流转',
        content: '主演例当前为SAP V5生效；采购云编辑稿基于V5，多次保存仍不产生版本号，提交时才生成V6。成功后V6生效，失败则保留V5并记录失败的V6。',
        diagram: {
          type: 'flow',
          caption: '计提单从SAP V5进入编辑稿，提交后生成V6的版本链路。',
          nodes: [
            { id: 'sap-v5', title: 'SAP V5生效', meta: '当前正式版本', tone: 'success' },
            { id: 'draft-v5', title: '编辑稿', meta: '基于V5，可多次保存', tone: 'info' },
            { id: 'submit-v6', title: '提交生成V6', meta: '提交时才分配版本号', tone: 'warning' },
            { id: 'sap-v6', title: 'SAP V6生效', meta: '成功后清空编辑稿', tone: 'success' },
            { id: 'failed-v6', title: 'V6同步失败', meta: 'SAP仍保留V5', tone: 'danger' }
          ],
          edges: [
            { from: 'sap-v5', to: 'draft-v5', label: '修改' },
            { from: 'draft-v5', to: 'submit-v6', label: '提交' },
            { from: 'submit-v6', to: 'sap-v6', label: '成功' },
            { from: 'submit-v6', to: 'failed-v6', label: '失败' }
          ]
        },
        items: ['保存仅更新时间和编辑稿内容，不生成正式版本号，也不更新SAP。', '提交失败只更新同步状态并保留当前编辑稿，不生成新正式版本；修改后可再次提交。']
      },
      {
        title: '上下游关系',
        content: '计提单按计提年月、公司代码、供应商与玻璃品类获取收货记录，按面积×折让后M²不含税单价逐行计算折后金额，再以原金额减折后金额得到折让金额；同步一致后才可作为结算单的数据基础。',
        diagram: {
          type: 'relation',
          caption: '收货记录进入计提单，计提单与SAP一致后再进入结算。',
          center: { title: '计提单版本管理', meta: '计算、核对、同步', tone: 'primary' },
          upstream: [
            { title: '收货记录', meta: '按年月＋公司＋供应商＋玻璃获取', tone: 'info' },
            { title: '折让后M²不含税单价', meta: '采购结算专员录入', tone: 'warning' }
          ],
          downstream: [
            { title: 'SAP计提数据', meta: '接收最新成功版本', tone: 'success' },
            { title: '结算单', meta: '仅引用已同步计提单', tone: 'success' }
          ]
        },
        items: ['每行先按面积×折让后M²不含税单价计算折后金额，再按原金额减折后金额计算折让金额，金额统一四舍五入保留4位。', '存在编辑稿或同步失败时不可创建结算单，避免采购云使用草稿而SAP仍按旧生效版本处理。']
      },
      {
        title: '关键规则',
        items: ['同步状态统一采用草稿、已同步、待重新提交、同步失败。', 'SAP生效版本始终只读；编辑稿允许调整折让后M²不含税单价、保存并获取收货记录，保存不升版，提交成功才生成正式版本。', '每次成功提交才进入版本记录；同步失败不会生成新正式版本，当前编辑稿继续保留。']
      }
    ]
  });
})(window);
