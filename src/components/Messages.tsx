import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Send, 
  Loader,
  Archive,
  Trash2,
  Clock,
  User,
  FileText,
  Plus,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bakalariService } from '../services/bakalariService';

interface Message {
  Id: string;
  DateSent: string;
  Sender?: {
    Id: string;
    Name: string;
    Type?: string;
  };
  Recipient?: {
    Id: string;
    Name: string;
  };
  Title: string;
  Content: string;
  IsRead: boolean;
  MessageType?: number;
  CanAnswer?: boolean;
  CanConfirm?: boolean;
  Attachments?: Array<{ Id: string; Name: string }>;
}

interface RecipientOption {
  Code: string;
  DisplayName: string;
  Name?: string;
  Abbreviation?: string;
}

interface MessageTypeOption {
  Abbreviation: string;
  Name: string;
  HasTitle?: boolean;
}

const inferRecipientType = (senderType?: string) => {
  switch ((senderType || '').toLowerCase()) {
    case 'student':
      return 'S';
    case 'parent':
      return 'P';
    case 'administrator':
    case 'teacher':
    default:
      return 'U';
  }
};

const buildReplyTitle = (title: string) => {
  if (!title) return 'Re: ';
  return title.toLowerCase().startsWith('re:') ? title : `Re: ${title}`;
};

