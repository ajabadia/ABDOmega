/**
 * OMEGA Era 7 - Canonical Identifiers (TypeScript)
 * Mirrors PatchIdentifiers.h for full-stack binary compatibility.
 */
export var ModuleTypeId;
(function (ModuleTypeId) {
    ModuleTypeId[ModuleTypeId["None"] = 0] = "None";
    ModuleTypeId[ModuleTypeId["JunoDCO"] = 1] = "JunoDCO";
    ModuleTypeId[ModuleTypeId["JpOscillator"] = 2] = "JpOscillator";
    ModuleTypeId[ModuleTypeId["KorgVCO"] = 3] = "KorgVCO";
    ModuleTypeId[ModuleTypeId["VaOscillator"] = 4] = "VaOscillator";
    ModuleTypeId[ModuleTypeId["JunoFilter"] = 10] = "JunoFilter";
    ModuleTypeId[ModuleTypeId["JpFilter"] = 11] = "JpFilter";
    ModuleTypeId[ModuleTypeId["KorgFilter"] = 12] = "KorgFilter";
    ModuleTypeId[ModuleTypeId["EnvelopeAdsr"] = 20] = "EnvelopeAdsr";
    ModuleTypeId[ModuleTypeId["LfoVA"] = 21] = "LfoVA";
    ModuleTypeId[ModuleTypeId["MasterDelay"] = 100] = "MasterDelay";
    ModuleTypeId[ModuleTypeId["ChorusPool"] = 101] = "ChorusPool";
    ModuleTypeId[ModuleTypeId["SpaceEcho"] = 102] = "SpaceEcho";
})(ModuleTypeId || (ModuleTypeId = {}));
export var ParamId;
(function (ParamId) {
    ParamId[ParamId["None"] = 0] = "None";
    // Oscillators
    ParamId[ParamId["Frequency"] = 1] = "Frequency";
    ParamId[ParamId["Detune"] = 2] = "Detune";
    ParamId[ParamId["PulseWidth"] = 3] = "PulseWidth";
    ParamId[ParamId["PwmAmount"] = 4] = "PwmAmount";
    ParamId[ParamId["SubLevel"] = 5] = "SubLevel";
    ParamId[ParamId["NoiseLevel"] = 6] = "NoiseLevel";
    ParamId[ParamId["SawOn"] = 7] = "SawOn";
    ParamId[ParamId["PulseOn"] = 8] = "PulseOn";
    // Filters
    ParamId[ParamId["Cutoff"] = 50] = "Cutoff";
    ParamId[ParamId["Resonance"] = 51] = "Resonance";
    ParamId[ParamId["Drive"] = 52] = "Drive";
    ParamId[ParamId["KeyTrack"] = 53] = "KeyTrack";
    ParamId[ParamId["EnvDepth"] = 54] = "EnvDepth";
    ParamId[ParamId["LfoDepth"] = 55] = "LfoDepth";
    // Envelopes
    ParamId[ParamId["Attack"] = 100] = "Attack";
    ParamId[ParamId["Decay"] = 101] = "Decay";
    ParamId[ParamId["Sustain"] = 102] = "Sustain";
    ParamId[ParamId["Release"] = 103] = "Release";
    // FX / Global
    ParamId[ParamId["Mix"] = 200] = "Mix";
    ParamId[ParamId["Feedback"] = 201] = "Feedback";
    ParamId[ParamId["Time"] = 202] = "Time";
    ParamId[ParamId["Speed"] = 203] = "Speed";
    ParamId[ParamId["Intensity"] = 204] = "Intensity";
})(ParamId || (ParamId = {}));
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["Audio"] = 0] = "Audio";
    ConnectionType[ConnectionType["CV"] = 1] = "CV";
    ConnectionType[ConnectionType["MIDI"] = 2] = "MIDI";
    ConnectionType[ConnectionType["Modulation"] = 3] = "Modulation";
})(ConnectionType || (ConnectionType = {}));
//# sourceMappingURL=schema_ids.js.map