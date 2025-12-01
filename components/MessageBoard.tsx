
import React, { useState, useMemo } from 'react';
import { Message, User, Task, Project, TaskStatus } from '../types';
import { TrashIcon, LinkIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { timeAgo } from '../utils/time';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface MessageBoardProps {
  messages: Message[];
  users: User[];
  tasks: Task[];
  projects: Project[];
  onAddMessage: (text: string, taskId?: string) => void;
  onUpdateMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onNavigateToTask: (taskId: string) => void;
  focusedTaskId: string | null;
  onClearFocus: () => void;
  currentUser: UserProfile | null;
  isReadOnly?: boolean;
}

// --- MessageCard Component ---
interface MessageCardProps {
  message: Message;
  user?: User;
  task?: Task;
  project?: Project;
  onUpdate: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onNavigateToTask: (taskId: string) => void;
  isCurrentUser: boolean;
  isReadOnly?: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, user, task, project, onUpdate, onDelete, onNavigateToTask, isCurrentUser, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  
  const cardColor = user ? `${user.avatarColor}30` : '#E5E7EB';

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate({ ...message, text: editText });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
      onDelete(message.id);
    }
  };

  return (
    <div 
      className="rounded-lg shadow-md p-4 flex flex-col justify-between"
      style={{ backgroundColor: cardColor, minHeight: '180px' }}
    >
      <div className="flex-grow flex flex-col">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-full bg-white bg-opacity-70 border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-1 focus:ring-[#254467] focus:border-[#254467] resize-none"
            rows={4}
            autoFocus
          />
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap flex-grow">{message.text}</p>
        )}
        
        {!isEditing && task && project && (
          <button
            onClick={() => onNavigateToTask(task.id)}
            className="mt-auto pt-3 flex items-center gap-2 text-left hover:bg-black hover:bg-opacity-5 rounded-md p-1 -m-1 transition-colors"
          >
            <LinkIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-semibold text-gray-600">Vinculado a: </span>
              <span style={{ color: project.color }} className="font-bold" title={task.title}>
                {task.title}
              </span>
            </div>
          </button>
        )}
      </div>


      <div className="border-t mt-3 pt-2">
        {isEditing ? (
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="text-xs font-semibold text-gray-600 hover:text-gray-800">Cancelar</button>
            <button onClick={handleSave} className="text-xs font-semibold text-[#254467] hover:text-[#3F6183]">Guardar</button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size="small" />
              <div>
                <p className="text-xs font-bold text-gray-700">{user?.name || 'Desconocido'}</p>
                <p className="text-xs text-gray-500">{timeAgo(message.createdAt)}</p>
              </div>
            </div>
            {isCurrentUser && !isReadOnly && (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-gray-600 hover:text-[#254467]">Editar</button>
              <button onClick={handleDelete} className="text-gray-500 hover:text-red-600" aria-label="Eliminar mensaje">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// --- AddMessageForm Component ---
interface AddMessageFormProps {
  tasks: Task[];
  onAddMessage: (text: string, taskId?: string) => void;
}

const AddMessageForm: React.FC<AddMessageFormProps> = ({ tasks, onAddMessage }) => {
  const [text, setText] = useState('');
  const [taskId, setTaskId] = useState('');

  const linkableTasks = useMemo(() => {
    return tasks
        .filter(task => task.status !== TaskStatus.Done)
        .sort((a,b) => a.title.localeCompare(b.title));
  }, [tasks]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddMessage(text, taskId || undefined);
      setText('');
      setTaskId('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-3">Dejar un mensaje</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu nota aquí..."
          className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
          rows={3}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="sm:col-span-1">
                <label htmlFor="linkedTask" className="block text-sm font-medium text-gray-700 mb-1">Vincular a Tarea (Opcional)</label>
                <select
                    id="linkedTask"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                >
                    <option value="">Ninguna</option>
                    {linkableTasks.map(task => (
                        <option key={task.id} value={task.id}>{task.title}</option>
                    ))}
                </select>
            </div>
            <div className="sm:col-span-1 flex justify-end">
                <button
                    type="submit"
                    className="px-4 py-2 bg-[#D85929] hover:bg-[#C0481A] text-white font-semibold rounded-md transition-colors w-full sm:w-auto"
                >
                    Publicar Mensaje
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};


// --- Main MessageBoard Component ---
export const MessageBoard: React.FC<MessageBoardProps> = ({ messages, users, tasks, projects, onAddMessage, onUpdateMessage, onDeleteMessage, onNavigateToTask, focusedTaskId, onClearFocus, currentUser, isReadOnly }) => {
  const userMap = useMemo(() => 
    users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, User>), 
  [users]);

  const projectMap = useMemo(() =>
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>),
  [projects]);

  const taskDetailsMap = useMemo(() => {
    const map = new Map<string, { task: Task, project: Project }>();
    for (const task of tasks) {
        const project = projectMap[task.projectId];
        if (project) {
            map.set(task.id, { task, project });
        }
    }
    return map;
  }, [tasks, projectMap]);

  const displayedMessages = useMemo(() => {
    if (focusedTaskId) {
      return messages.filter(m => m.taskId === focusedTaskId);
    }
    return messages;
  }, [messages, focusedTaskId]);

  const focusedTask = focusedTaskId ? tasks.find(t => t.id === focusedTaskId) : null;


  return (
    <div>
      {!isReadOnly && <AddMessageForm tasks={tasks} onAddMessage={onAddMessage} />}

      {focusedTask && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-3 rounded-md flex justify-between items-center">
          <p className="text-sm text-blue-800">
            Mostrando mensajes vinculados a la tarea: <span className="font-bold">{focusedTask.title}</span>
          </p>
          <button onClick={onClearFocus} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Mostrar todos
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {displayedMessages.map(message => {
            const details = message.taskId ? taskDetailsMap.get(message.taskId) : undefined;
            return (
                <MessageCard
                    key={message.id}
                    message={message}
                    user={userMap[message.userId]}
                    task={details?.task}
                    project={details?.project}
                    onUpdate={onUpdateMessage}
                    onDelete={onDeleteMessage}
                    onNavigateToTask={onNavigateToTask}
                    isCurrentUser={currentUser?.sub === message.userId}
                    isReadOnly={isReadOnly}
                />
            );
        })}
         {displayedMessages.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-16 border-2 border-dashed border-gray-300 rounded-lg">
            {focusedTaskId ? 'No hay mensajes vinculados a esta tarea.' : (isReadOnly ? 'No hay mensajes en la pizarra.' : 'La pizarra está vacía. ¡Sé el primero en dejar un mensaje!')}
          </div>
        )}
      </div>
    </div>
  );
};
