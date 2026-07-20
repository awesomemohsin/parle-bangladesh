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

    const corporatePriceMap: Array<{ keywords: string[]; weight?: string; price: number }> = [
      { keywords: ['choco chips', 'hide'], weight: '22', price: 23 },
      { keywords: ['fab', 'chocolate'], weight: '25', price: 26 },
      { keywords: ['fab', 'vanilla'], weight: '25', price: 26 },
      { keywords: ['fab', 'orange'], weight: '25', price: 26 },
      { keywords: ['fab', 'strawberry'], weight: '25', price: 26 },
      { keywords: ['fab', 'chocolate'], weight: '50', price: 54 },
      { keywords: ['fab', 'vanilla'], weight: '50', price: 54 },
      { keywords: ['parle g gold'], weight: '125', price: 107 },
      { keywords: ['jam-in'], price: 107 },
      { keywords: ['oats', 'berries'], price: 108 },
      { keywords: ['choco chips', 'hide'], weight: '82.5', price: 125 },
      { keywords: ['bourbon'], weight: '63', price: 125 },
      { keywords: ['kreams bourbon'], price: 125 },
      { keywords: ['cashew', 'butter'], price: 128 },
      { keywords: ['caffemocha'], price: 128 },
      { keywords: ['choco rolls'], weight: '75', price: 132 },
      { keywords: ['fab', 'orange'], weight: '112', price: 138 },
      { keywords: ['fab', 'strawberry'], weight: '112', price: 138 },
      { keywords: ['fab', 'vanilla'], weight: '112', price: 138 },
      { keywords: ['fab', 'chocolate'], weight: '112', price: 138 },
      { keywords: ['nutricrunch', 'lite'], price: 148 },
      { keywords: ['banana', 'cinnamon'], price: 147 },
      { keywords: ['cranberry', 'cashew'], price: 147 },
      { keywords: ['krack jack'], price: 139 },
      { keywords: ['chox'], price: 161 },
      { keywords: ['centre filled', 'choco'], price: 163 },
      { keywords: ['centre filled', 'berries'], price: 163 },
      { keywords: ['centre filled', 'hazelnut'], price: 163 },
      { keywords: ['black bourbon', 'chocolate'], price: 188 },
      { keywords: ['black bourbon', 'vanilla'], price: 188 },
      { keywords: ['412.5'], price: 658 },
      { keywords: ['choco rolls'], weight: '300', price: 818 },
      { keywords: ['triple delight'], price: 861 },
      { keywords: ['wafer', 'onion'], price: 124 },
      { keywords: ['wafer', 'tomato'], price: 124 },
      { keywords: ['wafer', 'piri'], price: 124 },
      { keywords: ['wafer', 'salted'], price: 124 },
    ];

    const products = await Product.find({});
    let updatedCount = 0;

    for (const product of products) {
      let modified = false;
      const pNameLower = product.name.toLowerCase();

      product.variations.forEach((varItem: any) => {
        const vWeight = (varItem.weight || '').toLowerCase();
        const vFlavor = (varItem.flavor || '').toLowerCase();

        for (const rule of corporatePriceMap) {
          const nameMatches = rule.keywords.every(kw => pNameLower.includes(kw) || vFlavor.includes(kw));
          const weightMatches = !rule.weight || vWeight.includes(rule.weight.toLowerCase());

          if (nameMatches && weightMatches) {
            varItem.corporatePrice = rule.price;
            modified = true;
            break;
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
      message: `Corporate prices updated successfully for ${updatedCount} products.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
