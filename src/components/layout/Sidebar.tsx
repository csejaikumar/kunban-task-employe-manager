import { NavLink } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FolderKanban, Plus, UserPlus } from 'lucide-react';

export default function Sidebar({ onNewProject }: { onNewProject: () => void }) {
  const { projects } = useData();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <span className="logo-icon">✨</span>
        <h2>Nexus</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/team" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserPlus size={20} />
          <span>Team Directory</span>
        </NavLink>



        <div className="nav-section">
          <div className="section-header">
            <h3>Projects</h3>
            {isAdmin && (
              <button className="btn-icon btn-add" onClick={onNewProject} title="New Project">
                <Plus size={16} />
              </button>
            )}
          </div>
          
          <div className="project-list">
            {projects.map(project => (
              <NavLink 
                key={project.id} 
                to={`/project/${project.id}`}
                className={({ isActive }) => `nav-item project-item ${isActive ? 'active' : ''}`}
              >
                <FolderKanban size={18} />
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
