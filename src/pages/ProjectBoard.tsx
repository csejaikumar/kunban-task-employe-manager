import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { TaskStatus } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, Calendar, Search, Filter, CheckSquare, Trash2, UserPlus, Share2, Link as LinkIcon, Copy, X, Eye, Check, Edit2, Video } from 'lucide-react';
import TaskModal from '../components/modals/TaskModal';
import { goeyToast } from 'goey-toast';
import './ProjectBoard.css';

const COLUMNS: TaskStatus[] = ['Todo', 'In Progress', 'Review', 'Done'];

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, tasks, moveTask, toggleSubtask, deleteTask, deleteProject, isLoading, toggleProjectMember, generateShareLink, revokeShareLink, checkActiveHuddle, startHuddle } = useData();
  const { currentUser, users } = useAuth();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [activeHuddleCode, setActiveHuddleCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchHuddleStatus = async () => {
      if (!id) return;
      const meeting = await checkActiveHuddle(id);
      setActiveHuddleCode(meeting ? meeting.meetingCode : null);
    };

    fetchHuddleStatus();
    const interval = setInterval(fetchHuddleStatus, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const project = projects.find(p => String(p.id) === String(id) || String((p as any)._id) === String(id));

  if (isLoading) return <div className="loading-container">Loading project...</div>;
  if (!project) return <Navigate to="/" />;

  const isAdmin = currentUser?.role === 'Admin';
  const projectTasks = tasks.filter(t => t.projectId === (project.id || (project as any)._id));
  const projectMembers = Array.isArray(project.members) ? project.members : [];

  let filteredTasks = projectTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'All' || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'All' || task.assigneeId === filterAssignee;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const getAssigneeAvatar = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces';
  };

  const handleToggleMember = (userId: string) => {
    if (!id) return;
    toggleProjectMember(id, userId);
  };

  const handleGenerateShare = async () => {
    if (!id) return;
    try {
      await generateShareLink(id);
      goeyToast.success("Share link generated!");
    } catch (err) {
      goeyToast.error("Failed to generate link");
    }
  };

  const handleRevokeShare = async () => {
    if (!id) return;
    try {
      await revokeShareLink(id);
      goeyToast.info("Share link revoked");
    } catch (err) {
      goeyToast.error("Failed to revoke link");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    goeyToast.success("Link copied to clipboard!");
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;
    
    const task = tasks.find(t => t.id === draggableId);
    if (task) {
      // Permission check: regular employees can only move their own tasks or unassigned tasks
      const isAssignedToOther = task.assigneeId && task.assigneeId !== currentUser?.id;
      if (!isAdmin && isAssignedToOther) {
        goeyToast.error("Permission Denied", {
          description: "Only admins or the assigned employee can move this task."
        });
        return;
      }

      if (task.status !== newStatus) {
        moveTask(draggableId, newStatus);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    await deleteProject(id);
    navigate('/');
  };

  const handleHuddleClick = async () => {
    if (!id || !currentUser) return;
    try {
      if (activeHuddleCode) {
        navigate(`/meeting/${activeHuddleCode}`);
      } else {
        const meeting = await startHuddle(id, currentUser.id);
        setActiveHuddleCode(meeting.meetingCode);
        navigate(`/meeting/${meeting.meetingCode}`);
      }
    } catch (err) {
      goeyToast.error("Failed to connect to huddle room");
    }
  };

  return (
    <div className="project-board animate-fade-in">
      <header className="board-header">
        <div className="board-info">
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div className="board-actions">
          <div className="project-members-list">
            {projectMembers.map(memberId => {
              const user = users.find(u => String(u.id) === String(memberId));
              return user ? (
                <img key={memberId} src={user.avatar} alt={user.name} className="mini-avatar" title={user.name} />
              ) : null;
            })}
            {isAdmin && (
              <div className="manage-members-container">
                <button 
                  className={`btn-icon btn-add-member ${isManageMembersOpen ? 'active' : ''}`}
                  onClick={() => setIsManageMembersOpen(!isManageMembersOpen)}
                  title="Manage Team"
                >
                  <UserPlus size={18} />
                </button>
                
                {isManageMembersOpen && (
                  <div className="manage-members-dropdown glass-panel animate-fade-in">
                    <h4>Manage Team</h4>
                    <div className="manage-members-list">
                      {users.map(user => {
                        const isMember = projectMembers.some(m => String(m) === String(user.id));
                        const isOwner = project && String(user.id) === String(project.ownerId);
                        
                        return (
                          <div 
                            key={user.id} 
                            className={`manage-member-item ${isMember ? 'active' : ''}`}
                            onClick={() => handleToggleMember(user.id)}
                          >
                            <div className="member-item-main">
                              <img src={user.avatar} alt={user.name} className="mini-avatar" />
                              <div className="member-item-info">
                                <span className="member-name">{user.name}</span>
                                {isOwner && <span className="owner-badge">Owner</span>}
                              </div>
                            </div>
                            <div className="member-item-action">
                              {isMember ? (
                                !isOwner && <span className="remove-text">Remove</span>
                              ) : (
                                <span className="add-text">Add</span>
                              )}
                              <div className={`status-indicator ${isMember ? 'active' : ''}`}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button 
            className={`btn ${activeHuddleCode ? 'btn-huddle-pulse animate-glow' : 'btn-secondary'}`}
            onClick={handleHuddleClick}
            title={activeHuddleCode ? "Call in Progress - Click to Join!" : "Start Team Call"}
          >
            <Video size={18} />
            <span>{activeHuddleCode ? "Join Huddle" : "Start Huddle"}</span>
          </button>

          <button className="btn btn-secondary" onClick={() => setIsShareModalOpen(true)}>
            <Share2 size={18} /> Share
          </button>

          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
                <Plus size={18} /> New Task
              </button>
              {!showDeleteConfirm ? (
                <button
                  id="delete-project-btn"
                  className="btn btn-ghost text-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={18} /> Delete Project
                </button>
              ) : (
                <div className="delete-confirm-group animate-fade-in">
                  <span>Are you sure?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Confirm</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      <div className="board-filters glass-panel">
        <div className="filter-group search-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className="filter-group">
          <UserPlus size={18} />
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="All">All Assignees</option>
            {users.filter(u => projectMembers.some(m => String(m) === String(u.id))).map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {COLUMNS.map(status => {
            const columnTasks = filteredTasks.filter(t => t.status === status);
            return (
              <div key={status} className="board-column glass-panel">
                <div className="column-header">
                  <div className="column-info">
                    <h3>{status}</h3>
                    <span className="task-count">{columnTasks.length}</span>
                  </div>
                </div>

                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="column-task-list"
                    >
                      {columnTasks.map((task, index) => {
                        const isDragDisabled = !isAdmin && !!task.assigneeId && task.assigneeId !== currentUser?.id;
                        return (
                          <Draggable 
                            key={task.id} 
                            draggableId={task.id} 
                            index={index}
                            isDragDisabled={isDragDisabled}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`task-card glass-panel ${isDragDisabled ? 'drag-disabled' : ''}`}
                              >
                              <div className="task-card-header">
                                <span className={`priority-indicator bg-${task.priority.toLowerCase()}`}>
                                  {task.priority}
                                </span>
                                {isAdmin && (
                                  <div className="card-admin-actions">
                                    <button 
                                      className="btn-icon edit-task-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTask(task);
                                      }}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      className="btn-icon delete-task-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTask(task.id);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
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
                                  <div className="subtask-header">
                                    <span className="subtask-text">
                                      {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length} subtasks
                                    </span>
                                  </div>
                                  <div className="subtask-list">
                                    {task.subtasks.map(st => (
                                      <div 
                                        key={st.id} 
                                        className={`subtask-item ${st.isCompleted ? 'completed' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubtask(task.id, st.id);
                                        }}
                                      >
                                        <div className={`subtask-checkbox ${st.isCompleted ? 'checked' : ''}`}>
                                          {st.isCompleted && <Check size={10} />}
                                        </div>
                                        <span className="subtask-title-text">{st.title}</span>
                                      </div>
                                    ))}
                                  </div>
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
                                  {task.assigneeId ? (
                                    <img src={getAssigneeAvatar(task.assigneeId)} alt="Assignee" className="task-avatar" />
                                  ) : (
                                    <div className="unassigned-avatar">?</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {(isTaskModalOpen || editingTask) && (
        <TaskModal 
          projectId={id!} 
          task={editingTask}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }} 
        />
      )}

      {isShareModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Share Project Progress</h2>
              <button className="btn-icon" onClick={() => setIsShareModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="share-modal-body">
              <div className="share-info-card">
                <div className="share-info-icon">
                  <Share2 size={24} />
                </div>
                <div className="share-info-text">
                  <p><strong>External Progress Sharing</strong></p>
                  <p>Share a live, read-only view of this project board with clients or stakeholders.</p>
                </div>
              </div>
              
              {(project as any).shareToken ? (
                <div className="share-link-section">
                  <label className="share-label">Public Access Link</label>
                  <div className="share-link-input-group">
                    <div className="share-url-field">
                      <LinkIcon size={14} className="link-icon" />
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/shared/${(project as any).shareToken}`} 
                      />
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => copyToClipboard(`${window.location.origin}/shared/${(project as any).shareToken}`)}
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  <div className="share-footer-actions">
                    <a 
                      href={`/shared/${(project as any).shareToken}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="share-preview-link"
                    >
                      <Eye size={14} /> Open Public Preview
                    </a>
                    <button 
                      className="btn-text text-danger" 
                      onClick={handleRevokeShare}
                    >
                      Revoke Public Access
                    </button>
                  </div>
                </div>
              ) : (
                <div className="share-setup-state">
                  <div className="share-benefits">
                    <div className="benefit-item">
                      <CheckSquare size={14} className="text-success" />
                      <span>Real-time progress tracking</span>
                    </div>
                    <div className="benefit-item">
                      <CheckSquare size={14} className="text-success" />
                      <span>No account required for clients</span>
                    </div>
                    <div className="benefit-item">
                      <CheckSquare size={14} className="text-success" />
                      <span>Secure read-only access</span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-block" onClick={handleGenerateShare}>
                    Generate Public Share Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
