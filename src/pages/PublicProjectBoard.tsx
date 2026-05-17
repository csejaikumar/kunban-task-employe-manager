import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  ArrowLeft
} from 'lucide-react';
import type { Project, Task, TaskStatus } from '../types';
import './ProjectBoard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PublicProjectBoard() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [activeMeetingCode, setActiveMeetingCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/public/projects/${token}`);
        if (!res.ok) throw new Error('Project not found or link expired');
        const data = await res.json();
        setProject(data.project);
        setTasks(data.tasks);
        setActiveMeetingCode(data.activeMeetingCode);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/projects/${token}`);
        if (res.ok) {
          const data = await res.json();
          setActiveMeetingCode(data.activeMeetingCode);
        }
      } catch (err) {
        console.error('Error polling huddle status:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) return <div className="loading-container">Loading shared project...</div>;
  if (error || !project) return (
    <div className="error-container glass-panel animate-fade-in">
      <h2>Access Denied</h2>
      <p>{error || 'This project link is invalid or has been revoked.'}</p>
      <Link to="/" className="btn btn-primary"><ArrowLeft size={18} /> Go Back</Link>
    </div>
  );

  let filteredTasks = [...tasks];
  if (searchTerm) {
    filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  if (filterPriority !== 'All') {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }

  const columns: TaskStatus[] = ['Todo', 'In Progress', 'Review', 'Done'];

  return (
    <div className="project-board public-view">
      <div className="public-banner animate-fade-in">
        <div className="banner-icon">
          <Eye size={18} />
        </div>
        <div className="banner-text">
          You are viewing the <strong>Live Project Board</strong> in secure <strong>Read-Only</strong> mode.
        </div>
      </div>

      <header className="board-header">
        <div className="board-info">
          <div className="portal-badge">Client Portal</div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
      </header>

      <div className="board-filters glass-panel">
        <div className="filter-group search-group">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="board-columns">
        {columns.map(status => {
          const columnTasks = filteredTasks.filter(t => t.status === status);
          return (
            <div key={status} className="board-column glass-panel">
              <div className="column-header">
                <div className="column-info">
                  <h3>{status}</h3>
                  <span className="task-count">{columnTasks.length}</span>
                </div>
              </div>
              
              <div className="column-task-list">
                {columnTasks.map(task => (
                  <div key={task.id} className="task-card public-card">
                    <div className="task-card-header">
                      <span className={`priority-indicator bg-${task.priority.toLowerCase()}`}></span>
                      <span className="priority-label">{task.priority}</span>
                    </div>
                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-desc">{task.description}</p>
                    
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="task-subtasks">
                        <div className="subtask-progress">
                          <div 
                            className="progress-bar" 
                            style={{ width: `${(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100}%` }}
                          ></div>
                        </div>
                        <span className="subtask-text">
                          {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks
                        </span>
                      </div>
                    )}
                    
                    <div className="task-card-footer">
                      {task.dueDate && (
                        <div className="task-date">
                          <Calendar size={12} />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="task-assignees">
                        {task.assigneeId && (
                          <div className="task-avatar-wrapper">
                            <div className="mini-status-dot"></div>
                            {/* In public view, we might not have the full user list loaded easily, but we can use a placeholder or check if project.members has it */}
                            <div className="unassigned-avatar">?</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="empty-column-state">No tasks in {status}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeMeetingCode && (
        <div className="client-call-alert glass-panel animate-fade-in">
          <div className="alert-pulse-ring"></div>
          <div className="alert-content">
            <h4>Live Call in Progress</h4>
            <p>The project team is currently in a live meeting. Click below to join the discussion.</p>
            <Link to={`/meeting/${activeMeetingCode}`} className="btn btn-primary btn-sm btn-block animate-glow" style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}>
              Join Project Huddle
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
