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
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 font-sans selection:bg-neutral-800">
      <h1 className="text-2xl font-bold text-white mb-5 tracking-wider uppercase flex items-center gap-2">
        Digital Photo Booth
      </h1>

      <div className="w-full max-w-md bg-neutral-950/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Step 1: Live Preview Box */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Preview</p>
          {mergedImageUrl ? (
            <div className="rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-900 shadow-xl transition-all">
              <img src={mergedImageUrl} alt="Framed Preview" className="w-full h-auto object-contain max-h-[460px] mx-auto block" />
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

        {/* Step 2: Take or Select Photo Button (Moved below Preview) */}
        <div className="mb-6">
          <label className="flex items-center justify-center gap-2 w-full text-center py-3.5 px-5 rounded-2xl bg-neutral-100 text-black font-semibold cursor-pointer hover:bg-neutral-200 active:scale-[0.99] transition shadow-md">
            <span>📷</span> Take Photo / Select Image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
          </label>
        </div>

        {/* Step 3: Frame Selection */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2.5">Select Frame</p>
          <div className="grid grid-cols-2 gap-2.5">
            {FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame.src)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium tracking-wide transition ${selectedFrame === frame.src
                    ? 'border-white bg-neutral-800 text-white shadow-inner font-semibold'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
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
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black disabled:bg-neutral-800 disabled:text-neutral-500 font-bold transition shadow-lg active:scale-[0.99]"
          >
            {uploading ? 'Uploading to Google Drive...' : '☁️ Save to Google Drive'}
          </button>
        )}

        {/* Step 5: QR Code for Instant Download */}
        {driveLink && (
          <div className="mt-6 p-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col items-center text-center shadow-lg">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full mb-3 border border-emerald-500/20">
              ✓ Upload Complete!
            </span>
            <div className="bg-white p-3.5 rounded-2xl shadow-inner mb-3">
              <QRCodeCanvas value={driveLink} size={150} />
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              මේ QR එක Scan කරලා Photo එක Download කරගන්න පුළුවන්
            </p>
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="text-white text-xs font-medium underline underline-offset-4 hover:text-neutral-300 transition"
            >
              Open in Google Drive ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}