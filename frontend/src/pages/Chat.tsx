import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Hash, 
  Users, 
  Pin,
  Bell,
  Paperclip,
  Smile
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: string;
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
}

const Chat: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const contacts: ChatContact[] = [
    { id: '1', name: 'General', avatar: '#', status: 'available', lastMessage: 'Team meeting at 3 PM', unread: 3, isChannel: true },
    { id: '2', name: 'Engineering', avatar: '#', status: 'available', lastMessage: 'Sprint review tomorrow', unread: 0, isChannel: true },
    { id: '3', name: 'Sarah Johnson', avatar: 'S', status: 'available', lastMessage: 'Sure, I\'ll review the PR', unread: 0 },
    { id: '4', name: 'Mike Chen', avatar: 'M', status: 'idle', lastMessage: 'Working on the dashboard', unread: 2 },
    { id: '5', name: 'Emma Wilson', avatar: 'E', status: 'offline', lastMessage: 'Out of office today', unread: 0 },
    { id: '6', name: 'David Park', avatar: 'D', status: 'available', lastMessage: 'Thanks for the update!', unread: 0 },
  ];

  const messages: ChatMessage[] = [
    { id: '1', sender: 'Sarah Johnson', avatar: 'S', message: 'Hey team! Just a reminder about our standup in 15 minutes. 🙌', timestamp: '09:45 AM', isSelf: false },
    { id: '2', sender: 'You', avatar: 'Y', message: 'Thanks for the reminder! I\'ll be there.', timestamp: '09:46 AM', isSelf: true },
    { id: '3', sender: 'Mike Chen', avatar: 'M', message: 'Can we also discuss the new feature requirements?', timestamp: '09:47 AM', isSelf: false },
    { id: '4', sender: 'Sarah Johnson', avatar: 'S', message: 'Absolutely! I\'ve prepared a quick overview.', timestamp: '09:48 AM', isSelf: false },
    { id: '5', sender: 'You', avatar: 'Y', message: 'Perfect. Looking forward to it!', timestamp: '09:49 AM', isSelf: true },
    { id: '6', sender: 'Emma Wilson', avatar: 'E', message: 'I\'ll join via video call since I\'m working from home today', timestamp: '09:50 AM', isSelf: false },
  ];

  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; date: string }>>([]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-status-available';
      case 'idle': return 'bg-status-idle';
      case 'offline': return 'bg-status-offline';
      default: return 'bg-gray-400';
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // In a real app, this would send the message
      setMessage('');
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
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Channels Section */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Hash className="w-4 h-4" />
              Channels
            </div>
            {contacts.filter(c => c.isChannel).map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedChat(contact.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  selectedChat === contact.id 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-secondary text-foreground"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-primary" />
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

          {/* Direct Messages Section */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Users className="w-4 h-4" />
              Direct Messages
            </div>
            {contacts.filter(c => !c.isChannel).map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedChat(contact.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  selectedChat === contact.id 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-secondary text-foreground"
                )}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                    {contact.avatar}
                  </div>
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    getStatusColor(contact.status)
                  )} />
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
        </div>
      </div>

      {/* Middle Panel - Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">General</h2>
              <p className="text-xs text-muted-foreground">42 members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Pin className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.isSelf ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium shrink-0">
                {msg.avatar}
              </div>
              <div className={cn("flex flex-col", msg.isSelf ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                </div>
                <div className={cn(
                  "chat-bubble",
                  msg.isSelf ? "chat-bubble-self" : "chat-bubble-other"
                )}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-secondary/50 border-0"
            />
            <Button variant="ghost" size="icon" className="shrink-0">
              <Smile className="w-5 h-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Announcements */}
      <div className="w-72 border-l border-border bg-card hidden xl:block">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Pin className="w-4 h-4 text-primary" />
            Announcements
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <p className="text-sm font-medium text-foreground mb-1">{announcement.title}</p>
              <p className="text-xs text-muted-foreground">{announcement.date}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Online Now</h3>
          <div className="space-y-2">
            {contacts.filter(c => c.status === 'available' && !c.isChannel).slice(0, 4).map((contact) => (
              <div key={contact.id} className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                    {contact.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-available border-2 border-card" />
                </div>
                <span className="text-sm text-foreground">{contact.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
