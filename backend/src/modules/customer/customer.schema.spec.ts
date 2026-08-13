import { describe, expect, it } from "vitest";

import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.schema.js";

describe("customer schemas", () => {
  it("normalizes explicitly cleared optional fields to null", () => {
    const result = updateCustomerSchema.parse({
      email: "",
      phone: "",
      notes: "",
    });

    expect(result).toEqual({
      email: null,
      phone: null,
      notes: null,
    });
  });

  it("does not add create-only defaults to a partial update", () => {
    const result = updateCustomerSchema.parse({ notes: "Updated" });

    expect(result).toEqual({ notes: "Updated" });
    expect(result).not.toHaveProperty("countryCode");
  });

  it("defaults new customers to Belgium", () => {
    const result = createCustomerSchema.parse({ name: "Hotel Maasland" });

    expect(result.countryCode).toBe("BE");
  });
});
