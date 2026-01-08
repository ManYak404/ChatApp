import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { auth } from "../config/firebase";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in, route to chats
        router.replace("/(tabs)/chats");
      } else {
        // User is not logged in, route to login
        router.replace("/login");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // This shouldn't render as we redirect above, but just in case
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

