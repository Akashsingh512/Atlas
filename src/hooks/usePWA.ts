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

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
