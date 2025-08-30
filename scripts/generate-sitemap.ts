import fs from 'fs';
import path from 'path';

// Simple sitemap generator for static pages
const generateSitemap = () => {
  const baseUrl = 'https://karaoke-hub.com';
  const currentDate = new Date().toISOString().split('T')[0];

  const pages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/music', priority: '0.9', changefreq: 'daily' },
    { url: '/shows', priority: '0.9', changefreq: 'daily' },
    { url: '/submit', priority: '0.7', changefreq: 'weekly' },
    { url: '/about', priority: '0.6', changefreq: 'monthly' },
    { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    // Could add dynamic pages here from database
    // ...musicPages,
    // ...showPages
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(process.cwd(), 'client/public/sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully');
};

export { generateSitemap };
