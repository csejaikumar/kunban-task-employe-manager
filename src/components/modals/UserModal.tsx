import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Eye, EyeOff } from 'lucide-react';
import './Modal.css';

export default function UserModal({ onClose }: { onClose: () => void }) {
  const { addUser } = useAuth();
  
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Admin' | 'Employee' | 'Sub Admin'>('Employee');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
  
    addUser(name.trim(), role, password.trim());
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <div className="modal-header">
          <h2>Add New User</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="userName">Full Name</label>
            <input 
              id="userName"
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="userRole">Role</label>
            <select 
              id="userRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'Admin' | 'Employee' | 'Sub Admin')}
            >
              <option value="Employee">Employee (Standard Access)</option>
              <option value="Sub Admin">Sub Admin (Project-Scoped Access)</option>
              <option value="Admin">Admin (Full Access)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="userPassword">Initial Password</label>
            <div className="input-with-action">
              <input 
                id="userPassword"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter initial password"
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
            <p className="form-help-text">Employees can change this later from their dashboard.</p>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || !password.trim()}>Add User</button>
          </div>
        </form>
      </div>
    </div>
  );
}
