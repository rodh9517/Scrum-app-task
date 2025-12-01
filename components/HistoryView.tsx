
import React from 'react';
import { Task, Project, User, TaskStatus } from '../types';
import { ArchiveBoxArrowDownIcon, CheckCircleIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface HistoryViewProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onRestoreTask: (taskId: string) => void;
  isReadOnly?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tasks, projects, users, onRestoreTask, isReadOnly }) => {
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

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <ArchiveBoxArrowDownIcon className="w-8 h-8 text-gray-600" />
                Histórico de Tareas
            </h1>
            <p className="text-gray-600">
                Registro de tareas completadas y archivadas. Estas tareas siguen contando para el análisis de rendimiento con IA, pero no afectan las métricas activas ni el desglose por proyecto.
            </p>
       </div>

       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
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
                                
                                return (
                                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                            {task.description && <span className="text-xs text-gray-500 truncate max-w-xs">{task.description}</span>}
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
                                                onClick={() => onRestoreTask(task.id)}
                                                className="text-gray-400 hover:text-green-600 flex items-center gap-1 justify-end w-full"
                                                title="Restaurar al tablero (Hecho)"
                                            >
                                                <span className="text-xs">Restaurar</span>
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
