<script setup>
/** 页面 67 · 移动端个人中心：个人资料、修改密码、消息设置、退出登录 */
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { authApi, farmApi, plotApi } from '@/api'
import { onDataChange } from '@/composables/useDataVersion'

const router = useRouter()
const auth = useAuthStore()
const pwdVisible = ref(false)
const pwd = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const editVisible = ref(false)
const saving = ref(false)
const profile = reactive({ name: '', phone: '', email: '' })
const stats = ref({ orders: 0, hours: 0, plots: 0 })

const SETTING_KEY = 'agri_mobile_notify_settings'
const settings = ref([
  { id: 1, name: '告警推送通知', desc: '紧急/重要告警实时推送', on: true },
  { id: 2, name: '工单派单提醒', desc: '新工单通知提醒', on: true },
  { id: 3, name: '环境异常提醒', desc: '所辖地块环境超限提醒', on: false },
])

async function loadStats() {
  // 统计取当前账号真实工单 / 工时 / 地块
  try {
    const [orderRes, plots] = await Promise.all([
      farmApi.orderPage({ page: 1, size: 200 }),
      plotApi.all(),
    ])
    const mine = Array.isArray(orderRes?.list) ? orderRes.list.filter((o) => o.assignee === auth.displayName) : []
    stats.value = {
      orders: mine.length,
      hours: mine.reduce((s, o) => s + (Number(o.checkin?.hours) || 0), 0),
      plots: Array.isArray(plots) ? plots.filter((p) => p.manager === auth.displayName).length : 0,
    }
  } catch (e) {
    console.warn('[MobileProfile]', e?.message || e)
  }
}

onMounted(() => {
  // 消息开关持久化到本地（仅初始化一次，不受数据刷新影响）
  try {
    const saved = JSON.parse(localStorage.getItem(SETTING_KEY) || 'null')
    if (saved) settings.value.forEach((s) => { if (typeof saved[s.id] === 'boolean') s.on = saved[s.id] })
  } catch { /* ignore */ }
  loadStats()
})
onDataChange(loadStats, { debounce: 400 })
// 改名后按新姓名重算统计，避免「资料已改、数字仍按旧姓名匹配」
watch(() => auth.displayName, loadStats)
watch(settings, (val) => {
  const map = {}
  val.forEach((s) => (map[s.id] = s.on))
  localStorage.setItem(SETTING_KEY, JSON.stringify(map))
}, { deep: true })

