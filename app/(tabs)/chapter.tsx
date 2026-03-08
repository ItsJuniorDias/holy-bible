import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Text from "@/components/text";
// Importe o serviço do Gemini que criamos anteriormente
import { askMentor } from "@/services/geminiService";

import Markdown from "react-native-markdown-display";
import { MaterialIcons } from "@expo/vector-icons";

const fetchChapterVerses = async (chapter, translation, type) => {
  const formatType =
    type === "JHN" ? "john" : type === "GEN" ? "genesis" : type;

  const response = await fetch(
    `https://bible-api.com/${formatType}+${chapter}?translation=${translation}`,
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar os versículos");
  }

  const data = await response.json();
  return data.verses.map((v) => ({
    verse: v.verse,
    text: v.text,
  }));
};

export default function ChapterScreen() {
  const { chapter, language, type } = useLocalSearchParams();

  const currentChapter = chapter ?? "1";
  const currentTranslation = language ?? "almeida";

  // --- Estados do Bottom Sheet / Mentor ---
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [isMentorVisible, setIsMentorVisible] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // --- Estado do Banner Informativo ---
  const [showHint, setShowHint] = useState(false);

  const {
    data: versesData = [],
    isLoading,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: ["chapter", type, currentChapter, currentTranslation],
    queryFn: () => fetchChapterVerses(currentChapter, currentTranslation, type),
  });

  useEffect(() => {
    if (isError) {
      Alert.alert(
        currentTranslation === "almeida" ? "Erro" : "Error",
        currentTranslation === "almeida"
          ? "Não foi possível baixar os versículos."
          : "Could not download verses.",
        [
          {
            text:
              currentTranslation === "almeida" ? "Tentar novamente" : "Retry",
            onPress: () => refetch(),
          },
        ],
      );
    }
  }, [isError, error, currentTranslation]);

  // Verifica se o usuário já viu o banner anteriormente
  useEffect(() => {
    const checkHintStatus = async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem("@has_seen_mentor_hint");

        // Só mostra se for a primeira vez (null)
        if (hasSeenHint === null) {
          setShowHint(true);
        }
      } catch (error) {
        console.error("Erro ao ler o AsyncStorage:", error);
      }
    };
    checkHintStatus();
  }, []);

  // Esconde o banner e salva a preferência no AsyncStorage definitivamente
  const dismissHint = async () => {
    setShowHint(false);
    try {
      await AsyncStorage.setItem("@has_seen_mentor_hint", "true");
    } catch (error) {
      console.error("Erro ao salvar no AsyncStorage:", error);
    }
  };

  // Abre o modal de mentoria ao clicar no versículo
  const handleVersePress = (verse) => {
    setSelectedVerse(verse);
    setIsMentorVisible(true);
    setAnswer("");
    setQuestion("");

    // Oculta o banner e grava no AsyncStorage assim que abrir a modal (garantindo que não volte mais)
    dismissHint();
  };

  // Envia a pergunta para a IA
  const handleAskMentor = async () => {
    if (!question.trim() || !selectedVerse) return;

    setIsAsking(true);
    setAnswer("");

    const verseContext = `${currentTranslation === "almeida" ? "João" : "John"} ${currentChapter}:${selectedVerse.verse} - ${selectedVerse.text}`;
    const aiResponse = await askMentor(
      question,
      verseContext,
      currentTranslation,
    );

    setAnswer(aiResponse);
    setIsAsking(false);
  };

  const renderVerse = ({ item }) => (
    <TouchableOpacity
      style={styles.verseRow}
      onPress={() => handleVersePress(item)}
      activeOpacity={0.6}
    >
      <Text style={styles.verseNumber}>{item.verse}</Text>
      <Text style={styles.verseText}>{item.text.trim()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text weight="bold" style={styles.title}>
            {type === "JHN" ? "João" : type === "GEN" ? "Gênesis" : "John"}{" "}
            {currentChapter}
          </Text>
        </View>

        {/* Banner Informativo (aparece apenas na primeira vez) */}
        {showHint && (
          <View style={styles.hintContainer}>
            <MaterialIcons name="lightbulb-outline" size={20} color="#007AFF" />
            <Text style={styles.hintText}>
              {currentTranslation === "almeida"
                ? "Toque em qualquer versículo para abrir o Mentor Exegético e tirar dúvidas."
                : "Tap any verse to open the Exegetical Mentor and ask questions."}
            </Text>
            <TouchableOpacity
              onPress={dismissHint}
              style={styles.closeHintButton}
            >
              <MaterialIcons name="close" size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {currentTranslation === "almeida"
                ? "Carregando versículos..."
                : "Loading verses..."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={versesData}
            keyExtractor={(item) => String(item.verse)}
            renderItem={renderVerse}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Modal do Bottom Sheet */}
      <Modal
        visible={isMentorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMentorVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.bottomSheet}>
            {/* Cabecalho do Bottom Sheet */}
            <View style={styles.sheetHeader}>
              <Text weight="bold" style={styles.sheetTitle}>
                {currentTranslation === "almeida"
                  ? "Mentor Exegético 📖"
                  : "Exegetical Mentor 📖"}
              </Text>

              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                }}
                onPress={() => setIsMentorVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Contexto do Versículo */}
            {selectedVerse && (
              <View style={styles.contextCard}>
                <Text style={styles.contextTitle}>
                  {currentTranslation === "almeida" ? "João" : "John"}{" "}
                  {currentChapter}:{selectedVerse.verse}
                </Text>
                <Text style={styles.contextText}>
                  "{selectedVerse.text.trim()}"
                </Text>
              </View>
            )}

            {/* Área do Chat */}
            <ScrollView
              style={styles.chatArea}
              showsVerticalScrollIndicator={false}
            >
              {isAsking && (
                <ActivityIndicator
                  size="small"
                  color="#007AFF"
                  style={{ marginVertical: 20 }}
                />
              )}

              {answer !== "" && (
                <View style={styles.answerBubble}>
                  <Markdown style={markdownStyles}>{answer}</Markdown>
                </View>
              )}
            </ScrollView>

            {/* Input e Botão de Envio */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  currentTranslation === "almeida"
                    ? "Qual sua dúvida sobre este versículo?"
                    : "What is your question about this verse?"
                }
                placeholderTextColor="#8E8E93"
                value={question}
                onChangeText={setQuestion}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !question.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleAskMentor}
                disabled={isAsking || !question.trim()}
              >
                <Text style={styles.sendButtonText}>
                  {currentTranslation === "almeida" ? "Enviar" : "Send"}{" "}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Estilos específicos para mapear as tags do Markdown
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1C1C1E",
  },
  strong: {
    fontWeight: "bold",
    color: "#000000",
  },
  em: {
    fontStyle: "italic",
  },
  heading1: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  bullet_list: {
    marginTop: 10,
    marginBottom: 10,
  },
  list_item: {
    flexDirection: "row",
    marginBottom: 5,
  },
  blockquote: {
    backgroundColor: "#F2F2F7",
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 10,
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 64 },
  container: { flex: 1 },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  title: { fontSize: 24, color: "#000000" },

  // Estilos do Banner Informativo
  hintContainer: {
    flexDirection: "row",
    backgroundColor: "#E5F1FF",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 8,
    lineHeight: 20,
  },
  closeHintButton: {
    padding: 4,
    marginLeft: 8,
  },

  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  verseRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8E8E93",
    marginRight: 8,
    marginTop: 3,
    width: 20,
    textAlign: "right",
  },
  verseText: { flex: 1, fontSize: 18, lineHeight: 26, color: "#1C1C1E" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#8E8E93" },

  // Estilos do Bottom Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, color: "#1C1C1E" },
  closeButton: { fontSize: 18, color: "#8E8E93", padding: 5 },
  contextCard: {
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  contextText: { fontSize: 14, fontStyle: "italic", color: "#3A3A3C" },
  chatArea: {
    minHeight: 100,
    marginBottom: 16,
  },
  answerBubble: {
    backgroundColor: "#E5E5EA",
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  answerText: { fontSize: 16, lineHeight: 24, color: "#1C1C1E" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    paddingTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 10,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A1C6EA",
  },
  sendButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});
