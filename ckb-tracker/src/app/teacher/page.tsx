'use client';

import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { classesApi, attendanceApi, feedbackApi, usersApi, commentsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { LogOut, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeeklyScheduleClass, Attendance, User, ClassFeedback, Comment } from '@/types';
import { CommentFeed } from '@/components/comments/CommentFeed';
import { CommentCreateForm } from '@/components/comments/CommentCreateForm';
import { RetryState } from '@/components/ui/RetryState';
import { WEEK_DAYS, getWeekDates, toDateString } from '@/lib/teacherSchedule';

export default function TeacherPage() {
  const { user, isTeacher, isAdmin, isLoading, logout, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'feedback' | 'comments'>('attendance');
  const [classes, setClasses] = useState<WeeklyScheduleClass[]>([]);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<ClassFeedback[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [classesFilter, setClassesFilter] = useState<number[]>([]);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showCreateComment, setShowCreateComment] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [manualStudentUuid, setManualStudentUuid] = useState('');

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (isTeacher || isAdmin) {
      loadInitialData();
    }
  }, [isTeacher, isAdmin]);

  useEffect(() => {
    if (weekOffset !== 0 && (isTeacher || isAdmin)) {
      loadSchedule(weekOffset);
    }
    // loadSchedule is a local loader whose inputs are represented by this effect's dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, isTeacher, isAdmin]);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadAttendance();
    }
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    if (autoRefresh && selectedClass && selectedDate) {
      const interval = setInterval(loadAttendance, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedClass, selectedDate]);

  async function loadInitialData() {
    setIsScheduleLoading(true);
    setScheduleError('');
    try {
      const [scheduleResult, usersResult] = await Promise.allSettled([
        classesApi.weekly(toDateString(getWeekDates(0)[0])),
        usersApi.list(),
      ]);

      if (scheduleResult.status === 'rejected') {
        setClasses([]);
        setScheduleError('Unable to load the class schedule. Please refresh and try again.');
        console.error('Error loading schedule:', scheduleResult.reason);
        return;
      }

      const classesData = scheduleResult.value.days.flatMap(day => day.classes);
      setClasses(classesData);
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value);
      } else {
        setUsers([]);
        console.error('Error loading users:', usersResult.reason);
      }

      if (classesData.length > 0) {
        const todayDate = toDateString(new Date());
        const todayClasses = classesData.filter(c => c.scheduled_date === todayDate);
        if (todayClasses.length > 0) {
          setSelectedClass(todayClasses[0].id);
        } else {
          const firstClass = classesData[0];
          setSelectedClass(firstClass.id);
          setSelectedDate(firstClass.scheduled_date);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsScheduleLoading(false);
      setIsLoaded(true);
    }
  }

  async function loadSchedule(offset: number, targetDate = selectedDate) {
    setIsScheduleLoading(true);
    setScheduleError('');
    try {
      const schedule = await classesApi.weekly(toDateString(getWeekDates(offset)[0]));
      const classesData = schedule.days.flatMap(day => day.classes);
      setClasses(classesData);
      const selectedDayClasses = classesData.filter(c => c.scheduled_date === targetDate);
      setSelectedClass(selectedDayClasses[0]?.id || classesData[0]?.id || '');
    } catch (error) {
      setClasses([]);
      setSelectedClass('');
      setScheduleError('Unable to load the class schedule. Please refresh and try again.');
      console.error('Error loading schedule:', error);
    } finally {
      setIsScheduleLoading(false);
    }
  }

  const loadFeedback = async () => {
    if (!user) return;
    try {
      const data = await feedbackApi.getByTeacher(user.user_uuid);
      setFeedback(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  async function loadComments() {
    if (!user) return;
    setIsLoadingComments(true);
    try {
      const data = await commentsApi.getFeed(user.user_uuid, 'teacher');
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'comments') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadComments();
    }
  }, [activeTab]);

  async function loadAttendance() {
    if (!selectedClass) return;
    try {
      const data = await attendanceApi.getByClass(selectedClass, selectedDate);
      setAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }

  const handleConfirm = async (id: number) => {
    setIsProcessing(true);
    try {
      await attendanceApi.confirm(id);
      loadAttendance();
    } catch (error) {
      console.error('Error confirming:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (id: number) => {
    setIsProcessing(true);
    try {
      await attendanceApi.cancel(id);
      loadAttendance();
    } catch (error) {
      console.error('Error removing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedStudents.length === 0) return;
    setIsProcessing(true);
    try {
      await attendanceApi.bulkConfirm(selectedStudents);
      setSelectedStudents([]);
      loadAttendance();
    } catch (error) {
      console.error('Error bulk confirming:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedStudents.length === 0) return;
    if (!confirm(`Remove ${selectedStudents.length} student(s) from attendance?`)) return;
    setIsProcessing(true);
    try {
      for (const id of selectedStudents) {
        await attendanceApi.cancel(id);
      }
      setSelectedStudents([]);
      loadAttendance();
    } catch (error) {
      console.error('Error bulk removing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAllPending = async () => {
    const pending = attendance.filter(a => a.status === 'pending').map(a => a.id);
    if (pending.length === 0) return;
    setSelectedStudents(pending);
    setIsProcessing(true);
    try {
      await attendanceApi.bulkConfirm(pending);
      loadAttendance();
    } catch (error) {
      console.error('Error confirming all:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleAddStudent = async (studentUuid: string) => {
    if (!selectedClass) return;
    setIsProcessing(true);
    try {
      await attendanceApi.direct(studentUuid, selectedClass, undefined, user?.user_uuid, selectedDate);
      setManualStudentUuid('');
      loadAttendance();
    } catch (error) {
      console.error('Error adding student:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedStudents([]);
    const dayClasses = classes.filter(c => c.scheduled_date === dateStr);
    if (dayClasses.length > 0) {
      setSelectedClass(dayClasses[0].id);
    } else {
      setSelectedClass('');
    }
  };

  const selectClass = (dateStr: string, classId: number) => {
    setSelectedStudents([]);
    setSelectedDate(dateStr);
    setSelectedClass(classId);
  };

  const changeWeek = (delta: number) => {
    const nextWeekOffset = weekOffset + delta;
    const currentWeekDates = getWeekDates(weekOffset);
    const selectedDayIndex = currentWeekDates.findIndex(
      date => toDateString(date) === selectedDate
    );
    const nextWeekDates = getWeekDates(nextWeekOffset);
    const nextSelectedDayIndex = selectedDayIndex === -1 ? 0 : selectedDayIndex;
    setWeekOffset(nextWeekOffset);
    setSelectedDate(toDateString(nextWeekDates[nextSelectedDayIndex]));
    setSelectedClass('');
    setSelectedStudents([]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginForm.email, loginForm.password, true);
    } catch {
      setLoginError('Invalid credentials or not a teacher');
    }
  };

  const pendingCount = attendance.filter(a => a.status === 'pending').length;
  const confirmedCount = attendance.filter(a => a.status === 'confirmed').length;

  if (isLoading) {
    return <div className="p-8 text-center text-on-surface-variant">Loading...</div>;
  }

  if (!user || (!isTeacher && !isAdmin)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-container flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-on-primary-container" />
            </div>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Teacher <span className="text-primary-container">Login</span></h1>
            <p className="text-on-surface-variant text-sm mt-1">Sign in with teacher credentials</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-label text-on-surface-variant mb-1">Email</label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-label text-on-surface-variant mb-1">Password</label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>
            {loginError && <p className="text-error text-sm">{loginError}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </div>
      </div>
    );
  }

  const selectedDayClasses = classes.filter(c => c.scheduled_date === selectedDate);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">Teacher Dashboard</h1>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs sm:text-sm text-on-surface-variant truncate max-w-[60vw]">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()} className="flex-shrink-0">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="flex gap-6 mb-6 border-b border-outline-variant/20 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {(['attendance', 'feedback', 'comments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'feedback') loadFeedback(); if (tab === 'comments') loadComments(); }}
              className={`flex-shrink-0 text-xs font-bold font-label tracking-wider uppercase pb-3 transition-colors ${
                activeTab === tab
                  ? 'text-primary-container border-b-2 border-primary-container'
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              {tab === 'attendance' ? 'Attendance' : tab === 'feedback' ? 'Feedback' : 'Comments'}
            </button>
          ))}
        </div>

        {activeTab === 'attendance' && (
          <div className="glass-panel rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-headline font-bold text-on-surface">Class Schedule</h2>
              <div className="flex gap-4 items-center justify-between sm:justify-end">
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="accent-primary-container"
                  />
                  Auto-refresh (5s)
                </label>
                <Button variant="outline" size="sm" onClick={loadAttendance}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeWeek(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium text-on-surface text-center">
                {formatDate(weekDates[0])} &mdash; {formatDate(weekDates[6])}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const todayDate = toDateString(today);
                    setWeekOffset(0);
                    setSelectedDate(todayDate);
                    loadSchedule(0, todayDate);
                    setSelectedStudents([]);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeWeek(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isScheduleLoading && (
              <div className="mb-6 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 text-center text-sm text-on-surface-variant">
                Loading class schedule...
              </div>
            )}
            {scheduleError && (
              <RetryState
                message={scheduleError}
                onRetry={() => loadSchedule(weekOffset)}
                isRetrying={isScheduleLoading}
                className="mb-6"
              />
            )}

            <div className="mb-6 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2" role="tablist" aria-label="Select class day">
                {WEEK_DAYS.map((day, i) => {
                  const dateStr = toDateString(weekDates[i]);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === toDateString(new Date());
                  return (
                    <button
                      key={day}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => selectDay(dateStr)}
                      className={cn(
                        "min-w-[4.75rem] rounded-lg border px-3 py-2 text-center transition-colors",
                        isSelected
                          ? "border-primary-container bg-primary-container text-on-primary-container"
                          : "border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary-container/50",
                      )}
                    >
                      <span className="block text-[10px] font-black uppercase tracking-widest">{day.slice(0, 3)}</span>
                      <span className="mt-1 block text-xs">{weekDates[i].getDate()}</span>
                      {isToday && <span className="mt-1 block text-[9px] font-bold uppercase">Today</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-headline text-sm font-black uppercase tracking-widest text-on-surface">
                  {formatDate(selectedDate)}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {selectedDayClasses.length} {selectedDayClasses.length === 1 ? 'class' : 'classes'} scheduled
                </p>
              </div>
            </div>

            {selectedDayClasses.length > 0 ? (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedDayClasses.map((cls) => {
                  const isSelectedClass = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => selectClass(selectedDate, cls.id)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        isSelectedClass
                          ? "border-primary-container bg-primary-container/10 ring-1 ring-primary-container"
                          : "border-outline-variant/20 bg-surface-container-low hover:border-primary-container/50"
                      )}
                    >
                      <span className={cn(
                        "block text-xs font-bold uppercase tracking-wider",
                        isSelectedClass ? "text-primary-container" : "text-on-surface-variant"
                      )}>
                        {cls.time || 'No Time'}
                      </span>
                      <span className="mt-1 block font-headline font-bold text-sm break-words text-on-surface">
                        {cls.class_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mb-6 rounded-lg border border-dashed border-outline-variant/20 py-8 text-center text-sm text-on-surface-variant">
                No classes scheduled for this day.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 glass-panel rounded-lg">
                <p className="text-2xl font-bold font-headline text-on-surface">{attendance.length}</p>
                <p className="text-on-surface-variant text-sm">Total Students</p>
              </div>
              <div className="text-center p-4 glass-panel rounded-lg">
                <p className="text-2xl font-bold font-headline text-yellow-400">{pendingCount}</p>
                <p className="text-yellow-400 text-sm">Pending</p>
              </div>
              <div className="text-center p-4 glass-panel rounded-lg">
                <p className="text-2xl font-bold font-headline text-green-400">{confirmedCount}</p>
                <p className="text-green-400 text-sm">Confirmed</p>
              </div>
            </div>

            {selectedClass ? (
              <>
                <div className="space-y-2 mb-4">
                  {attendance.map((att) => (
                    <div
                      key={att.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-surface-container-low rounded-lg border-l-[3px] data-strip"
                    >
                      <div className="flex items-center gap-3">
                        {att.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(att.id)}
                            onChange={() => toggleStudent(att.id)}
                            className="accent-primary-container"
                          />
                        )}
                        <Avatar
                          src={att.user?.profile_image_url}
                          firstName={att.user?.first_name}
                          lastName={att.user?.last_name}
                          offsetX={att.user?.image_offset_x}
                          offsetY={att.user?.image_offset_y}
                          size="lg"
                        />
                        <div>
                          <p className="font-medium text-on-surface">
                            {att.user?.first_name} {att.user?.last_name}
                          </p>
                          <p className="text-sm text-on-surface-variant">
                            Checked in: {new Date(att.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={att.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'}>
                          {att.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                        {att.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleConfirm(att.id)} disabled={isProcessing}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRemove(att.id)} disabled={isProcessing}>
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedStudents.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <Button onClick={handleBulkConfirm} disabled={isProcessing}>
                      Confirm Selected ({selectedStudents.length})
                    </Button>
                    <Button variant="outline" onClick={handleBulkRemove} disabled={isProcessing}>
                      Remove Selected ({selectedStudents.length})
                    </Button>
                  </div>
                )}

                {pendingCount > 0 && (
                  <Button onClick={handleConfirmAllPending} disabled={isProcessing} className="w-full">
                    CONFIRM ALL PENDING ({pendingCount})
                  </Button>
                )}

                <div className="mt-4 border-t border-outline-variant/20 pt-4">
                  <details>
                    <summary className="cursor-pointer font-label text-on-surface-variant hover:text-on-surface transition-colors">+ Add Student Manually</summary>
                    <div className="mt-2 p-3 bg-surface-container-low rounded-lg flex gap-2">
                      <select
                        className="flex-1 border border-outline-variant/20 bg-surface text-on-surface rounded-md p-2"
                        value={manualStudentUuid}
                        onChange={(e) => setManualStudentUuid(e.target.value)}
                      >
                        <option value="">Select a student...</option>
                        {users.map((u) => (
                          <option key={u.user_uuid} value={u.user_uuid}>
                            {u.first_name} {u.last_name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleAddStudent(manualStudentUuid)}
                        disabled={!manualStudentUuid || isProcessing}
                      >
                        Add
                      </Button>
                    </div>
                  </details>
                </div>
              </>
            ) : (
              <p className="text-center text-on-surface-variant py-8">Select a class from the schedule above to view attendance.</p>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Feedback</h2>
            <details className="mb-4">
              <summary className="cursor-pointer font-label text-on-surface-variant hover:text-on-surface transition-colors mb-2">Filters</summary>
              <div className="flex gap-4 p-3 bg-surface-container-low rounded-lg flex-wrap">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">End Date</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Rating</label>
                  <select
                    className="border border-outline-variant/20 bg-surface text-on-surface rounded-md px-3 py-2"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                  >
                    <option value="all">All Ratings</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Classes</label>
                  <select
                    className="border border-outline-variant/20 bg-surface text-on-surface rounded-md px-3 py-2 min-w-[150px]"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'all') {
                        setClassesFilter([]);
                      } else {
                        setClassesFilter([Number(val)]);
                      }
                    }}
                    value={classesFilter.length === 0 ? 'all' : classesFilter[0]}
                  >
                    <option value="all">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 glass-panel rounded-lg">
                <p className="text-xl font-bold font-headline text-on-surface">{feedback.length}</p>
                <p className="text-sm text-on-surface-variant">Total Feedback</p>
              </div>
              <div className="text-center p-3 glass-panel rounded-lg">
                <p className="text-xl font-bold font-headline text-green-400">
                  {feedback.filter(f => f.rating === 'thumbs_up').length}
                </p>
                <p className="text-sm text-green-400">Positive</p>
              </div>
              <div className="text-center p-3 glass-panel rounded-lg">
                <p className="text-xl font-bold font-headline text-red-400">
                  {feedback.filter(f => f.rating === 'thumbs_down').length}
                </p>
                <p className="text-sm text-red-400">Negative</p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="text-left p-3 text-on-surface-variant font-label text-xs tracking-wider uppercase">Date</th>
                    <th className="text-left p-3 text-on-surface-variant font-label text-xs tracking-wider uppercase">Class</th>
                    <th className="text-left p-3 text-on-surface-variant font-label text-xs tracking-wider uppercase">Lesson</th>
                    <th className="text-left p-3 text-on-surface-variant font-label text-xs tracking-wider uppercase">Rating</th>
                    <th className="text-left p-3 text-on-surface-variant font-label text-xs tracking-wider uppercase">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback
                    .filter(f => {
                      if (ratingFilter === 'positive' && f.rating !== 'thumbs_up') return false;
                      if (ratingFilter === 'negative' && f.rating !== 'thumbs_down') return false;
                      if (dateRange.start && f.created_at < dateRange.start) return false;
                      if (dateRange.end && f.created_at > dateRange.end + 'T23:59:59') return false;
                      if (classesFilter.length > 0 && !classesFilter.includes(f.class_instance_id || 0)) return false;
                      return true;
                    })
                    .map((fb) => (
                      <tr key={fb.id} className="bg-surface-container-low">
                        <td className="p-3 text-sm text-on-surface-variant">{formatDate(fb.created_at)}</td>
                        <td className="p-3 text-sm text-on-surface-variant">Class #{fb.class_instance_id || '-'}</td>
                        <td className="p-3 text-sm text-on-surface-variant">-</td>
                        <td className="p-3">
                          <span className={fb.rating === 'thumbs_up' ? 'text-green-400' : 'text-red-400'}>
                            {fb.rating === 'thumbs_up' ? 'Positive' : 'Negative'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-on-surface-variant">{fb.comment || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-headline font-bold text-on-surface">Comments</h2>
              <Button
                variant={showCreateComment ? 'primary' : 'outline'}
                onClick={() => setShowCreateComment(!showCreateComment)}
              >
                {showCreateComment ? 'Cancel' : '+ New Comment'}
              </Button>
            </div>

            {showCreateComment && user && (
              <div className="glass-panel rounded-xl p-6 mb-4">
                <CommentCreateForm
                  users={users}
                  currentUser={user}
                  onSubmit={async (targetUserUuid, content, rating) => {
                    if (!user) return;
                    await commentsApi.create(
                      { content, target_user_uuid: targetUserUuid, rating: rating || undefined },
                      user.user_uuid
                    );
                    setShowCreateComment(false);
                    loadComments();
                  }}
                />
              </div>
            )}

            <div className="glass-panel rounded-xl p-6">
              <CommentFeed
                comments={comments}
                currentUser={user}
                isLoading={isLoadingComments}
                onRefresh={loadComments}
                onReplySubmit={async (parentId, content) => {
                  if (!user) return;
                  await commentsApi.create(
                    { content, parent_comment_id: parentId },
                    user.user_uuid
                  );
                  loadComments();
                }}
              />
            </div>
          </>
        )}

      </div>
    </>
  );
}
