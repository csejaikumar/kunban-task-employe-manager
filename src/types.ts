export type Role = 'Admin' | 'Employee' | 'Sub Admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  password?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[]; // User IDs
  subAdmins?: string[]; // User IDs
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Review' | 'Done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string | null;
  subtasks?: { id: string; title: string; isCompleted: boolean }[];
}

export interface Meeting {
  id?: string;
  projectId: string;
  meetingCode: string;
  hostId: string;
  createdAt?: string;
}
