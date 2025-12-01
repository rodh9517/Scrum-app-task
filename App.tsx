
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { MetricsDashboard } from './components/MetricsDashboard';
import { MessageBoard } from './components/MessageBoard';
import { BacklogView } from './components/BacklogView';
import { HistoryView } from './components/HistoryView'; // NEW IMPORT
import AddTaskModal from './components/AddTaskModal';
import AdminProjectsModal from './components/AdminProjectsModal';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import { ListIcon, KanbanIcon, PlusIcon, SettingsIcon, ChartIcon, MessageBoardIcon, BellIcon, InfoCircleIcon, CheckCircleIcon, DownloadIcon, SwitchIcon, EllipsisVerticalIcon, LogoutIcon, FilterIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, MicrophoneIcon, UserCircleIcon, ArchiveBoxIcon, ClockIcon } from './components/Icons'; // ClockIcon added
import { UserAvatar } from './components/UserAvatar';
import { Project, Task, TaskStatus, User, Message, NotificationType, Subtask } from './types';
import { generateSubtasks, parseTaskFromVoice } from './services/geminiService';
import { useNotifications } from './hooks/useNotifications';
import { useUserData } from './hooks/useUserData';
import { timeAgo } from './utils/time';
import { repairMojibake } from './utils/stringUtils';
import { exportDashboardAsPDF } from './services/DashboardExporter';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { isSupabaseConfigured } from './services/supabase';
import { VoiceCommandModal } from './components/VoiceCommandModal';

type ViewMode = 'kanban' | 'list' | 'metrics' | 'board' | 'backlog' | 'history'; // Added history

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
    if (item) {
        const profile = JSON.parse(item);
        if (profile.name) {
            profile.name = repairMojibake(profile.name);
        }
        return profile;
    }
    return null;
  } catch (error) {
    console.error(`Error reading from localStorage key "scrum_user_profile":`, error);
    return null;
  }
};

