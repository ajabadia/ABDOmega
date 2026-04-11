/**
 * OMEGA Synthesizer - WebUI Bridge (TypeScript SOT Implementation)
 * Refactored from script.js to satisfy Phase 15.1 Architectural Maturity.
 */
import { MetadataStore } from './metadata_store.js';
import { setupJuceShim } from './omega_rpc.js';
import { ModuleManager } from './module_manager.js';
import { OmegaLog } from './omega_log.js';
class OmegaApp {
    lastPresetName = "INITIAL PATCH";
    lcdTimer = null;
    promiseId = 0;
    octaveShift = 0;
    lastSysExHex = "";
    currentBankGlobal = 1;
    currentPatchGlobal = 1;
    sysexMirror = new Array(23).fill(0);
    store = null;
    initialized = false;
    keyboard;
    constructor() {
        this.sysexMirror[0] = 0xF0;
        this.sysexMirror[1] = 0x41;
        this.sysexMirror[2] = 0x30;
        this.sysexMirror[22] = 0xF7;
    }
    init() {
        OmegaLog.info("OMEGA TS", "Initializing App...");
        // Final Bridge Fix: Shim window.juce using RPC
        setupJuceShim();
        // FIX: Assign store from global
        this.store = window.metadataStore;
        OmegaLog.info("OMEGA TS", "Store assigned: " + (this.store ? "YES" : "NO"));
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
        OmegaLog.info("OMEGA TS", "hideSplash called");
        // Emergency: show console if bridge is missing
        setTimeout(() => {
            if (!this.initialized) {
                OmegaLog.error("OMEGA", "Init timed out. Showing console.");
                const consoleEl = document.getElementById('debug-console');
                if (consoleEl)
                    consoleEl.style.display = 'block';
            }
        }, 6000);
        // Notify C++ that UI is ready
        if (window.juce && window.juce.uiReady) {
            window.juce.uiReady();
        }
        // Clear "DISCONNECTED" if we have store data
        if (this.store && this.store.isLoaded) {
            const build = this.store.getBuild();
            const ts = this.store.getTimestamp();
            const version = this.store.getVersion();
            // Inject version banner as first line in the DOM console panel
            const logPanel = document.getElementById('debug-console-content');
            if (logPanel) {
                const banner = document.createElement('div');
                banner.style.cssText = 'color:#00e5ff;font-weight:bold;font-size:1.05em;padding:2px 0 4px;border-bottom:1px solid #1a3a3a;margin-bottom:4px;';
                banner.textContent = `OMEGA v${version} · Build ${build} · ${ts}`;
                logPanel.prepend(banner);
            }
            OmegaLog.info("OMEGA", `v${version} · Build ${build} · ${ts}`);
            this.updateVersion(version, build);
        }
        else {
            OmegaLog.warn("OMEGA TS", "Store NOT loaded yet at end of init");
        }
        // Preload ACE catalog so ModuleManager can resolve descriptors from boot,
        // even if the user never opens the ModuleBrowser.
        if (window.omegaRPC) {
            window.omegaRPC.send("listCatalog", {}).then((resp) => {
                if (resp && resp.components) {
                    window.omegaCatalog = Object.fromEntries(resp.components.map((c) => [c.id, c]));
                    OmegaLog.info("OMEGA", `ACE Catalog preloaded: ${resp.components.length} components`);
                }
            }).catch(() => { });
        }
        this.initialized = true;
        OmegaLog.info("OMEGA TS", "App Initialized.");
    }
    setupEventListeners() {
        OmegaLog.info("OMEGA TS", "Setting up Event Listeners...");
        // Bridge Logic for JUCE events
        if (window.__JUCE__ && window.__JUCE__.backend) {
            OmegaLog.info("OMEGA TS", "JUCE Backend found. Registering...");
            const backend = window.__JUCE__.backend;
            backend.addEventListener("onParameterChanged", (data) => this.syncUI(data.id, data.value));
            backend.addEventListener("onLCDUpdate", (text) => this.updateLCD(text, false));
            backend.addEventListener("onVersionUpdate", (version, build) => this.updateVersion(version, build));
            backend.addEventListener("onBankPatchUpdate", (data) => {
                this.currentBankGlobal = data.bank || 1;
                this.currentPatchGlobal = data.patch || 1;
                this.updateSevenSegment();
            });
        }
    }
    hideSplash() {
        OmegaLog.info("OMEGA TS", "hideSplash execution starting. Setting 3.5s timeout...");
        const doHide = () => {
            OmegaLog.info("OMEGA TS", "doHide timeout EXECUTING NOW");
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
            }
            else if (rack) {
                rack.style.display = 'flex';
                rack.classList.add('visible');
            }
        };
        // Safety: ensure it hides even if something else hangs
        // Fulfill 3-5s requirement: 3.5s delay + 1s fade-out = 4.5s
        setTimeout(doHide, 3500);
    }
    updateVersion(version, build) {
        // Top Bar
        const topEl = document.getElementById('top-bar-version');
        if (topEl) {
            const buildStr = build ? ` (Build ${build})` : " (Online)";
            topEl.innerText = `OMEGA ${version}${buildStr}`;
        }
        // Splash & About
        document.querySelectorAll('.splash-version, #app-title-mini, #about-version, .about-version').forEach(el => {
            const htmlEl = el;
            if (htmlEl.id === 'app-title-mini')
                htmlEl.innerText = "OMEGA Synthesizer v" + version;
            else
                htmlEl.innerText = version.startsWith("Version") ? version : "Version " + version;
        });
        // Specific IDs for Modal
        const buildEl = document.getElementById('about-build');
        if (buildEl && build)
            buildEl.innerText = build;
        const tsEl = document.getElementById('about-timestamp');
        if (tsEl && this.store)
            tsEl.innerText = this.store.getTimestamp();
    }
    updateLCD(text, isTemporary) {
        const lcd = document.getElementById('lcd-text');
        if (!lcd)
            return;
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
        }
        else {
            this.lastPresetName = text;
            lcd.innerText = text;
            lcd.style.color = "#ff3c3c";
        }
    }
    updateSevenSegment() {
        const b = document.getElementById('bank-digit');
        const p = document.getElementById('patch-digit');
        if (b)
            b.innerText = this.currentBankGlobal.toString();
        if (p)
            p.innerText = this.currentPatchGlobal.toString();
    }
    handleMenuAction(action) {
        OmegaLog.info("OMEGA", "Handling Menu Action: " + action);
        switch (action) {
            case 'clear_rack':
                if (window.confirm("WARNING: This will clear the entire modular rack. Are you sure?")) {
                    if (window.juce)
                        window.juce.menuAction('new_preset', 'Empty Slate Preset');
                }
                break;
            case 'new_preset':
                const presetName = window.prompt("¿Deseas vaciar el rack y crear un nuevo preset? Introduce el nombre:", "Init Preset");
                if (presetName !== null) {
                    if (window.juce)
                        window.juce.menuAction('new_preset', presetName);
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
                if (c)
                    c.style.display = c.style.display === 'none' ? 'block' : 'none';
                break;
            default:
                if (window.juce)
                    window.juce.menuAction(action);
                else
                    OmegaLog.warn("OMEGA", "Bridge disconnected - Remote action ignored: " + action);
                break;
        }
    }
    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = "30000"; // Ensure above splash if needed
        }
    }
    setupModals() {
        // Universal modal close listeners
        document.querySelectorAll('.modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal)
                    modal.style.display = 'none';
            });
        });
        // Close on clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }
    setupInteractions() {
        OmegaLog.info("OMEGA TS", "Setting up button interaction listeners...");
        // Close Console
        const closeBtn = document.getElementById('close-console');
        if (closeBtn)
            closeBtn.onclick = () => {
                OmegaLog.info("OMEGA", "Console Close requested");
                const consoleEl = document.getElementById('debug-console');
                if (consoleEl)
                    consoleEl.style.display = 'none';
            };
        // Clear Console
        const clearBtn = document.getElementById('clear-console');
        if (clearBtn)
            clearBtn.onclick = () => {
                OmegaLog.info("OMEGA", "Console Clear requested");
                const logPanel = document.getElementById('debug-console-content');
                if (logPanel)
                    logPanel.innerHTML = '';
            };
        // Copy Console
        const copyBtn = document.getElementById('copy-console');
        if (copyBtn)
            copyBtn.onclick = async () => {
                OmegaLog.info("OMEGA", "Console Copy requested");
                const logPanel = document.getElementById('debug-console-content');
                if (logPanel) {
                    try {
                        await navigator.clipboard.writeText(logPanel.innerText);
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '&#x2714;'; // Checkmark
                        setTimeout(() => copyBtn.innerHTML = originalText, 1000);
                    }
                    catch (e) {
                        OmegaLog.error("OMEGA", "Clipboard failure", e);
                    }
                }
            };
        this.setupSliders();
        this.setupButtons();
        this.setupBender();
        this.updateLCD(this.lastPresetName, false);
    }
    setupSliders() {
        document.querySelectorAll('.v-slider, .v-slider-mini, .b-track').forEach(container => {
            const pod = container.closest('[data-param]');
            if (!pod)
                return;
            const paramID = pod.getAttribute('data-param');
            const move = (e) => {
                const rect = container.getBoundingClientRect();
                let val = 1.0 - (e.clientY - rect.top) / rect.height;
                val = Math.max(0, Math.min(1, val));
                this.syncUI(paramID, val);
                if (window.juce)
                    window.juce.setParameter(paramID, val);
                this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
            };
            container.addEventListener('pointerdown', (e) => {
                const pointerEvent = e;
                pointerEvent.preventDefault();
                container.setPointerCapture(pointerEvent.pointerId);
                move(pointerEvent);
                const onMove = (ev) => move(ev);
                const onUp = () => {
                    container.removeEventListener('pointermove', onMove);
                    container.removeEventListener('pointerup', onUp);
                };
                container.addEventListener('pointermove', onMove);
                container.addEventListener('pointerup', onUp);
            });
        });
    }
    setupButtons() {
        document.querySelectorAll('.sq[data-param], .tiny-btn[data-param], .juno-btn[data-param]').forEach(btn => {
            const paramID = btn.getAttribute('data-param');
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                btn.classList.add('pushed');
                const isActive = btn.getAttribute('data-active') === 'true';
                const nextVal = isActive ? 0 : 1;
                this.syncUI(paramID, nextVal);
                if (window.juce)
                    window.juce.setParameter(paramID, nextVal);
            });
            const release = () => btn.classList.remove('pushed');
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointerleave', release);
        });
        // Navigation and Special actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const actionID = btn.getAttribute('data-action');
                if (window.juce)
                    window.juce.menuAction(actionID);
            });
        });
    }
    setupBender() {
        const stick = document.getElementById('bender-stick');
        const housing = document.getElementById('stick-housing');
        if (!stick || !housing)
            return;
        housing.addEventListener('pointerdown', (e) => {
            const pointerEvent = e;
            pointerEvent.preventDefault();
            housing.setPointerCapture(pointerEvent.pointerId);
            const move = (ev) => {
                const rect = housing.getBoundingClientRect();
                let x = (ev.clientX - rect.left) / rect.width;
                x = Math.max(0, Math.min(1, x));
                stick.style.left = (x * 100) + '%';
                if (window.juce)
                    window.juce.setParameter("bender", x);
            };
            move(pointerEvent);
            const onMove = (ev) => move(ev);
            const onUp = () => {
                housing.removeEventListener('pointermove', onMove);
                housing.removeEventListener('pointerup', onUp);
                stick.style.left = '50%';
                if (window.juce)
                    window.juce.setParameter("bender", 0.5);
            };
            housing.addEventListener('pointermove', onMove);
            housing.addEventListener('pointerup', onUp);
        });
    }
    syncUI(id, val) {
        document.querySelectorAll(`[data-param="${id}"]`).forEach(pod => {
            const htmlPod = pod;
            const knob = htmlPod.querySelector('.knob');
            if (knob)
                knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;
            const btn = htmlPod.tagName === 'BUTTON' ? htmlPod : htmlPod.querySelector('button');
            if (btn) {
                const isActive = val > 0.5;
                btn.setAttribute('data-active', isActive.toString());
                btn.classList.toggle('active-mode', isActive);
            }
            // [Phase 15.1] Typed Selection/Input sync
            if (htmlPod.tagName === 'SELECT') {
                htmlPod.value = val.toString(); // Simplified
            }
        });
        const led = document.getElementById(`led-${id}`);
        if (led)
            led.classList.toggle('active', val > 0.5);
    }
    setupMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            const htmlItem = item;
            htmlItem.addEventListener('click', (e) => {
                const target = e.target;
                const dropdown = htmlItem.querySelector('.dropdown');
                // If clicked a link inside dropdown
                if (target.tagName === 'A' && target.hasAttribute('data-action')) {
                    const action = target.getAttribute('data-action');
                    if (action) {
                        this.handleMenuAction(action);
                    }
                    if (dropdown)
                        dropdown.style.display = 'none';
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                if (!dropdown)
                    return;
                const isVisible = dropdown.style.display === 'block';
                document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
                dropdown.style.display = isVisible ? 'none' : 'block';
            });
        });
        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
        });
    }
    setupKeyboard() {
        // Porting complex keyboard logic
        const bed = document.getElementById('ivory-keys-bed');
        if (!bed)
            return;
        // ... simplified iteration for baseline
    }
}
// Instantiate App
const app = new OmegaApp();
// Unified Message Dispatcher
window.handleOmegaMessage = (msg) => {
    try {
        const payload = typeof msg === 'string' ? JSON.parse(msg) : msg;
        const type = payload.type || "";
        const state = payload.payload || payload;
        OmegaLog.debug("OMEGA TS", "Message Received: " + type);
        if (type === "onStateUpdate") {
            // 1. Structural update (e.g. Preset Load)
            const manager = window.moduleManager;
            if (manager)
                manager.updateRack(state);
            // 2. Reactive Sync
            if (window.patchbayHub)
                window.patchbayHub.onStateUpdate(state);
            if (window.modulePatchModal)
                window.modulePatchModal.onStateUpdate(state);
        }
        else if (type === "onPatchbayMatrixUpdate") {
            // 2. Value update (e.g. Modulation Drag)
            // Skip updateRack() to avoid heavy DOM rebuilds!
            // Update modulation values in Hub and Modal
            if (window.patchbayHub) {
                OmegaLog.debug("OMEGA TS", "Syncing Patchbay Hub...");
                window.patchbayHub.onStateUpdate(state);
            }
            if (window.modulePatchModal) {
                OmegaLog.debug("OMEGA TS", "Syncing Patch Modal...");
                window.modulePatchModal.onStateUpdate(state);
            }
            // Notify active modules to update their internal gauges/cables
            const manager = window.moduleManager;
            if (manager && manager.activeModules) {
                manager.activeModules.forEach((mod) => {
                    if (mod.onStateUpdate)
                        mod.onStateUpdate(state);
                });
            }
        }
        else if (type === "menuAction") {
            app.handleMenuAction(payload.action || payload.payload?.action);
        }
    }
    catch (e) {
        OmegaLog.error("OMEGA TS", "Error handling message", e);
    }
};
export { app };
//# sourceMappingURL=script.js.map