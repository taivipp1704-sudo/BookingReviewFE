export const REQUIRED_ONBOARDING_VERSION = 1;

export function needsCustomerOnboarding(account) {
  return Boolean(account) && Number(account.onboardingVersion || 0) < REQUIRED_ONBOARDING_VERSION;
}
