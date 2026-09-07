import { useState } from "react";

export interface AlertProps {
  id: string;
  type: "success" | "error" | "warning" | "info" | "danger";
  title: string;
  message?: string;
  duration?: number;
  showCloseButton?: boolean;
  showIcon?: boolean;
  actions?: AlertAction[];
  onClose: (id: string) => void;
  onAction?: (actionId: string) => void;
}

export interface AlertAction {
  id: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick?: () => void;
}

export const useAlert = () => {
  const [alerts, setAlerts] = useState<AlertProps[]>([]);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const addAlert = (alert: Omit<AlertProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: AlertProps = {
      ...alert,
      id,
      onClose: removeAlert,
    };
    setAlerts((prev) => [...prev, newAlert]);
  };

  const success = (title: string, message?: string) => {
    addAlert({ type: "success", title, message });
  };

  const error = (title: string, message?: string) => {
    addAlert({ type: "error", title, message });
  };

  const warning = (title: string, message?: string) => {
    addAlert({ type: "warning", title, message });
  };

  const info = (title: string, message?: string) => {
    addAlert({ type: "info", title, message });
  };

  const danger = (title: string, message?: string) => {
    addAlert({ type: "danger", title, message });
  };

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = "Confirm",
    cancelText = "Cancel",
  ) => {
    const alertId = Math.random().toString(36).substr(2, 9);

    const handleConfirm = () => {
      onConfirm();
      removeAlert(alertId);
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
      removeAlert(alertId);
    };

    const newAlert: AlertProps = {
      id: alertId,
      type: "warning",
      title,
      message,
      showCloseButton: false,
      duration: 0,
      actions: [
        {
          id: "cancel",
          label: cancelText,
          variant: "outline",
          onClick: handleCancel,
        },
        {
          id: "confirm",
          label: confirmText,
          variant: "default",
          onClick: handleConfirm,
        },
      ],
      onClose: removeAlert,
    };

    setAlerts((prev) => [...prev, newAlert]);
  };

  return {
    alerts,
    success,
    error,
    warning,
    info,
    danger,
    confirm,
    removeAlert,
  };
};
