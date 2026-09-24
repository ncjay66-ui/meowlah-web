'use client';
import { useState } from 'react';
import { useLang } from '@/lib/language';
import { words } from '@/lib/shopping';

export default function ShoppingImage({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const { lang } = useLang();
  const local = url && /^\/products\/media\/[a-z0-9-]+\.webp$/.test(url);
  const valid = local || (url && /^https:\/\//i.test(url) && !/placehold\.co|via\.placeholder/.test(url));
  return valid && !failed ? (
    // Product packaging needs its original proportions. Never guess an image from a web search.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={local ? url! : `/api/proxy-image?url=${encodeURIComponent(url!)}`} alt={name} loading="lazy" onError={() => setFailed(true)} />
  ) : <div className="shop-image-empty"><span aria-hidden="true">🐾</span><small>{words(lang, 'Image unavailable', '暂无商品图片', 'Imej tiada')}</small></div>;
}
