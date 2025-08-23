// FILE: app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'


export const metadata: Metadata = {
title: 'Draft War Room',
description: 'Mock drafts, live board, and AI-ready assistant.'
}


export default function RootLayout({ children }: { children: ReactNode }) {
return (
<html lang="en">
<body>
<div className="mx-auto max-w-6xl p-4">{children}</div>
</body>
</html>
)
}