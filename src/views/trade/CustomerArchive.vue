<script setup>
/** 页面 46 · 客户档案管理：客户信息档案、购买记录、客户分类 */
import { ref } from 'vue'
import { PageHeader, ProTable, StatCard } from '@/components/ui'
import { tradeApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const summary = ref({ total: 0, vip: 0, big: 0, amount: 0 })

const LEVEL_TAG = cfg.customerLevelTag

const columns = [
  { prop: 'name', label: '客户姓名', width: 110 },
  { prop: 'phone', label: '手机号', width: 125 },
  { prop: 'level', label: '客户等级', width: 95, align: 'center' },
  { prop: 'orders', label: '购买次数', width: 95, align: 'center' },
  { prop: 'amount', label: '累计消费', width: 110, align: 'right' },
  { prop: 'tags', label: '客户标签', minWidth: 150 },
  { prop: 'lastBuy', label: '最近购买', width: 160 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '姓名 / 手机号' },
  { key: 'level', label: '等级', type: 'select', options: Object.keys(LEVEL_TAG).map((l) => ({ label: l, value: l })) },
]

async function loadTable(params) {
  const res = await tradeApi.customers(params)
  summary.value.total = res.total
  return res
}
tradeApi.customers({ page: 1, size: 100 }).then((res) => {
  summary.value = {
    total: res.total,
    vip: res.list.filter((c) => c.level === 'VIP').length,
    big: res.list.filter((c) => c.level === '大客户').length,
    amount: res.list.reduce((s, c) => s + c.amount, 0),
  }
}).catch((e) => console.warn('[CustomerArchive]', e?.message || e))
</script>

<template>
  <div class="page">
    <PageHeader title="客户档案管理" desc="客户信息档案、购买记录与客户分类（普通/VIP/大客户）" />

    <div class="kpi-grid stagger">
      <StatCard label="客户总数" :value="summary.total" unit="人" icon="Avatar" tone="green" />
      <StatCard label="VIP 客户" :value="summary.vip" unit="人" icon="Star" tone="blue" />
      <StatCard label="大客户" :value="summary.big" unit="人" icon="TrophyBase" tone="amber" />
      <StatCard label="累计消费" :value="summary.amount" unit="元" icon="Coin" tone="cyan" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters">
      <template #col-name="{ row }">
        <span class="c-name"><span class="c-avatar">{{ row.name.slice(0, 1) }}</span>{{ row.name }}</span>
      </template>
      <template #col-level="{ row }">
        <el-tag size="small" :type="LEVEL_TAG[row.level]" effect="plain">{{ row.level }}</el-tag>
      </template>
      <template #col-amount="{ row }">
        <span class="mono-num" style="font-weight: 700">¥{{ row.amount }}</span>
      </template>
      <template #col-tags="{ row }">
        <el-tag v-for="t in row.tags" :key="t" size="small" type="success" effect="plain" style="margin-right: 4px">{{ t }}</el-tag>
      </template>
    </ProTable>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.c-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.c-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  /* 决策依据：头像装饰性渐变底属"发光方块"，按简约高级规范改为同色系低透明度实色 + 语义色文字 */
  background: rgba(76, 105, 131, 0.14);
  color: var(--ag-blue-600);
  font-size: 12px;
  display: grid;
  place-items: center;
}
</style>
