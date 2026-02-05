import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Palmtree, 
  Home, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface LeaveRequest {
  _id?: string;
  id?: string;
  userId?: any;
  type: 'leave' | 'wfh';
  fromDate: string | Date;
  toDate: string | Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string | Date;
  employee?: string;
}

const Leave: React.FC = () => {
  const { user, isManager } = useAuth();
  const { toast } = useToast();
  const [requestType, setRequestType] = useState<'leave' | 'wfh'>('leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load leave requests
  useEffect(() => {
    const loadLeaveRequests = async () => {
      try {
        setLoading(true);
        const response = await apiService.leave.getMy();
        const formattedRequests = response.leaveRequests.map((req: any) => ({
          id: req._id,
          _id: req._id,
          type: req.type,
          fromDate: req.fromDate,
          toDate: req.toDate,
          reason: req.reason,
          status: req.status,
          appliedOn: req.appliedOn,
        }));
        setMyRequests(formattedRequests);

        // Load pending requests if manager
        if (isManager()) {
          const pendingResponse = await apiService.leave.getPending();
          const formattedPending = pendingResponse.leaveRequests.map((req: any) => ({
            id: req._id,
            _id: req._id,
            type: req.type,
            fromDate: req.fromDate,
            toDate: req.toDate,
            reason: req.reason,
            status: req.status,
            appliedOn: req.appliedOn,
            employee: req.userId?.name || 'Unknown',
          }));
          setTeamRequests(formattedPending);
        }
      } catch (error) {
        console.error('Failed to load leave requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leave requests',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadLeaveRequests();
  }, [isManager, toast]);

  const getStatusBadge = (status: LeaveRequest['status']) => {
    const config = {
      pending: { icon: Clock, label: 'Pending', className: 'bg-status-idle/10 text-status-idle' },
      approved: { icon: CheckCircle2, label: 'Approved', className: 'bg-status-available/10 text-status-available' },
      rejected: { icon: XCircle, label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
    };
    const { icon: Icon, label, className } = config[status];
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", className)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  const getTypeBadge = (type: LeaveRequest['type']) => {
    const config = {
      leave: { icon: Palmtree, label: 'Leave', className: 'bg-destructive/10 text-destructive' },
      wfh: { icon: Home, label: 'WFH', className: 'bg-status-wfh/10 text-status-wfh' },
    };
    const { icon: Icon, label, className } = config[type];
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", className)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiService.leave.apply({
        type: requestType,
        fromDate,
        toDate,
        reason,
      });
      
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
      
      // Reset form
      setFromDate('');
      setToDate('');
      setReason('');
      
      // Reload requests
      const response = await apiService.leave.getMy();
      const formattedRequests = response.leaveRequests.map((req: any) => ({
        id: req._id,
        _id: req._id,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        status: req.status,
        appliedOn: req.appliedOn,
      }));
      setMyRequests(formattedRequests);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.leave.approve(id);
      toast({
        title: 'Success',
        description: 'Leave request approved',
      });
      
      // Reload requests
      const response = await apiService.leave.getPending();
      const formattedPending = response.leaveRequests.map((req: any) => ({
        id: req._id,
        _id: req._id,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        status: req.status,
        appliedOn: req.appliedOn,
        employee: req.userId?.name || 'Unknown',
      }));
      setTeamRequests(formattedPending);
      
      // Also reload my requests
      const myResponse = await apiService.leave.getMy();
      const formattedRequests = myResponse.leaveRequests.map((req: any) => ({
        id: req._id,
        _id: req._id,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        status: req.status,
        appliedOn: req.appliedOn,
      }));
      setMyRequests(formattedRequests);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve leave request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiService.leave.reject(id);
      toast({
        title: 'Success',
        description: 'Leave request rejected',
      });
      
      // Reload requests
      const response = await apiService.leave.getPending();
      const formattedPending = response.leaveRequests.map((req: any) => ({
        id: req._id,
        _id: req._id,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        status: req.status,
        appliedOn: req.appliedOn,
        employee: req.userId?.name || 'Unknown',
      }));
      setTeamRequests(formattedPending);
      
      // Also reload my requests
      const myResponse = await apiService.leave.getMy();
      const formattedRequests = myResponse.leaveRequests.map((req: any) => ({
        id: req._id,
        _id: req._id,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        status: req.status,
        appliedOn: req.appliedOn,
      }));
      setMyRequests(formattedRequests);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject leave request',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Leave & Work From Home
        </h1>
        <p className="text-muted-foreground">
          Apply for leave or work from home requests
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <div className="lg:col-span-1">
          <div className="enterprise-card">
            <h3 className="text-lg font-semibold text-foreground mb-6">New Request</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select value={requestType} onValueChange={(value: 'leave' | 'wfh') => setRequestType(value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave">
                      <span className="flex items-center gap-2">
                        <Palmtree className="w-4 h-4 text-destructive" />
                        Leave
                      </span>
                    </SelectItem>
                    <SelectItem value="wfh">
                      <span className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-status-wfh" />
                        Work From Home
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for your request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px] resize-none"
                  required
                />
              </div>

              <Button type="submit" variant="enterprise" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </div>

          {/* Leave Balance */}
          <div className="enterprise-card mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Leave Balance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <span className="text-sm font-medium text-foreground">Casual Leave</span>
                <span className="text-lg font-bold text-primary">8 / 12</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <span className="text-sm font-medium text-foreground">Sick Leave</span>
                <span className="text-lg font-bold text-primary">5 / 6</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <span className="text-sm font-medium text-foreground">WFH Days</span>
                <span className="text-lg font-bold text-status-wfh">3 / 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="lg:col-span-2">
          <div className="enterprise-card">
            <Tabs defaultValue="my-requests">
              <TabsList className="mb-6">
                <TabsTrigger value="my-requests">My Requests</TabsTrigger>
                {isManager && (
                  <TabsTrigger value="team-requests">
                    Team Requests
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {teamRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="my-requests">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Duration</TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-secondary/30">
                          <TableCell>{getTypeBadge(request.type)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-foreground">
                                {new Date(request.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {new Date(request.fromDate).getTime() !== new Date(request.toDate).getTime() && (
                                  <> - {new Date(request.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Applied {new Date(request.appliedOn).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {isManager && (
                <TabsContent value="team-requests">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold">Employee</TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="font-semibold">Duration</TableHead>
                          <TableHead className="font-semibold">Reason</TableHead>
                          <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamRequests.map((request) => (
                          <TableRow key={request.id} className="hover:bg-secondary/30">
                            <TableCell className="font-medium">{request.employee}</TableCell>
                            <TableCell>{getTypeBadge(request.type)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-foreground">
                                  {new Date(request.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {new Date(request.fromDate).getTime() !== new Date(request.toDate).getTime() && (
                                    <> - {new Date(request.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                  )}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{request.reason}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="success" 
                                  className="h-8 px-3"
                                  onClick={() => handleApprove(request.id || request._id || '')}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="danger" 
                                  className="h-8 px-3"
                                  onClick={() => handleReject(request.id || request._id || '')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leave;
