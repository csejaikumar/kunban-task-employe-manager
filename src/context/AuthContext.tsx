import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { goeyToast } from 'goey-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  users: User[];
  addUser: (name: string, role: 'Admin' | 'Employee', password?: string) => void;
  removeUser: (id: string) => void;
  updatePassword: (userId: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      goeyToast.error('Failed to load user data');
    }
  };

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    goeyToast.success(`Welcome back, ${user.name}!`, {
      description: `You are now logged in as ${user.role}.`,
    });
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    goeyToast.info('Logged out successfully', {
      description: 'See you next time!',
    });
  };

  const addUser = async (name: string, role: 'Admin' | 'Employee', password?: string) => {
    const newUser = {
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`,
      password: password || 'password123',
    };
    const toastId = goeyToast.info('Creating user...', { duration: 60000 });
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      setUsers(prev => [...prev, data]);
      goeyToast.dismiss(toastId);
      goeyToast.success('User created successfully', {
        description: `${name} has been added to the team.`,
      });
    } catch (err) {
      console.error('Add user error:', err);
      goeyToast.dismiss(toastId);
      goeyToast.error('Failed to create user', {
        description: 'Please try again later.',
      });
    }
  };

  const removeUser = async (id: string) => {
    const toastId = goeyToast.info('Removing user...', { duration: 60000 });
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setUsers(prev => prev.filter(u => u.id !== id));
      if (currentUser?.id === id) logout();
      goeyToast.dismiss(toastId);
      goeyToast.success('User removed', {
        description: 'Member has been removed from the team.',
      });
    } catch (err) {
      console.error('Delete user error:', err);
      goeyToast.dismiss(toastId);
      goeyToast.error('Failed to remove user', {
        description: 'Operation could not be completed.',
      });
    }
  };

  const updatePassword = async (userId: string, newPassword: string) => {
    const promise = fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    }).then(async res => {
      if (!res.ok) throw new Error('Update failed');
      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      return true;
    });

    const toastPromise = goeyToast.promise(promise, {
      loading: 'Updating password...',
      success: 'Password updated',
      error: 'Update failed',
      description: {
        success: 'Your new security credentials are now active.',
        error: 'The password could not be changed.',
      },
    });

    try {
      await toastPromise;
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, users, addUser, removeUser, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
