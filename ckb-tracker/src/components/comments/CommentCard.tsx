import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Comment, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface CommentCardProps {
  comment: Comment;
  currentUser: User | null;
  onReply: (parentId: number) => void;
  isReplying: boolean;
  canReply: boolean;
}

export function CommentCard({ comment, currentUser, onReply, isReplying, canReply }: CommentCardProps) {
  const authorName = comment.author
    ? `${comment.author.first_name} ${comment.author.last_name}`
    : 'Unknown';

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <div className="flex items-start gap-3">
        <Avatar
          src={comment.author?.profile_image_url}
          firstName={comment.author?.first_name}
          lastName={comment.author?.last_name}
          offsetX={comment.author?.image_offset_x}
          offsetY={comment.author?.image_offset_y}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-slate-900 dark:text-white">{authorName}</span>
            {comment.target_user && (
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                → {comment.target_user.first_name} {comment.target_user.last_name}
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDistanceToNow(new Date(comment.created_at))} ago
            </span>
          </div>
          {comment.rating && (
            <span className={`text-sm ${comment.rating === 'thumbs_up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {comment.rating === 'thumbs_up' ? '👍' : '👎'}
            </span>
          )}
          <p className="mt-2 break-words text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
          <div className="mt-2 flex items-center gap-4">
            {canReply && !isReplying && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
              >
                Reply
              </Button>
            )}
            {comment.reply_count > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
