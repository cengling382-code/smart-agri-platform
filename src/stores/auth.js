import { defineStore } from 'pinia'
import { authApi } from '@/api'

const TOKEN_KEY = 'agri_token'
const USER_KEY = 'agri_user'
const REMEMBER_KEY = 'agri_remember'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    role: (s) => s.user?.role || '',
    roleName: (s) => s.user?.roleName || '',
    displayName: (s) => s.user?.name || s.user?.username || '访客',
    avatarText: (s) => (s.user?.name || '用户').slice(0, 1),
  },
  actions: {
    async login(payload) {
      const { token, user } = await authApi.login(payload)
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    },
    async fetchProfile() {
      const user = await authApi.getProfile()
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    },
    async updateProfile(data) {
      const user = await authApi.updateProfile(data)
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    async logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
    saveRemember(username, password) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }))
    },
    clearRemember() {
      localStorage.removeItem(REMEMBER_KEY)
    },
    loadRemember() {
      try {
        return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null')
      } catch {
        return null
      }
    },
  },
})
