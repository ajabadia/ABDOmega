/**
 * OMEGA Emergency Module
 * Component used when no modules are found in the rack.
 */
export class ModuleEmergency {
    constructor(element, content, options) {
        this.element = element;
        this.content = content;
        this.options = options;
        
        this.element.classList.add('module-emergency');
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="emergency-container">
                <div class="emergency-icon">⚠️</div>
                <div class="emergency-title">EMPTY RACK</div>
                <div class="emergency-msg">Load a preset or add modules from the Browser.</div>
                <div class="emergency-status">RECOVERY MODE ACTIVE</div>
            </div>
        `;
    }

    onStateUpdate(state) {
        // No-op for emergency module
    }
}

// @ts-ignore
window.ModuleEmergency = ModuleEmergency;
export default ModuleEmergency;
