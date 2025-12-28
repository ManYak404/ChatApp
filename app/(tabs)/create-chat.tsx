import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateChat() {
  const [displayName, setDisplayName] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const handleCreateChat = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Please enter a display name");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create a chat");
      return;
    }

    // Don't allow creating a chat with yourself
    if (displayName.trim().toLowerCase() === currentUser.email?.toLowerCase()) {
      Alert.alert("Error", "You cannot create a chat with yourself");
      return;
    }

    setCreating(true);
    try {
      // Search for users with matching display name
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("displayName", "==", displayName.trim()));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        Alert.alert("Error", "No user found with that display name");
        setCreating(false);
        return;
      }

      // Get the first matching user
      const otherUserDoc = querySnapshot.docs[0];
      const otherUserId = otherUserDoc.id;

      // Don't create a chat if it's the same user
      if (otherUserId === currentUser.uid) {
        Alert.alert("Error", "You cannot create a chat with yourself");
        setCreating(false);
        return;
      }

      // Check if a chat already exists between these two users
      const chatsRef = collection(db, "chats");
      const existingChatsQuery = query(
        chatsRef,
        where("participants", "array-contains", currentUser.uid)
      );
      const existingChatsSnapshot = await getDocs(existingChatsQuery);

      // Check if a chat already exists with both participants
      const existingChat = existingChatsSnapshot.docs.find((doc) => {
        const participants = doc.data().participants || [];
        return participants.includes(otherUserId) && participants.includes(currentUser.uid);
      });

      if (existingChat) {
        // Navigate to existing chat
        router.replace(`/index?chatId=${encodeURIComponent(existingChat.id)}` as any);
        setCreating(false);
        return;
      }

      // Create new chat
      const chatDocRef = await addDoc(chatsRef, {
        participants: [currentUser.uid, otherUserId],
      });

      // Navigate to the new chat
      router.replace(`/index?chatId=${encodeURIComponent(chatDocRef.id)}` as any);
    } catch (error) {
      console.error("Error creating chat:", error);
      Alert.alert("Error", "Failed to create chat. Please try again.");
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Chat</Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!creating}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, creating && styles.buttonDisabled]}
          onPress={handleCreateChat}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Chat</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#000",
  },
  inputSection: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#000",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

