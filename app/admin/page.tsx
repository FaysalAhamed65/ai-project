import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/adminAuth";

export default async function AdminIndex() {
  redirect((await isAdminAuthed()) ? "/admin/dashboard" : "/admin/login");
}

