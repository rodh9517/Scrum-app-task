
import { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Task, User, Message, Workspace, NotificationType, TaskStatus } from '../types';
import { PROJECTS, USERS, TASKS, COLLABORATIVE_WORKSPACES } from '../constants';
import { isSupabaseConfigured, subscribeToWorkspace, saveWorkspaceDataToCloud, subscribeToUserWorkspaces, authenticateWithSupabase, WorkspaceData, deleteUserFromWorkspace } from '../services/supabase';
import { repairMojibake } from '../utils/stringUtils'; // Import helper

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

const USER_COLORS = ['#E24A4A', '#23B2F5', '#E350D3', '#4AE29D', '#F5A623', '#4A90E2', '#8B572A', '#F78DA7'];

export const useUserData = (
    userProfile: UserProfile | null, 
    workspaceId: string | null, 
    authToken: string | null,
    addNotification?: (message: string, type: NotificationType) => void
) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isWorkspacesListLoaded, setIsWorkspacesListLoaded] = useState(false);
    
    const [personalWorkspace, setPersonalWorkspace] = useState<Workspace | null>(null);
    const [collaborativeWorkspaces, setCollaborativeWorkspaces] = useState<Workspace[]>([]);
    const [storageMode, setStorageMode] = useState<'loading' | 'cloud' | 'local'>('loading');

    // To prevent saving data that we just received from the cloud
    const isRemoteUpdate = useRef(false);
    
    // To prevent cloud subscriptions from overwriting local optimistic updates while saving
    const pendingLocalChanges = useRef(false);

    // Track previous tasks to detect assignments
    const previousTasksRef = useRef<Task[]>([]);
    const initialCloudLoadRef = useRef(true);

    // Reference to collaborative workspaces to use in fallback logic without triggering effects
    const collaborativeWorkspacesRef = useRef(collaborativeWorkspaces);

    useEffect(() => {
        collaborativeWorkspacesRef.current = collaborativeWorkspaces;
    }, [collaborativeWorkspaces]);

    // 1. AUTHENTICATION & MODE SELECTION
    useEffect(() => {
        if (!userProfile) return;

        const initAuth = async () => {
            if (isSupabaseConfigured) {
                const isAuthenticated = await authenticateWithSupabase();
                if (isAuthenticated) {
                    setStorageMode('cloud');
                } else {
                    console.warn("Supabase Authentication failed/not configured. Falling back to Local Storage Mode.");
                    setStorageMode('local');
                }
            } else {
                setStorageMode('local');
            }
        };

        initAuth();
    }, [userProfile, authToken]);

    
    // 2. LOAD WORKSPACES LIST
    useEffect(() => {
        if (!userProfile || storageMode === 'loading') {
            setIsWorkspacesListLoaded(false);
            return;
        }

        let unsubscribe = () => {};

        if (storageMode === 'cloud') {
            // Cloud Mode: Subscribe to workspaces where the user is a member (by ID or Email)
            unsubscribe = subscribeToUserWorkspaces(userProfile.sub, userProfile.email, (cloudWorkspaces) => {
                const shared = cloudWorkspaces.filter(w => !w.isPersonal).sort((a, b) => (a.order || 0) - (b.order || 0));
                
                setCollaborativeWorkspaces(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(shared)) {
                        return prev;
                    }
                    return shared;
                });
                setIsWorkspacesListLoaded(true);
            });
        } else {
            // Local Mode: Load from localStorage
            try {
                const storedWorkspaces = window.localStorage.getItem('scrum_collaborative_workspaces');
                if (storedWorkspaces) {
                    setCollaborativeWorkspaces(JSON.parse(storedWorkspaces));
                } else {
                    window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(COLLABORATIVE_WORKSPACES));
                    setCollaborativeWorkspaces(COLLABORATIVE_WORKSPACES);
                }
            } catch (error) {
                console.error("Failed to load collaborative workspaces:", error);
                setCollaborativeWorkspaces(COLLABORATIVE_WORKSPACES);
            }
            setIsWorkspacesListLoaded(true);
        }

        return () => unsubscribe();
    }, [userProfile, storageMode]);

    // Initialize Personal Workspace Object
    useEffect(() => {
        if (!userProfile) return;
        
        // Load personal workspace metadata from localstorage if exists to persist customizations
        const storedPersonal = localStorage.getItem(`scrum_personal_meta_${userProfile.sub}`);
        let personal: Workspace;

        if (storedPersonal) {
             personal = JSON.parse(storedPersonal);
        } else {
             personal = {
                id: `ws-personal-${userProfile.sub}`,
                name: 'Mi Espacio de Trabajo',
                isPersonal: true,
                icon: '🏠',
                theme: '#254467'
            };
        }
        setPersonalWorkspace(personal);
    }, [userProfile]);

    const localStorageKey = useMemo(() => {
        if (!userProfile || !workspaceId) return null;
        const isPersonal = workspaceId.startsWith('ws-personal-');
        return isPersonal ? `scrum_data_${userProfile.sub}_${workspaceId}` : `scrum_data_${workspaceId}`;
    }, [userProfile, workspaceId]);

    // 3. LOAD WORKSPACE DATA
    useEffect(() => {
        if (!userProfile || !workspaceId || storageMode === 'loading') {
            setIsDataLoaded(false);
            return;
        }

        // Reset notification tracking state when workspace changes
        previousTasksRef.current = [];
        initialCloudLoadRef.current = true;
        pendingLocalChanges.current = false;

        setIsDataLoaded(false);
        let unsubscribe = () => {};

        const initializeDefaultData = () => {
             const isPersonal = workspaceId.startsWith('ws-personal');
             const newUser: User = {
                 id: userProfile.sub,
                 name: userProfile.name,
                 picture: userProfile.picture,
                 avatarColor: USER_COLORS[USERS.length % USER_COLORS.length],
                 email: userProfile.email
             };

             if (isPersonal) {
                 setTasks(TASKS.map((t, i) => ({ ...t, order: i })));
                 setProjects(PROJECTS);
                 setUsers([newUser, ...USERS]);
                 setMessages([]);
             } else {
                 // For new collaborative workspaces locally
                 const workspace = collaborativeWorkspacesRef.current.find(w => w.id === workspaceId);
                 setTasks([]);
                 setProjects([]);
                 setUsers(workspace?.members || [newUser]);
                 setMessages([]);
             }
             setIsDataLoaded(true);
        };

        // Safety timeout
        const safetyTimer = setTimeout(() => {
            if (!isDataLoaded) {
                 if (storageMode === 'local') {
                     console.warn("Local workspace data load timed out. Force initializing.");
                     initializeDefaultData();
                 } else {
                     console.warn("Cloud workspace load timed out. Keeping loading state to prevent overwrite.");
                 }
            }
        }, 7000);


        if (storageMode === 'cloud') {
            // CLOUD MODE
            setIsSyncing(true);
            console.log(`Subscribing to cloud workspace: ${workspaceId}`);
            
            unsubscribe = subscribeToWorkspace(workspaceId, (data) => {
                if (data) {
                    // CRITICAL FIX: Prevent cloud data from overwriting local state if we have pending changes (optimistic UI)
                    if (pendingLocalChanges.current) {
                        return;
                    }

                    // We received data from cloud
                    isRemoteUpdate.current = true;
                    
                    let fetchedUsers: User[] = data.users || [];
                    let fetchedTasks: Task[] = data.tasks || [];
                    let fetchedProjects: Project[] = data.projects || [];
                    let fetchedMessages: Message[] = data.messages || [];

                    // FIX: Repair UTF-8 encoding artifacts in user names loaded from cloud
                    fetchedUsers = fetchedUsers.map(u => ({ ...u, name: repairMojibake(u.name) }));
                    
                    // --- NOTIFICATION LOGIC ---
                    if (addNotification && userProfile) {
                        // Use a properly typed map to track previous tasks
                        const previousTasksMap = new Map<string, Task>();
                        previousTasksRef.current.forEach(t => previousTasksMap.set(t.id, t));
                        
                        fetchedTasks.forEach((newTask: Task) => {
                            // Only monitor assignments for current user
                            if (newTask.responsibleId === userProfile.sub) {
                                const oldTask = previousTasksMap.get(newTask.id);
                                
                                // Trigger if:
                                // 1. Task is new (didn't exist before) AND it's not the initial load
                                // 2. Task existed but I wasn't responsible before
                                const isNewAssignment = !oldTask;
                                const isReassignment = oldTask && oldTask.responsibleId !== userProfile.sub;
                                
                                if ((isNewAssignment || isReassignment) && !initialCloudLoadRef.current) {
                                    addNotification(`Te han asignado la tarea: "${newTask.title}"`, NotificationType.Info);
                                }
                            }
                        });
                    }
                    
                    previousTasksRef.current = fetchedTasks;
                    if (initialCloudLoadRef.current) initialCloudLoadRef.current = false;
                    // --- END NOTIFICATION LOGIC ---

                    // --- IDENTITY RECONCILIATION LOGIC ---
                    const invitedUserIndex = fetchedUsers.findIndex(u => 
                        u.email === userProfile.email && u.id !== userProfile.sub
                    );

                    if (invitedUserIndex !== -1) {
                        console.log("Found invited user match! Migrating ID to enable collaboration...");
                        const oldId = fetchedUsers[invitedUserIndex].id;
                        const newId = userProfile.sub;

                        // 1. Update User Object
                        fetchedUsers[invitedUserIndex] = {
                            ...fetchedUsers[invitedUserIndex],
                            id: newId,
                            name: userProfile.name, 
                            picture: userProfile.picture 
                        };

                        // 2. Update Assignments in Projects
                        fetchedProjects = fetchedProjects.map(p => ({
                            ...p,
                            responsibleIds: p.responsibleIds.map(rid => rid === oldId ? newId : rid)
                        }));

                        // 3. Update Assignments in Tasks
                        fetchedTasks = fetchedTasks.map(t => ({
                            ...t,
                            responsibleId: t.responsibleId === oldId ? newId : t.responsibleId
                        }));

                        // 4. Update Messages
                        fetchedMessages = fetchedMessages.map(m => ({
                            ...m,
                            userId: m.userId === oldId ? newId : m.userId
                        }));

                        setTimeout(() => {
                            saveWorkspaceDataToCloud(workspaceId, {
                                tasks: fetchedTasks,
                                projects: fetchedProjects,
                                users: fetchedUsers,
                                messages: fetchedMessages,
                                name: data.name,
                                isPersonal: data.isPersonal,
                                icon: data.icon,
                                theme: data.theme,
                                order: data.order
                            });
                        }, 1000);
                    }
                    // --- END RECONCILIATION ---
                    
                    const userExists = fetchedUsers.some(u => u.id === userProfile.sub);
                    if (!userExists) {
                         const newUser = {
                            id: userProfile.sub,
                            name: userProfile.name,
                            picture: userProfile.picture,
                            avatarColor: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
                            email: userProfile.email
                        };
                        fetchedUsers = [...fetchedUsers, newUser];
                    }

                    setTasks(fetchedTasks);
                    setProjects(fetchedProjects);
                    setUsers(fetchedUsers);
                    setMessages(fetchedMessages);

                    clearTimeout(safetyTimer);
                    setTimeout(() => { isRemoteUpdate.current = false; }, 100);
                    setIsDataLoaded(true);
                } else {
                    // Document doesn't exist (New Workspace)
                    clearTimeout(safetyTimer);
                    initializeDefaultData();
                }
                setIsSyncing(false);
            });
        } else {
            // LOCAL STORAGE MODE
            clearTimeout(safetyTimer); 
            if (localStorageKey) {
                try {
                    const storedData = window.localStorage.getItem(localStorageKey);
                    if (storedData) {
                        const data: WorkspaceData = JSON.parse(storedData);
                        setTasks(data.tasks || []);
                        setProjects(data.projects || []);
                        setMessages(data.messages || []);
                        
                        let currentUsers = data.users || [];
                        currentUsers = currentUsers.map(u => ({ ...u, name: repairMojibake(u.name) }));

                        const userExists = currentUsers.some(u => u.id === userProfile.sub);
                        
                        if (!userExists) {
                            const newUser: User = {
                                id: userProfile.sub,
                                name: userProfile.name,
                                picture: userProfile.picture,
                                avatarColor: USER_COLORS[currentUsers.length % USER_COLORS.length],
                                email: userProfile.email
                            };
                            currentUsers = [...currentUsers, newUser];
                        }
                         setUsers(currentUsers.map(u => 
                            u.id === userProfile.sub ? { ...u, name: userProfile.name, picture: userProfile.picture, email: userProfile.email } : u
                        ));
                        setIsDataLoaded(true);
                    } else {
                        initializeDefaultData();
                    }
                } catch (e) {
                    initializeDefaultData();
                }
            }
        }

        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, [workspaceId, userProfile, localStorageKey, storageMode]); 


    // 4. SAVE DATA
    useEffect(() => {
        if (!isDataLoaded || !workspaceId || storageMode === 'loading') return;
        if (isRemoteUpdate.current) return; 

        // CRITICAL FIX: Mark that we have local changes pending.
        pendingLocalChanges.current = true;

        // FIX FOR NOTIFICATION LOOP:
        // Update previousTasksRef with our local changes immediately.
        // This ensures that when the cloud echoes this data back, we don't compare against stale data
        // and trigger false "New Assignment" notifications for actions we just performed ourselves.
        previousTasksRef.current = tasks;

        // Determine current workspace details
        let wsDetails: Workspace | undefined;
        if (personalWorkspace?.id === workspaceId) {
            wsDetails = personalWorkspace;
        } else {
            wsDetails = collaborativeWorkspacesRef.current.find(w => w.id === workspaceId);
        }

        const dataToStore: WorkspaceData = { 
            tasks, 
            projects, 
            users, 
            messages, 
            name: wsDetails?.name || 'Workspace', 
            isPersonal: wsDetails?.isPersonal || false,
            icon: wsDetails?.icon,
            theme: wsDetails?.theme,
            order: wsDetails?.order
        };

        const saveData = async () => {
            try {
                if (storageMode === 'cloud') {
                    await saveWorkspaceDataToCloud(workspaceId, dataToStore);
                } else if (localStorageKey) {
                    window.localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
                }
            } catch (e) {
                console.error("Error saving workspace data:", e);
            } finally {
                // Allow a small buffer before accepting remote updates again 
                // to ensure the "echo" from our own save is processed or skipped safely.
                // Increased to 500ms to be safer against latency
                setTimeout(() => {
                    pendingLocalChanges.current = false;
                }, 500);
            }
        };

        const timer = setTimeout(saveData, 500);
        return () => clearTimeout(timer);

    }, [tasks, projects, users, messages, isDataLoaded, workspaceId, localStorageKey, storageMode, personalWorkspace]);


    // 5. LOCAL SYNC (Only for Local Mode)
    useEffect(() => {
        if (storageMode !== 'local' || !localStorageKey) return;

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === localStorageKey && event.newValue) {
                try {
                    const data: WorkspaceData = JSON.parse(event.newValue);
                    setTasks(data.tasks || []);
                    setProjects(data.projects || []);
                    setUsers(data.users || []);
                    setMessages(data.messages || []);
                } catch (error) {
                    console.error("Failed to parse updated workspace data:", error);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [localStorageKey, storageMode]);


    const addCollaborativeWorkspace = (name: string, creator: User) => {
        const creatorAsMember = {
            id: creator.id,
            name: creator.name,
            avatarColor: creator.avatarColor,
            picture: creator.picture,
            email: creator.email
        };

        const newWorkspaceId = `ws-collab-${Date.now()}`;

        const newWorkspace: Workspace = {
            id: newWorkspaceId,
            name,
            isPersonal: false,
            members: [creatorAsMember],
            order: collaborativeWorkspaces.length,
            icon: '🚀',
            theme: '#4A90E2'
        };
        
        if (storageMode === 'cloud') {
             saveWorkspaceDataToCloud(newWorkspaceId, {
                 tasks: [],
                 projects: [],
                 users: [creatorAsMember],
                 messages: [],
                 name: name, 
                 isPersonal: false,
                 order: collaborativeWorkspaces.length,
                 icon: '🚀',
                 theme: '#4A90E2'
             });
             setCollaborativeWorkspaces(prev => [...prev, newWorkspace]);

        } else {
            const updatedWorkspaces = [...collaborativeWorkspaces, newWorkspace];
            setCollaborativeWorkspaces(updatedWorkspaces);
            window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(updatedWorkspaces));
        }
    };

    const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
        // Update Personal
        if (personalWorkspace && personalWorkspace.id === id) {
            const updated = { ...personalWorkspace, ...updates };
            setPersonalWorkspace(updated);
            localStorage.setItem(`scrum_personal_meta_${userProfile?.sub}`, JSON.stringify(updated));
            return;
        }

        // Update Collaborative
        const updatedWorkspaces = collaborativeWorkspaces.map(ws => 
            ws.id === id ? { ...ws, ...updates } : ws
        );
        setCollaborativeWorkspaces(updatedWorkspaces); // Optimistic update

        if (storageMode === 'cloud') {
             // We rely on local state update triggering a re-render or separate management.
        } else {
            window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(updatedWorkspaces));
        }
    };

    const deleteWorkspace = async (id: string) => {
         // Optimistic update for UI
         const updatedWorkspaces = collaborativeWorkspaces.filter(ws => ws.id !== id);
         setCollaborativeWorkspaces(updatedWorkspaces);

         if (storageMode === 'cloud' && userProfile) {
            // Call database to remove user or delete workspace
            await deleteUserFromWorkspace(id, userProfile.sub);
         } else if (storageMode === 'local') {
             window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(updatedWorkspaces));
             window.localStorage.removeItem(`scrum_data_${id}`);
         }
    };

    const reorderWorkspaces = (newOrder: Workspace[]) => {
        const ordered = newOrder.map((ws, index) => ({ ...ws, order: index }));
        setCollaborativeWorkspaces(ordered);
        
        if (storageMode === 'local') {
            window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(ordered));
        }
    };


    const addUser = (name: string, email?: string) => {
        const newUser: User = {
          id: `user-${Date.now()}`,
          name,
          avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          email
        };
        setUsers(prev => [...prev, newUser]);
    };

    // Handle Task Move and Reorder
    const moveTask = (taskId: string, newStatus: TaskStatus, newIndex: number) => {
        setTasks(prevTasks => {
            const taskToMove = prevTasks.find(t => t.id === taskId);
            if (!taskToMove) return prevTasks;

            // 1. Remove task from current list
            const otherTasks = prevTasks.filter(t => t.id !== taskId);

            // 2. Get tasks in the destination column
            const destColumnTasks = otherTasks
                .filter(t => t.status === newStatus)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            // 3. Insert the task at the new index
            // Ensure index is within bounds
            const safeIndex = Math.max(0, Math.min(newIndex, destColumnTasks.length));
            
            // Create the updated task with new status
            // LOGIC FIX: Set completedAt if moving TO Done. Clear completedAt if moving FROM Done to something else.
            const updatedTask = { 
                ...taskToMove, 
                status: newStatus,
                completedAt: newStatus === TaskStatus.Done 
                    ? (taskToMove.completedAt || new Date().toISOString()) 
                    : null
            };
            
            // Insert into the destination array
            destColumnTasks.splice(safeIndex, 0, updatedTask);

            // 4. Re-assign order based on new array position
            const updatedDestColumn = destColumnTasks.map((t, index) => ({
                ...t,
                order: index
            }));

            // 5. Combine back with tasks from other columns
            const finalTasks = [
                ...otherTasks.filter(t => t.status !== newStatus), // Tasks in other columns
                ...updatedDestColumn // Updated destination column
            ];

            return finalTasks;
        });
    };

    return {
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
        isFirebaseConfigured: storageMode === 'cloud',
        addUser,
        moveTask // Export the new function
    };
};
