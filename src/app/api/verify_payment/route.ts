import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js"; // Assuming Supabase for user management

interface PayPalTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface PayPalOrderResponse {
    id: string;
    status: string;
    purchase_units: { custom_id: string; payments?: { captures: { id: string; status: string }[] } }[];
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    const { orderId, userId } = await req.json();

    if (!orderId || !userId) {
        console.error("Missing orderId or userId:", { orderId, userId });
        return NextResponse.json({ error: "Missing orderId or userId" }, { status: 400 });
    }

    // Get PayPal access token
    // Changed to live endpoint
    const authResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(
                `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("Auth request failed:", authResponse.status, errorText);
        return NextResponse.json({ error: "Failed to authenticate with PayPal" }, { status: 500 });
    }

    const authData = (await authResponse.json()) as PayPalTokenResponse;
    const { access_token } = authData;

    // Fetch order details
    // Changed to live endpoint
    const orderResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
        },
    });

    if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Order fetch failed:", orderResponse.status, errorText);
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    const orderData = (await orderResponse.json()) as PayPalOrderResponse;
    console.log("Full order verification response:", JSON.stringify(orderData, null, 2));

    // Check if payment is completed
    let isCompleted =
        orderData.status === "COMPLETED" &&
        orderData.purchase_units[0]?.payments?.captures?.[0]?.status === "COMPLETED";
    console.log("Initial isCompleted:", isCompleted, "orderStatus:", orderData.status);

    const customId = orderData.purchase_units[0]?.custom_id;

    // If approved but not captured, attempt capture
    if (!isCompleted && orderData.status === "APPROVED") {
        console.log("Order approved but not captured, attempting capture for orderId:", orderId);
        // Changed to live endpoint
        const captureResponse = await fetch(
            `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!captureResponse.ok) {
            const errorText = await captureResponse.text();
            console.error(
                "Capture failed for orderId:",
                orderId,
                "Status:",
                captureResponse.status,
                "Error:",
                errorText
            );
            return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
        }

        const captureData = (await captureResponse.json()) as PayPalOrderResponse;
        console.log("Capture response for orderId:", orderId, JSON.stringify(captureData, null, 2));
        isCompleted =
            captureData.status === "COMPLETED" &&
            captureData.purchase_units[0]?.payments?.captures?.[0]?.status === "COMPLETED";
        console.log("Updated isCompleted after capture:", isCompleted);
    }

    // If still not completed, return error
    if (!isCompleted) {
        console.error("Payment not completed after capture attempt for orderId:", orderId, {
            orderStatus: orderData.status,
            captureStatus: orderData.purchase_units[0]?.payments?.captures?.[0]?.status,
        });
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Verify user ID
    if (customId !== userId) {
        console.error("UserId mismatch:", { customId, userId });
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Update user premium status in Supabase
    const { error: updateError } = await supabase
        .from("users")
        .update({ is_premium: true })
        .eq("id", userId);

    if (updateError) {
        console.error("Failed to update user premium status:", updateError);
        return NextResponse.json({ error: "Failed to update premium status" }, { status: 500 });
    }

    console.log("Payment verified and premium status updated for userId:", userId);
    return NextResponse.json({ success: true });
}