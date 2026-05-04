"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";

interface Reservation {
  id: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  warehouseId: string;
  product: { name: string; sku: string; price: number; };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reservations").then(r => r.json()).then(data => {
      setOrders(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  }, []);

  const statusIcon = (status: string) => {
    if (status === "confirmed") return <CheckCircle className="text-green-500" size={18} />;
    if (status === "released") return <XCircle className="text-gray-400" size={18} />;
    return <Clock className="text-amber-500" size={18} />;
  };

  const statusColor = (status: string) => {
    if (status === "confirmed") return "bg-green-50 text-green-700 border-green-200";
    if (status === "released") return "bg-gray-50 text-gray-500 border-gray-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={20} /></button>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Package className="text-white" size={16} /></div>
          <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-bold text-gray-500 mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-6">Go reserve a product!</p>
            <button onClick={() => router.push("/")} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700">Browse Products</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="text-blue-400" size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{order.product.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {order.product.sku}</p>
                      <p className="text-xs text-gray-500 mt-1">Qty: {order.quantity} · ₹{(order.product.price * order.quantity).toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-1">Ordered: {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(order.status)}`}>
                      {statusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.status === "pending" && (
                      <button onClick={() => router.push(`/reservation/${order.id}`)}
                        className="text-xs text-blue-600 hover:underline font-medium">
                        Complete →
                      </button>
                    )}
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
