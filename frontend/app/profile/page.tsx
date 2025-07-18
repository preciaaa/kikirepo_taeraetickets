"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface Payment {
  payment_id: string;
  total_amount: number;
  status: string;
  original_owner_id: string;
}
import ThemeSelector from "@/components/ThemeSelector";
import { apiRoutes } from "@/lib/apiRoutes";

const PROFILE_IMAGES = [
  "/profile-pics/zwoongnini.png",
  "/profile-pics/zbinini.png",
  "/profile-pics/zhanini.png",
  "/profile-pics/zthewnini.png",
  "/profile-pics/ztaenini.png",
  "/profile-pics/zgyunini.png",
  "/profile-pics/zrinini.png",
  "/profile-pics/zgunini.png",
  "/profile-pics/zyunini.png",
];

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("User");
  const [selectedPic, setSelectedPic] = useState(PROFILE_IMAGES[0]);
  const [tempPic, setTempPic] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Dashboard-related states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Report dialog states
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPaymentId, setReportPaymentId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const initialise = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      const user = session.user;
      setUserId(user.id);
      setUsername(
        user.user_metadata?.username || user.email?.split("@")[0] || "User"
      );

      setSelectedPic(user.user_metadata?.profile_pic || PROFILE_IMAGES[0]);

      try {
        const res = await fetch(apiRoutes.user(user.id));
        const data = await res.json();
        setVerified(data.verified);
        setStripeConnected(!!data.stripe_account_id);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setVerified(false);
        setStripeConnected(false);
      }

      setLoading(false);
    };

    initialise();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    setPaymentsLoading(true);
    setPaymentsError(null);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${userId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load payments");
        return res.json();
      })
      .then((data) => setPayments(data))
      .catch((err) => {
        console.error("Failed to load payments:", err);
        setPaymentsError("Failed to load payments");
      })
      .finally(() => setPaymentsLoading(false));
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user_id");
    router.push("/auth/login");
  };

  const handleVerification = () => {
    router.push("/verification");
  };

  const handleCheckStripe = async () => {
    if (!userId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userId}`
      );
      const data = await res.json();

      if (!data.stripe_account_id) {
        router.push("/onboard");
      } else {
        alert("Stripe account already connected.");
        setStripeConnected(true);
      }
    } catch (err) {
      console.error("Failed to check Stripe account:", err);
      alert("An error occurred while checking Stripe account.");
    }
  };

  const handleConfirm = useCallback(
    async (payment_id: string) => {
      if (!payment_id || !userId) {
        alert("Missing payment ID or user ID");
        return;
      }

      setConfirmingId(payment_id);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/confirm-purchase`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id, new_owner_id: userId }),
          }
        );

        if (!res.ok) throw new Error("Failed to confirm purchase");

        alert("Purchase confirmed");
        window.location.reload();
      } catch (err) {
        console.error("Confirm API error:", err);
        alert("Failed to confirm purchase");
      } finally {
        setConfirmingId(null);
      }
    },
    [userId]
  );

  const handleOpenReport = useCallback(
    (payment_id: string) => {
      setReportPaymentId(payment_id);
      setReportDialogOpen(true);
    },
    []
  );

  const submitReport = async () => {
    if (!reportPaymentId) {
      alert("Missing payment ID for report");
      return;
    }

    setReporting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/report-seller`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: reportPaymentId,
        }),
      });

      if (!res.ok) throw new Error("Failed to report seller");

      alert("Seller has been reported");
      setReportDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Report API error:", error);
      alert("Failed to report seller");
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-center">Your Profile</h1>
        <div className="text-center space-y-2">
          <p className="text-gray-700">
            Verification Status:{" "}
            <span
              className={
                verified
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {verified ? "Verified" : "Not Verified"}
            </span>
          </p>

          <p className="text-gray-700">
            Stripe Account:{" "}
            <span
              className={
                stripeConnected
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {stripeConnected ? "Created" : "Not Created"}
            </span>
          </p>
        </div>
        {!stripeConnected && (
          <div className="text-center">
            <Button onClick={handleCheckStripe} className="w-full">
              Connect Stripe Account
            </Button>
          </div>
        )}
        <div className="text-center">
          <Button
            onClick={handleVerification}
            disabled={verified === true}
            className="w-full"
          >
            {verified ? "Already Verified" : "Verify Me"}
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-md space-y-6">
            {/* Profile Pic and Username */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={selectedPic}
                  alt="Profile"
                  className="w-40 h-40 object-contain"
                />
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 bg-black rounded-full p-2 shadow hover:bg-blue-600"
                  onClick={() => {
                    setTempPic(selectedPic);
                    setShowOptions(true);
                  }}
                  aria-label="Edit profile picture"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 5.5l3 3"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <h1 className="text-3xl font-semibold mt-4">Hi, {username}!</h1>
            </div>

            {/* Profile Picture Selector Modal */}
            {showOptions && (
              <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div
                  className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
                    Choose a Profile Picture
                  </h2>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {PROFILE_IMAGES.map((img) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setTempPic(img)}
                        className={`p-1 border-2 rounded-xl w-30 h-30 bg-white shadow-sm transition-all duration-150 hover:scale-105 ${
                          tempPic === img
                            ? "border-blue-500 ring-4 ring-blue-300"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={img}
                          alt="Option"
                          className="w-20 h-20 object-contain rounded-md mx-auto"
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowOptions(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setSaving(true);
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (user && tempPic) {
                          await supabase.auth.updateUser({
                            data: { profile_pic: tempPic },
                          });
                          setSelectedPic(tempPic);
                        }
                        setSaving(false);
                        setShowOptions(false);
                      }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification */}
            <div className="text-center space-y-2">
              <p className="text-gray-700 mb-2">
                Verification Status:{" "}
                <span
                  className={
                    verified
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                >
                  {verified ? "Verified" : "Not Verified"}
                </span>
              </p>
              <Button
                onClick={handleVerification}
                disabled={verified === true}
                className="w-full"
              >
                {verified ? "Already Verified" : "Verify Me"}
              </Button>
              <p className="text-gray-700 mt-2">
                Stripe Account:{" "}
                <span
                  className={
                    stripeConnected
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                >
                  {stripeConnected ? "Created" : "Not Created"}
                </span>
              </p>
              {!stripeConnected && (
                <Button onClick={handleCheckStripe} className="w-full mt-2">
                  Connect Stripe Account
                </Button>
              )}
            </div>

            {/* Theme Selector */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Choose Your Theme</h2>
              <ThemeSelector />
            </div>

            {/* Logout */}
            <div>
              <Button
                onClick={handleLogout}
                className="w-full"
                variant="secondary"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-6 border-gray-300" />
      <h2 className="text-2xl font-semibold text-center">Your Payments</h2>

      {paymentsLoading && <p>Loading payments...</p>}
      {paymentsError && <p className="text-red-600">{paymentsError}</p>}
      {!paymentsLoading && payments.length === 0 && <p>No payments found.</p>}

      {payments.map((p) => (
        <div
          key={p.payment_id}
          className="border p-4 rounded-lg shadow mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center"
        >
          <div>
            <p className="font-semibold">
              Amount: ${p.total_amount.toFixed(2)}
            </p>
            <p>Status: {p.status}</p>
          </div>

          {p.status === "initiated" && (
            <div className="space-x-2 mt-2 sm:mt-0">
              <Button
                onClick={() => handleConfirm(p.payment_id)}
                className="bg-green-500 hover:bg-green-600"
                disabled={confirmingId === p.payment_id}
              >
                {confirmingId === p.payment_id
                  ? "Confirming..."
                  : "Confirm Purchase"}
              </Button>
              <Button
                onClick={() => handleOpenReport(p.payment_id)}
                variant="destructive"
                disabled={reporting}
              >
                Report Seller
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Report Dialog */}
      <Dialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Seller</DialogTitle>
            <DialogDescription>
              Are you sure you want to report this seller?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={submitReport} disabled={reporting}>
              {reporting ? "Reporting..." : "Confirm Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

