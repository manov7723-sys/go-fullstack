import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { notificationApi } from "../services/api";
import {
  NotificationSearchRequest,
  NotificationSearchResponse,
  NotificationCreateRequest,
} from "../types";

// Query keys
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: NotificationSearchRequest) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

// Hooks for fetching notifications
export const useNotifications = (params?: NotificationSearchRequest) => {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.getNotifications(params),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60, // 1 minute auto-refresh
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    staleTime: 1000 * 15, // 15 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 30, // 30 seconds auto-refresh
  });
};

// Mutations for notification actions
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationApi.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      // Update notification lists
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });

      // Update unread count
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      // Optimistically update cache
      queryClient.setQueriesData<NotificationSearchResponse>(
        { queryKey: notificationKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            notifications: oldData.notifications.map((notification) =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification,
            ),
            unreadCount: Math.max(0, oldData.unreadCount - 1),
          };
        },
      );
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
      toast.error("Failed to mark notification as read");
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      // Update all notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      // Optimistically update cache
      queryClient.setQueriesData<NotificationSearchResponse>(
        { queryKey: notificationKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            notifications: oldData.notifications.map((notification) => ({
              ...notification,
              isRead: true,
            })),
            unreadCount: 0,
          };
        },
      );

      toast.success("All notifications marked as read");
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationApi.deleteNotification(notificationId),
    onSuccess: (_, notificationId) => {
      // Update notification lists
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      // Optimistically remove from cache
      queryClient.setQueriesData<NotificationSearchResponse>(
        { queryKey: notificationKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          const deletedNotification = oldData.notifications.find(
            (n) => n.id === notificationId,
          );
          const wasUnread = deletedNotification && !deletedNotification.isRead;

          return {
            ...oldData,
            notifications: oldData.notifications.filter(
              (n) => n.id !== notificationId,
            ),
            total: oldData.total - 1,
            unreadCount: wasUnread
              ? Math.max(0, oldData.unreadCount - 1)
              : oldData.unreadCount,
          };
        },
      );

      toast.success("Notification deleted");
    },
    onError: (error) => {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationCreateRequest) =>
      notificationApi.createNotification(data),
    onSuccess: () => {
      // Refresh notification lists
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Notification created");
    },
    onError: (error) => {
      console.error("Failed to create notification:", error);
      toast.error("Failed to create notification");
    },
  });
};

// Smart notification generators
export const useGenerateBookReturnReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: number) =>
      notificationApi.generateBookReturnReminder(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      console.error("Failed to generate book return reminder:", error);
    },
  });
};

export const useGenerateOverdueNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: number) =>
      notificationApi.generateOverdueNotification(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      console.error("Failed to generate overdue notification:", error);
    },
  });
};

export const useGenerateReservationAvailable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: number) =>
      notificationApi.generateReservationAvailable(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      console.error(
        "Failed to generate reservation available notification:",
        error,
      );
    },
  });
};

export const useGenerateFineNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fineId: number) =>
      notificationApi.generateFineNotification(fineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      console.error("Failed to generate fine notification:", error);
    },
  });
};

export const useGenerateNewBookNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, category }: { bookId: number; category?: string }) =>
      notificationApi.generateNewBookNotification(bookId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      console.error("Failed to generate new book notification:", error);
    },
  });
};

// Utility hook for smart library event notifications
export const useLibraryEventNotifications = () => {
  const generateBookReturnReminder = useGenerateBookReturnReminder();
  const generateOverdueNotification = useGenerateOverdueNotification();
  const generateReservationAvailable = useGenerateReservationAvailable();
  const generateFineNotification = useGenerateFineNotification();
  const generateNewBookNotification = useGenerateNewBookNotification();

  return {
    generateBookReturnReminder: generateBookReturnReminder.mutate,
    generateOverdueNotification: generateOverdueNotification.mutate,
    generateReservationAvailable: generateReservationAvailable.mutate,
    generateFineNotification: generateFineNotification.mutate,
    generateNewBookNotification: generateNewBookNotification.mutate,
    isGenerating:
      generateBookReturnReminder.isPending ||
      generateOverdueNotification.isPending ||
      generateReservationAvailable.isPending ||
      generateFineNotification.isPending ||
      generateNewBookNotification.isPending,
  };
};
