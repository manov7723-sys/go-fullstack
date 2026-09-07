import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fineApi } from "../../services/api";
import { Fine } from "../../types";
import {
  DollarSign,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const Fines: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");

  const {
    data: finesData,
    isPending,
    error,
  } = useQuery({
    queryKey: ["fines", activeTab],
    queryFn: () => fineApi.getFines({ isPaid: activeTab === "paid" }),
  });

  const payMutation = useMutation({
    mutationFn: (fineId: number) => fineApi.payFine(fineId),
    onSuccess: () => {
      toast.success("Fine paid successfully!");
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
      toast.error("Failed to pay fine");
      console.error("Pay error:", error);
    },
  });

  const handlePay = async (fineId: number) => {
    try {
      await payMutation.mutateAsync(fineId);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load fines</p>
      </div>
    );
  }

  const fines = finesData?.fines || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fines</h1>
        <p className="text-muted-foreground">
          View and manage your library fines
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("unpaid")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "unpaid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Unpaid Fines
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "paid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Paid Fines
        </button>
      </div>

      {/* Fines List */}
      {fines.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No {activeTab} fines
          </h3>
          <p className="text-muted-foreground">
            {activeTab === "unpaid"
              ? "You have no outstanding fines at the moment."
              : "You have no paid fines in your history."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {fines.map((fine) => (
            <FineCard
              key={fine.id}
              fine={fine}
              onPay={handlePay}
              isPaying={payMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FineCardProps {
  fine: Fine;
  onPay: (fineId: number) => void;
  isPaying: boolean;
}

const FineCard: React.FC<FineCardProps> = ({ fine, onPay, isPaying }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {fine.isPaid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <h3 className="text-lg font-semibold text-foreground">
              ${fine.amount.toFixed(2)}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                fine.isPaid
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              }`}
            >
              {fine.isPaid ? "Paid" : "Unpaid"}
            </span>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>
                {fine.borrow?.book?.title || "Book information not available"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                Due Date:{" "}
                {fine.borrow?.dueDate
                  ? new Date(fine.borrow.dueDate).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="font-medium">Reason:</span> {fine.reason}
            </div>
            {fine.isPaid && fine.paidAt && (
              <div>
                <span className="font-medium">Paid on:</span>{" "}
                {new Date(fine.paidAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {!fine.isPaid && (
          <button
            onClick={() => onPay(fine.id)}
            disabled={isPaying}
            className="bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPaying ? "Paying..." : "Pay Fine"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Fines;
