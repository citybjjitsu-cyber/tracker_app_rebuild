import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

interface UserComboboxProps {
  users: User[];
  value: string;
  onChange: (userUuid: string) => void;
  label?: string;
  placeholder?: string;
  excludeUserUuid?: string;
  className?: string;
}

function compareUsers(a: User, b: User) {
  const firstName = a.first_name.localeCompare(b.first_name, undefined, { sensitivity: 'base' });
  if (firstName !== 0) return firstName;
  return a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' });
}

export function UserCombobox({
  users,
  value,
  onChange,
  label,
  placeholder = 'Search students...',
  excludeUserUuid,
  className,
}: UserComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listId = `${inputId}-listbox`;

  const availableUsers = useMemo(
    () => users.filter(user => user.user_uuid !== excludeUserUuid).sort(compareUsers),
    [users, excludeUserUuid]
  );
  const selectedUser = availableUsers.find(user => user.user_uuid === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = normalizedQuery
    ? availableUsers.filter(user =>
        `${user.first_name} ${user.last_name} ${user.email} ${user.rank}`.toLowerCase().includes(normalizedQuery)
      )
    : availableUsers;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const selectUser = (userUuid: string) => {
    onChange(userUuid);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        value={isOpen ? query : selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : query}
        placeholder={selectedUser && !isOpen ? `${selectedUser.first_name} ${selectedUser.last_name}` : placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          if (value) onChange('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          } else if (event.key === 'Enter' && filteredUsers.length === 1) {
            event.preventDefault();
            selectUser(filteredUsers[0].user_uuid);
          }
        }}
        className="flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--input)] bg-[var(--card)] py-1 shadow-lg"
        >
          {filteredUsers.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--muted-foreground)]">No students found.</p>
          ) : (
            filteredUsers.map(user => (
              <button
                key={user.user_uuid}
                type="button"
                role="option"
                aria-selected={user.user_uuid === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectUser(user.user_uuid)}
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]',
                  user.user_uuid === value && 'bg-[var(--muted)]'
                )}
              >
                <span className="block text-[var(--foreground)]">{user.first_name} {user.last_name}</span>
                <span className="block text-xs text-[var(--muted-foreground)]">{user.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
