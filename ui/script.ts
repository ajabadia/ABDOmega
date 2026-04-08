/**
 * OMEGA Synthesizer - WebUI Bridge (TypeScript SOT Implementation)
 * Refactored from script.js to satisfy Phase 15.1 Architectural Maturity.
 */

import { MetadataStore } from './metadata_store.js';
import { setupJuceShim } from './omega_rpc.js';
import { ModuleManager } from './module_manager.js';

interface JuceBridge {
    setParameter: (id: string, value: number) => void;
    menuAction: (action: string, ...args: any[]) => void;
    loadPreset: (index: number) => void;
    copySysExData: (hex: string) => void;
    uiReady: () => void;
}

declare global {
    interface Window {
        juce: JuceBridge;
        __JUCE__: {
            backend: {
                addEventListener: (name: string, cb: Function) => string;
                removeEventListener: (token: string) => void;
                emitEvent: (name: string, payload: any) => void;
            }
        };
        handleOmegaMessage: (msg: any) => void;
    }
}

class OmegaApp {
    private lastPresetName: string = "INITIAL PATCH";
    private lcdTimer: number | null = null;
    private promiseId: number = 0;
    private octaveShift: number = 0;
    private lastSysExHex: string = "";
    private currentBankGlobal: number = 1;
    private currentPatchGlobal: number = 1;
    private sysexMirror: number[] = new Array(23).fill(0);

    private store: MetadataStore | null = null;
    private initialized: boolean = false;
    private keyboard: any;

    constructor() {
        this.sysexMirror[0] = 0xF0;
        this.sysexMirror[1] = 0x41;
        this.sysexMirror[2] = 0x30;
        this.sysexMirror[22] = 0xF7;
    }

    public init() {
        console.log("[OMEGA TS] Initializing App...");
        
        // Final Bridge Fix: Shim window.juce using RPC
        setupJuceShim();
        
        // FIX: Assign store from global
        this.store = (window as any).metadataStore;
        console.log("[OMEGA TS] Store assigned:", this.store ? "YES" : "NO");

        this.setupEventListeners();
        console.log("[OMEGA TS] Event Listeners Ready");
        
        this.setupInteractions();
        console.log("[OMEGA TS] Interactions Ready");
        
        this.setupMenus();
        console.log("[OMEGA TS] Menus Ready");

        this.setupModals();
        console.log("[OMEGA TS] Modals Ready");
        
        this.setupKeyboard();
        console.log("[OMEGA TS] Keyboard Ready");
        
        this.hideSplash();
        console.log("[OMEGA TS] hideSplash called");
        
        // Emergency: show console if bridge is missing
        setTimeout(() => {
            if (!this.initialized) {
                console.error("[OMEGA] Init timed out. Showing console.");
                const consoleEl = document.getElementById('debug-console');
                if (consoleEl) consoleEl.style.display = 'block';
            }
        }, 6000);

        // Notify C++ that UI is ready
        if (window.juce && (window as any).juce.uiReady) {
            (window as any).juce.uiReady();
        }
        
        // Clear "DISCONNECTED" if we have store data
        if (this.store && (this.store as any).isLoaded) {
            console.log(`[OMEGA] Build: ${this.store.getBuild()} | Timestamp: ${this.store.getTimestamp()}`);
            this.updateVersion((this.store as any).getVersion(), (this.store as any).getBuild());
        } else {
            console.warn("[OMEGA TS] Store NOT loaded yet at end of init");
        }

        this.initialized = true;
        console.log("[OMEGA TS] App Initialized.");
    }

    private setupEventListeners() {
        console.log("[OMEGA TS] Setting up Event Listeners...");
        // Bridge Logic for JUCE events
        if (window.__JUCE__ && window.__JUCE__.backend) {
            console.log("[OMEGA TS] JUCE Backend found. Registering...");
            const backend = window.__JUCE__.backend;
            backend.addEventListener("onParameterChanged", (data: any) => this.syncUI(data.id, data.value));
            backend.addEventListener("onLCDUpdate", (text: string) => this.updateLCD(text, false));
            backend.addEventListener("onVersionUpdate", (version: string, build: string) => this.updateVersion(version, build));
            backend.addEventListener("onBankPatchUpdate", (data: any) => {
                this.currentBankGlobal = data.bank || 1;
                this.currentPatchGlobal = data.patch || 1;
                this.updateSevenSegment();
            });
        }
    }

