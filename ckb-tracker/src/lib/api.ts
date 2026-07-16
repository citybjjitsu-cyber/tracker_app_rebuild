import axios from 'axios';
import type {
  User,
  ClassSchedule,
  ClassInstance,
  Attendance,
  ClassFeedback,
  Role,
  UserRole,
  GymLocation,
  ClassType,
  Term,
  TermTarget,
  Curriculum,
  Lesson,
  DashboardStats,
  FeedbackStats,
  News,
  Comment,
  WebsiteTheme,
  RankTier,
  PointsAdjustment,
  UserProgress,
  InviteRecord,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Staff kiosk token — stored in memory only
let kioskStaffToken: string | null = null;

export function setKioskStaffToken(token: string | null) {
  kioskStaffToken = token;
}

export function getKioskStaffToken(): string | null {
  return kioskStaffToken;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const csrfToken = typeof window !== 'undefined' ? localStorage.getItem('csrf_token') : null;
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  const kioskToken = getKioskStaffToken();
  if (kioskToken) {
    config.headers['Authorization'] = `Bearer ${kioskToken}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  teacherLogin: async (email: string, password: string) => {
    const response = await api.post('/auth/teacher-login', { email, password });
    return response.data;
  },
  verifySession: async () => {
    const response = await api.post('/auth/verify-session');
    return response.data;
  },
  checkPassword: async (uuid: string) => {
    const response = await api.get(`/auth/check-password/${uuid}`);
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

export const usersApi = {
  list: async (includeInactive: boolean = false) => {
    const response = await api.get<User[]>('/users/', { params: includeInactive ? { include_inactive: true } : {} });
    return response.data;
  },
  get: async (uuid: string) => {
    const response = await api.get<User>(`/users/${uuid}`);
    return response.data;
  },
  create: async (data: Partial<User>) => {
    const response = await api.post('/users/', data);
    return response.data;
  },
  update: async (uuid: string, data: Partial<User>) => {
    const response = await api.put<User>(`/users/${uuid}`, data);
    return response.data;
  },
  search: async (query: string) => {
    const response = await api.get<User[]>(`/users/search?query=${query}`);
    return response.data;
  },
  uploadPhoto: async (uuid: string, file: File, offsetX: number = 0, offsetY: number = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('offset_x', offsetX.toString());
    formData.append('offset_y', offsetY.toString());
    const response = await api.post(`/users/${uuid}/photo`, formData);
    return response.data;
  },
  updatePhotoPosition: async (uuid: string, offsetX: number, offsetY: number) => {
    const response = await api.put(`/users/${uuid}/photo-position`, {
      offset_x: offsetX,
      offset_y: offsetY
    });
    return response.data;
  },
  deletePhoto: async (uuid: string) => {
    const response = await api.delete(`/users/${uuid}/photo`);
    return response.data;
  },
  toggleActive: async (uuid: string) => {
    const response = await api.post<{ is_current: boolean; message: string }>(`/admin/users/${uuid}/toggle-active`);
    return response.data;
  },
  teacherCreate: async (data: { first_name: string; last_name: string; email: string }) => {
    const response = await api.post<User>('/users/teacher-create', data);
    return response.data;
  },
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  exportCsv: async () => {
    const response = await api.get('/users/export-csv', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const classesApi = {
  list: async () => {
    const response = await api.get<ClassSchedule[]>('/classes/');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get<ClassSchedule>(`/classes/${id}`);
    return response.data;
  },
  create: async (data: Partial<ClassSchedule>) => {
    const response = await api.post('/classes/', data);
    return response.data;
  },
  update: async (uuid: string, data: Partial<ClassSchedule>) => {
    const response = await api.put<ClassSchedule>(`/classes/${uuid}`, data);
    return response.data;
  },
};

export const classInstancesApi = {
  list: async (params?: { class_id?: number; date?: string }) => {
    const response = await api.get<ClassInstance[]>('/class-instances/', { params });
    return response.data;
  },
  getByDate: async (classId: number, date: string) => {
    const response = await api.get<ClassInstance>(`/class-instances/by-date/?class_id=${classId}&date=${date}`);
    return response.data;
  },
  create: async (data: Partial<ClassInstance>) => {
    const response = await api.post('/class-instances/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<ClassInstance>) => {
    const response = await api.put<ClassInstance>(`/class-instances/${id}`, data);
    return response.data;
  },
};

export const attendanceApi = {
  getByUser: async (uuid: string) => {
    const response = await api.get<Attendance[]>(`/attendance/user/${uuid}`);
    return response.data;
  },
  getByClass: async (classId: number, date?: string) => {
    const response = await api.get<Attendance[]>(`/attendance/class/${classId}`, {
      params: { date },
    });
    return response.data;
  },
  checkIn: async (userUuid: string, classId: number, classInstanceId?: number) => {
    const response = await api.post('/attendance/check-in', {
      user_uuid: userUuid,
      class_id: classId,
      class_instance_id: classInstanceId,
    });
    return response.data;
  },
  direct: async (userUuid: string, classId: number, classInstanceId?: number, teacherUuid?: string, attendanceDate?: string) => {
    const response = await api.post('/attendance/direct', {
      user_uuid: userUuid,
      class_id: classId,
      class_instance_id: classInstanceId,
      teacher_uuid: teacherUuid,
      attendance_date: attendanceDate,
    });
    return response.data;
  },
  confirm: async (id: number) => {
    const response = await api.post(`/attendance/${id}/confirm`);
    return response.data;
  },
  cancel: async (id: number) => {
    const response = await api.delete(`/attendance/${id}/cancel`);
    return response.data;
  },
  bulkCheckIn: async (userUuid: string, classIds: number[]) => {
    const response = await api.post('/attendance/bulk-check-in', { user_uuid: userUuid, class_ids: classIds });
    return response.data;
  },
  bulkConfirm: async (ids: number[]) => {
    const response = await api.post('/attendance/bulk-confirm', { ids });
    return response.data;
  },
};

export const feedbackApi = {
  submit: async (attendanceId: number, rating: string, comment?: string) => {
    const response = await api.post('/feedback/', {
      attendance_id: attendanceId,
      rating,
      comment,
    });
    return response.data;
  },
  getByUser: async (uuid: string) => {
    const response = await api.get<ClassFeedback[]>(`/feedback/user/${uuid}`);
    return response.data;
  },
  getByTeacher: async (uuid: string) => {
    const response = await api.get<ClassFeedback[]>(`/feedback/teacher/${uuid}`);
    return response.data;
  },
  getAdminStats: async (params?: { start_date?: string; end_date?: string; classes?: string; teachers?: string; rating?: string }) => {
    const response = await api.get<FeedbackStats>('/feedback/admin/comprehensive-stats', { params });
    return response.data;
  },
  getAdminList: async (params?: { start_date?: string; end_date?: string; classes?: string; teachers?: string; rating?: string }) => {
    const response = await api.get<ClassFeedback[]>('/feedback/admin/list', { params });
    return response.data;
  },
};

export const rolesApi = {
  list: async () => {
    const response = await api.get<Role[]>('/roles/');
    return response.data;
  },
  getUserRoles: async (uuid: string) => {
    const response = await api.get<UserRole[]>(`/roles/user/${uuid}`);
    return response.data;
  },
  updateUserRoles: async (uuid: string, roleIds: number[]) => {
    const response = await api.put(`/roles/user/${uuid}`, { role_ids: roleIds });
    return response.data;
  },
  getUserHistory: async (uuid: string) => {
    const response = await api.get<UserRole[]>(`/roles/user/${uuid}/history`);
    return response.data;
  },
  getUsersByRole: async (role: string) => {
    const response = await api.get<User[]>(`/roles/users/by-role/${role}`);
    return response.data;
  },
};

export const termsApi = {
  list: async () => {
    const response = await api.get<Term[]>('/terms/');
    return response.data;
  },
  create: async (data: Partial<Term>) => {
    const response = await api.post('/terms/', data);
    return response.data;
  },
};

export const termTargetsApi = {
  list: async () => {
    const response = await api.get<TermTarget[]>('/terms/term-targets/');
    return response.data;
  },
  create: async (data: Partial<TermTarget>) => {
    const response = await api.post('/terms/term-targets/', data);
    return response.data;
  },
};

export const rankTiersApi = {
  list: async () => {
    const response = await api.get<RankTier[]>('/rank-tiers/');
    return response.data;
  },
  update: async (id: number, data: { target_points?: number | null }) => {
    const response = await api.put<RankTier>(`/rank-tiers/${id}`, data);
    return response.data;
  },
};

export const pointsAdjustmentsApi = {
  adjust: async (userUuid: string, data: { amount: number; reason: string; new_rank_tier_id?: number | null; notes?: string }) => {
    const response = await api.post<PointsAdjustment>(`/points-adjustments/adjust/${userUuid}`, data);
    return response.data;
  },
  list: async (userUuid: string) => {
    const response = await api.get<PointsAdjustment[]>(`/points-adjustments/${userUuid}`);
    return response.data;
  },
  getProgress: async (userUuid: string) => {
    const response = await api.get<UserProgress>(`/points-adjustments/progress/${userUuid}`);
    return response.data;
  },
};

export const curriculaApi = {
  list: async () => {
    const response = await api.get<Curriculum[]>('/curricula/');
    return response.data;
  },
  create: async (data: Partial<Curriculum>) => {
    const response = await api.post('/curricula/', data);
    return response.data;
  },
};

export const lessonsApi = {
  list: async (curriculumId?: number) => {
    const response = await api.get<Lesson[]>('/lessons/', { params: { curriculum_id: curriculumId } });
    return response.data;
  },
  create: async (data: Partial<Lesson>) => {
    const response = await api.post('/lessons/', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Lesson>) => {
    const response = await api.put<Lesson>(`/lessons/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/lessons/${id}`);
    return response.data;
  },
};

export const gymLocationsApi = {
  list: async () => {
    const response = await api.get<GymLocation[]>('/gym-locations/');
    return response.data;
  },
  create: async (data: Partial<GymLocation>) => {
    const response = await api.post('/gym-locations/', data);
    return response.data;
  },
};

export const classTypesApi = {
  list: async () => {
    const response = await api.get<ClassType[]>('/class-types/');
    return response.data;
  },
  create: async (data: Partial<ClassType>) => {
    const response = await api.post('/class-types/', data);
    return response.data;
  },
};

export const dashboardApi = {
  getStats: async (uuid: string) => {
    const response = await api.get<DashboardStats>(`/dashboard/stats/${uuid}`);
    return response.data;
  },
  getAttendanceTrend: async (uuid: string, days: number = 90) => {
    const response = await api.get(`/dashboard/attendance-trend/${uuid}?days=${days}`);
    return response.data;
  },
};

export const kioskApi = {
  unlock: async (email: string, password: string) => {
    const response = await api.post('/kiosk/unlock', { email, password });
    if (response.data?.access_token) {
      setKioskStaffToken(response.data.access_token);
    }
    return response.data;
  },
  lock: async () => {
    const response = await api.post('/kiosk/lock');
    setKioskStaffToken(null);
    return response.data;
  },
  verifyPin: async (pin: string) => {
    const response = await api.post('/kiosk/verify-pin', { pin });
    return response.data;
  },
  verifyUserPin: async (pin: string) => {
    const response = await api.post('/kiosk/verify-user-pin', { pin });
    return response.data;
  },
  verifyPinForUser: async (userUuid: string, pin: string) => {
    const response = await api.post('/kiosk/verify-pin-for-user', { user_uuid: userUuid, pin });
    return response.data;
  },
  updatePin: async (currentPin: string, newPin: string) => {
    const response = await api.put('/kiosk/update-pin', { current_pin: currentPin, new_pin: newPin });
    return response.data;
  },
};

export const newsApi = {
  list: async (publishedOnly: boolean = true) => {
    const response = await api.get<News[]>('/news/', { params: { published_only: publishedOnly } });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get<News>(`/news/${id}`);
    return response.data;
  },
  create: async (data: { title: string; content: string; is_published: boolean }) => {
    const response = await api.post('/news/', data);
    return response.data;
  },
  update: async (id: number, data: { title?: string; content?: string; is_published?: boolean }) => {
    const response = await api.put<News>(`/news/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/news/${id}`);
    return response.data;
  },
};

export const themesApi = {
  list: async () => {
    const response = await api.get<WebsiteTheme[]>('/themes/');
    return response.data;
  },
  getActive: async () => {
    const response = await api.get<WebsiteTheme>('/themes/active');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get<WebsiteTheme>(`/themes/${id}`);
    return response.data;
  },
  create: async (data: { name: string; config: string; is_active?: boolean }) => {
    const response = await api.post<WebsiteTheme>('/themes/', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; config?: string; is_active?: boolean }) => {
    const response = await api.put<WebsiteTheme>(`/themes/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/themes/${id}`);
    return response.data;
  },
  apply: async (id: number) => {
    const response = await api.post<WebsiteTheme>(`/themes/${id}/apply`);
    return response.data;
  },
};

export const commentsApi = {
  create: async (data: { content: string; parent_comment_id?: number; target_user_uuid?: string; rating?: string }, authorUuid: string) => {
    const response = await api.post<Comment>('/comments/', data, {
      params: { author_uuid: authorUuid },
    });
    return response.data;
  },
  getFeed: async (userUuid: string, role: string = '') => {
    const params: { user_uuid: string; role?: string } = { user_uuid: userUuid };
    if (role) params.role = role;
    const response = await api.get<Comment[]>('/comments/feed', { params });
    return response.data;
  },
  get: async (commentUuid: string) => {
    const response = await api.get<Comment>(`/comments/${commentUuid}`);
    return response.data;
  },
  update: async (commentUuid: string, data: { content: string }, authorUuid: string) => {
    const response = await api.put<Comment>(`/comments/${commentUuid}`, data, {
      params: { author_uuid: authorUuid },
    });
    return response.data;
  },
  delete: async (commentUuid: string, authorUuid: string) => {
    const response = await api.delete(`/comments/${commentUuid}`, {
      params: { author_uuid: authorUuid },
    });
    return response.data;
  },
};

export const inviteApi = {
  send: async (email: string, firstName?: string, lastName?: string) => {
    const response = await api.post('/auth/send-invite', { email, first_name: firstName, last_name: lastName });
    return response.data;
  },
  resend: async (userUuid: string) => {
    const response = await api.post('/auth/resend-invite', { user_uuid: userUuid });
    return response.data;
  },
  validate: async (token: string) => {
    const response = await api.get(`/auth/invite?token=${token}`);
    return response.data;
  },
  accept: async (token: string, password: string, pin: string) => {
    const response = await api.post('/auth/accept-invite', { token, password, pin });
    return response.data;
  },
  list: async () => {
    const response = await api.get<InviteRecord[]>('/admin/invites');
    return response.data;
  },
  revoke: async (inviteId: number) => {
    const response = await api.delete(`/admin/invites/${inviteId}`);
    return response.data;
  },
  testEmail: async (email: string) => {
    const response = await api.post('/admin/test-email', { email });
    return response.data;
  },
};

export const resetApi = {
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
  forgotPin: async (email: string) => {
    const response = await api.post('/auth/forgot-pin', { email });
    return response.data;
  },
  resetPin: async (token: string, pin: string) => {
    const response = await api.post('/auth/reset-pin', { token, pin });
    return response.data;
  },
  adminResetPassword: async (userUuid: string) => {
    const response = await api.post(`/admin/users/${userUuid}/reset-password`);
    return response.data;
  },
  adminResetPin: async (userUuid: string) => {
    const response = await api.post(`/admin/users/${userUuid}/reset-pin`);
    return response.data;
  },
};

export { api };
export default api;
