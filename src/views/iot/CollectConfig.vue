<script setup>
/** 页面 19 · 采集参数配置：自定义采集频率、数据过滤规则、异常值处理 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, StatusTag } from '@/components/ui'
import { controlApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const config = reactive({
  defaultInterval: 300, retentionDays: 365, filterRule: '3σ去噪 + 中值滤波', anomalyPolicy: '标记并告警',
})
const deviceList = ref([])
const loading = ref(true)
const saving = ref(false)

const INTERVALS = cfg.collectIntervals
const FILTERS = cfg.collectFilters
const ANOMALY = cfg.collectAnomalyPolicies

async function load() {
  loading.value = true
  try {
    const cfg = await controlApi.collectConfig()
    Object.assign(config, cfg)
    deviceList.value = cfg.devices || []
  } catch (e) {
    console.warn('[CollectConfig]', e?.message || e)
  } finally {
    loading.value = false
  }
}
async function saveGlobal() {
  saving.value = true
  try {
    await controlApi.saveCollect({ ...config })
    ElMessage.success('全局采集参数已保存并下发')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}
async function updateDevice(d, interval) {
  d.interval = interval
  await controlApi.saveCollect({ devices: deviceList.value })
  ElMessage.success(`${d.name} 采集频率已调整为 ${interval} 秒`)
}
async function toggleDevice(d) {
  d.enabled = !d.enabled
  await controlApi.saveCollect({ devices: deviceList.value })
  ElMessage.success(d.enabled ? `${d.code} 已恢复采集` : `${d.code} 已暂停采集`)
}

onMounted(load)
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="采集参数配置" desc="自定义采集频率、数据过滤规则与异常值处理策略，支持按设备差异化配置">
      <template #actions>
        <el-button type="primary" :loading="saving" :icon="'Check'" @click="saveGlobal">保存配置</el-button>
      </template>
    </PageHeader>

    <div class="config-layout">
      <!-- 全局参数 -->
      <div class="ag-card anim-left">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>全局采集参数</div></div>
        <div class="ag-card__body">
          <el-form label-width="130px">
            <el-form-item label="默认采集频率">
              <el-radio-group v-model="config.defaultInterval">
                <el-radio-button v-for="i in INTERVALS" :key="i.v" :value="i.v">{{ i.label }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="历史数据保留">
              <el-input-number v-model="config.retentionDays" :min="30" :max="3650" style="width: 200px" />
              <span class="text-dim" style="margin-left: 8px">天（超期自动归档）</span>
            </el-form-item>
            <el-form-item label="数据过滤规则">
              <el-select v-model="config.filterRule" style="width: 260px">
                <el-option v-for="f in FILTERS" :key="f" :label="f" :value="f" />
              </el-select>
            </el-form-item>
            <el-form-item label="异常值处理">
              <el-radio-group v-model="config.anomalyPolicy">
                <el-radio v-for="a in ANOMALY" :key="a" :value="a" border>{{ a }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveGlobal">保存并下发</el-button>
            </el-form-item>
          </el-form>
          <el-alert type="info" :closable="false" show-icon title="采集频率影响设备功耗与数据量：建议常规监测 5 分钟，重点地块 1 分钟" />
        </div>
      </div>

      <!-- 设备差异化 -->
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>设备差异化配置</div>
          <span class="text-dim">共 {{ deviceList.length }} 台传感器</span>
        </div>
        <div class="ag-card__body" style="max-height: 520px; overflow: auto">
          <el-table :data="deviceList" stripe size="small">
            <el-table-column prop="code" label="编号" width="100" />
            <el-table-column prop="name" label="传感器" min-width="180" />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }"><StatusTag :value="row.status" /></template>
            </el-table-column>
            <el-table-column label="采集频率" width="150" align="center">
              <template #default="{ row }">
                <el-select :model-value="row.interval" size="small" style="width: 120px" @change="(v) => updateDevice(row, v)">
                  <el-option v-for="i in INTERVALS" :key="i.v" :label="i.label" :value="i.v" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" size="small" @change="() => toggleDevice(row)" aria-label="采集开关" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-layout {
  display: grid;
  grid-template-columns: 430px 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1100px) {
  .config-layout { grid-template-columns: 1fr; }
}
</style>
