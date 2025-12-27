import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const { isInstalled, canInstall, notificationPermission, install, enableNotifications } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Check if user dismissed this session
    const dismissedSession = sessionStorage.getItem('pwa-prompt-dismissed');
    if (dismissedSession) {
      setDismissed(true);
    }

    // Show notification prompt if installed but notifications not enabled
    if (isInstalled && notificationPermission === 'default') {
      setShowNotificationPrompt(true);
    }
  }, [isInstalled, notificationPermission]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowNotificationPrompt(true);
    }
  };

  const handleEnableNotifications = async () => {
    await enableNotifications();
    setShowNotificationPrompt(false);
  };

  // Show install prompt
  if (canInstall && !isInstalled && !dismissed) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-primary/20 bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Install LeadFlow</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Add to home screen for quick access and offline support
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleInstall}>Install</Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show notification permission prompt
  if (showNotificationPrompt && notificationPermission === 'default') {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-primary/20 bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Enable Notifications</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified about meetings, callbacks, and important updates
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleEnableNotifications}>Enable</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNotificationPrompt(false)}>
                  Skip
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNotificationPrompt(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
