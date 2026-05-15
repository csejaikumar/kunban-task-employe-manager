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

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setPassword('');
      setError('');
    } else {
      setSelectedUser(null);
    }
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

        {!selectedUser ? (
          <div className="user-select-container" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
            <label htmlFor="userSelect" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Choose your account
            </label>
            <select 
              id="userSelect"
              onChange={handleUserSelect}
              defaultValue=""
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '1rem', cursor: 'pointer' }}
            >
              <option value="" disabled>Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {selectedUser && (
          <form onSubmit={handleLogin} className="password-form animate-fade-in" style={{ marginTop: '1.5rem', width: '100%', textAlign: 'left' }}>
            <div className="selected-user-preview" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
              <img src={selectedUser.avatar} alt={selectedUser.name} className="avatar" style={{ width: '40px', height: '40px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedUser.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{selectedUser.role}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Enter password</label>
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
