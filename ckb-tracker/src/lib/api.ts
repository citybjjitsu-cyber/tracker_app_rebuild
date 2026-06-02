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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
};

export const usersApi = {
  list: async () => {
    const response = await api.get<User[]>('/users/');
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
  direct: async (userUuid: string, classId: number, classInstanceId?: number, teacherUuid?: string) => {
    const response = await api.post('/attendance/direct', {
      user_uuid: userUuid,
      class_id: classId,
      class_instance_id: classInstanceId,
      teacher_uuid: teacherUuid,
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
  verifyPin: async (pin: string) => {
    const response = await api.post('/kiosk/verify-pin', { pin });
    return response.data;
  },
  verifyUserPin: async (pin: string) => {
    const response = await api.post('/kiosk/verify-user-pin', { pin });
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

export { api };
export default api;
