import React from 'react';
import { Task, Project, User, TaskStatus, Message } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  messages: Message[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdateTask: (task: Task) => void;
  onGenerateSubtasks: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  highlightedTaskId: string | null;
  onNavigateToTaskMessages: (taskId: string) => void;
}

const KANBAN_COLUMNS: { title: string; status: TaskStatus }[] = [
  { title: 'Por Hacer', status: TaskStatus.ToDo },
  { title: 'En Progreso', status: TaskStatus.InProgress },
  { title: 'Hecho', status: TaskStatus.Done },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projects, users, messages, onUpdateTaskStatus, onUpdateTask, onGenerateSubtasks, onDeleteTask, highlightedTaskId, onNavigateToTaskMessages }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {KANBAN_COLUMNS.map(({ title, status }) => {
        const columnTasks = tasks.filter(task => task.status === status);
        return (
          <KanbanColumn
            key={status}
            title={title}
            status={status}
            tasks={columnTasks}
            projects={projects}
            users={users}
            messages={messages}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onUpdateTask={onUpdateTask}
            onGenerateSubtasks={onGenerateSubtasks}
            onDeleteTask={onDeleteTask}
            highlightedTaskId={highlightedTaskId}
            onNavigateToTaskMessages={onNavigateToTaskMessages}
          />
        );
      })}
    </div>
  );
};
