import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Notification, NotificationType } from '../types';
import { NotificationContainer } from '../components/Notifications';

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType, onClick?: () => void) => void;
  history: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);

  const addNotification = (message: string, type: NotificationType, onClick?: () => void) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      message,
      type,
      createdAt: Date.now(),
      onClick,
    };

    setActiveToasts(prev => [...prev, newNotification]);
    setHistory(prev => [newNotification, ...prev.slice(0, 19)]); // Keep last 20

    setTimeout(() => {
      removeToast(newNotification.id);
    }, 5000); // Auto-dismiss after 5 seconds
  };

  const removeToast = (id: string) => {
    setActiveToasts(prev => prev.filter(n => n.id !== id));
  };
  
  // FIX: Replaced JSX with React.createElement to be compatible with a .ts file extension.
  // The original JSX syntax caused parsing errors because this file is not a .tsx file.
  return React.createElement(
    NotificationContext.Provider,
    { value: { addNotification, history } },
    children,
    React.createElement(NotificationContainer, {
      toasts: activeToasts,
      onDismiss: removeToast,
    })
  );
};
