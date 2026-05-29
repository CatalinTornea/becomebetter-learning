export type UserRole = "STUDENT" | "COACH" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type CourseSummary = {
  id: string;
  title: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
};
