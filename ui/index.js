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
import { ModuleModMatrix } from './components/ModuleModMatrix.js';
// Global instances for legacy bridge compatibility
window.omegaRPC = rpc;
window.metadataStore = new MetadataStore();
window.moduleManager = new ModuleManager();
window.Preferences = Preferences;
window.ServiceMode = ServiceMode;
window.ModuleRenderer = ModuleRenderer;
window.ModuleOscilloscope = ModuleOscilloscope;
window.ModuleMidiTrigger = ModuleMidiTrigger;
window.ModuleMidiViewer = ModuleMidiViewer;
window.ModuleModMatrix = ModuleModMatrix;
// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[OMEGA] Booting Synth UI...");
    // 1. Setup RPC Bridge
    setupJuceShim();
    // 2. Load Metadata
    const store = window.metadataStore;
    if (store) {
        try {
            console.log("[OMEGA] Loading Metadata...");
            await Promise.race([
                store.ensureLoaded(),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
        }
        catch (e) {
            console.error("[OMEGA] Metadata load failed, continuing:", e);
        }
    }
    // 3. Initialize Components
    console.log("[OMEGA] Initializing Components...");
    try {
        await Preferences.init();
        await PresetBrowser.init();
    }
    catch (e) {
        console.error("[OMEGA] Component init failed:", e);
    }
    // 4. Boot App Logic
    console.log("[OMEGA] Calling app.init()...");
    app.init();
});
//# sourceMappingURL=index.js.map