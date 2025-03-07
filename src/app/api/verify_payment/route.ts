import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";

interface PayPalTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    app_id: string;
}

interface PayPalOrderResponse {
    id: string;
    status: string;
    purchase_units: { custom_id: string; payments?: { captures: { id: string; status: string }[] } }[];
}

export async function POST(req: NextRequest) {
    const { orderId, userId } = await req.json();

    if (!orderId || !userId) {
        console.error("Missing orderId or userId:", { orderId, userId });
        return NextResponse.json({ error: "Missing orderId or userId" }, { status: 400 });
    }

    const authResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64")}`,
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

    const orderResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
        },
    });

    if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Order verification failed:", orderResponse.status, errorText);
        return NextResponse.json({ error: "Failed to verify order" }, { status: 500 });
    }

    const orderData = (await orderResponse.json()) as PayPalOrderResponse;
    console.log("Full order verification response:", JSON.stringify(orderData, null, 2));

    const isCompleted = orderData.status === "COMPLETED" && orderData.purchase_units[0]?.payments?.captures?.[0]?.status === "COMPLETED";
    const customId = orderData.purchase_units[0]?.custom_id;

    if (!isCompleted) {
        console.error("Payment not completed:", {
            orderStatus: orderData.status,
            captureStatus: orderData.purchase_units[0]?.payments?.captures?.[0]?.status,
        });
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    if (customId !== userId) {
        console.error("UserId mismatch:", { customId, userId });
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    console.log("Payment verified successfully for userId:", userId);
    return NextResponse.json({ success: true });
}