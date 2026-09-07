import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi, bookApi, borrowApi, reservationApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { DashboardStats } from "../../types";
import {
  BookOpen,
  Users,
  Calendar,
  Library,
  Clock,
  DollarSign,
} from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => dashboardApi.getDashboardStats(),
    refetchInterval: 30_000,
    staleTime: 30_000,  // stats change frequently — keep fresh
  });

  // Fetch real books data
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ["books", { limit: 10 }],
    queryFn: () => bookApi.getBooks({ page: 1, limit: 10 }),
  });

  // Fetch real borrows data
  const { data: borrowsData, isLoading: borrowsLoading } = useQuery({
    queryKey: ["borrows", { limit: 5 }],
    queryFn: () => borrowApi.getBorrows({ page: 1, limit: 5 }),
  });

  // Fetch reservation count
  const { data: reservationsData } = useQuery({
    queryKey: ["reservations", { limit: 1 }],
    queryFn: () => reservationApi.getReservations({ page: 1, limit: 1 }),
  });

  const isLoading = statsLoading || booksLoading || borrowsLoading;
  const error = statsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load dashboard data</p>
      </div>
    );
  }

  // Type assertion to handle the stats object
  const dashboardStats = stats as DashboardStats | undefined;
  const books = booksData?.books || [];
  const borrows = borrowsData?.borrows || [];

  const statCards = [
    {
      title: "Total Books",
      value: booksData?.total || books.length,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/books",
      description: "Available in library",
    },
    // Show "Total Users" only for admin users, otherwise show "My Profile"
    ...(user?.role === "admin"
      ? [
          {
            title: "Total Users",
            value: dashboardStats?.totalUsers || 0,
            icon: Users,
            color: "text-green-600",
            bgColor: "bg-green-100",
            href: "/admin/users",
            description: "Registered users",
          },
        ]
      : [
          {
            title: "My Profile",
            value: user?.firstName || "Profile",
            icon: Users,
            color: "text-green-600",
            bgColor: "bg-green-100",
            href: "/profile",
            description: "Manage your account",
          },
        ]),
    {
      title: "Active Borrows",
      value: dashboardStats?.totalBorrows || borrows.length,
      icon: Library,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/borrows",
      description: "Currently borrowed",
    },
    {
      title: "Reservations",
      value: reservationsData?.total ?? dashboardStats?.totalReservations ?? 0,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/reservations",
      description: "Books reserved",
    },
    {
      title: "Overdue Books",
      value: dashboardStats?.overdueBooks || 0,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-100",
      href: "/borrows",
      description: "Need attention",
    },
    {
      title: "Total Fines",
      value: `$${dashboardStats?.totalFines?.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      href: "/fines",
      description: "Outstanding amount",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 border-none">
        <CardContent className="p-6 text-primary-foreground">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back,{" "}
            {user?.firstName || user?.email?.split("@")[0] || "User"}!
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Here's what's happening in your library today.
          </p>
          <Badge
            variant="secondary"
            className="mt-4 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
          >
            {user?.role === "admin"
              ? "Administrator"
              : user?.role === "librarian"
                ? "Librarian"
                : "Library User"}
          </Badge>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>
                    <div className={`p-4 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Borrows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">
              Recent Borrows
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/borrows">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {borrows.length > 0 ? (
                borrows.slice(0, 3).map((borrow) => (
                  <div
                    key={borrow.id}
                    className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {borrow.book?.title || "Unknown Book"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(borrow.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        borrow.status === "overdue"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {borrow.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">
                    No recent borrows
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/books">Browse Books</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Books */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">
              Recent Books
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/books">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {books.length > 0 ? (
                books.slice(0, 3).map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {book.author}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {book.availableCopies}/{book.totalCopies}
                      </p>
                      <p className="text-xs text-muted-foreground">available</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">No books found</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/books">Explore Library</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              asChild
            >
              <Link to="/books" className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Browse Books</p>
                  <p className="text-xs text-muted-foreground">
                    Explore our collection
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              asChild
            >
              <Link to="/borrows" className="flex items-center space-x-3">
                <Library className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">My Borrows</p>
                  <p className="text-xs text-muted-foreground">
                    Check borrowed books
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              asChild
            >
              <Link to="/reservations" className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Reservations</p>
                  <p className="text-xs text-muted-foreground">
                    Manage reservations
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
