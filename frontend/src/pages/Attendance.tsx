import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Calendar,
  CheckCircle2,
  XCircle,
  Home,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type AvailabilityStatus = 'AVAILABLE' | 'IDLE' | 'OFFLINE';
type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'WFH' | 'LEAVE';

interface AttendanceSession {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  lastActivity: string;
  status: AvailabilityStatus;
  activeDuration: number; // in minutes
  totalHours: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  lastActivity: string;
  status: AvailabilityStatus;
  totalHours: number;
  userName: string;
}

interface LeaveRequest {
  _id: string;
  type: 'leave' | 'wfh';
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface MergedAttendanceRecord {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
  displayStatus: AttendanceStatusType;
}

const Attendance: React.FC = () => {
  const [todaySession, setTodaySession] = useState<AttendanceSession | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [mergedHistory, setMergedHistory] = useState<MergedAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentMonthOnly, setShowCurrentMonthOnly] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>('OFFLINE');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Merge attendance records with leave requests
  const mergeAttendanceWithLeave = (
    attendance: AttendanceRecord[],
    leaveRequests: LeaveRequest[]
  ): MergedAttendanceRecord[] => {
    // Get date range for the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dateMap = new Map<string, MergedAttendanceRecord>();
    
    // Create entries for all days in range
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, {
        date: dateStr,
        checkInTime: null,
        checkOutTime: null,
        totalHours: 0,
        displayStatus: 'ABSENT'
      });
    }
    
    // Fill in attendance data - PRESENT status
    attendance.forEach(record => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        // Calculate hours: if checkOutTime is null, use current time
        let totalHours = record.totalHours;
        if (record.checkInTime && !record.checkOutTime) {
          const checkIn = new Date(record.checkInTime);
          const now = new Date();
          totalHours = parseFloat(((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
        }
        
        dateMap.set(dateStr, {
          date: dateStr,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          totalHours: totalHours,
          displayStatus: record.checkInTime ? 'PRESENT' : 'ABSENT'
        });
      }
    });
    
    // Override with approved leave requests - Priority: LEAVE > WFH
    leaveRequests.forEach(leave => {
      if (leave.status === 'approved') {
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (dateMap.has(dateStr)) {
            const current = dateMap.get(dateStr)!;
            dateMap.set(dateStr, {
              ...current,
              displayStatus: leave.type === 'leave' ? 'LEAVE' : 'WFH'
            });
          }
        }
      }
    });
    
    // Convert to array and sort by date descending
    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Fetch today's session and history
  const fetchAttendanceData = async () => {
    try {
      const [todayResponse, historyResponse, leaveResponse] = await Promise.all([
        apiService.attendance.getToday(),
        apiService.attendance.getHistory({ limit: 30 }),
        apiService.leave.getMy()
      ]);

      const session = todayResponse.session;
      setTodaySession(session);
      setAttendanceHistory(historyResponse.history || []);
      
      // Set availability and login state based on session
      if (session && session.checkInTime && !session.checkOutTime) {
        setAvailability('AVAILABLE');
        setIsLoggedIn(true);
      } else {
        setAvailability('OFFLINE');
        setIsLoggedIn(false);
      }
      
      // Merge attendance with leave data
      const merged = mergeAttendanceWithLeave(
        historyResponse.history || [],
        leaveResponse.leaveRequests || []
      );
      setMergedHistory(merged);
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      setAvailability('OFFLINE');
      setIsLoggedIn(false);
    }
  };

  // Fetch data on page load only
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Handle check-in
  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.attendance.checkIn();
      setTodaySession(response.session);
      setAvailability('AVAILABLE');
      setIsLoggedIn(true);
      toast({
        title: 'Check-in Successful',
        description: 'Your attendance has been recorded',
      });
    } catch (error: any) {
      toast({
        title: 'Check-in Failed',
        description: error.response?.data?.message || 'Failed to check in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle check-out and logout
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.attendance.checkOut();
      
      // Update state immediately
      setTodaySession(response.session);
      setAvailability('OFFLINE');
      setIsLoggedIn(false);
      
      toast({
        title: 'Check-out Successful',
        description: `Total hours worked: ${response.session.totalHours}h`,
      });
      
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: 'Check-out Failed',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate current active duration
  const [currentDuration, setCurrentDuration] = useState(0);
  
  useEffect(() => {
    const updateDuration = () => {
      if (todaySession && todaySession.checkInTime && !todaySession.checkOutTime) {
        // Active session - calculate from check-in time
        const checkInTime = new Date(todaySession.checkInTime);
        const now = new Date();
        const minutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
        setCurrentDuration(minutes);
      } else if (todaySession && todaySession.checkOutTime) {
        // Completed session - show total hours
        setCurrentDuration(Math.floor(todaySession.totalHours * 60));
      } else {
        // No session - reset to 0
        setCurrentDuration(0);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [todaySession]);

  const statusConfig = {
    AVAILABLE: { 
      label: 'Available', 
      color: 'bg-green-500', 
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
      description: 'You are visible to your team'
    },
    IDLE: { 
      label: 'Idle', 
      color: 'bg-yellow-500', 
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
      description: 'Away from desk'
    },
    OFFLINE: { 
      label: 'Offline', 
      color: 'bg-red-500', 
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
      description: 'Not available'
    },
  };

  const getStatusBadge = (status: AttendanceStatusType) => {
    const config = {
      PRESENT: { icon: CheckCircle2, label: 'Present', className: 'bg-green-100 text-green-700' },
      ABSENT: { icon: XCircle, label: 'Absent', className: 'bg-red-100 text-red-700' },
      WFH: { icon: Home, label: 'WFH', className: 'bg-blue-100 text-blue-700' },
      LEAVE: { icon: Calendar, label: 'Leave', className: 'bg-amber-100 text-amber-700' },
    };
    const statusInfo = config[status] || config.ABSENT;
    const { icon: Icon, label, className } = statusInfo;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", className)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  // Filter records by current month
  const getFilteredRecords = () => {
    if (!showCurrentMonthOnly) return mergedHistory;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return mergedHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Availability & Attendance
        </h1>
        <p className="text-muted-foreground">
          Manage your status and view attendance records
        </p>
      </div>

      {/* Status and Login Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Availability Status */}
        <div className="enterprise-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Availability Status</h3>
          <div className="space-y-3">
            {(['AVAILABLE', 'IDLE', 'OFFLINE'] as AvailabilityStatus[]).map((status) => (
              <div
                key={status}
                className={cn(
                  "p-4 rounded-xl border-2",
                  availability === status ? "border-current" : "border-transparent",
                  statusConfig[status].bgLight
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-4 h-4 rounded-full",
                    statusConfig[status].color
                  )} />
                  <div className="text-left flex-1">
                    <p className={cn(
                      "font-semibold",
                      statusConfig[status].textColor
                    )}>
                      {statusConfig[status].label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {statusConfig[status].description}
                    </p>
                  </div>
                  {availability === status && (
                    <CheckCircle2 className={cn(
                      "w-5 h-5",
                      statusConfig[status].textColor
                    )} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Session */}
        <div className="enterprise-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Today's Session</h3>
          
          <div className="p-4 rounded-xl bg-secondary/50 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logged in at</p>
                <p className="text-2xl font-bold text-foreground">
                  {todaySession?.checkInTime ? formatTime(todaySession.checkInTime) : 'Not logged in'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Duration</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(currentDuration)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant={isLoggedIn ? "outline" : "success"}
              className="flex-1"
              onClick={handleCheckIn}
              disabled={isLoading || isLoggedIn}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button
              variant={isLoggedIn ? "danger" : "outline"}
              className="flex-1"
              onClick={handleCheckOut}
              disabled={isLoading || !isLoggedIn}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="enterprise-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Attendance History</h3>
          <Button 
            variant={showCurrentMonthOnly ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowCurrentMonthOnly(!showCurrentMonthOnly)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {showCurrentMonthOnly ? 'Show All' : 'This Month'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Login Time</TableHead>
                <TableHead className="font-semibold">Logout Time</TableHead>
                <TableHead className="font-semibold">Hours</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredRecords().length > 0 ? (
                getFilteredRecords().map((record, index) => (
                  <TableRow key={`${record.date}-${index}`} className="hover:bg-secondary/30">
                    <TableCell className="font-medium">
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </TableCell>
                    <TableCell>{record.checkInTime ? formatTime(record.checkInTime) : '-'}</TableCell>
                    <TableCell>{record.checkOutTime ? formatTime(record.checkOutTime) : '-'}</TableCell>
                    <TableCell className="font-medium">
                      {record.totalHours > 0 ? `${record.totalHours}h` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.displayStatus)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
