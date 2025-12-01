
import { Project, Task, TaskStatus, User, Workspace, TaskPriority, TaskDuration } from './types';

// --- WEIGHTING CONFIGURATION ---

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  'Baja': 5,
  'Moderada': 8,
  'Media': 13,
  'Alta': 20,
  'Urgente': 40
};

export const DURATION_WEIGHTS: Record<TaskDuration, number> = {
  '1 día': 5,
  '2-3 días': 8,
  '1 semana': 13,
  '2 semanas': 20
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  'Baja': '#9CA3AF',      // Gray
  'Moderada': '#10B981',  // Green
  'Media': '#F59E0B',     // Amber
  'Alta': '#F97316',      // Orange
  'Urgente': '#EF4444'    // Red
};


// Mock data for users
export const USERS: User[] = [
  { id: 'user-1', name: 'Ana López', avatarColor: '#E24A4A' },
  { id: 'user-2', name: 'Carlos García', avatarColor: '#23B2F5' },
  { id: 'user-3', name: 'Sofía Martínez', avatarColor: '#E350D3' },
];

// Mock data for projects
export const PROJECTS: Project[] = [
  { 
    id: 'proj-1', 
    name: 'Desarrollo Frontend', 
    color: '#4A90E2', 
    responsibleIds: ['user-1', 'user-3'],
    description: 'Creación de una interfaz de usuario moderna y responsiva utilizando React y Tailwind CSS para el nuevo portal de clientes.'
  },
  { 
    id: 'proj-2', 
    name: 'Campaña de Marketing', 
    color: '#F5A623', 
    responsibleIds: ['user-2'],
    description: 'Lanzamiento del producto Q3 enfocado en redes sociales y email marketing para aumentar la retención de usuarios.'
  },
  { 
    id: 'proj-3', 
    name: 'Investigación UX', 
    color: '#50E3C2', 
    responsibleIds: ['user-3'],
    description: 'Estudio de usabilidad y entrevistas con usuarios para identificar puntos de dolor en el flujo de pago actual.'
  },
];


// Mock data for tasks
export const TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Configurar el entorno de desarrollo',
    description: 'Instalar todas las dependencias necesarias y configurar el linter y prettier.',
    status: TaskStatus.Done,
    projectId: 'proj-1',
    responsibleId: 'user-1',
    subtasks: [
      { id: 'sub-1-1', text: 'Instalar Node.js y npm', completed: true },
      { id: 'sub-1-2', text: 'Crear proyecto React', completed: true },
      { id: 'sub-1-3', text: 'Configurar ESLint', completed: true },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'Alta',
    duration: '1 día'
  },
  {
    id: 'task-2',
    title: 'Crear componentes de la UI',
    description: 'Desarrollar los componentes reutilizables como botones, modales y tarjetas.',
    status: TaskStatus.InProgress,
    projectId: 'proj-1',
    responsibleId: 'user-1',
    subtasks: [
      { id: 'sub-2-1', text: 'Componente Botón', completed: true },
      { id: 'sub-2-2', text: 'Componente Modal', completed: false },
      { id: 'sub-2-3', text: 'Componente Tarjeta de Tarea', completed: false },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    priority: 'Media',
    duration: '2-3 días'
  },
  {
    id: 'task-3',
    title: 'Definir estrategia de redes sociales',
    description: 'Planificar el contenido para el próximo trimestre en Instagram y Twitter.',
    status: TaskStatus.ToDo,
    projectId: 'proj-2',
    responsibleId: 'user-2',
    subtasks: [
       { id: 'sub-3-1', text: 'Investigar tendencias', completed: false },
       { id: 'sub-3-2', text: 'Crear calendario de contenido', completed: false },
       { id: 'sub-3-3', text: 'Diseñar plantillas de posts', completed: false },
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    priority: 'Urgente',
    duration: '1 semana'
  },
];


// Mock data for workspaces - NEW
export const COLLABORATIVE_WORKSPACES: Workspace[] = [
    {
        id: 'ws-collab-1',
        name: 'Equipo de Diseño',
        isPersonal: false,
        members: [
            USERS[0],
            USERS[2],
            { id: 'user-4', name: 'David', avatarColor: '#4AE29D' }
        ]
    },
    {
        id: 'ws-collab-2',
        name: 'Proyecto Titán',
        isPersonal: false,
        members: [
            USERS[0],
            USERS[1],
            USERS[2],
            { id: 'user-5', name: 'Elena', avatarColor: '#F5A623' },
            { id: 'user-6', name: 'Frank', avatarColor: '#4A90E2' },
            { id: 'user-7', name: 'Gloria', avatarColor: '#8B572A' },
        ]
    }
];
