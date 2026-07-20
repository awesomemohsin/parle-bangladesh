import connectDB from './db';
import { PromoCode, CircleCampaignSetting } from './models';

/**
 * Calculates discounts and totals on the server side to ensure data integrity.
 * This is the single source of truth for all pricing logic.
 * 
 * Logic: Option A (Best Value)
 * 1. For each item, find all applicable flat discounts.
 * 2. Pick the ONE discount that saves the user the most money.
 * 3. Promo codes stack on top of the best flat discount.
 */
export async function calculateServerSideCart(items: any[], promoCode?: string, userDiscount?: { percent: number; expiresAt: Date }, customerType?: string, circleNetworkDiscountApplied?: boolean) {
  await connectDB();
  
  const isDealer = customerType === 'dealer' || customerType === 'employee' || ['admin', 'super_admin', 'superadmin', 'moderator', 'owner'].includes(customerType || '');
  const isRetailer = customerType === 'retailer';
  const isPrivilegedCustomer = isDealer || isRetailer;

  // Fetch Circle Network Campaign setting
  let circleSetting = await CircleCampaignSetting.findOne({ key: 'circle_campaign' }).lean();
  const isCircleActive = circleSetting ? circleSetting.isActive : true;
  const circlePercent = circleSetting && circleSetting.discountPercent !== undefined ? circleSetting.discountPercent : 10;

  // 1. Fetch current active flat discounts
  const flatDiscounts = isPrivilegedCustomer ? [] : (await PromoCode.find({ 
    type: 'flat', 
    isActive: true 
  }).lean()).filter(d => d.currentUsage < d.maxUsage);

  // 2. Fetch promo code if provided
  let promoDetails: any = null;
  if (promoCode && !isDealer) {
    const promo = await PromoCode.findOne({ 
      code: promoCode.toUpperCase(), 
      isActive: true,
      type: 'promo' 
    }).lean();
    if (promo && promo.currentUsage < promo.maxUsage) {
      promoDetails = JSON.parse(JSON.stringify(promo));
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.price) || 0;
    return sum + itemPrice * (Number(item.quantity || item.q) || 0);
  }, 0);

  const circleDiscount = (circleNetworkDiscountApplied && isCircleActive) ? Math.round(subtotal * (circlePercent / 100)) : 0;

  let freeShippingGranted = false;
  let flatDiscountTotal = 0;
  const ruleUsage = new Map<string, number>();

  // Pre-calculate subtotal of targeted products for each flat discount rule based on original MRP
  const ruleSubtotals = new Map<string, number>();
  flatDiscounts.forEach(rule => {
    let ruleSubtotal = 0;
    items.forEach(item => {
      const pId = (item.productId || item.id || item._id)?.toString();
      const itemVarKey = `${pId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      const applies = rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
      if (applies) {
        const itemPrice = Number(item.price) || 0;
        const qty = Number(item.quantity || item.q) || 0;
        ruleSubtotal += itemPrice * qty;
      }
    });
    ruleSubtotals.set(rule._id.toString(), ruleSubtotal);
  });

  // Calculate Best Flat Discount per item (Mutually exclusive: variation vs user vs campaign flat)
  items.forEach(item => {
    const productId = (item.productId || item.id || item._id)?.toString();
    const itemPrice = Number(item.price) || 0;
    const itemQuantity = Number(item.quantity || item.q) || 0;
    const originalItemSubtotal = itemPrice * itemQuantity;

    // 1. Candidate A: Variation Discount
    const variationDiscountAmount = (!isPrivilegedCustomer && item.variationDiscountPrice && item.variationDiscountPrice > 0 && item.variationDiscountPrice < itemPrice)
      ? (itemPrice - item.variationDiscountPrice) * itemQuantity
      : 0;

    // 2. Candidate B: User Discount
    let userDiscountAmount = 0;
    if (!isPrivilegedCustomer && userDiscount && userDiscount.percent > 0 && new Date(userDiscount.expiresAt) > new Date()) {
      userDiscountAmount = (originalItemSubtotal * userDiscount.percent) / 100;
      userDiscountAmount = Math.min(originalItemSubtotal, userDiscountAmount);
    }

    let bestRuleId = null;
    let bestDiscountForItem = 0;

    // Initialize with Variation Discount
    if (variationDiscountAmount > 0) {
      bestDiscountForItem = variationDiscountAmount;
      bestRuleId = 'variation-discount';
    }

    // Compare with User Discount
    if (userDiscount && userDiscountAmount > bestDiscountForItem) {
      bestDiscountForItem = userDiscountAmount;
      bestRuleId = `user-flat-${userDiscount.percent}`;
    }

    // Compare with Campaign-based Flat Discounts
    flatDiscounts.forEach(rule => {
      const itemVarKey = `${productId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      const appliesToProduct = rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === productId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
      const applicableSubtotal = ruleSubtotals.get(rule._id.toString()) || 0;
      const minOrderMet = applicableSubtotal >= (Number(rule.minOrderAmount) || 0);

      if (appliesToProduct && minOrderMet) {
        let currentDiscount = 0;
        const amount = Number(rule.discountAmount || 0);

        if (rule.discountType === 'percentage') {
          currentDiscount = (originalItemSubtotal * amount) / 100;
        } else {
          currentDiscount = amount * itemQuantity;
        }
        
        currentDiscount = Math.min(originalItemSubtotal, currentDiscount);

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
      if (bestRuleId === 'variation-discount' || bestRuleId.startsWith('user-flat-')) {
        flatDiscountTotal += bestDiscountForItem;
      } else {
        const currentRuleTotal = ruleUsage.get(bestRuleId) || 0;
        ruleUsage.set(bestRuleId, currentRuleTotal + bestDiscountForItem);
        (item as any)._appliedRuleId = bestRuleId;
      }
    }

    // Attach server-calculated discount info directly to item object
    item.discountAmount = bestDiscountForItem;
    item.discountedPrice = itemQuantity > 0 ? Math.round((originalItemSubtotal - bestDiscountForItem) / itemQuantity) : itemPrice;
    item.discountedTotal = Math.round(originalItemSubtotal - bestDiscountForItem);
  });
    
  // Apply max caps to each rule's total discount and prepare scaling factors
  const capScalingFactors = new Map<string, number>();

  flatDiscounts.forEach(rule => {
    const ruleId = rule._id.toString();
    const usedAmount = ruleUsage.get(ruleId) || 0;
    const maxCap = Number(rule.maxDiscountAmount || 0);
    
    if (maxCap > 0 && usedAmount > maxCap) {
      flatDiscountTotal += maxCap;
      capScalingFactors.set(ruleId, maxCap / usedAmount);
    } else {
      flatDiscountTotal += usedAmount;
    }
  });

  // Scale down item-level discounts if the rule cap was exceeded
  items.forEach(item => {
    const ruleId = (item as any)._appliedRuleId;
    if (ruleId && capScalingFactors.has(ruleId)) {
      const scale = capScalingFactors.get(ruleId)!;
      item.discountAmount = item.discountAmount * scale;

      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity || item.q) || 0;
      const originalItemSubtotal = itemPrice * itemQuantity;

      item.discountedPrice = itemQuantity > 0 ? Math.round((originalItemSubtotal - item.discountAmount) / itemQuantity) : itemPrice;
      item.discountedTotal = Math.round(originalItemSubtotal - item.discountAmount);
    }
    delete (item as any)._appliedRuleId;
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
      
      const applicableVariations = promoDetails.applicableVariations || [];
      
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
             const itemVarKey = `${item.productId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
             const isVarMatch = applicableVariations.length === 0 || 
               applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase());
               
             if (isVarMatch) {
               const itemPrice = Number(item.price) || 0;
               const itemDiscountedPrice = item.discountedPrice !== undefined ? item.discountedPrice : itemPrice;
               applicableSubtotal += itemDiscountedPrice * (Number(item.quantity || item.q) || 0);
             }
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

  const totalDiscount = flatDiscountTotal + promoDiscount + circleDiscount;
  const total = subtotal - totalDiscount;

  // Calculate dynamic campaign progress notices on the server side
  const campaignNotices: Array<{ offer: string; action: string; unlocked?: boolean }> = [];

  flatDiscounts.forEach(rule => {
    const minOrder = Number(rule.minOrderAmount || 0);
    if (minOrder <= 0) return;

    // Find if the cart has any items targeted by this rule
    const targetedItems = items.filter(item => {
      const pId = (item.productId || item.id || item._id)?.toString();
      const itemVarKey = `${pId}:${(item.weight || '').toString().trim().toLowerCase()}:${(item.flavor || '').toString().trim().toLowerCase()}`;
      return rule.allProducts || (
        rule.applicableProducts && rule.applicableProducts.some((id: any) => id.toString() === pId) && (
          !rule.applicableVariations ||
          rule.applicableVariations.length === 0 ||
          rule.applicableVariations.map((v: string) => v.trim().toLowerCase()).includes(itemVarKey.trim().toLowerCase())
        )
      );
    });

    if (targetedItems.length === 0) return;

    // Calculate dynamic campaign parameters
    const sampleItem = targetedItems[0];
    const productName = sampleItem.productName || "packs";
    const unitPrice = Number(sampleItem.price) || 150;
    
    // Collect targeted variation names for this product
    let variationSuffix = "";
    const pId = (sampleItem.productId || sampleItem.id || sampleItem._id)?.toString();
    if (rule.applicableVariations && rule.applicableVariations.length > 0 && pId) {
      const targetedVars = rule.applicableVariations.filter((v: string) => 
        v.trim().toLowerCase().startsWith(pId.toLowerCase() + ":")
      );
      if (targetedVars.length > 0) {
        const varNames = targetedVars.map((v: string) => {
          const parts = v.split(":");
          const weight = parts[1] ? parts[1].trim() : "";
          const flavor = parts[2] ? parts[2].trim() : "";
          return [weight, flavor].filter(Boolean).join(" - ");
        }).filter(Boolean);
        if (varNames.length > 0) {
          variationSuffix = ` (${varNames.join(", ")})`;
        }
      }
    } else {
      // Fallback: collect from the actual matched items in the cart
      const varNames = Array.from(new Set(targetedItems.map(item => {
        return [item.weight, item.flavor].filter(Boolean).join(" - ");
      }).filter(Boolean)));
      if (varNames.length > 0) {
        variationSuffix = ` (${varNames.join(", ")})`;
      }
    }
    
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
      const usedAmount = ruleUsage.get(rule._id.toString()) || 0;
      const actualSaved = usedAmount > 0 ? Math.min(usedAmount, Number(rule.maxDiscountAmount || 99999999)) : totalDiscount;
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName}${variationSuffix} for ৳${discountedTotal}${freeShippingText}!`,
        action: `✓ Offer Unlocked! You saved ৳${Math.round(actualSaved)}!`,
        unlocked: true
      });
    } else {
      const remainingQty = Math.max(0, targetQty - currentQty);
      campaignNotices.push({
        offer: `Get ${targetQty} packs of ${productName}${variationSuffix} for ৳${discountedTotal}${freeShippingText}!`,
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
    circleDiscount: Number(circleDiscount) || 0,
    total: Number(total) || 0,
    promoCode: promoDetails ? promoDetails.code : null,
    promoDetails: promoDetails ? JSON.parse(JSON.stringify(promoDetails)) : null,
    isRestricted: promoDetails ? !promoDetails.allProducts : false,
    applicableSubtotal: Number(applicableSubtotal) || 0,
    freeShippingGranted: freeShippingGranted,
    campaignNotices: campaignNotices,
    appliedRuleIds: Array.from(ruleUsage.keys())
  };

  return result;
}
