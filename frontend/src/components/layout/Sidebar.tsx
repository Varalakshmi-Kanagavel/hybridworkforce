import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Clock, 
  Calendar, 
  FileText, 
  Settings, 
  Users,
  Palmtree,
  LogOut,
  Building2,
  CheckCircle2,
  Megaphone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Sidebar: React.FC = () => {
  const { user, logout, isManager, isHRAdmin, isSysAdmin } = useAuth();
  const location = useLocation();

  // Get role-specific dashboard path
  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    const roleDashboardMap: Record<string, string> = {
      EMPLOYEE: '/employee/dashboard',
      MANAGER: '/manager/dashboard',
      HR_ADMIN: '/hr/dashboard',
      SYS_ADMIN: '/system/dashboard',
    };
    return roleDashboardMap[user.role] || '/dashboard';
  };

  // Base navigation items (all users)
  const baseNavigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: getDashboardPath() },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Clock, label: 'Attendance', path: '/attendance' },
    { icon: Palmtree, label: 'Leave / WFH', path: '/leave' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Manager-specific items
  const managerItems = [
    { icon: CheckCircle2, label: 'Approvals', path: '/leave' }, // Shows pending approvals tab
  ];

  // HR Admin items
  const hrAdminItems = [
    { icon: Users, label: 'User Management', path: '/admin' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  // System Admin items
  const sysAdminItems = [
    { icon: Settings, label: 'System Settings', path: '/admin' },
  ];

  const isActive = (path: string) => {
    // Special handling for dashboard paths
    if (path.includes('/dashboard')) {
      return location.pathname.includes('/dashboard');
    }
    return location.pathname === path;
  };

  // Format role name for display
  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'Employee';
    const roleMap: Record<string, string> = {
      EMPLOYEE: 'Employee',
      MANAGER: 'Manager',
      HR_ADMIN: 'HR Admin',
      SYS_ADMIN: 'System Admin',
    };
    return roleMap[role] || role;
  };

  return (
    <aside 
      className="fixed left-0 top-0 w-64 h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, hsl(224 76% 18%) 0%, hsl(224 76% 22%) 50%, hsl(224 76% 20%) 100%)',
        boxShadow: '4px 0 24px -8px hsl(224 76% 15% / 0.4)'
      }}
    >
      {/* Logo Section */}
      <div className="p-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(199 89% 65%) 0%, hsl(217 91% 60%) 100%)',
              boxShadow: '0 4px 12px -2px hsl(199 89% 50% / 0.4)'
            }}
          >
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Cube AI</h1>
            <p className="text-xs text-sidebar-foreground/60 font-medium">Workforce Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {/* Base navigation items */}
        {baseNavigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "teams-sidebar-item",
              isActive(item.path) && "active"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Manager-specific items */}
        {isManager() && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Management
              </span>
            </div>
            {managerItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "teams-sidebar-item",
                  isActive(item.path) && "active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {/* HR Admin items */}
        {isHRAdmin() && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administration
              </span>
            </div>
            {hrAdminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "teams-sidebar-item",
                  isActive(item.path) && "active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {/* System Admin items */}
        {isSysAdmin() && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                System
              </span>
            </div>
            {sysAdminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "teams-sidebar-item",
                  isActive(item.path) && "active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
