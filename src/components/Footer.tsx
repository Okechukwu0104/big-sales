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

        {/* SEO Text Section — indexed by Google for keyword relevance */}
        <div className="border-t border-border/30 pt-10 pb-6 space-y-4">
          <div className="max-w-4xl">
            <h2 className="text-sm font-semibold text-foreground mb-3">About BIG SALES Nigeria</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              BIG SALES is Nigeria's most trusted online marketplace for electronics, fashion, home appliances, and
              lifestyle products. Buy phones, laptops, power banks, air fryers, generators, solar panels, wigs,
              sneakers, or the latest Ankara styles — all at unbeatable prices with pay on delivery across Lagos,
              Abuja, Port Harcourt, Kano, Ibadan, Enugu and 20+ states nationwide. Every product is 100% original
              and authenticated. BIG SALES is the best affordable alternative to Jumia and Konga in Nigeria.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              <strong className="text-foreground/60">Electronics &amp; Gadgets:</strong>{' '}
              Buy smartphones Nigeria — Samsung Galaxy, Tecno Camon, Infinix Hot, iPhone 13, iPhone 14, iPhone 15,
              refurbished iPhones, Android phones, cheap phones Lagos. Shop laptops Nigeria — HP, Dell, Lenovo,
              Asus gaming laptops, MacBook Air, tokunbo laptops, UK-used laptops. Buy power banks, Airpods,
              Bluetooth earphones, Samsung earbuds, JBL speakers, ring lights, DSLR cameras, action cameras,
              smart TVs (32", 43", 55"), gaming consoles, PS5, Xbox, gaming keyboards and headsets — all with
              fast delivery across Nigeria.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              <strong className="text-foreground/60">Home Appliances &amp; Kitchen:</strong>{' '}
              Air fryers Nigeria, blenders, rice cookers, pressure cookers, electric kettles, toasters, ovens,
              sandwich makers, food processors, hand mixers, deep fryers, induction cookers, non-stick pots,
              cookware sets, dinner sets, juice extractors, smoothie makers. Buy refrigerators Nigeria —
              Hisense, LG, Thermocool, chest freezers. Washing machines Nigeria — LG, Samsung, Nexus.
              Gas cookers, 4-burner cookers, table-top cookers. Buy standing fans, ceiling fans, rechargeable
              fans, solar fans, wall fans. Split AC, portable AC Nigeria at the best prices.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              <strong className="text-foreground/60">Power Solutions:</strong>{' '}
              Solar generators Nigeria, solar panels, 200Ah inverter batteries, Luminous batteries, Sukam batteries,
              Firman generators, Honda generators, cheap generators Nigeria, rechargeable power stations, EcoFlow,
              voltage stabilizers, rechargeable fans, solar fans — everything you need to power your home and
              business amid power outages across Nigeria.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              <strong className="text-foreground/60">Fashion, Wigs &amp; Beauty:</strong>{' '}
              Buy human hair wigs Lagos — bone-straight, closure wigs, frontal wigs, 360 wigs, glueless wigs,
              synthetic wigs, braiding hair, crochet hair, hair extensions. Ankara styles Nigeria, Adire fabric,
              Aso-oke, lace fabric, George fabric, ready-to-wear Ankara, native wear, Agbada, Kaftan, Senator wear,
              gowns, jumpsuits, maxi dresses, mini dresses, polo shirts, hoodies, tracksuits, plus-size clothing,
              maternity wear, kids clothing, sneakers, football boots, running shoes, ladies handbags, backpacks,
              school bags, travel bags, wallets, sunglasses, earrings, necklaces, bracelets.
              Skincare Nigeria — Vitamin C serum, Retinol serum, sunscreen, face cream, body lotion, toning cream.
              Makeup Nigeria — foundation, concealer, eyeshadow palette, mascara, lip balm, blush, highlighter,
              contour kits, makeup brush sets. Perfumes, cologne, body mist, deodorant, hair cream, edge control.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              <strong className="text-foreground/60">Health, Fitness &amp; Baby:</strong>{' '}
              Treadmills, exercise bikes, dumbbells, yoga mats, resistance bands, gym gloves, protein supplements,
              blood pressure monitors, glucose meters, thermometers, pulse oximeters, first aid kits.
              Baby products Nigeria — baby cots, prams, diapers, Pampers, baby wipes, kids shoes, school supplies,
              toys Nigeria, kids toys online.
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              <strong className="text-foreground/60">Popular Searches on BIG SALES:</strong>{' '}
              Smartphones Nigeria &middot; Laptops Nigeria &middot; Power Banks &middot; Bluetooth Earphones &middot;
              Air Fryers &middot; Blenders &middot; Generators &middot; Solar Panels &middot; Inverter Batteries &middot;
              Fashion &amp; Ankara &middot; Wigs &amp; Hair &middot; Skincare &middot; Perfumes &middot; Sneakers &middot;
              Home Appliances &middot; Smart Watches &middot; Baby Products &middot; Gym Equipment &middot;
              Office Chairs &middot; CCTV Cameras &middot; Printers &middot; Gaming Consoles &middot; Smart TVs
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Shop with confidence. We offer awoof prices, flash sales, promo deals, and fast delivery to your
              doorstep — pay on delivery when your order arrives. No scam. 100% original products. BIG SALES
              is your go-to online market in Nigeria for cheap, quality, and correct items.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Big Sales Nigeria. All rights reserved.
          </p>
          <div className="flex gap-2 items-center">
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
            <div className="w-10 h-6 bg-muted rounded border border-border/50"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};
