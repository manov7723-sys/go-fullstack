import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { useTheme } from "./contexts/ThemeContext";
import Layout from "./components/Layout/Layout";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import ErrorFallback from "./components/ui/ErrorFallback";
import AdminRoute from "./components/Auth/AdminRoute";
import UserRoute from "./components/Auth/UserRoute";
import RoleBasedRedirect from "./components/Auth/RoleBasedRedirect";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useAlert } from "./hooks/useAlert";
import { AlertContainer } from "./components/ui/AlertContainer";

// Lazy load components for code splitting
const Login = React.lazy(() => import("./pages/Auth/Login"));
const Register = React.lazy(() => import("./pages/Auth/Register"));
const Dashboard = React.lazy(() => import("./pages/Dashboard/Dashboard"));
const Books = React.lazy(() => import("./pages/Books/Books"));
const BookDetail = React.lazy(() => import("./pages/Books/BookDetail"));
const Borrows = React.lazy(() => import("./pages/Borrows/Borrows"));
const Reservations = React.lazy(
  () => import("./pages/Reservations/Reservations"),
);
const Fines = React.lazy(() => import("./pages/Fines/Fines"));
const Profile = React.lazy(() => import("./pages/Profile/Profile"));
const Settings = React.lazy(() => import("./pages/Settings/Settings"));
const AdminDashboard = React.lazy(() => import("./pages/Admin/AdminDashboard"));
const AdminBooks = React.lazy(() => import("./pages/Admin/AdminBooks"));
const AdminUsers = React.lazy(() => import("./pages/Admin/AdminUsers"));
const AdminBorrows = React.lazy(() => import("./pages/Admin/AdminBorrows"));
const AdminReports = React.lazy(() => import("./pages/Admin/AdminReports"));
const AdminReservations = React.lazy(
  () => import("./pages/Admin/AdminReservations"),
);
const AdminFines = React.lazy(() => import("./pages/Admin/AdminFines"));

const App: React.FC = () => {
  const { theme } = useTheme();
  const { alerts, removeAlert } = useAlert();

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}
    >
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <NotificationProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Root redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* User routes - only accessible by users and librarians */}
              <Route
                path="/dashboard"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Dashboard />} />
              </Route>

              <Route
                path="/books"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Books />} />
                <Route path=":id" element={<BookDetail />} />
              </Route>

              <Route
                path="/borrows"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Borrows />} />
              </Route>

              <Route
                path="/reservations"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Reservations />} />
              </Route>

              <Route
                path="/fines"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Fines />} />
              </Route>

              <Route
                path="/profile"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Profile />} />
              </Route>

              <Route
                path="/settings"
                element={
                  <UserRoute>
                    <Layout />
                  </UserRoute>
                }
              >
                <Route index element={<Settings />} />
              </Route>

              {/* Admin routes - only accessible by admins */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Layout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="books" element={<AdminBooks />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="borrows" element={<AdminBorrows />} />
                <Route path="reservations" element={<AdminReservations />} />
                <Route path="fines" element={<AdminFines />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* 404 route */}
              <Route
                path="*"
                element={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-foreground mb-4">
                        404
                      </h1>
                      <p className="text-muted-foreground">Page not found</p>
                    </div>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </NotificationProvider>
        <AlertContainer alerts={alerts} onClose={removeAlert} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
