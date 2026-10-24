import type { MetadataRoute } from 'next';

const SITE = 'https://www.meowlah.com';

/**
 * Next.js App Router 会自动把这个文件暴露成 /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 内部 API 路由没有 SEO 价值，而且会浪费爬虫预算
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
