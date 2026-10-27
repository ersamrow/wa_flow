import { Injectable } from "@nestjs/common";
import { randomBytes, randomInt } from "node:crypto";
import { ProviderService } from "./provider.service";
import { hash, same, requireThat, parseJson, Row } from "./helpers";
@Injectable()
export class SignupService {
    constructor(readonly provider: ProviderService) {
    }
    get db() {
        return this.provider.db;
    }
    async start(id: number, user: number, session: string) {
        await this.provider.permanent(id);
        requireThat(this.provider.configured(), "Facebook connection is not configured by the platform owner yet.");
        const state = randomBytes(32).toString("hex");
        await this.db("whatsapp_signup_attempts").insert({
            state,
            business_id: id,
            user_id: user,
            session_hash: hash(session),
            expires_at: new Date(Date.now() + 900000),
            created_at: new Date(),
            updated_at: new Date()
        });
        return {
            state,
            app_id: process.env.WHATSAPP_APP_ID,
            config_id: process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID,
            version: process.env.WHATSAPP_GRAPH_VERSION
        };
    }
    async attempt(d: Row, id: number, user: number, session: string) {
        await this.provider.permanent(id);
        requireThat(this.provider.configured(), "Facebook connection is not configured.");
        const row = await this.db("whatsapp_signup_attempts").where({
            state: d.state,
            business_id: id,
            user_id: user
        }).first();
        requireThat(row && same(row.session_hash, hash(session)), "Connection session not found.", 404);
        requireThat(new Date(row.expires_at).getTime() > Date.now(), "Connection session expired. Click Connect WhatsApp with Facebook again.");
        return row;
    }
    async exchange(d: Row, id: number, user: number, session: string) {
        const row = await this.attempt(d, id, user, session);
        requireThat(await this.db("whatsapp_signup_attempts").where({
            id: row.id,
            status: "pending"
        }).update({
            status: "exchanging",
            updated_at: new Date()
        }), "This signup code was already submitted. Start a new connection if it failed.", 409);
        try {
            const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION}/oauth/access_token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: process.env.WHATSAPP_APP_ID!,
                    client_secret: process.env.WHATSAPP_APP_SECRET!,
                    code: d.code
                }),
                signal: AbortSignal.timeout(20000)
            });
            const data = await response.json();
            const token = data.access_token;
            requireThat(response.ok && typeof token === "string" && token, "Meta could not exchange the signup code. Connect again.");
            const debug = await this.provider.graph(`${process.env.WHATSAPP_APP_ID}|${process.env.WHATSAPP_APP_SECRET}`, "GET", "debug_token", {
                input_token: token
            });
            const details = debug.data || {};
            requireThat(details.is_valid && String(details.app_id) === process.env.WHATSAPP_APP_ID, "Meta returned a token for a different or invalid app.");
            for (const field of ["expires_at", "data_access_expires_at"])
                requireThat(!details[field] || details[field] > Date.now() / 1000, "Meta authorization has expired. Connect again.");
            requireThat(["whatsapp_business_management", "whatsapp_business_messaging"].every(scope => details.scopes?.includes(scope)), "Approve WhatsApp account management and messaging permissions, then connect again.");
            const targets = details.granular_scopes?.find((s: Row) => s.scope === "whatsapp_business_management")?.target_ids || [];
            await this.db("whatsapp_signup_attempts").where({
                id: row.id
            }).update({
                status: "authorized",
                access_token: this.provider.crypto.encrypt(token),
                allowed_waba_ids: JSON.stringify(targets.map(String)),
                updated_at: new Date()
            });
        }
        catch (e) {
            await this.db("whatsapp_signup_attempts").where({
                id: row.id
            }).update({
                status: "failed",
                error_code: "authorization_failed",
                access_token: null,
                updated_at: new Date()
            });
            throw e;
        }
    }
    async complete(d: Row, id: number, user: number, session: string) {
        const row = await this.attempt(d, id, user, session);
        if (row.status === "connected") {
            requireThat(row.waba_id === d.waba_id && row.phone_number_id === d.phone_number_id, "Connection already completed for a different phone.", 409);
            return;
        }
        requireThat(["authorized", "needs_review"].includes(row.status), "Authorization is not ready or this connection is already processing.", 409);
        requireThat(!row.phone_number_id || (row.phone_number_id === d.phone_number_id && row.waba_id === d.waba_id), "Retry the same phone or start a new connection.", 409);
        const targets = parseJson(row.allowed_waba_ids, []);
        requireThat(!targets.length || targets.includes(d.waba_id), "This WhatsApp account was not authorized in Facebook.");
        requireThat(!await this.db("whatsapp_accounts").where({
            phone_number_id: d.phone_number_id
        }).whereNot({
            business_id: id
        }).first(), "This phone is already connected to another workspace.");
        requireThat(await this.db("whatsapp_signup_attempts").where({
            id: row.id
        }).whereIn("status", ["authorized", "needs_review"]).update({
            status: "connecting",
            waba_id: d.waba_id,
            phone_number_id: d.phone_number_id,
            updated_at: new Date()
        }), "Connection already processing.", 409);
        try {
            const p = this.provider;
            const token = p.crypto.decrypt(row.access_token);
            const list = await p.graph(token, "GET", `${d.waba_id}/phone_numbers`, {
                fields: "id",
                limit: 100
            });
            requireThat(list.data?.some((n: Row) => n.id === d.phone_number_id), "Selected phone does not belong to the authorized WhatsApp account (first 100 phones).");
            const number = await p.graph(token, "GET", d.phone_number_id, {
                fields: "id,display_phone_number,platform_type,code_verification_status"
            });
            requireThat(number.id === d.phone_number_id && number.display_phone_number && number.code_verification_status === "VERIFIED", "Finish phone verification in Meta before connecting.");
            const pin = row.registration_pin ? p.crypto.decrypt(row.registration_pin) : String(randomInt(1000000)).padStart(6, "0");
            if (number.platform_type !== "CLOUD_API") {
                requireThat(!row.registration_attempted, "Phone registration outcome needs review in Meta. Confirm registration before retrying; it will not be repeated automatically.");
                row.registration_pin = p.crypto.encrypt(pin);
                row.registration_attempted = true;
                await this.db("whatsapp_signup_attempts").where({
                    id: row.id
                }).update({
                    registration_pin: row.registration_pin,
                    registration_attempted: true
                });
                const registered = await p.graph(token, "POST", `${d.phone_number_id}/register`, {
                    messaging_product: "whatsapp",
                    pin
                });
                requireThat(registered.success === true, "Meta did not confirm phone registration.");
            }
            const subscribed = await p.graph(token, "POST", `${d.waba_id}/subscribed_apps`);
            requireThat(subscribed.success === true, "Meta did not confirm webhook subscription. Retry connection setup.");
            await this.db.transaction(async (tx) => {
                await tx("businesses").where({
                    id
                }).forUpdate().first();
                requireThat(!await tx("whatsapp_accounts").where({
                    phone_number_id: d.phone_number_id
                }).whereNot({
                    business_id: id
                }).first(), "Phone already belongs to another workspace.");
                const old = await tx("whatsapp_accounts").where({
                    business_id: id
                }).first();
                const data = {
                    phone_number_id: d.phone_number_id,
                    display_phone: number.display_phone_number,
                    waba_id: d.waba_id,
                    access_token: p.crypto.encrypt(token),
                    app_secret: null,
                    verify_token: null,
                    webhook_key: null,
                    webhook_verified_at: null,
                    connection_type: "embedded",
                    registration_pin: row.registration_attempted || row.registration_pin ? p.crypto.encrypt(pin) : old?.phone_number_id === d.phone_number_id ? old.registration_pin : null,
                    updated_at: new Date()
                };
                if (old)
                    await tx("whatsapp_accounts").where({
                        id: old.id
                    }).update(data);
                else
                    await tx("whatsapp_accounts").insert({
                        ...data,
                        business_id: id,
                        created_at: new Date()
                    });
                await tx("whatsapp_signup_attempts").where({
                    id: row.id
                }).update({
                    status: "connected",
                    access_token: null,
                    registration_pin: null,
                    error_code: null,
                    updated_at: new Date()
                });
            });
        }
        catch (e) {
            await this.db("whatsapp_signup_attempts").where({
                id: row.id
            }).update({
                status: "needs_review",
                error_code: "setup_incomplete",
                updated_at: new Date()
            });
            throw e;
        }
    }
}
