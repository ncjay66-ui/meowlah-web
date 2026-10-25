import type { Lang } from './locale';
import type { HalalStatus } from './malaysia';

/**
 * 清真证据页的全部文案。
 *
 * 写作原则（改文案前请读）：
 *  - 只陈述我们真的查过的东西，数字一律由 halal-report.ts 从数据算出
 *  - 「未核查」永远明确说成「我们还没查」，绝不暗示「有问题」
 *  - 不点名批评任何品牌；只陈述「我们看到了什么证据」
 *  - 马来语是主要受众，措辞要直白、不绕
 */

type L<T> = Record<Lang, T>;

export const halalCopy = {
  pageTitle: {
    en: 'Halal Evidence for Cat Food in Malaysia',
    bm: 'Bukti Halal Makanan Kucing di Malaysia',
    zh: '马来西亚猫粮清真证据查核',
  } as L<string>,

  metaTitle: {
    en: 'Halal Cat Food Malaysia — What the Evidence Actually Shows',
    bm: 'Makanan Kucing Halal Malaysia — Apa Kata Bukti Sebenar',
    zh: '马来西亚清真猫粮 — 证据到底说明了什么',
  } as L<string>,

  metaDescription: {
    en: 'JAKIM halal certification does not cover animal feed. So what does halal cat food mean in Malaysia? We check the evidence and publish what we found.',
    bm: 'Pensijilan halal JAKIM tidak meliputi makanan haiwan. Jadi apa maksud makanan kucing halal di Malaysia? Kami semak bukti dan terbitkan hasilnya.',
    zh: 'JAKIM 的清真认证不涵盖动物饲料。那「清真猫粮」在马来西亚到底意味着什么？我们查核证据，如实公开结果。',
  } as L<string>,

  intro: {
    en: 'Many Malaysian cat owners want halal food for their cats. The information online is often unclear, and sometimes wrong. So we check the evidence ourselves and publish exactly what we find — including where we found nothing.',
    bm: 'Ramai pemilik kucing di Malaysia mahukan makanan halal untuk kucing mereka. Maklumat dalam talian selalunya kabur, kadangkala salah. Jadi kami semak sendiri buktinya dan terbitkan apa yang kami jumpa — termasuk apabila kami tidak jumpa apa-apa.',
    zh: '很多马来西亚铲屎官希望给猫咪吃清真猫粮，但网上的信息常常含糊，有时甚至是错的。所以我们自己查证据，并如实公开结果 —— 包括那些我们什么也没找到的情况。',
  } as L<string>,

  // ── 最重要的一节：无猪肉 ≠ 清真 ────────────────────────────
  porkFreeHeading: {
    en: 'Pork-free is not the same as halal',
    bm: 'Tanpa babi tidak sama dengan halal',
    zh: '「无猪肉」不等于「清真」',
  } as L<string>,

  porkFreeBody: {
    en: 'A brand saying "no pork" tells you about one ingredient. Halal certification covers much more: how animals were slaughtered, whether the line is free of cross-contamination, and whether the whole supply chain was audited by a recognised body. A pork-free declaration is useful information, but it is not a certificate, and we do not record it as one.',
    bm: 'Jenama yang menyatakan "tiada babi" hanya memberitahu anda tentang satu bahan. Pensijilan halal merangkumi lebih banyak perkara: cara haiwan disembelih, sama ada barisan pengeluaran bebas daripada pencemaran silang, dan sama ada seluruh rantaian bekalan diaudit oleh badan yang diiktiraf. Pernyataan tanpa babi ialah maklumat berguna, tetapi ia bukan sijil, dan kami tidak merekodkannya sebagai sijil.',
    zh: '品牌说「不含猪肉」，讲的只是一种原料。清真认证涵盖的范围大得多：动物如何屠宰、生产线是否存在交叉污染、整条供应链是否经过认可机构审核。「无猪肉」是有用的信息，但它不是认证，我们也不会把它记录成认证。',
  } as L<string>,

  // ── 监管现实：JAKIM 不认证宠物食品 ──────────────────────────
  // 这是全页最重要的一节。它同时解释了「为什么没有一款有 JAKIM 标志」
  // 和「品牌声称清真不等于在撒谎」。所有陈述都有公开来源，改动前请核对。
  regulatoryHeading: {
    en: 'Why you will not find a JAKIM halal logo on cat food',
    bm: 'Mengapa anda tidak akan jumpa logo halal JAKIM pada makanan kucing',
    zh: '为什么猫粮上找不到 JAKIM 清真标志',
  } as L<string>,

  regulatoryBody: {
    en: 'In June 2023 the Department of Veterinary Services stated that JAKIM halal certification is focused on food for human consumption and does not cover animal feed, and that the halal logo cannot be used on animal feed labels. Animal feed is regulated instead under the Feed Act 2009. A major Malaysian pet retailer applies that same position to pet food. So the absence of a JAKIM logo on a bag of cat food is not a mark against the brand — that certificate is not available for this category.',
    bm: 'Pada Jun 2023, Jabatan Perkhidmatan Veterinar menyatakan bahawa pensijilan halal JAKIM tertumpu kepada makanan untuk kegunaan manusia dan tidak meliputi makanan haiwan, serta logo halal tidak boleh digunakan pada label makanan haiwan. Makanan haiwan dikawal selia di bawah Akta Makanan Haiwan 2009 sebaliknya. Sebuah peruncit haiwan peliharaan utama di Malaysia menerapkan pendirian yang sama kepada makanan haiwan peliharaan. Jadi ketiadaan logo JAKIM pada sebeg makanan kucing bukanlah satu kelemahan jenama — sijil itu memang tidak tersedia untuk kategori ini.',
    zh: '2023 年 6 月，兽医局（DVS）声明 JAKIM 的清真认证聚焦于人类食用的食品，不涵盖动物饲料，清真标志亦不得用于动物饲料的标签。动物饲料改由《Feed Act 2009》管辖。马来西亚一家主要宠物连锁零售商也以同样立场对待宠物食品。所以猫粮包装上没有 JAKIM 标志，并不是品牌的问题 —— 这个类别本来就拿不到那张证书。',
  } as L<string>,

  regulatoryCaveat: {
    en: 'The DVS statement was issued about animal feed in general, prompted by a question on poultry feed. Whether pet food falls under exactly the same definition is how the industry reads it, not something the statement spells out. If this changes, we will update this page.',
    bm: 'Kenyataan JPV dikeluarkan mengenai makanan haiwan secara umum, berikutan persoalan tentang makanan ayam. Sama ada makanan haiwan peliharaan termasuk dalam definisi yang sama adalah tafsiran industri, bukan sesuatu yang dinyatakan secara jelas. Jika ini berubah, kami akan kemas kini halaman ini.',
    zh: '需要说明：DVS 那份声明针对的是「动物饲料」这个大类，起因是一个关于家禽饲料的问题。宠物食品是否完全适用同一定义，是业界的理解，声明本身并未逐字写明。若情况有变，我们会更新本页。',
  } as L<string>,

  // ── 那该看什么？────────────────────────────────────────────
  lookForHeading: {
    en: 'So what should you look for instead?',
    bm: 'Jadi apa yang patut anda cari?',
    zh: '那应该看什么？',
  } as L<string>,

  lookForBody: {
    en: 'Brands that want halal credentials for pet food go to bodies outside the JAKIM scheme. The ones we have seen cited include Indonesia\'s MUI, which does have a pet food category, Hong Kong\'s IFRC-Asia, and certificates issued against the OIC/SMIIC 1:2019 standard. These are real schemes, but they are not JAKIM, and a brand describing its certificate as "on par with JAKIM" is telling you it is not a JAKIM certificate. Ask which body issued it, the certificate number, the expiry date, and which flavours and pack sizes it actually covers.',
    bm: 'Jenama yang mahukan kredibiliti halal untuk makanan haiwan peliharaan merujuk badan di luar skim JAKIM. Antara yang pernah kami lihat disebut ialah MUI Indonesia, yang memang mempunyai kategori makanan haiwan peliharaan, IFRC-Asia Hong Kong, dan sijil yang dikeluarkan mengikut standard OIC/SMIIC 1:2019. Ini skim yang wujud, tetapi ia bukan JAKIM, dan jenama yang menyifatkan sijilnya "setaraf JAKIM" sebenarnya memberitahu anda ia bukan sijil JAKIM. Tanya badan mana yang mengeluarkannya, nombor sijil, tarikh luput, dan perisa serta saiz pek yang sebenarnya dilindungi.',
    zh: '想为宠物食品取得清真资质的品牌，会转向 JAKIM 体系之外的机构。我们见过被引用的包括：印尼 MUI（确实设有宠物食品类别）、香港 IFRC-Asia，以及依据 OIC/SMIIC 1:2019 标准签发的证书。这些都是真实存在的体系，但它们不是 JAKIM —— 一个品牌把自己的证书描述成「与 JAKIM 同等水准」，其实是在告诉你那不是 JAKIM 证书。要问清楚：哪个机构签发、证书编号、有效期，以及实际覆盖哪些口味和包装规格。',
  } as L<string>,

  sourcesHeading: {
    en: 'Sources for this section',
    bm: 'Sumber untuk bahagian ini',
    zh: '本节来源',
  } as L<string>,

  // ── 证据等级说明 ───────────────────────────────────────────
  tiersHeading: {
    en: 'How we grade halal evidence',
    bm: 'Bagaimana kami menilai bukti halal',
    zh: '我们如何划分清真证据等级',
  } as L<string>,

  tiersIntro: {
    en: 'Every product we check gets one of five labels. We never upgrade a label without seeing the document.',
    bm: 'Setiap produk yang kami semak diberi satu daripada lima label. Kami tidak akan menaikkan taraf label tanpa melihat dokumen.',
    zh: '每一款我们核查过的产品都会被标记为以下五级之一。没看到文件，我们绝不升级标签。',
  } as L<string>,

  tierExplain: {
    verified: {
      en: 'We located the certificate, identified the certifying body and certificate number, and confirmed it had not expired.',
      bm: 'Kami menemui sijil tersebut, mengenal pasti badan pensijilan dan nombor sijil, serta mengesahkan ia belum tamat tempoh.',
      zh: '我们找到了证书，确认了认证机构和证书编号，并核实其尚未过期。',
    },
    expired_evidence: {
      en: 'A certificate exists but had expired at the time we checked. It may well have been renewed since — we simply have not seen the newer document.',
      bm: 'Sijil wujud tetapi telah tamat tempoh semasa kami menyemak. Ia mungkin telah diperbaharui sejak itu — kami cuma belum melihat dokumen terbaharu.',
      zh: '证书存在，但在我们查核时已过期。之后很可能已经续期 —— 只是我们还没见到新的文件。',
    },
    brand_claim: {
      en: 'The brand or seller states the product is halal, but we could not open and verify the certificate itself.',
      bm: 'Jenama atau penjual menyatakan produk ini halal, tetapi kami tidak dapat membuka dan mengesahkan sijil itu sendiri.',
      zh: '品牌或卖家声明产品是清真的，但我们无法调阅并核实证书本身。',
    },
    pork_free_claim: {
      en: 'The brand declares the product contains no pork. This is not a halal certification.',
      bm: 'Jenama menyatakan produk ini tidak mengandungi babi. Ini bukan pensijilan halal.',
      zh: '品牌声明产品不含猪肉成分。这不是清真认证。',
    },
    unverified: {
      en: 'We checked and found no halal claim or certificate. This does not mean the product is not halal — only that we found no evidence either way.',
      bm: 'Kami menyemak dan tidak menjumpai sebarang dakwaan atau sijil halal. Ini tidak bermakna produk itu tidak halal — cuma kami tidak menjumpai bukti untuk kedua-dua pihak.',
      zh: '我们查过，没有找到任何清真声明或证书。这不代表产品不清真 —— 只是说明我们两个方向的证据都没找到。',
    },
  } as Record<HalalStatus, L<string>>,

  // ── 审计范围（最关键的诚实声明）─────────────────────────────
  scopeHeading: {
    en: 'What we have — and have not — checked',
    bm: 'Apa yang kami telah — dan belum — semak',
    zh: '我们查了什么，以及还没查什么',
  } as L<string>,

  scopeBody: {
    en: 'Checking halal evidence properly takes time: finding the certificate, identifying the certifier, confirming the expiry date and which variants it covers. We have only done this for a small number of products so far. The rest of our catalogue has not been checked at all. Please read "not checked" as exactly that — not as a judgement about the product.',
    bm: 'Menyemak bukti halal dengan betul mengambil masa: mencari sijil, mengenal pasti badan pensijilan, mengesahkan tarikh luput dan varian yang dilindungi. Setakat ini kami hanya melakukannya untuk sebilangan kecil produk. Selebihnya dalam katalog kami langsung belum disemak. Sila fahami "belum disemak" sebagai itu sahaja — bukan penilaian terhadap produk tersebut.',
    zh: '认真核查清真证据很花时间：找到证书、确认认证机构、核实有效期和覆盖的产品规格。到目前为止我们只对少数产品做过这件事，目录里其余的产品**完全没有查过**。请把「未核查」就理解成字面意思 —— 它不是对产品的任何评价。',
  } as L<string>,

  statChecked: {
    en: 'cat foods checked',
    bm: 'makanan kucing disemak',
    zh: '款猫粮已核查',
  } as L<string>,

  statUnchecked: {
    en: 'in our catalogue not yet checked',
    bm: 'dalam katalog belum disemak',
    zh: '款在目录中尚未核查',
  } as L<string>,

  statVerified: {
    en: 'with a certificate we could verify',
    bm: 'dengan sijil yang dapat kami sahkan',
    zh: '款有我们能核实的证书',
  } as L<string>,

  // ── 结果表 ────────────────────────────────────────────────
  resultsHeading: {
    en: 'What we found',
    bm: 'Apa yang kami jumpa',
    zh: '核查结果',
  } as L<string>,

  colProduct: { en: 'Product', bm: 'Produk', zh: '产品' } as L<string>,
  colEvidence: { en: 'Evidence', bm: 'Bukti', zh: '证据' } as L<string>,
  certifierLabel: { en: 'Certifier', bm: 'Badan pensijilan', zh: '认证机构' } as L<string>,
  expiresLabel: { en: 'Expires', bm: 'Tamat tempoh', zh: '有效期至' } as L<string>,
  sourceLabel: { en: 'Source', bm: 'Sumber', zh: '来源' } as L<string>,
  checkedLabel: { en: 'Checked', bm: 'Disemak', zh: '核查于' } as L<string>,
  variantNote: {
    en: 'Coverage may differ by flavour or pack size — check the packaging.',
    bm: 'Liputan mungkin berbeza mengikut perisa atau saiz pek — semak pembungkusan.',
    zh: '不同口味或包装规格的覆盖范围可能不同 —— 请核对包装。',
  } as L<string>,

  // ── 给品牌方 ──────────────────────────────────────────────
  brandsHeading: {
    en: 'For brands',
    bm: 'Untuk jenama',
    zh: '致品牌方',
  } as L<string>,

  brandsBody: {
    en: 'If your product is halal certified and we have it listed at a lower tier, send us the certificate. We will verify it and update the entry. We do not charge for this, and we do not accept payment to change any rating.',
    bm: 'Jika produk anda bersijil halal dan kami menyenaraikannya pada tahap yang lebih rendah, hantarkan sijil tersebut kepada kami. Kami akan mengesahkannya dan mengemas kini rekod. Kami tidak mengenakan bayaran untuk ini, dan kami tidak menerima bayaran untuk mengubah sebarang penilaian.',
    zh: '如果你的产品确实有清真认证而我们把它列在了较低等级，请把证书发给我们。我们会核实并更新记录。这项服务免费，而且我们不接受任何付费修改评级。',
  } as L<string>,

  // ── 方法论 ────────────────────────────────────────────────
  methodHeading: {
    en: 'Method',
    bm: 'Kaedah',
    zh: '查核方法',
  } as L<string>,

  methodBody: {
    en: 'We look for the certificate on the brand\'s own site, the official seller listing, or the certifying body where available. We record the certifier, certificate number, expiry date and the scope it covers. If any of those is missing or unreadable, the product does not get a verified label — no exceptions.',
    bm: 'Kami mencari sijil di laman web jenama itu sendiri, penyenaraian penjual rasmi, atau badan pensijilan jika ada. Kami merekodkan badan pensijilan, nombor sijil, tarikh luput dan skop liputannya. Jika mana-mana daripadanya hilang atau tidak dapat dibaca, produk itu tidak mendapat label disahkan — tiada pengecualian.',
    zh: '我们在品牌官网、官方卖家页面，或认证机构（如果可查）上寻找证书，记录认证机构、证书编号、有效期和覆盖范围。只要其中任何一项缺失或无法读取，产品就不会被标为「已核实」—— 没有例外。',
  } as L<string>,

  lastUpdated: { en: 'Last checked', bm: 'Semakan terakhir', zh: '最后核查' } as L<string>,

  disclaimer: {
    en: 'We are not a halal certification body. This page records what evidence we were able to find and verify, nothing more. For a definitive ruling, check with JAKIM or the relevant state religious authority.',
    bm: 'Kami bukan badan pensijilan halal. Halaman ini merekodkan bukti yang dapat kami jumpai dan sahkan sahaja, tidak lebih. Untuk keputusan muktamad, rujuk JAKIM atau pihak berkuasa agama negeri yang berkenaan.',
    zh: '我们不是清真认证机构。本页仅记录我们能够找到并核实的证据，仅此而已。如需权威裁定，请咨询 JAKIM 或相关州属宗教机构。',
  } as L<string>,

  viewProduct: { en: 'View product', bm: 'Lihat produk', zh: '查看产品' } as L<string>,
};

