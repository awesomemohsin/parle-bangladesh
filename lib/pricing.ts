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
export async function calculateServerSideCart(items: any[], promoCode?: string, userDiscount?: { percent: number; expiresAt: Date }) {
  await connectDB();
  
  // 1. Fetch current active flat discounts
  const flatDiscounts = await PromoCode.find({ 
    type: 'flat', 
    isActive: true 
  }).lean();

  // 2. Fetch promo code if provided
  let promoDetails: any = null;
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

  let freeShippingGranted = false;
  let flatDiscountTotal = 0;
  const ruleUsage = new Map<string, number>();

  // Pre-calculate subtotal of targeted products for each flat discount rule
  const ruleSubtotals = new Map<string, number>();
  flatDiscounts.forEach(rule => {
    let ruleSubtotal = 0;
    items.forEach(item => {
      const pId = (item.productId || item.id || item._id)?.toString();
      const applies = rule.allProducts || (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId));
      if (applies) {
        const itemPrice = Number(item.price) || 0;
        const effectivePrice = (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
          ? item.variationDiscountPrice
          : itemPrice;
        const qty = Number(item.quantity || item.q) || 0;
        ruleSubtotal += effectivePrice * qty;
      }
    });
    ruleSubtotals.set(rule._id.toString(), ruleSubtotal);
  });

  // Calculate Best Flat Discount per item (Campaign-based only, since variation discounts are now part of subtotal)
  items.forEach(item => {
    const productId = (item.productId || item.id || item._id)?.toString();
    const itemPrice = Number(item.price) || 0;
    const effectivePrice = (item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
      ? item.variationDiscountPrice
      : itemPrice;
    const itemQuantity = Number(item.quantity || item.q) || 0;
    const itemEffectiveSubtotal = effectivePrice * itemQuantity;

    let bestRuleId = null;
    let bestDiscountForItem = 0;

    // A. Consider candidate discount from user's custom flat discount
    if (userDiscount && userDiscount.percent > 0 && new Date(userDiscount.expiresAt) > new Date()) {
      bestDiscountForItem = (itemEffectiveSubtotal * userDiscount.percent) / 100;
      bestDiscountForItem = Math.min(itemEffectiveSubtotal, bestDiscountForItem);
      bestRuleId = `user-flat-${userDiscount.percent}`;
    }

    // B. Consider campaign-based flat discounts from PromoCode collection
    flatDiscounts.forEach(rule => {
      // 1. Check product applicability
      const appliesToProduct = rule.allProducts || (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === productId));
      
      // 2. Check minimum order amount (enforced only on targeted products)
      const applicableSubtotal = ruleSubtotals.get(rule._id.toString()) || 0;
      const minOrderMet = applicableSubtotal >= (Number(rule.minOrderAmount) || 0);

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
          bestRuleId = rule._id.toString();
        }

        // Track free shipping granted by active, qualified flat rules
        if (rule.freeShipping) {
          freeShippingGranted = true;
        }
      }
    });
    
    if (bestRuleId && bestDiscountForItem > 0) {
      const currentRuleTotal = ruleUsage.get(bestRuleId) || 0;
      ruleUsage.set(bestRuleId, currentRuleTotal + bestDiscountForItem);
    }

    // Attach server-calculated discount info directly to item object
    item.discountAmount = bestDiscountForItem;
    item.discountedPrice = itemQuantity > 0 ? Math.round((itemEffectiveSubtotal - bestDiscountForItem) / itemQuantity) : effectivePrice;
    item.discountedTotal = Math.round(itemEffectiveSubtotal - bestDiscountForItem);
  });
    
  // Apply max caps to each rule's total discount
  flatDiscounts.forEach(rule => {
    const ruleId = rule._id.toString();
    const usedAmount = ruleUsage.get(ruleId) || 0;
    const maxCap = Number(rule.maxDiscountAmount || 0);
    
    if (maxCap > 0 && usedAmount > maxCap) {
      flatDiscountTotal += maxCap;
    } else {
      flatDiscountTotal += usedAmount;
    }
  });

  // Add non-global user-specific flat discounts
  ruleUsage.forEach((usedAmount, ruleId) => {
    if (ruleId.startsWith("user-flat-")) {
      flatDiscountTotal += usedAmount;
    }
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

    // If promoDetails grants free shipping, set it to true!
    if (promoDetails.freeShipping) {
      freeShippingGranted = true;
    }
  }

  const totalDiscount = flatDiscountTotal + promoDiscount;
  const total = subtotal - totalDiscount;

  // Calculate dynamic campaign progress notices on the server side
  const campaignNotices: Array<{ offer: string; action: string; unlocked?: boolean }> = [];

  flatDiscounts.forEach(rule => {
    const minOrder = Number(rule.minOrderAmount || 0);
    if (minOrder <= 0) return;

    // Find if the cart has any items targeted by this rule
    const targetedItems = items.filter(item => {
      const pId = (item.productId || item.id || item._id)?.toString();
      return rule.allProducts || (rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId));
    });

    if (targetedItems.length === 0) return;

    // Calculate dynamic campaign parameters
    const sampleItem = targetedItems[0];
    const productName = sampleItem.productName || "packs";
    const unitPrice = Number(sampleItem.price) || 150;
    
    const targetQty = Math.round(minOrder / unitPrice);
    const originalTotal = targetQty * unitPrice;
    
    let totalDiscount = 0;
    if (rule.discountType === 'percentage') {
      totalDiscount = (originalTotal * Number(rule.discountAmount)) / 100;
      const maxCap = Number(rule.maxDiscountAmount || 0);
      if (maxCap > 0 && totalDiscount > maxCap) {
        totalDiscount = maxCap;
      }
    } else {
      totalDiscount = Number(rule.discountAmount) * targetQty;
    }
    
    const discountedTotal = Math.round(originalTotal - totalDiscount);
    const currentQty = targetedItems.reduce((sum, item) => sum + Number(item.quantity || item.q || 0), 0);
    
    const isMet = currentQty >= targetQty;
    const freeShippingText = rule.freeShipping ? " + Free Shipping" : "";

    if (isMet) {
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName} for ৳${discountedTotal}${freeShippingText}!`,
        action: `✓ Offer Unlocked! You saved ৳${Math.round(totalDiscount)}!`,
        unlocked: true
      });
    } else {
      const remainingQty = Math.max(0, targetQty - currentQty);
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName} for ৳${discountedTotal}${freeShippingText}!`,
        action: `Add ${remainingQty} more pack${remainingQty > 1 ? 's' : ''} to unlock this offer!`,
        unlocked: false
      });
    }
  });

  const result = {
    subtotal: Number(subtotal) || 0,
    discountAmount: Number(totalDiscount) || 0,
    promoDiscount: Number(promoDiscount) || 0,
    ruleDiscount: Number(flatDiscountTotal) || 0,
    total: Number(total) || 0,
    promoCode: promoDetails ? promoDetails.code : null,
    promoDetails: promoDetails ? JSON.parse(JSON.stringify(promoDetails)) : null,
    isRestricted: promoDetails ? !promoDetails.allProducts : false,
    applicableSubtotal: Number(applicableSubtotal) || 0,
    freeShippingGranted: freeShippingGranted,
    campaignNotices: campaignNotices
  };

  return result;
}
