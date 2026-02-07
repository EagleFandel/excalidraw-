import { prisma } from "../prisma.js";

import type { User } from "@prisma/client";

export class UsersService {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName ?? null,
      },
    });
  }
}
