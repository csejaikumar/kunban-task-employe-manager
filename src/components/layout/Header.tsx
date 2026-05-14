import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Bell, Sun, Moon, Key } from 'lucide-react';
import PasswordModal from '../modals/PasswordModal';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <header className="header glass-panel">
      <div className="header-left">
        {/* Can put breadcrumbs or project title here later */}
      </div>
      
      <div className="header-right">
        <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button className="btn-icon" title="Notifications">
          <Bell size={20} />
        </button>
        
        <div className="user-profile">
          <img src={currentUser?.avatar} alt={currentUser?.name} className="header-avatar" />
          <div className="header-user-info">
            <span className="user-name">{currentUser?.name}</span>
            <span className={`user-role badge-${currentUser?.role.toLowerCase()}`}>
              {currentUser?.role}
            </span>
          </div>
        </div>

        <button 
          className="btn-icon" 
          onClick={() => setIsPasswordModalOpen(true)} 
          title="Change Password"
        >
          <Key size={20} />
        </button>

        <button className="btn-icon logout-btn" onClick={logout} title="Log out">
          <LogOut size={20} />
        </button>
      </div>

      {isPasswordModalOpen && (
        <PasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      )}
    </header>
  );
}
