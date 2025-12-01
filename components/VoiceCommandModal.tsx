
import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, XMarkIcon, CheckIcon } from './Icons';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandProcessed: (text: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({ isOpen, onClose, onCommandProcessed }) => {
  const [isListening, setIsListening] = useState(false);
  const [fullTranscript, setFullTranscript] = useState(''); // Editable text content
  const [interimTranscript, setInterimTranscript] = useState(''); // Live speech feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const lastFinalTextRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Check browser support on mount
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setFullTranscript('');
      setInterimTranscript('');
      setIsProcessing(false);
      setErrorMsg(null);
      return;
    }

    // Reset state on open
    setFullTranscript('');
    setInterimTranscript('');
    setErrorMsg(null);
    lastFinalTextRef.current = '';
    
    // Auto-focus textarea for convenience
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, 100);

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    // Abort previous instance
    if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = true;
        recognition.continuous = false; // Chunk-based for stability

        recognition.onstart = () => {
            setErrorMsg(null);
            setIsListening(true);
            isListeningRef.current = true;
        };

        recognition.onresult = (event: any) => {
            const result = event.results[0];
            const text = result[0].transcript;

            if (result.isFinal) {
                // Deduplication check
                if (text.trim() === lastFinalTextRef.current.trim()) {
                    setInterimTranscript('');
                    return; 
                }

                lastFinalTextRef.current = text;
                
                // Append to the editable text area
                setFullTranscript(prev => {
                    const spacer = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
                    return prev + spacer + text;
                });
                setInterimTranscript('');
            } else {
                setInterimTranscript(text);
            }
        };

        recognition.onend = () => {
            // Manual loop for "continuous" feeling without buffer bugs
            if (isListeningRef.current) {
                setTimeout(() => {
                    if (isListeningRef.current) {
                        try { recognition.start(); } catch(e) { console.log("Resume ignored", e); }
                    }
                }, 150);
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setErrorMsg("Permiso de micrófono denegado.");
                stopListening();
            } else if (event.error === 'no-speech') {
                // Ignore silence
            } else {
                // Retry on other errors
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    } catch (e) {
        console.error("Failed to init recognition", e);
        setErrorMsg("Error al iniciar el micrófono.");
        stopListening();
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setIsListening(true);
      isListeningRef.current = true;
      startListening();
    }
  };

  const handleProcessCommand = async () => {
    stopListening();
    
    // Use the editable text content
    const finalStr = fullTranscript.trim();

    if (!finalStr) {
        onClose();
        return;
    }
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onCommandProcessed(finalStr);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md text-center relative m-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isProcessing ? 'Procesando con IA...' : 'Crear Tarea Inteligente'}
        </h2>

        {/* Browser Support Feedback / Microphone Button */}
        {isSupported ? (
            <>
                <button 
                    onClick={toggleListening}
                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300 shadow-md hover:shadow-lg ${isListening ? 'bg-red-100 text-red-600 ring-4 ring-red-50 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={isListening ? "Pausar grabación" : "Iniciar grabación"}
                >
                <MicrophoneIcon className="w-8 h-8" />
                </button>
                
                <div className="min-h-[20px] mb-4">
                    {isListening && interimTranscript ? (
                        <p className="text-sm text-gray-600 font-medium animate-pulse">"{interimTranscript}..."</p>
                    ) : (
                        <p className="text-xs text-gray-400">{isListening ? 'Escuchando...' : 'Toca el micrófono para dictar o escribe abajo'}</p>
                    )}
                </div>
            </>
        ) : (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-bold flex items-center justify-center gap-2">
                    <span>⚠️</span> Tu navegador no soporta voz
                </p>
                <p className="mt-1 text-xs">Puedes escribir el comando manualmente abajo.</p>
            </div>
        )}

        {errorMsg && (
            <p className="text-xs text-red-500 font-bold mb-2">{errorMsg}</p>
        )}

        {/* Editable Text Area - Acts as both transcript display and manual input */}
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={fullTranscript}
                onChange={(e) => setFullTranscript(e.target.value)}
                placeholder={isSupported ? "Lo que dictes aparecerá aquí. También puedes escribir..." : "Escribe algo como: 'Crear tarea revisar presupuesto asignada a Ana'"}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-lg font-medium text-gray-800 focus:ring-2 focus:ring-[#254467] focus:border-transparent outline-none resize-none"
                rows={4}
            />
            {/* Clear button if text exists */}
            {fullTranscript && !isListening && (
                <button 
                    onClick={() => setFullTranscript('')}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs bg-white rounded-full p-1 shadow-sm border"
                    title="Borrar texto"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            )}
        </div>

        <div className="flex gap-3 justify-center mt-6">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleProcessCommand}
                disabled={!fullTranscript.trim() || isProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-[#254467] hover:bg-[#1a3350] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
                {isProcessing ? (
                    <span>Procesando...</span>
                ) : (
                    <>
                        <span>Crear Tarea</span>
                        <CheckIcon className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