/**
 * 监管一节的引用来源 —— 每条都是可点开核对的公开报道/官方页面。
 * 这是整页可信度的支点，不要删，也不要加没亲自核对过的链接。
 */
export const regulatorySources: { label: Record<Lang, string>; url: string }[] = [
  {
    label: {
      en: 'Dept. of Veterinary Services via Bernama, 2 June 2023 — "Halal certification by Jakim does not cover animal feed"',
      bm: 'Jabatan Perkhidmatan Veterinar melalui Bernama, 2 Jun 2023 — "Pensijilan halal JAKIM tidak meliputi makanan haiwan"',
      zh: '兽医局（DVS）via Bernama，2023 年 6 月 2 日 —— 「JAKIM 清真认证不涵盖动物饲料」',
    },
    url: 'https://www.themalaysianinsight.com/s/445735',
  },
  {
    label: {
      en: 'Sinar Daily, 2 June 2023 — same DVS statement, English report',
      bm: 'Sinar Daily, 2 Jun 2023 — kenyataan JPV yang sama',
      zh: 'Sinar Daily，2023 年 6 月 2 日 —— 同一份 DVS 声明',
    },
    url: 'https://www.sinardaily.my/article/197565/focus/national/halal-certification-by-jakim-does-not-cover-animal-feed---dvs',
  },
  {
    label: {
      en: 'Pet Lovers Centre Malaysia help centre — halal certification and animal feed',
      bm: 'Pusat bantuan Pet Lovers Centre Malaysia — pensijilan halal dan makanan haiwan',
      zh: 'Pet Lovers Centre Malaysia 帮助中心 —— 清真认证与动物饲料',
    },
    url: 'https://customercare.petloverscentre.com.my/hc/en-us/articles/33337589973913-Halal-Certification-for-Animal-Feed',
  },
  {
    label: {
      en: 'South China Morning Post — halal pet food demand in Malaysia, Indonesia and Thailand',
      bm: 'South China Morning Post — permintaan makanan haiwan peliharaan halal di Malaysia, Indonesia dan Thailand',
      zh: '南华早报 —— 马来西亚、印尼、泰国的清真宠物食品需求',
    },
    url: 'https://www.scmp.com/week-asia/lifestyle-culture/article/3285812/malaysias-muslim-pawrents-halal-pet-food-must-indonesia-and-thailand-too',
  },
];
