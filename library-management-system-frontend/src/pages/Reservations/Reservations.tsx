import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationApi } from "../../services/api";
import { Reservation } from "../../types";
import { Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

const Reservations: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "active" | "fulfilled" | "expired"
  >("active");

  const {
    data: reservationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reservations", activeTab],
    queryFn: () => reservationApi.getReservations({ status: activeTab }),
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) =>
      reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      toast.success("Reservation cancelled successfully!");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
      toast.error("Failed to cancel reservation");
      console.error("Cancel error:", error);
    },
  });

  const handleCancel = async (reservationId: number) => {
    try {
      await cancelMutation.mutateAsync(reservationId);
    } catch (error) {
      // Error is handled by the mutation
    }
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
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load reservations</p>
      </div>
    );
  }

  const reservations = reservationsData?.reservations || [];

  const tabs = [
    {
      id: "active",
      label: "Active",
      count: reservations.filter((r) => r.status === "active").length,
    },
    {
      id: "fulfilled",
      label: "Fulfilled",
      count: reservations.filter((r) => r.status === "fulfilled").length,
    },
    {
      id: "expired",
      label: "Expired",
      count: reservations.filter((r) => r.status === "expired").length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Reservations</h1>
        <p className="text-muted-foreground">
          Track your book reservations and their status
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center space-x-2"
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-6">
            {reservations.filter((r) =>
              tab.id === "active"
                ? r.status === "active"
                : tab.id === "fulfilled"
                  ? r.status === "fulfilled"
                  : r.status === "expired",
            ).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  No {tab.label.toLowerCase()} reservations
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab.id === "active" &&
                    "You haven't made any reservations yet."}
                  {tab.id === "fulfilled" &&
                    "You don't have any fulfilled reservations."}
                  {tab.id === "expired" &&
                    "You don't have any expired reservations."}
                </p>
              </div>
            ) : (
              reservations
                .filter((r) =>
                  tab.id === "active"
                    ? r.status === "active"
                    : tab.id === "fulfilled"
                      ? r.status === "fulfilled"
                      : r.status === "expired",
                )
                .map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onCancel={handleCancel}
                    isCancelling={cancelMutation.isPending}
                  />
                ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Reservation Card Component
const ReservationCard: React.FC<{
  reservation: Reservation;
  onCancel: (reservationId: number) => void;
  isCancelling: boolean;
}> = ({ reservation, onCancel, isCancelling }) => {
  const isActive = reservation.status === "active";
  const isFulfilled = reservation.status === "fulfilled";
  const isExpired = reservation.status === "expired";
  const expiresAt = new Date(reservation.expiresAt);
  const today = new Date();
  const isExpiringSoon =
    isActive && expiresAt.getTime() - today.getTime() < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  isExpired
                    ? "bg-destructive/10"
                    : isFulfilled
                      ? "bg-green-500/10"
                      : "bg-primary/10"
                }`}
              >
                <Calendar
                  className={`h-6 w-6 ${
                    isExpired
                      ? "text-destructive"
                      : isFulfilled
                        ? "text-green-500"
                        : "text-primary"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {reservation.book?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  by {reservation.book?.author}
                </p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Reserved:{" "}
                    {new Date(reservation.reservationDate).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Expires: {expiresAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            {isExpiringSoon && (
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  Expires soon
                </span>
              </div>
            )}
            {isFulfilled && (
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  Fulfilled
                </span>
              </div>
            )}
            {isExpired && (
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Expired
                </span>
              </div>
            )}
            {isActive && (
              <Button
                onClick={() => onCancel(reservation.id)}
                disabled={isCancelling}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isCancelling ? "Cancelling..." : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reservations;