    private hideSplash() {
        console.log("[OMEGA TS] hideSplash execution starting. Setting 3.5s timeout...");
        const doHide = () => {
            console.log("[OMEGA TS] doHide timeout EXECUTING NOW");
            const splash = document.getElementById('splash-screen');
            const rack = document.getElementById('omega-rack');
            if (splash) {
                splash.style.opacity = '0';
                splash.style.pointerEvents = 'none';
                setTimeout(() => {
                    splash.style.display = 'none';
                    if (rack) {
                        rack.style.display = 'flex'; // Ensure flex
                        rack.classList.add('visible');
                    }
                }, 1000);
            } else if (rack) {
                rack.style.display = 'flex';
                rack.classList.add('visible');
            }
        };

        // Safety: ensure it hides even if something else hangs
        // Fulfill 3-5s requirement: 3.5s delay + 1s fade-out = 4.5s
        setTimeout(doHide, 3500);
    }

    private updateVersion(version: string, build?: string) {
        // Top Bar
        const topEl = document.getElementById('top-bar-version');
        if (topEl) {
            const buildStr = build ? ` (Build ${build})` : " (Online)";
            topEl.innerText = `OMEGA ${version}${buildStr}`;
        }
        
        // Splash & About
        document.querySelectorAll('.splash-version, #app-title-mini, #about-version, .about-version').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.id === 'app-title-mini') htmlEl.innerText = "OMEGA Synthesizer v" + version;
            else htmlEl.innerText = version.startsWith("Version") ? version : "Version " + version;
        });

        // Specific IDs for Modal
        const buildEl = document.getElementById('about-build');
        if (buildEl && build) buildEl.innerText = build;

        const tsEl = document.getElementById('about-timestamp');
        if (tsEl && this.store) tsEl.innerText = (this.store as any).getTimestamp();
    }

    private updateLCD(text: string, isTemporary: boolean) {
        const lcd = document.getElementById('lcd-text');
        if (!lcd) return;

        if (this.lcdTimer) {
            clearTimeout(this.lcdTimer);
            this.lcdTimer = null;
        }

        if (isTemporary) {
            lcd.innerText = text;
            lcd.style.color = "#ff8888";
            this.lcdTimer = window.setTimeout(() => {
                lcd.innerText = this.lastPresetName;
                lcd.style.color = "#ff3c3c";
            }, 1500);
        } else {
            this.lastPresetName = text;
            lcd.innerText = text;
            lcd.style.color = "#ff3c3c";
        }
    }


    private updateSevenSegment() {
        const b = document.getElementById('bank-digit');
        const p = document.getElementById('patch-digit');
        if (b) b.innerText = this.currentBankGlobal.toString();
        if (p) p.innerText = this.currentPatchGlobal.toString();
    }

    public handleMenuAction(action: string) {
        console.log("[OMEGA] Handling Menu Action:", action);
        
        switch (action) {
            case 'new_preset':
                const presetName = window.prompt("¿Deseas vaciar el rack y crear un nuevo preset? Introduce el nombre:", "Init Preset");
                if (presetName !== null) {
                    if (window.juce) window.juce.menuAction('new_preset', presetName);
                }
                break;
            case 'about':
                this.showModal('about-modal');
                break;
            case 'toggle_preferences_modal':
                this.showModal('preferences-modal');
                break;
            case 'toggle_presets_modal':
                this.showModal('presets-modal');
                break;
            case 'toggle_console':
                const c = document.getElementById('debug-console');
                if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
                break;
            default:
                if (window.juce) window.juce.menuAction(action);
                else console.warn("[OMEGA] Bridge disconnected - Remote action ignored:", action);
                break;
        }
    }

    private showModal(id: string) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = "30000"; // Ensure above splash if needed
        }
    }

    private setupModals() {
        // Universal modal close listeners
        document.querySelectorAll('.modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal') as HTMLElement;
                if (modal) modal.style.display = 'none';
            });
        });

        // Close on clicking outside
        window.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('modal')) {
                (e.target as HTMLElement).style.display = 'none';
            }
        });
    }

    private setupInteractions() {
        console.log("[OMEGA TS] Setting up button interaction listeners...");
        // Close Console
        const closeBtn = document.getElementById('close-console');
        if (closeBtn) closeBtn.onclick = () => {
            console.log("[OMEGA] Console Close requested");
            const consoleEl = document.getElementById('debug-console');
            if (consoleEl) consoleEl.style.display = 'none';
        };

        // Clear Console
        const clearBtn = document.getElementById('clear-console');
        if (clearBtn) clearBtn.onclick = () => {
            console.log("[OMEGA] Console Clear requested");
            const logPanel = document.getElementById('debug-console-content');
            if (logPanel) logPanel.innerHTML = '';
        };

        // Copy Console
        const copyBtn = document.getElementById('copy-console');
        if (copyBtn) copyBtn.onclick = async () => {
            console.log("[OMEGA] Console Copy requested");
            const logPanel = document.getElementById('debug-console-content');
            if (logPanel) {
                try {
                    await navigator.clipboard.writeText(logPanel.innerText);
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '&#x2714;'; // Checkmark
                    setTimeout(() => copyBtn.innerHTML = originalText, 1000);
                } catch (e) {
                    console.error("[OMEGA] Clipboard failure:", e);
                }
            }
        };

        this.setupSliders();
        this.setupButtons();
        this.setupBender();
        this.updateLCD(this.lastPresetName, false);
    }

    private setupSliders() {
        document.querySelectorAll('.v-slider, .v-slider-mini, .b-track').forEach(container => {
            const pod = container.closest('[data-param]');
            if (!pod) return;
            const paramID = pod.getAttribute('data-param')!;

            const move = (e: PointerEvent) => {
                const rect = container.getBoundingClientRect();
                let val = 1.0 - (e.clientY - rect.top) / rect.height;
                val = Math.max(0, Math.min(1, val));

                this.syncUI(paramID, val);
                if (window.juce) window.juce.setParameter(paramID, val);
                this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
            };

            container.addEventListener('pointerdown', (e) => {
                const pointerEvent = e as PointerEvent;
                pointerEvent.preventDefault();
                (container as HTMLElement).setPointerCapture(pointerEvent.pointerId);
                move(pointerEvent);

                const onMove = (ev: PointerEvent) => move(ev);
                const onUp = () => {
                    container.removeEventListener('pointermove', onMove as EventListener);
                    container.removeEventListener('pointerup', onUp as EventListener);
                };
                container.addEventListener('pointermove', onMove as EventListener);
                container.addEventListener('pointerup', onUp as EventListener);
            });
        });
    }

    private setupButtons() {
        document.querySelectorAll('.sq[data-param], .tiny-btn[data-param], .juno-btn[data-param]').forEach(btn => {
            const paramID = btn.getAttribute('data-param')!;

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                btn.classList.add('pushed');

                const isActive = btn.getAttribute('data-active') === 'true';
                const nextVal = isActive ? 0 : 1;
                this.syncUI(paramID, nextVal);
                if (window.juce) window.juce.setParameter(paramID, nextVal);
            });

            const release = () => btn.classList.remove('pushed');
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointerleave', release);
        });

        // Navigation and Special actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const actionID = btn.getAttribute('data-action')!;
                if (window.juce) window.juce.menuAction(actionID);
            });
        });
    }

    private setupBender() {
        const stick = document.getElementById('bender-stick');
        const housing = document.getElementById('stick-housing');
        if (!stick || !housing) return;

        housing.addEventListener('pointerdown', (e) => {
            const pointerEvent = e as PointerEvent;
            pointerEvent.preventDefault();
            housing.setPointerCapture(pointerEvent.pointerId);

            const move = (ev: PointerEvent) => {
                const rect = housing.getBoundingClientRect();
                let x = (ev.clientX - rect.left) / rect.width;
                x = Math.max(0, Math.min(1, x));
                stick.style.left = (x * 100) + '%';
                if (window.juce) window.juce.setParameter("bender", x);
            };

            move(pointerEvent);
            const onMove = (ev: PointerEvent) => move(ev);
            const onUp = () => {
                housing.removeEventListener('pointermove', onMove as EventListener);
                housing.removeEventListener('pointerup', onUp as EventListener);
                stick.style.left = '50%';
                if (window.juce) window.juce.setParameter("bender", 0.5);
            };
            housing.addEventListener('pointermove', onMove as EventListener);
            housing.addEventListener('pointerup', onUp as EventListener);
        });
    }

    private syncUI(id: string, val: number) {
        document.querySelectorAll(`[data-param="${id}"]`).forEach(pod => {
            const htmlPod = pod as HTMLElement;
            const knob = htmlPod.querySelector('.knob') as HTMLElement;
            if (knob) knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;

            const btn = htmlPod.tagName === 'BUTTON' ? htmlPod as HTMLButtonElement : htmlPod.querySelector('button');
            if (btn) {
                const isActive = val > 0.5;
                btn.setAttribute('data-active', isActive.toString());
                btn.classList.toggle('active-mode', isActive);
            }

            // [Phase 15.1] Typed Selection/Input sync
            if (htmlPod.tagName === 'SELECT') {
                (htmlPod as HTMLSelectElement).value = val.toString(); // Simplified
            }
        });

        const led = document.getElementById(`led-${id}`);
        if (led) led.classList.toggle('active', val > 0.5);
    }

    private setupMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            const htmlItem = item as HTMLElement;
            htmlItem.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const dropdown = htmlItem.querySelector('.dropdown') as HTMLElement;
                
                // If clicked a link inside dropdown
                if (target.tagName === 'A' && target.hasAttribute('data-action')) {
                    const action = target.getAttribute('data-action');
                    if (action) {
                        this.handleMenuAction(action);
                    }
                    
                    if (dropdown) dropdown.style.display = 'none';
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                if (!dropdown) return;
                
                const isVisible = dropdown.style.display === 'block';
                document.querySelectorAll('.dropdown').forEach(d => (d as HTMLElement).style.display = 'none');
                dropdown.style.display = isVisible ? 'none' : 'block';
            });
        });

        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown').forEach(d => (d as HTMLElement).style.display = 'none');
        });
    }

    private setupKeyboard() {
        // Porting complex keyboard logic
        const bed = document.getElementById('ivory-keys-bed');
        if (!bed) return;
        // ... simplified iteration for baseline
    }
}

