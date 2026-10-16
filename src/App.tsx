import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

// Frame එකක ව්‍යුහය (Type Interface)
interface FrameItem {
  id: number;
  name: string;
  src: string;
}

// ඔයාගේ frames ටික මෙතනට දාන්න (public/frames/ ඇතුළේ තියෙන ඒවා)
const FRAMES: FrameItem[] = [
  { id: 1, name: 'Frame 1 (21:9)', src: '/frames/frame1.png' },
  { id: 2, name: 'Frame 2 (16:9)', src: '/frames/frame2.png' },
  { id: 3, name: 'Frame 3 (9:16)', src: '/frames/frame3.png' },
  { id: 4, name: 'Frame 4 (3:4 Vertical)', src: '/frames/frame4_3x4.png' },
];

export default function App() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>(FRAMES[0].src);
  const [mergedImageUrl, setMergedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [driveLink, setDriveLink] = useState<string | null>(null);

  // TypeScript වලදී Canvas එකට HTMLCanvasElement type එක දෙන්න ඕනේ
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Phone එකෙන් Photo එක ගත්තම හෝ තෝරපුවම වැඩ කරන function එක
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (typeof event.target?.result === 'string') {
          setUserImage(event.target.result);
          setDriveLink(null);
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

    // Frame එක සහ User Photo එක load වූ පසු Canvas එකට draw කරනු ලැබේ
    frameImg.onload = () => {
      // Frame එකේ සැබෑ දිග පළල අනුව Canvas එක සකස් කරයි (Landscape / Portrait auto-match)
      const WIDTH = frameImg.width || 1920;
      const HEIGHT = frameImg.height || 1080;
      canvas.width = WIDTH;
      canvas.height = HEIGHT;

      baseImg.onload = () => {
        // User photo එක frame එකේ මැදට cover වන පරිදි scale කර ගැනීම
        const scale = Math.max(WIDTH / baseImg.width, HEIGHT / baseImg.height);
        const x = (WIDTH - baseImg.width * scale) / 2;
        const y = (HEIGHT - baseImg.height * scale) / 2;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // 1. මුලින්ම User Photo එක යටින් draw කරයි
        ctx.drawImage(baseImg, x, y, baseImg.width * scale, baseImg.height * scale);

        // 2. Transparent Frame එක උඩින් overlay කරයි
        ctx.drawImage(frameImg, 0, 0, WIDTH, HEIGHT);

        // Preview & upload සඳහා final merged data URL එක ලබා ගැනීම
        setMergedImageUrl(canvas.toDataURL('image/png'));
      };

      baseImg.src = userImage;
    };

    frameImg.src = selectedFrame;
  }, [userImage, selectedFrame]);

  // 3. හැදුණු Final Image එක Backend එක හරහා Google Drive එකට යවන function එක
  // 3. Backend එකක් නැතුව කෙලින්ම Google Apps Script හරහා Drive එකට යවන function එක
  const handleUploadToDrive = async () => {
    if (!mergedImageUrl) return;
    setUploading(true);

    // Google Apps Script Web App URL එක .env එකෙන් ලබාගනී
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

    if (!GOOGLE_SCRIPT_URL) {
      alert('Google Apps Script URL එක (.env) සකසා නැත!');
      setUploading(false);
      return;
    }

    try {
      // Data URL එකෙන් "data:image/png;base64," කියන මුල් කොටස අයින් කරලා Base64 string එක විතරක් ගන්නවා
      const base64Data = mergedImageUrl.split(',')[1];

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        // CORS ප්‍රශ්න නොඑන්න text/plain විදිහට JSON එක යවනවා
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      const data = await response.json();
      if (data.success) {
        setDriveLink(data.viewLink);
        alert('Photo එක සාර්ථකව Google Drive එකට Upload වුණා!');
      } else {
        alert('Upload කිරීම අසාර්ථකයි: ' + data.error);
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Upload කිරීමේදී දෝෂයක් ඇති වුණා!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 font-sans">
      <h1 className="text-2xl font-bold text-cyan-400 mb-4 tracking-wide">
        Digital Photo Booth
      </h1>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        
        {/* Step 1: Take or Select Photo */}
        <div className="mb-5">
          <label className="block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold cursor-pointer hover:opacity-90 transition">
            📸 Take a Photo / Select Image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
          </label>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Step 2: Live Preview */}
        {mergedImageUrl ? (
          <div className="mb-5">
            <p className="text-sm text-slate-400 mb-2">Preview:</p>
            <div className="rounded-xl overflow-hidden border-2 border-cyan-500/40 shadow-lg">
              <img src={mergedImageUrl} alt="Framed Preview" className="w-full h-auto" />
            </div>
          </div>
        ) : (
          <div className="h-64 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 mb-5 text-center px-4">
            Photo එකක් ගත්තම Preview එක මෙතන පෙන්නයි
          </div>
        )}

        {/* Step 3: Frame Selection */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2">Select a Frame:</p>
          <div className="grid grid-cols-2 gap-3">
            {FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame.src)}
                className={`p-2 rounded-xl border text-sm font-medium transition ${
                  selectedFrame === frame.src
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                {frame.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Upload Button */}
        {mergedImageUrl && (
          <button
            onClick={handleUploadToDrive}
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 font-bold text-white transition shadow-lg"
          >
            {uploading ? 'Uploading to Google Drive...' : '☁️ Save to Google Drive'}
          </button>
        )}

        {/* Step 5: QR Code for Instant Download */}
        {driveLink && (
          <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl flex flex-col items-center text-center">
            <p className="text-emerald-400 font-semibold mb-2">Upload Complete!</p>
            <div className="bg-white p-3 rounded-lg mb-3">
              <QRCodeCanvas value={driveLink} size={140} />
            </div>
            <p className="text-xs text-slate-400 mb-2">
              මේ QR එක Scan කරලා Photo එක Download කරගන්න පුළුවන්
            </p>
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 text-sm underline"
            >
              Open in Google Drive
            </a>
          </div>
        )}
      </div>
    </div>
  );
}