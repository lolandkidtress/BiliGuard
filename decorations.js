(function () {
  const ICONS = [
    { src: 'icons/decoration/raccoon1.png', type: 'animal' },
    { src: 'icons/decoration/raccoon2.png', type: 'animal' },
    { src: 'icons/decoration/leaf.png', type: 'plant' },
    { src: 'icons/decoration/flower-041.png', type: 'plant' },
    { src: 'icons/decoration/flower-042.png', type: 'plant' },
    { src: 'icons/decoration/flower-055.png', type: 'plant' },
    { src: 'icons/decoration/flower-065.png', type: 'plant' },
  ];
  const COUNT = 6;
  const MIN_DISTANCE_PX = 140;

  if (!document.getElementById('cute-decoration-style')) {
    const style = document.createElement('style');
    style.id = 'cute-decoration-style';
    style.textContent = `
      @keyframes cute-sway {
        0% { transform: translate(-50%, -50%) rotate(-15deg); }
        100% { transform: translate(-50%, -50%) rotate(15deg); }
      }
      #cute-decorations img {
        animation: cute-sway 3.5s ease-in-out infinite alternate;
      }
    `;
    document.head.appendChild(style);
  }

  const existing = document.getElementById('cute-decorations');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'cute-decorations';
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden;';
  document.body.appendChild(container);

  const forbiddenRects = getForbiddenRects();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placed = [];

  function rand(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function getForbiddenRects() {
    const rects = [];
    const sideNav = document.querySelector('.side-nav');
    if (sideNav) rects.push(sideNav.getBoundingClientRect());
    return rects;
  }

  function toCenter(pos, size) {
    const leftPct = pos.left != null ? pos.left : 100 - pos.right;
    const topPct = pos.top != null ? pos.top : 100 - pos.bottom;
    return {
      x: (leftPct / 100) * vw,
      y: (topPct / 100) * vh,
    };
  }

  function overlapsForbidden(pos, size) {
    const c = toCenter(pos, size);
    const half = size / 2 + 6;
    for (const r of forbiddenRects) {
      if (
        c.x + half > r.left &&
        c.x - half < r.right &&
        c.y + half > r.top &&
        c.y - half < r.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  function tooClose(pos, size) {
    const c = toCenter(pos, size);
    for (const p of placed) {
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE_PX) return true;
    }
    return false;
  }

  function randomPosition() {
    const roll = Math.random();
    if (roll < 0.30) return { top: rand(2, 5), left: rand(30, 70) };
    if (roll < 0.50) return { bottom: rand(2, 5), left: rand(30, 70) };
    if (roll < 0.70) return { bottom: rand(2, 6), right: rand(2, 8) };
    if (roll < 0.85) return { bottom: rand(2, 6), left: rand(2, 8) };
    if (roll < 0.925) return { top: rand(8, 20), right: rand(1, 3) };
    return { bottom: rand(8, 20), right: rand(1, 3) };
  }

  for (let i = 0; i < COUNT; i++) {
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    const size = 32 + Math.floor(Math.random() * 24);

    let pos;
    let attempts = 0;
    do {
      pos = randomPosition();
      attempts++;
    } while (attempts < 40 && (overlapsForbidden(pos, size) || tooClose(pos, size)));

    const c = toCenter(pos, size);
    placed.push(c);

    const opacity = 0.22 + Math.random() * 0.16;
    const duration = 3 + Math.random() * 2.5;
    const delay = -(Math.random() * 4).toFixed(2);

    const img = document.createElement('img');
    img.src = icon.src;
    img.alt = '';

    let positionCss = '';
    for (const key of Object.keys(pos)) {
      positionCss += `${key}:${pos[key]}%;`;
    }

    img.style.cssText =
      `position:absolute;` +
      positionCss +
      `width:${size}px;` +
      `height:auto;` +
      `opacity:${opacity.toFixed(2)};` +
      `filter:drop-shadow(0 2px 4px rgba(61,52,40,0.12));` +
      `animation-duration:${duration.toFixed(2)}s;` +
      `animation-delay:${delay}s;`;
    container.appendChild(img);
  }
})();
