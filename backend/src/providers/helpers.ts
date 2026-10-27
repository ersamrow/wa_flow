import { HttpException } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export type Row = Record<string, any>;
export function requireThat(condition: unknown, message: string, status = 422): asserts condition {
    if (!condition)
        throw new HttpException(message, status);
}
export function same(a: string, b: string): boolean {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export function verifySignature(raw: Buffer, secret: string | undefined, signature: string | undefined, prefix = ""): Row {
    requireThat(secret, "Webhook is not configured.", 503);
    requireThat(raw.length <= 1048576, "Webhook too large.", 413);
    requireThat(same(prefix + createHmac("sha256", secret).update(raw).digest("hex"), signature || ""), "Invalid webhook signature.", 403);
    try {
        const value: unknown = JSON.parse(raw.toString());
        requireThat(value && typeof value === "object" && !Array.isArray(value), "Invalid webhook payload.");
        return value as Row;
    }
    catch {
        throw new HttpException("Invalid webhook payload.", 422);
    }
}
export function parseJson(value: any, fallback: any = null): any {
    if (value == null)
        return fallback;
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
export const inWindow = (date: any) => date && new Date(date).getTime() > Date.now() - 86400000;
export const month = () => new Date().toISOString().slice(0, 7);
export function plans(): Record<string, Row> {
    return {
        starter: {
            name: "Starter",
            price_paise: 99900,
            provider_id: process.env.RAZORPAY_STARTER_PLAN_ID,
            messages: 1000,
            ai_requests: 100,
            tokens: 500000
        },
        business: {
            name: "Business",
            price_paise: 249900,
            provider_id: process.env.RAZORPAY_BUSINESS_PLAN_ID,
            messages: 5000,
            ai_requests: 500,
            tokens: 2500000
        },
    };
}
export function supportedTemplate(t: Row): boolean {
    return t.status === "APPROVED" && Array.isArray(t.components) && t.components.every((c: Row) => ["BODY", "FOOTER", "HEADER"].includes(c.type) && (c.type !== "HEADER" || (c.format === "TEXT" && !String(c.text || "").includes("{{"))) && (c.type !== "BODY" || !/{{(?![0-9]+}})/.test(c.text || "")));
}
export function validAiAnswer(result: Row, sources: Row[]): string | null {
    if (result.status !== "completed")
        return null;
    const text = (result.output || []).flatMap((o: Row) => o.content || []).filter((p: Row) => p.type === "output_text").map((p: Row) => p.text).join("");
    const a = parseJson(text);
    return a && a.handover === false && typeof a.reply === "string" && a.reply.trim() && a.reply.length <= 4000 && Array.isArray(a.source_ids) && a.source_ids.length && a.source_ids.every((id: unknown) => sources.some(s => s.id === id)) ? a.reply.trim() : null;
}
export class ProviderError extends HttpException {
    constructor(message: string, readonly providerStatus = 0) {
        super(message, 422);
    }
}
