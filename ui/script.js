import { OmegaLog } from './omega_log.js';
import {} from './omega_types.js';
class OmegaApp {
    lastPresetName = "INITIAL PATCH";
    lcdTimer = null;
    initialized = false;
    constructor() {
        OmegaLog.info("APP", "OmegaApp Constructor (Aseptic)");
    }
    async init() {
        OmegaLog.info("APP", "Initializing Aseptic App...");
        this.setupEventListeners();
        this.setupInteractions();
        this.setupMenus();
        this.setupModals();
        this.setupKeyboard();
        this.hideSplash();
        // [Era 6] Unified Dispatch for system readiness
        if (window.rpcCommandDispatcher) {
            await window.rpcCommandDispatcher.dispatch({ type: 'uiReady', payload: {} });
            // [Era 6] Initial Telemetry Subscription (Multi-Tier)
            await window.rpcCommandDispatcher.dispatch({
                type: 'subscribeTelemetry',
                payload: {
                    pins: ['activity', 'system:midi_monitor', 'osc_va:v_out']
                }
            });
        }
        this.initialized = true;
        OmegaLog.info("APP", "App Readiness Achieved.");
    }
    setupEventListeners() {
        // Era 7: Reactive Subscription
        if (window.runtimeStore) {
            window.runtimeStore.subscribe((type) => {
                const snapshot = window.runtimeStore.getSnapshot();
                // 1. System Info Updates (LCD / Version)
                if (type & 8 /* System */) {
                    this.updateLCD(snapshot.systemInfo.lcdText, false);
                    this.updateVersion(snapshot.systemInfo.version, snapshot.systemInfo.build);
                }
                // 2. Telemetry Updates (LEDs)
                if (type & 4 /* Telemetry */) {
                    const payload = snapshot.telemetry;
                    if (payload['activity']) {
                        const active = payload['activity'].v > 0.01;
                        document.querySelectorAll('.led[data-source="activity"]').forEach(led => {
                            led.classList.toggle('active', active);
                        });
                    }
                }
            });
        }
    }
    hideSplash() {
        const doHide = () => {
            const splash = document.getElementById('splash-screen');
            const rack = document.getElementById('omega-rack');
            if (splash) {
                splash.style.opacity = '0';
                splash.style.pointerEvents = 'none';
                setTimeout(() => {
                    splash.style.display = 'none';
                    if (rack) {
                        rack.style.display = 'flex';
                        rack.style.opacity = '1';
                        rack.style.pointerEvents = 'auto';
                        rack.classList.add('visible');
                    }
                }, 1000);
            }
        };
        setTimeout(doHide, 3500);
    }
    updateVersion(version, build, timestamp) {
        const topEl = document.getElementById('top-bar-version');
        if (topEl) {
            topEl.textContent = `OMEGA Era 7.2.3 [Build ${build || 'SYS_READY'}]`;
        }
        document.querySelectorAll('.splash-version, #app-title-mini, #about-version, .about-version').forEach(el => {
            const htmlEl = el;
            htmlEl.textContent = version;
        });
        const buildEl = document.getElementById('about-build');
        if (buildEl)
            buildEl.textContent = build || '0';
        const tsEl = document.getElementById('about-timestamp');
        if (tsEl)
            tsEl.textContent = timestamp || '';
    }
    updateLCD(text, isTemporary) {
        const lcd = document.getElementById('lcd-text');
        if (!lcd)
            return;
        if (this.lcdTimer)
            clearTimeout(this.lcdTimer);
        if (isTemporary) {
            lcd.textContent = text;
            lcd.style.color = "#ff8888";
            this.lcdTimer = window.setTimeout(() => {
                lcd.textContent = this.lastPresetName;
                lcd.style.color = "#ff3c3c";
            }, 1500);
        }
        else {
            this.lastPresetName = text;
            lcd.textContent = text;
            lcd.style.color = "#ff3c3c";
        }
    }
    handleMenuAction(action) {
        switch (action) {
            case 'clear_rack':
                if (window.confirm("WARNING: This will clear the entire modular rack. Are you sure?")) {
                    window.rpcCommandDispatcher.dispatch({
                        type: 'newPreset',
                        payload: {}
                    });
                }
                break;
            case 'new_preset':
                const presetName = window.prompt("New Preset Name:", "Init Preset");
                if (presetName !== null) {
                    window.rpcCommandDispatcher.dispatch({
                        type: 'newPreset',
                        payload: {} // Payload shape can be expanded if backend supports name
                    });
                }
                break;
            case 'exit':
                window.rpcCommandDispatcher.dispatch({ type: 'exit', payload: {} });
                break;
            case 'toggle_preferences_modal':
                this.showModal('preferences-modal');
                if (window.Preferences)
                    window.Preferences.init();
                break;
            case 'toggle_presets_modal':
                this.showModal('presets-modal');
                break;
            case 'toggle_console':
                const c = document.getElementById('debug-console');
                if (c)
                    c.style.display = c.style.display === 'none' ? 'block' : 'none';
                break;
            case 'toggle_matrix':
                if (window.patchbayHub) {
                    window.patchbayHub.toggleWorkspace(true);
                }
                else {
                    this.showModal('modulation-modal');
                }
                break;
            case 'toggle_module_browser':
                if (window.moduleBrowser) {
                    window.moduleBrowser.open();
                }
                else {
                    this.showModal('module-browser-modal');
                }
                break;
            case 'about':
                // [Era 6.1] Request Metadata before showing About
                if (window.rpcCommandDispatcher) {
                    window.rpcCommandDispatcher.dispatch({ type: 'getMetadata', payload: {} }).then((res) => {
                        if (res)
                            this.updateVersion(res.version, res.build, res.timestamp);
                    });
                }
                this.showModal('about-modal');
                break;
            case 'save_preset':
                window.rpcCommandDispatcher.dispatch({ type: 'savePreset', payload: {} });
                break;
            case 'undo':
            case 'redo':
                window.rpcCommandDispatcher.dispatch({ type: 'systemAction', payload: { action } });
                break;
            default:
                window.rpcCommandDispatcher.dispatch({ type: 'systemAction', payload: { target: action } });
                break;
        }
    }
    showModal(id) {
        const modal = document.getElementById(id);
        if (modal)
            modal.style.display = 'flex';
    }
    setupModals() {
        document.querySelectorAll('.modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal)
                    modal.style.display = 'none';
            });
        });
    }
    setupInteractions() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el)
                el.onclick = fn;
        };
        bind('close-console', () => {
            const el = document.getElementById('debug-console');
            if (el)
                el.style.display = 'none';
        });
        bind('clear-console', () => {
            const el = document.getElementById('debug-console-content');
            if (el)
                el.innerHTML = '';
        });
        bind('toggle-telemetry', () => {
            if (window.OmegaLog)
                window.OmegaLog.toggleTelemetry();
        });
        bind('copy-console', () => {
            const el = document.getElementById('debug-console-content');
            if (!el)
                return;
            const text = el.innerText;
            // Fallback Clipboard Strategy (Aseptic)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                const btn = document.getElementById('copy-console');
                if (btn) {
                    btn.innerText = successful ? 'OK!' : 'ERR';
                    setTimeout(() => { if (btn)
                        btn.innerText = 'C'; }, 1000);
                }
            }
            catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        });
        this.setupSliders();
        this.setupButtons();
        this.setupBender();
    }
    setupSliders() {
        document.querySelectorAll('.v-slider, .v-slider-mini, .b-track').forEach(container => {
            const pod = container.closest('[data-param]');
            if (!pod)
                return;
            const paramID = pod.getAttribute('data-param');
            const move = (e) => {
                const rect = container.getBoundingClientRect();
                let val = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
                window.rpcCommandDispatcher.dispatch({
                    type: 'setParameter',
                    payload: { target: paramID, value: val }
                });
                this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
            };
            container.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                container.setPointerCapture(e.pointerId);
                move(e);
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
                const isActive = btn.getAttribute('data-active') === 'true';
                window.rpcCommandDispatcher.dispatch({
                    type: 'setParameter',
                    payload: { target: paramID, value: isActive ? 0 : 1 }
                });
            });
        });
        // [Era 6.1] Absolute Event Delegation for Dropdown Actions
        document.querySelectorAll('.dropdown a[data-action]').forEach(btn => {
            const action = btn.getAttribute('data-action');
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                OmegaLog.info("MENU", `Triggering action: ${action}`);
                this.handleMenuAction(action);
                // Hide all dropdowns after action
                document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
            };
        });
    }
    setupBender() {
        const stick = document.getElementById('bender-stick');
        const housing = document.getElementById('stick-housing');
        if (!stick || !housing)
            return;
        housing.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            housing.setPointerCapture(e.pointerId);
            const move = (ev) => {
                const rect = housing.getBoundingClientRect();
                let x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                stick.style.left = (x * 100) + '%';
                window.rpcCommandDispatcher.dispatch({
                    type: 'setParameter',
                    payload: { target: 'bender', value: x }
                });
            };
            const onUp = () => {
                housing.removeEventListener('pointermove', move);
                housing.removeEventListener('pointerup', onUp);
                stick.style.left = '50%';
                window.rpcCommandDispatcher.dispatch({
                    type: 'setParameter',
                    payload: { target: 'bender', value: 0.5 }
                });
            };
            housing.addEventListener('pointermove', move);
            housing.addEventListener('pointerup', onUp);
        });
    }
    setupMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            const htmlItem = item;
            htmlItem.addEventListener('click', (e) => {
                const target = e.target;
                const dropdown = htmlItem.querySelector('.dropdown');
                if (target.tagName === 'A' && target.hasAttribute('data-action')) {
                    this.handleMenuAction(target.getAttribute('data-action'));
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
    }
    setupKeyboard() {
        // [Era 6] Keyboard is now handled via dedicated ModuleMidiTrigger or External MIDI.
    }
}
export const app = new OmegaApp();
//# sourceMappingURL=script.js.map