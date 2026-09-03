import { redirect } from "next/navigation";
import Stripe from "stripe";
import { SuccessClient } from "./SuccessClient";

export const metadata = {
  title: "Pagamento confirmado — eCurrículo Digital",
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/");

  const sessionInfo = await (async () => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      return {
        paid: session.payment_status === "paid",
        product: session.metadata?.product ?? "resume",
      };
    } catch {
      return null;
    }
  })();

  return (
    <SuccessClient
      paid={sessionInfo?.paid ?? false}
      product={sessionInfo?.product ?? "resume"}
    />
  );
}