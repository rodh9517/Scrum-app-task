import React, { useState, useRef, useEffect } from 'react';
import { Task, Project, User, Message, Subtask } from '../types';
import { PlusCircleIcon, MagicIcon, TrashIcon, UserCircleIcon, ChatBubbleIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface TaskCardProps {
  task: Task;
  project?: Project;
  user?: User;
  users: User[];
  messages: Message[];
  onUpdateTask: (task: Task) => void;
  onGenerateSubtasks: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  highlightedTaskId?: string | null;
  onNavigateToTaskMessages: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, project, user, users, messages, onUpdateTask, onGenerateSubtasks, onDeleteTask, highlightedTaskId, onNavigateToTaskMessages }) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);

  const dragSubtaskIndex = useRef<number | null>(null);
  const [dragOverSubtaskIndex, setDragOverSubtaskIndex] = useState<number | null>(null);
  const [draggingSubtask, setDraggingSubtask] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const addSubtaskFormRef = useRef<HTMLFormElement>(null);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const messageCountForTask = messages.filter(m => m.taskId === task.id).length;

  useEffect(() => {
    if (highlightedTaskId === task.id && cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedTaskId, task.id]);

  useEffect(() => {
    if (!isAddingSubtask) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (addSubtaskFormRef.current && !addSubtaskFormRef.current.contains(event.target as Node)) {
        setIsAddingSubtask(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddingSubtask]);


  const handleSubtaskChange = (index: number) => {
    const newSubtasks = [...task.subtasks];
    newSubtasks[index].completed = !newSubtasks[index].completed;
    onUpdateTask({ ...task, subtasks: newSubtasks });
  };
  
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskText.trim()) {
      const newSubtask: Subtask = { id: `sub-${Date.now()}`, text: newSubtaskText, completed: false };
      onUpdateTask({ ...task, subtasks: [...task.subtasks, newSubtask] });
      setNewSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = (indexToDelete: number) => {
    const newSubtasks = task.subtasks.filter((_, index) => index !== indexToDelete);
    onUpdateTask({ ...task, subtasks: newSubtasks });
  };

  const handleGenerateSubtasks = async () => {
    setIsGenerating(true);
    await onGenerateSubtasks(task.id);
    setIsGenerating(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({ ...task, responsibleId: e.target.value });
    setShowUserSelect(false);
  };

  const handleSubtaskDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    dragSubtaskIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `subtask:${task.id}:${index}`);
    setTimeout(() => {
      setDraggingSubtask(index);
    }, 0);
  };

  const handleSubtaskDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSubtaskIndex.current !== null && dragSubtaskIndex.current !== index) {
      setDragOverSubtaskIndex(index);
    }
  };
  
  const handleSubtaskDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverSubtaskIndex(null);
  };
  
  const handleSubtaskDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragSubtaskIndex.current === null || dragSubtaskIndex.current === dropIndex) {
      return;
    }
    
    const dragIndex = dragSubtaskIndex.current;
    const newSubtasks = [...task.subtasks];
    const [draggedItem] = newSubtasks.splice(dragIndex, 1);
    newSubtasks.splice(dropIndex, 0, draggedItem);
    
    onUpdateTask({ ...task, subtasks: newSubtasks });
  };
  
  const handleSubtaskDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggingSubtask(null);
    dragSubtaskIndex.current = null;
    setDragOverSubtaskIndex(null);
  };

  return (
    <div 
      ref={cardRef}
      className={`
        bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg 
        transition-all duration-300 ease-in-out cursor-grab
        ${isDragging ? 'rotate-3 scale-105 shadow-xl opacity-80' : ''}
        ${highlightedTaskId === task.id ? 'ring-2 ring-offset-2 ring-[#D85929] shadow-orange-200' : ''}
      `}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-800 pr-2">{task.title}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {project && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: `${project.color}33`, color: project.color }}
            >
              {project.name}
            </span>
          )}
          <button
            onClick={() => {
              if (window.confirm(`¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`)) {
                onDeleteTask(task.id);
              }
            }}
            className="text-gray-400 hover:text-red-600"
            aria-label={`Eliminar tarea ${task.title}`}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{task.description}</p>
      
      {totalSubtasks > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-xs font-semibold text-gray-500">Subtareas</h4>
            <span className="text-xs text-gray-500">{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-[#254467] h-1.5 rounded-full" 
              style={{ width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pr-1">
            {task.subtasks.map((subtask, index) => {
              return (
              <div 
                key={subtask.id} 
                className={`relative flex items-start justify-between gap-2 text-sm text-gray-700 group cursor-move rounded-md p-1 transition-opacity ${draggingSubtask === index ? 'opacity-40 bg-gray-100' : 'opacity-100'}`}
                draggable
                onDragStart={(e) => handleSubtaskDragStart(e, index)}
                onDragOver={(e) => handleSubtaskDragOver(e, index)}
                onDragLeave={handleSubtaskDragLeave}
                onDrop={(e) => handleSubtaskDrop(e, index)}
                onDragEnd={handleSubtaskDragEnd}
              >
                {dragOverSubtaskIndex === index && dragSubtaskIndex.current !== index && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-[#254467] rounded-full" />
                )}
                <label className="flex items-start gap-2 cursor-move flex-grow min-w-0">
                  <input 
                    type="checkbox" 
                    checked={subtask.completed} 
                    onChange={() => handleSubtaskChange(index)}
                    className="w-4 h-4 rounded text-[#254467] focus:ring-[#3F6183] flex-shrink-0 mt-0.5"
                  />
                  <span className={`break-words ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                    {subtask.text}
                  </span>
                </label>
                <div className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => handleDeleteSubtask(index)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      aria-label={`Eliminar subtarea ${subtask.text}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t pt-3 flex justify-between items-center">
        <div className="flex-grow">
          {isAddingSubtask ? (
            <form ref={addSubtaskFormRef} onSubmit={handleAddSubtask} className="flex gap-2">
              <input 
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                placeholder="Nueva subtarea..."
                className="w-full text-sm bg-gray-100 border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-[#254467] focus:border-[#254467]"
                autoFocus
              />
              <button type="submit" className="px-2 py-1 text-xs bg-[#254467] text-white rounded-md hover:bg-[#3F6183]">Añadir</button>
            </form>
          ) : (
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsAddingSubtask(true)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#254467] font-medium"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  Añadir subtarea
                </button>
                <button
                    onClick={handleGenerateSubtasks}
                    disabled={isGenerating}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 disabled:cursor-wait"
                    title="Generar subtareas con IA"
                >
                    <MagicIcon className="w-4 h-4" />
                    {isGenerating ? 'Generando...' : 'Sugerir'}
                </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
            {messageCountForTask > 0 && (
              <button
                onClick={() => onNavigateToTaskMessages(task.id)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#D85929] transition-colors"
                title={`Ver ${messageCountForTask} mensajes vinculados`}
                aria-label={`Ver ${messageCountForTask} mensajes vinculados a la tarea ${task.title}`}
              >
                  <ChatBubbleIcon className="w-5 h-5"/>
                  <span>{messageCountForTask}</span>
              </button>
            )}
            {showUserSelect ? (
                <select
                    value={task.responsibleId}
                    onChange={handleUserChange}
                    onBlur={() => setShowUserSelect(false)}
                    className="text-sm bg-gray-100 border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-[#254467] focus:border-[#254467]"
                    autoFocus
                >
                    <option value="" disabled>Reasignar...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            ) : (
                <button onClick={() => setShowUserSelect(true)} className="p-1 rounded-full hover:bg-gray-100">
                    {user ? <UserAvatar user={user} /> : <UserCircleIcon className="w-8 h-8 text-gray-400" />}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};