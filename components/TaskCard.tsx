
import React, { useState, useRef, useEffect } from 'react';
import { Task, Project, User, Message, Subtask, TaskStatus, TaskPriority, TaskDuration } from '../types';
import { PlusCircleIcon, MagicIcon, TrashIcon, UserCircleIcon, ChatBubbleIcon, PencilIcon, CheckIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { PRIORITY_COLORS, PRIORITY_WEIGHTS, DURATION_WEIGHTS } from '../constants';

interface TaskCardProps {
  task: Task;
  index: number; // New prop for reordering
  project?: Project;
  user?: User;
  users: User[];
  messages: Message[];
  onUpdateTask: (task: Task) => void;
  onGenerateSubtasks: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  highlightedTaskId?: string | null;
  onNavigateToTaskMessages: (taskId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isReadOnly?: boolean;
  onMoveTask?: (taskId: string, newStatus: TaskStatus, newIndex: number) => void; // New prop
  status?: TaskStatus; // To know which column we are in
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, index, project, user, users, messages, onUpdateTask, onGenerateSubtasks, onDeleteTask, highlightedTaskId, onNavigateToTaskMessages,
  isCollapsed, onToggleCollapse, isReadOnly, onMoveTask, status
}) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false); // For visual feedback when hovering over card
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUserSelect, setShowUserSelect] = useState(false);
  
  // State for editing main task details
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);

  // State for Priority and Duration Dropdowns
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDurationMenu, setShowDurationMenu] = useState(false);

  // State for editing existing subtasks
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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
    if (isReadOnly) return;
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

  const startEditing = (subtask: Subtask) => {
    if (isReadOnly) return;
    setEditingSubtaskId(subtask.id);
    setEditingText(subtask.text);
  };

  const saveEditing = (subtaskId: string) => {
    if (editingText.trim()) {
      const newSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, text: editingText.trim() } : st
      );
      onUpdateTask({ ...task, subtasks: newSubtasks });
    }
    setEditingSubtaskId(null);
    setEditingText('');
  };

  const cancelEditing = () => {
    setEditingSubtaskId(null);
    setEditingText('');
  };

  // Main Task Editing Functions
  const startTaskEditing = () => {
    if (isReadOnly) return;
    setEditTitle(task.title);
    setEditDescription(task.description);
    setIsEditingTask(true);
  };

  const saveTaskEditing = () => {
    if (editTitle.trim()) {
        onUpdateTask({ ...task, title: editTitle, description: editDescription });
    }
    setIsEditingTask(false);
  };

  const cancelTaskEditing = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setIsEditingTask(false);
  };

  const handleGenerateSubtasks = async () => {
    setIsGenerating(true);
    await onGenerateSubtasks(task.id);
    setIsGenerating(false);
  };

  // MAIN TASK DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly) {
        e.preventDefault();
        return;
    }
    if (editingSubtaskId || isEditingTask || showPriorityMenu || showDurationMenu) {
       e.preventDefault();
       return;
    }
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      if (isReadOnly) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent Column from catching it
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      if (isReadOnly) return;
      e.preventDefault();
      e.stopPropagation(); // Important: Stop bubbling to column
      setIsDragOver(false);

      const droppedTaskId = e.dataTransfer.getData('text/plain');
      
      // If droppedTaskId doesn't contain ':', it's a main task
      if (droppedTaskId && !droppedTaskId.includes(':') && onMoveTask && status) {
          if (droppedTaskId !== task.id) {
              // Insert dropped task BEFORE the current task (at current index)
              onMoveTask(droppedTaskId, status, index);
          }
      }
  };


  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({ ...task, responsibleId: e.target.value });
    setShowUserSelect(false);
  };

  // SUBTASK DRAG HANDLERS
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

  // Priority Update
  const updatePriority = (newPriority: TaskPriority) => {
      onUpdateTask({ ...task, priority: newPriority });
      setShowPriorityMenu(false);
  };

  // Duration Update
  const updateDuration = (newDuration: TaskDuration) => {
      onUpdateTask({ ...task, duration: newDuration });
      setShowDurationMenu(false);
  };


  const priority = task.priority || 'Baja';
  const priorityColor = PRIORITY_COLORS[priority];
  const duration = task.duration || '1 día';

  return (
    <div 
      ref={cardRef}
      className={`
        bg-white rounded-lg shadow-md p-4 border transition-all duration-300 ease-in-out relative
        ${isDragOver ? 'border-t-4 border-t-[#D85929] border-b border-l border-r border-gray-200' : 'border-gray-200'}
        ${isDragging ? 'rotate-3 scale-105 shadow-xl opacity-80' : 'hover:shadow-lg'}
        ${highlightedTaskId === task.id ? 'ring-2 ring-offset-2 ring-[#D85929] shadow-orange-200' : ''}
        ${!isEditingTask && !isReadOnly ? 'cursor-grab' : ''}
        ${isReadOnly ? 'opacity-90' : ''}
      `}
      draggable={!isEditingTask && !isReadOnly && !showPriorityMenu && !showDurationMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* HEADER: Title, Project, Delete/Edit Actions */}
      <div className="flex justify-between items-start mb-2 gap-2">
        {isEditingTask ? (
            <input 
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full font-bold text-gray-800 bg-gray-50 border border-[#254467] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#254467]"
                autoFocus
            />
        ) : (
            <h3 
                className={`font-bold text-gray-800 pr-2 flex-grow ${!isReadOnly ? 'cursor-text' : ''}`}
                onDoubleClick={startTaskEditing}
                title={!isReadOnly ? "Doble clic para editar" : ""}
            >
                {task.title}
            </h3>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isEditingTask && project && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: `${project.color}33`, color: project.color }}
            >
              {project.name}
            </span>
          )}
          
          {isEditingTask ? (
             <div className="flex items-center gap-1">
                 <button onClick={saveTaskEditing} className="text-green-600 hover:text-green-800 p-1" title="Guardar">
                    <CheckIcon className="w-5 h-5" />
                 </button>
                 <button onClick={cancelTaskEditing} className="text-gray-400 hover:text-gray-600 p-1" title="Cancelar">
                    <XMarkIcon className="w-5 h-5" />
                 </button>
             </div>
          ) : (
             <>
                 {!isReadOnly && (
                    <button
                        onClick={startTaskEditing}
                        className="text-gray-400 hover:text-[#254467] p-0.5"
                        aria-label={`Editar tarea ${task.title}`}
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                 )}
                 {!isReadOnly && (
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-600 p-0.5"
                    aria-label={`Eliminar tarea ${task.title}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                 )}
                  <button 
                    onClick={onToggleCollapse} 
                    className="text-gray-400 hover:text-[#254467] p-0.5"
                    aria-label={isCollapsed ? "Expandir tarea" : "Colapsar tarea"}
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                  >
                    {isCollapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
                  </button>
             </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
            {/* TAGS ROW: Priority & Duration (Interactive) */}
            <div className="flex flex-wrap items-center gap-2 mb-2 relative z-0">
                
                {/* Priority Selector */}
                <div className="relative">
                    <button
                        onClick={() => !isReadOnly && setShowPriorityMenu(!showPriorityMenu)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all ${!isReadOnly ? 'hover:brightness-95 cursor-pointer shadow-sm hover:shadow' : 'cursor-default'}`}
                        style={{ color: priorityColor, borderColor: priorityColor, backgroundColor: `${priorityColor}10` }}
                        title={!isReadOnly ? "Clic para cambiar prioridad" : ""}
                    >
                        {priority.toUpperCase()}
                    </button>
                    {showPriorityMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowPriorityMenu(false)}></div>
                            <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-xl z-20 py-1 flex flex-col animate-fade-in">
                                {(Object.keys(PRIORITY_WEIGHTS) as TaskPriority[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => updatePriority(p)}
                                        className="text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p]}}></span>
                                        <span className={`${p === priority ? 'font-bold' : 'font-medium'} text-gray-700`}>{p}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Duration Selector */}
                <div className="relative">
                    <button
                         onClick={() => !isReadOnly && setShowDurationMenu(!showDurationMenu)}
                         className={`text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1 transition-all ${!isReadOnly ? 'hover:bg-gray-200 cursor-pointer shadow-sm hover:shadow' : 'cursor-default'}`}
                         title={!isReadOnly ? "Clic para cambiar duración estimada" : ""}
                    >
                        <span>⏱ {duration}</span>
                    </button>
                     {showDurationMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDurationMenu(false)}></div>
                            <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-xl z-20 py-1 flex flex-col animate-fade-in">
                                {(Object.keys(DURATION_WEIGHTS) as TaskDuration[]).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateDuration(d)}
                                        className={`text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700 ${d === duration ? 'font-bold bg-gray-50' : 'font-medium'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

          {/* DESCRIPTION */}
          <div className="mb-4">
              {isEditingTask ? (
                  <textarea 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-sm text-gray-600 bg-gray-50 border border-[#254467] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#254467] resize-y min-h-[60px]"
                    placeholder="Añade una descripción más detallada..."
                  />
              ) : (
                  <p 
                    className={`text-sm text-gray-600 min-h-[20px] ${!isReadOnly ? 'cursor-text' : ''}`}
                    onDoubleClick={startTaskEditing}
                    title={!isReadOnly ? "Doble clic para editar" : ""}
                  >
                    {task.description || <span className="italic text-gray-400">Sin descripción...</span>}
                  </p>
              )}
          </div>
          
          {/* SUBTASKS SECTION */}
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
                  const isEditing = editingSubtaskId === subtask.id;
                  return (
                  <div 
                    key={subtask.id} 
                    className={`relative flex items-start justify-between gap-2 text-sm text-gray-700 group rounded-md p-1 transition-opacity ${draggingSubtask === index ? 'opacity-40 bg-gray-100' : 'opacity-100'} ${isEditing ? '' : (isReadOnly ? '' : 'cursor-move')}`}
                    draggable={!isEditing && !isEditingTask && !isReadOnly}
                    onDragStart={(e) => !isEditing && !isEditingTask && !isReadOnly && handleSubtaskDragStart(e, index)}
                    onDragOver={(e) => !isReadOnly && handleSubtaskDragOver(e, index)}
                    onDragLeave={(e) => !isReadOnly && handleSubtaskDragLeave(e)}
                    onDrop={(e) => !isReadOnly && handleSubtaskDrop(e, index)}
                    onDragEnd={(e) => !isReadOnly && handleSubtaskDragEnd(e)}
                  >
                    {dragOverSubtaskIndex === index && dragSubtaskIndex.current !== index && !isReadOnly && (
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-[#254467] rounded-full" />
                    )}
                    
                    {isEditing ? (
                        <div className="flex-grow ml-6">
                            <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={() => saveEditing(subtask.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing(subtask.id);
                                    if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                                className="w-full text-sm bg-white border border-[#254467] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#254467]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            />
                        </div>
                    ) : (
                        <label className={`flex items-start gap-2 flex-grow min-w-0 group/label ${!isReadOnly ? 'cursor-pointer' : ''}`}>
                            <input 
                                type="checkbox" 
                                checked={subtask.completed} 
                                onChange={() => handleSubtaskChange(index)}
                                disabled={isReadOnly}
                                className="w-4 h-4 rounded text-[#254467] focus:ring-[#3F6183] flex-shrink-0 mt-0.5"
                            />
                            <span 
                                className={`break-words ${subtask.completed ? 'line-through text-gray-500' : ''} hover:text-[#254467]`}
                                onDoubleClick={() => startEditing(subtask)}
                                title={!isReadOnly ? "Doble clic para editar" : ""}
                            >
                                {subtask.text}
                            </span>
                        </label>
                    )}

                    <div className={`flex items-center flex-shrink-0 ${isEditing ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        {!isEditing && !isReadOnly && (
                             <button
                                onClick={() => startEditing(subtask)}
                                className="text-gray-400 hover:text-[#254467] mr-1"
                                aria-label="Editar subtarea"
                                title="Editar"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        )}
                        {!isReadOnly && (
                            <button
                            onClick={() => handleDeleteSubtask(index)}
                            className="text-gray-400 hover:text-red-600 ml-1"
                            aria-label={`Eliminar subtarea ${subtask.text}`}
                            title="Eliminar"
                            >
                            <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* FOOTER: Add Subtask, AI, Messages, User */}
      <div className={`flex justify-between items-center ${!isCollapsed ? 'border-t pt-3' : 'mt-2'}`}>
        <div className="flex-grow">
          {!isCollapsed && !isReadOnly && (
            <>
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
            </>
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
            
            {/* User Assignment Logic */}
            {showUserSelect && !isReadOnly ? (
                <select
                    value={task.responsibleId}
                    onChange={handleUserChange}
                    onBlur={() => setShowUserSelect(false)}
                    className="text-sm bg-gray-100 border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-[#254467] focus:border-[#254467]"
                    autoFocus
                    title="Cambiar responsable"
                >
                    <option value="" disabled>Reasignar...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            ) : (
                <button 
                    onClick={() => !isReadOnly && setShowUserSelect(true)} 
                    className={`p-1 rounded-full hover:bg-gray-100 relative group ${isReadOnly ? 'cursor-default' : ''}`}
                    title={`Responsable: ${user ? user.name : 'Sin asignar'} ${!isReadOnly ? '(Clic para cambiar)' : ''}`}
                >
                    {user ? <UserAvatar user={user} /> : <UserCircleIcon className="w-8 h-8 text-gray-400" />}
                    {/* Helper tooltip for user assignment */}
                    {!isReadOnly && (
                        <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] px-2 py-1 rounded">
                            Cambiar responsable
                        </span>
                    )}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
