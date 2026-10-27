import { Controller, Get, Post, Patch, Body, Req, UseGuards, Param, Query, Res, HttpCode } from "@nestjs/common";
import type { Response } from "express";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { AuthGuard } from "../common/auth.guard";
import type { AppRequest } from "../common/request";
import { ProviderService } from "./provider.service";
import { SignupService } from "./signup.service";
import { requireThat, same, hash, verifySignature, Row, plans } from "./helpers";
const idSchema = z.string().regex(/^[0-9]{5,30}$/);
const stateSchema = z.string().regex(/^[a-f0-9]{64}$/);
function validate<T>(schema: z.ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    requireThat(result.success, "Invalid form fields.");
    return result.data;
}
@Controller("api/v1")
@UseGuards(AuthGuard)
export class IntegrationsController {
    constructor(readonly p: ProviderService, readonly signup: SignupService) {
    }
    async tenant(req: AppRequest, owner = false) {
        const id = await this.p.database.tenant(req.user!.id, true);
        const member = await this.p.db("business_users").where({
            business_id: id,
            user_id: req.user!.id
        }).first();
        requireThat(member && (owner ? member.role === "owner" : ["owner", "admin"].includes(member.role)), owner ? "Only the workspace owner can manage billing." : "Only workspace owners and administrators can manage integrations.", 403);
        return id;
    }
    @Post("integrations/whatsapp")
    async connect(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            phone_number_id: idSchema,
            access_token: z.string().min(20).max(4096),
            app_secret: z.string().min(16).max(256).nullish(),
            waba_id: idSchema.nullish()
        }).refine(d => !d.app_secret || !!d.waba_id), body);
        await this.p.connect(await this.tenant(r), d);
        return {
            data: {
                connected: true
            }
        };
    }
    @Get("integrations/whatsapp/templates")
    async templates(
    @Req()
    r: AppRequest) {
        return {
            data: await this.p.templates(await this.tenant(r))
        };
    }
    @Post("integrations/whatsapp/templates/send")
    async sendTemplate(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
            name: z.string().regex(/^[a-z0-9_]{1,512}$/),
            language: z.string().regex(/^[a-zA-Z_]{2,20}$/),
            parameters: z.array(z.string().min(1).max(1000)).max(20),
            client_key: z.string().min(1).max(64),
            consent: z.union([z.literal(true), z.literal(1), z.literal("1"), z.literal("yes"), z.literal("on")])
        }), body);
        return {
            data: {
                id: await this.p.enqueueTemplate(await this.tenant(r), d),
                status: "queued"
            }
        };
    }
    @Post("integrations/whatsapp/subscribe")
    async subscribeWhatsapp(
    @Req()
    r: AppRequest) {
        const a = await this.p.account(await this.tenant(r));
        requireThat(a.waba_id, "Connect your account first.");
        return {
            data: await this.p.graph(this.p.crypto.decrypt(a.access_token), "POST", `${a.waba_id}/subscribed_apps`)
        };
    }
    @Patch("integrations/ai")
    async settings(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            ai_enabled: z.boolean()
        }), body);
        const id = await this.tenant(r);
        await this.p.permanent(id);
        requireThat(!d.ai_enabled || process.env.OPENAI_API_KEY, "Configure OPENAI_API_KEY on the server first.");
        await this.p.db("businesses").where({
            id
        }).update({
            ...d,
            updated_at: new Date()
        });
        return {
            data: {
                saved: true
            }
        };
    }
    @Post("integrations/ai/test")
    async ai(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            question: z.string().min(1).max(2000)
        }), body);
        const id = await this.tenant(r);
        await this.p.permanent(id);
        requireThat(process.env.OPENAI_API_KEY, "Configure OPENAI_API_KEY first.");
        const reply = await this.p.answer(id, d.question);
        return {
            data: {
                reply,
                handover: reply === null
            }
        };
    }
    @Post("integrations/whatsapp/signup/start")
    async start(
    @Req()
    r: AppRequest) {
        return {
            data: await this.signup.start(await this.tenant(r), r.user!.id, r.sessionID)
        };
    }
    @Post("integrations/whatsapp/signup/exchange")
    async exchange(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            state: stateSchema,
            code: z.string().min(1).max(8192)
        }), body);
        await this.signup.exchange(d, await this.tenant(r), r.user!.id, r.sessionID);
        return {
            data: {
                authorized: true
            }
        };
    }
    @Post("integrations/whatsapp/signup/complete")
    async complete(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            state: stateSchema,
            waba_id: idSchema,
            phone_number_id: idSchema
        }), body);
        await this.signup.complete(d, await this.tenant(r), r.user!.id, r.sessionID);
        return {
            data: {
                connected: true
            }
        };
    }
    @Post("billing/subscribe")
    async subscribe(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            plan: z.string().refine(p => !!plans()[p])
        }), body);
        return {
            data: await this.p.subscribe(await this.tenant(r, true), d.plan)
        };
    }
    @Post("billing/sync")
    async sync(
    @Req()
    r: AppRequest) {
        return {
            data: await this.p.sync(await this.tenant(r, true))
        };
    }
    @Post("billing/cancel")
    async cancel(
    @Req()
    r: AppRequest) {
        await this.p.cancel(await this.tenant(r, true));
        return {
            data: {
                cancel_scheduled: true
            }
        };
    }
    @Post("billing/reconcile")
    async reconcile(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            provider_id: z.string().regex(/^sub_[a-zA-Z0-9]+$/)
        }), body);
        await this.p.reconcile(await this.tenant(r, true), d.provider_id);
        return {
            data: {
                reconciled: true
            }
        };
    }
    @Post("billing/verify")
    async verify(
    @Req()
    r: AppRequest, 
    @Body()
    body: unknown) {
        const d = validate(z.object({
            razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
            razorpay_subscription_id: z.string().regex(/^sub_[a-zA-Z0-9]+$/),
            razorpay_signature: z.string().length(64)
        }), body);
        const id = await this.tenant(r, true);
        const row = await this.p.db("subscriptions").where({
            business_id: id
        }).first();
        requireThat(row?.provider_id && process.env.RAZORPAY_KEY_SECRET, "No subscription to verify.");
        const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${d.razorpay_payment_id}|${row.provider_id}`).digest("hex");
        requireThat(d.razorpay_subscription_id === row.provider_id && same(signature, d.razorpay_signature), "Payment verification failed.");
        await this.p.sync(id);
        return {
            data: {
                verified: true
            }
        };
    }
}
@Controller("api/v1/webhooks")
export class WebhooksController {
    constructor(readonly p: ProviderService) {
    }
    async connection(key?: string) {
        if (!key)
            return null;
        requireThat(/^[a-f0-9]{48}$/.test(key), "Webhook not found.", 404);
        const a = await this.p.db("whatsapp_accounts").where({
            webhook_key: key
        }).first();
        requireThat(a, "Webhook not found.", 404);
        return a;
    }
    @Get("whatsapp")
    challenge(
    @Query()
    q: Row, 
    @Res()
    res: Response) {
        return this.doChallenge(q, res);
    }
    @Get("whatsapp/:key")
    keyedChallenge(
    @Param("key")
    key: string, 
    @Query()
    q: Row, 
    @Res()
    res: Response) {
        return this.doChallenge(q, res, key);
    }
    async doChallenge(q: Row, res: Response, key?: string) {
        const a = await this.connection(key);
        const token = a ? this.p.crypto.decrypt(a.verify_token) : process.env.WHATSAPP_VERIFY_TOKEN;
        requireThat(token && (q["hub.mode"] || q.hub_mode) === "subscribe" && same(token, String(q["hub.verify_token"] || q.hub_verify_token || "")), "Invalid webhook verification.", 403);
        if (a)
            await this.p.db("whatsapp_accounts").where({
                id: a.id
            }).update({
                webhook_verified_at: new Date()
            });
        res.type("text/plain").send(String(q["hub.challenge"] || q.hub_challenge || ""));
    }
    @Post("whatsapp")
    @HttpCode(200)
    whatsapp(
    @Req()
    r: AppRequest) {
        return this.doWhatsapp(r);
    }
    @Post("whatsapp/:key")
    @HttpCode(200)
    keyedWhatsapp(
    @Param("key")
    key: string, 
    @Req()
    r: AppRequest) {
        return this.doWhatsapp(r, key);
    }
    async doWhatsapp(r: AppRequest, key?: string) {
        const connection = await this.connection(key);
        const secret = connection ? this.p.crypto.decrypt(connection.app_secret) : process.env.WHATSAPP_APP_SECRET;
        const raw = (r as any).rawBody as Buffer;
        requireThat(Buffer.isBuffer(raw), "Raw webhook payload is unavailable.", 503);
        const body = verifySignature(raw, secret, r.header("X-Hub-Signature-256"), "sha256=");
        for (const entry of body.entry || [])
            for (const change of entry.changes || []) {
                const v = change.value || {};
                const phone = v.metadata?.phone_number_id;
                const a = phone && await this.p.db("whatsapp_accounts").where({
                    phone_number_id: phone
                }).first();
                if (a && (connection ? Number(a.id) === Number(connection.id) : !a.app_secret))
                    await this.p.persist("whatsapp", a.business_id, hash(`whatsapp:${phone}:${JSON.stringify(v)}`), v);
            }
        return {
            received: true
        };
    }
    @Post("razorpay")
    @HttpCode(200)
    async razorpay(
    @Req()
    r: AppRequest) {
        const raw = (r as any).rawBody as Buffer;
        requireThat(Buffer.isBuffer(raw), "Raw webhook payload is unavailable.", 503);
        const body = verifySignature(raw, process.env.RAZORPAY_WEBHOOK_SECRET, r.header("X-Razorpay-Signature"));
        const s = await this.p.db("subscriptions").where({
            provider_id: body.payload?.subscription?.entity?.id || ""
        }).first();
        await this.p.persist("razorpay", s?.business_id || null, hash(`razorpay:${r.header("X-Razorpay-Event-Id") || raw.toString()}`), body);
        return {
            received: true
        };
    }
}
