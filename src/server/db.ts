import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Address,
  Product,
  ProductVariant,
  Category,
  Order,
  Review,
  OtpRecord,
  SiteSettings,
  LookbookLook,
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aura_ecommerce.json');

export interface DatabaseSchema {
  users: User[];
  addresses: Address[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  otpRecords: OtpRecord[];
  wishlists: Record<string, string[]>; // userId -> productIds[]
  carts: Record<string, { variantId: string; quantity: number }[]>; // userId or sessionId -> items
  notifications: Array<{
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'promo' | 'system';
    read: boolean;
    createdAt: string;
  }>;
  siteSettings: SiteSettings;
  lookbooks: LookbookLook[];
}

let dbData: DatabaseSchema;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveDb() {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
}

export function getDb(): DatabaseSchema {
  if (!dbData) {
    initDb();
  }
  return dbData;
}

export function commitDb() {
  saveDb();
}

export function initDb() {
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
      // Ensure all arrays exist
      if (!dbData.users) dbData.users = [];
      if (!dbData.products) dbData.products = [];
      if (!dbData.orders) dbData.orders = [];
      if (!dbData.reviews) dbData.reviews = [];
      if (!dbData.categories) dbData.categories = [];
      if (!dbData.wishlists) dbData.wishlists = {};
      if (!dbData.carts) dbData.carts = {};
      if (!dbData.notifications) dbData.notifications = [];
      return;
    } catch (err) {
      console.error('Error reading db file, re-seeding...', err);
    }
  }

  // Seed Initial Database
  seedInitialData();
  saveDb();
}

