
import React, { useMemo, useState } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority, TaskDuration } from '../types';
import { UserAvatar } from './UserAvatar';
import { PRIORITY_WEIGHTS, DURATION_WEIGHTS, PRIORITY_COLORS } from '../constants';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onUpdateTask: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({ tasks, projects, users, onUpdateTask }) => {
  const [sortField, setSortField] = useState<keyof Task | 'projectName' | 'userName' | 'priorityWeight' | 'durationWeight'>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const projectMap = useMemo(() => 
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Project>), 
  [projects]);

  const userMap = useMemo(() => 
    users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, User>), 
  [users]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let valA: any, valB: any;
      
      if (sortField === 'projectName') {
        valA = projectMap[a.projectId]?.name || '';
        valB = projectMap[b.projectId]?.name || '';
      } else if (sortField === 'userName') {
        valA = userMap[a.responsibleId]?.name || '';
        valB = userMap[b.responsibleId]?.name || '';
      } else if (sortField === 'priorityWeight') {
         // Sort by priority weight
         valA = PRIORITY_WEIGHTS[a.priority || 'Baja'];
         valB = PRIORITY_WEIGHTS[b.priority || 'Baja'];
      } else if (sortField === 'durationWeight') {
         // Sort by duration weight
         valA = DURATION_WEIGHTS[a.duration || '1 día'];
         valB = DURATION_WEIGHTS[b.duration || '1 día'];
      } else {
        valA = a[sortField as keyof Task];
        valB = b[sortField as keyof Task];
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection, projectMap, userMap]);

  const handleSort = (field: keyof Task | 'projectName' | 'userName' | 'priorityWeight' | 'durationWeight') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="opacity-0 group-hover:opacity-30 ml-1 text-xs">↕</span>;
    return <span className="ml-1 text-[#D85929] font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const getStatusStyles = (status: TaskStatus) => {
      switch (status) {
          case TaskStatus.Done: return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
          case TaskStatus.InProgress: return 'bg-blue-50 text-blue-700 ring-blue-700/10';
          case TaskStatus.ToDo: return 'bg-amber-50 text-amber-700 ring-amber-600/20';
          default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* --- DESKTOP VIEW (Table) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              {[
                { id: 'title', label: 'Tarea / Descripción', width: 'w-[30%]' },
                { id: 'projectName', label: 'Proyecto', width: 'w-[12%]' },
                { id: 'priorityWeight', label: 'Prioridad', width: 'w-[10%]' },
                { id: 'durationWeight', label: 'Duración', width: 'w-[10%]' },
                { id: 'userName', label: 'Responsable', width: 'w-[15%]' },
                { id: 'status', label: 'Estado', width: 'w-[10%]' },
                { id: 'subtasks', label: 'Progreso', width: 'w-[13%]' }
              ].map((header) => (
                 <th 
                  key={header.id}
                  scope="col" 
                  className={`px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider group cursor-pointer select-none ${header.width} ${header.id === 'subtasks' ? 'cursor-default' : 'hover:bg-gray-100'}`}
                  onClick={header.id !== 'subtasks' ? () => handleSort(header.id as any) : undefined}
                 >
                    <div className="flex items-center truncate">
                      {header.label}
                      {header.id !== 'subtasks' && <SortIndicator field={header.id} />}
                    </div>
                 </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map(task => {
              const project = projectMap[task.projectId];
              const user = userMap[task.responsibleId];
              const completedSubtasks = task.subtasks.filter(st => st.completed).length;
              const totalSubtasks = task.subtasks.length;
              const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
              const priority = task.priority || 'Baja';
              const duration = task.duration || '1 día';
              const pColor = PRIORITY_COLORS[priority];

              return (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                  {/* Title & Description - Allows wrapping */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col w-full">
                        <span className="text-sm font-bold text-gray-900 break-words leading-snug">{task.title}</span>
                        <span className="text-xs text-gray-500 mt-1 break-words leading-relaxed">
                            {task.description || <span className="italic opacity-70">Sin descripción</span>}
                        </span>
                    </div>
                  </td>
                  
                  {/* Project */}
                  <td className="px-4 py-4 align-top">
                    {project ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-sm whitespace-normal text-center" 
                             style={{ backgroundColor: `${project.color}10`, color: project.color, borderColor: `${project.color}20` }}>
                          {project.name}
                       </span>
                    ) : <span className="text-gray-400 text-xs">N/A</span>}
                  </td>
                  
                  {/* Priority */}
                  <td className="px-4 py-4 align-top">
                       <span 
                           className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border"
                           style={{ color: pColor, borderColor: pColor, backgroundColor: `${pColor}10` }}
                       >
                           {priority.toUpperCase()}
                       </span>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-4 align-top">
                       <span className="text-xs text-gray-600 font-medium">
                           {duration}
                       </span>
                  </td>

                  {/* Responsible */}
                  <td className="px-4 py-4 align-top">
                    {user ? (
                      <div className="flex items-center gap-2">
                         <UserAvatar user={user} size="small" />
                         <div className="flex flex-col min-w-0">
                             <span className="text-sm text-gray-700 font-medium truncate">{user.name}</span>
                             {user.email && <span className="text-[10px] text-gray-400 truncate">{user.email}</span>}
                         </div>
                      </div>
                    ) : <span className="text-gray-400 text-xs">Sin asignar</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 align-top">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold ring-1 ring-inset shadow-sm whitespace-nowrap ${getStatusStyles(task.status)}`}>
                          {task.status}
                      </span>
                  </td>

                  {/* Subtasks / Progress */}
                  <td className="px-4 py-4 align-top">
                    <div className="w-full">
                      <div className="flex justify-between text-xs mb-1.5">
                           <span className="text-gray-600 font-bold">{completedSubtasks}/{totalSubtasks}</span>
                           <span className="text-gray-500 font-medium">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                          <div 
                              className="h-full rounded-full transition-all duration-500 ease-out shadow-sm" 
                              style={{ 
                                  width: `${progress}%`, 
                                  backgroundColor: progress === 100 ? '#10B981' : (progress > 0 ? '#254467' : 'transparent')
                              }}
                          />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (Compact Cards) --- */}
      <div className="md:hidden divide-y divide-gray-100">
        {sortedTasks.map(task => {
          const project = projectMap[task.projectId];
          const user = userMap[task.responsibleId];
          const completedSubtasks = task.subtasks.filter(st => st.completed).length;
          const totalSubtasks = task.subtasks.length;
          const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
          const priority = task.priority || 'Baja';
          const pColor = PRIORITY_COLORS[priority];

          return (
            <div key={task.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
              {/* Line 1: Task Title & Priority */}
              <div className="flex justify-between items-start gap-2">
                 <h3 className="text-sm font-bold text-gray-900 leading-tight">{task.title}</h3>
                 <span 
                    className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border"
                    style={{ color: pColor, borderColor: pColor, backgroundColor: `${pColor}10` }}
                >
                    {priority[0].toUpperCase()}
                </span>
              </div>

              {/* Line 2: Project & Duration */}
              <div className="flex items-center gap-2">
                 {project ? (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border"
                          style={{ backgroundColor: `${project.color}10`, color: project.color, borderColor: `${project.color}20` }}>
                       {project.name.toUpperCase()}
                    </span>
                 ) : (
                    <span className="text-[10px] text-gray-400 font-medium">SIN PROYECTO</span>
                 )}
                 {task.duration && (
                     <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                         ⏱ {task.duration}
                     </span>
                 )}
              </div>

              {/* Line 3: Responsible */}
              <div className="flex items-center gap-3">
                 <span className="text-[10px] text-gray-500 font-semibold uppercase flex-shrink-0">Responsable:</span>
                 {user ? (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full pr-3 pl-1 py-0.5 min-w-0">
                       <UserAvatar user={user} size="small" />
                       <span className="text-xs text-gray-700 font-medium truncate">{user.name}</span>
                    </div>
                 ) : (
                    <span className="text-xs text-gray-400 italic">Sin asignar</span>
                 )}
              </div>

              {/* Line 4: Status & Progress */}
              <div className="flex items-center gap-3 pt-1">
                  <div className="flex-shrink-0">
                     <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusStyles(task.status)}`}>
                          {task.status}
                     </span>
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                      <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[9px] text-gray-400 uppercase font-bold">Progreso</span>
                          <span className="text-[10px] font-bold text-gray-600">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                              className="h-full rounded-full transition-all duration-500 ease-out" 
                              style={{ 
                                  width: `${progress}%`, 
                                  backgroundColor: progress === 100 ? '#10B981' : '#254467'
                              }}
                          />
                      </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedTasks.length === 0 && (
        <div className="px-6 py-16 text-center">
            <div className="flex flex-col items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                <p className="text-base font-medium text-gray-500">No hay tareas en esta lista.</p>
                <p className="text-sm">Intenta cambiar los filtros o añadir una nueva tarea.</p>
            </div>
        </div>
      )}
    </div>
  );
};
