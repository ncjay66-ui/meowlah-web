'use client';
import { useEffect } from 'react';

/**
 * 根 layout 的 <html lang> 是静态的（改成动态会让全站退化为动态渲染，
 * 损失 /products、/categories 等页面的静态优化）。
 *
 * 所以：
 *  - 服务端 HTML 里用元素级 lang 属性标记语言子树（合法 HTML，Google 认）
 *  - 这个组件在客户端把 document.documentElement.lang 也修正过来，
 *    主要是为了屏幕阅读器和浏览器翻译功能
 *
 * 语言的主要信号来自 hreflang 标签 + 页面实际文字，这两个都已到位。
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [lang]);
  return null;
}
