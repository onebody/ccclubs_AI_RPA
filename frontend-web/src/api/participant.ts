import { http } from './index'

export interface Participant {
  id: string
  name: string
  number?: string
  email?: string
  phone?: string
  status: 'pending' | 'approved' | 'rejected'
  competitionId: string
  createdAt: string
}

export interface CreateParticipantDto {
  name: string
  number?: string
  email?: string
  phone?: string
  competitionId: string
}

export const participantApi = {
  /**
   * 获取选手列表
   */
  list: (params?: {
    page?: number
    limit?: number
    competitionId?: string
    status?: string
    keyword?: string
  }): Promise<{ items: Participant[]; total: number }> =>
    http.get('/participants', { params }),

  /**
   * 获取选手详情
   */
  detail: (id: string): Promise<Participant> =>
    http.get(`/participants/${id}`),

  /**
   * 创建选手
   */
  create: (data: CreateParticipantDto): Promise<Participant> =>
    http.post('/participants', data),

  /**
   * 更新选手
   */
  update: (id: string, data: Partial<CreateParticipantDto>): Promise<Participant> =>
    http.put(`/participants/${id}`, data),

  /**
   * 删除选手
   */
  delete: (id: string): Promise<void> =>
    http.delete(`/participants/${id}`),

  /**
   * 审核选手
   */
  review: (id: string, status: 'approved' | 'rejected'): Promise<Participant> =>
    http.patch(`/participants/${id}/review`, { status }),

  /**
   * 导入选手
   */
  import: (file: File, competitionId: string): Promise<{ success: number; failed: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('competitionId', competitionId)
    return http.post('/participants/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * 导出选手
   */
  export: (competitionId: string): Promise<Blob> =>
    http.get(`/participants/export?competitionId=${competitionId}`, {
      responseType: 'blob',
    }),
}
