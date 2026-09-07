import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Home,
  BookOpen,
  Users,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Library,
  UserCheck,
  ClipboardList,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === "admin";

  const menuItems = isAdmin
    ? [
        { title: "Dashboard",           href: "/admin",                icon: BarChart3 },
        { title: "Manage Books",         href: "/admin/books",          icon: BookOpen },
        { title: "Manage Users",         href: "/admin/users",          icon: Users },
        { title: "Manage Borrows",       href: "/admin/borrows",        icon: ClipboardList },
        { title: "Manage Reservations",  href: "/admin/reservations",   icon: Calendar },
        { title: "Manage Fines",         href: "/admin/fines",          icon: DollarSign },
        { title: "Reports",              href: "/admin/reports",        icon: FileText },
        { title: "Profile",              href: "/admin/profile",        icon: UserCheck },
        { title: "Settings",             href: "/admin/settings",       icon: Settings },
      ]
    : [
        { title: "Dashboard",    href: "/dashboard",    icon: Home },
        { title: "Books",        href: "/books",        icon: BookOpen },
        { title: "My Borrows",   href: "/borrows",      icon: Library },
        { title: "Reservations", href: "/reservations", icon: Calendar },
        { title: "Fines",        href: "/fines",        icon: DollarSign },
        { title: "Profile",      href: "/profile",      icon: UserCheck },
        { title: "Settings",     href: "/settings",     icon: Settings },
      ];

  return (
    <aside
      className={cn(
        // Mobile: fixed drawer below header; Desktop: static sidebar
        "fixed top-16 bottom-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out",
        "lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
