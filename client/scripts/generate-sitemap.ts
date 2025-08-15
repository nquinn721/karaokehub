import fs from 'fs';
import path from 'path';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const generateSitemap = () => {
  const baseUrl = 'https://karaoke-hub.com';
  const currentDate = new Date().toISOString().split('T')[0];

  const urls: SitemapUrl[] = [
    {
      loc: baseUrl,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/music`,
      lastmod: currentDate,
      changefreq: 'hourly',
      priority: 0.9,
    },
    {
      loc: `${baseUrl}/dashboard`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/login`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.5,
    },
    {
      loc: `${baseUrl}/register`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.6,
    },
    // Add popular karaoke cities
    {
      loc: `${baseUrl}/venues/new-york`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/venues/los-angeles`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/venues/chicago`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/venues/houston`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/venues/phoenix`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 0.7,
    },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`,
  )
  .join('\n')}
</urlset>`;

  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemap);

  console.log(`Sitemap generated successfully at ${outputPath}`);
  console.log(`Total URLs: ${urls.length}`);
};

if (require.main === module) {
  generateSitemap();
}

export default generateSitemap;
