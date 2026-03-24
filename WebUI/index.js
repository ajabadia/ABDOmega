/**
 * OMEGA Main Entry Point
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[OMEGA] Initializing Modular UI...");
    const initStartTime = Date.now();
    const MIN_SPLASH_TIME = 3000;
    
    // Version & Build Metadata from C++
    const initData = window.initialisationData || window.__JUCE__?.initialisationData || {};
    const version = initData.version || "1.0.0";
    const build = initData.build || "??";
    const timestamp = initData.timestamp || "";
    
    // Diagnostic log to visual console
    if (window.appendToConsole) {
        window.appendToConsole(`[VERSION] OMEGA Build #${build} (${timestamp})`, 'log');
    }
    
    // Update Metadata
    const splashVersionEl = document.querySelector('.splash-version');
    const aboutVer = document.getElementById('about-version');
    const aboutBuild = document.getElementById('about-build');
    const aboutTs = document.getElementById('about-timestamp');
    const topBarVersion = document.getElementById('top-bar-version');
    
    if (version && build) {
        const versionStr = `v${version} (Build ${build})`;
        if (splashVersionEl) splashVersionEl.innerText = `${versionStr} [${timestamp}]`;
        if (aboutVer) aboutVer.innerText = version;
        if (aboutBuild) aboutBuild.innerText = build;
        if (aboutTs) aboutTs.innerText = timestamp;
        if (topBarVersion) {
            topBarVersion.innerText = `OMEGA ${versionStr}`;
        }
    }

    const hideSplash = () => {
        const splash = document.getElementById('splash-screen');
        const rack = document.getElementById('omega-rack');
        if (splash && splash.style.display !== 'none') {
            const elapsed = Date.now() - initStartTime;
            const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);
            
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    if (rack) {
                        rack.style.display = 'flex';
                        console.log("[OMEGA] Rack visible now.");
                    }
                }, 1000);
            }, remaining);
        }
    };

    // --- Menu Handling ---
    const menuAbout = document.getElementById('menu-about');
    const aboutModal = document.getElementById('about-modal');
    if (menuAbout && aboutModal) {
        menuAbout.onclick = () => {
            aboutModal.style.display = 'flex';
        };
    }

    const closeModal = () => { 
        if (aboutModal) aboutModal.style.display = 'none'; 
    };
    
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;
    
    const okBtn = document.querySelector('.modal-ok-btn');
    if (okBtn) okBtn.onclick = closeModal;
    
    window.onclick = (event) => {
        if (event.target == aboutModal) closeModal();
        if (event.target == document.getElementById('presets-modal')) {
            document.getElementById('presets-modal').style.display = 'none';
        }
    };

    const menuPresets = document.getElementById('menu-presets');
    const presetsModal = document.getElementById('presets-modal');
    if (menuPresets && presetsModal) {
        menuPresets.onclick = () => {
            presetsModal.style.display = 'flex';
            // Refresh list when opening
            if (window.omegaPresetBrowser) window.omegaPresetBrowser.refresh();
        };
    }

    const menuConsole = document.getElementById('menu-console');
    const debugConsole = document.getElementById('debug-console');
    const consoleContent = document.getElementById('debug-console-content');
    
    if (menuConsole && debugConsole) {
        menuConsole.onclick = () => {
            debugConsole.style.display = (debugConsole.style.display === 'none' || debugConsole.style.display === '') ? 'block' : 'none';
            if (debugConsole.style.display === 'block') {
                consoleContent.scrollTop = consoleContent.scrollHeight;
            }
        };
    }

    const copyBtn = document.getElementById('copy-console');
    if (copyBtn && consoleContent) {
        copyBtn.onclick = () => {
            const text = consoleContent.innerText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.style.color = '#00ff00';
                    setTimeout(() => copyBtn.style.color = '', 1000);
                }).catch(err => {
                    console.error("Clipboard API failed:", err);
                });
            } else {
                // Fallback for non-secure contexts or older browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    copyBtn.style.color = '#00ff00';
                    setTimeout(() => copyBtn.style.color = '', 1000);
                } catch (err) {
                    console.error("Fallback copy failed:", err);
                }
                document.body.removeChild(textArea);
            }
        };
    }

    const clearBtn = document.getElementById('clear-console');
    if (clearBtn && consoleContent) {
        clearBtn.onclick = () => {
            consoleContent.innerHTML = '';
        };
    }

    const closeConsoleBtn = document.getElementById('close-console');
    if (closeConsoleBtn && debugConsole) {
        closeConsoleBtn.onclick = () => {
            debugConsole.style.display = 'none';
        };
    }

    const menuExit = document.getElementById('menu-exit');
    if (menuExit) {
        menuExit.onclick = () => {
            if (confirm("¿Seguro que quieres salir de OMEGA?")) {
                window.omegaRPC.send("exit");
            }
        };
    }

    // Initial State & Metadata Fetch
    console.log("[OMEGA] Starting state/metadata fetch from RPC...");
    try {
        // Fetch metadata first (the source of truth)
        const metadata = await window.omegaRPC.getMetadata();
        console.log("[OMEGA] Metadata received:", metadata ? Object.keys(metadata).length : 0, "params");
        window.omegaMetadata = metadata || {};

        const state = await window.omegaRPC.getState();
        console.log("[OMEGA] State received:", state ? "YES" : "NULL");
        if (window.appendToConsole) {
            window.appendToConsole(`[OMEGA] Metadata loaded: ${Object.keys(window.omegaMetadata).length} params`, 'log');
            window.appendToConsole(`[OMEGA] State received: ${state ? "YES" : "NULL"}`, 'log');
        }
        
        if (window.moduleManager) {
            window.moduleManager.updateRack(state);
        }

        // --- Initialize [Git-for-Sounds] UI ---
        if (window.PresetBrowser && window.VersionControl) {
            window.omegaPresetBrowser = new window.PresetBrowser('preset-browser-container');
            window.omegaVersionControl = new window.VersionControl('version-control-container');

            window.omegaPresetBrowser.onPresetSelect = (id) => {
                window.omegaVersionControl.refresh(id);
            };

            // Initial refresh
            window.omegaPresetBrowser.refresh();
            if (state && state.preset) {
                window.omegaVersionControl.refresh(state.preset.id);
            }
        }

        hideSplash();

        // --- Initialize Telemetry Loop (Dynamic) ---
        const pollTelemetry = async () => {
            const mgr = window.moduleManager;
            if (!mgr || !mgr.oscilloscopes) return;

            const activeOscs = mgr.oscilloscopes.filter(o => o.active);
            if (activeOscs.length === 0) {
                requestAnimationFrame(pollTelemetry);
                return;
            }

            try {
                const indices = activeOscs.map(o => o.signalIndex);
                const data = await window.omegaRPC.send("getTelemetry", { indices });
                
                if (data && data.payload) {
                    activeOscs.forEach(o => {
                        const signalData = data.payload[o.signalIndex.toString()];
                        if (signalData) o.update(signalData);
                    });
                }
            } catch (err) {
                // Silently ignore telemetry errors
            }
            requestAnimationFrame(pollTelemetry);
        };
        
        pollTelemetry();

    } catch (e) {
        console.error("[OMEGA] Initial state fetch failed:", e);
        setTimeout(hideSplash, 2000); 
    }

    // Global Listeners
    window.addEventListener('omega:paramChanged', (e) => {
        const { paramId, value } = e.detail;
        window.dispatchEvent(new CustomEvent(`omega:sync:${paramId}`, { detail: value }));
    });
});
