import crypto from 'crypto';

export const generateToken = (length: number = 16): string => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};
