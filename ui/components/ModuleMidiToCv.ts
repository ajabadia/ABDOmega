/**
 * OMEGA MIDI-to-CV Utility Module (TypeScript)
 * Build #181 - Hardware Design & Multi-Channel Support
 */

export class ModuleMidiToCv {
    private container: HTMLElement;
    private content: HTMLElement;
    private options: any;
    private activityPulse: boolean = false;

    constructor(container: HTMLElement, content: HTMLElement, options: any) {
        this.container = container;
        this.content = content;
        this.options = options;
        
        this.addStyles();
        this.render();
    }

    async init() {
        console.log(`[MCV] Initialized instance: ${this.options.instanceId || 'mcv.1'}`);
    }

    render() {
        if (!this.options.manifest) {
            this.content.innerHTML = `<div style="color:red; font-size:10px;">MISSING MANIFEST</div>`;
            return;
        }

        const hp = this.options.manifest.layout?.hp || 8;
        const width = hp * 18.25; // Standard 1HP = 18.25mm
        this.container.style.width = `${width}px`;
        
        this.content.innerHTML = `
            <div class="aseptic-module-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #050505;">
                <div class="module-header-narrow" style="font-size: 7px; color: #555; padding: 6px 2px; text-align: center; font-family: 'Outfit', sans-serif; letter-spacing: 1px; border-bottom: 1px solid #111;">
                    ${this.options.manifest.name || "OMEGA MODULE"}
                </div>
                <div class="control-cells-stack" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 12px 0; overflow: hidden;">
                    <!-- Dynamic Cells -->
                </div>
            </div>
        `;

        const stack = this.content.querySelector('.control-cells-stack');
        if (!stack) return;

        // Discovery: Front Panel shows entities in MAIN tab or with specific UI roles
        const entities = this.options.manifest.registry || [];
        entities.filter((e: any) => e.presentation?.tab === "MAIN" || (e.presentation?.ui && e.presentation?.tab !== "PATCHING")).forEach((entity: any) => {
            stack.appendChild(this.buildControlCell(entity));
        });
    }

    private buildControlCell(entity: any): HTMLElement {
        const cell = document.createElement('div');
        cell.className = 'control-cell aseptic-cell';
        cell.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%;";

        // 1. Attachment Superior (LED)
        const hasLed = entity.presentation?.ui?.attachments?.some((a: any) => a.type === "led");
        if (hasLed) {
            const led = document.createElement('div');
            led.className = 'mcv-led';
            led.id = `led-${this.options.instanceId}-${entity.id}`;
            led.style.cssText = "width: 7px; height: 7px; background: #212; border-radius: 50%; border: 1px solid #313; transition: all 0.05s;";
            cell.appendChild(led);
        }

        // 2. Primary Component
        const compType = entity.presentation?.ui?.component || "knob";
        const comp = document.createElement('div');
        comp.className = `entity-control-mini control-${compType}`;
        comp.innerHTML = `<div class="knob-mini-placeholder" style="width: 22px; height: 22px; border: 1.5px solid var(--neon-cyan); border-radius: 50%; background: #111; position: relative;">
            <div style="position: absolute; top: 2px; left: 50%; width: 1.5px; height: 6px; background: var(--neon-cyan); transform-origin: bottom center;"></div>
        </div>`;
        cell.appendChild(comp);

        // 3. Label
        const label = document.createElement('div');
        label.className = 'label-tiny';
        label.innerText = entity.label || entity.id.toUpperCase();
        label.style.cssText = "font-size: 6px; color: #777; font-family: 'Inter', sans-serif; text-transform: uppercase;";
        cell.appendChild(label);

        // 4. Value Display (BOTTOM)
        const disp = document.createElement('div');
        disp.className = 'value-display-tiny';
        disp.id = `disp-${this.options.instanceId}-${entity.id}`;
        disp.innerText = entity.range?.default?.toString() || "0";
        disp.style.cssText = "font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--neon-cyan); opacity: 0.8;";
        cell.appendChild(disp);

        return cell;
    }

    onStateUpdate(state: any) {
        if (!state || !this.options.manifest) return;

        const entities = this.options.manifest.registry || [];
        entities.forEach((entity: any) => {
            const paramId = `${this.options.instanceId}.${entity.id}`;
            const val = state.params?.[paramId];

            if (val !== undefined) {
                const disp = this.content.querySelector(`#disp-${this.options.instanceId}-${entity.id}`);
                if (disp) {
                    const precision = entity.presentation?.ui?.ui_precision ?? 2;
                    disp.innerHTML = typeof val === 'number' ? val.toFixed(precision) : val.toString();
                }
            }

            // Semantic Telemetry LED Binding
            const led = this.content.querySelector(`#led-${this.options.instanceId}-${entity.id}`) as HTMLElement;
            if (led) {
                const telemetryKey = `telemetry.${this.options.instanceId}.${entity.id}`;
                const tVal = state.telemetry?.[telemetryKey];
                if (tVal > 0.1) {
                    led.style.background = "var(--neon-purple, #f0f)";
                    led.style.boxShadow = "0 0 4px var(--neon-purple, #f0f)";
                    setTimeout(() => {
                        if (led) {
                            led.style.background = "#212";
                            led.style.boxShadow = "none";
                        }
                    }, 80);
                }
            }
        });
    }

    addStyles() {
        if (document.getElementById('aseptic-module-styles')) return;
        const style = document.createElement('style');
        style.id = 'aseptic-module-styles';
        style.innerHTML = `
            .aseptic-module-container {
                background: linear-gradient(180deg, #111 0%, #050505 100%);
                border-left: 1px solid #222;
                border-right: 1px solid #000;
                box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
            }
            .control-cell.aseptic-cell {
                transition: transform 0.2s ease;
                cursor: pointer;
            }
            .control-cell.aseptic-cell:hover {
                transform: scale(1.05);
            }
            .knob-mini-placeholder {
                box-shadow: 0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1);
            }
            .mcv-led {
                box-shadow: 0 0 2px rgba(0,0,0,0.8);
            }
            .label-tiny {
                letter-spacing: 0.5px;
                font-weight: 500;
            }
            .value-display-tiny {
                background: rgba(0,255,255,0.05);
                padding: 1px 4px;
                border-radius: 2px;
                border: 0.5px solid rgba(0,255,255,0.1);
            }
        `;
        document.head.appendChild(style);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.ModuleMidiToCv = ModuleMidiToCv;
}
