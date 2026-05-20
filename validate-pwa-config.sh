#!/bin/bash
# Checklist de Verificação - Configuração PWA Windows
# Script para validar se todas as alterações foram aplicadas corretamente

echo "🔍 Iniciando verificação de configuração PWA..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_count=0
pass_count=0

# Função para checar se arquivo existe
check_file() {
  local file=$1
  local desc=$2
  check_count=$((check_count + 1))
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} [$check_count] $desc"
    echo "   📁 $file"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}❌${NC} [$check_count] $desc"
    echo "   📁 $file (NÃO ENCONTRADO)"
  fi
  echo ""
}

# Função para checar conteúdo em arquivo
check_content() {
  local file=$1
  local content=$2
  local desc=$3
  check_count=$((check_count + 1))
  
  if grep -q "$content" "$file" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} [$check_count] $desc"
    echo "   📄 Encontrado em: $file"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}❌${NC} [$check_count] $desc"
    echo "   📄 Não encontrado em: $file"
  fi
  echo ""
}

echo "═══════════════════════════════════════════════════════════"
echo "1️⃣  VERIFICANDO ARQUIVOS CRIADOS/MODIFICADOS"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_file "vite.config.ts" "Arquivo vite.config.ts modificado"
check_file "index.html" "Arquivo index.html com meta tags"
check_file "public/browserconfig.xml" "Arquivo browserconfig.xml criado"
check_file "docs/PWA_CONFIGURATION.md" "Documentação PWA criada"
check_file "docs/pwa-validation-script.js" "Script de validação criado"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2️⃣  VERIFICANDO CONTEÚDO DO MANIFEST (vite.config.ts)"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_content "vite.config.ts" 'display: "standalone"' "Display set to standalone"
check_content "vite.config.ts" 'display_override' "Display override chain configurada"
check_content "vite.config.ts" 'start_url: "/"' "Start URL set to root"
check_content "vite.config.ts" 'scope: "/"' "Scope set to root"
check_content "vite.config.ts" 'theme_color: "#1D7373"' "Theme color definida"
check_content "vite.config.ts" 'background_color: "#042326"' "Background color definida"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3️⃣  VERIFICANDO ÍCONES"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_file "public/icon-192.png" "Ícone 192x192 disponível"
check_file "public/icon-512.png" "Ícone 512x512 disponível"
check_file "public/favicon.png" "Favicon disponível"
check_file "public/og-image.png" "OG Image disponível"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4️⃣  VERIFICANDO META TAGS (index.html)"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_content "index.html" 'msapplication-TileColor' "Meta tag msapplication-TileColor"
check_content "index.html" 'application-name' "Meta tag application-name"
check_content "index.html" 'msapplication-config' "Meta tag msapplication-config"
check_content "index.html" 'msapplication-navbutton-color' "Meta tag msapplication-navbutton"
check_content "index.html" 'apple-mobile-web-app-capable' "Meta tag apple PWA"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5️⃣  VERIFICANDO browserconfig.xml"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_content "public/browserconfig.xml" 'TileColor' "TileColor no browserconfig"
check_content "public/browserconfig.xml" 'square150x150logo' "Tile 150x150 configurado"
check_content "public/browserconfig.xml" 'square310x310logo' "Tile 310x310 configurado"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 RESULTADO FINAL"
echo "═══════════════════════════════════════════════════════════"
echo ""

percentage=$((pass_count * 100 / check_count))
echo -e "Verificações Passadas: ${GREEN}$pass_count/$check_count${NC} ($percentage%)"
echo ""

if [ $pass_count -eq $check_count ]; then
  echo -e "${GREEN}✨ TODAS AS VERIFICAÇÕES PASSARAM!${NC}"
  echo "A configuração PWA para Windows está pronta!"
else
  echo -e "${YELLOW}⚠️  ALGUMAS VERIFICAÇÕES FALHARAM${NC}"
  echo "Por favor, revise os itens listados acima"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📚 PRÓXIMOS PASSOS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Fazer build do projeto:"
echo "   $ npm run build"
echo ""
echo "2. Deploy em HTTPS"
echo ""
echo "3. Testar no Microsoft Edge:"
echo "   - Abra a URL"
echo "   - Clique no ícone de instalação"
echo "   - Confirme a instalação"
echo ""
echo "4. Validar a configuração (se tiver Chrome DevTools):"
echo "   - Cole o script de validação no console"
echo "   - Verifique os resultados"
echo ""
echo "Documentação completa em: docs/PWA_CONFIGURATION.md"
echo "═══════════════════════════════════════════════════════════"
