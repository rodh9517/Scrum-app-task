
import React, { useState } from 'react';
import { Task, Project, User, TaskStatus, Message } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  projects: Project[];
  users: User[];
  messages: Message[];
  onUpdateTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onGenerateSubtasks: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  highlightedTaskId: string | null;
  onNavigateToTaskMessages: (taskId: string) => void;
  collapsedTaskIds: Set<string>;
  onToggleTaskCollapse: (taskId: string) => void;
  isReadOnly?: boolean;
  onMoveTask: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  title, status, tasks, projects, users, messages, onUpdateTask, onUpdateTaskStatus, onGenerateSubtasks, onDeleteTask, highlightedTaskId, onNavigateToTaskMessages,
  collapsedTaskIds, onToggleTaskCollapse, isReadOnly, onMoveTask
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    
    // Check if it's a task ID (simple string) or subtask (complex string with colons)
    if (taskId && !taskId.includes(':')) {
        // If dropped on the column background, append to the end
        onMoveTask(taskId, status, tasks.length);
    }
  };

  return (
    <div 
      className={`bg-gray-50 rounded-lg shadow-inner p-4 h-full transition-colors ${isDragOver ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
        {title}
        <span className="text-sm font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </h2>
      <div className="space-y-4">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index} // Pass index for reordering
            project={projects.find(p => p.id === task.projectId)}
            user={users.find(u => u.id === task.responsibleId)}
            users={users}
            messages={messages}
            onUpdateTask={onUpdateTask}
            onGenerateSubtasks={onGenerateSubtasks}
            onDeleteTask={onDeleteTask}
            highlightedTaskId={highlightedTaskId}
            onNavigateToTaskMessages={onNavigateToTaskMessages}
            isCollapsed={collapsedTaskIds.has(task.id)}
            onToggleCollapse={() => onToggleTaskCollapse(task.id)}
            isReadOnly={isReadOnly}
            onMoveTask={onMoveTask}
            status={status}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg pointer-events-none">
            No hay tareas aquí
          </div>
        )}
      </div>
    </div>
  );
};