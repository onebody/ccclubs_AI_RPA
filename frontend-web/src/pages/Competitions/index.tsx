import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Competition } from '../../api/competition'

// Mock 数据
const mockCompetitions: Competition[] = [
  { id: '1', name: '2024春季赛', startDate: '2024-03-15', endDate: '2024-03-20', status: 'completed', tenant_id: 'tenant_001', createdAt: '2024-01-01', updatedAt: '2024-03-21' },
  { id: '2', name: '2024夏季赛', startDate: '2024-06-01', endDate: '2024-06-05', status: 'ongoing', tenant_id: 'tenant_001', createdAt: '2024-04-01', updatedAt: '2024-06-01' },
  { id: '3', name: '2024秋季赛', startDate: '2024-09-10', endDate: '2024-09-15', status: 'upcoming', tenant_id: 'tenant_001', createdAt: '2024-07-01', updatedAt: '2024-07-01' },
  { id: '4', name: '2024冬季赛', startDate: '2024-12-01', endDate: '2024-12-05', status: 'draft', tenant_id: 'tenant_001', createdAt: '2024-10-01', updatedAt: '2024-10-01' },
]

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  upcoming: { label: '即将开始', color: 'bg-blue-100 text-blue-800' },
  ongoing: { label: '进行中', color: 'bg-green-100 text-green-800' },
  completed: { label: '已结束', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
}

const createSchema = z.object({
  name: z.string().min(1, '比赛名称不能为空'),
  description: z.string().optional(),
  startDate: z.string().min(1, '开始时间不能为空'),
  endDate: z.string().min(1, '结束时间不能为空'),
  location: z.string().optional(),
  category: z.string().optional(),
  maxParticipants: z.string().optional(),
  registrationDeadline: z.string().optional(),
})

type CreateFormData = z.infer<typeof createSchema>

const Competitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>(mockCompetitions)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  })

  const filteredCompetitions = competitions.filter(comp => {
    const matchSearch = !search || comp.name.includes(search)
    const matchStatus = !statusFilter || comp.status === statusFilter
    return matchSearch && matchStatus
  })

  const onCreateSubmit = (data: any) => {
    const newComp: Competition = {
      id: String(Date.now()),
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      location: data.location,
      category: data.category,
      maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      registrationDeadline: data.registrationDeadline,
      status: 'draft',
      tenant_id: 'tenant_001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setCompetitions([newComp, ...competitions])
    setShowCreateModal(false)
    reset()
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个比赛吗？')) {
      setCompetitions(competitions.filter(c => c.id !== id))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">比赛管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 创建比赛
        </button>
      </div>

      {/* 搜索/筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索比赛名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="upcoming">即将开始</option>
          <option value="ongoing">进行中</option>
          <option value="completed">已结束</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {/* 比赛列表 */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">地点</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCompetitions.map(comp => (
              <tr key={comp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{comp.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{comp.startDate} ~ {comp.endDate}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusMap[comp.status]?.color}`}>
                    {statusMap[comp.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{comp.location || '-'}</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <Link to={`/competitions/${comp.id}`} className="text-blue-600 hover:text-blue-500">查看</Link>
                  <button className="text-green-600 hover:text-green-500">编辑</button>
                  <button onClick={() => handleDelete(comp.id)} className="text-red-600 hover:text-red-500">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 创建比赛弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">创建比赛</h2>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">比赛名称 *</label>
                <input {...register('name')} className="w-full px-3 py-2 border rounded-lg" placeholder="请输入比赛名称" />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea {...register('description')} className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">开始时间 *</label>
                  <input type="date" {...register('startDate')} className="w-full px-3 py-2 border rounded-lg" />
                  {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">结束时间 *</label>
                  <input type="date" {...register('endDate')} className="w-full px-3 py-2 border rounded-lg" />
                  {errors.endDate && <p className="text-red-600 text-sm mt-1">{errors.endDate.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">地点</label>
                <input {...register('location')} className="w-full px-3 py-2 border rounded-lg" placeholder="请输入比赛地点" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">分类</label>
                  <select {...register('category')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">请选择</option>
                    <option value="sport">体育</option>
                    <option value="academic">学术</option>
                    <option value="art">艺术</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">最大人数</label>
                  <input type="number" {...register('maxParticipants')} className="w-full px-3 py-2 border rounded-lg" placeholder="不限" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">报名截止时间</label>
                <input type="date" {...register('registrationDeadline')} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Competitions
