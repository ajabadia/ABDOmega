/**
 * OMEGA Synthesizer - Main Entry Point (TypeScript)
 * Era 6.1 - Absolute Aseptic Boot
 */

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
import { RuntimeStore, SchemaStore, GraphStore, SessionStore } from './runtimeStores.js';

// Global Singleton Initialization
const runtimeStore = new RuntimeStore();
const schemaStore = new SchemaStore();
const graphStore = new GraphStore();
const sessionStore = new SessionStore();
const inventoryStore = new InventoryStore();
const rpcCommandDispatcher = new RpcCommandDispatcher();

// Internal Management
const manager = new ModuleManager();

// Bridge to window for legacy component compatibility (limited)
const win = window as any;
win.runtimeStore = runtimeStore;
win.schemaStore = schemaStore;
win.graphStore = graphStore;
win.sessionStore = sessionStore;
win.inventoryStore = inventoryStore;
win.rpcCommandDispatcher = rpcCommandDispatcher;
win.moduleManager = manager;
win.omegaRPC = rpc;

// Component Registry
win.Preferences = Preferences;
win.ServiceMode = ServiceMode;
win.ModuleRenderer = ModuleRenderer;
win.ModuleOscilloscope = ModuleOscilloscope;
win.ModuleMidiTrigger = ModuleMidiTrigger;
win.ModuleMidiViewer = ModuleMidiViewer;
win.ModulePatchbayMatrix = ModulePatchbayMatrix;
win.ModuleMidiToCv = ModuleMidiToCv;
win.ModuleBrowser = ModuleBrowser;

// Initialize System
    document.addEventListener('DOMContentLoaded', async () => {
    console.log("[OMEGA] Booting Era 6.1 Aseptic UI...");
    
    // [Era 6.1] Aseptic Bootstrap Delay
    // Wait 1.5s for JUCE to inject native functions and the bridge to stabilize
    await new Promise(r => setTimeout(r, 1500));

    // 1. Load Authoritative Stores (Schema & Inventory)
    try {
        await Promise.all([
            schemaStore.ensureLoaded(),
            inventoryStore.ensureLoaded()
        ]);
    } catch (e) {
        console.error("[OMEGA] Store initialization failed:", e);
    }
    
    // 2. Component Initialization
    try {
        await Preferences.init();
        await PresetBrowser.init();
        
        // Global Patchbay Hub (Internal listener)
        const matrixHub = new ModulePatchbayMatrix();
        win.patchbayHub = matrixHub;

        // Unified Module Config Modal
        const configModal = new ModulePatchModal();
        win.modulePatchModal = configModal;

        // 3. Global Menu Actions
        const bind = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        bind('btn-global-matrix', () => matrixHub.toggleWorkspace(true));
        bind('menu-matrix', () => matrixHub.toggleWorkspace(true));

        // [Phase 1] System Modals
        const showModal = (id: string) => {
            const m = document.getElementById(id);
            if (m) m.style.display = 'flex';
        };

        bind('menu-about', () => showModal('about-modal'));
        bind('menu-preferences', async () => {
             await Preferences.init();
             showModal('preferences-modal');
        });

        if (win.moduleBrowser) {
            bind('menu-add-module', () => win.moduleBrowser.open());
        }

        // 4. Component Event Hub
        document.addEventListener('patch-request', ((e: Event) => {
            const detail = (e as CustomEvent).detail;
            const { instanceId, componentId } = detail;
            const schema = schemaStore.getSchemaForComponent(componentId);
            configModal.open(instanceId, schema);
        }) as EventListener);

    } catch (e) {
        console.error("[OMEGA] Boot failure during component init:", e);
    }
    
    // 5. App Launch
    app.init();

    // 6. Global Aseptic Hub - Centralized Store Routing
    const handleAsepticEvent = (e: CustomEvent) => {
        const type = e.type.replace('omega:', '');
        runtimeStore.reduceEvent({ type, ...e.detail });
        
        // Notify reactive components if they don't use direct subscription yet
        if (win.patchbayHub?.updateSync) win.patchbayHub.updateSync();
        if (win.modulePatchModal?.updateSync) win.modulePatchModal.updateSync();
    };

    window.addEventListener('omega:onStateUpdate', handleAsepticEvent as EventListener);
    window.addEventListener('omega:PARAMCHANGE', handleAsepticEvent as EventListener);
    window.addEventListener('omega:telemetryUpdate', handleAsepticEvent as EventListener);
});
