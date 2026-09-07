import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { User, Mail, Phone, Calendar, Shield } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";

const ProfileSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  lastName: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  phone: Yup.string()
    .matches(/^[0-9+\-\s()]*$/, "Invalid phone number")
    .optional(),
});

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: userData,
    isPending,
    error,
  } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => userApi.getUser(), // ID is not used by the backend endpoint
    enabled: !!user?.id,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (userData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    }) => {
      return userApi.updateUser(userData); // ID is not used by the backend endpoint
    },
    onSuccess: (updatedUser) => {
      toast.success("Profile updated successfully!");
      updateUser(updatedUser);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
    onError: (error) => {
      toast.error("Failed to update profile");
      console.error("Update error:", error);
    },
  });

  const formik = useFormik({
    initialValues: {
      firstName: userData?.firstName || user?.firstName || "",
      lastName: userData?.lastName || user?.lastName || "",
      phone: userData?.phone || user?.phone || "",
    },
    validationSchema: ProfileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await updateMutation.mutateAsync(values);
      } catch (error) {
        // Error is handled by the mutation
      }
    },
  });

  // Show loading if user is not available yet
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load profile</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      </div>
    );
  }

  const currentUser = userData || user;

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.firstName}
                      />
                      {formik.touched.firstName && formik.errors.firstName && (
                        <p className="mt-1 text-sm text-destructive">
                          {formik.errors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.lastName}
                      />
                      {formik.touched.lastName && formik.errors.lastName && (
                        <p className="mt-1 text-sm text-destructive">
                          {formik.errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.phone}
                    />
                    {formik.touched.phone && formik.errors.phone && (
                      <p className="mt-1 text-sm text-destructive">
                        {formik.errors.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || !formik.isValid}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Name
                      </p>
                      <p className="text-muted-foreground">
                        {currentUser.firstName} {currentUser.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email
                      </p>
                      <p className="text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  {currentUser.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Phone
                        </p>
                        <p className="text-muted-foreground">
                          {currentUser.phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Role
                      </p>
                      <p className="text-muted-foreground capitalize">
                        {currentUser.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Member Since
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(currentUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={currentUser.isActive ? "default" : "destructive"}
                  >
                    {currentUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Email Verified
                  </span>
                  <Badge
                    variant={
                      currentUser.emailVerified ? "default" : "secondary"
                    }
                  >
                    {currentUser.emailVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
