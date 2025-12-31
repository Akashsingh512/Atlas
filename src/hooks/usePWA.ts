import { useEffect, useState } from 'react';
import { isPWAInstalled, requestNotificationPermission, showLocalNotification, capturePWAInstallPrompt, promptPWAInstall } from '@/utils/pwa';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    setNotificationPermission(Notification.permission);
    capturePWAInstallPrompt();

    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
    });
  }, []);

  const install = async () => {
    const installed = await promptPWAInstall();
    if (installed) {
      setIsInstalled(true);
      setCanInstall(false);
    }
    return installed;
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    return granted;
  };

  return {
    isInstalled,
    canInstall,
    notificationPermission,
    install,
    enableNotifications,
    showNotification: showLocalNotification,
  };
}

// Hook to listen for realtime notifications and show push notifications
export function useRealtimeNotifications() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user || Notification.permission !== 'granted') return;

    // Listen for notifications table changes
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as { title: string; message: string };
          showLocalNotification(notification.title, {
            body: notification.message,
            tag: 'notification',
          });
        }
      )
      .subscribe();

    // Listen for new ticket messages
    const ticketsChannel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const message = payload.new as { subject: string; message: string };
          showLocalNotification('New Message', {
            body: message.subject,
            tag: 'message',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [user]);
}
