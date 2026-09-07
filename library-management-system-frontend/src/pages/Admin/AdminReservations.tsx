import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationApi } from "../../services/api";
import { Reservation } from "../../types";
import {
  Eye,
  Calendar,
  Clock,
  XCircle,
  AlertTriangle,
  BookOpen,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAlert } from "../../hooks/useAlert";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const AdminReservations: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "fulfilled" | "expired"
  >("all");
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { confirm } = useAlert();

  // Fetch reservations
  const {
    data: reservationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminReservations", searchQuery, statusFilter],
    queryFn: () =>
      reservationApi.getAdminReservations({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      }),
  });

  // Cancel reservation mutation
  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) =>
      reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReservations"] });
      toast.success("Reservation cancelled successfully");
    },
    onError: () => {
      toast.error("Failed to cancel reservation");
    },
  });

  const handleCancelReservation = (reservationId: number) => {
    confirm(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      () => {
        cancelMutation.mutate(reservationId);
      },
    );
  };

  const handleViewReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      fulfilled: { variant: "secondary" as const, label: "Fulfilled" },
      expired: { variant: "destructive" as const, label: "Expired" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error loading reservations
          </h3>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  const reservations = reservationsData?.reservations || [];
  const totalReservations = reservationsData?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Manage Reservations
          </h1>
          <p className="text-muted-foreground">
            View and manage all library reservations
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {totalReservations} reservations
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by user name, email, or book title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations ({reservations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No reservations found
              </h3>
              <p className="text-muted-foreground">
                No reservations match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Reserved Date</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">
                              {reservation.user?.firstName}{" "}
                              {reservation.user?.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {reservation.user?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">
                              {reservation.book?.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              by {reservation.book?.author}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {formatDate(reservation.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {reservation.expiresAt
                              ? formatDate(reservation.expiresAt)
                              : "No expiry"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(reservation.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReservation(reservation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {reservation.status === "active" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleCancelReservation(reservation.id)
                              }
                              disabled={cancelMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Reservation Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              {/* User Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.user?.firstName}{" "}
                      {selectedReservation.user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.user?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.user?.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm text-foreground">
                      #{selectedReservation.user?.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Book Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Book Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.book?.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Author</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.book?.author}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ISBN</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.book?.isbn}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Category
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.book?.category}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reservation Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Reservation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Reservation ID
                    </p>
                    <p className="text-sm text-foreground">
                      #{selectedReservation.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedReservation.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Reserved Date
                    </p>
                    <p className="text-sm text-foreground">
                      {formatDateTime(selectedReservation.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expires</p>
                    <p className="text-sm text-foreground">
                      {selectedReservation.expiresAt
                        ? formatDateTime(selectedReservation.expiresAt)
                        : "No expiry"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReservations;
