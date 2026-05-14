import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Project, Task, TaskStatus } from '../types';
import { goeyToast } from 'goey-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface DataContextType {
  projects: Project[];
  tasks: Task[];
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (project: Project) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  unassignTasksForUser: (userId: string) => void;
}



const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      goeyToast.error('Failed to load projects');
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      const data = await res.json();
      setTasks(data);
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
    const promise = fetch(`${API_URL}/api/projects/${updatedProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProject),
    }).then(async res => {
      const data = await res.json();
      setProjects(prev => prev.map(p => p.id === data.id ? data : p));
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

  return (
    <DataContext.Provider value={{ projects, tasks, addProject, updateProject, addTask, updateTask, deleteTask, moveTask, toggleSubtask, unassignTasksForUser }}>
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
