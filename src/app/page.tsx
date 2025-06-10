
'use client';

import Link from 'next/link';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus2, ArrowRight } from 'lucide-react';
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
          <FilePlus2 className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-primary mb-6">
            Welcome to QuickBill
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10">
            Effortlessly create and manage professional invoices for any scenario. Get started in seconds.
          </p>
          <Button asChild size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-7 px-10">
            <Link href="/new-invoice">
              Start New Invoice
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Card className="mt-16 text-left bg-card shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">Why QuickBill?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>✔️ Select from various invoice types: Rent, Freelance, Product Sales, and more.</p>
              <p>✔️ Fill in details with dynamic, easy-to-use forms.</p>
              <p>✔️ Optional login to save and manage your invoice history.</p>
              <p>✔️ Generate professional PDF invoices quickly.</p>
              <p className="font-semibold text-foreground">More features like digital signatures and public verification coming soon!</p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} QuickBill. All rights reserved.
      </footer>
    </div>
  );
}
