import { redirect } from "next/navigation";
import Stripe from "stripe";
import { CoverLetterClient } from "./CoverLetterClient";

export const metadata = {
  title: "Carta de apresentação — eCurrículo Digital",
};

export default async function CoverLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/");

  const paid = await (async () => {
    if (!process.env.STRIPE_SECRET_KEY) return false;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      return session.payment_status === "paid";
    } catch {
      return false;
    }
  })();

  return <CoverLetterClient paid={paid} />;
}