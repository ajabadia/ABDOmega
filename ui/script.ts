import { OmegaLog } from './omega_log.js';
import { type UiCommand } from './omega_types.js';

class OmegaApp {
    private lastPresetName: string = "INITIAL PATCH";
    private lcdTimer: number | null = null;
    private initialized: boolean = false;

    constructor() {
        OmegaLog.info("APP", "OmegaApp Constructor (Aseptic)");
    }

    public async init() {
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

    private setupEventListeners() {
        // Era 7: Reactive Subscription
        if ((window as any).runtimeStore) {
            (window as any).runtimeStore.subscribe((type: any) => {
                const snapshot = (window as any).runtimeStore.getSnapshot();
                
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

    private hideSplash() {
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

    private updateVersion(version: string, build?: string, timestamp?: string) {
        const topEl = document.getElementById('top-bar-version');
        if (topEl) {
            topEl.textContent = `OMEGA Era 6 [Build ${build || 'ASEPTIC'}]`;
        }
        
        document.querySelectorAll('.splash-version, #app-title-mini, #about-version, .about-version').forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.textContent = version;
        });

        const buildEl = document.getElementById('about-build');
        if (buildEl) buildEl.textContent = build || '0';

        const tsEl = document.getElementById('about-timestamp');
        if (tsEl) tsEl.textContent = timestamp || '';
    }

    private updateLCD(text: string, isTemporary: boolean) {
        const lcd = document.getElementById('lcd-text');
        if (!lcd) return;

        if (this.lcdTimer) clearTimeout(this.lcdTimer);

        if (isTemporary) {
            lcd.textContent = text;
            lcd.style.color = "#ff8888";
            this.lcdTimer = window.setTimeout(() => {
                lcd.textContent = this.lastPresetName;
                lcd.style.color = "#ff3c3c";
            }, 1500);
        } else {
            this.lastPresetName = text;
            lcd.textContent = text;
            lcd.style.color = "#ff3c3c";
        }
    }

    public handleMenuAction(action: string) {
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
                if ((window as any).Preferences) (window as any).Preferences.init();
                break;
            case 'toggle_presets_modal':
                this.showModal('presets-modal');
                break;
            case 'toggle_console':
                const c = document.getElementById('debug-console');
                if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
                break;
            case 'toggle_matrix':
                this.showModal('modulation-modal');
                break;
            case 'toggle_module_browser':
                if ((window as any).moduleBrowser) {
                    (window as any).moduleBrowser.open();
                } else {
                    this.showModal('module-browser-modal');
                }
                break;
            case 'about':
                // [Era 6.1] Request Metadata before showing About
                if (window.rpcCommandDispatcher) {
                    window.rpcCommandDispatcher.dispatch({ type: 'getMetadata', payload: {} }).then((res: any) => {
                        if (res) this.updateVersion(res.version, res.build, res.timestamp);
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

    private showModal(id: string) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    }

    private setupModals() {
        document.querySelectorAll('.modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal') as HTMLElement;
                if (modal) modal.style.display = 'none';
            });
        });
    }

    private setupInteractions() {
        const bind = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        bind('close-console', () => {
            const el = document.getElementById('debug-console');
            if (el) el.style.display = 'none';
        });

        bind('clear-console', () => {
            const el = document.getElementById('debug-console-content');
            if (el) el.innerHTML = '';
        });

        bind('toggle-telemetry', () => {
            if ((window as any).OmegaLog) (window as any).OmegaLog.toggleTelemetry();
        });

        bind('copy-console', () => {
            const el = document.getElementById('debug-console-content');
            if (!el) return;
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
                    setTimeout(() => { if (btn) btn.innerText = 'C'; }, 1000);
                }
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            
            document.body.removeChild(textArea);
        });

        this.setupSliders();
        this.setupButtons();
        this.setupBender();
    }

    private setupSliders() {
        document.querySelectorAll('.v-slider, .v-slider-mini, .b-track').forEach(container => {
            const pod = container.closest('[data-param]');
            if (!pod) return;
            const paramID = pod.getAttribute('data-param')!;

            const move = (e: PointerEvent) => {
                const rect = container.getBoundingClientRect();
                let val = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
                window.rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: paramID, value: val } 
                } as any);
                this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
            };

            container.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                (container as HTMLElement).setPointerCapture((e as PointerEvent).pointerId);
                move(e as PointerEvent);
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
                const isActive = btn.getAttribute('data-active') === 'true';
                window.rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: paramID, value: isActive ? 0 : 1 } 
                } as any);
            });
        });

        // [Era 6.1] Absolute Event Delegation for Dropdown Actions
        document.querySelectorAll('.dropdown a[data-action]').forEach(btn => {
            const action = btn.getAttribute('data-action')!;
            (btn as HTMLElement).onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                OmegaLog.info("MENU", `Triggering action: ${action}`);
                this.handleMenuAction(action);
                // Hide all dropdowns after action
                document.querySelectorAll('.dropdown').forEach(d => (d as HTMLElement).style.display = 'none');
            };
        });
    }

    private setupBender() {
        const stick = document.getElementById('bender-stick');
        const housing = document.getElementById('stick-housing');
        if (!stick || !housing) return;

        housing.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            housing.setPointerCapture(e.pointerId);

            const move = (ev: PointerEvent) => {
                const rect = housing.getBoundingClientRect();
                let x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                stick.style.left = (x * 100) + '%';
                window.rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: 'bender', value: x } 
                } as any);
            };

            const onUp = () => {
                housing.removeEventListener('pointermove', move as EventListener);
                housing.removeEventListener('pointerup', onUp as EventListener);
                stick.style.left = '50%';
                window.rpcCommandDispatcher.dispatch({ 
                    type: 'setParameter', 
                    payload: { target: 'bender', value: 0.5 } 
                } as any);
            };
            housing.addEventListener('pointermove', move as EventListener);
            housing.addEventListener('pointerup', onUp as EventListener);
        });
    }

    private setupMenus() {
        document.querySelectorAll('.menu-item').forEach(item => {
            const htmlItem = item as HTMLElement;

            // [Era 6.1] Support for direct-action menu items without dropdowns
            if (htmlItem.id === 'btn-global-matrix') {
                htmlItem.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleMenuAction('toggle_matrix');
                };
                return;
            }

            htmlItem.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const dropdown = htmlItem.querySelector('.dropdown') as HTMLElement;
                
                if (target.tagName === 'A' && target.hasAttribute('data-action')) {
                    this.handleMenuAction(target.getAttribute('data-action')!);
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
    }

    private setupKeyboard() {
        // [Era 6] Keyboard is now handled via dedicated ModuleMidiTrigger or External MIDI.
    }
}

export const app = new OmegaApp();
