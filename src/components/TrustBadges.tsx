import { Shield, Truck, Award, Package, Clock, MessageCircle } from 'lucide-react';

export const TrustBadges = () => {
  const badges = [
    {
      icon: Shield,
      title: "100% Original",
      description: "Authentic products guaranteed"
    },
    {
      icon: Truck,
      title: "Nationwide Delivery",
      description: "We deliver across Nigeria"
    },
    {
      icon: Award,
      title: "Pay on Delivery",
      description: "Pay when you receive"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Support",
      description: "Chat with us anytime"
    }
  ];

  return (
    <section className="py-10 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-foreground">Why Shop With Us?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge, index) => (
            <div key={index} className="flex flex-col items-center text-center p-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <badge.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-0.5">{badge.title}</h3>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
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
