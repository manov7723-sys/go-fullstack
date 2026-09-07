import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  useLibraryEventNotifications,
  notificationKeys,
} from "../hooks/useNotifications";

interface NotificationContextType {
  // Smart notification generators
  notifyBookReturnReminder: (borrowId: number) => void;
  notifyOverdueBook: (borrowId: number) => void;
  notifyReservationAvailable: (reservationId: number) => void;
  notifyFineGenerated: (fineId: number) => void;
  notifyNewBookAdded: (bookId: number, category?: string) => void;

  // Event-based notification triggers
  onBookBorrowed: (borrowId: number, bookTitle: string) => void;
  onBookReturned: (borrowId: number, bookTitle: string) => void;
  onBookReserved: (reservationId: number, bookTitle: string) => void;
  onReservationCancelled: (reservationId: number, bookTitle: string) => void;
  onFineCreated: (fineId: number, amount: number) => void;
  onFinePaid: (fineId: number, amount: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const libraryEventNotifications = useLibraryEventNotifications();

  // Simulate real-time notifications with periodic checks
  useEffect(() => {
    if (!user) return;

    const checkForNewNotifications = () => {
      // Invalidate notification queries to fetch new notifications
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    // Check for new notifications every 30 seconds
    const interval = setInterval(checkForNewNotifications, 30000);

    return () => clearInterval(interval);
  }, [user, queryClient]);

  // Smart notification generators
  const notifyBookReturnReminder = (borrowId: number) => {
    libraryEventNotifications.generateBookReturnReminder(borrowId);
    toast.success("Book return reminder sent");
  };

  const notifyOverdueBook = (borrowId: number) => {
    libraryEventNotifications.generateOverdueNotification(borrowId);
    toast.error("Overdue book notification sent");
  };

  const notifyReservationAvailable = (reservationId: number) => {
    libraryEventNotifications.generateReservationAvailable(reservationId);
    toast.success("Reservation available notification sent");
  };

  const notifyFineGenerated = (fineId: number) => {
    libraryEventNotifications.generateFineNotification(fineId);
    toast("Fine notification sent", { icon: "⚠️" });
  };

  const notifyNewBookAdded = (bookId: number, category?: string) => {
    libraryEventNotifications.generateNewBookNotification({ bookId, category });
    toast("New book notification sent", { icon: "ℹ️" });
  };

  // Event-based notification triggers
  const onBookBorrowed = (borrowId: number, bookTitle: string) => {
    toast.success(`Successfully borrowed "${bookTitle}"`);

    // Schedule return reminder (in a real app, this would be handled by the backend)
    setTimeout(() => {
      notifyBookReturnReminder(borrowId);
    }, 5000); // Demo: 5 seconds, real: would be days before due date
  };

  const onBookReturned = (_borrowId: number, bookTitle: string) => {
    toast.success(`Successfully returned "${bookTitle}"`);

    // Refresh notifications to remove any related reminders
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const onBookReserved = (reservationId: number, bookTitle: string) => {
    toast.success(`Successfully reserved "${bookTitle}"`);

    // In a real app, this would notify when the book becomes available
    // For demo purposes, simulate availability after 10 seconds
    setTimeout(() => {
      notifyReservationAvailable(reservationId);
    }, 10000);
  };

  const onReservationCancelled = (
    _reservationId: number,
    bookTitle: string,
  ) => {
    toast(`Cancelled reservation for "${bookTitle}"`, { icon: "ℹ️" });

    // Refresh notifications to remove any related notifications
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const onFineCreated = (fineId: number, amount: number) => {
    toast(`Fine of $${amount.toFixed(2)} has been issued`, { icon: "⚠️" });
    notifyFineGenerated(fineId);
  };

  const onFinePaid = (_fineId: number, amount: number) => {
    toast.success(`Fine of $${amount.toFixed(2)} has been paid`);

    // Refresh notifications to remove fine-related notifications
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const value: NotificationContextType = {
    // Smart notification generators
    notifyBookReturnReminder,
    notifyOverdueBook,
    notifyReservationAvailable,
    notifyFineGenerated,
    notifyNewBookAdded,

    // Event-based notification triggers
    onBookBorrowed,
    onBookReturned,
    onBookReserved,
    onReservationCancelled,
    onFineCreated,
    onFinePaid,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationEvents = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationEvents must be used within a NotificationProvider",
    );
  }
  return context;
};

// Utility hook for common notification patterns
export const useSmartNotifications = () => {
  const events = useNotificationEvents();

  return {
    // Quick access to common events
    borrowBook: (borrowId: number, bookTitle: string) =>
      events.onBookBorrowed(borrowId, bookTitle),
    returnBook: (borrowId: number, bookTitle: string) =>
      events.onBookReturned(borrowId, bookTitle),
    reserveBook: (reservationId: number, bookTitle: string) =>
      events.onBookReserved(reservationId, bookTitle),
    cancelReservation: (reservationId: number, bookTitle: string) =>
      events.onReservationCancelled(reservationId, bookTitle),
    createFine: (fineId: number, amount: number) =>
      events.onFineCreated(fineId, amount),
    payFine: (fineId: number, amount: number) =>
      events.onFinePaid(fineId, amount),

    // Smart reminders
    sendReturnReminder: (borrowId: number) =>
      events.notifyBookReturnReminder(borrowId),
    sendOverdueNotice: (borrowId: number) => events.notifyOverdueBook(borrowId),
    notifyBookAvailable: (reservationId: number) =>
      events.notifyReservationAvailable(reservationId),
    announceNewBook: (bookId: number, category?: string) =>
      events.notifyNewBookAdded(bookId, category),
  };
};
