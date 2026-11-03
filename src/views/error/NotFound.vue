<script setup>
/** 404 页面 */
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="err-page">
    <div class="err-card anim-zoom">
      <div class="err-icon">🌾</div>
      <h1>404</h1>
      <p>您访问的页面走丢了</p>
      <p class="tip">页面可能已被移动或删除，请检查地址是否正确</p>
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
  border-radius: var(--ag-radius-lg); /* 决策依据：404 主卡片属大块面板，对齐浮层档 14px */
  box-shadow: var(--ag-shadow-lg);
}
.err-icon {
  font-size: 54px;
  margin-bottom: 10px;
  display: inline-block;
  /* 决策依据：agLeaf 无限循环属装饰性动画，按简约高级规范移除，元素与其余样式保留 */
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
