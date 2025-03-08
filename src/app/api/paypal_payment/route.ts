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
    links: { href: string; rel: string; method: string }[];
}

export async function POST(req: NextRequest) {
    const { userId } = await req.json();

    if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
        console.error("Missing PayPal environment variables");
        return NextResponse.json(
            { error: "Server configuration error: Missing PayPal credentials" },
            { status: 500 }
        );
    }

    try {
        console.log("Fetching PayPal access token...");
        const authResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
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
            return NextResponse.json(
                { error: "Failed to authenticate with PayPal: " + errorText },
                { status: authResponse.status }
            );
        }

        const authData = (await authResponse.json()) as PayPalTokenResponse;
        const { access_token } = authData;
        console.log("Access token received:", access_token);

        console.log("Creating PayPal order for userId:", userId);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const orderResponse = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: "USD",
                            value: "10.00",
                        },
                        description: "StudyFlow Premium Upgrade",
                        custom_id: userId,
                    },
                ],
                application_context: {
                    return_url: `${baseUrl}/planner?success=true`,
                    cancel_url: `${baseUrl}/planner?canceled=true`,
                },
            }),
        });

        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            console.error("Order creation failed:", orderResponse.status, errorText);
            return NextResponse.json(
                { error: "Failed to create PayPal order: " + errorText },
                { status: orderResponse.status }
            );
        }

        const orderData = (await orderResponse.json()) as PayPalOrderResponse;
        console.log("Order response:", JSON.stringify(orderData, null, 2));

        const approvalUrl = orderData.links.find((link) => link.rel === "approve")?.href;

        if (!approvalUrl) {
            console.error("No approval URL found in response:", orderData);
            return NextResponse.json(
                { error: "No approval URL returned from PayPal" },
                { status: 500 }
            );
        }

        console.log("Returning approval URL:", approvalUrl);
        return NextResponse.json({ approval_url: approvalUrl });
    } catch (error) {
        console.error("Unexpected error in PayPal payment route:", error);
        return NextResponse.json(
            {
                error:
                    "Internal server error: " +
                    (error instanceof Error ? error.message : String(error)),
            },
            { status: 500 }
        );
    }
}