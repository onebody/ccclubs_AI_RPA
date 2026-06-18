import { useState } from 'react'
import type { Announcement } from '../../api/announcement'

// Mock 数据
const mockAnnouncements: Announcement[] = [
  { id: '1', title: '2024夏季赛报名开始', content: '2024夏季赛报名正式开始，欢迎各位选手踊跃报名！', status: 'published', publishedAt: '2024-05-01', tenant_id: 'tenant_001', createdAt: '2024-05-01', updatedAt: '2024-05-01' },
  { id: '2', title: '比赛地点变更通知', content: '由于天气原因，比赛地点变更为市体育馆。', status: 'published', publishedAt: '2024-05-15', tenant_id: 'tenant_001', createdAt: '2024-05-15', updatedAt: '2024-05-15' },
  { id: '3', title: '2024秋季赛预告', content: '2024秋季赛将于9月10日开幕，敬请期待。', status: 'draft', tenant_id: 'tenant_001', createdAt: '2024-07-01', updatedAt: '2024-07-01' },
]

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  published: { label: '已发布', color: 'bg-green-100 text-green-800' },
  withdrawn: { label: '已撤回', color: 'bg-yellow-100 text-yellow-800' },
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const handleCreate = () => {
    if (!newTitle.trim()) return
    const newAnn: Announcement = {
      id: String(Date.now()),
      title: newTitle,
      content: newContent,
      status: 'draft',
      tenant_id: 'tenant_001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setAnnouncements([newAnn, ...announcements])
    setShowCreateModal(false)
    setNewTitle('')
    setNewContent('')
  }

  const handlePublish = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, status: 'published' as const, publishedAt: new Date().toISOString() } : a
    ))
  }

  const handleWithdraw = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, status: 'withdrawn' as const } : a
    ))
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条公告吗？')) {
      setAnnouncements(announcements.filter(a => a.id !== id))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 创建公告
        </button>
      </div>

      {/* 公告列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{ann.title}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${statusMap[ann.status]?.color}`}>
                {statusMap[ann.status]?.label}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{ann.content}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{ann.publishedAt ? `发布于 ${ann.publishedAt}` : `创建于 ${ann.createdAt.slice(0, 10)}`}</span>
              <div className="space-x-2">
                {ann.status === 'draft' && (
                  <button onClick={() => handlePublish(ann.id)} className="text-green-600 hover:text-green-500">发布</button>
                )}
                {ann.status === 'published' && (
                  <button onClick={() => handleWithdraw(ann.id)} className="text-yellow-600 hover:text-yellow-500">撤回</button>
                )}
                <button onClick={() => handleDelete(ann.id)} className="text-red-600 hover:text-red-500">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 创建公告弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">创建公告</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入公告标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容 *</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={6}
                  placeholder="请输入公告内容"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Announcements
