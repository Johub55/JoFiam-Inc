import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Flame, Car, Navigation, Volume2, VolumeX } from 'lucide-react';
import { AudioFX } from '../services/audio';

interface GtaEasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GtaEasterEggModal: React.FC<GtaEasterEggModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [wantedLevel, setWantedLevel] = useState<number>(1);
  const [burgersDelivered, setBurgersDelivered] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('🚨 WERKDONALDS GTA: Rijd naar de groene bezorgzone!');

  useEffect(() => {
    if (!isOpen) return;

    AudioFX.success();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let localScore = 0;
    let localDelivered = 0;

    // Game state
    const player = {
      x: 300,
      y: 200,
      angle: 0,
      speed: 0,
      maxSpeed: 4,
      accel: 0.15,
      friction: 0.96,
      rotSpeed: 0.06,
      width: 24,
      height: 40
    };

    const keys: Record<string, boolean> = {};

    // Delivery zone
    let target = {
      x: 500,
      y: 350,
      radius: 35
    };

    const spawnNewTarget = () => {
      target.x = 80 + Math.floor(Math.random() * 500);
      target.y = 80 + Math.floor(Math.random() * 320);
    };

    // Cop car chasing
    const cop = {
      x: 100,
      y: 100,
      speed: 2,
      angle: 0
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Main Game Loop
    const render = () => {
      // 1. Update Player Physics
      if (keys['KeyW'] || keys['ArrowUp']) {
        player.speed = Math.min(player.speed + player.accel, player.maxSpeed);
      } else if (keys['KeyS'] || keys['ArrowDown']) {
        player.speed = Math.max(player.speed - player.accel, -player.maxSpeed * 0.5);
      } else {
        player.speed *= player.friction;
      }

      if (keys['KeyA'] || keys['ArrowLeft']) {
        player.angle -= player.rotSpeed * (player.speed / player.maxSpeed);
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        player.angle += player.rotSpeed * (player.speed / player.maxSpeed);
      }

      player.x += Math.sin(player.angle) * player.speed;
      player.y -= Math.cos(player.angle) * player.speed;

      // Keep in bounds
      player.x = Math.max(20, Math.min(680, player.x));
      player.y = Math.max(20, Math.min(460, player.y));

      // 2. Cop AI (Follows player)
      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const distToCop = Math.hypot(dx, dy);
      if (distToCop > 10) {
        cop.x += (dx / distToCop) * cop.speed;
        cop.y += (dy / distToCop) * cop.speed;
      }

      // Check collision with delivery target
      const distToTarget = Math.hypot(player.x - target.x, player.y - target.y);
      if (distToTarget < target.radius) {
        AudioFX.bell();
        localScore += 50;
        localDelivered += 1;
        setScore(localScore);
        setBurgersDelivered(localDelivered);
        setStatusMsg('🍔 BURGER BEZORGD! +€ 50,00 | Zoek het volgende afleveradres!');
        spawnNewTarget();

        if (localDelivered % 3 === 0) {
          setWantedLevel(prev => Math.min(5, prev + 1));
          cop.speed += 0.4;
        }
      }

      // 3. DRAW GRAPHICS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Asphalt / City Map
      ctx.fillStyle = '#1e293b'; // dark slate asphalt
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Road Grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 40;
      // Horizontal roads
      ctx.beginPath();
      ctx.moveTo(0, 150); ctx.lineTo(700, 150);
      ctx.moveTo(0, 350); ctx.lineTo(700, 350);
      // Vertical roads
      ctx.moveTo(200, 0); ctx.lineTo(200, 500);
      ctx.moveTo(500, 0); ctx.lineTo(500, 500);
      ctx.stroke();

      // Road dashes
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, 150); ctx.lineTo(700, 150);
      ctx.moveTo(0, 350); ctx.lineTo(700, 350);
      ctx.moveTo(200, 0); ctx.lineTo(200, 500);
      ctx.moveTo(500, 0); ctx.lineTo(500, 500);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Werkdonalds Store Building (Top Left)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(30, 30, 120, 80);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🍔 WERKDONALDS', 38, 75);

      // Draw Delivery Target Zone (Pulsing Circle)
      const pulseRadius = target.radius + Math.sin(Date.now() / 150) * 4;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('🍔 BEZORGEN', target.x - 35, target.y + 5);

      // Draw Cop Car
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.fillStyle = '#1e3a8a'; // Blue cop car
      ctx.fillRect(-10, -18, 20, 36);
      // Siren flashing
      const isRed = Math.floor(Date.now() / 100) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();

      // Draw Player Car (Red Delivery Burger Van)
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      // Car Body
      ctx.fillStyle = '#ef4444'; // Red
      ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

      // Roof / Glass
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-player.width / 2 + 3, -player.height / 2 + 8, player.width - 6, 12);

      // Yellow Burger Icon on Roof
      ctx.fillStyle = '#f59e0b';
      ctx.font = '12px sans-serif';
      ctx.fillText('🍔', -6, 2);

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-player.width / 2 + 2, -player.height / 2 - 2, 4, 3);
      ctx.fillRect(player.width / 2 - 6, -player.height / 2 - 2, 4, 3);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border-4 border-amber-500 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl font-black shrink-0 animate-bounce">
              🏎️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white uppercase tracking-tight">
                  GTA: Werkdonalds City Edition 🍔
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  EASTER EGG
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bestuur de bezorgwagen met <strong>WASD / Pijltjestoetsen</strong> en bezorg de burgers!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold transition flex items-center gap-1"
          >
            <X className="w-5 h-5 text-rose-400" />
            <span>Sluiten (ESC)</span>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Verdiend Cash</span>
            <span className="text-lg font-black text-emerald-400">€ {score},00</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Burgers Bezorgd</span>
            <span className="text-lg font-black text-amber-400">🍔 {burgersDelivered}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Wanted Level</span>
            <span className="text-lg font-black text-rose-400">
              {'⭐'.repeat(wantedLevel)}
            </span>
          </div>
        </div>

        {/* Game Canvas Screen */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-950 flex justify-center">
          <canvas
            ref={canvasRef}
            width={700}
            height={480}
            className="w-full max-w-[700px] h-auto object-contain block"
          />
        </div>

        {/* Status Message */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-amber-300 text-center">
          {statusMsg}
        </div>

      </div>
    </div>
  );
};
