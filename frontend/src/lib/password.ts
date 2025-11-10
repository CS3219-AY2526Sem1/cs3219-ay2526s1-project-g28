export type PasswordRequirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter (a-z)",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter (A-Z)",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "At least one number (0-9)",
    test: (value) => /\d/.test(value),
  },
  {
    id: "special",
    label: "At least one special character (!@#$…)",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export function getPasswordRequirementStatus(password: string) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}

export function isPasswordStrong(password: string) {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}
