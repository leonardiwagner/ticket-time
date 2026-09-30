import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { customerSchema, type Customer } from "./models/customer.js";

const dataDirectory = resolve(__dirname, "..");

export function loadCustomers(fileName = "customers.csv"): Customer[] {
  return readFileSync(resolve(dataDirectory, fileName), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, name] = line.trim().split(";");
      return customerSchema.parse({ id, name });
    });
}
