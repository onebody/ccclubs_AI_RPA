import { useState } from 'react'
import type { Participant } from '../../api/participant'

// Mock 数据
const mockParticipants: Participant[] = [
  { id: '1', name: '张三', number: 'A001', email: 'zhangsan@example.com', status: 'approved', competitionId: '2', createdAt: '2024-05-01' },
  { id: '2', name: '李四', number: 'A002', email: 'lisi@example.com', status: 'pending', competitionId: '2', createdAt: '2024-05-02' },
  { id: '3', name: '王五', number: 'A003', email: 'wangwu@example.com', status: 'approved', competitionId: '2', createdAt: '2024-05-03' },
  { id: '4', name: '赵六', number: 'A004', email: 'zhaoliu@example.com', status: 'rejected', competitionId: '2', createdAt: '2024-05-04' },
]

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
}

const Participants = () => {
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredParticipants = participants.filter(p => {
    const matchSearch = !search || p.name.includes(search) || (p.number && p.number.includes(search))
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    setParticipants(participants.map(p => p.id === id ? { ...p, status } : p))
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个选手吗？')) {
      setParticipants(participants.filter(p => p.id !== id))
    }
  }

  const handleImport = () => {
    alert('导入功能：请选择 Excel 文件（待后端实现）')
  }

  const handleExport = () => {
    alert('导出功能：将导出为 Excel 文件（待后端实现）')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">选手管理</h1>
        <div className="space-x-3">
          <button onClick={handleImport} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">导入</button>
          <button onClick={handleExport} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">导出</button>
        </div>
      </div>

      {/* 搜索/筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索姓名或编号..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      {/* 选手列表 */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">编号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParticipants.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{p.number || '-'}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.email || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusMap[p.status]?.color}`}>
                    {statusMap[p.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => handleReview(p.id, 'approved')} className="text-green-600 hover:text-green-500">通过</button>
                      <button onClick={() => handleReview(p.id, 'rejected')} className="text-red-600 hover:text-red-500">拒绝</button>
                    </>
                  )}
                  <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-gray-500">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Participants
