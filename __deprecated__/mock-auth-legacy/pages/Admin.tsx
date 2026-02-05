import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  FileText, 
  Download,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  joinedDate: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

const Admin: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const users: User[] = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@cubeai.com', role: 'Manager', department: 'Engineering', status: 'active', joinedDate: '2023-06-15' },
    { id: '2', name: 'Mike Chen', email: 'mike.chen@cubeai.com', role: 'Employee', department: 'Engineering', status: 'active', joinedDate: '2023-08-20' },
    { id: '3', name: 'Emma Wilson', email: 'emma.wilson@cubeai.com', role: 'Employee', department: 'Design', status: 'active', joinedDate: '2023-09-10' },
    { id: '4', name: 'David Park', email: 'david.park@cubeai.com', role: 'HR', department: 'Human Resources', status: 'active', joinedDate: '2023-05-01' },
    { id: '5', name: 'Lisa Taylor', email: 'lisa.taylor@cubeai.com', role: 'Employee', department: 'Marketing', status: 'inactive', joinedDate: '2023-03-22' },
  ];

  const auditLogs: AuditLog[] = [
    { id: '1', action: 'User Created', user: 'Admin', timestamp: '2024-01-15 10:30 AM', details: 'Created user: Mike Chen' },
    { id: '2', action: 'Role Updated', user: 'Admin', timestamp: '2024-01-15 09:15 AM', details: 'Changed Sarah Johnson role to Manager' },
    { id: '3', action: 'Leave Approved', user: 'Sarah Johnson', timestamp: '2024-01-14 04:45 PM', details: 'Approved leave for Mike Chen' },
    { id: '4', action: 'User Deactivated', user: 'Admin', timestamp: '2024-01-14 02:30 PM', details: 'Deactivated user: Lisa Taylor' },
    { id: '5', action: 'Report Generated', user: 'David Park', timestamp: '2024-01-14 11:00 AM', details: 'Generated monthly attendance report' },
  ];

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      Admin: 'bg-destructive/10 text-destructive',
      Manager: 'bg-primary/10 text-primary',
      HR: 'bg-status-wfh/10 text-status-wfh',
      Employee: 'bg-secondary text-secondary-foreground',
    };
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", config[role] || config.Employee)}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status: 'active' | 'inactive') => {
    return (
      <span className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium",
        status === 'active' ? "bg-status-available/10 text-status-available" : "bg-muted text-muted-foreground"
      )}>
        {status === 'active' ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Manage users, roles, and system settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="enterprise-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-status-available/10">
              <Shield className="w-6 h-6 text-status-available" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.filter(u => u.status === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-status-wfh/10">
              <FileText className="w-6 h-6 text-status-wfh" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-sm text-muted-foreground">Reports Generated</p>
            </div>
          </div>
        </div>
        <div className="enterprise-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-status-idle/10">
              <Clock className="w-6 h-6 text-status-idle" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{auditLogs.length}</p>
              <p className="text-sm text-muted-foreground">Recent Activities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="reports">Export Reports</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="enterprise-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="enterprise">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input placeholder="Doe" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="john.doe@cubeai.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select defaultValue="employee">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select defaultValue="engineering">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineering">Engineering</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="hr">Human Resources</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="enterprise" className="w-full mt-4" onClick={() => setIsCreateDialogOpen(false)}>
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="font-semibold w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-secondary/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">{user.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-muted-foreground">{user.department}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.joinedDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{log.action}</p>
                      <span className="text-xs text-muted-foreground">by {log.user}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-6">Export Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'User List', description: 'Export all user data' },
                { title: 'Attendance Report', description: 'Full attendance history' },
                { title: 'Leave Summary', description: 'Leave and WFH data' },
                { title: 'Audit Trail', description: 'Complete activity log' },
                { title: 'Department Report', description: 'Department-wise breakdown' },
                { title: 'Compliance Report', description: 'Policy compliance data' },
              ].map((report, index) => (
                <div key={index} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <h4 className="font-medium text-foreground mb-1">{report.title}</h4>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
