import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types';

interface CommentCreateFormProps {
  users: User[];
  currentUser: User;
  onSubmit: (targetUserUuid: string, content: string, rating: string | null) => void;
}

export function CommentCreateForm({ users, currentUser, onSubmit }: CommentCreateFormProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const studentUsers = users.filter(u => {
    if (u.user_uuid === currentUser.user_uuid) return false;
    return true;
  });

  const handleSubmit = async () => {
    if (!selectedUser || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedUser, content.trim(), rating);
      setContent('');
      setRating(null);
      setSelectedUser('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUserObj = studentUsers.find(u => u.user_uuid === selectedUser);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <UserCombobox
              users={studentUsers}
              value={selectedUser}
              onChange={setSelectedUser}
              label="Student"
            />
          </div>

          {selectedUserObj && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Avatar
                src={selectedUserObj.profile_image_url}
                firstName={selectedUserObj.first_name}
                lastName={selectedUserObj.last_name}
                offsetX={selectedUserObj.image_offset_x}
                offsetY={selectedUserObj.image_offset_y}
                size="md"
              />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedUserObj.first_name} {selectedUserObj.last_name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUserObj.rank}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rating (optional)</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={rating === 'thumbs_up'}
                  onChange={() => setRating(rating === 'thumbs_up' ? null : 'thumbs_up')}
                />
                👍
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={rating === 'thumbs_down'}
                  onChange={() => setRating(rating === 'thumbs_down' ? null : 'thumbs_down')}
                />
                👎
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comment</label>
            <textarea
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your feedback..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || !content.trim() || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
