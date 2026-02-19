"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string | null;
  description: string;
}

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      const [plansRes, subResult] = await Promise.all([
        fetch("/api/billing/plans", { credentials: "include" }),
        supabase
          .from("subscriptions")
          .select("plan, status, current_period_end")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .order("current_period_end", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (plansRes.ok) {
        const data = (await plansRes.json()) as { plans?: Plan[] };
        setPlans(data.plans ?? []);
      }

      if (subResult.data) {
        setSubscription({
          plan: (subResult.data.plan as string) ?? "free",
          status: (subResult.data.status as string) ?? "active",
          current_period_end: subResult.data.current_period_end as string | null,
        });
      } else {
        setSubscription({ plan: "free", status: "active", current_period_end: null });
      }
    } catch (e) {
      toast.error("Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      (async () => {
        try {
          const syncRes = await fetch("/api/stripe/sync-subscription", {
            method: "POST",
            credentials: "include",
          });
          const syncData = (await syncRes.json()) as { plan?: string; error?: string };
          if (syncRes.ok && syncData.plan) {
            setSubscription({
              plan: syncData.plan,
              status: "active",
              current_period_end: null,
            });
          }
          await loadData();
          if (syncRes.ok) {
            const usageRes = await fetch("/api/limits/usage", { credentials: "include" });
            if (usageRes.ok) {
              const usageData = (await usageRes.json()) as { plan?: string };
              if (usageData.plan) {
                setSubscription((prev) => ({
                  ...prev,
                  plan: usageData.plan!,
                  status: "active",
                  current_period_end: prev?.current_period_end ?? null
                }));
              }
            }
            toast.success("Subscription started. Welcome!");
          } else {
            toast.info(
              "Payment received. If your plan did not update, click “Refresh subscription status” below."
            );
          }
        } catch {
          await loadData();
          toast.error("Could not sync subscription. Try “Refresh subscription status” below.");
        }
        window.history.replaceState({}, "", "/dashboard/billing");
      })();
    }
    if (canceled === "true") {
      toast.info("Checkout canceled.");
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [searchParams, loadData]);

  async function handleUpgrade(priceId: string) {
    if (!priceId) {
      toast.error("This plan is not available for checkout.");
      return;
    }
    setCheckoutLoading(priceId);
    const returnTo = searchParams.get("returnTo");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          ...(returnTo && returnTo.startsWith("/") ? { returnTo } : {}),
        }),
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; sessionId?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Checkout failed.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.sessionId) {
        window.location.href = `https://checkout.stripe.com/c/pay/${data.sessionId}`;
        return;
      }
      toast.error("Could not redirect to checkout.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleRefreshSubscription() {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; plan?: string };
      if (res.ok && data.plan) {
        setSubscription({
          plan: data.plan,
          status: "active",
          current_period_end: null,
        });
        await loadData();
        const usageRes = await fetch("/api/limits/usage", { credentials: "include" });
        if (usageRes.ok) {
          const usageData = (await usageRes.json()) as { plan?: string };
          if (usageData.plan) {
            setSubscription((prev) => ({
              ...prev,
              plan: usageData.plan!,
              status: "active",
            }));
          }
        }
        toast.success(`Subscription synced. You're on the ${data.plan} plan.`);
      } else if (res.ok) {
        await loadData();
        toast.success("Subscription synced.");
      } else {
        toast.error(data.error || "Could not sync subscription.");
      }
    } catch {
      toast.error("Could not sync subscription.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not open billing portal.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error("Could not redirect to billing portal.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = subscription?.plan ?? "free";
  const isPaid = currentPlan !== "free";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Billing & Plans</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your subscription and usage. Usage limits are enforced per plan.
        </p>
      </div>

      {/* Usage placeholders */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="size-5" />
            Usage this period
          </CardTitle>
          <CardDescription>Limits depend on your current plan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>Chatbots used: —</div>
          <div>Conversations this month: —</div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 border-t border-slate-200 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={syncLoading}
            onClick={handleRefreshSubscription}
          >
            {syncLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span className="ml-2">Refresh subscription status</span>
          </Button>
          <p className="text-xs text-slate-500">
            Use this if you just paid but still see the Free plan (e.g. after testing with a dummy card).
          </p>
        </CardFooter>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isFree = plan.id === "free";
          const canUpgrade = !isFree && plan.priceId && !isCurrent;

          return (
            <Card
              key={plan.id}
              className={`relative border-slate-200 ${isCurrent ? "ring-2 ring-[#2563EB]" : ""}`}
            >
              {isCurrent && (
                <div className="absolute right-3 top-3">
                  <Badge variant="default" className="bg-[#2563EB]">
                    Current Plan
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="min-h-[2.5rem]">{plan.description}</CardDescription>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {plan.price === 0 ? "$0" : `$${plan.price}/mo`}
                </div>
              </CardHeader>
              <CardFooter className="flex flex-col gap-2">
                {canUpgrade && (
                  <Button
                    className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
                    disabled={!!checkoutLoading}
                    onClick={() => handleUpgrade(plan.priceId!)}
                  >
                    {checkoutLoading === plan.priceId ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
                {isCurrent && isPaid && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={portalLoading}
                    onClick={handleManageBilling}
                  >
                    {portalLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Manage Billing"
                    )}
                  </Button>
                )}
                {isCurrent && isFree && (
                  <span className="text-center text-sm text-slate-500">Your current plan</span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
