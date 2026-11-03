<script setup>
/** 页面 39 · 溯源信息编辑：绑定农事记录、环境数据、检测报告，溯源信息自动关联 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { traceApi, farmApi } from '@/api'

const route = useRoute()
const router = useRouter()
const batch = ref(null)
const saving = ref(false)
const farmPool = ref([])

const form = reactive({
  code: '', crop: '', plotName: '', story: '', variety: '', growDays: 90,
  organic: true, bindFarm: [], bindEnv: true, bindReport: [],
})

const timeline = computed(() =>
  farmPool.value.filter((f) => form.bindFarm.includes(f.id))
)

onMounted(async () => {
  try {
    const res = await traceApi.page({ page: 1, size: 50 })
    batch.value = res.list.find((b) => b.id === +route.params.id) || res.list[0]
    const ledger = await farmApi.ledger({ page: 1, size: 20 })
    farmPool.value = ledger.list.map((l) => ({
      id: l.id, time: l.time, type: l.type, plotName: l.plotName, operator: l.operator,
    }))
    form.code = batch.value?.code
    form.crop = batch.value?.crop
    form.plotName = batch.value?.plotName
    form.story = `本批次${batch.value?.crop}产自${batch.value?.plotName}，全生长期采用水肥一体化智能灌溉，全程农事记录上链存证，采收后经农残检测合格。`
    form.bindFarm = farmPool.value.slice(0, 5).map((f) => f.id)
    form.bindReport = batch.value?.records?.tests ? ['JC-2026-0801'] : []
  } catch (e) {
    ElMessage.error(e.message)
  }
})

async function save(publish) {
  if (publish && !String(form.story || '').trim()) {
    ElMessage.warning('请先填写溯源故事，再保存并发布')
    return
  }
  saving.value = true
  try {
    await traceApi.update(batch.value.id, {
      status: publish ? '已发布' : batch.value.status,
      records: {
        farm: form.bindFarm.length,
        env: form.bindEnv ? 520 : 0,
        tests: form.bindReport.length,
      },
      story: form.story,
    })
    ElMessage.success(publish ? '溯源信息已保存并发布' : '溯源信息已保存')
    if (publish) router.push({ name: 'TraceBatch' })
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="`溯源信息编辑 · ${form.code}`" desc="绑定农事记录、环境数据与检测报告，系统自动关联生成消费者溯源页面">
      <template #actions>
        <el-button :icon="'Back'" @click="router.back()">返回</el-button>
        <el-button :loading="saving" @click="save(false)">暂 存</el-button>
        <el-button type="primary" :loading="saving" :icon="'Promotion'" @click="save(true)">保存并发布</el-button>
      </template>
    </PageHeader>

    <div class="edit-layout" v-if="batch">
      <!-- 基本信息 -->
      <div class="ag-card anim-left">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>批次基本信息</div></div>
        <div class="ag-card__body">
          <el-form label-width="90px">
            <el-form-item label="溯源码">
              <el-tag type="success" effect="dark" size="large" class="mono-num">{{ form.code }}</el-tag>
            </el-form-item>
            <el-form-item label="作物">{{ form.crop }} · {{ form.plotName }}（{{ batch.qty }}）</el-form-item>
            <el-form-item label="品种">
              <el-input v-model="form.variety" placeholder="如 浙粉 702" style="width: 200px" />
            </el-form-item>
            <el-form-item label="生长天数">
              <el-input-number v-model="form.growDays" :min="30" :max="365" style="width: 160px" /> <span class="text-dim">天</span>
            </el-form-item>
            <el-form-item label="溯源故事">
              <el-input v-model="form.story" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="向消费者讲述这批农产品的种植故事" />
            </el-form-item>
            <el-form-item label="绿色种植">
              <el-switch v-model="form.organic" active-text="绿色/有机种植" />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 数据绑定 -->
      <div class="right-col">
        <div class="ag-card anim-up">
          <div class="ag-card__head">
            <div class="ag-card__title"><span class="dot"></span>绑定农事记录</div>
            <el-tag size="small" type="success">已选 {{ form.bindFarm.length }} 条</el-tag>
          </div>
          <div class="ag-card__body farm-pool">
            <el-checkbox-group v-model="form.bindFarm">
              <div v-for="f in farmPool" :key="f.id" class="farm-row">
                <el-checkbox :value="f.id">
                  <span class="fr-meta">
                    <el-tag size="small" effect="plain">{{ f.type }}</el-tag>
                    <b>{{ f.plotName }}</b>
                    <span class="text-dim">{{ f.time }}</span>
                    <span class="text-dim">{{ f.operator }}</span>
                  </span>
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>

        <div class="bind-row stagger">
          <div class="ag-card bind-card">
            <div class="bc-head">
              <el-icon color="#4C6983" :size="20"><Sunny /></el-icon>
              <b>环境数据</b>
              <el-switch v-model="form.bindEnv" size="small" />
            </div>
            <p class="text-dim">自动关联地块全周期环境数据（温湿度、光照、土壤、CO₂），消费者扫码可查看环境曲线。</p>
          </div>
          <div class="ag-card bind-card">
            <div class="bc-head">
              <el-icon color="#699C78" :size="20"><Document /></el-icon>
              <b>检测报告</b>
              <el-tag size="small" :type="form.bindReport.length ? 'success' : 'info'">{{ form.bindReport.length }} 份</el-tag>
            </div>
            <el-checkbox-group v-model="form.bindReport" class="report-checks">
              <el-checkbox value="JC-2026-0801">农残检测报告（合格）</el-checkbox>
              <el-checkbox value="JC-2026-0802">品质分级检测报告</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>

        <!-- 时间线预览 -->
        <div class="ag-card anim-up anim-delay-1">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>生长周期预览（消费者视角）</div></div>
          <div class="ag-card__body">
            <el-timeline>
              <el-timeline-item v-for="f in timeline" :key="f.id" :timestamp="f.time" :type="'success'" placement="top">
                <b>{{ f.type }}</b> · {{ f.plotName }} <span class="text-dim">（{{ f.operator }}）</span>
              </el-timeline-item>
              <el-timeline-item v-if="form.bindReport.length" timestamp="采收后" type="primary" placement="top">
                <b>农残检测</b> · 检测合格，报告已归档
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  align-items: start;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.farm-pool {
  max-height: 300px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fr-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.bind-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.bind-card {
  padding: 16px;
}
.bc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.bc-head b {
  flex: 1;
}
.report-checks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
@media (max-width: 1150px) {
  .edit-layout { grid-template-columns: 1fr; }
  .bind-row { grid-template-columns: 1fr; }
}
</style>
