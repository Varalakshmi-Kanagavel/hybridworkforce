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
  Building2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Clock, label: 'Attendance', path: '/attendance' },
    { icon: Palmtree, label: 'Leave / WFH', path: '/leave' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  const adminItems = [
    { icon: Users, label: 'Admin', path: '/admin' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside 
      className="w-64 flex flex-col"
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
        {navigationItems.map((item) => (
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

        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administration
              </span>
            </div>
            {adminItems.map((item) => (
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
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {user?.role || 'Employee'}
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