function seedInitialData() {
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);

  const initialUsers: User[] = [
    {
      id: 'usr_admin_001',
      fullName: 'AURA INDIA Curator',
      email: 'admin@auraindia.in',
      phone: '+91 9820012345',
      passwordHash: adminPasswordHash,
      isVerified: true,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialAddresses: Address[] = [];

  const categories: Category[] = [
    {
      id: 'cat_women_ethnic',
      name: 'Ethnic & Couture',
      slug: 'women-ethnic',
      gender: 'women',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      description: 'Chikankari, Handwoven Banarasi, Mulmul Kurtas & Festive Ensembles.',
    },
    {
      id: 'cat_women_western',
      name: 'Contemporary & Dresses',
      slug: 'women-western',
      gender: 'women',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      description: 'Modern silhouettes, relaxed linens, trench coats and midi dresses.',
    },
    {
      id: 'cat_men_street',
      name: 'Streetwear & Oversized',
      slug: 'men-streetwear',
      gender: 'men',
      imageUrl: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80',
      description: 'Heavyweight boxy tees, utility cargo trousers and drop-shoulder hoodies.',
    },
    {
      id: 'cat_men_classic',
      name: 'Tailored & Handloom Men',
      slug: 'men-tailored',
      gender: 'men',
      imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
      description: 'Pure linen shirts, Nehru jackets, bandhgala kurtas and raw selvedge denim.',
    },
    {
      id: 'cat_teen_vibe',
      name: 'Gen-Z & Teen Trends',
      slug: 'teen-trends',
      gender: 'unisex',
      imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80',
      description: 'Y2K co-ords, baggy aesthetic jeans, collegiate varsity jackets.',
    },
    {
      id: 'cat_kids',
      name: 'Kids Play & Festive',
      slug: 'kids-wear',
      gender: 'kids',
      imageUrl: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
      description: 'Breathable organic cotton sets, joyful floral dresses, festive mini-kurtas.',
    },
    {
      id: 'cat_baby',
      name: 'Baby Organic Studio',
      slug: 'baby-studio',
      gender: 'baby',
      imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
      description: 'Super-soft certified bamboo rompers, kimono sleepsuits and newborn essentials.',
    },
  ];

  // Helper to create variants
  const createVariants = (
    productId: string,
    skuPrefix: string,
    colors: { name: string; hex: string; img?: string }[],
    sizes: string[],
    stockPerVariant = 12
  ): ProductVariant[] => {
    const list: ProductVariant[] = [];
    let count = 1;
    for (const c of colors) {
      for (const s of sizes) {
        list.push({
          id: `var_${productId}_${count++}`,
          productId,
          sku: `${skuPrefix}-${c.name.substring(0, 3).toUpperCase()}-${s}`,
          colorName: c.name,
          colorHex: c.hex,
          size: s,
          stockQuantity: stockPerVariant,
          imageUrl: c.img,
        });
      }
    }
    return list;
  };

  const adultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const menSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const teenSizes = ['XS', 'S', 'M', 'L', 'XL'];
  const kidsSizes = ['3-4Y', '5-6Y', '7-8Y', '9-10Y', '11-12Y', '13-14Y'];
  const babySizes = ['0-3M', '3-6M', '6-12M', '1-2Y', '2-3Y'];

  const products: Product[] = [
    // 1. Women - Ethnic Saree / Kurta
    {
      id: 'prod_w_01',
      name: 'Chanderi Silk Hand-Embroidered Kurta Set',
      slug: 'chanderi-silk-hand-embroidered-kurta-set',
      categoryId: 'cat_women_ethnic',
      categoryName: 'Ethnic & Couture',
      gender: 'women',
      ageGroup: 'adult',
      description:
        'Crafted from pure Chanderi silk with delicate Zari work along the neckline and cuffs. Paired with straight-cut silk pants and a scallop-edged organza dupatta. Breathable, luminous, and timeless.',
      material: '70% Chanderi Silk, 30% Cotton with Organza Dupatta',
      basePrice: 3499,
      mrpPrice: 5999,
      discountPercent: 41,
      rating: 4.9,
      reviewCount: 88,
      isFeatured: true,
      isTrending: true,
      collection: 'festive_edit',
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 2. Women - Contemporary Dress
    {
      id: 'prod_w_02',
      name: 'Pleated Minimalist Trench Midi Dress',
      slug: 'pleated-minimalist-trench-midi-dress',
      categoryId: 'cat_women_western',
      categoryName: 'Contemporary & Dresses',
      gender: 'women',
      ageGroup: 'adult',
      description:
        'A masterclass in modern tailoring. Cut from structured yet fluid suiting twill with a double-breasted closure, detachable waist cincher belt, and gentle accordion pleats.',
      material: '100% Breathable Lyocell Twill',
      basePrice: 2899,
      mrpPrice: 4499,
      discountPercent: 35,
      rating: 4.8,
      reviewCount: 64,
      isFeatured: true,
      isTrending: true,
      collection: 'the_edit',
      images: [
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 3. Men - Oversized Heavyweight Tee
    {
      id: 'prod_m_01',
      name: '280 GSM Heavyweight Oversized Boxy T-Shirt',
      slug: '280-gsm-heavyweight-oversized-boxy-tshirt',
      categoryId: 'cat_men_street',
      categoryName: 'Streetwear & Oversized',
      gender: 'men',
      ageGroup: 'young_adult',
      description:
        'Engineered for maximum drape. 280 GSM combed Indian cotton with a dense ribbed collar that will never bacon. Pre-shrunk and silicon-washed for an unmatched velvety hand-feel.',
      material: '100% Ringspun Combed Heavyweight Cotton (280 GSM)',
      basePrice: 999,
      mrpPrice: 1799,
      discountPercent: 44,
      rating: 4.9,
      reviewCount: 142,
      isFeatured: true,
      isTrending: true,
      collection: 'streetwear',
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 4. Men - Relaxed Linen Kurta Shirt
    {
      id: 'prod_m_02',
      name: 'Pure French Linen Mandarin Collar Shirt',
      slug: 'pure-french-linen-mandarin-collar-shirt',
      categoryId: 'cat_men_classic',
      categoryName: 'Tailored & Handloom Men',
      gender: 'men',
      ageGroup: 'adult',
      description:
        'Woven from premium European flax spun in Gujarat. Features genuine mother-of-pearl buttons, a clean mandarin band collar, and a modern relaxed cut perfect for humid Indian summers or evening soirees.',
      material: '100% Certified Pure Linen (60 Lea)',
      basePrice: 2299,
      mrpPrice: 3899,
      discountPercent: 41,
      rating: 4.8,
      reviewCount: 95,
      isFeatured: true,
      isTrending: false,
      collection: 'summer_edit',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 5. Teen - Baggy Parachute Pants & Co-ord
    {
      id: 'prod_t_01',
      name: 'Utility Parachute Cargo Trousers',
      slug: 'utility-parachute-cargo-trousers',
      categoryId: 'cat_teen_vibe',
      categoryName: 'Gen-Z & Teen Trends',
      gender: 'unisex',
      ageGroup: 'teen',
      description:
        'Ultra-light ripstop fabric with adjustable bungee ankle toggles and 6 tactical pockets. Wear them ultra-baggy or cinched at the ankle with chunky sneakers.',
      material: 'Water-Repellent Cotton-Nylon Ripstop',
      basePrice: 1699,
      mrpPrice: 2799,
      discountPercent: 39,
      rating: 4.7,
      reviewCount: 52,
      isFeatured: true,
      isTrending: true,
      collection: 'streetwear',
      images: [
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 6. Kids - Boys & Girls Festive Set
    {
      id: 'prod_k_01',
      name: 'Block-Printed Organic Cotton Kurta & Dhoti Set',
      slug: 'block-printed-organic-cotton-kurta-dhoti-set',
      categoryId: 'cat_kids',
      categoryName: 'Kids Play & Festive',
      gender: 'kids',
      ageGroup: 'kids',
      description:
        'Hand block-printed with non-toxic herbal dyes. Soft elasticated waistband for total play comfort with zero itchy seams. Includes matching printed stole.',
      material: '100% GOTS Certified Organic Voile Cotton',
      basePrice: 1299,
      mrpPrice: 2199,
      discountPercent: 40,
      rating: 4.9,
      reviewCount: 46,
      isFeatured: false,
      isTrending: true,
      collection: 'festive_edit',
      images: [
        'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 7. Baby - Bamboo Romper
    {
      id: 'prod_b_01',
      name: 'Feather-Soft Bamboo Ribbed Zip Romper',
      slug: 'feather-soft-bamboo-ribbed-zip-romper',
      categoryId: 'cat_baby',
      categoryName: 'Baby Organic Studio',
      gender: 'baby',
      ageGroup: 'baby',
      description:
        'Made from thermo-regulating organic bamboo viscose. Two-way YKK zipper for rapid midnight diaper changes without undressing baby. Fold-over mittens on 0-6M sizes prevent scratches.',
      material: '95% Bamboo Viscose, 5% Elastane',
      basePrice: 799,
      mrpPrice: 1399,
      discountPercent: 42,
      rating: 5.0,
      reviewCount: 110,
      isFeatured: true,
      isTrending: true,
      collection: 'new_season',
      images: [
        'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 8. Women - Wide-Leg Trousers
    {
      id: 'prod_w_03',
      name: 'High-Waisted Italian Wool-Blend Wide Trousers',
      slug: 'high-waisted-wool-blend-wide-trousers',
      categoryId: 'cat_women_western',
      categoryName: 'Contemporary & Dresses',
      gender: 'women',
      ageGroup: 'adult',
      description:
        'High rise with deep front pleats and fluid wide legs that pool elegantly over pointed heels or loafers. Tailored with reinforced seams and welt pockets.',
      material: 'Lightweight Tropical Wool & Viscose',
      basePrice: 2499,
      mrpPrice: 3999,
      discountPercent: 37,
      rating: 4.8,
      reviewCount: 39,
      isFeatured: false,
      isTrending: true,
      collection: 'the_edit',
      images: [
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 9. Men - Bandhgala Jacket
    {
      id: 'prod_m_03',
      name: 'Raw Silk Textured Bandhgala Blazer',
      slug: 'raw-silk-textured-bandhgala-blazer',
      categoryId: 'cat_men_classic',
      categoryName: 'Tailored & Handloom Men',
      gender: 'men',
      ageGroup: 'adult',
      description:
        'A regal silhouette tailored with a structured mandarin collar, antique brass buttons, and breathable viscose jacquard lining. Ideal for royal wedding receptions.',
      material: '100% Hand-Spun Raw Matka Silk',
      basePrice: 5999,
      mrpPrice: 9999,
      discountPercent: 40,
      rating: 4.9,
      reviewCount: 51,
      isFeatured: true,
      isTrending: false,
      collection: 'festive_edit',
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // 10. Kids - Tiered Sundress
    {
      id: 'prod_k_02',
      name: 'Hand-Smocked Sunshine Tiered Cotton Frock',
      slug: 'hand-smocked-sunshine-cotton-frock',
      categoryId: 'cat_kids',
      categoryName: 'Kids Play & Festive',
      gender: 'kids',
      ageGroup: 'kids',
      description:
        'Delicate smocking across the bodice with flutter cap sleeves and gentle tiered skirt. 100% combed cotton that stays soft after dozens of machine washes.',
      material: '100% Feather-soft Cotton Poplin',
      basePrice: 999,
      mrpPrice: 1699,
      discountPercent: 41,
      rating: 4.9,
      reviewCount: 38,
      isFeatured: false,
      isTrending: true,
      collection: 'summer_edit',
      images: [
        'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1000&q=80',
      ],
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Populate variants with real colors and sizes
  products[0].variants = createVariants(
    products[0].id,
    'KURTA-SLK',
    [
      { name: 'Emerald Green', hex: '#0B5345' },
      { name: 'Royal Ivory', hex: '#FFFFF0' },
      { name: 'Rani Pink', hex: '#C2185B' },
    ],
    adultSizes,
    14
  );

  products[1].variants = createVariants(
    products[1].id,
    'TRNCH-DRS',
    [
      { name: 'Sand Beige', hex: '#D2B48C' },
      { name: 'Midnight Charcoal', hex: '#262626' },
    ],
    adultSizes,
    10
  );

  products[2].variants = createVariants(
    products[2].id,
    'TEE-OVR',
    [
      { name: 'Washed Onyx Black', hex: '#1C1C1C' },
      { name: 'Ecru Chalk White', hex: '#F5F5F0' },
      { name: 'Sage Olive', hex: '#606C38' },
    ],
    menSizes,
    25
  );

  products[3].variants = createVariants(
    products[3].id,
    'SHIRT-LIN',
    [
      { name: 'Crisp White', hex: '#FFFFFF' },
      { name: 'Ocean Chambray Blue', hex: '#4A7C9B' },
      { name: 'Natural Khaki Flax', hex: '#C4A482' },
    ],
    menSizes,
    12
  );

  products[4].variants = createVariants(
    products[4].id,
    'CARGO-UTL',
    [
      { name: 'Matte Slate Grey', hex: '#475569' },
      { name: 'Desert Dune', hex: '#D1B89D' },
      { name: 'Deep Pitch Black', hex: '#0F172A' },
    ],
    teenSizes,
    15
  );

  products[5].variants = createVariants(
    products[5].id,
    'KID-FEST',
    [
      { name: 'Marigold Yellow', hex: '#F59E0B' },
      { name: 'Peacock Teal', hex: '#0D9488' },
    ],
    kidsSizes,
    18
  );

  products[6].variants = createVariants(
    products[6].id,
    'BABY-RMP',
    [
      { name: 'Oatmeal Heather', hex: '#E7DFD5' },
      { name: 'Blush Terracotta', hex: '#E07A5F' },
      { name: 'Soft Eucalyptus', hex: '#819888' },
    ],
    babySizes,
    20
  );

  products[7].variants = createVariants(
    products[7].id,
    'TROUSER-WD',
    [
      { name: 'Espresso Brown', hex: '#3E2723' },
      { name: 'Obsidian Black', hex: '#111111' },
    ],
    adultSizes,
    12
  );

  products[8].variants = createVariants(
    products[8].id,
    'BND-JCKT',
    [
      { name: 'Imperial Midnight Navy', hex: '#0A192F' },
      { name: 'Wine Velvet', hex: '#58111A' },
    ],
    menSizes,
    8
  );

  products[9].variants = createVariants(
    products[9].id,
    'KID-FRK',
    [
      { name: 'Pastel Lavender', hex: '#E6E6FA' },
      { name: 'Sunny Buttercup', hex: '#FEF08A' },
    ],
    kidsSizes,
    16
  );

  // Initial Reviews
  const reviews: Review[] = [
    {
      id: 'rev_001',
      productId: 'prod_w_01',
      userId: 'usr_cust_002',
      userName: 'Priya Sharma',
      rating: 5,
      title: 'Ethereal craftsmanship and immaculate fit!',
      comment:
        'Wore this to a Diwali cocktail party in Bangalore. Received non-stop compliments on the organza dupatta embroidery. Fabric feels so lightweight yet royal.',
      isVerifiedPurchase: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'rev_002',
      productId: 'prod_m_01',
      userId: 'usr_cust_002',
      userName: 'Aditya K.',
      rating: 5,
      title: 'Finally a legit 280 GSM heavyweight tee in India',
      comment:
        'Drop shoulder is on point, collar has zero sag after 4 washes. Better than imported streetwear brands charging 4x more.',
      isVerifiedPurchase: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'rev_003',
      productId: 'prod_b_01',
      userId: 'usr_cust_002',
      userName: 'Dr. Neha Verma',
      rating: 5,
      title: 'Gentle on eczema-prone newborn skin',
      comment:
        'The two-way zipper is a lifesaver. The bamboo fabric is butter smooth. Bought 3 more colors immediately.',
      isVerifiedPurchase: true,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ];

  const lookbooks: LookbookLook[] = [
    {
      id: 'look_01',
      title: 'THE MONOCHROME EDIT',
      subtitle: 'Modern Minimalist Streetwear',
      story:
        'Architectural tailoring meets relaxed silhouettes. Heavyweight 280 GSM cotton paired with wide utility cargo trousers.',
      modelImage:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
      productIds: ['prod_m_01', 'prod_t_01'],
    },
    {
      id: 'look_02',
      title: 'FESTIVE OPULENCE',
      subtitle: 'Contemporary Heritage',
      story:
        'Luminous Chanderi silk meets intricate antique zari. An ode to Indian craftsmanship redefined for the modern muse.',
      modelImage:
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
      productIds: ['prod_w_01'],
    },
    {
      id: 'look_03',
      title: 'THE SUMMER LINEN CAPSULE',
      subtitle: 'Effortless Resort Living',
      story:
        'Breathable 60 lea French flax and structured wide-leg suiting designed for coastal mornings and rooftop sunsets.',
      modelImage:
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=80',
      productIds: ['prod_m_02', 'prod_w_03'],
    },
  ];

  dbData = {
    users: initialUsers,
    addresses: initialAddresses,
    categories,
    products,
    orders: [],
    reviews,
    otpRecords: [],
    wishlists: {},
    carts: {},
    notifications: [],
    siteSettings: {
      promoBarText: '✦ WELCOME TO AURA INDIA | COMPLIMENTARY EXPRESS SHIPPING ACROSS INDIA ON ORDERS ABOVE ₹999 | USE CODE: AURA10 FOR 10% OFF ✦',
      freeShippingThreshold: 999,
      standardShippingFee: 99,
      activeCollections: ['new_season', 'the_edit', 'streetwear', 'festive_edit', 'summer_edit'],
    },
    lookbooks,
  };
}
