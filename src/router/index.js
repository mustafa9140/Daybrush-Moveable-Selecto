import Vue from 'vue'
import VueRouter from 'vue-router'
import HomeView from '../views/HomeView.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/about',
    name: 'about',
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import(/* webpackChunkName: "editor" */ '../views/EditorView.vue')
  },
  {
    path: '/editor2',
    name: 'editor2',
    component: () => import(/* webpackChunkName: "editor2" */ '../views/EditorView2.vue')
  },
  {
    path: '/editor3',
    name: 'editor3',
    component: () => import(/* webpackChunkName: "editor3" */ '../views/EditorView3.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
