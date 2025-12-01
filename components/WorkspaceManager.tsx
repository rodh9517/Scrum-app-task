import React, { useState } from 'react';
import { Workspace, User } from '../types';
import { TrashIcon, SettingsIcon, SwitchIcon } from './Icons';

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  personalWorkspace: Workspace;
  collaborativeWorkspaces: Workspace[];
  user: User;
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (id: string) => void;
  onReorderWorkspaces: (workspaces: Workspace[]) => void;
}

const COLORS = ['#4A90E2', '#D85929', '#50E3C2', '#F5A623', '#E350D3', '#254467', '#8B572A', '#4AE29D'];
const ICONS = ['🏠', '🚀', '💼', '🎨', '💻', '📊', '🔥', '✨', '🛒', '🎓'];

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  isOpen,
  onClose,
  personalWorkspace,
  collaborativeWorkspaces,
  user,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onReorderWorkspaces
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editTheme, setEditTheme] = useState('');

  if (!isOpen) return null;

  const startEditing = (ws: Workspace) => {
    setEditingId(ws.id);
    setEditName(ws.name);
    setEditIcon(ws.icon || '📁');
    setEditTheme(ws.theme || '#4A90E2');
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onUpdateWorkspace(editingId, {
        name: editName,
        icon: editIcon,
        theme: editTheme
      });
      setEditingId(null);
    }
  };

  const moveWorkspace = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...collaborativeWorkspaces];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    onReorderWorkspaces(newOrder);
  };

  const handleSortAlpha = () => {
      const sorted = [...collaborativeWorkspaces].sort((a, b) => a.name.localeCompare(b.name));
      onReorderWorkspaces(sorted);
  };

  const renderEditForm = () => (
    <div className="bg-gray-100 p-4 rounded-md mb-4 animate-fade-in">
      <div className="mb-3">
        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467] outline-none placeholder-gray-500"
          placeholder="Nombre del espacio"
          style={{ backgroundColor: 'white', color: '#111827' }} // Explicit inline style to prevent overrides
        />
      </div>
      <div className="flex gap-4 mb-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Icono</label>
          <div className="flex gap-2 flex-wrap bg-white p-2 rounded border border-gray-300">
            {ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => setEditIcon(icon)}
                className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 ${editIcon === icon ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div>
           <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
           <div className="flex gap-2 flex-wrap bg-white p-2 rounded border border-gray-300 max-w-[150px]">
             {COLORS.map(color => (
               <button
                key={color}
                onClick={() => setEditTheme(color)}
                className={`w-6 h-6 rounded-full ${editTheme === color ? 'ring-2 ring-offset-1 ring-gray-600' : ''}`}
                style={{ backgroundColor: color }}
               />
             ))}
           </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditingId(null)} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
        <button onClick={saveEditing} className="px-3 py-1 text-sm bg-[#254467] text-white rounded hover:bg-[#1a3350]">Guardar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#254467]" /> Gestión de Espacios
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>

        {/* Personal Workspace Section */}
        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-3">Espacio Personal</h3>
          {editingId === personalWorkspace.id ? renderEditForm() : (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full text-2xl bg-white shadow-sm" style={{ color: personalWorkspace.theme }}>
                  {personalWorkspace.icon || '🏠'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{personalWorkspace.name}</h4>
                  <p className="text-xs text-gray-500">Solo tú puedes ver esto</p>
                </div>
              </div>
              <button onClick={() => startEditing(personalWorkspace)} className="text-sm text-[#254467] font-semibold hover:underline">Editar</button>
            </div>
          )}
        </div>

        {/* Collaborative Workspaces Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold">Espacios Colaborativos</h3>
             <button onClick={handleSortAlpha} className="text-xs text-[#D85929] hover:underline font-medium">Ordenar A-Z</button>
          </div>
          
          <div className="space-y-3">
            {collaborativeWorkspaces.map((ws, index) => (
              <div key={ws.id}>
                {editingId === ws.id ? renderEditForm() : (
                  <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm flex items-center gap-3 group hover:border-gray-400 transition-colors">
                    <div className="flex flex-col gap-1 text-gray-300">
                      <button 
                        onClick={() => moveWorkspace(index, 'up')} 
                        disabled={index === 0}
                        className="hover:text-gray-600 disabled:opacity-20"
                      >▲</button>
                      <button 
                        onClick={() => moveWorkspace(index, 'down')} 
                        disabled={index === collaborativeWorkspaces.length - 1}
                        className="hover:text-gray-600 disabled:opacity-20"
                      >▼</button>
                    </div>
                    
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg text-xl bg-gray-100" style={{ backgroundColor: `${ws.theme}20` }}>
                      {ws.icon || '👥'}
                    </div>
                    
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-800">{ws.name}</h4>
                      <p className="text-xs text-gray-500">{ws.members?.length || 0} miembros</p>
                    </div>

                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditing(ws)} className="text-gray-500 hover:text-[#254467]" title="Editar">
                        <SettingsIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                            const isOwner = ws.members?.[0]?.id === user.id; // Assuming creator is first or handled elsewhere
                            if (window.confirm(isOwner 
                                ? `¿Eliminar "${ws.name}"? Perderás todos los datos.` 
                                : `¿Salir de "${ws.name}"?`)) {
                                onDeleteWorkspace(ws.id);
                            }
                        }} 
                        className="text-gray-500 hover:text-red-600"
                        title="Eliminar o Salir"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {collaborativeWorkspaces.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No perteneces a ningún espacio colaborativo aún.</p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t flex justify-end">
             <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-md">Hecho</button>
        </div>
      </div>
    </div>
  );
};