import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Hash, 
  Users, 
  Pin,
  Bell,
  Paperclip,
  Smile,
  Plus,
  Megaphone,
  Reply,
  Pencil,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  avatar: string;
  message: string;
  timestamp: string;
  isSelf: boolean;
}

interface ChatContact {
  id: string;
  name: string;
  avatar: string;
  status: 'available' | 'idle' | 'offline';
  lastMessage: string;
  unread: number;
  isChannel?: boolean;
  type?: string;
  participants?: any[];
}

interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'announcement';
  name?: string;
  unreadCount?: number;
  isLocked?: boolean;
  admins?: Array<{ _id: string; name: string; email: string; role: string }>;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt?: string;
  }>;
  department?: string;
  createdBy: any;
  updatedAt: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  content: string;
  editedAt?: string | null;
  isDeletedForEveryone?: boolean;
  reactions?: Array<{
    emoji: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      role: string;
    } | string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isDeletedForEveryone?: boolean;
  } | null;
  statusByUser?: Array<{
    userId: string;
    status: 'sent' | 'delivered' | 'read';
    updatedAt: string;
  }>;
  mentions?: Array<{
    userId:
      | string
      | {
          _id: string;
          name?: string;
          email?: string;
          role?: string;
        };
  }>;
  createdAt: string;
}

interface NewChatUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt?: string;
}

interface ReceiveMessagePayload {
  conversationId: string;
  message: Message;
}

interface MentionNotification {
  _id: string;
  content: string;
  createdAt: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  conversationId: {
    _id: string;
    name?: string;
    type: 'direct' | 'group' | 'announcement';
  };
}

