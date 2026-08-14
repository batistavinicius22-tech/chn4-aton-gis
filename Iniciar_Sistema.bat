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

:: Executa o servidor nativo em PowerShell
powershell -ExecutionPolicy Bypass -File server.ps1
