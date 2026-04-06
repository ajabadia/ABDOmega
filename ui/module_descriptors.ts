/**
 * OMEGA Module Descriptors (TypeScript)
 * Declarative layouts for modular components.
 */

import type { ModuleDescriptor } from './module_renderer.js';

export const ModuleDescriptors: Record<string, ModuleDescriptor> = {
    // Juno DCO (OSC-VA-001)
    "OSC-VA-001": {
        id: "juno-dco",
        title: "JUNO DCO",
        panelClass: "juno-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.osc.saw.on",     control: "toggle",   label: "SAW",   row: 0, col: 0, variant: "juno-red" },
            { paramId: "layer.a.osc.pulse.on",   control: "toggle",   label: "PULSE", row: 0, col: 1, variant: "juno-red" },
            { paramId: "layer.a.osc.sub.level",  control: "slider-v", label: "SUB",   row: 1, col: 0 },
            { paramId: "layer.a.osc.noise.level",control: "slider-v", label: "NOISE", row: 1, col: 1 },
            { paramId: "layer.a.osc.lfo.depth",   control: "knob",     label: "LFO",   row: 2, col: 0 },
            { paramId: "layer.a.osc.pwm.amount",  control: "slider-v", label: "PWM",   row: 2, col: 1 }
        ],
        footer: { label: "DIGITALLY CONTROLLED OSC" }
    },


    // Juno VCF (FLT-VA-001)
    "FLT-VA-001": {
        id: "juno-vcf",
        title: "IR3109 VCF",
        panelClass: "juno-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "layer.a.cutoff",       control: "knob",     label: "FREQ",  row: 0, col: 0 },
            { paramId: "layer.a.resonance",    control: "knob",     label: "RES",   row: 0, col: 1 },
            { paramId: "layer.a.vcf.keytrack",  control: "knob",     label: "KEY",   row: 0, col: 2 },
            { paramId: "layer.a.vcf.env.depth", control: "knob",     label: "ENV",   row: 1, col: 0 },
            { paramId: "layer.a.vcf.lfo.depth", control: "knob",     label: "LFO",   row: 1, col: 1 },
            { paramId: "layer.a.vcf.env.inv",   control: "toggle",   label: "POL",   row: 1, col: 2, variant: "juno-orange" },
            { paramId: "layer.a.hpf.pos",       control: "select",   label: "HPF",   row: 2, col: 0, colSpan: 3 }
        ],
        footer: { label: "ANALOG LOW PASS FILTER" }
    },


    // Space Echo (FX-DL-002)
    "FX-DL-002": {
        id: "space-echo",
        title: "SPACE ECHO",
        panelClass: "space-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.fx.space.speed",     control: "knob",     label: "RATE",  row: 0, col: 0 },
            { paramId: "layer.a.fx.space.intensity", control: "knob",     label: "INTEN", row: 0, col: 1 },
            { paramId: "layer.a.fx.space.echo.vol",   control: "knob",     label: "ECHO",  row: 1, col: 0 },
            { paramId: "layer.a.fx.space.rev.vol", control: "knob",     label: "REV",   row: 1, col: 1 },
            { paramId: "layer.a.fx.space.mode",      control: "select",   label: "MODE",  row: 2, col: 0, colSpan: 2 },
            { paramId: "layer.a.fx.space.wow",       control: "knob",     label: "WOW",   row: 3, col: 0 },
            { paramId: "layer.a.fx.space.drive",     control: "knob",     label: "DRIVE", row: 3, col: 1 }
        ],
        footer: {
            paramId: "layer.a.fx.space.enable",
            label: "RE-201 TAPE ECHO"
        }
    },

    // Master Delay
    "FX-DL-001": {
        id: "master-delay",
        title: "MASTER DELAY",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "global.delay.time",     control: "knob",     label: "TIME",  row: 0, col: 0 },
            { paramId: "global.delay.feedback", control: "knob",     label: "FDBK",  row: 0, col: 1 },
            { paramId: "global.delay.mix",      control: "slider-v", label: "MIX",   row: 1, col: 0, colSpan: 2 }
        ],
        footer: {
            paramId: "global.delay.enable",
            label: "DIGITAL FX CORE"
        }
    },

    // Universal ADSR (EG-STANDARD-001 / ENV-ADSR-GEN)
    "EG-STANDARD-001": {
        id: "adsr",
        title: "EG-ADSR",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.env.attack",  control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "layer.a.env.decay",   control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },

    "ENV-ADSR-GEN": {
        id: "adsr",
        title: "EG-ADSR",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.env.attack",  control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "layer.a.env.decay",   control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },

    // Universal VCA (VCA-STANDARD-001)
    "VCA-STANDARD-001": {
        id: "vca",
        title: "AMP-VCA",
        panelClass: "universal-panel",
        grid: { columns: 1, gap: 12 },
        items: [
            { paramId: "layer.a.vca.gain", control: "slider-v", label: "GAIN", row: 0, col: 0 },
            { paramId: "layer.a.vca.mode", control: "toggle",   label: "GATE", row: 1, col: 0 }
        ],
        footer: { label: "AMPLIFIER" }
    },

    // Universal LFO (LFO-STANDARD-001)
    "LFO-STANDARD-001": {
        id: "lfo",
        title: "LFO-MOD",
        panelClass: "universal-panel",
        grid: { columns: 1, gap: 12 },
        items: [
            { paramId: "layer.a.lfo.rate", control: "knob", label: "RATE", row: 0, col: 0 },
            { paramId: "layer.a.lfo.wave", control: "select", label: "WAVE", row: 1, col: 0 }
        ],
        footer: { label: "MODULATOR" }
    },

    // Korg/Prophecy Oscillator (OSC-KORG-P)
    "OSC-KORG-P": {
        id: "korg-osc",
        title: "KORG DCO",
        panelClass: "korg-prophecy-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.osc.saw.on", control: "toggle", label: "SAW", row: 0, col: 0 },
            { paramId: "layer.a.osc.pulse.on", control: "toggle", label: "PULSE", row: 0, col: 1 }
        ],
        footer: { label: "MOSS ENGINE" }
    },

    // Korg MS-20 Filter (FLT-VA-003)
    "FLT-VA-003": {
        id: "korg-vcf",
        title: "KORG-35 VCF",
        panelClass: "korg-ms20-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "layer.a.cutoff",     control: "knob", label: "LPF", row: 0, col: 0 },
            { paramId: "layer.a.korg.hpf.cutoff",  control: "knob", label: "HPF", row: 0, col: 1 },
            { paramId: "layer.a.korg.grit",       control: "knob", label: "DRIVE", row: 0, col: 2 }
        ],
        footer: { label: "VCF (ANALOG)" }
    },

    // JP Supersaw (OSC-VA-004)
    "OSC-VA-004": {
        id: "jp-supersaw",
        title: "JP SUPERSAW",
        panelClass: "jp-panel",
        grid: { columns: 3, gap: 12 },
        items: [
            { paramId: "layer.a.jp.detune",    control: "knob", label: "DETUNE", row: 0, col: 0 },
            { paramId: "layer.a.jp.spread",    control: "knob", label: "SPREAD", row: 0, col: 1 },
            { paramId: "layer.a.drift",        control: "knob", label: "DRIFT",  row: 0, col: 2 }
        ],
        footer: { label: "ROLAND SUPERSAW" }
    },

    // Juno Chorus (FX-CH-001)
    "FX-CH-001": {
        id: "juno-chorus",
        title: "JUNO CHORUS",
        panelClass: "juno-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "global.chorus.mode", control: "select", label: "MODE", row: 0, col: 0 },
            { paramId: "global.chorus.mix",  control: "knob",   label: "MIX",  row: 0, col: 1 }
        ],
        footer: { label: "BBD EFFECT" }
    },

    // --- Semantic Generics for Build #158 (Aseptic Upgrade) ---
    "lfo": {
        id: "lfo",
        title: "LFO-MOD",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.lfo.rate", control: "knob", label: "RATE", row: 0, col: 0 },
            { paramId: "layer.a.lfo.wave", control: "select", label: "WAVE", row: 0, col: 1 }
        ],
        footer: { label: "MODULATOR" }
    },

    "eg": {
        id: "adsr",
        title: "EG-ADSR",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.env.attack",  control: "knob", label: "A", row: 0, col: 0 },
            { paramId: "layer.a.env.decay",   control: "knob", label: "D", row: 0, col: 1 },
            { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
            { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
        ],
        footer: { label: "ENV GENERATOR" }
    },

    "filter": {
        id: "vcf",
        title: "VCF-CORE",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.cutoff",    control: "knob", label: "FREQ", row: 0, col: 0 },
            { paramId: "layer.a.resonance", control: "knob", label: "RES",  row: 0, col: 1 }
        ],
        footer: { label: "FILTER" }
    },

    "osc": {
        id: "osc",
        title: "OSC-CORE",
        panelClass: "universal-panel",
        grid: { columns: 2, gap: 12 },
        items: [
            { paramId: "layer.a.osc.saw.on",   control: "toggle", label: "SAW",   row: 0, col: 0 },
            { paramId: "layer.a.osc.pulse.on", control: "toggle", label: "PULSE", row: 0, col: 1 }
        ],
        footer: { label: "OSCILLATOR" }
    },

    "amp": {
        id: "vca",
        title: "AMP-VCA",
        panelClass: "universal-panel",
        grid: { columns: 1, gap: 12 },
        items: [
            { paramId: "layer.a.vca.gain", control: "slider-v", label: "GAIN", row: 0, col: 0 }
        ],
        footer: { label: "AMPLIFIER" }
    },

    "matrix": {
        id: "mod-matrix",
        title: "MOD MATRIX",
        panelClass: "matrix-panel",
        grid: { columns: 1, gap: 0 },
        items: [
            { paramId: "global.matrix.active", control: "knob", label: "ROUTES", row: 0, col: 0 }
        ],
        footer: { label: "MODULATION HUB" }
    },

    "trig": {
        id: "trig",
        title: "MIDI TRIGGER",
        panelClass: "utility-panel",
        grid: { columns: 1, gap: 0 },
        items: [
            { paramId: "global.midi.trig", control: "knob", label: "GATE", row: 0, col: 0 }
        ],
        footer: { label: "MIDI INPUT" }
    },

    "mon": {
        id: "mon",
        title: "MIDI MONITOR",
        panelClass: "utility-panel",
        grid: { columns: 1, gap: 0 },
        items: [
            { paramId: "global.midi.mon", control: "telemetry", label: "TRAFFIC", row: 0, col: 0 }
        ],
        footer: { label: "RE-TIME ANALYZER" }
    },

    "osci": {
        id: "osci",
        title: "OSCILLOSCOPE",
        panelClass: "utility-panel",
        grid: { columns: 1, gap: 0 },
        items: [
            { paramId: "global.scope", control: "telemetry", label: "WAVE", row: 0, col: 0 }
        ],
        footer: { label: "GLOBAL WAVE" }
    }
};

// Global instance for runtime compatibility
// @ts-ignore
window.ModuleDescriptors = ModuleDescriptors;
