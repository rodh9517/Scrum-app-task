
export enum TaskStatus {
  Backlog = 'Backlog',
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
  Archived = 'Archived', // New Status for History
}

// New Types for Priority and Duration
export type TaskPriority = 'Baja' | 'Moderada' | 'Media' | 'Alta' | 'Urgente';
export type TaskDuration = '1 día' | '2-3 días' | '1 semana' | '2 semanas';

export interface Project {
  id: string;
  name: string;
  color: string;
  responsibleIds: string[];
  description?: string; // New field for AI context
}

export interface User {
  id:string;
  name: string;
  avatarColor: string;
  picture?: string;
  email?: string; // New field for collaborative matching
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
  responsibleId: string; // Can be empty string if in Backlog
  subtasks: Subtask[];
  createdAt: string; // ISO date string
  completedAt?: string | null; // ISO date string
  order?: number; // Added for manual sorting
  // New Fields
  priority?: TaskPriority;
  duration?: TaskDuration;
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
  read?: boolean; // New field to track read status
}

// --- NEW TYPES FOR WORKSPACES ---

export interface WorkspaceMember extends User {}

export interface Workspace {
    id: string;
    name: string;
    isPersonal: boolean;
    members?: WorkspaceMember[]; // Optional, for display on selector
    // New visual properties
    icon?: string; // Emoji or icon identifier
    theme?: string; // Hex color for background/accent
    order?: number; // For sorting
}