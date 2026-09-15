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
  MoreVertical
} from 'lucide-react';

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
  autoReplies: { keywords: string[]; replies: string[] }[];
}

export const DigitalPhone: React.FC = () => {
  const { 
    bankAccounts, 
    saveBankAccount, 
    currentBankAccount, 
    setCurrentBankAccount,
    orders,
    deleteBankAccount
  } = useApp();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeApp, setActiveApp] = useState<'home' | 'werkpay' | 'phone' | 'messages' | 'settings'>('home');
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

  // WERKPAY MOBILE APP STATE
  const [wpAccount, setWpAccount] = useState<any>(currentBankAccount || null);
  const [wpPinInput, setWpPinInput] = useState<string>('');
  const [wpIsLoggedIn, setWpIsLoggedIn] = useState<boolean>(false);
  const [wpTransferTarget, setWpTransferTarget] = useState<string>('');
  const [wpTransferAmount, setWpTransferAmount] = useState<string>('');
  const [wpTransferSuccess, setWpTransferSuccess] = useState<boolean>(false);

  // Sync mobile active account if global active account changes
  useEffect(() => {
    if (currentBankAccount) {
      setWpAccount(currentBankAccount);
    }
  }, [currentBankAccount]);

  // PHONE / CALLING APP STATE
  const [dialInput, setDialInput] = useState<string>('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'incoming'>('idle');
  const [callTimer, setCallTimer] = useState<number>(0);
  const [callingContact, setCallingContact] = useState<{ name: string; phone: string; role?: string } | null>(null);
  const [recentCalls, setRecentCalls] = useState<{ name: string; phone: string; time: string; direction: 'in' | 'out' }[]>([
    { name: 'Mamma', phone: '06-45217422', time: 'Gisteren', direction: 'in' },
    { name: 'Werkdonalds Manager', phone: '0900-DONALDS', time: 'Eergisteren', direction: 'out' }
  ]);

  const callIntervalRef = useRef<any>(null);

  const startCall = (name: string, phone: string, role?: string) => {
    playClick();
    setCallingContact({ name, phone, role });
    setCallState('calling');
    setCallTimer(0);

    // Simulated Ringing: play bell chime
    try { AudioFX.bell(); } catch {}

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
  };

  // SMS / MESSAGES APP STATE
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [smsInput, setSmsInput] = useState<string>('');
  const [contacts, setContacts] = useState<SMSContact[]>([
    {
      id: 'manager',
      name: 'Manager Werkdonalds',
      avatar: '👨‍💼',
      role: 'Filiaalmanager',
      phone: '0900-DONALDS',
      unread: true,
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
  ]);

  // SMS sending & auto-replies
  const sendSms = (contactId: string) => {
    if (!smsInput.trim()) return;
    playClick();

    const text = smsInput.trim();
    setSmsInput('');

    // Append my message
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const myMsg: SMSMessage = {
      id: Date.now().toString(),
      sender: 'me',
      text,
      timestamp: timeStr,
      read: true
    };

    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      return {
        ...c,
        messages: [...c.messages, myMsg]
      };
    }));

    // Trigger auto reply simulation after 1.5 seconds
    setTimeout(() => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      let replyText = 'Interessant! Werk ze!';
      const matched = contact.autoReplies.find(ar => 
        ar.keywords.some(kw => text.toLowerCase().includes(kw))
      );

      if (matched) {
        const randIndex = Math.floor(Math.random() * matched.replies.length);
        replyText = matched.replies[randIndex];
      } else {
        const defaultReplies = [
          'Oké is goed!',
          'Ik ben er over 5 minuten.',
          'Hahaha echt waar?',
          'Onderweg!',
          'Top, bedankt!'
        ];
        replyText = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
      }

      const replyMsg: SMSMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'them',
        text: replyText,
        timestamp: timeStr,
        read: false
      };

      setContacts(prev => prev.map(c => {
        if (c.id !== contactId) return c;
        return {
          ...c,
          unread: activeContactId !== contactId,
          messages: [...c.messages, replyMsg]
        };
      }));

      // Sound and notify
      try {
        AudioFX.bell();
      } catch {}

      setNotification({
        title: contact.name,
        body: replyText
      });

      // Clear notification after 4s
      setTimeout(() => setNotification(null), 4000);

    }, 1500);
  };

  // Format call duration into MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* FLOATING PHONE TRIGGER BUTTON */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          try { AudioFX.beep(); } catch {}
        }}
        id="digital-phone-trigger"
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-2xl hover:scale-110 active:scale-95 transition-all ring-4 ring-cyan-500/20 hover:bg-cyan-400 flex items-center justify-center gap-2"
        title="Open Digitale Telefoon"
      >
        <div className="relative">
          <Phone className="w-6 h-6 animate-pulse" />
          {contacts.some(c => c.unread) && (
            <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-cyan-500" />
          )}
        </div>
        <span className="hidden sm:inline text-xs font-black tracking-wide uppercase px-0.5">Telefoon</span>
      </button>

      {/* FLOATING SMARTPHONE CONTAINER */}
      {isOpen && (
        <div 
          id="digital-phone-frame"
          className="fixed bottom-24 right-6 z-50 w-[310px] h-[580px] bg-slate-950 border-4 border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 animate-fade-in text-slate-200"
          style={{ boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)' }}
        >
          {/* PHONE STATUS BAR / NOTCH */}
          <div className="h-10 bg-slate-900 border-b border-slate-850 flex items-center justify-between px-6 select-none relative z-10">
            <span className="text-[11px] font-black font-mono tracking-tighter text-slate-200">{time}</span>
            {/* Camera / Speaker Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-950 rounded-b-xl flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-800 rounded-full" />
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Wifi className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-bold text-slate-500">4G</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            </div>
          </div>

          {/* IN-PHONE GLOBAL NOTIFICATION BANNER */}
          {notification && (
            <div className="absolute top-12 left-2 right-2 z-50 bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex items-start gap-2.5 animate-slide-down">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-xs text-white">{notification.title}</div>
                <div className="text-[10px] text-slate-300 truncate mt-0.5">{notification.body}</div>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ACTIVE PHONE APP SCREEN CONTAINER */}
          <div className="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">
            
            {/* 1. HOME SCREEN */}
            {activeApp === 'home' && (
              <div className="flex-1 flex flex-col justify-between p-5 pb-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                {/* Wallpaper Decorative Element */}
                <div className="space-y-1 text-center mt-3 select-none">
                  <div className="text-3xl font-black text-white tracking-tight drop-shadow-md">WerkMobile</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Powered by WerkPay</div>
                </div>

                {/* APP GRID */}
                <div className="grid grid-cols-3 gap-y-6 gap-x-4 my-auto">
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
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight">WerkPay</span>
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
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight">Bellen</span>
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
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight">Sms</span>
                  </button>

                  {/* APP: WEER (DUMMY) */}
                  <div className="flex flex-col items-center gap-1.5 opacity-60">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <span className="text-xl">☀️</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 text-center tracking-tight">Weer (21°)</span>
                  </div>

                  {/* APP: COMPASS (DUMMY) */}
                  <div className="flex flex-col items-center gap-1.5 opacity-60">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-lg">
                      <Compass className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 text-center tracking-tight">Kaarten</span>
                  </div>

                  {/* APP: SETTINGS */}
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
                    <span className="text-[10px] font-black text-slate-300 text-center tracking-tight">Info</span>
                  </button>
                </div>

                {/* DOCK BAR AT THE BOTTOM */}
                <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 p-2.5 rounded-[24px] grid grid-cols-3 gap-1">
                  <button onClick={() => { setActiveApp('phone'); playClick(); }} className="py-1.5 flex justify-center text-emerald-400 hover:text-emerald-300"><Phone className="w-5 h-5" /></button>
                  <button onClick={() => { setActiveApp('werkpay'); playClick(); }} className="py-1.5 flex justify-center text-cyan-400 hover:text-cyan-300"><Wallet className="w-5 h-5" /></button>
                  <button onClick={() => { setActiveApp('messages'); playClick(); }} className="py-1.5 flex justify-center text-indigo-400 hover:text-indigo-300"><MessageSquare className="w-5 h-5" /></button>
                </div>
              </div>
            )}

            {/* 2. APP: WERKPAY BANK REKENING (IN-PHONE) */}
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
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">LIVE</span>
                </div>

                {/* Main Content inside WerkPay mobile app */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                  {!wpIsLoggedIn ? (
                    /* CHOOSE ACCOUNT TO ACCESS */
                    <div className="space-y-3">
                      <div className="text-center space-y-1">
                        <div className="text-xl">💳</div>
                        <h4 className="font-black text-white">Log in op je WerkPay bankpas</h4>
                        <p className="text-[10px] text-slate-400">Selecteer een bankrekening om mobiel te beheren.</p>
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {bankAccounts.map(acc => (
                          <button
                            key={acc.id}
                            onClick={() => {
                              setWpAccount(acc);
                              setWpIsLoggedIn(true);
                              playClick();
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                              wpAccount?.id === acc.id
                                ? 'bg-cyan-950/20 border-cyan-500/50 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] truncate">{acc.account_holder}</div>
                              <div className="text-[9px] text-slate-500 font-mono">@{acc.username}</div>
                            </div>
                            <span className="font-mono font-bold text-cyan-400">
                              {acc.is_admin ? '€ ∞' : euro(acc.balance)}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 text-center">
                        <p className="text-[9px] text-slate-500">
                          WerkPay Mobile synchroniseert rechtstreeks met de cloud database.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* LOGGED IN ACCOUNT DASHBOARD */
                    <div className="space-y-4">
                      {/* CARD COMPONENT */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-600 via-indigo-700 to-indigo-900 text-white shadow-xl relative overflow-hidden">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-cyan-200">WerkPay Debit</span>
                            <div className="font-black text-[13px] tracking-tight mt-1 truncate max-w-[150px]">
                              {wpAccount?.account_holder}
                            </div>
                          </div>
                          <span className="text-lg font-black text-cyan-200">WP</span>
                        </div>

                        {/* Balance display */}
                        <div className="mt-4">
                          <span className="text-[8px] text-cyan-200/80 block">Huidig Saldo</span>
                          <div className="text-lg font-mono font-black text-white">
                            {wpAccount?.is_admin ? '€ 99.999,99' : euro(wpAccount?.balance)}
                          </div>
                        </div>

                        {/* Card Info footer */}
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] text-cyan-200 font-mono">
                          <span>UID: {formatCardUid(wpAccount?.card_uid || '')}</span>
                          <span>PIN: ••••</span>
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
                              const target = bankAccounts.find(b => b.username.toLowerCase() === wpTransferTarget.trim().toLowerCase());
                              if (!target) {
                                alert("Gebruiker niet gevonden!");
                                return;
                              }
                              if (wpAccount.is_admin) {
                                // Admin transfers are unlimited
                                target.balance += amt;
                                await saveBankAccount(target);
                                setWpTransferSuccess(true);
                                setWpTransferAmount('');
                                setWpTransferTarget('');
                                try { AudioFX.bell(); } catch {}
                                setTimeout(() => setWpTransferSuccess(false), 3000);
                              } else {
                                if (wpAccount.balance < amt) {
                                  alert("Onvoldoende saldo!");
                                  return;
                                }
                                wpAccount.balance -= amt;
                                target.balance += amt;
                                await saveBankAccount(wpAccount);
                                await saveBankAccount(target);
                                setWpTransferSuccess(true);
                                setWpTransferAmount('');
                                setWpTransferTarget('');
                                try { AudioFX.bell(); } catch {}
                                setTimeout(() => setWpTransferSuccess(false), 3000);
                              }
                            }}
                            className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] transition"
                          >
                            Geld Versturen
                          </button>

                          {wpTransferSuccess && (
                            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center font-bold text-[10px]">
                              ✅ Overboeking succesvol voltooid!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LOGOUT BUTTON */}
                      <button
                        onClick={() => {
                          setWpIsLoggedIn(false);
                          playClick();
                        }}
                        className="w-full py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-black text-[10px] transition"
                      >
                        Wissel van Bankpas / Log Uit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. APP: TELEFOON / BELLEN APP (IN-PHONE) */}
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
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono animate-pulse">ACTIVE CALL</span>
                  )}
                </div>

                {/* Phone screen routing based on callState */}
                {callState === 'idle' ? (
                  /* KEYPAD & CONTACTS DIALER */
                  <div className="flex-1 flex flex-col justify-between p-4">
                    {/* Dial Input Display */}
                    <div className="text-center py-2 h-12 flex items-center justify-center">
                      <span className="text-xl font-mono font-black text-white tracking-widest">{dialInput || 'Toets nummer in...'}</span>
                      {dialInput && (
                        <button onClick={() => { setDialInput(''); playClick(); }} className="ml-2 text-slate-500 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Numeric Keypad Grid */}
                    <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 px-4 my-auto select-none">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setDialInput(prev => prev + num);
                            playClick();
                          }}
                          className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 transition flex flex-col items-center justify-center border border-slate-800/60"
                        >
                          <span className="text-base font-black text-white">{num}</span>
                        </button>
                      ))}
                    </div>

                    {/* Action buttons at the bottom */}
                    <div className="flex items-center justify-center gap-4 pt-3.5 border-t border-slate-900 mt-2">
                      <button
                        onClick={() => {
                          if (!dialInput) {
                            alert("Toets eerst een nummer of kies een contact!");
                            return;
                          }
                          startCall(dialInput, dialInput, 'Handmatig ingevoerd');
                        }}
                        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition"
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
                  /* SIMULATED ACTIVE CALL SCREEN */
                  <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950">
                    <div className="text-center space-y-2 mt-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-xl ring-4 ring-cyan-500/10">
                        {callingContact?.name ? callingContact.name[0] : '📞'}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">{callingContact?.name || 'Onbekend'}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{callingContact?.role || 'Bellen...'}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{callingContact?.phone}</p>
                      </div>

                      {/* Call Connection Status */}
                      <div className="pt-2">
                        {callState === 'calling' ? (
                          <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase animate-pulse">Verbinding maken...</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs text-emerald-400 font-black tracking-widest uppercase">Verbonden</span>
                            <div className="text-xl font-mono font-black text-white mt-1">
                              {formatDuration(callTimer)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fun Interactive Audio Loop / Audio Speaker Simulator */}
                    {callState === 'connected' && (
                      <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl text-center space-y-1 max-w-[240px] mx-auto animate-pulse">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">📞 Audio Gesprek</span>
                        <p className="text-[11px] text-slate-300 italic">
                          "Hallo! Met wie spreek ik? Ik ben momenteel druk in de keuken, spreek ik je zo weer?"
                        </p>
                      </div>
                    )}

                    {/* RED HANGUP BUTTON */}
                    <div className="flex justify-center pb-8">
                      <button
                        onClick={hangUp}
                        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. APP: MESSAGES / SMS APP (IN-PHONE) */}
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
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
                      {contacts.map(c => {
                        const lastMsg = c.messages[c.messages.length - 1];
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setActiveContactId(c.id);
                              c.unread = false;
                              playClick();
                            }}
                            className={`w-full p-3.5 flex items-start gap-3 text-left transition ${
                              c.unread ? 'bg-indigo-950/20' : 'hover:bg-slate-900/60'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-lg shadow-inner">
                              {c.avatar}
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-white truncate">{c.name}</span>
                                <span className="text-[9px] text-slate-500">{lastMsg?.timestamp || '12:00'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate pr-4">
                                {lastMsg ? lastMsg.text : 'Geen berichten.'}
                              </div>
                            </div>
                            {c.unread && (
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 self-center" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* ACTIVE CHET THREAD */
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
                              <div className="font-black text-xs text-white">{contact.name}</div>
                              <div className="text-[9px] text-slate-400 leading-none">{contact.role}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => startCall(contact.name, contact.phone, contact.role)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            title="Direct bellen"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Message History bubble area */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-950 flex flex-col">
                          {contact.messages.map(m => {
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
                          })}
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

            {/* 5. APP: SETTINGS / INFO APP (IN-PHONE) */}
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
                    <h4 className="font-black text-white">WerkMobile Phone V1</h4>
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
                      <span className="text-white font-bold">WerkOS v1.1</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850 text-[11px]">
                      <span className="text-slate-400">Verbinding:</span>
                      <span className="text-cyan-400 font-bold">Supabase Realtime</span>
                    </div>
                    <div className="flex justify-between py-1 text-[11px]">
                      <span className="text-slate-400">Model:</span>
                      <span className="text-amber-400 font-bold">AISTUDIO_PHONE</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-center text-[10px] text-slate-400">
                    <p>
                      Deze virtuele telefoon is speciaal gemaakt om mobiel gebruik te maken van WerkPay rekeningen, SMS berichten uit te wisselen met collega's en te bellen met geluidseffecten.
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
