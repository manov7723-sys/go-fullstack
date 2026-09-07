import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { borrowApi } from "../../services/api";
import { Borrow } from "../../types";
import {
  Library,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
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

const Borrows: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "borrowed" | "returned" | "overdue"
  >("borrowed");

  const {
    data: borrowsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["borrows", activeTab],
    queryFn: () => borrowApi.getBorrows({ status: activeTab }),
    staleTime: 30_000,  // borrow status changes on user action — keep fresh
  });

  const returnMutation = useMutation({
    mutationFn: (borrowId: number) => borrowApi.returnBook(borrowId),
    onSuccess: () => {
      toast.success("Book returned successfully!");
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
      toast.error("Failed to return book");
      console.error("Return error:", error);
    },
  });

  const handleReturn = async (borrowId: number) => {
    try {
      await returnMutation.mutateAsync(borrowId);
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
        <p className="text-destructive">Failed to load borrows</p>
      </div>
    );
  }

  const borrows = borrowsData?.borrows || [];

  const tabs = [
    {
      id: "borrowed",
      label: "Active",
      count: borrows.filter((b) => b.status === "borrowed").length,
    },
    {
      id: "overdue",
      label: "Overdue",
      count: borrows.filter((b) => b.status === "overdue").length,
    },
    {
      id: "returned",
      label: "Returned",
      count: borrows.filter((b) => b.status === "returned").length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Borrows</h1>
        <p className="text-muted-foreground">
          Manage your borrowed books and track due dates
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
            {borrows.filter((b) =>
              activeTab === "borrowed"
                ? b.status === "borrowed"
                : activeTab === "overdue"
                  ? b.status === "overdue"
                  : b.status === "returned",
            ).length === 0 ? (
              <div className="text-center py-8">
                <Library className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  No {tab.label.toLowerCase()} borrows
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab.id === "borrowed" &&
                    "You haven't borrowed any books yet."}
                  {tab.id === "overdue" && "You don't have any overdue books."}
                  {tab.id === "returned" &&
                    "You haven't returned any books yet."}
                </p>
              </div>
            ) : (
              borrows
                .filter((b) =>
                  tab.id === "borrowed"
                    ? b.status === "borrowed"
                    : tab.id === "overdue"
                      ? b.status === "overdue"
                      : b.status === "returned",
                )
                .map((borrow) => (
                  <BorrowCard
                    key={borrow.id}
                    borrow={borrow}
                    onReturn={handleReturn}
                    isReturning={returnMutation.isPending}
                  />
                ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Borrow Card Component
const BorrowCard: React.FC<{
  borrow: Borrow;
  onReturn: (borrowId: number) => void;
  isReturning: boolean;
}> = ({ borrow, onReturn, isReturning }) => {
  const isOverdue = borrow.status === "overdue";
  const isReturned = borrow.status === "returned";
  const dueDate = new Date(borrow.dueDate);
  const today = new Date();
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  isOverdue
                    ? "bg-destructive/10"
                    : isReturned
                      ? "bg-green-500/10"
                      : "bg-primary/10"
                }`}
              >
                <Library
                  className={`h-6 w-6 ${
                    isOverdue
                      ? "text-destructive"
                      : isReturned
                        ? "text-green-500"
                        : "text-primary"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {borrow.book?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  by {borrow.book?.author}
                </p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Borrowed: {new Date(borrow.borrowedAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Due: {dueDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            {isOverdue && (
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {Math.abs(daysUntilDue)} days overdue
                </span>
              </div>
            )}
            {!isOverdue && !isReturned && daysUntilDue <= 3 && (
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">
                  {daysUntilDue} days left
                </span>
              </div>
            )}
            {isReturned && (
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  Returned on{" "}
                  {borrow.returnedAt &&
                    new Date(borrow.returnedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {!isReturned && (
              <Button
                onClick={() => onReturn(borrow.id)}
                disabled={isReturning}
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isReturning ? "Returning..." : "Return Book"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Borrows;
