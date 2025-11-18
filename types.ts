export enum TaskStatus {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export interface Project {
  id: string;
  name: string;
  color: string;
  responsibleIds: string[];
}

export interface User {
  id:string;
  name: string;
  avatarColor: string;
  picture?: string;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  responsibleId: string;
  subtasks: Subtask[];
  createdAt: string; // ISO date string
  completedAt?: string | null; // ISO date string
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: string; // ISO date string
  taskId?: string;
}

export enum NotificationType {
  Info = 'info',
  Success = 'success',
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  onClick?: () => void;
}

// --- NEW TYPES FOR WORKSPACES ---

export interface WorkspaceMember extends User {}

export interface Workspace {
    id: string;
    name: string;
    isPersonal: boolean;
    members?: WorkspaceMember[]; // Optional, for display on selector
}
