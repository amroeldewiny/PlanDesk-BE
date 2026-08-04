import { jwtVerify, SignJWT } from 'jose';

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '15m';

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}

const encodedSecret = new TextEncoder().encode(jwtSecret);

export interface AccessTokenPayload {
  userId: string;
  companyId: string | null;
  role: string;
  email: string;
}

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

export const verifyAccessToken = async (
  token: string,
): Promise<AccessTokenPayload> => {
  const { payload } = await jwtVerify(token, encodedSecret, {
    issuer: 'plandesk-api',
    audience: 'plandesk-web',
  });

  if (
    !payload.sub ||
    typeof payload.email !== 'string' ||
    typeof payload.role !== 'string' ||
    (payload.companyId !== null && typeof payload.companyId !== 'string')
  ) {
    throw new Error('Invalid access token payload');
  }

  return {
    userId: payload.sub,
    companyId: payload.companyId,
    role: payload.role,
    email: payload.email,
  };
};