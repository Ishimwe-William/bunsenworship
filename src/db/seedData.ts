import { ServiceRecord, SongRecord, ExternalPresentationRecord } from './types';

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
