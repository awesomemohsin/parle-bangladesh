'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, getItemKey } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import locationsHierarchy from '@/public/files/locations-hierarchy.json';
import { SearchableSelect } from '@/components/ui/searchable-select';

const lookupPostcodes = (district: string, thana: string): string[] => {
  if (!district || !thana) return [];
  const key = `${district}_${thana}`;
  return (locationsHierarchy as any).postcodes[key] || [];
};


interface OrderState {
  status: 'form' | 'confirming' | 'success' | 'error';
  orderId?: string;
  finalSubtotal?: number;
  finalShippingCost?: number;
  finalDiscountAmount?: number;
  finalDeliveryMethod?: 'shipping' | 'pickup';
  error?: string;
}

// Pricing and discount calculations are now computed strictly on the server side.

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sslEnabled, setSslEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isFeatureFlagTrue = process.env.NEXT_PUBLIC_ENABLE_SSLCOMMERZ === "true";
      if (isFeatureFlagTrue) {
        setSslEnabled(true);
      }
    }
  }, []);

  /*
 // ==========================================
 // BACKUP / DEVELOPER TESTING BACKDOOR:
 // ==========================================
 // Uncomment this block below if you want management/developers to secretly test 
 // online payments on a live server using a URL parameter:
 //   -> https://yourwebsite.com/shop/checkout?payment_test=true
 
 const isTestUrlParam = searchParams.get("payment_test") === "true";
 const isLocalTestAuthorized = localStorage.getItem("ssl_payment_test") === "true";

 if (isTestUrlParam) {
   localStorage.setItem("ssl_payment_test", "true");
   setSslEnabled(true);
   router.replace("/shop/checkout"); // Clean URL parameter
 } else if (isLocalTestAuthorized) {
   setSslEnabled(true);
 }
 */




  const { items, total, subtotal, clearCart, promoCode, promoDetails, discountAmount, promoDiscount, ruleDiscount, isRestricted, isLoading, isSyncing, applyPromo, removePromo, freeShippingGranted, campaignNotices } = useCart();
  const { user, logout, updateAuth } = useAuth();
  const [orderState, setOrderState] = useState<OrderState>({ status: 'form' });
  const [confirmingStep, setConfirmingStep] = useState(0);

  useEffect(() => {
    if (orderState.status === 'confirming') {
      const interval = setInterval(() => {
        setConfirmingStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 700);
      return () => clearInterval(interval);
    } else {
      setConfirmingStep(0);
    }
  }, [orderState.status]);

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Selected Division/District names (defaults to Dhaka Division & Dhaka District)
  const [billingDivision, setBillingDivision] = useState<string>('Dhaka');
  const [billingDistrict, setBillingDistrict] = useState<string>('Dhaka');
  const [shippingDivision, setShippingDivision] = useState<string>('Dhaka');
  const [shippingDistrict, setShippingDistrict] = useState<string>('Dhaka');

  // Previous order state for async resolution
  const [previousOrder, setPreviousOrder] = useState<any>(null);

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || isValidatingPromo) return;
    setPromoError('');
    setIsValidatingPromo(true);

    try {
      const pIds = items.map(item => item.productId).join(',');
      const vars = items.map(item => `${item.productId}:${item.weight || ''}:${item.flavor || ''}`).join(',');
      const res = await fetch(`/api/promo-codes/validate?code=${promoInput.toUpperCase()}&subtotal=${subtotal}&productIds=${pIds}&variations=${vars}`);
      const data = await res.json();

      if (res.ok) {
        applyPromo(data);
        setPromoInput('');
        setShowSuccessAlert(true);
        // Hide alert after 5 seconds
        setTimeout(() => setShowSuccessAlert(false), 5000);
      } else {
        setPromoError(data.error || 'Invalid code');
      }
    } catch (err) {
      setPromoError('Failed to validate code');
    } finally {
      setIsValidatingPromo(false);
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dhaka',
    thana: '',
    postalCode: '',
    shippingAddress: '',
    shippingCity: 'Dhaka',
    shippingThana: '',
    shippingPostalCode: '',
    instruction: '',
    paymentMethod: 'cash_on_delivery',
    password: '',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Available Thanas lists derived from local JSON
  const billingThanas = useMemo<string[]>(() => {
    return ((locationsHierarchy as any).thanas[billingDistrict] || []) as string[];
  }, [billingDistrict]);

  const shippingThanas = useMemo<string[]>(() => {
    const dist = sameAsBilling ? billingDistrict : shippingDistrict;
    return ((locationsHierarchy as any).thanas[dist] || []) as string[];
  }, [sameAsBilling, billingDistrict, shippingDistrict]);
  const [prefilled, setPrefilled] = useState({ name: false, email: false, phone: false });
  const [emailReadOnly, setEmailReadOnly] = useState(false);
  const [srDiscountPercent, setSrDiscountPercent] = useState<number>(0);
  const [srDiscountTaka, setSrDiscountTaka] = useState<string>('');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPhoneRegistered, setIsPhoneRegistered] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.title = 'Checkout | Parle Bangladesh';

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const activeShopStr = typeof window !== 'undefined' ? localStorage.getItem('sr_active_shop_id') : null;
    setIsLoggedIn(!!token && (!!userStr || !!activeShopStr));

    // Check if there is an active shop impersonation in localStorage
    const activeShopStrUser = typeof window !== 'undefined' ? localStorage.getItem('sr_active_shop_user') : null;

    let targetProfile: any = null;
    if (activeShopStrUser) {
      try {
        targetProfile = JSON.parse(activeShopStrUser);
      } catch (e) { }
    }
    if (!targetProfile && userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        targetProfile = {
          name: parsedUser.name,
          email: parsedUser.email,
          mobile: parsedUser.mobile
        };
      } catch (e) { }
    }

    if (targetProfile) {
      const isVirtualEmail = targetProfile.email?.endsWith('@phone.parle.com');
      const displayEmail = isVirtualEmail ? '' : (targetProfile.email || '');

      setFormData(prev => ({
        ...prev,
        name: targetProfile.name || prev.name,
        email: displayEmail,
        phone: targetProfile.mobile || prev.phone,
      }));
      setPrefilled({
        name: !!targetProfile.name,
        email: !isVirtualEmail && !!targetProfile.email,
        phone: !!targetProfile.mobile
      });
    }

    // Fetch previous order address to autofill (but keep editable)
    const fetchPreviousOrderAddress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const activeShopId = localStorage.getItem("sr_active_shop_id");
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`
        };
        if (activeShopId) {
          headers['x-on-behalf-of'] = activeShopId;
        }

        const res = await fetch('/api/orders?limit=1', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.orders && data.orders.length > 0) {
            setPreviousOrder(data.orders[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch previous order address:", err);
      }
    };

    fetchPreviousOrderAddress();

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const phone = formData.phone.trim();
    const mobileRegex = /^01[3-9]\d{8}$/;

    // 1. Validation check for phone format and 11 digits
    if (phone.length > 0) {
      if (phone.length < 11) {
        setPhoneError("Please enter a correct 11-digit mobile number.");
        setIsPhoneRegistered(false);
      } else if (!mobileRegex.test(phone)) {
        setPhoneError("Please enter a valid BD phone number (e.g. 01XXXXXXXXX).");
        setIsPhoneRegistered(false);
      } else {
        setPhoneError(""); // valid format!
      }
    } else {
      setPhoneError("");
      setIsPhoneRegistered(false);
    }

    // 2. Lookup check if it is valid 11 digits
    if (mobileRegex.test(phone)) {
      const lookupEmail = async () => {
        try {
          const res = await fetch(`/api/users/lookup?phone=${phone}`);
          if (res.ok) {
            const data = await res.json();
            if (data.email) {
              setFormData(prev => ({ ...prev, email: data.email }));
              setEmailReadOnly(true);
            } else {
              setEmailReadOnly(false);
            }
            // Set if the phone is already registered as a User
            setIsPhoneRegistered(!!data.isRegistered);
          }
        } catch (err) {
          console.error("Error looking up email by phone:", err);
        }
      };
      lookupEmail();
    } else {
      setEmailReadOnly(false);
      setIsPhoneRegistered(false);
    }
  }, [formData.phone, mounted]);

  // Handle billing thana change: reset/auto-select postcode
  useEffect(() => {
    if (formData.thana) {
      const codes = lookupPostcodes(billingDistrict, formData.thana);
      if (codes.length === 1) {
        setFormData(prev => ({ ...prev, postalCode: codes[0] }));
      } else {
        if (!codes.includes(formData.postalCode)) {
          setFormData(prev => ({ ...prev, postalCode: "" }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, postalCode: "" }));
    }
  }, [formData.thana, billingDistrict]);

  // Handle shipping thana change: reset/auto-select postcode
  useEffect(() => {
    if (formData.shippingThana) {
      const dist = sameAsBilling ? billingDistrict : shippingDistrict;
      const codes = lookupPostcodes(dist, formData.shippingThana);
      if (codes.length === 1) {
        setFormData(prev => ({ ...prev, shippingPostalCode: codes[0] }));
      } else {
        if (!codes.includes(formData.shippingPostalCode)) {
          setFormData(prev => ({ ...prev, shippingPostalCode: "" }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, shippingPostalCode: "" }));
    }
  }, [formData.shippingThana, sameAsBilling, billingDistrict, shippingDistrict]);

  // Asynchronous historic address resolver
  useEffect(() => {
    if (!previousOrder) return;

    const lastOrder = previousOrder;
    const isLastEmailVirtual = lastOrder.customerEmail?.endsWith('@phone.parle.com');
    const displayLastEmail = isLastEmailVirtual ? '' : (lastOrder.customerEmail || '');

    // Resolve billing division and district names from the historic city name
    let billDiv = 'Dhaka';
    let billDist = 'Dhaka';

    if (lastOrder.city) {
      for (const [div, dists] of Object.entries((locationsHierarchy as any).districts)) {
        if ((dists as string[]).includes(lastOrder.city)) {
          billDiv = div;
          billDist = lastOrder.city;
          break;
        }
      }
    }
    setBillingDivision(billDiv);
    setBillingDistrict(billDist);

    // Resolve shipping division and district names
    let shipDiv = billDiv;
    let shipDist = billDist;

    if (lastOrder.shippingCity && lastOrder.shippingCity !== 'N/A') {
      for (const [div, dists] of Object.entries((locationsHierarchy as any).districts)) {
        if ((dists as string[]).includes(lastOrder.shippingCity)) {
          shipDiv = div;
          shipDist = lastOrder.shippingCity;
          break;
        }
      }
    }
    setShippingDivision(shipDiv);
    setShippingDistrict(shipDist);

    setFormData(prev => ({
      ...prev,
      name: prev.name || lastOrder.customerName || '',
      email: prev.email || displayLastEmail || '',
      phone: prev.phone || lastOrder.customerPhone || '',
      address: lastOrder.address || prev.address,
      city: lastOrder.city || prev.city,
      thana: lastOrder.thana || prev.thana || '',
      postalCode: lastOrder.postalCode || prev.postalCode,
      shippingAddress: lastOrder.shippingAddress || prev.shippingAddress,
      shippingCity: lastOrder.shippingCity || prev.shippingCity,
      shippingThana: lastOrder.shippingThana || prev.shippingThana || '',
      shippingPostalCode: lastOrder.shippingPostalCode || prev.shippingPostalCode,
    }));
  }, [previousOrder]);

  useEffect(() => {
    return () => {
      // Clear promo code when leaving checkout
      // We wrap it in a check to ensure it only happens when navigating AWAY
      // rather than just a re-render or strict-mode double-effect
      removePromo();
    };
  }, [removePromo]);

  useEffect(() => {
    if (mounted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [mounted]);

  if (!mounted) return null;

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-white font-sans p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full bg-slate-50 animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (orderState.status === 'confirming') {
    const steps = [
      "Validating cart items...",
      "Allocating warehouse stock...",
      "Securing connection...",
      "Finalizing invoice details..."
    ];

    return (
      <div className="min-h-[60vh] bg-white flex flex-col items-center pt-12 pb-24 p-8 font-sans">
        <div className="relative flex items-center justify-center mb-8">
          <div className="w-24 h-24 border-8 border-red-50 rounded-full animate-pulse" />
          <div className="w-24 h-24 border-8 border-red-600 border-t-transparent rounded-full animate-spin absolute" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight text-center mb-6">
          Processing Your Order
        </h1>
        <div className="w-full max-w-sm bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
          {steps.map((step, idx) => {
            const isCompleted = confirmingStep > idx;
            const isActive = confirmingStep === idx;
            return (
              <div key={idx} className="flex items-center gap-3 transition-all duration-300">
                {isCompleted ? (
                  <span className="flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-[10px] font-black shrink-0">✓</span>
                ) : isActive ? (
                  <span className="flex h-5 w-5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-white items-center justify-center text-[10px] font-bold">➔</span>
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-gray-200 bg-white shrink-0" />
                )}
                <span className={`text-xs font-bold transition-colors ${isCompleted ? 'text-gray-400 line-through' :
                  isActive ? 'text-gray-900 font-black' : 'text-gray-300'
                  }`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest mt-8 text-center max-w-xs leading-relaxed">
          Please do not close this window or hit back. We are coordinating securely with central databases.
        </p>
      </div>
    );
  }

  if (items.length === 0 && orderState.status !== 'success') {
    return (
      <div className="min-h-screen bg-white font-sans p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link href="/shop" className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">Back to Shop</span>
          </Link>
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 uppercase tracking-tight">Your cart is empty</h1>
            <p className="text-gray-500 mb-8 font-bold uppercase text-[10px] tracking-widest">Add products before checking out.</p>
            <Link href="/shop">
              <Button className="bg-amber-700 hover:bg-black text-white h-14 px-10 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use the synchronized values from the CartContext (server-side calculation)
  // Note: we might need to handle shipping cost locally as it depends on the form
  const getEffectiveUser = () => {
    if (typeof window !== "undefined") {
      const activeShopStr = localStorage.getItem("sr_active_shop_user");
      if (activeShopStr) {
        try {
          return JSON.parse(activeShopStr);
        } catch (e) { }
      }
    }
    return user;
  };
  const effUser = getEffectiveUser();

  const isB2BUser = !!(effUser && (
    ['retailer', 'dealer', 'employee', 'admin', 'super_admin', 'superadmin', 'moderator', 'owner'].includes(effUser.customerType || '') ||
    ['super_admin', 'admin', 'moderator', 'owner'].includes(effUser.role)
  ));
  const isFreeDelivery = total >= 1000 || !!freeShippingGranted || isB2BUser;
  const destinationCity = sameAsBilling ? formData.city : formData.shippingCity;
  const baseShippingCharge = (destinationCity === 'Dhaka' || destinationCity === 'Dhaka Metro') ? 80 : 130;
  const currentShippingCost = deliveryMethod === 'pickup' ? 0 : (isFreeDelivery ? 0 : baseShippingCharge);

  const isImpersonator = user?.isSR || ["super_admin", "admin", "moderator", "owner"].includes(user?.role || "");
  const activeShopId = typeof window !== "undefined" ? localStorage.getItem("sr_active_shop_id") : null;
  const showNegotiatedDiscount = isImpersonator && !!activeShopId;

  const productSubtotal = subtotal;
  const srDiscountAmount = showNegotiatedDiscount ? Math.round(productSubtotal * (srDiscountPercent / 100)) : 0;

  // The final total should be server-side net total + shippingCost - srDiscountAmount
  const grandTotal = Math.max(0, total + currentShippingCost - srDiscountAmount);
  const displayPromoDiscount = promoDiscount || 0;
  const shippingCost = currentShippingCost;

  const getBillingPostalCodes = () => {
    if (!formData.thana) return [];
    const codes = [...lookupPostcodes(billingDistrict, formData.thana)];
    if (formData.postalCode && !codes.includes(formData.postalCode)) {
      codes.push(formData.postalCode);
    }
    return codes;
  };

  const getShippingPostalCodes = () => {
    const thana = sameAsBilling ? formData.thana : formData.shippingThana;
    const district = sameAsBilling ? billingDistrict : shippingDistrict;
    const currentCode = sameAsBilling ? formData.postalCode : formData.shippingPostalCode;
    if (!thana) return [];
    const codes = [...lookupPostcodes(district, thana)];
    if (currentCode && !codes.includes(currentCode)) {
      codes.push(currentCode);
    }
    return codes;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValidationError('');
    setFormErrors(prev => ({ ...prev, [name]: '' }));
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBillingDivisionChange = (val: string) => {
    setValidationError('');
    setBillingDivision(val);
    setBillingDistrict('');
    setFormData(prev => ({ ...prev, city: '', thana: '', postalCode: '' }));
  };

  const handleBillingDistrictChange = (val: string) => {
    setValidationError('');
    setBillingDistrict(val);
    setFormData(prev => ({ ...prev, city: val, thana: '', postalCode: '' }));
  };

  const handleShippingDivisionChange = (val: string) => {
    setValidationError('');
    setShippingDivision(val);
    setShippingDistrict('');
    setFormData(prev => ({ ...prev, shippingCity: '', shippingThana: '', shippingPostalCode: '' }));
  };

  const handleShippingDistrictChange = (val: string) => {
    setValidationError('');
    setShippingDistrict(val);
    setFormData(prev => ({ ...prev, shippingCity: val, shippingThana: '', shippingPostalCode: '' }));
  };

  const handleSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameAsBilling(e.target.checked);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    const shakeMap: Record<string, boolean> = {};

    if (!formData.name) {
      newErrors.name = "Please enter your name first";
      shakeMap.name = true;
    }
    if (!formData.phone) {
      newErrors.phone = "Please enter your phone number first";
      shakeMap.phone = true;
    }
    if (!formData.address) {
      newErrors.address = "Please enter your street address first";
      shakeMap.address = true;
    }
    if (!formData.city) {
      newErrors.city = "Please select your district first";
      shakeMap.city = true;
    }
    if (!formData.thana) {
      newErrors.thana = "Please select your thana first";
      shakeMap.thana = true;
    }
    if (!formData.postalCode) {
      newErrors.postalCode = "Please select your postcode first";
      shakeMap.postalCode = true;
    }

    if (!sameAsBilling && deliveryMethod !== 'pickup') {
      if (!formData.shippingAddress) {
        newErrors.shippingAddress = "Please enter your shipping address first";
        shakeMap.shippingAddress = true;
      }
      if (!formData.shippingCity) {
        newErrors.shippingCity = "Please select your shipping district first";
        shakeMap.shippingCity = true;
      }
      if (!formData.shippingThana) {
        newErrors.shippingThana = "Please select your shipping thana first";
        shakeMap.shippingThana = true;
      }
      if (!formData.shippingPostalCode) {
        newErrors.shippingPostalCode = "Please select your shipping postcode first";
        shakeMap.shippingPostalCode = true;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setShakingFields(shakeMap);
      setValidationError("Please check the highlighted fields above and select/fill them first.");

      // Reset shaking after animation finishes
      setTimeout(() => {
        setShakingFields({});
      }, 500);

      // Focus and scroll to first invalid field
      const firstInvalidField = Object.keys(newErrors)[0];
      if (firstInvalidField) {
        const el = document.getElementById(`field-wrapper-${firstInvalidField}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = el.querySelector('input, select, button');
          if (input) {
            setTimeout(() => {
              (input as HTMLElement).focus();
            }, 300);
          }
        }
      }
      return;
    }

    setValidationError('');
    setFormErrors({});
    setShakingFields({});
    const currentSubtotal = subtotal; // Use original price for the database subtotal field
    setOrderState({ status: 'confirming' });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        productSlug: item.productSlug,
        quantity: item.quantity,
        weight: item.weight,
        flavor: item.flavor,
        image: item.image,
        price: item.price,
        name: item.productName,
      }));

      // Create order
      const token = localStorage.getItem('token');
      const activeShopId = localStorage.getItem("sr_active_shop_id");
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      if (activeShopId) {
        headers['x-on-behalf-of'] = activeShopId;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: orderItems,
          billingAddress: {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            thana: formData.thana,
            postalCode: formData.postalCode,
          },
          shippingAddress: {
            address: sameAsBilling ? formData.address : formData.shippingAddress,
            city: sameAsBilling ? formData.city : formData.shippingCity,
            thana: sameAsBilling ? formData.thana : formData.shippingThana,
            postalCode: sameAsBilling ? formData.postalCode : formData.shippingPostalCode,
          },
          instruction: formData.instruction,
          paymentMethod: formData.paymentMethod,
          deliveryMethod,
          promoCode,
          discountAmount: (discountAmount || 0) + srDiscountAmount,
          srDiscountPercent,
          srDiscountAmount,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) logout();
        throw new Error(data.error || 'Failed to place order');
      }

      const order = await response.json();
      clearCart();

      if (order.token && order.user) {
        updateAuth(order.user, order.token);
      }

      // Keep active shop session details so the SR doesn't have to re-select the shop after placing an order

      if (order.paymentMethod === "sslcommerz" && order.gatewayUrl) {
        window.location.href = order.gatewayUrl;
      } else {
        router.push(`/shop/order-received/${order.id}${order.autoSignUp ? '?new_signup=true' : ''}`);
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setOrderState({
        status: 'error',
        error: message,
      });
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };


  // Error State
  if (orderState.status === 'error') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/shop/cart" className="flex items-center gap-2 text-amber-700 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Failed</h1>
            <p className="text-red-600 text-lg mb-8">{orderState.error}</p>
            <Link href="/shop/checkout">
              <Button className="bg-amber-700 hover:bg-amber-800 text-white">
                Try Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Checkout Form
  return (
    <div className="min-h-screen bg-white font-sans px-8 pt-2 pb-12">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/shop/cart" className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Success Alert */}
        <AnimatePresence>
          {showSuccessAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-5 flex items-center gap-3 bg-[#f3f9f1] border border-[#d6e9c6] p-4 rounded-md shadow-sm"
            >
              <div className="w-6 h-6 bg-[#82b440] rounded flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-600">Coupon code applied successfully.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmitOrder} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Checkout Form - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Contact Information</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div id="field-wrapper-name" className={`flex-1 ${shakingFields.name ? 'animate-shake' : ''}`}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-50 border rounded focus:outline-none focus:ring-1 transition-all ${formErrors.name ? 'error-border' : 'border-gray-200 focus:border-red-600 focus:ring-red-600'}`}
                      placeholder="John Doe"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      readOnly={prefilled.email || emailReadOnly}
                      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${(prefilled.email || emailReadOnly) ? 'opacity-70 cursor-not-allowed' : ''}`}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className={!isLoggedIn ? "grid grid-cols-1 md:grid-cols-2 gap-3" : ""}>
                  <div id="field-wrapper-phone" className={shakingFields.phone ? 'animate-shake' : ''}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-2 bg-gray-50 border rounded focus:outline-none focus:ring-1 transition-all ${formErrors.phone || phoneError
                        ? 'error-border'
                        : 'border-gray-200 focus:border-red-600 focus:ring-red-600'
                        }`}
                      placeholder="01XXXXXXXXX"
                    />
                    {(phoneError || formErrors.phone) && (
                      <p className="text-[10px] text-red-650 font-bold uppercase tracking-wide leading-tight mt-1 animate-in fade-in duration-200">
                        ⚠️ {phoneError || formErrors.phone}
                      </p>
                    )}
                  </div>

                  {!isLoggedIn && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                        <span>New Password (Optional)</span>
                        {isPhoneRegistered ? (
                          <span className="text-[9px] text-green-600 lowercase tracking-normal font-medium normal-case font-bold">(Account Detected)</span>
                        ) : (
                          <span className="text-[9px] text-amber-600 lowercase tracking-normal font-medium normal-case font-bold">(Keep Blank = Phone Number)</span>
                        )}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        disabled={isPhoneRegistered}
                        className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all ${isPhoneRegistered ? 'opacity-60 cursor-not-allowed bg-gray-150/50' : ''
                          }`}
                        placeholder={isPhoneRegistered ? "Checked out as guest" : "Choose password (min 6 chars)"}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="border-t pt-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Billing Address</h2>
              <div className="space-y-3">
                <div id="field-wrapper-address" className={shakingFields.address ? 'animate-shake' : ''}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 bg-gray-50 border rounded focus:outline-none focus:ring-1 transition-all ${formErrors.address ? 'error-border' : 'border-gray-200 focus:border-red-600 focus:ring-red-600'}`}
                    placeholder="House #, Road #"
                  />
                  {formErrors.address && (
                    <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Division *</label>
                    <SearchableSelect
                      value={billingDivision}
                      onChange={handleBillingDivisionChange}
                      options={(locationsHierarchy as any).divisions.map((div: string) => ({ value: div, label: div }))}
                      placeholder="-- Select Division --"
                      searchPlaceholder="Search division..."
                      required
                    />
                  </div>
                  <div id="field-wrapper-city" className={shakingFields.city ? 'animate-shake' : ''}>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">City / District *</label>
                    <div className={formErrors.city ? 'error-border rounded' : ''}>
                      <SearchableSelect
                        value={billingDistrict}
                        onChange={handleBillingDistrictChange}
                        options={((locationsHierarchy as any).districts[billingDivision] || []).map((d: string) => ({ value: d, label: d }))}
                        placeholder="-- Select District --"
                        searchPlaceholder="Search district..."
                        required
                        disabled={!billingDivision}
                      />
                    </div>
                    {formErrors.city && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.city}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div id="field-wrapper-thana" className={shakingFields.thana ? 'animate-shake' : ''}>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Thana *</label>
                    <div className={formErrors.thana ? 'error-border rounded' : ''}>
                      <SearchableSelect
                        value={formData.thana}
                        onChange={(val) => handleInputChange({ target: { name: 'thana', value: val } } as any)}
                        options={billingThanas.map(t => ({ value: t, label: t }))}
                        placeholder="-- Select Thana --"
                        searchPlaceholder="Search thana..."
                        required
                        disabled={!billingDistrict}
                      />
                    </div>
                    {formErrors.thana && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.thana}</p>
                    )}
                  </div>
                  <div id="field-wrapper-postalCode" className={shakingFields.postalCode ? 'animate-shake' : ''}>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Postal Code *</label>
                    <div className={formErrors.postalCode ? 'error-border rounded' : ''}>
                      <SearchableSelect
                        value={formData.postalCode}
                        onChange={(val) => handleInputChange({ target: { name: 'postalCode', value: val } } as any)}
                        options={getBillingPostalCodes().map(pc => ({ value: pc, label: pc }))}
                        placeholder="-- Select Postal Code --"
                        searchPlaceholder="Search postal code..."
                        required
                        disabled={!formData.thana}
                      />
                    </div>
                    {formErrors.postalCode && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Method Selection */}
            <div className="border-t pt-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b">Delivery Method</h2>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${deliveryMethod === 'shipping' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={deliveryMethod === 'shipping'} onChange={() => setDeliveryMethod('shipping')} />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Home Delivery</span>
                    <span className="text-[11px] text-gray-500 mt-1">Inside Dhaka: ৳ 80 | Outside Dhaka: ৳ 130</span>
                  </div>
                </label>
                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${deliveryMethod === 'pickup' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">Collection Point Pickup</span>
                    <span className="text-sm text-gray-500">Free pickup from our location</span>
                  </div>
                </label>
              </div>
              {deliveryMethod === 'pickup' && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-bold text-amber-800 mb-2">Pickup Location:</p>
                  <p className="text-sm text-amber-900 font-medium mb-1">
                    Yassin Tower, Savar Palli Bidyut Bazar Road, Dendabor, Ashulia, Savar, Dhaka 1344.
                  </p>
                  <p className="text-sm text-amber-700">Please collect your order from our official collection point.</p>
                  <a href="https://maps.app.goo.gl/pp3pwo3hyPm87ST79" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-red-600 hover:text-red-700 font-bold text-sm underline">
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Shipping Information */}
            {deliveryMethod === 'shipping' && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                  <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={handleSameAsBillingChange}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-600"
                    />
                    <span className="text-sm text-gray-600">Same as billing address</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div id="field-wrapper-shippingAddress" className={shakingFields.shippingAddress ? 'animate-shake' : ''}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipping Address *</label>
                    <input
                      type="text"
                      name="shippingAddress"
                      value={sameAsBilling ? formData.address : formData.shippingAddress}
                      onChange={handleInputChange}
                      required
                      readOnly={sameAsBilling}
                      className={`w-full px-4 py-2 bg-gray-50 border rounded focus:outline-none focus:ring-1 transition-all ${sameAsBilling ? 'opacity-70 cursor-not-allowed text-gray-500 border-gray-200' : (formErrors.shippingAddress ? 'error-border' : 'border-gray-200 focus:border-red-600 focus:ring-red-600')}`}
                      placeholder="House #, Road #"
                    />
                    {!sameAsBilling && formErrors.shippingAddress && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.shippingAddress}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Division *</label>
                      <SearchableSelect
                        value={sameAsBilling ? billingDivision : shippingDivision}
                        onChange={handleShippingDivisionChange}
                        options={(locationsHierarchy as any).divisions.map((div: string) => ({ value: div, label: div }))}
                        placeholder="-- Select Division --"
                        searchPlaceholder="Search division..."
                        required
                        disabled={sameAsBilling}
                      />
                    </div>
                    <div id="field-wrapper-shippingCity" className={shakingFields.shippingCity ? 'animate-shake' : ''}>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">City / District *</label>
                      <div className={!sameAsBilling && formErrors.shippingCity ? 'error-border rounded' : ''}>
                        <SearchableSelect
                          value={sameAsBilling ? billingDistrict : shippingDistrict}
                          onChange={handleShippingDistrictChange}
                          options={((locationsHierarchy as any).districts[sameAsBilling ? billingDivision : shippingDivision] || []).map((d: string) => ({ value: d, label: d }))}
                          placeholder="-- Select District --"
                          searchPlaceholder="Search district..."
                          required
                          disabled={sameAsBilling || !(sameAsBilling ? billingDivision : shippingDivision)}
                        />
                      </div>
                      {!sameAsBilling && formErrors.shippingCity && (
                        <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.shippingCity}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div id="field-wrapper-shippingThana" className={shakingFields.shippingThana ? 'animate-shake' : ''}>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Thana *</label>
                      <div className={!sameAsBilling && formErrors.shippingThana ? 'error-border rounded' : ''}>
                        <SearchableSelect
                          value={sameAsBilling ? formData.thana : formData.shippingThana}
                          onChange={(val) => handleInputChange({ target: { name: 'shippingThana', value: val } } as any)}
                          options={(sameAsBilling ? billingThanas : shippingThanas).map(t => ({ value: t, label: t }))}
                          placeholder="-- Select Thana --"
                          searchPlaceholder="Search thana..."
                          required
                          disabled={sameAsBilling || !(sameAsBilling ? billingDistrict : shippingDistrict)}
                        />
                      </div>
                      {!sameAsBilling && formErrors.shippingThana && (
                        <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.shippingThana}</p>
                      )}
                    </div>
                    <div id="field-wrapper-shippingPostalCode" className={shakingFields.shippingPostalCode ? 'animate-shake' : ''}>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 truncate whitespace-nowrap h-4">Postal Code *</label>
                      <div className={!sameAsBilling && formErrors.shippingPostalCode ? 'error-border rounded' : ''}>
                        <SearchableSelect
                          value={sameAsBilling ? formData.postalCode : formData.shippingPostalCode}
                          onChange={(val) => handleInputChange({ target: { name: 'shippingPostalCode', value: val } } as any)}
                          options={getShippingPostalCodes().map(pc => ({ value: pc, label: pc }))}
                          placeholder="-- Select Postal Code --"
                          searchPlaceholder="Search postal code..."
                          required
                          disabled={sameAsBilling || !(sameAsBilling ? formData.thana : formData.shippingThana)}
                        />
                      </div>
                      {!sameAsBilling && formErrors.shippingPostalCode && (
                        <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ {formErrors.shippingPostalCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Sticky Container) */}
          <div className="space-y-4 lg:sticky lg:top-8 h-fit">
            {/* Order Summary */}
            <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-hidden">
              <h2 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b flex items-center justify-between">
                <span>Order Summary</span>
                {isSyncing && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                    <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    Syncing...
                  </span>
                )}
              </h2>
              {campaignNotices && campaignNotices.length > 0 && (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Flat Discount Requirement Notice */}
                  {campaignNotices.map((notice, idx) => {
                    const isUnlocked = !!(notice as any).unlocked;
                    return (
                      <div
                        key={idx}
                        className={`border rounded-md p-3 mb-3 flex items-start gap-2.5 shadow-sm transition-colors duration-300 ${isUnlocked
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-amber-50 border-amber-200"
                          }`}
                      >
                        {isUnlocked ? (
                          <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Tag className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-tight italic leading-tight transition-colors duration-300 ${isUnlocked ? "text-emerald-900" : "text-amber-900"
                            }`}>
                            {notice.offer}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 transition-colors duration-300 ${isUnlocked ? "text-emerald-600" : "text-amber-600/80"
                            }`}>
                            {notice.action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => {
                  const itemKey = getItemKey(item);
                  return (
                    <div key={itemKey} className="flex justify-between text-xs sm:text-sm gap-2">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">{item.productName} x {item.quantity}</span>
                        {(item.weight || item.flavor) && (
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            {[item.weight, item.flavor].filter(Boolean).join(" | ")}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">
                        ৳ {Math.round(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-left mb-4 border-t pt-3">
                {/* Subtotal (Discounted by flat rules) */}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[9px] tracking-widest">Subtotal</span>
                  <span className="font-semibold text-gray-900">৳ {Math.round(productSubtotal)}</span>
                </div>

                {/* Automatic/Campaign Discount */}
                {(ruleDiscount || 0) > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span className="font-bold uppercase text-[9px] tracking-widest">
                      {user?.customerType ? `${user.customerType.toUpperCase()} Discount` : "Automatic Discount"}
                    </span>
                    <span className="font-semibold">- ৳ {Math.round(ruleDiscount || 0)}</span>
                  </div>
                )}

                {/* Delivery Charge */}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[9px] tracking-widest">Delivery Charge</span>
                  <span className={`font-semibold ${shippingCost === 0 ? 'text-green-600 font-extrabold' : 'text-gray-900'}`}>
                    {shippingCost === 0 ? 'FREE' : `৳ ${Math.round(shippingCost)}`}
                  </span>
                </div>

                {/* Coupon Discount */}
                {promoCode && (
                  <div className="border-t border-gray-100 py-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold uppercase text-[9px] tracking-widest text-gray-500">
                        Coupon ({promoCode}):
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">- ৳ {Math.round(displayPromoDiscount)}</span>
                        <button
                          type="button"
                          onClick={removePromo}
                          className="text-[9px] font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          [Remove] <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    {isRestricted && (
                      <p className="text-[8px] text-amber-600 font-bold uppercase tracking-tight leading-none italic">
                        * Valid for selected items only
                      </p>
                    )}
                  </div>
                )}

                {/* SR Negotiated Discount Row */}
                {showNegotiatedDiscount && srDiscountPercent > 0 && (
                  <div className="flex justify-between text-teal-600 font-medium py-1">
                    <span className="font-bold uppercase text-[9px] tracking-widest">Negotiated Discount</span>
                    <span className="font-semibold">- ৳ {Math.round(srDiscountAmount)}</span>
                  </div>
                )}

                {/* PROMO CODE INPUT SECTION */}
                {!promoCode && (
                  <div className="py-3 border-y border-gray-100 my-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Have a Discount Code?</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 focus:border-red-600 rounded px-3 py-1.5 text-[10px] font-bold transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={isValidatingPromo}
                        className="bg-gray-900 text-white px-3 rounded text-[9px] font-black uppercase hover:bg-red-600 transition-colors active:scale-95 flex items-center justify-center min-w-[70px] disabled:opacity-50"
                      >
                        {isValidatingPromo ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {promoError && (
                      <p className="mt-1.5 text-[8px] font-black text-red-600 uppercase tracking-widest">{promoError}</p>
                    )}
                  </div>
                )}

                {/* SR NEGOTIATED DISCOUNT INPUT */}
                {showNegotiatedDiscount && (
                  <div className="py-3 border-b border-gray-100 my-2">
                    <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest block mb-2">
                      Negotiated Discount
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={Math.round(subtotal * 0.15)}
                        step="1"
                        placeholder="Discount ৳"
                        value={srDiscountTaka}
                        onChange={(e) => {
                          const rawString = e.target.value;
                          setSrDiscountTaka(rawString);

                          const rawVal = Number(rawString) || 0;
                          const maxDiscountTaka = Math.round(subtotal * 0.15);
                          const val = Math.min(maxDiscountTaka, Math.max(0, rawVal));

                          if (rawVal > maxDiscountTaka) {
                            setSrDiscountTaka(maxDiscountTaka.toString());
                          }

                          if (subtotal > 0) {
                            const pct = Math.min(15, (val / subtotal) * 100);
                            setSrDiscountPercent(Number(pct.toFixed(4)));
                          } else {
                            setSrDiscountPercent(0);
                          }
                        }}
                        className="w-full bg-white border border-gray-200 focus:border-teal-600 rounded px-3 py-1.5 text-[10px] font-bold transition-all outline-none"
                      />
                      <span className="text-xs font-bold text-gray-500 shrink-0">৳</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3 items-end transition-all duration-300">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-gray-900 text-lg">Grand Total</span>
                    {((discountAmount || 0) + srDiscountAmount) > 0 && (
                      <span className="text-[10px] font-black text-white bg-green-600 px-2 py-1 rounded uppercase tracking-tighter shadow-sm animate-bounce-slow">
                        Saved ৳{Math.round((discountAmount || 0) + srDiscountAmount)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-red-600 leading-none">
                    ৳ {Math.round(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delivery Instruction</h2>
              <textarea
                name="instruction"
                value={formData.instruction}
                onChange={(e: any) => handleInputChange(e)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all resize-y"
                placeholder="Any specific instructions?"
              ></textarea>
            </div>

            {/* Payment Method & Submit */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Payment Method</h2>
              <div className="space-y-3 mb-4">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'cash_on_delivery' ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={formData.paymentMethod === 'cash_on_delivery'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-600 accent-red-600 focus:ring-red-600"
                  />
                  <div className="ml-3">
                    <span className="block font-bold text-gray-900 text-sm">Cash on Delivery</span>
                  </div>
                </label>

                {sslEnabled && (
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'sslcommerz' ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="sslcommerz"
                      checked={formData.paymentMethod === 'sslcommerz'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-600 accent-red-600 focus:ring-red-600"
                    />
                    <div className="ml-3">
                      <span className="block font-bold text-gray-900 text-sm">Online Payment (Cards/MFS)</span>
                      <span className="block text-[10px] text-gray-500 font-medium">SSLCommerz secure local gateway</span>
                    </div>
                  </label>
                )}
              </div>

              <div id="validation-error-anchor" />
              {validationError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-xs font-bold text-center leading-normal animate-pulse">
                  ⚠️ {validationError}
                </div>
              )}

              <Button
                type="submit"
                disabled={(orderState.status as any) === 'confirming'}
                className="w-full py-3 font-bold text-lg uppercase tracking-wide shadow-md hover:shadow-lg transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
              >
                {(orderState.status as any) === 'confirming' ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .error-border {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 1px #ef4444 !important;
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4">Loading Checkout...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
