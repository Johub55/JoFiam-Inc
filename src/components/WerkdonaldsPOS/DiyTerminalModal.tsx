import React, { useState, useEffect } from 'react';
import { 
  terminalManager, 
  ARDUINO_SKETCH_CODE, 
  TerminalCallbacks 
} from '../../services/terminalService';
import { showToast } from '../../services/appToast';
import { 
  Cpu, 
  Usb, 
  Download, 
  Copy, 
  Check, 
  X, 
  Radio, 
  Key, 
  Sparkles, 
  AlertCircle, 
  Play, 
  Layers,
  HelpCircle,
  Smartphone
} from 'lucide-react';

interface DiyTerminalModalProps {
  onClose: () => void;
  onSimulateCardScan?: (uid: string, pin: string) => void;
}

export const DiyTerminalModal: React.FC<DiyTerminalModalProps> = ({ onClose, onSimulateCardScan }) => {
  const [isConnected, setIsConnected] = useState<boolean>(terminalManager.getIsConnected());
  const [terminalStatus, setTerminalStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'code' | 'wiring' | 'simulator'>('connect');

  // Simulator State
  const [simLcdLine1, setSimLcdLine1] = useState<string>('Werkdonalds POS');
  const [simLcdLine2, setSimLcdLine2] = useState<string>('Klaar voor order');
  const [simUid, setSimUid] = useState<string>('4129883155049012');
  const [simPin, setSimPin] = useState<string>('');
  const [simState, setSimState] = useState<'idle' | 'card_scanned' | 'approved' | 'declined'>('idle');

  useEffect(() => {
    const callbacks: TerminalCallbacks = {
      onStatusChange: (status) => {
        setTerminalStatus(status);
        setIsConnected(terminalManager.getIsConnected());
      },
      onLog: (msg) => {
        setLogs(prev => [msg, ...prev.slice(0, 40)]);
      },
      onPaymentData: (data) => {
        if (onSimulateCardScan) {
          onSimulateCardScan(data.uid, data.pin);
        }
      }
    };
    terminalManager.setCallbacks(callbacks);
  }, [onSimulateCardScan]);

  const handleConnectUsb = async () => {
    const res = await terminalManager.connect();
    setIsConnected(terminalManager.getIsConnected());
    if (!res.success) {
      showToast(res.message, 'error');
    }
  };

  const handleDisconnectUsb = async () => {
    await terminalManager.disconnect();
    setIsConnected(false);
  };

  const handleCopyCode = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ARDUINO_SKETCH_CODE);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = ARDUINO_SKETCH_CODE;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (e) {
      console.warn("Fallback copy method used due to clipboard error:", e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([ARDUINO_SKETCH_CODE], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'WerkPay_DIY_Terminal.ino';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  // Simulator actions
  const handleSimTapCard = () => {
    setSimState('card_scanned');
    setSimLcdLine1('Pas herkend!');
    setSimLcdLine2('Pincode: ');
    setSimPin('');
  };

  const handleSimKeyPress = (char: string) => {
    if (simState !== 'card_scanned') return;

    if (char === '*') {
      setSimPin(prev => prev.slice(0, -1));
      return;
    }
    if (char === 'D') {
      setSimState('idle');
      setSimLcdLine1('Geannuleerd!');
      setSimLcdLine2('');
      setTimeout(() => {
        setSimLcdLine1('Werkdonalds POS');
        setSimLcdLine2('Klaar voor order');
      }, 1200);
      return;
    }
    if (char === '#' || char === 'A') {
      if (simPin.length >= 4) {
        setSimLcdLine1('Verifiëren...');
        setSimLcdLine2('Even geduld a.u.b.');
        setTimeout(() => {
          setSimState('approved');
          setSimLcdLine1('Betaling Gelukt!');
          setSimLcdLine2('Eet smakelijk! :)');
          if (onSimulateCardScan) {
            onSimulateCardScan(simUid, simPin);
          }
          setTimeout(() => {
            setSimState('idle');
            setSimLcdLine1('Werkdonalds POS');
            setSimLcdLine2('Klaar voor order');
            setSimPin('');
          }, 2500);
        }, 1000);
      }
      return;
    }
    if (simPin.length < 6) {
      setSimPin(prev => prev + char);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>DIY Pinapparaat (Arduino Terminal)</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                  isConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isConnected ? '● USB Verbonden' : '○ Standby / Niet Verbonden'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ondersteunt Arduino Uno/Nano, 5V I2C LCD, RC522 RFID en 4x4 Matrix Keypad.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'connect' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>USB Verbinding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'simulator' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Live Terminal Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wiring')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'wiring' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Aansluitschema (Pinout)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'code' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Arduino .INO Code</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: CONNECT */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-sm text-cyan-200 flex items-center gap-2">
                    <Usb className="w-4 h-4" />
                    Directe Web Serial koppeling via USB
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Sluit je Arduino met een USB-kabel aan op je computer. Klik op de knop hiernaast en selecteer de juiste COM-poort (bijv. <em>Arduino Uno</em> of <em>USB Serial CH340</em>). De POS stuurt live bedragen en ontvangt pincodes en pas-UID's!
                  </p>
                </div>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectUsb}
                    className="px-4 py-2.5 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-500 text-white transition shadow shrink-0"
                  >
                    Koppeling Verbreken
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectUsb}
                    className="px-4 py-2.5 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/20 shrink-0 flex items-center gap-2"
                  >
                    <Usb className="w-4 h-4" />
                    <span>Verbind met Arduino (USB)</span>
                  </button>
                )}
              </div>

              {/* Status and logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Seriële Terminal Monitor (115200 Baud):</span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Status: {terminalStatus}
                  </span>
                </div>
                <div className="h-44 overflow-y-auto bg-slate-900 border border-slate-800/80 rounded-xl p-3 font-mono text-[11px] text-emerald-400 space-y-1">
                  {logs.length === 0 ? (
                    <span className="text-slate-500 italic">Geen seriële activiteit. Verbind je Arduino om berichten te zien...</span>
                  ) : (
                    logs.map((l, i) => <div key={i}>{l}</div>)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400">
                💡 <strong>Interactieve Simulator:</strong> Hiermee test je het 5V I2C LCD scherm en het 4x4 matrix keypad direct in de browser vóórdat je de fysieke hardware aansluit!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* Visual Pinapparaat */}
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 p-5 rounded-3xl shadow-2xl space-y-4 max-w-sm mx-auto w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-cyan-400 tracking-wider">WERKPAY TERMINAL</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>

                  {/* 16x2 I2C LCD Emulatie */}
                  <div className="bg-[#003882] border-4 border-slate-800 p-3.5 rounded-xl shadow-inner font-mono text-cyan-100 space-y-1 select-none">
                    <div className="text-xs font-bold tracking-widest h-4 overflow-hidden whitespace-pre">
                      {simLcdLine1.padEnd(16, ' ')}
                    </div>
                    <div className="text-xs font-bold tracking-widest h-4 overflow-hidden whitespace-pre flex items-center">
                      <span>{simLcdLine2}</span>
                      {simState === 'card_scanned' && (
                        <span className="tracking-widest text-amber-300 font-bold">
                          {'*'.repeat(simPin.length)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RFID Tap Zone */}
                  <div 
                    onClick={handleSimTapCard}
                    className={`p-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
                      simState === 'card_scanned' 
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300' 
                        : 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300 hover:border-cyan-400'
                    }`}
                  >
                    <Radio className="w-6 h-6 animate-pulse" />
                    <span className="text-xs font-black">
                      {simState === 'card_scanned' ? '✓ Pas Aangeboden' : 'Houd Pas Hier (Klik om te scannen)'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">UID: {simUid}</span>
                  </div>

                  {/* 4x4 Matrix Keypad */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      '1','2','3','A',
                      '4','5','6','B',
                      '7','8','9','C',
                      '*','0','#','D'
                    ].map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSimKeyPress(key)}
                        className={`h-10 rounded-xl font-mono font-black text-sm transition shadow flex items-center justify-center ${
                          key === '#' || key === 'A' 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                            : key === '*' || key === 'D'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {key === '#' ? 'OK' : key === '*' ? 'DEL' : key}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Toets: <strong>[0-9]</strong> PIN, <strong>[DEL/*]</strong> Wissen, <strong>[OK/#]</strong> Bevestigen
                  </div>
                </div>

                {/* Simulator Settings */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-200">Simuleer Klant Pas &amp; Rekening</h4>
                  <div>
                    <label className="text-slate-400 block mb-1">Simulatie Pas-UID (Hex of Kaartnummer):</label>
                    <input
                      type="text"
                      value={simUid}
                      onChange={e => setSimUid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wanneer je op "Houd Pas Hier" klikt en 4 cijfers intoetst gevolgd door <strong># (OK)</strong>, wordt dit direct doorgestuurd naar de Werkdonalds kassa alsof de fysieke Arduino verbonden is!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WIRING SCHEMATIC */}
          {activeTab === 'wiring' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-black text-sm text-cyan-300">Aansluittabel voor Arduino Uno / Nano</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3 font-bold">Component</th>
                        <th className="py-2 px-3 font-bold">Pin op Component</th>
                        <th className="py-2 px-3 font-bold">Arduino Pin</th>
                        <th className="py-2 px-3 font-bold">Opmerking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">5V I2C LCD (1602/2004)</td>
                        <td className="py-2 px-3">VCC &amp; GND</td>
                        <td className="py-2 px-3 text-amber-400">5V &amp; GND</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Voeding display</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">5V I2C LCD (1602/2004)</td>
                        <td className="py-2 px-3">SDA &amp; SCL</td>
                        <td className="py-2 px-3 text-cyan-400">A4 (SDA) &amp; A5 (SCL)</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">I2C bus (adres 0x27 of 0x3F)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">RFID-RC522 (NFC/RFID)</td>
                        <td className="py-2 px-3">3.3V &amp; GND</td>
                        <td className="py-2 px-3 text-rose-400">3.3V (NIET 5V!) &amp; GND</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">RC522 vereist 3.3V spanning</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">RFID-RC522 (NFC/RFID)</td>
                        <td className="py-2 px-3">RST, SDA (SS)</td>
                        <td className="py-2 px-3 text-cyan-400">D9 (RST) &amp; D10 (SS)</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Reset &amp; Chip Select</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">RFID-RC522 (NFC/RFID)</td>
                        <td className="py-2 px-3">MOSI, MISO, SCK</td>
                        <td className="py-2 px-3 text-cyan-400">D11, D12, D13</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Hardware SPI pinnen</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">4x4 Matrix Keypad</td>
                        <td className="py-2 px-3">Rij 1, 2, 3, 4 (R1-R4)</td>
                        <td className="py-2 px-3 text-cyan-400">D2, D3, D4, D5</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Digitale rijen</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">4x4 Matrix Keypad</td>
                        <td className="py-2 px-3">Kol 1, 2, 3, 4 (C1-C4)</td>
                        <td className="py-2 px-3 text-cyan-400">D6, D7, D8, A0</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Digitale kolommen</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-white font-sans font-bold">Zoemer / Buzzer</td>
                        <td className="py-2 px-3">+ en -</td>
                        <td className="py-2 px-3 text-cyan-400">A1 &amp; GND</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">Audio feedback bij pas &amp; toetsen</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARDUINO SOURCE CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Volledige Arduino C++ Sketch (WerkPay_DIY_Terminal.ino):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadIno}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{downloaded ? 'Gedownload!' : 'Download .ino'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Gekopieerd!' : 'Kopieer Code'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono h-96 overflow-y-auto whitespace-pre">
                  {ARDUINO_SKETCH_CODE}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            DIY Pinapparaat klaar voor gebruik via USB (Chrome / Edge) of als standalone hardware terminal.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Sluiten
          </button>
        </div>

      </div>
    </div>
  );
};
