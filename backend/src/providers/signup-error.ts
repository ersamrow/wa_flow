// Only expose Meta's diagnostic fields, never the complete token response.
export function signupExchangeError(payload: unknown, status: number, secrets: string[]): string {
    const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const error = data.error && typeof data.error === "object" ? data.error as Record<string, unknown> : {};
    const redact = (value: string) => {
        for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
            value = value.split(secret).join("[redacted]");
            value = value.split(encodeURIComponent(secret)).join("[redacted]");
        }
        return value.replace(/((?:client_secret|access_token|appsecret_proof|code)=)[^\s&]+/gi, "$1[redacted]").slice(0, 2000);
    };
    const details: string[] = [];
    if (typeof error.message === "string" && error.message.trim()) details.push(error.message.trim());
    if (typeof error.type === "string") details.push(`type: ${error.type}`);
    if (typeof error.code === "number") details.push(`code: ${error.code}`);
    if (typeof error.error_subcode === "number") details.push(`subcode: ${error.error_subcode}`);
    if (typeof error.fbtrace_id === "string") details.push(`trace: ${error.fbtrace_id}`);
    return `Meta signup code exchange failed (HTTP ${status})${details.length ? `: ${redact(details.join("; "))}` : ": Meta returned no error details."} Start a new connection after correcting the issue.`;
}
