import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { TaskStatus } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Calendar, Search, Filter, CheckSquare, Trash2, UserPlus } from 'lucide-react';
import TaskModal from '../components/modals/TaskModal';
import { goeyToast } from 'goey-toast';
import './ProjectBoard.css';

const COLUMNS: TaskStatus[] = ['Todo', 'In Progress', 'Review', 'Done'];

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, tasks, moveTask, toggleSubtask, deleteTask, updateTask, deleteProject } = useData();
  const { currentUser, users } = useAuth();
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const project = projects.find(p => p.id === id);
  if (!project) return <Navigate to="/" replace />;

  let projectTasks = tasks.filter(t => t.projectId === id);

  // Apply filters
  if (searchTerm) {
    projectTasks = projectTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  if (filterPriority !== 'All') {
    projectTasks = projectTasks.filter(t => t.priority === filterPriority);
  }
  if (filterAssignee !== 'All') {
    projectTasks = projectTasks.filter(t => 
      filterAssignee === 'Unassigned' ? t.assigneeId === null : t.assigneeId === filterAssignee
    );
  }

  const isAdmin = currentUser?.role === 'Admin';
  // If not admin and not assigned to project, might want to restrict view, but requirement says Employees can view but only manage their tasks.
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const taskId = result.draggableId;
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;

    // Permissions check
    if (!isAdmin && task.assigneeId !== currentUser?.id) {
      goeyToast.warning("Permission denied", {
        description: "You can only move tasks that are assigned to you."
      });
      return;
    }

    const newStatus = result.destination.droppableId as TaskStatus;
    if (newStatus !== task.status) {
      moveTask(taskId, newStatus);
    }
  };

  const getAssigneeAvatar = (assigneeId: string | null) => {
    if (!assigneeId) return undefined;
    return users.find(u => u.id === assigneeId)?.avatar;
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    setActiveDropdownMenu(null);
  };

  const handleDeleteProject = async () => {
    if (!isAdmin) {
      goeyToast.error('Permission denied', {
        description: 'Only Admins can delete projects.',
      });
      return;
    }
    if (id) {
      await deleteProject(id);
      navigate('/');
    }
  };

  const handleAssignToMe = (taskId: string) => {
    const task = projectTasks.find(t => t.id === taskId);
    if (task && currentUser) {
      updateTask({ ...task, assigneeId: currentUser.id });
      setActiveDropdownMenu(null);
    }
  };

  const handleAssignTo = (taskId: string, newAssigneeId: string) => {
    const task = projectTasks.find(t => t.id === taskId);
    if (task) {
      updateTask({ ...task, assigneeId: newAssigneeId });
      setActiveDropdownMenu(null);
    }
  };

  return (
    <div className="project-board" onClick={() => setActiveDropdownMenu(null)}>
      <header className="board-header">
        <div className="board-title">
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div className="board-actions">
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
                <Plus size={18} /> New Task
              </button>
              {!showDeleteConfirm ? (
                <button
                  id="delete-project-btn"
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete this project and all its tasks"
                >
                  <Trash2 size={18} /> Delete Project
                </button>
              ) : (
                <div className="delete-confirm-inline" onClick={(e) => e.stopPropagation()}>
                  <span>Delete project &amp; all tasks?</span>
                  <button
                    id="confirm-delete-project-btn"
                    className="btn btn-danger btn-sm"
                    onClick={handleDeleteProject}
                  >
                    Yes, Delete
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
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
          <Filter size={16} className="filter-icon" />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="All">All Assignees</option>
            <option value="Unassigned">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {COLUMNS.map(status => {
            const columnTasks = projectTasks.filter(t => t.status === status);
            return (
              <div key={status} className="board-column glass-panel">
                <div className="column-header">
                  <div className="column-header-left">
                    <h3>{status}</h3>
                    <span className="task-count">{columnTasks.length}</span>
                  </div>
                  {isAdmin && (
                    <button 
                      className="btn-icon btn-sm btn-ghost" 
                      onClick={() => setIsTaskModalOpen(true)}
                      title={`Add task to ${status}`}
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div 
                      className={`column-task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="task-card-header">
                                <span className={`priority-indicator bg-${task.priority.toLowerCase()}`}></span>
                                <div className="task-menu-container">
                                  <button 
                                    className="btn-icon btn-sm" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setActiveDropdownMenu(activeDropdownMenu === task.id ? null : task.id); 
                                    }}
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                  {activeDropdownMenu === task.id && (
                                    <div className="task-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                      {!task.assigneeId && !isAdmin && (
                                        <button 
                                          className="dropdown-item" 
                                          onClick={() => handleAssignToMe(task.id)}
                                        >
                                          <UserPlus size={14} /> Assign to me
                                        </button>
                                      )}
                                      {!task.assigneeId && isAdmin && (
                                        <div className="dropdown-item-select">
                                          <div className="dropdown-item-select-label">
                                            <UserPlus size={14} /> Assign
                                          </div>
                                          <select 
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleAssignTo(task.id, e.target.value);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            defaultValue=""
                                          >
                                            <option value="" disabled>Select user...</option>
                                            {users.map(u => (
                                              <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      <button 
                                        className="dropdown-item text-danger" 
                                        onClick={() => handleDeleteTask(task.id)}
                                        disabled={!isAdmin}
                                        title={!isAdmin ? "Only Admins can delete tasks" : ""}
                                      >
                                        <Trash2 size={14} /> Delete Task
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <h4 className="task-title">{task.title}</h4>
                              <p className="task-desc">{task.description}</p>
                              
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="task-subtasks">
                                  <div className="subtask-progress">
                                    <CheckSquare size={12} />
                                    <span>{task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length}</span>
                                  </div>
                                  <div className="subtask-list">
                                    {task.subtasks.map(st => (
                                      <div key={st.id} className={`subtask-item ${st.isCompleted ? 'completed' : ''}`} onClick={(e) => { e.stopPropagation(); toggleSubtask(task.id, st.id); }}>
                                        <div className={`checkbox ${st.isCompleted ? 'checked' : ''}`}></div>
                                        <span>{st.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="task-footer">
                                {task.dueDate && (
                                  <div className="task-date">
                                    <Calendar size={12} />
                                    <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
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
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {isTaskModalOpen && id && (
        <TaskModal projectId={id as string} onClose={() => setIsTaskModalOpen(false)} />
      )}
    </div>
  );
}
