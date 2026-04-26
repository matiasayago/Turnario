import { Redirect } from 'expo-router';

export default function Index() {
  // Redirigir al login original
  return <Redirect href="/login" />;
}
