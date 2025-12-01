
import React, { useState, useEffect } from 'react';
import { Project, Task, TaskStatus, User, TaskPriority, TaskDuration } from '../types';
import { PRIORITY_WEIGHTS, DURATION_WEIGHTS } from '../constants';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id'| 'subtasks' | 'createdAt' | 'completedAt'>) => void;
  onUpdateTask?: (task: Task) => void; // Added for promotion
  taskToPromote?: Task | null; // Added for promotion
  projects: Project[];
  users: User[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAddTask, onUpdateTask, taskToPromote, projects, users }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [responsibleId, setResponsibleId] = useState(users[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('Baja');
  const [duration, setDuration] = useState<TaskDuration>('1 día');

  // Load task data if promoting
  useEffect(() => {
    if (isOpen) {
        if (taskToPromote) {
            setTitle(taskToPromote.title);
            setDescription(taskToPromote.description || '');
            setProjectId(taskToPromote.projectId);
            setResponsibleId(''); // Force user to choose responsible when promoting
            setPriority('Baja');
            setDuration('1 día');
        } else {
            // Reset defaults for new task
            setTitle('');
            setDescription('');
            setProjectId(projects[0]?.id || '');
            setResponsibleId(users[0]?.id || '');
            setPriority('Baja');
            setDuration('1 día');
        }
    }
  }, [isOpen, taskToPromote, projects, users]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !responsibleId) return;

    if (taskToPromote && onUpdateTask) {
        // PROMOTION FLOW
        onUpdateTask({
            ...taskToPromote,
            title,
            description,
            projectId,
            responsibleId,
            status: TaskStatus.ToDo, // Move to board
            priority,
            duration,
            createdAt: new Date().toISOString() // Reset date to "now" as it enters the workflow
        });
    } else {
        // CREATE FLOW
        onAddTask({
            title,
            description,
            projectId,
            status: TaskStatus.ToDo,
            responsibleId,
            priority,
            duration
        });
    }

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900">
            {taskToPromote ? 'Formalizar Tarea del Backlog' : 'Añadir Nueva Tarea'}
        </h2>
        {taskToPromote && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs p-2 rounded">
                Completa los detalles para mover esta tarea al tablero principal "Por Hacer".
            </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
            ></textarea>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                >
                    {(Object.keys(PRIORITY_WEIGHTS) as TaskPriority[]).map(p => (
                        <option key={p} value={p}>{p} ({PRIORITY_WEIGHTS[p]} pts)</option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duración Est.</label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as TaskDuration)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
                >
                    {(Object.keys(DURATION_WEIGHTS) as TaskDuration[]).map(d => (
                        <option key={d} value={d}>{d} ({DURATION_WEIGHTS[d]} pts)</option>
                    ))}
                </select>
              </div>
          </div>

          <div className="mb-4">
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
              required
            >
              <option value="" disabled>Selecciona un proyecto</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
            <select
              id="responsible"
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#254467] focus:border-[#254467]"
              required
            >
              <option value="" disabled>Selecciona un responsable</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4">
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
              {taskToPromote ? 'Promover a Tablero' : 'Añadir Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
