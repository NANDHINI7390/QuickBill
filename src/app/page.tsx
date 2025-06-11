
'use client';

import Link from 'next/link';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <FileText className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-primary mb-6">
            QuickBill: Secure Rent Invoices
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10">
            Easily create rent invoices that are digitally signed and verified by the landlord via a secure mobile link.
          </p>
          <Button asChild size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-7 px-10">
            <Link href="/new-invoice">
              Create Rent Invoice
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Card className="mt-16 text-left bg-card shadow-xl border-border">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
                <ShieldCheck className="h-7 w-7"/> Why QuickBill for Rent?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>✔️ Initiate rent invoice details quickly.</p>
              <p>✔️ Landlord verifies and digitally signs via a unique link sent to their mobile (manual sharing for now).</p>
              <p>✔️ Generates a verifiable invoice with digital signature, timestamp, and masked mobile number.</p>
              <p>✔️ Download signed invoices as PDF.</p>
              <p className="font-semibold text-foreground">Secure, simple, and trustworthy rent invoicing.</p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} QuickBill. Secure Rent Invoicing.
      </footer>
    </div>
  );
}
