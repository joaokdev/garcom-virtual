#!/bin/bash
set -e

echo ""
echo " ========================================="
echo "  COMANDA — Plataforma de Restaurantes"
echo " ========================================="
echo ""

# Verifica Node.js
if ! command -v node &> /dev/null; then
  echo "[ERRO] Node.js não encontrado."
  echo "Baixe em: https://nodejs.org (versão 22 ou superior)"
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(parseInt(process.version.slice(1)))")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "[ERRO] Node.js v22 ou superior necessário. Versão atual: $(node --version)"
  exit 1
fi

echo "[1/4] Verificando dependências..."
if [ ! -d "node_modules" ]; then
  echo "      Instalando... (pode demorar na primeira vez)"
  npm install
fi

echo "[2/4] Verificando configuração..."
if [ ! -f ".env" ]; then
  echo "      Copiando .env.example -> .env (ajuste DATABASE_URL se necessário)"
  cp .env.example .env
fi

echo "[3/4] Subindo PostgreSQL local (Docker)..."

# Descobre qual variante do comando "docker compose" está disponível: o
# plugin novo (v2, "docker compose") ou o binário legado ("docker-compose").
# Scripts antigos que só checam "command -v docker" quebram silenciosamente
# em quem só tem o legado instalado — aqui detectamos os dois.
COMPOSE_CMD=""
if command -v docker &> /dev/null; then
  if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
  fi
fi

if [ -n "$COMPOSE_CMD" ]; then
  # Confirma que o daemon do Docker está realmente acessível antes de tentar
  # subir o serviço — evita um erro genérico e confuso mais adiante quando
  # o Docker Desktop está fechado ou o usuário não tem permissão no socket.
  if ! docker info &> /dev/null; then
    echo ""
    echo "      [ERRO] O comando \"docker\" existe, mas o daemon não está acessível."
    echo "      Causas comuns:"
    echo "        • Docker Desktop não está aberto/rodando"
    echo "        • (Linux) seu usuário não está no grupo \"docker\" — rode:"
    echo "          sudo usermod -aG docker \$USER   (depois faça logout/login)"
    echo "        • (WSL2) integração do Docker Desktop com esta distro está desligada"
    echo ""
    echo "      Se preferir não usar Docker agora, aponte DATABASE_URL no .env"
    echo "      para um PostgreSQL já acessível e rode este script de novo."
    exit 1
  fi

  # set -e não pega falha de "docker compose up" isolada de forma clara o
  # suficiente para dar uma mensagem útil (ex.: porta 5432 já em uso) — por
  # isso capturamos a saída e checamos o código de saída manualmente.
  if ! COMPOSE_OUTPUT=$($COMPOSE_CMD up -d db 2>&1); then
    echo ""
    echo "      [ERRO] Falha ao subir o container do PostgreSQL:"
    echo "$COMPOSE_OUTPUT" | sed 's/^/      /'
    echo ""
    if echo "$COMPOSE_OUTPUT" | grep -qi "port is already allocated\|address already in use"; then
      echo "      A porta 5432 já está em uso por outro processo (outro Postgres"
      echo "      local ou outro container). Pare o outro processo, ou edite"
      echo "      docker-compose.yml trocando \"5432:5432\" por, por exemplo,"
      echo "      \"5433:5432\" e ajuste DATABASE_URL no .env para a porta 5433."
    fi
    exit 1
  fi

  # Espera de verdade o Postgres ficar pronto (healthcheck), em vez de um
  # "sleep" fixo — na primeira subida (initdb) ou em máquinas mais lentas
  # (comum em Docker Desktop + WSL2) o banco pode levar bem mais que
  # alguns segundos, e um sleep curto causava falha de conexão logo a seguir.
  echo "      Aguardando o banco ficar pronto (isso pode demorar mais na primeira vez)..."
  READY=0
  for i in $(seq 1 40); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$($COMPOSE_CMD ps -q db)" 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
      READY=1
      break
    fi
    sleep 1.5
  done

  if [ "$READY" -ne 1 ]; then
    echo ""
    echo "      [ERRO] O container do PostgreSQL subiu, mas não ficou saudável a tempo."
    echo "      Últimas linhas do log do container:"
    $COMPOSE_CMD logs --tail=20 db | sed 's/^/      /'
    exit 1
  fi
  echo "      Banco pronto."
else
  echo "      [AVISO] Docker não encontrado — assumindo que DATABASE_URL no .env já aponta para um PostgreSQL acessível."
fi

echo "[4/4] Aplicando schema e dados de demonstração (não apaga restaurantes já cadastrados manualmente)..."
npm run db:setup
npm run db:seed

echo ""
echo " Acesse no navegador:"
echo " ------------------------------------------"
echo "  Página inicial:   http://localhost:3000"
echo "  Hub (novo rest.): http://localhost:3000/hub"
echo " ------------------------------------------"
echo ""
echo " Para encerrar: pressione Ctrl+C"
echo ""

npm run dev
