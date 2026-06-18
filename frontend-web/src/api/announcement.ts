import { http } from './index'

export interface Announcement {
  id: string
  title: string
  content: string
  status: 'draft' | 'published' | 'withdrawn'
  publishedAt?: string
  tenant_id: string
  createdAt: string
  updatedAt: string
}

export interface CreateAnnouncementDto {
  title: string
  content: string
}

export const announcementApi = {
  /**
   * 获取公告列表
   */
  list: (params?: {
    page?: number
    limit?: number
    status?: string
    keyword?: string
  }): Promise<{ items: Announcement[]; total: number }> =>
    http.get('/announcements', { params }),

  /**
   * 获取公告详情
   */
  detail: (id: string): Promise<Announcement> =>
    http.get(`/announcements/${id}`),

  /**
   * 创建公告
   */
  create: (data: CreateAnnouncementDto): Promise<Announcement> =>
    http.post('/announcements', data),

  /**
   * 更新公告
   */
  update: (id: string, data: Partial<CreateAnnouncementDto>): Promise<Announcement> =>
    http.put(`/announcements/${id}`, data),

  /**
   * 删除公告
   */
  delete: (id: string): Promise<void> =>
    http.delete(`/announcements/${id}`),

  /**
   * 发布公告
   */
  publish: (id: string): Promise<Announcement> =>
    http.patch(`/announcements/${id}/publish`),

  /**
   * 撤回公告
   */
  withdraw: (id: string): Promise<Announcement> =>
    http.patch(`/announcements/${id}/withdraw`),
}
