import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Check } from 'lucide-react';
import './Modal.css';

export default function ProjectModal({ onClose }: { onClose: () => void }) {
  const { addProject } = useData();
  const { currentUser, users } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentUser ? [currentUser.id] : []);

  const toggleMember = (userId: string) => {
    if (userId === currentUser?.id) return; // Owner always included
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({
      name,
      description,
      ownerId: currentUser!.id,
      members: selectedMembers,
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input 
              id="projectName"
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="projectDesc">Description</label>
            <textarea 
              id="projectDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Assign Team Members</label>
            <div className="member-selection-list">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className={`member-select-item ${selectedMembers.includes(user.id) ? 'selected' : ''} ${user.id === currentUser?.id ? 'disabled' : ''}`}
                  onClick={() => toggleMember(user.id)}
                >
                  <div className="member-info">
                    <img src={user.avatar} alt={user.name} className="mini-avatar" />
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-role">{user.role}</span>
                    </div>
                  </div>
                  <div className="checkbox">
                    {selectedMembers.includes(user.id) && <Check size={14} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

