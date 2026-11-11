<script setup>
/** 页面 41 · 农残检测报告管理：上传、查看、管理农残检测报告、检测结论录入 */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { traceApi } from '@/api'
import { disabledFutureDate, notFutureValidator } from '@/utils/dateRule'
import { downloadPdf } from '@/utils/exportFile'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const batches = ref([])
const viewRow = ref(null)
const viewVisible = ref(false)

const form = reactive({ code: '', batchCode: '', item: '氯氰菊酯', result: '合格', org: '', date: '', file: '' })
const rules = {
  batchCode: [{ required: true, message: '请选择溯源批次', trigger: 'change' }],
  item: [{ required: true, message: '请输入检测项目', trigger: 'blur' }],
  org: [{ required: true, message: '请输入检测机构', trigger: 'blur' }],
  date: [
    { required: true, message: '请选择检测日期', trigger: 'change' },
    notFutureValidator('检测日期不能晚于今天'),
  ],
}

const columns = [
  { prop: 'code', label: '报告编号', width: 130 },
  { prop: 'batchCode', label: '溯源批次', width: 140 },
  { prop: 'crop', label: '作物', width: 90 },
  { prop: 'item', label: '检测项目', width: 110 },
  { prop: 'result', label: '检测结论', width: 95, align: 'center' },
  { prop: 'org', label: '检测机构', minWidth: 180 },
  { prop: 'date', label: '检测日期', width: 105 },
  { prop: 'file', label: '报告文件', width: 110 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '报告号 / 批次号 / 机构' },
  { key: 'result', label: '结论', type: 'select', options: cfg.statusOptionGroups.residue },
]

async function loadTable(params) {
  if (!batches.value.length) {
    const res = await traceApi.page({ page: 1, size: 50 })
    batches.value = res.list
  }
  return traceApi.residuePage(params)
}

function openCreate() {
  Object.assign(form, { code: '', batchCode: '', item: '氯氰菊酯', result: '合格', org: '', date: '', file: '' })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    const b = batches.value.find((x) => x.code === form.batchCode)
    await traceApi.createResidue({ ...form, crop: b?.crop, file: form.file || '检测报告.pdf' })
    ElMessage.success('检测报告登记成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
function viewReport(row) {
  viewRow.value = row
  viewVisible.value = true
}
async function changeResult(row) {
  const { value } = await ElMessageBox.prompt('录入/修正检测结论：', '检测结论录入', {
    inputType: 'textarea', inputValue: row.result, inputPlaceholder: '合格 / 不合格 + 备注',
  }).catch(() => ({ value: null }))
  if (value === null) return
  const result = value.startsWith('不合格') ? '不合格' : value.startsWith('合格') ? '合格' : row.result
  await traceApi.updateResidue(row.id, { result, note: value })
  ElMessage.success('检测结论已更新')
  tableRef.value?.reload(true)
}
function download(row) {
  downloadPdf(`${row.code}_农残检测报告`, {
    title: '农产品农药残留检测报告',
    meta: `报告编号：${row.code}　检测机构：${row.org}　检测日期：${row.date}`,
    headers: ['检测项目', '检测批次', '作物', '检测结果', '备注'],
    rows: [[row.item, row.batchCode, row.crop, row.result, row.note || '—']],
  })
  ElMessage.success(`《${row.code} 检测报告》PDF 已开始下载`)
}
</script>

<template>
  <div class="page">
    <PageHeader title="农残检测报告管理" desc="农残检测报告上传、查看与管理，检测结论统一录入，满足农产品质量安全监管要求">
      <template #actions>
        <el-button type="primary" :icon="'Upload'" @click="openCreate">登记报告</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" action-width="220">
      <template #col-code="{ row }">
        <span class="mono-num jc-code">{{ row.code }}</span>
      </template>
      <template #col-result="{ row }">
        <el-tag size="small" :type="row.result === '合格' ? 'success' : 'danger'" :effect="row.result === '合格' ? 'light' : 'dark'">
          {{ row.result === '合格' ? '✓ 合格' : '✕ 不合格' }}
        </el-tag>
      </template>
      <template #col-file="{ row }">
        <el-link type="primary" :underline="false" :icon="'Document'" @click="download(row)">{{ row.file }}</el-link>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="viewReport(row)">查看</el-button>
        <el-button link type="warning" @click="changeResult(row)">结论</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" title="农残检测报告登记" :rules="rules" :model="form" :submit-loading="submitting" width="560px" @submit="handleSubmit">
      <el-form-item label="溯源批次" prop="batchCode">
        <el-select v-model="form.batchCode" filterable style="width: 100%">
          <el-option v-for="b in batches" :key="b.code" :label="`${b.code} · ${b.crop}`" :value="b.code" />
        </el-select>
      </el-form-item>
      <el-form-item label="检测项目" prop="item">
        <el-select v-model="form.item" style="width: 200px">
          <el-option v-for="i in ['敌敌畏', '氯氰菊酯', '毒死蜱', '多菌灵', '甲拌磷', '克百威']" :key="i" :label="i" :value="i" />
        </el-select>
      </el-form-item>
      <el-form-item label="检测结论" prop="result">
        <el-radio-group v-model="form.result">
          <el-radio-button value="合格">合格</el-radio-button>
          <el-radio-button value="不合格">不合格</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="检测机构" prop="org">
        <el-input v-model="form.org" placeholder="如 市农产品质量安全检测中心" />
      </el-form-item>
      <el-form-item label="检测日期" prop="date">
        <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 200px" :disabled-date="disabledFutureDate" />
      </el-form-item>
      <el-form-item label="报告文件">
        <el-upload drag action="#" :auto-upload="false" :limit="1" accept=".pdf,.jpg,.png" :on-change="() => (form.file = '检测报告.pdf')">
          <el-icon :size="34" color="var(--ag-text-4)"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">支持 PDF / JPG / PNG，单文件 ≤ 20MB（登记后可在列表中下载报告）</div>
          </template>
        </el-upload>
      </el-form-item>
    </FormDialog>

    <!-- 报告查看 -->
    <el-dialog v-model="viewVisible" :title="`检测报告 · ${viewRow?.code || ''}`" width="520px">
      <el-descriptions v-if="viewRow" :column="1" border>
        <el-descriptions-item label="报告编号">{{ viewRow.code }}</el-descriptions-item>
        <el-descriptions-item label="溯源批次">{{ viewRow.batchCode }}（{{ viewRow.crop }}）</el-descriptions-item>
        <el-descriptions-item label="检测项目">{{ viewRow.item }}</el-descriptions-item>
        <el-descriptions-item label="检测结论">
          <el-tag :type="viewRow.result === '合格' ? 'success' : 'danger'">{{ viewRow.result }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="检测机构">{{ viewRow.org }}</el-descriptions-item>
        <el-descriptions-item label="检测日期">{{ viewRow.date }}</el-descriptions-item>
        <el-descriptions-item label="报告文件">{{ viewRow.file }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewVisible = false">关 闭</el-button>
        <el-button type="primary" :icon="'Download'" @click="download(viewRow)">下载报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.jc-code {
  font-weight: 700;
  color: var(--ag-blue-700);
}
</style>
