import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import { prisma } from "../../config/database.js";
import type {
  CreateCustomerInput,
  CustomerListQuery,
  UpdateCustomerInput,
} from "./customer.schema.js";

const customerSelect = {
  id: true,
  name: true,
  contactPerson: true,
  email: true,
  phone: true,
  vatNumber: true,
  addressLine: true,
  postalCode: true,
  city: true,
  countryCode: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

export const createCustomer = (companyId: string, input: CreateCustomerInput) =>
  prisma.customer.create({
    data: {
      ...input,
      email: input.email || null,
      companyId,
    },
    select: customerSelect,
  });

export const listCustomers = async (
  companyId: string,
  query: CustomerListQuery,
) => {
  const where: Prisma.CustomerWhereInput = {
    companyId,
    ...(query.status === "all" ? {} : { isActive: query.status === "active" }),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            {
              contactPerson: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            { email: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { vatNumber: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getCustomer = async (companyId: string, customerId: string) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId,
    },
    select: customerSelect,
  });

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
};

export const updateCustomer = async (
  companyId: string,
  customerId: string,
  input: UpdateCustomerInput,
) => {
  await getCustomer(companyId, customerId);

  return prisma.customer.update({
    where: { id: customerId },
    data: input,
    select: customerSelect,
  });
};

export const archiveCustomer = async (
  companyId: string,
  customerId: string,
) => {
  await getCustomer(companyId, customerId);

  // Archiving preserves history and keeps linked work orders valid.
  return prisma.customer.update({
    where: { id: customerId },
    data: { isActive: false },
    select: customerSelect,
  });
};

export const restoreCustomer = async (
  companyId: string,
  customerId: string,
) => {
  await getCustomer(companyId, customerId);

  return prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      isActive: true,
    },
    select: customerSelect,
  });
};
