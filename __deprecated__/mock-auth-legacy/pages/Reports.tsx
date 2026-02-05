import React from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Clock, 
  Users,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const Reports: React.FC = () => {
  const reportCards = [
    {
      title: 'Attendance Summary',
      description: 'Monthly attendance overview for all employees',
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Leave Report',
      description: 'Leave utilization and balance report',
      icon: FileText,
      color: 'bg-destructive/10 text-destructive',
    },
    {
      title: 'Productivity Report',
      description: 'Active hours and productivity metrics',
      icon: TrendingUp,
      color: 'bg-status-available/10 text-status-available',
    },
    {
      title: 'Team Overview',
      description: 'Team-wise attendance and availability',
      icon: Users,
      color: 'bg-status-wfh/10 text-status-wfh',
    },
  ];

  const recentReports = [
    { name: 'January 2024 Attendance Report', date: '2024-01-15', type: 'PDF' },
    { name: 'Q4 2023 Leave Summary', date: '2024-01-10', type: 'Excel' },
    { name: 'December 2023 Productivity', date: '2024-01-05', type: 'PDF' },
    { name: 'Annual Leave Balance 2023', date: '2024-01-01', type: 'Excel' },
  ];

  const quickStats = [
    { label: 'Total Working Days', value: '18', icon: Calendar, trend: '+2 from last month' },
    { label: 'Average Active Hours', value: '7.5h', icon: Clock, trend: '+0.3h from last month' },
    { label: 'Team Attendance', value: '94%', icon: Users, trend: '+2% from last month' },
    { label: 'WFH Utilization', value: '32%', icon: BarChart3, trend: '-5% from last month' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground">
          Generate and download workforce reports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, index) => (
          <div key={index} className="enterprise-card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-xs text-status-available">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Report Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-6">Generate Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportCards.map((report, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", report.color)}>
                    <report.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {report.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-1" />
                      Excel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Report Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Time Period</label>
                <Select defaultValue="this-month">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Department</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Report Type</label>
                <Select defaultValue="summary">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="comparison">Comparison</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="enterprise" className="w-full mt-4">
                Generate Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="enterprise-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Reports</h3>
          <Button variant="outline" size="sm">View All</Button>
        </div>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{report.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Generated on {new Date(report.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  report.type === 'PDF' ? "bg-destructive/10 text-destructive" : "bg-status-available/10 text-status-available"
                )}>
                  {report.type}
                </span>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
