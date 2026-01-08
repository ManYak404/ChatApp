import { auth, db } from "@/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Chat {
  id: string;
  participants: string[];
}

export default function ChatsList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const currentUserId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", currentUserId)
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        const fetchedChats: Chat[] = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return {
              id: doc.id,
              participants: data.participants || [],
            };
          }
        );
        setChats(fetchedChats);

        // Fetch display names for all other participants
        const fetchDisplayNames = async () => {
          const otherParticipantIds = fetchedChats
            .map((chat) => chat.participants.find((id) => id !== currentUserId))
            .filter((id): id is string => !!id);

          // Remove duplicates
          const uniqueParticipantIds = Array.from(new Set(otherParticipantIds));

          if (uniqueParticipantIds.length === 0) {
            return;
          }

          // Fetch display names for all participants
          const namesToFetch: Record<string, string> = {};
          
          await Promise.all(
            uniqueParticipantIds.map(async (participantId) => {
              try {
                const userDocRef = doc(db, "users", participantId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  namesToFetch[participantId] = userData.displayName || "Unknown";
                } else {
                  namesToFetch[participantId] = "Unknown";
                }
              } catch (error) {
                console.error(
                  `Error fetching display name for ${participantId}:`,
                  error
                );
                namesToFetch[participantId] = "Unknown";
              }
            })
          );

          // Update display names (functional update handles merging)
          setDisplayNames((prev) => ({ ...prev, ...namesToFetch }));
        };

        await fetchDisplayNames();
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const getOtherParticipantId = (participants: string[]): string => {
    const other = participants.find((id) => id !== currentUserId);
    return other || "";
  };

  const getOtherParticipantDisplayName = (participants: string[]): string => {
    const otherId = getOtherParticipantId(participants);
    if (!otherId) return "Unknown";
    return displayNames[otherId] || "Loading...";
  };

  const handleChatPress = (chatId: string) => {
    // Navigate to the chat detail screen
    router.push(`/chat?chatId=${encodeURIComponent(chatId)}` as any);
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const otherParticipantDisplayName = getOtherParticipantDisplayName(
      item.participants
    );
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubble" size={24} color="#007AFF" />
        </View>
        <View style={styles.chatContent}>
          <Text style={styles.chatTitle}>
            Chat with {otherParticipantDisplayName}
          </Text>
          <Text style={styles.chatSubtitle}>
            {item.participants.length} participant
            {item.participants.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const handleCreateChat = () => {
    router.push("/create-chat" as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>
                Start a new conversation to see it here
              </Text>
            </View>
          }
        />
      )}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateChat}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  createButton: {
    position: "absolute",
    bottom: 80, // Account for tab bar height
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
});

