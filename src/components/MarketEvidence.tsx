'use client';
import { useLang } from '@/lib/language';
import { merchantLink, words } from '@/lib/shopping';
import { halalLabel, halalStatus, marketReview, lifeStage, marketAvailabilityNote, marketDeliveryNote, malaysiaProducts } from '@/lib/malaysia';
export default function MarketEvidence({id}: {id:string}) {
  const {lang}=useLang(); const w=(en:string,zh:string,bm:string)=>words(lang,en,zh,bm);
  const review=marketReview(id);
  const product=malaysiaProducts.find(item=>item.id===id);
  const hasAffiliate=!!(product && (merchantLink(product,'shopee')?.affiliate || merchantLink(product,'lazada')?.affiliate));
  return <section className="shop-evidence">
    <span className="shop-eyebrow">{w('MALAYSIA · SOURCE CHECK', '马来西亚 · 资料核查', 'MALAYSIA · SEMAKAN SUMBER')}</span>
    <h2>{halalLabel(halalStatus(review),lang)}</h2>
    <p>{w('Pork-free is not halal certification. Unverified does not mean non-halal.', '无猪成分不等于清真认证；待核实也不等于非清真。', 'Tanpa babi bukan pensijilan halal. Belum disahkan tidak bermaksud tidak halal.')}</p>
    {review ? <>
      <p>{lifeStage(id,lang)} · {w('Checked', '查阅于', 'Disemak')}：{review.checked_at} · {marketAvailabilityNote(review,lang)}</p>
      <p>{marketDeliveryNote(review,lang)}</p>
      {review.halal_status==='brand_claim' && <p>{w('The brand claims halal certification. The issuer, valid certificate and exact product coverage have not been independently verified.', '品牌官网声明清真认证；发证机构、有效证书及具体产品覆盖范围尚未独立核实。', 'Jenama mendakwa pensijilan halal. Pengeluar sijil, tempoh sah dan skop produk belum disahkan secara bebas.')}</p>}
      {review.certificate_expires && <p>{review.certifier} · {w('Published certificate valid until', '公开证书有效期至', 'Sijil dipaparkan sah hingga')} {review.certificate_expires}。{w('Dry-food scope; renewal and exact flavour coverage need confirmation. No JAKIM recognition claim is made.', '原图范围为干粮；续证及具体口味覆盖仍需确认，未标记为 JAKIM 认证或认可。', 'Skop makanan kering; pembaharuan dan perisa perlu disahkan. Tiada dakwaan pengiktirafan JAKIM.')}</p>}
      <div className="shop-evidence-links">{!hasAffiliate && <a href={review.product_source} target="_blank" rel="noopener noreferrer">{w('Product source', '查看产品资料', 'Sumber produk')} ↗</a>}{hasAffiliate && <span>{w('Purchase through the marketplace options below to support MeowLah.', '如需购买，请使用下方平台入口支持 MeowLah。', 'Untuk membeli, gunakan pautan platform di bawah untuk menyokong MeowLah.')}</span>}{review.halal_source && <a href={review.halal_source} target="_blank" rel="noopener noreferrer">{w('Halal / ingredient statement', '查看清真或成分声明', 'Kenyataan halal / ramuan')} ↗</a>}{review.certificate_image && <a href={review.certificate_image} target="_blank" rel="noopener noreferrer">{w('Published certificate', '查看公开证书原图', 'Sijil dipaparkan')} ↗</a>}</div>
    </> : <p>{w('This older listing is outside the reviewed Malaysia selection. Its local availability and previous halal labels have not been verified.', '此旧条目尚未进入马来西亚精选；本地购买渠道及旧清真标签尚未核实。', 'Rekod lama ini di luar pilihan Malaysia yang disemak. Ketersediaan tempatan dan label halal lama belum disahkan.')}</p>}
  </section>;
}
