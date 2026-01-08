import { Shield, Truck, RotateCcw, Award, Package, Clock } from 'lucide-react';

export const TrustBadges = () => {
  const badges = [
    {
      icon: Shield,
      title: "Secure Shopping",
      description: "Your data is protected"
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick & reliable shipping"
    },
    {
      icon: RotateCcw,
      title: "Easy Returns",
      description: "Hassle-free refunds"
    },
    {
      icon: Award,
      title: "Quality Guarantee",
      description: "100% authentic products"
    }
  ];

  return (
    <section className="py-12 bg-white border-y border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-foreground">Why Shop With Us?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <badge.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
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
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-primary mb-2">✨ Benefits of ordering online:</p>
      <div className="flex flex-wrap gap-3">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <benefit.icon className="h-4 w-4 text-primary" />
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
        <Shield className="h-4 w-4 text-green-600" />
        <span>Secure Checkout</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Truck className="h-4 w-4 text-primary" />
        <span>Fast Delivery</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Award className="h-4 w-4 text-amber-600" />
        <span>Quality Guaranteed</span>
      </div>
    </div>
  );
};
