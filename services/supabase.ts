
import { createClient } from '@supabase/supabase-js';
import { Workspace, Task, Project, User, Message } from "../types";

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL: string = 'https://slgapymixgpnulggdwnx.supabase.co'; 
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZ2FweW1peGdwbnVsZ2dkd254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjE0NTYsImV4cCI6MjA3OTEzNzQ1Nn0.8b8EG-16rTW128enA8qEv1tV9zF1V4VtHJ2Q_brUKXE';

export const isSupabaseConfigured = true;

let supabase: any = null;

try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase initialized successfully.");
} catch (error) {
    console.error("Error initializing Supabase:", error);
}

export interface WorkspaceData {
    tasks: Task[];
    projects: Project[];
    users: User[];
    messages: Message[];
    // Metadata
    name?: string;
    isPersonal?: boolean;
    // Added fields to fix type errors in useUserData
    icon?: string;
    theme?: string;
    order?: number;
}

export const authenticateWithSupabase = async (): Promise<boolean> => {
    if (!supabase) return false;
    return true;
};

// Suscribirse a cambios en un Workspace específico
export const subscribeToWorkspace = (workspaceId: string, callback: (data: WorkspaceData | null) => void) => {
    if (!supabase) return () => {};

    // 1. Carga inicial
    supabase
        .from('workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single()
        .then(({ data, error }: any) => {
            if (error) {
                // CRITICAL FIX: Only treat 'Row not found' (PGRST116) as empty/new workspace.
                // Other errors (network, timeout, permissions) should NOT trigger 'null' callback 
                // to prevent overwriting existing cloud data with defaults locally.
                if (error.code === 'PGRST116') {
                    console.log("Workspace not found (new), initializing defaults.");
                    callback(null);
                } else {
                    console.error("Error fetching workspace:", error.message);
                    // Do NOT callback. Let the UI hang in loading state or user retry.
                    // Calling callback(null) here would cause data loss by overwriting.
                }
            } else if (data && data.data) {
                callback(data.data as WorkspaceData);
            } else {
                // Fallback for weird cases where query succeeds but data is missing
                callback(null);
            }
        });

    // 2. Suscripción en tiempo real
    const channel = supabase
        .channel(`public:workspaces:id=eq.${workspaceId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'workspaces',
                filter: `id=eq.${workspaceId}`,
            },
            (payload: any) => {
                if (payload.new && payload.new.data) {
                    callback(payload.new.data as WorkspaceData);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Guardar datos en la nube (Upsert)
export const saveWorkspaceDataToCloud = async (workspaceId: string, data: WorkspaceData) => {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('workspaces')
            .upsert({ 
                id: workspaceId, 
                data: data,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    } catch (error) {
        console.error("Error saving to Supabase:", error);
    }
};

// Eliminar usuario de un workspace o borrar el workspace si queda vacío
export const deleteUserFromWorkspace = async (workspaceId: string, userId: string) => {
    if (!supabase) return;

    try {
        // 1. Obtener datos actuales
        const { data, error } = await supabase
            .from('workspaces')
            .select('data')
            .eq('id', workspaceId)
            .single();

        if (error || !data || !data.data) {
            console.warn("Cannot delete workspace: not found or fetch error");
            return;
        }

        const wsData = data.data as WorkspaceData;
        const currentUsers = wsData.users || [];
        
        // 2. Filtrar al usuario que se va
        const updatedUsers = currentUsers.filter(u => u.id !== userId);

        if (updatedUsers.length === 0) {
            // 3a. Si no quedan usuarios, BORRAR la fila completa (Hard Delete)
            const { error: deleteError } = await supabase
                .from('workspaces')
                .delete()
                .eq('id', workspaceId);
            
            if (deleteError) throw deleteError;
            console.log(`Workspace ${workspaceId} deleted completely.`);

        } else {
            // 3b. Si quedan usuarios, ACTUALIZAR la lista de usuarios (Leave)
            wsData.users = updatedUsers;
            const { error: updateError } = await supabase
                .from('workspaces')
                .update({ 
                    data: wsData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', workspaceId);

            if (updateError) throw updateError;
            console.log(`User ${userId} removed from workspace ${workspaceId}.`);
        }

    } catch (e) {
        console.error("Error deleting user from workspace:", e);
    }
};

// Obtener lista de workspaces donde el usuario es miembro (por ID o Email)
export const subscribeToUserWorkspaces = (userId: string, userEmail: string, callback: (workspaces: Workspace[]) => void) => {
    if (!supabase) return () => {};

    const fetchWorkspaces = async () => {
        // Consultar workspaces donde el array 'users' contenga el ID del usuario
        const { data: byId, error: errorId } = await supabase
            .from('workspaces')
            .select('id, data')
            .contains('data', { users: [{ id: userId }] });

        // Consultar workspaces donde el array 'users' contenga el Email del usuario
        // Esto permite "reclamar" workspaces donde fuiste invitado por correo
        let byEmail: any[] = [];
        if (userEmail) {
             const { data: byEmailData, error: errorEmail } = await supabase
                .from('workspaces')
                .select('id, data')
                .contains('data', { users: [{ email: userEmail }] });
             if (!errorEmail && byEmailData) byEmail = byEmailData;
        }

        if (errorId) {
            console.warn("Error fetching user workspaces:", errorId);
            return;
        }

        // Combinar resultados y eliminar duplicados
        const allData = [...(byId || []), ...byEmail];
        const uniqueWorkspaces = new Map();

        allData.forEach((row: any) => {
            if (row.data && row.data.name && !uniqueWorkspaces.has(row.id)) {
                uniqueWorkspaces.set(row.id, {
                    id: row.id,
                    name: row.data.name,
                    isPersonal: !!row.data.isPersonal,
                    members: row.data.users,
                    // Map new visual fields
                    icon: row.data.icon,
                    theme: row.data.theme,
                    order: row.data.order
                });
            }
        });

        callback(Array.from(uniqueWorkspaces.values()));
    };

    fetchWorkspaces();
    
    // Polling para actualizaciones de lista
    const interval = setInterval(fetchWorkspaces, 10000);
    
    return () => clearInterval(interval);
};
