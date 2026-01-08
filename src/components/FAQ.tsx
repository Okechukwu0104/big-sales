import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I place an order?",
    answer: "Simply browse our products, add items to your cart, and proceed to checkout. Fill in your shipping details and submit your order. You'll receive confirmation and payment instructions immediately."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept bank transfers and mobile money payments. Payment details will be shown after you place your order, and you can send proof of payment via WhatsApp."
  },
  {
    question: "How long does delivery take?",
    answer: "Delivery typically takes 1-3 business days within the city and 3-7 business days for other areas. You'll receive tracking updates after your payment is confirmed."
  },
  {
    question: "Can I track my order?",
    answer: "Yes! After placing your order, you can track its status using your phone number or email on our Track Order page. We'll also update you via WhatsApp."
  },
  {
    question: "What if I'm not satisfied with my purchase?",
    answer: "We offer easy returns within 7 days of delivery. Contact us via WhatsApp with your order details and we'll arrange a return or exchange."
  },
  {
    question: "Are your products authentic?",
    answer: "Absolutely! We guarantee 100% authentic products. Every item goes through quality checks before shipping to ensure you receive the best."
  }
];

export const FAQ = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-foreground">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground mb-8">Everything you need to know about ordering</p>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
