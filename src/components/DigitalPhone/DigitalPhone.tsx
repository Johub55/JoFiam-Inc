import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { euro, formatCardUid } from '../../services/store';
import { AudioFX } from '../../services/audio';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  MessageSquare, 
  Home, 
  Send, 
  X, 
  CreditCard, 
  User, 
  Wifi, 
  Battery, 
  Search, 
  MessageCircle, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  Wallet, 
  Lock, 
  Compass, 
  PhoneIncoming, 
  Star,
  Sparkles,
  RefreshCw,
  MoreVertical,
  Trash2,
  Mic,
  MicOff,
  ShoppingBag,
  Briefcase,
  Unlock,
  Users
} from 'lucide-react';
import { BankAccount, PosUser } from '../../types';

interface SMSMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
  read: boolean;
}

interface SMSContact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  phone: string;
  unread: boolean;
  messages: SMSMessage[];
  autoReplies?: { keywords: string[]; replies: string[] }[];
  isCustom?: boolean;
}

export const DigitalPhone: React.FC = () => {
  const { 
    bankAccounts, 
    currentBankAccount, 
    setCurrentBankAccount,
    orders,
    posUsers,
    createCashRequest,
    saveBankAccount
  } = useApp();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Apps: 'home', 'werkpay', 'phone', 'messages', 'settings', 'werkdonalds'
  const [activeApp, setActiveApp] = useState<'home' | 'werkpay' | 'phone' | 'messages' | 'settings' | 'werkdonalds'>('home');
  const [time, setTime] = useState<string>('12:00');
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);

  // Keyboard Click Audio effect helper
  const playClick = () => {
    try {
      AudioFX.beep();
    } catch {}
  };

  // Status Bar Time
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hrs = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      setTime(`${hrs}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // WERKPAY MOBILE APP STATE (SAFE LOGIN)
  // ==========================================
  const [wpAccount, setWpAccount] = useState<BankAccount | null>(null);
  const [wpIsLoggedIn, setWpIsLoggedIn] = useState<boolean>(false);
  const [wpAuthPendingAccount, setWpAuthPendingAccount] = useState<BankAccount | null>(null);
  const [wpAuthPin, setWpAuthPin] = useState<string>('');
  const [wpAuthError, setWpAuthError] = useState<string | null>(null);
  const [wpTransferTarget, setWpTransferTarget] = useState<string>('');
  const [wpTransferAmount, setWpTransferAmount] = useState<string>('');
  const [wpTransferSuccess, setWpTransferSuccess] = useState<boolean>(false);

  // Sync mobile active account if global active account changes
  useEffect(() => {
    if (currentBankAccount) {
      setWpAccount(currentBankAccount);
      setWpIsLoggedIn(true);
    }
  }, [currentBankAccount]);

  // Handle WerkPay PIN authentication
  const handleWpPinPress = (num: string) => {
    playClick();
    setWpAuthError(null);
    if (num === 'C') {
      setWpAuthPin('');
      return;
    }
    if (wpAuthPin.length < 4) {
      const nextPin = wpAuthPin + num;
      setWpAuthPin(nextPin);
      
      // Auto-submit at 4 digits
      if (nextPin.length === 4) {
        verifyWpPin(nextPin);
      }
    }
  };

  const verifyWpPin = (pin: string) => {
    if (!wpAuthPendingAccount) return;
    const correctPin = wpAuthPendingAccount.pin_code || '1234';
    const correctPass = wpAuthPendingAccount.password || '1234';

    if (pin === correctPin || pin === correctPass) {
      // Success!
      setWpAccount(wpAuthPendingAccount);
      setWpIsLoggedIn(true);
      setWpAuthPendingAccount(null);
      setWpAuthPin('');
      setWpAuthError(null);
      try { AudioFX.bell(); } catch {}
    } else {
      // Failed
      setWpAuthError('Pincode onjuist! (Standaard is 1234)');
      setWpAuthPin('');
      try { AudioFX.beep(); } catch {}
    }
  };

  // ==========================================
  // REAL MICROPHONE CALLING APP STATE
  // ==========================================
  const [dialInput, setDialInput] = useState<string>('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'incoming'>('idle');
  const [callTimer, setCallTimer] = useState<number>(0);
  const [callingContact, setCallingContact] = useState<{ name: string; phone: string; role?: string } | null>(null);
  const [recentCalls, setRecentCalls] = useState<{ name: string; phone: string; time: string; direction: 'in' | 'out' }[]>([
    { name: 'Mamma', phone: '06-45217422', time: 'Gisteren', direction: 'in' },
    { name: 'Werkdonalds Manager', phone: '0900-DONALDS', time: 'Eergisteren', direction: 'out' }
  ]);

  const callIntervalRef = useRef<any>(null);

  // Real Microphone Web Audio API
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micFrequencies, setMicFrequencies] = useState<number[]>(new Array(12).fill(6));
  const [micPermissionError, setMicPermissionError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Start Mic capturing and Analyser
  const requestMicAccess = async () => {
    try {
      setMicPermissionError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const ans = ctx.createAnalyser();
      ans.fftSize = 64; // Small size for responsive visuals
      source.connect(ans);

      setAudioCtx(ctx);
      setAnalyser(ans);
    } catch (err) {
      console.warn('Real microphone access denied or unavailable:', err);
      setMicPermissionError(true);
    }
  };

  const stopMicAccess = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      setAudioCtx(null);
    }
    setAnalyser(null);
    setMicFrequencies(new Array(12).fill(6));
  };

  // Update dynamic waveform data from actual mic
  useEffect(() => {
    if (!analyser || isMuted) return;
    let active = true;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateWaveform = () => {
      if (!active) return;
      analyser.getByteFrequencyData(dataArray);
      // Map 12 audio frequency bins to percentages for height representation
      const bands = Array.from(dataArray.slice(0, 12)).map(val => {
        // scale value from 0-255 to 4-96%
        return Math.max(6, Math.round((val / 255) * 100));
      });
      setMicFrequencies(bands);
      requestAnimationFrame(updateWaveform);
    };

    updateWaveform();
    return () => {
      active = false;
    };
  }, [analyser, isMuted]);

  const startCall = async (name: string, phone: string, role?: string) => {
    playClick();
    setCallingContact({ name, phone, role });
    setCallState('calling');
    setCallTimer(0);

    // Play ringing bell audio
    try { AudioFX.bell(); } catch {}

    // Instantly request microphone so it is ready
    await requestMicAccess();

    setTimeout(() => {
      setCallState('connected');
      callIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2500);
  };

  const hangUp = () => {
    try { AudioFX.beep(); } catch {}
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
    setCallState('idle');
    setCallTimer(0);
    setCallingContact(null);
    stopMicAccess();
  };

  // ==========================================
  // REAL-TIME PERSISTENT SMS & CHAT
  // ==========================================
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [smsInput, setSmsInput] = useState<string>('');
  const [showNewChatList, setShowNewChatList] = useState<boolean>(false);
  const [contacts, setContacts] = useState<SMSContact[]>([]);

  // Initialize Contacts list with static profiles, merging with localStorage SMS history
  useEffect(() => {
    const defaultContacts: SMSContact[] = [
      {
        id: 'manager',
        name: 'Manager Werkdonalds',
        avatar: '👨‍💼',
        role: 'Filiaalmanager',
        phone: '0900-DONALDS',
        unread: false,
        messages: [
          { id: '1', sender: 'them', text: 'Hee! Zijn de burgers al klaar voor tafel 4?', timestamp: '10:30', read: false },
          { id: '2', sender: 'me', text: 'Ja, de keuken is er nu mee bezig!', timestamp: '10:32', read: true },
          { id: '3', sender: 'them', text: 'Top. Zorg ook dat de prullenbakken geleegd worden vandaag.', timestamp: '10:33', read: false }
        ],
        autoReplies: [
          { keywords: ['burger', 'keuken', 'eten'], replies: ['Mooi zo, doorwerken!', 'Let op de hygiëne!', 'Zijn de frietjes ook vers?'] },
          { keywords: ['klaar', 'af', 'klaar!'], replies: ['Geweldig werk, neem direct een korte pauze.', 'Topper! Houd het tempo hoog.'] },
          { keywords: ['werkpay', 'geld', 'rekening', 'salaris'], replies: ['Salaris is overgemaakt via WerkPay!', 'Check je saldo in de WerkPay app!'] }
        ]
      },
      {
        id: 'jan',
        name: 'Frietbakker Jan',
        avatar: '🍟',
        role: 'Keukenheld',
        phone: '06-98741122',
        unread: false,
        messages: [
          { id: '1', sender: 'them', text: 'Yo, help me even met de patat! Het is super druk.', timestamp: '11:15', read: true }
        ],
        autoReplies: [
          { keywords: ['friet', 'patat', 'frituur'], replies: ['Ik gooi er nog een lading friet in!', 'Hebben we nog mayonaise?', 'Het vet is heet!'] },
          { keywords: ['help', 'kom', 'onderweg'], replies: ['Snel! Kassa 3 stroomt over!', 'Bedankt man! Ik geef je straks een kipnugget.'] }
        ]
      },
      {
        id: 'sanne',
        name: 'Kassière Sanne',
        avatar: '🥤',
        role: 'Kassa 1',
        phone: '06-12345678',
        unread: false,
        messages: [
          { id: '1', sender: 'them', text: 'Kan iemand wisselgeld brengen bij kassa 1? Heb munten van 1 euro nodig.', timestamp: '11:45', read: true }
        ],
        autoReplies: [
          { keywords: ['geld', 'munt', 'wisselgeld'], replies: ['Dankje! Je bent een lifesaver.', 'De kassa la is weer gevuld.'] },
          { keywords: ['ijs', 'shake', 'ijsje'], replies: ['De ijsmachine werkt gelukkig weer!', 'Zal ik een milkshake voor je tappen?'] }
        ]
      },
      {
        id: 'mamma',
        name: 'Mamma 💖',
        avatar: '👩',
        role: 'Thuisfront',
        phone: '06-45217422',
        unread: false,
        messages: [
          { id: '1', sender: 'them', text: 'Ben je al klaar met werken schat? Vergeet de melk niet mee te nemen.', timestamp: '09:00', read: true }
        ],
        autoReplies: [
          { keywords: ['ja', 'bijna', 'klaar'], replies: ['Super, ik heb het eten al klaarstaan!', 'Tot zo schat, doe voorzichtig op de fiets.'] },
          { keywords: ['nee', 'druk', 'werken'], replies: ['Werk ze lieverd! Niet te hard werken hoor.', 'Mamma is trots op je!'] }
        ]
      }
    ];

    // Load SMS History from LocalStorage
    const storedHistory = localStorage.getItem('wd_phone_sms_history');
    if (storedHistory) {
      try {
        const parsed: SMSContact[] = JSON.parse(storedHistory);
        // Sync static autoReplies and merge
        const merged = defaultContacts.map(dc => {
          const match = parsed.find(p => p.id === dc.id);
          if (match) {
            return { ...dc, messages: match.messages, unread: match.unread };
          }
          return dc;
        });

        // Append custom dynamic contacts added by the user
        const customs = parsed.filter(p => !defaultContacts.some(dc => dc.id === p.id));
        setContacts([...merged, ...customs]);
      } catch {
        setContacts(defaultContacts);
      }
    } else {
      setContacts(defaultContacts);
    }
  }, []);

  // Save SMS messages to localStorage on update
  const saveSmsToStorage = (updatedContacts: SMSContact[]) => {
    localStorage.setItem('wd_phone_sms_history', JSON.stringify(updatedContacts));
  };

  // Cross-Tab/Real-Time Broadcast Channel for SMSing other users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const smsChannel = new BroadcastChannel('wd_sms_channel');
      smsChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'SMS_RECEIVED') {
          const { senderId, senderName, text, targetId, avatar, role } = event.data;
          
          setContacts(prev => {
            // Find if this chat thread exists
            const existing = prev.find(c => c.id === senderId);
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const newMsg: SMSMessage = {
              id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
              sender: 'them',
              text,
              timestamp: timeStr,
              read: false
            };

            let nextContacts: SMSContact[] = [];

            if (existing) {
              nextContacts = prev.map(c => {
                if (c.id === senderId) {
                  return {
                    ...c,
                    messages: [...c.messages, newMsg],
                    unread: activeContactId !== senderId
                  };
                }
                return c;
              });
            } else {
              // Create dynamic new contact for the sender
              const newContact: SMSContact = {
                id: senderId,
                name: senderName,
                avatar: avatar || '👤',
                role: role || 'Collegiaal Contact',
                phone: '06-LIVE-CHAT',
                unread: activeContactId !== senderId,
                messages: [newMsg],
                isCustom: true
              };
              nextContacts = [...prev, newContact];
            }

            saveSmsToStorage(nextContacts);
            return nextContacts;
          });

          // Show in-app notification if phone is closed or not in messages
          if (!isOpen || activeApp !== 'messages' || activeContactId !== senderId) {
            setNotification({
              title: `SMS van ${senderName}`,
              body: text
            });
            try { AudioFX.bell(); } catch {}
          }
        }
      };
      return () => smsChannel.close();
    } catch {}
  }, [isOpen, activeApp, activeContactId]);

  const sendSms = (contactId: string) => {
    if (!smsInput.trim()) return;
    playClick();

    const text = smsInput.trim();
    setSmsInput('');

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const myMsg: SMSMessage = {
      id: Date.now().toString(),
      sender: 'me',
      text,
      timestamp: timeStr,
      read: true
    };

    let updated = contacts.map(c => {
      if (c.id === contactId) {
        return {
          ...c,
          messages: [...c.messages, myMsg]
        };
      }
      return c;
    });

    setContacts(updated);
    saveSmsToStorage(updated);

    // Broadcast SMS to other tabs / devices
    try {
      const smsChannel = new BroadcastChannel('wd_sms_channel');
      // Determine my identity from active WerkPay bank account or POS user
      const myName = wpAccount?.account_holder || wdEmpUser?.name || 'Anonieme Collega';
      const myId = wpAccount?.username || wdEmpUser?.username || 'anonymous_user';
      const myAvatar = wpAccount ? '💳' : (wdEmpUser ? '👨‍🍳' : '📱');
      const myRole = wpAccount ? 'WerkPay Rekeninghouder' : (wdEmpUser ? 'Werkdonalds Medewerker' : 'Gebruiker');

      smsChannel.postMessage({
        type: 'SMS_RECEIVED',
        senderId: myId,
        senderName: myName,
        text,
        targetId: contactId,
        avatar: myAvatar,
        role: myRole
      });
    } catch {}

    // Simulated Smart auto-replies for static bot contacts
    const contact = contacts.find(c => c.id === contactId);
    if (contact && contact.autoReplies) {
      const lowercaseText = text.toLowerCase();
      let matchedReply: string | null = null;

      for (const rule of contact.autoReplies) {
        if (rule.keywords.some(k => lowercaseText.includes(k))) {
          const replies = rule.replies;
          matchedReply = replies[Math.floor(Math.random() * replies.length)];
          break;
        }
      }

      if (matchedReply) {
        const replyText = matchedReply;
        setTimeout(() => {
          const replyMsg: SMSMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'them',
            text: replyText,
            timestamp: timeStr,
            read: false
          };

          setContacts(prev => {
            const next = prev.map(c => {
              if (c.id === contactId) {
                return {
                  ...c,
                  messages: [...c.messages, replyMsg],
                  unread: activeContactId !== contactId
                };
              }
              return c;
            });
            saveSmsToStorage(next);
            return next;
          });

          if (!isOpen || activeApp !== 'messages' || activeContactId !== contactId) {
            setNotification({ title: contact.name, body: replyText });
            try { AudioFX.bell(); } catch {}
          }
        }, 1500);
      }
    }
  };

  // Delete/Clear all messages for a contact
  const deleteChatHistory = (contactId: string) => {
    playClick();
    const confirmed = confirm('Weet je zeker dat je alle berichten van dit gesprek wilt verwijderen?');
    if (!confirmed) return;

    const updated = contacts.map(c => {
      if (c.id === contactId) {
        return {
          ...c,
          messages: [],
          unread: false
        };
      }
      return c;
    });
    setContacts(updated);
    saveSmsToStorage(updated);
    if (activeContactId === contactId) {
      setActiveContactId(null);
    }
  };

  // Add/SMS a new custom registered user contact
  const handleStartNewChatWithUser = (user: any, type: 'bank' | 'pos') => {
    playClick();
    setShowNewChatList(false);

    const isBank = type === 'bank';
    const id = user.username;
    const name = isBank ? user.account_holder : user.name;
    const avatar = isBank ? '💳' : '👨‍🍳';
    const role = isBank ? 'Bank Account' : 'POS Medewerker';

    // Verify if already in contact list
    const exists = contacts.find(c => c.id === id);
    if (exists) {
      setActiveContactId(id);
      return;
    }

    const newContact: SMSContact = {
      id,
      name,
      avatar,
      role,
      phone: isBank ? '06-PAY-SYNC' : '06-POS-SYNC',
      unread: false,
      messages: [],
      isCustom: true
    };

    const next = [...contacts, newContact];
    setContacts(next);
    saveSmsToStorage(next);
    setActiveContactId(id);
  };

  // ==========================================
  // WERKDONALDS STAFF EMPLOYEE PORTAL APP
  // ==========================================
  const [wdEmpUser, setWdEmpUser] = useState<PosUser | null>(null);
  const [wdEmpUsername, setWdEmpUsername] = useState<string>('');
  const [wdEmpPassword, setWdEmpPassword] = useState<string>('');
  const [wdEmpError, setWdEmpError] = useState<string | null>(null);
  const [wdCashAmount, setWdCashAmount] = useState<string>('');
  const [wdCashReason, setWdCashReason] = useState<string>('');
  const [wdCashSuccess, setWdCashSuccess] = useState<boolean>(false);

  const handleWdEmpLogin = () => {
    playClick();
    setWdEmpError(null);
    const cleanU = wdEmpUsername.trim().toLowerCase();
    const cleanP = wdEmpPassword.trim();

    if (!cleanU || !cleanP) {
      setWdEmpError('Vul gebruikersnaam en wachtwoord in!');
      return;
    }

    // Verify against registered posUsers
    const match = posUsers.find(u => u.username.toLowerCase() === cleanU && u.password === cleanP);
    if (match) {
      setWdEmpUser(match);
      setWdEmpUsername('');
      setWdEmpPassword('');
      try { AudioFX.bell(); } catch {}
    } else {
      setWdEmpError('Ongeldige inloggegevens. Controleer je kassa-account!');
      try { AudioFX.beep(); } catch {}
    }
  };

  const handleWdEmpLogout = () => {
    playClick();
    setWdEmpUser(null);
  };

  // Staff requesting cash checkout authorization directly from their phone
  const handleWdSubmitCashRequest = () => {
    playClick();
    const amt = parseFloat(wdCashAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Vul een geldig bedrag in!');
      return;
    }
    if (!wdCashReason.trim()) {
      alert('Vul de reden van de uitbetaling of kasaanvraag in!');
      return;
    }

    if (wdEmpUser) {
      // Calls context method to register cash payout request
      // Using orderNo = 0 to denote custom payout/staff advance request
      createCashRequest(0, amt, 'takeaway', `Kas: ${wdEmpUser.name} (${wdCashReason.trim()})`);
      setWdCashSuccess(true);
      setWdCashAmount('');
      setWdCashReason('');
      try { AudioFX.bell(); } catch {}
      setTimeout(() => setWdCashSuccess(false), 4000);
    }
  };


  // Clean duration display helpers
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 1. FLOATING CYAN LAUNCHER TRIGGER */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          try { AudioFX.beep(); } catch {}
        }}
        id="digital-phone-trigger"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-2xl hover:scale-110 active:scale-95 transition-all ring-4 ring-cyan-500/20 hover:bg-cyan-400 flex items-center justify-center gap-2"
        title="Open Mobiele Telefoon"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
        </span>
        <Phone className="w-5 h-5" />
        <span className="text-xs font-black uppercase tracking-tight pr-1">Telefoon</span>
      </button>

      {/* 2. PHONE CHASSIS MOCKUP CONTAINER */}
      {isOpen && (
        <div
          id="digital-phone-shell"
          className="fixed bottom-24 right-6 z-50 w-[300px] h-[550px] bg-slate-900 border-4 border-slate-750 rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-sans ring-1 ring-white/10"
        >
          {/* TOP STATUS BAR & DYNAMIC NOTCH */}
          <div className="bg-slate-950 px-5 pt-3.5 pb-2.5 flex items-center justify-between select-none relative z-20">
            <span className="text-[10px] font-black tracking-tight text-white">{time}</span>
            
            {/* Dynamic camera / speaker Notch */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-b-xl flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span className="w-7 h-1 rounded-full bg-slate-800" />
            </div>

            <div className="flex items-center gap-1.5 text-white/80">
              <Wifi className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-bold text-cyan-400 font-mono">LTE</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* IN-APP PERSISTENT SYSTEM NOTIFICATION TOAST */}
          {notification && (
            <div className="bg-indigo-600/95 text-white p-2.5 text-[10px] flex items-start justify-between shadow-lg relative z-30 animate-bounce">
              <div className="flex-1 pr-2">
                <span className="font-black block uppercase tracking-wider text-[8px] text-cyan-200">Nieuw SMS Bericht</span>
                <span className="font-bold block">{notification.title}</span>
                <p className="mt-0.5 text-slate-100 italic truncate max-w-[200px]">"{notification.body}"</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="p-1 text-white hover:bg-white/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* WORKPHONE CORE VIEWPORT PANEL */}
          <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
            
            {/* 1. HOME SCREEN LAUNCHER SCREEN */}
            {activeApp === 'home' && (
              <div className="flex-1 flex flex-col p-5 justify-between">
                
                {/* Floating Widget Box */}
                <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/80 space-y-1 shadow-md">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>WerkPay Widget</span>
                    <span className="text-cyan-400 animate-pulse">● LIVE</span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    {wpIsLoggedIn && wpAccount
                      ? `Ingelogd: ${wpAccount.account_holder}`
                      : 'Geen actieve bankrekening.'}
                  </p>
                  <p className="text-xs font-mono font-black text-white">
                    {wpIsLoggedIn && wpAccount
                      ? (wpAccount.is_admin ? '€ 99.999,99' : euro(wpAccount.balance))
                      : 'Meld je aan in de app'}
                  </p>
                </div>

                {/* APP GRID */}
                <div className="grid grid-cols-3 gap-y-5 gap-x-4 my-auto">
                  {/* APP: WERKPAY BANK */}
                  <button
                    onClick={() => {
                      setActiveApp('werkpay');
                      playClick();
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center shadow-lg group-active:scale-90 transition">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight leading-none">WerkPay</span>
                  </button>

                  {/* APP: WERKDONALDS EMPLOYEE PORTAL */}
                  <button
                    onClick={() => {
                      setActiveApp('werkdonalds');
                      playClick();
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg group-active:scale-90 transition border border-amber-400/20">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight leading-none">Werkdonalds</span>
                  </button>

                  {/* APP: TELEFOON */}
                  <button
                    onClick={() => {
                      setActiveApp('phone');
                      playClick();
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-active:scale-90 transition relative">
                      <Phone className="w-6 h-6 text-white" />
                      {callState !== 'idle' && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white animate-pulse">!</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight leading-none">Bellen</span>
                  </button>

                  {/* APP: BERICHTEN / SMS */}
                  <button
                    onClick={() => {
                      setActiveApp('messages');
                      playClick();
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-active:scale-90 transition relative">
                      <MessageSquare className="w-6 h-6 text-white" />
                      {contacts.some(c => c.unread) && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">1</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight leading-none">Sms</span>
                  </button>

                  {/* APP: WEER (DUMMY) */}
                  <div className="flex flex-col items-center gap-1.5 opacity-60">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <span className="text-xl">☀️</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 text-center tracking-tight leading-none">Weer (21°)</span>
                  </div>

                  {/* APP: INFO */}
                  <button
                    onClick={() => {
                      setActiveApp('settings');
                      playClick();
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-800 flex items-center justify-center shadow-lg group-active:scale-90 transition">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight leading-none">Info</span>
                  </button>
                </div>

                {/* DOCK BAR AT THE BOTTOM */}
                <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 p-2 rounded-[24px] grid grid-cols-3 gap-1">
                  <button onClick={() => { setActiveApp('phone'); playClick(); }} className="py-1 flex justify-center text-emerald-400 hover:text-emerald-300"><Phone className="w-4 h-4" /></button>
                  <button onClick={() => { setActiveApp('werkpay'); playClick(); }} className="py-1 flex justify-center text-cyan-400 hover:text-cyan-300"><Wallet className="w-4 h-4" /></button>
                  <button onClick={() => { setActiveApp('messages'); playClick(); }} className="py-1 flex justify-center text-indigo-400 hover:text-indigo-300"><MessageSquare className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            {/* 2. APP: WERKPAY BANK (WITH SECURE PIN CODE LOGIN) */}
            {activeApp === 'werkpay' && (
              <div className="flex-1 flex flex-col bg-slate-950">
                {/* Header */}
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setActiveApp('home'); playClick(); }} className="text-slate-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                      <span>WerkPay Mobile</span>
                    </span>
                  </div>
                  {wpIsLoggedIn && (
                    <button
                      onClick={() => {
                        playClick();
                        setWpAccount(null);
                        setWpIsLoggedIn(false);
                      }}
                      className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/15"
                    >
                      Log uit
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                  {/* STEP 1: CHOOSE BANK ACCOUNT */}
                  {!wpIsLoggedIn && !wpAuthPendingAccount && (
                    <div className="space-y-3">
                      <div className="text-center space-y-1 py-1">
                        <div className="text-2xl">💳</div>
                        <h4 className="font-black text-white">Veilig Inloggen</h4>
                        <p className="text-[10px] text-slate-400">Kies een bankrekening om toegang te krijgen.</p>
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {bankAccounts.map(acc => (
                          <button
                            key={acc.id}
                            onClick={() => {
                              playClick();
                              setWpAuthPendingAccount(acc);
                              setWpAuthPin('');
                              setWpAuthError(null);
                            }}
                            className="w-full p-2.5 rounded-xl border bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300 flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] truncate text-white">{acc.account_holder}</div>
                              <div className="text-[9px] text-slate-500 font-mono">@{acc.username}</div>
                            </div>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-black font-mono">
                              LOGIN
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: ENTER SAFE PIN CODE */}
                  {!wpIsLoggedIn && wpAuthPendingAccount && (
                    <div className="space-y-3 flex-1 flex flex-col justify-between py-1">
                      <div className="text-center space-y-1">
                        <button
                          onClick={() => { playClick(); setWpAuthPendingAccount(null); }}
                          className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 mx-auto"
                        >
                          <ArrowLeft className="w-3 h-3" /> Selectie wijzigen
                        </button>
                        <h4 className="font-black text-white mt-1">Toegang Beveiligen</h4>
                        <p className="text-[10px] text-slate-400">Voer de pincode in voor account:</p>
                        <span className="inline-block bg-cyan-950/40 border border-cyan-800/50 rounded px-2 py-0.5 font-mono text-[10px] font-black text-cyan-400">
                          @{wpAuthPendingAccount.username}
                        </span>
                      </div>

                      {/* Display Dots representing pin */}
                      <div className="space-y-1">
                        <div className="flex justify-center gap-4 py-3">
                          {[0, 1, 2, 3].map(idx => (
                            <span
                              key={idx}
                              className={`w-4.5 h-4.5 rounded-full border border-slate-750 transition-all duration-150 flex items-center justify-center ${
                                wpAuthPin.length > idx ? 'bg-cyan-500 border-cyan-500 scale-110 shadow-lg shadow-cyan-500/20' : 'bg-slate-900'
                              }`}
                            />
                          ))}
                        </div>
                        {wpAuthError && (
                          <div className="text-center text-[10px] text-rose-400 font-bold tracking-tight animate-pulse">
                            ⚠️ {wpAuthError}
                          </div>
                        )}
                      </div>

                      {/* Touch Pad for entering pin */}
                      <div className="grid grid-cols-3 gap-2 px-6 pb-2 max-w-[200px] mx-auto select-none">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleWpPinPress(num)}
                            className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800/80 text-white font-bold flex items-center justify-center hover:bg-slate-800 active:scale-95 transition text-[13px]"
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: LOGGED IN MOBILE BANK DASHBOARD */}
                  {wpIsLoggedIn && wpAccount && (
                    <div className="space-y-4">
                      {/* CARD COMPONENT */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-600 via-indigo-700 to-indigo-900 text-white shadow-xl relative overflow-hidden">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-cyan-200">WerkPay Debit</span>
                            <div className="font-black text-[13px] tracking-tight mt-1 truncate max-w-[150px]">
                              {wpAccount.account_holder}
                            </div>
                          </div>
                          <span className="text-lg font-black text-cyan-200">WP</span>
                        </div>

                        {/* Balance display */}
                        <div className="mt-4">
                          <span className="text-[8px] text-cyan-200/80 block">Huidig Saldo</span>
                          <div className="text-lg font-mono font-black text-white">
                            {wpAccount.is_admin ? '€ 99.999,99' : euro(wpAccount.balance)}
                          </div>
                        </div>

                        {/* Card Info footer */}
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] text-cyan-200 font-mono">
                          <span>UID: {formatCardUid(wpAccount.card_uid || '')}</span>
                          <span>VEILIG</span>
                        </div>
                      </div>

                      {/* QUICK TRANSFER FORM */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                        <h5 className="font-black text-white flex items-center gap-1 text-[11px]">
                          <Send className="w-3.5 h-3.5 text-cyan-400" /> Overboeken
                        </h5>

                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Naar Gebruikersnaam (ontvanger)</label>
                            <input
                              type="text"
                              placeholder="bijv: jan, manager, sanne"
                              value={wpTransferTarget}
                              onChange={e => setWpTransferTarget(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs focus:outline-none focus:border-cyan-400 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Bedrag (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={wpTransferAmount}
                              onChange={e => setWpTransferAmount(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs focus:outline-none focus:border-cyan-400 text-white font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              playClick();
                              const amt = parseFloat(wpTransferAmount);
                              if (isNaN(amt) || amt <= 0) {
                                alert("Vul een geldig bedrag in!");
                                return;
                              }

                              const targetLower = wpTransferTarget.trim().toLowerCase();
                              if (!targetLower) {
                                alert("Vul een ontvanger in!");
                                return;
                              }

                              if (wpAccount.username.toLowerCase() === targetLower) {
                                alert("Je kunt geen geld naar jezelf overboeken!");
                                return;
                              }

                              // Use AppContext pay method/helpers
                              // Direct state deduction for live preview reactivity
                              const targetAcc = bankAccounts.find(x => x.username.toLowerCase() === targetLower);
                              if (!targetAcc) {
                                alert(`Ontvanger "@${targetLower}" niet gevonden op het WerkPay netwerk!`);
                                return;
                              }

                              if (wpAccount.balance < amt && !wpAccount.is_admin) {
                                alert("Onvoldoende saldo op deze rekening!");
                                return;
                              }

                              // Simulate transfer
                              wpAccount.balance -= amt;
                              targetAcc.balance += amt;
                              
                              // Trigger database saves if possible
                              saveBankAccount(wpAccount);
                              saveBankAccount(targetAcc);

                              setWpTransferSuccess(true);
                              setWpTransferAmount('');
                              setWpTransferTarget('');
                              try { AudioFX.bell(); } catch {}
                              setTimeout(() => setWpTransferSuccess(false), 3000);
                            }}
                            className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-tight flex items-center justify-center gap-1.5 transition active:scale-95 text-[11px]"
                          >
                            <span>Geld Overmaken</span>
                          </button>

                          {wpTransferSuccess && (
                            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-bold text-[9px] animate-pulse">
                              Transactie succesvol verwerkt!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. APP: WERKDONALDS STAFF EMPLOYEE PORTAL APP */}
            {activeApp === 'werkdonalds' && (
              <div className="flex-1 flex flex-col bg-slate-950">
                {/* Header */}
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setActiveApp('home'); playClick(); }} className="text-slate-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mijn Werkdonalds</span>
                    </span>
                  </div>
                  {wdEmpUser && (
                    <button
                      onClick={handleWdEmpLogout}
                      className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/15"
                    >
                      Log uit
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 text-xs">
                  {/* LOGGED OUT PORTAL: LOGIN SCREEN */}
                  {!wdEmpUser ? (
                    <div className="space-y-3.5 py-1">
                      <div className="text-center space-y-1">
                        <div className="text-2xl">🍔</div>
                        <h4 className="font-black text-white">Medewerkers Portaal</h4>
                        <p className="text-[10px] text-slate-400">Meld je aan met je Werkdonalds POS kassa-account.</p>
                      </div>

                      {wdEmpError && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/15 text-rose-400 font-bold text-[10px] text-center">
                          {wdEmpError}
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Gebruikersnaam</label>
                          <input
                            type="text"
                            placeholder="bijv: joas, sanne, jan"
                            value={wdEmpUsername}
                            onChange={e => setWdEmpUsername(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400 text-white font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">Wachtwoord</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={wdEmpPassword}
                            onChange={e => setWdEmpPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400 text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleWdEmpLogin}
                          className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black tracking-tight flex items-center justify-center gap-1.5 transition active:scale-95 mt-1 text-[11px]"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Meld je aan op shift</span>
                        </button>
                      </div>

                      {/* QUICK ACCOUNTS HINT FOR TESTING */}
                      <div className="pt-2">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Geregistreerd personeel:</span>
                        <div className="flex flex-wrap gap-1">
                          {posUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                playClick();
                                setWdEmpUsername(u.username);
                                setWdEmpPassword(u.password || 'admin123');
                              }}
                              className="text-[9px] bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-300 rounded px-2 py-0.5 font-bold"
                            >
                              {u.name} (@{u.username})
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* LOGGED IN PORTAL: DASHBOARD */
                    <div className="space-y-4">
                      {/* USER PROFILE INFO */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                          {wdEmpUser.name[0]}
                        </div>
                        <div>
                          <div className="font-black text-white text-[11px] leading-tight">{wdEmpUser.name}</div>
                          <div className="text-[9px] text-amber-400 font-mono font-bold uppercase tracking-wide mt-0.5">
                            {wdEmpUser.is_admin ? 'Hoofdbeheerder' : 'Medewerker'}
                          </div>
                        </div>
                      </div>

                      {/* CASHOUT REQUEST FORM */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">💰 Kas & Voorschot Aanvraag</span>
                        <p className="text-[9px] text-slate-400">Vraag direct cash uitbetalingen of kastoegoed aan bij de hoofdbeheerder.</p>

                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] text-slate-400 font-bold uppercase block mb-0.5">Bedrag (€)</label>
                              <input
                                type="number"
                                placeholder="10.00"
                                value={wdCashAmount}
                                onChange={e => setWdCashAmount(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-white font-mono focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-400 font-bold uppercase block mb-0.5">Reden</label>
                              <input
                                type="text"
                                placeholder="bijv: Pauze, Wisselgeld"
                                value={wdCashReason}
                                onChange={e => setWdCashReason(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleWdSubmitCashRequest}
                            className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-1 transition text-[10px]"
                          >
                            <span>Aanvraag Verzenden</span>
                          </button>

                          {wdCashSuccess && (
                            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] text-center font-bold animate-pulse">
                              Aanvraag ingediend! Manager notificatie verzonden.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTIVE ORDERS MINI TRACKER (KDS STAGES) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                          <span>Live KDS Bestellingen</span>
                          <span className="text-[9px] text-amber-500 font-mono">({orders.filter(o => o.status !== 'afgerond' && o.status !== 'geannuleerd').length})</span>
                        </div>

                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {orders.filter(o => o.status !== 'afgerond' && o.status !== 'geannuleerd').length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-[10px] text-slate-500">
                              Geen actieve bestellingen in de wachtrij.
                            </div>
                          ) : (
                            orders.filter(o => o.status !== 'afgerond' && o.status !== 'geannuleerd').map(o => (
                              <div
                                key={o.no}
                                className="p-2 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-[10px] text-white">Bestelling #{o.no}</div>
                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{euro(o.total)} • {o.items.length} items</div>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  o.status === 'gereed' ? 'bg-emerald-500/10 text-emerald-400' :
                                  o.status === 'in_behandeling' ? 'bg-blue-500/10 text-blue-400' :
                                  'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {o.status === 'gereed' ? 'Gereed' :
                                   o.status === 'in_behandeling' ? 'Bezig' : 'Wachten'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. APP: TELEFOON / REAL MIC CALL SCREEN */}
            {activeApp === 'phone' && (
              <div className="flex-1 flex flex-col bg-slate-950">
                {/* Header */}
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { if (callState === 'idle') setActiveApp('home'); else hangUp(); playClick(); }} className="text-slate-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bellen</span>
                    </span>
                  </div>
                  {callState !== 'idle' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono animate-pulse font-bold border border-red-500/15">
                      GESPREK
                    </span>
                  )}
                </div>

                {/* Phone screen routing based on callState */}
                {callState === 'idle' ? (
                  /* KEYPAD & CONTACTS DIALER */
                  <div className="flex-1 flex flex-col justify-between p-4">
                    {/* Dial Input Display */}
                    <div className="text-center py-1 h-11 flex items-center justify-center">
                      <span className="text-xl font-mono font-black text-white tracking-widest">{dialInput || 'Toets nummer...'}</span>
                      {dialInput && (
                        <button onClick={() => { setDialInput(''); playClick(); }} className="ml-2 text-slate-500 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Numeric Keypad Grid */}
                    <div className="grid grid-cols-3 gap-y-2.5 gap-x-4 px-4 my-auto select-none">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setDialInput(prev => prev + num);
                            playClick();
                          }}
                          className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 transition flex flex-col items-center justify-center border border-slate-800/60"
                        >
                          <span className="text-sm font-black text-white">{num}</span>
                        </button>
                      ))}
                    </div>

                    {/* Action buttons at the bottom */}
                    <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-900 mt-2">
                      <button
                        onClick={() => {
                          if (!dialInput) {
                            alert("Toets eerst een nummer of kies een contact!");
                            return;
                          }
                          startCall(dialInput, dialInput, 'Handmatig ingevoerd');
                        }}
                        className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition"
                      >
                        <PhoneCall className="w-5 h-5" />
                      </button>

                      {/* QUICK CONTACTS BUTTONS */}
                      <button
                        onClick={() => {
                          startCall('Manager', '0900-DONALDS', 'Filiaalmanager');
                        }}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-[10px] font-black flex items-center gap-1.5 transition"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Manager bellen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SIMULATED & MIC-DRIVEN CALL SCREEN */
                  <div className="flex-1 flex flex-col justify-between p-5 bg-slate-950">
                    <div className="text-center space-y-2 mt-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-xl ring-4 ring-cyan-500/10">
                        {callingContact?.name ? callingContact.name[0] : '📞'}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{callingContact?.name || 'Onbekend'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{callingContact?.role || 'Bellen...'}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{callingContact?.phone}</p>
                      </div>

                      {/* Call Connection Status */}
                      <div className="pt-1">
                        {callState === 'calling' ? (
                          <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase animate-pulse">Verbinding maken...</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Verbonden via Mic</span>
                            <div className="text-lg font-mono font-black text-white mt-0.5">
                              {formatDuration(callTimer)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MICROPHONE GRAPH & WAVEFORM (REAL VOICE AMPLITUDES) */}
                    {callState === 'connected' && (
                      <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl text-center space-y-3 max-w-[240px] mx-auto">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <span className="flex items-center gap-1 text-cyan-400">
                            {isMuted ? <MicOff className="w-3 h-3 text-red-400" /> : <Mic className="w-3 h-3 text-cyan-400" />}
                            <span>{isMuted ? 'Gedempt' : 'Microfoon Actief'}</span>
                          </span>
                          <span>Stem-volume</span>
                        </div>

                        {/* Visual Animated Audio Bars */}
                        <div className="flex items-end justify-center gap-1 h-14 px-2">
                          {micFrequencies.map((height, i) => (
                            <div
                              key={i}
                              style={{ height: `${height}%` }}
                              className={`w-1.5 rounded-full transition-all duration-75 ${
                                isMuted 
                                  ? 'bg-slate-800' 
                                  : 'bg-gradient-to-t from-cyan-600 to-indigo-500 shadow-md shadow-cyan-400/10'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Interactive mic control buttons */}
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <button
                            onClick={() => {
                              playClick();
                              setIsMuted(!isMuted);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold transition flex items-center gap-1 ${
                              isMuted 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                            }`}
                          >
                            {isMuted ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                            <span>{isMuted ? 'Dempen Opheffen' : 'Dempen'}</span>
                          </button>

                          {micPermissionError && (
                            <span className="text-[8px] text-rose-400 font-bold max-w-[100px] leading-tight">
                              Mic geweigerd. Check permissies.
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RED HANGUP BUTTON */}
                    <div className="flex justify-center pb-4">
                      <button
                        onClick={hangUp}
                        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition"
                      >
                        <PhoneOff className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. APP: MESSAGES / SMS APP (PERSISTENT & DELETABLE CHATS) */}
            {activeApp === 'messages' && (
              <div className="flex-1 flex flex-col bg-slate-950">
                {activeContactId === null ? (
                  /* CONVERSATION LIST */
                  <>
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setActiveApp('home'); playClick(); }} className="text-slate-400 hover:text-white">
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-white flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Berichten</span>
                        </span>
                      </div>
                      
                      <button
                        onClick={() => { playClick(); setShowNewChatList(!showNewChatList); }}
                        className="text-[10px] bg-indigo-500 hover:bg-indigo-400 text-white font-black px-2 py-1 rounded-lg flex items-center gap-1 transition"
                      >
                        <Users className="w-3 h-3" />
                        <span>Nieuw</span>
                      </button>
                    </div>

                    {/* NEW CHAT / USER DIRECTORY OVERLAY */}
                    {showNewChatList ? (
                      <div className="flex-1 flex flex-col bg-slate-950 p-3 space-y-3.5 overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Start chat met collega:</span>
                          <button onClick={() => { playClick(); setShowNewChatList(false); }} className="text-slate-500 hover:text-white text-[10px] font-bold">
                            Annuleren
                          </button>
                        </div>

                        {/* List registered POS Staff users */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Werkdonalds Kassa-gebruikers:</span>
                          {posUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => handleStartNewChatWithUser(u, 'pos')}
                              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-850 text-left flex items-center gap-2 text-white font-bold transition text-[11px]"
                            >
                              <span>👨‍🍳</span>
                              <div>
                                <div>{u.name}</div>
                                <div className="text-[8px] text-slate-500 font-mono">@{u.username}</div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* List registered WerkPay bank account holders */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">WerkPay bankrekeningen:</span>
                          {bankAccounts.map(acc => (
                            <button
                              key={acc.id}
                              onClick={() => handleStartNewChatWithUser(acc, 'bank')}
                              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-850 text-left flex items-center gap-2 text-white font-bold transition text-[11px]"
                            >
                              <span>💳</span>
                              <div>
                                <div>{acc.account_holder}</div>
                                <div className="text-[8px] text-slate-500 font-mono">@{acc.username}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE CHAT LIST */
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
                        {contacts.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-[11px] italic">
                            Geen actieve gesprekken. Klik op 'Nieuw' om te chatten.
                          </div>
                        ) : (
                          contacts.map(c => {
                            const lastMsg = c.messages[c.messages.length - 1];
                            return (
                              <div
                                key={c.id}
                                className={`w-full flex items-center justify-between text-left transition hover:bg-slate-900/60 ${
                                  c.unread ? 'bg-indigo-950/15' : ''
                                }`}
                              >
                                <button
                                  onClick={() => {
                                    setActiveContactId(c.id);
                                    c.unread = false;
                                    playClick();
                                  }}
                                  className="flex-1 p-3 flex items-start gap-3 min-w-0"
                                >
                                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-base shadow-inner">
                                    {c.avatar}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-xs text-white truncate">{c.name}</span>
                                      <span className="text-[8px] text-slate-500 font-mono">{lastMsg?.timestamp || '12:00'}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate pr-4">
                                      {lastMsg ? lastMsg.text : 'Geen berichten.'}
                                    </div>
                                  </div>
                                  {c.unread && (
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 self-center mr-1" />
                                  )}
                                </button>

                                {/* TRASH ICON TO DELETE THE CHAT */}
                                <button
                                  onClick={() => deleteChatHistory(c.id)}
                                  className="p-3 text-slate-600 hover:text-rose-500 transition active:scale-90"
                                  title="Wis dit gesprek"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* ACTIVE SMS CHAT THREAD */
                  (() => {
                    const contact = contacts.find(c => c.id === activeContactId)!;
                    return (
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Thread Header */}
                        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveContactId(null);
                                playClick();
                              }}
                              className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-base">
                              {contact.avatar}
                            </div>
                            <div>
                              <div className="font-black text-[11px] text-white leading-tight">{contact.name}</div>
                              <div className="text-[8px] text-slate-400 leading-none mt-0.5">{contact.role}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Direct call button */}
                            <button
                              onClick={() => startCall(contact.name, contact.phone, contact.role)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                              title="Bellen"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            
                            {/* Delete Chat History button */}
                            <button
                              onClick={() => deleteChatHistory(contact.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition"
                              title="Gesprek wissen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Message History bubble area */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-950 flex flex-col">
                          {contact.messages.length === 0 ? (
                            <div className="my-auto text-center text-slate-600 text-[10px] italic">
                              Stuur een bericht om de chat te starten met {contact.name}.
                            </div>
                          ) : (
                            contact.messages.map(m => {
                              const isMe = m.sender === 'me';
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col max-w-[85%] space-y-0.5 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                                >
                                  <div
                                    className={`p-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                                      isMe
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-tl-none'
                                    }`}
                                  >
                                    {m.text}
                                  </div>
                                  <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono px-1">
                                    <span>{m.timestamp}</span>
                                    {isMe && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Input bottom box */}
                        <div className="p-2.5 bg-slate-900 border-t border-slate-850 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Typ een bericht..."
                            value={smsInput}
                            onChange={e => setSmsInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                sendSms(contact.id);
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                          />
                          <button
                            onClick={() => sendSms(contact.id)}
                            disabled={!smsInput.trim()}
                            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center active:scale-90 transition disabled:opacity-50 disabled:active:scale-100"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* 6. APP: SETTINGS / INFO APP (IN-PHONE) */}
            {activeApp === 'settings' && (
              <div className="flex-1 flex flex-col bg-slate-950">
                {/* Header */}
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setActiveApp('home'); playClick(); }} className="text-slate-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white flex items-center gap-1">
                      ⚙️ Info
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="text-center space-y-1">
                    <div className="text-2xl">📱</div>
                    <h4 className="font-black text-white">WerkMobile Phone V1.2</h4>
                    <p className="text-[10px] text-slate-500">Virtual Interactive Device</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Systeeminformatie</span>
                    <div className="flex justify-between py-1 border-b border-slate-850 text-[11px]">
                      <span className="text-slate-400">Netwerk:</span>
                      <span className="text-white font-bold">WerkMobile LTE</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850 text-[11px]">
                      <span className="text-slate-400">Besturingssysteem:</span>
                      <span className="text-white font-bold">WerkOS v1.2</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850 text-[11px]">
                      <span className="text-slate-400">Verbinding:</span>
                      <span className="text-cyan-400 font-bold">Supabase Realtime</span>
                    </div>
                    <div className="flex justify-between py-1 text-[11px]">
                      <span className="text-slate-400">Stem-permissie:</span>
                      <span className="text-emerald-400 font-bold">Microfoon LIVE</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-center text-[10px] text-slate-400">
                    <p>
                      Deze virtuele telefoon synchroniseert real-time SMS-berichten tussen geopende browser-tabs en stelt medewerkers in staat om veilig WerkPay rekeningen te beheren en stemgeluid te visualiseren via de microfoon!
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* PHONE BOTTOM BAR / NAV BAR */}
          <div className="h-12 bg-slate-950 border-t border-slate-850 flex items-center justify-center z-10 select-none">
            {/* White iOS-style bottom Home Bar button */}
            <button
              onClick={() => {
                setActiveApp('home');
                try { AudioFX.beep(); } catch {}
              }}
              className="w-24 h-1.5 bg-slate-500 hover:bg-white rounded-full transition-all active:scale-95"
              title="Home"
            />
          </div>
        </div>
      )}
    </>
  );
};
