"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { apiRoutes } from "@/lib/apiRoutes";
import { supabase } from "@/lib/supabaseClient";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const CheckoutForm = ({
  clientSecret,
  userId,
  listingsId,
}: {
  clientSecret: string;
  userId: string | null;
  listingsId: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const paymentId =
    typeof window !== "undefined" ? localStorage.getItem("payment_id") : null;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !paymentId || !userId) {
      alert("Missing payment or user info.");
      return;
    }

    setSubmitting(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (result.error) {
      alert(result.error.message);
      setSubmitting(false);
    } else if (result.paymentIntent?.status === "succeeded") {
      try {
        // Update backend with payment success
        const res = await fetch(apiRoutes.paymentSuccess, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_intent_id: result.paymentIntent.id,
          }),
        });

        if (!res.ok) throw new Error("Failed to confirm payment on backend");

        alert(
          "💳 Payment successful!\nPlease confirm in your profile to finalize the purchase."
        );

        router.push("/profile");
      } catch (err: any) {
        console.error("Payment success error:", err);
        alert(err.message || "Payment succeeded but failed to update backend.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <CardElement className="p-4 border rounded-lg" />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const listings_id = searchParams.get("listings_id");

  const [userId, setUserId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const calledCheckout = useRef(false);

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        router.push("/events");
      }
    }
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (calledCheckout.current) return;
    if (!userId || !listings_id) {
      setLoading(false);
      return;
    }

    calledCheckout.current = true;

    const loadCheckout = async () => {
      try {
        const listingResponse = await fetch(apiRoutes.listingById(listings_id));
        if (!listingResponse.ok) throw new Error("Failed to load listing");
        const listingRes = await listingResponse.json();
        setListing(listingRes);

        const checkoutResponse = await fetch(apiRoutes.checkout, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, listings_id }),
        });

        if (!checkoutResponse.ok) throw new Error("Failed to initiate payment");

        const checkoutRes = await checkoutResponse.json();
        setClientSecret(checkoutRes.clientSecret);
        localStorage.setItem("payment_id", checkoutRes.payment_id);
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Failed to load listing or initiate payment");
        router.push("/events");
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [userId, listings_id, router]);

  if (loading) return <p>Loading...</p>;
  if (!clientSecret || !listing) return <p>Failed to load payment</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="border p-3 mb-3 rounded">
        <div className="font-semibold">{listing.summary.event_name || "Event"}</div>
        <div className="text-sm text-gray-600">
          Date: {new Date(listing.summary.date).toLocaleDateString()}
          <br />
          Price: ${listing.summary.totalPrice}
        </div>
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm
          clientSecret={clientSecret}
          userId={userId}
          listingsId={listings_id!}
        />
      </Elements>
    </div>
  );
}
