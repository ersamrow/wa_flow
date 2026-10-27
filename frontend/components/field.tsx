import type { InputHTMLAttributes } from 'react';

export default function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
    const id = props.id ?? props.name;
    return <label htmlFor={id}>{label}<input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />{error && <span id={`${id}-error`} role="alert" className="error-banner">{error}</span>}</label>;
}
