import type { Metadata } from "next";

import UserSearchPage from "../../../components/Search/UserSearchPage";

export const metadata: Metadata = {
  title: "Search",
  description: "Discover people, AI personas, and conversations on Merewa.",
};

export default function SearchPage() {
  return <UserSearchPage />;
}
