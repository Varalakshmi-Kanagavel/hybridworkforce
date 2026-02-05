import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Clock, 
  Activity, 
  Coffee, 
  MapPin, 
  Palmtree, 
  Home,
  CheckCircle2,
  TrendingUp,
  Users,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Status = 'available' | 'idle' | 'offline';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<Status>('available');
  const [attendanceType, setAttendanceType] = useState<'office' | 'wfh'>('office');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        let data;
        
        // Determine which API endpoint to call based on role
        switch (user.role) {
          case 'EMPLOYEE':
            data = await apiService.dashboard.getEmployee();
            break;
          case 'MANAGER':
            data = await apiService.dashboard.getManager();
            break;
          case 'HR_ADMIN':
            data = await apiService.dashboard.getHR();
            break;
          case 'SYS_ADMIN':
            data = await apiService.dashboard.getSystem();
            break;
          default:
            data = await apiService.dashboard.getEmployee();
        }
        
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const statusConfig = {
    available: { label: 'Available', color: 'bg-status-available', dotColor: 'bg-green-500' },
    idle: { label: 'Idle', color: 'bg-status-idle', dotColor: 'bg-amber-500' },
    offline: { label: 'Offline', color: 'bg-status-offline', dotColor: 'bg-red-500' },
  };

  // Dynamic stats based on role and API data
  const stats = dashboardData?.stats ? [
    { icon: Clock, label: 'Login Time', value: '09:00 AM', color: 'text-primary' },
    { icon: Activity, label: 'Active Time', value: '4h 32m', color: 'text-status-available' },
    { icon: Coffee, label: 'Idle Time', value: '23m', color: 'text-status-idle' },
  ] : [
    { icon: Clock, label: 'Login Time', value: '09:00 AM', color: 'text-primary' },
    { icon: Activity, label: 'Active Time', value: '4h 32m', color: 'text-status-available' },
    { icon: Coffee, label: 'Idle Time', value: '23m', color: 'text-status-idle' },
  ];

  // Dynamic quick stats based on role
  const getQuickStats = () => {
    if (!dashboardData?.stats) {
      return [
        { icon: Users, label: 'Team Members Online', value: '12', color: 'bg-primary/10 text-primary' },
        { icon: CalendarIcon, label: 'Days This Month', value: '18', color: 'bg-status-wfh/10 text-status-wfh' },
        { icon: TrendingUp, label: 'Productivity Score', value: '94%', color: 'bg-status-available/10 text-status-available' },
      ];
    }

    const role = user?.role;
    if (role === 'MANAGER') {
      return [
        { icon: Users, label: 'Team Size', value: dashboardData.stats.teamSize?.toString() || '0', color: 'bg-primary/10 text-primary' },
        { icon: CheckCircle2, label: 'Pending Approvals', value: dashboardData.stats.pendingApprovals?.toString() || '0', color: 'bg-status-idle/10 text-status-idle' },
        { icon: Activity, label: 'Team Online', value: dashboardData.stats.teamOnlineCount?.toString() || '0', color: 'bg-status-available/10 text-status-available' },
      ];
    } else if (role === 'HR_ADMIN' || role === 'SYS_ADMIN') {
      return [
        { icon: Users, label: 'Total Users', value: dashboardData.stats.totalUsers?.toString() || '0', color: 'bg-primary/10 text-primary' },
        { icon: CheckCircle2, label: 'Pending Approvals', value: dashboardData.stats.pendingApprovals?.toString() || '0', color: 'bg-status-idle/10 text-status-idle' },
        { icon: TrendingUp, label: 'Active Users', value: dashboardData.stats.activeUsers?.toString() || '0', color: 'bg-status-available/10 text-status-available' },
      ];
    } else {
      return [
        { icon: Users, label: 'Team Members Online', value: '12', color: 'bg-primary/10 text-primary' },
        { icon: CalendarIcon, label: 'Days This Month', value: '18', color: 'bg-status-wfh/10 text-status-wfh' },
        { icon: TrendingUp, label: 'Productivity Score', value: '94%', color: 'bg-status-available/10 text-status-available' },
      ];
    }
  };

  const quickStats = getQuickStats();

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="text-center text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Good Morning, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your workforce overview for today
        </p>
      </div>

      {/* Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Status Card */}
        <div className="enterprise-card col-span-1 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Status</h3>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse-soft",
                  statusConfig[status].dotColor
                )} />
                <span className="text-2xl font-bold text-foreground">
                  {statusConfig[status].label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {(['available', 'idle', 'offline'] as Status[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={status === s ? 'default' : 'outline'}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "capitalize",
                    status === s && s === 'available' && "bg-status-available hover:bg-status-available/90",
                    status === s && s === 'idle' && "bg-status-idle hover:bg-status-idle/90",
                    status === s && s === 'offline' && "bg-status-offline hover:bg-status-offline/90"
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance Type Card */}
        <div className="enterprise-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Today's Work Mode</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={attendanceType === 'office' ? 'default' : 'outline'}
              onClick={() => setAttendanceType('office')}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Office
            </Button>
            <Button
              size="sm"
              variant={attendanceType === 'wfh' ? 'default' : 'outline'}
              onClick={() => setAttendanceType('wfh')}
              className={cn(
                "flex-1",
                attendanceType === 'wfh' && "bg-status-wfh hover:bg-status-wfh/90"
              )}
            >
              <Home className="w-4 h-4 mr-1" />
              WFH
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="enterprise-card">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-secondary")}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="enterprise-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="quick-action-btn group">
              <div className="p-3 rounded-xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                <Palmtree className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-sm font-medium text-foreground">Apply Leave</span>
            </button>
            <button className="quick-action-btn group">
              <div className="p-3 rounded-xl bg-status-wfh/10 group-hover:bg-status-wfh/20 transition-colors">
                <Home className="w-6 h-6 text-status-wfh" />
              </div>
              <span className="text-sm font-medium text-foreground">Apply WFH</span>
            </button>
            <button className="quick-action-btn group">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">View Calendar</span>
            </button>
            <button className="quick-action-btn group">
              <div className="p-3 rounded-xl bg-status-available/10 group-hover:bg-status-available/20 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-status-available" />
              </div>
              <span className="text-sm font-medium text-foreground">Mark Attendance</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="enterprise-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Overview</h3>
          <div className="space-y-4">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{stat.label}</span>
                </div>
                <span className="text-xl font-bold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
