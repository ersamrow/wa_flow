'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="loading"><h2>Unable to open this page</h2><p role="alert">Please try again.</p><button onClick={reset}>Try again</button></div>; }
