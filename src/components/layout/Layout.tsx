import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';
import ProjectModal from '../modals/ProjectModal';

export default function Layout() {
  const { currentUser } = useAuth();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      <Sidebar onNewProject={() => setIsProjectModalOpen(true)} />
      <div className="main-content">
        <Header />
        <main className="page-content animate-fade-in">
          <Outlet />
        </main>
      </div>
      
      {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} />}
    </div>
  );
}
