import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { borrowApi } from "../../services/api";
import { Borrow } from "../../types";
import {
  Eye,
  Library,
  User,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAlert } from "../../hooks/useAlert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const AdminBorrows: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "borrowed" | "returned" | "overdue"
  >("all");
  const [selectedBorrow, setSelectedBorrow] = useState<Borrow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { confirm } = useAlert();

  // Fetch borrows
  const {
    data: borrowsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminBorrows", statusFilter],
    queryFn: () =>
      borrowApi.getAdminBorrows({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      }),
  });

  // Return book mutation
  const returnMutation = useMutation({
    mutationFn: (borrowId: number) => borrowApi.returnBook(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBorrows"] });
      toast.success("Book returned successfully");
    },
    onError: () => {
      toast.error("Failed to return book");
    },
  });

  const handleReturnBook = (borrow: Borrow) => {
    confirm(
      "Return Book",
      `Are you sure you want to return "${borrow.book?.title}"?`,
      () => returnMutation.mutate(borrow.id),
      undefined,
      "Return",
      "Cancel",
    );
  };

  const handleViewBorrow = (borrow: Borrow) => {
    setSelectedBorrow(borrow);
    setIsViewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrowed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "returned":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "borrowed":
        return <Library className="h-3 w-3 mr-1" />;
      case "returned":
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case "overdue":
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
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
        <p className="text-destructive">Failed to load borrows</p>
      </div>
    );
  }

  const borrows = borrowsData?.borrows || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Borrows</h1>
          <p className="text-muted-foreground">
            View and manage all book borrows
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="borrowed">Borrowed</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Borrows Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Borrowed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fine
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {borrows.map((borrow) => (
                <tr key={borrow.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {borrow.book?.title || "Unknown Book"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          by {borrow.book?.author || "Unknown Author"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-foreground">
                        {borrow.user?.firstName} {borrow.user?.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      {new Date(borrow.borrowedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                      {new Date(borrow.dueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(borrow.status)}`}
                    >
                      {getStatusIcon(borrow.status)}
                      {borrow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {borrow.fineAmount > 0 ? (
                      <span className="text-destructive font-medium">
                        ${borrow.fineAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">$0.00</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewBorrow(borrow)}
                        title="View borrow details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {borrow.status === "borrowed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReturnBook(borrow)}
                          title="Return book"
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {borrows.length === 0 && (
          <div className="text-center py-8">
            <Library className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No borrows found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? "Try adjusting your filters."
                : "No borrows recorded yet."}
            </p>
          </div>
        )}
      </div>

      {/* Borrow Details Modal */}
      {isViewModalOpen && selectedBorrow && (
        <BorrowModal
          borrow={selectedBorrow}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedBorrow(null);
          }}
          onReturn={() => {
            handleReturnBook(selectedBorrow);
            setIsViewModalOpen(false);
            setSelectedBorrow(null);
          }}
        />
      )}
    </div>
  );
};

// Borrow Modal Component
interface BorrowModalProps {
  borrow: Borrow;
  isOpen: boolean;
  onClose: () => void;
  onReturn: () => void;
}

const BorrowModal: React.FC<BorrowModalProps> = ({
  borrow,
  isOpen,
  onClose,
  onReturn,
}) => {
  const isOverdue =
    new Date(borrow.dueDate) < new Date() && borrow.status === "borrowed";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Borrow Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Book Information */}
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {borrow.book?.title || "Unknown Book"}
              </h3>
              <p className="text-sm text-muted-foreground">
                by {borrow.book?.author || "Unknown Author"}
              </p>
            </div>
          </div>

          {/* User Information */}
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                {borrow.user?.firstName} {borrow.user?.lastName}
              </h4>
              <p className="text-sm text-muted-foreground">
                {borrow.user?.email}
              </p>
            </div>
          </div>

          {/* Borrow Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Borrowed Date
              </label>
              <p className="text-foreground">
                {new Date(borrow.borrowedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Due Date
              </label>
              <p
                className={`text-foreground ${isOverdue ? "text-destructive font-medium" : ""}`}
              >
                {new Date(borrow.dueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {isOverdue && " (Overdue)"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Status
            </label>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                borrow.status === "borrowed"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : borrow.status === "returned"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {borrow.status === "borrowed" && (
                <Library className="h-3 w-3 mr-1" />
              )}
              {borrow.status === "returned" && (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {borrow.status === "overdue" && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {borrow.status}
            </span>
          </div>

          {borrow.fineAmount > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Fine Amount
              </label>
              <p className="text-destructive font-medium">
                ${borrow.fineAmount.toFixed(2)}
              </p>
            </div>
          )}

          {borrow.returnedAt && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Returned Date
              </label>
              <p className="text-foreground">
                {new Date(borrow.returnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-2 pt-4">
          {borrow.status === "borrowed" && (
            <Button
              onClick={onReturn}
              className="bg-green-600 hover:bg-green-700"
            >
              Return Book
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBorrows;
