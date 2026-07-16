'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, RankBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatsCard } from '@/components/ui/StatsCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/hooks/useAuth';
import { useChartColors } from '@/hooks/useChartColors';
import { dashboardApi, feedbackApi, attendanceApi, usersApi, commentsApi } from '@/lib/api';
import { formatDate, getDaysAgo, formatRankDisplay } from '@/lib/utils';
import type { DashboardStats, AttendanceTrend, ClassFeedback, Attendance, User, Comment } from '@/types';
import { CommentFeed } from '@/components/comments/CommentFeed';
import { Bar, Doughnut } from 'react-chartjs-2';
import { LogOut, Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function PortalPage() {
  const { user, logout, login, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { colors, chartBaseOptions, isDark } = useChartColors();
  const [activeTab, setActiveTab] = useState<'analytics' | 'feedback' | 'comments'>('analytics');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<ClassFeedback[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<{ attendance: Attendance; className: string }[]>([]);
  const [feedbackForm, setFeedbackForm] = useState<{ rating: string; comment: string }>({ rating: '', comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  useEffect(() => {
    if (activeTab === 'comments') loadComments();
  }, [activeTab]);

  useEffect(() => {
    if (user) { loadData(); loadTeachers(); }
  }, [user]);

  useEffect(() => { loadData(); loadTeachers(); }, []);

  const handleLogout = () => { if (confirm('Are you sure you want to log out?')) logout(); };

  async function loadTeachers() {
    try {
      const allUsers = await usersApi.list();
      const teacherMap: Record<string, string> = {};
      allUsers.forEach(u => { if (u.user_uuid && u.first_name) teacherMap[u.user_uuid] = `${u.first_name} ${u.last_name || ''}`.trim(); });
      setTeachers(teacherMap);
    } catch (error) { console.error('Error loading teachers:', error); }
  }

  async function loadComments() {
    if (!user) return;
    setIsLoadingComments(true);
    try {
      const data = await commentsApi.getFeed(user.user_uuid, 'student');
      setComments(data);
    } catch (error) { console.error('Error loading comments:', error); }
    finally { setIsLoadingComments(false); }
  }

  async function loadData() {
    if (!user) return;
    try {
      const [statsData, trendData, attendanceData, feedbackData] = await Promise.all([
        dashboardApi.getStats(user.user_uuid),
        dashboardApi.getAttendanceTrend(user.user_uuid, 90),
        attendanceApi.getByUser(user.user_uuid),
        feedbackApi.getByUser(user.user_uuid),
      ]);
      setStats(statsData);
      setAttendanceTrend(trendData);
      setRecentAttendance(attendanceData.slice(0, 20));
      setFeedbackHistory(feedbackData);

      const pending = attendanceData
        .filter(a => {
          const classDate = new Date(a.attendance_date);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - classDate.getTime()) / (1000 * 60 * 60 * 24));
          const hasFeedback = feedbackData.some(f => f.attendance_id === a.id);
          return daysDiff <= 7 && !hasFeedback;
        })
        .map(a => ({ attendance: a, className: a.class_schedule?.class_name || 'Class' }));
      setPendingFeedback(pending);
    } catch (error) { console.error('Error loading data:', error); }
    finally { setIsLoaded(true); }
  };

  const handleSubmitFeedback = async (attendanceId: number) => {
    if (!feedbackForm.rating) return;
    setIsSubmitting(true);
    try {
      await feedbackApi.submit(attendanceId, feedbackForm.rating, feedbackForm.comment);
      setFeedbackForm({ rating: '', comment: '' });
      loadData();
    } catch (error) { console.error('Error submitting feedback:', error); }
    finally { setIsSubmitting(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try { await login(loginForm.email, loginForm.password); }
    catch (error) { setLoginError('Invalid email or password'); }
  };

  if (authLoading) return <div className="p-8 text-center text-on-surface-variant">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GlassPanel className="p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-primary-container flex items-center justify-center rounded-xl shadow-lg shadow-primary-container/20 mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1 className="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">
                Student <span className="text-primary-container">Portal</span>
              </h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-11 pr-4 py-3 text-on-surface placeholder:text-neutral-700 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg pl-11 pr-4 py-3 text-on-surface placeholder:text-neutral-700 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all outline-none"
                    required
                  />
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error/30 rounded-lg text-on-error-container text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-primary-container hover:bg-inverse-primary text-on-primary-container font-headline font-bold uppercase tracking-widest py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-primary-container/20"
              >
                Sign In
              </button>
            </form>
          </GlassPanel>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: attendanceTrend.slice(-14).map(t => t.date),
    datasets: [{
      label: 'Classes',
      data: attendanceTrend.slice(-14).map(t => t.count),
      backgroundColor: colors.primary,
      borderColor: colors.primaryBorder,
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    ...chartBaseOptions,
    plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
    scales: {
      x: { ...chartBaseOptions.scales.x, ticks: { color: colors.textMuted }, grid: { display: false } },
      y: { ...chartBaseOptions.scales.y, beginAtZero: true, ticks: { stepSize: 1, color: colors.textMuted }, grid: { color: colors.grid } },
    },
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl p-0.5 bg-gradient-to-tr from-primary-container to-transparent">
              <Avatar
                src={user.profile_image_url}
                firstName={user.first_name}
                lastName={user.last_name}
                offsetX={user.image_offset_x}
                offsetY={user.image_offset_y}
                size="xl"
                className="w-full h-full rounded-[10px]"
              />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-on-surface-variant text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <RankBadge rank={user.rank} degree={user.rank_tier?.degree} />
                {user.nicknames && <Badge variant="outline">{user.nicknames}</Badge>}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-error">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['analytics', 'feedback', 'comments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-headline font-bold uppercase tracking-widest text-xs transition-all ${
              activeTab === tab
                ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {tab === 'analytics' ? 'My Analytics' : tab === 'feedback' ? 'Submit Feedback' : 'Comments'}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatsCard label="Total Classes" value={stats?.totalClasses || 0} />
            <StatsCard label="Total Points" value={stats?.totalPoints || 0} accent />
            <StatsCard label="This Month" value={stats?.classesThisMonth || 0} />
            <StatsCard
              label="Last Class"
              value={stats && stats.lastClassDaysAgo !== null ? `${stats.lastClassDaysAgo}d ago` : 'N/A'}
            />
          </div>

          {stats?.current_target && stats?.current_rank_tier && (
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6 mb-6">
              <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-4">
                Target Progress: <span className="text-primary-container">{stats.current_rank_tier.display_name}</span>
              </h2>
              <div className="flex items-center justify-center gap-8">
                <div className="relative w-40 h-40">
                  <Doughnut
                    data={{
                      labels: ['Completed', 'Remaining'],
                      datasets: [{
                        data: [stats?.totalPoints || 0, Math.max(0, stats.current_target - (stats?.totalPoints || 0))],
                        backgroundColor: [colors.primaryBorder, isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(203, 213, 225, 0.5)'],
                        borderWidth: 0,
                      }],
                    }}
                    options={{ cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-black font-headline text-on-surface">{stats?.totalPoints || 0}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">/ {stats.current_target} pts</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-headline font-bold text-lg text-on-surface">{stats.current_rank_tier.display_name} Target</p>
                  <p className="text-sm font-bold text-primary-container">
                    {stats.progress_percentage != null ? `${Math.round(stats.progress_percentage)}%` : '0%'} complete
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6 mb-6">
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-4">Attendance Trend (Last 14 Days)</h2>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-4">Recent Attendance History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="text-left py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Date</th>
                    <th className="text-left py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Class</th>
                    <th className="text-left py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((att) => (
                    <tr key={att.id} className="border-b border-outline-variant/10">
                      <td className="py-3 text-sm text-on-surface">{formatDate(att.attendance_date)}</td>
                      <td className="py-3 text-sm text-on-surface">{att.class_schedule?.class_name || 'Class'}</td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${att.status === 'confirmed' ? 'text-green-500' : 'text-amber-400'}`}>
                          {att.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-1">Submit Feedback</h2>
            <p className="text-sm text-on-surface-variant mb-4">Feedback must be submitted within 7 days of attending</p>
            {pendingFeedback.length === 0 ? (
              <p className="text-on-surface-variant text-center py-4">No classes awaiting feedback</p>
            ) : (
              <div className="space-y-4">
                {pendingFeedback.map(({ attendance, className }) => (
                  <div key={attendance.id} className="bg-surface-container-high rounded-lg p-4 border border-outline-variant/10">
                    <p className="font-bold text-on-surface">{className}</p>
                    <p className="text-sm text-on-surface-variant">{formatDate(attendance.attendance_date)}</p>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                          <input type="radio" name={`rating-${attendance.id}`} checked={feedbackForm.rating === 'thumbs_up'} onChange={() => setFeedbackForm({ ...feedbackForm, rating: 'thumbs_up' })} />
                          Thumbs Up
                        </label>
                        <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                          <input type="radio" name={`rating-${attendance.id}`} checked={feedbackForm.rating === 'thumbs_down'} onChange={() => setFeedbackForm({ ...feedbackForm, rating: 'thumbs_down' })} />
                          Thumbs Down
                        </label>
                      </div>
                      <textarea
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary-container"
                        placeholder="Optional comment..."
                        value={feedbackForm.comment}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                        rows={2}
                      />
                      <Button size="sm" onClick={() => handleSubmitFeedback(attendance.id)} disabled={!feedbackForm.rating || isSubmitting}>
                        Submit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-4">Submitted Feedback</h2>
            {feedbackHistory.length === 0 ? (
              <p className="text-on-surface-variant text-center py-4">No feedback submitted yet</p>
            ) : (
              <div className="space-y-3">
                {feedbackHistory.map((fb) => (
                  <div key={fb.id} className="bg-surface-container-high rounded-lg p-3 border border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${fb.rating === 'thumbs_up' ? 'text-green-500' : 'text-error'}`}>
                        {fb.rating === 'thumbs_up' ? 'Positive' : 'Negative'}
                      </span>
                      <span className="text-sm text-on-surface-variant">{formatDate(fb.created_at)}</span>
                    </div>
                    {fb.comment && <p className="mt-2 text-sm text-on-surface">{fb.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
            <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface mb-1">Comments</h2>
            <p className="text-sm text-on-surface-variant mb-4">Feedback and conversations from teachers and admins</p>
            <CommentFeed
              comments={comments}
              currentUser={user}
              isLoading={isLoadingComments}
              onRefresh={loadComments}
              onReplySubmit={async (parentId, content) => {
                if (!user) return;
                await commentsApi.create({ content, parent_comment_id: parentId }, user.user_uuid);
                loadComments();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
