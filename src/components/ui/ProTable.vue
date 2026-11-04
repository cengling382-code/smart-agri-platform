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
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Rank } from '@element-plus/icons-vue'

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
    if (id === seqId) {
      loading.value = false
      cardSelKeys.value = new Set()
      nextTick(checkScrollable)
    }
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

/* ---------- 移动端卡片形态 ----------
   手机上横向表格（哪怕可滑动）都是反模式：列多则信息不可读。
   业界成熟方案是「行转卡片」——每行数据垂直展开为键值对列表，
   首列作为卡片标题，操作按钮固定在卡片底部。
   复用同一套列配置、formatter 与插槽，页面层零改动。 */
const cardMq = window.matchMedia('(max-width: 768px)')
const isMobile = ref(cardMq.matches)
function onMqChange(e) {
  isMobile.value = e.matches
}
onMounted(() => cardMq.addEventListener('change', onMqChange))
onBeforeUnmount(() => cardMq.removeEventListener('change', onMqChange))

/** 卡片多选（与 el-table 的 selection-change 事件保持同构） */
const cardSelKeys = ref(new Set())
function isCardSelected(row) {
  return cardSelKeys.value.has(row[props.rowKey])
}
function toggleCardSelect(row) {
  const k = row[props.rowKey]
  if (!cardSelKeys.value.delete(k)) cardSelKeys.value.add(k)
  emit('selection-change', rows.value.filter((r) => cardSelKeys.value.has(r[props.rowKey])))
}

/** 移动端搜索区折叠：默认只露第一个筛选项，其余收进「筛选」面板，省出列表空间 */
const filtersOpen = ref(false)
const shownFilters = computed(() => (!isMobile.value || filtersOpen.value ? props.filters : props.filters.slice(0, 1)))

/* ---------- 桌面端「左右滑动」提示（仅非移动形态使用） ----------
   列总宽超出视口时 el-table 横向滚动，检测到溢出则显示提示胶囊，
   滑动一次即消失。手机卡片形态下无横向滚动，不需要提示。 */
const showHint = ref(false)
let hintDismissed = false
let wrapEl = null
let resizeTimer = null

function checkScrollable() {
  if (!wrapEl) {
    const el = tableRef.value?.$el
    wrapEl = el?.querySelector('.el-scrollbar__wrap') || null
  }
  showHint.value = !isMobile.value && !hintDismissed && !!wrapEl && wrapEl.scrollWidth > wrapEl.clientWidth + 2
}
function onInnerScroll() {
  if (!hintDismissed) {
    hintDismissed = true
    showHint.value = false
  }
}
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(checkScrollable, 150)
}
onMounted(() => {
  window.addEventListener('resize', onResize)
  // el-table 内部滚动容器：监听首次横向滑动，用于收起提示
  nextTick(() => {
    const el = tableRef.value?.$el
    wrapEl = el?.querySelector('.el-scrollbar__wrap') || null
    wrapEl?.addEventListener('scroll', onInnerScroll, { passive: true })
    setTimeout(checkScrollable, 300)
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
  wrapEl?.removeEventListener('scroll', onInnerScroll)
})
</script>

<template>
  <div class="pro-table ag-card">
    <!-- 搜索区（移动端默认折叠，仅露第一个筛选项） -->
    <div v-if="hasFilters" class="search-area" :class="{ 'is-folded': isMobile && !filtersOpen }">
      <el-form inline @submit.prevent>
        <el-form-item v-for="f in shownFilters" :key="f.key" :label="f.label">
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
        <el-form-item class="search-btns">
          <el-button type="primary" :icon="'Search'" @click="load()">查询</el-button>
          <el-button v-if="!isMobile || filtersOpen" :icon="'Refresh'" @click="reset()">重置</el-button>
          <el-button v-if="isMobile && filters.length > 1" link type="primary" class="fold-btn" @click="filtersOpen = !filtersOpen">
            {{ filtersOpen ? '收起' : `筛选 ${filters.length - 1} 项` }}
            <el-icon><component :is="filtersOpen ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
          </el-button>
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

    <!-- 表格（桌面）/ 键值卡片（移动）：同一套列配置与插槽双形态渲染 -->
    <div v-if="isMobile && columns.length" v-loading="loading" class="table-area mobile-cards">
      <div v-for="row in rows" :key="row[rowKey]" class="row-card">
        <div class="card-head">
          <el-checkbox
            v-if="selectable"
            class="card-check"
            :model-value="isCardSelected(row)"
            aria-label="选择该行"
            @change="() => toggleCardSelect(row)"
          />
          <div class="card-title">
            <slot :name="'col-' + columns[0].prop" v-bind="{ row }">
              {{ columns[0].formatter ? columns[0].formatter(row[columns[0].prop], row) : (row[columns[0].prop] ?? '—') }}
            </slot>
          </div>
        </div>
        <div class="card-fields">
          <div v-for="col in columns.slice(1)" :key="col.prop" class="card-field">
            <span class="field-label">{{ col.label }}</span>
            <span class="field-value">
              <slot :name="'col-' + col.prop" v-bind="{ row }">
                {{ col.formatter ? col.formatter(row[col.prop], row) : (row[col.prop] ?? '—') }}
              </slot>
            </span>
          </div>
        </div>
        <div v-if="$slots['col-action']" class="card-actions">
          <slot name="col-action" v-bind="{ row }" />
        </div>
      </div>
      <el-empty v-if="!loading && rows.length === 0" :description="emptyText" :image-size="88" />
    </div>

    <div v-else class="table-area">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="rows"
        :row-key="rowKey"
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
      <transition name="hint-fade">
        <div v-if="showHint && !isMobile" class="swipe-hint" aria-hidden="true">
          <el-icon :size="13"><Rank /></el-icon>
          <span>左右滑动查看全部列</span>
        </div>
      </transition>
    </div>

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
.table-area {
  position: relative;
}

/* ---------- 移动端键值卡片形态 ---------- */
/* 搜索区：控件满宽、纵向收紧 */
@media (max-width: 768px) {
  .search-area :deep(.el-form-item) {
    margin-right: 0;
    width: 100%;
  }
  .search-area :deep(.el-select),
  .search-area :deep(.el-date-editor),
  .search-area :deep(.el-input) {
    width: 100% !important;
  }
  .search-btns :deep(.el-button) {
    flex: 1;
  }
  .search-btns :deep(.el-button + .el-button) {
    margin-left: 10px;
  }
}
.fold-btn :deep(.el-icon) {
  margin-left: 2px;
}
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}
.row-card {
  border: 1px solid var(--ag-border-light);
  border-radius: var(--ag-radius-md, 10px);
  background: var(--ag-bg-surface);
  padding: 10px 12px 2px;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
}
.card-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ag-text-1);
  line-height: 1.35;
  word-break: break-all;
}
.card-fields {
  display: flex;
  flex-direction: column;
}
.card-field {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4.5px 0;
  border-top: 1px dashed var(--ag-border-light);
  font-size: 12.5px;
  line-height: 1.45;
}
.field-label {
  flex: none;
  width: 72px;
  color: var(--ag-text-3);
  font-size: 11.5px;
}
.field-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  color: var(--ag-text-1);
  word-break: break-all;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding: 6px 0;
  border-top: 1px solid var(--ag-border-light);
}
/* 手机端滑动提示胶囊：悬浮于表格底部居中，不拦截触控 */
.swipe-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--ag-radius-pill);
  background: rgba(22, 25, 31, 0.72);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 4px 14px rgba(22, 25, 31, 0.24);
}
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.24s var(--ag-ease);
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}
</style>
