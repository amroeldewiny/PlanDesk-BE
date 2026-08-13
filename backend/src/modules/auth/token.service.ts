import { jwtVerify, SignJWT } from 'jose';

/**
 * Authentication configuration is loaded once when the application
 * starts. JWT_EXPIRES_IN can contain values such as 30m, 2h or 1d.
 */
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn =
  process.env.JWT_EXPIRES_IN ?? '15m';

/**
 * Stop application startup when the JWT configuration is unsafe
 * or missing. The same secret must be used when signing and verifying.
 */
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must contain at least 32 characters',
  );
}

const encodedSecret =
  new TextEncoder().encode(jwtSecret);

/**
 * Trusted authentication information returned after token verification.
 */
export interface AccessTokenPayload {
  userId: string;
  companyId: string | null;
  role: string;
  email: string;
}

/**
 * Creates a signed access token for an authenticated user.
 *
 * The user ID is stored in the standard JWT subject claim.
 * Company and role claims support authorization after verification.
 */
export const createAccessToken = async (
  payload: AccessTokenPayload,
): Promise<string> => {
  return new SignJWT({
    companyId: payload.companyId,
    role: payload.role,
    email: payload.email,
  })
    .setProtectedHeader({
      alg: 'HS256',
      typ: 'JWT',
    })
    .setSubject(payload.userId)
    .setIssuer('plandesk-api')
    .setAudience('plandesk-web')
    .setIssuedAt()
    .setExpirationTime(jwtExpiresIn)
    .sign(encodedSecret);
};

/**
 * Verifies a token's signature, expiration, issuer and audience.
 *
 * A payload is returned only after all expected claims have also
 * passed runtime type validation.
 */
export const verifyAccessToken = async (
  token: string,
): Promise<AccessTokenPayload> => {
  const { payload } = await jwtVerify(
    token,
    encodedSecret,
    {
      issuer: 'plandesk-api',
      audience: 'plandesk-web',
    },
  );

  if (
    !payload.sub ||
    typeof payload.email !== 'string' ||
    typeof payload.role !== 'string' ||
    (
      payload.companyId !== null &&
      typeof payload.companyId !== 'string'
    )
  ) {
    throw new Error(
      'Invalid access token payload',
    );
  }

  return {
    userId: payload.sub,
    companyId: payload.companyId,
    role: payload.role,
    email: payload.email,
  };
};