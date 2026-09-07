import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookApi, borrowApi, reservationApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useSmartNotifications } from "../../contexts/NotificationContext";
import {
  BookOpen,
  User,
  Calendar,
  Clock,
  ArrowLeft,
  Library,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const smartNotifications = useSmartNotifications();
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  const {
    data: book,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["book", id],
    queryFn: () => bookApi.getBook(Number(id)),
    enabled: !!id,
  });

  const borrowMutation = useMutation({
    mutationFn: () =>
      borrowApi.createBorrow({ bookId: Number(id) }),
    onSuccess: () => {
      toast.success("Book borrowed successfully!");
      queryClient.invalidateQueries({ queryKey: ["book", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
      toast.error("Failed to borrow book");
      console.error("Borrow error:", error);
    },
  });

  const reservationMutation = useMutation({
    mutationFn: () => reservationApi.createReservation({ bookId: Number(id) }),
    onSuccess: () => {
      toast.success("Book reserved successfully!");
      queryClient.invalidateQueries({ queryKey: ["book", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
      toast.error("Failed to reserve book");
      console.error("Reservation error:", error);
    },
  });

  const handleBorrow = async () => {
    if (!book) return;

    setIsBorrowing(true);
    try {
      const borrow = await borrowMutation.mutateAsync();

      // Trigger smart notification for successful borrow
      smartNotifications.borrowBook(borrow?.id || Date.now(), book.title);
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleReserve = async () => {
    if (!book) return;

    setIsReserving(true);
    try {
      const reservation = await reservationMutation.mutateAsync();

      // Trigger smart notification for successful reservation
      smartNotifications.reserveBook(reservation?.id || Date.now(), book.title);
    } finally {
      setIsReserving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load book details</p>
      </div>
    );
  }

  const isAvailable = book.availableCopies > 0;
  const canBorrow = isAvailable && user;
  const canReserve = !isAvailable && user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{book.title}</h1>
          <p className="text-muted-foreground">by {book.author}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Book Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Title</p>
                    <p className="text-muted-foreground">{book.title}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Author
                    </p>
                    <p className="text-muted-foreground">{book.author}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Category
                    </p>
                    <p className="text-muted-foreground">{book.category}</p>
                  </div>
                </div>
                {book.publishedDate && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Published Date
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(book.publishedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Availability
                    </p>
                    <p className="text-muted-foreground">
                      {book.availableCopies} of {book.totalCopies} copies
                      available
                    </p>
                  </div>
                </div>
                {book.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Description
                    </p>
                    <p className="text-muted-foreground">{book.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {canBorrow ? (
                  <Button
                    onClick={handleBorrow}
                    disabled={isBorrowing}
                    className="w-full"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    {isBorrowing ? "Borrowing..." : "Borrow Book"}
                  </Button>
                ) : canReserve ? (
                  <Button
                    onClick={handleReserve}
                    disabled={isReserving}
                    variant="secondary"
                    className="w-full"
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {isReserving ? "Reserving..." : "Reserve Book"}
                  </Button>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {!user
                        ? "Please log in to borrow or reserve books"
                        : "No copies available"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Book Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Copies
                  </span>
                  <span className="font-medium text-foreground">
                    {book.totalCopies}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Available
                  </span>
                  <span className="font-medium text-foreground">
                    {book.availableCopies}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Borrowed
                  </span>
                  <span className="font-medium text-foreground">
                    {book.totalCopies - book.availableCopies}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
