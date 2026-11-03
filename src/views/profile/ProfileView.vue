<script setup>
/** 页面 4 · 个人中心-基本资料：查看/编辑头像、姓名、手机、邮箱、部门 */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)

const form = reactive({ name: '', phone: '', email: '', dept: '', bio: '' })

onMounted(() => {
  Object.assign(form, {
    name: auth.user?.name || '',
    phone: auth.user?.phone || '',
    email: auth.user?.email || '',
    dept: auth.user?.dept || '',
    bio: auth.user?.bio || '专注智慧农业一线生产管理。',
  })
})

// 决策依据：头像底色渐变属纯装饰、不承载信息，按简约高级规范改为 4 个单色
const AVATAR_GRADS = [
  '#699c78',
  '#4c6983',
  '#6e93b0',
  '#e89552',
]
const avatarGrad = ref(AVATAR_GRADS[0])

async function handleSave() {
  if (!form.name) {
    ElMessage.warning('姓名不能为空')
    return
  }
  loading.value = true
  try {
    await auth.updateProfile({ ...form })
    ElMessage.success('个人资料已更新')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    name: auth.user?.name || '',
    phone: auth.user?.phone || '',
    email: auth.user?.email || '',
    dept: auth.user?.dept || '',
    bio: auth.user?.bio || '专注智慧农业一线生产管理。',
  })
}
</script>

<template>
  <div class="page">
    <PageHeader title="基本资料" desc="维护个人账号信息，用于工单派发、告警通知与登录凭证" />

    <div class="profile-grid">
      <!-- 头像卡 -->
      <div class="ag-card avatar-card anim-up">
        <div class="avatar-big" :style="{ background: avatarGrad }">{{ auth.avatarText }}</div>
        <h3 class="u-name">{{ auth.user?.name }}</h3>
        <p class="u-role">{{ auth.roleName }} · {{ auth.user?.dept || '—' }}</p>
        <div class="u-stats">
          <div class="u-stat"><b>{{ auth.user?.username }}</b><span>登录账号</span></div>
          <div class="u-stat"><b>{{ auth.user?.lastLogin || '—' }}</b><span>上次登录</span></div>
        </div>
        <div class="grad-pick">
          <button
            v-for="(g, i) in AVATAR_GRADS"
            :key="i"
            class="g-dot"
            :style="{ background: g }"
            :aria-label="`头像配色 ${i + 1}`"
            @click="avatarGrad = g"
          ></button>
        </div>
        <el-alert type="info" :closable="false" show-icon title="演示环境使用文字头像，生产环境支持图片上传" class="mt-12" />
      </div>

      <!-- 资料表单 -->
      <div class="ag-card form-card anim-up anim-delay-1">
        <el-form :model="form" label-width="90px" style="max-width: 560px">
          <el-form-item label="姓名" required>
            <el-input v-model="form.name" placeholder="真实姓名" maxlength="12" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="form.phone" maxlength="11" placeholder="用于告警短信与工单通知" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="example@agri.com" />
          </el-form-item>
          <el-form-item label="所属部门">
            <el-input v-model="form.dept" placeholder="如：种植一组 / 农技服务站" />
          </el-form-item>
          <el-form-item label="个人简介">
            <el-input v-model="form.bio" type="textarea" :rows="3" maxlength="100" show-word-limit placeholder="介绍一下自己吧" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSave">保存修改</el-button>
            <el-button @click="resetForm">重 置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;
  align-items: start;
}
.avatar-card {
  padding: 30px 24px;
  text-align: center;
}
.avatar-big {
  width: 92px;
  height: 92px;
  border-radius: var(--ag-radius-lg); /* 决策依据：92px 头像方块属大圆角块面而非小控件，归浮层档保持圆润 */
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 36px;
  font-weight: 800;
  box-shadow: var(--ag-shadow-green);
  transition: transform 0.3s var(--ag-ease-spring);
}
/* 决策依据：hover 旋转缩放属装饰性动效，按简约高级规范移除（原 .avatar-big:hover 仅此一条声明） */
.u-name {
  margin: 0;
  font-size: 18px;
}
.u-role {
  color: var(--ag-text-3);
  font-size: 13px;
  margin: 4px 0 18px;
}
.u-stats {
  display: flex;
  justify-content: center;
  gap: 26px;
  padding: 14px 0;
  border-top: 1px dashed var(--ag-border);
  border-bottom: 1px dashed var(--ag-border);
}
.u-stat b {
  display: block;
  font-size: 13px;
  color: var(--ag-text-1);
}
.u-stat span {
  font-size: 11px;
  color: var(--ag-text-4);
}
.grad-pick {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
.g-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--ag-border);
  cursor: pointer;
  transition: transform 0.2s;
}
/* 决策依据：hover 放大属装饰性动效，按简约高级规范移除（原 .g-dot:hover 仅此一条声明） */
.form-card {
  padding: 26px 30px;
}
@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
