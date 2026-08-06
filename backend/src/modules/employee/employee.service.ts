import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from './employee.schema.js';

const employeeSelect = {
  id: true,
  userId: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  jobTitle: true,
  employmentType: true,
  startDate: true,
  endDate: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmployeeSelect;

const handleEmployeeConflict = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new AppError(
      409,
      'An employee with this employee number already exists',
    );
  }

  throw error;
};

export const createEmployee = async (
  companyId: string,
  input: CreateEmployeeInput,
) => {
  try {
    return await prisma.employee.create({
      data: {
        companyId,
        ...input,
      },
      select: employeeSelect,
    });
  } catch (error) {
    return handleEmployeeConflict(error);
  }
};

export const listEmployees = async (
  companyId: string,
  query: EmployeeListQuery,
) => {
  const where: Prisma.EmployeeWhereInput = {
    companyId,

    ...(query.status === 'all'
      ? {}
      : {
          isActive: query.status === 'active',
        }),

    ...(query.employmentType
      ? {
          employmentType: query.employmentType,
        }
      : {}),

    ...(query.search
      ? {
          OR: [
            {
              firstName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              employeeNumber: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              jobTitle: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [employees, total] = await prisma.$transaction([
    prisma.employee.findMany({
      where,
      select: employeeSelect,
      orderBy: [
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
      skip,
      take: query.limit,
    }),

    prisma.employee.count({
      where,
    }),
  ]);

  return {
    employees,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getEmployee = async (
  companyId: string,
  employeeId: string,
) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
    },
    select: employeeSelect,
  });

  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  return employee;
};

export const updateEmployee = async (
  companyId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
) => {
  await getEmployee(companyId, employeeId);

  try {
    return await prisma.employee.update({
      where: {
        id: employeeId,
      },
      data: input,
      select: employeeSelect,
    });
  } catch (error) {
    return handleEmployeeConflict(error);
  }
};

export const archiveEmployee = async (
  companyId: string,
  employeeId: string,
) => {
  await getEmployee(companyId, employeeId);

  return prisma.employee.update({
    where: {
      id: employeeId,
    },
    data: {
      isActive: false,
    },
    select: employeeSelect,
  });
};

export const restoreEmployee = async (
  companyId: string,
  employeeId: string,
) => {
  await getEmployee(companyId, employeeId);

  return prisma.employee.update({
    where: {
      id: employeeId,
    },
    data: {
      isActive: true,
    },
    select: employeeSelect,
  });
};