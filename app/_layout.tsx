import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { auth } from "../config/firebase";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;

    const currentRoute = segments[0];
    const inAuthGroup = currentRoute === "(tabs)";
    const isLogin = currentRoute === "login";
    // Index route: when segments is empty, we're at the root/index
    const isIndex = !currentRoute;

    // Let index page handle initial routing, don't interfere
    if (isIndex) {
      return;
    }

    if (!user && inAuthGroup) {
      // User is not signed in and trying to access protected route
      router.replace("/login");
    } else if (user && isLogin) {
      // User is signed in and trying to access login page, redirect to chats
      router.replace("/(tabs)/chats");
    }
  }, [user, segments, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
