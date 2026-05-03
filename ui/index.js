/**
 * OMEGA Synthesizer - Main Entry Point (TypeScript)
 * Era 6.1 - Absolute Aseptic Boot
 */
import { OmegaLog } from './omega_log.js';
import { rpc } from './omega_rpc.js';
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
import { InventoryStore } from './InventoryStore.js';
import { RpcCommandDispatcher } from './RpcCommandDispatcher.js';
import { RuntimeStore, GraphStore, SessionStore } from './runtimeStores.js';
import { SchemaStore } from './SchemaStore.js';
import { ModuleRegistry } from './ModuleRegistry.js';
// Bridge to window for legacy component compatibility (limited)
const win = window;
// Global Singleton Initialization
const runtimeStore = win.runtimeStore || new RuntimeStore();
const schemaStore = win.schemaStore || new SchemaStore();
const graphStore = win.graphStore || new GraphStore();
const sessionStore = win.sessionStore || new SessionStore();
const inventoryStore = win.inventoryStore || new InventoryStore();
const rpcCommandDispatcher = win.rpcCommandDispatcher || new RpcCommandDispatcher();
// 1. Ensure stores are anchored in window BEFORE manager instantiation
win.runtimeStore = runtimeStore;
win.schemaStore = schemaStore;
win.graphStore = graphStore;
win.sessionStore = sessionStore;
win.inventoryStore = inventoryStore;
win.rpcCommandDispatcher = rpcCommandDispatcher;
win.omegaRPC = rpc;
win.OmegaLog = OmegaLog;
// 2. Now instantiate manager (Force new instance for Era 7)
const manager = new ModuleManager();
win.moduleManager = manager;
// Component Registry
ModuleRegistry.register("ModuleRenderer", ModuleRenderer);
ModuleRegistry.register("ModuleOscilloscope", ModuleOscilloscope);
ModuleRegistry.register("ModuleMidiTrigger", ModuleMidiTrigger);
ModuleRegistry.register("ModuleMidiViewer", ModuleMidiViewer);
ModuleRegistry.register("ModulePatchbayMatrix", ModulePatchbayMatrix);
ModuleRegistry.register("ModuleMidiToCv", ModuleMidiToCv);
ModuleRegistry.register("ModuleBrowser", ModuleBrowser);
win.Preferences = Preferences;
win.ServiceMode = ServiceMode;
win.ModuleRenderer = ModuleRenderer;
// 4. Global Aseptic Hub - Unified Era 7 Pipeline (CRITICAL: MUST BOOT FIRST)
import { RuntimeEventHub } from './logic/RuntimeEventHub.js';
// Initialize System
document.addEventListener('DOMContentLoaded', () => {
    // [Era 7] Idempotency Shield
    if (window.__omegaBooted) {
        OmegaLog.warn('BOOT', "Bootstrap ABORTED: System already booted.");
        return;
    }
    window.__omegaBooted = true;
    // 1. Start listening to the bridge IMMEDIATELY
    RuntimeEventHub.init();
    // [Diagnostic] Dump window keys related to JUCE/OMEGA
    const juceKeys = Object.keys(window).filter(k => k.toLowerCase().includes("juce") || k.toLowerCase().includes("omega"));
    OmegaLog.debug('DIAG', "Window Bridge Keys:", juceKeys);
    if (window.__JUCE__) {
        const j = window.__JUCE__;
        OmegaLog.debug('DIAG', "__JUCE__ keys:", Object.keys(j));
        if (j.backend)
            OmegaLog.debug('DIAG', "__JUCE__.backend keys:", Object.keys(j.backend));
    }
    if (window.juce)
        OmegaLog.debug('DIAG', "juce found:", Object.keys(window.juce));
    // 2. Immediate Shell Initialization
    const buildId = window.OMEGA_BUILD_ID || "DEV";
    OmegaLog.info('BOOT', `Booting Era 7 Aseptic UI [BUILD #${buildId}]`);
    // Setup Components (Non-blocking)
    try {
        Preferences.init();
        PresetBrowser.init();
        const matrixHub = new ModulePatchbayMatrix();
        win.patchbayHub = matrixHub;
        const configModal = new ModulePatchModal();
        win.modulePatchModal = configModal;
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el)
                el.onclick = fn;
        };
        bind('btn-global-matrix', () => matrixHub.toggleWorkspace(true));
        bind('menu-matrix', () => matrixHub.toggleWorkspace(true));
        const showModal = (id) => {
            const m = document.getElementById(id);
            if (m)
                m.style.display = 'flex';
        };
        bind('menu-about', () => showModal('about-modal'));
        bind('menu-preferences', async () => {
            await Preferences.init();
            showModal('preferences-modal');
        });
        const moduleBrowser = new ModuleBrowser();
        win.moduleBrowser = moduleBrowser;
        document.addEventListener('patch-request', ((e) => {
            const detail = e.detail;
            const { type, instanceId, componentId } = detail;
            if (type === 'add_module') {
                rpcCommandDispatcher.dispatch({
                    type: 'addModule',
                    payload: { componentId }
                });
                return;
            }
            const schema = schemaStore.getSchema(componentId);
            configModal.open(instanceId, schema);
        }));
    }
    catch (e) {
        OmegaLog.error('BOOT', "Component shell init failed:", e);
    }
    // 3. Launch App Logic (Will hide splash after timeout)
    app.init();
    // 4. Background Data Loading (Fires without blocking the UI)
    const backgroundLoad = async () => {
        try {
            OmegaLog.info('BOOT', "Background data load started...");
            // Wait for Handshake
            const ready = await rpc.ensureReady(3000);
            if (!ready) {
                OmegaLog.warn('BOOT', "Handshake delayed. Continuing background load...");
            }
            // Load static registries
            await Promise.all([
                schemaStore.ensureLoaded(),
                inventoryStore.ensureLoaded()
            ]);
            OmegaLog.info('BOOT', "Stores loaded. Bootstrapping Registry...");
            await ModuleRegistry.bootstrap();
            OmegaLog.info('BOOT', "Background initialization COMPLETED.");
            // Force Rack Visibility (Emergency Override)
            const rack = document.getElementById('omega-rack');
            if (rack) {
                rack.style.opacity = '1';
                rack.style.pointerEvents = 'auto';
                rack.style.display = 'flex';
                rack.classList.add('visible');
                OmegaLog.info('BOOT', "Rack visibility forced.");
            }
        }
        catch (e) {
            OmegaLog.error('BOOT', "Background boot failure:", e);
        }
    };
    backgroundLoad();
});
//# sourceMappingURL=index.js.map