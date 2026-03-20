juce_add_plugin(omega_plugin
    COMPANY_NAME "ABD-IA"
    BUNDLE_ID    "com.abd-ia.omega"
    IS_SYNTH     TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE ABDI
    PLUGIN_CODE Ome1
    FORMATS Standalone
    PRODUCT_NAME "OMEGA Synth"
)

target_sources(omega_plugin
    PRIVATE
        OmegaAudioProcessor.cpp
        OmegaAudioProcessor.h
        Midi1InputAdapter.cpp
        Midi1InputAdapter.h
)

target_link_libraries(omega_plugin
    PRIVATE
        juce::juce_audio_utils
        omega_core
        omega_dsp
)
