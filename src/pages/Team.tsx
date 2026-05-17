import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserPlus, Shield, User, Trash2, Search, Users, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';
import UserModal from '../components/modals/UserModal';
import './Dashboard.css'; 
import './Team.css';

const getNextRole = (currentRole: 'Admin' | 'Employee' | 'Sub Admin'): 'Admin' | 'Employee' | 'Sub Admin' => {
  if (currentRole === 'Admin') return 'Sub Admin';
  if (currentRole === 'Sub Admin') return 'Employee';
  return 'Admin';
};

export default function Team() {
  const { users, currentUser, removeUser, changeUserRole } = useAuth();
  const { tasks, unassignTasksForUser } = useData();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const isAdmin = currentUser?.role === 'Admin';

  const handleRemoveUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this member? All their assigned tasks will be unassigned.')) {
      await unassignTasksForUser(userId);
      await removeUser(userId);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const employeeCount = users.length - adminCount;

  return (
    <div className="dashboard team-page">
      <header className="dashboard-header">
        <div className="header-info">
          <h1>Team Directory</h1>
          <p>Manage your organization's employees and their access levels.</p>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsUserModalOpen(true)}>
              <UserPlus size={18} /> Add New Member
            </button>
          )}
        </div>
      </header>

      <div className="team-stats-bar animate-fade-in">
        <div className="team-stat-item">
          <div className="stat-icon-mini bg-blue">
            <Users size={16} />
          </div>
          <div className="stat-text">
            <span className="stat-val">{users.length}</span>
            <span className="stat-lbl">Total Members</span>
          </div>
        </div>
        <div className="team-stat-item">
          <div className="stat-icon-mini bg-purple">
            <ShieldCheck size={16} />
          </div>
          <div className="stat-text">
            <span className="stat-val">{adminCount}</span>
            <span className="stat-lbl">Admins</span>
          </div>
        </div>
        <div className="team-stat-item">
          <div className="stat-icon-mini bg-green">
            <User size={16} />
          </div>
          <div className="stat-text">
            <span className="stat-val">{employeeCount}</span>
            <span className="stat-lbl">Employees</span>
          </div>
        </div>
      </div>

      <div className="team-controls">
        <div className="search-wrapper glass-panel">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="view-toggle glass-panel">
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button 
            className={viewMode === 'grid' ? 'active' : ''} 
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
        </div>
      </div>

      <div className={`team-container ${viewMode}`}>
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>No team members found matching your search.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="team-list glass-panel">
            <div className="list-header">
              <span className="col-name">Member</span>
              <span className="col-role">Role</span>
              <span className="col-email">Email</span>
              <span className="col-tasks">Tasks</span>
              <span className="col-actions"></span>
            </div>
            {filteredUsers.map(user => {
              const userTasks = tasks.filter(t => t.assigneeId === user.id);
              const completedTasks = userTasks.filter(t => t.status === 'Done').length;
              
              return (
                <div key={user.id} className="list-row">
                  <div className="col-name">
                    <div className="user-profile">
                      <div className="avatar-wrapper">
                        <img src={user.avatar} alt={user.name} />
                        <span className="dot online"></span>
                      </div>
                      <div className="name-info">
                        <span className="full-name">{user.name}</span>
                        {user.id === currentUser?.id && <span className="badge-mini">You</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-role">
                    <span className={`role-badge ${user.role.toLowerCase().replace(' ', '-')}`}>
                      {user.role === 'Admin' || user.role === 'Sub Admin' ? <Shield size={12} /> : <User size={12} />}
                      {user.role}
                    </span>
                  </div>
                  <div className="col-email">
                    <span className="email-text">{user.name.toLowerCase().replace(' ', '.')}@nexus.com</span>
                  </div>
                  <div className="col-tasks">
                    <div className="task-mini-stat">
                      <CheckCircle size={12} />
                      <span>{completedTasks} Done</span>
                    </div>
                  </div>
                  <div className="col-actions">
                    {isAdmin && user.id !== currentUser?.id && (
                      <div className="row-actions-group">
                        <button
                          className="btn-role-toggle"
                          onClick={() => changeUserRole(user.id, getNextRole(user.role as any))}
                          title={user.role === 'Admin' ? 'Change to Sub Admin' : user.role === 'Sub Admin' ? 'Change to Employee' : 'Change to Admin'}
                        >
                          <RefreshCw size={12} />
                          {user.role === 'Admin' ? 'Make Sub Admin' : user.role === 'Sub Admin' ? 'Make Employee' : 'Make Admin'}
                        </button>
                        <button 
                          className="btn-icon btn-sm text-danger"
                          onClick={() => handleRemoveUser(user.id)}
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="team-grid">
            {filteredUsers.map((user) => (
              <div key={user.id} className="team-card glass-panel">
                {user.id === currentUser?.id && (
                  <span className="badge-you">Current User</span>
                )}
                
                <div className="team-card-top">
                  <div className="team-avatar-container">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="team-avatar"
                    />
                    <span className="status-indicator online"></span>
                  </div>
                  
                  <div className="team-info-main">
                    <h3 className="team-name">{user.name}</h3>
                    <div className={`team-role ${user.role.toLowerCase().replace(' ', '-')}`}>
                      {user.role === 'Admin' || user.role === 'Sub Admin' ? <Shield size={12} /> : <User size={12} />}
                      <span>{user.role}</span>
                    </div>
                  </div>
                </div>

                <div className="team-card-details">
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{user.name.toLowerCase().replace(' ', '.')}@nexus.com</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Joined</span>
                    <span className="detail-value">May 2024</span>
                  </div>
                </div>
                
                {isAdmin && user.id !== currentUser?.id && (
                  <div className="team-card-actions">
                    <button
                      className="btn-role-toggle"
                      onClick={() => changeUserRole(user.id, getNextRole(user.role as any))}
                    >
                      <RefreshCw size={13} />
                      {user.role === 'Admin' ? 'Make Sub Admin' : user.role === 'Sub Admin' ? 'Make Employee' : 'Make Admin'}
                    </button>
                    <button 
                      className="btn-text text-danger" 
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isUserModalOpen && <UserModal onClose={() => setIsUserModalOpen(false)} />}
    </div>
  );
}
