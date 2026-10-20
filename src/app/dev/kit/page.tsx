import { notFound } from "next/navigation";
import { DevKit } from "@/components/devkit/DevKit";

export default function DevKitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevKit />;
}