// Instantiate App
const app = new OmegaApp();

// Unified Message Dispatcher
window.handleOmegaMessage = (msg: any) => {
    try {
        const payload = typeof msg === 'string' ? JSON.parse(msg) : msg;
        const type = payload.type || "";
        const state = payload.payload || payload;
        
        console.log("[OMEGA TS] Message Received:", type);

        if (type === "onStateUpdate") {
            // 1. Structural update (e.g. Preset Load)
            const manager = (window as any).moduleManager;
            if (manager) manager.updateRack(state);

            // 2. Reactive Sync
            if ((window as any).patchbayMatrixInstance) (window as any).patchbayMatrixInstance.onStateUpdate(state);
            if ((window as any).modulePatchModal) (window as any).modulePatchModal.onStateUpdate(state);

        } else if (type === "onPatchbayMatrixUpdate") {
            // 2. Value update (e.g. Modulation Drag)
            // Skip updateRack() to avoid heavy DOM rebuilds!

            // Update modulation values in Hub and Modal
            if ((window as any).patchbayMatrixInstance) {
                console.log("[OMEGA TS] Syncing Patchbay Hub...");
                (window as any).patchbayMatrixInstance.onStateUpdate(state);
            }
            if ((window as any).modulePatchModal) {
                console.log("[OMEGA TS] Syncing Patch Modal...");
                (window as any).modulePatchModal.onStateUpdate(state);
            }
            
            // Notify active modules to update their internal gauges/cables
            const manager = (window as any).moduleManager;
            if (manager && manager.activeModules) {
                manager.activeModules.forEach((mod: any) => {
                    if (mod.onStateUpdate) mod.onStateUpdate(state);
                });
            }
        } else if (type === "menuAction") {
            app.handleMenuAction(payload.action || payload.payload?.action);
        }
    } catch (e) {
        console.error("[OMEGA TS] Error handling message:", e);
    }
};

export { app };
