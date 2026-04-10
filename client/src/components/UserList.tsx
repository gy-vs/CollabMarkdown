import { User } from '../types';
import { User as UserIcon } from 'lucide-react';

interface UserListProps {
  users: User[];
  currentUserId: string;
}

export default function UserList({ users, currentUserId }: UserListProps) {
  const otherUsers = users.filter(u => u.id !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <span>Active Users ({otherUsers.length})</span>
      </div>
      <div className="user-list-content">
        {otherUsers.map((user) => (
          <div key={user.id} className="user-item">
            <div
              className="user-avatar"
              style={{ backgroundColor: user.color }}
            >
              <UserIcon size={14} />
            </div>
            <span className="user-name" style={{ color: user.color }}>
              {user.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
