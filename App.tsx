import React, { useState, useEffect, useRef } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { MetricsDashboard } from './components/MetricsDashboard';
import { MessageBoard } from './components/MessageBoard';
import AddTaskModal from './components/AddTaskModal';
import AdminProjectsModal from './components/AdminProjectsModal';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import { ListIcon, KanbanIcon, PlusIcon, SettingsIcon, ChartIcon, MessageBoardIcon, BellIcon, InfoCircleIcon, CheckCircleIcon, DownloadIcon, SwitchIcon, EllipsisVerticalIcon, LogoutIcon } from './components/Icons';
import { UserAvatar } from './components/UserAvatar';
import { Project, Task, TaskStatus, User, Message, NotificationType, Subtask } from './types';
import { generateSubtasks } from './services/geminiService';
import { useNotifications } from './hooks/useNotifications';
import { useUserData } from './hooks/useUserData';
import { timeAgo } from './utils/time';
import { exportDashboardAsPDF } from './services/DashboardExporter';
import { WorkspaceSelector } from './components/WorkspaceSelector';

type ViewMode = 'kanban' | 'list' | 'metrics' | 'board';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

// Helper to get user profile from localStorage or fallback to null
const getInitialProfile = (): UserProfile | null => {
  try {
    const item = window.localStorage.getItem('scrum_user_profile');
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key "scrum_user_profile":`, error);
    return null;
  }
};

// Helper to decode JWT
const decodeJwt = (token: string): any => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialProfile);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => sessionStorage.getItem('scrum_workspace_id'));
  
  const {
    tasks, setTasks,
    projects, setProjects,
    users, setUsers,
    messages, setMessages,
    isDataLoaded,
    personalWorkspace,
    collaborativeWorkspaces,
    addCollaborativeWorkspace,
    isFirebaseConfigured
  } = useUserData(userProfile, selectedWorkspaceId, authToken);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [isAdminProjectsModalOpen, setAdminProjectsModalOpen] = useState(false);
  const [isNotificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  
  const { addNotification, history: notificationHistory } = useNotifications();

  // Persist user profile to keep session
  useEffect(() => { 
    if (userProfile) {
      localStorage.setItem('scrum_user_profile', JSON.stringify(userProfile)); 
    } else {
      localStorage.removeItem('scrum_user_profile');
      sessionStorage.removeItem('scrum_workspace_id'); // Clear workspace on logout
    }
  }, [userProfile]);

  // Persist selected workspace to session storage
  useEffect(() => {
    if (selectedWorkspaceId) {
      sessionStorage.setItem('scrum_workspace_id', selectedWorkspaceId);
    } else {
      sessionStorage.removeItem('scrum_workspace_id');
    }
  }, [selectedWorkspaceId]);


  // Handle closing menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) setNotificationHistoryOpen(false);
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear highlight after a delay
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  // Clear focused task ID if view changes from board
  useEffect(() => {
    if (viewMode !== 'board') {
      setFocusedTaskId(null);
    }
  }, [viewMode]);

  const handleLoginSuccess = (response: any) => {
    const profile = decodeJwt(response.credential);
    if (profile) {
      setUserProfile(profile);
      setAuthToken(response.credential);
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    setSelectedWorkspaceId(null);
    setAuthToken(null);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
  };
  
  const handleChangeWorkspace = () => {
    setSelectedWorkspaceId(null);
  };

  const handleNavigateToTask = (taskId: string) => {
    setViewMode('kanban');
    setTimeout(() => setHighlightedTaskId(taskId), 50);
  };

  const handleNavigateToTaskMessages = (taskId: string) => {
    setViewMode('board');
    setFocusedTaskId(taskId);
  };

  const clearFocusedTask = () => {
    setFocusedTaskId(null);
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'subtasks' | 'createdAt' | 'completedAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    setAddTaskModalOpen(false);

    const responsibleUser = users.find(u => u.id === newTask.responsibleId);
    if (responsibleUser) {
      addNotification(`Tarea '${newTask.title}' asignada a ${responsibleUser.name}.`, NotificationType.Info, () => handleNavigateToTask(newTask.id));
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const wasDone = task.status === TaskStatus.Done;
    const isNowDone = newStatus === TaskStatus.Done;

    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const completedAt = isNowDone && !wasDone 
          ? new Date().toISOString() 
          : (!isNowDone && wasDone ? null : t.completedAt);
        return { ...t, status: newStatus, completedAt };
      }
      return t;
    }));

    if (isNowDone && !wasDone) {
      const responsibleUser = users.find(u => u.id === task.responsibleId);
      addNotification(`¡Tarea '${task.title}' completada${responsibleUser ? ` por ${responsibleUser.name}` : ''}!`, NotificationType.Success, () => handleNavigateToTask(task.id));
    }
  };

  const updateTask = (updatedTask: Task) => {
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) return;

    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));

    if (originalTask.responsibleId !== updatedTask.responsibleId) {
      const newUser = users.find(u => u.id === updatedTask.responsibleId);
      if (newUser) {
        addNotification(`Tarea '${updatedTask.title}' reasignada a ${newUser.name}.`, NotificationType.Info, () => handleNavigateToTask(updatedTask.id));
      }
    }
  };

  const deleteTask = (taskId: string) => setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  
  const handleGenerateSubtasks = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
        const subtasksText = await generateSubtasks(task.title, task.description);
        const newSubtasks: Subtask[] = subtasksText.map((text, i) => ({ 
            id: `sub-${task.id}-${i}-${Date.now()}`, 
            text, 
            completed: false 
        }));

        setTasks(prevTasks => prevTasks.map(t => 
            t.id === taskId ? { ...t, subtasks: [...t.subtasks, ...newSubtasks] } : t
        ));
        addNotification(`Subtareas generadas para '${task.title}'`, NotificationType.Success, () => handleNavigateToTask(taskId));
    } catch (error) {
        addNotification('Error al generar subtareas.', NotificationType.Info);
        console.error("Failed to generate subtasks:", error);
    }
  };
  
  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newProject: Project = { ...projectData, id: `proj-${Date.now()}` };
    setProjects(prev => [...prev, newProject]);
  };
  
  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };
  
  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId)); // Also delete associated tasks
  };
  
  const addUser = (name: string) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      avatarColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    };
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addMessage = (text: string, taskId?: string) => {
    if (!userProfile) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      userId: userProfile.sub,
      createdAt: new Date().toISOString(),
      taskId,
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  const updateMessage = (updatedMessage: Message) => {
    setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleExport = async () => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);
    try {
        await exportDashboardAsPDF(tasks, projects, users, exportContainerRef.current);
    } catch (error) {
        console.error("Failed to export dashboard:", error);
        addNotification("Error al exportar el dashboard.", NotificationType.Info);
    } finally {
        setIsExporting(false);
    }
  };

  const currentUser = users.find(u => u.id === userProfile?.sub);

  if (!userProfile) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  
  // Wait for the user's personal workspace to be initialized by the hook
  if (!personalWorkspace) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D85929]"></div>
        </div>
    );
  }

  if (!selectedWorkspaceId) {
      return (
          <WorkspaceSelector 
              user={{...userProfile, id: userProfile.sub, avatarColor: '#4A90E2'}}
              personalWorkspace={personalWorkspace}
              collaborativeWorkspaces={collaborativeWorkspaces}
              onSelectWorkspace={handleSelectWorkspace}
              onLogout={handleLogout}
              onAddWorkspace={(name, creator) => addCollaborativeWorkspace(name, creator)}
          />
      );
  }
  
  // After selecting a workspace, wait for its data to load.
  // The currentUser also depends on this data.
  if (!isDataLoaded || !currentUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D85929]"></div>
            <p className="text-lg text-gray-600 animate-pulse">Cargando espacio de trabajo...</p>
            <p className="text-sm text-gray-500 max-w-md">
                Si esto tarda demasiado, puede haber problemas de conexión.
            </p>
            <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
            >
                Cancelar y Volver
            </button>
        </div>
    );
  }

  // Find the current workspace object after data is loaded
  const currentWorkspace = [...collaborativeWorkspaces, personalWorkspace].find(w => w?.id === selectedWorkspaceId);
  
  // If the selected workspace ID from session storage is invalid, reset.
  if (!currentWorkspace) {
      handleChangeWorkspace(); // Resets selectedWorkspaceId to null, will re-render to selector
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <p className="text-lg text-gray-600">Espacio de trabajo no válido. Redirigiendo...</p>
        </div>
      );
  }

  const NotificationBell = () => (
      <div className="relative" ref={notificationMenuRef}>
        <button 
          onClick={() => setNotificationHistoryOpen(prev => !prev)}
          className="p-2 text-gray-500 hover:text-[#D85929] hover:bg-orange-100 rounded-full transition-colors"
          aria-label={`${notificationHistory.length > 0 ? notificationHistory.length : 'No'} new notifications`}
        >
          <BellIcon className="w-6 h-6" />
          {notificationHistory.length > 0 && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>}
        </button>
        {isNotificationHistoryOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-20">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notificationHistory.length > 0 ? (
                notificationHistory.map(notif => (
                  <div key={notif.id} onClick={notif.onClick} className={`flex items-start gap-3 p-3 border-b last:border-b-0 ${notif.onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                    <div className={`${notif.type === NotificationType.Success ? 'text-green-500' : 'text-blue-500'} mt-1`}>
                      {notif.type === NotificationType.Success ? <CheckCircleIcon className="w-5 h-5" /> : <InfoCircleIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center p-6">No hay notificaciones.</p>
              )}
            </div>
          </div>
        )}
      </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Logo className="h-10" />
          <div className="h-8 w-px bg-gray-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">{currentWorkspace?.name}</h1>
               {isFirebaseConfigured ? (
                   <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full border border-green-200 font-semibold">NUBE</span>
               ) : (
                   <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full border border-gray-300 font-semibold">LOCAL</span>
               )}
            </div>
            <button
                onClick={handleChangeWorkspace}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#D85929] font-medium"
            >
                <SwitchIcon className="w-3 h-3"/> Cambiar
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            
            {/* --- View switcher --- */}
            <div className="flex items-center p-1 bg-gray-200 rounded-lg">
                <button onClick={() => setViewMode('kanban')} className={`p-1 rounded-md ${viewMode === 'kanban' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}><KanbanIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}><ListIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('metrics')} className={`p-1 rounded-md ${viewMode === 'metrics' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}><ChartIcon className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('board')} className={`p-1 rounded-md ${viewMode === 'board' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}><MessageBoardIcon className="w-5 h-5" /></button>
            </div>
             <button
              onClick={() => setAddTaskModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#D85929] hover:bg-[#C0481A] text-white font-semibold rounded-md transition-colors text-sm"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Añadir Tarea</span>
            </button>
            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

            {/* --- Desktop Buttons --- */}
            <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setAdminProjectsModalOpen(true)} className="p-2 text-gray-500 hover:text-[#254467] hover:bg-gray-100 rounded-full transition-colors" title="Administrar"><SettingsIcon className="w-6 h-6"/></button>
                <button onClick={handleExport} disabled={isExporting} className="p-2 text-gray-500 hover:text-[#254467] hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50" title="Exportar"><DownloadIcon className="w-6 h-6" /></button>
                <NotificationBell />
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="Cerrar sesión"><LogoutIcon className="w-6 h-6" /></button>
            </div>

            {/* --- Mobile Menu --- */}
            <div className="flex items-center md:hidden" ref={mobileMenuRef}>
              <NotificationBell />
              <button onClick={() => setMobileMenuOpen(prev => !prev)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
                <EllipsisVerticalIcon className="w-6 h-6" />
              </button>
              {isMobileMenuOpen && (
                <div className="absolute right-4 top-16 mt-2 w-48 bg-white rounded-md shadow-xl z-20 border">
                  <button onClick={() => { setAdminProjectsModalOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"><SettingsIcon className="w-5 h-5" /> Administrar</button>
                  <button onClick={() => { handleExport(); setMobileMenuOpen(false); }} disabled={isExporting} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 disabled:opacity-50"><DownloadIcon className="w-5 h-5" /> Exportar</button>
                  <div className="border-t my-1"></div>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><LogoutIcon className="w-5 h-5" /> Cerrar sesión</button>
                </div>
              )}
            </div>

            <UserAvatar user={currentUser} />
        </div>
      </header>

      <main className="p-6">
        <div ref={exportContainerRef}>
          {viewMode === 'kanban' && <KanbanBoard tasks={tasks} projects={projects} users={users} messages={messages} onUpdateTaskStatus={updateTaskStatus} onUpdateTask={updateTask} onGenerateSubtasks={handleGenerateSubtasks} onDeleteTask={deleteTask} highlightedTaskId={highlightedTaskId} onNavigateToTaskMessages={handleNavigateToTaskMessages} />}
          {viewMode === 'list' && <ListView tasks={tasks} projects={projects} users={users} onUpdateTask={updateTask} />}
          {viewMode === 'metrics' && <MetricsDashboard tasks={tasks} projects={projects} users={users} />}
          {viewMode === 'board' && <MessageBoard messages={messages} users={users} tasks={tasks} projects={projects} onAddMessage={addMessage} onUpdateMessage={updateMessage} onDeleteMessage={deleteMessage} onNavigateToTask={handleNavigateToTask} focusedTaskId={focusedTaskId} onClearFocus={clearFocusedTask} currentUser={userProfile} />}
        </div>
      </main>

      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        projects={projects}
        users={users}
      />
      <AdminProjectsModal 
        isOpen={isAdminProjectsModalOpen}
        onClose={() => setAdminProjectsModalOpen(false)}
        projects={projects}
        users={users}
        onAddProject={addProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onAddUser={addUser}
        onDeleteUser={deleteUser}
      />
    </div>
  );
}

export default App;