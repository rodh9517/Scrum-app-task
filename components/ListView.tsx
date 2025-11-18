import React, { useMemo, useState } from 'react';
import { Task, Project, User } from '../types';
import { UserAvatar } from './UserAvatar';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onUpdateTask: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({ tasks, projects, users, onUpdateTask }) => {
  const [sortField, setSortField] = useState<keyof Task | 'projectName' | 'userName'>('title');
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
      } else {
        valA = a[sortField as keyof Task];
        valB = b[sortField as keyof Task];
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection, projectMap, userMap]);

  const handleSort = (field: keyof Task | 'projectName' | 'userName') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('title')}>
              Título <SortIndicator field="title" />
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('projectName')}>
              Proyecto <SortIndicator field="projectName" />
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('userName')}>
              Responsable <SortIndicator field="userName" />
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('status')}>
              Estado <SortIndicator field="status" />
            </th>
            <th scope="col" className="px-6 py-3">
              Subtareas
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map(task => {
            const project = projectMap[task.projectId];
            const user = userMap[task.responsibleId];
            const completedSubtasks = task.subtasks.filter(st => st.completed).length;

            return (
              <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  {task.title}
                </td>
                <td className="px-6 py-4">
                  {project && <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${project.color}33`, color: project.color }}>{project.name}</span>}
                </td>
                <td className="px-6 py-4">
                  {user && (
                    <div className="flex items-center gap-2">
                       <UserAvatar user={user} size="small" />
                       {user.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">{task.status}</td>
                <td className="px-6 py-4">
                  {task.subtasks.length > 0 ? (
                    <span>{completedSubtasks} / {task.subtasks.length}</span>
                  ) : (
                    <span>N/A</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};