(function (window) {
  const componentName = 'RebateAccrualCreatePage';
  const STYLE_ID = 'rebate-accrual-create-style';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
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
      .opened-page-panel > .rebate-create-layout { height: 100%; min-height: 0; overflow-y: auto; padding-right: 2px; }
      .rebate-create-layout { gap: 12px; }
      .rebate-create-layout > .panel { flex: 0 0 auto; }
      .rebate-create-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 54px; padding: 10px 16px; background: var(--el-bg-color); }
      .rebate-create-toolbar-left, .rebate-create-toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .rebate-create-title { font-size: 16px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-create-main { padding: 0; overflow: hidden; }
      .rebate-create-main-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--el-border-color-lighter); background: var(--el-fill-color-extra-light); }
      .rebate-create-heading, .rebate-create-section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 650; color: var(--el-text-color-primary); }
      .rebate-create-heading { font-size: 15px; }
      .rebate-create-heading::before, .rebate-create-section-title::before { content: ''; width: 3px; height: 16px; border-radius: 2px; background: var(--el-color-primary); }
      .rebate-create-rule { display: flex; gap: 8px; align-items: flex-start; margin: 12px 16px 0; padding: 9px 11px; border-left: 3px solid var(--el-color-primary); background: var(--el-color-primary-light-9); color: var(--el-text-color-regular); font-size: 12px; line-height: 1.55; }
      .rebate-create-month-alert { width: auto; margin: 10px 16px 0; }
      .rebate-create-form-wrap { padding: 14px 16px 6px; }
      .rebate-create-section-title { margin: 2px 0 12px; }
      .rebate-create-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 18px; }
      .rebate-create-form-grid .el-form-item { margin-bottom: 12px; }
      .rebate-create-form-grid .el-form-item__label { height: 24px; padding: 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 20px; }
      .rebate-create-span-3 { grid-column: span 3; }
      .rebate-create-layout .el-input.is-disabled .el-input__wrapper { background: #f5f7fa; box-shadow: 0 0 0 1px #e4e7ed inset; }
      .rebate-create-layout .el-input.is-disabled .el-input__inner { -webkit-text-fill-color: var(--el-text-color-regular); }
      .rebate-create-editable .el-input__wrapper, .rebate-create-editable .el-select__wrapper, .rebate-create-editable .el-input-number { box-shadow: 0 0 0 1px var(--el-color-primary-light-5) inset; background: var(--el-color-primary-light-9); }
      .rebate-create-tabs { padding: 0 16px 14px; }
      .rebate-create-tabs .el-tabs__header { margin-bottom: 12px; }
      .rebate-create-table-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
      .rebate-create-table-actions { display: flex; align-items: center; gap: 10px; }
      .rebate-create-table .cell { font-size: 12px; }
      .rebate-create-empty { padding: 36px 16px; text-align: center; border: 1px dashed var(--el-border-color); background: var(--el-fill-color-extra-light); color: var(--el-text-color-secondary); }
      @media (max-width: 1180px) {
        .rebate-create-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .rebate-create-span-3 { grid-column: span 2; }
        .rebate-create-toolbar { align-items: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  ChintPrototypeShell.registerPageComponent(componentName, {
    name: componentName,
    data() {
      const pageData = ChintPrototypeShell.getMockData('rebateAccruals', {});
      const existingAccruals = deepClone(pageData.rows || []).map((row) => {
        if (row.id === 'A260916001') row.accrualMonth = '2026-09';
        return row;
      });
      return {
        existingAccruals,
        monthDuplicate: null,
        sourceReceiptLines: deepClone(pageData.receiptLines || []),
        receiptLines: [],
        activeTab: 'receipts',
        hasFetched: false,
        lastFetchTime: '',
        saved: false,
        submitted: false,
        submitting: false,
        selectedRowKeys: [],
        batchDialogOpen: false,
        batchUnitPrice: null,
        form: {
          id: '',
          status: '待保存',
          category: '玻璃',
          accrualMonth: '2026-08',
          companyCode: 'CN01',
          supplier: '嘉兴光伏玻璃制造有限公司',
          currency: 'CNY',

          remark: '按2026年8月玻璃采购协议计提折让。'
        },
        companyOptions: [
          { label: 'CN01 · 正泰新能科技股份有限公司', value: 'CN01' },
          { label: 'CN02 · 正泰新能义乌基地', value: 'CN02' }
        ],
        supplierOptions: [
          { label: '嘉兴光伏玻璃制造有限公司', value: '嘉兴光伏玻璃制造有限公司' },
          { label: '湖州新能源玻璃有限公司', value: '湖州新能源玻璃有限公司' }
        ],
        currencyOptions: [
          { label: '人民币 CNY', value: 'CNY' },
          { label: '美元 USD', value: 'USD' }
        ],
        formRules: {
          accrualMonth: [{ required: true, message: '请选择计提年月', trigger: 'change' }],
          companyCode: [{ required: true, message: '请选择公司代码', trigger: 'change' }],
          supplier: [{ required: true, message: '请选择供应商', trigger: 'change' }],
          currency: [{ required: true, message: '请选择币种', trigger: 'change' }],
        }
      };
    },
    computed: {
      originalAmount() {
        return roundMoney(this.displayedLines.reduce((sum, item) => sum + Number(item.amount || 0), 0));
      },
      discountAmount() {
        return roundMoney(this.displayedLines.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0));
      },
      afterAmount() {
        return roundMoney(this.displayedLines.reduce((sum, item) => sum + Number(item.afterAmount || 0), 0));
      },
      displayedLines() {
        return this.receiptLines.map((source) => {
          const line = deepClone(source);
          const amount = roundMoney(Number(line.amount || 0));
          const area = Number(line.area || 0);
          const unitPrice = Number(line.discountUnitPrice ?? 0);
          line.amount = amount;
          line.m2UntaxedUnitPrice = area === 0 ? 0 : roundMoney(amount / area);
          line.discountUnitPrice = line.discountUnitPrice === null || line.discountUnitPrice === undefined || line.discountUnitPrice === '' ? null : roundMoney(unitPrice);
          line.afterAmount = line.discountUnitPrice == null ? null : roundMoney(area * unitPrice);
          line.discountAmount = line.afterAmount == null ? null : roundMoney(amount - line.afterAmount);
          return line;
        });
      }
    },
    watch: {
      'form.accrualMonth'(value) {
        if (!this.submitted) {
          this.receiptLines = [];
          this.hasFetched = false;
          this.lastFetchTime = '';
          this.saved = false;
          this.form.status = this.form.id ? '草稿待更新' : '待保存';
        }
        this.checkMonthUniqueness(Boolean(value));
      }
    },
    mounted() {
      ensureStyles();
      this.checkMonthUniqueness(Boolean(this.form.accrualMonth));
    },
    methods: {
      goBack() {
        this.$emit('navigate', '#/rebate/accruals');
      },
      checkMonthUniqueness(showMessage) {
        if (!this.form.accrualMonth) {
          this.monthDuplicate = null;
          return true;
        }
        const duplicate = this.existingAccruals.find((row) => row.accrualMonth === this.form.accrualMonth && row.id !== this.form.id);
        this.monthDuplicate = duplicate || null;
        if (duplicate && showMessage) {
          ElementPlus.ElMessage.warning(this.form.accrualMonth + ' 已存在计提单 ' + duplicate.id + '，每个计提年月只能创建一张计提单，请直接进入原单据处理。');
        }
        return !duplicate;
      },
      onSelectionChange(rows) { this.selectedRowKeys = rows.map((row) => row.materialDoc + '-' + row.item); },
      updateLinePrice(row, value) { const key = row.materialDoc + '-' + row.item; const target = this.lines.find((line) => line.materialDoc + '-' + line.item === key); if (target) { target.discountUnitPrice = value; } },
      applyBatchUnitPrice() { if (!this.selectedRowKeys.length) return ElementPlus.ElMessage.warning('请先勾选收货明细'); if (this.batchUnitPrice === null || this.batchUnitPrice === undefined || this.batchUnitPrice === '') return ElementPlus.ElMessage.warning('请输入折让后M²不含税单价'); const keys = new Set(this.selectedRowKeys); this.lines.forEach((line) => { if (keys.has(line.materialDoc + '-' + line.item)) line.discountUnitPrice = Number(this.batchUnitPrice); }); this.batchDialogOpen = false; this.batchUnitPrice = null; this.selectedRowKeys = []; ElementPlus.ElMessage.success('已批量维护选中明细的折让后M²不含税单价'); },
      fetchReceipts() {
        if (!this.form.accrualMonth) {
          ElementPlus.ElMessage.warning('请先选择计提年月');
          return;
        }
        if (!this.checkMonthUniqueness(true)) return;
        this.receiptLines = deepClone(this.sourceReceiptLines).filter((item) => {
          return (!item.companyCode || item.companyCode === this.form.companyCode)
            && (!item.supplier || item.supplier === this.form.supplier)
            && (!item.category || item.category === this.form.category);
        });
        this.hasFetched = true;
        this.lastFetchTime = formatDateTime();
        ElementPlus.ElMessage.success('已按' + this.form.accrualMonth + '＋' + this.form.companyCode + '＋' + this.form.supplier + '＋玻璃获取' + this.receiptLines.length + '条收货记录');
      },
      validateForm(callback) {
        const formRef = this.$refs.createFormRef;
        if (!formRef) return;
        formRef.validate((valid) => {
          if (!valid) {
            ElementPlus.ElMessage.warning('请先补全必填信息');
            return;
          }
          if (!this.receiptLines.length) {
            ElementPlus.ElMessage.warning('请先获取与计提年月、玻璃品类匹配的收货记录');
            this.activeTab = 'receipts';
            return;
          }
          const missingPrice = this.receiptLines.find((line) => line.discountUnitPrice === null || line.discountUnitPrice === undefined || line.discountUnitPrice === '');
          if (missingPrice) { const idx = this.receiptLines.indexOf(missingPrice) + 1; ElementPlus.ElMessage.warning('第' + idx + '行未维护折让后M²不含税单价'); this.activeTab = 'receipts'; return; }
          const invalidLine = this.receiptLines.find((line) => {
            const area = Number(line.area);
            const amount = Number(line.amount);
            return (Number.isNaN(area) || Number.isNaN(amount))
              || ((area === 0 || line.area === '' || line.area == null) && amount !== 0)
              || (area !== 0 && (line.amount === '' || line.amount == null));
          });
          if (invalidLine) {
            const lineIndex = this.receiptLines.indexOf(invalidLine) + 1;
            ElementPlus.ElMessage.warning('第' + lineIndex + '行收货记录缺少有效玻璃面积或原金额，无法计算折后金额');
            this.activeTab = 'receipts';
            return;
          }
          callback();
        });
      },
      saveDraft() {
        if (this.submitted) {
          ElementPlus.ElMessage.info('当前计提单已同步SAP，无需重复保存草稿');
          return;
        }
        if (!this.checkMonthUniqueness(true)) return;
        this.validateForm(() => {
          if (!this.form.id) this.form.id = 'A260916009';
          this.saved = true;
          this.form.status = '草稿';
          ElementPlus.ElMessage.success('草稿已保存，系统生成计提单号 ' + this.form.id);
        });
      },
      submitToSap() {
        if (this.submitted) {
          ElementPlus.ElMessage.info('V1已同步SAP，请勿重复提交');
          return;
        }
        if (!this.checkMonthUniqueness(true)) return;
        this.validateForm(() => {
          const accrualId = this.form.id || 'A260916009';
          ElementPlus.ElMessageBox.confirm('提交后将为计提单 ' + accrualId + ' 生成正式版本V1并同步SAP。确认继续？', '提交并同步SAP', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            this.submitting = true;
            window.setTimeout(() => {
              this.form.id = accrualId;
              this.saved = true;
              this.submitted = true;
              this.form.status = '已同步';
              this.submitting = false;
              try {
                window.sessionStorage.setItem('rebateSelectedAccrualId', accrualId);
              } catch (error) {}
              ElementPlus.ElMessage.success('计提单 ' + accrualId + ' 已生成V1并成功同步SAP');
            }, 800);
          }).catch(() => {});
        });
      },
      formatMoney(value) {
        return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      }
    },
    template: `
      <div class="flow-progress-layout rebate-create-layout">
        <section class="panel rebate-create-toolbar" data-tour="rebate-create-toolbar">
          <div class="rebate-create-toolbar-left">
            <el-button link type="primary" size="small" @click="goBack"><i class="ri-arrow-left-line"></i><span>返回计提单管理</span></el-button>
            <span class="rebate-create-title">新增计提单</span>
          </div>
          <div class="rebate-create-toolbar-actions">
            <el-button size="small" :disabled="submitted" @click="saveDraft">保存草稿</el-button>
            <el-button type="primary" size="small" :loading="submitting" :disabled="submitted" @click="submitToSap">提交并同步SAP</el-button>
            <el-button size="small" @click="goBack">返回</el-button>
          </div>
        </section>

        <section class="panel rebate-create-main" data-tour="rebate-create-form">
          <div class="rebate-create-main-head">
            <div class="rebate-create-heading">【计提】折让计提单</div>
            <el-tag size="small" :type="submitted ? 'success' : saved ? 'warning' : 'info'">{{ form.status }}</el-tag>
          </div>
          <div class="rebate-create-rule"><i class="ri-information-line"></i><span>先选择计提年月、公司代码和供应商，系统按“年月＋公司代码＋供应商＋玻璃”获取收货记录；填写折让后M²不含税单价后实时计算折后金额和折让金额。保存草稿生成单号，提交SAP时生成V1。</span></div>
          <el-alert v-if="monthDuplicate" class="rebate-create-month-alert" type="error" :closable="false" show-icon :title="form.accrualMonth + ' 已存在计提单 ' + monthDuplicate.id + '，每个计提年月只能创建一张计提单，请直接进入原单据处理。'"></el-alert>
          <div class="rebate-create-form-wrap">
            <el-form ref="createFormRef" :model="form" :rules="formRules" label-position="top" size="small">
              <div class="rebate-create-section-title"><span>基本信息</span></div>
              <div class="rebate-create-form-grid">
                <el-form-item label="计提单号"><el-input :model-value="form.id || '保存后系统自动生成'" disabled></el-input></el-form-item>
                <el-form-item label="处理状态"><el-input :model-value="form.status" disabled></el-input></el-form-item>
                <el-form-item label="品类"><el-input v-model="form.category" disabled></el-input></el-form-item>
                <el-form-item label="计提年月" prop="accrualMonth" class="rebate-create-editable"><el-date-picker v-model="form.accrualMonth" type="month" value-format="YYYY-MM" format="YYYY年MM月" style="width:100%" :disabled="submitted" :teleported="false"></el-date-picker></el-form-item>
                <el-form-item label="公司代码" prop="companyCode" class="rebate-create-editable"><el-select v-model="form.companyCode" style="width:100%" :disabled="submitted" :teleported="false"><el-option v-for="item in companyOptions" :key="item.value" :label="item.label" :value="item.value"></el-option></el-select></el-form-item>
                <el-form-item label="供应商" prop="supplier" class="rebate-create-editable"><el-select v-model="form.supplier" style="width:100%" :disabled="submitted" :teleported="false"><el-option v-for="item in supplierOptions" :key="item.value" :label="item.label" :value="item.value"></el-option></el-select></el-form-item>
                <el-form-item label="币种" prop="currency" class="rebate-create-editable"><el-select v-model="form.currency" style="width:100%" :disabled="submitted" :teleported="false"><el-option v-for="item in currencyOptions" :key="item.value" :label="item.label" :value="item.value"></el-option></el-select></el-form-item>

                <el-form-item label="收货记录数"><el-input :model-value="receiptLines.length + ' 条'" disabled></el-input></el-form-item>
              </div>

              <div class="rebate-create-section-title"><span>折让计算</span></div>
              <div class="rebate-create-form-grid">
                <el-form-item label="原金额"><el-input :model-value="formatMoney(originalAmount)" disabled><template v-slot:append>{{ form.currency }}</template></el-input></el-form-item>
                <el-form-item label="折让计提金额"><el-input :model-value="formatMoney(discountAmount)" disabled><template v-slot:append>{{ form.currency }}</template></el-input></el-form-item>
                <el-form-item label="折后金额"><el-input :model-value="formatMoney(afterAmount)" disabled><template v-slot:append>{{ form.currency }}</template></el-input></el-form-item>
                <el-form-item label="备注" class="rebate-create-span-3"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit :disabled="submitted"></el-input></el-form-item>
              </div>
            </el-form>
          </div>
        </section>

        <section class="panel rebate-create-tabs" data-tour="rebate-create-receipts">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="收货明细" name="receipts">
              <div class="rebate-create-table-head">
                <span>{{ hasFetched ? ('最近获取：' + lastFetchTime + ' · 共' + receiptLines.length + '条') : '尚未获取收货记录' }}</span>
                <div class="rebate-create-table-actions"><span>已选 {{ selectedRowKeys.length }} 条</span><el-button size="small" :disabled="!selectedRowKeys.length" @click="batchDialogOpen = true">批量维护折让后M²不含税单价</el-button><span>匹配条件：{{ form.accrualMonth || '未选择' }}＋{{ form.companyCode }}＋{{ form.supplier }}＋{{ form.category }}</span><el-button type="primary" size="small" :disabled="submitted" @click="fetchReceipts"><i class="ri-refresh-line"></i><span>获取最新收货记录</span></el-button></div>
              </div>
              <el-table v-if="displayedLines.length" class="rebate-create-table" :data="displayedLines" @selection-change="onSelectionChange" size="small" stripe border max-height="360" style="width:100%">
                <el-table-column type="selection" width="48" :selectable="() => !submitted"></el-table-column><el-table-column prop="materialDoc" label="物料凭证" width="112" fixed="left"></el-table-column>
                <el-table-column prop="item" label="行项目" width="76"></el-table-column>
                <el-table-column prop="receiptDate" label="入库日期" width="106"></el-table-column>
                <el-table-column prop="purchaseOrder" label="采购订单" width="112"></el-table-column>
                <el-table-column prop="purchaseOrderItem" label="采购订单行" width="104"></el-table-column>
                <el-table-column prop="plant" label="工厂" width="76"></el-table-column>
                <el-table-column prop="material" label="物料编码" width="112"></el-table-column>
                <el-table-column prop="materialName" label="物料名称" min-width="170" show-overflow-tooltip></el-table-column>
                <el-table-column prop="quantity" label="数量" width="96" align="right"><template v-slot:default="scope">{{ Number(scope.row.quantity || 0).toLocaleString('zh-CN') }}</template></el-table-column>
                <el-table-column prop="area" label="面积" width="104" align="right"><template v-slot:default="scope">{{ Number(scope.row.area || 0).toFixed(4) }}</template></el-table-column>
                <el-table-column prop="unitPrice" label="单价" width="94" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.unitPrice) }}</template></el-table-column>
                <el-table-column prop="m2UntaxedUnitPrice" label="原M²不含税单价" width="142" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.m2UntaxedUnitPrice) }}</template></el-table-column>
                <el-table-column prop="discountUnitPrice" label="折让后M²不含税单价" width="190" align="right"><template v-slot:default="scope"><el-input-number v-if="!submitted" :model-value="scope.row.discountUnitPrice" @change="updateLinePrice(scope.row, $event)" :precision="4" :step="0.0001" controls-position="right" style="width:170px"></el-input-number><span v-else>{{ formatMoney(scope.row.discountUnitPrice) }}</span></template></el-table-column>
                <el-table-column prop="amount" label="原金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.amount) }}</template></el-table-column>
                <el-table-column prop="discountAmount" label="折让金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.discountAmount) }}</template></el-table-column>
                <el-table-column prop="afterAmount" label="折后金额" width="118" align="right"><template v-slot:default="scope">{{ formatMoney(scope.row.afterAmount) }}</template></el-table-column>
              </el-table>
              <div v-else class="rebate-create-empty"><i class="ri-inbox-archive-line"></i><p>请选择计提年月后点击“获取最新收货记录”</p></div>
            </el-tab-pane>
          </el-tabs>
        </section>
        <el-dialog v-model="batchDialogOpen" title="批量维护折让后M²不含税单价" width="420px"><el-form label-width="145px"><el-form-item label="已选明细数"><span>{{ selectedRowKeys.length }} 条</span></el-form-item><el-form-item label="折让后M²不含税单价"><el-input-number v-model="batchUnitPrice" :precision="4" :step="0.0001" style="width:100%"></el-input-number></el-form-item></el-form><template v-slot:footer><el-button @click="batchDialogOpen=false">取消</el-button><el-button type="primary" @click="applyBatchUnitPrice">确定</el-button></template></el-dialog>
      </div>
    `
  });

  ChintPrototypeShell.registerRoute({
    path: '#/rebate/accrual-create',
    name: '新增计提单',
    tabTitle: '新增计提单',
    menuKey: 'rebateAccrualCreate',
    component: componentName,
    breadcrumbs: ['折让管理', '计提单管理', '新增计提单'],
    templateId: 'query-table-list-page',
    archetype: '全页业务创建（沿用查询表格视觉基线）',
    tabInfo: '帮助采购结算专员新建玻璃计提单、获取收货记录、填写折让后M²不含税单价并保存草稿或同步SAP。',
    guideSteps: [
      { target: '[data-tour="rebate-create-toolbar"]', title: '保存或提交计提单', description: '顶部操作条集中完成保存草稿、提交并同步SAP以及返回计提单管理。' },
      { target: '[data-tour="rebate-create-form"]', title: '填写计提头信息', description: '选择计提年月、公司代码、供应商和币种；品类默认玻璃且不可修改。' },
      { target: '[data-tour="rebate-create-receipts"]', title: '获取匹配收货记录', description: '按计提年月、公司代码、供应商与玻璃品类获取真实收货记录，并汇总原金额。' },
      { target: '[data-tour="rebate-create-form"] .rebate-create-editable', title: '录入折让后M²不含税单价', description: '填写折让后M²不含税单价后，头部汇总和每条收货记录的折让金额、折后金额都会实时重算。' },
      { target: '[data-tour="rebate-create-toolbar"] .rebate-create-toolbar-actions', title: '生成单号与正式版本', description: '保存草稿后生成A260916009；提交SAP成功后生成V1并将状态更新为已同步。' }
    ],
    noteSections: [
      {
        title: '业务目标',
        content: '本页帮助采购结算专员新建玻璃折让计提单，通过年月和品类获取收货记录，录入折让后M²不含税单价并保存或提交SAP。',
        items: ['品类固定为玻璃；计提单号由系统在保存草稿时按“A＋6位日期＋3位流水号”生成。', '本次主演新建业务例生成单号A260916009，首次提交SAP生成正式版本V1。']
      },
      {
        title: '创建流程',
        content: '新建计提单先补全头信息，再获取匹配收货记录、录入折让后M²不含税单价并确认金额，最后保存草稿或提交SAP。',
        diagram: {
          type: 'flow',
          caption: '新增计提单从头信息到SAP V1的业务流程。',
          nodes: [
            { id: 'create', title: '新建计提', meta: '选择年月与公司', tone: 'info' },
            { id: 'receipt', title: '获取收货', meta: '按年月＋玻璃匹配', tone: 'info' },
            { id: 'rate', title: '录入折后单价', meta: '实时重算折让金额', tone: 'warning' },
            { id: 'draft', title: '保存草稿', meta: '生成A260916009', tone: 'neutral' },
            { id: 'sap', title: 'SAP V1', meta: '提交成功后生效', tone: 'success' }
          ],
          edges: [
            { from: 'create', to: 'receipt', label: '查询' },
            { from: 'receipt', to: 'rate', label: '计算' },
            { from: 'rate', to: 'draft', label: '保存' },
            { from: 'draft', to: 'sap', label: '提交' }
          ]
        }
      },
      {
        title: '上下游关系',
        content: '新增计提单从采购收货记录取得金额基础，并在首次提交后把V1同步到SAP。',
        diagram: {
          type: 'relation',
          caption: '收货记录与折让协议共同形成计提单，并同步到SAP。',
          center: { title: '新增计提单', meta: '取数、计算、保存、提交', tone: 'primary' },
          upstream: [
            { title: '收货记录', meta: '提供数量、价格和原金额', tone: 'info' },
            { title: '折让协议', meta: '提供折让后M²不含税单价依据', tone: 'warning' }
          ],
          downstream: [
            { title: 'SAP计提', meta: '接收首次正式版本V1', tone: 'success' },
            { title: '计提单管理', meta: '持续维护与版本追溯', tone: 'success' }
          ]
        }
      },
      {
        title: '关键规则',
        items: ['计提年月全局唯一；选择年月时立即提示已存在单号，保存与提交时再次校验，重复月份不得生成新的A单号。', '未选择计提年月、公司代码、供应商、币种或折让后M²不含税单价时不可保存和提交；0和负数单价均为有效值。', '未获取收货记录时不可保存和提交；重复获取同一年月与品类会刷新结果，不重复追加数据。', '原M²不含税单价按原金额÷面积计算；折后金额按面积×折让后M²不含税单价计算；折让金额等于原金额减折后金额，允许为负数。', '面积为空或为0且原金额不为0时阻断保存和提交；面积和原金额同时为0时允许保留。', '保存草稿只生成计提单号，不生成版本号；首次提交SAP成功后才生成V1。']
      }
    ]
  });
})(window);
