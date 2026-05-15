import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Plus, Trash2 } from 'lucide-react';

export default function TaskModal({ projectId, onClose }: { projectId: string, onClose: () => void }) {
  const { addTask } = useData();
  const { users } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [subtasks, setSubtasks] = useState<{ id: string, title: string, isCompleted: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: crypto.randomUUID(), title: newSubtask.trim(), isCompleted: false }]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      projectId,
      title,
      description,
      priority,
      assigneeId: assigneeId || null,
      status: 'Todo',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      subtasks,
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <div className="modal-header">
          <h2>New Task</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="taskTitle">Task Title</label>
            <input 
              id="taskTitle"
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design User Profile"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="taskDesc">Description</label>
            <textarea 
              id="taskDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed requirements"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskPriority">Priority</label>
            <select id="taskPriority" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="taskAssignee">Assignee</label>
            <select id="taskAssignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subtasks</label>
            <div className="subtask-input-group" style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newSubtask} 
                onChange={(e) => setNewSubtask(e.target.value)} 
                placeholder="Add a subtask..." 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddSubtask}><Plus size={18} /></button>
            </div>
            {subtasks.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subtasks.map(st => (
                  <li key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.875rem' }}>{st.title}</span>
                    <button type="button" className="btn-icon" style={{ color: 'var(--accent)', padding: '0.25rem' }} onClick={() => handleRemoveSubtask(st.id)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
