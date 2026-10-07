'use client';

import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, RankBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types';

interface ProfileHeaderProps {
  user: User;
  onLogout: () => void;
  statusLabel?: string;
  secondaryContent?: React.ReactNode;
  className?: string;
}

export function ProfileHeader({
  user,
  onLogout,
  statusLabel,
  secondaryContent,
  className = '',
}: ProfileHeaderProps) {
  return (
    <div className={`bg-surface-container-low rounded-xl border border-outline-variant/10 p-4 sm:p-6 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
          <h1 className="font-headline text-lg sm:text-2xl font-black uppercase tracking-tight text-on-surface truncate">
            {user.first_name} {user.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <RankBadge rank={user.rank} degree={user.rank_tier?.degree} />
            {user.nicknames && <Badge variant="outline">{user.nicknames}</Badge>}
          </div>
          {secondaryContent}
        </div>
        <div className="flex flex-shrink-0 flex-col items-center gap-2">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl p-0.5 bg-gradient-to-tr from-primary-container to-transparent">
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
          {statusLabel && (
            <span className="bg-primary-container/20 text-primary px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
              {statusLabel}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onLogout} title="Logout" className="text-error">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