const decodeJwt = (token: string): any => {
    try {
        const base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        const padding = base64.length % 4;
        if (padding) {
            base64 += '='.repeat(4 - padding);
        }
        
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        const jsonPayload = decoder.decode(bytes);

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

export function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialProfile);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => localStorage.getItem('scrum_workspace_id'));
  
  const { addNotification, history: notificationHistory, unreadCount, markAllAsRead } = useNotifications();

  const {
    tasks, setTasks,
    projects, setProjects,
    users, setUsers,
    messages, setMessages,
    isDataLoaded,
    isWorkspacesListLoaded,
    personalWorkspace,
    collaborativeWorkspaces,
    addCollaborativeWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    isFirebaseConfigured,
    addUser,
    moveTask
  } = useUserData(userProfile, selectedWorkspaceId, authToken, addNotification);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskToPromote, setTaskToPromote] = useState<Task | null>(null);

  const [isAdminProjectsModalOpen, setAdminProjectsModalOpen] = useState(false);
  const [isNotificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const [filterProjectId, setFilterProjectId] = useState<string>('ALL');
  const [filterAssignedToMe, setFilterAssignedToMe] = useState<boolean>(false);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());

  const exportContainerRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  const isGuest = useMemo(() => {
      return userProfile?.sub?.startsWith('dev-') || false;
  }, [userProfile]);

  useEffect(() => { 
    if (userProfile) {
      localStorage.setItem('scrum_user_profile', JSON.stringify(userProfile)); 
    } else {
      localStorage.removeItem('scrum_user_profile');
      localStorage.removeItem('scrum_workspace_id');
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      localStorage.setItem('scrum_workspace_id', selectedWorkspaceId);
    } else {
      localStorage.removeItem('scrum_workspace_id');
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (selectedWorkspaceId) {
        const savedFilter = localStorage.getItem(`scrum_prefs_${selectedWorkspaceId}_filter`);
        if (savedFilter) {
            setFilterProjectId(savedFilter);
        } else {
            setFilterProjectId('ALL');
        }

        const savedAssignedToMe = localStorage.getItem(`scrum_prefs_${selectedWorkspaceId}_assignedToMe`);
        if (savedAssignedToMe) {
            setFilterAssignedToMe(savedAssignedToMe === 'true');
        } else {
            setFilterAssignedToMe(false);
        }

        const savedCollapsed = localStorage.getItem(`scrum_prefs_${selectedWorkspaceId}_collapsed`);
        if (savedCollapsed) {
            try {
                const parsed = JSON.parse(savedCollapsed);
                if (Array.isArray(parsed)) {
                    setCollapsedTaskIds(new Set(parsed));
                } else {
                    setCollapsedTaskIds(new Set());
                }
            } catch (e) {
                console.error("Failed to parse collapsed tasks pref", e);
                setCollapsedTaskIds(new Set());
            }
        } else {
            setCollapsedTaskIds(new Set());
        }
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
      if (selectedWorkspaceId) {
          localStorage.setItem(`scrum_prefs_${selectedWorkspaceId}_filter`, filterProjectId);
      }
  }, [filterProjectId, selectedWorkspaceId]);

  useEffect(() => {
      if (selectedWorkspaceId) {
          localStorage.setItem(`scrum_prefs_${selectedWorkspaceId}_assignedToMe`, String(filterAssignedToMe));
      }
  }, [filterAssignedToMe, selectedWorkspaceId]);

  useEffect(() => {
      if (selectedWorkspaceId) {
          localStorage.setItem(`scrum_prefs_${selectedWorkspaceId}_collapsed`, JSON.stringify(Array.from(collapsedTaskIds)));
      }
  }, [collapsedTaskIds, selectedWorkspaceId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) setNotificationHistoryOpen(false);
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

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

  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(taskId)) {
            next.delete(taskId);
        } else {
            next.add(taskId);
        }
        return next;
    });
  };

  // --- FILTERING LOGIC UPDATE ---

  // Main tasks (Kanban, List, Active Metrics) - Exclude Backlog AND Archived
  const filteredTasks = useMemo(() => {
      let result = tasks.filter(t => t.status !== TaskStatus.Backlog && t.status !== TaskStatus.Archived);

      if (filterProjectId !== 'ALL') {
        result = result.filter(t => t.projectId === filterProjectId);
      }

      if (filterAssignedToMe && userProfile) {
          result = result.filter(t => t.responsibleId === userProfile.sub);
      }

      return result;
  }, [tasks, filterProjectId, filterAssignedToMe, userProfile]);

  // Backlog Tasks (Backlog View Only)
  const backlogTasks = useMemo(() => {
      let result = tasks.filter(t => t.status === TaskStatus.Backlog);
      if (filterProjectId !== 'ALL') {
          result = result.filter(t => t.projectId === filterProjectId);
      }
      return result;
  }, [tasks, filterProjectId]);

  // History Tasks (History View Only)
  const historyTasks = useMemo(() => {
      let result = tasks.filter(t => t.status === TaskStatus.Archived);
      if (filterProjectId !== 'ALL') {
          result = result.filter(t => t.projectId === filterProjectId);
      }
      return result;
  }, [tasks, filterProjectId]);

  const handleToggleAllCollapse = () => {
      const allVisibleAreCollapsed = filteredTasks.length > 0 && filteredTasks.every(t => collapsedTaskIds.has(t.id));
      
      if (allVisibleAreCollapsed) {
          setCollapsedTaskIds(prev => {
              const next = new Set(prev);
              filteredTasks.forEach(t => next.delete(t.id));
              return next;
          });
      } else {
          setCollapsedTaskIds(prev => {
              const next = new Set(prev);
              filteredTasks.forEach(t => next.add(t.id));
              return next;
          });
      }
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'subtasks' | 'createdAt' | 'completedAt'>) => {
    if (isGuest) return;
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      order: tasks.length,
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    setAddTaskModalOpen(false);

    if (newTask.status !== TaskStatus.Backlog) {
        const responsibleUser = users.find(u => u.id === newTask.responsibleId);
        if (responsibleUser) {
          addNotification(`Tarea '${newTask.title}' asignada a ${responsibleUser.name}.`, NotificationType.Info, () => handleNavigateToTask(newTask.id));
        }
    } else {
        addNotification(`Idea añadida al Backlog: '${newTask.title}'`, NotificationType.Success);
    }
  };

  const handlePromoteTaskClick = (task: Task) => {
      setTaskToPromote(task);
      setAddTaskModalOpen(true);
  };

  const handleUpdatePromotedTask = (updatedTask: Task) => {
      updateTask(updatedTask);
      setAddTaskModalOpen(false);
      setTaskToPromote(null);
      addNotification(`¡Tarea promovida al tablero!`, NotificationType.Success, () => handleNavigateToTask(updatedTask.id));
  };

  const handleVoiceCommand = async (transcript: string) => {
    if (isGuest || !transcript) return;

    try {
      const { title, description, projectId, responsibleId } = await parseTaskFromVoice(transcript, projects, users);
      
      let finalResponsibleId = responsibleId;
      if (!finalResponsibleId) {
          finalResponsibleId = userProfile?.sub || '';
      }
      const responsibleUser = users.find(u => u.id === finalResponsibleId);

      let finalProjectId = projectId;
      if (!finalProjectId) {
          finalProjectId = filterProjectId !== 'ALL' ? filterProjectId : (projects[0]?.id || 'default');
      }

      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: title || "Nueva tarea por voz",
        description: description || `Creada por voz: "${transcript}"`,
        projectId: finalProjectId,
        status: TaskStatus.ToDo,
        responsibleId: finalResponsibleId || '',
        subtasks: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
        order: tasks.length
      };

      setTasks(prev => [...prev, newTask]);
      addNotification(`Tarea creada: "${newTask.title}" ${responsibleUser ? `asignada a ${responsibleUser.name}` : ''}`, NotificationType.Success, () => handleNavigateToTask(newTask.id));

    } catch (error) {
      console.error("Voice command failed:", error);
      addNotification("No se pudo procesar el comando de voz.", NotificationType.Info);
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    if (isGuest) return;
    
    const destinationTasks = tasks.filter(t => t.status === newStatus);
    moveTask(taskId, newStatus, destinationTasks.length);

    const task = tasks.find(t => t.id === taskId);
    if (task && newStatus === TaskStatus.Done && task.status !== TaskStatus.Done) {
        const responsibleUser = users.find(u => u.id === task.responsibleId);
        addNotification(`¡Tarea '${task.title}' completada${responsibleUser ? ` por ${responsibleUser.name}` : ''}!`, NotificationType.Success, () => handleNavigateToTask(task.id));
    }
  };

  // Function to restore from history
  const handleRestoreTask = (taskId: string) => {
      if (isGuest) return;
      // Restore to 'Done' status
      updateTaskStatus(taskId, TaskStatus.Done);
      addNotification("Tarea restaurada al tablero.", NotificationType.Info);
  };

  const updateTask = (updatedTask: Task) => {
    if (isGuest) return;
    const originalTask = tasks.find(t => t.id === updatedTask.id);
    if (!originalTask) return;

    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));

    if (originalTask.responsibleId !== updatedTask.responsibleId && updatedTask.status !== TaskStatus.Backlog && updatedTask.status !== TaskStatus.Archived) {
      const newUser = users.find(u => u.id === updatedTask.responsibleId);
      if (newUser) {
        addNotification(`Tarea '${updatedTask.title}' reasignada a ${newUser.name}.`, NotificationType.Info, () => handleNavigateToTask(updatedTask.id));
      }
    }
  };

  const deleteTask = (taskId: string) => {
      if (isGuest) return;
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };
  
  const handleGenerateSubtasks = async (taskId: string) => {
    if (isGuest) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const project = projects.find(p => p.id === task.projectId);

    try {
        const subtasksText = await generateSubtasks(task.title, task.description, project?.description);
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
    if (isGuest) return;
    const newProject: Project = { ...projectData, id: `proj-${Date.now()}` };
    setProjects(prev => [...prev, newProject]);
  };
  
  const updateProject = (updatedProject: Project) => {
    if (isGuest) return;
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };
  
  const deleteProject = (projectId: string) => {
    if (isGuest) return;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
  };
  
  const deleteUser = (userId: string) => {
    if (isGuest) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addMessage = (text: string, taskId?: string) => {
    if (isGuest) return;
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
    if (isGuest) return;
    setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
  };

  const deleteMessage = (messageId: string) => {
    if (isGuest) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleExport = async () => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);
    try {
        await exportDashboardAsPDF(filteredTasks, projects, users, exportContainerRef.current);
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
  
  if (!personalWorkspace || !isWorkspacesListLoaded) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D85929]"></div>
        </div>
    );
  }

  if (!selectedWorkspaceId) {
      return (
          <WorkspaceSelector 
              user={{...userProfile, id: userProfile.sub, avatarColor: '#4A90E2', email: userProfile.email}}
              personalWorkspace={personalWorkspace}
              collaborativeWorkspaces={collaborativeWorkspaces}
              onSelectWorkspace={handleSelectWorkspace}
              onLogout={handleLogout}
              onAddWorkspace={(name, creator) => addCollaborativeWorkspace(name, creator)}
              onUpdateWorkspace={updateWorkspace}
              onDeleteWorkspace={deleteWorkspace}
              onReorderWorkspaces={reorderWorkspaces}
              isReadOnly={isGuest}
          />
      );
  }
  
  if (!isDataLoaded || !currentUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D85929]"></div>
            <p className="text-lg text-gray-600 animate-pulse">Cargando espacio de trabajo...</p>
        </div>
    );
  }

  const currentWorkspace = [...collaborativeWorkspaces, personalWorkspace].find(w => w?.id === selectedWorkspaceId);
  
  if (!currentWorkspace) {
      handleChangeWorkspace();
      return null;
  }

  const NotificationBell = () => (
      <div className="relative" ref={notificationMenuRef}>
        <button 
          onClick={() => {
            if (!isNotificationHistoryOpen) {
                markAllAsRead();
            }
            setNotificationHistoryOpen(prev => !prev);
          }}
          className="p-2 text-gray-500 hover:text-[#D85929] hover:bg-orange-100 rounded-full transition-colors relative"
          aria-label={`${unreadCount > 0 ? unreadCount : 'No'} unread notifications`}
        >
          <BellIcon className="w-6 h-6" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}
        </button>
        {isNotificationHistoryOpen && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border z-20">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notificationHistory.length > 0 ? (
                notificationHistory.map(notif => (
                  <div key={notif.id} onClick={notif.onClick} className={`flex items-start gap-3 p-3 border-b last:border-b-0 ${notif.onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${!notif.read ? 'bg-blue-50' : ''}`}>
                    <div className={`${notif.type === NotificationType.Success ? 'text-green-500' : 'text-blue-500'} mt-1`}>
                      {notif.type === NotificationType.Success ? <CheckCircleIcon className="w-5 h-5" /> : <InfoCircleIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{notif.message}</p>
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

  const areAllVisibleCollapsed = filteredTasks.length > 0 && filteredTasks.every(t => collapsedTaskIds.has(t.id));

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="p-3 sm:p-4 flex justify-between items-center">
          
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Logo className="h-6 text-[9px] sm:h-8 sm:text-base md:h-10 md:text-lg flex-shrink-0" />
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="min-w-0 flex-1 sm:flex-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded bg-gray-100 text-xs sm:text-sm flex-shrink-0">
                    {currentWorkspace.icon || (currentWorkspace.isPersonal ? '🏠' : '👥')}
                </div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800 truncate max-w-[100px] sm:max-w-none min-w-0 py-1 leading-relaxed">{currentWorkspace?.name}</h1>
                 {isFirebaseConfigured ? (
                     <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full border border-green-200 font-semibold hidden md:inline-block">SUPABASE</span>
                 ) : (
                     <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full border border-gray-300 font-semibold hidden md:inline-block">LOCAL</span>
                 )}
                 {isGuest && (
                    <span className="px-2 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full border border-orange-200 font-bold hidden md:inline-block">INVITADO</span>
                 )}
              </div>
              <button
                  onClick={handleChangeWorkspace}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#D85929] font-medium mt-0.5"
              >
                  <SwitchIcon className="w-3 h-3"/> 
                  <span className="hidden sm:inline">Cambiar Espacio</span>
                  <span className="sm:hidden">Cambiar</span>
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5" title="Filtrar por proyecto">
                   <FilterIcon className="w-4 h-4 text-gray-500" />
                   <select 
                       value={filterProjectId}
                       onChange={(e) => setFilterProjectId(e.target.value)}
                       className="bg-transparent border-none text-sm text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none max-w-[150px] truncate"
                   >
                       <option value="ALL">Todos los proyectos</option>
                       {projects.map(p => (
                           <option key={p.id} value={p.id}>{p.name}</option>
                       ))}
                   </select>
              </div>

              <button
                  onClick={() => setFilterAssignedToMe(!filterAssignedToMe)}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterAssignedToMe ? 'bg-blue-50 border-[#254467] text-[#254467]' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                  title="Ver solo mis tareas"
              >
                  <UserCircleIcon className="w-4 h-4" />
                  <span className="hidden lg:inline">Mis Tareas</span>
                  <span className="lg:hidden">Mío</span>
              </button>
              
              {viewMode === 'kanban' && (
                  <button 
                    onClick={handleToggleAllCollapse}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 bg-gray-50 transition-colors"
                    title={areAllVisibleCollapsed ? "Expandir todo" : "Colapsar todo"}
                  >
                      {areAllVisibleCollapsed ? <ArrowsPointingOutIcon className="w-5 h-5" /> : <ArrowsPointingInIcon className="w-5 h-5" />}
                  </button>
              )}

              <div className="flex items-center p-1 bg-gray-200 rounded-lg">
                  <button onClick={() => setViewMode('backlog')} className={`p-1 rounded-md ${viewMode === 'backlog' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Product Backlog"><ArchiveBoxIcon className="w-5 h-5"/></button>
                  <button onClick={() => setViewMode('kanban')} className={`p-1 rounded-md ${viewMode === 'kanban' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Kanban"><KanbanIcon className="w-5 h-5"/></button>
                  <button onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Lista"><ListIcon className="w-5 h-5"/></button>
                  <button onClick={() => setViewMode('metrics')} className={`p-1 rounded-md ${viewMode === 'metrics' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Métricas"><ChartIcon className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('board')} className={`p-1 rounded-md ${viewMode === 'board' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Mensajes"><MessageBoardIcon className="w-5 h-5" /></button>
                  <button onClick={() => setViewMode('history')} className={`p-1 rounded-md ${viewMode === 'history' ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`} title="Histórico"><ClockIcon className="w-5 h-5" /></button>
              </div>
              
              {!isGuest && (
                  <>
                    <button
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="p-2 text-[#D85929] bg-orange-100 hover:bg-orange-200 rounded-full transition-colors"
                      title="Añadir tarea por voz"
                    >
                      <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setTaskToPromote(null); setAddTaskModalOpen(true); }}
                      className="flex items-center gap-2 px-3 py-2 bg-[#D85929] hover:bg-[#C0481A] text-white font-semibold rounded-md transition-colors text-sm"
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>Añadir Tarea</span>
                    </button>
                  </>
              )}

              <div className="h-8 w-px bg-gray-200"></div>
              {!isGuest && (
                <button onClick={() => setAdminProjectsModalOpen(true)} className="p-2 text-gray-500 hover:text-[#254467] hover:bg-gray-100 rounded-full transition-colors" title="Administrar Proyectos y Usuarios"><SettingsIcon className="w-6 h-6"/></button>
              )}
              <button onClick={handleExport} disabled={isExporting} className="p-2 text-gray-500 hover:text-[#254467] hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50" title="Exportar Reporte PDF"><DownloadIcon className="w-6 h-6" /></button>
              <NotificationBell />
              <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="Cerrar sesión"><LogoutIcon className="w-6 h-6" /></button>
              <UserAvatar user={currentUser} />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isGuest && (
                 <span className="px-2 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full border border-orange-200 font-bold">INVITADO</span>
            )}
            {!isGuest && (
              <>
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-2 text-[#D85929] bg-orange-100 hover:bg-orange-200 rounded-full shadow-sm transition-colors"
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => { setTaskToPromote(null); setAddTaskModalOpen(true); }} 
                    className="p-2 bg-[#D85929] hover:bg-[#C0481A] text-white rounded-full shadow-sm transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
              </>
            )}
            
            <div className="relative" ref={mobileMenuRef}>
               <button onClick={() => setMobileMenuOpen(prev => !prev)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
                 <EllipsisVerticalIcon className="w-6 h-6" />
               </button>
               {isMobileMenuOpen && (
                 <div className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-xl z-20 border text-left">
                   <div className="px-4 py-2 border-b bg-gray-50">
                       <p className="font-semibold text-gray-800 text-sm truncate">{currentUser.name}</p>
                   </div>
                   <div className="px-4 py-2 border-b bg-gray-50">
                       <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FilterIcon className="w-3 h-3"/> Filtrar Proyecto</p>
                       <select 
                           value={filterProjectId}
                           onChange={(e) => setFilterProjectId(e.target.value)}
                           className="w-full bg-white border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-[#254467]"
                       >
                           <option value="ALL">Todos los proyectos</option>
                           {projects.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                       </select>
                   </div>

                   <div className="px-4 py-2 border-b bg-gray-50">
                       <button 
                           onClick={() => { setFilterAssignedToMe(!filterAssignedToMe); }}
                           className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium border transition-colors ${filterAssignedToMe ? 'bg-blue-50 border-[#254467] text-[#254467]' : 'bg-white border-gray-300 text-gray-700'}`}
                       >
                           <div className="flex items-center gap-2">
                               <UserCircleIcon className="w-4 h-4" />
                               <span>Solo Mis Tareas</span>
                           </div>
                           {filterAssignedToMe && <CheckCircleIcon className="w-4 h-4" />}
                       </button>
                   </div>

                   {viewMode === 'kanban' && (
                        <button 
                            onClick={() => { handleToggleAllCollapse(); setMobileMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                            {areAllVisibleCollapsed ? <ArrowsPointingOutIcon className="w-5 h-5" /> : <ArrowsPointingInIcon className="w-5 h-5" />}
                            {areAllVisibleCollapsed ? "Expandir todo" : "Colapsar todo"}
                        </button>
                   )}

                   {!isGuest && (
                        <button onClick={() => { setAdminProjectsModalOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"><SettingsIcon className="w-5 h-5" /> Administrar</button>
                   )}
                   <button onClick={() => { handleExport(); setMobileMenuOpen(false); }} disabled={isExporting} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 disabled:opacity-50"><DownloadIcon className="w-5 h-5" /> Exportar Reporte</button>
                   <div className="border-t my-1"></div>
                   <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><LogoutIcon className="w-5 h-5" /> Cerrar sesión</button>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="md:hidden border-t border-gray-100 bg-gray-50 p-2 px-3 flex items-center gap-3">
             <div className="flex-grow flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-1 justify-between overflow-x-auto">
                <button onClick={() => setViewMode('backlog')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'backlog' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><ArchiveBoxIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('kanban')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><KanbanIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('list')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><ListIcon className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('metrics')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'metrics' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><ChartIcon className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('board')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><MessageBoardIcon className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('history')} className={`flex-1 min-w-[40px] flex justify-center py-1.5 rounded-md transition-colors ${viewMode === 'history' ? 'bg-gray-100 text-[#D85929]' : 'text-gray-400'}`}><ClockIcon className="w-5 h-5" /></button>
             </div>
             <div className="flex-shrink-0 bg-white rounded-full shadow-sm border border-gray-200">
                <NotificationBell />
             </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 flex-grow">
        <div ref={exportContainerRef}>
          {viewMode === 'kanban' && (
            <KanbanBoard 
                tasks={filteredTasks} 
                projects={projects} 
                users={users} 
                messages={messages} 
                onUpdateTaskStatus={updateTaskStatus} 
                onUpdateTask={updateTask} 
                onGenerateSubtasks={handleGenerateSubtasks} 
                onDeleteTask={deleteTask} 
                highlightedTaskId={highlightedTaskId} 
                onNavigateToTaskMessages={handleNavigateToTaskMessages}
                collapsedTaskIds={collapsedTaskIds}
                onToggleTaskCollapse={toggleTaskCollapse}
                isReadOnly={isGuest}
                onMoveTask={moveTask} 
            />
          )}
          {viewMode === 'list' && <ListView tasks={filteredTasks} projects={projects} users={users} onUpdateTask={updateTask} />}
          {viewMode === 'metrics' && <MetricsDashboard tasks={filteredTasks} archivedTasks={historyTasks} projects={projects} users={users} />}
          {viewMode === 'board' && <MessageBoard messages={messages} users={users} tasks={filteredTasks} projects={projects} onAddMessage={addMessage} onUpdateMessage={updateMessage} onDeleteMessage={deleteMessage} onNavigateToTask={handleNavigateToTask} focusedTaskId={focusedTaskId} onClearFocus={clearFocusedTask} currentUser={userProfile} isReadOnly={isGuest} />}
          {viewMode === 'backlog' && (
             <BacklogView 
                tasks={backlogTasks} 
                projects={projects} 
                onAddTask={handleAddTask} 
                onPromoteTask={handlePromoteTaskClick} 
                onDeleteTask={deleteTask}
                isReadOnly={isGuest}
             />
          )}
          {viewMode === 'history' && (
              <HistoryView 
                  tasks={historyTasks}
                  projects={projects}
                  users={users}
                  onRestoreTask={handleRestoreTask}
                  isReadOnly={isGuest}
              />
          )}
        </div>
      </main>

      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={() => { setAddTaskModalOpen(false); setTaskToPromote(null); }}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdatePromotedTask}
        taskToPromote={taskToPromote}
        projects={projects}
        users={users}
      />
      <AdminProjectsModal 
        isOpen={isAdminProjectsModalOpen}
        onClose={() => setAdminProjectsModalOpen(false)}
        projects={projects}
        users={users}
        currentUserName={currentUser?.name || 'Un usuario'}
        currentUserEmail={userProfile?.email}
        currentWorkspaceName={currentWorkspace.name}
        onAddProject={addProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onAddUser={addUser}
        onDeleteUser={deleteUser}
      />
      <VoiceCommandModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)}
        onCommandProcessed={handleVoiceCommand}
      />
    </div>
  );
}