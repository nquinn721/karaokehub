import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
  structuredData?: object;
}

const defaultSEO: Required<SEOProps> = {
  title: 'KaraokeHub - Find Karaoke Bars, Venues & Singing Spots Near You',
  description:
    'Discover the best karaoke bars, venues, and singing spots in your area. Browse thousands of songs, connect with singers, find live karaoke shows, and unleash your inner performer.',
  keywords: [
    'karaoke',
    'karaoke bars',
    'singing',
    'music venues',
    'karaoke nights',
    'live music',
    'bars',
    'pubs',
    'entertainment',
    'karaoke songs',
    'vocal performance',
    'nightlife',
    'karaoke finder',
    'singing venues',
    'music entertainment',
    'karaoke shows',
    'live karaoke',
    'karaoke events',
    'microphone',
    'stage performance',
    'karaoke machine',
    'DJ',
    'KJ',
  ],
  image: '/images/karaoke-hub-logo.png',
  url: 'https://karaokehub.com',
  type: 'website',
  siteName: 'KaraokeHub',
  structuredData: {},
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  siteName,
  structuredData,
}) => {
  const seoTitle = title || defaultSEO.title;
  const seoDescription = description || defaultSEO.description;
  const seoKeywords = [...defaultSEO.keywords, ...keywords];
  const seoImage = image || defaultSEO.image;
  const seoUrl = url || defaultSEO.url;
  const seoSiteName = siteName || defaultSEO.siteName;

  useEffect(() => {
    // Update page title in browser tab
    document.title = seoTitle;
  }, [seoTitle]);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords.join(', ')} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={seoSiteName} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={seoUrl} />
      <meta property="twitter:title" content={seoTitle} />
      <meta property="twitter:description" content={seoDescription} />
      <meta property="twitter:image" content={seoImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={seoUrl} />

      {/* Structured Data */}
      {structuredData && Object.keys(structuredData).length > 0 && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

// Pre-defined SEO configurations for different pages
export const seoConfigs = {
  home: {
    title: 'KaraokeHub - Find Karaoke Bars, Venues & Singing Spots Near You',
    description:
      'Discover amazing karaoke venues, browse thousands of songs, and connect with fellow singers. Find live karaoke shows near you and unleash your inner performer!',
    keywords: [
      'karaoke finder',
      'karaoke near me',
      'karaoke bars',
      'singing venues',
      'live karaoke',
    ],
    url: 'https://karaokehub.com',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'KaraokeHub',
      url: 'https://karaokehub.com',
      description: 'Find karaoke bars, venues, and singing spots near you',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://karaokehub.com/music?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  },

  music: {
    title: 'Karaoke Songs Library - Browse Thousands of Karaoke Tracks | KaraokeHub',
    description:
      'Browse our massive library of karaoke songs from every genre and decade. Find popular karaoke hits, classic rock anthems, pop favorites, and hidden gems perfect for your next performance.',
    keywords: [
      'karaoke songs',
      'karaoke tracks',
      'song library',
      'karaoke music',
      'popular karaoke songs',
      'karaoke hits',
      'singing songs',
    ],
    url: 'https://karaokehub.com/music',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'MusicLibrary',
      name: 'KaraokeHub Song Library',
      description: 'Comprehensive karaoke song library with thousands of tracks',
      url: 'https://karaokehub.com/music',
    },
  },

  venues: {
    title: 'Find Karaoke Venues & Bars Near You - Live Shows & Events | KaraokeHub',
    description:
      'Discover the best karaoke venues, bars, and pubs in your area. Find live karaoke nights, open mic events, and singing competitions. See real-time schedules and venue information.',
    keywords: [
      'karaoke venues',
      'karaoke bars near me',
      'live karaoke',
      'karaoke nights',
      'singing bars',
      'karaoke events',
      'open mic nights',
    ],
    url: 'https://karaokehub.com/venues',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Karaoke Venues',
      description: 'Find karaoke venues and bars near you',
    },
  },

  dashboard: {
    title: 'My Karaoke Dashboard - Favorites, Friends & Performance History | KaraokeHub',
    description:
      'Manage your karaoke experience with your personal dashboard. View favorite songs, connect with friends, track performance history, and discover new venues.',
    keywords: [
      'karaoke dashboard',
      'my karaoke',
      'favorite songs',
      'karaoke profile',
      'singing history',
    ],
    url: 'https://karaokehub.com/dashboard',
  },
};

// Location-based SEO generator
export const generateLocationSEO = (city: string, state?: string, country = 'USA') => ({
  title: `Karaoke Bars in ${city}${state ? `, ${state}` : ''} - Find Live Singing Venues | KaraokeHub`,
  description: `Find the best karaoke bars and singing venues in ${city}${state ? `, ${state}` : ''}. Discover live karaoke nights, open mic events, and popular singing spots near you.`,
  keywords: [
    `karaoke ${city.toLowerCase()}`,
    `karaoke bars ${city.toLowerCase()}`,
    `singing venues ${city.toLowerCase()}`,
    `live music ${city.toLowerCase()}`,
    `nightlife ${city.toLowerCase()}`,
    'karaoke near me',
  ],
  url: `https://karaokehub.com/venues/${city.toLowerCase().replace(/\s+/g, '-')}`,
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Karaoke Venues in ${city}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      ...(state && { addressRegion: state }),
      addressCountry: country,
    },
    description: `Find karaoke bars and singing venues in ${city}`,
  },
});

// Song-specific SEO generator
export const generateSongSEO = (songTitle: string, artist: string) => ({
  title: `${songTitle} by ${artist} - Karaoke Track & Lyrics | KaraokeHub`,
  description: `Sing "${songTitle}" by ${artist} at your next karaoke night. Find venues playing this track, get performance tips, and connect with other fans of this karaoke favorite.`,
  keywords: [
    `${songTitle.toLowerCase()} karaoke`,
    `${artist.toLowerCase()} karaoke`,
    'karaoke lyrics',
    'sing along',
    'karaoke performance',
    'popular karaoke songs',
  ],
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: songTitle,
    byArtist: {
      '@type': 'Person',
      name: artist,
    },
    genre: 'Karaoke',
    description: `Karaoke version of ${songTitle} by ${artist}`,
  },
});
