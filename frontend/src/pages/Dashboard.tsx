import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useSocket } from '@/contexts/SocketContext';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Status = 'available' | 'idle' | 'offline';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('available');
  const [attendanceType, setAttendanceType] = useState<'office' | 'wfh'>('office');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginTime, setLoginTime] = useState('--:--');
  const [loginTimeDate, setLoginTimeDate] = useState<Date | null>(null);
  const [activeTime, setActiveTime] = useState('0h 0m');
  const [idleTime, setIdleTime] = useState('--');
  const [teamMembersOnline, setTeamMembersOnline] = useState(0);
  const [daysThisMonth, setDaysThisMonth] = useState(new Date().getDate());
  const [productivityScore, setProductivityScore] = useState(94);

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

        // Initialize dashboard state from API data
        if (data?.stats) {
          // Set work mode from API
          if (data.stats.workMode) {
            setAttendanceType(data.stats.workMode.toLowerCase() as 'office' | 'wfh');
          }

          // Set login time from API
          if (data.stats.loginTime) {
            const loginDate = new Date(data.stats.loginTime);
            setLoginTimeDate(loginDate);
            setLoginTime(loginDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Fetch today's attendance to determine status
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      if (!user) return;

      try {
        const response = await apiService.attendance.getToday();
        
        if (response.session) {
          const { checkInTime, checkOutTime } = response.session;
          
          // Determine status based on attendance
          if (checkInTime && !checkOutTime) {
            setStatus('available');
          } else {
            setStatus('offline');
          }
        } else {
          // No session today, user is offline
          setStatus('offline');
        }
      } catch (error) {
        console.error('Failed to fetch attendance status:', error);
        setStatus('offline');
      }
    };

    fetchAttendanceStatus();
  }, [user]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for attendance updates to update status
    const handleAttendanceUpdated = (data: any) => {
      if (data.userId === user?.id) {
        const timestamp = new Date(data.timestamp);
        setLoginTime(timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }));
        
        // Update status based on attendance event
        if (data.status) {
          if (data.status === 'OFFLINE') {
            setStatus('offline');
          } else {
            setStatus('available');
          }
        }
      }
    };

    // Listen for work mode updates
    const handleWorkModeUpdated = (data: any) => {
      if (data.userId === user?.id) {
        setAttendanceType(data.mode.toLowerCase() as 'office' | 'wfh');
      }
    };

    // Listen for active time updates
    const handleActiveTimeUpdated = (data: any) => {
      if (data.userId === user?.id) {
        setActiveTime(data.time);
      }
    };

    // Listen for team online updates
    const handleTeamOnlineUpdated = (data: any) => {
      setTeamMembersOnline(data.count);
    };

    socket.on('attendanceUpdated', handleAttendanceUpdated);
    socket.on('workModeUpdated', handleWorkModeUpdated);
    socket.on('activeTimeUpdated', handleActiveTimeUpdated);
    socket.on('teamOnlineUpdated', handleTeamOnlineUpdated);

    return () => {
      socket.off('attendanceUpdated', handleAttendanceUpdated);
      socket.off('workModeUpdated', handleWorkModeUpdated);
      socket.off('activeTimeUpdated', handleActiveTimeUpdated);
      socket.off('teamOnlineUpdated', handleTeamOnlineUpdated);
    };
  }, [socket, isConnected, user]);

  // Listen for online users count updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOnlineUsersCount = (count: number) => {
      setTeamMembersOnline(count);
    };

    socket.on('onlineUsersCount', handleOnlineUsersCount);

    return () => {
      socket.off('onlineUsersCount', handleOnlineUsersCount);
    };
  }, [socket, isConnected]);

  // Auto-update active time every minute
  useEffect(() => {
    if (!loginTimeDate) return;

    const updateActiveTime = () => {
      const now = new Date();
      const diffMs = now.getTime() - loginTimeDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setActiveTime(`${hours}h ${minutes}m`);
    };

    // Update immediately
    updateActiveTime();

    // Update every minute
    const interval = setInterval(updateActiveTime, 60000);

    return () => clearInterval(interval);
  }, [loginTimeDate]);

  // Get status description
  const getStatusDescription = () => {
    if (status === 'available') {
      return 'You are visible to your team';
    }
    return 'Not available';
  };

  // Handle work mode change
  const handleWorkModeChange = (mode: 'office' | 'wfh') => {
    setAttendanceType(mode);
    if (socket && isConnected) {
      socket.emit('workModeChange', { mode });
    }
  };

  const statusConfig = {
    available: { label: 'Available', color: 'bg-status-available', dotColor: 'bg-green-500' },
    idle: { label: 'Idle', color: 'bg-status-idle', dotColor: 'bg-amber-500' },
    offline: { label: 'Offline', color: 'bg-status-offline', dotColor: 'bg-red-500' },
  };

  // Dynamic stats based on role and API data
  const stats = dashboardData?.stats ? [
    { icon: Clock, label: 'Login Time', value: loginTime, color: 'text-primary' },
    { icon: Activity, label: 'Active Time', value: activeTime, color: 'text-status-available' },
    { icon: Coffee, label: 'Idle Time', value: idleTime, color: 'text-status-idle' },
  ] : [
    { icon: Clock, label: 'Login Time', value: loginTime, color: 'text-primary' },
    { icon: Activity, label: 'Active Time', value: activeTime, color: 'text-status-available' },
    { icon: Coffee, label: 'Idle Time', value: idleTime, color: 'text-status-idle' },
  ];

  // Dynamic quick stats based on role
  const getQuickStats = () => {
    const role = user?.role;
    
    if (role === 'MANAGER' && dashboardData?.stats) {
      return [
        { icon: Users, label: 'Team Size', value: dashboardData.stats.teamSize?.toString() || '0', color: 'bg-primary/10 text-primary' },
        { icon: CheckCircle2, label: 'Pending Approvals', value: dashboardData.stats.pendingApprovals?.toString() || '0', color: 'bg-status-idle/10 text-status-idle' },
        { icon: Activity, label: 'Team Online', value: dashboardData.stats.teamOnlineCount?.toString() || '0', color: 'bg-status-available/10 text-status-available' },
      ];
    } else if ((role === 'HR_ADMIN' || role === 'SYS_ADMIN') && dashboardData?.stats) {
      return [
        { icon: Users, label: 'Total Users', value: dashboardData.stats.totalUsers?.toString() || '0', color: 'bg-primary/10 text-primary' },
        { icon: CheckCircle2, label: 'Pending Approvals', value: dashboardData.stats.pendingApprovals?.toString() || '0', color: 'bg-status-idle/10 text-status-idle' },
        { icon: TrendingUp, label: 'Active Users', value: dashboardData.stats.activeUsers?.toString() || '0', color: 'bg-status-available/10 text-status-available' },
      ];
    } else {
      // Default for EMPLOYEE and when data is loading
      return [
        { icon: Users, label: 'Team Members Online', value: teamMembersOnline.toString(), color: 'bg-primary/10 text-primary' },
        { icon: CalendarIcon, label: 'Days This Month', value: daysThisMonth.toString(), color: 'bg-status-wfh/10 text-status-wfh' },
        { icon: TrendingUp, label: 'Productivity Score', value: `${productivityScore}%`, color: 'bg-status-available/10 text-status-available' },
      ];
    }
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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
          {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your workforce overview for today
        </p>
      </div>

      {/* Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Status Card */}
        <div className="enterprise-card col-span-1 lg:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Current Status</h3>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-4 h-4 rounded-full animate-pulse-soft",
              statusConfig[status].dotColor
            )} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground">
                  {statusConfig[status].label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {getStatusDescription()}
              </p>
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
              onClick={() => handleWorkModeChange('office')}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Office
            </Button>
            <Button
              size="sm"
              variant={attendanceType === 'wfh' ? 'default' : 'outline'}
              onClick={() => handleWorkModeChange('wfh')}
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
          <div className="grid grid-cols-2 gap-6">
            <button 
              className="quick-action-btn group"
              onClick={() => navigate('/leave')}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors mb-3">
                <Palmtree className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-sm font-medium text-foreground">Apply Leave</span>
            </button>
            <button 
              className="quick-action-btn group"
              onClick={() => navigate('/leave')}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-status-wfh/10 group-hover:bg-status-wfh/20 transition-colors mb-3">
                <Home className="w-6 h-6 text-status-wfh" />
              </div>
              <span className="text-sm font-medium text-foreground">Apply WFH</span>
            </button>
            <button 
              className="quick-action-btn group"
              onClick={() => navigate('/calendar')}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">View Calendar</span>
            </button>
            <button 
              className="quick-action-btn group"
              onClick={() => navigate('/attendance')}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-status-available/10 group-hover:bg-status-available/20 transition-colors mb-3">
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
                <span className="text-lg font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
