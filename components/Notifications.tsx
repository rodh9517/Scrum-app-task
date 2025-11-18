import React, { useState, useEffect } from 'react';
import { Notification, NotificationType } from '../types';
import { CheckCircleIcon, InfoCircleIcon } from './Icons';

interface NotificationToastProps {
  toast: Notification;
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Mount animation
        setIsVisible(true);
        // Unmount animation
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 4500); // Start fade out before removal
        return () => clearTimeout(timer);
    }, []);

    const typeStyles = {
        [NotificationType.Success]: {
            bg: 'bg-green-50',
            border: 'border-green-400',
            iconColor: 'text-green-500',
            icon: <CheckCircleIcon className="w-6 h-6" />
        },
        [NotificationType.Info]: {
            bg: 'bg-blue-50',
            border: 'border-blue-400',
            iconColor: 'text-blue-500',
            icon: <InfoCircleIcon className="w-6 h-6" />
        },
    };

    const styles = typeStyles[toast.type] || typeStyles[NotificationType.Info];

    return (
        <div
            onClick={toast.onClick}
            className={`
                flex items-start w-full max-w-sm p-4 my-2 overflow-hidden bg-white rounded-lg shadow-lg border-l-4
                transform transition-all duration-300 ease-in-out
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${styles.bg} ${styles.border}
                ${toast.onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105' : ''}
            `}
            role="alert"
        >
            <div className={`flex-shrink-0 ${styles.iconColor}`}>
                {styles.icon}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-800">{toast.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent container's onClick if closing
                        onDismiss(toast.id);
                    }}
                    className="inline-flex text-gray-400 bg-transparent rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};


interface NotificationContainerProps {
  toasts: Notification[];
  onDismiss: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[100] w-full max-w-sm">
      {toasts.map(toast => (
        <NotificationToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};