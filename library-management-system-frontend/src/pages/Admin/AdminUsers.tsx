import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../services/api";
import { User } from "../../types";
import {
  Search,
  Trash2,
  Eye,
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminUsers", searchQuery],
    queryFn: () => userApi.getUsers({ search: searchQuery, limit: 50 }),
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      console.log("Calling deleteUser API with id:", id);
      return userApi.deleteUser(id);
    },
    onSuccess: () => {
      console.log("Delete user successful");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error("Delete user failed:", error);
      toast.error("Failed to delete user");
    },
  });

  // Activate/Deactivate user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (user: User) => {
      console.log("Calling toggleUserStatus API for user:", user);
      if (user.isActive) {
        console.log("Calling deactivateUser API");
        return userApi.deactivateUser(user.id);
      } else {
        console.log("Calling activateUser API");
        return userApi.activateUser(user.id);
      }
    },
    onSuccess: () => {
      console.log("Toggle user status successful");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User status updated successfully");
    },
    onError: (error) => {
      console.error("Toggle user status failed:", error);
      toast.error("Failed to update user status");
    },
  });

  const handleDeleteUser = (user: User) => {
    console.log("Delete user clicked:", user);
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleUserStatus = (user: User) => {
    console.log("Toggle user status clicked:", user);
    setUserToToggle(user);
    setStatusDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      console.log("Delete confirmed, calling API...");
      deleteMutation.mutate(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const confirmToggleUserStatus = () => {
    if (userToToggle) {
      const action = userToToggle.isActive ? "deactivate" : "activate";
      console.log(`${action} confirmed, calling API...`);
      toggleUserStatusMutation.mutate(userToToggle);
      setStatusDialogOpen(false);
      setUserToToggle(null);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
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
        <p className="text-destructive">Failed to load users</p>
      </div>
    );
  }

  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>
          <p className="text-muted-foreground">View and manage library users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder="Search users by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.phone || "No phone"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-foreground">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin"
                          ? "destructive"
                          : user.role === "librarian"
                            ? "secondary"
                            : "default"
                      }
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewUser(user)}
                        title="View user details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleUserStatus(user)}
                        title={
                          user.isActive ? "Deactivate user" : "Activate user"
                        }
                        className={
                          user.isActive
                            ? "text-yellow-600 hover:text-yellow-800"
                            : "text-green-600 hover:text-green-800"
                        }
                      >
                        {user.isActive ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete user"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No users found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search terms."
                : "No users registered yet."}
            </p>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      <UserModal
        user={selectedUser}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete && (
                <>
                  Are you sure you want to delete{" "}
                  <strong>
                    {userToDelete.firstName} {userToDelete.lastName}
                  </strong>
                  ?
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isActive ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle && (
                <>
                  Are you sure you want to{" "}
                  <strong>
                    {userToToggle.isActive ? "deactivate" : "activate"}
                  </strong>{" "}
                  <strong>
                    {userToToggle.firstName} {userToToggle.lastName}
                  </strong>
                  ?
                  {userToToggle.isActive && (
                    <>
                      <br />
                      This will prevent the user from accessing the system.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToToggle(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleUserStatus}
              className={
                userToToggle?.isActive
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : ""
              }
            >
              {userToToggle?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// User Modal Component
interface UserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Role
              </label>
              <Badge
                variant={
                  user.role === "admin"
                    ? "destructive"
                    : user.role === "librarian"
                      ? "secondary"
                      : "default"
                }
              >
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </Badge>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Badge variant={user.isActive ? "default" : "destructive"}>
                {user.isActive ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Phone
            </label>
            <p className="text-foreground">{user.phone || "No phone number"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Email Verified
            </label>
            <Badge variant={user.emailVerified ? "default" : "secondary"}>
              {user.emailVerified ? "Verified" : "Not Verified"}
            </Badge>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Joined Date
            </label>
            <p className="text-foreground">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Last Updated
            </label>
            <p className="text-foreground">
              {new Date(user.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsers;
