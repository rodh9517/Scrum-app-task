import React, { useState } from 'react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="create-workspace-title" className="text-xl font-bold mb-4 text-gray-900">Crear Nuevo Espacio Colaborativo</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Espacio</label>
            <input
              type="text"
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
              placeholder="Ej: Equipo de Marketing"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#254467] hover:bg-[#3F6183] text-white font-semibold rounded-md transition-colors"
            >
              Crear Espacio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;