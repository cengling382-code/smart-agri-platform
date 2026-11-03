<script setup>
/** 无权限访问页（RBAC 拦截后的提示页） */
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="err-page">
    <div class="err-card anim-zoom">
      <div class="err-icon">🔒</div>
      <h1>403</h1>
      <p>抱歉，您没有访问该页面的权限</p>
      <p class="tip">当前角色未被授权访问此菜单，请联系系统管理员分配权限</p>
      <div class="btns">
        <el-button type="primary" :icon="'Back'" @click="router.back()">返回上一页</el-button>
        <el-button :icon="'Odometer'" @click="router.push('/dashboard')">回到工作台</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.err-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  /* 决策依据：原为装饰性光斑（两层 radial-gradient 氛围光），按简约高级规范改为平底 */
  background: var(--ag-bg-page);
}
.err-card {
  text-align: center;
  padding: 50px 70px;
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：403 主卡片属大块面板，对齐浮层档 14px */
  box-shadow: var(--ag-shadow-lg);
}
.err-icon {
  font-size: 54px;
  margin-bottom: 10px;
}
h1 {
  font-size: 64px;
  margin: 0;
  /* 决策依据：渐变文字属纯装饰、不承载信息，按简约高级规范改为实色 */
  color: var(--ag-green-700);
}
p {
  color: var(--ag-text-2);
  font-size: 16px;
  margin: 10px 0 4px;
}
.tip {
  color: var(--ag-text-4);
  font-size: 13px;
  margin-bottom: 26px;
}
.btns {
  display: flex;
  gap: 14px;
  justify-content: center;
}
</style>
