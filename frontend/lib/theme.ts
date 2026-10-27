'use client';
import { useEffect, useState } from 'react';
export function useTheme() {
 const [dark, setDark] = useState(false);
 useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
 function update(value: boolean) {
   setDark(value);
   document.documentElement.dataset.theme = value ? 'dark' : 'light';
   try { localStorage.setItem('waflow-theme', value ? 'dark' : 'light'); } catch { }
 }
 return [dark, update] as const;
}
