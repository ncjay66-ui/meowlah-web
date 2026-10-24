import { notFound } from 'next/navigation';
import { LanguageProvider } from '@/lib/language';
// ⚠️ 从纯模块 locale 导入，不要从 language.tsx（它是 'use client'，
//    服务端读那里的常量会拿到代理 → undefined → 整条路由 404）
import { PREFIX_TO_LANG, HREFLANG, PREFIXED_PARAMS } from '@/lib/locale';
import HtmlLang from '@/components/HtmlLang';

/** 只接受 /ms 和 /zh；英文走无前缀的原 URL（同时是 x-default） */
export function generateStaticParams() {
  return PREFIXED_PARAMS;
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const internal = PREFIX_TO_LANG[lang];

  // /foo/products/xxx 这类乱入的前缀直接 404，不让它产生垃圾页面
  if (!internal) notFound();

  return (
    // 元素级 lang：服务端 HTML 里就标记了这棵子树的语言
    <div lang={HREFLANG[internal]}>
      <HtmlLang lang={HREFLANG[internal]} />
      {/* 嵌套 Provider 覆盖根 layout 那个，强制使用路由指定的语言 */}
      <LanguageProvider forcedLang={internal}>{children}</LanguageProvider>
    </div>
  );
}
