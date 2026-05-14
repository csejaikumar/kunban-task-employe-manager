import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import './Modal.css';

export default function PasswordModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updatePassword } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (currentUser) {
      setIsSubmitting(true);
      const success = await updatePassword(currentUser.id, newPassword);
      setIsSubmitting(false);
      
      if (success) {
        onClose();
      } else {
        setError('Failed to update password. Please try again.');
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div className="header-with-icon">
            <Lock size={20} className="text-primary" />
            <h2>Change Password</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="input-with-action">
              <input 
                id="newPassword"
                type={showPassword ? "text" : "password"} 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                autoFocus
                required
              />
              <button 
                type="button" 
                className="btn-icon btn-sm" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input 
              id="confirmPassword"
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !newPassword || !confirmPassword}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
