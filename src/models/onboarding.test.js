import test from 'node:test';
import assert from 'node:assert/strict';
import { needsCustomerOnboarding } from './onboarding.js';

test('new customer accounts must complete onboarding even while booking is disabled', () => {
  assert.equal(needsCustomerOnboarding({ onboardingVersion: 0 }), true);
  assert.equal(needsCustomerOnboarding({}), true);
});

test('returning customer accounts skip onboarding after completing it once', () => {
  assert.equal(needsCustomerOnboarding({ onboardingVersion: 1 }), false);
  assert.equal(needsCustomerOnboarding({ onboardingVersion: 2 }), false);
});

test('anonymous visitors are handled by login instead of onboarding', () => {
  assert.equal(needsCustomerOnboarding(null), false);
});
