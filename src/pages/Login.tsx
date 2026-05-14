import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import './Login.css';

export default function Login() {
  const { users, login } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setPassword('');
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.password === password || (!selectedUser.password && password === 'password123')) {
      login(selectedUser);
      navigate('/');
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">✨</span>
            <h1>Nexus</h1>
          </div>
          <p>Select a user to continue</p>
        </div>

        <div className="user-list">
          {users.map((user) => (
            <button
              key={user.id}
              className={`user-card ${selectedUser?.id === user.id ? 'active' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              <img src={user.avatar} alt={user.name} className="avatar" />
              <div className="user-info">
                <h3>{user.name}</h3>
                <p>{user.role}</p>
              </div>
            </button>
          ))}
        </div>

        {selectedUser && (
          <form onSubmit={handleLogin} className="password-form animate-fade-in" style={{ marginTop: '2rem', width: '100%' }}>
            <div className="form-group">
              <label htmlFor="password">Enter password for {selectedUser.name}</label>
              <input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            {error && <p className="error-text" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              disabled={!password}
            >
              Log In
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              onClick={() => setSelectedUser(null)}
            >
              Back to User List
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
