add_library(omega_dsp STATIC)

target_sources(omega_dsp
    PRIVATE
        Engines/ISynthesisEngine.h
        Engines/Juno/ChorusPoolJuno.h
        Engines/Juno/FilterPoolJunoIr3109.h
        Engines/Juno/OscillatorPoolJunoDco.h
        Engines/Juno/VirtualAnalogEngine.h
        Engines/JP/JpSuperSawOscillator.h
        Engines/JP/OscillatorPoolJp8080.h
        Engines/JP/FilterPoolJp8080.h
        Engines/Korg/FilterPoolKorg35.h
        Engines/Korg/OscillatorPoolProphecyPluck.h
)

target_include_directories(omega_dsp
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/..
)

target_link_libraries(omega_dsp
    PUBLIC
        juce::juce_dsp
        omega_core
)
