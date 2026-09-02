import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World | matthew.tech",
  description: "The Garden simulation",
};

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
