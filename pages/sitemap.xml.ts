import type { GetServerSideProps } from 'next';

/**
 * Sitemap dynamique (Pages Router). N'expose QUE les pages publiques — le
 * contenu (tournois, équipes, matchs, paris) est réservé aux connectés, donc
 * volontairement absent. Le domaine vient de NEXT_PUBLIC_APP_URL.
 */
const PUBLIC_PATHS = ['/', '/reglement', '/faq', '/support', '/contact', '/privacy', '/terms'];

function buildSitemap(baseUrl: string): string {
  const now = new Date().toISOString();
  const urls = PUBLIC_PATHS.map((p) => {
    const loc = `${baseUrl}${p === '/' ? '' : p}`;
    const priority = p === '/' ? '1.0' : '0.6';
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${now}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://cdm.rgtcity.fr').replace(/\/$/, '');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.write(buildSitemap(baseUrl));
  res.end();
  return { props: {} };
};

// Jamais rendu (getServerSideProps termine la réponse).
export default function Sitemap() {
  return null;
}
