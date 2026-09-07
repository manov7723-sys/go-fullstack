import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "../../hooks/useNotifications";
import {
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Search,
  BookOpen,
  Shield,
  AlertCircle,
  Clock,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isAdmin = user?.role === "admin";
  const currentPath = user?.role === "admin" ? "/admin" : "/dashboard";

  // Notification hooks
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications({
      limit: 10,
      isRead: false,
    });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to books page with search query
      window.location.href = `/books?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Real notification data from API
  const notifications = notificationsData?.notifications || [];

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-3 w-3" />;
      case "warning":
        return <Clock className="h-3 w-3" />;
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-100 text-red-600";
      case "warning":
        return "bg-yellow-100 text-yellow-600";
      case "success":
        return "bg-green-100 text-green-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "librarian":
        return <BookOpen className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "librarian":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-9 w-9 mr-1"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <Link
              to={currentPath}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="h-10 w-10 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Library System
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">
                  {isAdmin ? "Admin Panel" : "Management Portal"}
                </p>
              </div>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search books, authors, users..."
                className="pl-10 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                </div>

                {notificationsLoading ? (
                  <DropdownMenuItem disabled className="justify-center">
                    Loading notifications...
                  </DropdownMenuItem>
                ) : notifications.length === 0 ? (
                  <DropdownMenuItem disabled className="justify-center">
                    No notifications
                  </DropdownMenuItem>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className={`p-3 h-auto flex-col items-start space-y-1 ${
                        !notification.isRead ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`p-1 rounded-full ${getNotificationIconColor(notification.type)}`}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <span className="font-medium text-sm truncate">
                            {notification.title}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground w-full">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground w-full">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </DropdownMenuItem>
                  ))
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="justify-center text-xs"
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsReadMutation.isPending}
                    >
                      {markAllAsReadMutation.isPending
                        ? "Marking..."
                        : "Mark all as read"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="justify-center text-xs">
                      View all notifications
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 px-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {user?.firstName?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium leading-none">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.firstName
                            ? user.firstName
                            : user?.email?.split("@")[0] || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 p-0" align="end" forceMount>
                {/* User Info Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {user?.firstName?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.firstName
                          ? user.firstName
                          : "User"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", getRoleColor())}
                  >
                    {getRoleIcon()}
                  </Badge>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <DropdownMenuItem asChild>
                    <Link
                      to={
                        user?.role === "admin" ? "/admin/profile" : "/profile"
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-accent/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Profile</span>
                        <span className="text-xs text-muted-foreground">
                          Manage your account
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to={
                        user?.role === "admin" ? "/admin/settings" : "/settings"
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-accent/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Settings</span>
                        <span className="text-xs text-muted-foreground">
                          Preferences & privacy
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Logout Section */}
                <div className="p-2">
                  <DropdownMenuItem
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors hover:bg-red-50 focus:bg-red-50 text-red-600 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">Sign out</span>
                      <span className="text-xs text-red-500">
                        Log out of your account
                      </span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile search input */}
        {showMobileSearch && (
          <div className="pb-3 md:hidden">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search books..."
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
