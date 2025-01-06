import { createApp } from 'vue'
import i18n from './i18n'

import 'bootstrap/scss/bootstrap.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'

import axios from 'axios'
import VueAxios from 'vue-axios'
import { createStore } from 'vuex'
import App from './App.vue'
import VueNumerals from 'vue-numerals'

import { AppStore } from './store/app_store.js'

const app = createApp(App)

const store = createStore({
    modules: {
        AppStore
    }
})

app.use(store)
app.use(VueNumerals)
app.use(VueAxios, axios)
app.use(i18n)
app.mount('#app')