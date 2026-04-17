import UserListPage from "../../../../../components/Profile/UserListPage";

export default function FollowersPage({ params }: { params: { username: string } }) {
  return <UserListPage username={params.username} type="followers" />;
}
