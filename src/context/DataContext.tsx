import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Project, Task, TaskStatus, Meeting } from '../types';
import { goeyToast } from 'goey-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface DataContextType {
  projects: Project[];
  tasks: Task[];
  isLoading: boolean;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (project: Project) => void;
  toggleProjectMember: (projectId: string, userId: string) => void;
  deleteProject: (id: string) => void;
  generateShareLink: (projectId: string) => Promise<string>;
  revokeShareLink: (projectId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  unassignTasksForUser: (userId: string) => void;
  checkActiveHuddle: (projectId: string) => Promise<Meeting | null>;
  startHuddle: (projectId: string, hostId: string) => Promise<Meeting>;
  endHuddle: (projectId: string) => Promise<void>;
}



const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        setIsLoading(true);
        await Promise.all([
          fetchProjects(controller.signal),
          fetchTasks(controller.signal)
        ]);
      } catch (err) {
        console.error('Initial data fetch failed or timed out:', err);
        goeyToast.error('Connection timed out', {
          description: 'The server is not responding. Please check your connection.'
        });
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);



  const fetchProjects = async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_URL}/api/projects`, { signal });
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      goeyToast.error('Failed to load projects');
    }
  };

  const fetchTasks = async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, { signal });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      goeyToast.error('Failed to load tasks');
    }
  };

  const addProject = async (projectData: Omit<Project, 'id'>) => {
    const promise = fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    }).then(async res => {
      const data = await res.json();
      setProjects(prev => [...prev, data]);
      return data;
    });

    return goeyToast.promise(promise, {
      loading: 'Creating project...',
      success: 'Project created!',
      error: 'Failed to create project',
      description: {
        success: 'Project is ready to use.',
        error: 'Please check your connection and try again.',
      },
    });
  };

  const updateProject = async (updatedProject: Project) => {
    const projectId = updatedProject.id || (updatedProject as any)._id;
    const promise = fetch(`${API_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProject),
    }).then(async res => {
      const data = await res.json();
      setProjects(prev => prev.map(p => {
        const pid = p.id || (p as any)._id;
        const did = data.id || (data as any)._id;
        return String(pid) === String(did) ? data : p;
      }));
      return data;
    });


    return goeyToast.promise(promise, {
      loading: 'Updating project...',
      success: 'Project updated',
      error: 'Update failed',
      description: {
        success: 'Changes saved successfully.',
        error: 'Could not save project changes.',
      },
    });
  };

  const toggleProjectMember = async (projectId: string, userId: string) => {
    // 1. Get current project state directly from state
    let action = '';
    setProjects(prev => {
      const project = prev.find(p => String(p.id) === String(projectId) || String((p as any)._id) === String(projectId));
      if (!project) return prev;

      // 2. Security check
      if (String(userId).trim() === String(project.ownerId).trim()) {
        goeyToast.info("Owner cannot be removed", {
          description: "The project owner must always be a member."
        });
        return prev;
      }

      const currentMembers = Array.isArray(project.members) ? project.members : [];
      const isAlreadyMember = currentMembers.some(m => String(m).trim() === String(userId).trim());
      
      const newMembers = isAlreadyMember
        ? currentMembers.filter(m => String(m).trim() !== String(userId).trim())
        : [...currentMembers, userId];

      action = isAlreadyMember ? 'removed' : 'added';
      const updatedProject = { ...project, members: newMembers };
      
      // 3. Push to server
      const id = project.id || (project as any)._id;
      fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      }).then(res => {
        if (res.ok) {
          goeyToast.success(`Member ${action} successfully`);
        } else {
          throw new Error('Server update failed');
        }
      }).catch(err => {
        console.error('Failed to sync project members:', err);
        goeyToast.error(`Failed to ${action.slice(0, -2)} member`);
        fetchProjects(); // Re-sync on error
      });

      return prev.map(p => {
        const pid = p.id || (p as any)._id;
        const did = updatedProject.id || (updatedProject as any)._id;
        return String(pid) === String(did) ? updatedProject : p;
      });
    });
  };


  const generateShareLink = async (projectId: string) => {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/share`, { method: 'POST' });
    const data = await res.json();
    setProjects(prev => prev.map(p => {
      const pid = p.id || (p as any)._id;
      return String(pid) === String(projectId) ? data : p;
    }));
    return data.shareToken;
  };

  const revokeShareLink = async (projectId: string) => {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/share`, { method: 'DELETE' });
    const data = await res.json();
    setProjects(prev => prev.map(p => {
      const pid = p.id || (p as any)._id;
      return String(pid) === String(projectId) ? data : p;
    }));
  };

  const deleteProject = async (id: string) => {
    const promise = fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' })
      .then(() => {
        setProjects(prev => prev.filter(p => p.id !== id));
        setTasks(prev => prev.filter(t => t.projectId !== id));
      });

    return goeyToast.promise(promise, {
      loading: 'Deleting project...',
      success: 'Project deleted',
      error: 'Delete failed',
      description: {
        success: 'Project and all its tasks have been removed.',
        error: 'The project could not be removed.',
      },
    });
  };

  const addTask = async (taskData: Omit<Task, 'id'>) => {
    const promise = fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    }).then(async res => {
      const data = await res.json();
      setTasks(prev => [...prev, data]);
      return data;
    });

    return goeyToast.promise(promise, {
      loading: 'Adding task...',
      success: 'Task added!',
      error: 'Failed to add task',
      description: {
        success: 'Task has been added to the board.',
        error: 'Ensure all required fields are filled.',
      },
    });
  };

  const updateTask = async (updatedTask: Task, silent = false) => {
    const promise = fetch(`${API_URL}/api/tasks/${updatedTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask),
    }).then(async res => {
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === data.id ? data : t));
      return data;
    });

    if (!silent) {
      goeyToast.promise(promise, {
        loading: 'Updating task...',
        success: 'Task updated',
        error: 'Failed to update task',
      });
    }

    return promise;
  };

  const deleteTask = async (id: string) => {
    const promise = fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' })
      .then(() => {
        setTasks(prev => prev.filter(t => t.id !== id));
      });

    return goeyToast.promise(promise, {
      loading: 'Deleting task...',
      success: 'Task deleted',
      error: 'Delete failed',
      description: {
        success: 'The task has been removed.',
        error: 'The task could not be removed.',
      },
    });
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const promise = updateTask({ ...task, status: newStatus }, true);
      goeyToast.promise(promise, {
        loading: 'Moving task...',
        success: `Moved to ${newStatus}`,
        error: 'Failed to move task',
      });
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const subtasks = task.subtasks?.map(st => 
        st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
      );
      const isCompleted = subtasks?.find(st => st.id === subtaskId)?.isCompleted;
      const promise = updateTask({ ...task, subtasks }, true);
      goeyToast.promise(promise, {
        loading: 'Updating subtask...',
        success: isCompleted ? 'Subtask completed!' : 'Subtask unchecked',
        error: 'Failed to update subtask',
      });
    }
  };

  const unassignTasksForUser = async (userId: string) => {
    const tasksToUpdate = tasks.filter(t => t.assigneeId === userId);
    for (const task of tasksToUpdate) {
      await updateTask({ ...task, assigneeId: null }, true);
    }
  };

  const checkActiveHuddle = async (projectId: string): Promise<Meeting | null> => {
    try {
      const res = await fetch(`${API_URL}/api/meetings/active/${projectId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error checking active huddle:', err);
      return null;
    }
  };

  const startHuddle = async (projectId: string, hostId: string): Promise<Meeting> => {
    try {
      const res = await fetch(`${API_URL}/api/meetings/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, hostId }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error starting huddle:', err);
      throw err;
    }
  };

  const endHuddle = async (projectId: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/api/meetings/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
    } catch (err) {
      console.error('Error ending huddle:', err);
    }
  };

  return (
    <DataContext.Provider value={{ projects, tasks, isLoading, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, moveTask, toggleSubtask, unassignTasksForUser, toggleProjectMember, generateShareLink, revokeShareLink, checkActiveHuddle, startHuddle, endHuddle }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
