import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../api/auth'

const passwordSchema = z.string()
  .min(8, '密码至少 8 位')
  .regex(/[A-Z]/, '密码需包含至少一个大写字母')
  .regex(/[a-z]/, '密码需包含至少一个小写字母')
  .regex(/[0-9]/, '密码需包含至少一个数字')

const registerSchema = z.object({
  tenant_id: z.string().min(1, '租户 ID 不能为空'),
  username: z.string().min(3, '用户名至少 3 位').max(20, '用户名最多 20 位'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: '两次输入的密码不一致',
  path: ['confirm_password'],
})

type RegisterFormData = z.infer<typeof registerSchema>

const Register = () => {
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenant_id: '',
      username: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setApiError('')
    try {
      await authApi.register({
        tenant_id: data.tenant_id,
        username: data.username,
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
      })
      setSuccess(true)
    } catch (err: any) {
      setApiError(err.message || '注册失败，请稍后重试')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <h3 className="text-lg font-medium">注册成功！</h3>
            <p className="mt-2">您的账户已创建，现在可以登录了。</p>
          </div>
          <div>
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              前往登录 →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            注册新账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              登录已有账户
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{apiError}</span>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700 mb-1">
                租户 ID
              </label>
              <input
                id="tenant_id"
                type="text"
                {...register('tenant_id')}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入租户 ID"
              />
              {errors.tenant_id && (
                <p className="mt-1 text-sm text-red-600">{errors.tenant_id.message}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register('username')}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入用户名（3-20 位）"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入邮箱地址"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码（至少 8 位，含大小写字母和数字）"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register('confirm_password')}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="请再次输入密码"
              />
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '注册中...' : '注册'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register
