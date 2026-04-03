"use client";

import { useState } from 'react';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: number;
  created_at: string;
  sender_name: string;
}

export function ChatBox({ patientId }: { patientId?: number }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetcher = async () => {
    const url = patientId ? `/api/messages?patient_id=${patientId}` : `/api/messages?patient_id=0`; // Need robust null handle if undefined
    if (!patientId) return []; // Don't fetch if no patientId available for patient view yet
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch messages');
    const json = await res.json();
    return json.data as Message[];
  };

  const { data: messagesRaw, isLoading, refetch } = usePolling(fetcher, { interval: 5000 });
  const messages = messagesRaw || [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           content: content.trim(), 
           patient_id: patientId 
        }),
      });
      
      if (res.ok) {
        setContent('');
        refetch(); // fetch actively immediately
      }
    } catch {
       // ignore
    } finally {
      setSending(false);
    }
  }

  if (!patientId && isLoading) {
    return <Card className="p-12 flex justify-center"><Spinner /></Card>;
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="py-3 border-b border-slate-100">
        <CardTitle className="text-lg">Messages</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
         {isLoading && messages.length === 0 ? (
           <div className="flex justify-center p-4"><Spinner /></div>
         ) : messages.length === 0 ? (
           <p className="text-center text-slate-500 text-sm py-8">No messages yet. Send a message to start.</p>
         ) : (
           messages.map(msg => {
             const isMe = msg.sender_id === user?.id;
             return (
               <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                 <div className={cn(
                   "px-4 py-2 mt-1 relative text-sm", 
                   isMe ? "bg-primary text-white rounded-2xl rounded-tr-none" : "bg-white shadow-sm border border-slate-200 text-slate-900 rounded-2xl rounded-tl-none"
                 )}>
                    {msg.content}
                 </div>
                 <div className="flex items-center mt-1 space-x-1.5 text-[10px] text-slate-400">
                    <span className="font-medium">{isMe ? "You" : msg.sender_name}</span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
               </div>
             )
           })
         )}
      </CardContent>
      
      <div className="p-3 border-t border-slate-100 bg-white rounded-b-xl">
        <form onSubmit={handleSend} className="flex flex-row items-center gap-2">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" size="sm" disabled={!content.trim() || sending} className="w-10 h-10 p-0 rounded-full flex items-center justify-center shrink-0">
             <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
