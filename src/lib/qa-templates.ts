// Pre-filled Q&A templates by business type
// Each business type gets 10+ common questions and answers.

export const QA_TEMPLATES: Record<
  string,
  { question: string; answer: string }[]
> = {
  restaurant: [
    {
      question: "What are your opening hours?",
      answer:
        "We're open Monday–Friday 11am–10pm, Saturday 10am–11pm, and Sunday 12pm–9pm.",
    },
    {
      question: "Do you offer delivery?",
      answer:
        "Yes, we deliver through DoorDash, UberEats, and our own website. Orders over $20 get free delivery.",
    },
    {
      question: "Do you accept reservations?",
      answer:
        "Yes, you can book a table online through our website or call us at (555) 123-4567.",
    },
    {
      question: "Is there parking available?",
      answer:
        "We have a free parking lot behind the building and street parking is also available.",
    },
    {
      question: "Do you have gluten-free options?",
      answer:
        "Yes, we have a dedicated gluten-free menu. Please ask your server for details.",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "You can cancel up to 2 hours before your reservation without charge.",
    },
    {
      question: "Do you have vegan options?",
      answer:
        "Yes, we have several vegan dishes clearly marked on our menu.",
    },
    {
      question: "Can I order takeout?",
      answer:
        "Absolutely! You can order online or call us to place a takeout order.",
    },
    {
      question: "Do you have a kids menu?",
      answer:
        "Yes, we offer a kids menu with smaller portions and coloring pages.",
    },
    {
      question: "Are you available for private events?",
      answer:
        "Yes, we can host parties of up to 50 people. Please contact our events team at events@restaurant.com.",
    },
  ],
  "clinic/medical": [
    {
      question: "What are your office hours?",
      answer:
        "Our clinic is open Monday–Friday 8am–6pm, and Saturday 9am–1pm.",
    },
    {
      question: "Do you accept my insurance?",
      answer:
        "We accept most major insurance plans. Please call our office to verify your coverage.",
    },
    {
      question: "How do I schedule an appointment?",
      answer:
        "You can book online through our patient portal or call us at (555) 123-4567.",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Please notify us at least 24 hours in advance to avoid a cancellation fee.",
    },
    {
      question: "Do you offer telemedicine appointments?",
      answer:
        "Yes, we offer virtual visits. You can schedule one through our patient portal.",
    },
    {
      question: "What should I bring to my first appointment?",
      answer:
        "Please bring your insurance card, photo ID, and any relevant medical records.",
    },
    {
      question: "Do you have parking?",
      answer:
        "Yes, free parking is available in the lot adjacent to our building.",
    },
    {
      question: "Are you accepting new patients?",
      answer:
        "Yes, we are currently accepting new patients. Call us to schedule a meet-and-greet.",
    },
    {
      question: "Do you provide after-hours care?",
      answer:
        "We have an on-call provider for urgent matters. Call our main line to be connected.",
    },
    {
      question: "How do I request a prescription refill?",
      answer:
        "You can request refills through your patient portal or call during office hours.",
    },
  ],
  "hair salon": [
    {
      question: "What are your opening hours?",
      answer:
        "We're open Tuesday–Saturday 10am–7pm, Sunday 12pm–5pm, closed Monday.",
    },
    {
      question: "Do I need an appointment?",
      answer:
        "Walk-ins are welcome, but appointments are recommended to avoid waiting.",
    },
    {
      question: "How do I book an appointment?",
      answer:
        "You can book online through our website or call us at (555) 123-4567.",
    },
    {
      question: "What services do you offer?",
      answer:
        "We offer haircuts, coloring, styling, blowouts, and treatments for all hair types.",
    },
    {
      question: "Do you have a cancellation policy?",
      answer:
        "Please cancel at least 24 hours in advance to avoid a 50% fee.",
    },
    {
      question: "What brands of products do you use?",
      answer:
        "We use professional brands including Redken, Olaplex, and Moroccanoil.",
    },
    {
      question: "Do you offer bridal styling?",
      answer:
        "Yes, we offer on-site bridal packages. Please contact us for a consultation.",
    },
    {
      question: "Is there parking?",
      answer:
        "Street parking is available, and there's a public lot one block away.",
    },
    {
      question: "Do you do kids haircuts?",
      answer:
        "Yes, we love cutting kids' hair! We offer a special kids menu with smaller prices.",
    },
    {
      question: "Do you accept credit cards?",
      answer:
        "Yes, we accept all major credit cards, Apple Pay, and cash.",
    },
  ],
  "gym/fitness": [
    {
      question: "What are your gym hours?",
      answer:
        "We're open 24/7 for members. Staffed hours are Monday–Friday 8am–8pm, Saturday 9am–5pm, Sunday 10am–4pm.",
    },
    {
      question: "How much does a membership cost?",
      answer:
        "Our basic membership starts at $29/month. We also offer premium and family plans.",
    },
    {
      question: "Do you offer personal training?",
      answer:
        "Yes, we have certified personal trainers available for one-on-one sessions. Ask at the front desk for pricing.",
    },
    {
      question: "Is there a cancellation fee?",
      answer:
        "You can cancel anytime with 30 days' written notice.",
    },
    {
      question: "Do you have group fitness classes?",
      answer:
        "Yes, we offer yoga, Zumba, spin, HIIT, and more. Check our app for the schedule.",
    },
    {
      question: "Can I try before I buy?",
      answer:
        "Absolutely! We offer a free day pass for first-time visitors.",
    },
    {
      question: "Do you have showers and lockers?",
      answer:
        "Yes, we have clean locker rooms with showers, towels available for rent.",
    },
    {
      question: "Is there parking?",
      answer: "Free parking is available in our lot.",
    },
    {
      question: "Do you offer childcare?",
      answer:
        "Yes, we have a supervised kids' club during peak hours for an additional fee.",
    },
    {
      question: "Can I freeze my membership?",
      answer:
        "Yes, you can freeze your membership for up to 3 months per year for medical or travel reasons.",
    },
  ],
  "real estate": [
    {
      question: "What areas do you serve?",
      answer:
        "We specialize in downtown, Northside, and the surrounding suburbs.",
    },
    {
      question: "How do I schedule a showing?",
      answer:
        "You can request a showing online or call us at (555) 123-4567.",
    },
    {
      question: "What is your commission rate?",
      answer:
        "Our standard commission is 6%, but we're happy to discuss custom packages.",
    },
    {
      question: "Do you help with first-time home buyers?",
      answer:
        "Yes, we have a dedicated program for first-time buyers including workshops and resources.",
    },
    {
      question: "How long does it take to sell a home?",
      answer:
        "On average, homes in our market sell within 45 days. We'll provide a personalized marketing plan.",
    },
    {
      question: "Do you handle rentals as well?",
      answer:
        "Yes, we assist with both leasing and property management.",
    },
    {
      question: "What should I do to prepare my home for sale?",
      answer:
        "We provide a complimentary home staging consultation and a list of recommended improvements.",
    },
    {
      question: "Do you have mortgage partners?",
      answer:
        "Yes, we work with several trusted local lenders to help you get pre-approved.",
    },
    {
      question: "How do I get a free home valuation?",
      answer:
        "Visit our website and enter your address for an instant estimate, or contact us for a more detailed analysis.",
    },
    {
      question: "Are your agents licensed?",
      answer:
        "All our agents are fully licensed and undergo continuous training.",
    },
  ],
  "law firm": [
    {
      question: "What areas of law do you practice?",
      answer:
        "We focus on family law, personal injury, estate planning, and business law.",
    },
    {
      question: "How do I schedule a consultation?",
      answer:
        "Call us at (555) 123-4567 or fill out the contact form on our website to book a free initial consultation.",
    },
    {
      question: "What are your office hours?",
      answer:
        "We're open Monday–Friday 9am–6pm. Evening and weekend appointments available by request.",
    },
    {
      question: "Do you offer virtual consultations?",
      answer:
        "Yes, we offer video consultations via Zoom or FaceTime.",
    },
    {
      question: "How much do you charge?",
      answer:
        "We offer flexible fee structures including hourly rates, flat fees, and contingency fees depending on the case type.",
    },
    {
      question: "What should I bring to my first appointment?",
      answer:
        "Please bring any relevant documents, a photo ID, and a list of questions you have.",
    },
    {
      question: "Do you speak other languages?",
      answer:
        "We have staff who speak Spanish, Mandarin, and Arabic. Please let us know your preference when scheduling.",
    },
    {
      question: "How long will my case take?",
      answer:
        "Case duration varies. We'll give you a realistic timeline during your consultation.",
    },
    {
      question: "Do you handle cases outside your city?",
      answer:
        "We are licensed to practice in state courts statewide and can assist clients anywhere in the state.",
    },
    {
      question: "What is your policy on returning calls?",
      answer:
        "We aim to return all calls and emails within 24 business hours.",
    },
  ],
  "retail store": [
    {
      question: "What are your store hours?",
      answer:
        "We're open Monday–Saturday 10am–8pm and Sunday 11am–6pm.",
    },
    {
      question: "Do you offer online shopping?",
      answer:
        "Yes, you can shop our full catalog on our website with home delivery or in-store pickup.",
    },
    {
      question: "What is your return policy?",
      answer:
        "We offer full refunds within 30 days with a receipt. Exchanges are welcome anytime.",
    },
    {
      question: "Do you offer gift cards?",
      answer:
        "Yes, gift cards are available in-store and online in any amount.",
    },
    {
      question: "Do you have a loyalty program?",
      answer:
        "Yes! Sign up for our rewards program and earn points on every purchase.",
    },
    {
      question: "Is there parking available?",
      answer:
        "Free parking is available in front of the store and in the adjacent lot.",
    },
    {
      question: "Do you offer price matching?",
      answer:
        "Yes, we match prices from major competitors. Just show us the ad or listing.",
    },
    {
      question: "Can I place a special order?",
      answer:
        "Absolutely! We can special order items not currently in stock. Ask any associate for help.",
    },
    {
      question: "Do you offer gift wrapping?",
      answer:
        "Yes, complimentary gift wrapping is available during the holiday season.",
    },
    {
      question: "Do you ship internationally?",
      answer:
        "Currently we ship within the US only. International shipping is coming soon.",
    },
  ],
  hotel: [
    {
      question: "What are your check-in and check-out times?",
      answer:
        "Check-in is at 3 PM and check-out is at 11 AM. Early check-in and late check-out are available upon request.",
    },
    {
      question: "Do you have free Wi-Fi?",
      answer:
        "Yes, complimentary high-speed Wi-Fi is available in all rooms and common areas.",
    },
    {
      question: "Is breakfast included?",
      answer:
        "Our rate includes a complimentary continental breakfast served 7–10 AM daily.",
    },
    {
      question: "Do you have parking?",
      answer:
        "Yes, we offer free self-parking and valet parking for $15/night.",
    },
    {
      question: "Is there a pool?",
      answer:
        "Yes, our outdoor pool is open seasonally from May through October, 8 AM–10 PM.",
    },
    {
      question: "Do you allow pets?",
      answer:
        "Yes, we are pet-friendly! A $25/night pet fee applies. Dogs under 50 lbs welcome.",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Free cancellation up to 48 hours before check-in. Late cancellations are charged one night's stay.",
    },
    {
      question: "Do you have a fitness center?",
      answer:
        "Yes, our 24-hour fitness center is available to all guests at no extra charge.",
    },
    {
      question: "Is there a shuttle service?",
      answer:
        "We offer a complimentary shuttle to the airport and downtown area.",
    },
    {
      question: "Do you host events or conferences?",
      answer:
        "Yes, we have meeting rooms and a ballroom. Contact our events team for availability.",
    },
  ],
  "dental clinic": [
    {
      question: "What are your office hours?",
      answer:
        "We're open Monday–Friday 8am–5pm and Saturday 9am–1pm.",
    },
    {
      question: "Do you accept dental insurance?",
      answer:
        "Yes, we accept most major dental insurance plans. Contact us to verify yours.",
    },
    {
      question: "How do I book an appointment?",
      answer:
        "You can book online, call us at (555) 123-4567, or text us.",
    },
    {
      question: "Do you offer teeth whitening?",
      answer:
        "Yes, we offer both in-office and take-home whitening treatments.",
    },
    {
      question: "What should I bring to my first visit?",
      answer:
        "Please bring your insurance card, photo ID, and any recent dental X-rays.",
    },
    {
      question: "Do you handle dental emergencies?",
      answer:
        "Yes, we reserve time daily for emergency appointments. Call us right away.",
    },
    {
      question: "Do you see children?",
      answer:
        "Yes, we welcome patients of all ages including children starting from age 1.",
    },
    {
      question: "What payment options do you offer?",
      answer:
        "We accept insurance, cash, credit cards, and offer payment plans through CareCredit.",
    },
    {
      question: "Are you accepting new patients?",
      answer:
        "Yes! New patients receive a complimentary exam and X-rays with their first visit.",
    },
    {
      question: "Do you offer sedation dentistry?",
      answer:
        "Yes, we offer nitrous oxide and oral sedation for anxious patients.",
    },
  ],
  "beauty spa": [
    {
      question: "What services do you offer?",
      answer:
        "We offer facials, massages, body wraps, waxing, manicures, pedicures, and more.",
    },
    {
      question: "What are your hours?",
      answer:
        "We're open Monday–Saturday 9am–8pm and Sunday 10am–6pm.",
    },
    {
      question: "How do I book an appointment?",
      answer:
        "Book online through our website, call us, or use our mobile app.",
    },
    {
      question: "Do you offer couples packages?",
      answer:
        "Yes, we have a dedicated couples suite with special packages. Perfect for anniversaries!",
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Please cancel at least 24 hours in advance to avoid a 50% cancellation fee.",
    },
    {
      question: "Do you sell gift cards?",
      answer:
        "Yes, gift cards are available in any amount, both in-store and online.",
    },
    {
      question: "What products do you use?",
      answer:
        "We use premium, cruelty-free products from brands like Dermalogica and Elemis.",
    },
    {
      question: "Is there parking?",
      answer:
        "Free parking is available behind the building.",
    },
    {
      question: "Do you offer membership plans?",
      answer:
        "Yes, our monthly membership includes one service per month plus 15% off additional treatments.",
    },
    {
      question: "Can I bring my own products?",
      answer:
        "We recommend using our professional products for best results, but you're welcome to discuss your preferences.",
    },
  ],
  "auto repair": [
    {
      question: "What are your shop hours?",
      answer:
        "We're open Monday–Friday 7:30am–6pm and Saturday 8am–2pm.",
    },
    {
      question: "Do I need an appointment?",
      answer:
        "Appointments are preferred, but we accept walk-ins on a first-come, first-served basis.",
    },
    {
      question: "What services do you offer?",
      answer:
        "We handle oil changes, brake repairs, tire services, engine diagnostics, A/C repair, and more.",
    },
    {
      question: "Do you offer free estimates?",
      answer:
        "Yes, we provide free written estimates before any work begins.",
    },
    {
      question: "Do you work on all car brands?",
      answer:
        "Yes, we service all major makes and models, both domestic and foreign.",
    },
    {
      question: "Do you offer a warranty on repairs?",
      answer:
        "Yes, all our repairs come with a 12-month / 12,000-mile warranty.",
    },
    {
      question: "Do you have loaner cars?",
      answer:
        "We offer a courtesy shuttle service and have a limited number of loaner vehicles available.",
    },
    {
      question: "Do you accept insurance claims?",
      answer:
        "Yes, we work with all major insurance companies for collision and repair claims.",
    },
    {
      question: "How long will my repair take?",
      answer:
        "Most standard repairs are completed same-day. We'll give you a time estimate when you drop off.",
    },
    {
      question: "Is there a waiting area?",
      answer:
        "Yes, our comfortable waiting room has Wi-Fi, coffee, and TV.",
    },
  ],
  other: [
    {
      question: "What are your business hours?",
      answer:
        "We're open Monday–Friday 9am–5pm. Please contact us for weekend availability.",
    },
    {
      question: "How can I contact you?",
      answer:
        "You can reach us by phone at (555) 123-4567 or email us at info@business.com.",
    },
    {
      question: "Where are you located?",
      answer:
        "We're located at 123 Main Street. Parking is available on-site.",
    },
    {
      question: "Do you offer online services?",
      answer:
        "Yes, many of our services are available remotely. Contact us for details.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept cash, all major credit cards, and bank transfers.",
    },
    {
      question: "Do you have a cancellation policy?",
      answer:
        "Please give us at least 24 hours' notice to cancel or reschedule.",
    },
    {
      question: "Are you hiring?",
      answer:
        "Check our website's Careers page for current openings.",
    },
    {
      question: "Do you offer discounts?",
      answer:
        "We offer seasonal promotions and loyalty discounts. Follow us on social media for updates.",
    },
    {
      question: "How do I leave a review?",
      answer:
        "We'd love your feedback! You can leave a review on Google or our website.",
    },
    {
      question: "Do you support accessibility needs?",
      answer:
        "Yes, our location is fully wheelchair accessible. Please let us know if you have specific requirements.",
    },
  ],
};

/**
 * Look up templates by business type.
 *
 * The lookup is case-insensitive and normalises common variants
 * (e.g. "Clinic/Medical" → "clinic/medical", "Hair Salon" → "hair salon").
 * Falls back to the "other" template set when no match is found.
 */
export function getTemplatesForBusinessType(
  businessType: string
): { question: string; answer: string }[] {
  const key = businessType.toLowerCase().trim();
  return QA_TEMPLATES[key] ?? QA_TEMPLATES.other ?? [];
}