export default function Messages() {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeText, setComposeText] = useState('');
  const [composeRecipientType, setComposeRecipientType] = useState('U');
  const [composeRecipientCode, setComposeRecipientCode] = useState('');
  const [composeMessageType, setComposeMessageType] = useState('OBECNA');
  const [availableRecipients, setAvailableRecipients] = useState<RecipientOption[]>([]);
  const [availableMessageTypes, setAvailableMessageTypes] = useState<MessageTypeOption[]>([]);

  const loadMessages = async () => {
    try {
      const [received, sent] = await Promise.all([
        bakalariService.getReceivedMessages(),
        bakalariService.getSentMessages()
      ]);

      setReceivedMessages([
        ...received,
      ].sort((a, b) => new Date(b.DateSent).getTime() - new Date(a.DateSent).getTime()));
      setSentMessages(sent);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const loadMessageTypes = async () => {
      const data = await bakalariService.getMessageTypes();

      if (data?.MessageTypes) {
        setAvailableMessageTypes(
          data.MessageTypes.map((item: any) => ({
            Abbreviation: item.Abbreviation,
            Name: item.Name,
            HasTitle: item.HasTitle,
          }))
        );
      }

      if (Array.isArray(data?.Recipients)) {
        setAvailableRecipients(data.Recipients);
      }
    };

    loadMessageTypes();
  }, []);

  const resetCompose = () => {
    setComposeOpen(false);
    setComposeError(null);
    setComposeTitle('');
    setComposeText('');
    setComposeRecipientType('U');
    setComposeRecipientCode('');
    setComposeMessageType('OBECNA');
  };

  const openMessage = async (message: Message) => {
    setSelectedMessage(message);
    setSelectedMessageDetail(null);
    setReplyText('');
    setReplyError(null);

    const folder = activeTab === 'received' ? 'received' : 'sent';
    const detail = await bakalariService.getMessageDetail(folder, message.Id);

    if (detail) {
      const normalizedDetail: Message = {
        Id: detail.Id || message.Id,
        DateSent: detail.SentDate || message.DateSent,
        Sender: detail.Sender || message.Sender,
        Recipient: message.Recipient,
        Title: detail.Title || message.Title,
        Content: detail.Text ? detail.Text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : message.Content,
        IsRead: detail.Read ?? message.IsRead,
        MessageType: detail.Type ?? message.MessageType,
        CanAnswer: detail.CanAnswer ?? message.CanAnswer,
        CanConfirm: detail.CanConfirm ?? message.CanConfirm,
        Attachments: detail.Attachments || message.Attachments || [],
      };

      setSelectedMessageDetail(normalizedDetail);

      if (activeTab === 'received' && !normalizedDetail.IsRead) {
        await bakalariService.markMessageAsRead(message.Id);
        setReceivedMessages((current) =>
          current.map((item) => (item.Id === message.Id ? { ...item, IsRead: true } : item))
        );
        setSelectedMessageDetail((current) => current ? { ...current, IsRead: true } : current);
      }
    }
  };

  const handleReply = async () => {
    if (!selectedMessage) return;

    const targetSender = selectedMessageDetail?.Sender || selectedMessage.Sender;
    if (!targetSender?.Id) {
      setReplyError('Chybí příjemce odpovědi.');
      return;
    }

    setReplySending(true);
    setReplyError(null);

    try {
      await bakalariService.sendMessage({
        MessageType: 'OBECNA',
        Title: buildReplyTitle(selectedMessageDetail?.Title || selectedMessage.Title),
        Text: replyText.trim(),
        RecipientType: inferRecipientType(targetSender.Type),
        Recipients: [targetSender.Id],
        Lifetime: null,
        DateFrom: null,
        DateTo: null,
        PreviousMessageId: selectedMessage.Id,
        CopyForClassTeacher: false,
        CopyForParent: false,
        EmailNotification: false,
        SendAsDirector: false,
        RequireConfirmation: false,
        TypeOfRatingId: null,
        Scale: null,
        Attachments: [],
        DraftDate: null,
      });

      setReplyText('');
      await loadMessages();
    } catch (error) {
      setReplyError('Odpověď se nepodařilo odeslat.');
    } finally {
      setReplySending(false);
    }
  };

  const handleComposeSend = async () => {
    if (!composeText.trim()) {
      setComposeError('Text zprávy je povinný.');
      return;
    }

    if (!composeRecipientCode) {
      setComposeError('Vyber příjemce.');
      return;
    }

    setComposeSending(true);
    setComposeError(null);

    try {
      await bakalariService.sendMessage({
        MessageType: composeMessageType,
        Title: composeTitle.trim() || 'Bez předmětu',
        Text: composeText.trim(),
        RecipientType: composeRecipientType,
        Recipients: [composeRecipientCode],
        Lifetime: null,
        DateFrom: null,
        DateTo: null,
        PreviousMessageId: null,
        CopyForClassTeacher: false,
        CopyForParent: false,
        EmailNotification: false,
        SendAsDirector: false,
        RequireConfirmation: false,
        TypeOfRatingId: null,
        Scale: null,
        Attachments: [],
        DraftDate: null,
      });

      await loadMessages();
      resetCompose();
    } catch (error) {
      setComposeError('Zprávu se nepodařilo odeslat.');
    } finally {
      setComposeSending(false);
    }
  };

  const recipientLabel = availableRecipients.find((recipient) => recipient.Code === composeRecipientCode)?.DisplayName
    || availableRecipients.find((recipient) => recipient.Code === composeRecipientCode)?.Name
    || '';

  const messages = activeTab === 'received' ? receivedMessages : sentMessages;
  const unreadCount = receivedMessages.filter(m => !m.IsRead).length;
  const visibleMessage = selectedMessageDetail || selectedMessage;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Právě teď';
    if (diffHours < 24) return `Před ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Před ${diffDays} dny`;
    
    return date.toLocaleDateString('cs-CZ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">Zprávy</h2>
          <p className="text-[#a1a1aa] text-sm">Komunikace se školou a pedagogy</p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
        >
          <Plus size={16} />
          Nová zpráva
        </button>
      </section>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-indigo-400" size={24} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#27272a]">
            <button
              onClick={() => setActiveTab('received')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'received'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-[#a1a1aa] hover:text-[#fafafa]'
              )}
            >
              <Mail size={16} className="inline mr-2" />
              Přijaté {unreadCount > 0 && <span className="ml-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'sent'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-[#a1a1aa] hover:text-[#fafafa]'
              )}
            >
              <Send size={16} className="inline mr-2" />
              Odeslané
            </button>
          </div>

          {activeTab === 'sent' && sentMessages.length === 0 && (
            <div className="glass-card mt-4 p-4 border border-indigo-500/20 bg-indigo-500/5 text-sm text-[#a1a1aa] flex items-center justify-between gap-4 flex-wrap">
              <span>Nemáš zatím žádné odeslané zprávy. Odeslat můžeš přes tlačítko Nová zpráva.</span>
              <button
                onClick={() => setComposeOpen(true)}
                className="rounded-lg bg-[#18181b] px-3 py-2 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a]"
              >
                Otevřít odesílání
              </button>
            </div>
          )}

          {/* Messages List */}
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Mail size={32} className="mx-auto text-[#71717a] mb-4" />
                <p className="text-[#a1a1aa]">
                  {activeTab === 'received' ? 'Žádné přijaté zprávy' : 'Žádné odeslané zprávy'}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.button
                  key={msg.Id}
                  onClick={() => void openMessage(msg)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "w-full glass-card p-4 text-left hover:border-[#3f3f46] transition-all",
                    !msg.IsRead && 'border-indigo-500/30 bg-indigo-500/5'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {!msg.IsRead && (
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <h3 className={cn(
                            "text-sm font-semibold truncate",
                            !msg.IsRead ? 'text-indigo-400' : 'text-[#fafafa]'
                          )}>
                            {msg.Title || '(Bez předmětu)'}
                          </h3>
                          <p className="text-xs text-[#a1a1aa] mt-1">
                            <User size={12} className="inline mr-1" />
                            {activeTab === 'received' && msg.Sender?.Name}
                            {activeTab === 'sent' && msg.Recipient?.Name}
                          </p>
                        </div>
                        
                        <div className="text-right text-xs text-[#71717a] whitespace-nowrap">
                          <Clock size={12} className="inline mr-1" />
                          {formatDate(msg.DateSent)}
                        </div>
                      </div>
                      
                      <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2">
                        {msg.Content || '(Bez obsahu)'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Message Detail Modal */}
          {selectedMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setSelectedMessage(null);
                setSelectedMessageDetail(null);
                setReplyText('');
                setReplyError(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#09090b] border border-[#27272a] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-[#09090b] border-b border-[#27272a] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[#fafafa]">{visibleMessage?.Title || '(Bez předmětu)'}</h2>
                      <p className="text-[10px] text-[#71717a] mt-2">
                        <User size={12} className="inline mr-1" />
                        {activeTab === 'received' && visibleMessage?.Sender?.Name}
                        {activeTab === 'sent' && visibleMessage?.Recipient?.Name}
                      </p>
                      <p className="text-[10px] text-[#71717a] mt-1">
                        <Clock size={12} className="inline mr-1" />
                        {new Date(visibleMessage?.DateSent || selectedMessage.DateSent).toLocaleDateString('cs-CZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="p-2 text-[#71717a] hover:text-[#fafafa] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  <div className="prose prose-invert max-w-none">
                    <div className="glass-card p-6 whitespace-pre-wrap text-sm text-[#a1a1aa] leading-relaxed">
                      {visibleMessage?.Content || '(Bez obsahu)'}
                    </div>
                  </div>

                  {activeTab === 'received' && (visibleMessage?.CanAnswer ?? true) && visibleMessage?.Sender?.Id && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[#fafafa]">Odpovědět</h3>
                        {replyError && <span className="text-xs text-rose-400">{replyError}</span>}
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Napiš odpověď..."
                        rows={5}
                        className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none transition-colors placeholder:text-[#52525b] focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReplyText('')}
                          className="px-4 py-2 text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                        >
                          Vymazat
                        </button>
                        <button
                          onClick={handleReply}
                          disabled={replySending || !replyText.trim()}
                          className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {replySending ? 'Odesílám...' : 'Odeslat odpověď'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa]">
                      <Archive size={14} />
                      Archivovat
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] transition-colors text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa]">
                      <Trash2 size={14} />
                      Smazat
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {composeOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={resetCompose}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#27272a] bg-[#09090b]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#27272a] p-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#fafafa]">Nová zpráva</h2>
                    <p className="text-xs text-[#a1a1aa]">Pošli zprávu přímo z Bakalářů</p>
                  </div>
                  <button onClick={resetCompose} className="p-2 text-[#71717a] transition-colors hover:text-[#fafafa]">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">Typ zprávy</span>
                      <select
                        value={composeMessageType}
                        onChange={(event) => setComposeMessageType(event.target.value)}
                        className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none focus:border-indigo-500"
                      >
                        {availableMessageTypes.map((option) => (
                          <option key={option.Abbreviation} value={option.Abbreviation}>
                            {option.Name}
                          </option>
                        ))}
                        {availableMessageTypes.length === 0 && <option value="OBECNA">Obecná zpráva</option>}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">Příjemce</span>
                      <select
                        value={composeRecipientCode}
                        onChange={(event) => setComposeRecipientCode(event.target.value)}
                        className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none focus:border-indigo-500"
                      >
                        <option value="">Vyber příjemce</option>
                        {availableRecipients.map((recipient) => (
                          <option key={recipient.Code} value={recipient.Code}>
                            {recipient.DisplayName || recipient.Name || recipient.Code}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">RecipientType</span>
                      <select
                        value={composeRecipientType}
                        onChange={(event) => setComposeRecipientType(event.target.value)}
                        className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none focus:border-indigo-500"
                      >
                        <option value="U">U - učitel</option>
                        <option value="S">S - student</option>
                        <option value="P">P - rodič</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">Adresát</span>
                      <input
                        value={recipientLabel}
                        readOnly
                        placeholder="Vybraný příjemce"
                        className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-3 text-sm text-[#a1a1aa] outline-none"
                      />
                    </label>
                  </div>

                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">Předmět</span>
                    <input
                      value={composeTitle}
                      onChange={(event) => setComposeTitle(event.target.value)}
                      placeholder="Předmět zprávy"
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b] focus:border-indigo-500"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa]">Text</span>
                    <textarea
                      value={composeText}
                      onChange={(event) => setComposeText(event.target.value)}
                      rows={8}
                      placeholder="Napiš zprávu..."
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b] focus:border-indigo-500"
                    />
                  </label>

                  {composeError && <p className="text-xs text-rose-400">{composeError}</p>}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={resetCompose}
                      className="px-4 py-2 text-xs font-medium text-[#a1a1aa] transition-colors hover:text-[#fafafa]"
                    >
                      Zrušit
                    </button>
                    <button
                      onClick={handleComposeSend}
                      disabled={composeSending}
                      className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {composeSending ? 'Odesílám...' : 'Odeslat'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
