import type { MetadataRoute } from 'next';
import { catalogueProducts } from '@/lib/catalogue';
import { SITE, HREFLANG, productUrl } from '@/lib/seo';

/**
 * Next.js App Router 会自动把这个文件暴露成 /sitemap.xml
 *
 * 数据来自本地 catalogueProducts（静态 JSON），不调 API，
 * 所以构建稳定，不会因为 Railway 冷启动超时而让整个部署失败。
 *
 * 每个 URL 都带 alternates.languages —— Next.js 会渲染成 xhtml:link hreflang，
 * 这是 Google 认可的多语言声明方式。三语必须互相指向，缺一不可。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const langAlternates = (path: (lang: 'en' | 'bm' | 'zh') => string) => ({
    languages: {
      [HREFLANG.en]: path('en'),
      [HREFLANG.bm]: path('bm'),
      [HREFLANG.zh]: path('zh'),
    },
  });

  // 只列已验证返回 200 的路由。
  // 没有列 "/"，因为它 307 跳转到 /products?scope=recommended —— sitemap 不该放重定向 URL。
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/products`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
      alternates: langAlternates((l) =>
        l === 'en' ? `${SITE}/products` : `${SITE}/${l === 'bm' ? 'ms' : 'zh'}/products`,
      ),
    },
    {
      url: `${SITE}/community`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  const seen = new Set<string>();
  const products = catalogueProducts.filter((p) => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // 每个产品产出 3 条 URL（en / ms / zh），各自带完整的 hreflang 互指
  const productRoutes: MetadataRoute.Sitemap = products.flatMap((p) =>
    (['en', 'bm', 'zh'] as const).map((lang) => ({
      url: productUrl(p.id, lang),
      lastModified,
      changeFrequency: 'weekly' as const,
      // 有评分的产品内容更丰富，给稍高权重
      priority: p.grade ? 0.8 : 0.6,
      alternates: langAlternates((l) => productUrl(p.id, l)),
    })),
  );

  return [...staticRoutes, ...productRoutes];
}
