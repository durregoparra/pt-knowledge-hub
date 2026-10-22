// Company options and copy, shared by the register form, the hub and the API routes.
// The rules mirror public.companies and the link_new_user_to_company() trigger.

export const COMPANY_NAME_MAX = 200;

export const COMPANY_MESSAGES = {
  new: 'This company does not exist yet. It will be created, and you will be registered as its administrator.',
  existing: "You'll be registered as a user associated with this company. You will not be the company administrator.",
};

// A company the signed-in user belongs to, and their role in it.
export type CompanyMembership = { companyName: string; isAdmin: boolean };

// What the user sees after signing up, and on the hub.
export function membershipMessage({ companyName, isAdmin }: CompanyMembership, justRegistered = false) {
  if (isAdmin) {
    return justRegistered
      ? `You created ${companyName} and are its administrator.`
      : `You are the administrator of ${companyName}.`;
  }
  return justRegistered
    ? `You joined ${companyName} as a user. You are not the company administrator.`
    : `You are a user of ${companyName}.`;
}
