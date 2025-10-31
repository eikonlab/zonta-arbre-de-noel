import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import MessageView from '../views/MessageView.vue'
import AppAdmin from '../apps/AppAdmin.vue'
import AppQR from '../apps/AppQR.vue'

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
    path: '/admin',
    name: 'Admin',
    component: AppAdmin
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

export default router
