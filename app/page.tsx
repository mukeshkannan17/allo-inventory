"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Package, MapPin, AlertCircle, LogOut, User, History, ChevronRight } from "lucide-react";

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
  const [userName, setUserName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const name = getCookie("allo_user_name");
    if (!name) { router.push("/login"); return; }
    setUserName(name);
    fetchProducts();
  }, []);

  function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch { setError("Failed to load products"); }
    finally { setLoading(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
      if (res.status === 409) { setError("Not enough stock available."); return; }
      if (!res.ok) { setError(data.error || "Failed to reserve"); return; }
      router.push(`/reservation/${data.id}`);
    } catch { setError("Network error. Please try again."); }
    finally { setReserving(null); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Allo Inventory</h1>
              <p className="text-xs text-gray-400">Multi-warehouse platform</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push("/")} className="text-blue-600 font-semibold text-sm">Products</button>
            <button onClick={() => router.push("/orders")} className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-1"><History size={15}/>My Orders</button>
          </nav>
          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="text-white" size={14} />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{userName}</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <button onClick={() => { setShowDropdown(false); router.push("/orders"); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
                  <History size={15} /> My Orders
                </button>
                <button onClick={() => { setShowDropdown(false); router.push("/profile"); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <User size={15} /> My Profile
                </button>
                <hr className="border-gray-100" />
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}! 👋</h2>
          <p className="text-blue-100">Browse our products and reserve yours before they run out.</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Available Products</h3>
          <span className="text-sm text-gray-500">{products.length} products</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-44 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Package className="text-blue-300" size={56} />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h4>
                  <span className="text-base font-bold text-blue-600 shrink-0">₹{product.price.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2 font-mono">SKU: {product.sku}</p>
                {product.description && <p className="text-sm text-gray-500 mb-3">{product.description}</p>}
                <div className="space-y-2">
                  {product.stock.map((s) => (
                    <div key={s.warehouseId} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">{s.warehouseName}</span>
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
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            s.availableUnits === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : reserving === `${product.id}-${s.warehouseId}` ? "bg-blue-100 text-blue-600"
                            : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                          <ShoppingCart size={12} />
                          {reserving === `${product.id}-${s.warehouseId}` ? "..." : s.availableUnits === 0 ? "Out of stock" : "Reserve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          © 2024 Allo Inventory. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
