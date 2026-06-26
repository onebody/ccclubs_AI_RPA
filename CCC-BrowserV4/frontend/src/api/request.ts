import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API 请求失败:', error)
    return Promise.reject(error)
  }
)

export default request
