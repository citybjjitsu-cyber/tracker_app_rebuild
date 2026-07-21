'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RankBadge } from '@/components/ui/Badge';
import { usersApi, classesApi, attendanceApi, kioskApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatDate, debounce, DAYS_OF_WEEK } from '@/lib/utils';
import type { User, ClassSchedule, Attendance } from '@/types';
import { 
  Camera, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock,
  UserPlus,
  Plus,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Check,
  LogOut
} from 'lucide-react';

export default function CheckInPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, roles, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(120);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoMethod, setPhotoMethod] = useState<'upload' | 'camera'>('upload');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [showPhotoPositionModal, setShowPhotoPositionModal] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [newMember, setNewMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    nicknames: '',
    rank: 'White',
    comments: '',
  });

  const [pendingCheckIns, setPendingCheckIns] = useState<{ classId: number; checkInDate: string }[]>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const isTablet = roles.some(r => r.name === 'Tablet');
  const isAdmin = roles.some(r => r.name === 'Admin');
  const isStudent = !isTablet && !isAdmin && roles.some(r => r.name === 'Student');
  const isTeacher = roles.some(r => r.name === 'Teacher');

  const today = new Date();
  const todayDayName = DAYS_OF_WEEK[today.getDay()];

  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek);
    return DAYS_OF_WEEK.map((_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (isStudent || isTeacher) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedUser(user);
        setSessionTimeLeft(120);
      }
    }
  }, [authLoading, isAuthenticated, isStudent, isTeacher, user]);

  useEffect(() => {
    classesApi.list().then(setClasses).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const fetchAttendance = async () => {
        try {
          const attendance = await attendanceApi.getByUser(selectedUser.user_uuid);
          setAttendanceRecords(attendance);
        } catch (error) {
          console.error('Error fetching attendance:', error);
        }
      };
      fetchAttendance();
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && sessionTimeLeft > 0) {
      const timer = setInterval(() => {
        setSessionTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedUser, sessionTimeLeft]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        let results = await usersApi.search(query);
        if (!isTablet && !isAdmin && user) {
          const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
          const searchLower = query.toLowerCase();
          results = results.filter(r => 
            r.user_uuid === user.user_uuid ||
            fullName.includes(searchLower) ||
            `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchLower)
          );
        }
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300),
    [isTablet, isAdmin, user]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setSessionTimeLeft(120);
    setShowCompleteConfirm(false);
  };

  const togglePendingCheckIn = (classId: number, dateStr: string) => {
    setPendingCheckIns(prev => {
      const exists = prev.find(p => p.classId === classId && p.checkInDate === dateStr);
      if (exists) {
        return prev.filter(p => !(p.classId === classId && p.checkInDate === dateStr));
      }
      return [...prev, { classId, checkInDate: dateStr }];
    });
  };

  const handleConfirmCheckIn = () => {
    if (pendingCheckIns.length === 0 || !selectedUser) return;
    if (isTeacher || isAdmin) {
      submitBulkCheckIn();
    } else {
      setPinValue('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const submitBulkCheckIn = async () => {
    if (!selectedUser || pendingCheckIns.length === 0) return;
    setIsFormLoading(true);
    setError('');
    try {
      await attendanceApi.bulkCheckIn(
        selectedUser.user_uuid,
        pendingCheckIns.map(p => ({ class_id: p.classId, check_in_date: p.checkInDate }))
      );
      setPendingCheckIns([]);
      const attendance = await attendanceApi.getByUser(selectedUser.user_uuid);
      setAttendanceRecords(attendance);
      setVerifySuccess(true);
      setTimeout(() => setVerifySuccess(false), 3000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const message = err?.response?.data?.detail || err?.message || 'Failed to check in';
      setError(message);
      console.error('Bulk check-in error:', error);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (!pinValue || pinValue.length < 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const result = await kioskApi.verifyUserPin(pinValue);
      if (result.valid) {
        setShowPinModal(false);
        await submitBulkCheckIn();
      } else {
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      if (err?.response?.status === 429) {
        const msg = err?.response?.data?.detail || 'Too many attempts. Please wait.';
        setPinError(msg);
      } else {
        setPinError('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const closePinModal = () => {
    setShowPinModal(false);
    setPinValue('');
    setPinError('');
  };

  const handleCancelCheckIn = async (attendanceId: number) => {
    setIsFormLoading(true);
    try {
      await attendanceApi.cancel(attendanceId);
      const attendance = await attendanceApi.getByUser(selectedUser!.user_uuid);
      setAttendanceRecords(attendance);
    } catch (error) {
      console.error('Cancel error:', error);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleStartOver = () => {
    if (confirm('Start over with a new student?')) {
      stopCamera();
      setSelectedUser(null);
      setSessionTimeLeft(120);
      setAttendanceRecords([]);
      setShowCompleteConfirm(false);
      setShowPhotoUpload(false);
      setPendingCheckIns([]);
      closePinModal();
    }
  };

  const handleComplete = () => {
    setShowCompleteConfirm(true);
  };

  const confirmComplete = () => {
    stopCamera();
    setPendingCheckIns([]);
    closePinModal();
    if (isTeacher) {
      router.push('/teacher');
    } else {
      router.push('/portal');
    }
  };

  const handleCreateMember = async () => {
    if (newMember.password !== newMember.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    setIsFormLoading(true);
    try {
      const user = await usersApi.create({
        first_name: newMember.first_name,
        last_name: newMember.last_name,
        email: newMember.email,
        password: newMember.password,
        nicknames: newMember.nicknames,
        rank: newMember.rank as User['rank'],
        comments: newMember.comments,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      setSelectedUser(user);
      setShowNewMemberForm(false);
      setNewMember({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirm_password: '',
        nicknames: '',
        rank: 'White',
        comments: '',
      });
    } catch (error) {
      console.error('Create member error:', error);
      alert('Failed to create member');
    } finally {
      setIsFormLoading(false);
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
    const preview = URL.createObjectURL(file);
    setPendingPhotoFile(file);
    setPendingPhotoPreview(preview);
    setDragOffset({ x: 0, y: 0 });
    setShowPhotoPositionModal(true);
    stopCamera();
  };

  const handleConfirmPhotoPosition = async () => {
    if (!selectedUser || !pendingPhotoFile) return;
    setIsUploadingPhoto(true);
    try {
      const updatedUser = await usersApi.uploadPhoto(
        selectedUser.user_uuid, 
        pendingPhotoFile, 
        dragOffset.x, 
        dragOffset.y
      );
      setSelectedUser({ 
        ...selectedUser, 
        profile_image_url: updatedUser.profile_image_url,
        image_offset_x: updatedUser.image_offset_x,
        image_offset_y: updatedUser.image_offset_y
      });
      setShowPhotoPositionModal(false);
      setPendingPhotoFile(null);
      setPendingPhotoPreview(null);
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRetakePhoto = () => {
    setShowPhotoPositionModal(false);
    setPendingPhotoFile(null);
    if (pendingPhotoPreview) {
      URL.revokeObjectURL(pendingPhotoPreview);
    }
    setPendingPhotoPreview(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePhotoDrag = (e: React.MouseEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const offsetX = (mouseX - centerX) / centerX;
    const offsetY = (mouseY - centerY) / centerY;
    setDragOffset({
      x: Math.max(-1, Math.min(1, -offsetX)),
      y: Math.max(-1, Math.min(1, -offsetY))
    });
  };

  const handleDeletePhoto = async () => {
    if (!selectedUser) return;
    if (!confirm('Delete profile photo?')) return;
    setIsFormLoading(true);
    try {
      await usersApi.deletePhoto(selectedUser.user_uuid);
      setSelectedUser({ ...selectedUser, profile_image_url: undefined });
    } catch (error) {
      console.error('Delete photo error:', error);
      alert('Failed to delete photo');
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getAttendanceStatus = (classId: number, dateStr: string): { status: string; attendance?: Attendance } => {
    const attendance = attendanceRecords.find(a => a.class_id === classId && a.attendance_date === dateStr);
    if (!attendance) {
      if (pendingCheckIns.some(p => p.classId === classId && p.checkInDate === dateStr)) return { status: 'queued' };
      return { status: 'not_checked_in' };
    }
    return { status: attendance.status, attendance };
  };

  const hasCheckedIn = attendanceRecords.length > 0;

  const formatTimeLeft = () => {
    const minutes = Math.floor(sessionTimeLeft / 60);
    const seconds = sessionTimeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const canSearch = isTablet || isAdmin;

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isTablet && (
            <button
              onClick={() => router.push(isTeacher ? '/teacher' : '/portal')}
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="text-white font-bold font-headline">CKB</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface font-headline">Check-In</h1>
            <p className="text-sm text-on-surface-variant">{isTablet ? 'Tablet Mode' : 'Check-In'}</p>
          </div>
        </div>
      {isTablet && (
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      )}
    </div>

    {error && (
      <div className="flex items-center gap-2 p-4 bg-error-container/20 border border-error/30 rounded-lg text-on-error-container">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        {error}
      </div>
    )}

    {showCompleteConfirm && (
        <div className="rounded-xl border border-primary-container/30 bg-primary-container/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-container-high rounded-full flex items-center justify-center ring-4 ring-primary-container/20">
            <CheckCircle2 className="w-8 h-8 text-primary-container" />
          </div>
          <h2 className="text-xl font-bold text-on-surface font-headline mb-2">
            Complete Check-In Session?
          </h2>
          <p className="text-on-surface-variant mb-6">
            You have checked into {attendanceRecords.length} class{attendanceRecords.length !== 1 ? 'es' : ''} today.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>
              Go Back
            </Button>
            <Button variant="success" onClick={confirmComplete}>
              <Check className="w-4 h-4 mr-2" />
              Complete Session
            </Button>
          </div>
        </div>
      )}

      {!selectedUser ? (
        <div className="space-y-6 animate-in">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-on-surface font-headline mb-1">
                {isStudent ? 'Welcome' : 'Welcome to Check-In'}
              </h1>
              <p className="text-on-surface-variant flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {formatDate(new Date())}
              </p>
            </div>

            {canSearch && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  placeholder="Search your name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 h-12 text-base bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-neutral-700 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user.user_uuid}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl text-left",
                      "glass-panel border border-transparent hover:border-primary-container/30",
                      "transition-all duration-200 group"
                    )}
                  >
                    <Avatar
                      src={user.profile_image_url}
                      firstName={user.first_name}
                      lastName={user.last_name}
                      offsetX={user.image_offset_x}
                      offsetY={user.image_offset_y}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface font-headline">
                        {user.first_name} {user.last_name}
                      </p>
                      {user.nicknames && (
                        <p className="text-sm text-on-surface-variant">{user.nicknames}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <RankBadge rank={user.rank} degree={user.rank_tier?.degree} />
                      <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {canSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="mt-4 text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-surface-container-high rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-on-surface-variant" />
                </div>
                <p className="text-on-surface-variant">No results found</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Try a different name or add yourself as a new member
                </p>
              </div>
            )}
          </div>

          {canSearch && (
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => setShowNewMemberForm(!showNewMemberForm)}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {showNewMemberForm ? 'Cancel' : 'Add New Member'}
            </Button>
          )}

          {showNewMemberForm && (
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 animate-in">
              <h3 className="font-headline font-bold text-lg text-on-surface mb-4">New Member Registration</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={newMember.first_name}
                  onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  value={newMember.last_name}
                  onChange={(e) => setNewMember({ ...newMember, last_name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
                <Input
                  label="Password"
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={newMember.confirm_password}
                  onChange={(e) => setNewMember({ ...newMember, confirm_password: e.target.value })}
                />
                <Input
                  label="Nicknames (optional)"
                  value={newMember.nicknames}
                  onChange={(e) => setNewMember({ ...newMember, nicknames: e.target.value })}
                />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Rank</label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                    value={newMember.rank}
                    onChange={(e) => setNewMember({ ...newMember, rank: e.target.value })}
                  >
                    <option value="White">White</option>
                    <option value="Blue">Blue</option>
                    <option value="Purple">Purple</option>
                    <option value="Brown">Brown</option>
                    <option value="Black">Black</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    label="Comments (optional)"
                    value={newMember.comments}
                    onChange={(e) => setNewMember({ ...newMember, comments: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                className="w-full mt-6" 
                onClick={handleCreateMember} 
                disabled={isFormLoading}
                isLoading={isFormLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Member
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 flex items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-xl p-0.5 bg-gradient-to-tr from-primary-container to-transparent">
                  <Avatar
                    src={selectedUser.profile_image_url}
                    firstName={selectedUser.first_name}
                    lastName={selectedUser.last_name}
                    offsetX={selectedUser.image_offset_x}
                    offsetY={selectedUser.image_offset_y}
                    size="xl"
                    className="w-full h-full rounded-[10px]"
                  />
                </div>
                <button
                  onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-container text-white rounded-full flex items-center justify-center hover:bg-inverse-primary transition-colors shadow-lg"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h2>
                  <span className="bg-primary-container/20 text-primary px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <RankBadge rank={selectedUser.rank} degree={selectedUser.rank_tier?.degree} />
                  {selectedUser.nicknames && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="text-on-surface-variant text-sm font-medium italic">&ldquo;{selectedUser.nicknames}&rdquo;</span>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="border-l border-outline-variant/30 pl-4">
                    <p className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Session Time</p>
                    <p className={cn(
                      "text-xl font-black font-headline",
                      sessionTimeLeft < 30 ? "text-primary" : "text-on-surface"
                    )}>
                      {formatTimeLeft()}
                    </p>
                  </div>
                  <div className="border-l border-outline-variant/30 pl-4">
                    <p className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Classes Checked</p>
                    <p className="text-xl font-black text-on-surface font-headline">{attendanceRecords.length}</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 ml-auto self-center flex flex-col items-end gap-2">
                {pendingCheckIns.length > 0 && (
                  <button
                    onClick={handleConfirmCheckIn}
                    disabled={isFormLoading || isVerifyingPin}
                    className="bg-primary-container text-white px-8 py-4 rounded-lg font-headline font-black text-base uppercase tracking-widest shadow-xl shadow-primary-container/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isFormLoading ? 'Checking in...' : `Confirm with PIN (${pendingCheckIns.length})`}
                  </button>
                )}
                {hasCheckedIn && (
                  <button
                    onClick={handleComplete}
                    className="text-xs text-on-surface-variant hover:text-on-surface underline transition-colors"
                  >
                    Complete Session
                  </button>
                )}
              </div>
            </div>
          </div>

          {showPhotoUpload && (
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-4">
              <div className="flex gap-2 mb-3">
                <Button
                  variant={photoMethod === 'upload' ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => { setPhotoMethod('upload'); stopCamera(); }}
                >
                  <Upload className="w-4 h-4 mr-1" /> Upload
                </Button>
                <Button
                  variant={photoMethod === 'camera' ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => { setPhotoMethod('camera'); startCamera(); }}
                >
                  <Camera className="w-4 h-4 mr-1" /> Camera
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
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm mx-auto rounded-lg" />
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={capturePhoto} disabled={isUploadingPhoto}>
                      Capture
                    </Button>
                    <Button variant="outline" size="sm" onClick={stopCamera}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : cameraError ? (
                <div className="text-center py-2">
                  <p className="text-sm text-on-error-container mb-2">{cameraError}</p>
                  <Button variant="outline" size="sm" onClick={startCamera}>
                    Try Again
                  </Button>
                </div>
              ) : isCameraInitializing ? (
                <div className="text-center py-2">
                  <p className="text-sm text-on-surface-variant">Initializing camera...</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Button variant="outline" size="sm" onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              )}

              <div className="flex gap-2 mt-3 justify-center">
                {photoMethod === 'upload' && (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
                    Choose Photo
                  </Button>
                )}
                {selectedUser.profile_image_url && (
                  <Button variant="ghost" size="sm" onClick={handleDeletePhoto} className="text-error hover:text-on-error-container">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
            <div className="flex justify-between items-end border-b border-outline-variant/20 pb-4 mb-6">
              <div>
                <h2 className="font-headline text-lg font-black uppercase tracking-tight text-on-surface">Weekly Registration</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary-container font-black uppercase tracking-[0.2em]">{attendanceRecords.length} CLASSES CHECKED</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day, dayIndex) => {
                  const dayDateStr = weekDates[dayIndex];
                  const dayClasses = classes.filter(c => c.day?.toLowerCase() === day.toLowerCase()).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                  const isTodayDay = day === todayDayName;
                  
                   return (
                      <div key={day} className="space-y-3">
                        <div className={cn(
                          "text-center py-2 rounded-t-lg",
                          isTodayDay ? "bg-neutral-950 border border-primary-container/30" : "bg-surface-container"
                        )}>
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isTodayDay ? "text-primary" : "text-on-surface-variant"
                          )}>{day.slice(0, 3)}</p>
                        </div>
                        <div className="space-y-3">
                          {dayClasses.length > 0 ? (
                            dayClasses.map((cls) => {
                              const { status, attendance } = getAttendanceStatus(cls.id, dayDateStr);
                              
                              return (
                                <div
                                  key={cls.id}
                                  className={cn(
                                    "p-3 rounded-lg border-l-[3px] transition-all duration-200",
                                    status === 'confirmed'
                                      ? "bg-surface-container-low border-green-500"
                                      : status === 'pending'
                                      ? "bg-surface-container-low border-amber-500"
                                      : "bg-surface-container-low border-primary-container hover:bg-surface-container-high cursor-pointer"
                                  )}
                                >
                                  <p className="text-[10px] font-bold text-primary-container uppercase mb-1">{cls.time}</p>
                                  <p className="text-xs font-bold text-on-surface leading-tight">{cls.class_name}</p>
                                  <div className="mt-2 flex justify-between items-center">
                                    {status === 'not_checked_in' && (
                                      <Button
                                        size="sm"
                                        className="w-full text-[10px] font-black uppercase tracking-tight"
                                        onClick={() => togglePendingCheckIn(cls.id, dayDateStr)}
                                        disabled={isFormLoading}
                                      >
                                        Check In
                                      </Button>
                                    )}
                                    {status === 'queued' && (
                                      <Button
                                        size="sm"
                                        variant="success"
                                        className="w-full text-[10px] font-black uppercase tracking-tight"
                                        onClick={() => togglePendingCheckIn(cls.id, dayDateStr)}
                                      >
                                        Selected ✓
                                      </Button>
                                    )}
                                    {status === 'pending' && (
                                      <>
                                        <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-[10px] text-error font-bold"
                                          onClick={() => handleCancelCheckIn(attendance!.id)}
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    )}
                                    {status === 'confirmed' && (
                                      <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="border-2 border-dashed border-outline-variant/20 h-24 rounded-lg flex items-center justify-center">
                              <p className="text-[10px] font-bold text-neutral-700 uppercase text-center leading-tight">
                                {day === 'Sunday' ? 'Gym Closed' : 'No Classes'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                   );
                 })}
               </div>
             {(hasCheckedIn || pendingCheckIns.length > 0) && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-outline-variant/20">
                  {pendingCheckIns.length > 0 && (
                    <Button className="flex-1" onClick={handleConfirmCheckIn} disabled={isFormLoading || isVerifyingPin} isLoading={isFormLoading}>
                      {isFormLoading ? 'Checking in...' : `Confirm with PIN (${pendingCheckIns.length})`}
                    </Button>
                  )}
                  {hasCheckedIn && (
                    <Button className="flex-1" onClick={handleComplete}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Session
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleStartOver}>
                    Start Over
                  </Button>
                </div>
              )}
           </div>
         </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 max-w-sm w-full border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface font-headline mb-4 text-center">
              Confirm with PIN
            </h3>
            {selectedUser && (
              <div className="flex flex-col items-center mb-4">
                <Avatar
                  src={selectedUser.profile_image_url}
                  firstName={selectedUser.first_name}
                  lastName={selectedUser.last_name}
                  offsetX={selectedUser.image_offset_x}
                  offsetY={selectedUser.image_offset_y}
                  size="lg"
                />
                <p className="mt-2 font-semibold text-on-surface font-headline">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            )}
            {pendingCheckIns.length > 0 && (
              <div className="mb-4 p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant mb-2 font-bold uppercase tracking-wider">
                  Selected Classes ({pendingCheckIns.length})
                </p>
                <ul className="text-sm text-on-surface space-y-1">
                  {pendingCheckIns.map(item => {
                    const cls = classes.find(c => c.id === item.classId);
                    return cls ? (
                      <li key={`${item.classId}-${item.checkInDate}`} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container flex-shrink-0" />
                        {cls.class_name} <span className="text-on-surface-variant">{cls.time}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
            <div className="mb-4">
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-xl font-bold text-on-surface"
                  >
                    {pinValue[i - 1] ? '•' : ''}
                  </div>
                ))}
              </div>
              {pinError && (
                <p className="text-center text-sm text-error">{pinError}</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-4 max-w-[200px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => setPinValue(prev => prev.length < 4 ? prev + n : prev)}
                    className="h-12 rounded-lg bg-surface-container-high hover:bg-surface-container-highest active:scale-95 transition-all text-lg font-bold text-on-surface"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPinValue(prev => prev.slice(0, -1))}
                  className="h-12 rounded-lg bg-surface-container-high hover:bg-surface-container-highest active:scale-95 transition-all text-sm text-on-surface-variant font-bold"
                >
                  ⌫
                </button>
                <button
                  onClick={() => setPinValue(prev => prev.length < 4 ? prev + 0 : prev)}
                  className="h-12 rounded-lg bg-surface-container-high hover:bg-surface-container-highest active:scale-95 transition-all text-lg font-bold text-on-surface"
                >
                  0
                </button>
                <button
                  onClick={closePinModal}
                  className="h-12 rounded-lg bg-surface-container-high hover:bg-surface-container-highest active:scale-95 transition-all text-sm text-error font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closePinModal} disabled={isVerifyingPin}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handlePinSubmit} disabled={pinValue.length < 4 || isVerifyingPin} isLoading={isVerifyingPin}>
                {isVerifyingPin ? 'Verifying...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {verifySuccess && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl font-semibold animate-in z-50">
          ✓ Check-in successful
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {showPhotoPositionModal && pendingPhotoPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface font-headline mb-4">
              Adjust Photo Position
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Drag the photo to position it within the circle
            </p>
            <div 
              className="relative w-48 h-48 mx-auto rounded-full overflow-hidden cursor-move bg-surface-container-lowest border-4 border-outline-variant/30"
              onMouseDown={(e) => {
                const container = e.currentTarget as HTMLDivElement;
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const rect = container.getBoundingClientRect();
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const mouseX = moveEvent.clientX - rect.left;
                  const mouseY = moveEvent.clientY - rect.top;
                  const offsetX = (mouseX - centerX) / centerX;
                  const offsetY = (mouseY - centerY) / centerY;
                  setDragOffset({
                    x: Math.max(-1, Math.min(1, -offsetX)),
                    y: Math.max(-1, Math.min(1, -offsetY))
                  });
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <img
                src={pendingPhotoPreview}
                alt="Position preview"
                className="absolute w-[200%] h-[200%] max-w-none"
                style={{
                  objectPosition: `${50 - dragOffset.x * 50}% ${50 - dragOffset.y * 50}%`,
                  left: '0',
                  top: '0',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                draggable={false}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={handleRetakePhoto}>
                Retake
              </Button>
              <Button className="flex-1" onClick={handleConfirmPhotoPosition} disabled={isUploadingPhoto}>
                {isUploadingPhoto ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
