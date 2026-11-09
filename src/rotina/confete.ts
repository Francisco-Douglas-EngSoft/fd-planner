/** Confete leve e sem dependências. Não roda se o usuário preferir menos movimento. */
export function lancarConfete(cores: string[]): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: 'none',
    zIndex: '100',
  });
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const paleta = cores.length ? cores : ['#7B61FF', '#2D7FF9', '#17A673', '#E39A1B', '#E0568B'];
  const particulas = Array.from({ length: 90 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.25,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    tam: 5 + Math.random() * 5,
    cor: paleta[Math.floor(Math.random() * paleta.length)],
  }));

  const duracao = 1800;
  const inicio = performance.now();
  const quadro = (t: number) => {
    const p = (t - inicio) / duracao;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, 1 - p);
    for (const q of particulas) {
      q.vy += 0.25;
      q.vx *= 0.99;
      q.x += q.vx;
      q.y += q.vy;
      q.r += q.vr;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.r);
      ctx.fillStyle = q.cor;
      ctx.fillRect(-q.tam / 2, -q.tam / 4, q.tam, q.tam / 2);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(quadro);
    else canvas.remove();
  };
  requestAnimationFrame(quadro);
}
