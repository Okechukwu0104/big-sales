import { Facebook, Instagram, Twitter, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({
      title: "Subscribed Successfully!",
      description: "Thank you for joining our newsletter.",
    });
    setEmail('');
  };

  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Newsletter Section */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-foreground tracking-tight mb-4">Join Our VIP List</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl border border-border/50 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Search</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Products</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Track Order</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Return Policy</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>support@bigsales.ng</span>
              </li>
              <li className="text-sm text-muted-foreground">
                Monday to Saturday <br />
                8:00 AM to 6:00 PM
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Big Sales. All rights reserved.
          </p>
          <div className="flex gap-2 items-center">
            {/* Payment Method Icons (Placeholder divs for a clean look) */}
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};
