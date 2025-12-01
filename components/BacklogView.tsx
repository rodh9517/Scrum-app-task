
import React, { useState } from 'react';
import { Task, Project, TaskStatus } from '../types';
import { PlusIcon, TrashIcon, CheckCircleIcon } from './Icons';

interface BacklogViewProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (task: Omit<Task, 'id' | 'subtasks' | 'createdAt' | 'completedAt' | 'responsibleId' | 'priority' | 'duration'>) => void;
  onPromoteTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  isReadOnly?: boolean;
}

export const BacklogView: React.FC<BacklogViewProps> = ({ tasks, projects, onAddTask, onPromoteTask, onDeleteTask, isReadOnly }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState(projects[0]?.id || '');

  const handleAddBacklogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProjectId) return;

    onAddTask({
      title: newTitle,
      description: '',
      projectId: newProjectId,
      status: TaskStatus.Backlog
    });
    setNewTitle('');
  };

  const projectMap = React.useMemo(() => 
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>), 
  [projects]);

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                📦 Product Backlog
            </h1>
            <p className="text-gray-600 mb-6">
                Captura ideas y requerimientos rápidamente. Las tareas aquí no afectan las métricas hasta que se formalicen y pasen al tablero principal.
            </p>

            {/* Quick Add Form */}
            {!isReadOnly && (
                <form onSubmit={handleAddBacklogItem} className="flex flex-col sm:flex-row gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex-grow w-full">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nueva Idea / Requerimiento</label>
                        <input 
                            type="text" 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Escribe el título de la tarea..."
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                            required
                        />
                    </div>
                    <div className="w-full sm:w-64">
                         <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Proyecto</label>
                         <select
                            value={newProjectId}
                            onChange={(e) => setNewProjectId(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                            required
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        type="submit" 
                        className="w-full sm:w-auto px-4 py-2 bg-[#254467] hover:bg-[#3F6183] text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Añadir
                    </button>
                </form>
            )}
       </div>

       {/* Backlog List */}
       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarea</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Proyecto</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {task.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {projectMap[task.projectId] ? (
                                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                                                style={{ backgroundColor: `${projectMap[task.projectId].color}15`, color: projectMap[task.projectId].color }}>
                                                {projectMap[task.projectId].name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">Sin proyecto</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={() => onPromoteTask(task)}
                                                    className="text-[#254467] hover:text-blue-700 flex items-center gap-1 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                                                    title="Formalizar tarea y mover al tablero"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                    Promover
                                                </button>
                                            )}
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={() => onDeleteTask(task.id)}
                                                    className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                                    title="Eliminar del backlog"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                    <p>El backlog está vacío.</p>
                                    <p className="text-sm mt-1">Añade ideas arriba para comenzar.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};
