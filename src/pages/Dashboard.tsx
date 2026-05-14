import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { tasks, projects } = useData();
  const { currentUser, users } = useAuth();

  const isAdmin = currentUser?.role === 'Admin';

  const myTasks = tasks.filter(t => t.assigneeId === currentUser?.id);
  const todoTasks = myTasks.filter(t => t.status === 'Todo' || t.status === 'In Progress');
  const reviewTasks = myTasks.filter(t => t.status === 'Review');
  const completedTasks = myTasks.filter(t => t.status === 'Done');

  const getTeamStats = () => {
    return users.map(user => {
      const userTasks = tasks.filter(t => t.assigneeId === user.id);
      const completed = userTasks.filter(t => t.status === 'Done').length;
      const total = userTasks.length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      return {
        ...user,
        completed,
        total,
        percentage
      };
    }).sort((a, b) => b.percentage - a.percentage);
  };

  const teamStats = isAdmin ? getTeamStats() : [];

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back, {currentUser?.name.split(' ')[0]} 👋</h1>
        <p>Here's what's happening with your projects today.</p>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card glass-panel">
          <div className="stat-icon bg-blue-100 text-blue-600">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Active Tasks</h3>
            <span className="stat-number">{todoTasks.length}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon bg-yellow-100 text-yellow-600">
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>In Review</h3>
            <span className="stat-number">{reviewTasks.length}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon bg-green-100 text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <h3>Completed</h3>
            <span className="stat-number">{completedTasks.length}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="task-list-section glass-panel">
          <h2>Your Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="empty-state">
              <p>You have no tasks assigned right now. Enjoy your day!</p>
            </div>
          ) : (
            <div className="task-list">
              {myTasks.map(task => (
                <Link to={`/project/${task.projectId}`} key={task.id} className="task-row">
                  <div className="task-row-main">
                    <span className={`task-status-dot status-${task.status.toLowerCase().replace(' ', '')}`}></span>
                    <div className="task-details">
                      <h4>{task.title}</h4>
                      <span className="task-project">{getProjectName(task.projectId)}</span>
                    </div>
                  </div>
                  <div className="task-row-meta">
                    <span className={`priority badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="status-label">{task.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {isAdmin && (
          <section className="performance-section glass-panel">
            <h2>Team Performance</h2>
            <div className="performance-list">
              {teamStats.map(stat => (
                <div key={stat.id} className="performance-item">
                  <div className="performance-user">
                    <img src={stat.avatar} alt={stat.name} className="mini-avatar" />
                    <div className="user-info">
                      <h4>{stat.name}</h4>
                      <span>{stat.completed} / {stat.total} Tasks Completed</span>
                    </div>
                  </div>
                  <div className="performance-bar-container">
                    <div className="performance-bar-bg">
                      <div 
                        className="performance-bar-fill" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <span className="performance-percentage">{stat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
