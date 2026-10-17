import React, { useState, useEffect } from 'react';
import { getStoredPhotos, fetchDrivePhotos, subscribeToNewPhotos, type BoothPhoto } from './gallerySync';

export default function DisplayWall({ onBackToBooth }: { onBackToBooth?: () => void }) {
  const [photos, setPhotos] = useState<BoothPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPhotos = async () => {
    setIsRefreshing(true);
    // 1. First fetch directly from Google Drive
    const drivePhotos = await fetchDrivePhotos();
    if (drivePhotos.length > 0) {
      setPhotos(drivePhotos);
    } else {
      // 2. Fallback to local stored if drive returns empty
      const stored = await getStoredPhotos();
      setPhotos(stored);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    // Initial load
    loadPhotos();

    // Subscribe to realtime local broadcasts from booth
    const unsubscribe = subscribeToNewPhotos((newPhoto) => {
      setPhotos((prev) => {
        if (prev.some((p) => p.id === newPhoto.id)) return prev;
        return [newPhoto, ...prev];
      });
    });

    // Auto-poll Google Drive every 10 seconds so any phone upload shows automatically on screen
    const pollInterval = setInterval(() => {
      fetchDrivePhotos().then((drivePhotos) => {
        if (drivePhotos.length > 0) {
          setPhotos(drivePhotos);
        }
      });
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Bar for Big Screen Wall */}
      <header className="px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            Live Photo Wall
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-medium">
            {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Refresh / Sync Button */}
          <button
            onClick={loadPhotos}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
            title="Sync photos directly from Google Drive"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Drive'}</span>
          </button>

          {onBackToBooth && (
            <button
              onClick={onBackToBooth}
              className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition"
            >
              ← Photo Booth
            </button>
          )}

          <button
            onClick={() => window.open(window.location.origin + '?view=wall', '_blank')}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition flex items-center gap-1.5"
            title="Open in a separate dedicated browser tab/window"
          >
            <span>↗</span> Open New Tab
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition"
            title="Toggle Fullscreen"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {isFullScreen ? (
                <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7" />
              ) : (
                <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7M3 9V3m0 0h6m-6 0l7 7m14 5v6m0 0h-6m6 0l-7-7" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {photos.length === 0 ? (
          <div className="h-[75vh] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-3xl mb-4 text-neutral-400">
              📸
            </div>
            <h2 className="text-xl font-semibold text-neutral-200 mb-2">No Photos Captured Yet</h2>
            <p className="text-sm text-neutral-500 max-w-sm">
              Capture a photo in the Photo Booth. It will automatically appear here on this big screen in real-time!
            </p>
          </div>
        ) : (
          /*
            Responsive Grid columns adjust automatically depending on screen size:
            - Mobile: 1-2 columns
            - Tablet: 3 columns
            - Laptop / Standard Desktop: 4 columns
            - Large Screens / 2K / TVs: 5-6 columns
          */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
            {photos.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setSelectedPhoto(item.url)}
                className={`group relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer shadow-lg hover:border-neutral-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                  index === 0 ? 'ring-2 ring-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.25)]' : ''
                }`}
              >
                <div className="w-full aspect-[3/4] bg-neutral-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.url}
                    alt="Booth item"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.triedFallback && item.id) {
                        target.dataset.triedFallback = 'true';
                        target.src = `https://drive.google.com/thumbnail?id=${item.id}&sz=w800`;
                      }
                    }}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-emerald-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                    New
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-xs text-white font-medium flex items-center gap-1">
                    🔍 Click to Enlarge
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Enlarged Photo Modal / Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-sm transition"
          >
            ✕ Close
          </button>
          <img
            src={selectedPhoto}
            alt="Enlarged view"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
