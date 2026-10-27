import { notFound } from 'next/navigation';
export default async function WorkspacePage({ params }: { params: Promise<{ section?: string[] }> }) {
 const { section } = await params;
 if (section && (section.length !== 1 || !['inbox','customers','automations','knowledge','products','campaigns','settings','billing'].includes(section[0]))) notFound();
 return null;
}
