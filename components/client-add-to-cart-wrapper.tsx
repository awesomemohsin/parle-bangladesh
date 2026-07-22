import ProductCard from "@/components/product-card";

export default function ClientAddToCartWrapper({ product }: { product: any }) {
  return (
    <ProductCard
      {...product}
    />
  );
}