function openEdit() {
  Object.assign(profile, {
    name: auth.user?.name || '',
    phone: auth.user?.phone || '',
    email: auth.user?.email || '',
  })
  editVisible.value = true
}
async function saveProfile() {
  if (!String(profile.name).trim()) return ElMessage.warning('姓名不能为空')
  if (profile.phone && !/^1[3-9]\d{9}$/.test(profile.phone)) return ElMessage.warning('手机号格式不正确')
  saving.value = true
  try {
    await auth.updateProfile({ ...profile })
    ElMessage.success('个人资料已更新')
    editVisible.value = false
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

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
  const ok = await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' }).catch(() => false)
  if (!ok) return
  await auth.logout()
  router.replace('/m/login')
}
</script>

<template>
  <div class="m-page m-profile">
    <!-- 资料卡：与 PC ProfileView .avatar-card 同形（白卡 + 文字头像 + 虚线统计） -->
    <section class="m-card profile-card">
      <div class="pc-top">
        <span class="avatar">{{ auth.avatarText }}</span>
        <div class="meta">
          <b>{{ auth.displayName }}</b>
          <span>{{ auth.roleName }} · {{ auth.user?.dept || '—' }}</span>
        </div>
        <button class="m-icon-btn" @click="openEdit" aria-label="编辑资料"><el-icon><EditPen /></el-icon></button>
      </div>
      <div class="stats-row">
        <div><b class="mono-num">{{ stats.orders }}</b><span>累计工单</span></div>
        <div><b class="mono-num">{{ stats.hours }}</b><span>累计工时(h)</span></div>
        <div><b class="mono-num">{{ stats.plots }}</b><span>负责地块</span></div>
      </div>
    </section>

    <!-- 菜单 -->
    <section class="m-card menu-card">
      <button class="menu-item" @click="openEdit">
        <el-icon class="mi-ico mi-ico--accent"><User /></el-icon><span>个人资料</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
      <button class="menu-item" @click="pwdVisible = true">
        <el-icon class="mi-ico mi-ico--warn"><Lock /></el-icon><span>修改密码</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
      <button class="menu-item" @click="router.push('/m/plots')">
        <el-icon class="mi-ico mi-ico--blue"><Place /></el-icon><span>我的地块</span><el-icon class="arr"><ArrowRight /></el-icon>
      </button>
    </section>

    <!-- 消息设置 -->
    <section class="m-card menu-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>消息设置</div>
      </div>
      <div class="m-card-body settings">
        <div v-for="s in settings" :key="s.id" class="setting-row">
          <div class="s-meta">
            <b>{{ s.name }}</b>
            <span class="text-dim">{{ s.desc }}</span>
          </div>
          <el-switch v-model="s.on" size="small" :aria-label="s.name" />
        </div>
      </div>
    </section>

    <button class="m-btn m-btn-block logout-btn" @click="logout">退出登录</button>
    <p class="ver">智慧农业移动端 v1.0.0</p>

    <!-- 编辑资料 -->
    <el-dialog v-model="editVisible" title="编辑个人资料" width="90%">
      <input v-model="profile.name" placeholder="姓名" class="m-input dlg-input" aria-label="姓名" />
      <input v-model="profile.phone" placeholder="手机号" maxlength="11" class="m-input dlg-input" aria-label="手机号" />
      <input v-model="profile.email" placeholder="邮箱（选填）" class="m-input dlg-input" aria-label="邮箱" />
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="90%">
      <input v-model="pwd.oldPassword" type="password" placeholder="当前密码" class="m-input dlg-input" aria-label="当前密码" />
      <input v-model="pwd.newPassword" type="password" placeholder="新密码（至少 6 位）" class="m-input dlg-input" aria-label="新密码" />
      <input v-model="pwd.confirmPassword" type="password" placeholder="确认新密码" class="m-input dlg-input" aria-label="确认新密码" />
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="changePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-card {
  padding: var(--ag-space-5) var(--ag-space-4) 0;
}
.pc-top {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
}
/* 头像：PC 用文字头像 + 淡色块，不使用白色半透明蒙层 */
.avatar {
  width: 56px;
  height: 56px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--ag-radius-lg);
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-family: var(--ag-font-display);
  font-size: 22px;
  font-weight: 800;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta b {
  font-size: var(--ag-fs-h3);
  font-weight: 700;
  color: var(--ag-text-1);
}
.meta span {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-3);
}
/* 统计条：与 PC .u-stats 同形（虚线分隔、竖向堆叠数值与标签） */
.stats-row {
  display: flex;
  margin-top: var(--ag-space-4);
  padding: var(--ag-space-3) 0;
  border-top: 1px dashed var(--ag-border);
}
.stats-row > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stats-row > div + div {
  border-left: 1px dashed var(--ag-border-light);
}
.stats-row b {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--ag-text-1);
}
.stats-row span {
  font-size: 11px;
  color: var(--ag-text-3);
}

.menu-card {
  margin-top: var(--ag-space-3);
  overflow: hidden;
}
.menu-item {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: var(--ag-space-3) var(--ag-space-4);
  border: none;
  border-bottom: 1px solid var(--ag-border-light);
  background: none;
  font: inherit;
  font-size: var(--ag-fs-caption);
  color: var(--ag-text-1);
  text-align: left;
  cursor: pointer;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:active {
  background: var(--ag-bg-hover);
}
.mi-ico--accent {
  color: var(--ag-green-600);
}
.mi-ico--warn {
  color: var(--ag-warning);
}
.mi-ico--blue {
  color: var(--ag-blue-600);
}
.arr {
  margin-left: auto;
  color: var(--ag-text-4);
}

.settings {
  padding-top: 0;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ag-space-3);
  padding: var(--ag-space-3) 0;
  border-bottom: 1px dashed var(--ag-border-light);
}
.setting-row:first-child {
  padding-top: 0;
}
.setting-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}
.s-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.s-meta b {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
}

.logout-btn {
  margin-top: var(--ag-space-3);
  color: var(--ag-danger);
  font-weight: 600;
}
.ver {
  margin: var(--ag-space-3) 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--ag-text-4);
}

/* 弹窗内输入框间距（与 PC 表单同节奏） */
.dlg-input + .dlg-input {
  margin-top: var(--ag-space-2);
}
</style>
