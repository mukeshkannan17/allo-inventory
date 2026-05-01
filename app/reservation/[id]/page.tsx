"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, Package, MapPin, AlertCircle, ArrowLeft } from "lucide-react";

interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    description?: string;
  };
}

export default function ReservationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [finalStatus, setFinalStatus] = useState<"confirmed" | "cancelled" | "expired" | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`);
      if (!res.ok) {
        setError("Reservation not found");
        return;
      }
      const data = await res.json();
      setReservation(data);
      if (data.status === "confirmed") setFinalStatus("confirmed");
      if (data.status === "released") setFinalStatus("cancelled");
      const remaining = Math.max(0, new Date(data.expiresAt).getTime() - Date.now());
      setTimeLeft(Math.floor(remaining / 1000));
    } catch {
      setError("Failed to load reservation");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  // Countdown timer
  useEffect(() => {
    if (!reservation || finalStatus) return;
    if (timeLeft <= 0) {
      setFinalStatus("expired");
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setFinalStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [reservation, finalStatus, timeLeft]);

  async function handleConfirm() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${params.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.status === 410) {
        setError(data.error || "Reservation has expired");
        setFinalStatus("expired");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Failed to confirm");
        return;
      }
      setFinalStatus("confirmed");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${params.id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to cancel");
        return;
      }
      setFinalStatus("cancelled");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor = timeLeft > 120 ? "text-green-600" : timeLeft > 30 ? "text-amber-500" : "text-red-600";
  const timerBg = timeLeft > 120 ? "bg-green-50 border-green-200" : timeLeft > 30 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <p className="text-gray-700 font-medium">{error}</p>
          <button onClick={() => router.push("/")} className="mt-4 text-blue-600 hover:underline">Back to products</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Package className="text-blue-600" size={24} />
          <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Final state: confirmed */}
        {finalStatus === "confirmed" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-6">
            <CheckCircle className="mx-auto text-green-500 mb-3" size={56} />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Order Confirmed!</h2>
            <p className="text-green-700">Your purchase was successful. You'll receive a confirmation shortly.</p>
            <button onClick={() => router.push("/")} className="mt-6 bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors">
              Continue Shopping
            </button>
          </div>
        )}

        {/* Final state: cancelled */}
        {finalStatus === "cancelled" && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center mb-6">
            <XCircle className="mx-auto text-gray-400 mb-3" size={56} />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Reservation Cancelled</h2>
            <p className="text-gray-500">The item has been returned to stock.</p>
            <button onClick={() => router.push("/")} className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Back to Products
            </button>
          </div>
        )}

        {/* Final state: expired */}
        {finalStatus === "expired" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center mb-6">
            <Clock className="mx-auto text-red-400 mb-3" size={56} />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Reservation Expired</h2>
            <p className="text-red-700">Your 10-minute hold has ended and the item is back in stock.</p>
            <button onClick={() => router.push("/")} className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Reserve Again
            </button>
          </div>
        )}

        {/* Active reservation */}
        {!finalStatus && reservation && (
          <>
            {/* Timer */}
            <div className={`border rounded-xl p-4 mb-6 flex items-center gap-3 ${timerBg}`}>
              <Clock className={timerColor} size={24} />
              <div>
                <p className="text-sm text-gray-600">Time remaining to complete purchase</p>
                <p className={`text-3xl font-bold font-mono ${timerColor}`}>{formatTime(timeLeft)}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Product card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Reservation Details</h2>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="text-blue-400" size={28} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{reservation.product.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {reservation.product.sku}</p>
                  {reservation.product.description && (
                    <p className="text-sm text-gray-500 mt-1">{reservation.product.description}</p>
                  )}
                </div>
                <p className="text-xl font-bold text-blue-600">Rs.{reservation.product.price.toLocaleString()}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span>Warehouse: {reservation.warehouseId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity</span>
                  <span className="font-semibold">{reservation.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reservation ID</span>
                  <span className="font-mono text-xs text-gray-400">{reservation.id}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>Rs.{(reservation.product.price * reservation.quantity).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                {actionLoading ? "Processing..." : "Confirm Purchase"}
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold text-base hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Cancel
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
