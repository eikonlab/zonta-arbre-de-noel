import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import MessageView from '../views/MessageView.vue'
import AppAdmin from '../apps/AppAdmin.vue'
import AppQR from '../apps/AppQR.vue'
import AdminLogin from '../views/AdminLogin.vue'
import { useAuth } from '../composables/useAuth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/message/:id',
    name: 'MessageView',
    component: MessageView,
    props: true
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AppAdmin,
    meta: { requiresAuth: true }
  },
  {
    path: '/qr',
    name: 'QR',
    component: AppQR
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const { isAuthenticated } = useAuth()
    if (!isAuthenticated.value) {
      next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
