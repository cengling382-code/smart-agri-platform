<script setup>
/** 状态标签：统一语义色映射 */
import { computed } from 'vue'

const MAPS = {
  // 设备状态
  online: { label: '在线', type: 'success', effect: 'light' },
  offline: { label: '离线', type: 'info', effect: 'light' },
  fault: { label: '故障', type: 'danger', effect: 'light' },
  // 通用状态
  启用: { label: '启用', type: 'success' },
  禁用: { label: '禁用', type: 'danger' },
  正常: { label: '正常', type: 'success' },
  异常: { label: '异常', type: 'danger' },
  未启用: { label: '未启用', type: 'info' },
  已连接: { label: '已连接', type: 'success' },
  在岗: { label: '在岗', type: 'success' },
  休假: { label: '休假', type: 'warning' },
  上架: { label: '上架', type: 'success' },
  下架: { label: '下架', type: 'info' },
  合格: { label: '合格', type: 'success' },
  不合格: { label: '不合格', type: 'danger' },
  成功: { label: '成功', type: 'success' },
  失败: { label: '失败', type: 'danger' },
  // 工单/计划状态
  待接单: { label: '待接单', type: 'warning' },
  进行中: { label: '进行中', type: 'primary' },
  待验收: { label: '待验收', type: 'warning' },
  已完成: { label: '已完成', type: 'success' },
  已驳回: { label: '已驳回', type: 'danger' },
  待审批: { label: '待审批', type: 'warning' },
  已审批: { label: '已审批', type: 'primary' },
  已发布: { label: '已发布', type: 'success' },
  待完善: { label: '待完善', type: 'warning' },
  已召回: { label: '已召回', type: 'danger' },
  待登记: { label: '待登记', type: 'warning' },
  已入库: { label: '已入库', type: 'success' },
  待付款: { label: '待付款', type: 'warning' },
  待发货: { label: '待发货', type: 'primary' },
  已发货: { label: '发货中', type: 'primary' },
  已退款: { label: '已退款', type: 'info' },
  // 告警状态
  pending: { label: '未处理', type: 'danger', effect: 'light' },
  confirmed: { label: '已确认', type: 'warning', effect: 'light' },
  resolved: { label: '已处置', type: 'success', effect: 'light' },
  archived: { label: '已归档', type: 'info', effect: 'light' },
}
const props = defineProps({
  value: { type: [String, Number], default: '' },
  map: { type: Object, default: null },
})
const conf = computed(() => {
  if (props.map && props.map[props.value]) return props.map[props.value]
  return MAPS[props.value] || { label: props.value || '—', type: 'info' }
})
</script>

<template>
  <el-tag :type="conf.type" :effect="conf.effect || 'light'" size="small" disable-transitions>{{ conf.label }}</el-tag>
</template>
