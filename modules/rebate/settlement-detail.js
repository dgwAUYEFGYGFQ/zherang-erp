(function (window) {
  const componentName = 'RebateSettlementDetailPage';

  const baseLines = [
    { materialDoc: '5001948201', item: '0010', receiptDate: '2026-09-06', purchaseOrder: '4500891042', purchaseOrderItem: '00010', plant: '1101', material: 'PVG-20-HC', materialName: '2.0mm高透光伏玻璃', quantity: 12000, unitPrice: 28.65, area: 24000.00, m2UntaxedPrice: 14.3250, amount: 343800.00 },
    { materialDoc: '5001963358', item: '0020', receiptDate: '2026-09-17', purchaseOrder: '4500891042', purchaseOrderItem: '00020', plant: '1101', material: 'PVG-32-BF', materialName: '3.2mm背板玻璃', quantity: 8000, unitPrice: 31.42, area: 25600.00, m2UntaxedPrice: 9.8188, amount: 251360.00 },
    { materialDoc: '5001970064', item: '0010', receiptDate: '2026-09-25', purchaseOrder: '4500896608', purchaseOrderItem: '00010', plant: '1101', material: 'PVG-20-AR', materialName: '2.0mm镀膜光伏玻璃退货', quantity: -500, unitPrice: 29.41, area: -1000.00, m2UntaxedPrice: 14.7050, amount: -14705.00 }
  ];
  const documents = {
    S261105001: { id: 'S261105001', settlementMonth: '2026-11', accrualId: 'A260916001', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '嘉兴光伏玻璃制造有限公司', category: '玻璃', currency: 'CNY', discountUnitPrice: 22.0000, sapDiscountUnitPrice: 22.0000, currentVersion: 'V1', sapVersion: 'V1', syncStatus: 'synced', occupancyStatus: 'available', reconciliationId: '', updateTime: '2026-11-05 10:42', lastSyncTime: '2026-11-05 10:42' },
    S261105002: { id: 'S261105002', settlementMonth: '2026-11', accrualId: 'A260915008', accrualMonth: '2026-08', companyCode: 'CN01', supplier: '湖州新能源玻璃有限公司', category: '玻璃', currency: 'CNY', discountUnitPrice: 21.5000, sapDiscountUnitPrice: 21.5000, currentVersion: 'V1', sapVersion: 'V1', syncStatus: 'synced', occupancyStatus: 'occupied', reconciliationId: 'DZ260916008', updateTime: '2026-11-05 11:08', lastSyncTime: '2026-11-05 11:08' },
    S261104006: { id: 'S261104006', settlementMonth: '2026-10', accrualId: 'A260831018', accrualMonth: '2026-08', companyCode: 'CN02', supplier: '安徽高透光伏材料有限公司', category: '玻璃', currency: 'CNY', discountUnitPrice: 23.0000, sapDiscountUnitPrice: 22.0000, currentVersion: 'V2', sapVersion: 'V1', syncStatus: 'sync-failed', occupancyStatus: 'available', reconciliationId: '', updateTime: '2026-11-05 09:36', lastSyncTime: '2026-10-28 15:22', failureMessage: '提交失败：该业务已在SAP完成后续处理，不允许修改。' }
  };
  // 列表使用的业务单号与详情示例保持一致，避免打开占用/失败单据时落到错误示例。
  documents.S261104002 = { ...documents.S261105002, id: 'S261104002' };
  documents.S261103003 = { ...documents.S261104006, id: 'S261103003' };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function round(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000; }
  function versionNumber(value) { const match = /V(\d+)/.exec(value || ''); return match ? Number(match[1]) : 0; }
  function nextVersion(value) { return 'V' + (versionNumber(value) + 1); }
  function nowText() { const d = new Date(); const p = (v) => String(v).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      let activeId = 'S261104006';
      try { activeId = window.sessionStorage.getItem('rebateSettlementActiveId') || activeId; } catch (error) {}
      const mock = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
      const row = (mock.rows || []).find((item) => item.id === activeId);
      const source = clone({ ...(documents[activeId] || documents.S261104006), ...(row || {}) });
      if (!source.reconciliationId) source.reconciliationId = source.occupancyBillNo || '';
      if (source.hasDraft == null) source.hasDraft = source.currentVersion !== source.sapVersion || ['pending-resubmit', 'resubmit-failed', 'sync-failed'].includes(source.syncStatus);
      const form = clone(source);
      return {
        persisted: source, form, activeView: source.hasDraft ? 'current' : 'sap', historyReturnView: source.hasDraft ? 'current' : 'sap', detailTab: 'receipts', historyVersion: source.sapVersion,
        lines: [],
        history: [{ version: source.sapVersion, unitPrice: source.sapDiscountUnitPrice, status: 'SAP同步成功', time: source.lastSyncTime, operator: '陈静怡' }],
        submitting: false, receiptRefreshPending: false, failureMessage: source.failureMessage || '',
        companyOptions: ['CN01', 'CN02'], currencyOptions: ['CNY', 'USD']
      };
    },
    created() { this.lines = this.makeLines(); },
    computed: {
      selectedSnapshot() {
        if (this.activeView === 'sap') return { version: this.form.sapVersion, unitPrice: this.form.sapDiscountUnitPrice, status: 'SAP生效版本', time: this.form.lastSyncTime, operator: '陈静怡' };
        if (this.activeView === 'history') return this.history.find((item) => item.version === this.historyVersion) || this.history[0];
        return { version: this.form.currentVersion, unitPrice: this.form.discountUnitPrice, status: this.syncLabel(this.form.syncStatus), time: this.form.updateTime, operator: '陈静怡' };
      },
      viewUnitPrice() { return Number(this.selectedSnapshot ? this.selectedSnapshot.unitPrice : 0); },
      viewLines() {
        const unitPrice = this.viewUnitPrice;
        return this.lines.map((item) => {
          const amount = round(item.amount);
          const area = Number(item.area || 0);
          const afterAmount = round(area * unitPrice);
          return { ...item, amount, m2UntaxedPrice: area === 0 ? 0 : round(amount / area), discountUnitPrice: round(unitPrice), afterAmount, discountAmount: round(amount - afterAmount) };
        });
      },
      originalAmount() { return round(this.viewLines.reduce((sum, item) => sum + Number(item.amount || 0), 0)); },
      discountAmount() { return round(this.viewLines.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0)); },
      afterAmount() { return round(this.viewLines.reduce((sum, item) => sum + Number(item.afterAmount || 0), 0)); },
      hasDraft() { return Boolean(this.form.hasDraft || this.form.currentVersion !== this.form.sapVersion || ['draft', 'pending-resubmit', 'resubmit-failed', 'sync-failed'].includes(this.form.syncStatus) || this.hasUnsaved); },
      hasUnsaved() { return this.receiptRefreshPending || Math.abs(Number(this.form.discountUnitPrice) - Number(this.persisted.discountUnitPrice)) > 0.0001; },
      differsFromSap() { return Math.abs(Number(this.form.discountUnitPrice) - Number(this.form.sapDiscountUnitPrice)) > 0.0001 || this.form.currentVersion !== this.form.sapVersion; },
    },
    methods: {
      makeLines() {
        const mock = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
        const source = Array.isArray(mock.settlementReceiptLines) && mock.settlementReceiptLines.length
          ? mock.settlementReceiptLines
          : (Array.isArray(mock.receiptLines) && mock.receiptLines.length ? mock.receiptLines : baseLines);
        return clone(source).filter((line) => {
          const settlementMonth = line.settlementMonth || this.form.settlementMonth;
          const companyCode = line.companyCode || this.form.companyCode;
          const supplier = line.supplier || this.form.supplier;
          const category = line.category || '玻璃';
          return settlementMonth === this.form.settlementMonth && companyCode === this.form.companyCode
            && supplier === this.form.supplier && category === '玻璃';
        }).map((line) => ({ ...line, amount: round(line.amount), m2UntaxedPrice: Number(line.area || 0) === 0 ? 0 : round(Number(line.amount || 0) / Number(line.area || 0)), discountUnitPrice: round(Number(this.form.discountUnitPrice ?? 0)) }));
      },
      syncLabel(value) { return { synced: '已同步', 'pending-resubmit': '待重新提交', 'resubmit-failed': '同步失败', 'sync-failed': '同步失败' }[value] || '草稿'; },
      syncType(value) { return { synced: 'success', 'pending-resubmit': 'warning', 'resubmit-failed': 'danger', 'sync-failed': 'danger' }[value] || 'info'; },
      saveEdit() {
        if (this.form.occupancyStatus === 'occupied') return ElementPlus.ElMessage.warning('结算单已被对账单' + (this.form.reconciliationId || '') + '占用，暂不可编辑；请先作废原对账单释放。');
        if (this.activeView !== 'current') return ElementPlus.ElMessage.warning('请切换到编辑稿后保存');
        if (!this.validatePricing()) return;
        if (!this.hasUnsaved) return ElementPlus.ElMessage.info('没有新的编辑内容');
        const prior = clone(this.persisted);
        this.form.currentVersion = this.form.currentVersion === this.form.sapVersion ? nextVersion(this.form.sapVersion) : nextVersion(this.form.currentVersion);
        this.form.syncStatus = 'pending-resubmit'; this.form.hasDraft = true; this.form.updateTime = nowText(); this.failureMessage = '';
        this.receiptRefreshPending = false;
        this.persisted = clone(this.form);
        ElementPlus.ElMessage.success('已保存为编辑稿 ' + this.form.currentVersion + '，SAP仍为' + this.form.sapVersion);
      },
      submitSap() {
        if (this.form.occupancyStatus === 'occupied') return ElementPlus.ElMessage.warning('结算单已被对账单' + (this.form.reconciliationId || '') + '占用，暂不可重新提交；请先作废原对账单释放。');
        if (!this.validatePricing()) return;
        if (this.hasUnsaved) return ElementPlus.ElMessage.warning('请先保存编辑稿，再提交SAP');
        if (!this.differsFromSap) return ElementPlus.ElMessage.info('当前版本与SAP一致，无需重新提交');
        ElementPlus.ElMessageBox.confirm('确认将' + this.form.currentVersion + '重新提交SAP？', '重新提交SAP', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(() => {
          this.submitting = true;
          window.setTimeout(() => {
            this.submitting = false;
            if (['S261104006', 'S261103003'].includes(this.form.id)) {
              this.form.syncStatus = 'resubmit-failed'; this.form.hasDraft = true;
              this.failureMessage = '同步失败：该结算数据已在SAP完成结算，不允许修改。';
              this.persisted = clone(this.form);
              ElementPlus.ElMessage.error(this.failureMessage);
              return;
            }
            this.form.sapVersion = this.form.currentVersion; this.form.sapDiscountUnitPrice = this.form.discountUnitPrice;
            this.form.syncStatus = 'synced'; this.form.hasDraft = false; this.form.lastSyncTime = nowText(); this.form.updateTime = this.form.lastSyncTime;
            this.history.unshift({ version: this.form.sapVersion, unitPrice: this.form.sapDiscountUnitPrice, status: 'SAP同步成功', time: this.form.lastSyncTime, operator: '陈静怡' });
            this.persisted = clone(this.form); this.failureMessage = '';
            ElementPlus.ElMessage.success('SAP同步成功，生效版本更新为' + this.form.sapVersion);
          }, 800);
        }).catch(() => {});
      },
      backList() { this.$emit('navigate', '#/rebate/settlements'); },
      viewSnapshot(item) { this.historyReturnView = this.activeView === 'sap' ? 'sap' : (this.hasDraft ? 'current' : 'sap'); this.activeView = 'history'; this.historyVersion = item.version; this.detailTab = 'receipts'; },
      returnFromHistory() { this.activeView = this.hasDraft ? 'current' : 'sap'; this.detailTab = 'receipts'; },
      refreshReceiptLines() {
        if (this.form.occupancyStatus === 'occupied') return ElementPlus.ElMessage.warning('结算单已被对账单' + (this.form.reconciliationId || '') + '占用，不能获取最新收货记录。');
        if (this.activeView !== 'current') return ElementPlus.ElMessage.warning('请先返回编辑稿，再获取最新收货记录');
        const latest = this.makeLines();
        if (!latest.length) return ElementPlus.ElMessage.warning('未获取到符合当前结算条件的最新收货记录');
        this.lines = latest; this.receiptRefreshPending = true;
        ElementPlus.ElMessage.success('已按结算年月、公司代码、供应商和玻璃品类获取最新收货记录，请保存编辑稿');
      },
      validatePricing() {
        const unit = this.form.discountUnitPrice;
        if (unit === null || unit === undefined || unit === '' || Number.isNaN(Number(unit))) {
          ElementPlus.ElMessage.warning('请输入折让后M²不含税单价');
          return false;
        }
        const invalid = this.lines.find((line) => {
          const areaEmpty = line.area === null || line.area === undefined || line.area === '';
          const amountEmpty = line.amount === null || line.amount === undefined || line.amount === '';
          const area = Number(line.area || 0);
          const amount = Number(line.amount || 0);
          return ((areaEmpty || area === 0) && !amountEmpty && amount !== 0) || (area !== 0 && amountEmpty);
        });
        if (invalid) {
          ElementPlus.ElMessage.warning('该明细缺少有效玻璃面积或原金额，无法计算折后金额');
          return false;
        }
        return true;
      },
      money(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); },
      formatUnitPrice(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); },
      historyDiscount(item) { return round(this.originalAmount - this.historyAfter(item)); },
      historyAfter(item) { return round(this.lines.reduce((sum, line) => sum + round(Number(line.area || 0) * Number(item.unitPrice || 0)), 0)); },
      signed(value, suffix) { const n = Number(value || 0); const text = suffix === '%' ? Math.abs(n).toFixed(2).replace(/\.00$/, '') : this.money(Math.abs(n)); return (n > 0 ? '+' : n < 0 ? '-' : '') + text + (suffix || ''); }
    },
    template: `
      <div class="flow-progress-layout">
        <section class="panel flow-panel-shell" data-tour="settlement-detail-version">
          <div class="panel-body" style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px">
            <div><div style="display:flex;align-items:center;gap:9px;font-size:17px;font-weight:650"><span>{{ form.id }}</span><el-tag size="small" :type="syncType(form.syncStatus)">{{ syncLabel(form.syncStatus) }}</el-tag><el-tag size="small" :type="form.occupancyStatus === 'occupied' ? 'warning' : 'success'" effect="plain">{{ form.occupancyStatus === 'occupied' ? '已占用' : '未占用' }}</el-tag><el-tag size="small" :type="hasDraft ? 'warning' : 'info'" effect="plain">{{ hasDraft ? '有编辑稿' : '无编辑稿' }}</el-tag><el-tag v-if="activeView === 'history'" size="small" type="info">历史版本 {{ historyVersion }} · 只读</el-tag></div><div style="margin-top:7px;font-size:12px;color:var(--el-text-color-secondary)">{{ hasDraft ? '当前编辑稿 ' + form.currentVersion : '当前无编辑稿' }} · SAP生效 {{ form.sapVersion }} · 占用对账单 {{ form.reconciliationId || '—' }}</div></div>
            <div v-if="activeView !== 'history'" style="display:flex;align-items:center;gap:8px"><el-radio-group v-model="activeView" size="small"><el-radio-button value="current">{{ hasDraft ? '编辑稿 ' + form.currentVersion : '新建编辑稿' }}</el-radio-button><el-radio-button value="sap">SAP版本 {{ form.sapVersion }}</el-radio-button></el-radio-group></div>
            <el-button v-else type="primary" plain size="small" @click="returnFromHistory"><i class="ri-arrow-left-line"></i><span>返回</span></el-button>
          </div>
        </section>

        <el-alert v-if="failureMessage" :title="failureMessage" type="error" :closable="false" show-icon></el-alert>

        <section class="panel flow-panel-shell" data-tour="settlement-detail-snapshot">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>版本快照</span></div><span v-if="activeView === 'history'" style="font-size:12px;color:var(--el-text-color-secondary)">历史版本，仅供查看</span></div>
          <div class="panel-body">
            <el-descriptions :column="4" size="small" border>
              <el-descriptions-item label="当前查看版本">{{ selectedSnapshot.version }}</el-descriptions-item><el-descriptions-item label="版本结果">{{ selectedSnapshot.status }}</el-descriptions-item><el-descriptions-item label="版本时间">{{ selectedSnapshot.time }}</el-descriptions-item><el-descriptions-item label="操作人">{{ selectedSnapshot.operator }}</el-descriptions-item>
              <el-descriptions-item label="结算年月">{{ form.settlementMonth }}</el-descriptions-item><el-descriptions-item label="计提单号">{{ form.accrualId }}</el-descriptions-item><el-descriptions-item label="计提年月">{{ form.accrualMonth }}</el-descriptions-item><el-descriptions-item label="品类">{{ form.category }}</el-descriptions-item>
              <el-descriptions-item label="公司代码">{{ form.companyCode }}</el-descriptions-item><el-descriptions-item label="供应商" :span="2">{{ form.supplier }}</el-descriptions-item><el-descriptions-item label="币种">{{ form.currency }}</el-descriptions-item>
            </el-descriptions>
            <el-alert style="margin-top:12px" title="计提年月只用于自动关联唯一计提单号；当前收货明细按结算年月＋公司代码＋供应商＋玻璃品类独立取得，不继承计提单明细。" type="info" :closable="false" show-icon></el-alert>
            <el-form v-if="activeView === 'current'" :model="form" label-width="96px" size="small" style="margin-top:14px"><div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:0 18px"><el-form-item label="折让后M²不含税单价"><el-input-number v-model="form.discountUnitPrice" :precision="4" :step="0.0001" style="width:100%"></el-input-number></el-form-item><el-form-item label="SAP折让后M²单价"><el-input :model-value="formatUnitPrice(form.sapDiscountUnitPrice)" disabled></el-input></el-form-item><el-form-item label="占用对账单"><el-input :model-value="form.reconciliationId || '未占用'" disabled></el-input></el-form-item></div></el-form>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px"><div style="padding:11px;background:var(--el-fill-color-light);border-radius:6px"><small>原金额</small><div style="font-size:17px;font-weight:650">{{ money(originalAmount) }}</div></div><div style="padding:11px;background:var(--el-color-warning-light-9);border-radius:6px"><small>折让金额 · {{ formatUnitPrice(viewUnitPrice) }}</small><div style="font-size:17px;font-weight:650">{{ money(discountAmount) }}</div></div><div style="padding:11px;background:var(--el-color-success-light-9);border-radius:6px"><small>折后金额</small><div style="font-size:17px;font-weight:650">{{ money(afterAmount) }}</div></div></div>
          </div>
        </section>

        <section class="panel table-panel flow-panel-shell" data-tour="settlement-detail-lines">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>行信息</span></div><span v-if="form.occupancyStatus === 'occupied'" style="font-size:12px;color:var(--el-text-color-secondary)">已占用，不能更新明细</span></div>
          <div class="panel-body"><el-tabs v-model="detailTab"><el-tab-pane label="收货明细" name="receipts"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px"><span style="font-size:12px;color:var(--el-text-color-secondary)">当前按 {{ selectedSnapshot.version }} 的 {{ formatUnitPrice(viewUnitPrice) }} 展示</span><el-button type="primary" plain size="small" :disabled="form.occupancyStatus === 'occupied' || activeView === 'history'" @click="refreshReceiptLines"><i class="ri-refresh-line"></i><span>获取最新收货记录</span></el-button></div><div class="flow-grid-table-wrap"><el-table class="flow-grid-table" :data="viewLines" height="100%" min-height="230" stripe border style="width:100%">
            <el-table-column prop="materialDoc" label="物料凭证" width="112"></el-table-column><el-table-column prop="item" label="行项目" width="76"></el-table-column><el-table-column prop="receiptDate" label="入库日期" width="108"></el-table-column><el-table-column prop="purchaseOrder" label="采购订单" width="112"></el-table-column><el-table-column prop="materialName" label="物料" min-width="180" show-overflow-tooltip></el-table-column><el-table-column prop="quantity" label="数量" width="100" align="right"><template v-slot:default="scope">{{ money(scope.row.quantity) }}</template></el-table-column><el-table-column prop="unitPrice" label="单价" width="94" align="right"><template v-slot:default="scope">{{ money(scope.row.unitPrice) }}</template></el-table-column><el-table-column prop="area" label="面积(m²)" width="108" align="right"><template v-slot:default="scope">{{ money(scope.row.area) }}</template></el-table-column><el-table-column prop="m2UntaxedPrice" label="原M²不含税单价" width="142" align="right"><template v-slot:default="scope">{{ money(scope.row.m2UntaxedPrice) }}</template></el-table-column><el-table-column prop="discountUnitPrice" label="折让后M²不含税单价" width="160" align="right"><template v-slot:default="scope">{{ money(scope.row.discountUnitPrice) }}</template></el-table-column><el-table-column prop="amount" label="原金额" width="116" align="right"><template v-slot:default="scope">{{ money(scope.row.amount) }}</template></el-table-column><el-table-column prop="discountAmount" label="折让金额" width="116" align="right"><template v-slot:default="scope">{{ money(scope.row.discountAmount) }}</template></el-table-column><el-table-column prop="afterAmount" label="折后金额" width="116" align="right"><template v-slot:default="scope">{{ money(scope.row.afterAmount) }}</template></el-table-column>
          </el-table></div><div class="table-footer"><span style="font-size:12px;color:var(--el-text-color-secondary)">共 {{ viewLines.length }} 条，负数数量与金额按原符号计算</span></div></el-tab-pane><el-tab-pane label="版本记录" name="versions"><el-table :data="history" size="small" stripe border style="width:100%"><el-table-column prop="version" label="版本" width="70"></el-table-column><el-table-column label="状态" width="90"><template v-slot:default="scope"><el-tag size="small" type="success">已同步</el-tag></template></el-table-column><el-table-column label="折让后M²不含税单价" width="100" align="right"><template v-slot:default="scope">{{ formatUnitPrice(scope.row.unitPrice) }}</template></el-table-column><el-table-column label="折让金额" width="120" align="right"><template v-slot:default="scope">{{ money(historyDiscount(scope.row)) }}</template></el-table-column><el-table-column label="折后金额" width="120" align="right"><template v-slot:default="scope">{{ money(historyAfter(scope.row)) }}</template></el-table-column><el-table-column prop="operator" label="提交人" width="90"></el-table-column><el-table-column prop="time" label="提交时间" width="145"></el-table-column><el-table-column label="SAP结果" min-width="150"><template v-slot:default="scope">同步成功</template></el-table-column><el-table-column label="操作" width="120" fixed="right"><template v-slot:default="scope"><el-button link type="primary" size="small" @click="viewSnapshot(scope.row)">查看完整快照</el-button></template></el-table-column></el-table></el-tab-pane></el-tabs></div>
        </section>

        <section v-if="activeView !== 'history'" class="panel flow-panel-shell" data-tour="settlement-detail-actions"><div class="panel-body" style="display:flex;justify-content:flex-end;gap:8px"><el-button type="primary" :loading="submitting" @click="submitSap">重新提交SAP</el-button><el-button @click="saveEdit">保存编辑稿</el-button><el-button @click="backList">返回列表</el-button></div></section>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/settlement-detail', name: '结算单详情', menuKey: 'rebateSettlementDetail', component: componentName,
    breadcrumbs: ['折让管理', '结算单管理', '结算单详情'], templateId: 'query-table-list-page', archetype: '独立业务详情页',
    tabInfo: '帮助采购结算专员核对结算单编辑稿、SAP生效版本与同步结果，并处理重提。',
    guideSteps: [
      { target: '[data-tour="settlement-detail-version"]', title: '选择版本视角', description: '在编辑稿、SAP生效版本和历史版本之间切换，先确认当前所看内容。' },
      { target: '[data-tour="settlement-detail-snapshot"]', title: '核对版本快照', description: '查看版本时间、操作人及计提年月自动关联的唯一计提单号；该关联不带入计提明细。' },
      { target: '[data-tour="settlement-detail-lines"]', title: '核对独立收货明细', description: '明细按结算年月、公司、供应商和玻璃品类独立取得，再按所选版本单价计算，负数保留原符号。' },
      { target: '[data-tour="settlement-detail-actions"]', title: '保存或重新提交', description: '编辑稿可保存并重提；SAP返回失败时原因明确保留，原正式版本不变。' }
    ],
    noteSections: [
      { title: '业务目标', content: '本页帮助采购结算专员在一个独立详情页区分结算单编辑稿、SAP生效版本和历史版本，并追溯同步失败。' },
      { title: '状态流转', content: '本地修改先保存为编辑稿，再向SAP重新提交；成功则成为新生效版本，失败时只更新同步状态并保留当前编辑稿。', diagram: { type: 'flow', nodes: [{ id: 'sap', title: 'SAP V1', tone: 'success' }, { id: 'edit', title: '编辑稿', tone: 'info' }, { id: 'pending', title: '待重提', tone: 'warning' }, { id: 'success', title: 'SAP新版本', tone: 'success' }, { id: 'failed', title: '同步失败', tone: 'danger' }], edges: [{ from: 'sap', to: 'edit', label: '修改' }, { from: 'edit', to: 'pending', label: '保存' }, { from: 'pending', to: 'success', label: '成功' }, { from: 'pending', to: 'failed', label: '失败' }] } },
      { title: '上下游关系', content: '计提年月只关联唯一计提单号；收货记录按结算条件独立取得。SAP生效版本供对账单选择，占用关系在详情中只读展示。', diagram: { type: 'relation', center: { title: '结算单详情', meta: '编辑与版本追溯', tone: 'primary' }, upstream: [{ title: '计提年月', meta: '自动带出唯一计提单号', tone: 'info' }, { title: '收货记录', meta: '按结算条件独立获取', tone: 'info' }], downstream: [{ title: 'SAP', meta: '保留生效版本', tone: 'success' }, { title: '对账单', meta: '引用并占用', tone: 'warning' }] } },
      { title: '关键规则', items: ['计提年月只自动带出唯一计提单号，不提供多选，也不继承计提单明细。', '收货记录按结算年月＋公司代码＋供应商＋玻璃品类独立获取，结算年月唯一性在创建选择时和保存时各校验一次。', '同步状态只采用草稿、已同步、待重新提交、同步失败；失败时不生成新正式版本。', '提交失败时显示SAP返回的明确原因，当前编辑稿继续保留，正式版本不变。', '占用状态和占用对账单号只读，只有对账单作废才能释放。'] }
    ]
  });
})(window);
