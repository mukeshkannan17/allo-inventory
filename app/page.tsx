"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Package, MapPin, AlertCircle } from "lucide-react";

interface StockItem {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: StockItem[];
}

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError("Not enough stock available — someone else may have just taken the last unit.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Failed to reserve");
        return;
      }
      router.push(`/reservation/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setReserving(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Package className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Allo Inventory</h1>
            <p className="text-xs text-gray-500">Multi-warehouse stock reservation</p>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-medium text-red-800">Stock unavailable</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Products</h2>
          <p className="text-gray-500 text-sm mt-1">Reserve a unit — you have 10 minutes to complete payment</p>
        </div>
        {products.length === 0 ? (
          <p className="text-gray-500">No products available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <Package className="text-blue-300" size={64} />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                    <span className="text-lg font-bold text-blue-600 shrink-0">Rs.{product.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 font-mono">SKU: {product.sku}</p>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    {product.stock.map((s) => (
                      <div key={s.warehouseId} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin size={13} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{s.warehouseName}</span>
                          <span className="text-xs text-gray-400">· {s.warehouseLocation}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>Available: <span className={`font-bold ${s.availableUnits > 0 ? "text-green-600" : "text-red-500"}`}>{s.availableUnits}</span></span>
                            <span>Reserved: <span className="font-bold text-amber-600">{s.reservedUnits}</span></span>
                          </div>
                          <button
                            onClick={() => handleReserve(product.id, s.warehouseId)}
                            disabled={s.availableUnits === 0 || reserving === `${product.id}-${s.warehouseId}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              s.availableUnits === 0
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : reserving === `${product.id}-${s.warehouseId}`
                                ? "bg-blue-100 text-blue-600 cursor-wait"
                                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                            }`}
                          >
                            <ShoppingCart size={13} />
                            {reserving === `${product.id}-${s.warehouseId}` ? "Reserving..." : s.availableUnits === 0 ? "Out of stock" : "Reserve"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
