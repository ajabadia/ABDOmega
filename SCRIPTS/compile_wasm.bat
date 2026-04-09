@echo off
setlocal enabledelayedexpansion

:: OMEGA WASM to AOT Compiler Helper
:: Version 1.0 (VA 2.1.W)

echo [OMEGA] Starting WASM to AOT Compilation...

:: 1. Check for wamrc
where wamrc >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] 'wamrc' (WAMR Compiler) not found in PATH.
    echo Please download it from: https://github.com/bytecodealliance/wasm-micro-runtime/releases
    echo Add the folder containing wamrc.exe to your System PATH.
    pause
    exit /b 1
)

:: 2. Check arguments
if "%~1"=="" (
    echo [USAGE] compile_wasm.bat <input_file.wasm>
    pause
    exit /b 1
)

set INPUT_FILE=%~1
set OUTPUT_FILE=%~n1.aot

echo [OMEGA] Compiling %INPUT_FILE% to %OUTPUT_FILE%...

:: 3. Execute Compilation
:: --target=x86_64: Optimized for standard PC CPUs
:: --format=aot: Ahead-of-Time binary format
wamrc --target=x86_64 --format=aot -o "%OUTPUT_FILE%" "%INPUT_FILE%"

if %ERRORLEVEL% eq 0 (
    echo [SUCCESS] Module compiled successfully: %OUTPUT_FILE%
    echo [INFO] Place this file in Resources/modules/ to use it in OMEGA.
) else (
    echo [FAILED] Compilation failed. Check the WASM file for compatibility.
)

pause
