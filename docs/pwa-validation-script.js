/**
 * Validação PWA - Script para verificar configuração do manifest
 * 
 * Este script valida se o manifest.json está corretamente configurado
 * para funcionamento em modo standalone no Windows
 * 
 * Para rodar: Cole este código no DevTools Console (F12) enquanto a app está carregada
 */

async function validatePWAConfig() {
  console.log('🔍 Iniciando validação PWA...\n');

  try {
    // 1. Verificar se Service Worker está registrado
    console.log('1️⃣ Verificando Service Worker...');
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      console.log('✅ Service Worker registrado:', registrations[0].scope);
    } else {
      console.warn('⚠️ Service Worker não encontrado');
    }

    // 2. Verificar manifest.json
    console.log('\n2️⃣ Buscando manifest.json...');
    const manifestLink = document.querySelector('link[rel="manifest"]');
    let manifestUrl = manifestLink?.href || '/manifest.json';
    
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) throw new Error(`HTTP ${manifestResponse.status}`);
    
    const manifest = await manifestResponse.json();
    console.log('✅ Manifest carregado:', manifestUrl);

    // 3. Validar campos obrigatórios
    console.log('\n3️⃣ Validando campos obrigatórios:');
    const validations = [
      ['name', manifest.name, 'Nome da aplicação'],
      ['short_name', manifest.short_name, 'Nome curto'],
      ['display', manifest.display, 'Modo de exibição (should be "standalone")'],
      ['scope', manifest.scope, 'Escopo (should be "/")'],
      ['start_url', manifest.start_url, 'URL inicial (should be "/")'],
      ['theme_color', manifest.theme_color, 'Cor do tema'],
      ['background_color', manifest.background_color, 'Cor de fundo'],
      ['icons', manifest.icons?.length, 'Ícones configurados'],
      ['screenshots', manifest.screenshots?.length, 'Screenshots configuradas'],
    ];

    validations.forEach(([field, value, desc]) => {
      const valid = value ? '✅' : '❌';
      console.log(`  ${valid} ${field}: ${value ?? 'NÃO CONFIGURADO'} (${desc})`);
    });

    // 4. Validar display_override
    console.log('\n4️⃣ Validando display_override (Windows 11 support):');
    if (manifest.display_override) {
      console.log('✅ display_override configurado:', manifest.display_override);
    } else {
      console.warn('⚠️ display_override não está configurado (recomendado para Windows 11)');
    }

    // 5. Validar ícones
    console.log('\n5️⃣ Validando ícones:');
    manifest.icons?.forEach((icon, idx) => {
      const hasMaskable = manifest.icons?.some(i => i.purpose?.includes('maskable'));
      console.log(`  Ícone ${idx + 1}: ${icon.sizes} - ${icon.purpose || 'any'}`);
    });
    if (!hasMaskable) {
      console.warn('⚠️ Nenhum ícone com purpose="maskable" encontrado (recomendado)');
    }

    // 6. Verificar meta tags
    console.log('\n6️⃣ Verificando meta tags:');
    const metaTags = [
      ['theme-color', document.querySelector('meta[name="theme-color"]')],
      ['apple-mobile-web-app-capable', document.querySelector('meta[name="apple-mobile-web-app-capable"]')],
      ['msapplication-TileColor', document.querySelector('meta[name="msapplication-TileColor"]')],
      ['application-name', document.querySelector('meta[name="application-name"]')],
    ];

    metaTags.forEach(([name, element]) => {
      if (element) {
        console.log(`  ✅ ${name}: ${element.content || element.getAttribute('content')}`);
      } else {
        console.warn(`  ⚠️ ${name}: NÃO ENCONTRADA`);
      }
    });

    // 7. Verificar HTTPS
    console.log('\n7️⃣ Verificando segurança:');
    if (window.location.protocol === 'https:') {
      console.log('✅ HTTPS ativado (obrigatório para PWA)');
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('✅ Localhost (seguro para desenvolvimento)');
    } else {
      console.error('❌ HTTP detectado - PWA requer HTTPS em produção');
    }

    // 8. Relatório final
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RELATÓRIO FINAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
    Aplicação: ${manifest.name}
    Escopo: ${manifest.scope}
    Modo Display: ${manifest.display}
    Display Override: ${manifest.display_override?.join(', ') || 'Não configurado'}
    Ícones: ${manifest.icons?.length || 0} encontrados
    URL Inicial: ${manifest.start_url}
    
    ✨ Configuração PWA pronta para Windows!
    `);

  } catch (error) {
    console.error('❌ Erro na validação:', error.message);
  }
}

// Executar validação
validatePWAConfig();

// Também exibir informações do navegador
console.log('\n🖥️ Informações do navegador:');
console.log('User Agent:', navigator.userAgent);
console.log('Online:', navigator.onLine);
console.log('PWA Support:', 'serviceWorker' in navigator ? '✅' : '❌');
