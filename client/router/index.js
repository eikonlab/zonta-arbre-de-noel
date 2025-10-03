import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Message1 from '../views/Message1.vue'
import Message2 from '../views/Message2.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/message/1',
    name: 'Message1',
    component: Message1
  },
  {
    path: '/message/2',
    name: 'Message2',
    component: Message2
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
