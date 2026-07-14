'use client';

import { useState, useEffect, useRef } from 'react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

import {
  usersApi,
  classesApi,
  rolesApi,
  termsApi,
  termTargetsApi,
  curriculaApi,
  lessonsApi,
  gymLocationsApi,
  classTypesApi,
  feedbackApi,
  dashboardApi,
  classInstancesApi,
  newsApi,
  themesApi,
  rankTiersApi,
  pointsAdjustmentsApi,
  inviteApi,
  resetApi,
  api,
} from '@/lib/api';
import { cn, formatDate, DAYS_OF_WEEK, getRankColor } from '@/lib/utils';
import { Camera, LogOut, Plus, Shield, X, Edit3 } from 'lucide-react';
import type { User, ClassSchedule, Role, Term, TermTarget, Curriculum, Lesson, GymLocation, ClassType, Rank, News, WebsiteTheme, ClassInstance, FeedbackStats, AttendanceTrend, DashboardStats, ClassFeedback, RankTier, PointsAdjustment, UserProgress, InviteRecord } from '@/types';

export default function AdminPage() {
  const { user, isAdmin, isAuthenticated, isLoading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [targets, setTargets] = useState<TermTarget[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [gymLocations, setGymLocations] = useState<GymLocation[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    rank: Rank;
    nicknames: string;
    last_graded_date: string;
    comments: string;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    rank: 'White',
    nicknames: '',
    last_graded_date: '',
    comments: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [classForm, setClassForm] = useState<{
    class_name: string;
    day: string;
    time: string;
    points: number;
    gym_id: string;
    class_type_id: string;
  }>({
    class_name: '',
    day: 'Monday',
    time: '18:00',
    points: 1,
    gym_id: '',
    class_type_id: '',
  });
  const [termForm, setTermForm] = useState({ term_name: '', start_date: '', end_date: '' });
  const [targetForm, setTargetForm] = useState<{ term_id: string; rank: Rank; target: number }>({ term_id: '', rank: 'White', target: 0 });
  const [curriculumForm, setCurriculumForm] = useState<{ class_id: string; name: string; description: string }>({ class_id: '', name: '', description: '' });
  const [lessonForm, setLessonForm] = useState<{ curriculum_id: string; title: string; description: string; lesson_plan_url: string; video_folder_url: string }>({ curriculum_id: '', title: '', description: '', lesson_plan_url: '', video_folder_url: '' });
  const [gymForm, setGymForm] = useState({ name: '', address: '' });
  const [classTypeForm, setClassTypeForm] = useState({ name: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentStats, setStudentStats] = useState<{ totalStudents: number; totalClasses: number }>({ totalStudents: 0, totalClasses: 0 });
  const [lessonSubTab, setLessonSubTab] = useState<'curricula' | 'lessons' | 'assign' | 'teachers'>('curricula');
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm_password: '' });
  const [photoMethod, setPhotoMethod] = useState<'upload' | 'camera'>('upload');
  const [classInstanceForm, setClassInstanceForm] = useState({ class_id: '', date: '', lesson_id: '', teacher_uuid: '' });
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [teacherAssignmentForm, setTeacherAssignmentForm] = useState({ class_id: '', date: '', teacher_uuid: '' });

  const [dbStats, setDbStats] = useState<Record<string, unknown> | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<{ stats: DashboardStats; trend: AttendanceTrend[] } | null>(null);
  const [selectedStudentAnalytics, setSelectedStudentAnalytics] = useState<User | null>(null);
  const [feedbackFilters, setFeedbackFilters] = useState({ startDate: '', endDate: '', classes: '', rating: 'all' });
  const [feedbackList, setFeedbackList] = useState<ClassFeedback[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', is_published: false });
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const { resetToDefault } = useTheme();
  const [themes, setThemes] = useState<WebsiteTheme[]>([]);
  const [themeForm, setThemeForm] = useState({ name: '', config: '' });
  const [editingTheme, setEditingTheme] = useState<WebsiteTheme | null>(null);
  const [themeConfigEditor, setThemeConfigEditor] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<Record<string, unknown> | null>(null);
  const [rankTiers, setRankTiers] = useState<RankTier[]>([]);
  const [editingTierId, setEditingTierId] = useState<number | null>(null);
  const [editingTierPoints, setEditingTierPoints] = useState<string>('');
  const [promoSearch, setPromoSearch] = useState('');
  const [promoUser, setPromoUser] = useState<User | null>(null);
  const [promoProgress, setPromoProgress] = useState<UserProgress | null>(null);
  const [promoAdjustments, setPromoAdjustments] = useState<PointsAdjustment[]>([]);
  const [promoAmount, setPromoAmount] = useState('');
  const [promoReason, setPromoReason] = useState('manual_deduction');
  const [promoNewRankTierId, setPromoNewRankTierId] = useState<string>('');
  const [promoNotes, setPromoNotes] = useState('');
  const [classEditModal, setClassEditModal] = useState<ClassSchedule | null>(null);
  const [classEditForm, setClassEditForm] = useState({ class_name: '', day: '', time: '', points: 0, gym_id: '', class_type_id: '' });
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [positionOffset, setPositionOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    rank: 'White' as Rank,
    nicknames: '',
    comments: '',
  });
  const [newUserPhotoMethod, setNewUserPhotoMethod] = useState<'upload' | 'camera'>('upload');
  const [newUserCameraStream, setNewUserCameraStream] = useState<MediaStream | null>(null);
  const newUserVideoRef = useRef<HTMLVideoElement>(null);
  const newUserCanvasRef = useRef<HTMLCanvasElement>(null);
  const newUserFileInputRef = useRef<HTMLInputElement>(null);
  const [newUserPhoto, setNewUserPhoto] = useState<File | null>(null);
  const [newUserPhotoPreview, setNewUserPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'lessons' || activeTab === 'assign') {
      loadClassInstances();
      loadTeachers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'database') {
      loadDbStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedbackAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'news') {
      loadNews();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'invites') {
      loadInvites();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'themes') {
      loadThemes();
    }
  }, [activeTab]);

  async function loadNews() {
    try {
      const data = await newsApi.list(false);
      setNewsItems(data);
    } catch (error) {
      console.error('Error loading news:', error);
    }
  };

  async function loadThemes() {
    try {
      const data = await themesApi.list();
      setThemes(data);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const handleApplyTheme = async (themeId: number) => {
    try {
      await themesApi.apply(themeId);
      await loadThemes();
      window.location.reload();
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  const handleDeleteTheme = async (themeId: number) => {
    if (!confirm('Delete this theme?')) return;
    try {
      await themesApi.delete(themeId);
      await loadThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('Reset to default theme? This will deactivate the current theme.')) return;
    try {
      const activeThemes = themes.filter(t => t.is_active);
      for (const t of activeThemes) {
        await themesApi.update(t.id, { is_active: false });
      }
      resetToDefault();
      await loadThemes();
    } catch (error) {
      console.error('Error resetting theme:', error);
    }
  };

  const handleCreateTheme = async () => {
    if (!themeForm.name.trim()) {
      alert('Theme name is required');
      return;
    }
    try {
      await themesApi.create({
        name: themeForm.name,
        config: themeForm.config,
      });
      setThemeForm({ name: '', config: '' });
      await loadThemes();
    } catch (error) {
      console.error('Error creating theme:', error);
    }
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme) return;
    try {
      await themesApi.update(editingTheme.id, {
        name: editingTheme.name,
        config: themeConfigEditor,
      });
      setEditingTheme(null);
      setThemeConfigEditor('');
      await loadThemes();
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  async function loadAllData() {
    try {
      const [usersData, classesData, rolesData, termsData, targetsData, curriculaData, lessonsData, gymsData, typesData, tiersData] = await Promise.all([
        usersApi.list(),
        classesApi.list(),
        rolesApi.list(),
        termsApi.list(),
        termTargetsApi.list(),
        curriculaApi.list(),
        lessonsApi.list(),
        gymLocationsApi.list(),
        classTypesApi.list(),
        rankTiersApi.list(),
      ]);
      setUsers(usersData);
      setClasses(classesData);
      setRoles(rolesData);
      setTerms(termsData);
      setTargets(targetsData);
      setCurricula(curriculaData);
      setLessons(lessonsData);
      setGymLocations(gymsData);
      setClassTypes(typesData);
      setRankTiers(tiersData);
      setStudentStats({ totalStudents: usersData.length, totalClasses: classesData.length });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password, true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid admin credentials');
    }
  };

  const handleSelectUser = async (u: User) => {
    setSelectedUser(u);
    setPositionOffset({ 
      x: u.image_offset_x ?? 0, 
      y: u.image_offset_y ?? 0 
    });
    setUserForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      rank: u.rank || 'White',
      nicknames: u.nicknames || '',
      last_graded_date: u.last_graded_date || '',
      comments: u.comments || '',
    });
    try {
      const userRoles = await rolesApi.getUserRoles(u.user_uuid);
      setSelectedRoles(userRoles.map(ur => ur.role_id));
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(userForm).filter(([_, v]) => v !== '')
      );
      await usersApi.update(selectedUser.user_uuid, payload);
      await rolesApi.updateUserRoles(selectedUser.user_uuid, selectedRoles);
      loadAllData();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      const err = error as { response?: { data?: unknown; status?: number }; message?: string };
      const detail = err.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || 'Failed to save changes.';
      alert(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateClass = async () => {
    setIsProcessing(true);
    try {
      await classesApi.create({
        class_name: classForm.class_name,
        day: classForm.day,
        time: classForm.time,
        points: classForm.points,
        gym_id: classForm.gym_id ? Number(classForm.gym_id) : undefined,
        class_type_id: classForm.class_type_id ? Number(classForm.class_type_id) : undefined,
      });
      loadAllData();
      setClassForm({ class_name: '', day: 'Monday', time: '18:00', points: 1, gym_id: '', class_type_id: '' });
    } catch (error) {
      console.error('Error creating class:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTerm = async () => {
    setIsProcessing(true);
    try {
      await termsApi.create(termForm);
      loadAllData();
      setTermForm({ term_name: '', start_date: '', end_date: '' });
    } catch (error) {
      console.error('Error creating term:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTarget = async () => {
    setIsProcessing(true);
    try {
      await termTargetsApi.create({
        term_id: Number(targetForm.term_id),
        rank: targetForm.rank as TermTarget['rank'],
        target: targetForm.target,
      });
      loadAllData();
      setTargetForm({ term_id: '', rank: 'White', target: 0 });
    } catch (error) {
      console.error('Error creating target:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCurriculum = async () => {
    if (!curriculumForm.class_id) return;
    setIsProcessing(true);
    try {
      await curriculaApi.create({
        class_id: Number(curriculumForm.class_id),
        name: curriculumForm.name,
        description: curriculumForm.description,
      });
      loadAllData();
      setCurriculumForm({ class_id: '', name: '', description: '' });
    } catch (error) {
      console.error('Error creating curriculum:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!lessonForm.curriculum_id) return;
    setIsProcessing(true);
    try {
      await lessonsApi.create({
        curriculum_id: Number(lessonForm.curriculum_id),
        title: lessonForm.title,
        description: lessonForm.description,
        lesson_plan_url: lessonForm.lesson_plan_url,
        video_folder_url: lessonForm.video_folder_url,
      });
      loadAllData();
      setLessonForm({ curriculum_id: '', title: '', description: '', lesson_plan_url: '', video_folder_url: '' });
    } catch (error) {
      console.error('Error creating lesson:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateGym = async () => {
    setIsProcessing(true);
    try {
      await gymLocationsApi.create(gymForm);
      loadAllData();
      setGymForm({ name: '', address: '' });
    } catch (error) {
      console.error('Error creating gym:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateClassType = async () => {
    setIsProcessing(true);
    try {
      await classTypesApi.create(classTypeForm);
      loadAllData();
      setClassTypeForm({ name: '' });
    } catch (error) {
      console.error('Error creating class type:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePasswordComplexity = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(pw)) return 'Password must contain at least one digit';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Password must contain at least one special character';
    return null;
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (passwordForm.password !== passwordForm.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    const pwError = validatePasswordComplexity(passwordForm.password);
    if (pwError) {
      alert(pwError);
      return;
    }
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await usersApi.update(selectedUser.user_uuid, { password: passwordForm.password } as any);
      alert('Password reset successfully');
      setPasswordForm({ password: '', confirm_password: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      const detail = err.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || 'Failed to reset password';
      alert(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: unknown) {
      console.error('Camera access error:', error);
      const err = error as { name?: string; message?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is in use by another app or browser tab.');
      } else {
        setCameraError('Could not access camera. Please check permissions.');
      }
    } finally {
      setIsCameraInitializing(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraError(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedUser) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob && selectedUser) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          await uploadPhoto(file);
        }
      }, 'image/jpeg', 0.8);
    }
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedUser) {
      await uploadPhoto(file);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const updatedUser = await usersApi.uploadPhoto(selectedUser.user_uuid, file);
      setSelectedUser({ ...selectedUser, profile_image_url: updatedUser.profile_image_url });
      loadAllData();
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedUser) return;
    if (!confirm('Delete profile photo?')) return;
    setIsProcessing(true);
    try {
      await usersApi.deletePhoto(selectedUser.user_uuid);
      setSelectedUser({ ...selectedUser, profile_image_url: undefined });
      loadAllData();
    } catch (error) {
      console.error('Delete photo error:', error);
      alert('Failed to delete photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewUserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setNewUserCameraStream(stream);
      if (newUserVideoRef.current) {
        newUserVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Could not access camera');
    }
  };

  const stopNewUserCamera = () => {
    if (newUserCameraStream) {
      newUserCameraStream.getTracks().forEach(track => track.stop());
      setNewUserCameraStream(null);
    }
  };

  const captureNewUserPhoto = () => {
    if (!newUserVideoRef.current || !newUserCanvasRef.current) return;
    const video = newUserVideoRef.current;
    const canvas = newUserCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          setNewUserPhoto(file);
          setNewUserPhotoPreview(URL.createObjectURL(blob));
        }
      }, 'image/jpeg', 0.8);
    }
    stopNewUserCamera();
  };

  const handleNewUserFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewUserPhoto(file);
      setNewUserPhotoPreview(URL.createObjectURL(file));
    }
  };

  const resetNewUserForm = () => {
    setIsCreatingUser(false);
    setNewUserForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
      rank: 'White',
      nicknames: '',
      comments: '',
    });
    setNewUserPhoto(null);
    setNewUserPhotoPreview(null);
    stopNewUserCamera();
  };

  const handleCreateNewUser = async () => {
    if (newUserForm.password !== newUserForm.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    const pwError = validatePasswordComplexity(newUserForm.password);
    if (pwError) {
      alert(pwError);
      return;
    }
    setIsProcessing(true);
    try {
      const user = await usersApi.create({
        first_name: newUserForm.first_name,
        last_name: newUserForm.last_name,
        email: newUserForm.email,
        password: newUserForm.password,
        rank: newUserForm.rank,
        nicknames: newUserForm.nicknames || undefined,
        comments: newUserForm.comments || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    
      if (newUserPhoto) {
        await usersApi.uploadPhoto(user.user_uuid, newUserPhoto);
      }

      loadAllData();
      resetNewUserForm();
    } catch (error) {
      console.error('Error creating user:', error);
      const err = error as { response?: { data?: unknown }; message?: string };
      const detail = err.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || 'Failed to create user';
      alert(detail);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateClassInstance = async () => {
    if (!classInstanceForm.class_id || !classInstanceForm.date) return;
    setIsProcessing(true);
    try {
      await classInstancesApi.create({
        class_id: Number(classInstanceForm.class_id),
        class_date: classInstanceForm.date,
        lesson_id: classInstanceForm.lesson_id ? Number(classInstanceForm.lesson_id) : undefined,
        teacher_uuid: classInstanceForm.teacher_uuid || undefined,
      });
      loadClassInstances();
      setClassInstanceForm({ class_id: '', date: '', lesson_id: '', teacher_uuid: '' });
      alert('Assignment created');
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTeacherAssignment = async () => {
    if (!teacherAssignmentForm.class_id || !teacherAssignmentForm.date || !teacherAssignmentForm.teacher_uuid) return;
    setIsProcessing(true);
    try {
      await classInstancesApi.create({
        class_id: Number(teacherAssignmentForm.class_id),
        class_date: teacherAssignmentForm.date,
        teacher_uuid: teacherAssignmentForm.teacher_uuid,
      });
      loadClassInstances();
      setTeacherAssignmentForm({ class_id: '', date: '', teacher_uuid: '' });
      alert('Teacher assigned');
    } catch (error) {
      console.error('Error assigning teacher:', error);
      alert('Failed to assign teacher');
    } finally {
      setIsProcessing(false);
    }
  };

  async function loadClassInstances() {
    try {
      const data = await classInstancesApi.list();
      setClassInstances(data);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  async function loadTeachers() {
    try {
      const allUsers = await usersApi.list();
      setTeachers(allUsers.filter(u => u.rank === 'Black' || u.rank === 'Brown'));
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  async function loadDbStats() {
    try {
      const res = await api.get('/database/stats');
      setDbStats(res.data);
    } catch (error) {
      console.error('Error loading db stats:', error);
    }
  };

  async function loadInvites() {
    try {
      const data = await inviteApi.list();
      setInvites(data);
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  };

  async function loadFeedbackAnalytics() {
    try {
      const stats = await feedbackApi.getAdminStats({
        start_date: feedbackFilters.startDate || undefined,
        end_date: feedbackFilters.endDate || undefined,
      });
      setFeedbackStats(stats);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const searchFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const [stats, list] = await Promise.all([
        feedbackApi.getAdminStats({
          start_date: feedbackFilters.startDate || undefined,
          end_date: feedbackFilters.endDate || undefined,
          rating: feedbackFilters.rating === 'all' ? undefined : feedbackFilters.rating,
        }),
        feedbackApi.getAdminList({
          start_date: feedbackFilters.startDate || undefined,
          end_date: feedbackFilters.endDate || undefined,
          rating: feedbackFilters.rating === 'all' ? undefined : feedbackFilters.rating,
        }),
      ]);
      setFeedbackStats(stats);
      setFeedbackList(list);
    } catch (error) {
      console.error('Error searching feedback:', error);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const loadStudentAnalytics = async (student: User) => {
    setSelectedStudentAnalytics(student);
    try {
      const [stats, trend] = await Promise.all([
        dashboardApi.getStats(student.user_uuid),
        dashboardApi.getAttendanceTrend(student.user_uuid, 90),
      ]);
      setPerformanceStats({ stats, trend });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email} ${u.rank}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'users', label: 'User Admin' },
    { id: 'invites', label: 'Invites' },
    { id: 'classes', label: 'Class Schedule' },
    { id: 'gyms', label: 'Gyms & Types' },
    { id: 'terms', label: 'Terms' },
    { id: 'rank-tiers', label: 'Rank Tiers' },
    { id: 'promotions', label: 'Promotions' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'news', label: 'News' },
    { id: 'analytics', label: 'Performance Analytics' },
    { id: 'feedback', label: 'Feedback Analytics' },
    { id: 'database', label: 'Database' },
    { id: 'csv', label: 'CSV Import/Export' },
    { id: 'themes', label: 'Themes' },
  ];

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-container flex items-center justify-center">
              <Shield className="w-8 h-8 text-on-primary-container" />
            </div>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Admin <span className="text-primary-container">Login</span></h1>
            <p className="text-on-surface-variant text-sm mt-1">Sign in with admin credentials</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-headline font-bold text-on-surface">Admin Settings</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

      <div className="flex gap-4 mb-6 border-b border-outline-variant/20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs font-bold font-label tracking-wider uppercase pb-3 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant/70 hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Members</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search by name, rank, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                    <Button size="sm" onClick={() => setIsCreatingUser(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Member
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Total Active Members: {studentStats.totalStudents}</p>
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.user_uuid}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${selectedUser?.user_uuid === u.user_uuid ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      onClick={() => handleSelectUser(u)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={u.profile_image_url} firstName={u.first_name} lastName={u.last_name} offsetX={u.image_offset_x} offsetY={u.image_offset_y} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{u.first_name} {u.last_name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <RankBadge rank={u.rank} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Member</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center mb-4">
                    <Avatar
                      src={selectedUser.profile_image_url}
                      firstName={selectedUser.first_name}
                      lastName={selectedUser.last_name}
                      offsetX={positionOffset.x}
                      offsetY={positionOffset.y}
                      size="xl"
                    />
                    {selectedUser.profile_image_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeletePhoto}
                        disabled={isProcessing}
                        className="text-red-500 dark:text-red-400 mt-2"
                      >
                        Delete Photo
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="First Name"
                      value={userForm.first_name}
                      onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                    />
                    <Input
                      label="Last Name"
                      value={userForm.last_name}
                      onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                  <Select
                    label="Rank"
                    value={userForm.rank}
                    onChange={(e) => setUserForm({ ...userForm, rank: e.target.value as Rank })}
                    options={['White', 'Blue', 'Purple', 'Brown', 'Black'].map(r => ({ value: r, label: r }))}
                  />
                  <Input
                    label="Nicknames"
                    value={userForm.nicknames}
                    onChange={(e) => setUserForm({ ...userForm, nicknames: e.target.value })}
                  />
                  <Input
                    label="Last Graded Date"
                    type="date"
                    value={userForm.last_graded_date}
                    onChange={(e) => setUserForm({ ...userForm, last_graded_date: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Roles</label>
                    <div className="space-y-1">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles([...selectedRoles, role.id]);
                              } else {
                                setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                              }
                            }}
                          />
                          {role.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="Comments"
                    value={userForm.comments}
                    onChange={(e) => setUserForm({ ...userForm, comments: e.target.value })}
                  />
                  <Button className="w-full" onClick={handleSaveUser} disabled={isProcessing}>
                    Save Changes & Archive History
                  </Button>

                  <div className="border-t dark:border-slate-700 pt-4 mt-4">
                    <h4 className="font-medium mb-2 text-slate-900 dark:text-white">Reset Password</h4>
                    <Input
                      label="New Password"
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-on-surface-variant/60 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character</p>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleResetPassword}
                      disabled={isProcessing || !passwordForm.password}
                    >
                      Reset Password
                    </Button>
                  </div>

                  <div className="border-t dark:border-slate-700 pt-4 mt-4">
                    <h4 className="font-medium mb-2 text-slate-900 dark:text-white">Email-Based Reset</h4>
                    <Button
                      variant="outline"
                      className="w-full mb-2"
                      disabled={isProcessing}
                      onClick={async () => {
                        if (!selectedUser) return;
                        if (!confirm(`Send password reset email to ${selectedUser.email}?`)) return;
                        try {
                          await resetApi.adminResetPassword(selectedUser.user_uuid);
                          alert('Password reset email sent!');
                        } catch (err: unknown) {
                          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send reset email.';
                          alert(detail);
                        }
                      }}
                    >
                      Send Password Reset Email
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isProcessing}
                      onClick={async () => {
                        if (!selectedUser) return;
                        if (!confirm(`Send PIN reset email to ${selectedUser.email}?`)) return;
                        try {
                          await resetApi.adminResetPin(selectedUser.user_uuid);
                          alert('PIN reset email sent!');
                        } catch (err: unknown) {
                          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send PIN reset email.';
                          alert(detail);
                        }
                      }}
                    >
                      Send PIN Reset Email
                    </Button>
                  </div>

                  <div className="border-t dark:border-slate-700 pt-4">
                    <h4 className="font-medium mb-2 text-slate-900 dark:text-white">Photo Management</h4>
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant={photoMethod === 'upload' ? 'primary' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setPhotoMethod('upload');
                          stopCamera();
                        }}
                      >
                        Upload
                      </Button>
                      <Button
                        variant={photoMethod === 'camera' ? 'primary' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setPhotoMethod('camera');
                          startCamera();
                        }}
                      >
                        Camera
                      </Button>
                    </div>
                    {photoMethod === 'upload' ? (
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    ) : cameraStream ? (
                      <div className="space-y-2">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded" />
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={capturePhoto}>Capture</Button>
                          <Button variant="outline" size="sm" onClick={stopCamera}>Cancel</Button>
                        </div>
                      </div>
                    ) : cameraError ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-red-500 dark:text-red-400 mb-2">{cameraError}</p>
                        <Button variant="outline" size="sm" onClick={startCamera}>
                          Try Again
                        </Button>
                      </div>
                    ) : isCameraInitializing ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Initializing camera...</p>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Button variant="outline" size="sm" onClick={startCamera}>
                          Start Camera
                        </Button>
                      </div>
                    )}
                    {photoMethod === 'upload' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                      >
                        Choose Photo
                      </Button>
                    )}
                    {selectedUser?.profile_image_url && (
                      <div className="border-t dark:border-slate-700 pt-4 mt-4">
                        <h5 className="text-sm font-medium mb-2 text-slate-900 dark:text-white">Photo Position</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Horizontal: {positionOffset.x.toFixed(2)}</label>
                            <input
                              type="range"
                              min="-1"
                              max="1"
                              step="0.05"
                              value={positionOffset.x}
                              onChange={(e) => setPositionOffset({ ...positionOffset, x: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Vertical: {positionOffset.y.toFixed(2)}</label>
                            <input
                              type="range"
                              min="-1"
                              max="1"
                              step="0.05"
                              value={positionOffset.y}
                              onChange={(e) => setPositionOffset({ ...positionOffset, y: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              if (!selectedUser) return;
                              try {
                                await usersApi.updatePhotoPosition(selectedUser.user_uuid, positionOffset.x, positionOffset.y);
                                setSelectedUser({ ...selectedUser, image_offset_x: positionOffset.x, image_offset_y: positionOffset.y });
                                alert('Photo position updated');
                              } catch (error) {
                                console.error('Update position error:', error);
                                alert('Failed to update photo position');
                              }
                            }}
                            disabled={isProcessing}
                          >
                            Save Position
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {isCreatingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Member</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetNewUserForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                {newUserPhotoPreview ? (
                  <div className="relative">
                    <img
                      src={newUserPhotoPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-700"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={() => {
                        setNewUserPhoto(null);
                        setNewUserPhotoPreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant={newUserPhotoMethod === 'upload' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setNewUserPhotoMethod('upload');
                      stopNewUserCamera();
                    }}
                  >
                    Upload
                  </Button>
                  <Button
                    variant={newUserPhotoMethod === 'camera' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setNewUserPhotoMethod('camera');
                      startNewUserCamera();
                    }}
                  >
                    Camera
                  </Button>
                </div>
                {newUserPhotoMethod === 'upload' ? (
                  <input
                    type="file"
                    accept="image/*"
                    ref={newUserFileInputRef}
                    onChange={handleNewUserFileUpload}
                    className="hidden"
                  />
                ) : newUserCameraStream ? (
                  <div className="space-y-2 mt-2">
                    <video ref={newUserVideoRef} autoPlay playsInline muted className="w-full max-w-xs rounded-lg" />
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={captureNewUserPhoto}>Capture</Button>
                      <Button variant="outline" size="sm" onClick={stopNewUserCamera}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
                {newUserPhotoMethod === 'upload' && !newUserPhotoPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => newUserFileInputRef.current?.click()}
                  >
                    Choose Photo
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={newUserForm.first_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={newUserForm.last_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={newUserForm.confirm_password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, confirm_password: e.target.value })}
                  required
                />
              </div>
              <p className="text-xs text-on-surface-variant/60 -mt-2">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Rank</label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  value={newUserForm.rank}
                  onChange={(e) => setNewUserForm({ ...newUserForm, rank: e.target.value as Rank })}
                >
                  <option value="White">White</option>
                  <option value="Blue">Blue</option>
                  <option value="Purple">Purple</option>
                  <option value="Brown">Brown</option>
                  <option value="Black">Black</option>
                </select>
              </div>
              <Input
                label="Nicknames (optional)"
                value={newUserForm.nicknames}
                onChange={(e) => setNewUserForm({ ...newUserForm, nicknames: e.target.value })}
              />
              <Input
                label="Comments (optional)"
                value={newUserForm.comments}
                onChange={(e) => setNewUserForm({ ...newUserForm, comments: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={handleCreateNewUser}
                disabled={isProcessing || !newUserForm.first_name || !newUserForm.last_name || !newUserForm.email || !newUserForm.password}
                isLoading={isProcessing}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Member
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Class Name"
                value={classForm.class_name}
                onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
              />
              <Select
                label="Day"
                value={classForm.day}
                onChange={(e) => setClassForm({ ...classForm, day: e.target.value })}
                options={DAYS_OF_WEEK.map(d => ({ value: d, label: d }))}
              />
              <Input
                label="Time"
                type="time"
                value={classForm.time}
                onChange={(e) => setClassForm({ ...classForm, time: e.target.value })}
              />
              <Input
                label="Points"
                type="number"
                value={classForm.points}
                onChange={(e) => setClassForm({ ...classForm, points: Number(e.target.value) })}
              />
              <Select
                label="Gym Location"
                value={classForm.gym_id}
                onChange={(e) => setClassForm({ ...classForm, gym_id: e.target.value })}
                options={[{ value: '', label: 'Select...' }, ...gymLocations.map(g => ({ value: g.id.toString(), label: g.name }))]}
              />
              <Select
                label="Class Type"
                value={classForm.class_type_id}
                onChange={(e) => setClassForm({ ...classForm, class_type_id: e.target.value })}
                options={[{ value: '', label: 'Select...' }, ...classTypes.map(t => ({ value: t.id.toString(), label: t.name }))]}
              />
              <Button className="w-full" onClick={handleCreateClass} disabled={isProcessing}>
                Add Class
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Class Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const dayClasses = classes.filter(c => c.day === day).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                  return (
                    <div key={day} className="min-h-[200px] border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-center font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        {day}
                      </div>
                      <div className="space-y-2">
                        {dayClasses.length > 0 ? (
                          dayClasses.map((cls) => (
                            <div
                              key={cls.id}
                              className="p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm cursor-pointer hover:ring-1 hover:ring-primary-container transition-all"
                              onClick={() => {
                                setClassEditModal(cls);
                                setClassEditForm({
                                  class_name: cls.class_name,
                                  day: cls.day || '',
                                  time: cls.time || '',
                                  points: cls.points,
                                  gym_id: cls.gym_id?.toString() || '',
                                  class_type_id: cls.class_type_id?.toString() || '',
                                });
                              }}
                            >
                              <p className="font-medium text-xs text-slate-900 dark:text-white truncate">{cls.class_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{cls.time}</p>
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{cls.points} pts</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No classes</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'gyms' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gym Locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Name"
                value={gymForm.name}
                onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
              />
              <Input
                label="Address"
                value={gymForm.address}
                onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
              />
              <Button className="w-full" onClick={handleCreateGym} disabled={isProcessing}>
                Add Gym
              </Button>
              <div className="space-y-2 mt-4">
                {gymLocations.map((gym) => (
                  <div key={gym.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="font-medium text-slate-900 dark:text-white">{gym.name}</p>
                    {gym.address && <p className="text-sm text-slate-500 dark:text-slate-400">{gym.address}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Type Name"
                value={classTypeForm.name}
                onChange={(e) => setClassTypeForm({ ...classTypeForm, name: e.target.value })}
              />
              <Button className="w-full" onClick={handleCreateClassType} disabled={isProcessing}>
                Add Class Type
              </Button>
              <div className="space-y-2 mt-4">
                {classTypes.map((type) => (
                  <div key={type.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white">
                    {type.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'terms' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Term</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Term Name"
                value={termForm.term_name}
                onChange={(e) => setTermForm({ ...termForm, term_name: e.target.value })}
              />
              <Input
                label="Start Date"
                type="date"
                value={termForm.start_date}
                onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={termForm.end_date}
                onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
              />
              <Button className="w-full" onClick={handleCreateTerm} disabled={isProcessing}>
                Add Term
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {terms.map((term) => (
                  <div key={term.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="font-medium text-slate-900 dark:text-white">{term.term_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(term.start_date)} - {formatDate(term.end_date)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'rank-tiers' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rank Tiers</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant">All targets default to 500 pts</span>
                <Button size="sm" variant="outline" onClick={async () => {
                  for (const tier of rankTiers) {
                    await rankTiersApi.update(tier.id, { target_points: 500 });
                  }
                  const tiers = await rankTiersApi.list();
                  setRankTiers(tiers);
                }}>
                  Reset All to 500
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant">Belt</th>
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant">Display Name</th>
                    <th className="text-right py-2 px-3 font-semibold text-on-surface-variant">Target Points</th>
                    <th className="text-right py-2 px-3 font-semibold text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rankTiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50">
                      <td className="py-2 px-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold', getRankColor(tier.rank))}>
                          {tier.rank}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-on-surface">{tier.display_name}</td>
                      <td className="py-2 px-3 text-right">
                        {editingTierId === tier.id ? (
                          <input
                            type="number"
                            min="0"
                            className="w-24 text-right px-2 py-1 rounded border border-outline-variant/20 bg-surface-container-lowest text-on-surface text-sm"
                            value={editingTierPoints}
                            onChange={(e) => setEditingTierPoints(e.target.value)}
                            onBlur={async () => {
                              const val = editingTierPoints === '' ? null : Number(editingTierPoints);
                              await rankTiersApi.update(tier.id, { target_points: val });
                              const tiers = await rankTiersApi.list();
                              setRankTiers(tiers);
                              setEditingTierId(null);
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                              if (e.key === 'Escape') {
                                setEditingTierId(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="text-on-surface">{tier.target_points ?? '—'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTierId(tier.id);
                            setEditingTierPoints(tier.target_points?.toString() ?? '');
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Search</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by name or email..."
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
              />
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                {promoSearch.length >= 2 && users
                  .filter(u => {
                    const q = promoSearch.toLowerCase();
                    return u.is_current && (
                      u.first_name.toLowerCase().includes(q) ||
                      u.last_name.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q)
                    );
                  })
                  .map(u => (
                    <button
                      key={u.user_uuid}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        promoUser?.user_uuid === u.user_uuid
                          ? 'bg-primary-container/20 text-on-surface'
                          : 'hover:bg-surface-container-lowest text-on-surface'
                      }`}
                      onClick={async () => {
                        setPromoUser(u);
                        setPromoAmount('');
                        setPromoReason('manual_deduction');
                        setPromoNewRankTierId('');
                        setPromoNotes('');
                        try {
                          const [progress, adjustments] = await Promise.all([
                            pointsAdjustmentsApi.getProgress(u.user_uuid),
                            pointsAdjustmentsApi.list(u.user_uuid),
                          ]);
                          setPromoProgress(progress);
                          setPromoAdjustments(adjustments);
                        } catch (err) {
                          console.error('Error loading promotion data:', err);
                        }
                      }}
                    >
                      {u.first_name} {u.last_name} — {u.rank || 'No rank'}
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>

          {promoUser && promoProgress && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Progress — {promoUser.first_name} {promoUser.last_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-surface-container-lowest rounded-lg">
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Current Rank</p>
                      <p className="text-lg font-bold text-on-surface mt-1">
                        {promoProgress.current_rank_tier?.display_name || promoUser.rank || 'Unknown'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface-container-lowest rounded-lg">
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Target Points</p>
                      <p className="text-lg font-bold text-on-surface mt-1">{promoProgress.current_target ?? '—'}</p>
                    </div>
                    <div className="p-3 bg-surface-container-lowest rounded-lg">
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Current Progress</p>
                      <p className="text-lg font-bold text-on-surface mt-1">{promoProgress.current_progress}</p>
                    </div>
                    <div className="p-3 bg-surface-container-lowest rounded-lg">
                      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Percentage</p>
                      <p className="text-lg font-bold text-on-surface mt-1">{promoProgress.percentage ?? '—'}%</p>
                    </div>
                  </div>
                  <div className="text-xs text-on-surface-variant space-y-1">
                    <p>Total earned from attendance: {promoProgress.total_earned}</p>
                    <p>Total adjustments: {promoProgress.total_adjustments}</p>
                    {promoProgress.next_rank_tier && (
                      <p>Next rank: {promoProgress.next_rank_tier.display_name} (target: {promoProgress.next_rank_tier.target_points ?? '—'} pts)</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adjust Points &amp; Rank</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="New Rank Tier (optional)"
                        value={promoNewRankTierId}
                        onChange={(e) => setPromoNewRankTierId(e.target.value)}
                        options={[
                          { value: '', label: 'No change...' },
                          ...rankTiers.map(t => ({ value: t.id.toString(), label: t.display_name })),
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Amount</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-on-surface text-sm"
                          placeholder="0"
                          value={promoAmount}
                          onChange={(e) => setPromoAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const target = promoProgress.current_target;
                        if (target) setPromoAmount((-target).toString());
                      }}
                    >
                      Deduct Target (-{promoProgress.current_target ?? 0})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPromoAmount((-promoProgress.current_progress).toString())}
                    >
                      Deduct All (-{promoProgress.current_progress})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPromoAmount((Number(promoAmount || 0) + 50).toString())}
                    >
                      +50
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPromoAmount((Number(promoAmount || 0) + 100).toString())}
                    >
                      +100
                    </Button>
                  </div>

                  <div>
                    <Select
                      label="Reason"
                      value={promoReason}
                      onChange={(e) => setPromoReason(e.target.value)}
                      options={[
                        { value: 'promotion_target', label: 'Promotion — Deduct Target' },
                        { value: 'promotion_total', label: 'Promotion — Deduct All' },
                        { value: 'manual_grant', label: 'Manual Grant' },
                        { value: 'manual_deduction', label: 'Manual Deduction' },
                      ]}
                    />
                  </div>

                  <Input
                    label="Notes"
                    value={promoNotes}
                    onChange={(e) => setPromoNotes(e.target.value)}
                  />

                  <Button
                    className="w-full"
                    disabled={isProcessing || !promoAmount}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        await pointsAdjustmentsApi.adjust(promoUser!.user_uuid, {
                          amount: Number(promoAmount),
                          reason: promoReason,
                          new_rank_tier_id: promoNewRankTierId ? Number(promoNewRankTierId) : null,
                          notes: promoNotes,
                        });
                        setPromoAmount('');
                        setPromoNotes('');
                        setPromoNewRankTierId('');
                        const [progress, adjustments] = await Promise.all([
                          pointsAdjustmentsApi.getProgress(promoUser!.user_uuid),
                          pointsAdjustmentsApi.list(promoUser!.user_uuid),
                        ]);
                        setPromoProgress(progress);
                        setPromoAdjustments(adjustments);
                        const usersData = await usersApi.list();
                        setUsers(usersData);
                      } catch (err) {
                        console.error('Error adjusting points:', err);
                        alert('Failed to adjust points');
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                  >
                    Submit Adjustment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adjustment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {promoAdjustments.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No adjustments yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {promoAdjustments.map((adj) => (
                        <div key={adj.id} className="p-3 bg-surface-container-lowest rounded-lg text-sm">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${adj.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {adj.amount >= 0 ? '+' : ''}{adj.amount} pts
                            </span>
                            <span className="text-xs text-on-surface-variant">{adj.adjustment_date}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">Reason: {adj.reason}</p>
                          {adj.notes && <p className="text-xs text-on-surface-variant mt-0.5">{adj.notes}</p>}
                          {adj.new_rank_tier_id && (
                            <p className="text-xs text-on-surface-variant mt-0.5">
                          Changed to: {rankTiers.find(t => t.id === adj.new_rank_tier_id)?.display_name || `Tier #${adj.new_rank_tier_id}`}
                        </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={lessonSubTab === 'curricula' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLessonSubTab('curricula')}
            >
              📖 Curricula
            </Button>
            <Button
              variant={lessonSubTab === 'lessons' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLessonSubTab('lessons')}
            >
              📝 Lesson Library
            </Button>
            <Button
              variant={lessonSubTab === 'assign' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLessonSubTab('assign')}
            >
              📅 Assign to Dates
            </Button>
            <Button
              variant={lessonSubTab === 'teachers' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setLessonSubTab('teachers')}
            >
              👨‍🏫 Teacher Assignments
            </Button>
          </div>

          {lessonSubTab === 'curricula' && (
            <Card>
              <CardHeader>
                <CardTitle>Curricula</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Select
                    label="Class"
                    value={curriculumForm.class_id}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, class_id: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...classes.map(c => ({ value: c.id.toString(), label: c.class_name }))]}
                  />
                  <Input
                    label="Name"
                    value={curriculumForm.name}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, name: e.target.value })}
                  />
                  <Input
                    label="Description"
                    value={curriculumForm.description}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateCurriculum} disabled={isProcessing}>
                  Create Curriculum
                </Button>
              </CardContent>
            </Card>
          )}

          {lessonSubTab === 'lessons' && (
            <Card>
              <CardHeader>
                <CardTitle>Lesson Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Curriculum"
                    value={lessonForm.curriculum_id}
                    onChange={(e) => setLessonForm({ ...lessonForm, curriculum_id: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...curricula.map(c => ({ value: c.id.toString(), label: c.name || `Class ${c.class_id}` }))]}
                  />
                  <Input
                    label="Title"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  />
                </div>
                <Input
                  label="Description"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                />
                <Input
                  label="Lesson Plan URL"
                  value={lessonForm.lesson_plan_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, lesson_plan_url: e.target.value })}
                />
                <Input
                  label="Video Folder URL"
                  value={lessonForm.video_folder_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_folder_url: e.target.value })}
                />
                <Button onClick={handleCreateLesson} disabled={isProcessing}>
                  Create Lesson
                </Button>
              </CardContent>
            </Card>
          )}

          {lessonSubTab === 'assign' && (
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Lesson to Date</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="Class"
                    value={classInstanceForm.class_id}
                    onChange={(e) => setClassInstanceForm({ ...classInstanceForm, class_id: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...classes.map(c => ({ value: c.id.toString(), label: c.class_name }))]}
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={classInstanceForm.date}
                    onChange={(e) => setClassInstanceForm({ ...classInstanceForm, date: e.target.value })}
                  />
                  <Select
                    label="Lesson (optional)"
                    value={classInstanceForm.lesson_id}
                    onChange={(e) => setClassInstanceForm({ ...classInstanceForm, lesson_id: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...lessons.map(l => ({ value: l.id.toString(), label: l.title }))]}
                  />
                  <Select
                    label="Teacher (optional)"
                    value={classInstanceForm.teacher_uuid}
                    onChange={(e) => setClassInstanceForm({ ...classInstanceForm, teacher_uuid: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...teachers.map(t => ({ value: t.user_uuid, label: `${t.first_name} ${t.last_name}` }))]}
                  />
                  <Button onClick={handleCreateClassInstance} disabled={isProcessing}>
                    💾 Save Assignment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classInstances.slice(0, 20).map((instance) => {
                      const cls = classes.find(c => c.id === instance.class_id);
                      const teacher = teachers.find(t => t.user_uuid === instance.teacher_uuid);
                      return (
                        <div key={instance.id} className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-medium">{cls?.class_name || `Class ${instance.class_id}`}</p>
                          <p className="text-sm text-slate-500">{instance.class_date}</p>
                          {teacher && <p className="text-sm">Teacher: {teacher.first_name} {teacher.last_name}</p>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {lessonSubTab === 'teachers' && (
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Teacher to Class</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="Class"
                    value={teacherAssignmentForm.class_id}
                    onChange={(e) => setTeacherAssignmentForm({ ...teacherAssignmentForm, class_id: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...classes.map(c => ({ value: c.id.toString(), label: c.class_name }))]}
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={teacherAssignmentForm.date}
                    onChange={(e) => setTeacherAssignmentForm({ ...teacherAssignmentForm, date: e.target.value })}
                  />
                  <Select
                    label="Teacher"
                    value={teacherAssignmentForm.teacher_uuid}
                    onChange={(e) => setTeacherAssignmentForm({ ...teacherAssignmentForm, teacher_uuid: e.target.value })}
                    options={[{ value: '', label: 'Select...' }, ...teachers.map(t => ({ value: t.user_uuid, label: `${t.first_name} ${t.last_name} (${t.rank})` }))]}
                  />
                  <Button onClick={handleCreateTeacherAssignment} disabled={isProcessing}>
                    💾 Save Teacher Assignment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Teacher Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold">{classInstances.length}</p>
                      <p className="text-sm text-slate-500">Total</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold">{new Set(classInstances.map(i => i.teacher_uuid).filter(Boolean)).size}</p>
                      <p className="text-sm text-slate-500">Teachers</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold">{new Set(classInstances.map(i => i.class_id)).size}</p>
                      <p className="text-sm text-slate-500">Classes</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {classInstances.slice(0, 15).map((instance) => {
                      const cls = classes.find(c => c.id === instance.class_id);
                      const teacher = teachers.find(t => t.user_uuid === instance.teacher_uuid);
                      return (
                        <div key={instance.id} className="p-2 bg-slate-50 rounded text-sm">
                          <span className="font-medium">{cls?.class_name}</span> - {instance.class_date}
                          {teacher && <span className="text-slate-500"> ({teacher.first_name})</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>News Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder="News title"
                />
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={newsForm.is_published}
                    onChange={(e) => setNewsForm({ ...newsForm, is_published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_published" className="text-sm text-slate-700 dark:text-slate-300">
                    Published
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Content
                </label>
                <textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  placeholder="News content..."
                  rows={4}
                  className="flex w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!newsForm.title || !newsForm.content) {
                      alert('Please fill in title and content');
                      return;
                    }
                    try {
                      if (editingNews) {
                        await newsApi.update(editingNews.id, newsForm);
                      } else {
                        await newsApi.create(newsForm);
                      }
                      setNewsForm({ title: '', content: '', is_published: false });
                      setEditingNews(null);
                      loadNews();
                    } catch (error) {
                      console.error('Error saving news:', error);
                      alert('Failed to save news');
                    }
                  }}
                >
                  {editingNews ? 'Update' : 'Create'} News
                </Button>
                {editingNews && (
                  <Button variant="outline" onClick={() => {
                    setNewsForm({ title: '', content: '', is_published: false });
                    setEditingNews(null);
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {newsItems.map((news) => (
                  <div key={news.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">{news.title}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${news.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {news.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{news.content}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Created: {new Date(news.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNews(news);
                            setNewsForm({ title: news.title, content: news.content, is_published: news.is_published });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={async () => {
                            if (confirm('Delete this news item?')) {
                              try {
                                await newsApi.delete(news.id);
                                loadNews();
                              } catch (error) {
                                console.error('Error deleting news:', error);
                                alert('Failed to delete news');
                              }
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {newsItems.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No news items yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Student</label>
                <select
                  className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3 py-2 w-full max-w-md"
                  onChange={(e) => {
                    const student = users.find(u => u.user_uuid === e.target.value);
                    if (student) loadStudentAnalytics(student);
                  }}
                  defaultValue=""
                >
                  <option value="">Select a student...</option>
                  {users.map((u) => (
                    <option key={u.user_uuid} value={u.user_uuid}>
                      {u.first_name} {u.last_name} ({u.rank})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudentAnalytics && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar
                    src={selectedStudentAnalytics.profile_image_url}
                    firstName={selectedStudentAnalytics.first_name}
                    lastName={selectedStudentAnalytics.last_name}
                    offsetX={selectedStudentAnalytics.image_offset_x}
                    offsetY={selectedStudentAnalytics.image_offset_y}
                    size="sm"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedStudentAnalytics.first_name} {selectedStudentAnalytics.last_name}
                  </span>
                </div>
              )}

              {selectedStudentAnalytics && performanceStats ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Avatar
                      src={selectedStudentAnalytics.profile_image_url}
                      firstName={selectedStudentAnalytics.first_name}
                      lastName={selectedStudentAnalytics.last_name}
                      offsetX={selectedStudentAnalytics.image_offset_x}
                      offsetY={selectedStudentAnalytics.image_offset_y}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStudentAnalytics.first_name} {selectedStudentAnalytics.last_name}</h3>
                      <RankBadge rank={selectedStudentAnalytics.rank} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{performanceStats.stats?.totalPoints || 0}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Points</p>
                    </div>
                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{performanceStats.stats?.totalClasses || 0}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Sessions</p>
                    </div>
                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{performanceStats.stats?.classesThisMonth || 0}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">This Month</p>
                    </div>
                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{performanceStats.stats?.lastClassDaysAgo ?? 'N/A'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Days Since Last</p>
                    </div>
                  </div>

                  {performanceStats.trend && performanceStats.trend.length > 0 && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <h4 className="font-medium mb-4 text-slate-900 dark:text-white">Attendance Trend (Last 90 Days)</h4>
                      <div className="space-y-2">
                        {performanceStats.trend.slice(0, 14).map((day: AttendanceTrend) => (
                          <div key={day.date} className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400 w-24">{day.date}</span>
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                              <div
                                className="bg-blue-500 h-4 rounded-full"
                                style={{ width: `${Math.min((day.points / 10) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm w-16 text-right text-slate-700 dark:text-slate-300">{day.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Select a student to view their analytics...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'feedback' && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Analytics</CardTitle>
          </CardHeader>
          <CardContent>
              <details className="mb-4">
                <summary className="cursor-pointer font-medium mb-2 text-slate-700 dark:text-slate-300">🔽 Filters</summary>
                <div className="flex gap-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex-wrap items-end">
                  <Input
                    type="date"
                    label="Start Date"
                    value={feedbackFilters.startDate}
                    onChange={(e) => setFeedbackFilters({ ...feedbackFilters, startDate: e.target.value })}
                    className="w-auto"
                  />
                  <Input
                    type="date"
                    label="End Date"
                    value={feedbackFilters.endDate}
                    onChange={(e) => setFeedbackFilters({ ...feedbackFilters, endDate: e.target.value })}
                    className="w-auto"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Rating</label>
                    <select
                      className="border dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-md px-3 py-2"
                      value={feedbackFilters.rating}
                      onChange={(e) => setFeedbackFilters({ ...feedbackFilters, rating: e.target.value })}
                    >
                      <option value="all">All</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                  <Button onClick={searchFeedback} disabled={isLoadingFeedback}>
                    {isLoadingFeedback ? 'Searching...' : 'Search Feedback'}
                  </Button>
                </div>
              </details>

            {feedbackStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{feedbackStats.totalFeedback || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{feedbackStats.positivePercent || 0}%</p>
                    <p className="text-sm text-green-600 dark:text-green-400">👍 Positive</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{(100 - (feedbackStats.positivePercent || 0))}%</p>
                    <p className="text-sm text-red-600 dark:text-red-400">👎 Negative</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{feedbackStats.positiveCount || 0}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">👍 Count</p>
                  </div>
                </div>

                {feedbackList.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-slate-900 dark:text-white">Feedback List</h4>
                    <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="text-left p-3">Date</th>
                              <th className="text-left p-3">User</th>
                              <th className="text-left p-3">Rating</th>
                              <th className="text-left p-3">Comment</th>
                              <th className="text-left p-3">Class</th>
                            </tr>
                          </thead>
                          <tbody>
                            {feedbackList.map((item) => (
                              <tr key={item.id} className="border-t dark:border-slate-700">
                                <td className="p-3 text-slate-600 dark:text-slate-400">
                                  {item.class_instance?.class_date || 'N/A'}
                                </td>
                                <td className="p-3 text-slate-900 dark:text-white">
                                  {item.user?.first_name} {item.user?.last_name}
                                </td>
                                <td className="p-3">
                                  <span className={item.rating === 'thumbs_up' ? 'text-green-600' : 'text-red-600'}>
                                    {item.rating === 'thumbs_up' ? '👍 Positive' : '👎 Negative'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                  {item.comment || '-'}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">
                                  {item.class_instance?.class_schedule?.class_name || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Click &ldquo;Search Feedback&rdquo; to load data...</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'database' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{String(dbStats?.size ?? 'N/A')}</p>
                  <p className="text-sm text-slate-500">Size</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{String(dbStats?.total_users ?? 0)}</p>
                  <p className="text-sm text-slate-500">Users</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{String(dbStats?.total_attendance ?? 0)}</p>
                  <p className="text-sm text-slate-500">Attendance</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold">{String(dbStats?.total_classes ?? 0)}</p>
                  <p className="text-sm text-slate-500">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/database/export-seed`, {
                        credentials: 'include',
                      });
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'seed-data.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      alert('Failed to export seed');
                    }
                  }}
                >
                  📦 Create Seed File
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/database/create-backup`, {
                        credentials: 'include',
                      });
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      alert('Failed to create backup');
                    }
                  }}
                >
                  💾 Create Backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restore</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Upload Backup File</label>
                  <input
                    type="file"
                    accept=".json"
                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-100 dark:file:bg-slate-700 dark:file:text-white hover:file:bg-slate-200 dark:hover:file:bg-slate-600"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/database/restore`, {
                          method: 'POST',
                          credentials: 'include',
                          body: formData,
                        });
                        if (res.ok) {
                          alert('Restored successfully');
                          loadAllData();
                        } else {
                          alert('Restore failed');
                        }
                      } catch {
                        alert('Restore failed');
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Reset Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Warning: These actions cannot be undone!</p>
                <div className="flex gap-4">
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm('This will delete all data except roles. Continue?')) return;
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/database/reset`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'empty' }),
                        });
                        if (res.ok) {
                          alert('Database reset');
                          loadAllData();
                          loadDbStats();
                        }
                      } catch {
                        alert('Reset failed');
                      }
                    }}
                  >
                    🗑️ Empty (Keep Roles)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!confirm('This will load seed data. Continue?')) return;
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/database/reset`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'seed' }),
                        });
                        if (res.ok) {
                          alert('Seed data loaded');
                          loadAllData();
                          loadDbStats();
                        }
                      } catch {
                        alert('Seed failed');
                      }
                    }}
                  >
                    🌱 Load from Seed
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
        )}

        {activeTab === 'csv' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CSV Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Import users from a CSV file. Only <strong>first_name</strong>, <strong>last_name</strong>, and <strong>email</strong> are required.
                  Existing users (matched by email) will be updated in place.
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-100 dark:file:bg-slate-700 dark:file:text-white hover:file:bg-slate-200 dark:hover:file:bg-slate-600"
                  />
                  <Button
                    onClick={() => {
                      const template = 'first_name,last_name,email,rank,nicknames,comments,last_graded_date\nJohn,Doe,john@example.com,White,"Sensei John",Beginner student,2024-01-15';
                      const blob = new Blob([template], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'users_template.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    variant="outline"
                  >
                    Download Template
                  </Button>
                </div>
                <Button
                  onClick={async () => {
                    if (!csvFile) {
                      alert('Please select a CSV file');
                      return;
                    }
                    setIsImportingCsv(true);
                    setCsvImportResult(null);
                    try {
                      const result = await usersApi.importCsv(csvFile);
                      setCsvImportResult(result);
                      loadAllData();
                    } catch (error) {
                      console.error('CSV import error:', error);
                      alert('Failed to import CSV');
                    } finally {
                      setIsImportingCsv(false);
                    }
                  }}
                  disabled={!csvFile || isImportingCsv}
                  isLoading={isImportingCsv}
                  className="w-full"
                >
                  Import Users
                </Button>
                {csvImportResult && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Import Results:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Created: {String(csvImportResult.created ?? 0)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Updated: {String(csvImportResult.updated ?? 0)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Skipped: {String(csvImportResult.skipped ?? 0)}</p>
                    {Array.isArray(csvImportResult.errors) && csvImportResult.errors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-2">Errors:</p>
                        <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc pl-5">
                          {csvImportResult.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CSV Export</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Export all current users to a CSV file. This includes user_uuid, names, email, rank, and other details.
                </p>
                <Button
                  onClick={() => usersApi.exportCsv()}
                  variant="outline"
                  className="w-full"
                >
                  Export Users to CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Send Invite</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const email = prompt('Send a test email to:');
                      if (!email) return;
                      try {
                        await inviteApi.testEmail(email);
                        alert(`Test email sent to ${email}!`);
                      } catch (err: unknown) {
                        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send test email.';
                        alert(detail);
                      }
                    }}
                  >
                    Test Email Config
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Send an email invite to a user so they can set their own password and PIN.
                  If the email doesn&apos;t exist yet, a new user will be created.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First name"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Last name"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address..."
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      const found = users.find(
                        (u) => u.email.toLowerCase() === e.target.value.toLowerCase()
                      );
                      if (found) {
                        setInviteFirstName(found.first_name);
                        setInviteLastName(found.last_name);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    disabled={!inviteEmail || !inviteFirstName || !inviteLastName || inviteSending}
                    isLoading={inviteSending}
                      onClick={async () => {
                      setInviteSending(true);
                      setInviteError('');
                      try {
                        const result = await inviteApi.send(inviteEmail, inviteFirstName, inviteLastName);
                        setInviteEmail('');
                        setInviteFirstName('');
                        setInviteLastName('');
                        alert(result.message);
                        loadInvites();
                      } catch (err: unknown) {
                        const detail =
                          (err as { response?: { data?: { detail?: string } } })?.response?.data
                            ?.detail || 'Failed to send invite.';
                        setInviteError(detail);
                      } finally {
                        setInviteSending(false);
                      }
                    }}
                  >
                    Send Invite
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{inviteError}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No invites sent yet.</p>
                ) : (
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {inv.user_name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {inv.user_email} &middot; Sent {inv.sent_count} time
                            {inv.sent_count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Expires: {new Date(inv.expires_at).toLocaleDateString()}
                            {inv.consumed_at
                              ? ` &middot; Accepted: ${new Date(inv.consumed_at).toLocaleDateString()}`
                              : ' &middot; Pending'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!inv.consumed_at && (
                            <Button
                              variant="outline"
                              size="sm"
                                  onClick={async () => {
                                    try {
                                      const result = await inviteApi.resend(inv.user_uuid);
                                      alert(result.message);
                                      loadInvites();
                                    } catch (err: unknown) {
                                      const detail =
                                        (err as { response?: { data?: { detail?: string } } })?.response
                                          ?.data?.detail || 'Failed to resend.';
                                      alert(detail);
                                    }
                                  }}
                            >
                              Resend
                            </Button>
                          )}
                          {!inv.consumed_at && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (!confirm('Revoke this invite?')) return;
                                try {
                                  await inviteApi.revoke(inv.id);
                                  loadInvites();
                                } catch (err: unknown) {
                                  const detail =
                                    (err as { response?: { data?: { detail?: string } } })?.response
                                      ?.data?.detail || 'Failed to revoke.';
                                  alert(detail);
                                }
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Website Themes</h2>
              {themes.some(t => t.is_active) && (
                <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                  Reset to Default
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {themes.map((t) => {
                let configObj: Record<string, unknown> = {};
                try { configObj = JSON.parse(t.config); } catch { /* ignore */ }
                const primary = (configObj['--primary'] as string) || '#2563eb';
                const bg = (configObj['--background'] as string) || '#ffffff';
                const accent = (configObj['--accent'] as string) || '#f1f5f9';
                const darkPrimary = ((configObj.dark as Record<string, string>)?.['--primary']) || primary;

                return (
                  <Card key={t.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {t.name}
                          {t.is_active && (
                            <span className="text-xs font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Active</span>
                          )}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTheme(t);
                              setThemeConfigEditor(t.config);
                            }}
                          >
                            Edit
                          </Button>
                          {!t.is_active && (
                            <Button
                              size="sm"
                              onClick={() => handleApplyTheme(t.id)}
                            >
                              Apply
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTheme(t.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3">
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: primary }} title="Primary" />
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: bg }} title="Background" />
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: accent }} title="Accent" />
                        <div className="w-8 h-8 rounded border border-slate-300" style={{ backgroundColor: darkPrimary }} title="Dark Primary" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created: {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardHeader>
                  <CardTitle>Create Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Theme Name"
                    value={themeForm.name}
                    onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                    placeholder="e.g. My Custom Theme"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Theme Config (JSON)
                    </label>
                    <textarea
                      className="w-full h-40 text-xs font-mono border dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-md p-2"
                      value={themeForm.config}
                      onChange={(e) => setThemeForm({ ...themeForm, config: e.target.value })}
                      placeholder='{"--primary": "#dc2626", ...}'
                    />
                  </div>
                  <Button onClick={handleCreateTheme} className="w-full">
                    Create Theme
                  </Button>
                </CardContent>
              </Card>
            </div>

            {editingTheme && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Theme: {editingTheme.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Theme Name"
                    value={editingTheme.name}
                    onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                      Theme Config (JSON)
                    </label>
                    <textarea
                      className="w-full h-60 text-xs font-mono border dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-md p-2"
                      value={themeConfigEditor}
                      onChange={(e) => setThemeConfigEditor(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateTheme}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingTheme(null); setThemeConfigEditor(''); }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={newUserCanvasRef} className="hidden" />

      {classEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Class</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setClassEditModal(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Class Name"
                value={classEditForm.class_name}
                onChange={(e) => setClassEditForm({ ...classEditForm, class_name: e.target.value })}
              />
              <Select
                label="Day"
                value={classEditForm.day}
                onChange={(e) => setClassEditForm({ ...classEditForm, day: e.target.value })}
                options={DAYS_OF_WEEK.map(d => ({ value: d, label: d }))}
              />
              <Input
                label="Time"
                type="time"
                value={classEditForm.time}
                onChange={(e) => setClassEditForm({ ...classEditForm, time: e.target.value })}
              />
              <Input
                label="Points"
                type="number"
                value={classEditForm.points}
                onChange={(e) => setClassEditForm({ ...classEditForm, points: Number(e.target.value) })}
              />
              <Select
                label="Gym Location"
                value={classEditForm.gym_id}
                onChange={(e) => setClassEditForm({ ...classEditForm, gym_id: e.target.value })}
                options={[{ value: '', label: 'None' }, ...gymLocations.map(g => ({ value: g.id.toString(), label: g.name }))]}
              />
              <Select
                label="Class Type"
                value={classEditForm.class_type_id}
                onChange={(e) => setClassEditForm({ ...classEditForm, class_type_id: e.target.value })}
                options={[{ value: '', label: 'None' }, ...classTypes.map(t => ({ value: t.id.toString(), label: t.name }))]}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await classesApi.update(classEditModal.class_uuid, {
                        class_name: classEditForm.class_name,
                        day: classEditForm.day,
                        time: classEditForm.time,
                        points: classEditForm.points,
                        gym_id: classEditForm.gym_id ? Number(classEditForm.gym_id) : undefined,
                        class_type_id: classEditForm.class_type_id ? Number(classEditForm.class_type_id) : undefined,
                      });
                      setClassEditModal(null);
                      const classesData = await classesApi.list();
                      setClasses(classesData);
                    } catch (err) {
                      console.error('Error updating class:', err);
                      alert('Failed to update class');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setClassEditModal(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </>
  );
}
