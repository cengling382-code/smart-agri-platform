<script setup>
/**
 * 通用列表页组件：搜索区 + 表格 + 分页
 * 遵循「列表页支持搜索/筛选/分页」的说明书交互要求
 *
 * <ProTable ref="t" :columns="cols" :fetch="api.page" :filters="filters">
 *   <template #toolbar>...</template>
 *   <template #col-status="{row}">...</template>
 * </ProTable>
 * t.reload() 手动刷新
 */
import { ref, reactive, computed, onMounted } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  fetch: { type: Function, required: true },
  filters: { type: Array, default: () => [] },
  defaultQuery: { type: Object, default: () => ({}) },
  rowKey: { type: String, default: 'id' },
  immediate: { type: Boolean, default: true },
  selectable: { type: Boolean, default: false },
  pageSize: { type: Number, default: 10 },
  emptyText: { type: String, default: '暂无数据' },
})
const emit = defineEmits(['selection-change'])

const tableRef = ref(null)
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ page: 1, size: props.pageSize, ...props.defaultQuery })
let seqId = 0

async function load(keepPage = false) {
  if (!keepPage) query.page = 1
  const id = ++seqId
  loading.value = true
  try {
    const res = await props.fetch({ ...query })
    if (id !== seqId) return
    rows.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    if (id === seqId) {
      rows.value = []
      total.value = 0
      console.warn('[ProTable]', e.message)
    }
  } finally {
    if (id === seqId) loading.value = false
  }
}
function reset() {
  Object.keys(query).forEach((k) => {
    if (k !== 'page' && k !== 'size' && props.defaultQuery[k] === undefined) query[k] = ''
  })
  load()
}
function handleSelectionChange(v) {
  emit('selection-change', v)
}

defineExpose({ reload: load, query })

onMounted(() => props.immediate && load())

const hasFilters = computed(() => props.filters.length > 0)
</script>

<template>
  <div class="pro-table ag-card">
    <!-- 搜索区 -->
    <div v-if="hasFilters" class="search-area">
      <el-form inline @submit.prevent>
        <el-form-item v-for="f in filters" :key="f.key" :label="f.label">
          <el-select
            v-if="f.type === 'select'"
            v-model="query[f.key]"
            :placeholder="'全部' + f.label"
            clearable
            style="width: 160px"
            @change="load()"
          >
            <el-option v-for="o in f.options" :key="String(o.value)" :label="o.label" :value="o.value" />
          </el-select>
          <el-date-picker
            v-else-if="f.type === 'date'"
            v-model="query[f.key]"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="'选择' + f.label"
            style="width: 160px"
            @change="load()"
          />
          <el-input
            v-else
            v-model="query[f.key]"
            :placeholder="f.placeholder || ('输入' + f.label)"
            clearable
            style="width: 200px"
            :prefix-icon="'Search'"
            @keyup.enter="load()"
            @clear="load()"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="'Search'" @click="load()">查询</el-button>
          <el-button :icon="'Refresh'" @click="reset()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 工具栏 -->
    <div v-if="$slots.toolbar || selectable" class="toolbar">
      <div class="toolbar-left">
        <slot name="toolbar" />
        <span v-if="selectable" class="text-dim">已选 {{ $attrs.selectedCount || 0 }} 项</span>
      </div>
      <slot name="toolbar-right" />
    </div>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="rows"
      :row-key="rowKey"
      stripe
      style="width: 100%"
      :empty-text="emptyText"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="selectable" type="selection" width="42" />
      <template v-for="col in columns" :key="col.prop">
        <el-table-column
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed"
          :align="col.align || 'left'"
          :show-overflow-tooltip="col.tooltip !== false"
        >
          <template #default="scope">
            <slot :name="'col-' + col.prop" v-bind="scope">
              {{ col.formatter ? col.formatter(scope.row[col.prop], scope.row) : (scope.row[col.prop] ?? '—') }}
            </slot>
          </template>
        </el-table-column>
      </template>
      <el-table-column v-if="$slots['col-action']" label="操作" :width="$attrs.actionWidth || 160" fixed="right" align="center">
        <template #default="scope">
          <slot name="col-action" v-bind="scope" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load(true)"
        @size-change="load(true)"
      />
    </div>
  </div>
</template>

<style scoped>
.pro-table {
  padding: 22px 24px;
}
.search-area {
  margin-bottom: 4px;
}
.search-area :deep(.el-form-item) {
  margin-bottom: 10px;
  margin-right: 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}
</style>
