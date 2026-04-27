import { MetadataRoute } from 'next';

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://toolzai.co.in';

  // Core routes
  const routes = [
    '',
    '/utility-desk',
    '/magic-lab',
    '/glitch-aesthetic',
    '/creator-toolkit',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
