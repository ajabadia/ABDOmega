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
    
    // Update Splash & About Modal
    const splashVersionEl = document.querySelector('.splash-version');
    if (splashVersionEl) splashVersionEl.innerText = `Version ${version} - Build ${build} (${timestamp})`;
    
    const aboutVer = document.getElementById('about-version');
    const aboutBuild = document.getElementById('about-build');
    const aboutTs = document.getElementById('about-timestamp');
    
    if (aboutVer) aboutVer.innerText = version;
    if (aboutBuild) aboutBuild.innerText = build;
    if (aboutTs) aboutTs.innerText = timestamp;

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
    };

    const menuConsole = document.getElementById('menu-console');
    const debugConsole = document.getElementById('debug-console');
    if (menuConsole && debugConsole) {
        menuConsole.onclick = () => {
            debugConsole.style.display = (debugConsole.style.display === 'none' || debugConsole.style.display === '') ? 'block' : 'none';
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

    // Initial State Fetch
    console.log("[OMEGA] Starting state fetch from RPC...");
    try {
        const state = await window.omegaRPC.getState();
        console.log("[OMEGA] State received:", state ? "YES" : "NULL");
        
        if (window.moduleManager) {
            window.moduleManager.updateRack(state);
        }

        hideSplash();

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
