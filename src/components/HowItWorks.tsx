import { Search, ShoppingCart, CreditCard, Package } from 'lucide-react';

const steps = [
  {
    icon: Search,
    step: '1',
    title: 'Find Your Product',
    description: 'Search or browse our catalog for what you need',
  },
  {
    icon: ShoppingCart,
    step: '2',
    title: 'Add to Cart',
    description: 'Select your items and add them to your cart',
  },
  {
    icon: CreditCard,
    step: '3',
    title: 'Place Your Order',
    description: 'Fill in your details and submit your order',
  },
  {
    icon: Package,
    step: '4',
    title: 'Receive & Pay',
    description: 'Get your order delivered and pay on delivery',
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          Ordering from BIG SALES is easy and secure
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center group">
              {/* Connector line (hidden on first item and mobile) */}
              {i > 0 && (
                <div className="hidden md:block absolute top-8 -left-1/2 w-full h-[2px] bg-border z-0" />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                  Step {s.step}
                </span>
                <h3 className="font-semibold text-sm text-foreground mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
