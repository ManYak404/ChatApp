import { auth, db } from "@/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    DocumentData,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    QueryDocumentSnapshot,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  from: string;
  to: string;
  timestamp: Date;
}

export default function Chat() {
  const params = useLocalSearchParams();
  const chatId = (params.chatId as string) || "";
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = auth.currentUser?.uid || "";
  const [otherUserId, setOtherUserId] = useState<string>("");
  const [otherParticipantDisplayName, setOtherParticipantDisplayName] = useState<string>("Loading...");

  // Fetch chat document to get participants and extract otherUserId, then fetch display name
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setLoading(false);
      return;
    }

    const fetchChatData = async () => {
      try {
        const chatDocRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatDocRef);
        
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          const participants = chatData.participants || [];
          // Find the other participant (not the current user)
          const other = participants.find((id: string) => id !== currentUserId);
          setOtherUserId(other || "");

          // Fetch the other participant's display name
          if (other) {
            try {
              const userDocRef = doc(db, "users", other);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setOtherParticipantDisplayName(userData.displayName || "Unknown");
              } else {
                setOtherParticipantDisplayName("Unknown");
              }
            } catch (error) {
              console.error("Error fetching other participant's display name:", error);
              setOtherParticipantDisplayName("Unknown");
            }
          } else {
            setOtherParticipantDisplayName("Unknown");
          }
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };

    fetchChatData();
  }, [chatId, currentUserId]);

  // Listen to messages
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, "chats", chatId, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          const timestamp = data.timestamp as Timestamp | undefined;
          return {
            id: doc.id,
            text: data.text || "",
            from: data.from || "",
            to: data.to || "",
            timestamp: timestamp?.toDate() || new Date(), // Fallback to current date if timestamp is missing
          };
        });
        setMessages(fetchedMessages);
        setLoading(false);
        
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUserId]);

  const handleSend = async () => {
    if (!message.trim() || !currentUserId || !otherUserId || sending) return;

    setSending(true);
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: message.trim(),
        from: currentUserId,
        to: otherUserId,
        timestamp: serverTimestamp(), // Required: timestamp for ordering
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.from === currentUserId;
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.sentText : styles.receivedText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isCurrentUser ? styles.sentTimestamp : styles.receivedTimestamp,
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (!chatId) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No chat selected</Text>
          <Text style={styles.emptySubtext}>
            Select a chat from the Chats tab to start messaging
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with back button and display name */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/chats")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherParticipantDisplayName}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Chat content area */}
        <View style={styles.chatContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Start a conversation!</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Input area at the bottom */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                (!message.trim() || sending || !otherUserId) && styles.sendButtonDisabled,
              ]}
              disabled={!message.trim() || sending || !otherUserId}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={message.trim() && otherUserId ? "#fff" : "#999"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

{/* Styles */}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  keyboardView: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: "row",
  },
  sentMessage: {
    justifyContent: "flex-end",
  },
  receivedMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: "#fff",
  },
  receivedText: {
    color: "#000",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  sentTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  receivedTimestamp: {
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 48,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#000",
    maxHeight: 112,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
});
