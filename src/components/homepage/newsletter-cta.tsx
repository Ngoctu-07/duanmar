"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function NewsletterCTA() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <Mail className="h-12 w-12 mx-auto mb-4 opacity-80" />
        <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
          Get the latest travel tips, deals, and inspiration delivered to your inbox
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 h-12 px-4 rounded-lg bg-background/10 text-foreground placeholder:text-foreground/60 border border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/30"
          />
          <Button variant="secondary" size="lg">
            Subscribe
          </Button>
        </div>
      </div>
    </section>
  );
}
