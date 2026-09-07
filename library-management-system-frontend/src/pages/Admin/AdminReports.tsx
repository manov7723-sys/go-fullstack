import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/api";
import {
  BarChart3,
  BookOpen,
  Users,
  Library,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Filter,
  PieChart,
} from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const AdminReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "year"
  >("month");

  // Fetch admin stats
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminStats", selectedPeriod],
    queryFn: () => dashboardApi.getAdminStats(),
  });

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
        <p className="text-destructive">Failed to load reports data</p>
      </div>
    );
  }

  const reportData = stats || {
    totalBooks: 0,
    totalUsers: 0,
    totalBorrows: 0,
    activeBorrows: 0,
    overdueBorrows: 0,
    totalReservations: 0,
    overdueBooks: 0,
    totalFines: 0,
    popularBooks: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            View library statistics and reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => {
              // Generate and download reports
              const exportData = {
                period: selectedPeriod,
                totalBooks: stats?.totalBooks || 0,
                totalBorrows: stats?.totalBorrows || 0,
                totalUsers: stats?.totalUsers || 0,
                overdueBooks: stats?.overdueBooks || 0,
                generatedAt: new Date().toISOString(),
              };

              const json = JSON.stringify(exportData, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `library-report-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Books
              </p>
              <p className="text-2xl font-bold text-foreground">
                {reportData.totalBooks}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                +12% from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>
              <p className="text-2xl font-bold text-foreground">
                {reportData.totalUsers}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                +8% from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Borrows
              </p>
              <p className="text-2xl font-bold text-foreground">
                {reportData.totalBorrows}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingDown className="inline h-3 w-3 text-red-500 mr-1" />
                -3% from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Library className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Fines
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${reportData.totalFines}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                +15% from last month
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Borrowing Trends */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Borrowing Trends
            </h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-sm font-medium text-foreground">
                {reportData.totalBorrows}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{
                  width: `${Math.min((reportData.totalBorrows / 100) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* User Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              User Activity
            </h3>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Active Borrows
              </span>
              <span className="text-sm font-medium text-foreground">
                {reportData.activeBorrows}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min((reportData.activeBorrows / reportData.totalBorrows) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{Math.round(reportData.totalUsers / 2)}</span>
              <span>{reportData.totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overdue Books */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Overdue Books
            </h3>
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">
              {reportData.overdueBooks}
            </p>
            <p className="text-sm text-muted-foreground mt-1">books overdue</p>
          </div>
        </div>

        {/* Reservations */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Reservations
            </h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-500">
              {reportData.totalReservations}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              active reservations
            </p>
          </div>
        </div>

        {/* Average Fine */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Average Fine
            </h3>
            <DollarSign className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-500">
              $
              {reportData.totalFines > 0
                ? (
                    reportData.totalFines / Math.max(reportData.overdueBooks, 1)
                  ).toFixed(2)
                : "0.00"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              per overdue book
            </p>
          </div>
        </div>
      </div>

      {/* Popular Books */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Popular Books
          </h3>
          <PieChart className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {reportData.popularBooks && reportData.popularBooks.length > 0 ? (
            reportData.popularBooks.slice(0, 5).map((item, index) => (
              <div
                key={item.book.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {item.book.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      by {item.book.author}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {item.borrowCount} borrows
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.book.availableCopies} available
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                No popular books data
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Popular books will appear here based on borrowing activity.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
            <Download className="h-5 w-5 text-primary" />
            <span>Export Report</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Generate Charts</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
            <Activity className="h-5 w-5 text-primary" />
            <span>View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
