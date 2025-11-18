
import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

// Fix: Add global declaration for window.google to resolve TypeScript errors.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string | null | undefined;
            callback: (response: any) => void;
            use_fedcm_for_prompt: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme: string;
              size: string;
              text: string;
              shape: string;
              logo_alignment: string;
              width: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginProps {
  onLoginSuccess: (response: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devName, setDevName] = useState('');
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      try {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: document.querySelector('meta[name="google-signin-client_id"]')?.getAttribute('content'),
            callback: onLoginSuccess,
            use_fedcm_for_prompt: true,
          });
          const btn = document.getElementById('signInButton');
          if (btn) {
              window.google.accounts.id.renderButton(
                btn,
                { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left', width: '280' }
              );
          }
        }
      } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', initializeGoogleSignIn);
        return () => script.removeEventListener('load', initializeGoogleSignIn);
      }
    }
  }, [onLoginSuccess]);

  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devName.trim()) return;

    const safeEmail = devEmail.trim() || `${devName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    
    // Create a mock profile that matches the structure expected by App.tsx
    const mockProfile = {
        name: devName,
        email: safeEmail,
        picture: '', // No image for dev user
        sub: `dev-${safeEmail}` // Generate a consistent ID based on email
    };

    // Forge a fake JWT token structure (Header.Payload.Signature)
    // The App.tsx decodeJwt function only looks at the payload (middle part).
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify(mockProfile));
    const signature = "dev-signature-bypass";
    const token = `${header}.${payload}.${signature}`;

    onLoginSuccess({ credential: token });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-10 bg-white rounded-xl shadow-2xl text-center max-w-md w-full border border-gray-200">
        <Logo className="h-24 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido al Dashboard</h1>
        <p className="text-gray-600 mb-10">Gestiona tus proyectos y tareas con facilidad.</p>
        
        <div id="signInButton" className="flex justify-center h-[40px] mb-6"></div>
        
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O ingresa manualmente</span>
            </div>
        </div>

        {!showDevLogin ? (
            <button 
                onClick={() => setShowDevLogin(true)}
                className="text-sm text-[#254467] font-semibold hover:underline"
            >
                Ingresar como Invitado / Modo Offline
            </button>
        ) : (
            <form onSubmit={handleDevLogin} className="text-left space-y-3 animate-fade-in">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Nombre</label>
                    <input 
                        type="text" 
                        required
                        value={devName}
                        onChange={e => setDevName(e.target.value)}
                        className="mt-1 w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-[#254467] focus:border-[#254467]"
                        placeholder="Tu Nombre"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">Email (Opcional)</label>
                    <input 
                        type="email" 
                        value={devEmail}
                        onChange={e => setDevEmail(e.target.value)}
                        className="mt-1 w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-[#254467] focus:border-[#254467]"
                        placeholder="usar.id@ejemplo.com"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                        Tus datos se guardarán en el navegador si la nube no está disponible.
                    </p>
                </div>
                <button 
                    type="submit"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                >
                    Entrar
                </button>
            </form>
        )}

        <p className="text-xs text-gray-400 mt-8">
          Si ves el error "origin_mismatch", usa la opción de Ingreso manual.
        </p>
      </div>
    </div>
  );
};
