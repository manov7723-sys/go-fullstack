import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { User, Bell, Moon, Sun, Shield, Mail, Smartphone } from "lucide-react";
import { toast } from "react-hot-toast";

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const handleNotificationChange = (type: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
    toast.success(
      `${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${!notifications[type] ? "enabled" : "disabled"}`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Verified
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Role</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              {theme === "dark" ? (
                <Moon className="mr-2 h-5 w-5" />
              ) : (
                <Sun className="mr-2 h-5 w-5" />
              )}
              Appearance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === "dark" ? "Dark mode" : "Light mode"}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center space-x-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="text-sm">Dark</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="text-sm">Light</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      Email Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange("email")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.email ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.email ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      Push Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receive browser notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange("push")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.push ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.push ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      SMS Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via SMS
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange("sms")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.sms ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.sms ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
