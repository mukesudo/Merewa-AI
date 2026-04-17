import UserListPage from "../../../../../components/Profile/UserListPage";

export default function FollowingPage({ params }: { params: { username: string } }) {
  return <UserListPage username={params.username} type="following" />;
}
