import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../services/api";
import {
  BookOpen,
  Users,
  Library,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const AdminDashboard: React.FC = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => dashboardApi.getAdminStats(),
    refetchInterval: 30_000,
    staleTime: 30_000,  // backed by 5-min server cache; keep frontend fresh
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
        <p className="text-destructive">Failed to load admin dashboard data</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Books",
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      color: "bg-blue-500",
      href: "/admin/books",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "bg-green-500",
      href: "/admin/users",
    },
    {
      title: "Active Borrows",
      value: stats?.activeBorrows || 0,
      icon: Library,
      color: "bg-purple-500",
      href: "/admin/borrows",
    },
    {
      title: "Reservations",
      value: stats?.totalReservations || 0,
      icon: Calendar,
      color: "bg-orange-500",
      href: "/admin/reservations",
    },
    {
      title: "Overdue Books",
      value: stats?.overdueBooks || 0,
      icon: Clock,
      color: "bg-red-500",
      href: "/admin/borrows",
    },
    {
      title: "Total Fines",
      value: `$${Number(stats?.totalFines || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "bg-yellow-500",
      href: "/admin/fines",
    },
    {
      title: "Total Borrows",
      value: stats?.totalBorrows || 0,
      icon: Activity,
      color: "bg-indigo-500",
      href: "/admin/borrows",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-primary-foreground/80">
          Overview of library operations and statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.href}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Popular Books */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Popular Books
          </h2>
          <Link
            to="/admin/books"
            className="text-sm text-primary hover:text-primary/80"
          >
            View all
          </Link>
        </div>
        <div className="space-y-4">
          {stats?.popularBooks?.slice(0, 5).map((item) => (
            <div
              key={item.book.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <BookOpen className="h-4 w-4 text-primary" />
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
          ))}
          {(!stats?.popularBooks || stats.popularBooks.length === 0) && (
            <p className="text-center text-muted-foreground py-4">
              No popular books data available
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/books"
            className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Manage Books</span>
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <span>Manage Users</span>
          </Link>
          <Link
            to="/admin/borrows"
            className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Library className="h-5 w-5 text-primary" />
            <span>Manage Borrows</span>
          </Link>
          <Link
            to="/admin/reports"
            className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
