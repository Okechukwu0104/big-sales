import { Shield, Truck, Award, Package, Clock, MessageCircle, RefreshCw, Lock } from 'lucide-react';

export const TrustBadges = () => {
  const badges = [
    {
      icon: Shield,
      title: "100% Original",
      description: "Every product is authentic and quality-checked"
    },
    {
      icon: Truck,
      title: "Nationwide Delivery",
      description: "We deliver to all 36 states in Nigeria"
    },
    {
      icon: Award,
      title: "Pay on Delivery",
      description: "Only pay when your order arrives safely"
    },
    {
      icon: RefreshCw,
      title: "Easy Returns",
      description: "7-day hassle-free return policy"
    },
    {
      icon: Lock,
      title: "Secure Orders",
      description: "Your personal info is always protected"
    },
    {
      icon: MessageCircle,
      title: "24/7 WhatsApp Support",
      description: "Get instant help anytime you need it"
    }
  ];

  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground">Why Shop With Us?</h2>
        <p className="text-center text-muted-foreground mb-8 text-sm">Thousands of Nigerians trust BIG SALES for quality and reliability</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/40 border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <badge.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const CartBenefits = () => {
  const benefits = [
    { icon: Package, text: "Order tracking included" },
    { icon: Clock, text: "Fast processing" },
    { icon: Shield, text: "Secure checkout" }
  ];

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-accent mb-2">✨ Benefits of ordering online:</p>
      <div className="flex flex-wrap gap-3">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <benefit.icon className="h-4 w-4 text-accent" />
            <span>{benefit.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CheckoutTrustBadges = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-accent" />
        <span>Secure Checkout</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Truck className="h-4 w-4 text-primary" />
        <span>Nationwide Delivery</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Award className="h-4 w-4 text-primary" />
        <span>100% Original</span>
      </div>
    </div>
  );
};
