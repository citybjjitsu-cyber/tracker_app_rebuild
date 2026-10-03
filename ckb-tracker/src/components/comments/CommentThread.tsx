import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Comment, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface CommentThreadProps {
  replies: Comment[];
  currentUser: User | null;
  onReply: (parentId: number) => void;
  isReplyingTo: number | null;
  depth?: number;
  maxDepth?: number;
}

export function CommentThread({ replies, currentUser, onReply, isReplyingTo, depth = 0, maxDepth = 4 }: CommentThreadProps) {
  if (replies.length === 0) return null;
  if (depth >= maxDepth) {
    return (
      <div className="ml-6 mt-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {replies.length} more {replies.length === 1 ? 'reply' : 'replies'}
        </span>
      </div>
    );
  }

  return (
    <div className={`ml-6 mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700`}>
      {replies.map((reply) => (
        <div key={reply.id} className="mb-3 last:mb-0">
          <div className="flex items-start gap-2">
            <Avatar
              src={reply.author?.profile_image_url}
              firstName={reply.author?.first_name}
              lastName={reply.author?.last_name}
              offsetX={reply.author?.image_offset_x}
              offsetY={reply.author?.image_offset_y}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-sm text-slate-900 dark:text-white">
                  {reply.author
                    ? `${reply.author.first_name} ${reply.author.last_name}`
                    : 'Unknown'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDistanceToNow(new Date(reply.created_at))} ago
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{reply.content}</p>
              <div className="mt-1">
                {depth < maxDepth - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-0 text-xs"
                    onClick={() => onReply(reply.id)}
                  >
                    Reply
                  </Button>
                )}
              </div>
              {reply.replies && reply.replies.length > 0 && (
                <CommentThread
                  replies={reply.replies}
                  currentUser={currentUser}
                  onReply={onReply}
                  isReplyingTo={isReplyingTo}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
