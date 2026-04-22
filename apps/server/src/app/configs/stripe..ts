import Stripe from 'stripe'
import configs from '.'

// 1. Stripe Config:
export const stripe = new Stripe(configs.stripe.secretKey as string, {
  apiVersion: '2025-01-27.acacia' as any,
})
