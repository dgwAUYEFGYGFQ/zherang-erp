(function (window) {
  const componentName = 'RebateReconciliationDemoPage';
  const settlementSeed = [
    { id: 'S261105001', settlementMonth: '2026-11', accrualId: 'A260916001', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '嘉兴光伏玻璃制造有限公司', currency: 'CNY', discountUnitPrice: 22.0000, discountAmount: 1443200.0000, syncStatus: 'synced', occupancyStatus: 'available', reconciliationId: '' },
    { id: 'S261105002', settlementMonth: '2026-11', accrualId: 'A260915008', accrualMonth: '2026-08', companyCode: 'CN01', supplier: '湖州新能源玻璃有限公司', currency: 'CNY', discountUnitPrice: 21.5000, discountAmount: 1410400.0000, syncStatus: 'synced', occupancyStatus: 'occupied', reconciliationId: 'DZ260916008' },
    { id: 'S261103003', settlementMonth: '2026-10', accrualId: 'A260914006', accrualMonth: '2026-07', companyCode: 'CN02', supplier: '安徽高透光伏材料有限公司', currency: 'CNY', discountUnitPrice: 23.0000, discountAmount: 1485800.0000, syncStatus: 'sync-failed', occupancyStatus: 'available', reconciliationId: '' }
  ];
  const reconciliationSeed = [
    { id: 'DZ260916009', supplier: '嘉兴光伏玻璃制造有限公司', companyCode: 'CN01', currency: 'CNY', settlementMonth: '2026-11', status: '待确认', selectedSettlementId: '' }
  ];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      const pageData = ChintPrototypeShell.getMockData('rebateReconciliationDemo', {});
      const settlementData = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
      const settlements = clone(pageData.settlements && pageData.settlements.length ? pageData.settlements : (settlementData.rows && settlementData.rows.length ? settlementData.rows : settlementSeed)).map((row) => ({ ...row, reconciliationId: row.reconciliationId || row.occupancyBillNo || '' }));
      let persistedOccupier = '';
      try {
        const occupiedBy = window.localStorage.getItem('rebateSettlementOccupancyS261105001');
        persistedOccupier = occupiedBy || '';
        if (occupiedBy) {
          const row = settlements.find((item) => item.id === 'S261105001');
          if (row) { row.occupancyStatus = 'occupied'; row.reconciliationId = occupiedBy; }
        }
      } catch (error) {}
      const reconciliations = clone(pageData.reconciliations && pageData.reconciliations.length ? pageData.reconciliations : reconciliationSeed);
      if (persistedOccupier) {
        let persistedRecord = reconciliations.find((item) => item.id === persistedOccupier);
        if (!persistedRecord) {
          persistedRecord = { id: persistedOccupier, supplier: '嘉兴光伏玻璃制造有限公司', companyCode: 'CN01', currency: 'CNY', settlementMonth: '2026-11', status: '已确认', selectedSettlementId: 'S261105001' };
          reconciliations.push(persistedRecord);
        } else {
          persistedRecord.status = '已确认'; persistedRecord.selectedSettlementId = 'S261105001';
        }
      }
      return {
        settlements,
        reconciliations,
        activeReconciliationId: persistedOccupier || 'DZ260916009', selectorOpen: false
      };
    },
    computed: {
      current() { return this.reconciliations.find((item) => item.id === this.activeReconciliationId) || this.reconciliations[0]; },
      selectedSettlement() { return this.current ? this.settlements.find((item) => item.id === this.current.selectedSettlementId) : null; }
    },
    methods: {
      openSelector() {
        if (this.current.status === '已确认') return ElementPlus.ElMessage.warning('对账单已确认，结算单不可更换；如需释放只能作废对账单');
        if (this.current.status === '已作废') return ElementPlus.ElMessage.warning('已作废对账单不能再选择结算单');
        this.selectorOpen = true;
      },
      isSelectable(row) {
        return row.syncStatus === 'synced' && row.occupancyStatus === 'available'
          && row.companyCode === this.current.companyCode && row.supplier === this.current.supplier
          && row.currency === this.current.currency && row.settlementMonth === this.current.settlementMonth;
      },
      blockedReason(row) {
        if (row.occupancyStatus === 'occupied') return '已被对账单' + row.reconciliationId + '占用';
        if (row.syncStatus !== 'synced') return 'SAP未同步成功';
        if (row.companyCode !== this.current.companyCode || row.supplier !== this.current.supplier || row.currency !== this.current.currency) return '与当前对账单主体不一致';
        if (row.settlementMonth !== this.current.settlementMonth) return '结算年月不一致';
        return '可选择';
      },
      rowStyle({ row }) { return this.isSelectable(row) ? null : { opacity: '0.52', background: 'var(--el-fill-color-light)' }; },
      chooseSettlement(row) {
        if (!this.isSelectable(row)) return ElementPlus.ElMessage.warning(this.blockedReason(row));
        row.discountAmount = this.reconciliationMoney(row.discountAmount);
        this.current.selectedSettlementId = row.id; this.selectorOpen = false;
        ElementPlus.ElMessage.success('已选择结算单 ' + row.id + '，保存确认后将正式占用');
      },
      confirmReconciliation() {
        if (!this.selectedSettlement) return ElementPlus.ElMessage.warning('请先在附加费用中选择结算单流水号');
        if (!this.isSelectable(this.selectedSettlement)) return ElementPlus.ElMessage.error(this.blockedReason(this.selectedSettlement));
        this.selectedSettlement.discountAmount = this.reconciliationMoney(this.selectedSettlement.discountAmount);
        ElementPlus.ElMessageBox.confirm('确认保存并确认对账单 ' + this.current.id + '？结算单将被正式占用。', '保存并确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(() => {
          this.current.status = '已确认';
          this.selectedSettlement.occupancyStatus = 'occupied';
          this.selectedSettlement.reconciliationId = this.current.id;
          try { if (this.selectedSettlement.id === 'S261105001') window.localStorage.setItem('rebateSettlementOccupancyS261105001', this.current.id); } catch (error) {}
          ElementPlus.ElMessage.success('对账单已确认，结算单 ' + this.selectedSettlement.id + ' 已被 ' + this.current.id + ' 占用');
        }).catch(() => {});
      },
      createAnother() {
        let row = this.reconciliations.find((item) => item.id === 'DZ260916010');
        if (!row) {
          row = { id: 'DZ260916010', supplier: '嘉兴光伏玻璃制造有限公司', companyCode: 'CN01', currency: 'CNY', settlementMonth: '2026-11', status: '待确认', selectedSettlementId: '' };
          this.reconciliations.push(row);
        }
        this.activeReconciliationId = row.id;
        ElementPlus.ElMessage.info('已切换到另一张对账单，可再次打开选择弹窗验证占用限制');
      },
      voidReconciliation() {
        if (this.current.status !== '已确认') return ElementPlus.ElMessage.warning('只有已确认对账单可以作废并释放结算单');
        const settlement = this.selectedSettlement;
        ElementPlus.ElMessageBox.confirm('确认作废对账单 ' + this.current.id + '？作废后将释放结算单 ' + (settlement ? settlement.id : '') + '。', '作废对账单', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(() => {
          this.current.status = '已作废';
          if (settlement && settlement.reconciliationId === this.current.id) {
            settlement.occupancyStatus = 'available'; settlement.reconciliationId = '';
            try { if (settlement.id === 'S261105001') window.localStorage.removeItem('rebateSettlementOccupancyS261105001'); } catch (error) {}
          }
          ElementPlus.ElMessage.success('对账单已作废，原结算单占用已释放');
        }).catch(() => {});
      },
      statusType(value) { return value === '已确认' ? 'success' : value === '已作废' ? 'info' : 'warning'; },
      syncLabel(value) { return value === 'synced' ? '已同步' : (value === 'resubmit-failed' || value === 'sync-failed') ? '同步失败' : '草稿'; },
      money(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
      reconciliationMoney(value) { return Number(Number(value || 0).toFixed(2)); },
    },
    template: `
      <div class="flow-progress-layout">
        <section class="panel flow-panel-shell" data-tour="reconciliation-header">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>对账单确认</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--el-text-color-secondary)">当前演示对账单</span><el-select v-model="activeReconciliationId" size="small" style="width:145px" :teleported="false"><el-option v-for="item in reconciliations" :key="item.id" :label="item.id" :value="item.id"></el-option></el-select></div></div>
          <div class="panel-body"><el-descriptions :column="4" size="small" border><el-descriptions-item label="对账单号">{{ current.id }}</el-descriptions-item><el-descriptions-item label="供应商">{{ current.supplier }}</el-descriptions-item><el-descriptions-item label="结算年月">{{ current.settlementMonth }}</el-descriptions-item><el-descriptions-item label="状态"><el-tag size="small" :type="statusType(current.status)">{{ current.status }}</el-tag></el-descriptions-item><el-descriptions-item label="公司代码">{{ current.companyCode }}</el-descriptions-item><el-descriptions-item label="币种">{{ current.currency }}</el-descriptions-item></el-descriptions></div>
        </section>

        <section class="panel flow-panel-shell" data-tour="reconciliation-fee">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>附加费用</span></div><span style="font-size:12px;color:var(--el-text-color-secondary)">流水号必须从SAP同步成功且未占用的结算单中选择</span></div>
          <div class="panel-body">
            <el-table :data="selectedSettlement ? [selectedSettlement] : [{}]" size="small" stripe border style="width:100%">
              <el-table-column label="费用类型" width="150"><template v-slot:default>采购折让结算</template></el-table-column>
              <el-table-column label="流水号" min-width="220"><template v-slot:default><el-button type="primary" plain size="small" :disabled="current.status !== '待确认'" @click="openSelector"><i class="ri-list-check-2"></i><span>{{ selectedSettlement ? selectedSettlement.id : '选择结算单' }}</span></el-button></template></el-table-column>
              <el-table-column label="折让金额" width="150" align="right"><template v-slot:default>{{ selectedSettlement ? money(selectedSettlement.discountAmount) : '—' }}</template></el-table-column>
              <el-table-column label="币种" width="90"><template v-slot:default>{{ selectedSettlement ? selectedSettlement.currency : current.currency }}</template></el-table-column>
              <el-table-column label="占用状态" width="150"><template v-slot:default><el-tag v-if="selectedSettlement" size="small" :type="selectedSettlement.occupancyStatus === 'occupied' ? 'warning' : 'success'" effect="plain">{{ selectedSettlement.occupancyStatus === 'occupied' ? '已占用' : '待确认占用' }}</el-tag><span v-else>—</span></template></el-table-column>
              <el-table-column label="占用对账单号" width="150"><template v-slot:default>{{ selectedSettlement && selectedSettlement.reconciliationId ? selectedSettlement.reconciliationId : '—' }}</template></el-table-column>
            </el-table>
            <el-alert v-if="current.status === '已确认'" style="margin-top:12px" title="该结算单已被当前对账单占用，不能取消选择；只有作废整张对账单才能释放。" type="warning" :closable="false" show-icon></el-alert>
            <el-alert v-if="current.status === '已作废'" style="margin-top:12px" title="对账单已作废，原结算单占用状态已释放。" type="success" :closable="false" show-icon></el-alert>
          </div>
        </section>

        <section class="panel flow-panel-shell" data-tour="reconciliation-actions"><div class="panel-body" style="display:flex;justify-content:flex-end;gap:8px"><el-button v-if="current.status === '待确认'" type="primary" @click="confirmReconciliation">保存并确认</el-button><el-button v-if="current.status === '已确认'" type="danger" plain @click="voidReconciliation">作废对账单</el-button><el-button @click="createAnother">模拟另一张对账单</el-button></div></section>

        <el-dialog v-model="selectorOpen" title="选择结算单" width="88%" :append-to-body="false" :teleported="false" data-tour="reconciliation-selector">
          <el-table :data="settlements" size="small" stripe border :row-style="rowStyle" style="width:100%">
            <el-table-column prop="id" label="结算单号" width="126"></el-table-column><el-table-column prop="settlementMonth" label="结算年月" width="102"></el-table-column><el-table-column prop="accrualId" label="计提单号" width="126"></el-table-column><el-table-column prop="accrualMonth" label="计提年月" width="102"></el-table-column><el-table-column prop="companyCode" label="公司代码" width="94"></el-table-column><el-table-column prop="supplier" label="供应商" min-width="205" show-overflow-tooltip></el-table-column><el-table-column prop="currency" label="币种" width="72"></el-table-column><el-table-column prop="discountAmount" label="折让金额" width="120" align="right"><template v-slot:default="scope">{{ money(scope.row.discountAmount) }}</template></el-table-column><el-table-column prop="syncStatus" label="同步状态" width="105"><template v-slot:default="scope"><el-tag size="small" :type="scope.row.syncStatus === 'synced' ? 'success' : 'danger'">{{ syncLabel(scope.row.syncStatus) }}</el-tag></template></el-table-column><el-table-column prop="occupancyStatus" label="占用状态" min-width="210"><template v-slot:default="scope"><span v-if="scope.row.occupancyStatus === 'occupied'" style="color:var(--el-color-danger)">已被对账单{{ scope.row.reconciliationId }}占用</span><span v-else>未占用</span></template></el-table-column><el-table-column label="操作" width="86" fixed="right"><template v-slot:default="scope"><el-button link type="primary" size="small" :disabled="!isSelectable(scope.row)" @click="chooseSettlement(scope.row)">选择</el-button></template></el-table-column>
          </el-table>
          <template v-slot:footer><el-button @click="selectorOpen = false">关闭</el-button></template>
        </el-dialog>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/reconciliation-demo', name: '对账单附加费用演示', menuKey: 'rebateReconciliationDemo', component: componentName,
    breadcrumbs: ['对账管理', '对账单确认', '附加费用演示'], templateId: 'query-table-list-page', archetype: '查询表格列表页',
    tabInfo: '帮助采购结算专员在对账单附加费用中选择、占用并随作废释放结算单。',
    guideSteps: [
      { target: '[data-tour="reconciliation-header"]', title: '确认对账主体', description: '先核对对账单号、供应商、结算年月和当前状态。' },
      { target: '[data-tour="reconciliation-fee"]', title: '从流水号选择结算单', description: '流水号不是普通输入，必须打开选择窗口取得符合条件的结算单。' },
      { target: '[data-tour="reconciliation-selector"]', title: '识别可选与占用', description: 'SAP未同步或已被其他对账单占用的行会灰化并禁止选择。' },
      { target: '[data-tour="reconciliation-actions"]', title: '确认占用或作废释放', description: '保存确认会原子占用结算单；占用后不可取消选择，只有作废整单才能释放。' }
    ],
    noteSections: [
      { title: '业务目标', content: '本页演示对账单确认时如何从附加费用流水号选择折让结算单，并形成可追溯的占用关系。' },
      { title: '状态流转', content: '待确认对账单选择结算单后保存确认，结算单变为已占用；只有对账单作废才能恢复未占用。', diagram: { type: 'flow', nodes: [{ id: 'available', title: '未占用', tone: 'success' }, { id: 'selected', title: '已选择', tone: 'info' }, { id: 'occupied', title: '已占用', tone: 'warning' }, { id: 'voided', title: '对账作废', tone: 'neutral' }, { id: 'released', title: '已释放', tone: 'success' }], edges: [{ from: 'available', to: 'selected', label: '选择' }, { from: 'selected', to: 'occupied', label: '确认' }, { from: 'occupied', to: 'voided', label: '作废' }, { from: 'voided', to: 'released', label: '释放' }] } },
      { title: '上下游关系', content: '上游只接收SAP同步成功的结算单，下游把占用关系写入对账单并阻止其他对账单重复选择。', diagram: { type: 'relation', center: { title: '附加费用', meta: '选择与占用', tone: 'primary' }, upstream: [{ title: '结算单', meta: '已同步且未占用', tone: 'success' }, { title: '对账主体', meta: '公司供应商币种一致', tone: 'info' }], downstream: [{ title: '对账单确认', meta: '记录结算单号', tone: 'warning' }, { title: '占用控制', meta: '防止重复选择', tone: 'danger' }] } },
      { title: '关键规则', items: ['可选结算单必须SAP同步成功、未占用，且公司、供应商、币种和结算年月与当前对账单一致。', '保存确认时再次校验并占用；其他对账单随后打开窗口时该行不可选择。', '确认后不能通过取消选择释放，占用只允许随整张对账单作废而释放。', '已占用行必须显示占用对账单号，例如DZ260916008。'] }
    ]
  });
})(window);
