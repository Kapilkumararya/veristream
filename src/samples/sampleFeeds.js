module.exports = [
  {
    id: 'apollo-mission',
    title: 'Space Exploration & Moon Missions',
    category: 'History & Space Science',
    speaker: 'Documentary Narrator & Studio Panelist',
    description: 'Investigating viral Apollo lunar conspiracy claims against NASA technical archives.',
    segments: [
      {
        delayMs: 1200,
        text: 'Welcome back to the broadcast. Today we are looking at historic space exploration milestones.',
        isClaim: false
      },
      {
        delayMs: 3500,
        text: 'Critics often claim the Apollo 11 moon landing was staged in a studio, proven by the waving American flag.',
        isClaim: true,
        expectedVerdict: 'FALSE',
        category: 'historical'
      },
      {
        delayMs: 3800,
        text: 'However, high-resolution telemetry and retroreflector laser arrays on the moon still bounce signals back to Earth today.',
        isClaim: true,
        expectedVerdict: 'TRUE',
        category: 'scientific'
      },
      {
        delayMs: 3600,
        text: 'Some people also say the Great Wall of China is visible from the Moon with the naked eye.',
        isClaim: true,
        expectedVerdict: 'FALSE',
        category: 'historical'
      },
      {
        delayMs: 2500,
        text: 'Thank you for tuning in to this science broadcast segment.',
        isClaim: false
      }
    ]
  },
  {
    id: 'health-vaccines',
    title: 'Global Health & Immunization Technology',
    category: 'Biomedical Science',
    speaker: 'Public Health Forum Analyst',
    description: 'Analyzing viral claims on vaccine genetics and global epidemiological history.',
    segments: [
      {
        delayMs: 1000,
        text: 'Good afternoon, we are discussing epidemiology and modern biotechnology.',
        isClaim: false
      },
      {
        delayMs: 3600,
        text: 'There is a widespread rumor claiming mRNA vaccines alter human DNA and permanently change the genome.',
        isClaim: true,
        expectedVerdict: 'FALSE',
        category: 'scientific'
      },
      {
        delayMs: 3500,
        text: 'Historically speaking, Smallpox was declared officially eradicated worldwide in 1980 following a global vaccination campaign.',
        isClaim: true,
        expectedVerdict: 'TRUE',
        category: 'scientific'
      },
      {
        delayMs: 3800,
        text: 'Another sensational online claim suggested that 5G cellular towers transmit viruses or suppress the immune system.',
        isClaim: true,
        expectedVerdict: 'FALSE',
        category: 'scientific'
      },
      {
        delayMs: 2200,
        text: 'Reliable public health data continues to debunk these viral misconceptions.',
        isClaim: false
      }
    ]
  },
  {
    id: 'climate-renewables',
    title: 'Climate Science & Renewable Energy Transition',
    category: 'Environmental Science',
    speaker: 'Energy Economics Correspondent',
    description: 'Fact-checking energy market statistics and polar ice sheet trends.',
    segments: [
      {
        delayMs: 1200,
        text: 'Looking at current environmental data, we examine global energy transitions.',
        isClaim: false
      },
      {
        delayMs: 3500,
        text: 'The levelized cost of solar photovoltaic electricity dropped by over 80% over the last decade.',
        isClaim: true,
        expectedVerdict: 'TRUE',
        category: 'statistical'
      },
      {
        delayMs: 3600,
        text: 'A viral social media meme alleged that Antarctica has been gaining net land ice sheet mass over the past twenty years.',
        isClaim: true,
        expectedVerdict: 'MISLEADING',
        category: 'scientific'
      },
      {
        delayMs: 2500,
        text: 'We encourage listeners to reference verified peer-reviewed publications.',
        isClaim: false
      }
    ]
  }
];
