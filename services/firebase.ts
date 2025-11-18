import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, onSnapshot, setDoc, collection, query, where } from "firebase/firestore";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithCredential, onAuthStateChanged } from "firebase/auth";
import { Workspace, Task, Project, User, Message } from "../types";

// Configuration provided for the application
const firebaseConfig = {
  apiKey: "AIzaSyAavBWT3wxO1pEZMCSMCKRp_a4YxRhLTpE",
  authDomain: "scrum-task-dashboard-vg.firebaseapp.com",
  databaseURL: "https://scrum-task-dashboard-vg-default-rtdb.firebaseio.com",
  projectId: "scrum-task-dashboard-vg",
  storageBucket: "scrum-task-dashboard-vg.firebasestorage.app",
  messagingSenderId: "875762207382",
  appId: "1:875762207382:web:1f41fbd667073d7a1290b7",
  measurementId: "G-MNZQRW2PTZ"
};

export const isFirebaseConfigured = true;

let db: any = null;
let auth: any = null;
let analytics: any = null;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    analytics = getAnalytics(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Authenticate with Firebase: Try Persistence -> Google Credential -> Anonymous -> Fail
export const authenticateWithFirebase = (googleToken?: string | null): Promise<boolean> => {
    if (!auth) return Promise.resolve(false);

    const authPromise = new Promise<boolean>((resolve) => {
        // 1. Check if a session already exists (persisted from previous run)
        const unsubscribe = onAuthStateChanged(auth, (user: any) => {
            unsubscribe(); // One-time check
            
            if (user) {
                console.log("Firebase: Restored existing session.");
                resolve(true);
                return;
            }

            // 2. If we have a Google Token (and it's not our dev/guest bypass), try signing in with it
            const isDevToken = googleToken && googleToken.endsWith("dev-signature-bypass");
            
            if (googleToken && !isDevToken) {
                 const credential = GoogleAuthProvider.credential(googleToken);
                 signInWithCredential(auth, credential)
                    .then(() => {
                        console.log("Firebase: Signed in with Google Credential.");
                        resolve(true);
                    })
                    .catch((e: any) => {
                        console.warn("Firebase Google Auth failed, falling back to Anonymous:", e);
                        attemptAnonymous(resolve);
                    });
            } else {
                // 3. Guest user or no token, try anonymous
                attemptAnonymous(resolve);
            }
        });
    });

    // Add a 5-second timeout to prevent hanging on slow networks/initialization
    const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
            console.warn("Firebase Auth timed out. Defaulting to local mode.");
            resolve(false);
        }, 5000);
    });

    return Promise.race([authPromise, timeoutPromise]);
};

const attemptAnonymous = (resolve: (success: boolean) => void) => {
    if (!auth) { resolve(false); return; }
    signInAnonymously(auth)
        .then(() => {
            console.log("Firebase: Signed in anonymously.");
            resolve(true);
        })
        .catch((e: any) => {
            // Handle specific error codes that indicate configuration issues
            if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
                console.warn("Firebase: Anonymous auth is disabled in the Console. Falling back to Local Storage Mode.");
            } else {
                console.error("Firebase Auth Error:", e.code, e.message);
            }
            // Resolve false ensures the app continues in 'local' mode without breaking
            resolve(false);
        });
};


export interface WorkspaceData {
    tasks: Task[];
    projects: Project[];
    users: User[];
    messages: Message[];
    lastUpdated?: number;
    // Metadata for workspace discovery
    name?: string;
    isPersonal?: boolean;
    memberIds?: string[]; 
}

export const subscribeToWorkspace = (workspaceId: string, callback: (data: WorkspaceData | null) => void) => {
    if (!db) return () => {};
    
    const docRef = doc(db, "workspaces", workspaceId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as WorkspaceData);
        } else {
            callback(null);
        }
    }, (error: any) => {
        console.error("Firebase snapshot error:", error);
        // IMPORTANT: Call callback with null so the app initializes defaults instead of hanging
        callback(null);
    });

    return unsubscribe;
};

export const subscribeToUserWorkspaces = (userId: string, callback: (workspaces: Workspace[]) => void) => {
    if (!db) return () => {};

    const q = query(collection(db, "workspaces"), where("memberIds", "array-contains", userId));
    
    return onSnapshot(q, (querySnapshot: any) => {
        const workspaces: Workspace[] = [];
        querySnapshot.forEach((doc: any) => {
            const data = doc.data() as WorkspaceData;
            if (data.name) { 
                 workspaces.push({
                    id: doc.id,
                    name: data.name,
                    isPersonal: !!data.isPersonal,
                    members: data.users
                });
            }
        });
        callback(workspaces);
    }, (error: any) => {
        // If permission denied (likely due to auth failing earlier), we just return empty list
        console.warn("Could not fetch cloud workspaces (Permissions or Auth). Using local only.");
    });
};

export const saveWorkspaceDataToCloud = async (workspaceId: string, data: WorkspaceData) => {
    if (!db) return;
    
    try {
        const docRef = doc(db, "workspaces", workspaceId);
        
        const payload: any = {
            ...data,
            lastUpdated: Date.now()
        };

        if (data.users) {
            payload.memberIds = data.users.map(u => u.id);
        }

        await setDoc(docRef, payload, { merge: true });
    } catch (error) {
        console.error("Error saving to Firebase:", error);
    }
};