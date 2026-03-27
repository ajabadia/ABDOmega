add_library(omega_dsp STATIC)

target_sources(omega_dsp
    PRIVATE
        Engines/ISynthesisEngine.h
        Engines/Roland/Juno/ChorusPoolJuno.h
        Engines/Roland/Juno/FilterPoolJunoIr3109.h
        Engines/Roland/Juno/OscillatorPoolJunoDco.h
        Engines/Modular/VirtualAnalogEngine.h
        Engines/Roland/JP/JpSuperSawOscillator.h
        Engines/Roland/JP/OscillatorPoolJp8080.h
        Engines/Roland/JP/FilterPoolJp8080.h
        Engines/Korg/MS20/FilterPoolKorg35.h
        Engines/Korg/Prophecy/OscillatorPoolProphecyPluck.h
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
