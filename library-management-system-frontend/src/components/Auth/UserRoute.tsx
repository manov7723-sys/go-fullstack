import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../ui/LoadingSpinner";

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect admins to admin dashboard
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Allow users and librarians to access user routes
  if (!user || (user.role !== "user" && user.role !== "librarian")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default UserRoute;
