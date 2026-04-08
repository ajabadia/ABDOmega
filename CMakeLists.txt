cmake_minimum_required(VERSION 3.25.0)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

project(OMEGA VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force static linking for dependencies
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build static libraries" FORCE)

include(FetchContent)

# yaml-cpp
FetchContent_Declare(
    yaml-cpp
    GIT_REPOSITORY https://github.com/jbeder/yaml-cpp.git
    GIT_TAG 0.8.0
)

FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.4.0
)

# WAMR (WebAssembly Micro Runtime)
FetchContent_Declare(
    wamr
    GIT_REPOSITORY https://github.com/bytecodealliance/wasm-micro-runtime.git
    GIT_TAG WAMR-1.3.0
)

# WAMR Build Config (Standardized Phase 28.H)
set(WAMR_BUILD_INTERP 1)
set(WAMR_BUILD_AOT 0)
set(WAMR_BUILD_JIT 0)
set(WAMR_BUILD_LIBC_BUILTIN 1)
set(WAMR_BUILD_FAST_INTERP 1)
set(WAMR_BUILD_MULTI_MODULE 1)
set(WAMR_BUILD_TARGET "X86_64")
set(WAMR_BUILD_PLATFORM "windows")

# Global linkage macros to prevent DLL import/export issues (The "Pattern" Fix)
add_compile_definitions(WASM_RUNTIME_API_EXTERN=)
add_compile_definitions(COMPILING_WASM_RUNTIME_API=1)

FetchContent_MakeAvailable(yaml-cpp Catch2 wamr)


# WAMR Runtime Library Integration
set(WAMR_ROOT_DIR ${wamr_SOURCE_DIR})
include(${wamr_SOURCE_DIR}/build-scripts/runtime_lib.cmake)
add_library(vmlib ${WAMR_RUNTIME_LIB_SOURCE})
target_include_directories(vmlib PUBLIC 
    ${wamr_SOURCE_DIR}/core/iwasm/include
    ${wamr_SOURCE_DIR}/core/shared/utils
)


add_subdirectory(JUCE _juce)
include_directories(JUCE/modules)

# Módulos OMEGA
add_subdirectory(src/Core)
add_subdirectory(src/Engine)
add_subdirectory(src/DSP)
add_subdirectory(src/Plugin)

# Tests
include(CTest)
enable_testing()
add_subdirectory(src/Tests)
