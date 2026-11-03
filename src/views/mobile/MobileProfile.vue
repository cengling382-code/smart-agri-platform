<script setup>
/** 页面 67 · 移动端个人中心：个人资料、修改密码、消息设置、退出登录 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()
const pwdVisible = ref(false)
const pwd = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const settings = ref([
  { id: 1, name: '告警推送通知', desc: '紧急/重要告警实时推送', on: true },
  { id: 2, name: '工单派单提醒', desc: '新工单通知提醒', on: true },
  { id: 3, name: '环境异常提醒', desc: '所辖地块环境超限提醒', on: false },
])

async function changePwd() {
  if (pwd.newPassword.length < 6) return ElMessage.warning('新密码至少 6 位')
  if (pwd.newPassword !== pwd.confirmPassword) return ElMessage.error('两次输入不一致')
  try {
    await authApi.changePassword({ ...pwd })
    ElMessage.success('密码修改成功，请重新登录')
    pwdVisible.value = false
    await auth.logout()
    router.replace('/m/login')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function logout() {
  await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
  await auth.logout()
  router.replace('/m/login')
}
</script>

<template>
  <div class="m-profile">
    <!-- 头像区 -->
    <div class="mp-hero">
      <span class="avatar">{{ auth.avatarText }}</span>
      <div class="meta">
        <b>{{ auth.displayName }}</b>
        <span>{{ auth.roleName }} · {{ auth.user?.dept || '—' }}</span>
      </div>
      <button class="edit-btn" @click="router.push('/profile')" aria-label="编辑资料"><el-icon><EditPen /></el-icon></button>
    </div>

    <!-- 统计 -->
    <div class="stats-row">
      <div><b class="mono-num">12</b><span>累计工单</span></div>
      <div><b class="mono-num">386</b><span>累计工时(h)</span></div>
      <div><b class="mono-num">5</b><span>负责地块</span></div>
    </div>

    <!-- 菜单 -->
    <div class="menu-card">
      <button class="menu-item" @click="router.push('/profile')">
        <el-icon color="#699C78"><User /></el-icon><span>个人资料</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
      <button class="menu-item" @click="pwdVisible = true">
        <el-icon color="#E89552"><Lock /></el-icon><span>修改密码</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
      <button class="menu-item" @click="router.push('/m/plots')">
        <el-icon color="#4C6983"><Place /></el-icon><span>我的地块</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
    </div>

    <!-- 消息设置 -->
    <div class="menu-card">
      <div class="card-title">消息设置</div>
      <div v-for="s in settings" :key="s.id" class="setting-row">
        <div class="s-meta">
          <b>{{ s.name }}</b>
          <span class="text-dim">{{ s.desc }}</span>
        </div>
        <el-switch v-model="s.on" size="small" :aria-label="s.name" />
      </div>
    </div>

    <button class="logout-btn" @click="logout">退出登录</button>
    <p class="ver">智慧农业移动端 v1.0.0</p>

    <!-- 修改密码 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="90%">
      <input v-model="pwd.oldPassword" type="password" placeholder="当前密码" class="m-input" aria-label="当前密码" />
      <input v-model="pwd.newPassword" type="password" placeholder="新密码（至少 6 位）" class="m-input" aria-label="新密码" />
      <input v-model="pwd.confirmPassword" type="password" placeholder="确认新密码" class="m-input" aria-label="确认新密码" />
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="changePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.m-profile {
  padding: 0 16px 24px;
  min-height: 100%;
  /* 决策依据：页头绿→藏青→页面色三段渐变的藏青段不承载文字、属混色装饰，改为绿到页面色的同高硬切 */
  background: linear-gradient(180deg, #699c78 0, #699c78 200px, #f5f5f5 200px);
}
.mp-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  padding: 30px 4px 46px;
}
.avatar {
  width: 58px;
  height: 58px;
  border-radius: var(--ag-radius-lg); /* 决策依据：58px 头像块属 ≥16px 大圆角块面，归浮层档 14px */
  background: rgba(255, 255, 255, 0.2);
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 800;
  backdrop-filter: blur(4px);
}
.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.meta b {
  font-size: 18px;
}
.meta span {
  font-size: 12px;
  opacity: 0.8;
}
.edit-btn {
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: var(--ag-radius-sm); /* 决策依据：34px 编辑图标按钮属小控件，对齐控件档 6px */
  cursor: pointer;
  display: grid;
  place-items: center;
}
.stats-row {
  display: flex;
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：统计数据条属大块面板，对齐浮层档 14px */
  padding: 16px 0;
  margin-top: -22px;
  box-shadow: var(--ag-shadow);
  position: relative;
}
.stats-row > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stats-row b {
  font-size: 19px;
  color: var(--ag-text-1);
}
.stats-row span {
  font-size: 11px;
  color: var(--ag-text-3);
}
.menu-card {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：菜单卡片属卡片类，对齐卡片档 10px */
  margin-top: 14px;
  overflow: hidden;
  box-shadow: var(--ag-shadow-sm);
}
.card-title {
  font-size: 12px;
  color: var(--ag-text-3);
  padding: 12px 15px 0;
}
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  border: none;
  background: none;
  padding: 14px 15px;
  font-size: 14px;
  color: var(--ag-text-1);
  cursor: pointer;
  border-bottom: 1px solid var(--ag-border-light);
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:active {
  background: var(--ag-bg-hover);
}
.menu-item .arr {
  margin-left: auto;
  color: var(--ag-text-4);
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid var(--ag-border-light);
}
.setting-row:last-child {
  border-bottom: none;
}
.s-meta {
  display: flex;
  flex-direction: column;
}
.s-meta b {
  font-size: 13.5px;
}
.logout-btn {
  width: 100%;
  margin-top: 16px;
  border: none;
  background: #fff;
  color: var(--ag-danger);
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--ag-radius-sm); /* 决策依据：全宽退出按钮属控件，对齐控件档 6px */
  padding: 13px;
  cursor: pointer;
  box-shadow: var(--ag-shadow-sm);
}
.ver {
  text-align: center;
  font-size: 10px;
  color: var(--ag-text-4);
  margin-top: 14px;
}
.m-input {
  width: 100%;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm); /* 决策依据：输入框属控件，对齐控件档 6px */
  padding: 11px 13px;
  font-size: 14px;
  margin-bottom: 11px;
  outline: none;
}
.m-input:focus {
  border-color: var(--ag-green-500);
}
</style>
