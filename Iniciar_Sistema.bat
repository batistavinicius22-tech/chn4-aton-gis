@echo off
title CHN-4 | Sistema de Gestao de Auxilios a Navegacao (AtoN)
cls
echo =========================================================================
echo   CENTRO DE HIDROGRAFIA DO NORTE (CHN-4 / 4o DN) - MARINHA DO BRASIL
echo   Sistema de Gestao de Auxilios a Navegacao (AtoN)
echo =========================================================================
echo.
echo Iniciando o servidor de banco de dados e interoperabilidade...
echo O navegador sera aberto automaticamente em instantes...
echo.

:: Abre o navegador padrao no endereco do sistema
start http://localhost:3000

:: Executa preferencialmente com Node.js (mais rapido) ou PowerShell nativo
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Iniciando com motor Node.js...
    node server.js
) else (
    echo Iniciando com motor PowerShell...
    powershell -ExecutionPolicy Bypass -File server.ps1
)
