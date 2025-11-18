import React, { useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { User, Workspace } from '../types';
import { BriefcaseIcon, UserCircleIcon, PlusIcon } from './Icons';
import CreateWorkspaceModal from './CreateWorkspaceModal';

interface WorkspaceSelectorProps {
  user: User;
  personalWorkspace: Workspace;
  collaborativeWorkspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onLogout: () => void;
  onAddWorkspace: (name: string, creator: User) => void;
}

const WorkspaceCard: React.FC<{ workspace: Workspace; onClick: () => void; children: React.ReactNode }> = ({ workspace, onClick, children }) => (
    <button
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-[#254467] transition-all duration-300 transform hover:-translate-y-1"
    >
        <div className="absolute top-0 right-0 p-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-bl-lg rounded-tr-xl">
            {workspace.isPersonal ? 'PRIVADO' : 'EQUIPO'}
        </div>
        <div className="mb-4 text-gray-500 group-hover:text-[#D85929] transition-colors">
            {children}
        </div>
        <h3 className="text-lg font-bold text-gray-800 text-center">{workspace.name}</h3>
        {workspace.members && (
            <div className="flex -space-x-2 mt-3">
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
    </button>
);


export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  user,
  personalWorkspace,
  collaborativeWorkspaces,
  onSelectWorkspace,
  onLogout,
  onAddWorkspace
}) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateWorkspace = (name: string) => {
    onAddWorkspace(name, user);
    setCreateModalOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <header className="absolute top-0 right-0 p-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
                <UserAvatar user={user} size="large" />
                <span className="font-semibold text-gray-700">{user.name}</span>
            </div>
            <button onClick={onLogout} className="text-sm font-medium text-gray-600 hover:text-[#D85929]">Salir</button>
        </header>

        <main className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Hola, {user.name.split(' ')[0]}</h1>
            <p className="text-lg text-gray-600 mb-12">Selecciona un espacio de trabajo para continuar.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Personal Workspace */}
                <WorkspaceCard workspace={personalWorkspace} onClick={() => onSelectWorkspace(personalWorkspace.id)}>
                    <UserCircleIcon className="w-16 h-16" />
                </WorkspaceCard>

                {/* Collaborative Workspaces */}
                {collaborativeWorkspaces.map(ws => (
                    <WorkspaceCard key={ws.id} workspace={ws} onClick={() => onSelectWorkspace(ws.id)}>
                       <BriefcaseIcon className="w-16 h-16" />
                    </WorkspaceCard>
                ))}

                {/* Create New Workspace */}
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className="group flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-[#D85929] hover:text-[#D85929] hover:bg-orange-50 transition-all duration-300"
                    aria-label="Crear un nuevo espacio de trabajo colaborativo"
                >
                    <div className="mb-4 text-gray-400 group-hover:text-[#D85929] transition-colors">
                        <PlusIcon className="w-16 h-16" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 group-hover:text-[#D85929] transition-colors">Crear Espacio</h3>
                </button>
            </div>
        </main>

        <CreateWorkspaceModal
            isOpen={isCreateModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={handleCreateWorkspace}
        />
    </div>
  );
};