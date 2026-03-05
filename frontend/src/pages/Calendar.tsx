import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Building2, Home, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';

interface DayInfo {
  date: number;
  status?: 'office' | 'wfh' | 'leave';
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface CalendarEntry {
  date: string;
  type: 'OFFICE' | 'WFH' | 'LEAVE';
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch calendar data from backend
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const data = await apiService.calendar.getMonth(year, month);
        setCalendarData(data);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setCalendarData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentDate]);

  // Convert calendar data to a map for easy lookup
  const attendanceData: Record<string, 'office' | 'wfh' | 'leave'> = {};
  calendarData.forEach(entry => {
    attendanceData[entry.date] = entry.type.toLowerCase() as 'office' | 'wfh' | 'leave';
  });

  const getDaysInMonth = (date: Date): DayInfo[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: DayInfo[] = [];
    const today = new Date();

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: i,
        status: attendanceData[dateStr],
        isCurrentMonth: true,
        isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'office':
        return 'bg-calendar-office text-white';
      case 'wfh':
        return 'bg-calendar-wfh text-white';
      case 'leave':
        return 'bg-calendar-leave text-white';
      default:
        return 'bg-transparent';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'office':
        return <Building2 className="w-3 h-3" />;
      case 'wfh':
        return <Home className="w-3 h-3" />;
      case 'leave':
        return <Palmtree className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const days = getDaysInMonth(currentDate);

  // Stats - remove "absent" from the list
  const stats = [
    { status: 'office', label: 'Office Days', count: Object.values(attendanceData).filter(s => s === 'office').length, color: 'bg-calendar-office' },
    { status: 'wfh', label: 'WFH Days', count: Object.values(attendanceData).filter(s => s === 'wfh').length, color: 'bg-calendar-wfh' },
    { status: 'leave', label: 'Leave Days', count: Object.values(attendanceData).filter(s => s === 'leave').length, color: 'bg-calendar-leave' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Calendar View
        </h1>
        <p className="text-muted-foreground">
          View your attendance overview
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="enterprise-card">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square p-1 rounded-xl transition-all cursor-pointer",
                    day.isCurrentMonth ? "hover:bg-secondary" : "opacity-40",
                    day.isToday && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <div
                    className={cn(
                      "w-full h-full rounded-lg flex flex-col items-center justify-center gap-1",
                      day.isCurrentMonth && day.status && getStatusStyle(day.status),
                      !day.status && day.isCurrentMonth && "bg-secondary/50"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      day.status ? "text-white" : "text-foreground"
                    )}>
                      {day.date}
                    </span>
                    {day.status && day.isCurrentMonth && (
                      <span className="text-white/80">
                        {getStatusIcon(day.status)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Legend */}
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Legend</h3>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.status} className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded", stat.color)} />
                  <span className="text-sm text-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">This Month</h3>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.status} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded", stat.color)} />
                    <span className="text-sm text-foreground">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Palmtree className="w-4 h-4 mr-2 text-calendar-leave" />
                Apply Leave
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Home className="w-4 h-4 mr-2 text-calendar-wfh" />
                Apply WFH
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
