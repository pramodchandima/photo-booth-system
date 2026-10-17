import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { saveAndBroadcastPhoto } from './gallerySync';
import DisplayWall from './DisplayWall';

// Frame එකක ව්‍යුහය (Type Interface)
interface FrameItem {
  id: number;
  name: string;
  src: string;
}

// Toast notification type
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ඔයාගේ frames ටික මෙතනට දාන්න (public/frames/ ඇතුළේ තියෙන ඒවා)
const FRAMES: FrameItem[] = [
  { id: 1, name: 'Frame 1 (3:4 Vertical)', src: '/frames/frame4_3x4.png' },
  { id: 2, name: 'Frame 2 (21:9)', src: '/frames/frame1.png' },
  { id: 3, name: 'Frame 3 (16:9)', src: '/frames/frame2.png' },
  { id: 4, name: 'Frame 4 (9:16)', src: '/frames/frame3.png' },
];

export default function App() {
  // Check if opened as dedicated wall view (?view=wall)
  const [currentView, setCurrentView] = useState<'booth' | 'wall'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'wall' ? 'wall' : 'booth';
  });

  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>(FRAMES[0].src);
  const [mergedImageUrl, setMergedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);

  // Gallery URL from env or fallback placeholder
  const galleryUrl = import.meta.env.VITE_GALLERY_URL || '';

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper to show top-right toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset preview function
  const handleReset = () => {
    setUserImage(null);
    setMergedImageUrl(null);
    showToast('Cleared / Reset', 'info');
  };

  // 1. Phone එකෙන් Photo එක ගත්තම හෝ තෝරපුවම වැඩ කරන function එක
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (typeof event.target?.result === 'string') {
          setUserImage(event.target.result);
          showToast('Photo loaded into preview', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Photo එක හෝ Frame එක වෙනස් වෙන හැම වෙලාවෙම Canvas එකේ දෙක එකතු කරලා පෙන්නනවා
  useEffect(() => {
    if (!userImage || !selectedFrame || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameImg = new Image();
    const baseImg = new Image();

    frameImg.crossOrigin = 'anonymous';
    baseImg.crossOrigin = 'anonymous';

    frameImg.onload = () => {
      const WIDTH = frameImg.width || 1920;
      const HEIGHT = frameImg.height || 1080;
      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      baseImg.onload = () => {
        const scale = Math.max(WIDTH / baseImg.width, HEIGHT / baseImg.height);
        const x = (WIDTH - baseImg.width * scale) / 2;
        const y = (HEIGHT - baseImg.height * scale) / 2;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(baseImg, x, y, baseImg.width * scale, baseImg.height * scale);
        ctx.drawImage(frameImg, 0, 0, WIDTH, HEIGHT);

        setMergedImageUrl(canvas.toDataURL('image/png'));
      };

      baseImg.src = userImage;
    };

    frameImg.src = selectedFrame;
  }, [userImage, selectedFrame]);

  // 3. හැදුණු Final Image එක Google Apps Script හරහා Drive එකට යවන function එක
  const handleUploadToDrive = async () => {
    if (!mergedImageUrl) return;
    setUploading(true);

    const GOOGLE_SCRIPT_URL = import.meta.env.GOOGLE_SCRIPT_URL;

    if (!GOOGLE_SCRIPT_URL) {
      showToast('Google Apps Script URL එක (.env) සකසා නැත!', 'error');
      setUploading(false);
      return;
    }

    try {
      const base64Data = mergedImageUrl.split(',')[1];

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          image: base64Data,
          folderId: import.meta.env.GOOGLE_DRIVE_FOLDER || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Broadcast to Live Wall in real-time (and save locally)
        await saveAndBroadcastPhoto(mergedImageUrl);

        showToast('Photo එක Drive එකට upload වුණා! Ready for next photo.', 'success');
        // Reset preview to allow taking the next photo instantly
        setUserImage(null);
        setMergedImageUrl(null);
      } else {
        showToast('Upload කිරීම අසාර්ථකයි: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      showToast('Upload කිරීමේදී දෝෂයක් ඇති වුණා!', 'error');
    } finally {
      setUploading(false);
    }
  };

  // If in dedicated Wall view, render DisplayWall
  if (currentView === 'wall') {
    return <DisplayWall onBackToBooth={() => setCurrentView('booth')} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 font-sans selection:bg-neutral-800 relative">
      {/* Top Right Notifications / Toasts Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-neutral-900/95 border-emerald-500/50 text-white'
                : toast.type === 'error'
                ? 'bg-neutral-900/95 border-red-500/50 text-white'
                : 'bg-neutral-900/95 border-neutral-700 text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Header with Title and Action Buttons */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white tracking-wider uppercase">
          Digital Photo Booth
        </h1>
        <div className="flex items-center gap-2">
          {/* Button to open Big Screen Live Wall */}
          <button
            onClick={() => window.open(window.location.origin + '?view=wall', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
            title="Open Live Wall in a new tab for big screens / TV"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Wall ↗
          </button>

          {galleryUrl && (
            <button
              onClick={() => setShowGalleryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition"
            >
              <span>📱</span> Album QR
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-md bg-neutral-950/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Step 1: Live Preview Box */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Preview</p>
          {mergedImageUrl ? (
            <div className="rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-900 shadow-xl transition-all">
              <img
                src={mergedImageUrl}
                alt="Framed Preview"
                className="w-full h-auto object-contain max-h-[460px] mx-auto block"
              />
            </div>
          ) : (
            <div className="h-72 rounded-2xl border-2 border-dashed border-neutral-800 bg-neutral-900/40 flex flex-col items-center justify-center text-neutral-400 text-center px-5">
              <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-xl mb-3 text-neutral-300">
                🖼️
              </div>
              <p className="text-sm font-medium">Photo එකක් ගත්තම හෝ තෝරපුවම</p>
              <p className="text-xs text-neutral-500 mt-1">Preview එක මෙතන පෙනේවි</p>
            </div>
          )}
        </div>

        {/* Step 2: Camera Controls (Real Camera App Style Shutter & Reset) */}
        <div className="flex items-center justify-center gap-7 mb-6 py-2">
          {/* Reset / Clear Button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!mergedImageUrl && !userImage}
            title="Reset / Clear Photo"
            className="w-12 h-12 rounded-full border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-neutral-300 hover:text-white transition active:scale-90 shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          {/* Real Camera Shutter Ring Button */}
          <label
            title="Take Photo / Select Image"
            className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white/90 p-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-black group"
          >
            {/* Inner Shutter Core with Camera Icon */}
            <div className="w-full h-full rounded-full bg-white group-hover:bg-neutral-200 transition-all flex items-center justify-center text-neutral-900 shadow-inner">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
          </label>

          {/* Compact Upload / Save Button on the Right Side of Capture */}
          {mergedImageUrl ? (
            <button
              type="button"
              onClick={handleUploadToDrive}
              disabled={uploading}
              title={uploading ? 'Uploading to Google Drive...' : 'Save & Upload to Drive'}
              className="w-12 h-12 rounded-full border border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : (
                <span className="text-lg">☁️</span>
              )}
            </button>
          ) : (
            /* Spacer to keep shutter centered when no photo */
            <div className="w-12 h-12" />
          )}
        </div>

        {/* Step 3: Frame Selection */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2.5">Select Frame</p>
          <div className="grid grid-cols-2 gap-2.5">
            {FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame.src)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium tracking-wide transition ${
                  selectedFrame === frame.src
                    ? 'border-white bg-neutral-800 text-white shadow-inner font-semibold'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {frame.name}
              </button>
            ))}
          </div>
        </div>

        {/* Small save status helper if merged image exists */}
        {mergedImageUrl && (
          <div className="mt-2 text-center">
            <button
              onClick={handleUploadToDrive}
              disabled={uploading}
              className="text-xs text-neutral-400 hover:text-emerald-400 font-medium transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>{uploading ? '⏳ Uploading...' : '☁️ Save & Next Photo'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Shared Album QR Modal (Optional popup if user taps Album QR) */}
      {showGalleryModal && galleryUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl relative">
            <button
              onClick={() => setShowGalleryModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-sm"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-white mb-2">Event Gallery QR</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Scan this QR to view and download all event photos from Google Drive.
            </p>
            <div className="bg-white p-3 rounded-2xl inline-block mb-4 shadow-md">
              <QRCodeCanvas value={galleryUrl} size={180} />
            </div>
            <a
              href={galleryUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-neutral-300 underline underline-offset-4 hover:text-white"
            >
              Open Shared Drive Folder ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}