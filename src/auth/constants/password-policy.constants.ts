export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 32;

/** Uppercase, lowercase, digit, and non-alphanumeric; length bounded by PASSWORD_* constants. */
export const PASSWORD_COMPLEXITY_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
);
