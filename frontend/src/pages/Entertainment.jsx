import React from "react";
import { ExternalLink, Sparkles, Tv, MonitorPlay, AlertCircle } from "lucide-react";

export default function Entertainment() {
  const NET_URL = "https://net22.cc";

  /**
   * Utility to open the target URL in a centered, standalone popup window.
   * This mimics a native "app" feel and prevents the iframe verification loop.
   */
  const openInOSWindow = (url, title = "NetMirror App") => {
  // We use screen dimensions to force it to fill the monitor
  const w = window.screen.availWidth;
  const h = window.screen.availHeight;

  const features = `
    width=${w}, 
    height=${h}, 
    top=0, 
    left=0, 
    popup=yes,
    fullscreen=yes,
    toolbar=no,
    location=no,
    directories=no,
    status=no,
    menubar=no,
    scrollbars=yes,
    resizable=yes
  `;

  window.open(url, title, features);
};


  return (
    <div className="min-h-full bg-[#09090b] text-zinc-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Module */}
        <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-purple-400/90 mb-2 font-medium">New Module</p>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Tv className="h-7 w-7 text-purple-400" />
                Entertainment Zone
              </h1>
              <p className="text-zinc-400 mt-2 max-w-2xl">
                Experience NetMirror directly in Smart OS. If you encounter verification loops below, 
                use the <span className="text-purple-300 font-medium">Launch App View</span> for a standalone experience.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Secondary Link: Standard Tab */}
              <a
                href={NET_URL}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Open Tab
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Primary Action: OS-Style Window */}
              <button
                onClick={() => openInOSWindow(NET_URL)}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
              >
                <MonitorPlay className="h-4 w-4" />
                Launch App View
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: The Iframe Container */}
        <div className="relative group rounded-2xl border border-zinc-800 overflow-hidden bg-black shadow-2xl shadow-purple-950/20">
          <iframe
            src={NET_URL}
            title="NetMirror Entertainment"
            className="w-full h-[65vh] md:h-[70vh] opacity-90 group-hover:opacity-100 transition-opacity"
            loading="lazy"
            // Permissions to help verification scripts run as smoothly as possible
            sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            referrerPolicy="no-referrer-when-downgrade"
          />
          
          {/* Overlay Guide: Visible when the iframe is active */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700 px-4 py-2 rounded-full text-[11px] md:text-xs text-zinc-400 backdrop-blur-md shadow-xl">
              <AlertCircle className="h-3 w-3 text-amber-500" />
              <span>Stuck on "Verify you are human"? Click <b>Launch App View</b> above.</span>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
