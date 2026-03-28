'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export default function CartPage() {
  const { items, total, removeItem, updateQuantity, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const shippingCost = items.length > 0 ? 50 : 0;
  const tax = (total + shippingCost) * 0.05;
  const grandTotal = total + shippingCost + tax;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      window.location.href = '/shop/checkout';
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/shop" className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some products to get started!</p>
            <Link href="/shop">
              <Button className="bg-amber-700 hover:bg-amber-800 text-white">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {items.map(item => (
                  <div
                    key={item.productSlug}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded flex items-center justify-center text-4xl flex-shrink-0">
                      📦
                    </div>

                    <div className="flex-1">
                      <Link
                        href={`/shop/products/${item.productSlug}`}
                        className="text-lg font-bold text-gray-900 hover:text-amber-700 block mb-2"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-2xl font-bold text-amber-700 mb-4">
                        ₳ {item.price.toFixed(2)}
                      </p>

                      <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                        <button
                          onClick={() => updateQuantity(item.productSlug, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.productSlug, parseInt(e.target.value) || 1)
                          }
                          className="w-12 text-center border-0 focus:outline-none"
                        />
                        <button
                          onClick={() => updateQuantity(item.productSlug, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Subtotal</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₳ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productSlug)}
                        className="text-red-600 hover:text-red-800 flex items-center justify-center gap-2 mt-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button
                  onClick={clearCart}
                  className="text-gray-600 hover:text-red-600 text-sm font-semibold"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6 border-b pb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">₳ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-semibold text-gray-900">₳ {shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (5%)</span>
                    <span className="font-semibold text-gray-900">₳ {tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between mb-6">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-amber-700">
                    ₳ {grandTotal.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 font-bold mb-3"
                >
                  {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                </Button>

                <Link href="/shop" className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>

                <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="font-semibold text-blue-900 mb-1">Shipping Information</p>
                  <p>Free shipping on orders over ₳500. Standard delivery: 2-3 business days.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
