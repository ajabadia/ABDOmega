/**
 * OMEGA Synthesizer - Main Entry Point (TypeScript)
 * Phase 15.1 - Structural Maturity
 */

import { rpc, setupJuceShim } from './omega_rpc.js';
import { MetadataStore } from './metadata_store.js';
import { ModuleManager } from './module_manager.js';
import { app } from './script.js';
import { Preferences } from './preferences.js';
import { ServiceMode } from './service.js';
import { PresetBrowser } from './components/PresetBrowser.js';
import { ModuleRenderer } from './module_renderer.js';
import { ModuleOscilloscope } from './components/ModuleOscilloscope.js';
import { ModuleMidiTrigger } from './components/ModuleMidiTrigger.js';
import { ModuleMidiViewer } from './components/ModuleMidiViewer.js';
import { ModulePatchbayMatrix } from './components/ModulePatchbayMatrix.js';
import { ModulePatchModal } from './components/ModulePatchModal.js';
import { ModuleMidiToCv } from './components/ModuleMidiToCv.js';
import { ModuleBrowser } from './components/ModuleBrowser.js';

// Global instances for legacy bridge compatibility
(window as any).omegaRPC = rpc;
(window as any).metadataStore = new MetadataStore();
(window as any).moduleManager = new ModuleManager();
(window as any).Preferences = Preferences;
(window as any).ServiceMode = ServiceMode;
(window as any).ModuleRenderer = ModuleRenderer;
(window as any).ModuleOscilloscope = ModuleOscilloscope;
(window as any).ModuleMidiTrigger = ModuleMidiTrigger;
(window as any).ModuleMidiViewer = ModuleMidiViewer;
(window as any).ModulePatchbayMatrix = ModulePatchbayMatrix;
(window as any).ModuleMidiToCv = ModuleMidiToCv;
(window as any).ModuleBrowser = ModuleBrowser;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[OMEGA] Booting Synth UI...");
    
    // 1. Setup RPC Bridge
    setupJuceShim();
    
    // 2. Load Metadata
    const store = (window as any).metadataStore;
    if (store) {
        try {
            console.log("[OMEGA] Loading Metadata...");
            await Promise.race([
                store.ensureLoaded(),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
        } catch (e) {
            console.error("[OMEGA] Metadata load failed, continuing:", e);
        }
    }
    
    // 3. Initialize Components
    console.log("[OMEGA] Initializing Components...");
    try {
        await Preferences.init();
        await PresetBrowser.init();
        
        // Initialize Global Patchbay Hub
        const matrixHub = new ModulePatchbayMatrix();
        (window as any).patchbayHub = matrixHub;

        // Bind Matrix Trigger Buttons
        const matrixBtn = document.getElementById('btn-global-matrix');
        if (matrixBtn) matrixBtn.onclick = () => matrixHub.toggleWorkspace(true);
        
        const matrixMenuLink = document.getElementById('menu-matrix');
        if (matrixMenuLink) matrixMenuLink.onclick = () => matrixHub.toggleWorkspace(true);

        // Initialize Module Browser
        const moduleBrowser = new ModuleBrowser();
        (window as any).moduleBrowser = moduleBrowser;

        const addModuleMenuLink = document.getElementById('menu-add-module');
        if (addModuleMenuLink) addModuleMenuLink.onclick = () => (window as any).moduleBrowser.open();

        // Bind Matrix Shortcut to Browser
        document.addEventListener('click', (e: any) => {
            if (e.target.closest('#btn-add-module-shortcut')) {
                (window as any).moduleBrowser.open();
                (window as any).patchbayHub.toggleWorkspace(false);
            }
        });

    } catch (e) {
        console.error("[OMEGA] Component init failed:", e);
    }
    
    // 4. Boot App Logic
    console.log("[OMEGA] Calling app.init()...");
    app.init();

    // Global State Forwarding for the Matrix Hub
    window.addEventListener('omega:stateUpdate', (e: any) => {
        if ((window as any).patchbayHub) (window as any).patchbayHub.onStateUpdate(e.detail);
        if ((window as any).modulePatchModal) (window as any).modulePatchModal.onStateUpdate(e.detail);
    });
});
