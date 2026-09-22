import {
  ServiceRecord,
  SongRecord,
  ExternalPresentationRecord,
  ImageMediaRecord,
} from './types';

export const SEED_SONGS: SongRecord[] = [
  {
    id: 'song-glorious-day',
    title: 'Glorious Day',
    artist: 'Passion / Kristian Stanfill',
    author: 'Jason Ingram, Kristian Stanfill',
    ccli: '7081388',
    key: 'D',
    tempo: '110 BPM',
    tags: ['Praise', 'Resurrection', 'Victory'],
    slides: [
      {
        id: 's-gd-v1',
        section: 'Verse 1',
        lines: [
          'I was buried beneath her shameful endeavor',
          'Until Your love broke through the dark',
        ],
      },
      {
        id: 's-gd-ch1',
        section: 'Chorus',
        lines: [
          'You called my name and I ran out of that grave',
          'Out of the darkness into Your glorious day',
        ],
      },
      {
        id: 's-gd-v2',
        section: 'Verse 2',
        lines: [
          "One day they led Him up Calvary's mountain",
          'One day they nailed Him to die on the tree',
        ],
      },
      {
        id: 's-gd-br',
        section: 'Bridge',
        lines: [
          'I needed rescue, my sin was heavy',
          'But chains broke off when Your grace poured out',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'song-living-hope',
    title: 'Living Hope',
    artist: 'Phil Wickham',
    author: 'Phil Wickham, Brian Johnson',
    ccli: '7106807',
    key: 'Eb',
    tempo: '72 BPM',
    tags: ['Adoration', 'Grace', 'Cross'],
    slides: [
      {
        id: 's-lh-v1',
        section: 'Verse 1',
        lines: [
          'How great the chasm that lay between us',
          'How high the mountain I could not climb',
        ],
      },
      {
        id: 's-lh-v2',
        section: 'Verse 2',
        lines: [
          'Who could imagine so great a mercy',
          'What heart could fathom such boundless grace',
        ],
      },
      {
        id: 's-lh-ch',
        section: 'Chorus',
        lines: [
          'Hallelujah, praise the One who set me free',
          'Hallelujah, death has lost its grip on me',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'song-way-maker',
    title: 'Way Maker',
    artist: 'Sinach',
    author: 'Osinachi Kalu Okoro Egbu',
    ccli: '7115744',
    key: 'E',
    tempo: '68 BPM',
    tags: ['Faith', 'Miracles', 'Worship'],
    slides: [
      {
        id: 's-wm-v1',
        section: 'Verse 1',
        lines: [
          'You are here, moving in our midst',
          'I worship You, I worship You',
        ],
      },
      {
        id: 's-wm-ch',
        section: 'Chorus',
        lines: [
          'Way maker, miracle worker, promise keeper',
          'Light in the darkness, my God, that is who You are',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'song-10000-reasons',
    title: '10,000 Reasons (Bless the Lord)',
    artist: 'Matt Redman',
    author: 'Jonas Myrin, Matt Redman',
    ccli: '6016351',
    key: 'G',
    tempo: '73 BPM',
    tags: ['Gratitude', 'Praise'],
    slides: [
      {
        id: 's-10k-ch',
        section: 'Chorus',
        lines: [
          'Bless the Lord, O my soul, O my soul',
          'Worship His holy name',
        ],
      },
      {
        id: 's-10k-v1',
        section: 'Verse 1',
        lines: [
          'The sun comes up, it’s a new day dawning',
          'It’s time to sing Your song again',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

export const SEED_EXTERNAL_PRESENTATIONS: ExternalPresentationRecord[] = [
  {
    id: 'ext-canva-announcements',
    title: 'Sunday Morning Announcements (Canva)',
    type: 'CANVA',
    canvaUrl: 'https://www.canva.com/design/DAGWorshipAnnouncements/view',
    embedUrl: 'https://www.canva.com/design/DAGWorshipAnnouncements/view?embed',
    designId: 'DAGWorshipAnnouncements',
    slideCount: 4,
    slides: [
      {
        id: 'canva-s1',
        section: 'Welcome & Fellowship',
        lines: [
          'Welcome to BunsenWorship Sanctuary',
          'Join us for coffee & connection after service',
        ],
      },
      {
        id: 'canva-s2',
        section: 'Youth Ministry',
        lines: [
          'Ignite Youth Night this Friday at 6:30 PM',
          'Registration now open in the church lobby',
        ],
      },
      {
        id: 'canva-s3',
        section: 'Midweek Prayer',
        lines: [
          'Wednesday Night Prayer & Communion Service',
          'Streaming live and in sanctuary at 7:00 PM',
        ],
      },
      {
        id: 'canva-s4',
        section: 'Generosity & Giving',
        lines: [
          'Supporting our community outreach ministries',
          'Give via Mobile Money or online at church.org/give',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'ext-ppt-sermon',
    title: 'Pastor Sermon Slides - Matthew 6 (PowerPoint)',
    type: 'PPT',
    filePath: 'C:/WorshipAssets/Sermons/2026-09-22-KingdomTreasures.pptx',
    slideCount: 3,
    fileSize: 4194304,
    slides: [
      {
        id: 'ppt-s1',
        section: 'Slide 1 - Title',
        lines: [
          'Kingdom Treasures & Unshakable Faith',
          'Pastor Message &bull; Matthew 6:19-24',
        ],
      },
      {
        id: 'ppt-s2',
        section: 'Slide 2 - Scripture',
        lines: [
          'Do not store up for yourselves treasures on earth',
          'Where moth and rust destroy and thieves break in',
        ],
      },
      {
        id: 'ppt-s3',
        section: 'Slide 3 - Key Principle',
        lines: [
          'For where your treasure is,',
          'There your heart will be also.',
        ],
      },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

export const SEED_SERVICE: ServiceRecord = {
  id: 'service-current',
  title: 'Sunday Morning Worship & Word',
  date: new Date().toISOString().split('T')[0],
  isCurrent: true,
  items: [
    {
      id: 'rd-preservice',
      time: '09:00',
      title: 'Pre-service Loop',
      subtitle: '5 Min Countdown & Music',
      type: 'LOOP',
      slides: [
        {
          id: 's-loop-1',
          section: 'Countdown',
          lines: ['Service begins in 5:00', 'Welcome to BunsenWorship'],
        },
      ],
    },
    {
      id: 'rd-call-to-worship',
      time: '09:05',
      title: 'Call to Worship',
      subtitle: 'Psalm 100:1-5 Reading',
      type: 'SERMON',
      slides: [
        {
          id: 's-ps-1',
          section: 'Psalm 100:1-2',
          lines: [
            'Shout for joy to the Lord, all the earth.',
            'Worship the Lord with gladness; come before Him with joyful songs.',
          ],
        },
      ],
    },
    {
      id: 'rd-glorious-day',
      time: '09:08',
      title: 'Glorious Day',
      subtitle: 'Passion Set (Key D)',
      type: 'SONG',
      slides: [
        {
          id: 's-gd-v1',
          section: 'Verse 1',
          lines: [
            'I was buried beneath her shameful endeavor',
            'Until Your love broke through the dark',
          ],
        },
        {
          id: 's-gd-ch1',
          section: 'Chorus 1',
          lines: [
            'You called my name and I ran out of that grave',
            'Out of the darkness into Your glorious day',
          ],
        },
        {
          id: 's-gd-v2',
          section: 'Verse 2',
          lines: [
            "One day they led Him up Calvary's mountain",
            'One day they nailed Him to die on the tree',
          ],
        },
      ],
    },
    {
      id: 'rd-living-hope',
      time: '09:13',
      title: 'Living Hope',
      subtitle: 'Phil Wickham Set (Key Eb)',
      type: 'SONG',
      slides: [
        {
          id: 's-lh-v1',
          section: 'Verse 1',
          lines: [
            'How great the chasm that lay between us',
            'How high the mountain I could not climb',
          ],
        },
        {
          id: 's-lh-ch',
          section: 'Chorus',
          lines: [
            'Hallelujah, praise the One who set me free',
            'Hallelujah, death has lost its grip on me',
          ],
        },
      ],
    },
    {
      id: 'rd-announcements-canva',
      time: '09:20',
      title: 'Church Announcements',
      subtitle: 'Linked from Canva Presentation',
      type: 'CANVA',
      externalMeta: {
        type: 'CANVA',
        sourceUrl: 'https://www.canva.com/design/DAGWorshipAnnouncements/view',
        embedUrl: 'https://www.canva.com/design/DAGWorshipAnnouncements/view?embed',
        slideCount: 4,
      },
      slides: [
        {
          id: 'canva-s1',
          section: 'Welcome & Fellowship',
          lines: [
            'Welcome to BunsenWorship Sanctuary',
            'Join us for coffee & connection after service',
          ],
        },
        {
          id: 'canva-s2',
          section: 'Youth Ministry',
          lines: [
            'Ignite Youth Night this Friday at 6:30 PM',
            'Registration now open in the church lobby',
          ],
        },
      ],
    },
    {
      id: 'rd-scripture',
      time: '09:25',
      title: 'Scripture Reading & PowerPoint Sermon',
      subtitle: 'Matthew 6:19-24 (Linked from PPT)',
      type: 'PPT',
      externalMeta: {
        type: 'PPT',
        filePath: 'C:/WorshipAssets/Sermons/2026-09-22-KingdomTreasures.pptx',
        slideCount: 3,
      },
      slides: [
        {
          id: 's-sc-1',
          section: 'Matthew 6:19-20',
          lines: [
            'Do not store up for yourselves treasures on earth,',
            'where moths and vermin destroy, and where thieves break in and steal.',
          ],
        },
        {
          id: 's-sc-2',
          section: 'Matthew 6:21',
          lines: [
            'For where your treasure is,',
            'there your heart will be also.',
          ],
        },
      ],
    },
  ],
  createdAt: 1710000000000,
  updatedAt: 1710000000000,
};

const createSvgDataUrl = (svgContent: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
};

export const SEED_IMAGES: ImageMediaRecord[] = [
  {
    id: 'img-cross-sunrise',
    title: 'Sunrise at Calvary (Cross Silhouette)',
    category: 'BACKGROUND',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="35%" stop-color="#311042"/>
            <stop offset="65%" stop-color="#831843"/>
            <stop offset="85%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>
          <radialGradient id="sunBurst" cx="0.5" cy="0.75" r="0.5">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="30%" stop-color="#fbbf24" stop-opacity="0.6"/>
            <stop offset="70%" stop-color="#ea580c" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#skyGrad)"/>
        <rect width="1920" height="1080" fill="url(#sunBurst)"/>
        <path d="M0,840 Q480,720 960,820 T1920,800 L1920,1080 L0,1080 Z" fill="#090d16"/>
        <path d="M0,910 Q600,840 1200,890 T1920,880 L1920,1080 L0,1080 Z" fill="#030712"/>
        <rect x="948" y="560" width="24" height="280" rx="4" fill="#030712"/>
        <rect x="886" y="620" width="148" height="22" rx="4" fill="#030712"/>
        <rect x="786" y="635" width="16" height="190" rx="3" fill="#090d16"/>
        <rect x="746" y="675" width="96" height="16" rx="3" fill="#090d16"/>
        <rect x="1118" y="635" width="16" height="190" rx="3" fill="#090d16"/>
        <rect x="1078" y="675" width="96" height="16" rx="3" fill="#090d16"/>
      </svg>
    `),
    fileSize: 1240,
    width: 1920,
    height: 1080,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'img-celestial-midnight',
    title: 'Deep Midnight Twilight (Celestial)',
    category: 'BACKGROUND',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="celestialGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="40%" stop-color="#0f172a"/>
            <stop offset="75%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <radialGradient id="nebula1" cx="0.75" cy="0.3" r="0.45">
            <stop offset="0%" stop-color="#818cf8" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="nebula2" cx="0.25" cy="0.75" r="0.5">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#celestialGrad)"/>
        <rect width="1920" height="1080" fill="url(#nebula1)"/>
        <rect width="1920" height="1080" fill="url(#nebula2)"/>
        <circle cx="240" cy="180" r="3.5" fill="#ffffff" opacity="0.9"/>
        <circle cx="480" cy="290" r="2.5" fill="#ffffff" opacity="0.8"/>
        <circle cx="820" cy="150" r="4.5" fill="#ffffff" opacity="0.95"/>
        <circle cx="1120" cy="220" r="3" fill="#a5b4fc" opacity="0.85"/>
        <circle cx="1450" cy="140" r="4" fill="#ffffff" opacity="0.9"/>
        <circle cx="1720" cy="310" r="2" fill="#ffffff" opacity="0.75"/>
        <circle cx="360" cy="620" r="2.5" fill="#ffffff" opacity="0.7"/>
        <circle cx="700" cy="740" r="3.5" fill="#ffffff" opacity="0.85"/>
        <circle cx="1320" cy="680" r="3" fill="#38bdf8" opacity="0.8"/>
        <circle cx="1600" cy="780" r="3.5" fill="#ffffff" opacity="0.9"/>
      </svg>
    `),
    fileSize: 1180,
    width: 1920,
    height: 1080,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'img-welcome-announcement',
    title: 'Sunday Worship Welcome Banner',
    category: 'ANNOUNCEMENT',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="wBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#wBg)"/>
        <rect x="80" y="80" width="1760" height="920" rx="16" fill="none" stroke="#6366f1" stroke-width="4" stroke-dasharray="16,8" opacity="0.5"/>
        <rect x="110" y="110" width="1700" height="860" rx="12" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.4"/>
        <text x="960" y="400" font-family="-apple-system, system-ui, sans-serif" font-size="44" font-weight="700" fill="#a5b4fc" text-anchor="middle" letter-spacing="8">BUNSEN WORSHIP SANCTUARY</text>
        <text x="960" y="550" font-family="-apple-system, system-ui, sans-serif" font-size="108" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">WELCOME HOME</text>
        <text x="960" y="670" font-family="-apple-system, system-ui, sans-serif" font-size="40" font-style="italic" fill="#cbd5e1" text-anchor="middle">"Where the Spirit of the Lord is, there is freedom." — 2 Cor 3:17</text>
      </svg>
    `),
    fileSize: 1350,
    width: 1920,
    height: 1080,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'img-communion-table',
    title: "The Lord's Supper & Holy Communion",
    category: 'SERMON',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <radialGradient id="cBg" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stop-color="#450a0a"/>
            <stop offset="60%" stop-color="#180505"/>
            <stop offset="100%" stop-color="#000000"/>
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#cBg)"/>
        <circle cx="960" cy="450" r="140" fill="none" stroke="#d97706" stroke-width="4" opacity="0.7"/>
        <path d="M910,390 L1010,390 C1010,470 975,500 965,530 L965,580 L935,580 L935,600 L985,600 L925,600 L955,600 L955,580 L925,530 C915,500 910,470 910,390 Z" fill="#f59e0b" opacity="0.95"/>
        <text x="960" y="690" font-family="-apple-system, system-ui, sans-serif" font-size="68" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="3">THE LORD'S SUPPER</text>
        <text x="960" y="770" font-family="-apple-system, system-ui, sans-serif" font-size="36" fill="#fcd34d" text-anchor="middle">"Do this in remembrance of Me" — Luke 22:19</text>
      </svg>
    `),
    fileSize: 1290,
    width: 1920,
    height: 1080,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'img-shepherd-psalm',
    title: 'The Lord is My Shepherd (Psalm 23)',
    category: 'SCRIPTURE',
    dataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
        <defs>
          <linearGradient id="pBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#042f2e"/>
            <stop offset="60%" stop-color="#134e4a"/>
            <stop offset="100%" stop-color="#022c22"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#pBg)"/>
        <text x="960" y="440" font-family="-apple-system, system-ui, sans-serif" font-size="82" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-1">The Lord is my shepherd;</text>
        <text x="960" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="82" font-weight="800" fill="#a7f3d0" text-anchor="middle" letter-spacing="-1">I shall not want.</text>
        <text x="960" y="690" font-family="-apple-system, system-ui, sans-serif" font-size="40" font-weight="600" fill="#6ee7b7" text-anchor="middle" letter-spacing="4">PSALM 23:1</text>
      </svg>
    `),
    fileSize: 1150,
    width: 1920,
    height: 1080,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

