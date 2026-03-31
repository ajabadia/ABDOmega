/**
 * OMEGA MIDI Trigger Module
 * Allows triggering notes from the UI.
 */
class ModuleMidiTrigger {
    constructor(el, content) {
        this.el = el;
        this.content = content;
        this.active = true;
        
        this.notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        this.selectedNote = 0; // C
        this.selectedOctave = 4;
        
        this.init();
    }

    init() {
        this.content.className += ' trigger-controls';
        this.content.innerHTML = `
            <div class="control-group">
                <label>NOTE</label>
                <select class="note-select">
                    ${this.notes.map((n, i) => `<option value="${i}">${n}</option>`).join('')}
                </select>
            </div>
            <div class="control-group">
                <label>OCT</label>
                <select class="octave-select">
                    ${[0,1,2,3,4,5,6,7,8].map(o => `<option value="${o}" ${o===4 ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
            </div>
            <button class="trigger-btn">PUSH</button>
            <div class="osc-footer">
                <span>V-REMOTE #01</span>
            </div>
        `;
        
        // Listeners
        const noteSel = this.content.querySelector('.note-select');
        const octSel = this.content.querySelector('.octave-select');
        const btn = this.content.querySelector('.trigger-btn');
        
        noteSel.onchange = (e) => this.selectedNote = parseInt(e.target.value);
        octSel.onchange = (e) => this.selectedOctave = parseInt(e.target.value);
        
        // Trigger Note On/Off
        btn.onmousedown = () => this.sendMidi(true);
        btn.onmouseup = () => this.sendMidi(false);
        btn.onmouseleave = () => { if (this.isPressed) this.sendMidi(false); };
        
        // Touch support
        btn.ontouchstart = (e) => { e.preventDefault(); this.sendMidi(true); };
        btn.ontouchend = (e) => { e.preventDefault(); this.sendMidi(false); };
    }

    sendMidi(isOn) {
        this.isPressed = isOn;
        const midiNote = (this.selectedOctave + 1) * 12 + this.selectedNote;
        const velocity = isOn ? 100 : 0;
        
        console.log(`[MidiTrigger] Sending Note ${midiNote} (${isOn ? 'ON' : 'OFF'})`);
        
        if (window.omegaRPC) {
            window.omegaRPC.send("triggerNote", {
                note: midiNote,
                velocity: velocity,
                on: isOn
            });
        }
        
        const btn = this.el.querySelector('.trigger-btn');
        if (isOn) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}

window.ModuleMidiTrigger = ModuleMidiTrigger;
