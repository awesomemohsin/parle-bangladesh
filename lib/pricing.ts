import connectDB from './db';
import { PromoCode } from './models';

/**
 * Calculates discounts and totals on the server side to ensure data integrity.
 * This is the single source of truth for all pricing logic.
 * 
 * Logic: Option A (Best Value)
 * 1. For each item, find all applicable flat discounts.
 * 2. Pick the ONE discount that saves the user the most money.
 * 3. Promo codes stack on top of the best flat discount.
 */
export async function calculateServerSideCart(items: any[], promoCode?: string) {
  await connectDB();
  
  // 1. Fetch current active flat discounts
  const flatDiscounts = await PromoCode.find({ 
    type: 'flat', 
    isActive: true 
  }).lean();

  // 2. Fetch promo code if provided
  let promoDetails = null;
  if (promoCode) {
    const promo = await PromoCode.findOne({ 
      code: promoCode.toUpperCase(), 
      isActive: true,
      type: 'promo' 
    }).lean();
    if (promo) {
      promoDetails = JSON.parse(JSON.stringify(promo));
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  let flatDiscountTotal = 0;

  // Calculate Best Flat Discount per item
  items.forEach(item => {
    const productId = item.productId?.toString();
    const itemPrice = Number(item.price) || 0;
    const itemQuantity = Number(item.quantity) || 0;
    const itemSubtotal = itemPrice * itemQuantity;

    let bestDiscountForItem = 0;

    // A. Consider the variation's own discountPrice if provided
    if (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice) {
      bestDiscountForItem = (itemPrice - item.variationDiscountPrice) * itemQuantity;
    }

    // B. Consider campaign-based flat discounts from PromoCode collection
    flatDiscounts.forEach(rule => {
      const applies = rule.allProducts || (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === productId));
      
      if (applies) {
        let currentDiscount = 0;
        const amount = Number(rule.discountAmount || 0);

        if (rule.discountType === 'percentage') {
          currentDiscount = (itemSubtotal * amount) / 100;
        } else {
          currentDiscount = amount * itemQuantity;
        }
        
        // Ensure discount doesn't exceed item subtotal
        currentDiscount = Math.min(itemSubtotal, currentDiscount);

        if (currentDiscount > bestDiscountForItem) {
          bestDiscountForItem = currentDiscount;
        }
      }
    });
    
    flatDiscountTotal += bestDiscountForItem;
  });

  // Calculate Promo Discount (stacks on top of remaining total)
  let promoDiscount = 0;
  if (promoDetails) {
    const remainingTotal = subtotal - flatDiscountTotal;
    const amount = Number(promoDetails.discountAmount || 0);

    // If it applies to all products (explicitly or by having no restrictions)
    if (promoDetails.allProducts || !promoDetails.applicableProducts || promoDetails.applicableProducts.length === 0) {
       if (promoDetails.discountType === 'percentage') {
         promoDiscount = (remainingTotal * amount) / 100;
       } else {
         promoDiscount = Math.min(remainingTotal, amount);
       }
    } else {
      // Promo applies to specific products
      const productIdStrings = promoDetails.applicableProducts.map((id: any) => id.toString());
      const applicableItems = items.filter(item => {
        const pId = item.productId?.toString();
        return pId && productIdStrings.includes(pId);
      });
      
      const groupSubtotal = applicableItems.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);

      // Estimate flat discount share for these items to get their "remaining" subtotal
      // Simpler: Promos apply to the group subtotal but capped by the overall remaining total
      if (promoDetails.discountType === 'percentage') {
        promoDiscount = (groupSubtotal * amount) / 100;
      } else {
        promoDiscount = Math.min(groupSubtotal, amount);
      }
      promoDiscount = Math.min(remainingTotal, promoDiscount);
    }
  }

  const totalDiscount = flatDiscountTotal + promoDiscount;
  const total = subtotal - totalDiscount;


  const result = {
    subtotal: Number(subtotal) || 0,
    discountAmount: Number(totalDiscount) || 0,
    promoDiscount: Number(promoDiscount) || 0,
    ruleDiscount: Number(flatDiscountTotal) || 0,
    total: Number(total) || 0,
    promoCode: promoDetails ? promoDetails.code : null,
    promoDetails: promoDetails ? JSON.parse(JSON.stringify(promoDetails)) : null
  };

  return result;
}
