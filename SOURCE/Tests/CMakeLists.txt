add_executable(omegatests
    TestAceCatalog.cpp
    TestOmegaInput.cpp
    TestAceValidator.cpp
    TestFilterCurveResponse.cpp
    TestJunoDSP.cpp
    TestModulatedFilter.cpp
    TestModulationGraph.cpp
    TestVibratoRoute.cpp
    TestYamlPreset.cpp
    ../Plugin/Midi1InputAdapter.cpp
)

target_link_libraries(omegatests
    PRIVATE
        omega_core
        omega_dsp
        juce::juce_core
        juce::juce_audio_basics
        Catch2::Catch2WithMain
)

target_include_directories(omegatests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../Plugin
)

include(Catch)
catch_discover_tests(omegatests)
