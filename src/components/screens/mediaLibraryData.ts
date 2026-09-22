export interface ProMediaAsset {
  id: string;
  title: string;
  format: 'MOV' | 'MP4' | 'PPTX' | 'PNG' | 'JPG' | 'CANVA' | 'SONG';
  resolution?: string; // '4K' | '1080p' | '16:9'
  durationOrSlides: string; // '0:30' | '1:00' | '24 Slides' | 'Static'
  sourceCategory: 'ALL' | 'POWERPOINT' | 'VIDEO' | 'SPEAKER_DECK' | 'ANNOUNCEMENTS' | 'SONGS' | 'CANVA';
  thumbnailUrl: string;
  filePath?: string;
  canvaUrl?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  slidesCount?: number;
  tags?: string[];
}

const svgToDataUrl = (svg: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
};

export const PRO_MEDIA_ASSETS: ProMediaAsset[] = [
  {
    id: 'asset-cinematic-particles',
    title: 'Cinematic Particles Blue',
    format: 'MOV',
    resolution: '4K',
    durationOrSlides: '0:30',
    sourceCategory: 'VIDEO',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#020817"/>
            <stop offset="50%" stop-color="#051937"/>
            <stop offset="100%" stop-color="#001026"/>
          </linearGradient>
          <radialGradient id="vortexGlow" cx="0.45" cy="0.45" r="0.4">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95"/>
            <stop offset="35%" stop-color="#0284c7" stop-opacity="0.6"/>
            <stop offset="70%" stop-color="#0369a1" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#bg)"/>
        <!-- Curved swirling particle streams -->
        <g stroke="#38bdf8" fill="none" opacity="0.75" stroke-linecap="round">
          <path d="M120,480 C260,420 380,310 430,240 C470,180 520,160 550,200 C580,240 540,300 470,300 C400,300 370,240 400,190 C430,140 500,130 540,160" stroke-width="4.5"/>
          <path d="M60,350 C180,290 320,240 410,230 C490,220 540,250 530,290 C520,330 460,340 420,310 C380,280 390,220 440,190 C480,170 520,180 540,210" stroke-width="3"/>
          <path d="M220,530 C340,460 420,350 450,270 C470,210 510,190 535,215 C560,240 535,280 490,280" stroke-width="6" opacity="0.9" stroke="#7dd3fc"/>
          <path d="M850,80 C720,140 590,200 500,220 C420,240 390,210 410,170 C430,130 490,140 520,180" stroke-width="3.5"/>
          <path d="M920,220 C780,240 640,240 530,235 C450,230 420,200 440,170" stroke-width="2.5"/>
          <path d="M780,480 C680,410 580,320 500,270 C450,240 430,210 450,180" stroke-width="3"/>
          <!-- Perspective tech grid lines -->
          <line x1="432" y1="243" x2="0" y2="0" stroke="#0284c7" stroke-width="1.5" opacity="0.4"/>
          <line x1="432" y1="243" x2="300" y2="0" stroke="#0284c7" stroke-width="1.5" opacity="0.3"/>
          <line x1="432" y1="243" x2="700" y2="0" stroke="#0284c7" stroke-width="1.5" opacity="0.3"/>
          <line x1="432" y1="243" x2="960" y2="80" stroke="#0284c7" stroke-width="1.5" opacity="0.4"/>
          <line x1="432" y1="243" x2="960" y2="350" stroke="#0284c7" stroke-width="1.5" opacity="0.4"/>
        </g>
        <circle cx="432" cy="243" r="160" fill="url(#vortexGlow)"/>
        <!-- Particles -->
        <g fill="#e0f2fe">
          <circle cx="420" cy="235" r="5"/>
          <circle cx="450" cy="255" r="3.5"/>
          <circle cx="390" cy="280" r="2.5"/>
          <circle cx="480" cy="210" r="3"/>
          <circle cx="340" cy="340" r="2"/>
          <circle cx="280" cy="400" r="3"/>
          <circle cx="210" cy="450" r="2.5"/>
          <circle cx="560" cy="180" r="2.5"/>
          <circle cx="630" cy="210" r="3.5"/>
          <circle cx="720" cy="160" r="2"/>
          <circle cx="510" cy="310" r="3"/>
          <circle cx="600" cy="360" r="2"/>
          <circle cx="400" cy="160" r="3"/>
          <circle cx="330" cy="200" r="2"/>
          <circle cx="780" cy="290" r="2.5"/>
          <circle cx="850" cy="240" r="3"/>
          <circle cx="150" cy="310" r="2"/>
        </g>
      </svg>
    `),
    tags: ['Motion Loop', 'Particles', 'Abstract'],
  },
  {
    id: 'asset-easter-sunrise',
    title: 'Easter Sunrise Loop',
    format: 'MP4',
    resolution: '1080p',
    durationOrSlides: '1:00',
    sourceCategory: 'VIDEO',
    youtubeUrl: 'https://www.youtube.com/watch?v=nQWFzMvCfLE',
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="35%" stop-color="#7dd3fc"/>
            <stop offset="65%" stop-color="#fed7aa"/>
            <stop offset="85%" stop-color="#fdba74"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>
          <radialGradient id="sun" cx="0.75" cy="0.45" r="0.35">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="30%" stop-color="#fef08a" stop-opacity="0.9"/>
            <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#sky)"/>
        <!-- Radiant Sun -->
        <circle cx="720" cy="220" r="140" fill="url(#sun)"/>
        <!-- Fluffy stylized morning clouds -->
        <path d="M80,120 Q140,80 200,110 T320,100 T420,130 L420,170 L80,170 Z" fill="#ffffff" opacity="0.6"/>
        <path d="M460,90 Q520,60 580,85 T680,80 T760,105 L760,140 L460,140 Z" fill="#ffffff" opacity="0.55"/>
        <!-- Distant Mountains -->
        <path d="M350,300 L490,230 L620,290 L740,210 L890,300 L960,300 L960,540 L350,540 Z" fill="#bbf7d0" opacity="0.5"/>
        <path d="M220,330 L390,260 L540,320 L710,240 L880,330 L960,330 L960,540 L220,540 Z" fill="#86efac" opacity="0.65"/>
        <!-- Midground rolling green hills -->
        <path d="M0,350 Q280,280 560,360 T960,330 L960,540 L0,540 Z" fill="#4ade80"/>
        <path d="M0,400 Q340,330 680,410 T960,380 L960,540 L0,540 Z" fill="#22c55e"/>
        <!-- Winding river reflecting sky -->
        <path d="M720,280 C680,310 630,340 600,370 C560,410 500,430 460,470 C410,510 360,520 320,540 L440,540 C480,515 540,490 580,450 C630,410 680,370 710,340 C730,315 745,295 750,280 Z" fill="#38bdf8"/>
        <!-- Foreground rolling pastures -->
        <path d="M0,450 Q300,390 600,470 L600,540 L0,540 Z" fill="#15803d"/>
        <path d="M500,470 Q750,420 960,460 L960,540 L500,540 Z" fill="#166534"/>
        <!-- Hillside trees -->
        <circle cx="80" cy="430" r="16" fill="#14532d"/>
        <circle cx="105" cy="440" r="14" fill="#14532d"/>
        <circle cx="130" cy="435" r="18" fill="#14532d"/>
        <circle cx="860" cy="445" r="20" fill="#14532d"/>
        <circle cx="890" cy="455" r="18" fill="#14532d"/>
      </svg>
    `),
    tags: ['Easter', 'Sunrise', 'Morning Worship'],
  },
  {
    id: 'asset-sermon-outline-oct24',
    title: 'Sermon Outline Oct 24',
    format: 'PPTX',
    resolution: '16:9',
    durationOrSlides: '24 Slides',
    sourceCategory: 'SPEAKER_DECK',
    slidesCount: 24,
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <rect width="960" height="540" fill="#f8fafc"/>
        <rect x="30" y="30" width="900" height="480" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
        <!-- Slide Header -->
        <text x="480" y="95" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="1">STRATEGY OVERVIEW</text>
        <line x1="380" y1="115" x2="580" y2="115" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <!-- Pillar 1: Growth -->
        <circle cx="210" cy="205" r="38" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
        <path d="M194,218 L206,206 L216,212 L228,194" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="221,194 228,194 228,201" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <text x="210" y="270" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="800" fill="#0f172a" text-anchor="middle">1. GROWTH</text>
        <text x="210" y="300" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Focus on new disciples,</text>
        <text x="210" y="320" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">community engagement,</text>
        <text x="210" y="340" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">and kingdom expansion.</text>

        <!-- Pillar 2: Efficiency -->
        <circle cx="480" cy="205" r="38" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
        <!-- Gear icon -->
        <circle cx="480" cy="205" r="14" fill="none" stroke="#0f172a" stroke-width="3"/>
        <circle cx="480" cy="205" r="6" fill="#0f172a"/>
        <text x="480" y="270" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="800" fill="#0f172a" text-anchor="middle">2. EFFICIENCY</text>
        <text x="480" y="300" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Streamline ministries,</text>
        <text x="480" y="320" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">empower volunteers,</text>
        <text x="480" y="340" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">and optimize service flow.</text>

        <!-- Pillar 3: Innovation -->
        <circle cx="750" cy="205" r="38" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
        <!-- Handshake / Lightbulb icon -->
        <path d="M736,205 C736,198 742,192 750,192 C758,192 764,198 764,205 C764,212 756,216 756,220 L744,220 C744,216 736,212 736,205 Z" fill="none" stroke="#0f172a" stroke-width="2.5"/>
        <line x1="745" y1="225" x2="755" y2="225" stroke="#0f172a" stroke-width="2.5"/>
        <text x="750" y="270" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="800" fill="#0f172a" text-anchor="middle">3. INNOVATION</text>
        <text x="750" y="300" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Embrace creative arts,</text>
        <text x="750" y="320" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">digital outreach,</text>
        <text x="750" y="340" font-family="-apple-system, system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">and modern media tools.</text>
      </svg>
    `),
    tags: ['Sermon', 'Slides', 'Teaching'],
  },
  {
    id: 'asset-announcements-loop-v3',
    title: 'Announcements Loop v3',
    format: 'PPTX',
    resolution: '16:9',
    durationOrSlides: '8 Slides',
    sourceCategory: 'ANNOUNCEMENTS',
    slidesCount: 8,
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="neonBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#090514"/>
            <stop offset="50%" stop-color="#19062d"/>
            <stop offset="100%" stop-color="#050819"/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#neonBg)"/>
        <!-- Cyber wireframe grid lines -->
        <g stroke="#d946ef" stroke-width="1" opacity="0.15">
          <line x1="0" y1="120" x2="960" y2="120"/>
          <line x1="0" y1="240" x2="960" y2="240"/>
          <line x1="0" y1="360" x2="960" y2="360"/>
          <line x1="0" y1="480" x2="960" y2="480"/>
          <line x1="200" y1="0" x2="200" y2="540"/>
          <line x1="400" y1="0" x2="400" y2="540"/>
          <line x1="600" y1="0" x2="600" y2="540"/>
          <line x1="800" y1="0" x2="800" y2="540"/>
        </g>
        <!-- Neon Triangles & Glow Portal -->
        <polygon points="480,90 620,330 340,330" fill="none" stroke="#22d3ee" stroke-width="3" opacity="0.8"/>
        <polygon points="480,120 590,310 370,310" fill="none" stroke="#ec4899" stroke-width="2.5" opacity="0.7"/>
        <!-- Glowing Cross -->
        <rect x="473" y="160" width="14" height="110" fill="#38bdf8" filter="drop-shadow(0 0 10px #38bdf8)"/>
        <rect x="445" y="190" width="70" height="14" fill="#38bdf8" filter="drop-shadow(0 0 10px #38bdf8)"/>
        <!-- Typography -->
        <text x="480" y="80" font-family="-apple-system, system-ui, sans-serif" font-size="46" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="4" filter="drop-shadow(0 0 16px #0284c7)">RADIANT FAITH</text>
        <text x="480" y="112" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="700" fill="#f472b6" text-anchor="middle" letter-spacing="5">AN EVENING OF WORSHIP &amp; RENEWAL</text>

        <text x="210" y="375" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="800" fill="#38bdf8">SATURDAY, NOVEMBER 18</text>
        <text x="210" y="400" font-family="-apple-system, system-ui, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">7:00 PM DOORS | 7:30 PM START</text>
        <text x="210" y="420" font-family="-apple-system, system-ui, sans-serif" font-size="11" fill="#94a3b8">HARMONY COMMUNITY CHURCH</text>

        <text x="750" y="375" font-family="-apple-system, system-ui, sans-serif" font-size="11" font-weight="700" fill="#f472b6" text-anchor="end">FEATURING:</text>
        <text x="750" y="395" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="end">GUEST WORSHIP BAND &amp;</text>
        <text x="750" y="415" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="end">PASTOR MARK JENKINS</text>

        <rect x="360" y="460" width="240" height="32" rx="16" fill="rgba(34, 211, 238, 0.15)" stroke="#22d3ee" stroke-width="1.5"/>
        <text x="480" y="481" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">ADMISSION: FREE | OPEN TO ALL</text>
      </svg>
    `),
    tags: ['Announcements', 'Worship Night', 'Flyer'],
  },
  {
    id: 'asset-sunday-morning-bg',
    title: 'Sunday Morning Opening BG',
    format: 'PNG',
    resolution: '4K',
    durationOrSlides: 'Static',
    sourceCategory: 'VIDEO',
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="marble1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f5e6d3"/>
            <stop offset="25%" stop-color="#dfcaa9"/>
            <stop offset="50%" stop-color="#b69f82"/>
            <stop offset="75%" stop-color="#8c785d"/>
            <stop offset="100%" stop-color="#4f4233"/>
          </linearGradient>
          <linearGradient id="marble2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#cbd5e1"/>
            <stop offset="40%" stop-color="#94a3b8"/>
            <stop offset="70%" stop-color="#a3b899"/>
            <stop offset="100%" stop-color="#607254"/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#marble1)"/>
        <!-- Organic liquid flow waves -->
        <path d="M0,180 Q240,60 480,210 T960,140 L960,380 Q720,500 480,340 T0,420 Z" fill="url(#marble2)" opacity="0.85"/>
        <path d="M0,280 Q320,160 640,320 T960,260 L960,460 Q640,540 320,410 T0,490 Z" fill="#9ca3af" opacity="0.45"/>
        <path d="M120,0 Q360,180 600,60 T960,100 L960,0 Z" fill="#eed9c4" opacity="0.6"/>
        <path d="M0,380 Q300,520 600,430 T960,540 L0,540 Z" fill="#44403c" opacity="0.5"/>
      </svg>
    `),
    tags: ['Background', 'Opening', 'Liquid Marble'],
  },
  {
    id: 'asset-spontaneous-worship-bg',
    title: 'Spontaneous Worship BG',
    format: 'MP4',
    resolution: '1080p',
    durationOrSlides: '2:15',
    sourceCategory: 'VIDEO',
    thumbnailUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
        <defs>
          <linearGradient id="cathedralAtmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a0808"/>
            <stop offset="40%" stop-color="#1c130d"/>
            <stop offset="70%" stop-color="#3d2817"/>
            <stop offset="100%" stop-color="#140b05"/>
          </linearGradient>
          <radialGradient id="roseWindow" cx="0.5" cy="0.32" r="0.22">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="1"/>
            <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.8"/>
            <stop offset="70%" stop-color="#b45309" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#cathedralAtmosphere)"/>
        <!-- Gothic Cathedral Pillars and Arches -->
        <!-- Left Colonnade -->
        <rect x="140" y="100" width="45" height="440" fill="#17120e"/>
        <path d="M140,180 Q240,80 340,180 L340,540 L295,540 L295,210 Q240,140 185,210 L185,540 L140,540 Z" fill="#251a13"/>
        <rect x="295" y="140" width="45" height="400" fill="#17120e"/>
        <!-- Right Colonnade -->
        <rect x="775" y="100" width="45" height="440" fill="#17120e"/>
        <path d="M620,180 Q720,80 820,180 L820,540 L775,540 L775,210 Q720,140 665,210 L665,540 L620,540 Z" fill="#251a13"/>
        <rect x="620" y="140" width="45" height="400" fill="#17120e"/>
        <!-- Center Apse Arch -->
        <path d="M380,260 Q480,90 580,260 L580,540 L380,540 Z" fill="#1e140d"/>
        <!-- Rose Window -->
        <circle cx="480" cy="170" r="55" fill="url(#roseWindow)"/>
        <circle cx="480" cy="170" r="48" fill="none" stroke="#fbbf24" stroke-width="2.5" opacity="0.85"/>
        <circle cx="480" cy="170" r="22" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.9"/>
        <!-- Altar candles glow -->
        <circle cx="480" cy="380" r="120" fill="#f59e0b" opacity="0.25"/>
        <circle cx="460" cy="390" r="4" fill="#fef08a"/>
        <circle cx="480" cy="388" r="5" fill="#fef08a"/>
        <circle cx="500" cy="390" r="4" fill="#fef08a"/>
        <!-- Divine God Rays cutting diagonally down -->
        <polygon points="480,170 320,540 440,540" fill="#fef08a" opacity="0.12"/>
        <polygon points="480,170 460,540 600,540" fill="#fef08a" opacity="0.14"/>
        <polygon points="480,170 620,540 760,540" fill="#fef08a" opacity="0.09"/>
        <!-- Worshiping congregation silhouettes with raised hands -->
        <path d="M0,540 L0,480 Q120,470 240,485 Q360,465 480,480 Q600,465 720,485 Q840,470 960,480 L960,540 Z" fill="#070403"/>
        <!-- Raised hands silhouettes -->
        <g fill="#070403">
          <circle cx="340" cy="460" r="10"/>
          <line x1="334" y1="465" x2="320" y2="435" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
          <line x1="346" y1="465" x2="360" y2="435" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
          <circle cx="480" cy="455" r="11"/>
          <line x1="472" y1="460" x2="455" y2="425" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
          <line x1="488" y1="460" x2="505" y2="425" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
          <circle cx="620" cy="460" r="10"/>
          <line x1="614" y1="465" x2="600" y2="438" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
          <line x1="626" y1="465" x2="640" y2="438" stroke="#070403" stroke-width="5" stroke-linecap="round"/>
        </g>
      </svg>
    `),
    tags: ['Cathedral', 'Sanctuary', 'Atmospheric Worship'],
  },
];
