import React, { useState } from 'react';
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

type AvailabilityStatus = 'available' | 'idle' | 'offline';

interface AttendanceRecord {
  date: string;
  loginTime: string;
  logoutTime: string;
  status: 'office' | 'wfh' | 'leave' | 'absent';
  hours: string;
}

const Attendance: React.FC = () => {
  const [status, setStatus] = useState<AvailabilityStatus>('available');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginTime, setLoginTime] = useState('09:00 AM');

  const attendanceRecords: AttendanceRecord[] = [
    { date: '2024-01-15', loginTime: '09:00 AM', logoutTime: '06:30 PM', status: 'office', hours: '9h 30m' },
    { date: '2024-01-14', loginTime: '09:15 AM', logoutTime: '06:00 PM', status: 'wfh', hours: '8h 45m' },
    { date: '2024-01-13', loginTime: '-', logoutTime: '-', status: 'leave', hours: '-' },
    { date: '2024-01-12', loginTime: '08:45 AM', logoutTime: '06:15 PM', status: 'office', hours: '9h 30m' },
    { date: '2024-01-11', loginTime: '09:30 AM', logoutTime: '06:45 PM', status: 'wfh', hours: '9h 15m' },
    { date: '2024-01-10', loginTime: '09:00 AM', logoutTime: '06:00 PM', status: 'office', hours: '9h' },
    { date: '2024-01-09', loginTime: '-', logoutTime: '-', status: 'absent', hours: '-' },
  ];

  const statusConfig = {
    available: { 
      label: 'Available', 
      color: 'bg-status-available', 
      textColor: 'text-status-available',
      bgLight: 'bg-green-50',
      description: 'You are visible to your team'
    },
    idle: { 
      label: 'Idle', 
      color: 'bg-status-idle', 
      textColor: 'text-status-idle',
      bgLight: 'bg-amber-50',
      description: 'Away from desk'
    },
    offline: { 
      label: 'Offline', 
      color: 'bg-status-offline', 
      textColor: 'text-status-offline',
      bgLight: 'bg-red-50',
      description: 'Not available'
    },
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    const config = {
      office: { icon: Building2, label: 'Office', className: 'bg-primary/10 text-primary' },
      wfh: { icon: Home, label: 'WFH', className: 'bg-status-wfh/10 text-status-wfh' },
      leave: { icon: Calendar, label: 'Leave', className: 'bg-destructive/10 text-destructive' },
      absent: { icon: XCircle, label: 'Absent', className: 'bg-muted text-muted-foreground' },
    };
    const { icon: Icon, label, className } = config[status];
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", className)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
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
            {(['available', 'idle', 'offline'] as AvailabilityStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                  status === s 
                    ? `border-current ${statusConfig[s].bgLight}` 
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  statusConfig[s].color
                )} />
                <div className="text-left flex-1">
                  <p className={cn(
                    "font-semibold",
                    status === s ? statusConfig[s].textColor : "text-foreground"
                  )}>
                    {statusConfig[s].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {statusConfig[s].description}
                  </p>
                </div>
                {status === s && (
                  <CheckCircle2 className={cn("w-5 h-5", statusConfig[s].textColor)} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Login/Logout */}
        <div className="enterprise-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Today's Session</h3>
          
          <div className="p-4 rounded-xl bg-secondary/50 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logged in at</p>
                <p className="text-2xl font-bold text-foreground">{loginTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-status-available/10">
                <CheckCircle2 className="w-6 h-6 text-status-available" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Duration</p>
                <p className="text-2xl font-bold text-foreground">4h 32m</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant={isLoggedIn ? "outline" : "success"}
              className="flex-1"
              onClick={() => {
                setIsLoggedIn(true);
                setLoginTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
              }}
              disabled={isLoggedIn}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button
              variant={isLoggedIn ? "danger" : "outline"}
              className="flex-1"
              onClick={() => setIsLoggedIn(false)}
              disabled={!isLoggedIn}
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
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            This Month
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
              {attendanceRecords.map((record, index) => (
                <TableRow key={index} className="hover:bg-secondary/30">
                  <TableCell className="font-medium">
                    {new Date(record.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </TableCell>
                  <TableCell>{record.loginTime}</TableCell>
                  <TableCell>{record.logoutTime}</TableCell>
                  <TableCell className="font-medium">{record.hours}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