type NewChatMode = 'menu' | 'direct' | 'group' | 'announcement';
type ChatFilter = 'all' | 'direct' | 'group' | 'announcement';

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected, onlineUsers, lastSeenByUser } = useSocket();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; date: string }>>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; name: string }>>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<NewChatMode>('menu');
  const [availableUsers, setAvailableUsers] = useState<NewChatUser[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newConversationName, setNewConversationName] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [isManageConversationOpen, setIsManageConversationOpen] = useState(false);
  const [isMentionDialogOpen, setIsMentionDialogOpen] = useState(false);
  const [mentionNotifications, setMentionNotifications] = useState<MentionNotification[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [conversationParticipants, setConversationParticipants] = useState<NewChatUser[]>([]);
  const [conversationAdmins, setConversationAdmins] = useState<string[]>([]);
  const [renameValue, setRenameValue] = useState('');
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [conversationFilter, setConversationFilter] = useState<ChatFilter>('all');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [isPinnedDialogOpen, setIsPinnedDialogOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loadingPinnedMessages, setLoadingPinnedMessages] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<NewChatUser[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [mentionUnreadCount, setMentionUnreadCount] = useState(0);
  const [syncedTotalUnread, setSyncedTotalUnread] = useState<number | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const canCreateAnnouncement = ['MANAGER', 'HR_ADMIN', 'SYS_ADMIN'].includes(user?.role || '');
  const isAnnouncementConversation = activeConversation?.type === 'announcement';
  const canSendAnnouncementMessage = ['MANAGER', 'HR_ADMIN', 'SYS_ADMIN'].includes(user?.role || '');
  const canSendMessage = !isAnnouncementConversation || canSendAnnouncementMessage;
  const canModerateCurrentConversation = !!activeConversation && (
    activeConversation.createdBy?._id === user?.id
    || (activeConversation.admins || []).some((admin) => admin._id === user?.id)
    || ['MANAGER', 'HR_ADMIN', 'SYS_ADMIN'].includes(user?.role || '')
  );
  const isConversationLockedForUser = !!activeConversation?.isLocked && !canModerateCurrentConversation;
  const canSendInCurrentConversation = canSendMessage && !isConversationLockedForUser;
  const totalUnreadCount = syncedTotalUnread
    ?? conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);

  const toMentionAlias = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const activeMentionUsers: NewChatUser[] = activeConversation
    ? activeConversation.participants
        .filter((participant) => participant._id !== user?.id)
        .map((participant) => ({
          _id: participant._id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
        }))
    : [];

  const aliasToUserId = activeMentionUsers.reduce((acc, participant) => {
    acc[toMentionAlias(participant.name)] = participant._id;
    return acc;
  }, {} as Record<string, string>);

  const currentUserAliases = user?.name
    ? [toMentionAlias(user.name)]
    : [];

  const extractMentionIds = (text: string) => {
    const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
    return [...new Set(matches
      .map((token) => token.substring(1).toLowerCase())
      .map((alias) => aliasToUserId[alias])
      .filter(Boolean))];
  };

  const renderMessageWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (!part.startsWith('@')) {
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      }

      const alias = part.substring(1).toLowerCase();
      const isCurrentUserMention = currentUserAliases.includes(alias);

      return (
        <span
          key={`${part}-${index}`}
          className={cn(
            'font-semibold text-primary',
            isCurrentUserMention && 'bg-primary/20 px-1 rounded'
          )}
        >
          {part}
        </span>
      );
    });
  };

  const insertMention = (selectedUser: NewChatUser) => {
    const alias = toMentionAlias(selectedUser.name);
    const updatedValue = messageInput.replace(/@[a-zA-Z0-9_]*$/, `@${alias} `);
    setMessageInput(updatedValue);
    setMentionQuery('');
    setMentionSuggestions([]);
    setActiveMentionIndex(0);
  };

  const syncUnreadSummary = useCallback(async () => {
    try {
      const response = await apiService.chat.getUnreadSummary();
      const unreadByConversation: Array<{ conversationId: string; unreadCount: number }> = response.byConversation || [];

      const unreadMap = new Map(
        unreadByConversation.map((item) => [String(item.conversationId), item.unreadCount || 0])
      );

      setSyncedTotalUnread(
        typeof response.totalUnread === 'number' ? response.totalUnread : null
      );

      setConversations((prev) => prev.map((conversation) => (
        unreadMap.has(conversation._id)
          ? { ...conversation, unreadCount: unreadMap.get(conversation._id) || 0 }
          : conversation
      )));
    } catch (error) {
      console.error('Failed to sync unread summary:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedMenu = actionMenuRef.current?.contains(target);
      const clickedTrigger = actionMenuButtonRef.current?.contains(target);

      if (clickedMenu || clickedTrigger) {
        return;
      }

      setIsActionMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isActionMenuOpen]);

  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [activeConversation?._id]);

  // Fetch conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const response = await apiService.chat.getConversations();
        setConversations(response.conversations || []);
        
        // Select first conversation if available
        if (response.conversations && response.conversations.length > 0) {
          setActiveConversation(response.conversations[0]);
        }
      } catch (error: any) {
        console.error('Failed to load conversations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversations',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    const runSync = async () => {
      if (!isMounted) return;
      await syncUnreadSummary();
    };

    runSync();
    const intervalId = setInterval(runSync, 20000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [syncUnreadSummary]);

  // Load announcements (broadcasts)
  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        const response = await apiService.broadcast.getAll();
        const formattedAnnouncements = response.broadcasts.map((broadcast: any) => ({
          id: broadcast._id,
          title: broadcast.message.length > 50 
            ? broadcast.message.substring(0, 50) + '...' 
            : broadcast.message,
          date: new Date(broadcast.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
        }));
        setAnnouncements(formattedAnnouncements);
      } catch (error) {
        console.error('Failed to load broadcasts:', error);
      }
    };

    loadBroadcasts();
  }, []);

  // Load users when opening New Chat modal
  useEffect(() => {
    if (!isNewChatOpen) return;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await apiService.chat.getUsers();
        setAvailableUsers(response.users || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isNewChatOpen, toast]);

  const resetNewChatState = () => {
    setNewChatMode('menu');
    setSelectedParticipants([]);
    setNewConversationName('');
  };

  const handleNewChatOpenChange = (open: boolean) => {
    setIsNewChatOpen(open);
    if (!open) {
      resetNewChatState();
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const applyConversationUpdate = (updatedConversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((conversation) => conversation._id === updatedConversation._id);
      const next = exists
        ? prev.map((conversation) => (
            conversation._id === updatedConversation._id ? updatedConversation : conversation
          ))
        : [updatedConversation, ...prev];

      return next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    if (activeConversation?._id === updatedConversation._id) {
      setActiveConversation(updatedConversation);
    }
  };

  const loadMentionNotifications = async () => {
    try {
      setLoadingMentions(true);
      const response = await apiService.chat.getMentionNotifications(30);
      const mentionList = response.mentions || [];
      setMentionNotifications(mentionList);
      setMentionUnreadCount(mentionList.length);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load mention notifications',
        variant: 'destructive',
      });
    } finally {
      setLoadingMentions(false);
    }
  };

  const openMentionDialog = async () => {
    setIsMentionDialogOpen(true);
    await loadMentionNotifications();
    setMentionUnreadCount(0);
  };

  const handleViewMembers = () => {
    console.log('View Members clicked');
    setIsActionMenuOpen(false);
  };

  const handleAddMembers = () => {
    console.log('Add Members clicked');
    setIsActionMenuOpen(false);
  };

  const handleRenameGroup = () => {
    console.log('Rename Group clicked');
    setIsActionMenuOpen(false);
  };

  const handleLeaveConversationMenu = () => {
    console.log('Leave Conversation clicked');
    setIsActionMenuOpen(false);
  };

  const handleClearChat = () => {
    console.log('Clear Chat clicked');
    setIsActionMenuOpen(false);
  };

  useEffect(() => {
    loadMentionNotifications();
  }, []);

  const openManageConversationDialog = async () => {
    if (!activeConversation || activeConversation.type === 'direct') {
      return;
    }

    try {
      setGroupActionLoading(true);
      const response = await apiService.chat.getConversationParticipants(activeConversation._id);
      setConversationParticipants(response.participants || []);
      setConversationAdmins((response.admins || []).map((admin: NewChatUser) => admin._id));
      setRenameValue(activeConversation.name || '');
      setIsManageConversationOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation details',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleRenameConversation = async () => {
    if (!activeConversation || !renameValue.trim()) return;

    try {
      setGroupActionLoading(true);
      const response = await apiService.chat.renameGroup(activeConversation._id, renameValue.trim());
      if (response.conversation) {
        applyConversationUpdate(response.conversation);
      }
      toast({ title: 'Success', description: response.message || 'Conversation renamed' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename conversation',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!activeConversation) return;

    try {
      setGroupActionLoading(true);
      const response = await apiService.chat.addGroupMembers(activeConversation._id, [userId]);
      if (response.conversation) {
        applyConversationUpdate(response.conversation);
        setConversationParticipants(response.conversation.participants || []);
        setConversationAdmins((response.conversation.admins || []).map((admin: NewChatUser) => admin._id));
      }
      toast({ title: 'Success', description: response.message || 'Member added' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeConversation) return;

    try {
      setGroupActionLoading(true);
      const response = await apiService.chat.removeGroupMember(activeConversation._id, memberId);
      if (response.conversation) {
        applyConversationUpdate(response.conversation);
        setConversationParticipants(response.conversation.participants || []);
        setConversationAdmins((response.conversation.admins || []).map((admin: NewChatUser) => admin._id));
      }
      toast({ title: 'Success', description: response.message || 'Member removed' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleLeaveConversation = async () => {
    if (!activeConversation) return;

    try {
      setGroupActionLoading(true);
      const leavingConversationId = activeConversation._id;

      const response = await apiService.chat.leaveGroup(activeConversation._id);
      setConversations((prev) => {
        const remaining = prev.filter((conversation) => conversation._id !== leavingConversationId);
        setActiveConversation((current) => {
          if (!current || current._id !== leavingConversationId) return current;
          return remaining.length > 0 ? remaining[0] : null;
        });
        return remaining;
      });
      setIsManageConversationOpen(false);
      toast({ title: 'Success', description: response.message || 'Left conversation' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave conversation',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleToggleLockConversation = async () => {
    if (!activeConversation) return;

    try {
      setGroupActionLoading(true);
      const isLocked = !!activeConversation.isLocked;
      const response = isLocked
        ? await apiService.chat.unlockConversation(activeConversation._id)
        : await apiService.chat.lockConversation(activeConversation._id);

      const updated = {
        ...activeConversation,
        isLocked: !isLocked,
      };
      applyConversationUpdate(updated);

      toast({
        title: 'Success',
        description: response.message || (isLocked ? 'Conversation unlocked' : 'Conversation locked'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lock state',
        variant: 'destructive',
      });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      if (newChatMode === 'direct' && selectedParticipants.length !== 1) {
        toast({
          title: 'Validation error',
          description: 'Select exactly one user for direct chat',
          variant: 'destructive',
        });
        return;
      }

      if (newChatMode === 'group' && selectedParticipants.length < 2) {
        toast({
          title: 'Validation error',
          description: 'Select at least two users for group chat',
          variant: 'destructive',
        });
        return;
      }

      if (newChatMode === 'announcement' && selectedParticipants.length < 1) {
        toast({
          title: 'Validation error',
          description: 'Select at least one participant for announcement channel',
          variant: 'destructive',
        });
        return;
      }

      if ((newChatMode === 'group' || newChatMode === 'announcement') && !newConversationName.trim()) {
        toast({
          title: 'Validation error',
          description: 'Name is required',
          variant: 'destructive',
        });
        return;
      }

      setCreatingConversation(true);

      let payload: {
        type: 'direct' | 'group' | 'announcement';
        participants: string[];
        name?: string;
      };

      if (newChatMode === 'direct') {
        payload = {
          type: 'direct',
          participants: selectedParticipants,
        };
      } else if (newChatMode === 'group') {
        payload = {
          type: 'group',
          name: newConversationName.trim(),
          participants: selectedParticipants,
        };
      } else {
        payload = {
          type: 'announcement',
          name: newConversationName.trim(),
          participants: selectedParticipants,
        };
      }

      const response = await apiService.chat.createConversation(payload);
      const conversation: Conversation | undefined = response.conversation;

      if (!conversation) {
        throw new Error('Conversation not returned by server');
      }

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id);
        const next = exists
          ? prev.map((c) => (c._id === conversation._id ? conversation : c))
          : [conversation, ...prev];
        return next.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      setActiveConversation(conversation);
      setMessages([]);
      handleNewChatOpenChange(false);

      toast({
        title: 'Success',
        description:
          response.message === 'Conversation already exists'
            ? 'Conversation opened'
            : 'Conversation created',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    } finally {
      setCreatingConversation(false);
    }
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const [response] = await Promise.all([
          apiService.chat.getMessages(activeConversation._id),
          apiService.chat.markConversationRead(activeConversation._id),
        ]);
        setMessages(response.messages || []);

        setConversations((prev) => prev.map((conversation) => (
          conversation._id === activeConversation._id
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )));
        void syncUnreadSummary();
        
        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (error: any) {
        console.error('Failed to load messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeConversation, toast, syncUnreadSummary]);

  // Setup socket listeners for real-time messages
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (payload: ReceiveMessagePayload) => {
      const message = payload?.message;
      if (!message) return;

      const isMentioned = (message.mentions || []).some((mention) => {
        const mentionUserId = typeof mention.userId === 'string' ? mention.userId : mention.userId?._id;
        return mentionUserId === user?.id;
      });

      if (isMentioned && message.senderId?._id !== user?.id) {
        setMentionUnreadCount((prev) => prev + 1);
      }
      
      // If message belongs to active conversation, add it to messages
      if (activeConversation && message.conversationId === activeConversation._id) {
        setMessages((prev) => {
          // Check for duplicates
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
      // Update last message in conversations list
      setConversations((prevConvs) => {
        const next = prevConvs.map((conv) =>
          conv._id === message.conversationId
            ? { ...conv, updatedAt: message.createdAt || new Date().toISOString() }
            : conv
        );
        return next.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      void syncUnreadSummary();
    };

    const handleMessageSent = (_data: { message: Message }) => {
      return;
    };

    const handleMessageError = (error: { message: string }) => {
      console.error('Message error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    };

    const handleTypingStart = (payload: { conversationId: string; userId: string; name: string }) => {
      if (!activeConversation || payload.conversationId !== activeConversation._id) return;
      if (payload.userId === user?.id) return;

      setTypingUsers((prev) => {
        if (prev.some((entry) => entry.userId === payload.userId)) {
          return prev;
        }
        return [...prev, { userId: payload.userId, name: payload.name }];
      });
    };

    const handleTypingStop = (payload: { conversationId: string; userId: string }) => {
      if (!activeConversation || payload.conversationId !== activeConversation._id) return;
      setTypingUsers((prev) => prev.filter((entry) => entry.userId !== payload.userId));
    };

    const handleMessageUpdated = (payload: ReceiveMessagePayload) => {
      if (!payload?.message) return;
      setMessages((prev) => prev.map((message) => (
        message._id === payload.message._id ? payload.message : message
      )));
    };

    const handleMessageDeleted = (payload: { conversationId: string; messageId: string; scope: 'me' | 'everyone' }) => {
      if (!activeConversation || payload.conversationId !== activeConversation._id) return;

      if (payload.scope === 'me') {
        setMessages((prev) => prev.filter((message) => message._id !== payload.messageId));
        return;
      }

      setMessages((prev) => prev.map((message) => (
        message._id === payload.messageId
          ? {
              ...message,
              content: '',
              editedAt: new Date().toISOString(),
              isDeletedForEveryone: true,
            }
          : message
      )));
    };

    const handleReactionUpdated = (payload: ReceiveMessagePayload) => {
      if (!payload?.message) return;
      setMessages((prev) => prev.map((message) => (
        message._id === payload.message._id ? payload.message : message
      )));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_error', handleMessageError);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_error', handleMessageError);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [socket, isConnected, activeConversation, toast, user?.id, syncUnreadSummary]);

  // Handle conversation selection
  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    setTypingUsers([]);
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditInput('');
    setMentionQuery('');
    setMentionSuggestions([]);
    setActiveMentionIndex(0);
  };

  // Send message via Socket.IO
  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversation || !socket || !canSendInCurrentConversation) return;

    const messageData = {
      conversationId: activeConversation._id,
      content: messageInput.trim(),
      replyTo: replyTarget?._id || null,
      mentions: extractMentionIds(messageInput.trim()),
    };

    // Emit message via socket
    socket.emit('typing_stop', { conversationId: activeConversation._id });
    socket.emit('send_message', messageData);

    // Clear input immediately
    setMessageInput('');
    setReplyTarget(null);
    setMentionQuery('');
    setMentionSuggestions([]);
    setActiveMentionIndex(0);
  };

  const handleStartReply = (message: Message) => {
    setReplyTarget(message);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message._id);
    setEditInput(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInput('');
  };

  const handleSaveEdit = async (messageId: string) => {
    try {
      if (!editInput.trim()) {
        return;
      }

      const response = await apiService.chat.editMessage(messageId, { content: editInput.trim() });
      const updatedMessage = response.data;

      if (updatedMessage) {
        setMessages((prev) => prev.map((message) => (
          message._id === messageId ? updatedMessage : message
        )));
      }

      if (socket) {
        socket.emit('edit_message', {
          messageId,
          content: editInput.trim(),
          mentions: extractMentionIds(editInput.trim()),
        });
      }

      setEditingMessageId(null);
      setEditInput('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string, scope: 'me' | 'everyone') => {
    try {
      await apiService.chat.deleteMessage(messageId, scope);

      if (scope === 'me') {
        setMessages((prev) => prev.filter((message) => message._id !== messageId));
      } else {
        setMessages((prev) => prev.map((message) => (
          message._id === messageId
            ? { ...message, content: '', isDeletedForEveryone: true, editedAt: new Date().toISOString() }
            : message
        )));
      }

      if (socket && activeConversation) {
        socket.emit('delete_message', { messageId, scope, conversationId: activeConversation._id });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      if (socket && isConnected) {
        socket.emit('react_message', { messageId, emoji });
        return;
      }

      const response = await apiService.chat.reactToMessage(messageId, emoji);
      const updatedMessage = response.data;

      if (updatedMessage) {
        setMessages((prev) => prev.map((message) => (
          message._id === messageId ? updatedMessage : message
        )));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reaction',
        variant: 'destructive',
      });
    }
  };

  const handleSearchMessages = async () => {
    if (!activeConversation || !messageSearchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearchingMessages(true);
      const response = await apiService.chat.searchMessages(activeConversation._id, messageSearchQuery.trim(), 100);
      setSearchResults(response.messages || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search messages',
        variant: 'destructive',
      });
    } finally {
      setSearchingMessages(false);
    }
  };

  const clearMessageSearch = () => {
    setMessageSearchQuery('');
    setSearchResults(null);
  };

  const loadPinnedMessages = async () => {
    if (!activeConversation) return;

    try {
      setLoadingPinnedMessages(true);
      const response = await apiService.chat.getPinnedMessages(activeConversation._id);
      setPinnedMessages(response.pinnedMessages || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load pinned messages',
        variant: 'destructive',
      });
    } finally {
      setLoadingPinnedMessages(false);
    }
  };

  const openPinnedDialog = async () => {
    setIsPinnedDialogOpen(true);
    await loadPinnedMessages();
  };

  const handleTogglePinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await apiService.chat.unpinMessage(messageId);
      } else {
        await apiService.chat.pinMessage(messageId);
      }

      if (isPinnedDialogOpen) {
        await loadPinnedMessages();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isPinned ? 'unpin' : 'pin'} message`,
        variant: 'destructive',
      });
    }
  };

  // Convert Conversation to ChatContact format
  const conversationToContact = (conv: Conversation): ChatContact => {
    const isChannel = conv.type === 'group' || conv.type === 'announcement';
    const otherParticipant = conv.participants.find(p => p._id !== user?.id);
    const displayName = isChannel 
      ? (conv.name || conv.department || 'Group Chat')
      : (otherParticipant?.name || 'Unknown User');
    
    const avatar = isChannel 
      ? '#'
      : (otherParticipant?.name?.charAt(0).toUpperCase() || '?');

    // Check if any participant is online
    const hasOnlineUser = conv.participants.some(p => 
      p._id !== user?.id && onlineUsers.has(p._id)
    );

    return {
      id: conv._id,
      name: displayName,
      avatar,
      status: hasOnlineUser ? 'available' : 'offline',
      lastMessage: 'Click to view messages',
      unread: conv.unreadCount || 0,
      isChannel,
      type: conv.type,
      participants: conv.participants,
    };
  };

  // Convert backend messages to ChatMessage format
  const messageToDisplay = (msg: Message): ChatMessage => {
    const isSelf = msg.senderId._id === user?.id;
    const isDeleted = !!msg.isDeletedForEveryone;
    const isEdited = !!msg.editedAt;
    return {
      id: msg._id,
      sender: isSelf ? 'You' : msg.senderId.name,
      senderId: msg.senderId._id,
      avatar: msg.senderId.name.charAt(0).toUpperCase(),
      message: isDeleted
        ? 'This message was deleted'
        : `${msg.content}${isEdited ? ' (edited)' : ''}`,
      timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      isSelf,
    };
  };

  // Filter conversations based on search
  const filteredConversations = conversations
    .filter((conversation) => {
      if (conversationFilter === 'all') return true;
      return conversation.type === conversationFilter;
    })
    .map(conversationToContact)
    .filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const announcementContacts = filteredConversations.filter(c => c.type === 'announcement');
  const chatContacts = filteredConversations.filter(c => c.type !== 'announcement');
  const directContacts = filteredConversations.filter(c => !c.isChannel);
  const displayedMessageSource = searchResults || messages;
  const displayMessages = displayedMessageSource.map(messageToDisplay);

  // Get active contact display info
  const activeContact = activeConversation ? conversationToContact(activeConversation) : null;
  const participantCount = activeConversation?.participants.length || 0;
  const activeParticipantsNow = activeConversation
    ? activeConversation.participants.filter(
        (participant) => participant._id !== user?.id && onlineUsers.has(participant._id)
      ).length
    : 0;
  const directPeer = activeConversation?.type === 'direct'
    ? activeConversation.participants.find((participant) => participant._id !== user?.id)
    : null;

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Last seen unavailable';
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return 'Last seen unavailable';
    return `Last seen ${parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const activeConversationStatus = activeConversation?.type === 'direct'
    ? (directPeer && onlineUsers.has(directPeer._id)
        ? 'Active now'
      : formatLastSeen(lastSeenByUser.get(directPeer?._id || '') || directPeer?.lastLoginAt))
    : (activeParticipantsNow > 0
        ? `${activeParticipantsNow} active now • ${participantCount} ${participantCount === 1 ? 'member' : 'members'}`
        : `${participantCount} ${participantCount === 1 ? 'member' : 'members'}`);

  // Get online users for sidebar
  const onlineContactsList = directContacts
    .filter(c => c.status === 'available')
    .slice(0, 4);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-status-available';
      case 'idle': return 'bg-status-idle';
      case 'offline': return 'bg-status-offline';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="h-screen flex bg-background animate-fade-in">
      {/* Left Panel - Contacts */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-0"
            />
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => handleNewChatOpenChange(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total unread</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {totalUnreadCount}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            <Button size="sm" variant={conversationFilter === 'all' ? 'default' : 'outline'} onClick={() => setConversationFilter('all')}>All</Button>
            <Button size="sm" variant={conversationFilter === 'direct' ? 'default' : 'outline'} onClick={() => setConversationFilter('direct')}>Direct</Button>
            <Button size="sm" variant={conversationFilter === 'group' ? 'default' : 'outline'} onClick={() => setConversationFilter('group')}>Groups</Button>
            <Button size="sm" variant={conversationFilter === 'announcement' ? 'default' : 'outline'} onClick={() => setConversationFilter('announcement')}>Ann</Button>
          </div>
          {!isConnected && (
            <p className="mt-2 text-xs text-amber-500">Connecting to chat...</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <>
              {/* Chat Section */}
              {chatContacts.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    Chat
                  </div>
                  {chatContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        const conv = conversations.find(c => c._id === contact.id);
                        if (conv) handleConversationClick(conv);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        activeConversation?._id === contact.id 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-secondary text-foreground"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        {contact.type === 'group' ? (
                          <Hash className="w-4 h-4 text-primary" />
                        ) : (
                          <span className="text-xs font-semibold text-primary">{contact.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                      </div>
                      {contact.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                          {contact.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Announcements Section */}
              {announcementContacts.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Megaphone className="w-4 h-4" />
                    Announcements
                  </div>
                  {announcementContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        const conv = conversations.find(c => c._id === contact.id);
                        if (conv) handleConversationClick(conv);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        activeConversation?._id === contact.id 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-secondary text-foreground"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                      </div>
                      {contact.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                          {contact.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Middle Panel - Chat */}
      <div className="flex-1 flex flex-col">
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center",
                  activeContact.isChannel ? "rounded-lg bg-primary/10" : "rounded-full bg-secondary"
                )}>
                  {activeContact.isChannel ? (
                    <Hash className="w-5 h-5 text-primary" />
                  ) : (
                    <span className="text-sm font-medium">{activeContact.avatar}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{activeContact.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeConversationStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={openPinnedDialog}>
                  <Pin className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={openMentionDialog} className="relative">
                  <Bell className="w-5 h-5" />
                  {mentionUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                      {mentionUnreadCount > 9 ? '9+' : mentionUnreadCount}
                    </span>
                  )}
                </Button>
                <div className="relative">
                  <Button
                    ref={actionMenuButtonRef}
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsActionMenuOpen((prev) => !prev)}
                    disabled={activeConversation?.type === 'direct'}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                  {isActionMenuOpen && activeConversation?.type !== 'direct' && (
                    <div
                      ref={actionMenuRef}
                      className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-card shadow-lg py-1 z-30"
                    >
                      <button type="button" onClick={handleViewMembers} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                        View Members
                      </button>
                      <button type="button" onClick={handleAddMembers} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                        Add Members
                      </button>
                      <button type="button" onClick={handleRenameGroup} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                        Rename Group
                      </button>
                      <button type="button" onClick={handleLeaveConversationMenu} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                        Leave Conversation
                      </button>
                      <button type="button" onClick={handleClearChat} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                        Clear Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-0 scrollbar-thin">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search messages in this conversation..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchMessages()}
                />
                <Button variant="outline" onClick={handleSearchMessages} disabled={searchingMessages || !messageSearchQuery.trim()}>
                  Search
                </Button>
                {searchResults && (
                  <Button variant="ghost" onClick={clearMessageSearch}>Clear</Button>
                )}
              </div>
              {searchResults && (
                <p className="text-xs text-muted-foreground">
                  Showing {searchResults.length} search result(s)
                </p>
              )}
              {loadingMessages ? (
                <div className="text-center text-sm text-muted-foreground">
                  Loading messages...
                </div>
              ) : displayMessages.length === 0 ? (
                searchResults !== null ? (
                  <div className="text-center py-12">
                    <p className="text-base font-medium text-foreground">No messages found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different keyword</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-base font-medium text-foreground">Start a conversation</p>
                    <p className="text-sm text-muted-foreground mt-1">Send your first message</p>
                  </div>
                )
              ) : (
                displayedMessageSource.map((message, index) => {
                  const msg = messageToDisplay(message);
                  const previousMessage = displayedMessageSource[index - 1];
                  const isGroupedWithPrevious =
                    !!previousMessage && previousMessage.senderId._id === message.senderId._id;
                  const myMessage = message.senderId._id === user?.id;
                  const canDeleteForEveryone = myMessage || canModerateCurrentConversation;
                  const isPinnedMessage = pinnedMessages.some((item) => item._id === message._id);
                  const groupedReactions = (message.reactions || []).reduce((acc, reaction) => {
                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "group flex gap-3",
                        index === 0 ? 'mt-0' : isGroupedWithPrevious ? 'mt-1.5' : 'mt-5',
                        msg.isSelf ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium shrink-0",
                        isGroupedWithPrevious && 'invisible'
                      )}>
                        {msg.avatar}
                      </div>
                      <div className={cn("flex flex-col", msg.isSelf ? "items-end" : "items-start")}>
                        {!isGroupedWithPrevious && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {msg.sender}
                            </span>
                          </div>
                        )}

                        {message.replyTo && (
                          <div className="mb-1 px-2 py-1 rounded-md border border-border text-xs text-muted-foreground max-w-xs">
                            Reply to: {message.replyTo.isDeletedForEveryone ? 'Deleted message' : message.replyTo.content}
                          </div>
                        )}

                        {editingMessageId === message._id ? (
                          <div className="flex items-center gap-2 w-full max-w-md">
                            <Input
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              className="h-8"
                            />
                            <Button size="sm" onClick={() => handleSaveEdit(message._id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                          </div>
                        ) : (
                          <div className={cn(
                            "chat-bubble",
                            msg.isSelf ? "chat-bubble-self" : "chat-bubble-other"
                          )}>
                            {message.isDeletedForEveryone ? (
                              <span>This message was deleted</span>
                            ) : (
                              <>
                                {renderMessageWithMentions(message.content)}
                                {message.editedAt && <span className="ml-1 text-xs opacity-75">(edited)</span>}
                              </>
                            )}
                          </div>
                        )}

                        {Object.keys(groupedReactions).length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {Object.entries(groupedReactions).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                className="text-xs px-2 py-0.5 rounded-full bg-secondary hover:bg-secondary/80"
                                onClick={() => handleToggleReaction(message._id, emoji)}
                              >
                                {emoji} {count}
                              </button>
                            ))}
                          </div>
                        )}

                        <span className={cn(
                          "text-[11px] text-muted-foreground mt-1 px-1",
                          msg.isSelf ? 'self-end' : 'self-start'
                        )}>
                          {msg.timestamp}
                        </span>

                        {!message.isDeletedForEveryone && (
                          <div className="flex items-center gap-1 mt-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartReply(message)}>
                              <Reply className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleReaction(message._id, '👍')}>
                              <span className="text-xs">👍</span>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleReaction(message._id, '❤️')}>
                              <span className="text-xs">❤️</span>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleReaction(message._id, '😂')}>
                              <span className="text-xs">😂</span>
                            </Button>
                            {myMessage && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(message)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canModerateCurrentConversation && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleTogglePinMessage(message._id, isPinnedMessage)}
                              >
                                <Pin className={cn('w-3.5 h-3.5', isPinnedMessage ? 'text-primary' : 'text-muted-foreground')} />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteMessage(message._id, 'me')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {canDeleteForEveryone && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive"
                                onClick={() => handleDeleteMessage(message._id, 'everyone')}
                              >
                                Delete for all
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              {isAnnouncementConversation && !canSendAnnouncementMessage && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Read-only announcement channel. Employees can view messages but cannot send.
                </p>
              )}
              {isConversationLockedForUser && (
                <p className="mb-2 text-xs text-muted-foreground">
                  This conversation is locked. Only admins can send messages.
                </p>
              )}
              {replyTarget && (
                <div className="mb-2 p-2 rounded-md border border-border text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <span>
                    Replying to {replyTarget.senderId.name}: {replyTarget.isDeletedForEveryone ? 'Deleted message' : replyTarget.content}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleCancelReply}>Cancel</Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  placeholder={canSendInCurrentConversation ? 'Type a message...' : 'Messaging disabled in this channel'}
                  value={messageInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMessageInput(value);

                    const cursorText = value.slice(0, e.target.selectionStart ?? value.length);
                    const mentionMatch = cursorText.match(/@([a-zA-Z0-9_]*)$/);

                    if (mentionMatch) {
                      const query = mentionMatch[1].toLowerCase();
                      const filtered = activeMentionUsers.filter((participant) => {
                        const alias = toMentionAlias(participant.name);
                        return alias.includes(query) || participant.name.toLowerCase().includes(query);
                      });

                      setMentionQuery(query);
                      setMentionSuggestions(filtered.slice(0, 6));
                      setActiveMentionIndex(0);
                    } else {
                      setMentionQuery('');
                      setMentionSuggestions([]);
                      setActiveMentionIndex(0);
                    }

                    if (!socket || !activeConversation || !isConnected || !canSendInCurrentConversation) {
                      return;
                    }

                    socket.emit('typing_start', { conversationId: activeConversation._id });

                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }

                    typingTimeoutRef.current = setTimeout(() => {
                      socket.emit('typing_stop', { conversationId: activeConversation._id });
                    }, 900);
                  }}
                  onKeyDown={(e) => {
                    if (mentionSuggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveMentionIndex((prev) =>
                          (prev + 1) % mentionSuggestions.length
                        );
                        return;
                      }

                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveMentionIndex((prev) =>
                          (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
                        );
                        return;
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const selectedSuggestion = mentionSuggestions[activeMentionIndex];
                        if (selectedSuggestion) {
                          insertMention(selectedSuggestion);
                          return;
                        }
                      }
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 bg-secondary/50 border-0"
                  disabled={!isConnected || !canSendInCurrentConversation}
                />
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Smile className="w-5 h-5" />
                </Button>
                <Button 
                  variant="default" 
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected || !canSendInCurrentConversation}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {mentionQuery !== '' && mentionSuggestions.length > 0 && (
                <div className="mt-2 rounded-md border border-border bg-card max-h-32 overflow-y-auto">
                  {mentionSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion._id}
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 text-left transition-colors',
                        activeMentionIndex === index ? 'bg-secondary/70' : 'hover:bg-secondary/60'
                      )}
                      onClick={() => insertMention(suggestion)}
                      onMouseEnter={() => setActiveMentionIndex(index)}
                    >
                      <p className="text-sm font-medium">{suggestion.name}</p>
                      <p className="text-xs text-muted-foreground">@{toMentionAlias(suggestion.name)}</p>
                    </button>
                  ))}
                </div>
              )}
              {typingUsers.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {typingUsers.map((entry) => entry.name).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isNewChatOpen} onOpenChange={handleNewChatOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
            <DialogDescription>
              {newChatMode === 'menu'
                ? 'Choose how you want to start a conversation'
                : 'Configure participants and create your conversation'}
            </DialogDescription>
          </DialogHeader>

          {newChatMode === 'menu' ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setNewChatMode('direct')}
              >
                Start Direct Chat
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setNewChatMode('group')}
              >
                Create Group Chat
              </Button>
              {canCreateAnnouncement && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setNewChatMode('announcement')}
                >
                  Create Announcement
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(newChatMode === 'group' || newChatMode === 'announcement') && (
                <Input
                  placeholder={
                    newChatMode === 'group'
                      ? 'Group name (e.g. Backend Team)'
                      : 'Announcement channel name'
                  }
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                />
              )}

              {(newChatMode === 'direct' || newChatMode === 'group' || newChatMode === 'announcement') && (
                <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                  {loadingUsers ? (
                    <p className="text-sm text-muted-foreground p-2">Loading users...</p>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No users available</p>
                  ) : (
                    availableUsers.map((participant) => {
                      const isSelected = selectedParticipants.includes(participant._id);
                      return (
                        <button
                          key={participant._id}
                          type="button"
                          onClick={() => {
                            if (newChatMode === 'direct') {
                              setSelectedParticipants([participant._id]);
                              return;
                            }
                            toggleParticipant(participant._id);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between rounded-md px-3 py-2 text-left transition-colors',
                            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{participant.name}</p>
                            <p className="text-xs text-muted-foreground">{participant.email}</p>
                          </div>
                          <span className="text-xs font-medium">{participant.role}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {newChatMode !== 'menu' && (
              <Button variant="outline" onClick={() => setNewChatMode('menu')}>
                Back
              </Button>
            )}
            {newChatMode !== 'menu' && (
              <Button onClick={handleCreateConversation} disabled={creatingConversation}>
                {creatingConversation ? 'Saving...' : 'Create'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMentionDialogOpen} onOpenChange={setIsMentionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mention Notifications</DialogTitle>
            <DialogDescription>
              Recent messages where you were mentioned.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {loadingMentions ? (
              <p className="text-sm text-muted-foreground">Loading mentions...</p>
            ) : mentionNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mention notifications.</p>
            ) : (
              mentionNotifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="w-full text-left p-3 rounded-md border hover:bg-secondary/50 transition-colors"
                  onClick={() => {
                    const matchedConversation = conversations.find(
                      (conversation) => conversation._id === item.conversationId?._id
                    );
                    if (matchedConversation) {
                      handleConversationClick(matchedConversation);
                    }
                    setIsMentionDialogOpen(false);
                  }}
                >
                  <p className="text-sm font-medium">@{item.senderId?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.content || '(deleted message)'}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMentionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPinnedDialogOpen} onOpenChange={setIsPinnedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pinned Messages</DialogTitle>
            <DialogDescription>
              Important pinned notes in this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {loadingPinnedMessages ? (
              <p className="text-sm text-muted-foreground">Loading pinned messages...</p>
            ) : pinnedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pinned messages.</p>
            ) : (
              pinnedMessages.map((message) => (
                <div key={message._id} className="p-3 rounded-md border space-y-1">
                  <p className="text-sm font-medium">{message.senderId?.name || 'Unknown'}</p>
                  <p className="text-sm text-foreground break-words">{message.content || '(deleted)'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</p>
                  {canModerateCurrentConversation && (
                    <Button size="sm" variant="ghost" onClick={() => handleTogglePinMessage(message._id, true)}>
                      Unpin
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPinnedDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageConversationOpen} onOpenChange={setIsManageConversationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Conversation</DialogTitle>
            <DialogDescription>
              Manage members, name, and lock state.
            </DialogDescription>
          </DialogHeader>

          {activeConversation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Conversation Name</p>
                <div className="flex gap-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    disabled={!canModerateCurrentConversation || groupActionLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={handleRenameConversation}
                    disabled={!canModerateCurrentConversation || groupActionLoading || !renameValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members ({conversationParticipants.length})</p>
                <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {conversationParticipants.map((member) => {
                    const isAdmin = conversationAdmins.includes(member._id)
                      || activeConversation.createdBy?._id === member._id;
                    const canRemove = canModerateCurrentConversation
                      && activeConversation.createdBy?._id !== member._id;

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}{isAdmin ? ' • Admin' : ''}</p>
                        </div>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member._id)}
                            disabled={groupActionLoading}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {canModerateCurrentConversation && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Add Members</p>
                  <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1">
                    {availableUsers
                      .filter((candidate) => !conversationParticipants.some((member) => member._id === candidate._id))
                      .map((candidate) => (
                        <div
                          key={candidate._id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-secondary/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.role}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddMember(candidate._id)}
                            disabled={groupActionLoading}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <div className="w-full flex items-center justify-between">
              <Button
                variant="destructive"
                onClick={handleLeaveConversation}
                disabled={groupActionLoading}
              >
                Leave Conversation
              </Button>
              <div className="flex items-center gap-2">
                {canModerateCurrentConversation && activeConversation && (
                  <Button
                    variant="outline"
                    onClick={handleToggleLockConversation}
                    disabled={groupActionLoading}
                  >
                    {activeConversation.isLocked ? 'Unlock' : 'Lock'} Conversation
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsManageConversationOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Right Panel - Announcements */}
      <div className="w-72 border-l border-border bg-card hidden xl:block">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Pin className="w-4 h-4 text-primary" />
            Announcements
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No announcements
            </p>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-foreground mb-1">{announcement.title}</p>
                <p className="text-xs text-muted-foreground">{announcement.date}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
            Online Now
            <span className="text-xs font-normal text-muted-foreground">
              ({onlineUsers.size})
            </span>
          </h3>
          <div className="space-y-2">
            {onlineContactsList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No users online
              </p>
            ) : (
              onlineContactsList.map((contact) => (
                <div key={contact.id} className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                      {contact.avatar}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-available border-2 border-card" />
                  </div>
                  <span className="text-sm text-foreground truncate">{contact.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
