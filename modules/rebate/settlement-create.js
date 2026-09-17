(function (window) {
  const componentName = 'RebateSettlementCreatePage';

  const accrualCandidates = [
    { id: 'A260930021', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '嘉兴光伏玻璃制造有限公司', category: '玻璃', currency: 'CNY', sapVersion: 'V1', syncStatus: '已同步' },
    { id: 'A260930022', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '湖州新能源玻璃有限公司', category: '玻璃', currency: 'CNY', sapVersion: 'V1', syncStatus: '已同步' },
    { id: 'A260930023', accrualMonth: '2026-10', companyCode: 'CN01', supplier: '湖州新能源玻璃有限公司', category: '玻璃', currency: 'CNY', sapVersion: 'V2', syncStatus: '已同步' }
  ];
  const receiptSeed = [
    { materialDoc: '5101948201', item: '0010', receiptDate: '2026-11-06', purchaseOrder: '4500891042', purchaseOrderItem: '00010', plant: '1101', material: 'PVG-20-HC', materialName: '2.0mm高透光伏玻璃', quantity: 12000, unitPrice: 28.65, area: 24000.00, m2UntaxedPrice: 14.3250, amount: 343800.00 },
    { materialDoc: '5101963358', item: '0020', receiptDate: '2026-11-17', purchaseOrder: '4500891042', purchaseOrderItem: '00020', plant: '1101', material: 'PVG-32-BF', materialName: '3.2mm背板玻璃', quantity: 8000, unitPrice: 31.42, area: 25600.00, m2UntaxedPrice: 9.8188, amount: 251360.00 },
    { materialDoc: '5101970064', item: '0010', receiptDate: '2026-11-25', purchaseOrder: '4500896608', purchaseOrderItem: '00010', plant: '1101', material: 'PVG-20-AR', materialName: '2.0mm镀膜光伏玻璃退货', quantity: -500, unitPrice: 29.41, area: -1000.00, m2UntaxedPrice: 14.7050, amount: -14705.00 }
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function moneyRound(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000; }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      return {
        form: { id: '', settlementMonth: '2026-11', accrualMonth: '2026-09', companyCode: 'CN01', supplier: '嘉兴光伏玻璃制造有限公司', category: '玻璃', currency: 'CNY', discountUnitPrice: 22.0000, accrualId: '', occupancyStatus: '未占用', syncStatus: '草稿', sapVersion: '—' },
        companyOptions: ['CN01', 'CN02'],
        supplierOptions: ['嘉兴光伏玻璃制造有限公司', '湖州新能源玻璃有限公司', '安徽高透光伏材料有限公司'],
        currencyOptions: ['CNY', 'USD'],
        lines: [], matchedCandidates: [], candidateDialogOpen: false, noMatchMessage: '', duplicateMessage: '', saved: false, submitting: false,
        rules: {
          settlementMonth: [{ required: true, message: '请选择结算年月', trigger: 'change' }],
          accrualMonth: [{ required: true, message: '请选择计提年月', trigger: 'change' }],
          companyCode: [{ required: true, message: '请选择公司代码', trigger: 'change' }],
          supplier: [{ required: true, message: '请选择供应商', trigger: 'change' }]
        }
      };
    },
    computed: {
      originalAmount() { return moneyRound(this.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)); },
      discountAmount() { return moneyRound(this.lines.reduce((sum, line) => sum + Number(line.discountAmount || 0), 0)); },
      afterAmount() { return moneyRound(this.lines.reduce((sum, line) => sum + Number(line.afterAmount || 0), 0)); },
      canSubmit() { return this.saved && this.form.id && this.lines.length && this.form.syncStatus !== '已同步'; }
    },
    watch: {
      'form.discountUnitPrice': function () { this.recalculate(); this.markChanged(); },
      'form.companyCode': function () { this.clearMatch(); },
      'form.supplier': function () { this.clearMatch(); },
      'form.accrualMonth': function () { this.clearMatch(); },
      'form.settlementMonth': function () { this.duplicateMessage = this.existingSettlementMessage(); }
    },
    methods: {
      clearMatch() {
        if (!this.form.accrualId && !this.lines.length) return;
        this.form.accrualId = ''; this.lines = []; this.saved = false; this.noMatchMessage = '';
      },
      markChanged() { if (this.form.syncStatus === '草稿') this.saved = false; },
      matchingAccruals() {
        const mock = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
        const candidates = Array.isArray(mock.accrualOptions) && mock.accrualOptions.length ? mock.accrualOptions : accrualCandidates;
        return candidates.filter((item) => item.accrualMonth === this.form.accrualMonth && (item.syncStatus === '已同步' || item.syncStatus === 'synced'));
      },
      existingSettlementMessage() {
        const mock = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
        const existing = (mock.rows || []).find((row) => row.settlementMonth === this.form.settlementMonth && row.id !== this.form.id);
        return existing ? this.form.settlementMonth + ' 已存在结算单 ' + existing.id + '，每个结算年月只能创建一张结算单，请直接进入原单据处理。' : '';
      },
      getReceipts() {
        this.noMatchMessage = '';
        const matches = this.matchingAccruals();
        this.matchedCandidates = clone(matches);
        if (!matches.length) {
          this.form.accrualId = ''; this.lines = [];
          this.noMatchMessage = '未找到' + this.form.accrualMonth + '对应的计提单，请先完成该月份计提单。';
          return ElementPlus.ElMessage.warning(this.noMatchMessage);
        }
        return this.selectAccrual(matches[0], true);
      },
      selectAccrual(row, automatic) {
        this.form.accrualId = row.id;
        this.form.currency = row.currency;
        const mock = ChintPrototypeShell.getMockData('rebateSettlements', {}) || {};
        const independentLines = Array.isArray(mock.settlementReceiptLines) && mock.settlementReceiptLines.length ? mock.settlementReceiptLines : receiptSeed;
        this.lines = clone(independentLines).filter((line) => {
          return (!line.settlementMonth || line.settlementMonth === this.form.settlementMonth)
            && (!line.companyCode || line.companyCode === this.form.companyCode)
            && (!line.supplier || line.supplier === this.form.supplier)
            && (!line.category || line.category === '玻璃');
        }).map((line) => ({ ...line, amount: moneyRound(line.amount), m2UntaxedPrice: Number(line.area || 0) === 0 ? 0 : moneyRound(Number(line.amount || 0) / Number(line.area || 0)), discountUnitPrice: moneyRound(Number(this.form.discountUnitPrice ?? 0)) }));
        this.recalculate(); this.saved = false; this.candidateDialogOpen = false;
        ElementPlus.ElMessage.success((automatic ? '已自动匹配计提单 ' : '已选择计提单 ') + row.id + '，并获取 ' + this.lines.length + ' 条收货记录');
      },
      recalculate() {
        const unitPrice = Number(this.form.discountUnitPrice ?? 0);
        this.lines.forEach((line) => {
          const amount = moneyRound(Number(line.amount || 0));
          const area = Number(line.area || 0);
          line.amount = amount;
          line.m2UntaxedPrice = area === 0 ? 0 : moneyRound(amount / area);
          line.discountUnitPrice = moneyRound(unitPrice);
          line.afterAmount = moneyRound(area * unitPrice);
          line.discountAmount = moneyRound(amount - line.afterAmount);
        });
      },
      validateReady(callback) {
        const ref = this.$refs.settlementFormRef;
        if (!ref) return;
        ref.validate((valid) => {
          if (!valid) return ElementPlus.ElMessage.warning('请补全结算单必填信息');
          this.duplicateMessage = this.existingSettlementMessage();
          if (this.duplicateMessage) return ElementPlus.ElMessage.error(this.duplicateMessage);
          if (!this.form.accrualId || !this.lines.length) return ElementPlus.ElMessage.warning('请先匹配计提单并获取收货记录');
          if (this.form.discountUnitPrice === null || this.form.discountUnitPrice === undefined || this.form.discountUnitPrice === '') return ElementPlus.ElMessage.warning('请输入折让后M²不含税单价');
          const invalidLine = this.lines.find((line) => {
            const area = Number(line.area);
            const amount = Number(line.amount);
            return Number.isNaN(area) || Number.isNaN(amount)
              || ((area === 0 || line.area === '' || line.area == null) && amount !== 0)
              || (area !== 0 && (line.amount === '' || line.amount == null));
          });
          if (invalidLine) {
            const lineIndex = this.lines.indexOf(invalidLine) + 1;
            return ElementPlus.ElMessage.warning('第' + lineIndex + '行收货记录缺少有效玻璃面积或原金额，无法计算折后金额');
          }
          callback();
        });
      },
      saveDraft() {
        this.validateReady(() => {
          if (!this.form.id) this.form.id = 'S261105001';
          this.saved = true; this.form.syncStatus = '草稿';
          ElementPlus.ElMessage.success('结算单 ' + this.form.id + ' 已保存，尚未提交SAP');
        });
      },
      submitSap() {
        if (!this.saved) return ElementPlus.ElMessage.warning('请先保存结算单，再提交SAP');
        if (!this.canSubmit) return ElementPlus.ElMessage.info('当前结算单已同步，无需重复提交');
        ElementPlus.ElMessageBox.confirm('确认将结算单 ' + this.form.id + ' 提交SAP？', '提交SAP', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(() => {
          this.submitting = true;
          window.setTimeout(() => {
            this.form.syncStatus = '已同步'; this.form.sapVersion = 'V1'; this.submitting = false;
            ElementPlus.ElMessage.success('提交成功，SAP生效版本为V1');
          }, 800);
        }).catch(() => {});
      },
      backList() { this.$emit('navigate', '#/rebate/settlements'); },
      money(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); },
      area(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); }
    },
    template: `
      <div class="flow-progress-layout">
        <section class="panel flow-panel-shell" data-tour="settlement-create-form">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>结算单基本信息</span></div><div style="display:flex;gap:8px"><el-tag size="small" :type="form.syncStatus === '已同步' ? 'success' : 'info'">{{ form.syncStatus }}</el-tag><el-tag size="small" type="success" effect="plain">{{ form.occupancyStatus }}</el-tag></div></div>
          <div class="panel-body">
            <el-form ref="settlementFormRef" :model="form" :rules="rules" label-width="104px" size="small">
              <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:0 18px">
                <el-form-item label="结算单号"><el-input :model-value="form.id || '保存后自动生成'" disabled></el-input></el-form-item>
                <el-form-item label="结算年月" prop="settlementMonth"><el-date-picker v-model="form.settlementMonth" type="month" value-format="YYYY-MM" format="YYYY年MM月" style="width:100%" :teleported="false"></el-date-picker></el-form-item>
                <el-form-item label="计提年月" prop="accrualMonth"><el-date-picker v-model="form.accrualMonth" type="month" value-format="YYYY-MM" format="YYYY年MM月" style="width:100%" :teleported="false"></el-date-picker></el-form-item>
                <el-form-item label="公司代码" prop="companyCode"><el-select v-model="form.companyCode" style="width:100%" :teleported="false"><el-option v-for="item in companyOptions" :key="item" :label="item" :value="item"></el-option></el-select></el-form-item>
                <el-form-item label="供应商" prop="supplier"><el-select v-model="form.supplier" style="width:100%" filterable :teleported="false"><el-option v-for="item in supplierOptions" :key="item" :label="item" :value="item"></el-option></el-select></el-form-item>
                <el-form-item label="品类"><el-input v-model="form.category" disabled></el-input></el-form-item>
                <el-form-item label="币种"><el-select v-model="form.currency" style="width:100%" :teleported="false"><el-option v-for="item in currencyOptions" :key="item" :label="item" :value="item"></el-option></el-select></el-form-item>
                <el-form-item label="折让后M²不含税单价"><el-input-number v-model="form.discountUnitPrice" :precision="4" :step="0.0001" style="width:100%"></el-input-number></el-form-item>
                <el-form-item label="关联计提单"><el-input :model-value="form.accrualId || '请先获取收货记录'" disabled><template v-slot:append><el-button @click="getReceipts">匹配</el-button></template></el-input></el-form-item>
                <el-form-item label="占用状态"><el-input v-model="form.occupancyStatus" disabled></el-input></el-form-item>
                <el-form-item label="SAP生效版本"><el-input v-model="form.sapVersion" disabled></el-input></el-form-item>
                <el-form-item label="同步状态"><el-input v-model="form.syncStatus" disabled></el-input></el-form-item>
              </div>
            </el-form>
            <el-alert v-if="duplicateMessage" :title="duplicateMessage" type="error" :closable="false" show-icon></el-alert>
            <el-alert v-if="noMatchMessage" :title="noMatchMessage" type="warning" :closable="false" show-icon></el-alert>
          </div>
        </section>

        <section class="panel table-panel flow-panel-shell" data-tour="settlement-create-lines">
          <div class="panel-head"><div class="panel-title"><span class="bar"></span><span>收货记录与折让计算</span></div><el-button type="primary" plain size="small" @click="getReceipts"><i class="ri-download-cloud-2-line"></i><span>获取收货记录</span></el-button></div>
          <div class="panel-body">
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px">
              <div style="padding:10px 12px;background:var(--el-fill-color-light);border-radius:6px"><div style="font-size:12px;color:var(--el-text-color-secondary)">原金额</div><strong>{{ money(originalAmount) }} {{ form.currency }}</strong></div>
              <div style="padding:10px 12px;background:var(--el-color-warning-light-9);border-radius:6px"><div style="font-size:12px;color:var(--el-text-color-secondary)">折让金额</div><strong>{{ money(discountAmount) }} {{ form.currency }}</strong></div>
              <div style="padding:10px 12px;background:var(--el-color-success-light-9);border-radius:6px"><div style="font-size:12px;color:var(--el-text-color-secondary)">折后金额</div><strong>{{ money(afterAmount) }} {{ form.currency }}</strong></div>
            </div>
            <div class="flow-grid-table-wrap">
              <el-table class="flow-grid-table" :data="lines" row-key="materialDoc" height="100%" min-height="220" stripe border empty-text="请点击“获取收货记录”" style="width:100%">
                <el-table-column prop="materialDoc" label="物料凭证" width="112"></el-table-column><el-table-column prop="item" label="行项目" width="76"></el-table-column><el-table-column prop="receiptDate" label="入库日期" width="108"></el-table-column><el-table-column prop="purchaseOrder" label="采购订单" width="112"></el-table-column><el-table-column prop="materialName" label="物料" min-width="180" show-overflow-tooltip></el-table-column>
                <el-table-column prop="quantity" label="数量" width="100" align="right"><template v-slot:default="scope">{{ money(scope.row.quantity) }}</template></el-table-column><el-table-column prop="unitPrice" label="单价" width="96" align="right"><template v-slot:default="scope">{{ money(scope.row.unitPrice) }}</template></el-table-column><el-table-column prop="area" label="面积(m²)" width="110" align="right"><template v-slot:default="scope">{{ area(scope.row.area) }}</template></el-table-column><el-table-column prop="m2UntaxedPrice" label="原M²不含税单价" width="142" align="right"><template v-slot:default="scope">{{ money(scope.row.m2UntaxedPrice) }}</template></el-table-column><el-table-column prop="discountUnitPrice" label="折让后M²不含税单价" width="160" align="right"><template v-slot:default="scope">{{ money(scope.row.discountUnitPrice) }}</template></el-table-column><el-table-column prop="amount" label="原金额" width="118" align="right"><template v-slot:default="scope">{{ money(scope.row.amount) }}</template></el-table-column><el-table-column prop="discountAmount" label="折让金额" width="118" align="right"><template v-slot:default="scope">{{ money(scope.row.discountAmount) }}</template></el-table-column><el-table-column prop="afterAmount" label="折后金额" width="118" align="right"><template v-slot:default="scope">{{ money(scope.row.afterAmount) }}</template></el-table-column>
              </el-table>
            </div>
            <div class="table-footer"><span style="font-size:12px;color:var(--el-text-color-secondary)">共 {{ lines.length }} 条；退货数量、金额及折让金额均保留负号</span></div>
          </div>
        </section>

        <section class="panel flow-panel-shell" data-tour="settlement-create-actions"><div class="panel-body" style="display:flex;justify-content:flex-end;gap:8px"><el-button type="primary" :loading="submitting" @click="submitSap">提交SAP</el-button><el-button @click="saveDraft">保存</el-button><el-button @click="backList">返回列表</el-button></div></section>

        <el-dialog v-model="candidateDialogOpen" title="选择对应计提单" width="760px" :append-to-body="false" :teleported="false">
          <el-table :data="matchedCandidates" size="small" stripe border highlight-current-row @current-change="selectAccrual"><el-table-column prop="id" label="计提单号" width="130"></el-table-column><el-table-column prop="accrualMonth" label="计提年月" width="105"></el-table-column><el-table-column prop="companyCode" label="公司代码" width="95"></el-table-column><el-table-column prop="supplier" label="供应商" min-width="210"></el-table-column><el-table-column prop="sapVersion" label="SAP版本" width="90"></el-table-column><el-table-column label="操作" width="80"><template v-slot:default="scope"><el-button link type="primary" size="small" @click="selectAccrual(scope.row, false)">选择</el-button></template></el-table-column></el-table>
          <template v-slot:footer><el-button @click="candidateDialogOpen = false">取消</el-button></template>
        </el-dialog>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/settlement-create', name: '新增结算单', menuKey: 'rebateSettlementCreate', component: componentName,
    breadcrumbs: ['折让管理', '结算单管理', '新增结算单'], templateId: 'query-table-list-page', archetype: '独立业务表单页',
    tabInfo: '帮助采购结算专员匹配已同步计提单、获取收货记录并生成折让结算单。',
    guideSteps: [
      { target: '[data-tour="settlement-create-form"]', title: '填写结算条件', description: '分别填写结算年月和计提年月，再选择公司、供应商、币种与折让后M²不含税单价。' },
      { target: '[data-tour="settlement-create-form"] .el-input-group__append', title: '匹配计提单', description: '系统只按计提年月匹配唯一的已同步计提单号，不复制计提单明细。' },
      { target: '[data-tour="settlement-create-lines"]', title: '核对收货与金额', description: '获取收货记录后逐行计算折让金额和折后金额，退货记录继续保留负数。' },
      { target: '[data-tour="settlement-create-actions"]', title: '保存并提交SAP', description: '保存生成S开头结算单号，随后提交SAP生成V1生效版本。' }
    ],
    noteSections: [
      { title: '业务目标', content: '本页帮助采购结算专员从已同步计提单创建玻璃折让结算单，明确区分结算年月与原计提年月。' },
      { title: '状态流转', content: '匹配计提单并获取收货记录后保存草稿，系统生成结算单号；提交SAP成功后形成V1。', diagram: { type: 'flow', nodes: [{ id: 'match', title: '匹配计提', tone: 'info' }, { id: 'receipt', title: '获取收货', tone: 'info' }, { id: 'draft', title: '保存草稿', tone: 'warning' }, { id: 'v1', title: 'SAP V1', tone: 'success' }], edges: [{ from: 'match', to: 'receipt', label: '带出' }, { from: 'receipt', to: 'draft', label: '保存' }, { from: 'draft', to: 'v1', label: '提交' }] } },
      { title: '上下游关系', content: '上游是已同步计提单及其收货快照，下游是SAP结算数据和对账单附加费用。', diagram: { type: 'relation', center: { title: '新增结算单', meta: '折让计算与提交', tone: 'primary' }, upstream: [{ title: '计提单', meta: '提供计提关系', tone: 'info' }, { title: '收货记录', meta: '提供逐行金额', tone: 'info' }], downstream: [{ title: 'SAP', meta: '生成V1', tone: 'success' }, { title: '对账单', meta: '后续选择占用', tone: 'warning' }] } },
      { title: '关键规则', items: ['同一结算年月只能存在一张结算单，选择年月和保存时各校验一次。', '计提年月只自动带出唯一计提单号，不复制其收货明细；无匹配时不能保存。', '收货记录按结算年月、公司代码、供应商和玻璃品类独立获取。', '原M²不含税单价按原金额÷面积计算，折后金额按面积×折让后M²不含税单价计算，折让金额等于原金额减折后金额，允许为负数；金额统一保留四位。'] }
    ]
  });
})(window);
