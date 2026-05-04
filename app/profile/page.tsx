"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, User, Mail, Calendar, LogOut, ShoppingBag } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [orderCount, setOrderCount] = useState(0);

  function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
  }

  useEffect(() => {
    const name = getCookie("allo_user_name");
    if (!name) { router.push("/login"); return; }
    setUserName(name);
    fetch("/api/reservations").then(r => r.json()).then(data => {
      setOrderCount(Array.isArray(data) ? data.length : 0);
    });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={20} /></button>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Package className="text-white" size={16} /></div>
          <h1 className="text-lg font-bold text-gray-900">My Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-white" size={36} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
          <p className="text-gray-500 text-sm mt-1">Allo Inventory Member</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <ShoppingBag className="mx-auto text-blue-500 mb-2" size={28} />
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-sm text-gray-500">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <Calendar className="mx-auto text-green-500 mb-2" size={28} />
            <p className="text-2xl font-bold text-gray-900">Active</p>
            <p className="text-sm text-gray-500">Account Status</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => router.push("/orders")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <ShoppingBag className="text-blue-500" size={20} />
            <span className="font-medium text-gray-700">My Orders</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors">
            <LogOut className="text-red-500" size={20} />
            <span className="font-medium text-red-600">Logout</span>
          </button>
        </div>
      </main>
    </div>
  );
}
