import React, { useState } from 'react';
import { Project, User } from '../types';
import { TrashIcon, UserGroupIcon, BriefcaseIcon, UserCircleIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface AdminProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  users: User[];
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onAddUser: (name: string) => void;
  onDeleteUser: (userId: string) => void;
}

const AdminProjectsModal: React.FC<AdminProjectsModalProps> = ({ 
  isOpen, onClose, projects, users, onAddProject, onUpdateProject, onDeleteProject, onAddUser, onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'users'>('projects');
  
  // State for new project form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#4A90E2');
  const [newProjectResponsibles, setNewProjectResponsibles] = useState<string[]>([]);
  
  // State for new user form
  const [newUserName, setNewUserName] = useState('');

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  if (!isOpen) return null;

  const handleToggleNewResponsible = (userId: string) => {
    setNewProjectResponsibles(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleExistingResponsible = (project: Project, userId: string) => {
    const updatedResponsibles = project.responsibleIds.includes(userId)
      ? project.responsibleIds.filter(id => id !== userId)
      : [...project.responsibleIds, userId];
    onUpdateProject({ ...project, responsibleIds: updatedResponsibles });
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject({ 
      name: newProjectName, 
      color: newProjectColor, 
      responsibleIds: newProjectResponsibles 
    });
    setNewProjectName('');
    setNewProjectColor('#4A90E2');
    setNewProjectResponsibles([]);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    onAddUser(newUserName);
    setNewUserName('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl m-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900">Panel de Administración</h2>
        
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'projects' ? 'border-[#254467] text-[#254467]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <BriefcaseIcon className="w-5 h-5" /> Proyectos
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'users' ? 'border-[#254467] text-[#254467]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <UserCircleIcon className="w-5 h-5" /> Responsables
            </button>
          </nav>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 150px)'}}>
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Proyectos Actuales</h3>
                <div className="space-y-3 pr-2">
                  {projects.map(p => (
                    <div key={p.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) => onUpdateProject({ ...p, color: e.target.value })}
                            className="w-8 h-8 p-0 border-none rounded cursor-pointer"
                            aria-label={`Cambiar color para ${p.name}`}
                          />
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {p.responsibleIds.map(id => userMap[id] && <UserAvatar key={id} user={userMap[id]} />)}
                          </div>
                          <button 
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de que quieres eliminar el proyecto "${p.name}"? Esta acción también eliminará todas las tareas asociadas.`)) {
                                onDeleteProject(p.id);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                            aria-label={`Eliminar proyecto ${p.name}`}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pl-7">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Asignar/Quitar Responsables:</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {users.map(user => (
                            <UserAvatar 
                              key={user.id} 
                              user={user} 
                              isSelected={p.responsibleIds.includes(user.id)}
                              onClick={() => handleToggleExistingResponsible(p, user.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Añadir Nuevo Proyecto</h3>
                <form onSubmit={handleAddProject} className="space-y-4">
                  {/* Form fields for adding a project */}
                   <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Nombre del proyecto"
                      className="flex-grow bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <label htmlFor="project-color" className="text-sm font-medium text-gray-700">Color:</label>
                      <input
                        id="project-color"
                        type="color"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        className="w-10 h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><UserGroupIcon className="w-5 h-5" />Responsables</label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md flex-wrap">
                      {users.map(user => (
                          <UserAvatar key={user.id} user={user} isSelected={newProjectResponsibles.includes(user.id)} onClick={() => handleToggleNewResponsible(user.id)}/>
                        ))}
                    </div>
                  </div>
                  <div className="flex justify-end"><button type="submit" className="px-4 py-2 bg-[#254467] hover:bg-[#3F6183] text-white font-semibold rounded-md transition-colors">Añadir Proyecto</button></div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Responsables Actuales</h3>
                <div className="space-y-2 pr-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <button 
                        onClick={() => {
                           if (window.confirm(`¿Estás seguro de que quieres eliminar a ${user.name}?`)) {
                             onDeleteUser(user.id);
                           }
                        }}
                        className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                        aria-label={`Eliminar usuario ${user.name}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Añadir Nuevo Responsable</h3>
                <form onSubmit={handleAddUser} className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nombre del responsable"
                    className="flex-grow bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#254467] hover:bg-[#3F6183] text-white font-semibold rounded-md transition-colors whitespace-nowrap"
                  >
                    Añadir Responsable
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md transition-colors"
            >
              Cerrar
            </button>
          </div>
      </div>
    </div>
  );
};

export default AdminProjectsModal;