import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import MessageView from '../views/MessageView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
