
import React, { useState } from 'react';
import { Task, Project, User } from '../types';
import { ArchiveBoxArrowDownIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, TableCellsIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface HistoryViewProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onRestoreTask: (taskId: string) => void;
  isReadOnly?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tasks, projects, users, onRestoreTask, isReadOnly }) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const projectMap = React.useMemo(() => 
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>), 
  [projects]);

  const userMap = React.useMemo(() => 
    users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, User>), 
  [users]);

  // Sort by completedAt descending (newest first)
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [tasks]);

  const toggleExpand = (taskId: string) => {
      const newSet = new Set(expandedTaskIds);
      if (newSet.has(taskId)) {
          newSet.delete(taskId);
      } else {
          newSet.add(taskId);
      }
      setExpandedTaskIds(newSet);
  };

  const toggleAll = () => {
      if (expandedTaskIds.size === sortedTasks.length) {
          setExpandedTaskIds(new Set());
      } else {
          setExpandedTaskIds(new Set(sortedTasks.map(t => t.id)));
      }
  };

  const handleExportCSV = () => {
    // 1. Define Headers
    const headers = [
        'ID Tarea', 'Título', 'Descripción', 'Proyecto', 'Responsable', 
        'Estado', 'Prioridad', 'Duración Estimada', 'Fecha Creación', 'Fecha Completado', 'Subtareas'
    ];

    // 2. Build Rows
    const rows = sortedTasks.map(task => {
        const project = projectMap[task.projectId];
        const user = userMap[task.responsibleId];
        const subtasksStr = task.subtasks.map(s => `[${s.completed ? 'x' : ' '}] ${s.text}`).join('; ');

        return [
            task.id,
            `"${(task.title || '').replace(/"/g, '""')}"`, // Escape quotes
            `"${(task.description || '').replace(/"/g, '""')}"`,
            `"${(project?.name || 'Sin proyecto').replace(/"/g, '""')}"`,
            `"${(user?.name || 'Sin asignar').replace(/"/g, '""')}"`,
            task.status,
            task.priority || 'Baja',
            task.duration || '1 día',
            task.createdAt ? new Date(task.createdAt).toLocaleString() : '',
            task.completedAt ? new Date(task.completedAt).toLocaleString() : '',
            `"${subtasksStr.replace(/"/g, '""')}"`
        ];
    });

    // 3. Join with commas and newlines
    const csvContent = [
        headers.join(','), 
        ...rows.map(r => r.join(','))
    ].join('\n');

    // 4. Create Blob with BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 5. Trigger Download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historico_tareas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allExpanded = sortedTasks.length > 0 && expandedTaskIds.size === sortedTasks.length;

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <ArchiveBoxArrowDownIcon className="w-8 h-8 text-gray-600" />
                        Histórico de Tareas
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base">
                        Registro de tareas completadas y archivadas. Estas tareas siguen contando para el análisis de rendimiento con IA.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                     <button
                        onClick={toggleAll}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors border border-gray-300"
                        title={allExpanded ? "Colapsar todo" : "Expandir todo"}
                    >
                        {allExpanded ? <ArrowsPointingInIcon className="w-4 h-4"/> : <ArrowsPointingOutIcon className="w-4 h-4"/>}
                        <span className="hidden sm:inline">{allExpanded ? "Colapsar Todo" : "Expandir Todo"}</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                        title="Descargar Excel Completo"
                    >
                        <TableCellsIcon className="w-5 h-5" />
                        Exportar Excel
                    </button>
                </div>
            </div>
       </div>

       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarea</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Proyecto</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Responsable</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Completado</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedTasks.length > 0 ? (
                            sortedTasks.map(task => {
                                const project = projectMap[task.projectId];
                                const user = userMap[task.responsibleId];
                                const isExpanded = expandedTaskIds.has(task.id);
                                
                                return (
                                <React.Fragment key={task.id}>
                                    <tr 
                                        className={`transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => toggleExpand(task.id)}
                                    >
                                        <td className="px-4 py-4 text-gray-400">
                                            {isExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {project ? (
                                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                                                    style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                                                    {project.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Sin proyecto</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user && (
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar user={user} size="small" />
                                                    <span className="text-sm text-gray-700">{user.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onRestoreTask(task.id); }}
                                                    className="text-gray-400 hover:text-green-600 flex items-center gap-1 justify-end w-full"
                                                    title="Restaurar al tablero (Hecho)"
                                                >
                                                    <span className="text-xs">Restaurar</span>
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50 border-b border-gray-100 animate-fade-in">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="ml-8 border-l-2 border-gray-300 pl-4 space-y-3">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Descripción Completa</h4>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                            {task.description || "Sin descripción detallada."}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex gap-6 mt-2">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Prioridad</h4>
                                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-gray-200">
                                                                {task.priority || 'Baja'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Duración Est.</h4>
                                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-gray-200">
                                                                {task.duration || '1 día'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Subtareas</h4>
                                                            <span className="text-xs text-gray-600">
                                                                {task.subtasks.length > 0 
                                                                    ? `${task.subtasks.filter(s => s.completed).length} / ${task.subtasks.length} completadas` 
                                                                    : 'Sin subtareas'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {task.subtasks.length > 0 && (
                                                        <div className="mt-2">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Detalle Subtareas</h4>
                                                            <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                                                                {task.subtasks.map(sub => (
                                                                    <li key={sub.id} className={sub.completed ? 'text-green-600 line-through opacity-70' : ''}>
                                                                        {sub.text}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <p>No hay tareas en el histórico.</p>
                                    <p className="text-sm mt-1">Completa tareas y envíalas aquí desde la columna "Hecho".</p>
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
