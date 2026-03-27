/**
 * ModulationVisualizer.js
 * Genera anillos dinámicos sobre los knobs basados en conexiones de modulación.
 */
class ModulationVisualizer {
    constructor() {
        this.mappings = [];
        this.active = true;
        this.knobOverlays = new Map(); // paramId -> Canvas
        
        // Colores para orígenes de modulación
        this.colors = {
            "10": "#00f0ff", // LFO 1 (Cyan)
            "11": "#00ccff", // LFO 2
            "20": "#ff8800", // ENV 1 (Orange)
            "21": "#ffcc00", // ENV 2
            "30": "#cc00ff", // Velocity
            "31": "#ff0088"  // Aftertouch
        };

        this.init();
    }

    async init() {
        console.log("[ModVisualizer] Initializing...");
        await this.refreshMetadata();
        await this.refreshMappings();
        
        // Polling de conexiones (cada 5s o al cambiar preset)
        setInterval(() => this.refreshMappings(), 5000);
        
        this.startAnimation();
    }

    async refreshMetadata() {
        try {
            const metadata = await window.omegaRPC.send("getMetadata");
            if (metadata) {
                this.telemetryMap = {};
                Object.values(metadata).forEach(p => {
                    if (p.telemetryIndex !== undefined && p.telemetryIndex !== -1) {
                        this.telemetryMap[p.telemetryIndex] = p.id;
                    }
                });
                console.log("[ModVisualizer] Metadata mapping built:", Object.keys(this.telemetryMap).length, "signals");
            }
        } catch (e) {
            console.error("[ModVisualizer] Failed to fetch metadata:", e);
        }
    }

    async refreshMappings() {
        try {
            const data = await window.omegaRPC.send("getModConnections");
            if (data && data.mappings) {
                this.mappings = data.mappings;
                console.log("[ModVisualizer] Mappings updated:", this.mappings.length);
            }
        } catch (e) {
            console.error("[ModVisualizer] Failed to fetch mappings:", e);
        }
    }

    /**
     * @brief Crea un canvas transparente sobre el knob.
     */
    ensureOverlay(paramId, podEl) {
        if (this.knobOverlays.has(paramId)) return this.knobOverlays.get(paramId);
        
        const knobContainer = podEl.querySelector('.knob-ring');
        if (!knobContainer) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        canvas.className = 'mod-viz-overlay';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none'; // No interferir con el ratón
        canvas.style.zIndex = '5';
        
        knobContainer.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const overlay = { canvas, ctx, pod: podEl };
        this.knobOverlays.set(paramId, overlay);
        return overlay;
    }

    startAnimation() {
        const frame = () => {
            if (this.active) this.draw();
            requestAnimationFrame(frame);
        };
        frame();
    }

    draw() {
        // Necesitamos acceso a los valores de telemetría actuales
        const latestTelemetry = window.omegaTelemetryCache || {};

        this.mappings.forEach(m => {
            const targetId = this.telemetryMap ? this.telemetryMap[m.target] : null;
            if (!targetId) return;

            const pods = document.querySelectorAll(`[data-param="${targetId}"]`);
            pods.forEach(pod => {
                const overlay = this.ensureOverlay(targetId, pod);
                if (!overlay) return;

                const { ctx, canvas } = overlay;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Obtener valor actual del modulador (0-1)
                const modValue = (latestTelemetry[m.source]?.latest !== undefined) 
                                 ? latestTelemetry[m.source].latest 
                                 : 0.5;

                // Dibujar anillo de modulación
                const center = 50;
                const radius = 38;
                const startAngle = -Math.PI * 0.5;
                const endAngle = startAngle + (modValue * Math.PI * 2);

                ctx.beginPath();
                ctx.arc(center, center, radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(center, center, radius, startAngle, endAngle);
                ctx.strokeStyle = this.colors[m.source] || '#ffffff';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Glow effect
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.colors[m.source] || '#ffffff';
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
        });
    }
}

window.ModulationVisualizer = ModulationVisualizer;
