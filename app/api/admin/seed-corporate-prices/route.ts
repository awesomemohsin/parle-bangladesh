import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Product } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const rules = [
      { slug: 'hide-seek-choco-chip-cookies', weight: '22g', corporatePrice: 23 },
      { slug: 'fab-chocolate', weight: '25g', corporatePrice: 26 },
      { slug: 'fab-vanilla', weight: '25g', corporatePrice: 26 },
      { slug: 'fab-orange', weight: '25g', corporatePrice: 26 },
      { slug: 'fab-strawberry', weight: '25g', corporatePrice: 26 },
      { slug: 'fab-chocolate', weight: '50g', corporatePrice: 54 },
      { slug: 'fab-vanilla', weight: '50g', corporatePrice: 54 },
      { slug: 'parle-g-gold', weight: '125g', corporatePrice: 107 },
      { slug: 'jam-in-cream', weight: '70g', corporatePrice: 107 },
      { slug: 'parle-g-oats-berries', weight: '93.8g', corporatePrice: 108 },
      { slug: 'hide-seek-choco-chip-cookies', weight: '82.5g', corporatePrice: 125 },
      { slug: 'hide-seek-bourbon', weight: '63g', corporatePrice: 125 },
      { slug: 'kreams-bourbon', weight: '75g', corporatePrice: 125 },
      { slug: 'hide-seek-cashew-butter', weight: '91.74g', corporatePrice: 128 },
      { slug: 'hide-seek-caff-mocha-cookies', weight: '75g', corporatePrice: 128 },
      { slug: 'hide-seek-choco-rolls', weight: '75g', corporatePrice: 132 },
      { slug: 'fab-orange', weight: '112g', corporatePrice: 138 },
      { slug: 'fab-strawberry', weight: '112g', corporatePrice: 138 },
      { slug: 'fab-vanilla', weight: '112g', corporatePrice: 138 },
      { slug: 'fab-chocolate', weight: '112g', corporatePrice: 138 },
      { slug: 'nutricrunch-lite-crackers', weight: '100g', corporatePrice: 148 },
      { slug: 'nutricrunch-premium-digestives-cookies', flavorKw: 'banana', corporatePrice: 147 },
      { slug: 'nutricrunch-premium-digestives-cookies', flavorKw: 'cranberry', corporatePrice: 147 },
      { slug: 'krackjack', weight: '60g', corporatePrice: 139 },
      { slug: 'hide-seek-chox-choco-chip-cookies', weight: '75g', corporatePrice: 161 },
      { slug: 'hide-seek-centre-filled', flavorKw: 'chocolate', corporatePrice: 163 },
      { slug: 'hide-seek-centre-filled', flavorKw: 'mixed berries', corporatePrice: 163 },
      { slug: 'hide-seek-centre-filled', flavorKw: 'hazelnut', corporatePrice: 163 },
      { slug: 'hide-seek-black-bourbon', flavorKw: 'choco', corporatePrice: 188 },
      { slug: 'hide-seek-black-bourbon', flavorKw: 'vanilla', corporatePrice: 188 },
      { slug: 'hide-seek-choco-chip-cookies-bulk', weight: '412.5g', corporatePrice: 658 },
      { slug: 'hide-seek-choco-rolls', weight: '300g', corporatePrice: 818 },
      { slug: 'hide-seek-triple-delight', corporatePrice: 861 },
      { slug: 'parles-wafers', flavorKw: 'onion', corporatePrice: 124 },
      { slug: 'parles-wafers', flavorKw: 'tomato', corporatePrice: 124 },
      { slug: 'parles-wafers', flavorKw: 'piri', corporatePrice: 124 },
      { slug: 'parles-wafers', flavorKw: 'salted', corporatePrice: 124 },
    ];

    const products = await Product.find({});
    let updatedCount = 0;
    let matchedVariationsCount = 0;

    for (const product of products) {
      let modified = false;

      product.variations.forEach((varItem: any) => {
        const vWeight = (varItem.weight || '').toLowerCase();
        const vFlavor = (varItem.flavor || '').toLowerCase();

        for (const rule of rules) {
          if (product.slug === rule.slug) {
            const weightMatches = !rule.weight || vWeight.includes(rule.weight.toLowerCase());
            const flavorMatches = !rule.flavorKw || vFlavor.includes(rule.flavorKw.toLowerCase());

            if (weightMatches && flavorMatches) {
              varItem.corporatePrice = rule.corporatePrice;
              modified = true;
              matchedVariationsCount++;
              break;
            }
          }
        }
      });

      if (modified) {
        product.markModified('variations');
        await product.save();
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Corporate prices updated successfully for ${matchedVariationsCount} variations across ${updatedCount} products.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
