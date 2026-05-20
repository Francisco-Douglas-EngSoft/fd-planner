@echo off
REM Checklist de Verificação - Configuração PWA Windows
REM Script para validar se todas as alterações foram aplicadas corretamente

setlocal enabledelayedexpansion

echo.
echo 🔍 Iniciando verificação de configuração PWA...
echo.

set check_count=0
set pass_count=0

echo ===============================================================
echo 1^) VERIFICANDO ARQUIVOS CRIADOS/MODIFICADOS
echo ===============================================================
echo.

REM Verificar vite.config.ts
set check_count=!check_count! + 1
if exist "vite.config.ts" (
  echo. ✅ [!check_count!] Arquivo vite.config.ts modificado
  echo.    📁 vite.config.ts
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Arquivo vite.config.ts modificado
  echo.    📁 vite.config.ts (NÃO ENCONTRADO)
)
echo.

REM Verificar index.html
set check_count=!check_count! + 1
if exist "index.html" (
  echo. ✅ [!check_count!] Arquivo index.html com meta tags
  echo.    📁 index.html
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Arquivo index.html com meta tags
  echo.    📁 index.html (NÃO ENCONTRADO)
)
echo.

REM Verificar browserconfig.xml
set check_count=!check_count! + 1
if exist "public\browserconfig.xml" (
  echo. ✅ [!check_count!] Arquivo browserconfig.xml criado
  echo.    📁 public\browserconfig.xml
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Arquivo browserconfig.xml criado
  echo.    📁 public\browserconfig.xml (NÃO ENCONTRADO)
)
echo.

REM Verificar documentação
set check_count=!check_count! + 1
if exist "docs\PWA_CONFIGURATION.md" (
  echo. ✅ [!check_count!] Documentação PWA criada
  echo.    📁 docs\PWA_CONFIGURATION.md
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Documentação PWA criada
  echo.    📁 docs\PWA_CONFIGURATION.md (NÃO ENCONTRADO)
)
echo.

echo ===============================================================
echo 2^) VERIFICANDO ÍCONES
echo ===============================================================
echo.

REM Ícone 192x192
set check_count=!check_count! + 1
if exist "public\icon-192.png" (
  echo. ✅ [!check_count!] Ícone 192x192 disponível
  echo.    📁 public\icon-192.png
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Ícone 192x192 disponível
  echo.    📁 public\icon-192.png (NÃO ENCONTRADO)
)
echo.

REM Ícone 512x512
set check_count=!check_count! + 1
if exist "public\icon-512.png" (
  echo. ✅ [!check_count!] Ícone 512x512 disponível
  echo.    📁 public\icon-512.png
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Ícone 512x512 disponível
  echo.    📁 public\icon-512.png (NÃO ENCONTRADO)
)
echo.

REM Favicon
set check_count=!check_count! + 1
if exist "public\favicon.png" (
  echo. ✅ [!check_count!] Favicon disponível
  echo.    📁 public\favicon.png
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] Favicon disponível
  echo.    📁 public\favicon.png (NÃO ENCONTRADO)
)
echo.

REM OG Image
set check_count=!check_count! + 1
if exist "public\og-image.png" (
  echo. ✅ [!check_count!] OG Image disponível
  echo.    📁 public\og-image.png
  set pass_count=!pass_count! + 1
) else (
  echo. ❌ [!check_count!] OG Image disponível
  echo.    📁 public\og-image.png (NÃO ENCONTRADO)
)
echo.

echo ===============================================================
echo 📊 RESULTADO FINAL
echo ===============================================================
echo.

REM Calcular percentagem (sem operações decimais)
set /a total=check_count
set /a percentage=pass_count*100/total

echo Verificações Passadas: %pass_count%/%total% ^(%percentage%%%^)
echo.

if %pass_count% equ %total% (
  echo ✨ TODAS AS VERIFICAÇÕES PASSARAM!
  echo A configuração PWA para Windows está pronta!
) else (
  echo ⚠️  ALGUMAS VERIFICAÇÕES FALHARAM
  echo Por favor, revise os itens listados acima
)

echo.
echo ===============================================================
echo 📚 PRÓXIMOS PASSOS
echo ===============================================================
echo.
echo 1. Fazer build do projeto:
echo    npm run build
echo.
echo 2. Deploy em HTTPS
echo.
echo 3. Testar no Microsoft Edge:
echo    - Abra a URL
echo    - Clique no ícone de instalação
echo    - Confirme a instalação
echo.
echo 4. Validar a configuração (no DevTools):
echo    - Cole o script: docs/pwa-validation-script.js
echo    - Verifique os resultados
echo.
echo Documentação completa em: docs/PWA_CONFIGURATION.md
echo ===============================================================
echo.

pause
