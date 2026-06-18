import { http } from './index'

export interface Competition {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  location?: string
  category?: string
  maxParticipants?: number
  registrationDeadline?: string
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  tenant_id: string
  createdAt: string
  updatedAt: string
}

export interface CreateCompetitionDto {
  name: string
  description?: string
  startDate: string
  endDate: string
  location?: string
  category?: string
  maxParticipants?: number
  registrationDeadline?: string
}

export const competitionApi = {
  /**
   * 获取比赛列表
   */
  list: (params?: {
    page?: number
    limit?: number
    status?: string
    keyword?: string
  }): Promise<{ items: Competition[]; total: number }> =>
    http.get('/competitions', { params }),

  /**
   * 获取比赛详情
   */
  detail: (id: string): Promise<Competition> =>
    http.get(`/competitions/${id}`),

  /**
   * 创建比赛
   */
  create: (data: CreateCompetitionDto): Promise<Competition> =>
    http.post('/competitions', data),

  /**
   * 更新比赛
   */
  update: (id: string, data: Partial<CreateCompetitionDto>): Promise<Competition> =>
    http.put(`/competitions/${id}`, data),

  /**
   * 删除比赛
   */
  delete: (id: string): Promise<void> =>
    http.delete(`/competitions/${id}`),

  /**
   * 更新比赛状态
   */
  updateStatus: (id: string, status: Competition['status']): Promise<Competition> =>
    http.patch(`/competitions/${id}/status`, { status }),
}
