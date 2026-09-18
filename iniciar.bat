@echo off
setlocal enabledelayedexpansion
title Comanda — Servidor Local
color 0A

echo.
echo  =========================================
echo   COMANDA — Plataforma de Restaurantes
echo  =========================================
echo.

:: Verifica Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo Baixe em: https://nodejs.org  ^(versao 22 ou superior^)
    pause
    exit /b 1
)

:: Verifica versao minima do Node (v22)
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODERAW=%%i
for /f "tokens=1 delims=." %%i in ("%NODERAW%") do set NODEMAJOR=%%i
if %NODEMAJOR% lss 22 (
    echo [ERRO] Node.js v22 ou superior necessario.
    echo Versao atual: %NODERAW%
    pause
    exit /b 1
)

echo [1/4] Verificando dependencias...
if not exist "node_modules\" (
    echo       Instalando... ^(pode demorar na primeira vez^)
    call npm install
)

echo [2/4] Verificando configuracao...
if not exist ".env" (
    echo       Copiando .env.example para .env ^(ajuste DATABASE_URL se necessario^)
    copy .env.example .env >nul
)

echo [3/4] Subindo PostgreSQL local ^(Docker^)...

set COMPOSE_CMD=
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose version >nul 2>&1
    if !errorlevel! equ 0 (
        set COMPOSE_CMD=docker compose
    ) else (
        where docker-compose >nul 2>&1
        if !errorlevel! equ 0 set COMPOSE_CMD=docker-compose
    )
)

if not "%COMPOSE_CMD%"=="" (
    docker info >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo       [ERRO] O comando "docker" existe, mas o Docker Desktop nao esta rodando.
        echo       Abra o Docker Desktop, espere ele terminar de iniciar, e rode este
        echo       script de novo. Se preferir nao usar Docker agora, aponte
        echo       DATABASE_URL no .env para um PostgreSQL ja acessivel.
        echo.
        pause
        exit /b 1
    )

    %COMPOSE_CMD% up -d db
    if !errorlevel! neq 0 (
        echo.
        echo       [ERRO] Falha ao subir o container do PostgreSQL.
        echo       Causa comum: porta 5432 ja esta em uso por outro Postgres local
        echo       ou outro container. Pare o outro processo, ou edite
        echo       docker-compose.yml trocando "5432:5432" por "5433:5432" e
        echo       ajuste DATABASE_URL no .env para a porta 5433.
        echo.
        pause
        exit /b 1
    )

    echo       Aguardando o banco ficar pronto ^(pode demorar mais na primeira vez^)...
    for /f "delims=" %%c in ('%COMPOSE_CMD% ps -q db') do set DB_CID=%%c
    set READY=0
    for /l %%i in (1,1,40) do (
        if "!READY!"=="0" (
            for /f "delims=" %%s in ('docker inspect --format="{{.State.Health.Status}}" !DB_CID! 2^>nul') do set HSTATUS=%%s
            if "!HSTATUS!"=="healthy" (
                set READY=1
            ) else (
                timeout /t 2 /nobreak >nul
            )
        )
    )

    if "!READY!"=="0" (
        echo.
        echo       [ERRO] O container do PostgreSQL subiu, mas nao ficou saudavel a tempo.
        echo       Veja os logs com: %COMPOSE_CMD% logs db
        echo.
        pause
        exit /b 1
    )
    echo       Banco pronto.
) else (
    echo       [AVISO] Docker nao encontrado — assumindo que DATABASE_URL no .env ja aponta para um PostgreSQL acessivel.
)

echo [4/4] Aplicando schema e dados de demonstracao...
call npm run db:setup
call npm run db:seed

echo [OK] Iniciando servidor...
echo.
echo  Acesse no navegador:
echo  ------------------------------------------
echo   Pagina inicial:   http://localhost:3000
echo   Hub ^(novo rest.^): http://localhost:3000/hub
echo  ------------------------------------------
echo.
echo  Para encerrar: pressione Ctrl+C
echo.

call npm run dev
pause
