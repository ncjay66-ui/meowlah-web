/**
 * 语言/区域常量 —— 这个文件【绝对不能】加 'use client'。
 *
 * 原因：React Server Components 里，服务端组件从 'use client' 模块导入的
 * 非组件值（对象、普通函数）会变成「客户端引用代理」，读出来是 undefined。
 * 我们踩过这个坑：PREFIX_TO_LANG 原本放在 language.tsx（client）里，
 * 服务端读到的 typeof 是 'function' 而不是 'object'，导致 /ms/* 全部 404。
 *
 * 所以：服务端和客户端都要用的纯数据，一律放这里。
 */

export type Lang = 'en' | 'zh' | 'bm';

/**
 * URL 前缀 ↔ 内部语言码。
 * ⚠️ 马来语 ISO 639-1 是 "ms"，不是 "bm"（bm 是班巴拉语 Bambara）。
 * 内部代码沿用历史的 'bm'，但 URL 和 hreflang 必须用 'ms'，
 * 否则 Google 会把页面误判成另一种语言。
 */
export const LANG_TO_PREFIX: Record<Lang, string | null> = { en: null, bm: 'ms', zh: 'zh' };
export const PREFIX_TO_LANG: Record<string, Lang> = { ms: 'bm', zh: 'zh' };

/** hreflang 值（给 <link rel="alternate"> 和 sitemap 用） */
export const HREFLANG: Record<Lang, string> = { en: 'en-MY', bm: 'ms-MY', zh: 'zh-Hans-MY' };

/** Open Graph 的 locale 值 */
export const OG_LOCALE: Record<Lang, string> = { en: 'en_MY', bm: 'ms_MY', zh: 'zh_CN' };

export const ALL_LANGS: readonly Lang[] = ['en', 'bm', 'zh'];

/** 带前缀的语言列表（英文无前缀，作为 x-default） */
export const PREFIXED_PARAMS = [{ lang: 'ms' }, { lang: 'zh' }];

/** 把任意路径换成目标语言的对应路径：/ms/products/x ↔ /products/x ↔ /zh/products/x */
export function localePath(pathname: string, target: Lang): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length && PREFIX_TO_LANG[segments[0]]) segments.shift(); // 去掉已有前缀
  const prefix = LANG_TO_PREFIX[target];
  const rest = segments.join('/');
  return prefix ? `/${prefix}${rest ? `/${rest}` : ''}` : `/${rest}`;
}

/** 当前路径带的语言前缀，没有则返回 null */
export function pathLocale(pathname: string): Lang | null {
  const first = pathname.split('/').filter(Boolean)[0];
  return first ? (PREFIX_TO_LANG[first] ?? null) : null;
}
