import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';

import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../config/database.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import { createAccessToken } from './token.service.js';

const createSlug = (companyName: string): string => {
  const normalizedName = companyName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const suffix = randomUUID().slice(0, 8);

  return `${normalizedName || 'company'}-${suffix}`;
};

export const registerCompany = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = createSlug(input.companyName);

  return prisma.$transaction(async (transaction) => {
    const company = await transaction.company.create({
      data: {
        name: input.companyName,
        slug,
        vatNumber: input.vatNumber || null,
      },
    });

    const user = await transaction.user.create({
      data: {
        companyId: company.id,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'COMPANY_OWNER',
      },
      select: {
        id: true,
        companyId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        vatNumber: company.vatNumber,
      },
      user,
    };
  });
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordIsCorrect = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordIsCorrect) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(403, 'This account is inactive');
  }

  if (user.company && !user.company.isActive) {
    throw new AppError(403, 'This company account is inactive');
  }

  const accessToken = await createAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    company: user.company,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          vatNumber: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'User account no longer exists');
  }

  if (!user.isActive) {
    throw new AppError(403, 'This account is inactive');
  }

  if (user.company && !user.company.isActive) {
    throw new AppError(403, 'This company account is inactive');
  }

  return user;
};