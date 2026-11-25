'use strict';
// Entitlements per tier. Shared by main (enforcement) and renderer (display). Tier comes from the RSA-signed licence token.
const TIERS = {
  trial: { secretaries: 2, pc: 1, android: 0, ratingApi: false, watermark: true, earlyUpdates: false, support: 'weekly', designer: true },
  pro:   { secretaries: 5, pc: 1, android: 0, ratingApi: true, watermark: false, earlyUpdates: false, support: '24/7', designer: true },
  max:   { secretaries: 99, pc: 2, android: 1, ratingApi: true, watermark: false, earlyUpdates: true, support: 'priority', designer: true }
};
const PRICES = { // USD
  pro: { monthly: 9.99, yearly: 99.99, lifetime: 349.99 },
  max: { monthly: 19.99, yearly: 199.99, lifetime: 699.99 }
};
const ent = (tier) => TIERS[tier] || TIERS.trial;
module.exports = { TIERS, PRICES, ent };
