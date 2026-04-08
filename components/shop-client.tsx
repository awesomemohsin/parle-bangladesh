"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/product-card";
import { useCart } from "@/hooks/useCart";
import { Search, ShoppingCart, Filter, ArrowUpDown } from "lucide-react";

interface Variation {
  weight?: string;
  flavor?: string;
  price: number;
  stock: number;
  image?: string;
  isDefault?: boolean;
  isBulk?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand?: string;
  variations: Variation[];
  description?: string;
  isBulk?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ShopClient({ 
  initialProducts, 
  categories 
}: { 
  initialProducts: any[], 
  categories: any[] 
}) {
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "best-match");

  // Get unique brands for the selected category or all
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    initialProducts.forEach(p => {
      if (p.brand && (selectedCategory === "all" || p.category === selectedCategory)) {
        brands.add(p.brand);
      }
    });
    return Array.from(brands).sort();
  }, [initialProducts, selectedCategory]);

  // Sync state with URL
  useEffect(() => {
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const sort = searchParams.get("sort");
    
    setSelectedCategory(category || "all");
    setSelectedBrand(brand || "all");
    setSortBy(sort || "best-match");
  }, [searchParams]);

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    params.delete("brand"); // Clear brand when category changes
    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  const handleBrandChange = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brand === "all") {
      params.delete("brand");
    } else {
      params.set("brand", brand);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "best-match") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  const filteredProducts = useMemo(() => {
    let result = initialProducts.filter((product) => {
      const isBulkMatch = selectedCategory === "bulk" && product.isBulk;
      const byCategory =
        selectedCategory === "all" || 
        product.category === selectedCategory ||
        isBulkMatch;
      
      const byBrand = selectedBrand === "all" || product.brand === selectedBrand;
      
      const query = search.trim().toLowerCase();
      const bySearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.description || "")
          .toLowerCase()
          .includes(query);

      return byCategory && byBrand && bySearch;
    });

    if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "price-low") {
      result.sort((a, b) => (a.variations?.[0]?.price || 0) - (b.variations?.[0]?.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.variations?.[0]?.price || 0) - (a.variations?.[0]?.price || 0));
    }

    return result;
  }, [initialProducts, selectedCategory, selectedBrand, search, sortBy]);

  return (
    <>
      {/* Search & Filters Interface */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 shadow-xl shadow-gray-200/40">
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-2">
             <Search className="w-3 h-3" /> Search
          </label>
          <div className="relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-black focus:outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 group-hover:border-gray-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-2">
             <Filter className="w-3 h-3" /> Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-black focus:outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name.toUpperCase()}
              </option>
            ))}
            <option value="bulk" className="text-red-600 font-black">🎁 BULK / FAMILY PACKS</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-2">
             <ArrowUpDown className="w-3 h-3" /> Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-black focus:outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
          >
            <option value="best-match">Best Match</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-low">Price (Low to High)</option>
            <option value="price-high">Price (High to Low)</option>
          </select>
        </div>

        <div className="flex items-end">
          <Link
            href="/shop/cart"
            className="w-full flex items-center justify-center gap-2.5 h-[46px] rounded-xl bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 text-[11px] group"
          >
            <ShoppingCart className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            View Cart
          </Link>
        </div>
      </div>

      {/* Brand Selection Interface */}
      {availableBrands.length > 0 && (
        <div className="mb-12 animate-fade-in relative">
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
               <h3 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.4em]">Explore {selectedCategory !== 'all' ? selectedCategory : 'Product'} Brands</h3>
            </div>
            <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-gray-100 to-transparent ml-6"></div>
          </div>
          
          <div className="flex flex-wrap gap-2.5 sm:gap-3.5">
            <button
              onClick={() => handleBrandChange("all")}
              className={`relative px-7 py-3.5 rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 overflow-hidden ${
                selectedBrand === "all" 
                ? "bg-gray-900 border-gray-900 text-white shadow-2xl shadow-gray-300 ring-4 ring-gray-900/5 translate-y-[-2px]" 
                : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 shadow-sm border-2"
              }`}
            >
              All {selectedCategory !== 'all' ? selectedCategory : 'Collection'}
              {selectedBrand === "all" && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
              )}
            </button>
            
            {availableBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => handleBrandChange(brand)}
                className={`relative px-7 py-3.5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 border-2 active:scale-95 group overflow-hidden ${
                  selectedBrand === brand
                  ? "bg-red-600 border-red-600 text-white shadow-2xl shadow-red-200 ring-4 ring-red-600/10 translate-y-[-2px]"
                  : "bg-white/50 backdrop-blur-sm border-gray-50 text-gray-700 hover:border-red-500/30 hover:text-red-600 hover:bg-white shadow-sm"
                }`}
              >
                <span className="relative z-10">{brand}</span>
                {selectedBrand === brand && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 blur-[2px] rounded-full" />
                  </>
                )}
                {selectedBrand !== brand && (
                  <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-[0.03] transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 border border-white shadow-inner">
              <Search className="w-8 h-8 text-gray-200" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight mb-2">No Matches Found</h3>
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Try selecting a different brand or category</p>
           <button 
             onClick={() => { setSelectedCategory('all'); setSelectedBrand('all'); setSearch(''); router.push('/shop') }}
             className="mt-8 px-8 py-3 rounded-xl bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
           >
             Reset Filters
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8 lg:gap-x-10 lg:gap-y-16">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              {...product}
              priority={index < 12}
              onAddToCart={(variation: Variation) =>
                addItem({
                  productId: product.id,
                  productSlug: product.slug,
                  productName: product.name,
                  price: variation.price,
                  image: variation.image,
                  quantity: 1,
                  weight: variation.weight,
                  flavor: variation.flavor,
                  stock: variation.stock,
                })
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
