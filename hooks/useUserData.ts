import { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Task, User, Message, Workspace } from '../types';
import { PROJECTS, USERS, TASKS, COLLABORATIVE_WORKSPACES } from '../constants';
import { isFirebaseConfigured, subscribeToWorkspace, saveWorkspaceDataToCloud, subscribeToUserWorkspaces, authenticateWithFirebase, WorkspaceData } from '../services/firebase';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

const USER_COLORS = ['#E24A4A', '#23B2F5', '#E350D3', '#4AE29D', '#F5A623', '#4A90E2', '#8B572A', '#F78DA7'];

export const useUserData = (userProfile: UserProfile | null, workspaceId: string | null, authToken: string | null) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [personalWorkspace, setPersonalWorkspace] = useState<Workspace | null>(null);
    const [collaborativeWorkspaces, setCollaborativeWorkspaces] = useState<Workspace[]>([]);
    const [storageMode, setStorageMode] = useState<'loading' | 'cloud' | 'local'>('loading');

    // To prevent saving data that we just received from the cloud
    const isRemoteUpdate = useRef(false);

    // 1. AUTHENTICATION & MODE SELECTION
    useEffect(() => {
        if (!userProfile) return;

        const initAuth = async () => {
            if (isFirebaseConfigured) {
                const isAuthenticated = await authenticateWithFirebase(authToken);
                if (isAuthenticated) {
                    setStorageMode('cloud');
                } else {
                    console.warn("Firebase Authentication failed. Falling back to Local Storage mode.");
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
        if (!userProfile || storageMode === 'loading') return;

        let unsubscribe = () => {};

        if (storageMode === 'cloud') {
            // Cloud Mode: Subscribe to workspaces where the user is a member
            unsubscribe = subscribeToUserWorkspaces(userProfile.sub, (cloudWorkspaces) => {
                const shared = cloudWorkspaces.filter(w => !w.isPersonal);
                setCollaborativeWorkspaces(shared);
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
        }

        return () => unsubscribe();
    }, [userProfile, storageMode]);

    // Initialize Personal Workspace Object
    useEffect(() => {
        if (!userProfile) return;
        
        const personal: Workspace = {
            id: `ws-personal-${userProfile.sub}`,
            name: 'Mi Espacio de Trabajo',
            isPersonal: true,
        };
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

        setIsDataLoaded(false);
        let unsubscribe = () => {};

        const initializeDefaultData = () => {
             const isPersonal = workspaceId.startsWith('ws-personal');
             const newUser: User = {
                 id: userProfile.sub,
                 name: userProfile.name,
                 picture: userProfile.picture,
                 avatarColor: USER_COLORS[USERS.length % USER_COLORS.length],
             };

             if (isPersonal) {
                 setTasks(TASKS);
                 setProjects(PROJECTS);
                 setUsers([newUser, ...USERS]);
                 setMessages([]);
             } else {
                 const workspace = collaborativeWorkspaces.find(w => w.id === workspaceId);
                 setTasks([]);
                 setProjects([]);
                 setUsers(workspace?.members || [newUser]);
                 setMessages([]);
             }
             setIsDataLoaded(true);
        };

        // Safety timeout: If data loading takes too long (e.g. 7s), force initialization to prevent hanging
        const safetyTimer = setTimeout(() => {
            if (!isDataLoaded) {
                 console.warn("Workspace data load timed out. Force initializing.");
                 initializeDefaultData();
            }
        }, 7000);


        if (storageMode === 'cloud') {
            // CLOUD MODE
            setIsSyncing(true);
            console.log(`Subscribing to cloud workspace: ${workspaceId}`);
            
            unsubscribe = subscribeToWorkspace(workspaceId, (data) => {
                if (data) {
                    // We received data from cloud
                    isRemoteUpdate.current = true;

                    // Ensure the current user is in the users list immediately
                    let fetchedUsers = data.users || [];
                    const userExists = fetchedUsers.some(u => u.id === userProfile.sub);
                    
                    if (!userExists) {
                         const newUser = {
                            id: userProfile.sub,
                            name: userProfile.name,
                            picture: userProfile.picture,
                            avatarColor: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
                        };
                        fetchedUsers = [...fetchedUsers, newUser];
                    }

                    setTasks(data.tasks || []);
                    setProjects(data.projects || []);
                    setUsers(fetchedUsers);
                    setMessages(data.messages || []);

                    clearTimeout(safetyTimer);
                    setTimeout(() => { isRemoteUpdate.current = false; }, 100);
                    setIsDataLoaded(true);
                } else {
                    // Document doesn't exist or error occurred (returns null)
                    console.log("Workspace does not exist in cloud (or error). Initializing defaults...");
                    clearTimeout(safetyTimer);
                    initializeDefaultData();
                }
                setIsSyncing(false);
            });
        } else {
            // LOCAL STORAGE MODE
            clearTimeout(safetyTimer); // Local load is immediate
            if (localStorageKey) {
                try {
                    const storedData = window.localStorage.getItem(localStorageKey);
                    if (storedData) {
                        const data: WorkspaceData = JSON.parse(storedData);
                        setTasks(data.tasks || []);
                        setProjects(data.projects || []);
                        setMessages(data.messages || []);
                        
                        const userExists = data.users.some(u => u.id === userProfile.sub);
                        let currentUsers = data.users;
                        if (!userExists) {
                            const newUser: User = {
                                id: userProfile.sub,
                                name: userProfile.name,
                                picture: userProfile.picture,
                                avatarColor: USER_COLORS[data.users.length % USER_COLORS.length],
                            };
                            currentUsers = [...data.users, newUser];
                        }
                         setUsers(currentUsers.map(u => 
                            u.id === userProfile.sub ? { ...u, name: userProfile.name, picture: userProfile.picture } : u
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
    }, [workspaceId, userProfile, localStorageKey, collaborativeWorkspaces, storageMode]);


    // 4. SAVE DATA
    useEffect(() => {
        if (!isDataLoaded || !workspaceId || storageMode === 'loading') return;
        if (isRemoteUpdate.current) return; 

        const dataToStore: WorkspaceData = { tasks, projects, users, messages };

        const saveData = async () => {
            if (storageMode === 'cloud') {
                await saveWorkspaceDataToCloud(workspaceId, dataToStore);
            } else if (localStorageKey) {
                window.localStorage.setItem(localStorageKey, JSON.stringify(dataToStore));
            }
        };

        const timer = setTimeout(saveData, 500);
        return () => clearTimeout(timer);

    }, [tasks, projects, users, messages, isDataLoaded, workspaceId, localStorageKey, storageMode]);


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
            picture: creator.picture
        };

        const newWorkspace: Workspace = {
            id: `ws-collab-${Date.now()}`,
            name,
            isPersonal: false,
            members: [creatorAsMember]
        };
        
        if (storageMode === 'cloud') {
             saveWorkspaceDataToCloud(newWorkspace.id, {
                 tasks: [],
                 projects: [],
                 users: [creatorAsMember],
                 messages: [],
                 name: name, 
                 isPersonal: false
             });
        } else {
            const updatedWorkspaces = [...collaborativeWorkspaces, newWorkspace];
            setCollaborativeWorkspaces(updatedWorkspaces);
            window.localStorage.setItem('scrum_collaborative_workspaces', JSON.stringify(updatedWorkspaces));
        }
    };

    return {
        tasks, setTasks,
        projects, setProjects,
        users, setUsers,
        messages, setMessages,
        isDataLoaded,
        personalWorkspace,
        collaborativeWorkspaces,
        addCollaborativeWorkspace,
        isFirebaseConfigured: storageMode === 'cloud'
    };
};