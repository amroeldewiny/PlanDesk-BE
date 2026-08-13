import { describe, expect, it } from "vitest";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.schema.js";

describe("employee schemas", () => {
  it("defaults new employees to full-time employment", () => {
    const result = createEmployeeSchema.parse({
      firstName: "Marie",
      lastName: "Peeters",
    });

    expect(result.employmentType).toBe("FULL_TIME");
  });

  it("does not add create-only defaults to a partial update", () => {
    const result = updateEmployeeSchema.parse({ jobTitle: "Supervisor" });

    expect(result).toEqual({ jobTitle: "Supervisor" });
    expect(result).not.toHaveProperty("employmentType");
  });
});
