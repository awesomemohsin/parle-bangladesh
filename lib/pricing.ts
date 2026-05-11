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

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.price) || 0;
    // Use variationDiscountPrice if available, otherwise original price
    const effectivePrice = (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
      ? item.variationDiscountPrice
      : itemPrice;
    return sum + effectivePrice * (Number(item.quantity || item.q) || 0);
  }, 0);

  let flatDiscountTotal = 0;

  // Calculate Best Flat Discount per item (Campaign-based only, since variation discounts are now part of subtotal)
  items.forEach(item => {
    const productId = (item.productId || item.id || item._id)?.toString();
    const itemPrice = Number(item.price) || 0;
    const effectivePrice = (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
      ? item.variationDiscountPrice
      : itemPrice;
    const itemQuantity = Number(item.quantity || item.q) || 0;
    const itemEffectiveSubtotal = effectivePrice * itemQuantity;

    let bestDiscountForItem = 0;

    // A. Consider campaign-based flat discounts from PromoCode collection
    flatDiscounts.forEach(rule => {
      // 1. Check product applicability
      const appliesToProduct = rule.allProducts || (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === productId));
      
      // 2. Check minimum order amount
      const minOrderMet = subtotal >= (Number(rule.minOrderAmount) || 0);

      if (appliesToProduct && minOrderMet) {
        let currentDiscount = 0;
        const amount = Number(rule.discountAmount || 0);

        if (rule.discountType === 'percentage') {
          currentDiscount = (itemEffectiveSubtotal * amount) / 100;
        } else {
          currentDiscount = amount * itemQuantity;
        }
        
        // Ensure discount doesn't exceed item subtotal
        currentDiscount = Math.min(itemEffectiveSubtotal, currentDiscount);

        if (currentDiscount > bestDiscountForItem) {
          bestDiscountForItem = currentDiscount;
        }
      }
    });
    
    flatDiscountTotal += bestDiscountForItem;
  });

  // Calculate Promo Discount (stacks on top of remaining total)
  let promoDiscount = 0;
  let applicableSubtotal = 0;

  if (promoDetails) {
    const remainingTotal = subtotal - flatDiscountTotal;
    
    // Check if minimum order amount is met (against the total AFTER automatic discounts)
    const currentMinOrder = Number(promoDetails.minOrderAmount || 0);
    if (currentMinOrder > 0 && remainingTotal < currentMinOrder) {
      applicableSubtotal = 0;
    } else if (promoDetails.allProducts === true) {
      applicableSubtotal = subtotal;
    } else {
      const restrictedIds = (promoDetails.applicableProducts || [])
        .map((id: any) => id?.toString()?.trim()?.toLowerCase())
        .filter(Boolean);
      
      if (restrictedIds.length > 0) {
        items.forEach(item => {
          const possibleIds = [
            item.productId,
            item.id,
            item._id,
            item.productSlug,
            item.slug
          ].map(id => id?.toString()?.trim()?.toLowerCase()).filter(Boolean);
          
          const isMatch = possibleIds.some(id => restrictedIds.includes(id));
          if (isMatch) {
            const itemPrice = Number(item.price) || 0;
            const effectivePrice = (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
              ? item.variationDiscountPrice
              : itemPrice;
            applicableSubtotal += effectivePrice * (Number(item.quantity || item.q) || 0);
          }
        });
      } else {
        applicableSubtotal = 0;
      }
    }

    if (applicableSubtotal > 0) {
      const amount = Number(promoDetails.discountAmount || 0);
      if (amount > 0) {
        if (promoDetails.discountType === 'percentage') {
          promoDiscount = (applicableSubtotal * amount) / 100;
          
          // Apply max discount cap if set
          const maxCap = Number(promoDetails.maxDiscountAmount || 0);
          if (maxCap > 0 && promoDiscount > maxCap) {
            promoDiscount = maxCap;
          }
        } else {
          promoDiscount = Math.min(applicableSubtotal, amount);
        }
        
        // Final cap: Cannot exceed remaining balance
        promoDiscount = Math.min(remainingTotal, promoDiscount);
      }
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
    promoDetails: promoDetails ? JSON.parse(JSON.stringify(promoDetails)) : null,
    isRestricted: promoDetails ? !promoDetails.allProducts : false,
    applicableSubtotal: Number(applicableSubtotal) || 0
  };

  return result;
}
