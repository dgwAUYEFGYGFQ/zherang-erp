(function (window) {
  const componentName = 'RebateSettlementVersionListPage';

  const fallbackRows = [
    { id: 'S261105001', settlementMonth: '2026-11', accrualId: 'A260916001', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '嘉兴光伏玻璃制造有限公司', category: '玻璃', currency: 'CNY', originalAmount: 1264830.56, areaTotal: 42740, discountUnitPrice: 22.0000, discountAmount: 940280.0000, afterAmount: 324550.5600, syncStatus: 'synced', occupancyStatus: 'available', reconciliationId: '', sapVersion: 'V1', updateTime: '2026-11-05 10:42' },
    { id: 'S261105002', settlementMonth: '2026-11', accrualId: 'A260915008', accrualMonth: '2026-08', companyCode: 'CN01', supplier: '湖州新能源玻璃有限公司', category: '玻璃', currency: 'CNY', originalAmount: 896742.30, areaTotal: 30000, discountUnitPrice: 21.5000, discountAmount: 645000.0000, afterAmount: 251742.3000, syncStatus: 'synced', occupancyStatus: 'occupied', reconciliationId: 'DZ260916008', sapVersion: 'V1', updateTime: '2026-11-05 11:08' },
    { id: 'S261103003', settlementMonth: '2026-10', accrualId: 'A260914006', accrualMonth: '2026-07', companyCode: 'CN02', supplier: '安徽高透光伏材料有限公司', category: '玻璃', currency: 'CNY', originalAmount: 743218.48, areaTotal: 25000, discountUnitPrice: 23.0000, discountAmount: 575000.0000, afterAmount: 168218.4800, syncStatus: 'sync-failed', occupancyStatus: 'available', reconciliationId: '', sapVersion: 'V1', updateTime: '2026-11-05 09:36' }
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function syncLabel(value) { return { draft: '草稿', synced: '已同步', 'pending-resubmit': '待重新提交', 'resubmit-failed': '同步失败', 'sync-failed': '同步失败' }[value] || '待处理'; }
  function syncType(value) { return { draft: 'info', synced: 'success', 'pending-resubmit': 'warning', 'resubmit-failed': 'danger', 'sync-failed': 'danger' }[value] || 'info'; }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      const data = ChintPrototypeShell.getMockData('rebateSettlements', {});
      return {
        rows: clone(data.rows && data.rows.length ? data.rows : fallbackRows),
        settlementMonth: '', companyCode: '', supplier: '', syncStatus: '', occupancyStatus: '',
        companyOptions: ['CN01', 'CN02'],
        supplierOptions: ['嘉兴光伏玻璃制造有限公司', '湖州新能源玻璃有限公司', '安徽高透光伏材料有限公司'],
        syncOptions: [{ value: 'draft', label: '草稿' }, { value: 'synced', label: '已同步' }, { value: 'pending-resubmit', label: '待重新提交' }, { value: 'sync-failed', label: '同步失败' }],
        occupancyOptions: [{ value: 'available', label: '未占用' }, { value: 'occupied', label: '已占用' }],
        selectedRows: [], page: 1, pageSize: 10, pageSizes: [10, 20, 50], actedRowId: ''
      };
    },
    computed: {
      filteredRows() {
        return this.rows.filter((row) => {
          if (this.settlementMonth && row.settlementMonth !== this.settlementMonth) return false;
          if (this.companyCode && row.companyCode !== this.companyCode) return false;
          if (this.supplier && row.supplier !== this.supplier) return false;
          if (this.syncStatus && row.syncStatus !== this.syncStatus) return false;
          if (this.occupancyStatus && row.occupancyStatus !== this.occupancyStatus) return false;
          return true;
        });
      },
      pagedRows() {
        const start = (this.page - 1) * this.pageSize;
        return this.filteredRows.slice(start, start + this.pageSize);
      }
    },
    watch: {
      settlementMonth() { this.page = 1; }, companyCode() { this.page = 1; }, supplier() { this.page = 1; },
      syncStatus() { this.page = 1; }, occupancyStatus() { this.page = 1; }
    },
    methods: {
      resetFilters() {
        this.settlementMonth = ''; this.companyCode = ''; this.supplier = ''; this.syncStatus = ''; this.occupancyStatus = ''; this.page = 1;
      },
      handleSelection(rows) { this.selectedRows = rows; },
      tableRowClassName({ row }) { return row.id === this.actedRowId ? 'proto-table-row-acted' : ''; },
      navigateCreate() { this.$emit('navigate', '#/rebate/settlement-create'); },
      navigateDetail(row, mode) {
        this.actedRowId = row.id;
        try { window.sessionStorage.setItem('rebateSettlementActiveId', row.id); window.sessionStorage.setItem('rebateSettlementDetailMode', mode || 'view'); } catch (error) {}
        this.$emit('navigate', '#/rebate/settlement-detail');
      },
      rowClick(row, column) { if (!column || column.type !== 'selection') this.navigateDetail(row, 'view'); },
      batchVerify() {
        if (!this.selectedRows.length) return ElementPlus.ElMessage.warning('请先勾选需要核对的结算单');
        ElementPlus.ElMessage.success('已完成 ' + this.selectedRows.length + ' 张结算单的SAP与占用状态核对');
      },
      syncLabel, syncType,
      occupancyLabel(value) { return value === 'occupied' ? '已占用' : '未占用'; },
      money(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); },
      formatUnitPrice(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); }
    },
    template: `
      <div class="flow-progress-layout">
        <section class="panel control-panel flow-panel-shell">
          <div class="panel-body">
            <div class="filter-bar" data-tour="settlement-list-filter">
              <el-date-picker v-model="settlementMonth" type="month" value-format="YYYY-MM" format="YYYY年MM月" placeholder="结算年月" size="small" style="width:150px" clearable :teleported="false"></el-date-picker>
              <el-select v-model="companyCode" placeholder="公司代码" size="small" style="width:130px" clearable :teleported="false"><el-option v-for="item in companyOptions" :key="item" :label="item" :value="item"></el-option></el-select>
              <el-select v-model="supplier" placeholder="供应商" size="small" style="width:210px" clearable :teleported="false"><el-option v-for="item in supplierOptions" :key="item" :label="item" :value="item"></el-option></el-select>
              <el-select v-model="syncStatus" placeholder="同步状态" size="small" style="width:145px" clearable :teleported="false"><el-option v-for="item in syncOptions" :key="item.value" :label="item.label" :value="item.value"></el-option></el-select>
              <el-select v-model="occupancyStatus" placeholder="占用状态" size="small" style="width:130px" clearable :teleported="false"><el-option v-for="item in occupancyOptions" :key="item.value" :label="item.label" :value="item.value"></el-option></el-select>
              <el-button size="small" @click="resetFilters">重置</el-button>
            </div>
            <div class="table-toolbar flow-action-bar" data-tour="settlement-list-actions">
              <div class="toolbar-left"><el-button type="primary" size="small" @click="navigateCreate"><i class="ri-add-line"></i><span>新增结算单</span></el-button><el-button size="small" plain @click="batchVerify">批量核对状态</el-button></div>
              <div class="toolbar-right" style="font-size:12px;color:var(--el-text-color-secondary)"><i class="ri-information-line"></i> 同步状态与对账占用状态分别管理</div>
            </div>
          </div>
        </section>
        <section class="panel table-panel flow-panel-shell">
          <div class="panel-body">
            <div class="flow-grid-table-wrap">
              <el-table class="flow-grid-table" :data="pagedRows" row-key="id" height="100%" stripe border table-layout="auto" style="width:100%" :row-class-name="tableRowClassName" @selection-change="handleSelection" @row-click="rowClick" data-tour="settlement-list-table">
                <el-table-column type="selection" width="42" fixed="left"></el-table-column>
                <el-table-column prop="id" label="结算单号" width="126" fixed="left"></el-table-column>
                <el-table-column prop="settlementMonth" label="结算年月" width="102"></el-table-column>
                <el-table-column prop="accrualId" label="计提单号" width="126"></el-table-column>
                <el-table-column prop="accrualMonth" label="计提年月" width="102"></el-table-column>
                <el-table-column prop="companyCode" label="公司代码" width="92"></el-table-column>
                <el-table-column prop="supplier" label="供应商" min-width="210" show-overflow-tooltip></el-table-column>
                <el-table-column prop="category" label="品类" width="72"></el-table-column>
                <el-table-column prop="originalAmount" label="原金额" width="120" align="right"><template v-slot:default="scope">{{ money(scope.row.originalAmount) }}</template></el-table-column>
                <el-table-column prop="discountUnitPrice" label="折让后M²不含税单价" width="145" align="right"><template v-slot:default="scope">{{ formatUnitPrice(scope.row.discountUnitPrice) }}</template></el-table-column>
                <el-table-column prop="discountAmount" label="折让金额" width="120" align="right"><template v-slot:default="scope">{{ money(scope.row.discountAmount) }}</template></el-table-column>
                <el-table-column prop="afterAmount" label="折后金额" width="120" align="right"><template v-slot:default="scope">{{ money(scope.row.afterAmount) }}</template></el-table-column>
                <el-table-column prop="syncStatus" label="同步状态" width="105"><template v-slot:default="scope"><el-tag size="small" :type="syncType(scope.row.syncStatus)">{{ syncLabel(scope.row.syncStatus) }}</el-tag></template></el-table-column>
                <el-table-column prop="occupancyStatus" label="占用状态" width="98"><template v-slot:default="scope"><el-tag size="small" :type="scope.row.occupancyStatus === 'occupied' ? 'warning' : 'success'" effect="plain">{{ occupancyLabel(scope.row.occupancyStatus) }}</el-tag></template></el-table-column>
                <el-table-column prop="reconciliationId" label="占用对账单号" width="134"><template v-slot:default="scope">{{ scope.row.reconciliationId || scope.row.occupancyBillNo || '—' }}</template></el-table-column>
                <el-table-column prop="sapVersion" label="SAP生效版本" width="112"></el-table-column>
                <el-table-column prop="updateTime" label="更新时间" width="148"></el-table-column>
                <el-table-column label="操作" width="128" fixed="right" align="center"><template v-slot:default="scope"><div class="table-actions"><el-button link type="primary" size="small" @click.stop="navigateDetail(scope.row, 'view')">详情</el-button><el-button link type="primary" size="small" @click.stop="navigateDetail(scope.row, 'edit')">编辑</el-button></div></template></el-table-column>
              </el-table>
            </div>
            <div class="table-footer"><div style="font-size:12px;color:var(--el-text-color-secondary)">共 {{ filteredRows.length }} 张，已选 {{ selectedRows.length }} 张</div><el-pagination small background layout="sizes, prev, pager, next" :current-page="page" :page-size="pageSize" :page-sizes="pageSizes" :total="filteredRows.length" @update:current-page="page = $event" @update:page-size="pageSize = $event; page = 1"></el-pagination></div>
          </div>
        </section>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/settlements', name: '结算单管理', menuKey: 'rebateSettlements', component: componentName,
    breadcrumbs: ['折让管理', '结算单管理'], templateId: 'query-table-list-page', archetype: '查询表格列表页',
    tabInfo: '帮助采购结算专员查询结算单，并分别识别SAP同步、SAP结算和对账占用状态。',
    guideSteps: [
      { target: '[data-tour="settlement-list-filter"]', title: '筛选结算单', description: '按结算年月、公司、供应商、同步和占用状态定位目标单据。' },
      { target: '[data-tour="settlement-list-actions"]', title: '新增或批量核对', description: '进入独立新建页生成结算单，或对已勾选单据核对SAP与占用状态。' },
      { target: '[data-tour="settlement-list-table"]', title: '区分同步与占用', description: '同步状态和对账占用状态分列展示，避免把占用关系误判为同步失败。' },
      { target: '[data-tour="settlement-list-table"] .table-actions', title: '进入独立详情', description: '详情和编辑进入完整页面，继续查看版本、明细和SAP失败原因。' }
    ],
    noteSections: [
      { title: '业务目标', content: '本页帮助采购结算专员集中查询玻璃折让结算单，快速识别是否已同步SAP、是否已在SAP结算以及是否被对账单占用。' },
      { title: '状态流转', content: '结算单从草稿提交SAP，成功后可进入对账占用；同步失败时保留编辑稿并等待再次提交。', diagram: { type: 'flow', nodes: [{ id: 'draft', title: '草稿', tone: 'info' }, { id: 'synced', title: '已同步', tone: 'success' }, { id: 'occupied', title: '已占用', tone: 'warning' }, { id: 'failed', title: '同步失败', tone: 'danger' }], edges: [{ from: 'draft', to: 'synced', label: '提交成功' }, { from: 'synced', to: 'occupied', label: '对账确认' }, { from: 'draft', to: 'failed', label: '提交失败' }] } },
      { title: '上下游关系', content: '上游来自已同步计提单及其收货明细，下游进入SAP和对账单附加费用。', diagram: { type: 'relation', center: { title: '结算单', meta: '核算与版本管理', tone: 'primary' }, upstream: [{ title: '计提单', meta: '提供计提年月与关联单号', tone: 'info' }, { title: '收货记录', meta: '提供逐行计算基础', tone: 'info' }], downstream: [{ title: 'SAP', meta: '接收生效版本', tone: 'success' }, { title: '对账单', meta: '占用已同步结算单', tone: 'warning' }] } },
      { title: '关键规则', items: ['结算年月与计提年月分开记录，一张结算单关联一张有效计提单。', '同步状态与占用状态互不替代；占用时必须显示占用对账单号。', '同步失败不生成新正式版本，当前编辑稿继续保留并可再次提交。'] }
    ]
  });
})(window);
