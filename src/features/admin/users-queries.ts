import type { AdminRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const USERS_PAGE_SIZE = 20;

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  school: string | null;
  bannedAt: Date | null;
  createdAt: Date;
  isAdmin: boolean;
  adminRole: AdminRole | null;
};

export type UsersResult = {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
};

/** Which of these emails belong to an active admin account, and at what role.
 * Admins live in a separate table, so "is this user an admin" is a join on
 * email done once per page rather than a column on User. */
async function adminRolesByEmail(emails: string[]): Promise<Map<string, AdminRole>> {
  if (emails.length === 0) return new Map();
  const admins = await prisma.adminUser.findMany({
    where: { isActive: true, email: { in: emails } },
    select: { email: true, role: true },
  });
  return new Map(admins.map((a) => [a.email, a.role]));
}

export async function getUsers(params: {
  q?: string;
  page?: number;
}): Promise<UsersResult> {
  const page = Math.max(1, params.page ?? 1);
  const q = params.q?.trim();

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        school: true,
        bannedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const roles = await adminRolesByEmail(users.map((u) => u.email));

  return {
    users: users.map((u) => ({
      ...u,
      isAdmin: roles.has(u.email),
      adminRole: roles.get(u.email) ?? null,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
  };
}

export type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  school: string | null;
  timezone: string;
  bannedAt: Date | null;
  banReason: string | null;
  createdAt: Date;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  lastActiveAt: Date | null;
  counts: {
    todos: number;
    studySessions: number;
    subjects: number;
    problems: number;
    mockExams: number;
  };
};

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      school: true,
      timezone: true,
      bannedAt: true,
      banReason: true,
      createdAt: true,
      _count: {
        select: {
          todos: true,
          studySessions: true,
          subjects: true,
          problems: true,
          mockExams: true,
        },
      },
    },
  });
  if (!user) return null;

  const [adminRecord, lastSession] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { email: user.email },
      select: { role: true, isActive: true },
    }),
    prisma.studySession.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const isAdmin = Boolean(adminRecord?.isActive);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    school: user.school,
    timezone: user.timezone,
    bannedAt: user.bannedAt,
    banReason: user.banReason,
    createdAt: user.createdAt,
    isAdmin,
    adminRole: isAdmin ? (adminRecord?.role ?? null) : null,
    lastActiveAt: lastSession?.startedAt ?? null,
    counts: {
      todos: user._count.todos,
      studySessions: user._count.studySessions,
      subjects: user._count.subjects,
      problems: user._count.problems,
      mockExams: user._count.mockExams,
    },
  };
}
