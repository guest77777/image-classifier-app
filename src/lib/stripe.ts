import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const PRICE_IDS = {
  FREE: 'price_free',
  PRO: process.env.STRIPE_PRO_PRICE_ID!,
} as const; 