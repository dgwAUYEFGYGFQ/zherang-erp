(function (window) {
  const componentName = 'RebateAccrualDetailPage';
  const STYLE_ID = 'rebate-accrual-detail-style';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function versionNumber(version) {
    const match = /V(\d+)/i.exec(version || '');
    return match ? Number(match[1]) : 0;
  }

  function formatDateTime() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
      + ' ' + [pad(now.getHours()), pad(now.getMinutes())].join(':');
  }

  function createHistory(record) {
    if (record.id === 'A260916001') {
      return [
        { version: 'V5', status: 'active', statusLabel: 'SAP生效', rate: 8, submitter: '陈静怡', submitTime: '2026-09-16 10:30', sapResult: '同步成功，当前生效' },
        { version: 'V4', status: 'replaced', statusLabel: '已被替代', rate: 7.5, submitter: '张伟', submitTime: '2026-09-12 16:20', sapResult: '同步成功' },
        { version: 'V2', status: 'replaced', statusLabel: '已被替代', rate: 6, submitter: '李明', submitTime: '2026-09-05 11:10', sapResult: '同步成功' },
        { version: 'V1', status: 'replaced', statusLabel: '已被替代', rate: 5, submitter: '李明', submitTime: '2026-09-01 09:25', sapResult: '首次同步成功' }
      ];
    }
    const version = record.sapVersion || 'V1';
    return [{ version, status: 'active', statusLabel: 'SAP生效', rate: Number(record.sapDiscountRate || record.discountRate || 0), submitter: record.lastSyncUser || '陈静怡', submitTime: record.lastSyncTime || '2026-09-16 10:30', sapResult: '同步成功，当前生效' }];
  }

  function normalizeRecord(source) {
    const record = deepClone(source || {});
    const syncStatusMap = {
      'pending-first': 'draft',
      synced: 'synced',
      'pending-resubmit': 'pending-resubmit',
      'resubmit-failed': 'sync-failed',
      'sap-locked': 'pending-resubmit'
    };
    record.syncStatus = syncStatusMap[record.status] || 'draft';
    record.syncStatusLabel = { draft: '草稿', synced: '已同步', 'pending-resubmit': '待重新提交', 'sync-failed': '同步失败' }[record.syncStatus];
    record.currency = record.currency || 'CNY';
    record.createdDate = record.createdDate || '2026-09-16';
    record.savedDate = record.savedDate || (record.lastModifiedTime || '2026-09-16 11:26').slice(0, 10);
    if (record.id === 'A260916001') {
      record.accrualMonth = '2026-09';
      record.sapVersion = 'V5';
      record.draftBaseVersion = 'V5';
      record.hasDraft = true;
      record.status = 'pending-resubmit';
      record.statusLabel = '待重新提交';
      record.discountRate = 10;
      record.sapDiscountRate = 8;
      record.lastModifiedTime = '2026-09-16 11:26';
      record.lastModifiedUser = '陈静怡';
    } else {
      record.draftBaseVersion = record.sapVersion || 'V1';
      record.hasDraft = record.syncStatus !== 'synced'
        || (record.currentVersion && record.currentVersion !== record.sapVersion)
        || Math.abs(Number(record.discountRate || 0) - Number(record.sapDiscountRate || record.discountRate || 0)) > 0.0001;
    }
    record.remark = record.remark || (record.id === 'A260916001' ? '2026年9月玻璃采购折让计提，按收货记录逐行计算。' : '玻璃采购折让计提，按收货记录逐行计算。');
    record.sapRemark = record.sapRemark || '依据月度玻璃采购协议执行折让计提。';
    return record;
  }

  function normalizeReceiptLines(lines, isSeptemberExample) {
    return (lines || []).map((source, index) => {
      const line = deepClone(source);
      if (isSeptemberExample) line.receiptDate = ['2026-09-05', '2026-09-14', '2026-09-26'][index] || line.receiptDate;
      line.area = Number(line.area != null ? line.area : line.quantity || 0);
      line.m2UntaxedUnitPrice = Number(line.m2UntaxedUnitPrice != null ? line.m2UntaxedUnitPrice : line.unitPrice || 0);
      return line;
    });
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .opened-page-panel > .rebate-detail-layout { height: 100%; min-height: 0; overflow-y: auto; padding-right: 2px; }
      .rebate-detail-layout { gap: 12px; }
      .rebate-detail-layout > .panel { flex: 0 0 auto; }
      .rebate-detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 54px; padding: 10px 16px; background: var(--el-bg-color); }
      .rebate-detail-toolbar-left, .rebate-detail-toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .rebate-detail-title { font-size: 16px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-detail-main { padding: 0; overflow: hidden; }
      .rebate-detail-main-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--el-border-color-lighter); background: var(--el-fill-color-extra-light); }
      .rebate-detail-heading { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-detail-heading::before, .rebate-detail-section-title::before { content: ''; width: 3px; height: 16px; border-radius: 2px; background: var(--el-color-primary); }
      .rebate-detail-view-tools { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
      .rebate-detail-rule { display: flex; gap: 8px; align-items: flex-start; margin: 12px 16px 0; padding: 9px 11px; border-left: 3px solid var(--el-color-warning); background: var(--el-color-warning-light-9); color: var(--el-text-color-regular); font-size: 12px; line-height: 1.55; }
      .rebate-detail-form-wrap { padding: 14px 16px 6px; }
      .rebate-detail-section-title { display: flex; align-items: center; gap: 8px; margin: 2px 0 12px; font-size: 14px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-detail-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 18px; }
      .rebate-detail-form-grid .el-form-item { margin-bottom: 12px; }
      .rebate-detail-form-grid .el-form-item__label { height: 24px; padding: 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 20px; }
      .rebate-detail-span-2 { grid-column: span 2; }
      .rebate-detail-span-3 { grid-column: span 3; }
      .rebate-detail-layout .el-input.is-disabled .el-input__wrapper, .rebate-detail-layout .el-textarea.is-disabled .el-textarea__inner { background: #f5f7fa; box-shadow: 0 0 0 1px #e4e7ed inset; color: var(--el-text-color-regular); }
      .rebate-detail-layout .el-input.is-disabled .el-input__inner, .rebate-detail-layout .el-textarea.is-disabled .el-textarea__inner { -webkit-text-fill-color: var(--el-text-color-regular); }
      .rebate-editable-field .el-input-number { box-shadow: 0 0 0 1px var(--el-color-primary-light-5) inset; border-radius: var(--el-border-radius-base); background: var(--el-color-primary-light-9); }
      .rebate-detail-tabs-panel { padding: 0 16px 14px; }
      .rebate-detail-tabs-panel .el-tabs__header { margin: 0 0 12px; }
      .rebate-detail-tabs-panel .el-tabs__content { overflow: visible; }
      .rebate-detail-table-note { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
      .rebate-detail-table .cell { font-size: 12px; }
      .rebate-history-view-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 16px 12px; padding: 9px 12px; border: 1px solid var(--el-color-primary-light-7); background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); font-size: 12px; }
      .rebate-positive { color: var(--el-color-danger); font-weight: 600; }
      .rebate-negative { color: var(--el-color-success); font-weight: 600; }
      @media (max-width: 1180px) {
        .rebate-detail-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .rebate-detail-span-3 { grid-column: span 2; }
        .rebate-detail-toolbar { align-items: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      const pageData = ChintPrototypeShell.getMockData('rebateAccruals', {});
      let selectedId = 'A260916001';
      try {
        selectedId = window.sessionStorage.getItem('rebateSelectedAccrualId') || selectedId;
      } catch (error) {}
      const source = (pageData.rows || []).find((row) => row.id === selectedId)
        || (pageData.rows || []).find((row) => row.id === 'A260916001')
        || (pageData.rows || [])[0]
        || {};
      const record = normalizeRecord(source);
      const history = createHistory(record);
      const receiptLines = normalizeReceiptLines(pageData.receiptLines || [], record.id === 'A260916001');
      return {
        record,
        receiptSource: deepClone(receiptLines),
        sapReceiptSource: deepClone(receiptLines),
        history,
        activeView: record.hasDraft ? 'draft' : 'sap',
        selectedHistory: null,
        activeTab: 'receipts',
        draftRate: Number(record.discountRate || 0),
        savedDraftRate: Number(record.discountRate || 0),
        draftRemark: record.remark,
        savedDraftRemark: record.remark,
        sapRate: Number(record.sapDiscountRate || record.discountRate || 0),
        sapRemark: record.sapRemark,
        sapVersion: record.sapVersion || 'V1',
        submitting: false,
        lastReceiptFetchTime: '2026-09-16 11:20',
        receiptRefreshAdded: false,
        savedReceiptCount: receiptLines.length
      };
    },
    computed: {
      isDraftView() {
        return this.activeView === 'draft';
      },
      isSapView() {
        return this.activeView === 'sap';
      },
      isHistoryView() {
        return this.activeView === 'history';
      },
      activeRate() {
        if (this.isHistoryView && this.selectedHistory) return Number(this.selectedHistory.rate || 0);
        return this.isSapView ? this.sapRate : this.draftRate;
      },
      activeRemark() {
        if (this.isHistoryView && this.selectedHistory) return '历史版本' + this.selectedHistory.version + '提交快照；' + this.selectedHistory.sapResult;
        return this.isSapView ? this.sapRemark : this.draftRemark;
      },
      viewTitle() {
        if (this.isHistoryView && this.selectedHistory) return '历史版本 ' + this.selectedHistory.version + '（只读）';
        if (this.isSapView) return 'SAP生效版本 ' + this.sapVersion;
        return '当前编辑稿（基于' + this.record.draftBaseVersion + '）';
      },
      viewStatus() {
        if (this.isHistoryView && this.selectedHistory) return this.selectedHistory.statusLabel;
        if (this.isSapView) return 'SAP生效';
        return this.record.syncStatusLabel || '待重新提交';
      },
      activeDiscountAmount() {
        return roundMoney(this.activeOriginalAmount * this.activeRate / 100);
      },
      activeAfterAmount() {
        return roundMoney(this.activeOriginalAmount - this.activeDiscountAmount);
      },
      draftOriginalAmount() {
        return roundMoney(this.receiptSource.reduce((sum, item) => sum + Number(item.amount || 0), 0));
      },
      sapOriginalAmount() {
        return roundMoney(this.sapReceiptSource.reduce((sum, item) => sum + Number(item.amount || 0), 0));
      },
      activeOriginalAmount() {
        return this.isDraftView ? this.draftOriginalAmount : this.sapOriginalAmount;
      },
      displayedLines() {
        const sources = this.isDraftView ? this.receiptSource : this.sapReceiptSource;
        return sources.map((source) => {
          const line = deepClone(source);
          line.discountAmount = roundMoney(Number(line.amount || 0) * this.activeRate / 100);
          line.afterAmount = roundMoney(Number(line.amount || 0) - line.discountAmount);
          return line;
        });
      },
      historyRows() {
        return this.history.map((item) => {
          const row = deepClone(item);
          row.discountAmount = roundMoney(this.sapOriginalAmount * Number(row.rate || 0) / 100);
          row.afterAmount = roundMoney(this.sapOriginalAmount - row.discountAmount);
          return row;
        });
      },
      nextSubmitVersion() {
        const latestFailed = this.history.find((item) => item.status === 'failed');
        const canRetryFailed = latestFailed
          && Math.abs(Number(latestFailed.rate || 0) - this.draftRate) < 0.0001
          && latestFailed.remark === this.draftRemark
          && Number(latestFailed.receiptCount || 0) === this.receiptSource.length;
        if (canRetryFailed) return latestFailed.version;
        const max = this.history.reduce((result, item) => Math.max(result, versionNumber(item.version)), versionNumber(this.sapVersion));
        return 'V' + (max + 1);
      },
      hasUnsavedChanges() {
        return Math.abs(this.draftRate - this.savedDraftRate) > 0.0001
          || this.draftRemark !== this.savedDraftRemark
          || this.receiptSource.length !== this.savedReceiptCount;
      }
    },
    mounted() {
      ensureStyles();
    },
    methods: {
      goBack() {
        this.$emit('navigate', '#/rebate/accruals');
      },
      switchView(value) {
        if (value === 'draft' && !this.record.hasDraft) {
          ElementPlus.ElMessage.info('当前没有编辑稿');
          return;
        }
        this.activeView = value;
        this.selectedHistory = null;
      },
      returnFromHistory() {
        const hasDraft = this.record.syncStatus !== 'synced'
          || (this.record.currentVersion && this.record.currentVersion !== this.sapVersion)
          || Math.abs(Number(this.draftRate) - Number(this.sapRate)) > 0.0001
          || this.hasUnsavedChanges;
        this.activeView = hasDraft ? 'draft' : 'sap';
        this.selectedHistory = null;
        this.activeTab = 'receipts';
      },
      viewSnapshot(row) {
        this.selectedHistory = deepClone(row);
        this.activeView = 'history';
        this.activeTab = 'receipts';
        ElementPlus.ElMessage.success('已切换为' + row.version + '完整快照，只读查看');
      },
      saveDraft() {
        if (!this.isDraftView) {
          ElementPlus.ElMessage.warning('SAP生效版本和历史版本均为只读，请返回编辑稿后再保存');
          return;
        }
        if (!this.hasUnsavedChanges) {
          ElementPlus.ElMessage.info('当前编辑稿没有新的修改');
          return;
        }
        const now = formatDateTime();
        this.savedDraftRate = this.draftRate;
        this.savedDraftRemark = this.draftRemark;
        this.savedReceiptCount = this.receiptSource.length;
        this.record.lastModifiedTime = now;
        this.record.lastModifiedUser = '陈静怡';
        this.record.savedDate = now.slice(0, 10);
        this.record.syncStatus = this.sapVersion ? 'pending-resubmit' : 'draft';
        this.record.syncStatusLabel = this.sapVersion ? '待重新提交' : '草稿';
        ElementPlus.ElMessage.success('编辑稿已保存，仍基于' + this.record.draftBaseVersion + '，未生成新的正式版本号');
      },
      submitToSap() {
        if (!this.isDraftView || !this.record.hasDraft) {
          ElementPlus.ElMessage.warning('请先返回当前编辑稿');
          return;
        }
        if (this.hasUnsavedChanges) {
          ElementPlus.ElMessage.warning('存在未保存修改，请先保存编辑稿');
          return;
        }
        if (Math.abs(this.draftRate - this.sapRate) < 0.0001 && this.draftRemark === this.sapRemark) {
          ElementPlus.ElMessage.info('编辑稿与SAP生效版本没有差异，无需提交');
          return;
        }
        const targetVersion = this.nextSubmitVersion;
        ElementPlus.ElMessageBox.confirm('本次提交将生成正式版本' + targetVersion + '。同步成功前，SAP仍以' + this.sapVersion + '为生效版本。确认继续？', '提交并生成' + targetVersion, {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.submitting = true;
          window.setTimeout(() => {
            const now = formatDateTime();
            if (this.record.id === 'A260914006') {
              const failureMessage = '同步失败：该计提数据已在SAP完成结算，不允许修改。';
              this.record.status = 'resubmit-failed';
              this.record.statusLabel = '同步失败';
              this.record.syncStatus = 'sync-failed';
              this.record.syncStatusLabel = '同步失败';
              this.record.hasDraft = true;
              this.submitting = false;
              ElementPlus.ElMessage.error(failureMessage);
              return;
            }
            this.history.forEach((item) => {
              if (item.status === 'active') {
                item.status = 'replaced';
                item.statusLabel = '已被替代';
                item.sapResult = '同步成功';
              }
            });
            this.history.unshift({ version: targetVersion, status: 'active', statusLabel: 'SAP生效', rate: this.draftRate, submitter: '陈静怡', submitTime: now, sapResult: '同步成功，当前生效' });
            this.sapVersion = targetVersion;
            this.sapRate = this.draftRate;
            this.sapRemark = this.draftRemark;
            this.sapReceiptSource = deepClone(this.receiptSource);
            this.record.sapVersion = targetVersion;
            this.record.draftBaseVersion = targetVersion;
            this.record.hasDraft = true;
            this.record.status = 'synced';
            this.record.statusLabel = '已同步';
            this.record.syncStatus = 'synced';
            this.record.syncStatusLabel = '已同步';
            this.record.lastSyncTime = now;
            this.record.lastSyncUser = '陈静怡';
            this.activeView = 'draft';
            this.submitting = false;
            ElementPlus.ElMessage.success(targetVersion + '已同步成功并成为SAP生效版本，可继续维护新的编辑稿');
          }, 800);
        }).catch(() => {});
      },
      refreshReceipts() {
        if (!this.isDraftView) {
          ElementPlus.ElMessage.warning('仅当前编辑稿可以获取最新收货记录');
          return;
        }
        if (this.receiptRefreshAdded || this.receiptSource.some((item) => item.materialDoc === '5001892216')) {
          ElementPlus.ElMessage.info('当前年月与品类的最新收货记录已获取，无新增数据');
          return;
        }
        this.receiptSource.push({
          materialDoc: '5001892216',
          item: '0010',
          receiptDate: this.record.accrualMonth === '2026-09' ? '2026-09-29' : '2026-08-29',
          purchaseOrder: '4500871026',
          purchaseOrderItem: '00010',
          plant: '1101',
          material: 'PVG-20-HC2',
          materialName: '2.0mm双层镀膜高透光伏玻璃',
          quantity: 6840,
          area: 6840,
          unitPrice: 30.18,
          m2UntaxedUnitPrice: 30.18,
          amount: 206431.20
        });
        this.record.originalAmount = roundMoney(this.receiptSource.reduce((sum, item) => sum + Number(item.amount || 0), 0));
        this.receiptRefreshAdded = true;
        this.lastReceiptFetchTime = formatDateTime();
        this.record.lastModifiedTime = this.lastReceiptFetchTime;
        this.record.syncStatus = 'pending-resubmit';
        this.record.syncStatusLabel = '待重新提交';
        ElementPlus.ElMessage.success('已按计提年月＋公司代码＋供应商＋玻璃获取1条最新收货记录，金额已重新汇总');
      },
      historyTagType(status) {
        return { active: 'success', failed: 'danger', replaced: 'info' }[status] || 'info';
      },
      viewTagType() {
        if (this.isHistoryView && this.selectedHistory) return this.historyTagType(this.selectedHistory.status);
        return this.isSapView ? 'success' : 'warning';
      },
      formatMoney(value) {
        return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      formatRate(value) {
        return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + '%';
      },
      signed(value, suffix) {
        const number = Number(value || 0);
        const text = suffix === '%' ? Math.abs(number).toFixed(2).replace(/\.00$/, '') : this.formatMoney(Math.abs(number));
        return (number > 0 ? '+' : number < 0 ? '-' : '') + text + (suffix || '');
      },
    },
    template: `
      <div class="flow-progress-layout rebate-detail-layout">
        <section class="panel rebate-detail-toolbar" data-tour="rebate-detail-toolbar">
          <div class="rebate-detail-toolbar-left">
            <el-button link type="primary" size="small" @click="goBack"><i class="ri-arrow-left-line"></i><span>返回计提单管理</span></el-button>
            <span class="rebate-detail-title">计提单-详情</span>
          </div>
          <div class="rebate-detail-toolbar-actions">
            <el-button v-if="!isHistoryView" type="primary" size="small" :loading="submitting" :disabled="!isDraftView" @click="submitToSap">提交并生成 {{ nextSubmitVersion }}</el-button>
            <el-button v-if="!isHistoryView" size="small" :disabled="!isDraftView" @click="saveDraft">保存编辑稿</el-button>
            <el-button v-if="isHistoryView" size="small" type="primary" plain @click="returnFromHistory">返回</el-button>
            <el-button v-else size="small" @click="goBack">返回</el-button>
          </div>
        </section>

        <section class="panel rebate-detail-main" data-tour="rebate-detail-form">
          <div class="rebate-detail-main-head">
            <div class="rebate-detail-heading">【计提】折让计提单</div>
            <div class="rebate-detail-view-tools" data-tour="rebate-detail-view-switch">
              <el-radio-group v-if="!isHistoryView" :model-value="activeView" size="small" @change="switchView">
                <el-radio-button value="draft">当前编辑稿</el-radio-button>
                <el-radio-button value="sap">SAP生效 {{ sapVersion }}</el-radio-button>
              </el-radio-group>
              <el-tag v-if="isHistoryView && selectedHistory" :type="historyTagType(selectedHistory.status)">历史版本 {{ selectedHistory.version }} · {{ selectedHistory.statusLabel }}</el-tag>
            </div>
          </div>

          <div class="rebate-detail-rule">
            <i class="ri-information-line"></i>
            <span v-if="isDraftView">编辑稿基于 {{ record.draftBaseVersion }}，保存不会生成版本号；提交SAP成功后才生成 {{ nextSubmitVersion }}。</span>
            <span v-else-if="isSapView">当前展示SAP生效版本 {{ sapVersion }}，全部字段只读。</span>
            <span v-else>当前展示 {{ selectedHistory.version }} 提交时的完整快照；即使同步失败，也保留当次提交内容供追溯。</span>
          </div>

          <div v-if="isHistoryView" class="rebate-history-view-banner"><span><i class="ri-history-line"></i> 已进入 {{ selectedHistory.version }} 历史快照，头信息、汇总金额与收货明细均按 {{ formatRate(selectedHistory.rate) }} 重算。</span></div>

          <div class="rebate-detail-form-wrap">
            <div class="rebate-detail-section-title"><span>基本信息</span><el-tag size="small" :type="viewTagType()">{{ viewTitle }}</el-tag></div>
            <el-form label-position="top" size="small">
              <div class="rebate-detail-form-grid">
                <el-form-item label="计提单号"><el-input :model-value="record.id" disabled></el-input></el-form-item>
                <el-form-item label="同步状态"><el-input :model-value="viewStatus" disabled></el-input></el-form-item>
                <el-form-item label="品类"><el-input :model-value="record.category" disabled></el-input></el-form-item>
                <el-form-item label="公司代码"><el-input :model-value="record.companyCode" disabled></el-input></el-form-item>
                <el-form-item label="供应商"><el-input :model-value="record.supplier" disabled></el-input></el-form-item>
                <el-form-item label="计提年月"><el-input :model-value="record.accrualMonth" disabled></el-input></el-form-item>
                <el-form-item label="货币码"><el-input :model-value="record.currency" disabled></el-input></el-form-item>
                <el-form-item label="创建日期"><el-input :model-value="record.createdDate" disabled></el-input></el-form-item>
                <el-form-item label="保存日期"><el-input :model-value="record.savedDate" disabled></el-input></el-form-item>
                <el-form-item label="编辑稿基础版本"><el-input :model-value="record.hasDraft ? record.draftBaseVersion : '无编辑稿'" disabled></el-input></el-form-item>
                <el-form-item label="SAP生效版本"><el-input :model-value="sapVersion" disabled></el-input></el-form-item>
              </div>

              <div class="rebate-detail-section-title"><span>折让计算</span></div>
              <div class="rebate-detail-form-grid">
                <el-form-item label="原金额"><el-input :model-value="formatMoney(activeOriginalAmount)" disabled><template v-slot:append>{{ record.currency }}</template></el-input></el-form-item>
                <el-form-item label="折让比例" :class="{ 'rebate-editable-field': isDraftView }">
                  <el-input-number v-if="isDraftView" v-model="draftRate" :min="0" :max="100" :precision="2" :step="0.5" style="width:100%"></el-input-number>
                  <el-input v-else :model-value="formatRate(activeRate)" disabled></el-input>
                </el-form-item>
                <el-form-item label="折让计提金额"><el-input :model-value="formatMoney(activeDiscountAmount)" disabled><template v-slot:append>{{ record.currency }}</template></el-input></el-form-item>
                <el-form-item label="折后金额"><el-input :model-value="formatMoney(activeAfterAmount)" disabled><template v-slot:append>{{ record.currency }}</template></el-input></el-form-item>
                <el-form-item label="最近修改人 / 时间"><el-input :model-value="record.lastModifiedUser + ' / ' + record.lastModifiedTime" disabled></el-input></el-form-item>
                <el-form-item label="最近同步人 / 时间"><el-input :model-value="record.lastSyncUser + ' / ' + record.lastSyncTime" disabled></el-input></el-form-item>
                <el-form-item label="备注" class="rebate-detail-span-3">
                  <el-input v-if="isDraftView" v-model="draftRemark" type="textarea" :rows="2" maxlength="200" show-word-limit></el-input>
                  <el-input v-else :model-value="activeRemark" type="textarea" :rows="2" disabled></el-input>
                </el-form-item>
              </div>
            </el-form>
          </div>
        </section>

        <section class="panel rebate-detail-tabs-panel" data-tour="rebate-detail-tabs">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="收货明细" name="receipts">
              <div class="rebate-detail-table-note">
                <span>按计提年月＋公司代码＋供应商＋玻璃匹配；折让比例 {{ formatRate(activeRate) }} 逐行重算 · 最近获取：{{ lastReceiptFetchTime }}</span>
                <div style="display:flex;align-items:center;gap:10px;"><span>共 {{ displayedLines.length }} 条收货记录</span><el-button v-if="isDraftView" size="small" type="primary" plain @click="refreshReceipts"><i class="ri-refresh-line"></i><span>获取最新收货记录</span></el-button></div>
              </div>
              <el-table class="rebate-detail-table" :data="displayedLines" size="small" stripe border max-height="360" style="width:100%" data-tour="rebate-detail-receipts">
                <el-table-column prop="materialDoc" label="物料凭证" width="112" fixed="left"></el-table-column>
                <el-table-column prop="item" label="行项目" width="76"></el-table-column>
                <el-table-column prop="receiptDate" label="入库日期" width="106"></el-table-column>
                <el-table-column prop="purchaseOrder" label="采购订单" width="112"></el-table-column>
                <el-table-column prop="purchaseOrderItem" label="采购订单行" width="104"></el-table-column>
                <el-table-column prop="plant" label="工厂" width="76"></el-table-column>
                <el-table-column prop="material" label="物料编码" width="112"></el-table-column>
                <el-table-column prop="materialName" label="物料名称" min-width="170" show-overflow-tooltip></el-table-column>
                <el-table-column prop="quantity" label="数量" width="96" align="right"><template v-slot:default="scope">{{ Number(scope.row.quantity || 0).toLocaleString('zh-CN') }}</template></el-table-column>
                <el-table-column prop="area" label="面积" width="100" align="right"><template v-slot:default="scope">{{ Number(scope.row.area || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }}</template></el-table-column>
                <el-table-column prop="m2UntaxedUnitPrice" label="M2不含税单价" width="126" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.m2UntaxedUnitPrice) }}</template></el-table-column>
                <el-table-column prop="unitPrice" label="单价" width="94" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.unitPrice) }}</template></el-table-column>
                <el-table-column prop="amount" label="原金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.amount) }}</template></el-table-column>
                <el-table-column prop="discountAmount" label="折让金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.discountAmount) }}</template></el-table-column>
                <el-table-column prop="afterAmount" label="折后金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.afterAmount) }}</template></el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="版本记录" name="versions">
              <div class="rebate-detail-table-note"><span>版本记录仅展示SAP提交成功的正式版本；当前编辑稿不会提前生成版本号</span><span>当前SAP生效：{{ sapVersion }}</span></div>
              <el-table class="rebate-detail-table" :data="historyRows" size="small" stripe border max-height="360" style="width:100%" data-tour="rebate-detail-history">
                <el-table-column prop="version" label="版本" width="76"></el-table-column>
                <el-table-column prop="statusLabel" label="状态" width="106"><template v-slot:default="scope"><el-tag size="small" :type="historyTagType(scope.row.status)">{{ scope.row.statusLabel }}</el-tag></template></el-table-column>
                <el-table-column prop="rate" label="折让比例" width="100" align="right"><template v-slot:default="scope">{{ formatRate(scope.row.rate) }}</template></el-table-column>
                <el-table-column prop="discountAmount" label="折让金额" width="126" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.discountAmount) }}</template></el-table-column>
                <el-table-column prop="afterAmount" label="折后金额" width="126" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.afterAmount) }}</template></el-table-column>
                <el-table-column prop="submitter" label="提交人" width="92"></el-table-column>
                <el-table-column prop="submitTime" label="提交时间" width="148"></el-table-column>
                <el-table-column prop="sapResult" label="SAP结果" min-width="230" show-overflow-tooltip></el-table-column>
                <el-table-column label="操作" width="126" fixed="right" align="center" header-align="center"><template v-slot:default="scope"><el-button link type="primary" size="small" @click="viewSnapshot(scope.row)">查看完整快照</el-button></template></el-table-column>
              </el-table>
            </el-tab-pane>

          </el-tabs>
        </section>

      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/accrual-detail',
    name: '计提单详情',
    tabTitle: '计提单详情',
    menuKey: 'rebateAccrualDetail',
    component: componentName,
    breadcrumbs: ['折让管理', '计提单管理', '计提单详情'],
    templateId: 'query-table-list-page',
    archetype: '全页业务详情（沿用查询表格视觉基线）',
    tabInfo: '帮助采购结算专员在完整详情页维护计提编辑稿、核对SAP生效版本并追溯正式版本快照。',
    guideSteps: [
      { target: '[data-tour="rebate-detail-toolbar"]', title: '处理计提编辑稿', description: '顶部操作条集中完成保存编辑稿、提交生成正式版本和返回列表；历史快照查看时右上角“返回”按当前编辑稿状态定位。' },
      { target: '[data-tour="rebate-detail-view-switch"]', title: '切换当前业务视图', description: '在当前编辑稿与SAP生效版本之间切换；历史快照也会在同一详情页中只读呈现。' },
      { target: '[data-tour="rebate-detail-form"]', title: '核对头信息与折让金额', description: '三列字段区展示计提单头信息、版本身份、折让比例和按当前视图实时计算的金额。' },
      { target: '[data-tour="rebate-detail-tabs"]', title: '查看收货与版本记录', description: '通过收货明细和版本记录完成金额核对、最新收货刷新与历史快照追溯。' },
      { target: '[data-tour="rebate-detail-receipts"]', title: '刷新并核对收货计算', description: '编辑稿按计提年月、公司代码、供应商与玻璃品类获取最新收货记录，随后按当前比例逐行重算金额。' }
    ],
    noteSections: [
      {
        title: '业务目标',
        content: '本页帮助采购结算专员在独立详情页完成计提单编辑稿维护、SAP生效数据核对、收货明细计算和历史版本追溯。',
        items: ['主演业务例为 A260916001，计提年月为2026-09：当前编辑稿基于V5、折让比例10%，SAP V5生效比例8%。', '详情使用完整页面承载，不使用侧边详情栏，便于查看三列表单与横向收货明细。']
      },
      {
        title: '版本快照查看规则',
        content: '当前编辑稿可编辑折让比例和备注，SAP生效版本与V1至V5历史快照全部只读；选择历史版本后，同页头信息、金额和收货明细同步按该版本比例重算。',
        items: ['提交失败不会生成正式版本，只保留当前编辑稿和SAP返回原因供处理。', '历史快照查看结束后点击右上角“返回”，有编辑稿时回到当前编辑稿，没有编辑稿时回到最新SAP成功版本。']
      },
      {
        title: '状态流转',
        content: '编辑稿保存不产生版本号；提交SAP成功时才生成V6并成为生效版本；同步失败时不生成新正式版本，当前编辑稿继续保留。',
        diagram: {
          type: 'flow',
          caption: '计提单由SAP V5进入编辑稿，再在提交时生成V6。',
          nodes: [
            { id: 'v5', title: 'V5生效', meta: 'SAP当前正式版本', tone: 'success' },
            { id: 'draft', title: '编辑稿', meta: '基于V5，可多次保存', tone: 'info' },
            { id: 'submit', title: '生成V6', meta: '提交SAP时分配', tone: 'warning' },
            { id: 'v6', title: 'V6生效', meta: '成功后清空编辑稿', tone: 'success' },
            { id: 'failed', title: 'V6失败', meta: 'SAP仍保留V5', tone: 'danger' }
          ],
          edges: [
            { from: 'v5', to: 'draft', label: '修改' },
            { from: 'draft', to: 'submit', label: '提交' },
            { from: 'submit', to: 'v6', label: '成功' },
            { from: 'submit', to: 'failed', label: '失败' }
          ]
        }
      },
      {
        title: '上下游关系',
        content: '计提单按计提年月、公司代码、供应商与玻璃品类获取收货记录，完成折让计算并同步SAP；页面只展示采购云同步状态。',
        diagram: {
          type: 'relation',
          caption: '收货记录进入计提详情，经SAP同步后进入后续结算。',
          center: { title: '计提单详情', meta: '编辑、计算、对比、追溯', tone: 'primary' },
          upstream: [
            { title: '收货记录', meta: '按年月＋公司＋供应商＋玻璃获取', tone: 'info' },
            { title: '折让协议', meta: '提供折让比例依据', tone: 'warning' }
          ],
          downstream: [
            { title: 'SAP计提', meta: '接收成功正式版本', tone: 'success' },
            { title: '结算单', meta: '引用已生效计提数据', tone: 'success' }
          ]
        }
      },
      {
        title: '关键规则',
        items: ['保存编辑稿只更新时间和本地内容，不生成V6。', '编辑稿按计提年月、公司代码、供应商与玻璃品类获取最新收货记录；同一批新增记录不会被重复加入。', '提交失败时显示SAP返回的明确原因，正式版本保持不变，当前编辑稿继续保留。', '折让金额按每条收货记录原金额乘折让比例计算，折后金额等于原金额减折让金额；负数数量与金额按原值参与计算，不取绝对值。', 'SAP生效版本和历史版本全部只读，任何历史快照查看都不得改变当前编辑稿。']
      }
    ]
  });
})(window);
