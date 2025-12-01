
import React, { useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { User, Workspace } from '../types';
import { PlusIcon, SettingsIcon } from './Icons';
import { Logo } from './Logo';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { WorkspaceManager } from './WorkspaceManager';

interface WorkspaceSelectorProps {
  user: User;
  personalWorkspace: Workspace;
  collaborativeWorkspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onLogout: () => void;
  onAddWorkspace: (name: string, creator: User) => void;
  // Management props
  onUpdateWorkspace?: (id: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace?: (id: string) => void;
  onReorderWorkspaces?: (workspaces: Workspace[]) => void;
  isReadOnly?: boolean;
}

const WorkspaceCard: React.FC<{ workspace: Workspace; onClick: () => void; children?: React.ReactNode }> = ({ workspace, onClick, children }) => {
    const themeColor = workspace.theme || '#254467';
    const icon = workspace.icon || (workspace.isPersonal ? '🏠' : '👥');

    return (
    <button
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
        style={{ borderColor: 'transparent' }} // Override for hover effect
    >
        {/* Top Border / Theme Indicator */}
        <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: themeColor }}></div>
        
        <div className="absolute top-3 right-3 p-1 px-2 text-[10px] font-bold tracking-wider text-gray-400 bg-gray-50 rounded-full uppercase">
            {workspace.isPersonal ? 'Personal' : 'Equipo'}
        </div>

        <div className="mb-4 text-5xl mt-4 transition-transform group-hover:scale-110 duration-300">
            {icon}
        </div>

        <h3 className="text-lg font-bold text-gray-800 text-center mb-1">{workspace.name}</h3>
        
        {workspace.members && (
            <div className="flex -space-x-2 mt-3 h-8 items-center">
                {workspace.members.slice(0, 5).map(member => (
                    <UserAvatar key={member.id} user={member} size="small" />
                ))}
                {workspace.members.length > 5 && (
                    <div className="w-6 h-6 text-xs rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 ring-2 ring-white">
                        +{workspace.members.length - 5}
                    </div>
                )}
            </div>
        )}
        
        {/* Hover Border Effect using pseudo element logic via style */}
        <div className="absolute inset-0 border-2 border-transparent rounded-xl group-hover:border-opacity-20 pointer-events-none" style={{ borderColor: themeColor }}></div>
    </button>
)};


export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  user,
  personalWorkspace,
  collaborativeWorkspaces,
  onSelectWorkspace,
  onLogout,
  onAddWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onReorderWorkspaces,
  isReadOnly
}) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);

  const handleCreateWorkspace = (name: string) => {
    onAddWorkspace(name, user);
    setCreateModalOpen(false);
  };

  return (
    <div className="flex flex-col items-center md:justify-center min-h-screen bg-gray-50 p-4 relative pt-20 md:pt-0">
        {/* Logo Top Left (Desktop Only) */}
        <div className="absolute top-0 left-0 p-8 hidden md:block">
            <Logo className="h-14" />
        </div>

        <header className="absolute top-0 right-0 p-4 md:p-6 flex items-center gap-4 z-10">
            <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-sm px-4">
                <UserAvatar user={user} size="medium" />
                <span className="font-semibold text-gray-700 text-sm hidden sm:inline">{user.name}</span>
            </div>
            {isReadOnly && (
                 <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full border border-orange-200 font-bold">INVITADO</span>
            )}
            <button onClick={onLogout} className="text-sm font-medium text-gray-500 hover:text-[#D85929] transition-colors bg-white p-2 rounded-full shadow-sm px-4">Salir</button>
        </header>

        <main className="text-center max-w-5xl mx-auto w-full">
            <div className="mb-10">
                <h1 className="text-2xl md:text-4xl font-bold md:font-extrabold text-gray-800 mb-2">Hola, {user.name.split(' ')[0]}</h1>
                <p className="text-base md:text-lg text-gray-500">¿En qué vas a trabajar hoy?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {/* Personal Workspace */}
                <WorkspaceCard workspace={personalWorkspace} onClick={() => onSelectWorkspace(personalWorkspace.id)} />

                {/* Collaborative Workspaces */}
                {collaborativeWorkspaces.map(ws => (
                    <WorkspaceCard key={ws.id} workspace={ws} onClick={() => onSelectWorkspace(ws.id)} />
                ))}

                {/* Create New Workspace - Hidden for ReadOnly Guests */}
                {!isReadOnly && (
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="group flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-[#D85929] hover:bg-orange-50 transition-all duration-300 min-h-[200px]"
                        aria-label="Crear un nuevo espacio de trabajo colaborativo"
                    >
                        <div className="mb-3 text-gray-300 group-hover:text-[#D85929] transition-colors bg-gray-100 group-hover:bg-orange-100 rounded-full p-3">
                            <PlusIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-md font-bold text-gray-500 group-hover:text-[#D85929] transition-colors">Crear Nuevo Espacio</h3>
                    </button>
                )}
            </div>

            {!isReadOnly && (
                <div className="mt-12 pb-8 md:pb-0">
                    <button 
                        onClick={() => setManagerOpen(true)}
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-[#254467] font-semibold px-6 py-3 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <SettingsIcon className="w-5 h-5" />
                        Gestionar Espacios
                    </button>
                </div>
            )}
        </main>

        {/* Footer Legend (Desktop Only) */}
        <div className="absolute bottom-0 right-0 p-6 hidden md:block text-gray-400 text-xs font-medium select-none pointer-events-none">
            Prototipo hecho por Jose Rodrigo Hernandez Rivas
        </div>

        <CreateWorkspaceModal
            isOpen={isCreateModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={handleCreateWorkspace}
        />

        {onUpdateWorkspace && onDeleteWorkspace && onReorderWorkspaces && !isReadOnly && (
            <WorkspaceManager 
                isOpen={isManagerOpen}
                onClose={() => setManagerOpen(false)}
                personalWorkspace={personalWorkspace}
                collaborativeWorkspaces={collaborativeWorkspaces}
                user={user}
                onUpdateWorkspace={onUpdateWorkspace}
                onDeleteWorkspace={onDeleteWorkspace}
                onReorderWorkspaces={onReorderWorkspaces}
            />
        )}
    </div>
  );
};
