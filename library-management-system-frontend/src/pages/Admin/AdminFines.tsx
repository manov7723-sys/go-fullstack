import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fineApi } from "../../services/api";
import { FineSearchRequest } from "../../types";
import {
  DollarSign,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Search,
  TrendingUp,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

const AdminFines: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useState<FineSearchRequest>({
    page: 1,
    limit: 20,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "unpaid" | "paid"
  >("all");
  const [sortBy, setSortBy] = useState<"amount" | "createdAt" | "user">(
    "createdAt",
  );

  const {
    data: finesData,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-fines",
      searchParams,
      selectedStatus,
      searchQuery,
      sortBy,
    ],
    queryFn: () =>
      fineApi.getAdminFines({
        ...searchParams,
        isPaid:
          selectedStatus === "all" ? undefined : selectedStatus === "paid",
      }),
  });

  const payMutation = useMutation({
    mutationFn: (fineId: number) => fineApi.payFine(fineId),
    onSuccess: () => {
      toast.success("Fine marked as paid successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-fines"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (error) => {
      toast.error("Failed to mark fine as paid");
      console.error("Pay error:", error);
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchParams((prev) => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const handlePayFine = async (fineId: number) => {
    try {
      await payMutation.mutateAsync(fineId);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">Loading fines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold">Error Loading Fines</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Failed to load fines. Please try again.
            </p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rawFines = finesData?.fines || [];
  const fines = useMemo(() => {
    return [...rawFines].sort((a, b) => {
      if (sortBy === "amount") return b.amount - a.amount;
      if (sortBy === "user") {
        const nameA = `${a.user?.firstName ?? ""} ${a.user?.lastName ?? ""}`.toLowerCase();
        const nameB = `${b.user?.firstName ?? ""} ${b.user?.lastName ?? ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rawFines, sortBy]);
  const totalFines = fines.length;
  const totalAmount = fines.reduce((sum, fine) => sum + fine.amount, 0);
  const unpaidFines = fines.filter((f) => !f.isPaid);
  const paidFines = fines.filter((f) => f.isPaid);
  const unpaidAmount = unpaidFines.reduce((sum, fine) => sum + fine.amount, 0);
  const paidAmount = paidFines.reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fine Management</h1>
          <p className="text-muted-foreground">
            Monitor, track, and manage library fines across all users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export fines data as CSV
              const csvData = fines.map((fine) => ({
                ID: fine.id,
                User: fine.user
                  ? `${fine.user.firstName} ${fine.user.lastName}`
                  : "Unknown",
                Email: fine.user?.email || "",
                Book: fine.borrow?.book?.title || "Unknown",
                Amount: fine.amount.toFixed(2),
                Reason: fine.reason,
                Status: fine.isPaid ? "Paid" : "Unpaid",
                Created: new Date(fine.createdAt).toLocaleDateString(),
                PaidDate: fine.paidAt
                  ? new Date(fine.paidAt).toLocaleDateString()
                  : "",
              }));

              const csv = [
                Object.keys(csvData[0] || {}).join(","),
                ...csvData.map((row) => Object.values(row).join(",")),
              ].join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fines-export-${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fines
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFines}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">${totalAmount.toFixed(2)}</span>{" "}
              total amount
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unpaid Fines
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unpaidFines.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-red-600">
                ${unpaidAmount.toFixed(2)}
              </span>{" "}
              outstanding
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Fines
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidFines.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-green-600">
                ${paidAmount.toFixed(2)}
              </span>{" "}
              collected
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFines > 0
                ? Math.round((paidFines.length / totalFines) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payment success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, book title, or reason..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedStatus}
                onValueChange={(value: "all" | "unpaid" | "paid") =>
                  setSelectedStatus(value)
                }
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value: "amount" | "createdAt" | "user") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="user">User Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fines Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Fines Overview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalFines} {totalFines === 1 ? "fine" : "fines"} found
              </p>
            </div>
            <Tabs
              value={selectedStatus}
              onValueChange={(value: string) =>
                setSelectedStatus(value as "all" | "unpaid" | "paid")
              }
              className="w-auto"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">
                  All ({totalFines})
                </TabsTrigger>
                <TabsTrigger value="unpaid" className="text-xs">
                  Unpaid ({unpaidFines.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">
                  Paid ({paidFines.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {fines.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No fines found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery || selectedStatus !== "all"
                  ? "No fines match your current search criteria. Try adjusting your filters."
                  : "No fines have been recorded yet. They will appear here when users incur fines."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Book</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fines.map((fine) => (
                    <TableRow
                      key={fine.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                              {fine.user
                                ? `${fine.user.firstName?.[0] || ""}${fine.user.lastName?.[0] || ""}`
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {fine.user
                                ? `${fine.user.firstName} ${fine.user.lastName}`
                                : "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fine.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm max-w-[200px] truncate">
                              {fine.borrow?.book?.title || "Unknown Book"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fine.borrow?.book?.author}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-lg font-bold">
                          ${fine.amount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="text-sm truncate" title={fine.reason}>
                            {fine.reason}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fine.isPaid ? "default" : "destructive"}
                          className={
                            fine.isPaid
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : ""
                          }
                        >
                          {fine.isPaid ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {fine.isPaid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {new Date(fine.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {fine.isPaid && fine.paidAt && (
                            <p className="text-xs text-green-600">
                              Paid: {new Date(fine.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {!fine.isPaid ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayFine(fine.id)}
                              disabled={payMutation.isPending}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            >
                              {payMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              Mark Paid
                            </Button>
                          ) : (
                            <div className="text-xs text-green-600 font-medium px-3 py-1 bg-green-50 rounded-md">
                              ✓ Paid
                            </div>
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
    </div>
  );
};

export default AdminFines;
