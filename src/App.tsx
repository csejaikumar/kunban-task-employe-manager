import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { GoeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
import PublicProjectBoard from './pages/PublicProjectBoard';
import Team from './pages/Team';
import MeetingRoom from './pages/MeetingRoom';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/shared/:token" element={<PublicProjectBoard />} />
              <Route path="/meeting/:meetingCode" element={<MeetingRoom />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="team" element={<Team />} />
                <Route path="project/:id" element={<ProjectBoard />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <GoeyToaster position="top-right" />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
