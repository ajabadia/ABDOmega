/**
 * ModuleMidiTrigger (TypeScript)
 * Interface for triggering notes directly from the WebUI.
 */
export class ModuleMidiTrigger {
    el;
    content;
    descriptor;
    currentNote = 0; // index in ["C", ...]
    currentOctave = 5;
    constructor(el, content, descriptor) {
        this.el = el;
        this.content = content;
        this.descriptor = descriptor;
        this.render();
    }
    async init() {
        this.bind();
    }
    render() {
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const octaves = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        this.content.innerHTML = `
            <div class="midi-trigger-container" style="display: flex; flex-direction: column; height: 100%; padding: 10px; gap: 10px; justify-content: center; align-items: center;">
                <div class="trigger-selectors" style="display: flex; gap: 5px; width: 100%;">
                    <select id="trigger-note" class="pref-select" style="flex: 2;">
                        ${notes.map((n, i) => `<option value="${i}" ${i === this.currentNote ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                    <select id="trigger-octave" class="pref-select" style="flex: 1;">
                        ${octaves.map(o => `<option value="${o}" ${o === this.currentOctave ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>
                </div>
                
                <div class="trigger-main" style="flex: 1; display: flex; justify-content: center; align-items: center; width: 100%;">
                    <div id="big-fire-btn" class="sq juno-white" style="
                        width: 80px; height: 80px; 
                        border-radius: 50%; 
                        display: flex; justify-content: center; align-items: center; 
                        cursor: pointer; 
                        box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                        transition: all 0.1s ease;
                        font-weight: bold;
                        border: 2px solid #00f2ff;
                    ">
                        FIRE
                    </div>
                </div>
            </div>
        `;
    }
    bind() {
        const noteSel = this.content.querySelector('#trigger-note');
        const octSel = this.content.querySelector('#trigger-octave');
        const fireBtn = this.content.querySelector('#big-fire-btn');
        noteSel.onchange = () => this.currentNote = parseInt(noteSel.value);
        octSel.onchange = () => this.currentOctave = parseInt(octSel.value);
        const trigger = (on) => {
            const midiNote = (this.currentOctave + 2) * 12 + this.currentNote;
            const velocity = on ? 127 : 0;
            const status = on ? 0x90 : 0x80;
            // Visual feedback
            if (on) {
                fireBtn.style.backgroundColor = '#00f2ff';
                fireBtn.style.color = '#000';
                fireBtn.style.boxShadow = '0 0 30px #00f2ff';
                fireBtn.style.transform = 'scale(0.95)';
            }
            else {
                fireBtn.style.backgroundColor = '';
                fireBtn.style.color = '';
                fireBtn.style.boxShadow = '0 0 15px rgba(0, 242, 255, 0.2)';
                fireBtn.style.transform = '';
            }
            // @ts-ignore
            if (window.omegaRPC) {
                // @ts-ignore
                window.omegaRPC.sendMidi(status, midiNote, velocity);
            }
        };
        fireBtn.onmousedown = () => trigger(true);
        fireBtn.onmouseup = () => trigger(false);
        fireBtn.onmouseleave = () => trigger(false);
        // Touch support
        fireBtn.ontouchstart = (e) => { e.preventDefault(); trigger(true); };
        fireBtn.ontouchend = (e) => { e.preventDefault(); trigger(false); };
    }
    onStateUpdate(state) { }
    destroy() { }
}
// @ts-ignore
if (typeof window !== 'undefined')
    window.ModuleMidiTrigger = ModuleMidiTrigger;
export default ModuleMidiTrigger;
//# sourceMappingURL=ModuleMidiTrigger.js.map